/**
 * MIMI-P1-003 — ai trong công ty được làm gì.
 *
 * Trước đây MIMI coi một công ty có đúng một người: `companies.user_id`. Mọi hành động nhạy cảm
 * (duyệt chi, cấp khoá agent, nối ngân hàng) chỉ kiểm "có phải người của công ty này không".
 * Doanh nghiệp thật thì kế toán, người đề nghị chi và chủ là ba người khác nhau.
 *
 * File này là hàm thuần, không đọc CSDL: nơi chặn thật là backend (`quyen/kiem.ts` và từng
 * edge function). Giao diện chỉ dùng nó để ẩn nút — ẩn nút không phải là kiểm quyền.
 */

export const VAI_TRO = ['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan', 'nguoi_xem'] as const;
export type VaiTro = (typeof VAI_TRO)[number];

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  chu_so_huu: 'Chủ doanh nghiệp',
  quan_tri: 'Quản trị',
  nguoi_duyet: 'Người duyệt chi',
  ke_toan: 'Kế toán',
  nguoi_xem: 'Người xem',
};

export const MO_TA_VAI_TRO: Record<VaiTro, string> = {
  chu_so_huu: 'Làm được mọi việc, kể cả mời người khác và xoá công ty.',
  quan_tri: 'Như chủ doanh nghiệp, trừ xoá công ty và chuyển quyền sở hữu.',
  nguoi_duyet: 'Duyệt hoặc từ chối khoản chi; không đổi kết nối, không cấp khoá agent.',
  ke_toan: 'Ghi chứng từ, soạn tờ khai, sửa hồ sơ thuế; không duyệt chi.',
  nguoi_xem: 'Chỉ xem số liệu và câu trả lời của MIMI.',
};

/**
 * Hành động cần kiểm quyền. Phân loại theo đặc tả (mục 2.4): `read_only`, `reversible`,
 * `sensitive`, `regulated`.
 */
export const HANH_DONG = [
  'xem',
  'hoi_tro_ly',
  'ghi_chung_tu',
  'soan_to_khai',
  'sua_ho_so_thue',
  'tao_yeu_cau_chi',
  'duyet_chi',
  'huy_yeu_cau',
  'quan_ly_agent',
  'cap_khoa_agent',
  'quan_ly_nguoi_nhan',
  'noi_ngan_hang',
  'dong_bo_du_lieu',
  'quan_ly_thanh_vien',
  'thanh_toan_goi',
  'xoa_cong_ty',
] as const;
export type HanhDong = (typeof HANH_DONG)[number];

export type MucDoHanhDong = 'read_only' | 'reversible' | 'sensitive' | 'regulated';

export const MUC_DO: Record<HanhDong, MucDoHanhDong> = {
  xem: 'read_only',
  hoi_tro_ly: 'read_only',
  ghi_chung_tu: 'reversible',
  soan_to_khai: 'regulated',
  sua_ho_so_thue: 'regulated',
  tao_yeu_cau_chi: 'reversible',
  duyet_chi: 'sensitive',
  huy_yeu_cau: 'reversible',
  quan_ly_agent: 'sensitive',
  cap_khoa_agent: 'sensitive',
  quan_ly_nguoi_nhan: 'sensitive',
  noi_ngan_hang: 'sensitive',
  dong_bo_du_lieu: 'reversible',
  quan_ly_thanh_vien: 'sensitive',
  thanh_toan_goi: 'sensitive',
  xoa_cong_ty: 'sensitive',
};

/** Vai trò nào được làm hành động nào. Thiếu tên trong danh sách nghĩa là KHÔNG được. */
export const QUYEN: Record<HanhDong, readonly VaiTro[]> = {
  xem: VAI_TRO,
  hoi_tro_ly: VAI_TRO,
  ghi_chung_tu: ['chu_so_huu', 'quan_tri', 'ke_toan'],
  soan_to_khai: ['chu_so_huu', 'quan_tri', 'ke_toan'],
  sua_ho_so_thue: ['chu_so_huu', 'quan_tri', 'ke_toan'],
  tao_yeu_cau_chi: ['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan'],
  duyet_chi: ['chu_so_huu', 'quan_tri', 'nguoi_duyet'],
  huy_yeu_cau: ['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan'],
  quan_ly_agent: ['chu_so_huu', 'quan_tri'],
  cap_khoa_agent: ['chu_so_huu', 'quan_tri'],
  quan_ly_nguoi_nhan: ['chu_so_huu', 'quan_tri'],
  noi_ngan_hang: ['chu_so_huu', 'quan_tri'],
  dong_bo_du_lieu: ['chu_so_huu', 'quan_tri', 'ke_toan'],
  quan_ly_thanh_vien: ['chu_so_huu', 'quan_tri'],
  thanh_toan_goi: ['chu_so_huu', 'quan_tri'],
  xoa_cong_ty: ['chu_so_huu'],
};

export const laVaiTro = (v: unknown): v is VaiTro => (VAI_TRO as readonly string[]).includes(String(v));

/** Cửa duy nhất để hỏi "vai trò này có được làm việc kia không". */
export function duocLam(vai: VaiTro | null | undefined, hanhDong: HanhDong): boolean {
  if (!vai || !laVaiTro(vai)) return false;
  return QUYEN[hanhDong].includes(vai);
}

/** Câu từ chối cho người dùng: nói rõ việc gì, vai trò nào làm được. */
export function cauTuChoi(vai: VaiTro | null | undefined, hanhDong: HanhDong): string {
  const duoc = QUYEN[hanhDong].map((v) => TEN_VAI_TRO[v]).join(', ');
  const cua = vai && laVaiTro(vai) ? TEN_VAI_TRO[vai] : 'chưa rõ';
  return `Vai trò của bạn trong công ty (${cua}) không được làm việc này. Việc này dành cho: ${duoc}.`;
}
