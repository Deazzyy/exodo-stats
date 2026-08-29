/* =========================================================
   EXODO STATS
   REAL API + DEMO STATISTICS
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev";


/* =========================================================
   DEMO DATA
   ========================================================= */

const clans = [
    {
        rank: 1,
        tag: "EXO",
        name: "EXODO",
        leader: "Deazzyy",
        members: 18,
        money: 4250000,
        wealth: 12450000,
        time: 126,
        change: 2
    },
    {
        rank: 2,
        tag: "HOD",
        name: "Hodowla",
        leader: "d3vki",
        members: 17,
        money: 3820000,
        wealth: 10120000,
        time: 104,
        change: 1
    },
    {
        rank: 3,
        tag: "KGB",
        name: "KGB",
        leader: "KGB123",
        members: 16,
        money: 3100000,
        wealth: 9560000,
        time: 98,
        change: -1
    },
    {
        rank: 4,
        tag: "BLO",
        name: "Bloods",
        leader: "szymekk",
        members: 15,
        money: 2750000,
        wealth: 8340000,
        time: 75,
        change: 3
    },
    {
        rank: 5,
        tag: "RDM",
        name: "Random",
        leader: "losiu",
        members: 14,
        money: 2230000,
        wealth: 6780000,
        time: 63,
        change: -1
    },
    {
        rank: 6,
        tag: "THC",
        name: "THC",
        leader: "mocarz",
        members: 13,
        money: 1980000,
        wealth: 5930000,
        time: 58,
        change: 2
    },
    {
        rank: 7,
        tag: "777",
        name: "777",
        leader: "seven",
        members: 12,
        money: 1650000,
        wealth: 4890000,
        time: 47,
        change: -2
    },
    {
        rank: 8,
        tag: "BRK",
        name: "Breakers",
        leader: "brk",
        members: 12,
        money: 1420000,
        wealth: 4120000,
        time: 43,
        change: 0
    },
    {
        rank: 9,
        tag: "LUX",
        name: "Luxury",
        leader: "luxik",
        members: 11,
        money: 1210000,
        wealth: 3650000,
        time: 39,
        change: 1
    },
    {
        rank: 10,
        tag: "ZAB",
        name: "Zabojczy",
        leader: "killer",
        members: 10,
        money: 1080000,
        wealth: 3120000,
        time: 34,
        change: 1
    }
];


const players = [
    {
        name: "Deazzyy",
        level: 120,
        money: 2450000,
        clan: "EXO",
        time: 48,
        online: true
    },
    {
        name: "d3vki",
        level: 115,
        money: 2120000,
        clan: "HOD",
        time: 42,
        online: true
    },
    {
        name: "KGB123",
        level: 112,
        money: 1890000,
        clan: "KGB",
        time: 39,
        online: false
    },
    {
        name: "szymekk",
        level: 108,
        money: 1560000,
        clan: "BLO",
        time: 35,
        online: true
    },
    {
        name: "mocarz",
        level: 105,
        money: 1420000,
        clan: "THC",
        time: 31,
        online: true
    },
    {
        name: "seven",
        level: 103,
        money: 1250000,
        clan: "777",
        time: 29,
        online: false
    },
    {
        name: "losiu",
        level: 100,
        money: 1120000,
        clan: "RDM",
        time: 26,
        online: true
    },
    {
        name: "brk",
        level: 98,
        money: 980000,
        clan: "BRK",
        time: 24,
        online: false
    },
    {
        name: "luxik",
        level: 95,
        money: 860000,
        clan: "LUX",
        time: 21,
        online: true
    },
    {
        name: "killer",
        level: 92,
        money: 780000,
        clan: "ZAB",
        time: 19,
        online: false
    },
    {
        name: "Shadow",
        level: 89,
        money: 730000,
        clan: "EXO",
        time: 18,
        online: true
    },
    {
        name: "Vortex",
        level: 86,
        money: 690000,
        clan: "HOD",
        time: 17,
        online: false
    },
    {
        name: "Nox",
        level: 83,
        money: 620000,
        clan: "KGB",
        time: 16,
        online: true
    },
    {
        name: "Raven",
        level: 80,
        money: 590000,
        clan: "BLO",
        time: 15,
        online: false
    },
    {
        name: "Ghost",
        level: 77,
        money: 510000,
        clan: "THC",
        time: 14,
        online: true
    }
];


/* =========================================================
   REAL API DATA
   ========================================================= */

