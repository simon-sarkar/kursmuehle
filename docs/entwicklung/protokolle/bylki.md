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
