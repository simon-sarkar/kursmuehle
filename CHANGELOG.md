# Changelog

## 0.7 – 2026-10-23 (AP6: Kursformate; Glossareinträge beim Import)

- Glossar-Fehler aus Import-Test 2 (0.6): Moodle stellt Glossareinträge nur mit Nutzerdaten wieder her
  (`restore_glossary_stepslib.php`, `if ($userinfo)`), die Sicherung hatte `users=0`. Beide Wege gebaut:
  (A) `moodle_backup.xml` mit `users=1`, `userinfo=1` nur für Glossare mit Einträgen, ihren Abschnitt und bei
  Unterabschnitten die Kette darüber (sonst sperrt Moodle das Modul-Setting), alle anderen Module `userinfo=0`, leere
  `users.xml`, Einträge `userid 0`. Gegen den Moodle-Quellcode (5.0) geprüft: die Vorprüfung lädt `users.xml` nur bei
  `users=1` und findet keine Nutzer; fehlt der Lehrkraft `moodle/restore:userinfo`, setzt `restore_check` das Setting
  auf 0 statt abzubrechen, dann fehlen die Einträge und (Abhängigkeit `users → badges`) auch die Badges.
  (B) `gen/mbz.py glossary_import_xml()`: je Glossar eine Moodle-Glossar-XML (`GLOSSARY/INFO/ENTRIES/ENTRY`, Aliasse)
  neben der `.mbz` (`<kurs>_glossar.xml`) für Glossar → Mehr → Einträge importieren; `build.py` nennt den Weg.
  `build.py --ohne-nutzerdaten` baut (A) ab. `check.py` prüft `users`/`userinfo` (users.xml vorhanden, Kette
  Abschnitt → Unterabschnitt-Modul) und warnt (`WARNUNG`, Exit 0) bei Einträgen mit `userinfo=0` sowie bei `users=1` mit Badges.
- AP6 Kursformate: Steckbrief `kurs.format` themen, kacheln, wochen, einthemen, komprimiert, einzelaktivitaet (oder
  Moodle-Name; `build.py --format` überschreibt). `course.xml` bekommt `<format>` und die `courseformatoptions` je Format
  mit den Plattformstandards aus `references/formate.md` (`kurs.formatoptionen` überschreibt einzelne Werte),
  `moodle_backup.xml` das passende `original_course_format`. Kacheln: `basecolour` = nächste Plattformfarbe zur
  Akzentfarbe, `courseshowtileprogress 1`; je Abschnitt `kachelbild:` (PNG aus `assets/`, Datei `format_tiles/tilephoto/`
  im Kurskontext, `plugin_format_tiles_section` + `course_format_options` nach `export-schemata/kachelformat/`,
  fileref in der inforef des Abschnitts) und `kachelicon:` (FontAwesome-Name, nur `course_format_options`); auch im
  Steckbrief unter `teile.<teil>`. Wochen zählen ab `kurs.start`. Einzelaktivität: genau ein Element, landet in
  Abschnitt 0, `activitytype` = sein Modul; mehr Elemente brechen den Bau ab. Der 0.4-Hinweis „Format vorgemerkt“ entfällt.
- `check.py`: Kursformat bekannt, Formatoptionen mit passendem Format, Kacheloptionen nur im Kachelformat und nur an
  regulären Abschnitten, Kachelbild als Datei mit Kurs-Kontext/itemid/filepath und fileref aus der Abschnitts-inforef,
  Einzelaktivität (eine Aktivität in Abschnitt 0, activitytype); Abschnitts-inforefs werden jetzt mitgeprüft.
  `check_mbz()` gibt zusätzlich die Warnungen zurück.
- Beispiele: `alltagskompetenz` im Kachelformat mit Kachelbild je Themenfeld, `netzwerk9` mit `kachelbild:` (wirkt nur
  bei `--format kacheln`). Tests: `test_check.py` baut netzwerk9 in jedem Format, `module` mit und ohne Nutzerdaten
  (Warnung erwartet), prüft den Abbruch der Einzelaktivität und fünf neue Fehlerfälle (Formatoption mit fremdem Format,
  Kachelbild ohne Datei, Kacheloption im Themenformat, users.xml fehlt, Glossar-userinfo ohne Abschnitts-userinfo);
  `test_kursdatei.py` zwei neue Fehlerfälle (Kachelbild fehlt, Icon-Name).
- Doku: `formate.md` (Umsetzung, Import-Regeln: `course.xml` nur mit „Kurseinstellungen überschreiben: Ja“,
  Abschnittsoptionen nur bei gleichem Format), `spec.md` §A/§B.1/§D/§E/§G/§H/§N, `kursdatei.md` §1/§2/§7/§8,
  `intake.md` §2/§6/§7, SKILL.md (Bau, Lieferung, Grenzen), README (Tabelle, Status, Nach dem Import).
