/* =========================================================
   EXODO STATS — SCRIPT.JS
   API + DASHBOARD + PLAYERS + CLANS + RANKINGS
   ========================================================= */

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev/api";

let players = [];
let clans = [];
let charts = {};

let currentPage = "dashboard";

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

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
    const number = Number(value) || 0;

    return number.toLocaleString("pl-PL") + "$";
}

function formatNumber(value) {
    return (Number(value) || 0).toLocaleString("pl-PL");
}

function getLevel(player) {
    const level = Number(player?.level);

    return Number.isFinite(level) ? level : 0;
}

function getMoney(player) {
    const money = Number(player?.money);

    return Number.isFinite(money) ? money : 0;
}

function getName(player) {
    return player?.name || "Nieznany";
}

function getSourceUrl(player) {
    if (player?.sourceUrl) {
        return player.sourceUrl;
    }

    return `https://hodowlarp.pl/gracz/${encodeURIComponent(getName(player))}`;
}

function getClanName(player) {
    if (!player?.clan) return "";

    const clan = String(player.clan).trim();

    if (
        !clan ||
        clan.toLowerCase().includes("nie należy")
    ) {
        return "";
    }

    return clan;
}

function getActivity(player) {
    return (
        player?.lastSeen ||
        player?.playtime ||
        ""
    ).trim();
}

function getStatus(player) {
    const status = String(player?.status || "").toLowerCase();

    if (
        status.includes("online") ||
        status.includes("gra")
    ) {
        return "ONLINE";
    }

    return "DANE API";
}

function playerLink(player) {
    const name = getName(player);
    const url = getSourceUrl(player);

    return `
        <a
            href="${escapeHTML(url)}"
            target="_blank"
            rel="noopener noreferrer"
            style="
                color:#fff;
                text-decoration:none;
                font-weight:600;
            "
        >
            ${escapeHTML(name)}
        </a>
    `;
}

function showToast(message = "✓ Statystyki zostały odświeżone") {
    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* =========================================================
   API
   ========================================================= */

async function apiFetch(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        },
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `API HTTP ${response.status}`
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

/* =========================================================
   LOAD PLAYERS
   ========================================================= */

async function loadPlayers() {
    try {
        /*
         * Pobieramy większą liczbę graczy,
         * dzięki temu dashboard i tabela mają
         * więcej danych do sortowania.
         */

        const data = await apiFetch("/recent?limit=100");

        players = Array.isArray(data.players)
            ? data.players
            : [];

        console.log(
            "EXODO API — gracze:",
            players
        );

        renderEverything();

        return players;

    } catch (error) {

        console.error(
            "EXODO API — błąd:",
            error
        );

        players = [];

        renderEverything();

        showToast(
            "✕ Nie udało się pobrać danych API"
        );

        return [];
    }
}

/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    renderPlayersTable();
    renderRichPlayers();
    renderLevelRankings();

    renderSearchResults("");

    updateDashboardStats();

    renderClanTables();
    renderMarket();

    createCharts();
}

/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {

    const playerCount = players.length;

    const onlineCount = players.filter(
        player => getStatus(player) === "ONLINE"
    ).length;

    const totalMoney = players.reduce(
        (sum, player) =>
            sum + getMoney(player),
        0
    );

    const playersCard = document.querySelector(
        "#dashboard .stats-grid .stat-card:nth-child(1) .stat-value"
    );

    const onlineCard = $("#onlinePlayers");

    const moneyCard = document.querySelector(
        "#dashboard .stats-grid .stat-card:nth-child(4) .stat-value"
    );

    if (playersCard) {
        playersCard.textContent =
            formatNumber(playerCount);
    }

    if (onlineCard) {
        onlineCard.textContent =
            formatNumber(onlineCount);
    }

    if (moneyCard) {
        moneyCard.textContent =
            formatCompactMoney(totalMoney);
    }
}

function formatCompactMoney(value) {

    value = Number(value) || 0;

    if (value >= 1_000_000_000) {
        return (
            (value / 1_000_000_000)
                .toFixed(1)
                .replace(".", ",")
            + "B$"
        );
    }

    if (value >= 1_000_000) {
        return (
            (value / 1_000_000)
                .toFixed(1)
                .replace(".", ",")
            + "M$"
        );
    }

    if (value >= 1_000) {
        return (
            (value / 1_000)
                .toFixed(1)
                .replace(".", ",")
            + "K$"
        );
    }

    return formatMoney(value);
}

