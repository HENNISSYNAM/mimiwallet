import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { taoChuoiVietQr } from '@/lib/vietqr';
import { formatVND } from '@/lib/formatters';
import { toast } from 'sonner';
import { Loader2, Copy, Check, Building2, Landmark, Hash, CreditCard, ExternalLink } from 'lucide-react';
import { duongDanMuaGoi } from '@/lib/lienKetStripe';

/**
 * Màn hình trả phí bằng chuyển khoản.
 *
 * Thay cho đường Stripe, vốn không dùng được: Stripe không nhận merchant Việt
 * Nam, nên nút "Nâng cấp" cũ dẫn tới một cổng thanh toán không bao giờ thu được
 * tiền của khách hàng Việt.
 *
 * BA THỨ PHẢI ĐÚNG Ở MÀN HÌNH NÀY, và cả ba đều vì cùng một lý do — đối soát
 * khớp bằng **mã tham chiếu trong nội dung chuyển khoản**:
 *
 * 1. **Mã QR nhét sẵn số tiền và nội dung.** Khách quét là xong. Gõ tay
 *    `MIMIABC234` là mời gõ sai, mà gõ sai thì tiền vào nhưng thuê bao không
 *    kích hoạt và phải có người xử lý tay.
 * 2. **Vẫn hiện đầy đủ số tài khoản để chuyển tay.** Không phải ai cũng quét
 *    được: máy tính để bàn, ứng dụng ngân hàng cũ, hoặc khách nhờ kế toán
 *    chuyển hộ.
 * 3. **Nút sao chép cho từng trường.** Chép tay số tài khoản 9 chữ số cũng sai
 *    được như chép mã.
 *
 * QR dựng ngay tại máy khách bằng `taoChuoiVietQr` + `qrcode`, không gọi dịch
 * vụ ảnh bên ngoài — xem ghi chú trong `src/lib/vietqr.ts`.
 */

interface HoaDon {
  invoice_id: string;
  reference_code: string;
  amount: number;
  plan_name: string;
  bank: { soTaiKhoan: string; nganHang: string; chuTaiKhoan: string; bin: string };
  huong_dan: string;
}

function DongChep({ nhan, giaTri, icon: Icon, mono }: {
  nhan: string; giaTri: string; icon: typeof Hash; mono?: boolean;
}) {
  const [chep, setChep] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{nhan}</p>
          <p className={`text-sm text-foreground break-all ${mono ? 'font-mono font-semibold' : ''}`}>
            {giaTri}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(giaTri);
          setChep(true);
          setTimeout(() => setChep(false), 1500);
        }}
        className="shrink-0 tap-target flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label={`Sao chép ${nhan}`}
      >
        {chep ? <Check className="w-4 h-4 text-mimi-green" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
      </button>
    </div>
  );
}

