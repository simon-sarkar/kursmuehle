# Intake: Kurs im Gespräch planen – Anleitung für den Assistenten

Zweck: Aus einem kurzen Gespräch mit der Lehrkraft entstehen der **Steckbrief** (`steckbrief.yaml`, §6) und das
**Drehbuch** (`kurs.md`, §5), aus denen der Generator den Kurs baut. Ziel: unter zehn Minuten Lehrkraft-Zeit bis zum
Drehbuch. Vorher hat der Assistent die Selbstabfrage aus `SKILL.md` beantwortet (Code, Dateien, Bilder).

## 0. Regeln für das Gespräch

- Erste Nachricht ist immer „Womit starten wir?“ (§1). Danach höchstens **eine Fragerunde** (§2), dann Vorschlag (§3)
  und Drehbuch (§5). Mehr Runden gibt es nicht; was fehlt, wird angenommen und im Drehbuch oben als `Angenommen: …` genannt.
- Jede Frage hat einen Vorschlag. „Weiter“, „passt“ oder keine Antwort nimmt alle Vorschläge an.
- Keine Frage, deren Antwort im Material steht oder aus einer früheren Antwort folgt. Material wird vor der Fragerunde gelesen.
- Nachfragen nur, wenn eine falsche Annahme teuer wäre: Jahrgangsstufe, Fach, Umfang, Format. Gestaltung, Ton, Bestehensgrenzen
  sind nie eine Rückfrage wert; dafür gibt es Vorschläge und das Drehbuch.
- Fachbegriffe vermeiden (H5P, Branching, Label). Formate heißen Lesebuch, Lernkarten, Zuordnen, Quiz, Geschichte, Lückentext.
- Antworten wörtlich in den Steckbrief; Unklares als `offen:` markieren, nicht raten.
- Kein Bau ohne Drehbuch-Freigabe, außer bei „KI macht alles“; das Drehbuch wird dann zum Nachlesen mitgeliefert.

## 1. Einstieg: „Womit starten wir?“

Eine Nachricht mit drei Blöcken. Die Lehrkraft antwortet in einem Satz oder mit Ziffern und Buchstaben.

**Weg** (genau diese fünf):

1. **Nur ein Thema nennen** – der Assistent macht alles, die Lehrkraft liest das Drehbuch.
2. **Eigenes Material abgeben** (Folien, Fotos, Arbeitsblätter, PDFs, Links) – der Assistent baut daraus.
3. **Material und ein paar Fragen** – Material plus eine Fragerunde.
4. **Fragen ohne Material** – eine Fragerunde, der Assistent schreibt den Inhalt.
5. **Bestehenden Kurs erweitern** – Nachlieferung (Delta) in einen laufenden Kurs.

**Steuerungsgrad** (Vorschlag folgt aus dem Weg: 1 → c, 2 und 3 → b, 4 → b, 5 → b):

- (a) **Ich entscheide** – Fragerunde, Gliederung und Drehbuch werden einzeln freigegeben.
- (b) **Vorschläge freigeben** – Gliederung steht oben im Drehbuch, eine Freigabe für beides.
- (c) **KI macht alles** – kein Halt, Kurs wird direkt gebaut, Drehbuch liegt bei.

**Rahmen in einem Satz**, soweit nicht schon genannt: Fach, Thema, Jahrgangsstufe und Schulart, Einsatz
(Selbstlernkurs, unterrichtsbegleitend, Vertretung) und Umfang in Schülerminuten. Vorschläge: Einsatz unterrichtsbegleitend,
Umfang 45 min. Fehlt die Jahrgangsstufe, gilt Mittelstufe (8–10) als Annahme; nachgefragt wird nur bei Weg 4.

Beispiel der ersten Nachricht (so kurz):

```
Womit starten wir?
1 nur ein Thema nennen · 2 eigenes Material abgeben · 3 Material + ein paar Fragen · 4 Fragen ohne Material ·
5 bestehenden Kurs erweitern
Wie viel entscheidest du? a ich entscheide · b Vorschläge freigeben · c KI macht alles
Dazu in einem Satz: Fach, Thema, Jahrgangsstufe, Einsatz, Minuten (Vorschlag: begleitend, 45 min).
```

Bei Weg 1 folgt auf die Antwort keine weitere Frage: Format nach Empfehlung (§2), Gestaltung schlicht mit Banner, Bilder
nach §4, Annahmen oben im Drehbuch. Bei Weg 2 liest der Assistent das Material und stellt nur Fragen, die es nicht
beantwortet; meist bleibt die Formatfrage. Bei Weg 5 braucht er das alte Drehbuch oder eine Liste der vorhandenen
Abschnitte; die Fragerunde fragt dann, was dazukommt und ab wann es sichtbar ist (Bau mit `--delta`, Regeln spec §O).

