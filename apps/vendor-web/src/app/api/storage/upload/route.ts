import { NextRequest, NextResponse } from "next/server";
import { getAppUserIdFromBearer, storageData } from "@marketplace/marketplace-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

export async function POST(req: NextRequest) {
  const appUserId = await getAppUserIdFromBearer(req.headers.get("authorization"));
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
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimetype = file.type || "application/octet-stream";
    const url = await storageData.uploadFile(
      { buffer, mimetype, size: file.size },
      bucket as "documents" | "profiles" | "stores",
      pathVal,
    );
    return NextResponse.json({ url, bucket, path: pathVal });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}
