import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * CHỐNG SSRF cho trình duyệt cloud. Runtime chạy trong mạng của Vercel: một trang hay một kế hoạch độc có thể bảo
 * trình duyệt mở 169.254.169.254 (metadata), 127.0.0.1 (chính máy chạy), dải nội bộ… Mọi URL — URL mở trang, request
 * phụ của trang, đích chuyển hướng — đều qua `kiemUrl` trước khi được đi.
 *
 * Giới hạn đã biết: Chromium tự phân giải DNS lần nữa sau khi ta kiểm, nên tên miền đổi IP giữa hai lần (DNS rebinding)
 * về lý thuyết lọt được. Bù lại: tên miền phải thuộc danh sách do Orchestrator ký, không phải do trang chọn.
 */

export interface TuyChonKiemUrl {
  /**
   * CHỈ DÙNG TRONG TEST: cho phép địa chỉ loopback và cổng bất kỳ để thử với máy chủ trang mẫu cục bộ. Chỉ truyền được qua
   * tham số hàm lõi; handler mạng không bao giờ bật (lệnh từ mạng không có trường nào chạm tới cờ này).
   */
  chiDungTrongTest_choPhepCucBo?: boolean;
  /** Thay bộ phân giải DNS (test). */
  phanGiai?: (host: string) => Promise<string[]>;
}

const phanGiaiMacDinh = async (host: string) => {
  const ds = await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise<never>((_, loi) => setTimeout(() => loi(new Error('DNS quá thời gian')), 3000)),
  ]);
  return ds.map((d) => d.address);
};

function ipv4SangSo(ip: string): number | null {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    if (!/^\d{1,3}$/.test(x) || Number(x) > 255) return null;
    n = n * 256 + Number(x);
  }
  return n;
}

const trongDai = (n: number, goc: string, bit: number) => {
  const g = ipv4SangSo(goc)!;
  const mat = bit === 0 ? 0 : (0xffffffff << (32 - bit)) >>> 0;
  return ((n & mat) >>> 0) === ((g & mat) >>> 0);
};

const DAI_CAM_V4: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

/** 8 nhóm 16 bit của một IPv6 (chấp nhận đuôi IPv4 chấm). null nếu không phải IPv6. */
function moRongIpv6(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  const duoiV4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (duoiV4) {
    const n = ipv4SangSo(duoiV4[1]);
    if (n === null) return null;
    s = s.slice(0, -duoiV4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const hai = s.split('::');
  if (hai.length > 2) return null;
  const dau = hai[0] ? hai[0].split(':') : [];
  const cuoi = hai.length === 2 && hai[1] ? hai[1].split(':') : [];
  const thieu = 8 - dau.length - cuoi.length;
  if ((hai.length === 1 && thieu !== 0) || thieu < 0) return null;
  const nhom = [...dau, ...Array(hai.length === 2 ? thieu : 0).fill('0'), ...cuoi];
  if (nhom.length !== 8 || nhom.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return nhom.map((g) => parseInt(g, 16));
}

export function laIpCam(ip: string, choPhepLoopback = false): boolean {
  const loai = isIP(ip.replace(/^\[|\]$/g, ''));
  if (loai === 4) {
    const n = ipv4SangSo(ip)!;
    if (choPhepLoopback && trongDai(n, '127.0.0.0', 8)) return false;
    return DAI_CAM_V4.some(([g, b]) => trongDai(n, g, b));
  }
  if (loai === 6) {
    const g = moRongIpv6(ip);
    if (!g) return true;
    const v4Nhung = (a: number, b: number) => `${a >>> 8}.${a & 255}.${b >>> 8}.${b & 255}`;
    // ::ffff:a.b.c.d (IPv4 ánh xạ), 64:ff9b::/96 (NAT64) → xét IPv4 nhúng bên trong.
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return laIpCam(v4Nhung(g[6], g[7]), choPhepLoopback);
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return laIpCam(v4Nhung(g[6], g[7]), choPhepLoopback);
    // 2002::/16 (6to4) nhúng IPv4 ở nhóm 1–2.
    if (g[0] === 0x2002) return laIpCam(v4Nhung(g[1], g[2]), choPhepLoopback);
    const toanKhong = g.every((x) => x === 0);
    const loopback = g.slice(0, 7).every((x) => x === 0) && g[7] === 1;
    if (loopback) return !choPhepLoopback;
    if (toanKhong) return true; // ::
    if (g.slice(0, 6).every((x) => x === 0)) return true; // ::a.b.c.d (IPv4-compatible, đã bỏ) — chặn cho chắc
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // tài liệu
    return false;
  }
  return true; // không phải IP → không tin
}

export function chuanHoaMien(m: string): string {
  return m.trim().toLowerCase().replace(/\.$/, '');
}

/** Tên máy thuộc danh sách: khớp đúng hoặc là tên miền con. */
export function thuocMien(host: string, mien: readonly string[]): boolean {
  const h = chuanHoaMien(host);
  return mien.map(chuanHoaMien).some((m) => m && (h === m || h.endsWith(`.${m}`)));
}

/** Trả lý do chặn, hoặc null nếu URL được đi. */
export async function kiemUrl(raw: string, mien: readonly string[], tc: TuyChonKiemUrl = {}): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'URL không hợp lệ.';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return `Giao thức ${u.protocol} không được phép.`;
  if (u.username || u.password) return 'URL chứa thông tin đăng nhập — không được phép.';
  const host = chuanHoaMien(u.hostname.replace(/^\[|\]$/g, ''));
  const cucBo = tc.chiDungTrongTest_choPhepCucBo === true;
  if (!cucBo && u.port && u.port !== '80' && u.port !== '443') return `Cổng ${u.port} không được phép (chỉ 80/443).`;
  if (!thuocMien(host, mien)) return `Tên miền ${host} ngoài danh sách được phép.`;
  if (isIP(host)) return laIpCam(host, cucBo) ? `Địa chỉ ${host} là địa chỉ nội bộ — chặn.` : null;
  let ds: string[];
  try {
    ds = await (tc.phanGiai ?? phanGiaiMacDinh)(host);
  } catch {
    return `Không phân giải được ${host}.`;
  }
  if (!ds.length) return `Không phân giải được ${host}.`;
  const cam = ds.find((ip) => laIpCam(ip, cucBo));
  return cam ? `${host} trỏ về địa chỉ nội bộ ${cam} — chặn.` : null;
}

/** Bộ kiểm có nhớ theo (giao thức, tên máy, cổng) trong một lượt — trang thường tải hàng chục request cùng máy. */
export function taoBoKiemUrl(mien: readonly string[], tc: TuyChonKiemUrl = {}) {
  const nho = new Map<string, Promise<string | null>>();
  return (raw: string): Promise<string | null> => {
    let khoa: string;
    try {
      const u = new URL(raw);
      khoa = `${u.protocol}//${u.host}`;
    } catch {
      return Promise.resolve('URL không hợp lệ.');
    }
    let p = nho.get(khoa);
    if (!p) {
      p = kiemUrl(raw, mien, tc);
      nho.set(khoa, p);
    }
    return p;
  };
}
