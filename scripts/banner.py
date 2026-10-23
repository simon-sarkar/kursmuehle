"""Kursbanner, Kursbild und Kachelbilder als PNG rendern (dunkler Grund, Motiv in Akzentfarbe), wenn der Assistent keine
Bilder erzeugen kann. Alle Bilder sind textfrei; Text steht als HTML im Kurs (auf dem Handy lesbar).

usage: python3 scripts/banner.py --farbe "#0F766E" --out <kursordner>/assets/banner.png              Banner 1600 × 420
       python3 scripts/banner.py --farbe "#0F766E" --hoehe 520 --out <kursordner>/assets/kurs.png    Kursbild
       python3 scripts/banner.py --kachel --nummer 1-6 --farbe "#0F766E" --out <kursordner>/assets/kachel{n}.png
                                                                       Kachelbilder 900 × 600, je Abschnitt ein Motiv
       python3 scripts/banner.py --mit-text --titel "…" --untertitel "…" --out <kursordner>/assets/abschnitt2.png
                                                                       Banner mit Text, nur für `Bild:` im Abschnitt

Kursbild (overviewfiles) und Kachelbilder bleiben ohne Text: die Plattform legt Kursnamen und Abschnittstitel selbst
darüber. `--motiv` wählt das Muster: rings, dots, bars, arcs, grid, waves, tris, lines; bei `--kachel` ohne `--motiv`
bekommt jede Nummer ein eigenes. `--farbe` darf eine Komma-Liste sein (eine Farbe je Nummer, wird wiederholt).

Braucht Playwright + Chromium (pip install playwright; python -m playwright install chromium; vorhandenes Chromium über
CHROMIUM_PATH=/pfad/zu/chrome). Fehlt beides, bleibt das
Banner-Element ohne `bild:` – es wird dann als farbiger Block gebaut; im Kachelformat dann `kachelicon:` statt Bild.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
R_KINDS = ["rings", "dots", "bars", "arcs", "grid", "waves", "tris", "lines"]


def nummern(s):
    """„3“ -> [3], „1-6“ -> [1..6], „1,3,5“ -> [1, 3, 5]."""
    out = []
    for teil in s.split(","):
        a, _, b = teil.strip().partition("-")
        out += list(range(int(a), int(b) + 1)) if b else [int(a)]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--titel", default="")
    ap.add_argument("--untertitel", default="")
    ap.add_argument("--mit-text", action="store_true", help="Titel, Untertitel und Kicker ins Bild rendern (nur Banner im Abschnitt)")
    ap.add_argument("--kachel", action="store_true", help="Kachelbild 900 × 600 ohne Text, Motiv mittig")
    ap.add_argument("--nummer", default="1", help="Abschnittsnummer(n) für --kachel: 3, 1-6 oder 1,3,5; wählt das Motiv")
    ap.add_argument("--motiv", choices=sorted(set(R_KINDS)))
    ap.add_argument("--kicker", default="", help="kleine Zeile über dem Titel, z. B. Fach und Jahrgangsstufe")
    ap.add_argument("--farbe", default="#1D5FD1", help="Akzentfarbe #RRGGBB (bei --kachel auch Komma-Liste)")
    ap.add_argument("--hoehe", type=int, default=420, help="Höhe in px (Kursbild: 520)")
    ap.add_argument("--out", required=True, help="Ziel-PNG; bei mehreren Nummern mit {n}, z. B. assets/kachel{n}.png")
    args = ap.parse_args()
    try:
        from gen import render as R
    except ImportError:
        raise SystemExit("FEHLER Playwright fehlt (pip install playwright && python3 -m playwright install chromium). "
                         "Ohne Bild: Banner-Element ohne `bild:` lassen, Kacheln mit `kachelicon:`.")
    if args.mit_text and (args.kachel or not args.titel):
        raise SystemExit("FEHLER --mit-text braucht --titel und gilt nicht für --kachel (Kachelbilder bleiben textfrei)")
    farben = [f.strip() for f in args.farbe.split(",") if f.strip()]
    if args.kachel:
        nums = nummern(args.nummer)
        if len(nums) > 1 and "{n}" not in args.out:
            raise SystemExit("FEHLER mehrere Nummern brauchen {n} in --out, z. B. assets/kachel{n}.png")
        jobs = [(R.kachel_html(n, hue=farben[i % len(farben)], kind=args.motiv), args.out.replace("{n}", str(n)))
                for i, n in enumerate(nums)]
    else:
        t, u, kick = (args.titel, args.untertitel, args.kicker or None) if args.mit_text else ("", "", None)
        jobs = [(R.banner_html(0, t, u, [], h=args.hoehe, hue=farben[0], kicker=kick, kind=args.motiv or "rings"), args.out)]
    for _, out in jobs:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    R.render_all(jobs)
    for _, out in jobs:
        print(out, os.path.getsize(out))


if __name__ == "__main__":
    main()
