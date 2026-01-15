// src/pages/api/payment/process.js - Updated to use Prisma
import { AlphaPayProcessor } from '../../../lib/alphapay';
import { DatabaseManager } from '../../../lib/dbManager';
import { EmailService } from '../../../lib/email';
import { verifyToken } from '../../../lib/jwt';
import { InputValidator } from '../../../lib/validators';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenValidation = await verifyToken(token);
    if (!tokenValidation.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { paymentData } = req.body;

    // Validate payment data
    const validationErrors = {};
    validationErrors.email = InputValidator.validateEmail(paymentData.email);
    validationErrors.cardNumber = InputValidator.validateCardNumber(paymentData.cardNumber);
    validationErrors.expiry = InputValidator.validateExpiryDate(paymentData.expiry);
    validationErrors.cvv = InputValidator.validateCVV(paymentData.cvv);
    validationErrors.cardName = InputValidator.validateName(paymentData.cardName);

    // Remove null errors
    Object.keys(validationErrors).forEach(key => {
      if (validationErrors[key] === null) delete validationErrors[key];
    });

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', validationErrors });
    }

    // Process payment
    const paymentResult = await AlphaPayProcessor.processPayment(paymentData);

    // Update order status in database
    await DatabaseManager.updateOrderStatus(
      paymentData.orderId,
      '已付款',
      paymentResult.paymentId
    );

    // Mark payment link as used
    await DatabaseManager.markPaymentLinkUsed(token);

    // Get order details for email
    const order = await DatabaseManager.getOrderByOrderId(paymentData.orderId);

    // Format order data for email
    const orderData = {
      orderId: order.orderId,
      customerName: order.user?.name || 'Guest',
      customerEmail: order.user?.email || paymentData.email,
      items: order.orderItems.map(item => ({
        name: item.productName,
        specification: item.specification,
        price: item.priceAtPurchase,
        quantity: item.quantity,
      })),
      total: order.totalOrderAmount,
    };

    // Send confirmation email
    await EmailService.sendConfirmationEmail(orderData, paymentResult);

    res.status(200).json({ success: true, paymentResult });

  } catch (error) {
    console.error('Payment API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
