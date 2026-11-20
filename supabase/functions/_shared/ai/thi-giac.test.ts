import { describe, expect, it } from 'vitest';
import { docCauHinh, kiemAnh, MO_HINH_BEDROCK_MAC_DINH, nhinAnh } from './thi-giac';

const ANH = 'iVBORw0KGgo=';
const traVe = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('kiemAnh', () => {
  it('nhận data URI, bỏ tiền tố', () => {
    const k = kiemAnh(`data:image/png;base64,${ANH}`, 'image/png');
    expect(k).toEqual({ ok: true, anh: ANH, mime: 'image/png' });
  });
  it('từ chối mime lạ, chuỗi không phải base64, ảnh quá lớn, rỗng', () => {
    expect(kiemAnh(ANH, 'image/gif').ok).toBe(false);
    expect(kiemAnh('<script>', 'image/png').ok).toBe(false);
    expect(kiemAnh('A'.repeat(2_800_001), 'image/png').ok).toBe(false);
    expect(kiemAnh('', 'image/png').ok).toBe(false);
  });
});

describe('nhinAnh', () => {
  it('Bedrock trước: đúng URL vùng, mã hoá id mô hình, khoá Bearer, ảnh dạng bytes', async () => {
    const goiLai: Array<{ url: string; init: RequestInit }> = [];
    const r = await nhinAnh({
      cauHinh: { bedrockKhoa: 'kb', bedrockVung: 'ap-southeast-1', openrouterKhoa: 'ko' },
      anh: ANH, mime: 'image/png', loiDan: 'đọc',
      goi: async (url, init) => { goiLai.push({ url, init }); return traVe(200, { output: { message: { content: [{ text: '{"la_bill":true}' }] } } }); },
    });
    expect(r.nha_cung_cap).toBe('bedrock');
    expect(r.van).toBe('{"la_bill":true}');
    expect(goiLai).toHaveLength(1);
    expect(goiLai[0].url).toBe(`https://bedrock-runtime.ap-southeast-1.amazonaws.com/model/${encodeURIComponent(MO_HINH_BEDROCK_MAC_DINH)}/converse`);
    expect((goiLai[0].init.headers as Record<string, string>).Authorization).toBe('Bearer kb');
    const body = JSON.parse(String(goiLai[0].init.body));
    expect(body.messages[0].content[0]).toEqual({ image: { format: 'png', source: { bytes: ANH } } });
  });

  it('Bedrock lỗi → OpenRouter, ghi lý do', async () => {
    const r = await nhinAnh({
      cauHinh: { bedrockKhoa: 'kb', openrouterKhoa: 'ko' },
      anh: ANH, mime: 'image/jpeg', loiDan: 'đọc',
      goi: async (url) => url.includes('bedrock') ? traVe(403, {}) : traVe(200, { choices: [{ message: { content: 'ok' } }] }),
    });
    expect(r.nha_cung_cap).toBe('openrouter');
    expect(r.van).toBe('ok');
    expect(r.loi).toEqual(['bedrock: bedrock 403']);
  });

  it('hết cả hai → van null, không ném lỗi', async () => {
    const r = await nhinAnh({
      cauHinh: { bedrockKhoa: 'kb', openrouterKhoa: 'ko' },
      anh: ANH, mime: 'image/jpeg', loiDan: 'đọc',
      goi: async () => { throw new Error('mạng'); },
    });
    expect(r.van).toBeNull();
    expect(r.loi).toHaveLength(2);
  });

  it('không có khoá nào → nói rõ', async () => {
    const r = await nhinAnh({ cauHinh: {}, anh: ANH, mime: 'image/jpeg', loiDan: 'đọc', goi: async () => traVe(200, {}) });
    expect(r.van).toBeNull();
    expect(r.loi).toEqual(['chưa có khoá mô hình thị giác']);
  });

  it('vùng / mô hình sai khuôn trong biến môi trường → dùng mặc định, không chèn vào URL', async () => {
    let url = '';
    await nhinAnh({
      cauHinh: { bedrockKhoa: 'kb', bedrockVung: 'evil.com/x', bedrockMoHinh: 'a b?c' },
      anh: ANH, mime: 'image/jpeg', loiDan: 'đọc',
      goi: async (u) => { url = u; return traVe(200, { output: { message: { content: [{ text: 'x' }] } } }); },
    });
    expect(url.startsWith('https://bedrock-runtime.ap-southeast-1.amazonaws.com/model/apac.amazon.nova-lite-v1%3A0/')).toBe(true);
  });

  it('docCauHinh đọc đúng tên biến', () => {
    const env: Record<string, string> = { BEDROCK_API_KEY: 'a', BEDROCK_REGION: 'ap-southeast-1', OPENROUTER_API_KEY: 'b' };
    expect(docCauHinh((k) => env[k])).toMatchObject({ bedrockKhoa: 'a', bedrockVung: 'ap-southeast-1', openrouterKhoa: 'b' });
  });
});
