/* =========================================================
   EXODO STATS — API + DASHBOARD + SEARCH
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       KONFIGURACJA
       ===================================================== */

    const API_BASE = "https://exodo-api.oliwierdawidowicz.workers.dev";

    const CONFIG = {
        recentLimit: 20,

        // Co ile sekund odświeżać dane
        refreshInterval: 60,

        // Maksymalna liczba jednoczesnych zapytań player
        concurrency: 4
    };

    /* =====================================================
       STAN APLIKACJI
       ===================================================== */

    const state = {
        players: [],
        filteredPlayers: [],
        loading: false,
        lastUpdate: null,
        apiOnline: false,
        currentPage: "dashboard"
    };

    /* =====================================================
       HELPERY
       ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        Array.from(parent.querySelectorAll(selector));

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

    function cleanText(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/\s+/g, " ")
            .trim();
    }

    function getInitials(name) {
        const text = cleanText(name);

        if (!text) {
            return "?";
        }

        return text
            .split(/[\s_-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    }

    function normalizePlayer(player) {
        return {
            name: cleanText(player?.name) || "Nieznany",
            level: Number.isFinite(Number(player?.level))
                ? Number(player.level)
                : null,

            money: Number.isFinite(Number(player?.money))
                ? Number(player.money)
                : 0,

            playtime: cleanText(player?.playtime),
            clan: cleanText(player?.clan),
            rank: cleanText(player?.rank),
            status: player?.status ?? null,
            lastSeen: cleanText(player?.lastSeen),

            playerId: player?.playerId ?? null,
            source: player?.source || "hodowlarp.pl",
            sourceUrl:
                player?.sourceUrl ||
                `https://hodowlarp.pl/gracz/${encodeURIComponent(
                    player?.name || ""
                )}`
        };
    }

    /* =====================================================
       API
       ===================================================== */

    async function apiFetch(endpoint) {
        const url =
            API_BASE.replace(/\/$/, "") +
            endpoint;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `API HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (data?.success === false) {
            throw new Error(
                data?.error ||
                data?.message ||
                "API zwróciło błąd"
            );
        }

        return data;
    }

    async function checkAPI() {
        try {
            const data = await apiFetch("/api/health");

            state.apiOnline =
                data?.success === true ||
                data?.status === "online";

            updateServerStatus();

            return true;
        } catch (error) {
            console.error(
                "[EXODO API] Health error:",
                error
            );

            state.apiOnline = false;

            updateServerStatus();

            return false;
        }
    }

    /* =====================================================
       POBIERANIE LISTY GRACZY
       ===================================================== */

    async function fetchRecentPlayers() {
        const data = await apiFetch(
            `/api/recent?limit=${CONFIG.recentLimit}`
        );

        if (!Array.isArray(data?.players)) {
            throw new Error(
                "API /api/recent nie zwróciło tablicy players."
            );
        }

        return data.players.map(normalizePlayer);
    }

    /* =====================================================
       POBIERANIE SZCZEGÓŁÓW GRACZY
       ===================================================== */

    async function fetchPlayer(name) {
        try {
            const data = await apiFetch(
                `/api/player?name=${encodeURIComponent(name)}`
            );

            if (!data?.player) {
                return null;
            }

            return normalizePlayer(data.player);
        } catch (error) {
            console.warn(
                `[EXODO API] Nie udało się pobrać ${name}:`,
                error
            );

            return null;
        }
    }

    /* =====================================================
       CONCURRENCY
       ===================================================== */

    async function mapWithConcurrency(
        items,
        worker,
        concurrency = 4
    ) {
        const results = new Array(items.length);
        let index = 0;

        async function runner() {
            while (true) {
                const currentIndex = index++;

                if (currentIndex >= items.length) {
                    break;
                }

                try {
                    results[currentIndex] =
                        await worker(
                            items[currentIndex],
                            currentIndex
                        );
                } catch (error) {
                    console.error(error);
                    results[currentIndex] = null;
                }
            }
        }

        const workers = Array.from(
            {
                length: Math.min(
                    concurrency,
                    items.length
                )
            },
            () => runner()
        );

        await Promise.all(workers);

        return results;
    }

    /* =====================================================
       ŁĄCZENIE LISTY Z PEŁNYMI DANYMI
       ===================================================== */

    async function loadPlayers() {
        if (state.loading) {
            return;
        }

        state.loading = true;

        setLoadingState(true);

        try {
            const recentPlayers =
                await fetchRecentPlayers();

            if (!recentPlayers.length) {
                state.players = [];
                state.filteredPlayers = [];

                state.apiOnline = true;

                renderEverything();

                showToast(
                    "API działa, ale nie zwróciło graczy.",
                    "warning"
                );

                return;
            }

            /*
             * Najpierw pokazujemy podstawową listę,
             * żeby strona nie była pusta podczas pobierania.
             */

            state.players = recentPlayers;
            state.filteredPlayers = recentPlayers;

            state.apiOnline = true;

            renderEverything();

            /*
             * Następnie pobieramy pełne dane każdego gracza.
             */

            const details =
                await mapWithConcurrency(
                    recentPlayers,
                    player =>
                        fetchPlayer(player.name),
                    CONFIG.concurrency
                );

            const merged =
                recentPlayers.map(
                    (basePlayer, index) => {
                        const fullPlayer =
                            details[index];

                        if (!fullPlayer) {
                            return basePlayer;
                        }

                        return {
                            ...basePlayer,
                            ...fullPlayer,
                            name:
                                fullPlayer.name ||
                                basePlayer.name
                        };
                    }
                );

            state.players = merged;
            state.filteredPlayers = merged;

            state.lastUpdate = new Date();

            renderEverything();

            showToast(
                `Pobrano dane ${merged.length} graczy.`,
                "success"
            );
        } catch (error) {
            console.error(
                "[EXODO] Błąd ładowania danych:",
                error
            );

            state.apiOnline = false;

            updateServerStatus();

            showToast(
                "Nie udało się pobrać danych z API.",
                "error"
            );
        } finally {
            state.loading = false;

            setLoadingState(false);

            updateServerStatus();
        }
    }

    /* =====================================================
       STATUS SERWERA
       ===================================================== */

    function updateServerStatus() {
        const statusElements = [
            ...$$(".server-status"),
            ...$$("[data-server-status]"),
            ...$$("#serverStatus")
        ];

        const online = state.apiOnline;

        statusElements.forEach(element => {
            const dot =
                $(".status-dot", element);

            if (dot) {
                dot.style.background =
                    online
                        ? "var(--green)"
                        : "var(--red)";

                dot.style.boxShadow =
                    online
                        ? "0 0 12px rgba(74, 222, 128, .7)"
                        : "0 0 12px rgba(251, 113, 133, .7)";
            }

            const text =
                element.querySelector(
                    ".server-status-text"
                ) ||
                element.querySelector(
                    "[data-status-text]"
                );

            if (text) {
                text.textContent =
                    online
                        ? "API ONLINE"
                        : "API OFFLINE";
            }
        });

        /*
         * Obsługa zwykłych elementów tekstowych.
         */

        $$("[data-api-status]").forEach(element => {
            element.textContent =
                online
                    ? "DANE API"
                    : "BRAK DANYCH";

            element.classList.toggle(
                "positive",
                online
            );

            element.classList.toggle(
                "negative",
                !online
            );
        });
    }

    /* =====================================================
       STATUS WIERSZA GRACZA
       ===================================================== */

    function getPlayerStatus(player) {
        if (!state.apiOnline) {
            return {
                text: "● BRAK DANYCH",
                className: "negative"
            };
        }

        if (
            player.status === true ||
            player.status === "online" ||
            player.status === "ONLINE"
        ) {
            return {
                text: "● ONLINE",
                className: "positive"
            };
        }

        /*
         * Hodowla RP w danych, które otrzymaliśmy,
         * używa informacji typu "Teraz Gra na serwerze".
         */

        const lastSeen =
            cleanText(player.lastSeen)
                .toLowerCase();

        const playtime =
            cleanText(player.playtime)
                .toLowerCase();

        if (
            lastSeen.includes("teraz") ||
            playtime.includes("teraz gra")
        ) {
            return {
                text: "● ONLINE",
                className: "positive"
            };
        }

        return {
            text: "● DANE API",
            className: "positive"
        };
    }

    /* =====================================================
       KLAN
       ===================================================== */

    function parseClan(player) {
        const clan = cleanText(player.clan);

        if (!clan) {
            return "—";
        }

        /*
         * Przykładowe dane:
         * [ exo ] exo Lider · 18 członków
         */

        const tagMatch =
            clan.match(
                /\[\s*([^\]]+)\s*\]/
            );

        const tag =
            tagMatch
                ? cleanText(tagMatch[1])
                : "";

        let display =
            clan
                .replace(/\[[^\]]+\]/, "")
                .trim();

        if (!display) {
            display = tag;
        }

        return {
            tag,
            display
        };
    }

    /* =====================================================
       OSTATNIA AKTYWNOŚĆ
       ===================================================== */

    function getLastSeen(player) {
        const lastSeen =
            cleanText(player.lastSeen);

        if (lastSeen) {
            return lastSeen;
        }

        const playtime =
            cleanText(player.playtime);

        /*
         * Fallback dla danych typu:
         * "# 4 V4N11SH [ KWE ] 3 dni"
         */

        if (playtime) {
            const dayMatch =
                playtime.match(
                    /(\d+)\s*dni?/i
                );

            if (dayMatch) {
                return `${dayMatch[1]} dni`;
            }
        }

        return "—";
    }

    /* =====================================================
       RANGA
       ===================================================== */

    function getRank(player) {
        const rank = cleanText(player.rank);

        if (!rank) {
            return "—";
        }

        /*
         * Przykład:
         * SVIP+ Kupiona w sklepie Relacje...
         */

        const firstPart =
            rank
                .split(/\s+(?:Kupiona|Relacje|Klan|Ślub)\b/i)[0]
                .trim();

        return firstPart || rank;
    }

    /* =====================================================
       TABELA GRACZY
       ===================================================== */

    function getPlayerTable() {
        const possibleTables = [
            "#playersTable",
            "#players-table",
            "[data-players-table]",
            ".players-table table",
            ".player-table table",
            ".players-panel table",
            "table"
        ];

        for (const selector of possibleTables) {
            const table = $(selector);

            if (table) {
                return table;
            }
        }

        return null;
    }

    function renderPlayersTable() {
        const table = getPlayerTable();

        if (!table) {
            return;
        }

        let tbody = $("tbody", table);

        if (!tbody) {
            tbody =
                document.createElement("tbody");

            table.appendChild(tbody);
        }

        const players =
            state.filteredPlayers.length
                ? state.filteredPlayers
                : [];

        if (!players.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10">
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

        tbody.innerHTML =
            players
                .map((player, index) => {
                    const clan =
                        parseClan(player);

                    const status =
                        getPlayerStatus(player);

                    const rank =
                        getRank(player);

                    const lastSeen =
                        getLastSeen(player);

                    return `
                        <tr
                            data-player-name="${escapeHTML(
                                player.name
                            )}"
                        >
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
                                <span class="player-level">
                                    ${
                                        player.level !== null
                                            ? escapeHTML(
                                                player.level
                                            )
                                            : "—"
                                    }
                                </span>
                            </td>

                            <td>
                                <span class="positive">
                                    ${escapeHTML(
                                        formatMoney(
                                            player.money
                                        )
                                    )}
                                </span>
                            </td>

                            <td>
                                ${
                                    typeof clan === "string"
                                        ? escapeHTML(clan)
                                        : `
                                            <span
                                                class="clan-tag"
                                                title="${escapeHTML(
                                                    clan.display
                                                )}"
                                            >
                                                ${escapeHTML(
                                                    clan.tag
                                                )}
                                            </span>
                                            <span
                                                class="clan-name"
                                                style="margin-left:6px"
                                            >
                                                ${escapeHTML(
                                                    clan.display
                                                )}
                                            </span>
                                        `
                                }
                            </td>

                            <td>
                                ${escapeHTML(
                                    lastSeen
                                )}
                            </td>

                            <td
                                class="${status.className}"
                            >
                                ${escapeHTML(
                                    status.text
                                )}
                            </td>
                        </tr>
                    `;
                })
                .join("");

        /*
         * Kliknięcie gracza otwiera jego stronę
         * na Hodowla RP.
         */

        $$("tr[data-player-name]", tbody)
            .forEach(row => {
                row.style.cursor = "pointer";

                row.addEventListener(
                    "click",
                    () => {
                        const name =
                            row.dataset.playerName;

                        if (!name) {
                            return;
                        }

                        const player =
                            state.players.find(
                                p =>
                                    p.name.toLowerCase() ===
                                    name.toLowerCase()
                            );

                        if (
                            player?.sourceUrl
                        ) {
                            window.open(
                                player.sourceUrl,
                                "_blank",
                                "noopener,noreferrer"
                            );
                        }
                    }
                );
            });
    }

    /* =====================================================
       DASHBOARD — STATYSTYKI
       ===================================================== */

    function calculateStats() {
        const players =
            state.players || [];

        const totalPlayers =
            players.length;

        const totalMoney =
            players.reduce(
                (sum, player) =>
                    sum +
                    (Number(player.money) || 0),
                0
            );

        const highestLevel =
            players.reduce(
                (max, player) =>
                    Math.max(
                        max,
                        Number(player.level) || 0
                    ),
                0
            );

        const onlinePlayers =
            players.filter(player => {
                const status =
                    getPlayerStatus(player);

                return (
                    status.text === "● ONLINE"
                );
            }).length;

        const clanPlayers =
            players.filter(
                player =>
                    cleanText(
                        player.clan
                    )
                ).length;

        return {
            totalPlayers,
            totalMoney,
            highestLevel,
            onlinePlayers,
            clanPlayers
        };
    }

    /* =====================================================
       AKTUALIZACJA ELEMENTU
       ===================================================== */

    function setValue(selectors, value) {
        for (const selector of selectors) {
            const elements =
                $$(selector);

            if (elements.length) {
                elements.forEach(
                    element => {
                        element.textContent =
                            value;
                    }
                );

                return true;
            }
        }

        return false;
    }

    /* =====================================================
       DASHBOARD
       ===================================================== */

    function updateDashboard() {
        const stats =
            calculateStats();

        /*
         * Obsługujemy data-* oraz typowe ID.
         */

        setValue(
            [
                "[data-stat='players']",
                "[data-stat='total-players']",
                "#totalPlayers",
                "#playersCount",
                "#statPlayers"
            ],
            formatNumber(
                stats.totalPlayers
            )
        );

        setValue(
            [
                "[data-stat='money']",
                "[data-stat='total-money']",
                "#totalMoney",
                "#moneyCount",
                "#statMoney"
            ],
            formatMoney(
                stats.totalMoney
            )
        );

        setValue(
            [
                "[data-stat='level']",
                "[data-stat='highest-level']",
                "#highestLevel",
                "#levelCount",
                "#statLevel"
            ],
            formatNumber(
                stats.highestLevel
            )
        );

        setValue(
            [
                "[data-stat='online']",
                "[data-stat='online-players']",
                "#onlinePlayers",
                "#onlineCount",
                "#statOnline"
            ],
            formatNumber(
                stats.onlinePlayers
            )
        );

        setValue(
            [
                "[data-stat='clans']",
                "[data-stat='clan-players']",
                "#clanPlayers",
                "#clansCount",
                "#statClans"
            ],
            formatNumber(
                stats.clanPlayers
            )
        );

        /*
         * Jeśli HTML posiada stat cards,
         * próbujemy dopasować je po kolejności.
         */

        const cards =
            $$(".stat-card");

        if (cards.length) {
            const values = [
                formatNumber(
                    stats.totalPlayers
                ),
                formatMoney(
                    stats.totalMoney
                ),
                formatNumber(
                    stats.highestLevel
                ),
                formatNumber(
                    stats.onlinePlayers
                )
            ];

            cards.forEach(
                (card, index) => {
                    const value =
                        $(".stat-value", card);

                    if (
                        value &&
                        values[index] !== undefined
                    ) {
                        value.textContent =
                            values[index];
                    }
                }
            );
        }
    }

    /* =====================================================
       RANKINGI
       ===================================================== */

    function renderRankings() {
        /*
         * Ranking poziomu
         */

        const levelPlayers =
            [...state.players]
                .sort(
                    (a, b) =>
                        (b.level || 0) -
                        (a.level || 0)
                )
                .slice(0, 10);

        renderRanking(
            [
                "#levelRanking",
                "#levelsRanking",
                "[data-ranking='level']",
                "[data-ranking='levels']"
            ],
            levelPlayers,
            player =>
                Number(player.level) || 0
        );

        /*
         * Ranking pieniędzy
         */

        const moneyPlayers =
            [...state.players]
                .sort(
                    (a, b) =>
                        (b.money || 0) -
                        (a.money || 0)
                )
                .slice(0, 10);

        renderRanking(
            [
                "#moneyRanking",
                "#wealthRanking",
                "[data-ranking='money']",
                "[data-ranking='wealth']"
            ],
            moneyPlayers,
            player =>
                Number(player.money) || 0
        );
    }

    function renderRanking(
        selectors,
        players,
        valueGetter
    ) {
        let container = null;

        for (const selector of selectors) {
            container = $(selector);

            if (container) {
                break;
            }
        }

        if (!container) {
            return;
        }

        if (!players.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div>⌕</div>
                    <h3>Brak danych</h3>
                    <p>Ranking jest pusty.</p>
                </div>
            `;

            return;
        }

        const maxValue =
            Math.max(
                ...players.map(valueGetter),
                1
            );

        container.innerHTML =
            players
                .map((player, index) => {
                    const value =
                        valueGetter(player);

                    const percentage =
                        Math.max(
                            3,
                            Math.min(
                                100,
                                (value /
                                    maxValue) *
                                    100
                            )
                        );

                    return `
                        <div class="ranking-row">
                            <div class="ranking-number">
                                ${index + 1}
                            </div>

                            <div
                                class="ranking-name"
                                title="${escapeHTML(
                                    player.name
                                )}"
                            >
                                ${escapeHTML(
                                    player.name
                                )}
                            </div>

                            <div class="ranking-bar">
                                <span
                                    style="width:${percentage}%"
                                ></span>
                            </div>

                            <div class="ranking-value">
                                ${escapeHTML(
                                    value > 100000
                                        ? formatMoney(
                                            value
                                        )
                                        : formatNumber(
                                            value
                                        )
                                )}
                            </div>
                        </div>
                    `;
                })
                .join("");
    }

    /* =====================================================
       WYSZUKIWARKA
       ===================================================== */

    function setupSearch() {
        const searchInputs = [
            ...$$(".search input"),
            ...$$(
                "input[type='search']"
            ),
            ...$$(
                "[data-player-search]"
            ),
            ...$$(
                "#playerSearch"
            ),
            ...$$(
                "#searchInput"
            )
        ];

        const uniqueInputs =
            [...new Set(searchInputs)];

        uniqueInputs.forEach(input => {
            if (
                input.dataset.exodoSearchReady
            ) {
                return;
            }

            input.dataset.exodoSearchReady =
                "true";

            input.addEventListener(
                "input",
                () => {
                    performSearch(
                        input.value
                    );
                }
            );

            input.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key ===
                        "Enter"
                    ) {
                        event.preventDefault();

                        performSearch(
                            input.value
                        );
                    }

                    if (
                        event.key ===
                        "Escape"
                    ) {
                        input.value = "";

                        performSearch("");
                    }
                }
            );
        });
    }

    function performSearch(query) {
        const normalized =
            cleanText(query)
                .toLowerCase();

        if (!normalized) {
            state.filteredPlayers =
                [...state.players];

            renderEverything();

            return;
        }

        state.filteredPlayers =
            state.players.filter(
                player => {
                    const searchable = [
                        player.name,
                        player.clan,
                        player.rank,
                        player.lastSeen
                    ]
                        .join(" ")
                        .toLowerCase();

                    return searchable.includes(
                        normalized
                    );
                }
            );

        renderPlayersTable();

        renderSearchResults(
            state.filteredPlayers
        );
    }

    /* =====================================================
       WYNIKI WYSZUKIWANIA
       ===================================================== */

    function renderSearchResults(
        players
    ) {
        const containers = [
            ...$$(
                "#searchResults"
            ),
            ...$$(
                "[data-search-results]"
            ),
            ...$$(
                ".search-results"
            )
        ];

        const unique =
            [...new Set(containers)];

        unique.forEach(container => {
            if (!players.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div>⌕</div>
                        <h3>Nie znaleziono gracza</h3>
                        <p>
                            Spróbuj wyszukać inny nick.
                        </p>
                    </div>
                `;

                return;
            }

            container.innerHTML =
                players
                    .slice(0, 20)
                    .map(player => {
                        const status =
                            getPlayerStatus(
                                player
                            );

                        return `
                            <div
                                class="result-card"
                                data-search-player="${escapeHTML(
                                    player.name
                                )}"
                            >
                                <div>
                                    <strong>
                                        ${escapeHTML(
                                            player.name
                                        )}
                                    </strong>

                                    <small>
                                        Poziom:
                                        ${
                                            player.level !==
                                            null
                                                ? escapeHTML(
                                                    player.level
                                                )
                                                : "—"
                                        }

                                        ·

                                        ${escapeHTML(
                                            formatMoney(
                                                player.money
                                            )
                                        )}
                                    </small>
                                </div>

                                <div
                                    class="${status.className}"
                                    style="font-size:10px"
                                >
                                    ${escapeHTML(
                                        status.text
                                    )}
                                </div>
                            </div>
                        `;
                    })
                    .join("");

            $$(
                "[data-search-player]",
                container
            ).forEach(card => {
                card.style.cursor =
                    "pointer";

                card.addEventListener(
                    "click",
                    () => {
                        const name =
                            card.dataset
                                .searchPlayer;

                        const player =
                            state.players.find(
                                p =>
                                    p.name.toLowerCase() ===
                                    name.toLowerCase()
                            );

                        if (
                            player?.sourceUrl
                        ) {
                            window.open(
                                player.sourceUrl,
                                "_blank",
                                "noopener,noreferrer"
                            );
                        }
                    }
                );
            });
        });
    }

    /* =====================================================
       LOADING
       ===================================================== */

    function setLoadingState(
        loading
    ) {
        const buttons = [
            ...$$(
                "[data-refresh]"
            ),
            ...$$(
                "#refreshBtn"
            ),
            ...$$(
                "#refreshButton"
            )
        ];

        buttons.forEach(button => {
            button.disabled =
                loading;

            if (loading) {
                button.dataset
                    .originalText ??=
                    button.textContent;

                button.textContent =
                    "Ładowanie...";
            } else if (
                button.dataset
                    .originalText
            ) {
                button.textContent =
                    button.dataset
                        .originalText;
            }
        });
    }

    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(
        message,
        type = "info"
    ) {
        let toast =
            $("#toast");

        if (!toast) {
            toast =
                document.createElement(
                    "div"
                );

            toast.id = "toast";

            document.body.appendChild(
                toast
            );
        }

        toast.textContent =
            message;

        toast.classList.remove(
            "show"
        );

        if (type === "error") {
            toast.style.borderColor =
                "rgba(251,113,133,.35)";
        } else if (
            type === "warning"
        ) {
            toast.style.borderColor =
                "rgba(250,204,21,.35)";
        } else {
            toast.style.borderColor =
                "rgba(155,92,255,.3)";
        }

        requestAnimationFrame(
            () => {
                toast.classList.add(
                    "show"
                );
            }
        );

        clearTimeout(
            showToast.timer
        );

        showToast.timer =
            setTimeout(() => {
                toast.classList.remove(
                    "show"
                );
            }, 3000);
    }

    /* =====================================================
       NAWIGACJA
       ===================================================== */

    function setupNavigation() {
        const navItems =
            $$(".nav-item");

        navItems.forEach(item => {
            if (
                item.dataset
                    .exodoNavReady
            ) {
                return;
            }

            item.dataset
                .exodoNavReady =
                "true";

            item.addEventListener(
                "click",
                () => {
                    navItems.forEach(
                        nav =>
                            nav.classList.remove(
                                "active"
                            )
                    );

                    item.classList.add(
                        "active"
                    );

                    const target =
                        item.dataset.page ||
                        item.dataset.target;

                    if (target) {
                        switchPage(
                            target
                        );
                    }

                    /*
                     * Na telefonie zamykamy sidebar.
                     */

                    const sidebar =
                        $(".sidebar");

                    if (sidebar) {
                        sidebar.classList.remove(
                            "open"
                        );
                    }
                }
            );
        });
    }

    function switchPage(
        pageName
    ) {
        state.currentPage =
            pageName;

        const pages =
            $$(".page");

        pages.forEach(page => {
            const id =
                page.dataset.page ||
                page.id ||
                "";

            const normalizedId =
                id
                    .replace(
                        /^page[-_]?/i,
                        ""
                    )
                    .toLowerCase();

            const normalizedTarget =
                pageName
                    .replace(
                        /^page[-_]?/i,
                        ""
                    )
                    .toLowerCase();

            page.classList.toggle(
                "active",
                normalizedId ===
                    normalizedTarget
            );
        });
    }

    /* =====================================================
       MOBILE MENU
       ===================================================== */

    function setupMobileMenu() {
        const sidebar =
            $(".sidebar");

        const buttons = [
            ...$$(
                ".mobile-menu"
            ),
            ...$$(
                "[data-mobile-menu]"
            ),
            ...$$(
                "#mobileMenu"
            )
        ];

        buttons.forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    if (!sidebar) {
                        return;
                    }

                    sidebar.classList.toggle(
                        "open"
                    );
                }
            );
        });
    }

    /* =====================================================
       REFRESH BUTTON
       ===================================================== */

    function setupRefresh() {
        const buttons = [
            ...$$(
                "[data-refresh]"
            ),
            ...$$(
                "#refreshBtn"
            ),
            ...$$(
                "#refreshButton"
            )
        ];

        buttons.forEach(button => {
            if (
                button.dataset
                    .exodoRefreshReady
            ) {
                return;
            }

            button.dataset
                .exodoRefreshReady =
                "true";

            button.addEventListener(
                "click",
                async () => {
                    await loadPlayers();
                }
            );
        });
    }

    /* =====================================================
       DATA UPDATE LABEL
       ===================================================== */

    function updateLastUpdate() {
        const elements = [
            ...$$(
                "[data-last-update]"
            ),
            ...$$(
                "#lastUpdate"
            )
        ];

        if (!elements.length) {
            return;
        }

        if (!state.lastUpdate) {
            elements.forEach(
                element => {
                    element.textContent =
                        "Brak danych";
                }
            );

            return;
        }

        const time =
            state.lastUpdate.toLocaleTimeString(
                "pl-PL",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );

        elements.forEach(
            element => {
                element.textContent =
                    `Ostatnia aktualizacja: ${time}`;
            }
        );
    }

    /* =====================================================
       WSZYSTKO
       ===================================================== */

    function renderEverything() {
        updateDashboard();

        renderPlayersTable();

        renderRankings();

        renderSearchResults(
            state.filteredPlayers
        );

        updateServerStatus();

        updateLastUpdate();
    }

    /* =====================================================
       AUTO REFRESH
       ===================================================== */

    function startAutoRefresh() {
        setInterval(
            async () => {
                if (
                    document.hidden
                ) {
                    return;
                }

                await loadPlayers();
            },
            CONFIG.refreshInterval *
                1000
        );
    }

    /* =====================================================
       CHART.JS — JEŚLI JEST W HTML
       ===================================================== */

    function updateCharts() {
        /*
         * Ten fragment nie tworzy wykresów na siłę.
         * Jeżeli później podłączysz Chart.js,
         * dane mogą zostać pobrane z:
         *
         * state.players
         */

        const event =
            new CustomEvent(
                "exodo:data-updated",
                {
                    detail: {
                        players:
                            state.players,
                        stats:
                            calculateStats()
                    }
                }
            );

        document.dispatchEvent(
            event
        );
    }

    /* =====================================================
       CUSTOM EVENT
       ===================================================== */

    document.addEventListener(
        "exodo:data-updated",
        event => {
            /*
             * Miejsce na dodatkowe moduły.
             */
        }
    );

    /* =====================================================
       INIT
       ===================================================== */

    async function init() {
        console.log(
            "%cEXODO STATS",
            "font-size:20px;font-weight:800;color:#9b5cff"
        );

        console.log(
            "[EXODO] Uruchamianie..."
        );

        setupSearch();

        setupNavigation();

        setupMobileMenu();

        setupRefresh();

        await checkAPI();

        await loadPlayers();

        updateCharts();

        startAutoRefresh();

        /*
         * Gdy użytkownik wróci do zakładki,
         * sprawdzamy API ponownie.
         */

        document.addEventListener(
            "visibilitychange",
            async () => {
                if (
                    !document.hidden
                ) {
                    await checkAPI();
                }
            }
        );

        console.log(
            "[EXODO] Gotowe."
        );
    }

    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }

    /* =====================================================
       DEBUG — DOSTĘP Z KONSOLI
       ===================================================== */

    window.EXODO = {
        state,
        reload: loadPlayers,
        search: performSearch,
        checkAPI,
        stats: calculateStats
    };
})();
