/**
 * Updated Code.gs - Webhook mode (calls Next.js API instead of processing locally)
 * 
 * Setup Instructions:
 * 1. File > Project settings > Script properties
 * 2. Add properties:
 *    - API_URL: https://your-app.com (your Next.js deployment URL)
 *    - API_KEY: your-secret-api-key (matches SYNC_API_KEY in .env)
 * 
 * 3. Keep existing trigger: onEdit
 */

/**
 * Main onEdit trigger - Routes to webhooks instead of local processing
 */
function onEdit(e) {
  // Prevent duplicate processing
  const props = PropertiesService.getScriptProperties();
  const lastEdit = props.getProperty("lastEdit");
  const currentEdit = `${e.range.getA1Notation()}@${e.range.getSheet().getName()}`;

  if (lastEdit === currentEdit) return;
  props.setProperty("lastEdit", currentEdit);
  
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const editedColumn = range.getColumn();
  const editedRow = range.getRow();

  try {
    // Route based on sheet and edit type
    if (sheetName === "Raw-QJL" || sheetName === "Raw-PT") {
      // Raw sheets: bulk import
      if (range.getNumRows() > 1 || range.getNumColumns() > 1) {
        callRawSheetsSync(e);
      }
    } else if (sheetName === "Master") {
      // Master sheet: specific column edits
      const syncColumns = [3, 6, 16, 17, 18]; // C, F, P, Q, R
      if (syncColumns.includes(editedColumn) && range.getNumRows() === 1 && range.getNumColumns() === 1) {
        callMasterUpdate(e);
      }
    }
  } catch (error) {
    console.error('OnEdit error:', error);
  }
}

function callRawSheetsSync(e) {
  const sheet = e.range.getSheet();
  const range = e.range;
  const startRow = range.getRow();
  const endRow = startRow + range.getNumRows() - 1;
  
  const payload = {
    sheetName: sheet.getName(),
    startRow: startRow,
    endRow: endRow,
    apiKey: PropertiesService.getScriptProperties().getProperty('API_KEY')
  };
  
  makeApiCall('/api/sync/raw-sheets', payload);
}

function callMasterUpdate(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const value = e.value || '';
  const oldValue = e.oldValue || '';
  
  const orderId = sheet.getRange(row, 23).getValue();
  if (!orderId) return;
  
  const payload = {
    orderId: String(orderId).trim(),
    rowIndex: row,
    columnIndex: col,
    newValue: value,
    oldValue: oldValue,
    apiKey: PropertiesService.getScriptProperties().getProperty('API_KEY')
  };
  
  makeApiCall('/api/sync/master-update', payload);
}

function makeApiCall(endpoint, payload) {
  const apiUrl = PropertiesService.getScriptProperties().getProperty('API_URL');
  if (!apiUrl) return null;
  
  try {
    UrlFetchApp.fetch(apiUrl + endpoint, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    console.error('API call error:', error);
  }
}
