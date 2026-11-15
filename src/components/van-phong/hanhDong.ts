import type { MaLyDo } from '@/lib/goiVanPhong';

/** Việc nào thì mở trang nào — chỉ trang có thật của MIMI. */
export type LoaiHanhDong = 'mo_khach' | 'xem_tien_vao' | 'soan_to_khai' | 'tra_loi_nghia_vu' | 'ho_so_viec' | 'dong_tien';

export const DUONG: Record<LoaiHanhDong, string> = {
  mo_khach: '/dashboard',
  xem_tien_vao: '/dashboard/nhac-thue#can-xem',
  soan_to_khai: '/dashboard/to-khai',
  tra_loi_nghia_vu: '/dashboard/nhac-thue#ho-so-nghia-vu',
  ho_so_viec: '/dashboard/viec-can-lam',
  dong_tien: '/dashboard/cashflow',
};

export const HANH_DONG_CUA: Record<MaLyDo, LoaiHanhDong> = {
  khong_doc_duoc: 'mo_khach',
  han_gan_chua_san_sang: 'soan_to_khai',
  viec_chan: 'ho_so_viec',
  nguong_chua_chac: 'xem_tien_vao',
  to_khai_bi_chan: 'soan_to_khai',
  tien_vao_cho_xac_nhan: 'xem_tien_vao',
  han_trong_30_ngay: 'soan_to_khai',
  viec_mo: 'ho_so_viec',
  dong_tien_am_30_ngay: 'dong_tien',
  to_khai_thieu_du_lieu: 'soan_to_khai',
  can_xac_minh_nghia_vu: 'tra_loi_nghia_vu',
  da_vuot_nguong: 'soan_to_khai',
};

export const NHAN_HANH_DONG: Record<LoaiHanhDong, { vi: string; en: string }> = {
  mo_khach: { vi: 'Mở sổ khách', en: 'Open client' },
  xem_tien_vao: { vi: 'Xem tiền vào', en: 'Review incoming money' },
  soan_to_khai: { vi: 'Soạn tờ khai', en: 'Draft return' },
  tra_loi_nghia_vu: { vi: 'Trả lời câu hỏi', en: 'Answer questions' },
  ho_so_viec: { vi: 'Mở hồ sơ việc', en: 'Open case files' },
  dong_tien: { vi: 'Xem dòng tiền', en: 'View cash flow' },
};
