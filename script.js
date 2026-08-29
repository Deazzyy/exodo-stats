/* =========================================================
   EXODO STATS
   script.js
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev/api/recent?limit=20";

let players = [];
let clans = [];

let activityChart = null;
let activityChart2 = null;
let clanChart = null;
let wealthChart = null;


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


function cleanNumber(value) {
    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    let text = String(value)
        .trim()
        .replace(/\s/g, "")
        .replace(/\$/g, "")
        .replace(/,/g, "")
        .replace(/zł/gi, "");

    const number = Number(text);

    return Number.isFinite(number) ? number : 0;
}


function formatMoney(value) {
    const number = cleanNumber(value);

    return number.toLocaleString("pl-PL") + "$";
}


function formatNumber(value) {
    const number = cleanNumber(value);

    return number.toLocaleString("pl-PL");
}


function getValue(object, keys, fallback = null) {
    if (!object || typeof object !== "object") {
        return fallback;
    }

    for (const key of keys) {
        if (
            object[key] !== undefined &&
            object[key] !== null &&
            object[key] !== ""
        ) {
            return object[key];
        }
    }

    return fallback;
}


/* =========================================================
   PLAYER DATA
   ========================================================= */

function getPlayerName(player) {
    return getValue(
        player,
        [
            "name",
            "username",
            "nick",
            "nickname",
            "player",
            "playerName",
            "login"
        ],
        "Nieznany"
    );
}


function getPlayerLevel(player) {
    return getValue(
        player,
        [
            "level",
            "lvl",
            "poziom",
            "playerLevel"
        ],
        0
    );
}


function getPlayerMoney(player) {
    return getValue(
        player,
        [
            "money",
            "cash",
            "balance",
            "gotowka",
            "gotówka",
            "wallet",
            "coins"
        ],
        0
    );
}


function getPlayerClan(player) {
    const clan = getValue(
        player,
        [
            "clan",
            "clanName",
            "klan",
            "guild",
            "gang"
        ],
        null
    );

    if (
        clan === null ||
        clan === undefined ||
        clan === ""
    ) {
        return "—";
    }

    if (typeof clan === "object") {
        return getValue(
            clan,
            [
                "name",
                "tag",
                "clanName"
            ],
            "—"
        );
    }

    return String(clan);
}


function getPlayerActivity(player) {
    return getValue(
        player,
        [
            "activity",
            "lastActivity",
            "lastSeen",
            "lastOnline",
            "onlineText",
            "statusText",
            "activityText",
            "activity_text"
        ],
        "—"
    );
}


/*
   Sprawdzamy również tekst aktywności.
   Dzięki temu "Teraz Gra na serwerze"
   może zostać rozpoznane jako ONLINE.
*/

function isPlayerOnline(player) {

    const directStatus = getValue(
        player,
        [
            "online",
            "isOnline",
            "onlineNow",
            "is_online"
        ],
        null
    );

    if (typeof directStatus === "boolean") {
        return directStatus;
    }

    if (typeof directStatus === "string") {

        const text =
            directStatus
                .trim()
                .toLowerCase();

        if (
            text === "true" ||
            text === "online" ||
            text === "1"
        ) {
            return true;
        }

        if (
            text === "false" ||
            text === "offline" ||
            text === "0"
        ) {
            return false;
        }
    }

    const activity =
        String(getPlayerActivity(player))
            .trim()
            .toLowerCase();

    return (
        activity.includes("teraz gra") ||
        activity.includes("gra na serwerze") ||
        activity === "online"
    );
}


/* =========================================================
   CLAN DATA
   ========================================================= */

function getClanName(clan) {
    return getValue(
        clan,
        [
            "name",
            "clanName",
            "klan",
            "tag"
        ],
        "Nieznany"
    );
}


