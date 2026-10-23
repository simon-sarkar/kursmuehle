# bycs-kurs 🎓🤖

**Kurse für die ByCS-Lernplattform per KI generieren – aus einer Beschreibung wird eine fertige Kurssicherung.**

`bycs-kurs` ist ein Skill für KI-Assistenten, die Code ausführen können (Claude,
ChatGPT mit Code-Ausführung, lokale Agenten). Die Lehrkraft beschreibt ihren Kurs
oder beantwortet ein paar Fragen, hängt vorhandenes Material an (Folien,
Buchseiten als Foto, Arbeitsblätter) und liest ein kurzes Drehbuch gegen. Der
Generator erzeugt daraus eine importierbare Kurssicherung (`.mbz`) für die
[ByCS-Lernplattform](https://www.bycs.de/) (Bayern, Moodle-basiert, früher mebis) –
mit Abschnitten, gestalteten Seiten, H5P-Übungen, Umfragen und Badges.
Entstanden als Tech-Demo für eine Dienstbesprechung zum Thema *Digitales
Netzwerk* – zur Beantwortung der Frage: *Wie viel Kurs bekommt man aus einem
Nachmittag Prompten, ohne eine einzige Datei von Hand anzulegen?*

> **📍 Projektstatus: Version 0.1 – Tech-Demo, funktionsfähig.**
> Der komplette Weg ist durchlaufen und verifiziert: Intake → Drehbuch →
> Generator → Import in die Lernplattform, inklusive H5P-Inhalten, Badge und
> Nachlieferung einzelner Abschnitte in einen laufenden Kurs. Was noch
> aussteht, ist die **Erprobung durch andere**: weitere Kurslayouts, mehr
> Aktivitätstypen und Rückmeldungen aus echten Kursen. Kein offizielles
> Produkt der Plattform; wenn sich die Lernplattform ändert, wird der Skill
> nachgezogen.

## Systemübersicht

```
Lehrkraft ──▶ KI-Assistent ──▶ Drehbuch (Text, zum Gegenlesen)
 Beschreibung   liest SKILL.md          │ Freigabe
 + Material                             ▼
                               content/course.py ──▶ scripts/build.py ──▶ kurs.mbz
                               Inhalte in Python       Generator (gen/)      │
                                                                             ▼
                                   ByCS-Lernplattform ◀── Kurs wiederverwenden → Wiederherstellen
```

- **Die KI schreibt nur Inhalte**, der Generator baut das Archiv: eine Sicherung
  besteht aus über hundert verknüpften XML-Dateien, Hashes und IDs – das macht
  der Code fehlerfrei, die KI nicht.
- **Drehbuch vor Bau:** der gesamte Kurs als kurzer Text mit Zeitcheck und
  Markierung, was aus dem Material stammt und was die KI ergänzt hat.
- **Keine personenbezogenen Daten im Skill:** plattformspezifische Werte kommen
  aus einer lokalen `site.json`, Beispielfotos sind Platzhalter.

## Features

- 📄 Textfelder und Seiten mit frei gestaltbarem HTML (Karten, Merkkästen,
  Tabellen – angepasst an die Filter des Plattform-Themes)
- 🧩 H5P ohne Klickerei: Interactive Book, Branching Scenario, Question Set,
  Drag and Drop, Fill in the Blanks, Dialog Cards, Course Presentation
- 🔁 Rhythmus *Lesen → Üben → Sichern* statt H5P-Dauerfeuer; Regel
  „erst Input, dann Kontrolle“ steckt im Intake
- 🏅 Badges, Kursbild, Abschlussverfolgung, Bewertungsposten für H5P,
  Feedback-Umfragen, eingebettete Videos
- 📅 Kurs in Etappen: „sichtbar ab Datum“ je Abschnitt oder Delta-Sicherung
  zum Nachliefern in einen laufenden Kurs (Fortschritt bleibt erhalten)
- 🎚️ Steuerungsgrad wählbar: selbst entscheiden, Vorschläge freigeben oder
  „KI macht alles“
- 🧑‍🏫 Keine Installation auf Lehrkraft-Seite: Ordner an den Assistenten geben,
  `.mbz` zurückbekommen, importieren

## Was der Generator kann – und was (noch) nicht

| Kann | Noch nicht |
|---|---|
| Kursformat „Themen“, beliebig viele Abschnitte und Unterabschnitte | Andere Kursformate (Kachel, Grid, Einzelaktivität) |
| Textfelder und Seiten mit beliebigem HTML-Design | Moodle-Test, Aufgabe, Forum, Buch, Lektion, Glossar, Wiki, Abstimmung |
| H5P: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Fill in the Blanks, Dialog Cards, Course Presentation; Bausteine Text, Bild, Multiple Choice, True/False, Drag the Words, Mark the Words, Summary, Single Choice Set | Weitere H5P-Typen (Interactive Video, Image Hotspots, Memory …) |
| Feedback-Umfragen, Links/Videos (eingebettet), Badges, Kursbild, Abschlussverfolgung | Gruppen, Termine, Kursabschluss-Kriterien, Audio/Video als Datei |
| Zugriffsbeschränkung „sichtbar ab Datum“; Nachlieferung per Delta-Sicherung | Andere Zugriffsbedingungen (Abschluss von X, Bewertung, Gruppe) |

Jede Erweiterung passiert einmal im Generator und gilt danach für alle Kurse.

## Repository-Struktur

```
SKILL.md       Einstieg für den KI-Agenten: Ablauf, harte Regeln, Grenzen
references/    spec.md (Sicherungsformat, Plattformwerte, H5P-Strukturen),
               h5p-vorlagen.md (json_content aller Typen, deutsche UI-Texte),
               skelette.md (XML-Skelette), intake.md (Fragerunden, Drehbuch, Steckbrief)
scripts/       Generator (gen/), build.py, Vorlagen, site.json
examples/      netzwerk9/  – eine Einheit, 25 min: Vorbild für neue Kurse
               alltagskompetenz/ – großer Kurs mit Unterabschnitten, Badge, Delta
CHANGELOG.md   Versionen und bekannte Lücken
```

## Schnellstart

0. **Noch nie eine Sicherung importiert?** Kein Problem – der Import ist ein
   Datei-Upload: Kurs → Mehr → **Kurs wiederverwenden → Wiederherstellen**.
1. **Repo herunterladen** (ZIP oder `git clone`) und dem KI-Assistenten den
   Ordner geben. Er liest [`SKILL.md`](SKILL.md) und führt durch Intake,
   Drehbuch und Bau.
2. **Kurs beschreiben, Material anhängen, Drehbuch lesen.** Korrigieren,
   nachfragen, freigeben – gebaut wird erst danach.
3. **`.mbz` importieren**, am besten zuerst in einen Testkurs. Danach: Badge
   aktivieren (Mehr → Badges), Kursbild prüfen, Probedurchlauf als Schüler/in.
   Screenshot an die KI, falls etwas nicht passt.

Beispielkurs ohne KI bauen (Python 3.11+, PyYAML, Pillow):

```bash
python3 scripts/build.py --content examples/netzwerk9 --no-render
```

⚠️ **Plattformwerte bleiben lokal:** `scripts/site.json` enthält Platzhalter.
Eigene Werte (aus einer Test-Sicherung der eigenen Plattform) dort eintragen und
nicht committen.

## Kurs in Etappen

Zwei Wege, beide verifiziert:

- **Fertig bauen, wochenweise freigeben:** im Steckbrief steht je Lerneinheit
  ein Datum „sichtbar ab“; alles wird einmal importiert.
- **Nach und nach bauen:** je Etappe liefert die KI eine Delta-Sicherung nur
  mit den neuen Abschnitten, eingespielt über **„In diesen Kurs
  zusammenführen“**. Bestehendes und der Lernfortschritt bleiben erhalten.

Was schon im Kurs ist, lässt sich per Sicherung nicht ändern: Abschnitt
löschen, Delta neu einspielen (Fortschritt in diesem Abschnitt geht verloren).

## Status / Roadmap

- [x] Generator für Sicherungen (Moodle 5.2, mod_hvp), Import verifiziert
- [x] H5P-Render-Test und inhaltliche Gegenprüfung durch zweiten Agenten
- [x] Delta-Sicherung („Zusammenführen“) und „sichtbar ab Datum“
- [x] Intake mit Steuerungsgrad, Drehbuch-Format, Zeitcheck, Änderungsliste
- [ ] H5P direkt im Textfeld (Kern-H5P-Filter) – weniger Ladezeit pro Element
- [ ] Drehbuch-Parser: Drehbuch → `content/` automatisch statt von Hand
- [ ] Weitere Kursformate (Kachel) und Aktivitäten (Test, Aufgabe, Forum)
- [ ] Rückmeldungen aus dem Einsatz an anderen Schulen

## Mitmachen

Ausprobieren, Fragen, Fehlerberichte und Erweiterungen des Generators sind
willkommen – gern als Issue oder Pull Request. Besonders nützlich: Sicherungen
aus anderen Kurslayouts (als Test-Export ohne Teilnehmerdaten), damit der
Generator mehr Formate lernt.

## Lizenz

**Noch offen.** Ansehen, Ausprobieren und Rückmeldungen sind ausdrücklich
willkommen; Weiterverbreitung oder Einbau in eigene Projekte bitte vorher
anfragen. Eine Lizenz wird nachgereicht. Die Bilder in
`examples/netzwerk9/assets` sind Platzhalter – eigene Fotos einsetzen.

## Danksagung

- [ByCS-Lernplattform](https://www.bycs.de/) und [Moodle](https://moodle.org/) –
  das offene Sicherungsformat macht den Ansatz überhaupt erst möglich
- [H5P](https://h5p.org/) und das Plugin [mod_hvp](https://github.com/h5p/moodle-mod_hvp) –
  interaktive Inhalte als reines JSON
- [h5p-standalone](https://github.com/tunapanda/h5p-standalone) – Render-Test
  der H5P-Inhalte außerhalb der Plattform
- [Claude Code](https://claude.com/claude-code) (Anthropic) – KI-Assistent, mit
  dem Generator, Spezifikation, Beispielkurse und Dokumentation entwickelt wurden

## Haftungsausschluss

Tech-Demo ohne Verbindung zum Betreiber der Lernplattform. Sicherungen vor dem
Einsatz immer in einem Testkurs importieren und prüfen; für Inhalte, die die
KI ergänzt hat, gilt das Drehbuch als Kontrollinstanz – fachliche
Verantwortung bleibt bei der Lehrkraft.

---

**Für den KI-Agenten:** [`SKILL.md`](SKILL.md) laden; Referenzen in
`references/`, Generator in `scripts/`, Beispielkurse in `examples/`.
