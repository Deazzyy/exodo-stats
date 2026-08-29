// ============================================================
// EXODO STATS
// script.js
// API: https://exodo-api.oliwierdawidowicz.workers.dev
// ============================================================

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

let players = [];
let clans = [];
let charts = {};


// ============================================================
// HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "")
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

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("pl-PL");
}

function getPlayerName(player) {
    return (
        player?.name ??
        player?.username ??
        player?.player ??
        player?.nick ??
        player?.nickname ??
        "Nieznany"
    );
}

function getLevel(player) {
    const value =
        player?.level ??
        player?.lvl ??
        player?.poziom ??
        0;

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function getMoney(player) {
    const value =
        player?.money ??
        player?.cash ??
        player?.balance ??
        player?.gotowka ??
        player?.wallet ??
        0;

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function getClan(player) {
    const clan =
        player?.clan ??
        player?.clanName ??
        player?.gang ??
        player?.faction ??
        player?.klan ??
        null;

    if (!clan) {
        return "—";
    }

    if (typeof clan === "string") {
        return clan;
    }

    return (
        clan.name ??
        clan.tag ??
        clan.shortName ??
        "—"
    );
}

function getActivity(player) {
    return (
        player?.activity ??
        player?.lastActivity ??
        player?.lastSeen ??
        player?.lastOnline ??
        player?.onlineStatus ??
        player?.statusText ??
        "—"
    );
}

function isOnline(player) {
    return (
        player?.online === true ||
        player?.isOnline === true ||
        player?.status === "online" ||
        player?.status === "ONLINE"
    );
}

function getClanName(clan) {
    return (
        clan?.name ??
        clan?.tag ??
        clan?.clan ??
        "Nieznany"
    );
}

function getClanMoney(clan) {
    const value =
        clan?.money ??
        clan?.cash ??
        clan?.balance ??
        clan?.wealth ??
        clan?.value ??
        0;

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function getClanMembers(clan) {
    const value =
        clan?.members ??
        clan?.memberCount ??
        clan?.membersCount ??
        0;

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function getClanLeader(clan) {
    return (
        clan?.leader ??
        clan?.leaderName ??
        clan?.owner ??
        "—"
    );
}


// ============================================================
// API
// ============================================================

async function fetchJSON(url) {
    const response = await fetch(url, {
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

    return await response.json();
}


// ============================================================
// NORMALIZACJA ODPOWIEDZI API
// ============================================================

function extractArray(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    const possibleKeys = [
        "data",
        "players",
        "results",
        "items",
        "recent",
        "clans"
    ];

    for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    return [];
}


// ============================================================
// POBIERANIE GRACZY
// ============================================================

async function loadPlayers() {
    try {
        const data = await fetchJSON(
            `${API_BASE}/api/recent?limit=20`
        );

        players = extractArray(data);

        console.log(
            "EXODO API - gracze:",
            players
        );

        renderPlayers();
        updateDashboard();

    } catch (error) {
        console.error(
            "Nie udało się pobrać graczy:",
            error
        );

        players = [];
        renderPlayersError();
    }
}


// ============================================================
// POBIERANIE KLANÓW
// ============================================================

async function loadClans() {
    const endpoints = [
        "/api/clans",
        "/api/clans?limit=20"
    ];

    for (const endpoint of endpoints) {
        try {
            const data = await fetchJSON(
                API_BASE + endpoint
            );

            const result = extractArray(data);

            if (result.length > 0) {
                clans = result;

                console.log(
                    "EXODO API - klany:",
                    clans
                );

                renderClans();
                renderMarket();
                renderClanChart();

                return;
            }

        } catch (error) {
            console.warn(
                "Nie udało się pobrać:",
                endpoint
            );
        }
    }

    clans = [];

    renderClans();
    renderMarket();
}


// ============================================================
// RENDER GRACZY
// ============================================================

function createPlayerRow(player, index, includeStatus = true) {
    const name = getPlayerName(player);
    const level = getLevel(player);
    const money = getMoney(player);
    const clan = getClan(player);
    const activity = getActivity(player);
    const online = isOnline(player);

    const profileURL =
        `https://hodowlarp.pl/gracz/${encodeURIComponent(name)}`;

    const status = includeStatus
        ? `
            <span class="player-status ${online ? "online" : "offline"}">
                <span class="status-dot"></span>
                ${online ? "ONLINE" : "DANE API"}
            </span>
        `
        : "";

    return `
        <tr>
            <td><strong>${index + 1}</strong></td>

            <td>
                <a
                    href="${profileURL}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="player-link"
                >
                    <strong>${escapeHTML(name)}</strong>
                </a>
            </td>

            <td>
                <strong>${formatNumber(level)}</strong>
            </td>

            <td>
                ${formatMoney(money)}
            </td>

            <td>
                ${escapeHTML(clan)}
            </td>

            <td>
                ${escapeHTML(activity)}
            </td>

            ${includeStatus ? `<td>${status}</td>` : ""}
        </tr>
    `;
}


// ============================================================
// TABELA WSZYSCY GRACZE
// ============================================================

function renderAllPlayers() {
    const table = $("allPlayersTable");

    if (!table) {
        return;
    }

    if (!players.length) {
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

    table.innerHTML = players
        .map((player, index) =>
            createPlayerRow(player, index, true)
        )
        .join("");
}


// ============================================================
// TABELA NAJBOGATSI GRACZE
// ============================================================

function renderRichPlayers() {
    const table = $("richPlayersTable");

    if (!table) {
        return;
    }

    const sorted = [...players]
        .sort(
            (a, b) =>
                getMoney(b) - getMoney(a)
        )
        .slice(0, 10);

    if (!sorted.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Brak danych.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = sorted
        .map((player, index) =>
            createPlayerRow(player, index, false)
        )
        .join("");
}


// ============================================================
// GŁÓWNY RENDER GRACZY
// ============================================================

function renderPlayers() {
    renderAllPlayers();
    renderRichPlayers();
    renderLevelRankings();
    renderMoneyRanking();
}


// ============================================================
// BŁĄD GRACZY
// ============================================================

function renderPlayersError() {
    const table = $("allPlayersTable");

    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        Nie udało się pobrać danych z API.
                    </div>
                </td>
            </tr>
        `;
    }

    const rich = $("richPlayersTable");

    if (rich) {
        rich.innerHTML = `
            <tr>
                <td colspan="6">
                    Brak danych API.
                </td>
            </tr>
        `;
    }
}


// ============================================================
// RANKING POZIOMÓW
// ============================================================

function createLevelRanking(containerId) {
    const container = $(containerId);

    if (!container) {
        return;
    }

    const sorted = [...players]
        .sort(
            (a, b) =>
                getLevel(b) - getLevel(a)
        )
        .slice(0, 10);

    if (!sorted.length) {
        container.innerHTML =
            `<div class="empty-state">Brak danych.</div>`;

        return;
    }

    container.innerHTML = sorted
        .map((player, index) => {
            const name = getPlayerName(player);
            const level = getLevel(player);

            return `
                <div class="ranking-row">

                    <div class="ranking-position">
                        ${index + 1}
                    </div>

                    <div class="ranking-name">
                        <a
                            href="https://hodowlarp.pl/gracz/${encodeURIComponent(name)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHTML(name)}
                        </a>
                    </div>

                    <div class="ranking-value">
                        ${formatNumber(level)} lvl
                    </div>

                </div>
            `;
        })
        .join("");
}

function renderLevelRankings() {
    createLevelRanking("levelRanking");
    createLevelRanking("levelRanking2");
}


// ============================================================
// RANKING PIENIĘDZY
// ============================================================

function renderMoneyRanking() {
    const container = $("moneyRanking");

    if (!container) {
        return;
    }

    const sorted = [...players]
        .sort(
            (a, b) =>
                getMoney(b) - getMoney(a)
        )
        .slice(0, 10);

    if (!sorted.length) {
        container.innerHTML =
            `<div class="empty-state">Brak danych.</div>`;

        return;
    }

    container.innerHTML = sorted
        .map((player, index) => {
            const name = getPlayerName(player);
            const money = getMoney(player);

            return `
                <div class="ranking-row">

                    <div class="ranking-position">
                        ${index + 1}
                    </div>

                    <div class="ranking-name">
                        <a
                            href="https://hodowlarp.pl/gracz/${encodeURIComponent(name)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHTML(name)}
                        </a>
                    </div>

                    <div class="ranking-value">
                        ${formatMoney(money)}
                    </div>

                </div>
            `;
        })
        .join("");
}


// ============================================================
// KLANY
// ============================================================

function createClanRow(clan, index) {
    const name = getClanName(clan);
    const money = getClanMoney(clan);
    const members = getClanMembers(clan);
    const leader = getClanLeader(clan);

    const activity =
        clan?.activity ??
        clan?.lastActivity ??
        "—";

    const change =
        clan?.change ??
        clan?.weeklyChange ??
        "—";

    return `
        <tr>

            <td>
                <strong>${index + 1}</strong>
            </td>

            <td>
                <strong>
                    ${escapeHTML(name)}
                </strong>
            </td>

            <td>
                ${escapeHTML(leader)}
            </td>

            <td>
                ${formatNumber(members)}
            </td>

            <td>
                ${formatMoney(
                    clan?.cash ??
                    clan?.money ??
                    0
                )}
            </td>

            <td>
                ${formatMoney(money)}
            </td>

            <td>
                ${escapeHTML(activity)}
            </td>

            <td>
                ${escapeHTML(change)}
            </td>

        </tr>
    `;
}


function renderClans() {
    const dashboardTable = $("clanTable");
    const allClansTable = $("allClansTable");

    if (!clans.length) {
        const empty = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Brak danych klanów z API.
                    </div>
                </td>
            </tr>
        `;

        if (dashboardTable) {
            dashboardTable.innerHTML = empty;
        }

        if (allClansTable) {
            allClansTable.innerHTML = empty;
        }

        return;
    }

    const sorted = [...clans]
        .sort(
            (a, b) =>
                getClanMoney(b) -
                getClanMoney(a)
        );

    if (dashboardTable) {
        dashboardTable.innerHTML =
            sorted
                .slice(0, 10)
                .map((clan, index) =>
                    createClanRow(clan, index)
                )
                .join("");
    }

    if (allClansTable) {
        allClansTable.innerHTML =
            sorted
                .map((clan, index) =>
                    createClanRow(clan, index)
                )
                .join("");
    }
}


// ============================================================
// RYNEK
// ============================================================

function renderMarket() {
    const table = $("marketTable");

    if (!table) {
        return;
    }

    if (!clans.length) {
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

    table.innerHTML = clans
        .slice()
        .sort(
            (a, b) =>
                getClanMoney(b) -
                getClanMoney(a)
        )
        .map(clan => {

            const name = getClanName(clan);
            const value = getClanMoney(clan);

            const today =
                clan?.today ??
                clan?.dailyChange ??
                clan?.changeToday ??
                "—";

            const week =
                clan?.week ??
                clan?.weeklyChange ??
                clan?.changeWeek ??
                "—";

            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(name)}
                        </strong>
                    </td>

                    <td>
                        ${formatMoney(value)}
                    </td>

                    <td>
                        ${escapeHTML(today)}
                    </td>

                    <td>
                        ${escapeHTML(week)}
                    </td>

                    <td>
                        <span class="player-status online">
                            <span class="status-dot"></span>
                            DANE API
                        </span>
                    </td>

                </tr>
            `;
        })
        .join("");
}


// ============================================================
// DASHBOARD
// ============================================================

function updateDashboard() {
    const playersCard =
        document.querySelector(
            "#dashboard .stats-grid .stat-card:nth-child(1) .stat-value"
        );

    const onlineCard =
        $("onlinePlayers");

    const clansCard =
        document.querySelector(
            "#dashboard .stats-grid .stat-card:nth-child(3) .stat-value"
        );

    const wealthCard =
        document.querySelector(
            "#dashboard .stats-grid .stat-card:nth-child(4) .stat-value"
        );

    if (playersCard) {
        playersCard.textContent =
            formatNumber(players.length);
    }

    if (onlineCard) {
        const online = players.filter(
            player => isOnline(player)
        ).length;

        onlineCard.textContent =
            formatNumber(online);
    }

    if (clansCard) {
        clansCard.textContent =
            formatNumber(clans.length);
    }

    if (wealthCard) {
        const totalWealth =
            clans.reduce(
                (sum, clan) =>
                    sum + getClanMoney(clan),
                0
            );

        if (totalWealth > 0) {
            wealthCard.textContent =
                formatMoney(totalWealth);
        }
    }
}


// ============================================================
// WYSZUKIWARKA GRACZY
// ============================================================

function searchPlayers(query) {
    const q =
        String(query ?? "")
            .trim()
            .toLowerCase();

    if (!q) {
        return players;
    }

    return players.filter(player => {

        const name =
            getPlayerName(player)
                .toLowerCase();

        const clan =
            getClan(player)
                .toLowerCase();

        return (
            name.includes(q) ||
            clan.includes(q)
        );
    });
}


function renderPlayerSearch(query) {
    const table = $("allPlayersTable");

    if (!table) {
        return;
    }

    const results =
        searchPlayers(query);

    if (!results.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        Nie znaleziono gracza.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        results
            .map((player, index) =>
                createPlayerRow(
                    player,
                    index,
                    true
                )
            )
            .join("");
}


// ============================================================
// WYSZUKIWARKA KLANÓW
// ============================================================

function searchClans(query) {
    const q =
        String(query ?? "")
            .trim()
            .toLowerCase();

    if (!q) {
        return clans;
    }

    return clans.filter(clan => {

        const name =
            getClanName(clan)
                .toLowerCase();

        const leader =
            getClanLeader(clan)
                .toLowerCase();

        return (
            name.includes(q) ||
            leader.includes(q)
        );
    });
}


function renderClanSearch(query) {
    const table = $("allClansTable");

    if (!table) {
        return;
    }

    const results =
        searchClans(query);

    if (!results.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Nie znaleziono klanu.
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML =
        results
            .map((clan, index) =>
                createClanRow(
                    clan,
                    index
                )
            )
            .join("");
}


// ============================================================
// GLOBAL SEARCH
// ============================================================

function globalSearch(query) {
    const results =
        $("searchResults");

    if (!results) {
        return;
    }

    const q =
        String(query ?? "")
            .trim()
            .toLowerCase();

    if (!q) {
        results.innerHTML = `
            <div class="empty-state">
                <div>⌕</div>
                <h3>Wpisz nazwę powyżej</h3>
                <p>
                    Wyszukiwarka znajdzie graczy oraz klany.
                </p>
            </div>
        `;

        return;
    }

    const foundPlayers =
        searchPlayers(q);

    const foundClans =
        searchClans(q);

    let html = "";

    if (foundPlayers.length) {
        html += `
            <div class="panel-title">
                Gracze
            </div>

            <div style="margin-top:12px;">
        `;

        foundPlayers
            .slice(0, 10)
            .forEach(player => {

                const name =
                    getPlayerName(player);

                html += `
                    <div class="ranking-row">

                        <div class="ranking-name">

                            <a
                                href="https://hodowlarp.pl/gracz/${encodeURIComponent(name)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ${escapeHTML(name)}
                            </a>

                        </div>

                        <div class="ranking-value">
                            ${formatNumber(getLevel(player))} lvl
                        </div>

                    </div>
                `;
            });

        html += `</div>`;
    }

    if (foundClans.length) {

        html += `
            <div
                class="panel-title"
                style="margin-top:25px;"
            >
                Klany
            </div>

            <div style="margin-top:12px;">
        `;

        foundClans
            .slice(0, 10)
            .forEach(clan => {

                html += `
                    <div class="ranking-row">

                        <div class="ranking-name">
                            ${escapeHTML(
                                getClanName(clan)
                            )}
                        </div>

                        <div class="ranking-value">
                            ${formatMoney(
                                getClanMoney(clan)
                            )}
                        </div>

                    </div>
                `;
            });

        html += `</div>`;
    }

    if (!html) {
        html = `
            <div class="empty-state">
                <div>⌕</div>
                <h3>Brak wyników</h3>
                <p>
                    Nie znaleziono gracza ani klanu.
                </p>
            </div>
        `;
    }

    results.innerHTML = html;
}


// ============================================================
// SORTOWANIE GRACZY
// ============================================================

function sortPlayers(type) {

    const sorted =
        [...players];

    if (type === "money") {
        sorted.sort(
            (a, b) =>
                getMoney(b) -
                getMoney(a)
        );
    }

    if (type === "level") {
        sorted.sort(
            (a, b) =>
                getLevel(b) -
                getLevel(a)
        );
    }

    if (type === "time") {
        sorted.sort(
            (a, b) =>
                String(
                    getActivity(a)
                ).localeCompare(
                    String(
                        getActivity(b)
                    )
                )
        );
    }

    const table =
        $("allPlayersTable");

    if (table) {
        table.innerHTML =
            sorted
                .map((player, index) =>
                    createPlayerRow(
                        player,
                        index,
                        true
                    )
                )
                .join("");
    }
}


// ============================================================
// SORTOWANIE KLANÓW
// ============================================================

function sortClans(type) {

    const sorted =
        [...clans];

    if (type === "money") {
        sorted.sort(
            (a, b) =>
                getClanMoney(b) -
                getClanMoney(a)
        );
    }

    if (type === "members") {
        sorted.sort(
            (a, b) =>
                getClanMembers(b) -
                getClanMembers(a)
        );
    }

    if (type === "time") {
        sorted.sort(
            (a, b) =>
                String(
                    a?.activity ??
                    ""
                ).localeCompare(
                    String(
                        b?.activity ??
                        ""
                    )
                )
        );
    }

    const table =
        $("allClansTable");

    if (table) {
        table.innerHTML =
            sorted
                .map((clan, index) =>
                    createClanRow(
                        clan,
                        index
                    )
                )
                .join("");
    }
}


// ============================================================
// WYKRESY
// ============================================================

function loadChartJS() {
    return new Promise(resolve => {

        if (
            typeof Chart !==
            "undefined"
        ) {
            resolve();
            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js";

        script.onload =
            resolve;

        script.onerror =
            () => resolve();

        document.head.appendChild(
            script
        );
    });
}


// ============================================================
// CHART AKTYWNOŚCI
// ============================================================

function createActivityChart(canvasId) {

    const canvas =
        $(canvasId);

    if (!canvas ||
        typeof Chart === "undefined") {
        return;
    }

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const labels = [
        "Pon",
        "Wt",
        "Śr",
        "Czw",
        "Pt",
        "Sob",
        "Nd"
    ];

    const base =
        Math.max(
            players.length,
            1
        );

    const data = labels.map(
        (_, index) =>
            Math.round(
                base *
                (
                    0.55 +
                    Math.sin(index) * 0.15 +
                    0.2
                )
            )
    );

    charts[canvasId] =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Aktywni gracze",

                            data,

                            tension: 0.4,

                            fill: true
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,

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


// ============================================================
// CHART KLANÓW
// ============================================================

function createClanChart(canvasId) {

    const canvas =
        $(canvasId);

    if (!canvas ||
        typeof Chart === "undefined") {
        return;
    }

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const sorted =
        [...clans]
            .sort(
                (a, b) =>
                    getClanMoney(b) -
                    getClanMoney(a)
            )
            .slice(0, 10);

    if (!sorted.length) {
        return;
    }

    charts[canvasId] =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "bar",

                data: {
                    labels:
                        sorted.map(
                            getClanName
                        ),

                    datasets: [
                        {
                            label:
                                "Majątek",

                            data:
                                sorted.map(
                                    getClanMoney
                                )
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,

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


// ============================================================
// CHARTY
// ============================================================

function renderCharts() {

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

function renderClanChart() {
    if (
        typeof Chart !==
        "undefined"
    ) {
        createClanChart(
            "clanChart"
        );

        createClanChart(
            "wealthChart"
        );
    }
}


// ============================================================
// NAWIGACJA
// ============================================================

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
            "Wykresy statystyk",

        market:
            "Zmiany wartości klanów",

        search:
            "Znajdź gracza lub klan"
    };

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;

                if (!page) {
                    return;
                }

                navItems.forEach(
                    nav =>
                        nav.classList.remove(
                            "active"
                        )
                );

                item.classList.add(
                    "active"
                );

                pages.forEach(
                    section =>
                        section.classList.remove(
                            "active"
                        )
                );

                const target =
                    $(page);

                if (target) {
                    target.classList.add(
                        "active"
                    );
                }

                if (title) {
                    const text =
                        item.textContent
                            .trim();

                    title.textContent =
                        text;
                }

                const subtitle =
                    document.querySelector(
                        ".page-title p"
                    );

                if (subtitle) {
                    subtitle.textContent =
                        subtitles[page] ??
                        "";
                }

                if (
                    page === "charts"
                ) {
                    setTimeout(
                        renderCharts,
                        100
                    );
                }

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
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

                    const page =
                        button.dataset.pageLink;

                    const nav =
                        document.querySelector(
                            `.nav-item[data-page="${page}"]`
                        );

                    if (nav) {
                        nav.click();
                    }
                }
            );
        });
}


// ============================================================
// MOBILE MENU
// ============================================================

function setupMobileMenu() {

    const button =
        $("mobileMenu");

    const sidebar =
        $("sidebar");

    if (!button ||
        !sidebar) {
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
        .querySelectorAll(
            ".nav-item"
        )
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


// ============================================================
// SEARCH EVENTS
// ============================================================

function setupSearch() {

    const global =
        $("globalSearch");

    const globalPage =
        $("globalSearchPage");

    const playerSearch =
        $("playerSearch");

    const clanSearch =
        $("clanSearch");


    if (global) {
        global.addEventListener(
            "input",
            event => {

                const value =
                    event.target.value;

                if (value.trim()) {

                    const searchNav =
                        document.querySelector(
                            '.nav-item[data-page="search"]'
                        );

                    if (searchNav) {
                        searchNav.click();
                    }

                    if (globalPage) {
                        globalPage.value =
                            value;
                    }

                    globalSearch(value);
                }
            }
        );
    }


    if (globalPage) {
        globalPage.addEventListener(
            "input",
            event =>
                globalSearch(
                    event.target.value
                )
        );
    }


    if (playerSearch) {
        playerSearch.addEventListener(
            "input",
            event =>
                renderPlayerSearch(
                    event.target.value
                )
        );
    }


    if (clanSearch) {
        clanSearch.addEventListener(
            "input",
            event =>
                renderClanSearch(
                    event.target.value
                )
        );
    }
}


// ============================================================
// SORT EVENTS
// ============================================================

function setupSorting() {

    const playerSort =
        $("playerSort");

    const clanSort =
        $("clanSort");


    if (playerSort) {
        playerSort.addEventListener(
            "change",
            event =>
                sortPlayers(
                    event.target.value
                )
        );
    }


    if (clanSort) {
        clanSort.addEventListener(
            "change",
            event =>
                sortClans(
                    event.target.value
                )
        );
    }
}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {

    const toast =
        $("toast");

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    setTimeout(
        () => {
            toast.classList.remove(
                "show"
            );
        },
        2500
    );
}


// ============================================================
// REFRESH
// ============================================================

async function refreshData() {

    const button =
        $("refreshButton");

    if (button) {
        button.disabled = true;
        button.textContent =
            "↻ Ładowanie...";
    }

    try {

        await Promise.all([
            loadPlayers(),
            loadClans()
        ]);

        await loadChartJS();

        renderCharts();

        showToast(
            "✓ Statystyki zostały odświeżone"
        );

    } catch (error) {

        console.error(
            "Błąd odświeżania:",
            error
        );

        showToast(
            "✕ Nie udało się odświeżyć danych"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "↻ Odśwież";
        }
    }
}


// ============================================================
// START
// ============================================================

async function init() {

    console.log(
        "EXODO STATS uruchomione"
    );

    setupNavigation();
    setupMobileMenu();
    setupSearch();
    setupSorting();

    const refresh =
        $("refreshButton");

    if (refresh) {
        refresh.addEventListener(
            "click",
            refreshData
        );
    }

    await refreshData();
}


// ============================================================
// START PO ZAŁADOWANIU STRONY
// ============================================================

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
} else {
    init();
}
