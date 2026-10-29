
const TARGET = 80;
const STORAGE_KEY = "learningTrackerProgressV2";

const grid = document.getElementById("calendarGrid");
const today = new Date();
today.setHours(0, 0, 0, 0);

let selectedDate = new Date(today);
let displayedMonth = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
);

let data = loadData();

// ---------- Date helpers ----------

function key(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sameDate(a, b) {
  return key(a) === key(b);
}

function getTasks(date) {
  const k = key(date);
  if (!data[k]) data[k] = [null, null, null];
  return data[k];
}

function monthDays(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      const clean = {};
      for (const k in saved) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) &&
            Array.isArray(saved[k]) && saved[k].length === 3) {
          clean[k] = saved[k].map(v =>
            v === true ? true : v === false ? false : null
          );
        }
      }
      return clean;
    }
  } catch (e) {
    console.warn("Could not load saved progress.");
  }
  return {};
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    alert("Unable to save progress in this browser.");
  }
}

// ---------- Calendar rendering ----------

function renderCalendar() {
  grid.innerHTML = `
    <div class="weekday">SUN</div>
    <div class="weekday">MON</div>
    <div class="weekday">TUE</div>
    <div class="weekday">WED</div>
    <div class="weekday">THU</div>
    <div class="weekday">FRI</div>
    <div class="weekday">SAT</div>
  `;

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const totalDays = monthDays(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  document.getElementById("monthTitle").textContent =
    displayedMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

  document.getElementById("monthSubtitle").textContent =
    `${totalDays} days · Select a date`;

  // Empty spaces before day one
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    empty.setAttribute("aria-hidden", "true");
    grid.appendChild(empty);
  }

  // Create each date
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const tasks = getTasks(date);

    const completed = tasks.filter(v => v === true).length;
    const failed = tasks.filter(v => v === false).length;
    const marked = tasks.filter(v => v !== null).length;

    // Progress is based on completed tasks
    const percent = Math.round((completed / 3) * 100);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";

    if (sameDate(date, selectedDate)) {
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }

    if (sameDate(date, today)) {
      button.classList.add("today");
    }

    if (completed === 3) {
      button.classList.add("all-complete");
    } else if (failed > 0) {
      button.classList.add("has-missed");
    } else if (marked > 0) {
      button.classList.add("in-progress");
    }

    const status = tasks.map(value => {
      if (value === true) return '<span class="mini-check">✓</span>';
      if (value === false) return '<span class="mini-cross">✕</span>';
      return '<span class="mini-pending">·</span>';
    }).join("");

    button.innerHTML = `
      <span class="day-number">${day}</span>

      <span class="day-status">${status}</span>

      <div class="date-progress-track"
           role="progressbar"
           aria-label="Day ${day} progress"
           aria-valuemin="0"
           aria-valuemax="100"
           aria-valuenow="${percent}">
        <div class="date-progress-fill"
             style="width:${percent}%"></div>
      </div>

      <span class="day-fraction">${percent}%</span>

      ${sameDate(date, today)
        ? '<span class="day-today">TODAY</span>'
        : ""}
    `;

    button.setAttribute(
      "aria-label",
      `${date.toDateString()}, ${percent}% complete`
    );

    button.addEventListener("click", () => {
      selectedDate = new Date(year, month, day);
      renderCalendar();
      renderDailyTasks();
    });

    grid.appendChild(button);
  }

  updateStatistics();
}

// ---------- Daily tasks ----------

