# Prompttest AP11: Text für den Chat an ein Modell der Sonnet-Klasse

Frage: Liefert ein günstiges Modell auf den Text für den Chat aus `gen/prompt.py` eine Antwort, die die Seite ohne
Handarbeit übernimmt? Durchgeführt am 24.10.2026 in Claude Code mit Subagenten (Modellwahl „sonnet“) als Ersatz für
einen Chat im Browser. Kein Fremdtest mit Lehrkräften und kein echter Chat (ByLKI, fobizz, AIS-Chat); das bleibt offen.
Lauf 1 bis 3 liefen mit dem Text aus AP11, Lauf 4 mit dem Text aus AP12a (Abschnitt „Änderungen nach Lauf 2“).

## Aufbau

- Text erzeugt über die Oberfläche (`web/index.html`, Chromium): Thema „Satz des Pythagoras“, Jahrgangsstufe 9,
  45 Minuten, Vorlage Einführung (neun Bausteine b1 bis b9), unter „Mehr einstellen“ Fach Mathematik und Schulart
  Mittelschule, Chat „Claude“ (ein Teil, Codeblock, keine Bild-Prompts). Kopiert wurde der Text aus dem Feld „Text
  ansehen“; Wortlaut in `ap11-prompttest/text-diese-einheit.txt` (7 961 Bytes).
- Je Lauf ein frischer Subagent ohne Werkzeuge mit der Rolle „gewöhnlicher Chat“ und dem Text unverändert als Nachricht.
  Seine Antwort wurde unverändert (mit Codeblock-Zeichen) in „Antwort des Chats“ eingefügt, der Modus blieb beim
  Vorschlag der Seite. Antworten in `ap11-prompttest/antwort-*.txt`.
- Lauf 3 („nur Baustein“): Stand nach Lauf 2, Karte b7 (rot) mit „Diesen Baustein neu beauftragen“ markiert, Text
  „Nur dieser Baustein“ aus der Oberfläche (`text-nur-baustein-b7.txt`, 2 807 Bytes, mit bisherigem Inhalt und der
  Meldung der Prüfung), Antwort eingefügt.
- Lauf 4 („Diese Einheit“, AP12a): dieselben Angaben, Vorlage Einführung in der neuen Fassung (elf Bausteine b1 bis
  b11, Erarbeitung 1 bis 3), Text aus der Seite (`text-diese-einheit-lauf4.txt`, 9 884 Bytes). Wie in Lauf 1 bis 3 ein
  Subagent der Sonnet-Klasse in Claude Code als Ersatz für einen Chat; Antwort in `antwort-lauf4.txt`.

## Messung

| | Lauf 1 (Einheit) | Lauf 2 (Einheit) | Lauf 3 (nur b7) | Lauf 4 (Einheit, Text AP12a) |
|---|---|---|---|---|
| Text für den Chat | 7 961 Bytes | 7 961 Bytes | 2 807 Bytes | 9 884 Bytes |
| Antwort | 9 114 Bytes, ein Codeblock | 9 311 Bytes, ein Codeblock | 1 201 Bytes, ein Codeblock | 12 714 Bytes, ein Codeblock |
| Dauer des Modells | 180 s | 176 s | 13 s | 307 s |
| Tokens (Subagent, laut Werkzeug, mit seiner eigenen Systemanweisung) | 82 467 | 82 420 | 54 477 | 103 074 |
| Modus vorgeschlagen | Einheit ersetzen | Einheit ersetzen | Nur Baustein | Einheit ersetzen |
| Bausteine erkannt, `id:` zugeordnet | 9 von 9 | 9 von 9 | 1 von 1 (b7) | 11 von 11 |
| Grün / gelb / rot | 8 / 1 / 0 | 7 / 0 / 2 (b4 zusätzlich gelb) | b7 grün; b4 bleibt rot | 8 / 3 / 0 |
| Gelb | b4: Bild `pythagoras-quadrate.png` fehlt (Platzhalter) | b4: Bild `dreieck-beschriftet.png` fehlt | – | b1, b4, b6: Bild fehlt (`leiter-an-wand.png`, `dreieck-a-b-c.png`, `quadrate-3-4-5.png`) |
| Rot | – | b4 und b7: `Hinweis: Text` in einer Zeile statt eingerückt | – | – |
| Minuten gerechnet / Soll, Rechnung AP11 | 22 / 45 | 27 / 45 | 32 / 45 | 25 / 45 (nachgerechnet) |
| Minuten gerechnet / Soll, Rechnung AP12a | 41 / 45 | 53 / 45 | 59 / 45 | 42 / 45 |
| Folge | Lesen → Üben → Sichern | Lesen → Üben → Sichern | unverändert | Lesen → Üben → Sichern |
| Fragen (Zahl am Rand), davon MC | 9, 2 (22 %) | 9, 2 (22 %) | unverändert | 5, 2 (40 %) |
| Auswahlfragen mit Rückmeldung | 5 von 5 | 4 von 5 (die fehlende im Abschlussquiz, dort frei) | unverändert | 2 von 2 |