let recentPurchases = [];


/* =========================================================
   HELPERS
   ========================================================= */

function formatMoney(number) {

    return Number(number || 0)
        .toLocaleString("pl-PL") + "$";

}


function formatNumber(number) {

    return Number(number || 0)
        .toLocaleString("pl-PL");

}


function formatAge(seconds) {

    seconds = Number(seconds || 0);

    const minutes =
        Math.floor(seconds / 60);

    const hours =
        Math.floor(minutes / 60);

    const days =
        Math.floor(hours / 24);


    if (days > 0) {

        return `${days}d ${hours % 24}h`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes % 60}m`;

    }


    return `${minutes}m`;

}


function changeHTML(change) {

    if (change > 0) {

        return `
            <span class="change-up">
                ▲ ${change}
            </span>
        `;

    }


    if (change < 0) {

        return `
            <span class="change-down">
                ▼ ${Math.abs(change)}
            </span>
        `;

    }


    return `
        <span class="change-none">
            —
        </span>
    `;

}


/* =========================================================
   API — RECENT
   ========================================================= */

async function loadRecentPurchases() {

    const url =
        `${API_URL}/api/recent?limit=20`;

    console.log(
        "%cEXODO API",
        "color:#a75aff;font-size:18px;font-weight:bold"
    );

    console.log(
        "Pobieranie danych:",
        url
    );


    try {

        const response =
            await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const json =
            await response.json();


        if (
            !json ||
            json.success !== true ||
            !Array.isArray(json.data)
        ) {

            throw new Error(
                "Nieprawidłowa odpowiedź API"
            );

        }


        recentPurchases =
            json.data;


        console.log(
            "%c✓ API działa",
            "color:#4ade80;font-weight:bold"
        );

        console.log(
            "Pobrano rekordów:",
            recentPurchases.length
        );


        renderRecentPurchases();


        updateApiStatus(true);


        return recentPurchases;

    } catch (error) {

        console.error(
            "❌ Błąd API:",
            error
        );


        updateApiStatus(false);


        return [];

    }

}


/* =========================================================
   API STATUS
   ========================================================= */

function updateApiStatus(online) {

    const possibleElements = [
        "apiStatus",
        "connectionStatus",
        "serverStatus"
    ];


    possibleElements.forEach(id => {

        const element =
            document.getElementById(id);

        if (!element) return;


        if (online) {

            element.textContent =
                "ONLINE";

            element.classList.add(
                "positive"
            );

            element.classList.remove(
                "negative"
            );

        } else {

            element.textContent =
                "OFFLINE";

            element.classList.add(
                "negative"
            );

            element.classList.remove(
                "positive"
            );

        }

    });

}


/* =========================================================
   RECENT PURCHASES
   ========================================================= */

function renderRecentPurchases() {

    const possibleIds = [
        "recentTable",
        "recentPurchasesTable",
        "recentPlayersTable"
    ];


    let table = null;


    for (const id of possibleIds) {

        const element =
            document.getElementById(id);

        if (element) {

            table = element;
            break;

        }

    }


    if (!table) {

        console.log(
            "Brak tabeli recent w HTML."
        );

        return;

    }


    if (!recentPurchases.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    Brak danych.
                </td>
            </tr>
        `;

        return;

    }


    table.innerHTML =
        recentPurchases.map(item => {

            return `
                <tr>

                    <td>
                        <span class="player-name">
                            ${escapeHTML(item.nick)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(item.productId)}
                    </td>

                    <td>
                        ${formatAge(item.ageSeconds)}
                    </td>

                    <td>
                        <span class="positive">
                            AKTYWNY
                        </span>
                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   DASHBOARD CLAN TABLE
   ========================================================= */

function renderClanTable() {

    const table =
        document.getElementById(
            "clanTable"
        );

    if (!table) return;


    table.innerHTML =
        clans
            .slice(0, 10)
            .map(clan => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${clan.rank}
                        </td>

                        <td>
                            <span class="clan-name">
                                [${clan.tag}] ${clan.name}
                            </span>
                        </td>

                        <td>
                            ${clan.leader}
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
                            ${clan.time} dni
                        </td>

                        <td>
                            ${changeHTML(clan.change)}
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

    const table =
        document.getElementById(
            "richPlayersTable"
        );

    if (!table) return;


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);


    table.innerHTML =
        sorted.map(
            (player, index) => {

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
                            ${player.level}
                        </td>

                        <td>
                            ${formatMoney(player.money)}
                        </td>

                        <td>
                            <span class="clan-tag">
                                [${player.clan}]
                            </span>
                        </td>

                        <td>
                            ${player.time} dni
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   SMALL RANKINGS
   ========================================================= */

function renderRanking(
    elementId,
    data,
    valueKey,
    formatter
) {

    const container =
        document.getElementById(
            elementId
        );

    if (!container) return;


    const sorted =
        [...data]
            .sort(
                (a, b) =>
                    b[valueKey] -
                    a[valueKey]
            )
            .slice(0, 5);


    if (!sorted.length) return;


    const max =
        sorted[0][valueKey];


    container.innerHTML =
        sorted.map(
            (player, index) => {

                const percentage =
                    max > 0
                        ? (
                            player[valueKey] /
                            max
                        ) * 100
                        : 0;


                return `
                    <div class="ranking-row">

                        <span class="ranking-number">
                            ${index + 1}
                        </span>

                        <span class="ranking-name">
                            ${escapeHTML(player.name)}
                        </span>

                        <div class="ranking-bar">
                            <span
                                style="width:${percentage}%">
                            </span>
                        </div>

                        <span class="ranking-value">
                            ${formatter(player[valueKey])}
                        </span>

                    </div>
                `;

            }
        ).join("");

}


function renderAllRankings() {

    renderRanking(
        "levelRanking",
        players,
        "level",
        value => value
    );


    renderRanking(
        "moneyRanking",
        players,
        "money",
        formatMoney
    );


    renderRanking(
        "timeRanking",
        players,
        "time",
        value => value + " dni"
    );

}


/* =========================================================
   ALL CLANS
   ========================================================= */

function renderAllClans(list = clans) {

    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) return;


    table.innerHTML =
        list.map(clan => {

            return `
                <tr>

                    <td class="rank-number">
                        ${clan.rank}
                    </td>

                    <td>
                        <span class="clan-name">
                            [${clan.tag}] ${clan.name}
                        </span>
                    </td>

                    <td>
                        ${clan.leader}
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
                        ${clan.time} dni
                    </td>

                    <td>
                        ${changeHTML(clan.change)}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================================
   ALL PLAYERS
   ========================================================= */

function renderAllPlayers(
    list = players
) {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (!table) return;


    table.innerHTML =
        list.map(
            (player, index) => {

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
                            ${player.level}
                        </td>

                        <td>
                            ${formatMoney(player.money)}
                        </td>

                        <td>
                            <span class="clan-tag">
                                [${player.clan}]
                            </span>
                        </td>

                        <td>
                            ${player.time} dni
                        </td>

                        <td>
                            ${
                                player.online
                                ?
                                `<span class="positive">
                                    ● ONLINE
                                </span>`
                                :
                                `<span style="color:#55515c">
                                    ● OFFLINE
                                </span>`
                            }
                        </td>

                    </tr>
                `;

            }
        ).join("");

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


    const changes = [
        18.4,
        11.2,
        8.7,
        6.5,
        4.8,
        2.1,
        -1.8,
        -3.4,
        -5.1,
        -7.2
    ];


    table.innerHTML =
        clans.map(
            (clan, index) => {

                const change =
                    changes[index];


                return `
                    <tr>

                        <td>
                            <span class="clan-name">
                                [${clan.tag}] ${clan.name}
                            </span>
                        </td>

                        <td>
                            ${formatMoney(clan.wealth)}
                        </td>

                        <td class="${
                            change >= 0
                                ? "positive"
                                : "negative"
                        }">
                            ${
                                change >= 0
                                    ? "+"
                                    : ""
                            }${change}%
                        </td>

                        <td class="${
                            change >= 0
                                ? "positive"
                                : "negative"
                        }">
                            ${
                                change >= 0
                                    ? "+"
                                    : ""
                            }${(
                                change * 2.2
                            ).toFixed(1)}%
                        </td>

                        <td>
                            <span class="positive">
                                AKTYWNY
                            </span>
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   NAVIGATION
   ========================================================= */

const navItems =
    document.querySelectorAll(
        ".nav-item"
    );


navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            const pageName =
                item.dataset.page;


            openPage(pageName);

        }
    );

});


