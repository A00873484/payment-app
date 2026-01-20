import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/dbManager';
import type { User, Order, OrderItem } from '@prisma/client';

export interface SearchResult extends Order {
  name: User['wechatId'] | '';
  orderId: string;
  orderItems: OrderItem[];
  endPhone: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse | ErrorResponse>
) {
  console.log("Received search request:", req.method, req.query);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : '';

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const matches = await DatabaseManager.getOrdersByName(query);
    
    return res.status(200).json({ 
      results: matches.map(order => ({
        id: order.id,
        orderId: order.wordChain || order.orderId,
        name: order.user?.wechatId || '',
        endPhone: order.phone.slice(-2),
        orderItems: order.orderItems,
        totalOrderAmount: order.totalOrderAmount,
        orderTime: order.orderTime,
        paidStatus: order.paidStatus,
        packingStatus: order.packingStatus,
        shippingStatus: order.shippingStatus,
      })) as SearchResult[]
    });

  } catch (err) {
    console.error("Search API Error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
