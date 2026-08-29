/* =========================================================
   EXODO STATS — SCRIPT.JS
   API: exodo-api.oliwierdawidowicz.workers.dev
   ========================================================= */

const API_BASE =
    "https://exodo-api.oliwierdawidowicz.workers.dev";

const RECENT_API =
    `${API_BASE}/api/recent?limit=20`;

const PLAYER_API =
    `${API_BASE}/api/player?name=`;

let players = [];
let filteredPlayers = [];

let chartsLoaded = false;
let activityChart = null;
let clanChart = null;
let activityChart2 = null;
let wealthChart = null;


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $all(selector) {
    return document.querySelectorAll(selector);
}

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
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0$";
    }

    return new Intl.NumberFormat("pl-PL").format(number) + "$";
}

function formatLevel(value) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number(value) === 0
    ) {
        return "—";
    }

    return Number(value).toLocaleString("pl-PL");
}

function getClanName(player) {
    if (!player || !player.clan) {
        return "—";
    }

    const clan = String(player.clan).trim();

    if (!clan) {
        return "—";
    }

    /*
       API czasami może zwrócić dodatkowe informacje,
       np. "[ exo ] exo Lider · 18 członków"
    */

    return clan;
}

function getActivity(player) {
    if (!player) {
        return "—";
    }

    if (player.status === true) {
        return "● Gra teraz";
    }

    if (player.status === "online") {
        return "● Gra teraz";
    }

    if (player.status === "ONLINE") {
        return "● Gra teraz";
    }

    if (player.playtime && String(player.playtime).trim()) {
        return String(player.playtime);
    }

    if (player.lastSeen && String(player.lastSeen).trim()) {
        return String(player.lastSeen);
    }

    return "—";
}

function getStatus(player) {
    if (!player) {
        return "—";
    }

    if (
        player.status === true ||
        player.status === "online" ||
        player.status === "ONLINE"
    ) {
        return `<span class="positive">● ONLINE</span>`;
    }

    return `<span style="color:#6f6a78;">● DANE API</span>`;
}

