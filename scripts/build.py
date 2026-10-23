"""Kurs bauen: Kursdatei (kurs.md) oder Python-Inhalt (content/course.py) lesen, Abschnitte zusammensetzen, .mbz schreiben,
Sicherung prüfen (check.py).

usage: python3 build.py --content DIR [--proto] [--delta [teile]] [--steckbrief PATH] [--out PATH] [--no-check]
                        [--vorlage NAME] [--format NAME] [--mit-nutzerdaten] [--website [ANZEIGE]]

DIR enthält kurs.md (Format: references/kursdatei.md), assets/ (PNG) und steckbrief.yaml.
Fallback: DIR/content/course.py mit build(A, sb, proto) -> {"sections", "parts", "badges", "image_path"}.
Kursformat aus dem Steckbrief (`kurs.format`: themen, kacheln, wochen, einthemen, komprimiert, einzelaktivitaet) oder
`--format`. Glossare mit Einträgen: die Sicherung trägt users=0; je Glossar liegt eine XML-Datei neben der .mbz
(Glossar -> Mehr -> Einträge importieren). `--mit-nutzerdaten` baut users=1 (userinfo=1 nur für Glossare), damit Moodle
die Einträge selbst wiederherstellt – nur sinnvoll, wenn die Plattform „Nutzer einbeziehen“ beim Wiederherstellen zulässt.
Website-Modus (`kurs.website` im Steckbrief, `website:` am Abschnitt, `--website`): jeder Abschnitt wird eine HTML-Datei
(Datei-Aktivität) mit Startseite, Kapiteln und Übungen; bewertete Teile bleiben Aktivitäten. Die HTML-Dateien liegen zur
Vorschau neben der .mbz (`<kurs>_website.html`). `website: textfeld` (AP7b): jede Übung wird ein Block in einem Textfeld,
ohne iframe; Vorschau aller Blöcke als `<kurs>_textfeld.html`.
Kachelformat: ein Überblick in Allgemeines wird weggelassen (doppelt die Kacheln).
Exit-Code 1, wenn die Prüfung der fertigen .mbz Fehler meldet (Datei bleibt zur Fehlersuche liegen).
"""
import argparse
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from PIL import Image  # noqa: E402

from gen import html as T  # noqa: E402
from gen.h5p import ImageRef  # noqa: E402
from gen.kursdatei import KursdateiFehler, parse, ts_sichtbar_ab  # noqa: E402
from gen.mbz import FORMATE, Course, Section, Writer, glossary_import_xml, moodle_format  # noqa: E402
from gen.website import vorschau_textfeld  # noqa: E402
from check import check_mbz, report  # noqa: E402


def asset_map(assets):
    A = {}
    if not os.path.isdir(assets):
        return A
    for f in sorted(os.listdir(assets)):
        if f.lower().endswith(".png"):
            path = os.path.join(assets, f)
            w, h = Image.open(path).size
            A[f] = (path, ImageRef(path, w, h))
    return A


def load_steckbrief(path):
    import yaml
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_python(content_dir, A, sb, proto):
    """Fallback: content/course.py (Python-Daten)."""
    sys.path.insert(0, content_dir)
    from content import course  # noqa: E402
    k = course.build(A, sb, proto=proto)
    for key, part in k.get("parts", {}).items():
        if part.available_from is None:
            part.available_from = ts_sichtbar_ab(sb.get("teile", {}).get(key, {}).get("sichtbar_ab"))
    return k