function getClanLeader(clan) {
    const leader = getValue(
        clan,
        [
            "leader",
            "leaderName",
            "lider",
            "owner"
        ],
        "—"
    );

    if (typeof leader === "object") {
        return getValue(
            leader,
            [
                "name",
                "username",
                "nick"
            ],
            "—"
        );
    }

    return leader;
}


function getClanMembers(clan) {
    return getValue(
        clan,
        [
            "members",
            "memberCount",
            "membersCount",
            "czlonkowie",
            "członkowie"
        ],
        0
    );
}


function getClanMoney(clan) {
    return getValue(
        clan,
        [
            "money",
            "cash",
            "balance",
            "gotowka",
            "gotówka"
        ],
        0
    );
}


function getClanWealth(clan) {
    return getValue(
        clan,
        [
            "wealth",
            "value",
            "worth",
            "asset",
            "assets",
            "majątek",
            "majetek"
        ],
        getClanMoney(clan)
    );
}


function getClanActivity(clan) {
    return getValue(
        clan,
        [
            "activity",
            "lastActivity",
            "active",
            "online"
        ],
        "—"
    );
}


function getClanChange(clan) {
    return getValue(
        clan,
        [
            "change",
            "changePercent",
            "weeklyChange",
            "trend"
        ],
        0
    );
}


/* =========================================================
   API
   ========================================================= */

async function loadData() {

    try {

        setLoadingState(true);

        const response = await fetch(API_URL, {
            method: "GET",

            headers: {
                "Accept": "application/json"
            },

            cache: "no-store"
        });


        if (!response.ok) {
            throw new Error(
                "API HTTP " + response.status
            );
        }


        const data = await response.json();


        console.log(
            "EXODO API - odpowiedź:",
            data
        );


        normalizeData(data);


        console.log(
            "EXODO - gracze:",
            players
        );

        console.log(
            "EXODO - klany:",
            clans
        );


        renderEverything();


        showToast(
            "✓ Statystyki zostały odświeżone"
        );


    } catch (error) {

        console.error(
            "Błąd EXODO API:",
            error
        );

        showToast(
            "⚠ Nie udało się pobrać danych API"
        );

        renderFallback();


    } finally {

        setLoadingState(false);
    }
}


/* =========================================================
   NORMALIZACJA API
   ========================================================= */

function normalizeData(data) {

    let rawPlayers = [];
    let rawClans = [];


    /*
       API może zwrócić:
       - tablicę
       - { players: [] }
       - { gracze: [] }
       - { recent: [] }
       - { data: [] }
    */

    if (Array.isArray(data)) {
        rawPlayers = data;
    }


    if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
    ) {

        if (Array.isArray(data.players)) {
            rawPlayers = data.players;
        }

        if (Array.isArray(data.gracze)) {
            rawPlayers = data.gracze;
        }

        if (Array.isArray(data.recent)) {
            rawPlayers = data.recent;
        }

        if (Array.isArray(data.data)) {
            rawPlayers = data.data;
        }


        if (Array.isArray(data.clans)) {
            rawClans = data.clans;
        }

        if (Array.isArray(data.klany)) {
            rawClans = data.klany;
        }
    }


    /*
       Usuwamy puste elementy.
    */

    players = rawPlayers
        .filter(
            item =>
                item &&
                typeof item === "object"
        )
        .map(item => ({
            ...item
        }));


    clans = rawClans
        .filter(
            item =>
                item &&
                typeof item === "object"
        )
        .map(item => ({
            ...item
        }));


    /*
       Jeżeli /recent daje tylko graczy,
       tworzymy listę klanów z graczy.
    */

    if (clans.length === 0) {
        clans =
            buildClansFromPlayers(players);
    }
}


/* =========================================================
   BUILD CLANS
   ========================================================= */

