"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

export default function AdminStoresPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<unknown[]>("/admin/stores")
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
      <h1 className="text-3xl font-bold text-gray-900">All stores</h1>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.slug}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3 text-gray-600">{r.owner?.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
