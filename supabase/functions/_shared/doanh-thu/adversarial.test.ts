/**
 * Test ĐỐI KHÁNG cho Revenue Truth (30/09/2026): cố làm MIMI nói sai doanh thu, và chứng minh MIMI thà
 * hỏi còn hơn nói sai.
 *
 * Hai lớp:
 *   1. Ca viết tay — mỗi ca là một cách đã (hoặc có thể) làm doanh thu sai, kèm con số cụ thể. Nhiều ca
 *      dưới đây làm logic CŨ nói sai; chú thích ghi rõ số tiền và điều logic cũ đã nói.
 *   2. Hold-out — `sinh-ca-doi-khang.ts` sinh ca có nhãn sự thật. Dải hạt giống PHÁT TRIỂN dùng để sửa
 *      lỗi; dải GIỮ LẠI chỉ chạy để báo cáo, không dùng để chỉnh.
 *
 * `it.fails` = lỗi ĐÃ BIẾT, chưa sửa vì nằm ngoài phạm vi hoặc cần quyết định của chủ / kế toán (xem báo
 * cáo). Khi sửa xong test này sẽ tự đỏ, nhắc gỡ `.fails`.
 */
import { describe, expect, it } from 'vitest';
import {
  docNguonTienVao, dungSoLieuDoanhThu, khoanDoanhThuNganHang, ngayVN, phanTichTienVao, tinhTienVao, type GiaoDichTinh,
} from './so-lieu';
import { sangBig, tinhDoChacChan } from './do-chac-chan';
import { bangCua, chayMimi, danhGia, dbGia, HAT_GIU_LAI, HAT_PHAT_TRIEN, moHinhCu, sinhCa, type Row } from './sinh-ca-doi-khang';
import { chuoiChongTrung, danhSoLan, docDong, nhanCot, type DongSaoKe, type O } from '../sao-ke/doc-sao-ke';

const TY = 1_000_000_000;

const gd = (id: string, amount: number | string, ngay: string, them: Row = {}): Row => ({
  id, company_id: 'c1', amount, type: 'income', transaction_date: ngay, account_number: '111',
  counter_account_number: null, counter_account_name: null, merchant_name: null, payment_reference: null, is_synthetic: false, ...them,
});
const xn = (id: string, e: string) => ({ transaction_id: id, revenue_effect: e });

/** Đường đọc THẬT (qua CSDL giả tối đa 1000 dòng mỗi lần): nội bộ → phân loại → khoảng → câu hỏi. */
async function chay(giaoDich: Row[], xacNhan: { transaction_id: string; revenue_effect: string }[] = [], laDemo = false) {
  const db = dbGia({
    transactions: giaoDich,
    revenue_classifications: xacNhan.map((x) => ({ company_id: 'c1', ...x })),
    bank_connections: ['111', '222'].map((a) => ({ company_id: 'c1', account_number: a, revoked_at: null })),
    sao_ke_nhap: [], phan_loai_hoat_dong: [], gdt_invoices: [],
  });
  const nguon = await docNguonTienVao(db, 'c1', 2026, laDemo, ', merchant_name, counter_account_name, payment_reference');
  return { nguon, s: dungSoLieuDoanhThu(2026, nguon, []) };
}
const cu = (giaoDich: Row[], xacNhan: { transaction_id: string; revenue_effect: string }[] = []) =>
  moHinhCu({ giao_dich: giaoDich, tai_khoan: ['111', '222'], xac_nhan: xacNhan } as never);

describe('hoàn tiền, huỷ giao dịch', () => {
  it('tiền hoàn của nhà cung cấp chưa xác nhận: vẫn tính (máy không tự giảm doanh thu), nhưng KHÔNG bao giờ là "đã xác nhận" và có trong cận dưới', async () => {
    const { s } = await chay([
      gd('a', 500_000_000, '2026-02-01'),
      gd('r', 30_000_000, '2026-03-01', { counter_account_name: 'CTY NCC', merchant_name: 'HOAN TIEN DON HANG' }),
    ], [xn('a', 'include')]);
    expect(s).toMatchObject({ da_xac_nhan: 500_000_000, chua_ro: 30_000_000, uoc_tinh: 530_000_000 });
    expect(s.goi_y_loai_ra).toEqual({ so_tien: 30_000_000, so_khoan: 1 });
    expect(s.do_chac_chan).toMatchObject({ can_duoi: 500_000_000, can_tren: 530_000_000, trang_thai: 'chac', ket_luan_phu_thuoc: false });
  });

  it('tiền VÀO mang số ÂM (-5 triệu): logic cũ cộng thành +5 triệu và báo hộ vượt 1 tỷ; giờ không cộng và nới cận dưới', async () => {
    const rows = [gd('a', 996_000_000, '2026-02-01'), gd('am', -5_000_000, '2026-03-01', { merchant_name: 'HUY GD' })];
    const xnr = [xn('a', 'include')];
    // Logic cũ: trị tuyệt đối → 1.001.000.000 > 1 tỷ → "chịu GTGT, TNCN, khai theo quý".
    expect(cu(rows, xnr).uoc_tinh).toBe(1_001_000_000);
    const { s } = await chay(rows, xnr);
    expect(s.uoc_tinh).toBe(996_000_000);
    expect(s.tien_vao).toBe(996_000_000);
    expect(s).toMatchObject({ am_bat_thuong: 5_000_000, so_am_bat_thuong: 1 });
    expect(s.do_chac_chan).toMatchObject({ can_duoi: 991_000_000, can_tren: 996_000_000 });
    expect(s.do_chac_chan.ket_luan_phu_thuoc).toBe(false);
    expect(s.do_chac_chan.nguong.find((n) => n.ma === 'mien_thue_1_ty')?.phia).toBe('duoi');
  });

  it('số âm đã có người quyết thì không còn là "chưa chắc"', async () => {
    const { s } = await chay([gd('a', 900_000_000, '2026-02-01'), gd('am', -5_000_000, '2026-03-01')], [xn('a', 'include'), xn('am', 'exclude')]);
    expect(s.am_bat_thuong).toBe(0);
    expect(s.do_chac_chan.can_duoi).toBe(900_000_000);
  });

  it('khoản và số âm huỷ chính nó: cận dưới dừng ở 0, không âm', async () => {
    const { s } = await chay([gd('a', 20_000_000, '2026-04-01'), gd('am', -20_000_000, '2026-04-01')]);
    expect(s.uoc_tinh).toBe(20_000_000);
    expect(s.do_chac_chan.can_duoi).toBe(0);
  });

  it('ghi nhận giới hạn: hoàn tiền cho KHÁCH (tiền ra) không trừ doanh thu — số MIMI là tổng thu, chờ kế toán quyết cách trừ', async () => {
    const { s } = await chay([gd('a', 100_000_000, '2026-02-01'), gd('h', 30_000_000, '2026-02-10', { type: 'expense', merchant_name: 'HOAN TIEN KHACH' })], [xn('a', 'include')]);
    expect(s.uoc_tinh).toBe(100_000_000);
  });
});

