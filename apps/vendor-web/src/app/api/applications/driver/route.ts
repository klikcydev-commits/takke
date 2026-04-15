import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DriverApplicationDto = {
  contactEmail?: string;
  authUserId?: string;
  businessContactEmail?: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  state: string;
  address: string;
  dateOfBirth?: string;
  vehicleType: string;
  vehicleDetails: string;
  licenseNumber: string;
  vehicleModel: string;
  licensePlate: string;
  identityDocUrl: string;
  licenseDocUrl: string;
  insuranceDocUrl?: string;
  registrationDocUrl?: string;
  bankName?: string;
  accountNumber?: string;
  availability?: string;
  serviceArea?: string;
  profileImageUrl?: string;
};

function validateDriverDto(dto: DriverApplicationDto): string | null {
  if (!dto.fullName?.trim()) return "Full name is required.";
  if (!dto.phone?.trim()) return "Phone number is required.";
  if (!dto.country?.trim()) return "Country is required.";
  if (!dto.city?.trim()) return "City is required.";
  if (!dto.state?.trim()) return "State/region is required.";
  if (!dto.address?.trim()) return "Address is required.";
  if (!dto.dateOfBirth?.trim()) return "Date of birth is required.";
  if (!dto.vehicleType?.trim()) return "Vehicle type is required.";
  if (!dto.vehicleDetails?.trim()) return "Vehicle details are required.";
  if (!dto.vehicleModel?.trim()) return "Vehicle model is required.";
  if (!dto.licensePlate?.trim()) return "License plate is required.";
  if (!dto.licenseNumber?.trim()) return "License number is required.";
  if (!dto.identityDocUrl?.trim()) return "Identity document URL is required.";
  if (!dto.licenseDocUrl?.trim()) return "License document URL is required.";
  if (!dto.serviceArea?.trim()) return "Service area is required.";
  if (!dto.availability?.trim()) return "Availability is required.";
  if (dto.businessContactEmail && !dto.businessContactEmail.includes("@")) {
    return "Business contact email is invalid.";
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
      "Missing Supabase config for driver application route (URL, anon key, service role key).",
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
  let dto: DriverApplicationDto;
  try {
    dto = (await req.json()) as DriverApplicationDto;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const validationError = validateDriverDto(dto);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const { url, service } = getConfig();
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bearerUser = await getAuthUserFromBearer(req.headers.get("authorization"));
  let authUserId = bearerUser?.id ?? dto.authUserId?.trim() ?? "";
  let authEmail = bearerUser?.email?.trim().toLowerCase() ?? dto.contactEmail?.trim().toLowerCase() ?? "";
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  // Resolve app user row from Supabase auth user id.
  let { data: appUser, error: appUserErr } = await sb
    .from("User")
    .select("id")
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
        requestedRole: "DELIVERY_DRIVER",
        onboardingStatus: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (createUserErr || !createdUser?.id) {
      return NextResponse.json({ message: createUserErr?.message ?? "Failed to create user profile." }, { status: 400 });
    }
    appUser = createdUser;
  }

  const nowIso = new Date().toISOString();
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

  // Prevent duplicate pending applications.
  const { data: existingPending, error: pendingErr } = await sb
    .from("DriverApplication")
    .select("id")
    .eq("userId", appUser.id)
    .eq("status", "PENDING")
    .limit(1);
  if (pendingErr) {
    return NextResponse.json({ message: pendingErr.message }, { status: 400 });
  }
  if ((existingPending ?? []).length > 0) {
    return NextResponse.json({
      ok: true,
      alreadyPending: true,
      message: "Application already pending",
      applicationId: existingPending[0]?.id ?? null,
    });
  }

  // Update user role request + onboarding.
  const { error: userUpdateErr } = await sb
    .from("User")
    .update({
      requestedRole: "DELIVERY_DRIVER",
      onboardingStatus: "PENDING",
    })
    .eq("id", appUser.id);
  if (userUpdateErr) {
    return NextResponse.json({ message: userUpdateErr.message }, { status: 400 });
  }

  // Ensure driver profile row exists (required by FK DriverApplication_driver_fkey).
  const { data: existingProfile } = await sb
    .from("UserProfile")
    .select("id")
    .eq("userId", appUser.id)
    .maybeSingle();
  const nameParts = dto.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "Driver";
  const lastName = nameParts.slice(1).join(" ");
  const { error: profileUpsertErr } = await sb.from("UserProfile").upsert(
    {
      id: existingProfile?.id ?? crypto.randomUUID(),
      userId: appUser.id,
      firstName,
      lastName,
      phone: dto.phone.trim(),
      avatarUrl: dto.profileImageUrl?.trim() || null,
      metadata: {
        city: dto.city.trim(),
        state: dto.state.trim(),
        country: dto.country.trim(),
        address: dto.address.trim(),
      },
      updatedAt: nowIso,
    },
    { onConflict: "userId" },
  );
  if (profileUpsertErr) {
    return NextResponse.json({ message: profileUpsertErr.message }, { status: 400 });
  }

  const driverPayload = {
    id: crypto.randomUUID(),
    userId: appUser.id,
    vehicleType: dto.vehicleType,
    licensePlate: dto.licensePlate,
    isActive: true,
    metadata: {
      vehicleModel: dto.vehicleModel,
      vehicleDetails: dto.vehicleDetails,
      licenseNumber: dto.licenseNumber,
      businessContactEmail: dto.businessContactEmail ?? null,
      serviceArea: dto.serviceArea,
      availability: dto.availability,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const { error: driverUpsertErr } = await sb.from("Driver").upsert(driverPayload, {
    onConflict: "userId",
  });
  if (driverUpsertErr) {
    return NextResponse.json({ message: driverUpsertErr.message }, { status: 400 });
  }

  const { data: createdApp, error: createErr } = await sb
    .from("DriverApplication")
    .insert({
      id: crypto.randomUUID(),
      userId: appUser.id,
      status: "PENDING",
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth ?? null,
      vehicleType: dto.vehicleType,
      vehicleModel: dto.vehicleModel,
      licensePlate: dto.licensePlate,
      identityDocUrl: dto.identityDocUrl,
      licenseDocUrl: dto.licenseDocUrl,
      insuranceDocUrl: dto.insuranceDocUrl ?? null,
      registrationDocUrl: dto.registrationDocUrl ?? null,
      bankName: dto.bankName ?? null,
      accountNumber: dto.accountNumber ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .select("*")
    .single();
  if (createErr) {
    return NextResponse.json({ message: createErr.message }, { status: 400 });
  }

  const { error: historyErr } = await sb.from("DriverApplicationStatusHistory").insert({
    id: crypto.randomUUID(),
    applicationId: createdApp.id,
    status: "PENDING",
    notes: "Initial driver application submission",
    createdAt: nowIso,
  });
  if (historyErr) {
    return NextResponse.json({ message: historyErr.message }, { status: 400 });
  }

  // Send an auth email to the driver account after submission.
  // This gives the applicant a secure sign-in path tied to the same email.
  const redirectTo =
    siteUrl && siteUrl.length > 0
      ? `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(
          "/register/driver/success",
        )}`
      : undefined;
  const { error: linkErr } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (linkErr) {
    return NextResponse.json(
      {
        message: `Driver application saved, but failed to send auth email: ${linkErr.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...createdApp,
    authEmailSentTo: authEmail,
  });
}
