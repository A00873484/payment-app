// scripts/seed-from-master.js - Seed database from Master sheet
import { MasterSheetSync } from '../src/lib/masterSheetSync.js';

async function main() {
  console.log('🌱 Seeding database from Master sheet...\n');
  console.log('This will:');
  console.log('  1. Read all data from Master sheet');
  console.log('  2. Create/update users');
  console.log('  3. Create/update products');
  console.log('  4. Create/update orders with items');
  console.log('  5. Skip existing orders (updates status only)\n');

  const startTime = Date.now();

  try {
    const result = await MasterSheetSync.syncAllMaster();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database seeding complete!');
    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`  ⏱️  Duration: ${duration}s`);
    console.log(`  👥 Users: ${result.totalUsers}`);
    console.log(`  📦 Products: ${result.totalProducts}`);
    console.log(`  🛒 Total orders: ${result.totalOrders}`);
    console.log(`  ✅ Orders added: ${result.recordsAdded}`);
    console.log(`  ✏️  Orders updated: ${result.recordsUpdated}`);
    console.log(`  ❌ Failed: ${result.recordsFailed}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
      console.log('First 5 errors:');
      result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✅ Database is ready to use!');
    console.log('Next steps:');
    console.log('  - Start app: npm run dev');
    console.log('  - View data: npm run db:studio');
    console.log('  - Test payment flow\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
