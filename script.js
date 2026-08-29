/* =========================================================
   EXODO STATS — API + UI
   Pasuje do obecnego HTML + CSS
   ========================================================= */

const API_BASE =
    "https://exodo-api.oliwierdawidowicz.workers.dev/api";

const API_RECENT = `${API_BASE}/recent?limit=100`;

let players = [];
let clans = [];
let charts = {};

let currentPlayerSort = "money";
let currentClanSort = "money";

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

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

function getLevel(player) {
    const level = Number(player?.level);

    return Number.isFinite(level) ? level : 0;
}

/* =========================================================
   CLAN PARSER
   ========================================================= */

function parseClan(value) {
    if (!value) {
        return {
            name: "",
            tag: "",
            role: "",
            members: 0
        };
    }

    const text = String(value).replace(/\s+/g, " ").trim();

    /*
       Przykłady z API:

       "[ exo ] exo Lider · 18 członków"
       "[ PPPB ] pppb Członek · 18 członków"
       "[ KWE ] kwe Zastępca · 10 członków"
       "Nie należy do żadnego klanu..."
    */

    if (/nie należy do żadnego klanu/i.test(text)) {
        return {
            name: "",
            tag: "",
            role: "",
            members: 0
        };
    }

    const match = text.match(
        /\[\s*([^\]]+?)\s*\]\s*([^\s]+)?\s*(Lider|Zastępca|Członek)?\s*[·\-]?\s*(\d+)?\s*członków?/i
    );

    if (!match) {
        return {
            name: "",
            tag: "",
            role: "",
            members: 0
        };
    }

    return {
        tag: (match[1] || "").trim(),
        name: (match[2] || match[1] || "").trim(),
        role: (match[3] || "").trim(),
        members: Number(match[4] || 0)
    };
}

/* =========================================================
   ACTIVITY / STATUS
   ========================================================= */

function getActivityText(player) {
    const lastSeen = String(player?.lastSeen || "").trim();
    const playtime = String(player?.playtime || "").trim();

    if (/teraz gra/i.test(lastSeen)) {
        return "Teraz gra na serwerze";
    }

    if (/teraz gra/i.test(playtime)) {
        return "Teraz gra na serwerze";
    }

    if (lastSeen) {
        return lastSeen;
    }

    if (playtime) {
        return playtime;
    }

    return "Brak danych";
}

function isOnline(player) {
    const status = String(player?.status ?? "").toLowerCase();

    const activity = getActivityText(player).toLowerCase();

    if (
        status === "online" ||
        status === "true" ||
        status === "playing"
    ) {
        return true;
    }

    if (
        activity.includes("teraz gra") ||
        activity.includes("online") ||
        activity.includes("gra na serwerze")
    ) {
        return true;
    }

    return false;
}

function getStatusHTML(player) {
    if (isOnline(player)) {
        return `
            <span style="color:#4ade80;font-weight:600;">
                ● ONLINE
            </span>
        `;
    }

    return `
        <span style="color:#6f6a78;">
            ● OFFLINE
        </span>
    `;
}

/* =========================================================
   FETCH
   ========================================================= */

