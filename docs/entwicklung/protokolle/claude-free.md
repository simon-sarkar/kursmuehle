# Durchlauf mit Claude Free (Autor)

Ziel (AP9): Eine 25-Minuten-Einheit läuft mit einem kostenlosen Claude-Konto innerhalb des Tageslimits bis zur `.mbz`.
Scheitert es, wird der Grund festgehalten und behoben, nicht nur dokumentiert.

## Aufbau

- Konto: kostenloses Claude-Konto, frisch angemeldet oder mit unverbrauchtem Tageslimit; Modell, das das Konto zuweist (Code-Ausführung in den Einstellungen einschalten).
- Eingabe 1: `kursmuehle.zip` (Release 1.0) hochladen, Text: „Entpacke das und lies SKILL.md. Mach mir eine Einheit zu
  Netzwerkkomponenten für Jgst 9, 25 Minuten, unterrichtsbegleitend.“ (gleicher Umfang wie `examples/netzwerk9`)
- Keine weitere Hilfe. Auf das Drehbuch mit „passt“ antworten. Mitzählen: Nachrichten, Minuten, Hänger.

## Messung

| Größe | Wert |
|---|---|
| Datum, Uhrzeit Start | |
| Modell laut Oberfläche | |
| Code-Ausführung verfügbar (ja/nein) | |
| Nachrichten des Assistenten bis zum Drehbuch | |
| Nachrichten bis zur `.mbz` | |
| Minuten bis zum Drehbuch | |
| Minuten bis zur `.mbz` | |
| Tageslimit erreicht (ja/nein, bei welcher Nachricht) | |
| `check.py`-Ausgabe (OK / FEHLER) | |
| Import auf der Plattform (OK / Abweichung) | |

## Beobachtungen

- Hat der Assistent SKILL.md vollständig gelesen oder nur den Anfang? (Woran erkennbar?)
- Erste Nachricht „Womit starten wir?“ gestellt oder direkt gebaut? (Bei einem Satz mit Thema, Jgst, Dauer, Einsatz ist
  Weg 1 ohne Rückfrage richtig.)
- Welche Dateien hat er zusätzlich gelesen (Werkzeugausgaben zeigen es)? Unnötige Lesevorgänge notieren.
- Drehbuch: Slop-Treffer gegen `references/qualitaet.md` (Marker nennen), Zeitcheck vorhanden?
- Bilder: selbst erzeugt, gerendert oder `Bildwunsch:`-Zeilen?
- Fehler beim Bau und wie viele Bauläufe.

## Ergebnis

Zeile für die README („läuft mit …“): ____

Wenn gescheitert: Grund (Lesemenge, Ausgabemenge, fehlende Code-Ausführung, Tageslimit) und was im Skill geändert wird: ____
