# Arbeitsregeln für dieses Repo

Du arbeitest am Skill „Kursmühle“ (`kursmuehle`) (Kurssicherungen für die ByCS-Lernplattform generieren). Lies zuerst
`ROADMAP.md` (Leitlinie, Kriterien, Umfang 1.0) und das Arbeitspaket, das dir genannt wird (`docs/entwicklung/APn.md`).
Dann `SKILL.md` und `references/spec.md`. Diese Datei gilt für jeden Agenten; `CLAUDE.md` verweist nur hierher.

Regeln:
- **Keine personenbezogenen Daten im Repo**: keine Namen (außer Lizenzinhaber), keine Schule, keine Kurs-, Kontext-
  oder Kategorie-IDs einer echten Plattform, keine Mailadressen (Ausnahme: die Projektadresse kursmuehle@pm.me), keine Kurssicherungen von der Plattform. Platzhalter
  statt echter Werte. Bilder in Beispielen nur selbst erzeugt oder CC0.
- **Plattformname**: „ByCS-Lernplattform“, nie „mebis“ (außer im Satz „früher mebis“).
- **Sprache**: Deutsch in Doku und Beispielen; Code-Kommentare kurz, Deutsch oder Englisch.
- **Kein Slop**: keine Werbesprache, keine Dreierreihen um der Rhythmik willen, keine Doppelpunkt-Fanfaren, keine
  Emojis in Doku, keine Zweck- oder Quellenzeilen im Kursinhalt (die gehören ins Drehbuch). Was nicht belegbar ist,
  wird nicht behauptet. Markerliste: `references/qualitaet.md`; sie gilt auch für README und Projektseite.
- **Tokensparend**: Der Generator baut das Archiv, die KI schreibt Inhalte. Jede Änderung wird daran gemessen, ob sie
  den Dialog mit der Lehrkraft einfacher macht und die Tokenkosten senkt.
  Konkret: Der Assistent liest im Einsatz `SKILL.md`, das Kursdatei-Format (`references/kursdatei.md`),
  `references/intake.md` und `references/qualitaet.md`, sonst nichts; `references/export-schemata/`, `formate.md` und
  `spec.md` sind Entwicklerdoku und werden vom Generator abgebildet, nicht vom Assistenten gelesen.
  Modul- und Formatlisten für den Assistenten: eine Tabelle, ein Satz je Eintrag. Der Skill muss mit einem günstigen
  Modell (Sonnet-Klasse) laufen, im Ziel auch mit der kostenlosen Stufe eines Assistenten innerhalb ihres Tageslimits;
  was nur mit dem teuersten Modell klappt, ist nicht fertig.
- **Tests**: `python3 scripts/build.py --content examples/netzwerk9 --no-render` muss nach jeder Änderung laufen.
  Vor einem PR zusätzlich `scripts/tests/test_kursdatei.py`, `test_check.py`, `test_website.py` (Playwright, Chromium
  über `CHROMIUM_PATH`), alle drei Beispiele bauen, Release-Zip (`scripts/package.py`) entpacken und daraus netzwerk9 bauen.
  Neue Modultypen bekommen einen Eintrag in `examples/` und in der Kann/Noch-nicht-Tabelle der README.
- **Lizenz**: PolyForm Noncommercial (Code), CC BY-NC-SA 4.0 (Texte). Nichts einbauen, was damit unvereinbar ist.
- **Abschluss eines Pakets**: Versionsnummer erhöhen (bis 1.0 um 0.1 je Paket, danach nach CHANGELOG), CHANGELOG.md
  mit dieser Version ergänzen, README-Tabelle aktualisieren, `docs/badge-version.svg` mit `python3 docs/make_logo.py`
  neu erzeugen, PR gegen `main` mit kurzer Beschreibung (was, wie getestet, was offen).
- **Release**: `python3 scripts/package.py` erzeugt `dist/kursmuehle.zip` für Lehrkräfte (ohne `docs/entwicklung/`,
  `references/export-schemata/`, `tools/`, Arbeitsregeln). Der Dateiname bleibt bei jedem Release gleich, damit die
  Adresse `releases/latest/download/kursmuehle.zip` auf der Projektseite stabil ist.
- **Name**: Das Projekt heißt „Kursmühle“ (Repo und Skill-Name `kursmuehle`). Logo und Banner liegen in `docs/`.