async function fetchJSON(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json"
        },
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} — ${url}`
        );
    }

    return await response.json();
}

/* =========================================================
   LOAD RECENT PLAYERS
   ========================================================= */

async function loadPlayers() {
    const data = await fetchJSON(API_RECENT);

    if (!data || !Array.isArray(data.players)) {
        throw new Error("API /recent nie zwróciło tablicy players.");
    }

    const basicPlayers = data.players;

    /*
       /recent ma czasami niepełne dane.
       Dlatego dla każdego gracza pobieramy /player.
    */

    const enriched = await Promise.all(
        basicPlayers.map(async (basicPlayer) => {
            try {
                const name = basicPlayer.name;

                if (!name) {
                    return basicPlayer;
                }

                const url =
                    `${API_BASE}/player?name=${encodeURIComponent(name)}`;

                const result = await fetchJSON(url);

                if (result?.success && result?.player) {
                    return {
                        ...basicPlayer,
                        ...result.player,

                        // name z /recent jest pewniejsze
                        name: basicPlayer.name
                    };
                }

                return basicPlayer;
            } catch (error) {
                console.warn(
                    `Nie udało się pobrać danych gracza ${basicPlayer.name}`,
                    error
                );

                return basicPlayer;
            }
        })
    );

    players = enriched.map((player) => {
        const clanData = parseClan(
            player.clan || player.rank || ""
        );

        return {
            ...player,

            name: player.name || "Nieznany",
            level: getLevel(player),
            money: Number(player.money) || 0,

            clanData,

            activity: getActivityText(player),

            online: isOnline(player)
        };
    });

    buildClans();

    return players;
}

/* =========================================================
   BUILD CLANS FROM PLAYERS
   ========================================================= */

function buildClans() {
    const map = new Map();

    players.forEach((player) => {
        const clan = player.clanData;

        if (!clan || !clan.name) {
            return;
        }

        const key =
            clan.tag ||
            clan.name.toLowerCase();

        if (!map.has(key)) {
            map.set(key, {
                name: clan.name,
                tag: clan.tag,
                members: clan.members || 0,
                cash: 0,
                players: [],
                leader: "—"
            });
        }

        const current = map.get(key);

        current.cash += Number(player.money) || 0;

        current.players.push(player);

        if (
            /lider/i.test(clan.role) &&
            current.leader === "—"
        ) {
            current.leader = player.name;
        }

        if (clan.members > current.members) {
            current.members = clan.members;
        }
    });

    clans = Array.from(map.values());

    clans.forEach((clan) => {
        if (clan.members <= 0) {
            clan.members = clan.players.length;
        }
    });
}

/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
    const statCards = document.querySelectorAll(".stat-card");

    if (!statCards.length) {
        return;
    }

    const online = players.filter(
        (player) => player.online
    ).length;

    const totalMoney = players.reduce(
        (sum, player) =>
            sum + (Number(player.money) || 0),
        0
    );

    /*
       Pierwsza karta
    */

    const playerValue =
        statCards[0]?.querySelector(".stat-value");

    if (playerValue) {
        playerValue.textContent =
            formatNumber(players.length);
    }

    /*
       Online
    */

    const onlineValue =
        $("onlinePlayers");

    if (onlineValue) {
        onlineValue.textContent =
            formatNumber(online);
    }

    /*
       Klany
    */

    const clanValue =
        statCards[2]?.querySelector(".stat-value");

    if (clanValue) {
        clanValue.textContent =
            formatNumber(clans.length);
    }

    /*
       Majątek
    */

    const moneyValue =
        statCards[3]?.querySelector(".stat-value");

    if (moneyValue) {
        moneyValue.textContent =
            formatLargeMoney(totalMoney);
    }

    /*
       Usuwamy fałszywe zmiany procentowe.
    */

    const changes =
        document.querySelectorAll(".stat-change");

    changes.forEach((change, index) => {
        if (index === 0) {
            change.textContent =
                "Dane z EXODO API";
        }

        if (index === 1) {
            change.textContent =
                online > 0
                    ? "Gracze aktualnie online"
                    : "Brak graczy online";
        }

        if (index === 2) {
            change.textContent =
                "Wykryte na podstawie danych graczy";
        }

        if (index === 3) {
            change.textContent =
                "Suma gotówki graczy";
        }
    });
}

function formatLargeMoney(value) {
    const number = Number(value) || 0;

    if (number >= 1_000_000_000_000) {
        return (
            (number / 1_000_000_000_000)
                .toFixed(2)
                .replace(".", ",") +
            "T$"
        );
    }

    if (number >= 1_000_000_000) {
        return (
            (number / 1_000_000_000)
                .toFixed(2)
                .replace(".", ",") +
            "B$"
        );
    }

    if (number >= 1_000_000) {
        return (
            (number / 1_000_000)
                .toFixed(2)
                .replace(".", ",") +
            "M$"
        );
    }

    if (number >= 1_000) {
        return (
            (number / 1_000)
                .toFixed(1)
                .replace(".", ",") +
            "K$"
        );
    }

    return formatMoney(number);
}

/* =========================================================
   PLAYER TABLE
   ========================================================= */

function sortPlayers(list) {
    const copy = [...list];

    switch (currentPlayerSort) {
        case "level":
            return copy.sort(
                (a, b) =>
                    getLevel(b) - getLevel(a)
            );

        case "time":
            return copy.sort((a, b) => {
                if (a.online && !b.online) return -1;
                if (!a.online && b.online) return 1;

                return 0;
            });

        case "money":
        default:
            return copy.sort(
                (a, b) =>
                    (Number(b.money) || 0) -
                    (Number(a.money) || 0)
            );
    }
}

function renderPlayersTable() {
    const table = $("allPlayersTable");

    if (!table) return;

    const search =
        ($("playerSearch")?.value || "")
            .trim()
            .toLowerCase();

    let list = players.filter((player) =>
        player.name
            .toLowerCase()
            .includes(search)
    );

    list = sortPlayers(list);

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

        return;
    }

    table.innerHTML = list
        .map((player, index) => {
            const clan = player.clanData;

            return `
                <tr>
                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="player-name">
                            ${escapeHTML(player.name)}
                        </span>
                    </td>

                    <td>
                        ${getLevel(player)}
                    </td>

                    <td>
                        <span class="positive">
                            ${formatMoney(player.money)}
                        </span>
                    </td>

                    <td>
                        ${
                            clan?.name
                                ? `
                                    <span class="clan-tag">
                                        [${escapeHTML(clan.tag || clan.name)}]
                                    </span>
                                    ${escapeHTML(clan.name)}
                                `
                                : "—"
                        }
                    </td>

                    <td>
                        ${escapeHTML(player.activity)}
                    </td>

                    <td>
                        ${getStatusHTML(player)}
                    </td>
                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {
    const table = $("richPlayersTable");

    if (!table) return;

    const list = [...players]
        .sort(
            (a, b) =>
                (Number(b.money) || 0) -
                (Number(a.money) || 0)
        )
        .slice(0, 10);

    table.innerHTML = list
        .map((player, index) => {
            const clan = player.clanData;

            return `
                <tr>
                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="player-name">
                            ${escapeHTML(player.name)}
                        </span>
                    </td>

                    <td>
                        ${getLevel(player)}
                    </td>

                    <td>
                        <span class="positive">
                            ${formatMoney(player.money)}
                        </span>
                    </td>

                    <td>
                        ${
                            clan?.name
                                ? escapeHTML(clan.name)
                                : "—"
                        }
                    </td>

                    <td>
                        ${escapeHTML(player.activity)}
                    </td>
                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   CLAN TABLE
   ========================================================= */

function sortClans(list) {
    const copy = [...list];

    switch (currentClanSort) {
        case "members":
            return copy.sort(
                (a, b) =>
                    b.members - a.members
            );

        case "time":
            return copy.sort((a, b) => {
                const aOnline =
                    a.players.some((p) => p.online);

                const bOnline =
                    b.players.some((p) => p.online);

                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;

                return 0;
            });

        case "money":
        default:
            return copy.sort(
                (a, b) =>
                    b.cash - a.cash
            );
    }
}

function renderClansTable(targetId = "allClansTable") {
    const table = $(targetId);

    if (!table) return;

    const search =
        ($("clanSearch")?.value || "")
            .trim()
            .toLowerCase();

    let list = clans.filter((clan) => {
        return (
            clan.name
                .toLowerCase()
                .includes(search) ||
            clan.tag
                .toLowerCase()
                .includes(search)
        );
    });

    list = sortClans(list);

    if (!list.length) {
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

    table.innerHTML = list
        .map((clan, index) => {
            const online =
                clan.players.filter(
                    (player) => player.online
                ).length;

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="clan-tag">
                            [${escapeHTML(clan.tag || clan.name)}]
                        </span>

                        <span class="clan-name">
                            ${escapeHTML(clan.name)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(clan.leader)}
                    </td>

                    <td>
                        ${formatNumber(clan.members)}
                    </td>

                    <td>
                        <span class="positive">
                            ${formatMoney(clan.cash)}
                        </span>
                    </td>

                    <td>
                        ${formatMoney(clan.cash)}
                    </td>

                    <td>
                        ${
                            online > 0
                                ? `${online} online`
                                : "Brak online"
                        }
                    </td>

                    <td class="change-none">
                        —
                    </td>

                </tr>
            `;
        })
        .join("");
}

