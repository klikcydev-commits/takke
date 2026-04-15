import { prisma } from "./prisma.js";

export class StoresData {
  /** The store owned by this user (schema: one store per owner). */
  async getMyStore(ownerId: string) {
    return prisma.store.findUnique({
      where: { ownerId },
      include: {
        profile: true,
        applications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  /** Products for the authenticated owner's store. */
  async getMyProducts(ownerId: string) {
    const store = await prisma.store.findUnique({ where: { ownerId } });
    if (!store) {
      return [];
    }
    return prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      include: {
        category: true,
        variants: { include: { inventory: true } },
        images: { take: 3, orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}

export const storesData = new StoresData();
