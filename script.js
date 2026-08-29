/* =========================================================
   EXODO STATS
   script.js
   API: EXODO / Hodowla RP
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev/api/recent?limit=20";

const PLAYER_BASE_URL = "https://hodowlarp.pl/gracz/";

let players = [];
let clans = [];
let lastApiData = null;

let charts = {
    activity: null,
    clan: null,
    activity2: null,
    wealth: null
};

/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function normalizeKey(value) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/[_\-\s]/g, "");
}

function numberFromValue(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined) {
        return 0;
    }

    let text = String(value)
        .replace(/\u00a0/g, " ")
        .replace(/\s/g, "")
        .replace(/\$/g, "")
        .replace(/,/g, "")
        .replace(/zł/gi, "")
        .trim();

    const match = text.match(/-?\d+(?:\.\d+)?/);

    if (!match) return 0;

    const number = Number(match[0]);

    return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
    const number = numberFromValue(value);

    return (
        new Intl.NumberFormat("pl-PL", {
            maximumFractionDigits: 0
        }).format(number) + "$"
    );
}

function formatNumber(value) {
    return new Intl.NumberFormat("pl-PL", {
        maximumFractionDigits: 0
    }).format(numberFromValue(value));
}

function getFirst(obj, keys, fallback = "") {
    if (!obj || typeof obj !== "object") return fallback;

    const objectKeys = Object.keys(obj);

    for (const wanted of keys) {
        const wantedNormalized = normalizeKey(wanted);

        const realKey = objectKeys.find(
            key => normalizeKey(key) === wantedNormalized
        );

        if (realKey !== undefined) {
            const value = obj[realKey];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return value;
            }
        }
    }

    return fallback;
}

/* =========================================================
   API DATA EXTRACTION
   ========================================================= */

function findPlayerArray(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    const possibleKeys = [
        "players",
        "gracze",
        "recent",
        "data",
        "results",
        "items",
        "users"
    ];

    for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    /*
       Jeżeli API zwróci obiekt typu:

       {
          data: {
              players: [...]
          }
       }

       szukamy rekurencyjnie.
    */

    for (const value of Object.values(data)) {
        if (Array.isArray(value)) {
            if (
                value.length === 0 ||
                typeof value[0] === "object"
            ) {
                return value;
            }
        }

        if (value && typeof value === "object") {
            const result = findPlayerArray(value);

            if (result.length) {
                return result;
            }
        }
    }

    return [];
}

function parsePlayer(raw, index) {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const name = normalizeText(
        getFirst(raw, [
            "name",
            "username",
            "player",
            "playerName",
            "nick",
            "nickname",
            "gracz",
            "login"
        ])
    );

    if (!name) {
        return null;
    }

    let level = numberFromValue(
        getFirst(raw, [
            "level",
            "lvl",
            "poziom",
            "playerLevel"
        ], 0)
    );

    let money = numberFromValue(
        getFirst(raw, [
            "money",
            "cash",
            "balance",
            "currency",
            "gotowka",
            "gotówka",
            "cashBalance"
        ], 0)
    );

    let clan = normalizeText(
        getFirst(raw, [
            "clan",
            "clanName",
            "gang",
            "gangName",
            "klan",
            "klanName"
        ], "")
    );

    let activity = normalizeText(
        getFirst(raw, [
            "activity",
            "lastActivity",
            "lastSeen",
            "lastOnline",
            "onlineStatus",
            "statusText",
            "active",
            "ostatniaAktywnosc",
            "ostatniaAktywność"
        ], "")
    );

    let online = getFirst(raw, [
        "online",
        "isOnline",
        "onlineNow",
        "activeNow"
    ], null);

    if (typeof online === "string") {
        online =
            online.toLowerCase() === "true" ||
            online.toLowerCase() === "online" ||
            online === "1";
    }

    /*
       API może zwracać aktywność jako obiekt.
    */

    if (activity && typeof activity === "object") {
        activity = normalizeText(
            getFirst(activity, [
                "text",
                "label",
                "description",
                "lastSeen",
                "status"
            ], "")
        );
    }

    /*
       Jeżeli API nie podało activity, ale podało online.
    */

    if (!activity && online === true) {
        activity = "Teraz Gra na serwerze";
    }

    if (!activity) {
        activity = "—";
    }

    /*
       Próba wyciągnięcia klanu z zagnieżdżonego obiektu.
    */

    if (raw.clan && typeof raw.clan === "object") {
        clan = normalizeText(
            getFirst(raw.clan, [
                "name",
                "title",
                "tag",
                "clanName"
            ], clan)
        );
    }

    return {
        id: index + 1,
        name,
        level,
        money,
        clan: clan || "—",
        activity,
        online: online === true,
        raw
    };
}

