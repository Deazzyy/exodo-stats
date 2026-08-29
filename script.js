/* =========================================================
   EXODO STATS — SCRIPT.JS
   API + DASHBOARD + PLAYERS + CLANS + SEARCH + CHARTS
   ========================================================= */

"use strict";

/* =========================================================
   KONFIGURACJA
   ========================================================= */

const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

const API_ENDPOINTS = {
    recent: `${API_BASE}/api/recent?limit=100`,
    health: `${API_BASE}/api/health`
};

/* =========================================================
   DANE AWARYJNE
   Używane, jeżeli API chwilowo nie zwróci danych.
   ========================================================= */

const FALLBACK_PLAYERS = [
    {
        name: "Deazzyy",
        level: 1,
        money: 1600000,
        clan: null,
        activity: "—",
        online: false
    },
    {
        name: "BuziaszeQ_",
        level: 2,
        money: 0,
        clan: null,
        activity: "—",
        online: false
    },
    {
        name: "mis23",
        level: 3,
        money: 0,
        clan: null,
        activity: "—",
        online: false
    },
    {
        name: "Spoc0ny_Kacperek",
        level: 4,
        money: 0,
        clan: null,
        activity: "—",
        online: false
    },
    {
        name: "PitaPaka02",
        level: 5,
        money: 0,
        clan: null,
        activity: "—",
        online: false
    },
    {
        name: "Podatek___",
        level: 1,
        money: 0,
        clan: null,
        activity: "Teraz Gra na serwerze",
        online: true
    },
    {
        name: "MINICIPIO",
        level: 46,
        money: 0,
        clan: null,
        activity: "Teraz Gra na serwerze",
        online: true
    },
    {
        name: "anomiczny",
        level: 3,
        money: 0,
        clan: "347",
        activity: "2 dni temu",
        online: false
    },
    {
        name: "IvanMigomagowy",
        level: 4,
        money: 0,
        clan: "exo",
        activity: "Teraz Gra na serwerze",
        online: true
    },
    {
        name: "MaxerlQ",
        level: 5,
        money: 0,
        clan: "DINO",
        activity: "4 godziny temu",
        online: false
    },
    {
        name: "BlockSkY_",
        level: 1,
        money: 0,
        clan: "HASA",
        activity: "3 dni temu",
        online: false
    },
    {
        name: "Alta_zio",
        level: 2,
        money: 0,
        clan: "Sakai",
        activity: "3 dni temu",
        online: false
    },
    {
        name: "Czaro323",
        level: 3,
        money: 0,
        clan: "KWE",
        activity: "3 dni temu",
        online: false
    },
    {
        name: "Beznes",
        level: 4,
        money: 0,
        clan: "PPPB",
        activity: "3 dni temu",
        online: false
    },
    {
        name: "V4N11SH",
        level: 5,
        money: 0,
        clan: "KWE",
        activity: "3 dni temu",
        online: false
    },
    {
        name: "Buzia",
        level: 0,
        money: 0,
        clan: null,
        activity: "—",
        online: false
    }
];

/* =========================================================
   STAN APLIKACJI
   ========================================================= */

let players = [...FALLBACK_PLAYERS];
let clans = [];
let apiOnline = false;

let charts = {
    activity: null,
    clan: null,
    activity2: null,
    wealth: null
};

/* =========================================================
   HELPERY
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

function normalizeName(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
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

function playerURL(name) {
    return `https://hodowlarp.pl/gracz/${encodeURIComponent(name)}`;
}

function clanHTML(clan) {
    if (!clan) {
        return "—";
    }

    return `
        <span class="clan-tag">
            ${escapeHTML(clan)}
        </span>
    `;
}

function playerHTML(name) {
    return `
        <a
            href="${playerURL(name)}"
            target="_blank"
            rel="noopener noreferrer"
            class="player-name"
            style="text-decoration:none;"
        >
            ${escapeHTML(name)}
        </a>
    `;
}

function statusHTML(online) {
    if (online) {
        return `
            <span class="positive">
                ● ONLINE
            </span>
        `;
    }

    return `
        <span style="color:var(--text-3);">
            ● OFFLINE
        </span>
    `;
}

function apiStatusHTML() {
    return `
        <span class="positive">
            ● DANE API
        </span>
    `;
}

/* =========================================================
   PARSOWANIE LICZB
   ========================================================= */

