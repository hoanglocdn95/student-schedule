const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbxa7-dhPgo48Q3eVKnQjQNKI8oi4ykDfnTzi9hQDSfhGk2SrMBimc1yagzxXLULNs7tYQ/exec";
const SCHEDULE_API_URL =
  "https://script.google.com/macros/s/AKfycbx1WEfIP9WNEQWC-KwyX0fP7urSBggrqvEWAIdsazhInXlA3Ey5cHmythTHbDskFcDp7Q/exec";

const REMAIN_TIME_TO_EDIT = 5;
const userInfo = JSON.parse(sessionStorage.getItem("user_info"));
const isTrainer = userInfo ? userInfo.type === "trainer_info" : null;
let loadingOverlay = null;

const TIME_SLOTS = [
  "Sáng (8:00 - 12:00)*",
  "Chiều (12:00 - 17:00)",
  "Tối (17:00 - 23:00)",
];

document.addEventListener("DOMContentLoaded", function () {
  loadingOverlay = document.getElementById("loadingOverlay");

  if (
    !sessionStorage.getItem("user_email") &&
    window.location.pathname !== "/index.html"
  ) {
    window.location.href = "index.html";
  }
  if (
    !userInfo &&
    window.location.pathname !== "/index.html" &&
    window.location.pathname !== "/user.html" &&
    window.location.pathname !== "/trainer.html"
  ) {
    window.location.href = isTrainer ? "trainer.html" : "user.html";
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

function mergeTimeRanges(timeRanges) {
  const ranges = timeRanges.split(", ").map((range) => {
    const [start, end] = range.split("-").map((time) => {
      const [hh, mm] = time.split(":").map(Number);
      return hh * 60 + mm;
    });
    return { start, end };
  });

  ranges.sort((a, b) => a.start - b.start);

  const merged = [];

  for (const range of ranges) {
    if (
      merged.length === 0 ||
      merged[merged.length - 1].end < range.start - 1
    ) {
      merged.push(range);
    } else {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        range.end
      );
    }
  }

  return merged
    .map(({ start, end }) => {
      const startH = Math.floor(start / 60);
      const startM = start % 60;
      const endH = Math.floor(end / 60);
      const endM = end % 60;
      return `${String(startH).padStart(2, "0")}:${String(startM).padStart(
        2,
        "0"
      )}-${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    })
    .join(", ");
}
