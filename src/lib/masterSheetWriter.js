// src/lib/masterSheetWriter.js - Write database changes back to Master sheet
import { google } from 'googleapis';
import { DatabaseManager } from './dbManager.ts';
import { sheet_master } from './const.js';
import { config } from './config.js';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export class MasterSheetWriter {
  /**
   * Sync an order from database to Master sheet
   * Creates new rows or updates existing ones
   */
  static async syncOrderToMaster(orderId) {
    try {
      console.log(`🔄 Syncing order ${orderId} to Master sheet...`);

      // Get order with items from database
      const order = await DatabaseManager.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found in database`);
      }

      // Check if order exists in Master
      const existingRows = await this.findOrderInMaster(orderId);

      if (existingRows.length > 0) {
        // Update existing rows
        await this.updateOrderInMaster(order, existingRows);
        console.log(`✅ Updated order ${orderId} in Master sheet`);
      } else {
        // Create new rows
        await this.createOrderInMaster(order);
        console.log(`✅ Created order ${orderId} in Master sheet`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to sync order ${orderId} to Master:`, error);
      throw error;
    }
  }

  /**
   * Find order rows in Master sheet
   */
  static async findOrderInMaster(orderId) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: 'Master!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const [header, ...dataRows] = rows;
    const colIndex = Object.fromEntries(header.map((col, i) => [col, i]));
    const orderIdCol = colIndex[sheet_master.ORDER_ID];

    // Find all rows belonging to this order
    const foundRows = [];
    dataRows.forEach((row, index) => {
      if (row[orderIdCol]?.trim() === orderId) {
        foundRows.push({
          rowIndex: index + 2, // +2 because 1-indexed and header
          data: row,
        });
      }
    });

    return foundRows;
  }

  /**
   * Create new order in Master sheet (multi-row with merged cells)
   */
  static async createOrderInMaster(order) {
    const masterSheet = await this.getMasterSheet();
    const lastRow = await this.getLastRow();
    const startRow = lastRow + 1;

    // Build rows (one per item + shipping if exists)
    const rows = [];

    // Item rows
    for (const item of order.orderItems) {
      rows.push([
        '', // Column A - Phone (will be merged)
        '', // Column B - Word Chain (will be merged)
        '', // Column C - Payment Status (will be merged)
        '', // Column D - Name (will be merged)
        '', // Column E - WeChat ID (will be merged)
        '', // Column F - Remarks (will be merged)
        '', // Column G - Order Time (will be merged)
        item.brand || item.product?.category || '', // Column H - Category
        item.productName, // Column I - Product Name
        item.specification || '', // Column J - Specification
        item.quantity, // Column K - Quantity
        item.totalProductAmount, // Column L - Price
        '', // Column M - ScanOut (will be merged)
        '', // Column N - Shipping Cost (will be merged)
        '', // Column O - Total Order Amount (will be merged)
        '', // Column P - Paid Status (will be merged)
        '', // Column Q - Packing Status (will be merged)
        '', // Column R - Shipping Status (will be merged)
        '', // Column S - English Name (will be merged)
        '', // Column T - Phone duplicate (will be merged)
        '', // Column U - Address (will be merged)
        '', // Column V - Email (will be merged)
        '', // Column W - Order ID (will be merged)
      ]);
    }

    // Shipping row (if exists)
    if (order.shipping1) {
      rows.push([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Shipping',
        order.shipping1,
        order.shipping2 || '',
        1,
        0,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    }

    // Fill merged columns with order data (first row only)
    const firstRow = rows[0];
    firstRow[0] = order.phone; // Phone
    firstRow[1] = order.wordChain || ''; // Word Chain
    firstRow[2] = order.paymentStatus || ''; // Payment Status
    firstRow[3] = order.user?.name || ''; // Name
    firstRow[4] = order.user?.wechatId || ''; // WeChat ID
    firstRow[5] = order.remarks || ''; // Remarks
    firstRow[6] = order.orderTime ? this.formatDate(order.orderTime) : ''; // Order Time
    firstRow[12] = ''; // ScanOut
    firstRow[13] = order.shippingCost; // Shipping Cost
    firstRow[14] = order.totalOrderAmount; // Total Order Amount
    firstRow[15] = order.paidStatus; // Paid Status
    firstRow[16] = order.packingStatus; // Packing Status
    firstRow[17] = order.shippingStatus; // Shipping Status
    firstRow[18] = order.user?.nameEn || ''; // English Name
    firstRow[19] = order.phone; // Phone duplicate
    firstRow[20] = order.address || ''; // Address
    firstRow[21] = order.user?.email || ''; // Email
    firstRow[22] = order.orderId; // Order ID

    // Write rows to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: 'Master!A:W',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    // Merge cells (columns that should be merged across all item rows)
    const columnsToMerge = [0, 1, 2, 3, 4, 5, 6, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    await this.mergeCells(startRow, rows.length, columnsToMerge);

    return { startRow, rowCount: rows.length };
  }

  /**
   * Update existing order in Master sheet
   */
  static async updateOrderInMaster(order, existingRows) {
    // Update merged columns (update first row only, merging will apply to all)
    const firstRow = existingRows[0];
    const updates = [];

    // Columns to update: paid status, packing status, shipping status, payment status
    updates.push({
      range: `Master!C${firstRow.rowIndex}`, // Payment Status
      values: [[order.paymentStatus || '']],
    });

    updates.push({
      range: `Master!P${firstRow.rowIndex}`, // Paid Status
      values: [[order.paidStatus]],
    });

    updates.push({
      range: `Master!Q${firstRow.rowIndex}`, // Packing Status
      values: [[order.packingStatus]],
    });

    updates.push({
      range: `Master!R${firstRow.rowIndex}`, // Shipping Status
      values: [[order.shippingStatus]],
    });

    updates.push({
      range: `Master!F${firstRow.rowIndex}`, // Remarks
      values: [[order.remarks || '']],
    });

    if (order.paymentId) {
      updates.push({
        range: `Master!W${firstRow.rowIndex}`, // Payment ID (if column exists)
        values: [[order.paymentId]],
      });
    }

    // Batch update
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: config.googleSheets.spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updates,
        },
      });
    }

    return { rowsUpdated: updates.length };
  }

  /**
   * Update single field in Master sheet
   */
  static async updateOrderField(orderId, field, value) {
    try {
      const existingRows = await this.findOrderInMaster(orderId);
      if (existingRows.length === 0) {
        throw new Error(`Order ${orderId} not found in Master sheet`);
      }

      const firstRow = existingRows[0];
      
      // Map field to column
      const fieldToColumn = {
        paidStatus: 'P',
        packingStatus: 'Q',
        shippingStatus: 'R',
        paymentStatus: 'C',
        remarks: 'F',
        paymentId: 'W',
      };

      const column = fieldToColumn[field];
      if (!column) {
        throw new Error(`Unknown field: ${field}`);
      }

      // Update the cell
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `Master!${column}${firstRow.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]],
        },
      });

      console.log(`✅ Updated ${field} to "${value}" for order ${orderId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to update field ${field} for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Merge cells vertically for an order
   */
  static async mergeCells(startRow, rowCount, columns) {
    const sheetId = await this.getMasterSheetId();
    const requests = columns.map((col) => ({
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: startRow - 1, // 0-indexed
          endRowIndex: startRow - 1 + rowCount,
          startColumnIndex: col,
          endColumnIndex: col + 1,
        },
        mergeType: 'MERGE_ALL',
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.googleSheets.spreadsheetId,
      requestBody: {
        requests,
      },
    });
  }

  /**
   * Get Master sheet metadata
   */
  static async getMasterSheet() {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: config.googleSheets.spreadsheetId,
    });

    const masterSheet = response.data.sheets.find(
      (s) => s.properties.title === 'Master'
    );

    if (!masterSheet) {
      throw new Error('Master sheet not found');
    }

    return masterSheet;
  }

  /**
   * Get Master sheet ID
   */
  static async getMasterSheetId() {
    const masterSheet = await this.getMasterSheet();
    return masterSheet.properties.sheetId;
  }

  /**
   * Get last row number in Master sheet
   */
  static async getLastRow() {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: 'Master!A:A',
    });

    return response.data.values?.length || 1;
  }

  /**
   * Format date for sheet
   */
  static formatDate(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toISOString();
  }
}

export default MasterSheetWriter;
