import { describe, expect, it } from 'vitest';
import {
  LoiNhaCungCap, docChiPhiAnthropic, docChiPhiOpenAI, gopDong, hienKhoa, kiemDongNhap, laKhoaAdmin, taiChiPhi, urlAnthropic,
  urlOpenAI,
} from './nguon';

/** Phản hồi giả dạng `Response` — đủ `ok`, `status`, `json()` mà `taiChiPhi` đọc. */
const phanHoi = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

describe('Anthropic cost_report', () => {
  it('đọc đúng ví dụ trong tài liệu: amount là chuỗi tính bằng cent', () => {
    const r = docChiPhiAnthropic({
      data: [{
        ending_at: '2025-08-02T00:00:00Z',
        results: [{
          amount: '123.78912', context_window: '0-200k', cost_type: 'tokens', currency: 'USD',
          description: 'Claude Opus 5 Usage - Input Tokens', inference_geo: 'global', model: 'claude-opus-5',
          service_tier: 'standard', token_type: 'uncached_input_tokens', workspace_id: 'wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ',
        }],
        starting_at: '2025-08-01T00:00:00Z',
      }],
      has_more: true,
      next_page: 'page_MjAyNS0wNS0xNFQwMDowMDowMFo=',
    });
    expect(r.tiep).toBe('page_MjAyNS0wNS0xNFQwMDowMDowMFo=');
    expect(r.dong).toEqual([
      { ngay: '2025-08-01', hang_muc: 'claude-opus-5', du_an: 'wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ', so_tien_usd: 1.2378912 },
    ]);
  });

  it('chi phí không theo token thì lấy mô tả; workspace mặc định có workspace_id null', () => {
    const r = docChiPhiAnthropic({
      data: [{ starting_at: '2025-08-01T00:00:00Z', results: [
        { amount: '50', currency: 'USD', description: 'Web Search Usage', cost_type: 'web_search', model: null, workspace_id: null },
      ] }],
      has_more: false,
      next_page: null,
    });
    expect(r.dong).toEqual([{ ngay: '2025-08-01', hang_muc: 'Web Search Usage', du_an: 'Workspace mặc định', so_tien_usd: 0.5 }]);
    expect(r.tiep).toBeNull();
  });

  it('tiền tệ khác USD thì báo lỗi, không lặng lẽ cộng vào tổng', () => {
    expect(() => docChiPhiAnthropic({ data: [{ starting_at: '2025-08-01T00:00:00Z', results: [{ amount: '1', currency: 'EUR' }] }] }))
      .toThrow(LoiNhaCungCap);
  });

  it('URL có khoảng ngày và group_by theo workspace + mô tả', () => {
    const u = new URL(urlAnthropic(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z'), 'p2'));
    expect(u.pathname).toBe('/v1/organizations/cost_report');
    expect(u.searchParams.get('starting_at')).toBe('2026-09-01T00:00:00.000Z');
    expect(u.searchParams.getAll('group_by[]')).toEqual(['workspace_id', 'description']);
    expect(u.searchParams.get('page')).toBe('p2');
  });
});

describe('OpenAI costs', () => {
  it('amount.value là đô la; input và output của cùng mô hình gộp một hạng mục', () => {
    const r = docChiPhiOpenAI({
      object: 'page',
      data: [{
        object: 'bucket', start_time: 1757894400, end_time: 1757980800,
        results: [
          { object: 'organization.costs.result', amount: { value: 0.06, currency: 'usd' }, line_item: 'gpt-4o-2024-08-06, input', project_id: 'proj_1' },
          { object: 'organization.costs.result', amount: { value: 0.04, currency: 'usd' }, line_item: 'gpt-4o-2024-08-06, output', project_id: 'proj_1' },
        ],
      }],
      has_more: false,
      next_page: null,
    });
    expect(gopDong(r.dong)).toEqual([{ ngay: '2025-09-15', hang_muc: 'gpt-4o-2024-08-06', du_an: 'proj_1', so_tien_usd: 0.1 }]);
  });

  it('URL dùng giây Unix, bucket 1 ngày, group_by lặp lại', () => {
    const u = new URL(urlOpenAI(new Date('2025-09-15T00:00:00Z'), new Date('2025-09-16T00:00:00Z')));
    expect(u.searchParams.get('start_time')).toBe('1757894400');
    expect(u.searchParams.get('bucket_width')).toBe('1d');
    expect(u.searchParams.getAll('group_by')).toEqual(['line_item', 'project_id']);
  });
});

describe('tải chi phí', () => {
  const bucket = (ngay: string, cent: string) => ({ starting_at: `${ngay}T00:00:00Z`, results: [{ amount: cent, currency: 'USD', model: 'claude-opus-5' }] });

  it('đi hết các trang, gửi đúng header, không gắn khoá vào URL', async () => {
    const daGui: Array<{ url: string; headers: Record<string, string> }> = [];
    const cacTrang = [
      { data: [bucket('2026-09-01', '100')], has_more: true, next_page: 'p2' },
      { data: [bucket('2026-09-02', '250')], has_more: false, next_page: null },
    ];
    let i = 0;
    const dong = await taiChiPhi('anthropic', 'sk-ant-admin01-khoa-bi-mat-000000', new Date('2026-09-01T00:00:00Z'), new Date('2026-09-03T00:00:00Z'),
      async (url, init) => { daGui.push({ url, headers: init.headers as Record<string, string> }); return phanHoi(200, cacTrang[i++]); });
    expect(dong.map((d) => d.so_tien_usd)).toEqual([1, 2.5]);
    expect(daGui).toHaveLength(2);
    expect(new URL(daGui[1].url).searchParams.get('page')).toBe('p2');
    expect(daGui[0].headers['anthropic-version']).toBe('2023-06-01');
    expect(daGui[0].headers['x-api-key']).toBe('sk-ant-admin01-khoa-bi-mat-000000');
    expect(daGui.every((g) => !g.url.includes('khoa-bi-mat'))).toBe(true);
  });

  it('khoá bị từ chối: lỗi nói cần Admin key, và không lộ khoá', async () => {
    const khoa = 'sk-admin-khoa-bi-mat-1234567890';
    const loi = await taiChiPhi('openai', khoa, new Date(), new Date(), async () =>
      phanHoi(401, { error: { message: 'Incorrect API key provided' } })).catch((e) => e);
    expect(loi).toBeInstanceOf(LoiNhaCungCap);
    expect((loi as LoiNhaCungCap).khoaHong).toBe(true);
    expect((loi as LoiNhaCungCap).message).toContain('Admin API key');
    expect((loi as LoiNhaCungCap).message).not.toContain(khoa);
  });
});

describe('gộp và kiểm dòng', () => {
  it('gộp cộng các dòng trùng khoá, giữ dòng khác', () => {
    const r = gopDong([
      { ngay: '2026-09-01', hang_muc: 'a', du_an: 'x', so_tien_usd: 0.1 },
      { ngay: '2026-09-01', hang_muc: 'a', du_an: 'x', so_tien_usd: 0.2 },
      { ngay: '2026-09-01', hang_muc: 'a', du_an: 'y', so_tien_usd: 1 },
    ]);
    expect(r).toEqual([
      { ngay: '2026-09-01', hang_muc: 'a', du_an: 'x', so_tien_usd: 0.3 },
      { ngay: '2026-09-01', hang_muc: 'a', du_an: 'y', so_tien_usd: 1 },
    ]);
  });

  it('kiểm dòng nhập: ngày thật, không ở tương lai, số tiền là số', () => {
    const homNay = new Date('2026-09-15T08:00:00Z');
    expect(kiemDongNhap({ ngay: '2026-09-01', so_tien_usd: 1.5 }, homNay)).toEqual({
      dong: { ngay: '2026-09-01', hang_muc: 'Khác', du_an: 'Không rõ', so_tien_usd: 1.5 },
    });
    expect(kiemDongNhap({ ngay: '2026-02-30', so_tien_usd: 1 }, homNay).loi).toContain('không hợp lệ');
    expect(kiemDongNhap({ ngay: '2026-10-01', so_tien_usd: 1 }, homNay).loi).toContain('tương lai');
    expect(kiemDongNhap({ ngay: '2026-09-01', so_tien_usd: '1.5' }, homNay).loi).toContain('số tiền');
    // Khoản hoàn/credit trong file xuất là số âm hợp lệ.
    expect(kiemDongNhap({ ngay: '2026-09-01', so_tien_usd: -2 }, homNay).dong?.so_tien_usd).toBe(-2);
  });

  it('khuôn khoá và phần hiện được', () => {
    expect(laKhoaAdmin('anthropic', 'sk-ant-admin01-abcdefghijklmnopqrstu')).toBe(true);
    expect(laKhoaAdmin('anthropic', 'sk-admin-abcdefghijklmnopqrstu')).toBe(false);
    expect(laKhoaAdmin('openai', 'sk-admin-abcdefghijklmnopqrstu')).toBe(true);
    expect(laKhoaAdmin('gemini', 'sk-admin-abcdefghijklmnopqrstu')).toBe(false);
    expect(hienKhoa('sk-ant-admin01-abcdefghijklmnopqrstu')).toBe('sk-ant-admin01…rstu');
    expect(hienKhoa('sk-admin-abcdefghijklmnopqrstu')).toBe('sk-admin-…rstu');
  });
});