/* =========================================================
   PLAYERS TABLE
   ========================================================= */

function renderPlayersTable() {

    const table =
        $("#allPlayersTable");

    if (!table) return;

    const search =
        ($("#playerSearch")?.value || "")
            .trim()
            .toLowerCase();

    const sort =
        $("#playerSort")?.value || "money";

    let list = [...players];

    if (search) {
        list = list.filter(player =>
            getName(player)
                .toLowerCase()
                .includes(search)
        );
    }

    if (sort === "money") {
        list.sort(
            (a, b) =>
                getMoney(b) - getMoney(a)
        );
    }

    if (sort === "level") {
        list.sort(
            (a, b) =>
                getLevel(b) - getLevel(a)
        );
    }

    if (sort === "time") {
        list.sort(
            (a, b) =>
                String(
                    getActivity(b)
                ).length -
                String(
                    getActivity(a)
                ).length
        );
    }

    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Brak graczy</h3>
                        <p>
                            Nie znaleziono pasujących danych.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map((player, index) => {

            const clan =
                getClanName(player);

            const activity =
                getActivity(player);

            const status =
                getStatus(player);

            const statusClass =
                status === "ONLINE"
                    ? "positive"
                    : "";

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        ${playerLink(player)}
                    </td>

                    <td>
                        <strong>
                            ${getLevel(player)}
                        </strong>
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            getMoney(player)
                        )}
                    </td>

                    <td>
                        ${
                            clan
                                ? `
                                    <span class="clan-tag">
                                        ${escapeHTML(clan)}
                                    </span>
                                  `
                                : "—"
                        }
                    </td>

                    <td>
                        ${
                            activity
                                ? escapeHTML(activity)
                                : "—"
                        }
                    </td>

                    <td class="${statusClass}">
                        ● ${status}
                    </td>

                </tr>
            `;

        })
        .join("");
}

/* =========================================================
   TOP 10 RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {

    const table =
        $("#richPlayersTable");

    if (!table) return;

    const list = [...players]
        .sort(
            (a, b) =>
                getMoney(b) -
                getMoney(a)
        )
        .slice(0, 10);

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Brak danych API
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map((player, index) => {

            const clan =
                getClanName(player);

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        ${playerLink(player)}
                    </td>

                    <td>
                        ${getLevel(player)}
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            getMoney(player)
                        )}
                    </td>

                    <td>
                        ${
                            clan
                                ? `
                                    <span class="clan-tag">
                                        ${escapeHTML(clan)}
                                    </span>
                                  `
                                : "—"
                        }
                    </td>

                    <td>
                        ${
                            getActivity(player)
                                ? escapeHTML(
                                    getActivity(player)
                                  )
                                : "—"
                        }
                    </td>

                </tr>
            `;

        })
        .join("");
}

/* =========================================================
   LEVEL RANKINGS
   ========================================================= */

