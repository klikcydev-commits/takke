"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/vendor/DashboardShell";
import { useVendorStore } from "@/components/vendor/VendorStoreContext";
import { apiFetch } from "@/lib/api";
import { Plus, Search, Filter, Eye, Edit } from "lucide-react";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  status: string;
  category: { name: string };
  variants: Array<{
    stock: number;
    inventory: { quantity: number } | null;
  }>;
  images: Array<{ url: string }>;
};

function totalStock(p: ProductRow): number {
  return p.variants.reduce((sum, v) => {
    const q = v.inventory?.quantity ?? v.stock;
    return sum + q;
  }, 0);
}

export default function ProductsPage() {
  const { store } = useVendorStore();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s) ||
        p.category?.name?.toLowerCase().includes(s),
    );
  }, [rows, q]);

  useEffect(() => {
    if (!store?.id) {
      setLoading(false);
      return;
    }
    setError(null);
    apiFetch<ProductRow[]>("/stores/me/products")
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load products"))
      .finally(() => setLoading(false));
  }, [store?.id]);

  return (
    <DashboardShell title="Product Management">
      <div className="flex flex-col gap-6">
        {store?.id && (
          <p className="text-sm text-muted-foreground rounded-lg border border-border bg-secondary/20 px-4 py-3">
            Manage catalog for <span className="font-mono">{store.slug}</span>. Create and edit products with variants,
            images, and inventory.
          </p>
        )}
        {!store?.id && (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            Sign in and complete store onboarding to load products.
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              className="luxury-input h-10 w-full py-0 pl-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary opacity-60 cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <Link href="/vendor/dashboard/products/new" className="luxury-button flex h-10 items-center gap-2 py-0">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </div>
        </div>

        <div className="luxury-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondary/30">
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Stock</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="whitespace-nowrap px-6 py-4 pr-10 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Loading products…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      {rows.length === 0
                        ? "No products yet. Add your first product."
                        : "No products match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const img = product.images[0]?.url;
                    const stock = totalStock(product);
                    return (
                      <tr key={product.id} className="group transition-colors hover:bg-secondary/10">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {img ? (
                              <img
                                src={img}
                                alt=""
                                className="h-12 w-12 rounded-lg bg-secondary object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-secondary" />
                            )}
                            <div>
                              <div className="font-medium text-foreground">{product.title}</div>
                              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                {product.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{product.category?.name}</td>
                        <td className="px-6 py-4 font-medium">
                          {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
                            product.basePrice,
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-medium ${stock === 0 ? "text-rose-600" : "text-foreground"}`}
                          >
                            {stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ring-border">
                            {product.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link
                              href={`/vendor/dashboard/products/${product.id}/edit`}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/vendor/dashboard/products/${product.id}/edit`}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-secondary/10 px-6 py-4 text-muted-foreground">
            <span className="text-xs">
              {loading ? "—" : `Showing ${filtered.length} of ${rows.length} product${rows.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
