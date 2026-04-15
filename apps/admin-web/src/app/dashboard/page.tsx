"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

type Overview = {
  users: number;
  stores: number;
  orders: number;
  pendingStoreApplications: number;
  pendingDriverApplications: number;
  openDisputes: number;
};

export default function DashboardOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Overview>("/admin/overview")
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load overview");
      });
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-800">
        {error}. Ensure `SUPABASE_JWT_SECRET` and database env are set and you are logged in as admin.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        Loading overview…
      </div>
    );
  }

  const cards = [
    { label: "Users", value: data.users, href: "/dashboard/users" },
    { label: "Stores", value: data.stores, href: "/dashboard/stores" },
    { label: "Orders", value: data.orders, href: "/dashboard/orders" },
    { label: "Pending store apps", value: data.pendingStoreApplications, href: "/dashboard/applications" },
    { label: "Pending driver apps", value: data.pendingDriverApplications, href: "/dashboard/applications" },
    { label: "Open disputes", value: data.openDisputes, href: "/dashboard/disputes" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Overview</h1>
        <p className="text-gray-500">Live counts from the database via Next `/api/admin` routes.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-gray-200"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{c.label}</div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-gray-900">{c.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