- Offen: Import-Test durch den Autor für Kacheln (Kachelbild, Icon, `basecolour`), Wochen, Ein-Themen, Komprimiert,
  Einzelaktivität sowie Weg (A) beim Glossar (ob die Plattform Lehrkräften `moodle/restore:userinfo` gibt). Das Kachel-Icon
  ist nur aus dem Mechanismus abgeleitet (kein Export mit Icon); die Plugin-Quelle von `format_tiles` war nicht
  erreichbar. Lernlandkarte und Mimo nach 1.0.

## 0.6 – 2026-10-23 (AP5: Moodle-Module Test, Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar)

- Acht Generator-Klassen in `scripts/gen/mbz.py` nach den Schemata in `references/export-schemata/aktivitaeten/`:
  `Quiz` (Test, mit Fragensammlung in `questions.xml`: Kategorien `top` und „Standard für <Test>“ im Modulkontext,
  `question_bank_entry`/`question_versions`/`question`, Fragetypen Multiple Choice, Wahr/Falsch, Kurzantwort; Verweise
  per `question_reference` in `quiz.xml`, `question_categoryref` in `inforef.xml`, Bewertungsposten), `Assign` (Aufgabe
  mit Text- und/oder Dateiabgabe, Bewertung, Fälligkeit), `Resource` (Datei), `Folder` (Verzeichnis), `Forum`, `Book`
  (Buch mit Kapiteln und Unterkapiteln, Bilder je Kapitel), `Choice` (Abstimmung), `Glossary` (Glossar mit Einträgen und
  Aliassen). Dateien beliebigen Typs (PDF, Office, Audio) mit Mimetype nach Endung; neue Abschlussarten `post` (Forum)
  und `entry` (Glossar).
- Kursdatei-Syntax für jeden Typ (`references/kursdatei.md` §2, §3, §5a, §6a): `Test` mit nummerierten Fragen (MC, RF,
  `Kurzantwort: Frage? · Antwort · Alternative`), `Aufgabe` (`abgabe`, `bewertung`, `bestehen`, `fällig`), `Datei`
  (`datei:`), `Verzeichnis` (Liste), `Forum` (`typ`), `Buch` (`Kapitel:`/`Unterkapitel:`), `Abstimmung` (Liste,
  `mehrfach`, `ergebnisse`), `Glossar` (Tabelle oder `- Begriff → Erklärung`). Abschlussarten je Typ geprüft
  (`beitrag`, `eintrag`, `abgabe`, `bestehen`). Hinweise Quiz vs. Test und Lesebuch vs. Buch in `kursdatei.md`.
- `scripts/check.py` prüft die neuen Module: Dateibereiche (`mod_resource/content` genau eine Datei, `mod_folder/content`,
  `mod_book/chapter` je Kapitel mit `@@PLUGINFILE@@`-Abgleich, `intro` für alle), Test (Fragenverweise gegen
  `questions.xml`, Kategorie im Modulkontext des Tests und in `question_categoryref`, Slots fortlaufend, `sumgrades`,
  Bewertungsposten passend zu `grade`, `gradepass` bei Abschluss „bestehen“, Fragetypen mit Antworten), Aufgabe
  (Bewertungsposten), Abstimmung (mindestens zwei Optionen), Glossar (`approved`/`teacherentry`), verwaiste Kategorien.
- Beispielkurs `examples/module/` (Sichere Passwörter, ein Abschnitt mit allen acht Modulen; PDFs und Bild selbst erzeugt
  mit `make_assets.py`). Tests: `test_kursdatei.py` (15 neue Fehlerfälle, Parsing aller Typen), `test_check.py`
  (Modulbeispiel plus sechs absichtliche Fehler: Fragenverweis ins Leere, Kategorie in fremdem Kontext, `sumgrades`,
  Kapitelbild, Datei ohne Inhalt, Bewertungsposten).
- Doku: `spec.md` §B.1, §G (acht Module), §G.2 (Fragensammlung), §H (Dateibereiche), `intake.md` §5, `SKILL.md`
  (Modulwahl, Grenzen, Beispiele), README-Tabelle.
- Offen: Import-Test des Modulbeispiels auf der Plattform durch den Autor. `questions.xml` ist aus dem Backup-Code von
  Moodle 4.x/5.x abgeleitet (der exportierte Testkurs enthielt keine Fragen); Glossar-Einträge ohne Nutzerdaten
  (`teacherentry 1`, `userid 0`) und Buchkapitel sind ebenfalls noch nicht per Import belegt. Im Test nur drei Fragetypen,
  keine Zeitlimits; Forum ohne Diskussionen; Verzeichnis ohne Unterordner.

## 0.5 – 2026-10-23 (AP4: Designvorlagen, Textbausteine, Render-Test)

- Drei Designvorlagen als Token-Sätze in `scripts/gen/html.py` (`VORLAGEN`: Farben, Rundung, Abstände, Kartenform,
  Schriftgrößen): `schlicht` (Standard: weiße Karten, Haarlinien), `kacheln` (getönte Flächen in der Akzentfarbe, stärkere
  Rundung), `magazin` (keine Rundung, Linien statt Flächen, mehr Weißraum, Merkkasten als Rahmen). Wahl im Steckbrief
  `design.vorlage`, Entwickler: `build.py --vorlage`. Alle Bausteine lesen die Tokens beim Aufruf; die Kursdatei enthält
  keine Gestaltungsangaben, Emojis bleiben aus.
