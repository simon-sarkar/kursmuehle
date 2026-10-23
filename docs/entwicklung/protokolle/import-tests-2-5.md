# Import-Tests 2 bis 5 (Autor, Plattform)

Datum der Niederschrift: 23.10.2026. Plattform: ByCS-Lernplattform, Lehrkraft-Konto. Jede Sicherung wurde in einen neuen
Kurs wiederhergestellt. Die Tests liefen zu den Versionen 0.6 bis 0.9.1; die Korrekturen, die daraus folgten, stehen im
`CHANGELOG.md` unter der jeweils nächsten Version. Import-Test 1 (vor 0.5, Banner und Überblickskarte doppelt) ist nur
im CHANGELOG unter 0.5 erwähnt; die Vorlage für den Import-Test 1.0 liegt in `import-test-1.0.md`.

## Import-Test 2 (Version 0.6, Themenformat)

| Prüfpunkt | Ergebnis |
|---|---|
| Modultypen Buch, Datei, Verzeichnis, Glossar, Forum, Abstimmung, Aufgabe, Test | alle acht laden |
| Glossar | leer; die Sicherung war mit `users=0` gebaut, und Moodle stellt Glossareinträge nur mit Nutzerdaten wieder her |

## Import-Test 3 (Version 0.7, Kachelformat)

| Prüfpunkt | Ergebnis |
|---|---|
| Kachelformat | kommt an |
| Kachelbilder | kommen an |
| Weg A: Glossareinträge über „Nutzer einbeziehen“ | unbrauchbar; die Option ist für Lehrkräfte gesperrt (Schloss-Symbol) |
| Glossar-XML-Import (Einträge importieren) | brach mit „Cannot access offset of type string on string“ ab; Ursache waren leere Elemente `ALIASES` und `CATEGORIES`; nach der Korrektur kamen alle fünf Einträge an |
| Kachelbilder mit Text | das Format beschneidet die Bilder, der Text wird abgeschnitten; Folge: Kachelbilder ohne Text |

## Import-Test 4 (Version 0.8, Website-Modus)

| Prüfpunkt | Ergebnis |
|---|---|
| Website-Modus | läuft: Navigation, Fortschritt, Übungen mit Rückmeldung |
| Eingebettete Anzeige | in voller Höhe |
| JS-Probe (`tools/jsprobe`) | Skript im Textfeld läuft; Skript in eingebetteter Datei läuft |
| Glossar mit `users=0` und XML-Import | bestätigt |
| Kachelformat mit textfreien Bildern | bestätigt |

Nicht geprüft: Website im Vollbild und in einem neuen Fenster.

## Import-Test 5 (Version 0.9.1, Textfeld-Modus)

| Prüfpunkt | Ergebnis |
|---|---|
| Zwei Übungsblöcke in einem Textfeld | laufen unabhängig voneinander |
| Textfeld-Übungen auf der Kursseite | laufen |
| Übungs-Textfeld im Editor bearbeiten und speichern | der Editor entfernt Skript und Stil, die Übung ist danach tot; Folge: Regel „Übungs-Textfelder nicht im Editor öffnen“ in `SKILL.md` und README |
| Kachelkurs ohne doppeltes Raster (kein Überblick in Allgemeines) | bestätigt |
| Größe der Sicherungsdatei | die Plattform nimmt höchstens 500 MB an |

## Offen

Nicht per Import geprüft sind die Kursformate Wochen, Ein-Themen, Komprimiert und Einzelaktivität, der Website-Modus im
Vollbild und im neuen Fenster, die Moodle-App, der ungeprüfte Ausweg über den Texteditor „Textbereich“ und der Kurs aus
dem Fremdtest. Dafür ist `import-test-1.0.md` vorgesehen.
