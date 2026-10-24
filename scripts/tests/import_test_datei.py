"""Datei für den Import-Test 2.0 (AP12a): eine im Browser erstellte Sicherung aus dem Prompttest, Lauf 1.

Öffnet die Oberfläche (web/index.html) in Chromium, legt die Einheit an wie eine Lehrkraft (Satz des Pythagoras,
Jahrgangsstufe 9, 45 Minuten, Vorlage Einführung, Fach Mathematik, Schulart Mittelschule, Chat Claude), fügt die
Antwort aus docs/entwicklung/protokolle/ap11-prompttest/antwort-lauf1.txt unverändert ein, lädt für den Bildwunsch eine
selbst gezeichnete Skizze hoch (rechtwinkliges Dreieck mit den Quadraten über den Seiten, Pillow), sieht Fragen und
Lösungen durch, erstellt die Datei für die Lernplattform und lädt sie herunter. Ergebnis in DIR: die .mbz unter dem
Namen, den die Seite vergibt (<Kurstitel>_<Datum>.mbz), und die Kursdatei. Prüfpunkte: protokolle/import-test-2.0.md.
Die CI legt beides als Artefakt „import-test-2.0“ ab.

usage: python3 scripts/tests/import_test_datei.py --out DIR     (CHROMIUM_PATH für ein vorhandenes Chromium)
"""
import argparse
import functools
import http.server
import os
import subprocess
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WEB = os.path.join(ROOT, "web")
ANTWORT = os.path.join(ROOT, "docs", "entwicklung", "protokolle", "ap11-prompttest", "antwort-lauf1.txt")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import mappe as M  # noqa: E402
from check import check_mbz  # noqa: E402


class Stiller(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map, **{".wasm": "application/wasm"})

    def log_message(self, *a):
        pass


def skizze(pfad):
    """Rechtwinkliges Dreieck mit den Quadraten über den drei Seiten, beschriftet a, b, c (selbst gezeichnet)."""
    from PIL import Image, ImageDraw
    w, h = 1200, 900
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    A, B, C = (500, 650), (700, 650), (500, 350)          # rechter Winkel bei A; a = AB, b = AC, c = BC
    farbe, linie = (42, 42, 42), 6
    d.polygon([A, B, (700, 850), (500, 850)], outline=farbe, fill=(253, 240, 214), width=linie)        # Quadrat über a
    d.polygon([A, C, (200, 350), (200, 650)], outline=farbe, fill=(223, 238, 228), width=linie)        # Quadrat über b
    d.polygon([C, B, (1000, 450), (800, 150)], outline=farbe, fill=(222, 233, 245), width=linie)       # Quadrat über c
    d.polygon([A, B, C], outline=farbe, fill="white", width=linie)
    d.rectangle([500, 620, 530, 650], outline=farbe, width=4)                                          # rechter Winkel
    for text, xy in (("a", (585, 665)), ("b", (455, 480)), ("c", (615, 470))):
        d.text(xy, text, fill=farbe, font_size=48)
    img.save(pfad)
    return pfad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "web_bundle.py")], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"web_bundle.py fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Stiller, directory=WEB))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    basis = f"http://127.0.0.1:{srv.server_address[1]}"
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = browser.new_page(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        page.goto(basis + "/index.html")
        page.fill("#f-thema", "Satz des Pythagoras")
        page.fill("#f-jahrgang", "9")
        page.fill("#f-minuten", "45")
        page.click("#einheit-anlegen")
        page.click("#zweig-steuer")                   # AP13: Schrittfolge, Zweig „Ich steuere“ (Vorlage Einführung)
        page.wait_for_function("km.zustand.geladen && km.zustand.kennzahlen && km.zustand.steckbrief_text", timeout=180000)
        page.evaluate("document.getElementById('mehr').open = true")
        page.fill("#a-fach", "Mathematik")
        page.press("#a-fach", "Tab")
        page.select_option("#a-schulart", "Mittelschule")
        page.wait_for_function("km.zustand.steckbrief_text.includes('Mittelschule')", timeout=30000)
        page.click("#weiter-2")
        page.click("#weiter-3")
        page.click("[data-chat=claude]")
        page.wait_for_function("!document.getElementById('text-kopieren').disabled", timeout=60000)
        page.click("#text-kopieren")
        page.click("#infobox-ok")
        page.wait_for_selector("#schritt-5[data-stand=aktiv]", timeout=30000)
        with open(ANTWORT, encoding="utf-8") as f:
            page.fill("#eingabe", f.read())
        page.wait_for_function("document.getElementById('eingabe-stand').textContent.startsWith('Übernommen')", timeout=60000)
        bild = page.query_selector("input.k-bild[data-datei='pythagoras-quadrate.png']")
        if not bild:
            raise SystemExit("Kein Feld zum Hochladen für pythagoras-quadrate.png")
        bild.set_input_files(skizze(os.path.join(tmp, "skizze.png")))
        page.wait_for_function("!!km.zustand.assets['pythagoras-quadrate.png'] && "
                               "!km.zustand.pruefung.diagnosen.some(d => d.art === 'bild')", timeout=60000)
        page.click("#weiter-5")
        page.click("#durchsicht-ok")
        page.wait_for_function("!document.getElementById('erstellen').disabled", timeout=30000)
        page.click("#erstellen")
        page.wait_for_selector("#herunterladen:not([hidden])", timeout=60000)
        with page.expect_download() as dl:
            page.click("#herunterladen")
        mbz = os.path.join(args.out, dl.value.suggested_filename)
        dl.value.save_as(mbz)
        with page.expect_download() as dl:
            page.click("#speichern")
        mappe = os.path.join(args.out, dl.value.suggested_filename)
        dl.value.save_as(mappe)
        browser.close()
    srv.shutdown()
    errors, info, warnings = check_mbz(mbz)
    with open(mappe, "rb") as f:
        g = M.lesen(f.read())
    print(f"{mbz}: {'OK' if not errors else 'FEHLER'} ({info}); Bilder in der Kursdatei: {sorted(g['assets'])}")
    for wo, was in errors[:10]:
        print(f"  FEHLER {wo}: {was}")
    print(f"{mappe}: Kursdatei zum Nachvollziehen")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
