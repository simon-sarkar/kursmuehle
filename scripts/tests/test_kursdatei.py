"""Regressionstest für den Kursdatei-Parser: Beispiele bauen, Fehlerfälle nennen Zeile und Element.

usage: python3 scripts/tests/test_kursdatei.py   (Exit 0 = alles gut)
"""
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from gen import html as T  # noqa: E402
from gen.h5p import ImageRef  # noqa: E402
from gen.kursdatei import KursdateiFehler, parse  # noqa: E402

PNG = os.path.join(ROOT, "examples", "netzwerk9", "assets", "router.png")
A = {"router.png": (PNG, ImageRef(PNG, 10, 10))}

# (Kursdatei, erwarteter Teil der Fehlermeldung)
FEHLER = [
    ("## A\n### Buch: X\ntext", "Zeile 2: unbekannter Elementtyp „Buch“"),
    ("## A\n### Quiz: X\nbestehn: 80 %\n1. F? · ✔a · b", "Zeile 3 (Quiz „X“): unbekannte Angabe „bestehn“"),
    ("## A\n### Textfeld: X\nBild: fehlt.png | alt", "Zeile 3 (Textfeld „X“): Bild „fehlt.png“ nicht in assets/"),
    ("## A\n### Banner: X\nbild: fehlt.png", "Zeile 2 (Banner „X“): Bild „fehlt.png“ nicht in assets/"),
    ("## A\n### Quiz: X\n1. F? · a · b", "Zeile 3 (Quiz „X“): MC ohne ✔"),
    ("## A\n### Textfeld: X\nKasten: Titel\nNicht eingerückt", "Zeile 3 (Textfeld „X“): Kasten ohne Inhalt"),
    ("## A\n### Zuordnen: X\nzonen: A | B\n- e → C", "Zeile 4 (Zuordnen „X“): Zone „C“ nicht in zonen"),
    ("## A\n### Geschichte: X\nSzene (s): T → nix\nText", "Zeile 3 (Geschichte „X“): Ziel „nix“ unbekannt"),
    ("## A\n### Badge: B\nbild: router.png\nvoraussetzung: Nix", "Zeile 2 (Badge „B“): voraussetzung „Nix“: 0 Elemente"),
    ("## A\nText ohne Element", "Zeile 2: Text außerhalb eines Elements"),
    ("## A\n### Textfeld: X\nMC: F? · ✔a · b", "Zeile 3 (Textfeld „X“): MC ist nur in Lesebuch oder Quiz erlaubt"),
    ("## A\n#### Textfeld: X\nt", "Zeile 2: Überschrift der Ebene 3"),
    ("## A\n### Lesebuch: X\nAbsatz ohne Seite", "Lesebuch: erste Zeile muss `Seite: Titel` sein"),
    ("## A\n### Quiz: X\nbestehen: 5 von 4\n1. F? · ✔a · b", "bestehen „5 von 4“: das Quiz hat 1 Fragen"),
    ("## A\nteil: x\n## B\nteil: x\n### Textfeld: T\nt", "Zeile 3 (Abschnitt „B“): teil „x“ ist schon vergeben"),
    ("## A\n### Textfeld: X\n| a | b | c |\n| d | e | f |", "Zeile 3 (Textfeld „X“): Tabelle: ohne Kopfzeile zwei Spalten"),
    ("## A\n### Textfeld: X\n| a | b |\n|---|---|\n| d | e | f |", "Zeile 3 (Textfeld „X“): Tabelle: alle Zeilen brauchen gleich viele Spalten"),
    ("## A\n### Textfeld: X\nSchritte: Titel\nkein Listenpunkt", "Zeile 3 (Textfeld „X“): Schritte: Liste"),
]

# Textbausteine (AP4): jede Zeile ein Baustein, erwarteter Teil des HTML
BAUSTEINE = """## A
### Überblick: Karte
dauer: 10 min
- Lesen: a
### Seite: S
Überschrift: Zwischen
Hervorhebung: Kern
Ein ==markierter== Satz.
Schritte: Anleitung
1. Eins
2. Zwei
| M | R | S |
|---|---|---|
| a | b | c |
| x | y | z |
Bild: router.png | Alt | Unterschrift
"""
ERWARTET = ["<h3 ", ">Zwischen</h3>", "Kern</p>", "border-radius:3px\">markierter</span>", ">Anleitung</div>", ">2</span>",
            "border-bottom:2px solid", ">M</td>", ">z</td>", "Unterschrift</span>"]


