/**
 * MIMI-RevBench-VN (15/10/2026) — benchmark đối đầu cho bài toán "tiền vào nào là doanh thu".
 *
 * Mọi hệ thống nhận CÙNG sao kê (cùng ca, cùng dòng), KHÔNG ai được lời xác nhận của chủ hộ, và bị chấm bằng cùng
 * nhãn sự thật do bộ sinh ca tạo TRƯỚC khi hệ thống nào chạy (`sinh-ca-doi-khang.ts`, dải giữ lại — không dùng để chỉnh MIMI).
 *
 *   Xuất đề (mù nhãn) cho mô hình AI:  vite-node scripts/bench/revbench.ts xuat <thư-mục> [số ca]
 *   Chấm tất cả hệ thống:              vite-node scripts/bench/revbench.ts cham <thư-mục> [số ca]
 *
 * Mỗi dòng tiền vào của năm khai được xếp: r = doanh thu · n = KHÔNG phải doanh thu · u = chưa chắc, hỏi chủ hộ.
 *
 * GIỚI HẠN (nói trong báo cáo, không giấu): dữ liệu là SINH RA (không phải khách thật); B0/B1 mô phỏng KIỂU làm việc
 * của một loại công cụ, không chạy sản phẩm thương mại nào; MIMI ở đây là lớp nhận diện dòng (khớp chuyển nội bộ, đoán
 * theo nội dung, cặp nghi ngờ) — không gồm lớp khoảng/ngưỡng và hỏi một câu, vốn đã đo ở adversarial.test.ts.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chayMimi, HAT_GIU_LAI, HAT_PHAT_TRIEN, NAM, sinhCa, TAI_KHOAN, type CaDoiKhang, type Row } from '../../supabase/functions/_shared/doanh-thu/sinh-ca-doi-khang.ts';
import { tinhTienVao, type GiaoDichTinh } from '../../supabase/functions/_shared/doanh-thu/so-lieu.ts';
import { goiYTienVao } from '../../supabase/functions/_shared/phan-loai/tien-vao.ts';
import { NGUONG_DOANH_THU, NGUONG_THU_NHAP } from '../../supabase/functions/_shared/luat/he-luat.ts';

type QD = 'r' | 'n' | 'u';
const NGUONG = [NGUONG_DOANH_THU, NGUONG_THU_NHAP];

const [lenh, thuMuc = 'out/revbench', soCaTho = '30', boTho = 'giu'] = process.argv.slice(2);
const SO_CA = Number(soCaTho);
/** `dev` = dải phát triển (được phép nhìn lỗi để sửa); `giu` = dải giữ lại (chỉ để báo số, KHÔNG dùng để chỉnh). */
const HATS = (boTho === 'dev' ? HAT_PHAT_TRIEN : HAT_GIU_LAI).slice(0, SO_CA);

/** Dòng tiền vào của năm khai, không phải dòng minh hoạ: tập được chấm. */
const laDongCham = (g: Row) => g.type === 'income' && !g.is_synthetic && String(g.transaction_date).startsWith(String(NAM));

// ── Xuất đề mù nhãn ────────────────────────────────────────────────────────────
function xuat() {
  mkdirSync(join(thuMuc, 'de'), { recursive: true });
  for (const hat of HATS) {
    const ca = sinhCa(hat);
    const dong = ca.giao_dich.filter((g) => !g.is_synthetic).map((g) => ({
      id: g.id, ngay: g.transaction_date, loai: g.type === 'income' ? 'vao' : 'ra', so_tien: g.amount,
      tai_khoan: g.account_number, tai_khoan_doi_ung: g.counter_account_number ?? null,
      doi_tac: g.counter_account_name ?? null, noi_dung: g.merchant_name ?? g.payment_reference ?? null,
    }));
    const can_xep = ca.giao_dich.filter(laDongCham).map((g) => g.id);
    writeFileSync(join(thuMuc, 'de', `ca-${hat}.json`), JSON.stringify({ ca: hat, nam_khai: NAM, tai_khoan_cua_chu_ho: TAI_KHOAN, can_xep, sao_ke: dong }));
  }
  console.log(`Đã xuất ${HATS.length} ca vào ${join(thuMuc, 'de')}`);
}

