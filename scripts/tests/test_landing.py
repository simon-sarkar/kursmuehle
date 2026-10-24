"""Test der Landingpage (AP13b, AP13.2): den öffentlichen Stand mit scripts/veroeffentlichen.py in ein Temp-Verzeichnis
schreiben (Trockenlauf der Beta-Veröffentlichung, vorher web_bundle.py), dessen docs/ als Wurzel ausliefern (wie
kursmuehle.de) und im Browser prüfen.

usage: python3 scripts/tests/test_landing.py [--browser chromium|webkit|firefox] [--shots DIR]
  --shots DIR  Screenshots als DIR/ap13.2-landing-{hell,dunkel}-{1280,2560,390}.png (ganze Seite),
               DIR/ap13.2-impressum-{hell,dunkel}-390.png, DIR/ap13.2-hover-1280.png (Standbild der Drehung) und
               DIR/ap13.2-weiter-1280.png (mit gesicherter Einheit)

Prüft: Veröffentlichung enthält Landingpage, Impressum, Mühle unter start/, docs/2/ als Weiterleitung, CNAME; das
Release-Zip daraus enthält docs/start/ nicht. Die Landingpage lädt nichts von außen und keine Datei der Mühle (kein
Pyodide), legt keine IndexedDB an, die Kachel führt zu /start/, der Impressum-Link zu /impressum.html. Schritt 1 auf der
Startseite: „Weiter“ baut start/#thema=…&jahrgang=…&minuten=… (Fragment, bleibt im Browser; URL-kodiert, Umlaute, Leerzeichen, &), leeres Thema führt
zu start/, ohne Skript schickt das Formular dieselben Felder. Kopfzeile klebt oben (Landingpage und Impressum, höchstens
56 px), ihre kleine Kachel erscheint auf der Landingpage erst nach dem Scrollen (ohne Skript immer). Hell und dunkel
(emulierte Systemeinstellung): kein horizontales Scrollen bei 390, 1280 und 2560 px, Kontrast Schrift gegen Band. Hover
und Tastaturfokus drehen das Rad (getAnimations), prefers-reduced-motion nicht. Logo: SVG-Dateien und eingebettete
Fassung entsprechen docs/make_logo.py, ruhend bildgleich mit der Fassung ohne Flügelkontur, gedreht weicht sie nur am
Turm ab. „Weiter mit deiner Einheit“ erscheint erst mit einer gesicherten Einheit (Speicher wie in web/app.js) und führt
zu /start/?weiter=1; /2/ leitet auf /start/ weiter und behält ?weiter=1; der Impressum-Link der Mühle führt auf dieselbe
Seite. Exit 0 = alles gut.
Braucht Playwright (CHROMIUM_PATH für ein vorhandenes Chromium) und Pillow.
"""
import argparse
import functools
import io
import http.server
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DOCS = os.path.join(ROOT, "docs")
BREITEN = (1280, 2560, 390)
MODI = (("hell", "light"), ("dunkel", "dark"))
fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


class Stiller(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map,
                          **{".wasm": "application/wasm", ".whl": "application/octet-stream", ".mjs": "text/javascript"})

    def log_message(self, *a):
        pass


