const scheduleData = JSON.parse(sessionStorage.getItem("scheduleData"));
const { name, timezone } = userInfo;

if (isTrainer) {
  document.getElementById("navItem").innerHTML =
    '<a href="trainer.html">Trainer</a>';
} else {
  document.getElementById("navItem").innerHTML = '<a href="user.html">User</a>';
}

const email = sessionStorage.getItem("user_email");
const tbody = document.querySelector("#confirmTable tbody");

scheduleData.forEach((row, index) => {
  const tr = document.createElement("tr");

  // Thêm cột "Buổi"
  const timeSlotCell = document.createElement("td");
  timeSlotCell.textContent = TIME_SLOTS[index];
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
        return `${name} - ${timezone} - ${email} (${mergeTimeRanges(cell)})`;
      }
      return cell;
    })
  );
}

function submitToGoogleSheets() {
  const updatedSchedule = addUserInfoToSchedule(scheduleData);
  loadingOverlay.style.display = "flex";

  fetch(SCHEDULE_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      timezone,
      type: isTrainer ? "handle_trainer_calendar" : "handle_student_calendar",
      currentEmail: email,
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

window.onload = function () {
  generateHeaders();
};
