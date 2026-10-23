![Kursmühle – Lernplattform-Kurse aus einem Prompt](docs/banner-kursmuehle-v4.svg)

# Kursmühle – Lernplattform-Kurse aus einem Prompt

![Version 0.2.1](docs/badge-version.svg) ![Status: Tech-Demo auf dem Weg zu 1.0](docs/badge-status.svg) ![Lizenz: nicht kommerziell](docs/badge-lizenz.svg) ![Plattform: ByCS-Lernplattform, Moodle 5.2](docs/badge-plattform.svg)

**Version 0.2.1** (Stand 23.10.2026) · siehe [`ROADMAP.md`](ROADMAP.md) und [`CHANGELOG.md`](CHANGELOG.md)

**Ein KI-Assistent baut aus einer Beschreibung oder eigenem Unterrichtsmaterial eine importierbare Kurssicherung (`.mbz`) für die ByCS-Lernplattform.**

## Was bringt das?

Einen Kurs in der [ByCS-Lernplattform](https://www.bycs.de/) (Bayern, Moodle-basiert,
früher mebis) von Hand anzulegen heißt: jede Seite, jede H5P-Übung, jedes Quiz
einzeln anklicken, befüllen und formatieren. Mit diesem Skill beschreibst du
den Kurs oder gibst vorhandenes Material ab, und der KI-Assistent liefert eine
fertige Kurssicherung zum Import.

- Ausgangsmaterial kann eine Beschreibung sein oder eigene Unterlagen: Folien,
  Arbeitsblätter, Notizen, Fotos von eigenem Material.
- Vor dem Bau bekommst du ein kurzes Drehbuch zum Gegenlesen. Darin ist
  markiert, was aus deinem Material stammt und was die KI ergänzt hat.
- Ein Kurs lässt sich in Etappen liefern, das Design nachträglich wechseln und
  die nächste Einheit mit demselben Ablauf bauen.

## So nutzt du es

1. **Repo herunterladen** (grüner Button → *Download ZIP*) und entpacken.
2. **Dem KI-Assistenten den Ordner geben** und sagen, welcher Kurs entstehen
   soll. Der Assistent muss Code ausführen können (Claude, ChatGPT mit
   Code-Ausführung oder ein lokaler Agent); auf deinem Rechner wird nichts
   installiert. Du wählst, wie viel du selbst entscheidest:
   - nur ein Thema nennen – die KI macht alles, du liest das Drehbuch
   - altes Material abgeben – die KI baut daraus
   - Fragen beantworten – mit oder ohne Material, du steuerst Gliederung und Formate
3. **Drehbuch lesen und freigeben.** Die gelieferte `.mbz` importierst du über
   Kurs → Mehr → *Kurs wiederverwenden* → *Wiederherstellen*, zuerst in einen
   Testkurs.

> **Projektstatus: Version 0.2 (Tech-Demo).**
> Der Ablauf Intake → Drehbuch → Generator → Import ist an zwei Beispielkursen
> durchgespielt, einschließlich H5P-Inhalten, Badge und Nachlieferung in einen
> laufenden Kurs, mit Claude Code und mit ChatGPT. Offen sind weitere
> Kursformate und Modultypen (siehe Tabelle unten). Kein offizielles Produkt
> der Plattform; wenn sich die Lernplattform ändert, wird der Skill angepasst.

## Systemübersicht

![Ablauf: Lehrkraft → KI-Assistent → Drehbuch → Generator → Lernplattform](docs/ablauf.svg)

- Die KI schreibt nur die Inhalte. Das Archiv aus über hundert verknüpften
  XML-Dateien, Hashes und IDs baut der Generator.
- Das Drehbuch enthält den gesamten Kurs als kurzen Text mit Zeitschätzung
  je Element und Quellenmarkierung (aus dem Material / von der KI ergänzt).
  Dieselbe Datei ist die Kursdatei: Der Generator liest sie direkt, nichts
  wird nach der Freigabe noch einmal abgetippt. Vor der Lieferung prüft ein
  zweiter, unabhängiger Lauf Inhalt und Aufgabenlogik.
- Die Sicherung ist nicht an einen Account gebunden; der Import läuft in jedem
  Kurs der Plattform ohne Vorarbeit.

## Features

