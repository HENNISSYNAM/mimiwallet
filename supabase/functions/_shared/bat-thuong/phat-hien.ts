/**
 * TCCN-01 — cảnh báo giao dịch bất thường và dấu hiệu lừa đảo.
 *
 * ĐÂY LÀ BỘ LUẬT, KHÔNG PHẢI MÔ HÌNH HỌC MÁY. Mỗi cảnh báo nói rõ luật nào bắn và dựa trên
 * những giao dịch nào, để người dùng tự kiểm được — một cảnh báo "AI thấy đáng ngờ" mà không
 * nói vì sao thì người ta hoặc bỏ qua, hoặc hoảng. Không gắn chữ "AI" cho phần này.
 *
 * MIMI KHÔNG CHẶN ĐƯỢC LỆNH CHUYỂN TRONG APP NGÂN HÀNG. Hai chỗ MIMI can thiệp được:
 *   1. Lúc bấm Duyệt một khoản chi trong MIMI (`kiemKhoan`) — dấu hiệu mức cao thì tạm dừng,
 *      bắt người duyệt xác minh lại người nhận rồi mới cho duyệt. Đây là "điểm xác nhận" của
 *      doanh nghiệp, tương đương lúc khách bấm chuyển ở ngân hàng.
 *   2. Sau khi tiền đã đi (`quetSaoKe`) — chỉ nhanh bằng nhịp đồng bộ sao kê, nên không được
 *      gọi là "thời gian thực".
 *
 * Mọi câu cảnh báo nói "dấu hiệu", không nói "lừa đảo": luật chỉ thấy khuôn mẫu, không thấy ý
 * định. Người dùng là người kết luận.
 */

export type MaDauHieu =
  | 'doi_so_tai_khoan'
  | 'nguoi_nhan_moi_so_lon'
  | 'vuot_muc_quen'
  | 'tach_nho'
  | 'noi_dung_lua_dao'
  | 'bi_ep_buoc';

export type MucDo = 'cao' | 'trung_binh';

export interface DauHieu {
  ma: MaDauHieu;
  muc_do: MucDo;
  /** Câu cho người dùng đọc, có số cụ thể. */
  cau: string;
  /** Giao dịch trong quá khứ làm căn cứ cho dấu hiệu (không gồm chính khoản đang xét). */
  can_cu: string[];
}

/** Một khoản tiền ra — từ sao kê, hoặc một khoản chi đang chờ duyệt. `so_tien` luôn dương. */
export interface KhoanRa {
  id: string;
  so_tien: number;
  ngay: string;
  ten_nguoi_nhan: string | null;
  so_tai_khoan: string | null;
  noi_dung: string | null;
}

export interface CanhBao {
  khoan: KhoanRa;
  muc_do: MucDo;
  dau_hieu: DauHieu[];
}

export const NGUONG = {
  /** Khoản tới người nhận mới từ mức này trở lên mới đáng dừng lại hỏi. */
  SO_LON_TOI_THIEU: 20_000_000,
  /** ... và phải lớn gấp ngần này lần trung vị các khoản chi trước đó của công ty. */
  BOI_SO_TRUNG_VI: 3,
  /** Người nhận quen: cần ít nhất ngần này lần trả trước đó mới có "mức quen" để so. */
  SO_LAN_QUEN_TOI_THIEU: 3,
  /** Khoản vượt mức quen: lớn hơn ngần này lần khoản lớn nhất từng trả người đó. */
  BOI_SO_QUEN: 3,
  /** Tách nhỏ: ngần này khoản trở lên tới cùng người nhận trong cùng một ngày. */
  SO_KHOAN_TACH_NHO: 3,
} as const;

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Tên người nhận chuẩn hoá để so: bỏ dấu, bỏ ký tự lạ, gộp khoảng trắng. */
export function chuanTen(ten: string | null): string | null {
  if (!ten) return null;
  const s = boDau(ten).replace(/[^a-z0-9]+/g, ' ').trim();
  return s.length >= 2 ? s : null;
}

export function chuanSoTaiKhoan(stk: string | null): string | null {
  if (!stk) return null;
  const s = stk.replace(/\D/g, '');
  return s.length >= 4 ? s : null;
}

