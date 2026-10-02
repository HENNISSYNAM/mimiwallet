import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { goiTroLy } from '@/lib/goiTroLy';
import type { CanhBao } from '@/lib/batThuong';
import { duongDanGiayTo } from '@/lib/giayTo';

/**
 * TCCN-01 — thẻ "Dấu hiệu bất thường" trên màn Tổng quan.
 *
 * Số liệu lấy từ action `bat_thuong` của `tro-ly`, tức CÙNG hàm quét mà MIMI Assistant dùng để
 * trả lời — hai nơi không thể báo hai kết quả khác nhau.
 *
 * Không có nút "bỏ qua cảnh báo": chưa có chỗ lưu lựa chọn đó ở máy chủ, và một nút chỉ đổi
 * giao diện rồi mất khi tải lại là nút nói dối. Cảnh báo tự rời thẻ khi khoản đó ra khỏi cửa sổ
 * 30 ngày.
 */

interface KetQua {
  tong: number;
  so_cao: number;
  canh_bao: CanhBao[];
  lich_su_du: boolean;
  so_khoan_da_xet: number;
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
const ngay = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const CAU_HOI = 'Có giao dịch nào bất thường hay có dấu hiệu lừa đảo không?';

export default function TheBatThuong() {
  const navigate = useNavigate();
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState(false);

  useEffect(() => {
    let huy = false;
    goiTroLy('bat_thuong')
      .then((r) => { if (!huy) setKq(r as unknown as KetQua); })
      .catch(() => { if (!huy) setLoi(true); });
    return () => { huy = true; };
  }, []);

  // Chưa có sao kê thì không có gì để quét — thẻ "chưa liên kết ngân hàng" ở trên đã nói việc đó.
  if (loi || !kq || kq.so_khoan_da_xet === 0) return null;

  const hoi = () => navigate(`/dashboard/tro-ly?hoi=${encodeURIComponent(CAU_HOI)}`);

  if (kq.tong === 0) {
    return (
      <section aria-label="Dấu hiệu bất thường" className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-mimi-green" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Không thấy dấu hiệu bất thường trong 30 ngày qua</p>
          <p className="mt-0.5 text-muted-foreground">
            Đã so từng khoản chi với {kq.so_khoan_da_xet.toLocaleString('vi-VN')} khoản chi trong 180 ngày. Tính theo lần đồng bộ sao kê gần nhất.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Dấu hiệu bất thường"
      className={`rounded-2xl border p-4 ${kq.so_cao ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert size={18} className={`mt-0.5 shrink-0 ${kq.so_cao ? 'text-destructive' : 'text-foreground'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {kq.tong} khoản chi 30 ngày qua có dấu hiệu bất thường{kq.so_cao ? ` · ${kq.so_cao} khoản mức cao` : ''}
          </p>
          <ul className="mt-2 space-y-2">
            {kq.canh_bao.slice(0, 3).map((c) => (
              <li key={c.khoan.id} className="text-sm">
                <span className="font-medium text-foreground">
                  {ngay(c.khoan.ngay)} · {vnd(c.khoan.so_tien)} · {c.khoan.ten_nguoi_nhan ?? 'Không rõ người nhận'}
                </span>
                <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${c.muc_do === 'cao' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
                  {c.muc_do === 'cao' ? 'Mức cao' : 'Cần để ý'}
                </span>
                <p className="mt-0.5 text-muted-foreground">{c.dau_hieu[0]?.cau}</p>
                {/* TCCN-12: tiền đã đi rồi thì việc còn làm được là tra soát — càng sớm càng tốt. */}
                <button
                  onClick={() => navigate(duongDanGiayTo('don_tra_soat', c.khoan.id))}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  Soạn đơn tra soát khoản này
                </button>
              </li>
            ))}
          </ul>
          {!kq.lich_su_du && (
            <p className="mt-2 text-xs text-muted-foreground">MIMI chỉ đọc được một phần lịch sử chi, nên có thể báo nhầm "người nhận mới".</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Dấu hiệu, chưa phải kết luận. Khoản chi xin qua MIMI có dấu hiệu mức cao sẽ bị dừng lại lúc bấm Duyệt.
          </p>
          <button onClick={hoi} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Hỏi MIMI chi tiết và xem giao dịch gốc <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </section>
  );
}
