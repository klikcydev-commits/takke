import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StoreApplicationDto = {
  businessName: string;
  businessType: string;
  fullName?: string;
  description?: string;
  contactEmail?: string;
  contactPhone: string;
  businessAddress: string;
  city: string;
  state: string;
  country: string;
  logoUrl?: string;
  bannerUrl?: string;
  profileImageUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  authEmail?: string;
  authUserId?: string;
  metadata?: Record<string, unknown>;
};

function validateStoreDto(dto: StoreApplicationDto): string | null {
  if (!dto.businessName?.trim()) return "Business name is required.";
  if (!dto.businessType?.trim()) return "Business type is required.";
  if (!dto.fullName?.trim()) return "Full name is required.";
  if (!dto.contactPhone?.trim()) return "Phone number is required.";
  if (!dto.businessAddress?.trim()) return "Business address is required.";
  if (!dto.city?.trim()) return "City is required.";
  if (!dto.state?.trim()) return "State/region is required.";
  if (!dto.country?.trim()) return "Country is required.";
  if (!dto.logoUrl?.trim()) return "Store logo URL is required.";
  if (!dto.bannerUrl?.trim()) return "Store banner URL is required.";
  if (!dto.bankName?.trim() || !dto.accountNumber?.trim() || !dto.accountHolder?.trim()) {
    return "Bank name, account holder, and account number are required.";
  }
  return null;
}

function getConfig() {
  ensureVendorApiEnvLoaded();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim() ?? "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    "";
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim() ??
    "";
  if (!url || !anon || !service) {
    throw new Error(
      "Missing Supabase config for store application route (URL, anon key, service role key).",
    );
  }
  return { url, anon, service };
}

async function getAuthUserFromBearer(authHeader: string | null): Promise<{
  id: string;
  email: string | null;
  emailConfirmed: boolean;
} | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { url, anon } = getConfig();
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    emailConfirmed: !!data.user.email_confirmed_at,
  };
}

