import { NextRequest, NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import {
  adminData,
  deliveryData,
  getAppUserIdFromBearer,
  assertUserHasAdminRole,
} from "@marketplace/marketplace-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

async function requireAdmin(req: NextRequest) {
  const appUserId = await getAppUserIdFromBearer(req.headers.get("authorization"));
  if (!appUserId) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  try {
    await assertUserHasAdminRole(appUserId);
  } catch {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return { appUserId };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    if (segments.length === 1 && segments[0] === "overview") {
      return NextResponse.json(await adminData.getOverview());
    }
    if (segments.length === 1 && segments[0] === "users") {
      return NextResponse.json(await adminData.getAllUsers());
    }
    if (segments.length === 1 && segments[0] === "stores") {
      return NextResponse.json(await adminData.getAllStores());
    }
    if (segments.length === 1 && segments[0] === "drivers") {
      return NextResponse.json(await adminData.getAllDrivers());
    }
    if (segments.length === 1 && segments[0] === "orders") {
      return NextResponse.json(await adminData.getAllOrders());
    }
    if (segments.length === 1 && segments[0] === "audit-logs") {
      return NextResponse.json(await adminData.getAllAuditLogs());
    }
    if (segments.length === 1 && segments[0] === "disputes") {
      return NextResponse.json(await adminData.getAllDisputes());
    }
    if (segments.length === 1 && segments[0] === "notifications") {
      return NextResponse.json(await adminData.getAllNotifications());
    }
    if (segments.length === 1 && segments[0] === "delivery-assignments") {
      return NextResponse.json(await adminData.getAllDeliveryAssignments());
    }
    if (segments.length === 1 && segments[0] === "products") {
      return NextResponse.json(await adminData.getAllProducts());
    }
    if (segments.length === 1 && segments[0] === "payouts") {
      return NextResponse.json(await adminData.getAllPayouts());
    }
    if (segments.length === 1 && segments[0] === "refund-requests") {
      return NextResponse.json(await adminData.getAllRefundRequests());
    }
    if (segments.length === 1 && segments[0] === "return-requests") {
      return NextResponse.json(await adminData.getAllReturnRequests());
    }
    if (
      segments.length === 3 &&
      segments[0] === "applications" &&
      segments[1] === "stores" &&
      segments[2] === "pending"
    ) {
      return NextResponse.json(await adminData.getPendingStores());
    }
    if (
      segments.length === 3 &&
      segments[0] === "applications" &&
      segments[1] === "drivers" &&
      segments[2] === "pending"
    ) {
      return NextResponse.json(await adminData.getPendingDrivers());
    }
    if (
      segments.length === 3 &&
      segments[0] === "applications" &&
      segments[1] === "drivers"
    ) {
      const id = segments[2];
      return NextResponse.json(await adminData.getDriverApplicationById(id));
    }
    if (segments.length === 2 && segments[0] === "stores") {
      const id = segments[1];
      return NextResponse.json(await adminData.getStoreById(id));
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    const msg = errMessage(e);
    const status = msg === "Store not found" || msg === "Application not found" ? 404 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { appUserId } = auth;

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (
      segments.length === 4 &&
      segments[0] === "applications" &&
      segments[1] === "stores" &&
      segments[3] === "review"
    ) {
      const storeId = segments[2];
      const dto = body as { status?: string; adminNotes?: string };
      return NextResponse.json(
        await adminData.reviewStore(storeId, appUserId, {
          status: dto.status as "APPROVED" | "REJECTED" | "INFO_REQUESTED",
          adminNotes: dto.adminNotes,
        }),
      );
    }
    if (
      segments.length === 4 &&
      segments[0] === "applications" &&
      segments[1] === "drivers" &&
      segments[3] === "review"
    ) {
      const applicationId = segments[2];
      const dto = body as { status?: string; adminNotes?: string };
      return NextResponse.json(
        await adminData.reviewDriver(applicationId, appUserId, {
          status: dto.status as "APPROVED" | "REJECTED" | "INFO_REQUESTED",
          adminNotes: dto.adminNotes,
        }),
      );
    }
    if (
      segments.length === 2 &&
      segments[0] === "delivery" &&
      segments[1] === "assignments"
    ) {
      return NextResponse.json(
        await deliveryData.createAssignment(appUserId, body as never),
      );
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const { appUserId } = auth;

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (segments.length === 2 && segments[0] === "products") {
      const productId = segments[1];
      const status = body.status as ProductStatus;
      const notes = body.notes as string | undefined;
      if (!status || !Object.values(ProductStatus).includes(status)) {
        return NextResponse.json({ message: "Invalid status" }, { status: 400 });
      }
      return NextResponse.json(
        await adminData.moderateProduct(appUserId, productId, { status, notes }),
      );
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    const msg = errMessage(e);
    return NextResponse.json({ message: msg }, { status: msg === "Product not found" ? 404 : 500 });
  }
}
