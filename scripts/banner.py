"""Kursbanner als PNG rendern (dunkler Grund, Motiv in Akzentfarbe, 1600 × 420 px), wenn der Assistent keine Bilder erzeugen kann.

usage: python3 scripts/banner.py --farbe "#0F766E" --out <kursordner>/assets/banner.png
       python3 scripts/banner.py --mit-text --titel "Netzwerkkomponenten" --untertitel "…" --kicker "Informatik 9" \
           --farbe "#0F766E" --hoehe 520 --out <kursordner>/assets/kurs.png     (Kursbild mit Text)

Ohne `--mit-text` bleibt das Bild textfrei; Titel und Satz setzt das Banner-Element der Kursdatei als HTML darunter
(auf dem Handy lesbar, Text im Bild wäre klein). `--motiv` wählt das Muster: rings, dots, bars, arcs, grid, waves, tris, lines.

Braucht Playwright + Chromium (pip install playwright; python -m playwright install chromium; vorhandenes Chromium über
CHROMIUM_PATH=/pfad/zu/chrome). Fehlt beides, bleibt das
Banner-Element ohne `bild:` – es wird dann als farbiger Block gebaut.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
R_KINDS = ["rings", "dots", "bars", "arcs", "grid", "waves", "tris", "lines"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--titel", default="")
    ap.add_argument("--untertitel", default="")
    ap.add_argument("--mit-text", action="store_true", help="Titel, Untertitel und Kicker ins Bild rendern (sonst textfrei)")
    ap.add_argument("--motiv", default="rings", choices=sorted(set(R_KINDS)))
    ap.add_argument("--kicker", default="", help="kleine Zeile über dem Titel, z. B. Fach und Jahrgangsstufe")
    ap.add_argument("--farbe", default="#1D5FD1", help="Akzentfarbe #RRGGBB")
    ap.add_argument("--hoehe", type=int, default=420, help="Höhe in px (Kursbild: 520)")
    ap.add_argument("--out", required=True, help="Ziel-PNG, in der Regel <kursordner>/assets/banner.png")
    args = ap.parse_args()
    try:
        from gen import render as R
    except ImportError:
        raise SystemExit("FEHLER Playwright fehlt (pip install playwright && python3 -m playwright install chromium). "
                         "Ohne Bild: Banner-Element ohne `bild:` lassen.")
    if args.mit_text and not args.titel:
        raise SystemExit("FEHLER --mit-text braucht --titel")
    t, u, kick = (args.titel, args.untertitel, args.kicker or None) if args.mit_text else ("", "", None)
    html = R.banner_html(0, t, u, [], h=args.hoehe, hue=args.farbe, kicker=kick, kind=args.motiv)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    R.render_all([(html, args.out)])
    print(args.out, os.path.getsize(args.out))


if __name__ == "__main__":
    main()
