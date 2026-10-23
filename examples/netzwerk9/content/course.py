"""Kurze Einheit „Netzwerkkomponenten – von der Wand aufs Handy“ (Informatik 9), aus einer Informatik-9-Stunde
(Folien + Fotos der Lehrkraft; im Repo durch Platzhalterbilder ersetzt). Ein Abschnitt, ca. 25 min. Mischung: Textfeld/Seite für Input, H5P für Übung."""
from gen import h5p as H
from gen.mbz import Label, Page, Section, HvpItem, Url
from content.common import lead, p, box, kv, merk
from content.cards import le_card

HUE = "#0F766E"

KOMP = [  # (key, Name, Funktion, zweiter Satz)  [Quelle: Folien 5–10]
    ("buchse", "Telefonbuchse", "Bringt das Internetsignal in die Wohnung.", "Sitzt an der Wand – hier fängt alles an."),
    ("router", "Router", "Verbindet das lokale Netzwerk mit dem Internet.", "Verbindung über Kabel (Ethernet) oder drahtlos (WLAN)."),
    ("kabel", "Netzwerkkabel", "Überträgt Daten mit hoher Geschwindigkeit.", "Auch Ethernet-, LAN- oder CAT-Kabel. Verbindet Endgeräte mit Router oder Switch."),
    ("switch", "Switch", "Macht aus einem Netzwerkanschluss viele.", "Verbindet mehrere Endgeräte per Kabel."),
    ("accesspoint", "Access Point", "Erzeugt ein WLAN-Signal.", "Braucht immer eine Kabelverbindung zum Router."),
    ("endgeraete", "Endgeräte", "Die Geräte, die wir benutzen: Laptop, Handy, PC, Drucker, Konsole.", "Verbinden sich per Kabel oder WLAN mit dem Netzwerk."),
]


def _komp_row(k, name, f1, f2):
    return (f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 10px 0;border:0"><tr>'
            f'<td style="border:0;width:150px;padding:0 16px 0 0;vertical-align:middle">'
            f'<img src="@@PLUGINFILE@@/{k}.png" alt="{name}" style="width:140px;height:auto;border-radius:10px;display:block"></td>'
            f'<td style="border:0;vertical-align:middle;line-height:1.5"><b>{name}</b><br>{f1} {f2}</td></tr></table>')


