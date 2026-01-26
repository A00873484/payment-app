// src/pages/api/sync/reconcile.js - Check database vs Master sheet consistency
import { SyncManager } from '../../../lib/syncManager';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';
import { NextApiRequest, NextApiResponse } from 'next';
import { ErrorResponse, SuccessResponse } from '@/lib/types/database';
import { errorMessage } from '@/lib/utils';

interface ReconcileResponse extends SuccessResponse {
  totalIssues: number;
  issues: Array<{
    orderId: string;
    issue: string;
    fix: string;
  }>;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ReconcileResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting reconciliation...');

    const result = await SyncManager.reconcile();

    return res.status(200).json({
      message: 'Reconciliation completed',
      ...result,
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage(error),
    });
  }
}

export default withAPIAuth(['admin'])(handler);
