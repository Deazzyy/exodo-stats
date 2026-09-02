EXODO v4.3 — LIVE MARKET + SKIN

FRONTEND (repo Deazzyy/exodo-stats):
- podmień index.html
- podmień style.css
- podmień script.js
- dodaj folder assets i plik assets/deazzyy-skin.png
- zostaw obecne logo.png

WORKER (Cloudflare exodo-api):
- podmień worker.js
- Deploy
- pozostaw EXO_STATE i ADMIN_SECRET bez zmian

Co nowego:
- kurs, płynność, rating, prowizja i akcje w obrocie nie są już wpisane na sztywno;
- Worker zwraca live `market` z publicznej strony HodowlaRP;
- feed pokazuje KUPNO i SPRZEDAŻ;
- uczestnicy/losy nadal są niezależne i dotyczą tylko właściwego okna loterii;
- skin jest lekko rozmyty i bardzo subtelny w tle;
- STATE_KEY pozostaje `lottery_state_v4`, więc aktualizacja nie ma zerować stanu v4.x.

Po wdrożeniu Workera:
1. / powinno pokazać version 4.3
2. /api/exo/transactions powinno zwrócić `all_transactions` oraz `market`