function parseNumber(value) {
    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    let text = String(value)
        .replace(/\s/g, "")
        .replace(/\$/g, "")
        .replace(/,/g, "")
        .replace(/zł/gi, "");

    const number = Number(text);

    return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   SZUKANIE WARTOŚCI W OBIEKCIE API
   ========================================================= */

function firstValue(object, keys, fallback = null) {
    if (!object || typeof object !== "object") {
        return fallback;
    }

    for (const key of keys) {
        if (
            Object.prototype.hasOwnProperty.call(object, key) &&
            object[key] !== null &&
            object[key] !== undefined &&
            object[key] !== ""
        ) {
            return object[key];
        }
    }

    return fallback;
}

/* =========================================================
   NORMALIZACJA GRACZA Z API
   ========================================================= */

function normalizePlayer(raw) {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const name = firstValue(
        raw,
        [
            "name",
            "username",
            "player",
            "playerName",
            "nick",
            "nickname",
            "user"
        ],
        null
    );

    if (!name) {
        return null;
    }

    const levelRaw = firstValue(
        raw,
        [
            "level",
            "lvl",
            "poziom"
        ],
        0
    );

    const moneyRaw = firstValue(
        raw,
        [
            "money",
            "cash",
            "balance",
            "wallet",
            "gotowka",
            "gotówka",
            "wealth",
            "majatek",
            "majątek"
        ],
        0
    );

    const clanRaw = firstValue(
        raw,
        [
            "clan",
            "clanName",
            "clan_name",
            "gang",
            "faction",
            "klan"
        ],
        null
    );

    const activityRaw = firstValue(
        raw,
        [
            "activity",
            "lastActivity",
            "last_activity",
            "lastSeen",
            "last_seen",
            "lastOnline",
            "last_online",
            "activityText"
        ],
        "—"
    );

    const onlineRaw = firstValue(
        raw,
        [
            "online",
            "isOnline",
            "is_online",
            "status"
        ],
        false
    );

    let online = false;

    if (typeof onlineRaw === "boolean") {
        online = onlineRaw;
    } else {
        const statusText = String(onlineRaw).toLowerCase();

        online =
            statusText.includes("online") ||
            statusText.includes("gra") ||
            statusText.includes("teraz");
    }

    return {
        name: String(name),
        level: parseNumber(levelRaw),
        money: parseNumber(moneyRaw),
        clan:
            clanRaw === null ||
            clanRaw === undefined ||
            clanRaw === "" ||
            clanRaw === "—"
                ? null
                : String(clanRaw),
        activity:
            activityRaw === null ||
            activityRaw === undefined ||
            activityRaw === ""
                ? "—"
                : String(activityRaw),
        online
    };
}

/* =========================================================
   WYDOBYCIE LISTY GRACZY Z ODPOWIEDZI API
   ========================================================= */

function extractPlayers(data) {
    if (!data) {
        return [];
    }

    let list = [];

    if (Array.isArray(data)) {
        list = data;
    } else if (Array.isArray(data.players)) {
        list = data.players;
    } else if (Array.isArray(data.data)) {
        list = data.data;
    } else if (Array.isArray(data.results)) {
        list = data.results;
    } else if (Array.isArray(data.recent)) {
        list = data.recent;
    } else if (Array.isArray(data.items)) {
        list = data.items;
    }

    return list
        .map(normalizePlayer)
        .filter(Boolean);
}

/* =========================================================
   MERGE DANYCH API Z DANYMI AWARYJNYMI
   ========================================================= */

function mergePlayers(apiPlayers) {
    if (!apiPlayers.length) {
        return [...FALLBACK_PLAYERS];
    }

    const fallbackMap = new Map(
        FALLBACK_PLAYERS.map(player => [
            normalizeName(player.name),
            player
        ])
    );

    const apiMap = new Map(
        apiPlayers.map(player => [
            normalizeName(player.name),
            player
        ])
    );

    const merged = [];

    for (const fallback of FALLBACK_PLAYERS) {
        const apiPlayer = apiMap.get(
            normalizeName(fallback.name)
        );

        if (apiPlayer) {
            merged.push({
                ...fallback,
                ...apiPlayer,

                /*
                 * Jeżeli API nie podało konkretnej wartości,
                 * zachowujemy dane z fallbacku.
                 */
                level:
                    apiPlayer.level > 0
                        ? apiPlayer.level
                        : fallback.level,

                money:
                    apiPlayer.money > 0
                        ? apiPlayer.money
                        : fallback.money,

                clan:
                    apiPlayer.clan ||
                    fallback.clan,

                activity:
                    apiPlayer.activity !== "—"
                        ? apiPlayer.activity
                        : fallback.activity,

                online:
                    apiPlayer.online
            });
        } else {
            merged.push(fallback);
        }
    }

    /*
     * Dodajemy graczy istniejących w API,
     * których nie było w fallbacku.
     */
    for (const apiPlayer of apiPlayers) {
        const exists = merged.some(
            player =>
                normalizeName(player.name) ===
                normalizeName(apiPlayer.name)
        );

        if (!exists) {
            merged.push(apiPlayer);
        }
    }

    return merged;
}

/* =========================================================
   KLANY
   ========================================================= */

function buildClans() {
    const clanMap = new Map();

    players.forEach(player => {
        if (!player.clan) {
            return;
        }

        const key = normalizeName(player.clan);

        if (!clanMap.has(key)) {
            clanMap.set(key, {
                name: player.clan,
                leader: "—",
                members: 0,
                cash: 0,
                wealth: 0,
                activity: "—",
                change: "—"
            });
        }

        const clan = clanMap.get(key);

        clan.members += 1;
        clan.cash += player.money;
        clan.wealth += player.money;

        if (
            player.activity &&
            player.activity !== "—"
        ) {
            clan.activity = player.activity;
        }
    });

    clans = Array.from(clanMap.values());

    return clans;
}

/* =========================================================
   SORTOWANIE GRACZY
   ========================================================= */

function sortPlayers(list, sort = "money") {
    const copy = [...list];

    if (sort === "level") {
        copy.sort(
            (a, b) =>
                Number(b.level) -
                Number(a.level)
        );
    } else if (sort === "time") {
        copy.sort(
            (a, b) =>
                Number(b.online) -
                Number(a.online)
        );
    } else {
        copy.sort(
            (a, b) =>
                Number(b.money) -
                Number(a.money)
        );
    }

    return copy;
}

/* =========================================================
   SORTOWANIE KLANÓW
   ========================================================= */

function sortClans(list, sort = "money") {
    const copy = [...list];

    if (sort === "members") {
        copy.sort(
            (a, b) =>
                Number(b.members) -
                Number(a.members)
        );
    } else if (sort === "time") {
        copy.sort(
            (a, b) =>
                Number(b.members) -
                Number(a.members)
        );
    } else {
        copy.sort(
            (a, b) =>
                Number(b.wealth) -
                Number(a.wealth)
        );
    }

    return copy;
}

/* =========================================================
   RENDER — GRACZE
   ========================================================= */

function renderPlayersTable(
    targetId,
    data = players
) {
    const target =
        document.getElementById(targetId);

    if (!target) {
        return;
    }

    if (!data.length) {
        target.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>♙</div>
                        <h3>Brak graczy</h3>
                        <p>Nie znaleziono żadnych danych.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    target.innerHTML = data
        .map((player, index) => {
            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        ${playerHTML(player.name)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                player.level
                            )}
                        </strong>
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            player.money
                        )}
                    </td>

                    <td>
                        ${clanHTML(
                            player.clan
                        )}
                    </td>

                    <td>
                        ${
                            escapeHTML(
                                player.activity ||
                                "—"
                            )
                        }
                    </td>

                    <td>
                        ${apiStatusHTML()}
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   RENDER — DASHBOARD BOGACI GRACZE
   ========================================================= */

function renderRichPlayers() {
    const target =
        document.getElementById(
            "richPlayersTable"
        );

    if (!target) {
        return;
    }

    const sorted =
        sortPlayers(
            players,
            "money"
        ).slice(0, 10);

    target.innerHTML = sorted
        .map((player, index) => {
            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        ${playerHTML(player.name)}
                    </td>

                    <td>
                        ${escapeHTML(
                            player.level
                        )}
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            player.money
                        )}
                    </td>

                    <td>
                        ${clanHTML(
                            player.clan
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            player.activity ||
                            "—"
                        )}
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   RENDER — KLANY
   ========================================================= */

function renderClansTable(
    targetId,
    data = clans
) {
    const target =
        document.getElementById(targetId);

    if (!target) {
        return;
    }

    if (!data.length) {
        target.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>♛</div>
                        <h3>Brak klanów</h3>
                        <p>API nie zwróciło danych o klanach.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    target.innerHTML = data
        .map((clan, index) => {
            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="clan-name">
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
                        ${escapeHTML(
                            clan.members
                        )}
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            clan.cash
                        )}
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            clan.wealth
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            clan.activity
                        )}
                    </td>

                    <td>
                        ${apiStatusHTML()}
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   RANKING POZIOMÓW
   ========================================================= */

function renderLevelRanking(targetId) {
    const target =
        document.getElementById(targetId);

    if (!target) {
        return;
    }

    const sorted =
        sortPlayers(
            players,
            "level"
        ).slice(0, 10);

    const maxLevel =
        Math.max(
            ...sorted.map(
                player =>
                    Number(player.level) || 0
            ),
            1
        );

    target.innerHTML = sorted
        .map((player, index) => {
            const percentage =
                Math.max(
                    3,
                    (player.level /
                        maxLevel) *
                        100
                );

            return `
                <div class="ranking-row">

                    <div class="ranking-number">
                        #${index + 1}
                    </div>

                    <div class="ranking-name">
                        ${escapeHTML(
                            player.name
                        )}
                    </div>

                    <div class="ranking-bar">
                        <span
                            style="width:${percentage}%"
                        ></span>
                    </div>

                    <div class="ranking-value">
                        ${escapeHTML(
                            player.level
                        )} lvl
                    </div>

                </div>
            `;
        })
        .join("");
}

/* =========================================================
   RANKING PIENIĘDZY
   ========================================================= */

function renderMoneyRanking() {
    const target =
        document.getElementById(
            "moneyRanking"
        );

    if (!target) {
        return;
    }

    const sorted =
        sortPlayers(
            players,
            "money"
        ).slice(0, 10);

    const maxMoney =
        Math.max(
            ...sorted.map(
                player =>
                    Number(player.money) || 0
            ),
            1
        );

    target.innerHTML = sorted
        .map((player, index) => {
            const percentage =
                Math.max(
                    3,
                    (player.money /
                        maxMoney) *
                        100
                );

            return `
                <div class="ranking-row">

                    <div class="ranking-number">
                        #${index + 1}
                    </div>

                    <div class="ranking-name">
                        ${escapeHTML(
                            player.name
                        )}
                    </div>

                    <div class="ranking-bar">
                        <span
                            style="width:${percentage}%"
                        ></span>
                    </div>

                    <div class="ranking-value">
                        ${formatMoney(
                            player.money
                        )}
                    </div>

                </div>
            `;
        })
        .join("");
}

/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {
    const target =
        document.getElementById(
            "marketTable"
        );

    if (!target) {
        return;
    }

    const sorted =
        sortClans(
            clans,
            "money"
        );

    if (!sorted.length) {
        target.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>◆</div>
                        <h3>Brak danych rynku</h3>
                        <p>Brak wystarczających danych z API.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    target.innerHTML = sorted
        .map(clan => {
            return `
                <tr>

                    <td>
                        ${clanHTML(
                            clan.name
                        )}
                    </td>

                    <td class="positive">
                        ${formatMoney(
                            clan.wealth
                        )}
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        ${apiStatusHTML()}
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   DASHBOARD — KARTY
   ========================================================= */

function updateStats() {
    const online =
        players.filter(
            player => player.online
        ).length;

    const totalWealth =
        players.reduce(
            (sum, player) =>
                sum +
                Number(player.money || 0),
            0
        );

    const playerCards =
        document.querySelectorAll(
            ".stats-grid .stat-card"
        );

    if (playerCards.length >= 4) {
        playerCards[0].querySelector(
            ".stat-value"
        ).textContent =
            players.length.toLocaleString(
                "pl-PL"
            );

        playerCards[1].querySelector(
            ".stat-value"
        ).textContent =
            online.toLocaleString(
                "pl-PL"
            );

        playerCards[2].querySelector(
            ".stat-value"
        ).textContent =
            clans.length.toLocaleString(
                "pl-PL"
            );

        playerCards[3].querySelector(
            ".stat-value"
        ).textContent =
            formatMoney(totalWealth);
    }

    const onlineElement =
        document.getElementById(
            "onlinePlayers"
        );

    if (onlineElement) {
        onlineElement.textContent =
            online.toLocaleString(
                "pl-PL"
            );
    }
}

/* =========================================================
   WYSZUKIWARKA
   ========================================================= */

function searchEverything(query) {
    const text =
        normalizeName(query);

    if (!text) {
        return {
            players: [],
            clans: []
        };
    }

    const foundPlayers =
        players.filter(player =>
            normalizeName(
                player.name
            ).includes(text)
        );

    const foundClans =
        clans.filter(clan =>
            normalizeName(
                clan.name
            ).includes(text)
        );

    return {
        players: foundPlayers,
        clans: foundClans
    };
}

function renderSearchResults(query) {
    const target =
        document.getElementById(
            "searchResults"
        );

    if (!target) {
        return;
    }

    if (!query.trim()) {
        target.innerHTML = `
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

    const results =
        searchEverything(query);

    if (
        !results.players.length &&
        !results.clans.length
    ) {
        target.innerHTML = `
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

    results.players.forEach(
        player => {
            html += `
                <div class="result-card">

                    <div>
                        ${playerHTML(
                            player.name
                        )}

                        <small>
                            Gracz ·
                            ${escapeHTML(
                                player.level
                            )} lvl ·
                            ${formatMoney(
                                player.money
                            )}
                        </small>
                    </div>

                    <div>
                        ${apiStatusHTML()}
                    </div>

                </div>
            `;
        }
    );

    results.clans.forEach(
        clan => {
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
                            ${escapeHTML(
                                clan.members
                            )} członków ·
                            ${formatMoney(
                                clan.wealth
                            )}
                        </small>
                    </div>

                    <div>
                        ${apiStatusHTML()}
                    </div>

                </div>
            `;
        }
    );

    target.innerHTML = html;
}

/* =========================================================
   WYKRESY
   ========================================================= */

function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

function createCharts() {
    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }

    createActivityChart();
    createClanChart();
    createActivityChart2();
    createWealthChart();
}

function createActivityChart() {
    const canvas =
        document.getElementById(
            "activityChart"
        );

    if (!canvas) {
        return;
    }

    destroyChart("activity");

    charts.activity =
        new Chart(canvas, {
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
                        label:
                            "Aktywni gracze",

                        data: [
                            74,
                            91,
                            88,
                            105,
                            119,
                            132,
                            126
                        ],

                        borderColor:
                            "#9b5cff",

                        backgroundColor:
                            "rgba(155,92,255,0.12)",

                        fill: true,

                        tension: 0.4
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
                            color: "#6f6a78"
                        }
                    },

                    y: {
                        beginAtZero: true,

                        ticks: {
                            color: "#6f6a78"
                        },

                        grid: {
                            color:
                                "rgba(255,255,255,0.05)"
                        }
                    }
                }
            }
        });
}

