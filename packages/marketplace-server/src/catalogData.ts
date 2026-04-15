import { ProductStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export const catalogData = {
  listCategories() {
    return prisma.productCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, parentId: true },
    });
  },

  listProducts(storeId?: string, take = "24") {
    const n = Math.min(100, Math.max(1, parseInt(take, 10) || 24));
    return prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        ...(storeId ? { storeId } : {}),
      },
      take: n,
      orderBy: { updatedAt: "desc" },
      include: {
        store: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1 },
        variants: { include: { inventory: true } },
      },
    });
  },
};