/* =========================================================
   LEVEL RANKING
   ========================================================= */

function renderLevelRanking(targetId = "levelRanking") {
    const container = $(targetId);

    if (!container) return;

    const list = [...players]
        .sort(
            (a, b) =>
                getLevel(b) -
                getLevel(a)
        )
        .slice(0, 10);

    if (!list.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>★</div>
                <h3>Brak danych</h3>
            </div>
        `;

        return;
    }

    const max =
        Math.max(
            ...list.map((player) =>
                getLevel(player)
            ),
            1
        );

    container.innerHTML = list
        .map((player, index) => {
            const percent =
                (getLevel(player) / max) * 100;

            return `
                <div class="ranking-row">

                    <div class="ranking-number">
                        ${index + 1}
                    </div>

                    <div class="ranking-name">
                        ${escapeHTML(player.name)}
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
}

/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {
    const container = $("moneyRanking");

    if (!container) return;

    const list = [...players]
        .sort(
            (a, b) =>
                (Number(b.money) || 0) -
                (Number(a.money) || 0)
        )
        .slice(0, 10);

    const max =
        Math.max(
            ...list.map(
                (player) =>
                    Number(player.money) || 0
            ),
            1
        );

    container.innerHTML = list
        .map((player, index) => {
            const money =
                Number(player.money) || 0;

            const percent =
                (money / max) * 100;

            return `
                <div class="ranking-row">

                    <div class="ranking-number">
                        ${index + 1}
                    </div>

                    <div class="ranking-name">
                        ${escapeHTML(player.name)}
                    </div>

                    <div class="ranking-bar">
                        <span
                            style="width:${percent}%"
                        ></span>
                    </div>

                    <div class="ranking-value">
                        ${formatMoney(money)}
                    </div>

                </div>
            `;
        })
        .join("");
}

/* =========================================================
   DASHBOARD CLAN TABLE
   ========================================================= */

function renderDashboardClans() {
    const table = $("clanTable");

    if (!table) return;

    const list = sortClans(clans).slice(0, 10);

    table.innerHTML = list
        .map((clan, index) => {
            const online =
                clan.players.filter(
                    (p) => p.online
                ).length;

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <span class="clan-tag">
                            [${escapeHTML(clan.tag || clan.name)}]
                        </span>

                        <span class="clan-name">
                            ${escapeHTML(clan.name)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(clan.leader)}
                    </td>

                    <td>
                        ${clan.members}
                    </td>

                    <td>
                        ${formatMoney(clan.cash)}
                    </td>

                    <td>
                        ${formatMoney(clan.cash)}
                    </td>

                    <td>
                        ${
                            online
                                ? `${online} online`
                                : "Offline"
                        }
                    </td>

                    <td class="change-none">
                        —
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

    if (!table) return;

    const list = sortClans(clans);

    table.innerHTML = list
        .map((clan) => {
            const online =
                clan.players.some(
                    (p) => p.online
                );

            return `
                <tr>

                    <td>
                        <span class="clan-tag">
                            [${escapeHTML(clan.tag || clan.name)}]
                        </span>

                        <span class="clan-name">
                            ${escapeHTML(clan.name)}
                        </span>
                    </td>

                    <td>
                        ${formatMoney(clan.cash)}
                    </td>

                    <td class="change-none">
                        —
                    </td>

                    <td class="change-none">
                        —
                    </td>

                    <td>
                        ${
                            online
                                ? `
                                    <span class="positive">
                                        ● AKTYWNY
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
}

/* =========================================================
   SEARCH
   ========================================================= */

function performSearch(value) {
    const query =
        String(value || "")
            .trim()
            .toLowerCase();

    const container = $("searchResults");

    if (!container) return;

    if (!query) {
        container.innerHTML = `
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
        players.filter((player) =>
            player.name
                .toLowerCase()
                .includes(query)
        );

    const foundClans =
        clans.filter((clan) =>
            clan.name
                .toLowerCase()
                .includes(query) ||
            clan.tag
                .toLowerCase()
                .includes(query)
        );

    if (
        !foundPlayers.length &&
        !foundClans.length
    ) {
        container.innerHTML = `
            <div class="empty-state">
                <div>⌕</div>
                <h3>Nie znaleziono</h3>
                <p>
                    Brak gracza lub klanu o takiej nazwie.
                </p>
            </div>
        `;

        return;
    }

    let html = "";

    foundPlayers.forEach((player) => {
        html += `
            <div class="result-card">

                <div>
                    <strong>
                        ♙ ${escapeHTML(player.name)}
                    </strong>

                    <small>
                        Poziom ${getLevel(player)}
                        · ${formatMoney(player.money)}
                        · ${escapeHTML(player.activity)}
                    </small>
                </div>

                <span>
                    ${getStatusHTML(player)}
                </span>

            </div>
        `;
    });

    foundClans.forEach((clan) => {
        html += `
            <div class="result-card">

                <div>
                    <strong>
                        ♛
                        [${escapeHTML(clan.tag || clan.name)}]
                        ${escapeHTML(clan.name)}
                    </strong>

                    <small>
                        ${clan.members} członków
                        · ${formatMoney(clan.cash)}
                        · Lider: ${escapeHTML(clan.leader)}
                    </small>
                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}

/* =========================================================
   CHART.JS
   ========================================================= */

async function loadChartJS() {
    if (window.Chart) {
        return;
    }

    await new Promise((resolve, reject) => {
        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js";

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

/* =========================================================
   CHARTS
   ========================================================= */

async function renderCharts() {
    try {
        await loadChartJS();
    } catch (error) {
        console.warn(
            "Nie udało się załadować Chart.js.",
            error
        );

        return;
    }

    const purple =
        "#9b5cff";

    /*
       Aktywność
       Ponieważ API nie udostępnia historii 7 dni,
       pokazujemy aktualną liczbę online jako punkt
       bazowy zamiast wymyślać dane.
    */

    const online =
        players.filter(
            (player) => player.online
        ).length;

    createChart(
        "activityChart",
        "line",
        {
            labels: [
                "—6h",
                "—5h",
                "—4h",
                "—3h",
                "—2h",
                "—1h",
                "Teraz"
            ],
            datasets: [
                {
                    label: "Online",
                    data: [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        online
                    ],
                    borderColor: purple,
                    backgroundColor:
                        "rgba(155,92,255,0.12)",
                    fill: true,
                    tension: 0.4
                }
            ]
        }
    );

    createChart(
        "activityChart2",
        "line",
        {
            labels: [
                "—6h",
                "—5h",
                "—4h",
                "—3h",
                "—2h",
                "—1h",
                "Teraz"
            ],
            datasets: [
                {
                    label: "Online",
                    data: [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        online
                    ],
                    borderColor: purple,
                    backgroundColor:
                        "rgba(155,92,255,0.12)",
                    fill: true,
                    tension: 0.4
                }
            ]
        }
    );

    const topClans =
        [...clans]
            .sort(
                (a, b) =>
                    b.cash - a.cash
            )
            .slice(0, 10);

    const clanLabels =
        topClans.map(
            (clan) =>
                clan.tag ||
                clan.name
        );

    const clanMoney =
        topClans.map(
            (clan) => clan.cash
        );

    createChart(
        "clanChart",
        "doughnut",
        {
            labels: clanLabels,
            datasets: [
                {
                    data:
                        clanMoney.length
                            ? clanMoney
                            : [1],
                    backgroundColor:
                        generatePurpleColors(
                            Math.max(
                                clanMoney.length,
                                1
                            )
                        ),
                    borderWidth: 0
                }
            ]
        },
        {
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        color: "#aaa5b5",
                        boxWidth: 10
                    }
                }
            }
        }
    );

    createChart(
        "wealthChart",
        "bar",
        {
            labels: clanLabels,
            datasets: [
                {
                    label: "Gotówka",
                    data: clanMoney,
                    backgroundColor:
                        "rgba(155,92,255,0.65)",
                    borderRadius: 7
                }
            ]
        }
    );
}

function createChart(
    canvasId,
    type,
    data,
    extraOptions = {}
) {
    const canvas = $(canvasId);

    if (!canvas) {
        return;
    }

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] =
        new Chart(canvas, {
            type,
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        labels: {
                            color: "#aaa5b5"
                        }
                    }
                },

                scales:
                    type === "doughnut"
                        ? {}
                        : {
                            x: {
                                ticks: {
                                    color: "#6f6a78"
                                },
                                grid: {
                                    color:
                                        "rgba(255,255,255,0.04)"
                                }
                            },

                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: "#6f6a78"
                                },
                                grid: {
                                    color:
                                        "rgba(255,255,255,0.04)"
                                }
                            }
                        },

                ...extraOptions
            }
        });
}

