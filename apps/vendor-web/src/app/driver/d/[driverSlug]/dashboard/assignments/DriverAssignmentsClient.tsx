"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AssignmentStatusBadge } from "@/components/driver/AssignmentStatusBadge";
import type { AssignmentListItem } from "@/lib/driver/loadAssignmentViews";

type Res = { assignments: AssignmentListItem[] };

export function DriverAssignmentsClient({
  driverSlug,
  mode,
}: {
  driverSlug: string;
  mode: "active" | "available" | "all";
}) {
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
          `/driver/assignments?driverSlug=${encodeURIComponent(driverSlug)}&mode=${mode}`,
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
  }, [driverSlug, mode]);

  const base = `/driver/d/${driverSlug}/dashboard/assignments`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold">Assignments</h2>
        <p className="text-sm text-muted-foreground mt-1">Live deliveries and claim pool.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["available", "Available to claim"],
          ] as const
        ).map(([m, label]) => (
          <Link
            key={m}
            href={m === "all" ? base : `${base}?mode=${m}`}
            className={`rounded-full px-3 py-1 text-sm border ${
              mode === m
                ? "bg-[var(--color-foreground)] text-white border-transparent"
                : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]"
            }`}
          >
            {label}
          </Link>
        ))}
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
          No assignments in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((row) => (
            <li key={row.assignment.id} className="luxury-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.assignment.id.slice(0, 8)}…
                  </span>
                  <AssignmentStatusBadge status={row.assignment.status} />
                </div>
                <p className="font-medium mt-1">
                  {row.store?.name ?? "Store"} · {row.itemCount} items
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {row.order ? `Order #${row.order.orderNumber}` : "Order"} · {row.deliverySummary}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {new Date(row.assignment.updatedAt).toLocaleString()}
                </p>
              </div>
              <Link
                href={`/driver/d/${driverSlug}/dashboard/assignments/${row.assignment.id}`}
                className="shrink-0 luxury-button text-sm py-2 px-4 text-center"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
