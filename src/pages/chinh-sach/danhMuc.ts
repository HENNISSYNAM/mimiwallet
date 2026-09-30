/**
 * Danh mục trang công bố theo hồ sơ thông báo website/ứng dụng TMĐT bán hàng (online.gov.vn).
 *
 * MỘT NGUỒN cho: bảng route (`App.tsx`), chân trang, thanh liên kết giữa các trang chính sách, test,
 * và hồ sơ PDF nộp Bộ Công Thương (`docs/bo-cong-thuong/`). `so` khớp số thứ tự mục upload trên
 * biểu mẫu — đổi thứ tự ở đây là lệch với hồ sơ đã nộp.
 *
 * File này cố ý chỉ có chữ, không có JSX: `App.tsx` nạp nó ngay từ đầu, nội dung dài thì nạp lười.
 */
export interface MucCongBo {
  /** Số thứ tự mục trên biểu mẫu online.gov.vn. */
  so: number;
  slug: string;
  duong: string;
  /** Tiêu đề trang — cũng là h1. */
  tieuDe: string;
  /** Tên mục đúng như biểu mẫu của Bộ ghi. */
  tenTrenBieuMau: string;
  moTa: string;
}

export const DANH_MUC_CHINH_SACH: MucCongBo[] = [
  {
    so: 1,
    slug: 'bao-mat',
    duong: '/chinh-sach/bao-mat',
    tieuDe: 'Chính sách bảo mật',
    tenTrenBieuMau: 'Chính sách bảo mật',
    moTa: 'Cách MIMI Wallet thu thập, lưu trữ, chia sẻ và bảo vệ dữ liệu cá nhân và dữ liệu tài chính của bạn.',
  },
  {
    so: 2,
    slug: 'khieu-nai',
    duong: '/chinh-sach/khieu-nai',
    tieuDe: 'Tiếp nhận và giải quyết phản ánh, khiếu nại',
    tenTrenBieuMau: 'Phương thức tiếp nhận và giải quyết phản ánh, yêu cầu, khiếu nại',
    moTa: 'Kênh gửi phản ánh, yêu cầu, khiếu nại tới MIMI Wallet, thời hạn phản hồi và cách giải quyết tranh chấp.',
  },
  {
    so: 3,
    slug: 'gia',
    duong: '/chinh-sach/gia',
    tieuDe: 'Chính sách giá',
    tenTrenBieuMau: 'Chính sách giá',
    moTa: 'Bảng giá các gói dịch vụ MIMI Wallet, phần miễn phí, lượt xuất tờ khai và cách thay đổi giá.',
  },
  {
    so: 4,
    slug: 'thanh-toan',
    duong: '/chinh-sach/thanh-toan',
    tieuDe: 'Chính sách thanh toán',
    tenTrenBieuMau: 'Chính sách về thanh toán',
    moTa: 'Trả phí MIMI Wallet bằng chuyển khoản ngân hàng hoặc VietQR kèm mã tham chiếu, đối soát tự động.',
  },
  {
    so: 5,
    slug: 'dieu-kien-dich-vu',
    duong: '/chinh-sach/dieu-kien-dich-vu',
    tieuDe: 'Điều kiện và hạn chế khi cung cấp dịch vụ',
    tenTrenBieuMau: 'Các điều kiện hoặc hạn chế trong việc cung cấp hàng hóa hoặc dịch vụ trên nền tảng',
    moTa: 'Ai được dùng MIMI Wallet, những gì MIMI không làm, và giới hạn của dữ liệu và trợ lý AI.',
  },
  {
    so: 6,
    slug: 'cung-cap-cham-dut-hoan-tien',
    duong: '/chinh-sach/cung-cap-cham-dut-hoan-tien',
    tieuDe: 'Cung cấp dịch vụ, chấm dứt dịch vụ và hoàn tiền',
    tenTrenBieuMau: 'Phương thức cung cấp dịch vụ, chính sách chấm dứt dịch vụ và hoàn tiền',
    moTa: 'MIMI Wallet được cung cấp trực tuyến thế nào, cách ngừng hoặc chấm dứt dịch vụ, và khi nào được hoàn tiền.',
  },
  {
    so: 7,
    slug: 'ho-tro-truc-tuyen',
    duong: '/chinh-sach/ho-tro-truc-tuyen',
    tieuDe: 'Hỗ trợ trực tuyến',
    tenTrenBieuMau: 'Hình thức hỗ trợ trực tuyến',
    moTa: 'Các kênh hỗ trợ trực tuyến của MIMI Wallet: email, trợ lý trong ứng dụng, trang Facebook và trang hướng dẫn.',
  },
];

/** Mục 8 "Tài liệu khác": trang giới thiệu doanh nghiệp, dịch vụ và danh sách liên kết công bố. */
export const TRANG_THONG_TIN = {
  so: 8,
  duong: '/chinh-sach',
  tieuDe: 'Thông tin doanh nghiệp và chính sách',
  tenTrenBieuMau: 'Tài liệu khác',
  moTa: 'Đơn vị vận hành MIMI Wallet, mô tả dịch vụ, và danh sách toàn bộ chính sách công bố.',
} as const;

export const timChinhSach = (slug: string): MucCongBo | undefined =>
  DANH_MUC_CHINH_SACH.find((m) => m.slug === slug);
