/* =========================================================
   EXODO STATS
   REAL API — HODOWLA RP
   ========================================================= */

const API_URL =
    "https://exodo-api.oliwierdawidowicz.workers.dev";


/* =========================================================
   API
   ========================================================= */

let recentData = [];
let apiOnline = false;


/* Pobieranie danych z Workera */
async function loadAPI() {

    try {

        const response = await fetch(
            `${API_URL}/api/recent?limit=100`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();

        if (!json.success || !Array.isArray(json.data)) {
            throw new Error("Nieprawidłowa odpowiedź API");
        }

        recentData = json.data;
        apiOnline = true;

        console.log(
            "%cEXODO API ONLINE",
            "color:#4ade80;font-size:18px;font-weight:bold"
        );

        console.log(
            "Pobrano wpisów:",
            recentData.length
        );

        updateDashboard();
        renderPlayersFromAPI();
        updateGlobalSearch();

    } catch (error) {

        apiOnline = false;

        console.error(
            "EXODO API ERROR:",
            error
        );

        showAPIError();

    }

}


/* =========================================================
   HELPERS
   ========================================================= */

function formatMoney(number) {

    if (
        typeof number !== "number" ||
        Number.isNaN(number)
    ) {
        return "0$";
    }

    return number.toLocaleString("pl-PL") + "$";
}


function formatNumber(number) {

    return Number(number || 0)
        .toLocaleString("pl-PL");

}


/* Zamiana ageSeconds na czytelny czas */
function formatAge(seconds) {

    seconds = Number(seconds) || 0;

    if (seconds < 60) {
        return `${seconds} sek.`;
    }

    const minutes =
        Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min.`;
    }

    const hours =
        Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} godz.`;
    }

    const days =
        Math.floor(hours / 24);

    return `${days} dni`;
}


/* =========================================================
   UNIQUE PLAYERS
   ========================================================= */

function getUniquePlayers() {

    const map = new Map();

    recentData.forEach(item => {

        if (!item.uuid) return;

        if (!map.has(item.uuid)) {

            map.set(
                item.uuid,
                {
                    uuid: item.uuid,
                    nick: item.nick || "Nieznany",
                    latestAge: Number(item.ageSeconds) || 0,
                    purchases: 0
                }
            );

        }

        const player =
            map.get(item.uuid);

        player.purchases++;

        const age =
            Number(item.ageSeconds) || 0;

        if (age < player.latestAge) {
            player.latestAge = age;
        }

    });

    return Array.from(map.values());

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const uniquePlayers =
        getUniquePlayers();

    /* -------------------------
       LICZBA GRACZY
       ------------------------- */

    const statValues =
        document.querySelectorAll(
            ".stats-grid .stat-value"
        );

    if (statValues.length >= 1) {

        statValues[0].textContent =
            formatNumber(uniquePlayers.length);

    }


    /* -------------------------
       ONLINE TERAZ
       ------------------------- */

    /*
       API /recent nie zwraca aktualnego
       statusu online.

       Dlatego nie będziemy wymyślać
       liczby online.
    */

    const online =
        document.getElementById(
            "onlinePlayers"
        );

    if (online) {

        online.textContent =
            "—";

    }


    /* -------------------------
       KLANY
       -------------------------

       /recent nie zwraca klanów,
       więc nie wymyślamy liczby.
    */

    if (statValues.length >= 3) {

        statValues[2].textContent =
            "—";

    }


    /* -------------------------
       MAJĄTEK
       -------------------------

       API nie zwraca pieniędzy.
    */

    if (statValues.length >= 4) {

        statValues[3].textContent =
            "—";

    }


    /* -------------------------
       OPIS ONLINE
       ------------------------- */

    const onlineCards =
        document.querySelectorAll(
            ".stat-card"
        );

    if (onlineCards[1]) {

        const change =
            onlineCards[1].querySelector(
                ".stat-change"
            );

        if (change) {

            change.textContent =
                apiOnline
                    ? "API działa poprawnie"
                    : "Brak połączenia z API";

        }

    }


    /* -------------------------
       GRACZE
       ------------------------- */

    const playersCard =
        document.querySelectorAll(
            ".stat-card"
        )[0];

    if (playersCard) {

        const change =
            playersCard.querySelector(
                ".stat-change"
            );

        if (change) {

            change.textContent =
                `${uniquePlayers.length} unikalnych graczy w danych API`;

        }

    }

}


