# Roadmap

Stand 2026-10-23. Version 0.1 ist eine Tech-Demo; die Punkte hier definieren, was **1.0** heißen soll.
Reihenfolge innerhalb der Blöcke ist Priorität. Jeder Punkt braucht in der Regel genau einmal einen
Test-Export von der Plattform (leerer Kurs mit dem Element), danach gilt die Erweiterung für alle.

## Muss für 1.0

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
Themen (0.1) → **Kacheln**, Grid, Wochen, Einzelaktivität, Buttons/One-Topic – je ein Test-Export für
`course.xml`-Felder und Format-Optionen; Kachelbilder und Kachelfarben aus dem Steckbrief.

### 3. Alle Modultypen
Reihenfolge nach Nutzen: Test (mit Fragensammlung), Aufgabe, Forum, Buch, Glossar, Abstimmung,
Datei/Verzeichnis, Kern-H5P-Aktivität, Lektion, Wiki, Datenbank, Chat, Workshop, externes Tool.
Je Modul: Testkurs mit einer Instanz exportieren → Schema in `references/spec.md` → Klasse in `gen/mbz.py`.

### 4. Schlanke Designvorlagen
Drei bis vier austauschbare Vorlagen (z. B. *schlicht*, *kacheln*, *magazin*, *dunkel*) als Token-Sätze
(Farben, Abstände, Kartenform) in `content/cards.py`, wählbar im Steckbrief. Standard bleibt schlicht,
Emojis aus. Keine harten Designregeln im Skill – Vorlieben kommen aus dem Intake.

### 5. Bilder sinnvoll
- **Kursbanner** als erstes Element im Abschnitt 0 (großer optischer Unterschied) plus Kursbild;
  Bildprompts liefert die KI, Generierung macht die Lehrkraft oder ein Bildmodell im Agenten.
- Abschnittsbilder/Kachelbilder, Fotos aus dem Material (Heftbilder, Folien) automatisch übernommen.
- Wenige, große Bilder statt Deko.

### 6. One-Page-Darstellung ohne Ladezeiten
Zwei Wege, beide 1.0:
- **Kern-H5P-Filter im Textfeld** (`.h5p` im Textfeld, inline gerendert, keine eigene Aktivität) für
  Übungen zwischen Lesetexten; Bewertung/Abschluss bleiben Aktivitäten.
- **Kurs als eigene Website:** eine HTML-Datei (Ressource, eingebettet oder Vollbild) mit eigener
  Navigation, Inhalten, Bildern und **eigenen Spielen/Interaktionen in JavaScript** – Textfelder
  filtern JS, eingebettete Dateien nicht. Damit sind Custom-Spiele, Simulationen, Lernpfade möglich;
  bewertete Teile laufen weiter über Plattform-Aktivitäten. Sky is the limit.

### 7. Drehbuch → Kurs ohne Handarbeit
Parser, der das Drehbuch-Format direkt in `content/` übersetzt; „Vorausgesetzt:“-Zeile je Element;
Änderungsliste zwischen Drehbuch-Versionen automatisch.

## Nach 1.0
- Rückmeldungen anderer Schulen einarbeiten; Sammlung geprüfter Test-Exporte (ohne Teilnehmerdaten).
- Weitere H5P-Typen (Interactive Video, Image Hotspots, Memory, Game Map).
- Andere Zugriffsbedingungen (Abschluss von X, Bewertung, Gruppe), Kursabschluss-Kriterien.
- Lizenzentscheidung.
