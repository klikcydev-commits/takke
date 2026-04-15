/**
 * User-facing copy for Supabase Auth HTTP 429 (rate limit).
 */
export const SUPABASE_AUTH_RATE_LIMIT_MESSAGE =
  "Too many signup attempts. Please wait a minute and try again.";

export type SupabaseAuthErrorInfo = {
  message: string;
  status?: number;
  code?: string;
  /** JSON snapshot for server/client logs */
  raw: string;
};

function serializeUnknown(err: unknown): string {
  try {
    if (err && typeof err === "object") {
      return JSON.stringify(err, Object.getOwnPropertyNames(err));
    }
    return JSON.stringify(String(err));
  } catch {
    return String(err);
  }
}

/**
 * Normalizes Supabase GoTrue errors (and generic Errors) for display and logging.
 */
export function getSupabaseAuthErrorInfo(err: unknown): SupabaseAuthErrorInfo {
  let message = "Something went wrong. Please try again.";
  let status: number | undefined;
  let code: string | undefined;

  if (err instanceof Error) {
    message = err.message;
  }
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") message = o.message;
    if (typeof o.status === "number") status = o.status;
    if (typeof o.code === "string") code = o.code;
  }

  return { message, status, code, raw: serializeUnknown(err) };
}

/**
 * Maps Supabase auth errors to user-visible strings (429 → friendly rate-limit text).
 */
export function formatSupabaseAuthError(err: unknown): string {
  const info = getSupabaseAuthErrorInfo(err);
  if (info.status === 429) {
    return SUPABASE_AUTH_RATE_LIMIT_MESSAGE;
  }
  return info.message;
}

export type SignupLogPhase = "start" | "success" | "blocked_duplicate" | "error";

/**
 * Structured signup instrumentation (browser or Node). Use one log line per attempt.
 */
export function logSupabaseSignup(
  scope: string,
  phase: SignupLogPhase,
  extra?: Record<string, unknown>,
): void {
  const payload = { scope, phase, ...extra, t: Date.now() };
  if (phase === "error") {
    console.warn("[supabase signup]", payload);
  } else if (phase === "blocked_duplicate") {
    console.warn("[supabase signup]", payload);
  } else {
    console.info("[supabase signup]", payload);
  }
}
