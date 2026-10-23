# Arbeitspakete für 1.0

Reihenfolge = Priorität. Jedes Paket ist eigenständig in einer Claude-Code-Sitzung bearbeitbar („Bearbeite AP1“).
Pakete, die die Plattform brauchen (Import-Tests), sind markiert; sie bleiben beim Autor.

| AP | Thema | Braucht Plattform |
|---|---|---|
| AP1 | Kursdatei statt Python: Drehbuch-/Kursdatei-Format, das der Generator direkt liest | nein (Import-Test am Ende: Autor) |
| AP2 | `scripts/check.py` (Sicherung prüfen) + `site.json` entfernen | nein |
| AP3 | Menüführung „Womit starten wir?“, Formatfrage, Kursbanner, Bildgenerierung wenn möglich | nein |
| AP4 | Designvorlagen (2–3) + HTML-Textbausteine, Render-Test | nein |
| AP5 | Neue Modultypen aus `references/export-schemata/`: Test, Aufgabe, Datei, Forum, Buch, Abstimmung, Verzeichnis, Glossar | nein (Import-Test: Autor) |
| AP6 | Kursformate: Kacheln zuerst (Kursoptionen, tilephoto/tileicon je Abschnitt), dann Wochen, Ein-Themen, Komprimiert | nein (Import-Test: Autor) |
| AP7 | Website-Modus: HTML-Ressource mit Navigation, Inhalten, JS-Quiz als Vorlage | nein |
| AP8 | `references/didaktik.md` + `references/qualitaet.md` (Entwürfe, Freigabe durch Autor) | nein |
| AP9 | Fremdtest: frischer Agent nur mit dem Repo baut einen Kurs; Protokoll der Reibungspunkte | nein |
