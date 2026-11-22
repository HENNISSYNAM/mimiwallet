/**
 * Hình đại diện agent (22/11/2026): mèo khối pixel NGUYÊN BẢN của MIMI — cùng họ với mèo khối 3D ở Văn phòng.
 * Không dùng mascot của hãng khác. Biểu cảm theo TRẠNG THÁI THẬT của agent, không trang trí:
 *   ngu = rảnh (không việc) · lam = đang làm · hoi = đang chờ bạn quyết (có dấu "!") · vui = vừa xong việc.
 */

export type NetMat = 'ngu' | 'lam' | 'hoi' | 'vui';

// Lưới 16×13. D viền · B lông · P hồng (tai, má) · W mõm · E mắt · M miệng · .
const DAU = [
  '..DD........DD..',
  '.DBBD......DBBD.',
  '.DBPBD....DBPBD.',
  '.DBBBBDDDDBBBBD.',
  'DBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBD', // 6: mắt (thay theo nét mặt)
  'DBBBBBBBBBBBBBBD', // 7: mắt
  'DBPBBBWWWWBBBPBD',
  'DBBBBWWMMWWBBBBD', // 9: miệng
  'DBBBBBWWWWBBBBBD',
  '.DBBBBBBBBBBBBD.',
  '..DDDDDDDDDDDD..',
];

const datO = (dong: string, cot: number[], k: string) => dong.split('').map((c, i) => (cot.includes(i) ? k : c)).join('');

/** Lưới điểm ảnh của một nét mặt. Thuần, để test. */
export function luoiMeo(net: NetMat, kinh = false): string[] {
  const g = [...DAU];
  if (net === 'ngu') {
    g[7] = datO(g[7], [2, 3, 4, 11, 12, 13], 'E');
  } else if (net === 'vui') {
    g[6] = datO(g[6], [3, 12], 'E');
    g[7] = datO(g[7], [2, 4, 11, 13], 'E');
  } else {
    g[6] = datO(g[6], [3, 4, 11, 12], 'E');
    g[7] = datO(g[7], [3, 4, 11, 12], 'E');
  }
  if (net === 'hoi') g[9] = datO(g[9], [6, 9], 'M');
  // Kính: gọng quanh mắt + cầu kính (chỉ khi mắt mở).
  if (kinh && net !== 'ngu') {
    g[5] = datO(g[5], [2, 3, 4, 5, 10, 11, 12, 13], 'D');
    g[6] = datO(g[6], [2, 5, 6, 7, 8, 9, 10, 13], 'D');
  }
  return g;
}

const MAU_CO_DINH: Record<string, string> = { D: '#1f2937', P: '#f9a8d4', W: '#fff7ed', E: '#111827', M: '#7f1d1d' };

export function AvatarMeo({ mau, net = 'lam', kinh = false, co = 40, ten }: {
  mau: string; net?: NetMat; kinh?: boolean; co?: number; ten: string;
}) {
  const g = luoiMeo(net, kinh);
  const o: JSX.Element[] = [];
  g.forEach((dong, y) => dong.split('').forEach((c, x) => {
    if (c === '.') return;
    o.push(<rect key={`${x}-${y}`} x={x} y={y + 2} width={1.02} height={1.02} fill={c === 'B' ? mau : MAU_CO_DINH[c]} />);
  }));
  return (
    <span className="relative inline-block shrink-0" style={{ width: co, height: co }} data-net={net}>
      <svg viewBox="0 0 16 16" width={co} height={co} shapeRendering="crispEdges" role="img" aria-label={`${ten} — ${NHAN[net]}`}>
        <title>{`${ten} — ${NHAN[net]}`}</title>
        {o}
      </svg>
      {net === 'hoi' && (
        <span aria-hidden className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold leading-none text-white ring-2 ring-background">!</span>
      )}
      {net === 'ngu' && <span aria-hidden className="absolute -right-1 -top-1 text-[10px] font-bold text-muted-foreground">z</span>}
    </span>
  );
}

const NHAN: Record<NetMat, string> = { ngu: 'đang rảnh', lam: 'đang làm', hoi: 'đang chờ bạn', vui: 'vừa xong việc' };

/** Màu + phụ kiện cố định của từng agent (cùng màu với Văn phòng). */
export const HINH_AGENT: Record<string, { mau: string; kinh: boolean }> = {
  phan_loai: { mau: '#f59e0b', kinh: false },
  thue: { mau: '#6366f1', kinh: true },
};

/** Nét mặt từ số việc thật của agent. */
export function netTuTrangThai(a: { can_ban: number; dang_lam: number; cho_agent: number; xong_7_ngay: number }): NetMat {
  if (a.can_ban > 0) return 'hoi';
  if (a.dang_lam + a.cho_agent > 0) return 'lam';
  return 'ngu';
}
