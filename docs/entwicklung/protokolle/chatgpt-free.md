# Durchlauf mit ChatGPT Free (Autor)

Ziel (AP9): Eine Einheit läuft mit einem kostenlosen ChatGPT-Konto innerhalb des Tageslimits bis zur `.mbz`.
Scheitert es, wird der Grund festgehalten und behoben, nicht nur dokumentiert.

## Aufbau (23.10.2026)

- Konto: kostenloses ChatGPT-Konto. Zwei Durchläufe mit verschiedenem Modell und Aufwand (Tabelle).
- Eingaben in dieser Reihenfolge: Skill-Zip mit „Entpacke das und lies SKILL.md“; „Starte den Skill“; Weg „Fragen“;
  Steuerungsgrad c; „Mathematik Satz des Pythagoras, 9. Klasse Mittelschule, Selbstlernkurs ca. 45 min, eine Einheit“.

## Messung

| Größe | Durchlauf A | Durchlauf B |
|---|---|---|
| Datum | 23.10.2026 | 23.10.2026 |
| Modell und Aufwand laut Oberfläche | GPT-5.6 Terra, Medium | GPT-6 Luna, Extra High |
| Uhrzeit Start bis Ende | 22:05 bis 22:14 | 22:21 bis 22:25 |
| Minuten gesamt | 9 | 4 |
| Halt vor dem Bau | ja, etwa 4 min, mit der Meldung „keine lauffähige Python-Umgebung“; auf Nachfrage gebaut | nein |
| Code-Ausführung verfügbar | ja (die Meldung war falsch) | ja |
| Nachrichten bis zum Drehbuch, bis zur `.mbz` | nicht erfasst | nicht erfasst |
| Tageslimit erreicht | nicht erfasst | nicht erfasst |
| `check.py`-Ausgabe | nicht erfasst | nicht erfasst |
| Import auf der Plattform | nicht erfasst | steht aus |

## Beobachtungen

| | Durchlauf A | Durchlauf B |
|---|---|---|
| Bilder | keine | drei selbst gezeichnete: beschriftetes Dreieck, Banner, Badge |
| Lesetext | drei kurze Lesetexte | rund 900 Wörter mit durchgerechneten Beispielen |
| Übungen | zwei Übungsblöcke | zwei Übungsblöcke |
| Abschluss | Abschlusstest | H5P-Abschlusstest mit zehn Fragen, davon acht Fälle |

Nicht erfasst: Lesemenge (SKILL.md vollständig?), zusätzlich gelesene Dateien, Slop-Treffer im Drehbuch, Zeitcheck,
Anzahl der Bauläufe.

## Ergebnis

Zeile für die README: Mit kostenlosem ChatGPT-Konto entstand die Einheit in beiden Durchläufen; mit Aufwand Extra High
in 4 min ohne Halt und mit Bildern, mit Aufwand Medium in 9 min, dünner und mit falschem Halt vor dem Bau.

Beide Durchläufe kamen bis zum Kurs. Zwei Schwächen und was in 1.0.2 geändert wurde:

- Falscher Halt in A (Modell meldete fehlendes Python, baute auf Nachfrage): `SKILL.md` verlangt jetzt den Bau sofort
  nach der Freigabe, bei Steuerungsgrad c ohne Halt, und verbietet die Vorab-Behauptung, Code-Ausführung fehle; erst ein
  gescheiterter Aufruf führt zu Fehlermeldung plus Drehbuch und Steckbrief als Dateien.
- Dünner Kurs in A: README und Projektseite empfehlen bei ChatGPT den Aufwand „Extra High“, den es auch im Gratiskonto gibt.
