/**
 * Vòng hạt của nền MIMI Assistant — phần toán, không đụng DOM, có test.
 *
 * Hiệu ứng: vài nghìn chấm nhỏ xếp thành một vòng tròn loang ra hai phía, xoay rất chậm,
 * "thở" nhẹ; chuột đi qua thì các chấm gần đó dạt ra rồi trôi về chỗ cũ. Tự viết cho
 * MIMI, không dùng mã hay tài sản của ai.
 */

export interface Hat {
  /** Góc ban đầu, radian. */
  goc: number;
  /** Bán kính tương đối: 1 là đúng mép vòng. */
  banKinh: number;
  /** Đường kính chấm, px CSS. */
  kichThuoc: number;
  doMo: number;
  pha: number;
  /** Radian mỗi mili giây; âm là xoay ngược. */
  tocDo: number;
  /** Độ lệch do chuột đẩy, và vận tốc của độ lệch đó. */
  lx: number;
  ly: number;
  vx: number;
  vy: number;
}

export type NgauNhien = () => number;

/** Phân phối chuẩn (Box–Muller): hạt dày ở mép vòng, thưa dần ra hai phía. */
function chuan(r: NgauNhien): number {
  const u = Math.max(r(), 1e-9);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function taoHat(so: number, r: NgauNhien = Math.random): Hat[] {
  const ds: Hat[] = [];
  for (let i = 0; i < so; i++) {
    // Ba phần tư hạt nằm sát vòng; một phần tư tản xa để vòng có "bụi" quanh.
    const tan = r() < 0.25;
    const lech = chuan(r) * (tan ? 0.3 : 0.085);
    const banKinh = Math.max(0.35, 1 + lech);
    const gan = 1 - Math.min(1, Math.abs(lech) / 0.35);
    ds.push({
      goc: r() * Math.PI * 2,
      banKinh,
      kichThuoc: 0.7 + r() * 1.1,
      doMo: 0.18 + gan * 0.55 + r() * 0.15,
      pha: r() * Math.PI * 2,
      tocDo: (0.000018 + r() * 0.00002) * (r() < 0.12 ? -1 : 1),
      lx: 0, ly: 0, vx: 0, vy: 0,
    });
  }
  return ds;
}

/** Số hạt theo diện tích khung: màn nhỏ ít hạt để máy yếu vẫn mượt. */
export function soHatTheoKhung(rong: number, cao: number): number {
  return Math.round(Math.min(2400, Math.max(600, (rong * cao) / 520)));
}

/** Vị trí gốc (chưa tính chuột đẩy) của hạt ở thời điểm `t` mili giây. */
export function viTriGoc(h: Hat, t: number, cx: number, cy: number, R: number): { x: number; y: number } {
  const goc = h.goc + t * h.tocDo;
  const tho = 1 + 0.014 * Math.sin(t * 0.0005 + h.pha);
  const rr = h.banKinh * R * tho;
  return { x: cx + Math.cos(goc) * rr, y: cy + Math.sin(goc) * rr };
}

export const VUNG_CHUOT = 130;
export const LUC_DAY = 1.6;
export const LO_XO = 0.035;
export const HAM = 0.86;

/**
 * Một bước vật lý cho độ lệch của hạt: lực đẩy khỏi chuột (giảm dần theo bình phương
 * khoảng cách trong vùng ảnh hưởng) cộng lò xo kéo về chỗ cũ, có hãm.
 * Trả mức "gần chuột" 0..1 để hạt sáng lên khi bị chạm.
 */
export function buocVatLy(h: Hat, x: number, y: number, chuot: { x: number; y: number } | null): number {
  let gan = 0;
  if (chuot) {
    const dx = x + h.lx - chuot.x;
    const dy = y + h.ly - chuot.y;
    const kc = Math.hypot(dx, dy);
    if (kc < VUNG_CHUOT && kc > 0.001) {
      gan = 1 - kc / VUNG_CHUOT;
      const luc = gan * gan * LUC_DAY;
      h.vx += (dx / kc) * luc;
      h.vy += (dy / kc) * luc;
    }
  }
  h.vx = (h.vx - h.lx * LO_XO) * HAM;
  h.vy = (h.vy - h.ly * LO_XO) * HAM;
  h.lx += h.vx;
  h.ly += h.vy;
  return gan;
}

/** "211 70% 55%" hoặc "211, 70%, 55%" → [211, 70, 55]. Sai khuôn thì trả màu dự phòng. */
export function docMauHsl(chu: string, duPhong: [number, number, number] = [214, 60, 58]): [number, number, number] {
  const m = chu.trim().match(/^(-?[\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%$/);
  if (!m) return duPhong;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
