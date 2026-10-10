/**
 * Tình huống bắt buộc "khoản vay hoặc chuyển nội bộ bị tính là doanh thu", nối tới luồng điền hộ (10/10/2026).
 *
 * Bộ chạy không tính doanh thu: nó chỉ chép số trong bản nháp ĐÃ LƯU mà máy chủ dựng từ đường đọc doanh thu thật
 * (`dungSoLieuDoanhThu`, có test đối kháng ở `../doanh-thu/adversarial.test.ts`). Test này chạy chính đường đó với
 * một khoản vay và một khoản chuyển nội bộ, đưa con số ra vào bản nháp, rồi kiểm ô [11] bộ chạy sẽ điền.
 */
import { describe, expect, it } from 'vitest';
import { docNguonTienVao, dungSoLieuDoanhThu } from '../doanh-thu/so-lieu';
import { dbGia, type Row } from '../doanh-thu/sinh-ca-doi-khang';
import { layTruongTKN } from './bo-chuyen';

const gd = (id: string, amount: number, ngay: string, them: Row = {}): Row => ({
  id, company_id: 'c1', amount, type: 'income', transaction_date: ngay, account_number: '111',
  counter_account_number: null, counter_account_name: null, merchant_name: null, payment_reference: null, is_synthetic: false, ...them,
});

async function doanhThu(giaoDich: Row[], xacNhan: { transaction_id: string; revenue_effect: string }[]) {
  const db = dbGia({
    transactions: giaoDich,
    revenue_classifications: xacNhan.map((x) => ({ company_id: 'c1', ...x })),
    bank_connections: ['111', '222'].map((a) => ({ company_id: 'c1', account_number: a, revoked_at: null })),
    sao_ke_nhap: [], phan_loai_hoat_dong: [], gdt_invoices: [],
  });
  const nguon = await docNguonTienVao(db, 'c1', 2026, false, ', merchant_name, counter_account_name, payment_reference');
  return dungSoLieuDoanhThu(2026, nguon, []);
}

const banNhap = (tong: number, trangThai: 'san_sang' | 'bi_chan' = 'san_sang') => ({
  mau: '01/TKN-CNKD',
  danh_dau: [{ nhan: 'Hộ ≤ 1 tỷ', chon: tong <= 1_000_000_000 }, { nhan: 'Mới ra kinh doanh', chon: false }],
  dong: [{ ma: '[08a]', o: { tong_dt: tong, thue_gtgt: null, thue_tncn: null } }, { ma: '[11]', o: { tong_dt: tong, thue_gtgt: null, thue_tncn: null } }],
  san_sang: { trang_thai: trangThai },
});
const HO = { mst: '0123456789', ten: 'Hộ thử' };

describe('tiền vay / chuyển nội bộ không đi vào ô doanh thu được điền', () => {
  it('vay 200 triệu đã xác nhận không phải doanh thu + chuyển nội bộ 300 triệu: ô [11] là 850 triệu, không phải 1,35 tỷ', async () => {
    const s = await doanhThu([
      gd('ban', 850_000_000, '2026-06-01'),
      gd('vay', 200_000_000, '2026-06-10'),
      gd('nb', 300_000_000, '2026-06-12', { account_number: '222', counter_account_number: '111', counter_account_name: 'CHU HO' }),
      gd('nb2', 300_000_000, '2026-06-12', { type: 'expense', account_number: '111', counter_account_number: '222' }),
    ], [{ transaction_id: 'ban', revenue_effect: 'include' }, { transaction_id: 'vay', revenue_effect: 'exclude' }]);
    expect(s.uoc_tinh).toBe(850_000_000);
    const r = layTruongTKN(banNhap(s.uoc_tinh), { loai: 'nam', nam: 2026 }, HO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.truong.find((t) => t.khoa === 'dt_11')?.gia_tri).toBe('850000000');
    expect(r.truong.find((t) => t.khoa === 'dd_1')?.gia_tri).toBe('co');
  });

  it('khoản vay CHƯA xác nhận: máy chủ phải hỏi; bản nháp còn vướng mắc thì bộ chạy từ chối điền', async () => {
    const s = await doanhThu([gd('ban', 850_000_000, '2026-06-01'), gd('vay', 200_000_000, '2026-06-10', { merchant_name: 'NHAN TIEN' })],
      [{ transaction_id: 'ban', revenue_effect: 'include' }]);
    expect(s.do_chac_chan.trang_thai).toBe('can_xem');
    expect(layTruongTKN(banNhap(s.uoc_tinh, 'bi_chan'), { loai: 'nam', nam: 2026 }, HO).ok).toBe(false);
  });
});
