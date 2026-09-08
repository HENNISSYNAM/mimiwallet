import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/track';
import { taoChuoiVietQr } from '@/lib/vietqr';

/**
 * Mã QR nhận tiền thẳng vào tài khoản ngân hàng của chủ shop.
 *
 * HAI ĐƯỜNG, VÀ MÁY CHỦ CHỌN ĐƯỜNG — KHÔNG PHẢI MÀN HÌNH NÀY.
 *
 *  Cas QR Pay  Cas cấp mã kèm một **tài khoản định danh dùng một lần**. Tiền
 *              vào tài khoản đó là trả cho mã đó, không phụ thuộc khách gõ gì
 *              vào nội dung chuyển khoản. Chắc hơn, nên được ưu tiên.
 *  VietQR      Máy chủ chỉ trả về mã BIN, số tài khoản và mã tham chiếu; chuỗi
 *              QR dựng ngay tại đây bằng `taoChuoiVietQr`. Khớp bằng mã tham
 *              chiếu nằm trong nội dung chuyển khoản, do SePay đẩy sang.
 *
 * VÌ SAO CÓ ĐƯỜNG THỨ HAI. Đến 08/09/2026 màn hình này báo đỏ "Chưa có tài
 * khoản ngân hàng nào được liên kết để nhận tiền QR" cho mọi người chưa có
 * grant Cas — trong khi VietQR là chuẩn mở và `lib/vietqr.ts` đã dựng được
 * chuỗi đó từ lâu, không cần quyền gì của ai. Nút thu tiền chết hai tuần vì
 * một giả định, không vì một giới hạn kỹ thuật.
 *
 * `reference_number` VẪN DO MÁY CHỦ SINH trên cả hai đường. Nó là thứ đánh dấu
 * hoá đơn nào đã thu, nên trình duyệt không được chọn nó. Cái trình duyệt làm
 * ở đây chỉ là **vẽ lại** những gì máy chủ đã ghi vào cơ sở dữ liệu.
 */

interface QrPayment {
  id: string;
  reference_number: string;
  amount: number;
  description: string;
  account_number: string | null;
  virtual_account_number: string | null;
  bin: string | null;
  qr_code: string | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: raise a QR against an invoice so paying it closes the invoice. */
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  description: string;
  /** Called once the payment is confirmed, so the caller can refresh. */
  onPaid?: () => void;
}

const dong = (n: number) => `₫${n.toLocaleString('vi-VN')}`;