function createActivityChart2() {
    const canvas =
        document.getElementById(
            "activityChart2"
        );

    if (!canvas) {
        return;
    }

    destroyChart("activity2");

    charts.activity2 =
        new Chart(canvas, {
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
                        label:
                            "Aktywni gracze",

                        data: [
                            74,
                            91,
                            88,
                            105,
                            119,
                            132,
                            126
                        ],

                        borderColor:
                            "#9b5cff",

                        backgroundColor:
                            "rgba(155,92,255,0.12)",

                        fill: true,

                        tension: 0.4
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
        });
}

function createClanChart() {
    const canvas =
        document.getElementById(
            "clanChart"
        );

    if (!canvas) {
        return;
    }

    destroyChart("clan");

    const topClans =
        sortClans(
            clans,
            "money"
        ).slice(0, 5);

    const labels =
        topClans.length
            ? topClans.map(
                  clan => clan.name
              )
            : [
                  "EXO",
                  "PPPB",
                  "KWE",
                  "HASA",
                  "Sakai"
              ];

    const values =
        topClans.length
            ? topClans.map(
                  clan => clan.wealth
              )
            : [
                  1600000,
                  800000,
                  500000,
                  350000,
                  200000
              ];

    charts.clan =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label:
                            "Majątek",

                        data: values,

                        backgroundColor:
                            "#9b5cff",

                        borderRadius: 8
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
                        ticks: {
                            color: "#6f6a78"
                        },

                        grid: {
                            display: false
                        }
                    },

                    y: {
                        ticks: {
                            color: "#6f6a78"
                        },

                        grid: {
                            color:
                                "rgba(255,255,255,0.05)"
                        }
                    }
                }
            }
        });
}

