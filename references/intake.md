# Intake: ByCS-Kurs per Fragen planen – Anleitung für den KI-Agenten

Zweck: Aus einem Gespräch mit der Lehrkraft einen **Kurs-Steckbrief** (YAML, Abschnitt 5) erzeugen, aus dem der Generator
den Kurs baut. Gilt zusammen mit „Leitfaden ByCS-Kurs per KI generieren“ (Spezifikation, Teil 2).

## 0. Regeln für das Gespräch

- **Erste Frage immer: Steuerungsgrad.** (a) „Ich entscheide“ – alle Runden, Drehbuch-Freigabe vor dem Bau.
  (b) „Vorschlag mit Freigabe“ (Standard) – KI schlägt vor, Lehrkraft bestätigt Gliederung und Drehbuch.
  (c) „KI macht alles“ – nur Runde 1, kein Drehbuch, direkt Kurs; Drehbuch wird trotzdem mitgeliefert, zum Nachlesen.
- Vier Runden, je höchstens vier Fragen. Jede Frage hat einen Standard; „weiter“ nimmt alle Standards der Runde an.
- Nach Runde 1 **Vorschlag statt Frage**: Gliederung und Formate werden von der KI vorgeschlagen, die Lehrkraft streicht/ändert.
- Fachbegriffe (H5P, Branching, Blanks) nicht verwenden; Formate heißen Lesebuch, Lernkarten, Zuordnen, Quiz, Geschichte, Lückentext.
- Keine Frage, deren Antwort aus einer früheren folgt. Keine Rückfrage zu Dingen, die der Steckbrief-Standard abdeckt.
- Antworten wörtlich in den Steckbrief; Unklares als `offen:` markieren, nicht raten.
- Nach den Runden: Steckbrief zeigen, bestätigen lassen, **Drehbuch** schreiben (Abschnitt 5), freigeben lassen, dann bauen.
  Kein Bau ohne Drehbuch-Freigabe, außer bei Steuerungsgrad (c).

## 1. Runde 1 – Rahmen und Material

| Frage | Standard | Steckbrief-Feld |
|---|---|---|
| Fach und Thema des Kurses? (ein Satz) | – (Pflicht) | kurs.fach, kurs.titel |
| Jahrgangsstufe(n) und Schulart? | – (Pflicht) | kurs.jahrgangsstufe, kurs.schulart |
| Einsatz: Selbstlernkurs, unterrichtsbegleitend oder Vertretung/Hausaufgabe? | selbstlernkurs | kurs.einsatz |
| Gesamtumfang in Schülerminuten, und soll er in Wochen/Lektionen portioniert werden? | 45 min, eine Lieferung | kurs.umfang_min, kurs.portionierung |
| Vorhandenes Material? eigene Folien, Arbeitsblätter, Notizen, PDFs, Links – bitte anhängen. | keins, KI erstellt | kurs.material |

Material wird vor Runde 2 gelesen (Fotos per Texterkennung); es bestimmt Gliederung und Fachinhalt. Fachliches kommt aus dem
Material, die KI ergänzt nur, wo es fehlt, und markiert das im Drehbuch.

Ableiten, nicht fragen: Sprachniveau (aus Jahrgangsstufe), Ton (Jgst ≤ 7: einfach, kurze Sätze; 8–10: sachlich-jugendnah,
Du; Oberstufe/Erwachsene: sachlich, Sie nur auf Wunsch), Abschlussverfolgung (Selbstlern: an, Bestehensgrenzen; begleitend: an,
nur Ansehen).

## 2. Runde 2 – Gliederung (Vorschlag)

KI schlägt vor: 3–6 Abschnitte (Themen) mit je 2–4 Lerneinheiten, Titel + ein Satz Inhalt + Dauer, Summe = Umfang.
Dann genau diese Fragen:

| Frage | Standard |
|---|---|
| Streichen, ergänzen, umbenennen? | Vorschlag übernehmen |
| Welche Lerneinheiten jetzt voll ausarbeiten, welche nur als Platzhalter anlegen? | alle voll |
| Reihenfolge fest (sequenziell) oder frei wählbar? | sequenziell, keine Sperren |
| Soll es einen Abschlusstest mit Badge geben? | ja, 70 %, ein Badge am Ende |

Bei Portionierung (Runde 1): je Lerneinheit ein Datum „sichtbar ab“ erfragen oder Lieferung in Etappen festlegen
(siehe „Sukzessiver Aufbau“ im Hauptleitfaden, Abschnitt O).

## 3. Runde 3 – Aufgabenformate

Menü zeigen, je Format ein Satz; Lehrkraft wählt je Lerneinheit oder nimmt den Standard.

