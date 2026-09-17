/**
 * MIMI-P0-003 — hiệu lực văn bản, suy từ chính điều "Hiệu lực thi hành" trong kho Công báo.
 *
 * Kho chỉ có ngày ban hành và ngày có hiệu lực; không có ngày hết hiệu lực. Nhưng văn bản mới
 * thường nói nguyên văn "Thông tư số X … hết hiệu lực kể từ ngày …". File này tách những câu đó
 * thành quan hệ bãi bỏ, luôn giữ câu trích để người đọc kiểm lại được.
 *
 * VIỆC KHÔNG LÀM: không suy "còn hiệu lực". Không thấy văn bản bãi bỏ trong kho chỉ có nghĩa là
 * kho chưa ghi nhận — trạng thái trả về nói đúng như vậy.
 *
 * MỨC TIN CẬY. Câu tiếng Việt liệt kê nhiều số hiệu không dấu a), b) có thể mơ hồ (số hiệu thứ hai
 * là văn bản bị bãi bỏ hay chỉ là tên văn bản được hướng dẫn?). Chỉ quan hệ `chac_chan` được dùng
 * để tự loại văn bản khỏi câu trả lời; `can_xem_lai` chỉ để cảnh báo.
 *
 * Hàm thuần, không import gì: trình duyệt, Node và Deno cùng dùng.
 */

export type LoaiQuanHe = 'bai_bo' | 'bai_bo_mot_phan';
export type DoTinCay = 'chac_chan' | 'can_xem_lai';

export interface QuanHeHieuLuc {
  /** Văn bản ra quyết định bãi bỏ. */
  so_hieu_nguon: string;
  /** Văn bản bị bãi bỏ (toàn bộ hoặc một phần). */
  so_hieu_dich: string;
  loai: LoaiQuanHe;
  /** YYYY-MM-DD; null khi câu không nói ngày và văn bản nguồn không có ngày hiệu lực. */
  hieu_luc_tu: string | null;
  do_tin_cay: DoTinCay;
  /** Câu bãi bỏ có kèm "trừ quy định tại…". */
  co_ngoai_le: boolean;
  /** Nguyên văn đoạn chứa quan hệ (đã gộp khoảng trắng). */
  trich: string;
}

// Số hiệu có thể có chữ thường ("QĐ-TTg") và chữ Đ — \b của JS không hiểu Đ, nên chặn biên bằng lookaround.
const SO_HIEU = /(?<![\dA-Za-zĐđ])\d{1,4}\/\d{4}\/[A-ZĐa-zđ][A-ZĐa-zđ0-9]*(?:-[A-ZĐa-zđ0-9]+)*(?![A-Za-zĐđ0-9])/g;
const THANH_PHAN = /^(điều|khoản|điểm|chương|mục|phụ lục|quy định tại|riêng quy định tại)\b/i;
const NAY_CO_HIEU_LUC = /(kể )?từ ngày (luật|nghị định|thông tư|nghị quyết|quyết định|pháp lệnh) này có hiệu lực/i;
const NGAY_CU_THE = /(?:kể )?từ ngày (\d{1,2}) tháng (\d{1,2}) năm (\d{4})/i;
const BAI_BO = /hết hiệu lực(?: thi hành)?(?=\s*(?:kể từ|từ ngày|[.:;,]|$))/gi;

const gon = (s: string) => s.replace(/\s+/g, ' ').trim();
const pad = (n: string) => n.padStart(2, '0');

function ngayTrong(doan: string, ngayHieuLucNguon: string | null): string | null {
  if (NAY_CO_HIEU_LUC.test(doan)) return ngayHieuLucNguon;
  const m = doan.match(NGAY_CU_THE);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return ngayHieuLucNguon;
}

/** Khoản chứa vị trí `i`: từ số thứ tự khoản gần nhất phía trước tới khoản kế tiếp. */
function khoanQuanh(s: string, i: number): { dau: number; cuoi: number } {
  const moKhoan = /(?:^|\s)(\d{1,2})\.\s?(?=[A-ZĐÀ-Ỹ])/g;
  let dau = 0;
  let cuoi = s.length;
  for (let m = moKhoan.exec(s); m; m = moKhoan.exec(s)) {
    const vt = m.index + (m[0].startsWith(' ') ? 1 : 0);
    if (vt <= i) dau = vt;
    else { cuoi = vt; break; }
  }
  return { dau, cuoi };
}

