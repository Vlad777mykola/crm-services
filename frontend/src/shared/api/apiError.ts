import { getApiUrl } from '@/shared/lib/env';

/**
 * Gateway-aware error handling for the hand-written API clients.
 *
 * Traefik answers with a bare `Bad Gateway` body when the service behind a
 * route is not listening, so the raw status alone ("Request failed with status
 * 502") tells nobody which backend is down. `ApiError` keeps the route, the
 * upstream status and the correlation id so both the UI and the console show
 * what actually failed.
 */

/** Statuses Traefik returns when it cannot reach (or is not answered by) an upstream. */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

export interface ApiErrorInfo {
  status: number;
  statusText: string;
  /** Path relative to the gateway, e.g. `/companies/:id/specialists`. */
  path: string;
  requestId?: string;
  /** Raw response body, kept when it was not parseable JSON. */
  rawBody?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly path: string;
  readonly requestId?: string;
  readonly rawBody?: string;

  constructor(message: string, info: ApiErrorInfo) {
    super(message);
    this.name = 'ApiError';
    this.status = info.status;
    this.statusText = info.statusText;
    this.path = info.path;
    this.requestId = info.requestId;
    this.rawBody = info.rawBody;
  }

  /** True when the gateway itself failed to reach the owning service. */
  get isGatewayFailure(): boolean {
    return GATEWAY_STATUSES.has(this.status);
  }
}

/** Raised when the browser could not reach the gateway at all (wrong port, nothing listening, CORS preflight failure). */
export class NetworkError extends Error {
  readonly path: string;

  constructor(path: string, cause: unknown) {
    super(
      `Cannot reach the API gateway at ${getApiUrl()} (requesting ${path}). ` +
        'Check that the gateway is running - `yarn dev:infra`.',
    );
    this.name = 'NetworkError';
    this.path = path;
    this.cause = cause;
  }
}

function toPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function gatewayMessage(status: number, statusText: string, path: string): string {
  return (
    `Backend unreachable (${status} ${statusText || 'Bad Gateway'}). ` +
    `The API gateway at ${getApiUrl()} has a route for ${path} but the service behind it did not answer - ` +
    'it is most likely not running. Run `yarn dev status` to see which service ports are open.'
  );
}

function extractServerMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const error = (body as { error?: { message?: string } }).error;
  return typeof error?.message === 'string' ? error.message : undefined;
}

/**
 * Reads a JSON envelope, or throws an `ApiError` carrying enough context to
 * diagnose the failure. Non-2xx gateway statuses are translated into an
 * explicit "the backing service is down" message rather than a bare status.
 */
export async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const path = toPath(response.url);
  const requestId = response.headers.get('x-request-id') ?? undefined;

  const rawBody = await response.text().catch(() => '');
  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : undefined;
  } catch {
    parsed = undefined;
  }

  if (response.ok) {
    return parsed as T;
  }

  const info: ApiErrorInfo = {
    status: response.status,
    statusText: response.statusText,
    path,
    requestId,
    ...(parsed === undefined && rawBody ? { rawBody } : {}),
  };

  const serverMessage = extractServerMessage(parsed);
  const message =
    serverMessage ??
    (GATEWAY_STATUSES.has(response.status)
      ? gatewayMessage(response.status, response.statusText, path)
      : `Request to ${path} failed with ${response.status} ${response.statusText}`.trim());

  const error = new ApiError(message, info);
  logApiError(error);
  throw error;
}

function logApiError(error: ApiError): void {
  if (!import.meta.env.DEV) return;
  console.error(
    `[api] ${error.status} ${error.path}${error.requestId ? ` (request-id ${error.requestId})` : ''}\n` +
      `${error.message}${error.rawBody ? `\nupstream body: ${error.rawBody}` : ''}`,
  );
}