describe('chuyển giữa tài khoản của chính mình', () => {
  const ban = gd('ban', 400_000_000, '2026-05-01');
  const noiBoVao = gd('nb', 300_000_000, '2026-05-05', { account_number: '222', counter_account_number: '111', counter_account_name: 'CHU HO' });
  const noiBoRa = gd('nb2', 300_000_000, '2026-05-05', { type: 'expense', account_number: '111', counter_account_number: '222' });

  it('có tài khoản đối ứng là của mình: sự thật, loại khỏi doanh thu, KHÔNG là suy đoán', async () => {
    const { s } = await chay([ban, noiBoVao, noiBoRa], [xn('ban', 'include')]);
    expect(s).toMatchObject({ noi_bo: 300_000_000, uoc_tinh: 400_000_000, noi_bo_suy_doan: 0 });
    expect(s.do_chac_chan.can_tren).toBe(400_000_000);
  });

  it('có tài khoản đối ứng: người bấm "tiền bán hàng" cũng không đổi được sự thật ngân hàng', async () => {
    const { s } = await chay([ban, noiBoVao, noiBoRa], [xn('ban', 'include'), xn('nb', 'include')]);
    expect(s.noi_bo).toBe(300_000_000);
    expect(s.uoc_tinh).toBe(400_000_000);
  });

  // Ca kinh điển: 985 triệu bán hàng đã xác nhận + một khoản bán 20 triệu bên tài khoản 222 trùng đúng số
  // tiền với một khoản chi cho nhà cung cấp từ tài khoản 111 cách 2 ngày. Máy ghép hai khoản thành "chuyển
  // nội bộ" và bỏ 20 triệu bán hàng. Sự thật: 1.005 triệu — VƯỢT 1 tỷ.
  const A = gd('A', 985_000_000, '2026-05-01');
  const B = gd('B', 20_000_000, '2026-05-10', { account_number: '222', counter_account_name: 'KHACH LE', merchant_name: 'MUA HANG' });
  const NCC = gd('C', 20_000_000, '2026-05-12', { type: 'expense', account_number: '111', merchant_name: 'THANH TOAN NCC' });

  it('trùng hợp bán hàng ↔ chi: logic cũ nói "985 triệu, độ tin cậy cao, dưới 1 tỷ"; giờ dừng lại và hỏi đúng khoản 20 triệu', async () => {
    const cuKq = cu([A, B, NCC], [xn('A', 'include')]);
    expect(cuKq).toMatchObject({ uoc_tinh: 985_000_000, do_tin_cay: 'cao' });
    const { s } = await chay([A, B, NCC], [xn('A', 'include')]);
    expect(s.uoc_tinh).toBe(985_000_000);
    expect(s).toMatchObject({ noi_bo_suy_doan: 20_000_000, so_noi_bo_suy_doan: 1, can_xem_lai: 1 });
    const dc = s.do_chac_chan;
    expect(dc).toMatchObject({ trang_thai: 'can_xem', ket_luan_phu_thuoc: true, can_duoi: 985_000_000, can_tren: 1_005_000_000 });
    expect(dc.nguong_chua_chac).toEqual(['mien_thue_1_ty']);
    expect(dc.cau_hoi).toMatchObject({ khoa: 'noi_bo:B', loai: 'noi_bo_suy_doan', so_tien: 20_000_000, transaction_ids: ['B'], hanh_dong: 'xac_nhan_tien_vao' });
    expect(dc.cau_hoi?.lua_chon.map((l) => l.ma)).toEqual(['internal_transfer', 'business_revenue', 'unknown']);
  });

  it('người xác nhận "đây là tiền bán hàng" THẮNG suy đoán của máy: cả hai chân được thả, doanh thu 1.005 triệu, chắc chắn trên 1 tỷ', async () => {
    const { s, nguon } = await chay([A, B, NCC], [xn('A', 'include'), xn('B', 'include')]);
    expect(nguon.noi_bo.internalIds.size).toBe(0);
    expect(s).toMatchObject({ uoc_tinh: 1_005_000_000, da_xac_nhan: 1_005_000_000, noi_bo: 0, noi_bo_suy_doan: 0 });
    expect(s.do_chac_chan).toMatchObject({ trang_thai: 'chac', ket_luan_phu_thuoc: false, cau_hoi: null });
    expect(s.do_chac_chan.nguong.find((n) => n.ma === 'mien_thue_1_ty')?.phia).toBe('tren');
  });

  it('người xác nhận đó đúng là chuyển nội bộ: giữ nguyên loại, hết chưa chắc, dưới 1 tỷ chắc chắn', async () => {
    const { s } = await chay([A, B, NCC], [xn('A', 'include'), xn('B', 'exclude')]);
    expect(s).toMatchObject({ uoc_tinh: 985_000_000, noi_bo: 20_000_000, noi_bo_suy_doan: 0 });
    expect(s.do_chac_chan).toMatchObject({ trang_thai: 'chac', ket_luan_phu_thuoc: false });
    expect(s.do_chac_chan.nguong.find((n) => n.ma === 'mien_thue_1_ty')?.phia).toBe('duoi');
  });

  it('"Tôi chưa chắc" (pending) không gỡ được suy đoán: vẫn dừng và hỏi', async () => {
    const { s } = await chay([A, B, NCC], [xn('A', 'include'), xn('B', 'pending')]);
    expect(s.do_chac_chan.ket_luan_phu_thuoc).toBe(true);
  });

  it('cùng số tiền nhưng cách 4 ngày thì máy không ghép: 20 triệu được tính là doanh thu và chưa rõ', async () => {
    const { s } = await chay([A, B, { ...NCC, transaction_date: '2026-05-14' }], [xn('A', 'include')]);
    expect(s).toMatchObject({ noi_bo: 0, uoc_tinh: 1_005_000_000, chua_ro: 20_000_000 });
  });
});

