import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NGON_NGU } from '@/i18n';

/**
 * Bộ chọn ngôn ngữ cho các trang công khai.
 *
 * VÌ SAO KHÔNG CÒN LÀ NÚT BẬT-TẮT. Bản trước là một nút hai chiều:
 *
 *     i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')
 *
 * nên trang công khai chỉ tới được tiếng Việt và tiếng Anh, dù `NGON_NGU` khai
 * bốn ngôn ngữ và tự ghi rằng nó là "nguồn duy nhất cho menu chọn ngôn ngữ".
 *
 * Hậu quả nằm đúng chỗ đau nhất: người đang để giao diện tiếng Hàn hoặc tiếng
 * Trung — chọn từ thanh bên trong app, hoặc do trình duyệt tự nhận — ra trang
 * công khai thì chỉ thấy một nút ghi "VI". Bấm vào là sang tiếng Việt, và không
 * còn đường nào quay lại tiếng của mình.
 *
 * Tìm ra ngày 23/09/2026 bằng agent đóng vai một chủ xưởng ở Osaka: cô rơi vào
 * giao diện tiếng Hàn, không đọc được, và nút duy nhất cô thấy là "Chuyển sang
 * Tiếng Việt" — một ngôn ngữ cô cũng không đọc được. Với một app sắp lên Google
 * Play toàn cầu, đó là ngõ cụt.
 *
 * Nay dùng chung đúng danh sách `NGON_NGU` với thanh bên trong app, nên thêm
 * ngôn ngữ vẫn chỉ phải sửa một chỗ.
 */
export function ChonNgonNgu({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const hienTai = NGON_NGU.find((n) => i18n.language?.startsWith(n.ma)) ?? NGON_NGU[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('man.chung.chonNgonNgu')}
          title={t('man.chung.chonNgonNgu')}
          className={
            className ??
            'flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent'
          }
        >
          <Globe size={15} />
          <span className="font-medium">{hienTai.ma_ngan}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div role="group" aria-label={t('man.chung.chonNgonNgu')}>
          {NGON_NGU.map((n) => (
            <button
              key={n.ma}
              type="button"
              aria-pressed={n.ma === hienTai.ma}
              onClick={() => void i18n.changeLanguage(n.ma)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent"
            >
              <span>{n.ten}</span>
              <span className="text-xs text-muted-foreground">{n.ma_ngan}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
