"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AssignmentStatusBadge } from "@/components/driver/AssignmentStatusBadge";
import type { AssignmentListItem } from "@/lib/driver/loadAssignmentViews";

type Res = { assignments: AssignmentListItem[] };

export function DriverHistoryClient({ driverSlug }: { driverSlug: string }) {
  const [data, setData] = useState<AssignmentListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await apiFetch<Res>(
          `/driver/history?driverSlug=${encodeURIComponent(driverSlug)}&take=60`,
        );
        if (!cancelled) setData(res.assignments);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [driverSlug]);

  const base = `/driver/d/${driverSlug}/dashboard`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold">History</h2>
        <p className="text-sm text-muted-foreground mt-1">Completed and failed deliveries.</p>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[var(--color-border)] rounded-xl" />
          ))}
        </div>
      ) : err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>
      ) : data.length === 0 ? (
        <div className="luxury-card p-8 text-center text-muted-foreground text-sm">
          No completed deliveries yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((row) => (
            <li key={row.assignment.id} className="luxury-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.assignment.id.slice(0, 8)}…
                  </span>
                  <AssignmentStatusBadge status={row.assignment.status} />
                </div>
                <p className="font-medium mt-1">
                  {row.store?.name ?? "Store"} · {row.itemCount} items
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.order ? `Order #${row.order.orderNumber}` : "Order"} · {row.deliverySummary}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(row.assignment.updatedAt).toLocaleString()}
                </p>
              </div>
              <Link
                href={`${base}/assignments/${row.assignment.id}`}
                className="shrink-0 text-sm underline text-muted-foreground"
              >
                Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