/* =========================================================
   PLAYERS TABLE
   ========================================================= */

function renderPlayersFromAPI(
    list = recentData
) {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (!table) return;


    if (!list.length) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        Brak danych z API.
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    /*
       Łączymy wpisy po UUID,
       żeby jeden gracz nie pojawiał się
       wielokrotnie.
    */

    const map = new Map();


    list.forEach(item => {

        if (!item.uuid) return;

        if (!map.has(item.uuid)) {

            map.set(
                item.uuid,
                {
                    uuid: item.uuid,
                    nick: item.nick || "Nieznany",
                    ageSeconds:
                        Number(item.ageSeconds) || 0,
                    productId:
                        item.productId || "—",
                    count: 1
                }
            );

        } else {

            const player =
                map.get(item.uuid);

            player.count++;

            const age =
                Number(item.ageSeconds) || 0;

            if (age < player.ageSeconds) {
                player.ageSeconds = age;
                player.productId =
                    item.productId || "—";
            }

        }

    });


    const players =
        Array.from(map.values());


    table.innerHTML =
        players.map(
            (player, index) => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="player-name">
                                ${escapeHTML(
                                    player.nick
                                )}
                            </span>
                        </td>

                        <td>
                            —
                        </td>

                        <td>
                            0$
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

                        <td>
                            <span class="positive">
                                ● DANE API
                            </span>
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   RECENT ACTIVITY
   ========================================================= */

function renderRecentActivity() {

    const table =
        document.getElementById(
            "richPlayersTable"
        );

    if (!table) return;


    const data =
        [...recentData]
            .sort(
                (a, b) =>
                    Number(a.ageSeconds || 0) -
                    Number(b.ageSeconds || 0)
            )
            .slice(0, 10);


    table.innerHTML =
        data.map(
            (item, index) => {

                return `
                    <tr>

                        <td class="rank-number">
                            ${index + 1}
                        </td>

                        <td>
                            <span class="player-name">
                                ${escapeHTML(
                                    item.nick || "Nieznany"
                                )}
                            </span>
                        </td>

                        <td>
                            —
                        </td>

                        <td>
                            0$
                        </td>

                        <td>
                            <span class="clan-tag">
                                [—]
                            </span>
                        </td>

                        <td>
                            ${formatAge(
                                item.ageSeconds
                            )}
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   SEARCH
   ========================================================= */

function searchAPI(query) {

    query =
        query
            .toLowerCase()
            .trim();

    if (!query) {
        return [];
    }


    return recentData.filter(
        item => {

            const nick =
                String(
                    item.nick || ""
                ).toLowerCase();

            const product =
                String(
                    item.productId || ""
                ).toLowerCase();

            const uuid =
                String(
                    item.uuid || ""
                ).toLowerCase();

            return (
                nick.includes(query) ||
                product.includes(query) ||
                uuid.includes(query)
            );

        }
    );

}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function performGlobalSearch() {

    const input =
        document.getElementById(
            "globalSearch"
        );

    const results =
        document.getElementById(
            "searchResults"
        );

    if (!input || !results) return;


    const query =
        input.value
            .toLowerCase()
            .trim();


    if (!query) {

        results.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>Wpisz nazwę powyżej</h3>

                <p>
                    Wyszukiwarka znajdzie
                    graczy oraz dane z API.
                </p>

            </div>
        `;

        return;

    }


    const found =
        searchAPI(query);


    if (!found.length) {

        results.innerHTML = `
            <div class="empty-state">

                <div>×</div>

                <h3>Nie znaleziono wyników</h3>

                <p>
                    Nie znaleziono „${escapeHTML(
                        query
                    )}” w danych Hodowla RP.
                </p>

            </div>
        `;

        return;

    }


    results.innerHTML =
        found
            .slice(0, 30)
            .map(
                item => {

                    return `
                        <div class="result-card">

                            <div>

                                <strong>
                                    👤 ${escapeHTML(
                                        item.nick ||
                                        "Nieznany"
                                    )}
                                </strong>

                                <small>
                                    Ostatnia aktywność:
                                    ${formatAge(
                                        item.ageSeconds
                                    )}
                                </small>

                            </div>

                            <span class="clan-tag">
                                ${escapeHTML(
                                    item.productId ||
                                    "—"
                                )}
                            </span>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   SEARCH PAGE
   ========================================================= */

function performPageSearch() {

    const input =
        document.getElementById(
            "globalSearchPage"
        );

    const results =
        document.getElementById(
            "searchResults"
        );

    if (!input || !results) return;


    const query =
        input.value
            .toLowerCase()
            .trim();


    if (!query) {

        results.innerHTML = `
            <div class="empty-state">

                <div>⌕</div>

                <h3>Wpisz nazwę powyżej</h3>

                <p>
                    Wyszukiwarka znajdzie
                    graczy oraz produkty.
                </p>

            </div>
        `;

        return;

    }


    const found =
        searchAPI(query);


    if (!found.length) {

        results.innerHTML = `
            <div class="empty-state">

                <div>×</div>

                <h3>Nie znaleziono wyników</h3>

                <p>
                    Brak wyników dla:
                    ${escapeHTML(query)}
                </p>

            </div>
        `;

        return;

    }


    results.innerHTML =
        found
            .slice(0, 50)
            .map(
                item => {

                    return `
                        <div class="result-card">

                            <div>

                                <strong>
                                    👤 ${escapeHTML(
                                        item.nick ||
                                        "Nieznany"
                                    )}
                                </strong>

                                <small>
                                    UUID:
                                    ${escapeHTML(
                                        item.uuid
                                    )}
                                    <br>
                                    Aktywność:
                                    ${formatAge(
                                        item.ageSeconds
                                    )}
                                </small>

                            </div>

                            <span>
                                ${escapeHTML(
                                    item.productId ||
                                    "—"
                                )}
                            </span>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function updateGlobalSearch() {

    const input =
        document.getElementById(
            "globalSearch"
        );

    if (!input) return;

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                /*
                   Przechodzimy do strony
                   wyszukiwarki.
                */

                openPage("search");

                const pageInput =
                    document.getElementById(
                        "globalSearchPage"
                    );

                if (pageInput) {

                    pageInput.value =
                        input.value;

                    performPageSearch();

                }

            }

        }
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   API ERROR
   ========================================================= */

function showAPIError() {

    const table =
        document.getElementById(
            "allPlayersTable"
        );

    if (table) {

        table.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-state">

                        <div>⚠</div>

                        <h3>
                            Nie udało się pobrać danych
                        </h3>

                        <p>
                            API Hodowla RP jest chwilowo
                            niedostępne.
                        </p>

                    </div>

                </td>
            </tr>
        `;

    }


    const online =
        document.getElementById(
            "onlinePlayers"
        );

    if (online) {
        online.textContent = "—";
    }

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


function openPage(pageName) {

    document
        .querySelectorAll(".page")
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


    navItems.forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page ===
                pageName
            );

        }
    );


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


            if (!query) {

                renderPlayersFromAPI();

                return;

            }


            const filtered =
                recentData.filter(
                    item =>
                        String(
                            item.nick || ""
                        )
                            .toLowerCase()
                            .includes(query)
                );


            renderPlayersFromAPI(
                filtered
            );

        }
    );

}


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

            /*
               API /recent nie zwraca klanów.
            */

            const table =
                document.getElementById(
                    "allClansTable"
                );

            if (!table) return;


            table.innerHTML = `
                <tr>
                    <td colspan="8">

                        <div class="empty-state">

                            <div>ℹ</div>

                            <h3>
                                Brak danych klanów w API
                            </h3>

                            <p>
                                Endpoint /api/recent
                                nie udostępnia jeszcze
                                informacji o klanach.
                            </p>

                        </div>

                    </td>
                </tr>
            `;

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

            const table =
                document.getElementById(
                    "allClansTable"
                );

            if (!table) return;


            table.innerHTML = `
                <tr>
                    <td colspan="8">

                        <div class="empty-state">

                            <div>ℹ</div>

                            <h3>
                                Brak danych klanów w API
                            </h3>

                            <p>
                                API nie zwraca jeszcze
                                danych klanów.
                            </p>

                        </div>

                    </td>
                </tr>
            `;

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

            let list =
                [...recentData];


            const sort =
                playerSort.value;


            if (sort === "time") {

                list.sort(
                    (a, b) =>
                        Number(
                            a.ageSeconds || 0
                        ) -
                        Number(
                            b.ageSeconds || 0
                        )
                );

            }


            if (
                sort === "money" ||
                sort === "level"
            ) {

                /*
                   Te wartości nie istnieją
                   w aktualnym API.
                */

                list.sort(
                    (a, b) =>
                        Number(
                            a.ageSeconds || 0
                        ) -
                        Number(
                            b.ageSeconds || 0
                        )
                );

            }


            renderPlayersFromAPI(
                list
            );

        }
    );

}


/* =========================================================
   SEARCH PAGE EVENTS
   ========================================================= */

const globalSearchPage =
    document.getElementById(
        "globalSearchPage"
    );


if (globalSearchPage) {

    globalSearchPage.addEventListener(
        "input",
        performPageSearch
    );

    globalSearchPage.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                performPageSearch();
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


            setTimeout(
                () => {

                    refreshButton.style.transform =
                        "";

                },
                500
            );


            await loadAPI();


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
   CHARTS
   ========================================================= */

function setupCanvas(canvas) {

    if (!canvas) return null;


    const rect =
        canvas.getBoundingClientRect();


    if (
        rect.width === 0 ||
        rect.height === 0
    ) {
        return null;
    }


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
                ) *
                index;


            const y =
                padding +
                chartHeight -
                (
                    value / max
                ) *
                chartHeight;


            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
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
                ) *
                index;


            const y =
                padding +
                chartHeight -
                (
                    value / max
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
        Math.max(...values) * 1.15;


    const chartHeight =
        height - 65;


    const availableWidth =
        width - padding * 2;


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
                    (
                        availableWidth /
                        values.length
                    ) -
                    barWidth
                ) / 2;


            const barHeight =
                (
                    value / max
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
   CHARTS
   ========================================================= */

function createExodoCharts() {

    /*
       Wykres pokazuje rzeczywistą liczbę
       wpisów z API pogrupowaną według wieku.

       Nie udajemy tutaj danych,
       których endpoint nie posiada.
    */


    const buckets = [
        0,
        3600,
        7200,
        10800,
        14400,
        18000,
        21600
    ];


    const values =
        buckets.map(
            (seconds, index) => {

                const next =
                    buckets[index + 1] ||
                    Infinity;


                return recentData.filter(
                    item => {

                        const age =
                            Number(
                                item.ageSeconds
                            ) || 0;


                        return (
                            age >= seconds &&
                            age < next
                        );

                    }
                ).length;

            }
        );


    if (
        recentData.length > 0
    ) {

        drawLineChart(
            "activityChart",
            values,
            [
                "0h",
                "1h",
                "2h",
                "3h",
                "4h",
                "5h",
                "6h+"
            ]
        );


        drawLineChart(
            "activityChart2",
            values,
            [
                "0h",
                "1h",
                "2h",
                "3h",
                "4h",
                "5h",
                "6h+"
            ]
        );

    }


    /*
       Wykres produktów.
    */

    const products = {};


    recentData.forEach(
        item => {

            const product =
                item.productId ||
                "unknown";


            products[product] =
                (
                    products[product] ||
                    0
                ) + 1;

        }
    );


    const sortedProducts =
        Object.entries(products)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .slice(0, 10);


    if (sortedProducts.length) {

        drawBarChart(
            "clanChart",
            sortedProducts.map(
                item => item[1]
            ),
            sortedProducts.map(
                item => item[0]
            )
        );


        drawBarChart(
            "wealthChart",
            sortedProducts.map(
                item => item[1]
            ),
            sortedProducts.map(
                item => item[0]
            )
        );

    }

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeEXODO() {

    console.log(
        "%cEXODO STATS",
        "color:#a75aff;font-size:24px;font-weight:bold"
    );

    console.log(
        "Łączenie z API Hodowla RP..."
    );


    await loadAPI();


    renderRecentActivity();


    createExodoCharts();


    /*
       Odświeżanie danych co 60 sekund.
    */

    setInterval(
        async () => {

            await loadAPI();

            renderRecentActivity();

            createExodoCharts();

        },
        60000
    );

}


/* =========================================================
   START
   ========================================================= */

initializeEXODO();


/* =========================================================
   REDRAW
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