const duoi = (stk: string) => `…${stk.slice(-4)}`;
const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;

function trungVi(ds: number[]): number {
  if (!ds.length) return 0;
  const s = [...ds].sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g] : (s[g - 1] + s[g]) / 2;
}

/**
 * Kịch bản lừa đảo điển hình, viết không dấu. Giả danh công an/viện kiểm sát/toà án, "tài
 * khoản an toàn", phạt hay hoàn thuế trả vào tài khoản cá nhân, phí giải ngân khoản vay.
 * Chỉ bắt cụm từ rõ nghĩa — một chữ "thuế" đơn lẻ xuất hiện trong rất nhiều khoản chi thật.
 */
const KICH_BAN: { mau: RegExp; mo_ta: string }[] = [
  { mau: /\b(cong an|vien kiem sat|toa an|co quan dieu tra|dieu tra vien)\b/, mo_ta: 'nhắc tới công an, viện kiểm sát hoặc toà án' },
  { mau: /\b(phong toa|tam giu|tai khoan an toan|xac minh tai khoan|chung minh nguon tien)\b/, mo_ta: 'đòi phong toả, tạm giữ hoặc "xác minh" tiền qua một tài khoản khác' },
  { mau: /\b(phi giai ngan|phi ho so vay|mo khoa khoan vay|phi bao hiem khoan vay)\b/, mo_ta: 'đòi phí trước khi giải ngân khoản vay' },
  { mau: /\b(cap nhat vneid|kich hoat vneid|dinh danh muc 2)\b/, mo_ta: 'nhắc tới cập nhật hoặc kích hoạt định danh điện tử' },
];

/** Phạt/hoàn thuế thật đi vào Kho bạc Nhà nước, không vào tài khoản cá nhân. */
const THUE_GIA = /\b(nop phat thue|phat thue|hoan thue|truy thu thue)\b/;
const KHO_BAC = /\b(kho bac|kbnn|ngan sach nha nuoc)\b/;

function khopKichBan(k: KhoanRa): string | null {
  const chu = boDau(`${k.noi_dung ?? ''} ${k.ten_nguoi_nhan ?? ''}`);
  for (const kb of KICH_BAN) if (kb.mau.test(chu)) return kb.mo_ta;
  if (THUE_GIA.test(chu) && !KHO_BAC.test(chu)) return 'nhắc tới phạt hoặc hoàn thuế nhưng người nhận không phải Kho bạc Nhà nước';
  return null;
}

export interface TuyChon {
  /** Số tài khoản đã nằm trong danh sách người nhận được phép — chủ doanh nghiệp đã tự xác minh. */
  daTinCay?: ReadonlySet<string>;
}

/**
 * Kiểm một khoản so với lịch sử. `lichSu` chỉ gồm các khoản TRƯỚC khoản này; truyền cả khoản
 * sau vào thì "người nhận mới" sẽ thành người nhận quen.
 */
