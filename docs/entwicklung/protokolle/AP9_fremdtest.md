# AP9 Fremdtest: frischer Assistent, nur das Skill-Zip, ein Satz

Aufbau: Ein Subagent der Sonnet-Klasse (Claude Sonnet, über die Agent-Schnittstelle von Claude Code, 23.10.2026) bekam
ein leeres Arbeitsverzeichnis mit `kursmuehle.zip` und genau die Nachricht „Entpacke das und lies SKILL.md. Mach mir eine
Einheit zu Bruchrechnen für Jgst 6, 45 Minuten, Selbstlernkurs.“ Die Lehrkraft war danach nicht erreichbar; Rückfragen
sollte er wörtlich notieren und mit einer Annahme weiterarbeiten. Umgebung: Python 3.13, PyYAML, Pillow, Playwright mit
Chromium (`CHROMIUM_PATH`). Kein Zugriff auf das Repo, kein Internet. Das Protokoll des Agenten ist jeweils ungekürzt
wiedergegeben, die Bewertung darunter stammt aus dem Review (Opus-Klasse, mit dem Repo).

Durchlauf 1 lief mit dem Zip aus dem Stand 0.9.1 plus den strukturellen Änderungen von 1.0 (Wiederherstellungsanleitung,
Textfeld-Regel, package.py); Durchlauf 2 mit dem Zip nach den Änderungen aus Durchlauf 1.

## Messwerte

| Größe | Durchlauf 1 | Durchlauf 2 |
|---|---|---|
| Laufzeit (Start bis fertige `.mbz` samt Protokoll) | 5 min 10 s (19:11:44–19:16:54 UTC) | 5 min 46 s (19:19:31–19:25:17 UTC); erste fertige `.mbz` nach etwa 3 min |
| Tokens gesamt (Eingabe und Ausgabe, Angabe der Agent-Schnittstelle) | 138 491 | 153 865 |
| Werkzeugaufrufe | 19 | 26 |
| Bauläufe bis `check.py` OK | 1 | 1 (insgesamt 3 Bauläufe, zwei davon ohne Fehler zur Kontrolle) |
| Rückfragen, die er gestellt hätte | 2 (Einstiegsfrage nach Vorlage; Eingrenzung des Themas) | 0 nach der Anleitung (3 genannt, die er trotzdem gestellt hätte: Schulart, Eingrenzung, Darstellungsweg) |
| Nachrichten an die Lehrkraft im echten Chat (Schätzung des Agenten) | 2 | 1 |
| Elemente im Kurs, Zeitcheck | 12 Aktivitäten; 38 min bei Soll 45 (−16 %) | 15 Aktivitäten; 42 min bei Soll 45 (−7 %) |
| Slop-Treffer gegen `qualitaet.md` im Review | 1 (beschreibender Untertitel in der Umfrage-Einleitung „Drei Sätze.“) | 1 (derselbe Marker: Umfrage-Einleitung „Drei Sätze, eine Minute.“) |

Die Tokenzahl ist die Gesamtsumme, die die Agent-Schnittstelle meldet; sie enthält das wiederholte Einlesen des Kontexts je
Werkzeugaufruf. Eine Aufteilung in Eingabe und Ausgabe liefert die Schnittstelle nicht. Zum Vergleich: die vier Laufzeitdateien
(SKILL.md, intake.md, kursdatei.md, qualitaet.md) haben zusammen etwa 90 KB, grob 25 000 Tokens.

## Durchlauf 1

### Protokoll des Agenten (wörtlich)

### 1. Gelesene Dateien (Pfade im Zip, Reihenfolge)

1. Dateiliste des Zips (`find`, nur Namen)
2. `kursmuehle/SKILL.md` (ganz)
3. `kursmuehle/references/intake.md` (ganz)
4. `kursmuehle/references/kursdatei.md` (ganz)
5. `kursmuehle/references/qualitaet.md` (ganz)
6. `kursmuehle/examples/netzwerk9/steckbrief.yaml` (ganz)
7. `kursmuehle/examples/netzwerk9/kurs.md` (ganz)
8. `kursmuehle/scripts/banner.py` (Zeilen 1–80, praktisch ganz)
9. `kursmuehle/examples/alltagskompetenz/kurs.md` (nur teilweise: Ausschnitte per grep zu Umfrage, Lückentext, Badge, RF-Zeilen, Zuordnen, Banner)
10. `kursmuehle/examples/alltagskompetenz/steckbrief.yaml` (nur Zeilen 1–50)
11. `kursmuehle/scripts/build.py` (nur `--help`-Ausgabe)

Nicht gelesen: README.md, ROADMAP.md, references/spec.md, formate.md, h5p-vorlagen.md, skelette.md, alle anderen Skripte und Vorlagen.
Außerhalb des Zips: `start.txt` im Arbeitsverzeichnis (Startzeit, vom Testaufbau). Im System-Kontext stand zusätzlich ein CLAUDE.md des Entwickler-Repos; ich habe es weder geöffnet noch verwendet.

