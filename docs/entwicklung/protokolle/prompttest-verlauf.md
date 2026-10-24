# Prompttest im Verlauf (seit AP13.3)

Je Lauf eine Tabelle, angehängt von `scripts/tests/prompttest.py` (Workflow `prompttest.yml`, wöchentlich und von
Hand). Zehn Aufträge über Fächer und Jahrgangsstufen, Vorlage Einführung, Typ automatisch, Zeit durch das Modell, Text
wie in der Mühle für ByLKI; Antwort eines Modells der Sonnet-Klasse über die API; Prüfung wie auf der Seite
(`api.pruefe` mit Kursmappe). „Korrekturen“ = rote Meldungen, also Korrekturbitten der Mühle, je Regel mit der Kennung
aus `gen/api.py` (REGELN). Die letzte Spalte meldet bei Themen ohne Verfahren, ob im Kursinhalt eine Rechnung, ein
Maßstab oder eine Formel steht (grobes Muster, von Hand nachsehen). Keine Inhalte, keine Namen.

## 2026-10-24 · drei Aufträge, Subagenten der Sonnet-Klasse (Antworten in ap11-prompttest/, Lauf aus AP13.3)

| Auftrag | Bausteine | Korrekturen | Regeln | Einstieg (min) | Rechnung/Maßstab/Formel ohne Verfahren |
|---|---|---|---|---|---|
| pythagoras | 7 | 0 | – | 3 | nein |
| ohr | 6 | 0 | – | 3 | nein |
| eichhoernchen | 5 | 1 | format.frage 1 | 3 | nein |

Korrekturen je Regel: format.frage 1

