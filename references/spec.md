# Spezifikation ByCS-Kurssicherung (normativ)


Alles Folgende ist normativ. Werte exakt übernehmen. Stand: 2026-10-22, verifiziert durch Import auf lernplattform.bycs.de
und Rendertest mit den gelisteten Bibliotheksversionen.

### A. Plattform

- Moodle 5.2.4; Kursformate `topics`, `tiles`, `weeks`, `onetopic`, `topcoll`, `singleactivity` (Optionen: `formate.md`);
  Unterabschnitte (mod_subsection) aktiv.
- H5P = **mod_hvp** („Interaktiver Inhalt“). Inhalt liegt als JSON in `hvp.xml` (`json_content`). Keine `.h5p`-Dateien.
- Bibliotheksversion muss exakt (major.minor) installiert sein; Nachinstallation unmöglich. Nur Versionen aus B.2 verwenden.
- HTML in Textfeld/Seite wird gefiltert: Inline-CSS ja, JavaScript nein. Theme zeichnet Rahmen um jede `<td>`.
- Badges werden inaktiv importiert. Wiederherstellen durch Lehrkraft erlaubt.

### B. Konstanten

B.1 Kopf/Versionen

| Schlüssel | Wert |
|---|---|
| moodle_version | 2026042004 |
| moodle_release | 5.2.4 (Build: 20261005) |
| backup_version | 2026042000 |
| backup_release | 5.2 |
| original_wwwroot | https://lernplattform.bycs.de |
| module.xml version hvp | 2026062501 |
| module.xml version subsection/label/page/feedback/url/quiz/assign/resource/folder/forum/book/choice/glossary | 2026042000 |
| course customfields | `schule` (text, Wert leer) · `participants` (checkbox, 0) |
| format_tiles tilesversion (section.xml) | 2026012570 |

Herkunftsangaben (`original_site_identifier_hash`, `original_course_id`, `original_course_contextid`, Kategorie) sind feste
Platzhalter in `gen/mbz.py`. Beim Import in einen bestehenden Kurs sind sie ohne Bedeutung (belegt 2026-10-23: Import mit
diesen Platzhaltern in einem fremden Account); die Lehrkraft wählt den Zielkurs beim Wiederherstellen.

B.2 H5P-Bibliotheken (library-String = `machine_name major.minor`)

```
H5P.InteractiveBook 1.15   H5P.Column 1.22          H5P.BranchingScenario 1.11  H5P.BranchingQuestion 1.0
H5P.QuestionSet 1.21       H5P.DragQuestion 1.15    H5P.Blanks 1.14             H5P.Dialogcards 1.9
H5P.CoursePresentation 1.27 H5P.AdvancedText 1.1    H5P.Image 1.1               H5P.MultiChoice 1.16
H5P.TrueFalse 1.8          H5P.DragText 1.10        H5P.MarkTheWords 1.11       H5P.Summary 1.10
H5P.SingleChoiceSet 1.11
```
Vorlagen (`json_content` mit deutschen UI-Strings): Anhang A. Vorlage übernehmen, nur Inhalte ersetzen.

B.3 Fallback bei unbekanntem Typ oder Öffnungsfehler: Lehrkraft legt eine Aktivität „Interaktiver Inhalt“ des Typs
(inkl. Bausteine) mit Platzhalter an, sichert den Kurs ohne Nutzerdaten; aus `activities/hvp_*/hvp.xml` `machine_name`,
`major_version`, `minor_version` und die `library`-Strings in `json_content` lesen; Vorlage in Anhang A ergänzen.

### C. Archiv

- `.mbz` = **tar.gz** (nicht ZIP). Erster Eintrag `.ARCHIVE_INDEX`, Format:
  `Moodle archive file index. Count: N` + je Zeile `pfad<TAB>d|f<TAB>bytes<TAB>mtime` (Verzeichnisse: `pfad/`, 0, `?`).
- Pflichtdateien:
```
moodle_backup.xml  files.xml  files/<hash[:2]>/<sha1>  moodle_backup.log (leer)
roles.xml scales.xml outcomes.xml questions.xml groups.xml grade_history.xml completion.xml gradebook.xml badges.xml
course/{course,inforef,roles,filters,calendar,contentbank,completiondefaults,enrolments}.xml
sections/section_<id>/{section,inforef}.xml
activities/<mod>_<cmid>/{module,<mod>,grades,inforef,roles,filters,calendar,grade_history}.xml
```
  Leere Standarddateien und Skelette wörtlich aus Anhang B.
