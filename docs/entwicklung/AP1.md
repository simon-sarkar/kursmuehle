# AP1 – Kursdatei statt Python

Ziel: Der Kursinhalt wird nicht mehr als `content/course.py` geschrieben, sondern als eine Textdatei (`kurs.md` oder
`kurs.yaml`), die `scripts/build.py` direkt liest. Fremde Assistenten schreiben dann keinen Python-Code mehr.

Anforderungen:
- Das Format ist so knapp, dass das **Drehbuch selbst die Kursdatei sein kann** (siehe `references/intake.md`,
  Abschnitt Drehbuch, und `examples/netzwerk9/` als Vorbild: ein Abschnitt, neun Elemente, 25 min).
- Elementtypen: Textfeld, Seite, Link/Video, H5P (Question Set mit MC/RF/Drag the Words/Lückentext, Drag and Drop,
  Lernkarten, Interactive Book, Branching Scenario), Feedback, Badge; Unterabschnitte; `sichtbar ab`; Bilder per
  Dateiname aus `assets/`.
- Zweck- und Quellenmarkierungen im Drehbuch (`[Quelle: …]`, `[KI]`, `(← Sn)`, Zeitangaben) werden vom Parser
  **ignoriert**, nie in den Kurs übernommen.
- Fehlermeldungen des Parsers nennen Zeile und Element; unbekannte Typen brechen ab, statt still zu raten.
- `examples/netzwerk9/` und `examples/alltagskompetenz/` werden auf das neue Format umgestellt; `course.py` bleibt
  als Fallback (`--content` mit Python weiterhin möglich).
- SKILL.md und `references/intake.md` beschreiben das Format in höchstens einer Seite; `spec.md` verweist darauf.

Abnahme: `python3 scripts/build.py --content examples/netzwerk9 --no-render` baut aus der Kursdatei eine `.mbz`,
die inhaltlich der bisherigen entspricht (Vergleich der entpackten XML ohne IDs/Zeitstempel). Import-Test macht der Autor.
