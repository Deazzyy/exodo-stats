const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";
const STATE_URL = `${API_BASE}/api/exo/lottery/state`;
const TRANSACTIONS_URL = `${API_BASE}/api/exo/transactions`;
const POLL_MS = 5000;

let currentState = null;
let currentFilter = "qualified";
let currentMarketTransactions = [];
let currentMarket = null;

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
    maximumFractionDigits: digits,
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
    second: "2-digit",
  });
}

function formatClock(ms) {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
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
    const [stateResult, transactionsResult] = await Promise.allSettled([
      fetch(`${STATE_URL}?t=${Date.now()}`, {
        cache: "no-store",
      }),
      fetch(`${TRANSACTIONS_URL}?t=${Date.now()}`, {
        cache: "no-store",
      }),
    ]);

    if (
      stateResult.status !== "fulfilled" ||
      !stateResult.value.ok
    ) {
      const status =
        stateResult.status === "fulfilled"
          ? stateResult.value.status
          : "network";

      throw new Error(`Lottery API HTTP ${status}`);
    }

    const data = await stateResult.value.json();

    if (!data.ok) {
      throw new Error(data.error || "API zwróciło błąd");
    }

    currentState = data;

    if (
      transactionsResult.status === "fulfilled" &&
      transactionsResult.value.ok
    ) {
      const txData = await transactionsResult.value.json();

      currentMarketTransactions =
        txData.ok && Array.isArray(txData.all_transactions)
          ? txData.all_transactions
          : (txData.ok && Array.isArray(txData.transactions)
              ? txData.transactions
              : []);

      currentMarket =
        txData.ok && txData.market
          ? txData.market
          : null;
    }

    renderState();

    setApiStatus(
      true,
      data.lottery?.active ? "LOTTERY LIVE" : "ONLINE"
    );

    $("#syncText").textContent =
      `Ostatnia aktualizacja ${new Date().toLocaleTimeString("pl-PL")} • co 5 s`;
  } catch (error) {
    console.error("EXODO API:", error);
    setApiStatus(false, "BŁĄD API");
    $("#syncText").textContent = "Nie udało się pobrać danych";
  }
}


function ensureDrawStyles() {
  if (document.getElementById("exoDrawStyles")) return;

  const style = document.createElement("style");
  style.id = "exoDrawStyles";
  style.textContent = `
    #drawResultsSection{padding-top:0}
    .draw-results-panel{border:1px solid var(--line);background:linear-gradient(145deg,rgba(192,0,255,.08),var(--panel));padding:28px}
    .draw-results-head{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}
    .draw-results-head h2{font-size:34px;letter-spacing:-.045em;margin:8px 0 0}
    .draw-time{font-size:9px;color:#737b88}
    .winners-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .winner-card{display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:14px;border:1px solid var(--line);background:#0b0e14;padding:17px}
    .winner-place{font-size:18px;font-weight:900;color:#d669ff}
    .winner-nick{font-size:14px;font-weight:900}
    .winner-meta{font-size:9px;color:#6e7683;margin-top:5px}
    .winner-prize{text-align:right;font-size:10px;font-weight:800;color:#72ff9d}
    @media(max-width:760px){.winners-grid{grid-template-columns:1fr}.winner-card{grid-template-columns:42px 1fr}.winner-prize{grid-column:2;text-align:left}}
  `;
  document.head.appendChild(style);
}

function ensureDrawSection() {
  let section = document.getElementById("drawResultsSection");
  if (section) return section;

  ensureDrawStyles();

  section = document.createElement("section");
  section.className = "section";
  section.id = "drawResultsSection";
  section.innerHTML = `
    <div class="draw-results-panel">
      <div class="draw-results-head">
        <div>
          <span class="kicker">OFFICIAL DRAW</span>
          <h2>Wyniki losowania</h2>
        </div>
        <div class="draw-time" id="drawTime">Oczekiwanie na losowanie</div>
      </div>
      <div id="drawResultsBody" class="empty">Losowanie nie zostało jeszcze wykonane.</div>
    </div>
  `;

  const footer = document.querySelector("footer");
  if (footer) {
    footer.parentNode.insertBefore(section, footer);
  } else {
    document.body.appendChild(section);
  }

  return section;
}

