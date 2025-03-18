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

function getUser(email) {
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

function getCalendar() {
  var currentDate = new Date();

  var monday = new Date(currentDate);
  monday.setDate(
    currentDate.getDate() -
      (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)
  );

  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  var formatDate = (date) =>
    Utilities.formatDate(
      date,
      Session.getScriptTimeZone() || "GMT",
      "dd/MM/yyyy"
    );
  var sheetName = `${formatDate(monday)} - ${formatDate(sunday)}`;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: "Sheet not found" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var startRow = 2;
  var startColumn = 2;

  var data = sheet.getDataRange().getValues();
  if (data.length < startRow || data[0].length < startColumn) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: "Invalid sheet structure" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var numRows = data.length - (startRow - 1); // Giới hạn số dòng hợp lệ
  var numCols = data[0].length - (startColumn - 1);

  var existingData = sheet
    .getRange(startRow, startColumn, numRows, numCols)
    .getValues();

  return ContentService.createTextOutput(
    JSON.stringify({ success: true, data: existingData })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const type = e.parameter.type;

  if (type === "get_calendar") {
    return getCalendar();
  }

  if (type === "get_user") {
    return getUser(e.parameter.email);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "Missing type in parameter" })
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

/**
 * Tách thông tin từ dữ liệu mới.
 */
function extractUserData(dataString) {
  var match = dataString.match(/^(.+?) - (.+?) \((.+)\)$/);
  if (match) {
    return [match[1].trim(), match[2].trim(), match[3].trim()];
  }
  return ["Unknown", "Unknown", ""];
}

/**
 * Cập nhật dữ liệu trong ô dựa trên email.
 */
function updateCellData(cellContent, newUser, newEmail, newTimes) {
  var lines = cellContent.split("\n");
  var updated = false;

  var newLines = lines.map((line) => {
    var [existingUser, existingEmail, existingTimes] = extractUserData(line);

    if (existingEmail === newEmail) {
      updated = true;
      return `${existingUser} - ${existingEmail} (${newTimes})`;
    }
    return line;
  });

  if (!updated) {
    newLines.push(`${newUser} - ${newEmail} (${newTimes})`);
  }

  return newLines.join("\n");
}

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
      var newData = data[i][j].trim();
      if (!newData) continue;

      var [newUser, newEmail, newTimes] = extractUserData(newData);
      var cellContent = existingData[i][j].trim();

      if (cellContent) {
        var updatedContent = updateCellData(
          cellContent,
          newUser,
          newEmail,
          newTimes
        );
        existingData[i][j] = updatedContent;
      } else {
        existingData[i][j] = `${newUser} - ${newEmail} (${newTimes})`;
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

function createSheetWithHeaders(ss, sheetName, monday, sunday) {
  var sheet = ss.insertSheet(sheetName);

  // Danh sách tên ngày trong tuần
  var dayNames = [
    "Chủ Nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  // Tạo tiêu đề cột
  var headers = ["Buổi"];
  for (var d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    var dayOfWeek = dayNames[d.getDay()]; // Lấy tên thứ trong tuần
    var formattedDate = Utilities.formatDate(
      new Date(d),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );
    headers.push(`${dayOfWeek} (${formattedDate})`);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]); // Ghi header hàng 1

  // Tạo hàng "Buổi sáng", "Buổi chiều", "Buổi tối"
  var periods = [
    "Sáng (8:00 - 12:00)*",
    "Chiều (12:00 - 17:00)",
    "Tối (17:00 - 23:00)",
  ];
  for (var i = 0; i < periods.length; i++) {
    sheet.getRange(i + 2, 1).setValue(periods[i]); // Ghi header buổi sáng, chiều, tối
  }

  return sheet;
}
