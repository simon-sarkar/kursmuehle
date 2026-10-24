# Gutachten AP13: Landingpage, Impressum, Testauftrag, README (2.0.0-b1)

Datum: 24.10.2026
Geprüft: `docs/index.html` (sichtbarer Text, `alt`, `meta description`, `title`, HTML und CSS), Textvergleich mit
`docs/entwicklung/entwuerfe/landing-b.html`, `docs/impressum.html`, `docs/entwicklung/protokolle/testauftrag-beta.md`,
`README.md` (Absatz unter der Hauptüberschrift, Zeile „Stufen: …“, Punkt „Lehrkräfte mit ByLKI oder AIS-Chat“,
Kasten „Projektstatus“, Zeile „Browser-Fassung …“ der Tabelle; übriger Text nur bei Widerspruch).
Gutachter: unabhängiger Gutachter, Subagent der Opus-Klasse, ohne Kenntnis des Baus.

Maßstäbe: Markerliste in `references/qualitaet.md` (sinngemäß), `AGENTS.md` (Kein Slop, Plattformname, keine
personenbezogenen Daten, Belegbarkeit), Du-Form zur Lehrkraft und Ich-Form für den Autor, `docs/entwicklung/AP13.md`
§2 bis §5. Abgeglichen gegen `web/index.html`, `web/app.js`, `web/worker.js`, `web/vendor/`, `references/katalog.yaml`
(`chats:`), `docs/entwicklung/protokolle/` (`AP11_prompttest.md`, `chat-ohne-code/README.md`, `bylki.md`,
`import-test-2.0.md`), `LICENSE`, `LICENSE-DOCS.md`, `CHANGELOG.md`, `docs/make_logo.py`, `docs/logo.svg`.

Die Tabellen sind nach Gewicht geordnet: zuerst nicht belegte Behauptungen und Regelverstöße, dann Sprache.
„Grenzwertig“ steht dabei, wo die Regel nicht eindeutig greift.

## docs/index.html (Landingpage)

