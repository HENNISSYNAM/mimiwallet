/**
 * Cổng gác bảo mật tĩnh (26/09/2026) — chặn hai loại lỗ đã tìm thấy khi kiểm toán:
 *
 * 1. `elevenlabs-tts` chỉ dựa vào `verify_jwt`, mà khoá anon công khai cũng là JWT hợp lệ → ai cũng gọi
 *    được API trả tiền. Nên: mọi function phải tự xác thực bằng MỘT cơ chế nhận ra được trong mã.
 * 2. `REVOKE ... FROM PUBLIC` không gỡ quyền Supabase cấp riêng cho `anon` → hàm cron gọi được từ ngoài.
 *    Nên: mọi hàm SECURITY DEFINER (trừ hàm trigger) phải có REVOKE nêu tên `anon` ở đâu đó trong migration.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const GOC = join(__dirname, '../../../..');
const FN = join(GOC, 'supabase/functions');

/** Cơ chế xác thực nhận ra được. Function nào không khớp mẫu nào → đỏ. */
const CO_CHE: Record<string, RegExp> = {
  phien_nguoi_dung: /auth\.getUser\(/,
  bi_mat_cron: /x-cron-secret/,
  khoa_webhook: /safeEqual\(presented/,
  khoa_agent: /goiTacTu\(/,
  ma_nap: /x-nap-token/,
  chuyen_tiep_phien: /Authorization: auth/,
  /*
   * `app-mcp` (Lovable, 26/09/2026): @lovable.dev/mcp-js kiểm chữ ký token theo JWKS của issuer Supabase
   * Auth và audience "authenticated" — khoá anon (HS256, không ký bằng khoá JWKS) không qua. Mọi công cụ đọc
   * bằng CHÍNH token người dùng (`supabaseForUser`) nên RLS giới hạn về dữ liệu của họ. Cả hai phải có.
   */
  oauth_mcp: /auth\.oauth\.issuer\([\s\S]*supabaseForUser|supabaseForUser[\s\S]*auth\.oauth\.issuer\(/,
};

/** Function tắt verify_jwt: phải có lý do và cơ chế riêng. */
const TAT_JWT_DUOC_PHEP: Record<string, string> = {
  'bank-webhook': 'SePay gửi khoá riêng (Apikey), không có JWT',
  'cas-webhook': 'Cas gửi khoá trong URL, không có JWT',
  'tac-tu': 'agent gọi bằng khoá agent',
  mcp: 'client MCP gọi bằng khoá agent',
  'nap-kho-luat': 'bộ nạp kho dùng mã nạp riêng',
};

const cacFunction = readdirSync(FN).filter((d) => !d.startsWith('_') && existsSync(join(FN, d, 'index.ts')));

describe('cổng gác: edge function', () => {
  it.each(cacFunction)('%s tự xác thực bằng một cơ chế nhận ra được', (ten) => {
    const ma = readFileSync(join(FN, ten, 'index.ts'), 'utf8');
    const co = Object.entries(CO_CHE).filter(([, re]) => re.test(ma)).map(([k]) => k);
    expect(co, `${ten}: không thấy cơ chế xác thực nào — verify_jwt một mình KHÔNG đủ (khoá anon cũng là JWT)`).not.toEqual([]);
  });

  it('chỉ những function có lý do mới được tắt verify_jwt', () => {
    const cfg = readFileSync(join(GOC, 'supabase/config.toml'), 'utf8');
    const tat = [...cfg.matchAll(/\[functions\.([a-z0-9-]+)\]\s*\nverify_jwt\s*=\s*false/g)].map((m) => m[1]);
    for (const t of tat) expect(TAT_JWT_DUOC_PHEP[t], `${t} tắt verify_jwt mà chưa ghi lý do`).toBeTruthy();
  });

  it('chỗ nhận khoá từ bên ngoài đều có chống dò khoá', () => {
    for (const ten of ['cas-webhook', 'bank-webhook', 'tac-tu', 'mcp', 'nap-kho-luat']) {
      const ma = readFileSync(join(FN, ten, 'index.ts'), 'utf8');
      expect(ma, ten).toMatch(/daBiKhoaViSai\(/);
      expect(ma, ten).toMatch(/ghiLanSai\(/);
    }
  });

  it('API trả tiền theo lần gọi có giới hạn tần suất và đóng khi bộ đếm lỗi', () => {
    const ma = readFileSync(join(FN, 'elevenlabs-tts', 'index.ts'), 'utf8');
    expect(ma).toMatch(/auth\.getUser\(/);
    expect(ma).toMatch(/duocGoi\([^)]*\],\s*true\)/s);
    expect(ma).toMatch(/DO_DAI_TOI_DA/);
  });
});

describe('cổng gác: hàm SECURITY DEFINER', () => {
  const sql = readdirSync(join(GOC, 'supabase/migrations')).sort()
    .map((f) => readFileSync(join(GOC, 'supabase/migrations', f), 'utf8')).join('\n');
  // Hàm được gỡ anon bằng vòng lặp theo tên trong migration phòng thủ.
  const GO_BANG_VONG_LAP = new Set(['current_role', 'user_company_ids']);

  const ham = [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.([a-z_0-9]+)\s*\(([^)]*)\)\s*RETURNS\s+([a-z_ ]+?)\s*\n?\s*LANGUAGE[\s\S]{0,80}?SECURITY DEFINER/gi)]
    .map((m) => ({ ten: m[1], tra_ve: m[3].trim().toLowerCase() }))
    .filter((h) => h.tra_ve !== 'trigger' && h.tra_ve !== 'event_trigger');

  it('tìm được hàm để kiểm (bộ đọc chưa hỏng)', () => {
    expect(ham.length).toBeGreaterThan(5);
  });

  it.each([...new Set(ham.map((h) => h.ten))])('%s không mở cho người chưa đăng nhập', (ten) => {
    if (GO_BANG_VONG_LAP.has(ten)) return;
    const re = new RegExp(`REVOKE[^;]*ON FUNCTION public\\.${ten}\\b[^;]*\\banon\\b`, 'i');
    expect(re.test(sql), `${ten}: cần REVOKE ... FROM ... anon (REVOKE FROM PUBLIC không đủ trên Supabase)`).toBe(true);
  });
});
