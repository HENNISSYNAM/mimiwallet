// Kiểm gói Windows trên máy thật: cài -> chạy -> ghép -> mở trình duyệt -> dừng -> nâng bản -> quay lại -> gỡ.
// Chạy: node helper/dong-goi/kiem-goi.mjs <đường dẫn zip>
// LOCALAPPDATA và thư mục menu Start được trỏ sang một thư mục tạm, để không đụng bản cài thật của người dùng.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const zip = process.argv[2];
if (!zip || !existsSync(zip)) throw new Error('Cần đường dẫn tới zip.');
const goc = mkdtempSync(join(tmpdir(), 'mimi-kiem-goi-'));
const env = { ...process.env, LOCALAPPDATA: join(goc, 'local'), MIMI_DIEN_HO_MENU: join(goc, 'menu'), MIMI_DIEN_HO_CONG: '47398' };
const ORIGIN = 'https://www.mimiwallet.online';
const CONG = 'http://127.0.0.1:47398';
const ket = [];
let p = null;
const dat = (ten, ok, ghiChu = '') => { ket.push({ ten, ok, ghiChu }); console.log(`${ok ? 'ĐẠT ' : 'HỎNG'}  ${ten}${ghiChu ? ' — ' + ghiChu : ''}`); };
const ps = (file, ...args) => execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file, ...args], { env, encoding: 'utf8' });
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
const nghe = () => execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' }).split(/\r?\n/).filter((d) => /LISTENING/.test(d) && /:47398\s/.test(d)).map((d) => d.trim().split(/\s+/)[1]);

