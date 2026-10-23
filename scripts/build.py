"""Kurs bauen: Kursdatei (kurs.md) oder Python-Inhalt (content/course.py) lesen, Abschnitte zusammensetzen, .mbz schreiben.

usage: python3 build.py --content DIR [--proto] [--delta [teile]] [--steckbrief PATH] [--out PATH]

DIR enthält kurs.md (Format: references/kursdatei.md), assets/ (PNG) und steckbrief.yaml.
Fallback: DIR/content/course.py mit build(A, sb, proto) -> {"sections", "parts", "badges", "image_path"}.
"""
import argparse
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from PIL import Image  # noqa: E402

from gen import html as T  # noqa: E402
from gen.h5p import ImageRef  # noqa: E402
from gen.kursdatei import KursdateiFehler, parse, ts_sichtbar_ab  # noqa: E402
from gen.mbz import Course, Section, Writer  # noqa: E402


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
    args = ap.parse_args()

    content_dir = os.path.abspath(args.content)
    kursdatei = os.path.join(content_dir, "kurs.md")
    sb_path = args.steckbrief or os.path.join(content_dir, "steckbrief.yaml")
    sb = load_steckbrief(sb_path) if os.path.exists(sb_path) else {}
    teile = sb.get("teile", {}) or {}
    T.EMOJI = bool((sb.get("kurs", {}) or {}).get("design", {}).get("emoji_marker", False))
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
        course = Course(name, short, summary=summary, sections=sections, badges=[], image_path=None)
        fname = f"{short.lower()}_delta_{'-'.join(keys)}_{time.strftime('%Y%m%d-%H%M')}.mbz"
    else:
        fname = f"{short.lower()}_{'prototyp' if args.proto else 'kurs'}_{time.strftime('%Y%m%d-%H%M')}.mbz"
        if args.proto:
            name, short = f"{short} – Prototyp", f"{short}-Proto"
        course = Course(name, short, summary=summary, sections=k["sections"], badges=k.get("badges", []),
                        image_path=k.get("image_path"))
    out = args.out or os.path.join(out_dir, fname)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    Writer(course, out).build()
    print(out, os.path.getsize(out))


if __name__ == "__main__":
    main()
