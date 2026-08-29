/* =========================================================
   EXODO STATS
   API: Hodowla RP
   ========================================================= */

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

let players = [];
let clans = [];
let charts = {};

/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0$";
    }

    return number.toLocaleString("pl-PL") + "$";
}

function getLevel(player) {
    const level = Number(player?.level);

    if (!Number.isFinite(level) || level <= 0) {
        return "—";
    }

    return level;
}

function getClan(player) {
    const clan = player?.clan;

    if (!clan) {
        return "—";
    }

    const text = String(clan).trim();

    if (
        !text ||
        text.toLowerCase().includes("nie należy do żadnego klanu")
    ) {
        return "—";
    }

    return text;
}

function getRank(player) {
    const rank = player?.rank;

    if (!rank) {
        return "—";
    }

    const text = String(rank).trim();

    if (!text) {
        return "—";
    }

    return text;
}

function getLastSeen(player) {
    if (player?.lastSeen) {
        return String(player.lastSeen)
            .replace(/\s+/g, " ")
            .trim();
    }

    if (player?.playtime) {
        const text = String(player.playtime)
            .replace(/\s+/g, " ")
            .trim();

        if (text) {
            return text;
        }
    }

    return "—";
}

function getStatus(player) {
    if (player?.status === true || player?.status === "online") {
        return "ONLINE";
    }

    if (
        player?.lastSeen &&
        String(player.lastSeen).toLowerCase().includes("teraz")
    ) {
        return "ONLINE";
    }

    return "DANE API";
}

function getStatusHTML(player) {
    const status = getStatus(player);

    if (status === "ONLINE") {
        return `<span class="status-online">● ONLINE</span>`;
    }

    return `<span class="status-api">● DANE API</span>`;
}

function getPlayerUrl(player) {
    if (player?.sourceUrl) {
        return player.sourceUrl;
    }

    return `https://hodowlarp.pl/gracz/${encodeURIComponent(
        player?.name || ""
    )}`;
}

/* =========================================================
   API
   ========================================================= */

async function apiFetch(path) {
    const url = API_BASE + path;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json"
        },
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `API HTTP ${response.status} dla ${path}`
        );
    }

    const data = await response.json();

    if (!data || data.success === false) {
        throw new Error(
            data?.error || "API zwróciło błąd"
        );
    }

    return data;
}

async function loadRecentPlayers() {
    const data = await apiFetch("/api/recent?limit=100");

    return Array.isArray(data.players)
        ? data.players
        : [];
}

async function loadPlayer(name) {
    if (!name) {
        return null;
    }

    try {
        const data = await apiFetch(
            `/api/player?name=${encodeURIComponent(name)}`
        );

        return data?.player || null;
    } catch (error) {
        console.warn(
            `Nie udało się pobrać gracza ${name}:`,
            error
        );

        return null;
    }
}

/*
 * Recent API zwraca listę graczy.
 * Następnie pobieramy /api/player dla każdego gracza,
 * dzięki czemu Dashboard otrzymuje pełne dane.
 */
async function loadPlayersWithDetails() {
    const recent = await loadRecentPlayers();

    if (!recent.length) {
        return [];
    }

    const results = await Promise.all(
        recent.map(async (basicPlayer) => {
            const detailed = await loadPlayer(
                basicPlayer.name
            );

            return {
                ...basicPlayer,
                ...(detailed || {})
            };
        })
    );

    return results.filter(
        player => player && player.name
    );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboardStats() {
    const totalPlayers = players.length;

    const totalElement = document.querySelector(
        ".stat-card:nth-child(1) .stat-value"
    );

    if (totalElement) {
        totalElement.textContent =
            totalPlayers.toLocaleString("pl-PL");
    }

    const online = players.filter(
        player => getStatus(player) === "ONLINE"
    ).length;

    const onlineElement = $("onlinePlayers");

    if (onlineElement) {
        onlineElement.textContent =
            online.toLocaleString("pl-PL");
    }

    const clansCount = new Set(
        players
            .map(player => getClan(player))
            .filter(clan => clan !== "—")
    ).size;

    const clanElement = document.querySelector(
        ".stat-card:nth-child(3) .stat-value"
    );

    if (clanElement) {
        clanElement.textContent =
            clansCount.toLocaleString("pl-PL");
    }

    const wealth = players.reduce(
        (sum, player) => {
            const money = Number(player.money);

            if (Number.isFinite(money)) {
                return sum + money;
            }

            return sum;
        },
        0
    );

    const wealthElement = document.querySelector(
        ".stat-card:nth-child(4) .stat-value"
    );

    if (wealthElement) {
        wealthElement.textContent =
            formatCompactMoney(wealth);
    }
}

function formatCompactMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0$";
    }

    if (number >= 1_000_000_000) {
        return (
            (number / 1_000_000_000)
                .toFixed(1)
                .replace(".0", "") +
            "B$"
        );
    }

    if (number >= 1_000_000) {
        return (
            (number / 1_000_000)
                .toFixed(1)
                .replace(".0", "") +
            "M$"
        );
    }

    if (number >= 1_000) {
        return (
            (number / 1_000)
                .toFixed(1)
                .replace(".0", "") +
            "K$"
        );
    }

    return formatMoney(number);
}

