// src/lib/rawSheetsSync.js - Process Raw-QJL and Raw-PT sheets
import { google } from 'googleapis';
import { DatabaseManager } from './dbManager.js';
import { MasterSheetWriter } from './masterSheetWriter.js';
import { sheet_rawqjl, sheet_rawpt } from './const.js';
import { config } from './config.js';
import credentials from './api-project.json' assert { type: 'json' };

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export class RawSheetsSync {
  /**
   * Sync Raw-QJL or Raw-PT sheets to database (replaces Apps Script SyncHandler)
   */
  static async syncRawSheetToDatabase(sheetName, startRow, endRow) {
    const syncLog = await DatabaseManager.createSyncLog({
      sheetName,
      syncType: 'RAW_SHEET_IMPORT',
    });

    let recordsAdded = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors = [];

    try {
      console.log(`📊 Syncing ${sheetName} rows ${startRow}-${endRow}...`);

      // Fetch data from Raw sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `${sheetName}!A:BZ`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error(`No data found in ${sheetName}`);
      }

      const [header, ...allDataRows] = rows;
      const colIndex = Object.fromEntries(header.map((col, i) => [col, i]));

      // Get only the rows that were edited
      const dataRows = allDataRows.slice(startRow - 2, endRow - 1);

      // Fill merged values down (replicates Apps Script behavior)
      let filledData;
      if (sheetName === 'Raw-QJL') {
        filledData = this.fillMergedValuesDown(dataRows, 0);
      } else {
        // Raw-PT has merges in columns 0 and 27
        filledData = this.fillMergedValuesDown(
          this.fillMergedValuesDown(dataRows, 0),
          27
        );
      }

      // Group by order
      const ordersMap = new Map();
      const usersMap = new Map();
      const productsMap = new Map();

      for (const row of filledData) {
        try {
          // Parse row based on sheet type
          const parsedData =
            sheetName === 'Raw-QJL'
              ? this.parseQJLRow(row, colIndex)
              : this.parsePTRow(row, colIndex);

          if (!parsedData.phone || !parsedData.product) continue;

          const { phone, orderId } = parsedData;

          // Collect user info
          if (!usersMap.has(phone)) {
            usersMap.set(phone, {
              phone,
              name: parsedData.name,
              wechatId: parsedData.nameId,
              nameEn: parsedData.englishName,
              address: parsedData.address,
              email: parsedData.email,
            });
          }

          // Collect product info
          const productKey = `${parsedData.product}|${parsedData.spec}`;
          if (!productsMap.has(productKey) && parsedData.category !== '邮寄/自提' && parsedData.category !== 'Shipping') {
            productsMap.set(productKey, {
              brand: parsedData.category,
              productName: parsedData.product,
              specification: parsedData.spec,
              category: parsedData.category,
              basePrice: parsedData.price / parsedData.qty,
            });
          }

          // Collect order info
          if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
              orderId,
              phone,
              orderTime: parsedData.orderTime,
              wordChain: parsedData.wordChain,
              remarks: parsedData.notes,
              shippingCost: parsedData.shippingCost || 0,
              totalOrderAmount: parsedData.total,
              paidStatus: '未付款',
              packingStatus: '未完成',
              shippingStatus: '未發貨',
              address: parsedData.address,
              items: [],
              shipping: null,
            });
          }

          const order = ordersMap.get(orderId);

          // Add item or shipping
          if (parsedData.category === '邮寄/自提' || parsedData.category === 'Shipping') {
            order.shipping = {
              method: parsedData.product,
              detail: parsedData.spec,
            };
          } else {
            order.items.push({
              productKey,
              brand: parsedData.category,
              productName: parsedData.product,
              specification: parsedData.spec,
              quantity: parsedData.qty,
              totalProductAmount: parsedData.price,
            });
          }
        } catch (error) {
          console.error(`Failed to parse row:`, error);
          recordsFailed++;
          errors.push(`Row parse error: ${error.message}`);
        }
      }

      console.log(`📦 Found ${ordersMap.size} orders, ${usersMap.size} users, ${productsMap.size} products`);

      // Write to database
      for (const [phone, userData] of usersMap) {
        try {
          await DatabaseManager.upsertUser(userData);
        } catch (error) {
          console.error(`Failed to upsert user ${phone}:`, error);
          errors.push(`User ${phone}: ${error.message}`);
        }
      }

      for (const [productKey, productData] of productsMap) {
        try {
          await DatabaseManager.findOrCreateProduct(productData);
        } catch (error) {
          console.error(`Failed to create product ${productKey}:`, error);
          errors.push(`Product ${productKey}: ${error.message}`);
        }
      }

      for (const [orderId, orderData] of ordersMap) {
        try {
          // Check if order exists
          const existingOrder = await DatabaseManager.getOrderByOrderId(orderId);

          if (existingOrder) {
            recordsUpdated++;
            console.log(`✏️  Order ${orderId} already exists, skipping`);
            continue;
          }

          // Get user
          const user = await DatabaseManager.getUserByPhone(orderData.phone);

          // Create order
          const newOrder = await DatabaseManager.createOrder({
            orderId: orderData.orderId,
            userId: user?.id,
            phone: orderData.phone,
            wordChain: orderData.wordChain,
            remarks: orderData.remarks,
            orderTime: orderData.orderTime,
            shippingCost: orderData.shippingCost,
            totalOrderAmount: orderData.totalOrderAmount,
            paidStatus: orderData.paidStatus,
            packingStatus: orderData.packingStatus,
            shippingStatus: orderData.shippingStatus,
            address: orderData.address,
            shipping1: orderData.shipping?.method,
            shipping2: orderData.shipping?.detail,
          });

          // Create order items
          for (const item of orderData.items) {
            const product = await DatabaseManager.findOrCreateProduct({
              brand: item.brand,
              productName: item.productName,
              specification: item.specification,
              category: item.brand,
              basePrice: item.totalProductAmount / item.quantity,
            });

            await DatabaseManager.createOrderItem({
              productId: product.id,
              orderId: newOrder.orderId,
              brand: item.brand,
              productName: item.productName,
              specification: item.specification,
              quantity: item.quantity,
              totalProductAmount: item.totalProductAmount,
            });
          }

          recordsAdded++;
          console.log(`✅ Created order ${orderId} with ${orderData.items.length} items`);

          // Sync back to Master sheet
          await MasterSheetWriter.syncOrderToMaster(orderId);
        } catch (error) {
          console.error(`Failed to process order ${orderId}:`, error);
          errors.push(`Order ${orderId}: ${error.message}`);
          recordsFailed++;
        }
      }

      // Update sync log
      await DatabaseManager.updateSyncLog(syncLog.id, {
        status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
      });

      console.log('\n📊 Sync completed!');
      console.log(`  ✅ Added: ${recordsAdded}`);
      console.log(`  ✏️  Updated: ${recordsUpdated}`);
      console.log(`  ❌ Failed: ${recordsFailed}`);

      return {
        success: true,
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        errors,
      };
    } catch (error) {
      console.error('Sync failed:', error);

      await DatabaseManager.updateSyncLog(syncLog.id, {
        status: 'FAILED',
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Parse Raw-QJL row
   */
  static parseQJLRow(row, colIndex) {
    const phone = this.sanitizePhoneNumber(row[colIndex[sheet_rawqjl.PHONE]]);
    const product = row[colIndex[sheet_rawqjl.PRODUCT_NAME]]?.trim();
    const spec = row[colIndex[sheet_rawqjl.SPECIFICATION]]?.trim();
    const category = row[colIndex[sheet_rawqjl.PRODUCT_CATEGORY]]?.trim();
    const qty = parseInt(row[colIndex[sheet_rawqjl.QUANTITY]], 10) || 0;
    const price = parseFloat(row[colIndex[sheet_rawqjl.TOTAL_PRODUCT_AMOUNT]]) || 0;
    const total = parseFloat(row[colIndex[sheet_rawqjl.ORDER_TOTAL]]) || 0;
    const orderNumber = row[colIndex[sheet_rawqjl.ORDER_NUMBER]]?.trim();
    const orderId = `QJL-${orderNumber}`;

    return {
      phone,
      product,
      spec,
      category,
      qty,
      price,
      total,
      orderId,
      orderTime: this.parseDate(row[colIndex[sheet_rawqjl.TIMESTAMP]]?.trim()),
      name: row[colIndex[sheet_rawqjl.USERNAME]]?.trim() || '',
      nameId: row[colIndex[sheet_rawqjl.WECHAT_ID]]?.trim() || '',
      englishName: row[colIndex[sheet_rawqjl.RECIPIENT_NAME_EN]]?.trim() || '',
      address: row[colIndex[sheet_rawqjl.ALT_ADDRESS]]?.trim() || '',
      email: this.extractEmail(row[colIndex[sheet_rawqjl.EMAIL]]?.trim()),
      notes: row[colIndex[sheet_rawqjl.NOTES]]?.trim() || '',
      wordChain: row[colIndex[sheet_rawqjl.SEQUENCE_NUMBER]]?.trim() || '',
      shippingCost: parseFloat(row[colIndex[sheet_rawqjl.SHIPPING_FEE]]) || 0,
    };
  }

  /**
   * Parse Raw-PT row
   */
  static parsePTRow(row, colIndex) {
    const phone = this.sanitizePhoneNumber(row[colIndex[sheet_rawpt.RECIPIENT_PHONE]]);
    const product = row[colIndex[sheet_rawpt.PRODUCT_NAME]]?.trim();
    const spec = row[colIndex[sheet_rawpt.PRODUCT_SPEC]]?.trim();
    const category = row[colIndex[sheet_rawpt.PRODUCT_CATEGORY]]?.trim();
    const qty = parseInt(row[colIndex[sheet_rawpt.PRODUCT_QUANTITY]], 10) || 0;
    const price = parseFloat(row[colIndex[sheet_rawpt.PRODUCT_TOTAL_PRICE]]) || 0;
    const total = parseFloat(row[colIndex[sheet_rawpt.ORDER_AMOUNT]]) || 0;
    const orderNumber = row[colIndex[sheet_rawpt.ORDER_ID]]?.trim();
    const orderId = `PT-${orderNumber}`;

    return {
      phone,
      product,
      spec,
      category,
      qty,
      price,
      total,
      orderId,
      orderTime: this.parseDate(row[colIndex[sheet_rawpt.ORDER_TIME]]?.trim()),
      name: row[colIndex[sheet_rawpt.CUSTOMER_NICKNAME]]?.trim() || '',
      nameId: row[colIndex[sheet_rawpt.CUSTOMER_NICKNAME]]?.trim() || '',
      englishName: row[colIndex[sheet_rawpt.RECIPIENT_NAME]]?.trim() || '',
      address: row[colIndex[sheet_rawpt.PICKUP_POINT]]?.trim() || row[colIndex[sheet_rawpt.DELIVERY_ADDRESS]]?.trim() || '',
      email: this.extractEmail(row[colIndex[sheet_rawpt.ORDER_NOTES]]?.trim()),
      notes: row[colIndex[sheet_rawpt.ORDER_NOTES]]?.trim() || '',
      wordChain: orderNumber,
      shippingCost: parseFloat(row[colIndex[sheet_rawpt.ORDER_SHIPPING_FEE]]) || 0,
    };
  }

  /**
   * Fill merged cell values down (replicates DataUtils.fillMergedValuesDown)
   */
  static fillMergedValuesDown(data, columnIndex) {
    let lastValue = null;
    return data.map((row) => {
      const newRow = [...row];
      if (newRow[columnIndex]) {
        lastValue = newRow[columnIndex];
      } else if (lastValue) {
        newRow[columnIndex] = lastValue;
      }
      return newRow;
    });
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhoneNumber(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d]/g, '').slice(-10);
  }

  /**
   * Extract email from string
   */
  static extractEmail(str) {
    if (!str) return null;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const match = str.match(emailRegex);
    return match ? match[1] : null;
  }

  /**
   * Parse date string
   */
  static parseDate(dateStr) {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }
}

export default RawSheetsSync;
