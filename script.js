/* =========================================================
   EXODO STATS
   REAL API + NAVIGATION + TABLES + CHARTS
========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev";


/* =========================================================
   DEMO DATA
   Używane jako zapas, jeśli API chwilowo nie odpowiada.
========================================================= */

let clans = [
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
    }
];


let players = [
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
    }
];


/* =========================================================
   API DATA
========================================================= */

let recentData = [];
let apiOnline = false;


/* =========================================================
   HELPERS
========================================================= */

function formatMoney(number) {

    number = Number(number) || 0;

    return number.toLocaleString("pl-PL") + "$";
}


function formatNumber(number) {

    number = Number(number) || 0;

    return number.toLocaleString("pl-PL");
}


function formatAge(seconds) {

    seconds = Number(seconds) || 0;

    const minutes = Math.floor(seconds / 60);

    const hours = Math.floor(minutes / 60);

    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} dni`;
    }

    if (hours > 0) {
        return `${hours} godz.`;
    }

    return `${minutes} min`;
}


function changeHTML(change) {

    if (change > 0) {
        return `<span class="change-up">▲ ${change}</span>`;
    }

    if (change < 0) {
        return `<span class="change-down">▼ ${Math.abs(change)}</span>`;
    }

    return `<span class="change-none">—</span>`;
}


/* =========================================================
   LOAD REAL DATA FROM EXODO WORKER
========================================================= */

async function loadRealData() {

    console.log("EXODO → pobieranie danych z API...");

    try {

        const response = await fetch(
            `${API_URL}/api/recent?limit=20`,
            {
                method: "GET",
                cache: "no-store"
            }
        );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const result = await response.json();


        console.log(
            "EXODO → odpowiedź API:",
            result
        );


        if (
            !result.success ||
            !Array.isArray(result.data)
        ) {

            throw new Error(
                "Nieprawidłowa odpowiedź API"
            );

        }


        recentData = result.data;

        apiOnline = true;


        /*
         * Dane z Hodowla RP są przede wszystkim
         * historią ostatnich zakupów / zdarzeń.
         *
         * Tworzymy z nich listę graczy.
         */

        const uniquePlayers = [];


        recentData.forEach(item => {

            if (!item.nick) return;


            const exists =
                uniquePlayers.find(
                    player =>
                        player.name === item.nick
                );


            if (!exists) {

                uniquePlayers.push({

                    name: item.nick,

                    level: 0,

                    money: 0,

                    clan: "—",

                    time:
                        Math.floor(
                            (Number(item.ageSeconds) || 0) /
                            86400
                        ),

                    online: false

                });

            }

        });


        /*
         * Jeśli API zwróciło graczy,
         * zastępujemy nimi dane demo.
         */

        if (uniquePlayers.length > 0) {

            players = uniquePlayers;

        }


        /*
         * Aktualizujemy licznik online.
         */

        const onlineElement =
            document.getElementById(
                "onlinePlayers"
            );


        if (onlineElement) {

            onlineElement.textContent =
                formatNumber(
                    uniquePlayers.length
                );

        }


        /*
         * Renderujemy wszystko ponownie.
         */

        renderClanTable();

        renderRichPlayers();

        renderAllRankings();

        renderAllClans();

        renderAllPlayers();

        renderMarket();

        renderRecentActivity();


        updateServerStatus(true);


        console.log(
            `EXODO → pobrano ${recentData.length} rekordów`
        );

    }

    catch (error) {

        apiOnline = false;

        console.error(
            "EXODO → błąd API:",
            error
        );

        updateServerStatus(false);

    }

}


/* =========================================================
   SERVER STATUS
========================================================= */

function updateServerStatus(online) {

    const status =
        document.querySelector(
            ".server-status"
        );

    if (!status) return;


    const text =
        online
            ? "ONLINE"
            : "API OFFLINE";


    const color =
        online
            ? "#4ade80"
            : "#f87171";


    const span =
        status.querySelector(
            "span:last-child"
        );


    if (span) {

        span.textContent = text;

        span.style.color = color;

    }

}


/* =========================================================
   RECENT ACTIVITY
========================================================= */

function renderRecentActivity() {

    console.log(
        "EXODO → ostatnie zdarzenia:",
        recentData
    );

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
        sorted
            .map((player, index) => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="player-name">
                                ${player.name}
                            </span>
                        </td>

                        <td>
                            ${player.level || "—"}
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

            })
            .join("");

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
            .filter(
                player =>
                    Number(
                        player[valueKey]
                    ) > 0
            )
            .sort(
                (a, b) =>
                    b[valueKey] -
                    a[valueKey]
            )
            .slice(0, 5);


    if (!sorted.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Brak danych.</p>
            </div>
        `;

        return;

    }


    const max =
        sorted[0][valueKey];


    container.innerHTML =
        sorted
            .map((player, index) => {

                const percentage =
                    (player[valueKey] / max) *
                    100;


                return `
                    <div class="ranking-row">

                        <span class="ranking-number">
                            ${index + 1}
                        </span>

                        <span class="ranking-name">
                            ${player.name}
                        </span>

                        <div class="ranking-bar">
                            <span
                                style="
                                    width:${percentage}%;
                                "
                            ></span>
                        </div>

                        <span class="ranking-value">
                            ${formatter(
                                player[valueKey]
                            )}
                        </span>

                    </div>
                `;

            })
            .join("");

}


