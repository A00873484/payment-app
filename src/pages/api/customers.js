import { CustomerOrderManager } from '../../lib/orderManager';
import { DatabaseManager } from "../../lib/dbManager";

// pages/api/customers.js
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        
        // Get customer's unpaid orders
        const customers = await DatabaseManager.getUnpaidOrders();
        //const customers = await CustomerOrderManager.getAllCustomersWithUnpaidOrders();
        console.log(customers);
        console.log(customers[0].orders)
        // Calculate grand total
        //const grandTotal = CustomerOrderManager.calculateGrandTotal(orders);

        res.status(200).json({
            customers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load customers' });
    }
}
