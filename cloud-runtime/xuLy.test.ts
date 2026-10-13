/**
 * Luồng HTTP của runtime (không cần trình duyệt): chữ ký, hạn, nonce, JWT, khuôn. Cùng kiểm chuẩn hoá JSON khớp từng
 * byte với bản Orchestrator (Deno) — ký bằng mã của Orchestrator, kiểm bằng mã của runtime.
 */
import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { chuanHoaJson, kyLenhChoTest } from './chuKy.js';
import { xuLyYeuCau, type PhuThuoc } from './xuLy.js';
import type { KetQuaLuot, LenhChay } from './hopDong.js';
import { KHOA_CONG_KHAI_DEV, KHOA_RIENG_DEV_PKCS8 } from './thu/khoaDev.js';
import * as orchestrator from '../supabase/functions/_shared/agent/chuan-hoa-json.ts';

const NGUOI = '22222222-2222-4222-8222-222222222222';
const NOW = Date.parse('2026-10-13T03:00:00Z');

function lenhMau(them: Partial<LenhChay> = {}): Omit<LenhChay, 'chu_ky'> {
  return {
    phien_ban: 1,
    nhiem_vu_id: '11111111-1111-4111-8111-111111111111',
    cong_ty_id: '33333333-3333-4333-8333-333333333333',
    nguoi_dung_id: NGUOI,
    agent: 'trinh_duyet',
    mien_cho_phep: ['vanban.chinhphu.vn'],
    url_bat_dau: null,
    tu_buoc: 0,
    buoc: [{ cong_cu: 'mo_trang', url: 'https://vanban.chinhphu.vn/' }, { cong_cu: 'doc_noi_dung', toi_da_ky_tu: 500 }],
    da_duyet: [],
    ngan_sach_ms: 40_000,
    het_han: new Date(NOW + 50_000).toISOString(),
    nonce: `nonce-${Math.random().toString(36).slice(2)}-abcdef`,
    ...them,
  } as Omit<LenhChay, 'chu_ky'>;
}

const fetchAuth = (id: string | null): typeof fetch =>
  (async (_u: string, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    if (!h.get('apikey')) return new Response('{}', { status: 400 });
    if (id === null || h.get('authorization') !== 'Bearer jwt.hop.le.cua.nguoi.dung.thu') return new Response('{"msg":"bad"}', { status: 401 });
    return Response.json({ id });
  }) as unknown as typeof fetch;

let soLanChay = 0;
const ketQuaGia = async (l: LenhChay): Promise<KetQuaLuot> => {
  soLanChay++;
  return { nhiem_vu_id: l.nhiem_vu_id, trang_thai: 'xong', buoc_tiep: l.buoc.length, url_hien_tai: null, ket_qua_buoc: [] };
};

function deps(them: Partial<PhuThuoc> = {}): PhuThuoc {
  return { khoaCongKhai: KHOA_CONG_KHAI_DEV, fetchFn: fetchAuth(NGUOI), bayGio: () => NOW, chayLuot: ketQuaGia, nonceDaThay: new Map(), ...them };
}

const goi = (than: unknown, d: PhuThuoc, jwt = 'jwt.hop.le.cua.nguoi.dung.thu') =>
  xuLyYeuCau(
    new Request('https://mimi.test/api/agent-runtime', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: typeof than === 'string' ? than : JSON.stringify(than),
    }),
    d,
  );

describe('chuẩn hoá JSON + chữ ký khớp Orchestrator', () => {
  it('chuỗi chuẩn hoá trùng từng byte với bản Deno', () => {
    const v = { b: [1, 'x', null, { z: true, a: -0, ä: 'Nộp "tờ" khai\n' }], a: 1.5e-7, u: undefined };
    expect(chuanHoaJson(v)).toBe(orchestrator.chuanHoaJson(v));
    // Ví dụ trong docs/CLOUD_AGENT_RUNTIME.md mục "Chuẩn hoá JSON".
    expect(chuanHoaJson({ b: 1, a: [3, { d: null, c: 'x' }] })).toBe('{"a":[3,{"c":"x","d":null}],"b":1}');
    expect(() => chuanHoaJson({ a: NaN })).toThrow();
    expect(() => chuanHoaJson({ a: new Date() })).toThrow();
    const l = lenhMau();
    expect(chuanHoaJson(l)).toBe(orchestrator.chuanHoaJson(l));
  });

  it('lệnh do mã Orchestrator ký được runtime nhận', async () => {
    const khoa = await orchestrator.docKhoaRieng(KHOA_RIENG_DEV_PKCS8);
    const lenh = await orchestrator.kyLenh(lenhMau() as Record<string, unknown>, khoa);
    soLanChay = 0;
    const r = await goi(lenh, deps());
    expect(r.status).toBe(200);
    expect(((await r.json()) as KetQuaLuot).trang_thai).toBe('xong');
    expect(soLanChay).toBe(1);
  });
});

