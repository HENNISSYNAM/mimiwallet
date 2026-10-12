/**
 * Mẫu số 01/TKN-CNKD bản kèm Thông tư 89/2026/TT-BTC (Phụ lục I) — Thông báo doanh thu/Tờ khai thuế năm.
 *
 * VÌ SAO CÓ FILE RIÊNG. TT 89 (ban hành 30/06/2026, hiệu lực 01/07/2026) Điều 99 khoản 5 thay mẫu 01/TKN-CNKD
 * của TT 50/2026 bằng mẫu này; Điều 100 khoản 1: hồ sơ có kỳ tính thuế trước 01/07/2026 vẫn theo mẫu cũ. Mẫu
 * mới đổi cấu trúc chứ không chỉ đổi dòng "Kèm theo": phần A thành 16 cột (thêm cột "Nhóm ngành nghề"), dòng
 * [08]–[12] theo LOẠI hoạt động (mỗi ngành nghề một dòng, ghi mã nhóm ở cột (1)), [13] Tổng cộng có ô
 * [13.1]–[13.15], các dòng [14]–[21] về giảm thuế do thiên tai…, miễn thuế dưới 50.000 đồng và cho thuê bất
 * động sản; thêm phần B–E và bảng bù trừ. Giữ mẫu cũ (`to-khai.ts`) y nguyên cho kỳ cũ, mẫu mới nằm đây.
 *
 * CHÉP TỪ ĐÂU. Ảnh từng trang bản ký số TT 89 (vanban.chinhphu.vn, tệp 89-btc.signed.pdf), trang 365–371 của
 * tệp. Mọi nhãn, mã ô, công thức, Ghi chú, lời cam đoan dưới đây chép theo ảnh, không viết lại theo trí nhớ.
 * Quyết định đính chính 2551/QĐ-BTC (15/09/2026) chỉ sửa tên mẫu XSBHĐC ở Điều 99 khoản 5 — không đụng mẫu này.
 *
 * HAI CHỖ BẢN QUÉT MỜ (ghi lại để ai đối chiếu bản giấy thì sửa đúng chỗ):
 *   - [16]: bản quét in "[16]=[15] <·50.000" — dấu sau "<" bị nhoè. Chép là "<=" vì chính tên dòng ghi "từ
 *     50.000 đồng trở xuống" và các dòng cùng loại ở phần B/C in rõ "<=50.000".
 *   - [18]: bản quét in "[18]-·[13.13]…" — chép là "=" như mọi dòng công thức khác.
 * Còn một lỗi in của chính mẫu: phần C mục II in "Số thuế được miễn … [30]=[29]<=50.000" trên dòng mã [32].
 * MIMI chép nguyên văn (đó là chữ trên mẫu), không sửa thay Bộ Tài chính.
 *
 * Hàm thuần, test bằng vitest (`to-khai.test.ts`).
 */
import type { CotToKhai, DongToKhai, PhanSauToKhai } from './to-khai.ts';
import type { NhomNganh } from './he-luat.ts';

/** Ngày TT 89 có hiệu lực. Kỳ tính thuế kết thúc từ ngày này trở đi dùng mẫu mới (xem `chonPhienBanTKN`). */
export const NGAY_HIEU_LUC_TT89 = '2026-07-01';

export const KEM_THEO_TT89 = 'Kèm theo Thông tư số 89/2026/TT-BTC ngày 30 tháng 6 năm 2026 của Bộ trưởng Bộ Tài chính';

export const AP_DUNG_TKN_TT89 =
  '(Áp dụng đối với hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống; hộ kinh doanh, cá nhân kinh doanh nộp thuế TNCN theo phương pháp thuế suất nhân với doanh thu tính thuế đề nghị hoàn thuế; cá nhân hợp tác kinh doanh với tổ chức; cá nhân làm đại lý bán đúng giá đối với hoạt động bảo hiểm, xổ số, bán hàng đa cấp; cá nhân thực hiện hoạt động môi giới thuộc trường hợp phải nộp thuế mà chưa được tổ chức khấu trừ thuế, khai thuế thay, nộp thuế thay trong năm)';

