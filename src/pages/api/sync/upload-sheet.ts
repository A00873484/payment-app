// src/pages/api/sync/upload-sheet.ts
// Accepts a base64-encoded xlsx/xls file, parses it with SheetJS, and runs it
// through the same sync pipeline as the Drive folder processor.
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { DriveFolderSync } from '@/lib/driveFolderSync';
import { RawSheetsSync } from '@/lib/rawSheetsSync';
import { errorMessage } from '@/lib/utils';


// Increase body size limit for xlsx uploads (default is 4 MB)
export const config = { api: { bodyParser: { sizeLimit: '32mb' } } };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, content } = req.body as { filename?: string; content?: string };

  if (!filename || !content) {
    return res.status(400).json({ error: 'Missing required fields: filename and content (base64)' });
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls'].includes(ext ?? '')) {
    return res.status(400).json({ error: 'Only .xlsx and .xls files are supported' });
  }

  try {
    const buffer = Buffer.from(content, 'base64');

    // Try each sheet until one matches a known format (handles multi-tab exports)
    const { rows, format } = DriveFolderSync.detectSheetAndFormat(buffer);

    const result = await RawSheetsSync.syncFromRows(rows, format.sheetName);

    return res.status(200).json({
      success: result.success,
      fileName: filename,
      format: format.sheetName,
      recordsAdded: result.recordsAdded,
      recordsUpdated: result.recordsUpdated,
      recordsFailed: result.recordsFailed,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Upload sheet sync error:', error);
    return res.status(500).json({ error: errorMessage(error) });
  }
}

export default withAPIAuth(['admin'])(handler);
