import { describe, expect, it, vi } from 'vitest';
import { CONG_CU, PHIEN_BAN_HO_TRO, tomTat, xuLyMcp, type NguCanh } from './may-chu';

const nc = (sua: Partial<NguCanh> = {}): NguCanh => ({
  coKhoa: true,
  chay: vi.fn(async () => ({ status: 200, body: { ok: true } })),
  ...sua,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const goi = async (method: string, params?: unknown, ngu = nc()): Promise<any> =>
  xuLyMcp({ jsonrpc: '2.0', id: 1, method, params }, ngu);

describe('bắt tay', () => {
  it('dùng đúng phiên bản client xin nếu hỗ trợ', async () => {
    const r = await goi('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(r.result.protocolVersion).toBe('2025-06-18');
    expect(r.result.capabilities.tools).toBeDefined();
    expect(r.result.serverInfo.name).toBe('mimi-wallet');
  });

  it('client xin bản lạ thì trả bản mới nhất mình có', async () => {
    const r = await goi('initialize', { protocolVersion: '1999-01-01' });
    expect(r.result.protocolVersion).toBe(PHIEN_BAN_HO_TRO[0]);
  });

  it('thông báo không được trả lời', async () => {
    expect(await xuLyMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, nc())).toBeNull();
  });

  it('ping', async () => {
    expect((await goi('ping')).result).toEqual({});
  });
});

describe('danh sách công cụ', () => {
  it('liệt kê được cả khi chưa có khoá', async () => {
    const r = await goi('tools/list', undefined, nc({ coKhoa: false }));
    expect(r.result.tools.map((t: { name: string }) => t.name)).toEqual(['xem_chinh_sach', 'xin_chi', 'xem_yeu_cau', 'tra_ma_ngan_hang']);
  });

  it('tên công cụ đúng khuôn MCP và có schema object', () => {
    for (const c of CONG_CU) {
      expect(c.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(c.inputSchema.type).toBe('object');
      expect(c.description.length).toBeGreaterThan(30);
    }
  });

  it('xin_chi bắt buộc đủ trường mà bộ luật cần', () => {
    const xin = CONG_CU.find((c) => c.name === 'xin_chi')!;
    expect(xin.inputSchema.required).toEqual(['so_tien', 'ngan_hang_bin', 'so_tai_khoan', 'nhom_chi', 'muc_dich']);
  });
});

describe('gọi công cụ', () => {
  it('thiếu khoá thì báo rõ header, không chạy gì', async () => {
    const ngu = nc({ coKhoa: false });
    const r = await goi('tools/call', { name: 'xem_chinh_sach', arguments: {} }, ngu);
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toContain('x-mimi-agent-key');
    expect(ngu.chay).not.toHaveBeenCalled();
  });

  it('công cụ không có là lỗi giao thức -32602', async () => {
    const r = await goi('tools/call', { name: 'chuyen_tien', arguments: {} });
    expect(r.error.code).toBe(-32602);
  });

  it('chuyển đúng tên và đối số xuống bộ xử lý', async () => {
    const ngu = nc();
    await goi('tools/call', { name: 'xin_chi', arguments: { so_tien: 1000 } }, ngu);
    expect(ngu.chay).toHaveBeenCalledWith('xin_chi', { so_tien: 1000 });
  });

  it('bị từ chối theo chính sách (422) KHÔNG phải lỗi công cụ', async () => {
    const ngu = nc({
      chay: async () => ({
        status: 422,
        body: { yeu_cau: { trang_thai: 'tu_choi', ly_do: [{ ma: 'VUOT_HAN_MUC_NGAY', cau: 'Hôm nay còn 0đ.' }] } },
      }),
    });
    const r = await goi('tools/call', { name: 'xin_chi', arguments: {} }, ngu);
    expect(r.result.isError).toBe(false);
    expect(r.result.content[0].text).toContain('Bị từ chối');
    expect(r.result.structuredContent.yeu_cau.trang_thai).toBe('tu_choi');
  });

  it('khoá sai (401) là lỗi công cụ', async () => {
    const ngu = nc({ chay: async () => ({ status: 401, body: { error: 'Khoá agent không hợp lệ.' } }) });
    const r = await goi('tools/call', { name: 'xem_chinh_sach', arguments: {} }, ngu);
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toContain('Khoá agent không hợp lệ');
  });

  it('bộ xử lý ném lỗi thì vẫn trả kết quả JSON-RPC, không sập', async () => {
    const ngu = nc({ chay: async () => { throw new Error('db down'); } });
    const r = await goi('tools/call', { name: 'xem_chinh_sach', arguments: {} }, ngu);
    expect(r.result.isError).toBe(true);
  });
});

describe('JSON-RPC', () => {
  it('method lạ là -32601', async () => {
    expect((await goi('resources/list')).error.code).toBe(-32601);
  });

  it('thông điệp sai khuôn là -32600', async () => {
    expect(((await xuLyMcp({ id: 1, method: 'ping' }, nc())) as any).error.code).toBe(-32600); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(((await xuLyMcp('rac', nc())) as any).error.code).toBe(-32600); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('mảng thông điệp: trả lời những cái có id, bỏ thông báo', async () => {
    const r = (await xuLyMcp(
      [{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }],
      nc(),
    )) as unknown[];
    expect(r).toHaveLength(1);
  });
});

describe('câu tóm tắt cho mô hình', () => {
  it('đã duyệt nhắc rằng MIMI không chuyển tiền', () => {
    const s = tomTat('xin_chi', { status: 200, body: { yeu_cau: { trang_thai: 'da_duyet', so_tien: 500000, ma_tham_chieu: 'MIMIAB23CD' } } });
    expect(s).toContain('không chuyển tiền');
    expect(s).toContain('MIMIAB23CD');
  });

  it('chờ duyệt dặn đừng xin khoản khác thay thế', () => {
    expect(tomTat('xin_chi', { status: 200, body: { yeu_cau: { trang_thai: 'cho_duyet', ly_do: [] } } })).toContain('đừng xin lại');
  });
});
