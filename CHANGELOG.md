# Changelog

## 0.1 – 2026-10-23

Erste Fassung, entstanden als Tech-Demo für eine Dienstbesprechung (Digitales Netzwerk).

- Generator für ByCS-Lernplattform-Sicherungen (Moodle 5.2, mod_hvp): Abschnitte, Unterabschnitte, Textfelder, Seiten,
  Links/Videos, Feedback, Badges, Abschlussverfolgung; H5P-Typen Interactive Book, Branching Scenario, Question Set,
  Drag and Drop, Fill in the Blanks, Dialog Cards (mit Fotos) plus Bausteine Text, Bild, Multiple Choice, True/False,
  Drag the Words, Mark the Words, Summary, Single Choice Set.
- Etappen: `--delta` (Nachlieferung per „Zusammenführen“, verifiziert) und `sichtbar_ab` (Datums-Zugriffsbeschränkung).
- Agenten-Spezifikation (`references/spec.md`), H5P-Vorlagen mit deutschen UI-Strings, XML-Skelette, Intake-Leitfaden
  mit Drehbuch-Format (Quellenmarkierung, Zeitcheck, Änderungsliste, „erst Input, dann Kontrolle“).
- Zwei Beispielkurse: `alltagskompetenz` (groß) und `netzwerk9` (eine Einheit, Rhythmus Lesen → Üben → Sichern).

Bekannte Lücken: nur Kursformat „Themen“; keine Moodle-Tests/Aufgaben/Foren; Drehbuch wird noch von Hand in
`content/` übertragen (Parser geplant); H5P direkt im Textfeld (Kern-H5P-Filter) ungetestet.

## 0.1.1 – 2026-10-23

- Lizenz festgelegt: Code PolyForm Noncommercial 1.0.0, Texte/Vorlagen/Beispiele CC BY-NC-SA 4.0.
- README überarbeitet (Mehrwert und Nutzung am Anfang, Lektorat), ROADMAP.md mit der Definition von 1.0.
- `tools/h5ptest/`: H5P-Render-Test (extract, fetchlibs, buildpages, render) aus der Entwicklung übernommen.
