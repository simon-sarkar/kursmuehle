# Drehbuch aus Chats ohne Code-Ausführung (Autor, 23.10.2026)

Frage für 2.0: Schreibt ein Chat ohne Code-Ausführung mit den vier Laufzeitdateien eine Kursdatei, die der Generator
ohne Handarbeit baut?

## Aufbau

- Eingabe: eine Datei mit `SKILL.md`, `references/intake.md`, `references/kursdatei.md`, `references/qualitaet.md`
  (68 KB; für fobizz als .docx, Markdown als reiner Text) und ein Prompt: keinen Code ausführen, Steuerungsgrad c,
  keine Rückfragen; Auftrag „Mathematik, Satz des Pythagoras, 9. Klasse Mittelschule, Selbstlernkurs ca. 45 min, eine
  Einheit“; Ausgabe `steckbrief.yaml` und `kurs.md`, Bilder als `Bildwunsch:`-Zeilen.
- Bau danach mit `scripts/build.py --content <ordner> --no-render`. Die Ausgaben liegen unverändert in `ais/` und `fobizz/`.

## Ergebnis

| | AIS-Chat | fobizz |
|---|---|---|
| Modell laut Autor | GPT-5.5 | GPT-6.1 Sol |
| Generierung | unter 30 s | etwa 4 min |
| Lesetext auf Seiten | rund 330 Wörter | rund 960 Wörter |
| Übungen | Lernkarten, Zuordnen, Quiz mit 5 Fragen (H5P) | Zuordnen und Lückentext im Textfeld, 7 Heftaufgaben mit Lösungen |
| Abschlusstest | Moodle-Test, 10 Fragen | Moodle-Test, 8 Fragen |
| Rechnungen | alle richtig | alle richtig |
| Bau ohne Korrektur | nein, 1 Stelle | nein, 3 Stellen und LaTeX |
| Nach Korrektur `check.py` | OK | OK |
| Import auf der Plattform | steht aus | steht aus |

Korrekturen, die für den Bau nötig waren:

- AIS: `versuche: 2 · rückmeldung: sofort · einleitung: …` in einer Zeile. So steht es in der Kommentarspalte von
  `kursdatei.md` §5a; der Parser verlangt drei Zeilen.
- fobizz: Leerzeile zwischen `Schritte: …` und `1. …` (dreimal).
- fobizz: drei Zeilen „Hinweis für die Lehrkraft: …“ (Liefertexte aus `SKILL.md`) am Ende der Kursdatei; der Parser
  ordnet sie der letzten Umfrage zu, die Meldung nennt die Umfrage statt der Zeile.
- fobizz: Formeln in LaTeX (`$$…$$`, inline `$…$`), entgegen `kursdatei.md`, vom Modell als `Abweichung:` vermerkt. Der
  Parser lässt sie still durch. Inline-`$…$` versteht der MathJax-Filter von Moodle standardmäßig nicht; ob die Plattform
  den Filter aktiv hat, ist offen.

Inhaltliche Schwächen: AIS-Test Frage 6 (Kurzantwort `a² + b² = c²`, Eingabe mit `^` zählt nicht), Frage 1 mit Ablenker
„rechter Winkel“ (keine Seite), `Bildwunsch: dreieck_baum.png` nirgends verwendet und mit Baum statt Wand.

## Folgen (vorgemerkt für 1.0.3)

1. Parser nimmt Testangaben mit ` · ` in einer Zeile an (oder §5a-Beispiel eindeutig machen).
2. Leerzeile nach `Schritte:` erlaubt.
3. Zeilen außerhalb eines Elements wie „Hinweis für die Lehrkraft:“ werden ignoriert und als Hinweis gemeldet.
4. LaTeX erkennen: einfache Fälle umsetzen (`a^2` → a², `\sqrt{…}` → √(…), `^\circ` → °), sonst warnen.
