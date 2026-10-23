"""TF 1 · Probleme selbst lösen – Google & KI. Four Lerneinheiten as subsections. v2 (22.10.2026)."""
from gen import h5p as H
from gen.mbz import Label, Page, SubSection, HvpItem, Feedback
from content.common import lead, p, box, steps, bullets, two_col, kv, merk
from content.cards import le_card

HUE = "#1D5FD1"
LE = {1: ("Das Problem zerlegen", "Beschreiben, bevor du suchst – und die richtigen Suchwörter finden", "ca. 20 min"),
      2: ("Suchen und Quellen prüfen", "Trefferlisten lesen, vier Prüfschritte, Clickbait erkennen", "ca. 25 min"),
      3: ("KI als Werkzeug", "Richtig fragen, Antworten prüfen", "ca. 25 min"),
      4: ("Der Ernstfall", "Eine Geschichte mit vier Enden, der Abschlusstest", "ca. 30 min")}

SCALE = ["1 trifft gar nicht zu", "2", "3", "4", "5 trifft voll zu"]
SELF_ITEMS = ["Wenn mein Handy oder Laptop ein Problem hat, kann ich es meistens selbst lösen.",
              "Ich erkenne, ob eine Internetseite vertrauenswürdig ist.",
              "Ich prüfe eine KI-Antwort, bevor ich sie benutze."]


def _head(num, steps_):
    t, s, d = LE[num]
    return Label(le_card(num, t, s, d, steps_, HUE), name=f"Lerneinheit {num}")