function openPage(pageName) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active"
            );

        });


    const target =
        document.getElementById(
            pageName
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );

    });


    document.title =
        `EXODO STATS — ${
            pageName.charAt(0).toUpperCase() +
            pageName.slice(1)
        }`;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    document
        .getElementById("sidebar")
        ?.classList.remove("open");

}


/* =========================================================
   DASHBOARD LINKS
   ========================================================= */

document
    .querySelectorAll("[data-page-link]")
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


/* =========================================================
   CLAN SEARCH
   ========================================================= */

const clanSearch =
    document.getElementById(
        "clanSearch"
    );


if (clanSearch) {

    clanSearch.addEventListener(
        "input",
        () => {

            const query =
                clanSearch.value
                    .toLowerCase()
                    .trim();


            const filtered =
                clans.filter(clan => {

                    return (
                        clan.name
                            .toLowerCase()
                            .includes(query) ||

                        clan.tag
                            .toLowerCase()
                            .includes(query) ||

                        clan.leader
                            .toLowerCase()
                            .includes(query)
                    );

                });


            renderAllClans(
                filtered
            );

        }
    );

}


/* =========================================================
   CLAN SORT
   ========================================================= */

const clanSort =
    document.getElementById(
        "clanSort"
    );


if (clanSort) {

    clanSort.addEventListener(
        "change",
        () => {

            const sort =
                clanSort.value;


            let sorted =
                [...clans];


            if (sort === "money") {

                sorted.sort(
                    (a, b) =>
                        b.money - a.money
                );

            }


            if (sort === "members") {

                sorted.sort(
                    (a, b) =>
                        b.members -
                        a.members
                );

            }


            if (sort === "time") {

                sorted.sort(
                    (a, b) =>
                        b.time - a.time
                );

            }


            renderAllClans(
                sorted
            );

        }
    );

}


