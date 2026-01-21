import { CustomerOrderManager } from '../../lib/orderManager';
import { DatabaseManager } from "../../lib/dbManager";

import type { NextApiRequest, NextApiResponse } from 'next';
import { CustomerWithOrders, ErrorResponse } from '@/lib/types/database';
import { CustomerWithOrdersResult } from '@/lib/types/api';

// pages/api/customers.js
export default async function handler(req: NextApiRequest, res: NextApiResponse<CustomerWithOrdersResult[] | ErrorResponse>) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        
        // Get customer's unpaid orders
        let customers = await DatabaseManager.getAllCustomers({ activeOrdersOnly: true });
        customers = customers.map((user: CustomerWithOrders) => ({ ...user, totalOrderAmount: user.orders.reduce((sum, order) => sum + order.totalOrderAmount, 0) }));
        //const customers = await CustomerOrderManager.getAllCustomersWithUnpaidOrders();
        console.log(customers);
        // Calculate grand total
        //const grandTotal = CustomerOrderManager.calculateGrandTotal(orders);

        res.status(200).json(
            customers
        
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load customers' });
    }
}
