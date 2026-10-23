# Changelog

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
