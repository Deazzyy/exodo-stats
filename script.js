/* =========================================================
   EXODO STATS — SCRIPT.JS
   API: exodo-api.oliwierdawidowicz.workers.dev
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

const API = {
    recent: `${API_BASE}/api/recent?limit=100`
};

/*
   Dane początkowe — używane tylko jako fallback,
   gdy API chwilowo nie odpowiada.
*/
const FALLBACK_PLAYERS = [
    {
        name: "Deazzyy",
        level: 1,
        money: 1600000,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Deazzyy"
    },
    {
        name: "BuziaszeQ_",
        level: 2,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/BuziaszeQ_"
    },
    {
        name: "mis23",
        level: 3,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/mis23"
    },
    {
        name: "Spoc0ny_Kacperek",
        level: 4,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Spoc0ny_Kacperek"
    },
    {
        name: "PitaPaka02",
        level: 5,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/PitaPaka02"
    },
    {
        name: "Podatek___",
        level: 1,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Podatek___"
    },
    {
        name: "MINICIPIO",
        level: 2,
        money: 0,
        clan: "",
        playtime: "# 2 MINICIPIO 46 lvl",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/MINICIPIO"
    },
    {
        name: "anomiczny",
        level: 3,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/anomiczny"
    },
    {
        name: "IvanMigomagowy",
        level: 4,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/IvanMigomagowy"
    },
    {
        name: "MaxerlQ",
        level: 5,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/MaxerlQ"
    },
    {
        name: "BlockSkY_",
        level: 1,
        money: 0,
        clan: "HASA",
        playtime: "#1 BlockSkY_ [ HASA ] 3 dni",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/BlockSkY_"
    },
    {
        name: "Alta_zio",
        level: 2,
        money: 0,
        clan: "Sakai",
        playtime: "# 2 Alta_zio [ Sakai ] 3 dni",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Alta_zio"
    },
    {
        name: "Czaro323",
        level: 3,
        money: 0,
        clan: "KWE",
        playtime: "# 3 Czaro323 [ KWE ] 3 dni",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Czaro323"
    },
    {
        name: "Beznes",
        level: 4,
        money: 0,
        clan: "PPPB",
        playtime: "# 4 Beznes [ PPPB ] 3 dni",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Beznes"
    },
    {
        name: "V4N11SH",
        level: 5,
        money: 0,
        clan: "KWE",
        playtime: "# 5 V4N11SH [ KWE ] 3 dni",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/V4N11SH"
    },
    {
        name: "Buzia",
        level: 0,
        money: 0,
        clan: "",
        playtime: "",
        status: null,
        lastSeen: "",
        sourceUrl: "https://hodowlarp.pl/gracz/Buzia"
    }
];


/* =========================================================
   STATE
   ========================================================= */

let players = [];
let clans = [];

let activityChart = null;
let clanChart = null;
let activityChart2 = null;
let wealthChart = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatMoney(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("pl-PL") + "$";
}


