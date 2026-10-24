"""Test der Browser-Fassung (AP10a, seit AP10 gegen die Baustein-Ansicht): Seite in Chromium, WebKit oder Firefox
aus dem Unterpfad /start/ öffnen (wie unter kursmuehle.de/start/, AP13b; vorher /kursmuehle/2/), Pyodide lädt im
Hintergrund, die Testkurse (Fixtures netzwerk9 und module als Kursdatei) prüfen und bauen, Einfügen einer Chat-Antwort,
Herunterladen, Kursmappe schreiben, Autosave, 1.x-Import (Dateien einzeln, in allen Browsern; dazu in Chromium die
Ordnerauswahl) und die Messseite; dabei Ladezeit, Prüfzeit, Bauzeit und WASM-Heap messen.

usage: python3 scripts/tests/test_web.py [--browser chromium|webkit|firefox] [--out DIR] [--vergleich] [--kurz]
                                         [--seite index.html]
  --vergleich  baut jedes Beispiel zusätzlich in CPython mit fester Zeit und festem Seed und verlangt dieselben Bytes
               wie im Browser (CI-Gate: Pyodide-Bau byteidentisch)
  --out DIR    Messwerte als <browser>.json und <browser>.md (Standard web/messungen/)
  --kurz       nur netzwerk9
  --unterpfad  Pfad, unter dem die Seite liegt (Standard /start/; „/“ für die Wurzel)
Exit 0 = alles gut. Braucht Playwright mit dem gewählten Browser (`playwright install chromium webkit firefox`,
oder CHROMIUM_PATH für ein vorhandenes Chromium). Ruft vorher scripts/web_bundle.py auf.
"""
import argparse
import base64
import functools
import hashlib
import http.server
import json
import os
import subprocess
import sys
import tempfile
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WEB = os.path.join(ROOT, "web")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import mappe as M  # noqa: E402
sys.path.insert(0, HERE)
from fixtures import mappen  # noqa: E402

ZEIT, SEED = 1700000000, 20261024
BEISPIELE = ["netzwerk9", "module"]
FIXTURES = os.path.join(HERE, "fixtures")
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


class Unterpfad(Stiller):
    """web/ unter einem Unterpfad ausliefern (kursmuehle.de/start/); alles andere 404."""
    praefix = "/start/"

    def translate_path(self, path):
        if not path.startswith(self.praefix):
            return os.path.join(WEB, "__gibt_es_nicht__")
        return super().translate_path("/" + path[len(self.praefix):])


def server(unterpfad="/"):
    if unterpfad.strip("/"):
        h = functools.partial(type("U", (Unterpfad,), {"praefix": "/" + unterpfad.strip("/") + "/"}), directory=WEB)
    else:
        h = functools.partial(Stiller, directory=WEB)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/" + (unterpfad.strip("/") + "/" if unterpfad.strip("/") else "")


def cpython_hashes():
    out = {}
    for name in BEISPIELE:
        d = os.path.join(FIXTURES, name)
        with open(os.path.join(d, "kurs.md"), encoding="utf-8") as f:
            kurs = f.read()
        with open(os.path.join(d, "steckbrief.yaml"), encoding="utf-8") as f:
            sb = f.read()
        mbz, diag = api.baue(kurs, sb, os.path.join(d, "assets"), zeit=ZEIT, seed=SEED)
        assert mbz, [x["satz"] for x in diag]
        out[name] = (hashlib.sha256(mbz).hexdigest(), len(mbz), mbz)
    return out


def warte_status(page, praefixe, timeout=180000, el="status"):
    """Auf eine neue Statuszeile warten (die alte wird vorher gelöscht, sonst zählt ein alter Stand)."""
    page.wait_for_function(
        "(a) => { const t = document.getElementById(a.el).textContent; return a.p.some(x => t.startsWith(x)) || "
        "t.includes('fehlgeschlagen') || t.includes('nicht geklappt'); }", arg={"p": list(praefixe), "el": el}, timeout=timeout)
    return page.text_content("#" + el)