/* =========================================================
   PLAYER SEARCH
   ========================================================= */

const playerSearch =
    document.getElementById(
        "playerSearch"
    );


if (playerSearch) {

    playerSearch.addEventListener(
        "input",
        () => {

            const query =
                playerSearch.value
                    .toLowerCase()
                    .trim();


            const filtered =
                players.filter(player => {

                    return (
                        player.name
                            .toLowerCase()
                            .includes(query) ||

                        player.clan
                            .toLowerCase()
                            .includes(query)
                    );

                });


            renderAllPlayers(
                filtered
            );

        }
    );

}


/* =========================================================
   PLAYER SORT
   ========================================================= */

const playerSort =
    document.getElementById(
        "playerSort"
    );


if (playerSort) {

    playerSort.addEventListener(
        "change",
        () => {

            const sort =
                playerSort.value;


            let sorted =
                [...players];


            if (sort === "money") {

                sorted.sort(
                    (a, b) =>
                        b.money - a.money
                );

            }


            if (sort === "level") {

                sorted.sort(
                    (a, b) =>
                        b.level - a.level
                );

            }


            if (sort === "time") {

                sorted.sort(
                    (a, b) =>
                        b.time - a.time
                );

            }


            renderAllPlayers(
                sorted
            );

        }
    );

}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

const globalSearch =
    document.getElementById(
        "globalSearch"
    );


const globalSearchButton =
    document.getElementById(
        "globalSearchButton"
    );


function performGlobalSearch() {

    if (!globalSearch) return;


    const query =
        globalSearch.value
            .toLowerCase()
            .trim();


    const results =
        document.getElementById(
            "searchResults"
        );


    if (!results) return;


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


    const foundPlayers =
        players.filter(
            player =>
                player.name
                    .toLowerCase()
                    .includes(query)
        );


    const foundClans =
        clans.filter(
            clan =>
                clan.name
                    .toLowerCase()
                    .includes(query) ||

                clan.tag
                    .toLowerCase()
                    .includes(query)
        );


    const total =
        foundPlayers.length +
        foundClans.length;


    if (!total) {

        results.innerHTML = `
            <div class="empty-state">

                <div>×</div>

                <h3>
                    Nie znaleziono wyników
                </h3>

                <p>
                    Spróbuj wyszukać inną nazwę.
                </p>

            </div>
        `;

        return;

    }


    let html = "";


    foundPlayers.forEach(
        player => {

            html += `
                <div class="result-card">

                    <div>

                        <strong>
                            👤 ${escapeHTML(player.name)}
                        </strong>

                        <small>
                            Gracz • poziom ${player.level}
                        </small>

                    </div>

                    <span class="clan-tag">
                        [${player.clan}]
                    </span>

                </div>
            `;

        }
    );


    foundClans.forEach(
        clan => {

            html += `
                <div class="result-card">

                    <div>

                        <strong>
                            🛡️ [${clan.tag}]
                            ${escapeHTML(clan.name)}
                        </strong>

                        <small>
                            Klan • lider
                            ${escapeHTML(clan.leader)}
                        </small>

                    </div>

                    <span>
                        ${formatMoney(clan.money)}
                    </span>

                </div>
            `;

        }
    );


    results.innerHTML =
        html;

}