### 2. Rückfragen, die ich gestellt hätte, und Annahmen

1. Nach intake.md §0/§1 ist die erste Nachricht immer „Womit starten wir?“. Wörtlich nach Vorlage: „Womit starten wir? 1 nur ein Thema nennen · 2 eigenes Material abgeben · 3 Material + ein paar Fragen · 4 Fragen ohne Material · 5 bestehenden Kurs erweitern. Wie viel entscheidest du? a ich entscheide · b Vorschläge freigeben · c KI macht alles. Dazu in einem Satz: Fach, Thema, Jahrgangsstufe, Einsatz, Minuten (Vorschlag: begleitend, 45 min).“
   Annahme: Weg 1 (nur Thema), Steuerung c (laut intake §1 Vorschlag für Weg 1), Einsatz Selbstlernkurs und 45 min wie genannt.
2. „Bruchrechnen ist für 45 Minuten zu breit. Soll es bei Addieren und Subtrahieren (mit Erweitern und Kürzen) bleiben, oder gehört Multiplizieren und Dividieren dazu? Welche Schulart?“
   Annahme: Addieren und Subtrahieren mit Erweitern und Kürzen, Bruchbegriff als Vorwissen; Schulart offen, Inhalt für alle Schularten. Steht als `Angenommen:` im Kopf von kurs.md. Nach intake §0 wäre diese Frage bei Weg 1 nicht erlaubt gewesen.
3. „Soll es ein Kurs mit einer Kachel/einem Abschnitt bleiben, oder mehrere Einheiten?“ (nicht gestellt, Annahme: eine Einheit, Format Themen.)

### 3. Ratestellen

- intake.md §0/§1: „Erste Nachricht ist immer ‚Womit starten wir?‘“, obwohl die Lehrkraft Thema, Stufe, Einsatz und Minuten schon genannt hat. Unklar, ob die Nachricht dann trotzdem kommt und wie Weg und Steuerungsgrad abgeleitet werden. Ich habe Weg 1 und Steuerung c angenommen.
- intake.md §2 Formattabelle: „Selbstlernkurs mit mehreren Einheiten → Kacheln“ und „eine einzelne Einheit → Themen“ treffen beide zu (Selbstlernkurs, eine Einheit). Ich habe Themen gewählt.
- SKILL.md Selbstabfrage „Bilder erzeugen?“: Unklar, ob Zeichnen per Pillow/Playwright „Bilder erzeugen“ ist. Ich habe `bilder: gerendert` eingetragen (banner.py) und das Bruchbalken-Bild und das Badge-Bild selbst mit Pillow gezeichnet.
- kursdatei.md §2 Badge: `bild` ist Pflicht, aber weder SKILL.md noch intake.md §4 sagen, woher das Badge-Bild kommt (banner.py kann keins). Ich habe es selbst gezeichnet.
- kursdatei.md §4/§5: Keine Aussage zu Mathe-Notation. Brüche als `3/8` geschrieben. Offen blieb, ob `/` direkt neben einer Lücke (`*2*/*4*`, `1/*2*`) im Lückentext kollidiert mit `Lücke/Alternative` (hat funktioniert) und ob ` · ` als Malpunkt im Quiz kollidiert (ich habe „mal“ geschrieben).
- SKILL.md Ablauf 3 und intake.md §7: „`--proto` (Erstkurs) oder ohne `--proto`“. Was „Erstkurs“ bedeutet, bleibt offen (kursdatei.md §7 sagt: hängt „Prototyp“ an den Kursnamen). Ich habe ohne `--proto` gebaut.
- intake.md §3: „Selbsteinschätzung: drei Sätze vorher und nachher“. Wo „vorher“ (Allgemeines) und „nachher“ (Ende der Einheit) stehen und ob sie bei D7 zählen, steht nirgends. Ich habe vorher in Allgemeines, nachher ans Ende gelegt und Umfrage nicht als H5P gezählt.
- intake.md §3 Formattabelle: „Geschichte: einmal je Kurs“ gegen 45 min Umfang. Ich habe sie weggelassen und als `Angenommen:` vermerkt, nicht als `Abweichung:` (die gilt laut §3 für D1–D10).
- intake.md §3/kursdatei.md §7a: Ein formatives Quiz bleibt im Textfeld-Modus nur, wenn `abschluss: ansehen` gesetzt ist (Quiz-Standard ist `bestehen`). Das habe ich aus dem Beispiel netzwerk9 und §7a zusammengesucht; `bestehen: 60 %` am Übungsquiz ist dadurch ohne Wirkung.
- intake.md §5 Zeitcheck: Lesen 150 Wörter/min gilt offenbar für Erwachsene; für Jgst 6 habe ich großzügiger geschätzt (38 min bei Soll 45, −16 %). Keine Aussage, ob zu kurz ein Problem ist.
- Steckbrief: `schulart` im Steckbrief ohne zulässige Werte; ich habe „offen“ geschrieben.
- qualitaet.md: Der Prüfdurchlauf ist ein Lesedurchgang ohne Werkzeug; wie die Fachprüfung dokumentiert wird (Offen:-Zeile nur bei Zweifel), ist klar, aber ob bei Steuerung c eine Änderungsliste `v1` nötig ist, nicht.

