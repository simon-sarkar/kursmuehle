"""Test des Website-Modus (AP7) und des Textfeld-Modus (AP7b): netzwerk9 und alltagskompetenz mit --website bauen, die
Vorschau-HTML in Chromium öffnen, Navigation und Übungen durchklicken, Screenshots bei 390 px (Handy) und 1280 px (Desktop).

usage: python3 scripts/tests/test_website.py [--out DIR]   (Exit 0 = alles gut)

Prüft: keine Anfrage nach außen, alle Bilder gesetzt, Startseite → Kapitel → Weiter, Fortschritt, MC/RF/Einsetzen im
Quiz (falsch → Rückmeldung + „Lösung zeigen“, richtig → „Richtig.“ und Zähler), Zuordnen, Lernkarte umdrehen,
Lesebuch-Fragen (Markieren, Lückentext) und Geschichte bis zu einem Ende. Screenshots: <out>/website_<n>_<breite>.png
(Start und Quiz), nicht committen; die Bilder in docs/ werden von Hand übernommen.
Braucht Playwright + Chromium (CHROMIUM_PATH für ein vorhandenes Chromium).
Die Seite wechselt Kapitel über `hashchange`, also nach dem Klick asynchron: jede Prüfung nach einem Klick oder Sprung
wartet mit `warte()` auf den Zielzustand (höchstens fünf Sekunden), statt ihn sofort abzufragen.
Textfeld-Modus (`--website textfeld`, Vorschau `<kurs>_textfeld.html`, alle Blöcke untereinander wie auf der Kursseite):
Vor die Blöcke kommen fremde Elemente mit denselben Klassen; geprüft wird, dass das CSS der Blöcke sie nicht erreicht,
dass kein Skript globale Namen anlegt, dass jeder Block sein Skript ausführt, dass Antworten, Prüfen und Lernkarten in
einem Block keinen anderen verändern, dass ein zweiter Lauf desselben Skripts (Abschnitt nachgeladen) nichts doppelt,
dazu Quiz, Zuordnen, Lückentext und Geschichte. Screenshots: <out>/textfeld_<kurs>_<breite>.png.
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


def build(content, out, anzeige="ja"):
    r = subprocess.run([sys.executable, BUILD, "--content", os.path.join(ROOT, "examples", content), "--out", out,
                        "--website", anzeige], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"Build {content} --website {anzeige} fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    art = "_textfeld" if anzeige == "textfeld" else "_website"
    return sorted(os.path.join(os.path.dirname(out), f) for f in os.listdir(os.path.dirname(out))
                  if f.startswith(os.path.splitext(os.path.basename(out))[0] + art) and f.endswith(".html"))


_SICHTBAR = """([an, aus]) => {
    const vis = s => { const e = document.querySelector(s);
        return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    return an.every(vis) && !aus.some(vis); }"""


def warte(page, an=(), aus=(), js=None, ms=5000):
    """True, sobald alle Selektoren in an sichtbar und alle in aus unsichtbar sind (bzw. js wahr ist)."""
    try:
        if js:
            page.wait_for_function(js, timeout=ms)
        else:
            page.wait_for_function(_SICHTBAR, arg=[list(an), list(aus)], timeout=ms)
        return True
    except Exception:
        return False


def springe(page, path, kid):
    """Kapitel per Adresse öffnen und warten, bis es angezeigt wird."""
    page.goto(f"file://{path}#{kid}")
    warte(page, an=[f"#{kid}"])


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
    ok(warte(page, an=["#k1"], aus=["#start"]), f"[{breite}] Los geht’s öffnet Kapitel 1")
    page.click("#k1 .km-pager a:last-child")
    ok(warte(page, an=["#k2"], aus=["#k1"]), f"[{breite}] Weiter öffnet Kapitel 2")
    ok(warte(page, js="() => document.querySelector('.km-count').textContent.startsWith('2 /')"),
       f"[{breite}] Fortschritt zählt besuchte Kapitel")

    # Quiz mit den meisten Fragen (netzwerk9: Abschlussquiz mit MC und RF)
    quiz = page.evaluate("() => [...document.querySelectorAll('.km-quiz')].sort((a, b) => "
                         "b.querySelectorAll('.km-q').length - a.querySelectorAll('.km-q').length)[0].closest('.km-ch').id")
    springe(page, path, quiz)
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
    springe(page, path, zu)
    q = page.query_selector(f"#{zu} .km-q")
    loesen(page, q)
    q.query_selector(".km-check").click()
    ok(q.query_selector(".km-qfb").inner_text() == "Richtig.", f"[{breite}] Zuordnen richtig")

    lk = kapitel_mit(page, ".km-cards")
    springe(page, path, lk)
    karte = page.query_selector(f"#{lk} .km-card")
    karte.click()
    ok(karte.get_attribute("aria-pressed") == "true" and karte.query_selector(".km-back").is_visible(),
       f"[{breite}] Lernkarte dreht um")
    if breite < 900:
        page.click(".km-menu")
        ok(warte(page, an=["#km-nav"]), f"[{breite}] Menü öffnet die Kapitelliste")
        page.click("#km-nav a[data-k='start']")
        ok(warte(page, an=["#start"], aus=["#km-nav"]), f"[{breite}] Menü schließt nach Auswahl")


def alltagskompetenz(page, paths):
    page.goto("file://" + paths[0])
    for sel, name in ((".km-word", "Markieren"), ("input.km-gap", "Lückentext")):
        kid = kapitel_mit(page, sel)
        ok(kid is not None, f"Lesebuch/Quiz mit {name} vorhanden")
        if kid:
            springe(page, paths[0], kid)
            q = page.query_selector(f"#{kid} .km-q:has({sel})")
            loesen(page, q)
            q.query_selector(".km-check").click()
            ok(q.query_selector(".km-qfb").inner_text() == "Richtig.", f"{name} richtig gelöst")
    kid = kapitel_mit(page, ".km-story")
    ok(kid is not None, "Geschichte vorhanden")
    if kid:
        springe(page, paths[0], kid)
        page.click(f"#{kid} .km-story-alts .km-btn")
        for _ in range(30):
            if page.query_selector(f"#{kid} .km-story-view .km-kicker"):     # nur Enden tragen die Zeile „Ende“
                break
            page.click(f"#{kid} .km-story-alts .km-btn >> nth=0")
        kick = page.query_selector(f"#{kid} .km-story-view .km-kicker")
        ok(kick is not None and kick.inner_text().lower() == "ende", "Geschichte erreicht ein Ende")
        page.click(f"#{kid} .km-story-alts .km-btn")
        ok(page.query_selector(f"#{kid} .km-story-view .km-kicker") is None, "„Noch einmal von vorn“ startet neu")


_FREMD = ('<script>window.__vorher = Object.getOwnPropertyNames(window);</script>'
          '<div id="fremd"><p class="km-hint">Fremder Hinweis</p><p class="kontrolle">Kontrolle</p>'
          '<button class="km-btn">Fremd</button><button class="kontrolle">Kontrolle</button>'
          '<div class="km-q">Fremde Frage</div><label class="km-opt"><input type="radio" name="fremd">Fremd</label>'
          '<h3 class="km-bt">Fremd</h3><h3 class="kontrolle">Kontrolle</h3></div>')


def textfeld_seite(path):
    """Vorschau mit fremden Elementen vor den Blöcken (Kursseite des Themes nachgestellt)."""
    with open(path, encoding="utf-8") as f:
        html = f.read()
    ziel = path.replace(".html", "_fremd.html")
    with open(ziel, "w", encoding="utf-8") as f:
        f.write(html.replace("<main>", "<main>" + _FREMD, 1))
    return ziel


def bloecke_mit(page, selector):
    return page.evaluate(f"() => [...document.querySelectorAll('.kmb')].filter(b => b.querySelector('{selector}'))"
                         ".map(b => b.id)")


def textfeld(page, path, out, breite, n_erwartet, name):
    extern = []
    page.on("request", lambda r: extern.append(r.url) if not r.url.startswith(("file:", "data:")) else None)
    page.goto("file://" + textfeld_seite(path))
    w = f"[textfeld {name} {breite}]"
    ok(not extern, f"{w} keine Anfrage nach außen {extern[:3]}")
    ids = page.evaluate("() => [...document.querySelectorAll('.kmb')].map(b => b.id)")
    ok(len(ids) == n_erwartet and len(set(ids)) == len(ids), f"{w} {len(ids)} Blöcke mit eigener id ({n_erwartet} erwartet)")
    neu = page.evaluate("() => Object.getOwnPropertyNames(window).filter(n => !window.__vorher.includes(n) && n !== '__vorher')")
    ok(not neu, f"{w} keine globalen Namen ({neu[:5]})")
    ok(page.evaluate("() => [...document.querySelectorAll('.km-nojs')].every(p => p.hidden)"),
       f"{w} jedes Blockskript läuft (Hinweis ohne JavaScript ausgeblendet)")
    leer = page.evaluate("() => [...document.querySelectorAll('.kmb img')].filter(i => !i.src.startsWith('data:')).length")
    ok(leer == 0, f"{w} alle Bilder gesetzt ({leer} ohne Bild)")
    fremd = page.evaluate("""() => { const cs = s => getComputedStyle(document.querySelector('#fremd ' + s));
        return [cs('button.km-btn').backgroundColor === cs('button.kontrolle').backgroundColor,
                cs('p.km-hint').fontSize === cs('p.kontrolle').fontSize && cs('p.km-hint').color === cs('p.kontrolle').color,
                cs('.km-q').borderTopWidth === '0px', cs('label.km-opt').display !== 'flex',
                cs('h3.km-bt').fontSize === cs('h3.kontrolle').fontSize]; }""")
    ok(all(fremd), f"{w} CSS der Blöcke erreicht fremde Elemente nicht {fremd}")

    # Zwei Blöcke mit Auswahlfeldern: Antwort in einem Block lässt den anderen unberührt
    mcs = bloecke_mit(page, "input[type=radio]")
    if len(mcs) >= 2:
        a, b = (page.query_selector(f"#{x} .km-opt input[type=radio]") for x in mcs[:2])
        a.check()
        b.check()
        ok(a.is_checked() and b.is_checked(), f"{w} Auswahl in Block 2 lässt Block 1 stehen")
        page.query_selector(f"#{mcs[0]} .km-check").click()
        ok(not page.query_selector(f"#{mcs[1]} .km-qfb").is_visible(), f"{w} Prüfen in Block 1 lässt Block 2 unberührt")

    # Größtes Quiz: falsch, dann alles richtig, Zähler
    quiz = page.evaluate("() => [...document.querySelectorAll('.kmb .km-quiz')].sort((a, b) => "
                         "b.querySelectorAll('.km-q').length - a.querySelectorAll('.km-q').length)[0].closest('.kmb').id")
    qs = page.query_selector_all(f"#{quiz} .km-q")
    mc = next(q for q in qs if q.query_selector(".km-opt input[type=radio]"))
    mc.query_selector(".km-opt[data-ok='0'] input").check()
    mc.query_selector(".km-check").click()
    ok("Noch nicht ganz" in mc.query_selector(".km-qfb").inner_text() and mc.query_selector(".km-solve").is_visible(),
       f"{w} falsche Antwort: Rückmeldung und „Lösung zeigen“")
    for q in qs:
        loesen(page, q)
        q.query_selector(".km-check").click()
    richtig = sum(1 for q in qs if q.query_selector(".km-qfb").inner_text() == "Richtig.")
    ok(richtig == len(qs), f"{w} Quiz im Textfeld gelöst ({richtig}/{len(qs)})")
    ok(page.inner_text(f"#{quiz} .km-score").startswith(f"{len(qs)} von {len(qs)}"), f"{w} Zähler im Quiz")

    zu = bloecke_mit(page, ".km-pairs")
    if zu:
        q = page.query_selector(f"#{zu[0]} .km-q")
        loesen(page, q)
        q.query_selector(".km-check").click()
        ok(q.query_selector(".km-qfb").inner_text() == "Richtig.", f"{w} Zuordnen richtig")

    lk = bloecke_mit(page, ".km-card")
    if lk:
        flipped = "() => document.querySelectorAll('.km-card.is-flipped').length"
        karte = page.query_selector(f"#{lk[0]} .km-card")
        karte.click()
        ok(page.evaluate(flipped) == 1 and karte.query_selector(".km-back").is_visible(),
           f"{w} Lernkarte dreht um, nur diese")
        # Zweiter Lauf des Skripts (Abschnitt nachgeladen): Schutz greift, ein Klick dreht genau einmal
        page.evaluate(f"() => (0, eval)(document.querySelector('#{lk[0]} script:not([type])').textContent)")
        karte.click()
        ok(page.evaluate(flipped) == 0, f"{w} zweiter Skriptlauf doppelt keine Klicks")
    page.screenshot(path=os.path.join(out, f"textfeld_{name}_{breite}.png"), full_page=True)
    return len(mcs)


def textfeld_ak(page, path):
    page.goto("file://" + path)
    for sel, name in (("input.km-gap", "Lückentext"),):
        b = bloecke_mit(page, sel)
        ok(bool(b), f"[textfeld] Block mit {name} vorhanden")
        if b:
            q = page.query_selector(f"#{b[0]} .km-q:has({sel})")
            loesen(page, q)
            q.query_selector(".km-check").click()
            ok(q.query_selector(".km-qfb").inner_text() == "Richtig.", f"[textfeld] {name} richtig gelöst")
    b = bloecke_mit(page, ".km-story")
    ok(bool(b), "[textfeld] Block mit Geschichte vorhanden")
    if b:
        kid = b[0]
        ok(page.evaluate(f"() => !!document.querySelector('#{kid} .km-story-view img')?.src.startsWith('data:')"),
           "[textfeld] Startbild der Geschichte gesetzt")
        page.click(f"#{kid} .km-story-alts .km-btn")
        for _ in range(30):
            if page.query_selector(f"#{kid} .km-story-view .km-kicker"):
                break
            page.click(f"#{kid} .km-story-alts .km-btn >> nth=0")
        kick = page.query_selector(f"#{kid} .km-story-view .km-kicker")
        ok(kick is not None and kick.inner_text().lower() == "ende", "[textfeld] Geschichte erreicht ein Ende")


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
        n9t = build("netzwerk9", os.path.join(d, "n9t", "n9.mbz"), "textfeld")
        akt = build("alltagskompetenz", os.path.join(d, "akt", "ak.mbz"), "textfeld")
        ok(len(n9t) == 1 and len(akt) == 1, "Textfeld-Modus: je eine Vorschau")
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
            for breite, hoehe in ((390, 844), (1280, 860)):
                page = browser.new_page(viewport={"width": breite, "height": hoehe})
                netzwerk9(page, n9[0], out, breite)
                page.close()
            page = browser.new_page(viewport={"width": 1280, "height": 860})
            alltagskompetenz(page, ak)
            page.close()
            for breite, hoehe in ((390, 844), (1280, 860)):
                page = browser.new_page(viewport={"width": breite, "height": hoehe})
                textfeld(page, n9t[0], out, breite, 3, "netzwerk9")
                page.close()
            page = browser.new_page(viewport={"width": 1280, "height": 860})
            mc = textfeld(page, akt[0], out, 1280, 8, "alltagskompetenz")
            ok(mc >= 2, f"[textfeld] alltagskompetenz: mindestens zwei Blöcke mit Auswahl ({mc})")
            page.close()
            page = browser.new_page(viewport={"width": 1280, "height": 860})
            textfeld_ak(page, akt[0])
            browser.close()
        if args.out:
            print(f"Screenshots in {out}")
    print("alles gut" if not fehler else f"{len(fehler)} Problem(e)")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
