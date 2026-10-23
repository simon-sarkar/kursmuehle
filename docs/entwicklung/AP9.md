# AP9 – Fremdtest

Ziel: Ein frischer Agent bekommt nur dieses Repo und den Satz „Mach mir eine Einheit zu Bruchrechnen für Jgst 6,
45 Minuten, Selbstlernkurs“. Er läuft ohne weitere Hilfe bis zur `.mbz`. Protokolliert werden: Zahl der
Rückfragen, Stellen, an denen er geraten hat, Abweichungen vom Ablauf in SKILL.md, Slop im Drehbuch (gegen
`qualitaet.md`), Laufzeit und Tokenverbrauch. Ergebnis als `docs/entwicklung/protokolle/AP9_fremdtest.md` mit konkreten
Änderungsvorschlägen an SKILL.md/intake.md. Import-Test durch den Autor.

Zusätzlich: Der Fremdtest läuft mit einem günstigen Modell (Sonnet-Klasse), nicht mit dem teuersten. Tokenverbrauch
(Eingabe/Ausgabe) für die 45-Minuten-Einheit wird gemessen und als Richtwert in die README geschrieben. Release-Zip
für Lehrkräfte (`scripts/package.py`: nur SKILL.md, references/ ohne export-schemata, scripts/, examples/) erzeugen;
`arbeitspakete/` nach `docs/entwicklung/` verschieben (erledigt in 1.0).

Richtwerte aus 0.1 (23.10.2026): eine 25-Minuten-Einheit in ca. 3 Minuten; ein kompletter Kurs (Geschichte, mehrere
Abschnitte, Bilder vom Assistenten generiert, ChatGPT) in ca. 7 Minuten. 1.0 muss das halten: Einheit unter 5 Minuten,
Kurs mit Bildern unter 10. Zeit wird im Fremdtest mitgemessen.

Projektseite: GitHub Pages aus `docs/` (Logo, Palette Creme/Anthrazit/Ocker, Schnellstart, Download des Skill-Zips),
aus der README verlinkt – die Adresse für Lehrkräfte, das Repo für Entwickler.

Feedback und Verbreitung (Ziel des Autors: Nutzung im Alltag und Rückmeldungen): Feedback-Weg ohne GitHub-Konto
(kurzes Formular oder Projektadresse) auf der Projektseite und einmal am Ende des Skill-Ablaufs genannt; Seite
„Erfahrungen“ im Repo für Rückmeldungen und gebaute Kurse; die ersten Nutzer persönlich nach einer Woche fragen.
Kanal für Lehrkräfte: fertiger Beispielkurs auf teachSHARE mit Hinweis „so entstanden“, Fortbildung oder Beitrag
bei Medienpädagogischen Beratern – nicht GitHub.

Kostenlos: Zusätzlich je ein Durchlauf mit einem kostenlosen Konto (ChatGPT Free, Gemini Free) – eine 25-Minuten-Einheit
muss innerhalb des Tageslimits durchlaufen. Ergebnis als Zeile „läuft mit …“ in die README. Scheitert es, ist der
Grund (Lesemenge, Ausgabemenge, fehlende Code-Ausführung) festzuhalten und zu beheben, nicht zu dokumentieren.
