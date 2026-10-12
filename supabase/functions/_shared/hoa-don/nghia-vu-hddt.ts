/**
 * NGHĨA VỤ HOÁ ĐƠN ĐIỆN TỬ CỦA ĐÚNG NGƯỜI DÙNG NÀY (12/10/2026). Hàm thuần — trình duyệt và Deno cùng đọc.
 *
 * Vì sao có file này: đề bài cần trợ lý hỗ trợ "xuất hoá đơn điện tử", nhưng MIMI KHÔNG xuất hoá đơn và
 * không có quyền kết nối cơ quan thuế. Việc làm được và có ích: nói cho người dùng biết họ CÓ PHẢI dùng hoá
 * đơn điện tử không, loại nào, có phải đăng ký không — theo loại hình, doanh thu và cách bán của chính họ.
 *
 * CÙNG BA TRẠNG THÁI với `luat/lich-thue.ts`:
 *   phai_lam      có căn cứ trên dữ liệu thật rằng việc này áp dụng;
 *   can_xac_minh  thiếu một dữ kiện, hoặc văn bản chưa rõ cho trường hợp này — kèm ĐÚNG một câu hỏi;
 *   khong_ap_dung có căn cứ rằng không bắt buộc (vẫn hiện, để người dùng biết vì sao).
 * "Chưa biết" KHÔNG bao giờ bị đổi thành "bắt buộc".
 *
 * VĂN BẢN. Từ 01/07/2026 NĐ 254/2026/NĐ-CP thay NĐ 123/2020/NĐ-CP và NĐ 70/2025/NĐ-CP. Điều 6 dưới đây
 * đã đọc trên bản PDF có chữ ký đăng ở xaydungchinhsach.chinhphu.vn (12/10/2026). Điều nào chỉ đọc qua nguồn
 * thứ cấp thì gắn `chua_doi_chieu: true` — giao diện ghi "chưa đối chiếu văn bản gốc".
 *
 * Ngưỡng: "doanh thu năm TRÊN 01 tỷ đồng" (Điều 6 khoản 1 điểm d) — đúng 01 tỷ là chưa tới ngưỡng.
 */
import { CAN_CU } from '../luat/he-luat.ts';

export type TrangThaiHddt = 'phai_lam' | 'can_xac_minh' | 'khong_ap_dung';

export interface CanCuHddt {
  nhan: string;
  /** Câu trích nguyên văn khi đã đọc văn bản gốc; null khi chỉ có nguồn thứ cấp. */
  trich: string | null;
  chua_doi_chieu: boolean;
  nguon?: string;
}

export interface MucHddt {
  khoa: 'dung_hddt' | 'ban_truc_tiep' | 'dang_ky';
  ten: string;
  trang_thai: TrangThaiHddt;
  vi_sao: string;
  can_cu: CanCuHddt[];
  cau_hoi?: string;
}

export interface HoSoHddt {
  /** `tax-summary.loaiNguoiNop`. null = chưa biết. */
  loai: 'ho_kinh_doanh' | 'doanh_nghiep' | null;
  /** Doanh thu năm MIMI đang ước tính (`tax-summary.revenue`). null = chưa có số liệu. */
  doanhThuNam: number | null;
  /**
   * Doanh thu đã CHẮC trên 01 tỷ chưa (`tax-summary.crossedCertain`): true chắc trên, false chắc chưa tới,
   * null = khoảng doanh thu thật cắt ngưỡng (còn tiền vào chưa rõ là doanh thu hay không).
   */
  vuotNguongChac: boolean | null;
  /** Bán thẳng cho người tiêu dùng (bán lẻ, ăn uống, khách sạn…)? null = chưa biết. */
  banTrucTiep: boolean | null;
}

const NGUON_ND254 = 'https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-254-2026-nd-cp-ve-hoa-don-dien-tu-chung-tu-dien-tu-119260713164251972.htm';