- XML: Prolog `<?xml version="1.0" encoding="UTF-8"?>`; NULL = `$@NULL@$`; HTML-Inhalte XML-escaped; Zeiten Unix-Sekunden.
- IDs (course, context, section, cmid, instance, file, grade_item, badge) nur archivintern eindeutig; Zähler ab 900000.

### D. moodle_backup.xml

- Kopf: Anhang B. `<contents><activities>` je Aktivität in Kursreihenfolge:
  `moduleid, sectionid, modulename, title, directory, insubsection` (`1` wenn in Unterabschnitt, sonst leer).
- `<sections>`: je Abschnitt `sectionid, title (Nummer oder Name), directory, parentcmid, modname`
  (Unterabschnitt: `parentcmid` = cmid des subsection-Moduls, `modname` = `subsection`). Reihenfolge: reguläre Abschnitte,
  dann Unterabschnitte.
- `<settings>`: root-Liste aus Anhang B; je Abschnitt `section_<id>_included=1`, `_userinfo=0`; je Aktivität
  `<mod>_<cmid>_included=1`, `_userinfo=0`. Ausnahme nur mit `build.py --mit-nutzerdaten`, Glossar mit Einträgen (G): root `users=1`, `glossary_<cmid>_userinfo=1`
  und `userinfo=1` für seinen Abschnitt sowie bei Unterabschnitten für das subsection-Modul und dessen Abschnitt (Moodle
  sperrt das Modul-Setting sonst, `restore_activity_task`); dazu `users.xml` = `<users></users>`. Alle anderen Settings
  bleiben 0. `original_course_format` = `<format>` aus course.xml.

### E. Abschnitte

`section.xml`: `number` (regulär 0..n, Unterabschnitte danach fortlaufend), `name` (`$@NULL@$` = Standard), `summary`,
`summaryformat 1`, `sequence` (cmids, kommagetrennt, inkl. subsection-Module), `visible 1`, `availabilityjson $@NULL@$`,
`component`/`itemid` (`$@NULL@$`; Unterabschnitt: `mod_subsection` / Instanz-ID des subsection-Moduls), `timemodified`.
Aktivitäten eines Unterabschnitts: `sectionid`/`sectionnumber` in module.xml = der Unterabschnitt.
Kachelformat (regulärer Abschnitt mit Kachelbild/-icon): nach `timemodified` `plugin_format_tiles_section sectionid="<id>"`
(`optiontype 1`, `optionvalue` = Dateiname, `tilesversion` B.1) und je Option `course_format_options id` (`format tiles`,
`name tilephoto|tileicon`, `value`); Bilddatei nach H, `fileref` in `sections/section_<id>/inforef.xml`.

### F. module.xml (alle Module)

Felder: `modulename, sectionid, sectionnumber, idnumber(leer), added, score 0, indent 0, visible 1, visibleoncoursepage 1,
visibleold 1, groupmode 0, groupingid 0, completion, completiongradeitemnumber, completionpassgrade, completionview,
completionexpected 0, availability $@NULL@$, showdescription, downloadcontent 1, lang(leer), enableaitools $@NULL@$,
enabledaiactions $@NULL@$, tags(leer)`. Attribut `version` nach B.1.

Abschluss: keine `0/-/-/0` · Ansehen `2/$@NULL@$/0/1` · Bestehen `2/0/1/0` (+ grade_item gradepass, hvp completionpass 1) ·
Abgabe (feedback) `2/$@NULL@$/0/0` + `completionsubmit 1`. (Reihenfolge: completion / completiongradeitemnumber / completionpassgrade / completionview.)

### G. Modultypen

- **label**: `<label id><name><intro>HTML<introformat>1<timemodified>`. `name` erscheint im Kursindex → sprechend.
- **page**: `name, intro, introformat 1, content HTML, contentformat 1, legacyfiles 0, legacyfileslast $@NULL@$, display 5,
  displayoptions a:3:{s:12:"printheading";s:1:"1";s:10:"printintro";s:1:"0";s:17:"printlastmodified";s:1:"0";}, revision 1, timemodified`.