export async function POST(req: NextRequest) {
  let dto: StoreApplicationDto;
  try {
    dto = (await req.json()) as StoreApplicationDto;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const validationError = validateStoreDto(dto);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const { url, service } = getConfig();
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nowIso = new Date().toISOString();
  const bearerUser = await getAuthUserFromBearer(req.headers.get("authorization"));

  let authUserId = bearerUser?.id ?? dto.authUserId?.trim() ?? "";
  let authEmail = bearerUser?.email?.trim().toLowerCase() ?? dto.authEmail?.trim().toLowerCase() ?? "";
  if (!authUserId || !authEmail) {
    return NextResponse.json(
      { message: "Missing account context. Please sign up/sign in and retry." },
      { status: 400 },
    );
  }
  let emailConfirmed = bearerUser?.emailConfirmed ?? false;
  if (!bearerUser) {
    const { data: fetched, error: fetchedErr } = await sb.auth.admin.getUserById(authUserId);
    if (fetchedErr || !fetched.user?.id) {
      return NextResponse.json({ message: "Invalid account reference for registration." }, { status: 400 });
    }
    const verifiedEmail = (fetched.user.email ?? "").trim().toLowerCase();
    if (!verifiedEmail || verifiedEmail !== authEmail) {
      return NextResponse.json({ message: "Registration email/account mismatch." }, { status: 400 });
    }
    authEmail = verifiedEmail;
    emailConfirmed = !!fetched.user.email_confirmed_at;
  }

  let { data: appUser, error: appUserErr } = await sb
    .from("User")
    .select("id,email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (appUserErr) {
    return NextResponse.json({ message: appUserErr.message }, { status: 400 });
  }
  if (!appUser?.id) {
    const { data: createdUser, error: createUserErr } = await sb
      .from("User")
      .insert({
        id: crypto.randomUUID(),
        auth_user_id: authUserId,
        email: authEmail,
        isEmailVerified: emailConfirmed,
        requestedRole: "STORE_OWNER",
        onboardingStatus: "PENDING",
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .select("id,email")
      .single();
    if (createUserErr) {
      return NextResponse.json({ message: createUserErr.message }, { status: 400 });
    }
    appUser = createdUser;
  }

  const { error: syncUserErr } = await sb
    .from("User")
    .update({
      email: authEmail,
      isEmailVerified: emailConfirmed,
      updatedAt: nowIso,
    })
    .eq("id", appUser.id);
  if (syncUserErr) {
    return NextResponse.json({ message: syncUserErr.message }, { status: 400 });
  }

  const { data: existingProfile } = await sb
    .from("UserProfile")
    .select("id")
    .eq("userId", appUser.id)
    .maybeSingle();
  const nameParts = (dto.fullName?.trim() ?? "").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts.slice(1).join(" ");
  const { error: profileUpsertErr } = await sb.from("UserProfile").upsert(
    {
      id: existingProfile?.id ?? crypto.randomUUID(),
      userId: appUser.id,
      firstName,
      lastName,
      phone: dto.contactPhone.trim(),
      avatarUrl: dto.profileImageUrl?.trim() || null,
      metadata: {
        city: dto.city.trim(),
        state: dto.state.trim(),
        country: dto.country.trim(),
        address: dto.businessAddress.trim(),
      },
      updatedAt: nowIso,
    },
    { onConflict: "userId" },
  );
  if (profileUpsertErr) {
    return NextResponse.json({ message: profileUpsertErr.message }, { status: 400 });
  }

  const { data: pendingApps, error: pendingErr } = await sb
    .from("StoreApplication")
    .select("id")
    .eq("userId", appUser.id)
    .eq("status", "PENDING")
    .limit(1);
  if (pendingErr) return NextResponse.json({ message: pendingErr.message }, { status: 400 });
  if ((pendingApps ?? []).length > 0) {
    return NextResponse.json({
      ok: true,
      alreadyPending: true,
      message: "Application already pending",
      applicationId: pendingApps[0]?.id ?? null,
    });
  }

  const { error: userUpdateErr } = await sb
    .from("User")
    .update({
      requestedRole: "STORE_OWNER",
      onboardingStatus: "PENDING",
      updatedAt: nowIso,
    })
    .eq("id", appUser.id);
  if (userUpdateErr) {
    return NextResponse.json({ message: userUpdateErr.message }, { status: 400 });
  }

  // Ensure there is a store row tied to this owner.
  const { data: existingStore, error: storeLookupErr } = await sb
    .from("Store")
    .select("id")
    .eq("ownerId", appUser.id)
    .maybeSingle();
  if (storeLookupErr) {
    return NextResponse.json({ message: storeLookupErr.message }, { status: 400 });
  }

  let storeId = existingStore?.id ?? null;
  if (!storeId) {
    const slug = dto.businessName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const { data: createdStore, error: createStoreErr } = await sb
      .from("Store")
      .insert({
        id: crypto.randomUUID(),
        ownerId: appUser.id,
        name: dto.businessName,
        slug: slug || `store-${appUser.id.slice(0, 8)}`,
        description: dto.description ?? null,
        status: "PENDING",
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .select("id")
      .single();
    if (createStoreErr) {
      return NextResponse.json({ message: createStoreErr.message }, { status: 400 });
    }
    storeId = createdStore.id;
  }

  const { data: application, error: appCreateErr } = await sb
    .from("StoreApplication")
    .insert({
      id: crypto.randomUUID(),
      userId: appUser.id,
      storeId,
      businessName: dto.businessName,
      businessType: dto.businessType,
      contactEmail: dto.contactEmail || authEmail,
      contactPhone: dto.contactPhone,
      businessAddress: dto.businessAddress,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      metadata: dto.metadata ?? {},
      status: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .select("*")
    .single();
  if (appCreateErr) {
    return NextResponse.json({ message: appCreateErr.message }, { status: 400 });
  }

  const { error: historyErr } = await sb.from("StoreApplicationStatusHistory").insert({
    id: crypto.randomUUID(),
    applicationId: application.id,
    status: "PENDING",
    notes: "Initial store application submission",
    createdAt: nowIso,
  });
  if (historyErr) {
    return NextResponse.json({ message: historyErr.message }, { status: 400 });
  }

  const redirectTo =
    `${req.nextUrl.origin}/auth/callback?next=${encodeURIComponent("/register/store/success")}`;
  const { error: linkErr } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail,
    options: { redirectTo },
  });
  if (linkErr) {
    return NextResponse.json(
      { message: `Application saved but failed to send account email: ${linkErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...application,
    authEmail,
    authEmailSentTo: authEmail,
    message: "Store application submitted successfully.",
  });
}
