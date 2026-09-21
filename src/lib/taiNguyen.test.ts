import { describe, expect, it } from 'vitest';
import { BAN_SOAN_TRONG, duongDanBai, kiemBanSoan, loaiTuDuong, phanTichNoiDung, taoSlug } from './taiNguyen';

describe('taoSlug', () => {
  it('bỏ dấu, chữ thường, gạch nối', () => {
    expect(taoSlug('Thuế hộ kinh doanh 2026!')).toBe('thue-ho-kinh-doanh-2026');
    expect(taoSlug('  Đồng hành cùng MIMI  ')).toBe('dong-hanh-cung-mimi');
  });
  it('không để gạch nối ở cuối khi bị cắt 120 ký tự', () => {
    const s = taoSlug(`${'a'.repeat(119)} bcd`);
    expect(s.length).toBeLessThanOrEqual(120);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('kiemBanSoan — cùng ràng buộc với CHECK trong migration', () => {
  const tot = { ...BAN_SOAN_TRONG('blog'), tieu_de: 'Bài hợp lệ', slug: 'bai-hop-le' };
  it('bản hợp lệ không có lỗi', () => expect(kiemBanSoan(tot)).toEqual({}));
  it('ảnh bìa và đường dẫn ngoài chỉ nhận https — chặn javascript:, data:, http:', () => {
    expect(kiemBanSoan({ ...tot, anh_bia: 'javascript:alert(1)' }).anh_bia).toBeTruthy();
    expect(kiemBanSoan({ ...tot, anh_bia: 'data:image/png;base64,AAA' }).anh_bia).toBeTruthy();
    expect(kiemBanSoan({ ...tot, duong_dan_ngoai: 'http://vi-du.vn' }).duong_dan_ngoai).toBeTruthy();
    expect(kiemBanSoan({ ...tot, duong_dan_ngoai: 'https://vi-du.vn/bai' })).toEqual({});
  });
  it('slug sai dạng, tiêu đề quá ngắn, kết thúc trước bắt đầu đều bị bắt', () => {
    const l = kiemBanSoan({ ...tot, tieu_de: 'ab', slug: 'Có Dấu', bat_dau: '2026-10-02T09:00:00Z', ket_thuc: '2026-10-01T09:00:00Z' });
    expect(Object.keys(l).sort()).toEqual(['ket_thuc', 'slug', 'tieu_de']);
  });
});

describe('phanTichNoiDung — không bao giờ sinh HTML hay liên kết không an toàn', () => {
  it('tiêu đề, danh sách, đoạn, liên kết https', () => {
    const k = phanTichNoiDung('# Mở đầu\n\nĐoạn một [MIMI](https://mimi.vn) nhé.\n\n- một\n- hai');
    expect(k.map((x) => x.loai)).toEqual(['h2', 'p', 'ul']);
    expect(k[1]).toEqual({ loai: 'p', doan: [{ loai: 'chu', chu: 'Đoạn một ' }, { loai: 'lien_ket', chu: 'MIMI', href: 'https://mimi.vn' }, { loai: 'chu', chu: ' nhé.' }] });
  });
  it('liên kết javascript: hay http: chỉ là chữ, không thành thẻ a', () => {
    const k = phanTichNoiDung('[bấm](javascript:alert(1)) và [cũ](http://x.vn)');
    expect(JSON.stringify(k)).not.toContain('lien_ket');
  });
  it('thẻ <script> giữ nguyên là chữ (React sẽ thoát ký tự khi hiện)', () => {
    const k = phanTichNoiDung('<script>alert(1)</script>');
    expect(k).toEqual([{ loai: 'p', doan: [{ loai: 'chu', chu: '<script>alert(1)</script>' }] }]);
  });
});

describe('đường dẫn', () => {
  it('tuyển dụng có đường riêng; loại khác nằm dưới /tai-nguyen', () => {
    expect(duongDanBai({ loai: 'tuyen_dung', slug: 'ky-su' })).toBe('/tuyen-dung/ky-su');
    expect(duongDanBai({ loai: 'bao_cao', slug: 'thue-2026' })).toBe('/tai-nguyen/bao-cao/thue-2026');
    expect(loaiTuDuong('goc-nhin')).toBe('goc_nhin');
    expect(loaiTuDuong('khong-co')).toBeNull();
  });
});