export function kiemKhoan(k: KhoanRa, lichSu: readonly KhoanRa[], tc: TuyChon = {}): DauHieu[] {
  const ra: DauHieu[] = [];
  const ten = chuanTen(k.ten_nguoi_nhan);
  const stk = chuanSoTaiKhoan(k.so_tai_khoan);
  const tinCay = !!stk && !!tc.daTinCay?.has(stk);

  const cungNguoi = lichSu.filter((h) => {
    const hs = chuanSoTaiKhoan(h.so_tai_khoan);
    if (stk && hs) return hs === stk;
    return !!ten && chuanTen(h.ten_nguoi_nhan) === ten;
  });

  // 1. Cùng tên người nhận, số tài khoản khác — kiểu giả nhà cung cấp báo "đổi tài khoản".
  if (ten && stk && !tinCay) {
    const cungTen = lichSu.filter((h) => chuanTen(h.ten_nguoi_nhan) === ten && chuanSoTaiKhoan(h.so_tai_khoan));
    const tkCu = [...new Set(cungTen.map((h) => chuanSoTaiKhoan(h.so_tai_khoan) as string))];
    if (tkCu.length && !tkCu.includes(stk)) {
      ra.push({
        ma: 'doi_so_tai_khoan',
        muc_do: 'cao',
        cau: `Trước đây bạn trả "${k.ten_nguoi_nhan}" vào tài khoản ${tkCu.map(duoi).join(', ')}; lần này là tài khoản ${duoi(stk)}. Kẻ gian hay giả làm nhà cung cấp rồi báo đổi số tài khoản — gọi lại người nhận qua số điện thoại bạn đã có từ trước, đừng dùng số trong tin nhắn yêu cầu chuyển tiền.`,
        can_cu: cungTen.map((h) => h.id),
      });
    }
  }

  // 2. Người nhận chưa từng trả, số tiền lớn so với cách công ty vẫn chi.
  if (!cungNguoi.length && !tinCay && (ten || stk)) {
    const tv = trungVi(lichSu.map((h) => h.so_tien));
    const nguong = Math.max(NGUONG.SO_LON_TOI_THIEU, NGUONG.BOI_SO_TRUNG_VI * tv);
    if (k.so_tien >= nguong) {
      ra.push({
        ma: 'nguoi_nhan_moi_so_lon',
        muc_do: 'cao',
        cau: `Lần đầu trả cho người nhận này, và ${vnd(k.so_tien)} là khoản lớn${tv > 0 ? ` — gấp ${Math.round(k.so_tien / tv)} lần một khoản chi thường của công ty (${vnd(tv)})` : ''}. Xác minh người nhận trước khi trả.`,
        can_cu: [],
      });
    }
  }

  // 3. Người nhận quen, nhưng số tiền vượt xa mọi lần trước.
  if (cungNguoi.length >= NGUONG.SO_LAN_QUEN_TOI_THIEU) {
    const lonNhat = Math.max(...cungNguoi.map((h) => h.so_tien));
    if (k.so_tien > NGUONG.BOI_SO_QUEN * lonNhat) {
      ra.push({
        ma: 'vuot_muc_quen',
        muc_do: 'trung_binh',
        cau: `${vnd(k.so_tien)} lớn gấp ${Math.round(k.so_tien / lonNhat)} lần khoản lớn nhất bạn từng trả người nhận này (${vnd(lonNhat)}, qua ${cungNguoi.length} lần trả).`,
        can_cu: cungNguoi.map((h) => h.id),
      });
    }
  }

  // 4. Nhiều khoản tới cùng người trong một ngày — hay gặp khi bị ép chuyển dần, hoặc tách nhỏ cho lọt ngưỡng duyệt.
  const cungNgay = cungNguoi.filter((h) => h.ngay.slice(0, 10) === k.ngay.slice(0, 10));
  if (cungNgay.length + 1 >= NGUONG.SO_KHOAN_TACH_NHO) {
    const tong = cungNgay.reduce((s, h) => s + h.so_tien, 0) + k.so_tien;
    ra.push({
      ma: 'tach_nho',
      muc_do: 'trung_binh',
      cau: `${cungNgay.length + 1} khoản tới cùng người nhận trong ngày ${k.ngay.slice(0, 10).split('-').reverse().join('/')}, tổng ${vnd(tong)}. Chuyển dồn dập nhiều lần là dấu hiệu hay gặp khi bị ép chuyển tiền, hoặc khi khoản chi bị tách nhỏ để lọt ngưỡng duyệt.`,
      can_cu: cungNgay.map((h) => h.id),
    });
  }

  // 5. Nội dung chuyển khoản giống kịch bản lừa đảo điển hình.
  const kb = khopKichBan(k);
  if (kb) {
    ra.push({
      ma: 'noi_dung_lua_dao',
      muc_do: 'cao',
      cau: `Nội dung hoặc tên người nhận ${kb}. Cơ quan nhà nước không yêu cầu chuyển tiền vào tài khoản cá nhân để "xác minh" hay nộp phạt — dừng lại và gọi đường dây nóng của ngân hàng.`,
      can_cu: [],
    });
  }

  return ra;
}

