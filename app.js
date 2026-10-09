(() => {
  "use strict";

  const STORAGE_KEY = "roomie-roulette-v1";
  const DEFAULT_CHORES = {
    "Dishes": { emoji: "🍽️", label: "Doing the dishes" },
    "Floor": { emoji: "🧹", label: "Cleaning the floor" },
    "Bathroom": { emoji: "🫧", label: "Cleaning the bathroom" },
    "Tidy up": { emoji: "🧸", label: "Tidying up the room" },
    "Trash": { emoji: "🗑️", label: "Taking out the trash" }
  };

  const roommateForm = document.querySelector("#roommate-form");
  const roommateInput = document.querySelector("#roommate-name");
  const roommateList = document.querySelector("#roommate-list");
  const choreSelect = document.querySelector("#chore-select");
  const spinButton = document.querySelector("#spin-button");
  const slotName = document.querySelector("#slot-name");
  const slotChore = document.querySelector("#slot-chore");
  const statusMessage = document.querySelector("#status-message");
  const historyList = document.querySelector("#history-list");
  const clearHistoryButton = document.querySelector("#clear-history");

  let state = loadState();
  let spinning = false;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.roommates) && Array.isArray(saved.history)) {
        return {
          roommates: saved.roommates.filter(name => typeof name === "string"),
          history: saved.history.filter(item => item && typeof item.name === "string" && typeof item.chore === "string").slice(0, 20)
        };
      }
    } catch (error) {
      console.warn("Couldn't load saved Roomie Roulette data.", error);
    }
    return { roommates: [], history: [] };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      statusMessage.textContent = "Your browser couldn't save changes, but the app can still work for now.";
    }
  }

  function renderRoommates() {
    roommateList.replaceChildren();
    state.roommates.forEach((name, index) => {
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
      removeButton.addEventListener("click", () => {
        state.roommates.splice(index, 1);
        saveState();
        renderRoommates();
        statusMessage.textContent = `${name} was removed from the roommate list.`;
        if (state.roommates.length === 0) {
          slotName.textContent = "Who's it gonna be?";
          slotChore.textContent = "Choose a chore above";
        }
      });

      item.append(nameText, removeButton);
      roommateList.append(item);
    });
  }

  function renderHistory() {
    historyList.replaceChildren();
    if (state.history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-history";
      empty.textContent = "Nothing spun yet. The notebook is waiting!";
      historyList.append(empty);
      return;
    }

    state.history.forEach(entry => {
      const item = document.createElement("li");
      item.className = "history-item";

      const icon = document.createElement("div");
      icon.className = "history-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = (DEFAULT_CHORES[entry.chore] || { emoji: "✨" }).emoji;

      const copy = document.createElement("div");
      copy.className = "history-copy";
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const chore = document.createElement("span");
      chore.textContent = (DEFAULT_CHORES[entry.chore] || { label: entry.chore }).label;
      copy.append(name, chore);

      const time = document.createElement("time");
      time.className = "history-time";
      time.textContent = entry.time || "";

      item.append(icon, copy, time);
      historyList.append(item);
    });
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
    statusMessage.textContent = `${cleaned} joined the house!`;
    roommateInput.value = "";
    roommateInput.focus();
  }

  function pickRoommate() {
    // Avoid picking the same person twice in a row when more than one roommate is available.
    const previous = state.history[0]?.name;
    let candidates = state.roommates;
    if (candidates.length > 1 && previous) {
      const alternate = candidates.filter(name => name !== previous);
      if (alternate.length) candidates = alternate;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function spin() {
    if (spinning) return;
    if (state.roommates.length === 0) {
      statusMessage.textContent = "Add at least one roommate before spinning.";
      roommateInput.focus();
      return;
    }

    spinning = true;
    spinButton.disabled = true;
    choreSelect.disabled = true;
    statusMessage.textContent = "The wheel is deciding…";

    const choreKey = choreSelect.value;
    const chore = DEFAULT_CHORES[choreKey] || { label: choreKey };
    const winner = pickRoommate();
    let ticks = 0;
    const totalTicks = 14;
    const interval = window.setInterval(() => {
      const randomName = state.roommates[Math.floor(Math.random() * state.roommates.length)];
      slotName.textContent = randomName;
      slotChore.textContent = chore.label;
      ticks += 1;

      if (ticks >= totalTicks) {
        window.clearInterval(interval);
        slotName.textContent = winner;
        slotChore.textContent = `${chore.emoji || "✨"} ${chore.label}`;
        const now = new Date();
        state.history.unshift({
          name: winner,
          chore: choreKey,
          time: now.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        });
        state.history = state.history.slice(0, 20);
        saveState();
        renderHistory();
        statusMessage.textContent = `It's fate! ${winner} is on ${chore.label.toLowerCase()}.`;
        spinning = false;
        spinButton.disabled = false;
        choreSelect.disabled = false;
      }
    }, 95);
  }

  roommateForm.addEventListener("submit", event => {
    event.preventDefault();
    addRoommate(roommateInput.value);
  });

  spinButton.addEventListener("click", spin);

  clearHistoryButton.addEventListener("click", () => {
    if (state.history.length === 0) {
      statusMessage.textContent = "Your history is already empty.";
      return;
    }
    state.history = [];
    saveState();
    renderHistory();
    statusMessage.textContent = "Chore history cleared.";
  });

  renderRoommates();
  renderHistory();
  if (state.roommates.length > 0) {
    statusMessage.textContent = `${state.roommates.length} roommate${state.roommates.length === 1 ? "" : "s"} ready. Give it a spin!`;
  }
})();