/* =========================================================
   CLAN DATA
   ========================================================= */

function buildClans(playerList) {
    const map = new Map();

    playerList.forEach(player => {
        if (!player.clan || player.clan === "—") return;

        const key = player.clan.toLowerCase();

        if (!map.has(key)) {
            map.set(key, {
                name: player.clan,
                leader: "—",
                members: 0,
                money: 0,
                wealth: 0,
                activity: "—",
                change: "—"
            });
        }

        const clan = map.get(key);

        clan.members += 1;
        clan.money += player.money;
        clan.wealth += player.money;

        if (clan.activity === "—" && player.activity !== "—") {
            clan.activity = player.activity;
        }
    });

    return Array.from(map.values()).sort(
        (a, b) => b.wealth - a.wealth
    );
}

/* =========================================================
   API
   ========================================================= */

async function fetchAPI() {
    try {
        showToast("↻ Pobieranie danych...");

        const response = await fetch(API_URL, {
            method: "GET",
            cache: "no-store",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `API HTTP ${response.status}`
            );
        }

        const data = await response.json();

        lastApiData = data;

        const rawPlayers = findPlayerArray(data);

        const parsedPlayers = rawPlayers
            .map((player, index) => parsePlayer(player, index))
            .filter(Boolean);

        players = parsedPlayers;

        clans = buildClans(players);

        renderEverything();

        showToast(
            `✓ Dane API załadowane: ${players.length} graczy`
        );

        return data;
    } catch (error) {
        console.error("EXODO API ERROR:", error);

        showToast("✕ Nie udało się pobrać danych API");

        /*
           Nie czyścimy poprzednich danych,
           jeśli API chwilowo nie odpowiada.
        */

        if (!players.length) {
            renderEmptyState();
        }

        return null;
    }
}

/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {
    updateDashboardStats();

    renderPlayersTable();
    renderRichPlayers();
    renderClansTable();
    renderAllClans();
    renderLevelRankings();
    renderMoneyRanking();
    renderMarket();
    renderSearchResults("");

    drawAllCharts();
}

/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
    const onlineCount = players.filter(
        player => player.online
    ).length;

    const totalMoney = players.reduce(
        (sum, player) => sum + player.money,
        0
    );

    const playerStat =
        document.querySelector(
            ".stats-grid .stat-card:nth-child(1) .stat-value"
        );

    const onlineStat = $("#onlinePlayers");

    const clanStat =
        document.querySelector(
            ".stats-grid .stat-card:nth-child(3) .stat-value"
        );

    const wealthStat =
        document.querySelector(
            ".stats-grid .stat-card:nth-child(4) .stat-value"
        );

    if (playerStat) {
        playerStat.textContent = formatNumber(players.length);
    }

    if (onlineStat) {
        onlineStat.textContent = formatNumber(onlineCount);
    }

    if (clanStat) {
        clanStat.textContent = formatNumber(clans.length);
    }

    if (wealthStat) {
        wealthStat.textContent = formatMoney(totalMoney);
    }

    /*
       Aktualizacja informacji ONLINE/OFFLINE
    */

    const serverStatus = document.querySelector(
        ".server-status"
    );

    if (serverStatus) {
        const onlineSpan =
            serverStatus.querySelector(
                "span:last-child"
            );

        if (onlineSpan) {
            onlineSpan.textContent = "ONLINE";
        }
    }
}