describe('tiền vay, góp vốn, chủ hộ bơm tiền bị đọc thành doanh thu', () => {
  it('khoản vay 200 triệu nội dung mơ hồ, chưa xác nhận: logic cũ nói "vượt 1 tỷ" (độ tin cậy trung bình); giờ không nói, hỏi đúng khoản 200 triệu', async () => {
    const rows = [gd('ban', 850_000_000, '2026-06-01'), gd('vay', 200_000_000, '2026-06-10', { counter_account_name: 'NGUYEN VAN A', merchant_name: 'NHAN TIEN' })];
    const xnr = [xn('ban', 'include')];
    expect(cu(rows, xnr).uoc_tinh).toBe(1_050_000_000);
    const { s } = await chay(rows, xnr);
    const dc = s.do_chac_chan;
    expect(dc).toMatchObject({ trang_thai: 'can_xem', ket_luan_phu_thuoc: true, can_duoi: 850_000_000, can_tren: 1_050_000_000 });
    expect(dc.cau_hoi).toMatchObject({ khoa: 'gd:vay', loai: 'khoan_tien_vao', so_tien: 200_000_000, con_lai: 0 });
    expect(dc.cau_hoi?.cau).toContain('200.000.000đ');
    // Không có gợi ý loại vì nội dung không nói: nút "không phải bán hàng" vẫn mở được ở giao diện.
    expect(dc.cau_hoi?.lua_chon.map((l) => l.ma)).toEqual(['business_revenue', 'internal_transfer', 'unknown']);
  });

  it('khoản vay đã xác nhận không phải doanh thu: dưới 1 tỷ, chắc chắn', async () => {
    const { s } = await chay([gd('ban', 850_000_000, '2026-06-01'), gd('vay', 200_000_000, '2026-06-10')], [xn('ban', 'include'), xn('vay', 'exclude')]);
    expect(s.do_chac_chan).toMatchObject({ trang_thai: 'chac', can_duoi: 850_000_000, can_tren: 850_000_000 });
  });

  it('dòng mang type "loan" (bảng cho phép): gợi ý là tiền vay và được đếm; không tự loại', async () => {
    const rows = [gd('ban', 800_000_000, '2026-05-01'), gd('l', 300_000_000, '2026-05-02', { type: 'loan' })];
    const { s } = await chay(rows, [xn('ban', 'include')]);
    expect(s.goi_y_loai_ra).toEqual({ so_tien: 300_000_000, so_khoan: 1 });
    expect(s.uoc_tinh).toBe(1_100_000_000);
    expect(s.do_chac_chan.cau_hoi).toMatchObject({ khoa: 'gd:l' });
    expect(s.do_chac_chan.cau_hoi?.lua_chon.map((l) => l.ma)).toContain('loan');
  });

  it('không bao giờ tự nâng khoản chưa xác nhận thành "đã xác nhận"', async () => {
    const { s } = await chay([gd('a', 100, '2026-01-01', { merchant_name: 'GOP VON' }), gd('b', 100, '2026-01-02', { counter_account_name: 'CHU HO' })]);
    expect(s.da_xac_nhan).toBe(0);
    expect(s.chua_ro).toBe(200);
  });

  it('nhiều khoản cùng người chuyển, cùng kiểu nội dung: hỏi MỘT câu cho cả nhóm, khoá nhóm ổn định', async () => {
    const shopee = (i: number, t: number) => gd(`s${i}`, t, `2026-0${1 + (i % 3)}-10`, { counter_account_name: 'SHOPEE', merchant_name: `DOI SOAT DON ${1000 + i}` });
    const rows = [gd('ban', 700_000_000, '2026-01-01'), ...[80, 90, 70, 60].map((m, i) => shopee(i, m * 1_000_000))];
    const { s } = await chay(rows, [xn('ban', 'include')]);
    const q = s.do_chac_chan.cau_hoi!;
    expect(q).toMatchObject({ loai: 'nhom_khoan', so_tien: 300_000_000, so_khoan: 4 });
    expect(q.khoa).toMatch(/^nhom:[0-9a-f]{8}$/);
    expect([...q.transaction_ids].sort()).toEqual(['s0', 's1', 's2', 's3']);
    const { s: s2 } = await chay([...rows].reverse(), [xn('ban', 'include')]);
    expect(s2.do_chac_chan.cau_hoi?.khoa).toBe(q.khoa);
  });
});

