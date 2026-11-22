/**
 * WORKFLOW TỰ ĐIỀU CHỈNH (22/11/2026) — thuần. Đọc lần chạy gần nhất và lịch sử chạy THẬT, đề xuất chỉnh cụ thể, mỗi
 * đề xuất kèm thao tác áp được bằng một cú bấm. Không có số đo thì không đề xuất theo số đo (không đoán).
 */
import type { DoThiHien, PhuongAn } from './do-thi.ts';
import type { HieuSuat, LanChay } from './chay.ts';
import type { ThaoTac } from './sua-tay.ts';

export type HanhDongGoiY = ThaoTac | { thao_tac: 'doi_phuong_an'; phuong_an: PhuongAn } | { thao_tac: 'ket_noi'; nut_id: string };
export interface GoiY { khoa: string; cau: string; hanh_dong: HanhDongGoiY }

const TEN_PA: Record<PhuongAn, string> = { nguoi: 'Người làm', nguoi_ai: 'Người + AI', ai: 'AI tối đa' };

export function goiYDieuChinh(
  d: DoThiHien, pa: PhuongAn, l: LanChay | null,
  lichSu: { phuong_an: PhuongAn; trang_thai: string; hieu_suat: HieuSuat }[],
): GoiY[] {
  const ra: GoiY[] = [];
  // 1. Bước agent bị chặn / phải làm tay → kết nối công cụ, hoặc giao hẳn cho người.
  for (const n of d.nut) {
    if (n.lam !== 'agent' || n.loai === 'kich_hoat') continue;
    const b = l?.buoc[n.id];
    const tay = b?.tt === 'xong' && b.ai_lam === 'nguoi';
    if (b?.tt === 'chan' || tay || (!l && n.nhan === 'can_ket_noi')) {
      if (n.nhan === 'can_ket_noi') ra.push({ khoa: `kn:${n.id}`, cau: `"${n.ten}" cần ${n.cong_cu} — dán API key / MCP ngay tại bước để mèo tự làm.`, hanh_dong: { thao_tac: 'ket_noi', nut_id: n.id } });
      ra.push({ khoa: `ng:${n.id}`, cau: `${tay ? `"${n.ten}" vừa phải làm tay` : `"${n.ten}" đang bị chặn`} — giao hẳn bước này cho người để luồng không dừng.`, hanh_dong: { thao_tac: 'doi_nguoi_lam', nut_id: n.id, lam: 'nguoi' } });
    }
  }
  // 2. Đang để người làm hết dù nhiều bước mèo làm được → thử Người + AI.
  if (pa === 'nguoi' && d.nut.filter((n) => n.ai_duoc).length >= 2) {
    ra.push({ khoa: 'pa:nguoi_ai', cau: `Có ${d.nut.filter((n) => n.ai_duoc).length} bước mèo agent làm được — thử phương án Người + AI rồi so số đo.`, hanh_dong: { thao_tac: 'doi_phuong_an', phuong_an: 'nguoi_ai' } });
  }
  // 3. So số đo thật: phương án khác nhanh hơn rõ (≥ 20%) trên lần chạy XONG → đề xuất đổi.
  const tb = new Map<PhuongAn, number>();
  for (const p of ['nguoi', 'nguoi_ai', 'ai'] as PhuongAn[]) {
    const xs = lichSu.filter((x) => x.phuong_an === p && x.trang_thai === 'xong' && x.hieu_suat.tong_ms !== null).map((x) => x.hieu_suat.tong_ms!);
    if (xs.length) tb.set(p, xs.reduce((a, b) => a + b, 0) / xs.length);
  }
  const hienTai = tb.get(pa);
  if (hienTai !== undefined) {
    for (const [p, v] of tb) {
      if (p !== pa && v <= hienTai * 0.8) {
        ra.push({ khoa: `ss:${p}`, cau: `Theo các lần chạy thật, ${TEN_PA[p]} nhanh hơn ${Math.round((1 - v / hienTai) * 100)}% so với ${TEN_PA[pa]}.`, hanh_dong: { thao_tac: 'doi_phuong_an', phuong_an: p } });
      }
    }
  }
  // Đề xuất theo số đo thật / phương án đứng trước đề xuất từng bước (nhiều bước cần kết nối không được che mất nó).
  const uuTien = ra.filter((x) => x.hanh_dong.thao_tac === 'doi_phuong_an');
  return [...uuTien, ...ra.filter((x) => x.hanh_dong.thao_tac !== 'doi_phuong_an')].slice(0, 6);
}