- Textbausteine für Lesetexte: `Überschrift:`, `Hervorhebung:`, `Schritte:` (Nummern im Kreis), Vergleichstabelle mit
  Kopfzeile (`|---|---|`, beliebig viele Spalten), `Bild: datei | Alt | Unterschrift`, Inline `==markiert==`. Fehler bei
  Tabellen mit ungleichen Spalten oder mehr als zwei Spalten ohne Kopfzeile. Regel in `intake.md` §5: Baustein je Textsorte,
  kein Absatz länger als fünf Zeilen auf dem Handy.
- Überblickskarte ohne Titel und Untertitel, wenn der Kurs ein Banner hat (Import-Test 1: Banner und Karte zeigten beides
  doppelt); sie trägt dann nur Dauer und Phasen.
- Render-Test `scripts/tests/render_vorlagen.py`: Kursseite von `examples/netzwerk9` und eine Bausteinseite je Vorlage bei
  390 und 1200 px als PNG (Playwright, Theme-Rahmen um `<td>` nachgebildet); Ergebnis in `examples/netzwerk9/out/`, nicht
  committet. Regressionstest um Bausteine, Banner-Karte und Vorlagen ergänzt.
- Doku: `kursdatei.md` §4/§7, `intake.md` §2/§5/§6, SKILL.md (Gestaltungsregel), spec.md §K, README (Tabelle, Status).
- Offen: Abschnitts- und Kachelbilder (AP6); Rendertest nur mit nachgebildetem Theme, Abnahme der Vorlagen auf der Plattform
  durch den Autor; Lesebuch-Bilder weiter ohne Unterschrift (H5P.Image kennt keine).

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

## 0.3 – 2026-10-23 (AP2: Prüfskript, site.json entfernt)

- `scripts/check.py <datei.mbz>` prüft eine Sicherung vor dem Import: Archiv (tar.gz, `.ARCHIVE_INDEX`), Pflichtdateien,
  alle XML wohlgeformt, `moodle_backup.xml` gegen die Ordner und Settings, Abschnittsnummern fortlaufend und IDs eindeutig
  (cmid, contextid, Instanz, Datei, Bewertungsposten), `sequence`/`sectionid`/Unterabschnitte konsistent, jede
  `files.xml`-Zeile mit Datei unter `files/xx/<sha1>` (Hash und Größe), jede Datei von einer `inforef.xml` referenziert
  und in ihrem Inhalt verwendet (`@@PLUGINFILE@@` in Textfeld/Seite, `images/` in `json_content`), `inforef`-Verweise auf
  Dateien und Bewertungsposten, H5P-Bibliotheksversionen aus `gen/libs.py` (Hauptbibliothek und alle Unterinhalte),
  `json_content` gültig, `subContentId` eindeutig, Badges (Bild, Kriterien), Verfügbarkeits-JSON.
  Ausgabe `OK …` oder Zeilen `FEHLER <wo>: <was>`, Exit-Code 1. `build.py` ruft die Prüfung nach jedem Bau auf
  (`--no-check` schaltet sie ab); eine fehlerhafte Sicherung bleibt zur Fehlersuche liegen, der Bau endet mit Exit 1.
- `scripts/site.json` entfernt. Die Herkunftsangaben der Sicherung (Site-Hash, Kurs-ID, Kontext, Kategorie, Zusatzfelder)
  sind feste Platzhalter in `gen/mbz.py`; beim Import in einen bestehenden Kurs sind sie ohne Bedeutung (belegt 2026-10-23).
  Die erzeugten Sicherungen sind mit dem 0.2-Build inhaltsgleich (`mbz_diff.py`).
- `scripts/tests/test_check.py`: vier Builds (netzwerk9 Vollkurs und Prototyp, alltagskompetenz Vollkurs und Delta) melden
  OK; zehn absichtlich eingebaute Fehler werden gefunden (fehlende Datei, falscher Hash, kaputtes `json_content`, falsche
  Bibliotheksversion, fehlender Aktivitätsordner, Bild ohne `files.xml`-Zeile, fehlender `fileref`, ungültiges
  Verfügbarkeits-JSON, doppelte Abschnittsnummer, nicht wohlgeformtes XML) sowie eine Datei, die kein Archiv ist.
- Doku: SKILL.md (Prüfung vor Lieferung, Dateien), spec.md §B.1/§M/§N, README, intake.md §7, ROADMAP ohne `site.json`.
- Offen: `check.py` kennt nur die Dateibereiche der bisherigen Module (intro, page/content, hvp/content, Kursbild, Badge);
  neue Modultypen (AP5) brauchen dort einen Eintrag. Geprüft wird die Struktur, nicht der Inhalt (Drehbuch-Prüfung bleibt
  der zweite Lauf). Import-Test einer aus `kurs.md` gebauten Sicherung auf der Plattform steht weiterhin aus.

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
