const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";
const STATE_URL = `${API_BASE}/api/exo/lottery/state`;

// Na razie backend przechowuje start, ale nie ma jeszcze end_at/draw_at.
// Te wartości są tylko wizualnym harmonogramem frontendu i łatwo je zmienić.
const LOTTERY_DURATION_MS = 2.5 * 60 * 60 * 1000; // 2h 30m
const DRAW_DELAY_MS = 30 * 60 * 1000;             // 30m po końcu

const POLL_MS = 5000;

let currentState = null;
let currentFilter = "qualified";
let pollTimer = null;
let countdownTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString("pl-PL", {
    maximumFractionDigits: digits
  });
}

function formatMoney(value) {
  return `${formatNumber(value, 2)}$`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatClock(ms) {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function setApiStatus(ok, text) {
  const el = $("#apiStatus");
  el.classList.toggle("ok", ok);
  el.classList.toggle("error", !ok);
  $("#apiStatusText").textContent = text;
  $("#footerState").textContent = `API: ${text}`;
}

async function fetchState() {
  try {
    const response = await fetch(`${STATE_URL}?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "API zwróciło błąd");
    }

    currentState = data;
    renderState();
    setApiStatus(true, data.lottery?.active ? "LOTTERY LIVE" : "ONLINE");
    $("#syncText").textContent = `Ostatnia aktualizacja ${new Date().toLocaleTimeString("pl-PL")} • co 5 s`;
  } catch (error) {
    console.error("EXODO API:", error);
    setApiStatus(false, "BŁĄD API");
    $("#syncText").textContent = "Nie udało się pobrać danych";
  }
}

function renderState() {
  const state = currentState || {};
  const lottery = state.lottery || {};
  const stats = state.stats || {};
  const participants = Array.isArray(state.participants) ? state.participants : [];
  const events = Array.isArray(state.recent_events) ? state.recent_events : [];

  $("#lotteryId").textContent = lottery.id || "—";
  $("#lotteryStarted").textContent = formatDate(lottery.started_at);
  $("#lastScan").textContent = formatDate(lottery.last_scan_at);

  $("#statParticipants").textContent = formatNumber(stats.participants, 0);
  $("#statLots").textContent = formatNumber(stats.lots, 0);
  $("#statExo").textContent = formatNumber(stats.exo, 2);
  $("#statValue").textContent = formatMoney(stats.value);

  const badge = $("#eventStateBadge");
  badge.classList.toggle("online", Boolean(lottery.active));
  badge.classList.toggle("offline", !lottery.active);
  badge.querySelector("span").textContent = lottery.active ? "LIVE" : "OFFLINE";

  renderParticipants(participants);
  renderEvents(events);
  renderCountdown();
}

function renderParticipants(participants) {
  const filtered = participants.filter(p => {
    if (currentFilter === "qualified") return Boolean(p.qualified);
    if (currentFilter === "rejected") return !p.qualified;
    return true;
  });

  const table = $("#participantsTable");

  if (!filtered.length) {
    table.innerHTML = `<tr><td colspan="7" class="table-empty">Brak uczestników w tej kategorii.</td></tr>`;
    return;
  }

  table.innerHTML = filtered.map((p, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><span class="player-name">${escapeHTML(p.nick)}</span></td>
      <td>${formatNumber(p.exo, 2)}</td>
      <td><span class="lot-count">${formatNumber(p.lots, 0)}</span></td>
      <td>${formatMoney(p.value)}</td>
      <td>${formatNumber(p.transactions, 0)}</td>
      <td>
        <span class="${p.qualified ? "status-ok" : "status-bad"}">
          ${p.qualified ? "✓ ZAKWALIFIKOWANY" : `✕ ${escapeHTML(p.reason || "ODRZUCONY")}`}
        </span>
      </td>
    </tr>
  `).join("");
}

function renderEvents(events) {
  const box = $("#recentEvents");

  if (!events.length) {
    box.innerHTML = `<div class="empty">Brak nowych zakupów od startu loterii.</div>`;
    return;
  }

  box.innerHTML = events.slice(0, 30).map(event => `
    <div class="event-row">
      <div>
        <div class="event-name">${escapeHTML(event.nick)}</div>
        <div class="event-info">
          KUPNO • ${formatNumber(event.shares, 2)} EXO • wykryto ${formatDate(event.detected_at)}
        </div>
      </div>
      <div class="event-value">
        <strong>+${formatNumber(event.shares, 2)} EXO</strong>
        <small>${formatMoney(Math.abs(Number(event.value || 0)))}</small>
      </div>
    </div>
  `).join("");
}

function renderCountdown() {
  const lottery = currentState?.lottery;
  const label = $("#countdownLabel");
  const value = $("#countdown");
  const sub = $("#countdownSub");
  const progress = $("#progressBar");

  if (!lottery?.started_at) {
    label.textContent = "STATUS LOTERII";
    value.textContent = "--:--:--";
    sub.textContent = "Loteria nie została jeszcze uruchomiona";
    progress.style.width = "0%";
    return;
  }

  const start = new Date(lottery.started_at).getTime();
  const end = start + LOTTERY_DURATION_MS;
  const draw = end + DRAW_DELAY_MS;
  const now = Date.now();

  if (!lottery.active) {
    label.textContent = "LOTTERIA ZAKOŃCZONA";
    value.textContent = "00:00:00";
    sub.textContent = lottery.stopped_at ? `Zatrzymano ${formatDate(lottery.stopped_at)}` : "Stan nieaktywny";
    progress.style.width = "100%";
    return;
  }

  if (now < end) {
    label.textContent = "DO KOŃCA LOTERII";
    value.textContent = formatClock(end - now);
    sub.textContent = "Nowe zakupy EXO są wykrywane LIVE";
    const pct = Math.min(100, Math.max(0, ((now - start) / LOTTERY_DURATION_MS) * 75));
    progress.style.width = `${pct}%`;
    return;
  }

  if (now < draw) {
    label.textContent = "LOSOWANIE ZA";
    value.textContent = formatClock(draw - now);
    sub.textContent = "Okno zakupów według harmonogramu frontendu minęło";
    const pct = 75 + Math.min(25, ((now - end) / DRAW_DELAY_MS) * 25);
    progress.style.width = `${pct}%`;
    return;
  }

  label.textContent = "LOSOWANIE";
  value.textContent = "00:00:00";
  sub.textContent = "Czas na rozstrzygnięcie loterii";
  progress.style.width = "100%";
}

function bindFilters() {
  $$(".filter").forEach(button => {
    button.addEventListener("click", () => {
      $$(".filter").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter;
      renderParticipants(currentState?.participants || []);
    });
  });
}

function startApp() {
  bindFilters();
  fetchState();
  pollTimer = setInterval(fetchState, POLL_MS);
  countdownTimer = setInterval(renderCountdown, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchState();
  });
}

startApp();