function formatNumber(value) {
    return (Number(value) || 0).toLocaleString("pl-PL");
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   PLAYER NORMALIZATION
   ========================================================= */

function normalizePlayer(player) {

    if (!player) {
        return null;
    }

    const name =
        player.name ||
        player.username ||
        player.nick ||
        player.player ||
        "Nieznany";

    const sourceUrl =
        player.sourceUrl ||
        `https://hodowlarp.pl/gracz/${encodeURIComponent(name)}`;

    return {
        name: String(name),

        level:
            player.level === null ||
            player.level === undefined ||
            player.level === ""
                ? 0
                : Number(player.level) || 0,

        money:
            player.money === null ||
            player.money === undefined ||
            player.money === ""
                ? 0
                : Number(
                    String(player.money)
                        .replace(/\s/g, "")
                        .replace("$", "")
                        .replace(",", ".")
                ) || 0,

        clan:
            player.clan ||
            player.clanName ||
            "",

        rank:
            player.rank ||
            "",

        playtime:
            player.playtime ||
            "",

        status:
            player.status ?? null,

        lastSeen:
            player.lastSeen ||
            "",

        sourceUrl
    };
}


/* =========================================================
   API
   ========================================================= */

async function fetchPlayers() {

    try {

        const response = await fetch(API.recent, {
            method: "GET",
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `API HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("EXODO API:", data);

        if (!data || !Array.isArray(data.players)) {
            throw new Error(
                "API nie zwróciło tablicy players"
            );
        }

        const apiPlayers = data.players
            .map(normalizePlayer)
            .filter(Boolean);

        /*
           Jeżeli API zwróciło dane, używamy ich.
        */
        if (apiPlayers.length > 0) {
            players = apiPlayers;
        } else {
            players = FALLBACK_PLAYERS.map(normalizePlayer);
        }

        return players;

    } catch (error) {

        console.error(
            "Błąd API EXODO:",
            error
        );

        /*
           Fallback
        */
        players = FALLBACK_PLAYERS.map(
            normalizePlayer
        );

        return players;
    }
}


/* =========================================================
   CLAN EXTRACTION
   ========================================================= */

function buildClans() {

    const map = new Map();

    players.forEach(player => {

        const clan = String(
            player.clan || ""
        ).trim();

        if (!clan) {
            return;
        }

        if (!map.has(clan)) {

            map.set(clan, {
                name: clan,
                leader: "—",
                members: 0,
                money: 0,
                wealth: 0,
                activity: 0
            });

        }

        const item = map.get(clan);

        item.members += 1;

        item.money += Number(player.money) || 0;

        item.wealth += Number(player.money) || 0;

        if (
            player.rank &&
            String(player.rank)
                .toLowerCase()
                .includes("lider")
        ) {
            item.leader = player.name;
        }

        if (player.playtime) {
            item.activity += 1;
        }

    });

    clans = Array.from(map.values());

    /*
       Fallbackowe klany, żeby panel nie był pusty,
       jeżeli API nie zwraca klanu w aktualnych danych.
    */
    if (clans.length === 0) {

        const knownClans = [
            {
                name: "EXO",
                leader: "Deazzyy",
                members: 18,
                money: 1600000,
                wealth: 1600000,
                activity: 90
            },
            {
                name: "HASA",
                leader: "BlockSkY_",
                members: 7,
                money: 0,
                wealth: 0,
                activity: 75
            },
            {
                name: "Sakai",
                leader: "Alta_zio",
                members: 10,
                money: 0,
                wealth: 0,
                activity: 70
            },
            {
                name: "KWE",
                leader: "V4N11SH",
                members: 10,
                money: 0,
                wealth: 0,
                activity: 68
            },
            {
                name: "PPPB",
                leader: "Beznes",
                members: 18,
                money: 0,
                wealth: 0,
                activity: 65
            }
        ];

        clans = knownClans;
    }
}


/* =========================================================
   PLAYER STATUS
   ========================================================= */

function getPlayerStatus(player) {

    if (
        player.status === true ||
        player.status === "online" ||
        player.status === "ONLINE"
    ) {
        return {
            text: "● ONLINE",
            className: "positive"
        };
    }

    /*
       API obecnie zwraca status: null,
       dlatego nie udajemy, że gracz jest offline.
    */
    return {
        text: "● DANE API",
        className: "positive"
    };
}


/* =========================================================
   ACTIVITY
   ========================================================= */

function getActivity(player) {

    if (player.lastSeen) {
        return player.lastSeen;
    }

    if (player.playtime) {
        return player.playtime;
    }

    return "—";
}


/* =========================================================
   PLAYER ROW
   ========================================================= */

function playerRow(player, index) {

    const status = getPlayerStatus(player);

    const clan = player.clan
        ? `<span class="clan-tag">${escapeHTML(player.clan)}</span>`
        : "—";

    const activity = getActivity(player);

    return `
        <tr>

            <td class="rank-number">
                ${index + 1}
            </td>

            <td>
                <a
                    href="${escapeHTML(player.sourceUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="player-name"
                    style="text-decoration:none;"
                >
                    ${escapeHTML(player.name)}
                </a>
            </td>

            <td>
                <strong>
                    ${formatNumber(player.level)}
                </strong>
            </td>

            <td>
                <span class="positive">
                    ${formatMoney(player.money)}
                </span>
            </td>

            <td>
                ${clan}
            </td>

            <td>
                ${escapeHTML(activity)}
            </td>

            <td>
                <span class="${status.className}">
                    ${status.text}
                </span>
            </td>

        </tr>
    `;
}


/* =========================================================
   ALL PLAYERS TABLE
   ========================================================= */

function renderAllPlayers() {

    const table = $("#allPlayersTable");

    if (!table) {
        return;
    }

    if (!players.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>♙</div>
                        <h3>Brak graczy</h3>
                        <p>API nie zwróciło danych.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = players
        .map(playerRow)
        .join("");
}


/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {

    const table = $("#richPlayersTable");

    if (!table) {
        return;
    }

    const rich = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    table.innerHTML = rich
        .map((player, index) => {

            const clan = player.clan
                ? `<span class="clan-tag">${escapeHTML(player.clan)}</span>`
                : "—";

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <a
                            href="${escapeHTML(player.sourceUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="player-name"
                            style="text-decoration:none;"
                        >
                            ${escapeHTML(player.name)}
                        </a>
                    </td>

                    <td>
                        ${formatNumber(player.level)}
                    </td>

                    <td class="positive">
                        ${formatMoney(player.money)}
                    </td>

                    <td>
                        ${clan}
                    </td>

                    <td>
                        ${escapeHTML(getActivity(player))}
                    </td>

                </tr>
            `;
        })
        .join("");
}


/* =========================================================
   LEVEL RANKING
   ========================================================= */

function rankingHTML(list, valueGetter, formatter) {

    if (!list.length) {
        return `
            <div class="empty-state">
                <div>★</div>
                <h3>Brak danych</h3>
            </div>
        `;
    }

    const max = Math.max(
        ...list.map(valueGetter),
        1
    );

    return list.map((player, index) => {

        const value =
            Number(valueGetter(player)) || 0;

        const percent =
            Math.max(
                4,
                Math.min(
                    100,
                    (value / max) * 100
                )
            );

        return `
            <div class="ranking-row">

                <div class="ranking-number">
                    ${index + 1}
                </div>

                <div
                    class="ranking-name"
                    title="${escapeHTML(player.name)}"
                >
                    ${escapeHTML(player.name)}
                </div>

                <div class="ranking-bar">
                    <span
                        style="width:${percent}%"
                    ></span>
                </div>

                <div class="ranking-value">
                    ${formatter(value)}
                </div>

            </div>
        `;

    }).join("");
}


function renderLevelRanking() {

    const levelPlayers = [...players]
        .sort((a, b) => b.level - a.level)
        .slice(0, 10);

    const html = rankingHTML(
        levelPlayers,
        player => player.level,
        value => `${value} lvl`
    );

    const target1 = $("#levelRanking");
    const target2 = $("#levelRanking2");

    if (target1) {
        target1.innerHTML = html;
    }

    if (target2) {
        target2.innerHTML = html;
    }
}


/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {

    const moneyPlayers = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    const html = rankingHTML(
        moneyPlayers,
        player => player.money,
        value => formatMoney(value)
    );

    const target = $("#moneyRanking");

    if (target) {
        target.innerHTML = html;
    }
}


/* =========================================================
   CLAN ROW
   ========================================================= */

function clanRow(clan, index) {

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
                    ${escapeHTML(clan.leader || "—")}
                </span>
            </td>

            <td>
                ${formatNumber(clan.members)}
            </td>

            <td class="positive">
                ${formatMoney(clan.money)}
            </td>

            <td class="positive">
                ${formatMoney(clan.wealth)}
            </td>

            <td>
                ${formatNumber(clan.activity)}
            </td>

            <td class="change-up">
                —
            </td>

        </tr>
    `;
}


/* =========================================================
   CLAN TABLE
   ========================================================= */

function renderClanTables(list = clans) {

    const dashboardTable = $("#clanTable");
    const allClansTable = $("#allClansTable");

    const html = list
        .map(clanRow)
        .join("");

    if (dashboardTable) {
        dashboardTable.innerHTML =
            list.slice(0, 10)
                .map(clanRow)
                .join("");
    }

    if (allClansTable) {
        allClansTable.innerHTML = html;
    }
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const table = $("#marketTable");

    if (!table) {
        return;
    }

    const list = [...clans]
        .sort((a, b) => b.wealth - a.wealth);

    table.innerHTML = list
        .map(clan => {

            return `
                <tr>

                    <td>
                        <span class="clan-tag">
                            ${escapeHTML(clan.name)}
                        </span>
                    </td>

                    <td class="positive">
                        ${formatMoney(clan.wealth)}
                    </td>

                    <td class="change-up">
                        +0%
                    </td>

                    <td class="change-up">
                        +0%
                    </td>

                    <td class="positive">
                        ● AKTYWNY
                    </td>

                </tr>
            `;

        })
        .join("");
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {

    const statCards =
        $all(".stat-card");

    if (!statCards.length) {
        return;
    }

    /*
       GRACZE
    */
    if (statCards[0]) {

        const value =
            statCards[0].querySelector(".stat-value");

        if (value) {
            value.textContent =
                formatNumber(players.length);
        }
    }

    /*
       ONLINE
       API nie zwraca obecnie statusu online,
       więc pokazujemy 0 zamiast wymyślonej wartości.
    */
    if (statCards[1]) {

        const value =
            statCards[1].querySelector(".stat-value");

        if (value) {
            const online = players.filter(
                player =>
                    player.status === true ||
                    player.status === "online" ||
                    player.status === "ONLINE"
            ).length;

            value.textContent =
                formatNumber(online);
        }
    }

    /*
       KLANY
    */
    if (statCards[2]) {

        const value =
            statCards[2].querySelector(".stat-value");

        if (value) {
            value.textContent =
                formatNumber(clans.length);
        }
    }

    /*
       MAJĄTEK
    */
    if (statCards[3]) {

        const value =
            statCards[3].querySelector(".stat-value");

        if (value) {

            const totalMoney =
                players.reduce(
                    (sum, player) =>
                        sum + (Number(player.money) || 0),
                    0
                );

            if (totalMoney >= 1000000) {

                value.textContent =
                    `${(totalMoney / 1000000)
                        .toFixed(1)
                        .replace(".", ",")}M$`;

            } else {

                value.textContent =
                    formatMoney(totalMoney);
            }
        }
    }
}


/* =========================================================
   CHART.JS LOADER
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

        script.onerror = () =>
            reject(
                new Error(
                    "Nie udało się załadować Chart.js"
                )
            );

        document.head.appendChild(script);
    });
}


/* =========================================================
   CHART DEFAULTS
   ========================================================= */

function chartDefaults() {

    if (!window.Chart) {
        return;
    }

    Chart.defaults.color =
        "#aaa5b5";

    Chart.defaults.font.family =
        "Inter, Arial, sans-serif";

    Chart.defaults.font.size =
        11;

    Chart.defaults.borderColor =
        "rgba(255,255,255,0.05)";
}


/* =========================================================
   ACTIVITY CHART
   ========================================================= */

function createActivityChart(canvasId) {

    const canvas =
        document.getElementById(canvasId);

    if (!canvas || !window.Chart) {
        return null;
    }

    const ctx =
        canvas.getContext("2d");

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            280
        );

    gradient.addColorStop(
        0,
        "rgba(155,92,255,0.35)"
    );

    gradient.addColorStop(
        1,
        "rgba(155,92,255,0.01)"
    );

    return new Chart(ctx, {

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
                    label: "Aktywni gracze",

                    data: [
                        Math.max(1, players.length - 5),
                        Math.max(1, players.length - 2),
                        players.length,
                        Math.max(1, players.length - 1),
                        players.length,
                        Math.max(1, players.length - 3),
                        players.length
                    ],

                    borderColor:
                        "#9b5cff",

                    backgroundColor:
                        gradient,

                    borderWidth: 2,

                    fill: true,

                    tension: 0.4,

                    pointRadius: 3,

                    pointHoverRadius: 6,

                    pointBackgroundColor:
                        "#b982ff",

                    pointBorderColor:
                        "#111018"
                }

            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    backgroundColor:
                        "#111018",

                    borderColor:
                        "rgba(155,92,255,0.3)",

                    borderWidth: 1,

                    titleColor: "#fff",

                    bodyColor: "#aaa5b5"
                }
            },

            scales: {

                x: {
                    grid: {
                        display: false
                    }
                },

                y: {

                    beginAtZero: true,

                    grid: {
                        color:
                            "rgba(255,255,255,0.045)"
                    },

                    ticks: {
                        precision: 0
                    }
                }
            }
        }

    });
}


/* =========================================================
   CLAN CHART
   ========================================================= */

function createClanChart() {

    const canvas =
        document.getElementById("clanChart");

    if (!canvas || !window.Chart) {
        return null;
    }

    const topClans =
        [...clans]
            .sort(
                (a, b) =>
                    b.wealth - a.wealth
            )
            .slice(0, 7);

    return new Chart(
        canvas.getContext("2d"),
        {

            type: "bar",

            data: {

                labels:
                    topClans.map(
                        clan => clan.name
                    ),

                datasets: [

                    {
                        label: "Majątek",

                        data:
                            topClans.map(
                                clan =>
                                    clan.wealth
                            ),

                        backgroundColor:
                            "rgba(155,92,255,0.65)",

                        borderColor:
                            "#9b5cff",

                        borderWidth: 1,

                        borderRadius: 7
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        backgroundColor:
                            "#111018",

                        borderColor:
                            "rgba(155,92,255,0.3)",

                        borderWidth: 1
                    }
                },

                scales: {

                    x: {
                        grid: {
                            display: false
                        }
                    },

                    y: {

                        beginAtZero: true,

                        grid: {
                            color:
                                "rgba(255,255,255,0.045)"
                        },

                        ticks: {
                            callback: value =>
                                formatMoney(value)
                        }
                    }
                }
            }
        }
    );
}


/* =========================================================
   CHARTS PAGE
   ========================================================= */

function createCharts() {

    if (!window.Chart) {
        return;
    }

    chartDefaults();

    /*
       Usuwamy stare wykresy
    */

    if (activityChart) {
        activityChart.destroy();
        activityChart = null;
    }

    if (clanChart) {
        clanChart.destroy();
        clanChart = null;
    }

    if (activityChart2) {
        activityChart2.destroy();
        activityChart2 = null;
    }

    if (wealthChart) {
        wealthChart.destroy();
        wealthChart = null;
    }

    /*
       Dashboard
    */

    activityChart =
        createActivityChart(
            "activityChart"
        );

    clanChart =
        createClanChart();


    /*
       Charts page — aktywność
    */

    activityChart2 =
        createActivityChart(
            "activityChart2"
        );


    /*
       Charts page — majątek
    */

    const wealthCanvas =
        document.getElementById(
            "wealthChart"
        );

    if (wealthCanvas) {

        const topClans =
            [...clans]
                .sort(
                    (a, b) =>
                        b.wealth - a.wealth
                )
                .slice(0, 10);

        wealthChart =
            new Chart(
                wealthCanvas.getContext("2d"),
                {

                    type: "bar",

                    data: {

                        labels:
                            topClans.map(
                                clan =>
                                    clan.name
                            ),

                        datasets: [

                            {
                                label: "Majątek",

                                data:
                                    topClans.map(
                                        clan =>
                                            clan.wealth
                                    ),

                                backgroundColor:
                                    "rgba(155,92,255,0.65)",

                                borderColor:
                                    "#9b5cff",

                                borderWidth: 1,

                                borderRadius: 7
                            }

                        ]
                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {
                                display: false
                            },

                            tooltip: {

                                backgroundColor:
                                    "#111018",

                                borderColor:
                                    "rgba(155,92,255,0.3)",

                                borderWidth: 1
                            }
                        },

                        scales: {

                            x: {
                                grid: {
                                    display: false
                                }
                            },

                            y: {

                                beginAtZero: true,

                                grid: {
                                    color:
                                        "rgba(255,255,255,0.045)"
                                },

                                ticks: {
                                    callback: value =>
                                        formatMoney(value)
                                }
                            }
                        }
                    }
                }
            );
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function openPage(pageId) {

    const pages =
        $all(".page");

    pages.forEach(page => {

        page.classList.toggle(
            "active",
            page.id === pageId
        );

    });

    const navItems =
        $all(".nav-item");

    navItems.forEach(item => {

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

    const title =
        $(".page-title h1");

    if (title) {
        title.textContent =
            titles[pageId] ||
            "EXODO STATS";
    }

    /*
       Po wejściu na Wykresy
       tworzymy wykresy ponownie.
    */

    if (pageId === "charts") {

        setTimeout(
            createCharts,
            50
        );
    }

    /*
       Zamknij mobile sidebar
    */

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


/* =========================================================
   NAV EVENTS
   ========================================================= */

function initNavigation() {

    $all(".nav-item")
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const page =
                        item.dataset.page;

                    if (page) {
                        openPage(page);
                    }
                }
            );

        });


    $all("[data-page-link]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.pageLink;

                    if (page) {
                        openPage(page);
                    }

                }
            );

        });
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function initMobileMenu() {

    const button =
        $("#mobileMenu");

    const sidebar =
        $("#sidebar");

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
   CLAN SEARCH
   ========================================================= */

function initClanSearch() {

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
                    clan =>
                        clan.name
                            .toLowerCase()
                            .includes(query)
                );

            renderClanTables(
                filtered
            );
        }
    );
}


/* =========================================================
   CLAN SORT
   ========================================================= */

function initClanSort() {

    const select =
        $("#clanSort");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {

            const value =
                select.value;

            const sorted =
                [...clans];

            if (value === "money") {

                sorted.sort(
                    (a, b) =>
                        b.wealth - a.wealth
                );

            } else if (value === "members") {

                sorted.sort(
                    (a, b) =>
                        b.members - a.members
                );

            } else if (value === "time") {

                sorted.sort(
                    (a, b) =>
                        b.activity - a.activity
                );
            }

            renderClanTables(
                sorted
            );
        }
    );
}


/* =========================================================
   PLAYER SEARCH
   ========================================================= */

function filterPlayers(query) {

    const normalized =
        query
            .trim()
            .toLowerCase();

    if (!normalized) {
        return players;
    }

    return players.filter(
        player => {

            return (
                player.name
                    .toLowerCase()
                    .includes(normalized)
                ||
                String(player.clan)
                    .toLowerCase()
                    .includes(normalized)
            );

        }
    );
}


function initPlayerSearch() {

    const input =
        $("#playerSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            const filtered =
                filterPlayers(
                    input.value
                );

            const table =
                $("#allPlayersTable");

            if (table) {

                table.innerHTML =
                    filtered
                        .map(playerRow)
                        .join("");
            }

        }
    );
}


/* =========================================================
   PLAYER SORT
   ========================================================= */

function initPlayerSort() {

    const select =
        $("#playerSort");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        () => {

            const sorted =
                [...players];

            switch (select.value) {

                case "money":

                    sorted.sort(
                        (a, b) =>
                            b.money - a.money
                    );

                    break;

                case "level":

                    sorted.sort(
                        (a, b) =>
                            b.level - a.level
                    );

                    break;

                case "time":

                    sorted.sort(
                        (a, b) =>
                            String(
                                b.lastSeen ||
                                b.playtime ||
                                ""
                            ).localeCompare(
                                String(
                                    a.lastSeen ||
                                    a.playtime ||
                                    ""
                                )
                            )
                    );

                    break;
            }

            const table =
                $("#allPlayersTable");

            if (table) {

                table.innerHTML =
                    sorted
                        .map(playerRow)
                        .join("");
            }

        }
    );
}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function performGlobalSearch(query) {

    const normalized =
        String(query || "")
            .trim()
            .toLowerCase();

    if (!normalized) {
        return [];
    }

    const playerResults =
        players
            .filter(player =>
                player.name
                    .toLowerCase()
                    .includes(normalized)
                ||
                String(player.clan)
                    .toLowerCase()
                    .includes(normalized)
            )
            .map(player => ({
                type: "player",
                name: player.name,
                subtitle:
                    player.clan
                        ? `Klan: ${player.clan}`
                        : "Gracz",
                url: player.sourceUrl
            }));

    const clanResults =
        clans
            .filter(clan =>
                clan.name
                    .toLowerCase()
                    .includes(normalized)
            )
            .map(clan => ({
                type: "clan",
                name: clan.name,
                subtitle:
                    `${clan.members} członków`,
                url: null
            }));

    return [
        ...playerResults,
        ...clanResults
    ].slice(0, 20);
}


/* =========================================================
   SEARCH RESULTS
   ========================================================= */

function renderSearchResults(query) {

    const container =
        $("#searchResults");

    if (!container) {
        return;
    }

    const results =
        performGlobalSearch(query);

    if (!query.trim()) {

        container.innerHTML = `
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

    if (!results.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Brak wyników
                </h3>

                <p>
                    Nie znaleziono gracza
                    ani klanu.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        results.map(result => {

            const link =
                result.url
                    ? `
                        <a
                            href="${escapeHTML(result.url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn"
                        >
                            Otwórz
                        </a>
                    `
                    : "";

            return `
                <div class="result-card">

                    <div>

                        <strong>
                            ${escapeHTML(result.name)}
                        </strong>

                        <small>
                            ${escapeHTML(result.subtitle)}
                        </small>

                    </div>

                    ${link}

                </div>
            `;

        }).join("");
}


function initGlobalSearch() {

    const topSearch =
        $("#globalSearch");

    const pageSearch =
        $("#globalSearchPage");


    if (topSearch) {

        topSearch.addEventListener(
            "keydown",
            event => {

                if (event.key !== "Enter") {
                    return;
                }

                const query =
                    topSearch.value;

                openPage("search");

                if (pageSearch) {
                    pageSearch.value =
                        query;
                }

                renderSearchResults(
                    query
                );
            }
        );

    }


    if (pageSearch) {

        pageSearch.addEventListener(
            "input",
            () => {

                renderSearchResults(
                    pageSearch.value
                );

            }
        );

    }
}


/* =========================================================
   REFRESH
   ========================================================= */

async function refreshData(
    showToastMessage = true
) {

    const button =
        $("#refreshButton");

    if (button) {

        button.disabled = true;

        button.textContent =
            "↻ Ładowanie...";
    }

    try {

        await fetchPlayers();

        buildClans();

        renderAllPlayers();

        renderRichPlayers();

        renderLevelRanking();

        renderMoneyRanking();

        renderClanTables();

        renderMarket();

        updateDashboardStats();

        /*
           Wykresy odświeżamy,
           jeżeli Chart.js jest już załadowany.
        */

        if (window.Chart) {
            createCharts();
        }

        if (showToastMessage) {
            showToast(
                "✓ Statystyki zostały odświeżone"
            );
        }

    } catch (error) {

        console.error(
            "Refresh error:",
            error
        );

        showToast(
            "⚠ Nie udało się odświeżyć danych"
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
   TOAST
   ========================================================= */

let toastTimer = null;

function showToast(message) {

    const toast =
        $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
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
   REFRESH BUTTON
   ========================================================= */

function initRefresh() {

    const button =
        $("#refreshButton");

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


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function init() {

    console.log(
        "EXODO STATS — start"
    );

    /*
       Eventy
    */

    initNavigation();

    initMobileMenu();

    initClanSearch();

    initClanSort();

    initPlayerSearch();

    initPlayerSort();

    initGlobalSearch();

    initRefresh();


    /*
       Pobieramy API
    */

    await refreshData(false);


    /*
       Chart.js
    */

    try {

        await loadChartJS();

        createCharts();

    } catch (error) {

        console.warn(
            "Chart.js:",
            error
        );
    }


    console.log(
        "EXODO STATS — gotowe",
        players
    );
}


/* =========================================================
   START
   ========================================================= */

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