| Nr. | Stelle | Marker oder Regel | Vorschlag |
|---|---|---|---|
| 1 | „Für ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude und Gemini eingerichtet; in der Beta ist noch nicht jeder davon durchgetestet.“ | Nicht belegt. „Noch nicht jeder“ legt nahe, dass die meisten geprüft sind. Laut `AP11_prompttest.md` (Z. 4–5, 197–198) lief der Text der Mühle nur an Subagenten der Sonnet-Klasse in Claude Code, „kein echter Chat“; die Läufe in `chat-ohne-code/` (AIS-Chat, fobizz) prüften die 1.x-Laufzeitdateien, nicht den Text der Mühle; `bylki.md` ist leer. | „Eingerichtet für ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude und Gemini. Erprobt ist der Text bisher nur mit einem Claude-Modell; wie die anderen Chats antworten, soll die Beta zeigen.“ |
| 2 | Bild `landing-muehle.png`, `alt="Die Mühle nach dem letzten Schritt: …"` | AP13 §2 verlangt einen Screenshot des Ergebnisses auf der Lernplattform; das Bild zeigt Schritt 7 der Mühle. Bekannt (AP13 „Offen“: Screenshot liefert der Autor). `alt` und `figcaption` beschreiben das jetzige Bild zutreffend. | Sobald das Bildschirmfoto der Kursseite vorliegt, Bild tauschen, `alt` etwa „Kursseite auf der ByCS-Lernplattform nach dem Wiederherstellen: …“ (was zu sehen ist), `figcaption` „So sieht die Einheit im Kurs aus.“ |
| 3 | „Rückmeldungen lese ich unter kursmuehle@pm.me. Kursmühle ist ein privates, nicht kommerzielles Projekt von Simon Sarkar und gehört nicht zur ByCS-Lernplattform.“ | Anrede: erst „ich“, dann der Autor in der dritten Person; wer „ich“ ist, erfährt man erst danach. | „Ich, Simon Sarkar, betreibe Kursmühle privat und nicht kommerziell; sie gehört nicht zur ByCS-Lernplattform. Rückmeldungen lese ich unter kursmuehle@pm.me.“ |
| 4 | „Wer mit Claude Code, Codex oder einem Assistenten mit Code-Ausführung arbeitet, nimmt den Skill aus Version 1.“ | Anrede: unpersönlich statt Du. Inhaltlich: „nimmt“ klingt verpflichtend, die Mühle bietet aber ChatGPT und Claude selbst an (`katalog.yaml`, `chats:`). | „Arbeitest du mit Claude Code, Codex oder einem Assistenten mit Code-Ausführung, kannst du auch den Skill aus Version 1 nehmen.“ |
| 5 | CSS `.weiter a { … background: var(--weiss); border-radius: 12px; box-shadow: … }` neben `.kachel` | AP13 §2, eine Rahmung je Abschnitt. Grenzwertig: Hat die Mühle eine Einheit gesichert, stehen im Hero-Band zwei weiße, gerahmte Flächen übereinander. Ohne Sicherung ist es nur die Kachel. | `.weiter a` ohne `background` und `box-shadow`, nur Punkt und Text, wie in Entwurf B. |
| 6 | „Die Datei zum Wiederherstellen baut diese Seite in deinem Browser; was du eingibst, wird nicht hochgeladen.“ (ähnlich `meta description`: „die Datei baut die Seite in deinem Browser“) | Grenzwertig. „Diese Seite“ baut nichts, das tut die Mühle unter `start/`. „Was du eingibst“ landet über den Text für den Chat beim Chatanbieter, wenn auch durch die Lehrkraft selbst. Das Impressum sagt es genau, die Startseite nicht. | „Die Datei zum Wiederherstellen entsteht in deinem Browser; die Seite lädt nichts von dem hoch, was du eingibst.“ In der `meta description`: „…, die Datei entsteht in deinem Browser.“ |
| 7 | „Du fügst ihn in deinen Chat ein und die Antwort zurück in die Seite. Sie prüft jeden Baustein.“ | Sprache: „Sie“ am Satzanfang kann sich auf „die Antwort“ oder „die Seite“ beziehen (beide feminin) und erinnert kurz an die Sie-Form. | „… und die Antwort zurück in die Seite. Die Seite prüft jeden Baustein.“ |

Entwurf B (`landing-b.html`): Sichtbarer Text, `alt`, `title` und `meta description` sind wortgleich mit Entwurf A.
Nur die Stellung von `figcaption` im Quelltext unterscheidet sich (in B nach dem Ablauf); das ist Gestaltung, kein
Textunterschied. Fund 5 betrifft B nicht.

## docs/impressum.html

