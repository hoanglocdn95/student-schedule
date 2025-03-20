const GOOGLE_API_URL =
  "https://script.google.com/macros/s/AKfycby-4maO6TgE0h5X6WfuL0nM2KygFp1w2U1paOe6lZMhMABS9peKi3zOatkkB3FymctM/exec";

function generateHeaders() {
  let today = new Date();
  let dayOfWeek = today.getDay();
  let monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  let headerRow = document.getElementById("table-header");

  for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    let th = document.createElement("th");
    th.textContent = `Thứ ${
      d.getDay() === 0 ? "Chủ Nhật" : d.getDay() + 1
    } (${d.toLocaleDateString("vi-VN")})`;
    th.className = "th-day";
    headerRow.appendChild(th);
  }
}

function generateTableBody() {
  let tbody = document.getElementById("table-body");
  let periods = [
    "Sáng (8:00 - 12:00)*",
    "Chiều (12:00 - 17:00)",
    "Tối (17:00 - 23:00)",
  ];

  periods.forEach((period) => {
    let tr = document.createElement("tr");
    let td = document.createElement("td");
    td.textContent = period;
    td.style = "background: #07bcd0; font-weight: bold;";
    tr.appendChild(td);

    for (let i = 1; i <= 7; i++) {
      let tdInput = document.createElement("td");
      let textarea = document.createElement("textarea");
      tdInput.appendChild(textarea);
      tr.appendChild(tdInput);
    }
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  generateHeaders();
  generateTableBody();
  await initTableData();
});

function validateScheduleData() {
  const timeRangeRegex =
    /^([0-9]{1,2}):([0-5][0-9])\s*-\s*([0-9]{1,2}):([0-5][0-9])$/;
  let errors = [];
  let errorContainer = document.getElementById("error-container");
  errorContainer.textContent = "";

  document.querySelectorAll("textarea").forEach((textarea) => {
    textarea.classList.remove("error");
  });

  let isEmptyCalendar = true;

  document.querySelectorAll("tbody tr").forEach((row, rowIndex) => {
    row.querySelectorAll("textarea").forEach((textarea, colIndex) => {
      if (textarea.value.trim() !== "") {
        if (isEmptyCalendar) isEmptyCalendar = false;

        const values = textarea.value.split(",").map((v) => v.trim());
        for (const value of values) {
          const match = value.match(timeRangeRegex);
          if (!match) {
            errors.push(
              `Lỗi tại hàng ${rowIndex + 1}, cột ${
                colIndex + 1
              }: "${value}" không đúng định dạng hh:mm - hh:mm.`
            );
            textarea.classList.add("error");
            continue;
          }

          // Chuyển đổi giờ phút thành số phút để so sánh
          let startHour = parseInt(match[1], 10);
          let startMinute = parseInt(match[2], 10);
          let endHour = parseInt(match[3], 10);
          let endMinute = parseInt(match[4], 10);

          let startTime = startHour * 60 + startMinute;
          let endTime = endHour * 60 + endMinute;

          if (startTime >= endTime) {
            errors.push(
              `Lỗi tại hàng ${rowIndex + 1}, cột ${
                colIndex + 1
              }: Thời gian kết thúc phải lớn hơn thời gian bắt đầu ("${value}").`
            );
            textarea.classList.add("error");
            continue;
          }

          // Xác định khoảng thời gian hợp lệ theo rowIndex
          let minTime, maxTime;
          if (rowIndex === 0) {
            minTime = 8 * 60; // 8:00
            maxTime = 12 * 60; // 12:00
          } else if (rowIndex === 1) {
            minTime = 12 * 60; // 12:00
            maxTime = 17 * 60; // 17:00
          } else if (rowIndex === 2) {
            minTime = 17 * 60; // 17:00
            maxTime = 23 * 60; // 23:00
          } else {
            continue; // Bỏ qua các dòng không được quy định
          }

          if (startTime < minTime || endTime > maxTime) {
            errors.push(
              `Lỗi tại hàng ${rowIndex + 1}, cột ${
                colIndex + 1
              }: Thời gian "${value}" không nằm trong khoảng cho phép (${Math.floor(
                minTime / 60
              )}:${String(minTime % 60).padStart(2, "0")} - ${Math.floor(
                maxTime / 60
              )}:${String(maxTime % 60).padStart(2, "0")}).`
            );
            textarea.classList.add("error");
          }
        }
      }
    });
  });

  if (errors.length > 0) {
    errorContainer.textContent = errors.join("\n");
    // M.toast({ html: errorContainer, classes: "red darken-1" });
    return false;
  }

  if (isEmptyCalendar) {
    errorContainer.textContent = "Bạn quên điền thời gian rảnh rồi";
    return false;
  }

  return true;
}

function submitSchedule() {
  if (!validateScheduleData()) {
    return;
  }

  const tableData = [];
  document.querySelectorAll("tbody tr").forEach((row) => {
    const rowData = [];
    row.querySelectorAll("textarea").forEach((textarea) => {
      rowData.push(textarea.value.trim());
    });
    tableData.push(rowData);
  });

  sessionStorage.setItem("scheduleData", JSON.stringify(tableData));
  window.location.href = "confirm.html";
}

async function initTableData() {
  const email = sessionStorage.getItem("user_email");
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";

  if (!email) {
    console.error("Không tìm thấy email trong sessionStorage.");
    return;
  }

  try {
    let response = await fetch(`${GOOGLE_API_URL}?type=get_calendar`, {
      redirect: "follow",
      method: "GET",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    const res = await response.json();
    loadingOverlay.style.display = "none";
    const data = res.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("Không có dữ liệu hoặc dữ liệu không hợp lệ.");
      return;
    }

    let tableRows = document.querySelectorAll("tbody tr");

    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        let cellData = data[i][j].trim();

        if (!cellData) continue;

        let matchingTimes = cellData
          .split("\n")
          .map((entry) => entry.trim())
          .filter((entry) => entry.includes(`- ${email} (`))
          .map((entry) => {
            return entry.match(/\(([^)]+)\)/)[1];
          })
          .filter(Boolean);

        if (matchingTimes.length > 0 && tableRows[i]?.cells[j + 1]) {
          tableRows[i].cells[j + 1].querySelector("textarea").value =
            matchingTimes.join(", ");
        }
      }
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    loadingOverlay.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
  if (!sessionStorage.getItem("user_info")) {
    window.location.href = "user.html";
  }
});