if (globalSearchButton) {

    globalSearchButton.addEventListener(
        "click",
        performGlobalSearch
    );

}


if (globalSearch) {

    globalSearch.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                performGlobalSearch();

            }

        }
    );

}


/* =========================================================
   REFRESH
   ========================================================= */

const refreshButton =
    document.getElementById(
        "refreshButton"
    );


const toast =
    document.getElementById(
        "toast"
    );


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async () => {

            refreshButton.style.transform =
                "rotate(360deg)";


            setTimeout(() => {

                refreshButton.style.transform =
                    "";

            }, 500);


            await loadRecentPurchases();


            const now =
                new Date();


            const time =
                now.toLocaleTimeString(
                    "pl-PL",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            const updateElement =
                document.getElementById(
                    "lastUpdate"
                );


            if (updateElement) {

                updateElement.textContent =
                    `dzisiaj, ${time}`;

            }


            if (toast) {

                toast.classList.add(
                    "show"
                );


                setTimeout(() => {

                    toast.classList.remove(
                        "show"
                    );

                }, 2500);

            }

        }
    );

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

const mobileMenu =
    document.getElementById(
        "mobileMenu"
    );


const sidebar =
    document.getElementById(
        "sidebar"
    );


if (mobileMenu && sidebar) {

    mobileMenu.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   ONLINE COUNTER
   ========================================================= */

function updateOnlinePlayers() {

    const element =
        document.getElementById(
            "onlinePlayers"
        );

    if (!element) return;


    const base = 132;


    const random =
        Math.floor(
            Math.random() * 15
        ) - 7;


    element.textContent =
        base + random;

}


/* =========================================================
   CANVAS SETUP
   ========================================================= */

function setupCanvas(canvas) {

    if (!canvas) return null;


    const rect =
        canvas.getBoundingClientRect();


    const ratio =
        window.devicePixelRatio || 1;


    canvas.width =
        rect.width * ratio;


    canvas.height =
        rect.height * ratio;


    const ctx =
        canvas.getContext("2d");


    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    return {
        ctx,
        width: rect.width,
        height: rect.height
    };

}


/* =========================================================
   LINE CHART
   ========================================================= */

function drawLineChart(
    canvasId,
    values,
    labels
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) return;


    const setup =
        setupCanvas(canvas);


    if (!setup) return;


    const {
        ctx,
        width,
        height
    } = setup;


    const padding = 35;


    const chartWidth =
        width - padding * 2;


    const chartHeight =
        height - padding * 2;


    const max =
        Math.max(...values) * 1.15;


    const min = 0;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /* GRID */

    ctx.lineWidth = 1;


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            padding +
            (chartHeight / 4) * i;


        ctx.beginPath();


        ctx.moveTo(
            padding,
            y
        );


        ctx.lineTo(
            width - padding,
            y
        );


        ctx.strokeStyle =
            "rgba(255,255,255,0.06)";


        ctx.stroke();

    }


    /* LINE */

    ctx.beginPath();


    values.forEach(
        (value, index) => {

            const x =
                padding +
                (
                    chartWidth /
                    (values.length - 1)
                ) * index;


            const y =
                padding +
                chartHeight -
                (
                    (value - min) /
                    (max - min)
                ) *
                chartHeight;


            if (index === 0) {

                ctx.moveTo(
                    x,
                    y
                );

            } else {

                ctx.lineTo(
                    x,
                    y
                );

            }

        }
    );


    ctx.strokeStyle =
        "#9b5cff";


    ctx.lineWidth = 3;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    ctx.shadowBlur = 15;


    ctx.shadowColor =
        "rgba(155,92,255,0.5)";


    ctx.stroke();


    ctx.shadowBlur = 0;


    /* POINTS */

    values.forEach(
        (value, index) => {

            const x =
                padding +
                (
                    chartWidth /
                    (values.length - 1)
                ) * index;


            const y =
                padding +
                chartHeight -
                (
                    (value - min) /
                    (max - min)
                ) *
                chartHeight;


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                4,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                "#9b5cff";


            ctx.fill();

        }
    );


    /* LABELS */

    ctx.font =
        "10px Inter, Arial";


    ctx.fillStyle =
        "#6f6a78";


    ctx.textAlign =
        "center";


    labels.forEach(
        (label, index) => {

            const x =
                padding +
                (
                    chartWidth /
                    (labels.length - 1)
                ) * index;


            ctx.fillText(
                label,
                x,
                height - 10
            );

        }
    );

}


