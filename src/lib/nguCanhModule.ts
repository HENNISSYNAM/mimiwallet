import type { NhomNangLuc } from '@/lib/troLy';

/**
 * CÁC MODULE TRONG KHÔNG GIAN MIMI TRỢ LÝ (29/09/2026) — một nguồn cho thanh công cụ ngữ cảnh, ô "Hỏi MIMI về
 * trang này" và nhận biết module đang mở.
 *
 * MIMI là một trợ lý có các công cụ tài chính phía sau, không phải bảng điều khiển có chatbot: sau đăng nhập
 * người dùng vào thẳng Trợ lý (`/dashboard`); mỗi module mở ngay trong cùng khung (thanh công cụ + ô hỏi vẫn
 * còn). KHÔNG đổi route cũ — mọi đường dẫn đã chia sẻ vẫn chạy.
 */

export type KhoaModule =
  | 'dong_tien' | 'hoa_don' | 'thue' | 'cong_no' | 'chung_tu' | 'bao_cao' | 'doanh_nghiep' | 'ban_hang' | 'vay_von';

export interface ModuleTroLy {
  khoa: KhoaModule;
  ten: string;
  /** Đường dẫn mở module (route đã có). */
  duong: string;
  /** Nhóm năng lực của trợ lý tương ứng — câu hỏi từ module được hỏi đúng phạm vi. */
  nhom: NhomNangLuc | null;
  /** Gợi ý câu hỏi trong ô hỏi của module. */
  hoiGi: string;
  /** Module đang mở khi đường dẫn khớp. */
  khop: (duong: string, truyVan: URLSearchParams) => boolean;
}

const la = (...ds: string[]) => (d: string) => ds.includes(d);

/*
 * 11/11/2026: ba việc ra tiền ngay đứng đầu — Thuế (tờ khai), Bán tại quầy (POS, VietQR tự khớp), Vay vốn (hồ sơ vay
 * + doanh thu đã xác minh). Bán tại quầy mở màn hình quầy riêng (`/pos`), ngoài khung trợ lý.
 */
export const MODULE_TRO_LY: readonly ModuleTroLy[] = [
  { khoa: 'thue', ten: 'Thuế & Tuân thủ', duong: '/dashboard/nhac-thue', nhom: 'chung_tu', hoiGi: 'Năm nay tôi có phải nộp thuế không?',
    khop: (d) => la('/dashboard/nhac-thue', '/dashboard/to-khai', '/dashboard/tai-lieu')(d) },
  { khoa: 'vay_von', ten: 'Vay vốn', duong: '/dashboard/vay-von', nhom: 'ngan_hang', hoiGi: 'Dự báo dòng tiền 3 tháng tới',
    khop: (d) => la('/dashboard/vay-von', '/dashboard/doanh-thu-xac-minh')(d) },
  { khoa: 'dong_tien', ten: 'Dòng tiền', duong: '/dashboard/cashflow', nhom: 'ngan_hang', hoiGi: 'Vì sao tháng này tiền ra nhiều hơn tiền vào?',
    khop: (d) => la('/dashboard/cashflow', '/dashboard/fintech')(d) },
  { khoa: 'hoa_don', ten: 'Hoá đơn', duong: '/dashboard/invoices', nhom: 'chung_tu', hoiGi: 'Tiền về tháng này khớp hoá đơn nào?',
    khop: (d, q) => d === '/dashboard/invoices' && q.get('filter') !== 'pending' },
  { khoa: 'cong_no', ten: 'Công nợ', duong: '/dashboard/invoices?filter=pending', nhom: 'chung_tu', hoiGi: 'Khách nào đang nợ lâu nhất?',
    khop: (d, q) => d === '/dashboard/invoices' && q.get('filter') === 'pending' },
  { khoa: 'chung_tu', ten: 'Chứng từ', duong: '/dashboard/chung-tu', nhom: 'chung_tu', hoiGi: 'Khoản chi nào chưa có chứng từ?',
    khop: (d) => la('/dashboard/chung-tu', '/dashboard/thu-vien', '/dashboard/chi-ca-nhan')(d) },
  { khoa: 'bao_cao', ten: 'Báo cáo', duong: '/dashboard/reports', nhom: 'bao_cao', hoiGi: 'Báo cáo thu chi 6 tháng',
    khop: (d) => la('/dashboard/reports', '/dashboard/doc-bao-cao')(d) },
  { khoa: 'doanh_nghiep', ten: 'Doanh nghiệp', duong: '/dashboard/settings', nhom: null, hoiGi: 'Hồ sơ thuế của công ty tôi còn thiếu gì?',
    khop: (d) => d === '/dashboard/settings' },
];

/**
 * Các trang còn lại, mở từ nút "…" — chỉ không chiếm chỗ trên thanh chính.
 * 16/11/2026: kiểm trước khi chuyển, giấy tờ, kiểm soát chi của agent, chính sách chi đóng băng (`lib/dongBang.ts`) nên rời danh sách.
 */
export const TRANG_THEM: readonly { ten: string; duong: string; khoa: string }[] = [
  { ten: 'Việc cần làm', duong: '/dashboard/viec-can-lam', khoa: 'viec_can_lam' },
  { ten: 'Thư viện chứng từ', duong: '/dashboard/thu-vien', khoa: 'thu_vien' },
  { ten: 'Tách chi cá nhân', duong: '/dashboard/chi-ca-nhan', khoa: 'chi_ca_nhan' },
  { ten: 'Tờ khai thuế', duong: '/dashboard/to-khai', khoa: 'to_khai' },
  { ten: 'Doanh thu đã xác minh', duong: '/dashboard/doanh-thu-xac-minh', khoa: 'doanh_thu_xac_minh' },
  { ten: 'Đọc báo cáo tài chính', duong: '/dashboard/doc-bao-cao', khoa: 'doc_bao_cao' },
  { ten: 'Ngân hàng & thanh toán', duong: '/dashboard/fintech', khoa: 'fintech' },
  { ten: 'Ứng dụng & kết nối', duong: '/dashboard/ket-noi', khoa: 'ket_noi' },
];

/** Đường dẫn của không gian Trợ lý (trang chính sau đăng nhập). */
export const DUONG_TRO_LY = '/dashboard';

export const laKhongGianTroLy = (duong: string) => duong === DUONG_TRO_LY || duong === `${DUONG_TRO_LY}/` || duong === '/dashboard/tro-ly';

export function moduleDangMo(duong: string, truyVan: URLSearchParams): ModuleTroLy | null {
  return MODULE_TRO_LY.find((m) => m.khop(duong, truyVan)) ?? null;
}
