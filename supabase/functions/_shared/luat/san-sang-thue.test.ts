import { describe, expect, it } from 'vitest';
import { sanSangThue } from './san-sang-thue';
import type { MocThue } from './lich-thue';

const moc = (o: Partial<MocThue>): MocThue => ({ khoa: 'gtgt_q3', ten: 'Khai thuế GTGT quý 3/2026', loai: 'khai_va_nop', trang_thai: 'phai_lam', han: '2026-10-31', con_lai: 36, vi_sao: 'x', can_cu: [], ...o });
const s = (o: Record<string, number | boolean> = {}) => ({ uoc_tinh: 500_000_000, da_xac_nhan: 450_000_000, chua_ro: 50_000_000, so_chua_ro: 3, co_ket_noi_ngan_hang: true, so_giao_dich: 120, ...o });

describe('sẵn sàng khai thuế', () => {
  it('còn khoản chưa phân loại → thiếu dữ liệu, nói rõ thiếu gì và việc tiếp', () => {
    const r = sanSangThue([moc({})], s());
    expect(r).toMatchObject({ trang_thai: 'thieu_du_lieu', han: '2026-10-31', con_lai: 36, doanh_thu_chua_phan_loai: 50_000_000, so_khoan_chua_phan_loai: 3 });
    expect(r.giay_to_thieu[0]).toContain('còn 3 khoản');
    expect(r.viec_tiep).toContain('Xác nhận 3 khoản tiền vào chưa rõ');
  });

  it('đủ phân loại, có sao kê → sẵn sàng; độ tin cậy cao', () => {
    const r = sanSangThue([moc({})], s({ chua_ro: 0, so_chua_ro: 0 }));
    expect(r.trang_thai).toBe('san_sang');
    expect(r.do_tin_cay).toBe('cao');
  });

  it('không có sao kê → thiếu sao kê, độ tin cậy thấp', () => {
    const r = sanSangThue([moc({})], s({ co_ket_noi_ngan_hang: false, so_giao_dich: 0, chua_ro: 0, so_chua_ro: 0 }));
    expect(r.giay_to_thieu.join(' ')).toContain('chưa kết nối ngân hàng');
    expect(r.do_tin_cay).toBe('thap');
  });

  it('mốc cần xác minh → trạng thái cần xác minh, câu hỏi đứng đầu việc tiếp', () => {
    const r = sanSangThue([moc({ trang_thai: 'can_xac_minh', cau_hoi: 'Công ty đang khai thuế GTGT theo tháng hay theo quý?' })], s({ chua_ro: 0, so_chua_ro: 0 }));
    expect(r.trang_thai).toBe('can_xac_minh');
    expect(r.viec_tiep[0]).toContain('theo tháng hay theo quý');
  });

  it('không có mốc → không có việc, không bịa hạn', () => {
    const r = sanSangThue([], s());
    expect(r).toMatchObject({ trang_thai: 'khong_co_viec', han: null, ten_viec: null });
  });
});