describe('trùng dòng, sao kê chồng nhau', () => {
  it('cùng một id xuất hiện hai lần (đọc chồng trang, gộp hai nguồn): 600 triệu bị cộng thành 1,2 tỷ trước đây', async () => {
    const dong = gd('x', 600_000_000, '2026-02-01');
    const rows = [dong, { ...dong }];
    expect(cu(rows).uoc_tinh).toBe(1_200_000_000);
    const { s } = await chay(rows);
    expect(s).toMatchObject({ tien_vao: 600_000_000, uoc_tinh: 600_000_000, so_trung_id: 1, so_khoan_vao: 1 });
    expect(s.hoat_dong.ngan_hang.tong).toBe(600_000_000);
    expect(s.tien_vao).toBe(s.noi_bo + s.khong_phai_doanh_thu + s.uoc_tinh);
  });

  const dongSK = (ngay: string, tien: number, nd: string, soDu: number | null = null): DongSaoKe => ({
    transaction_date: ngay, amount: tien, type: 'income', merchant_name: nd, counter_account_name: null, counter_account_number: null, so_tham_chieu: null, so_du: soDu,
  });
  const nhap = (kho: Map<string, DongSaoKe>, ds: DongSaoKe[]) => {
    const lan = danhSoLan(ds, '111');
    ds.forEach((d, i) => { const k = chuoiChongTrung('111', d, lan[i]); if (!kho.has(k)) kho.set(k, d); });
  };

  it('hai sao kê chồng ngày (tháng 3 nằm trong cả hai): nhập cả hai vẫn ra đúng số dòng, hai khoản giống hệt trong ngày vẫn là hai', () => {
    const jan = dongSK('2026-01-10', 100_000, 'BAN HANG', 100_000);
    const feb = dongSK('2026-02-10', 200_000, 'BAN HANG', 300_000);
    const mar = dongSK('2026-03-10', 50_000, 'QR 50K', 350_000);
    const apr = dongSK('2026-04-10', 70_000, 'BAN HANG', 420_000);
    const kho = new Map<string, DongSaoKe>();
    nhap(kho, [jan, feb, mar, mar]);        // hai lần quét QR 50.000đ cùng nội dung, cùng ngày
    nhap(kho, [mar, mar, apr]);             // sao kê thứ hai bắt đầu từ 10/03
    expect(kho.size).toBe(5);
    expect([...kho.values()].reduce((s, d) => s + d.amount, 0)).toBe(100_000 + 200_000 + 50_000 * 2 + 70_000);
  });

  it('sao kê thứ hai cắt giữa ngày (chỉ còn MỘT trong hai khoản giống hệt): vẫn không đếm đôi', () => {
    const mar = dongSK('2026-03-10', 50_000, 'QR 50K', 350_000);
    const kho = new Map<string, DongSaoKe>();
    nhap(kho, [mar, mar]);
    nhap(kho, [mar]);
    expect(kho.size).toBe(2);
  });

  // LỖI ĐÃ BIẾT — không sửa ở đây: `chuoiChongTrung` đưa `so_du` vào khoá. Hai sao kê của CÙNG tài khoản, một
  // bản có cột số dư và một bản không (Excel khác định dạng), cho hai khoá khác nhau → mỗi dòng chồng nhau bị
  // nhập HAI lần và doanh thu bị cộng đôi. Sửa khoá đổi cách khử trùng của luồng nhập sao kê (giao diện, dữ
  // liệu đã nhập) — cần chủ quyết định. Xem báo cáo, mục câu hỏi mở.
  it.fails('sao kê chồng ngày, một bản có cột số dư và một bản không: khoá chống trùng phải nhận ra cùng một dòng', () => {
    const coSoDu = dongSK('2026-03-10', 50_000, 'QR 50K', 350_000);
    const khongSoDu = dongSK('2026-03-10', 50_000, 'QR 50K', null);
    const kho = new Map<string, DongSaoKe>();
    nhap(kho, [coSoDu]);
    nhap(kho, [khongSoDu]);
    expect(kho.size).toBe(1);
  });

  it('cùng số tiền khác ngày là hai khoản bán khác nhau', async () => {
    const { s } = await chay([gd('a', 50_000_000, '2026-02-01', { counter_account_name: 'AN' }), gd('b', 50_000_000, '2026-02-02', { counter_account_name: 'AN' })]);
    expect(s).toMatchObject({ so_khoan_vao: 2, tien_vao: 100_000_000, so_trung_id: 0 });
  });

  it('thanh toán tách hai lần: tổng chính xác, không mất đồng nào', async () => {
    const { s } = await chay([gd('a', 333_333_333, '2026-02-01'), gd('b', 333_333_333, '2026-02-01'), gd('c', 333_333_334, '2026-02-01')],
      [xn('a', 'include'), xn('b', 'include'), xn('c', 'include')]);
    expect(s.uoc_tinh).toBe(TY);
  });
});

