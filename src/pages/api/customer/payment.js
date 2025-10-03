import { CustomerAuthManager } from '../../../lib/customerAuth';
import { CustomerOrderManager } from '../../../lib/orderManager';
import { AlphaPayProcessor } from '../../../lib/alphapay';
import { EmailService } from '../../../lib/email';
import { InputValidator } from '../../../lib/validators';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const verification = await CustomerAuthManager.verifyCustomerToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { orderIds, paymentData } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array required' });
    }

    // Validate payment data
    const validationErrors = {};
    validationErrors.cardNumber = InputValidator.validateCardNumber(paymentData.cardNumber);
    validationErrors.expiry = InputValidator.validateExpiryDate(paymentData.expiry);
    validationErrors.cvv = InputValidator.validateCVV(paymentData.cvv);
    validationErrors.cardName = InputValidator.validateName(paymentData.cardName);

    Object.keys(validationErrors).forEach(key => {
      if (validationErrors[key] === null) delete validationErrors[key];
    });

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', validationErrors });
    }

    // Get customer's orders to verify they own them and calculate total
    const customerOrders = await CustomerOrderManager.getCustomerUnpaidOrders(
      verification.payload.customerEmail
    );

    // Verify all orderIds belong to this customer
    const customerOrderIds = customerOrders.map(o => o.orderId);
    const invalidOrders = orderIds.filter(id => !customerOrderIds.includes(id));
    
    if (invalidOrders.length > 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `You don't have access to orders: ${invalidOrders.join(', ')}`
      });
    }

    // Get the specific orders being paid
    const ordersToPay = customerOrders.filter(o => orderIds.includes(o.orderId));
    const grandTotal = CustomerOrderManager.calculateGrandTotal(ordersToPay);

    // Process payment for total amount
    const paymentResult = await AlphaPayProcessor.processPayment({
      ...paymentData,
      orderIds: orderIds,
      amount: grandTotal,
      currency: 'USD',
      customerEmail: verification.payload.customerEmail,
      description: `Payment for ${orderIds.length} order(s)`
    });

    // Update all orders to paid status
    const updateResults = await CustomerOrderManager.processMultiOrderPayment(
      orderIds,
      paymentResult
    );

    // Send consolidated confirmation email
    await EmailService.sendMultiOrderConfirmation(
      verification.payload.customerEmail,
      verification.payload.customerName || 'Customer',
      ordersToPay,
      paymentResult
    );

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      paymentResult: {
        paymentId: paymentResult.paymentId,
        amount: paymentResult.amount,
        ordersPaid: orderIds.length,
        processedAt: paymentResult.processedAt
      },
      orderUpdates: updateResults
    });

  } catch (error) {
    console.error('Multi-order payment error:', error);
    res.status(500).json({ error: error.message });
  }
}
