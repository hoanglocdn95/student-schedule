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
  };

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2] === email) {
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
  if (data && (data.length < startRow || data[0].length < startColumn)) {
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

    if (storedEmail && storedEmail === email) {
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
    var [existingUser, existingEmail] = extractUserData(line);

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
  const { scheduledData, timezone } = data;

  logToSheet("timezone:" + timezone);

  var currentDate = new Date();
  let dayOfWeek = currentDate.getDay();
  var monday = new Date(currentDate);
  monday.setDate(
    currentDate.getDate() -
      (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)
  );

  if (dayOfWeek === 6 || dayOfWeek === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  var formatDate = (date) =>
    Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
  var sheetName = `${formatDate(monday)} - ${formatDate(sunday)}`;
  var sheetNameWithTimezone = `${formatDate(monday)} - ${formatDate(
    sunday
  )} - ${timezone}`;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet =
    ss.getSheetByName(sheetName) ||
    createSheetWithHeaders(ss, sheetName, monday, sunday);

  // filter Timezone from data
  var sheetWithTimezone =
    ss.getSheetByName(sheetNameWithTimezone) ||
    createSheetWithHeadersWithTimezone(
      ss,
      sheetNameWithTimezone,
      monday,
      sunday,
      timezone
    );

  generateSheetBody(2, 2, scheduledData, sheet);
  generateSheetBody(4, 2, scheduledData, sheetWithTimezone);

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

  // Ghi tiêu đề vào hàng đầu tiên
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // Định dạng header: Chữ in đậm, căn giữa, màu nền #f2f2f2 (trừ cột đầu)
  headerRange.setFontWeight("bold").setHorizontalAlignment("center");
  headerRange.offset(0, 1).setBackground("#f2f2f2"); // Đổi màu header (trừ cột đầu)

  // Tạo hàng "Buổi sáng", "Buổi chiều", "Buổi tối"
  var periods = [
    "Sáng (8:00 - 12:00)*",
    "Chiều (12:00 - 17:00)",
    "Tối (17:00 - 23:00)",
  ];
  for (var i = 0; i < periods.length; i++) {
    sheet.getRange(i + 2, 1).setValue(periods[i]);
  }

  // Định dạng cột đầu tiên: In đậm, căn giữa, nền #07bdd0
  var firstColumnRange = sheet.getRange(1, 1, periods.length + 1, 1);
  firstColumnRange
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground("#07bdd0");

  // Định dạng viền cho toàn bộ bảng
  var tableRange = sheet.getRange(1, 1, periods.length + 1, headers.length);
  tableRange.setBorder(true, true, true, true, true, true);

  // Điều chỉnh độ rộng cột tự động, giới hạn tối đa 300px
  for (var col = 1; col <= headers.length; col++) {
    sheet.autoResizeColumn(col);
    var width = sheet.getColumnWidth(col);
    if (width > 300) {
      sheet.setColumnWidth(col, 600);
    }
  }

  // Cho phép nội dung trong ô xuống hàng
  tableRange.setWrap(true);

  return sheet;
}

function createSheetWithHeadersWithTimezone(
  ss,
  sheetName,
  monday,
  sunday,
  timezone
) {
  var sheet = ss.insertSheet(sheetName);

  var dayNames = [
    "Chủ Nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  var titleRange = sheet.getRange(1, 1, 1, 3);
  titleRange.merge();
  titleRange
    .setValue(timezone)
    .setFontWeight("bold")
    .setFontSize(20)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBackground("#FF9800") // Màu cam
    .setFontColor("#FFFFFF"); // Chữ trắng

  // Hàng thứ 2 để trống
  sheet.getRange(2, 1, 1, 10).setValue("");

  // Tạo tiêu đề cột bắt đầu từ hàng 3
  var headers = ["Buổi"];
  for (var d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    var dayOfWeek = dayNames[d.getDay()];
    var formattedDate = Utilities.formatDate(
      new Date(d),
      Session.getScriptTimeZone(),
      "dd/MM/yyyy"
    );
    headers.push(`${dayOfWeek} (${formattedDate})`);
  }

  // Ghi tiêu đề vào hàng 3
  var headerRange = sheet.getRange(3, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // Định dạng header: In đậm, căn giữa, nền #f2f2f2 (trừ cột đầu)
  headerRange
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  headerRange.offset(0, 1).setBackground("#f2f2f2");

  // Tạo các hàng "Buổi sáng", "Buổi chiều", "Buổi tối"
  var periods = [
    "Sáng (8:00 - 12:00)*",
    "Chiều (12:00 - 17:00)",
    "Tối (17:00 - 23:00)",
  ];
  for (var i = 0; i < periods.length; i++) {
    sheet.getRange(i + 4, 1).setValue(periods[i]);
  }

  // Định dạng cột đầu tiên: In đậm, căn giữa, nền #07bdd0
  var firstColumnRange = sheet.getRange(3, 1, periods.length + 1, 1);
  firstColumnRange
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBackground("#07bdd0");

  // Định dạng viền cho toàn bộ bảng
  var tableRange = sheet.getRange(3, 1, periods.length + 1, headers.length);
  tableRange.setBorder(true, true, true, true, true, true);

  // Điều chỉnh độ rộng cột tự động, tối đa 300px
  for (var col = 1; col <= headers.length; col++) {
    sheet.autoResizeColumn(col);
    if (sheet.getColumnWidth(col) > 300) {
      sheet.setColumnWidth(col, 300);
    }
  }

  // Căn giữa theo chiều dọc cho toàn bộ nội dung
  sheet.getDataRange().setVerticalAlignment("middle");

  return sheet;
}

function generateSheetBody(startRow, startColumn, sheetData, currentSheet) {
  var numRows = sheetData.length;
  var numCols = sheetData[0].length;

  var existingData = currentSheet
    .getRange(startRow, startColumn, numRows, numCols)
    .getValues();

  for (var i = 0; i < numRows; i++) {
    for (var j = 0; j < numCols; j++) {
      const newData = sheetData[i][j].trim();
      if (!newData) continue;

      const [newUser, newEmail, newTimes] = extractUserData(newData);
      const cellContent = existingData[i][j].trim();

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

  currentSheet
    .getRange(startRow, startColumn, numRows, numCols)
    .setValues(existingData);
}
