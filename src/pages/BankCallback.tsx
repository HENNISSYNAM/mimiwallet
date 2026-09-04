import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { consumeLinkState, consumeLinkFeature } from '@/components/fintech/CasLink';

/**
 * Where Cas Link lands after a successful bank link.
 *
 * Cas documents two ways of returning the publicToken: an `onSuccess` callback
 * in popup mode, and a redirect to `redirectUri` with the token on the query
 * string. We asked for popup mode and relied on the callback — but the callback
 * was not firing, the dialog stayed on screen, and the grant existed at Cas
 * while nothing reached us. Whatever the SDK is doing, `redirectUri` is a
 * registered URL it is entitled to navigate to, and until now this app had no
 * route there at all, so that path could only ever dead-end.
 *
 * Handling both costs one small page and removes a whole class of "it said
 * success but nothing happened".
 *
 * This is also the actual CSRF surface in the whole bank-link flow, and the
 * one place `state` is checked without exception. This page reacts to nothing
 * but a URL — no popup, no interaction with Cas required. An attacker signs
 * into MIMI as themselves, links their own bank, and is handed a publicToken
 * bound to their own grant; that URL, sent to a signed-in victim, would make
 * the victim's own browser exchange it under the victim's JWT, attaching the
 * attacker's bank grant to the victim's company. `state` is minted in
 * sessionStorage before Cas Link ever opens (see CasLink.tsx) and is checked
 * here before anything is exchanged — an attacker crafting the URL themselves
 * has no way to know the victim's stored value.
 */
export default function BankCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [detail, setDetail] = useState('');
  // The token is single use. React 18 mounts effects twice in development, and
  // a second exchange of a spent token would fail and overwrite a success.
  const started = useRef(false);

  useEffect(() => {
    const publicToken = params.get('publicToken') ?? params.get('public_token');
    if (!publicToken) {
      setState('error');
      setDetail('Không tìm thấy publicToken trong đường dẫn trả về.');
      return;
    }
    if (!session) return; // wait for the store to settle
    if (started.current) return;
    started.current = true;

    // Checked, and consumed, before anything downstream ever sees the token.
    // No match means either this link was never started from this browser —
    // exactly the CSRF shape described above — or the tab was closed and
    // reopened, losing sessionStorage. Both get the same safe refusal; this
    // page cannot tell the two apart, and does not need to.
    const returnedState = params.get('state');
    if (!consumeLinkState(returnedState)) {
      setState('error');
      setDetail(
        'Phiên liên kết không khớp trình duyệt này. Nếu bạn không tự bắt đầu liên kết ngân hàng, hãy bỏ qua trang này.',
      );
      return;
    }

    (async () => {
      try {
        const post = (action: string, body: unknown = {}) =>
          fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=${action}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              apikey: SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(body),
          }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }));

        /*
         * `feature` phai di cung publicToken, neu khong lien ket QR hoan tat qua
         * duong chuyen huong nay se bi luu voi `scopes='transaction'` mac dinh
         * va `create-qr` vinh vien khong thay no — mot loi im lang: man hinh bao
         * thanh cong, roi QR bao "chua co tai khoan nao".
         *
         * Duong iframe giu `feature` trong bien component; trang nay la URL moi
         * nen phai lay lai tu sessionStorage.
         */
        const feature = consumeLinkFeature();
        const ex = await post('exchange', feature ? { publicToken, feature } : { publicToken });
        if (!ex.ok || ex.body?.error) {
          setState('error');
          setDetail(ex.body?.error ?? `Lỗi ${'' + ex.ok}`);
          return;
        }
        // Pull history straight away so the dashboard has something to show
        // when they arrive; a failure here is not fatal to the link itself.
        await post('sync').catch(() => undefined);
        setState('done');
        setTimeout(() => navigate('/dashboard/fintech'), 1200);
      } catch (e) {
        setState('error');
        setDetail((e as Error)?.message ?? 'Lỗi không xác định');
      }
    })();
  }, [params, session, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card-base p-8 w-full max-w-sm text-center">
        {state === 'working' && (
          <>
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={30} />
            <p className="text-sm text-foreground font-medium">Đang lưu liên kết ngân hàng…</p>
            <p className="text-xs text-muted-foreground mt-1">Vui lòng không đóng cửa sổ này.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <CheckCircle2 className="text-mimi-green mx-auto mb-4" size={30} />
            <p className="text-sm text-foreground font-medium">Đã liên kết xong</p>
            <p className="text-xs text-muted-foreground mt-1">Đang đưa bạn về Fintech Hub…</p>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertTriangle className="text-mimi-red mx-auto mb-4" size={30} />
            <p className="text-sm text-foreground font-medium">Chưa lưu được liên kết</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{detail}</p>
            <button
              onClick={() => navigate('/dashboard/fintech')}
              className="text-xs text-primary hover:underline font-medium mt-4 inline-flex items-center gap-1"
            >
              Về Fintech Hub <ArrowRight size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
