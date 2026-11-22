import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  chonTaiKhoanNhan, docDanhSachSanPham, docSoTien, docYeuCauBan, duocBanHang, duocSuaSanPham, duocXacNhanTay, kepGioBan,
  khoangNgayVN, khopBanHangPos, maCuaGiaoDich, ngayVN, quyetDinhPhanLoaiPos, tongHopNgay, type BanChoKhop, type KetNoiNhan,
} from './ban-hang';
import { laMaThamChieu, sinhMaThamChieu } from '../bank/ma-tham-chieu';
import { VAI_TRO } from '../quyen/vai-tro';

const CID = '0b4f3c2a-1d2e-4f5a-8b9c-0d1e2f3a4b5c';

describe('quyền POS', () => {
  it('người xem không thu tiền; bốn vai còn lại thu được', () => {
    expect(VAI_TRO.filter(duocBanHang)).toEqual(['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan']);
    expect(duocBanHang('nguoi_xem')).toBe(false);
    expect(duocBanHang(null)).toBe(false);
    expect(duocBanHang('admin' as never)).toBe(false);
  });
  it('xác nhận tay và sửa món: chỉ chủ và quản trị', () => {
    expect(VAI_TRO.filter(duocXacNhanTay)).toEqual(['chu_so_huu', 'quan_tri']);
    expect(VAI_TRO.filter(duocSuaSanPham)).toEqual(['chu_so_huu', 'quan_tri']);
    expect(duocXacNhanTay('ke_toan')).toBe(false);
  });
});

describe('đọc yêu cầu bán', () => {
  const bay = new Date('2026-11-10T05:00:00Z');
  it('nhận số tiền nguyên dương, cả dạng chuỗi', () => {
    expect(docSoTien(150000)).toBe(150000);
    expect(docSoTien('150000')).toBe(150000);
    for (const x of [0, -5, 1.5, '1e5', 'abc', 10_000_000_001, null, undefined]) expect(docSoTien(x), String(x)).toBeNull();
  });
  it('yêu cầu hợp lệ', () => {
    const r = docYeuCauBan({ client_id: CID.toUpperCase(), so_tien: 35000, phuong_thuc: 'cash', ghi_chu: ' cà phê ' }, bay);
    expect(r).toEqual({ ok: true, yc: { client_id: CID, so_tien: 35000, phuong_thuc: 'cash', ghi_chu: 'cà phê', dong_hang: [], ban_luc: bay.toISOString() } });
  });
  it('từ chối thiếu client_id, sai phương thức, tổng món lệch số tiền', () => {
    expect(docYeuCauBan({ so_tien: 1000, phuong_thuc: 'cash' }).ok).toBe(false);
    expect(docYeuCauBan({ client_id: CID, so_tien: 1000, phuong_thuc: 'the' }).ok).toBe(false);
    expect(docYeuCauBan({ client_id: CID, so_tien: 50000, phuong_thuc: 'cash', dong_hang: [{ ten: 'Phở', so_luong: 1, don_gia: 45000 }] }).ok).toBe(false);
    expect(docYeuCauBan({ client_id: CID, so_tien: 90000, phuong_thuc: 'transfer', dong_hang: [{ ten: 'Phở', so_luong: 2, don_gia: 45000 }] }).ok).toBe(true);
  });
  it('giờ bán ngoại tuyến: giữ nếu trong 7 ngày qua, kẹp về giờ máy chủ nếu ở tương lai hoặc quá cũ', () => {
    expect(kepGioBan('2026-11-09T05:00:00Z', bay)).toBe('2026-11-09T05:00:00.000Z');
    expect(kepGioBan('2026-11-11T05:00:00Z', bay)).toBe(bay.toISOString());
    expect(kepGioBan('2026-10-01T05:00:00Z', bay)).toBe(bay.toISOString());
    expect(kepGioBan('rác', bay)).toBe(bay.toISOString());
  });
  it('danh sách món: tối đa 24, không trùng tên, giá dương', () => {
    expect(docDanhSachSanPham([{ ten: 'Trà đá', gia: 5000 }]).ok).toBe(true);
    expect(docDanhSachSanPham([{ ten: 'A', gia: 1 }, { ten: 'a', gia: 2 }]).ok).toBe(false);
    expect(docDanhSachSanPham([{ ten: 'A', gia: 0 }]).ok).toBe(false);
    expect(docDanhSachSanPham(Array.from({ length: 25 }, (_, i) => ({ ten: `M${i}`, gia: 1000 }))).ok).toBe(false);
  });
});

describe('ngày Việt Nam', () => {
  it('23:30 giờ VN vẫn là hôm đó, dù UTC đã sang ngày khác hay chưa', () => {
    expect(ngayVN('2026-11-10T16:30:00Z')).toBe('2026-11-10');
    expect(ngayVN('2026-11-10T17:00:00Z')).toBe('2026-11-11');
    expect(khoangNgayVN('2026-11-10')).toEqual({ tu: '2026-11-09T17:00:00.000Z', den: '2026-11-10T17:00:00.000Z' });
  });
});

