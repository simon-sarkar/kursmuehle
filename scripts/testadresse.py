"""Testadresse der Browser-Fassung (AP12a): web/ nach docs/2/ im öffentlichen Repo schreiben, nichts sonst.

usage: python3 scripts/testadresse.py --ziel DIR [--pruefen]

Vorher `python3 scripts/web_bundle.py` (generator.zip, katalog.json mit Version, logo.svg, Muster). Kopiert web/ ohne
messungen/ nach DIR/docs/2/ und löscht dort, was nicht mehr in web/ steht. DIR ist ein Klon von simon-sarkar/kursmuehle;
die Seite ist danach über GitHub Pages unter simon-sarkar.github.io/kursmuehle/2/ erreichbar, unverlinkt. `--pruefen`
schreibt nichts und gibt die Liste aus. Nach dem Schreiben prüft das Skript mit `git status`, dass sich im Ziel nur
Dateien unter docs/2/ geändert haben, und bricht sonst ab (Exit 1); so kann der Job nichts anderes veröffentlichen.
Der Job `testadresse` in .github/workflows/veroeffentlichen.yml ruft das seit AP13b nur noch für Alpha-Versionen auf
(Suffix außer -b, `veroeffentlichen.py --stufe`); bei Beta und Release schreibt scripts/veroeffentlichen.py die Mühle
nach docs/start/ und docs/2/ als Weiterleitung dorthin, die nächste Veröffentlichung ersetzt also eine Testfassung
unter docs/2/ wieder durch die Weiterleitung.
"""
import argparse
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
WEB = os.path.join(ROOT, "web")
PFAD = "docs/2"
AUSSCHLUSS = {"messungen", "__pycache__", ".DS_Store"}
PFLICHT = ["index.html", "app.js", "worker.js", "ansicht.css", "hinweise.json", "generator.zip", "katalog.json", "logo.svg",
           "vendor/pyodide/pyodide.js"]


def dateien():
    fehlt = [p for p in PFLICHT if not os.path.exists(os.path.join(WEB, p))]
    if fehlt:
        raise SystemExit(f"FEHLER in web/ fehlt {', '.join(fehlt)}; vorher python3 scripts/web_bundle.py")
    out = []
    for dirpath, dirnames, filenames in os.walk(WEB):
        dirnames[:] = sorted(d for d in dirnames if d not in AUSSCHLUSS)
        rel = os.path.relpath(dirpath, WEB).replace(os.sep, "/")
        for fn in sorted(filenames):
            if fn not in AUSSCHLUSS:
                out.append(fn if rel == "." else f"{rel}/{fn}")
    return out


def schreiben(ziel, pfade):
    basis = os.path.join(ziel, PFAD)
    if os.path.isdir(basis):
        shutil.rmtree(basis)
    for rel in pfade:
        out = os.path.join(basis, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        shutil.copy2(os.path.join(WEB, rel), out)


def geaendert(ziel):
    """Pfade, die git im Ziel als geändert, neu oder gelöscht meldet."""
    r = subprocess.run(["git", "-C", ziel, "status", "--porcelain", "--untracked-files=all"], capture_output=True,
                       text=True, check=True)
    return [z[3:].strip().strip('"') for z in r.stdout.splitlines() if z.strip()]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--ziel")
    ap.add_argument("--pruefen", action="store_true", help="nur die Liste ausgeben")
    args = ap.parse_args(argv)
    pfade = dateien()
    if args.pruefen or not args.ziel:
        print("\n".join(f"{PFAD}/{p}" for p in pfade))
        print(f"{len(pfade)} Dateien nach {PFAD}/", file=sys.stderr)
        return 0
    schreiben(args.ziel, pfade)
    if os.path.isdir(os.path.join(args.ziel, ".git")):
        fremd = [p for p in geaendert(args.ziel) if not p.startswith(PFAD + "/")]
        if fremd:
            print("FEHLER außerhalb von docs/2/ geändert: " + ", ".join(fremd[:10]), file=sys.stderr)
            return 1
    print(f"{args.ziel}/{PFAD}: {len(pfade)} Dateien")
    return 0


if __name__ == "__main__":
    sys.exit(main())
