/**
 * MIMI-P0-003 — sinh dữ liệu quan hệ hiệu lực cho migration, từ bản xuất kho Công báo.
 *
 * Cách chạy (bản xuất lấy bằng `supabase db query --linked` chỉ đọc, xem migration đi kèm):
 *   npx vite-node scripts/tach-hieu-luc.ts <thư mục json> <tệp sql ra>
 *
 * Mỗi tệp json là đầu ra của truy vấn:
 *   select d.ma_cong_bao, d.thu_tu, v.so_hieu, v.ngay_hieu_luc, d.noi_dung
 *   from doan_phap_luat d join van_ban_phap_luat v using (ma_cong_bao)
 *   where d.noi_dung like '%hết hiệu lực%'
 *
 * Kết quả là các câu INSERT có câu trích nguyên văn — người duyệt đọc được từng dòng trước khi đẩy.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tachQuanHeHieuLuc, type QuanHeHieuLuc } from '../supabase/functions/_shared/luat/hieu-luc';

const [thuMuc, tepRa] = process.argv.slice(2);
if (!thuMuc || !tepRa) {
  console.error('Cách dùng: vite-node scripts/tach-hieu-luc.ts <thư mục json> <tệp sql ra>');
  process.exit(1);
}

interface Dong { ma_cong_bao: string; thu_tu: number; so_hieu: string | null; ngay_hieu_luc: string | null; noi_dung: string }

const dong: Dong[] = [];
for (const tep of readdirSync(thuMuc).filter((t) => t.endsWith('.json')).sort()) {
  const tho = readFileSync(join(thuMuc, tep), 'utf8');
  const j = JSON.parse(tho.slice(tho.indexOf('{')));
  if (!Array.isArray(j.rows)) throw new Error(`${tep}: không có rows`);
  dong.push(...j.rows);
}

/** Cắt câu trích quanh cụm bãi bỏ, vẫn là chuỗi con nguyên văn. */
const TRICH_TOI_DA = 1200;
function catTrich(t: string): string {
  if (t.length <= TRICH_TOI_DA) return t;
  const i = Math.max(0, t.indexOf('hết hiệu lực') - TRICH_TOI_DA / 2);
  return `…${t.slice(i, i + TRICH_TOI_DA)}…`;
}

const sql = (v: string | null) => (v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);

const theoKhoa = new Map<string, QuanHeHieuLuc & { ma_cong_bao: string }>();
let khongSoHieu = 0;
let khongNgay = 0;
for (const d of dong) {
  if (!d.so_hieu) { khongSoHieu++; continue; }
  for (const q of tachQuanHeHieuLuc(d.noi_dung, d.so_hieu, d.ngay_hieu_luc)) {
    if (!q.hieu_luc_tu) { khongNgay++; continue; }
    const k = `${q.so_hieu_nguon}|${q.so_hieu_dich}|${q.loai}`;
    const cu = theoKhoa.get(k);
    if (!cu || (cu.do_tin_cay === 'can_xem_lai' && q.do_tin_cay === 'chac_chan')) {
      theoKhoa.set(k, { ...q, trich: catTrich(q.trich), ma_cong_bao: d.ma_cong_bao });
    }
  }
}

const ds = [...theoKhoa.values()].sort((a, b) => (a.so_hieu_dich + a.so_hieu_nguon).localeCompare(b.so_hieu_dich + b.so_hieu_nguon));
const cau = ds.map((q) => `(${[
  sql(q.so_hieu_nguon), sql(q.so_hieu_dich), sql(q.loai), sql(q.hieu_luc_tu), sql(q.do_tin_cay),
  q.co_ngoai_le ? 'true' : 'false', sql(q.ma_cong_bao), sql(q.trich),
].join(', ')})`);

writeFileSync(tepRa, [
  `-- Sinh bởi scripts/tach-hieu-luc.ts từ ${dong.length} đoạn kho Công báo có cụm "hết hiệu lực".`,
  `-- ${ds.length} quan hệ: ${ds.filter((q) => q.do_tin_cay === 'chac_chan').length} chắc chắn, ${ds.filter((q) => q.do_tin_cay === 'can_xem_lai').length} cần xem lại.`,
  'INSERT INTO public.quan_he_hieu_luc (so_hieu_nguon, so_hieu_dich, loai, hieu_luc_tu, do_tin_cay, co_ngoai_le, ma_cong_bao_nguon, trich) VALUES',
  `${cau.join(',\n')}`,
  'ON CONFLICT (so_hieu_nguon, so_hieu_dich, loai) DO NOTHING;',
  '',
].join('\n'));

console.log(JSON.stringify({
  doan: dong.length, quan_he: ds.length,
  chac_chan: ds.filter((q) => q.do_tin_cay === 'chac_chan').length,
  can_xem_lai: ds.filter((q) => q.do_tin_cay === 'can_xem_lai').length,
  bai_bo_mot_phan: ds.filter((q) => q.loai === 'bai_bo_mot_phan').length,
  bo_qua_khong_so_hieu: khongSoHieu, bo_qua_khong_ngay: khongNgay,
}));
