import { CustomerAuthManager } from '../../../lib/customerAuth';
import { CustomerOrderManager } from '../../../lib/orderManager';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token required',
        message: 'Please provide a valid customer portal token'
      });
    }

    // Verify token
    const verification = await CustomerAuthManager.verifyCustomerToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: verification.error
      });
    }

    // Get customer's unpaid orders
    const orders = await CustomerOrderManager.getCustomerUnpaidOrders(
      verification.payload.customerEmail
    );

    // Calculate grand total
    const grandTotal = CustomerOrderManager.calculateGrandTotal(orders);

    res.status(200).json({
      success: true,
      customer: {
        email: verification.payload.customerEmail,
        name: verification.payload.customerName
      },
      orders: orders,
      summary: {
        totalOrders: orders.length,
        grandTotal: grandTotal
      }
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: error.message });
  }
}