OK = """# Drehbuch v1 · Test · 5 min
v2: Änderung
Angenommen: Jgst 9
Bildwunsch: banner.png | 1600 × 420 | ruhiges Motiv
farbe: #0F766E
## Allgemeines
### Banner: Test
bild: router.png
untertitel: Ein Satz
### Textfeld: Hallo
Vorspann: Hi [KI]
## Teil · 5 min
teil: t1
sichtbar ab: 2026-11-03
### Video: Clip (2 min)
https://www.youtube.com/watch?v=x
### Quiz: Q (← alles)
bestehen: 2 von 3
1. F? · ✔a · b
2. RF: Aussage ✘ → richtig: Ja. → falsch: Nein.
3. Lückentext (L): Aufgabe
Ein *Wort* fehlt.
### Lernkarten: K
- Vorn → Hinten · Bild: router.png
Zeit Teil: 5 min ✔ (Soll 5)
"""


def check_fehler():
    bad = 0
    with tempfile.TemporaryDirectory() as d:
        for i, (src, want) in enumerate(FEHLER):
            path = os.path.join(d, "kurs.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(src)
            try:
                parse(path, A, {"teile": {}})
                print(f"FEHLT  Fall {i}: kein Fehler, erwartet „{want}“")
                bad += 1
            except KursdateiFehler as e:
                if want not in str(e):
                    print(f"FALSCH Fall {i}: {e}\n       erwartet „{want}“")
                    bad += 1
        path = os.path.join(d, "kurs.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(OK)
        k = parse(path, A, {"teile": {}})
        secs = k["sections"]
        assert secs[0].name is None and secs[1].name == "Teil", [s.name for s in secs]
        assert list(k["parts"]) == ["t1"] and secs[1].available_from, k["parts"]
        names = [it.name for it in secs[1].items]
        assert names == ["Clip", "Q", "K"], names
        assert secs[1].items[1].hvp.gradepass == 1.98, secs[1].items[1].hvp.gradepass   # 3 Fragen, 66 %
        assert secs[0].items[0].name == "Test" and "router.png" in secs[0].items[0].intro, secs[0].items[0].intro[:80]
        assert "Hi" in secs[0].items[1].intro and "[KI]" not in secs[0].items[1].intro
        # Textbausteine: ohne Banner trägt die Überblickskarte ihren Titel, mit Banner nicht
        with open(path, "w", encoding="utf-8") as f:
            f.write(BAUSTEINE)
        k = parse(path, A, {"teile": {}})
        card, page = k["sections"][1].items
        assert ">Karte</div>" in card.intro and "Ablauf" not in card.intro, card.intro[:200]
        for want in ERWARTET:
            if want not in page.content:
                print(f"BAUSTEIN fehlt: {want}")
                bad += 1
        with open(path, "w", encoding="utf-8") as f:
            f.write("## Allgemeines\n### Banner: Karte\nuntertitel: U\n" + BAUSTEINE)
        card = parse(path, A, {"teile": {}})["sections"][1].items[0]
        assert ">Karte</div>" not in card.intro and "Ablauf · 10 min" in card.intro, card.intro[:200]
        # Designvorlagen: jede baut, unbekannte Namen sind ein Fehler
        for v in T.VORLAGEN:
            T.set_vorlage(v)
            parse(path, A, {"teile": {}})
        T.set_vorlage("schlicht")
        try:
            T.set_vorlage("bunt")
            print("FEHLT  Vorlage „bunt“ wurde angenommen")
            bad += 1
        except ValueError:
            pass
    return bad


def check_beispiele():
    bad = 0
    for name in ("netzwerk9", "alltagskompetenz"):
        out = os.path.join(tempfile.gettempdir(), f"test_{name}.mbz")
        r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build.py"), "--content",
                            os.path.join(ROOT, "examples", name), "--no-render", "--out", out],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"BAU {name} fehlgeschlagen:\n{r.stderr}")
            bad += 1
        else:
            os.remove(out)
    return bad


if __name__ == "__main__":
    n = check_fehler() + check_beispiele()
    print("OK" if n == 0 else f"{n} Problem(e)")
    sys.exit(1 if n else 0)
