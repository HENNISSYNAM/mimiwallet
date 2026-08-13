import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
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
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<QrPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsRelink, setNeedsRelink] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // React 18 mounts effects twice in development; without this the dialog would
  // raise two QRs for one invoice and only one of them could ever be paid.
  const requested = useRef(false);

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsRelink(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'bank-link?action=create-qr',
        { body: { amount, description, invoice_id: invoiceId ?? null } },
      );
      if (fnError) throw fnError;
      if (data?.code === 'QRPAY_SCOPE_MISSING') {
        setNeedsRelink(true);
        setError(data.error);
        return;
      }
      if (data?.error) throw new Error(data.error);
      setQr(data.qr as QrPayment);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không tạo được mã QR';
      // The scope error arrives as a 409 body rather than a thrown error on
      // some transports, so it is checked in both places.
      if (message.includes('QRPAY_SCOPE_MISSING') || message.includes('liên kết lại')) {
        setNeedsRelink(true);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [amount, description, invoiceId]);

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
                Liên kết ngân hàng hiện tại được tạo trước khi có tính năng QR nên chưa đủ
                quyền. Vào <span className="font-medium">Ngân hàng</span> và liên kết lại là
                dùng được.
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
