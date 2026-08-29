/* =========================================================
   EXODO STATS
   script.js
   API: Cloudflare Worker
   ========================================================= */

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

let players = [];
let clans = [];
let currentPage = "dashboard";

let activityChart = null;
let activityChart2 = null;
let clanChart = null;
let wealthChart = null;


/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initNavigation();
    initSearch();
    initRefresh();
    initSorting();
    initMobileMenu();

    loadAPI();

});


/* =========================================================
   API
   ========================================================= */

async function apiFetch(endpoint) {

    const url = `${API_BASE}${endpoint}`;

    try {

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

        return data;

    } catch (error) {

        console.error("EXODO API ERROR:", error);

        return {
            success: false,
            error: error.message
        };

    }

}


/* =========================================================
   GŁÓWNE ŁADOWANIE API
   ========================================================= */

async function loadAPI() {

    showLoading();

    const data = await apiFetch("/api/recent?limit=20");

    if (!data || data.success !== true) {

        console.error("API nie zwróciło poprawnych danych.");

        showToast("Nie udało się pobrać danych API");

        hideLoading();

        return;

    }

    players = Array.isArray(data.players)
        ? data.players
        : [];

    /*
     * Niektóre pola w /api/recent są jeszcze puste.
     * Dlatego pobieramy szczegóły graczy przez /api/player.
     */

    await enrichPlayers();

    /*
     * Klany tworzymy na podstawie danych graczy.
     */

    buildClans();

    /*
     * Odświeżamy cały interfejs.
     */

    updateDashboard();
    renderAllPlayers();
    renderClans();
    renderRankings();
    renderMarket();
    renderCharts();

    hideLoading();

}


/* =========================================================
   POBIERANIE SZCZEGÓŁÓW GRACZY
   ========================================================= */

async function enrichPlayers() {

    if (!players.length) {
        return;
    }

    /*
     * Maksymalnie 20 requestów.
     * Robimy je równolegle.
     */

    const requests = players.map(async (player) => {

        if (!player || !player.name) {
            return player;
        }

        try {

            const name = encodeURIComponent(player.name);

            const data = await apiFetch(
                `/api/player?name=${name}`
            );

            if (
                data &&
                data.success === true &&
                data.player
            ) {

                return {
                    ...player,
                    ...data.player,

                    /*
                     * Zachowujemy nazwę z listy,
                     * jeśli szczegóły jej nie mają.
                     */

                    name: data.player.name || player.name,

                    /*
                     * Oznaczamy, że dane pochodzą z API.
                     */

                    apiData: true
                };

            }

        } catch (error) {

            console.error(
                `Błąd pobierania gracza ${player.name}`,
                error
            );

        }

        return {
            ...player,
            apiData: true
        };

    });


    const results = await Promise.all(requests);

    players = results.filter(Boolean);

}


/* =========================================================
   NORMALIZACJA DANYCH
   ========================================================= */

function normalizePlayer(player) {

    if (!player) {

        return {
            name: "Nieznany",
            level: 0,
            money: 0,
            playtime: "",
            clan: "",
            rank: "",
            status: null,
            lastSeen: "",
            playerId: null,
            apiData: false
        };

    }

    return {

        name: player.name || "Nieznany",

        level: Number(player.level) || 0,

        money: parseMoney(player.money),

        playtime: player.playtime || "",

        clan: cleanClan(player.clan),

        rank: cleanRank(player.rank),

        status: player.status,

        lastSeen: player.lastSeen || "",

        playerId: player.playerId || null,

        source: player.source || "hodowlarp.pl",

        sourceUrl:
            player.sourceUrl ||
            `https://hodowlarp.pl/gracz/${encodeURIComponent(
                player.name || ""
            )}`,

        apiData:
            player.apiData !== false

    };

}


/* =========================================================
   PIENIĄDZE
   ========================================================= */

function parseMoney(value) {

    if (typeof value === "number") {
        return value;
    }

    if (!value) {
        return 0;
    }

    const cleaned = String(value)
        .replace(/\s/g, "")
        .replace(/\$/g, "")
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    const number = Number(cleaned);

    return Number.isFinite(number)
        ? number
        : 0;

}


function formatMoney(value) {

    const number = parseMoney(value);

    if (number === 0) {
        return "0$";
    }

    return (
        new Intl.NumberFormat("pl-PL", {
            maximumFractionDigits: 0
        }).format(number)
        + "$"
    );

}


