import { describe, expect, it } from 'vitest';
import { duAnDaGan, laKy, tinhTheoQuyTrinh, type QuyTrinh } from './quy-trinh';

const QT: QuyTrinh[] = [
  { id: 'q1', ten: 'Chatbot chăm sóc khách', don_vi_ket_qua: 'cuộc trò chuyện giải quyết xong', khop_du_an: ['proj-chatbot'] },
  { id: 'q2', ten: 'Đọc hoá đơn', don_vi_ket_qua: 'hoá đơn đọc đúng', khop_du_an: ['proj-ocr', 'ws-ocr'] },
];
const CHI = [
  { ngay: '2026-09-02', du_an: 'proj-chatbot', so_tien_usd: 30 },
  { ngay: '2026-09-10', du_an: 'proj-chatbot', so_tien_usd: 10 },
  { ngay: '2026-09-05', du_an: 'proj-ocr', so_tien_usd: 6 },
  { ngay: '2026-09-06', du_an: 'ws-ocr', so_tien_usd: 4 },
  { ngay: '2026-09-07', du_an: 'Dự án mặc định', so_tien_usd: 5 },
  { ngay: '2026-08-30', du_an: 'proj-chatbot', so_tien_usd: 99 }, // tháng khác
];

describe('chi phí theo quy trình (P1-006)', () => {
  const b = tinhTheoQuyTrinh(CHI, QT, [
    { quy_trinh_id: 'q1', ky: '2026-09', so_thanh_cong: 800, so_that_bai: 200 },
  ], '2026-09');

  it('gộp chi phí theo project đã gán, chỉ trong tháng đang xem', () => {
    expect(b.dong.map((d) => [d.quy_trinh.id, d.chi_phi_usd])).toEqual([['q1', 40], ['q2', 10]]);
    expect(b.tong_usd).toBe(55);
  });

  it('chi phí mỗi việc thành công và tỷ lệ thành công', () => {
    expect(b.dong[0].moi_viec_usd).toBe(0.05);
    expect(b.dong[0].ty_le_thanh_cong).toBe(0.8);
  });

  it('chưa nhập số việc: không bịa chi phí mỗi việc — để null', () => {
    expect(b.dong[1]).toMatchObject({ so_thanh_cong: null, moi_viec_usd: null, ty_le_thanh_cong: null });
  });

  it('tiền của project chưa gán báo riêng, không chia cho quy trình nào', () => {
    expect(b.chua_gan).toEqual({ chi_phi_usd: 5, du_an: ['Dự án mặc định'] });
  });

  it('0 việc thành công: chi phí mỗi việc là null (không chia cho 0), tỷ lệ là 0', () => {
    const c = tinhTheoQuyTrinh(CHI, QT, [{ quy_trinh_id: 'q1', ky: '2026-09', so_thanh_cong: 0, so_that_bai: 50 }], '2026-09');
    expect(c.dong[0]).toMatchObject({ moi_viec_usd: null, ty_le_thanh_cong: 0 });
  });

  it('project bị gán vào hai quy trình (dữ liệu cũ): chỉ tính một lần, cho quy trình tạo trước', () => {
    const trung = [...QT, { id: 'q3', ten: 'Trùng', don_vi_ket_qua: 'việc', khop_du_an: ['proj-chatbot'] }];
    const c = tinhTheoQuyTrinh(CHI, trung, [], '2026-09');
    expect(c.dong.find((d) => d.quy_trinh.id === 'q3')?.chi_phi_usd).toBe(0);
    expect(c.dong.reduce((s, d) => s + d.chi_phi_usd, 0) + c.chua_gan.chi_phi_usd).toBe(c.tong_usd);
  });
});

describe('kiểm khi lưu', () => {
  it('project đã thuộc quy trình khác thì báo', () => {
    expect(duAnDaGan(['proj-ocr', 'moi'], [QT[1]])).toEqual(['proj-ocr']);
  });
  it('kỳ dạng YYYY-MM', () => {
    expect(laKy('2026-09')).toBe(true);
    expect(laKy('2026-13')).toBe(false);
    expect(laKy('09/2026')).toBe(false);
  });
});
