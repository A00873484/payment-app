// src/pages/api/sync/master-update.js - Webhook for Master sheet edits
import { MasterSheetSync } from '../../../lib/masterSheetSync';

// Track last sync times to prevent infinite loops
const lastSyncTimes = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate API key
    const apiKey = req.body.apiKey || req.headers['x-api-key'];
    const expectedKey = process.env.SYNC_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
    if (MasterSheetSync.shouldSkipUpdate({ orderId, columnIndex }, lastSync)) {
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
      rowIndex,
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
      success: true,
      message: `Updated ${result.field} for order ${orderId}`,
      ...result,
    });
  } catch (error) {
    console.error('Master update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
