/**
 * Updated Code.gs - Webhook mode (calls Next.js API instead of processing locally)
 * 
 * Setup Instructions:
 * 1. File > Project settings > Script properties
 * 2. Add properties:
 *    - API_URL: https://payment-app-wheat.vercel.app (your Next.js deployment URL)
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
      // Raw sheets: sync ANY edit (including single cells)
      // Skip header row
      if (editedRow > 1) {
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
  
  console.log('Calling raw-sheets sync:', payload);
  
  const result = makeApiCall('/api/sync/raw-sheets', payload);
  
  if (result) {
    console.log('Sync result:', result);
  }
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
  
  console.log('Calling master-update:', payload);
  
  const result = makeApiCall('/api/sync/master-update', payload);
  
  if (result) {
    console.log('Update result:', result);
  }
}

function makeApiCall(endpoint, payload) {
  const apiUrl = PropertiesService.getScriptProperties().getProperty('API_URL');
  
  if (!apiUrl) {
    console.error('API_URL not configured in Script Properties');
    return null;
  }
  
  try {
    const response = UrlFetchApp.fetch(apiUrl + endpoint, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('API Response:', responseCode, responseText);
    
    if (responseCode === 200) {
      return JSON.parse(responseText);
    } else {
      console.error('API Error:', responseCode, responseText);
      return null;
    }
  } catch (error) {
    console.error('API call exception:', error);
    return null;
  }
}

/**
 * Manual sync function - for syncing existing data
 * Run this once to sync all existing Raw-QJL data
 */
function manualSyncRawQJL() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Raw-QJL');
  const lastRow = sheet.getLastRow();
  
  const payload = {
    sheetName: 'Raw-QJL',
    startRow: 2, // Skip header
    endRow: lastRow,
    apiKey: PropertiesService.getScriptProperties().getProperty('API_KEY')
  };
  
  console.log('Manual sync:', payload);
  
  const result = makeApiCall('/api/sync/raw-sheets', payload);
  
  if (result) {
    console.log('Manual sync completed:', result);
    SpreadsheetApp.getUi().alert(
      'Sync Complete',
      `Added: ${result.recordsAdded}\nUpdated: ${result.recordsUpdated}\nFailed: ${result.recordsFailed}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert('Sync Failed', 'Check the logs', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Manual sync function - for syncing existing Raw-PT data
 */
function manualSyncRawPT() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Raw-PT');
  const lastRow = sheet.getLastRow();
  
  const payload = {
    sheetName: 'Raw-PT',
    startRow: 2, // Skip header
    endRow: lastRow,
    apiKey: PropertiesService.getScriptProperties().getProperty('API_KEY')
  };
  
  console.log('Manual sync:', payload);
  
  const result = makeApiCall('/api/sync/raw-sheets', payload);
  
  if (result) {
    console.log('Manual sync completed:', result);
    SpreadsheetApp.getUi().alert(
      'Sync Complete',
      `Added: ${result.recordsAdded}\nUpdated: ${result.recordsUpdated}\nFailed: ${result.recordsFailed}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert('Sync Failed', 'Check the logs', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
