---
name: kursmuehle
description: Baut komplette Kurse für die ByCS-Lernplattform (Bayern, Moodle-basiert, früher mebis) als importierbare .mbz-Sicherung – Abschnitte, Seiten, H5P-Inhalte (Interaktiver Inhalt), Tests, Aufgaben, Foren, Bücher, Abstimmungen, Glossare, Dateien, Umfragen, Badges – aus einer Kursbeschreibung oder einem Fragen-Intake. Verwenden, wenn jemand einen ByCS-/mebis-/Moodle-Kurs, eine Kurssicherung, H5P-Aktivitäten für die Lernplattform oder eine Nachlieferung (Delta) zu einem bestehenden Kurs will.
---

# ByCS-Lernplattform-Kurs generieren

Ergebnis ist immer eine `.mbz`, die die Lehrkraft über Kurs → Mehr → Kurs wiederherstellen einspielt (Anleitung unten).
Code-Ausführung (Python 3.11+, PyYAML, Pillow; Playwright+Chromium nur für Bilder) ist Voraussetzung.

**Regel vor allem anderen:** Ein Textfeld mit Übungsblock (Textfeld-Modus, `website: textfeld`) darf die Lehrkraft nie mit
„Einstellungen bearbeiten“ öffnen und speichern. Der Editor der Plattform entfernt Skript und Stil, die Übung ist danach ein
totes Gerüst. Änderungen laufen über das Drehbuch und ein Delta oder einen Neuimport. Dieser Satz steht in jeder Lieferung,
die einen solchen Block enthält. Ungeprüfter Ausweg: Texteditor in den Nutzereinstellungen vorübergehend auf „Textbereich“
stellen, dann bearbeiten.

## Selbstabfrage (vor der ersten Nachricht, nicht an die Lehrkraft)

Drei Fragen an sich selbst; die Antworten stehen im Steckbrief unter `assistent:` und bestimmen den Weg bei Bau und Bildern.
Nicht raten: wer unsicher ist, probiert es (`python3 --version`, ein kleines Testbild).

| Kann ich … | ja | nein |
|---|---|---|
| Code ausführen (Python 3.11+, PyYAML, Pillow)? | Kurs bauen wie unten | Drehbuch und Steckbrief liefern; Bau in einem Assistenten mit Code-Ausführung empfehlen |
| Dateien lesen (PDF, PPTX, Bilder)? (nur bei Material) | Material der Lehrkraft lesen, Fotos übernehmen | Lehrkraft bitten, Text einzufügen und Fotos zu beschreiben |
| Bilder erzeugen? | Banner, Kursbild, Abschnittsbilder selbst erzeugen und in `assets/` legen (intake.md §4) | `python3 scripts/banner.py` rendern (Playwright), sonst Banner ohne Bild und `Bildwunsch:`-Zeilen für die Lehrkraft |

## Ablauf

1. **Einstieg** nach `references/intake.md`: erste Nachricht „Womit starten wir?“ mit fünf Wegen (nur Thema · Material ·
   Material + Fragen · Fragen · bestehenden Kurs erweitern), Steuerungsgrad (entscheide / Vorschläge freigeben / KI macht
   alles) und Rahmen in einem Satz. Nennt die erste Nachricht schon Thema, Jahrgangsstufe, Einsatz und Minuten, entfällt
   diese Frage: Weg „nur Thema“, KI macht alles, sofort bauen. Sonst höchstens **eine Fragerunde** (Kursformat mit
   Empfehlung, Umfang, Abschluss, Gestaltung; jede Frage mit Vorschlag) und ein Gliederungsvorschlag. Bei „nur Thema“ keine
   Rückfrage: Annahmen stehen als `Angenommen:` oben im Drehbuch. Ergebnis: `steckbrief.yaml` (Schema in intake.md §6).
2. **Drehbuch = Kursdatei** (intake.md §5, Referenz `references/kursdatei.md`): gesamter Inhalt als `kurs.md` im
   Drehbuch-Format mit Quellen- und Zweckmarker und Zeitcheck → ein Prüfdurchlauf nach `references/qualitaet.md` →
   Freigabe durch die Lehrkraft (bei „KI macht alles“ keine Freigabe, der Durchlauf läuft dann vor dem Bau).
   Bei Revision nur Änderungsliste + geänderte Blöcke zeigen. Die freigegebene Datei wird unverändert gebaut.
