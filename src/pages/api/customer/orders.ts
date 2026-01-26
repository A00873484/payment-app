// src/pages/api/customer/orders.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/dbManager';
import { verifyToken } from '../../../lib/jwt';
import type { OrderWithItems } from '../../../lib/types/database';
import { errorMessage } from '@/lib/utils';

interface OrderItem {
  name: string;
  specification: string | null;
  quantity: number;
  price: number;
  total: number;
}

interface FormattedOrder {
  orderId: string;
  items: OrderItem[];
  total: number;
  status: string;
  shippingStatus: string;
  packingStatus: string;
  createdAt: Date;
  address: string | null;
}

interface CustomerOrdersResponse {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
  unpaidOrders: number;
  orders: FormattedOrder[];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CustomerOrdersResponse | ErrorResponse>
) {
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

    const phone = tokenValidation.payload?.phone;
    const email = tokenValidation.payload?.email;

    if (!phone && !email) {
      return res.status(400).json({ error: 'Phone or email required in token' });
    }

    // Get unpaid orders from database
    const orders: OrderWithItems[] = await DatabaseManager.getAllOrders(
      { activeOrdersOnly: true }, 
      phone, 
      email
    );

    // Calculate totals
    const totalAmount = orders.reduce((sum, order) => sum + order.totalOrderAmount, 0);

    // Format response
    const formattedOrders: FormattedOrder[] = orders.map(order => ({
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
      customerPhone: phone || '',
      customerEmail: email || '',
      total: totalAmount,
      unpaidOrders: formattedOrders.length,
      orders: formattedOrders,
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: errorMessage(error) 
    });
  }
}
