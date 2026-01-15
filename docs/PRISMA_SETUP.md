# Prisma Database Setup Guide

## 🎯 Overview

You're migrating from Google Sheets to Prisma + PostgreSQL/MySQL database. The Master sheet will still be used as a data source, but Orders, OrderItems, Products, and Users will now live in the database.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL, MySQL, or SQLite
- Your existing Google Sheets access
- Payment app repository

## 🚀 Setup Steps

### 1. Install Dependencies

```bash
cd C:\Users\danny\Projects\payment-app
npm install
```

This will install Prisma and @prisma/client along with other dependencies.

### 2. Choose Your Database

#### Option A: PostgreSQL (Recommended for Production)

**Install PostgreSQL:**
- Download from https://www.postgresql.org/download/
- Or use Docker: `docker run --name payment-db -e POSTGRES_PASSWORD=mysecret -p 5432:5432 -d postgres`

**Create Database:**
```sql
CREATE DATABASE payment_app;
```

**Connection String:**
```
DATABASE_URL="postgresql://username:password@localhost:5432/payment_app?schema=public"
```

#### Option B: MySQL

**Install MySQL:**
- Download from https://dev.mysql.com/downloads/

**Create Database:**
```sql
CREATE DATABASE payment_app;
```

**Connection String:**
```
DATABASE_URL="mysql://username:password@localhost:3306/payment_app"
```

#### Option C: SQLite (Development Only)

**No installation needed!**

**Connection String:**
```
DATABASE_URL="file:./dev.db"
```

**Update schema.prisma:**
```prisma
datasource db {
  provider = "sqlite"  // Change from postgresql
  url      = env("DATABASE_URL")
}
```

### 3. Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Database - Choose ONE of these:
DATABASE_URL="postgresql://username:password@localhost:5432/payment_app?schema=public"
# DATABASE_URL="mysql://username:password@localhost:3306/payment_app"
# DATABASE_URL="file:./dev.db"

# Keep your existing Google Sheets config (for Master sheet sync)
GOOGLE_SHEETS_API_KEY=your_actual_key
SPREADSHEET_ID=your_actual_spreadsheet_id

# Keep your existing AlphaPay config
ALPHAPAY_SECRET_KEY=your_actual_key
NEXT_PUBLIC_ALPHAPAY_PUBLIC_KEY=your_actual_key

# Keep your existing JWT secret
JWT_SECRET=your_actual_secret

# Keep your existing NextAuth config
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_actual_secret
GOOGLE_CLIENT_ID=your_actual_id
GOOGLE_CLIENT_SECRET=your_actual_secret

# Keep your existing email config
EMAIL_SERVICE_API_KEY=your_actual_key
EMAIL_SERVICE_ENDPOINT=your_actual_endpoint
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

This generates the Prisma Client based on your schema.

### 5. Create Database Tables

**Option A: Using Prisma Migrate (Recommended for Production)**
```bash
npm run db:migrate
```

This creates a migration file and applies it to your database.

**Option B: Using Prisma Push (Quick for Development)**
```bash
npm run db:push
```

This directly pushes the schema to your database without creating migration files.

### 6. Seed the Database (Optional)

Add sample data for testing:
```bash
npm run db:seed
```

This creates:
- 2 sample users
- 3 sample products
- 2 sample orders with items

### 7. Sync Data from Master Sheet

After your database is set up, import existing orders from Google Sheets:

**Option A: Via API (Recommended)**

Start the dev server:
```bash
npm run dev
```