# ============================================================ LE 1
def le1(A):
    head = _head(1, [("Lesebuch", "4 Seiten mit Aufgaben", "📖"), ("Lernkarten", "Such-Werkzeuge", "🃏"), ("Zuordnen", "gute und schlechte Suchanfragen", "🧩")])

    s1 = [
        H.text(
            lead("Mia, 15, Sonntagabend. Ihr Handy zeigt 23 % und lädt nicht. Kabel rein, Kabel raus, nichts. "
                 "Sie tippt in die Suche: <i>handy kaputt</i>. 480 Millionen Treffer, keiner hilft.") +
            p("Mia weiß noch gar nicht, was ihr Problem ist. Solange sie es nicht beschreiben kann, bekommt sie Antworten auf fremde Fragen.") +
            box("Vier Fragen vor jeder Suche",
                steps(["<b>Welches Gerät genau?</b> Modellname, nicht „mein Handy“.",
                       "<b>Was genau passiert – und was nicht?</b> „Lädt nicht“ ist zu grob. Blinkt das Ladesymbol? "
                       "Wird das Handy warm? Lädt es mit einem anderen Kabel?",
                       "<b>Seit wann, und was war davor?</b> Ein Update, ein Sturz, Regen, ein neues Kabel.",
                       "<b>Was habe ich schon probiert?</b> Damit du nicht dreimal dasselbe liest."]), HUE) +
            p("Mia schreibt es in einem Satz auf:") +
            box("Mias Problem-Satz",
                '<p style="font-size:1.1em;line-height:1.5">„Mein <b>Nordvia X3</b> <b>lädt seit gestern Abend nicht mehr</b>, '
                'das Ladesymbol <b>blinkt kurz und geht wieder aus</b>. Davor kam ein <b>Update</b>. '
                'Ich habe <b>ein anderes Kabel und eine andere Steckdose</b> probiert.“</p>', "#0F766E", "#F0FAF7") +
            p("Gerät, genaues Verhalten, Vorgeschichte, schon probiert. Mit diesem Satz kann jeder helfen: "
              "die Suchmaschine, eine KI, die Person im Handyladen."),
            "Der Fall"),
        H.multichoice(
            "Leons Laptop macht Ärger. Mit welcher Beschreibung findet er am schnellsten eine brauchbare Antwort?",
            [("„Laptop kaputt, geht nicht mehr.“", False, "Zu grob. Das trifft auf tausend verschiedene Fehler zu."),
             ("„Laptop Vektor 14 startet nicht, Bildschirm bleibt schwarz, Lüfter läuft. Gestern Update installiert.“", True,
              "Gerät, Verhalten, Vorgeschichte – damit kann man arbeiten."),
             ("„Laptop startet nicht. Ich habe schon alles probiert, was man probieren kann.“", False,
              "„Alles probiert“ sagt niemandem, was du probiert hast. Welches Gerät, was genau passiert?"),
             ("„Bildschirm schwarz, Lüfter läuft.“", False, "Ein Anfang. Es fehlen Gerät und Vorgeschichte.")],
            title="Problembeschreibung"),
    ]
    s2 = [
        H.text(
            lead("Aus dem Problem-Satz werden Suchwörter. Nicht der ganze Satz, nur die Wörter, die zählen.") +
            kv([("Gerät", "Modellname – <i>Nordvia X3</i>"),
                ("Verhalten", "so, wie es ein Techniker sagen würde – <i>lädt nicht, Ladesymbol blinkt</i>"),
                ("Vorgeschichte", "nur wenn sie wichtig ist – <i>nach Update</i>"),
                ("Fehlermeldung", "wenn eine auf dem Bildschirm steht: wörtlich abtippen, in Anführungszeichen")], HUE) +
            two_col("So nicht", bullets(["warum lädt mein handy nicht mehr obwohl ich alles probiert habe",
                                         "handy kaputt hilfe", "akku problem"]),
                    "So ja", bullets(["Nordvia X3 lädt nicht Ladesymbol blinkt",
                                      "Nordvia X3 lädt nicht nach Update",
                                      "Nordvia X3 charging icon flashing"])) +
            p("Meist reichen drei bis sieben Wörter, ohne Füllwörter, ohne Fragesatz. Auf Englisch findest du oft mehr Foren "
              "und Anleitungen, weil mehr Leute dasselbe Gerät haben."),
            "Suchwörter finden"),
        H.markwords(
            "Markiere in Mias Satz die sechs Wörter, die in die Suche gehören.",
            "Mein *Nordvia* *X3* *lädt* seit gestern Abend *nicht* mehr, das *Ladesymbol* *blinkt* kurz und geht wieder aus. "
            "Davor kam ein Update. Ich habe ein anderes Kabel und eine andere Steckdose probiert.",
            title="Suchwörter markieren"),
        H.dragtext(
            "Leons Laptop „Vektor 14“ zeigt beim Start „Boot device not found“, nachdem er gestern eine neue Festplatte eingebaut hat. "
            "Zieh die Bausteine an die passende Stelle.",
            "Gerät: *Vektor 14*\nFehlermeldung wörtlich: *\"Boot device not found\"*\nVorgeschichte: *neue Festplatte*\n"
            "Gehört nicht in die Suche: *gestern*",
            title="Suchanfrage bauen"),
    ]
    s3 = [
        H.text(
            lead("Fünf Werkzeuge der Suchmaschine, die du kennen solltest.") +
            kv([('"…"', "Wortfolge genau so suchen. Für Fehlermeldungen: <i>\"Boot device not found\"</i>"),
                ("-wort", "Wort ausschließen, Minus direkt vor dem Wort: <i>Nordvia X3 lädt nicht -kaufen</i> – weniger Shops"),
                ("site:", "Nur eine Seite durchsuchen: <i>site:nordvia.de laden</i>"),
                ("Zeitraum", "Unter „Tools“ (am Handy manchmal versteckt): zum Beispiel nur das letzte Jahr. Technik-Antworten veralten schnell."),
                ("Bildersuche", "Kamera-Symbol im Suchfeld: Foto eines Teils, Symbols oder einer Fehlermeldung hochladen")], HUE) +
            box("Zwei Extras",
                p("<b>Autovervollständigung:</b> Tippst du <i>Nordvia X3 lädt</i>, schlägt die Suche vor, wonach andere gesucht haben – "
                  "<i>… nicht mehr</i>, <i>… nur bis 80</i>. Das kann dir Formulierungen liefern.<br>"
                  "<b>KI-Übersicht:</b> Manche Suchmaschinen zeigen über den Treffern eine KI-Zusammenfassung. "
                  "Sie gilt wie jede KI-Antwort: brauchbar, aber ungeprüft (mehr dazu in Lerneinheit 3)."), "#B45309", "#FDF7EE"),
            "Such-Werkzeuge"),
        H.singlechoiceset([
            ("Du willst nur Treffer von nordvia.de.",
             ["site:nordvia.de", "\"nordvia.de\"", "-nordvia.de"]),
            ("Du suchst die Fehlermeldung „Error 0xc000000f“ genau in dieser Schreibweise.",
             ["\"Error 0xc000000f\"", "Error 0xc000000f genau", "site:0xc000000f"]),
            ("Die Treffer sind lauter Shops, die dir ein Netzteil verkaufen wollen.",
             ["Netzteil tauschen -kaufen", "\"Netzteil kaufen\"", "Netzteil tauschen +kaufen"]),
            ("Du hast ein unbekanntes Teil in der Hand und keinen Namen dafür.",
             ["Foto in die Bildersuche hochladen", "„unbekanntes Teil“ in Anführungszeichen suchen", "site:teile.de"]),
            ("Die ersten Treffer sind von 2016 und passen nicht mehr zu deinem Gerät.",
             ["Zeitraum unter „Tools“ einschränken", "Suchwörter in Anführungszeichen setzen", "-2016 anhängen"]),
        ], title="Welches Werkzeug?"),
    ]
    s4 = [
        H.text(merk("Erst beschreiben, dann suchen: Gerät, genaues Verhalten, Vorgeschichte, schon probiert. "
                    "Daraus drei bis sieben Suchwörter. Fehlermeldungen wörtlich in Anführungszeichen.", HUE),
               "Zusammenfassung"),
        H.summary(
            "Wähle in jeder Gruppe die richtige Aussage.",
            [["Eine gute Suchanfrage hat wenige, genaue Wörter.",
              "Eine gute Suchanfrage hat möglichst viele Wörter, damit nichts fehlt.",
              "Eine gute Suchanfrage ist ein höflicher, vollständiger Fragesatz."],
             ["Fehlermeldungen tippst du wörtlich ab und setzt sie in Anführungszeichen.",
              "Fehlermeldungen beschreibst du besser in eigenen Worten, dann versteht die Suche sie.",
              "Fehlermeldungen lässt du weg, sie sind nur für Techniker gedacht."],
             ["Mit site: durchsuchst du nur eine bestimmte Internetseite.",
              "Mit site: findest du die Startseite einer Firma.",
              "Mit site: schließt du eine Internetseite aus."],
             ["Der Zeitraum-Filter hilft, weil Technik-Antworten schnell veralten.",
              "Der Zeitraum-Filter zeigt die beliebtesten Treffer zuerst.",
              "Der Zeitraum-Filter zeigt nur Treffer aus deinem Land."]],
            title="Zusammenfassung"),
    ]
    book = H.interactive_book(
        "Das Problem zerlegen",
        [("Der Fall", s1), ("Suchwörter finden", s2), ("Such-Werkzeuge", s3), ("Zusammenfassung", s4)],
        base_color=HUE, intro="")

    cards = H.dialog_cards(
        "Such-Werkzeuge – Lernkarten",
        [("<b>\"…\"</b><br>Anführungszeichen", "Sucht die Wortfolge <b>genau so</b>.<br>Für Fehlermeldungen."),
         ("<b>-wort</b><br>Minus direkt vor dem Wort", "<b>Schließt</b> das Wort aus.<br><i>-kaufen</i>: weniger Shops."),
         ("<b>site:</b>", "Durchsucht <b>nur eine Seite</b>.<br><i>site:nordvia.de</i>"),
         ("<b>Zeitraum</b><br>(unter „Tools“)", "Nur Treffer aus einem Zeitraum, zum Beispiel dem letzten Jahr."),
         ("<b>Bildersuche</b><br>(Kamera-Symbol)", "Foto hochladen statt Wörter tippen.<br>Für Teile, Symbole, Fehlermeldungen."),
         ("<b>Autovervollständigung</b>", "Zeigt, wonach andere gesucht haben.<br>Liefert Formulierungen."),
         ("<b>Englisch suchen</b>", "Mehr Foren und Anleitungen.<br><i>charging icon flashing</i>")],
        title="Such-Werkzeuge", description="", intro="")

    dnd = H.drag_question(
        "Gute oder schlechte Suchanfrage?",
        zones=["Gute Suchanfrage", "Schlechte Suchanfrage"],
        elements=[
            ("Nordvia X3 lädt nicht nach Update", 0),
            ("warum geht mein handy schon wieder nicht an", 1),
            ("\"Boot device not found\" Vektor 14", 0),
            ("hilfe kaputt", 1),
            ("Printo 200 druckt Streifen", 0),
            ("handy lädt nicht obwohl ich alles probiert habe", 1),
            ("site:nordvia.de Ladesymbol blinkt", 0),
            ("Akku", 1),
        ],
        width=760, height=480, cols=2, intro="")
    return SubSection("LE 1 · Das Problem zerlegen", [head, HvpItem(book), HvpItem(cards), HvpItem(dnd)])


