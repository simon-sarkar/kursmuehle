# JS-Probe (Fünf-Minuten-Test, ROADMAP Punkt 7)

Klärt auf der Plattform zwei Fragen mit einer Sicherung:

1. **Filtert ein Textfeld JavaScript aus Konten von Lehrkräften?** Abschnitt „Allgemeines“ enthält ein Textfeld mit
   einem kurzen Skript. Läuft es, wird der Kasten grün („JavaScript im Textfeld läuft“), sonst bleibt er rot.
2. **Läuft JavaScript in einer eingebetteten HTML-Datei (Website-Modus)?** Abschnitt „Probe 2“ ist eine Website
   (Datei-Aktivität, Anzeige eingebettet) mit Kapitelnavigation und einer Prüfen-Frage.

```bash
python3 scripts/build.py --content tools/jsprobe
```

Die `.mbz` aus `tools/jsprobe/out/` in einen leeren Testkurs wiederherstellen, die Kursseite öffnen (Probe 1) und die
Website öffnen (Probe 2). Ergebnis in der ROADMAP unter Punkt 7 eintragen. Läuft Probe 1, geht One-Page auch ohne
Datei-Aktivität (Skript im Textfeld); dann beide Wege in `references/kursdatei.md` dokumentieren.

Hinweis: Moodle reinigt Textfelder beim Anzeigen (HTML Purifier), außer die Plattform vertraut dem Inhalt
(„Vertrauenswürdige Inhalte“ bzw. Rechte der Lehrkraft). Welche Einstellung die Plattform hat, ist nicht dokumentiert;
deshalb diese Probe.