describe('mã tham chiếu', () => {
  // 1.000 chứ không 10.000: mã có 30^6 ≈ 729 triệu khả năng; 10.000 mã ngẫu nhiên trùng nhau ~6,6% số lần chạy
  // (bài toán ngày sinh) → test chập chờn. 1.000 mã: ~0,07%. Máy chủ vẫn bắt trùng bằng ràng buộc UNIQUE + sinh lại.
  it('1.000 mã liên tiếp không trùng và đều đọc lại được', () => {
    const ds = Array.from({ length: 1_000 }, sinhMaThamChieu);
    expect(new Set(ds).size).toBe(ds.length);
    for (const m of ds.slice(0, 200)) expect(laMaThamChieu(m)).toBe(true);
  });
  it('khớp đúng định dạng CHECK trong migration', () => {
    const sql = readFileSync(join(__dirname, '../../../migrations/20261110110000_ban_hang_pos.sql'), 'utf8');
    const re = new RegExp(/reference ~ '([^']+)'/.exec(sql)![1]);
    for (let i = 0; i < 100; i++) expect(re.test(sinhMaThamChieu())).toBe(true);
  });
  it('đọc mã từ trường mã hoặc từ nội dung ngân hàng chèn thêm chữ', () => {
    expect(maCuaGiaoDich({ id: 'x', amount: 1, type: 'income', payment_reference: 'MIMIK7P2QX' })).toBe('MIMIK7P2QX');
    expect(maCuaGiaoDich({ id: 'x', amount: 1, type: 'income', payment_reference: null, merchant_name: 'NGUYEN VAN A chuyen tien mimik7p2qx-Ma GD 0123' })).toBe('MIMIK7P2QX');
    expect(maCuaGiaoDich({ id: 'x', amount: 1, type: 'income', payment_reference: null, merchant_name: 'chuyen tien' })).toBeNull();
  });
});

describe('khớp tiền về với lần bán', () => {
  const ban = (o: Partial<BanChoKhop> = {}): BanChoKhop => ({ id: 'b1', reference: 'MIMIK7P2QX', amount: 150_000, status: 'pending', method: 'transfer', matched_transaction_id: null, ...o });

  it('đúng mã + đúng số tiền → khớp', () => {
    const kq = khopBanHangPos([ban()], [{ id: 't1', amount: 150_000, type: 'income', payment_reference: 'MIMIK7P2QX' }]);
    expect(kq.khop).toEqual([{ banId: 'b1', giaoDichId: 't1', soTien: 150_000, daXacNhanTay: false }]);
    expect(kq.lech).toEqual([]);
  });

  it('sai số tiền → KHÔNG khớp, ghi lệch để chủ quyết', () => {
    const kq = khopBanHangPos([ban()], [{ id: 't1', amount: 15_000, type: 'income', payment_reference: 'MIMIK7P2QX' }]);
    expect(kq.khop).toEqual([]);
    expect(kq.lech).toEqual([{ banId: 'b1', giaoDichId: 't1', mongDoi: 150_000, thucTe: 15_000 }]);
  });

  it('sai mã, hoặc tiền RA mang đúng mã → không khớp', () => {
    expect(khopBanHangPos([ban()], [{ id: 't1', amount: 150_000, type: 'income', payment_reference: 'MIMIAAAAAA' }]).khop).toEqual([]);
    expect(khopBanHangPos([ban()], [{ id: 't1', amount: 150_000, type: 'expense', payment_reference: 'MIMIK7P2QX' }]).khop).toEqual([]);
  });

  it('webhook gửi lại cùng giao dịch: giao dịch đã gắn không khớp lần hai; lần bán đã gắn không xét lại', () => {
    const gd = [{ id: 't1', amount: 150_000, type: 'income', payment_reference: 'MIMIK7P2QX' }];
    expect(khopBanHangPos([ban()], gd, new Set(['t1'])).khop).toEqual([]);
    expect(khopBanHangPos([ban({ status: 'paid', matched_transaction_id: 't1' })], gd).khop).toEqual([]);
    // Cùng một lô có giao dịch trùng lặp: chỉ một lần bán nhận.
    const kq = khopBanHangPos([ban(), ban({ id: 'b2' })], [...gd, ...gd]);
    expect(kq.khop.map((k) => k.banId)).toEqual(['b1']);
  });

  it('tiền mặt và lần đã huỷ không bao giờ là ứng viên', () => {
    const gd = [{ id: 't1', amount: 150_000, type: 'income', payment_reference: 'MIMIK7P2QX' }];
    expect(khopBanHangPos([ban({ method: 'cash', status: 'paid' })], gd).khop).toEqual([]);
    expect(khopBanHangPos([ban({ status: 'cancelled' })], gd).khop).toEqual([]);
  });

  it('chủ đã bấm tay "Đã nhận tiền", tiền về sau → vẫn gắn, đánh dấu để gỡ dòng sổ tạm', () => {
    const kq = khopBanHangPos([ban({ status: 'paid' })], [{ id: 't1', amount: 150_000, type: 'income', payment_reference: null, merchant_name: 'MIMIK7P2QX' }]);
    expect(kq.khop[0]).toMatchObject({ banId: 'b1', daXacNhanTay: true });
  });
});