3. **Bau**: Kursordner mit `kurs.md`, `assets/` (PNG), `steckbrief.yaml` (Vorbild `examples/netzwerk9/` = minimal,
   `examples/alltagskompetenz/` = alle Elementtypen). Kein Python schreiben. Erstes Element in `## Allgemeines` ist
   `### Banner:` (Bild + Titel + ein Satz); Bild nach intake.md §4: selbst erzeugt, `python3 scripts/banner.py`, oder ohne `bild:`.
   Kursformat aus dem Steckbrief (`format:` themen, kacheln, wochen, einthemen, komprimiert, einzelaktivitaet); bei Kacheln
   je Abschnitt `kachelbild:` (PNG 900 × 600, eigenes Motiv je Abschnitt; `banner.py --kachel --nummer 1-N`) oder
   `kachelicon:`, Abschnittstitel dann höchstens ~35 Zeichen. Kursbild und Kachelbilder ohne Text (die Plattform setzt
   Namen darüber); Banner mit Text nur als `Bild:` im Abschnitt.
   Darstellungsweg der Übungen, Rangfolge (intake.md §3): Textfeld-JS für formative Übungen (`website: textfeld`, jede
   Übung ein Block direkt auf der Kursseite), H5P- oder Moodle-Aktivität für alles Bewertete und Abschlussrelevante
   (bleibt im Textfeld-Modus automatisch Aktivität, wenn `abschluss: bestehen` gilt, beim Quiz Standard), Website-Datei für
   eine ganze Einheit am Stück (`website: ja`, `vollbild`, `neues fenster`). Angabe im Steckbrief (`kurs.website`) oder am
   Abschnitt; die Kursdatei bleibt gleich (kursdatei.md §7a). Im Kachelformat fällt ein Überblick in Allgemeines weg.
   `python3 scripts/build.py --content <kursordner>`; die `.mbz` liegt danach in `<kursordner>/out/` (Dateiname aus dem
   Kurznamen, ASCII). `--proto` nur, wenn die Lehrkraft erst einen Prototyp zum Ansehen will (Kursname mit Zusatz
   „Prototyp“, Teile mit `prototyp: nein` fehlen); die Lieferung läuft ohne `--proto`.
   Etappen: `--delta` (alle `status: pending`) oder `--delta le2,le3`; Teile = `teil:` im Abschnitt. Freigabe nach Datum:
   `sichtbar_ab:` im Steckbrief oder `sichtbar ab:` in der Kursdatei. Parserfehler nennen Zeile und Element: beheben, nicht raten.
4. **Prüfung vor Lieferung**: Was sich nach der Freigabe geändert hat, läuft noch einmal durch `qualitaet.md`.
   Strukturell prüft `build.py` die fertige `.mbz` selbst (`scripts/check.py`: Archiv, IDs, Dateien und Hashes, Bilder,
   Bibliotheksversionen, Verfügbarkeits-JSON); meldet es `FEHLER`, wird nicht geliefert, sondern behoben. Von Hand:
   `python3 scripts/check.py <datei.mbz>`. Wenn möglich Rendertest mit h5p-standalone und den Bibliotheken aus §B.2.
