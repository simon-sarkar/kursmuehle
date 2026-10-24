"""Kurs bauen: Kursdatei (kurs.md) lesen, Abschnitte zusammensetzen, .mbz schreiben, Sicherung prüfen (check.py).
Die Arbeit macht `gen.api` (dieselbe Schnittstelle wie der Bau im Browser); hier stehen nur Aufruf, Dateien und Ausgabe.

usage: python3 build.py --content DIR [--proto] [--delta [teile]] [--steckbrief PATH] [--out PATH] [--no-check]
                        [--vorlage NAME] [--format NAME] [--mit-nutzerdaten] [--website [ANZEIGE]]
                        [--zeit SEKUNDEN] [--seed ZAHL]

DIR enthält kurs.md (Format: references/kursdatei.md), assets/ (PNG, JPEG, Dateien) und steckbrief.yaml.
Kursformat aus dem Steckbrief (`kurs.format`: themen, kacheln, wochen, einthemen, komprimiert, einzelaktivitaet) oder
`--format`. Glossare mit Einträgen: die Sicherung trägt users=0; je Glossar liegt eine XML-Datei neben der .mbz
(Glossar -> Mehr -> Einträge importieren). `--mit-nutzerdaten` baut users=1 (userinfo=1 nur für Glossare), damit Moodle
die Einträge selbst wiederherstellt – nur sinnvoll, wenn die Plattform „Nutzer einbeziehen“ beim Wiederherstellen zulässt.
Website-Modus (`kurs.website` im Steckbrief, `website:` am Abschnitt, `--website`): jeder Abschnitt wird eine HTML-Datei
(Datei-Aktivität) mit Startseite, Kapiteln und Übungen; bewertete Teile bleiben Aktivitäten. Die HTML-Dateien liegen zur
Vorschau neben der .mbz (`<kurs>_website.html`). `website: textfeld` (AP7b): jede Übung wird ein Block in einem Textfeld,
ohne iframe; Vorschau aller Blöcke als `<kurs>_textfeld.html`.
Kachelformat: ein Überblick in Allgemeines wird weggelassen (doppelt die Kacheln).
`--zeit` und `--seed` machen die Sicherung reproduzierbar (feste Zeitstempel, feste H5P-IDs); die CI vergleicht damit den
Bau in Pyodide mit dem in CPython.
Exit-Code 1, wenn Kursdatei oder Prüfung der fertigen .mbz Fehler melden (Datei bleibt zur Fehlersuche liegen).
Der Python-Ausweg `content/course.py` aus 1.x ist entfallen; Kursinhalte kommen aus kurs.md.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen import api  # noqa: E402
from gen import html as T  # noqa: E402
from gen.mbz import FORMATE  # noqa: E402
from check import report  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", default=os.environ.get("KURS_CONTENT", "."),
                    help="Ordner mit kurs.md, assets/, steckbrief.yaml")
    ap.add_argument("--proto", action="store_true", help="nur Teile ohne `prototyp: nein`; Kursname mit Zusatz „Prototyp“")
    ap.add_argument("--delta", nargs="?", const="pending",
                    help="nur Teile bauen: Komma-Liste von Teil-Schlüsseln oder (ohne Wert) alle mit status: pending")
    ap.add_argument("--steckbrief")
    ap.add_argument("--out")
    ap.add_argument("--no-render", action="store_true", help="ohne Wirkung (Bilder werden nicht mehr von build.py gerendert)")
    ap.add_argument("--no-check", action="store_true", help="fertige .mbz nicht mit check.py prüfen")
    ap.add_argument("--vorlage", choices=sorted(T.VORLAGEN), help="Designvorlage (überschreibt design.vorlage im Steckbrief)")
    ap.add_argument("--format", help=f"Kursformat (überschreibt kurs.format im Steckbrief): {', '.join(FORMATE)} oder Moodle-Name")
    ap.add_argument("--mit-nutzerdaten", action="store_true",
                    help="Sicherung mit users=1 (nur Glossare), Einträge ohne XML-Import; nur wenn die Plattform es zulässt")
    ap.add_argument("--website", nargs="?", const="ja", metavar="ANZEIGE",
                    help="Website-Modus für alle Abschnitte (überschreibt kurs.website): ja (eingebettet), vollbild, "
                         "'neues fenster' (Pop-up), textfeld (Übungen als Block im Textfeld) oder nein")
    ap.add_argument("--zeit", type=int, help="fester Zeitstempel (Unix-Sekunden) für reproduzierbare Sicherungen")
    ap.add_argument("--seed", type=int, help="fester Zufalls-Seed für die H5P-IDs (mit --zeit byteidentischer Bau)")
    args = ap.parse_args()

    content_dir = os.path.abspath(args.content)
    kursdatei = os.path.join(content_dir, "kurs.md")
    if not os.path.exists(kursdatei):
        raise SystemExit(f"FEHLER {content_dir}: kurs.md nicht gefunden")
    sb_path = args.steckbrief or os.path.join(content_dir, "steckbrief.yaml")
    with open(kursdatei, encoding="utf-8") as f:
        kurs_md = f.read()
    sb = ""
    if os.path.exists(sb_path):
        with open(sb_path, encoding="utf-8") as f:
            sb = f.read()
    optionen = dict(proto=args.proto, delta=args.delta, vorlage=args.vorlage, format=args.format, website=args.website,
                    mit_nutzerdaten=args.mit_nutzerdaten, pruefen=not args.no_check,
                    dateiname=os.path.basename(args.out) if args.out else None)
    try:
        e = api.baue_voll(kurs_md, sb, os.path.join(content_dir, "assets"), zeit=args.zeit, seed=args.seed,
                          optionen=optionen)
    except ValueError as ex:
        raise SystemExit(f"FEHLER {sb_path}: {ex}")
    for d in e.diagnosen:
        if d["stufe"] == "hinweis" and d["art"] != "glossar":
            print(f"Hinweis: {e.diagnosen.satz(d).split(': ', 1)[1]}", file=sys.stderr)
        elif d["stufe"] == "warnung" and d["art"] != "pruefung":
            print(f"Warnung: {e.diagnosen.satz(d).split(': ', 1)[1]}", file=sys.stderr)
    fehler = [d for d in e.diagnosen if d["stufe"] == "fehler" and d["art"] != "pruefung"]
    if fehler:
        for d in fehler:
            wo = f"{kursdatei}" + (f" Zeile {d['zeile']}" if d["zeile"] else "") + (f" ({d['element']})" if d["element"] else "")
            print(f"FEHLER {wo}: {d['text']}", file=sys.stderr)
        raise SystemExit(1)
    out = args.out or os.path.join(content_dir, "out", e.dateiname)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    daten = e.mbz
    if daten is None:
        # Prüfung fand Fehler: Datei trotzdem zur Fehlersuche hinlegen (wie bisher)
        daten = _rohbau(kurs_md, sb, content_dir, args, optionen)
    with open(out, "wb") as f:
        f.write(daten)
    print(out, os.path.getsize(out))
    stamm = os.path.splitext(out)[0]
    for name, xml in e.glossare:
        path = os.path.join(os.path.dirname(out), name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(xml)
    if e.glossare and args.mit_nutzerdaten:
        print("Hinweis: Sicherung mit users=1 (--mit-nutzerdaten); beim Wiederherstellen „Nutzer einbeziehen“ anhaken. "
              "Sperrt die Plattform das Häkchen, fehlen die Einträge: dann ohne --mit-nutzerdaten bauen und die "
              "XML-Datei importieren.")
    elif e.glossare:
        print("Nach dem Import: Glossar → Mehr → Einträge importieren → " + ", ".join(n for n, _ in e.glossare))
    for n, (titel, html) in enumerate(e.websites, 1):
        ziel = stamm + f"_website{n if len(e.websites) > 1 else ''}.html"
        with open(ziel, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Website „{titel}“: Vorschau {ziel}")
    if e.textfeld_html:
        ziel = stamm + "_textfeld.html"
        with open(ziel, "w", encoding="utf-8") as f:
            f.write(e.textfeld_html)
        print(f"Übungen im Textfeld: Vorschau {ziel}")
    if e.pruefung:
        errors, info, warnings = e.pruefung
        report(out, errors, info, warnings)
        if errors:
            raise SystemExit(1)


def _rohbau(kurs_md, sb, content_dir, args, optionen):
    """Bau ohne Prüfung, damit eine fehlerhafte Sicherung zur Fehlersuche liegen bleibt."""
    o = dict(optionen, pruefen=False)
    e = api.baue_voll(kurs_md, sb, os.path.join(content_dir, "assets"), zeit=args.zeit, seed=args.seed, optionen=o)
    return e.mbz or b""


if __name__ == "__main__":
    main()
