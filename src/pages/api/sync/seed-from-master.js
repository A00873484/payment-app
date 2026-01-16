// src/pages/api/sync/seed-from-master.js - Seed database from Master sheet
import { MasterSheetSync } from '../../../lib/masterSheetSync';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🌱 Starting database seed from Master sheet...');

    // Sync all Master sheet data to database
    const result = await MasterSheetSync.syncAllMaster();

    return res.status(200).json({
      success: true,
      message: 'Database seeded successfully from Master sheet',
      ...result,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// Require authentication for seeding
export default withAPIAuth(handler);
