import type { NhomNangLuc } from '@/lib/troLy';

/**
 * Các trang chi tiết mở từ MIMI Assistant — không còn trên thanh bên, nhưng vẫn là nơi xem
 * từng dòng. Một danh sách cho màn trợ lý, bảng "Thêm" trên điện thoại và tiêu đề đầu trang.
 */
export const TRANG_CHI_TIET: { nhom: NhomNangLuc; khoa: string; duong_dan: string }[] = [
  { nhom: 'tro_ly', khoa: 'man.ten.tacTu', duong_dan: '/dashboard/tac-tu' },
  { nhom: 'chi_phi', khoa: 'man.ten.chinhSach', duong_dan: '/dashboard/chinh-sach' },
  { nhom: 'chung_tu', khoa: 'man.ten.chungTu', duong_dan: '/dashboard/chung-tu' },
  { nhom: 'chung_tu', khoa: 'man.ten.toKhai', duong_dan: '/dashboard/to-khai' },
  { nhom: 'chung_tu', khoa: 'sidebar.invoices', duong_dan: '/dashboard/invoices' },
  { nhom: 'ngan_hang', khoa: 'sidebar.fintechHub', duong_dan: '/dashboard/fintech' },
  { nhom: 'ai_token', khoa: 'man.ten.chiPhiAi', duong_dan: '/dashboard/chi-phi-ai' },
  { nhom: 'bao_cao', khoa: 'sidebar.reports', duong_dan: '/dashboard/reports' },
];
