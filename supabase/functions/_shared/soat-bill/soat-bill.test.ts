import { describe, expect, it } from 'vitest';
import { cauNoi, docTien } from './cau-noi';
import { chuanHoaBill, chuanSoTien, chuanThoiDiem } from './doc-bill';
import { CUA_SO_CHO_MAC_DINH_MS, phanXu, type BillDoc, type DauVaoPhanXu, type TienVao } from './doi-chieu';
import { sinhMaThamChieu } from '../bank/ma-tham-chieu';

describe('docTien — loa đọc số tiền kiểu nói', () => {
  it.each([
    [150_000, 'một trăm năm mươi nghìn'],
    [2_000_000, 'hai triệu'],
    [1_250_000, 'một triệu hai trăm năm mươi nghìn'],
    [21_000, 'hai mươi mốt nghìn'],
    [15_000, 'mười lăm nghìn'],
    [25_500, 'hai mươi lăm nghìn năm trăm'],
    [105_000, 'một trăm linh năm nghìn'],
    [44_000, 'bốn mươi tư nghìn'],
    [1_050_000, 'một triệu năm mươi nghìn'],
    [3_000_000_000, 'ba tỷ'],
    [10_000, 'mười nghìn'],
    [0, 'không đồng'],
  ])('%d → %s', (n, chu) => expect(docTien(n)).toBe(chu));
});

describe('cauNoi — không kết tội', () => {
  it('không câu nào có chữ "giả"', () => {
    for (const ly of ['khop_ma', 'khop_so_tien', 'thieu_tien', 'du_tien', 'dang_cho', 'sai_tai_khoan', 'chua_thay_tien', 'bill_cu', 'khong_doc_duoc'] as const) {
      expect(cauNoi(ly, { so_tien: 150_000, thuc_te: 50_000 }).toLowerCase()).not.toContain('giả');
    }
  });
  it('dư tiền: nhắc hoàn qua ngân hàng (mánh chuyển dư đòi thối)', () => {
    expect(cauNoi('du_tien', { so_tien: 100_000, thuc_te: 1_000_000 })).toContain('hoàn qua ngân hàng');
  });
  it('thiếu tiền: nói số còn thiếu', () => {
    expect(cauNoi('thieu_tien', { so_tien: 500_000, thuc_te: 50_000 })).toBe('Mới nhận năm mươi nghìn. Còn thiếu bốn trăm năm mươi nghìn.');
  });
});

describe('chuanHoaBill — chịu được mô hình trả bậy', () => {
  it('JSON bọc ```json, số tiền có chấm, giờ không múi', () => {
    const b = chuanHoaBill('```json\n{"la_bill":true,"so_tien":"150.000 VND","tk_nhan_cuoi":"0123 4567 8899","ten_nhan":"NGUYEN VAN A","ngan_hang_gui":"MB","thoi_diem":"2026-11-20 14:32:10","noi_dung":"thanh toan MIMIABCD23","tin_cay":0.92}\n```');
    expect(b.la_bill).toBe(true);
    expect(b.so_tien).toBe(150_000);
    expect(b.tk_nhan_cuoi).toBe('8899');
    expect(b.thoi_diem).toBe('2026-11-20T07:32:10.000Z');
    expect(b.ma_mimi).toBe('MIMIABCD23');
  });
  it('rác → không đọc được, không ném lỗi', () => {
    for (const r of ['', 'xin lỗi tôi không đọc được', '{hỏng', null, '[1,2]']) {
      const b = chuanHoaBill(r as string | null);
      expect(b.la_bill).toBe(false);
      expect(b.so_tien).toBeNull();
    }
  });
  it('kẹp tin_cay về 0..1, sai kiểu → null', () => {
    const b = chuanHoaBill('{"la_bill":"yes","so_tien":-5,"tk_nhan_cuoi":12,"tin_cay":7}');
    expect(b.la_bill).toBe(false);
    expect(b.so_tien).toBeNull();
    expect(b.tk_nhan_cuoi).toBeNull();
    expect(b.tin_cay).toBe(1);
  });
  it('chuanSoTien / chuanThoiDiem', () => {
    expect(chuanSoTien('1.250.000đ')).toBe(1_250_000);
    expect(chuanSoTien('150,000')).toBe(150_000);
    expect(chuanSoTien('150,5')).toBeNull();
    expect(chuanSoTien(12.5)).toBeNull();
    expect(chuanThoiDiem('2026-11-20T14:00:00+07:00')).toBe('2026-11-20T07:00:00.000Z');
    expect(chuanThoiDiem('hôm qua')).toBeNull();
  });
});

// ── phanXu ──────────────────────────────────────────────────────────────────────────────────

const BAY_GIO = new Date('2026-11-20T07:35:00.000Z'); // 14:35 giờ VN
const QUAN = [{ account_number: '0123456788899', bank_name: 'MB' }, { account_number: '1903 1111 2222', bank_name: 'TCB' }];

function bill(o: Partial<BillDoc> = {}): BillDoc {
  return {
    la_bill: true, so_tien: 150_000, tk_nhan_cuoi: '8899', ten_nhan: 'QUAN A', ngan_hang_gui: 'VCB',
    thoi_diem: '2026-11-20T07:32:00.000Z', noi_dung: null, ma_mimi: null, tin_cay: 0.9, ...o,
  };
}
function gd(o: Partial<TienVao> = {}): TienVao {
  return { id: 'g1', amount: 150_000, type: 'income', luc: '2026-11-20T07:32:20.000Z', payment_reference: null, bank_name: 'MB', account_number: '0123456788899', ...o };
}
function vao(o: Partial<DauVaoPhanXu> = {}): DauVaoPhanXu {
  return { bill: bill(), taiKhoanQuan: QUAN, tienVao: [], daDung: new Set(), batDau: BAY_GIO, bayGio: BAY_GIO, ...o };
}

