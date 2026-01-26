// src/pages/api/sync/raw-sheets.js - Webhook for Raw-QJL/Raw-PT edits
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { RawSheetsSync } from '../../../lib/rawSheetsSync';
import { NextApiRequest, NextApiResponse } from 'next';
import { ErrorResponse, SuccessResponse } from '@/lib/types/database';
import { errorMessage } from '@/lib/utils';

interface RawSheetSyncResponse extends SuccessResponse {
  recordsAdded: number;
  recordsUpdated: number;
  recordsFailed: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse<RawSheetSyncResponse | ErrorResponse>) {
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

    const { sheetName, startRow, endRow } = req.body;

    // Validation
    if (!sheetName || !startRow || !endRow) {
      return res.status(400).json({
        error: 'Missing required fields: sheetName, startRow, endRow',
      });
    }

    if (!['Raw-QJL', 'Raw-PT'].includes(sheetName)) {
      return res.status(400).json({
        error: 'Invalid sheetName. Must be "Raw-QJL" or "Raw-PT"',
      });
    }

    console.log(`📥 Received Raw sheet sync request: ${sheetName} rows ${startRow}-${endRow}`);

    // Process sync
    const result = await RawSheetsSync.syncRawSheetToDatabase(
      sheetName,
      startRow,
      endRow
    );

    return res.status(200).json({
      message: `Synced ${sheetName} rows ${startRow}-${endRow}`,
      ...result,
    });
  } catch (error) {
    console.error('Raw sheets sync error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage(error),
    });
  }
}
export default withAPIAuth(['admin'])(handler);