/**
 * Workflow — lưu trữ & điều phối (22/11/2026). Quyền: chỉ công ty người gọi làm sổ (`docThanhVien`, cùng tập Văn phòng).
 * Mọi id gửi lên được tra lại; khác công ty → 404. Sửa / đổi phương án chỉ khi còn là bản nháp (chưa chạy).
 */
import { docThanhVien } from '../van-phong/danh-muc.ts';
import {
  apPhuongAn, chuanHoa, demBuoc, laEmail, MAU, nhanLinhVuc, PHUONG_AN, taiNguyenCan, TEN_LINH_VUC, viPhamLuat,
  type DoThi, type GanTaiNguyen, type PhuongAn,
} from './do-thi.ts';
import { cauDung, cauSua, docKetQuaDung, docKetQuaSua, LOI_NHAC_DUNG, LOI_NHAC_SUA } from './loi-nhac.ts';
import { diTiep, hieuSuat, lanChayMoi, nguoiXuLy, trangThai, type LanChay, type ThucThi } from './chay.ts';
import type { HoiMoHinh } from './thuc-thi.ts';

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

const ghiTin = async (db: Db, r: Row, vai: 'nguoi' | 'mimi', noi_dung: string) => {
  const { error } = await db.from('tin_quy_trinh').insert({ quy_trinh_id: r.id, company_id: r.company_id, vai, noi_dung: noi_dung.slice(0, 1200) });
  if (error) throw new Error(`Không ghi được tin: ${error.message}`);
};

