---
name: kursmuehle
description: Baut komplette Kurse für die ByCS-Lernplattform (Bayern, Moodle-basiert, früher mebis) als importierbare .mbz-Sicherung – Abschnitte, Seiten, H5P-Inhalte (Interaktiver Inhalt), Tests, Aufgaben, Foren, Bücher, Abstimmungen, Glossare, Dateien, Umfragen, Badges – aus einer Kursbeschreibung oder einem Fragen-Intake. Verwenden, wenn jemand einen ByCS-/mebis-/Moodle-Kurs, eine Kurssicherung, H5P-Aktivitäten für die Lernplattform oder eine Nachlieferung (Delta) zu einem bestehenden Kurs will.
---

# ByCS-Lernplattform-Kurs generieren

Ergebnis ist immer eine `.mbz`, die die Lehrkraft über Kurs → Mehr → Kurs wiederverwenden → Wiederherstellen einspielt.
Code-Ausführung (Python 3.11+, PyYAML, Pillow; Playwright+Chromium nur für Bilder) ist Voraussetzung.

## Selbstabfrage (vor der ersten Nachricht, nicht an die Lehrkraft)

Drei Fragen an sich selbst; die Antworten stehen im Steckbrief unter `assistent:` und bestimmen den Weg bei Bau und Bildern.
Nicht raten: wer unsicher ist, probiert es (`python3 --version`, ein kleines Testbild).

| Kann ich … | ja | nein |
|---|---|---|
| Code ausführen (Python 3.11+, PyYAML, Pillow)? | Kurs bauen wie unten | Drehbuch und Steckbrief liefern; Bau in einem Assistenten mit Code-Ausführung empfehlen |
| Dateien lesen (PDF, PPTX, Bilder)? | Material der Lehrkraft lesen, Fotos übernehmen | Lehrkraft bitten, Text einzufügen und Fotos zu beschreiben |
| Bilder erzeugen? | Banner, Kursbild, Abschnittsbilder selbst erzeugen und in `assets/` legen (intake.md §4) | `python3 scripts/banner.py` rendern (Playwright), sonst Banner ohne Bild und `Bildwunsch:`-Zeilen für die Lehrkraft |

## Ablauf

1. **Einstieg** nach `references/intake.md`: erste Nachricht „Womit starten wir?“ mit fünf Wegen (nur Thema · Material ·
   Material + Fragen · Fragen · bestehenden Kurs erweitern), Steuerungsgrad (entscheide / Vorschläge freigeben / KI macht
   alles) und Rahmen in einem Satz. Danach höchstens **eine Fragerunde** (Kursformat mit Empfehlung, Umfang, Abschluss,
   Gestaltung; jede Frage mit Vorschlag) und ein Gliederungsvorschlag. Bei „nur Thema“ keine Rückfrage: Annahmen stehen
   als `Angenommen:` oben im Drehbuch. Ergebnis: `steckbrief.yaml` (Schema in intake.md §6).
2. **Drehbuch = Kursdatei** (intake.md §5, Referenz `references/kursdatei.md`): gesamter Inhalt als `kurs.md` im
   Drehbuch-Format mit Quellenmarkierung und Zeitcheck → Freigabe durch die Lehrkraft (entfällt nur bei „KI macht alles“).
   Bei Revision nur Änderungsliste + geänderte Blöcke zeigen. Die freigegebene Datei wird unverändert gebaut.
3. **Bau**: Kursordner mit `kurs.md`, `assets/` (PNG), `steckbrief.yaml` (Vorbild `examples/netzwerk9/` = minimal,
   `examples/alltagskompetenz/` = alle Elementtypen). Kein Python schreiben. Erstes Element in `## Allgemeines` ist
   `### Banner:` (Bild + Titel + ein Satz); Bild nach intake.md §4: selbst erzeugt, `python3 scripts/banner.py`, oder ohne `bild:`.
   `python3 scripts/build.py --content <kursordner> --proto` (Erstkurs) oder ohne `--proto`.
   Etappen: `--delta` (alle `status: pending`) oder `--delta le2,le3`; Teile = `teil:` im Abschnitt. Freigabe nach Datum:
   `sichtbar_ab:` im Steckbrief oder `sichtbar ab:` in der Kursdatei. Parserfehler nennen Zeile und Element: beheben, nicht raten.
4. **Prüfung vor Lieferung**: unabhängiger zweiter Lauf auf Drehbuch-Ebene (Inhalt, Aufgabenlogik, Inhaltsregeln spec §L).
   Strukturell prüft `build.py` die fertige `.mbz` selbst (`scripts/check.py`: Archiv, IDs, Dateien und Hashes, Bilder,
   Bibliotheksversionen, Verfügbarkeits-JSON); meldet es `FEHLER`, wird nicht geliefert, sondern behoben. Von Hand:
   `python3 scripts/check.py <datei.mbz>`. Wenn möglich Rendertest mit h5p-standalone und den Bibliotheken aus §B.2.