/* =========================================================
   BAR CHART
   ========================================================= */

function drawBarChart(
    canvasId,
    values,
    labels
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) return;


    const setup =
        setupCanvas(canvas);


    if (!setup) return;


    const {
        ctx,
        width,
        height
    } = setup;


    const padding = 30;


    const max =
        Math.max(...values) * 1.15;


    const chartHeight =
        height - 65;


    const availableWidth =
        width - padding * 2;


    const barWidth =
        availableWidth /
        values.length *
        0.55;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    values.forEach(
        (value, index) => {

            const x =
                padding +
                index *
                (
                    availableWidth /
                    values.length
                ) +
                (
                    availableWidth /
                    values.length -
                    barWidth
                ) / 2;


            const barHeight =
                (value / max) *
                chartHeight;


            const y =
                height -
                35 -
                barHeight;


            const gradient =
                ctx.createLinearGradient(
                    0,
                    y,
                    0,
                    height
                );


            gradient.addColorStop(
                0,
                "#b982ff"
            );


            gradient.addColorStop(
                1,
                "#7139c7"
            );


            ctx.fillStyle =
                gradient;


            ctx.beginPath();


            if (
                typeof ctx.roundRect ===
                "function"
            ) {

                ctx.roundRect(
                    x,
                    y,
                    barWidth,
                    barHeight,
                    7
                );

            } else {

                ctx.rect(
                    x,
                    y,
                    barWidth,
                    barHeight
                );

            }


            ctx.fill();


            ctx.font =
                "9px Inter, Arial";


            ctx.fillStyle =
                "#77717f";


            ctx.textAlign =
                "center";


            ctx.fillText(
                labels[index],
                x + barWidth / 2,
                height - 12
            );

        }
    );

}


/* =========================================================
   CREATE CHARTS
   ========================================================= */

function createExodoCharts() {

    drawLineChart(
        "activityChart",
        [
            94,
            121,
            138,
            127,
            156,
            171,
            182
        ],
        [
            "Pn",
            "Wt",
            "Śr",
            "Czw",
            "Pt",
            "Sob",
            "Nd"
        ]
    );


    drawLineChart(
        "activityChart2",
        [
            94,
            121,
            138,
            127,
            156,
            171,
            182
        ],
        [
            "Pn",
            "Wt",
            "Śr",
            "Czw",
            "Pt",
            "Sob",
            "Nd"
        ]
    );


    drawBarChart(
        "clanChart",
        [
            12.4,
            10.1,
            9.5,
            8.3,
            6.7,
            5.9,
            4.8,
            4.1,
            3.6,
            3.1
        ],
        [
            "EXO",
            "HOD",
            "KGB",
            "BLO",
            "RDM",
            "THC",
            "777",
            "BRK",
            "LUX",
            "ZAB"
        ]
    );


    drawBarChart(
        "wealthChart",
        [
            12.4,
            10.1,
            9.5,
            8.3,
            6.7,
            5.9,
            4.8,
            4.1,
            3.6,
            3.1
        ],
        [
            "EXO",
            "HOD",
            "KGB",
            "BLO",
            "RDM",
            "THC",
            "777",
            "BRK",
            "LUX",
            "ZAB"
        ]
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeExodo() {

    console.log(
        "%cEXODO STATS",
        "color:#a75aff;font-size:24px;font-weight:bold"
    );


    console.log(
        "Panel uruchomiony."
    );


    /* DEMO */

    renderClanTable();
    renderRichPlayers();
    renderAllRankings();
    renderAllClans();
    renderAllPlayers();
    renderMarket();
    updateOnlinePlayers();


    /* REAL API */

    loadRecentPurchases();


    /* CHARTS */

    setTimeout(
        () => {

            createExodoCharts();

        },
        300
    );

}


/* =========================================================
   CHARTS ON RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            window.exodoResize
        );


        window.exodoResize =
            setTimeout(
                () => {

                    createExodoCharts();

                },
                250
            );

    }
);


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeExodo
    );

} else {

    initializeExodo();

}