describe('làm tròn, đúng bằng ngưỡng, số thập phân', () => {
  const ban = (id: string, tien: number) => gd(id, tien, '2026-06-01');
  const xacNhanTat = (ids: string[]) => ids.map((i) => xn(i, 'include'));

  it('đúng 1.000.000.000 vẫn là "từ 01 tỷ trở xuống": phía DƯỚI, chắc chắn', async () => {
    const { s } = await chay([ban('a', 500_000_000), ban('b', 500_000_000)], xacNhanTat(['a', 'b']));
    expect(s.uoc_tinh).toBe(TY);
    const n = s.do_chac_chan.nguong.find((x) => x.ma === 'mien_thue_1_ty')!;
    expect(n.phia).toBe('duoi');
    expect(s.do_chac_chan.trang_thai).toBe('chac');
  });

  it('1.000.000.001 là trên ngưỡng, chắc chắn', async () => {
    const { s } = await chay([ban('a', 500_000_000), ban('b', 500_000_001)], xacNhanTat(['a', 'b']));
    expect(s.do_chac_chan.nguong.find((x) => x.ma === 'mien_thue_1_ty')?.phia).toBe('tren');
  });

  it('100 khoản 10.000.000,4đ: cộng số thực trôi qua 1 tỷ; giờ mỗi dòng làm tròn tới đồng nên tổng là 1.000.000.000 đúng', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ban(`d${i}`, 10_000_000.4));
    expect(rows.reduce((t, r) => t + (r.amount as number), 0)).toBeGreaterThan(TY); // phép cộng thô của logic cũ
    const { s } = await chay(rows, xacNhanTat(rows.map((r) => r.id)));
    expect(s.uoc_tinh).toBe(TY);
    expect(Number.isInteger(s.uoc_tinh)).toBe(true);
    expect(s.do_chac_chan.nguong.find((x) => x.ma === 'mien_thue_1_ty')?.phia).toBe('duoi');
  });

  it('0,1đ nhân 10 lần không thành 1,0000000000000002', () => {
    const s = tinhTienVao(2026, Array.from({ length: 10 }, (_, i) => ({ id: `x${i}`, amount: 0.1, type: 'income', transaction_date: '2026-01-01' })), [], new Set());
    expect(Number.isInteger(s.tien_vao)).toBe(true);
  });
});

describe('số âm, số hỏng, số khổng lồ', () => {
  it('số tiền không đọc được (NaN, Infinity, chữ): bỏ khỏi mọi tổng và đếm riêng, không lan NaN', () => {
    const s = tinhTienVao(2026, [
      { id: 'a', amount: NaN, type: 'income', transaction_date: '2026-01-01' },
      { id: 'b', amount: Infinity, type: 'income', transaction_date: '2026-01-01' },
      { id: 'c', amount: 'abc', type: 'income', transaction_date: '2026-01-01' },
      { id: 'd', amount: 1000, type: 'income', transaction_date: '2026-01-02' },
    ], [], new Set());
    expect(s).toMatchObject({ so_khong_doc_duoc: 3, tien_vao: 1000, uoc_tinh: 1000, so_khoan_vao: 1 });
    expect(s.uoc_tinh_theo_quy).toEqual([1000, 0, 0, 0]);
  });

  it('2000 khoản 1e13 (tổng 2e16, vượt số nguyên an toàn của JS): không NaN, không Infinity, vẫn chắc chắn trên mọi ngưỡng', async () => {
    const rows = Array.from({ length: 2000 }, (_, i) => gd(`h${i}`, 1e13, '2026-06-01'));
    const { s } = await chay(rows, rows.map((r) => xn(r.id, 'include')));
    expect(Number.isFinite(s.uoc_tinh)).toBe(true);
    expect(s.uoc_tinh).toBeGreaterThan(1e16);
    expect(s.do_chac_chan.nguong.map((n) => n.phia)).toEqual(['tren', 'tren', 'tren']);
    expect(s.do_chac_chan.trang_thai).toBe('chac');
  });

  it('tiền dạng chuỗi số nguyên vượt an toàn được giữ CHÍNH XÁC ở tầng độ chắc chắn (BigInt)', () => {
    const lon = '12345678901234567890123';
    expect(sangBig(lon)).toBe(BigInt(lon));
    const kq = tinhDoChacChan({ gia_tri: lon, co_the_giam: '1000000000000000000000', co_du_lieu: true });
    expect(kq.can_duoi).toBe('11345678901234567890123');
    expect(kq.can_tren).toBe(lon);
    expect(kq.gia_tri).toBe(lon);
  });
});

