/**
 * Danh sách ngân hàng Việt Nam kèm mã BIN, để dựng mã VietQR ngay tại máy khách.
 *
 * VÌ SAO PHẢI CÓ. `taoChuoiVietQr` cần một mã BIN 6 số. Trước hôm nay chỗ duy
 * nhất có BIN là biến môi trường `MIMI_BANK_BIN` — tức chỉ tài khoản của MIMI
 * mới phát được mã QR, còn tài khoản của khách thì không. Nên nút "Nhận tiền
 * bằng QR" trên trang Hoá đơn buộc phải đi đường Cas, và tắc theo Cas.
 *
 * Có bảng này thì khách khai tài khoản một lần là phát được mã QR: không cần
 * grant nào, không chờ bên thứ ba nào trả lời.
 *
 * BIN SAI LÀ MÃ QR TRỎ SAI NGÂN HÀNG — nên không có ô nào cho gõ tay. Người
 * dùng chọn ngân hàng từ danh sách này, mã đi kèm luôn.
 *
 * NGUỒN: bảng mã tổ chức thành viên Napas. Danh sách dưới đây chỉ gồm những
 * ngân hàng thông dụng nhất và **cần soát lại với bảng Napas hiện hành trước
 * khi mở cho khách ngoài** — một dòng sai ở đây không báo lỗi, nó chỉ làm mã QR
 * không quét được.
 *
 * Cách tự kiểm rẻ nhất, nên làm với ngân hàng của chính mình trước khi gửi mã
 * cho khách: tạo một mã QR rồi quét bằng app ngân hàng. App hiện đúng tên chủ
 * tài khoản là BIN đúng; báo không tìm thấy là BIN sai.
 */

export interface NganHang {
  /** Mã BIN 6 số dùng trong trường 38 của VietQR. */
  bin: string;
  /** Tên ngắn, hiển thị trên giao diện. */
  ten: string;
  /** Tên đầy đủ, để người dùng chắc chắn chọn đúng. */
  tenDayDu: string;
  /**
   * Các cách gọi khác, dùng khi phải suy ra ngân hàng từ một chuỗi tự do đã
   * lưu trước đó. Viết thường, không dấu, không khoảng trắng.
   */
  goiKhac: string[];
}

