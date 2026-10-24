"""Zeitbedarf je Rolle (AP12a §4, `mappe.zeitbedarf`, Werte in references/katalog.yaml `zeitbedarf`).

Anker des Autors für Jahrgangsstufe 9 Mittelschule: Erarbeitung eines neuen Inhalts etwa 60 Wörter je Minute, Einstieg
und Hinführung etwa 120, Hefteintrag abschreiben etwa 10, Übung je Aufgabe 1,5 Minuten, mit Rechenaufwand 3 Minuten,
nicht je Wort. Geprüft: diese Anker, der Faktor je Jahrgangsstufe, die Rolle aus der Phase vor der Rolle des Typs, die
Denkaufgabe im Kasten, der Hinweis an der Karte („Erarbeitung für 4 Minuten statt 15“) und dass die Werte aus dem
Katalog kommen (geänderter Katalog, geänderte Rechnung).

usage: python3 scripts/tests/test_zeitbedarf.py   (Exit 0 = alles gut)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import mappe as M  # noqa: E402

fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


def baustein(typ, titel, zeilen):
    return {"typ": typ, "titel": titel, "text": f"### {typ}: {titel}\n" + "\n".join(zeilen) + "\n"}


def text(woerter):
    return " ".join(["Wort"] * woerter)


def nah(a, b, toleranz=0.05):
    return a is not None and abs(a - b) <= toleranz


def main():
    z = M.katalog()["zeitbedarf"]
    ok(z["woerter_je_minute"]["lesen"] == 60 and z["woerter_je_minute"]["einstieg"] == 120 and z["abschreiben"] == 10
       and z["aufgabe_minuten"] == {"einfach": 1.5, "rechnen": 3} and z["jahrgang_faktor"][9] == 1.0,
       "Ankerwerte im Katalog: 60, 120, 10 Wörter je Minute, 1,5 und 3 Minuten je Aufgabe, Faktor 1 für Stufe 9")

    # Lesen nach Rolle, Jahrgangsstufe 9
    seite = baustein("Seite", "Der Satz", [text(600)])
    ok(nah(M.zeitbedarf(seite, "9", "lesen"), 10), f"Erarbeitung: 600 Wörter = 10 min ({M.zeitbedarf(seite, '9', 'lesen'):.2f})")
    feld = baustein("Textfeld", "Ein Fall", [text(240)])
    ok(nah(M.zeitbedarf(feld, "9", "einstieg"), 2), f"Einstieg: 240 Wörter = 2 min ({M.zeitbedarf(feld, '9', 'einstieg'):.2f})")
    heft = baustein("Seite", "Hefteintrag: Pythagoras", [text(100)])
    ok(nah(M.zeitbedarf(heft, "9", "sichern"), 10), f"Hefteintrag: 100 Wörter abschreiben = 10 min ({M.zeitbedarf(heft, '9', 'sichern'):.2f})")
    uebernimm = baustein("Seite", "Merksatz", ["Übernimm die Tabelle ins Heft.", text(49)])
    ok(nah(M.zeitbedarf(uebernimm, "9", "sichern"), 5.4), "„Übernimm … ins Heft“ zählt im Abschreibtempo (54 Wörter)")
    ok(M.zeitbedarf(seite, "9") == M.zeitbedarf(seite, "9", "lesen"), "ohne Phase gilt die Rolle des Typs (Seite = lesen)")

    # Jahrgangsstufe skaliert
    f5, f11 = z["jahrgang_faktor"][5], z["jahrgang_faktor"][11]
    ok(nah(M.zeitbedarf(seite, "5", "lesen"), 600 / (60 * f5)) and nah(M.zeitbedarf(seite, "11", "lesen"), 600 / (60 * f11)),
       f"Jahrgangsstufe 5 langsamer, 11 schneller ({M.zeitbedarf(seite, '5', 'lesen'):.1f} / {M.zeitbedarf(seite, '11', 'lesen'):.1f} min)")
    ok(M.zeitbedarf(seite, "", "lesen") == M.zeitbedarf(seite, "9", "lesen"), "ohne Jahrgangsstufe gilt Stufe 9")

    # Übung je Aufgabe, nicht je Wort
    einfach = baustein("Quiz", "Begriffe", [f"{i}. Welche Seite liegt dem rechten Winkel gegenüber? · ✔Hypotenuse · Kathete"
                                            for i in range(1, 5)])
    ok(nah(M.zeitbedarf(einfach, "9", "üben"), 6), f"4 Aufgaben ohne Rechnung = 6 min ({M.zeitbedarf(einfach, '9', 'üben'):.2f})")
    lang = baustein("Quiz", "Lang", [f"{i}. {text(80)}? · ✔a · b" for i in range(1, 5)])
    ok(nah(M.zeitbedarf(lang, "9", "üben"), 6), "lange Aufgabentexte zählen nicht je Wort")
    rechnen = baustein("Quiz", "Rechnen", ["1. Einsetzen: Berechne die Hypotenuse.", "c² = 3² + 4² = *25*", "c = *5* cm",
                                           "2. MC: Wie lang ist c bei a = 6 cm und b = 8 cm? · ✔10 cm · 14 cm",
                                           "3. RF: 5² = 25 ✔", "4. RF: Ein Dreieck hat drei Seiten. ✔"])
    ok(nah(M.zeitbedarf(rechnen, "9", "üben"), 3 + 3 + 3 + 1.5),
       f"Aufgaben mit Rechenausdruck oder zwei Größen = 3 min, sonst 1,5 ({M.zeitbedarf(rechnen, '9', 'üben'):.2f})")
    zuordnen = baustein("Zuordnen", "Seiten", ["zonen: Kathete | Hypotenuse"] + [f"- Seite {i} → Kathete" for i in range(9)])
    ok(nah(M.zeitbedarf(zuordnen, "9", "üben"), 9 * z["sekunden"]["zuordnung"] / 60), "Zuordnen: Sekunden je Element")
    kurz = baustein("Zuordnen", "Kurz", ["zonen: A | B", "- x → A", "- y → B"])
    ok(nah(M.zeitbedarf(kurz, "9", "üben"), 1.5), "Zuordnen mit wenigen Elementen: mindestens eine Aufgabe")

    # Denkaufgabe im Kasten (Einstieg)
    einstieg = baustein("Textfeld", "Die Leiter", [text(120), "Kasten: Denk kurz nach", "  Reicht die Leiter bis zum Fenster?"])
    ok(nah(M.zeitbedarf(einstieg, "9", "einstieg"), 1.5 + 128 / 120, 0.1),
       f"Kasten mit Frage = eine Denkaufgabe ({M.zeitbedarf(einstieg, '9', 'einstieg'):.2f} min)")

    # Rolle aus der Phase vor der Rolle des Typs, Hinweis an der Karte nennt die Lücke
    kurs = ("# Drehbuch v1 · P\n\n## P · 45 min\n### Seite: Der Satz · 15 min\nid: b1\n" + text(240) + "\n"
            "### Seite: Hefteintrag · 3 min\nid: b2\n" + text(30) + "\n")
    pr = api.pruefe(kurs)
    mappe = M.neu("P", einheit={"thema": "P", "jahrgang": "9", "minuten": 45})
    M.abgleich(mappe, pr["bausteine"])
    mappe["bausteine"][0].update(phase="Erarbeitung", soll=15)
    mappe["bausteine"][1].update(phase="Sicherung", soll=3)
    k = M.kennzahlen(mappe, pr)
    z1 = k["zeit"]["b1"]
    ok(z1["gerechnet"] == 4 and z1["abweichung"] and z1["text"] == "Erarbeitung für 4 Minuten statt 15",
       f"Hinweis an der Karte nennt die Lücke ({z1})")
    ok(not k["zeit"]["b2"]["abweichung"], f"Hefteintrag 30 Wörter in 3 min ohne Hinweis ({k['zeit']['b2']})")
    ok(any(h["art"] == "zeit" and h["text"] == "Baustein 1: Erarbeitung für 4 Minuten statt 15" for h in k["hinweise"]),
       "die Lücke steht auch am Rand")
    mappe["bausteine"][0]["phase"] = "Einstieg"
    ok(M.kennzahlen(mappe, pr)["zeit"]["b1"]["gerechnet"] == 2, "Phase Einstieg rechnet mit 120 Wörtern je Minute")

    # Werte kommen aus dem Katalog
    alt = z["woerter_je_minute"]["lesen"]
    z["woerter_je_minute"]["lesen"] = 120
    try:
        ok(nah(M.zeitbedarf(seite, "9", "lesen"), 5), "geänderter Katalogwert ändert die Rechnung")
    finally:
        z["woerter_je_minute"]["lesen"] = alt
    ok(M.zeitbedarf(baustein("Video", "V", ["https://www.example.org/v"]), "9") is None
       and M.zeitbedarf(baustein("Banner", "B", ["untertitel: x"]), "9") is None, "Video und Kursbanner ohne Rechnung")

    if fehler:
        print(f"\n{len(fehler)} Fehler")
        return 1
    print("\nalles gut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
