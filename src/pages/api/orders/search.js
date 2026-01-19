import { DatabaseManager } from "../../../lib/dbManager";

export default async function handler(req, res) {
  console.log("Received search request:", req.method, req.query);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = req.query.query?.trim().toLowerCase();

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const matches = await DatabaseManager.getOrdersByName(query);
    
    return res.status(200).json({ results: matches.map(order => ({
        id: order.id,
        orderId: order.wordChain,
        name: order.user.wechatId,
        endPhone: order.phone.slice(-2),
        orderItems: order.orderItems,
        totalOrderAmount: order.totalOrderAmount,
        orderTime: order.orderTime,
        paidStatus: order.paidStatus,
        packingStatus: order.packingStatus,
        shippingStatus: order.shippingStatus,
      })) 
    });

  } catch (err) {
    console.error("Search API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
