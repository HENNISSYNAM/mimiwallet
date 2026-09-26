/**
 * Bộ chuyển nhà cung cấp thực thi — Prompt 5 mục 36. Nghiệp vụ nói bằng `GoiThucThi` / `KetQuaGui` /
 * `TrangThaiNgoai`; khuôn riêng của Cas không lọt ra ngoài bộ chuyển của Cas.
 *
 * Hôm nay chỉ có:
 *   - `nguoiDungTuNop`: người dùng tự nộp trên Cổng dịch vụ công và nhập biên nhận. "Gửi" ở đây KHÔNG gọi
 *     mạng nào — nó chỉ nhận mã biên nhận người dùng khai, và ghi rõ nguồn là người dùng tự khai.
 *   - `giaLap`: CHỈ cho test (mục 38). Không bao giờ được chọn khi môi trường là production.
 * Bộ chuyển TVAN / eSign của Cas chưa viết: sổ năng lực ghi `unsupported` (xem `nang-luc.ts`).
 */
import type { KetQuaNop } from './may-trang-thai.ts';

export interface GoiThucThi {
  thuc_thi_id: string;
  loai: string;
  tai_lieu_id: string;
  phien_ban: number;
  ma_bam_noi_dung: string;
  ma_bam_du_lieu: string;
  /** Dữ liệu riêng của từng kênh (vd. mã biên nhận người dùng khai). */
  tham_so: Record<string, string>;
}

export interface KetQuaGui { tham_chieu_ngoai: string; nguon: 'nha_cung_cap' | 'nguoi_dung_khai'; }
export interface TrangThaiNgoai { ket_qua: KetQuaNop; tham_chieu_co_quan: string | null; kiem_luc: string; nguon: 'nha_cung_cap' | 'co_quan' | 'nguoi_dung_khai' }

export class LoiThucThi extends Error {
  constructor(public ma: string, message: string, public thuLai = false) {
    super(message);
    this.name = 'LoiThucThi';
  }
}

export interface NhaCungCapThucThi {
  ten: string;
  moiTruong: 'production' | 'sandbox' | 'test';
  kiem(g: GoiThucThi): string[];
  gui(g: GoiThucThi): Promise<KetQuaGui>;
  trangThai(thamChieu: string): Promise<TrangThaiNgoai | null>;
}

/** Người dùng tự nộp. Không có mạng, không giả vờ biết kết quả. */
export const nguoiDungTuNop: NhaCungCapThucThi = {
  ten: 'nguoi_dung',
  moiTruong: 'production',
  kiem(g) {
    const loi: string[] = [];
    const bn = (g.tham_so.bien_nhan ?? '').trim();
    if (bn.length < 3 || bn.length > 100) loi.push('Nhập mã biên nhận / mã giao dịch trên Cổng dịch vụ công (3–100 ký tự).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.tham_so.ngay_nop ?? '')) loi.push('Nhập ngày nộp (dạng 2026-10-15).');
    return loi;
  },
  async gui(g) {
    // Không gửi gì: người dùng đã tự nộp. Ghi lại đúng điều họ khai, kèm nguồn.
    return { tham_chieu_ngoai: g.tham_so.bien_nhan.trim(), nguon: 'nguoi_dung_khai' };
  },
  async trangThai() {
    // MIMI không tra được cổng thay người dùng: kết quả do người dùng nhập khi nhận thông báo.
    return null;
  },
};

/** CHỈ DÙNG TRONG TEST. Kết quả định sẵn, không gọi mạng. */
export function giaLap(kich: { gui?: KetQuaGui | LoiThucThi; trang?: TrangThaiNgoai | null }): NhaCungCapThucThi {
  return {
    ten: 'gia_lap', moiTruong: 'test',
    kiem: () => [],
    async gui() { if (kich.gui instanceof LoiThucThi) throw kich.gui; return kich.gui ?? { tham_chieu_ngoai: 'GL-1', nguon: 'nha_cung_cap' }; },
    async trangThai() { return kich.trang ?? null; },
  };
}

/** Chặn bộ giả lập / sandbox ở production (mục 38). */
export function duocDungO(ncc: NhaCungCapThucThi, moiTruong: 'production' | 'sandbox'): boolean {
  if (ncc.moiTruong === 'test') return false;
  return moiTruong === 'sandbox' || ncc.moiTruong === 'production';
}
