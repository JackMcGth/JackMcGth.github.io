(() => {
  "use strict";

  const STORAGE_KEY = "roomie-roulette-v1";
  const PLAN_DAYS = 14;

  // Every chore a dorm room might realistically need. Keys are stored in history/calendar.
  const CHORES = {
    "Dishes": { emoji: "🍽️", label: "Wash the dishes", short: "Dishes" },
    "Dish rack": { emoji: "🥣", label: "Empty & wipe the dish rack", short: "Dish rack" },
    "Floor": { emoji: "🧹", label: "Sweep & mop the floor", short: "Floor" },
    "Vacuum": { emoji: "🌀", label: "Vacuum the carpet", short: "Vacuum" },
    "Bathroom": { emoji: "🚽", label: "Clean the bathroom", short: "Bathroom" },
    "Shower": { emoji: "🚿", label: "Scrub the shower", short: "Shower" },
    "Sink & mirror": { emoji: "🪞", label: "Clean the sink & mirror", short: "Sink" },
    "Tidy up": { emoji: "📦", label: "Tidy the common area", short: "Tidy up" },
    "Trash": { emoji: "🗑️", label: "Take out the trash", short: "Trash" },
    "Recycling": { emoji: "♻️", label: "Take out the recycling", short: "Recycling" },
    "Fridge": { emoji: "🧊", label: "Clean out the mini fridge", short: "Fridge" },
    "Microwave": { emoji: "📟", label: "Scrub the microwave", short: "Microwave" },
    "Counters": { emoji: "🧽", label: "Wipe counters & desks", short: "Counters" },
    "Dust": { emoji: "🪶", label: "Dust shelves & electronics", short: "Dust" },
    "Windows": { emoji: "🪟", label: "Wipe windows & sills", short: "Windows" },
    "Supplies": { emoji: "🧻", label: "Restock toilet paper & soap", short: "Supplies" },
    "Laundry": { emoji: "🧺", label: "Wash shared towels & bath mat", short: "Laundry" },
    "Water filter": { emoji: "💧", label: "Refill the water filter", short: "Water filter" },
    "Takeout": { emoji: "🥡", label: "Clear takeout boxes & cans", short: "Takeout" },
    "Kitchenette": { emoji: "☕", label: "Reset the kitchenette", short: "Kitchenette" },
    "Cords": { emoji: "🔌", label: "Sort cords, chargers & power strips", short: "Cords" },
    "Hallway": { emoji: "👟", label: "Straighten shoes & entryway", short: "Entryway" }
  };
  const CHORE_KEYS = Object.keys(CHORES);

  const $ = sel => document.querySelector(sel);
  const roommateForm = $("#roommate-form");
  const roommateInput = $("#roommate-name");
  const roommateList = $("#roommate-list");
  const chorePool = $("#chore-pool");
  const poolCount = $("#pool-count");
  const spinButton = $("#spin-button");
  const slotName = $("#slot-name");
  const slotChore = $("#slot-chore");
  const statusMessage = $("#status-message");
  const historyList = $("#history-list");
  const clearHistoryButton = $("#clear-history");
  const planButton = $("#plan-button");
  const clearPlanButton = $("#clear-plan");
  const calPrev = $("#cal-prev");
  const calNext = $("#cal-next");
  const calTitle = $("#cal-title");
  const calGrid = $("#cal-grid");
  const dayDetail = $("#day-detail");
  const upcomingList = $("#upcoming-list");

  let state = loadState();
  let spinning = false;
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = dateKey(today);

  /* ---------- helpers ---------- */
  function dateKey(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function addDays(d, n) {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    copy.setDate(copy.getDate() + n);
    return copy;
  }
  function todayKey() { return dateKey(new Date()); }
  function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function choreInfo(key) {
    return CHORES[key] || { emoji: "✨", label: key, short: key };
  }
  function activeChores() {
    return CHORE_KEYS.filter(k => !state.disabled.includes(k));
  }
  function describeDay(key) {
    return parseKey(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  /* ---------- storage ---------- */
  function loadState() {
    const fresh = { roommates: [], history: [], schedule: {}, disabled: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.roommates) && Array.isArray(saved.history)) {
        const schedule = {};
        if (saved.schedule && typeof saved.schedule === "object") {
          Object.entries(saved.schedule).forEach(([k, v]) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v.name === "string" && typeof v.chore === "string") {
              schedule[k] = { name: v.name, chore: v.chore };
            }
          });
        }
        return {
          roommates: saved.roommates.filter(n => typeof n === "string"),
          history: saved.history.filter(i => i && typeof i.name === "string" && typeof i.chore === "string").slice(0, 20),
          schedule,
          disabled: Array.isArray(saved.disabled) ? saved.disabled.filter(k => CHORES[k]) : []
        };
      }
    } catch (error) {
      console.warn("Couldn't load saved Roomie Roulette data.", error);
    }
    return fresh;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      statusMessage.textContent = "Your browser couldn't save changes, but the app still works for now.";
    }
  }

  /* ---------- roommates ---------- */
  function renderRoommates() {
    roommateList.replaceChildren();
    state.roommates.forEach(name => {
      const item = document.createElement("li");
      item.className = "chip";

      const nameText = document.createElement("span");
      nameText.textContent = name;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-person";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", `Remove ${name}`);
      removeButton.title = `Remove ${name}`;
      removeButton.addEventListener("click", () => removeRoommate(name));

      item.append(nameText, removeButton);
      roommateList.append(item);
    });
  }

  function removeRoommate(name) {
    state.roommates = state.roommates.filter(n => n !== name);
    // Drop their upcoming assignments (today onward). Past days stay as a record.
    const cutoff = todayKey();
    Object.keys(state.schedule).forEach(k => {
      if (k >= cutoff && state.schedule[k].name === name) delete state.schedule[k];
    });
    saveState();
    renderRoommates();
    renderCalendar();
    statusMessage.textContent = `${name} was removed. Their upcoming chores were cleared, so re-plan to refill those days.`;
    if (state.roommates.length === 0) {
      slotName.textContent = "Ready?";
      slotChore.textContent = "Hit roll to find out";
    }
  }

  function addRoommate(name) {
    const cleaned = name.trim().replace(/\s+/g, " ");
    if (!cleaned) return;
    if (state.roommates.some(existing => existing.toLowerCase() === cleaned.toLowerCase())) {
      statusMessage.textContent = `${cleaned} is already on the list.`;
      return;
    }
    state.roommates.push(cleaned);
    saveState();
    renderRoommates();
    statusMessage.textContent = `${cleaned} is in.`;
    roommateInput.value = "";
    roommateInput.focus();
  }

  /* ---------- chore pool ---------- */
  function renderPool() {
    chorePool.replaceChildren();
    CHORE_KEYS.forEach(key => {
      const info = choreInfo(key);
      const item = document.createElement("li");
      const btn = document.createElement("button");
      const on = !state.disabled.includes(key);
      btn.type = "button";
      btn.className = "pool-chip" + (on ? " is-on" : "");
      btn.setAttribute("aria-pressed", String(on));
      btn.title = info.label;
      btn.textContent = `${info.emoji} ${info.short}`;
      btn.addEventListener("click", () => {
        if (on && activeChores().length <= 1) {
          statusMessage.textContent = "Keep at least one chore in the pool.";
          return;
        }
        state.disabled = on ? state.disabled.concat(key) : state.disabled.filter(k => k !== key);
        saveState();
        renderPool();
      });
      item.append(btn);
      chorePool.append(item);
    });
    poolCount.textContent = `${activeChores().length} of ${CHORE_KEYS.length} chores in the pool.`;
  }

  /* ---------- random picking ---------- */
  function pickRoommate(avoid) {
    let candidates = state.roommates;
    if (candidates.length > 1 && avoid) {
      const alt = candidates.filter(n => n !== avoid);
      if (alt.length) candidates = alt;
    }
    return randomItem(candidates);
  }
  function pickChore(avoid) {
    let candidates = activeChores();
    if (candidates.length > 1 && avoid) {
      const alt = candidates.filter(k => k !== avoid);
      if (alt.length) candidates = alt;
    }
    return randomItem(candidates);
  }

  /* ---------- the roll ---------- */
  function spin() {
    if (spinning) return;
    if (state.roommates.length === 0) {
      statusMessage.textContent = "Add at least one roommate before rolling.";
      roommateInput.focus();
      return;
    }

    spinning = true;
    spinButton.disabled = true;
    statusMessage.textContent = "Rolling…";

    const winner = pickRoommate(state.history[0]?.name);
    const choreKey = pickChore(state.history[0]?.chore);
    const pool = activeChores();
    let ticks = 0;
    const totalTicks = 16;

    const interval = window.setInterval(() => {
      slotName.textContent = randomItem(state.roommates);
      const c = choreInfo(randomItem(pool));
      slotChore.textContent = `${c.emoji} ${c.label}`;
      ticks += 1;

      if (ticks >= totalTicks) {
        window.clearInterval(interval);
        const chore = choreInfo(choreKey);
        slotName.textContent = winner;
        slotChore.textContent = `${chore.emoji} ${chore.label}`;

        const now = new Date();
        state.history.unshift({
          name: winner,
          chore: choreKey,
          time: now.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        });
        state.history = state.history.slice(0, 20);
        state.schedule[dateKey(now)] = { name: winner, chore: choreKey };
        saveState();

        selectedKey = dateKey(now);
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        renderHistory();
        renderCalendar();
        statusMessage.textContent = `${winner} has ${chore.label.toLowerCase()} today. It's on the calendar.`;
        spinning = false;
        spinButton.disabled = false;
      }
    }, 90);
  }

  /* ---------- planning ahead ---------- */
  // Fills the next PLAN_DAYS days. People and chores each come out of a shuffled
  // "bag" so the load stays even, with no back-to-back repeats where possible.
  function planAhead() {
    if (state.roommates.length === 0) {
      statusMessage.textContent = "Add at least one roommate before planning.";
      roommateInput.focus();
      return;
    }
    const start = new Date();
    let peopleBag = [];
    let choreBag = [];
    let lastPerson = state.schedule[dateKey(addDays(start, -1))]?.name || null;
    let lastChore = state.schedule[dateKey(addDays(start, -1))]?.chore || null;

    for (let i = 0; i < PLAN_DAYS; i++) {
      const key = dateKey(addDays(start, i));
      // Keep a chore that was already rolled today.
      if (i === 0 && state.schedule[key]) {
        lastPerson = state.schedule[key].name;
        lastChore = state.schedule[key].chore;
        continue;
      }
      if (peopleBag.length === 0) peopleBag = shuffle(state.roommates);
      if (choreBag.length === 0) choreBag = shuffle(activeChores());

      let pi = peopleBag.findIndex(n => n !== lastPerson);
      if (pi === -1) pi = 0;
      let ci = choreBag.findIndex(k => k !== lastChore);
      if (ci === -1) ci = 0;

      const name = peopleBag.splice(pi, 1)[0];
      const chore = choreBag.splice(ci, 1)[0];
      state.schedule[key] = { name, chore };
      lastPerson = name;
      lastChore = chore;
    }
    saveState();
    renderCalendar();
    statusMessage.textContent = `Next ${PLAN_DAYS} days are planned. Check the calendar.`;
  }

  function clearUpcoming() {
    const cutoff = todayKey();
    let removed = 0;
    Object.keys(state.schedule).forEach(k => {
      if (k > cutoff) { delete state.schedule[k]; removed += 1; }
    });
    saveState();
    renderCalendar();
    statusMessage.textContent = removed ? "Upcoming days cleared." : "No upcoming days to clear.";
  }

  function rerollDay(key) {
    if (state.roommates.length === 0) {
      statusMessage.textContent = "Add at least one roommate first.";
      return;
    }
    const prev = state.schedule[key];
    state.schedule[key] = {
      name: pickRoommate(prev?.name),
      chore: pickChore(prev?.chore)
    };
    saveState();
    renderCalendar();
    statusMessage.textContent = `${describeDay(key)} rerolled.`;
  }

  function clearDay(key) {
    delete state.schedule[key];
    saveState();
    renderCalendar();
  }

  /* ---------- calendar ---------- */
  function renderCalendar() {
    const first = new Date(viewYear, viewMonth, 1);
    calTitle.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    calGrid.replaceChildren();

    const startOffset = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const tKey = todayKey();

    for (let i = 0; i < startOffset; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-cell is-blank";
      blank.setAttribute("aria-hidden", "true");
      calGrid.append(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const key = dateKey(d);
      const entry = state.schedule[key];

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      if (key === tKey) cell.classList.add("is-today");
      if (key === selectedKey) cell.classList.add("is-selected");
      if (key < tKey) cell.classList.add("is-past");
      if (entry) cell.classList.add("has-chore");
      cell.setAttribute("aria-pressed", String(key === selectedKey));
      cell.setAttribute("aria-label", entry
        ? `${describeDay(key)}: ${entry.name}, ${choreInfo(entry.chore).label}`
        : `${describeDay(key)}: no chore assigned`);

      const num = document.createElement("span");
      num.className = "cal-num";
      num.textContent = String(day);
      cell.append(num);

      if (entry) {
        const info = choreInfo(entry.chore);
        const tag = document.createElement("span");
        tag.className = "cal-tag";
        const emoji = document.createElement("span");
        emoji.className = "cal-emoji";
        emoji.textContent = info.emoji;
        const who = document.createElement("span");
        who.className = "cal-who";
        who.textContent = entry.name;
        const what = document.createElement("span");
        what.className = "cal-what";
        what.textContent = info.short;
        tag.append(emoji, who, what);
        cell.append(tag);
      }

      cell.addEventListener("click", () => {
        selectedKey = key;
        renderCalendar();
      });
      calGrid.append(cell);
    }

    renderDayDetail();
    renderUpcoming();
  }

  function renderDayDetail() {
    dayDetail.replaceChildren();
    const entry = state.schedule[selectedKey];

    const title = document.createElement("div");
    title.className = "detail-date";
    title.textContent = describeDay(selectedKey) + (selectedKey === todayKey() ? " (today)" : "");
    dayDetail.append(title);

    if (!entry) {
      const none = document.createElement("p");
      none.className = "detail-empty";
      none.textContent = "No chore assigned for this day.";
      dayDetail.append(none);
    } else {
      const info = choreInfo(entry.chore);
      const line = document.createElement("p");
      line.className = "detail-line";
      const strong = document.createElement("strong");
      strong.textContent = entry.name;
      line.append(strong, ` · ${info.emoji} ${info.label}`);
      dayDetail.append(line);
    }

    const actions = document.createElement("div");
    actions.className = "detail-actions";
    const reroll = document.createElement("button");
    reroll.type = "button";
    reroll.className = "secondary-button";
    reroll.textContent = entry ? "Reroll this day" : "Roll this day";
    reroll.addEventListener("click", () => rerollDay(selectedKey));
    actions.append(reroll);
    if (entry) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "text-button";
      clear.textContent = "Clear";
      clear.addEventListener("click", () => clearDay(selectedKey));
      actions.append(clear);
    }
    dayDetail.append(actions);
  }

  function renderUpcoming() {
    upcomingList.replaceChildren();
    const start = new Date();
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const key = dateKey(d);
      const entry = state.schedule[key];
      const item = document.createElement("li");
      item.className = "upcoming-item" + (entry ? "" : " is-empty");

      const day = document.createElement("span");
      day.className = "upcoming-day";
      day.textContent = i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

      const what = document.createElement("span");
      what.className = "upcoming-what";
      if (entry) {
        const info = choreInfo(entry.chore);
        const strong = document.createElement("strong");
        strong.textContent = entry.name;
        what.append(strong, ` · ${info.emoji} ${info.label}`);
      } else {
        what.textContent = "Nothing planned";
      }
      item.append(day, what);
      upcomingList.append(item);
    }
  }

  /* ---------- history ---------- */
  function renderHistory() {
    historyList.replaceChildren();
    if (state.history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-history";
      empty.textContent = "Nothing rolled yet.";
      historyList.append(empty);
      return;
    }

    state.history.forEach(entry => {
      const info = choreInfo(entry.chore);
      const item = document.createElement("li");
      item.className = "history-item";

      const icon = document.createElement("div");
      icon.className = "history-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = info.emoji;

      const copy = document.createElement("div");
      copy.className = "history-copy";
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const chore = document.createElement("span");
      chore.textContent = info.label;
      copy.append(name, chore);

      const time = document.createElement("time");
      time.className = "history-time";
      time.textContent = entry.time || "";

      item.append(icon, copy, time);
      historyList.append(item);
    });
  }

  /* ---------- events ---------- */
  roommateForm.addEventListener("submit", event => {
    event.preventDefault();
    addRoommate(roommateInput.value);
  });
  spinButton.addEventListener("click", spin);
  planButton.addEventListener("click", planAhead);
  clearPlanButton.addEventListener("click", clearUpcoming);

  calPrev.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });
  calNext.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  clearHistoryButton.addEventListener("click", () => {
    if (state.history.length === 0) {
      statusMessage.textContent = "Your history is already empty.";
      return;
    }
    state.history = [];
    saveState();
    renderHistory();
    statusMessage.textContent = "Roll history cleared.";
  });

  renderRoommates();
  renderPool();
  renderHistory();
  renderCalendar();
  if (state.roommates.length > 0) {
    statusMessage.textContent = `${state.roommates.length} roommate${state.roommates.length === 1 ? "" : "s"} ready. Roll it.`;
  }
})();