function renderLevelRankings() {

    const containers = [
        $("#levelRanking"),
        $("#levelRanking2")
    ];

    const list = [...players]
        .sort(
            (a, b) =>
                getLevel(b) -
                getLevel(a)
        )
        .slice(0, 10);

    containers.forEach(container => {

        if (!container) return;

        if (!list.length) {
            container.innerHTML = `
                <div class="empty-state">
                    Brak danych
                </div>
            `;

            return;
        }

        const maxLevel =
            Math.max(
                ...list.map(getLevel),
                1
            );

        container.innerHTML = list
            .map((player, index) => {

                const percent =
                    Math.max(
                        3,
                        (getLevel(player) /
                            maxLevel) *
                            100
                    );

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
                                style="width:${percent}%"
                            ></span>
                        </div>

                        <div class="ranking-value">
                            LVL ${getLevel(player)}
                        </div>

                    </div>
                `;

            })
            .join("");
    });

    renderMoneyRanking();
}

/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {

    const container =
        $("#moneyRanking");

    if (!container) return;

    const list = [...players]
        .sort(
            (a, b) =>
                getMoney(b) -
                getMoney(a)
        )
        .slice(0, 10);

    if (!list.length) {
        container.innerHTML =
            `<div class="empty-state">Brak danych</div>`;

        return;
    }

    const maxMoney =
        Math.max(
            ...list.map(getMoney),
            1
        );

    container.innerHTML = list
        .map((player, index) => {

            const percent =
                Math.max(
                    3,
                    (getMoney(player) /
                        maxMoney) *
                        100
                );

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
                            style="width:${percent}%"
                        ></span>
                    </div>

                    <div class="ranking-value">
                        ${formatCompactMoney(
                            getMoney(player)
                        )}
                    </div>

                </div>
            `;

        })
        .join("");
}

/* =========================================================
   SEARCH
   ========================================================= */

function performSearch(query) {

    const container =
        $("#searchResults");

    if (!container) return;

    query =
        String(query || "")
            .trim()
            .toLowerCase();

    if (!query) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Wpisz nazwę powyżej
                </h3>

                <p>
                    Wyszukiwarka znajdzie graczy
                    oraz klany.
                </p>

            </div>
        `;

        return;
    }

    const results =
        players.filter(player =>
            getName(player)
                .toLowerCase()
                .includes(query) ||

            getClanName(player)
                .toLowerCase()
                .includes(query)
        );

    if (!results.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Brak wyników
                </h3>

                <p>
                    Nie znaleziono gracza
                    o nazwie „${escapeHTML(query)}”.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML = results
        .map(player => {

            const clan =
                getClanName(player);

            return `
                <div class="result-card">

                    <div>

                        <strong>
                            ${playerLink(player)}
                        </strong>

                        <small>
                            Poziom ${getLevel(player)}
                            ·
                            ${formatMoney(
                                getMoney(player)
                            )}

                            ${
                                clan
                                    ? ` · ${escapeHTML(clan)}`
                                    : ""
                            }
                        </small>

                    </div>

                    <span class="clan-tag">
                        DANE API
                    </span>

                </div>
            `;

        })
        .join("");
}

function renderSearchResults(query) {
    performSearch(query);
}

/* =========================================================
   CLANS
   ========================================================= */

function buildClansFromPlayers() {

    const map = new Map();

    players.forEach(player => {

        const clan =
            getClanName(player);

        if (!clan) return;

        const key =
            clan.toLowerCase();

        if (!map.has(key)) {

            map.set(key, {
                name: clan,
                members: [],
                money: 0
            });

        }

        const item =
            map.get(key);

        item.members.push(player);

        item.money +=
            getMoney(player);
    });

    clans = [...map.values()];

    clans.sort(
        (a, b) =>
            b.money - a.money
    );

    return clans;
}

function renderClanTables() {

    buildClansFromPlayers();

    const tables = [
        $("#clanTable"),
        $("#allClansTable")
    ];

    tables.forEach(table => {

        if (!table) return;

        const list = [...clans];

        if (!list.length) {

            table.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div>♛</div>
                            <h3>Brak danych klanów</h3>
                            <p>
                                API nie zwróciło jeszcze
                                informacji o klanach.
                            </p>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML = list
            .map((clan, index) => {

                const leader =
                    clan.members.find(
                        player =>
                            String(
                                player.rank || ""
                            )
                                .toLowerCase()
                                .includes("lider")
                    );

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="clan-tag">
                                ${escapeHTML(
                                    clan.name
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                leader
                                    ? escapeHTML(
                                        getName(
                                            leader
                                        )
                                      )
                                    : "—"
                            }
                        </td>

                        <td>
                            ${clan.members.length}
                        </td>

                        <td class="positive">
                            ${formatMoney(
                                clan.money
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                clan.money
                            )}
                        </td>

                        <td>
                            DANE API
                        </td>

                        <td class="change-none">
                            —
                        </td>

                    </tr>
                `;

            })
            .join("");
    });
}

/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const table =
        $("#marketTable");

    if (!table) return;

    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>◆</div>
                        <h3>Brak danych rynku</h3>
                        <p>
                            Brak wystarczających danych
                            z API.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = clans
        .slice(0, 20)
        .map(clan => {

            return `
                <tr>

                    <td>
                        <span class="clan-tag">
                            ${escapeHTML(
                                clan.name
                            )}
                        </span>
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            clan.money
                        )}
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        —
                    </td>

                    <td class="positive">
                        ● DANE API
                    </td>

                </tr>
            `;

        })
        .join("");
}

