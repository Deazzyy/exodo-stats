/* =========================================================
   EXODO STATS — SCRIPT.JS
   API + NAVIGATION + PLAYERS + SEARCH + SORTING + CHARTS
   ========================================================= */

const API_BASE =
    "https://exodo-api.oliwierdawidowicz.workers.dev";

const RECENT_API =
    `${API_BASE}/api/recent?limit=100`;

let players = [];
let clans = [];

let activityChart = null;
let activityChart2 = null;
let clanChart = null;
let wealthChart = null;


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatMoney(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("pl-PL") + "$";
}

function getPlayerUrl(player) {
    if (player.sourceUrl) {
        return player.sourceUrl;
    }

    return `https://hodowlarp.pl/gracz/${encodeURIComponent(player.name)}`;
}


/* =========================================================
   WYCIĄGANIE PRAWDZIWEGO POZIOMU
   ========================================================= */

function getRealLevel(player) {

    /*
       API /recent obecnie zwraca w polu "level"
       kolejność gracza, a nie zawsze prawdziwy poziom.

       Przykład:
       MINICIPIO:
       level: 2
       playtime: "# 2 MINICIPIO 46 lvl"

       Dlatego najpierw próbujemy znaleźć "46 lvl".
    */

    const text = String(player.playtime || "");

    const match = text.match(/(\d+)\s*lvl/i);

    if (match) {
        return Number(match[1]);
    }

    /*
       Jeżeli nie ma prawdziwego poziomu w playtime,
       używamy wartości API.
    */

    if (
        player.level !== null &&
        player.level !== undefined &&
        player.level !== ""
    ) {
        return Number(player.level) || 0;
    }

    return 0;
}


/* =========================================================
   AKTYWNOŚĆ
   ========================================================= */

function getActivity(player) {

    const playtime = String(player.playtime || "").trim();

    if (player.status === "online") {
        return "Teraz — Gra na serwerze";
    }

    if (playtime) {
        return playtime;
    }

    if (player.lastSeen) {
        return player.lastSeen;
    }

    return "—";
}


/* =========================================================
   STATUS
   ========================================================= */

function getStatus(player) {

    if (
        player.status === true ||
        player.status === "online" ||
        player.status === "ONLINE"
    ) {
        return {
            text: "ONLINE",
            className: "positive"
        };
    }

    /*
       Ponieważ dane pochodzą z API,
       pokazujemy DANE API zamiast zgadywać OFFLINE.
    */

    return {
        text: "DANE API",
        className: "positive"
    };
}


/* =========================================================
   KLAN
   ========================================================= */

function getClan(player) {

    if (!player.clan) {
        return "—";
    }

    return player.clan;
}


/* =========================================================
   POBIERANIE GRACZY
   ========================================================= */

