/* =========================================================
   EXODO STATS
   script.js
   API: Cloudflare Worker
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawicz.workers.dev/api/recent?limit=20";

let players = [];
let clans = [];
let apiData = [];

let charts = {
    activity: null,
    clans: null,
    activity2: null,
    wealth: null
};


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

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


function getNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === "") {
            continue;
        }

        const number = Number(
            String(value)
                .replace(/\s/g, "")
                .replace(/,/g, ".")
                .replace(/\$/g, "")
        );

        if (Number.isFinite(number)) {
            return number;
        }
    }

    return 0;
}


function getString(...values) {
    for (const value of values) {
        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            return String(value).trim();
        }
    }

    return "—";
}


function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .trim();
}


function showToast(message = "✓ Statystyki zostały odświeżone") {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* =========================================================
   API NORMALIZATION
   ========================================================= */

function extractArray(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    const possibleKeys = [
        "players",
        "gracze",
        "data",
        "results",
        "items",
        "recent",
        "online"
    ];

    for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    return [];
}


function normalizePlayer(raw, index) {
    const name = getString(
        raw?.name,
        raw?.username,
        raw?.nick,
        raw?.player,
        raw?.playerName,
        raw?.login
    );

    const level = getNumber(
        raw?.level,
        raw?.lvl,
        raw?.poziom
    );

    const money = getNumber(
        raw?.money,
        raw?.cash,
        raw?.balance,
        raw?.gotowka,
        raw?.gotówka,
        raw?.coins
    );

    let clan = getString(
        raw?.clan,
        raw?.clanName,
        raw?.klan,
        raw?.klanName,
        raw?.gang
    );

    if (clan === "—" || clan === "null") {
        clan = "—";
    }

    const activity = getString(
        raw?.activity,
        raw?.activeTime,
        raw?.lastActivity,
        raw?.lastSeen,
        raw?.time,
        raw?.onlineTime
    );

    const online =
        raw?.online === true ||
        raw?.isOnline === true ||
        raw?.status === "online" ||
        raw?.status === "ONLINE";

    return {
        id: raw?.id ?? index + 1,
        name,
        level,
        money,
        clan,
        activity,
        online,
        raw
    };
}


function normalizeClan(raw, index) {
    const name = getString(
        raw?.name,
        raw?.clan,
        raw?.clanName,
        raw?.tag
    );

    const leader = getString(
        raw?.leader,
        raw?.owner,
        raw?.leaderName
    );

    const members = getNumber(
        raw?.members,
        raw?.memberCount,
        raw?.membersCount
    );

    const cash = getNumber(
        raw?.cash,
        raw?.money,
        raw?.balance
    );

    const wealth = getNumber(
        raw?.wealth,
        raw?.value,
        raw?.worth,
        raw?.property,
        raw?.assetValue
    );

    const activity = getString(
        raw?.activity,
        raw?.activeTime,
        raw?.time
    );

    const change = getNumber(
        raw?.change,
        raw?.changePercent,
        raw?.weeklyChange
    );

    return {
        id: raw?.id ?? index + 1,
        name,
        leader,
        members,
        cash,
        wealth,
        activity,
        change,
        raw
    };
}


/* =========================================================
   LOAD API
   ========================================================= */

