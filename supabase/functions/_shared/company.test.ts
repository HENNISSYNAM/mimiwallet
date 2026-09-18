import { describe, expect, it } from 'vitest';
import { danhSachCongTy, kiemQuyen, LoiQuyen, resolveCompany, resolveCompanyVaiTro } from './company';
import { HANH_DONG, type HanhDong, type VaiTro } from './quyen/vai-tro';

/**
 * MIMI-P1-003 — nghiệm thu:
 *   - người xem không duyệt được dù gọi thẳng backend;
 *   - người thuộc nhiều công ty không bị đọc nhầm công ty;
 *   - không phải thành viên thì không vào được công ty đó.
 */

interface DongTV { company_id: string; user_id: string; vai_tro: string; tao_luc: string }
interface DongCT { id: string; name: string; user_id: string | null; created_at: string }

const CONG_TY: DongCT[] = [
  { id: 'c1', name: 'Công ty Một', user_id: 'u-chu', created_at: '2026-01-01' },
  { id: 'c2', name: 'Công ty Hai', user_id: 'u-chu', created_at: '2026-02-01' },
  { id: 'c3', name: 'Công ty Ba (dữ liệu cũ)', user_id: 'u-cu', created_at: '2026-03-01' },
];

const THANH_VIEN: DongTV[] = [
  { company_id: 'c1', user_id: 'u-chu', vai_tro: 'chu_so_huu', tao_luc: '2026-01-01' },
  { company_id: 'c2', user_id: 'u-chu', vai_tro: 'chu_so_huu', tao_luc: '2026-02-01' },
  // Kế toán của công ty 2 — không thuộc công ty 1.
  { company_id: 'c2', user_id: 'u-ke-toan', vai_tro: 'ke_toan', tao_luc: '2026-02-02' },
  { company_id: 'c1', user_id: 'u-xem', vai_tro: 'nguoi_xem', tao_luc: '2026-01-05' },
];