| Nr. | Stelle | Marker oder Regel | Vorschlag |
|---|---|---|---|
| 1 | „Dort bleibt sie, bis du sie mit „×“ verwirfst oder den Browserspeicher löschst; ich sehe davon nichts.“ und Tabellenzeile „im Speicher deines Browsers, bis du sie verwirfst“ | Nicht vollständig belegt. Der Autosave hat genau einen Platz (Schlüssel `aktuell`, `web/app.js` Z. 188–199). Eine neue Einheit überschreibt ihn (`einheitAnlegen` → `gehe` → `autosave`, Z. 561–569, 460–465). | Fließtext: „Dort bleibt sie, bis eine andere Einheit sie ersetzt, du sie mit „×“ verwirfst oder den Browserspeicher löschst; ich sehe davon nichts.“ Tabelle: „im Speicher deines Browsers, bis eine andere Einheit sie ersetzt oder du sie verwirfst“ |
| 2 | „Es gehört nicht zur ByCS-Lernplattform und hat keine Verbindung zu ihrem Betreiber.“ | Absolute Aussage. „Keine Verbindung“ ist weiter gefasst als nötig und schwer zu belegen; gemeint ist, dass Kursmühle kein Angebot des Betreibers ist. [Begründung bei der Einarbeitung gekürzt: Der ursprüngliche Satz enthielt Annahmen über die berufliche Tätigkeit des Autors; personenbezogene Angaben gehören nach `AGENTS.md` nicht ins Repo.] | „Es gehört nicht zur ByCS-Lernplattform und ist kein Angebot ihres Betreibers.“ |
| 3 | „Was du eingibst, verlässt deinen Rechner nicht: Es gibt keinen Server, der Eingaben annimmt, keine Formulare zum Absenden, keine Cookies und kein Tracking.“ | Absolute Aussage. Der Absatz darunter und die Tabelle („nach dem Einfügen beim Anbieter des Chats“) sagen selbst, dass Thema und Angaben über den Text für den Chat den Rechner verlassen, wenn auch durch die Lehrkraft. „Keine Formulare“: `web/index.html` Z. 43 hat ein `<form>`, dessen Absenden `app.js` Z. 492–493 abfängt. Gemeint ist das Richtige, gesagt ist es zu weit. | „Die Mühle schickt nichts, was du eingibst, an einen Server; es gibt keinen, der Eingaben annimmt. Sie setzt keine Cookies und hat kein Tracking. Die Seiten laden nichts von anderen Adressen.“ |
| 4 | Tabelle: „Antwort des Chats, hochgeladene Bilder“ | Wortwahl widerspricht der Startseite („wird nicht hochgeladen“) und Satz 2 der Datenschutzerklärung. Die Bilder werden nur im Browser verkleinert (`app.js` Z. 877) und gehen nirgends hin. Die Mühle selbst beschriftet den Knopf „Bild hochladen“; im Datenschutztext führt das Wort trotzdem in die Irre. | „Antwort des Chats, Bilder, die du an einer Karte einsetzt“ |
| 5 | „GitHub ist nach dem EU-US Data Privacy Framework zertifiziert.“ | Grenzwertig: Aus dem Repo nicht belegbar. Nach meiner Kenntnis trifft es zu, der Stand kann sich aber ändern. Firmenname formal „GitHub, Inc.“. | „Die Seiten liegen bei GitHub Pages (GitHub, Inc., USA). … GitHub nimmt nach eigener Angabe am EU-US Data Privacy Framework teil (siehe die Datenschutzerklärung von GitHub).“ Dazu ein Link auf die Datenschutzerklärung; ein Link lädt nichts. |
| 6 | „Code unter PolyForm Noncommercial 1.0.0, Texte und Vorlagen unter CC BY-NC-SA 4.0; der Wortlaut steht im Repository.“ | Unvollständig: Die Mühle liefert Pyodide (MPL 2.0, Python unter PSF-Lizenz), PyYAML (MIT) und tzdata (Apache 2.0) mit, siehe `web/vendor/LIZENZEN.md`. Die Datei wird mit `web/` veröffentlicht, das Impressum nennt die Fremdbestandteile aber nicht. | Anhängen: „Pyodide, PyYAML und tzdata, die die Mühle mitbringt, stehen unter ihren eigenen Lizenzen (Liste im Repository unter `web/vendor/LIZENZEN.md` bzw. `docs/start/vendor/LIZENZEN.md`).“ |
| 7 | „Mit Kursmühle erstellte Kurse gehören dir.“ | Grenzwertig: belegt durch `LICENSE-DOCS.md` („unterliegen keiner dieser Lizenzen“). „Gehören dir“ liest sich aber als Aussage über Rechte an Inhalten, die ein Chat geschrieben hat, und das geht über die Lizenz hinaus (AP13 §3: keine Rechtsberatung). | „Für Kurse, die du mit Kursmühle erstellst, gelten diese Lizenzen nicht.“ |

## docs/entwicklung/protokolle/testauftrag-beta.md