async function loadAPI() {
    try {
        console.log("EXODO STATS: pobieranie danych...");
        console.log(API_URL);

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `API HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("EXODO STATS API:", data);

        apiData = extractArray(data);

        players = apiData.map(normalizePlayer);

        /*
         * Jeżeli API zwraca dane klanów w osobnym polu,
         * spróbujemy je pobrać.
         */
        if (
            data &&
            typeof data === "object" &&
            Array.isArray(data.clans)
        ) {
            clans = data.clans.map(normalizeClan);
        } else if (
            data &&
            typeof data === "object" &&
            Array.isArray(data.klany)
        ) {
            clans = data.klany.map(normalizeClan);
        } else {
            clans = [];
        }

        renderEverything();

        showToast("✓ Dane zostały pobrane z API");

        return true;

    } catch (error) {
        console.error("EXODO STATS API ERROR:", error);

        /*
         * Nie czyścimy tabel, jeżeli poprzednie dane już były.
         */
        if (players.length === 0) {
            renderAPIError();
        }

        showToast("✕ Nie udało się pobrać danych API");

        return false;
    }
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

    tables.forEach(id => {
        const element = document.getElementById(id);

        if (!element) return;

        element.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        <div>⚠</div>
                        <h3>Brak danych API</h3>
                        <p>
                            Nie udało się pobrać danych z serwera.
                        </p>
                    </div>
                </td>
            </tr>
        `;
    });
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function updateDashboardStats() {
    const playerCards =
        document.querySelectorAll(".stat-card");

    /*
     * GRACZE
     */
    if (playerCards[0]) {
        const value =
            playerCards[0].querySelector(".stat-value");

        if (value) {
            value.textContent =
                formatNumber(players.length);
        }
    }

    /*
     * ONLINE
     */
    const onlineElement =
        document.getElementById("onlinePlayers");

    if (onlineElement) {
        const online = players.filter(
            player => player.online
        ).length;

        onlineElement.textContent =
            formatNumber(online);
    }

    /*
     * KLANY
     */
    if (playerCards[2]) {
        const value =
            playerCards[2].querySelector(".stat-value");

        if (value) {
            value.textContent =
                formatNumber(clans.length);
        }
    }

    /*
     * MAJĄTEK
     */
    if (playerCards[3]) {
        const value =
            playerCards[3].querySelector(".stat-value");

        if (value) {
            const total = clans.reduce(
                (sum, clan) =>
                    sum + clan.wealth,
                0
            );

            value.textContent =
                total > 0
                    ? formatMoney(total)
                    : "—";
        }
    }
}


/* =========================================================
   PLAYER TABLE
   ========================================================= */