/* =========================================================
   CHART.JS
   ========================================================= */

function loadChartJS() {

    return new Promise(resolve => {

        if (window.Chart) {
            resolve();
            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js";

        script.onload = resolve;

        script.onerror = () => {
            console.warn(
                "Nie udało się załadować Chart.js"
            );

            resolve();
        };

        document.head.appendChild(script);
    });
}

/* =========================================================
   CHARTS
   ========================================================= */

async function createCharts() {

    await loadChartJS();

    if (!window.Chart) return;

    createActivityChart(
        "activityChart"
    );

    createActivityChart(
        "activityChart2"
    );

    createClanChart(
        "clanChart"
    );

    createClanChart(
        "wealthChart"
    );
}

function destroyChart(id) {

    if (charts[id]) {

        charts[id].destroy();

        delete charts[id];
    }
}

function createActivityChart(id) {

    const canvas =
        document.getElementById(id);

    if (!canvas) return;

    destroyChart(id);

    /*
     * API /recent nie zwraca historii 7 dni,
     * więc nie wymyślamy danych.
     *
     * Pokazujemy liczbę rekordów API
     * jako aktualny punkt.
     */

    const labels = [
        "API"
    ];

    const data = [
        players.length
    ];

    charts[id] =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [{
                    label:
                        "Gracze z API",

                    data,

                    borderColor:
                        "#9b5cff",

                    backgroundColor:
                        "rgba(155,92,255,0.12)",

                    borderWidth: 2,

                    tension: 0.4,

                    fill: true,

                    pointRadius: 4
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
                            color:
                                "rgba(255,255,255,0.04)"
                        },

                        ticks: {
                            color:
                                "#6f6a78"
                        }
                    },

                    y: {

                        beginAtZero: true,

                        grid: {
                            color:
                                "rgba(255,255,255,0.04)"
                        },

                        ticks: {
                            color:
                                "#6f6a78"
                        }
                    }

                }

            }

        });
}

function createClanChart(id) {

    const canvas =
        document.getElementById(id);

    if (!canvas) return;

    destroyChart(id);

    const topClans =
        [...clans]
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);

    charts[id] =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    topClans.map(
                        clan => clan.name
                    ),

                datasets: [{

                    label:
                        "Majątek",

                    data:
                        topClans.map(
                            clan =>
                                clan.money
                        ),

                    backgroundColor:
                        "#9b5cff",

                    borderRadius: 7

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
                            color:
                                "#6f6a78"
                        }

                    },

                    y: {

                        beginAtZero: true,

                        grid: {
                            color:
                                "rgba(255,255,255,0.04)"
                        },

                        ticks: {
                            color:
                                "#6f6a78"
                        }

                    }

                }

            }

        });
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function switchPage(pageName) {

    const target =
        document.getElementById(pageName);

    if (!target) return;

    currentPage =
        pageName;

    $$(".page").forEach(page => {
        page.classList.remove("active");
    });

    target.classList.add("active");

    $$(".nav-item").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );

    });

    const title =
        document.querySelector(
            ".page-title h1"
        );

    const subtitle =
        document.querySelector(
            ".page-title p"
        );

    const titles = {

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
            "Najlepsi gracze Hodowla RP"
        ],

        charts: [
            "Wykresy",
            "Statystyki serwera"
        ],

        market: [
            "Rynek",
            "Wartość klanów"
        ],

        search: [
            "Wyszukiwarka",
            "Znajdź gracza lub klan"
        ]

    };

    if (titles[pageName]) {

        title.textContent =
            titles[pageName][0];

        subtitle.textContent =
            titles[pageName][1];
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    const sidebar =
        $("#sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupNavigation() {

    $$(".nav-item").forEach(item => {

        item.addEventListener(
            "click",
            () => {
                switchPage(
                    item.dataset.page
                );
            }
        );

    });

    $$("[data-page-link]").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    switchPage(
                        button.dataset.pageLink
                    );

                }
            );

        }
    );
}

