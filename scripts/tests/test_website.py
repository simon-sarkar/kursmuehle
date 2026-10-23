"""Test des Website-Modus (AP7): netzwerk9 und alltagskompetenz mit --website bauen, die Vorschau-HTML in Chromium
öffnen, Navigation und Übungen durchklicken, Screenshots bei 390 px (Handy) und 1280 px (Desktop).

usage: python3 scripts/tests/test_website.py [--out DIR]   (Exit 0 = alles gut)

Prüft: keine Anfrage nach außen, alle Bilder gesetzt, Startseite → Kapitel → Weiter, Fortschritt, MC/RF/Einsetzen im
Quiz (falsch → Rückmeldung + „Lösung zeigen“, richtig → „Richtig.“ und Zähler), Zuordnen, Lernkarte umdrehen,
Lesebuch-Fragen (Markieren, Lückentext) und Geschichte bis zu einem Ende. Screenshots: <out>/website_<n>_<breite>.png
(Start und Quiz), nicht committen; die Bilder in docs/ werden von Hand übernommen.
Braucht Playwright + Chromium (CHROMIUM_PATH für ein vorhandenes Chromium).
"""
import argparse
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BUILD = os.path.join(ROOT, "scripts", "build.py")

fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


def build(content, out):
    r = subprocess.run([sys.executable, BUILD, "--content", os.path.join(ROOT, "examples", content), "--out", out,
                        "--website"], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"Build {content} --website fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    return sorted(os.path.join(os.path.dirname(out), f) for f in os.listdir(os.path.dirname(out))
                  if f.startswith(os.path.splitext(os.path.basename(out))[0] + "_website") and f.endswith(".html"))


def kapitel_mit(page, selector):
    """id des ersten Kapitels, das selector enthält."""
    return page.evaluate(f"""() => {{ const q = document.querySelector('.km-ch {selector}');
        return q ? q.closest('.km-ch').id : null; }}""")


def loesen(page, q):
    """Alle Felder einer Frage richtig ausfüllen."""
    page.evaluate("""(q) => {
        q.querySelectorAll('.km-opt').forEach(o => { o.querySelector('input').checked = o.dataset.ok === '1'; });
        q.querySelectorAll('select.km-gap').forEach(s => { s.value = s.dataset.ok; });
        q.querySelectorAll('input.km-gap').forEach(s => { s.value = s.dataset.ok.split('|')[0].replace(/\\*/g, ''); });
        q.querySelectorAll('.km-word').forEach(w => w.classList.toggle('is-sel', w.dataset.ok === '1'));
    }""", q)


def netzwerk9(page, path, out, breite):
    extern = []
    page.on("request", lambda r: extern.append(r.url) if not r.url.startswith(("file:", "data:")) else None)
    page.goto("file://" + path)
    ok(not extern, f"[{breite}] keine Anfrage nach außen {extern[:3]}")
    leer = page.evaluate("() => [...document.querySelectorAll('img[data-km-img]')].filter(i => !i.src.startsWith('data:')).length")
    ok(leer == 0, f"[{breite}] alle Bilder gesetzt ({leer} ohne Bild)")
    page.screenshot(path=os.path.join(out, f"website_start_{breite}.png"), full_page=True)
    page.click("text=Los geht’s")
    ok(page.is_visible("#k1") and not page.is_visible("#start"), f"[{breite}] Los geht’s öffnet Kapitel 1")
    page.click("#k1 .km-pager a:last-child")
    ok(page.is_visible("#k2"), f"[{breite}] Weiter öffnet Kapitel 2")
    ok(page.inner_text(".km-count").startswith("2 /"), f"[{breite}] Fortschritt zählt besuchte Kapitel")

    # Quiz mit den meisten Fragen (netzwerk9: Abschlussquiz mit MC und RF)
    quiz = page.evaluate("() => [...document.querySelectorAll('.km-quiz')].sort((a, b) => "
                         "b.querySelectorAll('.km-q').length - a.querySelectorAll('.km-q').length)[0].closest('.km-ch').id")
    page.goto(f"file://{path}#{quiz}")
    qs = page.query_selector_all(f"#{quiz} .km-q")
    ok(len(qs) >= 6, f"[{breite}] Quiz mit {len(qs)} Fragen")
    # falsche Antwort bei der ersten MC-Frage
    mc = next(q for q in qs if q.query_selector(".km-opt input[type=radio]"))
    mc.query_selector(".km-opt[data-ok='0'] input").check()
    mc.query_selector(".km-check").click()
    ok("Noch nicht ganz" in mc.query_selector(".km-qfb").inner_text() and mc.query_selector(".km-solve").is_visible(),
       f"[{breite}] falsche Antwort: Rückmeldung und „Lösung zeigen“")
    for q in qs:
        loesen(page, q)
        q.query_selector(".km-check").click()
    richtig = sum(1 for q in qs if q.query_selector(".km-qfb").inner_text() == "Richtig.")
    ok(richtig == len(qs), f"[{breite}] alle Fragen richtig gelöst ({richtig}/{len(qs)})")
    ok(not any(q.query_selector(".km-solve").is_visible() for q in qs), f"[{breite}] „Lösung zeigen“ verschwindet bei richtig")
    ok(page.inner_text(f"#{quiz} .km-score").startswith(f"{len(qs)} von {len(qs)}"), f"[{breite}] Zähler im Quiz")
    page.screenshot(path=os.path.join(out, f"website_quiz_{breite}.png"), full_page=False)

    zu = kapitel_mit(page, ".km-pairs")
    page.goto(f"file://{path}#{zu}")
    q = page.query_selector(f"#{zu} .km-q")
    loesen(page, q)
    q.query_selector(".km-check").click()
    ok(q.query_selector(".km-qfb").inner_text() == "Richtig.", f"[{breite}] Zuordnen richtig")

    lk = kapitel_mit(page, ".km-cards")
    page.goto(f"file://{path}#{lk}")
    karte = page.query_selector(f"#{lk} .km-card")
    karte.click()
    ok(karte.get_attribute("aria-pressed") == "true" and karte.query_selector(".km-back").is_visible(),
       f"[{breite}] Lernkarte dreht um")
    if breite < 900:
        page.click(".km-menu")
        ok(page.is_visible("#km-nav"), f"[{breite}] Menü öffnet die Kapitelliste")
        page.click("#km-nav a[data-k='start']")
        ok(page.is_visible("#start") and not page.is_visible("#km-nav"), f"[{breite}] Menü schließt nach Auswahl")


