document.addEventListener("DOMContentLoaded", async function () {
  const emailField = document.getElementById("email");
  const storedEmail = sessionStorage.getItem("user_email");
  if (storedEmail) {
    emailField.value = storedEmail;
    await fetchUserData(storedEmail);
  }

  const form = document.getElementById("userInfoForm");

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
      pteClass: document.getElementById("pteClass").value || "",
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
        pteClass,
        notes,
        examBooked,
        timezone,
        minHoursPerWeek,
        maxHoursPerWeek,
        minHoursPerSession,
        maxHoursPerSession,
        facebook,
      } = data.user;

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
      document.getElementById("pteClass").value = pteClass || "";
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
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  } finally {
    loadingOverlay.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  loadingOverlay = document.getElementById("loadingOverlay");

  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
});
