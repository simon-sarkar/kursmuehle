"""Test der Generator-Schnittstelle gen.api und des Mappenformats gen.mappe (AP10a).

usage: python3 scripts/tests/test_api.py   (Exit 0 = alles gut)
Prüft: pruefe erholt sich je ###, fehlendes Bild = Warnung + Platzhalter, Baustein-IDs stabil, Diagnosen mit Bausteintitel
und relativer Zeile, Bereinigung (Allowlist, nur https, externe Adressen als Liste), Chat-Antwort mit Vorrede und ```,
baue reproduzierbar (Zeit, Seed) und ohne Rest im Temp-Ordner, build.py nutzt dieselbe API (gleiche Bytes),
Steckbrief-Rundlauf über Python (Datum, führende Null, no), Kursmappe schreiben/lesen/migrieren/aus 1.x-Ordner,
VERSION gleich CHANGELOG.
"""
import glob
import hashlib
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import mappe as M  # noqa: E402
from gen.kursdatei import bereinige  # noqa: E402

N9 = os.path.join(ROOT, "scripts", "tests", "fixtures", "netzwerk9")
fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


def lies(p, mode="r"):
    with open(p, mode, **({} if "b" in mode else {"encoding": "utf-8"})) as f:
        return f.read()


KAPUTT = """# Drehbuch v1 · Test · 45
farbe: blau

## Allgemeines
### Banner: Probe
bild: fehlt.png
untertitel: Satz <script>alert(1)</script> mit <b class="x">fett</b> und <em>kursiv</em>

## Teil 1 · 20 min
### Textfeld: Willkommen · 2 min
Hallo <a href="http://evil.example/x">Link</a>, siehe https://www.example.org/seite
### Wiki: Falsch
text
### Quiz: Q
1. F? · a · b
### Quiz: Q2 · 5 min
1. F? · ✔a · b
### Zuordnen: Z
zonen: A | B
- e → C
### Link: L
http://example.org
### Textfeld: Willkommen
Zweites Element mit gleichem Titel.
"""


def check_pruefe():
    r = api.pruefe(KAPUTT, {})
    b = r["bausteine"]
    ok(len(b) == 8 and [x["status"] for x in b] == ["warnung", "ok", "fehler", "fehler", "ok", "fehler", "fehler", "ok"],
       f"pruefe: 8 Bausteine mit Status {[x['status'] for x in b]}")
    ok(not r["ok"], "pruefe: ok=False bei Fehlern")
    f = [d for d in r["diagnosen"] if d["stufe"] == "fehler"]
    ok(len(f) == 4 and all(d["titel"] for d in f), f"pruefe: 4 Fehler, alle mit Bausteintitel ({[d['titel'] for d in f]})")
    z = next(d for d in f if d["titel"] == "Z")
    ok(z["zeile_im_baustein"] == 3 and z["zeile"] == 20, f"pruefe: Zone-Fehler Zeile {z['zeile']}, im Baustein Zeile {z['zeile_im_baustein']}")
    w = [d for d in r["diagnosen"] if d["stufe"] == "warnung"]
    ok(len(w) == 1 and "Platzhalter" in w[0]["text"] and w[0]["titel"] == "Probe", "pruefe: fehlendes Bild = Warnung + Platzhalter")
    h = [d for d in r["diagnosen"] if d["art"] == "html"]
    ok(len(h) == 2 and "<script>" in h[0]["text"] and "<a>" in h[1]["text"], f"pruefe: HTML bereinigt gemeldet ({len(h)} Zeilen)")
    ok([a["adresse"] for a in r["adressen"]] == ["https://www.example.org/seite", "http://example.org"]
       and [a["https"] for a in r["adressen"]] == [True, False], f"pruefe: externe Adressen als Liste {r['adressen']}")
    ok(b[1]["minuten"] == 2 and b[1]["id"] != b[7]["id"] and b[1]["titel"] == b[7]["titel"], "pruefe: Minuten gelesen, gleiche Titel verschiedene IDs")
    ok(b[0]["angaben"] == {"bild": "fehlt.png", "untertitel": "Satz  mit <b>fett</b> und <em>kursiv</em>"}, f"pruefe: Angaben bereinigt {b[0]['angaben']}")
    # IDs stabil: Textänderung im Element und Umsortieren anderer Elemente ändern die ID nicht
    r2 = api.pruefe(KAPUTT.replace("Zweites Element", "Anderer Text").replace("### Quiz: Q\n1. F? · a · b\n", ""), {})
    ids1 = {x["titel"] + x["typ"]: x["id"] for x in b}
    ids2 = {x["titel"] + x["typ"]: x["id"] for x in r2["bausteine"]}
    ok(all(ids2[k] == ids1[k] for k in ids2), "pruefe: Baustein-IDs stabil bei Textänderung und Löschung eines anderen Elements")
    ok(not glob.glob(os.path.join(tempfile.gettempdir(), "kursmuehle_*")), "pruefe: kein Temp-Ordner übrig")
    # kursdatei.md-Beispiel im Textfeld-Modus und ganzer Kurs netzwerk9 ohne Diagnosen
    r3 = api.pruefe(lies(os.path.join(N9, "kurs.md")), os.path.join(N9, "assets"), lies(os.path.join(N9, "steckbrief.yaml")))
    ok(r3["ok"] and len(r3["bausteine"]) == 10 and not r3["diagnosen"], f"pruefe netzwerk9: {len(r3['bausteine'])} Bausteine, {len(r3['diagnosen'])} Diagnosen")


