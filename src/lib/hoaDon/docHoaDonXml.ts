/**
 * KIỂM TỆP HOÁ ĐƠN ĐIỆN TỬ XML người dùng nhận từ người bán (12/10/2026). Hàm thuần, chạy ở trình duyệt.
 *
 * VÌ SAO LÀM Ở ĐÂY. MIMI không có quyền kết nối cơ quan thuế (đã gỡ phần đọc hoá đơn 29/09/2026) và không
 * xuất hoá đơn điện tử. Nhưng tệp XML người bán gửi kèm hoá đơn là dữ liệu gốc: đọc nó thì kiểm được đủ
 * trường, cộng lại từng dòng, có chữ ký số / mã của cơ quan thuế hay không — không cần hỏi ai. Tệp không rời
 * máy người dùng; chỉ khi bấm "Lưu vào chứng từ" thì các trường đã kiểm mới gửi lên (`luu_chung_tu`).
 *
 * ĐỊNH DẠNG. Tên thẻ theo "thành phần chứa dữ liệu nghiệp vụ hoá đơn điện tử" của Tổng cục Thuế
 * (Quyết định 1450/QĐ-TCT 2021, hướng dẫn TT 78/2021/TT-BTC): HDon › DLHDon › TTChung (KHMSHDon, KHHDon,
 * SHDon, NLap…) và NDHDon (NBan, NMua, DSHHDVu › HHDVu, TToan), MCCQT, DSCKS. Từ 01/07/2026 NĐ 254/2026/NĐ-CP
 * thay NĐ 123/2020 và NĐ 70/2025; Cục Thuế có QĐ 1271/QĐ-CT (31/05/2025) cùng tên với QĐ 1450 — MIMI CHƯA
 * đối chiếu văn bản gốc xem tên thẻ có đổi không. Vì vậy thẻ lạ → "thiếu", không bao giờ đoán thành "đạt".
 *
 * GIỚI HẠN CỐ Ý.
 *  - Chữ ký số: chỉ nói CÓ hay KHÔNG CÓ phần Signature. Không kiểm chứng thư, không nói "hợp lệ".
 *  - Tiền: so bằng SỐ NGUYÊN đồng. Tệp ghi số lẻ ở hoá đơn VND → báo, không làm tròn hộ.
 *  - Chống XML độc: giới hạn kích thước, từ chối mọi DOCTYPE/ENTITY (thực thể ngoài, "tỷ tiếng cười"),
 *    không bao giờ đưa nội dung tệp vào HTML — giao diện chỉ hiện chuỗi qua React.
 */

/** 2 MB: hoá đơn thật vài chục KB; tệp lớn hơn nhiều là dấu hiệu sai tệp hoặc cố ý làm treo trình duyệt. */
export const KICH_THUOC_TOI_DA = 2 * 1024 * 1024;
const SO_DONG_TOI_DA = 2000;

export type MucKiem = 'dat' | 'lech' | 'thieu' | 'luu_y';

export interface DongKiem {
  khoa: string;
  nhan: string;
  muc: MucKiem;
  /** Một câu, lời thường: điều tìm thấy và vì sao quan trọng. */
  cau: string;
}

export interface DongHang {
  stt: number;
  ten: string | null;
  tinh_chat: number;
  so_luong: number | null;
  don_gia: number | null;
  chiet_khau: number | null;
  thanh_tien: number | null;
  thue_suat: string | null;
}

export interface HoaDonXml {
  ten_hoa_don: string | null;
  ky_hieu_mau: string | null;
  ky_hieu: string | null;
  so: string | null;
  ngay_lap: string | null;
  don_vi_tien: string | null;
  ben_ban: { ten: string | null; mst: string | null; dia_chi: string | null };
  ben_mua: { ten: string | null; mst: string | null };
  dong: DongHang[];
  tong_chua_thue: number | null;
  tong_thue: number | null;
  tong_thanh_toan: number | null;
  ma_cqt: string | null;
  co_chu_ky: boolean;
}

export type KetQuaDoc =
  // Trường "vắng" khai rõ `?: undefined`: tsconfig.app không bật strict nên không thu hẹp được theo `ok`.
  | { ok: true; hoa_don: HoaDonXml; kiem: DongKiem[]; loi?: undefined }
  | { ok: false; loi: string; hoa_don?: undefined; kiem?: undefined };