function createWealthChart() {
    const canvas =
        document.getElementById(
            "wealthChart"
        );

    if (!canvas) {
        return;
    }

    destroyChart("wealth");

    const topClans =
        sortClans(
            clans,
            "money"
        ).slice(0, 10);

    const labels =
        topClans.length
            ? topClans.map(
                  clan => clan.name
              )
            : [
                  "EXO",
                  "PPPB",
                  "KWE",
                  "HASA",
                  "Sakai"
              ];

    const values =
        topClans.length
            ? topClans.map(
                  clan => clan.wealth
              )
            : [
                  1600000,
                  800000,
                  500000,
                  350000,
                  200000
              ];

    charts.wealth =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label:
                            "Majątek",

                        data: values,

                        backgroundColor:
                            "#9b5cff",

                        borderRadius: 8
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
        });
}

/* =========================================================
   NAWIGACJA
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
            "Wykresy statystyk",

        market:
            "Zmiany wartości klanów",

        search:
            "Znajdź gracza lub klan"
    };

    function openPage(pageId) {
        navItems.forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.page ===
                    pageId
            );
        });

        pages.forEach(page => {
            page.classList.toggle(
                "active",
                page.id === pageId
            );
        });

        const activeItem =
            document.querySelector(
                `.nav-item[data-page="${pageId}"]`
            );

        if (title && activeItem) {
            title.textContent =
                activeItem.textContent.trim();
        }

        const subtitle =
            document.querySelector(
                ".page-title p"
            );

        if (
            subtitle &&
            subtitles[pageId]
        ) {
            subtitle.textContent =
                subtitles[pageId];
        }

        document
            .getElementById("sidebar")
            ?.classList.remove(
                "open"
            );

        if (
            pageId === "charts"
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
                        button.dataset
                            .pageLink
                    );
                }
            );
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
   WYSZUKIWANIE
   ========================================================= */

