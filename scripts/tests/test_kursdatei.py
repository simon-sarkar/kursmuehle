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
from fixtures import katalogkurs  # noqa: E402

PNG = os.path.join(ROOT, "scripts", "tests", "fixtures", "netzwerk9", "assets", "router.png")
A = {"router.png": (PNG, ImageRef(PNG, 10, 10))}

# (Kursdatei, erwarteter Teil der Fehlermeldung)
FEHLER = [
    ("## A\n### Wiki: X\ntext", "Zeile 2: unbekannter Elementtyp „Wiki“"),
    ("## A\n### Buch: X\nAbsatz ohne Kapitel", "Zeile 3 (Buch „X“): Buch: erste Zeile muss `Kapitel: Titel` sein"),
    ("## A\n### Test: X\n1. F? · ✔a · b\n2. Einsetzen: Aufgabe\n*Wort*", "Zeile 4 (Test „X“): Test: jede Frage beginnt mit"),
    ("## A\n### Test: X\nabschluss: abgabe\n1. F? · ✔a · b", "Zeile 2 (Test „X“): abschluss „abgabe“: erlaubt sind"),
    ("## A\n### Test: X\n3. Kurzantwort: F?", "Zeile 3 (Test „X“): Kurzantwort: `Frage? · Antwort · Alternative`"),
    ("## A\n### Datei: X\ntext", "Zeile 2 (Datei „X“): Datei: `datei: name.pdf` fehlt"),
    ("## A\n### Datei: X\ndatei: fehlt.pdf", "Zeile 2 (Datei „X“): Datei „fehlt.pdf“ nicht in assets/"),
    ("## A\n### Verzeichnis: X\nnur Text", "Zeile 2 (Verzeichnis „X“): Verzeichnis ohne Dateien"),
    ("## A\n### Aufgabe: X\nabgabe: audio\nt", "Zeile 2 (Aufgabe „X“): abgabe „audio“"),
    ("## A\n### Aufgabe: X\nfällig: 3.11.\nt", "Zeile 2 (Aufgabe „X“): fällig „3.11.“: Datum als JJJJ-MM-TT"),
    ("## A\n### Forum: X\ntyp: news\nt", "Zeile 2 (Forum „X“): typ „news“"),
    ("## A\n### Abstimmung: X\n- nur eine", "Zeile 2 (Abstimmung „X“): Abstimmung: mindestens zwei Optionen"),
    ("## A\n### Glossar: X\n- Begriff ohne Pfeil", "Zeile 3 (Glossar „X“): Glossar-Eintrag: `- Begriff → Erklärung` erwartet"),
    ("## A\n### Textfeld: X\nKapitel: K", "Zeile 3 (Textfeld „X“): „Kapitel:“ ist nur im Buch erlaubt"),
    ("## A\n### Quiz: X\n1. Kurzantwort: F? · a", "Zeile 3 (Quiz „X“): Quiz: jede Frage beginnt mit"),
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
    ("## A\nkachelbild: fehlt.png\n### Textfeld: X\nt", "Zeile 1 (Abschnitt „A“): Bild „fehlt.png“ nicht in assets/"),
    ("## A\nkachelicon: Book Icon\n### Textfeld: X\nt", "Zeile 1 (Abschnitt „A“): kachelicon „Book Icon“"),
    ("## A\nwebsite: vielleicht\n### Textfeld: X\nt", "Zeile 1 (Abschnitt „A“): website „vielleicht“: erlaubt sind ja"),
    ("## A\nwebsite: ja\n### Textfeld: X\nwebsite: ja\nt", "Zeile 3 (Textfeld „X“): website am Element: nur `website: nein`"),
    ("## A\nwebsite: ja\n### Quiz: X\n1. F? · a · b", "Zeile 4 (Quiz „X“): MC ohne ✔"),
    ("## A\nwebsite: textfeld\n### Quiz: X\nwebsite: textfeld\n1. F? · ✔a · b", "Zeile 3 (Quiz „X“): website am Element: nur `website: nein`"),
    ("## A\nwebsite: textfeld\n### Lernkarten: X\n- ohne Pfeil", "Zeile 4 (Lernkarten „X“): Lernkarte: `Vorderseite → Rückseite` erwartet"),
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
Abweichung: Quiz vor der Seite, Wunsch der Lehrkraft (D1)
Offen: Frage 1 widerspricht Folie 3
Bildwunsch: banner.png | 1600 × 420 | ruhiges Motiv
Hinweis: steht falsch im Kopf, darf farbe nicht schlucken
farbe: #0F766E
## Allgemeines
### Banner: Test
bild: router.png
untertitel: Ein Satz
### Textfeld: Hallo · 1 min [Quelle: Folie 1] [Zweck: begrüßen]
Abweichung: unter dem Element
Vorspann: Hi [KI] [Zweck: Einstieg]
Offen: unter dem Element
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
### Test: T
bestehen: 50 %
versuche: 3
1. F? · ✔a · b
2. MC: Mehrere?
- ✔ a → gut
- ✔ b
- c → nein
3. RF: Aussage ✘ → richtig: Ja. → falsch: Nein.
4. Kurzantwort (K): Wie? · Antwort · Alternative
### Buch: B
Kapitel: Eins
Text eins.
Bild: router.png | Router
Unterkapitel: Eins a
Text.
Kapitel: Zwei
- Punkt
### Abstimmung: A
mehrfach: ja
Frage?
- x
- y
### Glossar: G
| Begriff | Erklärung | Alias |
- Zwei → Zweite Erklärung
### Forum: F
abschluss: beitrag
Text.
### Aufgabe: Auf
abgabe: text, datei
bewertung: 20
bestehen: 50 %
fällig: 2026-12-01
Text.
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
        assert names == ["Clip", "Q", "K", "T", "B", "A", "G", "F", "Auf"], names
        assert secs[1].items[1].hvp.gradepass == 1.98, secs[1].items[1].hvp.gradepass   # 3 Fragen, 66 %
        assert secs[0].items[0].name == "Test" and "router.png" in secs[0].items[0].intro, secs[0].items[0].intro[:80]
        assert "Hi" in secs[0].items[1].intro and "[KI]" not in secs[0].items[1].intro
        # Drehbuch-Marker und -Zeilen landen nie im Kurs; eine fremde Kopfzeile schluckt farbe: nicht
        for meta in ("Zweck", "begrüßen", "Quelle", "Abweichung", "Offen", "unter dem Element"):
            assert meta not in secs[0].items[1].intro + secs[0].items[1].name, (meta, secs[0].items[1].intro)
        assert secs[0].items[1].name == "Hallo", secs[0].items[1].name
        from gen import kursdatei
        assert kursdatei._HUE == "#0F766E", kursdatei._HUE
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
        test, buch, abst, glos, forum, auf = secs[1].items[3:]
        assert [q.qtype for q in test.questions] == ["multichoice", "multichoice", "truefalse", "shortanswer"]
        assert test.grademax == 4 and test.gradepass == 2.0 and test.attempts == 3 and test.completion == "pass"
        assert test.questions[0].single and not test.questions[1].single
        assert test.questions[1].fractions()[2][1] < 0, test.questions[1].fractions()   # falsche Antwort bei Mehrfachauswahl negativ
        assert test.questions[2].correct is False and test.questions[2].feedback_false == "Ja."
        assert [a for a, _ in test.questions[3].answers] == ["Antwort", "Alternative"] and test.questions[3].name == "K"
        assert [(c[0], c[3]) for c in buch.chapters] == [("Eins", False), ("Eins a", True), ("Zwei", False)]
        assert buch.chapters[0][2] and "router.png" in buch.chapters[0][1] and not buch.chapters[1][2]
        assert abst.options == ["x", "y"] and abst.multiple and abst.completion == "submit"
        assert [e[0] for e in glos.entries] == ["Begriff", "Zwei"] and glos.entries[0][2] == ["Alias"]
        assert forum.completion == "post" and forum.type == "general"
        assert auf.submission == {"onlinetext", "file"} and auf.grade == 20 and auf.gradepass == 10 and auf.duedate
        bad += check_textfeld(path)
    return bad


TEXTFELD = """## Allgemeines
### Überblick: Kurs
- Lesen: alles
## Teil
website: textfeld
### Überblick: Teil
- Üben: Quiz
### Textfeld: Lesen
Ein Absatz.
### Quiz: Q1
abschluss: ansehen
1. F? · ✔a · b
### Lernkarten: L
- Vorne → Hinten · Bild: router.png
### Quiz: Q2
website: nein
1. G? · ✔c · d
### Lesebuch: B
Seite: S
Text.
### Quiz: Q3
abschluss: ansehen
1. H? · ✔e · f
### Quiz: Q4
bestehen: 80 %
1. I? · ✔g · h
### Zuordnen: Z
abschluss: bestehen
zonen: A | B
- x → A
### Badge: Abzeichen
bild: router.png
voraussetzung: Q3
"""


def check_textfeld(path):
    """Textfeld-Modus (AP7b): Übungen ohne Abschluss „bestehen“ werden Blöcke; Abschlussrelevantes (Q4, Z), Badge-
    Voraussetzung (Q3), `website: nein` (Q2) und Lesebuch bleiben H5P. Kachelformat ohne Überblick in Allgemeines."""
    bad = 0
    from gen.mbz import HvpItem, Label
    with open(path, "w", encoding="utf-8") as f:
        f.write(TEXTFELD)
    k = parse(path, A, {"teile": {}})
    allg, teil = k["sections"][0].items, k["sections"][1].items
    typen = [(it.name, type(it).__name__) for it in teil]
    want = [("Überblick", "Label"), ("Lesen", "Label"), ("Q1", "Label"), ("L", "Label"), ("Q2", "HvpItem"),
            ("B", "HvpItem"), ("Q3", "HvpItem"), ("Q4", "HvpItem"), ("Z", "HvpItem")]
    if typen != want:
        print(f"FALSCH Textfeld-Modus: {typen}\n       erwartet {want}")
        bad += 1
    q1, lk = teil[2], teil[3]
    ids = [it.intro.split('id="', 1)[1][:12] for it in (q1, lk)]
    if not (all(i.startswith("kmb-") for i in ids) and ids[0] != ids[1]):
        print(f"FALSCH Textfeld-Modus: Block-ids {ids}")
        bad += 1
    if not (lk.files and lk.files[0][1] == "router.png" and 'src="@@PLUGINFILE@@/router.png"' in lk.intro):
        print(f"FALSCH Textfeld-Modus: Bild der Lernkarte als Datei im Textfeld ({lk.files})")
        bad += 1
    if f'name="{ids[0]}-' not in q1.intro or len(k["textfelder"]) != 2:
        print("FALSCH Textfeld-Modus: Feldnamen mit Block-id, zwei Blöcke für die Vorschau")
        bad += 1
    assert isinstance(q1, Label) and isinstance(teil[4], HvpItem)
    # Kachelformat: Überblick in Allgemeines fällt weg (doppelt die Kacheln), im Abschnitt bleibt er
    for fmt, n_allg in (("themen", 1), ("kacheln", 0)):
        k = parse(path, A, {"teile": {}, "kurs": {"format": fmt}})
        n = len(k["sections"][0].items)
        if n != n_allg or k["sections"][1].items[0].name != "Überblick":
            print(f"FALSCH {fmt}: {n} Elemente in Allgemeines, erwartet {n_allg}")
            bad += 1
    return bad


# Formfehler aus Chats ohne Code-Ausführung (Protokoll docs/entwicklung/protokolle/chat-ohne-code/): baut ohne Handarbeit
NACHSICHT = """## Teil
### Seite: S
Schritte: Rechnen

1. Erst
2. Dann

Ein rechter Winkel hat $90^\\circ$.

$$ c=\\sqrt{a^2+b^2}\\approx 1{,}41 $$

### Test: T
versuche: 2 · rückmeldung: sofort · einleitung: Ab 70 % bestanden.
1. Welche Rechnung? · ✔$c=\\sqrt{7^2+24^2}$ · $c=7+24$

Hinweis für die Lehrkraft: Liefertext, gehört nicht in den Kurs.
"""


def check_nachsicht():
    bad = 0
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "kurs.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(NACHSICHT)
        try:
            page, test = parse(path, A, {"teile": {}})["sections"][1].items
        except KursdateiFehler as e:
            print(f"FALSCH Nachsicht: {e}")
            return 1
        for want in (">1</span>", "Dann", "90°", "c=√(a²+b²) ≈ 1,41"):
            if want not in page.content:
                print(f"FALSCH Nachsicht: „{want}“ fehlt in der Seite")
                bad += 1
        if "$" in page.content or "\\sqrt" in page.content:
            print("FALSCH Nachsicht: LaTeX-Rest in der Seite")
            bad += 1
        if (test.attempts, test.behaviour) != (2, "immediatefeedback") or "Ab 70 %" not in test.intro \
                or "Liefertext" in test.intro:
            print(f"FALSCH Nachsicht: Testangaben {test.attempts}, {test.behaviour}, {test.intro}")
            bad += 1
    # die unveränderten Chat-Drehbücher (nur im Repo, nicht im Release-Zip)
    proto = os.path.join(ROOT, "docs", "entwicklung", "protokolle", "chat-ohne-code")
    for name in ("ais", "fobizz"):
        if not os.path.exists(os.path.join(proto, name, "kurs.md")):
            continue
        out = os.path.join(tempfile.gettempdir(), f"test_chat_{name}.mbz")
        r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build.py"), "--content",
                            os.path.join(proto, name), "--no-render", "--out", out], capture_output=True, text=True)
        if r.returncode != 0:
            print(f"BAU Chat-Drehbuch {name} fehlgeschlagen:\n{r.stderr}")
            bad += 1
        else:
            os.remove(out)
    return bad


