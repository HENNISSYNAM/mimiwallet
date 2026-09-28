/**
 * MIMI Assistant phía giao diện: kiểu dữ liệu (dùng chung với edge function `tro-ly`),
 * định dạng số, câu hỏi gợi ý, và chạy một đề xuất sau khi người dùng xác nhận.
 */
import type { BoiCanh, DeXuat, DonVi, NhomNangLuc, O, TraLoi } from '../../supabase/functions/_shared/tro-ly/kieu.ts';
import { ngayHienThi } from '../../supabase/functions/_shared/ngay.ts';

export * from '../../supabase/functions/_shared/tro-ly/kieu.ts';
export { TEN_NHOM } from '../../supabase/functions/_shared/tro-ly/tra-loi.ts';

/**
 * Số tiền VND chính xác gửi dưới dạng chuỗi số nguyên ('1000000000001'): định dạng bằng BigInt, KHÔNG qua
 * Number — trên Number.MAX_SAFE_INTEGER (~9 triệu tỷ) Number làm tròn mất đồng lẻ mà không báo gì.
 */
const SO_NGUYEN = /^-?\d+$/;
const dinhDangVndChuoi = (s: string) => `${new Intl.NumberFormat('vi-VN').format(BigInt(s))} ₫`;

// ── Đàn agent (hợp đồng Codex đang thêm vào `kieu.ts`) ──────────────────────────────────────────────
/*
 * TƯƠNG THÍCH NGƯỢC, KHÔNG PHẢI BỘ KIỂU THỨ HAI. Khi `kieu.ts` có `TraLoi.dan_agent` / `BoiCanh.danh_sach_agent`,
 * `DanAgent` và `AgentMimi` TỰ lấy đúng kiểu đó (nhánh `infer`). Hai kiểu `…Cho` dưới đây chỉ dùng tới khi máy
 * chủ chưa gửi — chép từ hợp đồng đã chốt, và bị bỏ qua ngay khi kiểu thật có mặt.
 */
interface DanAgentCho {
  lan_chay_id: string;
  cong_ty_id: string;
  bat_dau: string;
  ket_thuc: string;
  trang_thai: 'hoan_tat' | 'mot_phan' | 'can_bo_sung';
  tac_vu: Array<{
    agent_id: string; nang_luc: string; ten: string;
    trang_thai: 'hoan_tat' | 'loi' | 'can_bo_sung';
    thoi_gian_ms: number; tai_su_dung: boolean; cau: string;
  }>;
  tai_nguyen: {
    so_agent: number; so_tac_vu: number; so_nguon_doc: number;
    so_luot_mo_hinh: number; so_luot_tai_su_dung: number; gioi_han_song_song: number;
  };
  gioi_han: string[];
}
interface AgentMimiCho {
  id: string; ten: string; mo_ta: string; nang_luc: string[];
  trang_thai: 'san_sang' | 'can_ket_noi'; quyen: 'chi_doc_va_soan_nhap';
}
type Lay<T, K extends string, Cho> = T extends { [k in K]?: infer D } ? (NonNullable<D> extends Array<infer P> ? P : NonNullable<D>) : Cho;
export type DanAgent = TraLoi extends { dan_agent?: infer D } ? NonNullable<D> : DanAgentCho;
export type AgentMimi = Lay<BoiCanh, 'danh_sach_agent', AgentMimiCho>;
/** Câu trả lời có thể kèm đàn agent (máy chủ cũ không gửi — giao diện vẫn chạy). */
export type TraLoiNao = TraLoi & { dan_agent?: DanAgent | null };
export type BoiCanhNao = BoiCanh & { danh_sach_agent?: AgentMimi[] | null };

/** Ba quy trình máy chủ cho phép chạy bằng đàn agent. */
export const QUY_TRINH_AGENT = ['ke_toan_hang_ngay', 'thu_hoi_cong_no', 'kiem_tra_so_sach'] as const;
export type QuyTrinhAgent = (typeof QUY_TRINH_AGENT)[number];

export function dinhDang(v: O | undefined, donVi: DonVi): string {
  // Thiếu dữ liệu là "—", không bao giờ là 0.
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string') {
    // Ngày giữ chỗ (01/01/1900), chuỗi rỗng, ngày sai → "Chưa xác định", không in một ngày bịa.
    if (donVi === 'ngay') return ngayHienThi(v);
    if (donVi === 'vnd' && SO_NGUYEN.test(v)) return dinhDangVndChuoi(v);
    return v;
  }
  switch (donVi) {
    case 'vnd': return `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} ₫`;
    case 'usd': return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'phan_tram': return `${v}%`;
    default: return new Intl.NumberFormat('vi-VN').format(v);
  }
}

/** Cột số căn phải để các chữ số thẳng hàng. */
export const laCotSo = (d: DonVi) => d !== 'chu' && d !== 'ngay';

/** Câu hỏi gợi ý cho từng nhóm — mỗi câu đều được bộ nhận ý định hiểu mà không cần mô hình. */
export const GOI_Y_THEO_NHOM: Record<NhomNangLuc, string[]> = {
  tro_ly: ['Khoản nào đang chờ tôi duyệt?', 'Agent nào sắp hết hạn mức tháng?'],
  chi_phi: ['Chi phí tháng này tăng hay giảm?', 'Tháng này tôi chi tiêu nhiều nhất cho ai?'],
  chung_tu: ['Khoản chi nào chưa có chứng từ?', 'Năm nay tôi có phải nộp thuế không?'],
  ngan_hang: ['Dòng tiền 6 tháng qua thế nào?', 'Tiền về tháng này khớp hoá đơn nào?', 'Kết nối ngân hàng đang thế nào?'],
  ai_token: ['Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.', 'Token dùng theo model 30 ngày qua?'],
  bao_cao: ['Báo cáo thu chi 6 tháng', 'Có khoản nào bị trả trùng không?'],
  ket_noi: ['Kết nối nào đang cần xử lý?'],
};

