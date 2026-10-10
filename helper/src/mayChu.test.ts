// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CongTaiMay } from './mayChu';

const ORIGIN = 'https://www.mimiwallet.online';
let gio = 1_000_000;
const cong = new CongTaiMay({ cong: 47399, originChoPhep: [ORIGIN], bayGio: () => gio }, async ({ duong }) => ({ ma: 200, than: { duong } }));
const goi = (duong: string, o: { method?: string; origin?: string | null; host?: string; auth?: string; nonce?: string; luc?: number; than?: unknown } = {}) =>
  fetch(`http://127.0.0.1:47399${duong}`, {
    method: o.method ?? 'POST',
    headers: {
      ...(o.origin === null ? {} : { Origin: o.origin ?? ORIGIN }),
      ...(o.host ? { Host: o.host } : {}),
      ...(o.auth ? { Authorization: `Bearer ${o.auth}` } : {}),
      ...(o.nonce ? { 'X-Mimi-Nonce': o.nonce } : {}),
      'X-Mimi-Thoi-Diem': String(o.luc ?? gio),
      'Content-Type': 'application/json',
    },
    body: (o.method ?? 'POST') === 'POST' ? JSON.stringify(o.than ?? {}) : undefined,
  });

beforeAll(() => cong.batDau());
afterAll(() => cong.dong());

describe('cổng tại máy của bộ chạy', () => {
  it('chỉ bind 127.0.0.1; Origin lạ hoặc thiếu Origin bị từ chối (không chỉ dựa vào CORS)', async () => {
    expect((await goi('/trang-thai', { method: 'GET', origin: 'https://evil.example' })).status).toBe(403);
    expect((await goi('/trang-thai', { method: 'GET', origin: null })).status).toBe(403);
    expect((await goi('/trang-thai', { method: 'GET' })).status).toBe(200);
  });

  it('Host lạ (DNS rebinding) bị từ chối', () => {
    expect(cong.kiemNguon('evil.example:47399', ORIGIN)).toMatch(/Host/);
    expect(cong.kiemNguon('127.0.0.1:47399', ORIGIN)).toBeNull();
  });

  it('chưa ghép thì mọi lệnh bị từ chối; mã sai bị đếm; mã đúng dùng một lần; phát lại nonce bị chặn; thu hồi là hết quyền', async () => {
    expect((await goi('/tab', { method: 'GET' })).status).toBe(401);
    expect((await goi('/ghep', { than: { ma: '000000' === cong.maGhep ? '111111' : '000000' } })).status).toBe(403);
    const r = await goi('/ghep', { than: { ma: cong.maGhep } });
    expect(r.status).toBe(200);
    const { token } = await r.json();
    expect((await goi('/ghep', { than: { ma: cong.maGhep } })).status).toBe(403); // mã đã dùng
    const nonce = 'nonce-0000000000000001';
    expect((await goi('/tab', { method: 'GET', auth: token, nonce })).status).toBe(200);
    expect((await goi('/tab', { method: 'GET', auth: token, nonce })).status).toBe(401); // phát lại
    expect((await goi('/tab', { method: 'GET', auth: token, nonce: 'nonce-0000000000000002', luc: gio - 120_000 })).status).toBe(401); // cũ
    expect((await goi('/tab', { method: 'GET', auth: 'sai', nonce: 'nonce-0000000000000003' })).status).toBe(401);
    expect((await goi('/huy-ghep', { auth: token, nonce: 'nonce-0000000000000004' })).status).toBe(200);
    expect((await goi('/tab', { method: 'GET', auth: token, nonce: 'nonce-0000000000000005' })).status).toBe(401); // đã thu hồi
  });

  it('sai mã 5 lần thì khoá; ghép hết hạn sau 8 giờ', async () => {
    cong.maMoi();
    for (let i = 0; i < 5; i++) await goi('/ghep', { than: { ma: 'abcdef' } });
    expect((await goi('/ghep', { than: { ma: cong.maGhep } })).status).toBe(403);
    cong.maMoi();
    const { token } = await (await goi('/ghep', { than: { ma: cong.maGhep } })).json();
    gio += 8 * 3600_000 + 1;
    expect((await goi('/tab', { method: 'GET', auth: token, nonce: 'nonce-0000000000000006' })).status).toBe(401);
  });
});
