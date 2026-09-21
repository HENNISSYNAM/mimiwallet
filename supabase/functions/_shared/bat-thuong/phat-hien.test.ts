import { describe, expect, it } from 'vitest';
import { dauHieuHoanCanh, HOAN_CANH, kiemKhoan, mucDoChung, quetSaoKe, type KhoanRa } from './phat-hien';

let n = 0;
const k = (o: Partial<KhoanRa>): KhoanRa => ({
  id: `k${++n}`,
  so_tien: 1_000_000,
  ngay: '2026-09-01',
  ten_nguoi_nhan: 'Công ty In Minh Khai',
  so_tai_khoan: '0011223344',
  noi_dung: 'Thanh toán hoá đơn',
  ...o,
});

/** Lịch sử bình thường: trả Minh Khai 4 lần, mỗi lần 1–2 triệu, cùng một tài khoản. */
const quen = [
  k({ ngay: '2026-06-05', so_tien: 1_200_000 }),
  k({ ngay: '2026-07-05', so_tien: 1_500_000 }),
  k({ ngay: '2026-08-05', so_tien: 2_000_000 }),
  k({ ngay: '2026-08-20', so_tien: 1_000_000 }),
];

const ma = (ds: { ma: string }[]) => ds.map((d) => d.ma);

describe('kiemKhoan — từng luật', () => {
  it('khoản thường tới người nhận quen: không cảnh báo gì', () => {
    expect(kiemKhoan(k({ ngay: '2026-09-05', so_tien: 1_800_000 }), quen)).toEqual([]);
  });

  it('cùng tên, số tài khoản mới → đổi số tài khoản, mức cao, căn cứ là các lần trả cũ', () => {
    const dh = kiemKhoan(k({ ngay: '2026-09-05', so_tai_khoan: '9988776655' }), quen);
    const d = dh.find((x) => x.ma === 'doi_so_tai_khoan');
    expect(d?.muc_do).toBe('cao');
    expect(d?.cau).toContain('…3344');
    expect(d?.cau).toContain('…6655');
    expect(d?.can_cu).toEqual(quen.map((q) => q.id));
  });

  it('tên viết khác dấu, khác hoa thường vẫn là cùng người nhận', () => {
    const dh = kiemKhoan(k({ ngay: '2026-09-05', ten_nguoi_nhan: 'CONG TY IN MINH KHAI', so_tai_khoan: '9988776655' }), quen);
    expect(ma(dh)).toContain('doi_so_tai_khoan');
  });

  it('số tài khoản mới đã nằm trong danh sách được phép → không báo đổi tài khoản', () => {
    const dh = kiemKhoan(k({ ngay: '2026-09-05', so_tai_khoan: '9988776655' }), quen, { daTinCay: new Set(['9988776655']) });
    expect(dh).toEqual([]);
  });

  it('người nhận mới, 25 triệu → mức cao; người nhận mới 5 triệu → không', () => {
    const lon = kiemKhoan(k({ ten_nguoi_nhan: 'Nguyễn Văn B', so_tai_khoan: '5555666677', so_tien: 25_000_000, ngay: '2026-09-05' }), quen);
    expect(ma(lon)).toEqual(['nguoi_nhan_moi_so_lon']);
    expect(mucDoChung(lon)).toBe('cao');
    const nho = kiemKhoan(k({ ten_nguoi_nhan: 'Nguyễn Văn B', so_tai_khoan: '5555666677', so_tien: 5_000_000, ngay: '2026-09-05' }), quen);
    expect(nho).toEqual([]);
  });

  it('ngưỡng người nhận mới nâng theo cách công ty chi: công ty hay chi 50 triệu thì 25 triệu không lạ', () => {
    const lichSuLon = [50, 60, 55].map((t, i) => k({ ten_nguoi_nhan: `NCC ${i}`, so_tai_khoan: `10000000${i}`, so_tien: t * 1_000_000 }));
    const dh = kiemKhoan(k({ ten_nguoi_nhan: 'NCC mới', so_tai_khoan: '2222333344', so_tien: 25_000_000, ngay: '2026-09-05' }), lichSuLon);
    expect(dh).toEqual([]);
  });

  it('người nhận quen nhưng gấp hơn 3 lần khoản lớn nhất → vượt mức quen, mức trung bình', () => {
    const dh = kiemKhoan(k({ ngay: '2026-09-05', so_tien: 9_000_000 }), quen);
    expect(ma(dh)).toEqual(['vuot_muc_quen']);
    expect(mucDoChung(dh)).toBe('trung_binh');
    expect(dh[0].cau).toContain('gấp 5 lần');
  });

  it('chưa đủ 3 lần trả thì chưa có "mức quen" để so', () => {
    const dh = kiemKhoan(k({ ngay: '2026-09-05', so_tien: 9_000_000 }), quen.slice(0, 2));
    expect(ma(dh)).not.toContain('vuot_muc_quen');
  });

  it('khoản thứ 3 tới cùng người trong một ngày → tách nhỏ', () => {
    const ngay = '2026-09-10';
    const truoc = [...quen, k({ ngay, so_tien: 900_000 }), k({ ngay, so_tien: 900_000 })];
    const dh = kiemKhoan(k({ ngay, so_tien: 900_000 }), truoc);
    expect(ma(dh)).toEqual(['tach_nho']);
    expect(dh[0].cau).toContain('3 khoản');
    // Khoản thứ hai thì chưa.
    expect(kiemKhoan(k({ ngay, so_tien: 900_000 }), [...quen, k({ ngay, so_tien: 900_000 })])).toEqual([]);
  });

  it('nội dung giả danh công an / "tài khoản an toàn" → mức cao, kể cả số tiền nhỏ', () => {
    const dh = kiemKhoan(k({ ngay: '2026-09-05', noi_dung: 'chuyen tien vao tai khoan an toan theo yeu cau cong an' }), quen);
    expect(ma(dh)).toEqual(['noi_dung_lua_dao']);
    expect(dh[0].muc_do).toBe('cao');
  });

  it('nộp phạt thuế vào tài khoản cá nhân → dấu hiệu; vào Kho bạc Nhà nước → không', () => {
    const gia = kiemKhoan(k({ ngay: '2026-09-05', ten_nguoi_nhan: 'Trần Văn C', so_tai_khoan: '7777888899', noi_dung: 'nop phat thue ho kinh doanh', so_tien: 3_000_000 }), quen);
    expect(ma(gia)).toContain('noi_dung_lua_dao');
    const that = kiemKhoan(k({ ngay: '2026-09-05', ten_nguoi_nhan: 'Kho bạc Nhà nước Quận 1', so_tai_khoan: '7777888899', noi_dung: 'nop phat thue', so_tien: 3_000_000 }), quen);
    expect(ma(that)).not.toContain('noi_dung_lua_dao');
  });

  it('chữ "thuế" đơn lẻ trong một khoản chi thường không phải dấu hiệu', () => {
    expect(kiemKhoan(k({ ngay: '2026-09-05', noi_dung: 'Thanh toan hoa don co thue GTGT' }), quen)).toEqual([]);
  });
});

