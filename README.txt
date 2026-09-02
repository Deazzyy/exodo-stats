EXODO v5.1 — EXO CHALLENGE / MINIMUM 40 EXO

Zmiana względem v5.0:
- nie ma otwartego/darmowego zapisu dla każdego;
- podczas kliknięcia "Dołącz" Worker sprawdza publiczne dane HodowlaRP;
- nick musi mieć minimum 40 EXO;
- zweryfikowana liczba EXO zostaje zapisana przy uczestniku;
- po wejściu do konkursu liczba EXO nie daje dodatkowych punktów ani przewagi;
- ranking nadal wynika wyłącznie z wykonanych etapów i czasu.

FRONTEND:
podmień index.html, style.css, script.js i zachowaj assets/deazzyy-skin.png + logo.png.

WORKER:
podmień worker.js i Deploy.
Binding EXO_STATE oraz ADMIN_SECRET zostają.

UWAGA TECHNICZNA:
Weryfikacja 40 EXO działa tylko wtedy, gdy publiczna strona HodowlaRP udostępnia listę akcjonariuszy z nickiem i liczbą akcji.
Jeżeli HodowlaRP zmieni układ tej sekcji lub jej nie publikuje, endpoint join zwróci komunikat, że nie może potwierdzić nicku.
Nie zgadujemy stanu konta na podstawie samych ostatnich transakcji.
