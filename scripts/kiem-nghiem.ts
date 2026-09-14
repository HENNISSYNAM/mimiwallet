/**
 * `npm run kiem-nghiem` — tự chạy, tự kiểm, tự ghi báo cáo cho lớp kiểm soát agent.
 *
 * Ba tầng, học cách Ramp kiểm agent (eval là unit test, bộ case vàng soát theo
 * chính sách đúng, lỗi thật thành case):
 *   1. Bộ case vàng — bộ luật chi, chấm điểm theo nhóm, kiểm độ phủ mã lý do.
 *   2. Test tự động — vitest cho bộ luật, cổng agent (CSDL giả), MCP.
 *   3. Dò production CHỈ-ĐỌC — MCP liệt kê công cụ, khoá sai bị chặn. Không tạo
 *      agent hay yêu cầu nào trên CSDL thật.
 *
 * Ghi docs/BAO_CAO_KIEM_NGHIEM.md. Thoát mã 1 nếu có tầng nào trượt.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bangDiemMarkdown, chayBoCase } from '../supabase/functions/_shared/tac-tu/eval/chay-eval.ts';

const GOC = process.env.MIMI_SUPABASE_URL ?? 'https://xzymxgdavepvygdcmfup.supabase.co';
const MCP = `${GOC}/functions/v1/mcp`;
const TAC_TU = `${GOC}/functions/v1/tac-tu`;

/* ── Tầng 1 ── */
const bangDiem = chayBoCase();
const tang1Dat = bangDiem.dat === bangDiem.tong && bangDiem.maChuaPhu.length === 0;

/* ── Tầng 2 ── */
interface TepTest { name: string; assertionResults: Array<{ status: string }> }
let tang2 = { dat: 0, tong: 0, tep: [] as Array<{ ten: string; dat: number; tong: number }>, loi: '' };
try {
  const thuMuc = mkdtempSync(join(tmpdir(), 'mimi-kn-'));
  const tepJson = join(thuMuc, 'vitest.json');
  try {
    execSync(
      `npx vitest run supabase/functions/_shared/tac-tu supabase/functions/_shared/mcp --reporter=json --outputFile="${tepJson}"`,
      { stdio: 'pipe' },
    );
  } catch {
    /* vitest thoát mã 1 khi có test trượt — vẫn đọc báo cáo JSON bên dưới */
  }
  const r = JSON.parse(readFileSync(tepJson, 'utf8')) as { numTotalTests: number; numPassedTests: number; testResults: TepTest[] };
  tang2 = {
    dat: r.numPassedTests,
    tong: r.numTotalTests,
    tep: r.testResults.map((t) => ({
      ten: t.name.replace(/\\/g, '/').replace(/^.*supabase\/functions\//, ''),
      dat: t.assertionResults.filter((a) => a.status === 'passed').length,
      tong: t.assertionResults.length,
    })),
    loi: '',
  };
} catch (e) {
  tang2.loi = (e as Error).message;
}
const tang2Dat = !tang2.loi && tang2.tong > 0 && tang2.dat === tang2.tong;

/* ── Tầng 3 ── */
interface KetQuaDo { ten: string; kyVong: string; thucTe: string; dat: boolean }

async function goiJson(url: string, init: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: res.status, body };
}

const dauMcp = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

async function doProduction(): Promise<KetQuaDo[]> {
  const ra: KetQuaDo[] = [];
  const them = async (ten: string, kyVong: string, lam: () => Promise<{ thucTe: string; dat: boolean }>) => {
    try {
      const k = await lam();
      ra.push({ ten, kyVong, ...k });
    } catch (e) {
      ra.push({ ten, kyVong, thucTe: `lỗi mạng: ${(e as Error).message}`, dat: false });
    }
  };

  await them('MCP liệt kê công cụ khi chưa có khoá', '200, đủ 4 công cụ', async () => {
    const r = await goiJson(MCP, { method: 'POST', headers: dauMcp, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    const ten = (r.body?.result?.tools ?? []).map((t: { name: string }) => t.name);
    const du = ['xem_chinh_sach', 'xin_chi', 'xem_yeu_cau', 'tra_ma_ngan_hang'].every((t) => ten.includes(t));
    return { thucTe: `${r.status}, ${ten.join(', ') || 'không có công cụ'}`, dat: r.status === 200 && du };
  });

  await them('MCP gọi xin_chi khi chưa có khoá', 'bị chặn, không chạy', async () => {
    const r = await goiJson(MCP, {
      method: 'POST', headers: dauMcp,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'xin_chi', arguments: { so_tien: 1000 } } }),
    });
    const chan = r.status === 401 || r.body?.result?.isError === true;
    return { thucTe: `${r.status}, isError=${String(r.body?.result?.isError)}`, dat: chan };
  });

  await them('MCP không mở luồng GET', '405', async () => {
    const r = await goiJson(MCP, { method: 'GET', headers: { Accept: 'text/event-stream' } });
    return { thucTe: String(r.status), dat: r.status === 405 };
  });

  await them('Cổng tac-tu với khoá agent sai khuôn', '401', async () => {
    const r = await goiJson(TAC_TU, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mimi-agent-key': 'mimi_ak_sai' },
      body: JSON.stringify({ hanh_dong: 'xem_chinh_sach' }),
    });
    return { thucTe: `${r.status}${r.body?.ma ? ` ${r.body.ma}` : ''}`, dat: r.status === 401 };
  });

  await them('Cổng tac-tu không có khoá, không đăng nhập', '401', async () => {
    const r = await goiJson(TAC_TU, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hanh_dong: 'tao_tac_tu' }) });
    return { thucTe: String(r.status), dat: r.status === 401 };
  });

  return ra;
}