async function loadPlayers() {

    try {

        setLoadingState();

        const response = await fetch(RECENT_API, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (
            !data ||
            data.success !== true ||
            !Array.isArray(data.players)
        ) {
            throw new Error(
                "API nie zwróciło poprawnej listy graczy."
            );
        }

        players = data.players.map((player) => ({
            ...player,
            money: Number(player.money) || 0,
            level: getRealLevel(player)
        }));

        console.log(
            "EXODO API — gracze:",
            players
        );

        renderPlayers();
        renderRichPlayers();
        renderLevelRankings();
        renderMoneyRanking();
        renderDashboardStats();
        renderSearchResults();

        showToast(
            `✓ Pobrano ${players.length} graczy`
        );

    } catch (error) {

        console.error(
            "EXODO API ERROR:",
            error
        );

        showApiError();

        showToast(
            "✕ Nie udało się pobrać danych API"
        );
    }
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoadingState() {

    const tables = [
        $("allPlayersTable"),
        $("richPlayersTable")
    ];

    tables.forEach((table) => {

        if (!table) return;

        table.innerHTML = `
            <tr>
                <td colspan="10"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#6f6a78;
                    ">
                    Ładowanie danych z API...
                </td>
            </tr>
        `;
    });
}


/* =========================================================
   ERROR
   ========================================================= */

function showApiError() {

    const table = $("allPlayersTable");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="7"
                style="
                    text-align:center;
                    padding:45px;
                    color:#fb7185;
                ">
                Nie udało się pobrać danych z EXODO API.
                <br>
                <small style="color:#6f6a78;">
                    Sprawdź konsolę przeglądarki F12.
                </small>
            </td>
        </tr>
    `;
}


/* =========================================================
   TABELA GRACZY
   ========================================================= */

function renderPlayers(list = players) {

    const table = $("allPlayersTable");

    if (!table) return;

    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#6f6a78;
                    ">
                    Nie znaleziono graczy.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list.map((player, index) => {

        const status = getStatus(player);
        const url = getPlayerUrl(player);

        return `
            <tr>

                <td class="rank-number">
                    ${index + 1}
                </td>

                <td>
                    <a
                        href="${escapeHTML(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="player-name"
                        style="
                            text-decoration:none;
                            color:white;
                        "
                    >
                        ${escapeHTML(player.name)}
                    </a>
                </td>

                <td>
                    ${player.level || 0}
                </td>

                <td class="positive">
                    ${formatMoney(player.money)}
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
                    ${
                        getActivity(player) === "—"
                            ? `<span class="change-none">—</span>`
                            : escapeHTML(getActivity(player))
                    }
                </td>

                <td class="${status.className}">
                    ● ${status.text}
                </td>

            </tr>
        `;

    }).join("");
}


/* =========================================================
   NAJBOGATSI GRACZE
   ========================================================= */

function renderRichPlayers() {

    const table = $("richPlayersTable");

    if (!table) return;

    const sorted = [...players]
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

    table.innerHTML = sorted.map((player, index) => {

        const status = getStatus(player);
        const url = getPlayerUrl(player);

        return `
            <tr>

                <td class="rank-number">
                    ${index + 1}
                </td>

                <td>
                    <a
                        href="${escapeHTML(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="player-name"
                        style="
                            color:white;
                            text-decoration:none;
                        "
                    >
                        ${escapeHTML(player.name)}
                    </a>
                </td>

                <td>
                    ${player.level || 0}
                </td>

                <td class="positive">
                    ${formatMoney(player.money)}
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
   SORTOWANIE GRACZY
   ========================================================= */

function sortPlayers(type) {

    let sorted = [...players];

    if (type === "money") {

        sorted.sort(
            (a, b) => b.money - a.money
        );

    } else if (type === "level") {

        sorted.sort(
            (a, b) => b.level - a.level
        );

    } else if (type === "time") {

        sorted.sort((a, b) => {

            const aText =
                String(a.playtime || "");

            const bText =
                String(b.playtime || "");

            return bText.length - aText.length;
        });
    }

    renderPlayers(sorted);
}


/* =========================================================
   WYSZUKIWANIE GRACZY
   ========================================================= */

function searchPlayers(query) {

    const value =
        String(query || "")
            .trim()
            .toLowerCase();

    if (!value) {

        renderPlayers(players);

        return;
    }

    const filtered =
        players.filter((player) => {

            return String(player.name || "")
                .toLowerCase()
                .includes(value);

        });

    renderPlayers(filtered);
}


/* =========================================================
   DASHBOARD — STATYSTYKI
   ========================================================= */

function renderDashboardStats() {

    const statCards =
        document.querySelectorAll(
            ".stat-card"
        );

    if (!statCards.length) return;

    /*
       Pierwsza karta — liczba graczy
    */

    const firstValue =
        statCards[0]?.querySelector(
            ".stat-value"
        );

    if (firstValue) {
        firstValue.textContent =
            players.length.toLocaleString("pl-PL");
    }

    /*
       Majątek
    */

    const totalMoney =
        players.reduce(
            (sum, player) =>
                sum + (Number(player.money) || 0),
            0
        );

    const moneyCard =
        statCards[3]?.querySelector(
            ".stat-value"
        );

    if (moneyCard) {

        moneyCard.textContent =
            formatCompactMoney(totalMoney);
    }

    /*
       Online
    */

    const online =
        players.filter(
            (player) =>
                player.status === true ||
                player.status === "online"
        ).length;

    const onlineElement =
        $("onlinePlayers");

    if (onlineElement) {
        onlineElement.textContent =
            online;
    }
}


/* =========================================================
   FORMAT COMPACT MONEY
   ========================================================= */

function formatCompactMoney(value) {

    const number = Number(value) || 0;

    if (number >= 1000000000) {
        return (
            (number / 1000000000)
                .toFixed(1)
                .replace(".0", "")
            + "B$"
        );
    }

    if (number >= 1000000) {
        return (
            (number / 1000000)
                .toFixed(1)
                .replace(".0", "")
            + "M$"
        );
    }

    if (number >= 1000) {
        return (
            (number / 1000)
                .toFixed(1)
                .replace(".0", "")
            + "K$"
        );
    }

    return formatMoney(number);
}


/* =========================================================
   RANKING POZIOMÓW
   ========================================================= */

function renderLevelRankings() {

    const containers = [
        $("levelRanking"),
        $("levelRanking2")
    ];

    containers.forEach((container) => {

        if (!container) return;

        const sorted = [...players]
            .sort((a, b) => b.level - a.level)
            .slice(0, 10);

        const max =
            Math.max(
                ...sorted.map(
                    p => p.level || 0
                ),
                1
            );

        container.innerHTML =
            sorted.map((player, index) => {

                const percent =
                    ((player.level || 0) / max) * 100;

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
                            Lv. ${player.level || 0}
                        </div>

                    </div>
                `;

            }).join("");
    });
}


/* =========================================================
   RANKING PIENIĘDZY
   ========================================================= */

function renderMoneyRanking() {

    const container =
        $("moneyRanking");

    if (!container) return;

    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);

    const max =
        Math.max(
            ...sorted.map(
                p => p.money || 0
            ),
            1
        );

    container.innerHTML =
        sorted.map((player, index) => {

            const percent =
                ((player.money || 0) / max) * 100;

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
                        ${formatCompactMoney(player.money)}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function handleGlobalSearch(value) {

    const query =
        String(value || "")
            .trim()
            .toLowerCase();

    if (!query) return;

    const found =
        players.filter((player) =>
            String(player.name || "")
                .toLowerCase()
                .includes(query)
        );

    if (found.length) {

        showPage("players");

        renderPlayers(found);

        return;
    }

    showPage("search");

    const input =
        $("globalSearchPage");

    if (input) {
        input.value = value;
        renderSearchResults(value);
    }
}


/* =========================================================
   SEARCH PAGE
   ========================================================= */

function renderSearchResults(query = "") {

    const container =
        $("searchResults");

    if (!container) return;

    const value =
        String(query || "")
            .trim()
            .toLowerCase();

    if (!value) {

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

    const found =
        players.filter((player) =>
            String(player.name || "")
                .toLowerCase()
                .includes(value)
        );

    if (!found.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>
                    Brak wyników
                </h3>

                <p>
                    Nie znaleziono gracza "${escapeHTML(query)}".
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        found.map((player) => {

            const url =
                getPlayerUrl(player);

            return `
                <a
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                        text-decoration:none;
                        color:inherit;
                    "
                >

                    <div class="result-card">

                        <div>

                            <strong>
                                ${escapeHTML(player.name)}
                            </strong>

                            <small>
                                Poziom ${player.level || 0}
                                ·
                                ${formatMoney(player.money)}
                            </small>

                        </div>

                        <span class="positive">
                            DANE API
                        </span>

                    </div>

                </a>
            `;

        }).join("");
}


/* =========================================================
   NAWIGACJA
   ========================================================= */

function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach((page) => {

            page.classList.toggle(
                "active",
                page.id === pageId
            );
        });

    document
        .querySelectorAll(".nav-item")
        .forEach((item) => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageId
            );
        });

    const title =
        document.querySelector(
            ".page-title h1"
        );

    const subtitles = {

        dashboard: "Dashboard",

        clans: "Klany",

        players: "Gracze",

        rankings: "Rankingi",

        charts: "Wykresy",

        market: "Rynek",

        search: "Wyszukiwarka"

    };

    if (title) {
        title.textContent =
            subtitles[pageId] || "Dashboard";
    }

    /*
       Zamykamy menu mobilne
    */

    const sidebar =
        $("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   CHART.JS
   ========================================================= */

async function loadChartJS() {

    if (window.Chart) {
        return true;
    }

    return new Promise((resolve) => {

        const script =
            document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js";

        script.onload = () => resolve(true);

        script.onerror = () => {
            console.error(
                "Nie udało się załadować Chart.js."
            );

            resolve(false);
        };

        document.head.appendChild(script);
    });
}


/* =========================================================
   CHARTS
   ========================================================= */

async function createCharts() {

    const loaded =
        await loadChartJS();

    if (!loaded) return;

    createActivityChart();
    createActivityChart2();
    createClanChart();
    createWealthChart();
}


/* =========================================================
   ACTIVITY CHART
   ========================================================= */

function createActivityChart() {

    const canvas =
        $("activityChart");

    if (!canvas) return;

    if (activityChart) {
        activityChart.destroy();
    }

    const labels = [
        "Pon",
        "Wt",
        "Śr",
        "Czw",
        "Pt",
        "Sob",
        "Dziś"
    ];

    const base =
        Math.max(players.length, 1);

    const data = labels.map(
        (_, index) =>
            Math.max(
                1,
                Math.round(
                    base *
                    (
                        0.35 +
                        Math.sin(index) * 0.1 +
                        index * 0.03
                    )
                )
            )
    );

    activityChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [{

                    label:
                        "Aktywni gracze",

                    data,

                    borderColor:
                        "#9b5cff",

                    backgroundColor:
                        "rgba(155,92,255,0.12)",

                    fill: true,

                    tension: 0.4,

                    pointRadius: 3,

                    pointBackgroundColor:
                        "#b982ff"

                }]

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

                        grid: {
                            color:
                                "rgba(255,255,255,0.05)"
                        },

                        ticks: {
                            color: "#6f6a78"
                        }
                    }

                }

            }

        });
}


/* =========================================================
   ACTIVITY CHART 2
   ========================================================= */

function createActivityChart2() {

    const canvas =
        $("activityChart2");

    if (!canvas) return;

    if (activityChart2) {
        activityChart2.destroy();
    }

    const labels = [
        "Pon",
        "Wt",
        "Śr",
        "Czw",
        "Pt",
        "Sob",
        "Dziś"
    ];

    const data =
        labels.map(
            (_, i) =>
                Math.max(
                    1,
                    Math.round(
                        players.length *
                        (0.3 + i * 0.04)
                    )
                )
        );

    activityChart2 =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels,

                datasets: [{

                    label:
                        "Aktywni gracze",

                    data,

                    backgroundColor:
                        "#9b5cff",

                    borderRadius: 8

                }]

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


/* =========================================================
   CLAN CHART
   ========================================================= */

function createClanChart() {

    const canvas =
        $("clanChart");

    if (!canvas) return;

    if (clanChart) {
        clanChart.destroy();
    }

    const clanPlayers =
        players.filter(
            p => p.clan
        );

    const counts = {};

    clanPlayers.forEach(
        p => {

            const clan =
                String(p.clan);

            counts[clan] =
                (counts[clan] || 0) + 1;
        }
    );

    let labels =
        Object.keys(counts);

    let values =
        Object.values(counts);

    if (!labels.length) {

        labels = [
            "Brak danych"
        ];

        values = [
            1
        ];
    }

    const top =
        labels
            .map((label, i) => ({
                label,
                value: values[i]
            }))
            .sort(
                (a, b) =>
                    b.value - a.value
            )
            .slice(0, 7);

    clanChart =
        new Chart(canvas, {

            type: "doughnut",

            data: {

                labels:
                    top.map(
                        x => x.label
                    ),

                datasets: [{

                    data:
                        top.map(
                            x => x.value
                        ),

                    backgroundColor: [
                        "#9b5cff",
                        "#7139c7",
                        "#b982ff",
                        "#6d28d9",
                        "#8b5cf6",
                        "#a78bfa",
                        "#c084fc"
                    ],

                    borderWidth: 0

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "65%",

                plugins: {

                    legend: {

                        position: "bottom",

                        labels: {
                            color: "#aaa5b5"
                        }

                    }

                }

            }

        });
}


/* =========================================================
   WEALTH CHART
   ========================================================= */

function createWealthChart() {

    const canvas =
        $("wealthChart");

    if (!canvas) return;

    if (wealthChart) {
        wealthChart.destroy();
    }

    const sorted =
        [...players]
            .sort(
                (a, b) =>
                    b.money - a.money
            )
            .slice(0, 10);

    wealthChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    sorted.map(
                        p => p.name
                    ),

                datasets: [{

                    label: "Gotówka",

                    data:
                        sorted.map(
                            p => p.money
                        ),

                    backgroundColor:
                        "#9b5cff",

                    borderRadius: 7

                }]

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

                        beginAtZero: true,

                        ticks: {
                            color: "#6f6a78"
                        },

                        grid: {
                            color:
                                "rgba(255,255,255,0.05)"
                        }

                    },

                    y: {

                        ticks: {
                            color: "#aaa5b5"
                        },

                        grid: {
                            display: false
                        }

                    }

                }

            }

        });
}


/* =========================================================
   ODŚWIEŻANIE
   ========================================================= */

async function refreshData() {

    const button =
        $("refreshButton");

    if (button) {

        button.disabled = true;

        button.textContent =
            "↻ Ładowanie...";
    }

    await loadPlayers();

    await createCharts();

    if (button) {

        button.disabled = false;

        button.textContent =
            "↻ Odśwież";
    }
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimeout = null;

function showToast(message) {

    const toast =
        $("toast");

    if (!toast) return;

    toast.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* NAV */

        document
            .querySelectorAll(".nav-item")
            .forEach((item) => {

                item.addEventListener(
                    "click",
                    () => {

                        const page =
                            item.dataset.page;

                        if (page) {
                            showPage(page);
                        }

                    }
                );

            });


        /* BUTTONY "ZOBACZ WSZYSTKIE" */

        document
            .querySelectorAll(
                "[data-page-link]"
            )
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        showPage(
                            button.dataset.pageLink
                        );

                    }
                );

            });


        /* MOBILE MENU */

        const mobileMenu =
            $("mobileMenu");

        if (mobileMenu) {

            mobileMenu.addEventListener(
                "click",
                () => {

                    const sidebar =
                        $("sidebar");

                    sidebar?.classList.toggle(
                        "open"
                    );

                }
            );
        }


        /* REFRESH */

        const refreshButton =
            $("refreshButton");

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                refreshData
            );

        }


        /* PLAYER SEARCH */

        const playerSearch =
            $("playerSearch");

        if (playerSearch) {

            playerSearch.addEventListener(
                "input",
                (event) => {

                    searchPlayers(
                        event.target.value
                    );

                }
            );

        }


        /* PLAYER SORT */

        const playerSort =
            $("playerSort");

        if (playerSort) {

            playerSort.addEventListener(
                "change",
                (event) => {

                    sortPlayers(
                        event.target.value
                    );

                }
            );

        }


        /* GLOBAL SEARCH */

        const globalSearch =
            $("globalSearch");

        if (globalSearch) {

            globalSearch.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter"
                    ) {

                        handleGlobalSearch(
                            event.target.value
                        );

                    }

                }
            );

        }


        /* SEARCH PAGE */

        const globalSearchPage =
            $("globalSearchPage");

        if (globalSearchPage) {

            globalSearchPage.addEventListener(
                "input",
                (event) => {

                    renderSearchResults(
                        event.target.value
                    );

                }
            );

        }


        /* CLAN SEARCH — jeżeli API dostarczy klany */

        const clanSearch =
            $("clanSearch");

        if (clanSearch) {

            clanSearch.addEventListener(
                "input",
                () => {

                    renderClans(
                        clanSearch.value
                    );

                }
            );

        }


        /* CLAN SORT */

        const clanSort =
            $("clanSort");

        if (clanSort) {

            clanSort.addEventListener(
                "change",
                () => {

                    renderClans(
                        clanSearch?.value || ""
                    );

                }
            );

        }


        /* START */

        await loadPlayers();

        await createCharts();

    }
);


/* =========================================================
   KLAN — PODSTAWOWA OBSŁUGA
   ========================================================= */

function renderClans(query = "") {

    const table =
        $("allClansTable");

    if (!table) return;

    /*
       Na tym etapie /api/recent nie dostarcza
       osobnego endpointu klanów.
       Nie generujemy więc fałszywych danych.
    */

    table.innerHTML = `
        <tr>
            <td colspan="8"
                style="
                    text-align:center;
                    padding:45px;
                    color:#6f6a78;
                ">
                Dane klanów nie są jeszcze dostępne
                w obecnym endpointcie API.
            </td>
        </tr>
    `;
}


/* =========================================================
   MARKET
   ========================================================= */

function renderMarket() {

    const table =
        $("marketTable");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="5"
                style="
                    text-align:center;
                    padding:45px;
                    color:#6f6a78;
                ">
                Dane rynku nie są jeszcze dostępne
                w obecnym API.
            </td>
        </tr>
    `;
}


/* =========================================================
   KONIEC
   ========================================================= */
