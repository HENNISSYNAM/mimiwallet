/**
 * Văn bản làm căn cứ cho trang "Đăng ký kinh doanh" — và mức độ MIMI đã kiểm từng điều.
 *
 * Vì sao tách riêng: mỗi điều trên trang (hồ sơ, nơi nộp, thời hạn, lệ phí, mẫu) phải nói được
 * "căn cứ ở đâu" và "MIMI đã mở văn bản gốc ra đọc chưa". Hai trạng thái, không có trạng thái thứ ba:
 *   - `goc`: đã đọc trên bản ký số của cơ quan ban hành (ảnh quét, đọc từng trang) trong lúc dựng trang;
 *   - `thu_cap`: lấy từ trang tổng hợp, bản hồ sơ chủ dự án đã dùng, hoặc hiểu biết chung — CHƯA mở
 *     văn bản gốc. Giao diện in nhãn này nguyên văn để người dùng tự đối chiếu trước khi nộp.
 *
 * Kiểm ngày 12/10/2026. Các bản gốc đã đọc:
 *   - Thông tư 121/2026/TT-BTC ngày 21/8/2026 (hiệu lực 21/8/2026), bản ký số Bộ Tài chính, Cổng
 *     TTĐT Chính phủ ký 24/8/2026; 70 trang. Điều 1 thay Mẫu số 1, 2, 3, 4, 5, 10, 12, 27, 30 và bãi
 *     bỏ Mẫu số 11 Phụ lục I Thông tư 68/2025/TT-BTC. Mẫu số 2 ở trang 11–22, Mẫu số 3 trang 23–31,
 *     Mẫu số 4 trang 32–41, Mẫu số 10 trang 49 của tệp.
 *   - Thông tư 68/2025/TT-BTC ngày 01/7/2025, bản ký số Bộ Tài chính; 266 trang. Mẫu số 6 Phụ lục I
 *     ở trang 47, Mẫu số 7 trang 49–50; Phụ lục II Mẫu số 1 (Giấy đề nghị đăng ký hộ kinh doanh) trang 221–223.
 */

export type TrangThaiNguon = 'goc' | 'thu_cap';

export interface CanCu {
  /** Điều/khoản/mẫu cụ thể, viết như trong văn bản. */
  dieu: string;
  van_ban: string;
  trang_thai: TrangThaiNguon;
  /** Nói rõ đọc ở đâu, hoặc vì sao chưa đối chiếu được. */
  ghi_chu?: string;
}

export const NHAN_TRANG_THAI: Record<TrangThaiNguon, string> = {
  goc: 'Đã đối chiếu văn bản gốc',
  thu_cap: 'Nguồn thứ cấp, chưa đối chiếu',
};

export const VAN_BAN = {
  luatDn: 'Luật Doanh nghiệp số 59/2020/QH14, sửa đổi, bổ sung bởi Luật số 03/2022/QH15 và Luật số 76/2025/QH15',
  nd168: 'Nghị định 168/2025/NĐ-CP ngày 30/6/2025 về đăng ký doanh nghiệp, sửa đổi, bổ sung bởi Nghị định 296/2026/NĐ-CP ngày 23/7/2026',
  tt68: 'Thông tư 68/2025/TT-BTC ngày 01/7/2025 của Bộ Tài chính',
  tt121: 'Thông tư 121/2026/TT-BTC ngày 21/8/2026 của Bộ Tài chính (sửa đổi Thông tư 68/2025/TT-BTC)',
} as const;