def glossar_xml(w, out, course):
    """Je Glossar mit Einträgen eine Moodle-Glossar-XML neben die .mbz (Ausweg, wenn die Plattform Nutzerdaten sperrt)."""
    for n, g in enumerate(w.glossare, 1):
        path = os.path.splitext(out)[0] + f"_glossar{n if len(w.glossare) > 1 else ''}.xml"
        with open(path, "w", encoding="utf-8") as f:
            f.write(glossary_import_xml(g))
        print(f"Glossar „{g.name}“: {len(g.entries)} Einträge auch als {path}")
    if w.glossare and w.users:
        print("Hinweis: Sicherung mit users=1 (--mit-nutzerdaten); beim Wiederherstellen „Nutzer einbeziehen“ anhaken. "
              "Sperrt die Plattform das Häkchen, fehlen die Einträge"
              + (" und die Badges" if course.badges else "")
              + ": dann ohne --mit-nutzerdaten bauen und die XML-Datei importieren.")
    elif w.glossare:
        print("Nach dem Import: Glossar → Mehr → Einträge importieren → " + ", ".join(
            os.path.basename(os.path.splitext(out)[0] + f"_glossar{n if len(w.glossare) > 1 else ''}.xml")
            for n in range(1, len(w.glossare) + 1)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", default=os.environ.get("KURS_CONTENT", "."),
                    help="Ordner mit kurs.md (oder content/course.py), assets/, steckbrief.yaml")
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
    args = ap.parse_args()

    content_dir = os.path.abspath(args.content)
    kursdatei = os.path.join(content_dir, "kurs.md")
    sb_path = args.steckbrief or os.path.join(content_dir, "steckbrief.yaml")
    sb = load_steckbrief(sb_path) if os.path.exists(sb_path) else {}
    teile = sb.get("teile", {}) or {}
    if args.website:
        sb.setdefault("kurs", {})
        sb["kurs"] = dict(sb["kurs"] or {}, website=args.website)
    if args.format:
        sb.setdefault("kurs", {})
        sb["kurs"] = dict(sb["kurs"] or {}, format=args.format)
    design = (sb.get("kurs", {}) or {}).get("design") or {}
    T.EMOJI = bool(design.get("emoji_marker", False))
    try:
        T.set_vorlage(args.vorlage or design.get("vorlage") or "schlicht")
    except ValueError as e:
        raise SystemExit(f"FEHLER {sb_path}: {e}")
    A = asset_map(os.path.join(content_dir, "assets"))

    if os.path.exists(kursdatei):
        try:
            k = parse(kursdatei, A, sb, proto=args.proto)
        except KursdateiFehler as e:
            raise SystemExit(f"FEHLER {e}")
    elif os.path.exists(os.path.join(content_dir, "content", "course.py")):
        k = load_python(content_dir, A, sb, args.proto)
    else:
        raise SystemExit(f"FEHLER {content_dir}: weder kurs.md noch content/course.py gefunden")

    meta = sb.get("kurs", {}) or {}
    name = meta.get("titel") or k.get("titel") or "Kurs"
    short = meta.get("kurzname") or name[:20]
    summary = meta.get("beschreibung", "")
    out_dir = os.path.join(content_dir, "out")
    try:
        fmt = moodle_format(args.format or meta.get("format") or "themen")
    except ValueError as e:
        raise SystemExit(f"FEHLER {'--format' if args.format else sb_path}: {e}")
    fmt_opts = meta.get("formatoptionen") or {}
    if not isinstance(fmt_opts, dict):
        raise SystemExit(f"FEHLER {sb_path}: formatoptionen muss ein Mapping name: wert sein")
    if fmt == "tiles" and "basecolour" not in fmt_opts and (meta.get("farbe") or k.get("farbe")):
        fmt_opts["basecolour"] = meta.get("farbe") or k.get("farbe")
    startdate = ts_sichtbar_ab(meta.get("start")) if meta.get("start") else None
    kurs = dict(format=fmt, format_options=fmt_opts, startdate=startdate, glossar_nutzerdaten=args.mit_nutzerdaten)

    if args.delta:
        keys = [x for x, v in teile.items() if (v or {}).get("status") == "pending"] if args.delta == "pending" \
            else [x.strip() for x in args.delta.split(",")]
        if not keys:
            raise SystemExit("FEHLER --delta: keine Teile mit status: pending im Steckbrief")
        sections = [Section(None)]
        for key in keys:
            if key not in k["parts"]:
                raise SystemExit(f"FEHLER --delta: Teil „{key}“ nicht in der Kursdatei (teil: {key} fehlt); "
                                 f"vorhanden: {', '.join(k['parts']) or 'keine'}")
            part = k["parts"][key]
            if isinstance(part, Section):
                sections.append(part)
            else:
                sections.append(Section(part.name, items=part.items, available_from=part.available_from))
        course = Course(name, short, summary=summary, sections=sections, badges=[], image_path=None, **kurs)
        fname = f"{short.lower()}_delta_{'-'.join(keys)}_{time.strftime('%Y%m%d-%H%M')}.mbz"
    else:
        fname = f"{short.lower()}_{'prototyp' if args.proto else 'kurs'}_{time.strftime('%Y%m%d-%H%M')}.mbz"
        if args.proto:
            name, short = f"{short} – Prototyp", f"{short}-Proto"
        course = Course(name, short, summary=summary, sections=k["sections"], badges=k.get("badges", []),
                        image_path=k.get("image_path"), **kurs)
    out = args.out or os.path.join(out_dir, fname)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    try:
        w = Writer(course, out)
        w.build()
    except ValueError as e:
        raise SystemExit(f"FEHLER {kursdatei}: {e}")
    print(out, os.path.getsize(out))
    glossar_xml(w, out, course)
    for n, (titel, path) in enumerate(k.get("websites", []), 1):
        ziel = os.path.splitext(out)[0] + f"_website{n if len(k['websites']) > 1 else ''}.html"
        shutil.copyfile(path, ziel)
        print(f"Website „{titel}“: Vorschau {ziel}")
    if k.get("textfelder"):
        ziel = os.path.splitext(out)[0] + "_textfeld.html"
        with open(ziel, "w", encoding="utf-8") as f:
            f.write(vorschau_textfeld(k["textfelder"], name))
        print(f"Übungen im Textfeld: {len(k['textfelder'])}, Vorschau {ziel}")
    if not args.no_check:
        errors, info, warnings = check_mbz(out)
        report(out, errors, info, warnings)
        if errors:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
