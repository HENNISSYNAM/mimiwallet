/**
 * Workflow — lưu trữ & điều phối (22/11/2026). Quyền: chỉ công ty người gọi làm sổ (`docThanhVien`, cùng tập Văn phòng).
 * Mọi id gửi lên được tra lại; khác công ty → 404. Sửa được mọi lúc trừ khi đang chạy; sửa một workflow đã chạy xong
 * thì nó quay về bản nháp (lần chạy cũ vẫn nằm trong lịch sử để so hiệu suất).
 */
import { docThanhVien } from '../van-phong/danh-muc.ts';
import {
  apPhuongAn, chuanHoa, demBuoc, laEmail, MAU, nhanLinhVuc, PHUONG_AN, taiNguyenCan, TEN_LINH_VUC, viPhamLuat,
  type DoThi, type GanTaiNguyen, type LinhVuc, type PhuongAn,
} from './do-thi.ts';
import { cauDung, cauSua, docKetQuaDung, docKetQuaSua, LOI_NHAC_DUNG, LOI_NHAC_SUA } from './loi-nhac.ts';
import { diTiep, hieuSuat, lanChayMoi, nguoiXuLy, trangThai, type LanChay, type ThucThi } from './chay.ts';
import { apThaoTac, docThaoTac } from './sua-tay.ts';
import { chonMau, THU_VIEN } from './thu-vien.ts';
import { goiYDieuChinh } from './goi-y.ts';
import { ketThuc, sauBuoc, sauNguoi, type DongNghiep } from './dong-nghiep.ts';
import { docKetNoi, luuKetNoi, type KetNoi } from './ket-noi.ts';
import type { HoiMoHinh } from './thuc-thi.ts';
import { KIEN_THUC, kienThucChoLoiNhac, kiemChuan } from './kien-thuc.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class LoiQuyTrinh extends Error { constructor(public status: number, public ma: string, cau: string) { super(cau); } }

async function khach(db: Db, userId: string): Promise<Map<string, string>> {
  const { duoc } = await docThanhVien(db, userId);
  return new Map(duoc.map((t) => [t.company_id, t.ten]));
}

async function docRow(db: Db, userId: string, id: string): Promise<{ r: Row; tenKhach: string }> {
  if (!UUID_RE.test(id)) throw new LoiQuyTrinh(400, 'THAM_SO', 'id workflow không hợp lệ.');
  const k = await khach(db, userId);
  const { data, error } = await db.from('quy_trinh').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Không đọc được workflow: ${error.message}`);
  if (!data || !k.has(String(data.company_id))) throw new LoiQuyTrinh(404, 'KHONG_THAY', 'Không thấy workflow này.');
  return { r: data, tenKhach: k.get(String(data.company_id))! };
}

const hienCua = (r: Row, pa: PhuongAn, kn: Map<string, KetNoi>) =>
  apPhuongAn(chuanHoa(r.do_thi), pa, { daKetNoi: new Set(kn.keys()), linhVuc: r.linh_vuc as LinhVuc });

const ghiTin = async (db: Db, r: Row, vai: 'nguoi' | 'mimi', noi_dung: string, meo?: string, phan_ung?: { meo: string; emoji: string }[]) => {
  const { error } = await db.from('tin_quy_trinh').insert({ quy_trinh_id: r.id, company_id: r.company_id, vai, noi_dung: noi_dung.slice(0, 1200), ...(meo ? { meo } : {}), ...(phan_ung?.length ? { phan_ung } : {}) });
  if (error) throw new Error(`Không ghi được tin: ${error.message}`);
};

const capNhat = async (db: Db, id: string, sua: Row) => {
  const { error } = await db.from('quy_trinh').update({ ...sua, cap_nhat_luc: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Không lưu được workflow: ${error.message}`);
};

/** Sửa được khi không đang chạy; đã chạy xong → về bản nháp. */
const choSua = (r: Row): Row => {
  if (r.trang_thai === 'dang_chay') throw new LoiQuyTrinh(409, 'DANG_CHAY', 'Workflow đang chạy — chờ chạy xong rồi sửa.');
  return r.trang_thai === 'nhap' ? {} : { trang_thai: 'nhap', lan_chay: null };
};

