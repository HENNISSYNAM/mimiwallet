import { describe, expect, it } from 'vitest';
import { CAC_MENU } from '@/components/layout/MenuXo';
import { TAT_CA_TRANG, TRANG_GIAI_PHAP, TRANG_SAN_PHAM, duongDanTrang, timTrang } from './trangNoiDung';

/**
 * Menu hứa có trang thì phải có trang; trang nhắc tới trang khác thì trang đó phải
 * tồn tại; và mỗi trang đủ các phần tối thiểu để không thành trang rỗng.
 */

const tatCaLienKetMenu = () =>
  CAC_MENU.flatMap((m) => [...m.cot.flat(), ...(m.hangDuoi ? [m.hangDuoi] : [])])
    .flatMap((nhom) => nhom.muc.map((muc) => muc.href));

describe('trang sản phẩm và giải pháp', () => {
  it('mọi liên kết /san-pham/ và /giai-phap/ trong menu đều có trang', () => {
    const thieu = tatCaLienKetMenu()
      .filter((h) => h.startsWith('/san-pham/') || h.startsWith('/giai-phap/'))
      .filter((h) => !timTrang(h));
    expect(thieu).toEqual([]);
  });

  it('menu Sản phẩm và Giải pháp không còn mục nào trỏ về mốc chung trên trang chủ', () => {
    for (const khoa of ['san-pham', 'giai-phap'] as const) {
      const menu = CAC_MENU.find((m) => m.khoa === khoa)!;
      const muc = [...menu.cot.flat(), ...(menu.hangDuoi ? [menu.hangDuoi] : [])].flatMap((n) => n.muc);
      const conMoc = muc.filter((m) => !m.hop && m.href.startsWith('#')).map((m) => m.ten.vi);
      expect(conMoc, khoa).toEqual([]);
    }
  });

  it('đủ 12 trang sản phẩm và 9 trang giải pháp, không trùng đường dẫn', () => {
    expect(TRANG_SAN_PHAM).toHaveLength(12);
    expect(TRANG_GIAI_PHAP).toHaveLength(9);
    const duong = TAT_CA_TRANG.map(duongDanTrang);
    expect(new Set(duong).size).toBe(duong.length);
  });

  it('trang liên quan đều tồn tại và không tự trỏ vào mình', () => {
    for (const t of TAT_CA_TRANG) {
      for (const d of t.lienQuan) {
        expect(timTrang(d), `${duongDanTrang(t)} → ${d}`).toBeDefined();
        expect(d).not.toBe(duongDanTrang(t));
      }
    }
  });

  it('mỗi trang đủ phần tối thiểu', () => {
    for (const t of TAT_CA_TRANG) {
      const ten = duongDanTrang(t);
      expect(t.cachHoatDong.length, ten).toBeGreaterThanOrEqual(3);
      expect(t.lamDuoc.length, ten).toBeGreaterThanOrEqual(3);
      expect(t.ranhGioi.length, ten).toBeGreaterThanOrEqual(1);
      expect(t.hoiDap.length, ten).toBeGreaterThanOrEqual(1);
      expect(t.motCau.length, ten).toBeGreaterThan(40);
    }
  });

  it('trang đang xây nói rõ là chưa có, và không trỏ vào màn hình app', () => {
    for (const t of TAT_CA_TRANG.filter((x) => x.trangThai === 'dang-xay')) {
      expect(t.trongApp, duongDanTrang(t)).toBeUndefined();
      expect(t.ranhGioi.join(' ') + t.motCau, duongDanTrang(t)).toMatch(/đang xây|CHƯA/i);
    }
  });

  it('số liệu thị trường luôn kèm nguồn có đường dẫn', () => {
    for (const t of TAT_CA_TRANG) {
      if (!t.vanDe.soLieu) continue;
      expect(t.vanDe.soLieu.url, duongDanTrang(t)).toMatch(/^https:\/\//);
      expect(t.vanDe.soLieu.nguon.length).toBeGreaterThan(5);
    }
  });
});

describe('menu Về chúng tôi', () => {
  it('đứng cuối thanh, chỉ trỏ tới trang có route, mốc trang chủ có thật hoặc thư liên hệ', () => {
    expect(CAC_MENU.at(-1)?.khoa).toBe('ve-chung-toi');
    const menu = CAC_MENU.find((m) => m.khoa === 've-chung-toi')!;
    const TRANG = ['/about', '/about?muc=doi-ngu', '/thuong-hieu'];
    const MOC = ['#cong-nhan', '#dang-ky'];
    const sai = menu.cot.flat().flatMap((n) => n.muc)
      .map((m) => m.href)
      .filter((h) => !TRANG.includes(h) && !MOC.includes(h) && !h.startsWith('mailto:'));
    expect(sai).toEqual([]);
  });
});

describe('các menu không trùng nhau', () => {
  const tatCaMuc = CAC_MENU.flatMap((m) => [...m.cot.flat(), ...(m.hangDuoi ? [m.hangDuoi] : [])]).flatMap((n) => n.muc);

  it('không có hai mục cùng tên', () => {
    const ten = tatCaMuc.map((m) => m.ten.vi);
    expect(ten.filter((x, i) => ten.indexOf(x) !== i)).toEqual([]);
  });

  it('không có hai mục cùng trỏ một trang (trừ lối liên hệ)', () => {
    const dich = tatCaMuc.map((m) => m.href).filter((h) => h !== '#dang-ky' && !h.startsWith('mailto:'));
    expect(dich.filter((x, i) => dich.indexOf(x) !== i)).toEqual([]);
  });

  it('không lặp lại liên kết đã có sẵn trên thanh (Bảng giá, Bắt đầu miễn phí)', () => {
    expect(tatCaMuc.map((m) => m.href).filter((h) => h === '#pricing' || h === '/register')).toEqual([]);
  });
});
