# bycs-kurs – ByCS-Lernplattform-Kurse per KI generieren

Ein Skill für KI-Assistenten mit Code-Ausführung (Claude, ChatGPT mit Code-Ausführung, lokale Agenten): aus einer
Kursbeschreibung oder einem kurzen Fragen-Intake entsteht eine importierbare Kurssicherung (`.mbz`) für die
ByCS-Lernplattform (Bayern, Moodle-basiert, früher mebis) – Abschnitte, Seiten, H5P-Inhalte, Umfragen, Badges.
Version 0.1, Stand 2026-10-23. Tech-Demo, kein offizielles Produkt der Plattform.

**Lizenz:** noch offen. Ansehen und Ausprobieren willkommen; Weiterverbreitung oder Einbau in eigene Projekte bitte
vorher anfragen. Die Bilder in `examples/netzwerk9/assets` sind Platzhalter (eigene Fotos einsetzen).

## Schnellstart

1. Repo herunterladen (ZIP oder `git clone`).
2. Dem KI-Assistenten den Ordner geben und sagen, was für ein Kurs entstehen soll – er liest `SKILL.md` und führt durch
   Intake, Drehbuch und Bau.
3. Die erzeugte `.mbz` in der Lernplattform einspielen: Kurs → Mehr → Kurs wiederverwenden → Wiederherstellen.

Beispielkurs ohne KI bauen: `python3 scripts/build.py --content examples/netzwerk9 --no-render` (Python 3.11+, PyYAML, Pillow).

## Aufbau des Repos

| Pfad | Inhalt |
|---|---|
| `SKILL.md` | Einstieg für den KI-Agenten: Ablauf, harte Regeln, Grenzen |
| `references/spec.md` | Normative Spezifikation der Sicherung (Plattformwerte, Schemata, H5P-Strukturen, Etappen) |
| `references/h5p-vorlagen.md` | `json_content`-Vorlagen aller unterstützten H5P-Typen mit deutschen Oberflächentexten |
| `references/skelette.md` | XML-Skelette und leere Standarddateien |
| `references/intake.md` | Fragerunden, Drehbuch-Format, Steckbrief-Schema |
| `scripts/` | Generator (`gen/`), `build.py`, Vorlagen, `site.json` |
| `examples/netzwerk9/` | Minimaler Beispielkurs (eine Einheit, 25 min) – Vorbild für neue Kurse |
| `examples/alltagskompetenz/` | Großer Beispielkurs (Unterabschnitte, Badge, Delta) |


## Für Lehrkräfte

**Was das ist.** Eine Anleitung für deinen KI-Assistenten, sofern er Code ausführen kann (Claude, ChatGPT mit
Code-Ausführung, lokale Agenten). Du gibst ihm dieses Dokument plus das Generator-Paket und beschreibst deinen Kurs;
er liefert eine `.mbz`-Sicherung, die du in der ByCS-Lernplattform (früher mebis) über **Kurs → Mehr → Kurs wiederverwenden → Wiederherstellen** einspielst.
Code-Ausführung ist Pflicht: Die Sicherung ist ein gepacktes Archiv aus über hundert verknüpften Dateien, das der
Generator fehlerfrei erzeugt; die KI schreibt nur die Inhalte. Ändert sich ByCS-Lernplattform, wird dieses Dokument aktualisiert.

**Was der Generator kann – und was (noch) nicht**

| Kann | Noch nicht |
|---|---|
| Kursformat „Themen“, beliebig viele Abschnitte und Unterabschnitte | Andere Kursformate (Kachel, Grid, Einzelaktivität) |
| Textfelder und Seiten mit beliebigem HTML-Design | Moodle-Test, Aufgabe, Forum, Buch, Lektion, Glossar, Wiki, Abstimmung |
| H5P: Interactive Book, Branching Scenario, Question Set, Drag and Drop, Fill in the Blanks, Dialog Cards, Course Presentation; Bausteine Text, Bild, Multiple Choice, True/False, Drag the Words, Mark the Words, Summary, Single Choice Set | Weitere H5P-Typen (Interactive Video, Image Hotspots, Memory …) – Fallback B.3 |
| Feedback-Umfragen, Links/Videos (eingebettet), Badges, Kursbild, Abschlussverfolgung, Bewertungsposten für H5P | Gruppen, Termine, Kursabschluss-Kriterien, Audio/Video als Datei |
| Zugriffsbeschränkung „sichtbar ab Datum“ je Abschnitt/Aktivität; Kurs in Etappen nachliefern (Delta-Sicherung) | Andere Zugriffsbedingungen (Abschluss von X, Bewertung, Gruppe) |

Jede Erweiterung passiert einmal im Generator und gilt danach für alle.

**Ablauf.** (1) Steuerungsgrad wählen: selbst entscheiden, Vorschläge freigeben, oder KI macht alles. (2) Kurs
beschreiben, Material anhängen (Buchseiten als Foto, Arbeitsblätter, Links); die KI stellt wenige Fragen zu Gliederung
und Aufgabenformaten. (3) **Drehbuch lesen**: der gesamte Inhalt als kurzer Text – Seiten, Aufgaben mit Lösungen,
Geschichte – mit Markierung, was aus deinem Material stammt und was die KI ergänzt hat, plus Zeitcheck. Korrigieren,
nachfragen, freigeben. (4) Import in einen Testkurs, Screenshot an die KI, Korrekturen. (5) Nach dem Import: Badge
aktivieren (Mehr → Badges), Kursbild prüfen, Probedurchlauf als Schüler/in.

**Kurs in Etappen.** Zwei Wege: Entweder der Kurs ist fertig und wird wochenweise freigegeben – dann steht im Steckbrief
je Lerneinheit ein Datum „sichtbar ab“, alles wird einmal importiert. Oder die Lerneinheiten entstehen nach und nach –
dann liefert die KI je Etappe eine Delta-Sicherung nur mit den neuen Abschnitten, die mit **„In diesen Kurs
zusammenführen“** eingespielt wird; Bestehendes und der Lernfortschritt bleiben erhalten. Was schon im Kurs ist, lässt
sich per Sicherung nicht ändern: Abschnitt löschen, Delta neu einspielen (Fortschritt in diesem Abschnitt geht verloren).

---


**Für den KI-Agenten:** `SKILL.md` laden; Referenzen in `references/`, Generator in `scripts/`, Beispielkurs in `examples/alltagskompetenz/`.
