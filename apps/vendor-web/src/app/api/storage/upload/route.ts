import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
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
  if (!url || !anon || !service) throw new Error("Supabase config is missing.");
  return { url, anon, service };
}

async function requireAppUser(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { url, anon, service } = getConfig();
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.id) return null;
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: userErr } = await sb
    .from("User")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (userErr) throw new Error(userErr.message);
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const appUserId = await requireAppUser(req);
  if (!appUserId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const bucket = formData.get("bucket");
  const pathVal = formData.get("path");

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ message: "Missing file" }, { status: 400 });
  }
  if (typeof bucket !== "string" || typeof pathVal !== "string" || !bucket || !pathVal) {
    return NextResponse.json({ message: "bucket and path are required" }, { status: 400 });
  }
  if (!["documents", "profiles", "stores"].includes(bucket)) {
    return NextResponse.json(
      { message: "bucket must be documents, profiles, or stores" },
      { status: 400 },
    );
  }

  try {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ message: "File size exceeds 5MB limit" }, { status: 400 });
    }
    const mimetype = file.type || "application/octet-stream";
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
    if (!allowedTypes.includes(mimetype)) {
      return NextResponse.json(
        { message: "Invalid file type. Allowed: JPG, PNG, WEBP, PDF" },
        { status: 400 },
      );
    }

    const { url, service } = getConfig();
    const sb = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const fullPath = `${appUserId}/${pathVal.replace(/^\/+/, "")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await sb.storage.from(bucket).upload(fullPath, buffer, {
      contentType: mimetype,
      upsert: true,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: publicData } = sb.storage.from(bucket).getPublicUrl(data.path);
    return NextResponse.json({ url: publicData.publicUrl, bucket, path: data.path });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}
