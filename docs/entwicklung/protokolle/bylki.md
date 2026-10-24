# Durchlauf mit ByLKI (Autor)

ByLKI (und der AIS-Chat) führen keinen Code aus. Bis zur Browser-Fassung (2.0) ist der Weg: Drehbuch und Steckbrief in
ByLKI schreiben lassen, Bau mit einem Assistenten, der Code ausführt, oder lokal mit `scripts/build.py`. Geprüft wird, ob
die Anleitung diesen Weg trägt (Selbstabfrage in `SKILL.md`: „Code ausführen: nein → Drehbuch und Steckbrief liefern“).

## Aufbau

- ByLKI öffnen; falls Dateianhänge möglich sind, `SKILL.md`, `references/intake.md`, `references/kursdatei.md` und
  `references/qualitaet.md` aus dem Zip anhängen; sonst den Inhalt von `SKILL.md` und `intake.md` einfügen.
- Text: „Lies SKILL.md. Du kannst keinen Code ausführen. Mach mir eine Einheit zu Netzwerkkomponenten für Jgst 9,
  25 Minuten, unterrichtsbegleitend.“
- Erwartung: Drehbuch (`kurs.md`) und Steckbrief (`steckbrief.yaml`) als Text, dazu der Hinweis, den Bau in einem
  Assistenten mit Code-Ausführung zu erledigen.
- Dann: Drehbuch und Steckbrief in einen Kursordner kopieren, `python3 scripts/build.py --content <ordner>` lokal.

## Messung

| Größe | Wert |
|---|---|
| Datum, Uhrzeit Start | |
| Anhänge möglich (ja/nein), wie viele Zeichen passen in eine Nachricht | |
| Nachrichten des Assistenten bis zum Drehbuch | |
| Minuten bis zum Drehbuch | |
| Drehbuch vom Parser ohne Korrektur gebaut (ja/nein; Parsermeldungen) | |
| `check.py`-Ausgabe | |
| Import auf der Plattform (OK / Abweichung) | |

## Beobachtungen

- Hat der Assistent die Selbstabfrage richtig beantwortet (Code: nein) und keinen Bau versucht?
- Hält das Drehbuch das Kursdatei-Format (Überschriften, Angaben, Fragenzeilen) ohne Beispiel vor Augen?
- Slop-Treffer gegen `references/qualitaet.md`.
- Was fehlte im Prompt, damit ein Assistent ohne Dateizugriff das Format trifft? (Kandidat für die Prompt-Fassung in 2.0.)

## Ergebnis

Zeile für die README („läuft mit …“ oder „liefert mit … das Drehbuch, Bau anderswo“): ____

## Durchlauf 24.10.2026 mit dem Text der Browser-Fassung (2.0.0-a4, Autor)

Nicht der Weg oben (Skill-Zip), sondern der Text, den die Mühle unter kursmuehle.de/2/ erzeugt, in ByLKI eingefügt.

- Einheit „Das Auge“, Jahrgangsstufe 5, 45 Minuten, Vorlage Einführung, absichtlich minimale Aufträge; die Karten
  Erarbeitung und Übung vorher gelöscht (Test, ob der Chat Lücken selbst füllt).
- Format: korrekt. ByLKI hielt die Formatzeilen ein (ids, „Angenommen:“, Bildwünsche); die Mühle hat die Antwort ohne
  Korrekturbitte eingelesen und die Datei gebaut.
- Inhalt: nicht brauchbar. Einstieg vier Absätze Geschichte (~250 Wörter), die Hinführung enthielt die eigentliche
  Erarbeitung, Hefteintrag zwei Sätze (~30 Wörter), Quiz eine Frage. Die fehlende Zeit hat das Modell weggeschrieben
  („Angenommen: 30 Minuten entfallen auf angeleitete Unterrichtsgespräche außerhalb der Kursbausteine“) statt Bausteine
  zu ergänzen.
- Folgen für den Text (AP13.1): Zeit nie wegerklären, fehlende Karten ergänzt der Chat (Typ automatisch), die Seite warnt
  vor dem Kopieren bei zu wenig Karten; Mindestmaße je Rolle (Hefteintrag mindestens 80 Wörter mit Merksätzen, Quiz
  mindestens 3 Fragen, Zuordnen 4 Paare, Lückentext 5 Lücken); Vorlage minimal, aber Einstieg, Erarbeitung, Übung und
  Sicherung bleiben je einmal (Warnung statt Sperre); Einstieg höchstens 100 Wörter; Denkaufgaben-Kästen zählen nicht
  als Übung.
- Import: siehe `import-test-2.0.md`, Ergebnis 24.10.2026.

Zeile für die README: „erprobt bisher mit ByLKI und einem Claude-Modell“.
