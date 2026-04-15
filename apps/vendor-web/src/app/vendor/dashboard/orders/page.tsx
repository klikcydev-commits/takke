"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/vendor/DashboardShell";
import { useVendorStore } from "@/components/vendor/VendorStoreContext";
import { apiFetch } from "@/lib/api";
import { Search, Eye } from "lucide-react";

type OrderItemRow = {
  id: string;
  orderId: string;
  quantity: number;
  subtotal: number;
  currentStatus: string;
  titleSnapshot: string;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    totalAmount: number;
    currentStatus: string;
    customer: {
      email: string;
      userProfile: { firstName?: string | null; lastName?: string | null } | null;
    };
  };
};

type Grouped = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerLabel: string;
  orderTotal: number;
  orderStatus: string;
  lineCount: number;
  storeSubtotal: number;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  const { store } = useVendorStore();
  const [rows, setRows] = useState<OrderItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!store?.id) {
      setLoading(false);
      return;
    }
    setError(null);
    apiFetch<OrderItemRow[]>("/vendor/orders")
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [store?.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, Grouped>();
    for (const line of rows) {
      const o = line.order;
      const prof = o.customer.userProfile;
      const name = [prof?.firstName, prof?.lastName].filter(Boolean).join(" ").trim();
      const customerLabel = name || o.customer.email;
      const existing = map.get(o.id);
      if (!existing) {
        map.set(o.id, {
          orderId: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          customerLabel,
          orderTotal: o.totalAmount,
          orderStatus: o.currentStatus,
          lineCount: 1,
          storeSubtotal: line.subtotal,
        });
      } else {
        existing.lineCount += 1;
        existing.storeSubtotal += line.subtotal;
      }
    }
    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (g) =>
        g.orderNumber.toLowerCase().includes(s) ||
        g.customerLabel.toLowerCase().includes(s) ||
        g.orderStatus.toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <DashboardShell title="Order Management">
      <div className="flex flex-col gap-6">
        {!store?.id && (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            Sign in with your vendor account to load orders for your store.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders…"
              className="w-full luxury-input pl-10 h-10 py-0"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="luxury-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondary/30">
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Your lines</th>
                  <th className="px-6 py-4 font-semibold">Store subtotal</th>
                  <th className="px-6 py-4 font-semibold">Order total</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right pr-6 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      Loading orders…
                    </td>
                  </tr>
                ) : grouped.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No orders yet for your store.
                    </td>
                  </tr>
                ) : (
                  grouped.map((g) => (
                    <tr key={g.orderId} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-primary">
                        {g.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">{g.customerLabel}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {formatDate(g.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{g.lineCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{formatMoney(g.storeSubtotal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {formatMoney(g.orderTotal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ring-border">
                          {g.orderStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right pr-6 whitespace-nowrap">
                        <Link
                          href={`/vendor/dashboard/orders/${g.orderId}`}
                          className="inline-flex p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-border flex items-center justify-between text-muted-foreground bg-secondary/10">
            <span className="text-xs">
              {loading ? "—" : `${grouped.length} order${grouped.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