// ── Hệ thống được so ───────────────────────────────────────────────────────────
const bo = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();

/** B0: cộng mọi tiền vào — cách làm thủ công và công cụ chỉ có sao kê. */
const b0 = (ca: CaDoiKhang): Record<string, QD> => Object.fromEntries(ca.giao_dich.filter(laDongCham).map((g) => [g.id, 'r' as QD]));

/** B1: quy tắc từ khoá + khớp chuyển giữa tài khoản của mình — mô phỏng cách bank-feed/kế toán thường làm. Luôn quyết, không hỏi. */
const TU_KHOA = ['VAY', 'GIAI NGAN', 'HDTD', 'GOP VON', 'VON KINH DOANH', 'HOAN TIEN', 'TRA LAI', 'CON GUI', 'ME GUI', 'CHUYEN CHO ME', 'NOI BO'];
const b1 = (ca: CaDoiKhang): Record<string, QD> => Object.fromEntries(ca.giao_dich.filter(laDongCham).map((g) => {
  const chu = `${bo(g.merchant_name)} ${bo(g.counter_account_name)} ${bo(g.payment_reference)}`;
  const noiBo = !!g.counter_account_number && TAI_KHOAN.includes(String(g.counter_account_number));
  return [g.id, (noiBo || TU_KHOA.some((k) => chu.includes(k)) ? 'n' : 'r') as QD];
}));

/**
 * B2 — KIỂM TRA ĐỘ RÒ CỦA ĐỀ, không phải đối thủ: luật MỘT dòng "tiền vào là số tròn triệu thì không phải doanh thu".
 * Ngoài đời luật này tệ (khách vẫn trả tiền tròn). Nếu nó đạt điểm cao trên đề này thì đề có kẽ hở (bộ sinh ca tạo số bán
 * hàng lẻ), và điểm cao của MỌI hệ thống phải đọc kèm cảnh báo đó.
 */
const b2 = (ca: CaDoiKhang): Record<string, QD> => Object.fromEntries(ca.giao_dich.filter(laDongCham).map((g) => [g.id, (g.amount % 1_000_000 === 0 ? 'n' : 'r') as QD]));

/** MIMI: lớp nhận diện dòng. n = chuyển nội bộ chắc chắn; u = nghi (cặp suy đoán, nội dung giống vay/người nhà/góp vốn/hoàn tiền); còn lại r. */
async function mimi(ca: CaDoiKhang): Promise<Record<string, QD>> {
  const khongXacNhan = { ...ca, xac_nhan: [] };
  const { nguon } = await chayMimi(khongXacNhan);
  const noiBo = nguon.noi_bo.internalIds;
  const suyDoan = nguon.noi_bo.suyDoanIds;
  const ra: Record<string, QD> = {};
  for (const g of ca.giao_dich.filter(laDongCham)) {
    const id = String(g.id);
    const k = { merchant_name: g.merchant_name ?? null, counter_account_name: g.counter_account_name ?? null, payment_reference: g.payment_reference ?? null };
    // tinhTienVao chạy lại một dòng để biết nó có bị loại khỏi doanh thu không (cùng đường với sản phẩm).
    const mot = tinhTienVao(NAM, [g as GiaoDichTinh], [], noiBo, suyDoan);
    if (suyDoan.has(id) || goiYTienVao(k) || g.type === 'loan') ra[id] = 'u';
    else if (mot.noi_bo > 0) ra[id] = 'n';
    else ra[id] = 'r';
  }
  return ra;
}

