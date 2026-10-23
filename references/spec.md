# Spezifikation ByCS-Kurssicherung (normativ)


Alles Folgende ist normativ. Werte exakt übernehmen. Stand: 2026-10-22, verifiziert durch Import auf lernplattform.bycs.de
und Rendertest mit den gelisteten Bibliotheksversionen.

### A. Plattform

- Moodle 5.2.4, Kursformat `topics`, Unterabschnitte (mod_subsection) aktiv.
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
| original_site_identifier_hash | 6aa9a12f353641854c7eaa8a0fcd932f |
| module.xml version hvp | 2026062501 |
| module.xml version subsection/label/page/feedback/url | 2026042000 |
| course customfields | `schule` (text, Wert leer) · `participants` (checkbox, 0) |
| category | beliebig; Lehrkraft wählt Ziel beim Import |
| original_course_id / contextid | beliebig |

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
  `<mod>_<cmid>_included=1`, `_userinfo=0`.

### E. Abschnitte

`section.xml`: `number` (regulär 0..n, Unterabschnitte danach fortlaufend), `name` (`$@NULL@$` = Standard), `summary`,
`summaryformat 1`, `sequence` (cmids, kommagetrennt, inkl. subsection-Module), `visible 1`, `availabilityjson $@NULL@$`,
`component`/`itemid` (`$@NULL@$`; Unterabschnitt: `mod_subsection` / Instanz-ID des subsection-Moduls), `timemodified`.
Aktivitäten eines Unterabschnitts: `sectionid`/`sectionnumber` in module.xml = der Unterabschnitt.

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
  übernehmen (Intake Runde 4); ohne Angabe schlicht bauen (keine Banner-Bilder, keine Emojis, eine Akzentfarbe) und
  bei der ersten Lieferung zwei Varianten einer Abschnittsseite zur Auswahl zeigen.

### L. Inhaltsregeln

- Mischung: Input als Textfeld/Seite (mit Bildern), Video als Link, H5P nur für Übung/Kontrolle; höchstens die Hälfte der Elemente H5P.
- Erst Input, dann Kontrolle: bewertete Aufgaben nur zu Inhalten, die davor stehen (Seite/Textfeld/Lesebuch); Aktivierung vor dem Input unbewertet.
- Richtige Antworten mischen (randomAnswers); nicht immer Position 1, nicht die längste Option.
- Distraktoren = plausible Fehlvorstellungen; keine Scherzantworten.
- Kein Meta-Text über das Material („Lesebuch mit 4 Seiten, der Reihe nach“), keine Aphorismen, keine dramatisierten
  Einstiege, keine Floskeln. Kurze Sätze, Du-Ansprache, konkrete Fälle, erfundene Marken/Domains.
- Keine absoluten Aussagen („immer/nie“). Fachliches prüfen (Notrufnummern inkl. Erreichbarkeitszeiten, Fristen, Rechtsbegriffe, Fehlercodes).
- Genderzeichen (`:in`, `*innen`) vermeiden (Bayern, Schulbereich); Doppelform oder neutral.
- Vor Lieferung: unabhängiger zweiter Lauf prüft Inhalt und Aufgabenlogik; wenn möglich Rendertest mit B.2-Bibliotheken
  (h5p-standalone + GitHub-Repos der Bibliotheken im passenden Tag).

### M. Ablauf

1. Intake (Intake-Leitfaden): Steuerungsgrad, Rahmen + Material, Gliederung, Formate, Gestaltung → Steckbrief.
2. **Drehbuch** (Intake-Leitfaden 5): gesamter Inhalt als kompakter Text mit Quellenmarkierung und Zeitcheck → Freigabe
   durch die Lehrkraft (entfällt bei Steuerungsgrad „KI macht alles“). Unabhängige Prüfung auf Drehbuch-Ebene.
   Dann Inhalte 1:1 als Daten (`content/`), Generator (`gen/`) unverändert; `site.json` mit B.1.
3. Prototyp (ein Beispiel je Modultyp, Interactive Book + Branching enthalten) → Lehrkraft importiert → Screenshot.
4. Vollkurs oder Etappe (O) → unabhängige Prüfung → Korrekturen → Lieferung mit Import-Hinweis (Badge aktivieren, Kursbild;
   bei Delta: „Zusammenführen“).
5. Fehlersuche: Restore-Abbruch nennt Datei/Element; H5P öffnet nicht → Version (B.2/B.3); Bild fehlt → files.xml (H).

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

`generator_src.zip`: `gen/mbz.py` (Writer für C–J, O), `gen/h5p.py` (Builder für I mit UI-Strings aus Anhang A), `gen/render.py`
(Banner/Mocks HTML→PNG, Playwright), `content/*.py` (Kursinhalt als Daten), `steckbrief.yaml` (Kurs-Metadaten, Teile, Status,
`sichtbar_ab`), `build.py [--proto] [--delta [teile]] [--steckbrief pfad]`. Benötigt Python 3.11+, Pillow, PyYAML,
Playwright+Chromium (nur Bilder). `site.json` = B.1-Werte. Intake: `Leitfaden_Intake_Kurs-per-Fragen.md`.

---