Ableiten, nicht fragen: Sprachniveau und Ton aus der Jahrgangsstufe (≤ 7: einfach, kurze Sätze; 8–10: sachlich-jugendnah,
Du; Oberstufe und Erwachsene: sachlich, Sie nur auf Wunsch), Abschlussverfolgung aus dem Einsatz (Selbstlernkurs: an mit
Bestehensgrenzen; begleitend: an, nur Ansehen).

## 2. Die Fragerunde

Eine Nachricht, höchstens vier Fragen, jede mit Vorschlag. Welche Fragen, hängt vom Weg ab; bei Weg 1 entfällt die Runde.

| Frage | Vorschlag | Weg |
|---|---|---|
| **Kursformat?** Empfehlung nach Kurstyp (Tabelle unten), die Lehrkraft entscheidet. | Empfehlung | 2, 3, 4 |
| Umfang und Portionierung: eine Lieferung, oder in Wochen bzw. Etappen sichtbar werden lassen? | eine Lieferung | 3, 4 |
| Abschluss: Abschlusstest mit Badge? Bestehensgrenze? | ja, 70 %, ein Badge am Ende (Selbstlernkurs); nein (begleitend) | 3, 4 |
| Gestaltung: schlicht mit Banner in einer Akzentfarbe, oder gestaltet (Karten, Abschnittsbilder)? Farbwunsch? | schlicht, Farbe wählt der Assistent | 3, 4 |
| Was kommt dazu, hinter welchem Abschnitt, ab wann sichtbar? | hinten anhängen, sofort sichtbar | 5 |

Bei Weg 2 nur die Fragen stellen, die das Material offenlässt, in der Regel das Kursformat; Umfang und Gliederung
ergeben sich aus dem Material.

**Formatfrage** – früh und ausdrücklich, mit Empfehlung:

| Kurstyp | Empfehlung | Warum |
|---|---|---|
| Selbstlernkurs mit mehreren Einheiten | **Kacheln** | eine Kachel je Einheit, Fortschritt sichtbar, auf dem Handy übersichtlich |
| Wochenplan, Begleitung über mehrere Wochen | **Wochen** | Abschnitte tragen Datumsbereiche, aktuelle Woche hervorgehoben |
| Materialsammlung, Vertretung, eine einzelne Einheit | **Themen** | alles auf einer Seite, nichts versteckt |
| Nur ein Test, ein Forum, eine Abgabe | **Einzelaktivität** | der Kurs ist die Aktivität |

Weitere Formate (Ein-Themen-Format, komprimierte Abschnitte, Lernlandkarte) nur, wenn die Lehrkraft sie nennt.
Der Generator baut derzeit das Format **Themen**; jedes andere Format wird im Steckbrief (`format:`) vorgemerkt, der Bau
meldet einen Hinweis, und die Lehrkraft stellt nach dem Import unter Kurseinstellungen → Kursformat um; der Inhalt bleibt.
Die Entwicklerliste aller Formate steht in `references/formate.md` und wird im Gespräch nicht gebraucht.

## 3. Vorschlag statt Fragen: Gliederung und Formate

Nach der Fragerunde (bei Weg 1 sofort) schlägt der Assistent vor; die Lehrkraft streicht, ergänzt oder sagt „passt“.
Bei Steuerungsgrad (a) ist der Vorschlag eine eigene Nachricht, bei (b) steht er als Überblick oben im Drehbuch, bei (c)
entfällt die Freigabe.

Gliederung: bis 45 min ein Abschnitt mit einer Lerneinheit; darüber 3–6 Abschnitte mit je 2–4 Lerneinheiten, je Einheit
Titel, ein Satz Inhalt und Dauer; Summe = Umfang. Standards, die ohne Frage gelten: alle Einheiten voll ausgearbeitet,
Reihenfolge frei ohne Sperren, Übungsquiz 60 %, Abschlusstest 70 %, Mischung aus Wissen und Anwendung mit Vorrang für
Anwendung, erfundene Fälle und fiktive Marken.

Formate je Lerneinheit, ein Satz je Format:

| Format | Wofür | Standard |
|---|---|---|
| Banner | Bild, Titel, ein Satz als erstes Element des Kurses | immer, in Abschnitt 0 |
| Textfeld | kurzer Input direkt auf der Kursseite (Einstieg, Fall, Hinweis) | Einstieg jeder Einheit |
| Seite | längerer Input mit Bildern, zum Lesen | Haupt-Input jeder Einheit |
| Video | Link, eingebettet; Link liefert die Lehrkraft | bei Bedarf |
| Lesebuch | Input in mehreren Seiten mit eingebauten Kontrollfragen | nur bei längeren Einheiten |
| Lernkarten | Begriffe, Regeln, Vokabeln (Vorderseite, Rückseite) | bei Begriffs-Einheiten |
| Zuordnen | Sortieren, Kategorien, richtig/falsch zuordnen | einmal je Einheit |
| Quiz | Abschluss einer Einheit mit Bestehensgrenze | am Ende jeder Einheit |
| Lückentext | Formulierungen, Fachsprache, Rechenschritte | bei Sprach- und Rechen-Einheiten |
| Geschichte | Entscheidungen mit Folgen, mehrere Enden | einmal je Kurs |
| Selbsteinschätzung | drei Sätze vorher und nachher | bei Selbstlernkurs |
| Praxisauftrag | Seite mit Auftrag außerhalb des Kurses | optional |

Rhythmus: Lesen → Üben → Lesen → Üben → Sichern. Höchstens die Hälfte der Elemente sind interaktive Übungen.

## 4. Bilder

Was der Assistent kann, hat die Selbstabfrage ergeben (`assistent.bilder` im Steckbrief). Daraus folgt einer von drei Wegen:

| Kann Bilder erzeugen | Weg | Steckbrief `bilder:` |
|---|---|---|
| ja | Bilder selbst erzeugen und als PNG nach `assets/` legen: `banner.png` (1600 × 420, Kursbanner), `kurs.png` (1600 × 520, Kursbild; fehlt es, dient das Banner als Kursbild), bei „gestaltet“ je Abschnitt ein Bild (1600 × 420). | selbst |
| nein, aber Code | `python3 scripts/banner.py --farbe "#RRGGBB" --out <kursordner>/assets/banner.png` rendert ein textfreies Banner in der Akzentfarbe (braucht Playwright und Chromium; `--motiv` wählt das Muster). Scheitert das, Banner ohne `bild:`. | gerendert |
| nein | Banner-Element ohne `bild:` bauen (farbiger Block mit Titel und Satz) und am Ende des Drehbuch-Kopfs je Bild eine Zeile `Bildwunsch: banner.png \| 1600 × 420 \| <Prompt>` liefern. Die Lehrkraft erzeugt die Bilder, legt sie in `assets/`, der Assistent trägt `bild:` nach und baut neu. | lehrkraft |

Regeln für erzeugte Bilder und Prompts: ruhig und flächig, eine Akzentfarbe, Motiv aus dem Thema, **kein Text im Bild**
(Titel und Satz setzt das Banner-Element als HTML, auf dem Handy lesbar), keine Gesichter, keine Logos. Fotos aus dem
Material der Lehrkraft (Heftbilder, Folien) werden als PNG übernommen und mit sprechendem Dateinamen referenziert. Wenige,
große Bilder: Banner immer, Abschnittsbilder nur bei „gestaltet“, keine Bilder als Dekoration zwischen Absätzen.

## 5. Drehbuch = Kursdatei – Inhalt zum Lesen vor dem Bau

Zweck: Die Lehrkraft liest den gesamten Inhalt als Text, korrigiert, promptet nach; gebaut wird erst die freigegebene Fassung.
Lesen und Nachprompten ist die Reibung – **so kurz wie möglich, so lang wie nötig**. Kein Prosa-Rahmen, keine
Erklärungen an die Lehrkraft, keine Wiederholung des Steckbriefs. Das Drehbuch ist zugleich die Kursdatei `kurs.md`:
`scripts/build.py` liest sie direkt; Quellen-, Zeit- und Bezugsmarker ignoriert der Parser. Vollständige Referenz
(alle Angaben, Bausteine, Grenzen): `references/kursdatei.md`. Vorbild: `examples/netzwerk9/kurs.md`.

Format (Markdown, Überschriften tragen die Struktur, Angaben stehen klein geschrieben direkt darunter):