function renderPlayersTable(list = players) {
    const table =
        document.getElementById("allPlayersTable");

    if (!table) return;

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div>♙</div>
                        <h3>Brak graczy</h3>
                        <p>API nie zwróciło żadnych graczy.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map((player, index) => {

            const status = player.online
                ? `<span style="color:#4ade80;">● ONLINE</span>`
                : `<span style="opacity:.65;">● OFFLINE</span>`;

            return `
                <tr>

                    <td>
                        <strong>${index + 1}</strong>
                    </td>

                    <td>
                        <a
                            href="https://hodowlarp.pl/gracz/${encodeURIComponent(player.name)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="font-weight:700;text-decoration:none;"
                        >
                            ${escapeHTML(player.name)}
                        </a>
                    </td>

                    <td>
                        <strong>${player.level}</strong>
                    </td>

                    <td>
                        ${formatMoney(player.money)}
                    </td>

                    <td>
                        ${
                            player.clan === "—"
                                ? "—"
                                : `<strong>${escapeHTML(player.clan)}</strong>`
                        }
                    </td>

                    <td>
                        ${
                            player.activity !== "—"
                                ? escapeHTML(player.activity)
                                : "—"
                        }
                    </td>

                    <td>
                        ${status}
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
        document.getElementById("richPlayersTable");

    if (!table) return;

    const sorted = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    if (!sorted.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6">Brak danych</td>
            </tr>
        `;

        return;
    }

    table.innerHTML = sorted
        .map((player, index) => `
            <tr>

                <td>
                    <strong>${index + 1}</strong>
                </td>

                <td>
                    <a
                        href="https://hodowlarp.pl/gracz/${encodeURIComponent(player.name)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="font-weight:700;text-decoration:none;"
                    >
                        ${escapeHTML(player.name)}
                    </a>
                </td>

                <td>
                    ${player.level}
                </td>

                <td>
                    ${formatMoney(player.money)}
                </td>

                <td>
                    ${escapeHTML(player.clan)}
                </td>

                <td>
                    ${escapeHTML(player.activity)}
                </td>

            </tr>
        `)
        .join("");
}


/* =========================================================
   CLAN TABLE
   ========================================================= */

function renderClanTable(list = clans) {
    const table =
        document.getElementById("allClansTable");

    if (!table) return;

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>♛</div>
                        <h3>Brak danych klanów</h3>
                        <p>
                            Aktualne API nie zwróciło listy klanów.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map((clan, index) => `
            <tr>

                <td>
                    <strong>${index + 1}</strong>
                </td>

                <td>
                    <strong>
                        ${escapeHTML(clan.name)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(clan.leader)}
                </td>

                <td>
                    ${formatNumber(clan.members)}
                </td>

                <td>
                    ${formatMoney(clan.cash)}
                </td>

                <td>
                    ${formatMoney(clan.wealth)}
                </td>

                <td>
                    ${escapeHTML(clan.activity)}
                </td>

                <td>
                    ${
                        clan.change > 0
                            ? `<span style="color:#4ade80;">↑ ${clan.change}%</span>`
                            : clan.change < 0
                                ? `<span style="color:#f87171;">↓ ${Math.abs(clan.change)}%</span>`
                                : "—"
                    }
                </td>

            </tr>
        `)
        .join("");
}


/* =========================================================
   DASHBOARD CLAN TABLE
   ========================================================= */

function renderDashboardClans() {
    const table =
        document.getElementById("clanTable");

    if (!table) return;

    const top = [...clans]
        .sort((a, b) => b.wealth - a.wealth)
        .slice(0, 10);

    if (!top.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div>♛</div>
                        <h3>Brak danych klanów</h3>
                        <p>API nie zwróciło danych klanów.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = top
        .map((clan, index) => `
            <tr>

                <td>
                    <strong>${index + 1}</strong>
                </td>

                <td>
                    <strong>
                        ${escapeHTML(clan.name)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(clan.leader)}
                </td>

                <td>
                    ${formatNumber(clan.members)}
                </td>

                <td>
                    ${formatMoney(clan.cash)}
                </td>

                <td>
                    ${formatMoney(clan.wealth)}
                </td>

                <td>
                    ${escapeHTML(clan.activity)}
                </td>

                <td>
                    ${
                        clan.change > 0
                            ? `↑ ${clan.change}%`
                            : clan.change < 0
                                ? `↓ ${Math.abs(clan.change)}%`
                                : "—"
                    }
                </td>

            </tr>
        `)
        .join("");
}


/* =========================================================
   LEVEL RANKING
   ========================================================= */

function renderLevelRanking(targetId) {
    const container =
        document.getElementById(targetId);

    if (!container) return;

    const sorted = [...players]
        .sort((a, b) => b.level - a.level)
        .slice(0, 10);

    if (!sorted.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>★</div>
                <h3>Brak danych</h3>
            </div>
        `;

        return;
    }

    container.innerHTML = sorted
        .map((player, index) => `
            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:14px;
                    padding:12px 0;
                    border-bottom:1px solid rgba(255,255,255,.06);
                "
            >

                <div
                    style="
                        width:28px;
                        font-weight:800;
                        opacity:.65;
                    "
                >
                    ${index + 1}
                </div>

                <div style="flex:1;">

                    <a
                        href="https://hodowlarp.pl/gracz/${encodeURIComponent(player.name)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                            font-weight:700;
                            text-decoration:none;
                        "
                    >
                        ${escapeHTML(player.name)}
                    </a>

                    <div
                        style="
                            font-size:12px;
                            opacity:.55;
                            margin-top:3px;
                        "
                    >
                        ${escapeHTML(player.clan)}
                    </div>

                </div>

                <div
                    style="
                        font-weight:800;
                    "
                >
                    ${player.level} lvl
                </div>

            </div>
        `)
        .join("");
}


/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {
    const container =
        document.getElementById("moneyRanking");

    if (!container) return;

    const sorted = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    if (!sorted.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div>$</div>
                <h3>Brak danych</h3>
            </div>
        `;

        return;
    }

    container.innerHTML = sorted
        .map((player, index) => `
            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:14px;
                    padding:12px 0;
                    border-bottom:1px solid rgba(255,255,255,.06);
                "
            >

                <div
                    style="
                        width:28px;
                        font-weight:800;
                        opacity:.65;
                    "
                >
                    ${index + 1}
                </div>

                <div style="flex:1;">

                    <a
                        href="https://hodowlarp.pl/gracz/${encodeURIComponent(player.name)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                            font-weight:700;
                            text-decoration:none;
                        "
                    >
                        ${escapeHTML(player.name)}
                    </a>

                </div>

                <div style="font-weight:800;">
                    ${formatMoney(player.money)}
                </div>

            </div>
        `)
        .join("");
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {
    const table =
        document.getElementById("marketTable");

    if (!table) return;

    if (!clans.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div>◆</div>
                        <h3>Brak danych rynku</h3>
                        <p>API nie zwróciło danych klanów.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = clans
        .slice()
        .sort((a, b) => b.wealth - a.wealth)
        .map(clan => `
            <tr>

                <td>
                    <strong>
                        ${escapeHTML(clan.name)}
                    </strong>
                </td>

                <td>
                    ${formatMoney(clan.wealth)}
                </td>

                <td>
                    ${
                        clan.change > 0
                            ? `↑ ${clan.change}%`
                            : "—"
                    }
                </td>

                <td>
                    ${
                        clan.change > 0
                            ? `↑ ${clan.change}%`
                            : "—"
                    }
                </td>

                <td>
                    <span style="color:#4ade80;">
                        ● AKTYWNY
                    </span>
                </td>

            </tr>
        `)
        .join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

function performSearch(query) {
    const container =
        document.getElementById("searchResults");

    if (!container) return;

    const search =
        normalizeName(query);

    if (!search) {
        container.innerHTML = `
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

    const foundPlayers =
        players.filter(player =>
            normalizeName(player.name)
                .includes(search)
        );

    const foundClans =
        clans.filter(clan =>
            normalizeName(clan.name)
                .includes(search)
        );

    if (
        foundPlayers.length === 0 &&
        foundClans.length === 0
    ) {
        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Nie znaleziono
                </h3>

                <p>
                    Brak gracza lub klanu o takiej nazwie.
                </p>

            </div>
        `;

        return;
    }

    let html = "";

    foundPlayers.forEach(player => {
        html += `
            <div
                style="
                    padding:16px;
                    border-bottom:1px solid rgba(255,255,255,.06);
                "
            >

                <div style="font-size:11px;opacity:.5;">
                    GRACZ
                </div>

                <a
                    href="https://hodowlarp.pl/gracz/${encodeURIComponent(player.name)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                        font-size:18px;
                        font-weight:800;
                        text-decoration:none;
                    "
                >
                    ${escapeHTML(player.name)}
                </a>

                <div
                    style="
                        margin-top:7px;
                        opacity:.65;
                    "
                >
                    Poziom ${player.level}
                    • ${formatMoney(player.money)}
                    • Klan: ${escapeHTML(player.clan)}
                </div>

            </div>
        `;
    });

    foundClans.forEach(clan => {
        html += `
            <div
                style="
                    padding:16px;
                    border-bottom:1px solid rgba(255,255,255,.06);
                "
            >

                <div style="font-size:11px;opacity:.5;">
                    KLAN
                </div>

                <div
                    style="
                        font-size:18px;
                        font-weight:800;
                    "
                >
                    ${escapeHTML(clan.name)}
                </div>

                <div
                    style="
                        margin-top:7px;
                        opacity:.65;
                    "
                >
                    Lider: ${escapeHTML(clan.leader)}
                    • Członkowie: ${clan.members}
                    • Majątek: ${formatMoney(clan.wealth)}
                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}


/* =========================================================
   PLAYER SEARCH
   ========================================================= */

function setupPlayerSearch() {
    const input =
        document.getElementById("playerSearch");

    if (!input) return;

    input.addEventListener("input", () => {
        const query =
            normalizeName(input.value);

        let filtered = players.filter(player =>
            normalizeName(player.name)
                .includes(query)
        );

        applyPlayerSort(filtered);
    });
}


/* =========================================================
   PLAYER SORT
   ========================================================= */

function applyPlayerSort(list = players) {
    const select =
        document.getElementById("playerSort");

    const sort =
        select?.value || "money";

    const sorted = [...list];

    if (sort === "money") {
        sorted.sort(
            (a, b) => b.money - a.money
        );
    }

    if (sort === "level") {
        sorted.sort(
            (a, b) => b.level - a.level
        );
    }

    if (sort === "time") {
        sorted.sort(
            (a, b) =>
                String(b.activity)
                    .localeCompare(
                        String(a.activity)
                    )
        );
    }

    renderPlayersTable(sorted);
}


/* =========================================================
   CLAN SEARCH
   ========================================================= */

function setupClanSearch() {
    const input =
        document.getElementById("clanSearch");

    if (!input) return;

    input.addEventListener("input", () => {
        const query =
            normalizeName(input.value);

        const filtered =
            clans.filter(clan =>
                normalizeName(clan.name)
                    .includes(query)
            );

        applyClanSort(filtered);
    });
}


/* =========================================================
   CLAN SORT
   ========================================================= */

function applyClanSort(list = clans) {
    const select =
        document.getElementById("clanSort");

    const sort =
        select?.value || "money";

    const sorted = [...list];

    if (sort === "money") {
        sorted.sort(
            (a, b) => b.wealth - a.wealth
        );
    }

    if (sort === "members") {
        sorted.sort(
            (a, b) => b.members - a.members
        );
    }

    if (sort === "time") {
        sorted.sort(
            (a, b) =>
                String(b.activity)
                    .localeCompare(
                        String(a.activity)
                    )
        );
    }

    renderClanTable(sorted);
}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function setupGlobalSearch() {
    const input =
        document.getElementById("globalSearch");

    if (!input) return;

    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        const query =
            input.value.trim();

        if (!query) return;

        switchPage("search");

        const pageInput =
            document.getElementById("globalSearchPage");

        if (pageInput) {
            pageInput.value = query;
        }

        performSearch(query);
    });
}


/* =========================================================
   SEARCH PAGE
   ========================================================= */

function setupSearchPage() {
    const input =
        document.getElementById("globalSearchPage");

    if (!input) return;

    input.addEventListener("input", () => {
        performSearch(input.value);
    });
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function switchPage(pageName) {
    const pages =
        document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const target =
        document.getElementById(pageName);

    if (target) {
        target.classList.add("active");
    }

    const navItems =
        document.querySelectorAll(".nav-item");

    navItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageName
        );
    });

    updatePageTitle(pageName);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function updatePageTitle(pageName) {
    const title =
        document.querySelector(".page-title h1");

    const subtitle =
        document.querySelector(".page-title p");

    if (!title) return;

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
            "Statystyki graczy Hodowla RP"
        ],
        rankings: [
            "Rankingi",
            "Najlepsi gracze i klany"
        ],
        charts: [
            "Wykresy",
            "Statystyki serwera"
        ],
        market: [
            "Rynek",
            "Zmiany wartości klanów"
        ],
        search: [
            "Wyszukiwarka",
            "Znajdź gracza lub klan"
        ]
    };

    const data =
        titles[pageName] || titles.dashboard;

    title.textContent = data[0];

    if (subtitle) {
        subtitle.textContent = data[1];
    }
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {
    const button =
        document.getElementById("mobileMenu");

    const sidebar =
        document.getElementById("sidebar");

    if (!button || !sidebar) return;

    button.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {
            item.addEventListener("click", () => {
                sidebar.classList.remove("open");
            });
        });
}


/* =========================================================
   NAV CLICK EVENTS
   ========================================================= */

function setupNavigation() {
    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.addEventListener("click", () => {

                const page =
                    item.dataset.page;

                if (page) {
                    switchPage(page);
                }

            });

        });


    document
        .querySelectorAll("[data-page-link]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const page =
                    button.dataset.pageLink;

                if (page) {
                    switchPage(page);
                }

            });

        });
}


/* =========================================================
   REFRESH
   ========================================================= */

function setupRefresh() {
    const button =
        document.getElementById("refreshButton");

    if (!button) return;

    button.addEventListener("click", async () => {

        button.disabled = true;

        const oldText =
            button.innerHTML;

        button.innerHTML =
            "↻ Pobieranie...";

        await loadAPI();

        button.disabled = false;
        button.innerHTML = oldText;

    });
}


/* =========================================================
   CHART.JS
   ========================================================= */

function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}


function createActivityChart(canvasId, chartName) {
    const canvas =
        document.getElementById(canvasId);

    if (!canvas) return;

    /*
     * Chart.js musi być dostępny.
     */
    if (typeof Chart === "undefined") {
        console.warn(
            "Chart.js nie jest załadowany."
        );
        return;
    }

    destroyChart(chartName);

    /*
     * API /recent może nie zawierać historii.
     * W takim przypadku pokazujemy prosty wykres
     * oparty na aktualnej liczbie graczy.
     */
    const count = players.length;

    const labels = [
        "Pon",
        "Wt",
        "Śr",
        "Czw",
        "Pt",
        "Sob",
        "Nd"
    ];

    const values = labels.map(() => count);

    charts[chartName] =
        new Chart(canvas, {
            type: "line",

            data: {
                labels,

                datasets: [
                    {
                        label: "Gracze",
                        data: values,

                        borderWidth: 2,

                        tension: 0.35,

                        fill: true,

                        pointRadius: 3
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
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
}


function createClanChart() {
    const canvas =
        document.getElementById("clanChart");

    if (!canvas) return;

    if (typeof Chart === "undefined") {
        return;
    }

    destroyChart("clans");

    const top =
        [...clans]
            .sort((a, b) =>
                b.wealth - a.wealth
            )
            .slice(0, 7);

    if (!top.length) return;

    charts.clans =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels: top.map(
                    clan => clan.name
                ),

                datasets: [
                    {
                        label: "Majątek",

                        data: top.map(
                            clan => clan.wealth
                        ),

                        borderWidth: 1
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
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
}


function createWealthChart() {
    const canvas =
        document.getElementById("wealthChart");

    if (!canvas) return;

    if (typeof Chart === "undefined") {
        return;
    }

    destroyChart("wealth");

    const top =
        [...clans]
            .sort((a, b) =>
                b.wealth - a.wealth
            )
            .slice(0, 10);

    if (!top.length) return;

    charts.wealth =
        new Chart(canvas, {
            type: "bar",

            data: {
                labels: top.map(
                    clan => clan.name
                ),

                datasets: [
                    {
                        label: "Majątek",

                        data: top.map(
                            clan => clan.wealth
                        ),

                        borderWidth: 1
                    }
                ]
            },

            options: {
                responsive: true,

                maintainAspectRatio: false,

                indexAxis: "y",

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
}


function renderCharts() {
    createActivityChart(
        "activityChart",
        "activity"
    );

    createActivityChart(
        "activityChart2",
        "activity2"
    );

    createClanChart();

    createWealthChart();
}


/* =========================================================
   EVERYTHING
   ========================================================= */

function renderEverything() {
    updateDashboardStats();

    renderPlayersTable(players);

    renderRichPlayers();

    renderClanTable(clans);

    renderDashboardClans();

    renderLevelRanking("levelRanking");

    renderLevelRanking("levelRanking2");

    renderMoneyRanking();

    renderMarket();

    renderCharts();
}


/* =========================================================
   SORT EVENTS
   ========================================================= */

function setupSortEvents() {
    const playerSort =
        document.getElementById("playerSort");

    if (playerSort) {
        playerSort.addEventListener(
            "change",
            () => applyPlayerSort()
        );
    }

    const clanSort =
        document.getElementById("clanSort");

    if (clanSort) {
        clanSort.addEventListener(
            "change",
            () => applyClanSort()
        );
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function init() {

    console.log(
        "===================================="
    );

    console.log(
        "EXODO STATS uruchomione"
    );

    console.log(
        "API:",
        API_URL
    );

    console.log(
        "===================================="
    );


    setupNavigation();

    setupMobileMenu();

    setupRefresh();

    setupGlobalSearch();

    setupSearchPage();

    setupPlayerSearch();

    setupClanSearch();

    setupSortEvents();


    /*
     * Najpierw próbujemy pobrać prawdziwe dane.
     */
    await loadAPI();
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
} else {
    init();
}
