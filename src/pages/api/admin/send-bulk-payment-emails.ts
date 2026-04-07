// src/pages/api/admin/send-bulk-payment-emails.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth } from '@/lib/middleware/apiAuth';
import { DatabaseManager } from '@/lib/dbManager';
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

    console.log(`📧 Processing bulk email for ${orderIds.length} orders`);

    // Get orders and group by customer
    const orders = await Promise.all(
      orderIds.map(id => DatabaseManager.getOrderByOrderId(id))
    );

    const customerOrders = new Map();
    
    orders.forEach(order => {
      if (!order || !order.user) return;
      const key = order.phone;
      if (!customerOrders.has(key)) {
        customerOrders.set(key, {
          customer: order.user,
          phone: order.phone,
          orders: []
        });
      }
      customerOrders.get(key).orders.push(order);
    });

    console.log(`📬 Sending emails to ${customerOrders.size} customer(s)`);

    // Send emails to each customer
    const results = [];
    for (const [phone, data] of customerOrders) {
      try {
        if (!data.customer?.email) {
          results.push({
            phone,
            success: false,
            error: 'No email address'
          });
          continue;
        }

        // Send email via existing endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/customer/send-portal-email`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-internal-request': 'true'
          },
          body: JSON.stringify({
            customerEmail: data.customer.email,
            customerName: data.customer.name
          })
        });

        const responseData = await response.json();

        results.push({
          phone,
          email: data.customer.email,
          success: response.ok,
          ordersCount: data.orders.length,
          error: response.ok ? null : responseData.error
        });

        console.log(`${response.ok ? '✅' : '❌'} Email ${response.ok ? 'sent to' : 'failed for'} ${data.customer.email}`);
      } catch (error) {
        results.push({
          phone,
          success: false,
          error: errorMessage(error)
        });
        console.error(`❌ Error sending email to ${phone}:`, error);
      }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Sent: ${sent} | ❌ Failed: ${failed}`);

    return res.status(200).json({
      success: true,
      sent,
      failed,
      results
    });

  } catch (error) {
    console.error('Bulk email error:', error);
    return res.status(500).json({
      error: 'Failed to send bulk emails',
      message: errorMessage(error)
    });
  }
}

export default withAPIAuth(['admin'])(handler);
