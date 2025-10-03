import { SheetsManager } from '../../../lib/sheets';
import { verifyToken } from '../../../lib/jwt';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone } = req.query;
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenValidation = await verifyToken(token);
    if (!tokenValidation.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify the token contains the correct phone
    if (tokenValidation.payload.phone !== phone) {
      return res.status(403).json({ error: 'Token does not match user ID' });
    }

    const orderData = await SheetsManager.fetchOrderDetails(phone);
    res.status(200).json(orderData);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Apply authentication middleware (requires 'write' permission)
export default withAPIAuth(['write'])(handler);