import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export class VendorOrdersData {
  private async requireStore(userId: string) {
    const store = await prisma.store.findUnique({ where: { ownerId: userId } });
    if (!store) throw new Error('No store');
    return store;
  }

  async listOrdersForStore(userId: string) {
    const store = await this.requireStore(userId);
    return prisma.orderItem.findMany({
      where: { storeId: store.id },
      include: {
        order: {
          include: { address: true, customer: { select: { email: true, userProfile: true } } },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderForStore(userId: string, orderId: string) {
    const store = await this.requireStore(userId);
    const items = await prisma.orderItem.findMany({
      where: { storeId: store.id, orderId },
      include: {
        order: {
          include: {
            address: true,
            customer: { select: { email: true, userProfile: true } },
            payment: true,
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (items.length === 0) {
      throw new Error('Order not found');
    }
    return items;
  }

  async markOrderItemReady(userId: string, orderItemId: string) {
    const store = await this.requireStore(userId);
    const item = await prisma.orderItem.findFirst({
      where: { id: orderItemId, storeId: store.id },
      include: { order: true },
    });
    if (!item) throw new Error('Order item not found');

    const allowed: OrderStatus[] = [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.PREPARING];
    if (!allowed.includes(item.currentStatus)) {
      throw new Error('Item is not in a state that can be marked ready for pickup');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.orderItem.update({
        where: { id: orderItemId },
        data: { currentStatus: OrderStatus.READY_FOR_PICKUP },
      });
      await tx.orderItemStatusHistory.create({
        data: {
          orderItemId,
          status: OrderStatus.READY_FOR_PICKUP,
          notes: `vendor ${userId} marked ready`,
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          type: 'UPDATE',
          action: 'ORDER_ITEM_READY_FOR_PICKUP',
          metadata: { orderItemId, orderId: item.orderId } as Prisma.InputJsonValue,
        },
      });

      const pending = await tx.orderItem.count({
        where: {
          orderId: item.orderId,
          currentStatus: { not: OrderStatus.READY_FOR_PICKUP },
        },
      });
      if (pending === 0) {
        await tx.order.update({
          where: { id: item.orderId },
          data: { currentStatus: OrderStatus.READY_FOR_PICKUP },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: item.orderId,
            status: OrderStatus.READY_FOR_PICKUP,
            notes: `all items ready store=${store.id}`,
          },
        });
      }

      return updated;
    });
  }
}

export const vendorOrdersData = new VendorOrdersData();
