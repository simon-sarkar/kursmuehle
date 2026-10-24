# Import-Test 2.0: im Browser erstellte Datei auf der ByCS-Lernplattform (Vorlage, Autor)

Frage (AP12a §2): Lässt sich eine Datei, die die Browser-Fassung erstellt hat, auf der Plattform wiederherstellen, und
läuft sie dort wie eine Sicherung aus dem 1.x-Generator? Bisher sind nur die Bytes geprüft: die Browser-Fassung baut
byteidentisch zum CPython-Bau (test_web.py, test_ansicht.py), und check.py meldet OK.

## Datei

- Erstellt mit `python3 scripts/tests/import_test_datei.py --out DIR` (in der CI: Artefakt `import-test-2.0` im Lauf
  „Tests“ des PRs, Job „browser (chromium)“). Ablauf wie eine Lehrkraft in `web/index.html`: Einheit „Satz des
  Pythagoras“, Jahrgangsstufe 9, 45 Minuten, Vorlage Einführung, Fach Mathematik, Schulart Mittelschule, Chat Claude;
  Antwort des Chats aus dem Prompttest, Lauf 1 (`ap11-prompttest/antwort-lauf1.txt`), unverändert eingefügt; für den
  Bildwunsch `pythagoras-quadrate.png` eine selbst gezeichnete Skizze hochgeladen (rechtwinkliges Dreieck mit den
  Quadraten über den Seiten); Fragen und Lösungen durchgesehen; Datei erstellt und heruntergeladen.
- Im Artefakt: `satz-des-pythagoras_<Datum>.mbz` (Name aus der Seite) und die Kursdatei
  `satz-des-pythagoras_<Datum>.kursmappe.zip` zum Nachvollziehen.
- Lokal am 24.10.2026: `check.py` OK (9 Aktivitäten, 2 Abschnitte, 1 Datei, Format Themen), 43 683 Bytes.
- Darstellungsweg: „Wie erscheinen Übungen?“ stand auf „Auf der Kursseite“ (Steckbrief `website: textfeld`), die
  Übungen sind also Blöcke im Textfeld, die drei Quiz (alle mit `abschluss: ansehen`) ebenfalls.

## Ablauf auf der Plattform

1. Neuen leeren Kurs anlegen (oder Testkurs), Kurs → Mehr → Wiederherstellen, die `.mbz` hochladen.
2. „In einen neuen Kurs“ oder „In diesen Kurs, löschen und wiederherstellen“ (leerer Testkurs), ohne Nutzerdaten.
3. Kursseite öffnen, dann als Schüler (Rolle wechseln) ansehen.

## Prüfpunkte

| Prüfpunkt | Erwartung | Ergebnis |
|---|---|---|
| Wiederherstellen läuft ohne Fehlermeldung | ja | |
| Kursbanner | In dieser Datei gibt es keinen: Die Vorlage Einführung legt keinen Kursbanner an, Lauf 1 hat keinen geschrieben. Nichts erwartet. | |
| Textfeld-Übungen laufen | Zuordnen und die drei Quiz erscheinen als Blöcke auf der Kursseite, Antworten prüfen, „Lösung zeigen“, Zähler | |
| Bild da | die Skizze in der Seite „Die Formel a² + b² = c² und ihre Anwendung“, mit Alt-Text | |
| Glossar-Hinweis | Die Einheit hat kein Glossar; der Hinweis zum XML-Import nach dem Wiederherstellen ist hier nicht zu erwarten. | |
| Reihenfolge und Titel | neun Elemente in der Reihenfolge der Antwort, Titel wie in der Antwort | |
| Moodle-Version der Plattform | 5.2.x | |

## Ergebnis

Datum, Plattformversion, Browser: ____

Zeile für die README („im Browser erstellte Datei läuft auf der Plattform“ oder die Abweichung): ____

## Ergebnis 24.10.2026 (Autor, andere Datei)

Geprüft wurde nicht die Pythagoras-Datei oben, sondern die Datei aus dem ByLKI-Durchlauf (`bylki.md`, Durchlauf
24.10.2026): „Das Auge“, Jahrgangsstufe 5, 2.0.0-a4, 11 KB, Vorlage Einführung mit gelöschten Karten.

- Wiederherstellen in einen Testkurs: Der erste Versuch brach mit einer Fehlermeldung ab (Wortlaut nicht gesichert),
  der zweite Versuch mit derselben Datei lief ohne Fehler durch. Ob Plattform-Aussetzer oder reproduzierbar, ist offen;
  beim nächsten Mal den Wortlaut sichern.
- Damit ist die erste im Browser erstellte Datei auf der Plattform wiederhergestellt. Die Prüfpunkte der Tabelle oben
  (Textfeld-Übungen, Bild, Reihenfolge) sind mit dieser Datei nicht einzeln abgehakt; sie bleiben für die
  Pythagoras-Datei offen.

Zeile für die README: „Import einer im Browser erstellten Datei erst einmal geprüft (erster Versuch mit Fehlermeldung,
zweiter lief).“