function renderDraw(draw) {
  const section = ensureDrawSection();
  const body = section.querySelector("#drawResultsBody");
  const time = section.querySelector("#drawTime");

  if (!draw?.completed) {
    body.className = "empty";
    body.innerHTML = "Losowanie nie zostało jeszcze wykonane.";
    time.textContent = currentState?.lottery?.draw_at
      ? `Zaplanowane: ${formatDate(currentState.lottery.draw_at)}`
      : "Oczekiwanie na losowanie";
    return;
  }

  const winners = Array.isArray(draw.winners) ? draw.winners : [];
  time.textContent = `Wylosowano: ${formatDate(draw.drawn_at)} • ${formatNumber(draw.total_lots, 0)} losów`;

  if (!winners.length) {
    body.className = "empty";
    body.innerHTML = "Brak zakwalifikowanych uczestników do wylosowania.";
    return;
  }

  body.className = "winners-grid";
  body.innerHTML = winners.map((w) => `
    <article class="winner-card">
      <div class="winner-place">#${w.place}</div>
      <div>
        <div class="winner-nick">${escapeHTML(w.nick)}</div>
        <div class="winner-meta">${formatNumber(w.exo, 2)} EXO • ${formatNumber(w.lots, 0)} losów</div>
      </div>
      <div class="winner-prize">${escapeHTML(w.prize || "Nagroda")}</div>
    </article>
  `).join("");
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
  renderMarket(currentMarket);
  renderEvents(currentMarketTransactions, events);
  renderDraw(state.draw);
  renderCountdown();
}