const moTaDem = (d: DoThi, pa: PhuongAn) => {
  const s = demBuoc(apPhuongAn(d, pa));
  return `${s.tong} bước: mèo agent ${s.agent}, người ${s.nguoi}, duyệt ${s.duyet}${s.can_ket_noi ? `, ${s.can_ket_noi} cần kết nối` : ''}`;
};

// ── Dựng ────────────────────────────────────────────────────────────────────

export async function taoQuyTrinh(db: Db, userId: string, d: { company_id?: unknown; cau?: unknown; mau?: unknown }, hoi?: HoiMoHinh): Promise<string> {
  const mauChon = d.mau ? THU_VIEN.find((m) => m.khoa === d.mau) : undefined;
  const cau = String(d.cau ?? (mauChon?.tieu_de ?? '')).replace(/\s+/g, ' ').trim();
  const cid = String(d.company_id ?? '').toLowerCase();
  if (cau.length < 3 || cau.length > 1000) throw new LoiQuyTrinh(400, 'THAM_SO', 'Mô tả việc dài 3–1000 ký tự.');
  const k = await khach(db, userId);
  if (!UUID_RE.test(cid) || !k.has(cid)) throw new LoiQuyTrinh(403, 'KHONG_DU_QUYEN', 'Bạn không làm sổ cho công ty này.');

  let kq: { tieu_de: string; linh_vuc: LinhVuc; do_thi: DoThi } | null = null;
  let nguon: 'ai' | 'mau' = 'mau';
  let cong = '';
  const goiY = mauChon ?? chonMau(cau);
  if (!mauChon && hoi) {
    try {
      // Mẫu gần nhất trong thư viện làm ví dụ cho mô hình → workflow đa dạng nhưng vẫn theo chu trình chuẩn.
      const r = await hoi(`${LOI_NHAC_DUNG}\n\n${kienThucChoLoiNhac(goiY?.linh_vuc ?? nhanLinhVuc(cau))}`, cauDung(cau) + (goiY ? `\nMẫu tham khảo gần nhất (${goiY.khung}): ${JSON.stringify(goiY.do_thi)}` : ''));
      kq = docKetQuaDung(r.text);
      if (kq) { nguon = 'ai'; cong = r.cong; }
    } catch { kq = null; }
  }
  if (!kq) {
    const lv = goiY?.linh_vuc ?? nhanLinhVuc(cau);
    kq = goiY ? { tieu_de: goiY.tieu_de, linh_vuc: goiY.linh_vuc, do_thi: goiY.do_thi } : { tieu_de: MAU[lv].tieu_de, linh_vuc: lv, do_thi: chuanHoa(MAU[lv].do_thi) };
  }
  kq = { ...kq, do_thi: ganVaiTroMacDinh(kq.do_thi, kq.linh_vuc) };
  const { data, error } = await db.from('quy_trinh').insert({
    company_id: cid, nguoi_tao: userId, tieu_de: kq.tieu_de, linh_vuc: kq.linh_vuc, cau_goc: cau, nguon, do_thi: kq.do_thi,
  }).select('*').single();
  if (error) throw new Error(`Không tạo được workflow: ${error.message}`);
  await ghiTin(db, data, 'nguoi', cau);
  await ghiTin(db, data, 'mimi',
    `${nguon === 'ai' ? `Đã dựng bằng AI (${cong})` : `Đã dựng từ thư viện${goiY ? ` — ${goiY.khung}` : ''}`} · ${TEN_LINH_VUC[kq.linh_vuc]} · ` +
    `${moTaDem(kq.do_thi, 'nguoi_ai')}. Bấm bước để chỉnh, hoặc nhắn ở đây.`);
  return String(data.id);
}