export const CAN_CU_HDDT: Record<string, CanCuHddt> = {
  nd254_d6_k1a: {
    nhan: 'NĐ 254/2026/NĐ-CP · Điều 6 khoản 1 điểm a', chua_doi_chieu: false, nguon: NGUON_ND254,
    trich: 'Tổ chức kinh tế, tổ chức khác, hộ kinh doanh, cá nhân kinh doanh và các trường hợp rủi ro cao về thuế theo quy định của Bộ trưởng Bộ Tài chính sử dụng hóa đơn điện tử có mã của cơ quan thuế khi bán hàng hóa, cung cấp dịch vụ, trừ trường hợp quy định tại điểm b, điểm c khoản này;',
  },
  nd254_d6_k1b: {
    nhan: 'NĐ 254/2026/NĐ-CP · Điều 6 khoản 1 điểm b', chua_doi_chieu: false, nguon: NGUON_ND254,
    trich: 'thì được sử dụng hóa đơn điện tử không có mã của cơ quan thuế khi bán hàng hóa, cung cấp dịch vụ',
  },
  nd254_d6_k1c: {
    nhan: 'NĐ 254/2026/NĐ-CP · Điều 6 khoản 1 điểm c', chua_doi_chieu: false, nguon: NGUON_ND254,
    trich: 'Trường hợp tổ chức kinh tế, hộ kinh doanh, cá nhân kinh doanh có hoạt động bán hàng hóa, cung cấp dịch vụ trực tiếp đến người tiêu dùng đã đăng ký sử dụng hóa đơn điện tử theo quy định tại điểm a, điểm b khoản này thì không bắt buộc đăng ký sử dụng hóa đơn điện tử từ máy tính tiền;',
  },
  nd254_d6_k1d: {
    nhan: 'NĐ 254/2026/NĐ-CP · Điều 6 khoản 1 điểm d', chua_doi_chieu: false, nguon: NGUON_ND254,
    trich: 'Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm trên 01 tỷ đồng hoặc hộ kinh doanh, cá nhân kinh doanh bán tài sản phải đăng ký quyền sở hữu, quyền sử dụng thì phải áp dụng hóa đơn điện tử có mã của cơ quan thuế, hóa đơn điện tử khởi tạo từ máy tính tiền có kết nối dữ liệu với cơ quan thuế.',
  },
  nd254_d6_k1_cuoi: {
    nhan: 'NĐ 254/2026/NĐ-CP · Điều 6 khoản 1, đoạn cuối', chua_doi_chieu: false, nguon: NGUON_ND254,
    trich: 'Hộ kinh doanh, cá nhân kinh doanh không thuộc trường hợp sử dụng hóa đơn điện tử mà có nhu cầu sử dụng hóa đơn điện tử thì đăng ký sử dụng hóa đơn điện tử có mã của cơ quan thuế hoặc hóa đơn điện tử khởi tạo từ máy tính tiền có kết nối dữ liệu với cơ quan thuế.',
  },
  nd141_d1_k2a: { nhan: 'NĐ 141/2026/NĐ-CP · ' + CAN_CU.nd141_d1_k2a.vi_tri, trich: CAN_CU.nd141_d1_k2a.trich, chua_doi_chieu: false },
  nd141_d1_k2c: { nhan: 'NĐ 141/2026/NĐ-CP · ' + CAN_CU.nd141_d1_k2c.vi_tri, trich: CAN_CU.nd141_d1_k2c.trich, chua_doi_chieu: false },
  tt91_mau_01dktd: {
    nhan: 'TT 91/2026/TT-BTC · Phụ lục III, Mẫu 01/ĐKTĐ-HĐĐT', trich: null, chua_doi_chieu: true,
    nguon: 'https://luatvietnam.vn/bieu-mau/mau-01-dktd-hddt-to-khai-dang-ky-thay-doi-thong-tin-su-dung-hoa-don-dien-tu-571-110352-article.html',
  },
  cv5131_ho_duoi_1_ty: {
    nhan: 'Công văn 5131/CT-CS của Cục Thuế (hộ dưới 01 tỷ dùng hoá đơn điện tử nếu có nhu cầu)', trich: null, chua_doi_chieu: true,
    nguon: 'https://thuehaiquan.tapchikinhtetaichinh.vn/huong-dan-su-dung-hoa-don-dien-tu-doi-voi-ho-kinh-doanh-co-doanh-thu-duoi-1-ty-dong-162821.html',
  },
};

