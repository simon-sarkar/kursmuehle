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
| Laufzeit (Start bis fertige `.mbz` samt Protokoll) | 5 min 10 s (19:11:44–19:16:54 UTC) | D2_ZEIT |
| Tokens gesamt (Eingabe und Ausgabe, Angabe der Agent-Schnittstelle) | 138 491 | D2_TOKENS |
| Werkzeugaufrufe | 19 | D2_TOOLS |
| Bauläufe bis `check.py` OK | 1 | D2_BAU |
| Rückfragen, die er gestellt hätte | 2 (Einstiegsfrage nach Vorlage; Eingrenzung des Themas) | D2_FRAGEN |
| Nachrichten an die Lehrkraft im echten Chat (Schätzung des Agenten) | 2 | D2_NACHR |
| Elemente im Kurs, Zeitcheck | 12 Aktivitäten; 38 min bei Soll 45 (−16 %) | D2_ELEM |
| Slop-Treffer gegen `qualitaet.md` im Review | 1 (beschreibender Untertitel in der Umfrage-Einleitung „Drei Sätze.“) | D2_SLOP |

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

D2_PROTOKOLL

### Bewertung

D2_BEWERTUNG

## Ergebnis für README und AP9

- Richtwert 1.0: eine 45-Minuten-Einheit ohne Material in D2_ZEIT_KURZ mit einem Modell der Sonnet-Klasse, ohne Rückfrage,
  mit zwei Nachrichten an die Lehrkraft (Drehbuch und Lieferung). AP9 verlangte unter 5 Minuten für eine Einheit; D2_URTEIL
- Tokens: D2_TOKENS_KURZ je Durchlauf (Gesamtsumme der Agent-Schnittstelle); der Skill liest etwa 25 000 Tokens Anleitung.
- Import-Test des Fremdtest-Kurses: Autor (`import-test-1.0.md`, Durchlauf 7). Drehbuch und Steckbrief aus Durchlauf 2
  liegen zum Nachbauen in `AP9_fremdtest_kurs.md` und `AP9_fremdtest_steckbrief.yaml` (Bilder mit `banner.py` rendern).
