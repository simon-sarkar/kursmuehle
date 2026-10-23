# AP6 – Kursformate

Ziel: `course.xml` mit `<format>` und `<courseformatoptions>` je Format; Steckbrief-Feld `format` mit Optionen.
Werte: `references/formate.md` (Kursebene, alle acht Formate). Kachelformat zusätzlich je Abschnitt:
`plugin_format_tiles_section` (optiontype 1 = Foto) + `course_format_options` `tilephoto`/`tileicon`, Foto als Datei
(component `format_tiles`, filearea `tilephoto`, itemid = Abschnitts-ID, filepath `/tilephoto/`) – siehe
`references/export-schemata/kachelformat/`.

Reihenfolge: Kacheln (mit Kachelbild/-icon je Abschnitt im Steckbrief) → Wochen → Ein-Themen → Komprimierte
Abschnitte → Einzelaktivität. Lernlandkarte und Mimo nach 1.0.

Abnahme: `examples/netzwerk9` baut in jedem Format (`--format tiles` o. ä.), `check.py` OK, Import-Test durch den Autor.