def check_bereinigung():
    ok(bereinige("a <b>x</b> <i>y</i> <br/> <sup>2</sup> <mark>m</mark>")[0] == "a <b>x</b> <i>y</i> <br> <sup>2</sup> <mark>m</mark>", "bereinige: Allowlist bleibt, Attribute und / fallen weg")
    ok(bereinige('<img src="https://x/y.png" onerror="alert(1)"> Text <span style="color:red">rot</span>') == (" Text rot", ["img", "span"]), "bereinige: img, span entfernt, Text bleibt")
    ok(bereinige("<!-- Kommentar -->Satz <SCRIPT>x</SCRIPT> <style>b{}</style>Ende") == ("Satz  Ende", ["script", "style"]), "bereinige: Kommentar, Skript und Stil samt Inhalt entfernt")
    ok(bereinige("3 < 5 und 7 > 2")[0] == "3 < 5 und 7 > 2", "bereinige: Vergleichszeichen bleiben")
    ok(bereinige("wenn a <b und c> d") == ("wenn a &lt;b und c> d", []), f"bereinige: <b und c> ist kein Tag {bereinige('wenn a <b und c> d')}")
    ok(bereinige("x<y, y>z") == ("x&lt;y, y>z", []), "bereinige: x<y ohne Leerzeichen bleibt Text")
    ok(bereinige('<b class="k">f</b>')[0] == "<b>f</b>", "bereinige: erlaubtes Tag mit Attribut bleibt Tag ohne Attribut")


def check_extrahieren():
    t, h = api.extrahiere_kursdatei("Gern, hier ist das Drehbuch:\n\n```markdown\n# Drehbuch v1\n## A\n### Textfeld: X\nhallo\n```\n\nSoll ich etwas ändern?")
    ok(t == "# Drehbuch v1\n## A\n### Textfeld: X\nhallo\n" and len(h) == 1, "extrahiere: Codeblock ohne Vorrede und Nachsatz")
    t, h = api.extrahiere_kursdatei("Teil 1:\n```\n# D\n## A\n### Textfeld: X\na\n```\nTeil 2:\n```\n## B\n### Textfeld: Y\nb\n```\n")
    ok("## A" in t and "## B" in t and "Teil 2" not in t, "extrahiere: zwei Codeblöcke zusammengesetzt")
    t, h = api.extrahiere_kursdatei("Hier kommt es.\nViel Spaß.\n# Drehbuch\n## A\n### Textfeld: X\na\n")
    ok(t.startswith("# Drehbuch") and "Vorrede" in h[0], f"extrahiere: Vorrede ohne Codeblock entfernt ({h})")
    t, h = api.extrahiere_kursdatei("Allgemeines\nTextfeld: Willkommen\nHallo\n")
    ok(any("gerendert" in x for x in h), "extrahiere: gerenderter Text erkannt")
    r = api.pruefe("```\n# D\n## A\n### Textfeld: X\na\n```", {})
    ok(r["ok"] and r["kursdatei"].startswith("# D") and any(d["art"] == "eingabe" for d in r["diagnosen"]), "pruefe nimmt die ganze Chat-Antwort an")