const tang3 = await doProduction();
const tang3Dat = tang3.every((d) => d.dat);

/* ── Báo cáo ── */
const luc = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const dau = (d: boolean) => (d ? 'Đạt' : '**Trượt**');
const baoCao = [
  '# Báo cáo kiểm nghiệm lớp kiểm soát agent',
  '',
  `> Tự sinh bởi \`npm run kiem-nghiem\` lúc ${luc} (giờ Việt Nam). Không sửa tay — chạy lại lệnh.`,
  '> Phương pháp: eval như unit test, bộ case vàng soát theo chính sách đúng, lỗi thật thành case',
  '> (học từ Ramp, builders.ramp.com). Tầng 3 chỉ đọc production, không ghi dữ liệu thử.',
  '',
  '| Tầng | Kết quả |',
  '|---|---|',
  `| 1. Bộ case vàng — bộ luật chi | ${dau(tang1Dat)} · ${bangDiem.dat}/${bangDiem.tong} case |`,
  `| 2. Test tự động — luật, cổng agent, MCP | ${dau(tang2Dat)} · ${tang2.dat}/${tang2.tong} test |`,
  `| 3. Dò production chỉ-đọc | ${dau(tang3Dat)} · ${tang3.filter((d) => d.dat).length}/${tang3.length} phép dò |`,
  '',
  '## 1. Bộ case vàng',
  '',
  bangDiemMarkdown(bangDiem),
  '',
  '<details><summary>Toàn bộ case</summary>',
  '',
  '| Case | Nhóm | Mô tả | Nguồn | Kỳ vọng | Thực tế | Mã lý do |',
  '|---|---|---|---|---|---|---|',
  ...bangDiem.ketQua.map((k) => `| ${k.id} | ${k.nhom} | ${k.moTa} | ${k.nguon} | ${k.kyVong} | ${k.dat ? k.thucTe : `**${k.thucTe}**`} | ${k.maThucTe.join(', ')} |`),
  '',
  '</details>',
  '',
  '## 2. Test tự động',
  '',
  tang2.loi ? `Không chạy được vitest: ${tang2.loi}` : '| Tệp | Đạt | Tổng |\n|---|---|---|\n' + tang2.tep.map((t) => `| ${t.ten} | ${t.dat} | ${t.tong} |`).join('\n'),
  '',
  '## 3. Dò production chỉ-đọc',
  '',
  `Đích: \`${GOC}\``,
  '',
  '| Phép dò | Kỳ vọng | Thực tế | Kết quả |',
  '|---|---|---|---|',
  ...tang3.map((d) => `| ${d.ten} | ${d.kyVong} | ${d.thucTe} | ${dau(d.dat)} |`),
  '',
].join('\n');

writeFileSync('docs/BAO_CAO_KIEM_NGHIEM.md', baoCao);
console.log(`Tầng 1: ${bangDiem.dat}/${bangDiem.tong} case · độ phủ thiếu ${bangDiem.maChuaPhu.length} mã`);
console.log(`Tầng 2: ${tang2.dat}/${tang2.tong} test${tang2.loi ? ` · lỗi: ${tang2.loi}` : ''}`);
console.log(`Tầng 3: ${tang3.filter((d) => d.dat).length}/${tang3.length} phép dò`);
for (const d of tang3.filter((x) => !x.dat)) console.log(`  trượt: ${d.ten} — ${d.thucTe}`);
console.log('Đã ghi docs/BAO_CAO_KIEM_NGHIEM.md');
process.exit(tang1Dat && tang2Dat && tang3Dat ? 0 : 1);
