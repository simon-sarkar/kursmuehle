"""Render-Test der Designvorlagen: Kursseiten-HTML eines Kursordners je Vorlage bei 390 px (Handy) und 1200 px
(Desktop) als PNG rendern. Dazu eine Bausteinseite mit allen Textbausteinen aus `references/kursdatei.md` §4.

usage: python3 scripts/tests/render_vorlagen.py [--content examples/netzwerk9] [--vorlagen schlicht,kacheln,magazin]
                                                [--breiten 390,1200] [--out <content>/out]

Ergebnis: <out>/render_<vorlage>_<breite>.png (Kurs) und <out>/bausteine_<vorlage>_<breite>.png. Nicht committen.
Braucht Playwright + Chromium (CHROMIUM_PATH für ein vorhandenes Chromium). Das Theme der Plattform wird nur
nachgebildet (Systemschrift, 15 px, Rahmen um jede <td>), nicht geladen.
"""
import argparse
import html as H
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from build import asset_map, load_steckbrief  # noqa: E402
from gen import html as T  # noqa: E402
from gen.kursdatei import parse  # noqa: E402
from gen.mbz import Feedback, HvpItem, Label, Page, SubSection, Url  # noqa: E402

# Beispielseite mit allen Textbausteinen (Bilder aus dem Kursordner)
BAUSTEINE = """# Bausteine
farbe: {farbe}
## Allgemeines
### Banner: Alle Textbausteine
bild: {banner}
untertitel: Eine Seite, die jeden Baustein einmal zeigt.
## Bausteine
### Überblick: Bausteine
untertitel: Kopfkarte ohne Titel, weil das Banner ihn trägt
dauer: ca. 10 min
- Lesen: Erklärung und Fall
- Üben: Anleitung
- Sichern: Merksatz
### Seite: Erklärung
Vorspann: Ein Vorspann in größerer Schrift leitet den Lesetext ein, ein bis zwei Sätze.
Überschrift: Zwischenüberschrift
Ein kurzer Absatz, höchstens fünf Zeilen auf dem Handy. **Fett** und *kursiv* gehen inline, ==markiert== auch.
Hervorhebung: Ein hervorgehobener Satz trägt die Kernaussage des Abschnitts.
- Erster Punkt einer Liste
- Zweiter Punkt
  - Unterpunkt

1. Erster Schritt einer nummerierten Liste
2. Zweiter Schritt
| Begriff | Erklärung |
| Router | Verbindet das Heimnetz mit dem Internet. |
| Switch | Macht aus einem Anschluss viele. |
Überschrift: Vergleichstabelle
| Merkmal | Router | Switch | Access Point |
|---|---|---|---|
| Aufgabe | Netz mit Internet verbinden | Anschlüsse vervielfachen | WLAN erzeugen |
| Kabel nötig | ja | ja | ja, zum Router |
| WLAN | meist eingebaut | nein | ja |
Kasten: Kasten in Akzentfarbe
  Eingerückter Inhalt, auch mit Liste:
  - Punkt
Beispiel: Fall aus dem Alltag
  Familie Huber zieht ein. Im Flur sitzt die Telefonbuchse, das Kinderzimmer ist zu weit weg fürs WLAN.
Hinweis: Hinweis
  Ein Access Point braucht immer ein Kabel zum Router.
Schritte: Ladebuchse reinigen
1. Gerät ausschalten.
2. Mit einem Holzzahnstocher Staub aus der Buchse holen, nicht mit Metall.
3. Kabel wieder anstecken und laden.
Vergleich:
- Gute Suchanfrage (grün):
  - Fehlermeldung wörtlich
  - Gerätename
- Schlechte Suchanfrage (rot):
  - „Handy kaputt“
  - Ohne Modell
Bild: {bild} | Router | Abbildung 1: Ein Router mit vier Anschlüssen.
Bildzeile: {bild} | Router | **Router**<br>Verbindet das lokale Netzwerk mit dem Internet.
Merke: Telefonbuchse → Router → Netzwerkkabel → Switch → Access Point → Endgeräte.
"""

FRAME = """<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>
<style>
body{{margin:0;background:#fff;color:#1d2125;font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:15px;line-height:1.5}}
.page{{max-width:{maxw}px;margin:0 auto;padding:16px}}
h2.sec{{font-size:1.35rem;font-weight:700;margin:28px 0 12px 0;padding-bottom:6px;border-bottom:1px solid #dee2e6}}
h2.sec.first{{margin-top:0}}
.act{{margin:14px 0}}
.act .nm{{color:#0f6cbf;font-weight:500;margin:0 0 4px 0}}
.ph{{border:1px dashed #adb5bd;border-radius:6px;padding:10px 14px;color:#6c757d;background:#f8f9fa}}
td{{border:1px solid #dee2e6}}  /* Theme: Rahmen um jede Zelle (spec §K) */
img{{max-width:100%}}
.sub{{margin:18px 0 0 0;padding:10px 12px;background:#f8f9fa;border-left:3px solid #dee2e6}}
</style></head><body><div class="page"><div style="color:#6c757d;font-size:.85em;margin-bottom:10px">{title}</div>{body}</div></body></html>"""