def lauf(*cmd):
    r = subprocess.run([sys.executable, *cmd], capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        raise SystemExit(f"{' '.join(cmd)} fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    return r.stdout


def veroeffentlichen(tmp):
    """Trockenlauf: öffentlicher Stand nach tmp/pub, Release-Zip daraus nach tmp/kursmuehle.zip."""
    lauf("scripts/web_bundle.py")
    pub = os.path.join(tmp, "pub")
    lauf("scripts/veroeffentlichen.py", "--ziel", pub)
    d = os.path.join(pub, "docs")
    for p in ("index.html", "impressum.html", "CNAME", "landing-muehle.png", "logo.svg", "wasserzeichen.svg",
              "start/index.html", "start/app.js", "start/generator.zip", "start/katalog.json",
              "start/vendor/pyodide/pyodide.js", "2/index.html"):
        ok(os.path.exists(os.path.join(d, p)), f"veröffentlicht: docs/{p}")
    ok(not os.path.exists(os.path.join(d, "entwicklung", "entwuerfe")), "Entwürfe nicht veröffentlicht")
    ok(not os.path.exists(os.path.join(pub, "web")), "web/ nicht als eigener Ordner veröffentlicht")
    with open(os.path.join(d, "2", "index.html"), encoding="utf-8") as f:
        ok("url=../start/" in f.read(), "docs/2/ leitet auf ../start/ weiter")
    stufe = lauf("scripts/veroeffentlichen.py", "--stufe").strip()
    ok(stufe in ("beta", "release"), f"Stufe der Version im CHANGELOG wird veröffentlicht: {stufe}")
    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    import veroeffentlichen as V
    ok([V.stufe(v) for v in ("1.0.3", "2.0.0-b1", "2.0.0-b12", "2.0.0-a4", "2.1.0-rc1")]
       == ["release", "beta", "beta", "alpha", "alpha"], "Stufen: release, beta, alpha")
    zp = os.path.join(tmp, "kursmuehle.zip")
    subprocess.run([sys.executable, os.path.join(pub, "scripts", "package.py"), "--out", zp], check=True,
                   capture_output=True)
    with zipfile.ZipFile(zp) as z:
        namen = z.namelist()
    ok(not any("/docs/start/" in n or "/docs/2/" in n for n in namen), "Release-Zip ohne docs/start/ und docs/2/")
    return d


class Server(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], (ConnectionError, BrokenPipeError)):   # Seitenwechsel während Pyodide lädt
            super().handle_error(request, client_address)


def server(wurzel):
    h = functools.partial(Stiller, directory=wurzel)
    srv = Server(("127.0.0.1", 0), h)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/"


def kein_querscrollen(page):
    return page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")


AUTOSAVE = """async (titel) => {           // wie km.autosaveSchreiben in web/app.js: DB kursmuehle (Version 2 seit AP13.1), Speicher mappe
    const d = await new Promise((res, rej) => { const r = indexedDB.open('kursmuehle', 2);
        r.onupgradeneeded = () => ['mappe', 'einstellungen'].forEach(n => r.result.objectStoreNames.contains(n) || r.result.createObjectStore(n));
        r.onsuccess = () => res(r.result); r.onerror = rej; });
    await new Promise((res, rej) => { const tx = d.transaction('mappe', 'readwrite');
        tx.objectStore('mappe').put({ zip: new Uint8Array([80, 75, 5, 6]).buffer, dateiname: 'test.zip', titel: titel,
                                      zeit: Date.now() }, 'aktuell');
        tx.oncomplete = res; tx.onerror = rej; });
    d.close(); }"""


KONTRAST = """(sel) => {                      // Kontrast Schrift gegen Hintergrund des Bands (WCAG)
    const lum = (c) => { const v = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map(x => x / 255)
        .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const [t, band] = sel.split('|'); const a = lum(getComputedStyle(document.querySelector(t)).color);
    const b = lum(getComputedStyle(document.querySelector(band)).backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }"""
ANIM = "(sel) => document.querySelector(sel + ' .rad').getAnimations().length"
# Farbschema wählt der Leser in der Kopfzeile (localStorage), nicht die Systemeinstellung; hell ist Standard
SCHEMA = "(s) => { try { localStorage.setItem('kursmuehle-schema', s === 'dark' ? 'dunkel' : 'hell'); } catch (e) {} }"


def raster(page, svg, px=256):
    """SVG-Text in Chromium/WebKit/Firefox rastern (weißer Grund), als RGB-Bild."""
    from PIL import Image
    svg = svg.replace("<svg ", f'<svg width="{px}" height="{px}" ', 1)
    page.set_content(f'<html><body style="margin:0;background:#fff">{svg}</body></html>')
    return Image.open(io.BytesIO(page.screenshot(clip={"x": 0, "y": 0, "width": px, "height": px}))).convert("RGB")


def abweichung(a, b, schwelle=24):
    """Rahmen der Pixel, die um mehr als `schwelle` (0–255) abweichen, oder None."""
    from PIL import ImageChops
    return ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > schwelle else 0).getbbox()


