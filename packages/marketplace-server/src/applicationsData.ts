import { StoreStatus, RoleType } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { StoreApplicationDto, DriverApplicationDto } from "./applicationDtos.js";

export class ApplicationsData {

  /**
   * Submit a Store Application
   */
  async submitStoreApplication(userId: string, dto: StoreApplicationDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const existingStore = await prisma.store.findUnique({
      where: { ownerId: userId },
    });
    if (existingStore) {
      throw new Error(
        'You already have a store on file. Wait for admin review or contact support.',
      );
    }

    const baseSlug = dto.businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${userId.slice(0, 8)}`;

    // Atomic transaction for Store, Profile, Application, and User update
    return prisma.$transaction(async (tx) => {
      // 1. Update user state
      await tx.user.update({
        where: { id: userId },
        data: {
          requestedRole: RoleType.STORE_OWNER,
          onboardingStatus: 'PENDING',
        },
      });

      // 2. Create the Store and Profile
      const created = await tx.store.create({
        data: {
          name: dto.businessName,
          slug,
          ownerId: userId,
          status: StoreStatus.PENDING,
          type: dto.businessType as any,
          description: dto.description,
          profile: {
            create: {
              businessEmail: dto.contactEmail,
              businessPhone: dto.contactPhone,
              businessAddress: dto.businessAddress,
              logoUrl: dto.logoUrl,
              bannerUrl: dto.bannerUrl,
              metadata: dto.metadata ?? undefined,
            },
          },
          applications: {
            create: {
              status: StoreStatus.PENDING,
              notes: 'Initial application submission',
            },
          },
        },
      });

      if (dto.documents?.length) {
        await tx.storeDoc.createMany({
          data: dto.documents.map((d) => ({
            storeId: created.id,
            name: d.name,
            url: d.url,
            type: d.type,
          })),
        });
      }

      return tx.store.findUnique({
        where: { id: created.id },
        include: { profile: true, documents: true },
      });
    });
  }

  /**
   * Submit a Driver Application
   */
  async submitDriverApplication(userId: string, dto: DriverApplicationDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Check if user already has an application
    const existing = await prisma.driverApplication.findFirst({
      where: { userId, status: StoreStatus.PENDING },
    });
    if (existing) throw new Error('Application already pending');

    return prisma.$transaction(async (tx) => {
      // 1. Update user state
      await tx.user.update({
        where: { id: userId },
        data: {
          requestedRole: RoleType.DELIVERY_DRIVER,
          onboardingStatus: 'PENDING',
        },
      });

      // 2. Create application record
      return tx.driverApplication.create({
        data: {
          userId,
          fullName: dto.fullName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          vehicleType: dto.vehicleType,
          vehicleModel: dto.vehicleModel,
          licensePlate: dto.licensePlate,
          identityDocUrl: dto.identityDocUrl,
          licenseDocUrl: dto.licenseDocUrl,
          insuranceDocUrl: dto.insuranceDocUrl,
          registrationDocUrl: dto.registrationDocUrl,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          status: StoreStatus.PENDING,
          history: {
            create: {
              status: StoreStatus.PENDING,
              notes: 'Initial driver application submission',
            },
          },
        },
      });
    });
  }

  /**
   * Get application status for the current user
   */
  async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        store: { include: { applications: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        driverApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return {
      requestedRole: user?.requestedRole,
      onboardingStatus: user?.onboardingStatus,
      storeApplication: user?.store?.applications[0] || null,
      driverApplication: user?.driverApplications[0] || null,
    };
  }
}

export const applicationsData = new ApplicationsData();