describe('phân loại doanh thu POS', () => {
  const MAY = '00000000-0000-0000-0000-000000000000';
  it('chưa có → ghi mới; máy đoán khác → ghi đè; người đã quyết → giữ', () => {
    expect(quyetDinhPhanLoaiPos(null, MAY)).toBe('ghi_moi');
    expect(quyetDinhPhanLoaiPos({ confirmed_by: MAY, confirmed_type: 'unknown' }, MAY)).toBe('ghi_de');
    expect(quyetDinhPhanLoaiPos({ confirmed_by: MAY, confirmed_type: 'loan' }, MAY)).toBe('ghi_de');
    expect(quyetDinhPhanLoaiPos({ confirmed_by: MAY, confirmed_type: 'business_revenue' }, MAY)).toBe('giu_nguyen');
    expect(quyetDinhPhanLoaiPos({ confirmed_by: 'u-1', confirmed_type: 'personal' }, MAY)).toBe('giu_nguyen');
  });
});

describe('tổng hợp trong ngày', () => {
  it('chỉ cộng lần đã thu, tách tiền mặt/chuyển khoản, đếm lần đang chờ', () => {
    expect(tongHopNgay([
      { amount: 30_000, method: 'cash', status: 'paid' },
      { amount: 120_000, method: 'transfer', status: 'paid' },
      { amount: 50_000, method: 'transfer', status: 'pending' },
      { amount: 99_000, method: 'transfer', status: 'cancelled' },
    ])).toEqual({ so_lan: 2, tong: 150_000, tien_mat: { so_lan: 1, tong: 30_000 }, chuyen_khoan: { so_lan: 1, tong: 120_000 }, dang_cho: 1 });
  });
});

describe('migration POS: RLS và quyền ghi', () => {
  const sql = readFileSync(join(__dirname, '../../../migrations/20261110110000_ban_hang_pos.sql'), 'utf8').replace(/--.*$/gm, '');
  it('bật RLS, chỉ có policy ĐỌC theo thành viên; nhân viên cơ sở chỉ thấy cơ sở mình', () => {
    expect(sql).toMatch(/ALTER TABLE public\.ban_hang_pos ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE public\.pos_san_pham ENABLE ROW LEVEL SECURITY/);
    const policy = [...sql.matchAll(/CREATE POLICY[\s\S]*?;/g)].map((m) => m[0]);
    expect(policy).toHaveLength(2);
    for (const p of policy) {
      expect(p).toMatch(/FOR SELECT TO authenticated/);
      expect(p).toMatch(/public\.la_thanh_vien\(company_id\)/);
    }
    expect(policy[0]).toMatch(/co_so_gioi_han\(company_id\) IS NULL OR co_so_id = public\.co_so_gioi_han\(company_id\)/);
  });
  it('trình duyệt không ghi được: gỡ INSERT/UPDATE/DELETE của anon và authenticated', () => {
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.ban_hang_pos, public\.pos_san_pham FROM anon, authenticated/);
  });
  it('không tạo hàm SECURITY DEFINER mới (không có cửa vòng RLS)', () => {
    expect(sql).not.toMatch(/SECURITY DEFINER/);
  });
  it('mã duy nhất theo công ty; client_id duy nhất (đồng bộ ngoại tuyến idempotent); một giao dịch một lần bán', () => {
    expect(sql).toMatch(/UNIQUE \(company_id, reference\)/);
    expect(sql).toMatch(/UNIQUE \(company_id, client_id\)/);
    expect(sql).toMatch(/UNIQUE INDEX[^;]*\(matched_transaction_id\)/);
  });
});

describe('chọn tài khoản nhận', () => {
  const k = (o: Partial<KetNoiNhan>): KetNoiNhan => ({ id: 'k', account_number: '2431122002', account_name: 'A', bank_name: 'MB Bank', bank_code: '970422', scopes: 'transaction', status: 'connected', revoked_at: null, ...o });
  it('ưu tiên tài khoản đọc được sao kê (tự khớp); chỉ QR thì không tự khớp; đã ngắt thì bỏ', () => {
    expect(chonTaiKhoanNhan([k({ id: 'q', scopes: 'qrpay' }), k({ id: 't' })], null)).toMatchObject({ tk: { id: 't' }, tu_dong_khop: true });
    expect(chonTaiKhoanNhan([k({ id: 'q', scopes: 'qrpay' })], null)).toMatchObject({ tk: { id: 'q' }, tu_dong_khop: false });
    expect(chonTaiKhoanNhan([k({ status: 'disconnected' }), k({ revoked_at: '2026-01-01' }), k({ account_number: 'grant:abc' })], null)).toBeNull();
  });
  it('nhân viên một cơ sở: chỉ tài khoản đã gán cho cơ sở đó', () => {
    expect(chonTaiKhoanNhan([k({ id: 'a', account_number: '111111' }), k({ id: 'b', account_number: '222222' })], ['222222'])).toMatchObject({ tk: { id: 'b' } });
    expect(chonTaiKhoanNhan([k({ account_number: '111111' })], [])).toBeNull();
  });
});