export const DANH_SACH_NGAN_HANG: NganHang[] = [
  { bin: '970422', ten: 'MB Bank', tenDayDu: 'Ngân hàng Quân đội', goiKhac: ['mb', 'mbbank', 'quandoi', 'mbb'] },
  { bin: '970436', ten: 'Vietcombank', tenDayDu: 'Ngân hàng Ngoại thương Việt Nam', goiKhac: ['vcb', 'ngoaithuong'] },
  { bin: '970415', ten: 'VietinBank', tenDayDu: 'Ngân hàng Công thương Việt Nam', goiKhac: ['ctg', 'congthuong', 'vietin'] },
  { bin: '970418', ten: 'BIDV', tenDayDu: 'Ngân hàng Đầu tư và Phát triển Việt Nam', goiKhac: ['dautuvaphattrien'] },
  { bin: '970405', ten: 'Agribank', tenDayDu: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn', goiKhac: ['agri', 'nongnghiep'] },
  { bin: '970407', ten: 'Techcombank', tenDayDu: 'Ngân hàng Kỹ thương Việt Nam', goiKhac: ['tcb', 'techcom', 'kythuong'] },
  { bin: '970416', ten: 'ACB', tenDayDu: 'Ngân hàng Á Châu', goiKhac: ['achau'] },
  { bin: '970432', ten: 'VPBank', tenDayDu: 'Ngân hàng Việt Nam Thịnh Vượng', goiKhac: ['vpb', 'thinhvuong'] },
  { bin: '970423', ten: 'TPBank', tenDayDu: 'Ngân hàng Tiên Phong', goiKhac: ['tpb', 'tienphong'] },
  { bin: '970403', ten: 'Sacombank', tenDayDu: 'Ngân hàng Sài Gòn Thương Tín', goiKhac: ['stb', 'saigonthuongtin'] },
  { bin: '970437', ten: 'HDBank', tenDayDu: 'Ngân hàng Phát triển TP.HCM', goiKhac: ['hdb'] },
  { bin: '970441', ten: 'VIB', tenDayDu: 'Ngân hàng Quốc tế Việt Nam', goiKhac: ['quocte'] },
  { bin: '970443', ten: 'SHB', tenDayDu: 'Ngân hàng Sài Gòn – Hà Nội', goiKhac: ['saigonhanoi'] },
  { bin: '970426', ten: 'MSB', tenDayDu: 'Ngân hàng Hàng hải Việt Nam', goiKhac: ['maritime', 'hanghai'] },
  { bin: '970431', ten: 'Eximbank', tenDayDu: 'Ngân hàng Xuất nhập khẩu Việt Nam', goiKhac: ['eib', 'xuatnhapkhau'] },
  { bin: '970448', ten: 'OCB', tenDayDu: 'Ngân hàng Phương Đông', goiKhac: ['phuongdong'] },
  { bin: '970440', ten: 'SeABank', tenDayDu: 'Ngân hàng Đông Nam Á', goiKhac: ['sea', 'dongnama'] },
  { bin: '970449', ten: 'LPBank', tenDayDu: 'Ngân hàng Lộc Phát Việt Nam', goiKhac: ['lienvietpostbank', 'lienviet', 'lpb'] },
  { bin: '970429', ten: 'SCB', tenDayDu: 'Ngân hàng Sài Gòn', goiKhac: ['saigon'] },
  { bin: '970419', ten: 'NCB', tenDayDu: 'Ngân hàng Quốc Dân', goiKhac: ['quocdan', 'navibank'] },
  { bin: '970425', ten: 'ABBANK', tenDayDu: 'Ngân hàng An Bình', goiKhac: ['abb', 'anbinh'] },
  { bin: '970412', ten: 'PVcomBank', tenDayDu: 'Ngân hàng Đại Chúng Việt Nam', goiKhac: ['pvcom', 'daichung'] },
  { bin: '970409', ten: 'BacABank', tenDayDu: 'Ngân hàng Bắc Á', goiKhac: ['baca'] },
  { bin: '970424', ten: 'Shinhan Bank', tenDayDu: 'Ngân hàng Shinhan Việt Nam', goiKhac: ['shinhan'] },
  { bin: '970428', ten: 'Nam A Bank', tenDayDu: 'Ngân hàng Nam Á', goiKhac: ['nama', 'namabank'] },
  { bin: '970427', ten: 'VietABank', tenDayDu: 'Ngân hàng Việt Á', goiKhac: ['vieta'] },
  { bin: '970438', ten: 'BaoViet Bank', tenDayDu: 'Ngân hàng Bảo Việt', goiKhac: ['baoviet', 'bvb'] },
  { bin: '970400', ten: 'SaigonBank', tenDayDu: 'Ngân hàng Sài Gòn Công Thương', goiKhac: ['saigoncongthuong', 'sgb'] },
  { bin: '970452', ten: 'KienLongBank', tenDayDu: 'Ngân hàng Kiên Long', goiKhac: ['kienlong', 'klb'] },
  { bin: '970433', ten: 'VietBank', tenDayDu: 'Ngân hàng Việt Nam Thương Tín', goiKhac: ['vietnamthuongtin'] },
  { bin: '970446', ten: 'Co-opBank', tenDayDu: 'Ngân hàng Hợp tác xã Việt Nam', goiKhac: ['coop', 'hoptacxa'] },
  { bin: '546034', ten: 'CAKE by VPBank', tenDayDu: 'CAKE by VPBank', goiKhac: ['cake'] },
];

/** Bỏ dấu, bỏ khoảng trắng, đưa về chữ thường — để so tên viết kiểu nào cũng khớp. */
export function chuanHoaTen(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Suy ra ngân hàng từ một chuỗi tự do đã lưu trước đó.
 *
 * CẦN VÌ DỮ LIỆU CŨ. Ô "Ngân hàng" trong form SePay từng là ô gõ tự do, nên
 * trong cơ sở dữ liệu đang có "MB Bank", "MBBank", "mb bank" — cùng một ngân
 * hàng, ba chuỗi. Hàm này gom chúng lại thay vì bắt người dùng khai lại.
 *
 * Trả `null` khi không chắc, và người gọi phải xử lý `null` bằng cách hỏi lại
 * người dùng. Đoán bừa một BIN là đoán bừa nơi tiền sẽ tới.
 */
export function timNganHang(q: string | null | undefined): NganHang | null {
  if (!q) return null;
  const s = q.trim();

  // BIN gõ thẳng là đường chắc chắn nhất, thử trước.
  if (/^\d{6}$/.test(s)) return DANH_SACH_NGAN_HANG.find((n) => n.bin === s) ?? null;

  const k = chuanHoaTen(s);
  if (!k) return null;

  for (const n of DANH_SACH_NGAN_HANG) {
    if (chuanHoaTen(n.ten) === k || chuanHoaTen(n.tenDayDu) === k) return n;
    if (n.goiKhac.includes(k)) return n;
  }

  /*
   * Khớp một phần, và CHỈ khi đúng một ngân hàng khớp.
   *
   * "MB Bank" chuẩn hoá thành "mbbank" nên khớp trọn ở vòng trên; nhưng "ngan
   * hang mb" thành "nganhangmb" thì không. Cho phép chứa nhau để bắt các trường
   * hợp đó — với điều kiện chỉ một ứng viên. Hai ứng viên nghĩa là chuỗi mơ hồ,
   * và mơ hồ về ngân hàng nhận tiền thì phải hỏi, không được chọn hộ.
   */
  const ungVien = DANH_SACH_NGAN_HANG.filter((n) => {
    const ten = chuanHoaTen(n.ten);
    return k.includes(ten) || n.goiKhac.some((g) => g.length >= 3 && k.includes(g));
  });
  return ungVien.length === 1 ? ungVien[0] : null;
}
