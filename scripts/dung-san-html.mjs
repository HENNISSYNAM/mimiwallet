// Dựng sẵn HTML cho trang công khai (06/10/2026). Chạy sau `vite build` và `vite build --ssr src/dungSan.tsx`.
// Đọc dist/index.html làm khuôn, dựng từng đường trong sitemap, ghi dist/<đường>/index.html.
// Vỏ SPA nguyên bản được giữ ở dist/app-shell.html — vercel.json trỏ mọi đường còn lại (dashboard…) về đó,
// để trang đăng nhập không nháy nội dung trang chủ.
import { JSDOM } from 'jsdom';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const SITE = 'https://www.mimiwallet.online';

// Môi trường trình duyệt tối thiểu cho mã chạy lúc nạp module (localStorage, matchMedia…). Hiệu ứng không chạy khi dựng.
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: `${SITE}/` });
const g = globalThis;
const dat = (k, v) => Object.defineProperty(g, k, { value: v, configurable: true, writable: true });
for (const k of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Element', 'Node', 'getComputedStyle', 'location', 'history', 'CustomEvent', 'Event']) {
  dat(k, k === 'window' ? dom.window : dom.window[k]);
}
dat('navigator', dom.window.navigator);
const khongLam = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
dom.window.matchMedia = dom.window.matchMedia ?? (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
dat('matchMedia', dom.window.matchMedia);
dat('IntersectionObserver', khongLam); dom.window.IntersectionObserver = khongLam;
dat('ResizeObserver', khongLam); dom.window.ResizeObserver = khongLam;
dat('requestAnimationFrame', (f) => setTimeout(f, 0)); dat('cancelAnimationFrame', (i) => clearTimeout(i));
// useLayoutEffect không chạy khi dựng — cảnh báo vô hại, lọc đi để nhật ký build còn đọc được.
const loiGoc = console.error;
console.error = (...a) => { if (typeof a[0] === 'string' && a[0].includes('useLayoutEffect does nothing on the server')) return; loiGoc(...a); };
const seo = [];
g.__MIMI_SEO__ = seo;

const { dung, danhSachTrangCongKhai } = await import(pathToFileURL(join(process.cwd(), 'dist-ssr', 'dungSan.js')).href);

const khuon = readFileSync(join(DIST, 'index.html'), 'utf8');
copyFileSync(join(DIST, 'index.html'), join(DIST, 'app-shell.html'));

const thoat = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function ghepHead(html, m, duong) {
  const url = `${SITE}${duong === '/' ? '/' : duong}`;
  const thay = (re, the) => (re.test(html) ? (html = html.replace(re, the)) : (html = html.replace('</head>', `    ${the}\n  </head>`)));
  thay(/<title>[^<]*<\/title>/, `<title>${thoat(m.title)}</title>`);
  thay(/<meta name="description"[^>]*>/, `<meta name="description" content="${thoat(m.description)}" />`);
  thay(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${thoat(m.title)}" />`);
  thay(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${thoat(m.description)}" />`);
  thay(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  thay(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  return html;
}

let ok = 0;
const hong = [];
for (const { duong } of danhSachTrangCongKhai()) {
  seo.length = 0;
  try {
    const than = await dung(duong);
    const m = seo[seo.length - 1];
    if (!m || m.noIndex || than.length < 200) throw new Error(m?.noIndex ? 'trang noindex' : 'nội dung rỗng');
    // Khối #root của khuôn chứa màn khởi động (boot-screen) — thay cả khối, giữ phần sau (style, script).
    let html = ghepHead(khuon, m, duong);
    const dau = html.indexOf('<div id="root">');
    const cuoi = html.indexOf('<style>@keyframes boot-spin');
    if (dau < 0 || cuoi < dau) throw new Error('khuôn index.html đổi: không thấy khối #root');
    html = `${html.slice(0, dau)}<div id="root" data-dung-san="1">${than}</div>
    ${html.slice(cuoi)}`;
    const ra = duong === '/' ? join(DIST, 'index.html') : join(DIST, duong.slice(1), 'index.html');
    mkdirSync(dirname(ra), { recursive: true });
    writeFileSync(ra, html);
    ok++;
  } catch (e) {
    hong.push(`${duong}: ${e instanceof Error ? e.message : e}`);
  }
}
rmSync('dist-ssr', { recursive: true, force: true });
console.log(`Dựng sẵn ${ok} trang.`);
if (hong.length) {
  console.warn(`Không dựng được ${hong.length} trang (vẫn chạy như SPA):\n  ${hong.join('\n  ')}`);
}
process.exit(0);
