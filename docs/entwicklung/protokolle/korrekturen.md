# Korrekturen im Test (Protokoll, seit 24.10.2026)

Ziel: Korrekturbitten der Mühle sollen seltener werden, bis sie ausbleiben. Jede Zeile ist eine Korrekturbitte (oder ein
Fehler, der keine ausgelöst hat) aus einem echten Durchlauf. Keine Inhalte, keine Namen. Ursache ist eine von drei:
**Parser** (zu streng, Brauchbares abgelehnt), **Text** (der Text für den Chat war unklar oder widersprüchlich),
**Modell** (klare Anweisung, trotzdem daneben). Nur die ersten beiden heilt der Code.

| Datum | Version | Chat | Fach · Jgst | Baustein | Regel | Runde | Ursache | Maßnahme |
|---|---|---|---|---|---|---|---|---|
| 24.10. | 2.0.0-b3 | (offen) | Biologie 7, „Das Ohr“, Einführung, Ich steuere | b4 Quiz | format.frage (Frage begann mit Situationssatz, `Einsetzen:` erst in der nächsten Zeile) | 1 | Text/Parser | Text: „die Zeile beginnt mit `1. Einsetzen:`, die Situation steht in derselben Zeile“; Parser: einleitenden Satz vor `Einsetzen:` annehmen |
| 24.10. | 2.0.0-b3 | (offen) | dito | b4 Quiz | mindest.quiz (2 statt 3 Fragen) | 2 | Text | Teilschritt „mit Eingabe und einem Fall“ legt zwei Aufgaben nahe und widerspricht dem Mindestmaß; Teilschritte dürfen keine Anzahl implizieren |
| 24.10. | 2.0.0-b3 | (offen) | dito | b3-3 (ergänzt) | typ.unbekannt („Sicherung“ als Typ) | 3 | Text | Phasenfolge „Einstieg, Erarbeitung, Übung, Sicherung“ im Text wurde als Typ gelesen; Text: „die Phase steht nie in der Überschrift, der Typ kommt aus der Liste“; Parser könnte Phasennamen als Typ mit Hinweis ablehnen (tut er) |
| 24.10. | 2.0.0-b3 | (offen) | dito | b4 | „Baustein neu beauftragen“: Antwort (`id: b4`) landete in b3-3; Teil 2 des Einheitstexts listete b3-3 danach mit dem Titel von b4 und ohne Teilschritt, der Lückentext b3-3 ging verloren, Teil 2 lieferte ein zweites Quiz | – | Bug Mühle | reproduzieren: Korrekturschleife für b3-3 offen, dann „neu beauftragen“ an b4; Einsetzen muss nach `id:` der Antwort gehen, nicht nach der offenen Schleife; Teil-2-Liste nur Bausteine ohne Inhalt |

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