const cc = (...k: string[]) => k.map((x) => CAN_CU_HDDT[x]);

const CAU_LOAI = 'Bạn là hộ kinh doanh (cá nhân kinh doanh) hay doanh nghiệp? Hai loại có quy định hoá đơn khác nhau — chọn ở Cài đặt.';
const CAU_BAN = 'Bạn có bán thẳng cho người tiêu dùng không (bán lẻ, siêu thị, ăn uống, nhà hàng, khách sạn, vận tải hành khách, vui chơi giải trí…)?';

export function nghiaVuHoaDon(hs: HoSoHddt): MucHddt[] {
  const ra: MucHddt[] = [];

  // ── 1. Có phải dùng hoá đơn điện tử khi bán hàng không ─────────────────────────
  let dung: MucHddt;
  if (hs.loai === null) {
    dung = { khoa: 'dung_hddt', ten: 'Dùng hoá đơn điện tử khi bán hàng', trang_thai: 'can_xac_minh', vi_sao: 'Doanh nghiệp luôn dùng hoá đơn điện tử; hộ kinh doanh chỉ bắt buộc khi doanh thu năm trên 01 tỷ đồng.', can_cu: cc('nd254_d6_k1a', 'nd254_d6_k1d'), cau_hoi: CAU_LOAI };
  } else if (hs.loai === 'doanh_nghiep') {
    dung = {
      khoa: 'dung_hddt', ten: 'Dùng hoá đơn điện tử có mã của cơ quan thuế khi bán hàng', trang_thai: 'phai_lam',
      vi_sao: 'Doanh nghiệp dùng hoá đơn điện tử có mã của cơ quan thuế khi bán hàng, cung cấp dịch vụ — không phụ thuộc doanh thu. Một số ngành (điện, xăng dầu, viễn thông, ngân hàng, thương mại điện tử…) đáp ứng điều kiện kỹ thuật thì được dùng loại không có mã.',
      can_cu: cc('nd254_d6_k1a', 'nd254_d6_k1b'),
    };
  } else if (hs.doanhThuNam === null) {
    dung = { khoa: 'dung_hddt', ten: 'Dùng hoá đơn điện tử khi bán hàng', trang_thai: 'can_xac_minh', vi_sao: 'Hộ kinh doanh có doanh thu năm trên 01 tỷ đồng phải dùng hoá đơn điện tử có mã hoặc khởi tạo từ máy tính tiền. MIMI chưa có số liệu doanh thu năm nay.', can_cu: cc('nd254_d6_k1d', 'nd141_d1_k2a'), cau_hoi: 'Kết nối ngân hàng hoặc nhập doanh thu để MIMI biết bạn đã qua 01 tỷ đồng chưa.' };
  } else if (hs.vuotNguongChac === true) {
    dung = { khoa: 'dung_hddt', ten: 'Dùng hoá đơn điện tử có mã, hoặc khởi tạo từ máy tính tiền', trang_thai: 'phai_lam', vi_sao: `Doanh thu năm nay đã trên 01 tỷ đồng (MIMI tính được ${hs.doanhThuNam.toLocaleString('vi-VN')} ₫). Hộ kinh doanh trên ngưỡng này phải dùng một trong hai loại hoá đơn điện tử kết nối với cơ quan thuế.`, can_cu: cc('nd254_d6_k1d', 'nd141_d1_k2a') };
  } else if (hs.vuotNguongChac === false) {
    dung = { khoa: 'dung_hddt', ten: 'Dùng hoá đơn điện tử khi bán hàng', trang_thai: 'khong_ap_dung', vi_sao: `Doanh thu năm nay chưa tới mức trên 01 tỷ đồng (MIMI tính được ${hs.doanhThuNam.toLocaleString('vi-VN')} ₫), nên chưa bắt buộc. Có nhu cầu thì vẫn đăng ký được. Khi doanh thu lũy kế vượt 01 tỷ, mục này chuyển thành "phải làm".`, can_cu: cc('nd254_d6_k1d', 'nd254_d6_k1_cuoi') };
  } else {
    dung = { khoa: 'dung_hddt', ten: 'Dùng hoá đơn điện tử khi bán hàng', trang_thai: 'can_xac_minh', vi_sao: `Doanh thu MIMI ước tính (${hs.doanhThuNam.toLocaleString('vi-VN')} ₫) còn phần tiền vào chưa rõ là doanh thu hay không, nên chưa chắc đã trên 01 tỷ đồng.`, can_cu: cc('nd254_d6_k1d'), cau_hoi: 'Xác nhận các khoản tiền vào chưa rõ ở trang Dòng tiền để MIMI biết chắc doanh thu đã qua 01 tỷ đồng chưa.' };
  }
  ra.push(dung);

  // ── 2. Bán thẳng cho người tiêu dùng: hoá đơn từ máy tính tiền ─────────────────
  const tenBan = 'Bán thẳng cho người tiêu dùng: hoá đơn khởi tạo từ máy tính tiền';
  if (hs.banTrucTiep === null) {
    ra.push({ khoa: 'ban_truc_tiep', ten: tenBan, trang_thai: 'can_xac_minh', vi_sao: 'Người bán hàng, dịch vụ trực tiếp đến người tiêu dùng dùng hoá đơn điện tử từ máy tính tiền, trừ khi đã đăng ký hoá đơn điện tử có mã.', can_cu: cc('nd254_d6_k1c'), cau_hoi: CAU_BAN });
  } else if (hs.banTrucTiep === false) {
    ra.push({ khoa: 'ban_truc_tiep', ten: tenBan, trang_thai: 'khong_ap_dung', vi_sao: 'Bạn cho biết không bán thẳng cho người tiêu dùng, nên không thuộc nhóm dùng hoá đơn từ máy tính tiền. Hoá đơn có mã (nếu phải dùng) vẫn áp dụng như mục trên.', can_cu: cc('nd254_d6_k1c') });
  } else if (dung.trang_thai === 'phai_lam') {
    ra.push({ khoa: 'ban_truc_tiep', ten: tenBan, trang_thai: 'phai_lam', vi_sao: 'Bạn bán thẳng cho người tiêu dùng: dùng hoá đơn điện tử khởi tạo từ máy tính tiền, HOẶC đã đăng ký hoá đơn điện tử có mã thì không bắt buộc đăng ký thêm loại máy tính tiền. Chọn một — không phải làm cả hai.', can_cu: cc('nd254_d6_k1c', 'nd254_d6_k1d') });
  } else {
    // Hộ bán lẻ chưa chắc trên 01 tỷ: điểm c kể cả hộ kinh doanh mà không nêu ngưỡng; NĐ 141/2026 và Cục Thuế
    // nói dưới 01 tỷ là tự nguyện. Hai nguồn chưa khớp → hỏi, không kết luận "bắt buộc".
    ra.push({ khoa: 'ban_truc_tiep', ten: tenBan, trang_thai: 'can_xac_minh', vi_sao: 'Điều 6 khoản 1 điểm c NĐ 254/2026 kể cả hộ kinh doanh bán thẳng cho người tiêu dùng mà không nêu mức doanh thu; trong khi hướng dẫn của Cục Thuế nói hộ dưới 01 tỷ đồng chỉ dùng hoá đơn điện tử khi có nhu cầu. MIMI không tự chọn cách hiểu.', can_cu: cc('nd254_d6_k1c', 'cv5131_ho_duoi_1_ty'), cau_hoi: 'Hỏi cơ quan thuế quản lý trực tiếp: cửa hàng của bạn (doanh thu chưa tới 01 tỷ) có phải dùng hoá đơn từ máy tính tiền không?' });
  }

  // ── 3. Đăng ký sử dụng hoá đơn điện tử ────────────────────────────────────────
  const tenDk = 'Đăng ký sử dụng hoá đơn điện tử — mẫu 01/ĐKTĐ-HĐĐT';
  const ghiChuDk = 'Đã đăng ký rồi thì bỏ qua — MIMI không kết nối cơ quan thuế nên không đọc được trạng thái đăng ký của bạn.';
  if (dung.trang_thai === 'phai_lam') {
    ra.push({
      khoa: 'dang_ky', ten: tenDk, trang_thai: 'phai_lam',
      vi_sao: hs.loai === 'ho_kinh_doanh'
        ? `Phải đăng ký trước khi lập hoá đơn; hộ kinh doanh đăng ký trong 30 ngày kể từ ngày cuối của kỳ tính thuế có doanh thu lũy kế trên 01 tỷ đồng. ${ghiChuDk}`
        : `Phải đăng ký trước khi lập hoá đơn điện tử. ${ghiChuDk}`,
      can_cu: hs.loai === 'ho_kinh_doanh' ? cc('nd141_d1_k2c', 'tt91_mau_01dktd') : cc('tt91_mau_01dktd'),
    });
  } else if (dung.trang_thai === 'can_xac_minh') {
    ra.push({ khoa: 'dang_ky', ten: tenDk, trang_thai: 'can_xac_minh', vi_sao: 'Chỉ phải đăng ký khi thuộc diện dùng hoá đơn điện tử — xem câu hỏi ở mục đầu.', can_cu: cc('tt91_mau_01dktd'), cau_hoi: dung.cau_hoi });
  } else {
    ra.push({ khoa: 'dang_ky', ten: tenDk, trang_thai: 'khong_ap_dung', vi_sao: 'Chưa bắt buộc. Có nhu cầu dùng hoá đơn điện tử thì đăng ký theo cùng mẫu này.', can_cu: cc('nd254_d6_k1_cuoi', 'tt91_mau_01dktd') });
  }

  return ra;
}

