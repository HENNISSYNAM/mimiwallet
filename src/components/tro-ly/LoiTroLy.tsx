/**
 * Lời trợ lý đầu màn hình: một câu nói bằng tiền và việc, rồi những việc cần làm.
 *
 * MIMI phía sau phức tạp (luật, đối soát, nhà cung cấp, mã hoá), nhưng người dùng là
 * chủ doanh nghiệp và kế toán. Họ mở màn để biết "tình hình thế nào, tôi cần làm gì" —
 * câu này trả lời trước khi họ phải đọc bảng. Câu phải tính từ dữ liệu thật; thành phần
 * này chỉ hiển thị, không tự sinh nội dung.
 */
export interface ViecTroLy {
  khoa: string;
  cau: string;
  hanhDong?: { nhan: string; lam: () => void };
}

export function LoiTroLy({ cau, viec = [] }: { cau: string; viec?: ViecTroLy[] }) {
  return (
    <section aria-label="Tóm tắt của trợ lý" className="rounded-lg border border-border bg-card p-4">
      <p className="text-[15px] leading-relaxed text-foreground">{cau}</p>
      {viec.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-border pt-3" aria-label="Việc cần làm">
          {viec.map((v) => (
            <li key={v.khoa} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <span className="flex items-start gap-2 text-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mimi-amber" aria-hidden />
                {v.cau}
              </span>
              {v.hanhDong && (
                <button
                  type="button"
                  onClick={v.hanhDong.lam}
                  className="ml-3.5 shrink-0 rounded text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:ml-0"
                >
                  {v.hanhDong.nhan}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