/** CSDL giả: đủ để chạy đúng chuỗi select/eq/order/limit/maybeSingle mà hàm thật dùng. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbGia(loi?: { bang: string; cau: string }): any {
  return {
    from(bang: string) {
      const loc: [string, unknown][] = [];
      const nguon = () => (bang === 'thanh_vien_cong_ty'
        ? THANH_VIEN.map((t) => ({ ...t, companies: CONG_TY.find((c) => c.id === t.company_id) }))
        : CONG_TY.map((c) => ({ ...c })));
      const ketQua = () => {
        if (loi?.bang === bang) return { data: null, error: { message: loi.cau } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ds = nguon().filter((r: any) => loc.every(([k, v]) => r[k] === v));
        ds.sort((a, b) => String(bang === 'thanh_vien_cong_ty' ? a.tao_luc : a.created_at)
          .localeCompare(String(bang === 'thanh_vien_cong_ty' ? b.tao_luc : b.created_at)));
        return { data: ds, error: null };
      };
      const p: Record<string, unknown> = {};
      Object.assign(p, {
        select: () => p,
        eq: (k: string, v: unknown) => { loc.push([k, v]); return p; },
        order: () => p,
        limit: (n: number) => ({
          maybeSingle: () => Promise.resolve({ data: ketQua().data?.[0] ?? null, error: ketQua().error }),
          then: (f: (v: unknown) => unknown) => Promise.resolve({ data: ketQua().data?.slice(0, n) ?? null, error: ketQua().error }).then(f),
        }),
      });
      return p;
    },
  };
}

describe('công ty đang làm việc và vai trò', () => {
  it('chủ nhiều công ty: mặc định công ty vào sớm nhất, chọn công ty nào thì ra đúng công ty đó', async () => {
    const mac = await resolveCompanyVaiTro<{ id: string; name: string }>(dbGia(), 'u-chu', 'id, name');
    expect(mac).toMatchObject({ cong_ty: { id: 'c1' }, vai_tro: 'chu_so_huu' });
    const chon = await resolveCompanyVaiTro<{ id: string; name: string }>(dbGia(), 'u-chu', 'id, name', 'c2');
    expect(chon?.cong_ty.id).toBe('c2');
  });

  it('không phải thành viên thì không vào được công ty đó (không đọc nhầm sang công ty khác)', async () => {
    expect(await resolveCompanyVaiTro(dbGia(), 'u-ke-toan', 'id', 'c1')).toBeNull();
    expect(await resolveCompany(dbGia(), 'u-ke-toan', 'id', 'c1')).toBeNull();
  });

  it('kế toán nhận đúng vai trò của mình, không phải vai chủ', async () => {
    const r = await resolveCompanyVaiTro<{ id: string }>(dbGia(), 'u-ke-toan');
    expect(r).toMatchObject({ cong_ty: { id: 'c2' }, vai_tro: 'ke_toan' });
  });

  it('dữ liệu cũ chưa có dòng thành viên: người tạo công ty vẫn vào được với vai chủ sở hữu', async () => {
    const r = await resolveCompanyVaiTro<{ id: string }>(dbGia(), 'u-cu');
    expect(r).toMatchObject({ cong_ty: { id: 'c3' }, vai_tro: 'chu_so_huu' });
  });

  it('người lạ không có công ty nào', async () => {
    expect(await resolveCompanyVaiTro(dbGia(), 'u-la')).toBeNull();
  });

  it('bảng thành viên lỗi thì vẫn thử đường dự phòng, không ném lỗi', async () => {
    const r = await resolveCompanyVaiTro<{ id: string }>(dbGia({ bang: 'thanh_vien_cong_ty', cau: 'sập' }), 'u-chu');
    expect(r?.cong_ty.id).toBe('c1');
  });

  it('danh sách công ty cho người dùng chọn, kèm vai trò', async () => {
    expect(await danhSachCongTy(dbGia(), 'u-chu')).toEqual([
      { id: 'c1', ten: 'Công ty Một', vai_tro: 'chu_so_huu' },
      { id: 'c2', ten: 'Công ty Hai', vai_tro: 'chu_so_huu' },
    ]);
  });
});

describe('chặn ở backend, không phải ở nút bấm', () => {
  const goiThang = (vai: VaiTro, h: HanhDong) => {
    try {
      kiemQuyen(vai, h, 'không đủ quyền');
      return 'cho_phep';
    } catch (e) {
      return e instanceof LoiQuyen ? 'chan' : 'loi_khac';
    }
  };

  it('người xem gọi thẳng backend vẫn không duyệt, không từ chối, không cấp khoá agent', () => {
    for (const h of ['duyet_chi', 'quan_ly_agent', 'cap_khoa_agent', 'noi_ngan_hang', 'ghi_chung_tu'] as HanhDong[]) {
      expect(goiThang('nguoi_xem', h), h).toBe('chan');
    }
    expect(goiThang('nguoi_xem', 'hoi_tro_ly')).toBe('cho_phep');
  });

  it('kế toán bị chặn đúng ở duyệt chi, vẫn ghi được chứng từ và soạn tờ khai', () => {
    expect(goiThang('ke_toan', 'duyet_chi')).toBe('chan');
    expect(goiThang('ke_toan', 'ghi_chung_tu')).toBe('cho_phep');
    expect(goiThang('ke_toan', 'soan_to_khai')).toBe('cho_phep');
  });

  it('người duyệt không đổi được kết nối ngân hàng', () => {
    expect(goiThang('nguoi_duyet', 'noi_ngan_hang')).toBe('chan');
    expect(goiThang('nguoi_duyet', 'duyet_chi')).toBe('cho_phep');
  });

  it('chủ doanh nghiệp làm được mọi việc', () => {
    for (const h of HANH_DONG) expect(goiThang('chu_so_huu', h), h).toBe('cho_phep');
  });

  it('lỗi quyền mang đủ thông tin để trả 403 có nghĩa', () => {
    try {
      kiemQuyen('nguoi_xem', 'duyet_chi', 'Vai trò của bạn không được duyệt chi.');
      throw new Error('phải ném lỗi');
    } catch (e) {
      expect(e).toBeInstanceOf(LoiQuyen);
      expect((e as LoiQuyen).hanh_dong).toBe('duyet_chi');
      expect((e as LoiQuyen).vai_tro).toBe('nguoi_xem');
      expect((e as LoiQuyen).message).toContain('không được duyệt chi');
    }
  });
});