function setupSearch() {
    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    const globalSearchPage =
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

    const playerSort =
        document.getElementById(
            "playerSort"
        );

    const clanSort =
        document.getElementById(
            "clanSort"
        );

    if (globalSearch) {
        globalSearch.addEventListener(
            "input",
            event => {
                const value =
                    event.target.value.trim();

                if (value) {
                    renderSearchResults(
                        value
                    );

                    document
                        .querySelector(
                            '.nav-item[data-page="search"]'
                        )
                        ?.click();
                }
            }
        );
    }

    if (globalSearchPage) {
        globalSearchPage.addEventListener(
            "input",
            event => {
                renderSearchResults(
                    event.target.value
                );
            }
        );
    }

    if (playerSearch) {
        playerSearch.addEventListener(
            "input",
            event => {
                const query =
                    normalizeName(
                        event.target.value
                    );

                const filtered =
                    players.filter(
                        player =>
                            normalizeName(
                                player.name
                            ).includes(query)
                    );

                renderPlayersTable(
                    "allPlayersTable",
                    sortPlayers(
                        filtered,
                        playerSort?.value ||
                            "money"
                    )
                );
            }
        );
    }

    if (clanSearch) {
        clanSearch.addEventListener(
            "input",
            event => {
                const query =
                    normalizeName(
                        event.target.value
                    );

                const filtered =
                    clans.filter(
                        clan =>
                            normalizeName(
                                clan.name
                            ).includes(query)
                    );

                renderClansTable(
                    "allClansTable",
                    sortClans(
                        filtered,
                        clanSort?.value ||
                            "money"
                    )
                );
            }
        );
    }

    if (playerSort) {
        playerSort.addEventListener(
            "change",
            () => {
                const query =
                    normalizeName(
                        playerSearch?.value ||
                            ""
                    );

                const filtered =
                    players.filter(
                        player =>
                            normalizeName(
                                player.name
                            ).includes(query)
                    );

                renderPlayersTable(
                    "allPlayersTable",
                    sortPlayers(
                        filtered,
                        playerSort.value
                    )
                );
            }
        );
    }

    if (clanSort) {
        clanSort.addEventListener(
            "change",
            () => {
                const query =
                    normalizeName(
                        clanSearch?.value ||
                            ""
                    );

                const filtered =
                    clans.filter(
                        clan =>
                            normalizeName(
                                clan.name
                            ).includes(query)
                    );

                renderClansTable(
                    "allClansTable",
                    sortClans(
                        filtered,
                        clanSort.value
                    )
                );
            }
        );
    }
}