/**
 * ỨNG VIÊN cải tiến (CHƯA đưa vào sản phẩm): MIMI + một tín hiệu cấu trúc có lý do ngoài đời thực — khoản tiền vào nội dung
 * chung chung, số tiền lớn bất thường so với thường lệ của hộ (≥ 3 lần trung vị), từ một đối tác chỉ xuất hiện ≤ 2 lần trong
 * năm thì HỎI. Cố ý KHÔNG dùng "số tiền tròn": trong bộ sinh ca nó tách được 100% nhưng chỉ vì bộ sinh tạo số bán lẻ, còn ngoài
 * đời khách vẫn trả tiền tròn — dùng nó là tự lừa mình bằng một ảo ảnh của dữ liệu giả.
 */
async function mimiUngVien(ca: CaDoiKhang): Promise<Record<string, QD>> {
  const co = await mimi(ca);
  const vao = ca.giao_dich.filter(laDongCham);
  const lan = new Map<string, number>();
  for (const g of vao) lan.set(String(g.counter_account_name ?? ''), (lan.get(String(g.counter_account_name ?? '')) ?? 0) + 1);
  const s = vao.map((g) => g.amount).sort((a, b) => a - b);
  const trungVi = s.length ? s[Math.floor(s.length / 2)] : 0;
  for (const g of vao) {
    const chungChung = ['', 'NHAN TIEN', 'CHUYEN TIEN', 'CK', 'TRA LAI'].includes(String(g.merchant_name ?? ''));
    if (co[g.id] === 'r' && chungChung && (lan.get(String(g.counter_account_name ?? '')) ?? 0) <= 2 && g.amount >= 3 * trungVi) co[g.id] = 'u';
  }
  return co;
}

// ── Chấm ───────────────────────────────────────────────────────────────────────
interface TongHop {
  ten: string; dong: number; ra_quyet_dinh: number; hoi: number;
  dung_quyet_dinh: number; sai_tien: number; tien_non_tinh_la_dt: number; tien_dt_bi_loai: number;
  khong_dt: number; khong_dt_bi_bat: number;
  sai_so_rel: number[]; ca: number; sai_phia: number; hoi_ca: number; sai_phia_neu_bo_hoi: number;
  loai: Record<string, { dong: number; r: number; n: number; u: number }>;
}
const moi = (ten: string): TongHop => ({ ten, dong: 0, ra_quyet_dinh: 0, hoi: 0, dung_quyet_dinh: 0, sai_tien: 0, tien_non_tinh_la_dt: 0, tien_dt_bi_loai: 0, khong_dt: 0, khong_dt_bi_bat: 0, sai_so_rel: [], ca: 0, sai_phia: 0, hoi_ca: 0, sai_phia_neu_bo_hoi: 0, loai: {} });

function cong(t: TongHop, ca: CaDoiKhang, qd: Record<string, QD | undefined>) {
  const dong = ca.giao_dich.filter(laDongCham);
  let that = 0; let duoi = 0; let tren = 0; let diem = 0;
  t.ca += 1;
  for (const g of dong) {
    const la = ca.nhan[g.id].la_doanh_thu;
    const d = qd[g.id] ?? 'u'; // mô hình bỏ sót dòng = chưa quyết
    t.dong += 1;
    const lo = (t.loai[loaiDong(ca, g)] ??= { dong: 0, r: 0, n: 0, u: 0 }); lo.dong += 1; lo[d] += 1;
    if (la) that += g.amount;
    if (d === 'u') t.hoi += 1;
    else {
      t.ra_quyet_dinh += 1;
      if ((d === 'r') === la) t.dung_quyet_dinh += 1; else t.sai_tien += g.amount;
    }
    if (!la) { t.khong_dt += 1; if (d !== 'r') t.khong_dt_bi_bat += 1; if (d === 'r') t.tien_non_tinh_la_dt += g.amount; }
    if (la && d === 'n') t.tien_dt_bi_loai += g.amount;
    if (d === 'r') { duoi += g.amount; tren += g.amount; diem += g.amount; }
    if (d === 'u') { tren += g.amount; diem += g.amount; } // chưa chắc thì tạm tính là doanh thu (cách MIMI tạm xử lý)
  }
  t.sai_so_rel.push(Math.abs(diem - that) / Math.max(1, that));
  // Ngưỡng: nói một phía chỉ khi cả cận dưới và cận trên cùng phía; khác phía thì hỏi.
  const phia = (x: number) => NGUONG.map((n) => x > n);
  const pd = phia(duoi); const pt = phia(tren); const ps = phia(that);
  const hoi = pd.some((v, i) => v !== pt[i]);
  if (hoi) t.hoi_ca += 1;
  else if (pd.some((v, i) => v !== ps[i])) t.sai_phia += 1;
  if (phia(diem).some((v, i) => v !== ps[i])) t.sai_phia_neu_bo_hoi += 1;
}

