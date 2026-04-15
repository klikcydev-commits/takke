import {
  CouponStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { cartData } from "./cartData.js";

export type CheckoutDto = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  couponCode?: string;
  deliveryFee?: number;
};

export class CheckoutData {
  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await cartData.getOrCreateCart(userId);
    if (!cart.items.length) {
      throw new Error("Cart is empty");
    }

    const deliveryFee = Math.max(0, Number(dto.deliveryFee ?? 0));

    type Line = {
      cartItemId: string;
      storeId: string;
      productId: string;
      productVariantId: string;
      quantity: number;
      unitPrice: number;
      lineSubtotal: number;
      titleSnapshot: string;
      skuSnapshot: string;
      variantLabelSnapshot: string | null;
      basePrice: number;
      salePrice: number | null;
    };

    const lines: Line[] = [];

    for (const ci of cart.items) {
      const p = ci.product;
      const v = ci.variant;
      if (p.deletedAt || p.status !== ProductStatus.ACTIVE) {
        throw new Error(`Product unavailable: ${p.title}`);
      }
      const available = v.inventory?.quantity ?? v.stock;
      if (ci.quantity > available) {
        throw new Error(`Insufficient stock for ${p.title}`);
      }
      const unit = Number((v.salePrice ?? p.basePrice).toFixed(2));
      const attrVals = await prisma.productVariantAttributeValue.findMany({
        where: { productVariantId: v.id },
        include: { attribute: true },
      });
      const label =
        attrVals.length > 0
          ? attrVals.map((a) => `${a.attribute.name}: ${a.value}`).join(", ")
          : null;

      lines.push({
        cartItemId: ci.id,
        storeId: p.storeId,
        productId: p.id,
        productVariantId: v.id,
        quantity: ci.quantity,
        unitPrice: unit,
        lineSubtotal: Number((unit * ci.quantity).toFixed(2)),
        titleSnapshot: p.title,
        skuSnapshot: v.sku,
        variantLabelSnapshot: label,
        basePrice: p.basePrice,
        salePrice: v.salePrice,
      });
    }

    let subtotal = Number(lines.reduce((s, l) => s + l.lineSubtotal, 0).toFixed(2));
    let discount = 0;
    let couponId: string | undefined;

    if (dto.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: { equals: dto.couponCode.trim(), mode: "insensitive" },
          status: CouponStatus.ACTIVE,
        },
      });
      if (!coupon) {
        throw new Error("Invalid coupon");
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new Error("Coupon expired");
      }
      if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("Coupon usage limit reached");
      }
      if (coupon.minSpend != null && subtotal < coupon.minSpend) {
        throw new Error("Minimum spend not met for coupon");
      }
      if (coupon.discountType === "PERCENTAGE") {
        discount = Number(((subtotal * coupon.discountValue) / 100).toFixed(2));
        if (coupon.maxDiscount != null) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
      } else {
        discount = Math.min(coupon.discountValue, subtotal);
      }
      couponId = coupon.id;
    }

    const totalAmount = Number((subtotal - discount + deliveryFee).toFixed(2));
    if (totalAmount < 0) {
      throw new Error("Invalid totals");
    }

    const orderNumber = `ORD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: userId,
          orderNumber,
          subtotal,
          deliveryFee,
          discount,
          totalAmount,
          currentStatus: OrderStatus.PENDING_PAYMENT,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.PENDING_PAYMENT,
          notes: `checkout customer=${userId}`,
        },
      });

      for (const line of lines) {
        const oi = await tx.orderItem.create({
          data: {
            orderId: order.id,
            storeId: line.storeId,
            productId: line.productId,
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            basePrice: line.basePrice,
            salePrice: line.salePrice,
            subtotal: line.lineSubtotal,
            titleSnapshot: line.titleSnapshot,
            skuSnapshot: line.skuSnapshot,
            variantLabelSnapshot: line.variantLabelSnapshot,
            currentStatus: OrderStatus.PENDING_PAYMENT,
          },
        });
        await tx.orderItemStatusHistory.create({
          data: {
            orderItemId: oi.id,
            status: OrderStatus.PENDING_PAYMENT,
            notes: "checkout",
          },
        });
      }

      await tx.orderAddress.create({
        data: {
          orderId: order.id,
          street: dto.street,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          snapshotLabel: [dto.street, dto.city, dto.state, dto.postalCode, dto.country].join(", "),
        },
      });

      if (couponId) {
        const c = await tx.coupon.findUnique({ where: { id: couponId } });
        if (c) {
          await tx.couponRedemption.create({
            data: {
              couponId: c.id,
              orderId: order.id,
              amount: discount,
            },
          });
          await tx.coupon.update({
            where: { id: c.id },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: totalAmount,
          currency: "USD",
          provider: "mock",
          status: PaymentStatus.PENDING,
          metadata: {
            intent: `mock_${randomBytes(8).toString("hex")}`,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      await tx.notification.create({
        data: {
          userId,
          title: "Order placed",
          message: `Order ${orderNumber} is awaiting payment.`,
          type: "ORDER_UPDATE",
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
          address: true,
          payment: true,
        },
      });
    });
  }
}

export const checkoutData = new CheckoutData();
