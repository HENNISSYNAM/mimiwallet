/**
 * Client for the Cas (formerly BankHub) aggregator API.
 *
 * Vietnam has no PSD2-style open banking, so a bank's transaction history can
 * only be reached through an aggregator. Cas issues a per-customer grant:
 *
 *   POST /grant/token   → grantToken (30 minutes, single use)
 *      ↓  customer authorises inside Cas Link, we receive publicToken
 *   POST /grant/exchange → accessToken + grantId (no expiry)
 *      ↓
 *   GET  /transactions   with Authorization: <accessToken>
 *
 * Only the last step is repeated. The accessToken is a standing credential for
 * somebody's bank account, which is why callers store it encrypted and never
 * return it to the browser.
 *
 * Contract verified against https://cas.so/general/api on 2026-08-11.
 */

const API_VERSION = '2023-01-01';

export interface BankhubConfig {
  clientId: string;
  secretKey: string;
  /** Sandbox unless explicitly switched; see `bankhubConfigFromEnv`. */
  baseUrl: string;
}

/**
 * Cas answers failures with a JSON body rather than a bare status, and the
 * codes are actionable: GRANT_LOGIN_REQUIRED means the customer must re-auth
 * through Link's update mode, USER_PERMISSION_REVOKED means the grant is gone
 * for good. Keeping the code intact lets the caller tell those apart from a
 * transient network fault.
 */
import { requiresRelink } from './errors.ts';

export class BankhubError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string,
    readonly errorType: string,
    message: string,
    readonly requestId?: string
  ) {
    super(message);
    this.name = 'BankhubError';
  }

  /**
   * The customer has to go through Cas Link again before this grant works.
   *
   * The list is no longer guessed here — errors.ts holds the codes documented
   * at https://cas.so/errors, so adding one does not mean hunting through
   * call sites.
   */
  get needsRelink(): boolean {
    return requiresRelink(this.errorCode);
  }
}

export function bankhubConfigFromEnv(): BankhubConfig {
  const clientId = Deno.env.get('BANKHUB_CLIENT_ID');
  const secretKey = Deno.env.get('BANKHUB_SECRET_KEY');
  if (!clientId || !secretKey) {
    throw new Error('BANKHUB_CLIENT_ID / BANKHUB_SECRET_KEY are not set');
  }
  // Sandbox is the default on purpose. The two environments use different
  // credentials, so a misconfigured deploy fails loudly against test data
  // rather than quietly touching a real customer's bank account.
  const env = (Deno.env.get('BANKHUB_ENV') ?? 'sandbox').toLowerCase();
  const baseUrl =
    env === 'production' ? 'https://production.bankhub.dev' : 'https://sandbox.bankhub.dev';
  return { clientId, secretKey, baseUrl };
}

function headers(cfg: BankhubConfig, accessToken?: string): HeadersInit {
  const h: Record<string, string> = {
    'X-BankHub-Api-Version': API_VERSION,
    'x-client-id': cfg.clientId,
    'x-secret-key': cfg.secretKey,
    Accept: 'application/json',
  };
  // Cas expects the raw token, with no "Bearer " prefix.
  if (accessToken) h.Authorization = accessToken;
  return h;
}