function generatePurpleColors(count) {
    const colors = [];

    for (let i = 0; i < count; i++) {
        const light =
            40 + (i * 8);

        colors.push(
            `hsl(267, ${70 + (i % 3) * 5}%, ${light}%)`
        );
    }

    return colors;
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
            "Rankingi graczy i klanów",
        charts:
            "Wykresy statystyk serwera",
        market:
            "Zmiany wartości klanów",
        search:
            "Znajdź gracza lub klan"
    };

    navItems.forEach((item) => {
        item.addEventListener(
            "click",
            () => {
                const page =
                    item.dataset.page;

                navItems.forEach((nav) =>
                    nav.classList.remove(
                        "active"
                    )
                );

                item.classList.add(
                    "active"
                );

                pages.forEach((section) =>
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
                    title.textContent =
                        item.textContent
                            .trim();
                }

                const subtitle =
                    document.querySelector(
                        ".page-title p"
                    );

                if (subtitle) {
                    subtitle.textContent =
                        subtitles[page] ||
                        "";
                }

                /*
                   Zamknij sidebar na telefonie.
                */

                $("sidebar")
                    ?.classList.remove(
                        "open"
                    );
            }
        );
    });

    /*
       Przyciski data-page-link
    */

    document
        .querySelectorAll(
            "[data-page-link]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    const page =
                        button.dataset
                            .pageLink;

                    const nav =
                        document.querySelector(
                            `.nav-item[data-page="${page}"]`
                        );

                    nav?.click();
                }
            );
        });
}

