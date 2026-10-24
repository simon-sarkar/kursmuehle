# Korrekturen im Test (Protokoll, seit 24.10.2026)

Ziel: Korrekturbitten der Mühle sollen seltener werden, bis sie ausbleiben. Jede Zeile ist eine Korrekturbitte (oder ein
Fehler, der keine ausgelöst hat) aus einem echten Durchlauf. Die Spalte „Regel“ nennt die Kennung aus `gen/api.py`
(REGELN, seit AP13.3); dieselbe Kennung steht an der Karte, im Korrektursatz und im Ereignis `korrekturen` der Kursmappe. Keine Inhalte, keine Namen. Ursache ist eine von drei:
**Parser** (zu streng, Brauchbares abgelehnt), **Text** (der Text für den Chat war unklar oder widersprüchlich),
**Modell** (klare Anweisung, trotzdem daneben). Nur die ersten beiden heilt der Code.

| Datum | Version | Chat | Fach · Jgst | Baustein | Regel | Runde | Ursache | Maßnahme |
|---|---|---|---|---|---|---|---|---|
| 24.10. | 2.0.0-b3 | ByLKI, Gemini 3.8 Flash | Biologie 7, „Das Ohr“, Einführung, Ich steuere | b4 Quiz | format.frage (Frage begann mit Situationssatz, `Einsetzen:` erst in der nächsten Zeile) | 1 | Text/Parser | Text: „die Zeile beginnt mit `1. Einsetzen:`, die Situation steht in derselben Zeile“; Parser: einleitenden Satz vor `Einsetzen:` annehmen. AP13.3: beides gebaut |
| 24.10. | 2.0.0-b3 | dito | dito | b4 Quiz | mindest.quiz (2 statt 3 Fragen) | 2 | Text | Teilschritt „mit Eingabe und einem Fall“ legt zwei Aufgaben nahe und widerspricht dem Mindestmaß; Teilschritte dürfen keine Anzahl implizieren. AP13.3: „Übung zum Anwenden“ ohne Anzahl |
| 24.10. | 2.0.0-b3 | dito | dito | b3-3 (ergänzt) | typ.unbekannt („Sicherung“ als Typ) | 3 | Text | Phasenfolge „Einstieg, Erarbeitung, Übung, Sicherung“ im Text wurde als Typ gelesen; Text: „die Phase steht nie in der Überschrift, der Typ kommt aus der Liste“; Parser könnte Phasennamen als Typ mit Hinweis ablehnen (tut er). AP13.3: Text „Phase nie in die Datei“ |
| 24.10. | 2.0.0-b3 | dito | dito | b4 | „Baustein neu beauftragen“: Antwort (`id: b4`) landete in b3-3; Teil 2 des Einheitstexts listete b3-3 danach mit dem Titel von b4 und ohne Teilschritt, Teil 2 lieferte ein zweites Quiz | neu.auftrag | Bug Mühle (Datei geprüft: 6 Bausteine in der Reihenfolge Einstieg, Lesetext, Lückentext, Zuordnen, Hefteintrag, Quiz; das ergänzte Quiz b3-2 fehlt, das Kraft-Quiz steht hinter dem Hefteintrag) | reproduzieren: Korrekturschleife für b3-3 offen, dann „neu beauftragen“ an b4; Einsetzen muss nach `id:` der Antwort gehen, nicht nach der offenen Schleife; Teil-2-Liste nur Bausteine ohne Inhalt. AP13.3: ein Korrekturweg, Einsetzen nach `id:`, Test stellt den Fall nach |
| 24.10. | 2.0.0-b3 | ByLKI, GPT 5.6 tera | HSU 2, „Das Eichhörnchen“, Einführung, als zweite Einheit angehängt | b6, b7, b7-2, b8, b9, b9-2 | angabe.unbekannt (`phase: …` unter jeder Überschrift) | 1 je Baustein, 6 | Text/Parser | Die Liste nennt „Phase Einstieg“, das Format sagt „Angaben als schlüssel: wert“, das Modell schrieb beides zusammen. Parser: `phase:` annehmen und ignorieren (wie `Angenommen:`); Text: „Phase nicht in die Datei“. AP13.3: beides gebaut |
| 24.10. | 2.0.0-b3 | dito | dito | b6 | website.element (`website: textfeld` am Textfeld statt am Abschnitt) | 2 | Text/Parser | Die vorgegebene Zeile `Angenommen:` nennt die Angabe mit Schlüssel; Parser: am Element dulden, wenn gleich dem Abschnitt. AP13.3: gebaut |
| 24.10. | 2.0.0-b3 | dito | dito | b8 Zuordnen | zone.unbekannt (Element enthielt selbst „→“: „16 cm → 4 cm → Zone“) | 1 | Text | „kein → im Element“ in die Formatzeile; Parser: letztes „→“ trennt die Zone. AP13.3: beides gebaut |
| 24.10. | 2.0.0-b3 | dito | dito | b10 Seite | hinweis.leer (Inhalt nach `Hinweis:` nicht eingerückt; seit AP13.3 hinweis.einrueckung, gelb) | 1 | Modell | Parser könnte die folgende Zeile als Inhalt nehmen, wenn sie nicht selbst ein Baustein ist. AP13.3: Zeilen bis zur Leerzeile als Inhalt, gelber Hinweis |
| 24.10. | 2.0.0-b3 | dito | dito | Stückelung | Teil 1 von 2 wurde zu Teil 2 von 3 und Teil 3 von 3; Teil 2 listete die zwei noch leeren Bausteine der ERSTEN Einheit (Ohr) und die vier schon geschriebenen der zweiten; das Modell schrieb sie alle neu, jeder Teil für sich mit 45 Minuten (Hefteintrag 28 min, Lückentext 8 min) | – (keine Prüfregel) | Bug Mühle + Text | Teil-Liste aus der ursprünglichen Kartenliste der laufenden Einheit, nie aus der Mappe; fremde Einheiten nie in den Text; Teilzahl beim Kopieren einfrieren; Text: „die Minuten aller Teile zusammen ergeben 45“, je Teil den Anteil nennen. AP13.3: gebaut, rote Karten erst nach dem letzten Teil |
| 24.10. | 2.0.0-b4 | fobizz KI, GPT-6.1 Sol | Erdkunde (Jahrgangsstufe nicht angegeben), „Wetter und Klima“, Einführung, Mach du | b3 Zuordnen | zuordnen.liste („nur eine Liste - Element → Zone“: das Modell hängte nach der Liste einen `Hinweis:`-Block mit Rückmeldung je Zone an) | 1 (beide Sätze in einem Prompt, ein Einsetzen) | Parser | Einen `Hinweis:`-Block nach der Liste als Rückmeldung dulden oder still verwerfen; der Text sagt nicht, dass Zuordnen nur die Liste erlaubt |
| 24.10. | 2.0.0-b4 | dito | dito | b5 Seite | beispiel.einrueckung („Beispiel ohne Inhalt“: `Beispiel: <ein Satz>` in einer Zeile statt Titel plus eingerückter Inhalt) | 1 | Parser | Einzeiliges `Beispiel: Text` als Beispiel ohne Titel annehmen (wie bei `Merke:`) |
| 24.10. | 2.0.0-b4 | (Chat offen) | „Hefeteig vorbereiten“, Einführung, Mach du, ohne Jahrgangsstufe | ganze Antwort | format.sonst („Überschrift der Ebene 3 erwartet“): das Modell schrieb alle Bausteine mit vier Rauten direkt unter `##`; die Mühle zeigte nur „Im Text stehen keine Bausteine“ | – (Antwort ganz abgelehnt) | Parser/Oberfläche | Parser: `####` direkt unter `##` als Element annehmen (Ebene egal, solange `Typ:` folgt); Oberfläche: bei „keine Bausteine“ die erste Diagnose des Parsers anzeigen statt des Pauschalsatzes. Nebenbefund: Teilschritte wurden als Inhalt nachgesprochen („Wir schauen Hefeteig in vier Schritten an: Begriffe, Anwendung, Merke, Ablauf“, „Beantworte die folgenden Fragen als Quiz direkt nach diesem Text“) → Text: „Teilschritte sind Bauplan, nie Text im Kurs“ |

