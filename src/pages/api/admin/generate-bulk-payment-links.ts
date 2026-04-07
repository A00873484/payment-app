// src/pages/api/admin/generate-bulk-payment-links.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { DatabaseManager } from '@/lib/dbManager';
import { signToken } from '@/lib/jwt';
import { errorMessage } from '@/lib/utils';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({ error: 'orderIds array required' });
    }

    console.log(`🔗 Generating payment links for ${orderIds.length} orders`);

    // Get orders and group by customer
    const orders = await Promise.all(
      orderIds.map(id => DatabaseManager.getOrderByOrderId(id))
    );

    const customerLinks = new Map();
    
    orders.forEach(order => {
      if (!order) return;
      const key = `${order.phone}-${order.user?.email || 'no-email'}`;
      if (!customerLinks.has(key)) {
        customerLinks.set(key, {
          customer: order.user,
          phone: order.phone,
          orders: []
        });
      }
      customerLinks.get(key).orders.push(order);
    });

    console.log(`🔗 Generating links for ${customerLinks.size} customer(s)`);

    // Generate links for each customer
    const links = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    for (const [key, data] of customerLinks) {
      try {
        const token = await signToken({
          phone: data.phone,
          email: data.customer?.email || null,
          name: data.customer?.name || 'Customer',
          purpose: 'payment_portal'
        });

        const portalUrl = `${baseUrl}/customer/portal?token=${token}`;

        links.push({
          customer: data.customer?.name || 'Customer',
          email: data.customer?.email || 'No email',
          phone: data.phone,
          ordersCount: data.orders.length,
          portalUrl,
          token
        });

        console.log(`✅ Generated link for ${data.customer?.name || data.phone}`);
      } catch (error) {
        console.error(`❌ Failed to generate link for ${key}:`, error);
      }
    }

    console.log(`✅ Generated ${links.length} payment link(s)`);

    return res.status(200).json({
      success: true,
      count: links.length,
      links
    });

  } catch (error) {
    console.error('Bulk link generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate payment links',
      message: errorMessage(error)
    });
  }
}

export default withAPIAuth(['admin'])(handler);
