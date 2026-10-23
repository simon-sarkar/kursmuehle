# Kursdatei `kurs.md` – vollständige Referenz

Die Kursdatei ist das Drehbuch: eine Markdown-Datei, die `scripts/build.py` direkt liest. Kurzfassung auf einer Seite in
`intake.md` §5; dort steht auch, was der Assistent im Gespräch schreibt. Hier stehen alle Typen, Angaben und Regeln.
Beispiele: `examples/netzwerk9/kurs.md` (klein), `examples/alltagskompetenz/kurs.md` (alles).

## 1. Aufbau

```
# Drehbuch v1 · <Kurstitel> · <Minuten>        Kopfzeile, wird ignoriert (Titel kommt aus steckbrief.yaml)
farbe: #0F766E                                   Angaben zum Kurs (optional)
kursbild: kurs.png

## Allgemeines                                   Abschnitt 0 (optional; fehlt er, wird ein leerer angelegt)
### Banner: Netzwerkkomponenten                  Kursbanner: Bild + Titel + ein Satz, erstes Element des Kurses
bild: banner.png                                 optional; ohne Bild ein Block in Akzentfarbe
untertitel: Wie kommt das Internet aufs Handy?
### Textfeld: Willkommen
…
## <Abschnittstitel> · 25 min                    Abschnitt; „· N min“ am Ende wird entfernt
teil: netz                                       Angaben zum Abschnitt
### <Typ>: <Titel> · 4 min [Quelle: …]           Element
angabe: wert                                     Angaben zum Element, direkt unter der Überschrift
<Inhalt>
### Unterabschnitt: <Titel>                      Unterabschnitt; seine Elemente haben vier Rauten
teil: le1
#### <Typ>: <Titel>
…
### <Typ>: <Titel>                               wieder ein Element des Abschnitts
```

Ignoriert werden überall: `[Quelle: …]`, `[KI]`, `[KI: …]`, `(← S2)`, `(4 min)` und `· 4 min` am Ende von Überschriften
und `Seite:`-Zeilen, Zeilen `Zeit … min` (Zeitcheck), `v2: …` (Änderungsliste), `Angenommen: …` (Annahmen ohne Rückfrage)
und `Bildwunsch: …` (Bildprompts für die Lehrkraft) im Kopf. Nichts davon landet im Kurs.

Fehler brechen den Bau ab und nennen Datei, Zeile und Element. Unbekannte Typen, Angaben, Bilder, Zonen und Sprungziele
sind Fehler, keine Vermutungen.

## 2. Angaben (`schlüssel: wert`, klein geschrieben, direkt unter der Überschrift)

