# AP4 – Designvorlagen und HTML-Textbausteine

Ziel: Zwei bis drei austauschbare Designvorlagen als Token-Sätze (Farben, Abstände, Kartenform, Schrift) in
`scripts/gen/html.py`, wählbar im Steckbrief (`design.vorlage: schlicht|kacheln|magazin`). Standard
`schlicht`, Emojis aus. Keine harten Designregeln im Skill; Vorlieben kommen aus dem Intake.

Textbausteine für Lesetexte (Seite/Textfeld): Zwischenüberschrift, kurzer Absatz, Liste, Hervorhebung, Merkkasten,
Beispiel-Box, Vergleichstabelle, Bild mit Unterschrift, Schritt-für-Schritt. Der Agent wählt je Textsorte
(Erklärung, Fall, Anleitung, Merksatz) den Baustein; Regel im Intake: kein Absatz länger als fünf Zeilen auf dem
Handy. Beachte die Theme-Grenzen in `references/spec.md` (Inline-CSS, keine verschachtelten Tabellen, `border:0`).

Abnahme: Render-Test (`tools/h5ptest/` für H5P; für HTML ein Playwright-Screenshot bei 390 px und 1200 px Breite)
für jede Vorlage mit `examples/netzwerk9`; Screenshots in `examples/netzwerk9/out/`, nicht committen.

Hinweis aus Import-Test 1 (0.4): Das Kursbanner und die Überblickskarte direkt darunter zeigen beide Titel und
Untertitel. Wenn ein Banner vorhanden ist, trägt die Karte nur noch Dauer und die drei Phasen, keinen Titel.
