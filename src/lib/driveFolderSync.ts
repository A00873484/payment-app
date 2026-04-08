// src/lib/driveFolderSync.ts - Process Google Sheets from Drive folder
import { google } from 'googleapis';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xlsx = require('xlsx') as typeof import('xlsx');
import type { WorkSheet } from 'xlsx';
import { RawSheetsSync } from './rawSheetsSync';
import { EmailService } from './email';
import { sheet_rawqjl, sheet_rawpt } from './const';
import { errorMessage } from './utils';

const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

// ─── Format Registry ──────────────────────────────────────────────────────────
// To add a new format: add an entry here with a unique subset of required
// headers, and ensure RawSheetsSync has a matching parser for the `sheetName`.

interface DriveSheetFormat {
  // Must match a sheetName accepted by RawSheetsSync.syncRawSheetToDatabase
  sheetName: string;
  // All of these headers must be present in row 1 to match this format.
  // Choose headers that are unique to this format to avoid false matches.
  requiredHeaders: string[];
}

const DRIVE_SHEET_FORMATS: DriveSheetFormat[] = [
  {
    sheetName: 'Raw-QJL',
    requiredHeaders: [
      sheet_rawqjl.ORDER_ID,
      sheet_rawqjl.WECHAT_NAME,
      sheet_rawqjl.PRODUCT_NAME,
      sheet_rawqjl.ALT_PHONE,
      sheet_rawqjl.TOTAL_PRODUCT_AMOUNT,
    ],
  },
  {
    sheetName: 'Raw-PT',
    requiredHeaders: [
      sheet_rawpt.ORDER_ID,
      sheet_rawpt.CUSTOMER_NICKNAME,
      sheet_rawpt.PRODUCT_NAME,
      sheet_rawpt.RECIPIENT_PHONE,
      sheet_rawpt.ORDER_AMOUNT,
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriveFileResult {
  fileName: string;
  fileId: string;
  success: boolean;
  format?: string;
  recordsAdded?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  error?: string;
}

// ─── DriveFolderSync ──────────────────────────────────────────────────────────

export class DriveFolderSync {
  private static getClients() {
    return {
      drive: google.drive({ version: 'v3', auth }),
      sheets: google.sheets({ version: 'v4', auth }),
    };
  }

  /**
   * Match a header row against the format registry.
   * Throws a descriptive error if no format matches (e.g. schema changed).
   */
  static detectFormat(headerRow: string[]): DriveSheetFormat {
    const headerSet = new Set(headerRow.map(h => h?.trim()).filter(Boolean));

    const matches = DRIVE_SHEET_FORMATS.filter(fmt =>
      fmt.requiredHeaders.every(h => headerSet.has(h))
    );

    if (matches.length === 0) {
      const knownFormats = DRIVE_SHEET_FORMATS.map(
        f => `  ${f.sheetName}: [${f.requiredHeaders.join(', ')}]`
      ).join('\n');
      throw new Error(
        `Unrecognized sheet format.\n\n` +
        `Found headers: [${[...headerSet].join(', ')}]\n\n` +
        `Known formats require ALL of:\n${knownFormats}`
      );
    }

    // If multiple formats match, prefer the most specific one
    matches.sort((a, b) => b.requiredHeaders.length - a.requiredHeaders.length);
    return matches[0];
  }

  /**
   * Process all Google Sheets files in the Unprocessed Drive folder.
   * Successfully processed files are moved to the Processed folder.
   * Failed files stay in place; an error email is sent for each failure.
   */
  static async processUnprocessedFolder(): Promise<DriveFileResult[]> {
    console.log("PROCESSING DRIVE FOLDER - START");
    const unprocessedId = process.env.DRIVE_FOLDER_UNPROCESSED_ID;
    const processedId = process.env.DRIVE_FOLDER_PROCESSED_ID;

    if (!unprocessedId || !processedId) {
      throw new Error(
        'DRIVE_FOLDER_UNPROCESSED_ID and DRIVE_FOLDER_PROCESSED_ID env vars must be set'
      );
    }

    const { drive } = this.getClients();

    /*const listResponse = await drive.files.list({
      q: `'${unprocessedId}' in parents and mimeType = 'application/vnd.ms-excel' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime',
    });*/

    const listResponse = await drive.files.list({
      q: `'${unprocessedId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'createdTime',
    });

    const files = listResponse.data.files ?? [];

    console.log(files.filter(f => f.name?.endsWith('.xls') || f.name?.endsWith('.xlsx')));

    if (files.length === 0) {
      console.log('No files found in Unprocessed folder');
      return [];
    }

    console.log(`Found ${files.length} file(s) to process`);

    const results: DriveFileResult[] = [];

    for (const file of files) {
      const result = await this.processFile(file.id!, file.name!, file.mimeType!, unprocessedId, processedId);
      results.push(result);

      if (!result.success) {
        await this.notifyAdminOfError(file.name!, result.error!).catch(e =>
          console.error('Failed to send admin error email:', e)
        );
      }
    }

    return results;
  }

  /**
   * Download a Drive file as an xlsx buffer.
   * Native Google Sheets are exported to xlsx; xlsx/xls files are downloaded directly.
   */
  static async downloadAsBuffer(fileId: string, mimeType: string): Promise<Buffer> {
    const { drive } = this.getClients();

    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      // Export native Google Sheets as xlsx
      const res = await drive.files.export(
        { fileId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(res.data as ArrayBuffer);
    } else {
      // Download xlsx / xls directly
      const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(res.data as ArrayBuffer);
    }
  }

  /**
   * Convert a single worksheet to a normalised 2-D string array.
   */
  private static sheetToRows(sheet: WorkSheet): string[][] {
    const rows: unknown[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    return rows.map(row => (row as unknown[]).map(cell =>
      cell === null || cell === undefined ? '' : String(cell)
    ));
  }

  /**
   * Try every sheet in the workbook in order and return the rows + detected
   * format for the first sheet that matches a known format.
   *
   * Replaces the old parseXlsxBuffer + detectFormat two-step, which always
   * read sheet 0 and therefore broke on multi-tab files (e.g. 接龙 exports
   * where sheet 0 is a summary and the data lives on a later tab).
   */
  static detectSheetAndFormat(buffer: Buffer): { rows: string[][], format: DriveSheetFormat } {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    if (workbook.SheetNames.length === 0) throw new Error('Workbook has no sheets');

    const sheetErrors: string[] = [];
    for (const name of workbook.SheetNames) {
      const rows = this.sheetToRows(workbook.Sheets[name]);
      if (rows.length <= 1) {
        sheetErrors.push(`"${name}": empty or header-only`);
        continue;
      }
      try {
        const format = this.detectFormat(rows[0]);
        console.log(`  Matched format "${format.sheetName}" on sheet "${name}"`);
        return { rows, format };
      } catch (e) {
        sheetErrors.push(`"${name}": ${errorMessage(e)}`);
      }
    }

    throw new Error(
      `No sheet in this workbook matched a known format.\n\n` +
      sheetErrors.join('\n\n')
    );
  }

  /**
   * Process a single Drive file: download, detect format, sync to DB + Master,
   * then move to Processed folder. Returns a result object (never throws).
   */
  static async processFile(
    fileId: string,
    fileName: string,
    mimeType: string,
    unprocessedFolderId: string,
    processedFolderId: string
  ): Promise<DriveFileResult> {
    const { drive } = this.getClients();

    try {
      console.log(`Processing: ${fileName} (${mimeType})`);

      // 1. Download and find the first sheet that matches a known format
      const buffer = await this.downloadAsBuffer(fileId, mimeType);
      const { rows, format } = this.detectSheetAndFormat(buffer);
      console.log(`  Detected format: ${format.sheetName}`);

      // 3. Run the sync pipeline with already-parsed rows
      const syncResult = await RawSheetsSync.syncFromRows(rows, format.sheetName);

      // 4. Move to Processed folder on success
      await drive.files.update({
        fileId,
        addParents: processedFolderId,
        removeParents: unprocessedFolderId,
        fields: 'id, parents',
      });

      console.log(`  Moved "${fileName}" to Processed folder`);

      return { fileName, fileId, format: format.sheetName, ...syncResult };
    } catch (error) {
      const errMsg = errorMessage(error);
      console.error(`  Failed to process "${fileName}":`, errMsg);
      return { fileName, fileId, success: false, error: errMsg };
    }
  }

  /**
   * Send an error notification to the admin email address.
   */
  static async notifyAdminOfError(fileName: string, error: string): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not set — skipping error notification email');
      return;
    }
    await EmailService.sendAdminErrorEmail(adminEmail, fileName, error);
  }
}

export default DriveFolderSync;
