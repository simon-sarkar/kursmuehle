# AP9 – Fremdtest

Ziel: Ein frischer Agent bekommt nur dieses Repo und den Satz „Mach mir eine Einheit zu Bruchrechnen für Jgst 6,
45 Minuten, Selbstlernkurs“. Er läuft ohne weitere Hilfe bis zur `.mbz`. Protokolliert werden: Zahl der
Rückfragen, Stellen, an denen er geraten hat, Abweichungen vom Ablauf in SKILL.md, Slop im Drehbuch (gegen
`qualitaet.md`), Laufzeit und Tokenverbrauch. Ergebnis als `arbeitspakete/AP9_protokoll.md` mit konkreten
Änderungsvorschlägen an SKILL.md/intake.md. Import-Test durch den Autor.

Zusätzlich: Der Fremdtest läuft mit einem günstigen Modell (Sonnet-Klasse), nicht mit dem teuersten. Tokenverbrauch
(Eingabe/Ausgabe) für die 45-Minuten-Einheit wird gemessen und als Richtwert in die README geschrieben. Release-Zip
für Lehrkräfte (`scripts/package.py`: nur SKILL.md, references/ ohne export-schemata, scripts/, examples/) erzeugen;
`arbeitspakete/` nach `docs/entwicklung/` verschieben.
