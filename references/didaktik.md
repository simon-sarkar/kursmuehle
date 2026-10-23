# Didaktische Standardannahmen (Entwurf)

Entwurf aus AP8, Freigabe durch den Autor offen. Gilt für Gliederung und Drehbuch; der Assistent liest die Seite vor
dem ersten Drehbuch. Geprüft wird dagegen im Durchlauf aus `references/qualitaet.md`.

## Rangfolge

1. Ausdrückliche Angabe der Lehrkraft (Gespräch, Steckbrief)
2. Material der Lehrkraft (Reihenfolge, Aufgaben, Begriffe aus Folien und Arbeitsblättern)
3. Standardannahme dieser Seite

Weicht eine Angabe oder das Material von einer Standardannahme ab, wird gebaut, was die Lehrkraft will oder das Material
vorgibt, ohne Rückfrage und ohne Belehrung. Die Abweichung steht als eine Zeile im Drehbuch-Kopf, mit Nummer der Annahme:

```
# Drehbuch v1 · Biologie 7 – Die Zelle · 45 min
farbe: #0F766E
Hinweis: D1 – Quiz vor der Seite „Zellbestandteile“ (Wunsch der Lehrkraft: Vorwissen abfragen)

## Allgemeines
```

`Hinweis:`-Zeilen stehen nach den Kurs-Angaben (`farbe:`, `kursbild:`) und vor dem ersten `##`. Dort übergeht der
Parser sie und meldet das auf der Konsole; das ist gewollt. Vor `farbe:` gesetzt, wird die Farbe mit übergangen. Unter
einem Element wäre `Hinweis:` ein orangefarbener Kasten im Kurs.

## Standardannahmen

| Nr | Prinzip | Begründung |
|---|---|---|
| D1 | Erst Input, dann Kontrolle: jede bewertete Aufgabe ist aus dem beantwortbar, was im Kurs davor steht, und trägt im Drehbuch `(← Sn)`. | Wer abgefragt wird, bevor der Input kam, rät, und die Rückmeldung „falsch“ trifft dann fehlendes Vorwissen statt fehlendes Verständnis. |
| D2 | Rhythmus Lesen → Üben → Sichern: auf jeden kurzen Input folgt eine Übung dazu, am Ende der Einheit eine Sicherung (Quiz, Test, Merke). | Die Übung prüft den Input, solange er noch präsent ist, und die Sicherung zeigt Lernenden und Lehrkraft, was von der Einheit bleibt. |
| D3 | Jede Phase und jede Aufgabe hat einen Zweck; er steht als Stichpunkt im Marker des Drehbuchs (`[Quelle: Folie 3 · Zweck: Vorwissen aktivieren]`, `[KI: Zweck: Router und Switch unterscheiden]`), nie im Kurs. | Ein Element ohne nennbaren Zweck wird gestrichen, und im Kurs wäre der Zweck Meta-Text, den die Lernenden nicht brauchen. |
| D4 | Jede Aufgabe prüft genau eine Sache. | Prüft eine Frage zwei Dinge, zeigt eine falsche Antwort nicht, woran es lag, und die Rückmeldung kann nicht gezielt helfen. |
| D5 | Rückmeldung je Antwortoption, wo das Format es zulässt (MC als Liste mit `→`, RF mit `→ richtig:`/`→ falsch:`): bei falschen Optionen die Fehlvorstellung und die Stelle im Input, bei der richtigen der Grund. | Ein bloßes „falsch“ lässt die Fehlvorstellung stehen, aus der der Distraktor gebaut ist. |
| D6 | Der Anspruch steigt, in der Einheit und über den Kurs: erst Wiedererkennen (Zuordnen, Richtig/Falsch), dann Anwenden auf einen Fall, zuletzt ein neuer Fall. | Die Anwendung baut auf gesicherten Begriffen auf, und erst der neue Fall zeigt, ob das Gelernte übertragbar ist. |
| D7 | Höchstens die Hälfte der Elemente einer Einheit ist H5P; Input steht als Textfeld oder Seite, Videos als Link. | Jedes H5P-Element ist eine eigene Aktivität mit eigener Ladezeit, und ohne Lesetext fehlt der Input, auf den sich die Übungen beziehen. |
| D8 | Zeitcheck: jede Seite und Aufgabe bekommt Minuten (Werte in `intake.md` §5), je Einheit summiert gegen das Soll; über 20 % Abweichung steht ein Vorschlag zum Kürzen oder Ergänzen dabei. | Die Lehrkraft plant mit Unterrichtsminuten, und ein Kurs, der deutlich länger dauert als angekündigt, passt nicht in die Stunde. |
| D9 | Anwendung vor Wissen: abgefragt werden Fälle, Situationen und Entscheidungen statt Definitionen, mit erfundenen Personen und Marken. | Ob ein Begriff verstanden ist, zeigt sich am Fall, und erfundene Namen vermeiden Werbung und Bezüge auf echte Personen. |
| D10 | Der Einstieg einer Einheit ist ein konkreter Fall oder eine Frage aus dem Alltag der Lernenden, unbewertet, aufgelöst im folgenden Input. | Die Frage gibt dem Input eine Richtung; bewertet wäre sie ein Test auf Vorwissen (D1). |
