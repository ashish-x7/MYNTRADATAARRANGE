/**
 * Google Apps Script for AJIO & MYNTRA DATA Sync
 * 
 * Instructions:
 * 1. Open your Google Sheet ("AJIO&MYNTRA DATA").
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Click Save (Disk icon).
 * 5. Click "Deploy" -> "New deployment".
 * 6. Under "Select type", choose "Web app".
 * 7. Set configuration:
 *    - Description: "Myntra Party Data API"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"  <-- CRITICAL for the web application to access it
 * 8. Click Deploy, authorize permissions if prompted.
 * 9. Copy the generated "Web app URL" and paste it into the Web App settings panel.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var action = e.parameter.action;
  var sheetName = "MYNTRA PARTY NAME";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.openById("14_Vxc8gCvTYuRsPvLzefVgzRlJjRDMHfMQHPGVYuZbI");
  }
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return createResponse({ 
      status: "error", 
      message: "Sheet not found: " + sheetName + ". Please ensure your active sheet has a tab named 'MYNTRA PARTY NAME'." 
    });
  }
  
  var response = {};
  
  function getSheetRobust(name) {
    var sheets = ss.getSheets();
    var target = name.toUpperCase().trim();
    for (var i = 0; i < sheets.length; i++) {
      var sName = sheets[i].getName().toUpperCase().trim();
      if (sName === target) return sheets[i];
    }
    return null;
  }

  try {
    // READ Action
    if (action === "read" || !action) {
      var data = [];
      var range = sheet.getDataRange();
      var values = range.getValues();
      
      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        if (row[0] !== "" || row[1] !== "") {
          data.push({
            code: String(row[0]).trim(),
            partyCode: String(row[1]).trim()
          });
        }
      }
      response = { status: "success", data: data };
      
    // ADD Action
    } else if (action === "add") {
      var payload = JSON.parse(e.postData.contents);
      var code = String(payload.code).trim();
      var partyCode = String(payload.partyCode).trim();
      
      if (!code || !partyCode) {
        return createResponse({ status: "error", message: "Required inputs (code, partyCode) are missing." });
      }
      
      // Check for duplicate code
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim() === code) {
          return createResponse({ status: "error", message: "Duplicate Code: '" + code + "' already exists in the sheet!" });
        }
      }
      
      sheet.appendRow([code, partyCode]);
      response = { status: "success", message: "Party '" + partyCode + "' added successfully!" };
      
    // UPDATE Action
    } else if (action === "update") {
      var payload = JSON.parse(e.postData.contents);
      var oldCode = String(payload.oldCode).trim();
      var newCode = String(payload.newCode).trim();
      var partyCode = String(payload.partyCode).trim();
      
      if (!oldCode || !newCode || !partyCode) {
        return createResponse({ status: "error", message: "Required inputs (oldCode, newCode, partyCode) are missing." });
      }
      
      var values = sheet.getDataRange().getValues();
      var foundIndex = -1;
      
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim() === oldCode) {
          foundIndex = i + 1; // 1-based Row Index
          break;
        }
      }
      
      if (foundIndex !== -1) {
        // If code is changing, check if newCode already exists in another row
        if (oldCode !== newCode) {
          for (var i = 1; i < values.length; i++) {
            if (i + 1 !== foundIndex && String(values[i][0]).trim() === newCode) {
              return createResponse({ status: "error", message: "Duplicate Code: Cannot rename. Code '" + newCode + "' already exists." });
            }
          }
        }
        
        sheet.getRange(foundIndex, 1).setValue(newCode);
        sheet.getRange(foundIndex, 2).setValue(partyCode);
        response = { status: "success", message: "Party details updated successfully!" };
      } else {
        response = { status: "error", message: "Party not found with code: " + oldCode };
      }
      
    // DELETE Action
    } else if (action === "delete") {
      var payload = JSON.parse(e.postData.contents);
      var code = String(payload.code).trim();
      
      if (!code) {
        return createResponse({ status: "error", message: "Missing code to delete." });
      }
      
      var values = sheet.getDataRange().getValues();
      var foundIndex = -1;
      
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim() === code) {
          foundIndex = i + 1; // 1-based Row Index
          break;
        }
      }
      
      if (foundIndex !== -1) {
        sheet.deleteRow(foundIndex);
        response = { status: "success", message: "Party with code " + code + " deleted successfully!" };
      } else {
        response = { status: "error", message: "Party not found with code: " + code };
      }

    // GET TRACKED ERRORS Action
    } else if (action === "getTrackedErrors") {
      var errSheet = getSheetRobust("ERROR TRACKING");
      if (!errSheet) {
        response = { status: "success", errors: [] };
      } else {
        var data = errSheet.getDataRange().getValues();
        var header = data[0];
        var now = new Date().getTime();
        var THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        var rowsToKeep = [header];
        var errors = [];
        
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (row.length < 9) continue;
          var createdDateStr = row[6];
          var createdTime = new Date(createdDateStr).getTime();
          
          if (now - createdTime >= THIRTY_DAYS_MS) {
            continue;
          }
          
          rowsToKeep.push(row);
          errors.push({
            id: String(row[0]),
            type: String(row[1]),
            fileName: String(row[2]),
            partyOrWh: String(row[3]),
            errorType: String(row[4]),
            rowsCount: Number(row[5]),
            createdDate: String(row[6]),
            solved: row[7] === true || String(row[7]).toLowerCase() === "true",
            solvedDate: String(row[8])
          });
        }
        
        if (rowsToKeep.length < data.length) {
          errSheet.clearContents();
          errSheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
        }
        response = { status: "success", errors: errors };
      }

    // ADD TRACKED ERROR Action
    } else if (action === "addTrackedError") {
      var payload = JSON.parse(e.postData.contents);
      var errSheet = getSheetRobust("ERROR TRACKING");
      if (!errSheet) {
        errSheet = ss.insertSheet("ERROR TRACKING");
        errSheet.appendRow(["ID", "TYPE", "FILENAME", "PARTY_OR_WH", "ERROR_TYPE", "ROWS_COUNT", "CREATED_DATE", "SOLVED", "SOLVED_DATE"]);
      }
      errSheet.appendRow([
        payload.id,
        payload.type,
        payload.fileName,
        payload.partyOrWh,
        payload.errorType,
        payload.rowsCount,
        payload.createdDate,
        payload.solved,
        payload.solvedDate
      ]);
      response = { status: "success", message: "Tracked error registered successfully!" };

    // SOLVE TRACKED ERROR Action
    } else if (action === "solveTrackedError") {
      var payload = JSON.parse(e.postData.contents);
      var errSheet = getSheetRobust("ERROR TRACKING");
      if (!errSheet) {
        return createResponse({ status: "error", message: "ERROR TRACKING sheet not found" });
      }
      var data = errSheet.getDataRange().getValues();
      var updated = false;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(payload.id).trim()) {
          errSheet.getRange(i + 1, 8).setValue(true);
          errSheet.getRange(i + 1, 9).setValue(payload.solvedDate);
          updated = true;
          break;
        }
      }
      if (!updated) {
        return createResponse({ status: "error", message: "Tracked error with ID " + payload.id + " not found" });
      }
      response = { status: "success", message: "Tracked error marked as solved!" };

    // DELETE TRACKED ERROR Action
    } else if (action === "deleteTrackedError") {
      var payload = JSON.parse(e.postData.contents);
      var errSheet = getSheetRobust("ERROR TRACKING");
      if (!errSheet) {
        return createResponse({ status: "error", message: "ERROR TRACKING sheet not found" });
      }
      var data = errSheet.getDataRange().getValues();
      var deleted = false;
      for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]).trim() === String(payload.id).trim()) {
          errSheet.deleteRow(i + 1);
          deleted = true;
        }
      }
      if (!deleted) {
        return createResponse({ status: "error", message: "Tracked error with ID " + payload.id + " not found" });
      }
      response = { status: "success", message: "Tracked error deleted successfully!" };

    // CLEAR TRACKED ERRORS Action
    } else if (action === "clearTrackedErrors") {
      var errSheet = getSheetRobust("ERROR TRACKING");
      if (errSheet) {
        errSheet.clearContents();
        errSheet.appendRow(["ID", "TYPE", "FILENAME", "PARTY_OR_WH", "ERROR_TYPE", "ROWS_COUNT", "CREATED_DATE", "SOLVED", "SOLVED_DATE"]);
      }
      response = { status: "success", message: "Tracked error history cleared successfully!" };

      
    } else {
      response = { status: "error", message: "Action '" + action + "' is invalid." };
    }
  } catch (err) {
    response = { status: "error", message: "Execution error: " + err.toString() };
  }
  
  return createResponse(response);
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
