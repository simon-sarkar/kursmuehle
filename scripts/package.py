"""Release-Zip für Lehrkräfte packen: alles, was der Assistent im Einsatz braucht, nichts aus der Entwicklung.

usage: python3 scripts/package.py [--out dist/kursmuehle.zip]

Enthalten: SKILL.md, README.md, CHANGELOG.md, ROADMAP.md, LICENSE, LICENSE-DOCS.md, references/ (ohne export-schemata/),
scripts/ (Generator, check.py, Vorlagen, Tests), examples/ (ohne out/), docs/ (Logo, Projektseite, fortgeschrittene.md,
erfahrungen.md; ohne entwicklung/). Nicht enthalten: docs/entwicklung/ (Arbeitspakete, Protokolle),
references/export-schemata/, tools/, AGENTS.md und CLAUDE.md (Arbeitsregeln für das Repo), __pycache__, .mbz, .git.
Im Zip liegt alles unter dem Ordner kursmuehle/; der Dateiname bleibt bei jedem Release gleich, damit
releases/latest/download/kursmuehle.zip stabil bleibt. Die Version steht in CHANGELOG.md und wird beim Packen genannt.
"""
import argparse
import os
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
TOP = "kursmuehle"
DATEIEN = ["SKILL.md", "README.md", "CHANGELOG.md", "ROADMAP.md", "LICENSE", "LICENSE-DOCS.md"]
ORDNER = ["references", "scripts", "examples", "docs"]
AUSSCHLUSS_ORDNER = {"references/export-schemata", "docs/entwicklung", "tools"}
AUSSCHLUSS_NAMEN = {"__pycache__", "out", ".git", ".DS_Store", "work", "node_modules", "dist"}
AUSSCHLUSS_ENDUNGEN = (".pyc", ".mbz")


def version():
    with open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8") as f:
        return f.read().split("## ", 2)[1].split(" ")[0]


def dateien():
    """Alle Pfade (relativ zum Repo), die ins Zip gehören, sortiert."""
    out = []
    for name in DATEIEN:
        if not os.path.exists(os.path.join(ROOT, name)):
            raise SystemExit(f"FEHLER {name} fehlt")
        out.append(name)
    for ordner in ORDNER:
        for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, ordner)):
            rel = os.path.relpath(dirpath, ROOT).replace(os.sep, "/")
            dirnames[:] = sorted(d for d in dirnames
                                 if d not in AUSSCHLUSS_NAMEN and f"{rel}/{d}" not in AUSSCHLUSS_ORDNER)
            for fn in sorted(filenames):
                if fn in AUSSCHLUSS_NAMEN or fn.endswith(AUSSCHLUSS_ENDUNGEN):
                    continue
                out.append(f"{rel}/{fn}")
    return out


def packen(out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    pfade = dateien()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in pfade:
            z.write(os.path.join(ROOT, p), f"{TOP}/{p}")
    return pfade


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "dist", "kursmuehle.zip"))
    args = ap.parse_args(argv)
    pfade = packen(args.out)
    groesse = os.path.getsize(args.out)
    print(f"{args.out}: Version {version()}, {len(pfade)} Dateien, {groesse // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
