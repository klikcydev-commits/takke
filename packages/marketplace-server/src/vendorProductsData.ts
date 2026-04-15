import { Prisma, ProductStatus, ActivityType } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import type {
  CreateProductDto,
  CreateVariantDto,
  UpdateProductDto,
  UpdateVariantDto,
  ProductImageDto,
} from "./vendorProductDto.js";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export class VendorProductsData {
  private async requireStoreForOwner(userId: string) {
    const store = await prisma.store.findUnique({ where: { ownerId: userId } });
    if (!store) {
      throw new Error('No store for this account');
    }
    if (store.status !== 'APPROVED') {
      throw new Error('Store must be approved to manage products');
    }
    return store;
  }

  private async requireProductOwnedByStore(productId: string, storeId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId, deletedAt: null },
    });
    if (!product) throw new Error('Product not found');
    return product;
  }

  async getProduct(userId: string, productId: string) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        variants: { include: { inventory: true } },
        images: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = slugify(base) || 'product';
    for (let i = 0; i < 20; i++) {
      const exists = await prisma.product.findUnique({ where: { slug } });
      if (!exists) return slug;
      slug = `${slugify(base)}-${randomBytes(3).toString('hex')}`;
    }
    return `${slugify(base)}-${randomBytes(6).toString('hex')}`;
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const store = await this.requireStoreForOwner(userId);
    if (!dto.variants?.length) {
      throw new Error('At least one variant is required');
    }
    const cat = await prisma.productCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new Error('Invalid category');

    const slug = await this.uniqueSlug(dto.title);

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId: store.id,
          categoryId: dto.categoryId,
          title: dto.title,
          slug,
          description: dto.description,
          basePrice: dto.basePrice,
          status: dto.status ?? ProductStatus.DRAFT,
        },
      });

      await tx.productStatusHistory.create({
        data: {
          productId: product.id,
          status: product.status,
          notes: `created by vendor ${userId}`,
        },
      });

      for (const v of dto.variants) {
        const existingSku = await tx.productVariant.findUnique({ where: { sku: v.sku } });
        if (existingSku) {
          throw new Error(`SKU already in use: ${v.sku}`);
        }
        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            salePrice: v.salePrice ?? null,
            stock: v.quantity,
            inventory: {
              create: {
                quantity: v.quantity,
                lowStockThreshold: 5,
              },
            },
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId,
          type: ActivityType.CREATE,
          action: 'PRODUCT_CREATE',
          metadata: { productId: product.id } as Prisma.InputJsonValue,
        },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          variants: { include: { inventory: true } },
          images: true,
        },
      });
    });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const store = await this.requireStoreForOwner(userId);
    const existing = await this.requireProductOwnedByStore(productId, store.id);

    if (dto.categoryId) {
      const cat = await prisma.productCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new Error('Invalid category');
    }

    return prisma.$transaction(async (tx) => {
      let newSlug = existing.slug;
      if (dto.title && dto.title !== existing.title) {
        newSlug = await this.uniqueSlug(dto.title);
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          title: dto.title ?? undefined,
          slug: dto.title ? newSlug : undefined,
          description: dto.description ?? undefined,
          basePrice: dto.basePrice ?? undefined,
          categoryId: dto.categoryId ?? undefined,
          status: dto.status ?? undefined,
        },
      });

      if (dto.status && dto.status !== existing.status) {
        await tx.productStatusHistory.create({
          data: {
            productId,
            status: dto.status,
            notes: `vendor ${userId}`,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId,
          type: ActivityType.UPDATE,
          action: 'PRODUCT_UPDATE',
          metadata: { productId } as Prisma.InputJsonValue,
        },
      });

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          variants: { include: { inventory: true } },
          images: true,
        },
      });
    });
  }

  /** Soft-delete (archive) */
  async archiveProduct(userId: string, productId: string) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);

    return prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          deletedAt: new Date(),
          status: ProductStatus.ARCHIVED,
        },
      });
      await tx.productStatusHistory.create({
        data: {
          productId,
          status: ProductStatus.ARCHIVED,
          notes: `archived by vendor ${userId}`,
        },
      });
      await tx.activityLog.create({
        data: {
          userId,
          type: ActivityType.DELETE,
          action: 'PRODUCT_ARCHIVE',
          metadata: { productId } as Prisma.InputJsonValue,
        },
      });
      return { id: productId, archived: true };
    });
  }

  async addVariant(userId: string, productId: string, dto: CreateVariantDto) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);

    const dup = await prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (dup) throw new Error('SKU already exists');

    return prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        salePrice: dto.salePrice ?? null,
        stock: dto.quantity,
        inventory: {
          create: {
            quantity: dto.quantity,
            lowStockThreshold: 5,
          },
        },
      },
      include: { inventory: true },
    });
  }

  async updateVariant(userId: string, productId: string, variantId: string, dto: UpdateVariantDto) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { inventory: true },
    });
    if (!variant) throw new Error('Variant not found');

    if (dto.sku && dto.sku !== variant.sku) {
      const dup = await prisma.productVariant.findUnique({ where: { sku: dto.sku } });
      if (dup) throw new Error('SKU already exists');
    }

    return prisma.$transaction(async (tx) => {
      const invId = variant.inventory?.id;
      const qty = dto.quantity;
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          sku: dto.sku ?? undefined,
          salePrice: dto.salePrice === undefined ? undefined : dto.salePrice,
          stock: qty !== undefined ? qty : undefined,
        },
        include: { inventory: true },
      });

      if (qty !== undefined && invId) {
        const delta = qty - (variant.inventory?.quantity ?? 0);
        await tx.inventory.update({
          where: { id: invId },
          data: { quantity: qty },
        });
        if (delta !== 0) {
          await tx.stockMovement.create({
            data: {
              inventoryId: invId,
              quantity: delta,
              type: 'ADJUSTMENT',
              notes: `vendor adjustment ${userId}`,
            },
          });
        }
      }

      return updated;
    });
  }

  async deleteVariant(userId: string, productId: string, variantId: string) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new Error('Variant not found');

    const count = await prisma.productVariant.count({ where: { productId } });
    if (count <= 1) {
      throw new Error('Cannot delete the last variant; archive the product instead');
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
    return { deleted: true };
  }

  async addImage(userId: string, productId: string, body: ProductImageDto) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);

    return prisma.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }
      return tx.productImage.create({
        data: {
          productId,
          url: body.url,
          isPrimary: body.isPrimary ?? false,
        },
      });
    });
  }

  async deleteImage(userId: string, productId: string, imageId: string) {
    const store = await this.requireStoreForOwner(userId);
    await this.requireProductOwnedByStore(productId, store.id);

    const img = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!img) throw new Error('Image not found');

    await prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }
}

export const vendorProductsData = new VendorProductsData();
