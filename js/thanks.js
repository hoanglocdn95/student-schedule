function backToCalendar() {
  window.location.href = "user.html";
}

const scheduleData = JSON.parse(sessionStorage.getItem("scheduleData"));
const useInfo = JSON.parse(sessionStorage.getItem("user_info"));
const { name, timezone } = useInfo;
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
  timeSlotCell.style =
    "background:rgba(5, 84, 180, 1); font-weight: bold; color: white;";
  tr.appendChild(timeSlotCell);

  // Thêm dữ liệu cho các ngày
  row.forEach((cell) => {
    const td = document.createElement("td");
    td.textContent = cell;
    td.style = "color: black; font-weight: bold";
    tr.appendChild(td);
  });

  tbody.appendChild(tr);
});

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
    window.location.href = "user.html";
  }
});
