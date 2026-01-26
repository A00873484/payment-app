import { NextApiRequest, NextApiResponse } from 'next';
import { signToken } from '../../lib/jwt';
import { withAPIAuth } from '../../lib/middleware/apiAuth';
import { ErrorResponse } from '@/lib/types/database';

interface PaymentLinkResponse {
  success: boolean;
  paymentUrl: string;
  token: string;
  expiresIn: string;
  orderId: string;
  customerEmail: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<PaymentLinkResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, customerEmail, customerName, orderTotal } = req.body;

    if (!orderId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields: orderId and customerEmail' });
    }

    // Generate JWT token
    const token = await signToken({
      orderId,
      customerEmail,
      customerName,
      orderTotal,
      purpose: 'payment'
    });

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment?orderId=${orderId}&token=${token}`;

    // Log API usage
    console.log(`Payment link generated for orderId: ${orderId}, customerEmail: ${customerEmail}`);

    res.status(200).json({
      success: true,
      paymentUrl,
      token,
      expiresIn: '24h',
      orderId,
      customerEmail
    });

  } catch (error) {
    console.error('Payment link generation failed:', error);
    res.status(500).json({ error: 'Failed to generate payment link' });
  }
}

// Apply authentication middleware (requires 'write' permission)
export default withAPIAuth(['write'])(handler);