"""Öffentlichen Stand aus dem Entwicklungsrepo zusammenstellen.

usage: python3 scripts/veroeffentlichen.py --ziel DIR [--pruefen]
       python3 scripts/veroeffentlichen.py --stufe      (gibt release, beta oder alpha für die Version im CHANGELOG aus)

Kopiert nach DIR genau die veröffentlichten Dateien und löscht dort alles andere (außer .git): SKILL.md, README.md,
CHANGELOG.md, ROADMAP.md (ohne den Abschnitt „### 2.0-Details“), LICENSE, LICENSE-DOCS.md, AGENTS.md, CLAUDE.md,
references/ ohne export-schemata/, scripts/ (mit den Test-Fixtures), docs/ ohne docs/entwicklung/ (aber mit
docs/entwicklung/protokolle/ ohne die 2.0-Gutachten), tools/bilder/, tools/jsprobe/, .gitignore.
Dazu seit AP13b die Browser-Fassung: web/ (ohne messungen/) nach docs/start/, also unter kursmuehle.de/start/; vorher
`python3 scripts/web_bundle.py`, sonst bricht das Skript ab. docs/index.html ist die Landingpage, docs/impressum.html
das Impressum, docs/2/index.html leitet die alte Testadresse auf ../start/ weiter (entfällt mit 2.0.0).
Nicht veröffentlicht: übriges docs/entwicklung/, references/export-schemata/, übrige tools/, .github/; examples/ gibt es
seit AP12a nicht mehr (keine Beispielkurse).
Stufen (`stufe()`): Version ohne Suffix = release, Suffix -b… = beta (wird vollständig veröffentlicht, Vorab-Release),
jedes andere Suffix = alpha (gesperrt; nur der Job `testadresse` schreibt dann docs/2/, siehe scripts/testadresse.py).
Die Action `.github/workflows/veroeffentlichen.yml` ruft das bei jedem Push auf main auf und schiebt DIR in das
öffentliche Repo; `--pruefen` gibt nur die Liste aus.
"""
import argparse
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import testadresse  # noqa: E402  (Liste der Dateien in web/ und Pflichtdateien des Bündels)

DATEIEN = ["SKILL.md", "README.md", "CHANGELOG.md", "ROADMAP.md", "LICENSE", "LICENSE-DOCS.md", "AGENTS.md", "CLAUDE.md",
           ".gitignore"]
ORDNER = ["references", "scripts", "docs", "tools/bilder", "tools/jsprobe"]
START = "docs/start"      # web/ landet hier (AP13b)
# docs/entwicklung/ bleibt privat (Plan, Gutachten, Arbeitspakete, Phasenschemata); nur protokolle/ ist öffentlich, weil
# README, ROADMAP und Projektseite darauf verlinken (Import-Tests, Fremdtest, ChatGPT-Läufe) – ohne die 2.0-Gutachten.
AUSSCHLUSS_ORDNER = {"references/export-schemata", "docs/entwicklung", START}
EINSCHLUSS_ORDNER = ["docs/entwicklung/protokolle"]
AUSSCHLUSS_MUSTER = re.compile(r"^docs/entwicklung/protokolle/2\.0-gutachten-.*\.md$")
AUSSCHLUSS_NAMEN = {"__pycache__", "out", ".git", ".DS_Store", "work", "node_modules", "dist", "messungen"}
AUSSCHLUSS_ENDUNGEN = (".pyc", ".mbz")
ROADMAP_SCHNITT = "### 2.0-Details"


def dateien():
    out = []
    for name in DATEIEN:
        if not os.path.exists(os.path.join(ROOT, name)):
            raise SystemExit(f"FEHLER {name} fehlt")
        out.append(name)
    for ordner in ORDNER + EINSCHLUSS_ORDNER:
        basis = os.path.join(ROOT, ordner)
        if not os.path.isdir(basis):
            raise SystemExit(f"FEHLER Ordner {ordner} fehlt")
        for dirpath, dirnames, filenames in os.walk(basis):
            rel = os.path.relpath(dirpath, ROOT).replace(os.sep, "/")
            dirnames[:] = sorted(d for d in dirnames if d not in AUSSCHLUSS_NAMEN and f"{rel}/{d}" not in AUSSCHLUSS_ORDNER)
            for fn in sorted(filenames):
                if fn in AUSSCHLUSS_NAMEN or fn.endswith(AUSSCHLUSS_ENDUNGEN) or AUSSCHLUSS_MUSTER.match(f"{rel}/{fn}"):
                    continue
                out.append(f"{rel}/{fn}")
    out += [f"{START}/{p}" for p in testadresse.dateien()]
    return out


def quelle(rel):
    """Pfad im Entwicklungsrepo zu einem veröffentlichten Pfad (docs/start/… kommt aus web/)."""
    if rel.startswith(START + "/"):
        return os.path.join(testadresse.WEB, rel[len(START) + 1:])
    return os.path.join(ROOT, rel)


def version():
    with open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8") as f:
        m = re.search(r"^## (\d+(?:\.\d+)+(?:-[0-9A-Za-z.]+)?)", f.read(), re.M)
    if not m:
        raise SystemExit("FEHLER keine Version im CHANGELOG")
    return m.group(1)


def stufe(v):
    """release (kein Suffix), beta (Suffix -b…, wird vollständig veröffentlicht) oder alpha (jedes andere Suffix)."""
    if "-" not in v:
        return "release"
    return "beta" if v.split("-", 1)[1].startswith("b") else "alpha"


def roadmap_kuerzen(text):
    """Abschnitt „### 2.0-Details“ bis zur nächsten Überschrift gleicher oder höherer Ebene entfernen."""
    m = re.search(rf"^{re.escape(ROADMAP_SCHNITT)}.*?(?=^#{{1,3}} |\Z)", text, re.S | re.M)
    if not m:
        raise SystemExit(f"FEHLER ROADMAP.md: Abschnitt „{ROADMAP_SCHNITT}“ nicht gefunden")
    return text[:m.start()].rstrip("\n") + "\n\n" + text[m.end():].lstrip("\n")


def _aufraeumen(ziel):
    """Alles im Ziel löschen außer .git."""
    for name in sorted(os.listdir(ziel)):
        if name == ".git":
            continue
        p = os.path.join(ziel, name)
        if os.path.isdir(p):
            shutil.rmtree(p)
        else:
            os.remove(p)


def schreiben(ziel, pfade):
    os.makedirs(ziel, exist_ok=True)
    _aufraeumen(ziel)
    for rel in pfade:
        q, out = quelle(rel), os.path.join(ziel, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if rel == "ROADMAP.md":
            with open(q, encoding="utf-8") as f:
                text = roadmap_kuerzen(f.read())
            with open(out, "w", encoding="utf-8") as f:
                f.write(text)
        else:
            shutil.copy2(q, out)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--ziel")
    ap.add_argument("--pruefen", action="store_true", help="nur Liste und ROADMAP-Schnitt prüfen")
    ap.add_argument("--stufe", action="store_true", help="Stufe der Version im CHANGELOG ausgeben")
    args = ap.parse_args(argv)
    if args.stufe:
        print(stufe(version()))
        return 0
    pfade = dateien()
    with open(os.path.join(ROOT, "ROADMAP.md"), encoding="utf-8") as f:
        roadmap_kuerzen(f.read())
    if args.pruefen or not args.ziel:
        print("\n".join(pfade))
        print(f"{len(pfade)} Dateien", file=sys.stderr)
        return 0
    schreiben(args.ziel, pfade)
    print(f"{args.ziel}: {len(pfade)} Dateien")
    return 0


if __name__ == "__main__":
    sys.exit(main())
