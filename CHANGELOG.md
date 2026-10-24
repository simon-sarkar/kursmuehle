# Changelog

## 2.0.0-b4 – 2026-10-24 (AP13.3: ein Korrekturweg, Stückelung, nachsichtiger Parser, fachneutrale Vorlage, Dunkel)

Korrekturen laufen jetzt über einen einzigen Weg, lange Texte werden in Teile gestückelt, und die Mühle gibt es auch dunkel.

- **Ein Korrekturweg.** Unter dem Einfügefeld von Schritt 5 steht ein Block mit allen Sätzen der Prüfung; „Korrektur anfordern“ kopiert sie in einem Text, die Seite setzt die Antwort Baustein für Baustein nach `id:` ein. Die Korrekturschleife an der Karte entfällt.
- **Neu beauftragen.** „Diesen Baustein neu beauftragen“ markiert auch mehrere Karten und nutzt denselben Block; rote Karten zeigen ihren Satz und verlinken den Block.
- **Antwort mit `id:`.** Ein Baustein landet immer an der Karte mit seiner `id:`, auch wenn der Block für eine andere Karte offen ist; eine ganze Kursdatei ersetzt auch die alten Zeilen `Angenommen:`.
- **Einfügefeld.** Neben der Automatik gibt es den Knopf „Antwort übernehmen“; die Meldung steht als Karte darunter, und wer den eigenen Satz oder Text der Mühle einfügt, bekommt einen Hinweis.
- **Stückelung.** Die Teile entstehen nur aus den Karten der laufenden Einheit und bleiben ab dem ersten Kopieren fest; Schritt 5 führt durch („Teil 1 von 2 eingefügt, jetzt Teil 2 kopieren“), rote Karten und Korrektur erscheinen erst nach dem letzten Teil.
- **Teile.** Jeder Teil nennt seinen Anteil an den Minuten, Teil 2 und folgende wiederholen Format und Prüfliste nicht; die Grenze liegt bei 14 KB, sechs Karten passen in einen Teil.
- **Je Einheit.** Rand und Schritt Bilder rechnen nur die laufende Einheit; ein neuer Bildwunsch zum gleichen Dateinamen ersetzt den alten.
- **Nachsichtigerer Parser.** `phase:` unter einer Überschrift wird übergangen, `website:` am Element wird bei gleichem Wert im Abschnitt geduldet, beim Zuordnen trennt der letzte Pfeil die Zone, eine Frage darf mit einem Situationssatz beginnen, ein Kasten ohne eingerückten Inhalt nimmt die Zeilen bis zur Leerzeile (mit gelbem Hinweis).
- **Fachneutrale Vorlage.** Die Teilschritte der Einführung sagen „Kernaussage“ und „an Beispielen oder Fällen“ statt Regel und Rechenbeispiele; „Übung zum Anwenden“ nennt keine Anzahl mehr.
- **Text für den Chat.** Rechenaufgaben, Formeln und Maßstäbe nur, wenn das Thema sie hat; kurze Sätze ohne Nachkommastellen in Jahrgangsstufe 1 bis 4; keine Namen aus Gespräch oder Profil; Einstieg 3 bis 5 Minuten; eine genannte Bildzahl geht der Bildregel vor; die Phase kommt nie in die Datei.
- **Bildprompt und Hefteintrag.** Der Bildprompt nennt je Beschriftung das Ziel des Pfeils, ab etwa fünf Beschriftungen mit nummerierten Pfeilen; Hefteintrag bis Jahrgangsstufe 6 mindestens 50 Wörter, ab 7 mindestens 80.
- **Rückmeldung.** Jede Regel der Prüfung hat eine Kennung, die Karte und Korrektursatz mitführen; die Rückmeldung enthält eine Zeile mit der Zahl der Korrekturen, den Regeln und dem Chat, aber keine Inhalte.
- **Dunkel.** Die Mühle übernimmt die Wahl der Startseite und hat in der Kopfzeile den Textlink „Dunkel“/„Hell“; hell bleibt Standard. Herkunftstöne und Hintergrundmuster sind für den dunklen Satz abgestimmt. Ocker trägt nur noch den Ergebnis-Knopf, die Herkunft der Lehrkraft und den Fokusrahmen.
- **Firefox.** Die Wahl einer Aussehen-Kachel im Steckbrief ging bei schnellem Klicken verloren und bleibt jetzt erhalten.

## 2.0.0-b3 – 2026-10-24 (AP13.2: Landingpage als Schritt 1, Dark Mode, Kopfzeile, drehende Mühle)

Die Startseite beschreibt das Werkzeug nicht mehr, sie fängt an; die Mühle selbst bleibt unverändert.

- **Startseite als Schritt 1.** Oben stehen die drei Felder Thema, Jahrgangsstufe und Minuten mit „Weiter“, gesetzt wie in der Mühle; „Weiter“ übergibt die Angaben im Adressteil nach `#` an die Mühle; er verlässt den Browser nicht und steht in keinem Zugriffsprotokoll. Ohne Skript schickt das Formular dieselben Felder.
- **Startseite, Aufbau.** Statt einer Überschrift steht die Frage aus Schritt 1 über den Feldern, die Erklärung folgt in einer Zeile; die kleinere Kachel „Mahlwerk starten“ sitzt rechts daneben, auf dem Handy als flache Zeile. Der Ablauf hat eine Zeile je Schritt, ein Name steht nicht auf der Seite.
- **Hell und Dunkel.** Landingpage und Impressum haben einen dunklen Farbsatz mit Anthrazit-Band und Wasserzeichen in Creme; hell ist Standard, unabhängig von der Systemeinstellung, und ein Textlink „Dunkel“ in der Kopfzeile schaltet um (die Wahl bleibt im Browser).
- **Kopfzeile.** Auf Landingpage und Impressum klebt sie beim Scrollen oben: links Logo und „Kursmühle · Beta“, rechts die kleine Kachel „Mahlwerk starten“, auf der Landingpage erst, wenn die große Kachel aus dem Bild ist; auf dem Handy ohne Untertitel.
- **Drehende Mühle.** Bei Hover und Tastaturfokus dreht sich das Rad der Kachel langsam gegen den Uhrzeigersinn und läuft beim Verlassen aus; bei „weniger Bewegung“ bleibt es ruhig. Das Logo wurde dafür neu gezeichnet.
- **Wasserzeichen.** Es beginnt auf breiten Bildschirmen immer rechts von der Kachel und überdeckt sie nicht mehr.

## 2.0.0-b2 – 2026-10-24 (AP13.1: Mühle mit Führung, Korrekturschleife, Bildern und Zählregeln)

Zweite Beta der Browser-Fassung; geändert ist nur die Mühle.

- **Kopfzeile.** „Einheit öffnen“, „Einheit speichern“, „Neue Einheit“ und der Stand der Sicherung stehen als kleine Textlinks oben; das Wort „Kursdatei“ verschwindet aus der Oberfläche. Logo und Zurück-Knopf führen zur Startseite, die Einheit bleibt gesichert.
- **Vorbelegung von der Startseite.** Thema, Jahrgangsstufe und Minuten füllen Schritt 1 und legen die Einheit an; liegt schon eine Einheit im Browser, fragt die Seite vorher.
- **Ein Ergebnis-Knopf.** „Datei für die Lernplattform herunterladen“ baut und lädt in einem Schritt; Schritt 7 erscheint erst, wenn er etwas kann. Nur dieser Knopf ist ocker, die übrigen Hauptknöpfe sind Anthrazit.
- **Anderer Chat.** Der Link führt zurück zu den Chat-Kacheln; der kopierte Text bleibt, bis ein anderer Chat gewählt ist.
- **Korrekturschleife an der Karte.** „Korrektur anfordern“ öffnet unter der roten Karte Satz, Kopierknopf und Einfügefeld; die Antwort ersetzt nur diesen Baustein. „Diesen Baustein neu beauftragen“ läuft genauso, für mehrere rote Karten gibt es einen Sammelblock unter der Liste.
- **Hinweise beim ersten Durchlauf.** Je Schritt stehen zwei Sätze unter der Überschrift, abschaltbar in Schritt 1 oder am Hinweis.
- **Schritt „Bilder“.** Wenn die Antwort Bildwünsche enthält, zeigt er je Bild Datei, Baustein, Status, den Bildwunsch und einen Auftrag für einen Bildgenerator, jeweils mit Kopierknopf, dazu Hochladen; „Ohne Bild weiter“ lässt den Platzhalter stehen.
- **Zählregeln im Text für den Chat und in der Prüfung.** Zeit wird nie wegerklärt (`Angenommen:` nur für die Form, eine Zeit-Annahme ist ein Fehler mit eigenem Korrektursatz); fehlende Bausteine ergänzt der Chat in der Phasenfolge.
- **Mindestmaße.** Quiz 3 Fragen, Zuordnen 4 Paare, Lückentext 5 Lücken, Lernkarten 4, Hefteintrag 80 Wörter mit Merksatz und fetten Fachbegriffen; was darunter liegt, wird rot. Ein Einstieg über 100 Wörtern gibt einen gelben Hinweis, Denkaufgaben-Kästen zählen nicht als Übung.
- **Warnung vor dem Kopieren.** Zu wenig Karten für die Minuten oder eine Phase ohne Karte („Keine Übung mehr“) werden gemeldet, ohne zu sperren; „Vorlage auffüllen“ setzt fehlende Phasen mit Typ automatisch ein.
- **Automatisch und Grenze.** „Automatisch“ bietet sechs Typen an (dazu Lernkarten und Lückentext); der Text für den Chat darf bis 12 KB lang sein.
- **Nächste Einheit.** Aussehen und Chat sind vorbelegt, nach Schritt 2 geht es direkt zum Text für den Chat.
- **Kursdatei.** Neue Kopfzeile `Bildprompt:` am Baustein, sie erscheint nicht im Kurs.