/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {
    $("mobileMenu")?.addEventListener(
        "click",
        () => {
            $("sidebar")
                ?.classList.toggle(
                    "open"
                );
        }
    );
}

/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function setupSearch() {
    $("playerSearch")
        ?.addEventListener(
            "input",
            renderPlayersTable
        );

    $("clanSearch")
        ?.addEventListener(
            "input",
            () =>
                renderClansTable()
        );

    $("globalSearchPage")
        ?.addEventListener(
            "input",
            (event) =>
                performSearch(
                    event.target.value
                )
        );

    $("globalSearch")
        ?.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key ===
                    "Enter"
                ) {
                    const value =
                        event.target.value;

                    if (!value.trim()) {
                        return;
                    }

                    const searchNav =
                        document.querySelector(
                            '.nav-item[data-page="search"]'
                        );

                    searchNav?.click();

                    const input =
                        $("globalSearchPage");

                    if (input) {
                        input.value =
                            value;

                        performSearch(
                            value
                        );
                    }
                }
            }
        );
}

/* =========================================================
   SORT EVENTS
   ========================================================= */

function setupSorts() {
    $("playerSort")
        ?.addEventListener(
            "change",
            (event) => {
                currentPlayerSort =
                    event.target.value;

                renderPlayersTable();
            }
        );

    $("clanSort")
        ?.addEventListener(
            "change",
            (event) => {
                currentClanSort =
                    event.target.value;

                renderClansTable();
                renderDashboardClans();
            }
        );
}

