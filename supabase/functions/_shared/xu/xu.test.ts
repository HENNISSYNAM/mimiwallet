import { describe, expect, it } from 'vitest';
import { kyThangVN, mucNangLuong, phanTramNangLuong, soDuHienThi, xuCuaLuot, type LanGoiTinhXu } from './xu';
import { docXuTruocLuot, truXuSauLuot } from './so-xu';
import { USD_MOT_XU_DE_XUAT, XU_MOT_LAN_GOI_KHONG_RO_GIA_DE_XUAT } from '../billing/bang-gia';

// Giá niêm yết dạng bảng `bang_gia_model` (USD cho một triệu token).
const BANG = [
  { model_id: 'openai/gpt-4o-mini', ten: 'GPT-4o mini', gia_vao_usd_moi_trieu: 0.15, gia_ra_usd_moi_trieu: 0.6 },
  { model_id: 'anthropic/claude-sonnet-4.5', ten: 'Claude Sonnet 4.5', gia_vao_usd_moi_trieu: 3, gia_ra_usd_moi_trieu: 15 },
];
const goi = (p: Partial<LanGoiTinhXu>): LanGoiTinhXu => ({
  nha_cung_cap: 'openrouter', mo_hinh: 'openai/gpt-4o-mini', token_vao: 1000, token_ra: 200, thanh_cong: true, ...p,
});

describe('xu của một lượt hỏi = chi phí token thật, làm tròn lên, số nguyên', () => {
  it('một lần gọi rẻ: tốn ít nhất 1 xu, không bao giờ là số lẻ', () => {
    // 1000×0,15 + 200×0,6 = 270 micro-USD = 0,00027 USD → 0,27 xu → làm tròn lên 1.
    const kq = xuCuaLuot([goi({})], BANG);
    expect(kq.xu).toBe(1);
    expect(Number.isInteger(kq.xu)).toBe(true);
    expect(kq.usd).toBeCloseTo(0.00027, 10);
  });

  it('cộng chi phí MỌI lần gọi rồi làm tròn một lần (không làm tròn từng lần gọi)', () => {
    const ds = [goi({}), goi({}), goi({})]; // 3 × 0,27 xu = 0,81 xu → 1, không phải 3
    expect(xuCuaLuot(ds, BANG).xu).toBe(1);
  });

  it('mô hình đắt tốn nhiều xu hơn, đúng theo bảng giá', () => {
    // 10.000×3 + 2.000×15 = 60.000 micro-USD = 0,06 USD → 60 xu.
    const kq = xuCuaLuot([goi({ mo_hinh: 'anthropic/claude-sonnet-4.5', token_vao: 10_000, token_ra: 2_000 })], BANG);
    expect(kq.xu).toBe(Math.ceil(0.06 / USD_MOT_XU_DE_XUAT));
    expect(kq.xu).toBe(60);
  });

  it('lần gọi hỏng không tính; không tra được giá hoặc không có token thì tính mức cố định đề xuất', () => {
    expect(xuCuaLuot([goi({ thanh_cong: false })], BANG)).toMatchObject({ xu: 0, so_lan_goi: 0 });
    expect(xuCuaLuot([goi({ nha_cung_cap: 'stali', mo_hinh: 'stali-chat' })], BANG)).toMatchObject({ xu: XU_MOT_LAN_GOI_KHONG_RO_GIA_DE_XUAT, khong_ro_gia: 1 });
    expect(xuCuaLuot([goi({ token_vao: null })], BANG).xu).toBe(XU_MOT_LAN_GOI_KHONG_RO_GIA_DE_XUAT);
    expect(xuCuaLuot([], BANG).xu).toBe(0);
  });
});