/** Sáu ô đánh dấu đầu mẫu, đúng thứ tự trên mẫu. Hai ô cuối là mới so với TT 50. */
export const DANH_DAU_TKN_TT89 = [
  'Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống',
  'Hộ kinh doanh, cá nhân kinh doanh mới ra kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống',
  'Hộ kinh doanh, cá nhân kinh doanh nộp thuế TNCN theo phương pháp thuế suất nhân với doanh thu tính thuế đề nghị hoàn thuế',
  'Cá nhân hợp tác kinh doanh với tổ chức; cá nhân làm đại lý bán đúng giá đối với hoạt động bảo hiểm, xổ số, bán hàng đa cấp; cá nhân thực hiện hoạt động môi giới thuộc trường hợp phải nộp thuế mà chưa được tổ chức khấu trừ thuế, khai thuế thay, nộp thuế thay trong năm',
  'Cho phép điều chỉnh, bổ sung các tờ khai Mẫu số 01/CNKD đã kê khai theo Thông tư số 40/2021/TT-BTC, Thông tư số 18/2026/TT-BTC; tờ khai Mẫu số 02/CNKD-TMĐT đã kê khai theo Nghị định số 117/2025/NĐ-CP',
  'Giảm thuế do thiên tai, dịch bệnh, hỏa hoạn, tai nạn và bệnh hiểm nghèo',
] as const;

/** Chỉ tiêu đầu mẫu sau [01]: nhãn đúng mẫu mới ([06.1], [06.2], [07.1], [07.2] là mới). */
export const NHAN_CHI_TIEU_TT89 = {
  '[02]': 'Lần đầu',
  '[03]': 'Bổ sung lần thứ',
  '[04]': 'Người nộp thuế',
  '[05]': 'Mã số thuế',
  '[06]': 'Tổ chức/cá nhân kê khai, nộp thuế thay theo ủy quyền (nếu có)',
  '[06.1]': 'Mã số thuế',
  '[06.2]': 'Văn bản ủy quyền (nếu có): Số…ngày…tháng…năm',
  '[07]': 'Tên tổ chức, cá nhân cung cấp dịch vụ làm thủ tục về thuế (nếu có)',
  '[07.1]': 'Mã số thuế',
  '[07.2]': 'Hợp đồng dịch vụ làm thủ tục về thuế: Số…ngày',
} as const;

export const PHAN_A_TT89 = 'A. XÁC ĐỊNH NGHĨA VỤ THUẾ GTGT, TNCN';

/** 16 cột của phần A, đúng thứ tự (1)…(16). Cột (1) là mã nhóm ngành nghề, không phải tiền. */
export const COT_TKN_TT89: CotToKhai[] = [
  { khoa: 'nhom_nganh', ma: null, so: '(1)', nhan: 'Nhóm ngành nghề (chỉ áp dụng với mục 1, 2, 5)', nhom: 'chung', kieu: 'ma_nhom' },
  { khoa: 'tong_dt', ma: null, so: '(2)', nhan: 'Tổng doanh thu', nhom: 'gtgt' },
  { khoa: 'dt_khong_chiu', ma: null, so: '(3)', nhan: 'Trong đó: doanh thu không chịu thuế GTGT', nhom: 'gtgt' },
  { khoa: 'dt_0', ma: null, so: '(4)', nhan: 'Trong đó: doanh thu chịu thuế suất 0%', nhom: 'gtgt' },
  { khoa: 'thue_gtgt', ma: null, so: '(5)', nhan: 'Số thuế phải nộp', nhom: 'gtgt' },
  { khoa: 'dt_chiu_tncn', ma: null, so: '(6)', nhan: 'Doanh thu chịu thuế', nhom: 'tncn' },
  { khoa: 'dt_duoc_tru', ma: null, so: '(7)', nhan: 'Doanh thu được trừ để xác định doanh thu tính thuế', nhom: 'tncn' },
  { khoa: 'thue_tncn', ma: null, so: '(8)', nhan: 'Số thuế phải nộp', nhom: 'tncn' },
  { khoa: 'nop_truc_tiep_gtgt', ma: null, so: '(9)', nhan: 'GTGT', nhom: 'truc_tiep_nop' },
  { khoa: 'nop_truc_tiep_tncn', ma: null, so: '(10)', nhan: 'TNCN', nhom: 'truc_tiep_nop' },
  { khoa: 'khau_tru_gtgt', ma: null, so: '(11)', nhan: 'GTGT', nhom: 'khau_tru_nop_thay' },
  { khoa: 'khau_tru_tncn', ma: null, so: '(12)', nhan: 'TNCN', nhom: 'khau_tru_nop_thay' },
  { khoa: 'nop_them_gtgt', ma: null, so: '(13)', nhan: 'GTGT', nhom: 'nop_them' },
  { khoa: 'nop_them_tncn', ma: null, so: '(14)', nhan: 'TNCN', nhom: 'nop_them' },
  { khoa: 'nop_thua_gtgt', ma: null, so: '(15)', nhan: 'GTGT', nhom: 'nop_thua' },
  { khoa: 'nop_thua_tncn', ma: null, so: '(16)', nhan: 'TNCN', nhom: 'nop_thua' },
];

