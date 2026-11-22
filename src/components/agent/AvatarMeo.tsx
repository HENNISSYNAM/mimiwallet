/**
 * Hình đại diện agent (22/11/2026): mèo khối pixel NGUYÊN BẢN của MIMI — cùng họ với mèo khối 3D ở Văn phòng.
 * Không dùng mascot của hãng khác. 12 con, mỗi con một nghề, một màu, một phụ kiện để nhận ra ngay.
 * Biểu cảm theo TRẠNG THÁI THẬT: ngu = rảnh · lam = đang làm · hoi = chờ bạn quyết (dấu "!") · vui = vừa xong việc.
 */

export type NetMat = 'ngu' | 'lam' | 'hoi' | 'vui';
export type PhuKien = 'kinh' | 'mu' | 'tai_nghe' | 'no' | 'khan' | null;

// Lưới 16×13. D viền · B lông · P hồng (tai, má) · W mõm · E mắt · M miệng · H phụ kiện · .
const DAU = [
  '..DD........DD..',
  '.DBBD......DBBD.',
  '.DBPBD....DBPBD.',
  '.DBBBBDDDDBBBBD.',
  'DBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBD', // 6: mắt
  'DBBBBBBBBBBBBBBD', // 7: mắt
  'DBPBBBWWWWBBBPBD',
  'DBBBBWWMMWWBBBBD', // 9: miệng
  'DBBBBBWWWWBBBBBD',
  '.DBBBBBBBBBBBBD.',
  '..DDDDDDDDDDDD..',
];

const datO = (dong: string, cot: number[], k: string) => dong.split('').map((c, i) => (cot.includes(i) ? k : c)).join('');

/** Lưới điểm ảnh của một nét mặt + phụ kiện. Thuần, để test. */
export function luoiMeo(net: NetMat, phuKien: PhuKien | boolean = null): string[] {
  const pk: PhuKien = phuKien === true ? 'kinh' : phuKien === false ? null : phuKien;
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
  if (pk === 'kinh' && net !== 'ngu') {
    g[5] = datO(g[5], [2, 3, 4, 5, 10, 11, 12, 13], 'D');
    g[6] = datO(g[6], [2, 5, 6, 7, 8, 9, 10, 13], 'D');
  }
  if (pk === 'mu') { g[1] = datO(g[1], [5, 6, 7, 8, 9, 10], 'H'); g[2] = datO(g[2], [5, 6, 7, 8, 9, 10], 'H'); g[3] = datO(g[3], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'H'); }
  if (pk === 'tai_nghe') { g[3] = datO(g[3], [5, 6, 7, 8, 9, 10], 'H'); for (const y of [6, 7, 8]) g[y] = datO(g[y], [0, 15], 'H'); }
  if (pk === 'no') g[11] = datO(g[11], [5, 6, 9, 10], 'H');
  if (pk === 'khan') g[11] = datO(g[11], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 'H');
  return g;
}

const MAU_CO_DINH: Record<string, string> = { D: '#1f2937', P: '#f9a8d4', W: '#fff7ed', E: '#111827', M: '#7f1d1d' };

/** Màu + phụ kiện của 12 mèo (cùng khoá với `MEO` ở máy chủ). Hai mèo cũ giữ màu như Văn phòng. */
export const HINH_MEO: Record<string, { mau: string; phu_kien: PhuKien; mau_pk: string }> = {
  phan_loai: { mau: '#f59e0b', phu_kien: null, mau_pk: '#111827' },
  thue: { mau: '#6366f1', phu_kien: 'kinh', mau_pk: '#111827' },
  dong_tien: { mau: '#0ea5e9', phu_kien: 'no', mau_pk: '#facc15' },
  ho_so: { mau: '#ec4899', phu_kien: 'kinh', mau_pk: '#111827' },
  bao_ve: { mau: '#64748b', phu_kien: 'mu', mau_pk: '#1e3a8a' },
  doi_soat: { mau: '#14b8a6', phu_kien: 'tai_nghe', mau_pk: '#111827' },
  cong_no: { mau: '#ef4444', phu_kien: 'khan', mau_pk: '#fde68a' },
  mua_hang: { mau: '#84cc16', phu_kien: 'mu', mau_pk: '#78350f' },
  luong: { mau: '#a855f7', phu_kien: 'no', mau_pk: '#f472b6' },
  tuan_thu: { mau: '#0f766e', phu_kien: 'kinh', mau_pk: '#111827' },
  bao_cao: { mau: '#f97316', phu_kien: 'tai_nghe', mau_pk: '#1f2937' },
  thu_ky: { mau: '#d946ef', phu_kien: 'khan', mau_pk: '#ffffff' },
};
/** Tương thích: hai agent cũ của Space. */
export const HINH_AGENT: Record<string, { mau: string; kinh: boolean }> = {
  phan_loai: { mau: HINH_MEO.phan_loai.mau, kinh: false },
  thue: { mau: HINH_MEO.thue.mau, kinh: true },
};

const NHAN: Record<NetMat, string> = { ngu: 'đang rảnh', lam: 'đang làm', hoi: 'đang chờ bạn', vui: 'vừa xong việc' };

export function AvatarMeo({ mau, net = 'lam', kinh = false, phuKien, mauPk = '#111827', co = 40, ten }: {
  mau: string; net?: NetMat; kinh?: boolean; phuKien?: PhuKien; mauPk?: string; co?: number; ten: string;
}) {
  const g = luoiMeo(net, phuKien === undefined ? kinh : phuKien);
  const o: JSX.Element[] = [];
  g.forEach((dong, y) => dong.split('').forEach((c, x) => {
    if (c === '.') return;
    o.push(<rect key={`${x}-${y}`} x={x} y={y + 2} width={1.02} height={1.02} fill={c === 'B' ? mau : c === 'H' ? mauPk : MAU_CO_DINH[c]} />);
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

/** Mèo theo khoá. */
export function Meo({ khoa, net = 'lam', co = 28, ten }: { khoa: string; net?: NetMat; co?: number; ten: string }) {
  const h = HINH_MEO[khoa] ?? HINH_MEO.phan_loai;
  return <AvatarMeo mau={h.mau} phuKien={h.phu_kien} mauPk={h.mau_pk} net={net} co={co} ten={ten} />;
}

/** Nét mặt từ số việc thật của agent. */
export function netTuTrangThai(a: { can_ban: number; dang_lam: number; cho_agent: number; xong_7_ngay: number }): NetMat {
  if (a.can_ban > 0) return 'hoi';
  if (a.dang_lam + a.cho_agent > 0) return 'lam';
  return 'ngu';
}
