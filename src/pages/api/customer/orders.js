// src/pages/api/customer/orders.js - Updated to use Prisma
import { DatabaseManager } from '../../../lib/dbManager';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { phone, email } = tokenValidation.payload;

    // Get unpaid orders from database
    const orders = await DatabaseManager.getAllOrders({ activeOrdersOnly: true }, phone, email);

    // Calculate totals
    const totalAmount = orders.reduce((sum, order) => sum + order.totalOrderAmount, 0);

    // Format response
    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      items: order.orderItems.map(item => ({
        name: item.productName,
        specification: item.specification,
        quantity: item.quantity,
        price: item.priceAtPurchase,
        total: item.totalProductAmount,
      })),
      total: order.totalOrderAmount,
      status: order.paidStatus,
      shippingStatus: order.shippingStatus,
      packingStatus: order.packingStatus,
      createdAt: order.orderTime,
      address: order.address,
    }));

    res.status(200).json({
      customerName: orders[0]?.user?.name || 'Guest',
      customerPhone: phone,
      customerEmail: email,
      total: totalAmount,
      unpaidOrders: formattedOrders.length,
      orders: formattedOrders,
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