/** Bước người / duyệt chưa có vai trò → gán vai trò đúng nghề; bước ghi chưa có bằng chứng → nhật ký MIMI. Không đè cái đã có. */
export function ganVaiTroMacDinh(d: DoThi, lv: LinhVuc): DoThi {
  const bo = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const vt = KIEN_THUC[lv].vai_tro;
  return { ...d, nut: d.nut.map((n) => {
    const t = bo(`${n.ten} ${n.mo_ta}`);
    const o = { ...n };
    if ((n.loai === 'nguoi' || n.loai === 'duyet') && !n.vai_tro) {
      o.vai_tro = n.tac_dong === 'chuyen_tien' ? 'Thủ quỹ / người chuyển tiền'
        : /giam doc tai chinh|cfo/.test(t) ? 'Giám đốc tài chính (CFO)'
          : /ke toan truong/.test(t) ? 'Kế toán trưởng'
            : /(^| )ky |nop|dai dien/.test(t) ? 'Người đại diện / được uỷ quyền'
              : n.loai === 'duyet' ? (vt.find((v) => /Trưởng|CFO|Kế toán trưởng/.test(v)) ?? vt[vt.length - 1]) : vt[0];
    }
    if (n.loai === 'duyet' && !n.kiem_soat) o.kiem_soat = 'phong_ngua';
    if (n.tac_dong === 'ghi' && !n.bang_chung) o.bang_chung = 'Nhật ký thay đổi của MIMI (ai, lúc nào, trước → sau) + chứng từ đính kèm';
    return o;
  }) };
}

// ── Sửa ─────────────────────────────────────────────────────────────────────

export async function suaQuyTrinh(db: Db, userId: string, id: string, loiTho: unknown, hoi?: HoiMoHinh): Promise<void> {
  const loi = String(loiTho ?? '').replace(/\s+/g, ' ').trim();
  if (loi.length < 2 || loi.length > 1000) throw new LoiQuyTrinh(400, 'THAM_SO', 'Lời nhắn dài 2–1000 ký tự.');
  const { r } = await docRow(db, userId, id);
  const reset = choSua(r);
  await ghiTin(db, r, 'nguoi', loi);
  if (!hoi) { await ghiTin(db, r, 'mimi', 'Chưa có mô hình AI để sửa bằng lời — bấm bước trên khung để chỉnh tay.'); return; }
  let kq: ReturnType<typeof docKetQuaSua> = null;
  try { kq = docKetQuaSua((await hoi(LOI_NHAC_SUA, cauSua(r.do_thi, loi))).text); } catch { kq = null; }
  if (!kq) { await ghiTin(db, r, 'mimi', 'Chưa sửa được theo lời này — workflow giữ nguyên. Thử nói cụ thể: thêm / bỏ / đổi bước nào.'); return; }
  await capNhat(db, r.id, { ...reset, do_thi: kq.do_thi });
  await ghiTin(db, r, 'mimi', `${kq.tra_loi} (${moTaDem(kq.do_thi, r.phuong_an)})`);
}

export async function suaTay(db: Db, userId: string, id: string, b: Record<string, unknown>): Promise<void> {
  const { r } = await docRow(db, userId, id);
  const reset = choSua(r);
  let moi: DoThi;
  try { moi = apThaoTac(chuanHoa(r.do_thi), docThaoTac(b)); }
  catch (e) { throw new LoiQuyTrinh(400, 'SUA_TAY', e instanceof Error ? e.message : 'Không sửa được.'); }
  await capNhat(db, r.id, { ...reset, do_thi: moi });
}

export async function doiPhuongAn(db: Db, userId: string, id: string, pa: unknown): Promise<void> {
  if (!(PHUONG_AN as readonly string[]).includes(String(pa))) throw new LoiQuyTrinh(400, 'THAM_SO', 'Phương án không hợp lệ.');
  const { r } = await docRow(db, userId, id);
  await capNhat(db, r.id, { ...choSua(r), phuong_an: pa });
}

