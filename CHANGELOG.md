# Changelog

## 0.4 – 2026-10-23 (AP3: Menüführung, Formatfrage, Selbstabfrage, Kursbanner)

- Einstieg neu: erste Nachricht „Womit starten wir?“ mit fünf Wegen (nur Thema, Material, Material + Fragen, Fragen,
  bestehenden Kurs erweitern), Steuerungsgrad mit Vorschlag aus dem Weg, Rahmen in einem Satz. Danach höchstens eine
  Fragerunde; jede Frage hat einen Vorschlag, bei „nur Thema“ gibt es keine Rückfrage (`Angenommen:`-Zeilen im Drehbuch).
  `references/intake.md` §0–§4 neu geschrieben, Steckbrief um `weg`, `format`, `assistent`, `bilder`, `angenommen` ergänzt.
- Formatfrage früh und ausdrücklich, mit Empfehlung je Kurstyp (Selbstlernkurs → Kacheln, Wochenplan → Wochen,
  Materialsammlung → Themen, einzelner Test oder Forum → Einzelaktivität); die Lehrkraft entscheidet. Bis AP6 baut der
  Generator Themen und meldet ein vorgemerktes anderes Format als Hinweis (Umstellung in den Kurseinstellungen).
- Selbstabfrage des Assistenten am Anfang von `SKILL.md` (Code ausführen, Dateien lesen, Bilder erzeugen) mit Folgen je Antwort.
- Kursbanner: neues Element `### Banner:` (Bild + Titel + ein Satz, Bild optional) als erstes Element in `## Allgemeines`,
  Baustein `banner()` in `scripts/gen/html.py`. Bilder nach `intake.md` §4: selbst erzeugt, mit `scripts/banner.py`
  gerendert (textfrei, Akzentfarbe, Playwright; `CHROMIUM_PATH` für ein vorhandenes Chromium) oder per `Bildwunsch:`-Zeile
  von der Lehrkraft. `examples/netzwerk9` hat ein Banner.
- Offen: Abnahme „nur Thema → Drehbuch ohne Rückfrage“ mit einem Fremdmodell (AP9); Kachelformat und Abschnittsbilder (AP6);
  README-Versionszeile wird mit AP2 zusammengeführt.

## 0.2.1 – 2026-10-23

- Umbenennung in „Kursmühle“ (Repo `kursmuehle`, Skill-Name `kursmuehle`); Logo, Wortmarke und Banner in `docs/`;
  Versionsnummer oben in der README.

## 0.1 – 2026-10-23

Erste Fassung (Tech-Demo).

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

## 0.2 – 2026-10-23 (AP1: Kursdatei statt Python)

- Das Drehbuch ist die Kursdatei: `kurs.md` im Kursordner wird von `scripts/build.py` direkt gelesen
  (`scripts/gen/kursdatei.py`). Fremde Assistenten schreiben keinen Python-Code mehr. Format: `references/kursdatei.md`
  (vollständig), `references/intake.md` §5 (eine Seite). Quellen-, Zeit- und Bezugsmarker (`[Quelle: …]`, `[KI]`,
  `(← S2)`, `· 4 min`) ignoriert der Parser; sie landen nie im Kurs.
- Elementtypen in der Kursdatei: Textfeld, Seite, Überblick, Link/Video, Lesebuch (mit MC, RF, Einsetzen, Markieren,
  Lückentext, Aussagen, Schnellquiz, Bild), Quiz, Zuordnen, Lernkarten, Geschichte, Lückentext, Umfrage, Badge,
  Unterabschnitt; `sichtbar ab`, `teil` (Delta), `prototyp: nein` (`--proto`), Bilder per Dateiname aus `assets/`.
- Fehlermeldungen nennen Datei, Zeile und Element; unbekannte Typen, Angaben, Bilder, Zonen und Sprungziele brechen ab.
- HTML-Bausteine aus den Beispielen (`common.py`, `cards.py`) liegen jetzt im Generator (`scripts/gen/html.py`);
  Kursordner brauchen nur noch `kurs.md`, `assets/`, `steckbrief.yaml`. Python-Inhalt (`content/course.py`) bleibt als Ausweg.
- Beide Beispielkurse auf `kurs.md` umgestellt. Abnahme: Vollkurs, Prototyp und Delta beider Kurse sind mit dem bisherigen
  Build inhaltsgleich (`scripts/tests/mbz_diff.py`, Vergleich ohne IDs/Zeitstempel/UUIDs); einzige Abweichung: Delta-Abschnitte
  von Unterabschnitten heißen jetzt wie der Unterabschnitt, ohne das hart codierte „TF 1 ·“ des alten Demo-Skripts.
- `scripts/tests/test_kursdatei.py`: Regressionstest (14 Fehlerfälle, Beispiele bauen). `build.py` rendert keine Bilder mehr
  (`--no-render` bleibt als Leerflag); Banner des Demo-Kurses: `examples/alltagskompetenz/render_assets.py`.
- Offen: Rückmeldung „nicht gewählt“ bei MC, Bilder in Szenen, Buchdeckel, Tipps (siehe `kursdatei.md` §8); Import-Test
  der aus `kurs.md` gebauten Sicherung auf der Plattform steht aus (inhaltsgleich mit dem importierten 0.1-Build).

## 0.1.1 – 2026-10-23

- Lizenz festgelegt: Code PolyForm Noncommercial 1.0.0, Texte/Vorlagen/Beispiele CC BY-NC-SA 4.0.
- README überarbeitet (Mehrwert und Nutzung am Anfang, Lektorat), ROADMAP.md mit der Definition von 1.0.
- `tools/h5ptest/`: H5P-Render-Test (extract, fetchlibs, buildpages, render) aus der Entwicklung übernommen.
- `references/formate.md` (alle acht Kursformate mit Optionen, 39 Modultypen), `references/export-schemata/` (29 Modulschemata, Kachelformat), `CLAUDE.md` und `arbeitspakete/AP1–AP9` für die Arbeit an 1.0; `site.json` als überflüssig belegt.
