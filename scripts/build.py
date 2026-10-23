"""Build the course: render assets, assemble sections, write .mbz.

usage: python3 build.py [--content DIR] [--proto] [--delta [teile]] [--steckbrief PATH] [--out PATH]
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

from gen import render as R  # noqa: E402
from gen.h5p import ImageRef  # noqa: E402
from gen.mbz import Course, Section, Badge, Writer  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
# Kursinhalt liegt in einem eigenen Ordner (--content): content/ (Python-Daten), assets/, steckbrief.yaml
_pre = argparse.ArgumentParser(add_help=False)
_pre.add_argument("--content", default=os.environ.get("KURS_CONTENT", os.path.join(HERE, "..", "examples", "alltagskompetenz")))
CONTENT_DIR = os.path.abspath(_pre.parse_known_args()[0].content)
if not os.path.isdir(os.path.join(CONTENT_DIR, "content")):
    CONTENT_DIR = HERE  # Entwicklungs-Layout: content/ neben build.py
sys.path.insert(0, CONTENT_DIR)
try:  # generischer Kurs: content/course.py mit build(A, sb, proto) -> dict
    from content import course as COURSE  # noqa: E402
except ImportError:
    COURSE = None
    from content import tf1, others  # noqa: E402  (Demo-Kurs Alltagskompetenz)
ASSETS = os.path.join(CONTENT_DIR, "assets")
OUT = os.path.join(CONTENT_DIR, "out")
os.makedirs(OUT, exist_ok=True)

TF_TITLES = {1: ("Probleme selbst lösen", "Beschreiben, suchen, prüfen – mit Google, Quellen und KI"),
             2: ("Digitale Selbstbestimmung", "Sicherheit, Daten, Medienbalance"),
             3: ("Mentale Gesundheit & Selbstfürsorge", "Stress, Schlaf, Grenzen, Hilfe"),
             4: ("Körper, Ernährung & Gesundheitssystem", "Essen, Bewegung, Arzt, Erste Hilfe"),
             5: ("Geld & Finanzen", "Budget, Konto, Sparen, Schulden"),
             6: ("Konsum, Verträge & Rechte", "Abos, Kündigen, Reklamieren"),
             7: ("Wohnen, Haushalt & Bürokratie", "Mietvertrag, Versicherung, Ämter"),
             8: ("Ich & die anderen", "Kommunikation, Konflikte, Selbstorganisation")}
LE_TITLES = {1: ("Das Problem zerlegen", "Beschreiben, bevor du suchst – und die richtigen Suchwörter finden", "ca. 20 min"),
             2: ("Suchen & Quellen prüfen", "Trefferlisten lesen, vier Prüfschritte, Fake erkennen", "ca. 25 min"),
             3: ("KI als Werkzeug", "Richtig fragen, Antworten prüfen, Erfundenes erkennen", "ca. 25 min"),
             4: ("Der Ernstfall", "Eine Geschichte mit vier Enden, der Abschlusstest, dein Badge", "ca. 20 min")}


def render_assets():
    jobs = []
    jobs.append((R.banner_html(0, "Alltagskompetenz", "Probleme selbst lösen · auf sich achten · mit Geld umgehen · Verträge verstehen",
                               ["Jahrgangsstufe 8–10", "8 Themenfelder"], w=1600, h=520, kicker="Selbstlernkurs"),
                 os.path.join(ASSETS, "kurs.png")))
    for n, (t, s) in TF_TITLES.items():
        chips = ["4 Lerneinheiten · ca. 100 min"] if n == 1 else ["3 Lerneinheiten", "exemplarisch"]
        jobs.append((R.banner_html(n, t, s, chips, w=1600, h=420), os.path.join(ASSETS, f"tf{n}.png")))
    jobs.append((R.serp_html("Nordvia X3 lädt nicht Ladesymbol blinkt"), os.path.join(ASSETS, "serp.png")))
    jobs.append((R.chat_html([
        ("user", "mein handy lädt nicht mehr was soll ich machen"),
        ("ai", "<p>Das kann mehrere Ursachen haben. Probiere diese Schritte:</p><ol>"
               "<li>Verwende ein anderes Ladekabel und Netzteil.</li>"
               "<li>Reinige die Ladebuchse vorsichtig.</li>"
               "<li>Öffne <b>Einstellungen → Akku → Ladeelektronik zurücksetzen</b> und bestätige mit OK.</li>"
               "<li>Halte <b>Leiser-Taste und Ein/Aus-Taste 10 Sekunden</b> gedrückt, um den Ladechip neu zu starten.</li>"
               "<li>Wenn nichts hilft: Werksreset über Einstellungen → System.</li></ol>"
               "<p>Danach sollte dein Handy wieder normal laden.</p>")]),
                 os.path.join(ASSETS, "chat_bad.png")))
    jobs.append((R.chat_html([
        ("user", '<div style="margin:4px 0"><span style="display:inline-block;background:#fff;color:#1D5FD1;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:4px;padding:1px 6px;margin-right:8px;vertical-align:middle">Rolle</span>Du bist ein Techniker in einem Handy-Reparaturladen.</div><div style="margin:4px 0"><span style="display:inline-block;background:#fff;color:#1D5FD1;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:4px;padding:1px 6px;margin-right:8px;vertical-align:middle">Kontext</span>Mein Nordvia X3 lädt seit gestern Abend nicht mehr, das Ladesymbol blinkt kurz und geht wieder aus. Davor kam ein Update. Anderes Kabel und andere Steckdose habe ich probiert.</div><div style="margin:4px 0"><span style="display:inline-block;background:#fff;color:#1D5FD1;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:4px;padding:1px 6px;margin-right:8px;vertical-align:middle">Ziel</span>Finde die Ursache. Günstige und ungefährliche Schritte zuerst.</div><div style="margin:4px 0"><span style="display:inline-block;background:#fff;color:#1D5FD1;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;border-radius:4px;padding:1px 6px;margin-right:8px;vertical-align:middle">Format</span>Nummerierte Liste, höchstens fünf Schritte. Sag mir bei jedem Schritt, woran ich erkenne, ob er geholfen hat. Frag nach, wenn dir Informationen fehlen.</div>'),
        ("ai", "<p>Zwei Rückfragen, bevor ich etwas vorschlage:</p><ol>"
               "<li>Blinkt das Ladesymbol auch, wenn das Handy <b>ausgeschaltet</b> am Kabel hängt?</li>"
               "<li>Steht in <b>Einstellungen → Akku</b> ein Hinweis wie „Akkuschutz“ oder „Ladelimit“?</li></ol>"
               "<p>Wenn das Update unterbrochen wurde, ist ein <b>Neustart im abgesicherten Modus</b> der erste ungefährliche Schritt. "
               "Daten gehen dabei nicht verloren. Einen Werksreset schlage ich nicht vor, solange wir die Ursache nicht kennen.</p>")],
        title="KI-Assistent"),
                 os.path.join(ASSETS, "chat_good.png")))
    jobs.append((R.clickbait_html(), os.path.join(ASSETS, "clickbait.png")))
    jobs.append((R.badge_html(), os.path.join(ASSETS, "badge.png")))
    jobs.append((R.banner_html(0, "Morgen ist das Referat", "Sonntag, 19:30 Uhr. Ein blauer Bildschirm.",
                               ["Du entscheidest"], w=1600, h=520, hue=R.HUES[1]),
                 os.path.join(ASSETS, "story.png")))
    R.render_all(jobs)


def asset_map():
    A = {}
    for f in os.listdir(ASSETS):
        if f.endswith(".png"):
            path = os.path.join(ASSETS, f)
            w, h = Image.open(path).size
            A[f] = (path, ImageRef(path, w, h))
    return A


def _ts(d):
    """'YYYY-MM-DD' -> unix timestamp at 06:00 local, or None."""
    if not d:
        return None
    import datetime, zoneinfo
    tz = zoneinfo.ZoneInfo("Europe/Berlin")
    return int(datetime.datetime.strptime(str(d), "%Y-%m-%d").replace(hour=6, tzinfo=tz).timestamp())


def load_steckbrief(path):
    import yaml
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_generic(args, A, sb, teile, avail):
    """content/course.py::build(A, sb, proto) -> {"sections": [...], "parts": {key: Section|SubSection},
    "badges": [...], "image_path": str|None}. Delta: parts with status pending (or --delta keys)."""
    from gen.mbz import Section as _Section
    k = COURSE.build(A, sb, proto=args.proto)
    for key, part in k.get("parts", {}).items():
        part.available_from = avail(key)
    meta = sb.get("kurs", {})
    name, short = meta.get("titel", "Kurs"), meta.get("kurzname", "Kurs")
    summary = meta.get("beschreibung", "")
    if args.delta:
        keys = [x for x, v in teile.items() if v.get("status") == "pending"] if args.delta == "pending" \
            else [x.strip() for x in args.delta.split(",")]
        sections = [_Section(None)]
        for key in keys:
            part = k["parts"][key]
            if isinstance(part, _Section):
                sections.append(part)
            else:
                sections.append(_Section(part.name, items=part.items, available_from=part.available_from))
        course = Course(name, short, summary=summary, sections=sections, badges=[], image_path=None)
        fname = f"{short.lower()}_delta_{'-'.join(keys)}_{time.strftime('%Y%m%d-%H%M')}.mbz"
    else:
        course = Course(name, short, summary=summary, sections=k["sections"], badges=k.get("badges", []),
                        image_path=k.get("image_path"))
        fname = f"{short.lower()}_kurs_{time.strftime('%Y%m%d-%H%M')}.mbz"
    out = args.out or os.path.join(OUT, fname)
    Writer(course, out).build()
    print(out, os.path.getsize(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--proto", action="store_true")
    ap.add_argument("--delta", nargs="?", const="pending",
                    help="nur Teile bauen: Komma-Liste von Teil-Schlüsseln oder (ohne Wert) alle mit status: pending")
    ap.add_argument("--content", default=CONTENT_DIR, help="Ordner mit content/, assets/, steckbrief.yaml")
    ap.add_argument("--steckbrief", default=os.path.join(CONTENT_DIR, "steckbrief.yaml"))
    ap.add_argument("--out")
    ap.add_argument("--no-render", action="store_true")
    args = ap.parse_args()
    if not args.no_render:
        render_assets()
    A = asset_map()
    sb = load_steckbrief(args.steckbrief) if os.path.exists(args.steckbrief) else {"teile": {}}
    teile = sb.get("teile", {})
    from content import cards
    cards.EMOJI = bool(sb.get("kurs", {}).get("design", {}).get("emoji_marker", False))
    avail = lambda key: _ts(teile.get(key, {}).get("sichtbar_ab"))

    if COURSE:
        return build_generic(args, A, sb, teile, avail)
    # ---- parts registry (key -> builder returning a Section or SubSection)
    le4_sub, test = tf1.le4(A, start_img=A["story.png"][1])
    les = {"le1": tf1.le1(A), "le2": tf1.le2(A), "le3": tf1.le3(A), "le4": le4_sub}
    for k, sub in les.items():
        sub.available_from = avail(k)
    others_secs = {f"tf{n}": s for n, s in zip(range(2, 9), others.other_sections(A, with_examples=not args.proto))}
    for k, s in others_secs.items():
        s.available_from = avail(k)
    start = others.start_section(A)
    badge = Badge("Problemlösen",
                  "Abschlusstest „Probleme selbst lösen“ bestanden: beschreiben, suchen, prüfen, KI nutzen.",
                  os.path.join(ASSETS, "badge.png"), [test])
    meta = sb.get("kurs", {})
    name = meta.get("titel", "Alltagskompetenz – Probleme selbst lösen (Selbstlernkurs 8–10)")
    short = meta.get("kurzname", "Alltagskompetenz")
    summary = meta.get("beschreibung", "<p>Selbstlernkurs für die Jahrgangsstufen 8–10 im fiktiven Fach Alltagskompetenz.</p>")

    if args.delta:
        # Delta-Sicherung: nur die gewählten Teile, jeder als Top-Level-Abschnitt; Abschnitt 0 leer;
        # kein Badge, kein Kursbild (gehören in die Erstlieferung). Import: "In diesen Kurs zusammenführen".
        keys = [k for k, v in teile.items() if v.get("status") == "pending"] if args.delta == "pending" \
            else [k.strip() for k in args.delta.split(",")]
        sections = [Section(None)]
        for k in keys:
            if k in les:
                sub = les[k]
                sections.append(Section(f"TF 1 · {sub.name}", items=sub.items, available_from=sub.available_from))
            elif k in others_secs:
                sections.append(others_secs[k])
            elif k == "tf1":
                sections.append(Section("TF 1 · Probleme selbst lösen – Google & KI", items=[others.tf1_header(A)]))
            else:
                raise SystemExit(f"unbekannter Teil: {k}")
        course = Course(name, short, summary=summary, sections=sections, badges=[], image_path=None)
        fname = f"alltagskompetenz_delta_{'-'.join(keys)}_{time.strftime('%Y%m%d-%H%M')}.mbz"
    else:
        tf1_items = [others.tf1_header(A)] + ([les["le1"], les["le4"]] if args.proto else list(les.values()))
        tf1_sec = Section("TF 1 · Probleme selbst lösen – Google & KI", items=tf1_items, available_from=avail("tf1"))
        if args.proto:
            sections = [start, tf1_sec] + list(others_secs.values())[:1]
            name, short = "Alltagskompetenz – Prototyp", "Alltagskompetenz-Proto"
            fname = f"alltagskompetenz_prototyp_{time.strftime('%Y%m%d-%H%M')}.mbz"
        else:
            sections = [start, tf1_sec] + list(others_secs.values())
            fname = f"alltagskompetenz_kurs_{time.strftime('%Y%m%d-%H%M')}.mbz"
        course = Course(name, short, summary=summary, sections=sections, badges=[badge],
                        image_path=os.path.join(ASSETS, "kurs.png"))
    out = args.out or os.path.join(OUT, fname)
    Writer(course, out).build()
    print(out, os.path.getsize(out))


if __name__ == "__main__":
    main()