- **subsection**: `<subsection id><name><timemodified>0`.
- **url** (Link/Video): `name, intro, introformat 1, externalurl, display (0 auto, 1 embed, 5 neues Fenster), displayoptions a:1:{s:10:"printintro";i:1;}, parameters a:0:{}, timemodified`; module.xml version 2026042000. YouTube-/Vimeo-Links werden bei display 1 vom Multimedia-Filter eingebettet.
- **feedback**: `name, intro, introformat 1, anonymous 1, email_notification 0, multiple_submit 0, autonumbering 1,
  site_after_submit(leer), page_after_submit HTML, page_after_submitformat 1, publish_stats 0, timeopen 0, timeclose 0,
  timemodified, completionsubmit 1, items/item(id): template 0, name, label(leer), presentation, typ multichoice, hasvalue 1,
  position, required 0, dependitem 0, dependvalue(leer), options h; completeds(leer)`.
  Skala-presentation: `r>>>>>1 trifft gar nicht zu\n|2\n|3\n|4\n|5 trifft voll zu`.
- **hvp**: `name, machine_name, major_version, minor_version, intro, introformat 1, json_content, embed_type div, disable 14,
  content_type/source/year_from/year_to/license_version $@NULL@$, changes [], license_extras/author_comments $@NULL@$,
  slug(leer), timecreated, timemodified, authors [], license U, completionpass 0|1, content_user_data(leer)`.
  Bewertung: `grades.xml` grade_item (itemtype mod, itemmodule hvp, iteminstance = Instanz-ID, categoryid = Kurs-Kategorie aus
  gradebook.xml, grademax, gradepass); ID als `grade_itemref` in inforef.xml.
- **quiz** (Test): Felder und Standardwerte aus `export-schemata/aktivitaeten/quiz/quiz.xml`; gesetzt werden `name, intro,
  preferredbehaviour (deferredfeedback | immediatefeedback), attempts_number (0 = unbegrenzt), questionsperpage,
  shuffleanswers, sumgrades = grade = Summe der maxmark` (1 je Frage), `timecreated/timemodified`; `feedbacks` ein Eintrag
  `mingrade 0, maxgrade grade+1`; `sections` ein Eintrag `firstslot 1`. Fragen: `question_instances/question_instance`
  je Slot (`slot, page, displaynumber $@NULL@$, requireprevious 0, maxmark, quizgradeitemid $@NULL@$`) mit
  `question_reference` (`usingcontextid` = Modulkontext, `component mod_quiz`, `questionarea slot`,
  `questionbankentryid` = Eintrag in `questions.xml`, `version $@NULL@$`). Fragensammlung siehe G.2. Bewertung wie hvp
  (itemmodule quiz); Abschluss „bestehen“ `2/0/1/0` + gradepass. inforef.xml zusätzlich `question_categoryref` mit
  beiden Kategorie-IDs. **Noch nicht per Import verifiziert** (Schema der leeren Instanz exportiert, Fragen aus dem
  Backup-Code von Moodle 4.x/5.x abgeleitet).
- **assign** (Aufgabe): Felder aus `export-schemata/aktivitaeten/assign/assign.xml`; gesetzt `name, intro, grade (0 = keine
  Bewertung), duedate, completionsubmit`; `plugin_configs` schalten `assignsubmission onlinetext/file enabled`, Rest
  Plattformstandard (comments, Feedback-Kommentare und -Dateien an). grade > 0 → grade_item (itemmodule assign, grademax =
  grade, gradepass aus `bestehen`). Abschluss „abgabe“ `2/$@NULL@$/0/0` + `completionsubmit 1`.
- **resource** (Datei): `name, intro, introformat 1, tobemigrated 0, legacyfiles 0, legacyfileslast $@NULL@$, display 0,
  displayoptions a:2:{s:10:"printintro";i:1;s:8:"showtype";i:1;}, filterfiles 0, revision 1, timemodified`; genau eine
  Datei im Bereich `mod_resource/content/0`, `sortorder 1`, mimetype nach Endung. Website-Modus (AP7, `gen/website.py`):
  eine `index.html` (text/html), `display` 1 eingebettet (Standard), 5 öffnen, 6 Pop-up (`displayoptions` dann mit
  `popupwidth 1200`, `popupheight 800`), `printintro 0`, `showtype 0`, Abschluss „ansehen“ (`website:` ja/eingebettet → 1, vollbild → 5, neues fenster → 6).
  `filterfiles 0`: die Filter der Plattform laufen nicht über die Datei; ob ihre Skripte laufen, prüft `tools/jsprobe`. Bilder als data-URI im Bilderverzeichnis
  der Seite; `check.py` prüft Anzeige, externe Quellen und Bildverweise. Moodle-Anzeige 2 (Rahmen) und 3 (neues
  Fenster) sind im Standard von `resource | displayoptions` nicht freigegeben und werden nicht erzeugt.
