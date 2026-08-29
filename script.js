/* =========================================================
   EXODO STATS
   REAL HODOWLA RP DATA
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev";


/* =========================================================
   DATA
   ========================================================= */

let players = [];
let clans = [];


/* =========================================================
   HELPERS
   ========================================================= */

function formatMoney(number) {

    if (
        number === null ||
        number === undefined ||
        Number.isNaN(Number(number))
    ) {
        return "—";
    }

    return Number(number).toLocaleString("pl-PL") + "$";
}


function formatNumber(number) {

    if (
        number === null ||
        number === undefined ||
        Number.isNaN(Number(number))
    ) {
        return "—";
    }

    return Number(number).toLocaleString("pl-PL");
}


function formatAge(seconds) {

    if (
        seconds === null ||
        seconds === undefined ||
        Number.isNaN(Number(seconds))
    ) {
        return "—";
    }

    const totalMinutes =
        Math.floor(Number(seconds) / 60);

    const days =
        Math.floor(totalMinutes / 1440);

    const hours =
        Math.floor(
            (totalMinutes % 1440) / 60
        );

    const minutes =
        totalMinutes % 60;


    if (days > 0) {

        return `${days} dni`;

    }

    if (hours > 0) {

        return `${hours} godz.`;

    }

    return `${minutes} min.`;
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
   LOAD REAL DATA FROM WORKER
   ========================================================= */

async function loadHodowlaData() {

    console.log(
        "%cEXODO STATS — pobieranie danych...",
        "color:#a75aff;font-size:18px;font-weight:bold"
    );


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


        const result =
            await response.json();


        if (
            !result ||
            result.success !== true ||
            !Array.isArray(result.data)
        ) {

            throw new Error(
                "Nieprawidłowa odpowiedź API"
            );

        }


        /*
         * Dane z Hodowla RP:
         *
         * uuid
         * nick
         * productId
         * ageSeconds
         */

        players =
            result.data.map((player) => {

                return {

                    uuid:
                        player.uuid || "",

                    name:
                        player.nick || "Nieznany",

                    level:
                        null,

                    money:
                        null,

                    clan:
                        null,

                    ageSeconds:
                        Number(
                            player.ageSeconds
                        ) || 0,

                    online:
                        false,

                    productId:
                        player.productId || ""

                };

            });


        /*
         * Usuwamy duplikaty nicków.
         * Jeśli ten sam gracz kupił kilka produktów,
         * pokazujemy go tylko raz.
         */

        const uniquePlayers =
            new Map();


        players.forEach(player => {

            const key =
                player.uuid ||
                player.name.toLowerCase();

            if (!uniquePlayers.has(key)) {

                uniquePlayers.set(
                    key,
                    player
                );

            }

        });


        players =
            Array.from(
                uniquePlayers.values()
            );


        console.log(
            "%c✓ Dane pobrane:",
            "color:#4ade80;font-weight:bold",
            players
        );


        renderEverything();


        updateLastUpdate();


        showToast(
            "✓ Pobrano dane z Hodowla RP"
        );


    } catch (error) {

        console.error(
            "❌ Błąd pobierania danych:",
            error
        );


        showToast(
            "❌ Nie udało się pobrać danych"
        );

    }

}