function renderAllRankings() {

    renderRanking(
        "levelRanking",
        players,
        "level",
        value => value
    );


    renderRanking(
        "levelRanking2",
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

function renderAllClans(
    list = clans
) {

    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) return;


    table.innerHTML =
        list
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
        list
            .map((player, index) => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="player-name">
                                ${player.name}
                            </span>
                        </td>

                        <td>
                            ${player.level || "—"}
                        </td>

                        <td>
                            ${formatMoney(
                                player.money
                            )}
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
        clans
            .map((clan, index) => {

                const change =
                    changes[index] || 0;


                return `
                    <tr>

                        <td>
                            <span class="clan-name">
                                [${clan.tag}]
                                ${clan.name}
                            </span>
                        </td>

                        <td>
                            ${formatMoney(
                                clan.wealth
                            )}
                        </td>

                        <td
                            class="${
                                change >= 0
                                    ? "positive"
                                    : "negative"
                            }"
                        >
                            ${
                                change >= 0
                                    ? "+"
                                    : ""
                            }${change}%
                        </td>

                        <td
                            class="${
                                change >= 0
                                    ? "positive"
                                    : "negative"
                            }"
                        >
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

            })
            .join("");

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


    const title =
        pageName.charAt(0).toUpperCase() +
        pageName.slice(1);


    document.title =
        `EXODO STATS — ${title}`;


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
                            .includes(query)

                        ||

                        clan.tag
                            .toLowerCase()
                            .includes(query)

                        ||

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
                        b.money -
                        a.money
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
                        b.time -
                        a.time
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
                            .includes(query)

                        ||

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
                        b.money -
                        a.money
                );

            }


            if (sort === "level") {

                sorted.sort(
                    (a, b) =>
                        b.level -
                        a.level
                );

            }


            if (sort === "time") {

                sorted.sort(
                    (a, b) =>
                        b.time -
                        a.time
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


function performGlobalSearch(
    value = null
) {

    const query =
        (
            value !== null
                ? value
                : globalSearch?.value || ""
        )
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
                    .includes(query)

                ||

                clan.tag
                    .toLowerCase()
                    .includes(query)

        );


    let html = "";


    foundPlayers.forEach(
        player => {

            html += `
                <div class="result-card">

                    <div>

                        <strong>
                            👤 ${player.name}
                        </strong>

                        <small>
                            Gracz
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
                            🛡️
                            [${clan.tag}]
                            ${clan.name}
                        </strong>

                        <small>
                            Klan • lider
                            ${clan.leader}
                        </small>

                    </div>

                    <span>
                        ${formatMoney(
                            clan.money
                        )}
                    </span>

                </div>
            `;

        }
    );


    if (!html) {

        html = `
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

    }


    results.innerHTML = html;

}


if (globalSearchButton) {

    globalSearchButton.addEventListener(
        "click",
        () => performGlobalSearch()
    );

}


if (globalSearch) {

    globalSearch.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                performGlobalSearch();

            }

        }
    );

}


/* =========================================================
   SEARCH PAGE
========================================================= */

const globalSearchPage =
    document.getElementById(
        "globalSearchPage"
    );


if (globalSearchPage) {

    globalSearchPage.addEventListener(
        "input",
        () => {

            performGlobalSearch(
                globalSearchPage.value
            );

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


            await loadRealData();


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


if (
    mobileMenu &&
    sidebar
) {

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


    if (!apiOnline) {

        element.textContent =
            "—";

    }

}


/* =========================================================
   CHART SETUP
========================================================= */

function setupCanvas(
    canvas
) {

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

        width:
            rect.width,

        height:
            rect.height

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
        width -
        padding * 2;


    const chartHeight =
        height -
        padding * 2;


    const max =
        Math.max(
            ...values
        ) * 1.15;


    const min = 0;


    ctx.lineWidth = 1;


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            padding +
            (chartHeight / 4) *
            i;


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


    ctx.beginPath();


    values.forEach(
        (value, index) => {

            const x =
                padding +
                (
                    chartWidth /
                    (values.length - 1)
                ) *
                index;


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


    values.forEach(
        (value, index) => {

            const x =
                padding +
                (
                    chartWidth /
                    (values.length - 1)
                ) *
                index;


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
                ) *
                index;


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
        Math.max(
            ...values
        ) * 1.15;


    const chartHeight =
        height - 65;


    const availableWidth =
        width -
        padding * 2;


    const barWidth =
        (
            availableWidth /
            values.length
        ) * 0.55;


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
                    (
                        availableWidth /
                        values.length
                    ) -
                    barWidth
                ) / 2;


            const barHeight =
                (
                    value /
                    max
                ) *
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

async function initExodo() {

    console.log(
        "%cEXODO STATS",
        "color:#a75aff;font-size:24px;font-weight:bold"
    );


    console.log(
        "Panel uruchomiony."
    );


    renderClanTable();

    renderRichPlayers();

    renderAllRankings();

    renderAllClans();

    renderAllPlayers();

    renderMarket();

    updateOnlinePlayers();


    setTimeout(
        createExodoCharts,
        300
    );


    /*
     * NAJWAŻNIEJSZE:
     * pobieramy prawdziwe dane z Workera.
     */

    await loadRealData();

}


/* =========================================================
   RESIZE
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

initExodo();
