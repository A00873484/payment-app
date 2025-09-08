import { google } from 'googleapis';
import { config } from './config.js';

const sheets = google.sheets('v4');

export class SheetsManager {
  static async fetchOrderDetails(orderId) {
    try {
      // For demo purposes, return mock data
      // In production, replace with actual Google Sheets API call
      const mockOrderData = {
        orderId: orderId,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
          { name: 'Premium Widget', price: 29.99, quantity: 2 },
          { name: 'Express Shipping', price: 9.99, quantity: 1 }
        ],
        total: 69.97,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return mockOrderData;

      // Production implementation:
      /*
      const response = await sheets.spreadsheets.values.get({
        auth: config.googleSheets.apiKey,
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: 'Orders!A:H',
      });

      const rows = response.data.values;
      const orderRow = rows.find(row => row[0] === orderId);
      
      if (!orderRow) {
        throw new Error('Order not found');
      }

      return {
        orderId: orderRow[0],
        customerName: orderRow[1],
        customerEmail: orderRow[2],
        items: JSON.parse(orderRow[3]),
        total: parseFloat(orderRow[4]),
        status: orderRow[5],
        createdAt: orderRow[6]
      };
      */
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      throw new Error('Unable to retrieve order information');
    }
  }

  static async updateOrderStatus(orderId, status, paymentId = null) {
    try {
      console.log(`Updating order ${orderId} status to: ${status}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        orderId,
        status,
        paymentId,
        updatedAt: new Date().toISOString()
      };

      // Production implementation:
      /*
      await sheets.spreadsheets.values.update({
        auth: config.googleSheets.apiKey,
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `Orders!F${orderRowIndex}:G${orderRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[status, paymentId || '']]
        }
      });
      */
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }
}
