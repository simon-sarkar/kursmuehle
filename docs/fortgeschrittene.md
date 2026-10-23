# Kursmühle für Fortgeschrittene: Repo, Agent, eigene Vorlagen

Diese Seite ist für Nutzer mit einem Agenten, der Code ausführt und Dateien ändert (Claude Code, Codex, ein lokaler
Agent). Lehrkräfte ohne Agenten brauchen sie nicht; für sie reicht das Skill-Zip aus der README.

## 1. Repo klonen, Agent einweisen

```bash
git clone https://github.com/simon-sarkar/kursmuehle.git
cd kursmuehle
python3 scripts/build.py --content examples/netzwerk9     # Probe: baut die Beispielsicherung und prüft sie
```

Erste Nachricht an den Agenten: „Lies docs/fortgeschrittene.md und SKILL.md.“ Danach läuft der Kursbau wie in
`SKILL.md`; die Punkte unten beschreiben, was im Repo zusätzlich möglich ist. `AGENTS.md` enthält die Regeln für die
Arbeit am Generator selbst, nicht für den Kursbau.

## 2. Eigene Kurssicherung als Vorlage

Wer schon Kurse auf der Plattform hat, kann eine davon als Vorbild nehmen: Der Agent analysiert die Sicherung lokal und
leitet daraus Steckbrief und Designvorlage ab. Die Sicherung bleibt auf dem eigenen Rechner. Sie geht nie ins Repo, nie
in einen Pull Request und nie in einen Beispielordner (Nutzungsbedingungen der Plattform: keine Weitergabe an Dritte;
außerdem enthält sie Namen und IDs).

Ablauf:

1. Auf der Plattform: Kurs → Mehr → Kurs sichern, ohne Nutzerdaten; die `.mbz` in einen Ordner außerhalb des Repos legen,
   etwa `~/kursvorlagen/`. Der Ordner `examples/*/out/` und alle `.mbz` sind in `.gitignore`, trotzdem gehört sie nicht
   unter das Repo.
2. Agent: „Entpacke `~/kursvorlagen/<datei>.mbz` (tar.gz) in ein Temp-Verzeichnis und lies `course/course.xml`,
   `sections/*/section.xml` und die `module.xml` der Aktivitäten. Leite daraus ab: Kursformat und Formatoptionen,
   Zahl und Länge der Abschnitte, Mischung der Elementtypen je Abschnitt, Farben und wiederkehrende HTML-Muster in den
   Textfeldern.“
3. Ergebnis: ein Steckbrief (`steckbrief.yaml`, Schema in `references/intake.md` §6) mit `format:`, `design:`, `farbe:`,
   `umfang_min:` und `teile:` nach dem Muster der Vorlage, dazu eine Beschreibung des Aufbaus als Vorschlag für das nächste
   Drehbuch. Inhalte der alten Sicherung werden nicht übernommen, nur die Struktur.
4. Prüfung: Enthält das Ergebnis Namen, Mailadressen, Kurs-, Kontext- oder Kategorie-IDs der Plattform? Dann streichen.

Ein Skript, das die Schritte 2 und 3 halbautomatisch erledigt (`scripts/vorlage_aus_sicherung.py`), ist für 1.1
vorgemerkt (`ROADMAP.md`).

## 3. Eigene Designvorlage

Die drei Vorlagen (schlicht, kacheln, magazin) sind Token-Sätze in `scripts/gen/html.py` (`VORLAGEN`): Farben, Abstände,
Kartenform, Haarlinien. Eine eigene Vorlage ist ein weiterer Eintrag mit denselben Schlüsseln; die Akzentfarbe kommt
weiter aus dem Steckbrief (`farbe:`). Prüfen mit `python3 scripts/tests/render_vorlagen.py` (Playwright): rendert die
Kursseite je Vorlage bei 390 und 1200 px. Was dort gut aussieht, sieht auf der Plattform in der Regel auch gut aus, denn
die Bausteine nutzen nur filtersicheres CSS (`references/spec.md` §K).

## 4. Eigene Textbausteine

Bausteine wie `Kasten:`, `Merke:`, `Schritte:` sind Funktionen in `scripts/gen/html.py`, erkannt werden sie im Parser
`scripts/gen/kursdatei.py` (§4 in `references/kursdatei.md`). Ein neuer Baustein braucht: eine Funktion in `html.py`,
die Zeilenerkennung im Parser, eine Zeile in der Tabelle in `kursdatei.md` §4 und einen Einsatz in
`examples/alltagskompetenz/kurs.md`, damit die Tests ihn bauen. Der Testlauf dazu: `python3 scripts/tests/test_kursdatei.py`.

## 5. Eigene Fachregeln im Intake

Fachspezifische Annahmen (Mathematik rechnet in Schritten, Sprachen brauchen Redemittel)
gehören in `references/intake.md`: als zusätzliche Zeile in der Formattabelle §3 oder als eigener Punkt neben D1–D10 mit
Probe, nach dem Muster der vorhandenen. Was sich nicht als Probe formulieren lässt, die ein Assistent am Drehbuch nachvollziehen
kann, hilft nicht. Marker für die Sprachprüfung kommen in `references/qualitaet.md`.

## 6. Eigener Beispielordner

Ein Kursordner besteht aus `kurs.md`, `steckbrief.yaml` und `assets/` (PNG, PDF). Ein eigener Ordner unter `examples/`
dient als Vorbild für weitere Kurse derselben Art, etwa `examples/mathe6/`. `python3 scripts/build.py --content
examples/mathe6` baut ihn; `scripts/tests/test_kursdatei.py` baut alle Ordner unter `examples/` mit. Inhalte nur
selbst geschrieben oder CC0, keine Schulbuchseiten, keine Fotos von Personen, keine Namen echter Personen oder Schulen.

## 7. Skill-Zip neu packen

Nach Änderungen an Vorlagen, Bausteinen oder Intake:

```bash
python3 scripts/package.py            # dist/kursmuehle.zip
```

Das Zip enthält alles, was ein Assistent im Einsatz braucht, und nichts aus `docs/entwicklung/`, `tools/` und
`references/export-schemata/`. Es lässt sich an Kolleginnen und Kollegen weitergeben; die Lizenz (nicht kommerziell,
Weitergabe unter gleichen Bedingungen) bleibt dabei bestehen.

## 8. Anpassen ja, Beiträge nach Regel

Anpassen für die eigene Schule ist erwünscht. Wer etwas ins Repo zurückgeben will, hält sich an die Beitragsregel in der
README unter „Mitmachen“: keine Kurssicherungen, keine personenbezogenen Daten, nur eigene oder CC0-Inhalte, und der
Beitrag steht unter den Lizenzen des Repos. Am meisten helfen Rückmeldungen, welches Modul oder Kursformat fehlt, und
Protokolle von Durchläufen mit anderen Assistenten (Vorlagen in `docs/entwicklung/protokolle/`).