/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function setupSearch() {

    const global =
        $("#globalSearch");

    const pageSearch =
        $("#globalSearchPage");

    const playerSearch =
        $("#playerSearch");

    const clanSearch =
        $("#clanSearch");

    if (global) {

        global.addEventListener(
            "input",
            event => {

                const value =
                    event.target.value;

                if (value.trim()) {
                    switchPage("search");
                }

                if (pageSearch) {
                    pageSearch.value =
                        value;
                }

                performSearch(value);
            }
        );

    }

    if (pageSearch) {

        pageSearch.addEventListener(
            "input",
            event => {

                const value =
                    event.target.value;

                if (global) {
                    global.value =
                        value;
                }

                performSearch(value);
            }
        );

    }

    if (playerSearch) {

        playerSearch.addEventListener(
            "input",
            () => {
                renderPlayersTable();
            }
        );

    }

    if (clanSearch) {

        clanSearch.addEventListener(
            "input",
            () => {
                filterClans();
            }
        );

    }
}

/* =========================================================
   PLAYER SORT
   ========================================================= */

function setupSorts() {

    const playerSort =
        $("#playerSort");

    if (playerSort) {

        playerSort.addEventListener(
            "change",
            () => {
                renderPlayersTable();
            }
        );

    }

    const clanSort =
        $("#clanSort");

    if (clanSort) {

        clanSort.addEventListener(
            "change",
            () => {
                filterClans();
            }
        );

    }
}

/* =========================================================
   CLAN FILTER
   ========================================================= */

function filterClans() {

    const table =
        $("#allClansTable");

    if (!table) return;

    const query =
        ($("#clanSearch")?.value || "")
            .trim()
            .toLowerCase();

    const sort =
        $("#clanSort")?.value || "money";

    let list =
        [...clans];

    if (query) {

        list =
            list.filter(
                clan =>
                    clan.name
                        .toLowerCase()
                        .includes(query)
            );
    }

    if (sort === "money") {

        list.sort(
            (a, b) =>
                b.money - a.money
        );

    }

    if (sort === "members") {

        list.sort(
            (a, b) =>
                b.members.length -
                a.members.length
        );

    }

    if (sort === "time") {

        list.sort(
            (a, b) =>
                b.members.length -
                a.members.length
        );

    }

    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Brak klanów</h3>
                        <p>
                            Nie znaleziono pasujących danych.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        list.map(
            (clan, index) => {

                const leader =
                    clan.members.find(
                        player =>
                            String(
                                player.rank || ""
                            )
                                .toLowerCase()
                                .includes("lider")
                    );

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="clan-tag">
                                ${escapeHTML(
                                    clan.name
                                )}
                            </span>
                        </td>

                        <td>
                            ${
                                leader
                                    ? escapeHTML(
                                        getName(
                                            leader
                                        )
                                      )
                                    : "—"
                            }
                        </td>

                        <td>
                            ${clan.members.length}
                        </td>

                        <td class="positive">
                            ${formatMoney(
                                clan.money
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                clan.money
                            )}
                        </td>

                        <td>
                            DANE API
                        </td>

                        <td>
                            —
                        </td>

                    </tr>
                `;

            }
        ).join("");
}

/* =========================================================
   REFRESH
   ========================================================= */

async function refreshData() {

    const button =
        $("#refreshButton");

    if (button) {

        button.disabled = true;

        button.textContent =
            "↻ Ładowanie...";
    }

    try {

        await loadPlayers();

        showToast(
            "✓ Dane zostały odświeżone"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "↻ Odśwież";
        }

    }
}

/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        $("#mobileMenu");

    const sidebar =
        $("#sidebar");

    if (!button || !sidebar) return;

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
   INITIALIZATION
   ========================================================= */

async function init() {

    console.log(
        "%cEXODO STATS",
        "color:#9b5cff;font-size:24px;font-weight:800"
    );

    console.log(
        "API:",
        API_BASE
    );

    setupNavigation();

    setupSearch();

    setupSorts();

    setupMobileMenu();

    const refresh =
        $("#refreshButton");

    if (refresh) {

        refresh.addEventListener(
            "click",
            refreshData
        );

    }

    /*
     * Przyciski / elementy początkowo
     * pokazują dane dopiero po API.
     */

    await loadPlayers();
}

/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
