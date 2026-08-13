import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, Shield, Loader2, RefreshCw, Unlink, AlertTriangle, Check, ArrowRight, QrCode, FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { track } from '@/lib/track';

/**
 * Linking a real bank account through Cas (BankHub).
 *
 * Kept apart from the six-bank grid in OpenBanking on purpose: that grid is the
 * demo path, with generated transactions, and it has to keep working for
 * judges and investors who have no bank account to connect. Mixing a real
 * credential flow into the same tiles would make it impossible to tell at a
 * glance which numbers on the dashboard came from a bank and which came from a
 * random number generator.
 */

const LINK_SCRIPT = 'https://cdn.bankhub.dev/link/v1/link-initialize.js';

/**
 * Bump this whenever the wording of the consent list below changes materially.
 * Consent is to a specific text, so a stored record that cannot say which text
 * was shown proves very little.
 */
const CONSENT_VERSION = '2026-08-11';

interface CasLinkConfig {
  redirectUri: string;
  iframe: boolean;
  grantToken: string;
  /**
   * Lowercase. Cas's docs table lists ENTERPRISE / PERSONAL / ALL, but the SDK
   * compares against {enterprise, personal, all} — and the guard that should
   * have rejected the mismatch is `if (n && !valid.includes(n) && valid.join(", "))`,
   * a comma expression with no throw. So "ALL" sailed through validation and
   * reached their page as an fiServiceType it does not recognise.
   */
  fiServiceType?: 'enterprise' | 'personal' | 'all';
  /**
   * Which product the link is for: 'qrpay' or 'kyc'.
   *
   * Leaving it out is what produced FI_SERVICE_NOT_FOUND on every attempt to
   * raise a QR. Cas Link opened in its default mode, the customer picked from
   * the full list of banks, and the one they picked does not sell QR Pay —
   * which nothing could reveal until the first /qr-pay call failed, long after
   * the linking screen had closed.
   *
   * Deliberately not set on the ordinary "link my bank" path: filtering to QR
   * Pay banks there would hide banks that are perfectly good for reading
   * statements, which is the product's main job.
   */
  feature?: 'kyc' | 'qrpay';
  /** Random per-attempt, returned intact on onSuccess and on the redirect. */
  state?: string;
  onSuccess?: (publicToken: string, state: string) => void;
  onExit?: () => void;
}

declare global {
  interface Window {
    BankHub?: { useBankHubLink: (config: CasLinkConfig) => { open: () => void } };
  }
}

export interface CasConnection {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string | null;
  status: string;
  last_synced_at: string | null;
  direction_convention: string | null;
}

/** Loads the Cas SDK once and resolves when `window.BankHub` is usable. */
function loadLinkScript(): Promise<void> {
  if (window.BankHub) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${LINK_SCRIPT}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Không tải được Cas Link')));
    });
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    // Cas require this be fetched from their CDN rather than bundled: the SDK
    // is unversioned and they ship fixes to it directly.
    el.src = LINK_SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Không tải được Cas Link'));
    document.head.appendChild(el);
  });
}

/** Show only the last four digits; the full number is not needed on screen. */
function maskAccount(n: string): string {
  return n.length <= 4 ? n : `•••• ${n.slice(-4)}`;
}