describe('năng lượng hiển thị', () => {
  it('tháng mới chưa nạp ở máy chủ: hiện đầy hạn mức, không báo sắp hết sai', () => {
    expect(soDuHienThi(12, false, 300)).toBe(300);
    expect(soDuHienThi(12, true, 300)).toBe(12);
    expect(soDuHienThi(null, false, 300)).toBe(300);
    expect(soDuHienThi(null, true, 300)).toBe(0);
  });
  it('phần trăm nguyên, kẹp trong 0–100, làm tròn xuống', () => {
    expect(phanTramNangLuong(299, 300)).toBe(99);
    expect(phanTramNangLuong(900, 300)).toBe(100);
    expect(phanTramNangLuong(0, 300)).toBe(0);
    expect(phanTramNangLuong(5, 0)).toBe(0);
  });
  it('mức năng lượng', () => {
    expect(mucNangLuong(0, 0)).toBe('het');
    expect(mucNangLuong(0, 1)).toBe('thap');
    expect(mucNangLuong(19, 50)).toBe('thap');
    expect(mucNangLuong(30, 90)).toBe('vua');
    expect(mucNangLuong(80, 240)).toBe('day');
  });
  it('tháng theo giờ Việt Nam: 31/10 23:30 giờ UTC đã là tháng 11 ở Việt Nam', () => {
    expect(kyThangVN(new Date('2026-10-31T17:30:00Z'))).toBe('2026-11');
    expect(kyThangVN(new Date('2026-10-31T16:30:00Z'))).toBe('2026-10');
  });
});

describe('sổ xu ở máy chủ chỉ đi qua hàm SQL tru_xu', () => {
  function dbGia(soDu: number, plan: string | null = null) {
    const goiRpc: Record<string, unknown>[] = [];
    const bang = (ten: string) => {
      const b: Record<string, unknown> = {
        select: () => b, eq: () => b, limit: () => b,
        maybeSingle: async () => ({ data: ten === 'subscriptions' && plan ? { plan, current_period_end: '2099-01-01' } : null, error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: ten === 'bang_gia_model' ? BANG : [], error: null }).then(ok),
      };
      return b;
    };
    return {
      goiRpc,
      from: bang,
      rpc: async (ten: string, ts: Record<string, unknown>) => {
        goiRpc.push({ ten, ...ts });
        const tru = Math.min(Number(ts.p_so_xu), soDu);
        soDu -= tru;
        return { data: { da_tru: tru, thieu: Number(ts.p_so_xu) - tru, so_du: soDu }, error: null };
      },
    };
  }

  it('đọc số dư trước lượt: hạn mức theo gói do máy chủ đọc, trừ 0 xu', async () => {
    const db = dbGia(42, 'starter');
    const truoc = await docXuTruocLuot(db, 'c1', '2026-10-11', new Date('2026-10-11T03:00:00Z'));
    expect(truoc).toEqual({ han_muc: 3000, ky_thang: '2026-10', so_du: 42 });
    expect(db.goiRpc[0]).toMatchObject({ ten: 'tru_xu', p_company: 'c1', p_so_xu: 0, p_han_muc_thang: 3000, p_ky_thang: '2026-10' });
  });

  it('lượt không gọi mô hình: 0 xu, không ghi sổ', async () => {
    const db = dbGia(10);
    const kq = await truXuSauLuot(db, 'c1', { han_muc: 300, ky_thang: '2026-10', so_du: 10 }, [], 'ht1');
    expect(kq).toMatchObject({ xu: 0, da_tru: 0, so_du: 10 });
    expect(db.goiRpc).toEqual([]);
  });

  it('lượt gọi mô hình: trừ đúng số xu theo token, kèm tham chiếu hội thoại và chi tiết token', async () => {
    const db = dbGia(100);
    const kq = await truXuSauLuot(db, 'c1', { han_muc: 300, ky_thang: '2026-10', so_du: 100 },
      [{ nha_cung_cap: 'openrouter', mo_hinh: 'anthropic/claude-sonnet-4.5', token_vao: 10_000, token_ra: 2_000, thanh_cong: true }], 'ht1');
    expect(kq).toMatchObject({ xu: 60, da_tru: 60, so_du: 40 });
    expect(db.goiRpc[0]).toMatchObject({ p_so_xu: 60, p_tham_chieu: 'ht1', p_chi_tiet: expect.objectContaining({ token_vao: 10_000, token_ra: 2_000 }) });
  });
});
