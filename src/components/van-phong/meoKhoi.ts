/**
 * MÈO KHỐI của Văn phòng kế toán (20/11/2026) — nhân vật voxel của MIMI: thân khối, tay khối, bốn chân, hai tai mèo vuông.
 * Mỗi agent một kiểu mắt + một món đồ nghề; biểu cảm đổi theo việc thật:
 *
 *   vui   — kế toán vừa duyệt việc của nó: nhảy một vòng, mắt "^ ^"
 *   ngu   — HẾT XU (năng lượng AI của tháng = 0) và đã về góc nghỉ: mũ ngủ, mắt nhắm, chữ z bay lên.
 *           Rảnh việc KHÔNG phải ngủ: mèo về góc nghỉ đứng chờ, mắt mở. Ngủ là sự thật về tiền, không phải trang trí.
 *   gap   — đứng ở bàn khách đang đỏ: mắt "> <" (Mèo Dòng tiền đeo kính thì giữ kính)
 *   thuong — mắt riêng, thỉnh thoảng chớp; đồ nghề + hạt bay (nốt nhạc, lấp lánh, khói cà phê)
 *
 * three.js thuần (không React) để dựng một lần và cập nhật mỗi khung hình từ `useFrame`.
 */
import {
  BoxGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, Sprite, SpriteMaterial,
  Vector3, type Material, type Object3D,
} from 'three';
import type { TenAgentVP } from '@/lib/goiVanPhong';

export type KieuMat = 'khe' | 'kinh' | 'nghi' | 'cuoi';
export type DoNghe = 'tai_nghe' | 'phu_thuy' | 'ca_phe' | 'dau_bep' | null;

/** Kiểu mắt và đồ nghề của từng agent — gắn với việc của nó. */
export const NHAN_DANG: Record<TenAgentVP, { mat: KieuMat; do_nghe: DoNghe }> = {
  phan_loai: { mat: 'khe', do_nghe: 'tai_nghe' },  // nghe tiền vào, xếp doanh thu hay không
  thue: { mat: 'cuoi', do_nghe: 'phu_thuy' },      // tờ khai soạn sẵn như có phép
  du_bao: { mat: 'kinh', do_nghe: null },          // bình tĩnh canh dòng tiền
  ban_hang: { mat: 'khe', do_nghe: 'dau_bep' },   // bán tại quầy — nhiều khách là quán ăn
  tai_lieu: { mat: 'nghi', do_nghe: 'ca_phe' },    // soi hồ sơ bên cà phê và laptop
};

export type TrangThaiMeo = 'vui' | 'ngu' | 'gap' | 'thuong';

/** Ưu tiên: vui > ngủ (hết xu) > gấp > thường. Hàm thuần — có test. */
export function chonTrangThai(o: { dangVui: boolean; coViec: boolean; daToiNoi: boolean; banDo: boolean; hetXu: boolean }): TrangThaiMeo {
  if (o.dangVui) return 'vui';
  if (o.hetXu) return o.daToiNoi ? 'ngu' : 'thuong';
  if (o.coViec && o.banDo) return 'gap';
  return 'thuong';
}

const DEN_MAT = 0x1a1410;