/* =========================================================
   CZYSZCZENIE KLANY
   ========================================================= */

function cleanClan(value) {

    if (!value) {
        return "—";
    }

    let text = String(value).trim();

    /*
     * API czasami zwraca cały fragment strony.
     */

    if (
        text.includes("Nie należy do żadnego klanu") ||
        text.includes("Nie nale") ||
        text.includes("Hodowla RP")
    ) {

        const match = text.match(
            /\[\s*([^\]]+)\s*\]/
        );

        if (match) {
            return match[1];
        }

        return "—";

    }

    return text || "—";

}


/* =========================================================
   CZYSZCZENIE RANGI
   ========================================================= */

function cleanRank(value) {

    if (!value) {
        return "—";
    }

    const text = String(value).trim();

    if (
        text.includes("Kupiona w sklepie") &&
        text.includes("Relacje")
    ) {

        const match = text.match(
            /^(.+?)\s+Kupiona w sklepie/i
        );

        if (match) {
            return match[1].trim();
        }

    }

    return text || "—";

}


/* =========================================================
   CZAS GRY
   ========================================================= */

function formatPlaytime(value) {

    if (!value) {
        return "—";
    }

    const text = String(value).trim();

    /*
     * Jeśli API zwraca prostą wartość:
     * "2 godz."
     * "3 dni"
     */

    if (
        text.length < 40 &&
        !text.includes("Pierwsze wejście")
    ) {

        return text;

    }

    /*
     * Próbujemy znaleźć konkretny czas.
     */

    const hours = text.match(
        /(\d+)\s*(?:godz\.|godziny|godzin)/i
    );

    if (hours) {
        return `${hours[1]} godz.`;
    }

    const days = text.match(
        /(\d+)\s*(?:dni|dzień)/i
    );

    if (days) {
        return `${days[1]} dni`;
    }

    return text
        .replace(/\s+/g, " ")
        .slice(0, 30);
}


/* =========================================================
   OSTATNIO WIDZIANY
   ========================================================= */

function formatLastSeen(player) {

    if (!player) {
        return "—";
    }

    const text =
        player.lastSeen ||
        player.playtime ||
        "";

    if (!text) {
        return "—";
    }

    const hour = text.match(
        /(\d+)\s*(?:godz\.|godzinę|godziny)/i
    );

    if (hour) {

        return `${hour[1]} godz.`;

    }

    if (/dzisiaj/i.test(text)) {
        return "dzisiaj";
    }

    return String(text)
        .replace(/\s+/g, " ")
        .slice(0, 25);
}


/* =========================================================
   STATUS
   ========================================================= */

function getStatus(player) {

    if (!player) {
        return "BRAK DANYCH";
    }

    /*
     * Jeśli API zwraca konkretny status.
     */

    if (
        player.status === true ||
        player.status === "online" ||
        player.status === "ONLINE"
    ) {

        return "ONLINE";

    }

    /*
     * Jeżeli status jest null,
     * nie zgadujemy.
     */

    if (player.status === false) {
        return "OFFLINE";
    }

    return "DANE API";

}


/* =========================================================
   STATUS HTML
   ========================================================= */

function statusHTML(player) {

    const status = getStatus(player);

    if (status === "ONLINE") {

        return `
            <span class="status-online">
                ● ONLINE
            </span>
        `;

    }

    if (status === "OFFLINE") {

        return `
            <span class="status-offline">
                ● OFFLINE
            </span>
        `;

    }

    return `
        <span class="status-api">
            ● DANE API
        </span>
    `;

}


/* =========================================================
   BUDOWANIE KLANÓW
   ========================================================= */