/**
 * Các bước đăng ký — HƯỚNG DẪN THỰC HÀNH, không phải câu trích luật. Tổng hợp từ nguồn thứ cấp (chưa đối
 * chiếu văn bản gốc TT 91/2026/TT-BTC); giao diện phải ghi đúng như vậy.
 */
export const CAC_BUOC_DANG_KY: string[] = [
  'Có chữ ký số (chứng thư số) còn hạn của doanh nghiệp, hoặc của chủ hộ kinh doanh.',
  'Chọn tổ chức cung cấp dịch vụ hoá đơn điện tử (xem tiêu chí bên dưới), hoặc làm trực tiếp trên cổng hoadondientu.gdt.gov.vn bằng tài khoản thuế điện tử.',
  'Lập tờ khai 01/ĐKTĐ-HĐĐT: chọn loại hoá đơn (có mã của cơ quan thuế, hoặc khởi tạo từ máy tính tiền), hoá đơn GTGT hay hoá đơn bán hàng; ký số và gửi.',
  'Chờ cơ quan thuế thông báo chấp nhận (qua cổng / thư điện tử). Chỉ lập hoá đơn sau khi được chấp nhận.',
  'Lập thử hoá đơn đầu tiên, tải tệp XML về và kiểm bằng ô "Kiểm tệp hoá đơn XML" trên trang này.',
];

/** Tiêu chí chọn nhà cung cấp — gợi ý của MIMI, không phải quy định. MIMI không giới thiệu nhà cung cấp nào. */
export const TIEU_CHI_NHA_CUNG_CAP: string[] = [
  'Hỗ trợ đúng loại bạn cần: hoá đơn có mã của cơ quan thuế, hoặc hoá đơn từ máy tính tiền (nếu bán lẻ tại quầy).',
  'Xuất được tệp XML theo định dạng chuẩn của cơ quan thuế — để bạn và kế toán kiểm, lưu, gửi cho khách.',
  'Nối được với phần mềm bán hàng / máy tính tiền bạn đang dùng, nếu có.',
  'Lưu trữ và cho khách tra cứu hoá đơn; nói rõ thời gian lưu và cách lấy lại dữ liệu khi đổi nhà cung cấp.',
  'Giá theo gói số hoá đơn hay theo năm, phí khởi tạo, phí chữ ký số — so tổng chi phí một năm.',
];