export function QrPayDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  amount,
  description,
  onPaid,
}: Props) {
  const { toast } = useToast();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<QrPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remedy, setRemedy] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  // Chỉ để hiển thị. Người trả tiền cần đối chiếu tên ngân hàng và tên chủ tài
  // khoản với thứ app ngân hàng hiện lên sau khi quét — đó là cách duy nhất họ
  // tự kiểm được rằng mã trỏ đúng chỗ.
  const [nganHang, setNganHang] = useState<string | null>(null);
  const [chuTaiKhoan, setChuTaiKhoan] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // React 18 mounts effects twice in development; without this the dialog would
  // raise two QRs for one invoice and only one of them could ever be paid.
  const requested = useRef(false);

  const create = useCallback(async () => {
    if (!session) {
      setError('Vui lòng đăng nhập.');
      return;
    }
    setLoading(true);
    setError(null);
    setRemedy(null);
    setRequestId(null);
    try {
      /*
       * Raw fetch, not `supabase.functions.invoke`.
       *
       * invoke throws a generic "Edge Function returned a non-2xx status code"
       * for anything outside 2xx and keeps the response body out of reach, so
       * the one message worth showing — that this link predates QR and needs
       * redoing — never reached the screen. CasLink already calls this function
       * the same way for the same reason.
       */
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=create-qr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ amount, description, invoice_id: invoiceId ?? null }),
      });
      const result = await res.json();

      if (!res.ok || result?.error) {
        // Cas's own wording, plus the code, so a support ticket has something
        // to quote. The remedy comes from the server's documented code table —
        // never from this component guessing at a cause.
        setError(
          [result?.error ?? `Lỗi ${res.status}`, result?.errorCode && `(${result.errorCode})`]
            .filter(Boolean)
            .join(' '),
        );
        // `detail` nói ra HÌNH DẠNG của cái sai — tìm thấy mấy dòng, ở công ty
        // nào, trạng thái gì. Không hiện nó ra thì người dùng chỉ đọc được câu
        // chung và phải đoán, đúng chỗ đã mất hai ngày ở phía Cas.
        setRemedy(
          [result?.detail, result?.remedy].filter(Boolean).join('

') || null,
        );
        setRequestId(result?.requestId ?? null);
        return;
      }
      track('qr_created', { fromInvoice: !!invoiceId, nguon: result.nguon ?? 'cas' });
      setQr(result.qr as QrPayment);
      setNganHang(typeof result.nganHang === 'string' ? result.nganHang : null);
      setChuTaiKhoan(typeof result.chuTaiKhoan === 'string' ? result.chuTaiKhoan : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được mã QR');
    } finally {
      setLoading(false);
    }
  }, [amount, description, invoiceId, session]);

  useEffect(() => {
    if (!open) {
      requested.current = false;
      setQr(null);
      setError(null);
      setRemedy(null);
      setRequestId(null);
      setNganHang(null);
      setChuTaiKhoan(null);
      return;
    }
    if (requested.current) return;
    requested.current = true;
    void create();
  }, [open, create]);

  /*
   * Ba nguồn cho một canvas.
   *
   *  1. Cas trả về ảnh sẵn (`data:image`) — thẻ <img> ở dưới lo, không vẽ ở đây.
   *  2. Cas trả về chuỗi payload — vẽ chuỗi đó.
   *  3. Không có `qr_code`: máy chủ đi đường VietQR và chỉ đưa BIN + số tài
   *     khoản. Dựng chuỗi tại chỗ bằng `taoChuoiVietQr`.
   *
   * Nội dung chuyển khoản đặt đúng bằng `reference_number`, không phải
   * `description`. Đó là chuỗi `reconcileCompanyQr` so bằng phép bằng chính
   * xác; gắn nhầm mô tả vào đây là tiền về mà hoá đơn không đóng.
   */
  useEffect(() => {
    if (!qr || !canvasRef.current) return;

    let payload = qr.qr_code;
    if (payload?.startsWith('data:image')) return;

    if (!payload) {
      if (!qr.bin || !qr.account_number) return;
      try {
        payload = taoChuoiVietQr({
          bankBin: qr.bin,
          accountNumber: qr.account_number,
          amount: qr.amount,
          addInfo: qr.reference_number,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không dựng được mã VietQR.');
        return;
      }
    }

    QRCode.toCanvas(canvasRef.current, payload, { width: 240, margin: 1 }, (e) => {
      if (e) setError('Không vẽ được mã QR.');
    });
  }, [qr]);

  // Poll while the dialog is open. The webhook does the real work — this only
  // notices that it happened.
  useEffect(() => {
    if (!open || !qr?.id || qr.status === 'paid') return;
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from('qr_payments')
        .select('id, status')
        .eq('id', qr.id)
        .maybeSingle();
      if (data?.status === 'paid') {
        setQr((prev) => (prev ? { ...prev, status: 'paid' } : prev));
        track('qr_paid', {});
        toast({ title: 'Đã nhận thanh toán', description: dong(amount) });
        onPaid?.();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [open, qr?.id, qr?.status, amount, onPaid, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nhận tiền bằng QR</DialogTitle>
          <DialogDescription>
            {invoiceNumber ? `Hoá đơn ${invoiceNumber} · ` : ''}
            {dong(amount)}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Đang tạo mã QR…</p>
        )}

        {!loading && error && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-destructive">{error}</p>
            {remedy && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{remedy}</p>
            )}
            {requestId && (
              <p className="font-mono text-xs text-muted-foreground">requestId {requestId}</p>
            )}
            <Button variant="outline" size="sm" onClick={() => void create()}>
              Thử lại
            </Button>
          </div>
        )}

        {!loading && qr && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-lg bg-white p-4">
              {qr.qr_code?.startsWith('data:image') ? (
                <img src={qr.qr_code} alt="Mã QR thanh toán" className="h-60 w-60" />
              ) : (
                <canvas ref={canvasRef} />
              )}
            </div>

            {qr.virtual_account_number ? (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-muted-foreground">Hoặc chuyển khoản tới</p>
                <p className="font-mono font-medium">{qr.virtual_account_number}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tài khoản riêng cho lần thu này, nên tiền về là khớp đúng hoá đơn — không
                  cần ghi nội dung chuyển khoản.
                </p>
              </div>
            ) : (
              qr.account_number && (
                /*
                 * Đường VietQR: không có tài khoản định danh, nên **nội dung
                 * chuyển khoản là thứ duy nhất** nối khoản tiền với hoá đơn
                 * này. Mã QR đã nhét sẵn nội dung đó, nên khách quét mã thì
                 * không phải gõ gì. Khối này dành cho người chuyển tay.
                 */
                <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Hoặc chuyển khoản tới</p>
                    <p className="font-mono font-medium">{qr.account_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {[nganHang, chuTaiKhoan].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nội dung chuyển khoản</p>
                    <p className="font-mono text-base font-semibold tracking-wide">
                      {qr.reference_number}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gõ đúng chuỗi này thì hoá đơn tự chuyển sang đã thu. Gõ thiếu hoặc
                      thừa chữ thì tiền vẫn về tài khoản, chỉ là phải đối chiếu tay.
                    </p>
                  </div>
                </div>
              )
            )}

            <p
              className={
                qr.status === 'paid'
                  ? 'text-center text-sm font-medium text-primary'
                  : 'text-center text-sm text-muted-foreground'
              }
            >
              {qr.status === 'paid' ? 'Đã nhận thanh toán' : 'Đang chờ thanh toán…'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
