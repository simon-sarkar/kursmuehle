"""Testkurs aus den Formatzeilen des Katalogs (seit AP12a statt des Beispielkurses alltagskompetenz).

Setzt die `beispiel`-Auszüge aus references/katalog.yaml zu einem Kurs im Kachelformat mit zwei Teilen zusammen (jeder
Bausteintyp einmal, dazu Markieren und Lückentext im Lesebuch, ein Startbild der Geschichte und ein Unterabschnitt), damit
test_check.py und test_website.py Kacheln, Unterabschnitte, Delta, Website- und Textfeld-Modus weiter bauen. Kein
Beispielkurs: der Ordner entsteht zur Laufzeit in einem Temp-Verzeichnis, die Bilder kommen aus dem Fixture netzwerk9.

    from fixtures.katalogkurs import schreibe
    ordner = schreibe(tmp)        # -> <tmp>/katalogkurs mit kurs.md, steckbrief.yaml, assets/
"""
import os
import shutil

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

TEIL1 = ["Textfeld", "Seite", "Link", "Video", "Lesebuch", "Quiz", "Zuordnen", "Lernkarten", "Lückentext", "Umfrage",
         "Geschichte"]
TEIL2 = ["Unterabschnitt", "Test", "Aufgabe", "Datei", "Verzeichnis", "Forum", "Buch", "Abstimmung",
         "Glossar", "Badge"]
# Ergänzungen, damit Lesebuch, Geschichte und Unterabschnitt alle Fragetypen und Bilder zeigen; Titel bleiben eindeutig
ZUSATZ = {
    "Lesebuch": ("RF: Funk ist immer schneller als Kabel.", [
        "Markieren: Markiere die Geräte",
        "Im Flur stehen *Router* und *Switch*.",
        "Lückentext: Setze ein",
        "Der *Router* verbindet das Heimnetz mit dem *Internet*."]),
    "Geschichte": ("start: Morgen ist das Referat | Entscheide dich", ["bild: router.png"]),
    "Quiz": ("bestehen: 2 von 3", ["abschluss: ansehen"]),        # im Textfeld-Modus ein Block, keine Aktivität
}
# zweites Quiz als Block, damit der Textfeld-Test zwei Blöcke mit Auswahlfeldern hat
QUIZ2 = """### Quiz: Zweiter Check · 3 min
abschluss: ansehen
1. Was verteilt Funk im Haus? · ✔Access Point · Switch
2. RF: Ein Switch verbindet Geräte per Kabel. ✔
"""
UMBENENNEN = {"Unterabschnitt": ("#### Textfeld: Einstieg", "#### Textfeld: Start in die Lerneinheit")}
STECKBRIEF = {
    "kurs": {"titel": "Katalogkurs", "kurzname": "Katalogkurs", "beschreibung": "<p>Testkurs aus dem Katalog.</p>",
             "fach": "Informatik", "jahrgangsstufe": "9", "einsatz": "selbstlernkurs", "format": "kacheln",
             "umfang_min": 90, "design": {"vorlage": "kacheln", "banner": True, "emoji_marker": False}},
    "teile": {"t1": {"status": "pending", "titel": "Teil 1", "dauer_min": 45},
              "t2": {"status": "pending", "titel": "Teil 2", "dauer_min": 45}},
}


def _beispiel(e):
    text = e["beispiel"].rstrip("\n")
    if e["typ"] in ZUSATZ:
        nach, zeilen = ZUSATZ[e["typ"]]
        lines = text.splitlines()
        i = next(k for k, z in enumerate(lines) if z.startswith(nach))
        lines[i + 1:i + 1] = zeilen
        text = "\n".join(lines)
    if e["typ"] in UMBENENNEN:
        alt, neu = UMBENENNEN[e["typ"]]
        text = text.replace(alt, neu)
    return text


def schreibe(tmp):
    with open(os.path.join(ROOT, "references", "katalog.yaml"), encoding="utf-8") as f:
        kat = yaml.safe_load(f)
    typen = {e["typ"]: e for e in kat["typen"]}
    ordner = os.path.join(tmp, "katalogkurs")
    os.makedirs(os.path.join(ordner, "assets"), exist_ok=True)
    teile = ["# Drehbuch v1 · Katalogkurs · 90", "", "## Allgemeines", _beispiel(typen["Banner"]),
             _beispiel(typen["Überblick"]), ""]
    for n, liste in ((1, TEIL1), (2, TEIL2)):
        teile += [f"## Teil {n} · 45 min", f"teil: t{n}", "kachelbild: router.png", ""]
        teile += [_beispiel(typen[t]) + "\n" for t in liste]
        if n == 2:
            teile.append(QUIZ2)
    with open(os.path.join(ordner, "kurs.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(teile).rstrip("\n") + "\n")
    with open(os.path.join(ordner, "steckbrief.yaml"), "w", encoding="utf-8") as f:
        yaml.safe_dump(STECKBRIEF, f, allow_unicode=True, sort_keys=False)
    n9 = os.path.join(HERE, "netzwerk9", "assets")
    mod = os.path.join(HERE, "module", "assets")
    for quelle, ziel in ((os.path.join(n9, "banner.png"), "banner.png"), (os.path.join(n9, "router.png"), "router.png"),
                         (os.path.join(n9, "switch.png"), "badge.png"), (os.path.join(mod, "schloss.png"), "schloss.png"),
                         (os.path.join(mod, "arbeitsblatt.pdf"), "arbeitsblatt.pdf"),
                         (os.path.join(mod, "checkliste.pdf"), "checkliste.pdf")):
        shutil.copy(quelle, os.path.join(ordner, "assets", ziel))
    return ordner


if __name__ == "__main__":
    import sys
    print(schreibe(sys.argv[1] if len(sys.argv) > 1 else "."))