/* =========================================================
   PLAYER TABLE — DASHBOARD
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
                    (b.money || 0) -
                    (a.money || 0)
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
                                ${escapeHTML(
                                    player.name
                                )}
                            </span>
                        </td>

                        <td>
                            ${player.level ?? "—"}
                        </td>

                        <td>
                            ${
                                player.money !== null
                                    ? formatMoney(player.money)
                                    : "—"
                            }
                        </td>

                        <td>
                            <span class="clan-tag">
                                ${
                                    player.clan
                                        ? `[${escapeHTML(player.clan)}]`
                                        : "[—]"
                                }
                            </span>
                        </td>

                        <td>
                            ${formatAge(
                                player.ageSeconds
                            )}
                        </td>

                    </tr>
                `;

            }
        ).join("");
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

                /*
                 * Na tym etapie NIE zgadujemy statusu.
                 *
                 * /api/recent nie jest endpointem
                 * online/offline.
                 */

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
                            ${
                                player.level ?? "—"
                            }
                        </td>

                        <td>
                            ${
                                player.money !== null
                                    ? formatMoney(player.money)
                                    : "0$"
                            }
                        </td>

                        <td>
                            <span class="clan-tag">
                                ${
                                    player.clan
                                        ? `[${escapeHTML(player.clan)}]`
                                        : "[—]"
                                }
                            </span>
                        </td>

                        <td>
                            ${
                                player.ageSeconds
                                    ? formatAge(
                                        player.ageSeconds
                                    )
                                    : "0 dni"
                            }
                        </td>

                        <td>

                            <span
                                style="color:#55515c"
                            >
                                ● BRAK DANYCH
                            </span>

                        </td>

                    </tr>
                `;

            }
        ).join("");
}


/* =========================================================
   CLANS
   ========================================================= */

function renderClanTable() {

    const table =
        document.getElementById(
            "clanTable"
        );

    if (!table) return;


    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <h3>
                            Brak danych o klanach
                        </h3>

                        <p>
                            Endpoint klanów nie został jeszcze
                            podłączony.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        clans.map(
            clan => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${clan.rank}
                        </td>

                        <td>
                            <span class="clan-name">
                                [${escapeHTML(clan.tag)}]
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

            }
        ).join("");
}


function renderAllClans(
    list = clans
) {

    const table =
        document.getElementById(
            "allClansTable"
        );

    if (!table) return;


    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">

                        <h3>
                            Brak danych o klanach
                        </h3>

                        <p>
                            Podłączymy ranking klanów,
                            gdy będziemy mieli endpoint
                            klanów Hodowla RP.
                        </p>

                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        list.map(
            clan => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${clan.rank}
                        </td>

                        <td>
                            <span class="clan-name">
                                [${escapeHTML(clan.tag)}]
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

            }
        ).join("");
}


/* =========================================================
   RANKINGS
   ========================================================= */

function renderRanking(
    elementId,
    valueKey,
    formatter
) {

    const container =
        document.getElementById(
            elementId
        );

    if (!container) return;


    const sorted =
        [...players]
            .filter(
                player =>
                    player[valueKey] !== null &&
                    player[valueKey] !== undefined
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

                <h3>
                    Brak danych
                </h3>

                <p>
                    Ranking będzie dostępny po
                    podłączeniu danych graczy.
                </p>

            </div>
        `;

        return;
    }


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
        "level",
        value => value
    );


    renderRanking(
        "levelRanking2",
        "level",
        value => value
    );


    renderRanking(
        "moneyRanking",
        "money",
        formatMoney
    );


    renderRanking(
        "timeRanking",
        "ageSeconds",
        value =>
            formatAge(value)
    );

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

                        <h3>
                            Brak danych rynku
                        </h3>

                        <p>
                            Dane giełdy klanów nie są
                            jeszcze podłączone.
                        </p>

                    </div>

                </td>

            </tr>
        `;

        return;
    }


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
                    changes[index] || 0;


                return `
                    <tr>

                        <td>
                            <span class="clan-name">
                                [${escapeHTML(clan.tag)}]
                                ${escapeHTML(clan.name)}
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

            }
        ).join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

