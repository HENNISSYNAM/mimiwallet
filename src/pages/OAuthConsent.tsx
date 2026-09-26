import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Thiếu mã yêu cầu cấp quyền.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("Máy chủ cấp quyền không trả về địa chỉ quay lại."); }
    window.location.href = target;
  }

  const name = details?.client?.name ?? "ứng dụng";
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
        {error ? (
          <p className="text-destructive text-sm">Không tải được yêu cầu cấp quyền: {error}</p>
        ) : !details ? (
          <div className="flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-foreground">Kết nối {name} với tài khoản của bạn</h1>
            <p className="text-sm text-muted-foreground">
              {name} sẽ được đọc doanh nghiệp, hoá đơn và giao dịch của bạn trong MIMI Wallet.
            </p>
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => decide(true)} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60">Cho phép</button>
              <button disabled={busy} onClick={() => decide(false)} className="flex-1 rounded-lg border border-border py-2 text-sm disabled:opacity-60">Từ chối</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
