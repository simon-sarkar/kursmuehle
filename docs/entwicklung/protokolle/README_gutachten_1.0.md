# Gutachten Außendarstellung 1.0 (README, Projektseite, SKILL.md, fortgeschrittene.md) – 23.10.2026

Unabhängiger Prüfagent (Opus) nach Merge von PR #11. Zeilenangaben beziehen sich auf diesen Stand.

| Nr | Datei:Stelle | Fund | Schwere | Vorschlag |
|---|---|---|---|---|
| 1 | examples/netzwerk9/assets/ | Fremde Produktfotos mit Marken (FRITZ!Box, TP-LINK, Ubiquiti), Pixabay-Quellzeile, Stock-Clipart; im Release-Zip unter CC BY-NC-SA; widerspricht README („Platzhalter“, „keine fremden Fotos oder Logos“). | hoch | Durch selbst erzeugte Bilder ersetzen. |
| 2 | index.html, README, SKILL.md | Feedback-Weg führt ins Leere (`href="#rueckmeldung"`, „Autor trägt ein“). | hoch | Adresse eintragen, Meta-Satz streichen. |
| 3 | index.html, README | Download-Link releases/latest/download/kursmuehle.zip liefert 404, bis Release und Pages existieren. | hoch | Release mit Asset anlegen, Pages aktivieren. |
| 4 | index.html Schnellstart, README, SKILL | Beispielsatz nennt Thema, Jahrgang, Einsatz, Minuten → Assistent baut laut SKILL sofort ohne Drehbuch-Freigabe, Schnellstart verspricht aber „Drehbuch lesen, passt sagen“. | hoch | Beispielsatz um „Zeig mir zuerst das Drehbuch.“ ergänzen oder Schnellstart anpassen. |
| 5 | README Richtwerte | Upload-Weg ChatGPT/claude.ai mit 1.0 ungetestet; Fremdtest lief als Claude-Code-Agent mit Dateisystem; „durchgespielt mit ChatGPT“ bezieht sich auf 0.1. | hoch | Ehrlich kennzeichnen: „Mit 1.0 getestet: Claude Code; ChatGPT nur mit 0.1“. |
| 6 | README Richtwerte-Tabelle | „Rückfragen 0 / 0“, Protokoll sagt Durchlauf 1 = 2; Nachrichten sind Schätzung ohne Lesezeit. | mittel | 2 / 0, „(Schätzung, ohne Lesezeit der Lehrkraft)“. |
| 7 | README vs ROADMAP vs protokolle/ | „Per Import verifiziert“ ohne Protokoll; ROADMAP sagt „Import-Test offen“. | mittel | Import-Tests 2–5 in protokolle/ festhalten, ROADMAP angleichen. |
| 8 | README, index.html | Kostenlose Konten: „stehen aus“ vs. 2.0-Begründung. | mittel | Satz: „Getestet mit bezahltem Zugang; ob ein kostenloses Konto reicht, ist offen.“ |
| 9 | index.html, README | Kein Datenschutzhinweis für die Lehrkraft (keine Schülerdaten, keine Personenfotos, schulische Vorgaben zu privaten KI-Konten). | mittel | Ein Satz im Schnellstart. |
| 10 | fortgeschrittene.md | „Sicherung bleibt lokal“ – der gelesene Inhalt geht an den Modellanbieter. | mittel | „Datei bleibt lokal; was der Agent liest, geht an den Modellanbieter. Nur eigene Kurse ohne Nutzerdaten.“ |
| 11 | README, index.html | ByLKI/AIS-Chat: „Drehbuch dort schreiben lassen“ ohne Schritt, bylki.md leer. | mittel | Konkreten Schritt nennen oder bis zum Test streichen. |
| 12 | SKILL.md Beschreibung | „ByCS-/mebis-/Moodle-Kurs“ – „mebis“ außerhalb von „früher mebis“. | mittel | „(früher mebis)“. |
| 13 | README, index.html | Fachwörter ohne Erklärung (Intake, Drehbuch, Steckbrief, Delta, Textfeld-Modus, Skill-Zip, Tokens, Sonnet-Klasse); „Code-Ausführung einschalten“ ohne Ort. | mittel | Begriffskasten, je ein Satz; Schalter je Assistent nennen. |
| 14 | README, index.html | Wiederherstellen zu weit unten; Schritt 3 der Seite verlinkt nicht auf #wiederherstellen; „zuerst Testkurs“ nur im Footer. | mittel | Wiederherstellen hinter „Drei Wege“; Link; Testkurs in Schritt 1. |
| 15 | ROADMAP | „Kern-H5P-Filter beide 1.0“ nicht geliefert; „Später: Grid, Wochen, Einzelaktivität“ veraltet; „Lizenz prüfen“ erledigt. | mittel | Drei Zeilen auf 1.0 bringen. |
| 16 | index.html Pitch | „Kurse wiederherstellen, die es noch nie gab.“ als Aphorismus/Jargon eingestuft. | mittel | Autor behält den Satz; sachlicher Untertitel daneben. |
| 17 | README | Dreierreihen „jede Seite, jede H5P-Übung, jedes Quiz … anklicken, befüllen und formatieren“. | niedrig | „jede Seite und jede Übung einzeln anlegen und befüllen“. |
| 18 | README | Floskel-Überschrift „Was bringt das?“. | niedrig | „Wozu Kursmühle dient“. |
| 19 | ROADMAP | „Sky is the limit.“ | niedrig | Streichen. |
| 20 | README | „mit 0.1 in ChatGPT etwa sieben Minuten“ unbelegt; Meta-Satz „kommt als Zeile hierher“. | niedrig | „Einzelbeobachtung, nicht protokolliert“; Meta-Satz weg. |
| 21 | README, index.html | „prüft und behebt“ – Fremdtest: Marker übersehen; Seite sagt „vor dem Drehbuch“, richtig danach. | niedrig | „ist angewiesen zu prüfen“; Zeitpunkt. |
| 22 | index.html, README, SKILL | Absolute Aussagen: „kommen fertig an“, „in jedem Kurs ohne Vorarbeit“, „immer eine .mbz“. | niedrig | Einschränken. |
| 23 | README Modultabelle | „Course Presentation“ nicht wählbar, nur Szene der Geschichte. | niedrig | Streichen oder kennzeichnen. |
| 24 | README, fortgeschrittene.md | „Auf dem eigenen Rechner wird nichts installiert“ gilt nicht für den Agenten-Weg (Python 3.11, PyYAML, Pillow). | niedrig | Einschränken; Abhängigkeiten in §1. |
| 25 | README Danksagung | „ByCS-Lernplattform … für das dokumentierte Sicherungsformat“ stimmt nicht; kollidiert mit „keine Verbindung zum Betreiber“. | niedrig | „Moodle (quelloffener Backup-Code)“. |

Ohne Befund: Viewport, Titel, keine festen Breiten, keine externen Ladevorgänge, relative Pfade, einheitliche Schreibweisen, keine Emojis, Mailadressen, Schulnamen oder echte Plattform-IDs.