„Anteil grüner Bausteine“ ohne die Bildwarnung, die ohne Bild-Upload immer kommt: Lauf 1 9 von 9, Lauf 2 7 von 9,
nach Lauf 3 8 von 9 (b4 wäre ein weiterer Lauf „nur Baustein“ oder die Korrekturbitte, die die Seite für b4 anbietet),
Lauf 4 11 von 11. Die Prüfzeit der Seite nach dem Einfügen lag in Lauf 1 bis 3 unter 2,5 s (Chromium headless, mit
1,5 s Wartezeit des Testskripts); für Lauf 4 ist sie nicht gemessen.

Herkunft der Werte zu Lauf 4: Textgröße, Dauer, Tokens und „Prüfung ohne Fehler“ aus `AP12a.md` („Gebaut“, Punkt 4);
Status je Baustein, Modus und Kennzahlen nachgerechnet mit `gen.mappe` (`antwort`, `modus`, `kennzahlen`) auf der
Mappe der neuen Vorlage, nicht von der Seite abgelesen. „Rechnung AP11“ für Lauf 4 mit dem Stand vor AP12a
(`scripts/gen`, `references/katalog.yaml` aus dem Commit vor `4401dab`); derselbe Stand ergibt für Lauf 1 17 statt
22 Minuten, weil die Abschreib-Regel (unten, Punkt 4) erst nach Lauf 1 geändert wurde. Die Spalte „Rechnung AP12a“
erklärt der Abschnitt „Minuten nach der Rechnung aus AP12a“; Lauf 3 dort als Lauf 2 mit dem neuen b7 (18 statt 12 min).

## Leitplanken und Fachliches (von Hand gelesen)

