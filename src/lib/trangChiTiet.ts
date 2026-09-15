import type { NhomNangLuc } from '@/lib/troLy';

/**
 * Các trang chi tiết mở từ MIMI Assistant — không còn trên thanh bên, nhưng vẫn là nơi xem
 * từng dòng. Một danh sách cho màn trợ lý, bảng "Thêm" trên điện thoại và tiêu đề đầu trang.
 */
export const TRANG_CHI_TIET: { nhom: NhomNangLuc; nhan: string; duong_dan: string }[] = [
  { nhom: 'tro_ly', nhan: 'Kiểm soát agent', duong_dan: '/dashboard/tac-tu' },
  { nhom: 'chi_phi', nhan: 'Chính sách chi', duong_dan: '/dashboard/chinh-sach' },
  { nhom: 'chung_tu', nhan: 'Chứng từ chi phí', duong_dan: '/dashboard/chung-tu' },
  { nhom: 'chung_tu', nhan: 'Hoá đơn', duong_dan: '/dashboard/invoices' },
  { nhom: 'ngan_hang', nhan: 'Kết nối ngân hàng & thuế', duong_dan: '/dashboard/fintech' },
  { nhom: 'ai_token', nhan: 'Chi phí AI', duong_dan: '/dashboard/chi-phi-ai' },
  { nhom: 'bao_cao', nhan: 'Báo cáo', duong_dan: '/dashboard/reports' },
];
