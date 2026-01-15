// src/pages/api/orders/[orderId].js - Updated to use Prisma
import { DatabaseManager } from '../../../lib/dbManager';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenValidation = await verifyToken(token);
    if (!tokenValidation.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify the token contains the correct orderId
    if (tokenValidation.payload.orderId !== orderId) {
      return res.status(403).json({ error: 'Token does not match order ID' });
    }

    // Fetch order from database
    const order = await DatabaseManager.getOrderByOrderId(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Format response to match expected structure
    const orderData = {
      orderId: order.orderId,
      customerName: order.user?.name || 'Guest',
      customerEmail: order.user?.email || '',
      items: order.orderItems.map(item => ({
        name: item.productName,
        specification: item.specification,
        price: item.priceAtPurchase,
        quantity: item.quantity,
      })),
      total: order.totalOrderAmount,
      status: order.paidStatus,
      createdAt: order.orderTime.toISOString(),
    };

    res.status(200).json(orderData);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
