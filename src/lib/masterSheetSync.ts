// src/lib/masterSheetSync.js - Handle Master sheet operations
import { google } from 'googleapis';
import { DatabaseManager } from './dbManager';
import { sheet_master } from './const';
import { config } from './config';
import { errorMessage } from './utils';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export class MasterSheetSync {
  
  // ==================== SEEDING DATABASE FROM MASTER ====================
  
  /**
   * Sync ALL data from Master sheet to database (for initial seeding)
   * Use this to populate database from existing Master sheet data
   * 
   * This is the PRIMARY seeding method - replaces syncService.js
   */
  static async syncAllMaster() {
    const syncLog = await DatabaseManager.createSyncLog({
      sheetName: 'Master',
      syncType: 'FULL_MASTER_TO_DB',
    });

    let recordsAdded = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors = [];

    try {
      console.log('📊 Starting full Master sheet sync to database...\n');

      // Fetch all Master sheet data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: 'Master!A:Z',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No data found in Master sheet');
      }

      const [header, ...dataRows] = rows;
      const colIndex = Object.fromEntries(header.map((col, i) => [col, i]));

      console.log(`📦 Found ${dataRows.length} rows in Master sheet`);

      // Fill merged values down (Master has merged cells for orders)
      const filledData = this.fillMergedValuesDown(
        this.fillMergedValuesDown(
          this.fillMergedValuesDown(dataRows, 0), // Phone
          6  // Order Time
        ),
        13 // Shipping Cost
      );

      // Group rows by orderId
      const ordersMap = new Map();
      const usersMap = new Map();
      const productsMap = new Map();

      // Parse all rows
      let currentOrderId = null; // Track current order for continuation rows
      
      for (let i = 0; i < filledData.length; i++) {
        const row = filledData[i];

        try {
          // Parse row data
          const parsedData = this.parseMasterRow(row, colIndex);
          // Check if this row has an orderId (start of new order or continuation)
          const rowOrderId = parsedData.orderId;
          
          // If row has orderId, it's a new order
          if (rowOrderId) {
            currentOrderId = rowOrderId;
            
            const { phone } = parsedData;

            // Skip if no phone
            if (!phone) {
              console.log(`⏭️  Skipping row ${i + 2}: Missing phone`);
              currentOrderId = null;
              continue;
            }

            // Collect user info
            if (!usersMap.has(phone)) {
              usersMap.set(phone, {
                phone,
                name: parsedData.name,
                wechatId: parsedData.wechatId,
                nameEn: parsedData.nameEn,
                address: parsedData.address,
                email: parsedData.email,
              });
            }

            // Update user address/email if newer data available
            if (parsedData.address || parsedData.email) {
              const user = usersMap.get(phone);
              if (parsedData.address) user.address = parsedData.address;
              if (parsedData.email) user.email = parsedData.email;
            }

            // Collect order info (only if new order)
            if (!ordersMap.has(currentOrderId)) {
              ordersMap.set(currentOrderId, {
                orderId: currentOrderId,
                phone,
                orderTime: parsedData.orderTime,
                wordChain: parsedData.wordChain,
                paymentStatus: parsedData.paymentStatus,
                remarks: parsedData.remarks,
                shippingCost: parsedData.shippingCost,
                totalOrderAmount: parsedData.totalOrderAmount,
                paidStatus: parsedData.paidStatus,
                packingStatus: parsedData.packingStatus,
                shippingStatus: parsedData.shippingStatus,
                address: parsedData.address,
                fulfillable: parsedData.fulfillable,
                items: [],
              });
            }
          }

          // Add item to current order (whether new row or continuation)
          if (currentOrderId) {
            const order = ordersMap.get(currentOrderId);
            const category = parsedData.category;
            const productName = parsedData.productName;

            // Collect product info (skip shipping items)
            if (productName && category && category !== 'Shipping') {
              const productKey = `${productName}|${parsedData.specification || ''}`;
              if (!productsMap.has(productKey)) {
                productsMap.set(productKey, {
                  brand: category,
                  productName: productName,
                  specification: parsedData.specification,
                  category: category,
                  basePrice: parsedData.quantity > 0 
                    ? parsedData.price / parsedData.quantity 
                    : 0,
                });
              }
            }

            // Add item or note shipping info
            if (category === 'Shipping') {
              order.shipping1 = productName;
              order.shipping2 = parsedData.specification;
            } else if (productName && parsedData.quantity > 0) {
              order.items.push({
                brand: category,
                productName: productName,
                specification: parsedData.specification,
                quantity: parsedData.quantity,
                totalProductAmount: parsedData.price,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to parse row ${i + 2}:`, error);
          recordsFailed++;
          
          errors.push(`Row ${i + 2}: ${errorMessage(error)}`);
        }
      }

      console.log(`\n📊 Parsed:`);
      console.log(`  👥 ${usersMap.size} users`);
      console.log(`  📦 ${productsMap.size} products`);
      console.log(`  🛒 ${ordersMap.size} orders\n`);

      // Write to database
      console.log('💾 Writing to database...\n');

      // 1. Create/update users
      for (const [phone, userData] of usersMap) {
        try {
          await DatabaseManager.upsertUser(userData);
        } catch (error) {
          console.error(`Failed to upsert user ${phone}:`, error);
          errors.push(`User ${phone}: ${errorMessage(error)}`);
        }
      }
      console.log(`✅ Processed ${usersMap.size} users`);

      // 2. Create/update products
      for (const [productKey, productData] of productsMap) {
        try {
          await DatabaseManager.findOrCreateProduct(productData);
        } catch (error) {
          console.error(`Failed to create product ${productKey}:`, error);
          errors.push(`Product ${productKey}: ${errorMessage(error)}`);
        }
      }
      console.log(`✅ Processed ${productsMap.size} products`);

      // 3. Create/update orders with items
      for (const [orderId, orderData] of ordersMap) {
        try {
          // Check if order exists
          const existingOrder = await DatabaseManager.getOrderByOrderId(orderId);

          if (existingOrder) {
            // Update existing order (status fields only)
            await DatabaseManager.updateOrder(orderId, {
              paidStatus: orderData.paidStatus,
              packingStatus: orderData.packingStatus,
              shippingStatus: orderData.shippingStatus,
              paymentStatus: orderData.paymentStatus,
              remarks: orderData.remarks,
              fulfillable: orderData.fulfillable,
            });
            recordsUpdated++;
            console.log(`  ✏️  Updated order ${orderId}`);
          } else {
            // Get user
            const user = await DatabaseManager.getUserByPhone(orderData.phone);

            // Create order
            const newOrder = await DatabaseManager.createOrder({
              orderId: orderData.orderId,
              userId: user?.id,
              phone: orderData.phone,
              wordChain: orderData.wordChain,
              paymentStatus: orderData.paymentStatus,
              remarks: orderData.remarks,
              orderTime: orderData.orderTime,
              shippingCost: orderData.shippingCost,
              totalOrderAmount: orderData.totalOrderAmount,
              paidStatus: orderData.paidStatus,
              packingStatus: orderData.packingStatus,
              shippingStatus: orderData.shippingStatus,
              address: orderData.address,
              shipping1: orderData.shipping1,
              shipping2: orderData.shipping2,
              fulfillable: orderData.fulfillable,
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
            console.log(`  ✅ Created order ${orderId} with ${orderData.items.length} items`);
          }
        } catch (error) {
          console.error(`Failed to process order ${orderId}:`, error);
          errors.push(`Order ${orderId}: ${errorMessage(error)}`);
          recordsFailed++;
        }
      }

      // Update sync log
      await DatabaseManager.updateSyncLog(syncLog.id, {
        status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        errorMessage: errors.length > 0 ? errors.slice(0, 10).join('\n') : null,
      });

      console.log('\n📊 Sync completed!');
      console.log(`  ✅ Added: ${recordsAdded} orders`);
      console.log(`  ✏️  Updated: ${recordsUpdated} orders`);
      console.log(`  ❌ Failed: ${recordsFailed}`);

      if (errors.length > 0) {
        console.log(`\n⚠️  First 10 errors:`);
        errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
      }

      return {
        success: true,
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        totalUsers: usersMap.size,
        totalProducts: productsMap.size,
        totalOrders: ordersMap.size,
        errors,
      };
    } catch (error) {
      console.error('❌ Master sheet sync failed:', error);

      await DatabaseManager.updateSyncLog(syncLog.id, {
        status: 'FAILED',
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        errorMessage: errorMessage(error),
      });

      throw error;
    }
  }

  /**
   * Parse a single Master sheet row
   */
  static parseMasterRow(row: string[], colIndex: Record<string, number>) {
    return {
      phone: this.sanitizePhoneNumber(row[colIndex[sheet_master.PHONE]]),
      orderId: row[colIndex[sheet_master.ORDER_ID]]?.trim(),
      name: row[colIndex[sheet_master.NAME]]?.trim() || '',
      wechatId: row[colIndex[sheet_master.WECHAT_ID]]?.trim() || null,
      nameEn: row[colIndex[sheet_master.ENGLISH_NAME]]?.trim() || null,
      address: row[colIndex[sheet_master.ADDRESS]]?.trim() || null,
      email: row[colIndex[sheet_master.EMAIL]]?.trim()?.includes('@') ? row[colIndex[sheet_master.EMAIL]]?.trim() : null,
      
      wordChain: row[colIndex[sheet_master.WORD_CHAIN]]?.trim() || null,
      paymentStatus: row[colIndex[sheet_master.PAYMENT_STATUS]]?.trim() || null,
      remarks: row[colIndex[sheet_master.REMARKS]]?.trim() || null,
      orderTime: this.parseDate(row[colIndex[sheet_master.ORDER_TIME]]?.trim()),
      
      category: row[colIndex[sheet_master.CATEGORY]]?.trim() || '',
      productName: row[colIndex[sheet_master.PRODUCT_NAME]]?.trim() || '',
      specification: row[colIndex[sheet_master.SPECIFICATIONS]]?.trim() || '',
      quantity: parseInt(row[colIndex[sheet_master.QUANTITY]], 10) || 0,
      price: parseFloat(row[colIndex[sheet_master.PRICE]]) || 0,
      
      shippingCost: parseFloat(row[colIndex[sheet_master.SHIPPING_COST]]) || 0,
      totalOrderAmount: parseFloat(row[colIndex[sheet_master.TOTAL_ORDER_AMOUNT]]) || 0,
      paidStatus: row[colIndex[sheet_master.PAID_STATUS]]?.trim() || 'pending',
      packingStatus: row[colIndex[sheet_master.PACKING_STATUS]]?.trim() || 'pending',
      shippingStatus: row[colIndex[sheet_master.SHIPPING_STATUS]]?.trim() || 'pending',
      fulfillable: row[colIndex[sheet_master.FULFILLABLE]]?.trim() !== 'FALSE',
    };
  }

  // ==================== BI-DIRECTIONAL SYNC (MASTER EDITS) ====================
  
  /**
   * Handle Master sheet edit (bi-directional sync)
   * Updates database when Master is edited
   */
  static async handleMasterUpdate(updateData: { orderId: string; columnIndex: number; newValue: string; oldValue: string }) {
    const { orderId, columnIndex, newValue, oldValue } = updateData;

    try {
      console.log(`🔄 Master edit: Order ${orderId}, Column ${columnIndex}, Value: ${newValue}`);

      if (!orderId) {
        throw new Error('OrderId is required');
      }

      // Map column index to field
      const field = this.getFieldFromColumn(columnIndex);
      if (!field) {
        console.log(`Column ${columnIndex} does not map to a database field, skipping`);
        return { success: true, skipped: true };
      }

      // Check if order exists in database
      const order = await DatabaseManager.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found in database`);
      }

      // Update database
      await this.updateOrderField(orderId, field, newValue);

      console.log(`✅ Updated ${field} in database for order ${orderId}`);

      return {
        success: true,
        orderId,
        field,
        newValue,
        oldValue,
      };
    } catch (error) {
      console.error('Failed to handle Master update:', error);
      throw error;
    }
  }

  /**
   * Map column index to database field
   */
  static getFieldFromColumn(columnIndex: number): string | null {
    // Based on sheet_master constant mapping
    const columnMap: Record<number, string> = {
      2: 'paymentStatus',   // C - 通知付款狀態
      5: 'remarks',         // F - 备注
      15: 'paidStatus',     // P - 付款情況
      16: 'packingStatus',  // Q - 裝箱情況
      17: 'shippingStatus', // R - 發貨狀態
      20: 'address',        // U - 地址
    };

    return columnMap[columnIndex - 1] || null; // Adjust for 0-indexing
  }

  /**
   * Update specific order field in database
   */
  static async updateOrderField(orderId: string, field: string, value: string) {
    const updates = {
      [field]: value,
    };

    await DatabaseManager.updateOrder(orderId, updates);

    // Special handling for payment status changes
    if (field === 'paidStatus' && value === '已付款') {
      await this.handlePaymentComplete(orderId);
    }

    return { success: true };
  }

  /**
   * Handle payment completion
   */
  static async handlePaymentComplete(orderId: string) {
    console.log(`💰 Payment completed for order ${orderId}`);
    
    // Add any post-payment logic here:
    // - Send confirmation email
    // - Update inventory
    // - Trigger notifications
    
    return { success: true };
  }

  /**
   * Validate Master sheet edit
   */
  static validateUpdate(updateData: { orderId: string; columnIndex: number; newValue: string; oldValue: string }) {
    const { orderId, columnIndex, newValue } = updateData;

    if (!orderId) {
      throw new Error('OrderId is required');
    }

    const field = this.getFieldFromColumn(columnIndex);
    if (!field) {
      return { valid: false, reason: 'Column not mapped' };
    }

    // Field-specific validation
    const validations: Record<string, (val: string) => boolean> = {
      paidStatus: (val: string) => ['未付款', '已付款', 'cash', 'etransfer', '弃单'].includes(val),
      packingStatus: (val: string) => ['未完成', 'packed', '已取消', '未完成那箱'].includes(val),
      shippingStatus: (val: string) => ['未發貨', '已發貨', 'Cancelled', 'Canceled'].includes(val),
      paymentStatus: (val: string) => ['未通知', '已通知'].includes(val),
    };

    if (validations[field] && !validations[field](newValue)) {
      return {
        valid: false,
        reason: `Invalid value "${newValue}" for field ${field}`,
      };
    }

    return { valid: true };
  }

  /**
   * Prevent infinite loop by checking if update came from sync-back
   */
  static shouldSkipUpdate(lastSyncTime: number) {
    const now = Date.now();
    const timeSinceSync = now - lastSyncTime;

    if (timeSinceSync < 2000) {
      console.log('⏭️  Skipping update (too soon after sync-back)');
      return true;
    }

    return false;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Fill merged cell values down
   */
  static fillMergedValuesDown(data: string[][], columnIndex: number) {
    let lastValue: string | null = null;
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
  static sanitizePhoneNumber(phone: null | string | number | undefined): string {
    if (!phone) return '';
    return String(phone).replace(/[^\d]/g, '').slice(-10);
  }

  /**
   * Parse date string
   */
  static parseDate(dateStr: string | null | undefined) {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }
}

export default MasterSheetSync;
