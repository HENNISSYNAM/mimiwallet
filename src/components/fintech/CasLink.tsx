import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, Shield, Loader2, RefreshCw, Unlink, AlertTriangle, Check, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';

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
  fiServiceType?: 'ENTERPRISE' | 'PERSONAL' | 'ALL';
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
        toast.error(`Đồng bộ lỗi: ${failed[0].error}`);
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

  const startLink = useCallback(async () => {
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
        .insert({ user_id: user.id, kind: 'bank_data', version: CONSENT_VERSION });
      if (consentError) {
        setLinking(false);
        toast.error('Không ghi nhận được sự đồng ý, chưa thể liên kết');
        return;
      }

      await loadLinkScript();
      const grant = await call('create-token');
      if (!grant?.grantToken) {
        setLinking(false);
        return;
      }
      if (!window.BankHub) throw new Error('Cas Link chưa sẵn sàng');

      const { open } = window.BankHub.useBankHubLink({
        grantToken: grant.grantToken,
        // Comes from the server so it always matches the value the grant was
        // created with and the value registered in the Cas console.
        redirectUri: grant.redirectUri,
        iframe: true,
        fiServiceType: 'ALL',
        onSuccess: async (publicToken: string) => {
          // The publicToken is single use and short-lived, so it is exchanged
          // server-side straight away; it never gets stored in the browser.
          const exchanged = await call('exchange', { publicToken });
          setLinking(false);
          if (!exchanged) return;
          toast.success(`Đã liên kết ${exchanged.accountCount} tài khoản`);
          await loadConnections();
          // First sync pulls twelve months, which is what the scoring model
          // reads — so the account is scoreable the moment it is linked.
          await runSync();
        },
        onExit: () => setLinking(false),
      });
      open();
    } catch (e) {
      setLinking(false);
      toast.error((e as Error).message);
    }
  }, [call, loadConnections, runSync]);

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
              onClick={() => setConsentOpen(true)}
              disabled={linking}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {linking ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
              {linking ? 'Đang liên kết…' : 'Liên kết ngân hàng'}
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

        {needsRelink.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
            Có {needsRelink.length} tài khoản cần liên kết lại để tiếp tục đồng bộ.
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

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setConsentOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  onClick={startLink}
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