/** Cột (2)…(16) — các cột tiền, theo thứ tự; ô [13.k] và [19.k] là cột thứ k trong danh sách này. */
export const COT_TIEN_TT89 = COT_TKN_TT89.slice(1).map((c) => c.khoa);

/** Mã nhóm ngành nghề ghi ở cột (1), theo Ghi chú của mẫu. */
export const MA_NHOM_NGANH_TT89: Record<NhomNganh, number> = {
  phan_phoi_hang_hoa: 1, dich_vu: 2, cho_thue_tai_san: 3, san_xuat_van_tai: 4, noi_dung_so: 5, khac: 6,
};

/** Dòng hoạt động (mục 1–5 của phần I) và mã chỉ tiêu. Chỉ mục 1, 2, 5 có cột nhóm ngành nghề. */
export const MUC_HOAT_DONG_TT89 = [
  { stt: '1', ma: '[08]', nhan: 'Hoạt động sản xuất, kinh doanh hàng hóa, cung cấp dịch vụ có địa điểm kinh doanh cố định', co_nhom: true },
  { stt: '2', ma: '[09]', nhan: 'Hoạt động kinh doanh trên nền tảng thương mại điện tử, nền tảng số khác', co_nhom: true },
  { stt: '3', ma: '[10]', nhan: 'Hoạt động đại lý xổ số, bảo hiểm, bán hàng đa cấp', co_nhom: false },
  { stt: '4', ma: '[11]', nhan: 'Hoạt động môi giới', co_nhom: false },
  { stt: '5', ma: '[12]', nhan: 'Hoạt động cá nhân hợp tác kinh doanh với tổ chức', co_nhom: true },
] as const;
export const MA_DONG_HOAT_DONG_TT89 = MUC_HOAT_DONG_TT89.map((m) => m.ma);

const oTrongTT89 = (): Record<string, number | null> => Object.fromEntries(COT_TKN_TT89.map((c) => [c.khoa, null]));
const maO = (goc: string): Record<string, string> => Object.fromEntries(COT_TIEN_TT89.map((k, i) => [k, `[${goc}.${i + 1}]`]));

/** Một dòng ngành nghề cần ghi trên mục 1/2/5: nhóm + tổng doanh thu + nguồn khoản. */
export interface DongNganhTT89 {
  nhom: NhomNganh;
  tong_dt: number;
  nguon_khoan?: DongToKhai['nguon_khoan'];
}

/**
 * Dựng phần A. `theoMuc` chỉ có mục MIMI biết chắc (cố định hoặc nền tảng số). Mục không có dòng ngành nào vẫn
 * in một dòng trống — đúng mẫu. Nhiều ngành nghề thì mỗi ngành một dòng cùng mã chỉ tiêu (Ghi chú của mẫu);
 * dòng tiếp theo để trống STT và tên chỉ tiêu như ô gộp trên giấy.
 */
