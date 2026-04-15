import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "./prisma.js";

export class PaymentsData {
  async confirmMockPayment(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { inventory: true } } } },
        payment: true,
      },
    });

    if (!order) throw new Error("Order not found");
    if (order.customerId !== customerId) {
      throw new Error("Not your order");
    }
    if (!order.payment) throw new Error("No payment record");
    if (order.payment.status === PaymentStatus.CAPTURED) {
      return order;
    }
    if (order.payment.status === PaymentStatus.FAILED) {
      throw new Error("Payment already failed");
    }

    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const inv = item.variant.inventory;
        const qty = item.quantity;
        if (!inv) {
          throw new Error(`Missing inventory for line ${item.id}`);
        }
        if (inv.quantity < qty) {
          throw new Error(`Insufficient stock for SKU ${item.skuSnapshot}`);
        }
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - qty },
        });
        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            quantity: -qty,
            type: "SALE",
            notes: `order ${order.orderNumber}`,
          },
        });
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: qty } },
        });
      }

      const txRef = `mock_tx_${Date.now()}`;

      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: PaymentStatus.CAPTURED,
          transactionId: txRef,
          metadata: {
            ...(order.payment!.metadata as object),
            confirmedAt: new Date().toISOString(),
            provider: "mock",
          } as Prisma.InputJsonValue,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { currentStatus: OrderStatus.PAID },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.PAID,
          notes: `mock payment ${txRef}`,
        },
      });

      for (const item of order.items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { currentStatus: OrderStatus.PAID },
        });
        await tx.orderItemStatusHistory.create({
          data: {
            orderItemId: item.id,
            status: OrderStatus.PAID,
            notes: "payment captured (mock)",
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: customerId,
          title: "Payment received",
          message: `Order ${order.orderNumber} is paid.`,
          type: "ORDER_UPDATE",
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true, address: true },
      });
    });
  }

  async failMockPayment(orderId: string, customerId: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order || order.customerId !== customerId) throw new Error("Order not found");
    if (!order.payment) throw new Error("No payment");

    return prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: {
            ...(order.payment!.metadata as object),
            failReason: reason ?? "mock_decline",
          } as Prisma.InputJsonValue,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.currentStatus,
          notes: `payment failed: ${reason ?? "mock"}`,
        },
      });
      return tx.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    });
  }
}

export const paymentsData = new PaymentsData();