def check_baue():
    kurs, sb = lies(os.path.join(N9, "kurs.md")), lies(os.path.join(N9, "steckbrief.yaml"))
    assets = {n: lies(os.path.join(N9, "assets", n), "rb") for n in os.listdir(os.path.join(N9, "assets"))}
    b1, d1 = api.baue(kurs, sb, assets, zeit=1700000000, seed=7)
    b2, d2 = api.baue(kurs, sb, os.path.join(N9, "assets"), zeit=1700000000, seed=7)
    b3, _ = api.baue(kurs, sb, assets, zeit=1700000000, seed=8)
    ok(b1 and b1 == b2, f"baue: reproduzierbar, Bytes aus dict und Ordner gleich ({len(b1)} Bytes)")
    ok(b3 != b1, "baue: anderer Seed, andere Bytes")
    ok(not [d for d in d1 if d["stufe"] != "hinweis"], f"baue netzwerk9: nur Hinweise ({len(d1)})")
    ok(not glob.glob(os.path.join(tempfile.gettempdir(), "kursmuehle_*")), "baue: Temp-Ordner gelöscht")
    # Modulzustand: Vorlage aus einem Lauf bleibt nicht im nächsten
    sb_mag = sb + "\n"
    e1 = api.baue_voll(kurs, sb, assets, zeit=1700000000, seed=7, optionen={"vorlage": "magazin"})
    e2 = api.baue_voll(kurs, sb_mag, assets, zeit=1700000000, seed=7)
    ok(e1.mbz != e2.mbz and e2.mbz == b1, "baue: Vorlage gilt nur für den eigenen Lauf (Zustand zurückgesetzt)")
    # Fehler: kein Bau, Diagnose mit Zeile
    m, d = api.baue(KAPUTT, "", {})
    ok(m is None and d and d[0]["stufe"] == "fehler" and d[0]["zeile"], f"baue: Fehler -> None + Diagnose ({d[0]['satz'][:70]})")
    # fehlendes Bild: Warnung, Platzhalter, Bau läuft
    m, d = api.baue(kurs.replace("router.png", "fehlt.png", 1), sb, assets, zeit=1700000000, seed=7)
    ok(m is not None and any(x["stufe"] == "warnung" and "Platzhalter" in x["text"] for x in d), "baue: fehlendes Bild -> Platzhalter und Warnung, Sicherung gebaut")
    ok(e1.dateiname.endswith(".mbz") and e1.titel and e1.pruefung is not None and not e1.pruefung[0], f"baue_voll: {e1.dateiname}, Prüfung ohne Fehler")
    # CLI nutzt dieselbe API: gleiche Bytes mit --zeit --seed
    out = os.path.join(tempfile.gettempdir(), "test_api_cli.mbz")
    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build.py"), "--content", N9, "--out", out, "--zeit", "1700000000", "--seed", "7"],
                       capture_output=True, text=True)
    cli = lies(out, "rb") if os.path.exists(out) else b""
    e3 = api.baue_voll(kurs, sb, assets, zeit=1700000000, seed=7, optionen={"dateiname": "test_api_cli.mbz"})
    ok(r.returncode == 0 and cli == e3.mbz, f"build.py: gleiche Bytes wie api.baue ({len(cli)} / {len(e3.mbz or b'')}; rc {r.returncode})")
    if os.path.exists(out):
        os.remove(out)
    # JPEG-Bild wird angenommen
    from PIL import Image
    import io
    buf = io.BytesIO()
    Image.new("RGB", (30, 20), "#336699").save(buf, "JPEG")
    m, d = api.baue(kurs.replace("router.png", "foto.jpg", 1), sb, dict(assets, **{"foto.jpg": buf.getvalue()}), zeit=1700000000, seed=7)
    ok(m is not None and not [x for x in d if x["stufe"] != "hinweis"], "baue: JPEG in assets ohne Pillow gelesen")