/* =========================================================
   PLAYER TABLE
   ========================================================= */

function playerRow(player, index, showStatus = true) {
    const name = escapeHTML(player.name || "Nieznany");
    const level = escapeHTML(getLevel(player));
    const money = formatMoney(player.money);
    const clan = escapeHTML(getClan(player));
    const lastSeen = escapeHTML(getLastSeen(player));

    return `
        <tr>
            <td>
                <strong>${index + 1}</strong>
            </td>

            <td>
                <a
                    href="${escapeHTML(getPlayerUrl(player))}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="player-link"
                >
                    <strong>${name}</strong>
                </a>
            </td>

            <td>
                ${level}
            </td>

            <td>
                ${money}
            </td>

            <td>
                <strong>${clan}</strong>
            </td>

            <td>
                ${lastSeen}
            </td>

            ${
                showStatus
                    ? `
                        <td>
                            ${getStatusHTML(player)}
                        </td>
                    `
                    : ""
            }
        </tr>
    `;
}

function renderPlayersTable(list = players) {
    const table = $("allPlayersTable");

    if (!table) {
        return;
    }

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Brak graczy</h3>
                        <p>API nie zwróciło żadnych graczy.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    const sorted = [...list];

    const sortSelect = $("playerSort");
    const sort = sortSelect?.value || "money";

    if (sort === "money") {
        sorted.sort(
            (a, b) =>
                Number(b.money || 0) -
                Number(a.money || 0)
        );
    }

    if (sort === "level") {
        sorted.sort(
            (a, b) =>
                Number(b.level || 0) -
                Number(a.level || 0)
        );
    }

    if (sort === "time") {
        sorted.sort((a, b) =>
            getLastSeen(a).localeCompare(
                getLastSeen(b),
                "pl"
            )
        );
    }

    table.innerHTML = sorted
        .map((player, index) =>
            playerRow(player, index, true)
        )
        .join("");
}