- Textfelder und Seiten mit eigenem HTML (Karten, Merkkästen, Tabellen),
  angepasst an die Filter des Plattform-Themes
- H5P-Inhalte als JSON, ohne Klicken im H5P-Editor
- Der Intake-Leitfaden gibt die Reihenfolge Lesen → Üben → Sichern vor
  (erst Input, dann Kontrolle)
- Kurs in Etappen: „sichtbar ab Datum“ je Abschnitt oder Delta-Sicherung zum
  Nachliefern in einen laufenden Kurs
- Steuerungsgrad wählbar: selbst entscheiden, Vorschläge freigeben oder
  „KI macht alles“

## Was der Generator kann – und was (noch) nicht

| Kann | Noch nicht |
|---|---|
| Kursformat „Themen“, beliebig viele Abschnitte und Unterabschnitte | Andere Kursformate (Kachel, Grid, Einzelaktivität) |
| Textfelder und Seiten mit beliebigem HTML-Design | Moodle-Test, Aufgabe, Forum, Buch, Lektion, Glossar, Wiki, Abstimmung |
| H5P: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Fill in the Blanks, Dialog Cards, Course Presentation; Bausteine Text, Bild, Multiple Choice, True/False, Drag the Words, Mark the Words, Summary, Single Choice Set | Weitere H5P-Typen (Interactive Video, Image Hotspots, Memory …) |
| Feedback-Umfragen, Links/Videos (eingebettet), Badges, Kursbild, Abschlussverfolgung | Gruppen, Termine, Kursabschluss-Kriterien, Audio/Video als Datei |
| Zugriffsbeschränkung „sichtbar ab Datum“; Nachlieferung per Delta-Sicherung | Andere Zugriffsbedingungen (Abschluss von X, Bewertung, Gruppe) |

## Repository-Struktur

```
SKILL.md       Einstieg für den KI-Agenten: Ablauf, harte Regeln, Grenzen
references/    spec.md (Sicherungsformat, Plattformwerte, H5P-Strukturen),
               kursdatei.md (Format der Kursdatei kurs.md),
               h5p-vorlagen.md (json_content aller Typen, deutsche UI-Texte),
               skelette.md (XML-Skelette), intake.md (Fragerunden, Drehbuch, Steckbrief)
scripts/       Generator (gen/), build.py, Vorlagen, tests/
examples/      netzwerk9/  – eine Einheit, 25 min: Vorbild für neue Kurse
               alltagskompetenz/ – großer Kurs mit Unterabschnitten, Badge, Delta
               (je kurs.md, assets/, steckbrief.yaml)
tools/h5ptest/ Render-Test der H5P-Inhalte außerhalb der Plattform (h5p-standalone + Playwright)
CHANGELOG.md   Versionen und bekannte Lücken
```

## Nach dem Import

Badge aktivieren (Mehr → Badges), Kursbild prüfen, Probedurchlauf als
Schüler/in. Wenn etwas nicht passt, reicht ein Screenshot an den Assistenten;
er ändert die Inhalte und baut die Sicherung neu.

## Ohne KI bauen (für Entwickler)

Beispielkurs direkt aus dem Generator (Python 3.11+, PyYAML, Pillow):

```bash
python3 scripts/build.py --content examples/netzwerk9
```

Der Kursinhalt steht in `examples/netzwerk9/kurs.md` (Format: `references/kursdatei.md`);
die Bilder in `examples/netzwerk9/assets` sind Platzhalter. `python3 scripts/tests/test_kursdatei.py`
prüft Parser und Beispiele, `scripts/tests/mbz_diff.py` vergleicht zwei Sicherungen ohne IDs und Zeitstempel.

## Kurs in Etappen

Zwei Wege:

- **Fertig bauen, wochenweise freigeben:** im Steckbrief steht je Lerneinheit
  ein Datum „sichtbar ab“; alles wird einmal importiert.
- **Nach und nach bauen:** je Etappe liefert die KI eine Delta-Sicherung nur
  mit den neuen Abschnitten, eingespielt über *In diesen Kurs zusammenführen*.
  Bestehende Abschnitte und der Lernfortschritt bleiben erhalten.