### 4. Abweichungen vom Ablauf in SKILL.md

- Keine Nachricht an die Lehrkraft (nicht erreichbar), daher keine Einstiegsnachricht, keine Gliederungsvorschau, keine Freigabe. Bei Steuerung c ist letzteres ohnehin vorgesehen.
- Prüfdurchlauf (qualitaet.md) von Hand vor dem Bau; keine Funde mehr nach dem Schreiben, keine `Offen:`-Zeile. Er ist nirgends dokumentiert außer hier.
- Kein Rendertest der H5P-Aktivität (SKILL.md Schritt 4, „wenn möglich“, h5p-standalone nicht vorhanden). Ersatz: die Vorschau `*_textfeld.html` in Chromium geöffnet, alle Prüfen- und Lösung-zeigen-Knöpfe geklickt, keine JavaScript-Fehler. Das Abschlussquiz als H5P ist nicht gerendert.
- Steckbrief-Teile nicht auf `delivered` gesetzt, weil nichts importiert wurde (Schritt 5).
- Ich habe die Python-Skripte mit `python3 -I` gestartet (Vorgabe des Testaufbaus), nicht aus dem Skill-Ordner heraus.
- Keine Zweck-/Quellenzeilen im Kurs; `[KI]` und `[Zweck: …]` stehen in den Überschriftzeilen und werden vom Parser entfernt.

### 5. Fehler beim Bau

Bauläufe: 1. Keine Parserwarnung, keine Meldung von check.py (Ausgabe unten). Kein zweiter Lauf nötig. Warnungen zu ignorierten Kopfzeilen traten nicht auf (Angenommen:-Zeilen werden stillschweigend übergangen).

### 6. Was gefehlt hat / unnötig war

- Ein Satz in intake.md §0: Hat die Lehrkraft Thema, Stufe, Einsatz und Minuten schon genannt, entfällt „Womit starten wir?“ und es gilt Weg 1 mit Steuerung c.
- Eine Zeile zur Formatwahl bei Selbstlernkurs mit nur einer Einheit (Themen).
- Ein Hinweis, wie das Badge-Bild entsteht (z. B. `banner.py --badge`) oder dass ein selbst gezeichnetes PNG 400 × 400 genügt.
- Ein Absatz „Formeln und Brüche“ in kursdatei.md §4 (Schreibweise `3/8`, Malpunkt, Brüche in Lücken, ggf. Unicode-Bruchstrich).
- Klarstellen in SKILL.md, was `--proto` für einen Erstkurs bedeutet und ob der Kurs ohne den Zusatz „Prototyp“ geliefert werden soll.
- Der Ausgabeordner von build.py (`<kursordner>/out/`) steht nirgends in SKILL.md; eine Zeile genügt.
- Die Dateinamen der `.mbz` übernehmen Umlaut und Leerzeichen aus dem Kurznamen (`brüche 6_kurs_…mbz`); ein ASCII-Name ohne Leerzeichen wäre sicherer für den Upload.
- Unnötig/doppelt: Der Syntaxblock in intake.md §5 wiederholt kursdatei.md fast vollständig; wer beides lesen soll, zahlt die Tokens zweimal. Vorschlag: intake §5 auf Verweis und Regeln kürzen.
- Die Selbstabfrage-Zeile „Dateien lesen“ ist ohne Material der Lehrkraft überflüssig; ein Halbsatz „nur bei Material“ genügt.

### 7. Ergebnis

- .mbz: `<arbeitsverzeichnis>/kurs/out/brüche 6_kurs_20261023-1915.mbz`
- Kursordner: `<arbeitsverzeichnis>/kurs/` mit `kurs.md`, `steckbrief.yaml`, `assets/` (banner.png, bruchbalken.png, badge.png)
- Vorschau der Textfeld-Übungen: `…/kurs/out/brüche 6_kurs_20261023-1915_textfeld.html`
- Ausgabe `check.py`: `OK brüche 6_kurs_20261023-1915.mbz (12 Aktivitäten, 2 Abschnitte, 4 Dateien, Format topics)`
- Import-Hinweis (der Lehrkraft mitzugeben): Kurs → Mehr → Kurs wiederverwenden → Wiederherstellen, Ziel „Inhalte löschen und wiederherstellen“, „Kurseinstellungen überschreiben: Ja“. Danach Badge aktivieren und das Kursbild prüfen. Das Format Themen, Textfeld-Modus und das Abschlussquiz sind noch nicht per Import auf der Plattform geprüft; zuerst in einen Testkurs einspielen. Die Moodle-App führt Textfeld-JavaScript möglicherweise nicht aus.
- Inhalt in Kürze (für das Protokoll): eine Einheit, 9 Elemente plus Überblick, Soll 45 min, geschätzt 38 min; 3 Übungen im Textfeld, Abschlussquiz (70 %) als Aktivität mit Badge.