const capNhat = async (db: Db, id: string, sua: Row) => {
  const { error } = await db.from('quy_trinh').update({ ...sua, cap_nhat_luc: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Không lưu được workflow: ${error.message}`);
};

const moTaDem = (d: DoThi, pa: PhuongAn) => {
  const s = demBuoc(apPhuongAn(d, pa));
  return `${s.tong} bước: agent ${s.agent}, người ${s.nguoi}, duyệt ${s.duyet}${s.can_ket_noi ? `, ${s.can_ket_noi} cần kết nối` : ''}`;
};

// ── Dựng ────────────────────────────────────────────────────────────────────

export async function taoQuyTrinh(db: Db, userId: string, d: { company_id?: unknown; cau?: unknown }, hoi?: HoiMoHinh): Promise<string> {
  const cau = String(d.cau ?? '').replace(/\s+/g, ' ').trim();
  const cid = String(d.company_id ?? '').toLowerCase();
  if (cau.length < 3 || cau.length > 1000) throw new LoiQuyTrinh(400, 'THAM_SO', 'Mô tả việc dài 3–1000 ký tự.');
  const k = await khach(db, userId);
  if (!UUID_RE.test(cid) || !k.has(cid)) throw new LoiQuyTrinh(403, 'KHONG_DU_QUYEN', 'Bạn không làm sổ cho công ty này.');

  let kq: { tieu_de: string; linh_vuc: ReturnType<typeof nhanLinhVuc>; do_thi: DoThi } | null = null;
  let nguon: 'ai' | 'mau' = 'mau';
  let cong = '';
  if (hoi) {
    try {
      const r = await hoi(LOI_NHAC_DUNG, cauDung(cau));
      kq = docKetQuaDung(r.text);
      if (kq) { nguon = 'ai'; cong = r.cong; }
    } catch { kq = null; }
  }
  if (!kq) {
    const lv = nhanLinhVuc(cau);
    kq = { tieu_de: MAU[lv].tieu_de, linh_vuc: lv, do_thi: chuanHoa(MAU[lv].do_thi) };
  }
  const { data, error } = await db.from('quy_trinh').insert({
    company_id: cid, nguoi_tao: userId, tieu_de: kq.tieu_de, linh_vuc: kq.linh_vuc, cau_goc: cau, nguon, do_thi: kq.do_thi,
  }).select('*').single();
  if (error) throw new Error(`Không tạo được workflow: ${error.message}`);
  await ghiTin(db, data, 'nguoi', cau);
  await ghiTin(db, data, 'mimi',
    `${nguon === 'ai' ? `Đã dựng workflow bằng AI (${cong})` : 'Đã dựng workflow từ mẫu'} — lĩnh vực ${TEN_LINH_VUC[kq.linh_vuc]}. ` +
    `Người + AI: ${moTaDem(kq.do_thi, 'nguoi_ai')}. Bạn muốn sửa gì cứ nhắn ở đây; ưng rồi bấm "Chốt & chạy".`);
  return String(data.id);
}

// ── Sửa bằng chat ───────────────────────────────────────────────────────────

export async function suaQuyTrinh(db: Db, userId: string, id: string, loiTho: unknown, hoi?: HoiMoHinh): Promise<void> {
  const loi = String(loiTho ?? '').replace(/\s+/g, ' ').trim();
  if (loi.length < 2 || loi.length > 1000) throw new LoiQuyTrinh(400, 'THAM_SO', 'Lời nhắn dài 2–1000 ký tự.');
  const { r } = await docRow(db, userId, id);
  await ghiTin(db, r, 'nguoi', loi);
  if (r.trang_thai !== 'nhap') { await ghiTin(db, r, 'mimi', 'Workflow đã chạy nên không sửa được nữa. Bấm "Nhân bản để sửa" để làm bản mới.'); return; }
  if (!hoi) { await ghiTin(db, r, 'mimi', 'Chưa có mô hình AI để sửa bằng lời — thử lại sau.'); return; }
  let kq: ReturnType<typeof docKetQuaSua> = null;
  try { kq = docKetQuaSua((await hoi(LOI_NHAC_SUA, cauSua(r.do_thi, loi))).text); } catch { kq = null; }
  if (!kq) { await ghiTin(db, r, 'mimi', 'Mình chưa sửa được theo lời này — workflow giữ nguyên. Thử nói cụ thể hơn: thêm / bỏ / đổi bước nào.'); return; }
  await capNhat(db, r.id, { do_thi: kq.do_thi });
  await ghiTin(db, r, 'mimi', `${kq.tra_loi} (${moTaDem(kq.do_thi, r.phuong_an)})`);
}

export async function doiPhuongAn(db: Db, userId: string, id: string, pa: unknown): Promise<void> {
  if (!(PHUONG_AN as readonly string[]).includes(String(pa))) throw new LoiQuyTrinh(400, 'THAM_SO', 'Phương án không hợp lệ.');
  const { r } = await docRow(db, userId, id);
  if (r.trang_thai !== 'nhap') throw new LoiQuyTrinh(409, 'DA_CHAY', 'Workflow đã chạy.');
  await capNhat(db, r.id, { phuong_an: pa });
}

export async function ganEmail(db: Db, userId: string, id: string, nutId: unknown, email: unknown): Promise<void> {
  const { r } = await docRow(db, userId, id);
  const nid = String(nutId ?? '');
  if (!(r.do_thi?.nut ?? []).some((n: Row) => n.id === nid) && !nid.startsWith('duyet_')) throw new LoiQuyTrinh(400, 'THAM_SO', 'Không có bước này.');
  const e = String(email ?? '').trim().toLowerCase();
  if (e && !laEmail(e)) throw new LoiQuyTrinh(400, 'THAM_SO', 'Email không hợp lệ.');
  const tn: Record<string, GanTaiNguyen> = { ...(r.tai_nguyen ?? {}) };
  if (e) tn[nid] = { email: e }; else delete tn[nid];
  await capNhat(db, r.id, { tai_nguyen: tn });
}

// ── Chạy ────────────────────────────────────────────────────────────────────

async function luuLanChay(db: Db, r: Row, l: LanChay, pa: PhuongAn) {
  const hien = apPhuongAn(chuanHoa(r.do_thi), pa);
  const tt = trangThai(hien, l);
  const ketThuc = tt === 'xong' || tt === 'dung';
  await capNhat(db, r.id, { lan_chay: l, trang_thai: ketThuc ? tt : 'dang_chay' });
  if (ketThuc) {
    const { error } = await db.from('lan_chay_quy_trinh').insert({
      quy_trinh_id: r.id, company_id: r.company_id, phuong_an: pa, trang_thai: tt,
      bat_dau: l.bat_dau, ket_thuc: l.ket_thuc ?? new Date().toISOString(), hieu_suat: hieuSuat(hien, l),
    });
    if (error) throw new Error(`Không lưu được lần chạy: ${error.message}`);
  }
}

/** Chốt & chạy (hoặc chạy lại sau khi xong / dừng). Bước người chưa gán Gmail → gán người tạo. */
export async function chayQuyTrinh(db: Db, userId: string, id: string, emailNguoiTao: string | null, thucThi: (r: Row) => ThucThi): Promise<void> {
  const { r } = await docRow(db, userId, id);
  if (r.trang_thai === 'dang_chay') throw new LoiQuyTrinh(409, 'DANG_CHAY', 'Workflow đang chạy.');
  const goc = chuanHoa(r.do_thi);
  const hien = apPhuongAn(goc, r.phuong_an);
  const loiLuat = viPhamLuat(hien);
  if (loiLuat.length) throw new LoiQuyTrinh(400, 'VI_PHAM_LUAT', `Workflow vi phạm luật an toàn: ${loiLuat.join('; ')}`);
  const tn: Record<string, GanTaiNguyen> = { ...(r.tai_nguyen ?? {}) };
  for (const t of taiNguyenCan(hien, tn)) if (t.kieu === 'gmail' && !t.co_san && emailNguoiTao && laEmail(emailNguoiTao)) tn[t.nut_id] = { email: emailNguoiTao.toLowerCase() };
  const l = await diTiep(hien, lanChayMoi(hien, new Date().toISOString()), thucThi(r));
  await capNhat(db, r.id, { tai_nguyen: tn });
  await luuLanChay(db, { ...r, tai_nguyen: tn }, l, r.phuong_an);
  await ghiTin(db, r, 'mimi', `Bắt đầu chạy (${r.phuong_an === 'nguoi' ? 'Người làm' : r.phuong_an === 'ai' ? 'AI tối đa' : 'Người + AI'}).`);
}

export async function xuLyBuoc(db: Db, userId: string, id: string, nutId: unknown, quyet: unknown, ghiChu: unknown, thucThi: (r: Row) => ThucThi): Promise<void> {
  const q = String(quyet);
  if (!['xong', 'duyet', 'tu_choi'].includes(q)) throw new LoiQuyTrinh(400, 'THAM_SO', 'Quyết định không hợp lệ.');
  const { r } = await docRow(db, userId, id);
  if (r.trang_thai !== 'dang_chay' || !r.lan_chay) throw new LoiQuyTrinh(409, 'KHONG_CHAY', 'Workflow không đang chạy.');
  const hien = apPhuongAn(chuanHoa(r.do_thi), r.phuong_an);
  let l: LanChay;
  try { l = nguoiXuLy(hien, r.lan_chay, String(nutId ?? ''), q as 'xong', ghiChu == null ? null : String(ghiChu), new Date().toISOString()); }
  catch (e) { throw new LoiQuyTrinh(409, 'BUOC', e instanceof Error ? e.message : 'Không xử lý được bước này.'); }
  if (q !== 'tu_choi') l = await diTiep(hien, l, thucThi(r));
  await luuLanChay(db, r, l, r.phuong_an);
}

// ── Đọc ─────────────────────────────────────────────────────────────────────

export async function dsQuyTrinh(db: Db, userId: string): Promise<Row[]> {
  const k = await khach(db, userId);
  const ids = [...k.keys()];
  if (!ids.length) return [];
  const { data, error } = await db.from('quy_trinh').select('id, company_id, tieu_de, linh_vuc, nguon, phuong_an, trang_thai, do_thi, cap_nhat_luc')
    .in('company_id', ids).order('cap_nhat_luc', { ascending: false }).limit(100);
  if (error) throw new Error(`Không đọc được workflow: ${error.message}`);
  return (data ?? []).filter((r: Row) => k.has(String(r.company_id))).map((r: Row) => {
    const { do_thi, ...con } = r;
    let dem = null;
    try { dem = demBuoc(apPhuongAn(chuanHoa(do_thi), r.phuong_an)); } catch { /* đồ thị hỏng: không đếm */ }
    return { ...con, ten_khach: k.get(String(r.company_id)), dem };
  });
}

export async function xemQuyTrinh(db: Db, userId: string, id: string): Promise<Row> {
  const { r, tenKhach } = await docRow(db, userId, id);
  const goc = chuanHoa(r.do_thi);
  const hien = apPhuongAn(goc, r.phuong_an);
  const [{ data: tin, error: e1 }, { data: lich, error: e2 }] = await Promise.all([
    db.from('tin_quy_trinh').select('id, vai, noi_dung, luc').eq('quy_trinh_id', r.id).order('id', { ascending: true }).limit(300),
    db.from('lan_chay_quy_trinh').select('phuong_an, trang_thai, bat_dau, ket_thuc, hieu_suat').eq('quy_trinh_id', r.id).order('ket_thuc', { ascending: false }).limit(30),
  ]);
  if (e1 || e2) throw new Error(`Không đọc được workflow: ${(e1 ?? e2).message}`);
  return {
    id: r.id, company_id: r.company_id, ten_khach: tenKhach, tieu_de: r.tieu_de, linh_vuc: r.linh_vuc, nguon: r.nguon,
    cau_goc: r.cau_goc, phuong_an: r.phuong_an, trang_thai: r.trang_thai,
    do_thi: hien,
    so_sanh: Object.fromEntries(PHUONG_AN.map((pa) => [pa, demBuoc(apPhuongAn(goc, pa))])),
    tai_nguyen: taiNguyenCan(hien, r.tai_nguyen ?? {}),
    lan_chay: r.lan_chay, trang_thai_chay: r.lan_chay ? trangThai(hien, r.lan_chay) : null,
    hieu_suat: r.lan_chay ? hieuSuat(hien, r.lan_chay) : null,
    lich_su: lich ?? [], tin: tin ?? [],
  };
}
