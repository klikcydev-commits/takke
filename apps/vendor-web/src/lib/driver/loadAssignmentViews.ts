import type { SupabaseClient } from "@supabase/supabase-js";

export type AssignmentListItem = {
  assignment: {
    id: string;
    driverId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  itemCount: number;
  store: { id: string; name: string; slug: string | null } | null;
  order: {
    id: string;
    orderNumber: string;
    currentStatus: string;
  } | null;
  deliverySummary: string;
  customerLabel: string;
};

async function hydrateAssignments(
  sb: SupabaseClient,
  assignments: Array<{
    id: string;
    driverId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>,
): Promise<AssignmentListItem[]> {
  if (assignments.length === 0) return [];
  const ids = assignments.map((a) => a.id);
  const { data: links } = await sb.from("DeliveryAssignmentItem").select("assignmentId, orderItemId").in("assignmentId", ids);
  const orderItemIds = [...new Set((links ?? []).map((l) => l.orderItemId))];
  const { data: orderItems } = orderItemIds.length
    ? await sb.from("OrderItem").select("id, orderId, storeId").in("id", orderItemIds)
    : { data: [] };
  const orderIds = [...new Set((orderItems ?? []).map((o) => o.orderId))];
  const storeIds = [...new Set((orderItems ?? []).map((o) => o.storeId))];

  const [{ data: orders }, { data: stores }, { data: addresses }] = await Promise.all([
    orderIds.length
      ? sb.from("Order").select("id, orderNumber, currentStatus").in("id", orderIds)
      : Promise.resolve({ data: [] }),
    storeIds.length ? sb.from("Store").select("id, name, slug").in("id", storeIds) : Promise.resolve({ data: [] }),
    orderIds.length
      ? sb.from("OrderAddress").select("orderId, street, city, state, postalCode, country").in("orderId", orderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
  const storeById = new Map((stores ?? []).map((s) => [s.id, s]));
  const addrByOrder = new Map((addresses ?? []).map((a) => [a.orderId, a]));
  const itemsByAssignment = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = itemsByAssignment.get(l.assignmentId) ?? [];
    arr.push(l.orderItemId);
    itemsByAssignment.set(l.assignmentId, arr);
  }

  return assignments.map((a) => {
    const oids = itemsByAssignment.get(a.id) ?? [];
    const relatedItems = (orderItems ?? []).filter((oi) => oids.includes(oi.id));
    const firstOrderId = relatedItems[0]?.orderId;
    const order = firstOrderId ? orderById.get(firstOrderId) ?? null : null;
    const firstStoreId = relatedItems[0]?.storeId;
    const store = firstStoreId ? storeById.get(firstStoreId) ?? null : null;
    const addr = firstOrderId ? addrByOrder.get(firstOrderId) : undefined;
    const deliverySummary = addr
      ? [addr.city, addr.state, addr.country].filter(Boolean).join(", ")
      : "—";
    return {
      assignment: a,
      itemCount: oids.length,
      store: store ? { id: store.id, name: store.name, slug: store.slug } : null,
      order: order
        ? { id: order.id, orderNumber: order.orderNumber, currentStatus: order.currentStatus }
        : null,
      deliverySummary,
      customerLabel: order ? `Order #${order.orderNumber}` : "Customer",
    };
  });
}

export async function listAssignmentsForDriver(
  sb: SupabaseClient,
  driverId: string,
  mode: "active" | "available" | "all",
) {
  const terminal = new Set(["DELIVERED", "FAILED", "REJECTED"]);

  const { data: mine, error: e1 } = await sb
    .from("DeliveryAssignment")
    .select("id, driverId, status, createdAt, updatedAt")
    .eq("driverId", driverId)
    .order("updatedAt", { ascending: false });
  if (e1) throw new Error(e1.message);

  const { data: pool, error: e2 } = await sb
    .from("DeliveryAssignment")
    .select("id, driverId, status, createdAt, updatedAt")
    .is("driverId", null)
    .eq("status", "ASSIGNED")
    .order("createdAt", { ascending: false });
  if (e2) throw new Error(e2.message);

  const merged: typeof mine = [];
  const seen = new Set<string>();
  for (const a of [...(mine ?? []), ...(pool ?? [])]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    merged.push(a);
  }

  let filtered = merged;
  if (mode === "active") {
    filtered = merged.filter((a) => a.driverId === driverId && !terminal.has(a.status));
  } else if (mode === "available") {
    filtered = merged.filter((a) => !a.driverId && a.status === "ASSIGNED");
  } else if (mode === "all") {
    filtered = merged.filter((a) => {
      if (!a.driverId) return a.status === "ASSIGNED";
      return a.driverId === driverId;
    });
  }

  filtered.sort((x, y) => new Date(y.updatedAt).getTime() - new Date(x.updatedAt).getTime());
  return hydrateAssignments(sb, filtered);
}

export async function listHistoryForDriver(sb: SupabaseClient, driverId: string, take: number) {
  const { data: assignments, error } = await sb
    .from("DeliveryAssignment")
    .select("id, driverId, status, createdAt, updatedAt")
    .eq("driverId", driverId)
    .in("status", ["DELIVERED", "FAILED", "REJECTED"])
    .order("updatedAt", { ascending: false })
    .limit(Math.min(200, take));
  if (error) throw new Error(error.message);
  return hydrateAssignments(sb, assignments ?? []);
}

export async function getAssignmentDetailForDriver(
  sb: SupabaseClient,
  driverId: string,
  assignmentId: string,
  options: { allowUnassignedPool: boolean },
) {
  const { data: assignment, error: aErr } = await sb
    .from("DeliveryAssignment")
    .select("id, driverId, status, createdAt, updatedAt")
    .eq("id", assignmentId)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!assignment) return null;

  const owns = assignment.driverId === driverId;
  const pool =
    options.allowUnassignedPool && !assignment.driverId && assignment.status === "ASSIGNED";
  if (!owns && !pool) return null;

  const { data: links } = await sb
    .from("DeliveryAssignmentItem")
    .select("id, assignmentId, orderItemId")
    .eq("assignmentId", assignmentId);
  const orderItemIds = (links ?? []).map((l) => l.orderItemId);
  const { data: orderItems } = orderItemIds.length
    ? await sb.from("OrderItem").select("*").in("id", orderItemIds)
    : { data: [] };

  const orderIds = [...new Set((orderItems ?? []).map((i) => i.orderId))];
  const storeIds = [...new Set((orderItems ?? []).map((i) => i.storeId))];

  const [{ data: orders }, { data: stores }, { data: addresses }, { data: tracking }, { data: proofs }, { data: failures }] =
    await Promise.all([
      orderIds.length
        ? sb.from("Order").select("*").in("id", orderIds)
        : Promise.resolve({ data: [] }),
      storeIds.length
        ? sb.from("Store").select("id, name, slug, status").in("id", storeIds)
        : Promise.resolve({ data: [] }),
      orderIds.length
        ? sb.from("OrderAddress").select("*").in("orderId", orderIds)
        : Promise.resolve({ data: [] }),
      sb
        .from("DeliveryTrackingUpdate")
        .select("*")
        .eq("assignmentId", assignmentId)
        .order("createdAt", { ascending: true }),
      sb.from("DeliveryProof").select("*").eq("assignmentId", assignmentId).order("createdAt", { ascending: false }),
      sb.from("FailedDeliveryAttempt").select("*").eq("assignmentId", assignmentId).order("createdAt", { ascending: false }),
    ]);

  const customerIds = [...new Set((orders ?? []).map((o) => o.customerId).filter(Boolean))];
  const { data: customerProfiles } = customerIds.length
    ? await sb.from("UserProfile").select("userId, firstName, lastName, phone").in("userId", customerIds)
    : { data: [] };

  return {
    assignment,
    links: links ?? [],
    orderItems: orderItems ?? [],
    orders: orders ?? [],
    stores: stores ?? [],
    addresses: addresses ?? [],
    tracking: tracking ?? [],
    proofs: proofs ?? [],
    failures: failures ?? [],
    customerProfiles: customerProfiles ?? [],
  };
}