## 2.0.0-b1 – 2026-10-24 (AP13 und AP13b: Schrittfolge, minimale Vorlagen, Typ automatisch, Nach dem Bau, Landingpage, Beta-Veröffentlichung)

Erste Beta der Browser-Fassung unter kursmuehle.de. Das Release-Zip für die Agenten-Nutzer bleibt 1.0.3 (latest), 2.0.0-b1 erscheint als Vorab-Release.

- **Schrittfolge statt Vollformular.** Zu Beginn nur Thema, Jahrgangsstufe, Minuten und „Weiter“; jeder Schritt erscheint erst, wenn der vorige getan ist, erledigte Schritte stehen als aufklappbare Zeile mit Fazit. Sieben Schritte führen von „Worum geht es“ bis zur Datei für die Lernplattform.
- **Zwei Zweige.** „Mach du“ setzt Vorlage und Bausteine still und zeigt die Karten erst nach der Antwort; „Ich steuere“ zeigt Vorlagen, Karten mit Aufträgen und „Mehr einstellen“. Der Wechsel ist jederzeit möglich.
- **Minimale Vorlagen.** Höchstens sechs Karten, eine je Phase; die Einführung besteht aus Einstieg, Lesetext mit Fragen, Übung zum Zuordnen, Übung mit Eingabe, Hefteintrag und einer ausgeschalteten Vertiefung. Die Teilschritte der Erarbeitung stehen als Anweisung im Text für den Chat.
- **Typ „automatisch“.** Der Text für den Chat nennt vier Typen zur Wahl, das Modell wählt; nennt ein Auftrag zwei Dinge, entstehen zwei Bausteine (`b3` und `b3-2`). Die Typauswahl an der Karte ist nach Rolle gruppiert, „+“ zwischen den Karten fügt eine Karte ein.
- **Zeit je Phase.** Der Schalter „Zeit je Phase selbst einstellen“ (Standard aus) ersetzt „Zeitplanung anzeigen“: aus, nennt der Text nur die Gesamtminuten und Richtwerte, an, gibt es Minutenfelder an den Karten. Gerechnete und vom Chat stammende Zahlen stehen kursiv, eingestellte aufrecht.
- **Aussehen.** Kacheln mit Miniatur für drei Designvorlagen, das Kursformat Themen oder Kacheln und sechs Farben, auch im Zweig „Mach du“.
- **Herkunft je Feld.** Aufträge, Material und von der Lehrkraft umbenannte Titel erscheinen in Ocker, Inhalt aus dem Chat in Grau, mit Legende am Rand; im Kurs erscheint davon nichts (`herkunft` je Baustein).
- **Nach dem Bau.** Fünf Schritte zum Wiederherstellen (neuer Kurs oder Zusammenführen, Kurseinstellungen, Glossar-Einträge mit eigenem Download, Abzeichen) und „Importiert?“.
- **Nächste Einheit anhängen.** Neue Karten kommen hinten an, der Text nur für die leeren; der Abschnitt trägt `teil: e2`, die Datei ist eine Nachlieferung zum Zusammenführen.
- **Rückmeldung.** Ein kopierbarer Text an kursmuehle@pm.me mit Version, Chat, Fach, Jahrgangsstufe und Vorlage, ohne Inhalte.
- **Verwerfen und Speichern.** „×“ neben „Weiter mit …“ löscht die gesicherte Einheit nach Rückfrage, „×“ oben schließt die offene; „Einheit speichern“ steht oben und schließt den laufenden Schritt ab, wenn er fertig ist.
- **Hintergrundmuster kräftiger.** Deckung 6 statt 4 Prozent und ein größerer Rapport.
- **Landingpage, Impressum und Datenschutz.** Ein Satz sagt, was herauskommt; die Kachel „Mahlwerk starten“ führt zur Mühle, „Weiter mit deiner Einheit“ erscheint, wenn eine Einheit gesichert ist. Die Seite lädt nichts von außen; das Impressum erklärt den Datenschutz in Sätzen und als Tabelle.
- **Veröffentlichung.** `-b`-Versionen werden vollständig als Vorab-Release veröffentlicht (latest bleibt 1.0.3), `-a` und andere Suffixe bleiben gesperrt; die frühere Testadresse leitet auf die Mühle weiter und entfällt mit 2.0.0.

## 2.0.0-a4 – 2026-10-24 (AP12a in Teilen: Bild hochladen, Karten entschlacken, Minuten nach Rolle, keine Beispielkurse)

Vorabfassung, kein Release für Lehrkräfte: das Release-Zip bleibt 1.0.3. Das Paket ist unvollständig.

- **Bild hochladen** an jeder Karte, deren Inhalt ein Bild nennt: PNG oder JPEG, die Seite verkleinert auf höchstens 1600 px lange Kante und legt es in der Kursdatei ab; die gelbe Warnung verschwindet. Der Download heißt `<Kurstitel>_<Datum>.mbz`.
- **Karten entschlackt.** Standard sind Nummer, Typ, Titel, Prüfstatus, Auftrag und „Inhalt ansehen“; Phase, Soll und gerechnete Minuten erscheinen erst mit „Zeitplanung anzeigen“, „Diesen Baustein neu beauftragen“ erst, wenn der Baustein Inhalt hat. Ein Teilschritt bleibt nur an der Karte, solange der Chat den geplanten Typ liefert.
- **Text für den Chat.** Wortziel je Baustein aus Soll und Phase; die Erarbeitung der Einführung läuft in drei getrennten Bausteinen mit je einem Teilschritt, Teilschritte auch für Übung, Sicherung und Vertiefung; eine Leitplanke verhindert Vorgriffe, eine Skizze ist Pflicht bei Einstieg und Erarbeitung, wenn Fach oder Thema eine braucht.
- **Minuten nach Rolle gerechnet.** Wörter je Minute, Sekunden je Aufgabe und ein Faktor je Jahrgangsstufe, Abschreiben und Rechnen gesondert; der Hinweis an Karte und Rand nennt die Lücke („Erarbeitung für 4 Minuten statt 15“).
- **Hintergrundmuster** statt Wasserzeichen: das Mühlenmotiv gekachelt und diagonal versetzt, in zwei Dichten; Karten und Flächen liegen opak darüber.
- **Keine Beispielkurse.** Sie entfallen aus Zip, Projektseite, README und Dokumentation, „Beispiel ansehen“ entfällt auf der Seite; Prüfkurse werden aus den Formatzeilen des Katalogs gebaut.
- **Testfassung.** Die Seite zeigt oben „Testfassung 2.0.0-a4 · Rückmeldung an kursmuehle@pm.me“, solange die Version ein Suffix trägt, und ist auch ohne eigene Domain unter einer Testadresse erreichbar.

## 2.0.0-a3 – 2026-10-24 (AP11: Text für den Chat, Variante B als Oberfläche)

Vorabfassung, kein Release für Lehrkräfte: das Release-Zip bleibt 1.0.3, die Browser-Fassung liegt nur im Entwicklungsrepo.

- **Variante B ist die Oberfläche.** Karten links, Knöpfe rechts; Variante A und die Auswahlseite fallen weg. Auf Desktop und iPad steht das Mühlenmotiv als Wasserzeichen unter den Knöpfen, auf dem Handy entfällt es.
- **Ist-Minuten gerechnet.** Wörter je Minute nach Jahrgangsstufe, Sekunden je Frage, Lücke, Zuordnung, Karte, Aussage, Szene und Bild, Abschreibtempo für Hefteinträge; weicht die Angabe des Chats um mehr als 20 Prozent und mindestens eine Minute ab, erscheint ein Hinweis an der Karte. Strukturbausteine wie Kursbanner, Überblick, Abzeichen, Datei, Forum und Glossar zeigen keine Minuten und zählen nicht mit.
- **Text für den Chat.** Vor dem ersten Text wählst du den Chat (ByLKI, AIS-Chat, fobizz, MUCGPT, dann ChatGPT, Claude, Gemini, anderer Chat; änderbar unter „Mehr einstellen“). Drei Texte stehen zur Wahl: „Diese Einheit“ mit Kursangaben (neu: Schulart), `Angenommen:`-Zeilen, Bausteinliste, Format, Leitplanken und Checkliste; „Nur dieser Baustein“ für markierte Karten; „Alle leeren Bausteine“.
- **Anpassung an den Chat.** Codeblock, Stückelung nach Abschnitten („Teil 1 von 2“) bei über 10 KB, der Satz zum Aufwand (ChatGPT: Extra High) und die Bitte um Bild-Prompts richten sich nach dem Chat; bei Bild-Prompts bietet die Karte für ein fehlendes Bild ein Feld zum Hochladen. Eigenes Material trägt den Hinweis „Nur Material, an dem du die Rechte hast“.
- **Kopieren** mit einem Knopf, der Text liegt vorher im Feld bereit; daneben „Text ansehen und selbst markieren“. Vor dem ersten Kopieren erscheint einmal eine Infobox zu Rechten am Material und den Nutzungsbedingungen des Chats.
- **Antwort einfügen mit Modus.** „Einheit ersetzen“, „Nur Baustein ersetzen“ (Abgleich über `id:`, ohne `id:` an die einzige markierte Karte) und „Als weitere Einheit anhängen“ (doppelte `id:` werden umbenannt); die Seite schlägt den Modus vor. Je Fehler gibt es eine Korrekturbitte als kopierbaren Satz mit Bausteintitel und `id:`, an der Karte und gesammelt unter dem Eingabefeld.
- **Fragen und Lösungen** als Reiter; „Datei für die Lernplattform erstellen“ wird erst nach dem Öffnen oder mit „Ohne Durchsicht freigeben“ frei. „Lösungen gegenprüfen“ gibt Aufgaben ohne Lösungen an einen neuen Chat und zeigt nach der Antwort nur Abweichungen.