// ── Đọc an toàn ─────────────────────────────────────────────────────────────────

/** Thẻ con trực tiếp theo tên cục bộ (bỏ tiền tố namespace). */
function con(e: Element | null | undefined, ten: string): Element | null {
  if (!e) return null;
  for (const c of Array.from(e.children)) if (c.localName === ten) return c;
  return null;
}
function cacCon(e: Element | null | undefined, ten: string): Element[] {
  return e ? Array.from(e.children).filter((c) => c.localName === ten) : [];
}
function chu(e: Element | null | undefined): string | null {
  const t = e?.textContent?.trim();
  return t ? t : null;
}
/** Phần tử đầu tiên có tên cục bộ `ten` ở bất cứ đâu dưới `goc`. */
function timSau(goc: Element | Document, ten: string): Element | null {
  const ds = goc.getElementsByTagNameNS('*', ten);
  return ds.length ? ds[0] : null;
}

/** Số trong XML (dấu chấm thập phân theo XSD). null nếu trống hoặc không phải số. */
export function docSo(s: string | null): number | null {
  if (s === null) return null;
  const t = s.replace(/\s/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

const dong = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;

/** Mã số thuế đúng hình: 10 số, 10 số kèm -3 số, hoặc 12 số định danh (hộ, cá nhân). Cùng quy tắc `lib/maSoThue.ts`. */
export const mstDungHinh = (v: string | null) => !!v && /^\d{10}(-\d{3})?$|^\d{12}$/.test(v.replace(/\s/g, ''));
const chuanMst = (v: string | null) => (v ? v.replace(/\s/g, '') : null);

/** Từ chối trước khi phân tích: DOMParser của trình duyệt không tải thực thể ngoài, nhưng không có lý do gì để thử. */
export function kiemTruocKhiDoc(xml: string): string | null {
  if (!xml.trim()) return 'Tệp trống.';
  if (xml.length > KICH_THUOC_TOI_DA) return 'Tệp lớn hơn 2 MB — không giống một hoá đơn điện tử. MIMI không mở.';
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return 'Tệp có khai báo DOCTYPE/ENTITY. Hoá đơn điện tử chuẩn không cần phần này, nên MIMI không mở để tránh tệp độc.';
  return null;
}

// ── Đọc ─────────────────────────────────────────────────────────────────────────

export function docHoaDonXml(
  xml: string,
  tuyChon: { mstCongTy?: string | null; parser?: { parseFromString(s: string, t: string): Document } } = {},
): KetQuaDoc {
  const chan = kiemTruocKhiDoc(xml);
  if (chan) return { ok: false, loi: chan };

  const parser = tuyChon.parser ?? new DOMParser();
  let doc: Document;
  try {
    doc = parser.parseFromString(xml, 'application/xml');
  } catch {
    return { ok: false, loi: 'Không đọc được tệp XML.' };
  }
  if (doc.getElementsByTagName('parsererror').length) return { ok: false, loi: 'Tệp không phải XML hợp lệ (hỏng cấu trúc thẻ).' };

  // Có nhà cung cấp bọc hoá đơn trong thông điệp (TDiep › DLieu › HDon): tìm HDon ở bất cứ đâu.
  const hdon = doc.documentElement?.localName === 'HDon' ? doc.documentElement : timSau(doc, 'HDon');
  const dl = con(hdon, 'DLHDon') ?? (hdon ? timSau(hdon, 'DLHDon') : null);
  if (!hdon || !dl) {
    return { ok: false, loi: 'Không thấy phần dữ liệu hoá đơn (thẻ HDon/DLHDon) theo định dạng của Tổng cục Thuế. Có thể đây không phải tệp hoá đơn điện tử, hoặc nhà cung cấp dùng định dạng riêng.' };
  }

  const tt = con(dl, 'TTChung');
  const nd = con(dl, 'NDHDon');
  const nban = con(nd, 'NBan');
  const nmua = con(nd, 'NMua');
  const ttoan = con(nd, 'TToan');

  const hang = cacCon(con(nd, 'DSHHDVu'), 'HHDVu').slice(0, SO_DONG_TOI_DA).map((h, i): DongHang => ({
    stt: docSo(chu(con(h, 'STT'))) ?? i + 1,
    ten: chu(con(h, 'THHDVu')),
    // TChat: 1 hàng hoá, dịch vụ; 2 khuyến mại; 3 chiết khấu thương mại; 4 ghi chú. Thiếu → coi là 1.
    tinh_chat: docSo(chu(con(h, 'TChat'))) ?? 1,
    so_luong: docSo(chu(con(h, 'SLuong'))),
    don_gia: docSo(chu(con(h, 'DGia'))),
    chiet_khau: docSo(chu(con(h, 'STCKhau'))),
    thanh_tien: docSo(chu(con(h, 'ThTien'))),
    thue_suat: chu(con(h, 'TSuat')),
  }));

  const mcqt = chu(con(hdon, 'MCCQT')) ?? chu(timSau(hdon, 'MCCQT'));
  const hd: HoaDonXml = {
    ten_hoa_don: chu(con(tt, 'THDon')),
    ky_hieu_mau: chu(con(tt, 'KHMSHDon')),
    ky_hieu: chu(con(tt, 'KHHDon')),
    so: chu(con(tt, 'SHDon')),
    ngay_lap: chu(con(tt, 'NLap')),
    don_vi_tien: chu(con(tt, 'DVTTe')),
    ben_ban: { ten: chu(con(nban, 'Ten')), mst: chuanMst(chu(con(nban, 'MST'))), dia_chi: chu(con(nban, 'DChi')) },
    ben_mua: { ten: chu(con(nmua, 'Ten')), mst: chuanMst(chu(con(nmua, 'MST'))) },
    dong: hang,
    tong_chua_thue: docSo(chu(con(ttoan, 'TgTCThue'))),
    tong_thue: docSo(chu(con(ttoan, 'TgTThue'))),
    tong_thanh_toan: docSo(chu(con(ttoan, 'TgTTTBSo'))),
    ma_cqt: mcqt,
    // Signature (XML-DSig) ở bất cứ đâu trong hoá đơn — thường trong DSCKS › NBan.
    co_chu_ky: !!timSau(hdon, 'Signature'),
  };

  return { ok: true, hoa_don: hd, kiem: kiemHoaDon(hd, ttoan, tuyChon.mstCongTy ?? null) };
}

// ── Kiểm ────────────────────────────────────────────────────────────────────────

function kiemHoaDon(hd: HoaDonXml, ttoan: Element | null, mstCongTy: string | null): DongKiem[] {
  const ra: DongKiem[] = [];
  const them = (khoa: string, nhan: string, muc: MucKiem, cau: string) => ra.push({ khoa, nhan, muc, cau });
  const laGtgt = hd.ky_hieu_mau === '1';
  const vnd = !hd.don_vi_tien || hd.don_vi_tien.toUpperCase() === 'VND';

  // 1. Trường bắt buộc.
  const batBuoc: [string, string, string | null][] = [
    ['ky_hieu_mau', 'Ký hiệu mẫu số', hd.ky_hieu_mau],
    ['ky_hieu', 'Ký hiệu hoá đơn', hd.ky_hieu],
    ['so', 'Số hoá đơn', hd.so],
    ['ngay_lap', 'Ngày lập', hd.ngay_lap],
    ['ten_ban', 'Tên người bán', hd.ben_ban.ten],
  ];
  for (const [k, n, v] of batBuoc) {
    if (v) them(k, n, 'dat', `Có: ${v}.`);
    else them(k, n, 'thieu', `Tệp không có ${n.toLowerCase()} — trường bắt buộc trên hoá đơn.`);
  }
  if (hd.ngay_lap && !/^\d{4}-\d{2}-\d{2}$/.test(hd.ngay_lap.slice(0, 10))) {
    them('ngay_lap_dang', 'Dạng ngày lập', 'lech', `Ngày lập "${hd.ngay_lap}" không theo dạng năm-tháng-ngày của định dạng chuẩn.`);
  }
  // Ký hiệu 6 ký tự: C/K (có/không mã) + 2 số cuối năm lập + loại + 2 chữ do người bán đặt (TT 78/2021 Điều 4).
  if (hd.ky_hieu && hd.ngay_lap) {
    const m = /^([CK])(\d{2})[A-Z][A-Z0-9]{2}$/.exec(hd.ky_hieu.toUpperCase());
    if (!m) them('ky_hieu_dang', 'Dạng ký hiệu', 'luu_y', `Ký hiệu "${hd.ky_hieu}" không theo dạng 6 ký tự quen thuộc (ví dụ C26TAA). Có thể định dạng đã đổi — hỏi người bán nếu nghi ngờ.`);
    else if (m[2] !== hd.ngay_lap.slice(2, 4)) them('ky_hieu_nam', 'Năm trong ký hiệu', 'lech', `Ký hiệu ghi năm 20${m[2]} nhưng ngày lập là năm ${hd.ngay_lap.slice(0, 4)}.`);
  }

  // 2. Mã số thuế.
  if (!hd.ben_ban.mst) them('mst_ban', 'MST người bán', 'thieu', 'Tệp không có mã số thuế người bán.');
  else if (!mstDungHinh(hd.ben_ban.mst)) them('mst_ban', 'MST người bán', 'lech', `"${hd.ben_ban.mst}" không đúng hình mã số thuế (10 số, 10 số kèm -3 số, hoặc 12 số).`);
  else them('mst_ban', 'MST người bán', 'dat', `${hd.ben_ban.mst}.`);

  const mstCty = chuanMst(mstCongTy);
  if (!hd.ben_mua.mst) {
    them('mst_mua', 'MST người mua', 'thieu', 'Hoá đơn không ghi mã số thuế người mua. Muốn tính vào chi phí của công ty, hoá đơn cần ghi đúng mã số thuế của công ty — đề nghị người bán điều chỉnh.');
  } else if (!mstCty) {
    them('mst_mua', 'MST người mua', 'luu_y', `Hoá đơn ghi ${hd.ben_mua.mst}. Công ty chưa có mã số thuế trong MIMI nên chưa so được — thêm ở Cài đặt.`);
  } else if (hd.ben_mua.mst === mstCty) {
    them('mst_mua', 'MST người mua', 'dat', `Khớp mã số thuế công ty (${mstCty}).`);
  } else {
    them('mst_mua', 'MST người mua', 'lech', `Hoá đơn ghi ${hd.ben_mua.mst}, công ty đang dùng là ${mstCty}. Hoá đơn này không đứng tên công ty.`);
  }

  // 3. Hàng hoá.
  if (!hd.dong.length) them('hang_hoa', 'Hàng hoá, dịch vụ', 'thieu', 'Tệp không có dòng hàng hoá, dịch vụ nào.');
  else them('hang_hoa', 'Hàng hoá, dịch vụ', 'dat', `${hd.dong.length} dòng.`);

  // 4. Tiền là số nguyên đồng.
  const cacTien = [hd.tong_chua_thue, hd.tong_thue, hd.tong_thanh_toan, ...hd.dong.map((d) => d.thanh_tien)];
  if (vnd && cacTien.some((t) => t !== null && !Number.isInteger(t))) {
    them('so_nguyen', 'Tiền theo đồng', 'lech', 'Có số tiền lẻ dưới 1 đồng trên hoá đơn VND. MIMI không tự làm tròn.');
  }
  if (!vnd) them('don_vi_tien', 'Đơn vị tiền', 'luu_y', `Hoá đơn ghi bằng ${hd.don_vi_tien}. MIMI chỉ cộng lại hoá đơn VND; các phép cộng dưới đây có thể không áp dụng.`);

  // 5. Cộng lại từng dòng: thành tiền = số lượng × đơn giá − chiết khấu.
  const lechDong: string[] = [];
  for (const d of hd.dong) {
    if (d.tinh_chat === 4 || d.so_luong === null || d.don_gia === null || d.thanh_tien === null) continue;
    const tinh = Math.round(d.so_luong * d.don_gia - (d.chiet_khau ?? 0));
    if (tinh !== Math.round(d.thanh_tien)) lechDong.push(`dòng ${d.stt}: ${dong(tinh)} ≠ ${dong(d.thanh_tien)}`);
  }
  if (lechDong.length) them('thanh_tien_dong', 'Thành tiền từng dòng', 'lech', `Số lượng × đơn giá − chiết khấu không khớp thành tiền ở ${lechDong.slice(0, 5).join('; ')}.`);
  else if (hd.dong.length) them('thanh_tien_dong', 'Thành tiền từng dòng', 'dat', 'Số lượng × đơn giá − chiết khấu khớp thành tiền ở mọi dòng có đủ số.');

  // 6. Tổng chưa thuế = cộng thành tiền (dòng chiết khấu thương mại trừ đi; khuyến mại, ghi chú không tính).
  const coThanhTien = hd.dong.filter((d) => d.thanh_tien !== null && (d.tinh_chat === 1 || d.tinh_chat === 3));
  if (hd.tong_chua_thue === null) {
    them('tong_chua_thue', 'Tổng tiền chưa thuế', 'thieu', 'Tệp không có tổng tiền chưa thuế (TgTCThue).');
  } else if (coThanhTien.length) {
    const cong = coThanhTien.reduce((s, d) => s + (d.tinh_chat === 3 ? -1 : 1) * Math.round(d.thanh_tien as number), 0);
    if (cong === Math.round(hd.tong_chua_thue)) them('tong_chua_thue', 'Tổng tiền chưa thuế', 'dat', `Cộng các dòng ra ${dong(cong)}, khớp.`);
    else them('tong_chua_thue', 'Tổng tiền chưa thuế', 'lech', `Cộng các dòng ra ${dong(cong)}, hoá đơn ghi ${dong(hd.tong_chua_thue)}.`);
  }

  // 7. Thuế suất và tiền thuế (chỉ hoá đơn GTGT, ký hiệu mẫu 1).
  let tongThueTinh: number | null = null;
  if (laGtgt) {
    if (hd.dong.some((d) => (d.tinh_chat === 1) && !d.thue_suat)) them('thue_suat', 'Thuế suất', 'thieu', 'Có dòng hàng hoá không ghi thuế suất.');
    else if (hd.dong.length) them('thue_suat', 'Thuế suất', 'dat', `Có: ${[...new Set(hd.dong.map((d) => d.thue_suat).filter(Boolean))].join(', ')}.`);

    const nhom = cacCon(con(ttoan, 'THTTLTSuat'), 'LTSuat');
    const lech: string[] = [];
    let cong = 0;
    for (const n of nhom) {
      const ts = chu(con(n, 'TSuat'));
      const tien = docSo(chu(con(n, 'ThTien')));
      const thue = docSo(chu(con(n, 'TThue')));
      if (thue !== null) cong += Math.round(thue);
      const pt = ts ? /^(\d+(?:\.\d+)?)%$/.exec(ts) : null;
      if (pt && tien !== null && thue !== null) {
        const tinh = Math.round((Math.round(tien) * Number(pt[1])) / 100);
        if (tinh !== Math.round(thue)) lech.push(`nhóm ${ts}: ${dong(Math.round(tien))} × ${ts} = ${dong(tinh)}, hoá đơn ghi ${dong(thue)}`);
      }
    }
    if (nhom.length) {
      tongThueTinh = cong;
      if (lech.length) them('tien_thue_nhom', 'Tiền thuế theo thuế suất', 'lech', `${lech.join('; ')}. Lệch vài đồng có thể do người bán làm tròn theo từng dòng — vẫn nên hỏi.`);
      else them('tien_thue_nhom', 'Tiền thuế theo thuế suất', 'dat', 'Thành tiền × thuế suất khớp tiền thuế ở từng nhóm thuế suất.');
    }
    if (hd.tong_thue === null) them('tong_thue', 'Tổng tiền thuế', 'thieu', 'Tệp không có tổng tiền thuế GTGT (TgTThue).');
    else if (tongThueTinh !== null && tongThueTinh !== Math.round(hd.tong_thue)) them('tong_thue', 'Tổng tiền thuế', 'lech', `Cộng các nhóm thuế suất ra ${dong(tongThueTinh)}, hoá đơn ghi ${dong(hd.tong_thue)}.`);
    else them('tong_thue', 'Tổng tiền thuế', 'dat', `${dong(hd.tong_thue)}.`);
  }

  // 8. Tổng thanh toán = chưa thuế + thuế (+ phí nếu có).
  const phi = docSo(chu(con(ttoan, 'TgTPhi'))) ?? 0;
  if (hd.tong_thanh_toan === null) {
    them('tong_thanh_toan', 'Tổng tiền thanh toán', 'thieu', 'Tệp không có tổng tiền thanh toán bằng số (TgTTTBSo).');
  } else if (hd.tong_chua_thue !== null) {
    const tinh = Math.round(hd.tong_chua_thue) + Math.round(laGtgt ? hd.tong_thue ?? 0 : 0) + Math.round(phi);
    if (tinh === Math.round(hd.tong_thanh_toan)) them('tong_thanh_toan', 'Tổng tiền thanh toán', 'dat', `Chưa thuế + thuế${phi ? ' + phí' : ''} = ${dong(tinh)}, khớp.`);
    else them('tong_thanh_toan', 'Tổng tiền thanh toán', 'lech', `Chưa thuế + thuế${phi ? ' + phí' : ''} = ${dong(tinh)}, hoá đơn ghi ${dong(hd.tong_thanh_toan)}.`);
  }

  // 9. Chữ ký số — có/không, KHÔNG nói hợp lệ.
  if (hd.co_chu_ky) them('chu_ky', 'Chữ ký số', 'dat', 'Có phần chữ ký số trong tệp. MIMI không kiểm chứng thư nên không khẳng định chữ ký hợp lệ — tra trên cổng của cơ quan thuế để chắc.');
  else them('chu_ky', 'Chữ ký số', 'thieu', 'Tệp không có phần chữ ký số. Hoá đơn điện tử phải được người bán ký số — đây có thể là bản xem trước, không phải hoá đơn đã phát hành.');

  // 10. Mã của cơ quan thuế.
  const coMaTheoKyHieu = hd.ky_hieu?.toUpperCase().startsWith('C') ?? null;
  if (hd.ma_cqt) them('ma_cqt', 'Mã của cơ quan thuế', 'dat', `Có mã: ${hd.ma_cqt}.`);
  else if (coMaTheoKyHieu) them('ma_cqt', 'Mã của cơ quan thuế', 'lech', 'Ký hiệu bắt đầu bằng "C" (hoá đơn có mã) nhưng tệp không có mã của cơ quan thuế. Có thể người bán gửi bản chưa được cấp mã — xin lại tệp đã có mã.');
  else them('ma_cqt', 'Mã của cơ quan thuế', 'luu_y', 'Không có mã của cơ quan thuế. Ký hiệu cho thấy đây là hoá đơn không có mã — chỉ một số ngành được dùng loại này.');

  return ra;
}

/** Tóm tắt cho đầu kết quả: đếm theo mức. */
export function demMuc(kiem: DongKiem[]): Record<MucKiem, number> {
  const d: Record<MucKiem, number> = { dat: 0, lech: 0, thieu: 0, luu_y: 0 };
  for (const k of kiem) d[k.muc]++;
  return d;
}

/**
 * Thân lời gọi `luu_chung_tu` (tro-ly) — CÙNG trường với lưu ảnh quét. Máy chủ chỉ nhận MST 10 số / 10-3 số,
 * nên MST 12 số định danh của hộ bán gửi null kèm cảnh báo, không gửi để bị từ chối cả lần lưu.
 */
export function duLieuLuuChungTu(hd: HoaDonXml): { du: Record<string, unknown>; canh_bao: string | null } {
  const mst = hd.ben_ban.mst && /^\d{10}(-\d{3})?$/.test(hd.ben_ban.mst) ? hd.ben_ban.mst : null;
  const nguyen = (n: number | null) => (n === null ? null : Math.round(n));
  return {
    du: {
      loai: 'hoa_don',
      so_hoa_don: hd.so,
      ky_hieu: hd.ky_hieu ? `${hd.ky_hieu_mau ?? ''}${hd.ky_hieu}` : null,
      ngay: hd.ngay_lap ? hd.ngay_lap.slice(0, 10) : null,
      ben_ban: hd.ben_ban.ten,
      ma_so_thue_ben_ban: mst,
      tien_truoc_thue: nguyen(hd.tong_chua_thue),
      tien_thue: nguyen(hd.tong_thue),
      tong_tien: nguyen(hd.tong_thanh_toan),
    },
    canh_bao: hd.ben_ban.mst && !mst ? `Mã số thuế người bán ${hd.ben_ban.mst} (12 số) chưa lưu được vào chứng từ — MIMI ghi tên người bán, bạn ghi chú mã nếu cần.` : null,
  };
}
