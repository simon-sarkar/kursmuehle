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
| Seiten und Textfelder mit Überschriften, Schritten, Tabellen, Kästen, Merksätzen und Bildern in elf Designs mit eigener Anordnung, Farbe, Dichte und Kastenform | Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool |
| Test (Multiple Choice, Wahr/Falsch, Kurzantwort), Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar | Weitere Fragetypen im Test, Zeitlimits, Forum-Diskussionen |
| H5P-Inhalte: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Lückentext, Lernkarten und weitere | Weitere H5P-Typen wie Interactive Video oder Image Hotspots |
| Übungen als Website in einem Abschnitt oder als Block im Textfeld: Quiz, Zuordnen, Lückentext, Markieren, Lernkarten, Geschichte, mit Rückmeldung zur ganzen Übung | Bewertung und Abschluss je Übung in der Website, eigene Spiele und Simulationen |
| Feedback-Umfragen, Links und Videos, Badges, Kursbild, Abschlussverfolgung, Sichtbarkeit ab Datum | Gruppen, Termine, andere Zugriffsbedingungen |
| Kursbanner und Kachelbilder, Zahl der Bilder je Einheit, Bilder in jedem Baustein, Bildwunsch mit Auftrag für einen Bildgenerator, eigene Bilder hochladen (verkleinert, mit Prüffragen) | Abschnitts- und Kachelbilder automatisch aus dem Material |
| Einheit speichern und später weiterbauen, nächste Einheit anhängen, Nachlieferung zu einem bestehenden Kurs | Abbruch einer Antwort des Chats erkennen |
| Eigene KI direkt anbinden: ein Programm wie Claude Code oder Codex, ein eigener Zugangsschlüssel (OpenAI, Anthropic, Mistral) oder Ollama; Teile und Korrekturen ohne Kopieren | Bilder über die Verbindung, Verbindung vom iPad oder aus dem Schulnetz |
| Prüfung der Antwort vor dem Bau mit Sätzen, was im Chat zu korrigieren ist, und Auswegen, wenn der Chat dieselbe Antwort wiederholt | Fachliche Prüfung des Inhalts; die bleibt bei der Lehrkraft |
| Lehrplan: Grundschule, Mittelschule (LehrplanPLUS, Lernbereiche mit Kompetenzerwartungen als Ziel der Einheit im Auftrag) | Realschule, Gymnasium, Förderschule, berufliche Schulen |

Der Auftrag ist eingerichtet für ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude und Gemini. Durchläufe gab es bisher
mit ByLKI, fobizz und einem Claude-Modell, nicht jeder kam ohne Korrekturrunde durch; wie die anderen Chats antworten,
soll die Beta zeigen.

## Woran gearbeitet wird

- [x] Generator für Kurssicherungen: sechs Kursformate, acht Modultypen, H5P-Inhalte, Übungen als Website in einem
      Abschnitt; Import auf der Plattform geprüft für Themen und Kacheln
- [x] Die Seite im Browser: Schrittfolge, Antwort einfügen und prüfen, ein Satz für den Chat, wenn etwas fehlt, Bilder
      hochladen oder per Bildauftrag erzeugen, hell und dunkel
- [x] Mehr Einstellungen für das Aussehen des Kurses: elf Designs, Farbe, Dichte, Kästen, Übungsblöcke, mit Vorschau
- [x] LehrplanPLUS: Lernbereich wählen, die Kompetenzerwartungen gehen in den Auftrag; zuerst Grund- und Mittelschule
- [ ] 2.0 ohne Beta-Marke, nach Rückmeldungen von Lehrkräften
- [x] Die eigene KI direkt anbinden, ohne Kopieren und Einfügen; der Schlüssel bleibt auf dem eigenen Rechner
      ([so geht es](docs/verbinden.md))
- [ ] Arbeitsblätter aus derselben Einheit, auf Papier und digital

## Datenschutz

Die Seite lädt nichts von anderen Adressen nach, außer bei deiner eigenen KI, und setzt keine Cookies. Die Seite
schickt nichts, was du eingibst, an kursmuehle.de; es gibt dort keinen Server, der Eingaben annimmt. Verbindest du
deine eigene KI, geht der Auftrag von deinem Rechner an den Anbieter, den du selbst eingerichtet hast, oder an dein
eigenes Programm; Adresse und Code dafür liegen in deinem Browser. Was du in den Chat einfügst oder an deine KI
schickst, verarbeitet dessen Anbieter; dafür gelten dessen Bedingungen und die Regeln deiner Schule. Gib in den Chat keine personenbezogenen Daten von Schülerinnen und Schülern.

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
