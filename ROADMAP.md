# Roadmap

Stand 2026-10-23. Version 0.1 ist eine Tech-Demo; die Punkte hier definieren, was **1.0** heißen soll.
Reihenfolge innerhalb der Blöcke ist Priorität. Jeder Punkt braucht in der Regel genau einmal einen
Test-Export von der Plattform (leerer Kurs mit dem Element), danach gilt die Erweiterung für alle.

## Leitlinie

Der Wert des Skills liegt zur Hälfte in der **Gesprächsführung**: Die Fragen des Assistenten leiten die
Lehrkraft durch den Prozess – wenig Fragen, die richtigen, zur richtigen Zeit, mit Vorschlägen statt
leerer Felder. Die andere Hälfte sind **Importdoku und Generator-Skripte**, die den Bau deterministisch
machen und Token sparen: Der Assistent schreibt Inhalte, nicht Archive. Jede Erweiterung wird an beidem
gemessen – macht sie den Dialog einfacher, und hält sie die Tokenkosten unten? Features, die eins davon
verschlechtern, warten.

Drei Kriterien für das Ergebnis: einfach zu erstellen, brauchbar (kein Slop), ansprechend gestaltet
(zurückhaltend, nicht nach Masse). Didaktische Standardannahmen (`references/didaktik.md`, seit 0.9) gelten
mit Rangfolge: ausdrückliche Angabe der Lehrkraft vor eigenem Material vor Standardannahme; Abweichungen
werden gebaut und im Drehbuch mit einer Zeile `Abweichung:` vermerkt, nicht blockiert. **Zweck und Quelle je
Element stehen nur im Drehbuch** (Stichpunkt); im Kurs selbst erscheinen sie nie – eine Zweck- oder
Quellenzeile unter einem Element ist ein Slop-Marker. Slop-Prüfung als eigener Durchlauf gegen eine
konkrete Markerliste (`references/qualitaet.md`, seit 0.9), bevor die Lehrkraft das Drehbuch sieht.

## Umfang und Reihenfolge für 1.0 (Entscheidung 23.10.)

Ziel: in wenigen Tagen nutzbar für andere Lehrkräfte mit beliebigem Code-ausführendem Assistenten.
Vorgestellt wurde 0.1 bereits, Durchlauf mit ChatGPT (inklusive selbst generierter und eingebundener Bilder); die Rückmeldungen waren positiv.

1. **Kursdatei statt Python** – Inhalte als Markdown/YAML, die der Generator direkt liest (Punkt 8).
   Fremde Assistenten schreiben dann kein `content/course.py` mehr; das war die größte Fehlerquelle.
2. **Prüfskript `scripts/check.py`** (seit 0.3) – öffnet die fertige `.mbz` und prüft Struktur, IDs, Dateiverweise,
   H5P-Bibliotheksversionen. `build.py` ruft es nach jedem Bau auf; jeder Assistent prüft so seine Sicherung, bevor importiert wird.
3. **Menüführung, Kursbanner, Bildgenerierung (wenn der Assistent es kann), zwei bis drei Designvorlagen,
   HTML-Textbausteine** (Punkte 1, 4, 5, 6) –
   ein zusammenhängender Block ohne Plattform-Export.
4. **Die meistgenutzten Module und das Kachelformat** – Test, Aufgabe, Datei/Verzeichnis, Forum, Buch;
   Kursformat Kacheln. Braucht je einen Test-Export (Punkte 2, 3). Alles Weitere nach 1.0.
   Module seit 0.6 (AP5), Kursformate seit 0.7 (AP6) gebaut; Import-Tests offen.
5. **Kern-H5P im Textfeld** – Fünf-Minuten-Test auf der Plattform; Ergebnis entscheidet (Punkt 7).
6. **Website-Modus als Vorlage** – eine HTML-Ressource mit Navigation, Inhalten und einem kleinen
   JS-Quiz; eigene Spiele und Simulationen als Beispiele erst nach 1.0 (Punkt 7). Seit 0.8 (AP7) gebaut; Import-Test
   und JS-Probe (`tools/jsprobe`) offen.
7. **Zweiter Fremdtest** mit frischem Agenten nur mit dem Repo, dann Release 1.0.

