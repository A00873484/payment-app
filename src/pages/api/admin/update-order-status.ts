// src/pages/api/admin/update-order-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { DatabaseManager } from '@/lib/dbManager';

const VALID_FIELDS = ['paidStatus', 'packingStatus', 'shippingStatus'] as const;
type StatusField = typeof VALID_FIELDS[number];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, field, value, updates: bulkUpdates } = req.body as {
    orderId?: string;
    field?: string;
    value?: string;
    updates?: Record<string, string>;
  };

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  try {
    let updates: Record<string, string>;

    if (bulkUpdates) {
      // Bulk update (used for cancel)
      updates = bulkUpdates;
    } else {
      if (!field || value === undefined || value === null) {
        return res.status(400).json({ error: 'field and value are required when not using bulk updates' });
      }
      if (!VALID_FIELDS.includes(field as StatusField)) {
        return res.status(400).json({ error: `Invalid field. Must be one of: ${VALID_FIELDS.join(', ')}` });
      }
      updates = { [field]: value };
      // Auto-complete shipping when packing is set to ready-ship
      if (field === 'packingStatus' && value === 'ready-ship') {
        updates.shippingStatus = 'complete';
      }
    }

    await DatabaseManager.updateOrder(orderId, updates as any);

    return res.status(200).json({ success: true, updates });
  } catch (err) {
    console.error('update-order-status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export default withAPIAuth(['write'])(handler);
