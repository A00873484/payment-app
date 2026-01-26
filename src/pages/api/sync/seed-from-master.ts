// src/pages/api/sync/seed-from-master.js - Seed database from Master sheet
import { NextApiRequest, NextApiResponse } from 'next';
import { MasterSheetSync } from '../../../lib/masterSheetSync';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';
import { ErrorResponse, SuccessResponse } from '@/lib/types/database';
import { errorMessage } from '@/lib/utils';

async function handler(req: NextApiRequest, res: NextApiResponse<SuccessResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🌱 Starting database seed from Master sheet...');

    // Sync all Master sheet data to database
    const result = await MasterSheetSync.syncAllMaster();

    return res.status(200).json({
      message: 'Database seeded successfully from Master sheet',
      ...result,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage(error),
    });
  }
}

// Require authentication for seeding
export default withAPIAuth(['admin'])(handler);
