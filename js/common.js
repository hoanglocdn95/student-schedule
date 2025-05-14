const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbxa7-dhPgo48Q3eVKnQjQNKI8oi4ykDfnTzi9hQDSfhGk2SrMBimc1yagzxXLULNs7tYQ/exec";
const SCHEDULE_API_URL =
  "https://script.google.com/macros/s/AKfycbx-9-NGKQT1BPE30EoY_s2bauw1OWfIMxX_cGMBPGDBPCvBPwLB4FfQE5yzjEJ3cqltEw/exec";

const SHEET_TYPE = {
  TRAINER: "TRAINER",
  STUDENT: "STUDENT",
};

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

function getWeekDatesFromDeviceTime() {
  const today = new Date();
  const currentDay = today.getDay(); // 0 (CN) -> 6 (Thứ 7)

  // Tính thứ 2 của tuần hiện tại
  const monday = new Date(today);
  const offset = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(today.getDate() + offset);

  // Nếu là thứ 7 hoặc CN thì lấy tuần sau
  if (currentDay === 6 || currentDay === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  // Tạo array chứa 7 ngày từ thứ 2 đến CN
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(formatDate(d));
  }

  return weekDates;
}

// Gọi hàm
const weekArray = getWeekDatesFromDeviceTime();
const fromDate = weekArray[0];
const toDate = weekArray[6];

const REMAIN_TIME_TO_EDIT = 5;
const userInfo = JSON.parse(sessionStorage.getItem("user_info"));
const isTrainer = userInfo ? userInfo.type === "trainer_info" : null;
let loadingOverlay = null;

const TIME_SLOTS = [
  "Sáng (8:00 - 12:00)*",
  "Chiều (12:00 - 17:00)",
  "Tối (17:00 - 24:00)",
];

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

function compareObjects(obj1, obj2) {
  if (!obj1 && obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  const commonKeys = keys1.filter((key) => keys2.includes(key));

  return commonKeys.every((key) => {
    let val1 = obj1[key];
    let val2 = obj2[key];

    if (key === "pteExamDate" && val1 && val2) {
      val1 = new Date(val1).toISOString().split("T")[0];
      val2 = new Date(val2).toISOString().split("T")[0];
    }

    if (typeof val1 === "number" || typeof val2 === "number") {
      val1 = val1.toString().replace(".", ",");
      val2 = val2.toString().replace(".", ",");
    }

    return val1 === val2;
  });
}

function mergeTimeRanges(timeRanges) {
  const ranges = timeRanges.split(", ").map((range) => {
    const [start, end] = range.split("-").map((time) => {
      const [hh, mm] = time.split(":").map(Number);
      return hh * 60 + mm;
    });
    return { start, end };
  });

  ranges.sort((a, b) => a.start - b.start);

  const merged = [];

  for (const range of ranges) {
    if (
      merged.length === 0 ||
      merged[merged.length - 1].end < range.start - 1
    ) {
      merged.push(range);
    } else {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        range.end
      );
    }
  }

  return merged
    .map(({ start, end }) => {
      const startH = Math.floor(start / 60);
      const startM = start % 60;
      const endH = Math.floor(end / 60);
      const endM = end % 60;
      return `${String(startH).padStart(2, "0")}:${String(startM).padStart(
        2,
        "0"
      )}-${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    })
    .join(", ");
}

function getSheetNames(sheetType) {
  return `${SHEET_TYPE[sheetType]}:${fromDate} - ${toDate}`;
}

const getCalendarByType = async (type) => {
  try {
    const response = await fetch(
      `${SCHEDULE_API_URL}?type=get_calendar&sheetName=${getSheetNames(type)}`,
      {
        redirect: "follow",
        method: "GET",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      }
    );

    const res = await response.json();
    return res.data;
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu ${type}:`, error);
  }
};

document.addEventListener("DOMContentLoaded", function () {
  loadingOverlay = document.getElementById("loadingOverlay");
});

function generateHeaders() {
  const days = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

  let headerRow = document.getElementById("table-header");

  weekArray.forEach((date, i) => {
    let th = document.createElement("th");

    const dayText = `${days[i]} (${date})`;

    th.textContent = dayText;
    th.className = "th-day";
    headerRow.appendChild(th);
  });
}
