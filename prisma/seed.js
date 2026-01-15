// prisma/seed.js - Seed database with initial data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { phone: '555-0100' },
    update: {},
    create: {
      phone: '555-0100',
      name: 'John Doe',
      nameEn: 'John Doe',
      email: 'john@example.com',
      address: '123 Main St',
      wechatId: 'johndoe123',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { phone: '555-0200' },
    update: {},
    create: {
      phone: '555-0200',
      name: 'Jane Smith',
      nameEn: 'Jane Smith',
      email: 'jane@example.com',
      address: '456 Oak Ave',
      wechatId: 'janesmith456',
    },
  });

  console.log('✅ Created users:', user1.name, user2.name);

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { barcode: 'PROD001' },
      update: {},
      create: {
        brand: 'Premium',
        productName: 'Premium Widget',
        specification: 'Standard',
        inventory: 100,
        barcode: 'PROD001',
        basePrice: 29.99,
        active: true,
        category: 'Widgets',
      },
    }),
    prisma.product.upsert({
      where: { barcode: 'PROD002' },
      update: {},
      create: {
        brand: 'Basic',
        productName: 'Basic Gadget',
        specification: 'Large',
        inventory: 50,
        barcode: 'PROD002',
        basePrice: 19.99,
        active: true,
        category: 'Gadgets',
      },
    }),
    prisma.product.upsert({
      where: { barcode: 'SHIP001' },
      update: {},
      create: {
        brand: 'Service',
        productName: 'Express Shipping',
        specification: null,
        inventory: 9999,
        barcode: 'SHIP001',
        basePrice: 9.99,
        active: true,
        category: 'Shipping',
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      orderId: 'ORD-SAMPLE-001',
      userId: user1.id,
      phone: user1.phone,
      orderTime: new Date(),
      shippingCost: 9.99,
      totalOrderAmount: 69.97,
      paidStatus: 'pending',
      packingStatus: 'pending',
      shippingStatus: 'pending',
      address: user1.address,
      fulfillable: true,
      orderItems: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].productName,
            specification: products[0].specification,
            quantity: 2,
            totalProductAmount: 59.98,
            priceAtPurchase: 29.99,
            brand: products[0].brand,
          },
          {
            productId: products[2].id,
            productName: products[2].productName,
            specification: products[2].specification,
            quantity: 1,
            totalProductAmount: 9.99,
            priceAtPurchase: 9.99,
            brand: products[2].brand,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderId: 'ORD-SAMPLE-002',
      userId: user2.id,
      phone: user2.phone,
      orderTime: new Date(Date.now() - 86400000), // Yesterday
      shippingCost: 9.99,
      totalOrderAmount: 29.98,
      paidStatus: '已付款',
      packingStatus: 'packed',
      shippingStatus: 'pending',
      address: user2.address,
      fulfillable: true,
      paymentId: 'PAY-SAMPLE-001',
      orderItems: {
        create: [
          {
            productId: products[1].id,
            productName: products[1].productName,
            specification: products[1].specification,
            quantity: 1,
            totalProductAmount: 19.99,
            priceAtPurchase: 19.99,
            brand: products[1].brand,
            packed: true,
          },
          {
            productId: products[2].id,
            productName: products[2].productName,
            specification: products[2].specification,
            quantity: 1,
            totalProductAmount: 9.99,
            priceAtPurchase: 9.99,
            brand: products[2].brand,
          },
        ],
      },
    },
  });

  console.log('✅ Created orders:', order1.orderId, order2.orderId);

  console.log('\n🎉 Seeding completed!');
  console.log(`
📊 Summary:
  - Users: 2
  - Products: ${products.length}
  - Orders: 2
  - Order Items: 4
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
