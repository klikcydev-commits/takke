import type { ProductStatus } from "@prisma/client";

export type CreateVariantDto = {
  sku: string;
  salePrice?: number;
  quantity: number;
};

export type UpdateVariantDto = {
  sku?: string;
  salePrice?: number | null;
  quantity?: number;
};

export type CreateProductDto = {
  title: string;
  description: string;
  basePrice: number;
  categoryId: string;
  status?: ProductStatus;
  variants: CreateVariantDto[];
};

export type UpdateProductDto = {
  title?: string;
  description?: string;
  basePrice?: number;
  categoryId?: string;
  status?: ProductStatus;
};

export type ProductImageDto = {
  url: string;
  isPrimary?: boolean;
};