Then make a POST request (you'll need to be authenticated as admin):
```bash
curl -X POST http://localhost:3000/api/sync/master \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option B: Via Script**

Create a script file `scripts/sync-master.js`:
```javascript
import { SyncService } from '../src/lib/syncService.js';

async function main() {
  console.log('🔄 Starting sync from Master sheet...');
  const result = await SyncService.syncMasterToDatabase();
  console.log('✅ Sync complete!', result);
}

main().catch(console.error);
```

Run it:
```bash
node scripts/sync-master.js
```

## 🔍 Verify Setup

### Check Database

**Using Prisma Studio (Visual Interface):**
```bash
npm run db:studio
```

This opens a web interface at http://localhost:5555 where you can browse your data.

**Using SQL:**
```sql
-- Check tables were created
SELECT * FROM users LIMIT 5;
SELECT * FROM products LIMIT 5;
SELECT * FROM orders LIMIT 5;
SELECT * FROM order_items LIMIT 5;

-- Check counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM products;
```

### Test API Endpoints

```bash
# Test getting an order (you'll need a valid token and orderId)
curl http://localhost:3000/api/orders/ORD-SAMPLE-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Database Schema Overview

```
Users
  ├─ id (Primary Key)
  ├─ phone (Unique)
  ├─ email (Unique)
  ├─ name
  ├─ wechatId
  └─ orders → Order[]

Products
  ├─ id (Primary Key)
  ├─ barcode (Unique)
  ├─ productName
  ├─ specification
  ├─ inventory
  ├─ basePrice
  └─ orderItems → OrderItem[]

Orders
  ├─ id (Primary Key)
  ├─ orderId (Unique) - Your custom order ID
  ├─ userId → User
  ├─ phone
  ├─ paidStatus
  ├─ shippingStatus
  ├─ totalOrderAmount
  └─ orderItems → OrderItem[]

OrderItems
  ├─ id (Primary Key)
  ├─ orderId → Order
  ├─ productId → Product
  ├─ quantity
  ├─ priceAtPurchase (historical price)
  └─ totalProductAmount
```

## 🔄 Workflow: Master Sheet → Database

1. **Orders entered in Master Sheet** (your existing process)
2. **Sync to Database** (manual trigger or scheduled)
3. **App reads from Database** (fast queries)
4. **Payment updates Database** (instant)
5. **Optional: Sync back to Master** (for backup/reporting)

## 🛠️ Common Operations

### Sync Single Order
```javascript
import { SyncService } from './src/lib/syncService.js';
await SyncService.syncSingleOrder('ORD-123');
```

### Get Customer Orders
```javascript
import { DatabaseManager } from './src/lib/dbManager.js';
const orders = await DatabaseManager.getUnpaidOrders('555-0100');
```

### Update Order Status
```javascript
import { DatabaseManager } from './src/lib/dbManager.js';
await DatabaseManager.updateOrderStatus('ORD-123', '已付款', 'PAY-123');
```

### Create New Product
```javascript
import { DatabaseManager } from './src/lib/dbManager.js';
await DatabaseManager.createProduct({
  productName: 'New Widget',
  brand: 'Premium',
  basePrice: 39.99,
  inventory: 100
});
```

## 🐛 Troubleshooting

### "Environment variable not found: DATABASE_URL"
- Make sure `.env.local` exists in the root directory
- Restart your dev server after adding environment variables

### "Can't reach database server"
- Check if PostgreSQL/MySQL is running
- Verify connection string in `.env.local`
- Check firewall settings

### Prisma Client not generated
- Run `npm run db:generate`
- Restart your IDE/editor

### Migration failed
- Check database permissions
- Ensure database exists
- Try `npm run db:push` instead for quick iteration

### Sync errors
- Check Google Sheets API credentials
- Verify spreadsheet ID is correct
- Check sheet column names match `const.js`

## 📚 Next Steps

1. ✅ Database is set up
2. ✅ Data is seeded or synced
3. ⏭️ Update remaining API endpoints to use Prisma
4. ⏭️ Test payment flow end-to-end
5. ⏭️ Set up automated sync (cron job or webhook)
6. ⏭️ Add monitoring and logging

## 🔗 Useful Commands

```bash
# Development
npm run dev                  # Start dev server
npm run db:studio           # Open Prisma Studio

# Database
npm run db:generate         # Generate Prisma Client
npm run db:push            # Push schema to database (dev)
npm run db:migrate         # Create and run migrations (prod)
npm run db:seed            # Seed database with sample data

# Production
npm run build              # Build for production
npm start                  # Start production server
```

## 💡 Tips

- Use Prisma Studio (`npm run db:studio`) to explore your data visually
- Keep Master sheet as source of truth initially, sync regularly
- Add indexes for frequently queried fields (already done in schema)
- Set up automated backups for your database
- Consider read replicas for high traffic

## 🆘 Need Help?

Check the logs in:
- Console output during sync
- `sync_logs` table in database
- Next.js error logs

Common issues are usually:
1. Environment variables not set
2. Database not running
3. Google Sheets API quota exceeded
4. Network/firewall issues
