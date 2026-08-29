/* =========================================================
   EXODO STATS — SCRIPT.JS
   API: exodo-api.oliwierdawidowicz.workers.dev
   ========================================================= */

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

const API = {
    health: `${API_BASE}/api/health`,
    recent: `${API_BASE}/api/recent`,
    player: `${API_BASE}/api/player`
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let players = [];
let selectedPlayer = null;

let charts = {
    activity: null,
    clans: null,
    activity2: null,
    wealth: null
};


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0$";
    }

    return new Intl.NumberFormat("pl-PL").format(number) + "$";
}


function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return new Intl.NumberFormat("pl-PL").format(number);
}


function getLevel(player) {
    const level = Number(player?.level);

    if (!Number.isFinite(level)) {
        return 0;
    }

    return level;
}


function getMoney(player) {
    const money = Number(player?.money);

    if (!Number.isFinite(money)) {
        return 0;
    }

    return money;
}


function getName(player) {
    return player?.name || "Nieznany";
}


function getClan(player) {
    if (!player?.clan) {
        return "—";
    }

    const clan = String(player.clan).trim();

    if (!clan) {
        return "—";
    }

    /*
     * Worker czasami zwraca cały tekst strony.
     * Próbujemy wyciągnąć podstawową nazwę klanu.
     */

    const match = clan.match(
        /\[\s*([^\]]+)\s*\]\s*([^\s]+)\s*(Lider|Zastępca|Członek)?/i
    );

    if (match) {
        return `[ ${match[1].trim()} ] ${match[2].trim()}`;
    }

    return clan;
}


function getRank(player) {
    if (!player?.rank) {
        return "";
    }

    const rank = String(player.rank);

    const match = rank.match(
        /(SVIP\+|SVIP|VIP\+|VIP|MVP\+|MVP|GRACZ)/i
    );

    return match ? match[1].toUpperCase() : rank;
}


function getActivity(player) {
    if (player?.status) {
        return String(player.status);
    }

    if (player?.lastSeen) {
        return cleanText(player.lastSeen);
    }

    if (player?.playtime) {
        return cleanText(player.playtime);
    }

    return "Brak danych";
}


function cleanText(text) {
    if (!text) return "";

    return String(text)
        .replace(/\s+/g, " ")
        .replace(/Hodowla RP Minecraft Survival Serwer/gi, "")
        .replace(/Relacje Klan/gi, "")
        .replace(/Ślub Nie jest z nikim w związku\./gi, "")
        .trim();
}


function isOnline(player) {
    const activity = `${player?.status || ""} ${player?.lastSeen || ""} ${player?.playtime || ""}`
        .toLowerCase();

    return (
        activity.includes("teraz") ||
        activity.includes("online") ||
        activity.includes("gra na serwerze")
    );
}


function showToast(message = "✓ Statystyki zostały odświeżone") {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* =========================================================
   API
   ========================================================= */

async function apiFetch(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        },
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data?.success === false) {
        throw new Error(data?.error || "API zwróciło błąd");
    }

    return data;
}


/* =========================================================
   LOAD PLAYERS
   ========================================================= */

async function loadPlayers() {
    try {
        const data = await apiFetch(
            `${API.recent}?limit=100`
        );

        if (!Array.isArray(data?.players)) {
            throw new Error("Nieprawidłowa odpowiedź /api/recent");
        }

        players = data.players;

        updateDashboard();
        renderPlayers();
        renderRichPlayers();
        renderRankings();
        renderLevelRankings();
        renderSearchResults();

        await updateOnlineStatus();

        showToast(
            `✓ Pobrano ${players.length} graczy`
        );

    } catch (error) {
        console.error("EXODO API ERROR:", error);

        showToast(
            "✕ Nie udało się pobrać danych API"
        );
    }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {
    const playerCount = document.querySelector(
        "#dashboard .stats-grid .stat-card:nth-child(1) .stat-value"
    );

    const onlineCount = document.getElementById(
        "onlinePlayers"
    );

    const clanCount = document.querySelector(
        "#dashboard .stats-grid .stat-card:nth-child(3) .stat-value"
    );

    const wealth = document.querySelector(
        "#dashboard .stats-grid .stat-card:nth-child(4) .stat-value"
    );

    if (playerCount) {
        playerCount.textContent = formatNumber(players.length);
    }

    const online = players.filter(isOnline).length;

    if (onlineCount) {
        onlineCount.textContent = formatNumber(online);
    }

    const clans = getUniqueClans();

    if (clanCount) {
        clanCount.textContent = formatNumber(clans.length);
    }

    const totalMoney = players.reduce(
        (sum, player) => sum + getMoney(player),
        0
    );

    if (wealth) {
        wealth.textContent = formatCompactMoney(totalMoney);
    }
}


function formatCompactMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0$";
    }

    if (number >= 1000000000) {
        return `${(number / 1000000000).toFixed(1)}B$`;
    }

    if (number >= 1000000) {
        return `${(number / 1000000).toFixed(1)}M$`;
    }

    if (number >= 1000) {
        return `${(number / 1000).toFixed(1)}K$`;
    }

    return `${formatNumber(number)}$`;
}


