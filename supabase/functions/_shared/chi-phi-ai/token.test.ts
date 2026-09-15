import { describe, expect, it } from 'vitest';
import { docHoatDongOpenRouter, docTokenAnthropic, docTokenOpenAI, gopToken, taiToken, urlTokenAnthropic } from './token';

/** Phản hồi dựng theo khuôn trong tài liệu nhà cung cấp; số là đầu vào của test. */
describe('đọc token Anthropic', () => {
  it('token vào gồm chưa cache + ghi cache + đọc cache; phần đọc cache ghi riêng', () => {
    const { dong, tiep } = docTokenAnthropic({
      data: [{
        starting_at: '2026-09-01T00:00:00Z',
        ending_at: '2026-09-02T00:00:00Z',
        results: [{
          model: 'claude-opus-5',
          uncached_input_tokens: 1500,
          cache_creation: { ephemeral_1h_input_tokens: 100, ephemeral_5m_input_tokens: 50 },
          cache_read_input_tokens: 200,
          output_tokens: 500,
        }],
      }],
      has_more: true,
      next_page: 'page_abc',
    });
    expect(dong).toEqual([{ ngay: '2026-09-01', model: 'claude-opus-5', token_vao: 1850, token_vao_cache: 200, token_ra: 500, so_lan_goi: 0 }]);
    expect(tiep).toBe('page_abc');
  });

  it('URL nhóm theo model, theo ngày, tối đa 31 bucket', () => {
    const u = new URL(urlTokenAnthropic(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-15T00:00:00Z')));
    expect(u.pathname).toBe('/v1/organizations/usage_report/messages');
    expect(u.searchParams.getAll('group_by[]')).toEqual(['model']);
    expect(u.searchParams.get('bucket_width')).toBe('1d');
    expect(u.searchParams.get('limit')).toBe('31');
  });
});

describe('đọc token OpenAI', () => {
  it('lấy input/output/cache/số lần gọi; cache không vượt tổng', () => {
    const { dong, tiep } = docTokenOpenAI({
      data: [{
        start_time: 1756684800,
        results: [
          { model: 'gpt-4o-2024-08-06', input_tokens: 1000, input_cached_tokens: 300, output_tokens: 200, num_model_requests: 7 },
          { model: 'gpt-4o-mini', input_tokens: 10, input_cached_tokens: 99, output_tokens: 1, num_model_requests: 1 },
        ],
      }],
      has_more: false,
      next_page: null,
    });
    expect(dong[0]).toEqual({ ngay: '2025-09-01', model: 'gpt-4o-2024-08-06', token_vao: 1000, token_vao_cache: 300, token_ra: 200, so_lan_goi: 7 });
    expect(dong[1].token_vao_cache).toBe(10);
    expect(tiep).toBeNull();
  });
});

describe('đọc hoạt động OpenRouter', () => {
  it('một dòng cho ra cả token lẫn tiền; token suy luận tính vào đầu ra', () => {
    const { token, chi_phi } = docHoatDongOpenRouter({
      data: [{ date: '2026-09-10', model: 'anthropic/claude-sonnet-x', usage: 0.42, requests: 3, prompt_tokens: 900, completion_tokens: 100, reasoning_tokens: 50 }],
    });
    expect(token).toEqual([{ ngay: '2026-09-10', model: 'anthropic/claude-sonnet-x', token_vao: 900, token_vao_cache: 0, token_ra: 150, so_lan_goi: 3 }]);
    expect(chi_phi).toEqual([{ ngay: '2026-09-10', hang_muc: 'anthropic/claude-sonnet-x', du_an: 'OpenRouter', so_tien_usd: 0.42 }]);
  });

  it('ngày hỏng thì báo lỗi', () => {
    expect(() => docHoatDongOpenRouter({ data: [{ date: 'hôm qua', model: 'x' }] })).toThrow();
  });
});

describe('tải token', () => {
  it('đi hết các trang, khoá không lọt vào thông điệp lỗi', async () => {
    const khoa = 'sk-ant-admin01-bi-mat-khong-duoc-lo';
    const trang = [
      { data: [{ starting_at: '2026-09-01T00:00:00Z', results: [{ model: 'm', uncached_input_tokens: 1, output_tokens: 1 }] }], has_more: true, next_page: 'p2' },
      { data: [{ starting_at: '2026-09-02T00:00:00Z', results: [{ model: 'm', uncached_input_tokens: 2, output_tokens: 2 }] }], has_more: false, next_page: null },
    ];
    let lan = 0;
    const dong = await taiToken('anthropic', khoa, new Date('2026-09-01'), new Date('2026-09-03'), async () =>
      new Response(JSON.stringify(trang[lan++]), { status: 200 }));
    expect(dong.map((d) => d.token_vao)).toEqual([1, 2]);

    await expect(taiToken('anthropic', khoa, new Date(), new Date(), async () =>
      new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401 })))
      .rejects.toThrow(/từ chối khoá/);
    try {
      await taiToken('anthropic', khoa, new Date(), new Date(), async () => new Response('{}', { status: 401 }));
    } catch (e) {
      expect(String((e as Error).message)).not.toContain(khoa);
    }
  });

  it('gộp dòng trùng ngày + model', () => {
    expect(gopToken([
      { ngay: '2026-09-01', model: 'm', token_vao: 1, token_vao_cache: 0, token_ra: 1, so_lan_goi: 1 },
      { ngay: '2026-09-01', model: 'm', token_vao: 2, token_vao_cache: 1, token_ra: 2, so_lan_goi: 0 },
    ])).toEqual([{ ngay: '2026-09-01', model: 'm', token_vao: 3, token_vao_cache: 1, token_ra: 3, so_lan_goi: 1 }]);
  });
});
