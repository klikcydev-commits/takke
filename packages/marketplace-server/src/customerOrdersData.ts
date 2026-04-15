import { prisma } from "./prisma.js";

export class CustomerOrdersData {
  listOrders(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: { include: { store: { select: { name: true, slug: true } } } },
        address: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async tracking(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { items: true },
    });
    if (!order) return null;

    const itemIds = order.items.map((i) => i.id);
    const links = await prisma.deliveryAssignmentItem.findMany({
      where: { orderItemId: { in: itemIds } },
      include: {
        assignment: {
          include: {
            tracking: { orderBy: { createdAt: "desc" } },
            driver: { include: { user: { select: { email: true, userProfile: true } } } },
          },
        },
      },
    });

    return { orderId, assignments: links.map((l) => l.assignment) };
  }

  detail(customerId: string, orderId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        items: {
          include: {
            store: true,
            variant: true,
            statusHistory: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        },
        address: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
  }
}

export const customerOrdersData = new CustomerOrdersData();