def logo_pruefen(browser):
    """make_logo.py: Dateien aktuell, ruhend bildgleich ohne Flügelkontur, gedreht trennt die Kontur Flügel und Turm."""
    sys.path.insert(0, DOCS)
    import make_logo as L
    lies = lambda n: open(os.path.join(DOCS, n), encoding="utf-8").read()
    for name, svg in (("logo.svg", L.icon(L.BG, L.FG, L.AC)), ("logo-light.svg", L.icon(L.FG, L.BG, L.AC, gap=4))):
        ok(lies(name).strip() == svg.strip(), f"{name} entspricht make_logo.py")
    for name in ("index.html", "impressum.html"):
        t = lies(name)
        n = t.count("<!-- logo -->")
        ok(n >= 1 and t.count("<!-- logo -->" + L.icon_inline() + "<!-- /logo -->") == n,
           f"{name}: eingebettetes Logo entspricht make_logo.py ({n}×)")
    page = browser.new_page(viewport={"width": 300, "height": 300})
    for name, mit, ohne in (("logo.svg", L.icon(L.BG, L.FG, L.AC), L.icon(L.BG, L.FG, L.AC, kontur=False)),
                            ("logo-light.svg", L.icon(L.FG, L.BG, L.AC, gap=4), L.icon(L.FG, L.BG, L.AC, gap=4, kontur=False))):
        box = abweichung(raster(page, mit), raster(page, ohne), schwelle=2)
        ok(box is None, f"{name}: ruhend bildgleich mit der Fassung ohne Flügelkontur ({box})")
        dreh = lambda svg: svg.replace('id="rad"', 'id="rad" transform="rotate(-50 128 98)"')
        box = abweichung(raster(page, dreh(mit)), raster(page, dreh(ohne)))
        ok(box is not None and box[1] >= 140, f"{name}: gedreht weicht die Kontur nur am Turm ab ({box})")
    # eingebettete Fassung (hell) gleich logo.svg
    css = lies("index.html").split("/* Logo inline", 1)[1].split("@keyframes", 1)[0]
    farben = "--logo-grund: #2a2a2a; --logo-muehle: #f3e9d8; --logo-rand: 5px; --ocker: #d9a441;"
    inl = f'<style>:root {{ {farben} }} /*{css}</style>' + L.icon_inline().replace('class="logo"', 'class="logo" width="256" height="256"', 1)
    page.set_content(f'<html><body style="margin:0;background:#fff">{inl}</body></html>')
    from PIL import Image
    b_inl = Image.open(io.BytesIO(page.screenshot(clip={"x": 0, "y": 0, "width": 256, "height": 256}))).convert("RGB")
    box = abweichung(b_inl, raster(page, lies("logo.svg")), schwelle=2)
    ok(box is None, f"eingebettetes Logo (hell) bildgleich mit logo.svg ({box})")
    page.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--browser", default="chromium", choices=["chromium", "webkit", "firefox"])
    ap.add_argument("--shots")
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright

    tmp = tempfile.mkdtemp()
    wurzel = veroeffentlichen(tmp)
    srv, url = server(wurzel)
    with sync_playwright() as p:
        opts = {}
        if args.browser == "chromium" and os.environ.get("CHROMIUM_PATH"):
            opts["executable_path"] = os.environ["CHROMIUM_PATH"]
        browser = getattr(p, args.browser).launch(**opts)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        anfragen, fehler_js = [], []
        page.on("request", lambda r: anfragen.append(r.url))
        page.on("pageerror", lambda e: fehler_js.append(str(e)))

        # 1 Laden: nichts von außen, nichts von der Mühle, keine Datenbank
        page.goto(url, wait_until="load")
        page.wait_for_timeout(300)
        fremd = [u for u in anfragen if not u.startswith(url)]
        ok(not fremd, f"Landingpage lädt nichts von außen {fremd[:3]}")
        muehle = [u for u in anfragen if "/start/" in u or "pyodide" in u or u.endswith((".wasm", ".whl", ".zip"))]
        ok(not muehle, f"Landingpage lädt keine Datei der Mühle {muehle[:3]}")
        ok(len(anfragen) <= 6, f"wenige Anfragen: {len(anfragen)}")
        ok(page.is_hidden("#weiter"), "ohne gesicherte Einheit kein „Weiter mit deiner Einheit“")
        dbs = page.evaluate("indexedDB.databases ? indexedDB.databases().then(l => l.map(x => x.name)) : null")
        ok(dbs is None or "kursmuehle" not in dbs, f"Landingpage legt keine IndexedDB an ({dbs})")
        ok(page.evaluate("document.title") == "Kursmühle", "Titel")
        text = page.inner_text("body")
        ok("mebis" not in text.lower(), "kein „mebis“")
        ok("!" not in text, "kein Ausrufezeichen")
        ok("Sarkar" not in page.content(), "kein Name auf der Startseite (steht im Impressum)")

        # 2 Kachel und Impressum-Link
        ziel = page.evaluate("new URL(document.getElementById('kachel').getAttribute('href'), location.href).pathname")
        ok(ziel == "/start/", f"Kachel führt zu /start/ ({ziel})")
        ok("Mahlwerk starten" in page.inner_text("#kachel"), "Kachel: „Mahlwerk starten“")
        imp = page.evaluate("[...document.querySelectorAll('footer a')].filter(a => /impressum/i.test(a.textContent))"
                            ".map(a => new URL(a.getAttribute('href'), location.href).pathname)")
        ok(imp == ["/impressum.html"], f"Impressum-Link in der Fußzeile ({imp})")
        page.click("#kachel")
        page.wait_for_url(url + "start/")
        ok(page.title().startswith("Kursmühle – Mahlwerk"), f"Kachel öffnet die Mühle ({page.title()})")
        page.wait_for_function("window.km && km.autosaveLesen", timeout=20000)
        ok(page.evaluate("km.autosaveLesen().then(r => r === null).catch(e => 'Fehler ' + e)") is True,
           "Mühle liest ihren Speicher nach dem Besuch der Landingpage")
        mi = page.evaluate("new URL(document.querySelector('.fuss a.fuss-klein').getAttribute('href'), location.href).pathname")
        ok(mi == "/impressum.html", f"Impressum-Link der Mühle ({mi})")
        ok(page.evaluate("parseFloat(getComputedStyle(document.querySelector('.fuss a.fuss-klein')).fontSize)"
                         " < parseFloat(getComputedStyle(document.querySelector('#fuss-rueckmeldung')).fontSize)"),
           "Impressum-Link der Mühle kleiner als die übrigen")
        start = page.evaluate("new URL(document.querySelector('.marke').getAttribute('href'), location.href).pathname")
        ok(start == "/", f"Marke der Mühle führt zur Landingpage ({start})")

        # 3 Impressum
        anfragen.clear()
        r = page.goto(url + "impressum.html")
        ok(r.status == 200, "Impressum erreichbar")
        t = page.inner_text("body")
        for s in ("Chiemgaustr. 140", "81549 München", "kursmuehle@pm.me", "GitHub", "Data Privacy Framework",
                  "Kursmühle von Simon Sarkar", "PolyForm Noncommercial", "CC BY-NC-SA 4.0"):
            ok(s in t, f"Impressum enthält „{s}“")
        ok(page.locator("table tr").count() >= 6, "Impressum: Tabelle Datenfluss")
        ok(not [u for u in anfragen if not u.startswith(url)], "Impressum lädt nichts von außen")

        # 4 Schritt 1: das Formular baut die Adresse der Mühle (Mühle hier durch eine leere Seite ersetzt)
        fctx = browser.new_context(viewport={"width": 1280, "height": 900})
        fctx.route("**/start/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<p>Mühle</p>"))
        fp = fctx.new_page()
        fp.on("pageerror", lambda e: fehler_js.append(str(e)))
        for thema, jg, mi, erwartet in (
                ("Größen & Maße am Fluss", "7", "90",
                 "/start/#thema=Gr%C3%B6%C3%9Fen%20%26%20Ma%C3%9Fe%20am%20Fluss&jahrgang=7&minuten=90"),
                ("  Satz des Pythagoras ", "", "45", "/start/#thema=Satz%20des%20Pythagoras&minuten=45"),
                ("", "9", "60", "/start/"), ("   ", "", "45", "/start/")):
            fp.goto(url)
            fp.fill("#f-thema", thema)
            fp.fill("#f-jahrgang", jg)
            fp.fill("#f-minuten", mi)
            with fp.expect_navigation():
                fp.click("#start-form button")
            u = fp.evaluate("location.pathname + location.search + location.hash")
            ok(u == erwartet, f"Weiter mit „{thema}“, „{jg}“, „{mi}“ führt zu {u}")
        fp.goto(url)
        fp.fill("#f-thema", "Bruchrechnen")
        with fp.expect_navigation():
            fp.press("#f-thema", "Enter")
        ok(fp.evaluate("location.hash") == "#thema=Bruchrechnen&minuten=45", "Eingabetaste im Thema wie „Weiter“")
        fp.goto(url)
        fp.fill("#f-thema", "Kachel nimmt mit")
        with fp.expect_navigation():
            fp.click("#kachel")
        ok(fp.evaluate("location.pathname + location.hash") == "/start/#thema=Kachel%20nimmt%20mit&minuten=45",
           "„Mahlwerk starten“ nimmt die Eingaben mit")
        fp.goto(url)
        ok(fp.evaluate("[...document.querySelectorAll('#start-form label')].map(l => l.firstChild.textContent.trim())")
           == ["Thema", "Jahrgangsstufe", "Minuten"], "Felder beschriftet wie Schritt 1 der Mühle")
        ok(fp.evaluate("document.getElementById('f-minuten').value") == "45", "Minuten vorbelegt mit 45")
        fctx.close()

        # 5 Kopfzeile: klebt oben, kleine Kachel erst nach dem Scrollen; ohne Skript immer sichtbar
        sicht = "getComputedStyle(document.getElementById('mini')).visibility === 'visible'"
        for pfad in ("", "impressum.html"):
            page.set_viewport_size({"width": 1280, "height": 900})
            page.goto(url + pfad)
            page.wait_for_timeout(300)
            k = page.evaluate("(() => { const k = document.querySelector('.kopfzeile'); return [getComputedStyle(k).position,"
                              " k.getBoundingClientRect().height]; })()")
            ok(k[0] == "sticky" and k[1] <= 56, f"{pfad or 'Landingpage'}: Kopfzeile sticky, {k[1]} px hoch")
            if pfad == "":
                ok(not page.evaluate(sicht), "kleine Kachel verborgen, solange die große zu sehen ist")
            else:
                ok(page.evaluate(sicht), "Impressum: kleine Kachel sichtbar")
            ziel = page.evaluate("new URL(document.getElementById('mini').getAttribute('href'), location.href).pathname")
            ok(ziel == "/start/", f"{pfad or 'Landingpage'}: kleine Kachel führt zu /start/ ({ziel})")
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(500)
            ok(page.evaluate("document.querySelector('.kopfzeile').getBoundingClientRect().top") == 0,
               f"{pfad or 'Landingpage'}: Kopfzeile bleibt beim Scrollen oben")
            ok(page.evaluate(sicht), f"{pfad or 'Landingpage'}: kleine Kachel nach dem Scrollen sichtbar")
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(url)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(500)
        ok(page.evaluate("getComputedStyle(document.querySelector('#mini span')).display") == "none"
           and page.evaluate(sicht), "390 px: kleine Kachel ohne Untertitel")
        nctx = browser.new_context(viewport={"width": 1280, "height": 900}, java_script_enabled=False)
        nctx.route("**/start/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<p>Mühle</p>"))
        np_ = nctx.new_page()
        np_.goto(url)
        ok(np_.locator("#mini").is_visible(), "ohne Skript: kleine Kachel sichtbar")
        np_.fill("#f-thema", "Ohne Skript")
        with np_.expect_navigation():
            np_.click("#start-form button")
        ok("/start/?thema=Ohne+Skript" in np_.url, f"ohne Skript: Formular schickt die Felder an start/ ({np_.url})")
        nctx.close()

        # 6 hell und dunkel: kein horizontales Scrollen, Kontrast
        for modus, schema in MODI:
            page.goto(url)
            page.evaluate(SCHEMA, schema)
            for name, pfad in (("Landingpage", ""), ("Impressum", "impressum.html")):
                for b in BREITEN:
                    page.set_viewport_size({"width": b, "height": 900})
                    page.goto(url + pfad)
                    ok(kein_querscrollen(page), f"{name} {modus}: kein horizontales Scrollen bei {b} px")
            page.goto(url)
            for paar in ("h1|.hero", ".vorsatz|.hero", ".marke|.kopfzeile", "#ablauf-titel|.ergebnis", "footer p|footer"):
                k = page.evaluate(KONTRAST, paar)
                ok(k >= 4.5, f"{modus}: Kontrast {paar.replace('|', ' auf ')} {k:.1f}")
            page.goto(url + "impressum.html")
            k = page.evaluate(KONTRAST, "h1|body")
            ok(k >= 4.5, f"Impressum {modus}: Kontrast {k:.1f}")
        page.goto(url)
        page.evaluate("() => { try { localStorage.removeItem('kursmuehle-schema'); } catch (e) {} }")
        page.emulate_media(color_scheme="dark")
        page.goto(url)
        hell = page.evaluate("getComputedStyle(document.querySelector('.hero')).backgroundColor")
        ok(hell == "rgb(243, 233, 216)" and page.text_content("#schema").strip() == "Dunkel",
           f"ohne Wahl bleibt es hell, auch bei dunkler Systemeinstellung ({hell})")
        page.click("#schema")
        dunkel = page.evaluate("getComputedStyle(document.querySelector('.hero')).backgroundColor")
        ok(hell != dunkel and dunkel == "rgb(42, 42, 42)" and page.text_content("#schema").strip() == "Hell",
           f"Schalter „Dunkel“: Band in Anthrazit ({hell} → {dunkel})")
        page.goto(url + "impressum.html")
        ok(page.evaluate("document.documentElement.dataset.theme") == "dark", "Wahl gilt nach dem Laden auch im Impressum")
        page.click("#schema")
        page.goto(url)
        ok(page.evaluate("getComputedStyle(document.querySelector('.hero')).backgroundColor") == hell, "Schalter „Hell“ schaltet zurück und bleibt")
        page.emulate_media(color_scheme="light")
        # Wasserzeichen beginnt rechts von der Kachel (überdeckt sie nie)
        for b in (1440, 1700, 2560):
            page.set_viewport_size({"width": b, "height": 900})
            page.goto(url)
            kr = page.evaluate("document.querySelector('#kachel').getBoundingClientRect().right")
            wl = page.evaluate("parseFloat(getComputedStyle(document.querySelector('.hero'), '::after').left)")
            ok(wl >= kr, f"{b} px: Wasserzeichen beginnt rechts von der Kachel ({wl:.0f} >= {kr:.0f})")

        # 7 Hover und Fokus drehen das Rad, prefers-reduced-motion nicht
        page.set_viewport_size({"width": 1280, "height": 900})
        page.mouse.move(5, 600)          # vor dem Laden: Firefox setzt :hover beim Laden an der letzten Mausposition (frühere
        page.goto(url)                   # Klicks auf die Kachel), und das Verlassen danach ließe das Rad noch bis zu 2 s auslaufen
        page.wait_for_timeout(100)
        ok(page.evaluate(ANIM, "#kachel") == 0, "ohne Hover dreht sich nichts")
        page.hover("#kachel")
        page.wait_for_timeout(300)
        ok(page.evaluate(ANIM, "#kachel") > 0, "Hover auf der Kachel startet die Drehung")
        page.mouse.move(5, 600)
        page.wait_for_timeout(2600)
        ok(page.evaluate(ANIM, "#kachel") == 0, "nach dem Verlassen läuft das Rad aus und steht")
        page.goto(url + "impressum.html")
        page.hover("#mini")
        page.wait_for_timeout(300)
        ok(page.evaluate(ANIM, "#mini") > 0, "Hover auf der kleinen Kachel startet die Drehung")
        page.mouse.move(5, 600)
        page.goto(url)
        for _ in range(12):
            page.keyboard.press("Tab")
            if page.evaluate("document.activeElement && document.activeElement.id") == "kachel":
                break
        if page.evaluate("document.activeElement && document.activeElement.id") == "kachel":
            page.wait_for_timeout(300)
            ok(page.evaluate(ANIM, "#kachel") > 0, "Tastaturfokus auf der Kachel startet die Drehung")
        else:
            print("–      Tastaturfokus: Tab erreicht die Kachel in diesem Browser nicht, übersprungen")
        rctx = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        rp = rctx.new_page()
        rp.goto(url)
        rp.hover("#kachel")
        rp.wait_for_timeout(300)
        ok(rp.evaluate(ANIM, "#kachel") == 0, "prefers-reduced-motion: keine Drehung")
        rctx.close()

        # 8 gesicherte Einheit → „Weiter mit deiner Einheit“
        page.goto(url)
        page.evaluate(AUTOSAVE, "Satz des Pythagoras")
        page.goto(url)
        page.wait_for_selector("#weiter", state="visible", timeout=5000)
        ok("Weiter mit deiner Einheit" in page.inner_text("#weiter") and "„Satz des Pythagoras“" in page.inner_text("#weiter"),
           "„Weiter mit deiner Einheit“ mit Titel")
        w = page.evaluate("(() => { const u = new URL(document.querySelector('#weiter a').getAttribute('href'), location.href);"
                          " return u.pathname + u.search; })()")
        ok(w == "/start/?weiter=1", f"Weiter führt zu /start/?weiter=1 ({w})")
        ok(page.evaluate("document.getElementById('weiter').compareDocumentPosition(document.getElementById('kachel'))"
                         " & Node.DOCUMENT_POSITION_FOLLOWING") != 0, "„Weiter“ steht über der Kachel")
        if args.shots:
            os.makedirs(args.shots, exist_ok=True)
            page.screenshot(path=os.path.join(args.shots, "ap13.2-weiter-1280.png"))
        page.evaluate("new Promise(r => { const q = indexedDB.deleteDatabase('kursmuehle'); q.onsuccess = q.onerror = q.onblocked = r; })")

        # 6 alte Testadresse
        with page.expect_request("**/start/?weiter=1", timeout=10000) as anfrage:   # die Mühle entfernt ?weiter=1 danach (AP13.1)
            page.goto(url + "2/?weiter=1")
        ok(anfrage.value.url == url + "start/?weiter=1", f"/2/ leitet auf /start/ weiter und behält ?weiter=1 ({anfrage.value.url})")

        # 10 Bild: liegt das Plattform-Bild vor, muss die Seite es zeigen
        if os.path.exists(os.path.join(DOCS, "landing-kurs.png")):
            ok('src="landing-kurs.png"' in open(os.path.join(DOCS, "index.html"), encoding="utf-8").read(),
               "docs/landing-kurs.png liegt vor: Bild, alt und Bildunterschrift tauschen (Kommentar in index.html)")

        logo_pruefen(browser)

        if args.shots:
            for modus, schema in MODI:
                sctx = browser.new_context()
                sp = sctx.new_page()
                sp.goto(url)
                sp.evaluate(SCHEMA, schema)
                for b in BREITEN:
                    sp.set_viewport_size({"width": b, "height": 1000 if b != 390 else 844})
                    sp.goto(url)
                    sp.wait_for_timeout(300)
                    sp.screenshot(path=os.path.join(args.shots, f"ap13.2-landing-{modus}-{b}.png"), full_page=True)
                sp.set_viewport_size({"width": 390, "height": 844})
                sp.goto(url + "impressum.html")
                sp.screenshot(path=os.path.join(args.shots, f"ap13.2-impressum-{modus}-390.png"), full_page=True)
                sctx.close()
            hctx = browser.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
            hp = hctx.new_page()
            hp.goto(url)
            hp.hover("#kachel")
            hp.wait_for_timeout(200)
            # Standbild: Rad um 50° gedreht (2 s Anlauf bis 36°, dann 36°/s), ein Flügel läuft über den Turm
            hp.evaluate("document.querySelector('#kachel .rad').getAnimations().forEach(a => { a.pause(); a.currentTime = 2000 + 14000 / 36; })")
            box = hp.locator(".hero").bounding_box()
            hp.screenshot(path=os.path.join(args.shots, "ap13.2-hover-1280.png"),
                          clip={"x": 640, "y": box["y"], "width": 640, "height": box["height"]})
            hctx.close()
            print(f"Screenshots in {args.shots}")
        ok(not fehler_js, f"keine Skriptfehler {fehler_js[:2]}")
        browser.close()
    srv.shutdown()
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n{len(fehler)} Fehler" if fehler else "\nalles gut")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
