# Prüfdurchlauf vor der Drehbuch-Freigabe (Entwurf)

Entwurf aus AP8, Freigabe durch den Autor offen. Der Durchlauf läuft, nachdem das Drehbuch geschrieben ist und bevor
die Lehrkraft es sieht; bei einer Revision nur über die geänderten Blöcke. Er ersetzt nicht die inhaltliche Prüfung vor
der Lieferung (SKILL.md, Schritt 4).

## Ablauf

1. Das Drehbuch Element für Element gegen die Markerliste lesen, nur mit dieser Liste vor Augen. Kann der Assistent
   einen zweiten Lauf ohne den Schreibkontext starten (Subagent, neuer Chat), übernimmt der den Durchlauf.
2. Danach jedes Element gegen D1 bis D10 aus `references/didaktik.md`: fehlt `(← Sn)`, prüft eine Aufgabe zwei Dinge,
   fehlt eine Rückmeldung, fehlt der Zweck im Marker, stimmt der Zeitcheck nicht?
3. Treffer beheben, nicht melden. Die Lehrkraft bekommt keine Prüfliste, nur das bereinigte Drehbuch.
4. Kein Treffer ist, was die Lehrkraft ausdrücklich will (Genderstern, Emojis, Ausrufezeichen) oder was wörtlich aus
   ihrem Material übernommen ist. Abweichungen von D1 bis D10 bekommen die `Hinweis:`-Zeile aus `didaktik.md`.

## Markerliste

| Marker | Treffer | Beheben |
|---|---|---|
| Dreierreihe | drei gleich gebaute Glieder ohne eigene Information („schnell, sicher und einfach“, „verstehen, anwenden, meistern“) | auf das Glied kürzen, das stimmt; echte Aufzählungen bleiben |
| Doppelpunkt-Fanfare | Satzanfang mit Schlagwort und Doppelpunkt als Spannungsbogen („Das Ergebnis: …“, „Die Lösung? Ganz einfach: …“) | als normalen Satz schreiben; Bausteine wie `Merke:` und `Kasten:` sind keine Treffer |
| Rhetorische Frage | Frage, die niemand beantworten soll („Kennst du das?“, „Was wäre, wenn …?“) | als Aussage schreiben; eine Einstiegsfrage nach D10, die der Input auflöst, bleibt |
| Generisches Lob | Rückmeldung ohne Inhalt („Super!“, „Toll gemacht!“, „Genau richtig!“) | den Grund nennen („Stimmt, der Switch verteilt im Netz, der Router verbindet nach außen.“) |
| Austauschbarer Distraktor | falsche Option, die zu jeder Frage passt oder sofort ausscheidet („Keine der Antworten“, Scherzantwort); richtige Option immer vorne oder die längste | aus einer Fehlvorstellung zum Thema bauen, Längen angleichen, Position wechseln |
| Ausrufezeichen | `!` in Kurstext, Aufgaben oder Rückmeldungen | Punkt; Zitate und Fehlermeldungen bleiben |
| Deko-Emoji | Emoji in Text oder Überschrift ohne `design.emoji_marker: true` im Steckbrief | streichen |
| Zweck- oder Quellenzeile im Kurs | Text unter einem Element über das Element („Hier übst du …“, „Ziel: …“, „Quelle: Folie 3“, „Lesebuch mit vier Seiten“) | Zweck und Quelle in den Marker (`[Quelle: … · Zweck: …]`), sonst streichen; die Überblickskarte mit `- Lesen:`/`- Üben:` ist kein Treffer |
| Genderzeichen ohne Vorgabe | `:in`, `*innen`, `_innen`, Binnen-I | Doppelform oder neutral (Lernende, Lehrkraft) |
| Floskel-Überschrift | Überschrift ohne Inhalt („Los geht’s“, „Spannende Fakten“, „Wusstest du schon?“, „Das Wichtigste in Kürze“) | sagen, worum es geht („Router und Switch unterscheiden“) |
| Absolute Aussage | „immer“, „nie“, „alle“, „garantiert“ ohne fachlichen Grund | einschränken oder den Fall nennen, in dem es gilt |
| Werbesprache und Aphorismus | „spannend“, „entdecke“, „die Welt der …“, Sinnsprüche, dramatisierte Einstiege | sachlich sagen, was kommt, oder streichen |

## Weitergabe

Kurse, die als Beispiel weitergegeben werden (`examples/`, Fortbildung, Austausch zwischen Schulen), enthalten nur
eigene Texte und selbst erzeugte oder CC0-Bilder: keine Schulbuchseiten, keine fremden Fotos, keine Logos, keine Namen
echter Personen oder Schulen. Material der Lehrkraft bleibt in ihrem Kurs und wird nicht in ein Beispiel übernommen.
