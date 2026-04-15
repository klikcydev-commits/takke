"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/driver/StatCard";
import { AssignmentStatusBadge } from "@/components/driver/AssignmentStatusBadge";
import type { AssignmentListItem } from "@/lib/driver/loadAssignmentViews";

type MeResponse = {
  access: {
    roles: string[];
    driverApplicationStatus: string | null;
  };
  driverApplication: Record<string, unknown> | null;
  profile: { phone: string | null; firstName?: string | null; lastName?: string | null } | null;
};

type OverviewResponse = {
  stats: {
    activeAssignments: number;
    availableToClaim: number;
    completedLifetime: number;
    completedToday: number;
    completedThisWeek: number;
    pendingPickup: number;
  };
  recentAssignments: AssignmentListItem[];
  driver: { isActive: boolean; vehicleType: string | null; licensePlate: string | null };
};

export function DriverOverviewClient({ driverSlug }: { driverSlug: string }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const approved = me?.access.roles.includes("DELIVERY_DRIVER");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr(null);
      setLoading(true);
      try {
        const m = await apiFetch<MeResponse>("/driver/me");
        if (cancelled) return;
        setMe(m);
        const approvedDriver = m.access.roles.includes("DELIVERY_DRIVER");
        if (approvedDriver) {
          const ov = await apiFetch<OverviewResponse>(
            `/driver/overview?driverSlug=${encodeURIComponent(driverSlug)}`,
          );
          if (!cancelled) setOverview(ov);
        } else {
          setOverview(null);
        }
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--color-border)] rounded w-1/3" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--color-border)] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>
    );
  }

  if (!approved) {
    const app = me?.driverApplication;
    return (
      <div className="space-y-6">
        <div className="luxury-card p-6 border-amber-200 bg-amber-50/80">
          <h2 className="text-xl font-serif font-semibold text-amber-950">Application status</h2>
          <p className="text-sm text-amber-900 mt-2">
            Your driver application is being reviewed. Delivery operations unlock after admin approval.
          </p>
          <p className="text-sm font-medium mt-3">
            Status:{" "}
            <span className="inline-flex rounded-full bg-white px-2 py-0.5 border border-amber-300">
              {me?.access.driverApplicationStatus ?? "PENDING"}
            </span>
          </p>
        </div>

        {app ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="luxury-card p-5">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Vehicle
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{String(app.vehicleType ?? "—")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Model</dt>
                  <dd>{String(app.vehicleModel ?? "—")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Plate</dt>
                  <dd>{String(app.licensePlate ?? "—")}</dd>
                </div>
              </dl>
            </div>
            <div className="luxury-card p-5">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Contact
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{String(app.fullName ?? "—")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{me?.profile?.phone ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}

        {me?.access.driverApplicationStatus === "REJECTED" ? (
          <p className="text-sm text-muted-foreground">
            Need to reapply?{" "}
            <Link href="/register/driver" className="underline font-medium">
              Update your application
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  const s = overview?.stats;
  const recent = overview?.recentAssignments ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Availability:{" "}
          <span className={overview?.driver.isActive ? "text-emerald-700 font-medium" : "text-muted-foreground"}>
            {overview?.driver.isActive ? "Available" : "Offline"}
          </span>
          {overview?.driver.vehicleType ? (
            <span className="ml-2">· {overview.driver.vehicleType}</span>
          ) : null}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active assignments" value={s?.activeAssignments ?? 0} />
        <StatCard label="Open to claim" value={s?.availableToClaim ?? 0} hint="Unassigned pool" />
        <StatCard label="Completed (today)" value={s?.completedToday ?? 0} />
        <StatCard label="Completed (week)" value={s?.completedThisWeek ?? 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 luxury-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent activity</h3>
            <Link
              href={`/driver/d/${driverSlug}/dashboard/assignments`}
              className="text-sm underline text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active assignments right now.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((row) => (
                <li
                  key={row.assignment.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {row.order ? `Order #${row.order.orderNumber}` : "Assignment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.store?.name ?? "Store"} · {row.itemCount} items · {row.deliverySummary}
                    </p>
                  </div>
                  <AssignmentStatusBadge status={row.assignment.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="luxury-card p-5 space-y-3">
          <h3 className="font-semibold">Quick actions</h3>
          <Link
            href={`/driver/d/${driverSlug}/dashboard/assignments?mode=available`}
            className="block w-full text-center luxury-button text-sm py-2.5"
          >
            Claim delivery
          </Link>
          <Link
            href={`/driver/d/${driverSlug}/dashboard/assignments`}
            className="block w-full text-center rounded-xl border border-[var(--color-border)] py-2.5 text-sm hover:bg-[var(--color-secondary)]"
          >
            My assignments
          </Link>
          <Link
            href={`/driver/d/${driverSlug}/dashboard/settings`}
            className="block w-full text-center rounded-xl border border-[var(--color-border)] py-2.5 text-sm hover:bg-[var(--color-secondary)]"
          >
            Vehicle & availability
          </Link>
        </div>
      </div>
    </div>
  );
}