# ============================================================ LE 2
def le2(A):
    head = _head(2, [("Lesebuch", "4 Seiten mit Aufgaben", "📖"), ("Zuordnen", "Trefferliste sortieren", "🧩"), ("Quiz", "Welche Quelle wofür · 5 von 6", "✅")])
    serp = A["serp.png"][1]
    click = A["clickbait.png"][1]

    s1 = [
        H.text(lead("Mia sucht: <i>Nordvia X3 lädt nicht Ladesymbol blinkt</i>. Das kommt zurück."), "Die Trefferliste"),
        H.image(serp, "Trefferliste einer Suchmaschine mit sechs Ergebnissen"),
        H.text(
            p("Sechs Treffer, sechs Sorten. Die Sorte erkennst du, bevor du klickst:") +
            kv([("Anzeige", "Steht klein davor. Jemand hat für den Platz bezahlt. Das sagt nichts über die Qualität."),
                ("Hersteller", "<i>support.nordvia.de</i> – kennt das Gerät, hält sich bei eigenen Fehlern manchmal bedeckt."),
                ("Forum", "Leute mit ähnlichen Problemen. Oft nützlich, aber ungeprüft. Datum und Zahl der Antworten anschauen."),
                ("Clickbait", "GROSSBUCHSTABEN, „genial“, Ausrufezeichen. Will Klicks, keine Lösung. Hier dazu von 2019, also veraltet."),
                ("Video", "Gut für Handgriffe (Buchse reinigen), schlecht für Entscheidungen (Garantie, Kosten)."),
                ("Lexikon", "Erklärt, was ein Akku ist. Erklärt nicht, warum deiner nicht lädt.")], HUE) +
            box("Die Adresse lesen",
                p("Entscheidend ist der Teil direkt vor <i>.de</i> oder <i>.com</i>: <i>support.nordvia.de</i> gehört zu "
                  "<i>nordvia.de</i>, also zum Hersteller. <i>nordvia-support.de</i> oder <i>nordvia.de.hilfe-portal.com</i> "
                  "gehören jemand anderem. Die Endung (.de, .com, .net) sagt allein nichts."), HUE),
            "Trefferliste lesen"),
        H.multichoice(
            "Welchen Treffer öffnest du zuerst?",
            [("Die Anzeige „Neues Smartphone ab 1 €“", False, "Die Anzeige löst Mias Problem nicht, sie verkauft ein neues."),
             ("Die Hersteller-Seite support.nordvia.de", True, "Der Hersteller kennt sein Gerät. Das Forum danach als zweite Meinung."),
             ("Das Forum – da haben echte Leute dasselbe Problem", False,
              "Nicht verkehrt, aber als zweite Quelle. Erst die Hersteller-Seite, dann vergleichen."),
             ("„7 GENIALE Tricks …“ – die stehen weit oben, also sind sie oft angeklickt", False,
              "Weit oben steht, was Klicks bringt, nicht was hilft. Dazu ist der Text von 2019.")],
            title="Erster Klick"),
    ]
    s2 = [
        H.text(
            lead("Im Forum steht: „Einstellungen → Akku → Ladelimit ausschalten. Hat bei 3 Leuten geholfen.“ "
                 "Bevor du etwas glaubst oder tust, vier Schritte.") +
            steps(["<b>Stopp.</b> Spürst du Druck? „Nur heute“, „sofort“, „alle machen das“? Dann langsamer.",
                   "<b>Wer steckt dahinter?</b> Impressum, Über-uns, ein Name. Verdient die Seite an deinem Klick, Kauf, deinen Daten?",
                   "<b>Gibt es das noch woanders?</b> Eine zweite Quelle, die nicht abgeschrieben hat.",
                   "<b>Woher hat die Seite das?</b> Zur ursprünglichen Quelle gehen: Hersteller, Behörde, Studie. Steht es dort so?"], HUE) +
            box("Der Forum-Tipp im Test",
                p("Stopp: kein Druck, sachlich. Wer: ein Nutzer, 12 Antworten, zwei Monate alt. Woanders: Die Hersteller-Seite kennt "
                  "die Funktion „Akkuschutz“, sie stoppt das Laden bei 80 %. Woher: steht so im Handbuch.") +
                p("<b>Und trotzdem passt der Tipp nicht.</b> Mias Handy steht bei 23 % und lädt gar nicht. Der Tipp ist echt, "
                  "aber er beantwortet ein anderes Problem. Fünfter Schritt also: <b>Passt es zu meinem Problem?</b>"),
                "#0F766E", "#F0FAF7"),
            "Vier Schritte"),
        H.dragtext(
            "Zieh die Schritt-Namen vor die passende Frage.",
            "*Stopp*: Spüre ich Zeitdruck oder Angst?\n*Wer*: Wem gehört die Seite, und womit verdient sie Geld?\n"
            "*Woanders*: Sagt eine zweite, unabhängige Quelle dasselbe?\n*Woher*: Wo kommt die Information ursprünglich her?",
            title="Vier Schritte zuordnen"),
        H.truefalse("Wenn drei Internetseiten dasselbe behaupten, ist es bestätigt.", False,
                    "Stimmt, die Aussage ist falsch: Drei Seiten können voneinander abgeschrieben haben.",
                    "Drei Seiten können voneinander abgeschrieben haben. Unabhängig heißt: eigene Quelle."),
        H.truefalse("Geschäftliche Seiten in Deutschland müssen ein Impressum haben. Fehlt es, ist das ein Warnsignal.", True,
                    "Genau. Wer verkauft oder wirbt, muss sagen, wer er ist.",
                    "Doch: Wer verkauft oder wirbt, muss sagen, wer er ist. Fehlt das, ist Vorsicht angebracht."),
        H.truefalse("Zeitdruck („nur heute“, „letzte Chance“) ist ein Grund, schneller zu entscheiden.", False,
                    "Stimmt, die Aussage ist falsch: Zeitdruck ist ein Verkaufsmittel und ein Grund, langsamer zu werden.",
                    "Zeitdruck ist ein Verkaufsmittel und ein Grund, langsamer zu werden."),
    ]
    s3 = [
        H.text(
            lead("Dieselbe Seite kann bei einer Frage die beste und bei der nächsten die falsche sein.") +
            kv([("Hersteller-Seite", "Bedienung, Einstellungen, Garantie, offizielle Updates"),
                ("Forum", "seltene Fehler, Erfahrungen, „bei mir hat geholfen“ – mit zweiter Quelle prüfen"),
                ("Video", "Handgriffe: reinigen, einbauen, zusammenstecken"),
                ("Verbraucherzentrale, Polizei", "Rechte, Verträge, Betrugsmaschen, Kündigung"),
                ("Lexikon", "Überblick und Begriffe, nicht für Details"),
                ("Vergleichsportal", "Preise sehen – die Reihenfolge ist oft bezahlt"),
                ("Social Media", "Meinungen und Stimmung, keine Fakten ohne zweite Quelle")], HUE),
            "Welche Quelle wofür"),
        H.summary(
            "Wähle in jeder Gruppe die richtige Aussage.",
            [["Für Garantiefragen ist die Hersteller-Seite die richtige Quelle.",
              "Für Garantiefragen ist ein Forum die richtige Quelle, da antworten Betroffene.",
              "Für Garantiefragen ist ein Vergleichsportal die richtige Quelle."],
             ["Forum-Tipps sind nützlich, müssen aber mit einer zweiten Quelle geprüft werden.",
              "Forum-Tipps mit vielen Antworten sind geprüft genug.",
              "Forum-Tipps sind unbrauchbar, weil jeder dort schreiben kann."],
             ["Auf Vergleichsportalen ist die Reihenfolge oft bezahlt.",
              "Vergleichsportale zeigen das günstigste Angebot immer zuerst.",
              "Vergleichsportale dürfen keine Werbung enthalten."],
             ["Bei Betrugsmaschen und Verträgen hilft die Verbraucherzentrale.",
              "Bei Betrugsmaschen hilft am besten ein Forum, da kennt jemand den Fall.",
              "Bei Verträgen hilft am besten der Anbieter selbst, er kennt den Vertrag."]],
            title="Zusammenfassung"),
    ]
    s4 = [
        H.text(lead("Mia klickt doch auf „7 geniale Tricks“."), "Clickbait"),
        H.image(click, "Clickbait-Seite mit Countdown, Sternebewertungen und großem Button"),
        H.multichoice(
            "Welche Warnsignale siehst du? (Mehrere Antworten sind richtig.)",
            [("Countdown und „nur noch 3 Plätze“ – künstlicher Zeitdruck", True, "Stopp-Signal."),
             ("„Hersteller hassen diesen Trick“ – Behauptung ohne Quelle", True, "Wer soll das gesagt haben?"),
             ("Nur Fünf-Sterne-Kommentare mit Vornamen", True, "Echte Bewertungen sind gemischt und nachprüfbar."),
             ("„von Redaktion“ ohne Namen, kein Impressum sichtbar", True, "Niemand steht mit seinem Namen dafür ein."),
             ("„1,2 Mio. Leser“ – so viele Leute können nicht irren", False, "Die Zahl ist unbelegt, und Klicks sind kein Beleg."),
             ("Die Seite ist bunt und hat ein Logo", False, "Das haben seriöse Seiten auch.")],
            single=False, title="Warnsignale"),
        H.text(merk("Stopp bei Druck. Wer steckt dahinter? Gibt es das unabhängig noch einmal? Woher stammt es? "
                    "Und: Passt es zu meinem Problem?", HUE), "Zusammenfassung"),
    ]
    book = H.interactive_book(
        "Treffer lesen, Quellen prüfen",
        [("Die Trefferliste", s1), ("Vier Schritte", s2), ("Welche Quelle wofür", s3), ("Clickbait", s4)],
        base_color=HUE, intro="")

    dnd = H.drag_question(
        "Trefferliste sortieren",
        zones=["Vertrauenswürdig", "Unklar – prüfen", "Finger weg"],
        elements=[
            ("support.nordvia.de – Hersteller-Hilfe", 0),
            ("frag-die-community.de – 12 Antworten, 2 Monate alt", 1),
            ("techblitz-news.net – „7 GENIALE Tricks“, 2019", 2),
            ("de.wikipedia.org – Lithium-Ionen-Akkumulator", 0),
            ("tube-howto.de – Video, Buchse reinigen", 1),
            ("mobilfunk-deal24.de – Anzeige, „nur heute“", 2),
        ],
        width=760, height=480, cols=2, intro="")

    qs = H.question_set(
        "Welche Quelle für welche Frage?",
        [H.multichoice("Du willst wissen, ob dein Handy noch Garantie hat.",
                       [("Hersteller-Seite", True), ("Forum", False), ("Vergleichsportal", False), ("Video", False)]),
         H.multichoice("Dein Drucker zeigt einen seltenen Fehlercode, den die Hersteller-Seite nicht erklärt.",
                       [("Forum, danach mit zweiter Quelle prüfen", True), ("Anzeige oben in der Trefferliste", False),
                        ("Lexikon", False), ("Vergleichsportal", False)]),
         H.multichoice("Du willst sehen, wie man die SIM-Karte in dein Modell einlegt.",
                       [("Video oder Hersteller-Seite", True), ("Verbraucherzentrale", False), ("Vergleichsportal", False), ("Social Media", False)]),
         H.multichoice("Du hast eine Mahnung von einer Firma bekommen, bei der du nie etwas bestellt hast.",
                       [("Verbraucherzentrale oder Polizei fragen", True), ("Die Firma anrufen und sicherheitshalber zahlen", False),
                        ("Im Forum fragen und dem ersten Tipp folgen", False), ("Abwarten, die melden sich schon wieder", False)]),
         H.multichoice("Du suchst den günstigsten Preis, traust aber der Reihenfolge auf dem Vergleichsportal nicht.",
                       [("Mehrere Portale vergleichen und selbst nach Preis sortieren", True), ("Den ersten Treffer nehmen, der ist geprüft", False),
                        ("Die Anzeige nehmen, Anzeigen sind kontrolliert", False), ("Nur den Hersteller-Shop anschauen", False)]),
         H.truefalse("Ein Forum-Tipp mit vielen Antworten und aktuellem Datum ist glaubwürdiger als einer ohne beides.", True),
        ],
        pass_pct=70, intro_text="Sechs Fragen. Fünf richtige schließen die Lerneinheit ab.", completion="pass")
    return SubSection("LE 2 · Suchen und Quellen prüfen", [head, HvpItem(book), HvpItem(dnd), HvpItem(qs)])


