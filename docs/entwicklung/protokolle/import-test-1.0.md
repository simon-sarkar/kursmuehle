# Import-Test 1.0 (Autor, Plattform)

Ziel: Die Sicherungen aus 1.0 kommen auf der ByCS-Lernplattform so an, wie der Generator sie baut. Getestet wird in einem
leeren Testkurs; die Wiederherstellungsanleitung aus `SKILL.md` ist zugleich Prüfgegenstand (stimmen die Schritte?).

## Vorbereitung

```bash
python3 scripts/build.py --content examples/netzwerk9
python3 scripts/build.py --content examples/alltagskompetenz
python3 scripts/build.py --content examples/module
python3 scripts/build.py --content examples/netzwerk9 --website textfeld
```

Dazu die `.mbz` aus dem Fremdtest (`AP9_fremdtest.md`, Abschnitt „Ergebnis“; der Kursordner liegt nicht im Repo, der
Autor baut ihn aus dem dort abgelegten Drehbuch nach oder nimmt die Datei aus der Sitzung).

## Durchläufe

| Nr | Sicherung | Ziel-Variante | Schema: Kurseinstellungen überschreiben | Ergebnis (OK / Abweichung) | Datum |
|---|---|---|---|---|---|
| 1 | netzwerk9 (Themen) | in diesen Kurs, löschen und wiederherstellen | Ja | | |
| 2 | alltagskompetenz (Kacheln, Badge, Delta-Teile) | als neuer Kurs in Kategorie | – | | |
| 3 | alltagskompetenz Delta `--delta le2,le3` | zusammenführen | Nein | | |
| 4 | module (Test, Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar) | in diesen Kurs, löschen und wiederherstellen | Ja | | |
| 5 | module: Glossar → Mehr → Einträge importieren → `module_glossar.xml` | – | – | | |
| 6 | netzwerk9 `--website textfeld` | in diesen Kurs, löschen und wiederherstellen | Ja | | |
| 7 | Fremdtest-Kurs Bruchrechnen (Sonnet) | als neuer Kurs in Kategorie | – | | |
| 8 | netzwerk9 `--format wochen` | in diesen Kurs, löschen und wiederherstellen | Ja | | |
| 9 | netzwerk9 `--format einthemen` | wie 8 | Ja | | |
| 10 | netzwerk9 `--format komprimiert` | wie 8 | Ja | | |

## Was je Durchlauf zu prüfen ist

- Anleitung: Stimmen die Schrittnamen (Bestätigen, Ziel, Einstellungen, Schema) und die Optionen mit `SKILL.md` überein?
  Abweichung wörtlich notieren.
- Kursseite: Banner als erstes Element, Kursbild gesetzt, Kursformat wie im Steckbrief, Abschnittstitel, Kachelbilder.
- Jede Aktivität öffnen: H5P rendert ohne Fehlerkasten, Bilder sichtbar, Test zeigt Fragen und bewertet, Buch mit Kapiteln,
  Datei und Verzeichnis liefern die Dateien, Abstimmung mit Optionen, Forum vom richtigen Typ.
- Textfeld-Modus (6): Blöcke laufen (Antwort wählen, Prüfen, Rückmeldung), mehrere Blöcke auf einer Seite stören sich
  nicht. Ein Block einmal mit „Einstellungen bearbeiten“ öffnen und speichern: bleibt die Übung tot (Regel in `SKILL.md`)?
  Dann Texteditor in den Nutzereinstellungen auf „Textbereich“ stellen und denselben Versuch wiederholen (Ausweg prüfen).
- Badge (2): nach Mehr → Badges → aktivieren ein Probedurchlauf als Schüler/in bis zur Verleihung.
- Delta (3): neue Abschnitte hängen hinten an, bestehende Abschnitte und Fortschritt unverändert.
- Größe: `check.py` meldet keine Warnung; Größe der größten `.mbz`: ____ MB.
- Moodle-App (optional): Kursseite mit Textfeld-Blöcken in der App öffnen; zeigt die App den Hinweis oder die Übung?

## Ergebnis

Stand: ____ (Datum). Zusammenfassung in drei Sätzen; Abweichungen als Issues oder direkt in `CHANGELOG.md` unter „Offen“.
Verifizierte Formate und Module in `SKILL.md` unter „Grenzen“ und in der README unter „Projektstatus“ nachtragen.