### 8. Zeiten

- Beginn (`date -u`): Fri Oct 23 19:11:44 UTC 2026
- Ende (`date -u`): Fri Oct 23 19:16:54 UTC 2026
- Geschätzte Nachrichten an die Lehrkraft im echten Chat: 2 (Einstiegsfrage, Lieferung mit Import-Hinweis); mit der Rückfrage zum Umfang 3.

### Bewertung

Was gut lief: Der Agent las genau die vier Laufzeitdateien ganz, dazu das Beispiel netzwerk9 und Ausschnitte aus
alltagskompetenz; README, spec.md, h5p-vorlagen.md und skelette.md blieben ungelesen, wie in `AGENTS.md` vorgesehen. Er
erkannte Weg 1, Steuerungsgrad c, grenzte das zu breite Thema selbst ein und nannte alles als `Angenommen:`. Das Drehbuch
hält D1–D10: Einstieg mit Fall (Pizza), Erst-Input-dann-Kontrolle mit Verweisen, Rückmeldung je falscher Option, Fälle
statt Definitionen im Abschlussquiz, Hefteintrag als Sicherung, Selbsteinschätzung vorher und nachher, ein Baulauf,
`check.py` OK. Rechenweg und Lösungen sind fachlich richtig (geprüft: alle zehn Abschlussfragen, Lückentext, Zuordnen).

Slop-Prüfung gegen `qualitaet.md` (Review): ein Treffer, die Umfrage-Einleitung „Drei Sätze. Am Ende vergleichst du mit dir
selbst.“ nennt den Aufbau (beschreibender Untertitel). Keine Ausrufezeichen, keine Emojis, keine Zweck- oder Quellenzeile
im Kurs, keine Dreierreihe, keine Schlussformel, Überschriften sagen, worum es geht.

Was fehlte (Ratestellen des Agenten, im Review bestätigt) und was daraus geändert wurde:

| Fund | Änderung in 1.0 |
|---|---|
| „Womit starten wir?“ auch dann, wenn der Satz schon alles nennt | intake.md §1 und SKILL.md Schritt 1: entfällt bei vollständigem Satz, Weg 1 mit KI macht alles |
| Formattabelle: Selbstlernkurs → Kacheln, eine Einheit → Themen, beides trifft zu | intake.md §2: eine einzelne Einheit (bis 45 min, auch Selbstlernkurs) → Themen |
| Woher kommt das Badge-Bild (Pflichtangabe) | intake.md §4: `banner.py --badge --titel … --kicker …` (neu) oder selbst erzeugt |
| Rechenzeichen und Brüche in der Kursdatei | kursdatei.md §3: Brüche `3/8`, ` · ` ist Trennzeichen, Malzeichen `×`, keine LaTeX |
| `--proto` „Erstkurs“ unklar; Ausgabeordner nirgends genannt | SKILL.md Schritt 3: `--proto` nur für einen Prototyp zum Ansehen; `.mbz` liegt in `out/` |
| Dateiname mit Umlaut und Leerzeichen (`brüche 6_kurs_…mbz`) | build.py: ASCII-Dateiname (`brueche-6_kurs_…`) |
| Geschichte „einmal je Kurs“ bei 45 min | intake.md §3: ab etwa 90 min, bei einer Einheit weglassen |
| Selbsteinschätzung: wo vorher und nachher, zählt sie bei D7 | intake.md §3: vorher in Allgemeines, nachher letztes Element, kein H5P |
| Übungsquiz im Textfeld braucht `abschluss: ansehen`, nur aus Beispiel und §7a erschließbar | intake.md §3 Darstellungsweg: ausdrücklich genannt |
| Lesetempo 150 Wörter/min für Jgst 6 zu hoch | intake.md §5: bis Jgst 7 100 Wörter/min, Rechenlücke 30 s |
| Selbstabfrage „Dateien lesen“ ohne Material überflüssig | SKILL.md: „(nur bei Material)“ |
| `schulart` ohne zulässige Werte | intake.md §6: frei, nicht genannt = leer |

Nicht geändert: Der Syntaxblock in intake.md §5 doppelt kursdatei.md; er bleibt als Kurzfassung auf einer Seite (so in AP1
entschieden), kursdatei.md ist die Referenz. Wer Tokens sparen will, kann in 1.1 prüfen, ob die Kurzfassung allein reicht.

## Durchlauf 2

### Protokoll des Agenten (wörtlich)

