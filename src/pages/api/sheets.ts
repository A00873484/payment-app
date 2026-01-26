import { ErrorResponse, SuccessResponse } from '@/lib/types/database';
import { google } from 'googleapis';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse<{data: string[][]} | ErrorResponse>) {

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: 'your-spreadsheet-id',
      range: 'Master!A:Z',
    });

    res.status(200).json({ data: response.data.values as string[][] });
  } catch (error) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
}