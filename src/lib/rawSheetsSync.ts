// src/lib/rawSheetsSync.js - Process Raw-QJL and Raw-PT sheets
import { google } from 'googleapis';
import { DatabaseManager } from './dbManager';
import { MasterSheetWriter } from './masterSheetWriter';
import { sheet_rawqjl, sheet_rawpt } from './const';
import { config } from './config';
import { errorMessage } from './utils';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export class RawSheetsSync {
  /**
   * Sync Raw-QJL or Raw-PT sheets to database (replaces Apps Script SyncHandler)
   */
  /**
   * @param spreadsheetId - Optional override. When provided (e.g. from a Drive
   *   file), reads from that spreadsheet instead of the configured one, and
   *   uses a plain A:BZ range (the file IS the sheet, no tab name needed).
   */
  static async syncRawSheetToDatabase(
    sheetName: string,
    startRow: number,
    endRow: number,
    spreadsheetId?: string
  ) {
    const spreadsheetToUse = spreadsheetId ?? config.googleSheets.spreadsheetId;
    // When reading a standalone Drive file the data is on the default sheet,
    // so we use a plain range. When reading from the configured spreadsheet
    // the tab name is needed.
    const range = spreadsheetId
      ? `A${startRow}:BZ${endRow}`
      : `${sheetName}!A${startRow}:BZ${endRow}`;

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
        spreadsheetId: spreadsheetToUse,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error(`No data found in ${sheetName}`);
      }

      // Build colIndex from enum definition order (must match spreadsheet column order)
      const colIndex: { [key: string]: number } = Object.values(sheetName === 'Raw-QJL' ? sheet_rawqjl : sheet_rawpt).reduce((obj, col, i) => ({ ...obj, [col]: i }), {});

      return await this._processDataRows(rows, colIndex, sheetName, syncLog.id, recordsAdded, recordsUpdated, recordsFailed, errors);
    } catch (error) {
      console.error('Sync failed:', error);

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
   * Process rows that have already been parsed out of a file (e.g. via SheetJS).
   * allRows[0] must be the header row; data starts at allRows[1].
   * colIndex is built from the actual header so column order doesn't matter.
   */
  static async syncFromRows(allRows: string[][], sheetName: string) {
    const syncLog = await DatabaseManager.createSyncLog({
      sheetName,
      syncType: 'RAW_SHEET_IMPORT',
    });

    // Build colIndex from the actual header row — robust against column reordering
    const colIndex: { [key: string]: number } = {};
    allRows[0].forEach((col, i) => { if (col) colIndex[col.trim()] = i; });

    const dataRows = allRows.slice(1);
    return this._processDataRows(dataRows, colIndex, sheetName, syncLog.id, 0, 0, 0, []);
  }

  /**
   * Core processing: fill merged cells, group into orders, write to DB + Master.
   * Called by both syncRawSheetToDatabase (Sheets API path) and syncFromRows (SheetJS path).
   */
  private static async _processDataRows(
    rows: string[][],
    colIndex: { [key: string]: number },
    sheetName: string,
    syncLogId: string,
    recordsAdded: number,
    recordsUpdated: number,
    recordsFailed: number,
    errors: string[]
  ) {
    try {
      // Fill merged values down (replicates Apps Script behavior)
      let filledData;
      if (sheetName === 'Raw-QJL') {
        filledData = this.fillMergedValuesDown(rows, 0);
      } else {
        // Raw-PT has merges in columns 0 and 27
        filledData = this.fillMergedValuesDown(
          this.fillMergedValuesDown(rows, 0),
          27
        );
      }

      // Group by order
      const ordersMap = new Map();
      const usersMap = new Map();
      const productsMap = new Map();

      for (const row of filledData) {
        try {
          const parsedData =
            sheetName === 'Raw-QJL'
              ? this.parseQJLRow(row, colIndex)
              : this.parsePTRow(row, colIndex);

          if (!parsedData.phone || !parsedData.product) continue;

          const { phone, orderId } = parsedData;

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
              shipping: sheetName === 'Raw-QJL' ? null : { method: '', detail: '' },
            });
          }

          const order = ordersMap.get(orderId);
          if (parsedData.category === '邮寄/自提' || parsedData.category === 'Shipping') {
            order.shipping = { method: parsedData.product, detail: parsedData.spec };
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
          errors.push(`Row parse error: ${errorMessage(error)}`);
        }
      }

      console.log(`📦 Found ${ordersMap.size} orders, ${usersMap.size} users, ${productsMap.size} products`);

      for (const [phone, userData] of usersMap) {
        try {
          await DatabaseManager.upsertUser(userData);
        } catch (error) {
          console.error(`Failed to upsert user ${phone}:`, error);
          errors.push(`User ${phone}: ${errorMessage(error)}`);
        }
      }

      for (const [productKey, productData] of productsMap) {
        try {
          await DatabaseManager.findOrCreateProduct(productData);
        } catch (error) {
          console.error(`Failed to create product ${productKey}:`, error);
          errors.push(`Product ${productKey}: ${errorMessage(error)}`);
        }
      }

      for (const [orderId, orderData] of ordersMap) {
        try {
          const existingOrder = await DatabaseManager.getOrderByOrderId(orderId);
          if (existingOrder) {
            recordsUpdated++;
            console.log(`✏️  Order ${orderId} already exists, skipping`);
            continue;
          }

          const user = await DatabaseManager.getUserByPhone(orderData.phone);
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
          await MasterSheetWriter.syncOrderToMaster(orderId);
        } catch (error) {
          console.error(`Failed to process order ${orderId}:`, error);
          errors.push(`Order ${orderId}: ${errorMessage(error)}`);
          recordsFailed++;
        }
      }

      await DatabaseManager.updateSyncLog(syncLogId, {
        status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        recordsAdded,
        recordsUpdated,
        recordsFailed,
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
      });

      console.log(`\n📊 Sync completed! Added: ${recordsAdded}, Updated: ${recordsUpdated}, Failed: ${recordsFailed}`);

      return { success: true, recordsAdded, recordsUpdated, recordsFailed, errors };
    } catch (error) {
      console.error('Processing failed:', error);
      await DatabaseManager.updateSyncLog(syncLogId, {
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
   * Parse Raw-QJL row
   */
  static parseQJLRow(row: string[], colIndex: { [key: string]: number }) {
    const orderNumber = row[colIndex[sheet_rawqjl.ORDER_ID]]?.trim();
    const orderId = `QJL-${orderNumber}`;

    return {
      phone: this.sanitizePhoneNumber(row[colIndex[sheet_rawqjl.ALT_PHONE]]),
      product: row[colIndex[sheet_rawqjl.PRODUCT_NAME]]?.trim(),
      spec: row[colIndex[sheet_rawqjl.SPECIFICATION]]?.trim(),
      category: this.sanitizeSheetValue(row[colIndex[sheet_rawqjl.PRODUCT_CATEGORY]]),
      qty: parseInt(row[colIndex[sheet_rawqjl.QUANTITY]], 10) || 0,
      price: parseFloat(row[colIndex[sheet_rawqjl.TOTAL_PRODUCT_AMOUNT]]) || 0,
      total: parseFloat(row[colIndex[sheet_rawqjl.ORDER_TOTAL]]) || 0,
      orderId,
      orderTime: this.parseDate(row[colIndex[sheet_rawqjl.ORDER_TIME]]?.trim()),
      name: row[colIndex[sheet_rawqjl.WECHAT_NAME]]?.trim() || '',
      nameId: row[colIndex[sheet_rawqjl.WECHAT_ID]]?.trim() || '',
      englishName: row[colIndex[sheet_rawqjl.RECIPIENT_NAME_EN]]?.trim() || '',
      address: row[colIndex[sheet_rawqjl.ALT_ADDRESS]]?.trim() || '',
      email: this.extractEmail(row[colIndex[sheet_rawqjl.EMAIL]]?.trim()),
      notes: row[colIndex[sheet_rawqjl.USER_NOTES]]?.trim() || '',
      wordChain: row[colIndex[sheet_rawqjl.CHAIN_NUMBER]]?.trim() || '',
      shippingCost: parseFloat(row[colIndex[sheet_rawqjl.SHIPPING_FEE]]) || 0,
      shipping: { method: '', detail: ''},
    };
  }

  /**
   * Parse Raw-PT row
   */
  static parsePTRow(row: string[], colIndex: { [key: string]: number }) {
    const orderNumber = row[colIndex[sheet_rawpt.ORDER_ID]]?.trim();
    const orderId = `PT-${orderNumber}`;

    return {
      phone: this.sanitizePhoneNumber(row[colIndex[sheet_rawpt.RECIPIENT_PHONE]]),
      product: row[colIndex[sheet_rawpt.PRODUCT_NAME]]?.trim(),
      spec: row[colIndex[sheet_rawpt.PRODUCT_SPEC]]?.trim(),
      category: this.sanitizeSheetValue(row[colIndex[sheet_rawpt.PRODUCT_CATEGORY]]),
      qty: parseInt(row[colIndex[sheet_rawpt.PRODUCT_QUANTITY]], 10) || 0,
      price: parseFloat(row[colIndex[sheet_rawpt.PRODUCT_TOTAL_PRICE]]) || 0,
      total: parseFloat(row[colIndex[sheet_rawpt.ORDER_AMOUNT]]) || 0,
      orderId,
      orderTime: this.parseDate(row[colIndex[sheet_rawpt.ORDER_TIME]]?.trim()),
      name: row[colIndex[sheet_rawpt.CUSTOMER_NICKNAME]]?.trim() || '',
      nameId: row[colIndex[sheet_rawpt.CUSTOMER_NICKNAME]]?.trim() || '',
      englishName: row[colIndex[sheet_rawpt.RECIPIENT_NAME]]?.trim() || '',
      address: row[colIndex[sheet_rawpt.DELIVERY_ADDRESS]]?.trim() || '',
      email: this.extractEmail(row[colIndex[sheet_rawpt.ORDER_NOTES]]?.trim()),
      notes: row[colIndex[sheet_rawpt.ORDER_NOTES]]?.trim() || '',
      wordChain: orderNumber,
      shippingCost: parseFloat(row[colIndex[sheet_rawpt.ORDER_SHIPPING_FEE]]) || 0,
      shipping: { method: row[colIndex[sheet_rawpt.PICKUP_POINT]]?.trim(), detail: row[colIndex[sheet_rawpt.PICKUP_POINT_NOTES]]?.trim()},
    };
  }

  /**
   * Fill merged cell values down (replicates DataUtils.fillMergedValuesDown)
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
   * Sanitize a sheet cell value — returns null for formula errors (e.g. #N/A, #REF!)
   */
  static sanitizeSheetValue(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.startsWith('#') ? null : trimmed;
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhoneNumber(phone: string | number): string {
    if (!phone) return '';
    return String(phone).replace(/[^\d]/g, '').slice(-10);
  }

  /**
   * Extract email from string
   */
  static extractEmail(str: string | null): string | null {
    if (!str) return null;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const match = str.match(emailRegex);
    return match ? match[1] : null;
  }

  /**
   * Parse date string
   */
  static parseDate(dateStr: string | null): Date {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }
}

export default RawSheetsSync;