## 2.0.0-a2 – 2026-10-24 (AP10: Baustein-Ansicht mit Kursmappe)

Vorabfassung, kein Release für Lehrkräfte: das Release-Zip bleibt 1.0.3, die Browser-Fassung liegt nur im Entwicklungsrepo.

- **Baustein-Ansicht in zwei Varianten.** Eine Spalte mit Zahlenleiste oder Karten links mit Zahlen und Knöpfen rechts. Du gibst Thema, Jahrgangsstufe und Minuten ein, legst die Einheit an und wählst eine Vorlage (Einführung, Übung und Vertiefung, Wiederholung und Prüfungsvorbereitung, Einheit aus eigenem Material).
- **Bausteinkarten.** Typ, Titel, Phase, Soll-Minuten, Auftrag, Inhalt zum Aufklappen (nur als Text) und Prüfstatus; Karten lassen sich verschieben, löschen (mit Rückgängig), hinzufügen, umbenennen und zum Neubeauftragen markieren.
- **Zahlen am Rand.** Minuten gegen Soll, Folge Lesen, Üben, Sichern, Anteil Multiple Choice, Rückmeldungen und höchstens drei Hinweise je Baustein.
- **Mehr einstellen.** Fach, Kursformat, Designvorlage, Farbe, „Wie erscheinen Übungen?“, Abschluss und Umfang.
- **Speichern und Öffnen.** Antwort des Chats einfügen, Datei für die Lernplattform erstellen und herunterladen, Kursdatei speichern und öffnen (auch die Dateien eines 1.x-Kursordners), Autosave mit „Weiter mit …“ und „Zuletzt gesichert um …“. Die Generator-Umgebung lädt beim Öffnen im Hintergrund, Felder und Vorlage sind vorher bedienbar.
- **Baustein-ID `id:`.** Neue Angabe für alle Elementtypen, ohne Wirkung im Kurs; ungültige oder doppelte IDs werden Warnung. Fehlt sie, ordnet der Abgleich nach Position zu, und ein umbenannter Baustein behält Auftrag, Phase und Soll.
- **Kleinigkeiten.** `<b und c>` und `x<y` gelten nicht mehr als Tag, sondern bleiben Text; die Akzentfarbe kommt aus `kurs.farbe` im Steckbrief, wenn die Kursdatei keine nennt.

## 2.0.0-a1 – 2026-10-24 (AP10a: Spike der Browser-Fassung, Repo-Split)

Vorabfassung, kein Release für Lehrkräfte: das Release-Zip bleibt 1.0.3, die Browser-Fassung liegt nur im Entwicklungsrepo.

- **Repo-Split.** Entwickelt wird in einem privaten Repo; jeder Push auf `main` schreibt den öffentlichen Stand und hängt das Release-Zip an, Versionen mit Suffix werden Vorab-Release und nicht „latest“.
- **Nachsichtiges Lesen.** Ein fehlerhaftes `###` fällt aus, der Rest wird gelesen; jeder Baustein bekommt eine stabile ID, Meldungen nennen Bausteintitel und Zeile, ein fehlendes Bild wird Warnung plus Platzhalter. Die ganze Chat-Antwort wird angenommen (Vorrede, Codeblock-Zeichen, mehrere Blöcke).
- **Reproduzierbarer Bau.** Mit festem Zeitstempel und Seed ist das Archiv byteidentisch; Zeitzone Europe/Berlin und Bildgrößen kommen ohne Systemhilfe und ohne Pillow, JPEG-Bilder sind erlaubt.
- **Bereinigung der Eingabe.** Jede Zeile behält nur b, i, em, strong, br, sup, sub und mark ohne Attribute; Skript, Stil und Kommentare verschwinden samt Inhalt. Adressen nur mit https, externe Bilder sind nicht erlaubt.
- **Kursmappe.** Ein ZIP mit Bausteinliste (ID, Typ, Titel, Abschnitt, Minuten, Auftrag, Phase, Soll), Kurstext, Steckbrief und Bildern; ein 1.x-Kursordner wird beim Öffnen zur Mappe, ältere Formatversionen werden migriert.
- **Browser-Fassung als Spike.** Pyodide (gepinnt, selbst gehostet) führt Prüfen, Bauen und Mappe in der Seite aus; die Testseite hat Einfügefeld mit Sofortprüfung, Mappe speichern und öffnen, 1.x-Ordner importieren und Autosave.
- **Katalog.** Eine Quelle je Bausteintyp mit Formularname, Ziel, Angaben, Pflicht, Beispiel, Regeln und Phasen. Entfallen ist der Python-Ausweg für Kursinhalte, sie kommen nur noch aus der Kursdatei.

## 1.0.3 – 2026-10-23

- Parser nachsichtiger bei Formfehlern, die Chats ohne Code-Ausführung machen (Protokoll
  `docs/entwicklung/protokolle/chat-ohne-code/`, AIS-Chat mit GPT-5.5 und fobizz mit GPT-6.1 Sol, 23.10.2026). Beide
  Drehbücher bauen jetzt unverändert:
  - Angaben in einer Zeile mit ` · ` (`versuche: 2 · rückmeldung: sofort · einleitung: …`); das Beispiel in
    `kursdatei.md` §5a zeigt die Angaben jetzt zeilenweise.
  - Leerzeile zwischen `Schritte: …` und der Liste.
  - Zeilen „Hinweis für die Lehrkraft: …“ (Liefertexte) werden ignoriert und gemeldet, statt dem letzten Element
    zugeschlagen zu werden.
  - LaTeX (`$$…$$`, `$…$`, `\(…\)`, `\[…\]`) wird in Klartext umgesetzt (`a^2` → a², `\sqrt{…}` → √(…), `^\circ` → °,
    `\frac{a}{b}` → a/b, `\approx` → ≈, `{,}` → ,); nicht umgesetzte Befehle meldet der Bau mit Zeile.
- `test_kursdatei.py`: Testfall für die vier Formfehler; baut die beiden Chat-Drehbücher, wenn sie vorliegen.
- `docs/erfahrungen.md`: Durchläufe mit AIS-Chat und fobizz.

## 1.0.2 – 2026-10-23

- Hinweis in README, Projektseite und Skill-Menü: Wie viel die Lehrkraft vorgeben muss, hängt vom Modell ab; bei kleinen
  oder kostenlosen Modellen Phasen, Übungstypen, Formate, Textlänge, Beispiele und Fehlvorstellungen nennen (Nachtrag 23.10.).
- `SKILL.md`, Ablauf: Der Assistent baut die `.mbz` mit `scripts/build.py`, sobald das Drehbuch freigegeben ist, bei
  Steuerungsgrad c sofort nach dem Drehbuch ohne Halt. Er behauptet nie vorab, Code-Ausführung oder Python fehle; erst
  wenn der Bauaufruf scheitert, zeigt er die Fehlermeldung und liefert Drehbuch und Steckbrief als Dateien. Anlass: Im
  ChatGPT-Durchlauf vom 23.10. (GPT-5.6 Terra, Aufwand Medium) hielt das Modell mit „keine lauffähige Python-Umgebung“
  an und baute auf Nachfrage doch.
- README und Projektseite: bei ChatGPT den Aufwand auf „Extra High“ stellen (gibt es auch im Gratiskonto).
- Protokoll `docs/entwicklung/protokolle/chatgpt-free.md` mit zwei Durchläufen im kostenlosen Konto (Satz des Pythagoras,
  Jgst 9, 45 min); Richtwerte dazu in README und auf der Projektseite. Import von Kurs B steht aus.

## 1.0.1 – 2026-10-23

- Beispielbilder in `examples/netzwerk9/assets/` durch einfache, selbst erzeugte Schemazeichnungen ersetzt.
- README, Projektseite, `SKILL.md`, `docs/fortgeschrittene.md` und ROADMAP nach dem Gutachten zur Außendarstellung
  (`docs/entwicklung/protokolle/README_gutachten_1.0.md`) überarbeitet: Teststand ehrlich (mit 1.0 nur Claude Code),
  Beispielsatz mit „Zeig mir zuerst das Drehbuch.“, Datenschutzsatz, Schritt für ByLKI und AIS-Chat, Begriffe,
  Wiederherstellen direkt hinter „Drei Wege“, Richtwerte korrigiert.
- Rückmeldeadresse kursmuehle@pm.me auf Projektseite, in README und am Ende des Ablaufs in `SKILL.md`; der Platzhalter-Link
  ist entfernt.
