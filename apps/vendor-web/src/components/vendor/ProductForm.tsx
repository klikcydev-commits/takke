"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, uploadStorageFile } from "@/lib/api";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";

type Category = { id: string; name: string; slug: string };

type VariantRow = {
  id?: string;
  sku: string;
  salePrice: string;
  quantity: string;
};

type ProductImage = { id: string; url: string; isPrimary: boolean };

const STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"] as const;

type ProductPayload = {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  status: string;
  categoryId: string;
  category?: Category | null;
  variants: Array<{
    id: string;
    sku: string;
    salePrice: number | null;
    stock: number;
    inventory: { quantity: number } | null;
  }>;
  images: ProductImage[];
};

export function ProductForm({ mode, productId }: { mode: "create" | "edit"; productId?: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<string>("DRAFT");
  const [variants, setVariants] = useState<VariantRow[]>([{ sku: "", salePrice: "", quantity: "0" }]);
  const [images, setImages] = useState<ProductImage[]>([]);

  const loadCategories = useCallback(() => {
    apiFetch<Category[]>("/catalog/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const loadProduct = useCallback(() => {
    if (mode !== "edit" || !productId) return;
    setLoading(true);
    setError(null);
    apiFetch<ProductPayload>(`/vendor/products/${productId}`)
      .then((p) => {
        setTitle(p.title);
        setDescription(p.description);
        setBasePrice(String(p.basePrice));
        setCategoryId(p.categoryId);
        setStatus(p.status);
        setImages(p.images ?? []);
        setVariants(
          p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            salePrice: v.salePrice != null ? String(v.salePrice) : "",
            quantity: String(v.inventory?.quantity ?? v.stock ?? 0),
          })),
        );
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load product"))
      .finally(() => setLoading(false));
  }, [mode, productId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  function addVariantRow() {
    setVariants((v) => [...v, { sku: "", salePrice: "", quantity: "0" }]);
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function removeVariantRow(i: number) {
    setVariants((rows) => rows.filter((_, j) => j !== i));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        basePrice: parseFloat(basePrice),
        categoryId,
        status,
        variants: variants.map((v) => ({
          sku: v.sku.trim(),
          quantity: parseInt(v.quantity, 10) || 0,
          ...(v.salePrice.trim() !== "" ? { salePrice: parseFloat(v.salePrice) } : {}),
        })),
      };
      if (!body.categoryId) throw new Error("Choose a category");
      if (!body.variants.length) throw new Error("Add at least one variant");
      const created = await apiFetch<{ id: string }>("/vendor/products", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/vendor/dashboard/products/${created.id}/edit`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveProductMeta(e: React.FormEvent) {
    e.preventDefault();
    if (mode !== "edit" || !productId) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/vendor/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          basePrice: parseFloat(basePrice),
          categoryId,
          status,
        }),
      });
      loadProduct();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveVariant(i: number) {
    if (mode !== "edit" || !productId) return;
    const row = variants[i];
    if (!row.id) {
      setSaving(true);
      setError(null);
      try {
        await apiFetch(`/vendor/products/${productId}/variants`, {
          method: "POST",
          body: JSON.stringify({
            sku: row.sku.trim(),
            quantity: parseInt(row.quantity, 10) || 0,
            ...(row.salePrice.trim() !== "" ? { salePrice: parseFloat(row.salePrice) } : {}),
          }),
        });
        loadProduct();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to add variant");
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/vendor/products/${productId}/variants/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          sku: row.sku.trim(),
          quantity: parseInt(row.quantity, 10) || 0,
          salePrice: row.salePrice.trim() === "" ? null : parseFloat(row.salePrice),
        }),
      });
      loadProduct();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update variant");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(i: number) {
    if (mode !== "edit" || !productId) return;
    const row = variants[i];
    if (!row.id) {
      removeVariantRow(i);
      return;
    }
    if (!confirm("Remove this variant?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/vendor/products/${productId}/variants/${row.id}`, { method: "DELETE" });
      loadProduct();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete variant");
    } finally {
      setSaving(false);
    }
  }

  async function onPickImage(file: File) {
    if (mode !== "edit" || !productId) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `products/${productId}/${Date.now()}-${safe}`;
    setSaving(true);
    setError(null);
    try {
      const { url } = await uploadStorageFile(file, { bucket: "stores", path });
      await apiFetch(`/vendor/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({ url, isPrimary: images.length === 0 }),
      });
      loadProduct();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(imageId: string) {
    if (mode !== "edit" || !productId) return;
    if (!confirm("Remove this image?")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/vendor/products/${productId}/images/${imageId}`, { method: "DELETE" });
      loadProduct();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setSaving(false);
    }
  }

  async function archiveProduct() {
    if (mode !== "edit" || !productId) return;
    if (!confirm("Archive this product? It will be hidden from the catalog.")) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/vendor/products/${productId}`, { method: "DELETE" });
      router.push("/vendor/dashboard/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading product…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/vendor/dashboard/products"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to products
        </Link>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          {error}
        </p>
      )}

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="luxury-card space-y-6 p-6 sm:p-8">
          <h2 className="text-lg font-semibold font-serif">New product</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
              <input
                className="luxury-input w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <textarea
                className="luxury-input min-h-[120px] w-full resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Base price (USD)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="luxury-input w-full"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <select
                className="luxury-input w-full"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select
                className="luxury-input w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Variants</span>
              <button type="button" onClick={addVariantRow} className="text-sm text-primary flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add variant
              </button>
            </div>
            <div className="space-y-3">
              {variants.map((row, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl border border-border bg-secondary/10 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input
                    className="luxury-input"
                    placeholder="SKU"
                    value={row.sku}
                    onChange={(e) => updateVariant(i, { sku: e.target.value })}
                    required
                  />
                  <input
                    className="luxury-input"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Sale price (optional)"
                    value={row.salePrice}
                    onChange={(e) => updateVariant(i, { salePrice: e.target.value })}
                  />
                  <input
                    className="luxury-input"
                    type="number"
                    min={0}
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateVariant(i, { quantity: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    onClick={() => removeVariantRow(i)}
                    disabled={variants.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/vendor/dashboard/products" className="luxury-button border border-border bg-transparent">
              Cancel
            </Link>
            <button type="submit" className="luxury-button flex items-center gap-2" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create product
            </button>
          </div>
        </form>
      ) : (
        <>
          <form onSubmit={saveProductMeta} className="luxury-card space-y-6 p-6 sm:p-8">
            <h2 className="text-lg font-semibold font-serif">Product details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                <input
                  className="luxury-input w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  className="luxury-input min-h-[120px] w-full resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Base price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="luxury-input w-full"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                <select
                  className="luxury-input w-full"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select
                  className="luxury-input w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <button type="button" className="text-sm text-rose-600 hover:underline" onClick={archiveProduct}>
                Archive product
              </button>
              <button type="submit" className="luxury-button flex items-center gap-2" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save details
              </button>
            </div>
          </form>

          <div className="luxury-card space-y-4 p-6 sm:p-8">
            <h2 className="text-lg font-semibold font-serif">Images</h2>
            <p className="text-sm text-muted-foreground">
              Upload to storage, then attach to this product. First image can be set as primary when uploading if none
              exist.
            </p>
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img src={img.url} alt="" className="h-24 w-24 rounded-lg object-cover border border-border" />
                  {img.isPrimary && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 rounded-full bg-rose-500 p-1 text-white opacity-0 group-hover:opacity-100"
                    onClick={() => removeImage(img.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm hover:bg-secondary/40">
              <Upload className="h-4 w-4" />
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onPickImage(f);
                }}
              />
            </label>
          </div>

          <div className="luxury-card space-y-4 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-serif">Variants & inventory</h2>
              <button type="button" onClick={addVariantRow} className="text-sm text-primary flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add variant
              </button>
            </div>
            <div className="space-y-4">
              {variants.map((row, i) => (
                <div key={row.id ?? `new-${i}`} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                    <input
                      className="luxury-input"
                      placeholder="SKU"
                      value={row.sku}
                      onChange={(e) => updateVariant(i, { sku: e.target.value })}
                    />
                    <input
                      className="luxury-input"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Sale price (optional)"
                      value={row.salePrice}
                      onChange={(e) => updateVariant(i, { salePrice: e.target.value })}
                    />
                    <input
                      className="luxury-input"
                      type="number"
                      min={0}
                      placeholder="Quantity"
                      value={row.quantity}
                      onChange={(e) => updateVariant(i, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="text-sm border border-border rounded-lg px-3 py-1.5" onClick={() => deleteVariant(i)}>
                      Remove
                    </button>
                    <button
                      type="button"
                      className="luxury-button py-1.5 text-sm"
                      onClick={() => saveVariant(i)}
                      disabled={saving}
                    >
                      {row.id ? "Save variant" : "Add variant"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