## Befunde ohne Korrekturbitte (Inhalt), 24.10., „Das Ohr“

- **Vorlage primt das Fach.** Die Teilschritte der Vorlage Einführung sind aus der Mathematik („Regel oder Satz
  herleiten, zwei durchgerechnete Beispiele“, „ein Ergebnis geht nicht auf und wird gerundet“). Für ein Biologiethema
  erfand das Modell daraus eine „Hebelregel der Gehörknöchelchen“ mit Kräften in Millinewton, Rechenbeispielen und
  Rechenaufgaben, und der Hefteintrag übernahm sie. Die Kräfte sind ausgedacht, das Hebelverhältnis im Ohr ist etwa
  1,3 und in Jahrgangsstufe 7 Biologie kein Rechenstoff. Das ist genau das thematische Priming, das die Beispielkurse
  ausgeschlossen hat, nur über die Vorlage. Maßnahme: Teilschritte fachneutral („Kernaussage“ statt „Regel“;
  Rechenbeispiele und Rundung nur, wenn das Thema ein Verfahren hat; sonst Beispiele als Fälle), oder je Fach ein Satz
  Teilschritte (Mathe, Naturwissenschaft, Sprache, Gesellschaft).
- Einstieg mit 1 von 45 Minuten: formal erlaubt, inhaltlich ein Satz plus Bild. Richtwert im Text nennen (Einstieg
  3 bis 5 Minuten).
