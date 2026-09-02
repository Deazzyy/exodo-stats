# EXODO — nowa wersja strony

To jest całkowicie nowy frontend oparty na Twoim repo `Deazzyy/exodo-stats`. Zachowuje `logo.png`, ale cała zawartość jest przestawiona z panelu statystyk na **EXO Lottery / live giełdę**.

## Co zostaje
- `logo.png` z obecnego repo — nie usuwaj go przy podmianie plików.
- GitHub Pages jako hosting frontendu.
- Twój Cloudflare Worker jako warstwa API.

## Co jest nowe
- landing EXO Lottery,
- countdown loterii,
- live uczestnicy i losy,
- feed ostatnich transakcji,
- karta EXO,
- zasady 20–200 EXO,
- pule nagród,
- responsywny layout.

## Ważne: Worker
Frontend oczekuje endpointu:
`https://exodo-api.oliwierdawidowicz.workers.dev/api/exo/transactions`

W folderze `worker/` jest gotowy fragment Cloudflare Worker, który pobiera publiczną stronę:
`https://hodowlarp.pl/gielda/exo`
i próbuje wyciągnąć sekcję „Ostatnie transakcje”.

Nie trzeba instalować żadnego pluginu Minecraft.

### Integracja
W istniejącym `exodo-api` dodaj route `/api/exo/transactions` albo zastąp Worker kodem z `worker/exo-api-worker.js`, zachowując ewentualne pozostałe endpointy, jeśli są używane przez inne projekty.

## Podmiana w GitHub
Podmień w repo:
- `index.html`
- `style.css`
- `script.js`

`logo.png` zostaw.

Po pushu GitHub Pages powinien zbudować nową wersję.
