import { oauth2Client } from '@/lib/googleAuth';

export default async function handler(req, res) {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // You can store tokens in cookies, session, or DB
    res.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Failed to exchange code for tokens' });
  }
}