function khoi(cha: Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: Material, rz = 0, rx = 0) {
  const b = new Mesh(new BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.rotation.z = rz; b.rotation.x = rx; b.castShadow = true;
  cha.add(b);
  return b;
}

function mat(kieu: KieuMat | 'bao' | 'ngu_nham' | 'cuoi'): Group {
  const f = new Group();
  f.position.z = 0.32;
  const den = new MeshBasicMaterial({ color: DEN_MAT });
  const trang = new MeshBasicMaterial({ color: 0xffffff });
  const vach = (w: number, h: number, x: number, y: number, rz = 0, m: Material = den, z = 0) => khoi(f, w, h, 0.03, x, y, z, m, rz);
  if (kieu === 'khe') { vach(0.09, 0.2, -0.22, 0.78); vach(0.09, 0.2, 0.22, 0.78); }
  if (kieu === 'nghi') { vach(0.24, 0.06, -0.22, 0.84); vach(0.06, 0.1, -0.13, 0.78); vach(0.24, 0.06, 0.22, 0.84); vach(0.06, 0.1, 0.31, 0.78); }
  if (kieu === 'cuoi') for (const x of [-0.22, 0.22]) { vach(0.15, 0.05, x - 0.05, 0.8, 0.7); vach(0.15, 0.05, x + 0.05, 0.8, -0.7); }
  if (kieu === 'ngu_nham') { vach(0.18, 0.045, -0.22, 0.76); vach(0.18, 0.045, 0.22, 0.76); }
  if (kieu === 'bao') {
    for (const [x, d] of [[-0.22, 1], [0.22, -1]] as const) {
      vach(0.15, 0.05, x - 0.02 * d, 0.82, -0.6 * d);
      vach(0.15, 0.05, x - 0.02 * d, 0.74, 0.6 * d);
    }
  }
  if (kieu === 'kinh') {
    vach(0.98, 0.07, 0, 0.88);
    vach(0.36, 0.16, -0.24, 0.79); vach(0.36, 0.16, 0.24, 0.79);
    for (const x of [-0.24, 0.24]) for (const [dx, dy] of [[-0.08, 0.03], [-0.03, -0.02], [0.02, 0.03], [0.07, -0.02]]) vach(0.04, 0.04, x + dx, 0.79 + dy, 0, trang, 0.02);
  }
  return f;
}

function chuSprite(ch: string, mau: string): Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  if (x) {
    x.fillStyle = mau; x.font = 'bold 52px ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, 32, 34);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(0.42, 0.42, 1);
  return s;
}

interface Hat { o: Mesh | Sprite; goc: Vector3; huong: number }

function hat(cha: Object3D, loai: 'not' | 'z' | 'lap_lanh' | 'khoi', n: number, goc: Vector3, huong: number): Hat[] {
  const ds: Hat[] = [];
  for (let i = 0; i < n; i++) {
    let o: Mesh | Sprite;
    if (loai === 'not') o = chuSprite(i % 2 ? '♫' : '♪', '#e7b84a');
    else if (loai === 'z') o = chuSprite('z', '#8b9bd6');
    else {
      const s = loai === 'lap_lanh' ? 0.07 : 0.09;
      o = new Mesh(new BoxGeometry(s, s, s), new MeshBasicMaterial({ color: loai === 'lap_lanh' ? 0xf5c842 : 0xf3e7d3, transparent: true }));
    }
    o.visible = false;
    cha.add(o);
    ds.push({ o, goc, huong });
  }
  return ds;
}

const M = (c: number) => new MeshStandardMaterial({ color: c, roughness: 0.8 });

function doNghe(g: Group, loai: DoNghe): { lam: Group; hatLam: Hat[] } {
  const lam = new Group();
  let hatLam: Hat[] = [];
  if (loai === 'tai_nghe') {
    const n = M(0x24407a), s = M(0x4a74c4);
    for (const x of [-0.6, 0.6]) {
      khoi(lam, 0.14, 0.34, 0.34, x, 0.84, 0, n);
      khoi(lam, 0.05, 0.2, 0.2, x * 1.16, 0.84, 0, s);
      khoi(lam, 0.08, 0.36, 0.12, x, 1.14, 0, n);
    }
    khoi(lam, 1.28, 0.08, 0.12, 0, 1.34, 0, n);
    hatLam = hat(g, 'not', 3, new Vector3(0.35, 1.45, 0), 1);
  }
  if (loai === 'phu_thuy') {
    const xanh = M(0x1f3f86), kem = M(0xf1d9a8), nau = M(0x5a3a28), vang = new MeshBasicMaterial({ color: 0xf5c842 });
    khoi(lam, 1.0, 0.06, 0.8, 0, 1.12, 0, xanh);
    khoi(lam, 0.64, 0.1, 0.52, 0, 1.2, 0, kem);
    khoi(lam, 0.56, 0.24, 0.46, 0, 1.36, 0, xanh);
    khoi(lam, 0.4, 0.22, 0.34, 0.05, 1.58, 0, xanh);
    khoi(lam, 0.24, 0.2, 0.22, 0.13, 1.77, 0, xanh);
    khoi(lam, 0.14, 0.14, 0.14, 0.24, 1.9, 0, xanh);
    khoi(lam, 0.05, 0.55, 0.05, 0.86, 0.9, 0.1, nau, -0.45);
    khoi(lam, 0.12, 0.12, 0.12, 0.98, 1.16, 0.1, vang);
    hatLam = hat(g, 'lap_lanh', 4, new Vector3(1.0, 1.2, 0.1), 1);
  }
  if (loai === 'ca_phe') {
    const kem = M(0xf3e7d3), den = M(0x3b2416), may = M(0x1e1e22), sang = new MeshBasicMaterial({ color: 0xdfe6f2 });
    khoi(lam, 0.22, 0.24, 0.22, -0.82, 0.76, 0.12, kem);
    khoi(lam, 0.17, 0.02, 0.17, -0.82, 0.89, 0.12, den);
    khoi(lam, 0.64, 0.04, 0.42, 0, 0.36, 0.66, may);
    khoi(lam, 0.64, 0.32, 0.03, 0, 0.5, 0.46, may, 0, -0.18);
    khoi(lam, 0.06, 0.06, 0.01, 0.06, 0.54, 0.48, sang);
    hatLam = hat(g, 'khoi', 3, new Vector3(-0.82, 0.95, 0.12), -1);
  }
  if (loai === 'dau_bep') {
    const trang = M(0xf4f1ea), xam = M(0xdcd5ca), chao = M(0x1f1f22), can = M(0x3a3a3e);
    khoi(lam, 0.86, 0.16, 0.6, 0, 1.14, 0, xam);
    khoi(lam, 0.8, 0.26, 0.56, 0, 1.34, 0, trang);
    for (const [x, z] of [[-0.24, 0], [0.04, 0.06], [0.28, -0.02]]) khoi(lam, 0.34, 0.24, 0.34, x, 1.56, z, trang);
    khoi(lam, 0.3, 0.05, 0.06, 0.92, 0.66, 0.05, can);
    khoi(lam, 0.5, 0.12, 0.42, 1.3, 0.7, 0.05, chao);
    hatLam = hat(g, 'lap_lanh', 5, new Vector3(1.3, 0.85, 0.05), 1);
  }
  g.add(lam);
  return { lam, hatLam };
}

export interface MeoKhoi extends Group {
  userData: {
    mat: Record<TrangThaiMeo, Group>;
    lam: Group; ngu: Group; hatLam: Hat[]; hatNgu: Hat[]; chan: Mesh[];
    nhanDang: { mat: KieuMat; do_nghe: DoNghe };
    chopLuc: number; chopDen: number;
    /** Tỉ lệ gốc của mèo trong cảnh: mọi độ cao nhảy / nhún nhân với số này. */
    tiLe: number;
  };
}

/** Dựng một mèo khối. `mau` là màu của agent. Kích thước gốc ~1,1 đơn vị — cảnh tự co lại. */
export function taoMeo(ten: TenAgentVP, mau: string, tiLe = 1): MeoKhoi {
  const g = new Group() as MeoKhoi;
  const nd = NHAN_DANG[ten];
  const than = new MeshStandardMaterial({ color: mau, roughness: 0.85, metalness: 0 });
  khoi(g, 1.1, 0.72, 0.62, 0, 0.7, 0, than);
  khoi(g, 0.22, 0.22, 0.4, -0.66, 0.66, 0, than);
  khoi(g, 0.22, 0.22, 0.4, 0.66, 0.66, 0, than);
  const chan = [-0.4, -0.15, 0.15, 0.4].map((x) => khoi(g, 0.14, 0.34, 0.3, x, 0.17, 0, than));
  khoi(g, 0.2, 0.2, 0.2, -0.36, 1.16, 0.08, than);
  khoi(g, 0.2, 0.2, 0.2, 0.36, 1.16, 0.08, than);

  const mats: Record<TrangThaiMeo, Group> = {
    thuong: mat(nd.mat),
    gap: mat(nd.mat === 'kinh' ? 'kinh' : 'bao'),
    vui: mat(nd.mat === 'kinh' ? 'kinh' : 'cuoi'),
    ngu: mat('ngu_nham'),
  };
  for (const m of Object.values(mats)) { m.visible = false; g.add(m); }
  mats.thuong.visible = true;

  const { lam, hatLam } = doNghe(g, nd.do_nghe);
  const ngu = new Group();
  const tim = M(0x8b9bd6), trang = M(0xf7f4ee);
  khoi(ngu, 0.96, 0.14, 0.68, 0, 1.12, 0, trang);
  khoi(ngu, 0.8, 0.2, 0.6, 0.05, 1.28, 0, tim);
  khoi(ngu, 0.55, 0.18, 0.44, 0.22, 1.44, 0, tim);
  khoi(ngu, 0.32, 0.16, 0.3, 0.45, 1.54, 0, tim);
  khoi(ngu, 0.2, 0.14, 0.2, 0.65, 1.56, 0, tim);
  khoi(ngu, 0.18, 0.18, 0.18, 0.8, 1.46, 0, trang);
  ngu.visible = false;
  g.add(ngu);

  g.userData = {
    mat: mats, lam, ngu, hatLam, hatNgu: hat(g, 'z', 3, new Vector3(-0.45, 1.45, 0), -1), chan,
    nhanDang: nd, chopLuc: 2 + Math.random() * 3, chopDen: 0, tiLe,
  };
  g.scale.setScalar(tiLe);
  return g;
}

/**
 * Kế toán ngồi bàn chính: mèo khối màu cam MIMI, hai tay đặt trên laptop, gõ so le. Đây là NGƯỜI trong văn phòng —
 * các agent làm, người này duyệt.
 */
export function taoKeToan(mau = '#e07b24', tiLe = 1): Group {
  const g = new Group();
  const than = new MeshStandardMaterial({ color: mau, roughness: 0.85 });
  khoi(g, 1.1, 0.8, 0.62, 0, 0.74, 0, than);
  khoi(g, 0.2, 0.2, 0.2, -0.36, 1.24, 0.08, than);
  khoi(g, 0.2, 0.2, 0.2, 0.36, 1.24, 0.08, than);
  khoi(g, 0.22, 0.22, 0.3, -0.66, 0.8, 0, than);
  khoi(g, 0.22, 0.22, 0.3, 0.66, 0.8, 0, than);
  const den = new MeshBasicMaterial({ color: DEN_MAT });
  khoi(g, 0.09, 0.22, 0.03, -0.22, 0.86, 0.32, den);
  khoi(g, 0.09, 0.22, 0.03, 0.22, 0.86, 0.32, den);
  // Hai tay vươn tới bàn phím.
  const tayT = khoi(g, 0.2, 0.16, 0.5, -0.28, 0.5, 0.5, than);
  const tayP = khoi(g, 0.2, 0.16, 0.5, 0.28, 0.5, 0.5, than);
  // Ghế dưới thân, bàn nhỏ dưới laptop.
  const go = new MeshStandardMaterial({ color: 0xc9a27e, roughness: 0.8 });
  khoi(g, 0.7, 0.34, 0.5, 0, 0.17, 0, go);
  khoi(g, 1.4, 0.32, 0.8, 0, 0.16, 0.86, go);
  // Laptop: đế + màn hình dựng, logo pixel.
  const may = new MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.5 });
  khoi(g, 0.9, 0.05, 0.55, 0, 0.36, 0.78, may);
  khoi(g, 0.9, 0.58, 0.05, 0, 0.66, 1.05, may, 0, 0.18);
  const sang = new MeshBasicMaterial({ color: 0xdfe6f2 });
  for (const [x, y] of [[-0.06, 0.7], [0, 0.66], [0.06, 0.62], [0.08, 0.7]]) khoi(g, 0.05, 0.05, 0.01, x, y, 1.02, sang);
  g.userData = { tay: [tayT, tayP], tiLe };
  g.scale.setScalar(tiLe);
  return g;
}