| Nr. | Stelle | Marker oder Regel | Vorschlag |
|---|---|---|---|
| 1 | Tabelle „Rückmeldungen“, Spalte „Import auf der Plattform“; der Text zum Versenden bittet nicht um einen Import | Widerspruch zwischen Auftrag und Auswertung. Der Import einer im Browser erstellten Datei ist offen (README „Noch nicht“, `import-test-2.0.md` ohne Ergebnis), die BdBs wären die ersten, die ihn machen könnten. | Im Text ergänzen: „Wenn du magst, stell die Datei in einem leeren Testkurs wieder her und schreib dazu, ob sie läuft.“ Oder die Spalte streichen. |
| 2 | „(der Schritt „Rückmeldung“ am Ende der Seite kopiert sie dir mit Version und Chat als Text)“ | Nicht ganz belegt. Der Schritt „Rückmeldung“ erscheint erst, wenn die Datei erstellt ist (`app.js` Z. 446). Wer vorher stockt, und gerade danach fragt Frage 1, findet ihn nur über „Rückmeldung“ in der Fußzeile der Mühle (`web/index.html` Z. 299). Der vorbereitete Text (`app.js` Z. 1651–1656) hat keine Zeile für die Zeit, und „kopiert sie dir“ bezieht sich auf die Antworten, kopiert werden aber die Fragen. | „Unter „Rückmeldung“ (am Ende der Seite oder unten in der Fußzeile) steht ein Text mit Version, Chat und den drei Fragen zum Kopieren; die Zeit trägst du selbst ein.“ |
| 3 | Absatz „Kursmühle macht aus einem Thema … als Text):“ | Langer Absatz (86 Wörter). Die Semikolons halten die Zahl der Sätze bei drei, machen sie aber lang. | In drei kurze Absätze teilen, Wortlaut siehe Fund 4 und 2: (1) was Kursmühle macht, (2) Auftrag mit Zeitmessung, (3) Rückmeldung und Fragen. |
| 4 | „den Inhalt schreibt der Chat, den du schon nutzt, die Datei baut die Seite in deinem Browser“ | Sprache: Nach dem Relativsatz liest sich „die Datei baut …“ zuerst als dessen Fortsetzung. | „Kursmühle macht aus einem Thema eine Einheit für die ByCS-Lernplattform; den Inhalt schreibt dein Chat, die Datei entsteht in deinem Browser.“ |

Vorschlag für den ganzen Text zum Versenden (Funde 1 bis 4):

> Hallo,
>
> https://kursmuehle.de
>
> Kursmühle macht aus einem Thema eine Einheit für die ByCS-Lernplattform; den Inhalt schreibt dein Chat, die Datei
> entsteht in deinem Browser.
>
> Nimm ein Thema aus deinem Fach, das du demnächst brauchst, und geh ohne Anleitung bis zur heruntergeladenen Datei;
> miss die Zeit vom ersten Klick bis zum Download.
>
> Schick mir die Zeit und deine Antworten an kursmuehle@pm.me. Unter „Rückmeldung“ (am Ende der Seite oder unten in der
> Fußzeile) steht ein Text mit Version, Chat und diesen Fragen zum Kopieren:
>
> 1. Wo hat es gestockt?
> 2. Was hättest du anders gewollt?
> 3. Nutzt du es nächste Woche wieder?
>
> Wenn du magst, stell die Datei in einem leeren Testkurs wieder her und schreib dazu, ob sie läuft. Bitte keine
> Schülerdaten und keine Namen ins Material. Danke,
> Simon

## README.md

