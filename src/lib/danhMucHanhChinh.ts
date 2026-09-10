/**
 * Danh mục tỉnh, thành phố và ngành nghề cho form đăng ký.
 *
 * 34 ĐƠN VỊ HÀNH CHÍNH CẤP TỈNH, KHÔNG PHẢI 63. Nghị quyết 202/2025/QH15 (thông
 * qua 12/06/2025, chính quyền mới vận hành từ 01/07/2025) sắp xếp lại còn 6
 * thành phố trực thuộc trung ương và 28 tỉnh.
 *
 * Tới 10/09/2026 form đăng ký vẫn đọc danh sách 63 tỉnh từ `mockData.ts`. Một
 * doanh nghiệp ở "Bình Dương" hay "Vĩnh Phúc" sẽ khai một địa danh không còn trên
 * giấy tờ nào — đúng loại địa chỉ lệch khiến hồ sơ thuế bị trả về, và là một
 * trong những lý do doanh nghiệp rơi vào trạng thái 06.
 */

/** Thành phố trực thuộc trung ương trước, rồi 28 tỉnh theo thứ tự chữ cái. */
export const provinces = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa',
  'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình',
  'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long',
];

export const industries = [
  { label: 'F&B & Nhà hàng' },
  { label: 'Bán lẻ & Thương mại' },
  { label: 'Sản xuất & Chế biến' },
  { label: 'Logistics & Vận tải' },
  { label: 'Dược phẩm & Y tế' },
  { label: 'Xây dựng & Vật liệu' },
  { label: 'Công nghệ & Phần mềm' },
  { label: 'Xuất nhập khẩu' },
  { label: 'Nông nghiệp' },
  { label: 'Khác' },
];
