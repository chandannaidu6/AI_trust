/**
 * Google Apps Script Web App handler for the Code Review Study's Sheets
 * auto-submit (see src/utils/export.ts: submitToSheets).
 *
 * Apps Script has no git-based deploy — this file is a version-controlled
 * copy for reference/review. To deploy a change: open the Sheet this is
 * bound to → Extensions → Apps Script, paste the updated source over the
 * existing doPost, save, then Deploy → Manage deployments → edit the
 * existing deployment (same URL) or create a new one and update
 * VITE_SHEETS_URL in .env if the URL changes.
 *
 * Unlike the version this replaced, this one grows the header row on every
 * request instead of only on the very first one — any key present in an
 * incoming submission that isn't already a column gets appended as a new
 * column, so a field added to the app after the sheet already has rows in
 * it is captured going forward instead of silently dropped. It does not
 * retroactively fill in old rows for a field that didn't exist yet when
 * they were submitted — those cells are legitimately blank, not missing.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data  = JSON.parse(e.postData.contents);
    var keys  = Object.keys(data);

    var headers;
    if (sheet.getLastRow() === 0) {
      // First submission ever — the header row starts out as whatever this
      // submission happens to contain.
      sheet.appendRow(keys);
      headers = keys;
    } else {
      // Any key in this submission that isn't already a column gets
      // appended to the header row, so the schema grows automatically
      // whenever the app adds a new question/field instead of silently
      // dropping its data.
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var missing = keys.filter(function(k) { return headers.indexOf(k) === -1; });
      if (missing.length > 0) {
        sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
        headers = headers.concat(missing);
      }
    }

    // Write the response row in the same column order as the (possibly
    // just-extended) header.
    var row = headers.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
