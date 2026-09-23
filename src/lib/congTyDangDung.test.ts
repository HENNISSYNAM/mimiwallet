import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * "Công ty đang dùng": thành viên được mời phải thấy đúng công ty mình, không chỉ người tạo.
 * CSDL giả — dữ liệu dưới đây là đầu vào của test.
 */

const gia = vi.hoisted(() => ({
  thanhVien: [] as Record<string, unknown>[],
  congTyTao: null as Record<string, unknown> | null,
  hoi: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-ke-toan' } } }), getSession: async () => ({ data: { session: { user: { id: 'u-ke-toan' } } }, error: null }) },
    from: (bang: string) => {
      gia.hoi.push(bang);
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.order = () => q;
      q.limit = () => q;
      q.maybeSingle = () => Promise.resolve({ data: gia.congTyTao, error: null });
      q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: gia.thanhVien, error: null }).then(ok);
      return q;
    },
  },
}));

const nap = async () => {
  vi.resetModules();
  return import('./congTyDangDung');
};

beforeEach(() => {
  gia.thanhVien = [];
  gia.congTyTao = null;
  gia.hoi = [];
  localStorage.clear();
});

describe('công ty đang dùng', () => {
  it('kế toán được mời (không tạo công ty nào) vẫn có công ty, đúng vai trò', async () => {
    gia.thanhVien = [{ vai_tro: 'ke_toan', tao_luc: '2026-09-01', companies: { id: 'cty-A', name: 'Thịnh Phát' } }];
    const m = await nap();
    expect(await m.congTyDangDung()).toEqual({ id: 'cty-A', ten: 'Thịnh Phát', vai_tro: 'ke_toan' });
    // Không rơi xuống nhánh "công ty do mình tạo".
    expect(gia.hoi).toEqual(['thanh_vien_cong_ty']);
  });

  it('thuộc nhiều công ty: mặc định công ty tham gia sớm nhất; chọn công ty khác thì nhớ lựa chọn', async () => {
    gia.thanhVien = [
      { vai_tro: 'chu_so_huu', tao_luc: '2026-08-01', companies: { id: 'cty-A', name: 'A' } },
      { vai_tro: 'ke_toan', tao_luc: '2026-09-01', companies: { id: 'cty-B', name: 'B' } },
    ];
    let m = await nap();
    expect((await m.congTyDangDung())?.id).toBe('cty-A');
    const nghe = vi.fn();
    window.addEventListener(m.SU_KIEN_DOI_CONG_TY, nghe);
    m.chonCongTy('cty-B');
    expect(nghe).toHaveBeenCalled();
    expect((await m.congTyDangDung())?.id).toBe('cty-B');
    // Tải lại trang (module mới) vẫn nhớ.
    m = await nap();
    expect((await m.congTyDangDung())?.vai_tro).toBe('ke_toan');
  });

  it('lựa chọn cũ không còn trong danh sách (bị gỡ khỏi công ty) thì về công ty mặc định', async () => {
    localStorage.setItem('mimi:cong-ty-dang-dung', 'cty-da-bi-go');
    gia.thanhVien = [{ vai_tro: 'chu_so_huu', tao_luc: '2026-08-01', companies: { id: 'cty-A', name: 'A' } }];
    const m = await nap();
    expect((await m.congTyDangDung())?.id).toBe('cty-A');
  });

  it('dữ liệu cũ chưa có dòng thành viên: dùng công ty do chính người này tạo, là chủ sở hữu', async () => {
    gia.congTyTao = { id: 'cty-cu', name: 'Cũ' };
    const m = await nap();
    expect(await m.congTyDangDung()).toEqual({ id: 'cty-cu', ten: 'Cũ', vai_tro: 'chu_so_huu' });
  });

  it('kemCongTy: thêm company_id đang chọn; không ghi đè khi nơi gọi đã tự đặt; không có công ty thì gửi như cũ', async () => {
    gia.thanhVien = [{ vai_tro: 'ke_toan', tao_luc: '2026-09-01', companies: { id: 'cty-B', name: 'B' } }];
    let m = await nap();
    expect(await m.kemCongTy({ cau: 'x' })).toEqual({ cau: 'x', company_id: 'cty-B' });
    expect(await m.kemCongTy({ company_id: 'cty-khac' })).toEqual({ company_id: 'cty-khac' });
    gia.thanhVien = [];
    m = await nap();
    expect(await m.kemCongTy({ cau: 'x' })).toEqual({ cau: 'x' });
  });
});
