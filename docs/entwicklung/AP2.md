# AP2 – Prüfskript und site.json entfernen

Ziel 1: `scripts/check.py <datei.mbz>` prüft eine Sicherung vor dem Import und gibt eine kurze Liste aus:
- Archiv entpackbar, `moodle_backup.xml` vorhanden, alle dort gelisteten Aktivitäten/Abschnitte existieren als Ordner
- jede `files.xml`-Zeile hat eine Datei unter `files/xx/<hash>`, Hash stimmt (sha1), und jede Datei wird referenziert
- `inforef.xml` je Aktivität verweist nur auf existierende Dateien/Bewertungsposten
- H5P: Bibliotheksversionen aus `scripts/gen/libs.py`, `json_content` ist gültiges JSON, Bilder in `images/` vorhanden
- Abschnitts- und Modulnummern fortlaufend, keine doppelten IDs
- Verfügbarkeits-JSON (`sichtbar ab`) gültig
Ausgabe: `OK` oder Liste `FEHLER <wo> <was>`; Exit-Code 1 bei Fehlern. `build.py` ruft `check.py` am Ende selbst auf.

Ziel 2: `scripts/site.json` und alle Verweise (SKILL.md, spec.md §B.1, README, build.py) entfernen. Belegt am
23.10.2026: Import mit Platzhalterwerten in einem anderen Account funktioniert; die Werte sind bedeutungslos.
Feste Platzhalter wandern als Konstanten in `gen/mbz.py`.

Abnahme: `check.py` meldet OK für den Netzwerk9-Build und findet absichtlich eingebaute Fehler (fehlende Datei,
falscher Hash, kaputtes JSON) – je ein Testfall in `scripts/tests/`.
