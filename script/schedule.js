const sheetInfoName = {
  student: "User_Information",
  trainer: "Trainer_Information",
};

const firstColColor = {
  student: {
    bg: "#07bdd0",
    text: "#000000",
  },
  trainer: {
    bg: "#ff9700",
    text: "#ffffff",
  },
};

const formatDate = (date) =>
  Utilities.formatDate(
    date,
    Session.getScriptTimeZone() || "GMT",
    "dd/MM/yyyy"
  );

function getFormattedDate(date) {
  if (date instanceof Date) {
    const timeZone = Session.getScriptTimeZone();
    return Utilities.formatDate(date, timeZone, "yyyy-MM-dd"); // Giữ nguyên ngày theo múi giờ script
  }
  return date; // Nếu không phải Date, trả về nguyên gốc
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

// ✅ Hàm gửi phản hồi thành công
function sendSuccessResponse() {
  return sendJsonResponse({ result: "success", status: "ok" });
}

function LogToSheet(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  logSheet.appendRow([new Date(), message]);
}

// ===============

function doPost(e) {
  try {
    if (e.parameter && e.parameter.options === "true") {
      return sendCorsResponse();
    }

    var data = JSON.parse(e.postData.contents);

    if (data.type === "handle_student_calendar") {
      return handleCalendarType(data, "student");
    }

    if (data.type === "handle_trainer_calendar") {
      return handleCalendarType(data, "trainer");
    }
  } catch (error) {
    return sendErrorResponse(error.message);
  }
}

function doGet(e) {
  const type = e.parameter.type;
  const sheetName = e.parameter.sheetName;

  if (type === "get_calendar") {
    return getCalendar(sheetName);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "Missing type in parameter" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function getCalendar(sheetName) {
  try {
    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: "Sheet not found" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const startRow = 4;
    const startColumn = 2;

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < startRow || lastCol < startColumn) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: "Invalid sheet size" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const numRows = lastRow - (startRow - 1);
    const numCols = lastCol - (startColumn - 1);

    const data = sheet
      .getRange(startRow, startColumn, numRows, numCols)
      .getValues();

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, data })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function extractUserData(dataString) {
  var match = dataString.match(/^(.+?) - (.+?) - (.+?) \((.+)\)$/);
  if (match) {
    const name = match[1].trim();
    const timezone = match[2].trim();
    const email = match[3].trim();
    const times = match[4].trim();
    return {
      name,
      timezone,
      email,
      times,
    };
  }
  return {
    name: "Unknown",
    timezone: "Unknown",
    email: "Unknown",
    times: "",
  };
}

function handleCalendarType(data, userType) {
  const { scheduledData, currentEmail } = data;

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

  const fromTime = formatDate(monday);
  const toTime = formatDate(sunday);

  var sheetName = `${userType.toUpperCase()}:${fromTime} - ${toTime}`;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet =
    ss.getSheetByName(sheetName) ||
    createSheetWithHeaders(ss, sheetName, monday, sunday, userType);

  generateSheetBody(4, 2, scheduledData, sheet, currentEmail);

  return sendSuccessResponse();
}

function createSheetWithHeaders(ss, sheetName, monday, sunday, userType) {
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

  var titleRange = sheet.getRange(1, 1, 1, 3);
  titleRange.merge();
  titleRange
    .setValue(`${userType.toUpperCase()}`)
    .setFontWeight("bold")
    .setFontSize(20)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBackground(firstColColor[userType].bg)
    .setFontColor(firstColColor[userType].text);

  // Hàng thứ 2 để trống
  sheet.getRange(2, 1, 1, 10).setValue("");

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
  var headerRange = sheet.getRange(3, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // Định dạng header: Chữ in đậm, căn giữa, màu nền #f2f2f2 (trừ cột đầu)
  headerRange.setFontWeight("bold").setHorizontalAlignment("center");
  headerRange
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  headerRange.offset(0, 1).setBackground("#f2f2f2");

  // Tạo hàng "Buổi sáng", "Buổi chiều", "Buổi tối"
  var periods = [
    "Sáng (8:00 - 12:00)*",
    "Chiều (12:00 - 17:00)",
    "Tối (17:00 - 24:00)",
  ];
  for (var i = 0; i < periods.length; i++) {
    sheet.getRange(i + 4, 1).setValue(periods[i]);
  }

  var firstColumnRange = sheet.getRange(3, 1, periods.length + 1, 1);
  firstColumnRange
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(firstColColor[userType].bg)
    .setFontColor(firstColColor[userType].text);

  // Định dạng viền cho toàn bộ bảng
  var tableRange = sheet.getRange(3, 1, periods.length + 1, headers.length);
  tableRange.setBorder(true, true, true, true, true, true);

  // Điều chỉnh độ rộng cột tự động, giới hạn tối đa 300px
  for (var col = 1; col <= headers.length; col++) {
    sheet.autoResizeColumn(col);
    if (sheet.getColumnWidth(col) > 300) {
      sheet.setColumnWidth(col, 600);
    }
  }

  // Cho phép nội dung trong ô xuống hàng
  tableRange.setWrap(true);
  sheet.getDataRange().setVerticalAlignment("middle");

  return sheet;
}

function updateCellData(cellContent, newUser, newTimezone, newEmail, newTimes) {
  var lines = cellContent.split("\n");
  var updated = false;

  var newLines = lines.map((line) => {
    const {
      name: existingUser,
      timezone: existingTimezone,
      email: existingEmail,
      times: existingTimes,
    } = extractUserData(line);

    if (existingEmail && newEmail && existingEmail === newEmail) {
      updated = true;
      return `${newUser} - ${newTimezone} - ${existingEmail} (${newTimes})`;
    }
    return line;
  });

  if (!updated) {
    newLines.push(`${newUser} - ${newTimezone} - ${newEmail} (${newTimes})`);
  }

  return newLines.join("\n");
}

function generateSheetBody(
  startRow,
  startColumn,
  sheetData,
  currentSheet,
  currentEmail
) {
  if (!sheetData.length || !sheetData[0]?.length) return;

  const numRows = sheetData.length;
  const numCols = sheetData[0].length;

  const existingData = currentSheet
    .getRange(startRow, startColumn, numRows, numCols)
    .getValues();

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const newData = sheetData[i][j] ? sheetData[i][j].trim() : "";
      let cellContent = existingData[i][j] ? existingData[i][j].trim() : "";

      LogToSheet("~ cellContent: ", cellContent);

      if (!newData) {
        const updatedLines = cellContent
          .split("\n")
          .filter((line) => !line.includes(currentEmail))
          .join("\n");

        existingData[i][j] = updatedLines.trim() || "";

        continue;
      }

      const {
        name: newUser,
        timezone: newTimezone,
        email: newEmail,
        times: newTimes,
      } = extractUserData(newData) || {};

      LogToSheet(
        `newUser: ${newUser} ~ newTimezone: ${newTimezone} newEmail: ${newEmail} newTimes: ${newTimes}`
      );

      if (cellContent) {
        existingData[i][j] = updateCellData(
          cellContent,
          newUser,
          newTimezone,
          newEmail,
          newTimes
        );
      } else {
        existingData[i][
          j
        ] = `${newUser} - ${newTimezone} - ${newEmail} (${newTimes})`;
      }
    }
  }

  // Cập nhật lại Sheet
  currentSheet
    .getRange(startRow, startColumn, numRows, numCols)
    .setValues(existingData)
    .setWrap(true);

  // Resize hàng & cột
  for (let r = startRow; r < startRow + numRows; r++) {
    currentSheet.autoResizeRow(r);
  }
  for (let c = startColumn; c < startColumn + numCols; c++) {
    currentSheet.autoResizeColumn(c);
  }
}
