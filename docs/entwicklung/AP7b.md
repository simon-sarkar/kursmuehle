# AP7b – Textfeld-Modus

Anlass: JS-Probe auf der Plattform am 23.10. (`tools/jsprobe`). Probe 1 bestanden, JavaScript im Textfeld läuft;
Probe 2 bestanden, die eingebettete Datei läuft in voller Rahmenhöhe.

Ziel: Der Website-Renderer aus AP7 als Inline-Block im Textfeld, ohne iframe. CSS gilt nur im Block, das Skript legt
keine globalen Namen an, damit mehrere Blöcke auf einer Kursseite nebeneinander laufen. Steckbrief und Abschnitt kennen
`website: textfeld` neben eingebettet, Vollbild und neuem Fenster. Gedacht für Übungen zwischen Lesetexten, nicht für
ganze Einheiten.

Rangfolge in `SKILL.md` und `intake.md`: Textfeld-JS für formative Übungen, H5P- oder Moodle-Aktivität für alles
Bewertete und Abschlussrelevante, Website-Datei für eine ganze Einheit am Stück. Vorbehalte als Fakten in README und
`SKILL.md`: Die Moodle-App führt Textfeld-JS möglicherweise nicht aus, große Inline-Blöcke blähen die Kursseite, die
Nutzungsbedingungen erlauben JavaScript für Lehrkräfte. Ergebnis der Probe in `tools/jsprobe/README.md`.

Dazu: Im Kachelformat entfällt die Überblickskarte in Abschnitt 0 automatisch. D1–D10 aus `references/didaktik.md`
nach `references/intake.md` §3, `didaktik.md` entfernt, Verweise angepasst; CLAUDE.md nennt als Laufzeitlektüre
`SKILL.md`, das Kursdatei-Format, `intake.md` und `qualitaet.md`. README-Abschnitt „Was Kursmühle kann“,
`docs/website-netzwerk9.png` neu gerendert. Version 0.9.1.

Abnahme: Pflichtbau netzwerk9, `test_kursdatei.py`, `test_check.py`, `test_website.py` (mit Chromium) mit neuen Fällen
für den Textfeld-Modus; Import-Test von Probe 3 (zwei Blöcke auf einer Kursseite) durch den Autor.