| Vorgabe | Lauf 1 | Lauf 2 | Lauf 4 |
|---|---|---|---|
| Einstieg mit Fall, im Lesebaustein aufgelöst | Leiter und Fensterbank, in b4 nachgerechnet | Regalrahmen mit 102 cm Diagonale, in b4 geprüft | Leiter an der Wand (Haken 2,40 m, Fuß 1,00 m von der Wand, Leiter 2,50 m); b6 kündigt die Lösung an, gerechnet wird sie in b11 („Der Fall vom Anfang“, Quiz): 2,60 m, die Leiter ist zu kurz |
| MC höchstens die Hälfte | 2 von 9 | 2 von 9 | 2 von 5 |
| Mehrheit der Fragen mit Situation | ja (Mast, Rampe, Leiter, Beet, Wanderin, Monitor) | ja (Bilderrahmen, Lara, Leiter, Jan, Rampe, Tischler) | ja, 4 von 5 (Leiter, Rampe, Tischplatte, Leiter); ohne Situation b8 Frage 1 |
| Rundungsaufgabe | √8 ≈ 2,8; √3728 ≈ 61,1; √5,25 ≈ 2,3 | √13,75 ≈ 3,7 | √9,64 ≈ 3,1 (b8) |
| Bild nur bei Fachgrafik, mit Alt-Text | 1 Bild, Alt-Text, `Bildwunsch:` im Kopf | 1 Bild, Alt-Text, `Bildwunsch:` im Kopf | 3 Bilder (b1, b4, b6), 3 Alt-Texte, 3 `Bildwunsch:`; b5 (Zuordnen) ohne Bild, mit `Angenommen:` begründet |
| Neuer Fall in der Sicherung | Leiter mit 1,00 m Abstand | Rahmen nach dem Nachmessen, Rückwand 45 und 60 cm | Tischplatte 120 × 90 cm (b10); Hefteintrag mit 8, 15 und 17 cm |
| Rechnungen nachgerechnet | alle richtig | alle richtig | alle richtig (b6 vier Rechnungen, b7 zehn Zuordnungen, b8 drei Aufgaben samt Ablenkern 8 m, 2 m, 5,8 m, b9, b10, b11) |
| Vorgriff: Aufgabe nutzt, was erst später kommt | nicht geprüft | ja, eine Übung (Urteil des Autors, unten) | keiner gefunden: b1 und b2 fragen nach Vermutung und Schätzung, b4 ohne Regel, b5 nur Begriffe aus b4, gerechnet wird ab b7 |
| Teilschritte Erarbeitung 1 bis 3 | – (Vorgabe neu) | – | eingehalten: b4 Begriffe an der Skizze ohne Regel, b5 benennen, b6 Herleitung, `Merke:`, zwei Beispiele |
| Zwei durchgerechnete Beispiele je Verfahren | – (Vorgabe neu) | – | je eines für Hypotenuse (7 und 24 cm) und Kathete (20 und 16 cm) mit allen Zwischenschritten, dazu zwei Zahlenbeispiele zur Herleitung (3, 4, 5 und 5, 12, 13); „zwei je Verfahren“ nur, wenn beide Rechnungen als ein Verfahren zählen |
| Wortziel (Wörter ohne Bildzeilen) | – (Vorgabe neu) | – | b1 236 (Ziel 300), b2 159 (180), b4 227 (300), b6 267 (300), b9 40 (30); Zuordnen 8 und 10 Elemente, Quiz 3, 1 und 1 Aufgaben wie vorgegeben |
| `Angenommen:` und `Offen:` im Kopf | fünf vorgegebene, drei eigene, ein `Offen:` | fünf vorgegebene, drei eigene, drei `Offen:` | fünf vorgegebene, drei eigene, zwei `Offen:` (Beweis fehlt, Anstellwinkel nicht bewertet) |

Lauf 4 im Einzelnen: Die Hinführung (b2, Weg 3 und 4 Kästchen auf Karopapier) wird nicht ausdrücklich aufgelöst; b6
rechnet das Dreieck 3, 4, 5, ohne auf Elifs Linie zurückzukommen. `Kasten:`, `Beispiel:` und `Hinweis:` stehen alle mit
eingerücktem Inhalt. Wörter gezählt mit der Wortregel der Rechnung (`mappe._RE_WORT` nach Abzug der Zeilenanfänge);
mit den Alt-Texten hat b1 296 Wörter.

Auffällig, aber kein Fehler der Seite: Lauf 1 und 2 schreiben die Soll-Minuten aus der Liste in die Überschriften, der
Inhalt ergibt gerechnet nur 22 und 27 Minuten. Entweder sind die Lesetexte für 45 Minuten zu kurz, oder die Rechnung
unterschätzt Lesen mit Rechnen (Erarbeitung b4: 15 min Angabe, 2 bis 3 min gerechnet). Die Karten zeigen die
Abweichung als Hinweis; welche Seite nachgibt, ist eine offene Entscheidung (`AP11.md`). AP12a hat beide Seiten
geändert (unten).

Urteil des Autors zu Lauf 2 (Mittelschule, Jahrgangsstufe 9; sinngemäß aus `AP12a.md` §4): Der Einstieg ist ohne
Skizze kaum tragfähig. Eine Übung setzt den Satz voraus, der erst eingeführt werden soll. Die Erarbeitung ist ein
Lesetext für drei Minuten statt einer Einführung für fünfzehn. Welche Übung gemeint ist, nennt das Urteil nicht.

## Was am Text geändert werden musste

1. Vor den Läufen (beim Lesen des erzeugten Texts): Die Fragen-Zeile bot `Kurzantwort` für jedes Quiz an, der Parser
   erlaubt sie nur im Test. Jetzt eigene Zeile `fragen_test`, nur wenn ein Test in der Einheit ist.
