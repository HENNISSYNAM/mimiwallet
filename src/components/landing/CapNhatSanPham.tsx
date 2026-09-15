/**
 * Cập nhật sản phẩm — những gì đã chạy thật, mới nhất trước.
 *
 * CHỈ GHI ĐIỀU ĐÃ CHẠY. Mỗi dòng ứng với một commit đã lên production (xem git
 * log cùng ngày). Chức năng đang xây không vào đây — nó nằm ở nhãn "Đang xây"
 * trên các khung demo. Thêm dòng mới lên đầu mảng.
 */

const CAP_NHAT = [
  {
    ngay: '14/09/2026',
    nhom: 'Kiểm nghiệm',
    tieuDe: 'Bộ kiểm nghiệm tự chạy',
    mo: '49 tình huống chuẩn cho bộ luật chi, test cả vòng agent xin chi, và dò hệ thống đang chạy — một lệnh, có báo cáo.',
  },
  {
    ngay: '14/09/2026',
    nhom: 'Agent',
    tieuDe: 'Ba luật chống chuyển nhầm',
    mo: 'Chặn agent chạy vòng lặp, giữ người nhận mới 24 giờ, cảnh báo đỏ khi cùng người nhận mà đổi số tài khoản.',
  },
  {
    ngay: '14/09/2026',
    nhom: 'Duyệt chi',
    tieuDe: 'Màn duyệt hợp điện thoại',
    mo: 'Số tiền đọc thêm bằng chữ; lệnh trả QR có nút lưu ảnh mã và chép từng dòng để trả ngay trên máy đang dùng.',
  },
  {
    ngay: '14/09/2026',
    nhom: 'Ngân hàng',
    tieuDe: 'Hoàn tất nghiệm thu liên kết ngân hàng trên môi trường thử',
    mo: '19/20 tình huống đạt, mỗi tình huống có mã yêu cầu làm bằng chứng.',
  },
  {
    ngay: '10/09/2026',
    nhom: 'Agent',
    tieuDe: 'MCP server cho agent',
    mo: 'Nối Claude, Cursor hay ứng dụng hỗ trợ MCP vào MIMI bằng một lệnh.',
  },
  {
    ngay: '10/09/2026',
    nhom: 'Agent',
    tieuDe: 'Lớp kiểm soát chi cho agent',
    mo: 'Hạn mức, người nhận được phép, duyệt, lệnh trả VietQR và đối soát sao kê, kèm nhật ký chỉ-thêm.',
  },
];

export default function CapNhatSanPham() {
  return (
    <section id="cap-nhat" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            Cập nhật sản phẩm
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Những gì vừa chạy thật trên MIMI, mới nhất trước.</p>
        </div>
        <ol className="mt-10 divide-y divide-border border-y border-border">
          {CAP_NHAT.map((c) => (
            <li key={c.tieuDe} className="grid gap-2 py-5 sm:grid-cols-[150px_1fr] sm:gap-8">
              <div className="flex items-center gap-2 sm:block">
                <p className="font-mono text-sm tabular-nums text-muted-foreground">{c.ngay}</p>
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:mt-1.5">{c.nhom}</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">{c.tieuDe}</h3>
                <p className="mt-1 max-w-2xl leading-relaxed text-muted-foreground">{c.mo}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