async function request<T>(
  cfg: BankhubConfig,
  method: 'GET' | 'POST',
  path: string,
  opts: { body?: unknown; accessToken?: string } = {}
): Promise<T> {
  const init: RequestInit = { method, headers: headers(cfg, opts.accessToken) };
  if (opts.body !== undefined) {
    init.headers = { ...(init.headers as Record<string, string>), 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${cfg.baseUrl}${path}`, init);
  const text = await res.text();

  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body from an API that always speaks JSON means a proxy or an
    // outage answered instead of Cas.
    throw new BankhubError(res.status, 'NON_JSON_RESPONSE', 'TRANSPORT', text.slice(0, 200));
  }

  if (!res.ok) {
    const e = parsed as { errorCode?: string; errorType?: string; errorMessage?: string; requestId?: string };
    throw new BankhubError(
      res.status,
      e?.errorCode ?? 'UNKNOWN',
      e?.errorType ?? 'UNKNOWN',
      e?.errorMessage ?? `HTTP ${res.status}`,
      e?.requestId
    );
  }
  return parsed as T;
}

// ── Grant lifecycle ─────────────────────────────────────────────────────────

export interface CreateGrantOptions {
  redirectUri: string;
  /** Defaults to identity + transaction: the account holder, and the history. */
  scopes?: string[];
  language?: string;
  /** Shown in the Cas console so a grant can be traced back to a customer. */
  name?: string;
  /** Opens Link straight into one bank instead of the picker. */
  fiServiceId?: string;
}

export interface GrantToken {
  grantToken: string;
  /**
   * The docs name this field `expiration`; the sandbox actually returns
   * `expiredAt`. Both are read so the value survives if Cas ever aligns the
   * implementation with the documentation.
   */
  expiredAt?: string;
  expiration?: string;
}

/**
 * `redirectUri` must already be registered in the Cas console — an unregistered
 * value is rejected with INVALID_PARAM "<uri> not allowed" before Link ever
 * opens, so this fails at development time rather than in front of a customer.
 */
export function createGrantToken(cfg: BankhubConfig, opts: CreateGrantOptions): Promise<GrantToken> {
  return request<GrantToken>(cfg, 'POST', '/grant/token', {
    body: {
      scopes: (opts.scopes ?? ['identity', 'transaction']).join(','),
      redirectUri: opts.redirectUri,
      language: opts.language ?? 'vi',
      ...(opts.name ? { name: opts.name.slice(0, 40) } : {}),
      ...(opts.fiServiceId ? { fiServiceId: opts.fiServiceId } : {}),
    },
  });
}

/**
 * Re-authenticate an existing grant instead of replacing it — Cas's "Update Mode".
 *
 * Same endpoint as creating a grant, distinguished only by sending the
 * accessToken of the grant being updated. Cas Link then opens on that account
 * rather than the bank picker, so the customer re-enters a changed password or
 * clears a device check without choosing their bank again and without the
 * connection, its id, or its stored history being torn down.
 *
 * This is the documented remedy for GRANT_LOGIN_REQUIRED. Before it, that error
 * only got the connection marked `needs_relink`, and the customer's only way
 * out was to start a fresh link — which loses the cursor and re-pulls a year of
 * statements.
 *
 * Calling it on a healthy grant answers FI_SERVICE_ACCOUNT_CONNECTING, which
 * means "nothing to update" rather than a failure.
 */
export function createUpdateGrantToken(
  cfg: BankhubConfig,
  accessToken: string,
  opts: { redirectUri: string; scopes?: string[]; language?: string }
): Promise<GrantToken> {
  return request<GrantToken>(cfg, 'POST', '/grant/token', {
    accessToken,
    body: {
      scopes: (opts.scopes ?? ['transaction']).join(','),
      redirectUri: opts.redirectUri,
      language: opts.language ?? 'vi',
    },
  });
}

export interface ExchangeResult {
  accessToken: string;
  grantId: string;
  requestId?: string;
}

/** The publicToken is single use and short-lived; exchange it immediately. */
export function exchangePublicToken(cfg: BankhubConfig, publicToken: string): Promise<ExchangeResult> {
  return request<ExchangeResult>(cfg, 'POST', '/grant/exchange', { body: { publicToken } });
}

/** Rotates the accessToken and keeps the grant. Use after a suspected leak. */
export function rotateAccessToken(
  cfg: BankhubConfig,
  accessToken: string
): Promise<{ newAccessToken: string; grantId: string; requestId?: string }> {
  return request(cfg, 'POST', '/grant/invalidate', { accessToken });
}

/**
 * Result of asking Cas to end an authorisation.
 *
 * Some banks let the grant go on the first call; others require the customer to
 * confirm with an OTP first. In the second case Cas answers with a `grantToken`
 * instead of a completion — the same kind of token that opens Cas Link — and the
 * removal only happens once the customer has been through that screen.
 *
 * Both outcomes are 200 responses, so the caller has to look at which fields
 * came back rather than at the status code. `otpRequired` makes that explicit so
 * no call site has to remember the rule.
 */
export interface RemoveGrantResult {
  requestId?: string;
  /** Present when the bank wants the customer to confirm before the grant dies. */
  grantToken?: string;
  /** True when a grantToken came back, i.e. nothing has been removed yet. */
  otpRequired: boolean;
}

/**
 * Ends the authorisation entirely — the customer's side of "disconnect".
 *
 * Acceptance cases 3 and 4 are the two halves of this one call: case 3 is the
 * bank that just lets go, case 4 is the bank that asks for an OTP first. Case 4
 * was previously recorded as not implemented because this function threw the
 * `grantToken` away, leaving the caller to assume every 200 meant "removed" —
 * which would have marked a still-live grant as disconnected and stopped MIMI
 * from ever syncing it again while the customer's data stayed authorised at the
 * bank. Silently keeping an authorisation open is the worse half of that bug.
 */
export async function removeGrant(
  cfg: BankhubConfig,
  accessToken: string,
): Promise<RemoveGrantResult> {
  const res = await request<{ requestId?: string; grantToken?: string }>(
    cfg,
    'POST',
    '/grant/remove',
    { accessToken },
  );
  return { ...res, otpRequired: !!res.grantToken };
}

/** The three states Cas's sandbox can put a grant into on demand. */
export type SimulatedLoginError = 'GRANT_LOGIN_REQUIRED' | 'OTP_REQUIRED' | 'PREVENTED';

/**
 * Break a sandbox grant on purpose, so the recovery path can be tested.
 *
 * These three map exactly onto acceptance cases 5, 6 and 7 — a changed
 * password, a device check, and login-from-website being blocked. Those cases
 * were written off as "cannot be staged in the sandbox"; they can, and this is
 * how.
 *
 * Sandbox only. The caller checks the environment before reaching this, because
 * a function that can deliberately break a customer's real bank connection has
 * no business existing in production.
 */
export function simulateLoginError(
  cfg: BankhubConfig,
  accessToken: string,
  errorCode: SimulatedLoginError
): Promise<{ requestId?: string }> {
  return request(cfg, 'POST', '/sandbox/grant/reset-login', {
    accessToken,
    body: { errorCode },
  });
}

export interface FiService {
  id: string;
  code: string;
  name: string;
  /** PERSONAL, ENTERPRISE, or BOTH. */
  type?: string;
  logo?: string;
  fiName?: string;
  fiFullName?: string;
  fiBin?: string;
}

/**
 * The financial services this application is allowed to link.
 *
 * Client credentials only — no grant needed — so it can be read before the
 * customer has linked anything. That matters: `fiServiceId` on /grant/token
 * opens Cas Link straight onto one service, which turns "hunt through a list of
 * banks and find out afterwards whether yours sells QR Pay" into "pick from the
 * ones that do".
 */
export async function fetchFiServices(cfg: BankhubConfig): Promise<FiService[]> {
  const res = await request<{ fiServices?: FiService[] }>(cfg, 'GET', '/fi-services');
  return res.fiServices ?? [];
}

/**
 * E-invoices this company issued or received, from the tax authority's own
 * portal. Needs a grant carrying the `gdt` scope.
 */
export function fetchGdtInvoices(
  cfg: BankhubConfig,
  accessToken: string,
  opts: { fromDate: string; toDate: string }
): Promise<{ requestId?: string; gdtInvoices?: unknown[] }> {
  const params = new URLSearchParams({ fromDate: opts.fromDate, toDate: opts.toDate });
  return request(cfg, 'GET', `/gdt/invoices?${params.toString()}`, { accessToken });
}

// ── Data ────────────────────────────────────────────────────────────────────

export interface IdentityResponse {
  requestId?: string;
  accounts?: Array<{
    accountNumber?: string;
    accountName?: string;
    currency?: string;
    balance?: number;
  }>;
  [key: string]: unknown;
}

export function fetchIdentity(cfg: BankhubConfig, accessToken: string): Promise<IdentityResponse> {
  return request<IdentityResponse>(cfg, 'GET', '/identity', { accessToken });
}

export interface QrPayOptions {
  /** VND, integer. Cas rejects a decimal. */
  amount: number;
  /** Shown to the payer in their banking app. */
  description: string;
  /**
   * The merchant's own order id, echoed back on the TRANSACTIONS webhook as
   * `paymentMeta.referenceNumber`. It is the only thread tying a payment that
   * lands in the bank account back to the invoice it settles, so it must be
   * unique per company and never reused.
   */
  referenceNumber: string;
}

export interface QrPayDetails {
  accountNumber?: string;
  accountName?: string;
  description?: string;
  /**
   * The one-off account the payer actually transfers to. Cas routes anything
   * arriving here back to `accountNumber` and tags it with our reference —
   * which is why reconciliation does not have to guess from the description.
   */
  virtualAccountNumber?: string;
  amount?: number;
  /** Bank identification number, needed to render the VietQR payload. */
  bin?: string;
  /** The VietQR string to draw as a QR code. */
  qrCode?: string;
  referenceNumber?: string;
}

/**
 * `{ requestId, qrPay: { … } }` — the payload fields are nested, not flat.
 *
 * This was written flat first, from the field list in the acceptance test
 * sheet, which names them without showing the envelope. Nothing would have
 * failed loudly: every field would simply have read `undefined`, the row would
 * have stored nulls, and the customer would have been shown a blank square
 * where their QR should be.
 */
export interface QrPayResponse {
  requestId?: string;
  qrPay?: QrPayDetails;
}

/**
 * Only the fields this product uses.
 *
 * The real response also carries `identificationNumber` and `mobileNumber` —
 * a national ID number and a phone number. Those are exactly what refusing the
 * `identity` scope was meant to keep out, and they arrive here anyway through
 * a different door. They are deliberately absent from this type and from
 * `pickQrPayIdentity` below, so nothing downstream can store or log them by
 * reaching for a field it happened to see in the docs.
 */
export interface QrPayIdentity {
  requestId?: string;
  accountNumber?: string;
  accountName?: string;
  virtualAccountNumber?: string;
  fiService?: {
    code?: string;
    name?: string;
    fiName?: string;
    fiBin?: string;
  };
}

/** Narrow a raw response down to the fields above, dropping everything else. */
export function pickQrPayIdentity(raw: Record<string, unknown>): QrPayIdentity {
  const fi = (raw.fiService ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    requestId: str(raw.requestId),
    accountNumber: str(raw.accountNumber),
    accountName: str(raw.accountName),
    virtualAccountNumber: str(raw.virtualAccountNumber),
    fiService: {
      code: str(fi.code),
      name: str(fi.name),
      fiName: str(fi.fiName),
      fiBin: str(fi.fiBin),
    },
  };
}

/**
 * Check that the account behind a QR Pay grant is usable.
 *
 * The documented step 4 of the QR Pay flow, and the right probe for this kind
 * of grant: a QR Pay link collects an account number and holder name, never a
 * banking login, so /transactions has nothing to say about it. Cas's own
 * guidance is to call /grant/remove when this comes back invalid.
 */
export async function fetchQrPayIdentity(
  cfg: BankhubConfig,
  accessToken: string
): Promise<QrPayIdentity> {
  const raw = await request<Record<string, unknown>>(cfg, 'GET', '/qr-pay/identity', {
    accessToken,
  });
  // Narrowed at the boundary, so the national ID number never travels further
  // into this system than the line that received it.
  return pickQrPayIdentity(raw);
}

/**
 * Ask Cas for a QR that settles into the linked account.
 *
 * Requires the grant to carry the `qrpay` scope. A grant issued with
 * `transaction` alone answers GRANT_NOT_FOUND here, which reads like a missing
 * link rather than a missing scope — so a customer who linked before QR
 * existed has to link again.
 */
export async function createQrPay(
  cfg: BankhubConfig,
  accessToken: string,
  opts: QrPayOptions
): Promise<QrPayDetails & { requestId?: string }> {
  const res = await request<QrPayResponse & QrPayDetails>(cfg, 'POST', '/qr-pay', {
    accessToken,
    body: {
      amount: Math.round(opts.amount),
      description: opts.description,
      referenceNumber: opts.referenceNumber,
    },
  });
  // Flattened for callers. The `?? res` fallback costs one line and means a
  // change of envelope on Cas's side degrades to the old shape instead of
  // silently producing a QR made entirely of nulls.
  return { requestId: res.requestId, ...(res.qrPay ?? res) };
}

export interface FetchTransactionsOptions {
  /** YYYY-MM-DD */
  fromDate?: string;
  /** YYYY-MM-DD */
  toDate?: string;
  /**
   * Per-account cursor. `fromReference` resumes from the last transaction
   * already stored, which is safer than re-querying a date window: a bank that
   * posts a transaction late would fall outside a window that has already been
   * swept, and it would never be seen again.
   */
  accounts?: Array<{ accountNumber: string; fromReference?: string }>;
}

export function fetchTransactions(
  cfg: BankhubConfig,
  accessToken: string,
  opts: FetchTransactionsOptions = {}
): Promise<import('./bankhub-map.ts').BankhubTransactionsResponse> {
  const params = new URLSearchParams();
  if (opts.fromDate) params.set('fromDate', opts.fromDate);
  if (opts.toDate) params.set('toDate', opts.toDate);
  if (opts.accounts?.length) {
    // Documented as "a JSON string encoded on the URL"; URLSearchParams handles
    // the percent-encoding.
    params.set(
      'accounts',
      JSON.stringify(
        opts.accounts.map((a) => ({
          accountNumber: a.accountNumber,
          // Always a string, never omitted. Cas documents fromReference as an
          // optional cursor, but the API rejects a request without it —
          // "fromReference là bắt buộc, fromReference phải là chuỗi". Empty
          // means start from the beginning, which is what a first sync wants.
          fromReference: a.fromReference ?? '',
        }))
      )
    );
  }
  const qs = params.toString();
  return request(cfg, 'GET', `/transactions${qs ? `?${qs}` : ''}`, { accessToken });
}