try {
  execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${join(goc, 'giai-nen')}'`]);
  const nguon = join(goc, 'giai-nen');
  const pb = readFileSync(join(nguon, 'PHIEN_BAN.txt'), 'utf8').replace(/^﻿/, '').trim();

  // 1. Cài
  ps(join(nguon, 'cai-dat.ps1'));
  const nha = join(env.LOCALAPPDATA, 'MIMI', 'dien-ho');
  const thuMuc = join(nha, 'ban', pb);
  dat('cài không cần admin vào %LOCALAPPDATA%\\MIMI\\dien-ho', existsSync(join(thuMuc, 'node.exe')) && existsSync(join(thuMuc, 'app', 'mimi-dien-ho.mjs')));
  dat('có lối tắt menu Start', existsSync(join(env.MIMI_DIEN_HO_MENU, 'MIMI Dien Ho.lnk')));
  const autostart = execFileSync('powershell', ['-NoProfile', '-Command', "Get-ChildItem ([Environment]::GetFolderPath('Startup')) | Where-Object Name -like '*MIMI*' | Measure-Object | ForEach-Object Count"], { encoding: 'utf8' }).trim();
  const reg = execFileSync('powershell', ['-NoProfile', '-Command', "(Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -ErrorAction SilentlyContinue).PSObject.Properties.Name -join ','"], { encoding: 'utf8' });
  dat('không tự khởi động cùng Windows (Startup + HKCU Run)', autostart === '0' && !/mimi/i.test(reg));

  // 2. Chạy bản đã cài, đọc mã ghép trên cửa sổ
  p = spawn(join(thuMuc, 'node.exe'), [join(thuMuc, 'app', 'mimi-dien-ho.mjs')], { env, cwd: thuMuc });
  let ra = '';
  p.stdout.on('data', (d) => { ra += d; });
  p.stderr.on('data', (d) => { ra += d; });
  const t0 = Date.now(); p.on('error', (e) => { ra += 'SPAWN_ERR ' + e.message; });
  for (let i = 0; i < 300 && !/:\s+\d{6}\s+\(/.test(ra); i++) await ngu(200);
  const ma = ra.match(/:\s+(\d{6})\s+\(/)?.[1];
  dat('bộ chạy khởi động và hiện mã ghép', !!ma, ma ? '' : JSON.stringify(ra.slice(0, 400)) + ' ' + thuMuc + ' exit=' + p.exitCode + ' ms=' + (Date.now() - t0) + ' pid=' + p.pid);
  const diaChi = nghe();
  dat('chỉ nghe trên 127.0.0.1', diaChi.length > 0 && diaChi.every((d) => d.startsWith('127.0.0.1:')), diaChi.join(' '));

  const goi = async (duong, o = {}) => {
    const h = { Origin: o.origin ?? ORIGIN, 'Content-Type': 'application/json' };
    if (o.token) Object.assign(h, { Authorization: `Bearer ${o.token}`, 'X-Mimi-Nonce': crypto.randomUUID(), 'X-Mimi-Thoi-Diem': String(Date.now()) });
    const r = await fetch(CONG + duong, { method: o.method ?? 'POST', headers: h, body: (o.method ?? 'POST') === 'POST' ? JSON.stringify(o.than ?? {}) : undefined });
    return { status: r.status, than: await r.json().catch(() => ({})) };
  };
  dat('Origin lạ bị từ chối', (await goi('/trang-thai', { method: 'GET', origin: 'https://evil.example' })).status === 403);
  const g = await goi('/ghep', { than: { ma } });
  const token = g.than.token;
  dat('ghép bằng mã 6 số', g.status === 200 && typeof token === 'string');

  // 3. Mở trình duyệt riêng của MIMI, liệt kê tab, đóng
  const mo = await goi('/mo-trinh-duyet', { token, than: { kenh: 'chrome' } });
  const tab = await goi('/tab', { token, method: 'GET' });
  dat('mở Chrome bằng hồ sơ riêng, liệt kê được tab', mo.status === 200 && Array.isArray(tab.than.tab), `${tab.than.tab?.length ?? 0} tab`);
  dat('không mở cổng gỡ lỗi trình duyệt (chỉ cổng 47398 của bộ chạy)', !/remote-debugging-port/.test(execFileSync('powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | ForEach-Object CommandLine | Select-String 'MIMI' | Out-String"], { encoding: 'utf8' })));
  await goi('/dong-trinh-duyet', { token });

  // 4. Thu hồi ghép, rồi dừng bằng "q"
  await goi('/huy-ghep', { token });
  dat('huỷ ghép: token cũ hết quyền', (await goi('/tab', { token, method: 'GET' })).status === 401);
  p.stdin.write('q\n');
  const thoat = await Promise.race([new Promise((r) => p.on('exit', () => r(true))), ngu(10_000).then(() => false)]);
  dat('gõ q: bộ chạy tắt, cổng đóng', thoat && nghe().length === 0);
  if (!thoat) p.kill();

  // 5. Nâng lên bản giả "<pb>-moi" rồi quay lại
  const nguon2 = join(goc, 'giai-nen-2');
  cpSync(nguon, nguon2, { recursive: true });
  writeFileSync(join(nguon2, 'PHIEN_BAN.txt'), `${pb}-moi`);
  ps(join(nguon2, 'cai-dat.ps1'));
  const doc = (f) => readFileSync(join(nha, f), 'utf8').replace(/^﻿/, '').trim();
  dat('nâng bản: hien-tai là bản mới, truoc là bản cũ', doc('hien-tai.txt') === `${pb}-moi` && doc('truoc.txt') === pb);
  ps(join(nha, 'ban', `${pb}-moi`, 'cai-dat.ps1'), '-QuayLai');
  dat('quay lại bản trước', doc('hien-tai.txt') === pb && existsSync(join(nha, 'ban', pb, 'node.exe')));

  // 6. Gỡ
  ps(join(thuMuc, 'go-cai-dat.ps1'));
  dat('gỡ: xoá chương trình, hồ sơ trình duyệt và lối tắt', !existsSync(nha) && !existsSync(join(env.MIMI_DIEN_HO_MENU, 'MIMI Dien Ho.lnk')));
} catch (e) {
  dat('lỗi không lường trước', false, String(e?.message ?? e).split(/\r?\n/)[0]);
} finally {
  if (p && p.exitCode === null) p.kill();
  await ngu(500);
  try { rmSync(goc, { recursive: true, force: true }); } catch { /* Windows còn giữ tệp — dọn sau */ }
}
const hong = ket.filter((k) => !k.ok).length;
console.log(`\n${ket.length - hong}/${ket.length} đạt`);
process.exit(hong ? 1 : 0);
