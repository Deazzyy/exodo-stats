/* =========================================================
   EXODO STATS — SCRIPT.JS
   API: EXODO / HODOWLA RP
   ========================================================= */

const API_BASE =
    "https://exodo-api.oliwierdawidowicz.workers.dev";

const RECENT_LIMIT = 20;

let players = [];
let clans = [];
let charts = {};

let currentPlayerSort = "money";
let currentClanSort = "money";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


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

    return (
        new Intl.NumberFormat("pl-PL", {
            maximumFractionDigits: 0
        }).format(number) + "$"
    );
}


function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return new Intl.NumberFormat("pl-PL").format(number);
}


function getPlayerUrl(player) {
    if (player && player.sourceUrl) {
        return player.sourceUrl;
    }

    return (
        "https://hodowlarp.pl/gracz/" +
        encodeURIComponent(player?.name || "")
    );
}


function getPlayerName(player) {
    return player?.name || "Nieznany";
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


function getActivity(player) {
    if (!player?.playtime) {
        return "—";
    }

    const value = String(player.playtime).trim();

    return value || "—";
}


function getClan(player) {
    if (!player?.clan) {
        return "—";
    }

    const value = String(player.clan).trim();

    if (!value) {
        return "—";
    }

    return value;
}


function getStatus(player) {
    if (player?.status) {
        return String(player.status);
    }

    return "DANE API";
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message = "✓ Statystyki zostały odświeżone") {
    const toast = $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.exodoToastTimer);

    window.exodoToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* =========================================================
   API
   ========================================================= */

async function apiFetch(endpoint) {
    const url = API_BASE + endpoint;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json"
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

    setLoadingState();

    try {

        const data = await apiFetch(
            `/api/recent?limit=${RECENT_LIMIT}`
        );

        if (!Array.isArray(data.players)) {
            throw new Error(
                "API nie zwróciło tablicy players"
            );
        }

        players = data.players.map((player) => ({
            name: player.name || "Nieznany",
            level: Number.isFinite(Number(player.level))
                ? Number(player.level)
                : 0,
            money: Number.isFinite(Number(player.money))
                ? Number(player.money)
                : 0,
            playtime: player.playtime || "",
            clan: player.clan || "",
            rank: player.rank || "",
            status: player.status || null,
            lastSeen: player.lastSeen || "",
            playerId: player.playerId ?? null,
            source: player.source || "hodowlarp.pl",
            sourceUrl:
                player.sourceUrl ||
                `https://hodowlarp.pl/gracz/${encodeURIComponent(
                    player.name || ""
                )}`
        }));

        /*
         * Na tym etapie nie tworzymy sztucznych klanów.
         * API /recent w Twoim przypadku zwraca clan="".
         */

        clans = buildClansFromPlayers();

        renderEverything();

        showToast(
            `✓ Pobrano ${players.length} graczy z API`
        );

    } catch (error) {

        console.error(
            "EXODO API ERROR:",
            error
        );

        showApiError(error);
    }
}


/* =========================================================
   BUILD CLANS
   ========================================================= */

function buildClansFromPlayers() {

    const clanMap = new Map();

    players.forEach((player) => {

        const clanValue = getClan(player);

        if (
            !clanValue ||
            clanValue === "—" ||
            clanValue === "Nie należy do żadnego klanu."
        ) {
            return;
        }

        /*
         * API może w przyszłości zwracać np.
         * "[ exo ] exo Lider · 18 członków"
         *
         * Tutaj staramy się wyciągnąć tag.
         */

        let clanName = clanValue;

        const match = clanValue.match(
            /\[\s*([^\]]+)\s*\]/
        );

        if (match) {
            clanName = match[1].trim();
        }

        if (!clanMap.has(clanName)) {

            clanMap.set(clanName, {
                name: clanName,
                leader: "—",
                members: 0,
                money: 0,
                wealth: 0,
                activity: 0,
                players: []
            });
        }

        const clan = clanMap.get(clanName);

        clan.players.push(player);

        clan.members =
            Math.max(
                clan.members,
                clan.players.length
            );

        clan.money += getMoney(player);

        if (
            /lider/i.test(clanValue)
        ) {
            clan.leader =
                getPlayerName(player);
        }
    });

    return Array.from(
        clanMap.values()
    );
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    updateDashboardStats();

    renderPlayersTable(
        "#allPlayersTable",
        players
    );

    renderPlayersTable(
        "#richPlayersTable",
        getRichestPlayers(10)
    );

    renderLevelRanking(
        "#levelRanking"
    );

    renderLevelRanking(
        "#levelRanking2"
    );

    renderMoneyRanking();

    renderClansTable(
        "#clanTable",
        clans
    );

    renderClansTable(
        "#allClansTable",
        clans
    );

    renderMarket();

    updateCharts();
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {

    const statCards =
        $$(".stat-card");

    if (!statCards.length) {
        return;
    }

    /*
     * Nie wpisujemy już sztucznych:
     * 1284 graczy
     * 132 online
     * 86 klanów
     * 84.2M$
     *
     * Pokazujemy dane, które faktycznie mamy.
     */

    const totalPlayers =
        players.length;

    const totalMoney =
        players.reduce(
            (sum, player) =>
                sum + getMoney(player),
            0
        );

    const totalClans =
        clans.length;

    /*
     * ONLINE:
     * API /recent nie daje wiarygodnego
     * statusu online dla każdego gracza.
     *
     * Dlatego nie zgadujemy.
     */

    if (statCards[0]) {

        const value =
            statCards[0].querySelector(
                ".stat-value"
            );

        const change =
            statCards[0].querySelector(
                ".stat-change"
            );

        if (value) {
            value.textContent =
                formatNumber(totalPlayers);
        }

        if (change) {
            change.textContent =
                "Dane z API";
        }
    }


    if (statCards[1]) {

        const value =
            statCards[1].querySelector(
                ".stat-value"
            );

        const change =
            statCards[1].querySelector(
                ".stat-change"
            );

        if (value) {
            value.textContent =
                "—";
        }

        if (change) {
            change.textContent =
                "API nie podaje obecnie online";
        }
    }


    if (statCards[2]) {

        const value =
            statCards[2].querySelector(
                ".stat-value"
            );

        const change =
            statCards[2].querySelector(
                ".stat-change"
            );

        if (value) {
            value.textContent =
                formatNumber(totalClans);
        }

        if (change) {
            change.textContent =
                totalClans > 0
                    ? "Na podstawie danych API"
                    : "Brak danych klanów";
        }
    }


    if (statCards[3]) {

        const value =
            statCards[3].querySelector(
                ".stat-value"
            );

        const change =
            statCards[3].querySelector(
                ".stat-change"
            );

        if (value) {
            value.textContent =
                formatMoney(totalMoney);
        }

        if (change) {
            change.textContent =
                "Suma danych z API";
        }
    }
}


/* =========================================================
   PLAYERS TABLE
   ========================================================= */

function renderPlayersTable(
    selector,
    list
) {

    const tbody =
        $(selector);

    if (!tbody) {
        return;
    }

    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Brak graczy</h3>
                        <p>API nie zwróciło danych.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        list
            .map(
                (player, index) => {

                    const name =
                        escapeHTML(
                            getPlayerName(player)
                        );

                    const url =
                        escapeHTML(
                            getPlayerUrl(player)
                        );

                    const level =
                        getLevel(player);

                    const money =
                        getMoney(player);

                    const clan =
                        escapeHTML(
                            getClan(player)
                        );

                    const activity =
                        escapeHTML(
                            getActivity(player)
                        );

                    const status =
                        escapeHTML(
                            getStatus(player)
                        );

                    return `
                        <tr>

                            <td class="rank-number">
                                ${index + 1}
                            </td>

                            <td>
                                <a
                                    href="${url}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="player-name"
                                    style="
                                        text-decoration:none;
                                        color:inherit;
                                    "
                                >
                                    ${name}
                                </a>
                            </td>

                            <td>
                                ${level > 0
                                    ? level
                                    : "—"}
                            </td>

                            <td class="positive">
                                ${formatMoney(money)}
                            </td>

                            <td>
                                ${
                                    clan === "—"
                                        ? "—"
                                        : `<span class="clan-tag">${clan}</span>`
                                }
                            </td>

                            <td>
                                ${
                                    activity === "—"
                                        ? `<span class="change-none">—</span>`
                                        : activity
                                }
                            </td>

                            <td>
                                <span
                                    style="
                                        color:#4ade80;
                                        font-weight:600;
                                    "
                                >
                                    ● ${status}
                                </span>
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   SORT PLAYERS
   ========================================================= */

function getSortedPlayers(list) {

    const result =
        [...list];

    switch (currentPlayerSort) {

        case "level":

            return result.sort(
                (a, b) =>
                    getLevel(b) -
                    getLevel(a)
            );


        case "time":

            return result.sort(
                (a, b) =>
                    String(
                        b.playtime || ""
                    ).length -
                    String(
                        a.playtime || ""
                    ).length
            );


        case "money":
        default:

            return result.sort(
                (a, b) =>
                    getMoney(b) -
                    getMoney(a)
            );
    }
}


function getRichestPlayers(limit = 10) {

    return getSortedPlayers(
        players
    ).slice(0, limit);
}


/* =========================================================
   PLAYER SEARCH
   ========================================================= */

function setupPlayerSearch() {

    const input =
        $("#playerSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            const filtered =
                players.filter(
                    (player) => {

                        const name =
                            getPlayerName(
                                player
                            ).toLowerCase();

                        const clan =
                            getClan(
                                player
                            ).toLowerCase();

                        return (
                            name.includes(query) ||
                            clan.includes(query)
                        );
                    }
                );

            renderPlayersTable(
                "#allPlayersTable",
                getSortedPlayers(filtered)
            );
        }
    );
}


/* =========================================================
   PLAYER SORT
   ========================================================= */

function setupPlayerSort() {

    const select =
        $("#playerSort");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {

            currentPlayerSort =
                select.value;

            const search =
                $("#playerSearch");

            const query =
                search
                    ? search.value
                        .trim()
                        .toLowerCase()
                    : "";

            const filtered =
                players.filter(
                    (player) => {

                        if (!query) {
                            return true;
                        }

                        return getPlayerName(
                            player
                        )
                            .toLowerCase()
                            .includes(query);
                    }
                );

            renderPlayersTable(
                "#allPlayersTable",
                getSortedPlayers(filtered)
            );
        }
    );
}


/* =========================================================
   CLANS TABLE
   ========================================================= */

function renderClansTable(
    selector,
    list
) {

    const tbody =
        $(selector);

    if (!tbody) {
        return;
    }

    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>♛</div>
                        <h3>Brak danych klanów</h3>
                        <p>
                            API /recent nie zwraca obecnie
                            danych klanów.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        list
            .map(
                (clan, index) => {

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
                                <span class="player-name">
                                    ${escapeHTML(clan.leader)}
                                </span>
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
                                —
                            </td>

                            <td class="change-none">
                                —
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   CLAN SORT
   ========================================================= */

function sortClans(list) {

    const result =
        [...list];

    switch (currentClanSort) {

        case "members":

            return result.sort(
                (a, b) =>
                    b.members -
                    a.members
            );


        case "time":

            return result;


        case "money":
        default:

            return result.sort(
                (a, b) =>
                    b.money -
                    a.money
            );
    }
}


function setupClanSearch() {

    const input =
        $("#clanSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            const filtered =
                clans.filter(
                    (clan) =>
                        clan.name
                            .toLowerCase()
                            .includes(query)
                );

            renderClansTable(
                "#allClansTable",
                sortClans(filtered)
            );
        }
    );
}


function setupClanSort() {

    const select =
        $("#clanSort");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {

            currentClanSort =
                select.value;

            renderClansTable(
                "#allClansTable",
                sortClans(clans)
            );
        }
    );
}


/* =========================================================
   LEVEL RANKING
   ========================================================= */

function renderLevelRanking(
    selector
) {

    const container =
        $(selector);

    if (!container) {
        return;
    }

    const ranking =
        [...players]
            .sort(
                (a, b) =>
                    getLevel(b) -
                    getLevel(a)
            )
            .slice(0, 10);

    if (!ranking.length) {

        container.innerHTML =
            `
                <div class="empty-state">
                    <div>★</div>
                    <h3>Brak danych</h3>
                </div>
            `;

        return;
    }

    const maxLevel =
        Math.max(
            ...ranking.map(
                getLevel
            ),
            1
        );

    container.innerHTML =
        ranking
            .map(
                (player, index) => {

                    const level =
                        getLevel(player);

                    const percentage =
                        Math.max(
                            3,
                            (level /
                                maxLevel) *
                                100
                        );

                    return `
                        <div class="ranking-row">

                            <div class="ranking-number">
                                ${index + 1}
                            </div>

                            <div
                                class="ranking-name"
                                title="${escapeHTML(
                                    getPlayerName(player)
                                )}"
                            >
                                ${escapeHTML(
                                    getPlayerName(player)
                                )}
                            </div>

                            <div class="ranking-bar">
                                <span
                                    style="
                                        width:${percentage}%;
                                    "
                                ></span>
                            </div>

                            <div class="ranking-value">
                                ${level}
                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {

    const container =
        $("#moneyRanking");

    if (!container) {
        return;
    }

    const ranking =
        [...players]
            .sort(
                (a, b) =>
                    getMoney(b) -
                    getMoney(a)
            )
            .slice(0, 10);

    if (!ranking.length) {

        container.innerHTML =
            `
                <div class="empty-state">
                    <div>$</div>
                    <h3>Brak danych</h3>
                </div>
            `;

        return;
    }

    const maxMoney =
        Math.max(
            ...ranking.map(
                getMoney
            ),
            1
        );

    container.innerHTML =
        ranking
            .map(
                (player, index) => {

                    const money =
                        getMoney(player);

                    const percentage =
                        Math.max(
                            money > 0 ? 3 : 0,
                            (money /
                                maxMoney) *
                                100
                        );

                    return `
                        <div class="ranking-row">

                            <div class="ranking-number">
                                ${index + 1}
                            </div>

                            <div
                                class="ranking-name"
                                title="${escapeHTML(
                                    getPlayerName(player)
                                )}"
                            >
                                ${escapeHTML(
                                    getPlayerName(player)
                                )}
                            </div>

                            <div class="ranking-bar">
                                <span
                                    style="
                                        width:${percentage}%;
                                    "
                                ></span>
                            </div>

                            <div class="ranking-value">
                                ${formatMoney(money)}
                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const tbody =
        $("#marketTable");

    if (!tbody) {
        return;
    }

    if (!clans.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>◆</div>
                        <h3>Brak danych rynku</h3>
                        <p>
                            API nie udostępnia jeszcze
                            danych wartości klanów.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        clans
            .map(
                (clan) => `
                    <tr>

                        <td>
                            <span class="clan-tag">
                                ${escapeHTML(clan.name)}
                            </span>
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
                        </td>

                        <td class="change-none">
                            —
                        </td>

                        <td class="change-none">
                            —
                        </td>

                        <td>
                            <span
                                style="
                                    color:#aaa5b5;
                                "
                            >
                                Brak danych
                            </span>
                        </td>

                    </tr>
                `
            )
            .join("");
}


/* =========================================================
   CHART.JS
   ========================================================= */

function loadChartJS() {

    return new Promise(
        (resolve, reject) => {

            if (
                typeof Chart !==
                "undefined"
            ) {
                resolve();
                return;
            }

            const existing =
                document.querySelector(
                    'script[data-chartjs]'
                );

            if (existing) {

                existing.addEventListener(
                    "load",
                    resolve
                );

                existing.addEventListener(
                    "error",
                    reject
                );

                return;
            }

            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";

            script.async = true;

            script.dataset.chartjs =
                "true";

            script.onload =
                resolve;

            script.onerror =
                reject;

            document.head.appendChild(
                script
            );
        }
    );
}


/* =========================================================
   CHARTS
   ========================================================= */

async function updateCharts() {

    try {

        await loadChartJS();

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

    } catch (error) {

        console.error(
            "Chart.js error:",
            error
        );
    }
}


function destroyChart(id) {

    if (charts[id]) {

        charts[id].destroy();

        delete charts[id];
    }
}


function createActivityChart(
    canvasId
) {

    const canvas =
        document.getElementById(
            canvasId
        );

    if (!canvas) {
        return;
    }

    destroyChart(canvasId);

    const labels =
        players
            .slice(0, 7)
            .map(
                (player) =>
                    getPlayerName(player)
            );

    const values =
        players
            .slice(0, 7)
            .map(
                (player) =>
                    getLevel(player)
            );

    charts[canvasId] =
        new Chart(
            canvas,
            {
                type: "line",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Poziom gracza",

                            data:
                                values,

                            borderColor:
                                "#9b5cff",

                            backgroundColor:
                                "rgba(155,92,255,0.12)",

                            fill: true,

                            tension: 0.4,

                            pointRadius: 3,

                            pointHoverRadius: 5
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
            }
        );
}


function createClanChart(
    canvasId
) {

    const canvas =
        document.getElementById(
            canvasId
        );

    if (!canvas) {
        return;
    }

    destroyChart(canvasId);

    const ranking =
        [...players]
            .sort(
                (a, b) =>
                    getMoney(b) -
                    getMoney(a)
            )
            .slice(0, 7);

    const labels =
        ranking.map(
            (player) =>
                getPlayerName(player)
        );

    const values =
        ranking.map(
            (player) =>
                getMoney(player)
        );

    charts[canvasId] =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                "Gotówka",

                            data:
                                values,

                            backgroundColor:
                                "rgba(155,92,255,0.55)",

                            borderColor:
                                "#9b5cff",

                            borderWidth: 1,

                            borderRadius: 7
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
                                    "#6f6a78",

                                callback:
                                    function(value) {
                                        return formatMoney(
                                            value
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function setupGlobalSearch() {

    const input =
        $("#globalSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !==
                "Enter"
            ) {
                return;
            }

            const query =
                input.value.trim();

            if (!query) {
                return;
            }

            navigateTo(
                "search"
            );

            const searchInput =
                $("#globalSearchPage");

            if (searchInput) {

                searchInput.value =
                    query;

                searchInput.dispatchEvent(
                    new Event(
                        "input"
                    )
                );
            }
        }
    );
}


/* =========================================================
   SEARCH PAGE
   ========================================================= */

function setupSearchPage() {

    const input =
        $("#globalSearchPage");

    const results =
        $("#searchResults");

    if (
        !input ||
        !results
    ) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            if (!query) {

                results.innerHTML = `
                    <div class="empty-state">

                        <div>⌕</div>

                        <h3>
                            Wpisz nazwę powyżej
                        </h3>

                        <p>
                            Wyszukiwarka znajdzie
                            graczy oraz klany.
                        </p>

                    </div>
                `;

                return;
            }

            const playerResults =
                players.filter(
                    (player) =>
                        getPlayerName(
                            player
                        )
                            .toLowerCase()
                            .includes(query)
                );

            const clanResults =
                clans.filter(
                    (clan) =>
                        clan.name
                            .toLowerCase()
                            .includes(query)
                );

            let html = "";

            playerResults.forEach(
                (player) => {

                    html += `
                        <a
                            href="${escapeHTML(
                                getPlayerUrl(player)
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="result-card"
                            style="
                                text-decoration:none;
                                color:inherit;
                            "
                        >

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        getPlayerName(player)
                                    )}
                                </strong>

                                <small>
                                    Gracz · poziom
                                    ${getLevel(player)}
                                    · ${formatMoney(
                                        getMoney(player)
                                    )}
                                </small>

                            </div>

                            <span>
                                →
                            </span>

                        </a>
                    `;
                }
            );

            clanResults.forEach(
                (clan) => {

                    html += `
                        <div class="result-card">

                            <div>

                                <strong>
                                    ${escapeHTML(
                                        clan.name
                                    )}
                                </strong>

                                <small>
                                    Klan ·
                                    ${clan.members}
                                    członków
                                </small>

                            </div>

                            <span>
                                ♛
                            </span>

                        </div>
                    `;
                }
            );

            if (!html) {

                html = `
                    <div class="empty-state">

                        <div>⌕</div>

                        <h3>
                            Nie znaleziono
                        </h3>

                        <p>
                            Brak gracza lub klanu
                            o nazwie „${escapeHTML(
                                query
                            )}”.
                        </p>

                    </div>
                `;
            }

            results.innerHTML =
                html;
        }
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function navigateTo(
    pageId
) {

    const pages =
        $$(".page");

    const navItems =
        $$(".nav-item");

    pages.forEach(
        (page) => {

            page.classList.toggle(
                "active",
                page.id === pageId
            );
        }
    );

    navItems.forEach(
        (item) => {

            item.classList.toggle(
                "active",
                item.dataset.page ===
                    pageId
            );
        }
    );

    updatePageTitle(
        pageId
    );

    const sidebar =
        $("#sidebar");

    if (sidebar) {
        sidebar.classList.remove(
            "open"
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function updatePageTitle(
    pageId
) {

    const title =
        $(".page-title h1");

    const subtitle =
        $(".page-title p");

    if (!title) {
        return;
    }

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
            "Wizualizacja danych serwera"
        ],

        market: [
            "Rynek",
            "Wartość i zmiany klanów"
        ],

        search: [
            "Wyszukiwarka",
            "Znajdź gracza lub klan"
        ]
    };

    const data =
        titles[pageId] ||
        titles.dashboard;

    title.textContent =
        data[0];

    if (subtitle) {
        subtitle.textContent =
            data[1];
    }
}


function setupNavigation() {

    $$(".nav-item").forEach(
        (item) => {

            item.addEventListener(
                "click",
                () => {

                    navigateTo(
                        item.dataset.page
                    );
                }
            );
        }
    );


    $$("[data-page-link]").forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    navigateTo(
                        button.dataset.pageLink
                    );
                }
            );
        }
    );
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        $("#mobileMenu");

    const sidebar =
        $("#sidebar");

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
   REFRESH
   ========================================================= */

function setupRefresh() {

    const button =
        $("#refreshButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            const original =
                button.innerHTML;

            button.disabled =
                true;

            button.innerHTML =
                "↻ Ładowanie...";

            try {

                await loadPlayers();

            } finally {

                setTimeout(
                    () => {

                        button.disabled =
                            false;

                        button.innerHTML =
                            original;

                    },
                    500
                );
            }
        }
    );
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoadingState() {

    const tables = [
        "#allPlayersTable",
        "#richPlayersTable",
        "#clanTable",
        "#allClansTable",
        "#marketTable"
    ];

    tables.forEach(
        (selector) => {

            const element =
                $(selector);

            if (!element) {
                return;
            }

            const colspan =
                selector.includes(
                    "allPlayers"
                )
                    ? 7
                    : selector.includes(
                        "richPlayers"
                    )
                        ? 6
                        : selector.includes(
                            "market"
                        )
                            ? 5
                            : 8;

            element.innerHTML = `
                <tr>
                    <td colspan="${colspan}">
                        <div
                            style="
                                padding:30px;
                                text-align:center;
                                color:#6f6a78;
                            "
                        >
                            Ładowanie danych z API...
                        </div>
                    </td>
                </tr>
            `;
        }
    );
}


/* =========================================================
   API ERROR
   ========================================================= */

function showApiError(error) {

    console.error(error);

    const tables = [
        "#allPlayersTable",
        "#richPlayersTable"
    ];

    tables.forEach(
        (selector) => {

            const element =
                $(selector);

            if (!element) {
                return;
            }

            element.innerHTML = `
                <tr>
                    <td colspan="7">

                        <div class="empty-state">

                            <div>!</div>

                            <h3>
                                Nie udało się pobrać danych
                            </h3>

                            <p>
                                Sprawdź Worker EXODO API.
                            </p>

                        </div>

                    </td>
                </tr>
            `;
        }
    );

    showToast(
        "✕ Błąd połączenia z API"
    );
}


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupNavigation();

        setupMobileMenu();

        setupRefresh();

        setupGlobalSearch();

        setupSearchPage();

        setupPlayerSearch();

        setupPlayerSort();

        setupClanSearch();

        setupClanSort();

        /*
         * Najpierw pokazujemy pusty stan,
         * następnie pobieramy prawdziwe dane.
         */

        loadPlayers();
    }
);
