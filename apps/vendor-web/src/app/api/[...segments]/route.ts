// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";
import { resolveMarketplaceAccess } from "@/lib/access/resolveMarketplaceAccess";

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
  if (!url || !anon || !service) {
    throw new Error("Supabase environment variables are missing.");
  }
  return { url, anon, service };
}

async function resolveRequestUser(req: NextRequest): Promise<{
  authUserId: string;
  appUserId: string;
  roles: string[];
}> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = auth.slice(7);
  const { url, anon, service } = getConfig();
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.id) throw new Error("Unauthorized");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: userErr } = await admin
    .from("User")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (userErr) throw new Error(userErr.message);
  if (!user?.id) throw new Error("No linked marketplace profile for this account.");

  const access = await resolveMarketplaceAccess(data.user.id);
  return {
    authUserId: data.user.id,
    appUserId: user.id,
    roles: access?.roles ?? [],
  };
}

async function requireBearerUser(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    return { appUserId: user.appUserId, roles: user.roles };
  } catch (e) {
    const message = errMessage(e);
    const status = message === "Unauthorized" ? 401 : 403;
    return { error: NextResponse.json({ message }, { status }) };
  }
}

async function requireStoreOwner(req: NextRequest) {
  const base = await requireBearerUser(req);
  if ("error" in base) return base;
  if (!base.roles.includes("STORE_OWNER")) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

async function requireDeliveryDriver(req: NextRequest) {
  const base = await requireBearerUser(req);
  if ("error" in base) return base;
  if (!base.roles.includes("DELIVERY_DRIVER")) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return base;
}

async function listCatalogCategories() {
  const { url, service } = getConfig();
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("ProductCategory")
    .select("id, name, slug, parentId")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function listCatalogProducts(storeId?: string, take = "24") {
  const { url, service } = getConfig();
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const n = Math.min(100, Math.max(1, Number.parseInt(take, 10) || 24));
  let query = sb
    .from("Product")
    .select(
      "id, storeId, categoryId, title, slug, status, updatedAt, deletedAt, Store:storeId(id,name,slug), ProductCategory:categoryId(id,name,slug)",
    )
    .is("deletedAt", null)
    .eq("status", "ACTIVE")
    .order("updatedAt", { ascending: false })
    .limit(n);
  if (storeId) query = query.eq("storeId", storeId);
  const { data: products, error: productsErr } = await query;
  if (productsErr) throw new Error(productsErr.message);

  const productIds = (products ?? []).map((p) => p.id).filter(Boolean);
  if (productIds.length === 0) return [];

  const { data: images, error: imagesErr } = await sb
    .from("ProductImage")
    .select("*")
    .in("productId", productIds)
    .order("createdAt", { ascending: true });
  if (imagesErr) throw new Error(imagesErr.message);

  const { data: variants, error: variantsErr } = await sb
    .from("ProductVariant")
    .select("*")
    .in("productId", productIds);
  if (variantsErr) throw new Error(variantsErr.message);

  const variantIds = (variants ?? []).map((v) => v.id).filter(Boolean);
  let inventoryByVariant = new Map<string, unknown>();
  if (variantIds.length > 0) {
    const { data: inventoryRows, error: inventoryErr } = await sb
      .from("Inventory")
      .select("*")
      .in("variantId", variantIds);
    if (inventoryErr) throw new Error(inventoryErr.message);
    inventoryByVariant = new Map((inventoryRows ?? []).map((r) => [r.variantId, r]));
  }

  const imagesByProduct = new Map<string, unknown[]>();
  for (const image of images ?? []) {
    const current = imagesByProduct.get(image.productId) ?? [];
    current.push(image);
    imagesByProduct.set(image.productId, current);
  }
  const variantsByProduct = new Map<string, unknown[]>();
  for (const variant of variants ?? []) {
    const current = variantsByProduct.get(variant.productId) ?? [];
    current.push({
      ...variant,
      inventory: inventoryByVariant.get(variant.id) ?? null,
    });
    variantsByProduct.set(variant.productId, current);
  }

  return (products ?? []).map((product) => ({
    ...product,
    store: (product as Record<string, unknown>).Store ?? null,
    category: (product as Record<string, unknown>).ProductCategory ?? null,
    images: (imagesByProduct.get(product.id) ?? []).slice(0, 1),
    variants: variantsByProduct.get(product.id) ?? [],
  }));
}

async function getServiceClient() {
  const { url, service } = getConfig();
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerStore(appUserId: string) {
  const sb = await getServiceClient();
  const { data: store, error } = await sb
    .from("Store")
    .select("id, status, slug, name")
    .eq("ownerId", appUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!store) throw new Error("No store");
  return store;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function ensureUniqueProductSlug(sb: ReturnType<typeof createClient>, title: string): Promise<string> {
  const base = slugify(title) || "product";
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const { data } = await sb.from("Product").select("id").eq("slug", slug).maybeSingle();
    const row = data as { id?: string } | null;
    if (!row?.id) return slug;
    slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 12)}`;
}

async function getProductWithRelations(sb: ReturnType<typeof createClient>, productId: string) {
  const { data: product, error: productErr } = await sb
    .from("Product")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (productErr) throw new Error(productErr.message);
  if (!product) return null;
  const productRow = product as { categoryId?: string | null } & Record<string, unknown>;
  const [{ data: category, error: catErr }, { data: variants, error: varErr }, { data: images, error: imgErr }] =
    await Promise.all([
      sb.from("ProductCategory").select("*").eq("id", productRow.categoryId ?? "").maybeSingle(),
      sb.from("ProductVariant").select("*").eq("productId", productId).order("createdAt", { ascending: true }),
      sb.from("ProductImage").select("*").eq("productId", productId).order("createdAt", { ascending: true }),
    ]);
  if (catErr) throw new Error(catErr.message);
  if (varErr) throw new Error(varErr.message);
  if (imgErr) throw new Error(imgErr.message);
  const variantRows = (variants ?? []) as Array<{ id: string } & Record<string, unknown>>;
  const variantIds = variantRows.map((v) => v.id);
  let inventoryByVariant = new Map<string, unknown>();
  if (variantIds.length > 0) {
    const { data: inventories, error: invErr } = await sb
      .from("Inventory")
      .select("*")
      .in("productVariantId", variantIds);
    if (invErr) throw new Error(invErr.message);
    const inventoryRows = (inventories ?? []) as Array<{ productVariantId: string } & Record<string, unknown>>;
    inventoryByVariant = new Map(inventoryRows.map((inv) => [inv.productVariantId, inv]));
  }
  return {
    ...productRow,
    category: category ?? null,
    variants: variantRows.map((v) => ({ ...v, inventory: inventoryByVariant.get(v.id) ?? null })),
    images: images ?? [],
  };
}

async function listStoreProducts(appUserId: string) {
  const sb = await getServiceClient();
  const store = await requireOwnerStore(appUserId);
  const { data: products, error: pErr } = await sb
    .from("Product")
    .select("id, storeId, categoryId, title, slug, description, basePrice, status, deletedAt, createdAt, updatedAt")
    .eq("storeId", store.id)
    .is("deletedAt", null)
    .order("updatedAt", { ascending: false });
  if (pErr) throw new Error(pErr.message);
  const productIds = (products ?? []).map((p) => p.id);
  const categoryIds = [...new Set((products ?? []).map((p) => p.categoryId))];
  const [{ data: categories, error: cErr }, { data: variants, error: vErr }, { data: images, error: iErr }] =
    await Promise.all([
      categoryIds.length
        ? sb.from("ProductCategory").select("id, name, slug").in("id", categoryIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length ? sb.from("ProductVariant").select("*").in("productId", productIds) : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? sb.from("ProductImage").select("*").in("productId", productIds).order("createdAt", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (cErr) throw new Error(cErr.message);
  if (vErr) throw new Error(vErr.message);
  if (iErr) throw new Error(iErr.message);
  const variantIds = (variants ?? []).map((v) => v.id);
  const { data: inventories, error: invErr } = variantIds.length
    ? await sb.from("Inventory").select("*").in("productVariantId", variantIds)
    : { data: [], error: null };
  if (invErr) throw new Error(invErr.message);
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const invByVariantId = new Map((inventories ?? []).map((inv) => [inv.productVariantId, inv]));
  const variantsByProduct = new Map<string, unknown[]>();
  for (const variant of variants ?? []) {
    const current = variantsByProduct.get(variant.productId) ?? [];
    current.push({ ...variant, inventory: invByVariantId.get(variant.id) ?? null });
    variantsByProduct.set(variant.productId, current);
  }
  const imagesByProduct = new Map<string, unknown[]>();
  for (const image of images ?? []) {
    const current = imagesByProduct.get(image.productId) ?? [];
    current.push(image);
    imagesByProduct.set(image.productId, current);
  }
  return (products ?? []).map((p) => ({
    ...p,
    category: categoryById.get(p.categoryId) ?? null,
    variants: variantsByProduct.get(p.id) ?? [],
    images: (imagesByProduct.get(p.id) ?? []).slice(0, 3),
  }));
}

async function listVendorOrders(appUserId: string) {
  const sb = await getServiceClient();
  const store = await requireOwnerStore(appUserId);
  const { data: lines, error: linesErr } = await sb
    .from("OrderItem")
    .select("*")
    .eq("storeId", store.id)
    .order("createdAt", { ascending: false });
  if (linesErr) throw new Error(linesErr.message);
  const orderIds = [...new Set((lines ?? []).map((l) => l.orderId))];
  const variantIds = [...new Set((lines ?? []).map((l) => l.productVariantId))];
  const [{ data: orders, error: ordersErr }, { data: addresses, error: addressesErr }, { data: payments, error: payErr }, { data: users, error: usersErr }, { data: profiles, error: profilesErr }, { data: variants, error: variantsErr }] =
    await Promise.all([
      orderIds.length ? sb.from("Order").select("*").in("id", orderIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? sb.from("OrderAddress").select("*").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? sb.from("Payment").select("orderId,status,amount").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length
        ? (async () => {
            const { data: o } = await sb.from("Order").select("id,customerId").in("id", orderIds);
            const customerIds = [...new Set((o ?? []).map((r) => r.customerId))];
            return customerIds.length ? sb.from("User").select("id,email").in("id", customerIds) : { data: [], error: null };
          })()
        : Promise.resolve({ data: [], error: null }),
      orderIds.length
        ? (async () => {
            const { data: o } = await sb.from("Order").select("id,customerId").in("id", orderIds);
            const customerIds = [...new Set((o ?? []).map((r) => r.customerId))];
            return customerIds.length
              ? sb.from("UserProfile").select("userId,firstName,lastName").in("userId", customerIds)
              : { data: [], error: null };
          })()
        : Promise.resolve({ data: [], error: null }),
      variantIds.length ? sb.from("ProductVariant").select("*").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
    ]);
  if (ordersErr) throw new Error(ordersErr.message);
  if (addressesErr) throw new Error(addressesErr.message);
  if (payErr) throw new Error(payErr.message);
  if (usersErr) throw new Error(usersErr.message);
  if (profilesErr) throw new Error(profilesErr.message);
  if (variantsErr) throw new Error(variantsErr.message);

  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
  const addressByOrderId = new Map((addresses ?? []).map((a) => [a.orderId, a]));
  const paymentByOrderId = new Map((payments ?? []).map((p) => [p.orderId, p]));
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  return (lines ?? []).map((line) => {
    const order = orderById.get(line.orderId);
    const customer = order ? userById.get(order.customerId) : null;
    return {
      ...line,
      order: order
        ? {
            ...order,
            address: addressByOrderId.get(order.id) ?? null,
            customer: {
              email: customer?.email ?? "",
              userProfile: customer ? profileByUserId.get(customer.id) ?? null : null,
            },
            payment: paymentByOrderId.get(order.id) ?? null,
          }
        : null,
      variant: variantById.get(line.productVariantId) ?? null,
    };
  });
}

async function getVendorOrderDetail(appUserId: string, orderId: string) {
  const lines = await listVendorOrders(appUserId);
  const filtered = lines.filter((l) => l.orderId === orderId);
  if (filtered.length === 0) throw new Error("Order not found");
  return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function hydrateCart(sb: ReturnType<typeof createClient>, cartId: string, userId: string) {
  const { data: cart, error: cErr } = await sb.from("Cart").select("*").eq("id", cartId).maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!cart) return null;
  const { data: items, error: itemsErr } = await sb
    .from("CartItem")
    .select("*")
    .eq("cartId", cartId)
    .order("createdAt", { ascending: true });
  if (itemsErr) throw new Error(itemsErr.message);
  const productIds = [...new Set((items ?? []).map((i) => i.productId))];
  const variantIds = [...new Set((items ?? []).map((i) => i.productVariantId))];
  const [{ data: products, error: pErr }, { data: variants, error: vErr }, { data: inventory, error: iErr }] =
    await Promise.all([
      productIds.length ? sb.from("Product").select("*").in("id", productIds) : Promise.resolve({ data: [], error: null }),
      variantIds.length ? sb.from("ProductVariant").select("*").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
      variantIds.length
        ? sb.from("Inventory").select("*").in("productVariantId", variantIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (pErr) throw new Error(pErr.message);
  if (vErr) throw new Error(vErr.message);
  if (iErr) throw new Error(iErr.message);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const invByVariantId = new Map((inventory ?? []).map((r) => [r.productVariantId, r]));
  const variantById = new Map(
    (variants ?? []).map((v) => [v.id, { ...v, inventory: invByVariantId.get(v.id) ?? null }]),
  );
  return {
    ...cart,
    userId,
    items: (items ?? []).map((item) => ({
      ...item,
      product: productById.get(item.productId) ?? null,
      variant: variantById.get(item.productVariantId) ?? null,
    })),
  };
}

async function getOrCreateCart(userId: string) {
  const sb = await getServiceClient();
  const cartLookup = await sb.from("Cart").select("id").eq("userId", userId).maybeSingle();
  let { data: cart } = cartLookup;
  const { error } = cartLookup;
  if (error) throw new Error(error.message);
  if (!cart?.id) {
    const now = new Date().toISOString();
    const { data: created, error: createErr } = await sb
      .from("Cart")
      .insert({ id: crypto.randomUUID(), userId, updatedAt: now })
      .select("id")
      .single();
    if (createErr) throw new Error(createErr.message);
    cart = created;
  }
  return hydrateCart(sb, cart.id, userId);
}

async function addCartItem(userId: string, dto: { productVariantId: string; quantity: number }) {
  const sb = await getServiceClient();
  const { data: variant, error: variantErr } = await sb
    .from("ProductVariant")
    .select("*")
    .eq("id", dto.productVariantId)
    .maybeSingle();
  if (variantErr) throw new Error(variantErr.message);
  if (!variant) throw new Error("Product is not available");
  const [{ data: product, error: productErr }, { data: inventory, error: invErr }] = await Promise.all([
    sb.from("Product").select("*").eq("id", variant.productId).maybeSingle(),
    sb.from("Inventory").select("*").eq("productVariantId", variant.id).maybeSingle(),
  ]);
  if (productErr) throw new Error(productErr.message);
  if (invErr) throw new Error(invErr.message);
  if (!product || product.deletedAt || product.status !== "ACTIVE") throw new Error("Product is not available");
  const available = inventory?.quantity ?? variant.stock;
  if (dto.quantity > available) throw new Error("Insufficient stock");
  const cart = await getOrCreateCart(userId);
  const { data: existing, error: existingErr } = await sb
    .from("CartItem")
    .select("*")
    .eq("cartId", cart!.id)
    .eq("productVariantId", dto.productVariantId)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);
  if (existing?.id) {
    const newQty = existing.quantity + dto.quantity;
    if (newQty > available) throw new Error("Insufficient stock for requested quantity");
    const { data: updated, error: updatedErr } = await sb
      .from("CartItem")
      .update({ quantity: newQty, updatedAt: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updatedErr) throw new Error(updatedErr.message);
    return { ...updated, product, variant: { ...variant, inventory } };
  }
  const { data: created, error: createErr } = await sb
    .from("CartItem")
    .insert({
      id: crypto.randomUUID(),
      cartId: cart!.id,
      productId: variant.productId,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
      updatedAt: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (createErr) throw new Error(createErr.message);
  return { ...created, product, variant: { ...variant, inventory } };
}

async function updateCartItem(userId: string, cartItemId: string, dto: { quantity: number }) {
  const sb = await getServiceClient();
  const cart = await getOrCreateCart(userId);
  const { data: item, error: itemErr } = await sb
    .from("CartItem")
    .select("*")
    .eq("id", cartItemId)
    .eq("cartId", cart!.id)
    .maybeSingle();
  if (itemErr) throw new Error(itemErr.message);
  if (!item) throw new Error("Cart item not found");
  const [{ data: variant, error: variantErr }, { data: inventory, error: invErr }, { data: product, error: productErr }] =
    await Promise.all([
      sb.from("ProductVariant").select("*").eq("id", item.productVariantId).maybeSingle(),
      sb.from("Inventory").select("*").eq("productVariantId", item.productVariantId).maybeSingle(),
      sb.from("Product").select("*").eq("id", item.productId).maybeSingle(),
    ]);
  if (variantErr) throw new Error(variantErr.message);
  if (invErr) throw new Error(invErr.message);
  if (productErr) throw new Error(productErr.message);
  if (!variant || !product) throw new Error("Cart item not found");
  const available = inventory?.quantity ?? variant.stock;
  if (dto.quantity > available) throw new Error("Insufficient stock");
  const { data: updated, error: updatedErr } = await sb
    .from("CartItem")
    .update({ quantity: dto.quantity, updatedAt: new Date().toISOString() })
    .eq("id", cartItemId)
    .select("*")
    .single();
  if (updatedErr) throw new Error(updatedErr.message);
  return { ...updated, product, variant: { ...variant, inventory } };
}

async function removeCartItem(userId: string, cartItemId: string) {
  const sb = await getServiceClient();
  const cart = await getOrCreateCart(userId);
  const { data: item, error: itemErr } = await sb
    .from("CartItem")
    .select("id")
    .eq("id", cartItemId)
    .eq("cartId", cart!.id)
    .maybeSingle();
  if (itemErr) throw new Error(itemErr.message);
  if (!item) throw new Error("Cart item not found");
  const { error: delErr } = await sb.from("CartItem").delete().eq("id", cartItemId);
  if (delErr) throw new Error(delErr.message);
  return { deleted: true };
}

function buildOrderNumber() {
  return `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

async function getCustomerOrderAggregate(sb: ReturnType<typeof createClient>, orderId: string) {
  const { data: order, error: orderErr } = await sb.from("Order").select("*").eq("id", orderId).maybeSingle();
  if (orderErr) throw new Error(orderErr.message);
  if (!order) return null;
  const [{ data: items, error: itemsErr }, { data: address, error: addrErr }, { data: payment, error: payErr }] =
    await Promise.all([
      sb.from("OrderItem").select("*").eq("orderId", orderId).order("createdAt", { ascending: true }),
      sb.from("OrderAddress").select("*").eq("orderId", orderId).maybeSingle(),
      sb.from("Payment").select("*").eq("orderId", orderId).maybeSingle(),
    ]);
  if (itemsErr) throw new Error(itemsErr.message);
  if (addrErr) throw new Error(addrErr.message);
  if (payErr) throw new Error(payErr.message);
  return { ...order, items: items ?? [], address: address ?? null, payment: payment ?? null };
}

async function checkoutCart(userId: string, dto: {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  couponCode?: string;
  deliveryFee?: number;
}) {
  const sb = await getServiceClient();
  const cart = await getOrCreateCart(userId);
  if (!cart?.items?.length) throw new Error("Cart is empty");
  const deliveryFee = Math.max(0, Number(dto.deliveryFee ?? 0));
  const lines: Array<{
    cartItemId: string;
    storeId: string;
    productId: string;
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
    titleSnapshot: string;
    skuSnapshot: string;
    variantLabelSnapshot: string | null;
    basePrice: number;
    salePrice: number | null;
  }> = [];
  for (const ci of cart.items) {
    const p = ci.product;
    const v = ci.variant;
    if (!p || !v || p.deletedAt || p.status !== "ACTIVE") throw new Error(`Product unavailable: ${p?.title ?? ""}`);
    const available = v.inventory?.quantity ?? v.stock;
    if (ci.quantity > available) throw new Error(`Insufficient stock for ${p.title}`);
    const unit = Number(((v.salePrice ?? p.basePrice) as number).toFixed(2));
    const { data: attrVals, error: attrErr } = await sb
      .from("ProductVariantAttributeValue")
      .select("value, ProductAttribute:productAttributeId(name)")
      .eq("productVariantId", v.id);
    if (attrErr) throw new Error(attrErr.message);
    const label =
      (attrVals ?? []).length > 0
        ? (attrVals ?? [])
            .map((a) => `${(a as unknown as { ProductAttribute?: { name?: string } }).ProductAttribute?.name ?? ""}: ${a.value}`)
            .join(", ")
        : null;
    lines.push({
      cartItemId: ci.id,
      storeId: p.storeId,
      productId: p.id,
      productVariantId: v.id,
      quantity: ci.quantity,
      unitPrice: unit,
      lineSubtotal: Number((unit * ci.quantity).toFixed(2)),
      titleSnapshot: p.title,
      skuSnapshot: v.sku,
      variantLabelSnapshot: label,
      basePrice: p.basePrice,
      salePrice: v.salePrice,
    });
  }
  const subtotal = Number(lines.reduce((s, l) => s + l.lineSubtotal, 0).toFixed(2));
  let discount = 0;
  let couponId: string | null = null;
  if (dto.couponCode) {
    const { data: coupon, error: couponErr } = await sb
      .from("Coupon")
      .select("*")
      .ilike("code", dto.couponCode.trim())
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (couponErr) throw new Error(couponErr.message);
    if (!coupon) throw new Error("Invalid coupon");
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) throw new Error("Coupon expired");
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) throw new Error("Coupon usage limit reached");
    if (coupon.minSpend != null && subtotal < coupon.minSpend) throw new Error("Minimum spend not met for coupon");
    if (coupon.discountType === "PERCENTAGE") {
      discount = Number(((subtotal * coupon.discountValue) / 100).toFixed(2));
      if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = Math.min(coupon.discountValue, subtotal);
    }
    couponId = coupon.id;
  }
  const totalAmount = Number((subtotal - discount + deliveryFee).toFixed(2));
  if (totalAmount < 0) throw new Error("Invalid totals");
  const orderId = crypto.randomUUID();
  const orderNumber = buildOrderNumber();
  const now = new Date().toISOString();
  const { error: orderErr } = await sb.from("Order").insert({
    id: orderId,
    customerId: userId,
    orderNumber,
    subtotal,
    deliveryFee,
    discount,
    totalAmount,
    currentStatus: "PENDING_PAYMENT",
    updatedAt: now,
  });
  if (orderErr) throw new Error(orderErr.message);
  await sb.from("OrderStatusHistory").insert({
    id: crypto.randomUUID(),
    orderId,
    status: "PENDING_PAYMENT",
    notes: `checkout customer=${userId}`,
  });
  for (const line of lines) {
    const orderItemId = crypto.randomUUID();
    const { error: oiErr } = await sb.from("OrderItem").insert({
      id: orderItemId,
      orderId,
      storeId: line.storeId,
      productId: line.productId,
      productVariantId: line.productVariantId,
      quantity: line.quantity,
      basePrice: line.basePrice,
      salePrice: line.salePrice,
      subtotal: line.lineSubtotal,
      titleSnapshot: line.titleSnapshot,
      skuSnapshot: line.skuSnapshot,
      variantLabelSnapshot: line.variantLabelSnapshot,
      currentStatus: "PENDING_PAYMENT",
      updatedAt: now,
    });
    if (oiErr) throw new Error(oiErr.message);
    await sb.from("OrderItemStatusHistory").insert({
      id: crypto.randomUUID(),
      orderItemId,
      status: "PENDING_PAYMENT",
      notes: "checkout",
    });
  }
  await sb.from("OrderAddress").insert({
    id: crypto.randomUUID(),
    orderId,
    street: dto.street,
    city: dto.city,
    state: dto.state,
    postalCode: dto.postalCode,
    country: dto.country,
    snapshotLabel: [dto.street, dto.city, dto.state, dto.postalCode, dto.country].join(", "),
  });
  if (couponId) {
    await sb.from("CouponRedemption").insert({
      id: crypto.randomUUID(),
      couponId,
      orderId,
      amount: discount,
    });
    await sb.from("Coupon").update({ usageCount: (await sb.from("Coupon").select("usageCount").eq("id", couponId).single()).data.usageCount + 1 }).eq("id", couponId);
  }
  await sb.from("Payment").insert({
    id: crypto.randomUUID(),
    orderId,
    amount: totalAmount,
    currency: "USD",
    provider: "mock",
    status: "PENDING",
    metadata: { intent: `mock_${crypto.randomUUID().replace(/-/g, "")}` },
    updatedAt: now,
  });
  await sb.from("CartItem").delete().eq("cartId", cart.id);
  await tryInsertOrderNotification(sb, {
    userId,
    title: "Order placed",
    message: `Order ${orderNumber} is awaiting payment.`,
    type: "ORDER_UPDATE",
  });
  return getCustomerOrderAggregate(sb, orderId);
}

async function confirmMockPayment(orderId: string, customerId: string) {
  const sb = await getServiceClient();
  const order = await getCustomerOrderAggregate(sb, orderId);
  if (!order) throw new Error("Order not found");
  if (order.customerId !== customerId) throw new Error("Not your order");
  if (!order.payment) throw new Error("No payment record");
  if (order.payment.status === "CAPTURED") return order;
  if (order.payment.status === "FAILED") throw new Error("Payment already failed");
  const items = order.items;
  for (const item of items) {
    const [{ data: variant, error: vErr }, { data: inv, error: iErr }] = await Promise.all([
      sb.from("ProductVariant").select("*").eq("id", item.productVariantId).maybeSingle(),
      sb.from("Inventory").select("*").eq("productVariantId", item.productVariantId).maybeSingle(),
    ]);
    if (vErr) throw new Error(vErr.message);
    if (iErr) throw new Error(iErr.message);
    if (!variant || !inv) throw new Error(`Missing inventory for line ${item.id}`);
    if (inv.quantity < item.quantity) throw new Error(`Insufficient stock for SKU ${item.skuSnapshot}`);
    await sb.from("Inventory").update({ quantity: inv.quantity - item.quantity, updatedAt: new Date().toISOString() }).eq("id", inv.id);
    await sb.from("StockMovement").insert({
      id: crypto.randomUUID(),
      inventoryId: inv.id,
      quantity: -item.quantity,
      type: "SALE",
      notes: `order ${order.orderNumber}`,
    });
    await sb.from("ProductVariant").update({ stock: Math.max(0, (variant.stock ?? 0) - item.quantity), updatedAt: new Date().toISOString() }).eq("id", item.productVariantId);
  }
  const txRef = `mock_tx_${Date.now()}`;
  await sb
    .from("Payment")
    .update({
      status: "CAPTURED",
      transactionId: txRef,
      metadata: {
        ...((order.payment.metadata as Record<string, unknown> | null) ?? {}),
        confirmedAt: new Date().toISOString(),
        provider: "mock",
      },
      updatedAt: new Date().toISOString(),
    })
    .eq("id", order.payment.id);
  await sb.from("Order").update({ currentStatus: "PAID", updatedAt: new Date().toISOString() }).eq("id", orderId);
  await sb.from("OrderStatusHistory").insert({
    id: crypto.randomUUID(),
    orderId,
    status: "PAID",
    notes: `mock payment ${txRef}`,
  });
  for (const item of items) {
    await sb.from("OrderItem").update({ currentStatus: "PAID", updatedAt: new Date().toISOString() }).eq("id", item.id);
    await sb.from("OrderItemStatusHistory").insert({
      id: crypto.randomUUID(),
      orderItemId: item.id,
      status: "PAID",
      notes: "payment captured (mock)",
    });
  }
  await tryInsertOrderNotification(sb, {
    userId: customerId,
    title: "Payment received",
    message: `Order ${order.orderNumber} is paid.`,
    type: "ORDER_UPDATE",
  });
  return getCustomerOrderAggregate(sb, orderId);
}

async function failMockPayment(orderId: string, customerId: string, reason?: string) {
  const sb = await getServiceClient();
  const order = await getCustomerOrderAggregate(sb, orderId);
  if (!order || order.customerId !== customerId) throw new Error("Order not found");
  if (!order.payment) throw new Error("No payment");
  await sb
    .from("Payment")
    .update({
      status: "FAILED",
      metadata: {
        ...((order.payment.metadata as Record<string, unknown> | null) ?? {}),
        failReason: reason ?? "mock_decline",
      },
      updatedAt: new Date().toISOString(),
    })
    .eq("id", order.payment.id);
  await sb.from("OrderStatusHistory").insert({
    id: crypto.randomUUID(),
    orderId,
    status: order.currentStatus,
    notes: `payment failed: ${reason ?? "mock"}`,
  });
  return getCustomerOrderAggregate(sb, orderId);
}

async function listCustomerOrders(customerId: string) {
  const sb = await getServiceClient();
  const { data: orders, error: oErr } = await sb
    .from("Order")
    .select("*")
    .eq("customerId", customerId)
    .order("createdAt", { ascending: false });
  if (oErr) throw new Error(oErr.message);
  const orderIds = (orders ?? []).map((o) => o.id);
  const [itemsRes, addressRes, payRes] = await Promise.all([
    orderIds.length ? sb.from("OrderItem").select("*").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? sb.from("OrderAddress").select("*").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? sb.from("Payment").select("*").in("orderId", orderIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (addressRes.error) throw new Error(addressRes.error.message);
  if (payRes.error) throw new Error(payRes.error.message);
  const storeIds = [...new Set((itemsRes.data ?? []).map((i) => i.storeId))];
  const { data: stores, error: sErr } = storeIds.length
    ? await sb.from("Store").select("id,name,slug").in("id", storeIds)
    : { data: [], error: null };
  if (sErr) throw new Error(sErr.message);
  const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
  const itemsByOrder = new Map<string, unknown[]>();
  for (const item of itemsRes.data ?? []) {
    const curr = itemsByOrder.get(item.orderId) ?? [];
    curr.push({ ...item, store: storeById.get(item.storeId) ?? null });
    itemsByOrder.set(item.orderId, curr);
  }
  const addressByOrder = new Map((addressRes.data ?? []).map((a) => [a.orderId, a]));
  const paymentByOrder = new Map((payRes.data ?? []).map((p) => [p.orderId, p]));
  return (orders ?? []).map((o) => ({
    ...o,
    items: itemsByOrder.get(o.id) ?? [],
    address: addressByOrder.get(o.id) ?? null,
    payment: paymentByOrder.get(o.id) ?? null,
  }));
}

async function customerOrderTracking(customerId: string, orderId: string) {
  const sb = await getServiceClient();
  const { data: order, error: oErr } = await sb
    .from("Order")
    .select("id")
    .eq("id", orderId)
    .eq("customerId", customerId)
    .maybeSingle();
  if (oErr) throw new Error(oErr.message);
  if (!order) return null;
  const { data: items, error: iErr } = await sb.from("OrderItem").select("id").eq("orderId", orderId);
  if (iErr) throw new Error(iErr.message);
  const itemIds = (items ?? []).map((i) => i.id);
  if (!itemIds.length) return { orderId, assignments: [] };
  const { data: links, error: lErr } = await sb
    .from("DeliveryAssignmentItem")
    .select("*")
    .in("orderItemId", itemIds);
  if (lErr) throw new Error(lErr.message);
  const assignmentIds = [...new Set((links ?? []).map((l) => l.assignmentId))];
  const { data: assignments, error: aErr } = assignmentIds.length
    ? await sb.from("DeliveryAssignment").select("*").in("id", assignmentIds)
    : { data: [], error: null };
  if (aErr) throw new Error(aErr.message);
  const { data: tracking, error: tErr } = assignmentIds.length
    ? await sb.from("DeliveryTrackingUpdate").select("*").in("assignmentId", assignmentIds).order("createdAt", { ascending: false })
    : { data: [], error: null };
  if (tErr) throw new Error(tErr.message);
  const driverIds = [...new Set((assignments ?? []).map((a) => a.driverId).filter(Boolean))];
  const { data: drivers, error: dErr } = driverIds.length
    ? await sb.from("Driver").select("*").in("id", driverIds)
    : { data: [], error: null };
  if (dErr) throw new Error(dErr.message);
  const driverUserIds = [...new Set((drivers ?? []).map((d) => d.userId))];
  const [{ data: users, error: uErr }, { data: profiles, error: pErr }] = await Promise.all([
    driverUserIds.length ? sb.from("User").select("id,email").in("id", driverUserIds) : Promise.resolve({ data: [], error: null }),
    driverUserIds.length
      ? sb.from("UserProfile").select("userId,firstName,lastName").in("userId", driverUserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (uErr) throw new Error(uErr.message);
  if (pErr) throw new Error(pErr.message);
  const driverById = new Map((drivers ?? []).map((d) => [d.id, d]));
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const profileByUserId = new Map((profiles ?? []).map((p) => [p.userId, p]));
  const trackingByAssignment = new Map<string, unknown[]>();
  for (const t of tracking ?? []) {
    const curr = trackingByAssignment.get(t.assignmentId) ?? [];
    curr.push(t);
    trackingByAssignment.set(t.assignmentId, curr);
  }
  return {
    orderId,
    assignments: (assignments ?? []).map((a) => {
      const driver = a.driverId ? driverById.get(a.driverId) : null;
      const driverUser = driver ? userById.get(driver.userId) : null;
      return {
        ...a,
        tracking: trackingByAssignment.get(a.id) ?? [],
        driver: driver
          ? {
              ...driver,
              user: {
                email: driverUser?.email ?? "",
                userProfile: profileByUserId.get(driver.userId) ?? null,
              },
            }
          : null,
      };
    }),
  };
}

async function customerOrderDetail(customerId: string, orderId: string) {
  const sb = await getServiceClient();
  const { data: order, error: oErr } = await sb
    .from("Order")
    .select("*")
    .eq("id", orderId)
    .eq("customerId", customerId)
    .maybeSingle();
  if (oErr) throw new Error(oErr.message);
  if (!order) return null;
  const [{ data: items, error: iErr }, { data: address, error: aErr }, { data: payment, error: payErr }, { data: orderStatus, error: osErr }] =
    await Promise.all([
      sb.from("OrderItem").select("*").eq("orderId", orderId).order("createdAt", { ascending: true }),
      sb.from("OrderAddress").select("*").eq("orderId", orderId).maybeSingle(),
      sb.from("Payment").select("*").eq("orderId", orderId).maybeSingle(),
      sb.from("OrderStatusHistory").select("*").eq("orderId", orderId).order("createdAt", { ascending: false }).limit(30),
    ]);
  if (iErr) throw new Error(iErr.message);
  if (aErr) throw new Error(aErr.message);
  if (payErr) throw new Error(payErr.message);
  if (osErr) throw new Error(osErr.message);
  const storeIds = [...new Set((items ?? []).map((i) => i.storeId))];
  const variantIds = [...new Set((items ?? []).map((i) => i.productVariantId))];
  const itemIds = (items ?? []).map((i) => i.id);
  const [{ data: stores, error: sErr }, { data: variants, error: vErr }, { data: itemStatus, error: isErr }] =
    await Promise.all([
      storeIds.length ? sb.from("Store").select("*").in("id", storeIds) : Promise.resolve({ data: [], error: null }),
      variantIds.length ? sb.from("ProductVariant").select("*").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
      itemIds.length
        ? sb.from("OrderItemStatusHistory").select("*").in("orderItemId", itemIds).order("createdAt", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (sErr) throw new Error(sErr.message);
  if (vErr) throw new Error(vErr.message);
  if (isErr) throw new Error(isErr.message);
  const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));
  const statusByItem = new Map<string, unknown[]>();
  for (const h of itemStatus ?? []) {
    const curr = statusByItem.get(h.orderItemId) ?? [];
    if (curr.length < 20) curr.push(h);
    statusByItem.set(h.orderItemId, curr);
  }
  return {
    ...order,
    items: (items ?? []).map((i) => ({
      ...i,
      store: storeById.get(i.storeId) ?? null,
      variant: variantById.get(i.productVariantId) ?? null,
      statusHistory: statusByItem.get(i.id) ?? [],
    })),
    address: address ?? null,
    payment: payment ?? null,
    statusHistory: orderStatus ?? [],
  };
}

async function tryInsertOrderNotification(
  sb: ReturnType<typeof createClient>,
  payload: { userId: string; title: string; message: string; type: string },
) {
  try {
    await sb.from("Notification").insert({
      id: crypto.randomUUID(),
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });
  } catch {
    // Keep checkout/payment resilient if notification table is absent in current Supabase project.
  }
}

type DeliveryStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "PICKUP_ARRIVED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "NEAR_CUSTOMER"
  | "DELIVERED"
  | "FAILED";

const DRIVER_FLOW: DeliveryStatus[] = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKUP_ARRIVED",
  "PICKED_UP",
  "ON_THE_WAY",
  "NEAR_CUSTOMER",
  "DELIVERED",
];

function assertDriverTransition(from: DeliveryStatus, to: DeliveryStatus) {
  if (to === "FAILED" || to === "REJECTED") return;
  const i = DRIVER_FLOW.indexOf(from);
  const j = DRIVER_FLOW.indexOf(to);
  if (i < 0 || j < 0 || j !== i + 1) {
    throw new Error(`Invalid transition ${from} -> ${to}`);
  }
}

async function getDriverByUserId(sb: ReturnType<typeof createClient>, userId: string) {
  const { data: driver, error } = await sb
    .from("Driver")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return driver;
}

async function getAssignmentBundle(sb: ReturnType<typeof createClient>, assignmentId: string) {
  const { data: assignment, error: aErr } = await sb
    .from("DeliveryAssignment")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!assignment) throw new Error("Assignment not found");

  const { data: links, error: linksErr } = await sb
    .from("DeliveryAssignmentItem")
    .select("*")
    .eq("assignmentId", assignmentId);
  if (linksErr) throw new Error(linksErr.message);
  const orderItemIds = (links ?? []).map((l) => l.orderItemId);
  const { data: orderItems, error: oiErr } = orderItemIds.length
    ? await sb.from("OrderItem").select("*").in("id", orderItemIds)
    : { data: [], error: null };
  if (oiErr) throw new Error(oiErr.message);

  return { assignment, links: links ?? [], orderItems: orderItems ?? [] };
}

async function appendDeliveryTracking(
  sb: ReturnType<typeof createClient>,
  input: {
    assignmentId: string;
    status: DeliveryStatus;
    notes?: string;
    locationLat?: number;
    locationLng?: number;
  },
) {
  const { error } = await sb.from("DeliveryTrackingUpdate").insert({
    id: crypto.randomUUID(),
    assignmentId: input.assignmentId,
    status: input.status,
    notes: input.notes ?? null,
    locationLat: input.locationLat ?? null,
    locationLng: input.locationLng ?? null,
  });
  if (error) throw new Error(error.message);
}

async function setOrderItemStatus(
  sb: ReturnType<typeof createClient>,
  orderItemIds: string[],
  status:
    | "PICKED_UP"
    | "ON_THE_WAY"
    | "NEAR_CUSTOMER"
    | "DELIVERED"
    | "FAILED_DELIVERY",
  notes: string,
) {
  const now = new Date().toISOString();
  for (const orderItemId of orderItemIds) {
    const { error: uErr } = await sb
      .from("OrderItem")
      .update({ currentStatus: status, updatedAt: now })
      .eq("id", orderItemId);
    if (uErr) throw new Error(uErr.message);
    const { error: hErr } = await sb.from("OrderItemStatusHistory").insert({
      id: crypto.randomUUID(),
      orderItemId,
      status,
      notes,
    });
    if (hErr) throw new Error(hErr.message);
  }
}

async function refreshParentOrderStatuses(
  sb: ReturnType<typeof createClient>,
  orderIds: string[],
  notesByStatus: Partial<Record<string, string>>,
) {
  const now = new Date().toISOString();
  for (const orderId of orderIds) {
    const { data: items, error: iErr } = await sb
      .from("OrderItem")
      .select("currentStatus")
      .eq("orderId", orderId);
    if (iErr) throw new Error(iErr.message);
    const statuses = (items ?? []).map((i) => i.currentStatus);
    if (statuses.length === 0) continue;

    let nextStatus: string | null = null;
    if (statuses.every((s) => s === "DELIVERED")) nextStatus = "DELIVERED";
    else if (statuses.every((s) => s === "FAILED_DELIVERY")) nextStatus = "FAILED_DELIVERY";
    else if (statuses.every((s) => s === "DELIVERED" || s === "FAILED_DELIVERY")) {
      nextStatus = "PARTIALLY_DELIVERED";
    } else if (statuses.every((s) => s === "NEAR_CUSTOMER" || s === "DELIVERED")) {
      nextStatus = "NEAR_CUSTOMER";
    } else if (
      statuses.every((s) => s === "ON_THE_WAY" || s === "NEAR_CUSTOMER" || s === "DELIVERED")
    ) {
      nextStatus = "ON_THE_WAY";
    } else if (
      statuses.every(
        (s) =>
          s === "PICKED_UP" ||
          s === "ON_THE_WAY" ||
          s === "NEAR_CUSTOMER" ||
          s === "DELIVERED",
      )
    ) {
      nextStatus = "PICKED_UP";
    }
    if (!nextStatus) continue;
    const { error: oErr } = await sb
      .from("Order")
      .update({ currentStatus: nextStatus, updatedAt: now })
      .eq("id", orderId);
    if (oErr) throw new Error(oErr.message);
    const { error: hErr } = await sb.from("OrderStatusHistory").insert({
      id: crypto.randomUUID(),
      orderId,
      status: nextStatus,
      notes: notesByStatus[nextStatus] ?? null,
    });
    if (hErr) throw new Error(hErr.message);
  }
}

async function acceptDriverAssignment(driverUserId: string, assignmentId: string) {
  const sb = await getServiceClient();
  const driver = await getDriverByUserId(sb, driverUserId);
  if (!driver) throw new Error("Forbidden");
  const { assignment, links, orderItems } = await getAssignmentBundle(sb, assignmentId);
  if (assignment.driverId && assignment.driverId !== driver.id) throw new Error("Forbidden");

  const now = new Date().toISOString();
  if (!assignment.driverId) {
    const { error: bindErr } = await sb
      .from("DeliveryAssignment")
      .update({ driverId: driver.id, updatedAt: now })
      .eq("id", assignmentId);
    if (bindErr) throw new Error(bindErr.message);
  }
  assertDriverTransition(assignment.status as DeliveryStatus, "ACCEPTED");
  const { error: statusErr } = await sb
    .from("DeliveryAssignment")
    .update({ status: "ACCEPTED", updatedAt: now })
    .eq("id", assignmentId);
  if (statusErr) throw new Error(statusErr.message);
  await appendDeliveryTracking(sb, {
    assignmentId,
    status: "ACCEPTED",
    notes: "accepted",
  });

  const orderIds = [...new Set(orderItems.map((i) => i.orderId))];
  for (const orderId of orderIds) {
    const { data: order } = await sb.from("Order").select("customerId,orderNumber").eq("id", orderId).maybeSingle();
    if (order?.customerId) {
      await tryInsertOrderNotification(sb, {
        userId: order.customerId,
        title: "Driver assigned",
        message: `A driver accepted order ${order.orderNumber ?? orderId}.`,
        type: "ORDER_UPDATE",
      });
    }
  }

  const { data: updated } = await sb
    .from("DeliveryAssignment")
    .select("*")
    .eq("id", assignmentId)
    .single();
  return {
    ...updated,
    items: links.map((l) => ({
      ...l,
      orderItem: orderItems.find((oi) => oi.id === l.orderItemId) ?? null,
    })),
  };
}

async function updateDriverAssignmentStatus(
  driverUserId: string,
  assignmentId: string,
  body: {
    status: DeliveryStatus;
    notes?: string;
    locationLat?: number;
    locationLng?: number;
    proofImageUrl?: string;
    failureReason?: string;
    failureNotes?: string;
  },
) {
  const sb = await getServiceClient();
  const driver = await getDriverByUserId(sb, driverUserId);
  if (!driver) throw new Error("Forbidden");

  const { assignment, links, orderItems } = await getAssignmentBundle(sb, assignmentId);
  if (!assignment.driverId || assignment.driverId !== driver.id) throw new Error("Forbidden");
  assertDriverTransition(assignment.status as DeliveryStatus, body.status);

  const now = new Date().toISOString();
  const { error: updateErr } = await sb
    .from("DeliveryAssignment")
    .update({ status: body.status, updatedAt: now })
    .eq("id", assignmentId);
  if (updateErr) throw new Error(updateErr.message);

  await appendDeliveryTracking(sb, {
    assignmentId,
    status: body.status,
    notes: body.notes,
    locationLat: body.locationLat,
    locationLng: body.locationLng,
  });

  const orderItemIds = links.map((l) => l.orderItemId);
  const orderIds = [...new Set(orderItems.map((i) => i.orderId))];

  if (
    body.status === "PICKED_UP" &&
    (assignment.status as DeliveryStatus) === "PICKUP_ARRIVED" &&
    orderItems.length > 0
  ) {
    const storeId = orderItems[0].storeId;
    const pickupEventId = crypto.randomUUID();
    const { error: pErr } = await sb.from("PickupEvent").insert({
      id: pickupEventId,
      driverId: assignment.driverId,
      storeId,
    });
    if (pErr) throw new Error(pErr.message);
    for (const orderItemId of orderItemIds) {
      const { error: peErr } = await sb.from("PickupEventItem").insert({
        id: crypto.randomUUID(),
        pickupEventId,
        orderItemId,
      });
      if (peErr) throw new Error(peErr.message);
    }
    await setOrderItemStatus(sb, orderItemIds, "PICKED_UP", `pickup ${pickupEventId}`);
  } else if (body.status === "ON_THE_WAY") {
    await setOrderItemStatus(sb, orderItemIds, "ON_THE_WAY", "driver en route");
  } else if (body.status === "NEAR_CUSTOMER") {
    await setOrderItemStatus(sb, orderItemIds, "NEAR_CUSTOMER", "driver near customer");
  } else if (body.status === "DELIVERED") {
    await setOrderItemStatus(sb, orderItemIds, "DELIVERED", "delivered");
    if (body.proofImageUrl?.trim()) {
      const { error: proofErr } = await sb.from("DeliveryProof").insert({
        id: crypto.randomUUID(),
        assignmentId,
        imageUrl: body.proofImageUrl.trim(),
        notes: body.notes ?? null,
      });
      if (proofErr) throw new Error(proofErr.message);
    }
  } else if (body.status === "FAILED" || body.status === "REJECTED") {
    const reason = body.failureReason?.trim() || "delivery_failed";
    const { error: failErr } = await sb.from("FailedDeliveryAttempt").insert({
      id: crypto.randomUUID(),
      assignmentId,
      reason,
      notes: body.failureNotes ?? body.notes ?? null,
    });
    if (failErr) throw new Error(failErr.message);
    await setOrderItemStatus(sb, orderItemIds, "FAILED_DELIVERY", `failed: ${reason}`);
  }

  await refreshParentOrderStatuses(sb, orderIds, {
    DELIVERED: "all assignment items delivered",
    FAILED_DELIVERY: "delivery failed",
    PARTIALLY_DELIVERED: "partial delivery outcome",
    NEAR_CUSTOMER: "driver near customer",
    ON_THE_WAY: "driver on the way",
    PICKED_UP: "items picked up",
  });

  for (const orderId of orderIds) {
    const { data: order } = await sb
      .from("Order")
      .select("customerId,orderNumber")
      .eq("id", orderId)
      .maybeSingle();
    if (order?.customerId) {
      await tryInsertOrderNotification(sb, {
        userId: order.customerId,
        title: "Delivery update",
        message: `Order ${order.orderNumber ?? orderId}: ${body.status}`,
        type: "ORDER_UPDATE",
      });
    }
  }

  const [{ data: tracking }, { data: updated }, { data: updatedLinks }] = await Promise.all([
    sb
      .from("DeliveryTrackingUpdate")
      .select("*")
      .eq("assignmentId", assignmentId)
      .order("createdAt", { ascending: false })
      .limit(30),
    sb.from("DeliveryAssignment").select("*").eq("id", assignmentId).single(),
    sb.from("DeliveryAssignmentItem").select("*").eq("assignmentId", assignmentId),
  ]);
  return {
    ...updated,
    tracking: tracking ?? [],
    items: (updatedLinks ?? []).map((l) => ({
      ...l,
      orderItem: orderItems.find((oi) => oi.id === l.orderItemId) ?? null,
    })),
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ segments: string[] }> },
) {
  const { segments: segs } = await ctx.params;
  const segments = segs ?? [];

  try {
    if (segments[0] === "catalog" && segments[1] === "categories" && segments.length === 2) {
      return NextResponse.json(await listCatalogCategories());
    }
    if (segments[0] === "catalog" && segments[1] === "products" && segments.length === 2) {
      const url = new URL(req.url);
      const storeId = url.searchParams.get("storeId") ?? undefined;
      const take = url.searchParams.get("take") ?? "24";
      return NextResponse.json(await listCatalogProducts(storeId, take));
    }

    const auth = await requireBearerUser(req);
    if ("error" in auth) return auth.error;
    const { appUserId } = auth;

    if (segments[0] === "stores" && segments[1] === "me" && segments.length === 2) {
      const { url, service } = getConfig();
      const sb = createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: store, error: storeErr } = await sb
        .from("Store")
        .select("id, name, slug, status, description")
        .eq("ownerId", appUserId)
        .maybeSingle();
      if (storeErr) throw new Error(storeErr.message);
      if (!store) return NextResponse.json(null);
      const { data: profile, error: profileErr } = await sb
        .from("StoreProfile")
        .select("businessEmail, businessPhone, businessAddress")
        .eq("storeId", store.id)
        .maybeSingle();
      if (profileErr) throw new Error(profileErr.message);
      return NextResponse.json({
        ...store,
        profile:
          profile ?? null,
      });
    }
    if (segments[0] === "stores" && segments[1] === "me" && segments[2] === "products" && segments.length === 3) {
      return NextResponse.json(await listStoreProducts(appUserId));
    }
    if (segments[0] === "applications" && segments[1] === "status" && segments.length === 2) {
      const access = await resolveMarketplaceAccess((await resolveRequestUser(req)).authUserId);
      return NextResponse.json({
        requestedRole: access?.requestedRole ?? null,
        onboardingStatus: access?.onboardingStatus ?? "NONE",
        storeApplication:
          access?.storeApplicationStatus != null
            ? { status: access.storeApplicationStatus }
            : null,
        driverApplication:
          access?.driverApplicationStatus != null
            ? { status: access.driverApplicationStatus }
            : null,
      });
    }

    if (segments[0] === "cart" && segments.length === 1) {
      return NextResponse.json(await getOrCreateCart(appUserId));
    }

    if (segments[0] === "customer" && segments[1] === "orders" && segments.length === 2) {
      return NextResponse.json(await listCustomerOrders(appUserId));
    }
    if (
      segments[0] === "customer" &&
      segments[1] === "orders" &&
      segments[3] === "tracking" &&
      segments.length === 4
    ) {
      const orderId = segments[2];
      return NextResponse.json(await customerOrderTracking(appUserId, orderId));
    }
    if (segments[0] === "customer" && segments[1] === "orders" && segments.length === 3) {
      const orderId = segments[2];
      return NextResponse.json(await customerOrderDetail(appUserId, orderId));
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "orders" && segments.length === 2) {
      return NextResponse.json(await listVendorOrders(ownerId));
    }
    if (segments[0] === "vendor" && segments[1] === "orders" && segments.length === 3) {
      const orderId = segments[2];
      if (orderId === "items") {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }
      return NextResponse.json(await getVendorOrderDetail(ownerId, orderId));
    }

    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 3) {
      const productId = segments[2];
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      return NextResponse.json(await getProductWithRelations(sb, productId));
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
      return NextResponse.json(
        { message: "Use /api/applications/store (Supabase-native route)." },
        { status: 410 },
      );
    }
    if (segments[0] === "applications" && segments[1] === "driver" && segments.length === 2) {
      return NextResponse.json(
        { message: "Use /api/applications/driver (Supabase-native route)." },
        { status: 410 },
      );
    }

    if (segments[0] === "cart" && segments[1] === "items" && segments.length === 2) {
      return NextResponse.json(await addCartItem(appUserId, body as { productVariantId: string; quantity: number }));
    }
    if (segments[0] === "checkout" && segments.length === 1) {
      return NextResponse.json(
        await checkoutCart(
          appUserId,
          body as {
            street: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
            couponCode?: string;
            deliveryFee?: number;
          },
        ),
      );
    }
    if (
      segments[0] === "orders" &&
      segments[2] === "payments" &&
      segments[3] === "mock" &&
      segments[4] === "confirm" &&
      segments.length === 5
    ) {
      const orderId = segments[1];
      return NextResponse.json(await confirmMockPayment(orderId, appUserId));
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
      return NextResponse.json(await failMockPayment(orderId, appUserId, reason));
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
      return NextResponse.json(await acceptDriverAssignment(driverAuth.appUserId, assignmentId));
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 2) {
      const dto = body as {
        title: string;
        description: string;
        basePrice: number;
        categoryId: string;
        status?: string;
        variants: Array<{ sku: string; quantity: number; salePrice?: number }>;
      };
      if (!dto.title?.trim() || !dto.description?.trim()) {
        return NextResponse.json({ message: "title and description are required" }, { status: 400 });
      }
      if (!Array.isArray(dto.variants) || dto.variants.length === 0) {
        return NextResponse.json({ message: "At least one variant is required" }, { status: 400 });
      }
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      if (store.status !== "APPROVED") {
        return NextResponse.json(
          { message: "Store must be approved to manage products" },
          { status: 403 },
        );
      }
      const { data: cat } = await sb
        .from("ProductCategory")
        .select("id")
        .eq("id", dto.categoryId)
        .maybeSingle();
      if (!cat) return NextResponse.json({ message: "Invalid category" }, { status: 400 });
      const slug = await ensureUniqueProductSlug(sb, dto.title);
      const now = new Date().toISOString();
      const { data: product, error: productErr } = await sb
        .from("Product")
        .insert({
          id: crypto.randomUUID(),
          storeId: store.id,
          categoryId: dto.categoryId,
          title: dto.title.trim(),
          slug,
          description: dto.description.trim(),
          basePrice: dto.basePrice,
          status: dto.status ?? "DRAFT",
          updatedAt: now,
        })
        .select("id")
        .single();
      if (productErr) throw new Error(productErr.message);
      await sb.from("ProductStatusHistory").insert({
        id: crypto.randomUUID(),
        productId: product.id,
        status: dto.status ?? "DRAFT",
        notes: `created by vendor ${ownerId}`,
      });
      for (const variant of dto.variants) {
        const { data: skuExists } = await sb
          .from("ProductVariant")
          .select("id")
          .eq("sku", variant.sku)
          .maybeSingle();
        if (skuExists?.id) {
          return NextResponse.json({ message: `SKU already in use: ${variant.sku}` }, { status: 400 });
        }
        const { data: createdVariant, error: createdVariantErr } = await sb
          .from("ProductVariant")
          .insert({
            id: crypto.randomUUID(),
            productId: product.id,
            sku: variant.sku,
            salePrice: variant.salePrice ?? null,
            stock: variant.quantity,
            updatedAt: now,
          })
          .select("id")
          .single();
        if (createdVariantErr) throw new Error(createdVariantErr.message);
        const { error: invErr } = await sb.from("Inventory").insert({
          id: crypto.randomUUID(),
          productVariantId: createdVariant.id,
          quantity: variant.quantity,
          lowStockThreshold: 5,
          updatedAt: now,
        });
        if (invErr) throw new Error(invErr.message);
      }
      await sb.from("ActivityLog").insert({
        id: crypto.randomUUID(),
        userId: ownerId,
        type: "CREATE",
        action: "PRODUCT_CREATE",
        metadata: { productId: product.id },
      });
      return NextResponse.json({ id: product.id });
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "variants" &&
      segments.length === 4
    ) {
      const productId = segments[2];
      const dto = body as { sku: string; quantity: number; salePrice?: number };
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      const { data: dup } = await sb
        .from("ProductVariant")
        .select("id")
        .eq("sku", dto.sku)
        .maybeSingle();
      if (dup?.id) return NextResponse.json({ message: "SKU already exists" }, { status: 400 });
      const now = new Date().toISOString();
      const { data: variant, error: vErr } = await sb
        .from("ProductVariant")
        .insert({
          id: crypto.randomUUID(),
          productId,
          sku: dto.sku,
          salePrice: dto.salePrice ?? null,
          stock: dto.quantity,
          updatedAt: now,
        })
        .select("*")
        .single();
      if (vErr) throw new Error(vErr.message);
      const { data: inventory, error: iErr } = await sb
        .from("Inventory")
        .insert({
          id: crypto.randomUUID(),
          productVariantId: variant.id,
          quantity: dto.quantity,
          lowStockThreshold: 5,
          updatedAt: now,
        })
        .select("*")
        .single();
      if (iErr) throw new Error(iErr.message);
      return NextResponse.json({ ...variant, inventory });
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "images" &&
      segments.length === 4
    ) {
      const productId = segments[2];
      const dto = body as { url: string; isPrimary?: boolean };
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      if (dto.isPrimary) {
        await sb.from("ProductImage").update({ isPrimary: false }).eq("productId", productId);
      }
      const { data: image, error: iErr } = await sb
        .from("ProductImage")
        .insert({
          id: crypto.randomUUID(),
          productId,
          url: dto.url,
          isPrimary: dto.isPrimary ?? false,
        })
        .select("*")
        .single();
      if (iErr) throw new Error(iErr.message);
      return NextResponse.json(image);
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
      return NextResponse.json(await updateCartItem(appUserId, segments[2], body as { quantity: number }));
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
        await updateDriverAssignmentStatus(
          driverAuth.appUserId,
          segments[3],
          body as {
            status: DeliveryStatus;
            notes?: string;
            locationLat?: number;
            locationLng?: number;
            proofImageUrl?: string;
            failureReason?: string;
            failureNotes?: string;
          },
        ),
      );
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "orders" && segments[2] === "items" && segments[4] === "ready-for-pickup" && segments.length === 5) {
      const orderItemId = segments[3];
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: item, error: itemErr } = await sb
        .from("OrderItem")
        .select("id, orderId, storeId, currentStatus")
        .eq("id", orderItemId)
        .maybeSingle();
      if (itemErr) throw new Error(itemErr.message);
      if (!item || item.storeId !== store.id) {
        return NextResponse.json({ message: "Order item not found" }, { status: 404 });
      }
      const allowed = new Set(["PAID", "CONFIRMED", "PREPARING"]);
      if (!allowed.has(item.currentStatus)) {
        return NextResponse.json(
          { message: "Item is not in a state that can be marked ready for pickup" },
          { status: 400 },
        );
      }
      await sb
        .from("OrderItem")
        .update({ currentStatus: "READY_FOR_PICKUP", updatedAt: new Date().toISOString() })
        .eq("id", orderItemId);
      await sb.from("OrderItemStatusHistory").insert({
        id: crypto.randomUUID(),
        orderItemId,
        status: "READY_FOR_PICKUP",
        notes: `vendor ${ownerId} marked ready`,
      });
      await sb.from("ActivityLog").insert({
        id: crypto.randomUUID(),
        userId: ownerId,
        type: "UPDATE",
        action: "ORDER_ITEM_READY_FOR_PICKUP",
        metadata: { orderItemId, orderId: item.orderId },
      });
      const { data: pending } = await sb
        .from("OrderItem")
        .select("id")
        .eq("orderId", item.orderId)
        .neq("currentStatus", "READY_FOR_PICKUP");
      if ((pending ?? []).length === 0) {
        await sb
          .from("Order")
          .update({ currentStatus: "READY_FOR_PICKUP", updatedAt: new Date().toISOString() })
          .eq("id", item.orderId);
        await sb.from("OrderStatusHistory").insert({
          id: crypto.randomUUID(),
          orderId: item.orderId,
          status: "READY_FOR_PICKUP",
          notes: `all items ready store=${store.id}`,
        });
      }
      const { data: updated } = await sb.from("OrderItem").select("*").eq("id", orderItemId).single();
      return NextResponse.json(updated);
    }
    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 3) {
      const productId = segments[2];
      const dto = body as {
        title?: string;
        description?: string;
        basePrice?: number;
        categoryId?: string;
        status?: string;
      };
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: existing } = await sb
        .from("Product")
        .select("*")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!existing || existing.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      if (dto.categoryId) {
        const { data: cat } = await sb
          .from("ProductCategory")
          .select("id")
          .eq("id", dto.categoryId)
          .maybeSingle();
        if (!cat) return NextResponse.json({ message: "Invalid category" }, { status: 400 });
      }
      let nextSlug = existing.slug;
      if (dto.title && dto.title !== existing.title) {
        nextSlug = await ensureUniqueProductSlug(sb, dto.title);
      }
      const { error: updateErr } = await sb
        .from("Product")
        .update({
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.title !== undefined ? { slug: nextSlug } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", productId);
      if (updateErr) throw new Error(updateErr.message);
      if (dto.status && dto.status !== existing.status) {
        await sb.from("ProductStatusHistory").insert({
          id: crypto.randomUUID(),
          productId,
          status: dto.status,
          notes: `vendor ${ownerId}`,
        });
      }
      await sb.from("ActivityLog").insert({
        id: crypto.randomUUID(),
        userId: ownerId,
        type: "UPDATE",
        action: "PRODUCT_UPDATE",
        metadata: { productId },
      });
      return NextResponse.json(await getProductWithRelations(sb, productId));
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "variants" &&
      segments.length === 5
    ) {
      const productId = segments[2];
      const variantId = segments[4];
      const dto = body as { sku?: string; salePrice?: number | null; quantity?: number };
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      const { data: variant } = await sb
        .from("ProductVariant")
        .select("*")
        .eq("id", variantId)
        .eq("productId", productId)
        .maybeSingle();
      if (!variant) return NextResponse.json({ message: "Variant not found" }, { status: 404 });
      if (dto.sku && dto.sku !== variant.sku) {
        const { data: dup } = await sb
          .from("ProductVariant")
          .select("id")
          .eq("sku", dto.sku)
          .maybeSingle();
        if (dup?.id) return NextResponse.json({ message: "SKU already exists" }, { status: 400 });
      }
      const { data: currentInv } = await sb
        .from("Inventory")
        .select("*")
        .eq("productVariantId", variantId)
        .maybeSingle();
      const { data: updated, error: updatedErr } = await sb
        .from("ProductVariant")
        .update({
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
          ...(dto.quantity !== undefined ? { stock: dto.quantity } : {}),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", variantId)
        .select("*")
        .single();
      if (updatedErr) throw new Error(updatedErr.message);
      if (dto.quantity !== undefined && currentInv?.id) {
        const delta = dto.quantity - (currentInv.quantity ?? 0);
        await sb
          .from("Inventory")
          .update({ quantity: dto.quantity, updatedAt: new Date().toISOString() })
          .eq("id", currentInv.id);
        if (delta !== 0) {
          await sb.from("StockMovement").insert({
            id: crypto.randomUUID(),
            inventoryId: currentInv.id,
            quantity: delta,
            type: "ADJUSTMENT",
            notes: `vendor adjustment ${ownerId}`,
          });
        }
      }
      const { data: inv } = await sb
        .from("Inventory")
        .select("*")
        .eq("productVariantId", variantId)
        .maybeSingle();
      return NextResponse.json({ ...updated, inventory: inv ?? null });
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
      return NextResponse.json(await removeCartItem(appUserId, segments[2]));
    }

    const vendorAuth = await requireStoreOwner(req);
    if ("error" in vendorAuth) return vendorAuth.error;
    const ownerId = vendorAuth.appUserId;

    if (segments[0] === "vendor" && segments[1] === "products" && segments.length === 3) {
      const productId = segments[2];
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      await sb
        .from("Product")
        .update({
          deletedAt: new Date().toISOString(),
          status: "ARCHIVED",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", productId);
      await sb.from("ProductStatusHistory").insert({
        id: crypto.randomUUID(),
        productId,
        status: "ARCHIVED",
        notes: `archived by vendor ${ownerId}`,
      });
      await sb.from("ActivityLog").insert({
        id: crypto.randomUUID(),
        userId: ownerId,
        type: "DELETE",
        action: "PRODUCT_ARCHIVE",
        metadata: { productId },
      });
      return NextResponse.json({ id: productId, archived: true });
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "variants" &&
      segments.length === 5
    ) {
      const productId = segments[2];
      const variantId = segments[4];
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      const { data: variant } = await sb
        .from("ProductVariant")
        .select("id")
        .eq("id", variantId)
        .eq("productId", productId)
        .maybeSingle();
      if (!variant) return NextResponse.json({ message: "Variant not found" }, { status: 404 });
      const { data: countRows } = await sb
        .from("ProductVariant")
        .select("id")
        .eq("productId", productId);
      if ((countRows ?? []).length <= 1) {
        return NextResponse.json(
          { message: "Cannot delete the last variant; archive the product instead" },
          { status: 400 },
        );
      }
      await sb.from("ProductVariant").delete().eq("id", variantId);
      return NextResponse.json({ deleted: true });
    }
    if (
      segments[0] === "vendor" &&
      segments[1] === "products" &&
      segments[3] === "images" &&
      segments.length === 5
    ) {
      const productId = segments[2];
      const imageId = segments[4];
      const sb = await getServiceClient();
      const store = await requireOwnerStore(ownerId);
      const { data: product } = await sb
        .from("Product")
        .select("id, storeId, deletedAt")
        .eq("id", productId)
        .is("deletedAt", null)
        .maybeSingle();
      if (!product || product.storeId !== store.id) {
        return NextResponse.json({ message: "Product not found" }, { status: 404 });
      }
      const { data: img } = await sb
        .from("ProductImage")
        .select("id")
        .eq("id", imageId)
        .eq("productId", productId)
        .maybeSingle();
      if (!img) return NextResponse.json({ message: "Image not found" }, { status: 404 });
      await sb.from("ProductImage").delete().eq("id", imageId);
      return NextResponse.json({ deleted: true });
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}
