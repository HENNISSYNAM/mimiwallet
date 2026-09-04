import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Nút chuyển sáng/tối.
 *
 * Ba trạng thái chứ không phải hai: sáng, tối, và *theo máy*. Trạng thái thứ ba
 * là mặc định và là trạng thái đúng cho hầu hết mọi người — máy đã biết họ muốn
 * gì rồi. Nút này chỉ đảo giữa sáng và tối khi người ta thật sự muốn ghi đè.
 *
 * `mounted` là bắt buộc, không phải phòng xa: trước khi component gắn vào cây,
 * `resolvedTheme` là `undefined`, và vẽ icon theo giá trị đó thì lần vẽ đầu sẽ
 * ra sai icon rồi nháy sang icon đúng.
 */
export default function ChuyenSangToi({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dangToi = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(dangToi ? 'light' : 'dark')}
      aria-label={dangToi ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg',
        'border border-border text-muted-foreground',
        'transition-colors duration-200 hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {/* Chưa gắn xong thì để trống chỗ — giữ đúng kích thước nên không xô layout. */}
      {mounted ? (
        dangToi ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
