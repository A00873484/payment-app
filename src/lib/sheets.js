// ===========================
// Updated src/lib/sheets.js - Add updatePaymentStatus method
// ===========================
// Add this method to your existing SheetsManager class:
import { google } from 'googleapis';
import { sheet_master, sheet_user } from './const.js';
import { config } from './config.js';

import credentials from "./api-project.json" assert { type: "json" };

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: 'v4', auth });

export class SheetsManager {
  
  constructor() {}

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

      const {dataRows, colIndex} = await this.getSheetsData('Master!A:Z');

      const rowIndex = dataRows.findIndex(row => row[colIndex[sheet_master.ORDER_ID]]?.trim() === orderId);

      if (rowIndex === -1) {
        throw new Error('Order not found');
      }

      const updateRange = `Master!P${rowIndex + 2}`;
      let result = await sheets.spreadsheets.values.update({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[paymentStatus]]
        }
      });
      if (result.status === 200 && result.data.updatedCells > 0) {
        console.log(`✅ Successfully updated ${result.data.updatedCells} cell(s) in ${result.data.updatedRange}`);
      } else {
        console.warn(`⚠️ Update may not have succeeded:`, result.data);
      }
      
      return {
        orderId,
        paymentStatus,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  static getSheetsData = async (range) => {
    const response = await sheets.spreadsheets.values.get({
      //auth: config.googleSheets.apiKey,
      spreadsheetId: config.googleSheets.spreadsheetId,
      range, // widen range to cover all Master columns
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
    return { dataRows, colIndex  };
  }

  static async getCustomerUnpaidOrders(customerEmail, customerPhone) {
      try {
        if(!customerEmail && !customerPhone) {
          throw new Error('Email or phone required to fetch orders');
        } else if (!customerEmail || !customerPhone) {
          const {dataRows, colIndex} = await this.getSheetsData('Users!A:K');
          const userRow = dataRows.find(row => (customerEmail && row[colIndex[sheet_user.EMAIL]]?.trim().toLowerCase() === customerEmail.toLowerCase()) || (customerPhone && row[colIndex[sheet_user.PHONE]]?.trim() === customerPhone));
          if (userRow) {
            customerEmail = userRow[colIndex[sheet_user.EMAIL]]?.trim();
            customerPhone = userRow[colIndex[sheet_user.PHONE]]?.trim();
          } else {
            throw new Error('User not found with provided email or phone');
          }
        }
        const {dataRows, colIndex} = await this.getSheetsData('Master!A:Z');
      
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
              const customerVerified = (customerEmail && customerEmail.toLowerCase() === row[colIndex[sheet_master.EMAIL]]?.trim()) || (customerPhone && row[colIndex[sheet_master.PHONE]]?.trim() === customerPhone);

              const paidStatus = row[colIndex[sheet_master.PAID_STATUS]]?.trim() || 'none';
              const packingStatus = row[colIndex[sheet_master.PACKING_STATUS]]?.trim() || 'none';
              const shipStatus = row[colIndex[sheet_master.SHIPPING_STATUS]]?.trim() || 'none';
              
              // Only process if paidStatus matches criteria
              const invalidPaidStatuses = ['弃单', '已付款', 'cash', 'etransfer'];
              const invalidShipStatuses = ['已發貨', 'Cancelled', 'Canceled'];
              const invalidPackingStatuses = ['未完成那箱', 'none', '已取消'];

              if (
                !customerVerified ||
                invalidPaidStatuses.includes(paidStatus) ||
                invalidShipStatuses.includes(shipStatus) ||
                invalidPackingStatuses.includes(packingStatus)
              ) {
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

    static async getAllCustomersWithUnpaidOrders() {
       try {
        const {dataRows, colIndex} = await this.getSheetsData('Master!A:Z');

        const ordersMap = new Map();
        const customersMap = new Map();

        function addOrderToUser(order) {
          const { customerEmail, phoneNumber, customerName, total, orderId } = order;
          const customerId = customerEmail || phoneNumber;
          if (!customersMap.has(customerId)) {
            customersMap.set(customerId, {
              email: customerEmail,
              phone: phoneNumber,
              name: customerName,
              unpaidOrders: 0,
              totalAmount: 0,
              orders: []
            });
          }

          const customer = customersMap.get(customerId);
          customer.unpaidOrders += 1;
          customer.totalAmount += total;
          customer.orders.push(orderId);
        }

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
              const invalidPaidStatuses = ['弃单', '已付款', 'cash', 'etransfer'];
              const invalidShipStatuses = ['已發貨', 'Cancelled', 'Canceled'];
              const invalidPackingStatuses = ['未完成那箱', 'none', '已取消'];

              if (
                invalidPaidStatuses.includes(paidStatus) ||
                invalidShipStatuses.includes(shipStatus) ||
                invalidPackingStatuses.includes(packingStatus)
              ) {
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
            addOrderToUser(currentOrder);
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
        return Array.from(customersMap.values());

      } catch (error) {
        console.error('Failed to fetch customer orders:', error);
        throw new Error('Unable to retrieve customer orders');
      }
    }
}