export function dungDongTKN89(theoMuc: Partial<Record<'[08]' | '[09]' | '[12]', DongNganhTT89[]>>): DongToKhai[] {
  const ds: DongToKhai[] = [
    { stt: 'I', ma: null, nhan: 'Hoạt động sản xuất, kinh doanh hàng hóa, cung cấp dịch vụ (trừ hoạt động cho thuê bất động sản)', cap: 0, o: oTrongTT89(), tieu_de_phan: true },
  ];
  for (const m of MUC_HOAT_DONG_TT89) {
    const nganh = m.co_nhom ? (theoMuc[m.ma as '[08]' | '[09]' | '[12]'] ?? []) : [];
    if (!nganh.length) {
      ds.push({ stt: m.stt, ma: m.ma, nhan: m.nhan, cap: 0, o: oTrongTT89() });
      continue;
    }
    nganh.forEach((n, i) => {
      const o = oTrongTT89();
      o.nhom_nganh = MA_NHOM_NGANH_TT89[n.nhom];
      o.tong_dt = n.tong_dt;
      ds.push({ stt: i === 0 ? m.stt : '', ma: m.ma, nhan: i === 0 ? m.nhan : '', cap: 0, o, ...(n.nguon_khoan ? { nguon_khoan: n.nguon_khoan } : {}) });
    });
  }
  ds.push({ stt: '6', ma: '[13]', nhan: 'Tổng cộng', cap: 0, o: oTrongTT89(), la_tong: true, ma_o: maO('13') });
  ds.push({
    stt: '7', ma: '[14]', cap: 0, o: oTrongTT89(), gop: { cong_thuc: null, gia_tri: null },
    nhan: 'Số thuế TNCN từ hoạt động sản xuất, kinh doanh (trừ hoạt động cho thuê bất động sản) được giảm do thiên tai, dịch bệnh, hỏa hoạn, tai nạn và bệnh hiểm nghèo theo Quyết định giảm thuế của cơ quan thuế',
  });
  ds.push({ stt: '8', ma: '[15]', nhan: 'Số thuế TNCN còn phải nộp', cap: 0, o: oTrongTT89(), gop: { cong_thuc: '[15]=[13.13]-[14]>=0', gia_tri: null } });
  ds.push({ stt: '9', ma: '[16]', nhan: 'Số thuế TNCN được miễn từ 50.000 đồng trở xuống', cap: 0, o: oTrongTT89(), gop: { cong_thuc: '[16]=[15] <= 50.000', gia_tri: null } });
  ds.push({ stt: '10', ma: '[17]', nhan: 'Số thuế TNCN còn phải nộp sau miễn số thuế từ 50.000 đồng trở xuống', cap: 0, o: oTrongTT89(), gop: { cong_thuc: '[17]=[15]-[16]', gia_tri: null } });
  ds.push({ stt: '11', ma: '[18]', nhan: 'Số thuế TNCN nộp thừa', cap: 0, o: oTrongTT89(), gop: { cong_thuc: '[18]=[13.13]-[14]<0 hoặc [13.15]+[14]>0', gia_tri: null } });
  ds.push({ stt: 'II', ma: '[19]', nhan: 'Hoạt động cho thuê bất động sản', cap: 0, o: oTrongTT89(), la_tong: true, ma_o: maO('19') });
  ds.push({
    stt: '1', ma: '[20]', cap: 0, o: oTrongTT89(), gop: { cong_thuc: null, gia_tri: null },
    nhan: 'Số thuế TNCN từ hoạt động cho thuê bất động sản được giảm do thiên tai, dịch bệnh, hỏa hoạn, tai nạn và bệnh hiểm nghèo theo Quyết định giảm thuế của cơ quan thuế',
  });
  ds.push({ stt: '2', ma: '[21]', nhan: 'Số thuế TNCN nộp thừa', cap: 0, o: oTrongTT89(), gop: { cong_thuc: '[21]=[19.15]+[20]', gia_tri: null } });
  return ds;
}

