import { MasterSheetWriter } from '../../../lib/masterSheetWriter';
import { DatabaseManager } from '../../../lib/dbManager';
import { withAPIAuth } from '../../../lib/middleware/apiAuth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, action } = req.body;

    if (action === 'sync-to-master') {
      // Sync database order back to Master sheet
      if (orderId) {
        // Single order
        await MasterSheetWriter.syncOrderToMaster(orderId);
        return res.status(200).json({
          success: true,
          message: `Order ${orderId} synced to Master`,
        });
      } else {
        // All orders
        const orders = await DatabaseManager.getOrderStatistics();
        const allOrders = await prisma.order.findMany({
          select: { orderId: true }
        });
        
        let synced = 0;
        for (const order of allOrders) {
          try {
            await MasterSheetWriter.syncOrderToMaster(order.orderId);
            synced++;
          } catch (error) {
            console.error(`Failed to sync ${order.orderId}:`, error);
          }
        }
        
        return res.status(200).json({
          success: true,
          message: `Synced ${synced} orders to Master`,
          synced,
        });
      }
    } else {
      return res.status(400).json({
        error: 'Invalid action. Use: sync-to-master',
      });
    }
  } catch (error) {
    console.error('Master sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default withAPIAuth(handler);