describe('múi giờ Việt Nam ở ranh giới tháng, quý, năm', () => {
  it('ngayVN: ngày ngân hàng giữ nguyên; mốc có múi giờ đổi sang lịch UTC+7', () => {
    expect(ngayVN('2026-12-31')).toBe('2026-12-31');
    expect(ngayVN('2026-12-31T23:00:00')).toBe('2026-12-31');           // không múi giờ = giờ ngân hàng
    expect(ngayVN('2026-12-31T18:30:00Z')).toBe('2027-01-01');          // 01:30 sáng 01/01 giờ Việt Nam
    expect(ngayVN('2025-12-31T17:00:00Z')).toBe('2026-01-01');
    expect(ngayVN('2026-03-31T16:59:59Z')).toBe('2026-03-31');
    expect(ngayVN('2026-03-31T17:00:00.000Z')).toBe('2026-04-01');
    expect(ngayVN('2026-04-01T00:30:00+07:00')).toBe('2026-04-01');
    expect(ngayVN('2026-04-01T00:30:00+0700')).toBe('2026-04-01');
    expect(ngayVN('2026-03-31T20:00:00-05:00')).toBe('2026-04-01');     // 01:00 UTC 01/04 → 08:00 giờ Việt Nam
    expect(ngayVN('2026-12-31 18:30:00Z')).toBe('2027-01-01');
  });

  it('khoản 18:30 UTC ngày 31/12/2026 là của NĂM 2027, không phải 2026 (trước đây bị đếm vào năm cũ)', () => {
    const d = [{ id: 'a', amount: 700_000_000, type: 'income', transaction_date: '2026-12-31T18:30:00Z' }];
    expect(tinhTienVao(2026, d, [], new Set()).uoc_tinh).toBe(0);
    expect(tinhTienVao(2027, d, [], new Set()).uoc_tinh).toBe(700_000_000);
    expect(khoanDoanhThuNganHang(2026, d, [], new Set())).toEqual([]);
    expect(phanTichTienVao(2026, d as never, [], new Set()).goi_y_loai_ra.so_khoan).toBe(0);
  });

  it('17:00 UTC ngày 31/03 là 00:00 ngày 01/04 giờ Việt Nam: sang QUÝ 2 (sai quý là sai quý bắt đầu khai)', () => {
    const d = [
      { id: 'a', amount: 10, type: 'income', transaction_date: '2026-03-31T16:59:00Z' },
      { id: 'b', amount: 100, type: 'income', transaction_date: '2026-03-31T17:00:00Z' },
    ];
    expect(tinhTienVao(2026, d, [], new Set()).uoc_tinh_theo_quy).toEqual([10, 100, 0, 0]);
  });

  it('quý theo đúng ngày cuối/đầu quý của DATE thường', () => {
    const d = ['2026-03-31', '2026-04-01', '2026-06-30', '2026-07-01', '2026-09-30', '2026-10-01', '2026-12-31'].map((t, i) => ({ id: `q${i}`, amount: 10 ** i, type: 'income', transaction_date: t }));
    expect(tinhTienVao(2026, d, [], new Set()).uoc_tinh_theo_quy).toEqual([1, 10 + 100, 1000 + 10_000, 100_000 + 1_000_000]);
  });

  it('dòng của năm khác (31/12/2025, 01/01/2027) không lọt vào năm 2026', async () => {
    const { s } = await chay([gd('a', 500, '2025-12-31'), gd('b', 700, '2027-01-01'), gd('c', 9, '2026-01-01'), gd('d', 8, '2026-12-31')]);
    expect(s.uoc_tinh).toBe(17);
  });
});

describe('tiền tệ khác', () => {
  // LỖI ĐÃ BIẾT — không sửa: sao kê không có bất kỳ cột "loại tiền" nào trong mô hình cột (`Cot`), nên sao kê
  // USD/EUR đọc như VND (1.250,50 USD → 1.251 "đồng": thiếu ~25.000 lần) và không ai biết. Cột này cần thêm
  // vào `Cot` (kiểu dùng chung với giao diện `NhapSaoKe.tsx`, thuộc phần không được đụng) và một quy tắc
  // "khác VND thì từ chối / hỏi". Xem báo cáo.
  it.fails('sao kê có cột "Loại tiền = USD" không được đọc như tiền đồng', () => {
    const bang: O[][] = [
      ['Ngày giao dịch', 'Số tiền ghi có', 'Loại tiền', 'Nội dung'],
      ['05/08/2026', '1,250.50', 'USD', 'KHACH MY TRA TIEN'],
    ];
    const bd = nhanCot(bang)!;
    const { dong, loi } = docDong(bang, bd);
    expect(dong.length === 0 || loi.length > 0).toBe(true);
  });
});