/**
 * Kiểm các công thức của phần A trên một bản đã điền. Trả danh sách lỗi (rỗng = khớp). Ô trống (null) không
 * được tính là 0 khi so: tổng chỉ được ghi khi mọi ô thành phần đã ghi đều là số nguyên không âm.
 *   - Mọi ô tiền là số nguyên an toàn, không âm; cột (1) là 1…6 và chỉ có trên mục 1, 2, 5.
 *   - [13.k] = tổng cột k của các dòng [08]…[12] (cộng thêm `ngoaiDong` cho cột (2) — phần doanh thu thật chưa
 *     xếp được dòng nào, đã có vướng mắc chặn xuất riêng).
 *   - [15], [16], [17], [18], [21] theo công thức in trên mẫu, nếu đã ghi.
 */
export function kiemCongThucTKN89(dong: DongToKhai[], ngoaiDong: { tong_dt?: number } = {}): string[] {
  const loi: string[] = [];
  const laTien = (v: number | null | undefined) => v === null || v === undefined || (Number.isSafeInteger(v) && v >= 0);
  for (const d of dong) {
    for (const k of COT_TIEN_TT89) if (!laTien(d.o[k])) loi.push(`Ô ${d.ma ?? d.stt}/${k} không phải số nguyên đồng không âm.`);
    if (d.gop && !laTien(d.gop.gia_tri)) loi.push(`Ô ${d.ma} không phải số nguyên đồng không âm.`);
    const n = d.o.nhom_nganh;
    if (n !== null && n !== undefined) {
      if (!Number.isInteger(n) || n < 1 || n > 6) loi.push(`Nhóm ngành nghề ở ${d.ma} phải là 1…6.`);
      if (!['[08]', '[09]', '[12]'].includes(d.ma ?? '')) loi.push(`Cột (1) chỉ áp dụng với mục 1, 2, 5 — dòng ${d.ma} không được có.`);
    }
  }
  const hd = dong.filter((d) => d.ma && (MA_DONG_HOAT_DONG_TT89 as readonly string[]).includes(d.ma));
  const tong = dong.find((d) => d.ma === '[13]');
  if (!tong) return [...loi, 'Thiếu dòng [13] Tổng cộng.'];
  COT_TIEN_TT89.forEach((k, i) => {
    const v = tong.o[k];
    if (v === null || v === undefined) return;
    const cong = hd.reduce((s, d) => s + (d.o[k] ?? 0), 0) + (k === 'tong_dt' ? (ngoaiDong.tong_dt ?? 0) : 0);
    if (v !== cong) loi.push(`[13.${i + 1}] = ${v} nhưng tổng các dòng [08]…[12] là ${cong}.`);
  });
  const gop = (ma: string) => dong.find((d) => d.ma === ma)?.gop?.gia_tri ?? null;
  const g14 = gop('[14]') ?? 0;
  const o1313 = tong.o.nop_them_tncn;
  const o1315 = tong.o.nop_thua_tncn;
  const g15 = gop('[15]'); const g16 = gop('[16]'); const g17 = gop('[17]'); const g18 = gop('[18]');
  if (g15 !== null && (o1313 === null || o1313 === undefined || g15 !== Math.max(0, o1313 - g14))) loi.push('[15] phải bằng [13.13] − [14] (không âm).');
  if (g16 !== null && (g15 === null || g16 !== (g15 <= 50_000 ? g15 : 0))) loi.push('[16] chỉ bằng [15] khi [15] từ 50.000 đồng trở xuống.');
  if (g17 !== null && (g15 === null || g17 !== g15 - (g16 ?? 0))) loi.push('[17] phải bằng [15] − [16].');
  if (g18 !== null) {
    const a = o1313 === null || o1313 === undefined ? null : o1313 - g14;
    const hop = (a !== null && a < 0 && g18 === -a) || (o1315 !== null && o1315 !== undefined && o1315 + g14 > 0 && g18 === o1315 + g14);
    if (!hop) loi.push('[18] không khớp công thức [13.13]-[14]<0 hoặc [13.15]+[14]>0.');
  }
  const g21 = gop('[21]');
  const thue = dong.find((d) => d.ma === '[19]');
  if (g21 !== null && g21 !== (thue?.o.nop_thua_tncn ?? 0) + (gop('[20]') ?? 0)) loi.push('[21] phải bằng [19.15] + [20].');
  return loi;
}