def check_steckbrief():
    sb = api.steckbrief_lesen("kurs:\n  titel: T\n  start: 2026-11-01\n  jg: 09\n  website: no\n  kurzname: '09'\n")
    ok(sb["kurs"]["start"] == "2026-11-01" and sb["kurs"]["jg"] == "09" and sb["kurs"]["website"] is False and sb["kurs"]["kurzname"] == "09",
       f"steckbrief_lesen: Datum als Text, führende Null bleibt, no wird False ({sb['kurs']})")
    t = api.steckbrief_schreiben(sb)
    ok(api.steckbrief_lesen(t) == sb and "'09'" in t, f"steckbrief_schreiben: Rundlauf, führende Null bleibt zitiert\n{t}")
    ok(api.steckbrief_lesen("") == {} and api.steckbrief_lesen("# nur Kommentar\n") == {}, "steckbrief_lesen: leer -> {}")


def check_mappe():
    dateien = {"kurs.md": lies(os.path.join(N9, "kurs.md"), "rb"), "steckbrief.yaml": lies(os.path.join(N9, "steckbrief.yaml"), "rb")}
    for n in os.listdir(os.path.join(N9, "assets")):
        dateien[f"netzwerk9/assets/{n}"] = lies(os.path.join(N9, "assets", n), "rb")
    m = M.aus_dateien(dateien)
    ok(m["mappe"]["format"] == 2 and len(m["mappe"]["bausteine"]) == 10 and len(m["assets"]) == 7
       and m["mappe"]["titel"] == "Informatik 9 – Netzwerkkomponenten", f"mappe.aus_dateien: 1.x-Ordner -> Format 2, {len(m['mappe']['bausteine'])} Bausteine")
    e = m["mappe"]["bausteine"][2]
    ok(set(e) == {"id", "typ", "titel", "abschnitt", "minuten", "auftrag", "phase", "soll", "geplant", "neu"}, f"mappe: Felder je Baustein {sorted(e)}")
    m["mappe"]["bausteine"][2]["auftrag"] = "kürzer"
    m["mappe"]["bausteine"][2]["phase"] = "Erarbeitung"
    m["mappe"]["bausteine"][2]["soll"] = 6
    z1 = M.schreiben(m["mappe"], m["kurs_md"], m["steckbrief_text"], m["assets"])
    z2 = M.schreiben(m["mappe"], m["kurs_md"], m["steckbrief_text"], m["assets"])
    ok(z1 == z2, "mappe.schreiben: gleiche Mappe, gleiche Bytes")
    g = M.lesen(z1)
    ok(g["kurs_md"] == m["kurs_md"] and g["assets"] == m["assets"] and g["mappe"]["bausteine"][2]["auftrag"] == "kürzer"
       and g["mappe"]["bausteine"][2]["soll"] == 6, "mappe.lesen: Rundlauf mit Auftrag, Phase, Soll")
    pr = api.pruefe(g["kurs_md"].replace("### Textfeld: Willkommen", "### Textfeld: Willkommen"), g["assets"], g["steckbrief"])
    M.abgleich(g["mappe"], pr["bausteine"])
    ok(g["mappe"]["bausteine"][2]["auftrag"] == "kürzer", "mappe.abgleich: Metadaten bleiben an der ID")
    alt = M.migriere({"format": 1, "titel": "Alt", "bausteine": [{"id": "b-1", "auftrag": "x"}]})
    ok(alt["format"] == 2 and alt["bausteine"][0]["phase"] == "" and alt["bausteine"][0]["auftrag"] == "x", "mappe.migriere: Format 1 -> 2")
    try:
        M.migriere({"format": 3})
        ok(False, "mappe.migriere: neueres Format abgelehnt")
    except M.MappenFehler as ex:
        ok("neuer" in str(ex), "mappe.migriere: neueres Format abgelehnt")
    try:
        M.lesen(b"kein zip")
        ok(False, "mappe.lesen: kein ZIP abgelehnt")
    except M.MappenFehler:
        ok(True, "mappe.lesen: kein ZIP abgelehnt")
    ok(M.dateiname(m["mappe"], "2026-10-24") == "informatik-9-netzwerkkomponenten_2026-10-24.kursmappe.zip", f"mappe.dateiname: {M.dateiname(m['mappe'], '2026-10-24')}")


