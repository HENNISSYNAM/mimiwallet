/**
 * AGENTIC AI SPACE — lưu trữ và chuỗi chạy (22/11/2026).
 *
 * QUYỀN. Người gọi chỉ thấy / giao / chạy việc ở khách họ làm sổ — cùng tập với Văn phòng (`docThanhVien`: chủ sở hữu,
 * quản trị, kế toán; không bị giới hạn một cơ sở). Mọi id việc gửi lên được tra lại và khớp tập đó; khác → 404.
 *
 * CHUỖI. Chạy một việc có thể sinh việc con (agent giao agent) hoặc xong một việc con (việc cha chạy tiếp). `chayChuoi`
 * đi hết chuỗi trong MỘT lần gọi, tối đa `TOI_DA_LUOT_CHUOI` lượt, để người bấm một lần thấy cả cuộc trao đổi.
 */
import { docDanhMucKhach, docThanhVien } from '../van-phong/danh-muc.ts';
import {
  chayViec, chonAgentTuCau, DANG_MO, keHoachMoi, laAgentSpace, TEN_AGENT_AI, TEN_HIEN_THI,
  type CongCuAgent, type DuLieuKhach, type Tin, type TrangThaiViec, type Viec, type YKienAi,
} from './dong-co.ts';

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export const TOI_DA_LUOT_CHUOI = 6;
export const TOI_DA_VIEC_BANG = 200;
export const NGAY_GIU_VIEC_XONG = 14;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class LoiSpace extends Error {
  constructor(public status: number, public ma: string, cau: string) { super(cau); }
}

export interface KhachCuaToi { id: string; ten: string }

async function khachCuaToi(db: Db, userId: string): Promise<Map<string, KhachCuaToi>> {
  const { duoc } = await docThanhVien(db, userId);
  return new Map(duoc.map((t) => [t.company_id, { id: t.company_id, ten: t.ten }]));
}

const tuDong = (r: Row, ten: string): Viec => ({
  id: String(r.id), company_id: String(r.company_id), ten_khach: ten,
  agent: r.agent, tieu_de: String(r.tieu_de), han: r.han ?? null, trang_thai: r.trang_thai,
  ke_hoach: Array.isArray(r.ke_hoach) ? r.ke_hoach : [], viec_cha_id: r.viec_cha_id ?? null, ket_qua: r.ket_qua ?? {},
});