- **folder** (Verzeichnis): `name, intro, introformat 1, revision 1, timemodified, display (0 eigene Seite, 1 auf der
  Kursseite), showexpanded, forcedownload 1, studentedit 0`; Dateien in `mod_folder/content/0`, filepath `/`.
- **forum**: `type (general | qanda | eachuser | blog), name, intro, introformat 1`, Rest wie Schema (`assessed 0,
  scale 100, maxbytes 512000, maxattachments 9, forcesubscribe 0, trackingtype 1`); Abschluss „beitrag“ `2/$@NULL@$/0/0`
  + `completionposts 1`. Ohne Nutzerdaten keine Diskussionen.
- **book** (Buch): `name, intro, introformat 1, numbering 1, navstyle 1, customtitles 0, timecreated, timemodified`;
  `chapters/chapter`: `pagenum (1..n), subchapter 0|1, title, content HTML, contentformat 1, hidden 0, timecreated,
  timemodified, importsrc (leer)`. Bilder im Kapitel: `mod_book/chapter/<Kapitel-ID>`.
- **choice** (Abstimmung): `name, intro, introformat 1, publish 0 (anonym), showresults (0 nie, 1 nach eigener Abgabe,
  2 nach Ende, 3 immer), display 0, allowupdate, allowmultiple, showunanswered 0, limitanswers 0, timeopen/timeclose 0,
  timemodified, completionsubmit 1, showpreview 0, includeinactive 0, showavailable 0`; `options/option`: `text,
  maxanswers 0, timemodified`. Abschluss „abgabe“ wie feedback.
- **glossary** (Glossar): Felder aus dem Schema (`displayformat dictionary`, `defaultapproval 1`, `entbypage 10`,
  `usedynalink 1`); `entries/entry`: `userid 0, concept, definition HTML, definitionformat 1, definitiontrust 0,
  attachment (leer), timecreated, timemodified, teacherentry 1, sourceglossaryid 0, usedynalink 1, casesensitive 0,
  fullmatch 0, approved 1`, Kinder `aliases/alias/alias_text`, `ratings` (leer). Abschluss „eintrag“ `2/$@NULL@$/0/0`
  + `completionentries 1`. **Einträge stellt Moodle nur mit Nutzerdaten wieder her** (Import-Test 2, 0.6;
  `restore_glossary_stepslib.php`: Pfad `entries/entry` nur `if ($userinfo)`). Daher zwei Wege, beide gebaut:
  (A) Settings nach D (`users=1`, `userinfo=1` nur für das Glossar und seine Abschnittskette, `users.xml` leer, Einträge
  `userid 0`; die Vorprüfung lädt `users.xml` und findet keine Nutzer, `restore_prechecks_helper`); fehlt der Lehrkraft
  `moodle/restore:userinfo`, sperrt Moodle `users` auf 0 ohne Abbruch (`restore_check`), dann fehlen die Einträge und
  mit ihnen die Badges (Abhängigkeit `users → badges` im `restore_root_task`). (B) Je Glossar eine Moodle-Glossar-XML
  (`GLOSSARY/INFO/ENTRIES/ENTRY`, `gen/mbz.py glossary_import_xml`) neben der `.mbz`, Import Glossar → Mehr → Einträge
  importieren (setzt `userid` auf die Lehrkraft). Nach Import-Test 3 (0.7) ist seit 0.8 (B) der feste Weg
  und Standard (users=0), (A) nur mit `build.py --mit-nutzerdaten`; `check.py` warnt bei users=1.

G.2 Fragensammlung (`questions.xml`, Moodle 4.x/5.x)

Je Test zwei Kategorien im Modulkontext (`contextlevel 70`, `contextinstanceid` = cmid des Tests, `contextid` =
Modulkontext): `top` (`parent 0, sortorder 0`, keine Einträge) und `Standard für <Testname>` (`parent` = top-ID,
`sortorder 999`). Darin je Frage:

```
question_bank_entry(id): questioncategoryid, idnumber $@NULL@$, ownerid $@NULL@$
  question_version / question_versions(id): version 1, status ready
    questions/question(id): parent 0, name, questiontext HTML, questiontextformat 1, generalfeedback, generalfeedbackformat 1,
      defaultmark 1.0000000, penalty 0.3333333, qtype, length 1, stamp, timecreated, timemodified, createdby/modifiedby $@NULL@$
      plugin_qtype_<qtype>_question: answers/answer(id): answertext, answerformat, fraction (7 Dezimalen), feedback, feedbackformat 1
        multichoice(id): layout 0, single, shuffleanswers 1, correct/partiallycorrect/incorrectfeedback (+format 1),
                         answernumbering abc, shownumcorrect 1, showstandardinstruction 0
        truefalse(id): trueanswer/falseanswer = Antwort-IDs („Wahr“/„Falsch“, answerformat 0), showstandardinstruction 0
        shortanswer(id): usecase 0  (Antworten answerformat 0, `*` als Platzhalter)
      question_hints (leer), tags (leer)
```
Mehrfachauswahl: richtige Antworten `1/n`, falsche `-1/n`. Fragetypen für 1.0: multichoice, truefalse, shortanswer.
`stamp` im Format `<host>+<JJMMTTHHMMSS>+<id>`.

### H. Dateien (Bilder)

`files.xml` je Datei: `id, contenthash sha1, contextid, component, filearea, itemid, filepath, filename, userid $@NULL@$,
filesize, mimetype, status 0, timecreated, timemodified, source, author $@NULL@$, license unknown, sortorder 0,
repositorytype/repositoryid/reference $@NULL@$`; Datei unter `files/<hash[:2]>/<hash>`; ID in `inforef.xml` als `fileref`.

| Verwendung | component / filearea / itemid / filepath | Referenz im Inhalt |
|---|---|---|
| Bild in Textfeld | mod_label / intro / 0 / `/` | `<img src="@@PLUGINFILE@@/name.png">` |
| Bild in Seite | mod_page / content / 0 / `/` | `@@PLUGINFILE@@/name.png` |
| Bild in H5P | mod_hvp / content / hvp-Instanz-ID / `/images/` | `"file": {"path": "images/name.png", "mime": "image/png", "copyright": {"license": "U"}, "width", "height"}` |
| Kursbild | course / overviewfiles / 0 / `/` | – (inforef in course/) |
| Badge | badges / badgeimage / Badge-ID / `/`, filename `f1.png` | – (inforef in course/) |
| Datei (resource) | mod_resource / content / 0 / `/`, sortorder 1 | – (genau eine Datei) |
| Verzeichnis (folder) | mod_folder / content / 0 / `/` | – |
| Bild im Buchkapitel | mod_book / chapter / Kapitel-ID / `/` | `@@PLUGINFILE@@/name.png` im Kapitel |
| Bild in Beschreibung (assign, forum, choice, glossary …) | mod_<mod> / intro / 0 / `/` | `@@PLUGINFILE@@/name.png` |
| Kachelbild (Kachelformat) | format_tiles / tilephoto / Abschnitts-ID / `/tilephoto/`, Kurs-Kontext | `optionvalue`/`tilephoto` in section.xml (fileref in der inforef des Abschnitts) |

Mimetype nach Dateiendung (`application/pdf`, `image/png`, Office-Typen); unbekannt → `application/octet-stream`.

**Jedes in `json_content` referenzierte Bild muss in files.xml stehen** (häufigster Fehler: Bilder in Büchern vergessen).

### I. H5P-Strukturen

- Unterinhalt: `{"library": "<B.2>", "params": {…}, "subContentId": "<uuid4, eindeutig>", "metadata": {"contentType": "…", "license": "U", "title": "…", "authors": [], "changes": [], "extraTitle": "…"}}`.
- InteractiveBook: `chapters[]` = `{"library": "H5P.Column 1.22", "params": {"content": [{"content": <Unterinhalt>, "useSeparator": "auto"}]}, "subContentId", "metadata"}`; `behaviour.baseColor`; `next/previous/page` = „Weiter/Zurück/Seite“.
- QuestionSet: `questions[]` = Unterinhalte; `passPercentage`; `endGame.overallFeedback[{from,to,feedback}]` an passPercentage ausrichten.
- BranchingScenario: `branchingScenario.content[]`; Textknoten `{"type": <AdvancedText>, "showContentTitle": true, "proceedButtonText": "Weiter", "nextContentId": <Index|-1>, "forceContentFinished": "useBehavioural", "feedback": {"title","subtitle","endScreenScore"}, "contentBehaviour": "useBehavioural"}`;
  Frageknoten `type.library = H5P.BranchingQuestion 1.0`, `params.branchingQuestion.alternatives[] = {"text", "nextContentId", "addFeedback", "feedback": {…}}`, `nextContentId -1` = Ende, Endbildschirm aus `feedback` der Alternative. Index = Position im content-Array.