export async function ganEmail(db: Db, userId: string, id: string, nutId: unknown, email: unknown): Promise<void> {
  const { r } = await docRow(db, userId, id);
  const nid = String(nutId ?? '');
  if (!/^[a-z0-9_]{1,24}$/.test(nid)) throw new LoiQuyTrinh(400, 'THAM_SO', 'Không có bước này.');
  const e = String(email ?? '').trim().toLowerCase();
  if (e && !laEmail(e)) throw new LoiQuyTrinh(400, 'THAM_SO', 'Email không hợp lệ.');
  const tn: Record<string, GanTaiNguyen> = { ...(r.tai_nguyen ?? {}) };
  if (e) tn[nid] = { email: e }; else delete tn[nid];
  await capNhat(db, r.id, { tai_nguyen: tn });
}

export async function ganKetNoi(db: Db, userId: string, id: string, b: Record<string, unknown>, khoaCongKhai: string | undefined): Promise<void> {
  const { r } = await docRow(db, userId, id);
  try { await luuKetNoi(db, String(r.company_id), userId, b, khoaCongKhai); }
  catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m.startsWith('THAM_SO:')) throw new LoiQuyTrinh(400, 'THAM_SO', m.slice(8));
    throw e;
  }
}

// ── Chạy ────────────────────────────────────────────────────────────────────

async function luuLanChay(db: Db, r: Row, l: LanChay, kn: Map<string, KetNoi>) {
  const hien = hienCua(r, r.phuong_an, kn);
  const tt = trangThai(hien, l);
  const ketThuc = tt === 'xong' || tt === 'dung';
  await capNhat(db, r.id, { lan_chay: l, trang_thai: ketThuc ? tt : 'dang_chay' });
  if (ketThuc) {
    const { error } = await db.from('lan_chay_quy_trinh').insert({
      quy_trinh_id: r.id, company_id: r.company_id, phuong_an: r.phuong_an, trang_thai: tt,
      bat_dau: l.bat_dau, ket_thuc: l.ket_thuc ?? new Date().toISOString(), hieu_suat: hieuSuat(hien, l),
    });
    if (error) throw new Error(`Không lưu được lần chạy: ${error.message}`);
  }
}

/**
 * Nhóm chat của workflow (kiểu Zalo): mèo nào làm xong việc thì tự lên tiếng trong nhóm; bước bị chặn thì báo; đến lượt
 * người thì Mèo Thư ký nhắc. Chỉ báo CHUYỂN TRẠNG THÁI so với lần trước, nên bấm lại không lặp tin.
 */
export async function baoTienDo(db: Db, r: Row, truoc: LanChay | null, sau: LanChay, hien: ReturnType<typeof apPhuongAn>): Promise<void> {
  const tin: { meo: string; noi: string; dn?: DongNghiep }[] = [];
  for (const n of hien.nut) {
    if (n.loai === 'kich_hoat') continue;
    const b = sau.buoc[n.id];
    if (!b || truoc?.buoc[n.id]?.tt === b.tt) continue;
    const meo = n.meo ?? 'thu_ky';
    if (b.tt === 'xong' && b.ai_lam === 'agent') tin.push({ meo, noi: `✓ ${n.ten}${b.ket_qua ? ` — ${b.ket_qua}` : ''}`, dn: sauBuoc(hien, n, 'xong') });
    else if (b.tt === 'chan') tin.push({ meo, noi: `⚠ ${n.ten}: ${b.ket_qua ?? 'đang bị chặn'}`, dn: sauBuoc(hien, n, 'chan') });
    else if (b.tt === 'can_nguoi') tin.push({ meo: 'thu_ky', noi: `Đến lượt ${n.vai_tro ? `anh/chị (${n.vai_tro})` : 'người phụ trách'}: "${n.ten}"${n.loai === 'duyet' ? ' — cần duyệt' : ''}.` });
  }
  for (const t of tin) {
    await ghiTin(db, r, 'mimi', t.noi, t.meo, t.dn?.phan_ung);
    if (t.dn?.tra) await ghiTin(db, r, 'mimi', t.dn.tra.noi, t.dn.tra.meo);
  }
  // Cả quy trình vừa xong (lần trước chưa xong) → ăn mừng.
  if (trangThai(hien, sau) === 'xong' && (!truoc || trangThai(hien, truoc) !== 'xong')) {
    const kt = ketThuc(hien);
    if (kt.tra) await ghiTin(db, r, 'mimi', kt.tra.noi, kt.tra.meo, kt.phan_ung);
  }
}

