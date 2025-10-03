import { SheetsManager } from './sheets.js';

export class CustomerOrderManager {
  // Get all unpaid orders for a customer
  static async getCustomerUnpaidOrders(customerEmail) {
    return SheetsManager.getCustomerUnpaidOrders(customerEmail);
  }

  // Mock data for demonstration
  static async mockGetAllOrders() {
    return [
      {
        orderId: 'ORD-2024-001',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
          { name: 'Premium Widget', price: 29.99, quantity: 2 },
          { name: 'Express Shipping', price: 9.99, quantity: 1 }
        ],
        total: 69.97,
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Rush order'
      },
      {
        orderId: 'ORD-2024-005',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
          { name: 'Basic Plan', price: 19.99, quantity: 1 },
          { name: 'Setup Fee', price: 25.00, quantity: 1 }
        ],
        total: 44.99,
        status: 'pending',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: ''
      },
      {
        orderId: 'ORD-2024-008',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
          { name: 'Monthly Subscription', price: 49.99, quantity: 1 }
        ],
        total: 49.99,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: 'Recurring payment'
      },
      {
        orderId: 'ORD-2024-002',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        items: [
          { name: 'Consulting Service', price: 150.00, quantity: 2 }
        ],
        total: 300.00,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: ''
      }
    ];
  }

  // Calculate grand total for multiple orders
  static calculateGrandTotal(orders) {
    return orders.reduce((total, order) => total + order.total, 0);
  }

  // Process payment for multiple orders
  static async processMultiOrderPayment(orderIds, paymentResult) {
    const results = [];
    
    for (const orderId of orderIds) {
      try {
        const result = await SheetsManager.updateOrderStatus(
          orderId,
          'paid',
          paymentResult.paymentId
        );
        results.push({ orderId, success: true, result });
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
        results.push({ orderId, success: false, error: error.message });
      }
    }
    
    return results;
  }
}