import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleType, StoreStatus, ProductStatus } from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is required for prisma db seed (use Transaction pooler URI from Supabase → Connect, port 6543).',
  );
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Default password for seeded demo users (change in production). */
const DEMO_PASSWORD = 'ChangeMe123!';

async function main() {
  console.log('Start seeding...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Roles Seed
  const roles = [
    { name: RoleType.CUSTOMER, description: 'Standard buyer account' },
    { name: RoleType.STORE_OWNER, description: 'Store owner account' },
    { name: RoleType.DELIVERY_DRIVER, description: 'Fulfillment agent' },
    { name: RoleType.ADMIN, description: 'Platform moderator' },
    { name: RoleType.SUPER_ADMIN, description: 'Platform owner' },
  ];

  console.log('Seeding roles...');
  const roleRecords: Record<string, string> = {};
  for (const roleDef of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: roleDef,
    });
    roleRecords[role.name] = role.id;
  }

  // 2. Super Admin User
  console.log('Seeding Super Admin...');
  const adminEmail = 'admin@marketplace.com';
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      isEmailVerified: true,
      hashedPassword: passwordHash,
      userProfile: {
        create: {
          firstName: 'System',
          lastName: 'Administrator',
        },
      },
      roles: {
        create: {
          roleId: roleRecords[RoleType.SUPER_ADMIN],
        },
      },
    },
  });

  // 3. Sample Categories
  console.log('Seeding categories...');
  const categories = [
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Home & Living', slug: 'home-living' },
    { name: 'Beauty', slug: 'beauty' },
  ];

  const categoryRecords: Record<string, string> = {};
  for (const cat of categories) {
    const record = await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryRecords[cat.name] = record.id;
  }

  // 4. Sample Store
  console.log('Seeding sample store...');
  const storeOwnerEmail = 'vendor@example.com';
  const vendor = await prisma.user.upsert({
    where: { email: storeOwnerEmail },
    update: {},
    create: {
      email: storeOwnerEmail,
      isEmailVerified: true,
      hashedPassword: passwordHash,
      userProfile: {
        create: {
          firstName: 'Sample',
          lastName: 'Vendor',
        },
      },
      roles: {
        create: {
          roleId: roleRecords[RoleType.STORE_OWNER],
        },
      },
    },
  });

  const sampleStore = await prisma.store.upsert({
    where: { ownerId: vendor.id },
    update: {},
    create: {
      ownerId: vendor.id,
      name: 'Elite Fashion Store',
      slug: 'elite-fashion',
      status: StoreStatus.APPROVED,
      description: 'Premium fashion for modern living.',
      profile: {
        create: {
          businessEmail: 'contact@elitefashion.com',
        },
      },
    },
  });

  // 5. Sample Products
  console.log('Seeding sample products...');
  const products = [
    {
      title: 'Classic White Tee',
      slug: 'classic-white-tee',
      description: '100% Cotton premium white t-shirt.',
      basePrice: 29.99,
      categoryId: categoryRecords['Fashion'],
      storeId: sampleStore.id,
      status: ProductStatus.ACTIVE,
    },
    {
      title: 'Wireless Noise Cancelling Headphones',
      slug: 'wireless-headphones',
      description: 'High-fidelity audio with active noise cancellation.',
      basePrice: 199.99,
      categoryId: categoryRecords['Electronics'],
      storeId: sampleStore.id,
      status: ProductStatus.ACTIVE,
    },
  ];

  for (const prod of products) {
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        ...prod,
        variants: {
          create: {
            sku: `${prod.slug}-default`,
            stock: 100,
            inventory: {
              create: {
                quantity: 100,
              },
            },
          },
        },
      },
    });
  }

  console.log('Seeding finished.');
  console.log(`Demo login password for seeded users (admin@marketplace.com, vendor@example.com): ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