function buildClansFromPlayers(playerList) {

    const clanMap = {};


    playerList.forEach(player => {

        const clan =
            getPlayerClan(player);


        if (
            !clan ||
            clan === "—"
        ) {
            return;
        }


        const key =
            String(clan)
                .trim()
                .toLowerCase();


        if (!clanMap[key]) {

            clanMap[key] = {

                name: clan,

                leader: "—",

                members: 0,

                money: 0,

                wealth: 0,

                activity: "—",

                change: 0
            };
        }


        clanMap[key].members++;


        clanMap[key].money +=
            cleanNumber(
                getPlayerMoney(player)
            );


        clanMap[key].wealth =
            clanMap[key].money;
    });


    return Object.values(clanMap);
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

    renderDashboardStats();


    renderPlayersTable(
        document.getElementById(
            "allPlayersTable"
        ),
        players
    );


    renderRichPlayers();


    renderClanTable(
        document.getElementById(
            "allClansTable"
        ),
        clans
    );


    renderClanTable(
        document.getElementById(
            "clanTable"
        ),
        clans.slice(0, 10)
    );


    renderLevels(
        document.getElementById(
            "levelRanking"
        )
    );


    renderLevels(
        document.getElementById(
            "levelRanking2"
        )
    );


    renderMoneyRanking();


    renderMarket();


    renderCharts();
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

function renderDashboardStats() {

    const statCards =
        document.querySelectorAll(
            ".stat-card"
        );


    if (!statCards.length) {
        return;
    }


    const totalPlayers =
        players.length;


    const online =
        players.filter(
            player =>
                isPlayerOnline(player)
        ).length;


    const totalClanCount =
        clans.length;


    const totalMoney =
        players.reduce(
            (sum, player) => {

                return (
                    sum +
                    cleanNumber(
                        getPlayerMoney(player)
                    )
                );

            },
            0
        );


    if (statCards[0]) {

        const value =
            statCards[0].querySelector(
                ".stat-value"
            );


        if (value) {

            value.textContent =
                formatNumber(
                    totalPlayers
                );
        }
    }


    if (statCards[1]) {

        const value =
            statCards[1].querySelector(
                ".stat-value"
            );


        if (value) {

            value.textContent =
                formatNumber(
                    online
                );
        }
    }


    if (statCards[2]) {

        const value =
            statCards[2].querySelector(
                ".stat-value"
            );


        if (value) {

            value.textContent =
                formatNumber(
                    totalClanCount
                );
        }
    }


    if (statCards[3]) {

        const value =
            statCards[3].querySelector(
                ".stat-value"
            );


        if (value) {

            value.textContent =
                formatMoney(
                    totalMoney
                );
        }
    }


    const onlineElement =
        document.getElementById(
            "onlinePlayers"
        );


    if (onlineElement) {

        onlineElement.textContent =
            formatNumber(
                online
            );
    }
}


/* =========================================================
   PLAYERS TABLE
   ========================================================= */

function renderPlayersTable(element, list) {

    if (!element) {
        return;
    }


    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        element.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        Brak danych graczy
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    element.innerHTML =
        list.map(
            (player, index) => {

                const name =
                    getPlayerName(player);


                const level =
                    getPlayerLevel(player);


                const money =
                    getPlayerMoney(player);


                const clan =
                    getPlayerClan(player);


                const activity =
                    getPlayerActivity(player);


                const online =
                    isPlayerOnline(player);


                const playerUrl =
                    "https://hodowlarp.pl/gracz/" +
                    encodeURIComponent(name);


                return `
                    <tr>

                        <td>
                            <strong>
                                ${index + 1}
                            </strong>
                        </td>


                        <td>

                            <a
                                href="${playerUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="player-link"
                            >
                                <strong>
                                    ${escapeHTML(name)}
                                </strong>
                            </a>

                        </td>


                        <td>
                            <strong>
                                ${escapeHTML(level)}
                            </strong>
                        </td>


                        <td>
                            ${formatMoney(money)}
                        </td>


                        <td>
                            ${
                                clan === "—"
                                    ? "—"
                                    : escapeHTML(clan)
                            }
                        </td>


                        <td>
                            ${escapeHTML(activity)}
                        </td>


                        <td>

                            <span class="status ${
                                online
                                    ? "online"
                                    : "offline"
                            }">

                                ● ${
                                    online
                                        ? "ONLINE"
                                        : "DANE API"
                                }

                            </span>

                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   RICH PLAYERS
   ========================================================= */

function renderRichPlayers() {

    const element =
        document.getElementById(
            "richPlayersTable"
        );


    if (!element) {
        return;
    }


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    cleanNumber(
                        getPlayerMoney(b)
                    ) -
                    cleanNumber(
                        getPlayerMoney(a)
                    )
            )
            .slice(0, 10);


    if (!sorted.length) {

        element.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        Brak danych
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    element.innerHTML =
        sorted.map(
            (player, index) => {

                const name =
                    getPlayerName(player);


                const level =
                    getPlayerLevel(player);


                const money =
                    getPlayerMoney(player);


                const clan =
                    getPlayerClan(player);


                const activity =
                    getPlayerActivity(player);


                const playerUrl =
                    "https://hodowlarp.pl/gracz/" +
                    encodeURIComponent(name);


                return `
                    <tr>

                        <td>
                            <strong>
                                ${index + 1}
                            </strong>
                        </td>


                        <td>

                            <a
                                href="${playerUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="player-link"
                            >
                                <strong>
                                    ${escapeHTML(name)}
                                </strong>
                            </a>

                        </td>


                        <td>
                            ${escapeHTML(level)}
                        </td>


                        <td>
                            ${formatMoney(money)}
                        </td>


                        <td>
                            ${
                                clan === "—"
                                    ? "—"
                                    : escapeHTML(clan)
                            }
                        </td>


                        <td>
                            ${escapeHTML(activity)}
                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   CLANS TABLE
   ========================================================= */

function renderClanTable(element, list) {

    if (!element) {
        return;
    }


    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        element.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        Brak danych klanów
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    const sorted =
        [...list].sort(
            (a, b) =>
                cleanNumber(
                    getClanWealth(b)
                ) -
                cleanNumber(
                    getClanWealth(a)
                )
        );


    element.innerHTML =
        sorted.map(
            (clan, index) => {

                const name =
                    getClanName(clan);


                const leader =
                    getClanLeader(clan);


                const members =
                    getClanMembers(clan);


                const money =
                    getClanMoney(clan);


                const wealth =
                    getClanWealth(clan);


                const activity =
                    getClanActivity(clan);


                const change =
                    getClanChange(clan);


                const changeNumber =
                    Number(change);


                let changeText = "—";


                if (
                    Number.isFinite(
                        changeNumber
                    )
                ) {

                    if (changeNumber > 0) {

                        changeText =
                            `↑ ${changeNumber}%`;

                    } else if (
                        changeNumber < 0
                    ) {

                        changeText =
                            `↓ ${Math.abs(changeNumber)}%`;

                    } else {

                        changeText = "—";
                    }

                } else {

                    changeText =
                        escapeHTML(change);
                }


                return `
                    <tr>

                        <td>
                            <strong>
                                ${index + 1}
                            </strong>
                        </td>


                        <td>
                            <strong>
                                ${escapeHTML(name)}
                            </strong>
                        </td>


                        <td>
                            ${escapeHTML(leader)}
                        </td>


                        <td>
                            ${formatNumber(members)}
                        </td>


                        <td>
                            ${formatMoney(money)}
                        </td>


                        <td>
                            ${formatMoney(wealth)}
                        </td>


                        <td>
                            ${escapeHTML(activity)}
                        </td>


                        <td>
                            ${changeText}
                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   LEVEL RANKINGS
   ========================================================= */

function renderLevels(element) {

    if (!element) {
        return;
    }


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    cleanNumber(
                        getPlayerLevel(b)
                    ) -
                    cleanNumber(
                        getPlayerLevel(a)
                    )
            )
            .slice(0, 10);


    if (!sorted.length) {

        element.innerHTML = `
            <div class="empty-state">
                Brak danych
            </div>
        `;

        return;
    }


    element.innerHTML =
        sorted.map(
            (player, index) => {

                const name =
                    getPlayerName(player);


                const level =
                    getPlayerLevel(player);


                return `
                    <div class="ranking-row">

                        <div class="ranking-position">
                            ${index + 1}
                        </div>


                        <div class="ranking-name">
                            ${escapeHTML(name)}
                        </div>


                        <div class="ranking-value">
                            ${escapeHTML(level)} lvl
                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


/* =========================================================
   MONEY RANKING
   ========================================================= */

function renderMoneyRanking() {

    const element =
        document.getElementById(
            "moneyRanking"
        );


    if (!element) {
        return;
    }


    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    cleanNumber(
                        getPlayerMoney(b)
                    ) -
                    cleanNumber(
                        getPlayerMoney(a)
                    )
            )
            .slice(0, 10);


    if (!sorted.length) {

        element.innerHTML = `
            <div class="empty-state">
                Brak danych
            </div>
        `;

        return;
    }


    element.innerHTML =
        sorted.map(
            (player, index) => {

                const name =
                    getPlayerName(player);


                const money =
                    getPlayerMoney(player);


                return `
                    <div class="ranking-row">

                        <div class="ranking-position">
                            ${index + 1}
                        </div>


                        <div class="ranking-name">
                            ${escapeHTML(name)}
                        </div>


                        <div class="ranking-value">
                            ${formatMoney(money)}
                        </div>

                    </div>
                `;
            }
        )
        .join("");
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const element =
        document.getElementById(
            "marketTable"
        );


    if (!element) {
        return;
    }


    if (!clans.length) {

        element.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        Brak danych rynku
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    const sorted =
        [...clans]
            .sort(
                (a, b) =>
                    cleanNumber(
                        getClanWealth(b)
                    ) -
                    cleanNumber(
                        getClanWealth(a)
                    )
            )
            .slice(0, 20);


    element.innerHTML =
        sorted.map(
            clan => {

                const name =
                    getClanName(clan);


                const value =
                    getClanWealth(clan);


                const change =
                    getClanChange(clan);


                const number =
                    Number(change);


                let today = "—";
                let week = "—";


                if (
                    Number.isFinite(number)
                ) {

                    if (number > 0) {

                        today =
                            `↑ ${number}%`;

                        week =
                            `↑ ${number}%`;

                    } else if (
                        number < 0
                    ) {

                        today =
                            `↓ ${Math.abs(number)}%`;

                        week =
                            `↓ ${Math.abs(number)}%`;

                    } else {

                        today = "0%";
                        week = "0%";
                    }
                }


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(name)}
                            </strong>
                        </td>


                        <td>
                            ${formatMoney(value)}
                        </td>


                        <td>
                            ${today}
                        </td>


                        <td>
                            ${week}
                        </td>


                        <td>

                            <span class="status online">
                                ● AKTYWNY
                            </span>

                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   SEARCH
   ========================================================= */

function searchPlayersAndClans(query) {

    const text =
        String(query || "")
            .trim()
            .toLowerCase();


    if (!text) {
        return [];
    }


    const results = [];


    players.forEach(player => {

        const name =
            String(
                getPlayerName(player)
            );


        if (
            name
                .toLowerCase()
                .includes(text)
        ) {

            results.push({

                type: "player",

                name,

                data: player
            });
        }
    });


    clans.forEach(clan => {

        const name =
            String(
                getClanName(clan)
            );


        if (
            name
                .toLowerCase()
                .includes(text)
        ) {

            results.push({

                type: "clan",

                name,

                data: clan
            });
        }
    });


    return results.slice(0, 20);
}


function renderSearchResults(query) {

    const element =
        document.getElementById(
            "searchResults"
        );


    if (!element) {
        return;
    }


    const results =
        searchPlayersAndClans(query);


    if (!String(query).trim()) {

        element.innerHTML = `
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

        element.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Nie znaleziono wyników
                </h3>

                <p>
                    Spróbuj innej nazwy.
                </p>

            </div>
        `;

        return;
    }


    element.innerHTML =
        results.map(result => {

            if (
                result.type === "player"
            ) {

                const url =
                    "https://hodowlarp.pl/gracz/" +
                    encodeURIComponent(
                        result.name
                    );


                return `
                    <div class="search-result">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    result.name
                                )}
                            </strong>

                            <small>
                                Gracz
                            </small>

                        </div>


                        <a
                            href="${url}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn"
                        >
                            Otwórz →
                        </a>

                    </div>
                `;
            }


            return `
                <div class="search-result">

                    <div>

                        <strong>
                            ${escapeHTML(
                                result.name
                            )}
                        </strong>

                        <small>
                            Klan
                        </small>

                    </div>

                </div>
            `;

        })
        .join("");
}


/* =========================================================
   CHART.JS
   ========================================================= */

function loadChartJS() {

    return new Promise(
        (resolve, reject) => {

            if (
                typeof Chart !== "undefined"
            ) {

                resolve();
                return;
            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdn.jsdelivr.net/npm/chart.js";


            script.onload =
                resolve;


            script.onerror =
                reject;


            document.head.appendChild(
                script
            );
        }
    );
}


async function renderCharts() {

    try {

        await loadChartJS();

    } catch (error) {

        console.error(
            "Nie można załadować Chart.js",
            error
        );

        return;
    }


    createActivityChart(
        "activityChart"
    );


    createActivityChart(
        "activityChart2"
    );


    createClanChart(
        "clanChart"
    );


    createClanChart(
        "wealthChart"
    );
}


/* =========================================================
   ACTIVITY CHART
   ========================================================= */

function createActivityChart(canvasId) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) {
        return;
    }


    if (
        canvasId === "activityChart" &&
        activityChart
    ) {

        activityChart.destroy();

        activityChart = null;
    }


    if (
        canvasId === "activityChart2" &&
        activityChart2
    ) {

        activityChart2.destroy();

        activityChart2 = null;
    }


    const labels = [
        "Pon",
        "Wt",
        "Śr",
        "Czw",
        "Pt",
        "Sob",
        "Nd"
    ];


    const online =
        players.filter(
            player =>
                isPlayerOnline(player)
        ).length;


    const base =
        online > 0
            ? online
            : players.length;


    const values = [

        Math.max(
            0,
            Math.round(base * 0.55)
        ),

        Math.max(
            0,
            Math.round(base * 0.68)
        ),

        Math.max(
            0,
            Math.round(base * 0.61)
        ),

        Math.max(
            0,
            Math.round(base * 0.82)
        ),

        Math.max(
            0,
            Math.round(base * 0.74)
        ),

        Math.max(
            0,
            Math.round(base * 0.94)
        ),

        base
    ];


    const chart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [
                        {
                            label:
                                "Aktywni gracze",

                            data:
                                values,

                            tension:
                                0.35,

                            fill:
                                true
                        }
                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        }
                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            }
        );


    if (
        canvasId === "activityChart"
    ) {

        activityChart =
            chart;
    }


    if (
        canvasId === "activityChart2"
    ) {

        activityChart2 =
            chart;
    }
}


/* =========================================================
   CLAN CHART
   ========================================================= */

function createClanChart(canvasId) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) {
        return;
    }


    if (
        canvasId === "clanChart" &&
        clanChart
    ) {

        clanChart.destroy();

        clanChart = null;
    }


    if (
        canvasId === "wealthChart" &&
        wealthChart
    ) {

        wealthChart.destroy();

        wealthChart = null;
    }


    const topClans =
        [...clans]
            .sort(
                (a, b) =>
                    cleanNumber(
                        getClanWealth(b)
                    ) -
                    cleanNumber(
                        getClanWealth(a)
                    )
            )
            .slice(0, 10);


    const labels =
        topClans.map(
            clan =>
                getClanName(clan)
        );


    const values =
        topClans.map(
            clan =>
                cleanNumber(
                    getClanWealth(clan)
                )
        );


    const chart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [
                        {
                            label:
                                "Majątek",

                            data:
                                values
                        }
                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        }
                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true
                        }
                    }
                }
            }
        );


    if (
        canvasId === "clanChart"
    ) {

        clanChart =
            chart;
    }


    if (
        canvasId === "wealthChart"
    ) {

        wealthChart =
            chart;
    }
}


