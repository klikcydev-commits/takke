"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/vendor/DashboardShell";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

type Line = {
  id: string;
  quantity: number;
  subtotal: number;
  currentStatus: string;
  titleSnapshot: string;
  skuSnapshot: string;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    totalAmount: number;
    currentStatus: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    } | null;
    customer: {
      email: string;
      userProfile: { firstName?: string | null; lastName?: string | null } | null;
    };
    payment: { status: string; amount: number } | null;
  };
};

const READY_ALLOWED = new Set(["PAID", "CONFIRMED", "PREPARING"]);

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export default function VendorOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!orderId) return;
    setError(null);
    apiFetch<Line[]>(`/vendor/orders/${orderId}`)
      .then(setLines)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [orderId, load]);

  async function markReady(lineId: string) {
    setActionId(lineId);
    setError(null);
    try {
      await apiFetch(`/vendor/orders/items/${lineId}/ready-for-pickup`, { method: "PATCH" });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update line");
    } finally {
      setActionId(null);
    }
  }

  const head = lines[0]?.order;

  return (
    <DashboardShell title={head ? `Order ${head.orderNumber}` : "Order"}>
      <div className="max-w-4xl space-y-6">
        <Link href="/vendor/dashboard/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to orders
        </Link>

        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : !head ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <>
            <div className="luxury-card p-6 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Order</p>
                  <p className="font-semibold font-mono">{head.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Order status</p>
                  <p className="font-medium">{head.currentStatus.replace(/_/g, " ")}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Placed {new Date(head.createdAt).toLocaleString()} · Total {formatMoney(head.totalAmount)}
              </p>
              {head.payment && (
                <p className="text-sm">
                  Payment: <span className="font-medium">{head.payment.status}</span> ({formatMoney(head.payment.amount)})
                </p>
              )}
              {head.address && (
                <div className="text-sm pt-2 border-t border-border mt-2">
                  <p className="font-medium text-foreground">Ship to</p>
                  <p className="text-muted-foreground">
                    {head.address.street}, {head.address.city}, {head.address.state} {head.address.postalCode},{" "}
                    {head.address.country}
                  </p>
                </div>
              )}
              <div className="text-sm pt-2">
                <p className="font-medium text-foreground">Customer</p>
                <p className="text-muted-foreground">
                  {[head.customer.userProfile?.firstName, head.customer.userProfile?.lastName]
                    .filter(Boolean)
                    .join(" ") || head.customer.email}
                </p>
                <p className="text-muted-foreground">{head.customer.email}</p>
              </div>
            </div>

            <div className="luxury-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-secondary/20">
                <h2 className="font-semibold font-serif">Your line items</h2>
                <p className="text-xs text-muted-foreground">Mark items ready for pickup when they are prepared.</p>
              </div>
              <div className="divide-y divide-border">
                {lines.map((line) => (
                  <div key={line.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-medium">{line.titleSnapshot}</p>
                      <p className="text-xs text-muted-foreground font-mono">SKU {line.skuSnapshot}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Qty {line.quantity} · {formatMoney(line.subtotal)}
                      </p>
                      <p className="text-xs mt-1">
                        Status:{" "}
                        <span className="font-medium">{line.currentStatus.replace(/_/g, " ")}</span>
                      </p>
                    </div>
                    <div>
                      {READY_ALLOWED.has(line.currentStatus) ? (
                        <button
                          type="button"
                          className="luxury-button py-2 text-sm whitespace-nowrap"
                          disabled={actionId === line.id}
                          onClick={() => markReady(line.id)}
                        >
                          {actionId === line.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                              Updating…
                            </>
                          ) : (
                            "Mark ready for pickup"
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No pickup action for this status</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