| Wo | Angabe | Bedeutung |
|---|---|---|
| Kurs | `farbe` | Akzentfarbe `#RRGGBB` oder rot, grün, blau, orange, lila; Standard `#1D5FD1` |
| Kurs | `kursbild` | PNG aus `assets/` als Kursbild |
| Abschnitt | `teil` | Schlüssel für `--delta` und `sichtbar_ab` im Steckbrief (`teile:`) |
| Abschnitt | `farbe` | Akzentfarbe des Abschnitts (vererbt an Unterabschnitte und Elemente) |
| Abschnitt, Unterabschnitt, Element | `sichtbar ab` | `JJJJ-MM-TT`, Datumsbedingung 06:00 Uhr; überschreibt den Steckbrief |
| Abschnitt, Unterabschnitt, Element | `prototyp: nein` | wird bei `--proto` weggelassen |
| Unterabschnitt | `teil` | wie beim Abschnitt |
| Banner | `bild`, `untertitel`, `name` | Bild aus `assets/` (optional), Satz unter dem Titel, Name im Kursindex (Standard = Titel) |
| Seite, Lesebuch, Zuordnen, Lernkarten, Geschichte, Lückentext, Link, Video | `abschluss` | `ansehen` (Standard), `bestehen`, `keine`, `manuell` |
| Quiz | `bestehen` | `80 %` oder `5 von 6`; Standard 70 % |
| Quiz | `einleitung` | Text der Startseite |
| Quiz | `abschluss` | Standard `bestehen` |
| Überblick | `untertitel`, `dauer`, `nummer`, `name` | Kopfkarte; `nummer` ist sonst die laufende Nummer des Unterabschnitts; `name` ist der Name im Kursindex (Standard „Überblick“) |
| Link, Video | `anzeige` | `eingebettet` (Standard), `automatisch`, `neues fenster`, `popup` |
| Lesebuch | `farbe` | Grundfarbe des Buchs |
| Zuordnen | `zonen` | Pflicht: `A \| B \| C` |
| Zuordnen | `spalten`, `breite`, `höhe`, `titel`, `hintergrund` | Standard 2 Spalten, 760 × 480; `titel` zeigt eine Überschrift im Inhalt; `hintergrund` PNG |
| Lernkarten | `titel`, `beschreibung`, `modus` | H5P-Titel (Standard = Elementtitel); `modus` normal oder repetition |
| Geschichte | `start`, `bild` | `Titel \| Untertitel` des Startbildschirms (Standard = Elementtitel), Startbild PNG |
| Lückentext | `aufgabe` | Pflicht: Aufgabenstellung |
| Umfrage | `einleitung`, `danach`, `skala` | Texte; `skala: 1 trifft gar nicht zu \| 2 \| 3 \| 4 \| 5 trifft voll zu` (Standard) |
| Badge | `beschreibung`, `bild`, `voraussetzung` | `bild` und `voraussetzung` Pflicht; `voraussetzung` = Titel der Elemente, deren Abschluss zählt (`\|`-getrennt) |
| Test | `bestehen`, `einleitung`, `versuche`, `mischen`, `rückmeldung`, `je seite`, `abschluss` | wie Quiz; `versuche` 0 = unbegrenzt (Standard); `mischen` ja (Standard); `rückmeldung` am ende (Standard) oder sofort; `je seite` Fragen je Seite (Standard 1); `abschluss` bestehen (Standard), ansehen, keine |
| Aufgabe | `abgabe`, `bewertung`, `bestehen`, `fällig`, `abschluss` | `abgabe` text (Standard), datei oder `text, datei`; `bewertung` Punkte (Standard 100, `keine`); `bestehen` in Prozent; `fällig` JJJJ-MM-TT (23:59); `abschluss` abgabe (Standard), ansehen, keine |
| Datei | `datei`, `abschluss` | Pflicht: Dateiname aus `assets/` (PDF, Bild, Office, Audio …) |
| Verzeichnis | `anzeige`, `abschluss` | `seite` (Standard) oder `eingebettet` (Dateiliste auf der Kursseite) |
| Forum | `typ`, `abschluss` | `allgemein` (Standard), `frage-antwort`, `je person`, `blog`; `abschluss` keine (Standard), beitrag, ansehen |
| Buch | `abschluss` | ansehen (Standard) |
| Abstimmung | `mehrfach`, `ergebnisse`, `ändern`, `abschluss` | `mehrfach` ja/nein; `ergebnisse` nie, nach abgabe (Standard), nach ende, immer; `ändern` ja = Antwort änderbar; `abschluss` abgabe (Standard) |
| Glossar | `anzeige`, `abschluss` | `wörterbuch` (Standard), fortlaufend, lexikon, faq, liste; `abschluss` keine (Standard), eintrag, ansehen |

## 3. Elementtypen

| Typ | Moodle/H5P | Inhalt |
|---|---|---|
| `Banner` | Textfeld (label) | Kursbanner: Bild (`bild:`), Titel, Satz (`untertitel:`); Textbausteine darunter erlaubt. Erstes Element in `## Allgemeines` |
| `Textfeld` | Textfeld (label) | Textbausteine (§4) |
| `Seite` | Textseite (page) | Textbausteine |
| `Überblick` | Textfeld mit Kopfkarte | Liste `- Schritt: Erklärung` (Lesen, Üben, Sichern) |
| `Link`, `Video` | URL (eingebettet) | eine Zeile mit `https://…` |
| `Lesebuch` | Interactive Book | `Seite: Titel`, darunter Textbausteine, `Bild:` und Fragen (§5) |
| `Quiz` | Question Set | nummerierte Fragen (§5): MC, RF, Einsetzen, Markieren, Lückentext |
| `Zuordnen` | Drag and Drop | `- Element → Zone`; ohne Zone = Ablenker |
| `Lernkarten` | Dialog Cards | `- Vorderseite → Rückseite · Bild: x.png · Tipp: …` |
| `Geschichte` | Branching Scenario | `Szene`, `Frage`, `Ende` (§6) |
| `Lückentext` | Fill in the Blanks | `aufgabe:` plus Absätze mit `*Lücke/Alternative:Tipp*` |
| `Umfrage` | Feedback | `- Aussage` (Skala) oder `- Frage → a \| b \| c` |
| `Badge` | Badge | nur Angaben; kein Element im Kurs, steht am sinnvollsten beim Abschlusstest |
| `Unterabschnitt` | Unterabschnitt | Elemente mit `####` |
| `Test` | Test (quiz, Fragensammlung) | nummerierte Fragen: MC, RF, Kurzantwort (§5a); bewertet, erscheint im Bewertungsbuch |
| `Aufgabe` | Aufgabe (assign) | Textbausteine = Aufgabenstellung; Abgabe als Text und/oder Datei |
| `Datei` | Datei (resource) | `datei: name.pdf`; Textbausteine darunter = Beschreibung |
| `Verzeichnis` | Verzeichnis (folder) | Liste `- name.pdf` (Dateien aus `assets/`); Textbausteine = Beschreibung |
| `Forum` | Forum | Textbausteine = Beschreibung |
| `Buch` | Buch (book) | `Kapitel: Titel`, `Unterkapitel: Titel`, darunter Textbausteine und `Bild:` (§6a) |
| `Abstimmung` | Abstimmung (choice) | Textbausteine = Frage, Liste `- Option` |
| `Glossar` | Glossar (glossary) | `\| Begriff \| Erklärung \| Alias \|` oder `- Begriff → Erklärung`; Textbausteine = Beschreibung |

