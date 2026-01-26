// src/pages/api/orders/[orderId].js - Updated to use Prisma
import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/dbManager';
import { verifyToken } from '../../../lib/jwt';
import { ErrorResponse, OrderWithItems } from '@/lib/types/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse<OrderWithItems | ErrorResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if(!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing orderId parameter' });
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenValidation = await verifyToken(token);
    if (!tokenValidation.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify the token contains the correct orderId
    if (tokenValidation?.payload?.orderId !== orderId) {
      return res.status(403).json({ error: 'Token does not match order ID' });
    }

    // Fetch order from database
    const order = await DatabaseManager.getOrderByOrderId(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
