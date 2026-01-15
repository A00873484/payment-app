# Master Sheet Seeding - Complete Guide

## 🎯 Overview

**Master sheet is now the primary source for database seeding.** This is the recommended approach because Master sheet contains complete, validated data including all manual edits.

## ✅ What's Been Created

### New Primary Seeding Method
```
src/lib/
└── masterSheetSync.js
    └── syncAllMaster()  ← PRIMARY SEEDING FUNCTION
```

### Supporting Files
```
src/lib/
├── syncManager.js           - Unified interface (seedFromMaster())
└── masterSheetWriter.js     - Database → Master sync-back

src/pages/api/sync/
└── seed-from-master.js      - API endpoint for seeding

scripts/
└── seed-from-master.js      - CLI script for seeding
```

## 🚀 Quick Start - Seed Database

### Method 1: NPM Script (Easiest)
```bash
npm run db:seed-master
```

### Method 2: API Call
```bash
curl -X POST http://localhost:3000/api/sync/seed-from-master \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Method 3: Programmatically
```javascript
import { MasterSheetSync } from './lib/masterSheetSync.js';

const result = await MasterSheetSync.syncAllMaster();

console.log(`✅ Seeded ${result.recordsAdded} orders`);
console.log(`📊 Total: ${result.totalOrders} orders, ${result.totalUsers} users, ${result.totalProducts} products`);
```

### Method 4: Via SyncManager (Recommended)
```javascript
import { SyncManager } from './lib/syncManager.js';

await SyncManager.seedFromMaster();
```

## 📊 What syncAllMaster() Does

### Step-by-Step Process:

1. **Reads Master Sheet**
   - Fetches all rows from Master!A:Z
   - Handles merged cells
   - Parses order data

2. **Extracts Data**
   - Users (phone, name, email, address)
   - Products (name, spec, category, price)
   - Orders (order details, status)
   - Order Items (quantities, prices)

3. **Writes to Database**
   - Creates/updates users via `DatabaseManager.upsertUser()`
   - Creates products via `DatabaseManager.findOrCreateProduct()`
   - Creates orders via `DatabaseManager.createOrder()`
   - Creates order items via `DatabaseManager.createOrderItem()`

4. **Handles Existing Data**
   - New orders → Created
   - Existing orders → Status updated only
   - Deduplicates users and products

5. **Logs Results**
   - Creates sync log in database
   - Returns detailed statistics
   - Reports any errors

## 📋 Example Output

```
🌱 Seeding database from Master sheet...

📦 Found 450 rows in Master sheet

📊 Parsed:
  👥 85 users
  📦 42 products
  🛒 150 orders

💾 Writing to database...

✅ Processed 85 users
✅ Processed 42 products
  ✅ Created order QJL-001 with 3 items
  ✅ Created order QJL-002 with 2 items
  ✏️  Updated order QJL-003
  ... (continues)

📊 Sync completed!
  ✅ Added: 148 orders
  ✏️  Updated: 2 orders
  ❌ Failed: 0

✅ Database is ready to use!
```

## 🔧 Configuration

No special configuration needed! Just ensure:
- ✅ Database is set up (`npm run db:push`)
- ✅ Google Sheets credentials configured
- ✅ `SPREADSHEET_ID` in `.env.local`

## 📊 Function Reference

### MasterSheetSync.syncAllMaster()

**Purpose**: Seed database from Master sheet (complete data)

**Returns**:
```javascript
{
  success: true,
  recordsAdded: 150,      // New orders created
  recordsUpdated: 5,      // Existing orders updated
  recordsFailed: 0,       // Failed records
  totalUsers: 85,         // Total users processed
  totalProducts: 42,      // Total products processed
  totalOrders: 155,       // Total orders found
  errors: []              // Array of error messages
}
```

**Usage**:
```javascript
const result = await MasterSheetSync.syncAllMaster();
```

### SyncManager.seedFromMaster()

**Purpose**: Convenience wrapper for Master sheet seeding

**Usage**:
```javascript
import { SyncManager } from './lib/syncManager.js';
await SyncManager.seedFromMaster();
```

## 🆚 Comparison with Raw Sheets Sync

| Feature | Master Sheet Seeding | Raw Sheets Sync |
|---------|---------------------|-----------------|
| **Data Completeness** | ✅ Complete | ⚠️ May be incomplete |
| **Manual Edits** | ✅ Included | ❌ Not included |
| **Recommended For** | ✅ Initial seeding | ⚠️ Real-time webhooks |
| **Production Ready** | ✅ YES | ⚠️ Optional |
| **Source of Truth** | ✅ YES | ❌ NO |

## ⚠️ Important Notes

### About Existing Orders
- **New orders**: Fully created with all items
- **Existing orders**: Only status fields updated (paidStatus, packingStatus, shippingStatus)
- **Rationale**: Prevents data inconsistency if order already processed

### About Merged Cells
- Master sheet has merged cells for orders (one order = multiple rows)
- `syncAllMaster()` handles this automatically
- Fills merged values down before processing

### About Duplicates
- Users: Upserted by phone (updates if exists)
- Products: Matched by name+spec (creates if new)
- Orders: Skipped if orderId exists (updates status only)

## 🧪 Testing

### Test the Seeding Process

```javascript
// Test in development
import { MasterSheetSync } from './lib/masterSheetSync.js';

