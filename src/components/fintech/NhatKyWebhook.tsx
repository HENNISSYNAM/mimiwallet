import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Radio, Eraser } from 'lucide-react';
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

/**
 * Đổi UUID trong ghi chú thành tên đọc được.
 *
 * `cas-webhook` ghi `<connection id>:alive+0`. Cái UUID đó là câu trả lời quan
 * trọng nhất trong cả nhật ký — nó cho biết webhook chạm vào liên kết đọc sao
 * kê hay liên kết nhận tiền QR, mà hai cái dẫn tới hai kết luận trái ngược.
 * Để nguyên 36 ký tự hex thì câu trả lời có mặt nhưng không ai đọc được.
 *
 * Không tra được thì giữ nguyên chuỗi gốc: một UUID lạ vẫn hơn một chỗ trống,
 * vì nó còn tra tay được.
 */
function docGhiChu(note: string | null, ten: Record<string, string>): string {
  if (!note) return '—';
  return note.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    (id) => ten[id] ?? id);
}

export function NhatKyWebhook() {
  const { session } = useAuthStore();
  const [mo, setMo] = useState(false);
  const [dsach, setDsach] = useState<SuKien[] | null>(null);
  const [tenLienKet, setTenLienKet] = useState<Record<string, string>>({});
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangDon, setDangDon] = useState(false);
  const [ketQuaDon, setKetQuaDon] = useState<string | null>(null);

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
      setTenLienKet((kq.tenLienKet ?? {}) as Record<string, string>);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Không đọc được nhật ký');
    } finally {
      setDangTai(false);
    }
  }, [session]);

  useEffect(() => {
    if (mo && dsach === null) void tai();
  }, [mo, dsach, tai]);

  /*
   * Thu hồi grant cũ ở phía Cas.
   *
   * Nút này tồn tại vì một lỗi cụ thể: đoạn tự-ngắt ngày 04/09 đánh dấu liên
   * kết đã ngắt mà không gọi `/grant/remove`, nên grant vẫn sống bên Casso và
   * họ gửi webhook mãi. Quan trọng hơn tiếng ồn: quyền truy cập tài khoản ngân
   * hàng của khách vẫn còn hiệu lực mà không ai quản.
   */
  const donGrant = useCallback(async () => {
    if (!session?.access_token) return;
    setDangDon(true);
    setKetQuaDon(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=thu-hoi-grant-cu`, {
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
      // Ba con số tách bạch, không gộp thành "đã dọn xong".
      const ten = (kq.conLai ?? []) as string[];
      setKetQuaDon(
        `Thu hồi được ${kq.thuHoiDuoc}. Hỏng ${kq.hong}.` +
        (kq.khongConToken
          ? ` Còn ${kq.khongConToken} liên kết đã mất token, không thu hồi được từ đây` +
            (ten.length ? ` — ${ten.join('; ')}` : '') +
            '. Cần Casso gỡ hộ, hoặc khách thu hồi trong app Cas ID.'
          : ' Không còn liên kết nào cần thu hồi.'),
      );
      void tai();
    } catch (e) {
      setKetQuaDon(e instanceof Error ? e.message : 'Không thu hồi được');
    } finally {
      setDangDon(false);
    }
  }, [session, tai]);

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
Xem ngân hàng đã báo gì tới và MIMI xử lý ra sao
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
              Mọi thông báo <strong className="text-foreground">gửi tới</strong> trong 30 ngày qua —
              từ Casso và từ SePay — kể cả những cái bị bỏ qua. Bấm Đồng bộ không tạo dòng ở
              đây: đó là chiều mình gọi ra, không phải chiều bên kia đẩy vào.
            </p>
            <button
              onClick={() => void tai()}
              disabled={dangTai}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs disabled:opacity-50"
            >
              <RefreshCw size={12} className={dangTai ? 'animate-spin' : ''} /> Tải lại
            </button>
          </div>

          <div className="mb-3 rounded-xl border border-border/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Liên kết đã ngắt mà chưa thu hồi ở Casso vẫn nhận webhook, và quyền đọc tài
                khoản ngân hàng vẫn còn hiệu lực.
              </p>
              <button
                onClick={() => void donGrant()}
                disabled={dangDon}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs disabled:opacity-50"
              >
                <Eraser size={12} className={dangDon ? 'animate-pulse' : ''} /> Thu hồi grant cũ
              </button>
            </div>
            {ketQuaDon && <p className="mt-2 text-xs text-foreground/80">{ketQuaDon}</p>}
          </div>

          {loi && <p className="text-sm text-destructive">{loi}</p>}

          {!loi && dsach !== null && dsach.length === 0 && (
            /*
             * Danh sách rỗng là một câu trả lời, không phải một chỗ trống. Nói
             * thẳng nó nghĩa là gì để người đọc biết phải đi hỏi ai tiếp.
             */
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Chưa có envelope nào trong 30 ngày qua.</p>
              {/*
                KHÔNG KẾT LUẬN HỘ. Bản đầu của câu này viết thẳng "nghĩa là Casso
                chưa đẩy sự kiện sang" — một suy luận vượt quá dữ liệu, và nguy
                hiểm vì nó được dùng để đi nói với đối tác. Bảng trống chỉ nói
                được đúng một điều: không có gì được ghi lại. Vì sao thì còn ít
                nhất ba khả năng, và người đọc phải thấy cả ba.
              */}
              <p>Có ba khả năng, chưa loại trừ được cái nào chỉ bằng màn hình này:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Casso chưa đẩy sự kiện sang.</li>
                <li>
                  Có đẩy nhưng không tới được endpoint — sai khoá, sai đường dẫn, hoặc bị chặn
                  trước khi vào tới đây.
                </li>
                <li>Sự kiện xảy ra trước 30 ngày.</li>
              </ul>
              <p>
                Muốn phân biệt thì đối chiếu với <strong className="text-foreground">Logs</strong> trong
                console Casso: nếu bên đó có bản ghi gửi đi mà bên này trống, vấn đề nằm ở đường
                truyền chứ không ở việc họ có gửi hay không.
              </p>
            </div>
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
                      <td className="px-1 py-2 text-muted-foreground">{docGhiChu(e.note, tenLienKet)}</td>
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