export const GHI_CHU_TKN_TT89 = [
  'Đối với trường hợp hộ kinh doanh, cá nhân kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống thì chỉ thực hiện thông báo doanh thu; không thực hiện khai số thuế GTGT, thuế TNCN phải nộp.',
  'Chỉ tiêu (1) Nhóm ngành nghề tại mục A khai như sau: (1) Phân phối, cung cấp hàng hóa, (2) Dịch vụ, xây dựng không bao thầu nguyên vật liệu, (3) Hoạt động cho thuê tài sản trừ bất động sản, (4) Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu, (5) Hoạt động cung cấp sản phẩm nội dung thông tin số về giải trí, trò chơi điện tử, phim số, ảnh số, nhạc số, quảng cáo số, (6) Hoạt động kinh doanh khác. Trường hợp cá nhân có nhiều ngành nghề thì kê khai mỗi ngành nghề trên 01 dòng.',
  'Chỉ tiêu [3.1], [3.2]...tại khoản III, mục C: bao gồm khoáng sản và đất đá bóc, đất đá thải (nếu có).',
  'Hệ số K tính phí bảo vệ môi trường đối với khai thác khoáng sản thực hiện theo quy định tại Nghị định số 27/2023/NĐ-CP và các văn bản sửa đổi bổ sung (nếu có)',
];

export const CAM_DOAN_TT89 = 'Tôi cam đoan những nội dung kê khai trên là đúng và chịu trách nhiệm trước pháp luật về những nội dung đã khai./.';

/** Khối ký: bên trái người làm dịch vụ thủ tục thuế (mới), bên phải người nộp thuế. */
export const CHU_KY_TT89 = {
  dich_vu: ['NGƯỜI TRỰC TIẾP THỰC HIỆN DỊCH VỤ LÀM THỦ TỤC VỀ THUẾ', 'Họ và tên: ……………………', 'Chứng chỉ nghiệp vụ chuyên môn về thuế số:……………'],
  nguoi_nop_chu_thich: '(Chữ ký, ghi rõ họ tên; chức vụ và đóng dấu (nếu có)/Xác nhận điện tử/Ký điện tử)',
};

const DVT = 'Đơn vị tiền: Đồng Việt Nam';
const o = (nhan: string, cot = 1, hang = 1, dam = false) => ({ nhan, cot, hang, dam });
const trong = (n: number) => Array.from({ length: n }, () => o(''));