export type TaoThucThi = (r: Row, kn: Map<string, KetNoi>) => ThucThi;

/** Chốt & chạy (hoặc chạy lại sau khi xong / dừng). Bước người chưa gán Gmail → gán người tạo. */
export async function chayQuyTrinh(db: Db, userId: string, id: string, emailNguoiTao: string | null, thucThi: TaoThucThi): Promise<void> {
  const { r } = await docRow(db, userId, id);
  if (r.trang_thai === 'dang_chay') throw new LoiQuyTrinh(409, 'DANG_CHAY', 'Workflow đang chạy.');
  const kn = await docKetNoi(db, String(r.company_id));
  const hien = hienCua(r, r.phuong_an, kn);
  const loiLuat = viPhamLuat(hien);
  if (loiLuat.length) throw new LoiQuyTrinh(400, 'VI_PHAM_LUAT', `Workflow vi phạm luật an toàn: ${loiLuat.join('; ')}`);
  const tn: Record<string, GanTaiNguyen> = { ...(r.tai_nguyen ?? {}) };
  for (const t of taiNguyenCan(hien, tn)) if (t.kieu === 'gmail' && !t.co_san && emailNguoiTao && laEmail(emailNguoiTao)) tn[t.nut_id] = { email: emailNguoiTao.toLowerCase() };
  const l = await diTiep(hien, lanChayMoi(hien, new Date().toISOString()), thucThi(r, kn));
  await capNhat(db, r.id, { tai_nguyen: tn });
  await luuLanChay(db, { ...r, tai_nguyen: tn }, l, kn);
  await baoTienDo(db, r, null, l, hien);
}

export async function xuLyBuoc(db: Db, userId: string, id: string, nutId: unknown, quyet: unknown, ghiChu: unknown, thucThi: TaoThucThi): Promise<void> {
  const q = String(quyet);
  if (!['xong', 'duyet', 'tu_choi'].includes(q)) throw new LoiQuyTrinh(400, 'THAM_SO', 'Quyết định không hợp lệ.');
  const { r } = await docRow(db, userId, id);
  if (r.trang_thai !== 'dang_chay' || !r.lan_chay) throw new LoiQuyTrinh(409, 'KHONG_CHAY', 'Workflow không đang chạy.');
  const kn = await docKetNoi(db, String(r.company_id));
  const hien = hienCua(r, r.phuong_an, kn);
  let l: LanChay;
  try { l = nguoiXuLy(hien, r.lan_chay, String(nutId ?? ''), q as 'xong', ghiChu == null ? null : String(ghiChu), new Date().toISOString(), userId); }
  catch (e) { throw new LoiQuyTrinh(409, 'BUOC', e instanceof Error ? e.message : 'Không xử lý được bước này.'); }
  if (q !== 'tu_choi') l = await diTiep(hien, l, thucThi(r, kn));
  await luuLanChay(db, r, l, kn);
  // Người quyết → hiện trong nhóm như một người thật, Mèo Thư ký ghi nhận (không gọi AI).
  const nut = hien.nut.find((n) => n.id === String(nutId ?? ''));
  const dn = sauNguoi(q as 'xong' | 'duyet' | 'tu_choi');
  const ghi = ghiChu == null || String(ghiChu).trim() === '' ? '' : ` — ${String(ghiChu).slice(0, 200)}`;
  await ghiTin(db, r, 'nguoi', `${q === 'duyet' ? '✓ Đã duyệt' : q === 'tu_choi' ? '↩ Cần sửa' : '✓ Đã làm xong'}: ${nut?.ten ?? 'bước'}${ghi}`, undefined, dn.phan_ung);
  if (dn.tra) await ghiTin(db, r, 'mimi', dn.tra.noi, dn.tra.meo);
  await baoTienDo(db, r, r.lan_chay, l, hien);
}

// ── Đọc ─────────────────────────────────────────────────────────────────────

