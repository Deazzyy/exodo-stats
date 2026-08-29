/* =========================================================
   EXODO STATS
   script.js
   API: Hodowla RP
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev/api/recent?limit=20";

const API_BASE =
    "https://exodo-api.oliwierdawidowicz.workers.dev";

const SERVER_URL =
    "https://hodowlarp.pl";


/* =========================================================
   STATE
   ========================================================= */

let players = [];
let clans = [];

let activityChart = null;
let activityChart2 = null;
let clanChart = null;
let wealthChart = null;


/* =========================================================
   DOM
   ========================================================= */

const sidebar = document.getElementById("sidebar");
const mobileMenu = document.getElementById("mobileMenu");

const refreshButton = document.getElementById("refreshButton");

const globalSearch = document.getElementById("globalSearch");
const globalSearchPage = document.getElementById("globalSearchPage");

const clanSearch = document.getElementById("clanSearch");
const playerSearch = document.getElementById("playerSearch");

const clanSort = document.getElementById("clanSort");
const playerSort = document.getElementById("playerSort");

const toast = document.getElementById("toast");


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatMoney(value) {
    const number = Number(value) || 0;

    return (
        new Intl.NumberFormat("pl-PL")
            .format(number)
            .replace(/\u00A0/g, " ")
        + "$"
    );
}


function formatNumber(value) {
    return new Intl.NumberFormat("pl-PL")
        .format(Number(value) || 0)
        .replace(/\u00A0/g, " ");
}


function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


function showToast(message = "✓ Statystyki zostały odświeżone") {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


function getPlayerURL(player) {
    if (player && player.sourceUrl) {
        return player.sourceUrl;
    }

    if (player && player.name) {
        return `${SERVER_URL}/gracz/${encodeURIComponent(player.name)}`;
    }

    return "#";
}


function getPlayerLevel(player) {
    const level = Number(player?.level);

    if (!Number.isFinite(level)) {
        return 0;
    }

    return level;
}


function getPlayerMoney(player) {
    const money = Number(player?.money);

    if (!Number.isFinite(money)) {
        return 0;
    }

    return money;
}


function getPlaytime(player) {
    if (!player?.playtime) {
        return "—";
    }

    const value = String(player.playtime).trim();

    if (!value) {
        return "—";
    }

    return value;
}


function getClanName(player) {
    if (!player?.clan) {
        return "";
    }

    return String(player.clan).trim();
}


function getRank(player) {
    if (!player?.rank) {
        return "";
    }

    return String(player.rank).trim();
}


/* =========================================================
   PARSE CLAN FROM PLAYTIME
   ---------------------------------------------------------
   API currently sometimes returns clan information inside
   strings such as:

   #1 BlockSkY_ [ HASA ] 3 dni
   # 2 Alta_zio [ Sakai ] 3 dni
   # 3 Czaro323 [ KWE ] 3 dni
   ========================================================= */

function extractClanFromPlaytime(playtime) {
    if (!playtime) {
        return "";
    }

    const text = String(playtime);

    const match = text.match(/\[\s*([^\]]+)\s*\]/);

    if (!match) {
        return "";
    }

    return match[1].trim();
}


/* =========================================================
   EXTRACT PLAYTIME NUMBER
   ========================================================= */

function extractDaysFromPlaytime(playtime) {
    if (!playtime) {
        return 0;
    }

    const text = String(playtime);

    const daysMatch = text.match(/(\d+)\s*dni?/i);

    if (daysMatch) {
        return Number(daysMatch[1]) || 0;
    }

    return 0;
}


/* =========================================================
   FETCH API
   ========================================================= */

