import { NextRequest, NextResponse } from "next/server";
import {
  applicationsData,
  assertUserHasDeliveryDriverRole,
  assertUserHasStoreOwnerRole,
  cartData,
  catalogData,
  checkoutData,
  customerOrdersData,
  deliveryData,
  getAppUserIdFromBearer,
  paymentsData,
  storesData,
  vendorOrdersData,
  vendorProductsData,
} from "@marketplace/marketplace-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

async function requireBearerUser(req: NextRequest) {
  const appUserId = await getAppUserIdFromBearer(req.headers.get("authorization"));
  if (!appUserId) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  return { appUserId };
}

async function requireStoreOwner(req: NextRequest) {
  const base = await requireBearerUser(req);
  if ("error" in base) return base;
  try {
    await assertUserHasStoreOwnerRole(base.appUserId);
  } catch {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

async function requireDeliveryDriver(req: NextRequest) {
  const base = await requireBearerUser(req);
  if ("error" in base) return base;
  try {
    await assertUserHasDeliveryDriverRole(base.appUserId);
  } catch {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];

  try {
    if (segments[0] === "catalog" && segments[1] === "categories" && segments.length === 2) {
      return NextResponse.json(await catalogData.listCategories());
    }
    if (segments[0] === "catalog" && segments[1] === "products" && segments.length === 2) {
      const url = new URL(req.url);
      const storeId = url.searchParams.get("storeId") ?? undefined;
      const take = url.searchParams.get("take") ?? "24";
      return NextResponse.json(await catalogData.listProducts(storeId, take));
    }

    const auth = await requireBearerUser(req);
    if ("error" in auth) return auth.error;
    const { appUserId } = auth;

    if (segments[0] === "stores" && segments[1] === "me" && segments.length === 2) {
      return NextResponse.json(await storesData.getMyStore(appUserId));
    }
    if (segments[0] === "stores" && segments[1] === "me" && segments[2] === "products" && segments.length === 3) {
      return NextResponse.json(await storesData.getMyProducts(appUserId));
    }
    if (segments[0] === "applications" && segments[1] === "status" && segments.length === 2) {
      return NextResponse.json(await applicationsData.getStatus(appUserId));
    }

    if (segments[0] === "cart" && segments.length === 1) {
      return NextResponse.json(await cartData.getOrCreateCart(appUserId));
    }

    if (segments[0] === "customer" && segments[1] === "orders" && segments.length === 2) {
      return NextResponse.json(await customerOrdersData.listOrders(appUserId));
    }
    if (
      segments[0] === "customer" &&
      segments[1] === "orders" &&
      segments[3] === "tracking" &&
      segments.length === 4
    ) {
      const orderId = segments[2];
      return NextResponse.json(await customerOrdersData.tracking(appUserId, orderId));
    }
    if (segments[0] === "customer" && segments[1] === "orders" && segments.length === 3) {
      const orderId = segments[2];
      return NextResponse.json(await customerOrdersData.detail(appUserId, orderId));
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "orders" && segments.length === 2) {
      return NextResponse.json(await vendorOrdersData.listOrdersForStore(ownerId));
    }
    if (segments[0] === "vendor" && segments[1] === "orders" && segments.length === 3) {
      const orderId = segments[2];
      if (orderId === "items") {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }
      return NextResponse.json(await vendorOrdersData.getOrderForStore(ownerId, orderId));
    }

    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 3) {
      const productId = segments[2];
      return NextResponse.json(await vendorProductsData.getProduct(ownerId, productId));
    }

    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];

  const auth = await requireBearerUser(req);
  if ("error" in auth) return auth.error;
  const { appUserId } = auth;

  let body: unknown;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (segments[0] === "applications" && segments[1] === "store" && segments.length === 2) {
      return NextResponse.json(await applicationsData.submitStoreApplication(appUserId, body as never));
    }
    if (segments[0] === "applications" && segments[1] === "driver" && segments.length === 2) {
      return NextResponse.json(
        await applicationsData.submitDriverApplication(appUserId, body as never),
      );
    }

    if (segments[0] === "cart" && segments[1] === "items" && segments.length === 2) {
      return NextResponse.json(await cartData.addItem(appUserId, body as never));
    }
    if (segments[0] === "checkout" && segments.length === 1) {
      return NextResponse.json(await checkoutData.checkout(appUserId, body as never));
    }
    if (
      segments[0] === "orders" &&
      segments[2] === "payments" &&
      segments[3] === "mock" &&
      segments[4] === "confirm" &&
      segments.length === 5
    ) {
      const orderId = segments[1];
      return NextResponse.json(await paymentsData.confirmMockPayment(orderId, appUserId));
    }
    if (
      segments[0] === "orders" &&
      segments[2] === "payments" &&
      segments[3] === "mock" &&
      segments[4] === "fail" &&
      segments.length === 5
    ) {
      const orderId = segments[1];
      const reason =
        typeof (body as { reason?: string }).reason === "string"
          ? (body as { reason: string }).reason
          : undefined;
      return NextResponse.json(await paymentsData.failMockPayment(orderId, appUserId, reason));
    }
    if (
      segments[0] === "driver" &&
      segments[1] === "delivery" &&
      segments[2] === "assignments" &&
      segments[4] === "accept" &&
      segments.length === 5
    ) {
      const driverAuth = await requireDeliveryDriver(req);
      if ("error" in driverAuth) return driverAuth.error;
      const assignmentId = segments[3];
      return NextResponse.json(
        await deliveryData.acceptAssignment(driverAuth.appUserId, assignmentId),
      );
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 2) {
      return NextResponse.json(await vendorProductsData.createProduct(ownerId, body as never));
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "variants" &&
      segments.length === 4
    ) {
      const productId = segments[2];
      return NextResponse.json(await vendorProductsData.addVariant(ownerId, productId, body as never));
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "images" &&
      segments.length === 4
    ) {
      const productId = segments[2];
      return NextResponse.json(await vendorProductsData.addImage(ownerId, productId, body as never));
    }

    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];

  const authUser = await requireBearerUser(req);
  if ("error" in authUser) return authUser.error;
  const { appUserId } = authUser;

  let body: unknown;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (segments[0] === "cart" && segments[1] === "items" && segments.length === 3) {
      return NextResponse.json(
        await cartData.updateItem(appUserId, segments[2], body as never),
      );
    }

    if (
      segments[0] === "driver" &&
      segments[1] === "delivery" &&
      segments[2] === "assignments" &&
      segments.length === 4
    ) {
      const driverAuth = await requireDeliveryDriver(req);
      if ("error" in driverAuth) return driverAuth.error;
      return NextResponse.json(
        await deliveryData.updateAssignmentStatus(
          driverAuth.appUserId,
          segments[3],
          body as never,
          "driver",
        ),
      );
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "orders" && segments[2] === "items" && segments[4] === "ready-for-pickup" && segments.length === 5) {
      const orderItemId = segments[3];
      return NextResponse.json(await vendorOrdersData.markOrderItemReady(ownerId, orderItemId));
    }
    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 3) {
      const productId = segments[2];
      return NextResponse.json(await vendorProductsData.updateProduct(ownerId, productId, body as never));
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "variants" &&
      segments.length === 5
    ) {
      const productId = segments[2];
      const variantId = segments[4];
      return NextResponse.json(
        await vendorProductsData.updateVariant(ownerId, productId, variantId, body as never),
      );
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];

  const authUser = await requireBearerUser(req);
  if ("error" in authUser) return authUser.error;
  const { appUserId } = authUser;

  try {
    if (segments[0] === "cart" && segments[1] === "items" && segments.length === 3) {
      return NextResponse.json(await cartData.removeItem(appUserId, segments[2]));
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 3) {
      const productId = segments[2];
      return NextResponse.json(await vendorProductsData.archiveProduct(ownerId, productId));
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "variants" &&
      segments.length === 5
    ) {
      const productId = segments[2];
      const variantId = segments[4];
      return NextResponse.json(
        await vendorProductsData.deleteVariant(ownerId, productId, variantId),
      );
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "images" &&
      segments.length === 5
    ) {
      const productId = segments[2];
      const imageId = segments[4];
      return NextResponse.json(await vendorProductsData.deleteImage(ownerId, productId, imageId));
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}