function buildClans() {

    const clanMap = {};

    players
        .map(normalizePlayer)
        .forEach(player => {

            const clan = player.clan;

            if (
                !clan ||
                clan === "—" ||
                clan === "-"
            ) {
                return;
            }

            if (!clanMap[clan]) {

                clanMap[clan] = {

                    name: clan,

                    leader: "—",

                    members: 0,

                    money: 0,

                    wealth: 0,

                    activity: 0,

                    change: 0

                };

            }

            clanMap[clan].members++;

            clanMap[clan].money += player.money;

            clanMap[clan].wealth += player.money;

            clanMap[clan].activity++;

        });


    clans = Object.values(clanMap);

    clans.sort(
        (a, b) =>
            b.wealth - a.wealth
    );

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const normalized = players.map(normalizePlayer);

    /*
     * Gracze
     */

    const playersElement =
        document.querySelector(
            "#dashboard .stat-card:nth-child(1) .stat-value"
        );

    if (playersElement) {

        playersElement.textContent =
            new Intl.NumberFormat("pl-PL")
                .format(normalized.length);

    }


    /*
     * Online
     */

    const onlineElement =
        document.getElementById(
            "onlinePlayers"
        );

    if (onlineElement) {

        const online = normalized.filter(
            p => getStatus(p) === "ONLINE"
        ).length;

        onlineElement.textContent =
            online;

    }


    /*
     * Klany
     */

    const clanElement =
        document.querySelector(
            "#dashboard .stat-card:nth-child(3) .stat-value"
        );

    if (clanElement) {

        clanElement.textContent =
            clans.length;

    }


    /*
     * Majątek
     */

    const totalMoney =
        normalized.reduce(
            (sum, player) =>
                sum + player.money,
            0
        );

    const wealthElement =
        document.querySelector(
            "#dashboard .stat-card:nth-child(4) .stat-value"
        );

    if (wealthElement) {

        wealthElement.textContent =
            formatCompactMoney(totalMoney);

    }


    renderClanTable();
    renderRichPlayers();
    renderLevelRanking();

}


/* =========================================================
   SKRÓCONA KWOTA
   ========================================================= */

function formatCompactMoney(value) {

    const number = parseMoney(value);

    if (number >= 1_000_000_000_000) {

        return (
            (number / 1_000_000_000_000)
                .toFixed(1)
                .replace(".", ",")
            + "T$"
        );

    }

    if (number >= 1_000_000_000) {

        return (
            (number / 1_000_000_000)
                .toFixed(1)
                .replace(".", ",")
            + "B$"
        );

    }

    if (number >= 1_000_000) {

        return (
            (number / 1_000_000)
                .toFixed(1)
                .replace(".", ",")
            + "M$"
        );

    }

    if (number >= 1_000) {

        return (
            (number / 1_000)
                .toFixed(1)
                .replace(".", ",")
            + "K$"
        );

    }

    return formatMoney(number);

}


/* =========================================================
   TABELA KLANÓW - DASHBOARD
   ========================================================= */

