/*
 * Service worker tối thiểu — đủ để app cài được và không ra trang lỗi Chrome khi mất mạng.
 *
 * VÌ SAO CÓ. Kế hoạch lên Google Play đi bằng TWA (Trusted Web Activity), tức
 * Play bọc chính trang web này thành ứng dụng. Không có service worker thì lúc
 * mất mạng, app mở ra là trang khủng long của Chrome — trông như ứng dụng hỏng,
 * và đó là thứ người duyệt Play hay chặn.
 *
 * CỐ Ý KHÔNG CACHE DỮ LIỆU. Đây là app tài chính: một số dư hay một dòng sao kê
 * cũ hiện lại sau khi người dùng đã đăng xuất, hoặc một con số của phiên trước
 * hiện cho người sau trên máy dùng chung, còn tệ hơn là không hiện gì. Nên:
 *
 *   - Chỉ cache vỏ tĩnh: trang, biểu tượng, manifest.
 *   - MỌI lời gọi tới Supabase, tới API, và mọi request không phải GET đều đi
 *     thẳng ra mạng, không đụng cache, không có bản dự phòng.
 *   - Mất mạng thì hiện đúng một trang nói "không có mạng", không hiện số cũ.
 *
 * Đổi `PHIEN_BAN` mỗi lần đổi danh sách VO — service worker cũ sẽ tự dọn.
 */

const PHIEN_BAN = 'mimi-v1';
const VO = [
  '/',
  '/manifest.webmanifest',
  '/mimi-cat-192.png',
  '/mimi-cat-512.png',
  '/favicon.ico',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(PHIEN_BAN)
      // `addAll` hỏng cả mẻ nếu một tệp lỗi; cài từng cái để một biểu tượng
      // thiếu không chặn toàn bộ service worker.
      .then((c) => Promise.allSettled(VO.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ten) => Promise.all(ten.filter((t) => t !== PHIEN_BAN).map((t) => caches.delete(t))))
      .then(() => self.clients.claim()),
  );
});

/** Dữ liệu người dùng không bao giờ đi qua cache. */
function laDuLieu(url) {
  return (
    url.hostname.endsWith('.supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/')
  );
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || laDuLieu(url)) return;

  // Điều hướng: ưu tiên mạng để người dùng luôn nhận bản mới nhất; mất mạng thì
  // trả vỏ đã cache, và nếu cũng không có thì một câu nói thật.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((r) => r ?? new Response(
          '<!doctype html><meta charset="utf-8"><title>Không có mạng</title>'
          + '<body style="font-family:system-ui;padding:2rem;line-height:1.6">'
          + '<h1>Không có mạng</h1><p>MIMI cần mạng để đọc số liệu của bạn. '
          + 'Kiểm tra kết nối rồi mở lại.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
        )),
      ),
    );
    return;
  }

  // Tài nguyên tĩnh: lấy cache trước cho nhanh, đồng thời làm mới ngầm.
  e.respondWith(
    caches.match(request).then((cache) => {
      const mang = fetch(request)
        .then((res) => {
          if (res.ok) caches.open(PHIEN_BAN).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => cache);
      return cache ?? mang;
    }),
  );
});