Quiz oder Test? `Quiz` (H5P) läuft direkt auf der Seite, mit Einsetzen, Markieren und Lückentext, und zählt für
Badges und Abschluss. `Test` ist das Moodle-Modul: Versuche, Bewertungsbuch, Fragen in der Fragensammlung der Lehrkraft,
aber nur MC, RF und Kurzantwort. Für Zwischenchecks Quiz, für die benotete Kontrolle Test.

Inline überall: `**fett**` → `<b>`, `*kursiv*` → `<i>`, HTML (`<br>`, `<b>`, `<i>`) bleibt stehen. In Zeilen mit
`*Lücken*` (Einsetzen, Markieren, Lückentext) wird nichts umgewandelt.

## 4. Textbausteine (Textfeld, Seite, Lesebuch-Seiten, Kästen)

| Zeile | Ergebnis |
|---|---|
| Absatz (eine oder mehrere Zeilen, Leerzeile trennt) | `<p>` |
| `Vorspann: …` | größerer Einleitungsabsatz |
| `- Punkt` / `1. Schritt` | Aufzählung / nummerierte Schritte |
| `\| Begriff \| Erklärung \|` | zweispaltige Tabelle (Begriff farbig) |
| `Kasten: Titel` + eingerückte Zeilen | Kasten in Akzentfarbe; `Beispiel:` grün, `Hinweis:` orange |
| `Merke: …` | Merkkasten („Merk dir“) |
| `Vergleich:` + `- Links (rot):` / `- Rechts (grün):` mit eingerückten Unterpunkten | zwei Spalten |
| `Bild: datei.png \| Alt-Text` | Bild in voller Breite (Datei aus `assets/`) |
| `Bildzeile: datei.png \| Alt-Text \| Text` | kleines Bild links, Text rechts |
| `<p …>` | HTML-Zeile unverändert (Ausweg für Sonderfälle) |
| `Text (Titel):` | nur im Lesebuch: neuer Textblock mit eigenem Titel |
| `Fahrplan: Überschrift` + `- 📖 Titel · Dauer` | Kacheln der Lerneinheiten |
| `Kacheln: Überschrift` + `- 🔍 Titel · #Farbe · ausgearbeitet\|exemplarisch` | Kacheln der Themenfelder, vier je Reihe |
| `Themenfeld: Leitkompetenz \| Anmerkung` + `- Lerneinheit` | Leitkompetenz links, Lerneinheiten rechts |

Eingerückt heißt: zwei Leerzeichen. Ein Kasten ohne eingerückten Inhalt ist ein Fehler. Emojis in Fahrplan, Kacheln und
Überblick erscheinen nur, wenn der Steckbrief `emoji_marker: true` setzt.

## 5. Fragen (Lesebuch-Seiten und Quiz)

Jede Frage eine Zeile, Titel optional in Klammern. ✔ markiert richtige Antworten, `→` eine Rückmeldung.

```
MC (Titel): Frage? · A · ✔B · C                            eine Zeile; mehrere ✔ = Mehrfachauswahl
MC (Titel): Frage?                                         oder als Liste, mit Rückmeldung je Antwort
- ✔ Antwort → Rückmeldung, wenn gewählt
- Antwort → Rückmeldung
RF: Aussage ✔|✘ → richtig: Rückmeldung → falsch: Rückmeldung   (Rückmeldungen optional)
Einsetzen (Titel): Aufgabe                                  Drag the Words; Text darunter, eine Zeile je Zeile
Wand: *Buchse* → *Router*
Markieren (Titel): Aufgabe                                  Mark the Words; Text darunter
Mein *Nordvia* *X3* lädt *nicht*.
Lückentext (Titel): Aufgabe                                 Fill in the Blanks; Absätze darunter
Du bist ein *Techniker/Experte:Rolle*.
Aussagen (Titel): Anweisung                                 nur Lesebuch: je Zeile eine Gruppe, ✔ = richtig
- ✔Richtig. · Falsch. · Falsch.
Schnellquiz (Titel):                                        nur Lesebuch: Single Choice Set
- Frage? · ✔richtig · falsch · falsch
```

