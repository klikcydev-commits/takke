/**
 * Server-only: compare Supabase project `ref` from URL vs JWTs (anon + service role).
 * Mismatches explain "Invalid login credentials" after a "successful" sync.
 *
 * Note: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_…) is not a JWT — we decode
 * `ref` from the legacy anon JWT first, then fall back to comparing URL host to the service key.
 */

import { ensureVendorApiEnvLoaded } from "./loadVendorApiEnv";

export type SupabaseEnvAlignment = {
  aligned: boolean;
  refs: {
    fromUrl: string | null;
    /** Decoded from legacy anon JWT when available (publishable keys are not JWTs). */
    fromPublishableKey: string | null;
    fromServiceRoleKey: string | null;
  };
  issues: string[];
  hasDatabaseUrl: boolean;
  hasServiceRoleKey: boolean;
};

function jwtRef(jwt: string): string | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    const o = JSON.parse(json) as { ref?: string };
    return typeof o.ref === "string" ? o.ref : null;
  } catch {
    return null;
  }
}

/** Prefer legacy anon JWT — publishable `sb_` keys are not JWTs and have no `ref` payload. */
function firstClientJwtRef(): string | null {
  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ];
  for (const k of candidates) {
    const t = k?.trim();
    if (!t) continue;
    const r = jwtRef(t);
    if (r) return r;
  }
  return null;
}

function hostnameRef(url: string): string | null {
  try {
    const h = new URL(url.trim()).hostname;
    const m = /^([^.]+)\.supabase\.co$/i.exec(h);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function hasAnyClientKey(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
}

export function getSupabaseEnvAlignment(): SupabaseEnvAlignment {
  ensureVendorApiEnvLoaded();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    "";

  const urlRef = publicUrl ? hostnameRef(publicUrl) : null;
  const clientJwtRef = firstClientJwtRef();
  const serviceRef = serviceKey ? jwtRef(serviceKey) : null;
  const hasDatabaseUrl = !!process.env.DATABASE_URL?.trim();
  const clientKeyPresent = hasAnyClientKey();

  /** Service role must match the anon JWT ref, or (if only sb_publishable) URL host ref. */
  const keysMatch =
    !!serviceRef &&
    (clientJwtRef
      ? clientJwtRef === serviceRef
      : urlRef
        ? urlRef === serviceRef
        : true);

  const urlMatchesClientJwt =
    !urlRef || !clientJwtRef || urlRef === clientJwtRef;

  const aligned =
    !!publicUrl &&
    clientKeyPresent &&
    !!serviceKey &&
    hasDatabaseUrl &&
    keysMatch &&
    urlMatchesClientJwt;

  const issues: string[] = [];
  if (!publicUrl) issues.push("NEXT_PUBLIC_SUPABASE_URL is missing.");
  if (!clientKeyPresent) {
    issues.push(
      "Set at least one of NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_KEY (Dashboard → API).",
    );
  }
  if (!serviceKey) {
    issues.push(
      "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — add it to repo root or apps/vendor-web .env.local (server-only; never NEXT_PUBLIC_*).",
    );
  }
  if (!hasDatabaseUrl) {
    issues.push(
      "DATABASE_URL is missing — add the Supabase pooler URI from Dashboard → Connect (repo root .env.local is loaded automatically).",
    );
  }
  if (serviceRef && clientJwtRef && clientJwtRef !== serviceRef) {
    issues.push(
      `Anon JWT project (${clientJwtRef}) does not match service role (${serviceRef}). Use keys from the same Supabase project.`,
    );
  }
  if (serviceRef && !clientJwtRef && urlRef && urlRef !== serviceRef) {
    issues.push(
      `NEXT_PUBLIC_SUPABASE_URL project (${urlRef}) does not match service role (${serviceRef}).`,
    );
  }
  if (urlRef && clientJwtRef && urlRef !== clientJwtRef) {
    issues.push(
      `URL project ref (${urlRef}) does not match anon JWT (${clientJwtRef}).`,
    );
  }

  return {
    aligned,
    refs: {
      fromUrl: urlRef,
      fromPublishableKey: clientJwtRef,
      fromServiceRoleKey: serviceRef,
    },
    issues,
    hasDatabaseUrl,
    hasServiceRoleKey: !!serviceKey,
  };
}
