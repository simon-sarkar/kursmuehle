"""Abschnitt 0 (Start) and the exemplary Themenfelder 2–8. v2."""
from gen import h5p as H
from gen.mbz import Label, Page, Section, HvpItem, Feedback
from content.common import img, lead, p, box, steps, kv
from content.cards import tf_strip, fahrplan, tf_info
from content.tf1 import SCALE, SELF_ITEMS, LE

HUES = {1: "#1D5FD1", 2: "#6D28D9", 3: "#0F766E", 4: "#15803D", 5: "#B45309", 6: "#BE123C", 7: "#4F46E5", 8: "#C2410C"}
ICONS = {1: "🔍", 2: "🔐", 3: "🧠", 4: "🥗", 5: "💶", 6: "🧾", 7: "🏠", 8: "💬"}
LE_ICONS = {1: "📖", 2: "🔎", 3: "🤖", 4: "🔀"}

LK = [("LK 1", "Informieren und Problemlösen", "Probleme zerlegen, gezielt suchen, KI nutzen und prüfen"),
      ("LK 2", "Selbstfürsorge", "eigene Grenzen und Warnsignale erkennen, Hilfe holen"),
      ("LK 3", "Verantwortung und Vorausplanung", "Folgen für Geld, Daten und Verträge abschätzen"),
      ("LK 4", "Kommunikation und Handeln", "Anliegen vertreten, Konflikte lösen, Institutionen nutzen")]

OTHERS = [
    (2, "Digitale Selbstbestimmung", "LK 2, LK 3",
     "Du schützt deine Daten und Geräte und gestaltest deinen Medienkonsum bewusst.",
     ["Passwörter, Zwei-Faktor, Backups, Updates",
      "Phishing, Fake-Shops, Deepfakes erkennen",
      "Digitaler Fußabdruck, Recht am eigenen Bild, Bildschirmzeit"],
     "Phishing-Geschichte (Branching), Passwort-Check, Datenspuren-Quiz"),
    (3, "Mentale Gesundheit und Selbstfürsorge", "LK 2, LK 4",
     "Du erkennst Belastungen bei dir und anderen, kennst Strategien zur Selbstregulation und weißt, wo es Hilfe gibt.",
     ["Stress verstehen: Warnsignale, Schlaf, Erholung",
      "Leistungsdruck, Prüfungsangst, Vergleich auf Social Media",
      "Grenzen setzen, Nein sagen, Hilfe holen"],
     "Geschichte „Die Woche vor der Probe“, Mythen-Check, Hilfe-Wegweiser"),
    (4, "Körper, Ernährung und Gesundheitssystem", "LK 2, LK 3",
     "Du triffst gesundheitsbewusste Alltagsentscheidungen und findest dich im Gesundheitssystem zurecht.",
     ["Günstig und ausgewogen einkaufen, kochen, lagern",
      "Krankenkasse, Hausarzt, Facharzt, Notfall oder Bereitschaftsdienst",
      "Erste Hilfe; Risiken: Alkohol, Nikotin, Lootboxen"],
     "Wochen-Einkauf-Simulation, Wer-hilft-wann-Zuordnung, Erste-Hilfe-Karten"),
    (5, "Geld und Finanzen", "LK 1, LK 3",
     "Du planst deine Finanzen realistisch und erkennst Kostenfallen und Schuldenrisiken.",
     ["Einnahmen, Ausgaben, Girokonto, Karten, Online-Banking",
      "Sparen, Zinsen, Zinseszins, Inflation, ETF",
      "Ratenkauf, „Buy now, pay later“, Schuldenspirale, Gehaltszettel"],
     "Budget-Rechner, Zinseszins-Experiment, Kostenfallen-Quiz"),
    (6, "Konsum, Verträge und Rechte", "LK 3, LK 4",
     "Du handelst als informierte Verbraucherin oder Verbraucher und setzt deine Rechte durch.",
     ["Verträge unter 18, Taschengeldparagraf, AGB verstehen",
      "Abos, Kündigungsfristen, Widerruf, Gewährleistung und Garantie",
      "Beschwerde schreiben, Verbraucherzentrale, Greenwashing erkennen"],
     "Kündigungsschreiben-Baukasten, AGB-Lückentext, Greenwashing-Check"),
    (7, "Wohnen, Haushalt und Bürokratie", "LK 3, LK 4",
     "Du organisierst einen eigenen Haushalt und bewältigst Behördengänge selbstständig.",
     ["Mietvertrag, Kaution, Nebenkosten, Wohnungsübergabe",
      "Versicherungen: Haftpflicht zuerst, der Rest nach Bedarf",
      "Formulare, Anmeldung, Steuererklärung light, Haushalt praktisch"],
     "Erste-Wohnung-Geschichte (Branching), Formular-Trainer, Versicherungs-Zuordnung"),
    (8, "Ich und die anderen", "LK 2, LK 4",
     "Du kommunizierst klar und respektvoll, löst Konflikte konstruktiv und organisierst Zeit und Ziele.",
     ["Zeitmanagement, Prioritäten, Prokrastination, Gewohnheiten",
      "Gespräche führen: Feedback, Verhandeln, Telefonieren, E-Mail an Fremde",
      "Konflikte lösen, Zivilcourage, Umgang mit Hate Speech"],
     "E-Mail-Baukasten, Konflikt-Geschichte (Branching), Wochenplan-Werkzeug"),
]
TF_TITLES = {1: "Probleme selbst lösen", **{n: t for n, t, *_ in OTHERS}}