async function fetchPlayers() {
    try {
        const response = await fetch(API_URL, {
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

        if (!data || !Array.isArray(data.players)) {
            throw new Error(
                "API nie zwróciło tablicy players."
            );
        }

        players = data.players.map((player) => ({
            ...player,

            name: String(player.name || "Unknown"),

            level: getPlayerLevel(player),

            money: getPlayerMoney(player),

            playtime: player.playtime || "",

            clan:
                getClanName(player) ||
                extractClanFromPlaytime(player.playtime),

            rank: getRank(player),

            sourceUrl:
                player.sourceUrl ||
                `${SERVER_URL}/gracz/${encodeURIComponent(
                    player.name || ""
                )}`
        }));

        buildClans();

        renderEverything();

        return true;

    } catch (error) {
        console.error(
            "EXODO API ERROR:",
            error
        );

        showToast(
            "⚠ Nie udało się pobrać danych API"
        );

        renderAPIError();

        return false;
    }
}


/* =========================================================
   BUILD CLANS
   ========================================================= */

function buildClans() {
    const clanMap = new Map();

    players.forEach((player) => {

        const clanName =
            getClanName(player) ||
            extractClanFromPlaytime(player.playtime);

        if (!clanName) {
            return;
        }

        const key = normalizeText(clanName);

        if (!clanMap.has(key)) {
            clanMap.set(key, {
                name: clanName,
                tag: clanName,
                leader: "—",
                members: 0,
                money: 0,
                activity: 0,
                players: []
            });
        }

        const clan = clanMap.get(key);

        clan.members++;

        clan.money += getPlayerMoney(player);

        clan.activity +=
            extractDaysFromPlaytime(player.playtime);

        clan.players.push(player);

        const rank = normalizeText(player.rank);

        if (
            rank.includes("lider") ||
            rank.includes("leader")
        ) {
            clan.leader = player.name;
        }
    });

    clans = Array.from(clanMap.values());

    clans.sort((a, b) => {
        return b.money - a.money;
    });
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    updateStats();

    renderRichPlayers();

    renderAllPlayers();

    renderClans();

    renderAllClans();

    renderLevelRanking();

    renderMoneyRanking();

    renderMarket();

    renderCharts();

    setupSearch();

}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateStats() {

    const playerCountElement =
        document.querySelector(
            "#dashboard .stats-grid .stat-card:nth-child(1) .stat-value"
        );

    const clanCountElement =
        document.querySelector(
            "#dashboard .stats-grid .stat-card:nth-child(3) .stat-value"
        );

    const wealthElement =
        document.querySelector(
            "#dashboard .stats-grid .stat-card:nth-child(4) .stat-value"
        );

    const onlineElement =
        document.getElementById("onlinePlayers");


    if (playerCountElement) {
        playerCountElement.textContent =
            formatNumber(players.length);
    }


    if (clanCountElement) {
        clanCountElement.textContent =
            formatNumber(clans.length);
    }


    if (wealthElement) {

        const totalMoney = players.reduce(
            (sum, player) =>
                sum + getPlayerMoney(player),
            0
        );

        wealthElement.textContent =
            formatCompactMoney(totalMoney);
    }


    if (onlineElement) {

        const onlinePlayers =
            players.filter(
                isPlayerOnline
            ).length;

        onlineElement.textContent =
            formatNumber(onlinePlayers);
    }
}


/* =========================================================
   COMPACT MONEY
   ========================================================= */

function formatCompactMoney(value) {

    const number = Number(value) || 0;

    if (number >= 1000000000) {
        return (
            (number / 1000000000)
                .toFixed(1)
                .replace(".", ",")
            + "B$"
        );
    }

    if (number >= 1000000) {
        return (
            (number / 1000000)
                .toFixed(1)
                .replace(".", ",")
            + "M$"
        );
    }

    if (number >= 1000) {
        return (
            (number / 1000)
                .toFixed(1)
                .replace(".", ",")
            + "K$"
        );
    }

    return formatMoney(number);
}


/* =========================================================
   ONLINE DETECTION
   ========================================================= */

function isPlayerOnline(player) {

    const text =
        normalizeText(player?.playtime);

    if (!text) {
        return false;
    }

    return (
        text.includes("teraz gra") ||
        text.includes("online") ||
        text.includes("gra na serwerze")
    );
}


/* =========================================================
   PLAYER STATUS
   ========================================================= */

function playerStatusHTML(player) {

    if (isPlayerOnline(player)) {
        return `
            <span class="positive">
                ● ONLINE
            </span>
        `;
    }

    /*
       API nie zwraca obecnie prawdziwego statusu.
       Dlatego nie udajemy, że gracz jest offline.
    */

    return `
        <span>
            ● DANE API
        </span>
    `;
}


/* =========================================================
   PLAYER LINK
   ========================================================= */

function playerLinkHTML(player) {

    const name =
        escapeHTML(player.name);

    const url =
        escapeHTML(getPlayerURL(player));

    return `
        <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
            class="player-name"
            style="text-decoration:none;"
        >
            ${name}
        </a>
    `;
}


/* =========================================================
   PLAYER CLAN HTML
   ========================================================= */

function playerClanHTML(player) {

    const clan =
        getClanName(player) ||
        extractClanFromPlaytime(player.playtime);

    if (!clan) {
        return "—";
    }

    return `
        <span class="clan-tag">
            ${escapeHTML(clan)}
        </span>
    `;
}


/* =========================================================
   PLAYER ACTIVITY
   ========================================================= */

function playerActivityHTML(player) {

    const activity =
        getPlaytime(player);

    if (activity === "—") {
        return "—";
    }

    return escapeHTML(activity);
}


/* =========================================================
   ALL PLAYERS TABLE
   ========================================================= */

function renderAllPlayers(
    data = players
) {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (!table) return;


    if (!data.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Brak graczy</h3>
                        <p>
                            Nie znaleziono żadnych graczy.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        data.map((player, index) => {

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        ${playerLinkHTML(player)}
                    </td>

                    <td>
                        <strong>
                            ${getPlayerLevel(player)}
                        </strong>
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            getPlayerMoney(player)
                        )}
                    </td>

                    <td>
                        ${playerClanHTML(player)}
                    </td>

                    <td>
                        ${playerActivityHTML(player)}
                    </td>

                    <td>
                        ${playerStatusHTML(player)}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {

    const table =
        document.getElementById(
            "richPlayersTable"
        );

    if (!table) return;


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    getPlayerMoney(b) -
                    getPlayerMoney(a)
            )
            .slice(0, 10);


    table.innerHTML =
        sorted.map((player, index) => {

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        ${playerLinkHTML(player)}
                    </td>

                    <td>
                        ${getPlayerLevel(player)}
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            getPlayerMoney(player)
                        )}
                    </td>

                    <td>
                        ${playerClanHTML(player)}
                    </td>

                    <td>
                        ${playerActivityHTML(player)}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   CLAN TABLE
   ========================================================= */

function renderClans(
    data = clans
) {

    const table =
        document.getElementById(
            "clanTable"
        );

    if (!table) return;


    const topClans =
        data.slice(0, 10);


    if (!topClans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>♛</div>
                        <h3>Brak danych o klanach</h3>
                        <p>
                            API nie zwróciło informacji o klanach.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        topClans.map((clan, index) => {

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="clan-tag">
                            ${escapeHTML(
                                clan.tag
                            )}
                        </span>

                        <span
                            class="clan-name"
                            style="margin-left:8px;"
                        >
                            ${escapeHTML(
                                clan.name
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            clan.leader
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            clan.members
                        )}
                    </td>

                    <td>
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
                        ${clan.activity > 0
                            ? `${clan.activity} dni`
                            : "—"
                        }
                    </td>

                    <td class="change-none">
                        —
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   ALL CLANS
   ========================================================= */

function renderAllClans(
    data = clans
) {

    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) return;


    if (!data.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>♛</div>
                        <h3>Brak klanów</h3>
                        <p>
                            API nie zwróciło danych o klanach.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        data.map((clan, index) => {

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>

                        <span class="clan-tag">
                            ${escapeHTML(
                                clan.tag
                            )}
                        </span>

                        <span
                            class="clan-name"
                            style="margin-left:8px;"
                        >
                            ${escapeHTML(
                                clan.name
                            )}
                        </span>

                    </td>

                    <td>
                        ${escapeHTML(
                            clan.leader
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            clan.members
                        )}
                    </td>

                    <td>
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
                        ${clan.activity > 0
                            ? `${clan.activity} dni`
                            : "—"
                        }
                    </td>

                    <td class="change-none">
                        —
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   LEVEL RANKING
   ========================================================= */

function renderLevelRanking() {

    const containers = [
        document.getElementById(
            "levelRanking"
        ),
        document.getElementById(
            "levelRanking2"
        )
    ];


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    getPlayerLevel(b) -
                    getPlayerLevel(a)
            )
            .slice(0, 10);


    containers.forEach((container) => {

        if (!container) return;


        if (!sorted.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div>★</div>
                    <h3>Brak danych</h3>
                    <p>
                        Nie znaleziono graczy.
                    </p>
                </div>
            `;

            return;
        }


        const maxLevel =
            Math.max(
                ...sorted.map(
                    getPlayerLevel
                ),
                1
            );


        container.innerHTML =
            sorted.map((player, index) => {

                const level =
                    getPlayerLevel(player);

                const percent =
                    Math.max(
                        3,
                        Math.round(
                            (level / maxLevel) * 100
                        )
                    );


                return `
                    <div class="ranking-row">

                        <div class="ranking-number">
                            ${index + 1}
                        </div>

                        <div class="ranking-name">
                            ${escapeHTML(
                                player.name
                            )}
                        </div>

                        <div class="ranking-bar">
                            <span
                                style="width:${percent}%"
                            ></span>
                        </div>

                        <div class="ranking-value">
                            ${level} lvl
                        </div>

                    </div>
                `;

            }).join("");

    });
}


/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {

    const container =
        document.getElementById(
            "moneyRanking"
        );

    if (!container) return;


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    getPlayerMoney(b) -
                    getPlayerMoney(a)
            )
            .slice(0, 10);


    if (!sorted.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div>$</div>
                <h3>Brak danych</h3>
                <p>
                    Nie znaleziono graczy.
                </p>
            </div>
        `;

        return;
    }


    const maxMoney =
        Math.max(
            ...sorted.map(
                getPlayerMoney
            ),
            1
        );


    container.innerHTML =
        sorted.map((player, index) => {

            const money =
                getPlayerMoney(player);


            const percent =
                money > 0
                    ? Math.max(
                        3,
                        Math.round(
                            (money / maxMoney) * 100
                        )
                    )
                    : 3;


            return `
                <div class="ranking-row">

                    <div class="ranking-number">
                        ${index + 1}
                    </div>

                    <div class="ranking-name">
                        ${escapeHTML(
                            player.name
                        )}
                    </div>

                    <div class="ranking-bar">
                        <span
                            style="width:${percent}%"
                        ></span>
                    </div>

                    <div class="ranking-value">
                        ${formatCompactMoney(
                            money
                        )}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const table =
        document.getElementById(
            "marketTable"
        );

    if (!table) return;


    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>◆</div>
                        <h3>Brak danych rynku</h3>
                        <p>
                            API nie udostępnia obecnie historii rynku.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        clans.map((clan) => {

            return `
                <tr>

                    <td>
                        <span class="clan-tag">
                            ${escapeHTML(
                                clan.tag
                            )}
                        </span>

                        <span
                            class="clan-name"
                            style="margin-left:8px;"
                        >
                            ${escapeHTML(
                                clan.name
                            )}
                        </span>
                    </td>

                    <td>
                        ${formatMoney(
                            clan.money
                        )}
                    </td>

                    <td class="change-none">
                        —
                    </td>

                    <td class="change-none">
                        —
                    </td>

                    <td>
                        <span class="change-none">
                            ● DANE API
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   CHARTS
   ========================================================= */

function renderCharts() {

    if (
        typeof Chart ===
        "undefined"
    ) {
        console.warn(
            "Chart.js nie jest załadowany."
        );

        return;
    }


    renderActivityChart(
        "activityChart"
    );

    renderActivityChart(
        "activityChart2"
    );

    renderClanChart();

    renderWealthChart();
}


/* =========================================================
   ACTIVITY CHART
   ========================================================= */

function renderActivityChart(
    canvasId
) {

    const canvas =
        document.getElementById(
            canvasId
        );

    if (!canvas) return;


    const ctx =
        canvas.getContext("2d");


    if (
        canvasId === "activityChart" &&
        activityChart
    ) {
        activityChart.destroy();
    }


    if (
        canvasId === "activityChart2" &&
        activityChart2
    ) {
        activityChart2.destroy();
    }


    /*
       API /recent nie posiada prawdziwej
       historii 7 dni.

       Dlatego wykres pokazuje dane,
       które rzeczywiście mamy:
       aktywność graczy na podstawie
       informacji zwróconych przez API.
    */

    const activityPlayers =
        players
            .map((player) => ({
                name: player.name,
                activity:
                    extractDaysFromPlaytime(
                        player.playtime
                    )
            }))
            .sort(
                (a, b) =>
                    b.activity -
                    a.activity
            )
            .slice(0, 7);


    const labels =
        activityPlayers.length
            ? activityPlayers.map(
                p => p.name
            )
            : [
                "Brak danych"
            ];


    const values =
        activityPlayers.length
            ? activityPlayers.map(
                p => p.activity
            )
            : [0];


    const chart =
        new Chart(ctx, {

            type: "line",

            data: {

                labels,

                datasets: [

                    {
                        label:
                            "Aktywność",

                        data:
                            values,

                        borderColor:
                            "#9b5cff",

                        backgroundColor:
                            "rgba(155,92,255,0.10)",

                        borderWidth: 2,

                        fill: true,

                        tension: 0.4,

                        pointRadius: 3,

                        pointHoverRadius: 5
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


    if (
        canvasId === "activityChart"
    ) {
        activityChart = chart;
    } else {
        activityChart2 = chart;
    }
}


/* =========================================================
   CLAN CHART
   ========================================================= */

function renderClanChart() {

    const canvas =
        document.getElementById(
            "clanChart"
        );

    if (!canvas) return;


    if (clanChart) {
        clanChart.destroy();
    }


    const ctx =
        canvas.getContext("2d");


    const topClans =
        [...clans]
            .sort(
                (a, b) =>
                    b.money -
                    a.money
            )
            .slice(0, 7);


    const labels =
        topClans.length
            ? topClans.map(
                clan => clan.name
            )
            : ["Brak danych"];


    const values =
        topClans.length
            ? topClans.map(
                clan => clan.money
            )
            : [0];


    clanChart =
        new Chart(ctx, {

            type: "bar",

            data: {

                labels,

                datasets: [

                    {
                        label:
                            "Majątek",

                        data:
                            values,

                        backgroundColor:
                            "rgba(155,92,255,0.65)",

                        borderRadius: 8,

                        borderSkipped: false
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
                                    return formatCompactMoney(
                                        value
                                    );
                                }
                        }

                    }

                }

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

    if (!canvas) return;


    if (wealthChart) {
        wealthChart.destroy();
    }


    const ctx =
        canvas.getContext("2d");


    const topPlayers =
        [...players]
            .sort(
                (a, b) =>
                    getPlayerMoney(b) -
                    getPlayerMoney(a)
            )
            .slice(0, 10);


    const labels =
        topPlayers.length
            ? topPlayers.map(
                player => player.name
            )
            : ["Brak danych"];


    const values =
        topPlayers.length
            ? topPlayers.map(
                getPlayerMoney
            )
            : [0];


    wealthChart =
        new Chart(ctx, {

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
                            "rgba(155,92,255,0.65)",

                        borderRadius: 8,

                        borderSkipped: false
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
                                    return formatCompactMoney(
                                        value
                                    );
                                }

                        }

                    }

                }

            }

        });
}


/* =========================================================
   API ERROR
   ========================================================= */

function renderAPIError() {

    const tables = [
        "allPlayersTable",
        "richPlayersTable",
        "clanTable",
        "allClansTable",
        "marketTable"
    ];


    tables.forEach((id) => {

        const table =
            document.getElementById(id);

        if (!table) return;


        const colspan =
            id === "allPlayersTable"
                ? 7
                : id === "marketTable"
                    ? 5
                    : 8;


        table.innerHTML = `
            <tr>
                <td colspan="${colspan}">
                    <div class="empty-state">

                        <div>⚠</div>

                        <h3>
                            Nie udało się pobrać danych
                        </h3>

                        <p>
                            Sprawdź połączenie z EXODO API.
                        </p>

                    </div>
                </td>
            </tr>
        `;

    });
}


/* =========================================================
   SEARCH — PLAYER
   ========================================================= */

function searchPlayers(query) {

    const value =
        normalizeText(query);

    if (!value) {
        renderAllPlayers(players);
        return;
    }


    const results =
        players.filter((player) => {

            const name =
                normalizeText(
                    player.name
                );

            const clan =
                normalizeText(
                    getClanName(player)
                );

            return (
                name.includes(value) ||
                clan.includes(value)
            );
        });


    renderAllPlayers(results);
}


/* =========================================================
   SEARCH — CLAN
   ========================================================= */

function searchClans(query) {

    const value =
        normalizeText(query);

    if (!value) {
        renderAllClans(clans);
        return;
    }


    const results =
        clans.filter((clan) => {

            return (
                normalizeText(
                    clan.name
                ).includes(value) ||
                normalizeText(
                    clan.tag
                ).includes(value)
            );

        });


    renderAllClans(results);
}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function performGlobalSearch(query) {

    const value =
        normalizeText(query);


    if (!value) {
        return;
    }


    const playerResults =
        players.filter((player) => {

            return normalizeText(
                player.name
            ).includes(value);

        });


    const clanResults =
        clans.filter((clan) => {

            return normalizeText(
                clan.name
            ).includes(value) ||
            normalizeText(
                clan.tag
            ).includes(value);

        });


    showSearchResults(
        playerResults,
        clanResults
    );
}


/* =========================================================
   SEARCH RESULTS
   ========================================================= */

function showSearchResults(
    playerResults,
    clanResults
) {

    const container =
        document.getElementById(
            "searchResults"
        );

    if (!container) return;


    if (
        !playerResults.length &&
        !clanResults.length
    ) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Brak wyników
                </h3>

                <p>
                    Nie znaleziono gracza ani klanu.
                </p>

            </div>
        `;

        return;
    }


    let html = "";


    playerResults
        .slice(0, 10)
        .forEach((player) => {

            html += `
                <a
                    href="${escapeHTML(
                        getPlayerURL(player)
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
                                player.name
                            )}
                        </strong>

                        <small>
                            Gracz ·
                            ${getPlayerLevel(player)} lvl
                            ·
                            ${formatMoney(
                                getPlayerMoney(player)
                            )}
                        </small>

                    </div>

                    <span class="clan-tag">
                        GRACZ
                    </span>

                </a>
            `;

        });


    clanResults
        .slice(0, 10)
        .forEach((clan) => {

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
                            ${formatNumber(
                                clan.members
                            )} członków
                            ·
                            ${formatMoney(
                                clan.money
                            )}
                        </small>

                    </div>

                    <span class="clan-tag">
                        KLAN
                    </span>

                </div>
            `;

        });


    container.innerHTML = html;
}


/* =========================================================
   SETUP SEARCH
   ========================================================= */

function setupSearch() {

    if (globalSearch) {

        globalSearch.oninput =
            function() {

                const value =
                    this.value.trim();

                if (!value) {
                    return;
                }

                performGlobalSearch(
                    value
                );
            };


        globalSearch.onkeydown =
            function(event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    const value =
                        this.value.trim();

                    if (!value) return;

                    openPage("search");

                    if (
                        globalSearchPage
                    ) {
                        globalSearchPage.value =
                            value;
                    }

                    performGlobalSearch(
                        value
                    );
                }

            };
    }


    if (globalSearchPage) {

        globalSearchPage.oninput =
            function() {

                performGlobalSearch(
                    this.value
                );

            };

    }


    if (clanSearch) {

        clanSearch.oninput =
            function() {

                searchClans(
                    this.value
                );

            };

    }


    if (playerSearch) {

        playerSearch.oninput =
            function() {

                searchPlayers(
                    this.value
                );

            };

    }
}


/* =========================================================
   SORT PLAYERS
   ========================================================= */

function setupPlayerSort() {

    if (!playerSort) return;


    playerSort.addEventListener(
        "change",
        function() {

            const value =
                this.value;


            let sorted =
                [...players];


            if (value === "money") {

                sorted.sort(
                    (a, b) =>
                        getPlayerMoney(b) -
                        getPlayerMoney(a)
                );

            }


            if (value === "level") {

                sorted.sort(
                    (a, b) =>
                        getPlayerLevel(b) -
                        getPlayerLevel(a)
                );

            }


            if (value === "time") {

                sorted.sort(
                    (a, b) =>
                        extractDaysFromPlaytime(
                            b.playtime
                        ) -
                        extractDaysFromPlaytime(
                            a.playtime
                        )
                );

            }


            renderAllPlayers(
                sorted
            );

        }
    );
}


/* =========================================================
   SORT CLANS
   ========================================================= */

function setupClanSort() {

    if (!clanSort) return;


    clanSort.addEventListener(
        "change",
        function() {

            const value =
                this.value;


            let sorted =
                [...clans];


            if (value === "money") {

                sorted.sort(
                    (a, b) =>
                        b.money -
                        a.money
                );

            }


            if (value === "members") {

                sorted.sort(
                    (a, b) =>
                        b.members -
                        a.members
                );

            }


            if (value === "time") {

                sorted.sort(
                    (a, b) =>
                        b.activity -
                        a.activity
                );

            }


            renderAllClans(
                sorted
            );

        }
    );
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function openPage(pageName) {

    const pages =
        document.querySelectorAll(
            ".page"
        );

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    pages.forEach((page) => {

        page.classList.toggle(
            "active",
            page.id === pageName
        );

    });


    navItems.forEach((item) => {

        item.classList.toggle(
            "active",
            item.dataset.page ===
                pageName
        );

    });


    updatePageTitle(
        pageName
    );


    if (
        window.innerWidth <= 760 &&
        sidebar
    ) {
        sidebar.classList.remove(
            "open"
        );
    }


    /*
       Chart.js czasami potrzebuje
       resize po pokazaniu ukrytej sekcji.
    */

    setTimeout(() => {

        if (activityChart) {
            activityChart.resize();
        }

        if (activityChart2) {
            activityChart2.resize();
        }

        if (clanChart) {
            clanChart.resize();
        }

        if (wealthChart) {
            wealthChart.resize();
        }

    }, 100);
}


/* =========================================================
   PAGE TITLE
   ========================================================= */

function updatePageTitle(
    pageName
) {

    const title =
        document.querySelector(
            ".page-title h1"
        );

    const subtitle =
        document.querySelector(
            ".page-title p"
        );


    const pages = {

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
            "Wizualizacja statystyk"
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
        pages[pageName] ||
        pages.dashboard;


    if (title) {
        title.textContent =
            data[0];
    }


    if (subtitle) {
        subtitle.textContent =
            data[1];
    }
}


/* =========================================================
   NAVIGATION EVENTS
   ========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            function() {

                const page =
                    this.dataset.page;

                if (!page) return;

                openPage(page);

            }
        );

    });


    const pageLinks =
        document.querySelectorAll(
            "[data-page-link]"
        );


    pageLinks.forEach((button) => {

        button.addEventListener(
            "click",
            function() {

                const page =
                    this.dataset.pageLink;

                if (!page) return;

                openPage(page);

            }
        );

    });
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    if (!mobileMenu) return;


    mobileMenu.addEventListener(
        "click",
        function() {

            if (!sidebar) return;

            sidebar.classList.toggle(
                "open"
            );

        }
    );
}


/* =========================================================
   REFRESH
   ========================================================= */

async function refreshData() {

    if (!refreshButton) {
        await fetchPlayers();
        return;
    }


    refreshButton.disabled =
        true;

    refreshButton.textContent =
        "↻ Ładowanie...";


    const success =
        await fetchPlayers();


    refreshButton.disabled =
        false;

    refreshButton.textContent =
        "↻ Odśwież";


    if (success) {

        showToast(
            "✓ Dane zostały odświeżone"
        );

    }
}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setupRefresh() {

    if (!refreshButton) return;


    refreshButton.addEventListener(
        "click",
        refreshData
    );
}


/* =========================================================
   AUTO REFRESH
   ========================================================= */

function setupAutoRefresh() {

    /*
       Odświeżenie co 60 sekund.
    */

    setInterval(
        async () => {

            try {

                await fetchPlayers();

            } catch (error) {

                console.error(
                    "Auto refresh error:",
                    error
                );

            }

        },
        60000
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function init() {

    console.log(
        "EXODO STATS — uruchamianie..."
    );


    setupNavigation();

    setupMobileMenu();

    setupRefresh();

    setupPlayerSort();

    setupClanSort();

    setupSearch();


    /*
       Pobierz dane z API.
    */

    await fetchPlayers();


    /*
       Auto-refresh co minutę.
    */

    setupAutoRefresh();


    console.log(
        "EXODO STATS — gotowe."
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
