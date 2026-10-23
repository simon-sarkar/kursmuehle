# Arbeitsregeln für dieses Repo

Du arbeitest am Skill „Kursmühle“ (`kursmuehle`) (Kurssicherungen für die ByCS-Lernplattform generieren). Lies zuerst
`ROADMAP.md` (Leitlinie, Kriterien, Umfang 1.0) und das Arbeitspaket, das dir genannt wird (`arbeitspakete/APn.md`).
Dann `SKILL.md` und `references/spec.md`.

Regeln:
- **Keine personenbezogenen Daten im Repo**: keine Namen (außer Lizenzinhaber), keine Schule, keine Kurs-, Kontext-
  oder Kategorie-IDs einer echten Plattform, keine Mailadressen, keine Kurssicherungen von der Plattform. Platzhalter
  statt echter Werte. Bilder in Beispielen nur selbst erzeugt oder CC0.
- **Plattformname**: „ByCS-Lernplattform“, nie „mebis“ (außer im Satz „früher mebis“).
- **Sprache**: Deutsch in Doku und Beispielen; Code-Kommentare kurz, Deutsch oder Englisch.
- **Kein Slop**: keine Werbesprache, keine Dreierreihen um der Rhythmik willen, keine Doppelpunkt-Fanfaren, keine
  Emojis in Doku, keine Zweck- oder Quellenzeilen im Kursinhalt (die gehören ins Drehbuch). Was nicht belegbar ist,
  wird nicht behauptet.
- **Tokensparend**: Der Generator baut das Archiv, die KI schreibt Inhalte. Jede Änderung wird daran gemessen, ob sie
  den Dialog mit der Lehrkraft einfacher macht und die Tokenkosten senkt.
  Konkret: Der Assistent liest im Einsatz nur `SKILL.md` und das Kursdatei-Format; `references/export-schemata/`,
  `formate.md` und `spec.md` sind Entwicklerdoku und werden vom Generator abgebildet, nicht vom Assistenten gelesen.
  Modul- und Formatlisten für den Assistenten: eine Tabelle, ein Satz je Eintrag. Der Skill muss mit einem günstigen
  Modell (Sonnet-Klasse) laufen; was nur mit dem teuersten Modell klappt, ist nicht fertig.
- **Tests**: `python3 scripts/build.py --content examples/netzwerk9 --no-render` muss nach jeder Änderung laufen.
  Neue Modultypen bekommen einen Eintrag in `examples/` und in der Kann/Noch-nicht-Tabelle der README.
- **Lizenz**: PolyForm Noncommercial (Code), CC BY-NC-SA 4.0 (Texte). Nichts einbauen, was damit unvereinbar ist.
- **Abschluss eines Pakets**: Versionsnummer um 0.1 erhöhen (AP1 → 0.2, AP2 → 0.3 …; 1.0 nach AP9), CHANGELOG.md
  mit dieser Version ergänzen, README-Tabelle aktualisieren, PR gegen `main` mit kurzer Beschreibung (was, wie
  getestet, was offen).
- **Name**: Das Projekt heißt „Kursmühle“ (Repo und Skill-Name `kursmuehle`). Logo und Banner liegen in `docs/`.