ABGLEICH = """# Drehbuch v1 · Abgleich · 30
## Teil · 30 min
### Textfeld: Einstieg · 3 min
id: b1
Ein Satz.
### Seite: Lesen
Ein Lesetext.
### Quiz: Üben · 5 min
1. MC: Frage?
- ✔ a → gut
- b → nein
2. RF: Aussage ✔
3. Frage? · ✔x · y
### Seite: Hefteintrag
Merke dir das.
"""


def check_abgleich():
    pr = api.pruefe(ABGLEICH)
    ids = [b["id"] for b in pr["bausteine"]]
    m = M.neu("Abgleich", einheit={"thema": "Abgleich", "jahrgang": "7", "minuten": 30, "vorlage": "Einführung"})
    m["bausteine"] = [M.geplant("b1", "Textfeld", "Einstieg", "Einstieg", 3, "Fall aus dem Alltag"),
                      M.geplant("b9", "Lernkarten", "Wiederholen", "Übung", 4)]
    M.abgleich(m, pr["bausteine"])
    e = m["bausteine"]
    ok([x["id"] for x in e] == ["b1", "b9"] + ids[1:] and e[0]["auftrag"] == "Fall aus dem Alltag" and not e[0]["geplant"]
       and e[1]["geplant"], f"abgleich: explizite id ordnet zu, geplanter Baustein ohne Gegenstück bleibt ({[x['id'] for x in e]})")
    # Phase und Auftrag setzen, dann Seite umbenennen (berechnete ID ändert sich): Rückfall nach Position
    e[2]["auftrag"], e[2]["phase"], e[2]["soll"] = "kurz halten", "Erarbeitung", 7
    neu_md = M.umbenennen(ABGLEICH, ids[1], "Lesen, neuer Titel")
    pr2 = api.pruefe(neu_md)
    ok(pr2["bausteine"][1]["id"] == ids[1] and pr2["bausteine"][1]["titel"] == "Lesen, neuer Titel" and pr2["ok"],
       "umbenennen: Überschrift geändert, ID als id: festgeschrieben")
    # Umbenennen im Chat (ohne id:): berechnete ID ändert sich, Rückfall nach Position
    pr2 = api.pruefe(ABGLEICH.replace("### Seite: Lesen", "### Seite: Lesen, neuer Titel"))
    ok(pr2["bausteine"][1]["id"] != ids[1], "Umbenennen im Chat: berechnete ID ändert sich")
    M.abgleich(m, pr2["bausteine"])
    s2 = next(x for x in m["bausteine"] if x["titel"] == "Lesen, neuer Titel")
    ok((s2["auftrag"], s2["phase"], s2["soll"]) == ("kurz halten", "Erarbeitung", 7), f"abgleich: Umbenennen behält Auftrag, Phase, Soll ({s2})")
    ok("· 5 min" in M.umbenennen(ABGLEICH, ids[2], "Üben 2"), "umbenennen: Minuten bleiben in der Überschrift")
    # angehängte Einheit füllt keine geplante Karte der ersten; Teilschritt nur beim geplanten Typ
    plan = M.neu("P", einheit={"thema": "P", "jahrgang": "7", "minuten": 30})
    plan["bausteine"] = [M.geplant("b1", "Seite", "Erarbeitung 3", "Erarbeitung", 5, schritt="Die Regel herleiten."),
                         M.geplant("b2", "Quiz", "Der Fall vom Anfang", "Vertiefung", 3)]
    M.abgleich(plan, api.pruefe("# Drehbuch v1 · P\n\n## P · 30 min\n### Quiz: Anders · 3 min\nid: b1\n1. RF: Ja ✔\n"
                                "\n## Teil 2 · 10 min\n### Quiz: Neu · 3 min\n1. RF: Ja ✔\n")["bausteine"])
    e = plan["bausteine"]
    ok([(x["id"], x["geplant"]) for x in e][:2] == [("b1", False), ("b2", True)] and len(e) == 3,
       f"abgleich: angehängter Abschnitt nimmt keine geplante Karte {[(x['id'], x['geplant']) for x in e]}")
    ok("schritt" not in e[0] and e[1].get("phase") == "Vertiefung", "abgleich: Teilschritt fällt weg, wenn der Chat den Typ ändert")
    # verschieben und entfernen
    v = M.verschiebe(ABGLEICH, ids[3], -1)
    ok([b["titel"] for b in api.pruefe(v)["bausteine"]] == ["Einstieg", "Lesen", "Hefteintrag", "Üben"], "verschiebe: eins nach oben")
    ok(M.verschiebe(ABGLEICH, ids[0], -1) == ABGLEICH, "verschiebe: am Anfang unverändert")
    zwei = ABGLEICH + "## Teil 2\n### Textfeld: Danach\nText.\n"
    v2 = api.pruefe(M.verschiebe(zwei, ids[3], 1))["bausteine"]
    ok([(b["titel"], b["abschnitt"]) for b in v2][-2:] == [("Hefteintrag", "Teil 2"), ("Danach", "Teil 2")],
       f"verschiebe: über die Abschnittsgrenze an den Anfang des nächsten Abschnitts {[(b['titel'], b['abschnitt']) for b in v2]}")
    v3 = api.pruefe(M.verschiebe(M.verschiebe(zwei, ids[3], 1), ids[3], -1))
    ok([b["titel"] for b in v3["bausteine"]] == [b["titel"] for b in api.pruefe(zwei)["bausteine"]] and v3["ok"], "verschiebe: hin und zurück")
    r = api.pruefe(M.entferne(ABGLEICH, ids[2]))
    ok([b["titel"] for b in r["bausteine"]] == ["Einstieg", "Lesen", "Hefteintrag"] and r["ok"], "entferne: Baustein samt Inhalt weg")
    try:
        M.entferne(ABGLEICH, "gibt-es-nicht")
        ok(False, "entferne: unbekannte ID abgelehnt")
    except M.MappenFehler:
        ok(True, "entferne: unbekannte ID abgelehnt")