/* =========================================================
   ODŚWIEŻANIE
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
        `✓ ${message}`;

    toast.classList.add("show");

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout =
        setTimeout(() => {
            toast.classList.remove(
                "show"
            );
        }, 2500);
}

async function loadAPI() {
    try {
        const response =
            await fetch(
                API_ENDPOINTS.recent,
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json"
                    },

                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        const apiPlayers =
            extractPlayers(data);

        if (apiPlayers.length) {
            players =
                mergePlayers(
                    apiPlayers
                );

            apiOnline = true;
        } else {
            players =
                [...FALLBACK_PLAYERS];

            apiOnline = true;
        }

        return true;

    } catch (error) {
        console.warn(
            "EXODO API error:",
            error
        );

        players =
            [...FALLBACK_PLAYERS];

        apiOnline = false;

        return false;
    }
}

/* =========================================================
   RENDER WSZYSTKIE DANE
   ========================================================= */

function renderAll() {
    buildClans();

    updateStats();

    renderPlayersTable(
        "allPlayersTable",
        sortPlayers(
            players,
            "money"
        )
    );

    renderRichPlayers();

    renderClansTable(
        "clanTable",
        sortClans(
            clans,
            "money"
        ).slice(0, 10)
    );

    renderClansTable(
        "allClansTable",
        sortClans(
            clans,
            "money"
        )
    );

    renderLevelRanking(
        "levelRanking"
    );

    renderLevelRanking(
        "levelRanking2"
    );

    renderMoneyRanking();

    renderMarket();

    createCharts();
}

