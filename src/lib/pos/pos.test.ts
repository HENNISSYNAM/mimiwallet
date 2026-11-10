import { describe, expect, it, vi } from 'vitest';
import { bamPhim, dinhDangDong, TOI_DA_SO_TIEN } from './banPhim';
import { dongBoHangDoi, docHangDoi, KHOA_HANG_DOI, nenThuLai, sinhClientId, themVaoHangDoi, type BanCho, type KhoLuu } from './hangDoi';
import { crc16, taoChuoiVietQr } from '@/lib/vietqr';

const kho = (): KhoLuu & { du: Record<string, string> } => {
  const du: Record<string, string> = {};
  return { du, getItem: (k) => du[k] ?? null, setItem: (k, v) => { du[k] = v; } };
};
const ban = (id: string, so = 30_000): BanCho => ({ client_id: id, so_tien: so, phuong_thuc: 'cash', ghi_chu: null, dong_hang: [], ban_luc: '2026-11-10T03:00:00Z', company_id: 'c1' });

describe('bàn phím số', () => {
  it('gõ 3,5,000 → 35000; xoá lùi; xoá hết', () => {
    let s = '';
    for (const p of ['3', '5', '000'] as const) s = bamPhim(s, p);
    expect(s).toBe('35000');
    expect(bamPhim(s, 'xoa')).toBe('3500');
    expect(bamPhim(s, 'xoa_het')).toBe('');
  });
  it('không bắt đầu bằng 0, không vượt trần 10 tỷ', () => {
    expect(bamPhim('', '0')).toBe('');
    expect(bamPhim('', '000')).toBe('');
    expect(bamPhim(String(TOI_DA_SO_TIEN), '0')).toBe(String(TOI_DA_SO_TIEN));
  });
  it('định dạng tiền kiểu Việt Nam', () => {
    expect(dinhDangDong(1250000)).toBe('1.250.000');
    expect(dinhDangDong(500)).toBe('500');
  });
});

describe('VietQR cho lần bán tại quầy', () => {
  it('payload EMVCo mang đúng BIN, tài khoản, số tiền, mã tham chiếu, và CRC16 đúng', () => {
    const s = taoChuoiVietQr({ bankBin: '970422', accountNumber: '0123456789', amount: 35_000, addInfo: 'MIMIK7P2QX' });
    expect(s.startsWith('000201010212')).toBe(true); // mã dùng một lần vì có số tiền
    expect(s).toContain('0006970422');
    expect(s).toContain('01100123456789');
    expect(s).toContain('540535000');
    expect(s).toContain('62140810MIMIK7P2QX');
    expect(s.slice(-8, -4)).toBe('6304');
    expect(s.slice(-4)).toBe(crc16(s.slice(0, -4)));
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('hàng đợi tiền mặt ngoại tuyến', () => {
  it('thêm trùng client_id (bấm hai lần) chỉ giữ một', () => {
    const k = kho();
    themVaoHangDoi(ban('a'), k);
    themVaoHangDoi(ban('a'), k);
    themVaoHangDoi(ban('b'), k);
    expect(docHangDoi(k).map((x) => x.client_id)).toEqual(['a', 'b']);
  });

  it('đồng bộ: gửi được thì gỡ; mất mạng thì dừng và giữ phần còn lại', async () => {
    const k = kho();
    for (const id of ['a', 'b', 'c']) themVaoHangDoi(ban(id), k);
    const gui = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 0, cau: 'Mất kết nối mạng.' });
    const kq = await dongBoHangDoi(gui, k);
    expect(kq).toEqual({ da_gui: 1, con_lai: 2, bi_tu_choi: [] });
    expect(docHangDoi(k).map((x) => x.client_id)).toEqual(['b', 'c']);
  });

  it('idempotent: gửi lại cùng hàng hai lần, máy chủ (khoá client_id) chỉ ghi mỗi lần bán một dòng', async () => {
    const may: Record<string, BanCho> = {};
    const gui = async (b: BanCho) => { may[b.client_id] ??= b; return { ok: true as const }; };
    const k1 = kho();
    themVaoHangDoi(ban('a'), k1);
    themVaoHangDoi(ban('b'), k1);
    // Mô phỏng tab thứ hai còn giữ bản sao cũ của hàng đợi.
    const k2 = kho();
    k2.du[KHOA_HANG_DOI] = k1.du[KHOA_HANG_DOI];
    await dongBoHangDoi(gui, k1);
    await dongBoHangDoi(gui, k2);
    expect(Object.keys(may).sort()).toEqual(['a', 'b']);
    expect(docHangDoi(k1)).toEqual([]);
  });

  it('bị từ chối hẳn (4xx) thì gỡ khỏi hàng và báo lại', async () => {
    const k = kho();
    themVaoHangDoi(ban('a'), k);
    const kq = await dongBoHangDoi(async () => ({ ok: false, status: 403, cau: 'Vai trò Người xem không thu tiền được.' }), k);
    expect(kq.bi_tu_choi[0].cau).toMatch(/Người xem/);
    expect(kq.con_lai).toBe(0);
    expect(nenThuLai(503)).toBe(true);
    expect(nenThuLai(400)).toBe(false);
  });

  it('bộ nhớ bị chặn hoặc hỏng: không ném lỗi, báo không lưu được', () => {
    const hong: KhoLuu = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(docHangDoi(hong)).toEqual([]);
    expect(themVaoHangDoi(ban('a'), hong)).toBe(false);
    const rac = kho();
    rac.du[KHOA_HANG_DOI] = '{không phải json';
    expect(docHangDoi(rac)).toEqual([]);
  });

  it('client_id là uuid v4 và không trùng', () => {
    const ds = Array.from({ length: 500 }, sinhClientId);
    expect(new Set(ds).size).toBe(500);
    for (const x of ds) expect(x).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
