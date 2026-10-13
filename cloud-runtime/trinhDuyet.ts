import { chromium as playwright, type Browser } from 'playwright-core';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Mở trình duyệt cho một lượt chạy.
 *
 * - Trên Vercel (Linux): Chromium của `@sparticuz/chromium` 153 — khớp Chromium 153 mà `playwright-core` 1.63.0 nhắm tới.
 *   Hai phiên bản ghim đúng (không `^`): lệch phiên bản Chromium/Playwright là nguồn lỗi CDP khó đoán.
 * - Máy dev/test (Windows, macOS): Chrome đã cài (`channel: 'chrome'`, như `helper/`) — binary của sparticuz chỉ chạy Linux.
 *
 * Import động `@sparticuz/chromium` để máy dev không cần giải nén binary Linux, và để health check không tốn gì.
 */

const thamSoChung = [
  // Không để WebRTC lộ/đi đường UDP vòng qua `context.route`.
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--webrtc-ip-handling-policy=disable_non_proxied_udp',
];

export const laMoiTruongVercel = () => process.platform === 'linux' && (!!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function moTrinhDuyet(): Promise<Browser> {
  if (laMoiTruongVercel()) {
    const { default: chromium } = await import('@sparticuz/chromium');
    return playwright.launch({
      args: [...chromium.args, ...thamSoChung],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return playwright.launch({ channel: process.env.KENH ?? 'chrome', headless: true, args: thamSoChung });
}

/** Trạng thái trình duyệt cho health check — KHÔNG mở/giải nén Chromium. */
export function trangThaiChromium(): 'san_sang' | 'thieu_goi' | 'cuc_bo' {
  if (!laMoiTruongVercel()) return 'cuc_bo';
  try {
    const req = createRequire(import.meta.url);
    // Gói chỉ xuất "." (build/index.js) nên không resolve được package.json; bin/ nằm cạnh build/.
    const goc = dirname(dirname(req.resolve('@sparticuz/chromium')));
    return existsSync(join(goc, 'bin', 'chromium.br')) ? 'san_sang' : 'thieu_goi';
  } catch {
    return 'thieu_goi';
  }
}