const MEMO_BAY = ['KHACH TRA NOT HOAN TAT DON', 'DAT COC DON HANG 77', 'NHAN COC HANG', 'CON GUI CHO TIEN MUA HANG'];
const MEMO_MO = ['NHAN TIEN', 'CHUYEN TIEN', 'CK', 'TRA LAI'];
/** Loại dòng để phân tích điểm yếu: nhãn sự thật + nội dung rõ hay mờ. */
function loaiDong(ca: CaDoiKhang, g: Row): string {
  const k = ca.nhan[g.id].kieu;
  const nd = String(g.merchant_name ?? '');
  if (k.startsWith('ban_hang')) return MEMO_BAY.includes(nd) ? 'ban_hang · nội dung giống vay/người nhà' : nd === '' ? 'ban_hang · nội dung trống' : 'ban_hang · bình thường';
  if (['vay', 'gop_von', 'nguoi_nha', 'hoan_tien_ncc'].includes(k)) return `${k} · ${MEMO_MO.includes(nd) ? 'nội dung MỜ' : 'nội dung rõ'}`;
  return k;
}

const pc = (x: number, y: number) => (y ? `${((100 * x) / y).toFixed(1)}%` : 'n/a');
const trieu = (x: number) => `${(x / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} tr`;
const trungVi = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

