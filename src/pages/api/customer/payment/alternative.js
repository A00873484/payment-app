// ===========================
// New API Endpoint: src/pages/api/customer/payment/alternative.js
// ===========================
import { CustomerAuthManager } from '../../../../lib/customerAuth';
import { CustomerOrderManager } from '../../../../lib/orderManager';
import { SheetsManager } from '../../../../lib/sheets';
import { EmailService } from '../../../../lib/email';

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

    const { orderIds, paymentMethod } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array required' });
    }

    if (!['cash', 'etransfer'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Get customer's orders to verify ownership
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

    // Update payment status in Google Sheets (付款情況 column)
    // Payment status mapping:
    // cash = "現金" (Cash)
    // etransfer = "轉賬" (E-Transfer)
    //const paymentStatusChinese = paymentMethod === 'cash' ? '現金' : '轉賬';
    
    const updateResults = [];
    for (const orderId of orderIds) {
      try {
        const result = await SheetsManager.updatePaymentStatus(
          orderId,
          paymentMethod
        );
        updateResults.push({ orderId, success: true, result });
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
        updateResults.push({ orderId, success: false, error: error.message });
      }
    }

    // Send confirmation email
    await EmailService.sendAlternativePaymentConfirmation(
      verification.payload.customerEmail,
      verification.payload.customerName || 'Customer',
      ordersToPay,
      paymentMethod,
      grandTotal
    );

    res.status(200).json({
      success: true,
      message: 'Payment method confirmed',
      result: {
        paymentMethod: paymentMethod,
        ordersPaid: orderIds.length,
        amount: grandTotal,
        confirmedAt: new Date().toISOString()
      },
      orderUpdates: updateResults
    });

  } catch (error) {
    console.error('Alternative payment error:', error);
    res.status(500).json({ error: error.message });
  }
}