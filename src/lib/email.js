// ===========================
// Updated src/lib/email.js - Add alternative payment confirmation
// ===========================
// Add this method to your existing EmailService class:

export class EmailService {
  // ... existing methods ...

  static async sendAlternativePaymentConfirmation(customerEmail, customerName, orders, paymentMethod, totalAmount) {
    try {
      const methodName = paymentMethod === 'cash' ? 'Cash' : 'E-Transfer';
      const emailHTML = this.generateAlternativePaymentHTML(customerName, orders, paymentMethod, totalAmount);

      const emailData = {
        to: customerEmail,
        subject: `Payment Method Confirmed - ${methodName} for ${orders.length} Order${orders.length > 1 ? 's' : ''}`,
        html: emailHTML
      };

      console.log('Sending alternative payment confirmation email:', emailData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, messageId: `msg_${Date.now()}` };

    } catch (error) {
      console.error('Failed to send alternative payment confirmation email:', error);
      throw error;
    }
  }

  static generateAlternativePaymentHTML(customerName, orders, paymentMethod, totalAmount) {
    const ordersHTML = orders.map(order => {
      const itemsHTML = order.items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">
            ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; text-align: right;">
            ${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `).join('');

      return `
        <div style="margin-bottom: 30px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #fafafa;">
          <h3 style="color: #333; margin-top: 0;">Order: ${order.orderId}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            ${itemsHTML}
            <tr style="font-weight: bold; background: white;">
              <td style="padding: 12px 8px;">Order Total</td>
              <td style="padding: 12px 8px; text-align: right;">${order.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    const methodIcon = paymentMethod === 'cash' ? '💵' : '📧';
    const methodName = paymentMethod === 'cash' ? 'Cash' : 'E-Transfer';
    const methodColor = paymentMethod === 'cash' ? '#f59e0b' : '#3b82f6';

    const instructionsHTML = paymentMethod === 'cash' ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">💵 Cash Payment Instructions</h3>
        <ul style="margin: 0; padding-left: 20px; color: #78350f;">
          <li style="margin-bottom: 8px;">Please bring <strong>${totalAmount.toFixed(2)}</strong> in cash when picking up your order</li>
          <li style="margin-bottom: 8px;">Payment will be collected at the time of pickup</li>
          <li style="margin-bottom: 8px;">Please have exact change if possible</li>
          <li style="margin-bottom: 8px;">We've been notified of your payment preference</li>
        </ul>
      </div>
    ` : `
      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">📧 E-Transfer Instructions</h3>
        <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
          <li style="margin-bottom: 8px;">Send e-transfer to: <strong>payments@example.com</strong></li>
          <li style="margin-bottom: 8px;">Amount: <strong>${totalAmount.toFixed(2)}</strong></li>
          <li style="margin-bottom: 8px;">Include your name and order ID(s) in the message</li>
          <li style="margin-bottom: 8px;">We&apos;ll process your order once payment is received</li>
          <li style="margin-bottom: 8px;">You&apos;ll receive a confirmation email when payment is confirmed</li>
        </ul>
      </div>
    `;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, ${methodColor} 0%, ${methodColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${methodIcon} Payment Method Confirmed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">You've selected ${methodName} payment</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #333;">Dear ${customerName},</p>
          <p style="color: #666;">Thank you for confirming your payment method. We've recorded that you&apos;ll be paying via <strong>${methodName}</strong> for ${orders.length} order${orders.length > 1 ? 's' : ''}.</p>
          
          ${instructionsHTML}

          <div style="background: #f0f8ff; border-left: 4px solid #4facfe; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333;"><strong>Payment Summary</strong></p>
            <p style="margin: 5px 0; color: #666;">Payment Method: ${methodName}</p>
            <p style="margin: 5px 0; color: #666;">Orders: ${orders.length}</p>
            <p style="margin: 5px 0; color: #333; font-size: 18px; font-weight: bold;">
              Total Amount: ${totalAmount.toFixed(2)}
            </p>
          </div>

          <h2 style="color: #333; border-bottom: 2px solid #4facfe; padding-bottom: 10px;">Order Details</h2>
          ${ordersHTML}

          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #2e7d32;">📦 Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">All your orders are now being processed</li>
              <li style="margin-bottom: 8px;">You will receive pickup notifications when ready (2-3 business days)</li>
              ${paymentMethod === 'cash' ? '<li style="margin-bottom: 8px;">Remember to bring cash for payment at pickup</li>' : '<li style="margin-bottom: 8px;">Please send your e-transfer as soon as possible</li>'}
              <li style="margin-bottom: 8px;">Keep this email for your records</li>
            </ul>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact us.
          </p>
          
          <p style="color: #666; margin-top: 20px;">Thank you for your business!</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated confirmation email.</p>
          <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
        </div>
      </div>
    `;
  }
}