Geklärt 23.10.: Import mit Platzhalter-`site.json` in einem anderen Account funktioniert – die Werte sind bedeutungslos,
`site.json` ist seit 0.3 entfernt (AP2), die Platzhalter stehen fest in `gen/mbz.py`. Alt: `site.json` – die Lernplattform ist eine Moodle-Instanz, site_hash für alle gleich,
Kategorie beim Import in einen bestehenden Kurs ohne Bedeutung; bestätigt sich das, entfällt die Hürde
in der Anleitung. Moodle-Version (derzeit 5.2.4) als Feld im Steckbrief plus README-Hinweis für
„Version nicht unterstützt“.

## Die Punkte im Einzelnen

### 1. Einstieg ohne Arbeit – Menüführung des Agenten
Erste Frage des Agenten: **„Womit starten wir?“**
- nur ein Thema (KI macht alles, Drehbuch zum Gegenlesen)
- altes Unterrichtsmaterial (Folien, Fotos, Arbeitsblätter) – KI baut daraus
- Material + ein paar Fragen
- Fragen-Intake ohne Material
- bestehenden Kurs erweitern (Delta)

Danach Steuerungsgrad und höchstens eine Fragerunde. Ziel: ein Kurs in unter zehn Minuten Lehrkraft-Zeit
bis zum Drehbuch. Nachfragen nur, wenn eine falsche Annahme teuer wäre.

### 2. Alle Kursformate
Themen (0.1) → **Kacheln** (1.0), danach Wochen, Einzelaktivität, Ein-Themen, Komprimiert – je ein Test-Export für
`course.xml`-Felder und Format-Optionen; Kachelbilder und Kachelfarben aus Kursdatei und Steckbrief. Seit 0.7 (AP6)
gebaut: Kacheln (Kachelbild/-icon je Abschnitt, Grundfarbe aus der Akzentfarbe), Wochen, Ein-Themen, Komprimiert,
Einzelaktivität; Import-Test offen. Kein Grid auf der Plattform; Lernlandkarte und Mimo nach 1.0.

### 3. Alle Modultypen
Reihenfolge nach Nutzen: Test (mit Fragensammlung), Aufgabe, Forum, Buch, Glossar, Abstimmung,
Datei/Verzeichnis, Kern-H5P-Aktivität, Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool.
1.0 enthält Test, Aufgabe, Datei/Verzeichnis, Forum, Buch; der Rest folgt. Seit 0.6 (AP5) gebaut: Test (MC, Wahr/Falsch,
Kurzantwort), Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar; Import-Test des Beispiels `examples/module` offen.
Import-Test 2 (0.6): Glossareinträge kommen nur mit Nutzerdaten an; seit 0.7 `users=1` nur für Glossare plus XML-Datei
zum Einträge-Import als Ausweg. Nach Import-Test 3 (0.7) seit 0.8 users=0
als Standard, XML-Import als fester Schritt, `--mit-nutzerdaten` optional.
Je Modul: Testkurs mit einer Instanz exportieren → Schema in `references/spec.md` → Klasse in `gen/mbz.py`.

### 4. Schlanke Designvorlagen (seit 0.5: schlicht, kacheln, magazin)
Drei bis vier austauschbare Vorlagen (z. B. *schlicht*, *kacheln*, *magazin*, *dunkel*) als Token-Sätze
(Farben, Abstände, Kartenform) in `scripts/gen/html.py`, wählbar im Steckbrief. Standard bleibt schlicht,
Emojis aus. Keine harten Designregeln im Skill – Vorlieben kommen aus dem Intake.

### 5. HTML-Formatierung für Textinhalte (seit 0.5)
Lesetexte in Textfeldern und Seiten kommen formatiert, nicht als Fließtext: Zwischenüberschriften, kurze
Absätze, Listen, Hervorhebungen, Merkkasten, Beispiel-Box, Tabelle für Vergleiche, Bild mit Unterschrift.
Die Bausteine dafür liegen in `scripts/gen/html.py` und werden von der Designvorlage eingefärbt; der Agent
wählt je Textsorte den passenden Baustein (Erklärung, Fall, Anleitung, Merksatz) statt alles in `<p>` zu setzen.
Regel im Intake: kein Absatz länger als fünf Zeilen auf dem Handy.

