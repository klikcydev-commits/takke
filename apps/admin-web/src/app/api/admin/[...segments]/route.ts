import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PRODUCT_STATUSES = ["DRAFT", "PENDING", "ACTIVE", "ARCHIVED"] as const;
type ProductStatus = (typeof PRODUCT_STATUSES)[number];

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

let envLoaded = false;
function ensureAdminApiEnvLoaded() {
  if (envLoaded) return;
  envLoaded = true;
  const dev = process.env.NODE_ENV !== "production";
  const cwd = process.cwd();
  const roots = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "..", "..")];
  for (const root of roots) {
    try {
      loadEnvConfig(root, dev);
    } catch {
      /* ignore */
    }
  }
}

function getConfig() {
  ensureAdminApiEnvLoaded();
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
    throw new Error("Supabase environment variables are missing for admin API.");
  }
  return { url, anon, service };
}

function getServiceClient() {
  const { url, service } = getConfig();
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveRequestUser(req: NextRequest): Promise<{
  authUserId: string;
  appUserId: string;
  roles: string[];
}> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = auth.slice(7);
  const { url, anon } = getConfig();
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.id) throw new Error("Unauthorized");
  const sb = getServiceClient();
  const { data: user, error: userErr } = await sb
    .from("User")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (userErr) throw new Error(userErr.message);
  if (!user?.id) throw new Error("No linked marketplace profile for this account.");

  const { data: roleLinks, error: linksErr } = await sb
    .from("UserRoleAssignment")
    .select("roleId")
    .eq("userId", user.id);
  if (linksErr) throw new Error(linksErr.message);
  const roleIds = (roleLinks ?? []).map((r) => r.roleId);
  let roles: string[] = [];
  if (roleIds.length > 0) {
    const { data: roleRows, error: rolesErr } = await sb
      .from("Role")
      .select("name")
      .in("id", roleIds);
    if (rolesErr) throw new Error(rolesErr.message);
    roles = (roleRows ?? []).map((r) => r.name);
  }

  return { authUserId: data.user.id, appUserId: user.id, roles };
}