def start_section(A):
    banner = Label(img("kurs.png", "Alltagskompetenz – Selbstlernkurs") +
                   tf_strip([(n, TF_TITLES[n], HUES[n], n == 1, ICONS[n]) for n in range(1, 9)]),
                   files=[(A["kurs.png"][0], "kurs.png")], name="Willkommen")
    intro = Page(
        "So funktioniert der Kurs",
        lead("Ein Problem selbst lösen, auf dich achten, mit Geld umgehen, Verträge verstehen: Dinge, die quer zu allen Fächern "
             "liegen und die du trotzdem jede Woche brauchst.") +
        p("Du arbeitest allein, in deinem Tempo. Jede Lerneinheit beginnt mit einem Lesebuch, in das kurze Aufgaben eingebaut sind, "
          "danach kommen Übungen. Der Fortschrittsbalken zeigt, was fertig ist. Noten gibt es keine; den Abschlusstest am Ende eines "
          "Themenfelds kannst du so oft wiederholen, wie du willst.") +
        box("Vier Fähigkeiten, die sich durch alle Themen ziehen",
            kv([(k, f"<b>{t}</b> – {d}") for k, t, d in LK], "#1D5FD1"), "#1D5FD1") +
        p("Themenfeld 1 ist vollständig. Die Themenfelder 2 bis 8 sind angelegt und zeigen, was dort entsteht."),
        completion="view")
    before = Feedback(
        "Selbsteinschätzung vorher",
        "<p>Drei Sätze, eine Minute. Am Ende vergleichst du mit dir selbst, mit niemandem sonst.</p>",
        [(t, SCALE) for t in SELF_ITEMS],
        after_text="<p>Danke. Weiter mit Themenfeld 1.</p>")
    return Section(None, items=[banner, intro, before])


def tf1_header(A):
    return Label(img("tf1.png", "Themenfeld 1 – Probleme selbst lösen") +
                 fahrplan([(n, LE[n][0], LE[n][2], LE_ICONS[n]) for n in range(1, 5)], HUES[1]),
                 files=[(A["tf1.png"][0], "tf1.png")], name="Fahrplan")


def other_sections(A, with_examples=True):
    secs = []
    for num, title, lk, kompetenz, les, formats in OTHERS:
        hue = HUES[num]
        items = [Label(img(f"tf{num}.png", f"Themenfeld {num} – {title}") + tf_info(kompetenz, les, formats, hue),
                       files=[(A[f"tf{num}.png"][0], f"tf{num}.png")], name="Überblick")]
        if with_examples and num == 3:
            items.append(HvpItem(_tf3_quiz()))
        if with_examples and num == 5:
            items.append(HvpItem(_tf5_quiz()))
        secs.append(Section(f"TF {num} · {title}", items=items))
    return secs