| Format | Wofür | Standard |
|---|---|---|
| Textfeld | kurzer Input direkt auf der Kursseite (Einstieg, Fall, Hinweis) | Einstieg jeder LE |
| Seite | längerer Input mit Bildern, zum Lesen | Haupt-Input jeder LE |
| Video | Link, eingebettet; Link liefert die Lehrkraft | bei Bedarf |
| Lesebuch | Input in mehreren Seiten mit eingebauten Kontrollfragen (H5P) | nur bei längeren LEs |
| Lernkarten | Begriffe, Regeln, Vokabeln (Vorderseite/Rückseite) | bei Begriffs-LEs |
| Zuordnen | Sortieren, Kategorien, richtig/falsch zuordnen | 1× je LE |
| Quiz | Abschluss einer LE mit Bestehensgrenze | am Ende jeder LE |
| Lückentext | Formulierungen, Fachsprache, Rechenschritte | bei Sprach-/Rechen-LEs |
| Geschichte | Entscheidungen mit Folgen, mehrere Enden | 1× je Kurs (Ernstfall) |
| Selbsteinschätzung | drei Sätze vorher/nachher | bei Selbstlernkurs |
| Praxisauftrag | Seite mit Auftrag außerhalb des Kurses | optional |

Rhythmus: Lesen → Üben → Lesen → Üben → Sichern. Höchstens die Hälfte der Elemente H5P.

Fragen:

| Frage | Standard |
|---|---|
| Formate je Lerneinheit (oder „Standard“)? | Standard-Spalte |
| Bestehensgrenze für Quizze? | 70 % (Abschlusstest), Übungsquiz 60 % |
| Aufgaben eher Wissen (richtig/falsch) oder Anwendung (Fälle entscheiden)? | Mischung, Anwendung bevorzugt |
| Darf die KI Fälle, Namen, Marken erfinden (empfohlen), oder gibt es Vorgaben? | erfinden, fiktive Marken |

## 4. Runde 4 – Gestaltung und Lieferung

Gestaltung ist Geschmack, keine Vorgabe: fragen, nicht setzen. Wer nicht entscheiden will, bekommt bei der ersten
Lieferung zwei Varianten einer Abschnittsseite zur Auswahl.

| Frage | Standard |
|---|---|
| Kursseite eher schlicht (Überschriften, kurze Texte) oder gestaltet (Banner, Karten, Kacheln je Lerneinheit)? | schlicht |
| Eine Akzentfarbe für den Kurs oder je Abschnitt eine eigene? Farbwunsch? | eine Farbe, KI wählt |
| Banner-Bilder oben in Abschnitten: ja, nein, nur Kursbild? | nur Kursbild |
| Emojis oder Symbole als Marker auf Kacheln: ja/nein? | nein |
| Bilder im Inhalt: nur gerenderte Mock-Screenshots, eigene Fotos, oder KI-Bilder nach Prompt? | nur gerendert |
| Lieferung: Prototyp zuerst (empfohlen beim ersten Kurs) oder direkt Vollkurs? | Prototyp |

Antworten unter `kurs.design` im Steckbrief; bei „weiß nicht“: `design.varianten: true` → zwei Varianten zeigen.

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
farbe: #0F766E                                          optional: Akzentfarbe, kursbild: datei.png

## <Abschnitt> · 25 min                                 ## Allgemeines = Abschnitt 0 (optional)
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
- **Änderungsliste** bei jeder Revision oben im Drehbuch: `v2: S2 gekürzt · Frage 3 ersetzt · N4 neu · Zeit LE 1 20 → 18 min`.
  Nur die Änderungsliste und die geänderten Blöcke erneut zeigen, nicht das ganze Drehbuch, außer auf Wunsch.
- Freigabe = „passt“ der Lehrkraft (oder Steuerungsgrad c). Danach die Datei unverändert als `kurs.md` bauen; keine
  Umformulierung nach der Freigabe. Meldet der Parser einen Fehler (Zeile, Element), die Zeile korrigieren, nicht den Inhalt ändern.

## 6. Steckbrief (Ausgabeformat)

```yaml
kurs:
  titel: "…"                      # Kursname in ByCS-Lernplattform
  kurzname: "…"                   # ≤ 20 Zeichen
  beschreibung: "<p>…</p>"
  fach: "…"
  schulart: "…"
  jahrgangsstufe: "…"
  einsatz: selbstlernkurs         # selbstlernkurs | begleitend | vertretung
  ton: "…"                        # abgeleitet
  umfang_min: 90
  portionierung: keine            # keine | wochen | etappen
  badge: "…"                      # Name oder null
  bestehensgrenze: 70
  farbe: "#1D5FD1"
  design: {stil: schlicht, banner: kursbild, farbe_je_abschnitt: false, emoji_marker: false, varianten: false}
  steuerung: vorschlag            # entscheide | vorschlag | ki
  material: []                    # Dateinamen/Links der Lehrkraft
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
2. `python3 scripts/build.py --content <kursordner> --proto` (Erstkurs) oder ohne `--proto`; Etappen:
   `--delta` (alle `pending`) oder `--delta le2,le3`. Am Ende prüft `build.py` die Sicherung (`check.py`); bei `FEHLER`
   beheben und neu bauen, nicht liefern.
3. Nach erfolgreichem Import die gelieferten Teile auf `delivered` setzen.