def check_kennzahlen():
    pr = api.pruefe(ABGLEICH.replace("Merke dir das.", "Bild: fehlt.png | Alt"))
    m = M.neu("K", einheit={"minuten": 30})
    M.abgleich(m, pr["bausteine"])
    m["bausteine"].append(M.geplant("b9", "Test", "Abschlusstest", "Probelauf", 6))
    k = M.kennzahlen(m, pr)
    gerechnet = sum(z["gerechnet"] for z in k["zeit"].values())
    ok(k["minuten"] == {"ist": gerechnet + 6, "soll": 30} and len(k["zeit"]) == 4,
       f"kennzahlen: Minuten aus dem Inhalt gerechnet plus Soll der geplanten {k['minuten']}")
    ok(k["fragen"] == {"fragen": 3, "mc": 2, "auswahl": 3, "rueckmeldung": 1} and k["mc_anteil"] == 67, f"kennzahlen: Fragen {k['fragen']}, MC {k['mc_anteil']} %")
    ok(k["folge"] == ["Lesen", "Üben", "Lesen", "Sichern"] and k["folge_brueche"] == 0, f"kennzahlen: Folge {k['folge']}, Brüche {k['folge_brueche']}")
    arten = [h["art"] for h in k["hinweise"]]
    ok(arten == ["bild", "zeit", "rueckmeldung", "leer"] and k["hinweise"][0]["text"] == "Bild fehlt in Baustein 4", f"kennzahlen: Hinweise {[h['text'] for h in k['hinweise']]}")
    m["bausteine"][1]["phase"] = "Sicherung"
    ok(M.kennzahlen(m, pr)["folge_brueche"] == 1, "kennzahlen: Phase überstimmt die Rolle des Typs, Üben nach Sichern zählt als Bruch")


