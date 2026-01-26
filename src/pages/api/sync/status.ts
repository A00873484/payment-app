// src/pages/api/sync/status.js - Get sync statistics
import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/dbManager';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';
import { ErrorResponse } from '@/lib/types/database';
import { errorMessage } from '@/lib/utils';

interface StatusStats {
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  totalRevenue: number;
  recentSyncs: Array<{
    id: string;
    sheetName: string;
    syncType: string;
    status: string;
    recordsAdded: number;
    recordsUpdated: number;
    recordsFailed: number;
    createdAt: Date;
  }>;
}

interface StatusResponse {
  success: true;
  stats: StatusStats;
}

async function handler(req: NextApiRequest, res: NextApiResponse<StatusResponse | ErrorResponse>) {
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
      error: errorMessage(error),
    });
  }
}

export default withAPIAuth(['admin'])(handler);