/**
 * TCCN-02 — hoàn cảnh của lệnh chuyển, do chính người sắp chuyển khai.
 *
 * Luật trên sao kê không thấy được cuộc gọi đang giục bạn. Nhưng các kịch bản lừa đảo lặp lại
 * rất đều: giục gấp, dặn giữ bí mật, tự xưng công an/thuế/ngân hàng, chỉ liên lạc qua tin
 * nhắn. Người dùng tích vào tình huống của mình; mỗi tình huống là một dấu hiệu mức cao.
 */
export const HOAN_CANH = {
  giuc_gap: 'Người yêu cầu giục chuyển ngay, doạ hậu quả nếu chậm',
  giu_bi_mat: 'Người yêu cầu dặn giữ bí mật, không nói với ai',
  tu_xung_co_quan: 'Người yêu cầu tự xưng công an, cơ quan thuế, toà án hoặc ngân hàng',
  chi_qua_tin_nhan: 'Chỉ nhận yêu cầu qua tin nhắn, email hoặc cuộc gọi — chưa gặp, chưa gọi lại được qua số có từ trước',
  doi_tai_khoan: 'Người nhận vừa báo đổi số tài khoản',
  doi_ma_otp: 'Có người hỏi mã OTP hoặc bảo cài ứng dụng lạ',
} as const;

export type MaHoanCanh = keyof typeof HOAN_CANH;

export function dauHieuHoanCanh(ma: readonly string[]): DauHieu[] {
  // `in` nhìn cả chuỗi prototype: '__proto__', 'toString'… đều lọt. Chỉ nhận khoá của chính bảng.
  const hop = [...new Set(ma)].filter((m): m is MaHoanCanh => Object.prototype.hasOwnProperty.call(HOAN_CANH, m));
  if (!hop.length) return [];
  const otp = hop.includes('doi_ma_otp');
  return [{
    ma: 'bi_ep_buoc',
    muc_do: 'cao',
    cau: `Bạn đang gặp ${hop.length === 1 ? 'một tình huống' : `${hop.length} tình huống`} hay gặp trong lừa đảo: ${hop.map((m) => HOAN_CANH[m].toLowerCase()).join('; ')}. Dừng lại, gọi lại người yêu cầu qua số bạn đã có từ trước${otp ? ', và không đưa mã OTP cho bất kỳ ai — ngân hàng không bao giờ hỏi mã này' : ''}.`,
    can_cu: [],
  }];
}

export const mucDoChung = (ds: readonly DauHieu[]): MucDo | null =>
  ds.length ? (ds.some((d) => d.muc_do === 'cao') ? 'cao' : 'trung_binh') : null;

/**
 * Quét các khoản tiền ra trong `soNgay` gần nhất. Mỗi khoản được so với mọi khoản ĐỨNG TRƯỚC
 * nó (theo ngày, rồi theo thứ tự trong danh sách), kể cả những khoản cũ hơn cửa sổ quét — cửa
 * sổ chỉ quyết định khoản nào được cảnh báo, không cắt bớt lịch sử để so.
 */
export function quetSaoKe(ds: readonly KhoanRa[], homNay: string, soNgay = 30, tc: TuyChon = {}): CanhBao[] {
  const tu = new Date(`${homNay}T00:00:00Z`);
  tu.setUTCDate(tu.getUTCDate() - soNgay);
  const moc = tu.toISOString().slice(0, 10);
  const xep = ds.map((k, i) => ({ k, i })).sort((a, b) => a.k.ngay.localeCompare(b.k.ngay) || a.i - b.i).map((x) => x.k);

  const ra: CanhBao[] = [];
  xep.forEach((k, i) => {
    if (k.ngay.slice(0, 10) < moc) return;
    const dh = kiemKhoan(k, xep.slice(0, i), tc);
    const md = mucDoChung(dh);
    if (md) ra.push({ khoan: k, muc_do: md, dau_hieu: dh });
  });
  // Mức cao trước, rồi mới nhất trước.
  return ra.sort((a, b) => (a.muc_do === b.muc_do ? b.khoan.ngay.localeCompare(a.khoan.ngay) : a.muc_do === 'cao' ? -1 : 1));
}
