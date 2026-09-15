import { describe, expect, it } from 'vitest';
import { docKetQuaQuet, docSoTienVnd, hoiMoHinh, kiemAnh, LoiMoHinh, SO_NANG_LUC_MOT_CAU } from './mo-hinh';
import type { KetQuaNangLuc } from './kieu';

/** Cổng mô hình giả: trả lần lượt các phản hồi dựng sẵn. Không gọi mạng. */
const cong = (...ds: unknown[]) => {
  const goi: { body: Record<string, unknown> }[] = [];
  let i = 0;
  return {
    goi,
    fn: async (_u: string, init: RequestInit) => {
      goi.push({ body: JSON.parse(String(init.body)) });
      const d = ds[i++];
      if (typeof d === 'number') return new Response('{}', { status: d });
      return new Response(JSON.stringify(d), { status: 200 });
    },
  };
};
const traLoi = (content: string) => ({ choices: [{ message: { role: 'assistant', content } }] });
const goiCongCu = (...ten: string[]) => ({
  choices: [{ message: { role: 'assistant', content: null, tool_calls: ten.map((t, i) => ({ id: `c${i}`, type: 'function', function: { name: t, arguments: '{}' } })) } }],
});
const kqGia = (id: string): KetQuaNangLuc => ({ nang_luc: id, nhom: 'ai_token', tom_tat: `tóm tắt ${id}`, the: [], de_xuat: [], nguon: [], trang: [] });

const coBan = { khoa: 'k', lichSu: [], congTy: 'Cty', homNay: '2026-09-15', congCu: [{ id: 'chi_phi_ai', mo_ta: 'x' }, { id: 'model_re_hon', mo_ta: 'y' }] };

describe('hỏi mô hình', () => {
  it('chạy đúng năng lực mô hình gọi, gửi kết quả lại, trả câu cuối cùng', async () => {
    const c = cong(goiCongCu('chi_phi_ai', 'model_re_hon'), traLoi('Tháng này vượt ngân sách.'));
    const chay: string[] = [];
    const r = await hoiMoHinh({ ...coBan, cau: 'chi AI vượt ngân sách?', chay: async (id) => { chay.push(id); return kqGia(id); }, goi: c.fn });
    expect(chay).toEqual(['chi_phi_ai', 'model_re_hon']);
    expect(r.cau).toBe('Tháng này vượt ngân sách.');
    expect(r.ket_qua.map((k) => k.nang_luc)).toEqual(['chi_phi_ai', 'model_re_hon']);
    const tin = c.goi[1].body.messages as Array<{ role: string; content: string }>;
    expect(tin.filter((m) => m.role === 'tool').map((m) => JSON.parse(m.content).tom_tat)).toEqual(['tóm tắt chi_phi_ai', 'tóm tắt model_re_hon']);
  });

  it('tên công cụ bịa thì không chạy gì', async () => {
    const c = cong(goiCongCu('xoa_du_lieu'), traLoi('Không làm được.'));
    const chay: string[] = [];
    const r = await hoiMoHinh({ ...coBan, cau: 'x', chay: async (id) => { chay.push(id); return kqGia(id); }, goi: c.fn });
    expect(chay).toEqual([]);
    expect(r.ket_qua).toEqual([]);
  });

  it(`không chạy quá ${SO_NANG_LUC_MOT_CAU} năng lực một câu, và gọi lại cùng công cụ không chạy lại`, async () => {
    const congCu = ['a', 'b', 'c', 'd'].map((id) => ({ id, mo_ta: id }));
    const c = cong(goiCongCu('a', 'a', 'b', 'c', 'd'), traLoi('xong'));
    const chay: string[] = [];
    await hoiMoHinh({ ...coBan, congCu, cau: 'x', chay: async (id) => { chay.push(id); return kqGia(id); }, goi: c.fn });
    expect(chay).toEqual(['a', 'b', 'c']);
  });

  it('cổng lỗi thì ném LoiMoHinh để máy chủ quay về bộ luật cố định', async () => {
    await expect(hoiMoHinh({ ...coBan, cau: 'x', chay: async (id) => kqGia(id), goi: cong(429).fn })).rejects.toBeInstanceOf(LoiMoHinh);
    await expect(hoiMoHinh({ ...coBan, cau: 'x', chay: async (id) => kqGia(id), goi: cong(traLoi('')).fn })).rejects.toBeInstanceOf(LoiMoHinh);
  });

  it('vòng cuối không đưa công cụ nữa, ép mô hình trả lời', async () => {
    const c = cong(goiCongCu('chi_phi_ai'), goiCongCu('chi_phi_ai'), goiCongCu('chi_phi_ai'), traLoi('xong'));
    const r = await hoiMoHinh({ ...coBan, cau: 'x', chay: async (id) => kqGia(id), goi: c.fn });
    expect(r.cau).toBe('xong');
    expect(c.goi[3].body.tools).toBeUndefined();
  });
});

describe('đọc ảnh chứng từ', () => {
  it('chỉ nhận ảnh JPG/PNG/WEBP dưới 5 MB', () => {
    expect(kiemAnh('data:image/png;base64,iVBORw0KGgo=').ok).toBe(true);
    expect(kiemAnh('data:application/pdf;base64,JVBERi0=').ok).toBe(false);
    expect(kiemAnh(`data:image/jpeg;base64,${'A'.repeat(7_000_001)}`).ok).toBe(false);
  });

  it('đọc số tiền kiểu Việt Nam', () => {
    expect(docSoTienVnd('1.234.000 đ')).toBe(1_234_000);
    expect(docSoTienVnd(-5)).toBeNull();
    expect(docSoTienVnd('không rõ')).toBeNull();
  });

  it('trường sai khuôn bị bỏ và đánh dấu xem lại; tổng lệch thì cũng phải xem lại', () => {
    const r = docKetQuaQuet({
      loai: 'hoa_don', so_hoa_don: ' 0001234 ', ngay: '2026-12-01', ma_so_thue_ben_ban: '12345',
      tien_truoc_thue: 1_000_000, tien_thue: 100_000, tong_tien: '1.500.000', can_xem_lai: ['ben_ban', 'truong_la'],
    }, '2026-09-15');
    expect(r.so_hoa_don).toBe('0001234');
    expect(r.ngay).toBeNull(); // ngày tương lai
    expect(r.ma_so_thue_ben_ban).toBeNull();
    expect(r.tong_tien).toBe(1_500_000);
    expect(r.can_xem_lai).toEqual(['ngay', 'ben_ban', 'ma_so_thue_ben_ban', 'tong_tien']);
  });
});