Arbeitsverzeichnis: <arbeitsverzeichnis>
(Zip entpackt nach `kursmuehle/`; Kursordner `brueche6/`.)

### 1. Gelesene Dateien (Reihenfolge, Pfade im Zip)

0. (nicht im Zip) `start.txt` im Arbeitsverzeichnis: nur ein Zeitstempel (Fri Oct 23 19:19:12 UTC 2026), gehört nicht zur Anleitung. Die Aufgabe nannte nur das Zip; die Datei lag trotzdem dort.
1. `kursmuehle/SKILL.md` (vollständig)
2. `kursmuehle/references/intake.md` (vollständig)
3. `kursmuehle/references/kursdatei.md` (vollständig)
4. `kursmuehle/references/qualitaet.md` (vollständig)
5. `kursmuehle/examples/netzwerk9/steckbrief.yaml` und `kursmuehle/examples/netzwerk9/kurs.md` (vollständig)
6. `kursmuehle/scripts/banner.py` (Zeilen 1–140, praktisch ganz; nur für die Aufrufsyntax)
7. `kursmuehle/examples/alltagskompetenz/steckbrief.yaml` (vollständig)
8. `kursmuehle/examples/alltagskompetenz/kurs.md` nur teilweise: per grep die Stellen mit `Umfrage` und `Badge` (Syntax für Selbsteinschätzung und Badge).

