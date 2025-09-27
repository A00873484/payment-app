import nodemailer from 'nodemailer';
import { config } from './config.js';

export class EmailService {

  static async sendEmail(to, subject, htmlContent) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // smtpout.secureserver.net
        port: process.env.EMAIL_PORT, // 465
        secure: true, // true for 465, false for 587
        auth: {
          user: process.env.EMAIL_USER, // orders@ovosky.com
          pass: process.env.EMAIL_PASS  // your email password
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        //replyTo: "orders@ovosky.com",
        to,
        subject,
        html: htmlContent
      };

      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    }
    catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  static async sendConfirmationEmail(orderData, paymentResult) {
    return this.sendEmail(
      orderData.customerEmail,
      `Payment Confirmed - Order #${orderData.orderId}`,
      this.generateConfirmationHTML(orderData, paymentResult)
    );
  }

  static generateConfirmationHTML(orderData, paymentResult) {
    const itemsHTML = orderData.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          $${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4facfe;">✅ Payment Confirmed!</h1>
        <p>Dear ${orderData.customerName},</p>
        <p>Thank you for your payment. Your order has been confirmed and is being processed.</p>
        
        <h3>Order Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHTML}
          <tr style="font-weight: bold; background: #f8f9fa;">
            <td style="padding: 15px;">Total</td>
            <td style="padding: 15px; text-align: right;">$${orderData.total.toFixed(2)}</td>
          </tr>
        </table>
        
        <h3>Payment Information:</h3>
        <ul>
          <li><strong>Payment ID:</strong> ${paymentResult.paymentId}</li>
          <li><strong>Order ID:</strong> ${orderData.orderId}</li>
          <li><strong>Amount:</strong> $${paymentResult.amount.toFixed(2)}</li>
        </ul>
        
        <p><strong>📦 Next Steps:</strong><br>
        Your order will be ready for pickup in 2-3 business days. We will send you a notification when it's ready.</p>
        
        <p>Thank you for your business!</p>
      </div>
    `;
  }
}