def check_angaben():
    sb = M.angaben_schreiben("", {"thema": "Brüche", "jahrgang": "06", "minuten": "45", "fach": "Mathematik",
                                  "schulart": "Realschule", "format": "kacheln",
                                  "vorlage": "magazin", "farbe": "grün", "website": "textfeld", "abschluss": "test",
                                  "portionierung": "keine"})
    a = M.angaben_lesen(sb)
    ok(a == {"thema": "Brüche", "jahrgang": "06", "minuten": 45, "fach": "Mathematik", "schulart": "Realschule",
             "format": "kacheln", "vorlage": "magazin",
             "farbe": "grün", "website": "textfeld", "abschluss": "test", "portionierung": "keine"}, f"angaben: Rundlauf über den Steckbrief {a}")
    d = api.steckbrief_lesen(sb)
    ok(d["kurs"]["farbe"] == "#15803D" and d["kurs"]["kurzname"] == "Brüche" and "'06'" in sb, "angaben: Farbe als #RRGGBB, Kurzname, Jahrgang zitiert")
    alt = api.steckbrief_lesen(lies(os.path.join(N9, "steckbrief.yaml")))
    n9 = api.steckbrief_lesen(M.angaben_schreiben(lies(os.path.join(N9, "steckbrief.yaml")), {"fach": "Informatik"}))
    ok(n9 == alt, "angaben: unveränderte Felder lassen den Steckbrief gleich")
    ok(M.angaben_lesen(lies(os.path.join(N9, "steckbrief.yaml")))["website"] == "nein", "angaben: website nein gelesen")
    # Steckbrief-Farbe wirkt, wenn die Kursdatei keine nennt
    p1 = api.pruefe(ABGLEICH, {}, sb)
    ok(p1["farbe"] == "#15803D", f"Akzentfarbe aus dem Steckbrief: {p1['farbe']}")


def check_version():
    top = lies(os.path.join(ROOT, "CHANGELOG.md")).split("## ", 2)[1].split(" ")[0]
    ok(api.VERSION == top, f"VERSION {api.VERSION} = CHANGELOG {top}")


def main():
    check_pruefe()
    check_bereinigung()
    check_extrahieren()
    check_baue()
    check_steckbrief()
    check_mappe()
    check_abgleich()
    check_kennzahlen()
    check_angaben()
    check_version()
    # AP13: nächste Einheit als Nachlieferung (teil: e2 je angehängtem Abschnitt, Bau nur dieses Teils), neue Schlüssel
    erste = "# Drehbuch v1 · A\n\n## Eins · 10 min\n### Textfeld: X\nid: b1\nHallo.\n"
    zweite = "```markdown\n# Drehbuch v1 · B\n\n## Zwei · 10 min\nteil: fremd\n### Textfeld: Y\nid: b2\nHallo zwei.\n```"
    md = M.anhaengen(erste, zweite, "e2")
    ok("## Zwei · 10 min\nteil: e2\n" in md and "teil: fremd" not in md and M.anhaengen(erste, zweite) == M.anhaengen(erste, zweite, None),
       "anhaengen mit teil: Zeile teil: e2 unter dem neuen Abschnitt, eigene teil:-Zeile des Chats fällt weg")
    r = api.baue_voll(md, None, None, zeit=1700000000, seed=1, optionen={"delta": "e2"})
    ok(r.ok() and "_delta_e2_" in r.dateiname, f"Nachlieferung baut nur e2 ({r.dateiname})")
    mz = M.migriere({"format": 2, "bausteine": [], "schritt": 5, "zweig": "mach", "importiert": ["e1"], "zeit_selbst": False})
    ok(mz.get("schritt") == 5 and mz.get("zweig") == "mach" and mz.get("importiert") == ["e1"] and mz.get("zeit_selbst") is False,
       "migriere behält Schritt, Zweig, importierte Einheiten und den Zeit-Schalter")

    if fehler:
        print(f"\n{len(fehler)} Fehler")
        return 1
    print("\nalles gut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
