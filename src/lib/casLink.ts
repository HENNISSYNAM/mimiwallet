/**
 * Mở màn hình Cas Link mà KHÔNG dùng `open()` của SDK.
 *
 * VÌ SAO PHẢI TỰ DỰNG. SDK `https://cdn.bankhub.dev/link/v1/link-initialize.js`
 * khai ba nền trong mã nguồn:
 *
 *   const f = { LOCAL:"http://localhost:3000",
 *               DEV:"https://dev.link.bankhub.dev",
 *               PROD:"https://link.bankhub.dev" };
 *
 * nhưng `open()` luôn ghép `f.DEV`. `f.PROD` khai ra rồi không dòng nào dùng.
 * Hậu quả khi chuyển sang production (23/09/2026): grant token là thật, webhook
 * production về đều, nhưng màn Link mở ở sandbox — và sandbox tra địa chỉ quay
 * về trong danh sách của app sandbox, không thấy địa chỉ vừa khai cho app
 * production, nên trả "Redirect URL không có giá trị". Không có bản v2/v3 để
 * chờ (cả ba đều 404), nên phần ghép địa chỉ chuyển về đây.
 *
 * Mọi thứ khác giữ nguyên hành vi của SDK: cùng tên tham số, cùng id và kiểu
 * dáng iframe, để trang Link của Cas không phân biệt được ai gọi. Việc nhận
 * `postMessage` vẫn do CasLink.tsx đảm nhiệm — nó chấp nhận mọi tên miền con
 * của bankhub.dev, nên đổi sang `link.bankhub.dev` không phải sửa gì thêm.
 */

export const NEN_LINK_SANDBOX = 'https://dev.link.bankhub.dev';
export const NEN_LINK_PRODUCTION = 'https://link.bankhub.dev';

/** Id đúng như SDK đặt, vì chỗ khác trong app gỡ iframe theo id này. */
export const ID_KHUNG_LINK = 'bankhub-iframe';

export interface ThamSoCasLink {
  /** Máy chủ trả về theo BANKHUB_ENV; thiếu thì coi như sandbox. */
  linkBaseUrl?: string | null;
  redirectUri: string;
  grantToken: string;
  iframe?: boolean;
  feature?: 'kyc' | 'qrpay';
  fiServiceType?: 'enterprise' | 'personal' | 'all';
  state?: string;
}

/**
 * Nền nào cũng phải là của Cas. Máy chủ mới là nơi quyết định, nhưng giá trị đi
 * qua trình duyệt nên vẫn kiểm: một `linkBaseUrl` bị đổi thành trang lạ sẽ nhận
 * được grant token và địa chỉ quay về của khách.
 */
export function nenLinkHopLe(u: string | null | undefined): string | null {
  if (!u) return null;
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname;
  if (host !== 'bankhub.dev' && !host.endsWith('.bankhub.dev')) return null;
  return url.origin;
}

/** Địa chỉ đầy đủ của màn Cas Link. Thiếu grantToken hoặc redirectUri thì ném lỗi. */
export function urlCasLink(t: ThamSoCasLink): string {
  if (!t.grantToken || !t.redirectUri) {
    throw new Error('Thiếu grantToken hoặc redirectUri để mở Cas Link');
  }
  if (t.state && t.state.includes(' ')) {
    // Ràng buộc của SDK; giữ lại vì trang Link cũng tách tham số theo dấu cách.
    throw new Error('state không được chứa dấu cách');
  }
  const nen = nenLinkHopLe(t.linkBaseUrl) ?? NEN_LINK_SANDBOX;
  const q = new URLSearchParams();
  // Thứ tự và tên tham số lấy từ chính SDK, không đặt lại.
  q.append('redirectUri', t.redirectUri);
  if (t.iframe) q.append('iframe', 'true');
  q.append('grantToken', t.grantToken);
  if (t.fiServiceType) q.append('fiServiceType', t.fiServiceType);
  if (t.feature) q.append('feature', t.feature);
  if (t.state) q.append('state', t.state);
  return `${nen}?${q.toString()}`;
}

/**
 * Chèn iframe đúng như SDK làm: cùng id, cùng kiểu dáng, cùng vị trí đầu body.
 * Trả về `false` khi iframe đã có sẵn — y hệt SDK, để hai lần bấm không mở hai
 * màn chồng nhau.
 */
export function moKhungCasLink(url: string, doc: Document = document): boolean {
  if (doc.getElementById(ID_KHUNG_LINK)) return false;
  const el = doc.createElement('iframe');
  el.id = ID_KHUNG_LINK;
  el.src = url;
  el.style.overflow = 'hidden';
  el.style.position = 'fixed';
  el.allowFullscreen = true;
  el.style.zIndex = '1500';
  el.allow = 'clipboard-write';
  el.height = String(typeof window !== 'undefined' ? window.innerHeight : 800);
  el.width = '100%';
  doc.body.insertBefore(el, doc.body.firstChild);
  return true;
}

export function dongKhungCasLink(doc: Document = document): void {
  doc.getElementById(ID_KHUNG_LINK)?.remove();
}
