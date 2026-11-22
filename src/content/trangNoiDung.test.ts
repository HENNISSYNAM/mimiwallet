import { describe, expect, it } from 'vitest';
import { CAC_MENU } from '@/components/layout/MenuXo';
import { TAT_CA_TRANG, TRANG_GIAI_PHAP, TRANG_NOI_DUNG_DONG_BANG, TRANG_SAN_PHAM, duongDanTrang, timTrang, trangTheoNgonNgu } from './trangNoiDung';
import { daDongBang } from '@/lib/dongBang';

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

  // 28/09/2026: gỡ trang Chi phí AI (đang xây) và Hoá đơn điện tử (Casso chưa bật trên production) → 10.
  // 16/11/2026: đóng băng 4 trang sản phẩm + 5 trang giải pháp về agent chi tiền / danh bạ khách; thêm 3 trang bán được → 9 và 4.
  // 21/11/2026: bỏ bán tại quầy (POS) và các trang đóng băng — xoá hẳn, không còn đóng băng.
  it('đủ 8 trang sản phẩm và 4 trang giải pháp, không trùng đường dẫn', () => {
    expect(TRANG_SAN_PHAM).toHaveLength(8);
    expect(TRANG_GIAI_PHAP).toHaveLength(4);
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

describe('đóng băng đợt 2 (16/11/2026) và bốn trang MIMI bán', () => {
  const BON_TRANG = ['/san-pham/khai-thue-ho-kinh-doanh', '/san-pham/ho-so-vay', '/giai-phap/van-phong-ke-toan'];

  it('trang về agent chi tiền đã đóng băng: không còn trong danh sách, menu hay trang liên quan', () => {
    const dongBang = TRANG_NOI_DUNG_DONG_BANG.map(duongDanTrang).sort();
    // 21/11/2026: bỏ bán tại quầy (POS) và các trang đóng băng — xoá hẳn, không còn đóng băng.
    expect(dongBang).toEqual([]);
    for (const d of ['/san-pham/kiem-soat-agent', '/san-pham/ban-tai-quay', '/giai-phap/phan-mem-ai']) expect(timTrang(d), d).toBeUndefined();
    for (const d of dongBang) {
      expect(daDongBang(d), d).toBe(true);
      expect(timTrang(d), d).toBeUndefined();
    }
    expect(tatCaLienKetMenu().filter((h) => daDongBang(h.split('#')[0]))).toEqual([]);
    for (const t of TAT_CA_TRANG) {
      expect(t.trongApp && daDongBang(t.trongApp.duong), duongDanTrang(t)).toBeFalsy();
    }
  });

  it('menu Sản phẩm mở đầu bằng bốn việc MIMI bán', () => {
    const sp = CAC_MENU.find((m) => m.khoa === 'san-pham')!;
    expect(sp.cot[0][0].muc.map((m) => m.href)).toEqual(BON_TRANG);
  });

  it('bốn trang có bản tiếng Anh đủ phần, cùng số mục với bản tiếng Việt, không lời hứa agent', () => {
    for (const d of BON_TRANG) {
      const t = timTrang(d)!;
      expect(t, d).toBeDefined();
      expect(t.trangThai, d).toBe('dang-chay');
      expect(t.en, d).toBeDefined();
      const en = trangTheoNgonNgu(t, 'en');
      expect(en.ten, d).not.toBe(t.ten);
      expect(en.cachHoatDong.length, d).toBe(t.cachHoatDong.length);
      expect(en.lamDuoc.length, d).toBe(t.lamDuoc.length);
      expect(en.ranhGioi.length, d).toBe(t.ranhGioi.length);
      expect(en.hoiDap.length, d).toBe(t.hoiDap.length);
      expect(trangTheoNgonNgu(t, 'vi')).toBe(t);
      const chu = JSON.stringify(t);
      expect(chu, d).not.toMatch(/agent|chấm điểm|scoring/i);
    }
  });
});

describe('thanh điều hướng', () => {
  it('chỉ có bốn menu xổ, không còn menu Về chúng tôi riêng', () => {
    expect(CAC_MENU.map((m) => m.khoa)).toEqual(['san-pham', 'giai-phap', 'doi-tac', 'tai-nguyen']);
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
