import { thanhXam, xoay90, type AnhMau } from './anh';
import { apCheDo, type CheDoQuet } from './lamRo';
import { kichThuocRa, nanPhang, type BonGoc } from './phoiCanh';
import { timBonGoc } from './timGoc';

/**
 * Phần chạm trình duyệt của máy quét: giải mã ảnh, canvas, JPEG. Toán nằm ở các tệp bên cạnh
 * (hàm thuần, có test); tệp này chỉ chuyển qua lại giữa canvas và mảng điểm ảnh.
 *
 * Mọi thứ chạy trên máy người dùng — ảnh giấy tờ không gửi đi đâu ở bước quét.
 */

/** Cạnh dài tối đa của ảnh nguồn giữ lại: ~200 dpi cho tờ A4, đủ đọc chữ 8pt, không ngốn RAM điện thoại. */
export const CANH_NGUON = 2000;
/** Cạnh dài tối đa của trang đã nắn (vào PDF). */
export const CANH_TRANG = 2000;
/** Ảnh dùng để tìm góc: nhỏ là đủ, nhanh. */
const CANH_TIM = 480;

export interface AnhNguon { blob: Blob; rong: number; cao: number }

function taoCanvas(rong: number, cao: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = rong;
  c.height = cao;
  return c;
}

const ctx2d = (c: HTMLCanvasElement) => {
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) throw new Error('Trình duyệt này không vẽ được ảnh (canvas). Thử Chrome, Safari hoặc Edge bản mới.');
  return x;
};

export function canvasThanhBlob(c: HTMLCanvasElement, chatLuong: number): Promise<Blob> {
  return new Promise((ok, hong) => {
    c.toBlob((b) => (b ? ok(b) : hong(new Error('Không tạo được ảnh JPEG.'))), 'image/jpeg', chatLuong);
  });
}

/** Giải mã ảnh (tệp, blob) — `createImageBitmap` tự xoay theo EXIF; trình duyệt cũ thì qua thẻ <img>. */
async function giaiMa(nguon: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(nguon, { imageOrientation: 'from-image' }); } catch { /* rơi về <img> */ }
  }
  const url = URL.createObjectURL(nguon);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Vẽ nguồn lên canvas, thu cạnh dài về `canhToiDa`. */
function veThuNho(nguon: CanvasImageSource, rong: number, cao: number, canhToiDa: number): HTMLCanvasElement {
  const k = Math.min(1, canhToiDa / Math.max(rong, cao));
  const c = taoCanvas(Math.max(1, Math.round(rong * k)), Math.max(1, Math.round(cao * k)));
  const x = ctx2d(c);
  x.imageSmoothingQuality = 'high';
  x.drawImage(nguon, 0, 0, c.width, c.height);
  return c;
}

export const docAnhMau = (c: HTMLCanvasElement): AnhMau => {
  const d = ctx2d(c).getImageData(0, 0, c.width, c.height);
  return { rong: d.width, cao: d.height, du: d.data };
};

function anhMauThanhCanvas(a: AnhMau): HTMLCanvasElement {
  const c = taoCanvas(a.rong, a.cao);
  ctx2d(c).putImageData(new ImageData(a.du, a.rong, a.cao), 0, 0);
  return c;
}

/**
 * Nhận ảnh vừa chụp/chọn: thu về CANH_NGUON, giữ dạng JPEG chất lượng cao (nhẹ RAM hơn giữ
 * canvas — mười trang canvas 2000px là ~160 MB, điện thoại tầm trung sẽ tắt tab), và tìm sẵn góc.
 */
export async function nhanAnh(nguon: Blob | HTMLVideoElement): Promise<AnhNguon & { goc: BonGoc; timThay: boolean }> {
  let canvas: HTMLCanvasElement;
  if (nguon instanceof Blob) {
    const anh = await giaiMa(nguon);
    canvas = veThuNho(anh, anh.width, anh.height, CANH_NGUON);
    if ('close' in anh && typeof anh.close === 'function') anh.close();
  } else {
    canvas = veThuNho(nguon, nguon.videoWidth, nguon.videoHeight, CANH_NGUON);
  }
  const blob = await canvasThanhBlob(canvas, 0.92);
  const nho = veThuNho(canvas, canvas.width, canvas.height, CANH_TIM);
  const tim = timBonGoc(thanhXam(docAnhMau(nho)));
  const k = canvas.width / nho.width;
  const goc = tim.goc.map((p) => ({ x: p.x * k, y: p.y * k })) as BonGoc;
  return { blob, rong: canvas.width, cao: canvas.height, goc, timThay: tim.timThay };
}

/** Tìm lại góc cho một ảnh nguồn đã giữ (nút "Tự tìm lại"). */
export async function timLaiGoc(nguon: AnhNguon): Promise<{ goc: BonGoc; timThay: boolean }> {
  const anh = await giaiMa(nguon.blob);
  const nho = veThuNho(anh, anh.width, anh.height, CANH_TIM);
  const tim = timBonGoc(thanhXam(docAnhMau(nho)));
  const k = nguon.rong / nho.width;
  return { goc: tim.goc.map((p) => ({ x: p.x * k, y: p.y * k })) as BonGoc, timThay: tim.timThay };
}

/**
 * Dựng trang cuối: nắn phẳng → làm rõ theo chế độ → xoay → JPEG.
 * Đen trắng nén mạnh hơn (0,7) vì chỉ có hai mức; màu giữ 0,8 để con dấu không loang.
 */
export async function dungTrang(nguon: AnhNguon, goc: BonGoc, cheDo: CheDoQuet, xoay: number): Promise<Blob> {
  const anh = await giaiMa(nguon.blob);
  const c = veThuNho(anh, anh.width, anh.height, CANH_NGUON);
  const { rong, cao } = kichThuocRa(goc, CANH_TRANG);
  const phang = nanPhang(docAnhMau(c), goc, rong, cao);
  const ra = xoay90(apCheDo(phang, cheDo), xoay);
  return canvasThanhBlob(anhMauThanhCanvas(ra), cheDo === 'tai_lieu' ? 0.7 : 0.8);
}

export function blobThanhDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, hong) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => hong(new Error('Không đọc được ảnh.'));
    r.readAsDataURL(b);
  });
}