def _inline(html, assets):
    """@@PLUGINFILE@@/x.png -> data-URI (set_content lädt keine file://-Bilder)."""
    import base64
    import re

    def rep(m):
        path = os.path.join(assets, m.group(1))
        if not os.path.exists(path):
            return m.group(0)
        return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()
    return re.sub(r"@@PLUGINFILE@@/([^\"']+)", rep, html)


def _html(item, assets):
    if isinstance(item, Label):
        return _inline(item.intro, assets)
    if isinstance(item, Page):
        return (f'<div class="act"><div class="nm">Seite: {H.escape(item.name)}</div>'
                + _inline(item.content, assets) + '</div>')
    if isinstance(item, HvpItem):
        return f'<div class="act"><div class="nm">{H.escape(item.name)}</div><div class="ph">Interaktiver Inhalt (H5P), nicht Teil des Render-Tests</div></div>'
    if isinstance(item, Url):
        return f'<div class="act"><div class="nm">{H.escape(item.name)}</div><div class="ph">Link, eingebettet</div></div>'
    if isinstance(item, Feedback):
        return f'<div class="act"><div class="nm">{H.escape(item.name)}</div><div class="ph">Umfrage</div></div>'
    if isinstance(item, SubSection):
        inner = "".join(_html(it, assets) for it in item.items)
        return f'<div class="sub"><div style="font-weight:700;margin-bottom:8px">{H.escape(item.name)}</div>{inner}</div>'
    return ""


def course_html(content_dir, title):
    assets = os.path.join(content_dir, "assets")
    sb_path = os.path.join(content_dir, "steckbrief.yaml")
    sb = load_steckbrief(sb_path) if os.path.exists(sb_path) else {}
    k = parse(os.path.join(content_dir, "kurs.md"), asset_map(os.path.join(content_dir, "assets")), sb)
    parts = []
    for i, sec in enumerate(k["sections"]):
        name = sec.name or "Allgemeines"
        parts.append(f'<h2 class="sec{" first" if i == 0 else ""}">{H.escape(name)}</h2>')
        parts += [_html(it, assets) for it in sec.items]
    return "".join(parts)


def render(jobs, out_dir):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for name, width, html in jobs:
            page = browser.new_page(viewport={"width": width, "height": 800}, device_scale_factor=1)
            page.set_content(html)
            page.wait_for_timeout(100)
            out = os.path.join(out_dir, f"{name}_{width}.png")
            page.screenshot(path=out, full_page=True)
            page.close()
            print(out)
        browser.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", default=os.path.join(ROOT, "examples", "netzwerk9"))
    ap.add_argument("--vorlagen", default=",".join(T.VORLAGEN))
    ap.add_argument("--breiten", default="390,1200")
    ap.add_argument("--out")
    args = ap.parse_args()
    content = os.path.abspath(args.content)
    out_dir = args.out or os.path.join(content, "out")
    os.makedirs(out_dir, exist_ok=True)
    widths = [int(w) for w in args.breiten.split(",")]
    pngs = sorted(f for f in os.listdir(os.path.join(content, "assets")) if f.endswith(".png"))
    if not pngs:
        raise SystemExit("FEHLER: kein PNG in assets/")
    banner = "banner.png" if "banner.png" in pngs else pngs[0]
    bild = next((f for f in pngs if f != banner), banner)
    sb = load_steckbrief(os.path.join(content, "steckbrief.yaml")) if os.path.exists(os.path.join(content, "steckbrief.yaml")) else {}
    farbe = (sb.get("kurs") or {}).get("farbe") or "#1D5FD1"

    jobs = []
    with tempfile.TemporaryDirectory() as tmp:
        demo = os.path.join(tmp, "bausteine")
        os.makedirs(demo)
        shutil.copytree(os.path.join(content, "assets"), os.path.join(demo, "assets"))
        with open(os.path.join(demo, "kurs.md"), "w", encoding="utf-8") as f:
            f.write(BAUSTEINE.format(farbe=farbe, banner=banner, bild=bild))
        for v in args.vorlagen.split(","):
            T.set_vorlage(v.strip())
            T.EMOJI = False
            for w in widths:
                maxw = 1140 if w > 600 else w
                jobs.append((f"render_{T.VORLAGE}", w, FRAME.format(title=f"Vorlage {T.VORLAGE} · {w} px", maxw=maxw,
                                                                    body=course_html(content, T.VORLAGE))))
                jobs.append((f"bausteine_{T.VORLAGE}", w, FRAME.format(title=f"Bausteine · {T.VORLAGE} · {w} px", maxw=maxw,
                                                                       body=course_html(demo, T.VORLAGE))))
        render(jobs, out_dir)


if __name__ == "__main__":
    main()
