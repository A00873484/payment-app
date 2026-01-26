import type { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../../lib/dbManager';
import { OrderSearchResponse, OrderSearchResult } from '@/lib/types/api';
import { ErrorResponse } from '@/lib/types/database';

/**
 * Public search endpoint - no authentication required
 * This is for the public-facing search page
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderSearchResponse | ErrorResponse>
) {
  console.log("Received public search request:", req.method, req.query);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : '';

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter" });
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
      })) as OrderSearchResult[]
    });

  } catch (err) {
    console.error("Search API Error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
