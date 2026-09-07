import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Radio } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';

/**
 * Nhật ký webhook — Casso có gửi gì tới không, và MIMI làm gì với nó.
 *
 * VÌ SAO CÓ MẶT TRONG SẢN PHẨM chứ không phải một truy vấn chạy tay: ngày
 * 06/09/2026, khi mã QR đã phát và tiền đã về mà thuê bao không kích hoạt,
 * không ai — kể cả chủ tài khoản — nhìn được bảng `webhook_events` để biết hook
 * có tới hay không. Bảng bật RLS mà không có policy nào, nên chỉ service-role
 * đọc được.
 *
 * Hậu quả cụ thể: mình báo với Casso là "không nhận được hook", trong khi
 * `cas-webhook` có một dòng ném bỏ mọi envelope thiếu `grantId` và ghi
 * "ignored: no grant id in payload" vào đúng cái bảng không ai đọc được. Một
 * vòng trao đổi mất đi vì thiếu một màn hình.
 *
 * Nên khối này trả lời đúng một câu, và trả lời bằng dữ liệu chứ không bằng suy
 * đoán: **envelope nào đã tới, và MIMI xử lý ra sao.**
 *
 * MẶC ĐỊNH ĐÓNG. Đây là công cụ chẩn đoán, không phải thứ chủ doanh nghiệp cần
 * thấy mỗi ngày — nhưng khi cần thì phải có sẵn, không phải đi nhờ người viết mã.
 */

interface SuKien {
  id: string;
  received_at: string;
  event_type: string | null;
  event_code: string | null;
  grant_id: string | null;
  outcome: string | null;
  note: string | null;
}

const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

/** Màu theo kết quả xử lý. `ignored` không phải lỗi, nhưng là thứ cần để ý. */
function mauKetQua(outcome: string | null): string {
  if (outcome === 'verified') return 'bg-mimi-green/12 text-mimi-green';
  if (outcome === 'ignored') return 'bg-mimi-amber/12 text-mimi-amber';
  if (outcome === 'received') return 'bg-muted text-muted-foreground';
  return 'bg-destructive/12 text-destructive';
}

export function NhatKyWebhook() {
  const { session } = useAuthStore();
  const [mo, setMo] = useState(false);
  const [dsach, setDsach] = useState<SuKien[] | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    if (!session?.access_token) return;
    setDangTai(true);
    setLoi(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=webhook-log`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: '{}',
      });
      const kq = await res.json();
      if (!res.ok || kq?.error) throw new Error(kq?.error ?? `Lỗi ${res.status}`);
      setDsach((kq.events ?? []) as SuKien[]);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Không đọc được nhật ký');
    } finally {
      setDangTai(false);
    }
  }, [session]);

  useEffect(() => {
    if (mo && dsach === null) void tai();
  }, [mo, dsach, tai]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40">
      <button
        onClick={() => setMo((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Radio size={15} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Nhật ký webhook từ ngân hàng</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Xem Casso đã gửi gì tới và MIMI xử lý ra sao
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${mo ? 'rotate-180' : ''}`}
        />
      </button>

      {mo && (
        <div className="border-t border-border/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Envelope thuộc liên kết của bạn, cộng envelope không có mã grant trong 24 giờ qua.
            </p>
            <button
              onClick={() => void tai()}
              disabled={dangTai}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs disabled:opacity-50"
            >
              <RefreshCw size={12} className={dangTai ? 'animate-spin' : ''} /> Tải lại
            </button>
          </div>

          {loi && <p className="text-sm text-destructive">{loi}</p>}

          {!loi && dsach !== null && dsach.length === 0 && (
            /*
             * Danh sách rỗng là một câu trả lời, không phải một chỗ trống. Nói
             * thẳng nó nghĩa là gì để người đọc biết phải đi hỏi ai tiếp.
             */
            <p className="text-sm text-muted-foreground">
              Chưa có envelope nào. Nếu bạn vừa nhận tiền qua mã QR mà ở đây trống, nghĩa là
              Casso chưa đẩy sự kiện sang — đây là lúc hỏi phía Casso, không phải lỗi cấu hình
              bên mình.
            </p>
          )}

          {!loi && dsach && dsach.length > 0 && (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-1 pb-2 font-medium">Lúc</th>
                    <th className="px-1 pb-2 font-medium">Loại</th>
                    <th className="px-1 pb-2 font-medium">Mã</th>
                    <th className="px-1 pb-2 font-medium">Kết quả</th>
                    <th className="px-1 pb-2 font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {dsach.map((e) => (
                    <tr key={e.id} className="border-t border-border/40">
                      <td className="whitespace-nowrap px-1 py-2 font-mono text-muted-foreground">
                        {gio(e.received_at)}
                      </td>
                      <td className="px-1 py-2 font-mono">{e.event_type ?? '—'}</td>
                      <td className="px-1 py-2 font-mono text-muted-foreground">
                        {e.event_code ?? '—'}
                      </td>
                      <td className="px-1 py-2">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${mauKetQua(e.outcome)}`}>
                          {e.outcome ?? '—'}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-muted-foreground">{e.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