/* =========================================================
   REFRESH
   ========================================================= */

async function refreshData(
    showMessage = true
) {
    const button =
        document.getElementById(
            "refreshButton"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "↻ Ładowanie...";
    }

    await loadAPI();

    renderAll();

    if (button) {
        button.disabled = false;
        button.textContent =
            "↻ Odśwież";
    }

    if (showMessage) {
        showToast(
            apiOnline
                ? "Statystyki zostały odświeżone"
                : "API niedostępne — użyto danych awaryjnych"
        );
    }
}

/* =========================================================
   START
   ========================================================= */

async function init() {
    setupNavigation();
    setupMobileMenu();
    setupSearch();

    /*
     * Najpierw pokazujemy dane awaryjne,
     * żeby strona nigdy nie była pusta.
     */
    renderAll();

    /*
     * Następnie próbujemy pobrać prawdziwe dane.
     */
    await refreshData(false);

    /*
     * Automatyczne odświeżanie co 60 sekund.
     */
    setInterval(() => {
        refreshData(false);
    }, 60000);
}

/* =========================================================
   BUTTON REFRESH
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const refreshButton =
            document.getElementById(
                "refreshButton"
            );

        if (refreshButton) {
            refreshButton.addEventListener(
                "click",
                () => {
                    refreshData(true);
                }
            );
        }

        init();
    }
);
