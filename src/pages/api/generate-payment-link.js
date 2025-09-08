import { signToken } from '../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, customerEmail } = req.body;

    if (!orderId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate JWT token
    const token = await signToken({
      orderId,
      customerEmail,
      purpose: 'payment'
    });

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment?orderId=${orderId}&token=${token}`;

    res.status(200).json({
      success: true,
      paymentUrl,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Payment link generation failed:', error);
    res.status(500).json({ error: error.message });
  }
}