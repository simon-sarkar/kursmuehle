"""Dateien für die Browser-Fassung (web/) zusammenstellen, die nicht im Repo liegen:

    web/generator.zip             Generator (scripts/gen, scripts/check.py, scripts/templates) für Pyodide
    web/logo.svg                  Kopie von docs/logo.svg (Kopfzeile, Favicon)
    web/muster-locker.svg         Seitenhintergrund (Motiv des Wasserzeichens gekachelt, aus docs/make_logo.py; AP12a),
    web/muster-dicht.svg          dazu die dichtere Fassung zum Vergleich (body data-muster="dicht")
    web/muster-*-dunkel.svg       dieselben Muster in Creme für das dunkle Schema (AP13.3)
    web/katalog.json              Bausteintypen (Typ, Formularname, Rolle, Minuten), Einheitsvorlagen, Auswahl der
                                  Kursangaben, Chats, Gruppen der Typ-Auswahl, Typen zu „automatisch“ (AP13) und die
                                  Version aus CHANGELOG.md (Zeile „Beta“ oder „Testfassung“)
                                  aus references/katalog.yaml, damit die Seite vor dem Laden von Pyodide bedienbar ist

usage: python3 scripts/web_bundle.py
Vor jedem Start der Seite und in der CI aufrufen; die Ausgaben sind in .gitignore. Beispielmappen gibt es seit AP12a
nicht mehr (keine Beispielkurse); die Tests öffnen die Fixtures aus scripts/tests/fixtures/ als Kursdatei.
"""
import json
import os
import sys
import zipfile

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)

WEB = os.path.join(ROOT, "web")
_ZEIT = (1980, 1, 1, 0, 0, 0)


def generator_zip(out):
    quellen = []
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, "scripts")):
        rel = os.path.relpath(dirpath, ROOT).replace(os.sep, "/")
        dirnames[:] = sorted(d for d in dirnames if d in ("gen", "templates") or rel == "scripts" and d in ("gen", "templates"))
        if rel == "scripts":
            quellen.append("scripts/check.py")
            continue
        for fn in sorted(filenames):
            if fn.endswith(".pyc") or fn == "__pycache__":
                continue
            quellen.append(f"{rel}/{fn}")
    quellen.append("references/katalog.yaml")     # gen.mappe.katalog() liest ihn (Rollen, Vorlagen)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in quellen:
            zi = zipfile.ZipInfo(p, date_time=_ZEIT)
            zi.compress_type = zipfile.ZIP_DEFLATED
            with open(os.path.join(ROOT, p), "rb") as f:
                z.writestr(zi, f.read())
    return quellen


def version():
    """Erste Überschrift „## X.Y.Z…“ in CHANGELOG.md (wie package.py und die Veröffentlichungs-Action)."""
    with open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8") as f:
        return f.read().split("## ", 2)[1].split(" ")[0]


def katalog_json(out):
    with open(os.path.join(ROOT, "references", "katalog.yaml"), encoding="utf-8") as f:
        kat = yaml.safe_load(f)
    daten = {"typen": [{"typ": e["typ"], "formularname": e["formularname"], "rolle": e.get("rolle", "rahmen"),
                        "minuten": e.get("minuten", True)} for e in kat["typen"]],
             "vorlagen": kat["vorlagen"], "oberflaeche": kat["oberflaeche"], "chats": kat["chats"],
             "typgruppen": kat["typgruppen"], "automatisch": list(kat["automatisch"]["typen"]),
             "version": version()}
    with open(out, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=1)
    return len(daten["typen"]), len(daten["vorlagen"])


def main():
    quellen = generator_zip(os.path.join(WEB, "generator.zip"))
    print(f"web/generator.zip: {len(quellen)} Dateien, {os.path.getsize(os.path.join(WEB, 'generator.zip')) // 1024} KB")
    for name in ("logo.svg", "muster-locker.svg", "muster-dicht.svg", "muster-locker-dunkel.svg",   # Logo, Muster hell
                 "muster-dicht-dunkel.svg"):                                                       # und dunkel (AP13.3)
        with open(os.path.join(ROOT, "docs", name), "rb") as f, open(os.path.join(WEB, name), "wb") as g:
            g.write(f.read())
    n, v = katalog_json(os.path.join(WEB, "katalog.json"))
    print(f"web/katalog.json: {n} Bausteintypen, {v} Einheitsvorlagen")
    return 0


if __name__ == "__main__":
    sys.exit(main())