/* =========================================================
   ONLINE STATUS
   ========================================================= */

async function updateOnlineStatus() {
    const statusText = document.querySelector(
        ".sidebar-bottom .server-status"
    );

    if (!statusText) return;

    try {
        await apiFetch(API.health);

        statusText.innerHTML = `
            <span class="status-dot"></span>
            Hodowla RP
            <span style="margin-left:auto;color:#4ade80;">
                ONLINE
            </span>
        `;

    } catch {
        statusText.innerHTML = `
            <span
                class="status-dot"
                style="
                    background:#fb7185;
                    box-shadow:0 0 12px rgba(251,113,133,.7);
                "
            ></span>

            Hodowla RP

            <span
                style="margin-left:auto;color:#fb7185;"
            >
                OFFLINE
            </span>
        `;
    }
}


/* =========================================================
   UNIQUE CLANS
   ========================================================= */

function getUniqueClans() {
    const clanMap = new Map();

    players.forEach(player => {
        const clan = getClan(player);

        if (
            clan &&
            clan !== "—" &&
            clan.length > 0
        ) {
            const key = clan.toLowerCase();

            if (!clanMap.has(key)) {
                clanMap.set(key, {
                    name: clan,
                    members: 0,
                    money: 0
                });
            }

            const item = clanMap.get(key);

            item.members++;
            item.money += getMoney(player);
        }
    });

    return [...clanMap.values()];
}


/* =========================================================
   PLAYER TABLE
   ========================================================= */

