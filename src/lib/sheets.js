// ===========================
// Updated src/lib/sheets.js - Add updatePaymentStatus method
// ===========================
// Add this method to your existing SheetsManager class:
import { google } from 'googleapis';
import { sheet_master } from './const.js';
import { config } from './config.js';
import { oauth2Client } from './googleAuth.js';

/*oauth2Client.setCredentials({
  access_token: req.body.accessToken,
  refresh_token: req.body.refreshToken,
});*/

const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

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

      
      const response = await sheets.spreadsheets.values.get({
        auth: config.googleSheets.apiKey,
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: 'Master!A:V',
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
      
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      throw new Error('Unable to retrieve order information');
    }
  }

  static async fetchUserOrdersDetails(userPhone) {
    try {
      const response = await sheets.spreadsheets.values.get({
        auth: config.googleSheets.apiKey,
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: 'Master!A:V',
      });

      const rows = response.data.values;
      const orderRows = rows.filter(row => row[0] === userPhone && row[14] !== '已發貨' && row[14] !== 'Cancelled' && row[15] !== '' && row[15] !== '未完成那箱' && row[15] !== '已取消');
      
      if (!orderRows || orderRows.length === 0) {
        throw new Error('User not found');
      }

      return {"total": orderRows.reduce((total, orderTotal) => total + orderTotal), customerName: orderRows[0][17], customerPhone: orderRows[0][0], "orders":[...orderRows].map(orderRow => ({
        orderId: orderRow[21],
        items: JSON.parse(orderRow[8]),
        total: parseFloat(orderRow[13]),
        status: orderRow[14],
        createdAt: orderRow[6]
      }))};
      
    } catch (error) {
      console.error('Failed to fetch user order details:', error);
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

  static async updatePaymentStatus(orderId, paymentStatus) {
    try {
      console.log(`Updating order ${orderId} payment status (付款情況) to: ${paymentStatus}`);
      
      // Simulate Google Sheets update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        orderId,
        paymentStatus,
        updatedAt: new Date().toISOString()
      };

      /* Production implementation with Google Sheets API:
      
      // First, find the row number for this orderId
      const response = await sheets.spreadsheets.values.get({
        auth: config.googleSheets.apiKey,
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: 'Orders!A:A', // Column A contains order IDs
      });

      const rows = response.data.values;
      const rowIndex = rows.findIndex(row => row[0] === orderId);
      
      if (rowIndex === -1) {
        throw new Error('Order not found');
      }

      // Update the 付款情況 column (assuming it's column F)
      // Adjust the column letter based on your actual sheet structure
      const columnLetter = 'F'; // Change this to match your sheet
      const updateRange = `Orders!${columnLetter}${rowIndex + 1}`;
      
      await sheets.spreadsheets.values.update({
        auth: config.googleSheets.apiKey,
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[paymentStatus]]
        }
      });

      return {
        orderId,
        paymentStatus,
        updatedAt: new Date().toISOString()
      };
      */
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  static async getCustomerUnpaidOrders(customerEmail) {
      try {
        // In production, this would query your Google Sheets or database
        // Filtering by customer email and status
        
        // Mock implementation - replace with actual Google Sheets query
        /*const allOrders = await this.mockGetAllOrders();
        
        return allOrders.filter(order => 
          order.customerEmail.toLowerCase() === customerEmail.toLowerCase() &&
          (order.status === 'pending' || order.status === 'unpaid') &&
          order.status !== 'cancelled'
        );*/
        
        // Production implementation with Google Sheets:
  
        // Fetch from Master sheet instead of Orders
        const response = await sheets.spreadsheets.values.get({
          //auth: config.googleSheets.apiKey,
          spreadsheetId: config.googleSheets.spreadsheetId,
          range: 'Master!A:Z', // widen range to cover all Master columns
        });
  
        const rows = response.data.values;
  
        // First row in Master sheet is the header row
        const header = rows[0];
        const dataRows = rows.slice(1);
  
        // Build a lookup: column name (Chinese) -> index
        const colIndex = Object.fromEntries(
          header.map((colName, i) => [colName, i])
        );
        dataRows.reduce((acc, row) => { 
          acc[row[0]] = row; 
          return acc; 
        }, {});
      
        const ordersMap = new Map();
        let skip = false;

        dataRows.forEach(row => {
          // Get order ID - this identifies the start of a new order
          const orderId = row[colIndex[sheet_master.ORDER_ID]]?.trim();
          
          // Skip empty rows
          if (!orderId && !row.some(cell => cell)) {
            return;
          }

          // If this row has an order ID, it's either a new order or continuation
          if (orderId) {
            skip = false;
            // Check if this order already exists
            if (!ordersMap.has(orderId)) {
              // New order - create it
              const paidStatus = row[colIndex[sheet_master.PAID_STATUS]]?.trim() || 'none';
              const packingStatus = row[colIndex[sheet_master.PACKING_STATUS]]?.trim() || 'none';
              const shipStatus = row[colIndex[sheet_master.SHIPPING_STATUS]]?.trim() || 'none';
              
              // Only process if paidStatus matches criteria
              if (paidStatus === '弃单' || paidStatus === '已付款' || shipStatus === '已發貨' || shipStatus === 'Cancelled' || shipStatus === 'Canceled' || packingStatus === '未完成那箱' || packingStatus === 'none' || packingStatus === '已取消') {
                skip = true;
                return;
              }
              ordersMap.set(orderId, {
                orderId: orderId,
                customerName: row[colIndex[sheet_master.NAME]]?.trim() || '',
                customerEmail: row[colIndex[sheet_master.EMAIL]]?.trim() || '',
                phoneNumber: row[colIndex[sheet_master.PHONE]]?.trim() || '',
                items: [],
                total: parseFloat(row[colIndex[sheet_master.TOTAL_ORDER_AMOUNT]]) || 0,
                paidStatus: paidStatus,
                shipStatus: shipStatus,
                packingStatus: packingStatus,
                createdAt: row[colIndex[sheet_master.ORDER_TIME]]?.trim() || '',
                notes: row[colIndex[sheet_master.REMARKS]]?.trim() || '',
                shippingMethod: row[colIndex[sheet_master.SHIPPING_METHOD]]?.trim() || '',
                address: row[colIndex[sheet_master.ADDRESS]]?.trim() || ''
              });
              
            }
          }

          if (skip) {
            return;
          }

          // Get the current order (either from the orderId in this row, or the last order we processed)
          let currentOrder = null;
          
          if (orderId) {
            currentOrder = ordersMap.get(orderId);
          } else {
            // This is a continuation row (no orderId), get the last order
            const orders = Array.from(ordersMap.values());
            currentOrder = orders[orders.length - 1];
          }

          // If we have a current order, add the item
          if (currentOrder) {
            const category = row[colIndex[sheet_master.CATEGORY]]?.trim();
            const productName = row[colIndex[sheet_master.PRODUCT_NAME]]?.trim();
            const spec = row[colIndex[sheet_master.SPECIFICATIONS]]?.trim();
            const quantity = parseInt(row[colIndex[sheet_master.QUANTITY]], 10) || 0;
            const price = parseFloat(row[colIndex[sheet_master.PRICE]]) || 0;

            // Only add item if it has valid data
            if ((category || productName) && category !== 'Shipping') {
              currentOrder.items.push({
                category: category || '',
                productName: productName || '',
                spec: spec || '',
                quantity: quantity,
                price: price,
                name: `${productName}${spec ? ` (${spec})` : ''}` // Combined display name
              });
            }
          }
        });

        // Convert map to array and return
        return Array.from(ordersMap.values());
  
      } catch (error) {
        console.error('Failed to fetch customer orders:', error);
        throw new Error('Unable to retrieve customer orders');
      }
    }
}