Nicht gelesen: `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `references/spec.md`, `formate.md`, `h5p-vorlagen.md`, `skelette.md`, alle weiteren Skripte. Zusätzlich habe ich die gebaute `.mbz` entpackt und den Text der Seiten angesehen (eigener Output, nicht Anleitung) und das Textfeld-Vorschau-HTML im Chromium getestet.

### 2. Rückfragen, die ich gestellt hätte, und Annahmen

Nach SKILL.md/intake.md §1 gilt bei Thema + Jgst + Einsatz + Minuten: Weg 1, KI macht alles, keine Rückfrage. Hätte ich trotzdem gefragt:

1. „Welche Schulart ist das (Mittelschule, Realschule, Gymnasium)? Tempo und Anspruch beim Bruchrechnen unterscheiden sich.“ Annahme: nicht genannt, `schulart` leer, Niveau einfach, Du-Ansprache, ein Kurs für alle.
2. „Bruchrechnen ist für 45 Minuten zu breit. Soll es Erweitern und Kürzen mit gleichnamigem Addieren sein, oder ist Erweitern/Kürzen schon bekannt und es geht um Addieren und Subtrahieren mit verschiedenen Nennern?“ Annahme: Erweitern, Kürzen, Addieren/Subtrahieren gleichnamiger Brüche; ungleichnamige nur als ein Hinweis mit einem Beispiel und einer Abschlussfrage.
3. „Dürfen die Übungen direkt auf der Kursseite laufen (in der Moodle-App eventuell nicht), oder sollen alle Übungen eigene Aktivitäten sein?“ Annahme: Textfeld-Modus für formative Übungen, Abschlussquiz als H5P-Aktivität mit Badge.

### 3. Ratestellen

- `intake.md` §1 (Weg 1) und §3 Darstellungsweg: Bei Weg 1 steht nicht ausdrücklich, ob der Textfeld-Modus gilt. Ich habe die Rangfolge aus §3 angewendet (`website: textfeld`).
- `intake.md` §3 D7: Ob Übungen im Textfeld als „H5P“ zählen, ist nicht gesagt. Ich habe sie mitgezählt (5 von 11 Elementen = 45 %).
- `intake.md` §5 Zeitcheck: Ob „Allgemeines“ (Banner, So funktioniert der Kurs, Selbsteinschätzung vorher) zur Soll-Zeit zählt, ist nicht gesagt. Ich habe die Einheit auf 40 min, mit Allgemeines 42 min gerechnet.
- `kursdatei.md` §5 Lückentext: Ob aufeinanderfolgende Zeilen eigene Absätze sind, steht nicht da. Ich habe Leerzeilen zwischen die Aufgaben gesetzt. Dass `*1/2*` als Alternativen „1“ und „2“ gelesen würde, steht nur indirekt in §3 (Rechenzeichen); ich habe nur Zähler oder Nenner als Lücke genommen.
- `kursdatei.md` §3 Zuordnen („ohne Zone = Ablenker“): Dass die Lernenden dann „passt nirgends“ wählen müssen und der Titel das sagen muss, steht nirgends. Mein erster Bau hatte einen Ablenker ohne Hinweis; ich habe es im Browser gesehen und den Titel geändert.
- `kursdatei.md` §5 RF `→ richtig:` / `→ falsch:`: Bedeutung (Rückmeldung bei richtiger bzw. falscher Antwort der Lernenden?) nicht definiert. Ich habe es so angenommen und nicht geprüft.
- `intake.md` §4 / §6 `bilder:`: Ich konnte selbst Bilder erzeugen (Pillow), habe aber Banner und Badge mit `banner.py` gerendert (schneller, Vorlage vorhanden) und nur die drei Fachbilder selbst gezeichnet. Welcher Wert für `bilder:` passt bei Mischung, ist offen; ich habe `selbst` eingetragen. Kursbild: keins angelegt, das Banner dient als Kursbild (kursdatei §2).
- `SKILL.md` Ablauf 3 „Abschluss“: Abschlussquiz als Quiz (H5P) oder Test (Moodle)? Ich habe Quiz genommen (kein Notenbedarf, Lückentext/Einsetzen möglich; ein Test hätte Kurzantwort für Bruchantworten geboten).
- `intake.md` §3 „Selbsteinschätzung nachher letztes Element der Einheit“: Das Badge steht nach der Umfrage; ich habe Badge nicht als Element gezählt.
- `SKILL.md` Ablauf 5 „Steckbrief-Teile auf delivered“ gegen `intake.md` §7.5 „nach erfolgreichem Import“: Ich habe sie auf `pending` gelassen, weil nichts importiert ist.
- `qualitaet.md`: Wie ausführlich der Prüfdurchlauf zu dokumentieren ist, steht nicht da.

### 4. Abweichungen vom Ablauf in SKILL.md

- Selbstabfrage: Ich habe sie erst nach dem Lesen und vor dem Schreiben beantwortet (Python-Version, PyYAML/Pillow, Testbanner), nicht „vor der ersten Nachricht“; es gab keine Nachricht.
- Prüfdurchlauf nach `qualitaet.md`: nicht als eigener, getrennter Schritt mit Markerliste abgearbeitet, sondern beim Schreiben im Kopf (Dreierreihen, Ausrufezeichen, Rückfragen, Schlussformeln, Länge der Absätze, Fachprüfung der Rechnungen). Eine Probe aller Lösungen habe ich von Hand gerechnet. Keine `Offen:`-Zeile nötig. Nach dem Bau habe ich Text und Übungen kontrolliert und nur den Zuordnen-Titel geändert (Änderung nach Bau, bei „KI macht alles“ unkritisch, aber formal nach dem Durchlauf).
- Rendertest mit h5p-standalone (SKILL Ablauf 4): nicht gemacht (spec.md §B.2 nicht gelesen, keine Bibliotheken). Stattdessen die Textfeld-Vorschau in Chromium getestet (Zuordnen, Lückentext, Quiz laufen, keine JS-Fehler). Das H5P-Abschlussquiz ist nicht gerendert.
- Fachbilder mit eigenem Pillow-Skript (`bilder.py` im Arbeitsverzeichnis, nicht im Kursordner). „Kein Python schreiben“ bezieht sich laut SKILL auf den Kursbau; für Bilder ist es in der Selbstabfrage vorgesehen.
- Die mbz entpackt und das Vorschau-HTML mit Playwright geprüft ist über den Ablauf hinaus.
- Ein Hintergrundzugriff von Chromium auf www.google.com wurde vom Proxy abgelehnt (Meldung im Tool-Ergebnis); ich habe nichts im Internet gesucht.
- Wiederherstellungsanleitung und der Projektseiten-Satz stehen nur im Lieferungstext (unten), nicht in einer Datei.

### 5. Fehler beim Bau

- Parsermeldungen: keine. check.py: bei allen drei Läufen `OK ... (15 Aktivitäten, 2 Abschnitte, 6 Dateien, Format topics)`, keine Warnungen.
- Bauläufe: 3 (1: erster Bau; 2: gleicher Stand noch einmal, um die vollständige Ausgabe zu sehen; 3: nach der Änderung des Zuordnen-Titels). Die Dateiname trägt nur Minuten, der Name blieb deshalb gleich und die Datei wurde überschrieben.
- Inhaltlicher Fehler, den kein Werkzeug gemeldet hat: Zuordnen mit Ablenker ohne Hinweis (siehe 3).

### 6. Was fehlte oder unnötig war (je ein Vorschlag)

- Fehlend: In `intake.md` §1 für Weg 1 ausdrücklich sagen, welcher Darstellungsweg (Textfeld oder Aktivität) ohne Rückfrage gilt.
- Fehlend: In `kursdatei.md` §3 (Zuordnen) den Satz ergänzen, dass ein Ablenker in der Auswahlliste „passt nirgends“ heißt und die Aufgabe das sagen muss.
- Fehlend: In `kursdatei.md` §5 definieren, wann `→ richtig:` und wann `→ falsch:` angezeigt wird.
- Fehlend: In `kursdatei.md` §5 (Lückentext) schreiben, ob Leerzeilen zwischen den Zeilen nötig sind, und dass `*1/2*` zwei Alternativen ergibt (Bruchlücken nur für Zähler oder Nenner).
- Fehlend: Ein Mathe-Beispielkurs oder zumindest ein Satz, wie Rechenbilder (Bruchbalken, Kreise) mit Pillow erzeugt werden; `banner.py` kann nur Banner, Kacheln und Badge.
- Fehlend: Eine Zeile, ob `steckbrief.teile` bei „Lehrkraft nicht erreichbar/kein Import“ `pending` bleibt (SKILL Ablauf 5 und intake §7.5 sagen Verschiedenes).
- Fehlend: Dateiname der `.mbz` mit Sekunden oder Hinweis, dass ein zweiter Bau in derselben Minute überschreibt.
- Fehlend: Soll-Zeit-Regel, ob Allgemeines mitzählt (D8).
- Unnötig für den Einsatz: Die lange Dateienliste in `SKILL.md` „Dateien“ und der Absatz „Grenzen“ (Import-Test-Stände); der Assistent braucht sie nicht für den Bau.
- Unnötig: `intake.md` §1 Beispielnachricht „Womit starten wir?“, wenn schon alles in der ersten Nachricht steht; nur der Satz zur Abkürzung wird gebraucht.

### 7. Ergebnis

- `.mbz`: <arbeitsverzeichnis>/brueche6/out/brueche6_kurs_20261023-1923.mbz
- Vorschau Textfeld-Übungen: <arbeitsverzeichnis>/brueche6/out/brueche6_kurs_20261023-1923_textfeld.html
- Kursordner: <arbeitsverzeichnis>/brueche6/ (`kurs.md`, `steckbrief.yaml`, `assets/` mit banner.png, badge.png, erweitern.png, kuerzen.png, addieren.png)
- Ausgabe `python3 scripts/check.py brueche6/out/brueche6_kurs_20261023-1923.mbz`:
  `OK brueche6_kurs_20261023-1923.mbz (15 Aktivitäten, 2 Abschnitte, 6 Dateien, Format topics)`

Text zur Lieferung an die Lehrkraft (wörtlich):

> Der Kurs ist fertig: „Mathematik 6 – Brüche erweitern, kürzen und addieren“, eine Einheit von etwa 42 Minuten. Das Thema „Bruchrechnen“ war für 45 Minuten zu breit, ich habe eingegrenzt auf Brüche erweitern, kürzen sowie gleichnamige Brüche addieren und subtrahieren; ungleichnamige Brüche kommen nur als Hinweis mit einem Beispiel vor. Angenommen habe ich außerdem: Schulart offen, Du-Ansprache, ein Abschlussquiz mit 10 Fragen (bestanden ab 7 richtigen) und ein Badge. Das Drehbuch liegt als `kurs.md` bei, dort stehen die Annahmen oben.
>
> So spielst du die Sicherung ein:
> 1. Zielkurs öffnen, Mehr, Kurs wiederherstellen, `.mbz` hochladen, Wiederherstellen.
> 2. Schritt „Bestätigen“: nur Weiter.
> 3. Schritt „Ziel“: neuer Kurs in eine Kategorie, oder in diesen Kurs mit „löschen und dann wiederherstellen“ (nur so kommt das Kursformat mit).
> 4. Schritt „Einstellungen“: Weiter.
> 5. Schritt „Schema“: bei Formatwechsel „Kurseinstellungen überschreiben: Ja“, sonst bleibt das alte Kursformat. Weiter.
> 6. Wiederherstellen.
> 7. Danach: Badge unter Mehr, Badges aktivieren; Kursbild prüfen; einmal als Schüler/in durchspielen.
>
> Wichtig: Vier Übungen (Zuordnen, zwei Lückentexte, Zwischencheck) laufen direkt als Block im Textfeld auf der Kursseite. Öffne diese Textfelder nie mit „Einstellungen bearbeiten“ und speichere sie nicht. Der Editor der Plattform entfernt Skript und Stil, die Übung ist danach tot. Änderungen laufen über das Drehbuch und einen Neuimport. Die Moodle-App führt diese Übungen möglicherweise nicht aus; sie zeigen dann einen Hinweis, im Browser zu öffnen. Das Abschlussquiz ist eine normale Aktivität und zählt für das Badge. Der Import ist nicht auf der Plattform getestet; geprüft habe ich die Sicherung mit `check.py` und die Textfeld-Übungen im Browser.
>
> Rückmeldungen zum Skill nimmt die Projektseite entgegen: https://simon-sarkar.github.io/kursmuehle/ (Abschnitt Rückmeldung).

### 8. Zeit und Nachrichten

- Anfang: `Fri Oct 23 19:19:31 UTC 2026`
- Ende: `Fri Oct 23 19:25:17 UTC 2026` (nach dem Schreiben des Protokolls; letzter Bau und Check um 19:24)
- Geschätzte Nachrichten an die Lehrkraft im echten Chat: 1 (die Lieferung mit Drehbuch-Hinweis und Wiederherstellungsanleitung); höchstens 2, falls die Lehrkraft die Eingrenzung ändern will.

### Bewertung

Was sich gegenüber Durchlauf 1 geändert hat: keine Einstiegsfrage mehr (die Regel aus intake.md §1 griff), Themenformat
ohne Zögern, Badge-Bild und Banner mit `banner.py --badge` gerendert, Fachgrafiken (Pizza, Balken) mit Pillow selbst
gezeichnet, ASCII-Dateiname, Lieferungstext mit der Wiederherstellungsanleitung, der Textfeld-Regel und dem Satz zur
Projektseite, eine Nachricht an die Lehrkraft. Die Eingrenzung des Themas fiel anders aus (Erweitern, Kürzen, gleichnamig
addieren statt ungleichnamig addieren); beides ist für 45 Minuten vertretbar und steht als `Angenommen:` oben.

Drehbuch: D1–D10 eingehalten, Einstieg mit Fall, Verweise an jeder Übung, Rückmeldung je falscher Option im Zwischencheck,
Fälle im Abschlussquiz, Fehlertabelle als Sicherung, Zeitcheck 42 von 45 min. Fachlich richtig (geprüft: alle Lösungen in
Zuordnen, beiden Lückentexten, Zwischencheck und Abschlussquiz; Teilbarkeitsregeln im Hinweis). Slop-Prüfung: ein Treffer,
wieder die Umfrage-Einleitung („Drei Sätze, eine Minute.“, beschreibender Untertitel); sonst keiner.

Laufzeit und Tokens liegen über Durchlauf 1, weil der Agent die Vorschau der Textfeld-Übungen in Chromium durchklickte,
die `.mbz` entpackte und dreimal baute (einmal ohne Änderung, einmal nach einem Titel für den Ablenker im Zuordnen).
Der Kurs selbst war nach dem ersten Bau um 19:22 fertig, etwa drei Minuten nach dem Start.

Ratestellen aus Durchlauf 2 und was daraus geändert wurde:

| Fund | Änderung in 1.0 |
|---|---|
| Darstellungsweg bei Weg 1 nicht ausdrücklich | intake.md §1: Rangfolge aus §3 gilt ohne Rückfrage |
| Ablenker im Zuordnen ohne Hinweis in der Aufgabe | kursdatei.md §3: Ablenker bleibt liegen, die Aufgabe sagt es |
| `→ richtig:` / `→ falsch:` bei RF nicht definiert | kursdatei.md §5: Rückmeldung bei richtiger bzw. falscher Antwort |
| Lückentext: Absätze, Bruch als Lücke | kursdatei.md §5: Leerzeile = Absatz, Bruch nie als ganze Lücke |
| Zählt Allgemeines zur Soll-Zeit | intake.md §5: ja, höchstens 3 min |
| Fachgrafiken: wie erzeugen | intake.md §4: einfache Grafiken mit Pillow, auch ohne Bildgenerierung |
| `delivered` in SKILL.md und intake.md §7 verschieden | SKILL.md Schritt 5: erst nach bestätigtem Import |
| Zweiter Bau in derselben Minute überschreibt | build.py: Dateiname mit Sekunden |
| „Dateien“-Liste und harte Regeln zu Bibliotheken, json_content, Filearea sind Entwicklerwissen | SKILL.md: auf die vier Laufzeitdateien und einen Satz zum Generator gekürzt |

Nicht geändert: „Grenzen“ bleibt in SKILL.md, weil die Lieferung sagen muss, was auf der Plattform verifiziert ist; die
Umfrage-Einleitung ist Sache des Prüfdurchlaufs, nicht der Anleitung; ein Mathe-Beispielkurs wäre ein eigener Ordner
(Kandidat für `examples/`, siehe `docs/fortgeschrittene.md` §6; das Drehbuch aus diesem Durchlauf liegt daneben).

## Ergebnis für README und AP9

- Richtwert 1.0: eine 45-Minuten-Einheit ohne Material in etwa drei Minuten bis zur ersten fertigen `.mbz` (knapp sechs Minuten mit Browserprobe und Protokoll) mit einem Modell der Sonnet-Klasse, ohne Rückfrage,
  mit zwei Nachrichten an die Lehrkraft (Drehbuch und Lieferung). AP9 verlangte unter 5 Minuten für eine Einheit; beide Durchläufe halten das, wenn man den Bau zählt; mit Protokoll und Browserprobe liegen sie knapp darüber.
- Tokens: 140 000 bis 155 000 Tokens je Durchlauf (Gesamtsumme der Agent-Schnittstelle); der Skill liest etwa 25 000 Tokens Anleitung.
- Import-Test des Fremdtest-Kurses: Autor (`import-test-1.0.md`, Durchlauf 7). Drehbuch und Steckbrief aus Durchlauf 2
  liegen zum Nachbauen in `AP9_fremdtest_kurs.md` und `AP9_fremdtest_steckbrief.yaml` (Bilder mit `banner.py` rendern).
