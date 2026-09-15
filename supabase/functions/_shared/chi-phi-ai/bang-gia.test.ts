import { describe, expect, it } from 'vitest';
import { chuanHoaTenModel, deXuatModelReHon, docBangGiaOpenRouter, timGia, type GiaModel } from './bang-gia';

/** Giá dưới đây là đầu vào của test, không phải bảng giá thật. */
const BANG: GiaModel[] = [
  { model_id: 'anthropic/claude-opus-x', ten: 'Opus X', gia_vao_usd_moi_trieu: 10, gia_ra_usd_moi_trieu: 50 },
  { model_id: 'anthropic/claude-sonnet-x', ten: 'Sonnet X', gia_vao_usd_moi_trieu: 3, gia_ra_usd_moi_trieu: 15 },
  { model_id: 'anthropic/claude-haiku-x', ten: 'Haiku X', gia_vao_usd_moi_trieu: 1, gia_ra_usd_moi_trieu: 5 },
  { model_id: 'anthropic/claude-haiku-x:free', ten: 'Haiku X free', gia_vao_usd_moi_trieu: 0, gia_ra_usd_moi_trieu: 0 },
  { model_id: 'openai/gpt-big', ten: 'GPT big', gia_vao_usd_moi_trieu: 2.5, gia_ra_usd_moi_trieu: 10 },
  { model_id: 'openai/gpt-big-2024-08-06', ten: 'GPT big dated', gia_vao_usd_moi_trieu: 2.5, gia_ra_usd_moi_trieu: 10 },
  { model_id: 'openai/gpt-big-mini', ten: 'GPT big mini', gia_vao_usd_moi_trieu: 0.15, gia_ra_usd_moi_trieu: 0.6 },
  { model_id: 'openai/text-embedding-cheap', ten: 'Embed', gia_vao_usd_moi_trieu: 0.01, gia_ra_usd_moi_trieu: 0.01 },
];

describe('bảng giá OpenRouter', () => {
  it('đổi giá mỗi token (chuỗi) thành USD mỗi triệu token, bỏ giá biến động', () => {
    const bang = docBangGiaOpenRouter({
      data: [
        { id: 'openai/gpt-big', name: 'GPT big', pricing: { prompt: '0.0000025', completion: '0.00001' } },
        { id: 'openrouter/auto', name: 'Auto', pricing: { prompt: '-1', completion: '-1' } },
        { id: 'x/khong-gia', name: 'Không giá', pricing: {} },
      ],
    });
    expect(bang).toEqual([{ model_id: 'openai/gpt-big', ten: 'GPT big', gia_vao_usd_moi_trieu: 2.5, gia_ra_usd_moi_trieu: 10 }]);
  });

  it('phản hồi sai khuôn thì báo lỗi, không trả bảng rỗng im lặng', () => {
    expect(() => docBangGiaOpenRouter({ models: [] })).toThrow();
  });

  it('khớp tên model của nhà cung cấp với mã OpenRouter', () => {
    expect(chuanHoaTenModel('anthropic/claude-sonnet-4.5')).toBe('claude-sonnet-4-5');
    expect(chuanHoaTenModel('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5');
    expect(chuanHoaTenModel('gpt-4o-2024-08-06')).toBe('gpt-4o');
    expect(timGia('gpt-big-2024-08-06', 'openai', BANG)?.model_id).toBe('openai/gpt-big');
    expect(timGia('anthropic/claude-opus-x', 'openrouter', BANG)?.model_id).toBe('anthropic/claude-opus-x');
    // Cùng tên nhưng khác hãng thì không khớp.
    expect(timGia('claude-opus-x', 'openai', BANG)).toBeNull();
  });
});

describe('đề xuất model rẻ hơn', () => {
  it('gợi ý bậc thấp hơn gần nhất cùng hãng, tính bằng token thật', () => {
    const { de_xuat, khong_khop } = deXuatModelReHon([
      { nha_cung_cap: 'anthropic', model: 'claude-opus-x-20260101', token_vao: 1_000_000, token_vao_cache: 0, token_ra: 100_000, so_lan_goi: 0 },
      { nha_cung_cap: 'anthropic', model: 'claude-opus-x', token_vao: 1_000_000, token_vao_cache: 0, token_ra: 100_000, so_lan_goi: 0 },
      { nha_cung_cap: 'openai', model: 'gpt-la', token_vao: 5, token_vao_cache: 0, token_ra: 5, so_lan_goi: 1 },
    ], BANG);
    expect(khong_khop).toEqual(['gpt-la']);
    expect(de_xuat).toHaveLength(1);
    const d = de_xuat[0];
    // Opus X → Sonnet X (gần nhất), không nhảy thẳng xuống Haiku hay bản miễn phí.
    expect(d.thay_bang.model_id).toBe('anthropic/claude-sonnet-x');
    // 2M vào × $10 + 0,2M ra × $50 = $30; đổi sang $3/$15 = $9.
    expect(d.chi_phi_uoc_tinh_usd).toBe(30);
    expect(d.chi_phi_neu_doi_usd).toBe(9);
    expect(d.tiet_kiem_usd).toBe(21);
  });

  it('không đem model nhúng (embedding) ra thay model chat', () => {
    const { de_xuat } = deXuatModelReHon(
      [{ nha_cung_cap: 'openai', model: 'gpt-big-mini', token_vao: 10_000_000, token_vao_cache: 0, token_ra: 0, so_lan_goi: 0 }],
      BANG,
    );
    expect(de_xuat).toEqual([]);
  });
});