# ============================================================ LE 3
def le3(A):
    head = _head(3, [("Lesebuch", "4 Seiten mit Aufgaben", "📖"), ("Lernkarten", "KI kann – kann nicht", "🃏"),
                     ("Quiz", "Halluzinations-Detektiv · 4 von 5", "🕵️"), ("Lückentext", "Prompt verbessern", "✏️")])
    chat_bad = A["chat_bad.png"][1]
    chat_good = A["chat_good.png"][1]

    s1 = [
        H.text(lead("Mia fragt eine KI, so wie man eben fragt."), "Was eine KI tut"),
        H.image(chat_bad, "Chat mit einer KI: kurze Frage, lange Antwort mit erfundenem Menüpunkt"),
        H.text(
            p("Klingt gut. Zwei der fünf Schritte gibt es nicht: Einen Menüpunkt „Ladeelektronik zurücksetzen“ hat das Nordvia X3 nicht, "
              "und „Leiser-Taste und Ein/Aus-Taste 10 Sekunden“ startet höchstens das Gerät neu. Die KI hat das nicht nachgeschlagen. "
              "Sie hat es erzeugt.") +
            box("Was ein Sprachmodell macht",
                p("Es berechnet, welches Wort wahrscheinlich als Nächstes kommt. Es hat Millionen Texte gelesen und weiß, wie Anleitungen "
                  "klingen. Für das Modell zählt, ob ein Text plausibel klingt – nicht, ob er stimmt. Eine erfundene, aber plausible "
                  "Angabe nennt man <b>Halluzination</b>.") +
                bullets(["Es kennt dein konkretes Gerät nicht, nur Texte über ähnliche Geräte.",
                         "Es erfindet Menüpunkte, Zahlen, Quellen und Zitate, wenn sie gut passen.",
                         "Ohne eingebaute Websuche weiß es nichts über heute.",
                         "Es klingt meistens sicher – ob es recht hat oder nicht."]), HUE) +
            p("KI ist damit ein Werkzeug, dessen Ergebnis du prüfst – wie einen Forum-Tipp. "
              "Und: Persönliche Daten (Name, Adresse, Passwörter, Fotos von anderen) gehören nicht in einen Chat."),
            "Plausibel ist nicht wahr"),
        H.truefalse("Eine KI ohne Websuche schlägt nichts nach, sie erzeugt Text.", True,
                    "Genau.", "Doch: Ohne Websuche kann sie nichts nachschlagen. Sie erzeugt Text, der passt."),
        H.truefalse("Wenn eine KI sehr sicher klingt, stimmt die Antwort meistens.", False,
                    "Stimmt, die Aussage ist falsch: Der Ton sagt nichts über die Wahrheit.",
                    "Der Ton sagt nichts über die Wahrheit. Sie klingt fast immer sicher."),
        H.truefalse("Eine KI kann Menüpunkte nennen, die es auf deinem Gerät gar nicht gibt.", True,
                    "Genau das ist in Mias Chat passiert.", "Doch, genau das ist in Mias Chat passiert."),
    ]
    s2 = [
        H.text(
            lead("Die Antwort wird so gut wie die Frage. Die Frage an eine KI heißt <b>Prompt</b>. Vier Bausteine machen aus "
                 "„hilfe handy“ einen Prompt, der funktioniert.") +
            kv([("Rolle", "Wen soll die KI spielen? <i>Du bist ein Techniker in einem Handy-Reparaturladen.</i>"),
                ("Kontext", "Dein Problem-Satz aus Lerneinheit 1."),
                ("Ziel", "Was willst du? <i>Finde die Ursache. Günstige und ungefährliche Schritte zuerst.</i>"),
                ("Format", "Wie soll die Antwort aussehen? <i>Nummerierte Liste, höchstens fünf Schritte. "
                           "Sag mir bei jedem Schritt, woran ich erkenne, ob er geholfen hat. Frag nach, wenn dir Infos fehlen.</i>")], HUE),
            "Vier Bausteine"),
        H.image(chat_good, "Chat mit einer KI: Frage mit Rolle, Kontext, Ziel und Format"),
        H.text(
            p("Der Unterschied: Die KI fragt nach, statt zu raten – nach dem Ladesymbol im ausgeschalteten Zustand und nach der "
              "Akkuschutz-Einstellung. Und sie schlägt keinen Werksreset vor, weil das Ziel „ungefährlich zuerst“ heißt. "
              "Geprüft ist damit noch nichts; das kommt auf der nächsten Seite."),
            "Der Unterschied"),
        H.dragtext(
            "Zieh die Baustein-Namen vor den passenden Satz.",
            "*Rolle*: Du bist ein Techniker im Reparaturladen.\n*Kontext*: Mein Nordvia X3 lädt seit dem Update nicht, das Ladesymbol blinkt.\n"
            "*Ziel*: Finde die Ursache, ungefährliche Schritte zuerst.\n*Format*: Nummerierte Liste, maximal fünf Schritte, frag nach, wenn Infos fehlen.",
            title="Bausteine zuordnen"),
        H.blanks(
            "Vervollständige den Prompt.",
            ["Du bist ein *Techniker/Handy-Techniker/Experte/Handy-Experte/Reparateur/Fachmann:Rolle – wer soll die KI sein?*. "
             "Mein *Nordvia X3/Nordvia/X3:Gerät* lädt seit gestern nicht mehr, das Ladesymbol blinkt kurz. Davor kam ein Update. "
             "Ich habe Kabel und Steckdose getauscht. Finde die *Ursache/Fehlerursache:Ziel – was soll die KI finden?*, "
             "ungefährliche Schritte zuerst. Nummerierte Liste, höchstens fünf Schritte. "
             "*Frag/Frage:Was soll die KI tun, wenn ihr Informationen fehlen?* nach, wenn dir Informationen fehlen."],
            title="Prompt vervollständigen"),
    ]
    s3 = [
        H.text(
            lead("Die Antwort ist da. Jetzt prüfen.") +
            steps(["<b>Passt es zu meinem Gerät?</b> Gibt es den Menüpunkt wirklich? Einstellungen öffnen und nachsehen.",
                   "<b>Zweite Quelle.</b> Den Kernschritt der Antwort in die Suche tippen. Sagt der Hersteller oder ein Forum dasselbe?",
                   "<b>Was kostet der Schritt, wenn er falsch ist?</b> Kabel tauschen: nichts. Werksreset: meist alle Daten weg. "
                   "Je teurer der Fehler, desto gründlicher die Prüfung.",
                   "<b>Nachhaken.</b> „Bist du sicher, dass das Nordvia X3 diesen Menüpunkt hat?“ Oft rudert die KI zurück. "
                   "Aber: Weder Zurückrudern noch Beharren beweist etwas – die zweite Quelle entscheidet."], HUE) +
            box("Hier erfindet eine KI besonders gern",
                bullets(["Sehr konkrete Angaben: Menüpfade, Tastenkombinationen, Zahlen",
                         "Quellen, Studien, Zitate",
                         "Rechenergebnisse – ohne Rechner-Werkzeug fehleranfällig",
                         "Aktuelles: Preise, Termine, Versionen"]), "#B45309", "#FDF7EE"),
            "Antwort prüfen"),
        H.multichoice(
            "Die KI schreibt: „Halte Leiser-Taste und Ein/Aus-Taste 10 Sekunden gedrückt, um den Ladechip neu zu starten.“ "
            "Der Schritt kostet nichts. Was tust du?",
            [("Ausprobieren – und die Erklärung „Ladechip neu starten“ prüfen, bevor ich sie weitererzähle", True,
              "Ungefährlich, also testen. Die Erklärung dazu ist wahrscheinlich erfunden."),
             ("Erst den nächsten Schritt der KI machen, der klingt gründlicher", False,
              "Der nächste Schritt war der Werksreset. Der kostet alle Daten – erst prüfen."),
             ("Der KI glauben, sie hat die Schritte ja sortiert", False, "Sortiert heißt nicht geprüft."),
             ("Gar nichts aus der Antwort benutzen, weil ein Teil erfunden war", False,
              "Zu einfach. Kabel und Buchse prüfen war brauchbar.")],
            title="Was tust du?"),
        H.multichoice(
            "Welche Rückfrage an die KI bringt dich am weitesten?",
            [("„Bist du sicher, dass das Nordvia X3 den Menüpunkt ‚Ladeelektronik zurücksetzen‘ hat? Wo genau?“", True,
              "Konkret und prüfbar. Die Antwort vergleichst du mit dem Gerät."),
             ("„Gib mir die Quelle dafür.“", False, "Die Quelle kann genauso erfunden sein wie der Menüpunkt. Selbst suchen."),
             ("„Erklär das nochmal ausführlicher.“", False, "Ausführlicher heißt nicht richtiger."),
             ("„Gib mir fünf weitere Tipps.“", False, "Mehr ungeprüfte Tipps helfen nicht.")],
            title="Rückfrage"),
    ]
    s4 = [
        H.text(
            two_col("Kann sie gut", bullets(["Erklären, in einfachen Worten", "Texte umformulieren, kürzen, übersetzen",
                                            "Rückfragen stellen, die dir nicht eingefallen wären", "Ideen sammeln, Struktur vorschlagen",
                                            "Pläne in Schritte gliedern, die du dann prüfst"]),
                    "Vorsicht bei", bullets(["Fakten über dein konkretes Gerät", "Rechnen ohne Rechner-Werkzeug", "Quellen und Zitate",
                                             "Aktuellem: Preise, Termine, Versionen", "Risiko: Sie kann es einschätzen, die Verantwortung bleibt bei dir"]),
                    hue_l="#15803D", hue_r="#BE123C") +
            merk("Prompt mit Rolle, Kontext, Ziel, Format. Antwort prüfen wie einen Forum-Tipp: Passt es? Zweite Quelle? "
                 "Was kostet ein Fehler?", HUE),
            "Zusammenfassung"),
        H.summary(
            "Wähle in jeder Gruppe die richtige Aussage.",
            [["Eine KI erzeugt Text, der plausibel klingt; ob er stimmt, prüfst du.",
              "Eine KI sucht die Antwort in einer geprüften Datenbank heraus.",
              "Eine KI irrt nur bei sehr neuen Themen."],
             ["Ein guter Prompt enthält Rolle, Kontext, Ziel und Format.",
              "Ein guter Prompt ist kurz, damit die KI nichts missversteht.",
              "Ein guter Prompt ist höflich formuliert, dann antwortet die KI genauer."],
             ["Vor einem riskanten Schritt (Werksreset) brauchst du eine zweite Quelle.",
              "Riskante Schritte sind in Ordnung, wenn die KI sie als letzten Schritt nennt.",
              "Riskante Schritte erkennst du daran, dass die KI vorher warnt."],
             ["„Bist du sicher, dass es diesen Menüpunkt gibt?“ ist eine gute Rückfrage.",
              "„Gib mir die Quelle“ ist die beste Rückfrage, dann weißt du, woher es kommt.",
              "Rückfragen bringen nichts, die KI antwortet immer gleich."]],
            title="Zusammenfassung"),
    ]
    book = H.interactive_book(
        "KI richtig fragen, Antwort prüfen",
        [("Was eine KI tut", s1), ("Vier Bausteine", s2), ("Antwort prüfen", s3), ("Zusammenfassung", s4)],
        base_color=HUE, intro="")

    cards = H.dialog_cards(
        "KI kann – KI kann nicht",
        [("Einen Text in einfachen Worten erklären", "<b>Kann sie gut.</b>"),
         ("Sagen, ob dein Handy-Modell einen bestimmten Menüpunkt hat", "<b>Unzuverlässig.</b><br>Sie rät aus ähnlichen Geräten."),
         ("Eine Rechnung mit großen Zahlen lösen", "<b>Ohne Rechner-Werkzeug fehleranfällig.</b><br>Nachrechnen."),
         ("Den aktuellen Preis eines Geräts nennen", "<b>Ohne Websuche nicht.</b><br>Sie kennt kein Heute."),
         ("Quellen und Studien zitieren", "<b>Oft erfunden oder falsch zugeordnet.</b><br>Jede prüfen."),
         ("Dir Rückfragen stellen, die du vergessen hättest", "<b>Kann sie gut.</b><br>„Was hast du schon probiert?“"),
         ("Entscheiden, ob ein Schritt deine Daten gefährdet", "<b>Einschätzen ja, entscheiden nein.</b><br>Die Verantwortung bleibt bei dir."),
         ("Einen Plan in Schritte gliedern", "<b>Kann sie gut.</b><br>Jeden Schritt prüfst du.")],
        title="KI kann – KI kann nicht", description="", intro="")

    detektiv = H.question_set(
        "Halluzinations-Detektiv",
        [H.multichoice(
            "KI-Antwort: „Öffne Einstellungen → Akku → Ladeelektronik zurücksetzen. Danach lädt das Gerät wieder normal.“ – Was fällt auf?",
            [("Sehr konkreter Menüpfad, nirgends belegt – ein typisches Erfindungsmuster", True),
             ("Die Antwort ist zu kurz, um brauchbar zu sein", False),
             ("Akku-Einstellungen gibt es nur bei Laptops, nicht bei Handys", False),
             ("Nichts – der Pfad klingt, als käme er aus dem Handbuch", False)]),
         H.multichoice(
            "KI-Antwort: „Laut einer Studie der Universität Hamburg von 2023 laden 78 % aller Handys nach einem Update langsamer.“ – Was prüfst du?",
            [("Ob es diese Studie gibt: Universität, Jahr und Zahl in die Suche tippen", True),
             ("Nichts – eine Studie mit Jahreszahl ist eine Quelle", False),
             ("Ob 78 % eine realistische Zahl ist", False),
             ("Ob die Universität Hamburg Handys erforscht", False)]),
         H.multichoice(
            "KI-Antwort: „Dein Vertrag kostet 12,99 € im Monat, also 143,88 € im Jahr.“ – Stimmt die Rechnung?",
            [("Nein: 12,99 × 12 = 155,88 €. Rechnungen selbst nachrechnen.", True),
             ("Ja, 143,88 € stimmt.", False),
             ("Nein: 12,99 × 12 = 151,88 €.", False),
             ("Kann man nicht sagen, Verträge haben Rabatte.", False)]),
         H.multichoice(
            "KI-Antwort: „Das neueste Modell dieser Reihe ist das X3, erschienen im März.“ – Was ist das Problem?",
            [("Die KI kennt kein Heute. Ob das X3 noch das neueste ist, weiß sie ohne Websuche nicht.", True),
             ("Handys erscheinen nie im März.", False),
             ("Nichts – Modellnamen und Monate weiß eine KI sicher.", False),
             ("Die KI darf keine Produktnamen nennen.", False)]),
         H.multichoice(
            "KI-Antwort: „Prüfe Kabel und Netzteil an einem anderen Gerät. Schalte das Handy aus und reinige die Buchse vorsichtig mit "
            "einem Holz-Zahnstocher.“ Die Hersteller-Seite nennt dieselben zwei Schritte. – Und hier?",
            [("Brauchbar: günstig, ungefährlich, von einer zweiten Quelle bestätigt", True),
             ("Erfunden – eine KI kann keine echten Reparaturschritte kennen", False),
             ("Gefährlich – in die Buchse gehört nie etwas hinein", False),
             ("Unbrauchbar – zwei Schritte sind zu wenig für ein echtes Problem", False)]),
        ],
        pass_pct=80, intro_text="Fünf KI-Antworten. Was ist erfunden, falsch oder brauchbar? Vier richtige schließen ab.", completion="pass")

    prompt_blanks = H.blanks_activity(
        "Prompt verbessern",
        "Lara schreibt der KI: „mein laptop geht nicht hilfe“. Baue den Prompt um. Fülle die Lücken.",
        ["Du bist ein *Techniker/IT-Techniker/Computertechniker/Experte/Computer-Experte/Fachmann:Rolle – wer soll die KI sein?*. "
         "Mein Laptop *Vektor 14/Vektor:Gerät – das Modell heißt Vektor 14* startet nicht: Nach dem Einschalten bleibt der "
         "Bildschirm *schwarz:Verhalten – was zeigt der Bildschirm?*, der Lüfter läuft. Gestern habe ich ein Update installiert. "
         "Finde die Ursache, ungefährliche Schritte zuerst. Antworte als *nummerierte/Nummerierte:Format – welche Art Liste?* Liste "
         "mit höchstens fünf Schritten und *frag/frage:Was soll die KI tun, wenn ihr Infos fehlen?* nach, wenn dir Informationen fehlen."],
        intro="")

    return SubSection("LE 3 · KI als Werkzeug", [head, HvpItem(book), HvpItem(cards), HvpItem(detektiv), HvpItem(prompt_blanks)])


