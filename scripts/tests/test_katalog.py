"""Gleichstand des Katalogs (`references/katalog.yaml`) mit Parser und Referenz:
- jeder Typ aus gen.kursdatei.ELEMENTE hat genau einen Eintrag, und umgekehrt
- die Angaben je Typ sind genau ATTRS[typ] (Umlaut-Schreibweise im Katalog, ASCII-Aliasse im Parser zählen mit)
- Kopf-Angaben (kurs, abschnitt) stimmen
- jeder Typ steht in `kursdatei.md` §3 (Tabelle) und jedes Beispiel baut ohne Fehler (gen.api.pruefe)
- Formularnamen sind eindeutig; jede Phase aus `docs/entwicklung/phasenschemata.md` ist einem Typ zugeordnet

usage: python3 scripts/tests/test_katalog.py   (Exit 0 = alles gut)
"""
import os
import re
import sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import kursdatei as K  # noqa: E402

ALIAS = {"höhe": "hoehe", "fällig": "faellig", "rückmeldung": "rueckmeldung", "ändern": "aendern"}
GEMEINSAM = {"sichtbar ab", "prototyp", "id"}
PNG = os.path.join(ROOT, "scripts", "tests", "fixtures", "netzwerk9", "assets", "router.png")
fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


def main():
    with open(os.path.join(ROOT, "references", "katalog.yaml"), encoding="utf-8") as f:
        kat = yaml.safe_load(f)
    typen = {e["typ"]: e for e in kat["typen"]}
    ok(set(typen) == set(K.ELEMENTE), f"Typen: Katalog {len(typen)}, Parser {len(K.ELEMENTE)}"
       + (f"; fehlt {set(K.ELEMENTE) - set(typen)}, zu viel {set(typen) - set(K.ELEMENTE)}" if set(typen) != set(K.ELEMENTE) else ""))
    ok(len(kat["typen"]) == len(typen), "kein Typ doppelt")
    namen = [e["formularname"] for e in kat["typen"]]
    ok(len(set(namen)) == len(namen), "Formularnamen eindeutig")
    for name, erwartet in (("kurs", K.ATTRS["kurs"]), ("abschnitt", K.ATTRS["abschnitt"])):
        ist = set(kat["kopf"][name]["angaben"])
        ok(ist == erwartet, f"Kopf {name}: Angaben {sorted(ist)}")
    ok(set(kat["gemeinsam"]["angaben"]) == GEMEINSAM, "gemeinsame Angaben sichtbar ab, prototyp, id")

    with open(os.path.join(ROOT, "references", "kursdatei.md"), encoding="utf-8") as f:
        ref = f.read()
    with open(PNG, "rb") as f:
        png = f.read()
    for typ, e in typen.items():
        ist = set(e.get("angaben", []))
        ist |= GEMEINSAM if typ != "Badge" else {"id"}
        ist |= {ALIAS[a] for a in ist if a in ALIAS}
        ok(ist == K.ATTRS[typ], f"{typ}: Angaben wie ATTRS" + ("" if ist == K.ATTRS[typ] else f" (Katalog {sorted(ist)}, Parser {sorted(K.ATTRS[typ])})"))
        ok(f"| `{typ}`" in ref or f"`{typ}`" in ref, f"{typ}: in kursdatei.md genannt")
        for p in e.get("pflicht", []):
            ok(p in ist, f"{typ}: Pflichtangabe {p} ist eine Angabe")
        assets = {}
        for a in e.get("assets", []):
            assets[a] = png if a.lower().endswith(".png") else b"%PDF-1.4\n% Platzhalter\n"
        doc = "# Drehbuch v1 · Katalog · 45\n\n## Allgemeines\n### Textfeld: Start\nEin Satz.\n\n## Teil 1 · 20 min\n" + e["beispiel"]
        r = api.pruefe(doc, assets)
        probleme = [d["satz"] for d in r["diagnosen"] if d["stufe"] in ("fehler", "warnung")]
        ok(not probleme, f"{typ}: Beispiel baut" + (f" ({'; '.join(probleme)[:200]})" if probleme else ""))
        ok(any(b["typ"] == typ for b in r["bausteine"]), f"{typ}: Beispiel enthält den Typ")
        ok(bool(e.get("regeln")) and bool(e.get("formularname")) and bool(e.get("moodle")), f"{typ}: Regeln, Formularname, Ziel vorhanden")

    # Phasenschemata: jede Phase der vier Tabellen kommt in mindestens einem Katalogtyp vor
    pfad = os.path.join(ROOT, "docs", "entwicklung", "phasenschemata.md")
    if os.path.exists(pfad):
        with open(pfad, encoding="utf-8") as f:
            schema = f.read()
        phasen = set()
        for m in re.finditer(r"^\| ([^|]+?) \| [^|]+ \| [^|]+ \| \d+ % \|$", schema, re.M):
            phasen.add(re.sub(r"\s*\(optional\)", "", m.group(1)).strip())
        katalog_phasen = {p for e in kat["typen"] for p in e.get("phasen", [])}
        fehlend = set()
        for p in phasen:
            teile = [t.strip() for t in re.split(r",| oder ", p)]
            if not any(t in katalog_phasen for t in teile):
                fehlend.add(p)
        ok(not fehlend, f"Phasenschemata: {len(phasen)} Phasen, alle im Katalog zugeordnet" + (f"; fehlt {sorted(fehlend)}" if fehlend else ""))

    # Rollen und Einheitsvorlagen (AP10): jede Rolle gültig, Anteile 100 %, Bausteintypen aus dem Katalog, Phasen aus den
    # Phasenschemata mit demselben Anteil
    rollen = {"einstieg", "lesen", "üben", "sichern", "rahmen"}
    ok(all(e.get("rolle") in rollen for e in kat["typen"]), "jeder Typ hat eine Rolle")
    tabelle = {}
    if os.path.exists(pfad):
        for m in re.finditer(r"^\| ([^|]+?) \| [^|]+ \| [^|]+ \| (\d+) % \|$", schema, re.M):
            name = re.sub(r"\s*\(optional\)", "", m.group(1)).strip()
            tabelle.setdefault(name.split(",")[0].split(" oder ")[0].strip(), set()).add(int(m.group(2)))
    for v in kat["vorlagen"]:
        summe = sum(p["anteil"] for p in v["phasen"])
        ok(summe == 100, f"Vorlage {v['name']}: Anteile {summe} %")
        for p in v["phasen"]:
            typen_p = [b.split(":")[0].strip() for b in p["bausteine"]]
            ok(all(t in typen or t == "automatisch" for t in typen_p) and p.get("rolle") in rollen,
               f"Vorlage {v['name']}, {p['phase']}: Typen {typen_p}, Rolle {p.get('rolle')}")
            if tabelle and p.get("zusammen"):     # eine Karte für mehrere Phasen (AP13): Anteil = Summe
                summe_p = sum(min(tabelle.get(z, {0})) for z in p["zusammen"])
                ok(p["anteil"] == summe_p, f"Vorlage {v['name']}, {p['phase']}: {p['anteil']} % = {' + '.join(p['zusammen'])} in phasenschemata.md")
            elif tabelle:
                ok(p["anteil"] in tabelle.get(p["phase"], set()), f"Vorlage {v['name']}, {p['phase']}: {p['anteil']} % wie in phasenschemata.md")
        karten = sum(len(p["bausteine"]) for p in v["phasen"])
        ok(karten <= 6, f"Vorlage {v['name']}: {karten} Karten (höchstens sechs, AP13)")
    # Typ „automatisch“ und Gruppen der Typ-Auswahl (AP13): nur Typen aus dem Katalog, keiner doppelt
    alle_t = {e["typ"] for e in kat["typen"]}
    ok(set(kat["automatisch"]["typen"]) <= alle_t and all(kat["automatisch"]["typen"].values()), "automatisch: Typen mit je einer Zeile")
    gruppiert = [t for g in kat["typgruppen"] for t in g["typen"]]
    ok(set(gruppiert) <= alle_t and len(gruppiert) == len(set(gruppiert)), f"Typgruppen: {len(gruppiert)} Typen, keiner doppelt")
    for feld, werte in kat["oberflaeche"].items():
        ok(len(werte) >= 2 and all("wert" in w and w.get("text") for w in werte), f"Oberfläche {feld}: {len(werte)} Werte")
    ok({w["wert"] for w in kat["oberflaeche"]["farbe"] if w["wert"]} <= set(K.FARBEN), "Oberfläche Farben aus FARBEN")
    # Mindestmaße je Typ (AP13.1): vorhanden für die Übungstypen und den Hefteintrag, Zahlen plausibel
    mind = {e["typ"]: e["mindest"] for e in kat["typen"] if e.get("mindest")}
    erwartet = {"Quiz": (3, "Fragen"), "Zuordnen": (4, "Paare"), "Lückentext": (5, "Lücken"), "Lernkarten": (4, "Karten"),
                "Seite": (80, "Wörter"), "Textfeld": (80, "Wörter")}
    ok({t: (m["zahl"], m["einheit"]) for t, m in mind.items()} == erwartet, f"mindest je Typ ({sorted(mind)})")
    ok(all(isinstance(m["zahl"], int) and (1 < m["zahl"] <= 12 if m["einheit"] != "Wörter" else 40 <= m["zahl"] <= 200)
           and m.get("nur", "Hefteintrag") == "Hefteintrag" for m in mind.values()), "mindest: Zahlen plausibel, nur Hefteintrag als Bedingung")
    ok(all(mind[t]["nur"] == "Hefteintrag" for t in ("Seite", "Textfeld")), "mindest für Text und Seite nur im Hefteintrag")
    ok(all(mind[t].get("ab_jahrgang") == {1: 50, 7: 80} for t in ("Seite", "Textfeld")),
       "Hefteintrag nach Jahrgangsstufe gestaffelt (bis 6: 50 Wörter, ab 7: 80)")
    # AP13.3: Teilschritte fachneutral; Rechnen, Verfahren, Rundung höchstens im Nebensatz „wenn das Thema …“
    for v in kat["vorlagen"]:
        for ph in v["phasen"]:
            for b in ph["bausteine"]:
                schritt = b.partition(" | ")[2]
                pflicht = re.sub(r"wenn das Thema[^.;]*", "", schritt)
                ok(not re.search(r"\bRegel\b|[Rr]echn|[Rr]und|durchgerechnet|zwei\b.*Beispiel", pflicht),
                   f"Teilschritt fachneutral: {v['name']} · {ph['phase']}")
    pr = kat["pruefregeln"]
    ok(set(pr["uebung"]) <= alle_t and 50 <= pr["einstieg_woerter"] <= 150 and set(pr["fehlt"]) == {"einstieg", "lesen", "üben", "sichern"},
       "Prüfregeln: Übungstypen aus dem Katalog, Einstiegsgrenze, vier Phasen")
    km = kat["zeitbedarf"]["karte_minuten"]
    ok(set(km) == {"einstieg", "lesen", "üben", "sichern", "rahmen"} and all(0 < x <= 45 for x in km.values()),
       "Richtwert je Karte nach Rolle (Schwelle der Warnung vor dem Kopieren)")
    if fehler:
        print(f"\n{len(fehler)} Fehler")
        return 1
    print("\nalles gut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
