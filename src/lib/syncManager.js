// src/lib/syncManager.js - Unified sync operations
import { RawSheetsSync } from './rawSheetsSync';
import { MasterSheetSync } from './masterSheetSync';
import { MasterSheetWriter } from './masterSheetWriter';
import { DatabaseManager } from './dbManager';
import prisma from './db';

/**
 * Unified Sync Manager - Single entry point for all sync operations
 * Replaces the old syncService.js
 */
export class SyncManager {
  
  // ==================== DATABASE SEEDING ====================
  
  /**
   * Seed database from Master sheet (PRIMARY METHOD)
   * Use this for initial database population
   * 
   * This is the main seeding function - Master sheet is source of truth
   */
  static async seedFromMaster() {
    console.log('🌱 Seeding database from Master sheet...\n');
    return await MasterSheetSync.syncAllMaster();
  }

  // ==================== RAW SHEETS SYNC ====================
  
  /**
   * Sync Raw-QJL or Raw-PT sheets to database
   * Then writes to Master sheet
   * 
   * Note: Raw sheets don't always have complete data
   * Use seedFromMaster() for complete database seeding
   */
  static async syncRawSheet(sheetName, startRow, endRow) {
    return await RawSheetsSync.syncRawSheetToDatabase(sheetName, startRow, endRow);
  }

  /**
   * Sync all Raw-QJL data
   */
  static async syncAllRawQJL() {
    // Get row count from sheet
    const { dataRows } = await DatabaseManager.getSheetsData('Raw-QJL!A:BZ');
    return await this.syncRawSheet('Raw-QJL', 2, dataRows.length + 1);
  }

  /**
   * Sync all Raw-PT data
   */
  static async syncAllRawPT() {
    const { dataRows } = await DatabaseManager.getSheetsData('Raw-PT!A:AC');
    return await this.syncRawSheet('Raw-PT', 2, dataRows.length + 1);
  }

  // ==================== MASTER SHEET SYNC ====================

  /**
   * Handle Master sheet edit (webhook from Apps Script)
   * Updates database when Master is edited
   */
  static async handleMasterEdit(updateData) {
    return await MasterSheetSync.handleMasterUpdate(updateData);
  }

  /**
   * Sync order from database to Master sheet
   * Use after creating/updating order in database
   */
  static async syncOrderToMaster(orderId) {
    return await MasterSheetWriter.syncOrderToMaster(orderId);
  }

  /**
   * Update single field in Master sheet
   */
  static async updateMasterField(orderId, field, value) {
    return await MasterSheetWriter.updateOrderField(orderId, field, value);
  }