| Nr. | Stelle | Marker oder Regel | Vorschlag |
|---|---|---|---|
| 1 | Badge `![Status: Release](docs/badge-status.svg)` direkt neben „Version 2.0.0-b1“ | Widerspricht der Zeile „Stufen“ (2.x Beta) und dem Kasten „Projektstatus“. Der Text steht fest in `docs/make_logo.py` Z. 120. | `badge("Status", "Beta", …)` in `make_logo.py`, Alt-Text „Status: Beta“; oder den Status-Badge streichen, die Stufen-Zeile sagt es genauer. |
| 2 | Projektstatus: „2.x die Browser-Fassung für alle Chats (Beta)“ | Absolute Aussage, nicht belegt: eingerichtet sind sieben Chats und „Anderer Chat“, erprobt nur ein Claude-Modell (`AP11_prompttest.md`). | „2.x die Browser-Fassung für Chats ohne Code-Ausführung (Beta)“ |
| 3 | Absatz oben: „kopierst den Text in deinen Chat (ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude oder Gemini)“ | Wie Landingpage Fund 1: Die Aufzählung liest sich als geprüft. | „kopierst den Text in deinen Chat (eingerichtet für ByLKI, fobizz, AIS-Chat, MUCGPT, ChatGPT, Claude und Gemini; erprobt bisher mit einem Claude-Modell)“ |
| 4 | Tabelle, Zeile „Browser-Fassung“, Spalte „Noch nicht“: „Test mit ByLKI, fobizz, AIS-Chat“ | Zu eng. Auch MUCGPT, ChatGPT, Gemini und Claude im eigenen Chatfenster sind mit dem Text der Mühle nicht erprobt. | „Test des Textes in den Chats selbst (bisher nur ein Claude-Modell als Ersatz, siehe `AP11_prompttest.md`)“ |
| 5 | „Drei Wege“: „Lehrkräfte mit ByLKI oder AIS-Chat: Diese Angebote führen keinen Code aus. Für sie ist die Fassung im Browser gedacht …“ | Widerspricht dem Absatz oben und dem Projektstatus: Danach geht die Mühle auch mit fobizz, MUCGPT, ChatGPT, Claude und Gemini. Der Punkt „ChatGPT oder Claude“ bietet nur das Skill-Zip an. | Überschrift des Punkts: „Lehrkräfte mit ByLKI, fobizz, AIS-Chat, MUCGPT oder einem anderen Chat:“. Im Punkt „ChatGPT oder Claude“ am Anfang: „Die Fassung im Browser geht mit diesen Chats ebenfalls; mit Code-Ausführung geht auch der Skill:“ |
| 6 | Projektstatus: „Kein offizielles Produkt der Plattform; wenn sich die Lernplattform ändert, wird der Skill angepasst.“ | Versprechen ohne Beleg; Passiv, wo die Ich-Form passt. | „Kein offizielles Produkt der Plattform. Ändert sich die Lernplattform, kann ein Import scheitern, bis ich den Skill angepasst habe.“ |
| 7 | Kasten „Projektstatus“ (rund 140 Wörter in einem Absatz) | Langer Absatz. | Als Liste: „- Stufen: …“, „- Getestet: …“, „- Import getestet: …“, „- Nicht per Import geprüft: …“, „- Kein offizielles Produkt …“. |
| 8 | Tabelle, Zeile „Browser-Fassung …“, Spalte „Kann“ (rund 250 Wörter in einer Zelle) | Grenzwertig, langer Absatz: Die Kann-Tabelle ist nach `AGENTS.md` gewollt, die Zelle ist auf dem Handy aber nicht mehr lesbar. Die Angaben selbst sind belegt (1600 px, Gegenprüfen, „Alle leeren Bausteine“, Stückelung über `teil_bausteine`). | In drei Zeilen teilen: (a) Schrittfolge, Zweige, Vorlagen, Karten, Aussehen; (b) Text für den Chat, Antwort einfügen, Prüfung, Fragen und Lösungen, Minuten, Bild; (c) Kursdatei, Datei erstellen, Nachlieferung, Rückmeldung, Landingpage. |
| 9 | Absatz oben „Kursmühle läuft im Browser: … beschreibt den Skill für Assistenten mit Code-Ausführung und für Code-Agenten.“ | Grenzwertig, langer Absatz (rund 62 Wörter, knapp über der Grenze). | Den letzten Satz „Der Rest dieser README …“ als eigene Zeile absetzen. |

## Ohne Befund

- Plattformname: In allen vier Dateien steht nur „ByCS-Lernplattform“; „mebis“ kommt im README nur als „früher mebis“
  vor und in den anderen Dateien nicht.
- Personenbezogene Daten: nur Name und Anschrift des Autors im Impressum (gewollt) und die Projektadresse
  kursmuehle@pm.me; keine Schule, keine IDs, keine weiteren Namen.
- Anrede: durchgehend Du zur Lehrkraft. Keine Sie-Form, kein „wir“, kein „man“ in den geprüften Texten. Ich-Form im
  Impressum stimmig („ich sehe davon nichts“, „habe ich keinen Zugriff“, „bei mir“). Ausnahmen oben: Landingpage 3
  und 4, README 6.
