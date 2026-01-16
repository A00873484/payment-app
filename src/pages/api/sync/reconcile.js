// src/pages/api/sync/reconcile.js - Check database vs Master sheet consistency
import { SyncManager } from '../../../lib/syncManager';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting reconciliation...');

    const result = await SyncManager.reconcile();

    return res.status(200).json({
      success: true,
      message: `Found ${result.totalIssues} inconsistencies`,
      ...result,
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default withAPIAuth(handler);
