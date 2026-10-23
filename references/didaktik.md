# Didaktische Standardannahmen

Gelten für Gliederung und Drehbuch. Geprüft wird dagegen im Durchlauf aus `references/qualitaet.md`.

## Rangfolge

1. Ausdrückliche Angabe der Lehrkraft (Gespräch, Steckbrief `vorgaben:`)
2. Material der Lehrkraft (Reihenfolge, Aufgaben, Begriffe aus Folien und Arbeitsblättern)
3. Standardannahme D1–D10

Weicht eine Angabe oder das Material von einer Standardannahme ab, wird gebaut, was die Lehrkraft will oder das Material
vorgibt. Vermerkt wird das mit einer Zeile im Drehbuch-Kopf, im Klartext, die Nummer am Ende:

```
Abweichung: Quiz steht vor der Seite „Zellbestandteile“, die Lehrkraft will Vorwissen abfragen (D1)
```

Der Parser übergeht `Abweichung:`-Zeilen wie `Angenommen:`; im Kurs erscheinen sie nie.

## Standardannahmen

| Nr | Prinzip |
|---|---|
| D1 | Erst Input, dann Kontrolle: Regel und Verweis `(← S2)` bzw. `(← Elementtitel)` stehen in `intake.md` §5. |
| D2 | Rhythmus Lesen → Üben → Sichern (`intake.md` §3); die Sicherung am Ende der Einheit enthält mindestens einen Fall, der vorher nicht vorkam. |
| D3 | Jedes Element außer Banner und Überblick hat einen Zweck, als `[Zweck: …]` in seiner Überschriftzeile: höchstens acht Wörter mit einem Verb („Router und Switch unterscheiden“). Lässt er sich so nicht schreiben, fällt das Element weg. |
| D4 | Jede Aufgabe prüft eine Sache. Probe: Die Begründung der richtigen Antwort braucht genau einen Inhalt aus dem Bezugselement. |
| D5 | In Übungen (Lesebuch, Quiz zwischendurch) bekommt jede falsche Option, die eine Fehlvorstellung abbildet, eine Rückmeldung (`→`): was daran falsch ist und wo der Input es klärt. MC dafür als Liste, RF mit `→ falsch:`. Abschlussquiz und Test sind frei. |
| D6 | Die Übungen einer Einheit steigen im Anspruch: erst Wiedererkennen (Lernkarten, Zuordnen von Begriffen, Richtig/Falsch), dann Anwenden auf einen Fall. |
| D7 | Höchstens die Hälfte der Elemente einer Einheit ist H5P. Gezählt werden die Elemente ohne Banner und Überblick; Lesebuch zählt als Input, wie Textfeld, Seite und Buch. |
| D8 | Zeitcheck nach `intake.md` §5. Weicht die Summe um mehr als 20 % vom Soll ab, steht ein Vorschlag zum Kürzen oder Ergänzen in der `Zeit`-Zeile; die Lehrkraft entscheidet. |
| D9 | Abgefragt werden Fälle statt Definitionen: Die Mehrheit der Fragen in Quiz und Test einer Einheit schildert eine Situation, in der etwas zu entscheiden ist. Personen und Marken sind erfunden. |
| D10 | Eine Einheit beginnt mit einem konkreten Fall oder einer Frage aus dem Alltag der Lernenden, unbewertet, aufgelöst im folgenden Input (`intake.md` §5). |