### 6. Bilder sinnvoll
- **Kursbanner** als erstes Element im Abschnitt 0 (großer optischer Unterschied) plus Kursbild.
- **Bildgenerierung im Arbeitsschritt, wenn der Assistent es kann** (ChatGPT erzeugt Bilder direkt und
  bindet sie ein – im Durchlauf vom 23.10. so gelaufen); kann er es nicht, liefert er Prompts, und die
  Lehrkraft generiert selbst. Der Skill fragt die Fähigkeit ab, statt sie vorauszusetzen.
- Abschnittsbilder/Kachelbilder, Fotos aus dem Material (Heftbilder, Folien) automatisch übernommen.
- Wenige, große Bilder statt Deko.

### 7. One-Page-Darstellung ohne Ladezeiten
Zwei Wege, beide 1.0:
- **Kern-H5P-Filter im Textfeld** (`.h5p` im Textfeld, inline gerendert, keine eigene Aktivität) für
  Übungen zwischen Lesetexten; Bewertung/Abschluss bleiben Aktivitäten.
- **Vorab prüfen:** Die Nutzungsbedingungen erlauben Lehrkräften ausdrücklich Beiträge mit JavaScript (4.1.3).
  Filtert die Plattform JS aus Textfeldern von Lehrkraft-Konten wirklich? Wenn nicht, geht One-Page ohne
  den Umweg über eine HTML-Ressource. Gehört in den Fünf-Minuten-Test (seit 0.8 als Sicherung `tools/jsprobe`;
  Ergebnis offen).
- **Kurs als eigene Website:** eine HTML-Datei (Ressource, eingebettet oder Vollbild) mit eigener
  Navigation, Inhalten, Bildern und **eigenen Spielen/Interaktionen in JavaScript** – Textfelder
  filtern JS, eingebettete Dateien nicht. Damit sind Custom-Spiele, Simulationen, Lernpfade möglich;
  bewertete Teile laufen weiter über Plattform-Aktivitäten. Sky is the limit.
  Seit 0.8 (AP7) gebaut: Website-Modus je Abschnitt aus derselben Kursdatei (`website:`, `build.py --website`),
  Startseite, Kapitelnavigation, Übungen mit Rückmeldung ohne Bewertung; Import-Test offen. Eigene Spiele und
  Simulationen als Vorlagen nach 1.0.

### 8. Drehbuch → Kurs ohne Handarbeit
Parser, der das Drehbuch-Format direkt liest (seit 0.2: `kurs.md`, `gen/kursdatei.py`); „Vorausgesetzt:“-Zeile je Element;
Änderungsliste zwischen Drehbuch-Versionen automatisch.

## 2.0 – Kursmühle im Browser
Der Generator läuft als Webseite im Browser (Pyodide), ohne Server – Kursdatei einfügen,
  Bilder hineinziehen, `.mbz` herunterladen. Dann genügt jeder Chat, der Text schreiben kann (auch Angebote ohne
  Code-Ausführung wie ByLKI oder der AIS-Chat, oder kostenlose Konten); die Gesprächsführung wird zu einem Prompt
  zum Kopieren. Voraussetzung ist das Kursdatei-Format aus AP1. Maßstab für 2.0: Ein einfacher, kostenloser Chatbot
  liefert damit einen verwertbaren Kurs.
  Plan: 2.0 erscheint als geschlossene Fassung (Webseite, Code gebündelt, Repo privat); 1.0 bleibt offen und
  nicht-kommerziell als Spezifikation und Nachweis. Beiträge Dritter zu 1.0 nur unter der Beitragsregel in der README.

## Nach 1.0
- Weitere Module (Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool) und Kursformate (Grid, Wochen, Einzelaktivität).
- Beispiele für eigene Spiele und Simulationen im Website-Modus.
- Rückmeldungen anderer Schulen einarbeiten. Test-Exporte bleiben privat (Nutzungsbedingungen der Plattform: keine Weitergabe von Dateien an Dritte); veröffentlicht werden nur die daraus abgeleiteten Schemata mit Platzhaltern.
- Weitere H5P-Typen (Interactive Video, Image Hotspots, Memory, Game Map).
- Andere Zugriffsbedingungen (Abschluss von X, Bewertung, Gruppe), Kursabschluss-Kriterien.
- Lizenz für 1.0 prüfen (0.1 bleibt PolyForm Noncommercial / CC BY-NC-SA).
