/** Máy có vẽ được WebGL không. Không có (trình duyệt cũ, tắt tăng tốc phần cứng, môi trường test) → lưới 2D. */
export function coWebGL(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl') ?? c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    return !!gl && typeof gl.getParameter === 'function';
  } catch {
    return false;
  }
}

/** Người dùng đã xin giảm chuyển động: mặc định không mở cảnh 3D có mèo đi lại. */
export function giamChuyenDong(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