/**
 * Tách quan hệ bãi bỏ từ một đoạn văn bản.
 * @param ngayHieuLucNguon ngày có hiệu lực của văn bản nguồn (YYYY-MM-DD) — dùng cho "kể từ ngày … này có hiệu lực".
 */
export function tachQuanHeHieuLuc(noiDung: string, soHieuNguon: string, ngayHieuLucGoc: string | null): QuanHeHieuLuc[] {
  // Văn bản hợp nhất (VBHN) chỉ chép lại điều khoản của văn bản gốc — nó không bãi bỏ gì, và kho
  // ghi ngày hiệu lực của nó là 01/01/1900 (giá trị giữ chỗ). Không tách từ nguồn này.
  if (/\/VBHN-/i.test(soHieuNguon)) return [];
  const ngayHieuLucNguon = ngayHieuLucGoc && ngayHieuLucGoc >= '1945-09-02' ? ngayHieuLucGoc : null;
  const s = gon(noiDung);
  const ra = new Map<string, QuanHeHieuLuc>();
  const them = (q: QuanHeHieuLuc) => {
    if (q.so_hieu_dich.toUpperCase() === soHieuNguon.toUpperCase()) return;
    const k = `${q.so_hieu_dich}|${q.loai}`;
    const cu = ra.get(k);
    // Giữ bản chắc chắn nếu cùng một quan hệ xuất hiện hai lần.
    if (!cu || (cu.do_tin_cay === 'can_xem_lai' && q.do_tin_cay === 'chac_chan')) ra.set(k, q);
  };

  for (let m = BAI_BO.exec(s); m; m = BAI_BO.exec(s)) {
    const { dau, cuoi } = khoanQuanh(s, m.index);
    const khoan = s.slice(dau, cuoi);
    const viTri = m.index - dau;
    const truoc = khoan.slice(0, viTri);
    // "… đến ngày Nghị quyết số X hết hiệu lực" nói thời hạn, không phải bãi bỏ.
    if (/đến ngày[^.;]{0,120}$/i.test(truoc)) continue;
    // Ô "Ngày hết hiệu lực" trong biểu mẫu.
    if (/ngày\s*$/i.test(truoc)) continue;
    const trich = gon(khoan);
    const sau = khoan.slice(viTri + m[0].length);

    // Dạng liệt kê: "Các Thông tư sau hết hiệu lực …: a) …; b) …".
    // Dấu ":" ngay sau cụm bãi bỏ (trong cùng câu) và mục đầu là "a)".
    const lietKe = sau.match(/^[^:.;]{0,160}:\s*(a\)\s.*)$/i);
    if (lietKe) {
      const ngay = ngayTrong(khoan, ngayHieuLucNguon);
      const muc = lietKe[1].split(/(?:;\s*|\.\s+)(?=[b-zđ]\)\s)/i).map((x) => x.replace(/^[a-zđ]\)\s*/i, '').trim()).filter(Boolean);
      for (const x of muc) {
        const dich = x.match(SO_HIEU)?.[0];
        if (!dich) continue;
        them({
          so_hieu_nguon: soHieuNguon, so_hieu_dich: dich,
          loai: THANH_PHAN.test(x) ? 'bai_bo_mot_phan' : 'bai_bo',
          hieu_luc_tu: ngay, do_tin_cay: 'chac_chan', co_ngoai_le: false, trich,
        });
      }
      continue;
    }

    // Dạng trong câu: chủ ngữ đứng ngay trước "hết hiệu lực", sau dấu ";" hoặc sau "Kể từ ngày …,".
    let chuNgu = truoc.slice(Math.max(truoc.lastIndexOf(';'), -1) + 1).replace(/^\s*\d{1,2}\.\s?/, '');
    chuNgu = chuNgu.replace(/^\s*(kể )?từ ngày[^,]*,\s*/i, '').trim();
    const tatCa = [...new Set(chuNgu.match(SO_HIEU) ?? [])].filter((x) => x.toUpperCase() !== soHieuNguon.toUpperCase());
    if (!tatCa.length) continue;
    // "Luật X đã được sửa đổi, bổ sung theo Luật Y" / "… được sửa đổi, bổ sung bởi Nghị định Z": Y, Z là
    // văn bản sửa đổi được nhắc để gọi tên X, không phải đối tượng bãi bỏ (Luật GTGT 48/2024 sửa
    // Luật TNCN nhưng vẫn còn). Bỏ mọi số hiệu đứng sau cụm "sửa đổi, bổ sung" so với số đầu tiên.
    const viTriDau = chuNgu.indexOf(tatCa[0]) + tatCa[0].length;
    const cacSo = tatCa.filter((x, i) => i === 0 || !/sửa đổi,? bổ sung/i.test(chuNgu.slice(viTriDau, chuNgu.indexOf(x))));
    const motPhan = THANH_PHAN.test(chuNgu);
    // Mốc ngày: phần sau "hết hiệu lực" tới dấu ";" đầu tiên, rồi cả khoản.
    const duoi = sau.split(';')[0];
    const ngay = NAY_CO_HIEU_LUC.test(duoi) || NGAY_CU_THE.test(duoi) ? ngayTrong(duoi, ngayHieuLucNguon) : ngayTrong(khoan, ngayHieuLucNguon);
    const ngoaiLe = /^\s*(thi hành\s*)?(kể )?từ[^;]*,\s*trừ\b/i.test(duoi) || /,\s*trừ (quy định|các quy định|trường hợp)/i.test(duoi);
    cacSo.forEach((dich, i) => them({
      so_hieu_nguon: soHieuNguon, so_hieu_dich: dich,
      loai: motPhan ? 'bai_bo_mot_phan' : 'bai_bo',
      hieu_luc_tu: ngay,
      // Chủ ngữ có một số hiệu: chắc chắn. Nhiều số hiệu: số đầu là chủ ngữ, các số sau có thể chỉ là tên văn bản được nhắc.
      do_tin_cay: i === 0 ? 'chac_chan' : 'can_xem_lai',
      co_ngoai_le: ngoaiLe,
      trich,
    }));
  }
  return [...ra.values()];
}

