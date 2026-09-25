/**
 * Prompt 3 mục 4 (25/09/2026): câu hỏi về HẠN CỦA CHÍNH CÔNG TY không được rơi vào tra cứu Công báo,
 * và "Nêu N việc ưu tiên" phải trả đúng N việc (hoặc nói thật là có ít hơn).
 * Mọi con số dưới đây là đầu vào của test, không đi vào sản phẩm.
 */
import { describe, expect, it } from 'vitest';
import { nhanYDinh } from './y-dinh';
import { chuanBiHanThue, duLieuTrong, soViecDuocHoi, viecUuTien, type DuLieu } from './tinh-toan';
import type { MocThue } from '../luat/lich-thue';

const HOM_NAY = '2026-09-25';
const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong(HOM_NAY, KY), ...p });
const moc = (o: Partial<MocThue>): MocThue => ({
  khoa: 'm', ten: 'Tạm nộp thuế TNDN quý 3/2026', loai: 'tam_nop', trang_thai: 'phai_lam',
  han: '2026-10-30', con_lai: 35, vi_sao: 'Doanh nghiệp tạm nộp thuế TNDN theo quý.', can_cu: [], ...o,
});

describe('nhận ý định: hạn thuế của công ty', () => {
  it.each([
    'Kỳ thuế tiếp theo là khi nào?',
    'Tôi cần chuẩn bị gì trước hạn thuế tiếp theo?',
    'Tôi cần chuẩn bị gì trước hạn thuế?',
  ])('"%s" → chuẩn bị hạn thuế, không phải tra cứu luật', (cau) => {
    const y = nhanYDinh(cau);
    expect(y[0]).toBe('chuan_bi_han_thue');
    expect(y).not.toContain('tra_cuu_luat');
  });

  it('"Nêu 3 việc ưu tiên cần làm tuần này." → việc ưu tiên (trước đây: chưa hiểu)', () => {
    expect(nhanYDinh('Nêu 3 việc ưu tiên cần làm tuần này.')).toEqual(['viec_uu_tien']);
  });

  it('"Khoản chi nào chưa có chứng từ?" vẫn là thiếu chứng từ', () => {
    expect(nhanYDinh('Khoản chi nào chưa có chứng từ?')).toEqual(['thieu_chung_tu']);
  });
});

describe('số việc được hỏi', () => {
  it.each([
    ['Nêu 3 việc ưu tiên cần làm tuần này.', 3],
    ['Cho tôi năm việc cần làm', 5],
    ['Việc gì cần làm trước?', 3],
    ['Liệt kê 40 việc', 10],
  ])('%s → %i', (cau, n) => expect(soViecDuocHoi(cau as string)).toBe(n));
});

describe('chuẩn bị hạn thuế', () => {
  it('nói đúng mốc kế tiếp của công ty, kèm việc chuẩn bị suy từ dữ liệu', () => {
    const r = chuanBiHanThue(moi({
      lichThue: { lich: [moc({})], loaiNguoiNop: 'doanh_nghiep', soChuaRo: 2, tienChuaRo: 5_000_000 },
    }));
    expect(r.tom_tat).toContain('Tạm nộp thuế TNDN quý 3/2026');
    expect(r.tom_tat).toContain('30/10/2026');
    expect(r.tom_tat).toContain('còn 35 ngày');
    const ghiChu = r.the.filter((t) => t.loai === 'ghi_chu').map((t) => (t as { cau: string }).cau).join(' ');
    expect(ghiChu).toContain('Xác nhận 2 khoản tiền vào');
    expect(ghiChu).toContain('MIMI không tự nộp');
  });

  it('không bao giờ in ngày giả: mốc thiếu hạn hiện "Chưa xác định", không 01/01/1900', () => {
    const r = chuanBiHanThue(moi({
      lichThue: { lich: [moc({ trang_thai: 'can_xac_minh', han: null, con_lai: null, cau_hoi: 'Công ty đang khai thuế GTGT theo tháng hay theo quý?' })], loaiNguoiNop: 'doanh_nghiep', soChuaRo: 0, tienChuaRo: 0 },
    }));
    expect(JSON.stringify(r)).not.toContain('1900');
    expect(r.tom_tat).toContain('chưa thấy việc thuế nào có hạn chắc chắn');
    expect(JSON.stringify(r.the)).toContain('Công ty đang khai thuế GTGT theo tháng hay theo quý?');
  });

  it('không áp dụng thì không hiện như việc phải làm', () => {
    const r = chuanBiHanThue(moi({
      lichThue: { lich: [moc({ trang_thai: 'khong_ap_dung', ten: 'Quyết toán TNCN' })], loaiNguoiNop: 'doanh_nghiep', soChuaRo: 0, tienChuaRo: 0 },
    }));
    expect(JSON.stringify(r)).not.toContain('Quyết toán TNCN');
  });

  it('đọc lịch lỗi: nói thật, không trả lời bằng luật chung', () => {
    expect(chuanBiHanThue(moi({ lichThue: null })).tom_tat).toContain('Chưa đọc được lịch thuế');
  });
});

describe('việc ưu tiên', () => {
  const lich = [moc({ khoa: 'a', ten: 'Nộp tờ khai GTGT tháng 8/2026', han: '2026-09-30', con_lai: 5 }), moc({ khoa: 'b', con_lai: 35 })];

  it('trả ĐÚNG 3 việc khi có đủ, hạn gần nhất trước', () => {
    const d = moi({
      cauHoi: 'Nêu 3 việc ưu tiên cần làm tuần này.',
      lichThue: { lich, loaiNguoiNop: 'doanh_nghiep', soChuaRo: 4, tienChuaRo: 12_000_000 },
      yeuCau: [{ id: 'y1', trang_thai: 'cho_duyet', so_tien: 1_000_000 } as DuLieu['yeuCau'][number]],
      ketNoiNganHang: [{ status: 'needs_relink', bank_name: 'MB' } as DuLieu['ketNoiNganHang'][number]],
    });
    const r = viecUuTien(d);
    const bang = r.the.find((t) => t.loai === 'bang') as { dong: unknown[][] };
    expect(bang.dong).toHaveLength(3);
    expect(String(bang.dong[0][0])).toContain('Nộp tờ khai GTGT tháng 8/2026');
    expect(r.tom_tat).toBe('3 việc ưu tiên, xếp theo hạn và mức cần xử lý:');
    // Hạn còn 35 ngày không phải việc tuần này.
    expect(JSON.stringify(bang)).not.toContain('Tạm nộp thuế TNDN');
  });

  it('có ít hơn N việc thì nói thật, không thêm cho đủ', () => {
    const r = viecUuTien(moi({ cauHoi: 'Nêu 3 việc ưu tiên', lichThue: { lich, loaiNguoiNop: 'doanh_nghiep', soChuaRo: 0, tienChuaRo: 0 } }));
    const bang = r.the.find((t) => t.loai === 'bang') as { dong: unknown[][] };
    expect(bang.dong.length).toBeLessThan(3);
    expect(r.tom_tat).toContain('không thêm việc cho đủ 3');
  });

  it('hạn đã qua không bị gọi là quá hạn — MIMI không biết đã nộp chưa', () => {
    const r = viecUuTien(moi({ cauHoi: 'Nêu 2 việc', lichThue: { lich: [moc({ con_lai: -20, han: '2026-09-05' })], loaiNguoiNop: 'doanh_nghiep', soChuaRo: 0, tienChuaRo: 0 } }));
    expect(JSON.stringify(r)).not.toContain('qua hạn');
  });
});
