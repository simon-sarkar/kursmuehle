# Prüfdurchlauf

Ein Durchlauf, nachdem das Drehbuch geschrieben ist und bevor die Lehrkraft es sieht; bei Steuerungsgrad c (KI macht
alles) vor dem Bau. Bei einer Revision nur über die geänderten Blöcke.

## Ablauf

1. Das Drehbuch Element für Element gegen die Markerliste lesen. Gibt eine Zeile eine Probe an, entscheidet die Probe.
2. Danach jedes Element gegen D1–D10 (`references/intake.md` §3) und fachlich: die Lösung jeder Frage im Bezugselement
   (`(← …)`) nachschlagen. Widerspricht sie ihm oder ist sie fachlich zweifelhaft, bleibt sie stehen und bekommt eine
   Zeile `Offen: <Frage an die Lehrkraft>` im Drehbuch-Kopf; nicht still ändern.
3. Treffer beheben, nicht melden; die Lehrkraft bekommt keine Prüfliste, nur das bereinigte Drehbuch. Ausnahmen: der
   Zeitcheck-Vorschlag (D8) bleibt in der `Zeit`-Zeile, Fachzweifel stehen als `Offen:`.
4. Kein Treffer ist, was im Steckbrief unter `vorgaben:` steht (Genderstern, Emojis, Ausrufezeichen, Sie-Form). Wörtlich
   übernommenes Material ist für die Sprachmarker kein Treffer, für die Fachprüfung in Schritt 2 schon. Abweichungen von
   D1–D10 bekommen die `Abweichung:`-Zeile aus `intake.md` §3.

## Markerliste

| Marker | Treffer, wenn … | Beheben |
|---|---|---|
| Dreierreihe | drei gleich gebaute Glieder. Probe: ein Glied streichen; fehlt danach eine Tatsache? nein = Treffer | auf die Glieder kürzen, die eine Tatsache tragen |
| Doppelpunkt-Fanfare | im Fließtext (Absatz, Rückmeldung, Untertitel) nach einem Schlagwort und Doppelpunkt ein ganzer Satz die Pointe trägt („Das Ergebnis: Das Netz bricht zusammen.“). Nie Treffer: Zeilenanfänge der Kursdatei (`Vorspann:`, `Merke:`, `MC:`, `RF:`, `Seite:`, Angaben), Überschriften und Elementtitel, Listen und Listenlabels (`- Lesen: …`) | als einen Satz schreiben |
| Rhetorische Frage | Probe: folgt im selben oder im nächsten Element eine Aufgabe dazu oder die Antwort? nein = Treffer. Nie Treffer: Titel, Untertitel, Vorderseiten von Lernkarten, Fragen in Quiz, Test, Abstimmung und Forum | als Aussage schreiben |
| Generisches Lob | Rückmeldung, die nach Streichen der Lobwörter („Super“, „Toll“, „Genau richtig“) keinen Grund mehr nennt | den Grund nennen („Stimmt, der Switch verteilt im Netz, der Router verbindet nach außen.“) |
| Austauschbarer Distraktor | falsche Option passt zu jeder Frage oder scheidet ohne Fachwissen aus („Keine der Antworten“, Scherzantwort); oder die richtige Option ist um mehr als die Hälfte länger als jede falsche | aus einer Fehlvorstellung zum Thema bauen, Längen angleichen; die Reihenfolge mischt der Generator |
| Ausrufezeichen | `!` in Kurstext, Aufgaben oder Rückmeldungen. Nie Treffer: Code und Formeln (`5!`, `!=`), direkte Rede, Zitate, Fehlermeldungen, Ausrufesatz als Unterrichtsgegenstand | Punkt |
| Deko-Emoji | Emoji in Text, Titel oder Rückmeldung ohne Eintrag unter `vorgaben:` (`design.emoji_marker` schaltet nur die Marker in Fahrplan, Kacheln und Überblick) | streichen |
| Zweck- oder Quellenzeile im Kurs | Probe: sagt der Satz, was das Element ist, woher es stammt oder wozu es dient („Hier übst du …“, „Ziel: …“, „Quelle: Folie 3“, „Lesebuch mit vier Seiten“)? ja = Treffer. Nie Treffer: Bedienhinweise zu Bewertung, Versuchen, Bestehen, Abgabe, Anonymität, Heft („Übernimm die Tabelle ins Heft“); die Überblickskarte | Zweck nach `[Zweck: …]`, Quelle nach `[Quelle: …]`, sonst streichen |
| Beschreibender Untertitel | Untertitel oder Vorspann nennt Umfang, Dauer oder Aufbau („Eine Einheit, etwa 25 Minuten.“) | streichen; die Dauer steht in `dauer:` der Überblickskarte |
| Genderzeichen | `:in`, `*innen`, `_innen`, Binnen-I in Personenbezeichnungen („SchülerInnen“) ohne Eintrag unter `vorgaben:`. Nie Treffer: Eigennamen und Wörter wie „LinkedIn“, „LogIn“ | Doppelform oder neutral (Lernende, Lehrkraft) |
| Floskel-Überschrift | Überschrift sagt nicht, worum es geht („Los geht’s“, „Spannende Fakten“, „Wusstest du schon?“, „Das Wichtigste in Kürze“) oder ist ein Gliederungswort („Einleitung“, „Teil 1“, „Abschluss“) | sagen, worum es geht („Router und Switch unterscheiden“) |
| Absolute Aussage | „immer“, „nie“, „alle“, „garantiert“. Probe: gibt es im Stoff eine Ausnahme, auch eine, die der Kurs nicht behandelt? ja = Treffer. Nie Treffer: RF-Aussagen mit ✘ | einschränken („meist“) oder den Fall nennen, in dem es gilt |
| Werbesprache und Aphorismus | „spannend“, „entdecke“, „die Welt der …“, Sinnsprüche, dramatisierte Einstiege („Stell dir vor, plötzlich …“). Nie Treffer: das Wort als Fachbegriff oder Unterrichtsgegenstand | sachlich sagen, was kommt, oder streichen |
| Prosa-Anweisung | Arbeitsauftrag mit mehr als einem Satz; Kasten mit Regeln, Redemitteln oder Rollen als Fließtext | Stichzeilen (`- …`), `Schritte:` oder Tabelle |
| Langer Absatz | Absatz über 60 Wörter (fünf Zeilen auf dem Handy) | teilen oder einen Baustein nehmen (`intake.md` §5) |
| Schlussformel | „Viel Erfolg“, „Viel Spaß“, „Du schaffst das“, Grußzeilen am Ende eines Elements | streichen |