async function docViec(db: Db, id: string, khach: Map<string, KhachCuaToi>): Promise<Viec> {
  if (!UUID_RE.test(id)) throw new LoiSpace(400, 'THAM_SO', 'id việc không hợp lệ.');
  const { data, error } = await db.from('viec_space').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Không đọc được việc: ${error.message}`);
  const k = data ? khach.get(String(data.company_id)) : undefined;
  if (!data || !k) throw new LoiSpace(404, 'KHONG_THAY', 'Không thấy việc này.');
  return tuDong(data, k.ten);
}

async function themTin(db: Db, viec: { id: string; company_id: string }, ds: Tin[]): Promise<void> {
  if (!ds.length) return;
  const { error } = await db.from('tin_viec_space').insert(ds.map((t) => ({
    viec_id: viec.id, company_id: viec.company_id, tu: t.tu, den: t.den, loai: t.loai,
    noi_dung: t.noi_dung.slice(0, 600), lien_ket: t.lien_ket ?? null,
  })));
  if (error) throw new Error(`Không ghi được tin: ${error.message}`);
}

async function chenViec(db: Db, userId: string, v: { company_id: string; agent: Viec['agent']; tieu_de: string; han: string | null; viec_cha_id: string | null }): Promise<string> {
  const { data, error } = await db.from('viec_space').insert({
    company_id: v.company_id, nguoi_giao: userId, agent: v.agent, tieu_de: v.tieu_de.slice(0, 200),
    han: v.han, trang_thai: 'cho', ke_hoach: keHoachMoi(v.agent), viec_cha_id: v.viec_cha_id, ket_qua: {},
  }).select('id').single();
  if (error) throw new Error(`Không tạo được việc: ${error.message}`);
  return String(data.id);
}

const tinKeHoach = (agent: Viec['agent']): Tin => ({
  tu: agent, den: null, loai: 'ke_hoach',
  noi_dung: `${TEN_HIEN_THI[agent]} nhận việc. Kế hoạch: ${keHoachMoi(agent).map((b, i) => `${i + 1}. ${b.ten}`).join(' · ')}`,
});

/** Ghi ý kiến AI vào hàng duyệt (thay ý kiến AI cũ cho cùng khoản). Không đụng sổ. */
async function ghiYKienAi(db: Db, companyId: string, userId: string, ds: YKienAi[]): Promise<void> {
  if (!ds.length) return;
  const ids = ds.map((y) => y.transaction_id);
  const { error: e1 } = await db.from('de_xuat_agent_ngoai').delete()
    .eq('company_id', companyId).eq('nguon', 'agent_mimi').eq('ten_agent', TEN_AGENT_AI).in('transaction_id', ids);
  if (e1) throw new Error(`Không thay được ý kiến AI cũ: ${e1.message}`);
  const { error } = await db.from('de_xuat_agent_ngoai').insert(ds.map((y) => ({
    company_id: companyId, transaction_id: y.transaction_id, loai: y.loai, ly_do: y.ly_do,
    nguon: 'agent_mimi', ten_agent: TEN_AGENT_AI, khoa_mcp_id: null, user_id: userId,
  })));
  if (error) throw new Error(`Không ghi được ý kiến AI: ${error.message}`);
}

/** Đi hết chuỗi bắt đầu từ `batDau`. `cc(companyId)` cấp công cụ (AI) cho từng khách. */
export async function chayChuoi(
  db: Db, userId: string, batDau: string, khach: Map<string, KhachCuaToi>, cc: (companyId: string) => CongCuAgent,
): Promise<number> {
  const hang: string[] = [batDau];
  const duCache = new Map<string, DuLieuKhach>();
  const docDu = async (companyId: string): Promise<DuLieuKhach> => {
    if (!duCache.has(companyId)) {
      const dm = await docDanhMucKhach(db, userId, { kichThuoc: 50 });
      // Danh mục phân trang 50/khách: tìm đúng khách ở mọi trang đã tính (hàng duyệt là của mọi khách).
      let k = dm.khach.find((x) => x.id === companyId) ?? null;
      for (let t = 2; !k && t <= dm.so_trang; t++) k = (await docDanhMucKhach(db, userId, { kichThuoc: 50, trang: t })).khach.find((x) => x.id === companyId) ?? null;
      duCache.set(companyId, { khach: k, hang: dm.hang_duyet.filter((d) => d.company_id === companyId) });
    }
    return duCache.get(companyId)!;
  };

  let luot = 0;
  while (hang.length && luot < TOI_DA_LUOT_CHUOI) {
    luot++;
    const viec = await docViec(db, hang.shift()!, khach);
    if (!DANG_MO.includes(viec.trang_thai)) continue;
    const { data: con, error: eCon } = await db.from('viec_space').select('id, trang_thai').eq('viec_cha_id', viec.id);
    if (eCon) throw new Error(`Không đọc được việc con: ${eCon.message}`);
    const conDangMo = (con ?? []).some((c: Row) => DANG_MO.includes(c.trang_thai));

    const kq = await chayViec(viec, await docDu(viec.company_id), cc(viec.company_id), conDangMo);
    if (kq.y_kien.length) { await ghiYKienAi(db, viec.company_id, userId, kq.y_kien); duCache.delete(viec.company_id); }

    const { error } = await db.from('viec_space').update({
      trang_thai: kq.viec.trang_thai, ke_hoach: kq.viec.ke_hoach, ket_qua: kq.viec.ket_qua, cap_nhat_luc: new Date().toISOString(),
    }).eq('id', viec.id);
    if (error) throw new Error(`Không lưu được việc: ${error.message}`);
    await themTin(db, viec, kq.tin);
    // Tin bàn giao gửi agent của việc cha: hiện cả trong luồng việc cha, để người mở việc cha thấy cuộc trao đổi.
    if (viec.viec_cha_id) await themTin(db, { id: viec.viec_cha_id, company_id: viec.company_id }, kq.tin.filter((t) => t.loai === 'ban_giao'));

    for (const m of kq.tao) {
      const id = await chenViec(db, userId, { company_id: viec.company_id, agent: m.agent, tieu_de: m.tieu_de, han: m.han, viec_cha_id: m.viec_cha_id });
      await themTin(db, { id, company_id: viec.company_id }, [m.tin_mo, tinKeHoach(m.agent)]);
      hang.push(id);
    }
    if (kq.viec.trang_thai === 'xong' && viec.viec_cha_id) hang.push(viec.viec_cha_id);
  }
  return luot;
}

// ── Hành động ───────────────────────────────────────────────────────────────

export interface DauVaoTao { company_id?: unknown; cau?: unknown; han?: unknown }

export function kiemTao(d: DauVaoTao): { company_id: string; cau: string; han: string | null } {
  const company_id = String(d.company_id ?? '').trim().toLowerCase();
  const cau = String(d.cau ?? '').replace(/\s+/g, ' ').trim();
  const han = d.han == null || d.han === '' ? null : String(d.han);
  if (!UUID_RE.test(company_id)) throw new LoiSpace(400, 'THAM_SO', 'Chọn khách để giao việc.');
  if (cau.length < 3 || cau.length > 200) throw new LoiSpace(400, 'THAM_SO', 'Mô tả việc dài 3–200 ký tự.');
  if (han !== null && (!NGAY_RE.test(han) || Number.isNaN(Date.parse(han)))) throw new LoiSpace(400, 'THAM_SO', 'Hạn phải là ngày YYYY-MM-DD.');
  return { company_id, cau, han };
}

export async function taoViecSpace(db: Db, userId: string, d: DauVaoTao, cc: (companyId: string) => CongCuAgent, agentChon?: unknown): Promise<string> {
  const v = kiemTao(d);
  const khach = await khachCuaToi(db, userId);
  if (!khach.has(v.company_id)) throw new LoiSpace(403, 'KHONG_DU_QUYEN', 'Bạn không làm sổ cho khách này.');
  const agent = laAgentSpace(agentChon) ? agentChon : chonAgentTuCau(v.cau);
  const id = await chenViec(db, userId, { company_id: v.company_id, agent, tieu_de: v.cau, han: v.han, viec_cha_id: null });
  await themTin(db, { id, company_id: v.company_id }, [
    { tu: 'nguoi', den: agent, loai: 'giao_viec', noi_dung: v.cau },
    tinKeHoach(agent),
  ]);
  await chayChuoi(db, userId, id, khach, cc);
  return id;
}

export async function tiepTucViec(db: Db, userId: string, id: string, cc: (companyId: string) => CongCuAgent): Promise<void> {
  const khach = await khachCuaToi(db, userId);
  const v = await docViec(db, id, khach);
  if (!DANG_MO.includes(v.trang_thai)) throw new LoiSpace(409, 'DA_DONG', 'Việc đã đóng.');
  await chayChuoi(db, userId, id, khach, cc);
}

/** Người xác nhận đã làm phần của mình (ví dụ đã nộp tờ khai). Việc cha (nếu có) chạy tiếp. */
export async function danhDauXong(db: Db, userId: string, id: string, cc: (companyId: string) => CongCuAgent): Promise<void> {
  const khach = await khachCuaToi(db, userId);
  const v = await docViec(db, id, khach);
  if (v.trang_thai !== 'can_ban') throw new LoiSpace(409, 'CHUA_CAN_BAN', 'Việc này chưa chờ bạn.');
  const { error } = await db.from('viec_space').update({
    trang_thai: 'xong', ke_hoach: v.ke_hoach.map((b) => ({ ...b, xong: true })), cap_nhat_luc: new Date().toISOString(),
  }).eq('id', v.id);
  if (error) throw new Error(`Không lưu được việc: ${error.message}`);
  await themTin(db, v, [{ tu: 'nguoi', den: v.agent, loai: 'xong', noi_dung: 'Đã xong phần của tôi.' }]);
  if (v.viec_cha_id) await chayChuoi(db, userId, v.viec_cha_id, khach, cc);
}

export async function huyViec(db: Db, userId: string, id: string): Promise<void> {
  const khach = await khachCuaToi(db, userId);
  const v = await docViec(db, id, khach);
  if (!DANG_MO.includes(v.trang_thai)) throw new LoiSpace(409, 'DA_DONG', 'Việc đã đóng.');
  const bayGio = new Date().toISOString();
  const { error } = await db.from('viec_space').update({ trang_thai: 'huy', cap_nhat_luc: bayGio }).eq('id', v.id);
  if (error) throw new Error(`Không huỷ được việc: ${error.message}`);
  // Việc con đang mở huỷ theo.
  const { error: e2 } = await db.from('viec_space').update({ trang_thai: 'huy', cap_nhat_luc: bayGio })
    .eq('viec_cha_id', v.id).in('trang_thai', DANG_MO as unknown as string[]);
  if (e2) throw new Error(`Không huỷ được việc con: ${e2.message}`);
  await themTin(db, v, [{ tu: 'nguoi', den: v.agent, loai: 'xong', noi_dung: 'Đã huỷ việc.' }]);
}

// ── Đọc bảng ────────────────────────────────────────────────────────────────

export interface DongViec {
  id: string; company_id: string; ten_khach: string; agent: Viec['agent']; tieu_de: string; han: string | null;
  trang_thai: TrangThaiViec; buoc_xong: number; buoc_tong: number; buoc_hien_tai: string | null;
  viec_cha_id: string | null; tin_cuoi: { tu: string; noi_dung: string; luc: string } | null; hoi: { noi_dung: string; lien_ket: string | null } | null;
  cap_nhat_luc: string;
}

export interface TrangThaiAgent { agent: Viec['agent']; ten: string; dang_lam: number; can_ban: number; cho_agent: number; xong_7_ngay: number; gan_nhat: string | null }

export interface BangViec {
  viec: DongViec[];
  khach: KhachCuaToi[];
  agent: TrangThaiAgent[];
  dem: Record<TrangThaiViec, number>;
}

export async function docBangViec(db: Db, userId: string, bayGio = Date.now()): Promise<BangViec> {
  const khach = await khachCuaToi(db, userId);
  const ids = [...khach.keys()];
  const dem = { cho: 0, dang_lam: 0, cho_agent: 0, can_ban: 0, xong: 0, huy: 0 } as Record<TrangThaiViec, number>;
  const dsKhach = [...khach.values()].sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
  const agentRong = (): TrangThaiAgent[] => (['phan_loai', 'thue'] as const).map((a) => ({ agent: a, ten: TEN_HIEN_THI[a], dang_lam: 0, can_ban: 0, cho_agent: 0, xong_7_ngay: 0, gan_nhat: null }));
  if (!ids.length) return { viec: [], khach: dsKhach, agent: agentRong(), dem };

  const tu = new Date(bayGio - NGAY_GIU_VIEC_XONG * 86_400_000).toISOString();
  const { data, error } = await db.from('viec_space').select('*').in('company_id', ids).gte('cap_nhat_luc', tu)
    .order('cap_nhat_luc', { ascending: false }).limit(TOI_DA_VIEC_BANG);
  if (error) throw new Error(`Không đọc được bảng việc: ${error.message}`);
  const rows = ((data ?? []) as Row[]).filter((r) => khach.has(String(r.company_id)) && r.trang_thai !== 'huy');

  const tinTheo = new Map<string, Row[]>();
  if (rows.length) {
    const { data: tins, error: e2 } = await db.from('tin_viec_space').select('viec_id, tu, loai, noi_dung, lien_ket, luc, id')
      .in('viec_id', rows.map((r) => r.id)).order('id', { ascending: false }).limit(2000);
    if (e2) throw new Error(`Không đọc được tin: ${e2.message}`);
    for (const t of (tins ?? []) as Row[]) tinTheo.set(String(t.viec_id), [...(tinTheo.get(String(t.viec_id)) ?? []), t]);
  }

  const agent = agentRong();
  const tuan = bayGio - 7 * 86_400_000;
  const viec: DongViec[] = rows.map((r) => {
    const v = tuDong(r, khach.get(String(r.company_id))!.ten);
    dem[v.trang_thai]++;
    const ag = agent.find((x) => x.agent === v.agent);
    if (ag) {
      if (v.trang_thai === 'dang_lam' || v.trang_thai === 'cho') ag.dang_lam++;
      if (v.trang_thai === 'can_ban') ag.can_ban++;
      if (v.trang_thai === 'cho_agent') ag.cho_agent++;
      if (v.trang_thai === 'xong' && Date.parse(r.cap_nhat_luc) >= tuan) ag.xong_7_ngay++;
      if (!ag.gan_nhat || String(r.cap_nhat_luc) > ag.gan_nhat) ag.gan_nhat = String(r.cap_nhat_luc);
    }
    const tins = tinTheo.get(v.id) ?? [];
    const cuoi = tins[0];
    const hoi = v.trang_thai === 'can_ban' ? tins.find((t) => t.loai === 'hoi') : undefined;
    return {
      id: v.id, company_id: v.company_id, ten_khach: v.ten_khach, agent: v.agent, tieu_de: v.tieu_de, han: v.han,
      trang_thai: v.trang_thai, buoc_xong: v.ke_hoach.filter((b) => b.xong).length, buoc_tong: v.ke_hoach.length,
      buoc_hien_tai: v.ke_hoach.find((b) => !b.xong)?.ten ?? null, viec_cha_id: v.viec_cha_id,
      tin_cuoi: cuoi ? { tu: String(cuoi.tu), noi_dung: String(cuoi.noi_dung), luc: String(cuoi.luc) } : null,
      hoi: hoi ? { noi_dung: String(hoi.noi_dung), lien_ket: hoi.lien_ket ?? null } : null,
      cap_nhat_luc: String(r.cap_nhat_luc),
    };
  });
  return { viec, khach: dsKhach, agent, dem };
}

export async function docTinViec(db: Db, userId: string, id: string): Promise<{ viec: Viec; tin: Row[] }> {
  const khach = await khachCuaToi(db, userId);
  const v = await docViec(db, id, khach);
  const { data, error } = await db.from('tin_viec_space').select('id, tu, den, loai, noi_dung, lien_ket, luc')
    .eq('viec_id', v.id).order('id', { ascending: true }).limit(500);
  if (error) throw new Error(`Không đọc được tin: ${error.message}`);
  return { viec: v, tin: data ?? [] };
}