// Dry run - check what will be processed
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: config.googleSheets.spreadsheetId,
  range: 'Master!A:Z',
});

console.log(`Will process ${response.data.values.length - 1} rows`);

// Run actual seeding
const result = await MasterSheetSync.syncAllMaster();

// Verify results
console.log(`Created: ${result.recordsAdded}`);
console.log(`Updated: ${result.recordsUpdated}`);
console.log(`Failed: ${result.recordsFailed}`);
```

### Verify in Prisma Studio

```bash
npm run db:studio
# Opens http://localhost:5555

# Check:
# - Users table has entries
# - Products table has entries
# - Orders table has entries
# - OrderItems table has entries
```

### Check Sync Logs

```javascript
import { DatabaseManager } from './lib/dbManager.js';

const logs = await DatabaseManager.getRecentSyncLogs(10);
console.log(logs);
```

## 🔄 Workflow Integration

### Initial Setup (One-Time)
```bash
# 1. Setup database
npm run db:push

# 2. Seed from Master
npm run db:seed-master

# 3. Verify
npm run db:studio
```

### Ongoing Operations

**Option A: Master-Only (Recommended)**
```
1. Team works in Master sheet
2. Apps Script webhook on edit
3. Database updated via API
4. Optional: Sync-back to Master
```

**Option B: Periodic Re-Sync**
```
1. Team works in Master sheet
2. Cron job runs daily:
   npm run db:seed-master
3. Database stays in sync
```

## 📚 Related Functions

### After Seeding, Use These:

**Handle Master Edits**:
```javascript
await MasterSheetSync.handleMasterUpdate({
  orderId: 'QJL-123',
  columnIndex: 16,
  newValue: '已付款'
});
```

**Sync Database Back to Master**:
```javascript
await MasterSheetWriter.syncOrderToMaster('QJL-123');
```

**Reconcile Differences**:
```javascript
const issues = await SyncManager.reconcile();
await SyncManager.autoFix(issues.issues);
```

## ✅ Advantages of Master Sheet Seeding

1. **Complete Data**
   - Includes Raw sheet data + manual edits
   - Single source of truth
   - Already validated by team

2. **Production Ready**
   - Tested and reliable
   - Handles edge cases
   - Proper error handling

3. **Simple to Use**
   - One command: `npm run db:seed-master`
   - Clear output and logging
   - Easy to verify results

4. **Flexible**
   - Can re-run anytime
   - Handles both new and existing data
   - Safe to run multiple times

## 🗑️ What to Deprecate

Based on Master sheet seeding, you can now deprecate:

✅ **DELETE**: `syncService.js` - Replaced by `MasterSheetSync.syncAllMaster()`

⚠️ **OPTIONAL**: `rawSheetsSync.js` - Only if using Raw sheet webhooks

✅ **KEEP**: All other files (masterSheetSync, masterSheetWriter, syncManager)

## 📞 Support

If you encounter issues:

1. Check sync logs: `DatabaseManager.getRecentSyncLogs()`
2. Check Prisma Studio for data
3. Review error messages in output
4. Consult `DEPRECATION_GUIDE.md`

---

## Quick Reference

```bash
# Seed database from Master
npm run db:seed-master

# View database
npm run db:studio

# Check sync status
# (in your app)
import { SyncManager } from './lib/syncManager.js';
const status = await SyncManager.getSyncStatus();
```

**That's it!** Master sheet seeding is now your primary method for database population. 🎉