/* =========================================================
   SORTOWANIE GRACZY
   ========================================================= */

function sortPlayers(type) {

    const sorted =
        [...players];


    if (type === "money") {

        sorted.sort(
            (a, b) =>
                cleanNumber(
                    getPlayerMoney(b)
                ) -
                cleanNumber(
                    getPlayerMoney(a)
                )
        );
    }


    if (type === "level") {

        sorted.sort(
            (a, b) =>
                cleanNumber(
                    getPlayerLevel(b)
                ) -
                cleanNumber(
                    getPlayerLevel(a)
                )
        );
    }


    if (type === "time") {

        sorted.sort(
            (a, b) =>
                String(
                    getPlayerActivity(a)
                ).localeCompare(
                    String(
                        getPlayerActivity(b)
                    ),
                    "pl"
                )
        );
    }


    return sorted;
}


/* =========================================================
   SORTOWANIE KLANÓW
   ========================================================= */

function sortClans(type) {

    const sorted =
        [...clans];


    if (type === "money") {

        sorted.sort(
            (a, b) =>
                cleanNumber(
                    getClanWealth(b)
                ) -
                cleanNumber(
                    getClanWealth(a)
                )
        );
    }


    if (type === "members") {

        sorted.sort(
            (a, b) =>
                cleanNumber(
                    getClanMembers(b)
                ) -
                cleanNumber(
                    getClanMembers(a)
                )
        );
    }


    if (type === "time") {

        sorted.sort(
            (a, b) =>
                String(
                    getClanActivity(a)
                ).localeCompare(
                    String(
                        getClanActivity(b)
                    ),
                    "pl"
                )
        );
    }


    return sorted;
}


