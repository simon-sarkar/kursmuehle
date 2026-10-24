"""Fixtures als Kursmappe (ZIP, Formatversion 2) für die Browser-Tests; seit AP12a bündelt web_bundle.py keine
Beispielmappen mehr, die Tests öffnen die Fixtures wie eine Lehrkraft ihre Kursdatei."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))
from gen import mappe as M  # noqa: E402


def dateien(name):
    """Dateien eines Fixtures (kurs.md, steckbrief.yaml, mappe.json, assets/…) als dict Pfad -> Bytes."""
    ordner = os.path.join(HERE, name)
    out = {}
    for fn in ("kurs.md", "steckbrief.yaml", "mappe.json"):
        if os.path.exists(os.path.join(ordner, fn)):
            with open(os.path.join(ordner, fn), "rb") as f:
                out[fn] = f.read()
    for fn in sorted(os.listdir(os.path.join(ordner, "assets"))):
        with open(os.path.join(ordner, "assets", fn), "rb") as f:
            out[f"assets/{fn}"] = f.read()
    return out


def zip_bytes(name):
    m = M.aus_dateien(dateien(name))
    return M.schreiben(m["mappe"], m["kurs_md"], m["steckbrief_text"], m["assets"])


def zip_datei(name, ordner):
    """Kursmappe des Fixtures nach <ordner>/<name>.kursmappe.zip schreiben, Pfad zurück."""
    pfad = os.path.join(ordner, f"{name}.kursmappe.zip")
    with open(pfad, "wb") as f:
        f.write(zip_bytes(name))
    return pfad