/** Căn cứ dùng lại nhiều lần. */
export const CC = {
  hieuLucMau: {
    dieu: 'Điều 1, Điều 3',
    van_ban: VAN_BAN.tt121,
    trang_thai: 'goc',
    ghi_chu: 'Từ 21/8/2026 Mẫu số 2, 3, 4, 10 dùng bản mới; hồ sơ đã nộp trước ngày đó theo mẫu cũ vẫn được giải quyết (Điều 2).',
  },
  mau2: { dieu: 'Mẫu số 2', van_ban: VAN_BAN.tt121, trang_thai: 'goc' },
  mau3: { dieu: 'Mẫu số 3', van_ban: VAN_BAN.tt121, trang_thai: 'goc' },
  mau4: { dieu: 'Mẫu số 4', van_ban: VAN_BAN.tt121, trang_thai: 'goc' },
  mau10: { dieu: 'Mẫu số 10', van_ban: VAN_BAN.tt121, trang_thai: 'goc' },
  mau6: { dieu: 'Mẫu số 6 Phụ lục I', van_ban: VAN_BAN.tt68, trang_thai: 'goc', ghi_chu: 'Thông tư 121/2026/TT-BTC không thay mẫu này.' },
  mau7: { dieu: 'Mẫu số 7 Phụ lục I', van_ban: VAN_BAN.tt68, trang_thai: 'goc', ghi_chu: 'Thông tư 121/2026/TT-BTC không thay mẫu này.' },
  mauHkd: { dieu: 'Mẫu số 1 Phụ lục II', van_ban: VAN_BAN.tt68, trang_thai: 'goc' },
  noiNhanDn: {
    dieu: 'Phần "Kính gửi" của Mẫu số 2, 3, 4',
    van_ban: VAN_BAN.tt121,
    trang_thai: 'goc',
    ghi_chu: 'Mẫu ghi "Kính gửi: (Cơ quan đăng ký kinh doanh cấp tỉnh)".',
  },
  noiNhanHkd: {
    dieu: 'Phần "Kính gửi" của Mẫu số 1 Phụ lục II',
    van_ban: VAN_BAN.tt68,
    trang_thai: 'goc',
    ghi_chu: 'Mẫu ghi "Kính gửi: (Cơ quan đăng ký kinh doanh cấp xã)".',
  },
  congBo: {
    dieu: 'Mục 13 Mẫu số 4 (mục 12 Mẫu số 2, mục 11 Mẫu số 3)',
    van_ban: VAN_BAN.tt121,
    trang_thai: 'goc',
    ghi_chu: 'Câu đề nghị công bố nội dung đăng ký doanh nghiệp trên Cổng thông tin quốc gia về đăng ký doanh nghiệp.',
  },
  chuSoHuuHuongLoi: {
    dieu: 'Chú thích 2, 4, 5 Mẫu số 10',
    van_ban: VAN_BAN.tt121,
    trang_thai: 'goc',
    ghi_chu: 'Xác định theo Điều 3 Nghị định 296/2026/NĐ-CP; ngưỡng sở hữu trực tiếp/gián tiếp từ 25% vốn điều lệ hoặc 25% tổng số cổ phần có quyền biểu quyết.',
  },
  dieu24: {
    dieu: 'Điều 24',
    van_ban: VAN_BAN.luatDn,
    trang_thai: 'thu_cap',
    ghi_chu: 'Danh mục nội dung lấy theo bản Điều lệ chủ dự án đã nộp thành công và hiểu biết về Luật; chưa mở bản gốc của Luật trong lúc dựng trang.',
  },
  dieu21_23: {
    dieu: 'Điều 21, 22, 23',
    van_ban: VAN_BAN.luatDn,
    trang_thai: 'thu_cap',
    ghi_chu: 'Thành phần hồ sơ ngoài các mẫu; chưa đối chiếu bản gốc, cũng chưa đối chiếu Nghị định 168/2025/NĐ-CP (sửa đổi 2026) về giấy tờ pháp lý cá nhân.',
  },
  thoiHan: {
    dieu: 'Điều 26 khoản 5 (doanh nghiệp); quy định về đăng ký hộ kinh doanh trong Nghị định 168/2025/NĐ-CP',
    van_ban: `${VAN_BAN.luatDn}; ${VAN_BAN.nd168}`,
    trang_thai: 'thu_cap',
    ghi_chu: 'Thời hạn 03 ngày làm việc kể từ ngày nhận hồ sơ hợp lệ — theo nguồn tổng hợp, chưa đối chiếu.',
  },
  lePhi: {
    dieu: 'Biểu phí, lệ phí đăng ký doanh nghiệp',
    van_ban: 'Thông tư 47/2019/TT-BTC và văn bản sửa đổi, điều chỉnh mức thu (nếu có)',
    trang_thai: 'thu_cap',
    ghi_chu: 'Mức hay được trích: lệ phí 50.000 đồng/lần, phí công bố 100.000 đồng/lần; nộp qua mạng có thể được miễn/giảm. Lệ phí hộ kinh doanh do Hội đồng nhân dân cấp tỉnh quyết định. Chưa đối chiếu — xem mức hiển thị trên Cổng khi nộp.',
  },
  gopVon90: {
    dieu: 'Điều 47 khoản 2, Điều 75 khoản 2, Điều 113 khoản 1',
    van_ban: VAN_BAN.luatDn,
    trang_thai: 'thu_cap',
    ghi_chu: 'Góp đủ vốn trong 90 ngày kể từ ngày được cấp Giấy chứng nhận đăng ký doanh nghiệp; bản hồ sơ chủ dự án đã nộp cũng ghi đúng thời hạn này.',
  },
  boKhoan: {
    dieu: 'Điều 10 khoản 4',
    van_ban: 'Nghị quyết 198/2025/QH15',
    trang_thai: 'thu_cap',
    ghi_chu: 'Bỏ thuế khoán với hộ, cá nhân kinh doanh chậm nhất từ 01/01/2026. Mẫu số 1 Phụ lục II (bản 01/7/2025) vẫn in ô "Phương pháp khoán".',
  },
} satisfies Record<string, CanCu>;