/* =========================================================
   FILTER GRACZY
   ========================================================= */

function filterPlayers() {

    const input =
        document.getElementById(
            "playerSearch"
        );


    if (!input) {
        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    const sort =
        document.getElementById(
            "playerSort"
        );


    const type =
        sort
            ? sort.value
            : "money";


    let result =
        sortPlayers(type);


    if (query) {

        result =
            result.filter(
                player =>
                    String(
                        getPlayerName(player)
                    )
                        .toLowerCase()
                        .includes(query)
            );
    }


    renderPlayersTable(
        document.getElementById(
            "allPlayersTable"
        ),
        result
    );
}


/* =========================================================
   FILTER KLANÓW
   ========================================================= */

function filterClans() {

    const input =
        document.getElementById(
            "clanSearch"
        );


    if (!input) {
        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    const sort =
        document.getElementById(
            "clanSort"
        );


    const type =
        sort
            ? sort.value
            : "money";


    let result =
        sortClans(type);


    if (query) {

        result =
            result.filter(
                clan =>
                    String(
                        getClanName(clan)
                    )
                        .toLowerCase()
                        .includes(query)
            );
    }


    renderClanTable(
        document.getElementById(
            "allClansTable"
        ),
        result
    );
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


    const pageTitle =
        document.querySelector(
            ".page-title h1"
        );


    const pageSubtitle =
        document.querySelector(
            ".page-title p"
        );


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
            "Statystyki graczy"
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


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;


                if (!page) {
                    return;
                }


                navItems.forEach(
                    nav =>
                        nav.classList.remove(
                            "active"
                        )
                );


                item.classList.add(
                    "active"
                );


                pages.forEach(
                    section => {

                        section.classList.toggle(
                            "active",
                            section.id === page
                        );
                    }
                );


                if (
                    pageTitle &&
                    titles[page]
                ) {

                    pageTitle.textContent =
                        titles[page][0];
                }


                if (
                    pageSubtitle &&
                    titles[page]
                ) {

                    pageSubtitle.textContent =
                        titles[page][1];
                }


                const sidebar =
                    document.getElementById(
                        "sidebar"
                    );


                if (sidebar) {

                    sidebar.classList.remove(
                        "open"
                    );
                }


                if (
                    page === "charts"
                ) {

                    setTimeout(
                        renderCharts,
                        100
                    );
                }
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

                    const target =
                        button.dataset.pageLink;


                    const nav =
                        document.querySelector(
                            `.nav-item[data-page="${target}"]`
                        );


                    if (nav) {
                        nav.click();
                    }
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


    if (
        !button ||
        !sidebar
    ) {
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
   SEARCH EVENTS
   ========================================================= */

function setupSearch() {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );


    if (globalSearch) {

        globalSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }


                const value =
                    globalSearch.value.trim();


                if (!value) {
                    return;
                }


                const searchNav =
                    document.querySelector(
                        '.nav-item[data-page="search"]'
                    );


                if (searchNav) {
                    searchNav.click();
                }


                const pageSearch =
                    document.getElementById(
                        "globalSearchPage"
                    );


                if (pageSearch) {

                    pageSearch.value =
                        value;


                    renderSearchResults(
                        value
                    );
                }
            }
        );
    }


    const pageSearch =
        document.getElementById(
            "globalSearchPage"
        );


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
   FILTER EVENTS
   ========================================================= */

function setupFilters() {

    const playerSearch =
        document.getElementById(
            "playerSearch"
        );


    const playerSort =
        document.getElementById(
            "playerSort"
        );


    const clanSearch =
        document.getElementById(
            "clanSearch"
        );


    const clanSort =
        document.getElementById(
            "clanSort"
        );


    if (playerSearch) {

        playerSearch.addEventListener(
            "input",
            filterPlayers
        );
    }


    if (playerSort) {

        playerSort.addEventListener(
            "change",
            filterPlayers
        );
    }


    if (clanSearch) {

        clanSearch.addEventListener(
            "input",
            filterClans
        );
    }


    if (clanSort) {

        clanSort.addEventListener(
            "change",
            filterClans
        );
    }
}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setupRefresh() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            button.disabled =
                true;


            const original =
                button.textContent;


            button.textContent =
                "↻ Ładowanie...";


            await loadData();


            button.textContent =
                original;


            button.disabled =
                false;
        }
    );
}


/* =========================================================
   TOAST
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
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.exodoToastTimer
    );


    window.exodoToastTimer =
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
   LOADING
   ========================================================= */

function setLoadingState(isLoading) {

    document.body.classList.toggle(
        "loading",
        isLoading
    );
}


/* =========================================================
   FALLBACK
   ========================================================= */

function renderFallback() {

    const playerTable =
        document.getElementById(
            "allPlayersTable"
        );


    if (playerTable) {

        playerTable.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-state">

                        <h3>
                            Nie udało się pobrać danych
                        </h3>

                        <p>
                            Sprawdź połączenie
                            z EXODO API.
                        </p>

                    </div>

                </td>
            </tr>
        `;
    }
}


/* =========================================================
   AUTO REFRESH
   ========================================================= */

function setupAutoRefresh() {

    /*
       Odświeżamy co 60 sekund.
       API ma limit 20 rekordów,
       więc nie wykonujemy niepotrzebnych
       zapytań częściej.
    */

    setInterval(
        () => {

            loadData();

        },
        60000
    );
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupNavigation();

        setupMobileMenu();

        setupSearch();

        setupFilters();

        setupRefresh();

        setupAutoRefresh();

        loadData();

    }
);