describe('phanXu — N1: ảnh không bao giờ làm đèn xanh', () => {
  it('bill hoàn hảo, KHÔNG có tiền về, mới soát → vàng (chờ), không xanh', () => {
    const k = phanXu(vao());
    expect(k.den).toBe('vang');
    expect(k.ly_do).toBe('dang_cho');
  });
  it('hết cửa sổ chờ mà không có tiền → đỏ', () => {
    const k = phanXu(vao({ bayGio: new Date(BAY_GIO.getTime() + CUA_SO_CHO_MAC_DINH_MS + 1) }));
    expect(k.den).toBe('do');
    expect(k.ly_do).toBe('chua_thay_tien');
    expect(k.cau_noi).toContain('Đừng giao hàng');
  });
  it('sửa giờ trên bill thành tương lai không kéo dài được chờ', () => {
    const k = phanXu(vao({ bill: bill({ thoi_diem: '2026-11-21T07:00:00.000Z' }), bayGio: new Date(BAY_GIO.getTime() + CUA_SO_CHO_MAC_DINH_MS + 1) }));
    expect(k.den).toBe('do');
  });
  it('tiền thật về đúng số → xanh, gắn đúng giao dịch', () => {
    const k = phanXu(vao({ tienVao: [gd()] }));
    expect(k.den).toBe('xanh');
    expect(k.giao_dich_id).toBe('g1');
    expect(k.cau_noi).toMatch(/^Đã nhận một trăm năm mươi nghìn về MB lúc 14 giờ 32\.$/);
  });
  it('bill mờ (không đọc được) → không đọc được, kể cả khi có tiền', () => {
    expect(phanXu(vao({ bill: bill({ tin_cay: 0.3 }), tienVao: [gd()] })).den).toBe('khong_doc_duoc');
    expect(phanXu(vao({ bill: null })).den).toBe('khong_doc_duoc');
    expect(phanXu(vao({ bill: bill({ la_bill: false }) })).den).toBe('khong_doc_duoc');
  });
});

describe('phanXu — các mánh', () => {
  it('bill chuyển cho tài khoản khác → đỏ ngay', () => {
    const k = phanXu(vao({ bill: bill({ tk_nhan_cuoi: '4321' }), tienVao: [gd()] }));
    expect(k.den).toBe('do');
    expect(k.ly_do).toBe('sai_tai_khoan');
  });
  it('R2.6 — một giao dịch thật chỉ làm xanh một lần', () => {
    const k = phanXu(vao({ tienVao: [gd()], daDung: new Set(['g1']), bayGio: new Date(BAY_GIO.getTime() + CUA_SO_CHO_MAC_DINH_MS + 1) }));
    expect(k.den).toBe('do');
  });
  it('khoản CHUYỂN RA cùng số không tính là tiền về', () => {
    const k = phanXu(vao({ tienVao: [gd({ type: 'expense', amount: -150_000 })] }));
    expect(k.den).toBe('vang');
  });
  it('tiền về đúng số nhưng vào tài khoản khác 4 số cuối → không khớp', () => {
    const k = phanXu(vao({ tienVao: [gd({ account_number: '190311112222' })] }));
    expect(k.den).toBe('vang');
  });
  it('tiền về quá xa giờ trên bill → không khớp', () => {
    const k = phanXu(vao({ tienVao: [gd({ luc: '2026-11-20T03:00:00.000Z' })] }));
    expect(k.den).toBe('vang');
  });
  it('bill cũ hơn 2 giờ → đỏ "bill cũ", không đi tìm tiền hôm qua', () => {
    const k = phanXu(vao({ bill: bill({ thoi_diem: '2026-11-19T07:32:00.000Z' }), tienVao: [gd({ luc: '2026-11-19T07:32:20.000Z' })] }));
    expect(k.den).toBe('do');
    expect(k.ly_do).toBe('bill_cu');
  });
  it('chọn giao dịch gần giờ bill nhất khi có hai khoản cùng số', () => {
    const k = phanXu(vao({ tienVao: [gd({ id: 'xa', luc: '2026-11-20T07:55:00.000Z' }), gd({ id: 'gan' })] }));
    expect(k.giao_dich_id).toBe('gan');
  });
});

describe('phanXu — khớp theo mã đơn MIMI', () => {
  const ma = sinhMaThamChieu();
  it('đúng mã đúng số → xanh khop_ma', () => {
    const k = phanXu(vao({ bill: bill({ ma_mimi: ma }), tienVao: [gd({ payment_reference: ma })] }));
    expect(k.den).toBe('xanh');
    expect(k.ly_do).toBe('khop_ma');
  });
  it('đúng mã, nhận thiếu (chuyển thật một ít + bill giả phần còn lại) → lệch thiếu', () => {
    const k = phanXu(vao({ bill: bill({ ma_mimi: ma, so_tien: 500_000 }), tienVao: [gd({ payment_reference: ma, amount: 50_000 })] }));
    expect(k.den).toBe('lech');
    expect(k.ly_do).toBe('thieu_tien');
    expect(k.thuc_te).toBe(50_000);
  });
  it('đúng mã, nhận dư → lệch dư, nhắc hoàn qua ngân hàng', () => {
    const k = phanXu(vao({ bill: bill({ ma_mimi: ma, so_tien: 100_000 }), tienVao: [gd({ payment_reference: ma, amount: 1_000_000 })] }));
    expect(k.ly_do).toBe('du_tien');
    expect(k.cau_noi).toContain('hoàn qua ngân hàng');
  });
});