Bereits importierte Abschnitte lassen sich per Sicherung nicht nachträglich
ändern. Wer etwas korrigieren will, löscht den Abschnitt und spielt die
Delta-Sicherung neu ein; der Lernfortschritt in diesem Abschnitt geht dabei
verloren.

## Status / Roadmap

- [x] Generator für Sicherungen (Moodle 5.2, mod_hvp), Import getestet
- [x] H5P-Render-Test und inhaltliche Gegenprüfung durch zweiten Agenten
- [x] Delta-Sicherung („Zusammenführen“) und „sichtbar ab Datum“
- [x] Intake mit Steuerungsgrad, Drehbuch-Format, Zeitcheck, Änderungsliste
- [x] Drehbuch-Parser: Das Drehbuch ist die Kursdatei (`kurs.md`), der Generator liest sie direkt
- [ ] Menüführung: „Womit starten wir?“ – Thema, altes Material, Material + Fragen, Fragen-Intake
- [ ] Alle Kursformate (Kacheln, Grid, Wochen …) und alle Modultypen (Test, Aufgabe, Forum …)
- [ ] Schlanke Designvorlagen zur Auswahl; Kursbanner und Bilder sinnvoll eingebunden, generiert vom Assistenten, wenn er es kann
- [ ] HTML-Formatierung für Lesetexte: Überschriften, Listen, Merk- und Beispielkästen statt Fließtext
- [ ] One-Page-Darstellung ohne Ladezeiten: H5P im Textfeld, Kurs als eigene Website mit eigenen Spielen

Reihenfolge und Details in [`ROADMAP.md`](ROADMAP.md); die Liste dort definiert Version 1.0.

## Mitmachen

Fehlerberichte und Erweiterungen als Issue oder Pull Request. Am meisten hilft
ein Hinweis, welches Kursformat oder welche Aktivität fehlt; Kurssicherungen
selbst gehören nicht ins Repo (die Nutzungsbedingungen der Plattform untersagen
die Weitergabe von Dateien an Dritte) – veröffentlicht werden nur die daraus
abgeleiteten Schemata mit Platzhaltern.

Wer einen Pull Request einreicht, stellt seinen Beitrag unter die Lizenzen
dieses Repositories und ist damit einverstanden, dass der Autor spätere
Versionen unter anderen Bedingungen veröffentlichen kann.

## Lizenz

Nicht kommerziell. Schulen, Lehrkräfte und Fortbildungen dürfen den Skill
nutzen, verändern und weitergeben; der Einbau in kommerzielle Produkte oder
Dienste ist nicht erlaubt.

- **Code** (`scripts/`): [PolyForm Noncommercial 1.0.0](LICENSE)
- **Texte, Vorlagen, Beispielkurse** (alles andere):
  [CC BY-NC-SA 4.0](LICENSE-DOCS.md) – Namensnennung, nicht kommerziell,
  Weitergabe unter gleichen Bedingungen

Mit dem Skill erzeugte Kurse gehören der Lehrkraft, die sie gebaut hat.
Spätere Versionen können unter anderen Bedingungen erscheinen; einmal
veröffentlichte Fassungen bleiben unter ihrer Lizenz nutzbar.

## Danksagung

- [ByCS-Lernplattform](https://www.bycs.de/) und [Moodle](https://moodle.org/)
  für das dokumentierte Sicherungsformat
- [H5P](https://h5p.org/) und das Plugin [mod_hvp](https://github.com/h5p/moodle-mod_hvp):
  interaktive Inhalte als JSON
- [h5p-standalone](https://github.com/tunapanda/h5p-standalone): Render-Test
  der H5P-Inhalte außerhalb der Plattform
- [Claude Code](https://claude.com/claude-code) (Anthropic): Generator,
  Spezifikation, Beispielkurse und Dokumentation wurden damit entwickelt

## Haftungsausschluss

Keine Verbindung zum Betreiber der Lernplattform. Sicherungen vor dem Einsatz
immer in einem Testkurs importieren und prüfen. Das Drehbuch ist die
Kontrollinstanz für Inhalte, die die KI ergänzt hat; die fachliche
Verantwortung bleibt bei der Lehrkraft.

---

**Für den KI-Agenten:** [`SKILL.md`](SKILL.md) laden; Referenzen in
`references/`, Generator in `scripts/`, Beispielkurse in `examples/`.