describe('dòng minh hoạ và tháng thiếu sao kê', () => {
  it('dòng minh hoạ (sandbox) chỉ tính trong công ty demo; không làm "tháng có dữ liệu", không lọt vào khoảng', async () => {
    const rows = [
      gd('a', 100_000_000, '2026-01-10'), gd('b', 100_000_000, '2026-03-10'),
      gd('gia', 900_000_000, '2026-02-10', { is_synthetic: true }),
    ];
    const that = await chay(rows);
    expect(that.s.tien_vao).toBe(200_000_000);
    expect(that.s.thang_co_giao_dich).toEqual(['2026-01', '2026-03']);
    expect(that.s.do_chac_chan.can_tren).toBeLessThan(500_000_000);
    const demo = await chay(rows, [], true);
    expect(demo.s.tien_vao).toBe(1_100_000_000);
  });

  const thang = (m: number, tien: number, id = `m${m}`) => gd(id, tien, `2026-${String(m).padStart(2, '0')}-10`);
  const tatCa = (rows: Row[]) => rows.map((r) => xn(r.id, 'include'));

  it('hai tháng trống giữa các tháng có dữ liệu: nới cận trên theo tháng lớn nhất ĐÃ THẤY; xa ngưỡng nên vẫn được nói nghĩa vụ, nhưng con số thì "cần xem"', async () => {
    const rows = [1, 2, 3, 6, 7, 8].map((m) => thang(m, 100_000_000));
    const { s } = await chay(rows, tatCa(rows));
    expect(s.do_chac_chan).toMatchObject({ can_duoi: 600_000_000, can_tren: 800_000_000, trang_thai: 'can_xem', ket_luan_phu_thuoc: false });
    expect(s.do_chac_chan.cau_hoi?.loai).toBe('thang_thieu');
  });

  it('tháng thiếu làm khoảng cắt 1 tỷ: MIMI không nói dưới 1 tỷ, hỏi đúng tháng thiếu đầu tiên', async () => {
    const rows = [thang(1, 200_000_000), thang(2, 200_000_000), thang(3, 200_000_000), thang(6, 200_000_000), thang(7, 150_000_000)];
    const { s } = await chay(rows, tatCa(rows));
    const dc = s.do_chac_chan;
    expect(dc).toMatchObject({ trang_thai: 'can_xem', ket_luan_phu_thuoc: true, can_duoi: 950_000_000, can_tren: 1_350_000_000 });
    expect(dc.cau_hoi).toMatchObject({ khoa: 'thieu_thang:2026-04', loai: 'thang_thieu', hanh_dong: 'nhap_sao_ke' });
    expect(dc.cau_hoi?.cau).toContain('tháng 04/2026');
  });

  it('các tháng cuối năm chưa tới (năm đang chạy) không phải tháng thiếu', async () => {
    const rows = [thang(1, 100_000_000), thang(2, 100_000_000), thang(3, 100_000_000)];
    const { s } = await chay(rows, tatCa(rows));
    expect(s.do_chac_chan.can_tren).toBe(300_000_000);
  });
});

describe('tính tất định và khoá câu hỏi ổn định', () => {
  it('đảo thứ tự dòng đầu vào: cùng con số, cùng câu hỏi', async () => {
    const ca = sinhCa(HAT_PHAT_TRIEN[7]);
    const a = await chayMimi(ca);
    const b = await chayMimi({ ...ca, giao_dich: [...ca.giao_dich].reverse() });
    expect(b.s.do_chac_chan).toEqual(a.s.do_chac_chan);
    expect(b.s.uoc_tinh).toBe(a.s.uoc_tinh);
  });

  it('thêm một khoản nhỏ hơn không đổi khoá của câu hỏi (giao diện nhớ "đã hỏi")', async () => {
    const rows = [gd('ban', 850_000_000, '2026-06-01'), gd('vay', 200_000_000, '2026-06-10', { counter_account_name: 'X' })];
    const a = await chay(rows, [xn('ban', 'include')]);
    const b = await chay([...rows, gd('nho', 1_000_000, '2026-06-20', { counter_account_name: 'Y' })], [xn('ban', 'include')]);
    expect(b.s.do_chac_chan.cau_hoi?.khoa).toBe(a.s.do_chac_chan.cau_hoi?.khoa);
    expect(b.s.do_chac_chan.cau_hoi?.con_lai).toBe(1);
  });

  it('hai khoản bằng nhau: chọn theo khoá, không theo thứ tự đọc', async () => {
    const r = (id: string) => gd(id, 100_000_000, '2026-02-02', { counter_account_name: `K${id}` });
    const a = await chay([gd('ban', 900_000_000, '2026-02-01'), r('p'), r('q')], [xn('ban', 'include')]);
    const b = await chay([gd('ban', 900_000_000, '2026-02-01'), r('q'), r('p')], [xn('ban', 'include')]);
    expect(a.s.do_chac_chan.cau_hoi?.khoa).toBe('gd:p');
    expect(b.s.do_chac_chan.cau_hoi?.khoa).toBe('gd:p');
  });
});

describe('bất biến trên các ca sinh (phát triển)', () => {
  it('các đẳng thức số học và khoảng chứa ước tính, trên 150 ca', async () => {
    for (const hat of HAT_PHAT_TRIEN.slice(0, 150)) {
      const ca = sinhCa(hat);
      const { s } = await chayMimi(ca);
      const goc = `hạt ${hat}`;
      expect(s.tien_vao, goc).toBe(s.noi_bo + s.khong_phai_doanh_thu + s.uoc_tinh);
      expect(s.uoc_tinh, goc).toBe(s.da_xac_nhan + s.chua_ro);
      expect(s.uoc_tinh_theo_quy.reduce((a, b) => a + b, 0), goc).toBe(s.uoc_tinh);
      expect(s.chua_ro_theo_quy.reduce((a, b) => a + b, 0), goc).toBe(s.chua_ro);
      expect(s.hoat_dong.ngan_hang.tong, goc).toBe(s.uoc_tinh);
      const dc = s.do_chac_chan;
      expect(Number(dc.can_duoi), goc).toBeLessThanOrEqual(s.uoc_tinh);
      expect(Number(dc.can_tren), goc).toBeGreaterThanOrEqual(s.uoc_tinh);
      expect(Number(dc.can_duoi), goc).toBe(s.da_xac_nhan);
      // Cờ "kết luận phụ thuộc" và câu hỏi đi cùng nhau: dừng thì phải có câu hỏi.
      if (dc.ket_luan_phu_thuoc) expect(dc.cau_hoi, goc).not.toBeNull();
      if (dc.trang_thai === 'chac') expect(dc.cau_hoi, goc).toBeNull();
    }
  });

  it('docSoLieuDoanhThu (đường đọc) và dungSoLieuDoanhThu cho cùng kết quả', async () => {
    const { docSoLieuDoanhThu } = await import('./so-lieu');
    const ca = sinhCa(HAT_PHAT_TRIEN[3]);
    const db = dbGia(bangCua(ca));
    const a = await docSoLieuDoanhThu(db, 'c1', 2026);
    const { s } = await chayMimi(ca);
    expect(a).toEqual(s);
  });
});

