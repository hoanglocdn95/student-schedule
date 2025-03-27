const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbx8NMJQd7SJ8otQLNTlhtm6zVOsEn_wxMo_0_pDqRil42kcU_q3Rfebu0Os7nwVUgcNRA/exec";

document.addEventListener("DOMContentLoaded", async function () {
  const emailField = document.getElementById("email");
  const storedEmail = sessionStorage.getItem("user_email");
  if (storedEmail) {
    emailField.value = storedEmail;
    await fetchUserData(storedEmail);
  }

  const form = document.getElementById("userInfoForm");
  const loadingOverlay = document.getElementById("loadingOverlay");

  form.addEventListener("submit", async function (event) {
    const userInStorage = JSON.parse(sessionStorage.getItem("user_info"));
    console.log(" userInStorage:", userInStorage);

    event.preventDefault();

    const minHoursPerSession =
      document.getElementById("minHoursPerSession").value;

    const maxHoursPerSession =
      document.getElementById("maxHoursPerSession").value;

    const minHoursPerWeek = document.getElementById("minHoursPerWeek").value;
    const maxHoursPerWeek = document.getElementById("maxHoursPerWeek").value;

    if (+minHoursPerWeek > +maxHoursPerWeek) {
      M.toast({
        html: "Vui lòng nhập Số giờ học tối thiểu / tuần nhỏ hơn hoặc bằng Số giờ học tối đa / tuần",
        classes: "yellow darken-1",
      });
      return;
    }

    if (+minHoursPerSession > +maxHoursPerSession) {
      M.toast({
        html: "Vui lòng nhập Số giờ học tối thiểu / buổi nhỏ hơn hoặc bằng Số giờ học tối đa / buổi",
        classes: "yellow darken-1",
      });
      return;
    }

    const userData = {
      type: "user_info",
      name: document.getElementById("name").value || "",
      email: document.getElementById("email").value,
      facebook: document.getElementById("facebook").value || "",
      timezone: document.getElementById("timezone").value || "",
      pteExamDate: document.getElementById("pteExamDate").value || "",
      examBooked: document.getElementById("examBooked").checked,
      notes: document.getElementById("notes").value || "",
      minHoursPerWeek: minHoursPerWeek || "",
      maxHoursPerWeek: maxHoursPerWeek || "",
      minHoursPerSession: minHoursPerSession.toString().replace(".", ","),
      maxHoursPerSession: maxHoursPerSession.toString().replace(".", ","),
    };

    if (compareObjects(userInStorage, userData)) {
      window.location.href = "calendar.html";
      return;
    }

    loadingOverlay.style.display = "flex";

    await fetch(ACCOUNT_API_URL, {
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
      `${ACCOUNT_API_URL}?type=get_user&email=${email}`,
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
        facebook,
      } = data.user;
      // facebook: document.getElementById("facebook").value || "",

      if (pteExamDate) {
        const dateObj = new Date(pteExamDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        document.getElementById("pteExamDate").value = formattedDate;
      }

      if (name && timezone) {
        document.getElementById("goCalendar").style.display = "list-item";
        sessionStorage.setItem("user_info", JSON.stringify(data.user));
      }

      document.getElementById("name").value = name || "";
      document.getElementById("facebook").value = facebook || "";
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

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
});

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

    if (key === "pteExamDate") {
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
