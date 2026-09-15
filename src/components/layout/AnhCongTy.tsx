import { chuCaiDau, nenAnhDaiDien } from './anhDaiDien';

/** Vòng tròn chữ cái đầu của công ty, kiểu ảnh đại diện tài khoản Google. */
export function AnhCongTy({ ten, mau, className = 'h-9 w-9 text-xs' }: { ten: string | null; mau: number | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ background: nenAnhDaiDien(ten, mau) }}
    >
      {chuCaiDau(ten)}
    </span>
  );
}