2. Nach Lauf 2: Die Zeile „`Kasten: Titel` mit zwei Leerzeichen eingerückten Zeilen (ebenso `Beispiel:` und
   `Hinweis:`)“ ließ `Hinweis: ganzer Satz` zu. Jetzt: „`Kasten: Titel`, `Beispiel: Titel` und `Hinweis: Titel` stehen
   allein in der Zeile, ihr Inhalt folgt darunter um zwei Leerzeichen eingerückt (nie Text direkt nach dem Titel)“.
   Lauf 3 bekam diese Fassung und schrieb den Hinweis richtig.
3. Text „Nur dieser Baustein“ nennt bei einer roten Karte die Meldung der Prüfung („Die Prüfung meldet in Zeile 15:
   …“); vorher stand nur der alte Inhalt darin.
4. Nicht am Text, aber aus dem Lauf: Die Abschreib-Regel der Ist-Minuten griff bei jedem „ins Heft“ (Lauf 1, b2:
   „Schreibe sie ins Heft“ ergab 6 statt 1 min); jetzt nur bei „Hefteintrag“ im Titel oder „Übernimm/Übertrage … ins
   Heft“. Die Statuszeile nach „nur Baustein“ zählte rote Karten der ganzen Einheit; jetzt nur die eingesetzten.

Ein zweiter Durchlauf von „Diese Einheit“ mit der geänderten Kasten-Zeile ist Lauf 4 (mit den weiteren Änderungen aus
AP12a); dort steht der Inhalt unter `Kasten:`, `Beispiel:` und `Hinweis:` überall eingerückt.

## Änderungen nach Lauf 2 (AP12a)

Text für den Chat (`gen/prompt.py`, Vorlagen und Sätze in `references/katalog.yaml`):

- Wortziel je Baustein aus Soll und Rolle der Phase, mit denselben Werten wie die Rechnung („Lesetext für 5 Minuten,
  etwa 300 Wörter“; Quiz in Aufgaben, Zuordnen in Elementen, Zielangabe „ein bis drei Sätze“).
- Erarbeitung in Teilschritten; in der Vorlage Einführung getrennte Bausteine Erarbeitung 1 (Begriffe einführen, noch
  keine Regel), 2 (Begriffe an Beispielen benennen) und 3 (Regel herleiten, `Merke:`, zwei durchgerechnete Beispiele).
  Teilschritte auch für Übung, Hefteintrag und den Fall vom Anfang. Die Vorlage hat damit elf statt neun Bausteine.
- Vorgriff-Regel: Keine Aufgabe verwendet etwas, das erst später in der Einheit eingeführt wird; der Einstieg fragt
  nach Vermutungen.
- Skizze Pflicht in Einstieg und jedem Erarbeitungsbaustein, wenn das Fach (`skizze_faecher`, etwa Mathematik, Physik)
  oder ein Stichwort im Thema (`skizze_stichworte`, etwa Pythagoras, Bruch) sie verlangt; zu jedem Verfahren zwei
  durchgerechnete Beispiele mit allen Zwischenschritten.

Rechnung (`zeitbedarf` in `references/katalog.yaml`, `mappe.zeitbedarf` und `mappe.kennzahlen`):

| Wert | Anker des Autors (Jahrgangsstufe 9 Mittelschule) |
|---|---|
| Rolle | aus der Phase der Vorlage vor der Rolle des Typs (Einstieg und Hinführung `einstieg`, Erarbeitung `lesen`, Übung `üben`, Sicherung und Vertiefung `sichern`, Zielangabe `rahmen`) |
| Wörter je Minute | Erarbeitung (`lesen`) 60, Einstieg und Hinführung 120, Übung und Sicherung 60, Rahmen 120 |
| Hefteintrag | 10 Wörter je Minute (Titel „Hefteintrag“ oder „Übernimm/Übertrage … ins Heft“) |
| Aufgabe | 1,5 Minuten, mit Rechenausdruck, Wurzel, Rechenverb oder zwei Größen mit Einheit 3 Minuten; ihre Wörter zählen nicht noch einmal. Ein `Kasten:` mit Fragezeichen zählt als eine einfache Aufgabe |
| Zuordnen | eine Aufgabe (1,5 oder 3 Minuten) und 20 s je Element, abzüglich 90 s |
| Jahrgangsstufe | Faktor auf die Wörter je Minute: ab 1 0,45, ab 3 0,6, ab 5 0,75, ab 7 0,9, ab 9 1,0, ab 11 1,15; gesetzt, nicht gemessen |
| Hinweis an der Karte | bei mehr als 20 % und mindestens einer Minute Abweichung vom Soll, mit der Lücke („Erarbeitung für 5 Minuten statt 15“) |