function renderDailyTasks() {
  const tasks = getTasks(selectedDate);
  const completed = tasks.filter(v => v === true).length;
  const percent = Math.round((completed / 3) * 100);

  document.getElementById("selectedDateTitle").textContent =
    selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

  document.getElementById("selectedDateSubtitle").textContent =
    sameDate(selectedDate, today)
      ? "Track your progress for today."
      : "Update the tasks for your selected date.";

  document.getElementById("dailyBadge").textContent =
    `${completed} / 3 Done`;

  document.getElementById("dailyBadge")
    .classList.toggle("complete", completed === 3);

  document.getElementById("dailyPercent").textContent =
    `${percent}%`;

  document.getElementById("dailyBar").style.width =
    `${percent}%`;

  document.getElementById("successMessage")
    .classList.toggle("hidden", completed !== 3);

  document.querySelectorAll(".mark-button").forEach(button => {
    const index = Number(button.dataset.task);
    const value = button.dataset.value;
    const current = tasks[index];

    button.classList.toggle(
      "active",
      (value === "yes" && current === true) ||
      (value === "no" && current === false)
    );
  });

  document.querySelectorAll(".task-card").forEach((card, index) => {
    card.classList.remove("task-completed", "task-failed");

    if (tasks[index] === true) {
      card.classList.add("task-completed");
    } else if (tasks[index] === false) {
      card.classList.add("task-failed");
    }
  });
}

// ---------- Mark task complete or missed ----------

document.querySelectorAll(".mark-button").forEach(button => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.task);
    const value = button.dataset.value === "yes";
    const tasks = getTasks(selectedDate);

    // Click the same mark again to clear it
    tasks[index] = tasks[index] === value ? null : value;

    saveData();
    renderCalendar();
    renderDailyTasks();
  });
});

// ---------- Monthly statistics ----------

function updateStatistics() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const totalDays = monthDays(year, month);
  const totalTasks = totalDays * 3;

  let completedTotal = 0;
  const categoryTotals = [0, 0, 0];

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const tasks = getTasks(date);

    tasks.forEach((value, index) => {
      if (value === true) {
        completedTotal++;
        categoryTotals[index]++;
      }
    });
  }

  const overall = Math.round(
    (completedTotal / totalTasks) * 100
  );

  document.getElementById("overallPercent").textContent =
    `${overall}%`;

  document.getElementById("overallBar").style.width =
    `${overall}%`;

  document.getElementById("completedCount").textContent =
    `${completedTotal} / ${totalTasks}`;

  const categoryPercentages = categoryTotals.map(count =>
    Math.round((count / totalDays) * 100)
  );

  const average = Math.round(
    categoryPercentages.reduce((sum, value) => sum + value, 0) / 3
  );

  document.getElementById("averagePercent").textContent =
    `${average}%`;

  document.getElementById("averageBar").style.width =
    `${average}%`;

  document.getElementById("targetStatus").textContent =
    `${overall}%`;

  document.getElementById("benchmarkBar").style.width =
    `${overall}%`;

  document.getElementById("targetMessage").textContent =
    overall >= TARGET
      ? "Excellent! You reached the 80% benchmark."
      : `${TARGET - overall}% more needed to reach the target.`;

  categoryPercentages.forEach((percent, index) => {
    document.getElementById(`taskPercent${index}`).textContent =
      `${percent}%`;

    document.getElementById(`taskBar${index}`).style.width =
      `${percent}%`;
  });
}

// ---------- Month navigation ----------

function changeMonth(amount) {
  displayedMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + amount,
    1
  );

  // Keep the selected day number when possible
  const day = Math.min(
    selectedDate.getDate(),
    monthDays(displayedMonth.getFullYear(), displayedMonth.getMonth())
  );

  selectedDate = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth(),
    day
  );

  renderCalendar();
  renderDailyTasks();
}

document.getElementById("prevMonth").addEventListener(
  "click", () => changeMonth(-1)
);

document.getElementById("nextMonth").addEventListener(
  "click", () => changeMonth(1)
);

// ---------- Today button ----------

document.getElementById("todayButton").addEventListener("click", () => {
  const now = new Date();
  today.setTime(now.getTime());
  today.setHours(0, 0, 0, 0);

  selectedDate = new Date(today);

  displayedMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  renderCalendar();
  renderDailyTasks();
});

// ---------- Start ----------

renderCalendar();
renderDailyTasks();
