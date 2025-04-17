let isAllowEdit = true;

let currentScheduledData = Array.from({ length: 3 }, () => Array(7).fill(""));

if (isTrainer) {
  document.getElementById("navItem").innerHTML =
    '<a href="trainer.html">Trainer</a>';
} else {
  document.getElementById("navItem").innerHTML = '<a href="user.html">User</a>';
}

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

function generateTableBody() {
  let tbody = document.getElementById("table-body");
  let periods = [
    { label: "Sáng (8:00 - 12:00)*", start: 8, end: 12 },
    { label: "Chiều (12:00 - 17:00)", start: 12, end: 17 },
    { label: "Tối (17:00 - 23:00)", start: 17, end: 23 },
  ];

  let now = new Date();
  let currentDay = now.getDay();
  let currentHour = now.getHours();
  let lockHour = currentHour + REMAIN_TIME_TO_EDIT;

  periods.forEach((period, index) => {
    let tr = document.createElement("tr");
    let td = document.createElement("td");

    td.textContent = period.label;
    td.style = "background: #07bcd0; font-weight: bold;";
    tr.appendChild(td);

    for (let i = 1; i <= 7; i++) {
      let tdInput = document.createElement("td");
      let textarea = document.createElement("textarea");

      if (isAllowEdit) {
        let isLocked =
          ![6, 0].includes(currentDay) &&
          (i < currentDay || (i === currentDay && lockHour >= period.start));

        if (isLocked) {
          textarea.disabled = true;
          textarea.style.background = "#ddd";
          textarea.style.cursor = "not-allowed";
        }

        textarea.textContent = currentScheduledData[index][i - 1];
        tdInput.appendChild(textarea);
      } else {
        tdInput.textContent = currentScheduledData[index][i - 1];
      }

      tr.appendChild(tdInput);
    }

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  await initTableData();
  generateHeaders();
  generateTableBody();
  defineEditingPermission();
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
  if (!isAllowEdit) return;
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
  const scheduleData = JSON.parse(sessionStorage.getItem("scheduleData"));
  const email = sessionStorage.getItem("user_email");

  loadingOverlay.style.display = "flex";

  if (!email) {
    console.error("Không tìm thấy email trong sessionStorage.");
    return;
  }

  try {
    let response = await fetch(
      `${SCHEDULE_API_URL}?type=get_calendar&sheetName=${getSheetNames(
        isTrainer ? SHEET_TYPE.TRAINER : SHEET_TYPE.STUDENT
      )}`,
      {
        redirect: "follow",
        method: "GET",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      }
    );

    const res = await response.json();
    loadingOverlay.style.display = "none";
    const data = res.data;
    console.log(" initTableData ~ data:", data);

    let dataTimes = "";

    if (data && Array.isArray(data) && data.length > 0) {
      dataTimes = data
        .map((row) =>
          row
            .map((cell) => {
              return cell
                .split("\n")
                .map((entry) => entry.trim())
                .filter((entry) => entry.includes(`- ${email} (`))
                .map((entry) => {
                  console.log(" .map ~ entry:", entry);

                  const res = entry.match(/\(([^)]+)\)/g)[1].slice(1, -1);
                  console.log(" .map ~ res:", res);
                  return res;
                })
                .filter(Boolean)
                .join("");
            })
            .join("")
        )
        .join("");
    }

    console.log(" initTableData ~ dataTimes:", dataTimes);

    if (!dataTimes && !scheduleData) {
      console.error("Không có dữ liệu hoặc dữ liệu không hợp lệ.");
      return;
    }
    const dataTable = data ? data : scheduleData;

    for (let i = 0; i < dataTable.length; i++) {
      for (let j = 0; j < dataTable[i].length; j++) {
        if (scheduleData) {
          currentScheduledData[i][j] = scheduleData[i][j];
        } else {
          let cellData = dataTable[i][j].trim();

          if (!cellData) continue;
          console.log(" initTableData ~ cellData:", cellData);

          let matchingTimes = cellData
            .split("\n")
            .map((entry) => entry.trim())
            .filter((entry) => entry.includes(`- ${email} (`))
            .map((entry) => entry.match(/\(([^)]+)\)/g)[1].slice(1, -1))
            .filter(Boolean);

          if (matchingTimes.length > 0) {
            currentScheduledData[i][j] = matchingTimes.join(", ");
          }
        }
      }
    }

    if (!dataTimes || isTrainer) {
      isAllowEdit = true;
    } else {
      isAllowEdit = false;
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    loadingOverlay.style.display = "none";
  }
}

const defineEditingPermission = () => {
  document.getElementById("btn-send").style.display = isAllowEdit
    ? "block"
    : "none";

  if (isAllowEdit) {
    document.getElementById("register-calendar-guide").style.display = "block";
  } else {
    document.getElementById("registered-calendar").style.display = "block";

    document.getElementById(
      "range-time"
    ).innerHTML = `Từ <b>${fromDate}</b> đến <b>${toDate}</b>`;
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
  if (!userInfo) {
    window.location.href = isTrainer ? "trainer.html" : "user.html";
  }
});