Schulart und Fach gehen in die Rechnung nicht ein; die Anker gelten für jede Schulart mit Jahrgangsstufe 9.

## Minuten nach der Rechnung aus AP12a

Gerechnet mit `gen.mappe.kennzahlen` (Jahrgangsstufe 9 aus `einheit`; Fach Mathematik und Schulart Mittelschule
ändern nichts, siehe oben). Mappe je Lauf wie `vorlageKarten` in `web/app.js` aus der Vorlage Einführung gebaut, Antwort
mit `mappe.antwort` geprüft und mit `mappe.abgleich` über `id:` zugeordnet. Lauf 1 und 2 mit der alten Vorlage (neun
Bausteine), Lauf 4 mit der neuen (elf); dazu passen jeweils die `id:` der Antwort und die Bausteinliste im Text für den
Chat. Annahme für Lauf 1 und 2: die alte Vorlage aus `references/katalog.yaml` im Commit vor `4401dab`; ihre Soll-Werte
(4, 3, 1, 15, 7, 7, 3, 3, 2) stimmen mit `text-diese-einheit.txt` überein, die Rollen kommen aus dem heutigen Katalog
(Phasennamen und Rollen sind gleich geblieben). In Klammern der ungerundete Wert.

Lauf 1 und 2 (Angabe in der Überschrift = Soll in beiden Läufen):

| Baustein | Phase / Rolle | Soll | Lauf 1 gerechnet | Lauf 2 gerechnet |
|---|---|---|---|---|
| b1 Textfeld | Einstieg / einstieg | 4 | 2 (2,0) | 2 (2,2) |
| b2 Textfeld | Hinführung / einstieg | 3 | 1 (1,0) | 2 (1,9) |
| b3 Textfeld | Zielangabe / rahmen | 1 | 1 (1,0) | 1 (1,0) |
| b4 Seite | Erarbeitung / lesen | 15 | 5 (5,4) | 5 (5,0) |
| b5 Zuordnen | Übung / üben | 7 | 3 (3,2) | 4 (3,8) |
| b6 Quiz | Übung / üben | 7 | 12 (12,0) | 12 (12,0) |
| b7 Seite (Hefteintrag) | Sicherung / sichern | 3 | 2 (1,6) | 12 (11,5) |
| b8 Quiz | Sicherung / sichern | 3 | 9 (9,0) | 9 (9,0) |
| b9 Quiz | Vertiefung / sichern | 2 | 6 (6,0) | 6 (6,0) |
| Summe | | 45 | 41 | 53 |

Hinweise an den Karten: in beiden Läufen an acht von neun (alle außer der Zielangabe), darunter „Erarbeitung für
5 Minuten statt 15“, „Übung für 12 Minuten statt 7“ (b6, vier Rechenaufgaben) und „Sicherung für 9 Minuten statt 3“
(b8, drei Rechenaufgaben); am Hefteintrag b7 in Lauf 1 „Sicherung für 2 Minuten statt 3“, in Lauf 2 „Sicherung für
12 Minuten statt 3“ (115 Wörter im Abschreibtempo). Die vorläufigen Werte aus `AP12a.md` („Offen“, 41 und 53) stimmen.

Lauf 4:

| Baustein | Phase / Rolle | Angabe im Inhalt | gerechnet | Soll |
|---|---|---|---|---|
| b1 Textfeld | Einstieg / einstieg | 4 | 4 (3,7) | 4 |
| b2 Textfeld | Hinführung / einstieg | 3 | 1 (1,3) | 3 |
| b3 Textfeld | Zielangabe / rahmen | 1 | 1 (1,0) | 1 |
| b4 Seite | Erarbeitung / lesen | 5 | 4 (4,0) | 5 |
| b5 Zuordnen | Erarbeitung / lesen | 5 | 3 (2,7) | 5 |
| b6 Seite | Erarbeitung / lesen | 5 | 5 (4,5) | 5 |
| b7 Zuordnen | Übung / üben | 7 | 5 (4,8) | 7 |
| b8 Quiz | Übung / üben | 7 | 9 (9,0) | 7 |
| b9 Seite (Hefteintrag) | Sicherung / sichern | 3 | 4 (4,0) | 3 |
| b10 Quiz | Sicherung / sichern | 3 | 3 (3,0) | 3 |
| b11 Quiz | Vertiefung / sichern | 2 | 3 (3,0) | 2 |
| Summe | | 45 | 42 | 45 |

Hinweise an den Karten: vier von elf („Hinführung für 1 Minute statt 3“, „Erarbeitung für 3 Minuten statt 5“ an b5,
„Übung für 5 Minuten statt 7“, „Übung für 9 Minuten statt 7“). Die Erarbeitung kommt auf 12 von 15 Minuten.

Was die Abweichungen in Lauf 4 erklärt, an Code und Antwort nachvollzogen:

- b2: Der Kasten lautet „Schätze die Länge … auf.“ ohne Fragezeichen und zählt deshalb nicht als Denkaufgabe (1,5 min);
  ebenso Lauf 1, b2 („Benenne … ins Heft.“).
- b5 und b7: Das Modell hält das Wortziel genau ein (8 und 10 Elemente). `prompt.wortziel` setzt für Zuordnen
  Soll in Sekunden / 20 s / 2 Elemente an (5 Minuten 8, 7 Minuten 10), die Rechnung ergibt für 8 Elemente 2,7 und für
  10 Elemente mit Größen und Einheiten 4,8 Minuten; Wortziel und Rechnung passen bei Zuordnen nicht zueinander.
- b8: Das Wortziel nimmt im Mittel 2,25 Minuten je Aufgabe (3 Aufgaben für 7 Minuten); der Teilschritt verlangt
  Rechnen, alle drei Aufgaben zählen 3 Minuten.

## Ergebnis

Ein Modell der Sonnet-Klasse liefert auf den Text für den Chat in einem Schritt eine Antwort, die die Seite vollständig
den Karten zuordnet (alle `id:`), mit Codeblock und ohne Vorrede. Ein Lauf war ohne Fehler, einer hatte zwei Fehler an
derselben missverständlichen Formatzeile; „nur Baustein“ hat einen davon in 13 s behoben. Ob die dienstlichen Chats
(ByLKI, fobizz, AIS-Chat, MUCGPT) dasselbe liefern, ist nicht geprüft.

Lauf 4 mit dem Text aus AP12a: Die Antwort ist ohne Fehler und allen elf Karten zugeordnet. Die Erarbeitung besteht aus
drei Bausteinen und kommt gerechnet auf 12 von 15 Minuten statt 5 von 15 in Lauf 1 und 2; die ganze Einheit auf 42
von 45 Minuten mit vier statt acht Zeithinweisen. Einstieg und beide Erarbeitungs-Seiten haben eine beschriftete
Skizze mit `Bildwunsch:`, ein Vorgriff war beim Lesen nicht zu finden, alle Rechnungen stimmen. Der Text ist
1 923 Bytes länger, die Antwort brauchte 307 statt etwa 180 s und rund 20 600 Tokens mehr.

Offen nach Lauf 4: Mit dem Wortziel „1 Aufgabe für 3 Minuten“ hat das Abschlussquiz eine einzige Frage, die Einheit
5 statt 9 Fragen (MC-Anteil 40 %); ob ein Abschlussquiz eine Mindestzahl braucht, ist nicht entschieden. Das Wortziel
für Zuordnen und die Zählung eines Kastens ohne Fragezeichen passen nicht zur Rechnung (oben). Die Vorgabe „zwei
Beispiele je Verfahren“ ist nur knapp erfüllt. Ein Urteil des Autors zu Lauf 4 liegt nicht vor, und es ist ein
einzelner Lauf.
