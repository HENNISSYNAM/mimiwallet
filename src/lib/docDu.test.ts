import { describe, expect, it } from 'vitest';
import { docDu, type TrangDoc } from './docDu';

/** Máy chủ giả: `soDong` dòng, cắt mỗi trang ở `maxRows` như PostgREST, tuỳ chọn hỏng ở lần gọi thứ `hongLan`. */
function mayChu(soDong: number, { maxRows = 1000, coDem = true, hongLan = -1 } = {}) {
  const du = Array.from({ length: soDong }, (_, i) => ({ id: i }));
  const goi: [number, number][] = [];
  const truyVan = async (tu: number, den: number, demTong: boolean): Promise<TrangDoc<{ id: number }>> => {
    goi.push([tu, den]);
    if (goi.length === hongLan) return { data: null, error: { message: 'mất kết nối' }, count: null };
    const het = Math.min(den + 1, tu + maxRows, du.length);
    return { data: du.slice(tu, het), error: null, count: demTong && coDem ? du.length : null };
  };
  return { truyVan, goi };
}

describe('docDu', () => {
  it('đọc đủ qua nhiều trang, trang sau bắt đầu đúng chỗ trang trước dừng', async () => {
    const m = mayChu(2500);
    const kq = await docDu(m.truyVan);
    expect(kq).toMatchObject({ tong: 2500, loi: null, du: true });
    expect(kq.dong.map((d) => d.id)).toEqual(Array.from({ length: 2500 }, (_, i) => i));
  });

  // Hồi quy 29/09/2026: máy chủ cắt trang ở 500 thì bản cũ coi trang đầu "ngắn" và dừng ở 500/1400.
  it('máy chủ cắt trang nhỏ hơn cỡ trang xin: vẫn đọc hết, không sót, không trùng', async () => {
    const m = mayChu(1400, { maxRows: 500 });
    const kq = await docDu(m.truyVan);
    expect(kq.du).toBe(true);
    expect(new Set(kq.dong.map((d) => d.id)).size).toBe(1400);
  });

  it('máy chủ không trả số đếm: đọc tới trang rỗng mới gọi là đủ', async () => {
    const m = mayChu(1200, { maxRows: 500, coDem: false });
    const kq = await docDu(m.truyVan);
    expect(kq).toMatchObject({ tong: null, du: true });
    expect(kq.dong).toHaveLength(1200);
  });

  // Hồi quy 29/09/2026: đọc hỏng từng bị vẽ thành "chưa có giao dịch nào".
  it('hỏng giữa chừng: trả lỗi và du = false, không giả như đủ', async () => {
    const m = mayChu(2500, { hongLan: 2 });
    const kq = await docDu(m.truyVan);
    expect(kq).toMatchObject({ loi: 'mất kết nối', du: false });
    expect(kq.dong).toHaveLength(1000);
  });

  it('vượt trần: dừng ở trần và nói chưa đủ', async () => {
    const m = mayChu(3000);
    const kq = await docDu(m.truyVan, { toiDa: 2000 });
    expect(kq).toMatchObject({ tong: 3000, du: false, loi: null });
    expect(kq.dong).toHaveLength(2000);
  });

  it('bảng rỗng là đủ (không có gì để đọc), không phải lỗi', async () => {
    const kq = await docDu(mayChu(0).truyVan);
    expect(kq).toMatchObject({ dong: [], tong: 0, loi: null, du: true });
  });
});
