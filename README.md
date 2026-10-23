![Kursmühle – Lernplattform-Kurse aus einem Prompt](docs/banner-kursmuehle-v8.svg)

# Kursmühle – Lernplattform-Kurse aus einem Prompt

![Version 1.0](docs/badge-version.svg) ![Status: Release](docs/badge-status.svg) ![Lizenz: nicht kommerziell](docs/badge-lizenz.svg) ![Plattform: ByCS-Lernplattform, Moodle 5.2](docs/badge-plattform.svg)

**Version 1.0** (Stand 23.10.2026) · [Projektseite](https://simon-sarkar.github.io/kursmuehle/) ·
[Skill-Zip herunterladen](https://github.com/simon-sarkar/kursmuehle/releases/latest/download/kursmuehle.zip) ·
[`ROADMAP.md`](ROADMAP.md) · [`CHANGELOG.md`](CHANGELOG.md)

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

## Drei Wege

- **Lehrkräfte mit ByLKI oder AIS-Chat:** Diese Angebote führen keinen Code aus. Für sie kommt mit Version 2.0 eine
  Fassung im Browser, die aus dem Drehbuch die Sicherung baut (`ROADMAP.md`). Bis dahin: Drehbuch dort schreiben lassen und
  den Bau in einem der beiden anderen Wege erledigen.
- **Lehrkräfte mit ChatGPT oder Claude:** das [Skill-Zip](https://github.com/simon-sarkar/kursmuehle/releases/latest/download/kursmuehle.zip)
  herunterladen und dem Assistenten geben.
  - ChatGPT: ZIP hochladen und schreiben: „Entpacke das und lies SKILL.md.“ Dahinter den Kurswunsch in einem Satz.
    Code-Ausführung muss eingeschaltet sein.
  - Claude: ZIP hochladen und denselben Satz schreiben, oder das ZIP in den Einstellungen als Skill anlegen; dann genügt
    der Kurswunsch. Code-Ausführung muss eingeschaltet sein.
  - Danach: Drehbuch lesen, „passt“ sagen, `.mbz` herunterladen, wiederherstellen (Anleitung unten).
- **Nutzer mit einem Agenten wie Claude Code oder Codex:** Repo klonen, dem Agenten `docs/fortgeschrittene.md` geben.
  Dort steht, wie eigene Kurssicherungen als Vorlage dienen, wie eigene Designvorlagen, Textbausteine und Fachregeln
  entstehen und wie das Skill-Zip neu gepackt wird: [`docs/fortgeschrittene.md`](docs/fortgeschrittene.md).

Auf dem eigenen Rechner wird nichts installiert. Die erste Frage des Assistenten lautet „Womit starten wir?“ mit fünf
Wegen (nur ein Thema, eigenes Material, Material und Fragen, Fragen ohne Material, bestehenden Kurs erweitern); danach
höchstens eine Fragerunde, jede Frage mit Vorschlag. Wer nur ein Thema nennt, bekommt keine Rückfrage, sondern das
Drehbuch mit den Annahmen oben.

> **Projektstatus: Version 1.0.**
> Der Ablauf Intake → Drehbuch → Generator → Wiederherstellen ist an drei Beispielkursen durchgespielt, mit Claude Code,
> mit ChatGPT und im Fremdtest mit einem frischen Assistenten der Sonnet-Klasse, der nur das Skill-Zip und einen Satz
> bekam. Per Import auf der Plattform verifiziert sind Themen- und Kachelformat mit Kachelbildern, Test, Buch, Delta-
> Sicherungen, Glossar-XML und der Textfeld-Modus; die übrigen Formate und Module baut der Generator nach den Schemata
> der Plattform, beim ersten Einsatz in einen Testkurs importieren. Kein offizielles Produkt der Plattform; wenn sich
> die Lernplattform ändert, wird der Skill angepasst.

## Systemübersicht

![Ablauf: Lehrkraft → KI-Assistent → Drehbuch → Generator → Lernplattform](docs/ablauf.svg)

- Die KI schreibt nur die Inhalte. Das Archiv aus über hundert verknüpften
  XML-Dateien, Hashes und IDs baut der Generator.
- Das Drehbuch enthält den gesamten Kurs als kurzen Text mit Zeitschätzung
  je Element und Quellenmarkierung (aus dem Material / von der KI ergänzt).
  Dieselbe Datei ist die Kursdatei: Der Generator liest sie direkt, nichts
  wird nach der Freigabe noch einmal abgetippt. Bevor die Lehrkraft das
  Drehbuch sieht, prüft der Assistent es gegen zehn didaktische
  Standardannahmen und eine Markerliste mit Proben (`references/intake.md` §3,
  `references/qualitaet.md`); Zweck und Quelle je Element stehen nur im Drehbuch.
- Die Sicherung ist nicht an einen Account gebunden; der Import läuft in jedem
  Kurs der Plattform ohne Vorarbeit. Vor der Lieferung prüft `scripts/check.py`
  jede Sicherung auf Struktur, Dateien, IDs und H5P-Versionen.

## Was Kursmühle kann

### Drei Darstellungswege für Übungen

- **Übung im Textfeld:** Quiz, Zuordnen, Lernkarten, Lückentext und Geschichte stehen als Block direkt zwischen den
  Lesetexten auf der Kursseite, ohne Nachladen und ohne Bewertung (`website: textfeld`).
- **Einheit als Website-Datei:** Ein Abschnitt wird eine HTML-Seite mit Startseite, Kapitelnavigation, Fortschritt und
  Übungen, eingebettet, im Vollbild oder in einem neuen Fenster (`website: ja`).
- **H5P- und Moodle-Aktivitäten für Bewertung und Abschluss:** Was eine Bestehensgrenze hat, für ein Badge zählt oder
  abgegeben wird, bleibt eine Aktivität der Plattform und erscheint im Abschlussstatus oder im Bewertungsbuch.

Vorbehalte beim Textfeld:

- **Übungs-Textfelder nicht im Editor öffnen.** Bearbeitet eine Lehrkraft ein Textfeld mit Übungsblock über
  „Einstellungen bearbeiten“ und speichert, entfernt der Editor der Plattform Skript und Stil; die Übung ist danach ein
  totes Gerüst. Änderungen laufen über das Drehbuch und ein Delta oder einen Neuimport. Ungeprüfter Ausweg: den
  Texteditor in den Nutzereinstellungen vorübergehend auf „Textbereich“ stellen, dann bearbeiten.
- Die Moodle-App führt JavaScript im Textfeld möglicherweise nicht aus; die Übung zeigt dann den Hinweis, die Kursseite
  im Browser zu öffnen.
- Große Inline-Blöcke blähen die Kursseite; jeder Block bringt etwa 10 KB Stil und Skript mit.
- Die Nutzungsbedingungen der Plattform erlauben Lehrkräften Beiträge mit JavaScript (4.1.3), und die Probe vom
  23.10.2026 zeigt, dass Skripte im Textfeld laufen (`tools/jsprobe`).

### Sechs Kursformate

| Format | Was die Lernenden sehen |
|---|---|
| Themen | Alle Abschnitte untereinander auf einer Seite. |
| Kacheln | Jeder Abschnitt ist eine Kachel mit eigenem textfreiem Kachelbild oder Icon und Fortschrittsanzeige; ein Überblick in Allgemeines entfällt, weil er die Kacheln doppelt. |
| Wochen | Die Abschnitte tragen Datumsbereiche ab dem Kursbeginn aus dem Steckbrief. |
| Ein-Themen | Die Abschnitte erscheinen als Reiter, sichtbar ist immer einer. |
| Komprimiert | Die Abschnitte lassen sich auf- und zuklappen. |
| Einzelaktivität | Der Kurs besteht aus genau einer Aktivität, etwa einem Test oder einem Forum. |

### Elementtypen

| Element | Was es ist |
|---|---|
| Banner | Bild, Titel und ein Satz als erstes Element des Kurses. |
| Textfeld | Kurzer formatierter Text direkt auf der Kursseite. |
| Seite | Längerer Lesetext mit Bildern auf einer eigenen Seite. |
| Überblick | Kopfkarte einer Einheit mit Dauer und Ablauf. |
| Link, Video | Verweis auf eine Webseite; YouTube und Vimeo werden eingebettet. |
| Lesebuch | H5P-Buch mit mehreren Seiten und eingebauten Kontrollfragen. |
| Quiz | H5P-Fragenset mit Multiple Choice, Richtig/Falsch, Einsetzen, Markieren und Lückentext. |
| Zuordnen | Elemente werden in Kategorien sortiert. |
| Lernkarten | Karten mit Vorder- und Rückseite, auf Wunsch mit Bild. |
| Geschichte | Szenen und Entscheidungen mit mehreren Enden. |
| Lückentext | Text mit Eingabelücken, Alternativen und Tipps. |
| Umfrage | Selbsteinschätzung auf einer Skala (Moodle-Feedback). |
| Badge | Abzeichen, das nach dem Abschluss festgelegter Elemente verliehen wird. |
| Unterabschnitt | Gruppe von Elementen innerhalb eines Abschnitts. |
| Test | Moodle-Test mit Fragensammlung, Versuchen und Eintrag im Bewertungsbuch. |
| Aufgabe | Abgabe als Text oder Datei mit Bewertung und Fälligkeit. |
| Datei | Eine Datei der Lehrkraft, etwa ein Arbeitsblatt als PDF. |
| Verzeichnis | Mehrere Dateien in einem Ordner. |
| Forum | Austausch oder Fragen und Antworten. |
| Buch | Moodle-Buch mit Kapiteln und Unterkapiteln für längere Lesetexte. |
| Abstimmung | Meinungsbild mit einer oder mehreren Antworten. |
| Glossar | Begriffe mit Erklärungen und Aliassen. |

### Weiteres

- **Designvorlagen:** Drei Vorlagen (schlicht, kacheln, magazin) färben alle Textbausteine ein, gewählt im Steckbrief.
- **Glossar-Import:** Die Einträge eines Glossars liegen als XML-Datei neben der Sicherung und kommen über
  *Einträge importieren* in den Kurs.
- **Delta-Sicherungen:** Neue Abschnitte kommen als eigene Sicherung per *Zusammenführen* in einen laufenden Kurs, der
  Lernfortschritt bleibt erhalten.
- **Prüfdurchlauf:** Bevor die Lehrkraft das Drehbuch sieht, prüft der Assistent es gegen die Standardannahmen D1–D10
  und eine Markerliste mit Proben und behebt die Treffer.
- **Steuerungsgrad:** Die Lehrkraft entscheidet selbst, gibt Vorschläge frei oder lässt die KI alles machen.

## Was der Generator kann – und was (noch) nicht

| Kann | Noch nicht |
|---|---|
| Kursformate Themen, Kacheln (mit Kachelbild oder Icon je Abschnitt), Wochen, Ein-Themen, Komprimierte Abschnitte, Einzelaktivität; beliebig viele Abschnitte und Unterabschnitte | Lernlandkarte, Mimo (kein Grid auf der Plattform) |
| Textfelder und Seiten mit Textbausteinen (Überschrift, Schritte, Tabellen, Kästen, Merke, Bild mit Unterschrift) in drei Designvorlagen (schlicht, kacheln, magazin), wählbar im Steckbrief | Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool |
| Moodle-Module: Test (Multiple Choice, Wahr/Falsch, Kurzantwort; Fragen in der Fragensammlung), Aufgabe (Text- und Dateiabgabe), Datei, Verzeichnis, Forum, Buch mit Kapiteln, Abstimmung, Glossar | Weitere Fragetypen im Test (Zuordnung, Lückentext, numerisch), Zeitlimits, Forum-Diskussionen |
| H5P: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Fill in the Blanks, Dialog Cards, Course Presentation; Bausteine Text, Bild, Multiple Choice, True/False, Drag the Words, Mark the Words, Summary, Single Choice Set | Weitere H5P-Typen (Interactive Video, Image Hotspots, Memory …) |
| Feedback-Umfragen, Links/Videos (eingebettet), Badges, Kursbild, Abschlussverfolgung | Gruppen, Termine, Kursabschluss-Kriterien |
| Kursbanner als erstes Element (Bild, Titel, ein Satz); Bild von der KI erzeugt, gerendert (`scripts/banner.py`) oder von der Lehrkraft nach Prompt; Kursbild und Kachelbilder textfrei (`banner.py --kachel`: eigenes Motiv je Abschnitt) | Abschnitts- und Kachelbilder automatisch aus dem Material |
| Website-Modus: ein Abschnitt als eine HTML-Seite (eingebettet, Vollbild oder neues Fenster) mit Startseite, Kapitelnavigation, Fortschritt und Übungen mit Rückmeldung (Quiz, Zuordnen, Lückentext, Markieren, Lernkarten, Geschichte); dieselbe Kursdatei, `build.py --website` | Bewertung und Abschluss je Übung in der Website, eigene Spiele und Simulationen als Vorlage |
| Textfeld-Modus: formative Übungen (Quiz, Zuordnen, Lernkarten, Lückentext, Geschichte) als Block im Textfeld zwischen Lesetexten, ohne iframe, mehrere Blöcke je Kursseite; Abschlussrelevantes bleibt Aktivität; `website: textfeld` | Ausführung in der Moodle-App, Import-Test von Probe 3 |
| Zugriffsbeschränkung „sichtbar ab Datum“; Nachlieferung per Delta-Sicherung | Andere Zugriffsbedingungen (Abschluss von X, Bewertung, Gruppe) |
| Prüfdurchlauf vor der Freigabe: Standardannahmen D1–D10, Markerliste mit Proben, Fachprüfung gegen das Bezugselement; Drehbuch-Zeilen `Abweichung:` und `Offen:` und der Marker `[Zweck: …]` gelangen nie in den Kurs | Automatische Warnung des Parsers bei mechanisch erkennbaren Markern (Ausrufezeichen, Emojis, Genderzeichen) |

## Wiederherstellen auf der ByCS-Lernplattform

So sieht der Import auf der Plattform aus, Schritt für Schritt. Beim ersten Mal in einen Testkurs.

1. **Kurs öffnen → Mehr → Kurs wiederherstellen.** Die `.mbz` in das Feld „Datei“ ziehen oder hochladen, dann
   *Wiederherstellen*.
2. **Schritt „Bestätigen“:** nur *Weiter*.
3. **Schritt „Ziel“:** eine von drei Varianten.
   - *Als neuen Kurs wiederherstellen* in eine Kategorie: der Kurs entsteht neu.
   - *In diesen Kurs wiederherstellen* mit **löschen und dann wiederherstellen**: der Zielkurs wird geleert und neu
     gefüllt. Nur so kommt ein anderes Kursformat (etwa Kacheln) mit.
   - *In diesen Kurs wiederherstellen* mit **zusammenführen**: für Delta-Sicherungen, die neue Abschnitte hinten anhängen.
4. **Schritt „Einstellungen“:** *Weiter*.
5. **Schritt „Schema“:** bei einem Formatwechsel *Kurseinstellungen überschreiben: Ja*, sonst behält der Kurs sein
   bisheriges Kursformat. *Weiter*.
6. **Wiederherstellen.**
7. **Danach:** Hat der Kurs ein Glossar mit Einträgen: Glossar → Mehr → *Einträge importieren* → die mitgelieferte Datei
   `…_glossar.xml`. Badge aktivieren (Mehr → Badges). Kursbild prüfen. Probedurchlauf als Schüler/in.

Eine Sicherung darf höchstens 500 MB haben; `scripts/check.py` warnt ab 400 MB. Wenn etwas nicht passt, reicht ein
Screenshot an den Assistenten; er ändert die Inhalte und baut die Sicherung neu. Übungs-Textfelder nie im Editor der
Plattform speichern (siehe oben).

## Repository-Struktur

```
SKILL.md       Einstieg für den KI-Agenten: Ablauf, Wiederherstellungsanleitung, harte Regeln, Grenzen
references/    spec.md (Sicherungsformat, Plattformwerte, H5P-Strukturen),
               kursdatei.md (Format der Kursdatei kurs.md), formate.md (Kursformate),
               h5p-vorlagen.md (json_content aller Typen, deutsche UI-Texte),
               skelette.md (XML-Skelette), intake.md (Fragerunden, Darstellungsweg,
               Standardannahmen D1–D10, Drehbuch, Steckbrief), qualitaet.md (Prüfdurchlauf)
scripts/       Generator (gen/), build.py, check.py (Sicherung prüfen), package.py (Skill-Zip), Vorlagen, tests/
examples/      netzwerk9/  – eine Einheit, 25 min: Vorbild für neue Kurse
               alltagskompetenz/ – großer Kurs mit Unterabschnitten, Badge, Delta
               module/ – ein Abschnitt mit Test, Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar
               (je kurs.md, assets/, steckbrief.yaml)
docs/          Projektseite (index.html), Logo und Badges, fortgeschrittene.md (Repo und Agent), erfahrungen.md,
               entwicklung/ (Arbeitspakete AP1–AP9, Protokolle der Tests)
tools/h5ptest/ Render-Test der H5P-Inhalte außerhalb der Plattform (h5p-standalone + Playwright)
tools/jsprobe/ Fünf-Minuten-Test: läuft JavaScript im Textfeld und in einer eingebetteten Website? (Ergebnis im README dort)
AGENTS.md      Arbeitsregeln für Agenten, die am Repo arbeiten (CLAUDE.md verweist darauf)
CHANGELOG.md   Versionen und bekannte Lücken
```

## Richtwerte

Aus dem Fremdtest zu 1.0 (`docs/entwicklung/protokolle/AP9_fremdtest.md`): ein frischer Assistent der Sonnet-Klasse bekam
nur das Skill-Zip und den Satz „Mach mir eine Einheit zu Bruchrechnen für Jgst 6, 45 Minuten, Selbstlernkurs.“

| Größe | Durchlauf 1 | Durchlauf 2 |
|---|---|---|
| Bis zur fertigen `.mbz` mit Protokoll | 5 min 10 s | 5 min 46 s (erste `.mbz` nach etwa 3 min) |
| Tokens gesamt (Agent-Schnittstelle) | 138 000 | 154 000 |
| Rückfragen an die Lehrkraft | 0 | 0 |
| Nachrichten an die Lehrkraft | 2 | 1 |
| Bauläufe bis `check.py` OK | 1 | 1 |

Ein kompletter Kurs mit mehreren Abschnitten und vom Assistenten erzeugten Bildern lag mit Version 0.1 in ChatGPT bei etwa
sieben Minuten. Durchläufe mit kostenlosen Konten (ChatGPT Free, Claude Free) und mit ByLKI stehen aus; die
Protokollvorlagen dafür liegen in `docs/entwicklung/protokolle/`, das Ergebnis kommt als Zeile „läuft mit …“ hierher.


## Ohne KI bauen (für Entwickler)

Beispielkurs direkt aus dem Generator (Python 3.11+, PyYAML, Pillow):

```bash
python3 scripts/build.py --content examples/netzwerk9
```

Der Kursinhalt steht in `examples/netzwerk9/kurs.md` (Format: `references/kursdatei.md`);
die Bilder in `examples/netzwerk9/assets` sind Platzhalter. `build.py` prüft die fertige Sicherung am Ende
mit `scripts/check.py` (auch einzeln: `python3 scripts/check.py <datei.mbz>`, Ausgabe `OK` oder `FEHLER`-Zeilen).
`python3 scripts/tests/test_kursdatei.py` prüft Parser und Beispiele, `scripts/tests/test_check.py` das Prüfskript,
`scripts/tests/mbz_diff.py` vergleicht zwei Sicherungen ohne IDs und Zeitstempel, `scripts/tests/render_vorlagen.py`
rendert die Kursseite je Designvorlage bei 390 und 1200 px (Playwright; `--vorlage` an `build.py` wählt die Vorlage),
`scripts/tests/test_website.py` baut netzwerk9 und alltagskompetenz als Website und im Textfeld-Modus und klickt
Navigation, Übungen und mehrere Blöcke auf einer Seite bei 390 und 1280 px durch.

Website-Variante des Beispiels (eine HTML-Seite statt zehn Aktivitäten; Vorschau `…_website.html` neben der `.mbz`):

```bash
python3 scripts/build.py --content examples/netzwerk9 --website
```

Übungen als Blöcke im Textfeld (Vorschau aller Blöcke `…_textfeld.html` neben der `.mbz`):

```bash
python3 scripts/build.py --content examples/netzwerk9 --website textfeld
```

![Website-Modus: netzwerk9 am Desktop und auf dem Handy](docs/website-netzwerk9.png)

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
- [x] Prüfskript `check.py`: jede Sicherung wird vor dem Import auf Struktur, Dateien und H5P-Versionen geprüft
- [x] Menüführung: „Womit starten wir?“ – Thema, altes Material, Material + Fragen, Fragen-Intake
- [x] Schlanke Designvorlagen zur Auswahl; Kursbanner, generiert vom Assistenten, wenn er es kann
- [x] HTML-Formatierung für Lesetexte: Überschriften, Listen, Merk- und Beispielkästen statt Fließtext
- [x] Modultypen für 1.0: Test, Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar (Test und Buch importiert)
- [x] Kursformate Kacheln (Kachelbild/-icon je Abschnitt, importiert), Wochen, Ein-Themen, Komprimiert, Einzelaktivität
- [x] One-Page-Darstellung ohne Ladezeiten: Übungen im Textfeld (seit 0.9.1, importiert), Einheit als Website-Datei (seit 0.8)
- [x] Fremdtest mit frischem Assistenten der Sonnet-Klasse, Skill-Zip, Projektseite (1.0)
- [ ] 1.1: Steckbrief und Designvorlage aus einer eigenen Sicherung ableiten (`vorlage_aus_sicherung.py`), Übungsblöcke, die
      ohne Skript als Tabelle oder Fragenliste lesbar bleiben, Website als SCORM-Paket für Bewertung und Abschluss
- [ ] Abschnitts- und Kachelbilder aus dem Material; eigene Spiele und Simulationen als Vorlagen im Website-Modus
- [ ] 2.0: Kursmühle im Browser, damit auch ByLKI, AIS-Chat und kostenlose Konten ohne Code-Ausführung bauen können

Reihenfolge und Details in [`ROADMAP.md`](ROADMAP.md).

## Rückmeldung geben

Ohne GitHub-Konto: über das Formular auf der [Projektseite](https://simon-sarkar.github.io/kursmuehle/#rueckmeldung)
(der Link dort wird vom Autor eingetragen). Mit GitHub-Konto: als Issue. Was am meisten hilft: welches Fach, welche
Jahrgangsstufe, welcher Assistent, wie lange es gedauert hat, wo es gehakt hat. Gesammelte Rückmeldungen und gebaute Kurse
stehen in [`docs/erfahrungen.md`](docs/erfahrungen.md).

## Mitmachen

Fehlerberichte und Erweiterungen als Issue oder Pull Request; eigene Vorlagen, Bausteine und Fachregeln beschreibt
[`docs/fortgeschrittene.md`](docs/fortgeschrittene.md). Am meisten hilft
ein Hinweis, welches Kursformat oder welche Aktivität fehlt; Kurssicherungen
selbst gehören nicht ins Repo (die Nutzungsbedingungen der Plattform untersagen
die Weitergabe von Dateien an Dritte) – veröffentlicht werden nur die daraus
abgeleiteten Schemata mit Platzhaltern. Beispielkurse in `examples/` enthalten
nur eigene Texte und selbst erzeugte oder CC0-Bilder: keine Schulbuchseiten,
fremden Fotos oder Logos, keine Namen echter Personen oder Schulen.

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
