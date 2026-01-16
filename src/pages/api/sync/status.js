// src/pages/api/sync/status.js - Get sync statistics
import { DatabaseManager } from '../../../lib/dbManager';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get order statistics
    const orderStats = await DatabaseManager.getOrderStatistics();

    // Get recent sync logs
    const recentSyncs = await DatabaseManager.getRecentSyncLogs(10);

    const stats = {
      totalOrders: orderStats.totalOrders,
      paidOrders: orderStats.paidOrders,
      unpaidOrders: orderStats.unpaidOrders,
      totalRevenue: orderStats.totalRevenue,
      recentSyncs: recentSyncs.map(log => ({
        id: log.id,
        sheetName: log.sheetName,
        syncType: log.syncType,
        status: log.status,
        recordsAdded: log.recordsAdded,
        recordsUpdated: log.recordsUpdated,
        recordsFailed: log.recordsFailed,
        createdAt: log.createdAt,
      })),
    };

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default withAPIAuth(handler);
