import { StoreStatus, RoleType, DisputeStatus, ProductStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { UpdateApplicationStatusDto } from "./dto.js";

export class AdminData {

  /**
   * List all pending store applications
   */
  async getPendingStores() {
    return prisma.store.findMany({
      where: { status: { in: [StoreStatus.PENDING, StoreStatus.INFO_REQUESTED] } },
      include: {
        profile: true,
        owner: {
          select: { email: true, userProfile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all pending driver applications
   */
  async getPendingDrivers() {
    return prisma.driverApplication.findMany({
      where: { status: { in: [StoreStatus.PENDING, StoreStatus.INFO_REQUESTED] } },
      include: {
        user: {
          select: { email: true, userProfile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve/Reject Store Application
   */
  async reviewStore(storeId: string, adminId: string, dto: UpdateApplicationStatusDto) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) throw new Error('Store not found');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update store status
      const updatedStore = await tx.store.update({
        where: { id: storeId },
        data: { status: dto.status as any },
      });

      // 2. Add to application history
      const app = await tx.storeApplication.findFirst({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      });

      if (app) {
        await tx.storeApplication.update({
          where: { id: app.id },
          data: {
            status: dto.status as any,
            reviewedBy: adminId,
            notes: dto.adminNotes,
          },
        });

        await tx.storeApplicationStatusHistory.create({
          data: {
            applicationId: app.id,
            status: dto.status as any,
            notes: dto.adminNotes,
          },
        });
      }

      // 3. If APPROVED, activate role for user
      if (dto.status === 'APPROVED') {
        const storeOwnerRole = await tx.role.findUnique({ where: { name: RoleType.STORE_OWNER } });
        if (storeOwnerRole) {
          await tx.userRoleAssignment.upsert({
            where: {
              userId_roleId: {
                userId: store.ownerId,
                roleId: storeOwnerRole.id,
              },
            },
            update: {},
            create: {
              userId: store.ownerId,
              roleId: storeOwnerRole.id,
            },
          });
        }

        await tx.user.update({
          where: { id: store.ownerId },
          data: { onboardingStatus: 'APPROVED' },
        });
      } else if (dto.status === 'INFO_REQUESTED') {
        await tx.user.update({
          where: { id: store.ownerId },
          data: { onboardingStatus: 'PENDING' },
        });
      }

      // 4. Create Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: `REVIEW_STORE_${dto.status}`,
          entity: 'Store',
          entityId: storeId,
          newData: dto as any,
        },
      });

      // 5. Create Notification for user
      await tx.notification.create({
        data: {
          userId: store.ownerId,
          title: `Application ${dto.status}`,
          message: dto.status === 'APPROVED' 
            ? 'Your store has been approved! You can now access your dashboard.' 
            : `Your application was ${dto.status.toLowerCase()}. Notes: ${dto.adminNotes || 'None'}`,
          type: 'APPLICATION_STATUS',
        },
      });

      return updatedStore;
    });

    return result;
  }

  /**
   * Approve/Reject Driver Application
   */
  async reviewDriver(applicationId: string, adminId: string, dto: UpdateApplicationStatusDto) {
    const app = await prisma.driverApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) throw new Error('Application not found');

    return prisma.$transaction(async (tx) => {
      // 1. Update application status
      const updatedApp = await tx.driverApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status as any,
          reviewedBy: adminId,
          adminNotes: dto.adminNotes,
        },
      });

      // 2. Add history
      await tx.driverApplicationStatusHistory.create({
        data: {
          applicationId,
          status: dto.status as any,
          notes: dto.adminNotes,
        },
      });

      // 3. If APPROVED, create Driver record and activate role
      if (dto.status === 'INFO_REQUESTED') {
        await tx.user.update({
          where: { id: app.userId },
          data: { onboardingStatus: 'PENDING' },
        });
      } else if (dto.status === 'APPROVED') {
        const driverRole = await tx.role.findUnique({ where: { name: RoleType.DELIVERY_DRIVER } });
        if (driverRole) {
          await tx.userRoleAssignment.upsert({
            where: {
              userId_roleId: {
                userId: app.userId,
                roleId: driverRole.id,
              },
            },
            update: {},
            create: {
              userId: app.userId,
              roleId: driverRole.id,
            },
          });
        }

        // Create the Driver record if it doesn't exist
        await tx.driver.upsert({
          where: { userId: app.userId },
          update: {
            vehicleType: app.vehicleType,
            licensePlate: app.licensePlate,
            isActive: true,
          },
          create: {
            userId: app.userId,
            vehicleType: app.vehicleType,
            licensePlate: app.licensePlate,
            isActive: true,
          },
        });

        await tx.user.update({
          where: { id: app.userId },
          data: { onboardingStatus: 'APPROVED' },
        });
      }

      // 4. Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: `REVIEW_DRIVER_${dto.status}`,
          entity: 'DriverApplication',
          entityId: applicationId,
          newData: dto as any,
        },
      });

      // 5. Notification
      await tx.notification.create({
        data: {
          userId: app.userId,
          title: `Application ${dto.status}`,
          message: dto.status === 'APPROVED' 
            ? 'Your driver application has been approved! Welcome to the fleet.' 
            : `Your application was ${dto.status.toLowerCase()}. Reason: ${dto.adminNotes || 'None'}`,
          type: 'APPLICATION_STATUS',
        },
      });

      return updatedApp;
    });
  }

  /**
   * List all users
   */
  async getAllUsers() {
    return prisma.user.findMany({
      include: {
        userProfile: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all stores (beyond pending)
   */
  async getAllStores() {
    return prisma.store.findMany({
      include: {
        owner: { select: { email: true, userProfile: true } },
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all drivers
   */
  async getAllDrivers() {
    return prisma.driver.findMany({
      include: {
        user: { select: { email: true, userProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all orders for system oversight
   */
  async getAllOrders() {
    return prisma.order.findMany({
      include: {
        customer: { select: { email: true, userProfile: true } },
        items: { include: { store: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List system audit logs
   */
  async getAllAuditLogs() {
    return prisma.adminAuditLog.findMany({
      include: {
        admin: { select: { email: true, userProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoreById(id: string) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        profile: true,
        owner: { select: { email: true, userProfile: true } },
        documents: true,
      },
    });
    if (!store) throw new Error('Store not found');
    return store;
  }

  async getDriverApplicationById(id: string) {
    const application = await prisma.driverApplication.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, userProfile: true } },
      },
    });
    if (!application) throw new Error('Application not found');
    return application;
  }

  /** Aggregate counts for admin dashboard */
  async getOverview() {
    const [
      userCount,
      storeCount,
      orderCount,
      pendingStoreApps,
      pendingDriverApps,
      openDisputes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.store.count(),
      prisma.order.count(),
      prisma.store.count({
        where: { status: { in: [StoreStatus.PENDING, StoreStatus.INFO_REQUESTED] } },
      }),
      prisma.driverApplication.count({
        where: { status: { in: [StoreStatus.PENDING, StoreStatus.INFO_REQUESTED] } },
      }),
      prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
    ]);

    return {
      users: userCount,
      stores: storeCount,
      orders: orderCount,
      pendingStoreApplications: pendingStoreApps,
      pendingDriverApplications: pendingDriverApps,
      openDisputes,
    };
  }

  async getAllDisputes() {
    return prisma.dispute.findMany({
      include: {
        order: { select: { orderNumber: true, totalAmount: true, currentStatus: true } },
        user: { select: { email: true, userProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllNotifications() {
    return prisma.notification.findMany({
      include: {
        user: { select: { email: true, userProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getAllDeliveryAssignments() {
    return prisma.deliveryAssignment.findMany({
      include: {
        driver: { include: { user: { select: { email: true, userProfile: true } } } },
        items: {
          include: {
            orderItem: {
              include: {
                store: true,
                variant: { include: { product: { select: { id: true, title: true, slug: true } } } },
              },
            },
          },
        },
        tracking: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllProducts() {
    return prisma.product.findMany({
      include: {
        store: { select: { id: true, name: true, slug: true } },
        category: true,
        variants: { include: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllPayouts() {
    return prisma.vendorPayout.findMany({
      include: {
        store: { select: { id: true, name: true, slug: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllRefundRequests() {
    return prisma.refundRequest.findMany({
      include: {
        user: { select: { email: true, userProfile: true } },
        orderItem: {
          include: {
            order: { select: { orderNumber: true } },
            store: true,
            variant: { include: { product: { select: { id: true, title: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllReturnRequests() {
    return prisma.returnRequest.findMany({
      include: {
        user: { select: { email: true, userProfile: true } },
        orderItem: { include: { order: { select: { orderNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateProduct(
    adminId: string,
    productId: string,
    dto: { status: ProductStatus; notes?: string },
  ) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    return prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { status: dto.status },
      });
      await tx.productStatusHistory.create({
        data: {
          productId,
          status: dto.status,
          notes: `admin ${adminId}${dto.notes ? `: ${dto.notes}` : ''}`,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: 'MODERATE_PRODUCT',
          entity: 'Product',
          entityId: productId,
          oldData: { status: product.status } as Prisma.InputJsonValue,
          newData: dto as unknown as Prisma.InputJsonValue,
        },
      });
      return tx.product.findUnique({
        where: { id: productId },
        include: { store: { select: { id: true, name: true, slug: true } }, category: true },
      });
    });
  }
}

export const adminData = new AdminData();