def _tf3_quiz():
    return H.question_set(
        "Beispiel: Mythen-Check",
        [H.truefalse("Wer wenig schläft, gewöhnt sich mit der Zeit daran und braucht weniger Schlaf.", False,
                     "Stimmt, die Aussage ist falsch: Der Körper gewöhnt sich nicht, er merkt nur nicht mehr, wie müde er ist.",
                     "Der Körper gewöhnt sich nicht, er merkt nur nicht mehr, wie müde er ist."),
         H.truefalse("Über eine Belastung zu reden macht sie meistens kleiner, nicht größer.", True,
                     "Genau. Aussprechen ordnet.", "Doch: Aussprechen ordnet, und der andere trägt mit."),
         H.multichoice("Was ist ein Warnsignal für zu viel Stress?",
                       [("Wochenlang schlecht schlafen, ständig gereizt, nichts macht mehr Spaß", True),
                        ("Ein anstrengender Tag vor einer Probe", False), ("Müdigkeit nach dem Sport", False),
                        ("Keine Lust auf Hausaufgaben", False)]),
         H.multichoice("Es ist 2 Uhr nachts, es geht dir sehr schlecht, und du willst mit jemandem reden. Wo bekommst du jetzt anonym Hilfe?",
                       [("Telefonseelsorge 0800 111 0 111 – rund um die Uhr, kostenlos", True),
                        ("Nummer gegen Kummer 116 111 – die ist aber nur tagsüber erreichbar", False,
                         "Das Kinder- und Jugendtelefon ist Montag bis Samstag von 14 bis 20 Uhr erreichbar. Nachts: Telefonseelsorge."),
                        ("Erst morgen früh, nachts ist alles geschlossen", False),
                        ("Im Kommentarbereich eines Videos", False)]),
         H.truefalse("Hilfe zu holen ist ein Zeichen von Schwäche.", False,
                     "Stimmt, die Aussage ist falsch: Hilfe holen ist eine Fähigkeit.",
                     "Hilfe holen ist eine Fähigkeit. Bei akuter Gefahr: 112.")],
        pass_pct=60, intro_text="Fünf Aussagen über Stress, Schlaf und Hilfe.", completion="view")


def _tf5_quiz():
    return H.question_set(
        "Beispiel: Kostenfallen",
        [H.multichoice("Ein Handy für 29 € im Monat über 24 Monate plus 1 € Anzahlung. Was kostet es insgesamt?",
                       [("697 €", True, "29 × 24 = 696, plus 1 € Anzahlung."), ("29 €", False), ("348 €", False), ("725 €", False)]),
         H.multichoice("„Jetzt kaufen, in 30 Tagen zahlen“ – was passiert, wenn du in 30 Tagen nicht zahlst?",
                       [("Mahngebühren, dann Inkasso; bleibt die Forderung offen, kann ein Schufa-Eintrag folgen", True),
                        ("Nichts, das ist ein Geschenk des Shops", False),
                        ("Der Shop holt die Ware zurück, damit ist es erledigt", False), ("Die Rechnung verfällt", False)]),
         H.truefalse("Ein Dispo-Kredit ist eine günstige Art, Geld zu leihen.", False,
                     "Stimmt, die Aussage ist falsch: Dispo-Zinsen gehören zu den teuersten Krediten.",
                     "Dispo-Zinsen gehören zu den teuersten Krediten."),
         H.multichoice("Was bedeutet „Brutto“ auf dem Gehaltszettel?",
                       [("Das Gehalt vor Abzug von Steuern und Sozialversicherung", True), ("Das, was aufs Konto kommt", False),
                        ("Das Gehalt inklusive Weihnachtsgeld", False), ("Das Gehalt ohne Überstunden", False)]),
         H.multichoice("100 € bei 3 % Zinsen pro Jahr, 10 Jahre, Zinsen bleiben auf dem Konto. Wie viel ist es dann, auf den Euro gerundet?",
                       [("134 €", True, "100 × 1,03 hoch 10 = 134,39 €. Zinseszins."), ("130 €", False, "Das wären 3 € pro Jahr ohne Zinseszins."),
                        ("103 €", False), ("300 €", False)])],
        pass_pct=60, intro_text="Fünf Fragen zu Geld.", completion="view")