export function SubscriptionPayment({ plan, onPaid }: { plan: string; onPaid?: () => void }) {
  const [hoaDon, setHoaDon] = useState<HoaDon | null>(null);
  const [dangTao, setDangTao] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tao = useCallback(async () => {
    setDangTao(true);
    setLoi(null);
    try {
      const { data, error } = await supabase.functions.invoke('subscription-billing', {
        body: { action: 'create', plan },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setHoaDon(data as HoaDon);
    } catch (e) {
      setLoi((e as Error)?.message ?? 'Không tạo được hoá đơn');
    } finally {
      setDangTao(false);
    }
  }, [plan]);

  useEffect(() => { void tao(); }, [tao]);

  // Vẽ QR sau khi có hoá đơn.
  useEffect(() => {
    if (!hoaDon || !canvasRef.current) return;
    try {
      const chuoi = taoChuoiVietQr({
        bankBin: hoaDon.bank.bin,
        accountNumber: hoaDon.bank.soTaiKhoan,
        amount: hoaDon.amount,
        addInfo: hoaDon.reference_code,
      });
      void QRCode.toCanvas(canvasRef.current, chuoi, { width: 240, margin: 1 });
    } catch (e) {
      // Dựng QR hỏng thì vẫn còn đường chuyển tay bên dưới — nói ra, không giấu.
      setLoi('Không dựng được mã QR: ' + ((e as Error)?.message ?? ''));
    }
  }, [hoaDon]);

  /*
   * Hỏi lại trạng thái mỗi 15 giây.
   *
   * Đối soát chạy phía máy chủ theo lịch, nên màn hình không biết lúc nào tiền
   * vào. Hỏi lại là cách đơn giản nhất và đủ tốt cho một thao tác người dùng
   * đang ngồi chờ. Dừng ngay khi đã trả, để không hỏi mãi một câu đã có đáp án.
   */
  useEffect(() => {
    if (!hoaDon) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from('subscription_invoices')
        .select('status')
        .eq('id', hoaDon.invoice_id)
        .maybeSingle();
      if (data?.status === 'paid') {
        clearInterval(t);
        toast.success('Đã nhận được thanh toán. Thuê bao đã kích hoạt.');
        onPaid?.();
      } else if (data?.status === 'underpaid' || data?.status === 'overpaid') {
        clearInterval(t);
        toast.warning(
          'Số tiền nhận được không khớp hoá đơn nên chưa kích hoạt tự động. ' +
            'Chúng tôi sẽ liên hệ với bạn.',
          { duration: 12000 },
        );
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [hoaDon, onPaid]);

  if (dangTao) {
    return (
      <div className="flex items-center gap-2 justify-center py-10 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo hoá đơn…
      </div>
    );
  }

  if (loi && !hoaDon) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive/[0.03] p-4">
        <p className="text-sm text-foreground">{loi}</p>
        <button onClick={() => void tao()} className="mt-3 text-sm text-primary hover:underline">
          Thử lại
        </button>
      </div>
    );
  }

  if (!hoaDon) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-5"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Gói {hoaDon.plan_name}</p>
        <p className="text-2xl font-bold tracking-tight mt-0.5">{formatVND(hoaDon.amount)}</p>
      </div>

      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-3">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Quét bằng ứng dụng ngân hàng — số tiền và nội dung đã điền sẵn.
      </p>

      <div className="rounded-xl bg-muted/40 px-4">
        <DongChep nhan="Ngân hàng" giaTri={hoaDon.bank.nganHang} icon={Landmark} />
        <DongChep nhan="Chủ tài khoản" giaTri={hoaDon.bank.chuTaiKhoan} icon={Building2} />
        <DongChep nhan="Số tài khoản" giaTri={hoaDon.bank.soTaiKhoan} icon={Hash} mono />
        <DongChep nhan="Nội dung chuyển khoản" giaTri={hoaDon.reference_code} icon={Hash} mono />
      </div>

      {/* Câu quan trọng nhất trên màn hình: sai nội dung là đối soát không khớp. */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Phải ghi đúng nội dung chuyển khoản</strong> —
        đó là thứ hệ thống dùng để nhận ra khoản tiền của bạn. Chuyển đúng số tiền,
        thuê bao kích hoạt tự động trong vài phút. Màn hình này tự cập nhật, bạn không
        cần làm gì thêm.
      </p>

      {/* Truyền `reference_code` chứ không phải id công ty: nó đã là khoá đối
          soát của đường chuyển khoản, nên một mã dùng chung cho cả hai đường
          thu tiền — không phải dựng thêm cách khớp thứ hai. */}
      <TheThe maThamChieu={hoaDon.reference_code} />
    </motion.div>
  );
}

/**
 * Lối trả bằng thẻ quốc tế, đặt DƯỚI đường chuyển khoản chứ không thay nó.
 *
 * Stripe không nhận merchant Việt Nam — đó là lý do đường Stripe cũ bị gỡ và
 * thay bằng VietQR (xem ghi chú đầu file). Lối này giữ cho hai việc: trình diễn
 * và khách nước ngoài trả bằng thẻ.
 *
 * Khi link đang ở chế độ thử, khối này NÓI RA. Một nút thu tiền ở chế độ thử mà
 * trông y hệt nút thật là loại lỗi im lặng tệ nhất.
 */
function TheThe({ maThamChieu }: { maThamChieu: string | null }) {
  const lk = duongDanMuaGoi(maThamChieu);
  if (!lk.bat || !lk.duongDan) return null;

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-start gap-3">
        <CreditCard size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Hoặc trả bằng thẻ quốc tế</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Visa, Mastercard qua Stripe. Dành cho khách ở nước ngoài.
          </p>

          {lk.cheDoThu && (
            <p className="mt-2 rounded-lg bg-mimi-amber/10 px-2.5 py-1.5 text-xs text-mimi-amber">
              <strong>Đang ở chế độ thử.</strong> Cổng này nhận thẻ test và không thu tiền
              thật — dùng để trình diễn. Muốn thu tiền thật thì thay bằng link chế độ live
              trong <code className="font-mono">lib/lienKetStripe.ts</code>.
            </p>
          )}

          {!maThamChieu && (
            <p className="mt-2 text-xs text-muted-foreground">
              Trả bằng đường này thì thuê bao chưa tự kích hoạt — cần đối chiếu tay.
            </p>
          )}

          <a
            href={lk.duongDan}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            Mở trang thanh toán <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