describe('kiểm lệnh', () => {
  it('GET → health check không mở trình duyệt', async () => {
    const r = await xuLyYeuCau(new Request('https://mimi.test/api/agent-runtime'), deps());
    const j = (await r.json()) as Record<string, unknown>;
    expect(r.status).toBe(200);
    expect(j).toMatchObject({ ok: true, chromium: 'cuc_bo', khoa: 'da_cau_hinh' });
  });

  it('chưa cấu hình khoá → 503, không chạy', async () => {
    soLanChay = 0;
    const r = await goi(await kyLenhChoTest(lenhMau(), KHOA_RIENG_DEV_PKCS8), deps({ khoaCongKhai: '' }));
    expect(r.status).toBe(503);
    expect(soLanChay).toBe(0);
  });

  it('thiếu chữ ký → 401', async () => {
    soLanChay = 0;
    const r = await goi(lenhMau(), deps());
    expect(r.status).toBe(401);
    expect(soLanChay).toBe(0);
  });

  it('chữ ký sai (sửa một trường sau khi ký) → 401', async () => {
    const lenh = await kyLenhChoTest(lenhMau(), KHOA_RIENG_DEV_PKCS8);
    const r = await goi({ ...lenh, mien_cho_phep: ['vanban.chinhphu.vn', '169.254.169.254'] }, deps());
    expect(r.status).toBe(401);
  });

  it('chữ ký bằng khoá khác → 401', async () => {
    const cap = (await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const pk = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', cap.privateKey)).toString('base64url');
    const r = await goi(await kyLenhChoTest(lenhMau(), pk), deps());
    expect(r.status).toBe(401);
  });

  it('hết hạn → 401; hạn quá xa → 401', async () => {
    const qua = await kyLenhChoTest(lenhMau({ het_han: new Date(NOW - 1).toISOString() }), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(qua, deps())).status).toBe(401);
    const xa = await kyLenhChoTest(lenhMau({ het_han: new Date(NOW + 10 * 60_000).toISOString() }), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(xa, deps())).status).toBe(401);
  });

  it('phát lại cùng nonce → 401', async () => {
    const d = deps();
    const lenh = await kyLenhChoTest(lenhMau(), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(lenh, d)).status).toBe(200);
    expect((await goi(lenh, d)).status).toBe(401);
  });

  it('JWT sai → 401; JWT của người khác → 403', async () => {
    const lenh = await kyLenhChoTest(lenhMau(), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(lenh, deps(), 'jwt.gia.mao.khong.hop.le.abc')).status).toBe(401);
    const khac = await goi(lenh, deps({ fetchFn: fetchAuth('99999999-9999-4999-8999-999999999999') }));
    expect(khac.status).toBe(403);
  });

  it('đúng chữ ký nhưng sai khuôn (trường lạ, CSS selector, quá 30 bước) → 400', async () => {
    const la = await kyLenhChoTest({ ...lenhMau(), selector: '#nop' } as never, KHOA_RIENG_DEV_PKCS8);
    expect((await goi(la, deps())).status).toBe(400);
    const css = await kyLenhChoTest(lenhMau({ buoc: [{ cong_cu: 'nhan', ten: 'x', tac_dong: 'doc', selector: 'button' } as never] }), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(css, deps())).status).toBe(400);
    const nhieu = await kyLenhChoTest(lenhMau({ buoc: Array(31).fill({ cong_cu: 'lay_url_tieu_de' }) }), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(nhieu, deps())).status).toBe(400);
    const js = await kyLenhChoTest(lenhMau({ buoc: [{ cong_cu: 'chay_js', ma: 'alert(1)' } as never] }), KHOA_RIENG_DEV_PKCS8);
    expect((await goi(js, deps())).status).toBe(400);
  });

  it('thân không phải JSON → 400; phương thức khác → 405', async () => {
    expect((await goi('{khong-phai-json', deps())).status).toBe(400);
    expect((await xuLyYeuCau(new Request('https://mimi.test/x', { method: 'PUT', body: '{}' }), deps())).status).toBe(405);
  });
});

describe('tệp Vercel api/agent-runtime.ts', () => {
  it('xuất { fetch }; GET trả sức khoẻ; khoá thật chưa cấu hình thì POST → 503', async () => {
    const { default: ham } = await import('../api/agent-runtime.js');
    const g = await ham.fetch(new Request('https://mimi.test/api/agent-runtime'));
    expect(g.status).toBe(200);
    expect(await g.json()).toMatchObject({ ok: true, hop_dong: 1 });
    const { KHOA_CONG_KHAI_ORCHESTRATOR } = await import('./khoa.js');
    const p = await ham.fetch(new Request('https://mimi.test/api/agent-runtime', { method: 'POST', body: '{}' }));
    expect(p.status).toBe(KHOA_CONG_KHAI_ORCHESTRATOR ? 401 : 503);
  });
});
