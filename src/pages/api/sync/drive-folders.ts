// src/pages/api/sync/drive-folders.ts
// Manual trigger: POST /api/sync/drive-folders
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { DriveFolderSync, DriveFileResult } from '@/lib/driveFolderSync';
import { errorMessage } from '@/lib/utils';

interface DriveSyncResponse {
  success: boolean;
  filesProcessed: number;
  results: DriveFileResult[];
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DriveSyncResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const results = await DriveFolderSync.processUnprocessedFolder();
    const allSucceeded = results.every(r => r.success);

    return res.status(allSucceeded ? 200 : 207).json({
      success: allSucceeded,
      filesProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error('Drive folder sync error:', error);
    return res.status(500).json({ error: errorMessage(error) });
  }
}

export default withAPIAuth(['admin'])(handler);
