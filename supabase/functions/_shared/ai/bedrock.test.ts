import { describe, expect, it, vi } from 'vitest';
import { chonBedrock, congBedrock, diemGoiBedrock, goiCoDuPhong, MO_HINH_BEDROCK_MAC_DINH, sangConverse } from './bedrock';
import { LoiNhaCungCap, type NhaCungCap } from './nha-cung-cap';

/** Cổng Amazon Bedrock: đúng khuôn Converse, khoá chỉ ở header, khoá hết hạn → cổng dự phòng và nói rõ. */
const traVe = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('cấu hình', () => {
  it('thiếu khoá → không dùng; vùng / mô hình lạ → mặc định, không ghép chuỗi lạ vào URL', () => {
    expect(chonBedrock({ khoa: '  ' })).toBeNull();
    expect(chonBedrock({ khoa: 'k', vung: 'evil.com/x', mo_hinh: 'a/../b' })).toEqual({ khoa: 'k', vung: 'ap-southeast-1', mo_hinh: MO_HINH_BEDROCK_MAC_DINH });
    expect(chonBedrock({ khoa: 'k', vung: 'us-east-1', mo_hinh: 'us.amazon.nova-pro-v1:0' })).toMatchObject({ vung: 'us-east-1', mo_hinh: 'us.amazon.nova-pro-v1:0' });
    expect(diemGoiBedrock('ap-southeast-1', 'apac.amazon.nova-lite-v1:0')).toBe('https://bedrock-runtime.ap-southeast-1.amazonaws.com/model/apac.amazon.nova-lite-v1%3A0/converse');
  });

  it('tin hệ thống vào system; tin cùng vai liền nhau gộp lại', () => {
    expect(sangConverse([
      { vai: 'he_thong', noi_dung: 'luật' }, { vai: 'nguoi_dung', noi_dung: 'a' }, { vai: 'nguoi_dung', noi_dung: 'b' }, { vai: 'tro_ly', noi_dung: 'c' },
    ])).toEqual({
      system: [{ text: 'luật' }],
      messages: [{ role: 'user', content: [{ text: 'a' }, { text: 'b' }] }, { role: 'assistant', content: [{ text: 'c' }] }],
    });
  });
});

describe('gọi Bedrock', () => {
  it('Bearer ở header, đọc văn bản + token', async () => {
    const goi = traVe(200, { output: { message: { content: [{ text: '[{"id":"a"' }, { text: '}]' }] } }, usage: { inputTokens: 120, outputTokens: 30 } });
    const r = await congBedrock({ khoa: 'KHOA', vung: 'ap-southeast-1', mo_hinh: MO_HINH_BEDROCK_MAC_DINH }, goi)
      .hoi({ mo_hinh: MO_HINH_BEDROCK_MAC_DINH, tin: [{ vai: 'nguoi_dung', noi_dung: 'x' }] });
    expect(r).toEqual({ noi_dung: '[{"id":"a"}]', goi_cong_cu: [], token_vao: 120, token_ra: 30, chi_phi_usd: null });
    const [url, init] = goi.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('bedrock-runtime.ap-southeast-1.amazonaws.com');
    expect(url).not.toContain('KHOA');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer KHOA');
  });

  it('khoá hết hạn (403) / sai khuôn → lỗi rõ', async () => {
    const c = { khoa: 'k', vung: 'ap-southeast-1', mo_hinh: MO_HINH_BEDROCK_MAC_DINH };
    await expect(congBedrock(c, traVe(403, {})).hoi({ mo_hinh: c.mo_hinh, tin: [] })).rejects.toMatchObject({ status: 403, message: /hết hạn/ });
    await expect(congBedrock(c, traVe(200, { khac: 1 })).hoi({ mo_hinh: c.mo_hinh, tin: [] })).rejects.toMatchObject({ status: 502 });
  });
});

describe('cổng dự phòng', () => {
  const ncc = (f: () => Promise<unknown>): NhaCungCap => ({ ten: 't', hoi: f as NhaCungCap['hoi'] });
  const ok = { noi_dung: 'ok', goi_cong_cu: [], token_vao: 1, token_ra: 1 };

  it('Bedrock lỗi → chạy cổng sau, ghi lại lỗi của Bedrock', async () => {
    const r = await goiCoDuPhong([
      { ten_hien_thi: 'Amazon Bedrock', ncc: ncc(async () => { throw new LoiNhaCungCap(403, 'Khoá Bedrock hết hạn hoặc không đủ quyền.'); }), mo_hinh: 'm' },
      { ten_hien_thi: 'cổng dự phòng stali', ncc: ncc(async () => ok), mo_hinh: 'n' },
    ], []);
    expect(r.cong).toBe('cổng dự phòng stali');
    expect(r.loi_truoc).toEqual(['Amazon Bedrock: Khoá Bedrock hết hạn hoặc không đủ quyền.']);
  });

  it('Bedrock chạy → không gọi cổng sau; hết cổng → ném lỗi', async () => {
    const sau = vi.fn(async () => ok);
    const r = await goiCoDuPhong([{ ten_hien_thi: 'Amazon Bedrock', ncc: ncc(async () => ok), mo_hinh: 'm' }, { ten_hien_thi: 's', ncc: ncc(sau), mo_hinh: 'n' }], []);
    expect(r).toMatchObject({ cong: 'Amazon Bedrock', loi_truoc: [] });
    expect(sau).not.toHaveBeenCalled();
    await expect(goiCoDuPhong([], [])).rejects.toBeInstanceOf(LoiNhaCungCap);
  });
});