export type GoiHam = (hanhDong: string, du?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export interface BoGoi {
  goiTacTu: GoiHam;
  goiChiPhiAi: GoiHam;
  goiTroLy: GoiHam;
  dongBoSaoKe: () => Promise<Record<string, unknown>>;
}

/** Việc không đổi dữ liệu nào (mở trang) thì không cần hộp xác nhận. */
export const canXacNhan = (dx: DeXuat) => dx.loai !== 'mo_trang';

/** Việc có dính tới tiền: nút xác nhận đổi chữ và màu để không bấm nhầm theo thói quen. */
export const dinhTien = (dx: DeXuat) => dx.loai === 'duyet_yeu_cau' || dx.loai === 'tu_choi_yeu_cau';

type Row = Record<string, unknown>;

/**
 * Chạy đề xuất bằng đúng backend đã có. Trả câu báo kết quả; lỗi thì ném, câu lỗi là câu
 * máy chủ viết cho người dùng đọc.
 */
export async function thucHienDeXuat(dx: DeXuat, g: BoGoi, tc: { daXacMinh?: boolean } = {}): Promise<string> {
  const t = dx.tham_so;
  switch (dx.loai) {
    case 'duyet_yeu_cau':
      // TCCN-01: `da_xac_minh` chỉ gửi sau khi người dùng đã đọc hộp dấu hiệu bất thường và tích ô xác minh.
      await g.goiTacTu('duyet', { yeu_cau_id: t.yeu_cau_id, ...(tc.daXacMinh ? { da_xac_minh: true } : {}) });
      return 'Đã duyệt. Lệnh trả VietQR nằm ở Kiểm soát agent — người có quyền trả vẫn trả bằng app ngân hàng.';
    case 'tu_choi_yeu_cau':
      await g.goiTacTu('tu_choi', { yeu_cau_id: t.yeu_cau_id, ghi_chu: t.ghi_chu });
      return 'Đã từ chối khoản chi.';
    case 'tam_dung_agent':
      await g.goiTacTu('doi_trang_thai', { tac_tu_id: t.tac_tu_id, trang_thai: 'tam_dung' });
      return 'Đã tạm dừng agent. Bật lại ở Kiểm soát agent khi bạn muốn.';
    case 'dong_bo_chi_phi_ai': {
      const kq = await g.goiChiPhiAi('dong_bo');
      const ds = (Array.isArray(kq.ket_qua) ? kq.ket_qua : []) as Row[];
      const loi = ds.filter((r) => typeof r.loi === 'string' && !r.bo_qua).map((r) => String(r.loi));
      if (ds.length && loi.length === ds.length) throw new Error(loi.join(' '));
      return loi.length ? `Đã lấy số liệu mới, riêng một nguồn báo: ${loi.join(' ')}` : 'Đã lấy số liệu AI mới nhất.';
    }
    case 'cap_nhat_bang_gia': {
      const kq = await g.goiChiPhiAi('cap_nhat_bang_gia');
      if (kq.bo_qua) return 'Bảng giá vừa được cập nhật trong vòng một giờ — dùng bảng hiện có.';
      return `Đã cập nhật giá của ${Number(kq.so_model ?? 0).toLocaleString('vi-VN')} model.`;
    }
    case 'dong_bo_ngan_hang': {
      const kq = await g.dongBoSaoKe();
      const ds = (Array.isArray(kq.synced) ? kq.synced : []) as Row[];
      const moi = ds.reduce((s, r) => s + (Number(r.inserted) || 0), 0);
      const loi = ds.filter((r) => typeof r.error === 'string').map((r) => String(r.remedy ?? r.error));
      return `Đã đồng bộ sao kê: ${moi.toLocaleString('vi-VN')} giao dịch mới.${loi.length ? ` Cần xử lý: ${loi.join(' ')}` : ''}`;
    }
    case 'luu_chung_tu_quet':
      await g.goiTroLy('luu_chung_tu', t);
      return 'Đã lưu chứng từ.';
    case 'tao_tai_lieu': {
      const kq = await g.goiTroLy('tao_tai_lieu', t);
      const tl = kq.tai_lieu as { tieu_de?: string } | undefined;
      return `Đã lưu "${tl?.tieu_de ?? 'tài liệu'}" vào Tài liệu & Chứng từ.`;
    }
    case 'mo_trang':
      return '';
  }
}

/**
 * MIMI-P0-001: lịch sử gửi kèm câu hỏi — một cách dựng duy nhất cho trang Trợ lý và widget,
 * để cùng câu hỏi, cùng lịch sử thì máy chủ nhận đúng cùng một yêu cầu.
 */
export function dungLichSu(luot: { cau: string; traLoi?: { cau: string } | null }[]) {
  return luot
    .filter((l): l is { cau: string; traLoi: { cau: string } } => !!l.traLoi)
    .slice(-3)
    .flatMap((l) => [{ vai: 'nguoi_dung' as const, noi_dung: l.cau }, { vai: 'tro_ly' as const, noi_dung: l.traLoi.cau }]);
}
