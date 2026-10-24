"""Test der Landingpage (AP13b): den öffentlichen Stand mit scripts/veroeffentlichen.py in ein Temp-Verzeichnis
schreiben (Trockenlauf der Beta-Veröffentlichung, vorher web_bundle.py), dessen docs/ als Wurzel ausliefern (wie
kursmuehle.de) und im Browser prüfen.

usage: python3 scripts/tests/test_landing.py [--browser chromium|webkit|firefox] [--shots DIR]
  --shots DIR  Screenshots beider Entwürfe bei 1280, 2560 und 390 px als DIR/ap13-landing-{a,b}-<breite>.png
               (Entwurf B aus docs/entwicklung/entwuerfe/landing-b.html, im Test als index-b.html neben index.html)

Prüft: Veröffentlichung enthält Landingpage, Impressum, Mühle unter start/, docs/2/ als Weiterleitung, CNAME; das
Release-Zip daraus enthält docs/start/ nicht. Die Landingpage lädt nichts von außen und keine Datei der Mühle (kein
Pyodide), legt keine IndexedDB an, die Kachel führt zu /start/, der Impressum-Link zu /impressum.html; kein
horizontales Scrollen bei 390, 1280 und 2560 px (beide Entwürfe, Impressum); „Weiter mit deiner Einheit“ erscheint erst
mit einer gesicherten Einheit (Speicher wie in web/app.js) und führt zu /start/?weiter=1; /2/ leitet auf /start/ weiter
und behält ?weiter=1; der Impressum-Link der Mühle führt auf dieselbe Seite. Exit 0 = alles gut.
Braucht Playwright (CHROMIUM_PATH für ein vorhandenes Chromium).
"""
import argparse
import functools
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
ENTWURF_B = os.path.join(ROOT, "docs", "entwicklung", "entwuerfe", "landing-b.html")
BREITEN = (1280, 2560, 390)
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
    shutil.copy(ENTWURF_B, os.path.join(d, "index-b.html"))
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


AUTOSAVE = """async (titel) => {           // wie km.autosaveSchreiben in web/app.js: DB kursmuehle, Speicher mappe
    const d = await new Promise((res, rej) => { const r = indexedDB.open('kursmuehle', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('mappe'); r.onsuccess = () => res(r.result); r.onerror = rej; });
    await new Promise((res, rej) => { const tx = d.transaction('mappe', 'readwrite');
        tx.objectStore('mappe').put({ zip: new Uint8Array([80, 75, 5, 6]).buffer, dateiname: 'test.zip', titel: titel,
                                      zeit: Date.now() }, 'aktuell');
        tx.oncomplete = res; tx.onerror = rej; });
    d.close(); }"""


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

        # 4 kein horizontales Scrollen
        for name, pfad in (("A", ""), ("B", "index-b.html"), ("Impressum", "impressum.html")):
            for b in BREITEN:
                page.set_viewport_size({"width": b, "height": 900})
                page.goto(url + pfad)
                ok(kein_querscrollen(page), f"{name}: kein horizontales Scrollen bei {b} px")

        # 5 gesicherte Einheit → „Weiter mit deiner Einheit“
        page.set_viewport_size({"width": 1280, "height": 900})
        page.goto(url)
        page.evaluate(AUTOSAVE, "Satz des Pythagoras")
        for name, pfad in (("A", ""), ("B", "index-b.html")):
            page.goto(url + pfad)
            page.wait_for_selector("#weiter", state="visible", timeout=5000)
            ok("Weiter mit deiner Einheit" in page.inner_text("#weiter") and "„Satz des Pythagoras“" in page.inner_text("#weiter"),
               f"{name}: „Weiter mit deiner Einheit“ mit Titel")
            w = page.evaluate("(() => { const u = new URL(document.querySelector('#weiter a').getAttribute('href'), location.href);"
                              " return u.pathname + u.search; })()")
            ok(w == "/start/?weiter=1", f"{name}: Weiter führt zu /start/?weiter=1 ({w})")
            ok(page.evaluate("document.getElementById('weiter').compareDocumentPosition(document.getElementById('kachel'))"
                             " & Node.DOCUMENT_POSITION_FOLLOWING") != 0, f"{name}: „Weiter“ steht über der Kachel")
        if args.shots:
            os.makedirs(args.shots, exist_ok=True)
            page.goto(url)
            page.wait_for_selector("#weiter", state="visible")
            page.screenshot(path=os.path.join(args.shots, "ap13-landing-a-weiter-1280.png"))
        page.evaluate("new Promise(r => { const q = indexedDB.deleteDatabase('kursmuehle'); q.onsuccess = q.onerror = q.onblocked = r; })")

        # 6 alte Testadresse
        page.goto(url + "2/?weiter=1")
        page.wait_for_url("**/start/?weiter=1", timeout=10000)
        ok(page.url == url + "start/?weiter=1", f"/2/ leitet auf /start/ weiter und behält ?weiter=1 ({page.url})")

        if args.shots:
            for name, pfad in (("a", ""), ("b", "index-b.html")):
                for b in BREITEN:
                    page.set_viewport_size({"width": b, "height": 1000 if b != 390 else 844})
                    page.goto(url + pfad)
                    page.evaluate("document.fonts ? document.fonts.ready : null")
                    page.wait_for_timeout(200)
                    page.screenshot(path=os.path.join(args.shots, f"ap13-landing-{name}-{b}.png"), full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            page.goto(url + "impressum.html")
            page.screenshot(path=os.path.join(args.shots, "ap13-impressum-390.png"), full_page=True)
            print(f"Screenshots in {args.shots}")
        ok(not fehler_js, f"keine Skriptfehler {fehler_js[:2]}")
        browser.close()
    srv.shutdown()
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n{len(fehler)} Fehler" if fehler else "\nalles gut")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
