# Erfahrungen

Rückmeldungen von Lehrkräften und gebaute Kurse, soweit die Beteiligten sie nennen wollen. Keine Namen, keine Schulen,
keine Kurssicherungen; Links nur auf frei zugängliche Kurse (etwa teachSHARE).

## Gebaute Kurse

| Datum | Fach, Jahrgangsstufe | Umfang | Assistent | Weg (Thema, Material, Fragen, Delta) | Was gut lief | Was hakte |
|---|---|---|---|---|---|---|
| 2026-10-23 | Informatik 9, Netzwerkkomponenten (`examples/netzwerk9`) | 25 min | Claude Code | Material (Folien, Heftbilder) | Drehbuch aus Folien in einem Durchgang | Bilder nur gerendert, nicht erzeugt |
| 2026-10-23 | Geschichte, mehrere Abschnitte | Kurs | ChatGPT | Thema | Bilder vom Assistenten erzeugt und eingebunden, etwa 7 Minuten | noch mit Version 0.1, ohne Kursdatei |
| 2026-10-23 | Mathematik 9 (Mittelschule), Satz des Pythagoras | 45 min, eine Einheit | ChatGPT Gratiskonto, GPT-5.6 Terra, Aufwand Medium | Fragen, KI macht alles | Drehbuch nach 5 Minuten, fachlich korrekt, Rückmeldung je Antwortoption | hielt mit falscher Meldung „kein Python“ an, baute erst auf Nachfrage; keine Grafik, drei kurze Lesetexte, 43 Minuten etikettiert bei etwa 15 Minuten Stoff |
| 2026-10-23 | Mathematik 9 (Mittelschule), Satz des Pythagoras | 45 min, eine Einheit | ChatGPT Gratiskonto, GPT-6 Luna, Aufwand Extra High | Fragen, KI macht alles | 4 Minuten bis zur .mbz ohne Halt; beschriftetes Dreieck, Banner und Badge selbst gezeichnet; durchgerechnete Beispiele, Abschlusstest mit zehn Fragen, acht davon Fälle | nur pythagoreische Tripel, kein Rundungsfall; alle Übungen Multiple Choice; Begründung der Formel nur als Tabelle; Import steht aus |
| 2026-10-23 | Mathematik 9 (Mittelschule), Satz des Pythagoras | 45 min, eine Einheit | AIS-Chat, GPT-5.5 (ohne Code, nur Drehbuch) | Thema, KI macht alles | Drehbuch in unter 30 s, Rechnungen richtig, Lernkarten, Zuordnen, Quiz und Moodle-Test mit zehn Fragen | etwa 330 Wörter Lesetext; Testangaben in einer Zeile brachen den Bau (behoben in 1.0.3); Kurzantwort `a² + b² = c²` schwer einzutippen |
| 2026-10-23 | Mathematik 9 (Mittelschule), Satz des Pythagoras | 45 min, eine Einheit | fobizz, GPT-6.1 Sol (ohne Code, nur Drehbuch) | Thema, KI macht alles | etwa 4 min, rund 960 Wörter Lesetext, Rundungsfall, Fehler finden, Fall ohne rechten Winkel, sieben Heftaufgaben mit Lösungen | Formeln in LaTeX, Leerzeilen nach `Schritte:`, Liefertexte in der Kursdatei (alle drei behoben in 1.0.3) |

## Rückmeldungen

Rückmeldungen kommen über den Weg auf der Projektseite (ohne GitHub-Konto) oder als Issue. Hier stehen sie zusammengefasst,
nach Datum, mit dem, was daraus im Skill geändert wurde.

| Datum | Rückmeldung | Folge |
|---|---|---|
| 2026-10-23 | Eigener Test: mit mittlerem Aufwand stoppt ChatGPT vor dem Bau und behauptet, Python fehle | SKILL.md 1.0.2: Bau sofort nach Freigabe, keine Vorab-Behauptung über fehlende Code-Ausführung |
| 2026-10-23 | Eigener Test: Kursqualität hängt stark von Modell und Aufwand ab | README, Seite und Skill-Menü: Aufwand Extra High bei ChatGPT; bei kleinen Modellen Aufbau, Übungstypen und Umfang genau vorgeben |
| 2026-10-23 | Eigener Test: Drehbücher aus AIS-Chat und fobizz bauen erst nach Handkorrekturen am Format | Parser 1.0.3: Angaben mit ` · ` in einer Zeile, Leerzeile nach `Schritte:`, Liefertexte ignoriert, LaTeX in Klartext |
