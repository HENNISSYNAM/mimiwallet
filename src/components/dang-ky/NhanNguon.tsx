import { NHAN_TRANG_THAI, type CanCu } from '@/lib/dangKy/nguon';

/**
 * Nhãn căn cứ cạnh mỗi điều trên trang: điều/khoản + văn bản + "đã đối chiếu văn bản gốc" hay
 * "nguồn thứ cấp, chưa đối chiếu". Màu chỉ để nhìn nhanh — chữ trạng thái luôn in ra, nên đọc
 * bằng trình đọc màn hình hay in đen trắng vẫn phân biệt được.
 */
export default function NhanNguon({ cc }: { cc: CanCu }) {
  const goc = cc.trang_thai === 'goc';
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer list-none">
        <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${goc ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
          {NHAN_TRANG_THAI[cc.trang_thai]}
        </span>{' '}
        <span className="text-muted-foreground">Căn cứ: {cc.dieu} — {cc.van_ban}</span>
      </summary>
      {cc.ghi_chu ? <p className="mt-1 text-muted-foreground">{cc.ghi_chu}</p> : null}
    </details>
  );
}
