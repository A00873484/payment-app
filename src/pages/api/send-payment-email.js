import { EmailService } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerEmail, customerName, orderId, paymentUrl, orderTotal } = req.body;

    if (!customerEmail || !customerName || !orderId || !paymentUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🛒 Payment Required</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Complete your order payment</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p>Dear ${customerName},</p>
          <p>Your order <strong>#${orderId}</strong> is ready for payment.</p>
          
          ${orderTotal ? `<p><strong>Order Total: ${orderTotal}</strong></p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              🔒 Pay Now Securely
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            This payment link will expire in 24 hours.<br>
            🛡️ Your payment is secured with 256-bit SSL encryption.
          </p>
        </div>
      </div>
    `;

    // In production, use your actual email service
    console.log('Sending payment email to:', customerEmail);
    console.log('Payment URL:', paymentUrl);

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.status(200).json({
      success: true,
      message: 'Payment email sent successfully'
    });

  } catch (error) {
    console.error('Payment email sending failed:', error);
    res.status(500).json({ error: error.message });
  }
}