function showToast(message) {
    const toast = $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* =========================================================
   API
   ========================================================= */

async function fetchJSON(url) {
    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} — ${response.statusText}`
        );
    }

    const data = await response.json();

    return data;
}


/* =========================================================
   LOAD PLAYERS
   ========================================================= */

async function loadPlayers() {

    console.log("EXODO: pobieram graczy...");

    try {

        const data = await fetchJSON(RECENT_API);

        console.log("EXODO API:", data);

        if (!data || data.success !== true) {
            throw new Error("API zwróciło success=false");
        }

        if (!Array.isArray(data.players)) {
            throw new Error("API nie zwróciło tablicy players");
        }

        players = data.players.map(player => ({
            name: player.name || "Nieznany",
            level: Number(player.level) || 0,
            money: Number(player.money) || 0,
            playtime: player.playtime || "",
            clan: player.clan || "",
            rank: player.rank || "",
            status: player.status,
            lastSeen: player.lastSeen || "",
            playerId: player.playerId || null,
            source: player.source || "hodowlarp.pl",
            sourceUrl: player.sourceUrl || ""
        }));

        filteredPlayers = [...players];

        console.log(
            `EXODO: załadowano ${players.length} graczy`
        );

        renderEverything();

    } catch (error) {

        console.error("EXODO API ERROR:", error);

        showToast("❌ Nie udało się pobrać danych API");

        renderErrorState(error.message);
    }
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    renderStats();

    renderPlayersTable();

    renderRichPlayers();

    renderLevelRankings();

    renderMoneyRanking();

    renderSearchResults();

    renderMarket();

    renderClanTables();

    updateCharts();
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function renderStats() {

    const statCards =
        $all(".stat-card");

    if (!statCards.length) {
        return;
    }

    /*
       API /recent nie podaje całkowitej liczby
       wszystkich graczy serwera.

       Dlatego pokazujemy liczbę rekordów,
       które faktycznie zwróciło API.
    */

    const playerCount = players.length;

    let onlineCount = 0;

    players.forEach(player => {

        if (
            player.status === true ||
            player.status === "online" ||
            player.status === "ONLINE"
        ) {
            onlineCount++;
        }

    });

    let totalMoney = 0;

    players.forEach(player => {
        totalMoney += Number(player.money) || 0;
    });


    const values =
        statCards
            ? [...statCards].map(card =>
                card.querySelector(".stat-value")
            )
            : [];


    if (values[0]) {
        values[0].textContent =
            playerCount.toLocaleString("pl-PL");
    }

    if (values[1]) {
        values[1].textContent =
            onlineCount.toLocaleString("pl-PL");
    }

    /*
       Nie udajemy, że znamy liczbę klanów,
       jeżeli API /recent jej nie zwraca.
    */

    if (values[2]) {

        const clans = getUniqueClans();

        values[2].textContent =
            clans.length.toLocaleString("pl-PL");

    }

    if (values[3]) {

        values[3].textContent =
            formatCompactMoney(totalMoney);

    }


    if (statCards[0]) {

        const change =
            statCards[0].querySelector(".stat-change");

        if (change) {
            change.textContent =
                `Dane API · ${playerCount} rekordów`;
        }

    }


    if (statCards[1]) {

        const change =
            statCards[1].querySelector(".stat-change");

        if (change) {
            change.textContent =
                onlineCount > 0
                    ? "Gracze online"
                    : "Brak statusu online w API";
        }

    }


    if (statCards[2]) {

        const change =
            statCards[2].querySelector(".stat-change");

        if (change) {
            change.textContent =
                "Na podstawie danych API";
        }

    }


    if (statCards[3]) {

        const change =
            statCards[3].querySelector(".stat-change");

        if (change) {
            change.textContent =
                "Suma danych z API";
        }

    }

}


/* =========================================================
   MONEY FORMAT
   ========================================================= */

function formatCompactMoney(value) {

    const number = Number(value) || 0;

    if (number >= 1_000_000_000) {
        return (
            (number / 1_000_000_000)
                .toFixed(1)
                .replace(".", ",")
            + " mld$"
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
   PLAYERS TABLE
   ========================================================= */

function renderPlayersTable() {

    const table =
        $("#allPlayersTable");

    if (!table) {
        return;
    }

    let list = [...filteredPlayers];

    const sort =
        $("#playerSort")
            ? $("#playerSort").value
            : "money";


    if (sort === "money") {

        list.sort(
            (a, b) =>
                Number(b.money) -
                Number(a.money)
        );

    } else if (sort === "level") {

        list.sort(
            (a, b) =>
                Number(b.level) -
                Number(a.level)
        );

    } else if (sort === "time") {

        list.sort(
            (a, b) =>
                String(a.lastSeen || "")
                    .localeCompare(
                        String(b.lastSeen || "")
                    )
        );

    }


    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Brak graczy</h3>
                        <p>API nie zwróciło wyników.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        list.map((player, index) => {

            const sourceUrl =
                player.sourceUrl ||
                `${"https://hodowlarp.pl/gracz/"}${encodeURIComponent(player.name)}`;

            return `
                <tr>

                    <td class="rank-number">
                        ${index + 1}
                    </td>

                    <td>
                        <a
                            href="${escapeHTML(sourceUrl)}"
                            target="_blank"
                            rel="noopener"
                            style="text-decoration:none;"
                        >
                            <span class="player-name">
                                ${escapeHTML(player.name)}
                            </span>
                        </a>
                    </td>

                    <td>
                        ${formatLevel(player.level)}
                    </td>

                    <td>
                        <span class="positive">
                            ${formatMoney(player.money)}
                        </span>
                    </td>

                    <td>
                        ${
                            player.clan
                                ? `<span class="clan-tag">
                                    ${escapeHTML(getClanName(player))}
                                   </span>`
                                : "—"
                        }
                    </td>

                    <td>
                        ${escapeHTML(getActivity(player))}
                    </td>

                    <td>
                        ${getStatus(player)}
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
        $("#richPlayersTable");

    if (!table) {
        return;
    }

    const list =
        [...players]
            .sort(
                (a, b) =>
                    Number(b.money) -
                    Number(a.money)
            )
            .slice(0, 10);


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
                        ${formatLevel(player.level)}
                    </td>

                    <td>
                        <span class="positive">
                            ${formatMoney(player.money)}
                        </span>
                    </td>

                    <td>
                        ${
                            player.clan
                                ? `<span class="clan-tag">
                                    ${escapeHTML(player.clan)}
                                   </span>`
                                : "—"
                        }
                    </td>

                    <td>
                        ${escapeHTML(getActivity(player))}
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   LEVEL RANKINGS
   ========================================================= */

function renderLevelRankings() {

    const containers = [
        $("#levelRanking"),
        $("#levelRanking2")
    ];

    containers.forEach(container => {

        if (!container) {
            return;
        }

        const list =
            [...players]
                .sort(
                    (a, b) =>
                        Number(b.level) -
                        Number(a.level)
                )
                .slice(0, 10);


        if (!list.length) {

            container.innerHTML =
                `<div class="empty-state">
                    Brak danych
                 </div>`;

            return;
        }


        const maxLevel =
            Math.max(
                ...list.map(
                    player =>
                        Number(player.level) || 0
                ),
                1
            );


        container.innerHTML =
            list.map((player, index) => {

                const level =
                    Number(player.level) || 0;

                const percent =
                    Math.max(
                        4,
                        (level / maxLevel) * 100
                    );


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
        $("#moneyRanking");

    if (!container) {
        return;
    }

    const list =
        [...players]
            .sort(
                (a, b) =>
                    Number(b.money) -
                    Number(a.money)
            )
            .slice(0, 10);


    const maxMoney =
        Math.max(
            ...list.map(
                player =>
                    Number(player.money) || 0
            ),
            1
        );


    container.innerHTML =
        list.map((player, index) => {

            const money =
                Number(player.money) || 0;

            const percent =
                Math.max(
                    money > 0 ? 4 : 1,
                    (money / maxMoney) * 100
                );


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

        }).join("");
}


/* =========================================================
   CLANS
   ========================================================= */

function getUniqueClans() {

    const clans =
        players
            .map(player =>
                String(player.clan || "").trim()
            )
            .filter(Boolean);


    return [...new Set(clans)];
}


function getClanPlayers(clan) {

    return players.filter(player =>
        String(player.clan || "")
            .toLowerCase()
            .includes(
                String(clan).toLowerCase()
            )
    );

}


function buildClanData() {

    const clans = getUniqueClans();

    return clans.map(clan => {

        const members =
            getClanPlayers(clan);

        const money =
            members.reduce(
                (sum, player) =>
                    sum +
                    (Number(player.money) || 0),
                0
            );

        const leader =
            members.find(player =>
                String(player.rank || "")
                    .toLowerCase()
                    .includes("lider")
            );


        return {
            name: clan,
            leader:
                leader
                    ? leader.name
                    : "—",
            members: members.length,
            money: money,
            wealth: money,
            activity: members.length
        };

    });

}


function renderClanTables() {

    const clanData =
        buildClanData();

    const tables = [
        $("#clanTable"),
        $("#allClansTable")
    ];


    tables.forEach(table => {

        if (!table) {
            return;
        }


        if (!clanData.length) {

            table.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div>♛</div>
                            <h3>Brak danych o klanach</h3>
                            <p>
                                API /recent nie zwraca aktualnie
                                informacji o klanach.
                            </p>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        table.innerHTML =
            clanData
                .sort(
                    (a, b) =>
                        b.money - a.money
                )
                .map((clan, index) => {

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

                            <td class="change-none">
                                —
                            </td>

                        </tr>
                    `;

                }).join("");

    });

}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const table =
        $("#marketTable");

    if (!table) {
        return;
    }

    const clans =
        buildClanData()
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 20);


    if (!clans.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>◆</div>
                        <h3>Brak danych rynku</h3>
                        <p>
                            API nie zwraca jeszcze
                            historii wartości klanów.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        clans.map(clan => {

            return `
                <tr>

                    <td>
                        <span class="clan-name">
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
                        <span class="positive">
                            ● DANE API
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

function searchPlayers(query) {

    const text =
        String(query || "")
            .trim()
            .toLowerCase();


    if (!text) {
        filteredPlayers = [...players];
    } else {

        filteredPlayers =
            players.filter(player => {

                return (
                    String(player.name || "")
                        .toLowerCase()
                        .includes(text)
                    ||
                    String(player.clan || "")
                        .toLowerCase()
                        .includes(text)
                );

            });

    }


    renderPlayersTable();
}


function renderSearchResults() {

    const container =
        $("#searchResults");

    if (!container) {
        return;
    }


    const input =
        $("#globalSearchPage");

    const query =
        input
            ? input.value.trim().toLowerCase()
            : "";


    if (!query) {

        container.innerHTML = `
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


    const results =
        players.filter(player => {

            return (
                String(player.name || "")
                    .toLowerCase()
                    .includes(query)
                ||
                String(player.clan || "")
                    .toLowerCase()
                    .includes(query)
            );

        });


    if (!results.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Nie znaleziono
                </h3>

                <p>
                    Brak wyników dla:
                    ${escapeHTML(query)}
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        results.map(player => {

            const sourceUrl =
                player.sourceUrl ||
                `${"https://hodowlarp.pl/gracz/"}${encodeURIComponent(player.name)}`;


            return `
                <a
                    href="${escapeHTML(sourceUrl)}"
                    target="_blank"
                    rel="noopener"
                    style="text-decoration:none;"
                >

                    <div class="result-card">

                        <div>

                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>

                            <small>
                                Poziom:
                                ${formatLevel(player.level)}
                                ·
                                ${escapeHTML(getClanName(player))}
                            </small>

                        </div>

                        <div>
                            <strong>
                                ${formatMoney(player.money)}
                            </strong>

                            <small>
                                ${escapeHTML(getActivity(player))}
                            </small>
                        </div>

                    </div>

                </a>
            `;

        }).join("");
}


/* =========================================================
   ERROR STATE
   ========================================================= */

function renderErrorState(message) {

    const table =
        $("#allPlayersTable");

    if (!table) {
        return;
    }


    table.innerHTML = `
        <tr>

            <td colspan="7">

                <div class="empty-state">

                    <div>!</div>

                    <h3>
                        Nie udało się pobrać danych
                    </h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const navItems =
        $all(".nav-item");

    const pages =
        $all(".page");


    navItems.forEach(item => {

        item.addEventListener("click", () => {

            const pageName =
                item.dataset.page;

            if (!pageName) {
                return;
            }


            navItems.forEach(nav =>
                nav.classList.remove("active")
            );

            item.classList.add("active");


            pages.forEach(page =>
                page.classList.remove("active")
            );


            const page =
                document.getElementById(pageName);

            if (page) {
                page.classList.add("active");
            }


            const title =
                $(".page-title h1");

            if (title) {

                const titles = {

                    dashboard: "Dashboard",
                    clans: "Klany",
                    players: "Gracze",
                    rankings: "Rankingi",
                    charts: "Wykresy",
                    market: "Rynek",
                    search: "Wyszukiwarka"

                };

                title.textContent =
                    titles[pageName] ||
                    "EXODO STATS";
            }


            const sidebar =
                $("#sidebar");

            if (sidebar) {
                sidebar.classList.remove("open");
            }

        });

    });


    $all("[data-page-link]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const target =
                    button.dataset.pageLink;

                const nav =
                    document.querySelector(
                        `.nav-item[data-page="${target}"]`
                    );

                if (nav) {
                    nav.click();
                }

            });

        });

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        $("#mobileMenu");

    const sidebar =
        $("#sidebar");


    if (!button || !sidebar) {
        return;
    }


    button.addEventListener("click", () => {

        sidebar.classList.toggle("open");

    });

}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function setupSearch() {

    const globalSearch =
        $("#globalSearch");

    const playerSearch =
        $("#playerSearch");

    const clanSearch =
        $("#clanSearch");

    const globalSearchPage =
        $("#globalSearchPage");


    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            event => {

                const value =
                    event.target.value;

                searchPlayers(value);

                const page =
                    document.getElementById("search");

                if (value.trim() && page) {

                    const nav =
                        document.querySelector(
                            '.nav-item[data-page="search"]'
                        );

                    if (nav) {
                        nav.click();
                    }

                    if (globalSearchPage) {
                        globalSearchPage.value =
                            value;

                        renderSearchResults();
                    }

                }

            }
        );

    }


    if (playerSearch) {

        playerSearch.addEventListener(
            "input",
            event => {

                searchPlayers(
                    event.target.value
                );

            }
        );

    }


    if (clanSearch) {

        clanSearch.addEventListener(
            "input",
            event => {

                renderFilteredClans(
                    event.target.value
                );

            }
        );

    }


    if (globalSearchPage) {

        globalSearchPage.addEventListener(
            "input",
            () => {

                renderSearchResults();

            }
        );

    }

}


/* =========================================================
   CLAN SEARCH
   ========================================================= */

function renderFilteredClans(query = "") {

    const table =
        $("#allClansTable");

    if (!table) {
        return;
    }


    const text =
        String(query)
            .trim()
            .toLowerCase();


    let clans =
        buildClanData();


    if (text) {

        clans =
            clans.filter(clan =>
                clan.name
                    .toLowerCase()
                    .includes(text)
            );

    }


    clans.sort(
        (a, b) =>
            b.money - a.money
    );


    table.innerHTML =
        clans.map((clan, index) => {

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

                    <td class="change-none">
                        —
                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================================
   SORT EVENTS
   ========================================================= */

function setupSorts() {

    const playerSort =
        $("#playerSort");

    const clanSort =
        $("#clanSort");


    if (playerSort) {

        playerSort.addEventListener(
            "change",
            () => {

                renderPlayersTable();

            }
        );

    }


    if (clanSort) {

        clanSort.addEventListener(
            "change",
            () => {

                const table =
                    $("#allClansTable");

                if (!table) {
                    return;
                }

                let clans =
                    buildClanData();


                const sort =
                    clanSort.value;


                if (sort === "members") {

                    clans.sort(
                        (a, b) =>
                            b.members -
                            a.members
                    );

                } else if (sort === "time") {

                    clans.sort(
                        (a, b) =>
                            b.activity -
                            a.activity
                    );

                } else {

                    clans.sort(
                        (a, b) =>
                            b.money -
                            a.money
                    );

                }


                table.innerHTML =
                    clans.map(
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

                        }
                    ).join("");

            }
        );

    }

}


/* =========================================================
   CHART.JS
   ========================================================= */

async function loadChartJS() {

    if (window.Chart) {
        chartsLoaded = true;
        return true;
    }


    return new Promise(resolve => {

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";

        script.onload = () => {

            chartsLoaded = true;

            console.log(
                "EXODO: Chart.js załadowany"
            );

            resolve(true);

        };

        script.onerror = () => {

            console.warn(
                "EXODO: Chart.js nie został załadowany."
            );

            resolve(false);

        };

        document.head.appendChild(script);

    });

}


/* =========================================================
   CHARTS
   ========================================================= */

async function updateCharts() {

    const hasCanvas =
        $("#activityChart") ||
        $("#clanChart") ||
        $("#activityChart2") ||
        $("#wealthChart");


    if (!hasCanvas) {
        return;
    }


    const loaded =
        await loadChartJS();


    if (!loaded) {
        return;
    }


    createCharts();

}


function destroyChart(chart) {

    if (chart) {
        try {
            chart.destroy();
        } catch (error) {
            console.warn(error);
        }
    }

}


function createCharts() {

    const labels =
        players
            .slice(0, 7)
            .map(player => player.name);


    const levels =
        players
            .slice(0, 7)
            .map(player =>
                Number(player.level) || 0
            );


    const money =
        players
            .slice(0, 7)
            .map(player =>
                Number(player.money) || 0
            );


    const activityCanvas =
        $("#activityChart");

    if (activityCanvas) {

        destroyChart(activityChart);

        activityChart =
            new Chart(
                activityCanvas,
                {

                    type: "line",

                    data: {

                        labels:
                            labels.length
                                ? labels
                                : [
                                    "Brak danych"
                                ],

                        datasets: [

                            {
                                label:
                                    "Poziom",

                                data:
                                    levels.length
                                        ? levels
                                        : [0],

                                borderWidth: 2,

                                tension: 0.35,

                                fill: true
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

                        }

                    }

                }
            );

    }


    const clanCanvas =
        $("#clanChart");

    if (clanCanvas) {

        const clanData =
            buildClanData()
                .slice(0, 7);


        destroyChart(clanChart);

        clanChart =
            new Chart(
                clanCanvas,
                {

                    type: "doughnut",

                    data: {

                        labels:
                            clanData.length
                                ? clanData.map(
                                    clan =>
                                        clan.name
                                )
                                : ["Brak danych"],

                        datasets: [

                            {
                                data:
                                    clanData.length
                                        ? clanData.map(
                                            clan =>
                                                clan.money || 1
                                        )
                                        : [1],

                                borderWidth: 0
                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {

                                position: "bottom",

                                labels: {
                                    color: "#aaa5b5"
                                }

                            }

                        }

                    }

                }
            );

    }


    const activityCanvas2 =
        $("#activityChart2");

    if (activityCanvas2) {

        destroyChart(activityChart2);

        activityChart2 =
            new Chart(
                activityCanvas2,
                {

                    type: "bar",

                    data: {

                        labels:
                            labels.length
                                ? labels
                                : ["Brak danych"],

                        datasets: [

                            {
                                label:
                                    "Poziom",

                                data:
                                    levels.length
                                        ? levels
                                        : [0],

                                borderWidth: 0
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
                                beginAtZero: true,

                                ticks: {
                                    color: "#6f6a78"
                                },

                                grid: {
                                    color:
                                        "rgba(255,255,255,0.04)"
                                }
                            }

                        }

                    }

                }
            );

    }


    const wealthCanvas =
        $("#wealthChart");

    if (wealthCanvas) {

        const rich =
            [...players]
                .sort(
                    (a, b) =>
                        b.money - a.money
                )
                .slice(0, 10);


        destroyChart(wealthChart);

        wealthChart =
            new Chart(
                wealthCanvas,
                {

                    type: "bar",

                    data: {

                        labels:
                            rich.length
                                ? rich.map(
                                    player =>
                                        player.name
                                )
                                : ["Brak danych"],

                        datasets: [

                            {
                                label:
                                    "Gotówka",

                                data:
                                    rich.length
                                        ? rich.map(
                                            player =>
                                                player.money
                                        )
                                        : [0],

                                borderWidth: 0
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

                                beginAtZero: true,

                                ticks: {
                                    color: "#6f6a78"
                                },

                                grid: {
                                    color:
                                        "rgba(255,255,255,0.04)"
                                }

                            }

                        }

                    }

                }
            );

    }

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

            button.disabled = true;

            button.textContent =
                "↻ Ładowanie...";


            await loadPlayers();


            button.disabled = false;

            button.textContent =
                "↻ Odśwież";


            showToast(
                "✓ Statystyki zostały odświeżone"
            );

        }
    );

}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "EXODO STATS — start"
        );

        setupNavigation();

        setupMobileMenu();

        setupSearch();

        setupSorts();

        setupRefresh();

        loadPlayers();

    }
);