- DragQuestion: `x,y` in %, `width,height` in em (16 px = 1 em bei Nennbreite); Elemente = AdvancedText-Unterinhalte;
  `dropZones[].correctElements` = Element-Indizes als Strings. v1.15: Zonenlabel liegt **über** der Zone (oben ≥ 26 px frei),
  Element braucht +24 px Breite für den Griff. Verifiziert 760×480, 2 Spalten: Zonen `y 5.4`, Elemente `height 2.5`, `width 20.9`, Zeilenabstand 54 px.
- Blanks: Lücke `*antwort/alternative:tipp*`, `behaviour.caseSensitive false`, `acceptSpellingErrors true`. DragText/MarkTheWords: `*wort*`.
- Summary: erste Aussage je Gruppe richtig (wird gemischt). SingleChoiceSet: erste Antwort richtig (wird gemischt). MultiChoice: `behaviour.randomAnswers true`, `type "single"|"multi"`.

### J. Badges

`badges.xml` je Badge: `name, description, timecreated, timemodified, usercreated/usermodified $@NULL@$, issuername,
issuerurl, issuercontact $@NULL@$, expiredate/expireperiod $@NULL@$, type 2, courseid, message HTML, messagesubject,
attachment 1, notification 0, status 0, nextcron $@NULL@$, version(leer), language de, imageauthor*(leer), imagecaption(leer),
criteria, endorsement/alignments/relatedbadges/manual_awards/issued/tags (leer)`.
`criteria`: Kriterium `criteriatype 0, method 1` (leer) + Kriterium `criteriatype 1, method 1` mit `params/param: name module_<cmid>, value <cmid>`.
Bild siehe H. Nach Import inaktiv.

### K. HTML auf der Kursseite (Textfeld/Seite) – technische Grenzen

- Funktioniert nach dem Filter: `table/td`, `display:inline-block`, `background`, `border*`, `border-radius`, `padding`,
  `margin`, `color`, `font-size/weight`, `text-align`, `width`, `vertical-align`, `line-height`, `table-layout:fixed`,
  `border-spacing`, Unicode-Zeichen inkl. Emoji.
- Wird entfernt oder wirkt nicht: `display:flex|grid`, `position`, JavaScript, externe Stylesheets, `<style>`-Blöcke.
- Theme setzt Rahmen um jede `<td>` → jede Zelle setzt `border` explizit. Verschachtelte Tabellen machen Spalten ungleich
  → Kachel-Leisten als eine Tabellenebene mit `table-layout:fixed`.
- Bilder: PNG ≤ 1600 px Breite skalieren sauber; Text in Bildern ist auf Mobilgeräten klein → Text bevorzugt als HTML.
- Label-Namen erscheinen im Kursindex → sprechend benennen.
- Gestaltung (Banner, Karten, Farben, Marker, Buchfarbe) ist Präferenz der Lehrkraft: aus dem Steckbrief `design`
  übernehmen (intake.md §2); ohne Angabe schlicht bauen (Kursbanner, keine Abschnittsbilder, keine Emojis, eine Akzentfarbe).
- Designvorlagen: Token-Sätze `schlicht`, `kacheln`, `magazin` in `gen/html.py` (`VORLAGEN`: Farben, Rundung, Abstände,
  Kartenform, Schriftgrößen); `build.py` setzt sie aus `design.vorlage`. Alle Bausteine (Textfeld, Seite, Buchtext, Karten)
  lesen die Tokens beim Aufruf; Kursinhalt enthält keine Gestaltungsangaben. Render-Test: `scripts/tests/render_vorlagen.py`
  (Playwright, 390 und 1200 px, Theme-Rahmen um `<td>` nachgebildet).