```
# Drehbuch v1 · <Kurstitel> · <Umfang> min
v2: S2 gekürzt · Frage 3 ersetzt                       Änderungsliste (wird ignoriert)
Angenommen: Jgst 9, begleitend, 45 min                 Annahmen bei Weg 1 (wird ignoriert)
Bildwunsch: banner.png | 1600 × 420 | <Prompt>          nur wenn die Lehrkraft Bilder erzeugt (wird ignoriert)
farbe: #0F766E                                          optional: Akzentfarbe, kursbild: datei.png

## Allgemeines                                          Abschnitt 0
### Banner: <Kurstitel>                                 erstes Element: Bild + Titel + ein Satz
bild: banner.png                                        weglassen, solange es kein Bild gibt
untertitel: <ein Satz>
## <Abschnitt> · 25 min
teil: le1                                               Schlüssel für Steckbrief, --delta, sichtbar ab
### Überblick: <Titel>                                  Kopfkarte; untertitel:, dauer:, dann - Lesen: … / - Üben: …
### Textfeld: <Name> · 2 min [Quelle: Folie 3]          kurzer Input auf der Kursseite
Vorspann: <Einleitungssatz>
<Absatz>                                               Leerzeile = neuer Absatz; **fett**, *kursiv*, <br>
- <Punkt> / 1. <Schritt>                                Liste / Schritte
| <Begriff> | <Erklärung> |                             Tabelle
Kasten: <Titel>   (auch Beispiel:, Hinweis:)            Inhalt zwei Leerzeichen eingerückt
  <Absatz oder Liste>
Merke: <Merksatz>
Bild: <datei.png> | <Alt-Text>                          Bild aus assets/
### Seite: <Titel> · 5 min                              längerer Input, gleiche Bausteine
### Video: <Titel>                                      Link, eingebettet; darunter die https://-Zeile
### Lesebuch: <Titel> · 12 min
Seite: <S1-Titel> (4 min) [KI]                          Bausteine wie oben, dazwischen Fragen:
MC (<Titel>): <Frage>? · <A> · ✔<B> · <C>                 eine Zeile, oder Antworten als - Liste mit → Rückmeldung
RF: <Aussage> ✘ → richtig: <Satz> → falsch: <Satz>
Einsetzen: <Aufgabe>  /  Markieren: <Aufgabe>  /  Lückentext: <Aufgabe>   Text mit *Lücken* in den Zeilen darunter
Aussagen: <Anweisung>  → - ✔<richtig> · <falsch> · <falsch>   (je Zeile eine Gruppe)
Schnellquiz:           → - <Frage>? · ✔<richtig> · <falsch>
### Lernkarten: <Titel> · 4 min
- <Vorderseite> → <Rückseite> · Bild: <datei.png>
### Zuordnen: <Titel> (← S2)
zonen: <A> | <B>
- <Element> → <A>
### Quiz: <Titel> · 6 min (← S1–S3)
bestehen: 80 %                                          einleitung: <Text der Startseite>
1. <Frage>? · <A> · ✔<B> · <C> · <D>
2. RF: <Aussage> ✘
### Geschichte: <Titel> · 12 min
start: <Titel> | <Untertitel>                           bild: <datei.png>
Szene (n1): <Titel> → f1                                Absätze darunter
Frage (f1): <Frage>?
- <Antwort> → n2
- <Antwort> → hart
Ende (hart): <Titel>                                    Text darunter
### Umfrage: Selbsteinschätzung                         - <Aussage> (Skala 1–5)
### Badge: <Name>                                       beschreibung:, bild:, voraussetzung: <Quiztitel>
### Unterabschnitt: <Titel>                             Elemente darin mit ####
Zeit LE 1: 20 min ✔ (Soll 20)
```

Regeln:
- Jede Aufgabe eine Zeile; richtige Antwort mit ✔, falsche Aussage mit ✘. Rückmeldungen (`→`) nur, wo sie etwas erklären.
- **Erst Input, dann Kontrolle:** Jede bewertete Aufgabe muss aus dem beantwortbar sein, was im selben Lesebuch davor steht
  (oder aus explizit vorausgesetztem Vorwissen). Aktivierungsfragen vor dem Input sind erlaubt, aber unbewertet – als Text
  („Überleg kurz: …“), Auflösung auf der nächsten Seite. Jede Aufgabe im Drehbuch trägt einen Verweis, worauf sie aufbaut
  (`(← S2)`); fehlt der Verweis, ist die Aufgabe falsch platziert. Keine Rückmeldung „falsch“ auf Fragen, die nur Vorwissen testen.
- **Quellenmarkierung** je Textblock: `[Quelle: …]` (aus dem Material der Lehrkraft) oder `[KI]` (erfunden/ergänzt). Nur im Drehbuch,
  nie im Kurs – der Parser entfernt sie. Eine Zweck- oder Quellenzeile als Kursinhalt ist ein Fehler.
