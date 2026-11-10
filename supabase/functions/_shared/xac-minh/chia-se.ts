/**
 * Chia sẻ báo cáo "Doanh thu đã xác minh" CÓ SỰ ĐỒNG Ý của chủ hộ.
 *
 *   - Mỗi lần chia sẻ là một đường dẫn riêng cho MỘT người nhận, một mục đích, hết hạn tối đa 30 ngày, thu hồi
 *     được bất cứ lúc nào.
 *   - Đường dẫn mang một mã ngẫu nhiên 256 bit. MIMI chỉ lưu SHA-256 của mã: lộ CSDL cũng không mở được báo cáo.
 *     Mã chỉ hiện cho chủ hộ ĐÚNG MỘT LẦN, lúc tạo.
 *   - Người nhận chỉ thấy báo cáo (đã là con số tổng hợp), mã băm và trạng thái neo. Không giao dịch, không người
 *     chuyển, không số tài khoản — `goiCongKhai` liệt kê từng trường được đi ra, không có "mọi thứ còn lại".
 *
 * Hàm thuần (trừ sinh số ngẫu nhiên): Deno, vitest và trình duyệt cùng dùng.
 */
import { sha256Hex } from './chuan-hoa.ts';
import { b64, tepOtsBaoCao } from './neo.ts';

export const HAN_TOI_DA_NGAY = 30;
export const HAN_MAC_DINH_NGAY = 14;
export const VAI_TRO_CHIA_SE = ['chu_so_huu', 'quan_tri'] as const;

export const duocChiaSe = (vaiTro: string) => (VAI_TRO_CHIA_SE as readonly string[]).includes(vaiTro);

const b64url = (b: Uint8Array) => b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** 32 byte ngẫu nhiên từ bộ sinh mật mã → 43 ký tự base64url. */
export function taoToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export const laToken = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9_-]{43}$/.test(s);

export const bamToken = (token: string) => sha256Hex(`mimi-xac-minh-v1|${token}`);

/** Chữ người dùng gõ (tên người nhận, mục đích): bỏ ký tự điều khiển, gọn khoảng trắng, cắt độ dài. */
export function lamSachChu(v: unknown, toiDa: number): string {
  // eslint-disable-next-line no-control-regex
  return String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, toiDa);
}

/** Hạn của một lần chia sẻ: số ngày nguyên 1–30. Sai → null. */
export function hanChiaSe(soNgay: unknown, bayGio: Date): string | null {
  const n = soNgay === undefined || soNgay === null || soNgay === '' ? HAN_MAC_DINH_NGAY : Number(soNgay);
  if (!Number.isInteger(n) || n < 1 || n > HAN_TOI_DA_NGAY) return null;
  return new Date(bayGio.getTime() + n * 86_400_000).toISOString();
}

export type TrangThaiChiaSe = 'con_han' | 'het_han' | 'da_thu_hoi';

export function trangThaiChiaSe(cs: { expires_at: string; revoked_at: string | null }, bayGio: Date): TrangThaiChiaSe {
  if (cs.revoked_at) return 'da_thu_hoi';
  const het = Date.parse(cs.expires_at);
  return !Number.isFinite(het) || het <= bayGio.getTime() ? 'het_han' : 'con_han';
}

export interface DongBaoCao {
  report_json: unknown;
  sha256: string;
  anchor_status: string;
  ots_proof: string | null;
  anchored_at: string | null;
  confirmed_at: string | null;
  bitcoin_block: number | null;
}

export interface DongChiaSe {
  recipient_name: string;
  purpose: string;
  expires_at: string;
}

/** Thứ người nhận được thấy. Liệt kê TỪNG trường — không spread dòng CSDL. */
export function goiCongKhai(bc: DongBaoCao, cs: DongChiaSe) {
  let ots: string | null = null;
  if (bc.ots_proof && (bc.anchor_status === 'pending' || bc.anchor_status === 'confirmed')) {
    try { ots = b64(tepOtsBaoCao(bc.sha256, bc.ots_proof)); } catch { ots = null; }
  }
  return {
    bao_cao: bc.report_json,
    sha256: bc.sha256,
    neo: {
      trang_thai: bc.anchor_status,
      neo_luc: bc.anchored_at,
      xac_nhan_luc: bc.confirmed_at,
      khoi_bitcoin: bc.bitcoin_block,
      ots,
    },
    chia_se: { nguoi_nhan: cs.recipient_name, muc_dich: cs.purpose, het_han: cs.expires_at },
  };
}