  /**
   * Sync all database orders to Master sheet
   * Use for full reconciliation
   */
  static async syncAllOrdersToMaster() {
    const syncLog = await DatabaseManager.createSyncLog({
      sheetName: 'Master',
      syncType: 'FULL_SYNC_TO_MASTER',
    });

    let synced = 0;
    let failed = 0;
    const errors = [];

    try {
      // Get all orders from database
      const orders = await prisma.order.findMany({
        select: { orderId: true },
        orderBy: { orderTime: 'desc' },
      });

      console.log(`📊 Syncing ${orders.length} orders to Master...`);

      for (const order of orders) {
        try {
          await MasterSheetWriter.syncOrderToMaster(order.orderId);
          synced++;
          
          if (synced % 10 === 0) {
            console.log(`  ✅ Synced ${synced}/${orders.length} orders`);
          }
        } catch (error) {
          console.error(`Failed to sync ${order.orderId}:`, error);
          failed++;
          errors.push(`${order.orderId}: ${error.message}`);
        }
      }

      await DatabaseManager.updateSyncLog(syncLog.id, {
        status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        recordsAdded: 0,
        recordsUpdated: synced,
        recordsFailed: failed,
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
      });

      console.log(`\n✅ Sync complete! ${synced} synced, ${failed} failed`);

      return {
        success: true,
        synced,
        failed,
        errors,
      };
    } catch (error) {
      await DatabaseManager.updateSyncLog(syncLog.id, {
        status: 'FAILED',
        recordsAdded: 0,
        recordsUpdated: synced,
        recordsFailed: failed,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Full system sync (DEPRECATED - use seedFromMaster instead)
   * @deprecated Use seedFromMaster() for initial seeding
   */
  static async fullSync() {
    console.warn('⚠️  fullSync() is deprecated. Use seedFromMaster() instead.');
    return await this.seedFromMaster();
  }

  /**
   * Reconcile database with Master sheet
   * Checks for inconsistencies
   */
  static async reconcile() {
    console.log('🔍 Reconciling database with Master sheet...\n');

    const issues = [];

    try {
      // Get all orders from database
      const dbOrders = await prisma.order.findMany({
        select: {
          orderId: true,
          paidStatus: true,
          packingStatus: true,
          shippingStatus: true,
        },
      });

      // Get all orders from Master sheet
      const { dataRows, colIndex } = await DatabaseManager.getSheetsData('Master!A:Z');
      const masterOrders = new Map();

      dataRows.forEach((row) => {
        const orderId = row[colIndex['OrderId']]?.trim();
        if (orderId && !masterOrders.has(orderId)) {
          masterOrders.set(orderId, {
            paidStatus: row[colIndex['付款情況']]?.trim(),
            packingStatus: row[colIndex['裝箱情況']]?.trim(),
            shippingStatus: row[colIndex['發貨狀態']]?.trim(),
          });
        }
      });

      // Check for mismatches
      for (const dbOrder of dbOrders) {
        const masterOrder = masterOrders.get(dbOrder.orderId);

        if (!masterOrder) {
          issues.push({
            orderId: dbOrder.orderId,
            issue: 'Missing from Master sheet',
            fix: 'sync-to-master',
          });
        } else {
          // Check field mismatches
          if (dbOrder.paidStatus !== masterOrder.paidStatus) {
            issues.push({
              orderId: dbOrder.orderId,
              issue: `Paid status mismatch: DB="${dbOrder.paidStatus}" Master="${masterOrder.paidStatus}"`,
              fix: 'database-wins',
            });
          }
        }
      }

      // Check for orders in Master but not in database
      dbOrders.forEach((order) => masterOrders.delete(order.orderId));
      masterOrders.forEach((_, orderId) => {
        issues.push({
          orderId,
          issue: 'In Master but not in database',
          fix: 'sync-from-master',
        });
      });

      console.log(`✅ Reconciliation complete`);
      console.log(`   Total issues: ${issues.length}`);

      return {
        success: true,
        totalIssues: issues.length,
        issues,
      };
    } catch (error) {
      console.error('❌ Reconciliation failed:', error);
      throw error;
    }
  }

  /**
   * Auto-fix reconciliation issues
   */
  static async autoFix(issues) {
    let fixed = 0;
    const errors = [];

    for (const issue of issues) {
      try {
        if (issue.fix === 'sync-to-master') {
          await MasterSheetWriter.syncOrderToMaster(issue.orderId);
          fixed++;
        } else if (issue.fix === 'database-wins') {
          const order = await DatabaseManager.getOrderByOrderId(issue.orderId);
          await MasterSheetWriter.updateOrderInMaster(order, []);
          fixed++;
        } else if (issue.fix === 'sync-from-master') {
          // Re-import this order from Master
          console.log(`⚠️  Order ${issue.orderId} in Master but not in DB - manual review needed`);
        }
      } catch (error) {
        console.error(`Failed to fix ${issue.orderId}:`, error);
        errors.push(`${issue.orderId}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      fixed,
      failed: errors.length,
      errors,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get sync status
   */
  static async getSyncStatus() {
    const recentLogs = await DatabaseManager.getRecentSyncLogs(10);
    
    const stats = {
      totalSyncs: recentLogs.length,
      successful: recentLogs.filter(l => l.status === 'SUCCESS').length,
      failed: recentLogs.filter(l => l.status === 'FAILED').length,
      partial: recentLogs.filter(l => l.status === 'PARTIAL').length,
      lastSync: recentLogs[0] || null,
    };

    return stats;
  }
}

export default SyncManager;
