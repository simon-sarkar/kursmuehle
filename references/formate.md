# Kursformate der ByCS-Lernplattform (gelesen 2026-10-23 aus dem Kurseinstellungsformular)

Werte: `option=[auswahl]:standard`; Checkboxen 0/1 (zweiter Wert = Standard). Die Optionen landen in der Sicherung
in `course/course.xml` unter `<courseformatoptions>` (je `<courseformatoption><format>…</format><sectionid>0</sectionid><name>…</name><value>…</value>`),
abschnittsbezogene Optionen (z. B. Kachelbild/-icon) mit der jeweiligen `sectionid`. Belegt für `topics`; die anderen
Formate folgen demselben Mechanismus (Moodle-Kern), Export je Format noch nicht geprüft.

| Format | Name | Optionen (Kursebene) |
|---|---|---|
| topics | Themenabschnitte | hiddensections=[1\|0]:1; coursedisplay=[0\|1]:0 |
| weeks | Wochenabschnitte | hiddensections=[1\|0]:1; coursedisplay=[0\|1]:0 |
| singleactivity | Einzelaktivität | activitytype=[mootyper\|choice\|assign\|board\|book\|checklist\|resource\|data\|lti\|feedback\|forum\|workshop\|geogebra\|ratingallocate\|glossary\|imscp\|hvp\|kanban\|aichat\|lesson\|learningmap\|scorm\|lightboxgallery\|url\|moodleoverflow\|mootimeter\|individualfeedback\|game\|journal\|quiz\|page\|subcourse\|folder\|wiki]:forum |
| learningmap | Lernlandkarte | hidesecondarynavforstudents=0 |
| mimo | Mimo | enablemultisection=0; enablefiltering=1; distractionfree=0; backgrounddesign=[primary-school\|darkmode\|whiteboard\|pinnwand\|paper]:primary-school; activityprofile=[base\|base_symbols\|primary_horst]:base |
| onetopic | Ein-Themen-Format | hiddensections=[0\|1\|2]:1; hidetabsbar=[0\|1]:0; coursedisplay=[0\|1]:0; templatetopic=[0\|1\|2]:0; templatetopic_icons=[0\|1]:0; tabsview=[0\|1\|4\|2]:0; usessectionsnavigation=[0\|1\|2\|3\|4\|5]:0; usescourseindex=[2\|0\|1]:2 |
| tiles | Kachelformat | defaulttileicon=[pie-chart … (ca. 100 FontAwesome-Namen, z. B. book, lightbulb-o, flask, globe, laptop, puzzle-piece, trophy)]:pie-chart; basecolour=[#00A8D5\|#305b83\|#a42e49\|#8f2a59\|#5a307e\|#3e4e5b]:#00A8D5; courseusesubtiles=0; usesubtilesseczero=0; courseshowtileprogress=[0\|1\|2]:0; displayfilterbar=[0\|1]:0; courseusebarforheadings=1; courseshownewactivities=1 |
| topcoll | Komprimierte Abschnitte | hiddensections=[1\|0]:1; displayinstructions=[0\|1\|2]:0; layoutelement=[0\|1\|3\|2\|5\|4\|8\|6\|7]:0; layoutstructure=[0\|1\|2\|3\|4\|5]:0; layoutcolumnorientation=[0\|3\|2\|1]:0; layoutcolumns=[0\|1\|2\|3\|4]:0; flexiblemodules=[0\|1\|2]:0; toggleallenabled=[0\|1\|2]:0; viewsinglesectionenabled=[0\|1\|2]:0; togglealignment=[0\|1\|2\|3]:0; toggleiconposition=[0\|1\|2]:0; toggleiconset=[-\|arrow\|bulb\|cloud\|eye\|folder\|groundsignal\|led\|point\|power\|radio\|smiley\|square\|sunmoon\|switch\|tif]:-; toggleiconfontclosed=-; toggleiconfontopen=-; onesection=[0\|1\|2]:0; toggleallhover=[0\|1\|2]:0; toggleforegroundcolour=-; toggleforegroundopacity=[-\|0.0…1.0]:-; toggleforegroundhovercolour=-; toggleforegroundhoveropacity=[-\|0.0…1.0]:-; togglebackgroundcolour=-; togglebackgroundopacity=[-\|0.0…1.0]:-; togglebackgroundhovercolour=-; togglebackgroundhoveropacity=[-\|0.0…1.0]:-; showsectionsummary=[0\|1\|2]:0 |

Kein Grid-Format auf der Plattform. Kachelformat: Kachelbild und -icon je Abschnitt sind Abschnittsoptionen
(`tilephoto`, `tileicon`, `tileoutcomeid`); Schema des Kachelbilds aus einem Kachel-Export belegt
(`export-schemata/kachelformat/`), das Icon nicht (gleicher Mechanismus, `course_format_options` `tileicon`).

## Umsetzung im Generator (seit 0.7, `gen/mbz.py`)

| Steckbrief `kurs.format` | Moodle | Gebaut |
|---|---|---|
| `themen` (Standard) | topics | Kursoptionen aus der Tabelle oben |
| `kacheln` | tiles | Kursoptionen (`basecolour` = nächste Plattformfarbe zur Akzentfarbe, `courseshowtileprogress 1`), je Abschnitt `kachelbild:` und `kachelicon:` aus der Kursdatei |
| `wochen` | weeks | Kursoptionen; Wochen zählen ab `kurs.start` (JJJJ-MM-TT, Standard: Bautag) |
| `einthemen` | onetopic | Kursoptionen mit Standardwerten |
| `komprimiert` | topcoll | Kursoptionen mit Standardwerten |
| `einzelaktivitaet` | singleactivity | genau ein Element in der Kursdatei; es landet in Abschnitt 0, `activitytype` = sein Modul |

`kurs.formatoptionen: {name: wert}` überschreibt einzelne Kursoptionen (Entwicklerweg, Werte aus der Tabelle oben);
`build.py --format <name>` überschreibt den Steckbrief. Lernlandkarte und Mimo nach 1.0.

Kachelbild in der Sicherung: `section.xml` mit `plugin_format_tiles_section` (optiontype 1, optionvalue = Dateiname,
tilesversion 2026012570) und `course_format_options` (`tilephoto`); Datei `format_tiles / tilephoto / <Abschnitts-ID> /
/tilephoto/` im Kurskontext, referenziert aus `sections/section_<id>/inforef.xml`. Icon nur als `course_format_options`
(`tileicon`, FontAwesome-4-Name).

Import: Moodle übernimmt `course.xml` (Format und Kursoptionen) in einen bestehenden Kurs nur mit
„Kurseinstellungen überschreiben: Ja“ (`restore_course_task`, Setting `overwrite_conf`, Standard Nein) und die
Abschnittsoptionen (Kachelbilder) nur, wenn der Zielkurs dasselbe Format hat (`restore_stepslib`,
`process_course_format_options`). Beim Zusammenführen (Delta) bleibt das Format des Zielkurses.

# Modultypen der Plattform (Aktivitätsauswahl, 39)

mootyper 10-Finger-Tastschreiben · choice Abstimmung · assign Aufgabe · board Board · book Buch · checklist Checkliste ·
resource Datei · data Datenbank · feedback Feedback · forum Forum · workshop Gegenseitige Beurteilung · geogebra Geogebra ·
ratingallocate Gerechte Verteilung · glossary Glossar · imscp IMS-Content · hvp Interaktiver Inhalt · kanban Kanban-Board ·
aichat KI-Chat · lesson Lektion · learningmap Lernlandkarte · scorm Lernpaket · lightboxgallery Lightbox Galerie ·
url Link/URL · moodleoverflow Moodleoverflow · mootimeter Mootimeter · individualfeedback Schüler-Feedback ·
hangman/cross/cryptex/hiddenpicture/millionaire Spiele (Galgenmännchen, Kreuzworträtsel, Suchrätsel, Verstecktes Bild,
Wer wird Millionär) · journal Tagebuch · quiz Test · label Text- und Medienfeld · page Textseite · unilabel Universelles
Textfeld · subcourse Unterkurs · folder Verzeichnis · wiki Wiki.

Kein Kern-H5P (`h5pactivity`) in der Auswahl – H5P läuft ausschließlich über `hvp`.
