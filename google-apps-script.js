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
