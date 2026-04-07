import { SheetsManager } from './sheets.js';

export class CustomerOrderManager {
  // Get all unpaid orders for a customer
  static async getCustomerUnpaidOrders(customerEmail) {
    return SheetsManager.getCustomerUnpaidOrders(customerEmail);
  }

  static async getAllCustomersWithUnpaidOrders() {
    return SheetsManager.getAllCustomersWithUnpaidOrders();
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