ID_KURS = """# Drehbuch v1 · IDs · 20
## Teil · 20 min
### Textfeld: Eins
id: start-1
Hallo.
### Quiz: Zwei · 5 min
id: start-1
bestehen: 80 %
1. Frage? · ✔a · b
### Seite: Drei
Text ohne id.
### Seite: Vier
id: mit leerzeichen
Text.
"""


def check_id():
    """`id:` je Baustein: gesetzt = diese ID, fehlend = berechnete ID, doppelt oder ungültig = Warnung und berechnete ID;
    der strenge Bau (build.py) läuft mit `id:` durch und baut dieselben Bytes wie ohne."""
    bad = 0
    from gen import api
    r = api.pruefe(ID_KURS)
    b = r["bausteine"]
    ids = [x["id"] for x in b]
    if ids[0] != "start-1" or not b[0]["id_explizit"]:
        print(f"FALSCH id gesetzt: {ids[0]}")
        bad += 1
    if not (ids[1].startswith("b-") and ids[2].startswith("b-") and ids[3].startswith("b-")) or len(set(ids)) != 4:
        print(f"FALSCH id doppelt/fehlend/ungültig: {ids}")
        bad += 1
    w = [d["text"] for d in r["diagnosen"] if d["art"] == "id"]
    if len(w) != 2 or "doppelt" not in w[0] or "Buchstaben" not in w[1] or b[1]["status"] != "warnung":
        print(f"FALSCH id-Warnungen: {w}")
        bad += 1
    if b[1]["angaben"].get("bestehen") != "80 %":
        print(f"FALSCH id stört die übrigen Angaben: {b[1]['angaben']}")
        bad += 1
    ohne = "\n".join(z for z in ID_KURS.splitlines() if not z.startswith("id:")) + "\n"
    m1, d1 = api.baue(ID_KURS, {}, {}, zeit=1700000000, seed=1)
    m2, d2 = api.baue(ohne, {}, {}, zeit=1700000000, seed=1)
    if not m1 or m1 != m2:
        print(f"FALSCH id ändert den Bau: {[d['satz'] for d in d1 if d['stufe'] == 'fehler']}")
        bad += 1
    return bad


def check_beispiele():
    """Die Fixtures unter scripts/tests/fixtures/ (seit AP12a statt examples/) und den Katalogkurs bauen."""
    bad = 0
    fixtures = os.path.join(HERE, "fixtures")
    tmp = tempfile.mkdtemp()
    ordner = [os.path.join(fixtures, d) for d in sorted(os.listdir(fixtures)) if os.path.exists(os.path.join(fixtures, d, "kurs.md"))]
    ordner.append(katalogkurs.schreibe(tmp))
    for pfad in ordner:
        name = os.path.basename(pfad)
        out = os.path.join(tmp, f"test_{name}.mbz")
        r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build.py"), "--content",
                            pfad, "--no-render", "--out", out],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"BAU {name} fehlgeschlagen:\n{r.stderr}")
            bad += 1
        else:
            os.remove(out)
    return bad


if __name__ == "__main__":
    n = check_fehler() + check_nachsicht() + check_id() + check_beispiele()
    print("OK" if n == 0 else f"{n} Problem(e)")
    sys.exit(1 if n else 0)