- Import-Protokoll `docs/entwicklung/protokolle/import-tests-2-5.md` (Import-Tests 2–5, 23.10.2026); README, ROADMAP und
  `SKILL.md` beziehen ihre Import-Stände darauf.

## 1.0 – 2026-10-23 (AP9: Fremdtest, Release-Zip, Projektseite, Wiederherstellungsanleitung)

- Fremdtest (AP9): ein frischer Assistent der Sonnet-Klasse bekam nur das Release-Zip und den Satz „Mach mir eine Einheit
  zu Bruchrechnen für Jgst 6, 45 Minuten, Selbstlernkurs“ und lief ohne Hilfe bis zur `.mbz`; zwei Durchläufe, der zweite
  mit den Änderungen aus dem ersten. Protokoll mit Lesereihenfolge, Rückfragen, Ratestellen, Abweichungen, Slop-Prüfung,
  Laufzeit und Tokens: `docs/entwicklung/protokolle/AP9_fremdtest.md`; Richtwerte in der README.
- Folgen aus Durchlauf 1 in SKILL.md, intake.md, kursdatei.md: Nennt die erste Nachricht schon Thema, Jahrgangsstufe,
  Einsatz und Minuten, entfällt „Womit starten wir?“ (Weg 1, KI macht alles); zu breites Thema grenzt der Assistent als
  `Angenommen:` ein. Eine einzelne Einheit bekommt das Themenformat, auch als Selbstlernkurs. Geschichte erst ab etwa
  90 min; Selbsteinschätzung vorher in Allgemeines, nachher als letztes Element. Übungsquiz im Textfeld braucht
  `abschluss: ansehen`. Badge-Bild: `banner.py --badge --titel … --kicker …` (neu) oder selbst erzeugt. Rechenzeichen in
  der Kursdatei (Brüche `3/8`, ` · ` ist Trennzeichen, Malzeichen `×`, keine LaTeX-Formeln). Zeitcheck bis Jgst 7 mit
  100 Wörtern/min, Rechenlücke 30 s. `--proto` erklärt (nur für einen Prototyp zum Ansehen), Ausgabeordner `out/` genannt.
  Dateiname der `.mbz` jetzt ASCII ohne Leerzeichen (`brueche-6_kurs_…`), Umlaute ausgeschrieben, mit Sekunden.
- Folgen aus Durchlauf 2: Darstellungsweg bei Weg 1 ohne Rückfrage nach der Rangfolge (intake.md §1); Ablenker im
  Zuordnen muss die Aufgabe nennen, `→ richtig:`/`→ falsch:` bei RF definiert, Lückentext-Absätze und Bruchlücken
  (kursdatei.md §3, §5); Allgemeines zählt zur Soll-Zeit (höchstens 3 min); einfache Fachgrafiken mit Pillow (intake.md §4);
  `delivered` erst nach bestätigtem Import. SKILL.md gekürzt: die harten Regeln zu Bibliotheksversionen, `json_content` und
  Dateibereichen sind ein Satz (das macht der Generator), die Dateiliste nennt nur noch die Laufzeitdateien.
- Wiederherstellungsanleitung Schritt für Schritt, wie sie auf der Plattform aussieht (Kurs → Mehr → Kurs wiederherstellen;
  Bestätigen; Ziel mit drei Varianten; Einstellungen; Schema mit „Kurseinstellungen überschreiben: Ja“ bei Formatwechsel;
  danach Glossar-XML und Badge) in SKILL.md (Text für die Lieferung) und README. Sicherungen höchstens 500 MB;
  `check.py` warnt ab 400 MB (`GROESSE_WARNUNG_MB`, Testfall in `test_check.py`).
- Textfeld-Regel oben in SKILL.md und README: Ein Übungs-Textfeld, das eine Lehrkraft mit „Einstellungen bearbeiten“
  speichert, verliert Skript und Stil (Plattformtest 23.10.); Änderungen über Drehbuch und Delta oder Neuimport. Als
  ungeprüfter Ausweg dokumentiert: Texteditor in den Nutzereinstellungen auf „Textbereich“ stellen.
- `AGENTS.md` als neutraler Name für die Arbeitsregeln; `CLAUDE.md` ist nur noch `@AGENTS.md`. `arbeitspakete/` liegt
  jetzt unter `docs/entwicklung/`, mit Prompt-Vorlage in dessen README; Verweise angepasst (ältere CHANGELOG-Einträge
  bleiben als Verlauf).
- `scripts/package.py`: Release-Zip `dist/kursmuehle.zip` (SKILL.md, README, CHANGELOG, ROADMAP, Lizenzen, references/
  ohne export-schemata, scripts/, examples/ ohne out/, docs/ ohne entwicklung/; ohne tools/, AGENTS.md, CLAUDE.md), alles
  unter `kursmuehle/`. Der Dateiname bleibt fest, damit `releases/latest/download/kursmuehle.zip` stabil ist.
- README: „Drei Wege“ (ByLKI und AIS-Chat mit der Browser-Fassung 2.0; ChatGPT und Claude mit dem Skill-Zip; Agenten mit dem
  Repo), Schnellstart mit Download-Link, Projektstatus 1.0, Wiederherstellen auf der Plattform, Rückmeldung geben,
  Richtwerte aus dem Fremdtest, Struktur mit docs/ und AGENTS.md, Status-Liste mit 1.1 und 2.0.
- `docs/index.html`: Projektseite für GitHub Pages (Logo und Palette aus docs/, Pitch, Schnellstart, Download über
  `releases/latest/download/`, Wiederherstellen, Rückmeldung mit Platzhalter-Link, den der Autor einträgt).
- `docs/fortgeschrittene.md`: Repo klonen, eigene Kurssicherung lokal als Vorlage analysieren (bleibt lokal), eigene
  Designvorlage, Textbausteine, Fachregeln, Beispielordner, Zip neu packen, Beitragsregel. `docs/erfahrungen.md` für
  Rückmeldungen und gebaute Kurse.
- `docs/entwicklung/protokolle/`: Vorlagen für die Durchläufe des Autors (Import-Test 1.0, ChatGPT Free, Claude Free,
  ByLKI), so weit ausgefüllt, wie es ohne Plattform und fremde Konten geht; Messfelder leer.
- ROADMAP: 1.0 erreicht; unter „Nach 1.0“ als 1.1 vorgemerkt: `vorlage_aus_sicherung.py`, Übungsblöcke, die ohne
  Skript als Tabelle oder Fragenliste lesbar bleiben, Website als SCORM-Paket für Bewertung und Abschluss.
- `test_kursdatei.py` baut jeden Ordner unter `examples/` mit `kurs.md`. Badge `docs/badge-status.svg` „Release“,
  `badge-version.svg` 1.0.
- Offen (Autor): Pages aktivieren, Release v1.0 mit `kursmuehle.zip` anlegen, Feedback-Link eintragen, Durchläufe nach den
  Protokollvorlagen; Import-Test des Fremdtest-Kurses. Nicht umgesetzt aus dem Fremdtest: Kürzung von `intake.md` §5
  (der Syntaxblock bleibt als Kurzfassung, `kursdatei.md` als Referenz).

## 0.9.1 – 2026-10-23 (AP7b: Textfeld-Modus nach der JS-Probe; didaktik.md in intake.md)

- JS-Probe auf der Plattform (23.10., `tools/jsprobe`): Probe 1 bestanden, JavaScript im Textfeld läuft; Probe 2
  bestanden, die eingebettete Datei läuft in voller Rahmenhöhe. Ergebnis in `tools/jsprobe/README.md` und ROADMAP
  Punkt 5–7; neue Probe 3 (zwei Übungen als Blöcke im Textfeld) für den nächsten Import-Test.
- Textfeld-Modus (`website: textfeld` im Steckbrief oder am Abschnitt, `build.py --website textfeld`): Quiz, Zuordnen,
  Lernkarten, Lückentext und Geschichte werden je ein Block in einem Textfeld, direkt zwischen den Lesetexten, ohne
  iframe. Der Block nutzt die Übungen des Website-Renderers; CSS und Skript der Übungen liegen dafür in
  `scripts/templates/uebungen.css` und `uebungen.js` und werden von Website und Block geteilt. Im Block steht jede
  CSS-Regel unter der id des Blocks (`#kmb-…`), das Skript läuft in einer eigenen Funktion ohne globale Namen und
  sucht nur seinen Block; Feldnamen tragen die id, ein zweiter Lauf (Abschnitt nachgeladen) bleibt wirkungslos. Bilder
  liegen als Dateien im Textfeld (`@@PLUGINFILE@@`, auch das Startbild der Geschichte). Ohne JavaScript zeigt der Block
  den Hinweis, die Kursseite im Browser zu öffnen. Das Skript meidet Zeichenfolgen, die Moodle-Filter umschreiben
  (zwei Dollarzeichen, Backslash-Klammer, Emoticons); der Platzhalter-Vergleich im Lückentext kommt ohne RegExp aus.
  Je Block etwa 10 KB Stil und Skript.
- Rangfolge im Generator: Was für den Abschluss zählt (`abschluss: bestehen`, beim Quiz Standard), Badge-
  Voraussetzungen und Elemente mit `website: nein` bleiben im Textfeld-Modus H5P-Aktivität; Lesebuch, Textfeld, Seite,
  Banner, Überblick, Video und Moodle-Module bleiben unverändert. `website:` am Element meldet jetzt auch im
  Textfeld-Modus einen Fehler, wenn der Wert nicht `nein` ist.