function renderClanTable() {

    const table =
        document.getElementById(
            "clanTable"
        );

    if (!table) {
        return;
    }

    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Brak danych o klanach
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    table.innerHTML =
        clans
            .slice(0, 10)
            .map((clan, index) => {

                return `
                    <tr>

                        <td>
                            <strong>${index + 1}</strong>
                        </td>

                        <td>
                            <strong>${escapeHTML(clan.name)}</strong>
                        </td>

                        <td>
                            ${escapeHTML(clan.leader)}
                        </td>

                        <td>
                            ${clan.members}
                        </td>

                        <td>
                            ${formatMoney(clan.money)}
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
                        </td>

                        <td>
                            ${clan.activity}
                        </td>

                        <td>
                            <span class="positive">
                                —
                            </span>
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   NAJBOGATSI GRACZE
   ========================================================= */

function renderRichPlayers() {

    const table =
        document.getElementById(
            "richPlayersTable"
        );

    if (!table) {
        return;
    }


    const sorted =
        [...players]
            .map(normalizePlayer)
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);


    table.innerHTML =
        sorted
            .map((player, index) => {

                return `
                    <tr>

                        <td>
                            <strong>${index + 1}</strong>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>
                        </td>

                        <td>
                            ${player.level}
                        </td>

                        <td>
                            ${formatMoney(player.money)}
                        </td>

                        <td>
                            ${escapeHTML(player.clan)}
                        </td>

                        <td>
                            ${formatPlaytime(player.playtime)}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   WSZYSTKICH GRACZY
   ========================================================= */

function renderAllPlayers() {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (!table) {
        return;
    }


    const sorted =
        [...players]
            .map(normalizePlayer);


    if (!sorted.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        Brak graczy z API
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    table.innerHTML =
        sorted
            .map((player, index) => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${index + 1}
                            </strong>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>
                        </td>

                        <td>
                            ${player.level || "—"}
                        </td>

                        <td>
                            ${formatMoney(player.money)}
                        </td>

                        <td>
                            ${escapeHTML(player.clan)}
                        </td>

                        <td>
                            ${formatLastSeen(player)}
                        </td>

                        <td>
                            ${statusHTML(player)}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   KLANy
   ========================================================= */

function renderClans() {

    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) {
        return;
    }


    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Brak danych klanów z API
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    table.innerHTML =
        clans
            .map((clan, index) => {

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
                            ${escapeHTML(clan.leader)}
                        </td>

                        <td>
                            ${clan.members}
                        </td>

                        <td>
                            ${formatMoney(clan.money)}
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
                        </td>

                        <td>
                            ${clan.activity}
                        </td>

                        <td>
                            —
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   RANKINGI
   ========================================================= */

function renderRankings() {

    renderLevelRanking2();
    renderMoneyRanking();

}


function renderLevelRanking() {

    const container =
        document.getElementById(
            "levelRanking"
        );

    if (!container) {
        return;
    }


    const sorted =
        [...players]
            .map(normalizePlayer)
            .sort(
                (a, b) =>
                    b.level - a.level
            )
            .slice(0, 10);


    container.innerHTML =
        sorted
            .map((player, index) => {

                return `
                    <div class="ranking-row">

                        <div>
                            <strong>
                                #${index + 1}
                            </strong>
                        </div>

                        <div style="flex:1;">
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>

                            <small>
                                Poziom ${player.level}
                            </small>
                        </div>

                        <strong>
                            ${player.level}
                        </strong>

                    </div>
                `;

            })
            .join("");

}


function renderLevelRanking2() {

    const container =
        document.getElementById(
            "levelRanking2"
        );

    if (!container) {
        return;
    }


    const sorted =
        [...players]
            .map(normalizePlayer)
            .sort(
                (a, b) =>
                    b.level - a.level
            )
            .slice(0, 15);


    container.innerHTML =
        sorted
            .map((player, index) => {

                return `
                    <div class="ranking-row">

                        <div>
                            <strong>
                                #${index + 1}
                            </strong>
                        </div>

                        <div style="flex:1;">
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>

                            <small>
                                ${escapeHTML(player.clan)}
                            </small>
                        </div>

                        <strong>
                            LVL ${player.level}
                        </strong>

                    </div>
                `;

            })
            .join("");

}


function renderMoneyRanking() {

    const container =
        document.getElementById(
            "moneyRanking"
        );

    if (!container) {
        return;
    }


    const sorted =
        [...players]
            .map(normalizePlayer)
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 15);


    container.innerHTML =
        sorted
            .map((player, index) => {

                return `
                    <div class="ranking-row">

                        <div>
                            <strong>
                                #${index + 1}
                            </strong>
                        </div>

                        <div style="flex:1;">
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>

                            <small>
                                ${escapeHTML(player.clan)}
                            </small>
                        </div>

                        <strong>
                            ${formatCompactMoney(player.money)}
                        </strong>

                    </div>
                `;

            })
            .join("");

}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const table =
        document.getElementById(
            "marketTable"
        );

    if (!table) {
        return;
    }


    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        Brak danych rynku
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    table.innerHTML =
        clans
            .slice(0, 20)
            .map(clan => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(clan.name)}
                            </strong>
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
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
                `;

            })
            .join("");

}


/* =========================================================
   WYKRESY
   ========================================================= */

function renderCharts() {

    /*
     * Chart.js nie jest obecnie dodany w HTML.
     * Jeżeli będzie dostępny, uruchamiamy wykresy.
     */

    if (typeof Chart === "undefined") {

        console.warn(
            "Chart.js nie jest załadowany."
        );

        return;

    }

    renderActivityChart();
    renderClanChart();
    renderActivityChart2();
    renderWealthChart();

}


/* =========================================================
   AKTYWNOŚĆ
   ========================================================= */

function renderActivityChart() {

    const canvas =
        document.getElementById(
            "activityChart"
        );

    if (!canvas) {
        return;
    }

    if (activityChart) {
        activityChart.destroy();
    }


    const labels =
        players
            .slice(0, 7)
            .map(
                p =>
                    normalizePlayer(p).name
            );


    const values =
        players
            .slice(0, 7)
            .map(
                p =>
                    normalizePlayer(p).level
            );


    activityChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [{

                    label: "Poziom",

                    data: values,

                    tension: 0.35,

                    fill: true

                }]

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

        });

}


/* =========================================================
   TOP KLANY
   ========================================================= */

function renderClanChart() {

    const canvas =
        document.getElementById(
            "clanChart"
        );

    if (!canvas) {
        return;
    }

    if (clanChart) {
        clanChart.destroy();
    }


    const top =
        clans.slice(0, 10);


    clanChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    top.map(
                        clan => clan.name
                    ),

                datasets: [{

                    label: "Majątek",

                    data:
                        top.map(
                            clan =>
                                clan.wealth
                        )

                }]

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

        });

}


/* =========================================================
   DRUGI WYKRES AKTYWNOŚCI
   ========================================================= */

function renderActivityChart2() {

    const canvas =
        document.getElementById(
            "activityChart2"
        );

    if (!canvas) {
        return;
    }

    if (activityChart2) {
        activityChart2.destroy();
    }


    activityChart2 =
        new Chart(canvas, {

            type: "line",

            data: {

                labels:
                    players
                        .slice(0, 10)
                        .map(
                            p =>
                                normalizePlayer(p).name
                        ),

                datasets: [{

                    label: "Poziom",

                    data:
                        players
                            .slice(0, 10)
                            .map(
                                p =>
                                    normalizePlayer(p).level
                            ),

                    tension: 0.35

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false

            }

        });

}


/* =========================================================
   WEALTH CHART
   ========================================================= */

function renderWealthChart() {

    const canvas =
        document.getElementById(
            "wealthChart"
        );

    if (!canvas) {
        return;
    }

    if (wealthChart) {
        wealthChart.destroy();
    }


    const top =
        [...players]
            .map(normalizePlayer)
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);


    wealthChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    top.map(
                        p => p.name
                    ),

                datasets: [{

                    label: "Gotówka",

                    data:
                        top.map(
                            p => p.money
                        )

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false

            }

        });

}


/* =========================================================
   NAWIGACJA
   ========================================================= */

function initNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;

                if (page) {
                    showPage(page);
                }

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


function showPage(page) {

    const pages =
        document.querySelectorAll(
            ".page"
        );

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    pages.forEach(section => {

        section.classList.toggle(
            "active",
            section.id === page
        );

    });


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === page
        );

    });


    currentPage = page;


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
            "Najlepsi gracze serwera"
        ],

        charts: [
            "Wykresy",
            "Statystyki Hodowla RP"
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


    if (titles[page]) {

        if (title) {
            title.textContent =
                titles[page][0];
        }

        if (subtitle) {
            subtitle.textContent =
                titles[page][1];
        }

    }


    /*
     * Zamykamy menu mobilne.
     */

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    if (sidebar) {
        sidebar.classList.remove("open");
    }

}


/* =========================================================
   WYSZUKIWARKA
   ========================================================= */

function initSearch() {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    const playerSearch =
        document.getElementById(
            "playerSearch"
        );

    const clanSearch =
        document.getElementById(
            "clanSearch"
        );

    const globalSearchPage =
        document.getElementById(
            "globalSearchPage"
        );


    if (globalSearch) {

        globalSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    const query =
                        globalSearch.value.trim();

                    if (query) {

                        showPage("search");

                        const pageInput =
                            document.getElementById(
                                "globalSearchPage"
                            );

                        if (pageInput) {

                            pageInput.value =
                                query;

                        }

                        performSearch(query);

                    }

                }

            }
        );

    }


    if (globalSearchPage) {

        globalSearchPage.addEventListener(
            "input",
            debounce(event => {

                performSearch(
                    event.target.value.trim()
                );

            }, 400)
        );

    }


    if (playerSearch) {

        playerSearch.addEventListener(
            "input",
            debounce(event => {

                filterPlayers(
                    event.target.value
                );

            }, 150)
        );

    }


    if (clanSearch) {

        clanSearch.addEventListener(
            "input",
            debounce(event => {

                filterClans(
                    event.target.value
                );

            }, 150)
        );

    }

}


/* =========================================================
   GŁÓWNA WYSZUKIWARKA
   ========================================================= */

async function performSearch(query) {

    const results =
        document.getElementById(
            "searchResults"
        );

    if (!results) {
        return;
    }


    if (!query) {

        results.innerHTML = `
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


    results.innerHTML = `
        <div class="empty-state">
            <div>⌛</div>
            <h3>
                Szukanie...
            </h3>
            <p>
                Pobieranie danych z Hodowla RP
            </p>
        </div>
    `;


    /*
     * Najpierw szukamy lokalnie.
     */

    const lower =
        query.toLowerCase();


    const localPlayers =
        players
            .map(normalizePlayer)
            .filter(
                player =>
                    player.name
                        .toLowerCase()
                        .includes(lower)
            );


    const localClans =
        clans.filter(
            clan =>
                clan.name
                    .toLowerCase()
                    .includes(lower)
        );


    /*
     * Następnie próbujemy dokładnego endpointu
     * /api/player.
     */

    let exactPlayer = null;


    try {

        const data =
            await apiFetch(
                `/api/player?name=${encodeURIComponent(query)}`
            );


        if (
            data &&
            data.success === true &&
            data.player
        ) {

            exactPlayer =
                normalizePlayer({
                    ...data.player,
                    apiData: true
                });

        }

    } catch (error) {

        console.error(
            "Search API error:",
            error
        );

    }


    /*
     * Usuwamy duplikaty.
     */

    const combinedPlayers = [];

    if (exactPlayer) {
        combinedPlayers.push(exactPlayer);
    }

    localPlayers.forEach(player => {

        const exists =
            combinedPlayers.some(
                p =>
                    p.name.toLowerCase() ===
                    player.name.toLowerCase()
            );

        if (!exists) {
            combinedPlayers.push(player);
        }

    });


    renderSearchResults(
        combinedPlayers,
        localClans,
        query
    );

}


/* =========================================================
   WYNIKI WYSZUKIWANIA
   ========================================================= */

function renderSearchResults(
    foundPlayers,
    foundClans,
    query
) {

    const results =
        document.getElementById(
            "searchResults"
        );

    if (!results) {
        return;
    }


    if (
        !foundPlayers.length &&
        !foundClans.length
    ) {

        results.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Nie znaleziono
                </h3>

                <p>
                    Brak wyników dla:
                    <strong>
                        ${escapeHTML(query)}
                    </strong>
                </p>

            </div>
        `;

        return;

    }


    let html = "";


    /*
     * GRACZE
     */

    if (foundPlayers.length) {

        html += `
            <div class="panel" style="margin-bottom:20px;">

                <div class="panel-header">

                    <div>
                        <div class="panel-title">
                            Gracze
                        </div>

                        <div class="panel-subtitle">
                            Wyniki wyszukiwania
                        </div>
                    </div>

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>
                            <tr>
                                <th>Gracz</th>
                                <th>Poziom</th>
                                <th>Gotówka</th>
                                <th>Klan</th>
                                <th>Ranga</th>
                                <th>Ostatnio</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
        `;


        foundPlayers.forEach(player => {

            html += `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(player.name)}
                        </strong>
                    </td>

                    <td>
                        ${player.level || "—"}
                    </td>

                    <td>
                        ${formatMoney(player.money)}
                    </td>

                    <td>
                        ${escapeHTML(player.clan)}
                    </td>

                    <td>
                        ${escapeHTML(player.rank)}
                    </td>

                    <td>
                        ${formatLastSeen(player)}
                    </td>

                    <td>
                        ${statusHTML(player)}
                    </td>

                </tr>
            `;

        });


        html += `
                        </tbody>

                    </table>

                </div>

            </div>
        `;

    }


    /*
     * KLANY
     */

    if (foundClans.length) {

        html += `
            <div class="panel">

                <div class="panel-header">

                    <div>
                        <div class="panel-title">
                            Klany
                        </div>

                        <div class="panel-subtitle">
                            Wyniki wyszukiwania
                        </div>
                    </div>

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>

                            <tr>
                                <th>#</th>
                                <th>Klan</th>
                                <th>Członkowie</th>
                                <th>Majątek</th>
                            </tr>

                        </thead>

                        <tbody>
        `;


        foundClans.forEach(
            (clan, index) => {

                html += `
                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(clan.name)}
                            </strong>
                        </td>

                        <td>
                            ${clan.members}
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
                        </td>

                    </tr>
                `;

            }
        );


        html += `
                        </tbody>

                    </table>

                </div>

            </div>
        `;

    }


    results.innerHTML = html;

}


/* =========================================================
   FILTROWANIE GRACZY
   ========================================================= */

function filterPlayers(query) {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (!table) {
        return;
    }


    const lower =
        String(query || "")
            .toLowerCase();


    const filtered =
        players
            .map(normalizePlayer)
            .filter(
                player =>
                    player.name
                        .toLowerCase()
                        .includes(lower)
            );


    table.innerHTML =
        filtered
            .map((player, index) => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${index + 1}
                            </strong>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>
                        </td>

                        <td>
                            ${player.level || "—"}
                        </td>

                        <td>
                            ${formatMoney(player.money)}
                        </td>

                        <td>
                            ${escapeHTML(player.clan)}
                        </td>

                        <td>
                            ${formatLastSeen(player)}
                        </td>

                        <td>
                            ${statusHTML(player)}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   FILTROWANIE KLANÓW
   ========================================================= */

function filterClans(query) {

    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) {
        return;
    }


    const lower =
        String(query || "")
            .toLowerCase();


    const filtered =
        clans.filter(
            clan =>
                clan.name
                    .toLowerCase()
                    .includes(lower)
        );


    table.innerHTML =
        filtered
            .map((clan, index) => {

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
                            ${escapeHTML(clan.leader)}
                        </td>

                        <td>
                            ${clan.members}
                        </td>

                        <td>
                            ${formatMoney(clan.money)}
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
                        </td>

                        <td>
                            ${clan.activity}
                        </td>

                        <td>
                            —
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   SORTOWANIE
   ========================================================= */

function initSorting() {

    const playerSort =
        document.getElementById(
            "playerSort"
        );

    const clanSort =
        document.getElementById(
            "clanSort"
        );


    if (playerSort) {

        playerSort.addEventListener(
            "change",
            () => {

                sortPlayers(
                    playerSort.value
                );

            }
        );

    }


    if (clanSort) {

        clanSort.addEventListener(
            "change",
            () => {

                sortClans(
                    clanSort.value
                );

            }
        );

    }

}


function sortPlayers(type) {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (!table) {
        return;
    }


    const sorted =
        [...players]
            .map(normalizePlayer);


    if (type === "money") {

        sorted.sort(
            (a, b) =>
                b.money - a.money
        );

    }


    if (type === "level") {

        sorted.sort(
            (a, b) =>
                b.level - a.level
        );

    }


    if (type === "time") {

        sorted.sort(
            (a, b) =>
                b.playtime.length -
                a.playtime.length
        );

    }


    table.innerHTML =
        sorted
            .map((player, index) => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${index + 1}
                            </strong>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>
                        </td>

                        <td>
                            ${player.level || "—"}
                        </td>

                        <td>
                            ${formatMoney(player.money)}
                        </td>

                        <td>
                            ${escapeHTML(player.clan)}
                        </td>

                        <td>
                            ${formatLastSeen(player)}
                        </td>

                        <td>
                            ${statusHTML(player)}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


function sortClans(type) {

    if (type === "money") {

        clans.sort(
            (a, b) =>
                b.wealth - a.wealth
        );

    }


    if (type === "members") {

        clans.sort(
            (a, b) =>
                b.members - a.members
        );

    }


    if (type === "time") {

        clans.sort(
            (a, b) =>
                b.activity - a.activity
        );

    }


    renderClans();

}


/* =========================================================
   ODŚWIEŻANIE
   ========================================================= */

function initRefresh() {

    const button =
        document.getElementById(
            "refreshButton"
        );

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            button.disabled = true;

            button.innerHTML =
                "↻ Ładowanie...";


            await loadAPI();


            button.disabled = false;

            button.innerHTML =
                "↻ Odśwież";


            showToast(
                "✓ Dane zostały pobrane z API"
            );

        }
    );

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function initMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenu"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (
        !button ||
        !sidebar
    ) {
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
   LOADING
   ========================================================= */

function showLoading() {

    const elements =
        document.querySelectorAll(
            ".stat-value"
        );


    elements.forEach(
        element => {

            if (
                element.id !==
                "onlinePlayers"
            ) {

                element.classList.add(
                    "loading"
                );

            }

        }
    );

}


function hideLoading() {

    const elements =
        document.querySelectorAll(
            ".stat-value"
        );


    elements.forEach(
        element => {

            element.classList.remove(
                "loading"
            );

        }
    );

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

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
        3000
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   DEBOUNCE
   ========================================================= */

function debounce(
    callback,
    delay
) {

    let timeout;

    return function (...args) {

        clearTimeout(timeout);

        timeout = setTimeout(
            () => callback.apply(this, args),
            delay
        );

    };

}


/* =========================================================
   KONIEC
   ========================================================= */
