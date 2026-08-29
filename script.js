/* =========================================================
   EXODO STATS
   REAL HODOWLA RP API
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev";

const RECENT_URL =
    `${API_URL}/api/recent?limit=20`;


/* =========================================================
   DEMO CLANS
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


/* =========================================================
   REAL PLAYERS
   ========================================================= */

let players = [];


/* =========================================================
   HELPERS
   ========================================================= */

function formatMoney(number) {

    if (
        number === null ||
        number === undefined ||
        isNaN(number)
    ) {
        return "—";
    }

    return Number(number).toLocaleString("pl-PL") + "$";
}


function formatNumber(number) {

    if (
        number === null ||
        number === undefined ||
        isNaN(number)
    ) {
        return "—";
    }

    return Number(number).toLocaleString("pl-PL");
}


function formatAge(seconds) {

    if (
        seconds === null ||
        seconds === undefined ||
        isNaN(seconds)
    ) {
        return "—";
    }

    const totalMinutes =
        Math.floor(Number(seconds) / 60);

    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;

    if (hours < 24) {
        return `${hours}h ${minutes}m`;
    }

    const days =
        Math.floor(hours / 24);

    const remainingHours =
        hours % 24;

    return `${days}d ${remainingHours}h`;
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
   API
   ========================================================= */

async function loadPlayersFromAPI() {

    console.log(
        "%cEXODO API — pobieranie danych...",
        "color:#a75aff;font-size:16px;font-weight:bold"
    );

    try {

        const response =
            await fetch(
                RECENT_URL,
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


        const json =
            await response.json();


        console.log(
            "EXODO API RESPONSE:",
            json
        );


        if (
            !json.success ||
            !Array.isArray(json.data)
        ) {

            throw new Error(
                "API nie zwróciło poprawnych danych."
            );

        }


        /*
         * API zwraca wydarzenia.
         *
         * Ten sam gracz może pojawić się
         * kilka razy, dlatego grupujemy po UUID.
         */

        const playerMap =
            new Map();


        json.data.forEach(item => {

            if (!item.uuid || !item.nick) {
                return;
            }


            const existing =
                playerMap.get(item.uuid);


            /*
             * Zostawiamy najnowsze wydarzenie
             * danego gracza.
             */

            if (
                !existing ||
                Number(item.ageSeconds) <
                Number(existing.ageSeconds)
            ) {

                playerMap.set(
                    item.uuid,
                    item
                );

            }

        });


        players =
            Array.from(
                playerMap.values()
            ).map(item => {

                return {

                    uuid: item.uuid,

                    name: item.nick,

                    productId:
                        item.productId || "—",

                    ageSeconds:
                        Number(item.ageSeconds) || 0,

                    /*
                     * Tych informacji obecny endpoint
                     * NIE zwraca.
                     */

                    level: null,

                    money: null,

                    clan: null,

                    time: null,

                    online: null

                };

            });


        console.log(
            `EXODO: pobrano ${players.length} unikalnych graczy.`
        );


        renderRealPlayers();

        updateDashboardPlayerCount();

        renderRichPlayers();

        renderAllRankings();

        updateOnlinePlayers();


    } catch (error) {

        console.error(
            "EXODO API ERROR:",
            error
        );


        players = [];


        showAPIError();


        renderRealPlayers();

        updateDashboardPlayerCount();

    }

}


/* =========================================================
   API ERROR
   ========================================================= */

function showAPIError() {

    const table =
        document.getElementById(
            "allPlayersTable"
        );


    if (!table) return;


    table.innerHTML = `

        <tr>

            <td colspan="7"
                style="
                    text-align:center;
                    padding:40px;
                    color:#ff6b6b;
                ">

                <strong>
                    Nie udało się pobrać danych graczy.
                </strong>

                <br>

                <small>
                    Sprawdź połączenie z EXODO API.
                </small>

            </td>

        </tr>

    `;

}


/* =========================================================
   REAL PLAYER TABLE
   ========================================================= */

function renderRealPlayers(list = players) {

    const table =
        document.getElementById(
            "allPlayersTable"
        );


    if (!table) return;


    if (!list.length) {

        table.innerHTML = `

            <tr>

                <td colspan="7"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#777;
                    ">

                    Brak danych graczy.

                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        list.map((player, index) => {

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
                        ${player.level ?? "—"}
                    </td>


                    <td>
                        ${formatMoney(player.money)}
                    </td>


                    <td>

                        <span class="clan-tag">
                            [${
                                player.clan
                                ??
                                "—"
                            }]
                        </span>

                    </td>


                    <td>

                        ${
                            player.ageSeconds !== null
                            ?
                            formatAge(
                                player.ageSeconds
                            )
                            :
                            "—"
                        }

                    </td>


                    <td>

                        <span
                            style="color:#77717f"
                        >
                            ● DANE API
                        </span>

                    </td>

                </tr>

            `;

        }).join("");

}


/* =========================================================
   DASHBOARD PLAYER COUNT
   ========================================================= */

function updateDashboardPlayerCount() {

    const elements =
        document.querySelectorAll(
            ".stat-value"
        );


    /*
     * Pierwsza karta to GRACZE.
     */

    if (
        elements.length > 0 &&
        players.length > 0
    ) {

        elements[0].textContent =
            formatNumber(
                players.length
            );

    }

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


    /*
     * Ponieważ API /recent nie zwraca
     * pieniędzy graczy, nie udajemy
     * że je znamy.
     */

    const sorted =
        [...players]
            .slice(0, 10);


    table.innerHTML =
        sorted.map((player, index) => {

            return `

                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>

                        <span class="player-name">
                            ${escapeHTML(
                                player.name
                            )}
                        </span>

                    </td>

                    <td>
                        —
                    </td>

                    <td>
                        —
                    </td>

                    <td>

                        <span class="clan-tag">
                            [—]
                        </span>

                    </td>

                    <td>
                        ${formatAge(
                            player.ageSeconds
                        )}
                    </td>

                </tr>

            `;

        }).join("");

}


/* =========================================================
   RANKINGS
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


    const usable =
        data.filter(
            player =>
                player[valueKey] !== null &&
                player[valueKey] !== undefined
        );


    if (!usable.length) {

        container.innerHTML = `

            <div
                style="
                    padding:25px;
                    text-align:center;
                    color:#77717f;
                "
            >

                Brak danych z API dla tego rankingu.

            </div>

        `;

        return;

    }


    const sorted =
        [...usable]
            .sort(
                (a, b) =>
                    b[valueKey] -
                    a[valueKey]
            )
            .slice(0, 5);


    const max =
        sorted[0][valueKey];


    container.innerHTML =
        sorted.map(
            (player, index) => {

                const percentage =
                    (player[valueKey] / max) *
                    100;


                return `

                    <div class="ranking-row">

                        <span class="ranking-number">
                            ${index + 1}
                        </span>

                        <span class="ranking-name">
                            ${escapeHTML(
                                player.name
                            )}
                        </span>

                        <div class="ranking-bar">

                            <span
                                style="
                                    width:${percentage}%
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
        value =>
            value + " dni"
    );

}


/* =========================================================
   CLAN TABLE
   ========================================================= */

function renderClanTable() {

    const table =
        document.getElementById(
            "clanTable"
        );


    if (!table) return;


    table.innerHTML =
        clans.slice(0, 10)
            .map(clan => {

                return `

                    <tr>

                        <td class="rank-number">
                            ${clan.rank}
                        </td>

                        <td>

                            <span class="clan-name">
                                [${clan.tag}]
                                ${clan.name}
                            </span>

                        </td>

                        <td>
                            ${clan.leader}
                        </td>

                        <td>
                            ${clan.members}
                        </td>

                        <td>
                            ${formatMoney(
                                clan.money
                            )}
                        </td>

                        <td>
                            ${formatMoney(
                                clan.wealth
                            )}
                        </td>

                        <td>
                            ${clan.time} dni
                        </td>

                        <td>
                            ${changeHTML(
                                clan.change
                            )}
                        </td>

                    </tr>

                `;

            })
            .join("");

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
        list.map(clan => {

            return `

                <tr>

                    <td class="rank-number">
                        ${clan.rank}
                    </td>

                    <td>

                        <span class="clan-name">
                            [${clan.tag}]
                            ${clan.name}
                        </span>

                    </td>

                    <td>
                        ${clan.leader}
                    </td>

                    <td>
                        ${clan.members}
                    </td>

                    <td>
                        ${formatMoney(
                            clan.money
                        )}
                    </td>

                    <td>
                        ${formatMoney(
                            clan.wealth
                        )}
                    </td>

                    <td>
                        ${clan.time} dni
                    </td>

                    <td>
                        ${changeHTML(
                            clan.change
                        )}
                    </td>

                </tr>

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
                            }${
                                (
                                    change * 2.2
                                ).toFixed(1)
                            }%
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
   SEARCH — CLANS
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
                clans.filter(
                    clan =>
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
                players.filter(
                    player =>
                        player.name
                            .toLowerCase()
                            .includes(query)
                );


            renderRealPlayers(
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


            if (sort === "time") {

                sorted.sort(
                    (a, b) =>
                        a.ageSeconds -
                        b.ageSeconds
                );

            }


            if (sort === "level") {

                sorted.sort(
                    (a, b) =>
                        (
                            b.level ?? 0
                        ) -
                        (
                            a.level ?? 0
                        )
                );

            }


            if (sort === "money") {

                sorted.sort(
                    (a, b) =>
                        (
                            b.money ?? 0
                        ) -
                        (
                            a.money ?? 0
                        )
                );

            }


            renderRealPlayers(
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
    customInput = null
) {

    const input =
        customInput ||
        globalSearch;


    if (!input) return;


    const query =
        input.value
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


    if (
        !foundPlayers.length &&
        !foundClans.length
    ) {

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
                            👤 ${
                                escapeHTML(
                                    player.name
                                )
                            }
                        </strong>

                        <small>
                            Gracz • Hodowla RP
                        </small>

                    </div>

                    <span class="clan-tag">
                        ${
                            player.productId
                            || "—"
                        }
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


    results.innerHTML =
        html;

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
                globalSearchPage
            );

        }
    );

}


/* =========================================================
   TOP SEARCH
   ========================================================= */

if (globalSearch) {

    globalSearch.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                /*
                 * Jeżeli istnieje strona search,
                 * przechodzimy tam.
                 */

                openPage("search");


                if (
                    globalSearchPage
                ) {

                    globalSearchPage.value =
                        globalSearch.value;

                    performGlobalSearch(
                        globalSearchPage
                    );

                }

            }

        }
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

const navItems =
    document.querySelectorAll(
        ".nav-item"
    );


navItems.forEach(
    item => {

        item.addEventListener(
            "click",
            () => {

                openPage(
                    item.dataset.page
                );

            }
        );

    }
);


function openPage(
    pageName
) {

    document
        .querySelectorAll(".page")
        .forEach(
            page =>
                page.classList.remove(
                    "active"
                )
        );


    const target =
        document.getElementById(
            pageName
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    navItems.forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page ===
                pageName
            );

        }
    );


    document.title =
        `EXODO STATS — ${
            pageName
                .charAt(0)
                .toUpperCase()
            +
            pageName.slice(1)
        }`;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    document
        .getElementById("sidebar")
        ?.classList.remove(
            "open"
        );

}


/* =========================================================
   DASHBOARD LINKS
   ========================================================= */

document
    .querySelectorAll(
        "[data-page-link]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    openPage(
                        button.dataset.pageLink
                    );

                }
            );

        }
    );


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


            setTimeout(
                () => {

                    refreshButton.style.transform =
                        "";

                },
                500
            );


            await loadPlayersFromAPI();


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


                setTimeout(
                    () => {

                        toast.classList.remove(
                            "show"
                        );

                    },
                    2500
                );

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


    /*
     * /recent nie jest endpointem
     * pokazującym aktualną liczbę online.
     *
     * Nie wpisujemy więc losowej liczby.
     */

    if (players.length) {

        element.textContent =
            players.length;

    } else {

        element.textContent =
            "—";

    }

}


/* =========================================================
   HTML SECURITY
   ========================================================= */

function escapeHTML(
    value
) {

    return String(value)
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
   CHART CANVAS
   ========================================================= */

function setupCanvas(
    canvas
) {

    if (!canvas) {
        return null;
    }


    const rect =
        canvas.getBoundingClientRect();


    const ratio =
        window.devicePixelRatio || 1;


    canvas.width =
        rect.width * ratio;


    canvas.height =
        rect.height * ratio;


    const ctx =
        canvas.getContext(
            "2d"
        );


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


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    ctx.lineWidth = 1;


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            padding +
            (
                chartHeight /
                4
            ) * i;


        ctx.beginPath();


        ctx.moveTo(
            padding,
            y
        );


        ctx.lineTo(
            width -
            padding,
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
                    (
                        values.length -
                        1
                    )
                ) *
                index;


            const y =
                padding +
                chartHeight -
                (
                    (
                        value -
                        min
                    ) /
                    (
                        max -
                        min
                    )
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
                    (
                        values.length -
                        1
                    )
                ) *
                index;


            const y =
                padding +
                chartHeight -
                (
                    (
                        value -
                        min
                    ) /
                    (
                        max -
                        min
                    )
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
                    (
                        labels.length -
                        1
                    )
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


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


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
                x +
                barWidth / 2,
                height - 12
            );

        }
    );

}


/* =========================================================
   CHARTS
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

function initializeEXODO() {

    console.log(
        "%cEXODO STATS",
        "color:#a75aff;font-size:24px;font-weight:bold"
    );


    console.log(
        "Panel uruchomiony."
    );


    /*
     * Najpierw renderujemy
     * elementy statyczne.
     */

    renderClanTable();

    renderAllClans();

    renderMarket();

    renderAllRankings();


    /*
     * Następnie wykresy.
     */

    setTimeout(
        () => {

            createExodoCharts();

        },
        300
    );


    /*
     * I na końcu prawdziwe API.
     */

    loadPlayersFromAPI();

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

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeEXODO
    );

} else {

    initializeEXODO();

}