- Marker: keine Ausrufezeichen (die `!` im README gehören zur Markdown-Bildsyntax), keine Emojis, keine rhetorischen
  Fragen (die drei Fragen sind Fragen der Rückmeldung), keine Werbesprache, keine Floskel-Überschriften („So läuft
  es“, „Mit Code-Agenten“, „Impressum“, „Datenschutz“, „Lizenz und Nennung“ sagen, worum es geht), keine
  Schlussformel (Gruß und „Danke“ in der Mail sind Briefform). Dreierreihen: „Thema, Jahrgangsstufe und Minuten“ sind
  die drei echten Felder und bestehen die Probe; ebenso „Claude Code, Codex oder einem Assistenten mit
  Code-Ausführung“. Doppelpunkte: die `figcaption` („Nach dem letzten Schritt: die Datei …“) setzt keinen ganzen Satz
  als Pointe; im Impressum-Satz 2 folgt auf den Doppelpunkt eine Begründung, keine Pointe nach einem Schlagwort. Kein
  Treffer, Fund Impressum 3 löst ihn ohnehin auf.
- Nichts von außen: `docs/index.html` lädt `logo.svg`, `wasserzeichen.svg`, `landing-muehle.png` relativ, die Schrift
  ist `system-ui`, die SVGs verweisen nur auf den SVG-Namensraum. `docs/impressum.html` lädt nur `logo.svg`. Die
  GitHub-Adressen sind Links, keine Ladevorgänge. Die Mühle (`web/index.html`, `worker.js`) lädt Pyodide, PyYAML und
  tzdata aus `vendor/pyodide/` (`indexURL` lokal, Räder in `pyodide-lock.json` vorhanden), `katalog.json` relativ;
  kein `fetch` nach außen, kein `sendBeacon`, keine Cookies, kein `localStorage`; die Messwerte (`messungen`) bleiben
  im Speicher der Seite. „Diese Seite setzt keine Cookies und lädt nichts von anderen Adressen“ und „Die Seiten laden
  nichts von anderen Adressen“ stimmen.
- „Weiter mit deiner Einheit“: Das Skript liest nur Datenbank `kursmuehle`, Speicher `mappe`, Schlüssel `aktuell`,
  bricht das Anlegen einer fehlenden Datenbank ab und passt zu `app.js` Z. 178–199 und `?weiter=1` (Z. 488–490).
- „Sie prüft jeden Baustein“ (Prüfung je Baustein mit Korrekturbitte), Autosave in IndexedDB, „×“ zum Verwerfen und
  Schließen (`web/index.html` Z. 17 und 34, `app.js` Z. 1367–1384), Rückmeldungstext ohne Thema und Inhalte
  (`app.js` Z. 1650–1656: Version, Chat, Fach, Jahrgangsstufe, Vorlage, drei Fragen), kein `mailto`: belegt.
- Chat-Liste auf Landingpage und im README deckt sich mit `katalog.yaml` `chats:` (dazu „Anderer Chat“).
- AP13 §2, Reihenfolge und Inhalt: Satz, was herauskommt (`h1`); Kachel mit quadratischem Logo und „Mahlwerk starten“,
  ganz klickbar, Ziel `start/`; „Weiter mit deiner Einheit“ über der Kachel; Bild; drei Zeilen Ablauf; Chat-Zeile;
  kleinere Agenten-Kachel mit Skill-Zip und Repository; Fußzeile mit Stufen, Lizenz, Impressum, Repository,
  Erfahrungen, Changelog; keine Richtwerte oder Protokolle auf der Seite. Abweichung nur beim Bild (Fund 2).
