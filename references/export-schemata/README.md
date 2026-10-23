# Export-Schemata (abgeleitet, Stand 2026-10-23)

Abgeleitet aus der Sicherung eines leeren Testkurses (Moodle 5.2, ohne Nutzerdaten) mit je einer Instanz von
29 Modultypen sowie aus einem Export desselben Kurses im Kachelformat. Enthalten sind nur Aktivitäts- und
Abschnittsdateien ohne personenbezogene Daten; `course.xml` und `files/` der Originale sind nicht enthalten.
IDs sind beliebig; beim Generieren gelten die Regeln aus `../spec.md` (fortlaufende IDs, Querverweise in
`moodle_backup.xml`, `inforef.xml`, `files.xml`).

- `aktivitaeten/<mod>/module.xml` + `<mod>.xml` (+ `grades.xml`, wo ein Bewertungsposten entsteht): das
  Minimalschema jeder Aktivität mit den Standardwerten der Plattform. Fehlende Typen: `hvp` (siehe
  `../h5p-vorlagen.md`), Spiele (`hangman`, `cross`, `cryptex`, `hiddenpicture`, `millionaire`), `learningmap`,
  `geogebra`, `imscp`, `scorm` – diese brauchen Dateien oder eigene Formulare und sind noch nicht exportiert.
- `kachelformat/`: `courseformatoptions.xml` (Kursoptionen des Kachelformats), `section_mit_tilephoto.xml`
  (Abschnitt mit Kachelfoto: `plugin_format_tiles_section` optiontype 1 + `course_format_options` tilephoto),
  `files_tilephoto_beispiel.xml` (Dateieintrag: component `format_tiles`, filearea `tilephoto`, itemid = Abschnitts-ID,
  filepath `/tilephoto/`). Kachel-Icon je Abschnitt: Option `tileicon` (nicht exportiert, Mechanismus identisch).
- `moodle_backup_29module.xml`: die Inhaltsliste (`<activities>`, `<sections>`, `<settings>`) mit allen 29 Modulen –
  Vorlage dafür, welche Einträge je Modultyp in `moodle_backup.xml` nötig sind.

Formatoptionen aller acht Kursformate: `../formate.md`.
