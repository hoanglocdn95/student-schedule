const SHEET_INFO_NAME = {
  student: "User_Information",
  trainer: "Trainer_Information",
  admin: "Admin_Information",
};

const USER_KEYS = {
  student: {
    1: "name",
    3: "facebook",
    4: "timezone",
    5: "pteExamDate",
    6: "examBooked",
    7: "notes",
    8: "minHoursPerWeek",
    9: "maxHoursPerWeek",
    10: "minHoursPerSession",
    11: "maxHoursPerSession",
  },
  trainer: {
    1: "name",
    3: "facebook",
    4: "timezone",
  },
  admin: {
    1: "name",
    3: "facebook",
    4: "timezone",
  },
};

function LogToSheet(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
  logSheet.appendRow([new Date(), message]);
}

const formatDate = (date) =>
  Utilities.formatDate(
    date,
    Session.getScriptTimeZone() || "GMT",
    "dd/MM/yyyy"
  );

function getFormattedDate(date) {
  if (date instanceof Date) {
    const timeZone = Session.getScriptTimeZone();
    return Utilities.formatDate(date, timeZone, "yyyy-MM-dd");
  }
  return date;
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

function doPost(e) {
  try {
    // ✅ Xử lý request OPTIONS (Preflight CORS)
    if (e.parameter && e.parameter.options === "true") {
      return sendCorsResponse();
    }

    var data = JSON.parse(e.postData.contents);

    switch (data.type) {
      case "user_info":
        return handleUserInfoType(data, "student");
      case "trainer_info":
        return handleUserInfoType(data, "trainer");
      case "admin_info":
        return handleUserInfoType(data, "admin");
      case "login":
        return handleLogin(data);
      default:
        return handleLogin(data);
    }
  } catch (error) {
    return sendErrorResponse(error.message);
  }
}

function getUser(email, userType) {
  if (!email) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Missing email parameter" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_INFO_NAME[userType]
  );

  LogToSheet("SHEET_INFO_NAME[userType]: " + SHEET_INFO_NAME[userType]);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2] === email) {
      const userData = {};
      headers.forEach((_, index) => {
        if (USER_KEYS[userType][index]) {
          if (USER_KEYS[userType][index] === "pteExamDate") {
            userData[USER_KEYS[userType][index]] = getFormattedDate(
              data[i][index]
            );
          } else {
            userData[USER_KEYS[userType][index]] = data[i][index];
          }
        }
      });
      LogToSheet("userData[]: " + userData);

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, user: userData })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: "User not found" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function getAllUsers() {
  const trainerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_INFO_NAME.trainer
  );

  const trainerData = trainerSheet.getDataRange().getValues();
  const trainerHeaders = trainerData[1];

  let trainer = [];

  for (let i = 2; i < trainerData.length; i++) {
    let tData = {};

    trainerHeaders.forEach((_, index) => {
      if (USER_KEYS.trainer[index]) {
        tData[USER_KEYS.trainer[index]] = trainerData[i][index];
      }
    });

    trainer.push(tData);
  }

  LogToSheet("Total users fetched: " + trainer.length);

  const studentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    SHEET_INFO_NAME.student
  );

  const studentData = studentSheet.getDataRange().getValues();
  const studentHeaders = studentData[1];

  let student = [];

  for (let i = 2; i < studentData.length; i++) {
    let sData = {};

    studentHeaders.forEach((_, index) => {
      if (USER_KEYS.student[index]) {
        if (USER_KEYS.student[index] === "pteExamDate") {
          sData[USER_KEYS.student[index]] = getFormattedDate(
            studentData[i][index]
          );
        } else {
          sData[USER_KEYS.student[index]] = studentData[i][index];
        }
      }
    });

    student.push(sData);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: true, trainer, student })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const type = e.parameter.type;

  switch (type) {
    case "get_user":
      return getUser(e.parameter.email, "student");
    case "get_trainer":
      return getUser(e.parameter.email, "trainer");
    case "get_admin":
      return getUser(e.parameter.email, "admin");
    case "get_all_user":
      return getAllUsers();
    default:
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, message: "Missing type in parameter" })
      ).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUserInfoType(data, userType) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_INFO_NAME[userType]);

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

  var newRowData = [];
  if (userType === "student") {
    newRowData = [
      data.name,
      data.email,
      data.facebook,
      data.timezone,
      data.pteExamDate,
      data.examBooked ? "Đã book" : "Chưa book",
      data.notes,
      data.minHoursPerWeek,
      data.maxHoursPerWeek,
      data.minHoursPerSession,
      data.maxHoursPerSession,
    ];
  } else if (userType === "trainer" || userType === "admin") {
    newRowData = [data.name, data.email, data.facebook, data.timezone];
  }

  if (foundRow === -1) {
    sheet.appendRow(newRowData);
  } else {
    sheet.getRange(foundRow, 2, 1, newRowData.length).setValues([newRowData]);
  }

  return sendSuccessResponse();
}

// ✅ Hàm xử lý dữ liệu "login"
function handleLogin(requestData) {
  const userType = requestData.userType;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEET_INFO_NAME[userType]);

  if (!sheet) {
    return sendErrorResponse("sheet_not_found");
  }

  const passwordColumn = {
    student: 10,
    trainer: 3,
    admin: 3,
  };

  const email = requestData.email;
  const password = requestData.password;

  var lastRow = sheet.getLastRow();
  var dataRange = sheet.getRange(3, 3, lastRow - 1, 11);
  var userData = dataRange.getValues();

  for (let i = 0; i < userData.length; i++) {
    const storedEmail = userData[i][0];
    const storedPassword = userData[i][passwordColumn[userType]];

    if (storedEmail && storedEmail === email) {
      return storedPassword.toString() === password.toString()
        ? sendSuccessResponse()
        : sendErrorResponse("wrong_password");
    }
  }

  return sendErrorResponse("email_not_found");
}