async function cham() {
  const he: Record<string, TongHop> = { B0: moi('B0 · Cộng mọi tiền vào'), B1: moi('B1 · Quy tắc từ khoá + khớp nội bộ'), B2: moi('B2 · KIỂM TRA RÒ ĐỀ: luật một dòng "số tiền tròn triệu"'), MIMI: moi('MIMI · Lớp nhận diện dòng'), 'MIMI+': moi('MIMI+ · ứng viên: thêm tín hiệu "khoản lớn từ đối tác lẻ loi" (chưa phát hành)') };
  const llm: Record<string, Record<string, Record<string, QD>>> = {}; // mô hình → ca → id → quyết định
  const dirRa = join(thuMuc, 'ra');
  if (existsSync(dirRa)) {
    for (const f of readdirSync(dirRa).filter((x) => x.endsWith('.json'))) {
      const ten = f.replace(/-\d+\.json$/, '').replace(/\.json$/, '');
      const j = JSON.parse(readFileSync(join(dirRa, f), 'utf8')) as Record<string, Record<string, string>>;
      llm[ten] ??= {};
      for (const [ca, m] of Object.entries(j)) llm[ten][ca] = Object.fromEntries(Object.entries(m).map(([id, v]) => [id, (['r', 'n', 'u'].includes(v) ? v : 'u') as QD]));
      he[ten] ??= moi(`LLM · ${ten} (hỏi một lần, không ngữ cảnh)`);
    }
  }
  const casDaCham: Record<string, number> = {};
  for (const hat of HATS) {
    const ca = sinhCa(hat);
    cong(he.B0, ca, b0(ca));
    cong(he.B1, ca, b1(ca));
    cong(he.B2, ca, b2(ca));
    cong(he.MIMI, ca, await mimi(ca));
    cong(he['MIMI+'], ca, await mimiUngVien(ca));
    for (const ten of Object.keys(llm)) {
      const qd = llm[ten][String(hat)];
      if (!qd) continue; // mô hình chưa làm ca này: không chấm, không tính vào mẫu số
      casDaCham[ten] = (casDaCham[ten] ?? 0) + 1;
      cong(he[ten], ca, qd);
    }
  }

  const dong = ['| Hệ thống | Số ca | Số dòng | Hỏi lại | Đúng khi tự quyết | Tiền không-phải-doanh-thu bị tính là doanh thu | Doanh thu thật bị loại nhầm | Bắt được dòng không-phải-doanh-thu | Sai số doanh thu (trung vị) | Nói SAI phía ngưỡng | Dừng hỏi ở ngưỡng |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const t of Object.values(he)) {
    dong.push(`| ${t.ten} | ${t.ca} | ${t.dong} | ${pc(t.hoi, t.dong)} | ${pc(t.dung_quyet_dinh, t.ra_quyet_dinh)} | ${trieu(t.tien_non_tinh_la_dt)} | ${trieu(t.tien_dt_bi_loai)} | ${pc(t.khong_dt_bi_bat, t.khong_dt)} | ${(100 * trungVi(t.sai_so_rel)).toFixed(1)}% | ${t.sai_phia}/${t.ca} | ${t.hoi_ca}/${t.ca} |`);
  }
  // Phân tích theo loại dòng. "đúng": dòng bán hàng → r; dòng không-phải-doanh-thu → n (tự quyết đúng). "hỏi": u. "sai": còn lại.
  const cacLoai = [...new Set(Object.values(he).flatMap((t) => Object.keys(t.loai)))].sort();
  const heTen = Object.keys(he);
  const ptHang = ['| Loại dòng | Số dòng | ' + heTen.join(' | ') + ' |', '|---|---|' + heTen.map(() => '---').join('|') + '|'];
  for (const lo of cacLoai) {
    const laBan = lo.startsWith('ban_hang');
    ptHang.push(`| ${lo} | ${he.MIMI.loai[lo]?.dong ?? 0} | ` + heTen.map((k) => {
      const x = he[k].loai[lo]; if (!x) return 'n/a';
      const dung = laBan ? x.r : x.n; const sai = x.dong - dung - x.u;
      return `${pc(dung, x.dong)} đúng · ${pc(x.u, x.dong)} hỏi · ${pc(sai, x.dong)} sai`;
    }).join(' | ') + ' |');
  }
  const md = `# MIMI-RevBench-VN — kết quả (${new Date().toISOString().slice(0, 10)}, dải ${boTho === 'dev' ? 'phát triển' : 'giữ lại'})\n\n${SO_CA} ca, cùng sao kê và cùng nhãn cho mọi hệ thống, không ai có lời xác nhận của chủ hộ.\n\n${dong.join('\n')}\n\n## Theo loại dòng\n\n${ptHang.join('\n')}\n\nĐọc bảng: "Đúng khi tự quyết" chỉ tính các dòng hệ thống dám quyết (không hỏi). "Nói SAI phía ngưỡng" là số ca hệ thống tuyên bố doanh thu ở một phía của ngưỡng 1 tỷ hoặc 3 tỷ mà sự thật ở phía kia; "Dừng hỏi ở ngưỡng" là số ca nó thừa nhận chưa chắc thay vì tuyên bố.\n`;
  mkdirSync(thuMuc, { recursive: true });
  writeFileSync(join(thuMuc, 'ket-qua.md'), md);
  writeFileSync(join(thuMuc, 'ket-qua.json'), JSON.stringify(he, null, 1));
  console.log(md);
}

if (lenh === 'xuat') xuat();
else if (lenh === 'cham') await cham();
else console.log('Dùng: vite-node scripts/bench/revbench.ts <xuat|cham> <thư-mục> [số ca]');
