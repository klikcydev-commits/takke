"use client";

import { DashboardShell } from "@/components/vendor/DashboardShell";
import { ProductForm } from "@/components/vendor/ProductForm";

export default function NewProductPage() {
  return (
    <DashboardShell title="Add product">
      <ProductForm mode="create" />
    </DashboardShell>
  );
}
