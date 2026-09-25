import { describe, expect, it } from 'vitest';
import { bam, dungHtml, thoat } from './dung';
import { congVanGiaiTrinh, goiBangChung, goiSanSangThue, memoTaiChinh } from './tao';
import { phanTichChenhLech } from '../phan-tich/chenh-lech';
import { sanSangThue } from '../luat/san-sang-thue';

const CT = { ten: 'Hộ kinh doanh A', mst: '0101234567' };

describe('trình dựng HTML', () => {
  it('thoát mọi ký tự nguy hiểm — tên khách có <script> không thành mã chạy', () => {
    const html = dungHtml({ nhan: 'draft_for_review', tieu_de: 'T', cong_ty: { ten: '<script>alert(1)</script>' }, ngay: '2026-09-25',
      noi_dung: [{ loai: 'bang', cot: ['a'], dong: [['<img src=x onerror=alert(1)>']] }] });
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(thoat('"`\'')).toBe('&quot;&#96;&#39;');
  });

  it('CSP chặn script và tài nguyên ngoài; khổ A4; nhãn in ngay trên trang', () => {
    const html = dungHtml({ nhan: 'mimi_generated', tieu_de: 'T', cong_ty: CT, ngay: '2026-09-25', noi_dung: [] });
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('size: A4');
    expect(html).toContain('TÀI LIỆU DO MIMI SOẠN');
    expect(html).toContain('MIMI không ký, không nộp thay');
  });

  it('băm ổn định: cùng nội dung cùng mã, khác một ký tự khác mã', async () => {
    expect(await bam('a')).toBe(await bam('a'));
    expect(await bam('a')).not.toBe(await bam('b'));
    expect(await bam('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('"Soạn báo cáo tài chính ngắn về tháng này" → báo cáo phân tích, không phải BCTC', () => {
  const pt = phanTichChenhLech({ cauHoi: 'Soạn báo cáo tháng này', homNay: '2026-09-25',
    giaoDich: [{ id: 'g1', amount: 5_000_000, type: 'income', transaction_date: '2026-09-02', merchant_name: 'Khách', counter_account_name: null }],
    hoaDonBan: [] });
  const b = memoTaiChinh(pt, CT, '2026-09-25');
  it('nhãn MIMI soạn, nói rõ không phải báo cáo tài chính, có giả định và nguồn', () => {
    expect(b.loai).toBe('financial_review_memo');
    expect(b.nhan).toBe('mimi_generated');
    const html = dungHtml(b.noi_dung);
    expect(html).toContain('KHÔNG phải báo cáo tài chính');
    expect(html).toContain('Giả định, phương pháp, độ phủ');
    expect(b.bang_chung[0]).toEqual({ loai: 'giao_dich', id: ['g1'] });
  });
});

describe('gói sẵn sàng khai thuế', () => {
  it('thiếu phân loại → INCOMPLETE; cùng số với đối tượng sẵn sàng', () => {
    const lich = [{ khoa: 'k', ten: 'Khai thuế quý 3/2026', loai: 'khai_va_nop' as const, trang_thai: 'phai_lam' as const, han: '2026-10-31', con_lai: 36, vi_sao: '', can_cu: [] }];
    const ss = sanSangThue(lich, { uoc_tinh: 100, da_xac_nhan: 60, chua_ro: 40, so_chua_ro: 2, co_ket_noi_ngan_hang: true, so_giao_dich: 10 });
    const b = goiSanSangThue(ss, lich, CT, '2026-09-25');
    expect(b.do_day).toBe('INCOMPLETE');
    expect(dungHtml(b.noi_dung)).toContain('còn 2 khoản chưa xác nhận');
  });
});

describe('"Thuế yêu cầu tôi giải trình" → gói bằng chứng + công văn nháp', () => {
  const x = {
    noi_dung_yeu_cau: 'Giải trình doanh thu quý 2/2026 chênh với sao kê', ky: { tu: '2026-04-01', den: '2026-06-30' },
    giao_dich_vao: [{ id: 'v1', so_tien: 3_000_000 }, { id: 'v2', so_tien: 2_000_000 }], da_phan_loai: 1, chua_phan_loai: 1,
    hoa_don_khop_chac: [{ giao_dich: 'v1', hoa_don: 'h1', so_hoa_don: 'HD01', so_tien: 3_000_000 }], hoa_don_can_xem: 0, co_sao_ke: true,
  };
  it('còn khoản chưa phân loại → INCOMPLETE, liệt kê điều thiếu', () => {
    const b = goiBangChung(x, CT, '2026-09-25');
    expect(b.do_day).toBe('INCOMPLETE');
    expect(dungHtml(b.noi_dung)).toContain('1 khoản tiền vào chưa phân loại');
    expect(b.bang_chung).toContainEqual({ loai: 'giao_dich', id: ['v1', 'v2'] });
  });
  it('đủ phân loại, còn cặp cần xem → NEEDS_REVIEW; đủ hết → COMPLETE', () => {
    expect(goiBangChung({ ...x, chua_phan_loai: 0, hoa_don_can_xem: 2 }, CT, '2026-09-25').do_day).toBe('NEEDS_REVIEW');
    expect(goiBangChung({ ...x, chua_phan_loai: 0 }, CT, '2026-09-25').do_day).toBe('COMPLETE');
  });
  it('công văn: bản nháp, có chỗ ký, KHÔNG tự điền căn cứ pháp lý', () => {
    const b = congVanGiaiTrinh({ noi_dung_yeu_cau: x.noi_dung_yeu_cau, ngay_nhan_thong_bao: '2026-09-20' }, CT, '2026-09-25');
    const html = dungHtml(b.noi_dung);
    expect(b.nhan).toBe('draft_for_review');
    expect(html).toContain('BẢN NHÁP ĐỂ XEM LẠI');
    expect(html).toContain('(Ký, ghi rõ họ tên)');
    expect(html).not.toMatch(/Căn cứ (Luật|Nghị định|Thông tư)/);
    expect(html).toContain('20/09/2026');
  });
});
