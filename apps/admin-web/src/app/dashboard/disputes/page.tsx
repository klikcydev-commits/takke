"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<unknown[]>("/admin/disputes")
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
      <h1 className="text-3xl font-bold text-gray-900">Disputes</h1>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono">{r.order?.orderNumber}</td>
                <td className="px-4 py-3">{r.user?.email}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="max-w-md truncate px-4 py-3 text-gray-600">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