- Vorschau aller Blöcke als `<kurs>_textfeld.html` neben der `.mbz` (`gen/website.vorschau_textfeld`).
- `check.py`: Textfeld-Blöcke (eine id je Textfeld, im Kurs eindeutig; CSS nur unter der id; ein Skript als eigene
  Funktion mit `getElementById` der eigenen id; Feldnamen mit der id; keine Filter-Zeichenfolgen; nichts von außen;
  Warnung ab 60 KB je Block).
- Kachelformat: Ein `### Überblick:` in Allgemeines entfällt automatisch (doppelt die Kacheln), mit Hinweis beim Bau;
  Überblicke in den Abschnitten bleiben. `build.py --format` erreicht dafür auch den Parser.
- D1–D10 und die Rangfolge Lehrkraft > Material > Standardannahme stehen jetzt in `references/intake.md` §3, dazu der
  Darstellungsweg (Textfeld für formative Übungen, Aktivität für Bewertetes und Abschlussrelevantes, Website-Datei für
  eine ganze Einheit). `references/didaktik.md` entfällt; Verweise in SKILL.md, intake.md, qualitaet.md, kursdatei.md,
  spec.md, README, ROADMAP angepasst (CHANGELOG und AP8-Unterlagen bleiben als Verlauf). CLAUDE.md: Der Assistent liest
  im Einsatz `SKILL.md`, das Kursdatei-Format, `intake.md` und `qualitaet.md`.
- SKILL.md: Rangfolge im Bau-Schritt, Vorbehalte unter Grenzen (Moodle-App, Größe der Kursseite, Nutzungsbedingungen
  4.1.3). intake.md: Gestaltungsfrage mit Textfeld oder Website, Steckbrief `website: textfeld`. kursdatei.md §2, §4
  (Kachelformat), §7a (Textfeld-Modus).
- README: Abschnitt „Was Kursmühle kann“ (drei Darstellungswege mit Vorbehalten, sechs Kursformate, alle Elementtypen,
  Designvorlagen, Glossar-Import, Delta, Prüfdurchlauf, Steuerungsgrad) statt der kurzen Feature-Liste; Kann/Noch-
  nicht-Tabelle mit Zeile Textfeld-Modus; Status und Roadmap-Liste. `docs/website-netzwerk9.png` mit dem aktuellen
  netzwerk9 neu gerendert, `docs/badge-version.svg` 0.9.1. `arbeitspakete/AP7b.md` neu.
- Tests: `test_website.py` baut netzwerk9 und alltagskompetenz zusätzlich mit `--website textfeld` und prüft in der
  Vorschau mit fremden Elementen davor (bei 390 und 1280 px): keine Anfrage nach außen, eindeutige ids, keine globalen
  Namen, jedes Blockskript läuft, Bilder gesetzt, CSS erreicht fremde Elemente nicht, Auswahl und Prüfen in einem Block
  lassen andere Blöcke unberührt, Quiz falsch/richtig mit Zähler, Zuordnen, Lernkarte (nur diese dreht), zweiter
  Skriptlauf doppelt nichts, Lückentext, Geschichte mit Startbild bis zu einem Ende. `test_check.py`: beide
  Textfeld-Builds OK, fünf neue Fehlerfälle (doppelte id, CSS ohne id, Feldname ohne id, Filter-Zeichenfolge, Skript
  mit globalem Namen). `test_kursdatei.py`: Zuordnung der Elemente im Textfeld-Modus, Kachelformat ohne Überblick in
  Allgemeines, zwei neue Fehlerfälle. Sicherungen ohne Website- und Textfeld-Modus sind inhaltsgleich zu 0.9
  (netzwerk9, alltagskompetenz, module; `mbz_diff.py`, bei module nur der Zeitstempel verschieden).
- Offen: Import-Test von Probe 3 auf der Plattform; Verhalten in der Moodle-App; Kachelformat (lädt Abschnitte nach,
  der Schutz gegen doppelten Lauf ist im Browser getestet, nicht auf der Plattform); Bearbeiten eines Block-Textfelds
  im Editor nach dem Import. Der Baustein `Kacheln:` in Allgemeines (alltagskompetenz) bleibt im Kachelformat stehen.

## 0.9 – 2026-10-23 (AP8: didaktik.md und qualitaet.md, überarbeitet nach dem AP8-Review)

Grundlage ist der Entwurf aus PR #7, auf 0.8 geholt; alle 20 Funde aus `arbeitspakete/AP8-Review.md` sind eingearbeitet.

- `references/didaktik.md` (Laufzeitfassung): Rangfolge Angabe der Lehrkraft > ihr Material > Standardannahme und D1–D10
  nur als Prinzip. Was schon in `intake.md` steht (Erst Input, dann Kontrolle; Rhythmus; Zeitcheck; Einstieg), ist ein
  Verweis. D5: Rückmeldung bei jeder falschen Option, die eine Fehlvorstellung abbildet, Abschlussquiz und Test frei
  (`intake.md` §5 angeglichen). D6 gilt nur für die Reihenfolge der Übungen, D9 verlangt eine Mehrheit von Fällen in Quiz
  und Test, D2 einen neuen Fall in der Sicherung. D7 zählt die Elemente ohne Banner und Überblick, Lesebuch und Buch sind
  Input. D3 mit Probe (höchstens acht Wörter mit Verb). Begründungen stehen als Entwicklerfassung in `spec.md` §L.
- Abweichungen von D1–D10 stehen als `Abweichung: <Klartext> (Dn)` im Drehbuch-Kopf (statt `Hinweis:`, das unter einem
  Element ein orangefarbener Kasten ist). Fachzweifel aus dem Prüfdurchlauf stehen als `Offen: …` im Kopf.
- Zweck je Element als `[Zweck: …]` in der Überschriftzeile, definiert in `intake.md` §5 und `kursdatei.md` §1.
- `references/qualitaet.md`: ein Durchlauf, bevor die Lehrkraft das Drehbuch sieht (bei „KI macht alles“ vor dem Bau),
  danach nur Änderungen; kein zweiter Lauf in Subagent oder neuem Chat. Markerliste mit mechanischen Proben (Dreierreihe,
  rhetorische Frage, absolute Aussage, Zweckzeile, Lob) und ausdrücklichen Nicht-Treffern: Doppelpunkt-Fanfare nur im
  Fließtext, nie Kursdatei-Zeilenanfänge, Überschriften oder Listenlabels; Bedienhinweise sind keine Zweckzeile; RF-Aussagen
  mit ✘, Code, Formeln und direkte Rede sind keine Treffer. Positionskriterium beim Distraktor gestrichen (der Generator
  mischt), Länge mit Schwelle. Neu: beschreibender Untertitel, Prosa-Anweisung, langer Absatz, Schlussformel,
  Gliederungswörter als Überschrift. Fachprüfung: Lösung jeder Frage im Bezugselement nachschlagen. Ausnahmen vom
  „beheben, nicht melden“: Zeitvorschlag in der `Zeit`-Zeile, Fachzweifel als `Offen:`. Wünsche der Lehrkraft stehen im
  neuen Steckbrieffeld `vorgaben:`.
- Kein Entwurfsvermerk im Laufzeittext; die Regel für Beispiele (nur eigene oder CC0-Inhalte) steht in der README unter
  „Mitmachen“.
- Parser (`gen/kursdatei.py`): `Abweichung:` und `Offen:` werden wie `Angenommen:` übergangen; `_clean` entfernt
  `[Zweck: …]`; die Kurs-Angaben im Kopf werden zeilenweise gelesen, eine fremde Zeile vor `farbe:` verschluckt die Farbe
  nicht mehr. Website-Modus mischt MC-Antworten wie H5P und Test (deterministisch je Frage).
- SKILL.md: Prüfdurchlauf in Schritt 2, Schritt 4 nur Änderungen nach der Freigabe; „Erst Input“ und Inhaltsregeln als
  Verweis auf `didaktik.md` und `qualitaet.md`; Lesebuch und Buch als Input.
- `examples/netzwerk9` besteht den eigenen Prüfdurchlauf: Zweck je Element, Verweise auf Elementtitel, Lernkarten vor den
  Fällen (D6), Check-Frage als Fall mit Rückmeldung je Fehlvorstellung, Abschlussquiz mit vier Fällen, drei davon neu, ohne
  Scherz- und Ausscheide-Distraktoren, Zeitvorschlag in der `Zeit`-Zeile, Untertitel ohne Umfangsangabe. Fachfehler
  behoben: „Access Point braucht immer eine Kabelverbindung“ (falsch bei Repeater und Mesh) in Seite, Lernkarte,
  Hefteintrag und Quiz; Quiz-Frage 1 („holt das Internet in die Wohnung → Router“) widersprach der Seite
  (Telefonbuchse). Kursbeschreibung im Steckbrief nannte ein Lesebuch, das es nicht gibt.
- `scripts/tests/test_website.py` stabil: Die Seite wechselt Kapitel über `hashchange`, also nach dem Klick asynchron;
  die Prüfungen warten jetzt auf den Zielzustand (`warte()`, `springe()`), statt ihn sofort abzufragen. Vorher je Lauf
  1 bis 4 falsche Fehler bei Los geht’s, Weiter, Fortschritt und Menü.
- `test_kursdatei.py`: Kopf mit `Abweichung:`, `Offen:`, fremder Zeile vor `farbe:`; Element mit `[Quelle: …] [Zweck: …]`
  in Überschrift und Text.
