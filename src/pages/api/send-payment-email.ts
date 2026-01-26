import { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../lib/email';
import { withAPIAuth } from '../../lib/middleware/apiAuth';
import { ErrorResponse, SuccessResponse } from '@/lib/types/database';

async function handler(req: NextApiRequest, res: NextApiResponse<SuccessResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerEmail, customerName, orderId, paymentUrl, orderTotal } = req.body;

    if (!customerEmail || !customerName || !orderId || !paymentUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailHTML = `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f5f1; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <!-- Header Section -->
        <div style="background-color: #f5e1d5; text-align: center; padding: 30px;">
          <img src="logo.png" alt="Plane" style="width: 80px; display: block; margin: 0 auto 10px;">
          <h1 style="margin: 0; font-size: 26px; color: #2b2b2b; font-weight: bold;">🛒 Payment Needed</h1>
          <p style="margin: 8px 0 0 0; font-size: 15px; color: #5c5c5c;">Complete your order payment to proceed</p>
        </div>

        <!-- Body Section -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #3a3a3a;">Dear ${customerName},</p>
          <p style="font-size: 16px; color: #3a3a3a;">Your order <strong>#${orderId}</strong> is ready for payment.</p>

          ${orderTotal ? `<p style="font-size: 16px; color: #3a3a3a;"><strong>Order Total: ${orderTotal}</strong></p>` : ''}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" 
              style="display: inline-block; background-color: #e6cba9; color: #2b2b2b; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🔒 Pay Now
            </a>
          </div>

          <p style="font-size: 13px; color: #7d7d7d; text-align: center; line-height: 1.4;">
            This payment link will expire in 24 hours.<br>
            🛡️ Your payment is secured with 256-bit SSL encryption.
          </p>
        </div>
      </div>
    `;

    // In production, use your actual email service
    console.log('Sending payment email to:', customerEmail);
    console.log('Payment URL:', paymentUrl);
    await EmailService.sendEmail({ to: customerEmail, subject: `Payment Required - Order #${orderId}`, html: emailHTML });

    res.status(200).json({
      success: true,
      message: 'Payment email sent successfully'
    });

  } catch (error) {
    console.error('Payment email sending failed:', error);
    res.status(500).json({ error: 'Failed to send payment email' });
  }
}

// Apply authentication middleware (requires 'read' permission) for API access
export default withAPIAuth(['read'])(handler);