/* =========================================================
   TOAST
   ========================================================= */

let toastTimeout;

function showToast(message) {
    const toast = $("toast");

    if (!toast) return;

    toast.textContent =
        `✓ ${message}`;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimeout
    );

    toastTimeout =
        setTimeout(() => {
            toast.classList.remove(
                "show"
            );
        }, 2500);
}

/* =========================================================
   REFRESH
   ========================================================= */

async function refreshData(
    showMessage = true
) {
    const button =
        $("refreshButton");

    if (button) {
        button.disabled = true;
        button.innerHTML =
            "↻ Ładowanie...";
    }

    try {
        await loadPlayers();

        updateDashboardStats();

        renderPlayersTable();
        renderRichPlayers();

        renderClansTable();
        renderDashboardClans();

        renderLevelRanking(
            "levelRanking"
        );

        renderLevelRanking(
            "levelRanking2"
        );

        renderMoneyRanking();

        renderMarket();

        await renderCharts();

        if (showMessage) {
            showToast(
                "Statystyki zostały odświeżone"
            );
        }

        console.log(
            "EXODO API — załadowano:",
            players
        );

    } catch (error) {
        console.error(
            "EXODO API ERROR:",
            error
        );

        showToast(
            "Nie udało się pobrać danych z API"
        );
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML =
                "↻ Odśwież";
        }
    }
}

/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setupRefresh() {
    $("refreshButton")
        ?.addEventListener(
            "click",
            () => refreshData(true)
        );
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
    console.log(
        "%cEXODO STATS",
        "color:#9b5cff;font-size:20px;font-weight:800;"
    );

    console.log(
        "API:",
        API_BASE
    );

    setupNavigation();
    setupMobileMenu();
    setupSearch();
    setupSorts();
    setupRefresh();

    await refreshData(false);
}

/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);
