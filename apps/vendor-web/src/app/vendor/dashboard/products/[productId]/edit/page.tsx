"use client";

import { DashboardShell } from "@/components/vendor/DashboardShell";
import { ProductForm } from "@/components/vendor/ProductForm";
import { useParams } from "next/navigation";

export default function EditProductPage() {
  const params = useParams();
  const productId = params.productId as string;
  return (
    <DashboardShell title="Edit product">
      <ProductForm mode="edit" productId={productId} />
    </DashboardShell>
  );
}
