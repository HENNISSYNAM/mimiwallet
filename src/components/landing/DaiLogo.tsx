import thinhPhatLogo from '@/assets/logos/thinh-phat.png';
import cassoLogo from '@/assets/logos/casso.png';
import cpGroupLogo from '@/assets/logos/cp-group.png';

/**
 * Dải logo chạy ngang "Đồng hành cùng MIMI".
 *
 * Câu dẫn cố ý là "đồng hành", không phải "khách hàng tin dùng": ba đơn vị có ba vai khác nhau —
 * Thịnh Phát (doanh nghiệp đồng hành), Casso (dịch vụ ngân hàng MIMI kết nối), C.P. Group (ươm tạo
 * & cố vấn, xem TrustSection). Thêm logo nào thì chủ dự án phải xác nhận được phép dùng và vai trò.
 *
 * Chạy bằng CSS (`.mimi-dai-logo`): danh sách nhân đôi, dịch -50% rồi lặp lại, nên không có khoảng
 * hở. Người bật "giảm chuyển động" thì dải đứng yên.
 */
export const DONG_HANH = [
  { ten: 'Thịnh Phát', logo: thinhPhatLogo },
  { ten: 'Casso', logo: cassoLogo },
  { ten: 'C.P. Group', logo: cpGroupLogo },
] as const;

export default function DaiLogo({ className = '' }: { className?: string }) {
  // Ít logo thì lặp nhiều lần cho kín một vòng rộng hơn màn hình.
  const mot = Array.from({ length: 4 }, () => DONG_HANH).flat();
  return (
    <section aria-label="Đồng hành cùng MIMI" className={`py-10 ${className}`}>
      <p className="text-center text-[15px] text-muted-foreground">Đồng hành cùng MIMI</p>
      <div className="mimi-dai-logo-khung mt-6 overflow-hidden">
        <ul className="mimi-dai-logo flex w-max items-center">
          {[...mot, ...mot].map((d, i) => (
            <li key={i} aria-hidden={i >= DONG_HANH.length} className="flex h-12 shrink-0 items-center px-10 sm:px-14">
              <img
                src={d.logo}
                alt={i < DONG_HANH.length ? d.ten : ''}
                draggable={false}
                loading="lazy"
                className="max-h-10 w-auto max-w-[140px] object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
