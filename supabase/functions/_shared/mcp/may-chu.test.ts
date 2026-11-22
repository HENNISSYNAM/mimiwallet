import { describe, expect, it, vi } from 'vitest';
import { CONG_CU, HEADER_KHOA_MCP, xuLyMcp, type NguCanh } from './may-chu';

/** MCP bàn kế toán — giao thức: bắt tay, liệt kê, gọi; thiếu khoá vẫn liệt kê được; không công cụ nào hứa ghi sổ. */
const nc = (o: Partial<NguCanh> = {}): NguCanh => ({ coKhoa: true, chay: vi.fn(async () => ({ status: 200, body: { ok: 1 } })), ...o });
const goi = (method: string, params?: unknown, id: number | undefined = 1) => ({ jsonrpc: '2.0', id, method, params });

describe('MCP bàn kế toán — giao thức', () => {
  it('bắt tay: chọn đúng phiên bản client xin, có hướng dẫn "người duyệt"', async () => {
    const r = (await xuLyMcp(goi('initialize', { protocolVersion: '2025-06-18' }), nc())) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.result.protocolVersion).toBe('2025-06-18');
    expect(r.result.instructions).toMatch(/KHÔNG ghi sổ/);
    const r2 = (await xuLyMcp(goi('initialize', { protocolVersion: '1999-01-01' }), nc())) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r2.result.protocolVersion).toBe('2025-11-25');
  });

  it('đúng ba công cụ; hai cái đầu chỉ đọc, cái thứ ba không phá huỷ', async () => {
    const r = (await xuLyMcp(goi('tools/list'), nc({ coKhoa: false }))) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.result.tools.map((t: { name: string }) => t.name)).toEqual(['danh_sach_khach', 'hang_duyet', 'de_xuat_phan_loai']);
    expect(CONG_CU[0].annotations.readOnlyHint).toBe(true);
    expect(CONG_CU[1].annotations.readOnlyHint).toBe(true);
    expect(CONG_CU[2].annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    // "unknown" không phải một đề xuất.
    const loai = (CONG_CU[2].inputSchema as any).properties.loai.enum; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(loai).not.toContain('unknown');
    expect(loai).toContain('business_revenue');
  });

  it('thiếu khoá: không chạy công cụ, nói rõ header cần gửi', async () => {
    const chay = vi.fn();
    const r = (await xuLyMcp(goi('tools/call', { name: 'danh_sach_khach', arguments: {} }), nc({ coKhoa: false, chay }))) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(chay).not.toHaveBeenCalled();
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toContain(HEADER_KHOA_MCP);
  });

  it('409 "đã có người quyết" là câu trả lời, không phải lỗi; 403 là lỗi', async () => {
    const r409 = (await xuLyMcp(goi('tools/call', { name: 'de_xuat_phan_loai', arguments: {} }),
      nc({ chay: async () => ({ status: 409, body: { error: 'đã có người quyết' } }) }))) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r409.result.isError).toBe(false);
    const r403 = (await xuLyMcp(goi('tools/call', { name: 'de_xuat_phan_loai', arguments: {} }),
      nc({ chay: async () => ({ status: 403, body: { error: 'không đủ quyền' } }) }))) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r403.result.isError).toBe(true);
  });

  it('lỗi nội bộ không lộ thông điệp ra ngoài', async () => {
    const r = (await xuLyMcp(goi('tools/call', { name: 'hang_duyet', arguments: {} }),
      nc({ chay: async () => { throw new Error('mật khẩu db = abc'); } }))) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.result.isError).toBe(true);
    expect(JSON.stringify(r)).not.toContain('abc');
  });

  it('công cụ lạ, thông báo, lô', async () => {
    expect(((await xuLyMcp(goi('tools/call', { name: 'xin_chi', arguments: {} }), nc())) as any).error.code).toBe(-32602); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(await xuLyMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, nc())).toBeNull();
    const lo = (await xuLyMcp([goi('ping', undefined, 1), { jsonrpc: '2.0', method: 'notifications/x' }, goi('ping', undefined, 2)], nc())) as unknown[];
    expect(lo).toHaveLength(2);
  });
});
