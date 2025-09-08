import { AlphaPayProcessor } from '../../../lib/alphapay';
import { SheetsManager } from '../../../lib/sheets';
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

    // Update order status
    await SheetsManager.updateOrderStatus(
      paymentData.orderId,
      'paid',
      paymentResult.paymentId
    );

    // Get order details for email
    const orderData = await SheetsManager.fetchOrderDetails(paymentData.orderId);

    // Send confirmation email
    await EmailService.sendConfirmationEmail(orderData, paymentResult);

    res.status(200).json({ success: true, paymentResult });

  } catch (error) {
    console.error('Payment API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