export async function dsQuyTrinh(db: Db, userId: string): Promise<Row[]> {
  const k = await khach(db, userId);
  const ids = [...k.keys()];
  if (!ids.length) return [];
  const { data, error } = await db.from('quy_trinh').select('id, company_id, tieu_de, linh_vuc, nguon, phuong_an, trang_thai, do_thi, lan_chay, cap_nhat_luc')
    .in('company_id', ids).order('cap_nhat_luc', { ascending: false }).limit(100);
  if (error) throw new Error(`Không đọc được workflow: ${error.message}`);
  return (data ?? []).filter((r: Row) => k.has(String(r.company_id))).map((r: Row) => {
    const { do_thi, lan_chay, ...con } = r;
    let dem = null, meo: string[] = [], tt = null;
    try {
      const h = apPhuongAn(chuanHoa(do_thi), r.phuong_an, { linhVuc: r.linh_vuc });
      dem = demBuoc(h);
      meo = [...new Set(h.nut.map((n) => n.meo).filter(Boolean) as string[])];
      tt = lan_chay ? trangThai(h, lan_chay) : null;
    } catch { /* đồ thị hỏng: không đếm */ }
    return { ...con, ten_khach: k.get(String(r.company_id)), dem, meo, trang_thai_chay: tt };
  });
}

export async function xemQuyTrinh(db: Db, userId: string, id: string): Promise<Row> {
  const { r, tenKhach } = await docRow(db, userId, id);
  const kn = await docKetNoi(db, String(r.company_id));
  const goc = chuanHoa(r.do_thi);
  const hien = hienCua(r, r.phuong_an, kn);
  const [{ data: tin, error: e1 }, { data: lich, error: e2 }] = await Promise.all([
    db.from('tin_quy_trinh').select('id, vai, noi_dung, luc, meo, phan_ung').eq('quy_trinh_id', r.id).order('id', { ascending: true }).limit(300),
    db.from('lan_chay_quy_trinh').select('phuong_an, trang_thai, bat_dau, ket_thuc, hieu_suat').eq('quy_trinh_id', r.id).order('ket_thuc', { ascending: false }).limit(30),
  ]);
  if (e1 || e2) throw new Error(`Không đọc được workflow: ${(e1 ?? e2).message}`);
  const lan = r.trang_thai === 'nhap' ? null : r.lan_chay;
  return {
    id: r.id, company_id: r.company_id, ten_khach: tenKhach, tieu_de: r.tieu_de, linh_vuc: r.linh_vuc, nguon: r.nguon,
    cau_goc: r.cau_goc, phuong_an: r.phuong_an, trang_thai: r.trang_thai,
    do_thi: hien,
    so_sanh: Object.fromEntries(PHUONG_AN.map((pa) => [pa, demBuoc(hienCua(r, pa, kn))])),
    tai_nguyen: taiNguyenCan(hien, r.tai_nguyen ?? {}, new Set(kn.keys())),
    ket_noi: [...kn.values()].map((k) => ({ cong_cu: k.cong_cu, kieu: k.kieu, url: k.url, khoa_hien: k.khoa_hien, cong_cu_mcp: k.cong_cu_mcp })),
    lan_chay: lan, trang_thai_chay: lan ? trangThai(hien, lan) : null,
    hieu_suat: lan ? hieuSuat(hien, lan) : null,
    goi_y: goiYDieuChinh(hien, r.phuong_an, lan, lich ?? []),
    chuan: kiemChuan(hien, r.linh_vuc as LinhVuc),
    kien_thuc: KIEN_THUC[r.linh_vuc as LinhVuc]?.chuan ?? [],
    lich_su: lich ?? [], tin: tin ?? [],
    _goc_so_buoc: goc.nut.length,
  };
}

export const THU_VIEN_GON = THU_VIEN.map((m) => ({ khoa: m.khoa, linh_vuc: m.linh_vuc, tieu_de: m.tieu_de, mo_ta: m.mo_ta, khung: m.khung, so_buoc: m.do_thi.nut.length - 1 }));