- AP13 §2, Gestaltung (A und B): keine Dreier-Kartenreihe, keine Farbkante, keine Badge-Pille („Kursmühle · Beta“ ist
  Fließtext), kein Icon-Raster, kein Gradient, keine gleich großen Flow-Boxen (Ablauf als nummerierte Liste ohne
  Rahmen), keine Feature-Liste. Bänder über die volle Breite, Inhalt 1040 px, Wasserzeichen rechts angeschnitten.
  Ocker in Ruhe an drei Stellen: Kachel (Logo enthält selbst Ocker, dazu der Strich unter „Mahlwerk starten“),
  Ziffern im Ablauf, Punkt vor „Weiter“. Grenzwertig: Der Fokusrahmen ist ebenfalls ockerfarben und gilt per
  `:focus-visible` für alle Links, nicht nur die Kachel, wie der Kommentar in Z. 11–12 sagt. Er erscheint nur bei
  Tastaturbedienung und dient der Zugänglichkeit; ich werte ihn nicht als vierte Stelle, der Kommentar sollte es aber
  richtig sagen.
- AP13 §3: Impressum mit Name, Anschrift, Adresse, „privates, nicht kommerzielles Projekt“; Datenschutz in
  verständlichen Sätzen; GitHub Pages mit Zugriffsprotokollen; Chat-Bedingungen; Datenfluss als Tabelle;
  Credits-Satz wörtlich wie verlangt; Lizenzhinweis. Nur über die Fußzeile verlinkt, von der Startseite nicht geladen,
  `noindex`. Keine Rechtsberatung, abgesehen von den Grenzfällen 5 und 7.
- AP13 §4/§5, Testauftrag: Link, Thema aus dem eigenen Fach, Zeit messen, die drei Fragen wörtlich, Hinweis auf keine
  Schülerdaten. Der Text hat vier statt drei Sätze; der vierte (Datenschutz) ist begründet, kein Fund.
- README: „Stufen“-Zeile stimmt mit `CHANGELOG.md` (1.0.3 vom 23.10.2026, 2.0.0-b1) und AP13 §5 überein;
  `releases/latest` bleibt 1.0.3, der Skill-Zip-Link auf der Landingpage passt dazu. „Diese Angebote führen keinen Code
  aus“ (ByLKI, AIS-Chat) deckt sich mit `bylki.md` und `chat-ohne-code/README.md`. Die Lizenzangaben auf Landingpage
  und Impressum entsprechen `LICENSE` und `LICENSE-DOCS.md`.

## Eingearbeitet (24.10.2026, AP13b)

Vom Bau eingearbeitet, danach `test_landing.py` erneut gelaufen und Screenshots neu aufgenommen.

| Datei | Fund | Umgesetzt |
|---|---|---|
| Landingpage (A und B) | 1, 3, 4, 6, 7 | wie vorgeschlagen; 6 auch in der `meta description` |
| Landingpage (A) | 5 | „Weiter mit deiner Einheit“ ohne Fläche und Schatten, nur Punkt und Text |
| Landingpage | Fokusrahmen (Ohne Befund) | Kommentar in A und B nennt den Fokusrahmen getrennt von den drei Ocker-Stellen |
| Landingpage | 2 | offen, bis der Autor das Bildschirmfoto der Plattform liefert (`AP13.md`, Offene Entscheidungen) |
| Impressum | 1 bis 7 | wie vorgeschlagen; zu 6 verweist der Link auf `docs/start/vendor/LIZENZEN.md` im öffentlichen Repository, weil GitHub Pages Markdown-Dateien umwandelt |
| Testauftrag | 1 bis 4 | der vorgeschlagene Text ganz übernommen |
| README | 1 | Badge „Status: Beta“ (`docs/make_logo.py`) |
| README | 2, 3, 4, 6, 9 | wie vorgeschlagen; 2 als „für Chats mit und ohne Code-Ausführung“, weil die Mühle auch ChatGPT und Claude anbietet |
| README | 5 | Überschrift des Punkts wie vorgeschlagen; im Punkt ChatGPT/Claude „ist für diese Chats ebenfalls eingerichtet“ statt „geht“, weil es nicht erprobt ist |
| README | 7, 8 | nicht umgesetzt: Kasten „Projektstatus“ und Tabellenzelle „Browser-Fassung“ sind älterer Text außerhalb von AP13b; Vorschlag für eine eigene Überarbeitung der README |
