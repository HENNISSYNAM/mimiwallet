/**
 * Chạy workflow (22/11/2026) — thuần, trừ `thucThi` được truyền vào (công cụ thật của agent).
 *
 * Mỗi lượt đi tiếp mọi bước đã đủ điều kiện (mọi bước trước đã xong):
 *   kich_hoat → xong · agent + công cụ có thật → chạy thật, ghi kết quả → xong
 *   agent + công cụ chưa kết nối → `chan` (người có thể "làm tay" để đi tiếp — không giả vờ agent đã làm)
 *   người / người duyệt → `can_nguoi` (chờ người bấm Xong / Duyệt / Từ chối)
 * Từ chối ở bước duyệt → cả lượt chạy dừng. Mọi mốc giờ được ghi để đo hiệu suất THẬT.
 */
import { thuTu, type DoThiHien, type NutHien } from './do-thi.ts';

export type TrangThaiNut = 'cho' | 'can_nguoi' | 'chan' | 'xong' | 'tu_choi';
export interface BuocChay { tt: TrangThaiNut; bat_dau?: string; ket_thuc?: string; ket_qua?: string; ai_lam?: 'agent' | 'nguoi' }
export type TrangThaiChay = 'dang' | 'can_ban' | 'chan' | 'xong' | 'dung';
export interface LanChay { buoc: Record<string, BuocChay>; bat_dau: string; ket_thuc?: string }

export type ThucThi = (n: NutHien) => Promise<string>;

export function lanChayMoi(d: DoThiHien, bayGio: string): LanChay {
  return { bat_dau: bayGio, buoc: Object.fromEntries(d.nut.map((n) => [n.id, { tt: 'cho' as TrangThaiNut }])) };
}

const truoc = (d: DoThiHien, id: string) => d.canh.filter((c) => c.den === id).map((c) => c.tu);

/** Đi tiếp tới khi không còn bước nào chạy được. Trả lượt chạy mới (không sửa đầu vào). */
export async function diTiep(d: DoThiHien, l0: LanChay, thucThi: ThucThi, gio: () => string = () => new Date().toISOString()): Promise<LanChay> {
  const l: LanChay = { ...l0, buoc: Object.fromEntries(Object.entries(l0.buoc).map(([k, v]) => [k, { ...v }])) };
  if (trangThai(d, l) === 'dung') return l;
  const thu = thuTu(d);
  for (let vong = 0; vong < d.nut.length + 1; vong++) {
    let doi = false;
    for (const id of thu) {
      const b = l.buoc[id] ?? (l.buoc[id] = { tt: 'cho' });
      if (b.tt !== 'cho') continue;
      if (!truoc(d, id).every((t) => l.buoc[t]?.tt === 'xong')) continue;
      const n = d.nut.find((x) => x.id === id)!;
      b.bat_dau = gio();
      doi = true;
      if (n.loai === 'kich_hoat') { b.tt = 'xong'; b.ket_thuc = b.bat_dau; continue; }
      if (n.lam === 'nguoi') { b.tt = 'can_nguoi'; continue; }
      if (n.nhan === 'can_ket_noi') { b.tt = 'chan'; b.ket_qua = `Cần kết nối "${n.cong_cu}" — hoặc người làm tay bước này.`; continue; }
      try {
        b.ket_qua = (await thucThi(n)).slice(0, 600);
        b.tt = 'xong'; b.ai_lam = 'agent'; b.ket_thuc = gio();
      } catch (e) {
        b.tt = 'chan'; b.ket_qua = `Agent chưa làm được: ${e instanceof Error ? e.message.slice(0, 200) : 'lỗi không rõ'} — người có thể làm tay.`;
      }
    }
    if (!doi) break;
  }
  if (trangThai(d, l) === 'xong') l.ket_thuc = gio();
  return l;
}

/** Người xử lý một bước: xong (bước người hoặc làm tay bước bị chặn), duyệt, hoặc từ chối. */
export function nguoiXuLy(d: DoThiHien, l0: LanChay, id: string, quyet: 'xong' | 'duyet' | 'tu_choi', ghiChu: string | null, gio: string): LanChay {
  const n = d.nut.find((x) => x.id === id);
  const b0 = l0.buoc[id];
  if (!n || !b0) throw new Error('Không có bước này.');
  if (b0.tt !== 'can_nguoi' && b0.tt !== 'chan') throw new Error('Bước này không chờ người.');
  if (quyet === 'tu_choi' && n.loai !== 'duyet') throw new Error('Chỉ bước duyệt mới từ chối được.');
  if (quyet === 'duyet' && n.loai !== 'duyet') throw new Error('Bước này không phải bước duyệt.');
  const b: BuocChay = { ...b0, tt: quyet === 'tu_choi' ? 'tu_choi' : 'xong', ket_thuc: gio, ai_lam: 'nguoi',
    ket_qua: ghiChu?.trim().slice(0, 300) || (quyet === 'tu_choi' ? 'Người duyệt từ chối.' : b0.tt === 'chan' ? 'Người làm tay.' : 'Người đã làm.') };
  const l: LanChay = { ...l0, buoc: { ...l0.buoc, [id]: b } };
  if (quyet === 'tu_choi') l.ket_thuc = gio;
  return l;
}

export function trangThai(d: DoThiHien, l: LanChay): TrangThaiChay {
  const bs = d.nut.map((n) => l.buoc[n.id]?.tt ?? 'cho');
  if (bs.includes('tu_choi')) return 'dung';
  if (bs.every((t) => t === 'xong')) return 'xong';
  if (bs.includes('can_nguoi')) return 'can_ban';
  if (bs.includes('chan')) return 'chan';
  return 'dang';
}

export interface HieuSuat {
  tong_ms: number | null;
  cho_nguoi_ms: number;
  agent_ms: number;
  buoc_agent: number;
  buoc_nguoi: number;
  lam_tay: number;
}

/** Số đo THẬT từ mốc giờ đã ghi. Chưa xong thì tong_ms = null. */
export function hieuSuat(d: DoThiHien, l: LanChay): HieuSuat {
  const ms = (b: BuocChay) => (b.bat_dau && b.ket_thuc ? Math.max(0, Date.parse(b.ket_thuc) - Date.parse(b.bat_dau)) : 0);
  const h: HieuSuat = { tong_ms: l.ket_thuc ? Math.max(0, Date.parse(l.ket_thuc) - Date.parse(l.bat_dau)) : null, cho_nguoi_ms: 0, agent_ms: 0, buoc_agent: 0, buoc_nguoi: 0, lam_tay: 0 };
  for (const n of d.nut) {
    const b = l.buoc[n.id];
    if (!b || n.loai === 'kich_hoat' || b.tt !== 'xong') continue;
    if (b.ai_lam === 'agent') { h.buoc_agent++; h.agent_ms += ms(b); } else { h.buoc_nguoi++; h.cho_nguoi_ms += ms(b); if (n.lam === 'agent') h.lam_tay++; }
  }
  return h;
}
