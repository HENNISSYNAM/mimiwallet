import { describe, expect, it } from 'vitest';
import { dangMeo, docCaiDat, giuTrongMan, laLenhPet, laPhimTat, luuCaiDat, MAC_DINH, trangThaiPet } from './petMimi';

const t = (p: Partial<Parameters<typeof trangThaiPet>[0]> = {}) => ({ dangTraLoi: false, dangLamHo: false, loi: false, soCanBan: 0, chuaDoc: 0, ...p });

describe('trạng thái pet — thứ tự ưu tiên theo tài liệu', () => {
  it('cần bạn > bị chặn > xong chưa xem > đang chạy > nghỉ', () => {
    expect(trangThaiPet(t({ soCanBan: 1, loi: true, chuaDoc: 2, dangTraLoi: true }))).toBe('can_ban');
    expect(trangThaiPet(t({ loi: true, chuaDoc: 2, dangTraLoi: true }))).toBe('bi_chan');
    expect(trangThaiPet(t({ chuaDoc: 2, dangTraLoi: true }))).toBe('xong_chua_xem');
    expect(trangThaiPet(t({ dangLamHo: true }))).toBe('dang_chay');
    expect(trangThaiPet(t())).toBe('nghi');
  });
  it('mỗi trạng thái một dáng; nghỉ lâu thì ngủ', () => {
    expect(dangMeo('can_ban', false)).toBe('sit');
    expect(dangMeo('dang_chay', false)).toBe('run');
    expect(dangMeo('nghi', true)).toBe('sleep');
  });
});

describe('cài đặt pet', () => {
  it('đọc hỏng / trống / chế độ riêng tư → mặc định, không vỡ', () => {
    expect(docCaiDat({ getItem: () => '{không phải json' })).toEqual(MAC_DINH);
    expect(docCaiDat({ getItem: () => null })).toEqual(MAC_DINH);
    expect(docCaiDat({ getItem: () => { throw new Error('private'); } })).toEqual(MAC_DINH);
    expect(docCaiDat(null)).toEqual(MAC_DINH);
  });
  it('giá trị lạ bị thay bằng mặc định; giá trị đúng giữ nguyên', () => {
    expect(docCaiDat({ getItem: () => JSON.stringify({ x: 'a', y: 20, co: 'khong-lo', mini: 'yes', an: true }) }))
      .toEqual({ x: null, y: 20, co: 'vua', mini: false, an: true });
  });
  it('mặc định ẩn; bản v2 chỉ hiện khi đã ghi rõ an: false; bản v1 luôn bị coi là ẩn', () => {
    expect(MAC_DINH.an).toBe(true);
    const kho = (v2: unknown, v1: unknown) => ({ getItem: (k: string) => (k === 'mimi.pet.v2' ? (v2 === null ? null : JSON.stringify(v2)) : v1 === null ? null : JSON.stringify(v1)) });
    expect(docCaiDat(kho(null, { x: 1, y: 2, co: 'lon', mini: false, an: false }))).toEqual({ x: 1, y: 2, co: 'lon', mini: false, an: true });
    expect(docCaiDat(kho({ x: null, y: null, co: 'vua', mini: false, an: false }, null)).an).toBe(false);
    expect(docCaiDat(kho({ x: null, y: null, co: 'vua', mini: false }, null)).an).toBe(true);
  });
  it('ghi lỗi không làm vỡ', () => {
    expect(() => luuCaiDat(MAC_DINH, { setItem: () => { throw new Error('full'); } })).not.toThrow();
  });
});

describe('kéo thả và phím tắt', () => {
  it('giữ pet trong màn hình', () => {
    expect(giuTrongMan({ x: -50, y: 9999 }, { rong: 80, cao: 120 }, { rong: 400, cao: 800 })).toEqual({ x: 8, y: 672 });
  });
  it('Alt+Shift+M bật tắt; tổ hợp khác thì không', () => {
    expect(laPhimTat({ altKey: true, shiftKey: true, ctrlKey: false, metaKey: false, code: 'KeyM' })).toBe(true);
    expect(laPhimTat({ altKey: true, shiftKey: false, ctrlKey: false, metaKey: false, code: 'KeyM' })).toBe(false);
  });
  it('lệnh /pet', () => {
    expect(laLenhPet(' /pet ')).toBe(true);
    expect(laLenhPet('/pet đi')).toBe(false);
  });
});
