// src/pages/api/cron/process-drive-folders.ts
// Called daily by Vercel Cron — schedule configured in vercel.json
import type { NextApiRequest, NextApiResponse } from 'next';
import { DriveFolderSync } from '@/lib/driveFolderSync';
import { errorMessage } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel injects CRON_SECRET automatically and sends it as a Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const results = await DriveFolderSync.processUnprocessedFolder();

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Cron: processed ${results.length} file(s) — ${succeeded} ok, ${failed} failed`);

    return res.status(200).json({
      success: true,
      filesProcessed: results.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    console.error('Cron drive-folder sync failed:', error);
    return res.status(500).json({ error: errorMessage(error) });
  }
}
