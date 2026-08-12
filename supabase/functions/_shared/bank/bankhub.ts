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

  /** The customer has to go through Cas Link again before this grant works. */
  get needsRelink(): boolean {
    return this.errorCode === 'GRANT_LOGIN_REQUIRED' || this.errorCode === 'USER_PERMISSION_REVOKED';
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

/** Ends the authorisation entirely — the customer's side of "disconnect". */
export function removeGrant(cfg: BankhubConfig, accessToken: string): Promise<{ requestId?: string }> {
  return request(cfg, 'POST', '/grant/remove', { accessToken });
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