describe('quetSaoKe', () => {
  it('chỉ cảnh báo khoản trong cửa sổ, nhưng vẫn so với lịch sử cũ hơn cửa sổ', () => {
    const cu = k({ ngay: '2026-05-01', ten_nguoi_nhan: 'Nhà cung cấp X', so_tai_khoan: '1231231234', so_tien: 30_000_000 });
    const moi = k({ ngay: '2026-09-10', ten_nguoi_nhan: 'Nhà cung cấp X', so_tai_khoan: '1231231234', so_tien: 30_000_000 });
    // Người nhận đã từng trả từ tháng 5 → tháng 9 không còn là "người nhận mới".
    expect(quetSaoKe([moi, cu], '2026-09-16')).toEqual([]);
    // Khoản tháng 5 là người nhận mới 30 triệu, nhưng nằm ngoài cửa sổ 30 ngày → không cảnh báo.
    expect(quetSaoKe([cu], '2026-09-16')).toEqual([]);
    expect(quetSaoKe([cu], '2026-05-10')).toHaveLength(1);
  });

  it('xếp mức cao trước, mới nhất trước', () => {
    const ds = [
      ...quen,
      k({ ngay: '2026-09-02', so_tien: 9_000_000 }), // vượt mức quen — trung bình
      k({ ngay: '2026-09-03', ten_nguoi_nhan: 'Lạ', so_tai_khoan: '4444555566', so_tien: 40_000_000 }), // mới, lớn — cao
    ];
    const cb = quetSaoKe(ds, '2026-09-16');
    expect(cb.map((c) => c.muc_do)).toEqual(['cao', 'trung_binh']);
  });
});

describe('dauHieuHoanCanh (TCCN-02)', () => {
  it('không tích tình huống nào → không có dấu hiệu', () => {
    expect(dauHieuHoanCanh([])).toEqual([]);
  });

  it('gộp mọi tình huống thành MỘT dấu hiệu mức cao, nêu đủ từng tình huống', () => {
    const ds = dauHieuHoanCanh(['giuc_gap', 'tu_xung_co_quan', 'giuc_gap']);
    expect(ds).toHaveLength(1);
    expect(ds[0].muc_do).toBe('cao');
    expect(ds[0].cau).toContain('2 tình huống');
    expect(ds[0].cau).toContain(HOAN_CANH.giuc_gap.toLowerCase());
    expect(ds[0].cau).toContain(HOAN_CANH.tu_xung_co_quan.toLowerCase());
  });

  it('bị hỏi OTP thì nhắc thẳng: ngân hàng không bao giờ hỏi mã này', () => {
    expect(dauHieuHoanCanh(['doi_ma_otp'])[0].cau).toContain('không đưa mã OTP');
  });

  it('bỏ qua mã lạ do trình duyệt gửi lên', () => {
    expect(dauHieuHoanCanh(['khong_co_that', '__proto__'])).toEqual([]);
  });
});
