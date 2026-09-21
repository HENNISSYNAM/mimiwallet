import { describe, expect, it } from 'vitest';
import { duLieuTrong, khacMa, locTrungNguon, NANG_LUC, nghiTraTrung, type DuLieu } from './tinh-toan';

/** MIMI-P1-005 — chống trùng không được làm mất khoản hợp lệ; đối soát không tự khớp khi mơ hồ. */

const HOM_NAY = '2026-09-16';
const goc = (): DuLieu => duLieuTrong(HOM_NAY, { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý 3/2026' });
const gd = (id: string, amount: number, ngay: string, ten: string, ref: string | null) => ({
  id, amount, type: amount < 0 ? 'expense' : 'income', transaction_date: ngay,
  merchant_name: null, category: null, counter_account_name: ten, payment_reference: ref,
});

describe('nghi trả trùng', () => {
  it('cùng người, cùng số tiền, cách 1 ngày, cùng nội dung → vẫn nghi trùng', () => {
    const d = { ...goc(), giaoDich: [gd('a', -3_000_000, '2026-09-10', 'CONG TY IN', 'TT HD201'), gd('b', -3_000_000, '2026-09-11', 'CONG TY IN', 'TT HD201')] };
    expect(nghiTraTrung(d)).toHaveLength(1);
  });

  it('cùng người, cùng số tiền nhưng ghi hai hoá đơn khác nhau → hai lần trả hợp lệ, không nghi', () => {
    const d = { ...goc(), giaoDich: [gd('a', -3_000_000, '2026-09-10', 'CONG TY IN', 'TT HD201'), gd('b', -3_000_000, '2026-09-11', 'CONG TY IN', 'TT HD202')] };
    expect(nghiTraTrung(d)).toEqual([]);
  });

  it('lương hai nhân viên cùng số tiền cùng ngày → không nghi (khác người nhận)', () => {
    const d = { ...goc(), giaoDich: [gd('a', -8_000_000, '2026-09-05', 'NGUYEN VAN A', 'luong thang 8'), gd('b', -8_000_000, '2026-09-05', 'TRAN THI B', 'luong thang 8')] };
    expect(nghiTraTrung(d)).toEqual([]);
  });

  it('"tháng 8", năm 2026 không bị coi là mã — hai nội dung chỉ khác chữ vẫn nghi trùng', () => {
    expect(khacMa('luong thang 8 nam 2026', 'luong T8 2026')).toBe(false);
  });
});

describe('chống trùng chi phí AI theo nhà cung cấp + ngày + model', () => {
  const r = (id: string, nguon: string, hang_muc: string) => ({ id, nha_cung_cap: 'openai', ngay: '2026-09-10', hang_muc, so_tien_usd: 10, nguon });
  it('API có gpt-4o thì bỏ dòng file gpt-4o cùng ngày', () => {
    expect(locTrungNguon([r('api1', 'api', 'gpt-4o'), r('f1', 'nhap_file', 'gpt-4o')]).map((x) => x.id)).toEqual(['api1']);
  });
  it('API không trả model khác → dòng file của model đó được GIỮ (trước đây bị bỏ)', () => {
    expect(locTrungNguon([r('api1', 'api', 'gpt-4o'), r('f2', 'nhap_file', 'whisper-1')]).map((x) => x.id)).toEqual(['api1', 'f2']);
  });
});

describe('đối soát trong MIMI Assistant', () => {
  it('tiền về ghi số hoá đơn → khớp chắc; tiền về cùng số tiền không rõ của ai → cần xem, không tự gán', () => {
    const d: DuLieu = {
      ...goc(),
      giaoDich: [
        gd('t1', 5_000_000, '2026-09-10', 'CONG TY THINH PHAT', 'TT HD101'),
        gd('t2', 5_000_000, '2026-09-11', 'NGUYEN VAN A', 'chuyen tien'),
      ],
      hoaDonBan: [
        { id: 'h1', invoice_number: 'HD101', client_name: 'Công ty Thịnh Phát', total: 5_000_000, issued_date: '2026-09-01', due_date: '2026-09-30', status: 'pending' },
        { id: 'h2', invoice_number: 'HD102', client_name: 'Công ty An Bình', total: 5_000_000, issued_date: '2026-09-01', due_date: '2026-09-30', status: 'pending' },
      ],
    };
    const kq = NANG_LUC.doi_soat.chay(d);
    const so = kq.the.find((t) => t.loai === 'so_lieu');
    const o = (nhan: string) => (so && so.loai === 'so_lieu' ? so.muc.find((m) => m.nhan === nhan)?.gia_tri : undefined);
    expect(o('Khớp chắc với hoá đơn')).toBe(1);
    expect(o('Cần bạn xem')).toBe(1);
    expect(kq.tom_tat).toContain('1 khoản khớp chắc');
  });
});