def leere(page, el):
    page.evaluate("(el) => { document.getElementById(el).textContent = ''; }", el)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--browser", default="chromium", choices=["chromium", "webkit", "firefox"])
    ap.add_argument("--out", default=os.path.join(WEB, "messungen"))
    ap.add_argument("--vergleich", action="store_true")
    ap.add_argument("--kurz", action="store_true")
    ap.add_argument("--seite", default="index.html")
    ap.add_argument("--unterpfad", default="/start/")
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright

    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "web_bundle.py")], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"web_bundle.py fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    beispiele = BEISPIELE[:1] if args.kurz else BEISPIELE
    cp = cpython_hashes() if args.vergleich else {}
    srv, url = server(args.unterpfad)
    tmp_mappen = tempfile.mkdtemp()
    zips = {n: mappen.zip_datei(n, tmp_mappen) for n in beispiele}
    messung = {"browser": args.browser, "zeit": time.strftime("%Y-%m-%d %H:%M:%S"), "schritte": []}
    konsole = []
    with sync_playwright() as p:
        opts = {}
        if args.browser == "chromium" and os.environ.get("CHROMIUM_PATH"):
            opts["executable_path"] = os.environ["CHROMIUM_PATH"]
        browser = getattr(p, args.browser).launch(**opts)
        page = browser.new_page(accept_downloads=True)
        page.on("console", lambda m: konsole.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: konsole.append(f"[pageerror] {e}"))
        page.goto(url + args.seite)
        messung["user_agent"] = page.evaluate("navigator.userAgent")
        messung["unterpfad"] = args.unterpfad
        ok(page.evaluate("location.pathname").startswith(args.unterpfad.rstrip("/") + "/") or args.unterpfad == "/",
           f"Seite aus dem Unterpfad {args.unterpfad}: {page.evaluate('location.pathname')}")

        # 1 Laden: startet beim Öffnen im Hintergrund
        st = warte_status(page, ["Bereit", "Der Baukasten"], el="kopf-status")
        ok(st == "Bereit", f"Pyodide geladen: {st}")
        info = page.evaluate("km.zustand.ladeInfo")
        messung["laden"] = info
        messung["schritte"].append(dict(aktion="laden", dauer_ms=info["gesamt_ms"], pyodide_ms=info["pyodide_ms"],
                                        pakete_ms=info["pakete_ms"], generator_ms=info["generator_ms"]))

        # 2+3 je Beispiel prüfen und bauen (über die Schnittstelle, mit fester Zeit und Seed für den Vergleich)
        for name in beispiele:
            with open(zips[name], "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            res = page.evaluate("""async (a) => {
                const bin = atob(a.b64), u8 = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
                const m = await km.mappeAusBytes(u8.buffer, a.name);
                const t0 = performance.now();
                const p = await km.pruefe(m.kurs_md);
                const t1 = performance.now();
                const e = await km.baue({zeit: a.zeit, seed: a.seed});
                const t2 = performance.now();
                const heap = await km.heap();
                const h = e.mbz ? await km.sha256(e.mbz) : null;
                return {bausteine: p.bausteine.length, fehler: p.diagnosen.filter(d => d.stufe === 'fehler').length,
                        pruef_ms: Math.round(t1 - t0), bau_ms: Math.round(t2 - t1), bytes: e.mbz ? e.mbz.length : 0,
                        sha256: h, dateiname: e.dateiname, heap_mb: heap.heap_mb, js_heap_mb: heap.js_heap_mb,
                        diagnosen: e.diagnosen.map(d => d.satz), mappe: m.mappe.bausteine.length};
            }""", {"name": name, "zeit": ZEIT, "seed": SEED, "b64": b64})
            ok(res["fehler"] == 0 and res["bausteine"] > 0, f"{name}: geprüft, {res['bausteine']} Bausteine, {res['fehler']} Fehler")
            ok(res["bytes"] > 0, f"{name}: gebaut, {res['bytes']} Bytes in {res['bau_ms']} ms, Heap {res['heap_mb']} MB")
            ok(res["mappe"] == res["bausteine"], f"{name}: Mappe hat {res['mappe']} Bausteine wie der Parser")
            if not res["bytes"]:
                print("\n".join(res["diagnosen"]))
            schritt = dict(aktion="pruefe+baue", beispiel=name, pruef_ms=res["pruef_ms"], bau_ms=res["bau_ms"],
                           bytes=res["bytes"], heap_mb=res["heap_mb"], js_heap_mb=res["js_heap_mb"], sha256=res["sha256"])
            if args.vergleich:
                h, n, mbz = cp[name]
                gleich = res["sha256"] == h
                schritt["cpython_sha256"], schritt["identisch"] = h, gleich
                ok(gleich, f"{name}: Pyodide-Bau byteidentisch zu CPython ({res['bytes']} / {n} Bytes)")
                if not gleich:
                    b64 = page.evaluate("() => { const u = km.zustand.bau.mbz; let s = ''; for (let i = 0; i < u.length; i += 8192) "
                                        "s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); }")
                    pfad = os.path.join(tempfile.gettempdir(), f"pyodide_{name}.mbz")
                    with open(pfad, "wb") as f:
                        f.write(base64.b64decode(b64))
                    pfad2 = os.path.join(tempfile.gettempdir(), f"cpython_{name}.mbz")
                    with open(pfad2, "wb") as f:
                        f.write(mbz)
                    d = subprocess.run([sys.executable, os.path.join(HERE, "mbz_diff.py"), pfad, pfad2], capture_output=True, text=True)
                    print(d.stdout[-3000:])
            messung["schritte"].append(schritt)

        # Knöpfe wie die Lehrkraft: Kursdatei öffnen, Datei erstellen, herunterladen
        ok(not page.query_selector("#beispiel-laden"), "kein Knopf „Beispiel ansehen“ mehr")
        page.click("#neue-einheit") if page.is_visible("#neue-einheit") else None
        page.wait_for_selector("#start[data-stand=aktiv]")
        page.set_input_files("#datei-oeffnen", zips["netzwerk9"])
        page.wait_for_function("document.body.dataset.bildschirm === 'ansicht' && km.zustand.mappe "
                               "&& km.zustand.mappe.bausteine.length === 10 && km.zustand.kennzahlen", timeout=60000)
        ok(page.evaluate("km.zustand.pruefung.ok") and page.is_visible("#ohne-durchsicht"), "Kursdatei öffnen: geprüft, Durchsicht angeboten")
        page.click("#ohne-durchsicht")
        ok(not page.is_disabled("#erstellen"), "ohne Durchsicht freigegeben: erstellbar")
        page.click("#erstellen")
        page.wait_for_selector("#herunterladen:not([hidden])", timeout=60000)
        ok(page.text_content("#erstellen-stand").startswith("Die Datei ist fertig"), f"Knopf erstellen: {page.text_content('#erstellen-stand')}")
        with page.expect_download() as dl:
            page.click("#herunterladen")
        d = dl.value
        pfad = os.path.join(tempfile.gettempdir(), d.suggested_filename)
        d.save_as(pfad)
        groesse = os.path.getsize(pfad)
        ok(d.suggested_filename.endswith(".mbz") and groesse > 1000, f"Herunterladen: {d.suggested_filename}, {groesse} Bytes")
        os.remove(pfad)

        # Einfügen einer Chat-Antwort mit Vorrede, Codeblock und zwei Fehlern: sofort geprüft, je Baustein eine Diagnose
        chat = ("Hier ist dein Drehbuch, gern passe ich es an:\n\n```markdown\n# Drehbuch v1 · Test · 45\n\n## Allgemeines\n"
                "### Banner: Probe\nuntertitel: Ein Satz\n\n## Teil 1 · 20 min\n### Textfeld: Willkommen\nHallo <script>x</script> Welt\n"
                "### Quiz: Q · 5 min\n1. Frage? · a · b\n### Zuordnen: Z\nzonen: A | B\n- e → A\n- f → C\n### Textfeld: Bild\n"
                "Bild: fehlt.png | alt\n```\n\nSoll ich noch etwas ändern?")
        leere(page, "eingabe-stand")
        page.click("#schritt-5 .s-zeile")             # AP13: Schritt 5 ist nach dem Erstellen eine zugeklappte Zeile
        page.fill("#eingabe", chat)
        warte_status(page, ["Übernommen", "Im Text"], el="eingabe-stand")
        pr = page.evaluate("km.zustand.pruefung")
        typen = [b["typ"] for b in pr["bausteine"]]
        stufen = {}
        for dg in pr["diagnosen"]:
            stufen[dg["stufe"]] = stufen.get(dg["stufe"], 0) + 1
        ok(typen == ["Banner", "Textfeld", "Quiz", "Zuordnen", "Textfeld"], f"Einfügen: Bausteine {typen}")
        ok(stufen.get("fehler") == 2 and stufen.get("warnung") == 1, f"Einfügen: Diagnosen {stufen} (2 Fehler, 1 Warnung erwartet)")
        ok(all(dg["titel"] for dg in pr["diagnosen"] if dg["stufe"] == "fehler"), "Einfügen: Fehler tragen Bausteintitel")
        ok(pr["kursdatei"].startswith("# Drehbuch") and "Soll ich" not in pr["kursdatei"], "Einfügen: Vorrede und Nachsatz entfernt")
        ok(page.is_disabled("#erstellen"), "Einfügen: Erstellen bleibt bei Fehlern gesperrt")
        ids1 = [b["id"] for b in pr["bausteine"]]
        leere(page, "eingabe-stand")
        page.fill("#eingabe", chat.replace("Hallo <script>x</script> Welt", "Hallo Welt, geändert"))
        warte_status(page, ["Übernommen", "Im Text"], el="eingabe-stand")
        ids2 = [b["id"] for b in page.evaluate("km.zustand.pruefung")["bausteine"]]
        ok(ids1 == ids2, "Baustein-IDs bleiben bei Textänderung gleich")

        # Kursmappe schreiben, in Python lesen; Autosave vorhanden
        mp = page.evaluate("async () => { const m = await km.mappeSchreiben(); let s = ''; const u = m.zip; "
                           "for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); "
                           "return {name: m.dateiname, b64: btoa(s)}; }")
        gelesen = M.lesen(base64.b64decode(mp["b64"]))
        ok(gelesen["mappe"]["format"] == 2 and len(gelesen["mappe"]["bausteine"]) == 5 and mp["name"].endswith(".kursmappe.zip"),
           f"Kursmappe: {mp['name']}, Format {gelesen['mappe']['format']}, {len(gelesen['mappe']['bausteine'])} Bausteine")
        page.wait_for_function("() => document.getElementById('autosave-stand').textContent.includes('gesichert')", timeout=15000)
        auto = page.evaluate("async () => { const r = await km.autosaveLesen(); return r ? r.dateiname : null; }")
        ok(bool(auto), f"Autosave in IndexedDB: {auto}")

        # 1.x-Kursordner öffnen: kurs.md, steckbrief.yaml und die Bilder als einzelne Dateien (so auch auf dem iPad);
        # stabil in allen drei Browsern, anders als set_input_files auf einem webkitdirectory-Feld in WebKit
        ordner = os.path.join(FIXTURES, "netzwerk9")
        dateien = [os.path.join(ordner, "kurs.md"), os.path.join(ordner, "steckbrief.yaml")] + \
            [os.path.join(ordner, "assets", n) for n in sorted(os.listdir(os.path.join(ordner, "assets")))]
        page.click("#neue-einheit")
        page.wait_for_selector("#start[data-stand=aktiv]")
        page.set_input_files("#datei-oeffnen", dateien)
        page.wait_for_function("document.body.dataset.bildschirm === 'ansicht' && km.zustand.mappe "
                               "&& km.zustand.mappe.bausteine.length === 10 && km.zustand.kennzahlen", timeout=60000)
        z = page.evaluate("({m: km.zustand.mappe.bausteine.length, a: Object.keys(km.zustand.assets).length, t: km.zustand.mappe.titel, ok: km.zustand.pruefung.ok})")
        ok(z["m"] == 10 and z["a"] == 7 and z["ok"], f"1.x-Import (Dateien einzeln): {z['m']} Bausteine, {z['a']} Dateien, Titel „{z['t']}“")
        if args.browser == "chromium":
            page.click("#neue-einheit")
            page.wait_for_selector("#start[data-stand=aktiv]")
            page.set_input_files("#ordner-oeffnen", ordner)
            page.wait_for_function("document.body.dataset.bildschirm === 'ansicht' && km.zustand.mappe "
                                   "&& km.zustand.mappe.bausteine.length === 10 && Object.keys(km.zustand.assets).length === 7", timeout=60000)
            ok(True, "1.x-Import (Ordnerauswahl, nur Chromium): 10 Bausteine, 7 Dateien")

        # Messseite für den Autor: alle drei Beispiele messen
        mess = browser.new_page()
        mess.on("pageerror", lambda e: konsole.append(f"[pageerror] {e}"))
        mess.goto(url + "messung.html")
        mess.set_input_files("#messen-dateien", [zips[n] for n in beispiele])
        st = warte_status(mess, ["Messung fertig", "Messung abgebrochen"])
        ok(st.startswith("Messung fertig"), f"Messseite: {st}")
        mess.close()

        messung["konsole"] = konsole
        browser.close()
    srv.shutdown()
    ok(not [k for k in konsole if "pageerror" in k], f"keine Seitenfehler ({len(konsole)} Konsolenmeldungen)")

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, f"{args.browser}.json"), "w", encoding="utf-8") as f:
        json.dump(messung, f, ensure_ascii=False, indent=1)
    md = [f"### {args.browser}", "", f"`{messung['user_agent']}`", "",
          "| Schritt | Testkurs | Dauer ms | Bau ms | Bytes | WASM-Heap MB | identisch |", "|---|---|---|---|---|---|---|"]
    for s in messung["schritte"]:
        if s["aktion"] == "laden":
            md.append(f"| laden (Pyodide {s['pyodide_ms']} · Pakete {s['pakete_ms']} · Generator {s['generator_ms']}) | | {s['dauer_ms']} | | | | |")
        else:
            md.append(f"| prüfen + bauen | {s['beispiel']} | {s['pruef_ms']} | {s['bau_ms']} | {s['bytes']} | {s['heap_mb']} | "
                      f"{'ja' if s.get('identisch') else ('nein' if 'identisch' in s else '–')} |")
    with open(os.path.join(args.out, f"{args.browser}.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print("\n".join(md))
    if fehler:
        print(f"\n{len(fehler)} Fehler:\n- " + "\n- ".join(fehler))
        return 1
    print("\nalles gut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
