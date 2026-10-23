# JS-Probe (Fünf-Minuten-Test, ROADMAP Punkt 7)

Klärt auf der Plattform mit einer Sicherung, ob JavaScript in Textfeldern und eingebetteten Dateien läuft:

1. **Filtert ein Textfeld JavaScript aus Konten von Lehrkräften?** Abschnitt „Allgemeines“ enthält ein Textfeld mit
   einem kurzen Skript. Läuft es, wird der Kasten grün („JavaScript im Textfeld läuft“), sonst bleibt er rot.
2. **Läuft JavaScript in einer eingebetteten HTML-Datei (Website-Modus)?** Abschnitt „Probe 2“ ist eine Website
   (Datei-Aktivität, Anzeige eingebettet) mit Kapitelnavigation und einer Prüfen-Frage.
3. **Laufen zwei Übungen als Blöcke im Textfeld nebeneinander (Textfeld-Modus, seit 0.9.1)?** Abschnitt „Probe 3“
   hat `website: textfeld`: ein Quiz und Lernkarten als Blöcke zwischen zwei Lesetexten.

```bash
python3 scripts/build.py --content tools/jsprobe
```

Die `.mbz` aus `tools/jsprobe/out/` in einen leeren Testkurs wiederherstellen, die Kursseite öffnen (Probe 1 und 3) und
die Website öffnen (Probe 2). Ergebnis hier und in der ROADMAP unter Punkt 7 eintragen.

## Ergebnis

| Datum | Probe | Ergebnis |
|---|---|---|
| 23.10.2026 | 1 – Skript im Textfeld (Sicherung im Themenformat) | bestanden: JavaScript im Textfeld läuft |
| 23.10.2026 | 2 – Website eingebettet | bestanden: die eingebettete Datei läuft in voller Rahmenhöhe |
| offen | 3 – zwei Übungen als Blöcke im Textfeld | noch nicht auf der Plattform geprüft |

Folge: seit 0.9.1 der Textfeld-Modus (`website: textfeld`, `references/kursdatei.md` §7a) für formative Übungen
zwischen Lesetexten, neben der Website-Datei für eine ganze Einheit. Nicht geprüft: Moodle-App, Kachelformat (lädt
Abschnitte nach), Bearbeiten des Textfelds im Editor nach dem Import.

Hinweis: Moodle reinigt Textfelder beim Anzeigen (HTML Purifier), außer die Plattform vertraut dem Inhalt
(„Vertrauenswürdige Inhalte“ bzw. Rechte der Lehrkraft). Welche Einstellung die Plattform hat, ist nicht dokumentiert;
deshalb diese Probe.