/** Phần B–E và bảng bù trừ, chép nguyên văn. MIMI không có dữ liệu cho các phần này → in trống. */
export const PHAN_SAU_TKN_TT89: PhanSauToKhai[] = [
  {
    tieu_de: 'B. KÊ KHAI THUẾ TIÊU THỤ ĐẶC BIỆT',
    don_vi_tien: DVT,
    bang: {
      dau: [
        [o('STT', 1, 1, true), o('Hàng hóa, dịch vụ chịu thuế TTĐB', 1, 1, true), o('Mã chỉ tiêu', 1, 1, true), o('Đơn vị tính', 1, 1, true), o('Doanh thu tính thuế TTĐB', 1, 1, true), o('Thuế suất', 1, 1, true), o('Số thuế phải nộp', 1, 1, true)],
        [o('(1)'), o('(2)'), o('(3)'), o('(4)'), o('(5)'), o('(6)'), o('(7)=(5)*(6)')],
      ],
      than: [
        [o('I', 1, 1, true), o('Trụ sở kinh doanh:', 6, 1, true)],
        [o('1'), o('Hàng hóa, dịch vụ A'), o('[22a]'), ...trong(4)],
        [o('2'), o('Hàng hóa, dịch vụ B'), o('[22b]'), ...trong(4)],
        [o(''), o(''), o('…'), ...trong(4)],
        [o('II', 1, 1, true), o('Mã địa điểm kinh doanh 1:\nTên địa điểm kinh doanh 1:', 6, 1, true)],
        [o('…'), o('………………………'), ...trong(5)],
        [o('III', 1, 1, true), o('Tổng cộng:', 1, 1, true), o('[23]'), o(''), o('[23.1]'), o(''), o('[23.2]')],
        [o('IV', 1, 1, true), o('Số thuế được miễn từ 50.000 đồng trở xuống', 1, 1, true), o('[24]'), o('[24]=[23.2] <=50.000', 4)],
        [o('V', 1, 1, true), o('Số thuế còn phải nộp', 1, 1, true), o('[25]'), o('[25]=[23.2] - [24]', 4)],
      ],
    },
  },
  {
    tieu_de: 'C. KÊ KHAI THUẾ TÀI NGUYÊN, BẢO VỆ MÔI TRƯỜNG, PHÍ BẢO VỆ MÔI TRƯỜNG',
    don_vi_tien: DVT,
    bang: {
      dau: [
        [
          o('STT', 1, 1, true), o('Tài nguyên, hàng hóa, sản phẩm', 1, 1, true), o('Trụ sở kinh doanh/Mã địa điểm kinh doanh', 1, 1, true),
          o('Tên địa điểm kinh doanh', 1, 1, true), o('Mã chỉ tiêu', 1, 1, true), o('Đơn vị tính', 1, 1, true), o('Sản lượng/ Số lượng', 1, 1, true),
          o('Giá tính thuế tài nguyên/ mức thuế hoặc phí BVMT', 1, 1, true), o('Thuế suất/Hệ số K tính phí BVMT', 1, 1, true), o('Số thuế/phí phải nộp', 1, 1, true),
        ],
        [o('(1)'), o('(2)'), o('(3)'), o('(4)'), o('(5)'), o('(6)'), o('(7)'), o('(8)'), o('(9)'), o('(10)')],
      ],
      than: [
        [o('I', 1, 1, true), o('Khai thuế tài nguyên', 9, 1, true)],
        [o('1'), o('Tài nguyên C..'), o(''), o(''), o('[26a]'), ...trong(4), o('(10)=(7)*(8)*(9)')],
        [o('2'), o('Tài nguyên D..'), o(''), o(''), o('[26b]'), ...trong(5)],
        [o(''), o('……………………'), ...trong(8)],
        [o(''), o('Tổng cộng', 8, 1, true), o('[27]')],
        [o(''), o('Số thuế được miễn từ 50.000 đồng trở xuống [28]=[27]<=50.000', 8, 1, true), o('[28]')],
        [o(''), o('Số thuế còn phải nộp [29]=[27]-[28]', 8, 1, true), o('[29]')],
        [o('II', 1, 1, true), o('Khai thuế bảo vệ môi trường', 9, 1, true)],
        [o('2.1'), o('Hàng hóa E...'), o(''), o(''), o('[30a]'), ...trong(4), o('(10)=(7)*(8)')],
        [o('2.2'), o('Hàng hóa G...'), o(''), o(''), o('[30b]'), ...trong(5)],
        [o(''), o('……………………'), ...trong(8)],
        [o(''), o('Tổng cộng', 8, 1, true), o('[31]')],
        // Mẫu in đúng như vậy ("[30]=[29]") trên dòng mã [32] — chép nguyên văn, xem đầu file.
        [o(''), o('Số thuế được miễn từ 50.000 đồng trở xuống [30]=[29]<=50.000', 8, 1, true), o('[32]')],
        [o(''), o('Số thuế còn phải nộp [33]=[31]-[32]', 8, 1, true), o('[33]')],
        [o('III', 1, 1, true), o('Khai phí bảo vệ môi trường đối với khai thác khoáng sản', 9, 1, true)],
        [o('3.1'), o('Khoáng sản X...'), o(''), o(''), o('[34a]'), ...trong(4), o('(10)=(7)*(8)*(9)')],
        [o('3.2'), o('Khoáng sản Y...'), o(''), o(''), o('[34b]'), ...trong(5)],
        [o(''), o('……………………'), ...trong(8)],
        [o(''), o('Tổng cộng', 8, 1, true), o('[35]')],
        [o(''), o('Số phí được miễn từ 50.000 đồng trở xuống [36]=[35]<=50.000', 8, 1, true), o('[36]')],
        [o(''), o('Số phí còn phải nộp [37]=[35]-[36]', 8, 1, true), o('[37]')],
      ],
    },
  },
  {
    tieu_de: 'D. HỖ TRỢ THÔNG TIN NỘP THUẾ',
    don_vi_tien: DVT,
    bang: {
      dau: [
        [
          o('STT', 1, 1, true), o('Mã địa điểm kinh doanh', 1, 1, true), o('Nội dung các khoản nộp NSNN', 1, 1, true), o('Số tiền', 1, 1, true),
          o('Chương', 1, 1, true), o('Tiểu mục', 1, 1, true), o('Địa bàn hành chính', 1, 1, true), o('Cơ quan thu', 1, 1, true),
          o('Cơ quan thuế', 1, 1, true), o('Hạn nộp thuế', 1, 1, true),
        ],
        [o('[38]'), o('[39]'), o('[40]'), o('[41]'), o('[42]'), o('[43]'), o('[44]'), o('[45]'), o('[46]'), o('[47]')],
      ],
      than: [
        [o('…'), ...trong(9)],
        [o(''), o(''), o('Tổng cộng', 1, 1, true), o('[48]'), ...trong(6)],
      ],
    },
  },
  {
    tieu_de: 'E. ĐỀ NGHỊ XỬ LÝ KHOẢN NỘP THỪA',
    dong_ke: [
      '[49] Đề nghị hoàn trả:',
      '[49.1] Số thuế GTGT:',
      '[49.2] Số thuế TNCN từ hoạt động sản xuất kinh doanh (trừ hoạt động cho thuê nhà):',
      '[49.3] Số thuế TNCN từ hoạt động cho thuê nhà:',
      '[49.4] Tổng cộng:',
      '[50] Số bù trừ cho các phát sinh của kỳ sau:',
      '[50.1] Số thuế GTGT:',
      '[50.2] Số thuế TNCN từ hoạt động sản xuất kinh doanh (trừ hoạt động cho thuê nhà):',
      '[50.3] Số thuế TNCN từ hoạt động cho thuê nhà:',
      '[50.4] Tổng cộng:',
      '[51] Thông tin hoàn trả:',
      '[51.1] Tên chủ tài khoản:',
      '[51.2] Tài khoản số: ………………… [51.3] Tại Ngân hàng/KBNN:',
    ],
  },
  {
    tieu_de: null,
    cau_dan: 'Thông tin người nộp thuế đề nghị bù trừ khoản nộp thừa với khoản nợ, khoản thu phát sinh hoặc đề nghị hoàn kiêm bù trừ thu ngân sách nhà nước:',
    bang: {
      dau: [
        [o('STT', 1, 2, true), o('Thông tin khoản nợ/khoản thu phát sinh', 10, 1, true), o('Số tiền còn phải nộp đề nghị bù trừ với số tiền nộp thừa', 1, 2, true), o('Số tiền còn phải nộp sau bù trừ', 1, 2, true)],
        [
          o('Mã số thuế', 1, 1, true), o('Tên NNT', 1, 1, true), o('Mã định danh khoản phải nộp (ID) (nếu có)', 1, 1, true), o('Nội dung khoản nợ/phát sinh', 1, 1, true),
          o('Chương', 1, 1, true), o('Tiểu mục', 1, 1, true), o('Cơ quan thu', 1, 1, true), o('Địa bàn hành chính', 1, 1, true), o('Hạn nộp', 1, 1, true), o('Số tiền còn phải nộp', 1, 1, true),
        ],
        [o('[52]'), o('[53]'), o('[54]'), o('[55]'), o('[56]'), o('[57]'), o('[58]'), o('[59]'), o('[60]'), o('[61]'), o('[62]'), o('[63]'), o('[64]=[62]-[63]')],
      ],
      than: [trong(13), trong(13)],
    },
  },
];
