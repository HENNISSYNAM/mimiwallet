import { describe, expect, it } from 'vitest';
import { chonCongMoHinh, DIEM_GOI_LOVABLE, DIEM_GOI_OPENROUTER, MO_HINH_OPENROUTER_MAC_DINH, nhaCungCapCua } from './nha-cung-cap';

describe('chọn cổng mô hình theo khoá máy chủ', () => {
  it('không có khoá nào → null (trợ lý chạy bộ hiểu câu cố định)', () => {
    expect(chonCongMoHinh({})).toBeNull();
    expect(chonCongMoHinh({ lovable: '  ', openrouter: '' })).toBeNull();
  });

  it('có khoá Lovable → dùng Lovable (đường cũ), kể cả khi có cả OpenRouter', () => {
    const c = chonCongMoHinh({ lovable: 'lv', openrouter: 'or' });
    expect(c?.ten).toBe('lovable');
    expect(c?.url).toBe(DIEM_GOI_LOVABLE);
  });

  it('chỉ có khoá OpenRouter → dùng OpenRouter với mô hình mặc định; tên mô hình sai khuôn bị bỏ qua', () => {
    const c = chonCongMoHinh({ openrouter: 'or' });
    expect(c).toMatchObject({ ten: 'openrouter', url: DIEM_GOI_OPENROUTER, mo_hinh: MO_HINH_OPENROUTER_MAC_DINH });
    expect(chonCongMoHinh({ openrouter: 'or', moHinhOpenRouter: 'anthropic/claude-sonnet-4.5' })?.mo_hinh).toBe('anthropic/claude-sonnet-4.5');
    expect(chonCongMoHinh({ openrouter: 'or', moHinhOpenRouter: 'x"; drop' })?.mo_hinh).toBe(MO_HINH_OPENROUTER_MAC_DINH);
  });

  it('gọi OpenRouter: đúng địa chỉ, khoá ở Authorization, có tên ứng dụng, mô hình đúng', async () => {
    const c = chonCongMoHinh({ openrouter: 'khoa-thu' })!;
    let url = ''; let init: RequestInit = {};
    const ncc = nhaCungCapCua(c, async (u, i) => {
      url = u; init = i;
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Chào bạn' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }), { status: 200 });
    });
    const r = await ncc.hoi({ mo_hinh: c.mo_hinh, tin: [{ vai: 'nguoi_dung', noi_dung: 'mimi ơi' }] });
    expect(r.noi_dung).toBe('Chào bạn');
    expect(url).toBe(DIEM_GOI_OPENROUTER);
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer khoa-thu');
    expect(h['X-Title']).toBe('MIMI Wallet');
    expect(JSON.parse(String(init.body)).model).toBe(MO_HINH_OPENROUTER_MAC_DINH);
  });
});