- Textbausteine für Lesetexte (kursdatei.md §4): Zwischenüberschrift, Vorspann, Absatz, Listen, Schritte, Begriffstabelle,
  Vergleichstabelle (ohne `table-layout:fixed`, damit vier Spalten auf dem Handy umbrechen), Kasten/Beispiel/Hinweis,
  Hervorhebung, Merke, Bild mit Unterschrift, Bildzeile. Mit Banner tragen Überblickskarten keinen Titel.

### L. Inhaltsregeln

Laufzeitfassung für den Assistenten: `intake.md` §3 (Rangfolge, D1–D10, nur Prinzipien) und `qualitaet.md` (Prüfdurchlauf,
Markerliste mit Proben). Hier nur, was der Generator dazu beiträgt, und die Begründungen.

- Der Generator mischt die Antworten (H5P `randomAnswers`, Test `shuffle`, Website deterministisch je Frage); die Position
  der richtigen Option ist deshalb kein Marker, die Länge schon.
- Drehbuch-Marker und -Zeilen filtert der Parser (`gen/kursdatei.py`: `_clean` für `[Quelle: …]`, `[KI…]`, `[Zweck: …]`,
  `(← …)`; `Zeilen` für `Zeit … min`, `v2:`, `Angenommen:`, `Abweichung:`, `Offen:`, `Bildwunsch:`). Kurs-Angaben im Kopf
  werden zeilenweise gelesen, eine fremde Zeile davor verschluckt `farbe:` nicht.
- Fachliches prüfen (Notrufnummern inkl. Erreichbarkeitszeiten, Fristen, Rechtsbegriffe, Fehlercodes); Genderzeichen
  vermeiden (Bayern, Schulbereich), Doppelform oder neutral.
- Rendertest, wo möglich, mit B.2-Bibliotheken (h5p-standalone + GitHub-Repos der Bibliotheken im passenden Tag).

Begründungen der Standardannahmen (nicht im Einsatz gelesen):

| Nr | Begründung |
|---|---|
| D1 | Wer abgefragt wird, bevor der Input kam, rät; „falsch“ trifft dann fehlendes Vorwissen statt fehlendes Verständnis. |
| D2 | Die Übung prüft den Input, solange er präsent ist; erst ein neuer Fall in der Sicherung zeigt, ob das Gelernte übertragbar ist. |
| D3 | Ein Element ohne nennbaren Zweck kostet Zeit ohne Ertrag; im Kurs wäre der Zweck Meta-Text. |
| D4 | Prüft eine Frage zwei Dinge, zeigt eine falsche Antwort nicht, woran es lag. |
| D5 | Ein bloßes „falsch“ lässt die Fehlvorstellung stehen; im Abschlussquiz und Test zählt das Ergebnis, Rückmeldungen dort verdoppeln das Drehbuch. Mehrfachauswahl kann „nicht gewählt“ nicht rückmelden (kursdatei §8). |
| D6 | Anwendung baut auf gesicherten Begriffen auf. Gilt nur für die Reihenfolge der Übungen, nicht für den Anteil der Fälle (D9). |
| D7 | Jedes H5P-Element ist eine eigene Aktivität mit Ladezeit; ohne Lesetext fehlt der Input. Lesebuch ist H5P, zählt aber als Input. |
| D8 | Die Lehrkraft plant mit Unterrichtsminuten; ob gekürzt wird, entscheidet sie, deshalb Vorschlag statt Änderung. |
| D9 | Ob ein Begriff verstanden ist, zeigt sich am Fall; erfundene Namen vermeiden Werbung und Bezüge auf echte Personen. |
| D10 | Die Frage gibt dem Input eine Richtung; bewertet wäre sie ein Test auf Vorwissen (D1). |

### M. Ablauf

1. Intake (Intake-Leitfaden): Steuerungsgrad, Rahmen + Material, Gliederung, Formate, Gestaltung → Steckbrief.
2. **Drehbuch** (Intake-Leitfaden 5): gesamter Inhalt als kompakter Text mit Quellenmarkierung und Zeitcheck → Freigabe
   durch die Lehrkraft (entfällt bei Steuerungsgrad „KI macht alles“). Davor ein Prüfdurchlauf nach `qualitaet.md`.
   Das Drehbuch ist die Kursdatei `kurs.md` (Format: `kursdatei.md`); der Generator (`gen/`) liest sie direkt.