function performGlobalSearch(
    queryOverride = null
) {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    const pageSearch =
        document.getElementById(
            "globalSearchPage"
        );


    const query =
        (
            queryOverride !== null
                ? queryOverride
                : (
                    globalSearch?.value ||
                    pageSearch?.value ||
                    ""
                )
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
                    Wyszukiwarka znajdzie graczy
                    oraz klany.
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


    let html = "";


    foundPlayers.forEach(
        player => {

            html += `
                <div class="result-card">

                    <div>

                        <strong>
                            👤
                            ${escapeHTML(
                                player.name
                            )}
                        </strong>

                        <small>
                            Gracz • Hodowla RP
                        </small>

                    </div>

                    <span class="clan-tag">

                        ${
                            player.clan
                                ? `[${escapeHTML(player.clan)}]`
                                : "[—]"
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
                            🛡️
                            [${escapeHTML(clan.tag)}]
                            ${escapeHTML(clan.name)}
                        </strong>

                        <small>
                            Klan • lider
                            ${escapeHTML(clan.leader)}
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


/* =========================================================
   CLAN SEARCH
   ========================================================= */

function setupClanSearch() {

    const input =
        document.getElementById(
            "clanSearch"
        );

    if (!input) return;


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .toLowerCase()
                    .trim();


            const filtered =
                clans.filter(
                    clan =>
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


            renderAllClans(
                filtered
            );

        }
    );

}


/* =========================================================
   PLAYER SEARCH
   ========================================================= */

function setupPlayerSearch() {

    const input =
        document.getElementById(
            "playerSearch"
        );

    if (!input) return;


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .toLowerCase()
                    .trim();


            const filtered =
                players.filter(
                    player =>
                        player.name
                            .toLowerCase()
                            .includes(query)
                );


            renderAllPlayers(
                filtered
            );

        }
    );

}


/* =========================================================
   SORTS
   ========================================================= */

function setupSorts() {

    const clanSort =
        document.getElementById(
            "clanSort"
        );


    if (clanSort) {

        clanSort.addEventListener(
            "change",
            () => {

                let sorted =
                    [...clans];


                if (
                    clanSort.value ===
                    "money"
                ) {

                    sorted.sort(
                        (a, b) =>
                            (b.money || 0) -
                            (a.money || 0)
                    );

                }


                if (
                    clanSort.value ===
                    "members"
                ) {

                    sorted.sort(
                        (a, b) =>
                            (b.members || 0) -
                            (a.members || 0)
                    );

                }


                if (
                    clanSort.value ===
                    "time"
                ) {

                    sorted.sort(
                        (a, b) =>
                            (b.time || 0) -
                            (a.time || 0)
                    );

                }


                renderAllClans(
                    sorted
                );

            }
        );

    }


    const playerSort =
        document.getElementById(
            "playerSort"
        );


    if (playerSort) {

        playerSort.addEventListener(
            "change",
            () => {

                let sorted =
                    [...players];


                if (
                    playerSort.value ===
                    "money"
                ) {

                    sorted.sort(
                        (a, b) =>
                            (b.money || 0) -
                            (a.money || 0)
                    );

                }


                if (
                    playerSort.value ===
                    "level"
                ) {

                    sorted.sort(
                        (a, b) =>
                            (b.level || 0) -
                            (a.level || 0)
                    );

                }


                if (
                    playerSort.value ===
                    "time"
                ) {

                    sorted.sort(
                        (a, b) =>
                            (b.ageSeconds || 0) -
                            (a.ageSeconds || 0)
                    );

                }


                renderAllPlayers(
                    sorted
                );

            }
        );

    }

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

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

}


function openPage(
    pageName
) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(
            page => {

                page.classList.remove(
                    "active"
                );

            }
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


    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.page ===
                    pageName
                );

            }
        );


    const titles = {

        dashboard:
            "Dashboard",

        clans:
            "Klany",

        players:
            "Gracze",

        rankings:
            "Rankingi",

        charts:
            "Wykresy",

        market:
            "Rynek",

        search:
            "Wyszukiwarka"

    };


    document.title =
        `EXODO STATS — ${
            titles[pageName] ||
            "Dashboard"
        }`;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    document
        .getElementById(
            "sidebar"
        )
        ?.classList.remove(
            "open"
        );

}


/* =========================================================
   REFRESH
   ========================================================= */

function setupRefresh() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    if (!button) return;


    button.addEventListener(
        "click",
        async () => {

            button.style.transform =
                "rotate(360deg)";


            setTimeout(
                () => {

                    button.style.transform =
                        "";

                },
                500
            );


            await loadHodowlaData();

        }
    );

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

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

}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function setupGlobalSearch() {

    const input =
        document.getElementById(
            "globalSearch"
        );


    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    performGlobalSearch(
                        input.value
                    );

                    openPage(
                        "search"
                    );

                }

            }
        );

    }


    const pageInput =
        document.getElementById(
            "globalSearchPage"
        );


    if (pageInput) {

        pageInput.addEventListener(
            "input",
            () => {

                performGlobalSearch(
                    pageInput.value
                );

            }
        );

    }

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) return;


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


/* =========================================================
   LAST UPDATE
   ========================================================= */

function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (!element) return;


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


    element.textContent =
        `dzisiaj, ${time}`;

}


/* =========================================================
   DASHBOARD COUNTERS
   ========================================================= */

function updateDashboardCounters() {

    const online =
        document.getElementById(
            "onlinePlayers"
        );


    if (online) {

        /*
         * /api/recent nie podaje liczby
         * graczy online.
         *
         * Dlatego nie pokazujemy
         * fałszywej liczby.
         */

        online.textContent =
            "—";

    }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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
   CHARTS
   ========================================================= */

function setupCanvas(
    canvas
) {

    if (!canvas) return null;


    const rect =
        canvas.getBoundingClientRect();


    const ratio =
        window.devicePixelRatio ||
        1;


    canvas.width =
        rect.width *
        ratio;


    canvas.height =
        rect.height *
        ratio;


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

        width:
            rect.width,

        height:
            rect.height

    };

}


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
        setupCanvas(
            canvas
        );


    if (!setup) return;


    const {
        ctx,
        width,
        height
    } = setup;


    const padding =
        35;


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
            ) *
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


        ctx.lineWidth =
            1;


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
                    value /
                    max
                ) *
                chartHeight;


            if (
                index === 0
            ) {

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


    ctx.lineWidth =
        3;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    ctx.shadowBlur =
        15;


    ctx.shadowColor =
        "rgba(155,92,255,0.5)";


    ctx.stroke();


    ctx.shadowBlur =
        0;


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
                    value /
                    max
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
        setupCanvas(
            canvas
        );


    if (!setup) return;


    const {
        ctx,
        width,
        height
    } = setup;


    const padding =
        30;


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
        availableWidth /
        values.length *
        0.55;


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
                ctx.roundRect
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
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    renderClanTable();

    renderRichPlayers();

    renderAllRankings();

    renderAllClans();

    renderAllPlayers();

    renderMarket();

    updateDashboardCounters();

    createExodoCharts();

}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "%cEXODO STATS",
            "color:#a75aff;font-size:24px;font-weight:bold"
        );


        console.log(
            "Łączenie z:",
            API_URL
        );


        setupNavigation();

        setupClanSearch();

        setupPlayerSearch();

        setupSorts();

        setupRefresh();

        setupMobileMenu();

        setupGlobalSearch();


        renderEverything();


        await loadHodowlaData();

    }
);


/* =========================================================
   REDRAW CHARTS
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