- Offen: CLAUDE.md nennt als Laufzeitlektüre nur SKILL.md und das Kursdatei-Format; `didaktik.md` und `qualitaet.md` sind
  zwei weitere Laufzeitdateien (zusammen rund 1100 Wörter). Mechanisch erkennbare Marker (Ausrufezeichen, Emojis,
  Genderzeichen) könnte der Parser als Warnung ausgeben.

## 0.8 – 2026-10-23 (AP7: Website-Modus; Korrekturen aus Import-Test 3)

- Korrekturen aus Import-Test 3 (0.7):
  - Kachelbilder ohne Text: `scripts/banner.py --kachel` rendert 900 × 600 (etwa 3:2, `format_tiles` schneidet auf die
    Kachel zu) mit eigenem Motiv je Abschnitt in der Banner-Palette (`gen/render.kachel_html`, Motiv mittig),
    `--nummer 1-8 --out …/kachel{n}.png` rendert alle in einem Aufruf, `--farbe` auch als Komma-Liste.
  - Kursbild (overviewfiles) ohne Text, die Plattform legt den Kursnamen darüber; `--mit-text` nur noch für Banner im
    Abschnitt. Fehlt `kursbild:`, dient das Bild des Banner-Elements als Kursbild (stand schon in intake.md, war nicht
    gebaut).
  - Regel in SKILL.md, intake.md §2/§4, kursdatei.md §2/§4: Kachel- und Kursbild ohne Text, Abschnittstitel im
    Kachelformat höchstens etwa 35 Zeichen, Banner mit Text nur im Abschnitt. `check.py` warnt bei längeren
    Kacheltiteln und bei Kachelbildern fern von 3:2.
  - `alltagskompetenz`: `kurs.png` textfrei neu gerendert, Willkommensbild mit Text als `start.png`, `kachel1–8.png`
    neu (je Themenfeld Motiv und Farbe), Themenfeld-Titel unter 35 Zeichen.
  - Glossar: `users=0` ist Standard, `build.py --mit-nutzerdaten` optional (statt `--ohne-nutzerdaten`); fester Schritt
    nach dem Import „Glossar → Mehr → Einträge importieren → `<kurs>_glossar.xml`“, `build.py` nennt die Datei.
    `check.py` warnt bei `users=1`, nicht mehr bei Glossareinträgen mit `users=0`.
- AP7 Website-Modus: ein Abschnitt als eine HTML-Datei (`mod_resource`, `index.html`), eingebettet (Standard), Vollbild
  oder neues Fenster (Pop-up). Einschalten mit `kurs.website` im Steckbrief, `website:` am Abschnitt oder
  `build.py --website [anzeige]`; die Kursdatei bleibt gleich. `gen/website.py` setzt die Elemente um: Startseite mit
  Kopf (Banner oder Kursbanner-Bild), Ablauf (Überblick) und Kapitelliste; Kapitel aus Textfeld, Seite, Lesebuch (je
  Seite), Quiz, Zuordnen (Auswahllisten), Lückentext, Lernkarten (umdrehen), Geschichte (Szenen und Entscheidungen),
  Video/Link; Unterabschnitte als Kapitelgruppen. Übungen mit Prüfen, Rückmeldung je Antwort, „Lösung zeigen“ und
  Zähler, ohne Bewertung. Navigation mit Fortschritt (localStorage, geht auch ohne), am Handy hinter „Inhalt“.
  Seite und Skript in `scripts/templates/website.html`, ohne externe Quellen; Bilder einmal als data-URI.
  Bewertete Teile bleiben Aktivitäten: Moodle-Module, Umfragen, Badge-Voraussetzungen (automatisch) und Elemente mit
  `website: nein`. Die HTML-Datei liegt als Vorschau neben der `.mbz` (`<kurs>_website.html`).
- Parser: `frage_daten()` und `_story_daten()` trennen Lesen und Bauen, H5P und Website nutzen dieselben Daten
  (Sicherungen ohne Website inhaltsgleich, geprüft mit `mbz_diff.py`). `Resource` kennt `display` (auto, embed, open,
  popup) und die passenden `displayoptions`.
- `check.py`: Website-Dateien (Anzeige 0/1/5/6, keine externen Skripte oder Stile, jedes Bild im Bilderverzeichnis der
  Seite, Warnung über 15 MB).
- Tests: `test_website.py` (neu) baut netzwerk9 und alltagskompetenz als Website und klickt bei 390 und 1280 px
  Navigation, Fortschritt, Quiz (falsch/richtig, Lösung zeigen, Zähler), Zuordnen, Lernkarten, Markieren, Lückentext,
  Geschichte und das Handy-Menü durch, prüft „keine Anfrage nach außen“ und gesetzte Bilder. `test_check.py`: beide
  Website-Builds OK, zwei neue Fehlerfälle (Bild fehlt, externe Quelle), Warnungen für users=1 und Kacheltitel.
  `test_kursdatei.py`: drei neue Fehlerfälle zu `website:`.
- `tools/jsprobe`: Sicherung für den Fünf-Minuten-Test (läuft JS im Textfeld? in einer eingebetteten Website?).
- Doku: kursdatei.md §2/§7a/§8, intake.md §2/§4/§6/§7, spec.md (resource, Glossar), SKILL.md (Bau, Lieferung,
  Grenzen), README (Tabelle, Status, Website-Variante mit Screenshot `docs/website-netzwerk9.png`), ROADMAP Punkte 3, 6, 7.
- Offen: Import-Test durch den Autor für den Website-Modus (eingebettet, Vollbild, Pop-up; Höhe des Rahmens, Fortschritt
  im Rahmen), JS-Probe (`tools/jsprobe`), die neuen Kachelbilder und `users=0` mit XML-Import. Ergibt die Probe, dass
  Textfelder JS ausführen, kommt der zweite Weg (One-Page im Textfeld) dazu. Eigene Spiele und Simulationen als
  Vorlagen nach 1.0.

## 0.7 – 2026-10-23 (AP6: Kursformate; Glossareinträge beim Import)

- Glossar-Fehler aus Import-Test 2 (0.6): Moodle stellt Glossareinträge nur mit Nutzerdaten wieder her
  (`restore_glossary_stepslib.php`, `if ($userinfo)`), die Sicherung hatte `users=0`. Beide Wege gebaut:
  (A) `moodle_backup.xml` mit `users=1`, `userinfo=1` nur für Glossare mit Einträgen, ihren Abschnitt und bei
  Unterabschnitten die Kette darüber (sonst sperrt Moodle das Modul-Setting), alle anderen Module `userinfo=0`, leere
  `users.xml`, Einträge `userid 0`. Gegen den Moodle-Quellcode (5.0) geprüft: die Vorprüfung lädt `users.xml` nur bei
  `users=1` und findet keine Nutzer; fehlt der Lehrkraft `moodle/restore:userinfo`, setzt `restore_check` das Setting
  auf 0 statt abzubrechen, dann fehlen die Einträge und (Abhängigkeit `users → badges`) auch die Badges.
  (B) `gen/mbz.py glossary_import_xml()`: je Glossar eine Moodle-Glossar-XML (`GLOSSARY/INFO/ENTRIES/ENTRY`, Aliasse)
  neben der `.mbz` (`<kurs>_glossar.xml`) für Glossar → Mehr → Einträge importieren; `build.py` nennt den Weg.
  `build.py --ohne-nutzerdaten` baut (A) ab. `check.py` prüft `users`/`userinfo` (users.xml vorhanden, Kette
  Abschnitt → Unterabschnitt-Modul) und warnt (`WARNUNG`, Exit 0) bei Einträgen mit `userinfo=0` sowie bei `users=1` mit Badges.
- AP6 Kursformate: Steckbrief `kurs.format` themen, kacheln, wochen, einthemen, komprimiert, einzelaktivitaet (oder
  Moodle-Name; `build.py --format` überschreibt). `course.xml` bekommt `<format>` und die `courseformatoptions` je Format
  mit den Plattformstandards aus `references/formate.md` (`kurs.formatoptionen` überschreibt einzelne Werte),
  `moodle_backup.xml` das passende `original_course_format`. Kacheln: `basecolour` = nächste Plattformfarbe zur
  Akzentfarbe, `courseshowtileprogress 1`; je Abschnitt `kachelbild:` (PNG aus `assets/`, Datei `format_tiles/tilephoto/`
  im Kurskontext, `plugin_format_tiles_section` + `course_format_options` nach `export-schemata/kachelformat/`,
  fileref in der inforef des Abschnitts) und `kachelicon:` (FontAwesome-Name, nur `course_format_options`); auch im
  Steckbrief unter `teile.<teil>`. Wochen zählen ab `kurs.start`. Einzelaktivität: genau ein Element, landet in
  Abschnitt 0, `activitytype` = sein Modul; mehr Elemente brechen den Bau ab. Der 0.4-Hinweis „Format vorgemerkt“ entfällt.
- `check.py`: Kursformat bekannt, Formatoptionen mit passendem Format, Kacheloptionen nur im Kachelformat und nur an
  regulären Abschnitten, Kachelbild als Datei mit Kurs-Kontext/itemid/filepath und fileref aus der Abschnitts-inforef,
  Einzelaktivität (eine Aktivität in Abschnitt 0, activitytype); Abschnitts-inforefs werden jetzt mitgeprüft.
  `check_mbz()` gibt zusätzlich die Warnungen zurück.
