import { google } from 'googleapis';
import { oauth2Client } from '@/lib/googleAuth';

export default async function handler(req, res) {
  /*oauth2Client.setCredentials({
    access_token: req.body.accessToken,
    refresh_token: req.body.refreshToken,
  });*/

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: 'your-spreadsheet-id',
      range: 'Master!A:Z',
    });

    res.status(200).json({ data: response.data.values });
  } catch (error) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
}