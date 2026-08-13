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

/**
 * Raise a QR that settles straight into the linked bank account.
 *
 * The QR is created by the edge function, never here: it is only valid because
 * Cas issued it, and its `reference_number` is what later marks the invoice
 * paid. A code the browser made up would take real money that nothing could
 * reconcile.
 */

interface QrPayment {
  id: string;
  reference_number: string;
  amount: number;
  description: string;
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
  const [needsRelink, setNeedsRelink] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
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
    setNeedsRelink(false);
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

      if (result?.code === 'QRPAY_SCOPE_MISSING') {
        setNeedsRelink(true);
        // Cas's own wording, plus the code, so a support ticket has something
        // to quote and so a cause I did not anticipate is still visible.
        setError(
          [result.error, result.errorCode && `(${result.errorCode})`].filter(Boolean).join(' '),
        );
        setRequestId(result.requestId ?? null);
        return;
      }
      if (!res.ok || result?.error) {
        setError(result?.error ?? `Lỗi ${res.status}`);
        return;
      }
      setQr(result.qr as QrPayment);
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
      setNeedsRelink(false);
      return;
    }
    if (requested.current) return;
    requested.current = true;
    void create();
  }, [open, create]);

  // Cas may hand back either a VietQR payload string or a ready-made image, and
  // which one is not documented. Drawing the payload ourselves covers the first
  // case; an image URL is passed straight through below.
  useEffect(() => {
    const payload = qr?.qr_code;
    if (!payload || payload.startsWith('data:image') || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, payload, { width: 240, margin: 1 }, (e) => {
      if (e) setError('Không vẽ được mã QR từ dữ liệu Cas trả về.');
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
            {needsRelink ? (
              <p className="text-sm text-muted-foreground">
                Dòng đỏ ở trên là câu trả lời của Cas. Hai nguyên nhân hay gặp: ngân hàng
                đã liên kết không hỗ trợ QR-Pay — hãy liên kết thêm một ngân hàng khác — hoặc
                liên kết được tạo trước khi có tính năng QR, khi đó vào{' '}
                <span className="font-medium">Ngân hàng</span> liên kết lại là xong.
                {requestId && (
                  <span className="mt-1 block font-mono text-xs">requestId {requestId}</span>
                )}
              </p>
            ) : (
              <Button variant="outline" size="sm" onClick={() => void create()}>
                Thử lại
              </Button>
            )}
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

            {qr.virtual_account_number && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-muted-foreground">Hoặc chuyển khoản tới</p>
                <p className="font-mono font-medium">{qr.virtual_account_number}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tài khoản riêng cho lần thu này, nên tiền về là khớp đúng hoá đơn — không
                  cần ghi nội dung chuyển khoản.
                </p>
              </div>
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