function renderParticipants(participants) {
  const filtered = participants.filter((p) => {
    if (currentFilter === "qualified") return Boolean(p.qualified);
    if (currentFilter === "rejected") return !p.qualified;
    return true;
  });

  const table = $("#participantsTable");

  if (!filtered.length) {
    table.innerHTML =
      `<tr><td colspan="7" class="table-empty">Brak uczestników w tej kategorii.</td></tr>`;
    return;
  }

  table.innerHTML = filtered
    .map(
      (p, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><span class="player-name">${escapeHTML(p.nick)}</span></td>
      <td>${formatNumber(p.exo, 2)}</td>
      <td><span class="lot-count">${formatNumber(p.lots, 0)}</span></td>
      <td>${formatMoney(p.value)}</td>
      <td>${formatNumber(p.transactions, 0)}</td>
      <td>
        <span class="${p.qualified ? "status-ok" : "status-bad"}">
          ${
            p.qualified
              ? "✓ ZAKWALIFIKOWANY"
              : `✕ ${escapeHTML(p.reason || "ODRZUCONY")}`
          }
        </span>
      </td>
    </tr>`
    )
    .join("");
}

function compactMarketNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  if (Math.abs(n) >= 1000000) {
    return `${formatNumber(n / 1000000, 2)} mln`;
  }
  if (Math.abs(n) >= 1000) {
    return `${formatNumber(n / 1000, 1)} tys.`;
  }
  return formatNumber(n, 2);
}

function setMarketValue(selector, value) {
  const el = $(selector);
  if (!el) return;
  el.textContent = value;
  el.classList.add("live-updated");
}

function renderMarket(market) {
  if (!market) return;

  setMarketValue(
    "#marketPrice",
    Number.isFinite(Number(market.price))
      ? `${formatNumber(market.price, 2)}$`
      : "—"
  );

  setMarketValue(
    "#marketLiquidity",
    Number.isFinite(Number(market.liquidity))
      ? `${compactMarketNumber(market.liquidity)}$`
      : "—"
  );

  setMarketValue("#marketRating", market.rating || "—");

  setMarketValue(
    "#marketCommission",
    Number.isFinite(Number(market.commission))
      ? `${formatNumber(market.commission, 2)}%`
      : "—"
  );

  setMarketValue(
    "#marketShares",
    Number.isFinite(Number(market.shares_in_circulation))
      ? `${formatNumber(market.shares_in_circulation, 2)} EXO`
      : "—"
  );
}


function renderEvents(marketTransactions, lotteryEvents = []) {
  const box = $("#recentEvents");
  const live = Array.isArray(marketTransactions) ? marketTransactions : [];

  if (live.length) {
    box.innerHTML = live
      .slice(0, 30)
      .map((event) => {
        const isSell = event.type === "sell";
        const typeText = isSell ? "SPRZEDAŻ" : "KUPNO";
        const sharesNumber = Number(event.shares || 0);
        const signedShares =
          `${isSell ? "-" : "+"}${formatNumber(Math.abs(sharesNumber), 2)} EXO`;

        return `
          <div class="event-row ${isSell ? "market-sell" : ""}">
            <div>
              <div class="event-name">
                <span class="market-type ${isSell ? "sell" : ""}">${typeText}</span>
                ${escapeHTML(event.nick)}
              </div>
              <div class="event-info">
                ${formatNumber(Math.abs(sharesNumber), 2)} EXO
                ${event.time && event.time !== "—" ? ` • ${escapeHTML(event.time)}` : ""}
              </div>
            </div>
            <div class="event-value">
              <strong>${signedShares}</strong>
              <small>${formatMoney(Math.abs(Number(event.value || 0)))}</small>
            </div>
          </div>
        `;
      })
      .join("");
    return;
  }

  if (Array.isArray(lotteryEvents) && lotteryEvents.length) {
    box.innerHTML = lotteryEvents
      .slice(0, 30)
      .map((event) => `
        <div class="event-row">
          <div>
            <div class="event-name">
              <span class="market-type">KUPNO</span>
              ${escapeHTML(event.nick)}
            </div>
            <div class="event-info">
              ${formatNumber(event.shares, 2)} EXO • wykryto ${formatDate(event.detected_at)}
            </div>
          </div>
          <div class="event-value">
            <strong>+${formatNumber(event.shares, 2)} EXO</strong>
            <small>${formatMoney(Math.abs(Number(event.value || 0)))}</small>
          </div>
        </div>
      `)
      .join("");
    return;
  }

  box.innerHTML = `<div class="empty">Brak aktualnych transakcji EXO.</div>`;
}


function renderCountdown() {
  const lottery = currentState?.lottery;
  const label = $("#countdownLabel");
  const value = $("#countdown");
  const sub = $("#countdownSub");
  const progress = $("#progressBar");

  if (!lottery?.started_at || !lottery?.end_at || !lottery?.draw_at) {
    label.textContent = "STATUS LOTERII";
    value.textContent = "--:--:--";
    sub.textContent = "Brak pełnego harmonogramu w API";
    progress.style.width = "0%";
    return;
  }

  const start = new Date(lottery.started_at).getTime();
  const end = new Date(lottery.end_at).getTime();
  const draw = new Date(lottery.draw_at).getTime();
  const now = Date.now();

  if (now < start) {
    label.textContent = "DO STARTU LOTERII";
    value.textContent = formatClock(start - now);
    sub.textContent = `Start: ${formatDate(lottery.started_at)}`;
    progress.style.width = "0%";
    return;
  }

  if (now < end && lottery.active) {
    label.textContent = "DO KOŃCA LOTERII";
    value.textContent = formatClock(end - now);
    sub.textContent = `Koniec zakupów: ${formatDate(lottery.end_at)}`;

    const total = end - start;
    const elapsed = now - start;
    progress.style.width = `${Math.min(75, Math.max(0, (elapsed / total) * 75))}%`;
    return;
  }

  if (now < draw) {
    label.textContent = "LOSOWANIE ZA";
    value.textContent = formatClock(draw - now);
    sub.textContent = `Losowanie: ${formatDate(lottery.draw_at)}`;

    const total = draw - end;
    const elapsed = Math.max(0, now - end);
    progress.style.width = `${75 + Math.min(25, (elapsed / total) * 25)}%`;
    return;
  }

  const drawDone = Boolean(currentState?.draw?.completed);
  label.textContent = drawDone ? "WYNIKI GOTOWE" : (lottery.active ? "LOSOWANIE" : "LOTERIA ZAKOŃCZONA");
  value.textContent = "00:00:00";
  sub.textContent = drawDone
    ? `Wylosowano ${formatDate(currentState.draw.drawn_at)}`
    : lottery.active
      ? "Nadszedł czas losowania"
      : lottery.stopped_at
        ? `Zatrzymano ${formatDate(lottery.stopped_at)}`
        : "Stan nieaktywny";
  progress.style.width = "100%";
}

function bindFilters() {
  $$(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".filter").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter;
      renderParticipants(currentState?.participants || []);
    });
  });
}

function updateLiveMarketLabels() {
  const title = document.querySelector(".activity-panel h3");
  if (title) title.textContent = "Aktualne transakcje EXO";

  const kicker = document.querySelector(".activity-panel .kicker");
  if (kicker) kicker.textContent = "LIVE MARKET";

  const infoTitle = document.querySelector(".info-panel h3");
  if (infoTitle) infoTitle.textContent = "Jak działa loteria?";

  const infoText = document.querySelector(".info-panel p");
  if (infoText) {
    infoText.textContent =
      "Sekcja po lewej pokazuje bieżące kupna i sprzedaże EXO z HodowlaRP. " +
      "Do uczestników i losów trafiają jednak wyłącznie zakupy wykryte " +
      "po starcie i przed końcem konkretnej loterii.";
  }
}


function startApp() {
  updateLiveMarketLabels();
  bindFilters();
  fetchState();
  setInterval(fetchState, POLL_MS);
  setInterval(renderCountdown, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchState();
  });
}

startApp();