// ── Hold-out ────────────────────────────────────────────────────────────────────

const pc = (x: number | null) => (x === null ? 'n/a' : `${(x * 100).toFixed(2)}%`);
const inBaoCao = (ten: string, bc: Awaited<ReturnType<typeof danhGia>>) => {
  console.info(`\n[${ten}] ${bc.so_ca} ca
  trạng thái: chắc ${bc.trang_thai.chac} · cần xem ${bc.trang_thai.can_xem} · chưa đủ dữ liệu ${bc.trang_thai.chua_du_du_lieu}
  MIMI dừng để hỏi (kết luận phụ thuộc phần chưa rõ): ${bc.dung_de_hoi}/${bc.so_ca}
  NÓI SAI NGƯỠNG (không dừng mà sai phía): mới ${bc.noi_sai_nguong.moi.length} · cũ ${bc.noi_sai_nguong.cu.length}
  khoảng không chứa sự thật: ${bc.khoang_khong_chua_su_that.length}
  ca ước tính sai phía 1 tỷ: ${bc.ca_uoc_tinh_sai_phia_1_ty.tong} → mới dừng hỏi ${bc.ca_uoc_tinh_sai_phia_1_ty.moi_da_dung_hoi}, cũ báo "không cao" ${bc.ca_uoc_tinh_sai_phia_1_ty.cu_da_canh_bao} (nhưng vẫn nói nghĩa vụ)
  "doanh thu đã xác nhận": chính xác theo tiền ${pc(bc.xac_nhan.chinh_xac_tien)} · theo dòng ${pc(bc.xac_nhan.chinh_xac_dong)} · thu hồi ${pc(bc.xac_nhan.thu_hoi_tien)} (cũ: ${pc(bc.xac_nhan.thu_hoi_tien_cu)}) (${bc.xac_nhan.so_dong} dòng)
  "cần xem" (dòng rủi ro chưa ai xác nhận): thu hồi ${pc(bc.can_xem.thu_hoi)} (${bc.can_xem.dong_rui_ro - bc.can_xem.dong_rui_ro_bi_bo_sot}/${bc.can_xem.dong_rui_ro}) · chính xác ${pc(bc.can_xem.chinh_xac)} (${bc.can_xem.dong_danh_dau} dòng đánh dấu)
  sai số tương đối của ước tính điểm: ${pc(bc.sai_so_uoc_tinh_trung_binh)}`);
};

describe('hold-out: doanh thu MIMI nói ra có đáng đặt tiền thật vào không', () => {
  it('phát triển (300 ca): không nói sai ngưỡng, không sót rủi ro', async () => {
    const bc = await danhGia(HAT_PHAT_TRIEN);
    inBaoCao('PHÁT TRIỂN', bc);
    expect(bc.noi_sai_nguong.moi).toEqual([]);
    expect(bc.khoang_khong_chua_su_that).toEqual([]);
    expect(bc.xac_nhan.chinh_xac_tien).toBe(1);
    expect(bc.can_xem.dong_rui_ro_bi_bo_sot).toBe(0);
  }, 120_000);

  it('GIỮ LẠI (1000 ca, không dùng để chỉnh): độ chính xác của "doanh thu đã xác nhận" ~100%, không sót dòng rủi ro, không nói sai ngưỡng', async () => {
    const bc = await danhGia(HAT_GIU_LAI);
    inBaoCao('GIỮ LẠI', bc);
    // Không khoản nào bị tính là "đã xác nhận doanh thu" mà thật ra không phải (theo tiền và theo dòng).
    expect(bc.xac_nhan.chinh_xac_tien).toBe(1);
    expect(bc.xac_nhan.chinh_xac_dong).toBe(1);
    // Mọi khoản bán hàng người dùng đã xác nhận đều hiện là đã xác nhận (kể cả khoản máy ghép nhầm là nội bộ).
    expect(bc.xac_nhan.thu_hoi_tien).toBe(1);
    // Mọi dòng mà cách MIMI tạm xử lý khác sự thật và chưa ai xác nhận đều được đánh dấu "cần xem".
    expect(bc.can_xem.dong_rui_ro_bi_bo_sot).toBe(0);
    expect(bc.can_xem.thu_hoi).toBe(1);
    // Sự thật luôn nằm trong khoảng MIMI đưa ra; MIMI không bao giờ nói một phía của ngưỡng khi sự thật ở phía kia.
    expect(bc.khoang_khong_chua_su_that).toEqual([]);
    expect(bc.noi_sai_nguong.moi).toEqual([]);
    // Logic cũ (đối chứng): nói sai ở một số ca — nếu số này về 0 thì bộ sinh ca đã hết sức đối kháng.
    expect(bc.noi_sai_nguong.cu.length).toBeGreaterThan(0);
    // Mọi ca mà ước tính điểm ở sai phía 1 tỷ đều bị MIMI dừng lại và hỏi.
    expect(bc.ca_uoc_tinh_sai_phia_1_ty.moi_da_dung_hoi).toBe(bc.ca_uoc_tinh_sai_phia_1_ty.tong);
  }, 300_000);
});