/* =========================================================
   PLAYER TABLE
   ========================================================= */

function playerRow(player, position) {
    const encodedName = encodeURIComponent(player.name);

    const statusClass = player.online
        ? "online"
        : "offline";

    const statusText = player.online
        ? "ONLINE"
        : "DANE API";

    return `
        <tr>
            <td><strong>${position}</strong></td>

            <td>
                <a
                    href="${PLAYER_BASE_URL}${encodedName}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="text-decoration:none;"
                >
                    <strong>${escapeHTML(player.name)}</strong>
                </a>
            </td>

            <td>
                <strong>${formatNumber(player.level)}</strong>
            </td>

            <td>
                ${formatMoney(player.money)}
            </td>

            <td>
                ${
                    player.clan !== "—"
                        ? `<strong>${escapeHTML(player.clan)}</strong>`
                        : "—"
                }
            </td>

            <td>
                ${
                    player.activity !== "—"
                        ? escapeHTML(player.activity)
                        : "—"
                }
            </td>

            <td>
                <span class="player-status ${statusClass}">
                    ● ${statusText}
                </span>
            </td>
        </tr>
    `;
}

function renderPlayersTable(list = players) {
    const table = $("#allPlayersTable");

    if (!table) return;

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        Brak danych graczy.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list
        .map((player, index) =>
            playerRow(player, index + 1)
        )
        .join("");
}