- Beispiele: `alltagskompetenz` im Kachelformat mit Kachelbild je Themenfeld, `netzwerk9` mit `kachelbild:` (wirkt nur
  bei `--format kacheln`). Tests: `test_check.py` baut netzwerk9 in jedem Format, `module` mit und ohne Nutzerdaten
  (Warnung erwartet), prüft den Abbruch der Einzelaktivität und fünf neue Fehlerfälle (Formatoption mit fremdem Format,
  Kachelbild ohne Datei, Kacheloption im Themenformat, users.xml fehlt, Glossar-userinfo ohne Abschnitts-userinfo);
  `test_kursdatei.py` zwei neue Fehlerfälle (Kachelbild fehlt, Icon-Name).
- Doku: `formate.md` (Umsetzung, Import-Regeln: `course.xml` nur mit „Kurseinstellungen überschreiben: Ja“,
  Abschnittsoptionen nur bei gleichem Format), `spec.md` §A/§B.1/§D/§E/§G/§H/§N, `kursdatei.md` §1/§2/§7/§8,
  `intake.md` §2/§6/§7, SKILL.md (Bau, Lieferung, Grenzen), README (Tabelle, Status, Nach dem Import).
- Offen: Import-Test durch den Autor für Kacheln (Kachelbild, Icon, `basecolour`), Wochen, Ein-Themen, Komprimiert,
  Einzelaktivität sowie Weg (A) beim Glossar (ob die Plattform Lehrkräften `moodle/restore:userinfo` gibt). Das Kachel-Icon
  ist nur aus dem Mechanismus abgeleitet (kein Export mit Icon); die Plugin-Quelle von `format_tiles` war nicht
  erreichbar. Lernlandkarte und Mimo nach 1.0.

## 0.6 – 2026-10-23 (AP5: Moodle-Module Test, Aufgabe, Datei, Verzeichnis, Forum, Buch, Abstimmung, Glossar)

- Acht Generator-Klassen in `scripts/gen/mbz.py` nach den Schemata in `references/export-schemata/aktivitaeten/`:
  `Quiz` (Test, mit Fragensammlung in `questions.xml`: Kategorien `top` und „Standard für <Test>“ im Modulkontext,
  `question_bank_entry`/`question_versions`/`question`, Fragetypen Multiple Choice, Wahr/Falsch, Kurzantwort; Verweise
  per `question_reference` in `quiz.xml`, `question_categoryref` in `inforef.xml`, Bewertungsposten), `Assign` (Aufgabe
  mit Text- und/oder Dateiabgabe, Bewertung, Fälligkeit), `Resource` (Datei), `Folder` (Verzeichnis), `Forum`, `Book`
  (Buch mit Kapiteln und Unterkapiteln, Bilder je Kapitel), `Choice` (Abstimmung), `Glossary` (Glossar mit Einträgen und
  Aliassen). Dateien beliebigen Typs (PDF, Office, Audio) mit Mimetype nach Endung; neue Abschlussarten `post` (Forum)
  und `entry` (Glossar).
- Kursdatei-Syntax für jeden Typ (`references/kursdatei.md` §2, §3, §5a, §6a): `Test` mit nummerierten Fragen (MC, RF,
  `Kurzantwort: Frage? · Antwort · Alternative`), `Aufgabe` (`abgabe`, `bewertung`, `bestehen`, `fällig`), `Datei`
  (`datei:`), `Verzeichnis` (Liste), `Forum` (`typ`), `Buch` (`Kapitel:`/`Unterkapitel:`), `Abstimmung` (Liste,
  `mehrfach`, `ergebnisse`), `Glossar` (Tabelle oder `- Begriff → Erklärung`). Abschlussarten je Typ geprüft
  (`beitrag`, `eintrag`, `abgabe`, `bestehen`). Hinweise Quiz vs. Test und Lesebuch vs. Buch in `kursdatei.md`.
- `scripts/check.py` prüft die neuen Module: Dateibereiche (`mod_resource/content` genau eine Datei, `mod_folder/content`,
  `mod_book/chapter` je Kapitel mit `@@PLUGINFILE@@`-Abgleich, `intro` für alle), Test (Fragenverweise gegen
  `questions.xml`, Kategorie im Modulkontext des Tests und in `question_categoryref`, Slots fortlaufend, `sumgrades`,
  Bewertungsposten passend zu `grade`, `gradepass` bei Abschluss „bestehen“, Fragetypen mit Antworten), Aufgabe
  (Bewertungsposten), Abstimmung (mindestens zwei Optionen), Glossar (`approved`/`teacherentry`), verwaiste Kategorien.
- Beispielkurs `examples/module/` (Sichere Passwörter, ein Abschnitt mit allen acht Modulen; PDFs und Bild selbst erzeugt
  mit `make_assets.py`). Tests: `test_kursdatei.py` (15 neue Fehlerfälle, Parsing aller Typen), `test_check.py`
  (Modulbeispiel plus sechs absichtliche Fehler: Fragenverweis ins Leere, Kategorie in fremdem Kontext, `sumgrades`,
  Kapitelbild, Datei ohne Inhalt, Bewertungsposten).
- Doku: `spec.md` §B.1, §G (acht Module), §G.2 (Fragensammlung), §H (Dateibereiche), `intake.md` §5, `SKILL.md`
  (Modulwahl, Grenzen, Beispiele), README-Tabelle.
- Offen: Import-Test des Modulbeispiels auf der Plattform durch den Autor. `questions.xml` ist aus dem Backup-Code von
  Moodle 4.x/5.x abgeleitet (der exportierte Testkurs enthielt keine Fragen); Glossar-Einträge ohne Nutzerdaten
  (`teacherentry 1`, `userid 0`) und Buchkapitel sind ebenfalls noch nicht per Import belegt. Im Test nur drei Fragetypen,
  keine Zeitlimits; Forum ohne Diskussionen; Verzeichnis ohne Unterordner.

## 0.5 – 2026-10-23 (AP4: Designvorlagen, Textbausteine, Render-Test)

- Drei Designvorlagen als Token-Sätze in `scripts/gen/html.py` (`VORLAGEN`: Farben, Rundung, Abstände, Kartenform,
  Schriftgrößen): `schlicht` (Standard: weiße Karten, Haarlinien), `kacheln` (getönte Flächen in der Akzentfarbe, stärkere
  Rundung), `magazin` (keine Rundung, Linien statt Flächen, mehr Weißraum, Merkkasten als Rahmen). Wahl im Steckbrief
  `design.vorlage`, Entwickler: `build.py --vorlage`. Alle Bausteine lesen die Tokens beim Aufruf; die Kursdatei enthält
  keine Gestaltungsangaben, Emojis bleiben aus.
- Textbausteine für Lesetexte: `Überschrift:`, `Hervorhebung:`, `Schritte:` (Nummern im Kreis), Vergleichstabelle mit
  Kopfzeile (`|---|---|`, beliebig viele Spalten), `Bild: datei | Alt | Unterschrift`, Inline `==markiert==`. Fehler bei
  Tabellen mit ungleichen Spalten oder mehr als zwei Spalten ohne Kopfzeile. Regel in `intake.md` §5: Baustein je Textsorte,
  kein Absatz länger als fünf Zeilen auf dem Handy.
- Überblickskarte ohne Titel und Untertitel, wenn der Kurs ein Banner hat (Import-Test 1: Banner und Karte zeigten beides
  doppelt); sie trägt dann nur Dauer und Phasen.
- Render-Test `scripts/tests/render_vorlagen.py`: Kursseite von `examples/netzwerk9` und eine Bausteinseite je Vorlage bei
  390 und 1200 px als PNG (Playwright, Theme-Rahmen um `<td>` nachgebildet); Ergebnis in `examples/netzwerk9/out/`, nicht
  committet. Regressionstest um Bausteine, Banner-Karte und Vorlagen ergänzt.
- Doku: `kursdatei.md` §4/§7, `intake.md` §2/§5/§6, SKILL.md (Gestaltungsregel), spec.md §K, README (Tabelle, Status).
- Offen: Abschnitts- und Kachelbilder (AP6); Rendertest nur mit nachgebildetem Theme, Abnahme der Vorlagen auf der Plattform
  durch den Autor; Lesebuch-Bilder weiter ohne Unterschrift (H5P.Image kennt keine).

## 0.4 – 2026-10-23 (AP3: Menüführung, Formatfrage, Selbstabfrage, Kursbanner)

- Einstieg neu: erste Nachricht „Womit starten wir?“ mit fünf Wegen (nur Thema, Material, Material + Fragen, Fragen,
  bestehenden Kurs erweitern), Steuerungsgrad mit Vorschlag aus dem Weg, Rahmen in einem Satz. Danach höchstens eine
  Fragerunde; jede Frage hat einen Vorschlag, bei „nur Thema“ gibt es keine Rückfrage (`Angenommen:`-Zeilen im Drehbuch).
  `references/intake.md` §0–§4 neu geschrieben, Steckbrief um `weg`, `format`, `assistent`, `bilder`, `angenommen` ergänzt.
- Formatfrage früh und ausdrücklich, mit Empfehlung je Kurstyp (Selbstlernkurs → Kacheln, Wochenplan → Wochen,
  Materialsammlung → Themen, einzelner Test oder Forum → Einzelaktivität); die Lehrkraft entscheidet. Bis AP6 baut der
  Generator Themen und meldet ein vorgemerktes anderes Format als Hinweis (Umstellung in den Kurseinstellungen).
