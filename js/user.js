const GOOGLE_API_URL =
  "https://script.google.com/macros/s/AKfycbxh45YvZPiNMfhCBEdRPniGvzeODmphlsceKO33bJt-b0Mf0GIkzMJXYs7y3USYmHBfvg/exec";

document.addEventListener("DOMContentLoaded", async function () {
  const emailField = document.getElementById("email");
  const storedEmail = sessionStorage.getItem("user_email");
  if (storedEmail) {
    emailField.value = storedEmail;
    await fetchUserData(storedEmail);
  }

  document
    .getElementById("pteExamDate")
    .addEventListener("change", function () {
      document.getElementById("examBookedContainer").style.display = this.value
        ? "block"
        : "none";
    });

  const form = document.getElementById("userInfoForm");
  const loadingOverlay = document.getElementById("loadingOverlay");

  document
    .getElementById("userInfoForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
    });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    loadingOverlay.style.display = "flex";

    const minHoursPerSession = document
      .getElementById("minHoursPerSession")
      .value.toString()
      .replace(".", ",");

    const maxHoursPerSession = document
      .getElementById("maxHoursPerSession")
      .value.toString()
      .replace(".", ",");

    const userData = {
      type: "user_info",
      name: document.getElementById("name").value || "",
      email: document.getElementById("email").value,
      timezone: document.getElementById("timezone").value || "",
      pteExamDate: document.getElementById("pteExamDate").value || "",
      examBooked: document.getElementById("examBooked").checked
        ? "Đã book"
        : "Chưa book",
      notes: document.getElementById("notes").value || "",
      minHoursPerWeek: document.getElementById("minHoursPerWeek").value || "",
      maxHoursPerWeek: document.getElementById("maxHoursPerWeek").value || "",
      minHoursPerSession: minHoursPerSession,
      maxHoursPerSession: maxHoursPerSession,
    };

    await fetch(GOOGLE_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(userData),
    })
      .then((response) => {
        loadingOverlay.style.display = "none";
        M.toast({ html: "Thông tin đã được lưu!", classes: "green darken-1" });
        sessionStorage.setItem("user_info", JSON.stringify(userData));
        setTimeout(() => {
          window.location.href = "calendar.html";
        }, 1000);
      })
      .catch((error) => {
        console.error("Lỗi khi lưu dữ liệu:", error);
      });
  });
});

async function fetchUserData(email) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";
  try {
    const response = await fetch(
      `${GOOGLE_API_URL}?type=get_user&email=${email}`,
      {
        method: "GET",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      }
    );
    const data = await response.json();
    if (data.success && data.user) {
      const {
        name,
        pteExamDate,
        notes,
        examBooked,
        timezone,
        minHoursPerWeek,
        maxHoursPerWeek,
        minHoursPerSession,
        maxHoursPerSession,
      } = data.user;

      if (pteExamDate) {
        console.log(" fetchUserData ~ pteExamDate:", pteExamDate);
        const dateObj = new Date(pteExamDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        document.getElementById("pteExamDate").value = formattedDate;
      }

      if (name && timezone) {
        document.getElementById("goCalendar").style.display = "list-item";
        sessionStorage.setItem("user_info", JSON.stringify(data.user));
      }

      if (data) document.getElementById("name").value = name || "";
      document.getElementById("timezone").value = timezone || "";
      document.getElementById("examBooked").checked = examBooked === "Đã book";
      document.getElementById("notes").value = notes || "";
      document.getElementById("minHoursPerWeek").value = minHoursPerWeek || "";
      document.getElementById("maxHoursPerWeek").value = maxHoursPerWeek || "";
      document.getElementById("minHoursPerSession").value =
        minHoursPerSession || "";
      document.getElementById("maxHoursPerSession").value =
        maxHoursPerSession || "";
    }
    loadingOverlay.style.display = "none";
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  }
}

function nextWithoutUpdate() {
  window.location.href = "calendar.html";
}

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
});

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}