5. **Lieferung**: `.mbz`, dazu die Wiederherstellungsanleitung (unten) in der passenden Variante (neuer Kurs, in diesen
   Kurs, Delta), bei Glossar der XML-Schritt, bei Badge das Aktivieren, bei Übungsblöcken im Textfeld die Regel von oben.
   Steckbrief-Teile erst auf `delivered`, wenn die Lehrkraft den Import bestätigt hat. Ein Satz zum Schluss, einmal je Kurs: Rückmeldungen zum Skill nimmt die Projektseite
   entgegen (https://simon-sarkar.github.io/kursmuehle/, Abschnitt Rückmeldung).

## Wiederherstellen auf der ByCS-Lernplattform (Text für die Lieferung)

1. Zielkurs öffnen → Mehr → Kurs wiederherstellen → `.mbz` hochladen → Wiederherstellen.
2. Schritt „Bestätigen“: nur Weiter.
3. Schritt „Ziel“, eine von drei Varianten: als neuen Kurs in eine Kategorie; in diesen Kurs mit „löschen und dann
   wiederherstellen“ (nur so kommt ein anderes Kursformat mit); „zusammenführen“ für Delta-Sicherungen, der neue Abschnitt
   landet hinten.
4. Schritt „Einstellungen“: Weiter.
5. Schritt „Schema“: bei Formatwechsel „Kurseinstellungen überschreiben: Ja“, sonst bleibt das alte Kursformat. Weiter.
6. Wiederherstellen.
7. Danach: Glossar mit Einträgen → Glossar → Mehr → Einträge importieren → `<kurs>_glossar.xml` (liegt neben der `.mbz`,
   `build.py` nennt den Namen); Badge → Mehr → Badges → aktivieren; Kursbild prüfen; Probedurchlauf als Schüler/in.

Eine Sicherung darf höchstens 500 MB haben; `check.py` warnt ab 400 MB (Bilder verkleinern, Dateien kürzen, Delta-Sicherungen).

## Harte Regeln

- Bibliotheksversionen, `json_content`, Dateibereiche und das HTML der Kursseite setzt der Generator; nichts davon von
  Hand bauen oder nachbessern (Entwicklerdoku `references/spec.md`, `h5p-vorlagen.md`, `skelette.md`, `formate.md` werden
  im Einsatz nicht gelesen).
- Gestaltung ist Präferenz der Lehrkraft: Steckbrief `design.vorlage` (`schlicht` Standard, `kacheln`, `magazin`), Emojis nur
  auf Wunsch. Lesetexte formatiert (Überschrift, Schritte, Tabelle, Kästen, Merke nach `kursdatei.md` §4), kein Absatz länger
  als fünf Zeilen auf dem Handy; kein HTML im Drehbuch.
- Mischung statt H5P-Kette: Input als Textfeld (kurz, direkt auf der Kursseite), Seite (länger, mit Bildern), Buch oder
  Lesebuch, Videos als Link (`Url`, display embed – die Plattform bettet YouTube/Vimeo ein); Anteil und Rhythmus nach
  `references/intake.md` §3, D2 und D7.
- Moodle-Module, wenn die Lehrkraft Bewertung, Abgaben oder Austausch braucht: `Test` (benotet, Versuche, Fragensammlung; nur
  MC, RF, Kurzantwort) für die Kontrolle mit Note, `Quiz` (H5P) für Zwischenchecks; `Aufgabe` für Abgaben, `Forum` für
  Fragen, `Abstimmung` für Meinungsbilder, `Buch` für längere Lesetexte ohne Fragen, `Datei`/`Verzeichnis` für Material der
  Lehrkraft, `Glossar` für Begriffe. Syntax: `references/kursdatei.md` §3, Beispiel `examples/module/`.
- Didaktik nach `references/intake.md` §3: Standardannahmen D1–D10, Rangfolge Lehrkraft vor Material vor Standard;
  Abweichungen bauen und als `Abweichung: …` im Drehbuch-Kopf vermerken. Inhaltsregeln (Distraktoren, Meta-Text, absolute
  Aussagen, Genderzeichen, Fachprüfung) als Markerliste in `references/qualitaet.md`.
- Delta-Sicherungen: Abschnitt 0 leer, Teile als Top-Level-Abschnitte, keine Badges/Kursbild (spec §O).

## Dateien

- `references/intake.md` – Fragerunden, Darstellungsweg, Standardannahmen D1–D10, Drehbuch-/Kursdatei-Format, Steckbrief.
- `references/qualitaet.md` – Prüfdurchlauf: Markerliste mit Proben, Fachprüfung, `Offen:`-Zeilen.
- `references/kursdatei.md` – vollständige Referenz der Kursdatei (alle Typen, Angaben, Bausteine, Grenzen).
- `scripts/` – Generator (`build.py`, `check.py`, `banner.py`); die übrigen Dateien dort und in `references/` sind
  Entwicklerdoku und Code, im Einsatz nicht zu lesen.
- `examples/netzwerk9/` – minimaler Beispielkurs (eine Einheit, 25 min, aus Folien + Fotos einer Lehrkraft): Vorbild für neue Kurse.
- `examples/alltagskompetenz/` – großer Beispielkurs (Tech-Demo, Unterabschnitte, Lesebuch, Geschichte, Badge, Delta).
- `examples/module/` – ein Abschnitt mit den Moodle-Modulen Buch, Datei, Verzeichnis, Glossar, Forum, Abstimmung, Aufgabe, Test.
  `python3 scripts/build.py --content examples/<kurs>` baut sie.
- `README.md` – Erklärung für Lehrkräfte, Capabilities.

## Grenzen

Kursformate Themen, Kacheln, Wochen, Ein-Themen, Komprimiert, Einzelaktivität (keine Lernlandkarte, kein Mimo); Moodle-Module
nur Test (MC, RF, Kurzantwort), Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar (keine Lektion, Wiki, Datenbank,
Workshop); H5P nur die Typen aus §B.2; geänderte Teile eines Kurses lassen sich per Sicherung nicht aktualisieren (löschen +
Delta). Website-Modus: Übungen ohne Bewertung, Badge-Voraussetzungen bleiben Aktivitäten (Import-Test offen).
Textfeld-Modus: Die Moodle-App führt Textfeld-JS möglicherweise nicht aus (die Übung zeigt dann einen Hinweis); große
Inline-Blöcke blähen die Kursseite (je Block etwa 10 KB Stil und Skript, `check.py` warnt ab 60 KB); die
Nutzungsbedingungen der Plattform erlauben Lehrkräften JavaScript (4.1.3). Probe am 23.10.: JavaScript läuft im
Textfeld (Themenformat); ein im Editor gespeichertes Übungs-Textfeld verliert Skript und Stil (Regel oben).
Delta-Zusammenführen hängt neue Abschnitte hinten an (verifiziert 2026-10-23). Glossareinträge kommen per XML-Import nach der
Wiederherstellung. Per Import verifiziert: Themen- und Kachelformat mit Kachelbildern, Test, Buch, Textfeld-Modus
(Stand 23.10.); die übrigen Kursformate und Module beim ersten Einsatz in einen Testkurs importieren. Sicherungen über
500 MB nimmt die Plattform nicht an.