- Teilschritt des Einstiegs verlangt „das Ziel der Stunde in einem Satz“, die Prüfliste verbietet Zweckzeilen („Ziel:
  …“); das Modell schrieb „In dieser Stunde untersuchst du …“. Widerspruch im Text auflösen (Ziel als Frage, nicht als
  Zweckzeile).
- Zusätzliche `Angenommen:`-Zeilen vom Modell (Schriftgröße, Farbschema): harmlos, Parser ignoriert sie; Text könnte
  „keine weiteren Zeilen“ sagen.
- Teil 2 des Einheitstexts wiederholt Format und Regeln vollständig (12 KB); im selben Chat reicht ein Verweis.
- Auftrag „2-3 Bilder“ gegen Regel „höchstens ein Bild je Lesebaustein“: das Modell nahm eine Collage; Auftrag sollte
  die Regel schlagen oder die Seite den Konflikt zeigen.
- Das Modell benutzte in einem Fall den Vornamen des Autors als erfundene Person; ob Zufall oder Profilwissen des
  Chats, ist offen. Text: „keine Namen aus dem Gespräch oder Profil“.

## Befunde ohne Korrekturbitte (Inhalt), 24.10., „Das Eichhörnchen“ (Jahrgangsstufe 2)

- Dieselbe Prägung durch die Vorlage: aus „Regel anwenden, Ergebnis geht nicht auf, runden“ wurde für Siebenjährige
  ein Maßstab 4 : 1 mit Messen und Teilen; das gehört nicht in eine Einführung zum Eichhörnchen in Jahrgangsstufe 2.
- Das Modell hielt das Format sonst gut ein (Rückmeldungen mit Grund, Du-Form, keine Floskeln); bei sauberem Parser
  wären von neun Korrekturbitten zwei geblieben.

## Befunde ohne Korrekturbitte, 24.10., „Wetter und Klima“ (b4, fobizz, GPT-6.1 Sol, Zweig „Mach du“)

- Erste Einheit auf b4: zwei Korrekturbitten in einem Prompt, eine Antwort, beide Bausteine eingesetzt; der eine
  Korrekturweg funktioniert. Inhalt gut (Fälle mit erfundenen Namen, Rückmeldungen mit Grund, keine Rechnung).
- **Keine Bilder, ohne dass die Lehrkraft gefragt wurde.** Die Regel „ein Bild nur, wenn der Inhalt eine Grafik
  braucht“ ließ das Modell gar keines planen; der Schritt „Bilder“ erschien deshalb nicht. Der Autor will eine Abfrage
  „mit Bildern / ohne Bilder“ in der Mühle, und bei „mit“ den Hinweis, dass die Bilder im Schritt Bilder hochgeladen
  werden oder Platzhalter bleiben.
- Jahrgangsstufe war leer; der Text sagte trotzdem „Richtwerte für diese Jahrgangsstufe“. Die Mühle sollte die
  Jahrgangsstufe verlangen oder dem Text „Jahrgangsstufe nicht angegeben, Sprache für Jahrgangsstufe 7“ mitgeben.
