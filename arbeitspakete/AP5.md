# AP5 – Neue Modultypen

Ziel: Generator-Klassen in `scripts/gen/mbz.py` für Test (`quiz`, mit Fragensammlung in `questions.xml`),
Aufgabe (`assign`), Datei (`resource`), Forum, Buch (`book` mit Kapiteln), Abstimmung (`choice`), Verzeichnis
(`folder`), Glossar (`glossary`). Schemata: `references/export-schemata/aktivitaeten/<mod>/` (module.xml,
<mod>.xml, grades.xml) und `moodle_backup_29module.xml` für die Einträge in `moodle_backup.xml`.

Je Modul: Klasse nach dem Muster von `Page`/`Feedback` (Konstruktor mit den inhaltlichen Feldern, Rest Standardwerte
aus dem Schema), Eintrag in `spec.md` (Tabelle Modultypen), Beispiel in `examples/module/` (ein Abschnitt mit allen
neuen Typen), Kursdatei-Syntax (AP1) für jeden Typ. Test braucht die meiste Sorgfalt: Fragen landen im Backup unter
`questions.xml` (question_categories/questions/answers) und werden im `quiz.xml` referenziert; Multiple Choice,
Wahr/Falsch, Kurzantwort reichen für 1.0.

Abnahme: Build läuft, `check.py` OK, Import-Test durch den Autor (Beispielkurs `examples/module`).
