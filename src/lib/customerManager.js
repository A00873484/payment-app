import { SheetsManager } from './sheets.js';

export class CustomerManager {
  /**
   * Fetch all customers from Sheets
   * (delegates to SheetsManager for data access)
   */
  static async getAllCustomers() {
    return SheetsManager.getAllCustomers();
  }

  /**
   * Get all customers with unpaid orders
   */
  static async getAllCustomersWithUnpaidOrders() {
    return SheetsManager.getAllCustomersWithUnpaidOrders();
  }

  /**
   * Get a single customer by email
   */
  static async getCustomerByEmail(email) {
    const customers = await SheetsManager.getAllCustomers();
    return customers.find(c => c.email === email) || null;
  }

  /**
   * Get unpaid orders summary for each customer
   */
  static async getCustomerSummaries() {
    const allOrders = await SheetsManager.getAllOrders(); // or CustomerOrderManager.mockGetAllOrders()
    const customersMap = new Map();

    for (const order of allOrders) {
      const { customerEmail, customerName, total, status, orderId } = order;
      if (!customersMap.has(customerEmail)) {
        customersMap.set(customerEmail, {
          email: customerEmail,
          name: customerName,
          unpaidOrders: 0,
          totalAmount: 0,
          orders: []
        });
      }

      const customer = customersMap.get(customerEmail);
      if (status !== 'paid' && status !== 'cancelled') {
        customer.unpaidOrders += 1;
        customer.totalAmount += total;
        customer.orders.push(orderId);
      }
    }

    return Array.from(customersMap.values());
  }

  /**
   * Get all unpaid orders for a specific customer
   */
  static async getCustomerUnpaidOrders(customerEmail) {
    return SheetsManager.getCustomerUnpaidOrders(customerEmail);
  }

  /**
   * Add a new customer (if not already existing)
   */
  static async addCustomer(customerData) {
    const existing = await this.getCustomerByEmail(customerData.email);
    if (existing) {
      throw new Error(`Customer with email ${customerData.email} already exists.`);
    }

    return SheetsManager.addCustomer(customerData);
  }

  /**
   * Update a customer's info
   */
  static async updateCustomer(email, updates) {
    return SheetsManager.updateCustomer(email, updates);
  }

  /**
   * Delete a customer by email
   */
  static async deleteCustomer(email) {
    return SheetsManager.deleteCustomer(email);
  }

  /**
   * Mock data (for demos or offline mode)
   */
  static async mockGetAllCustomers() {
    return [
      {
        email: 'john@example.com',
        name: 'John Doe',
        unpaidOrders: 3,
        totalAmount: 164.95,
        orders: ['ORD-2024-001', 'ORD-2024-005', 'ORD-2024-008']
      },
      {
        email: 'jane@example.com',
        name: 'Jane Smith',
        unpaidOrders: 1,
        totalAmount: 300.0,
        orders: ['ORD-2024-002']
      }
    ];
  }
}
