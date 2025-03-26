const GOOGLE_API_URL =
  "https://script.google.com/macros/s/AKfycbyS__brQJCXDO1AOteOV1BZ1eCfRlI-3pGoFCMWFXIXsdHh4LqK7FBaplsxnR4WFhqtXA/exec";

const scheduleData = JSON.parse(sessionStorage.getItem("scheduleData"));
const useInfo = JSON.parse(sessionStorage.getItem("user_info"));
const { name, timezone, type } = useInfo;
const isTrainer = type === "trainer_info";

if (isTrainer) {
  document.getElementById("navItem").innerHTML =
    '<a href="trainer.html">Trainer</a>';
} else {
  document.getElementById("navItem").innerHTML = '<a href="user.html">User</a>';
}

const email = sessionStorage.getItem("user_email");
const tbody = document.querySelector("#confirmTable tbody");

const timeSlots = [
  "Sáng (8:00 - 12:00)*",
  "Chiều (12:00 - 17:00)",
  "Tối (17:00 - 23:00)",
];

scheduleData.forEach((row, index) => {
  const tr = document.createElement("tr");

  // Thêm cột "Buổi"
  const timeSlotCell = document.createElement("td");
  timeSlotCell.textContent = timeSlots[index];
  timeSlotCell.style = "background: #07bcd0; font-weight: bold;";
  tr.appendChild(timeSlotCell);

  // Thêm dữ liệu cho các ngày
  row.forEach((cell) => {
    const td = document.createElement("td");
    td.textContent = cell;
    tr.appendChild(td);
  });

  tbody.appendChild(tr);
});

function goBack() {
  window.location.href = "calendar.html";
}

function addUserInfoToSchedule(scheduleData) {
  return scheduleData.map((row) =>
    row.map((cell) => {
      if (cell.trim() !== "") {
        return `${name} - ${timezone} - ${email} (${cell})`;
      }
      return cell;
    })
  );
}

function submitToGoogleSheets() {
  const updatedSchedule = addUserInfoToSchedule(scheduleData);
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";

  fetch(GOOGLE_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      timezone,
      type: isTrainer ? "handle_trainer_calendar" : "handle_student_calendar",
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      loadingOverlay.style.display = "none";
      M.toast({ html: "Dữ liệu đã được lưu!", classes: "green darken-1" });
      setTimeout(() => {
        window.location.href = "thanks.html";
      }, 1000);
    })
    .catch((error) => {
      console.error("error:", error);
    });
}

function generateHeaders() {
  let today = new Date();
  let dayOfWeek = today.getDay();
  let monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  if (dayOfWeek === 6 || dayOfWeek === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // Tìm ngày Chủ Nhật

  let headerRow = document.getElementById("table-header");

  for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    let th = document.createElement("th");
    th.textContent = `${
      d.getDay() === 0 ? "Chủ Nhật" : `Thứ ${d.getDay() + 1}`
    } (${d.toLocaleDateString("vi-VN")})`;
    th.className = "th-day";
    headerRow.appendChild(th);
  }
}

// Gọi hàm khi trang tải xong
window.onload = function () {
  generateHeaders();
};

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
  if (!sessionStorage.getItem("user_info")) {
    window.location.href = isTrainer ? "trainer.html" : "user.html";
  }
});

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