/** Gõ phím: hai tay nhấp so le. `giam` = giảm chuyển động → tay đứng yên. */
export function capNhatKeToan(g: Group, t: number, giam: boolean) {
  const tay = g.userData.tay as Mesh[];
  tay.forEach((m, i) => { m.position.y = 0.5 + (giam ? 0 : Math.max(0, Math.sin(t * 16 + i * Math.PI)) * 0.06); });
}

function capNhatHat(ds: Hat[], hien: boolean, t: number, tocDo: number, giam: boolean) {
  ds.forEach((h, i) => {
    h.o.visible = hien;
    if (!hien) return;
    const ph = giam ? (i + 1) / (ds.length + 1) : (t * tocDo + i / ds.length) % 1;
    h.o.position.set(h.goc.x + Math.sin(ph * 6 + i) * 0.1 + ph * 0.3 * h.huong, h.goc.y + ph * 0.95, h.goc.z);
    (h.o.material as Material & { opacity: number }).opacity = 1 - ph;
  });
}

const tam = new Vector3();

/**
 * Mỗi khung hình: đi về `dich`, đổi biểu cảm, đồ nghề, hạt bay. `t` = giây đồng hồ cảnh; `vuiDenMs` = Date.now() khi
 * hết mừng. `giam` = người dùng xin giảm chuyển động: không nhảy, không đi bộ — tới thẳng chỗ, hạt đứng yên.
 */
