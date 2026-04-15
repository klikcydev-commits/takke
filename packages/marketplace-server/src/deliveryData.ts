import { DeliveryStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type CreateDeliveryAssignmentDto = {
  orderItemIds: string[];
  driverId?: string;
};

export type UpdateAssignmentStatusDto = {
  status: DeliveryStatus;
  notes?: string;
  locationLat?: number;
  locationLng?: number;
};

const DRIVER_FLOW: DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.ACCEPTED,
  DeliveryStatus.PICKUP_ARRIVED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.ON_THE_WAY,
  DeliveryStatus.NEAR_CUSTOMER,
  DeliveryStatus.DELIVERED,
];

function assertTransition(from: DeliveryStatus, to: DeliveryStatus) {
  if (to === DeliveryStatus.FAILED || to === DeliveryStatus.REJECTED) return;
  const i = DRIVER_FLOW.indexOf(from);
  const j = DRIVER_FLOW.indexOf(to);
  if (i < 0 || j < 0) return;
  if (j !== i + 1) {
    throw new Error(`Invalid transition ${from} -> ${to}`);
  }
}

export class DeliveryData {
  async createAssignment(adminId: string, dto: CreateDeliveryAssignmentDto) {
    const items = await prisma.orderItem.findMany({
      where: { id: { in: dto.orderItemIds } },
      include: { order: true },
    });
    if (items.length !== dto.orderItemIds.length) {
      throw new Error("Some order items not found");
    }
    const stores = [...new Set(items.map((i) => i.storeId))];
    if (stores.length !== 1) {
      throw new Error("Assignment must target items from a single store");
    }
    for (const i of items) {
      if (i.currentStatus !== OrderStatus.READY_FOR_PICKUP) {
        throw new Error(
          `Order item ${i.id} must be READY_FOR_PICKUP (is ${i.currentStatus})`,
        );
      }
    }

    if (dto.driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: dto.driverId } });
      if (!driver?.isActive) throw new Error("Invalid driver");
    }

    return prisma.$transaction(async (tx) => {
      const assignment = await tx.deliveryAssignment.create({
        data: {
          driverId: dto.driverId ?? null,
          status: DeliveryStatus.ASSIGNED,
        },
      });

      for (const id of dto.orderItemIds) {
        await tx.deliveryAssignmentItem.create({
          data: {
            assignmentId: assignment.id,
            orderItemId: id,
          },
        });
      }

      await tx.deliveryTrackingUpdate.create({
        data: {
          assignmentId: assignment.id,
          status: DeliveryStatus.ASSIGNED,
          notes: `created by admin ${adminId}`,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: "CREATE_DELIVERY_ASSIGNMENT",
          entity: "DeliveryAssignment",
          entityId: assignment.id,
          newData: dto as unknown as Prisma.InputJsonValue,
        },
      });

      return tx.deliveryAssignment.findUnique({
        where: { id: assignment.id },
        include: {
          items: { include: { orderItem: true } },
          driver: { include: { user: true } },
        },
      });
    });
  }

  async updateAssignmentStatus(
    userId: string,
    assignmentId: string,
    body: UpdateAssignmentStatusDto,
    role: "driver" | "admin",
  ) {
    const assignment = await prisma.deliveryAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        driver: true,
        items: { include: { orderItem: true } },
      },
    });
    if (!assignment) throw new Error("Assignment not found");

    if (role === "driver") {
      if (!assignment.driverId || assignment.driver?.userId !== userId) {
        throw new Error("Forbidden");
      }
    }

    const prev = assignment.status;
    if (role !== "admin") {
      if (body.status !== DeliveryStatus.FAILED && body.status !== DeliveryStatus.REJECTED) {
        assertTransition(prev, body.status);
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.update({
        where: { id: assignmentId },
        data: { status: body.status },
      });

      await tx.deliveryTrackingUpdate.create({
        data: {
          assignmentId,
          status: body.status,
          notes: body.notes,
          locationLat: body.locationLat,
          locationLng: body.locationLng,
        },
      });

      if (
        body.status === DeliveryStatus.PICKED_UP &&
        prev === DeliveryStatus.PICKUP_ARRIVED &&
        assignment.items.length
      ) {
        const storeId = assignment.items[0].orderItem.storeId;
        const pickup = await tx.pickupEvent.create({
          data: {
            driverId: assignment.driverId,
            storeId,
          },
        });
        for (const link of assignment.items) {
          await tx.pickupEventItem.create({
            data: {
              pickupEventId: pickup.id,
              orderItemId: link.orderItemId,
            },
          });
          await tx.orderItem.update({
            where: { id: link.orderItemId },
            data: { currentStatus: OrderStatus.PICKED_UP },
          });
          await tx.orderItemStatusHistory.create({
            data: {
              orderItemId: link.orderItemId,
              status: OrderStatus.PICKED_UP,
              notes: `pickup ${pickup.id}`,
            },
          });
        }
      }

      if (body.status === DeliveryStatus.DELIVERED && prev === DeliveryStatus.NEAR_CUSTOMER) {
        for (const link of assignment.items) {
          await tx.orderItem.update({
            where: { id: link.orderItemId },
            data: { currentStatus: OrderStatus.DELIVERED },
          });
          await tx.orderItemStatusHistory.create({
            data: {
              orderItemId: link.orderItemId,
              status: OrderStatus.DELIVERED,
              notes: "delivered",
            },
          });
        }
      }

      if (role === "driver" && assignment.items.length > 0) {
        const oid = assignment.items[0].orderItem.orderId;
        const order = await tx.order.findUnique({ where: { id: oid } });
        if (order) {
          await tx.notification.create({
            data: {
              userId: order.customerId,
              title: "Delivery update",
              message: `Status: ${body.status}`,
              type: "ORDER_UPDATE",
            },
          });
        }
      }

      return tx.deliveryAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          tracking: { orderBy: { createdAt: "desc" }, take: 30 },
          items: { include: { orderItem: true } },
        },
      });
    });
  }

  async acceptAssignment(driverUserId: string, assignmentId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) throw new Error("Forbidden");

    const a = await prisma.deliveryAssignment.findUnique({ where: { id: assignmentId } });
    if (!a) throw new Error("Not found");
    if (a.driverId && a.driverId !== driver.id) {
      throw new Error("Forbidden");
    }
    if (!a.driverId) {
      await prisma.deliveryAssignment.update({
        where: { id: assignmentId },
        data: { driverId: driver.id },
      });
    }
    return this.updateAssignmentStatus(
      driverUserId,
      assignmentId,
      { status: DeliveryStatus.ACCEPTED, notes: "accepted" },
      "driver",
    );
  }
}

export const deliveryData = new DeliveryData();