export type TrangThaiHieuLuc =
  | 'het_hieu_luc'
  | 'het_hieu_luc_mot_phan'
  | 'co_the_het_hieu_luc'
  | 'chua_ghi_nhan_bai_bo';

export interface HieuLucTaiNgay {
  so_hieu: string;
  trang_thai: TrangThaiHieuLuc;
  tu: string | null;
  boi: string | null;
  trich: string | null;
  co_ngoai_le: boolean;
}

const MUC: Record<TrangThaiHieuLuc, number> = { chua_ghi_nhan_bai_bo: 0, co_the_het_hieu_luc: 1, het_hieu_luc_mot_phan: 2, het_hieu_luc: 3 };

/**
 * Tình trạng của một văn bản tại một ngày, theo các quan hệ kho đã ghi nhận.
 * Quan hệ chưa tới ngày hiệu lực thì chưa tính.
 */
export function hieuLucTaiNgay(soHieu: string, quanHe: QuanHeHieuLuc[], ngay: string): HieuLucTaiNgay {
  let tot: HieuLucTaiNgay = { so_hieu: soHieu, trang_thai: 'chua_ghi_nhan_bai_bo', tu: null, boi: null, trich: null, co_ngoai_le: false };
  for (const q of quanHe) {
    if (q.so_hieu_dich.toUpperCase() !== soHieu.toUpperCase()) continue;
    if (!q.hieu_luc_tu || q.hieu_luc_tu > ngay) continue;
    const tt: TrangThaiHieuLuc = q.do_tin_cay === 'can_xem_lai'
      ? 'co_the_het_hieu_luc'
      : q.loai === 'bai_bo' ? 'het_hieu_luc' : 'het_hieu_luc_mot_phan';
    if (MUC[tt] > MUC[tot.trang_thai]) {
      tot = { so_hieu: soHieu, trang_thai: tt, tu: q.hieu_luc_tu, boi: q.so_hieu_nguon, trich: q.trich, co_ngoai_le: q.co_ngoai_le };
    }
  }
  return tot;
}

/** Nhãn cho người đọc. Không bao giờ nói "còn hiệu lực" — kho chỉ biết điều nó đã ghi nhận. */
export function nhanHieuLuc(h: HieuLucTaiNgay): string {
  const ngay = h.tu ? h.tu.split('-').reverse().join('/') : '';
  switch (h.trang_thai) {
    case 'het_hieu_luc':
      return `Hết hiệu lực từ ${ngay} (bãi bỏ bởi ${h.boi}${h.co_ngoai_le ? ', có ngoại lệ' : ''})`;
    case 'het_hieu_luc_mot_phan':
      return `Một phần hết hiệu lực từ ${ngay} (theo ${h.boi})`;
    case 'co_the_het_hieu_luc':
      return `Có thể đã hết hiệu lực từ ${ngay} theo ${h.boi} — chưa xác minh`;
    default:
      return 'Kho chưa ghi nhận văn bản bãi bỏ';
  }
}