5. **Lieferung**: `.mbz` + kurzer Import-Hinweis (Ziel „Inhalte löschen und wiederherstellen“ bzw. bei Delta
   „Zusammenführen“, neuer Abschnitt landet hinten; Badge nach Import aktivieren; Kursbild prüfen). Steckbrief-Teile auf `delivered`.

## Harte Regeln

- Nur Bibliotheksversionen aus `references/spec.md` §B.2 verwenden; nie raten. Unbekannter Typ → Fallback §B.3.
- `json_content` aus `references/h5p-vorlagen.md` übernehmen, nur Inhalte ersetzen; jede `subContentId` eine eigene UUID.
- Bilder in H5P-Inhalten ins Filearea `mod_hvp/content` (spec §H) – häufigster stiller Fehler.
- Kursseiten-HTML nur mit filtersicherem CSS (spec §K); jede `<td>` setzt `border` explizit; keine verschachtelten Tabellen.
- Gestaltung ist Präferenz der Lehrkraft (Steckbrief `design`), Standard schlicht; Emojis nur auf Wunsch.
- Mischung statt H5P-Kette: Input als Textfeld (kurz, direkt auf der Kursseite) oder Seite (länger, mit Bildern), Videos als
  Link (`Url`, display embed – die Plattform bettet YouTube/Vimeo ein), H5P nur für Übung und Kontrolle. Richtwert: höchstens die
  Hälfte der Elemente einer Einheit sind H5P; Rhythmus Lesen → Üben → Lesen → Üben → Sichern.
- Moodle-Module, wenn die Lehrkraft Bewertung, Abgaben oder Austausch braucht: `Test` (benotet, Versuche, Fragensammlung; nur
  MC, RF, Kurzantwort) für die Kontrolle mit Note, `Quiz` (H5P) für Zwischenchecks; `Aufgabe` für Abgaben, `Forum` für
  Fragen, `Abstimmung` für Meinungsbilder, `Buch` für längere Lesetexte ohne Fragen, `Datei`/`Verzeichnis` für Material der
  Lehrkraft, `Glossar` für Begriffe. Syntax: `references/kursdatei.md` §3, Beispiel `examples/module/`.
- Erst Input, dann Kontrolle: bewertete Aufgaben nur zu Inhalten, die im selben Lesebuch davor stehen; Aktivierungsfragen
  unbewertet (Text), Auflösung auf der Folgeseite; im Drehbuch je Aufgabe `(← Sn)`.
- Inhaltsregeln spec §L: Antworten mischen, plausible Distraktoren, kein Meta-Text, keine Aphorismen, keine absoluten
  Aussagen, keine Genderzeichen, Fachliches gegen das Material der Lehrkraft prüfen.
- Delta-Sicherungen: Abschnitt 0 leer, Teile als Top-Level-Abschnitte, keine Badges/Kursbild (spec §O).

## Dateien

- `references/spec.md` – Plattformkonstanten, Archivaufbau, Schemata aller Module, H5P-Strukturen, Etappen (§A–O).
- `references/h5p-vorlagen.md` – `json_content`-Vorlagen mit deutschen UI-Strings (Stand 2026-10-22).
- `references/skelette.md` – `moodle_backup.xml`-Kopf, Settings, `course.xml`, leere Standarddateien.
- `references/intake.md` – Fragerunden, Drehbuch-/Kursdatei-Format (eine Seite), Steckbrief-Schema.
- `references/kursdatei.md` – vollständige Referenz der Kursdatei (alle Typen, Angaben, Bausteine, Grenzen).
- `scripts/` – Generator: `gen/kursdatei.py` (Parser), `gen/html.py` (Textbausteine), `gen/mbz.py` (Writer),
  `gen/h5p.py` (H5P-Builder), `gen/render.py` (Banner/Mocks), `build.py`, `check.py` (Sicherung prüfen), `templates/`,
  `tests/` (Regressionstests, `.mbz`-Vergleich). Enthält keinen Kursinhalt.
- `examples/netzwerk9/` – minimaler Beispielkurs (eine Einheit, 25 min, aus Folien + Fotos einer Lehrkraft): Vorbild für neue Kurse.
- `examples/alltagskompetenz/` – großer Beispielkurs (Tech-Demo, Unterabschnitte, Lesebuch, Geschichte, Badge, Delta).
- `examples/module/` – ein Abschnitt mit den Moodle-Modulen Buch, Datei, Verzeichnis, Glossar, Forum, Abstimmung, Aufgabe, Test.
  `python3 scripts/build.py --content examples/<kurs>` baut sie.
- `README.md` – Erklärung für Lehrkräfte, Capabilities.

## Grenzen

Kursformat nur „Themen“; Moodle-Module nur Test (MC, RF, Kurzantwort), Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung,
Glossar (keine Lektion, Wiki, Datenbank, Workshop); H5P nur die Typen aus §B.2; geänderte Teile eines Kurses
lassen sich per Sicherung nicht aktualisieren (löschen + Delta). Delta-Zusammenführen hängt neue Abschnitte hinten an (verifiziert 2026-10-23).
Test, Glossar-Einträge und Buch sind noch nicht per Import auf der Plattform verifiziert (Stand 0.6): beim ersten Einsatz in einen Testkurs importieren.