async function requireAdmin(req: NextRequest) {
  let user: { appUserId: string; roles: string[] };
  try {
    user = await resolveRequestUser(req);
  } catch {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (!user.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN")) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return { appUserId: user.appUserId };
}

async function tryInsertNotification(payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
}) {
  try {
    const sb = getServiceClient();
    await sb.from("Notification").insert({
      id: crypto.randomUUID(),
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });
  } catch {
    // Keep admin actions resilient if notification table differs.
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const sb = getServiceClient();

  try {
    if (segments.length === 1 && segments[0] === "overview") {
      const [usersRes, storesRes, ordersRes, pendingStoreRes, pendingDriverRes, openDisputesRes] =
        await Promise.all([
          sb.from("User").select("id", { count: "exact", head: true }),
          sb.from("Store").select("id", { count: "exact", head: true }),
          sb.from("Order").select("id", { count: "exact", head: true }),
          sb
            .from("Store")
            .select("id", { count: "exact", head: true })
            .in("status", ["PENDING", "INFO_REQUESTED"]),
          sb
            .from("DriverApplication")
            .select("id", { count: "exact", head: true })
            .in("status", ["PENDING", "INFO_REQUESTED"]),
          sb.from("Dispute").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
        ]);
      for (const res of [usersRes, storesRes, ordersRes, pendingStoreRes, pendingDriverRes, openDisputesRes]) {
        if (res.error) throw new Error(res.error.message);
      }
      return NextResponse.json({
        users: usersRes.count ?? 0,
        stores: storesRes.count ?? 0,
        orders: ordersRes.count ?? 0,
        pendingStoreApplications: pendingStoreRes.count ?? 0,
        pendingDriverApplications: pendingDriverRes.count ?? 0,
        openDisputes: openDisputesRes.count ?? 0,
      });
    }
    if (segments.length === 1 && segments[0] === "users") {
      const { data: users, error } = await sb.from("User").select("*").order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const userIds = (users ?? []).map((u) => u.id);
      const [{ data: profiles }, { data: links }] = await Promise.all([
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserRoleAssignment").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
      ]);
      const roleIds = [...new Set((links ?? []).map((l) => l.roleId))];
      const { data: roles } = roleIds.length
        ? await sb.from("Role").select("*").in("id", roleIds)
        : { data: [] };
      const roleById = new Map((roles ?? []).map((r) => [r.id, r]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      const linksByUserId = new Map<string, unknown[]>();
      for (const link of links ?? []) {
        const arr = linksByUserId.get(link.userId) ?? [];
        arr.push({ ...link, role: roleById.get(link.roleId) ?? null });
        linksByUserId.set(link.userId, arr);
      }
      return NextResponse.json(
        (users ?? []).map((u) => ({
          ...u,
          userProfile: profileByUserId.get(u.id) ?? null,
          roles: linksByUserId.get(u.id) ?? [],
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "stores") {
      const { data: stores, error } = await sb.from("Store").select("*").order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const ownerIds = [...new Set((stores ?? []).map((s) => s.ownerId))];
      const storeIds = (stores ?? []).map((s) => s.id);
      const [{ data: owners }, { data: profiles }, { data: ownerProfiles }] = await Promise.all([
        ownerIds.length ? sb.from("User").select("id,email").in("id", ownerIds) : Promise.resolve({ data: [] }),
        storeIds.length ? sb.from("StoreProfile").select("*").in("storeId", storeIds) : Promise.resolve({ data: [] }),
        ownerIds.length
          ? sb.from("UserProfile").select("userId,firstName,lastName,avatarUrl").in("userId", ownerIds)
          : Promise.resolve({ data: [] }),
      ]);
      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));
      const ownerProfileByUserId = new Map((ownerProfiles ?? []).map((p) => [p.userId, p]));
      const profileByStoreId = new Map((profiles ?? []).map((p) => [p.storeId, p]));
      return NextResponse.json(
        (stores ?? []).map((s) => ({
          ...s,
          owner: {
            email: ownerById.get(s.ownerId)?.email ?? "",
            userProfile: ownerProfileByUserId.get(s.ownerId) ?? null,
          },
          profile: profileByStoreId.get(s.id) ?? null,
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "drivers") {
      const { data: drivers, error } = await sb.from("Driver").select("*").order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const userIds = [...new Set((drivers ?? []).map((d) => d.userId))];
      const [{ data: users }, { data: profiles }] = await Promise.all([
        userIds.length ? sb.from("User").select("id,email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
      ]);
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      return NextResponse.json(
        (drivers ?? []).map((d) => ({
          ...d,
          user: {
            email: userById.get(d.userId)?.email ?? "",
            userProfile: profileByUserId.get(d.userId) ?? null,
          },
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "orders") {
      const { data: orders, error } = await sb.from("Order").select("*").order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const orderIds = (orders ?? []).map((o) => o.id);
      const customerIds = [...new Set((orders ?? []).map((o) => o.customerId))];
      const [{ data: customers }, { data: customerProfiles }, { data: items }, { data: payments }] =
        await Promise.all([
          customerIds.length ? sb.from("User").select("id,email").in("id", customerIds) : Promise.resolve({ data: [] }),
          customerIds.length ? sb.from("UserProfile").select("*").in("userId", customerIds) : Promise.resolve({ data: [] }),
          orderIds.length ? sb.from("OrderItem").select("*").in("orderId", orderIds) : Promise.resolve({ data: [] }),
          orderIds.length ? sb.from("Payment").select("*").in("orderId", orderIds) : Promise.resolve({ data: [] }),
        ]);
      const storeIds = [...new Set((items ?? []).map((i) => i.storeId))];
      const { data: stores } = storeIds.length
        ? await sb.from("Store").select("*").in("id", storeIds)
        : { data: [] };
      const customerById = new Map((customers ?? []).map((c) => [c.id, c]));
      const customerProfileById = new Map((customerProfiles ?? []).map((p) => [p.userId, p]));
      const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
      const itemsByOrder = new Map<string, unknown[]>();
      for (const i of items ?? []) {
        const arr = itemsByOrder.get(i.orderId) ?? [];
        arr.push({ ...i, store: storeById.get(i.storeId) ?? null });
        itemsByOrder.set(i.orderId, arr);
      }
      const paymentByOrder = new Map((payments ?? []).map((p) => [p.orderId, p]));
      return NextResponse.json(
        (orders ?? []).map((o) => ({
          ...o,
          customer: {
            email: customerById.get(o.customerId)?.email ?? "",
            userProfile: customerProfileById.get(o.customerId) ?? null,
          },
          items: itemsByOrder.get(o.id) ?? [],
          payment: paymentByOrder.get(o.id) ?? null,
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "audit-logs") {
      const { data: logs, error } = await sb
        .from("AdminAuditLog")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const adminIds = [...new Set((logs ?? []).map((l) => l.adminId))];
      const [{ data: admins }, { data: profiles }] = await Promise.all([
        adminIds.length ? sb.from("User").select("id,email").in("id", adminIds) : Promise.resolve({ data: [] }),
        adminIds.length ? sb.from("UserProfile").select("*").in("userId", adminIds) : Promise.resolve({ data: [] }),
      ]);
      const adminById = new Map((admins ?? []).map((a) => [a.id, a]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      return NextResponse.json(
        (logs ?? []).map((l) => ({
          ...l,
          admin: {
            email: adminById.get(l.adminId)?.email ?? "",
            userProfile: profileByUserId.get(l.adminId) ?? null,
          },
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "disputes") {
      const { data: disputes, error } = await sb
        .from("Dispute")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const orderIds = [...new Set((disputes ?? []).map((d) => d.orderId))];
      const userIds = [...new Set((disputes ?? []).map((d) => d.userId))];
      const [{ data: orders }, { data: users }, { data: profiles }] = await Promise.all([
        orderIds.length
          ? sb.from("Order").select("id,orderNumber,totalAmount,currentStatus").in("id", orderIds)
          : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("User").select("id,email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
      ]);
      const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      return NextResponse.json(
        (disputes ?? []).map((d) => ({
          ...d,
          order: orderById.get(d.orderId) ?? null,
          user: {
            email: userById.get(d.userId)?.email ?? "",
            userProfile: profileByUserId.get(d.userId) ?? null,
          },
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "notifications") {
      const { data: rows, error } = await sb
        .from("Notification")
        .select("*")
        .order("createdAt", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      const userIds = [...new Set((rows ?? []).map((n) => n.userId))];
      const [{ data: users }, { data: profiles }] = await Promise.all([
        userIds.length ? sb.from("User").select("id,email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
      ]);
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      return NextResponse.json(
        (rows ?? []).map((n) => ({
          ...n,
          user: {
            email: userById.get(n.userId)?.email ?? "",
            userProfile: profileByUserId.get(n.userId) ?? null,
          },
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "delivery-assignments") {
      const { data: assignments, error } = await sb
        .from("DeliveryAssignment")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const assignmentIds = (assignments ?? []).map((a) => a.id);
      const driverIds = [...new Set((assignments ?? []).map((a) => a.driverId).filter(Boolean))];
      const [{ data: links }, { data: tracking }, { data: drivers }] = await Promise.all([
        assignmentIds.length
          ? sb.from("DeliveryAssignmentItem").select("*").in("assignmentId", assignmentIds)
          : Promise.resolve({ data: [] }),
        assignmentIds.length
          ? sb.from("DeliveryTrackingUpdate").select("*").in("assignmentId", assignmentIds).order("createdAt", { ascending: false })
          : Promise.resolve({ data: [] }),
        driverIds.length ? sb.from("Driver").select("*").in("id", driverIds) : Promise.resolve({ data: [] }),
      ]);
      const driverUserIds = [...new Set((drivers ?? []).map((d) => d.userId))];
      const [{ data: users }, { data: userProfiles }, { data: orderItems }] = await Promise.all([
        driverUserIds.length ? sb.from("User").select("id,email").in("id", driverUserIds) : Promise.resolve({ data: [] }),
        driverUserIds.length ? sb.from("UserProfile").select("*").in("userId", driverUserIds) : Promise.resolve({ data: [] }),
        (links ?? []).length
          ? sb.from("OrderItem").select("*").in("id", (links ?? []).map((l) => l.orderItemId))
          : Promise.resolve({ data: [] }),
      ]);
      const storeIds = [...new Set((orderItems ?? []).map((oi) => oi.storeId))];
      const variantIds = [...new Set((orderItems ?? []).map((oi) => oi.productVariantId))];
      const [{ data: stores }, { data: variants }] = await Promise.all([
        storeIds.length ? sb.from("Store").select("*").in("id", storeIds) : Promise.resolve({ data: [] }),
        variantIds.length ? sb.from("ProductVariant").select("*").in("id", variantIds) : Promise.resolve({ data: [] }),
      ]);
      const productIds = [...new Set((variants ?? []).map((v) => v.productId))];
      const { data: products } = productIds.length
        ? await sb.from("Product").select("id,title,slug").in("id", productIds)
        : { data: [] };
      const trackingByAssignment = new Map<string, unknown[]>();
      for (const t of tracking ?? []) {
        const arr = trackingByAssignment.get(t.assignmentId) ?? [];
        if (arr.length < 20) arr.push(t);
        trackingByAssignment.set(t.assignmentId, arr);
      }
      const orderItemById = new Map((orderItems ?? []).map((oi) => [oi.id, oi]));
      const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
      const productById = new Map((products ?? []).map((p) => [p.id, p]));
      const variantById = new Map(
        (variants ?? []).map((v) => [v.id, { ...v, product: productById.get(v.productId) ?? null }]),
      );
      const linksByAssignment = new Map<string, unknown[]>();
      for (const link of links ?? []) {
        const oi = orderItemById.get(link.orderItemId);
        const arr = linksByAssignment.get(link.assignmentId) ?? [];
        arr.push({
          ...link,
          orderItem: oi
            ? {
                ...oi,
                store: storeById.get(oi.storeId) ?? null,
                variant: variantById.get(oi.productVariantId) ?? null,
              }
            : null,
        });
        linksByAssignment.set(link.assignmentId, arr);
      }
      const driverById = new Map((drivers ?? []).map((d) => [d.id, d]));
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((userProfiles ?? []).map((p) => [p.userId, p]));
      return NextResponse.json(
        (assignments ?? []).map((a) => {
          const driver = a.driverId ? driverById.get(a.driverId) : null;
          return {
            ...a,
            driver: driver
              ? {
                  ...driver,
                  user: {
                    email: userById.get(driver.userId)?.email ?? "",
                    userProfile: profileByUserId.get(driver.userId) ?? null,
                  },
                }
              : null,
            items: linksByAssignment.get(a.id) ?? [],
            tracking: trackingByAssignment.get(a.id) ?? [],
          };
        }),
      );
    }
    if (segments.length === 1 && segments[0] === "products") {
      const { data: products, error } = await sb
        .from("Product")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const storeIds = [...new Set((products ?? []).map((p) => p.storeId))];
      const categoryIds = [...new Set((products ?? []).map((p) => p.categoryId))];
      const productIds = (products ?? []).map((p) => p.id);
      const [{ data: stores }, { data: categories }, { data: variants }] = await Promise.all([
        storeIds.length ? sb.from("Store").select("id,name,slug").in("id", storeIds) : Promise.resolve({ data: [] }),
        categoryIds.length ? sb.from("ProductCategory").select("*").in("id", categoryIds) : Promise.resolve({ data: [] }),
        productIds.length ? sb.from("ProductVariant").select("*").in("productId", productIds) : Promise.resolve({ data: [] }),
      ]);
      const variantIds = (variants ?? []).map((v) => v.id);
      const { data: inventories } = variantIds.length
        ? await sb.from("Inventory").select("*").in("productVariantId", variantIds)
        : { data: [] };
      const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
      const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
      const inventoryByVariantId = new Map((inventories ?? []).map((i) => [i.productVariantId, i]));
      const variantsByProduct = new Map<string, unknown[]>();
      for (const v of variants ?? []) {
        const arr = variantsByProduct.get(v.productId) ?? [];
        arr.push({ ...v, inventory: inventoryByVariantId.get(v.id) ?? null });
        variantsByProduct.set(v.productId, arr);
      }
      return NextResponse.json(
        (products ?? []).map((p) => ({
          ...p,
          store: storeById.get(p.storeId) ?? null,
          category: categoryById.get(p.categoryId) ?? null,
          variants: variantsByProduct.get(p.id) ?? [],
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "payouts") {
      const { data: payouts, error } = await sb
        .from("VendorPayout")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const payoutIds = (payouts ?? []).map((p) => p.id);
      const storeIds = [...new Set((payouts ?? []).map((p) => p.storeId))];
      const [{ data: stores }, { data: items }] = await Promise.all([
        storeIds.length ? sb.from("Store").select("id,name,slug").in("id", storeIds) : Promise.resolve({ data: [] }),
        payoutIds.length ? sb.from("PayoutItem").select("*").in("payoutId", payoutIds) : Promise.resolve({ data: [] }),
      ]);
      const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
      const itemsByPayout = new Map<string, unknown[]>();
      for (const item of items ?? []) {
        const arr = itemsByPayout.get(item.payoutId) ?? [];
        arr.push(item);
        itemsByPayout.set(item.payoutId, arr);
      }
      return NextResponse.json(
        (payouts ?? []).map((p) => ({
          ...p,
          store: storeById.get(p.storeId) ?? null,
          items: itemsByPayout.get(p.id) ?? [],
        })),
      );
    }
    if (segments.length === 1 && segments[0] === "refund-requests") {
      const { data: rows, error } = await sb
        .from("RefundRequest")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const userIds = [...new Set((rows ?? []).map((r) => r.userId))];
      const orderItemIds = [...new Set((rows ?? []).map((r) => r.orderItemId))];
      const [{ data: users }, { data: profiles }, { data: orderItems }] = await Promise.all([
        userIds.length ? sb.from("User").select("id,email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
        orderItemIds.length ? sb.from("OrderItem").select("*").in("id", orderItemIds) : Promise.resolve({ data: [] }),
      ]);
      const orderIds = [...new Set((orderItems ?? []).map((oi) => oi.orderId))];
      const storeIds = [...new Set((orderItems ?? []).map((oi) => oi.storeId))];
      const variantIds = [...new Set((orderItems ?? []).map((oi) => oi.productVariantId))];
      const [{ data: orders }, { data: stores }, { data: variants }] = await Promise.all([
        orderIds.length ? sb.from("Order").select("id,orderNumber").in("id", orderIds) : Promise.resolve({ data: [] }),
        storeIds.length ? sb.from("Store").select("*").in("id", storeIds) : Promise.resolve({ data: [] }),
        variantIds.length ? sb.from("ProductVariant").select("*").in("id", variantIds) : Promise.resolve({ data: [] }),
      ]);
      const pids = [...new Set((variants ?? []).map((v) => v.productId))];
      const { data: products } = pids.length
        ? await sb.from("Product").select("id,title").in("id", pids)
        : { data: [] };
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
      const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
      const productById = new Map((products ?? []).map((p) => [p.id, p]));
      const variantById = new Map(
        (variants ?? []).map((v) => [v.id, { ...v, product: productById.get(v.productId) ?? null }]),
      );
      const orderItemById = new Map((orderItems ?? []).map((oi) => [oi.id, oi]));
      return NextResponse.json(
        (rows ?? []).map((r) => {
          const oi = orderItemById.get(r.orderItemId);
          return {
            ...r,
            user: {
              email: userById.get(r.userId)?.email ?? "",
              userProfile: profileByUserId.get(r.userId) ?? null,
            },
            orderItem: oi
              ? {
                  ...oi,
                  order: orderById.get(oi.orderId) ?? null,
                  store: storeById.get(oi.storeId) ?? null,
                  variant: variantById.get(oi.productVariantId) ?? null,
                }
              : null,
          };
        }),
      );
    }
    if (segments.length === 1 && segments[0] === "return-requests") {
      const { data: rows, error } = await sb
        .from("ReturnRequest")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const userIds = [...new Set((rows ?? []).map((r) => r.userId))];
      const orderItemIds = [...new Set((rows ?? []).map((r) => r.orderItemId))];
      const [{ data: users }, { data: profiles }, { data: orderItems }] = await Promise.all([
        userIds.length ? sb.from("User").select("id,email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
        orderItemIds.length ? sb.from("OrderItem").select("*").in("id", orderItemIds) : Promise.resolve({ data: [] }),
      ]);
      const orderIds = [...new Set((orderItems ?? []).map((oi) => oi.orderId))];
      const { data: orders } = orderIds.length
        ? await sb.from("Order").select("id,orderNumber").in("id", orderIds)
        : { data: [] };
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
      const orderItemById = new Map((orderItems ?? []).map((oi) => [oi.id, oi]));
      return NextResponse.json(
        (rows ?? []).map((r) => {
          const oi = orderItemById.get(r.orderItemId);
          return {
            ...r,
            user: {
              email: userById.get(r.userId)?.email ?? "",
              userProfile: profileByUserId.get(r.userId) ?? null,
            },
            orderItem: oi ? { ...oi, order: orderById.get(oi.orderId) ?? null } : null,
          };
        }),
      );
    }
    if (
      segments.length === 3 &&
      segments[0] === "applications" &&
      segments[1] === "stores" &&
      segments[2] === "pending"
    ) {
      const { data: stores, error } = await sb
        .from("Store")
        .select("*")
        .in("status", ["PENDING", "INFO_REQUESTED"])
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const ownerIds = [...new Set((stores ?? []).map((s) => s.ownerId))];
      const storeIds = (stores ?? []).map((s) => s.id);
      const [{ data: owners }, { data: ownerProfiles }, { data: storeProfiles }] = await Promise.all([
        ownerIds.length ? sb.from("User").select("id,email").in("id", ownerIds) : Promise.resolve({ data: [] }),
        ownerIds.length ? sb.from("UserProfile").select("*").in("userId", ownerIds) : Promise.resolve({ data: [] }),
        storeIds.length ? sb.from("StoreProfile").select("*").in("storeId", storeIds) : Promise.resolve({ data: [] }),
      ]);
      const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));
      const ownerProfileByUserId = new Map((ownerProfiles ?? []).map((p) => [p.userId, p]));
      const profileByStoreId = new Map((storeProfiles ?? []).map((p) => [p.storeId, p]));
      return NextResponse.json(
        (stores ?? []).map((s) => ({
          ...s,
          profile: profileByStoreId.get(s.id) ?? null,
          owner: {
            email: ownerById.get(s.ownerId)?.email ?? "",
            userProfile: ownerProfileByUserId.get(s.ownerId) ?? null,
          },
        })),
      );
    }
    if (
      segments.length === 3 &&
      segments[0] === "applications" &&
      segments[1] === "drivers" &&
      segments[2] === "pending"
    ) {
      const { data: rows, error } = await sb
        .from("DriverApplication")
        .select("*")
        .in("status", ["PENDING", "INFO_REQUESTED"])
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      const userIds = [...new Set((rows ?? []).map((r) => r.userId))];
      const [{ data: users }, { data: profiles }] = await Promise.all([
        userIds.length ? sb.from("User").select("id,email").in("id", userIds) : Promise.resolve({ data: [] }),
        userIds.length ? sb.from("UserProfile").select("*").in("userId", userIds) : Promise.resolve({ data: [] }),
      ]);
      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
      return NextResponse.json(
        (rows ?? []).map((r) => ({
          ...r,
          user: {
            email: userById.get(r.userId)?.email ?? "",
            userProfile: profileByUserId.get(r.userId) ?? null,
          },
        })),
      );
    }
    if (
      segments.length === 3 &&
      segments[0] === "applications" &&
      segments[1] === "drivers"
    ) {
      const id = segments[2];
      const { data: app, error } = await sb.from("DriverApplication").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!app) return NextResponse.json({ message: "Application not found" }, { status: 404 });
      const [{ data: user }, { data: profile }] = await Promise.all([
        sb.from("User").select("id,email").eq("id", app.userId).maybeSingle(),
        sb.from("UserProfile").select("*").eq("userId", app.userId).maybeSingle(),
      ]);
      return NextResponse.json({
        ...app,
        user: {
          email: user?.email ?? "",
          userProfile: profile ?? null,
        },
      });
    }
    if (segments.length === 2 && segments[0] === "stores") {
      const id = segments[1];
      const { data: store, error } = await sb.from("Store").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 });
      const [{ data: profile }, { data: owner }, { data: ownerProfile }, { data: docs }] =
        await Promise.all([
          sb.from("StoreProfile").select("*").eq("storeId", id).maybeSingle(),
          sb.from("User").select("id,email").eq("id", store.ownerId).maybeSingle(),
          sb.from("UserProfile").select("*").eq("userId", store.ownerId).maybeSingle(),
          sb.from("StoreDoc").select("*").eq("storeId", id),
        ]);
      return NextResponse.json({
        ...store,
        profile: profile ?? null,
        documents: docs ?? [],
        owner: {
          email: owner?.email ?? "",
          userProfile: ownerProfile ?? null,
        },
      });
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
  const sb = getServiceClient();

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
      const status = dto.status as "APPROVED" | "REJECTED" | "INFO_REQUESTED";
      const { data: store } = await sb.from("Store").select("id,ownerId,status").eq("id", storeId).maybeSingle();
      if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 });
      const { error: usErr } = await sb
        .from("Store")
        .update({ status, updatedAt: new Date().toISOString() })
        .eq("id", storeId);
      if (usErr) throw new Error(usErr.message);
      const { data: app } = await sb
        .from("StoreApplication")
        .select("*")
        .eq("storeId", storeId)
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (app?.id) {
        await sb
          .from("StoreApplication")
          .update({
            status,
            reviewedBy: appUserId,
            notes: dto.adminNotes ?? null,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", app.id);
        await sb.from("StoreApplicationStatusHistory").insert({
          id: crypto.randomUUID(),
          applicationId: app.id,
          status,
          notes: dto.adminNotes ?? null,
        });
      }
      const { data: storeOwnerRole } = await sb
        .from("Role")
        .select("id")
        .eq("name", "STORE_OWNER")
        .maybeSingle();
      if (status === "APPROVED" && storeOwnerRole?.id) {
        await sb.from("UserRoleAssignment").upsert(
          {
            id: crypto.randomUUID(),
            userId: store.ownerId,
            roleId: storeOwnerRole.id,
          },
          { onConflict: "userId,roleId" },
        );
        await sb
          .from("User")
          .update({ onboardingStatus: "APPROVED", updatedAt: new Date().toISOString() })
          .eq("id", store.ownerId);
      } else if (status === "INFO_REQUESTED") {
        await sb
          .from("User")
          .update({ onboardingStatus: "PENDING", updatedAt: new Date().toISOString() })
          .eq("id", store.ownerId);
      }
      await sb.from("AdminAuditLog").insert({
        id: crypto.randomUUID(),
        adminId: appUserId,
        action: `REVIEW_STORE_${status}`,
        entity: "Store",
        entityId: storeId,
        newData: dto,
      });
      await tryInsertNotification({
        userId: store.ownerId,
        title: `Application ${status}`,
        message:
          status === "APPROVED"
            ? "Your store has been approved! You can now access your dashboard."
            : `Your application was ${status.toLowerCase()}. Notes: ${dto.adminNotes || "None"}`,
        type: "APPLICATION_STATUS",
      });
      const { data: updated } = await sb.from("Store").select("*").eq("id", storeId).single();
      return NextResponse.json(updated);
    }
    if (
      segments.length === 4 &&
      segments[0] === "applications" &&
      segments[1] === "drivers" &&
      segments[3] === "review"
    ) {
      const applicationId = segments[2];
      const dto = body as { status?: string; adminNotes?: string };
      const status = dto.status as "APPROVED" | "REJECTED" | "INFO_REQUESTED";
      const { data: app } = await sb
        .from("DriverApplication")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();
      if (!app) return NextResponse.json({ message: "Application not found" }, { status: 404 });
      await sb
        .from("DriverApplication")
        .update({
          status,
          reviewedBy: appUserId,
          adminNotes: dto.adminNotes ?? null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", applicationId);
      await sb.from("DriverApplicationStatusHistory").insert({
        id: crypto.randomUUID(),
        applicationId,
        status,
        notes: dto.adminNotes ?? null,
      });
      if (status === "INFO_REQUESTED") {
        await sb
          .from("User")
          .update({ onboardingStatus: "PENDING", updatedAt: new Date().toISOString() })
          .eq("id", app.userId);
      } else if (status === "APPROVED") {
        const { data: role } = await sb
          .from("Role")
          .select("id")
          .eq("name", "DELIVERY_DRIVER")
          .maybeSingle();
        if (role?.id) {
          await sb.from("UserRoleAssignment").upsert(
            {
              id: crypto.randomUUID(),
              userId: app.userId,
              roleId: role.id,
            },
            { onConflict: "userId,roleId" },
          );
        }
        await sb.from("Driver").upsert(
          {
            id: crypto.randomUUID(),
            userId: app.userId,
            vehicleType: app.vehicleType,
            licensePlate: app.licensePlate,
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
          { onConflict: "userId" },
        );
        await sb
          .from("User")
          .update({ onboardingStatus: "APPROVED", updatedAt: new Date().toISOString() })
          .eq("id", app.userId);
      }
      await sb.from("AdminAuditLog").insert({
        id: crypto.randomUUID(),
        adminId: appUserId,
        action: `REVIEW_DRIVER_${status}`,
        entity: "DriverApplication",
        entityId: applicationId,
        newData: dto,
      });
      await tryInsertNotification({
        userId: app.userId,
        title: `Application ${status}`,
        message:
          status === "APPROVED"
            ? "Your driver application has been approved! Welcome to the fleet."
            : `Your application was ${status.toLowerCase()}. Reason: ${dto.adminNotes || "None"}`,
        type: "APPLICATION_STATUS",
      });
      const { data: updated } = await sb
        .from("DriverApplication")
        .select("*")
        .eq("id", applicationId)
        .single();
      return NextResponse.json(updated);
    }
    if (
      segments.length === 2 &&
      segments[0] === "delivery" &&
      segments[1] === "assignments"
    ) {
      const dto = body as { orderItemIds: string[]; driverId?: string };
      const orderItemIds = dto.orderItemIds ?? [];
      if (!orderItemIds.length) {
        return NextResponse.json({ message: "orderItemIds are required" }, { status: 400 });
      }
      const { data: items, error: iErr } = await sb
        .from("OrderItem")
        .select("*")
        .in("id", orderItemIds);
      if (iErr) throw new Error(iErr.message);
      if ((items ?? []).length !== orderItemIds.length) {
        return NextResponse.json({ message: "Some order items not found" }, { status: 400 });
      }
      const stores = [...new Set((items ?? []).map((i) => i.storeId))];
      if (stores.length !== 1) {
        return NextResponse.json(
          { message: "Assignment must target items from a single store" },
          { status: 400 },
        );
      }
      for (const i of items ?? []) {
        if (i.currentStatus !== "READY_FOR_PICKUP") {
          return NextResponse.json(
            { message: `Order item ${i.id} must be READY_FOR_PICKUP (is ${i.currentStatus})` },
            { status: 400 },
          );
        }
      }
      if (dto.driverId) {
        const { data: driver } = await sb.from("Driver").select("id,isActive").eq("id", dto.driverId).maybeSingle();
        if (!driver?.isActive) {
          return NextResponse.json({ message: "Invalid driver" }, { status: 400 });
        }
      }
      const assignmentId = crypto.randomUUID();
      await sb.from("DeliveryAssignment").insert({
        id: assignmentId,
        driverId: dto.driverId ?? null,
        status: "ASSIGNED",
        updatedAt: new Date().toISOString(),
      });
      for (const id of orderItemIds) {
        await sb.from("DeliveryAssignmentItem").insert({
          id: crypto.randomUUID(),
          assignmentId,
          orderItemId: id,
        });
      }
      await sb.from("DeliveryTrackingUpdate").insert({
        id: crypto.randomUUID(),
        assignmentId,
        status: "ASSIGNED",
        notes: `created by admin ${appUserId}`,
      });
      await sb.from("AdminAuditLog").insert({
        id: crypto.randomUUID(),
        adminId: appUserId,
        action: "CREATE_DELIVERY_ASSIGNMENT",
        entity: "DeliveryAssignment",
        entityId: assignmentId,
        newData: dto,
      });
      const [{ data: assignment }, { data: links }, { data: driver }] = await Promise.all([
        sb.from("DeliveryAssignment").select("*").eq("id", assignmentId).single(),
        sb.from("DeliveryAssignmentItem").select("*").eq("assignmentId", assignmentId),
        dto.driverId
          ? sb.from("Driver").select("*").eq("id", dto.driverId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return NextResponse.json({
        ...assignment,
        items: (links ?? []).map((l) => ({
          ...l,
          orderItem: (items ?? []).find((oi) => oi.id === l.orderItemId) ?? null,
        })),
        driver: driver ?? null,
      });
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
  const sb = getServiceClient();

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
      if (!status || !PRODUCT_STATUSES.includes(status)) {
        return NextResponse.json({ message: "Invalid status" }, { status: 400 });
      }
      const { data: product } = await sb.from("Product").select("*").eq("id", productId).maybeSingle();
      if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });
      await sb
        .from("Product")
        .update({ status, updatedAt: new Date().toISOString() })
        .eq("id", productId);
      await sb.from("ProductStatusHistory").insert({
        id: crypto.randomUUID(),
        productId,
        status,
        notes: `admin ${appUserId}${notes ? `: ${notes}` : ""}`,
      });
      await sb.from("AdminAuditLog").insert({
        id: crypto.randomUUID(),
        adminId: appUserId,
        action: "MODERATE_PRODUCT",
        entity: "Product",
        entityId: productId,
        oldData: { status: product.status },
        newData: { status, notes },
      });
      const [{ data: updated }, { data: store }, { data: category }] = await Promise.all([
        sb.from("Product").select("*").eq("id", productId).single(),
        sb.from("Store").select("id,name,slug").eq("id", product.storeId).maybeSingle(),
        sb.from("ProductCategory").select("*").eq("id", product.categoryId).maybeSingle(),
      ]);
      return NextResponse.json({
        ...updated,
        store: store ?? null,
        category: category ?? null,
      });
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    const msg = errMessage(e);
    return NextResponse.json({ message: msg }, { status: msg === "Product not found" ? 404 : 500 });
  }
}
