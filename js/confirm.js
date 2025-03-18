const GOOGLE_API_URL =
  "https://script.google.com/macros/s/AKfycby-4maO6TgE0h5X6WfuL0nM2KygFp1w2U1paOe6lZMhMABS9peKi3zOatkkB3FymctM/exec";

const scheduleData = JSON.parse(sessionStorage.getItem("scheduleData"));
const useInfo = JSON.parse(sessionStorage.getItem("user_info"));
const name = useInfo.name;
const email = useInfo.email;
const tbody = document.querySelector("#confirmTable tbody");

const timeSlots = ["Sáng (8h - 12h)", "Chiều (12h - 17h)", "Tối (17h - 23h)"];

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
        return `${name} - ${email} (${cell})`;
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
    body: JSON.stringify(updatedSchedule),
  })
    .then((response) => response.json())
    .then((data) => {
      loadingOverlay.style.display = "none";
      M.toast({ html: "Dữ liệu đã được lưu!", classes: "green darken-1" });
      setTimeout(() => {
        window.location.href = "calendar.html";
      }, 2000);
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
  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  let headerRow = document.getElementById("table-header");

  for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    let th = document.createElement("th");
    th.className = "th-day";
    th.textContent = `${d.getDay() !== 0 ? "Thứ" : ""} ${
      d.getDay() === 0 ? "Chủ Nhật" : d.getDay() + 1
    } (${d.toLocaleDateString("vi-VN")})`;
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
});
