[![Kursmühle – für die ByCS-Lernplattform](docs/banner-kursmuehle-v10.svg)](https://kursmuehle.de/)

# Kursmühle – für die ByCS-Lernplattform

Kursmühle baut aus Thema, Jahrgangsstufe und Unterrichtszeit eine Einheit mit Lesetexten und Übungen für die
ByCS-Lernplattform. Die Seite erzeugt einen Auftrag für deinen KI-Chat; du fügst die Antwort ein und lädst eine
Kurssicherung (.mbz) herunter, die du in deinem Kurs über „Wiederherstellen“ einspielst. Alles läuft im Browser unter
[kursmuehle.de](https://kursmuehle.de/), installiert wird nichts.

In Schritt 2 wählst du, wie viel du vorgibst: „Mach du“ legt den Aufbau selbst fest, „Ich gebe die Richtung“ nimmt Art,
Schwerpunkt, Übungen und Sprache auf einer Karte an, „Ich steuere“ zeigt jeden Baustein mit Auftrag.

![Status: Beta](docs/badge-status.svg) ![Lizenz: nicht kommerziell](docs/badge-lizenz.svg) ![Plattform: ByCS-Lernplattform, Moodle 5.2](docs/badge-plattform.svg)

**Stand: Beta.** Die Seite baut Kurssicherungen; die Aufträge für die Chats werden an echten Durchläufen verbessert,
und einzelne Chats antworten noch in einer Form, die die Seite nicht lesen kann. Änderungen stehen im
[CHANGELOG](CHANGELOG.md).

## Was Kursmühle kann und was noch nicht

| Kann | Noch nicht |
|---|---|
| Kursformate Themen, Kacheln, Wochen, Ein-Themen, Komprimierte Abschnitte, Einzelaktivität | Lernlandkarte, Mimo |
| Seiten und Textfelder mit Überschriften, Schritten, Tabellen, Kästen, Merksätzen und Bildern in elf Designs mit eigener Anordnung, Farbe, Dichte und Rändern (auch wellig und sehr wellig), sieben davon mit Motiv, Titelschrift und Bannerfläche | Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool |
| Test (Multiple Choice, Wahr/Falsch, Kurzantwort), Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar | Weitere Fragetypen im Test, Zeitlimits, Forum-Diskussionen |
| H5P-Inhalte: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Lückentext, Lernkarten und weitere | Weitere H5P-Typen wie Interactive Video oder Image Hotspots |
| Übungen als Website in einem Abschnitt oder als Block im Textfeld: Quiz, Zuordnen, Lückentext, Markieren, Lernkarten, Geschichte, mit Rückmeldung zur ganzen Übung; bis zu zwei Hilfen je Aufgabe und Zusatzaufgaben für Schnelle, ohne JavaScript mit Lösung zum Aufklappen | Bewertung und Abschluss je Übung in der Website, Hilfen im Test, eigene Spiele und Simulationen |
| Feedback-Umfragen, Links und Videos, Badges, Kursbild, Abschlussverfolgung, Sichtbarkeit ab Datum | Gruppen, Termine, andere Zugriffsbedingungen |
| Kursbanner und Kachelbilder (ohne Bild als Fläche im Design), Zahl der Bilder je Einheit (Stufe oder genaue Zahl), Bilder in jedem Baustein, je Bild ein Auftrag für einen Bildgenerator, Beschriftung im Bild als Wörter oder als Ziffern mit Legende, eigene Bilder hochladen (verkleinert, mit Prüffragen) | Abschnitts- und Kachelbilder automatisch aus dem Material |
| Einheit speichern und später weiterbauen (auch Einheiten aus älteren Versionen), nächste Einheit anhängen, Nachlieferung zu einem bestehenden Kurs; eine zu lange Antwort endet mit „Fortsetzung folgt“, die Mühle bittet um den Rest | Abbruch einer Antwort erkennen, wenn der Chat die Schlusszeile nicht schreibt |
| Lizenz für Texte und Aufgaben (CC BY 4.0, CC BY-SA 4.0, alle Rechte vorbehalten) und der Satz „Mit KI erstellt, von der Lehrkraft geprüft.“ als kleine Zeile am Ende jedes Abschnitts | Lizenz je Baustein, Lizenz in den Datei- und H5P-Angaben der Plattform |
| Eigene KI direkt anbinden: ein Programm wie Claude Code oder Codex (mit seinem Namen in der Mühle), ein eigener Zugangsschlüssel (OpenAI, Anthropic, Mistral) oder Ollama; Teile gehen von selbst nacheinander, Korrekturen ohne Kopieren | Bilder über die Verbindung, Verbindung vom iPad oder aus dem Schulnetz |
| Prüfung der Antwort vor dem Bau mit Sätzen, was im Chat zu korrigieren ist, und Auswegen, wenn der Chat dieselbe Antwort wiederholt | Fachliche Prüfung des Inhalts; die bleibt bei der Lehrkraft |
| Satzlänge und Lesbarkeitswert (LIX) je Lesetext gegen einen Richtwert der Jahrgangsstufe, auf Wunsch mit Satz für den Chat | Lesbarkeitsformeln mit Silben, Texte selbst vereinfachen |
| Material aus Word, LibreOffice, PowerPoint, PDF und Textdateien einlesen; die Dateien bleiben auf dem Rechner | Scans und Fotos von Arbeitsblättern |
| Lehrplan: Grundschule, Mittelschule, Realschule, Gymnasium, Förderschule (Lernen, geistige Entwicklung) (LehrplanPLUS, Lernbereiche mit Kompetenzerwartungen als Ziel der Einheit im Auftrag) | Wirtschaftsschule, berufliche Schulen, weitere Förderschwerpunkte als eigene Lehrpläne |

Der Auftrag ist eingerichtet für ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude und Gemini. Durchläufe gab es bisher
mit ByLKI, fobizz und einem Claude-Modell, nicht jeder kam ohne Korrekturrunde durch; wie die anderen Chats antworten,
soll die Beta zeigen.

## Bisher und als Nächstes

Kursmühle begann am 23. Oktober 2026 als Skill für KI-Assistenten mit Code-Ausführung (Alpha, Versionen 0.1 bis 1.0.3).
Seit 2.0 läuft alles im Browser. Die Einzelheiten jeder Version stehen im [CHANGELOG](CHANGELOG.md).

**Alpha: Skill für Assistenten mit Code-Ausführung (23.10.2026)**

- [x] 0.1 Erste Fassung als Agentenskill: Generator für Kurssicherungen mit Abschnitten, Textfeldern, Seiten, Links,
      Videos, Feedback, Badges, Abschlussverfolgung und H5P-Inhalten; Nachlieferung zu einem bestehenden Kurs
- [x] 0.2 Kursdatei statt Programmcode: der Assistent schreibt Text, der Generator baut daraus die Sicherung
- [x] 0.3 Prüfskript für jede Sicherung vor dem Import
- [x] 0.4 Menüführung mit fünf Einstiegen, Kursbanner
- [x] 0.5 Drei Designvorlagen und Textbausteine für Lesetexte
- [x] 0.6 Test, Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung und Glossar
- [x] 0.7 Sechs Kursformate, Kacheln mit Bild
- [x] 0.8 Übungen als Website in einem Abschnitt
- [x] 0.9 Didaktische Standardannahmen, Prüfdurchlauf gegen typische KI-Muster, Übungen als Block im Textfeld
- [x] 1.0 Fremdtest mit einem frischen Assistenten, Release-Zip, Projektseite, Anleitung zum Wiederherstellen
- [x] 1.0.3 Antworten von Chats ohne Code-Ausführung werden gelesen

**Beta: im Browser unter kursmuehle.de (seit 24.10.2026)**

- [x] 2.0.0-a1 Der Generator läuft in der Seite (Python über Pyodide), kein Server
- [x] 2.0.0-a2 bis a4 Bausteine als Karten, Text für den Chat, eigene Bilder hochladen, Minuten je Baustein gerechnet
- [x] 2.0.0-b1 Schrittfolge statt Formular, Startseite kursmuehle.de, erste öffentliche Beta
- [x] 2.0.0-b2 bis b4 Korrekturschleife mit Sätzen für den Chat, Bilder in Stufen, Zählregeln, hell und dunkel
- [x] 2.0.0-b5 Nachsichtiges Lesen der Antwort, Auswege, wenn der Chat dieselbe Antwort wiederholt
- [x] 2.0.0-b6 Bilder in jedem Baustein, kürzerer Text für den Chat
- [x] 2.0.0-b7 Elf Designs mit Vorschau, dritter Weg „Ich gebe die Richtung“, eigene KI direkt verbinden
      ([so geht es](docs/verbinden.md))
- [x] 2.0.0-b8 LehrplanPLUS für Grund- und Mittelschule
- [x] 2.0.0-b9 Vorschau läuft beim Scrollen mit, Motive und Titelschriften je Design, alle Kursformate in Schritt 3
- [x] 2.0.0-b10 Überarbeitung nach dem ersten Durchlauf von außen: Schritt 3 neu geordnet, welliger Rand, Lösungen
      gegenprüfen mit drei Wegen je Abweichung
- [x] 2.0.0-b11 Bilder-Schritt mit einer offenen Karte, Beschriftung im Bild oder als Ziffern, Testcodes mit drei
      Einheiten, Rand „Sehr wellig“
- [x] 2.0.0-b12 Neues zuerst in einer Beta-Vorschau, kursmuehle.de nur nach Freigabe; Standard zuerst, alles Weitere
      zum Aufklappen; Prüfung sperrt fremde Skripte; Seite für Schulleitung und Datenschutz
- [x] 2.0.0-b13 Lehrplanbezug in jedem Weg an derselben Stelle; eigenes Material aus Word, LibreOffice, PowerPoint
      und PDF einlesen; Satzlänge je Lesetext, Hilfen und Zusatzaufgaben
- [x] 2.0.0-b14 Lizenz und Zeile „mit KI erstellt, von der Lehrkraft geprüft“ im Kurs wählbar; Übungen ohne
      JavaScript lesbar; Versionsnummer in der Kursmappe; Materialleser meldet Bilddateien
- [x] 2.0.0-b15 Schulart in Schritt 1; Lehrplanbezug für Realschule, Gymnasium und Förderschule; fünf
      Schwerpunkte mit Vorschlag aus dem Lehrplan; Dateien und Bilder im Chat als Material
- [x] 2.0.0-b16 Hinweis „Die Kursmühle ist noch im Aufbau“ mit Bitte um Rückmeldung; Korrekturrunden mit der
      Kursmühle-KI günstiger
- [ ] Erste Testerinnen und Tester (Testphase mit Code seit 26.10.2026), Rückmeldungen einarbeiten
- [ ] Prüfwoche: Sicherheit, Import aller Formate, Barrierefreiheit
- [ ] 2.0 ohne Beta-Marke

**Auf dem Weg zu 3.0 (vollständige Veröffentlichung)**

- [ ] Kurs ansehen und Texte direkt darin ändern, ohne neue Runde im Chat
- [ ] Regelmäßige Importprobe auf der Plattform
- [x] LehrplanPLUS für Realschule, Gymnasium und Förderschule
- [ ] Material für Fortbildungen, damit andere die Mühle vorstellen können
- [ ] 3.0: Testphase mit Code beendet, Fortbildungsmodul, Rückmeldungen aus vielen Schulen eingearbeitet

**Danach**

- [ ] Arbeitsblätter aus derselben Einheit, auf Papier und digital

## Wiederherstellen

Die Mühle zeigt die Schritte nach dem Download; auf der Plattform heißen sie so:

1. Leg auf der Plattform einen leeren Kurs an oder nimm einen leeren, den du schon hast. Nie einen Kurs mit Klasse.
2. Im leeren Kurs: Mehr → Kurs wiederverwenden → Sicherung wiederherstellen. Datei hochladen, Wiederherstellen, Weiter.
3. Ziel: „In diesen Kurs wiederherstellen“ → „Alle Inhalte dieses Kurses löschen und dann wiederherstellen“ (nur im
   leeren Kurs; nur so kommen Kursformat und Kachelbilder mit). Bei einer Nachlieferung stattdessen „Den gesicherten
   Kurs mit diesem Kurs verschmelzen“; die neue Einheit kommt hinten an.
4. Einstellungen, Schema („Kurseinstellungen überschreiben: Ja“ beim ersten Import), Wiederherstellen.

## Datenschutz

Die Seite lädt nichts von anderen Adressen nach, außer bei deiner eigenen KI, und setzt keine Cookies. Die Seite
schickt nichts, was du eingibst, an kursmuehle.de; es gibt dort keinen Server, der Eingaben annimmt. Verbindest du
deine eigene KI, geht der Auftrag von deinem Rechner an den Anbieter, den du selbst eingerichtet hast, oder an dein
eigenes Programm; Adresse und Code dafür liegen in deinem Browser. Was du in den Chat einfügst oder an deine KI
schickst, verarbeitet dessen Anbieter; dafür gelten dessen Bedingungen und die Regeln deiner Schule. Gib in den Chat keine personenbezogenen Daten von Schülerinnen und Schülern. Datenfluss, Speicher und
Verantwortung für Schulleitung und Datenschutzbeauftragte fasst [kursmuehle.de/schule.html](https://kursmuehle.de/schule.html)
zusammen.

## Kachel fürs Schulportal

Fertige Bilder für eine Kachel im ByCS-Portal deiner Schule liegen unter [`docs/kachel/`](docs/kachel/); das Ziel der
Kachel ist `https://kursmuehle.de`.

## Rückmeldung

Fehler, Wünsche und Erfahrungen gern an **kursmuehle@pm.me**. Was Lehrkräfte berichtet haben, steht gekürzt in
[`docs/erfahrungen.md`](docs/erfahrungen.md).

## Lizenz

Nicht kommerziell. Lehrkräfte, Schulen und Fortbildungen dürfen Kursmühle nutzen, verändern und weitergeben; der Einbau
in kommerzielle Produkte oder Dienste ist nicht erlaubt.

- **Code:** [PolyForm Noncommercial 1.0.0](LICENSE)
- **Texte und Vorlagen:** [CC BY-NC-SA 4.0](LICENSE-DOCS.md)

An den Kursen, die du mit Kursmühle baust, beansprucht das Projekt keine Rechte.

## Haftungsausschluss

Kursmühle hat keine Verbindung zum Betreiber der Lernplattform. Importiere jede Sicherung zuerst in einen Testkurs und
prüfe sie; die fachliche Verantwortung für den Inhalt bleibt bei der Lehrkraft.
