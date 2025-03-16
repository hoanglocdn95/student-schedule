function doPost(e) {
  try {
    // ✅ Xử lý request OPTIONS (Preflight CORS)
    if (e.parameter && e.parameter.options === "true") {
      return sendCorsResponse();
    }

    var data = JSON.parse(e.postData.contents);

    switch (data.type) {
      case "user_info":
        return handleUserInfoType(data);
      case "login":
        return handleLogin(data);
      default:
        return handleCalendarType(data);
    }
  } catch (error) {
    return sendErrorResponse(error.message);
  }
}

function doGet(e) {
  const email = e.parameter.email;
  logToSheet("Email: " + email);
  if (!email) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Missing email parameter" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("User_Information");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const userKeys = {
    1: "name",
    3: "timezone",
    4: "pteExamDate",
    5: "examBooked",
    6: "notes",
    7: "minHoursPerWeek",
    8: "maxHoursPerWeek",
    9: "minHoursPerSession",
    10: "maxHoursPerSession",
    10: "maxHoursPerSession",
  };

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email) {
      const userData = {};
      headers.forEach((_, index) => {
        if (userKeys[index]) {
          logToSheet(`${userKeys[index]}: ${data[i][index]}`);
          userData[userKeys[index]] = data[i][index];
        }
      });

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, user: userData })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "User not found" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ✅ Hàm xử lý CORS
function sendCorsResponse(message = "OK") {
  var output = ContentService.createTextOutput(message);
  output.setMimeType(ContentService.MimeType.TEXT);

  return addCorsHeaders(output);
}

// ✅ Hàm gửi phản hồi JSON (Hỗ trợ CORS)
function sendJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  return addCorsHeaders(output);
}

// ✅ Hàm gửi phản hồi lỗi
function sendErrorResponse(status) {
  return sendJsonResponse({ result: "error", status });
}

// ✅ Hàm thêm CORS headers
function addCorsHeaders(response) {
  response.setContent(JSON.stringify({ message: response.getContent() }));
  return response;
}

// ✅ Hàm xử lý dữ liệu "user_info"
function handleUserInfoType(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("User_Information");

  if (!sheet) {
    return sendErrorResponse("sheet_not_found");
  }

  var lastRow = sheet.getLastRow();
  var dataRange = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn());
  var existingData = dataRange.getValues();

  var emailColIndex = 2;
  var existingEmails = existingData.map((row) => row[emailColIndex]);

  var foundRow = -1;
  for (var i = 0; i < existingEmails.length; i++) {
    if (existingEmails[i] === data.email) {
      foundRow = i + 3;
      break;
    }
  }

  var newRowData = [
    data.name,
    data.email,
    data.timezone,
    data.pteExamDate,
    data.examBooked ? "Đã book" : "Chưa book",
    data.notes,
    data.minHoursPerWeek,
    data.maxHoursPerWeek,
    data.minHoursPerSession,
    data.maxHoursPerSession,
  ];

  if (foundRow === -1) {
    sheet.appendRow(newRowData);
  } else {
    sheet.getRange(foundRow, 2, 1, newRowData.length).setValues([newRowData]);
  }

  return sendSuccessResponse();
}

// ✅ Hàm xử lý dữ liệu "login"
function handleLogin(requestData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("User_Information");

  if (!sheet) {
    return sendErrorResponse("sheet_not_found");
  }

  var email = requestData.email;
  var password = requestData.password;

  var lastRow = sheet.getLastRow();
  var dataRange = sheet.getRange(3, 3, lastRow - 1, 10);
  var userData = dataRange.getValues();

  for (var i = 0; i < userData.length; i++) {
    var storedEmail = userData[i][0];
    var storedPassword = userData[i][9];

    if (storedEmail === email) {
      return storedPassword.toString() === password.toString()
        ? sendSuccessResponse()
        : sendErrorResponse("wrong_password");
    }
  }

  return sendErrorResponse("email_not_found");
}

// ✅ Hàm xử lý dữ liệu "calendar"
function handleCalendarType(data) {
  var currentDate = new Date();
  var monday = new Date(currentDate);
  monday.setDate(
    currentDate.getDate() -
      (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)
  );
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  var formatDate = (date) =>
    Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
  var sheetName = `${formatDate(monday)} - ${formatDate(sunday)}`;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet =
    ss.getSheetByName(sheetName) ||
    createSheetWithHeaders(ss, sheetName, monday, sunday);

  var startRow = 2;
  var startColumn = 2;
  var numRows = data.length;
  var numCols = data[0].length;

  var existingData = sheet
    .getRange(startRow, startColumn, numRows, numCols)
    .getValues();

  for (var i = 0; i < numRows; i++) {
    for (var j = 0; j < numCols; j++) {
      if (existingData[i][j]) {
        existingData[i][j] += ", " + data[i][j];
      } else {
        existingData[i][j] = data[i][j];
      }
    }
  }

  sheet
    .getRange(startRow, startColumn, numRows, numCols)
    .setValues(existingData);

  return sendSuccessResponse();
}

// ✅ Hàm gửi phản hồi thành công
function sendSuccessResponse() {
  return sendJsonResponse({ result: "success", status: "ok" });
}

function logToSheet(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  logSheet.appendRow([new Date(), message]);
}