/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {
    const table = $("richPlayersTable");

    if (!table) {
        return;
    }

    const rich = [...players]
        .sort(
            (a, b) =>
                Number(b.money || 0) -
                Number(a.money || 0)
        )
        .slice(0, 10);

    if (!rich.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Brak danych z API
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = rich
        .map((player, index) => `
            <tr>
                <td>
                    <strong>${index + 1}</strong>
                </td>

                <td>
                    <a
                        href="${escapeHTML(getPlayerUrl(player))}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="player-link"
                    >
                        <strong>
                            ${escapeHTML(player.name)}
                        </strong>
                    </a>
                </td>

                <td>
                    ${escapeHTML(getLevel(player))}
                </td>

                <td>
                    ${formatMoney(player.money)}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(getClan(player))}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(getLastSeen(player))}
                </td>
            </tr>
        `)
        .join("");
}

/* =========================================================
   LEVEL RANKING
   ========================================================= */

function renderLevelRanking(targetId = "levelRanking") {
    const container = $(targetId);

    if (!container) {
        return;
    }

    const ranking = [...players]
        .sort(
            (a, b) =>
                Number(b.level || 0) -
                Number(a.level || 0)
        )
        .slice(0, 10);

    if (!ranking.length) {
        container.innerHTML =
            `<div class="empty-state">Brak danych.</div>`;

        return;
    }

    container.innerHTML = ranking
        .map((player, index) => `
            <div
                class="ranking-row"
                style="
                    display:flex;
                    align-items:center;
                    gap:12px;
                    padding:12px 0;
                    border-bottom:1px solid rgba(255,255,255,.06);
                "
            >
                <div
                    style="
                        width:28px;
                        font-weight:700;
                        opacity:.6;
                    "
                >
                    ${index + 1}
                </div>

                <div style="flex:1;">
                    <strong>
                        ${escapeHTML(player.name)}
                    </strong>

                    <div
                        style="
                            font-size:12px;
                            opacity:.55;
                            margin-top:3px;
                        "
                    >
                        ${escapeHTML(getClan(player))}
                    </div>
                </div>

                <div>
                    <strong>
                        LVL ${escapeHTML(getLevel(player))}
                    </strong>
                </div>
            </div>
        `)
        .join("");
}

/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {
    const container = $("moneyRanking");

    if (!container) {
        return;
    }

    const ranking = [...players]
        .sort(
            (a, b) =>
                Number(b.money || 0) -
                Number(a.money || 0)
        )
        .slice(0, 10);

    if (!ranking.length) {
        container.innerHTML =
            `<div class="empty-state">Brak danych.</div>`;

        return;
    }

    container.innerHTML = ranking
        .map((player, index) => `
            <div
                class="ranking-row"
                style="
                    display:flex;
                    align-items:center;
                    gap:12px;
                    padding:12px 0;
                    border-bottom:1px solid rgba(255,255,255,.06);
                "
            >
                <div
                    style="
                        width:28px;
                        font-weight:700;
                        opacity:.6;
                    "
                >
                    ${index + 1}
                </div>

                <div style="flex:1;">
                    <strong>
                        ${escapeHTML(player.name)}
                    </strong>

                    <div
                        style="
                            font-size:12px;
                            opacity:.55;
                            margin-top:3px;
                        "
                    >
                        LVL ${escapeHTML(getLevel(player))}
                    </div>
                </div>

                <div>
                    <strong>
                        ${formatMoney(player.money)}
                    </strong>
                </div>
            </div>
        `)
        .join("");
}

/* =========================================================
   SEARCH
   ========================================================= */

function searchPlayers(query) {
    const text = String(query || "")
        .trim()
        .toLowerCase();

    if (!text) {
        return players;
    }

    return players.filter(player => {
        const name = String(
            player.name || ""
        ).toLowerCase();

        const clan = String(
            getClan(player)
        ).toLowerCase();

        return (
            name.includes(text) ||
            clan.includes(text)
        );
    });
}

function renderSearchResults(query) {
    const container = $("searchResults");

    if (!container) {
        return;
    }

    const text = String(query || "").trim();

    if (!text) {
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

    const results = searchPlayers(text);

    if (!results.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>⌕</div>

                <h3>
                    Nie znaleziono
                </h3>

                <p>
                    Brak gracza lub klanu pasującego do:
                    <strong>${escapeHTML(text)}</strong>
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div
            style="
                display:grid;
                gap:10px;
            "
        >
            ${results
                .map(player => `
                    <a
                        href="${escapeHTML(getPlayerUrl(player))}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            gap:20px;
                            padding:16px;
                            border-radius:12px;
                            text-decoration:none;
                        "
                    >
                        <div>
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>

                            <div
                                style="
                                    margin-top:5px;
                                    opacity:.6;
                                    font-size:13px;
                                "
                            >
                                Klan:
                                ${escapeHTML(getClan(player))}
                            </div>
                        </div>

                        <div
                            style="
                                text-align:right;
                                font-size:13px;
                            "
                        >
                            <strong>
                                LVL ${escapeHTML(getLevel(player))}
                            </strong>

                            <div
                                style="
                                    margin-top:4px;
                                    opacity:.6;
                                "
                            >
                                ${formatMoney(player.money)}
                            </div>
                        </div>
                    </a>
                `)
                .join("")}
        </div>
    `;
}

/*
 * Wyszukiwanie konkretnego gracza:
 * najpierw szukamy w aktualnie pobranej liście.
 * Jeżeli nie ma wyniku, próbujemy bezpośrednio API.
 */
let searchTimer = null;

async function performGlobalSearch(query) {
    const text = String(query || "").trim();

    if (!text) {
        return;
    }

    const localResults = searchPlayers(text);

    if (localResults.length) {
        showPage("search");

        const pageInput = $("globalSearchPage");

        if (pageInput) {
            pageInput.value = text;
        }

        renderSearchResults(text);

        return;
    }

    try {
        const player = await loadPlayer(text);

        if (player) {
            const exists = players.some(
                p =>
                    String(p.name).toLowerCase() ===
                    String(player.name).toLowerCase()
            );

            if (!exists) {
                players.push(player);
            }

            showPage("search");

            const pageInput = $("globalSearchPage");

            if (pageInput) {
                pageInput.value = text;
            }

            renderSearchResults(text);

            return;
        }
    } catch (error) {
        console.warn(error);
    }

    showPage("search");

    const pageInput = $("globalSearchPage");

    if (pageInput) {
        pageInput.value = text;
    }

    renderSearchResults(text);
}

/* =========================================================
   CLANS
   ========================================================= */

function buildClansFromPlayers() {
    const map = new Map();

    players.forEach(player => {
        const clan = getClan(player);

        if (clan === "—") {
            return;
        }

        if (!map.has(clan)) {
            map.set(clan, {
                name: clan,
                members: 0,
                money: 0,
                players: []
            });
        }

        const item = map.get(clan);

        item.members++;

        item.money += Number(player.money || 0);

        item.players.push(player);
    });

    clans = Array.from(map.values());
}

function renderClansTable() {
    const table =
        $("allClansTable") ||
        $("clanTable");

    if (!table) {
        return;
    }

    const sort = $("clanSort")?.value || "money";

    const clanList = [...clans];

    if (sort === "members") {
        clanList.sort(
            (a, b) => b.members - a.members
        );
    } else {
        clanList.sort(
            (a, b) => b.money - a.money
        );
    }

    if (!clanList.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <h3>Brak klanów</h3>
                        <p>
                            API nie zwróciło jeszcze danych o klanach.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = clanList
        .map((clan, index) => {
            const leader =
                clan.players.find(player =>
                    String(getRank(player))
                        .toLowerCase()
                        .includes("lider")
                ) || clan.players[0];

            return `
                <tr>
                    <td>
                        <strong>
                            ${index + 1}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(clan.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            leader?.name || "—"
                        )}
                    </td>

                    <td>
                        ${clan.members}
                    </td>

                    <td>
                        ${formatMoney(clan.money)}
                    </td>

                    <td>
                        ${formatMoney(clan.money)}
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        <span class="status-api">
                            ● DANE API
                        </span>
                    </td>
                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   DASHBOARD CLAN TABLE
   ========================================================= */

function renderDashboardClanTable() {
    const table = $("clanTable");

    if (!table) {
        return;
    }

    const topClans = [...clans]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    if (!topClans.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    Brak danych o klanach
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = topClans
        .map((clan, index) => {
            const leader =
                clan.players.find(player =>
                    String(getRank(player))
                        .toLowerCase()
                        .includes("lider")
                ) || clan.players[0];

            return `
                <tr>
                    <td>
                        <strong>
                            ${index + 1}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(clan.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            leader?.name || "—"
                        )}
                    </td>

                    <td>
                        ${clan.members}
                    </td>

                    <td>
                        ${formatMoney(clan.money)}
                    </td>

                    <td>
                        ${formatMoney(clan.money)}
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        <span class="status-api">
                            ● DANE API
                        </span>
                    </td>
                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {
    const table = $("marketTable");

    if (!table) {
        return;
    }

    const list = [...clans]
        .sort((a, b) => b.money - a.money)
        .slice(0, 20);

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5">
                    Brak danych API
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map(clan => `
            <tr>
                <td>
                    <strong>
                        ${escapeHTML(clan.name)}
                    </strong>
                </td>

                <td>
                    ${formatMoney(clan.money)}
                </td>

                <td>
                    —
                </td>

                <td>
                    —
                </td>

                <td>
                    <span class="status-api">
                        ● DANE API
                    </span>
                </td>
            </tr>
        `)
        .join("");
}

/* =========================================================
   CHARTS
   ========================================================= */

function destroyChart(name) {
    if (charts[name]) {
        try {
            charts[name].destroy();
        } catch (error) {
            console.warn(error);
        }

        charts[name] = null;
    }
}

function createActivityChart(canvasId) {
    const canvas = $(canvasId);

    if (!canvas) {
        return;
    }

    if (typeof Chart === "undefined") {
        return;
    }

    destroyChart(canvasId);

    charts[canvasId] = new Chart(
        canvas.getContext("2d"),
        {
            type: "line",

            data: {
                labels: [
                    "Pon",
                    "Wt",
                    "Śr",
                    "Czw",
                    "Pt",
                    "Sob",
                    "Nd"
                ],

                datasets: [
                    {
                        label: "Gracze",
                        data: [
                            Math.max(
                                0,
                                players.length - 6
                            ),
                            Math.max(
                                0,
                                players.length - 5
                            ),
                            Math.max(
                                0,
                                players.length - 4
                            ),
                            Math.max(
                                0,
                                players.length - 3
                            ),
                            Math.max(
                                0,
                                players.length - 2
                            ),
                            Math.max(
                                0,
                                players.length - 1
                            ),
                            players.length
                        ],

                        tension: 0.35,

                        fill: false
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}

function createClanChart(canvasId) {
    const canvas = $(canvasId);

    if (!canvas) {
        return;
    }

    if (typeof Chart === "undefined") {
        return;
    }

    destroyChart(canvasId);

    const top = [...clans]
        .sort((a, b) => b.money - a.money)
        .slice(0, 7);

    charts[canvasId] = new Chart(
        canvas.getContext("2d"),
        {
            type: "bar",

            data: {
                labels: top.map(
                    clan => clan.name
                ),

                datasets: [
                    {
                        label: "Majątek",

                        data: top.map(
                            clan => clan.money
                        )
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

function renderCharts() {
    createActivityChart("activityChart");
    createActivityChart("activityChart2");
    createClanChart("clanChart");
    createClanChart("wealthChart");
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(pageId) {
    const pages =
        document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const page = $(pageId);

    if (page) {
        page.classList.add("active");
    }

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.page === pageId
            );
        });

    const titles = {
        dashboard: "Dashboard",
        clans: "Klany",
        players: "Gracze",
        rankings: "Rankingi",
        charts: "Wykresy",
        market: "Rynek",
        search: "Wyszukiwarka"
    };

    const title = document.querySelector(
        ".page-title h1"
    );

    if (title) {
        title.textContent =
            titles[pageId] || "Dashboard";
    }

    const subtitle = document.querySelector(
        ".page-title p"
    );

    if (subtitle) {
        subtitle.textContent =
            pageId === "dashboard"
                ? "Centrum statystyk Hodowla RP"
                : "Statystyki Hodowla RP";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {
    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = "✓ " + message;

    toast.classList.add("show");

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

/* =========================================================
   LOADING
   ========================================================= */

function setLoading(loading) {
    const button = $("refreshButton");

    if (!button) {
        return;
    }

    if (loading) {
        button.disabled = true;
        button.textContent = "↻ Ładowanie...";
    } else {
        button.disabled = false;
        button.textContent = "↻ Odśwież";
    }
}

/* =========================================================
   MAIN LOAD
   ========================================================= */

async function refreshData(showMessage = true) {
    setLoading(true);

    try {
        console.log(
            "[EXODO] Pobieranie danych z API..."
        );

        const loadedPlayers =
            await loadPlayersWithDetails();

        players = loadedPlayers;

        console.log(
            "[EXODO] Pobrano graczy:",
            players.length
        );

        buildClansFromPlayers();

        updateDashboardStats();

        renderPlayersTable();

        renderRichPlayers();

        renderLevelRanking(
            "levelRanking"
        );

        renderLevelRanking(
            "levelRanking2"
        );

        renderMoneyRanking();

        renderDashboardClanTable();

        renderClansTable();

        renderMarket();

        renderCharts();

        /*
         * Jeśli użytkownik ma wpisane coś
         * w wyszukiwarce, odświeżamy wynik.
         */
        const searchInput =
            $("globalSearchPage");

        if (
            searchInput &&
            searchInput.value.trim()
        ) {
            renderSearchResults(
                searchInput.value
            );
        }

        if (showMessage) {
            showToast(
                `Dane API odświeżone • ${players.length} graczy`
            );
        }

    } catch (error) {
        console.error(
            "[EXODO API ERROR]",
            error
        );

        showToast(
            "Nie udało się pobrać danych z API"
        );

    } finally {
        setLoading(false);
    }
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupNavigation() {
    document
        .querySelectorAll(".nav-item")
        .forEach(item => {
            item.addEventListener(
                "click",
                () => {
                    showPage(
                        item.dataset.page
                    );
                }
            );
        });

    document
        .querySelectorAll(
            "[data-page-link]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    showPage(
                        button.dataset.pageLink
                    );
                }
            );
        });
}

function setupRefresh() {
    const button = $("refreshButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            refreshData(true);
        }
    );
}

function setupPlayerSearch() {
    const input = $("playerSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {
            const query =
                input.value.trim().toLowerCase();

            const filtered =
                players.filter(player => {
                    const name =
                        String(
                            player.name || ""
                        ).toLowerCase();

                    const clan =
                        String(
                            getClan(player)
                        ).toLowerCase();

                    return (
                        name.includes(query) ||
                        clan.includes(query)
                    );
                });

            renderPlayersTable(filtered);
        }
    );
}

function setupClanSearch() {
    const input = $("clanSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {
            const query =
                input.value.trim().toLowerCase();

            const filtered =
                clans.filter(clan =>
                    String(
                        clan.name
                    )
                        .toLowerCase()
                        .includes(query)
                );

            renderFilteredClans(
                filtered
            );
        }
    );
}

function renderFilteredClans(list) {
    const table =
        $("allClansTable") ||
        $("clanTable");

    if (!table) {
        return;
    }

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    Brak wyników.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map((clan, index) => {
            const leader =
                clan.players.find(player =>
                    String(getRank(player))
                        .toLowerCase()
                        .includes("lider")
                ) || clan.players[0];

            return `
                <tr>
                    <td>
                        <strong>
                            ${index + 1}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(clan.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            leader?.name || "—"
                        )}
                    </td>

                    <td>
                        ${clan.members}
                    </td>

                    <td>
                        ${formatMoney(clan.money)}
                    </td>

                    <td>
                        ${formatMoney(clan.money)}
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        <span class="status-api">
                            ● DANE API
                        </span>
                    </td>
                </tr>
            `;
        })
        .join("");
}

function setupClanSort() {
    const select = $("clanSort");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {
            renderClansTable();
        }
    );
}

function setupPlayerSort() {
    const select = $("playerSort");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {
            renderPlayersTable();
        }
    );
}

function setupGlobalSearch() {
    const input = $("globalSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                performGlobalSearch(
                    input.value
                );
            }
        }
    );

    input.addEventListener(
        "input",
        () => {
            clearTimeout(
                searchTimer
            );

            const value =
                input.value.trim();

            if (!value) {
                return;
            }

            searchTimer = setTimeout(
                () => {
                    /*
                     * Nie zmieniamy strony podczas
                     * wpisywania każdego znaku.
                     * Szukamy dopiero po krótkiej chwili.
                     */
                    performGlobalSearch(
                        value
                    );
                },
                600
            );
        }
    );
}

function setupSearchPage() {
    const input =
        $("globalSearchPage");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {
            renderSearchResults(
                input.value
            );
        }
    );

    input.addEventListener(
        "keydown",
        async event => {
            if (event.key !== "Enter") {
                return;
            }

            const value =
                input.value.trim();

            if (!value) {
                return;
            }

            const player =
                await loadPlayer(value);

            if (player) {
                const exists =
                    players.some(
                        p =>
                            String(
                                p.name
                            ).toLowerCase() ===
                            String(
                                player.name
                            ).toLowerCase()
                    );

                if (!exists) {
                    players.push(player);
                }

                buildClansFromPlayers();

                renderSearchResults(
                    value
                );
            } else {
                renderSearchResults(
                    value
                );
            }
        }
    );
}

function setupMobileMenu() {
    const button =
        $("mobileMenu");

    const sidebar =
        $("sidebar");

    if (!button || !sidebar) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            sidebar.classList.toggle(
                "open"
            );
        }
    );

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {
            item.addEventListener(
                "click",
                () => {
                    sidebar.classList.remove(
                        "open"
                    );
                }
            );
        });
}

/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        console.log(
            "%cEXODO STATS",
            "font-size:20px;font-weight:bold;"
        );

        console.log(
            "[EXODO] API:",
            API_BASE
        );

        setupNavigation();

        setupRefresh();

        setupPlayerSearch();

        setupClanSearch();

        setupClanSort();

        setupPlayerSort();

        setupGlobalSearch();

        setupSearchPage();

        setupMobileMenu();

        /*
         * Pierwsze pobranie danych.
         */
        await refreshData(false);
    }
);