3. Prototyp (ein Beispiel je Modultyp, Interactive Book + Branching enthalten) → Lehrkraft importiert → Screenshot.
4. Vollkurs oder Etappe (O) → Prüfdurchlauf über Änderungen nach der Freigabe → Korrekturen → Lieferung mit Import-Hinweis (Badge aktivieren, Kursbild;
   bei Delta: „Zusammenführen“).
5. Fehlersuche: zuerst `scripts/check.py <datei.mbz>` (läuft nach jedem Bau automatisch); Restore-Abbruch nennt
   Datei/Element; H5P öffnet nicht → Version (B.2/B.3); Bild fehlt → files.xml (H).

### O. Sukzessiver Aufbau

- **Freigabe nach Datum** (Kurs fertig, Lieferung einmal): Steckbrief `sichtbar_ab: YYYY-MM-DD` je Teil →
  `availabilityjson`/`availability` = `{"op":"&","c":[{"type":"date","d":">=","t":<unix>}],"showc":[true]}` (Abschnitt E/F).
  Zeitpunkt 06:00 Europe/Berlin. Vorzuziehen, wenn Inhalte vorliegen.
- **Delta-Sicherung** (Inhalte entstehen etappenweise): `build.py --delta` baut nur Teile mit `status: pending`
  (oder `--delta le2,le3`). Regeln: Abschnitt 0 leer (sonst Duplikate von Banner/Startseite); jeder gelieferte Teil ein
  **Top-Level-Abschnitt** (Zusammenführen hängt ganze Abschnitte hinten an, kann nichts in bestehende Abschnitte oder
  Unterabschnitte einfügen); keine Badges, kein Kursbild, keine Kursbeschreibung (Erstlieferung); Badge-Kriterien nur auf
  Aktivitäten derselben Sicherung. Import: Wiederherstellen → Ziel „In diesen Kurs wiederherstellen“ → **„Zusammenführen“**.
  Danach im Steckbrief `status: delivered`. Reihenfolge korrigiert die Lehrkraft per Drag&Drop, falls nötig.
- **Änderung an geliefertem Teil**: nicht per Sicherung möglich. Abschnitt im Kurs löschen, Teil auf `pending`, Delta neu
  bauen und zusammenführen; Lernfortschritt dieses Abschnitts geht verloren. Kleine Textkorrekturen besser direkt in der Lernplattform.
- Verifiziert 2026-10-23 auf ByCS-Lernplattform: Delta (ein Abschnitt mit drei hvp) per „Zusammenführen“ importiert, Abschnitt erscheint
  **hinten** (Moodle vergibt die nächste freie Nummer), H5P darin öffnet; bestehende Abschnitte unverändert. Reihenfolge
  danach per Drag&Drop. Für Etappenkurse: Lerneinheiten als Top-Level-Abschnitte planen; liegen Inhalte vor, ist
  „sichtbar ab“ mit Einmal-Import vorzuziehen.

### N. Referenzimplementierung

`scripts/`: `gen/kursdatei.py` (Parser der Kursdatei, Format in `kursdatei.md`), `gen/html.py` (Textbausteine für K),
`gen/mbz.py` (Writer für C–J, O; Platzhalter aus B.1), `gen/h5p.py` (Builder für I mit UI-Strings aus Anhang A),
`gen/render.py` (Banner/Mocks HTML→PNG, Playwright), `build.py --content ordner [--proto] [--delta [teile]] [--steckbrief pfad]`,
`check.py datei.mbz` (prüft C–J und O an der fertigen Sicherung: Archiv, Pflichtdateien, IDs und Nummern, Dateien mit
sha1, inforef, Bibliotheksversionen, `json_content`, Bilder, Test-Fragenverweise gegen `questions.xml`, Bewertungsposten,
Buchkapitel, Badges, Verfügbarkeits-JSON, Kursformat und Kacheloptionen, `users`/`userinfo`-Settings; `WARNUNG`-Zeilen
ohne Exit 1, wenn beim Import voraussichtlich etwas verloren geht; `build.py` ruft es am Ende auf).
Kursordner: `kurs.md` (Inhalt), `assets/` (PNG), `steckbrief.yaml` (Kurs-Metadaten, Teile, Status, `sichtbar_ab`);
Python-Inhalt (`content/course.py`) nur noch als Ausweg. Benötigt Python 3.11+, Pillow, PyYAML; Playwright+Chromium nur
zum Rendern von Bildern. Intake: `intake.md`.

---

