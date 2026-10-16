/**
 * Khảo sát tín hiệu CẤU TRÚC (không dựa vào nội dung chuyển khoản) để bắt các khoản tiền vào "nội dung mờ" mà MIMI đang
 * lọt. CHỈ chạy trên dải PHÁT TRIỂN — dải giữ lại không được nhìn để chọn tín hiệu.
 *   vite-node scripts/bench/kham-pha-tin-hieu.ts [số ca]
 */
import { HAT_PHAT_TRIEN, NAM, sinhCa, type Row } from '../../supabase/functions/_shared/doanh-thu/sinh-ca-doi-khang.ts';

const SO_CA = Number(process.argv[2] ?? 300);
const MEMO_MO = ['NHAN TIEN', 'CHUYEN TIEN', 'CK', 'TRA LAI'];
const trungVi = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

type Nhom = 'ban_hang' | 'mo_khong_phai_dt';
const dem: Record<Nhom, Record<string, number>> = { ban_hang: {}, mo_khong_phai_dt: {} };
const tong: Record<Nhom, number> = { ban_hang: 0, mo_khong_phai_dt: 0 };
const cong = (n: Nhom, k: string) => { dem[n][k] = (dem[n][k] ?? 0) + 1; };

for (const hat of HAT_PHAT_TRIEN.slice(0, SO_CA)) {
  const ca = sinhCa(hat);
  const vao = ca.giao_dich.filter((g: Row) => g.type === 'income' && !g.is_synthetic && String(g.transaction_date).startsWith(String(NAM)));
  const theoDoiTac = new Map<string, number>();
  for (const g of vao) theoDoiTac.set(String(g.counter_account_name ?? ''), (theoDoiTac.get(String(g.counter_account_name ?? '')) ?? 0) + 1);
  // Khoản "thường lệ" của hộ: trung vị số tiền các dòng tiền vào.
  const tv = trungVi(vao.map((g: Row) => g.amount));
  for (const g of vao) {
    const n = ca.nhan[g.id];
    const mo = MEMO_MO.includes(String(g.merchant_name ?? '')) || String(g.merchant_name ?? '') === '';
    let nhom: Nhom | null = null;
    if (n.la_doanh_thu) nhom = 'ban_hang';
    else if (['vay', 'gop_von', 'nguoi_nha', 'hoan_tien_ncc'].includes(n.kieu) && MEMO_MO.includes(String(g.merchant_name ?? ''))) nhom = 'mo_khong_phai_dt';
    if (!nhom) continue;
    if (nhom === 'ban_hang' && !mo) continue; // so với bán hàng cũng có nội dung chung chung hoặc trống — đúng tình huống cần phân biệt
    tong[nhom] += 1;
    const tron1tr = g.amount % 1_000_000 === 0;
    const tron1k = g.amount % 1_000 === 0;
    const lan = theoDoiTac.get(String(g.counter_account_name ?? '')) ?? 0;
    const gap = g.amount / Math.max(1, tv);
    if (tron1tr) cong(nhom, 'tròn triệu');
    if (tron1tr && g.amount >= 10_000_000) cong(nhom, 'tròn triệu và ≥10 triệu');
    if (tron1k) cong(nhom, 'tròn nghìn');
    if (lan <= 2) cong(nhom, 'đối tác ≤2 lần/năm');
    if (lan <= 3) cong(nhom, 'đối tác ≤3 lần/năm');
    if (gap >= 2) cong(nhom, 'gấp ≥2 lần trung vị');
    if (gap >= 3) cong(nhom, 'gấp ≥3 lần trung vị');
    if (tron1tr && gap >= 2) cong(nhom, 'tròn triệu VÀ gấp ≥2 lần trung vị');
    if (tron1tr && lan <= 3) cong(nhom, 'tròn triệu VÀ đối tác ≤3 lần');
    if (tron1tr && g.amount >= 10_000_000 && lan <= 3) cong(nhom, 'tròn triệu ≥10tr VÀ đối tác ≤3 lần');
    if (g.counter_account_name === 'CHU HO') cong(nhom, 'đối tác là chính chủ hộ');
  }
}
const khoa = [...new Set([...Object.keys(dem.ban_hang), ...Object.keys(dem.mo_khong_phai_dt)])].sort();
console.log(`Dòng nội dung mờ/trống: bán hàng ${tong.ban_hang} · không-phải-doanh-thu ${tong.mo_khong_phai_dt}`);
console.log('| Tín hiệu | % bán hàng có | % không-phải-DT có | Độ chính xác nếu dùng để HỎI | Bắt được |');
console.log('|---|---|---|---|---|');
for (const k of khoa) {
  const a = dem.ban_hang[k] ?? 0; const b = dem.mo_khong_phai_dt[k] ?? 0;
  console.log(`| ${k} | ${(100 * a / tong.ban_hang).toFixed(1)}% | ${(100 * b / tong.mo_khong_phai_dt).toFixed(1)}% | ${a + b ? (100 * b / (a + b)).toFixed(1) : 'n/a'}% | ${(100 * b / tong.mo_khong_phai_dt).toFixed(1)}% |`);
}
