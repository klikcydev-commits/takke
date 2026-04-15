"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function AdminAuditPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<unknown[]>("/admin/audit-logs")
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
      <h1 className="text-3xl font-bold text-gray-900">Audit logs</h1>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{r.admin?.email}</td>
                <td className="px-4 py-3 font-medium">{r.action}</td>
                <td className="px-4 py-3">
                  {r.entity} / {r.entityId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
