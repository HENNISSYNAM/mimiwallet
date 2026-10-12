/**
 * XU — năng lượng của MIMI (11/10/2026). Phần tính toán THUẦN, dùng chung cho máy chủ (`tro-ly`) và
 * giao diện (thanh năng lượng trên mèo, Cài đặt) — hai nơi đọc cùng một công thức thì không lệch nhau.
 *
 * Xu là số NGUYÊN. Xu chỉ dùng trong MIMI: không đổi ngược ra tiền, không chuyển cho người khác.
 * Mọi hằng số giá nằm ở `billing/bang-gia.ts` và đang là ĐỀ XUẤT chờ chủ sản phẩm chốt.
 */
import { timGia, type GiaModel } from '../chi-phi-ai/bang-gia.ts';
import { USD_MOT_XU_DE_XUAT, XU_MOT_LAN_GOI_KHONG_RO_GIA_DE_XUAT } from '../billing/bang-gia.ts';

/** Một lần gọi mô hình như `coDo` ghi lại (`ai/nha-cung-cap.ts` → `LanGoi`). */
export interface LanGoiTinhXu {
  nha_cung_cap: string;
  mo_hinh: string;
  token_vao: number | null;
  token_ra: number | null;
  thanh_cong: boolean;
}

export interface XuCuaLuot {
  /** Số xu phải trừ cho cả lượt hỏi (một lượt có thể gọi mô hình nhiều lần khi dùng công cụ). */
  xu: number;
  /** Chi phí token theo bảng giá niêm yết, USD — để ghi vào sổ, không làm tròn. */
  usd: number;
  /** Bao nhiêu lần gọi không tra được giá (tính theo mức cố định đề xuất). */
  khong_ro_gia: number;
  so_lan_goi: number;
}

/**
 * Xu của một lượt hỏi, theo chi phí token THẬT.
 *
 * - Lần gọi hỏng: 0 xu — nhà cung cấp không tính tiền lượt lỗi, MIMI cũng không.
 * - Tra được giá: cộng chi phí USD của mọi lần gọi, rồi làm tròn LÊN một lần cho cả lượt (làm tròn từng
 *   lần gọi thì câu nhiều bước bị tính dôi).
 * - Không tra được giá, hoặc nhà cung cấp không báo token: mỗi lần gọi thành công tính mức cố định ĐỀ XUẤT —
 *   không tính 0, vì gọi mô hình luôn tốn tiền thật.
 */
export function xuCuaLuot(ds: LanGoiTinhXu[], bang: GiaModel[]): XuCuaLuot {
  let usd = 0;
  let khongRo = 0;
  let soLan = 0;
  for (const l of ds) {
    if (!l.thanh_cong) continue;
    soLan += 1;
    const gia = timGia(l.mo_hinh, l.nha_cung_cap, bang);
    if (!gia || l.token_vao == null || l.token_ra == null) {
      khongRo += 1;
      continue;
    }
    usd += (Math.max(0, l.token_vao) * gia.gia_vao_usd_moi_trieu + Math.max(0, l.token_ra) * gia.gia_ra_usd_moi_trieu) / 1e6;
  }
  // Bỏ phần lẻ do số thực (0.1 + 0.2) trước khi làm tròn lên, để 3 xu đúng không thành 4.
  const xuTheoGia = usd > 0 ? Math.ceil(Math.round((usd / USD_MOT_XU_DE_XUAT) * 1e6) / 1e6) : 0;
  return { xu: xuTheoGia + khongRo * XU_MOT_LAN_GOI_KHONG_RO_GIA_DE_XUAT, usd, khong_ro_gia: khongRo, so_lan_goi: soLan };
}

/** Tháng theo giờ Việt Nam, dạng "2026-10" — khoá của lần nạp đầy hằng tháng. */
export function kyThangVN(bayGio: Date = new Date()): string {
  return bayGio.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 7);
}

/**
 * Số dư để HIỂN THỊ. `soDuCuoi` là `so_du_sau` của dòng sổ mới nhất (null = chưa có dòng nào).
 *
 * Lần nạp đầy của tháng chỉ được ghi ở máy chủ, lúc lượt hỏi có dùng mô hình đầu tiên của tháng (hàm
 * SQL `tru_xu`). Trước lúc đó sổ còn số dư tháng trước — nhưng người dùng thật sự đang có đầy hạn mức,
 * nên màn hình nói đúng điều đó thay vì báo "sắp hết" sai.
 */
export function soDuHienThi(soDuCuoi: number | null, daNapThangNay: boolean, hanMuc: number): number {
  const soDu = Math.max(0, Number(soDuCuoi ?? 0));
  return daNapThangNay ? soDu : Math.max(soDu, hanMuc);
}

/** Phần trăm năng lượng so với hạn mức tháng, 0–100, số nguyên (làm tròn XUỐNG: 99,6% chưa phải đầy). */
export function phanTramNangLuong(soDu: number, hanMuc: number): number {
  if (hanMuc <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((soDu * 100) / hanMuc)));
}

export type MucNangLuong = 'day' | 'vua' | 'thap' | 'het';

export function mucNangLuong(phanTram: number, soDu: number): MucNangLuong {
  if (soDu <= 0) return 'het';
  if (phanTram < 20) return 'thap';
  if (phanTram < 50) return 'vua';
  return 'day';
}
