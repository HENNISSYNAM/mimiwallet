import { describe, expect, it } from 'vitest';
import { coDo, congKieuOpenAI, DINH_TUYEN, LoiNhaCungCap, MUC_DICH, type LanGoi } from './nha-cung-cap';

const cong = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });

describe('tầng nhà cung cấp', () => {
  it('dịch phản hồi cổng về khuôn chung, kể cả token', async () => {
    const ncc = congKieuOpenAI({ ten: 'x', url: 'https://x', khoa: 'k', goi: cong({ choices: [{ message: { content: null, tool_calls: [{ id: 'c1', function: { name: 'dong_tien' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 3 } }) });
    expect(await ncc.hoi({ mo_hinh: 'm', tin: [{ vai: 'nguoi_dung', noi_dung: 'hi' }] }))
      .toEqual({ noi_dung: null, goi_cong_cu: [{ id: 'c1', ten: 'dong_tien' }], token_vao: 10, token_ra: 3 });
  });

  it('lỗi cổng thành LoiNhaCungCap có mã, không lộ khuôn của hãng', async () => {
    const ncc = congKieuOpenAI({ ten: 'x', url: 'https://x', khoa: 'k', goi: cong({}, 429) });
    await expect(ncc.hoi({ mo_hinh: 'm', tin: [] })).rejects.toBeInstanceOf(LoiNhaCungCap);
  });

  it('mọi mục đích đều có tuyến, có lý do; việc nặng đánh dấu "mạnh"', () => {
    for (const m of MUC_DICH) expect(DINH_TUYEN[m].ly_do.length).toBeGreaterThan(5);
    expect(DINH_TUYEN.phan_tich.hang).toBe('manh');
    expect(DINH_TUYEN.y_dinh.hang).toBe('nhanh');
  });

  it('bọc đo: ghi độ trễ, token, thành công/thất bại mà không đổi kết quả', async () => {
    const ghi: LanGoi[] = [];
    let t = 1000;
    const tot = coDo(congKieuOpenAI({ ten: 'x', url: 'https://x', khoa: 'k', goi: cong({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } }) }), 'dien_dat', (l) => ghi.push(l), () => (t += 250));
    expect((await tot.hoi({ mo_hinh: 'm', tin: [] })).noi_dung).toBe('ok');
    const hong = coDo(congKieuOpenAI({ ten: 'x', url: 'https://x', khoa: 'k', goi: cong({}, 402) }), 'y_dinh', (l) => ghi.push(l), () => (t += 100));
    await expect(hong.hoi({ mo_hinh: 'm', tin: [] })).rejects.toThrow();
    expect(ghi).toEqual([
      expect.objectContaining({ muc_dich: 'dien_dat', do_tre_ms: 250, token_vao: 5, thanh_cong: true }),
      expect.objectContaining({ muc_dich: 'y_dinh', thanh_cong: false, ma_loi: 402 }),
    ]);
  });
});