def build(A, sb, proto=False):
    img = {k: A[f"{k}.png"][1] for k, *_ in KOMP}
    files = [(A[f"{k}.png"][0], f"{k}.png") for k, *_ in KOMP]

    # 1 Überblick (Textfeld, Karte)
    head = Label(le_card(1, "Netzwerkkomponenten", "Wie kommt das Internet von der Wand auf dein Handy?", "ca. 25 min",
                         [("Lesen", "Einstieg und der Weg"), ("Üben", "Reihenfolge, Hubers Wohnung, Wer bin ich?"),
                          ("Sichern", "Hefteintrag und Quiz")], HUE), name="Überblick")

    # 2 Einstieg (Textfeld, direkt auf der Kursseite)  [Quelle: Folien 2–3]
    einstieg = Label(
        lead("Du sitzt zu Hause. YouTube lädt nicht: <b>Keine Internetverbindung – ERR_INTERNET_DISCONNECTED.</b> "
             "Wo schaust du zuerst nach – am Handy, am Router, an der Wand?") +
        box("Überleg kurz, bevor du weiterliest",
            p("Welche Geräte stehen bei dir zu Hause zwischen der Wand und deinem Handy? Und welche davon braucht man wirklich, "
              "um ins Internet zu kommen? Die Antwort steht auf der nächsten Seite."), HUE),
        name="Einstieg: Keine Verbindung")

    # 3 Der Weg (Seite mit Fotos)  [Quelle: Folien 5–11, Heftbilder]
    weg = Page("Der Weg von der Wand aufs Handy",
               lead("Sechs Stationen, immer in dieser Reihenfolge.") +
               "".join(_komp_row(k, n, f1, f2) for k, n, f1, f2 in KOMP) +
               merk("Telefonbuchse → Router → Netzwerkkabel → Switch → Access Point → Endgeräte. "
                    "Wirklich nötig sind nur Buchse und Router – der Router kann selbst WLAN. Switch und Access Point "
                    "kommen dazu, wenn mehr Geräte per Kabel sollen oder das WLAN nicht bis ins letzte Zimmer reicht.", HUE),
               files=files, completion="view")

    # 4 Üben: Reihenfolge + Was braucht man wirklich (H5P Question Set, 2 Aufgaben)  (← Seite „Der Weg“)
    check = H.question_set(
        "Check: Der Weg",
        [H.dragtext("Bring die Stationen in die richtige Reihenfolge – von der Wand bis zum Gerät.",
                    "Wand: *Telefonbuchse* → *Router* → *Netzwerkkabel* → *Switch* → *Access Point* → *Endgeräte*",
                    title="Reihenfolge"),
         H.multichoice("Was braucht man wirklich, um zu Hause ins Internet zu kommen?",
                       [("Telefonbuchse und Router", True, "Die Buchse bringt das Signal, der Router verteilt es – per Kabel oder WLAN."),
                        ("Einen Switch", False, "Ein Switch macht aus einem Anschluss viele. Nützlich, wenn viele Geräte per Kabel sollen – nötig nicht."),
                        ("Einen Access Point", False, "Der Access Point erzeugt WLAN – das kann der Router meist selbst."),
                        ("Einen Drucker", False, "Ein Drucker ist ein Endgerät. Er nutzt das Netz, er stellt es nicht her.")])],
        pass_pct=100, completion="view")

    # 5 Familie Huber (Textfeld: der Fall)  [Quelle: Folie 14]
    huber = Label(
        lead("Familie Huber zieht ein.") +
        kv([("Flur", "Telefonbuchse"),
            ("Arbeitszimmer", "PC, Drucker, Laptop – alle per Kabel"),
            ("Wohnzimmer", "Smart-TV und Konsole"),
            ("Kinderzimmer", "Handy und Tablet – hier kommt kein WLAN an, es ist zu weit weg")], HUE) +
        p("Welche Komponenten braucht die Familie, und wo kommen sie hin? Entscheide in der Aufgabe darunter Raum für Raum."),
        name="Fall: Familie Huber zieht ein")

    # 6 Üben: Hubers Wohnung (H5P Drag&Drop)  (← Der Weg, Fall)  [Lösung: Folie 15]
    dnd = H.drag_question(
        "Was kommt in welchen Raum?",
        zones=["Flur", "Arbeitszimmer", "Wohnzimmer", "Kinderzimmer"],
        elements=[("Router", 0), ("Switch", 1), ("Access Point", 3),
                  ("Netzwerkkabel zu TV und Konsole", 2), ("Telefonbuchse", 0), ("Handy und Tablet", 3)],
        width=760, height=440, cols=3)

    # 7 Üben: Wer bin ich? (H5P Lernkarten, Foto vorn)  [Quelle: Folie 16, Heftbilder]
    cards = H.dialog_cards(
        "Wer bin ich?",
        [("Wer bin ich?", "<b>Telefonbuchse</b><br>Bringt das Internetsignal in die Wohnung.", "", img["buchse"]),
         ("Wer bin ich?", "<b>Router</b><br>Verbindet das Heimnetz mit dem Internet – per Kabel oder WLAN.", "", img["router"]),
         ("Wer bin ich?", "<b>Netzwerkkabel</b><br>Überträgt Daten mit hoher Geschwindigkeit. Auch LAN-, Ethernet- oder CAT-Kabel.", "", img["kabel"]),
         ("Wer bin ich?", "<b>Switch</b><br>Macht aus einem Anschluss viele.", "", img["switch"]),
         ("Wer bin ich?", "<b>Access Point</b><br>Erzeugt WLAN – braucht immer ein Kabel zum Router.", "", img["accesspoint"]),
         ("Wer bin ich?", "<b>Endgeräte</b><br>Laptop, Handy, PC, Drucker, Konsole.", "", img["endgeraete"])],
        title="Wer bin ich?", description="")

    # 8 Sichern: Hefteintrag (Seite)  [Quelle: Folien 12–13]
    heft = Page("Hefteintrag: Netzwerkkomponenten",
                p("Übernimm die Tabelle ins Heft (quer). 10 Minuten.") +
                kv([(n, f"{f1} {f2}") for _, n, f1, f2 in KOMP], HUE),
                completion="view")

    # 9 Quiz (H5P, 6 Fragen)  (← alles davor)
    quiz = H.question_set(
        "Quiz Netzwerkkomponenten",
        [H.multichoice("Welche Komponente holt das Internet in die Wohnung?",
                       [("Router", True), ("Switch", False), ("Access Point", False), ("Netzwerkkabel", False)]),
         H.multichoice("Welche Komponente macht aus einem Netzwerkanschluss viele?",
                       [("Switch", True), ("Router", False), ("Telefonbuchse", False), ("Access Point", False)]),
         H.truefalse("Ein Access Point braucht immer eine Kabelverbindung zum Router.", True),
         H.truefalse("Ein Switch erzeugt ein WLAN-Signal.", False),
         H.multichoice("Wie heißt das Netzwerkkabel noch?",
                       [("Ethernet-, LAN- oder CAT-Kabel", True), ("USB-Kabel", False), ("HDMI-Kabel", False), ("Telefonkabel", False)]),
         H.multichoice("Im Kinderzimmer kommt kein WLAN an. Was hilft?",
                       [("Access Point im Kinderzimmer, per Kabel an den Router", True),
                        ("Switch im Kinderzimmer", False), ("Zweite Telefonbuchse", False), ("Das Handy näher an die Wand halten", False)])],
        pass_pct=80, intro_text="Sechs Fragen. Fünf richtige schließen die Einheit ab.", completion="pass")

    # Optional: Video als Link, wird von der Plattform eingebettet:
    # Url("Video: So funktioniert ein Router", "https://www.youtube.com/watch?v=…", display="embed")
    # Den Link liefert die Lehrkraft; ohne geprüften Link kein Platzhalter im Kurs.

    sec = Section("Netzwerkkomponenten – von der Wand aufs Handy",
                  items=[head, einstieg, weg, HvpItem(check), huber, HvpItem(dnd), HvpItem(cards), heft, HvpItem(quiz)])
    return {"sections": [Section(None, items=[]), sec], "parts": {"netz": sec}, "badges": [], "image_path": None}