/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {
    const table = $("#richPlayersTable");

    if (!table) return;

    const rich = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    table.innerHTML = rich
        .map((player, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>

                <td>
                    <a
                        href="${PLAYER_BASE_URL}${encodeURIComponent(player.name)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="text-decoration:none;"
                    >
                        <strong>${escapeHTML(player.name)}</strong>
                    </a>
                </td>

                <td>${formatNumber(player.level)}</td>

                <td>${formatMoney(player.money)}</td>

                <td>
                    ${
                        player.clan !== "—"
                            ? escapeHTML(player.clan)
                            : "—"
                    }
                </td>

                <td>
                    ${
                        player.activity !== "—"
                            ? escapeHTML(player.activity)
                            : "—"
                    }
                </td>
            </tr>
        `)
        .join("");
}

/* =========================================================
   CLANS
   ========================================================= */

function clanRow(clan, position) {
    return `
        <tr>
            <td><strong>${position}</strong></td>

            <td>
                <strong>${escapeHTML(clan.name)}</strong>
            </td>

            <td>
                ${escapeHTML(clan.leader)}
            </td>

            <td>
                ${formatNumber(clan.members)}
            </td>

            <td>
                ${formatMoney(clan.money)}
            </td>

            <td>
                ${formatMoney(clan.wealth)}
            </td>

            <td>
                ${escapeHTML(clan.activity)}
            </td>

            <td>
                ${escapeHTML(clan.change)}
            </td>
        </tr>
    `;
}

function renderClansTable() {
    const table = $("#clanTable");

    if (!table) return;

    const list = clans.slice(0, 10);

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Brak danych klanów.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list
        .map((clan, index) =>
            clanRow(clan, index + 1)
        )
        .join("");
}

function renderAllClans(list = clans) {
    const table = $("#allClansTable");

    if (!table) return;

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Brak danych klanów.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list
        .map((clan, index) =>
            clanRow(clan, index + 1)
        )
        .join("");
}

/* =========================================================
   RANKINGS
   ========================================================= */

function rankingPlayerRow(player, index, value) {
    return `
        <div class="ranking-row"
             style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                padding:12px 0;
                border-bottom:1px solid rgba(255,255,255,.06);
             ">

            <div style="display:flex;align-items:center;gap:12px;">

                <div style="
                    width:28px;
                    height:28px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:8px;
                    background:rgba(139,92,246,.12);
                    font-weight:700;
                ">
                    ${index + 1}
                </div>

                <a
                    href="${PLAYER_BASE_URL}${encodeURIComponent(player.name)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="text-decoration:none;"
                >
                    <strong>${escapeHTML(player.name)}</strong>
                </a>

            </div>

            <strong>
                ${escapeHTML(value)}
            </strong>

        </div>
    `;
}

function renderLevelRankings() {
    const targets = [
        $("#levelRanking"),
        $("#levelRanking2")
    ];

    const top = [...players]
        .sort((a, b) => b.level - a.level)
        .slice(0, 10);

    targets.forEach(container => {
        if (!container) return;

        if (!top.length) {
            container.innerHTML = `
                <div class="empty-state">
                    Brak danych.
                </div>
            `;
            return;
        }

        container.innerHTML = top
            .map((player, index) =>
                rankingPlayerRow(
                    player,
                    index,
                    `${formatNumber(player.level)} lvl`
                )
            )
            .join("");
    });
}

function renderMoneyRanking() {
    const container = $("#moneyRanking");

    if (!container) return;

    const top = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    if (!top.length) {
        container.innerHTML = `
            <div class="empty-state">
                Brak danych.
            </div>
        `;
        return;
    }

    container.innerHTML = top
        .map((player, index) =>
            rankingPlayerRow(
                player,
                index,
                formatMoney(player.money)
            )
        )
        .join("");
}

/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {
    const table = $("#marketTable");

    if (!table) return;

    const list = [...clans]
        .sort((a, b) => b.wealth - a.wealth)
        .slice(0, 20);

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        Brak danych rynku.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list
        .map(clan => `
            <tr>
                <td>
                    <strong>${escapeHTML(clan.name)}</strong>
                </td>

                <td>
                    ${formatMoney(clan.wealth)}
                </td>

                <td>—</td>

                <td>—</td>

                <td>
                    <span class="player-status">
                        ● DANE API
                    </span>
                </td>
            </tr>
        `)
        .join("");
}

/* =========================================================
   SEARCH
   ========================================================= */

function searchPlayersAndClans(query) {
    const q = normalizeText(query).toLowerCase();

    if (!q) {
        renderSearchResults("");
        return;
    }

    const matchedPlayers = players.filter(player =>
        player.name.toLowerCase().includes(q) ||
        player.clan.toLowerCase().includes(q)
    );

    const matchedClans = clans.filter(clan =>
        clan.name.toLowerCase().includes(q)
    );

    renderSearchResults(
        q,
        matchedPlayers,
        matchedClans
    );
}

function renderSearchResults(
    query = "",
    matchedPlayers = [],
    matchedClans = []
) {
    const container = $("#searchResults");

    if (!container) return;

    if (!query) {
        container.innerHTML = `
            <div class="empty-state">
                <div>⌕</div>

                <h3>
                    Wpisz nazwę powyżej
                </h3>

                <p>
                    Wyszukiwarka znajdzie graczy oraz klany.
                </p>
            </div>
        `;

        return;
    }

    if (
        matchedPlayers.length === 0 &&
        matchedClans.length === 0
    ) {
        container.innerHTML = `
            <div class="empty-state">
                <div>⌕</div>

                <h3>
                    Brak wyników
                </h3>

                <p>
                    Nie znaleziono gracza ani klanu dla:
                    <strong>${escapeHTML(query)}</strong>
                </p>
            </div>
        `;

        return;
    }

    let html = "";

    if (matchedPlayers.length) {
        html += `
            <div style="margin-bottom:25px;">
                <div class="panel-title">
                    Gracze
                </div>

                <div style="margin-top:12px;">
        `;

        html += matchedPlayers
            .slice(0, 20)
            .map(player => `
                <a
                    href="${PLAYER_BASE_URL}${encodeURIComponent(player.name)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        padding:14px;
                        margin-bottom:8px;
                        border-radius:10px;
                        text-decoration:none;
                        background:rgba(255,255,255,.03);
                    "
                >
                    <span>
                        <strong>
                            ${escapeHTML(player.name)}
                        </strong>

                        <small style="opacity:.6;margin-left:8px;">
                            ${formatNumber(player.level)} lvl
                        </small>
                    </span>

                    <span>
                        ${formatMoney(player.money)}
                    </span>
                </a>
            `)
            .join("");

        html += `
                </div>
            </div>
        `;
    }

    if (matchedClans.length) {
        html += `
            <div>
                <div class="panel-title">
                    Klany
                </div>

                <div style="margin-top:12px;">
        `;

        html += matchedClans
            .slice(0, 20)
            .map(clan => `
                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        padding:14px;
                        margin-bottom:8px;
                        border-radius:10px;
                        background:rgba(255,255,255,.03);
                    "
                >
                    <strong>
                        ${escapeHTML(clan.name)}
                    </strong>

                    <span>
                        ${formatNumber(clan.members)} czł.
                    </span>
                </div>
            `)
            .join("");

        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

/* =========================================================
   SORTING / FILTERING
   ========================================================= */

function setupPlayerControls() {
    const search = $("#playerSearch");
    const sort = $("#playerSort");

    function refresh() {
        let result = [...players];

        const query = normalizeText(
            search ? search.value : ""
        ).toLowerCase();

        if (query) {
            result = result.filter(player =>
                player.name.toLowerCase().includes(query) ||
                player.clan.toLowerCase().includes(query)
            );
        }

        const sortValue = sort
            ? sort.value
            : "money";

        if (sortValue === "money") {
            result.sort((a, b) => b.money - a.money);
        }

        if (sortValue === "level") {
            result.sort((a, b) => b.level - a.level);
        }

        if (sortValue === "time") {
            result.sort((a, b) =>
                Number(b.online) - Number(a.online)
            );
        }

        renderPlayersTable(result);
    }

    if (search) {
        search.addEventListener("input", refresh);
    }

    if (sort) {
        sort.addEventListener("change", refresh);
    }
}

function setupClanControls() {
    const search = $("#clanSearch");
    const sort = $("#clanSort");

    function refresh() {
        let result = [...clans];

        const query = normalizeText(
            search ? search.value : ""
        ).toLowerCase();

        if (query) {
            result = result.filter(clan =>
                clan.name.toLowerCase().includes(query)
            );
        }

        const sortValue = sort
            ? sort.value
            : "money";

        if (sortValue === "money") {
            result.sort((a, b) =>
                b.wealth - a.wealth
            );
        }

        if (sortValue === "members") {
            result.sort((a, b) =>
                b.members - a.members
            );
        }

        if (sortValue === "time") {
            result.sort((a, b) =>
                String(b.activity).localeCompare(
                    String(a.activity)
                )
            );
        }

        renderAllClans(result);
    }

    if (search) {
        search.addEventListener("input", refresh);
    }

    if (sort) {
        sort.addEventListener("change", refresh);
    }
}

/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function setupGlobalSearch() {
    const input = $("#globalSearch");

    if (!input) return;

    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        const value = normalizeText(input.value);

        if (!value) return;

        goToPage("search");

        const pageInput = $("#globalSearchPage");

        if (pageInput) {
            pageInput.value = value;
        }

        searchPlayersAndClans(value);
    });
}

function setupSearchPage() {
    const input = $("#globalSearchPage");

    if (!input) return;

    input.addEventListener("input", () => {
        searchPlayersAndClans(input.value);
    });
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

const pageTitles = {
    dashboard: [
        "Dashboard",
        "Centrum statystyk Hodowla RP"
    ],

    clans: [
        "Klany",
        "Ranking klanów Hodowla RP"
    ],

    players: [
        "Gracze",
        "Statystyki graczy"
    ],

    rankings: [
        "Rankingi",
        "Najlepsi gracze i klany"
    ],

    charts: [
        "Wykresy",
        "Statystyki serwera"
    ],

    market: [
        "Rynek",
        "Zmiany wartości klanów"
    ],

    search: [
        "Wyszukiwarka",
        "Znajdź gracza lub klan"
    ]
};

function goToPage(pageName) {
    const pages = $all(".page");
    const navItems = $all(".nav-item");

    pages.forEach(page => {
        page.classList.toggle(
            "active",
            page.id === pageName
        );
    });

    navItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });

    const title = pageTitles[pageName];

    const h1 = document.querySelector(
        ".page-title h1"
    );

    const subtitle = document.querySelector(
        ".page-title p"
    );

    if (title) {
        if (h1) h1.textContent = title[0];
        if (subtitle) subtitle.textContent = title[1];
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    const sidebar = $("#sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    /*
       Po przejściu na wykresy odświeżamy canvasy,
       bo wcześniej sekcja mogła być ukryta.
    */

    if (pageName === "charts") {
        setTimeout(drawAllCharts, 100);
    }
}

function setupNavigation() {
    $all(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            goToPage(item.dataset.page);
        });
    });

    $all("[data-page-link]").forEach(button => {
        button.addEventListener("click", () => {
            goToPage(button.dataset.pageLink);
        });
    });
}

/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {
    const button = $("#mobileMenu");
    const sidebar = $("#sidebar");

    if (!button || !sidebar) return;

    button.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

/* =========================================================
   TOAST
   ========================================================= */

let toastTimeout = null;

function showToast(message) {
    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* =========================================================
   SIMPLE CANVAS CHARTS
   Nie wymaga Chart.js.
   ========================================================= */

function clearCanvas(canvas) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    const width =
        Math.max(rect.width, 300);

    const height =
        Math.max(rect.height, 260);

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    return {
        ctx,
        width,
        height
    };
}

function drawLineChart(canvas, values, labels) {
    const chart = clearCanvas(canvas);

    if (!chart) return;

    const {
        ctx,
        width,
        height
    } = chart;

    const padding = 35;

    if (!values.length) {
        ctx.font = "14px Arial";
        ctx.fillText(
            "Brak danych",
            padding,
            height / 2
        );
        return;
    }

    const max =
        Math.max(...values, 1);

    const min =
        Math.min(...values, 0);

    const range =
        Math.max(max - min, 1);

    /*
       Linie poziome
    */

    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y =
            padding +
            ((height - padding * 2) / 4) * i;

        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    /*
       Linia
    */

    ctx.beginPath();

    values.forEach((value, index) => {
        const x =
            padding +
            (index /
                Math.max(values.length - 1, 1)) *
                (width - padding * 2);

        const y =
            height -
            padding -
            ((value - min) / range) *
                (height - padding * 2);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.lineWidth = 3;
    ctx.stroke();

    /*
       Punkty
    */

    values.forEach((value, index) => {
        const x =
            padding +
            (index /
                Math.max(values.length - 1, 1)) *
                (width - padding * 2);

        const y =
            height -
            padding -
            ((value - min) / range) *
                (height - padding * 2);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    /*
       Etykiety
    */

    ctx.font = "11px Arial";
    ctx.globalAlpha = 0.65;

    labels.forEach((label, index) => {
        const x =
            padding +
            (index /
                Math.max(labels.length - 1, 1)) *
                (width - padding * 2);

        ctx.fillText(
            label,
            x - 12,
            height - 10
        );
    });

    ctx.globalAlpha = 1;
}

function drawBarChart(canvas, values, labels) {
    const chart = clearCanvas(canvas);

    if (!chart) return;

    const {
        ctx,
        width,
        height
    } = chart;

    const padding = 35;

    if (!values.length) {
        ctx.font = "14px Arial";
        ctx.fillText(
            "Brak danych",
            padding,
            height / 2
        );
        return;
    }

    const max =
        Math.max(...values, 1);

    const availableWidth =
        width - padding * 2;

    const barWidth =
        availableWidth /
        values.length *
        0.65;

    values.forEach((value, index) => {
        const x =
            padding +
            index *
                (availableWidth / values.length) +
            (availableWidth / values.length - barWidth) /
                2;

        const barHeight =
            (value / max) *
            (height - padding * 2);

        const y =
            height -
            padding -
            barHeight;

        ctx.globalAlpha = 0.8;

        ctx.fillRect(
            x,
            y,
            barWidth,
            barHeight
        );

        ctx.globalAlpha = 0.65;

        ctx.font = "10px Arial";

        ctx.fillText(
            labels[index] || "",
            x,
            height - 10
        );
    });

    ctx.globalAlpha = 1;
}

/* =========================================================
   CHART DATA
   ========================================================= */

function drawAllCharts() {
    /*
       Aktywność:
       jeżeli mamy online/offline, pokazujemy liczbę online.
       Dla recent API nie mamy historii 7 dni,
       więc nie udajemy, że mamy historyczne dane.
    */

    const online =
        players.filter(
            player => player.online
        ).length;

    const activityValues =
        players.length
            ? [online, online, online, online, online, online, online]
            : [];

    const activityLabels = [
        "Pon",
        "Wt",
        "Śr",
        "Czw",
        "Pt",
        "Sob",
        "Nd"
    ];

    drawLineChart(
        $("#activityChart"),
        activityValues,
        activityLabels
    );

    drawLineChart(
        $("#activityChart2"),
        activityValues,
        activityLabels
    );

    /*
       Top klany
    */

    const topClans =
        [...clans]
            .sort((a, b) => b.wealth - a.wealth)
            .slice(0, 10);

    const clanValues =
        topClans.map(
            clan => clan.wealth
        );

    const clanLabels =
        topClans.map(
            clan => clan.name
        );

    drawBarChart(
        $("#clanChart"),
        clanValues,
        clanLabels
    );

    drawBarChart(
        $("#wealthChart"),
        clanValues,
        clanLabels
    );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function renderEmptyState() {
    const tables = [
        "#allPlayersTable",
        "#richPlayersTable",
        "#clanTable",
        "#allClansTable",
        "#marketTable"
    ];

    tables.forEach(selector => {
        const table = $(selector);

        if (!table) return;

        const colspan =
            selector.includes("Players")
                ? 7
                : selector.includes("Clans") ||
                  selector === "#clanTable"
                    ? 8
                    : 5;

        table.innerHTML = `
            <tr>
                <td colspan="${colspan}">
                    <div class="empty-state">
                        Brak danych API.
                    </div>
                </td>
            </tr>
        `;
    });
}

/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setupRefresh() {
    const button = $("#refreshButton");

    if (!button) return;

    button.addEventListener("click", async () => {
        button.disabled = true;

        const oldText = button.textContent;

        button.textContent = "↻ Ładowanie...";

        await fetchAPI();

        button.disabled = false;
        button.textContent = oldText;
    });
}

/* =========================================================
   AUTO REFRESH
   ========================================================= */

function setupAutoRefresh() {
    /*
       Odświeżenie co 60 sekund.
       Możesz zmienić 60000 na np. 30000 = 30 sekund.
    */

    setInterval(() => {
        fetchAPI();
    }, 60000);
}

/* =========================================================
   WINDOW RESIZE
   ========================================================= */

let resizeTimeout = null;

window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        drawAllCharts();
    }, 200);
});

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    setupNavigation();
    setupMobileMenu();

    setupGlobalSearch();
    setupSearchPage();

    setupPlayerControls();
    setupClanControls();

    setupRefresh();

    /*
       Najpierw pokazujemy pusty stan.
    */

    renderEmptyState();

    /*
       Następnie pobieramy prawdziwe dane API.
    */

    await fetchAPI();

    /*
       Automatyczne odświeżanie.
    */

    setupAutoRefresh();

});
