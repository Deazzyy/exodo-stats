# EXODO — EXO Lottery LIVE

Gotowy replacement frontendu dla repo:
https://github.com/Deazzyy/exodo-stats

## Co podmienić w repo

Podmień:
- `index.html`
- `style.css`
- `script.js`

ZOSTAW swój obecny:
- `logo.png`

## API

Frontend korzysta z:
`https://exodo-api.oliwierdawidowicz.workers.dev/api/exo/lottery/state`

Odświeżanie odbywa się automatycznie co 5 sekund.

## Co jest LIVE

- status loterii,
- Lottery ID,
- started_at / last_scan_at,
- liczba zakwalifikowanych,
- liczba losów,
- zakupione EXO,
- wartość zakupów,
- lista uczestników,
- odrzuceni,
- ostatnio wykryte zakupy.

## Countdown

Backend w obecnej wersji nie ma jeszcze `end_at` i `draw_at`, dlatego frontend liczy wizualnie:
- koniec = start + 2h30m,
- losowanie = koniec + 30m.

Możesz zmienić to na początku `script.js`:

```js
const LOTTERY_DURATION_MS = 2.5 * 60 * 60 * 1000;
const DRAW_DELAY_MS = 30 * 60 * 1000;
```

Docelowo najlepiej dodać `end_at` i `draw_at` do Workera, żeby harmonogram też był backendowym źródłem prawdy.

## GitHub Pages

Po commicie plików GitHub Pages powinien automatycznie zaktualizować stronę po chwili.
