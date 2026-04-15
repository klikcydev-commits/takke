import jwt from "jsonwebtoken";
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { prisma } from "./prisma.js";
import { findAppUserIdByAuthUserId } from "./userProfileSupabaseData.js";

/** Issuer claim on Supabase user access tokens: `https://<project>.supabase.co/auth/v1` */
export function getSupabaseJwtIssuer(): string | null {
  const raw =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  return `${raw.replace(/\/$/, "")}/auth/v1`;
}

let jwksSingleton: ReturnType<typeof createRemoteJWKSet> | null = null;

function getRemoteJwks(): ReturnType<typeof createRemoteJWKSet> | null {
  const issuer = getSupabaseJwtIssuer();
  if (!issuer) return null;
  if (!jwksSingleton) {
    jwksSingleton = createRemoteJWKSet(
      new URL(`${issuer}/.well-known/jwks.json`),
    );
  }
  return jwksSingleton;
}

function payloadToClaims(payload: JWTPayload): { sub?: string; email?: string } {
  return {
    sub: typeof payload.sub === "string" ? payload.sub : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

/**
 * Verifies a Supabase access token and returns `sub` + `email` claims.
 * - **ES256 / RS256** (current Supabase signing keys): uses **JWKS** from
 *   `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` — no shared secret.
 * - **HS256** (legacy “JWT secret”): uses **`SUPABASE_JWT_SECRET`** (server env only).
 *
 * Never expose `SUPABASE_JWT_SECRET` to browsers or mobile bundles.
 */
export async function verifySupabaseJwtClaims(
  token: string,
): Promise<{ sub?: string; email?: string } | null> {
  let alg: string | undefined;
  try {
    alg = decodeProtectedHeader(token).alg;
  } catch {
    return null;
  }

  if (alg === "HS256") {
    const secret = process.env.SUPABASE_JWT_SECRET?.trim();
    if (!secret) {
      throw new Error(
        "SUPABASE_JWT_SECRET is not set (required to verify HS256 Supabase tokens)",
      );
    }
    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      return payloadToClaims(decoded);
    } catch {
      return null;
    }
  }

  const issuer = getSupabaseJwtIssuer();
  const remote = getRemoteJwks();
  if (!issuer || !remote) {
    throw new Error(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set for ES256/RS256 Supabase JWT verification (JWKS)",
    );
  }

  try {
    const { payload } = await jwtVerify(token, remote, {
      issuer,
    });
    return payloadToClaims(payload);
  } catch {
    return null;
  }
}

export async function getAppUserIdFromBearer(
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  let decoded: { sub?: string } | null;
  try {
    decoded = await verifySupabaseJwtClaims(token);
  } catch (e) {
    throw e instanceof Error ? e : new Error("JWT verification failed");
  }
  if (!decoded?.sub) return null;
  return findAppUserIdByAuthUserId(decoded.sub);
}

export async function assertUserHasAdminRole(appUserId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: appUserId },
    include: { roles: { include: { role: true } } },
  });
  const names = user?.roles.map((r) => r.role.name) ?? [];
  if (!names.some((n) => n === "ADMIN" || n === "SUPER_ADMIN")) {
    throw new Error("Forbidden");
  }
}

export async function assertUserHasStoreOwnerRole(
  appUserId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: appUserId },
    include: { roles: { include: { role: true } } },
  });
  const names = user?.roles.map((r) => r.role.name) ?? [];
  if (!names.some((n) => n === "STORE_OWNER")) {
    throw new Error("Forbidden");
  }
}

export async function assertUserHasDeliveryDriverRole(
  appUserId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: appUserId },
    include: { roles: { include: { role: true } } },
  });
  const names = user?.roles.map((r) => r.role.name) ?? [];
  if (!names.some((n) => n === "DELIVERY_DRIVER")) {
    throw new Error("Forbidden");
  }
}

/**
 * @deprecated Use {@link verifySupabaseJwtClaims} (async). Kept for a short transition.
 */
export async function decodeSupabaseJwtPayload(
  token: string,
): Promise<{ sub?: string; email?: string } | null> {
  return verifySupabaseJwtClaims(token);
}