def alltagskompetenz(page, paths):
    page.goto("file://" + paths[0])
    for sel, name in ((".km-word", "Markieren"), ("input.km-gap", "Lückentext")):
        kid = kapitel_mit(page, sel)
        ok(kid is not None, f"Lesebuch/Quiz mit {name} vorhanden")
        if kid:
            page.goto(f"file://{paths[0]}#{kid}")
            q = page.query_selector(f"#{kid} .km-q:has({sel})")
            loesen(page, q)
            q.query_selector(".km-check").click()
            ok(q.query_selector(".km-qfb").inner_text() == "Richtig.", f"{name} richtig gelöst")
    kid = kapitel_mit(page, ".km-story")
    ok(kid is not None, "Geschichte vorhanden")
    if kid:
        page.goto(f"file://{paths[0]}#{kid}")
        page.click(f"#{kid} .km-story-alts .km-btn")
        for _ in range(30):
            if page.query_selector(f"#{kid} .km-story-view .km-kicker"):     # nur Enden tragen die Zeile „Ende“
                break
            page.click(f"#{kid} .km-story-alts .km-btn >> nth=0")
        kick = page.query_selector(f"#{kid} .km-story-view .km-kicker")
        ok(kick is not None and kick.inner_text().lower() == "ende", "Geschichte erreicht ein Ende")
        page.click(f"#{kid} .km-story-alts .km-btn")
        ok(page.query_selector(f"#{kid} .km-story-view .km-kicker") is None, "„Noch einmal von vorn“ startet neu")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="Ordner für Screenshots (Standard: Temp, wird gelöscht)")
    args = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("übersprungen: Playwright fehlt (pip install playwright)")
        return
    with tempfile.TemporaryDirectory() as d:
        out = os.path.abspath(args.out) if args.out else d
        os.makedirs(out, exist_ok=True)
        n9 = build("netzwerk9", os.path.join(d, "n9", "n9.mbz"))
        ok(len(n9) == 1, f"netzwerk9: eine Website ({len(n9)})")
        ak = build("alltagskompetenz", os.path.join(d, "ak", "ak.mbz"))
        ok(len(ak) == 8, f"alltagskompetenz: acht Websites, eine je Themenfeld ({len(ak)})")
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
            for breite, hoehe in ((390, 844), (1280, 860)):
                page = browser.new_page(viewport={"width": breite, "height": hoehe})
                netzwerk9(page, n9[0], out, breite)
                page.close()
            page = browser.new_page(viewport={"width": 1280, "height": 860})
            alltagskompetenz(page, ak)
            browser.close()
        if args.out:
            print(f"Screenshots in {out}")
    print("alles gut" if not fehler else f"{len(fehler)} Problem(e)")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