Im Quiz darf die Nummerierung (`1.`) davorstehen; eine nummerierte Zeile mit ` · ` und ✔ ist automatisch MC.
Antworttexte dürfen kein ` · ` enthalten (sonst Listenform nehmen). Standardtitel: Frage, Richtig oder falsch?,
Wörter zuordnen, Wörter markieren, Lückentext, Zusammenfassung, Schnellquiz.

## 5a. Test (Moodle-Fragensammlung)

```
### Test: Abschlusstest · 8 min (← Buch)
bestehen: 75 %                                    versuche: 2 · rückmeldung: sofort · einleitung: <Text>
1. Frage? · ✔A · B · C                            MC (Einfachauswahl); mehrere ✔ = Mehrfachauswahl (falsche Antworten zählen negativ)
2. MC (Titel): Frage?                              oder als Liste mit Rückmeldung je Antwort
- ✔ Antwort → Rückmeldung
3. RF: Aussage ✘ → richtig: … → falsch: …         Rückmeldungen optional
4. Kurzantwort (Titel): Frage? · Antwort · Alternative   jede Alternative zählt voll; `*` ist Platzhalter (Rout*)
```

Jede Frage ein Punkt; `bestehen` wie beim Quiz (`75 %` oder `6 von 8`). Einsetzen, Markieren, Lückentext, Aussagen und
Schnellquiz gibt es im Test nicht (nur im Quiz und Lesebuch). Die Fragen landen in einer eigenen Kategorie
„Standard für <Testname>“ der Fragensammlung.

## 6. Geschichte (Branching Scenario)

```
### Geschichte: Morgen ist das Referat
start: Titel | Untertitel
bild: story.png
Ende (hart): Harte Landung                 Schlüssel in Klammern; Text darunter = Untertitel des Endes
Der Laptop läuft wieder – nach einem Werksreset …
Szene (start): Sonntag, 19:30 Uhr → q1     erste Szene = Startknoten; Ziel nach →; Absätze darunter
Morgen, zweite Stunde: dein Referat …
**„Dein PC muss repariert werden.“**
Frage (q1): Was tust du zuerst?
- Neu starten. → restart
- Aufschreiben, was passiert. → describe
- Tom schreiben. → hart
```

Ziele sind Schlüssel von Szenen, Fragen oder Enden; unbekannte Ziele sind Fehler. Reihenfolge der Szenen = Reihenfolge
in der Datei.

## 6a. Buch (Moodle-Buch mit Kapiteln)

```
### Buch: Was ein gutes Passwort ausmacht · 8 min
Kapitel: Warum Passwörter wichtig sind        erste Zeile; darunter Textbausteine (§4) und Bild:
Vorspann: …
Kapitel: Länge schlägt Komplexität
Bild: schloss.png | Vorhängeschloss
Unterkapitel: Passphrasen                     eingerückt in der Navigation; nicht vor dem ersten Kapitel
```

Lesebuch oder Buch? `Lesebuch` (H5P Interactive Book) erlaubt Fragen zwischen den Seiten und wird in einem Fenster
geblättert. `Buch` ist das Moodle-Modul: schlichte Kapitelseiten mit Navigation, druckbar, ohne Fragen; gut für
Nachschlagetexte und längere Lesetexte. Beispiel mit allen Moodle-Modulen: `examples/module/kurs.md`.

## 7. Steckbrief und Bau

`steckbrief.yaml` liefert Titel, Kurzname, Beschreibung, `design.emoji_marker` und je `teil` den Status
(`pending`/`delivered`) und `sichtbar_ab`. Bau: `python3 scripts/build.py --content <ordner>`; `--proto` lässt alles mit
`prototyp: nein` weg und hängt „Prototyp“ an den Kursnamen; `--delta` baut die Teile mit `status: pending`,
`--delta le2,le3` die genannten; jeder Teil wird dabei ein eigener Abschnitt (Unterabschnitte werden Abschnitte).

Python bleibt als Ausweg: Liegt keine `kurs.md`, aber `content/course.py` mit `build(A, sb, proto)` im Kursordner,
wird sie genutzt (Bausteine in `scripts/gen/html.py`).

## 8. Grenzen

Nicht ausdrückbar in 1.0: Rückmeldung „nicht gewählt“ bei MC, Bilder in Szenen einer Geschichte, Buchdeckel,
Rückmeldungsbereiche des Quiz, Tipps bei Einsetzen/MC, Hintergrundbild mit Koordinaten beim Zuordnen (nur automatische
Anordnung), im Test andere Fragetypen als MC/RF/Kurzantwort, Zeitlimits und Öffnungszeiten bei Test und Aufgabe,
Forum-Diskussionen (Nutzerdaten), Unterordner im Verzeichnis. Wer das braucht, nimmt den Python-Ausweg.