export function capNhatMeo(g: MeoKhoi, o: { dich: Vector3; coViec: boolean; banDo: boolean; hetXu: boolean; vuiDenMs: number; t: number; dt: number; giam: boolean; tocDo?: number }) {
  const u = g.userData;
  const s0 = u.tiLe;
  const dangVui = Date.now() < o.vuiDenMs;
  tam.copy(o.dich).sub(g.position); tam.y = 0;
  const xa = tam.length();
  const daToiNoi = xa < 0.1;
  const tt = chonTrangThai({ dangVui, coViec: o.coViec && !o.hetXu, daToiNoi, banDo: o.banDo, hetXu: o.hetXu });

  for (const k of Object.keys(u.mat) as TrangThaiMeo[]) u.mat[k].visible = k === tt;
  u.lam.visible = tt !== 'ngu';
  u.ngu.visible = tt === 'ngu';
  capNhatHat(u.hatLam, tt !== 'ngu' && o.coViec && !o.hetXu, o.t, 0.55, o.giam);
  capNhatHat(u.hatNgu, tt === 'ngu', o.t, 0.3, o.giam);

  if (!o.giam && tt === 'thuong' && u.nhanDang.mat !== 'kinh') {
    if (o.t > u.chopLuc) { u.chopLuc = o.t + 2.5 + Math.random() * 3.5; u.chopDen = o.t + 0.14; }
    u.mat.thuong.scale.y = o.t < u.chopDen ? 0.12 : 1;
  }

  if (o.giam) {
    if (!dangVui) g.position.set(o.dich.x, 0, o.dich.z);
    return;
  }
  if (dangVui) {
    g.position.y = Math.abs(Math.sin(((o.vuiDenMs - Date.now()) / 1000) * Math.PI * 1.5)) * 0.7 * s0;
    g.rotation.y += o.dt * 5;
    return;
  }
  if (xa > 0.05) {
    const buoc = Math.min(xa, (o.tocDo ?? 3) * Math.min(o.dt, 0.05));
    tam.normalize();
    g.position.addScaledVector(tam, buoc);
    g.rotation.y = Math.atan2(tam.x, tam.z);
    g.position.y = Math.abs(Math.sin(o.t * 12)) * 0.08 * s0;
    u.chan.forEach((c, n) => { c.position.y = 0.17 + Math.max(0, Math.sin(o.t * 14 + n * Math.PI)) * 0.1; });
  } else {
    g.position.y = tt === 'ngu' ? 0 : Math.sin(o.t * 2) * 0.03 * s0;
    u.chan.forEach((c) => { c.position.y = 0.17; });
    g.scale.set(s0, s0 * (tt === 'ngu' ? 1 + Math.sin(o.t * 1.6) * 0.03 : 1), s0);
  }
}

/** Giải phóng hình học, vật liệu, texture khi gỡ mèo khỏi cảnh. */
export function huyMeo(g: Group) {
  g.traverse((o) => {
    const m = o as Mesh | Sprite;
    if ('geometry' in m && m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const x of mats) { (x as SpriteMaterial).map?.dispose(); x.dispose(); }
  });
}
