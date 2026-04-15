"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, uploadStorageFile } from "@/lib/api";
import { AssignmentStatusBadge } from "@/components/driver/AssignmentStatusBadge";
import { DeliveryTimeline } from "@/components/driver/DeliveryTimeline";
import {
  acceptDriverAssignmentClient,
  patchDriverAssignmentClient,
} from "@/lib/driver/assignmentClientActions";
import { nextDeliveryActions, canFailFrom } from "@/lib/driver/deliveryFlow";
import type { DeliveryUiStatus } from "@/lib/driver/deliveryFlow";

type Detail = {
  assignment: { id: string; driverId: string | null; status: string; createdAt: string; updatedAt: string };
  orderItems: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  stores: Array<{ id: string; name: string; slug: string | null }>;
  addresses: Array<{
    orderId: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
  tracking: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }>;
  proofs: Array<{ id: string; imageUrl: string; notes: string | null; createdAt: string }>;
  failures: Array<{ id: string; reason: string; notes: string | null; createdAt: string }>;
  customerProfiles: Array<{ userId: string; firstName: string | null; lastName: string | null; phone: string | null }>;
};

export function DriverAssignmentDetailClient({
  driverSlug,
  assignmentId,
}: {
  driverSlug: string;
  assignmentId: string;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [failNotes, setFailNotes] = useState("");
  const [deliverNotes, setDeliverNotes] = useState("");

  const load = async () => {
    const res = await apiFetch<Detail>(
      `/driver/assignments/${assignmentId}?driverSlug=${encodeURIComponent(driverSlug)}`,
    );
    setDetail(res);
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr(null);
      try {
        const res = await apiFetch<Detail>(
          `/driver/assignments/${assignmentId}?driverSlug=${encodeURIComponent(driverSlug)}`,
        );
        if (!cancelled) setDetail(res);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, driverSlug]);

  const st = detail?.assignment.status as DeliveryUiStatus | undefined;

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept() {
    await runAction(() => acceptDriverAssignmentClient(assignmentId));
  }

  async function onPatch(status: string, extra: Record<string, unknown> = {}) {
    await runAction(() => patchDriverAssignmentClient(assignmentId, { status, ...extra }));
  }

  async function onDeliverWithProof(file?: File) {
    let proofImageUrl: string | undefined;
    if (file) {
      const uploaded = await uploadStorageFile(file, {
        bucket: "documents",
        path: `delivery-proofs/${assignmentId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      });
      proofImageUrl = uploaded.url;
    }
    await runAction(() =>
      patchDriverAssignmentClient(assignmentId, {
        status: "DELIVERED",
        notes: deliverNotes.trim() || undefined,
        proofImageUrl,
      }),
    );
  }

  const base = `/driver/d/${driverSlug}/dashboard`;

  if (err && !detail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {err}
        <div className="mt-3">
          <Link href={`${base}/assignments`} className="underline">
            Back to assignments
          </Link>
        </div>
      </div>
    );
  }

  if (!detail) {
    return <div className="animate-pulse h-40 bg-[var(--color-border)] rounded-xl" />;
  }

  const order = detail.orders[0] as { id?: string; orderNumber?: string; customerId?: string } | undefined;
  const addr = detail.addresses[0];
  const store = detail.stores[0];
  const customer = detail.customerProfiles[0];
  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"
    : "Customer";

  const next = st ? nextDeliveryActions(st) : [];
  const showFail = st && canFailFrom(st);
  const deliverNext = next.includes("DELIVERED");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`${base}/assignments`} className="text-sm text-muted-foreground hover:underline">
            ← Assignments
          </Link>
          <h2 className="text-2xl font-serif font-semibold mt-2">Assignment detail</h2>
          <p className="font-mono text-xs text-muted-foreground mt-1">{detail.assignment.id}</p>
        </div>
        <AssignmentStatusBadge status={detail.assignment.status} />
      </div>

      {err ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">{err}</div> : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="luxury-card p-5 space-y-3">
          <h3 className="font-semibold">Pickup</h3>
          <p className="text-sm">
            <span className="text-muted-foreground">Store</span>
            <br />
            {store?.name ?? "—"}
          </p>
        </div>
        <div className="luxury-card p-5 space-y-3">
          <h3 className="font-semibold">Drop-off</h3>
          {order ? (
            <p className="text-sm">
              Order <span className="font-medium">#{order.orderNumber ?? order.id}</span>
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">Recipient: {customerName}</p>
          {customer?.phone ? (
            <p className="text-sm">
              Phone: <span className="font-medium">{customer.phone}</span>
            </p>
          ) : null}
          {addr ? (
            <p className="text-sm leading-relaxed">
              {addr.street}
              <br />
              {addr.city}, {addr.state} {addr.postalCode}
              <br />
              {addr.country}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Address on file</p>
          )}
        </div>
      </div>

      <div className="luxury-card p-5">
        <h3 className="font-semibold mb-3">Items</h3>
        <ul className="divide-y divide-[var(--color-border)]">
          {detail.orderItems.map((oi) => {
            const item = oi as {
              id: string;
              titleSnapshot: string;
              quantity: number;
              skuSnapshot: string;
              currentStatus: string;
            };
            return (
              <li key={item.id} className="py-2 flex justify-between gap-4 text-sm">
                <span>
                  {item.titleSnapshot} × {item.quantity}
                </span>
                <span className="text-muted-foreground font-mono text-xs">{item.skuSnapshot}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="luxury-card p-5">
        <h3 className="font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-2">
          {detail.assignment.status === "ASSIGNED" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAccept()}
                className="luxury-button text-sm py-2 px-4 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onPatch("REJECTED", { notes: "rejected by driver" })}
                className="rounded-xl border border-red-200 py-2 px-4 text-sm text-red-900 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          ) : null}

          {next
            .filter((s) => s !== "DELIVERED")
            .map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => void onPatch(s)}
                className="rounded-xl border border-[var(--color-border)] py-2 px-4 text-sm hover:bg-[var(--color-secondary)] disabled:opacity-50"
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}

          {deliverNext ? (
            <div className="w-full space-y-2 border-t border-[var(--color-border)] pt-4 mt-2">
              <p className="text-sm font-medium">Complete delivery</p>
              <textarea
                className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
                placeholder="Notes (optional)"
                rows={2}
                value={deliverNotes}
                onChange={(e) => setDeliverNotes(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runAction(() => onDeliverWithProof(f));
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDeliverWithProof()}
                className="luxury-button text-sm py-2 px-4"
              >
                Mark delivered
              </button>
            </div>
          ) : null}

          {showFail ? (
            <div className="w-full space-y-2 border-t border-[var(--color-border)] pt-4 mt-2">
              <p className="text-sm font-medium text-red-900">Could not complete</p>
              <input
                className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
                placeholder="Reason code"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
                placeholder="Details"
                rows={2}
                value={failNotes}
                onChange={(e) => setFailNotes(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(() =>
                    patchDriverAssignmentClient(assignmentId, {
                      status: "FAILED",
                      failureReason: failReason.trim() || "failed",
                      failureNotes: failNotes.trim() || undefined,
                    }),
                  )
                }
                className="rounded-xl border border-red-200 bg-red-50 py-2 px-4 text-sm text-red-900"
              >
                Mark failed
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="luxury-card p-5">
          <h3 className="font-semibold mb-3">Timeline</h3>
          <DeliveryTimeline rows={detail.tracking} />
        </div>
        <div className="luxury-card p-5 space-y-3">
          <h3 className="font-semibold">Proofs</h3>
          {detail.proofs.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet</p>
          ) : (
            <ul className="space-y-2">
              {detail.proofs.map((p) => (
                <li key={p.id} className="text-sm">
                  <a href={p.imageUrl} target="_blank" rel="noreferrer" className="underline">
                    Image
                  </a>{" "}
                  · {new Date(p.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
          <h3 className="font-semibold pt-2">Failed attempts</h3>
          {detail.failures.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="text-sm space-y-1">
              {detail.failures.map((f) => (
                <li key={f.id}>
                  {f.reason} — {f.notes ?? ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