- **Zeitcheck**: je Aufgabe/Seite Minuten schätzen (Lesen 150 Wörter/min, MC 45 s, Karte 20 s, Quizfrage 45 s, Geschichtsknoten 40 s),
  je LE summieren, gegen Soll ausweisen (`Zeit LE 1: …`); Abweichung > 20 % mit Vorschlag (kürzen/ergänzen) melden.
- Umfang: eine 45-Minuten-Stunde ≈ 2–3 Seiten Drehbuch. Länger nur, wenn der Inhalt es verlangt.
- **Annahmen** bei Weg 1 und überall, wo der Assistent ohne Frage entschieden hat: eine Zeile `Angenommen: …` im Kopf.
  Die Lehrkraft korrigiert dort, statt gefragt zu werden.
- **Änderungsliste** bei jeder Revision oben im Drehbuch: `v2: S2 gekürzt · Frage 3 ersetzt · N4 neu · Zeit LE 1 20 → 18 min`.
  Nur die Änderungsliste und die geänderten Blöcke erneut zeigen, nicht das ganze Drehbuch, außer auf Wunsch.
- Freigabe = „passt“ der Lehrkraft (oder Steuerungsgrad c). Danach die Datei unverändert als `kurs.md` bauen; keine
  Umformulierung nach der Freigabe. Meldet der Parser einen Fehler (Zeile, Element), die Zeile korrigieren, nicht den Inhalt ändern.

## 6. Steckbrief (Ausgabeformat)

```yaml
kurs:
  titel: "…"                      # Kursname in der ByCS-Lernplattform
  kurzname: "…"                   # ≤ 20 Zeichen
  beschreibung: "<p>…</p>"
  fach: "…"
  schulart: "…"
  jahrgangsstufe: "…"
  einsatz: selbstlernkurs         # selbstlernkurs | begleitend | vertretung
  ton: "…"                        # abgeleitet
  umfang_min: 90
  portionierung: keine            # keine | wochen | etappen
  format: themen                  # themen | kacheln | wochen | einzelaktivitaet (Empfehlung §2; gebaut wird bis auf Weiteres themen)
  badge: "…"                      # Name oder null
  bestehensgrenze: 70
  farbe: "#1D5FD1"
  design: {stil: schlicht, banner: true, farbe_je_abschnitt: false, emoji_marker: false, varianten: false}
  weg: thema                      # thema | material | material_fragen | fragen | delta
  steuerung: vorschlag            # entscheide | vorschlag | ki
  assistent: {code: ja, dateien: ja, bilder: nein}   # Selbstabfrage aus SKILL.md
  bilder: gerendert               # selbst | gerendert | lehrkraft (§4)
  material: []                    # Dateinamen/Links der Lehrkraft
  angenommen: []                  # Annahmen ohne Rückfrage, auch im Drehbuch-Kopf
  offen: []                       # ungeklärte Punkte, vor dem Bau klären
teile:                            # Schlüssel frei, Reihenfolge = Kursreihenfolge
  start: {status: pending, titel: "Allgemeines", inhalt: "Banner, So funktioniert der Kurs, Selbsteinschätzung vorher"}
  tf1:   {status: pending, titel: "…", ausarbeitung: voll}          # Abschnitt
  le1:   {status: pending, titel: "…", abschnitt: tf1, dauer_min: 20, formate: [lesebuch, lernkarten, zuordnen],
          inhalt: "ein Satz", sichtbar_ab: null}
  …
```

`status`: `pending` = noch nicht im Kurs, `delivered` = importiert (nicht mehr ändern; Änderungen = Abschnitt löschen und
Delta neu einspielen). `sichtbar_ab: YYYY-MM-DD` erzeugt eine Datums-Zugriffsbeschränkung.

## 7. Übergabe an den Bau

1. Kursordner anlegen: `kurs.md` (freigegebenes Drehbuch), `steckbrief.yaml`, `assets/` (PNG, per Dateiname referenziert).
   Teile-Schlüssel des Steckbriefs (`teile:`) = `teil:` an Abschnitten und Unterabschnitten der Kursdatei.
2. Bilder nach §4: selbst erzeugt, mit `scripts/banner.py` gerendert, oder vorerst ohne `bild:`.
3. `python3 scripts/build.py --content <kursordner> --proto` (Erstkurs) oder ohne `--proto`; Etappen:
   `--delta` (alle `pending`) oder `--delta le2,le3`. Am Ende prüft `build.py` die Sicherung (`check.py`); bei `FEHLER`
   beheben und neu bauen, nicht liefern.
4. Nach erfolgreichem Import die gelieferten Teile auf `delivered` setzen.