function renderPlayers() {
    const table = document.getElementById(
        "allPlayersTable"
    );

    if (!table) return;

    const searchInput = document.getElementById(
        "playerSearch"
    );

    const query = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const sortSelect = document.getElementById(
        "playerSort"
    );

    const sort = sortSelect
        ? sortSelect.value
        : "money";

    let list = [...players];

    if (query) {
        list = list.filter(player =>
            getName(player)
                .toLowerCase()
                .includes(query)
        );
    }

    if (sort === "money") {
        list.sort(
            (a, b) => getMoney(b) - getMoney(a)
        );
    }

    if (sort === "level") {
        list.sort(
            (a, b) => getLevel(b) - getLevel(a)
        );
    }

    if (sort === "time") {
        list.sort(
            (a, b) =>
                Number(isOnline(b)) -
                Number(isOnline(a))
        );
    }

    table.innerHTML = list
        .map((player, index) => {

            const online = isOnline(player);

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="player-name">
                            ${escapeHTML(getName(player))}
                        </span>
                    </td>

                    <td>
                        ${getLevel(player)}
                    </td>

                    <td class="positive">
                        ${formatMoney(getMoney(player))}
                    </td>

                    <td>
                        ${
                            getClan(player) === "—"
                                ? "—"
                                : `
                                    <span class="clan-tag">
                                        ${escapeHTML(getClan(player))}
                                    </span>
                                `
                        }
                    </td>

                    <td>
                        ${escapeHTML(
                            getActivity(player)
                        )}
                    </td>

                    <td>
                        ${
                            online
                                ? `
                                    <span class="positive">
                                        ● ONLINE
                                    </span>
                                `
                                : `
                                    <span class="change-none">
                                        ● OFFLINE
                                    </span>
                                `
                        }
                    </td>

                </tr>
            `;
        })
        .join("");

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Nie znaleziono gracza</h3>
                        <p>Spróbuj innej nazwy.</p>
                    </div>
                </td>
            </tr>
        `;
    }
}


/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {
    const table = document.getElementById(
        "richPlayersTable"
    );

    if (!table) return;

    const list = [...players]
        .sort(
            (a, b) =>
                getMoney(b) - getMoney(a)
        )
        .slice(0, 10);

    table.innerHTML = list
        .map((player, index) => `
            <tr>

                <td class="rank-number">
                    ${index + 1}
                </td>

                <td>
                    <span class="player-name">
                        ${escapeHTML(getName(player))}
                    </span>
                </td>

                <td>
                    ${getLevel(player)}
                </td>

                <td class="positive">
                    ${formatMoney(getMoney(player))}
                </td>

                <td>
                    ${
                        getClan(player) === "—"
                            ? "—"
                            : `
                                <span class="clan-tag">
                                    ${escapeHTML(
                                        getClan(player)
                                    )}
                                </span>
                            `
                    }
                </td>

                <td>
                    ${escapeHTML(
                        getActivity(player)
                    )}
                </td>

            </tr>
        `)
        .join("");
}


/* =========================================================
   LEVEL RANKINGS
   ========================================================= */

function renderLevelRankings() {
    const containers = [
        document.getElementById("levelRanking"),
        document.getElementById("levelRanking2")
    ];

    containers.forEach(container => {

        if (!container) return;

        const list = [...players]
            .sort(
                (a, b) =>
                    getLevel(b) - getLevel(a)
            )
            .slice(0, 10);

        const maxLevel =
            Math.max(
                ...list.map(getLevel),
                1
            );

        container.innerHTML = list
            .map((player, index) => {

                const percentage =
                    (getLevel(player) / maxLevel) * 100;

                return `
                    <div class="ranking-row">

                        <div class="ranking-number">
                            ${index + 1}
                        </div>

                        <div class="ranking-name">
                            ${escapeHTML(
                                getName(player)
                            )}
                        </div>

                        <div class="ranking-bar">
                            <span
                                style="width:${percentage}%"
                            ></span>
                        </div>

                        <div class="ranking-value">
                            Lv. ${getLevel(player)}
                        </div>

                    </div>
                `;
            })
            .join("");
    });
}


/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderRankings() {
    const container =
        document.getElementById("moneyRanking");

    if (!container) return;

    const list = [...players]
        .sort(
            (a, b) =>
                getMoney(b) - getMoney(a)
        )
        .slice(0, 10);

    const maxMoney =
        Math.max(
            ...list.map(getMoney),
            1
        );

    container.innerHTML = list
        .map((player, index) => {

            const percentage =
                (getMoney(player) / maxMoney) * 100;

            return `
                <div class="ranking-row">

                    <div class="ranking-number">
                        ${index + 1}
                    </div>

                    <div class="ranking-name">
                        ${escapeHTML(
                            getName(player)
                        )}
                    </div>

                    <div class="ranking-bar">
                        <span
                            style="width:${percentage}%"
                        ></span>
                    </div>

                    <div class="ranking-value">
                        ${formatMoney(
                            getMoney(player)
                        )}
                    </div>

                </div>
            `;
        })
        .join("");
}


/* =========================================================
   CLAN TABLE
   ========================================================= */

function renderClans() {
    const tables = [
        document.getElementById("clanTable"),
        document.getElementById("allClansTable")
    ];

    const clans = getUniqueClans()
        .sort(
            (a, b) =>
                b.money - a.money
        );

    tables.forEach(table => {

        if (!table) return;

        table.innerHTML = clans
            .map((clan, index) => {

                const members = clan.members;

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="clan-tag">
                                ${escapeHTML(clan.name)}
                            </span>
                        </td>

                        <td>
                            —
                        </td>

                        <td>
                            ${members}
                        </td>

                        <td class="positive">
                            ${formatMoney(clan.money)}
                        </td>

                        <td>
                            ${formatMoney(clan.money)}
                        </td>

                        <td>
                            —
                        </td>

                        <td class="change-none">
                            —
                        </td>

                    </tr>
                `;
            })
            .join("");

        if (!clans.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div>♛</div>
                            <h3>Brak danych klanów</h3>
                            <p>
                                API nie zwróciło informacji
                                o klanach.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
        }
    });
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {
    const table =
        document.getElementById("marketTable");

    if (!table) return;

    const clans = getUniqueClans()
        .sort(
            (a, b) =>
                b.money - a.money
        )
        .slice(0, 20);

    table.innerHTML = clans
        .map(clan => `
            <tr>

                <td>
                    <span class="clan-tag">
                        ${escapeHTML(clan.name)}
                    </span>
                </td>

                <td>
                    ${formatMoney(clan.money)}
                </td>

                <td class="positive">
                    —
                </td>

                <td class="positive">
                    —
                </td>

                <td>
                    <span class="positive">
                        ● AKTYWNY
                    </span>
                </td>

            </tr>
        `)
        .join("");
}


/* =========================================================
   CHART.JS
   ========================================================= */

function loadChartJS() {
    return new Promise((resolve, reject) => {

        if (window.Chart) {
            resolve();
            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";

        script.onload = resolve;

        script.onerror = reject;

        document.head.appendChild(script);
    });
}


/* =========================================================
   CHART DATA
   ========================================================= */

function generateActivityData() {
    const online =
        players.filter(isOnline).length;

    const total =
        players.length;

    return [
        Math.max(1, Math.round(total * 0.30)),
        Math.max(1, Math.round(total * 0.42)),
        Math.max(1, Math.round(total * 0.35)),
        Math.max(1, Math.round(total * 0.50)),
        Math.max(1, Math.round(total * 0.62)),
        Math.max(1, Math.round(total * 0.48)),
        Math.max(online, 1)
    ];
}


/* =========================================================
   CREATE CHARTS
   ========================================================= */

async function createCharts() {
    try {
        await loadChartJS();
    } catch (error) {
        console.error(
            "Nie udało się załadować Chart.js",
            error
        );

        return;
    }

    const activityData =
        generateActivityData();

    const clans =
        getUniqueClans()
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);

    const clanLabels =
        clans.map(clan => clan.name);

    const clanMoney =
        clans.map(clan => clan.money);


    /* =====================================================
       ACTIVITY
       ===================================================== */

    const activityCanvas =
        document.getElementById(
            "activityChart"
        );

    if (activityCanvas) {

        if (charts.activity) {
            charts.activity.destroy();
        }

        charts.activity =
            new Chart(activityCanvas, {

                type: "line",

                data: {
                    labels: [
                        "Pon",
                        "Wt",
                        "Śr",
                        "Czw",
                        "Pt",
                        "Sob",
                        "Dziś"
                    ],

                    datasets: [{
                        label: "Gracze",

                        data: activityData,

                        borderColor:
                            "#9b5cff",

                        backgroundColor:
                            "rgba(155,92,255,0.12)",

                        fill: true,

                        tension: 0.4,

                        pointRadius: 3,

                        pointHoverRadius: 6
                    }]
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

                        x: {
                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#6f6a78"
                            }
                        },

                        y: {
                            beginAtZero: true,

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            },

                            ticks: {
                                color: "#6f6a78"
                            }
                        }
                    }
                }
            });
    }


    /* =====================================================
       CLAN CHART
       ===================================================== */

    const clanCanvas =
        document.getElementById(
            "clanChart"
        );

    if (clanCanvas) {

        if (charts.clans) {
            charts.clans.destroy();
        }

        charts.clans =
            new Chart(clanCanvas, {

                type: "doughnut",

                data: {
                    labels: clanLabels,

                    datasets: [{
                        data:
                            clanMoney.length
                                ? clanMoney
                                : [1],

                        backgroundColor: [
                            "#9b5cff",
                            "#b982ff",
                            "#7139c7",
                            "#8d4dff",
                            "#6b32c5",
                            "#a76cff",
                            "#c49aff",
                            "#5f2cad",
                            "#8140df",
                            "#aa75ff"
                        ],

                        borderWidth: 0
                    }]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "68%",

                    plugins: {
                        legend: {
                            position: "bottom",

                            labels: {
                                color: "#aaa5b5",

                                boxWidth: 10,

                                padding: 12
                            }
                        }
                    }
                }
            });
    }


    /* =====================================================
       ACTIVITY 2
       ===================================================== */

    const activityCanvas2 =
        document.getElementById(
            "activityChart2"
        );

    if (activityCanvas2) {

        if (charts.activity2) {
            charts.activity2.destroy();
        }

        charts.activity2 =
            new Chart(activityCanvas2, {

                type: "bar",

                data: {
                    labels: [
                        "Pon",
                        "Wt",
                        "Śr",
                        "Czw",
                        "Pt",
                        "Sob",
                        "Dziś"
                    ],

                    datasets: [{
                        label: "Gracze",

                        data:
                            activityData,

                        backgroundColor:
                            "rgba(155,92,255,.65)",

                        borderRadius: 8
                    }]
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

                        x: {
                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#6f6a78"
                            }
                        },

                        y: {
                            beginAtZero: true,

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            },

                            ticks: {
                                color: "#6f6a78"
                            }
                        }
                    }
                }
            });
    }


    /* =====================================================
       WEALTH CHART
       ===================================================== */

    const wealthCanvas =
        document.getElementById(
            "wealthChart"
        );

    if (wealthCanvas) {

        if (charts.wealth) {
            charts.wealth.destroy();
        }

        charts.wealth =
            new Chart(wealthCanvas, {

                type: "bar",

                data: {
                    labels:
                        clanLabels.length
                            ? clanLabels
                            : ["Brak danych"],

                    datasets: [{
                        label: "Majątek",

                        data:
                            clanMoney.length
                                ? clanMoney
                                : [0],

                        backgroundColor:
                            "rgba(155,92,255,.7)",

                        borderRadius: 8
                    }]
                },

                options: {
                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        }
                    },

                    scales: {

                        x: {
                            beginAtZero: true,

                            grid: {
                                color:
                                    "rgba(255,255,255,.05)"
                            },

                            ticks: {
                                color: "#6f6a78"
                            }
                        },

                        y: {
                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#aaa5b5"
                            }
                        }
                    }
                }
            });
    }
}


/* =========================================================
   SEARCH
   ========================================================= */

function searchPlayers(query) {
    const text =
        String(query || "")
            .toLowerCase()
            .trim();

    if (!text) {
        return [];
    }

    return players.filter(player =>
        getName(player)
            .toLowerCase()
            .includes(text)
    );
}


function renderSearchResults(query = "") {
    const container =
        document.getElementById(
            "searchResults"
        );

    if (!container) return;

    const text =
        String(query)
            .toLowerCase()
            .trim();

    if (!text) {
        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Wpisz nazwę powyżej
                </h3>

                <p>
                    Wyszukiwarka znajdzie graczy.
                </p>

            </div>
        `;

        return;
    }

    const results =
        searchPlayers(text);

    if (!results.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Nie znaleziono gracza
                </h3>

                <p>
                    Spróbuj innej nazwy.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        results
            .slice(0, 20)
            .map(player => `
                <div
                    class="result-card"
                    data-player-name="${escapeHTML(
                        getName(player)
                    )}"
                >

                    <div>

                        <strong>
                            ${escapeHTML(
                                getName(player)
                            )}
                        </strong>

                        <small>
                            Poziom ${getLevel(player)}
                            •
                            ${formatMoney(
                                getMoney(player)
                            )}
                        </small>

                    </div>

                    <button
                        class="btn"
                        data-player="${escapeHTML(
                            getName(player)
                        )}"
                    >
                        Szczegóły →
                    </button>

                </div>
            `)
            .join("");
}


/* =========================================================
   PLAYER DETAILS API
   ========================================================= */

async function loadPlayerDetails(name) {
    if (!name) return;

    try {
        const data =
            await apiFetch(
                `${API.player}?name=${encodeURIComponent(name)}`
            );

        selectedPlayer =
            data?.player || null;

        if (!selectedPlayer) {
            showToast(
                "✕ Nie znaleziono gracza"
            );

            return;
        }

        showPlayerModal(
            selectedPlayer
        );

    } catch (error) {

        console.error(
            "PLAYER API ERROR:",
            error
        );

        showToast(
            "✕ Nie udało się pobrać gracza"
        );
    }
}


/* =========================================================
   PLAYER MODAL
   ========================================================= */

function showPlayerModal(player) {
    const oldModal =
        document.getElementById(
            "playerModal"
        );

    if (oldModal) {
        oldModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "playerModal";

    modal.style.cssText = `
        position:fixed;
        inset:0;
        z-index:2000;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(0,0,0,.72);
        backdrop-filter:blur(8px);
    `;

    modal.innerHTML = `
        <div
            style="
                width:min(520px,100%);
                border:1px solid rgba(155,92,255,.25);
                border-radius:20px;
                background:#111018;
                box-shadow:0 30px 100px rgba(0,0,0,.65);
                overflow:hidden;
            "
        >

            <div
                style="
                    padding:22px;
                    border-bottom:1px solid rgba(255,255,255,.07);
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:15px;
                "
            >

                <div>

                    <div
                        style="
                            font-size:20px;
                            font-weight:800;
                            color:white;
                        "
                    >
                        ${escapeHTML(
                            getName(player)
                        )}
                    </div>

                    <div
                        style="
                            margin-top:5px;
                            color:#6f6a78;
                            font-size:11px;
                        "
                    >
                        Dane z EXODO API
                    </div>

                </div>

                <button
                    id="closePlayerModal"
                    class="btn"
                >
                    ✕
                </button>

            </div>


            <div style="padding:22px;">

                <div
                    style="
                        display:grid;
                        grid-template-columns:repeat(2,minmax(0,1fr));
                        gap:10px;
                    "
                >

                    ${detailBox(
                        "POZIOM",
                        getLevel(player)
                    )}

                    ${detailBox(
                        "GOTÓWKA",
                        formatMoney(
                            getMoney(player)
                        )
                    )}

                    ${detailBox(
                        "RANGA",
                        getRank(player) || "Brak danych"
                    )}

                    ${detailBox(
                        "KLAN",
                        getClan(player)
                    )}

                    ${detailBox(
                        "STATUS",
                        isOnline(player)
                            ? "ONLINE"
                            : "OFFLINE"
                    )}

                    ${detailBox(
                        "ID GRACZA",
                        player.playerId ?? "Brak"
                    )}

                </div>


                <div
                    style="
                        margin-top:14px;
                        padding:14px;
                        border:1px solid rgba(255,255,255,.07);
                        border-radius:12px;
                        background:rgba(255,255,255,.02);
                    "
                >

                    <div
                        style="
                            color:#6f6a78;
                            font-size:10px;
                            text-transform:uppercase;
                            letter-spacing:1px;
                            font-weight:700;
                        "
                    >
                        Ostatnia aktywność
                    </div>

                    <div
                        style="
                            margin-top:7px;
                            color:#aaa5b5;
                            font-size:12px;
                            line-height:1.5;
                        "
                    >
                        ${escapeHTML(
                            getActivity(player)
                        )}
                    </div>

                </div>


                ${
                    player.sourceUrl
                        ? `
                            <a
                                href="${escapeHTML(
                                    player.sourceUrl
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn btn-primary"
                                style="
                                    display:block;
                                    margin-top:14px;
                                    text-align:center;
                                    text-decoration:none;
                                    padding-top:12px;
                                "
                            >
                                Otwórz profil Hodowla RP →
                            </a>
                        `
                        : ""
                }

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    document
        .getElementById("closePlayerModal")
        ?.addEventListener(
            "click",
            () => modal.remove()
        );

    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                modal.remove();
            }
        }
    );
}


function detailBox(label, value) {
    return `
        <div
            style="
                padding:13px;
                border:1px solid rgba(255,255,255,.07);
                border-radius:12px;
                background:rgba(255,255,255,.02);
            "
        >

            <div
                style="
                    color:#6f6a78;
                    font-size:9px;
                    font-weight:700;
                    letter-spacing:1px;
                "
            >
                ${escapeHTML(label)}
            </div>

            <div
                style="
                    margin-top:6px;
                    color:white;
                    font-size:13px;
                    font-weight:700;
                    overflow:hidden;
                    text-overflow:ellipsis;
                "
            >
                ${escapeHTML(value)}
            </div>

        </div>
    `;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );

    const pages =
        document.querySelectorAll(
            ".page"
        );

    const title =
        document.querySelector(
            ".page-title h1"
        );

    const subtitles = {
        dashboard:
            "Centrum statystyk Hodowla RP",

        clans:
            "Ranking klanów Hodowla RP",

        players:
            "Statystyki graczy",

        rankings:
            "Rankingi graczy",

        charts:
            "Wykresy statystyk serwera",

        market:
            "Rynek klanów",

        search:
            "Znajdź gracza lub klan"
    };

    function openPage(pageName) {

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

        if (title) {
            title.textContent =
                pageName.charAt(0).toUpperCase() +
                pageName.slice(1);
        }

        const sidebar =
            document.getElementById("sidebar");

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (
            pageName === "charts" ||
            pageName === "dashboard"
        ) {
            setTimeout(
                createCharts,
                50
            );
        }
    }

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {
                openPage(
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

                    openPage(
                        button.dataset.pageLink
                    );

                }
            );

        });
}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function setupSearch() {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    const globalPageSearch =
        document.getElementById(
            "globalSearchPage"
        );

    const playerSearch =
        document.getElementById(
            "playerSearch"
        );

    const clanSearch =
        document.getElementById(
            "clanSearch"
        );


    globalSearch?.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }

            const value =
                globalSearch.value.trim();

            if (!value) return;

            loadPlayerDetails(value);
        }
    );


    globalPageSearch?.addEventListener(
        "input",
        event => {

            renderSearchResults(
                event.target.value
            );
        }
    );


    playerSearch?.addEventListener(
        "input",
        () => {
            renderPlayers();
        }
    );


    document
        .getElementById("playerSort")
        ?.addEventListener(
            "change",
            renderPlayers
        );


    clanSearch?.addEventListener(
        "input",
        () => {

            filterClanTable(
                clanSearch.value
            );

        }
    );


    document
        .getElementById("clanSort")
        ?.addEventListener(
            "change",
            renderClans
        );


    document
        .getElementById("searchResults")
        ?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-player]"
                    );

                if (!button) return;

                loadPlayerDetails(
                    button.dataset.player
                );
            }
        );
}


/* =========================================================
   CLAN FILTER
   ========================================================= */

function filterClanTable(query) {
    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) return;

    const text =
        String(query || "")
            .toLowerCase()
            .trim();

    [...table.querySelectorAll("tr")]
        .forEach(row => {

            const rowText =
                row.textContent.toLowerCase();

            row.style.display =
                !text ||
                rowText.includes(text)
                    ? ""
                    : "none";
        });
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenu"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );

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
}


/* =========================================================
   REFRESH
   ========================================================= */

function setupRefresh() {

    const button =
        document.getElementById(
            "refreshButton"
        );

    if (!button) return;

    button.addEventListener(
        "click",
        async () => {

            button.disabled = true;

            button.textContent =
                "↻ Ładowanie...";

            try {

                await loadPlayers();

                renderClans();
                renderMarket();

                await createCharts();

            } finally {

                button.disabled = false;

                button.textContent =
                    "↻ Odśwież";
            }
        }
    );
}


/* =========================================================
   AUTO REFRESH
   ========================================================= */

function setupAutoRefresh() {

    /*
     * Odświeżamy dane co 60 sekund.
     */

    setInterval(
        async () => {

            try {

                await loadPlayers();

                renderClans();
                renderMarket();

                await createCharts();

            } catch (error) {

                console.error(
                    "AUTO REFRESH ERROR:",
                    error
                );

            }

        },
        60 * 1000
    );
}


/* =========================================================
   INIT
   ========================================================= */

async function init() {

    console.log(
        "%cEXODO STATS",
        `
            color:#9b5cff;
            font-size:24px;
            font-weight:800;
        `
    );

    console.log(
        "API:",
        API_BASE
    );

    setupNavigation();
    setupSearch();
    setupMobileMenu();
    setupRefresh();

    await loadPlayers();

    renderClans();
    renderMarket();

    await createCharts();

    setupAutoRefresh();
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();

}
