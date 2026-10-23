---
name: kursmuehle
description: Baut komplette Kurse für die ByCS-Lernplattform (Bayern, Moodle-basiert, früher mebis) als importierbare .mbz-Sicherung – Abschnitte, Seiten, H5P-Inhalte (Interaktiver Inhalt), Umfragen, Badges – aus einer Kursbeschreibung oder einem Fragen-Intake. Verwenden, wenn jemand einen ByCS-/mebis-/Moodle-Kurs, eine Kurssicherung, H5P-Aktivitäten für die Lernplattform oder eine Nachlieferung (Delta) zu einem bestehenden Kurs will.
---

# ByCS-Lernplattform-Kurs generieren

Ergebnis ist immer eine `.mbz`, die die Lehrkraft über Kurs → Mehr → Kurs wiederverwenden → Wiederherstellen einspielt.
Code-Ausführung (Python 3.11+, PyYAML, Pillow; Playwright+Chromium nur für Bilder) ist Voraussetzung.

## Ablauf

1. **Intake** nach `references/intake.md`: erste Frage Steuerungsgrad (entscheide / Vorschlag / KI macht alles), dann
   Rahmen + Material, Gliederung als Vorschlag, Formate, Gestaltung. Ergebnis: `steckbrief.yaml` (Schema in intake.md §6).
2. **Drehbuch = Kursdatei** (intake.md §5, Referenz `references/kursdatei.md`): gesamter Inhalt als `kurs.md` im
   Drehbuch-Format mit Quellenmarkierung und Zeitcheck → Freigabe durch die Lehrkraft (entfällt nur bei „KI macht alles“).
   Bei Revision nur Änderungsliste + geänderte Blöcke zeigen. Die freigegebene Datei wird unverändert gebaut.
3. **Bau**: Kursordner mit `kurs.md`, `assets/` (PNG), `steckbrief.yaml` (Vorbild `examples/netzwerk9/` = minimal,
   `examples/alltagskompetenz/` = alle Elementtypen). Kein Python schreiben.
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
  `python3 scripts/build.py --content examples/<kurs>` baut sie.
- `README.md` – Erklärung für Lehrkräfte, Capabilities.

## Grenzen

Kursformat nur „Themen“; keine Moodle-Tests/Aufgaben/Foren (Links/Videos per `Url` ja); H5P nur die Typen aus §B.2; geänderte Teile eines Kurses
lassen sich per Sicherung nicht aktualisieren (löschen + Delta). Delta-Zusammenführen hängt neue Abschnitte hinten an (verifiziert 2026-10-23).
