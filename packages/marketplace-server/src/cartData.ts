import { ProductStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export type AddCartItemDto = { productVariantId: string; quantity: number };
export type UpdateCartItemDto = { quantity: number };

export class CartData {
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: { include: { inventory: true, product: true } },
          },
        },
      },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: true,
              variant: { include: { inventory: true, product: true } },
            },
          },
        },
      });
    }
    return cart;
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: dto.productVariantId },
      include: {
        product: true,
        inventory: true,
      },
    });
    if (!variant || variant.product.deletedAt || variant.product.status !== ProductStatus.ACTIVE) {
      throw new Error("Product is not available");
    }
    const available = variant.inventory?.quantity ?? variant.stock;
    if (dto.quantity > available) {
      throw new Error("Insufficient stock");
    }

    const cart = await this.getOrCreateCart(userId);

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productVariantId: dto.productVariantId,
      },
    });

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (newQty > available) {
        throw new Error("Insufficient stock for requested quantity");
      }
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: {
          product: true,
          variant: { include: { inventory: true } },
        },
      });
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: variant.productId,
        productVariantId: dto.productVariantId,
        quantity: dto.quantity,
      },
      include: {
        product: true,
        variant: { include: { inventory: true } },
      },
    });
  }

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
      include: { variant: { include: { inventory: true, product: true } } },
    });
    if (!item) throw new Error("Cart item not found");

    const available = item.variant.inventory?.quantity ?? item.variant.stock;
    if (dto.quantity > available) {
      throw new Error("Insufficient stock");
    }

    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
      include: {
        product: true,
        variant: { include: { inventory: true } },
      },
    });
  }

  async removeItem(userId: string, cartItemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
    });
    if (!item) throw new Error("Cart item not found");
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return { deleted: true };
  }
}

export const cartData = new CartData();
