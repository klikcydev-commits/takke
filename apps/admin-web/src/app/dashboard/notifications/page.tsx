"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function AdminNotificationsPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<unknown[]>("/admin/notifications")
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
      <p className="text-sm text-gray-500">Recent notifications across all users (read from database).</p>
      <div className="space-y-3">
        {rows.map((r: any) => (
          <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-4 text-xs text-gray-400">
              <span>{r.user?.email}</span>
              <span>{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 font-semibold text-gray-900">{r.title}</div>
            <div className="text-sm text-gray-600">{r.message}</div>
            <div className="mt-2 text-[10px] uppercase tracking-wide text-gray-400">{r.type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
