// src/pages/api/sync/master-update.js - Webhook for Master sheet edits
import { NextApiRequest, NextApiResponse } from 'next';
import { MasterSheetSync } from '../../../lib/masterSheetSync';
import { ErrorResponse } from '@/lib/types/database';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { errorMessage } from '@/lib/utils';

// Track last sync times to prevent infinite loops
const lastSyncTimes = new Map();

interface MasterUpdateResponse {
  success: boolean;
  skipped?: boolean;
  message?: string;
  reason?: string;
  field?: string;
  paymentUrl?: string;
  token?: string;
  expiresIn?: string;
  orderId?: string;
  customerEmail?: string;
  newValue?: undefined | string | number | boolean;
  oldValue?: undefined | string | number | boolean;
}

async function handler(req: NextApiRequest, res: NextApiResponse<MasterUpdateResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, rowIndex, columnIndex, newValue, oldValue } = req.body;

    // Validation
    if (!orderId || !columnIndex) {
      return res.status(400).json({
        error: 'Missing required fields: orderId, columnIndex',
      });
    }

    console.log(`📥 Received Master update: Order ${orderId}, Column ${columnIndex}`);

    // Check if this is a sync-back echo (prevent infinite loop)
    const lastSync = lastSyncTimes.get(orderId) || 0;
    if (MasterSheetSync.shouldSkipUpdate(lastSync)) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'Too soon after sync-back',
      });
    }

    // Validate update
    const validation = MasterSheetSync.validateUpdate(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.reason,
      });
    }

    // Process update
    const result = await MasterSheetSync.handleMasterUpdate({
      orderId,
      columnIndex,
      newValue,
      oldValue,
    });

    // Update last sync time for this order
    lastSyncTimes.set(orderId, Date.now());

    // Clean up old entries (keep last hour only)
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, time] of lastSyncTimes.entries()) {
      if (time < oneHourAgo) {
        lastSyncTimes.delete(key);
      }
    }

    return res.status(200).json({
      message: `Updated ${result.field} for order ${orderId}`,
      ...result,
    });
  } catch (error) {
    console.error('Master update error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage(error),
    });
  }
}
export default withAPIAuth(['admin'])(handler);
