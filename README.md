[![Kursmühle – für die ByCS-Lernplattform](docs/banner-kursmuehle-v10.svg)](https://kursmuehle.de/)

# Kursmühle – für die ByCS-Lernplattform

Kursmühle baut aus Thema, Jahrgangsstufe und Unterrichtszeit eine Einheit für die ByCS-Lernplattform. Du kopierst einen
Text in deinen Chat, fügst die Antwort ein und lädst eine Kurssicherung herunter, die du in deinem Kurs wiederherstellst.

![Status: Beta](docs/badge-status.svg) ![Lizenz: nicht kommerziell](docs/badge-lizenz.svg) ![Plattform: ByCS-Lernplattform, Moodle 5.2](docs/badge-plattform.svg)

**Kursmühle läuft im Browser unter [kursmuehle.de](https://kursmuehle.de/) und ist in der Beta.** Installiert wird nichts.
Die Stufen sind Beta und fertig; Änderungen stehen im [CHANGELOG](CHANGELOG.md).

## Was Kursmühle kann und was noch nicht

| Kann | Noch nicht |
|---|---|
| Kursformate Themen, Kacheln, Wochen, Ein-Themen, Komprimierte Abschnitte, Einzelaktivität | Lernlandkarte, Mimo |
| Seiten und Textfelder mit Überschriften, Schritten, Tabellen, Kästen, Merksätzen und Bildern in drei Designvorlagen | Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool |
| Test (Multiple Choice, Wahr/Falsch, Kurzantwort), Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar | Weitere Fragetypen im Test, Zeitlimits, Forum-Diskussionen |
| H5P-Inhalte: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Lückentext, Lernkarten und weitere | Weitere H5P-Typen wie Interactive Video oder Image Hotspots |
| Übungen als Website in einem Abschnitt oder als Block im Textfeld: Quiz, Zuordnen, Lückentext, Markieren, Lernkarten, Geschichte | Bewertung und Abschluss je Übung in der Website, eigene Spiele und Simulationen |
| Feedback-Umfragen, Links und Videos, Badges, Kursbild, Abschlussverfolgung, Sichtbarkeit ab Datum | Gruppen, Termine, andere Zugriffsbedingungen |
| Kursbanner und Kachelbilder, Bildwunsch mit Auftrag für einen Bildgenerator, eigene Bilder hochladen | Abschnitts- und Kachelbilder automatisch aus dem Material |
| Einheit speichern und später weiterbauen, nächste Einheit anhängen, Nachlieferung zu einem bestehenden Kurs | Abbruch einer Antwort des Chats erkennen |
| Prüfung der Antwort vor dem Bau mit Hinweisen, was im Chat zu korrigieren ist | Fachliche Prüfung des Inhalts; die bleibt bei der Lehrkraft |

Der Text für den Chat ist eingerichtet für ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude und Gemini. Erprobt ist er
bisher mit ByLKI, fobizz und einem Claude-Modell; wie die anderen Chats antworten, soll die Beta zeigen.

## Datenschutz

Die Seite lädt nichts von anderen Adressen nach und setzt keine Cookies. Was du eingibst, bleibt im Browser; die Seite
sendet es nirgends hin. Was du in deinen Chat einfügst, behandelt der Betreiber des Chats; dafür gelten dessen
Bedingungen und die Regeln deiner Schule. Gib in den Chat keine personenbezogenen Daten von Schülerinnen und Schülern.

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

Mit Kursmühle erzeugte Kurse gehören der Lehrkraft, die sie gebaut hat.

## Haftungsausschluss

Kursmühle hat keine Verbindung zum Betreiber der Lernplattform. Importiere jede Sicherung zuerst in einen Testkurs und
prüfe sie; die fachliche Verantwortung für den Inhalt bleibt bei der Lehrkraft.