export default function CasLink({ onSynced }: { onSynced?: () => void }) {
  const { session } = useAuthStore();
  const [connections, setConnections] = useState<CasConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  // Which product the consent sheet was opened for; decides whether Cas Link
  // filters its bank list to the ones that sell QR Pay.
  /**
   * Which product the pending link is for.
   *
   * Was a boolean while there were two. Cas issues one grant per product —
   * `transaction` for statements, `qrpay` for receiving, `gdt` for the tax
   * authority — and each opens a different Cas Link screen, so the choice has
   * to travel all the way from the button to `exchange`.
   */
  const [linkFeature, setLinkFeature] = useState<'bank' | 'qrpay' | 'gdt'>('bank');
  // 'sandbox' unlocks the controls that deliberately break a connection.
  const [environment, setEnvironment] = useState<string | null>(null);
  // QR Pay only: the services Cas will actually accept, so the customer picks
  // from banks that sell the product instead of finding out afterwards.
  const [qrServices, setQrServices] = useState<Array<{ id: string; name: string; fiName?: string; type?: string; logo?: string }>>([]);
  const [chosenService, setChosenService] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  // Every origin that posted to this window during a link attempt. If the flow
  // stalls again, this is the evidence that says why — the previous three
  // attempts each ended with nothing on screen to reason from.
  const [seenOrigins, setSeenOrigins] = useState<string[]>([]);
  /**
   * Tokens already handed to `exchange`.
   *
   * Two paths now deliver the same publicToken — the SDK's onSuccess and our
   * own message listener — and they both fire. A publicToken is single use, so
   * the second exchange fails and overwrites a completed link with an error the
   * user has no way to act on: the account was stored, the screen said it was
   * not. Whichever path arrives first wins; the other is a no-op.
   */
  const handledTokens = useRef<Set<string>>(new Set());

  const call = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      if (!session) {
        toast.error('Vui lòng đăng nhập');
        return null;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        toast.error(result.error ?? `Lỗi ${res.status}`);
        return null;
      }
      return result;
    },
    [session]
  );

  const loadConnections = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    void call('env').then((r) => r?.environment && setEnvironment(r.environment));
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('bank_connections')
      // access_token_enc is deliberately absent. RLS lets the owner read their
      // own row, so anything selected here is reachable from the browser.
      .select('id, bank_name, account_number, account_name, status, last_synced_at, direction_convention')
      .eq('provider', 'bankhub')
      .order('created_at', { ascending: true });
    setConnections((data as CasConnection[] | null) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const runSync = useCallback(
    async (connectionId?: string) => {
      setSyncing(connectionId ?? 'all');
      const result = await call('sync', connectionId ? { connection_id: connectionId } : {});
      setSyncing(null);
      if (!result) return;

      const synced = (result.synced ?? []) as Array<{
        inserted?: number;
        fetched?: number;
        error?: string;
        needsRelink?: boolean;
      }>;
      const inserted = synced.reduce((s, r) => s + (r.inserted ?? 0), 0);
      const failed = synced.filter((r) => r.error);

      if (failed.some((r) => r.needsRelink)) {
        toast.error('Ngân hàng yêu cầu đăng nhập lại. Vui lòng liên kết lại tài khoản.');
      } else if (failed.length) {
        // Cas allows roughly one call per grant per minute and answers RATE_LIMIT
        // above that. Passing their English sentence straight through tells a
        // shop owner nothing about what to do, and the only useful action is to
        // wait — so say that instead.
        const msg = failed[0].error ?? '';
        toast.error(
          /rate limit/i.test(msg)
            ? 'Cas giới hạn số lần gọi. Chờ khoảng 1 phút rồi đồng bộ lại.'
            : `Đồng bộ lỗi: ${msg}`
        );
      } else {
        toast.success(
          inserted > 0 ? `Đã nhận ${inserted} giao dịch mới` : 'Đã đồng bộ, không có giao dịch mới'
        );
      }
      await loadConnections();
      onSynced?.();
    },
    [call, loadConnections, onSynced]
  );

  /** Exchange → store → first sync. Shared by the SDK callback and our listener. */
  // Set when a link attempt starts, read when its token comes back.
  const pendingFeature = useRef<'qrpay' | 'gdt' | undefined>(undefined);

  const completeLink = useCallback(
    async (publicToken: string) => {
      if (handledTokens.current.has(publicToken)) return;
      handledTokens.current.add(publicToken);
      setLastError(null);
      try {
        // Recorded either side of the exchange, because the gap between them is
        // exactly where people fall out of a bank-linking flow.
        const exchanged = await call('exchange', {
          publicToken,
          ...(pendingFeature.current ? { feature: pendingFeature.current } : {}),
        });
        if (exchanged) track('bank_link_succeeded', { feature: pendingFeature.current ?? 'bank' });
        if (!exchanged) {
          track('bank_link_failed', { feature: pendingFeature.current ?? 'bank' });
          setLastError('Không lưu được liên kết. Thử lại hoặc gửi ảnh màn hình này.');
          return;
        }
        toast.success(`Đã liên kết ${exchanged.accountCount} tài khoản`);
        await loadConnections();
        await runSync();
      } catch (e) {
        setLastError((e as Error)?.message ?? 'Lỗi không xác định khi lưu liên kết');
      } finally {
        setLinking(false);
      }
    },
    [call, loadConnections, runSync]
  );

  /**
   * Our own listener for the message Cas Link posts when the bank link
   * completes, running alongside the SDK's.
   *
   * The SDK ignores anything whose `event.origin` is not one of exactly three
   * hardcoded values — localhost:3000, dev.link.bankhub.dev, link.bankhub.dev —
   * and it calls closeIframe() *before* onSuccess. The iframe was staying open,
   * which means the message never got past that check, so onSuccess was never
   * reached. That rules out our callback failing and points at the origin.
   *
   * Rather than wait for the SDK to widen its list, accept any bankhub.dev
   * subdomain and do the work ourselves. Anything that arrives and does not
   * match is written to the panel with its origin, so a wrong guess here
   * produces evidence instead of another silent stall.
   */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      let host = '';
      try { host = new URL(e.origin).hostname; } catch { return; }
      setSeenOrigins((prev) => (prev.includes(e.origin) ? prev : [...prev, e.origin]));
      if (host !== 'bankhub.dev' && !host.endsWith('.bankhub.dev')) return;

      // The SDK requires a JSON *string*; be liberal and take an object too.
      let payload: { type?: string; data?: { publicToken?: string; loading?: boolean } } | null = null;
      try {
        payload = typeof e.data === 'string' ? JSON.parse(e.data) : (e.data as typeof payload);
      } catch {
        setLastError(`Cas gửi dữ liệu không đọc được từ ${e.origin}`);
        return;
      }
      if (!payload || typeof payload !== 'object') return;

      const token = payload.data?.publicToken;
      if (payload.type === 'credential' && token) {
        // Close it ourselves: the SDK only does so on the path it did not take.
        document.getElementById('bankhub-iframe')?.remove();
        void completeLink(token);
      } else if (payload.type === 'status') {
        document.getElementById('bankhub-iframe')?.remove();
        setLinking(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, loadConnections]);


  const startLink = useCallback(async (feature: 'bank' | 'qrpay' | 'gdt' = 'bank') => {
    setConsentOpen(false);
    setLinking(true);
    try {
      // Record the consent before anything else happens. Showing the wording
      // and then not storing it leaves nothing to demonstrate afterwards, which
      // is the part Nghị định 13/2023 actually asks for. The version string is
      // stored alongside so a later change to the wording does not silently
      // rewrite what people were shown when they agreed.
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLinking(false);
        toast.error('Vui lòng đăng nhập');
        return;
      }
      const { error: consentError } = await supabase
        .from('consents')
        .insert({
          user_id: user.id,
          // Names the data source actually being opened. A tax connection recorded
          // as bank consent would make the audit record say the wrong thing.
          kind: feature === 'gdt' ? 'tax_data' : 'bank_data',
          version: CONSENT_VERSION,
        });
      if (consentError) {
        setLinking(false);
        toast.error('Không ghi nhận được sự đồng ý, chưa thể liên kết');
        return;
      }

      await loadLinkScript();
      track('bank_link_started', { feature });
      pendingFeature.current = feature === 'bank' ? undefined : feature;
      const grant = await call(
        'create-token',
        feature === 'bank'
          ? {}
          : { feature, ...(chosenService ? { fi_service_id: chosenService } : {}) },
      );
      if (!grant?.grantToken) {
        setLinking(false);
        return;
      }
      if (!window.BankHub) throw new Error('Cas Link chưa sẵn sàng');

      const { open } = window.BankHub.useBankHubLink({
        grantToken: grant.grantToken,
        // Only when the customer asked to link for receiving QR payments.
        ...(feature === 'qrpay' ? { feature: 'qrpay' as const } : {}),
        // Comes from the server so it always matches the value the grant was
        // created with and the value registered in the Cas console.
        redirectUri: grant.redirectUri,
        iframe: true,
        fiServiceType: 'all',
        // Kept for the path where the SDK's own origin check does pass. Both
        // this and the message listener call completeLink; it de-duplicates by
        // token so the loser of the race does nothing.
        onSuccess: (publicToken: string) => { void completeLink(publicToken); },
        onExit: () => setLinking(false),
      });
      open();
    } catch (e) {
      setLinking(false);
      const msg = (e as Error)?.message ?? 'Lỗi không xác định';
      setLastError(msg);
      toast.error(msg);
    }
  }, [call, loadConnections, runSync, chosenService]);

  /**
   * Cas "Update Mode": re-authenticate a grant that stopped working.
   *
   * Deliberately not the same as linking again. A fresh link makes a new grant
   * and a new connection row, which loses `last_reference` and re-pulls a year
   * of statements. Update Mode keeps the connection, its id and its cursor, and
   * only asks the customer for whatever the bank now wants — a changed
   * password, a device check.
   */
  const updateLink = useCallback(
    async (connectionId: string) => {
      setLinking(true);
      try {
        await loadLinkScript();
        const grant = await call('update-token', { connection_id: connectionId });
        if (!grant) { setLinking(false); return; }

        if (grant.upToDate) {
          // FI_SERVICE_ACCOUNT_CONNECTING — the bank says nothing is wrong, so
          // the connection was parked on a stale error.
          toast.success(grant.message ?? 'Liên kết vẫn hoạt động');
          setLinking(false);
          await loadConnections();
          return;
        }
        if (!grant.grantToken) { setLinking(false); return; }
        if (!window.BankHub) throw new Error('Cas Link chưa sẵn sàng');

        pendingFeature.current =
          grant.scopes === 'qrpay' || grant.scopes === 'gdt' ? grant.scopes : undefined;
        const { open } = window.BankHub.useBankHubLink({
          grantToken: grant.grantToken,
          redirectUri: grant.redirectUri,
          iframe: true,
          ...(grant.scopes === 'qrpay' ? { feature: 'qrpay' as const } : {}),
          onSuccess: (publicToken: string) => { void completeLink(publicToken); },
          onExit: () => setLinking(false),
        });
        open();
      } catch (e) {
        setLinking(false);
        const msg = (e as Error)?.message ?? 'Lỗi không xác định';
        setLastError(msg);
        toast.error(msg);
      }
    },
    [call, completeLink, loadConnections],
  );

  /**
   * Put a sandbox grant into one of the three broken states Cas can simulate,
   * then sync so the app reacts exactly as it would to the real thing.
   *
   * This is how acceptance cases 5, 6 and 7 get evidence. They were recorded as
   * unstageable in the sandbox, which was wrong — Cas publishes an endpoint for
   * precisely this, and it had simply not been found.
   */
  const simulateBreak = useCallback(
    async (connectionId: string, errorCode: string) => {
      const res = await call('sandbox-reset-login', {
        connection_id: connectionId,
        error_code: errorCode,
      });
      if (!res) return;
      toast.success(`Đã giả lập ${errorCode}. Đang đồng bộ để xem app phản ứng…`);
      await runSync(connectionId);
      await loadConnections();
    },
    [call, runSync, loadConnections],
  );

  const disconnect = useCallback(
    async (connectionId: string) => {
      const result = await call('disconnect', { connection_id: connectionId });
      if (result) {
        toast.success('Đã ngắt liên kết');
        await loadConnections();
      }
    },
    [call, loadConnections]
  );

  const active = connections.filter((c) => c.status === 'connected');
  const needsRelink = connections.filter((c) => c.status === 'needs_relink');

  return (
    <div className="space-y-4">
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Landmark size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Tài khoản ngân hàng thật</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Liên kết qua Cas — đơn vị trung gian kết nối ngân hàng tại Việt Nam. Mimi chỉ
                đọc lịch sử giao dịch, không thể chuyển tiền.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {active.length > 0 && (
              <button
                onClick={() => runSync()}
                disabled={syncing !== null}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-border/60 text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                {syncing === 'all' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Đồng bộ
              </button>
            )}
            <button
              onClick={() => { setLinkFeature('bank'); setConsentOpen(true); }}
              disabled={linking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {linking ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
              {linking ? 'Đang liên kết…' : 'Liên kết ngân hàng'}
            </button>
            {/* Separate entry point, not a checkbox on the one above: it shows a
                different, shorter list of banks, and someone linking to read
                statements should not be steered away from a bank that suits
                them because it happens not to sell QR Pay. */}
            <button
              onClick={() => {
                setLinkFeature('qrpay');
                setChosenService(null);
                setConsentOpen(true);
                void call('fi-services', { feature: 'qrpay' }).then(
                  (r) => r?.services && setQrServices(r.services),
                );
              }}
              disabled={linking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <QrCode size={14} />
              Liên kết để nhận tiền QR
            </button>
            {/* Read-only. MIMI pulls the invoices the tax authority already
                holds so revenue stops being inferred from bank descriptions —
                it does not file anything. */}
            <button
              onClick={() => { setLinkFeature('gdt'); setConsentOpen(true); }}
              disabled={linking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <FileText size={14} />
              Kết nối Tổng Cục Thuế
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-muted-foreground" size={20} />
          </div>
        ) : connections.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/40">
            Chưa có tài khoản nào được liên kết. Điểm tín dụng bên dưới đang tính trên dữ liệu
            demo.
          </p>
        ) : (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
            {connections.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                  c.status === 'connected'
                    ? 'border-mimi-green/20 bg-mimi-green/5'
                    : 'border-amber-500/20 bg-amber-500/5'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {c.status === 'connected' ? (
                      <Check size={14} className="text-mimi-green shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    )}
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.account_name || c.bank_name} ·{' '}
                      <span className="font-mono">{maskAccount(c.account_number)}</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {c.status === 'needs_relink'
                      ? 'Ngân hàng yêu cầu đăng nhập lại'
                      : c.last_synced_at
                        ? `Đồng bộ lúc ${new Date(c.last_synced_at).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}`
                        : 'Chưa đồng bộ lần nào'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {environment === 'sandbox' && c.status === 'connected' && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) void simulateBreak(c.id, e.target.value);
                        e.target.value = '';
                      }}
                      defaultValue=""
                      className="text-[10px] rounded-lg border border-border bg-background px-1.5 py-1 text-muted-foreground"
                      aria-label="Giả lập lỗi (chỉ sandbox)"
                      title="Giả lập lỗi để kiểm thử — chỉ có trên sandbox"
                    >
                      <option value="">Giả lập lỗi…</option>
                      <option value="GRANT_LOGIN_REQUIRED">Đổi mật khẩu</option>
                      <option value="OTP_REQUIRED">Xác thực thiết bị</option>
                      <option value="PREVENTED">Chặn đăng nhập web</option>
                    </select>
                  )}
                  {c.status === 'needs_relink' && (
                    <button
                      onClick={() => void updateLink(c.id)}
                      disabled={linking}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {linking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Cập nhật
                    </button>
                  )}
                  {c.status === 'connected' && (
                    <button
                      onClick={() => runSync(c.id)}
                      disabled={syncing !== null}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                      aria-label="Đồng bộ tài khoản này"
                    >
                      {syncing === c.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => disconnect(c.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Ngắt liên kết"
                  >
                    <Unlink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shown only while a link attempt is in flight or has just failed —
            it is diagnostic, not something a working flow should ever display. */}
        {(lastError || (linking && seenOrigins.length > 0)) && seenOrigins.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            Origin nhận được: {seenOrigins.join(', ')}
          </p>
        )}

        {lastError && (
          <div className="mt-3 rounded-xl border border-mimi-red/25 bg-mimi-red/5 p-3">
            <p className="text-xs text-mimi-red font-medium">Liên kết chưa hoàn tất</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{lastError}</p>
          </div>
        )}

        {needsRelink.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
            Có {needsRelink.length} tài khoản cần xác thực lại để tiếp tục đồng bộ. Bấm
            "Cập nhật" ở tài khoản đó — bạn không phải liên kết lại từ đầu, lịch sử giao
            dịch đã tải về vẫn giữ nguyên.
          </p>
        )}
      </div>

      {/* Consent. Reading somebody's bank history is processing personal data,
          so what is collected and why is stated before the flow starts, not
          buried in a policy page. */}
      <AnimatePresence>
        {consentOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConsentOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Shield size={20} className="text-primary" />
                <p className="text-base font-semibold text-foreground">Trước khi liên kết</p>
              </div>

              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check size={15} className="text-mimi-green shrink-0 mt-0.5" />
                  <span>
                    Mimi đọc <strong className="text-foreground">lịch sử giao dịch 12 tháng</strong> và
                    tên chủ tài khoản, để chấm điểm tín dụng.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={15} className="text-mimi-green shrink-0 mt-0.5" />
                  <span>
                    Mimi <strong className="text-foreground">không thể chuyển tiền</strong> — quyền
                    truy cập chỉ ở mức đọc.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={15} className="text-mimi-green shrink-0 mt-0.5" />
                  <span>
                    Mimi <strong className="text-foreground">không xin quyền đọc CCCD</strong>, ngày
                    sinh hay địa chỉ của bạn — chỉ xin quyền giao dịch.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={15} className="text-mimi-green shrink-0 mt-0.5" />
                  <span>
                    Bạn nhập thông tin đăng nhập ngân hàng trên giao diện của Cas.{' '}
                    <strong className="text-foreground">Mimi không nhìn thấy mật khẩu</strong> của bạn.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={15} className="text-mimi-green shrink-0 mt-0.5" />
                  <span>
                    Bạn có thể ngắt liên kết bất cứ lúc nào; khi đó mã truy cập bị xoá khỏi hệ thống.
                  </span>
                </li>
              </ul>

              {linkFeature === 'qrpay' && qrServices.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-medium text-foreground mb-2">
                    Chọn ngân hàng nhận tiền ({qrServices.length} ngân hàng hỗ trợ QR)
                  </p>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                    {qrServices.map((svc) => (
                      <button
                        key={`${svc.id}-${svc.type}`}
                        onClick={() => setChosenService(svc.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                          chosenService === svc.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                        }`}
                      >
                        {svc.logo && <img src={svc.logo} alt="" className="w-5 h-5 rounded-full shrink-0" />}
                        <span className="truncate">
                          <span className="font-medium">{svc.fiName}</span>
                          <span className="text-muted-foreground"> · {svc.name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Bỏ qua cũng được — khi đó Cas Link sẽ hiện danh sách để bạn chọn.
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setConsentOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  onClick={() => void startLink(linkFeature)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Đồng ý và tiếp tục
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
