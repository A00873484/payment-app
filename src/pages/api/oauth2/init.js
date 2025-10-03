import { oauth2Client } from '@/lib/googleAuth';

export default async function handler(req, res) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  res.redirect(authUrl);
}