- Selbstabfrage des Assistenten am Anfang von `SKILL.md` (Code ausführen, Dateien lesen, Bilder erzeugen) mit Folgen je Antwort.
- Kursbanner: neues Element `### Banner:` (Bild + Titel + ein Satz, Bild optional) als erstes Element in `## Allgemeines`,
  Baustein `banner()` in `scripts/gen/html.py`. Bilder nach `intake.md` §4: selbst erzeugt, mit `scripts/banner.py`
  gerendert (textfrei, Akzentfarbe, Playwright; `CHROMIUM_PATH` für ein vorhandenes Chromium) oder per `Bildwunsch:`-Zeile
  von der Lehrkraft. `examples/netzwerk9` hat ein Banner.
- Offen: Abnahme „nur Thema → Drehbuch ohne Rückfrage“ mit einem Fremdmodell (AP9); Kachelformat und Abschnittsbilder (AP6);
  README-Versionszeile wird mit AP2 zusammengeführt.

## 0.3 – 2026-10-23 (AP2: Prüfskript, site.json entfernt)

- `scripts/check.py <datei.mbz>` prüft eine Sicherung vor dem Import: Archiv (tar.gz, `.ARCHIVE_INDEX`), Pflichtdateien,
  alle XML wohlgeformt, `moodle_backup.xml` gegen die Ordner und Settings, Abschnittsnummern fortlaufend und IDs eindeutig
  (cmid, contextid, Instanz, Datei, Bewertungsposten), `sequence`/`sectionid`/Unterabschnitte konsistent, jede
  `files.xml`-Zeile mit Datei unter `files/xx/<sha1>` (Hash und Größe), jede Datei von einer `inforef.xml` referenziert
  und in ihrem Inhalt verwendet (`@@PLUGINFILE@@` in Textfeld/Seite, `images/` in `json_content`), `inforef`-Verweise auf
  Dateien und Bewertungsposten, H5P-Bibliotheksversionen aus `gen/libs.py` (Hauptbibliothek und alle Unterinhalte),
  `json_content` gültig, `subContentId` eindeutig, Badges (Bild, Kriterien), Verfügbarkeits-JSON.
  Ausgabe `OK …` oder Zeilen `FEHLER <wo>: <was>`, Exit-Code 1. `build.py` ruft die Prüfung nach jedem Bau auf
  (`--no-check` schaltet sie ab); eine fehlerhafte Sicherung bleibt zur Fehlersuche liegen, der Bau endet mit Exit 1.
- `scripts/site.json` entfernt. Die Herkunftsangaben der Sicherung (Site-Hash, Kurs-ID, Kontext, Kategorie, Zusatzfelder)
  sind feste Platzhalter in `gen/mbz.py`; beim Import in einen bestehenden Kurs sind sie ohne Bedeutung (belegt 2026-10-23).
  Die erzeugten Sicherungen sind mit dem 0.2-Build inhaltsgleich (`mbz_diff.py`).
- `scripts/tests/test_check.py`: vier Builds (netzwerk9 Vollkurs und Prototyp, alltagskompetenz Vollkurs und Delta) melden
  OK; zehn absichtlich eingebaute Fehler werden gefunden (fehlende Datei, falscher Hash, kaputtes `json_content`, falsche
  Bibliotheksversion, fehlender Aktivitätsordner, Bild ohne `files.xml`-Zeile, fehlender `fileref`, ungültiges
  Verfügbarkeits-JSON, doppelte Abschnittsnummer, nicht wohlgeformtes XML) sowie eine Datei, die kein Archiv ist.
- Doku: SKILL.md (Prüfung vor Lieferung, Dateien), spec.md §B.1/§M/§N, README, intake.md §7, ROADMAP ohne `site.json`.
- Offen: `check.py` kennt nur die Dateibereiche der bisherigen Module (intro, page/content, hvp/content, Kursbild, Badge);
  neue Modultypen (AP5) brauchen dort einen Eintrag. Geprüft wird die Struktur, nicht der Inhalt (Drehbuch-Prüfung bleibt
  der zweite Lauf). Import-Test einer aus `kurs.md` gebauten Sicherung auf der Plattform steht weiterhin aus.

## 0.2.1 – 2026-10-23

- Umbenennung in „Kursmühle“ (Repo `kursmuehle`, Skill-Name `kursmuehle`); Logo, Wortmarke und Banner in `docs/`;
  Versionsnummer oben in der README.

## 0.1 – 2026-10-23

Erste Fassung (Tech-Demo).

- Generator für ByCS-Lernplattform-Sicherungen (Moodle 5.2, mod_hvp): Abschnitte, Unterabschnitte, Textfelder, Seiten,
  Links/Videos, Feedback, Badges, Abschlussverfolgung; H5P-Typen Interactive Book, Branching Scenario, Question Set,
  Drag and Drop, Fill in the Blanks, Dialog Cards (mit Fotos) plus Bausteine Text, Bild, Multiple Choice, True/False,
  Drag the Words, Mark the Words, Summary, Single Choice Set.
- Etappen: `--delta` (Nachlieferung per „Zusammenführen“, verifiziert) und `sichtbar_ab` (Datums-Zugriffsbeschränkung).
- Agenten-Spezifikation (`references/spec.md`), H5P-Vorlagen mit deutschen UI-Strings, XML-Skelette, Intake-Leitfaden
  mit Drehbuch-Format (Quellenmarkierung, Zeitcheck, Änderungsliste, „erst Input, dann Kontrolle“).
- Zwei Beispielkurse: `alltagskompetenz` (groß) und `netzwerk9` (eine Einheit, Rhythmus Lesen → Üben → Sichern).

Bekannte Lücken: nur Kursformat „Themen“; keine Moodle-Tests/Aufgaben/Foren; Drehbuch wird noch von Hand in
`content/` übertragen (Parser geplant); H5P direkt im Textfeld (Kern-H5P-Filter) ungetestet.

## 0.2 – 2026-10-23 (AP1: Kursdatei statt Python)

- Das Drehbuch ist die Kursdatei: `kurs.md` im Kursordner wird von `scripts/build.py` direkt gelesen
  (`scripts/gen/kursdatei.py`). Fremde Assistenten schreiben keinen Python-Code mehr. Format: `references/kursdatei.md`
  (vollständig), `references/intake.md` §5 (eine Seite). Quellen-, Zeit- und Bezugsmarker (`[Quelle: …]`, `[KI]`,
  `(← S2)`, `· 4 min`) ignoriert der Parser; sie landen nie im Kurs.
- Elementtypen in der Kursdatei: Textfeld, Seite, Überblick, Link/Video, Lesebuch (mit MC, RF, Einsetzen, Markieren,
  Lückentext, Aussagen, Schnellquiz, Bild), Quiz, Zuordnen, Lernkarten, Geschichte, Lückentext, Umfrage, Badge,
  Unterabschnitt; `sichtbar ab`, `teil` (Delta), `prototyp: nein` (`--proto`), Bilder per Dateiname aus `assets/`.
- Fehlermeldungen nennen Datei, Zeile und Element; unbekannte Typen, Angaben, Bilder, Zonen und Sprungziele brechen ab.
- HTML-Bausteine aus den Beispielen (`common.py`, `cards.py`) liegen jetzt im Generator (`scripts/gen/html.py`);
  Kursordner brauchen nur noch `kurs.md`, `assets/`, `steckbrief.yaml`. Python-Inhalt (`content/course.py`) bleibt als Ausweg.
- Beide Beispielkurse auf `kurs.md` umgestellt. Abnahme: Vollkurs, Prototyp und Delta beider Kurse sind mit dem bisherigen
  Build inhaltsgleich (`scripts/tests/mbz_diff.py`, Vergleich ohne IDs/Zeitstempel/UUIDs); einzige Abweichung: Delta-Abschnitte
  von Unterabschnitten heißen jetzt wie der Unterabschnitt, ohne das hart codierte „TF 1 ·“ des alten Demo-Skripts.
- `scripts/tests/test_kursdatei.py`: Regressionstest (14 Fehlerfälle, Beispiele bauen). `build.py` rendert keine Bilder mehr
  (`--no-render` bleibt als Leerflag); Banner des Demo-Kurses: `examples/alltagskompetenz/render_assets.py`.
- Offen: Rückmeldung „nicht gewählt“ bei MC, Bilder in Szenen, Buchdeckel, Tipps (siehe `kursdatei.md` §8); Import-Test
  der aus `kurs.md` gebauten Sicherung auf der Plattform steht aus (inhaltsgleich mit dem importierten 0.1-Build).

## 0.1.1 – 2026-10-23

- Lizenz festgelegt: Code PolyForm Noncommercial 1.0.0, Texte/Vorlagen/Beispiele CC BY-NC-SA 4.0.
- README überarbeitet (Mehrwert und Nutzung am Anfang, Lektorat), ROADMAP.md mit der Definition von 1.0.
- `tools/h5ptest/`: H5P-Render-Test (extract, fetchlibs, buildpages, render) aus der Entwicklung übernommen.
- `references/formate.md` (alle acht Kursformate mit Optionen, 39 Modultypen), `references/export-schemata/` (29 Modulschemata, Kachelformat), `CLAUDE.md` und `arbeitspakete/AP1–AP9` für die Arbeit an 1.0; `site.json` als überflüssig belegt.
