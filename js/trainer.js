document.addEventListener("DOMContentLoaded", async function () {
  const emailField = document.getElementById("email");
  const storedEmail = sessionStorage.getItem("user_email");
  if (storedEmail) {
    emailField.value = storedEmail;
    await fetchTrainerData(storedEmail);
  }

  const form = document.getElementById("userInfoForm");

  form.addEventListener("submit", async function (event) {
    const userInStorage = JSON.parse(sessionStorage.getItem("user_info"));

    event.preventDefault();

    const userData = {
      type: "trainer_info",
      name: document.getElementById("name").value || "",
      email: document.getElementById("email").value,
      facebook: document.getElementById("facebook").value || "",
      timezone: document.getElementById("timezone").value || "",
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

async function fetchTrainerData(email) {
  loadingOverlay.style.display = "flex";
  try {
    const response = await fetch(
      `${ACCOUNT_API_URL}?type=get_trainer&email=${email}`,
      {
        method: "GET",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      }
    );
    const data = await response.json();
    if (data.success && data.user) {
      const { name, pteExamDate, timezone, facebook } = data.user;

      if (pteExamDate) {
        const dateObj = new Date(pteExamDate);
        const formattedDate = dateObj.toISOString().split("T")[0];
        document.getElementById("pteExamDate").value = formattedDate;
      }

      if (name && timezone) {
        document.getElementById("goCalendar").style.display = "list-item";
        sessionStorage.setItem(
          "user_info",
          JSON.stringify({ ...data.user, type: "trainer_info" })
        );
      }

      document.getElementById("name").value = name || "";
      document.getElementById("facebook").value = facebook || "";
      document.getElementById("timezone").value = timezone || "";
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
