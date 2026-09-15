import mimiCat from '@/assets/mimi-cat.webp';

/** Logo mèo MIMI dùng như một biểu tượng điều hướng — cùng kích thước với icon lucide. */
export function IconMeo({ size = 20, className = '' }: { size?: number | string; strokeWidth?: number | string; className?: string }) {
  return <img src={mimiCat} alt="" aria-hidden width={size} height={size} draggable={false} className={`no-save shrink-0 object-contain ${className}`} />;
}