# ============================================================ LE 4
def le4(A, start_img=None):
    head = _head(4, [("Geschichte", "Du entscheidest · vier Enden", "🔀"), ("Abschlusstest", "10 Fragen · 7 richtige", "🏅"),
                     ("Selbsteinschätzung", "dieselben drei Sätze", "📝"), ("Praxis", "ein echtes Problem lösen", "🛠️")])

    B = H.Branch
    b = B()
    E_hard = B.END("Harte Landung",
                   "Der Laptop läuft wieder – nach einem Werksreset. Die Präsentation ist weg, du hältst das Referat ohne Folien. "
                   "Was gefehlt hat: die Frage, was der Schritt kostet, wenn er falsch ist, und eine zweite Quelle, bevor du ihn machst.")
    E_solved = B.END("Gelöst",
                     "Startreparatur, zwölf Minuten, Präsentation da. Du hast das Problem beschrieben, die Antwort mit einer zweiten "
                     "Quelle abgeglichen und nur den belegten Schritt ausgeführt.")
    E_planb = B.END("Plan B",
                    "Jana schickt dir die Version von Donnerstag, morgen nimmst du den Schulrechner, und den Laptop reparierst du am "
                    "Dienstag in Ruhe. Du hast das Referat gerettet, bevor du den Laptop gerettet hast – manchmal ist das die richtige Reihenfolge.")
    E_time = B.END("Zeit verloren",
                   "21:30 Uhr, dieselbe Meldung wie um 19:30. Zwei Stunden Neustarts, kein Schritt weiter, und das Referat ist immer noch "
                   "morgen. Was gefehlt hat: Schritt eins – aufschreiben, was genau passiert.")

    b.add_text("start", "Sonntag, 19:30 Uhr",
               "<p>Morgen, zweite Stunde: dein Referat. Die Präsentation liegt auf dem Laptop – eine Kopie wolltest du morgen früh in die "
               "Schul-Cloud laden. Du klappst ihn auf. Statt des Desktops ein blauer Bildschirm:</p>"
               "<p><b>„Dein PC muss repariert werden. Fehlercode: 0xc000000f“</b></p>"
               "<p>Gestern Abend lief ein Update. Du hast den Laptop mit dem Ein/Aus-Schalter ausgeschaltet, bevor es fertig war, "
               "weil der Akku fast leer war.</p>",
               "q1")
    b.add_question("q1", "Was tust du zuerst?",
                   [("Neu starten. Und nochmal. Und nochmal.", "restart"),
                    ("Aufschreiben, was genau passiert und was davor war.", "describe"),
                    ("Tom schreiben: „laptop kaputt hilfe“", "buddy")])
    b.add_text("restart", "Neustart Nr. 7",
               "<p>Derselbe blaue Bildschirm, dieselbe Zahl. Eine halbe Stunde ist weg, und du weißt immer noch nicht, was das Problem ist.</p>",
               "q1b")
    b.add_question("q1b", "Und jetzt?",
                   [("Weiter neu starten, irgendwann klappt es.", E_time),
                    ("Stopp. Aufschreiben: Gerät, Meldung, Vorgeschichte.", "describe")])
    b.add_text("buddy", "Tom antwortet",
               "<p>„kp, mach werksreset, hat bei mir mal geholfen“</p>"
               "<p>Werksreset heißt meist: alles weg, auch die Präsentation. Tom weiß nicht, welchen Fehler du hast – "
               "du hast ihn auch nicht genannt.</p>", "q1c")
    b.add_question("q1c", "Machst du den Werksreset?",
                   [("Ja, Tom kennt sich mit Computern aus.", E_hard),
                    ("Nein. Erst beschreiben, dann suchen.", "describe")])
    b.add_text("describe", "Der Problem-Satz",
               "<p>Du schreibst: <b>„Laptop Vektor 14 startet nicht, blauer Bildschirm mit Fehlercode 0xc000000f, nach abgebrochenem "
               "Update gestern. Einschalten mehrfach probiert.“</b></p>"
               "<p>Vier Informationen. Jetzt kann dir jemand helfen – eine Suchmaschine, eine KI, ein Mensch.</p>", "q2")
    b.add_question("q2", "Wo suchst du?",
                   [("Suche: <i>laptop kaputt blauer bildschirm</i>", "search_bad"),
                    ("Suche: <i>\"0xc000000f\" Vektor 14 nach Update</i>", "search_good"),
                    ("KI fragen, mit Rolle, Kontext, Ziel und Format", "ai")])
    b.add_text("search_bad", "2,3 Millionen Treffer",
               "<p>Anzeigen für neue Laptops, ein Video „Laptop kaputt? 5 Tricks!“, ein Forum von 2014. Nichts davon kennt deinen "
               "Fehlercode. Zu grob gesucht.</p>", "q2b")
    b.add_question("q2b", "Zweiter Versuch?",
                   [("Fehlercode in Anführungszeichen, plus Modell.", "search_good"),
                    ("Das Video mit den 5 Tricks anschauen.", "video")])
    b.add_text("video", "5 Tricks, 11 Minuten",
               "<p>Trick 3 ist „Werksreset“. Trick 5 ist ein Link zu einem Shop. Der Fehlercode kommt im ganzen Video nicht vor. "
               "Elf Minuten weg.</p>", "q2c")
    b.add_question("q2c", "Und jetzt?",
                   [("Werksreset, das Video sagt es ja.", E_hard),
                    ("Zurück zur Suche, diesmal mit dem Fehlercode.", "search_good")])
    b.add_text("search_good", "Treffer 1 und 2",
               "<p>Microsoft-Support: „0xc000000f – Startkonfigurationsdaten fehlen oder sind beschädigt, häufig nach unterbrochenem "
               "Update. Lösung: Startreparatur über das Wiederherstellungsmenü. Eigene Dateien bleiben dabei in der Regel erhalten.“</p>"
               "<p>Forum, 40 Antworten, letzte vor drei Wochen: dieselbe Lösung, mit Fotos zu jedem Schritt.</p>"
               "<p>Zwei unabhängige Quellen, dieselbe Antwort, und sie passt zu deiner Vorgeschichte.</p>", "q3")
    b.add_question("q3", "Wie geht es weiter?",
                   [("Startreparatur ausführen, wie beschrieben.", E_solved),
                    ("Erst das Referat sichern: Jana hat die Version von Donnerstag. Laptop später.", E_planb)])
    b.add_text("ai", "Die KI antwortet",
               "<p>Dein Prompt: „Du bist ein IT-Techniker. Laptop Vektor 14, blauer Bildschirm, Fehlercode 0xc000000f, nach abgebrochenem "
               "Update. Finde die Ursache, ungefährliche Schritte zuerst, maximal fünf Schritte, frag nach, wenn Infos fehlen.“</p>"
               "<p>Antwort: 1. Der Fehlercode bedeutet beschädigte Startkonfigurationsdaten. 2. Wiederherstellungsmenü öffnen → Startreparatur. "
               "3. <b>Falls das nicht hilft: F11 beim Start drücken, das setzt den Startsektor zurück.</b> 4. Als letzte Möglichkeit: Werksreset.</p>"
               "<p>Du tippst den Fehlercode in die Suche: Der Microsoft-Support bestätigt Schritt 1 und 2. Schritt 3 findest du nirgends.</p>", "q3b")
    b.add_question("q3b", "Was tust du?",
                   [("Schritte 1 und 2 ausführen. Schritt 3 lassen, weil keine zweite Quelle ihn kennt.", E_solved),
                    ("Alles der Reihe nach, auch F11 – irgendwas davon wird schon helfen.", "f11"),
                    ("Erst das Referat sichern: Jana hat die Version von Donnerstag. Laptop später.", E_planb)])
    b.add_text("f11", "F11",
               "<p>F11 öffnet auf dem Vektor 14 das Wiederherstellungsmenü des Herstellers – mit genau einer Option: „Auf Werkseinstellungen "
               "zurücksetzen“. Du bist müde, es ist 21 Uhr, der Button ist groß.</p>", "q3c")
    b.add_question("q3c", "Klicken?",
                   [("Ja. Die KI hat es doch als Schritt genannt.", E_hard),
                    ("Nein. Zurück, Startreparatur wie in Schritt 2.", E_solved)])

    story = H.branching_scenario(
        "Morgen ist das Referat",
        b, "Morgen ist das Referat", "Sonntagabend, ein blauer Bildschirm. Du entscheidest.",
        start_img=start_img, intro="",
        files=[(A["story.png"][0], "images/story.png")] if start_img else [])

    test = H.question_set(
        "Abschlusstest",
        [H.multichoice("Was gehört in einen Problem-Satz? (Mehrere Antworten richtig.)",
                       [("Gerät und Modell", True), ("Genaues Verhalten", True), ("Was davor passiert ist", True),
                        ("Was du schon probiert hast", True), ("Wie dringend es ist", False)], single=False),
         H.multichoice("Welche Suchanfrage ist die beste?",
                       [("\"Boot device not found\" Vektor 14", True), ("warum geht mein laptop nicht mehr an", False),
                        ("laptop boot device problem lösung schnell bitte", False), ("boot", False)]),
         H.multichoice("Was bewirkt <i>site:nordvia.de</i> in einer Suchanfrage?",
                       [("Es werden nur Seiten von nordvia.de durchsucht", True), ("nordvia.de wird ausgeschlossen", False),
                        ("Die Startseite von nordvia.de wird geöffnet", False), ("Es werden nur Seiten mit Links auf nordvia.de gezeigt", False)]),
         H.multichoice("Welche Adresse gehört zum Hersteller Nordvia?",
                       [("support.nordvia.de", True), ("nordvia-support.de", False), ("nordvia.de.hilfe-portal.com", False), ("nordvia-hilfe.net", False)]),
         H.multichoice("Welche vier Schritte, bevor du einer Seite glaubst?",
                       [("Stopp – Wer steckt dahinter – Gibt es das unabhängig noch einmal – Woher stammt es", True),
                        ("Lesen – Datum prüfen – Kommentare lesen – Teilen", False),
                        ("Impressum – Logo – Sprache – Länge des Textes", False),
                        ("Anzeige überspringen – ersten Treffer öffnen – Video schauen – ausprobieren", False)]),
         H.multichoice("Woran erkennst du Clickbait? (Mehrere Antworten richtig.)",
                       [("Künstlicher Zeitdruck", True), ("Behauptungen ohne Quelle", True), ("Nur Fünf-Sterne-Kommentare", True),
                        ("Eine hohe Leserzahl", False)], single=False),
         H.truefalse("Eine KI ohne Websuche schlägt nichts nach, sie erzeugt Text, der plausibel klingt.", True),
         H.multichoice("Welcher Prompt ist besser?",
                       [("„Du bist Techniker. Nordvia X3 lädt nicht nach Update, Ladesymbol blinkt, Kabel getauscht. Ursache finden, ungefährlich zuerst, max. 5 Schritte, frag nach.“", True),
                        ("„handy lädt nicht hilfe“", False), ("„Bitte hilf mir mit meinem Handy, es ist dringend!!!“", False),
                        ("„Erzähl mir alles über Akkus.“", False)]),
         H.multichoice("Die KI nennt einen Menüpunkt, den du auf deinem Gerät nicht findest. Was heißt das?",
                       [("Wahrscheinlich erfunden – zweite Quelle suchen, nachhaken", True), ("Dein Gerät braucht ein Update", False),
                        ("Du musst genauer suchen, der Menüpunkt ist versteckt", False), ("Die KI meint ein anderes Gerät, einfach nochmal fragen", False)]),
         H.multichoice("Vor welchem Schritt brauchst du unbedingt eine zweite Quelle?",
                       [("Werksreset", True), ("Kabel an einem anderen Gerät testen", False), ("Neustart", False), ("Gerät ausschalten", False)]),
        ],
        pass_pct=70, intro_text="Zehn Fragen zu den vier Lerneinheiten. Sieben richtige, und du bekommst den Badge.",
        completion="pass")

    after = Feedback(
        "Selbsteinschätzung nachher",
        "<p>Dieselben drei Sätze wie am Anfang.</p>",
        [(t, SCALE) for t in SELF_ITEMS],
        after_text="<p>Danke. Vergleich mit deiner ersten Einschätzung: Was hat sich verändert?</p>")

    praxis = Page(
        "Ein echtes Problem lösen",
        lead("Such dir ein echtes Problem – deins oder eins aus deiner Familie.") +
        box("Beispiele", bullets(["Der Drucker druckt nur noch Streifen.", "Das WLAN im Zimmer ist langsam, in der Küche nicht.",
                                  "Ein Abo lässt sich nicht kündigen.", "Der Fernseher findet einen Sender nicht mehr.",
                                  "Eine App stürzt beim Öffnen ab."]), HUE) +
        p("Schreib auf, in dieser Reihenfolge:") +
        steps(["<b>Problem-Satz</b> – Gerät, Verhalten, Vorgeschichte, schon probiert",
               "<b>Suchanfrage</b> – wörtlich, mit Werkzeugen, falls benutzt",
               "<b>Die zwei besten Treffer</b> – Adresse, Sorte, warum du ihnen traust",
               "<b>Prompt</b> mit Rolle, Kontext, Ziel, Format – und was an der Antwort stimmte, was nicht",
               "<b>Ergebnis</b> – gelöst, teilweise, nicht gelöst – und was du beim nächsten Mal anders machst"], HUE) +
        p("Nicht gelöst ist ein gültiges Ergebnis, wenn du weißt, warum, und was der nächste Schritt wäre: Werkstatt, Hersteller-Hotline, "
          "Verbraucherzentrale."),
        completion="view")

    test_item = HvpItem(test)
    return SubSection("LE 4 · Der Ernstfall", [head, HvpItem(story), test_item, after, praxis]), test_item
