/**
 * Prompt 4 mục 40 — mười câu bắt buộc: đúng ý định, có nguồn, có việc tiếp, tài liệu khi cần.
 * Mọi con số là đầu vào của test.
 */
import { describe, expect, it } from 'vitest';
import { nhanYDinh } from './y-dinh';
import { NANG_LUC, duLieuTrong, type DuLieu } from './tinh-toan';
import { tinhBuoc, cauHoiTiepTheo } from '../hanh-trinh/dong-co';
import type { HanhTrinhDay } from '../hanh-trinh/luu';

const HOM_NAY = '2026-09-25';
const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong(HOM_NAY, { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' }), ...p });

describe('ý định cho 10 câu bắt buộc', () => {
  it.each([
    ['Tôi vừa mở hộ kinh doanh, cần làm gì?', 'hanh_trinh'],
    ['Tôi cần chuẩn bị gì trước hạn thuế?', 'chuan_bi_han_thue'],
    ['Nêu 3 việc ưu tiên tuần này.', 'viec_uu_tien'],
    ['Doanh thu tăng mà dòng tiền giảm vì sao?', 'phan_tich_chenh_lech'],
    ['Khoản nào chưa khớp hóa đơn?', 'doi_soat'],
    ['Hóa đơn này sai MST.', 'hanh_trinh'],
    ['Thuế yêu cầu tôi giải trình.', 'hanh_trinh'],
    ['Tôi muốn tạm ngừng.', 'hanh_trinh'],
    ['Tôi muốn đóng hộ kinh doanh.', 'hanh_trinh'],
    ['Soạn báo cáo tài chính ngắn về tháng này.', 'bao_cao_thang'],
  ])('"%s" → %s đứng đầu', (cau, id) => {
    const y = nhanYDinh(cau);
    expect(y[0]).toBe(id);
    expect(y).not.toContain('tra_cuu_luat');
  });

  it('báo cáo tháng không kéo bảng dòng tiền chung vào', () => {
    expect(nhanYDinh('Soạn báo cáo tài chính ngắn về tháng này.')).toEqual(['bao_cao_thang']);
  });
});

const ht = (loai: HanhTrinhDay['loai'], du_kien: HanhTrinhDay['du_kien'] = {}): HanhTrinhDay => {
  const buoc = tinhBuoc(loai, du_kien);
  return { id: '11111111-1111-1111-1111-111111111111', loai, tieu_de: 'Việc ' + loai, trang_thai: 'dang_mo', ho_so_viec_id: null, du_kien, buoc, cau_hoi: cauHoiTiepTheo(buoc, du_kien), tao_luc: '', cap_nhat_luc: '' };
};

describe('hành trình qua trợ lý', () => {
  it('"Tôi muốn tạm ngừng" → mở việc, hỏi đúng MỘT câu đầu tiên, có liên kết mở việc', () => {
    const r = NANG_LUC.hanh_trinh.chay(moi({ hanhTrinh: { loai: 'suspension', luu: true, moi: true, ht: ht('suspension') } }));
    expect(r.tom_tat).toContain('Câu đầu tiên: Bạn muốn bắt đầu tạm ngừng từ ngày nào?');
    expect(r.trang[0].duong_dan).toBe('/dashboard/viec-can-lam?ht=11111111-1111-1111-1111-111111111111');
    expect(JSON.stringify(r)).toContain('MIMI không nộp, không ký thay');
  });

  it('vai trò chỉ xem: vẫn có hướng dẫn, nói rõ không mở được việc', () => {
    const r = NANG_LUC.hanh_trinh.chay(moi({ hanhTrinh: { loai: 'closure', luu: false, moi: false, ht: null } }));
    expect(r.tom_tat).toContain('Hướng dẫn');
    expect(JSON.stringify(r.the)).toContain('không mở việc được');
  });
});

describe('phân tích và báo cáo', () => {
  const giaoDich = [
    { id: 'a', amount: 9_000_000, type: 'income', transaction_date: '2026-08-04', merchant_name: 'Khách', category: null, counter_account_name: null, payment_reference: null },
    { id: 'b', amount: 4_000_000, type: 'income', transaction_date: '2026-09-04', merchant_name: 'Khách', category: null, counter_account_name: null, payment_reference: null },
    { id: 'c', amount: -6_000_000, type: 'expense', transaction_date: '2026-09-08', merchant_name: 'Nhà cung cấp', category: null, counter_account_name: null, payment_reference: null },
  ];
  const hoaDonBan = [
    { id: 'h1', invoice_number: 'H1', client_name: 'Khách', total: 9_000_000, issued_date: '2026-08-02', due_date: '2026-08-20', status: 'paid' },
    { id: 'h2', invoice_number: 'H2', client_name: 'Khách', total: 12_000_000, issued_date: '2026-09-02', due_date: '2026-10-02', status: 'pending' },
  ];

  it('"Doanh thu tăng mà dòng tiền giảm vì sao?" → số có bằng chứng, tách sự thật/suy luận, có giả định và nút lưu', () => {
    const r = NANG_LUC.phan_tich_chenh_lech.chay(moi({ giaoDich, hoaDonBan, cauHoi: 'Doanh thu tăng mà dòng tiền giảm vì sao?' }));
    const so = r.the.find((t) => t.loai === 'so_lieu') as { muc: { gia_tri: unknown; bang_chung?: { id: string[] }[] }[] };
    expect(so.muc[0].gia_tri).toBe(12_000_000);
    expect(so.muc[0].bang_chung?.[0].id).toEqual(['h2']);
    const bang = JSON.stringify(r.the);
    expect(bang).toContain('Sự thật');
    expect(bang).toContain('Suy luận');
    expect(bang).toContain('Chưa biết');
    expect(bang).toContain('Giả định');
    expect(r.de_xuat[0]).toMatchObject({ loai: 'tao_tai_lieu', tham_so: { loai: 'financial_review_memo' } });
  });

  it('"Soạn báo cáo tháng này" → nói thẳng không phải báo cáo tài chính, có nút lưu thành tài liệu', () => {
    const r = NANG_LUC.bao_cao_thang.chay(moi({ giaoDich, hoaDonBan }));
    expect(r.tom_tat).toContain('không lập báo cáo tài chính');
    expect(r.de_xuat.map((d) => d.loai)).toContain('tao_tai_lieu');
  });
});

describe('việc ưu tiên P0–P4', () => {
  it('cơ quan thuế đang chờ trả lời đứng trên việc đang mở và hạn thuế', () => {
    const tl = ht('authority_response', { han_tra_loi: { gia_tri: '2026-09-30', nguon: 'nguoi_dung', luc: '', boi: null } });
    const r = NANG_LUC.viec_uu_tien.chay(moi({
      cauHoi: 'Nêu 3 việc ưu tiên tuần này.', hanhTrinhMo: [tl, ht('suspension')],
      lichThue: {
        lich: [{ khoa: 'k', ten: 'Nộp tờ khai GTGT', loai: 'khai_va_nop', trang_thai: 'phai_lam', han: '2026-09-30', con_lai: 5, vi_sao: '', can_cu: [] }],
        loaiNguoiNop: 'doanh_nghiep', soChuaRo: 2, tienChuaRo: 1_000_000, sanSang: undefined as never,
      },
    }));
    const bang = r.the.find((t) => t.loai === 'bang') as { dong: unknown[][] };
    expect(bang.dong).toHaveLength(3);
    expect(bang.dong.map((d) => d[1])).toEqual(['P0', 'P1', 'P2']);
    expect(String(bang.dong[0][2])).toContain('còn 5 ngày');
  });
});
