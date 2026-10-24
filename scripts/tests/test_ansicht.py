"""Test der Oberfläche (web/index.html; seit AP13 die Schrittfolge) in Chromium, WebKit oder Firefox bei 1280 und 390 px.

Die Seite liegt wie veröffentlicht unter /start/, darüber ein Platzhalter der Landingpage.
Ablauf je Breite, Zweig „Ich steuere“: zu Beginn nur Schritt 1 (drei Felder, Weiter, Hinweis beim ersten Besuch), Zeile
„Beta“, Muster, Entwurfsverwaltung als Textlinks in der Kopfzeile; jeder Schritt erscheint erst nach dem vorigen,
erledigte als aufklappbare Zeile mit Fazit. Schritt 2: Vorlage Einführung, Typ „automatisch“, „+“, Zeit je Phase.
Schritt 3: Aussehen schreibt den Steckbrief; Hinweise ausschalten (IndexedDB, Speicher einstellungen). Schritt 4: „Anderer
Chat“ führt zu den Kacheln, Text unter 12 KB mit Zeitregel, Kopieren mit Infobox; kein Schritt 7 ohne Antwort. Schritt 5:
Antwort mit Zeit-Annahme und zwei roten Karten (Sammelblock unter den Karten), Antwort mit einer roten Karte
(Korrekturschleife an der Karte: Satz, Einfügen, grün), Antwort mit zwei Bildern (Bildwunsch und Bildprompt), Herkunft,
Zweigwechsel, Bild an der Karte, Umbenennen, „Diesen Baustein neu beauftragen“ als Schleife, unbekannte id. Schritt
Bilder: beide Texte mit Kopierknopf, Upload, Status, Nummern. Schritt 6: Fragen, Gegenprüfen. Schritt 7: ein Knopf baut
und lädt herunter (Bytes wie der CPython-Bau), nur er ist Ocker; Wiederherstellen, Rückmeldung. Neu laden, Einheit
öffnen, nächste Einheit (Aussehen und Chat übersprungen, Nachlieferung), „×“. „Mach du“ bis zur Datei mit Platzhaltern
statt Bildern. Testkurs netzwerk9. Plan: Warnung vor dem Kopieren bei zu wenig Karten, Phasenwarnung, Vorlage
auffüllen. Landingpage: Zurück-Knopf mit erhaltener Einheit, Vorbelegung über ?thema=, Rückfrage bei gesicherter
Einheit. Überall: kein horizontales Scrollen, keine verbotenen Begriffe (auch „Kursdatei“), keine Seitenfehler.

usage: python3 scripts/tests/test_ansicht.py [--browser chromium|webkit|firefox] [--breite 1280,390] [--screenshots DIR]
  --screenshots DIR  zusätzlich ap13.1-muehle-{1,5,bilder,7}-{1280,390}.png
Exit 0 = alles gut. Braucht Playwright mit dem gewählten Browser (oder CHROMIUM_PATH). Ruft vorher web_bundle.py auf.
"""
import argparse
import atexit
import datetime
import functools
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WEB = os.path.join(ROOT, "web")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import mappe as M  # noqa: E402
sys.path.insert(0, HERE)
from fixtures import mappen  # noqa: E402

ZEIT, SEED = 1700000000, 20261024
# AP10/AP11: diese Wörter erscheinen nirgends in der Oberfläche (der Text für den Chat selbst liegt in einem Feld und zählt nicht)
VERBOTEN = [r"\bbauen\b", r"\.mbz\b", r"Steckbrief", r"\bDelta\b", r"\bH5P\b", r"\bPrompt", r"Codeblock", r"\bmebis\b",
            r"Kursdatei", r"Noch kein Inhalt"]   # AP13.1: „Kursdatei“ heißt in der Oberfläche „Einheit“
RE_EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
KOPIERT = "Jetzt in deinen Chat einfügen, die Antwort dann in Schritt 5 einfügen."
fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


class Stiller(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map,
                          **{".wasm": "application/wasm", ".whl": "application/octet-stream"})

    def log_message(self, *a):
        pass


LANDING = """<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Startseite</title></head>
<body><h1>Startseite</h1><a id="los" href="start/">Mahlwerk starten</a></body></html>"""


def server():
    """Wie veröffentlicht: Landingpage (hier ein Platzhalter) unter /, die Mühle unter /start/ (Verweis auf web/)."""
    site = tempfile.mkdtemp(prefix="landing_")      # nicht kursmuehle_*: test_api prüft, dass davon nichts übrig bleibt
    atexit.register(shutil.rmtree, site, True)
    with open(os.path.join(site, "index.html"), "w", encoding="utf-8") as f:
        f.write(LANDING)
    os.symlink(WEB, os.path.join(site, "start"))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Stiller, directory=site))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/start"


HEFT = """Im **rechtwinkligen Dreieck** heißen die beiden Seiten am rechten Winkel **Katheten**. Die längste Seite liegt dem rechten Winkel gegenüber und heißt **Hypotenuse**. Übernimm die Skizze mit den Seiten a, b und c ins Heft und beschrifte den rechten Winkel.
Merke: a² + b² = c². Die Summe der Quadrate über den Katheten ist so groß wie das Quadrat über der Hypotenuse.
Beispiel: Katheten 6 cm und 8 cm
  6² + 8² = 36 + 64 = 100, also ist die Hypotenuse 10 cm lang.
Der Satz gilt nur im rechtwinkligen Dreieck. Prüfe deshalb zuerst, wo der rechte Winkel liegt, und setze dann die Hypotenuse für c ein."""


def zuordnen(zone="Hypotenuse", id_zeile=True):
    return ("### Zuordnen: Kathete oder Hypotenuse? · 7 min\n" + ("id: b3\n" if id_zeile else "") + "zonen: Kathete | Hypotenuse\n"
            f"- liegt am rechten Winkel → Kathete\n- die längste Seite → {zone}\n- liegt dem rechten Winkel gegenüber → Hypotenuse\n"
            "- bildet mit der anderen Kathete den rechten Winkel → Kathete\n")


def chat(kaputt=False, bild=False, zeit=False):
    """Antwort eines Chats auf die Vorlage „Einführung“ (b1 bis b5, b6 ausgeschaltet) mit Vorrede und Codeblock, mit den
    Mindestmaßen aus dem Katalog (AP13.1). `kaputt`: Zuordnen nennt eine Gruppe, die es nicht gibt; `bild`: Einstieg und
    Lesetext nennen je ein Bild mit Bildwunsch und Bildprompt, beide fehlen; `zeit`: Zeit-Annahme im Kopf, Quiz mit
    einer Frage, Einstieg über 100 Wörter."""
    kopf = ""
    if bild:
        kopf += ("Bildwunsch: leiter.png | Leiter lehnt an einer Hauswand, ihr Fuß steht 1 m von der Wand weg\n"
                 "Bildprompt: leiter.png | Schlichte Skizze einer Leiter an einer Hauswand mit Fenster in 3 m Höhe, Abstand am "
                 "Boden als Pfeil, flache Farben, weißer Hintergrund, Querformat 3:2, keine Schrift\n"
                 "Bildwunsch: dreieck.png | Rechtwinkliges Dreieck mit den Seiten a, b und c\n"
                 "Bildprompt: dreieck.png | Rechtwinkliges Dreieck, rechter Winkel als Viertelkreis markiert, Seiten mit a, b "
                 "und c beschriftet, schwarze Linien auf Weiß, quadratisch\n")
    if zeit:
        kopf += "Angenommen: 20 Minuten entfallen auf ein Unterrichtsgespräch außerhalb der Kursbausteine\n"
    einstieg = " ".join(["Die Leiter steht schräg an der Wand."] * 18) if zeit else \
        "Eine Leiter lehnt an der Hauswand, ihr Fuß steht 1 m von der Wand weg. Das Fenster ist 3 m hoch."
    quiz = ("1. MC: Ein Dreieck hat die Katheten 3 cm und 4 cm. Wie lang ist die Hypotenuse?\n- ✔ 5 cm → Richtig.\n"
            "- 7 cm → Du hast addiert, nicht quadriert.\n")
    if not zeit:
        quiz += ("2. RF: In jedem Dreieck gilt a² + b² = c². ✘ → richtig: Nur im rechtwinkligen Dreieck. → falsch: Nur im "
                 "rechtwinkligen Dreieck.\n3. RF: Die Hypotenuse liegt dem rechten Winkel gegenüber. ✔ → richtig: Sie ist die "
                 "längste Seite. → falsch: Sie liegt gegenüber dem rechten Winkel.\n")
    return f"""Hier ist die Einheit:

```markdown
# Drehbuch v1 · Satz des Pythagoras · 45
{kopf}
## Satz des Pythagoras · 45 min
### Textfeld: Die Leiter am Fenster · 6 min
id: b1
Vorspann: {einstieg}
{"Bild: leiter.png | Leiter an der Hauswand" + chr(10) if bild else ""}Kasten: Denk kurz nach
  Reicht eine Leiter mit 3 m Länge bis zum Fenster?
### Seite: Katheten und Hypotenuse · 15 min
id: b2
Überschrift: Die Seiten im rechtwinkligen Dreieck
Die beiden Seiten am rechten Winkel heißen Katheten. Die Seite gegenüber dem rechten Winkel heißt Hypotenuse.
{"Bild: dreieck.png | Rechtwinkliges Dreieck mit den Seiten a, b und c" + chr(10) if bild else ""}Merke: a² + b² = c²
{zuordnen("Dachboden" if kaputt or zeit else "Hypotenuse")}### Quiz: Seiten berechnen · 10 min
id: b4
{quiz}### Seite: Hefteintrag · 6 min
id: b5
{HEFT}
```

Soll ich noch etwas ändern?"""


def chat_zwei():
    """Antwort auf „Alle leeren Bausteine“ der zweiten Einheit (Karten b7 bis b11), mit den Mindestmaßen."""
    drei = lambda a: "".join(f"{i}. {a} {i}? · ✔ja · nein\n" for i in (1, 2, 3))
    return f"""```markdown
# Drehbuch v1 · Pythagoras im Raum · 45

## Pythagoras im Raum · 45 min
### Textfeld: Die Schachtel · 5 min
id: b7
Passt ein Stab mit 13 cm in eine Schachtel mit 12 cm und 5 cm Grundfläche?
### Seite: Raumdiagonale · 15 min
id: b8
Die Diagonale der Grundfläche ist eine Kathete.
### Quiz: Diagonalen · 8 min
id: b9
{drei("Ist die Diagonale länger als die Seite, Fall")}### Quiz: Raum · 8 min
id: b10
{drei("Ist die Raumdiagonale länger als die Flächendiagonale, Fall")}### Seite: Hefteintrag Raum · 5 min
id: b11
{HEFT}
```"""


def warte(page, js, timeout=180000, arg=None):
    try:
        page.wait_for_function(js, arg=arg, timeout=timeout)
    except Exception:
        print("Zeitüberschreitung bei:", js[:200])
        print("Stand:", page.evaluate("[document.body.dataset.schritt, km.zustand.mappe && km.zustand.mappe.bausteine.length, "
                                      "document.getElementById('eingabe-stand').textContent, document.getElementById('kopf-status').textContent]"))
        raise


def stand(page):
    return page.evaluate("""() => km.zustand.mappe.bausteine.map(k => ({id: k.id, typ: k.typ, titel: k.titel, phase: k.phase,
        soll: k.soll, auftrag: k.auftrag, geplant: k.geplant, aus: !!k.aus,
        status: (document.getElementById('karte-' + k.id) || {className: ''}).className.replace(/.*status-(\\w+).*/, '$1')}))""")


def schritte(page):
    """Sichtbare Schritte mit Stand: {1: 'erledigt', 2: 'aktiv', …}"""
    return page.evaluate("""() => Object.fromEntries([...document.querySelectorAll('.schritt')].filter(s => !s.hidden)
        .map(s => [s.dataset.nr, s.dataset.stand + (s.classList.contains('auf') ? '' : ' zu')]))""")


def kein_scrollen(page, breite, wo):
    w = page.evaluate("document.documentElement.scrollWidth")
    breit = page.evaluate("""b => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > b)
        .slice(-3).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && e.className.baseVal === undefined
        ? '.' + String(e.className).split(' ')[0] : '') + ' ' + Math.round(e.getBoundingClientRect().right))""", breite)
    ok(w <= breite, f"{wo}: kein horizontales Scrollen ({w} px bei {breite} px)" + (f", zu breit: {breit}" if w > breite else ""))


def begriffe(page, wo):
    text = page.evaluate("document.body.innerText")
    treffer = [v for v in VERBOTEN if re.search(v, text, re.I)]
    ok(not treffer and not RE_EMOJI.search(text), f"{wo}: keine verbotenen Begriffe, keine Emojis" + (f" ({treffer})" if treffer else ""))


def chat_waehlen(page, wert):
    page.wait_for_selector("#chat-wahl:not([hidden])")
    page.click(f"[data-chat={wert}]")
    warte(page, "document.getElementById('chat-text-feld').value.length > 200 && !document.getElementById('text-kopieren').disabled",
          timeout=60000)


def chat_text(page):
    return page.evaluate("document.getElementById('chat-text-feld').value")


def kopieren(page, infobox):
    page.evaluate("document.getElementById('kopiert').textContent = ''")
    page.click("#text-kopieren")
    if infobox:
        page.check("#infobox-nie")
        page.click("#infobox-ok")
    warte(page, "document.getElementById('kopiert').textContent.length > 0", timeout=10000)


def einfuegen(page, text):
    page.evaluate("document.getElementById('eingabe-stand').textContent = ''")
    page.fill("#eingabe", text)
    warte(page, "(() => { const t = document.getElementById('eingabe-stand').textContent; "
                "return t.startsWith('Übernommen') || t.startsWith('Im Text') || t.includes('id:'); })()")


def aufklappen(page, nr):
    """Erledigten Schritt aufklappen (falls zu)."""
    if not page.evaluate(f"document.querySelector('.schritt[data-nr=\"{nr}\"]').classList.contains('auf')"):
        page.click(f".schritt[data-nr='{nr}'] .s-zeile")


def grosses_bild(tmp):
    """PNG 2400 × 1200 (die Seite verkleinert auf 1600 px lange Kante)."""
    pfad = os.path.join(tmp, "gross.png")
    if not os.path.exists(pfad):
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (2400, 1200), (243, 233, 216))
        ImageDraw.Draw(img).polygon([(400, 1000), (2000, 1000), (400, 200)], outline=(42, 42, 42), width=12)
        img.save(pfad)
    return pfad


def bytes_aus(page, js):
    import base64
    b64 = page.evaluate("async () => { const u = await (" + js + ")(); let s = ''; for (let i = 0; i < u.length; i += 8192) "
                        "s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); }")
    return base64.b64decode(b64)


IDB = """async ([store, key]) => await new Promise(res => { const r = indexedDB.open('kursmuehle');
    r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains(store)) { d.close(); return res(null); }
      const g = d.transaction(store).objectStore(store).get(key);
      g.onsuccess = () => { d.close(); const v = g.result; res(v === undefined ? null : store === 'mappe' ? {titel: v.titel} : v); }; };
    r.onerror = () => res(null); })"""


def idb(page, store, key):
    """Wert aus der IndexedDB der Mühle (Datenbank kursmuehle), auch von der Landingpage aus (gleiche Adresse)."""
    return page.evaluate(IDB, [store, key])


def hinweis(page, nr):
    sel = f".schritt[data-nr='{nr}'] .s-hinweis"
    return page.text_content(sel) if page.locator(sel).count() and page.is_visible(sel) else ""


def lauf(browser, basis, breite, katalog, tmp, name, hinweise):
    wo = f"{name}/{breite}"
    ctx = browser.new_context(viewport={"width": breite, "height": 900}, accept_downloads=True)
    if name == "chromium":
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    page = ctx.new_page()
    seitenfehler = []
    page.on("pageerror", lambda e: seitenfehler.append(str(e)))
    page.goto(f"{basis}/index.html")
    v = katalog["vorlagen"][0]

    # 1 Start: nur Schritt 1 mit drei Feldern und Weiter; Zeile Beta/Testfassung; Muster; Hinweis beim ersten Besuch
    ok(page.is_visible("#f-thema") and page.is_visible("#f-jahrgang") and page.is_visible("#f-minuten") and page.is_visible("#einheit-anlegen")
       and schritte(page) == {"1": "aktiv"} and page.text_content("#einheit-anlegen") == "Weiter", f"{wo}: zu Beginn nur Schritt 1 mit drei Feldern")
    ok(page.is_hidden(".spalte-rand") and page.is_hidden("#karten") and page.is_hidden("#mehr"), f"{wo}: kein Rand, keine Karten, kein „Mehr“")
    warte(page, "!document.getElementById('testfassung').hidden", timeout=20000)
    stufe = "Beta" if "-b" in katalog["version"] else "Testfassung"
    ok(page.text_content("#testfassung") == f"{stufe} {katalog['version']} · Rückmeldung an kursmuehle@pm.me", f"{wo}: Zeile „{stufe} {katalog['version']}“")
    ok("muster-locker.svg" in page.evaluate("getComputedStyle(document.body).backgroundImage")
       and page.evaluate("getComputedStyle(document.body).backgroundSize") == "260px 260px", f"{wo}: Muster (locker, 260 px) als Hintergrund")
    warte(page, "document.querySelector('#start .s-hinweis') !== null", timeout=20000)
    ok(hinweis(page, 1).startswith(hinweise["1"]) and page.is_checked("#hinweise-an"), f"{wo}: Hinweis unter Schritt 1 beim ersten Besuch, Schalter an")
    ok(page.locator(".kopf .kopf-link", has_text="Einheit öffnen").count() == 1 and page.is_hidden("#speichern") and page.is_hidden("#neue-einheit")
       and page.locator(".spalte-rand .kursdatei").count() == 0, f"{wo}: Kopfzeile mit „Einheit öffnen“, kein Block am Rand")
    kein_scrollen(page, breite, f"{wo} Schritt 1")
    begriffe(page, f"{wo} Schritt 1")
    page.fill("#f-thema", "Satz des Pythagoras")
    page.fill("#f-jahrgang", "9")
    page.fill("#f-minuten", "45")
    page.click("#einheit-anlegen")
    page.wait_for_selector("#schritt-2:not([hidden])")
    ok(schritte(page) == {"1": "erledigt zu", "2": "aktiv"} and "Satz des Pythagoras · Jahrgangsstufe 9 · 45 Minuten" in page.text_content("#start .s-fazit"),
       f"{wo}: Schritt 1 klappt zu einer Zeile mit Fazit, Schritt 2 erscheint ({schritte(page)})")
    ok(hinweis(page, 2).startswith(hinweise["2"]) and not hinweis(page, 1), f"{wo}: Hinweis wandert zu Schritt 2")
    ok(page.is_visible("#speichern") and page.text_content("#speichern") == "Einheit speichern" and page.is_visible("#neue-einheit"),
       f"{wo}: „Einheit speichern“ und „Neue Einheit“ in der Kopfzeile")
    page.click("#start .s-zeile")
    ok(page.is_visible("#f-thema") and page.input_value("#f-thema") == "Satz des Pythagoras", f"{wo}: erledigte Zeile klappt auf")
    page.click("#start .s-zeile")
    ok(page.is_hidden("#f-thema"), f"{wo}: und wieder zu")
    ok(page.is_hidden("#steuer-teil") and page.is_visible("#zweig-mach") and page.is_visible("#zweig-steuer"), f"{wo}: Schritt 2 zeigt zwei Kacheln")

    # 2 Ich steuere: Vorlage, Karten, Typ automatisch, +, Zeit je Phase, Phasenwarnung
    page.click("#zweig-steuer")
    page.wait_for_selector("#steuer-teil:not([hidden]) #karten .karte")
    st = stand(page)
    erwartet = sum(len(p["bausteine"]) for p in v["phasen"])
    ok(len(st) == erwartet <= 6 and all(k["geplant"] for k in st) and [k["aus"] for k in st] == [False] * (erwartet - 1) + [True],
       f"{wo}: Vorlage {v['name']} mit {len(st)} Karten (höchstens sechs), Vertiefung ausgeschaltet")
    ok([k["typ"] for k in st] == ["Textfeld", "automatisch", "automatisch", "automatisch", "Seite", "automatisch"],
       f"{wo}: Typ automatisch, fest nur Einstieg und Hefteintrag ({[k['typ'] for k in st]})")
    gruppen = page.evaluate("[...document.querySelectorAll('#karte-b2 select.k-typ optgroup')].map(g => g.label)")
    ok(page.evaluate("document.querySelector('#karte-b2 select.k-typ').value") == "automatisch"
       and gruppen[:4] == [g["name"] for g in katalog["typgruppen"]], f"{wo}: Typ-Auswahl gruppiert nach Rolle ({gruppen})")
    ok(page.locator("#karten .k-plus").count() == erwartet + 1 and page.locator(".k-phase, .k-soll").count() == 0
       and not page.is_checked("#zeit-selbst"), f"{wo}: „+“ zwischen den Karten, ohne Minutenfelder (Zeit je Phase aus)")
    page.click("#karten .k-plus[data-pos='3']")
    warte(page, f"km.zustand.mappe.bausteine.length === {erwartet + 1}", timeout=10000)
    neu = stand(page)[3]
    ok(neu["typ"] == "automatisch" and neu["geplant"], f"{wo}: „+“ fügt an Stelle 4 eine Karte mit Typ automatisch ein ({neu['id']})")
    page.click(f"#karte-{neu['id']} .k-loeschen")
    warte(page, f"km.zustand.mappe.bausteine.length === {erwartet}", timeout=10000)
    # eine der zwei Übungen löschen: die Phase bleibt vertreten, keine Warnung; rückgängig (Warnung: planung_lauf)
    page.click("#karte-b4 .k-loeschen")
    warte(page, f"km.zustand.mappe.bausteine.length === {erwartet - 1}", timeout=10000)
    page.wait_for_timeout(600)
    ok(page.is_hidden("#karten-warnung"), f"{wo}: eine Übung bleibt, keine Warnung")
    page.click("#rueckgaengig-knopf")
    warte(page, f"km.zustand.mappe.bausteine.length === {erwartet}", timeout=10000)
    page.check("#zeit-selbst")
    ok(page.locator(".karte:not(.struktur) .k-soll").count() >= 4 and page.evaluate("km.zustand.mappe.zeit_selbst") is True,
       f"{wo}: Zeit je Phase an: Minutenfelder aus der Vorlage")
    page.uncheck("#zeit-selbst")
    page.fill("#karte-b1 .k-auftrag", "Ein Fall aus dem Alltag")
    ok("von-lehrkraft" in page.get_attribute("#karte-b1 .k-auftrag", "class") and page.get_attribute("#karte-b1 .k-titel", "data-herkunft") == "lehrkraft",
       f"{wo}: Auftrag und geplanter Titel in der Farbe der Lehrkraft")
    begriffe(page, f"{wo} Schritt 2")
    kein_scrollen(page, breite, f"{wo} Schritt 2")
    page.click("#weiter-2")
    page.wait_for_selector("#schritt-3:not([hidden])")
    ok(schritte(page)["2"] == "erledigt zu" and page.is_hidden("#karten"), f"{wo}: nach Weiter klappt die Bausteinliste zu")

    # 3 Aussehen: Kacheln schreiben den Steckbrief; Hinweise ausschalten (IndexedDB)
    warte(page, "km.zustand.geladen && km.zustand.steckbrief_text")
    ok(page.locator("#aus-vorlage .aus-kachel svg").count() == 3 and page.locator("#aus-format .aus-kachel").count() == 2
       and page.locator("#aus-farbe .aus-kachel").count() == 6, f"{wo}: Aussehen: drei Vorlagen, zwei Formate, sechs Farben, mit Miniatur")
    for feld, wert in (("vorlage", "kacheln"), ("format", "kacheln"), ("farbe", "grün")):
        page.click(f".aus-kachel[data-feld={feld}][data-wert='{wert}']")
    warte(page, "km.zustand.steckbrief_text.includes('#15803D') && km.zustand.steckbrief_text.includes('format: kacheln')", timeout=60000)
    sb = api.steckbrief_lesen(page.evaluate("km.zustand.steckbrief_text"))
    ok(sb["kurs"]["design"]["vorlage"] == "kacheln" and sb["kurs"]["format"] == "kacheln" and sb["kurs"]["farbe"] == "#15803D"
       and page.get_attribute(".aus-kachel[data-feld=farbe][data-wert='grün']", "aria-checked") == "true",
       f"{wo}: Aussehen schreibt Vorlage, Format, Farbe ({sb['kurs'].get('design')}, {sb['kurs'].get('format')}, {sb['kurs'].get('farbe')})")
    ok(hinweis(page, 3).startswith(hinweise["3"]), f"{wo}: Hinweis unter Schritt 3")
    page.click(".schritt[data-nr='3'] .hinweis-aus")
    warte(page, "document.querySelector('.s-hinweis') === null", timeout=10000)
    warte(page, "(async () => { const v = await km.einstellung('hinweise'); return v && v.an === false; })()", timeout=10000)
    ok(idb(page, "einstellungen", "hinweise")["an"] is False and page.evaluate("localStorage.length") == 0,
       f"{wo}: Hinweise aus, Zustand in der IndexedDB (Speicher einstellungen), nichts in localStorage")
    kein_scrollen(page, breite, f"{wo} Schritt 3")
    page.click("#weiter-3")
    page.wait_for_selector("#schritt-4:not([hidden])")
    ok("Getönte Flächen · Kacheln · Grün" in page.text_content("#schritt-3 .s-fazit") and not hinweis(page, 4),
       f"{wo}: Fazit Aussehen, kein Hinweis mehr ({page.text_content('#schritt-3 .s-fazit')})")

    # 4 Chat wählen, „Anderer Chat“ führt zu den Kacheln, Text mit Typ frei, kopieren mit Infobox
    ok([b.text_content() for b in page.query_selector_all("#chat-knoepfe [data-chat]")][:4] == ["ByLKI", "AIS-Chat", "fobizz", "MUCGPT"]
       and "Über private Konten entscheidet deine Schule." in page.text_content("#chat-wahl"), f"{wo}: Chat-Auswahl, dienstliche zuerst")
    chat_waehlen(page, "chatgpt")
    ok("Extra High" in page.text_content("#chat-aufwand"), f"{wo}: ChatGPT zeigt den Satz zum Aufwand")
    page.click("#chat-aendern")
    ok(page.is_visible("#chat-knoepfe [data-chat=ais]") and page.is_hidden("#chat-text") and page.is_hidden("#mehr")
       and page.get_attribute("[data-chat=chatgpt]", "aria-pressed") == "true", f"{wo}: „Anderer Chat“ zeigt die Chat-Kacheln, nicht „Mehr einstellen“")
    chat_waehlen(page, "ais")
    t = chat_text(page)
    ids = [k["id"] for k in st if not k["aus"]]
    ok(len(t.encode()) < 12 * 1024 and all(f"id: {i} ·" in t for i in ids) and "id: b6 ·" not in t and "Typ frei" in t
       and "Ein Fall aus dem Alltag" in t and "Verteile die 45 Minuten selbst" in t and "Die Bausteine füllen die 45 Minuten" in t,
       f"{wo}: Text ({len(t.encode())} Bytes): alle eingeschalteten id:, Typ frei, Auftrag, Zeit verteilt das Modell, Zeitregel")
    ok(page.is_hidden("#kopier-warnung"), f"{wo}: vollständige Vorlage: keine Warnung vor dem Kopieren")
    ok(page.is_hidden("#schritt-5") and page.is_hidden("#schritt-7"), f"{wo}: Schritt 5 erst nach dem Kopieren, kein Schritt 7 ohne Antwort")
    kopieren(page, infobox=True)
    ok(page.text_content("#kopiert") == KOPIERT, f"{wo}: kopiert ({page.text_content('#kopiert')})")
    if name == "chromium":
        ok(page.evaluate("navigator.clipboard.readText()") == chat_text(page), f"{wo}: Zwischenablage enthält den Text")
    page.wait_for_selector("#schritt-5:not([hidden])")
    ok(schritte(page) == {"1": "erledigt zu", "2": "erledigt zu", "3": "erledigt zu", "4": "erledigt zu", "5": "aktiv"}
       and page.is_hidden("#karten") and page.is_hidden("#schritt-7"),
       f"{wo}: „Antwort einfügen“ erst, wenn die Bausteinliste zugeklappt ist; Schritt 7 noch nicht da")
    warte(page, "document.getElementById('kz-zahl').textContent === '5'", timeout=20000)
    ok(page.is_visible(".spalte-rand") and page.text_content("#kz-minuten") == "45 Minuten" and page.text_content("#kz-minuten-t") == "Geplant"
       and page.is_hidden("#kz-folge") and page.text_content("#kz-zahl") == "5", f"{wo}: Rand vor der Antwort: 45 Minuten geplant, 5 Bausteine")
    ok(page.locator("#karten-ort-5 .karte").count() == 0, f"{wo}: vor der Antwort keine Karten unter Schritt 5")
    begriffe(page, f"{wo} Schritt 5 leer")

    # 5 Antwort mit Zeit-Annahme, zwei roten Karten und langem Einstieg: Sammelblock unter den Karten
    einfuegen(page, chat(zeit=True))
    st = stand(page)
    rot = [k["id"] for k in st if k["status"] == "fehler"]
    ok(rot == ["b3", "b4"] and st[0]["status"] == "warnung", f"{wo}: Zuordnen und Quiz mit einer Frage rot, langer Einstieg gelb ({rot}, {st[0]['status']})")
    ok("nötig sind mindestens 3" in page.text_content("#karte-b4 .k-diagnosen") and "Der Einstieg hat" in page.text_content("#karte-b1 .k-diagnosen"),
       f"{wo}: Mindestmaß und Einstieg an den Karten")
    kor = page.text_content("#korrektur") if page.is_visible("#korrektur") else ""
    ok("Fülle die 45 Minuten mit Bausteinen; nimm keine Zeit außerhalb des Kurses an." in kor and "(id: b3)" in kor and "(id: b4)" in kor
       and page.evaluate("document.getElementById('korrektur').previousElementSibling.id") == "karten-ort-5",
       f"{wo}: Sammelblock unter der Kartenliste mit Zeit-Satz und beiden ids")
    ok("Der Chat nimmt Zeit außerhalb des Kurses an" in page.text_content("#hinweise") and page.is_hidden("#weiter-5"), f"{wo}: Zeit-Annahme am Rand, kein Weiter")
    # Antwort mit kaputtem Baustein: genau dieser rot, Korrekturschleife an der Karte
    einfuegen(page, chat(kaputt=True))
    st = stand(page)
    rot = [k["id"] for k in st if k["status"] == "fehler"]
    ok(rot == ["b3"] and len([k for k in st if k["status"] == "ok"]) == 4, f"{wo}: kaputter Baustein b3 rot, vier grün ({rot})")
    k1 = st[0]
    ok(k1["auftrag"] == "Ein Fall aus dem Alltag" and k1["phase"] == "Einstieg" and k1["titel"] == "Die Leiter am Fenster",
       f"{wo}: id: ordnet zu, Auftrag und Phase bleiben")
    ok(page.is_visible("#karte-b3 .k-satz") and page.text_content("#karte-b3 .k-satz") == "Korrektur anfordern"
       and page.is_hidden("#korrektur") and page.is_hidden("#weiter-5"), f"{wo}: eine rote Karte: „Korrektur anfordern“, kein Sammelblock, kein Weiter")
    page.click("#karte-b3 .k-satz")
    page.wait_for_selector("#karte-b3 .k-schleife")
    schl = page.text_content("#karte-b3 .k-schleife")
    ok("„Kathete oder Hypotenuse?“ (id: b3)" in schl and "Füge den Satz in deinen Chat ein und kopiere seine Antwort hierher." in schl
       and page.is_visible("#karte-b3 .k-schleife textarea") and page.locator("#karte-b3 .k-schleife input[name=modus]").count() == 0,
       f"{wo}: Schleife unter der Karte: Satz, Zeile, Einfügefeld, keine Moduswahl")
    page.click("#karte-b3 [data-aktion=schleife-kopieren]")
    warte(page, "document.querySelector('#karte-b3 .k-schleife-stand').textContent.startsWith('Kopiert')", timeout=10000)
    kein_scrollen(page, breite, f"{wo} Korrekturschleife")
    page.fill("#karte-b3 .k-schleife textarea", "```markdown\n" + zuordnen("Dachboden", id_zeile=False) + "```")
    warte(page, "document.querySelector('#karte-b3 .k-schleife-stand') && document.querySelector('#karte-b3 .k-schleife-stand').textContent.includes('noch rot')", timeout=30000)
    ok(page.is_visible("#karte-b3 .k-schleife") and "status-fehler" in page.get_attribute("#karte-b3", "class"),
       f"{wo}: Antwort noch falsch: Karte bleibt rot, Schleife bleibt offen")
    page.fill("#karte-b3 .k-schleife textarea", "```markdown\n" + zuordnen(id_zeile=False) + "```")
    warte(page, "document.getElementById('karte-b3').classList.contains('status-ok') && !document.querySelector('.k-schleife')", timeout=30000)
    ok(stand(page)[2]["titel"] == "Kathete oder Hypotenuse?" and page.is_visible("#weiter-5"), f"{wo}: Korrektur eingefügt: Karte grün, Schleife zu, Weiter")
    # Antwort mit zwei Bildern (Bildwunsch und Bildprompt)
    einfuegen(page, chat(bild=True))
    st = stand(page)
    ok([k["id"] for k in st if k["status"] == "warnung"] == ["b1", "b2"] and not [k for k in st if k["status"] == "fehler"],
       f"{wo}: fehlende Bilder = Hinweis auf Karte b1 und b2, keine Fehler")
    ok([k["typ"] for k in st[:5]] == ["Textfeld", "Seite", "Zuordnen", "Quiz", "Seite"] and st[5]["aus"] and st[5]["geplant"],
       f"{wo}: Karten tragen den Typ, den der Chat gewählt hat; Vertiefung bleibt aus")
    ok(page.locator("#karten-ort-5 .karte").count() == 6 and page.text_content("#weiter-5") == "Weiter zu den Bildern",
       f"{wo}: Karten unter Schritt 5, Weiter zu den Bildern")
    ok(page.get_attribute("#karte-b2 .k-titel", "data-herkunft") == "chat" and "von-chat" in page.get_attribute("#karte-b2 .k-text", "class")
       and page.is_visible("#legende"), f"{wo}: Titel und Inhalt vom Chat in der Farbe des Chats, Legende am Rand")
    ok(page.evaluate("document.querySelector('#kz-minuten .geschaetzt') !== null")
       and page.evaluate("getComputedStyle(document.querySelector('#kz-minuten .geschaetzt')).fontStyle") == "italic"
       and " von 45 geplant" in page.text_content("#kz-minuten"), f"{wo}: Ist-Minuten kursiv, geplante aufrecht ({page.text_content('#kz-minuten')})")
    # „Anderer Chat“ aus Schritt 5: zurück zu den Kacheln, der Text bleibt bis zur Wahl
    aufklappen(page, 4)
    text_vorher = chat_text(page)
    page.click("#chat-aendern")
    ok(page.is_visible("#chat-knoepfe [data-chat=bylki]") and page.is_hidden("#chat-text") and chat_text(page) == text_vorher,
       f"{wo}: „Anderer Chat“ nach dem Kopieren: Kacheln, Text bleibt")
    page.click("[data-chat=ais]")
    page.click("#schritt-4 .s-zeile")
    # Zweigwechsel: „Mach du“ zeigt dieselbe Kursdatei als Liste, zurück zu „Ich steuere“
    md = page.evaluate("km.zustand.kurs_md")
    page.click("#schritt-2 .s-zeile")
    page.click("#zweig-mach")
    warte(page, "document.getElementById('karten').classList.contains('kompakt')", timeout=10000)
    ok(page.evaluate("km.zustand.kurs_md") == md and page.locator("#karten .k-auftrag").count() == 0
       and page.locator("#karte-b6").count() == 0 and page.locator("#karten .karte").count() == 5, f"{wo}: Zweig „Mach du“: dieselbe Kursdatei als Liste")
    page.click("#karte-b2 .k-typ-mach")
    warte(page, "km.zustand.mappe.zweig === 'steuer' && !document.getElementById('karten').classList.contains('kompakt')", timeout=10000)
    ok(page.evaluate("km.zustand.kurs_md") == md and page.input_value("#karte-b1 .k-auftrag") == "Ein Fall aus dem Alltag",
       f"{wo}: Klick auf den Typ wechselt nach „Ich steuere“, Aufträge sind noch da")
    # Bild an der Karte hochladen
    page.set_input_files("#karte-b2 input.k-bild[data-datei='dreieck.png']", grosses_bild(tmp))
    warte(page, "!!km.zustand.assets['dreieck.png'] && document.getElementById('karte-b2').classList.contains('status-ok')", timeout=30000)
    masse = page.evaluate("""() => { const u = km.zustand.assets['dreieck.png'], v = new DataView(u.buffer, u.byteOffset);
        return [v.getUint32(16), v.getUint32(20)]; }""")
    ok(masse == [1600, 800] and "Bild fehlt in Baustein 2" not in page.text_content("#hinweise"), f"{wo}: Bild verkleinert auf {masse}, Warnung weg")
    # Umbenennen: Titel von der Lehrkraft
    page.fill("#karte-b4 .k-titel", "Seiten im Dreieck berechnen")
    page.press("#karte-b4 .k-titel", "Enter")
    warte(page, "km.zustand.kurs_md.includes('### Quiz: Seiten im Dreieck berechnen')", timeout=30000)
    warte(page, "document.querySelector('#karte-b4 .k-titel').value === 'Seiten im Dreieck berechnen'", timeout=30000)
    # die Herkunft kommt mit dem nächsten Zeichnen (Firefox: Wettlauf mit der Auswertung)
    warte(page, "document.querySelector('#karte-b4 .k-titel').dataset.herkunft === 'lehrkraft'", timeout=30000)
    ok(page.get_attribute("#karte-b4 .k-titel", "data-herkunft") == "lehrkraft", f"{wo}: umbenannter Titel in der Farbe der Lehrkraft")
    # Baustein neu beauftragen: geführte Schleife an der Karte (Text nur für diesen Baustein, Antwort nur hier)
    page.click("#karte-b5 .k-neu")
    page.wait_for_selector("#karte-b5 .k-schleife")
    warte(page, "!document.querySelector('#karte-b5 [data-aktion=schleife-kopieren]').disabled", timeout=30000)
    page.click("#karte-b5 [data-aktion=schleife-kopieren]")
    warte(page, "(document.getElementById('schleife-feld') || {}).value", timeout=10000)
    tb = page.evaluate("document.getElementById('schleife-feld').value")
    ok(len(tb.encode()) < 3000 and "id: b5" in tb and "Hefteintrag mindestens 80 Wörter" in tb, f"{wo}: Text nur Baustein ({len(tb.encode())} Bytes) mit Mindestmaß")
    page.fill("#karte-b5 .k-schleife textarea", "```markdown\n### Seite: Hefteintrag Pythagoras · 6 min\n" + HEFT + "\n```")
    warte(page, "!document.querySelector('.k-schleife') && km.zustand.mappe.bausteine[4].titel === 'Hefteintrag Pythagoras'", timeout=30000)
    st = stand(page)
    ok(st[4]["titel"] == "Hefteintrag Pythagoras" and st[3]["titel"] == "Seiten im Dreieck berechnen" and st[4]["status"] == "ok",
       f"{wo}: neu beauftragt: nur Baustein b5 ersetzt, Schleife zu")
    einfuegen(page, "### Quiz: Irgendwas · 2 min\nid: x99\n1. A? · ✔a · b\n")
    ok("die es in dieser Einheit nicht gibt" in page.text_content("#eingabe-stand"), f"{wo}: unbekannte id: Fehlermeldung")
    begriffe(page, f"{wo} Schritt 5")
    kein_scrollen(page, breite, f"{wo} Schritt 5")

    # Bilder: Schritt erscheint mit Bildwünschen, beide Texte mit Kopierknopf, Upload und Platzhalter
    page.click("#weiter-5")
    page.wait_for_selector("#schritt-bilder[data-stand=aktiv]")
    zeilen_b = page.locator("#bilder-liste .bild-zeile")
    ok(zeilen_b.count() == 2 and page.text_content("#schritt-bilder .s-nr") == "6" and page.text_content("#schritt-6 .s-nr") == "7"
       and page.text_content("#schritt-7 .s-nr") == "8", f"{wo}: Schritt Bilder als 6 mit zwei Zeilen, danach 7 und 8")
    z1 = page.text_content("#bilder-liste .bild-zeile[data-datei='leiter.png']")
    z2 = page.text_content("#bilder-liste .bild-zeile[data-datei='dreieck.png']")
    ok("zu Baustein 1" in z1 and "fehlt" in z1 and "Leiter lehnt an einer Hauswand" in z1 and "Querformat 3:2" in z1 and "da" in z2,
       f"{wo}: Zeile je Bild mit Baustein, Status, Satz und Auftrag")
    ok(page.locator("#bilder-liste .bild-zeile[data-datei='leiter.png'] .bild-kopieren").count() == 2
       and page.locator("#bilder-liste .bild-ablage").count() == 2 and page.text_content("#weiter-bilder") == "Ohne Bild weiter",
       f"{wo}: je Bild zwei Kopierknöpfe, Ablagefläche, „Ohne Bild weiter“")
    page.click("#bilder-liste .bild-zeile[data-datei='leiter.png'] .bild-kopieren[data-art=prompt]")
    warte(page, "document.getElementById('bild-feld').value.includes('Querformat 3:2')", timeout=10000)
    kein_scrollen(page, breite, f"{wo} Schritt Bilder")
    begriffe(page, f"{wo} Schritt Bilder")
    page.set_input_files("#bilder-liste input.bild-datei[data-datei='leiter.png']", grosses_bild(tmp))
    warte(page, "!!km.zustand.assets['leiter.png'] && document.querySelector(\".bild-zeile[data-datei='leiter.png']\").classList.contains('da')", timeout=30000)
    ok(page.text_content("#weiter-bilder") == "Weiter" and "status-ok" in page.get_attribute("#karte-b1", "class"),
       f"{wo}: Bild im Schritt hochgeladen: Status da, Karte grün, „Weiter“")

    # 6 Fragen und Lösungen, Gegenprüfen
    page.click("#weiter-bilder")
    page.wait_for_selector("#schritt-6:not([hidden])")
    ok(page.locator("#fragen-liste .frage").count() == page.evaluate("km.zustand.fragen.length") > 0 and schritte(page)["5"] == "erledigt zu"
       and "alle 2 Bilder da" in page.text_content("#schritt-bilder .s-fazit"),
       f"{wo}: Schritt 6 mit {page.locator('#fragen-liste .frage').count()} Fragen, Bilder als erledigte Zeile")
    page.click("#gegenpruefen summary")
    fr = page.evaluate("km.zustand.fragen")
    zeilen = []
    for f in fr:
        if f["art"] == "auswahl":
            zeilen.append(f"{f['nr']}: " + ", ".join("ABCDEFGH"[f["optionen"].index(lo[0])] for lo in f["loesung"]))
        else:
            zeilen.append(f"{f['nr']}: " + "; ".join(lo[0] for lo in f["loesung"]))
    ziel = next(f for f in fr if f["art"] == "auswahl")
    falsch = [z if not z.startswith(f"{ziel['nr']}:") else f"{ziel['nr']}: " + ("B" if z.endswith("A") else "A") for z in zeilen]
    page.fill("#gegen-antwort", "\n".join(falsch))
    warte(page, "document.getElementById('gegen-stand').textContent.length > 0", timeout=20000)
    ok(page.locator("#gegen-ergebnis li").count() == 1 and "✔" not in page.evaluate("document.getElementById('gegen-text-feld').value"),
       f"{wo}: Gegenprüfen findet die abweichende Lösung")
    page.click("#durchsicht-ok")
    page.wait_for_selector("#schritt-7:not([hidden])")

    # 7 EIN Ergebnis-Knopf: baut und lädt herunter; Wiederherstellen, Rückmeldung
    page.evaluate(f"km.bauOptionen = {{zeit: {ZEIT}, seed: {SEED}}}")
    ok(page.is_hidden("#wiederherstellen") and page.locator("#schritt-7 button.knopf:visible").count() == 1
       and page.text_content("#herunterladen") == "Datei für die Lernplattform herunterladen" and page.is_enabled("#herunterladen"),
       f"{wo}: Schritt 7 mit genau einem Knopf „Datei für die Lernplattform herunterladen“")
    ocker = page.evaluate("""() => [...document.querySelectorAll('.knopf')].filter(b => b.offsetParent
        && getComputedStyle(b).backgroundColor === 'rgb(217, 164, 65)').map(b => b.id)""")
    ok(ocker == ["herunterladen"], f"{wo}: nur der Ergebnis-Knopf ist Ocker ({ocker})")
    with page.expect_download(timeout=90000) as dl:
        page.click("#herunterladen")
    heute = datetime.date.today().isoformat()
    ok(dl.value.suggested_filename == f"satz-des-pythagoras_{heute}.mbz", f"{wo}: ein Klick baut und lädt herunter: {dl.value.suggested_filename}")
    pfad_mbz = os.path.join(tmp, f"{name}{breite}.mbz")
    dl.value.save_as(pfad_mbz)
    page.wait_for_selector("#wiederherstellen:not([hidden])")
    wh = page.text_content("#wh-schritte")
    ok(page.locator("#wh-schritte li").count() == 5 and "Als neuen Kurs wiederherstellen" in wh
       and "Mehr → Kurs wiederherstellen" in wh and "Kurseinstellungen überschreiben" in wh and "heruntergeladen" in page.text_content("#erstellen-stand"),
       f"{wo}: fünf Schritte zum Wiederherstellen, neuer Kurs")
    ok(page.is_visible("#rueckmeldung"), f"{wo}: Rückmeldung nach der Datei")
    rm = page.input_value("#rm-text")
    ok(f"Kursmühle {katalog['version']}" in rm and "Chat: AIS-Chat" in rm and "Jahrgangsstufe: 9" in rm and "Vorlage: Einführung" in rm
       and "Wo hat es gestockt?" in rm and "Was hättest du anders gewollt?" in rm and "Nutzt du es nächste Woche wieder?" in rm,
       f"{wo}: Rückmeldungstext mit Version, Chat, Jahrgangsstufe, Vorlage und drei Fragen")
    ok(not any(w in rm for w in ("Pythagoras", "Leiter", "Hypotenuse", "Hefteintrag", "Fall aus dem Alltag")),
       f"{wo}: Rückmeldungstext ohne Inhalte der Einheit")
    page.click("#rm-adresse-kopieren")
    warte(page, "document.getElementById('rm-stand').textContent.length > 0", timeout=10000)
    ok(page.text_content("#rm-stand") == "Adresse kopiert.", f"{wo}: Adresse zum Kopieren")
    with page.expect_download() as dl:
        page.click("#speichern")
    pfad_mappe = os.path.join(tmp, f"{name}{breite}.kursmappe.zip")
    dl.value.save_as(pfad_mappe)
    ok("Einheit gespeichert um" in page.text_content(".kopf #autosave-stand"), f"{wo}: Stand der Sicherung in der Kopfzeile")
    with open(pfad_mappe, "rb") as f:
        gelesen = M.lesen(f.read())
    with open(pfad_mbz, "rb") as f:
        mbz = f.read()
    cp, _ = api.baue(gelesen["kurs_md"], gelesen["steckbrief_text"], gelesen["assets"], zeit=ZEIT, seed=SEED)
    ok(mbz and cp == mbz, f"{wo}: Datei byteidentisch zum CPython-Bau der Kursdatei ({len(mbz)} Bytes)")
    gm = gelesen["mappe"]
    ok(gm["einheit"]["thema"] == "Satz des Pythagoras" and gm["bausteine"][0]["auftrag"] == "Ein Fall aus dem Alltag" and gm.get("zweig") == "steuer"
       and gm.get("schritt") == 7 and gm.get("zeit_selbst") is False and gm["bausteine"][3].get("herkunft") == {"titel": "lehrkraft"}
       and gm["bausteine"][5].get("aus") and {"dreieck.png", "leiter.png"} <= set(gelesen["assets"]) and gm.get("chat") == "ais",
       f"{wo}: Kursdatei trägt Schritt, Zweig, Zeit-Schalter, Herkunft, ausgeschaltete Karte, Bilder")
    ok("Bildprompt: leiter.png" in gelesen["kurs_md"], f"{wo}: Bildprompt bleibt in der Kursdatei (Kopf)")
    begriffe(page, f"{wo} Schritt 7")
    kein_scrollen(page, breite, f"{wo} Schritt 7")
    vorher = stand(page)
    warte(page, "document.getElementById('autosave-stand').textContent.includes('gesichert')", timeout=20000)

    # Neu laden: „Weiter mit …“ stellt Stand und Schritt wieder her; Infobox und Hinweise kommen nicht wieder
    page.wait_for_timeout(1200)
    page.reload()
    page.wait_for_selector("#weiter:not([hidden])", timeout=20000)
    page.wait_for_timeout(500)
    ok("Satz des Pythagoras" in page.text_content("#weiter-knopf") and page.is_visible("#weiter-weg") and not hinweis(page, 1)
       and not page.is_checked("#hinweise-an"), f"{wo}: „Weiter mit …“ und „×“ nach dem Neuladen, Hinweise bleiben aus")
    page.click("#weiter-knopf")
    warte(page, "document.body.dataset.bildschirm === 'ansicht' && km.zustand.kennzahlen && document.body.dataset.schritt === '7'")
    ok(stand(page) == vorher, f"{wo}: Autosave stellt den Stand wieder her, Schritt 7")
    aufklappen(page, 4)
    warte(page, "!document.getElementById('text-kopieren').disabled", timeout=30000)
    kopieren(page, infobox=False)
    ok(page.is_hidden("#infobox"), f"{wo}: Infobox nach „nicht mehr anzeigen“ nicht wieder")

    # Einheit öffnen liefert denselben Stand
    page.click("#neue-einheit")
    page.wait_for_selector("#start[data-stand=aktiv]")
    page.set_input_files("#datei-oeffnen", pfad_mappe)
    warte(page, "document.body.dataset.bildschirm === 'ansicht' && km.zustand.kennzahlen && document.body.dataset.schritt === '7'")
    ok(stand(page) == vorher, f"{wo}: Einheit öffnen liefert denselben Stand")

    # Nächste Einheit anhängen: Aussehen und Chat übersprungen, Teil e2, Nachlieferung, Zusammenführen
    with page.expect_download(timeout=90000):
        page.click("#herunterladen")
    page.wait_for_selector("#importiert-ja:visible", timeout=60000)
    page.click("#importiert-ja")
    ok(page.evaluate("km.zustand.mappe.importiert") == ["e1"] and page.is_visible("#importiert-stand"), f"{wo}: „Importiert?“ vermerkt Einheit 1")
    page.click("#naechste-einheit")
    page.wait_for_selector("#start[data-stand=aktiv]")
    ok(page.input_value("#f-thema") == "" and page.input_value("#f-jahrgang") == "9" and "nächsten Einheit" in page.text_content("#s1-titel"),
       f"{wo}: nächste Einheit beginnt bei Schritt 1, Jahrgangsstufe bleibt")
    page.fill("#f-thema", "Pythagoras im Raum")
    page.click("#einheit-anlegen")
    page.wait_for_selector("#schritt-2[data-stand=aktiv]")
    warte(page, "km.zustand.mappe.bausteine.length === 12", timeout=20000)
    page.click("#weiter-2")
    page.wait_for_selector("#schritt-4[data-stand=aktiv]")
    ok(schritte(page).get("3") == "erledigt zu" and page.is_visible("#chat-text") and page.is_hidden("#chat-wahl"),
       f"{wo}: nächste Einheit: Aussehen und Chat vorbelegt, Schritt 3 als erledigte Zeile, Text direkt da")
    warte(page, "document.getElementById('chat-text-feld').value.includes('id: b7 ·')", timeout=30000)
    t2 = "\n".join(page.evaluate("km.zustand.texte.teile"))       # über 12 KB in Teilen (AP13.1: Typen zum Ergänzen)
    ok(all(f"id: b{i} ·" in t2 for i in (7, 8, 9, 10, 11)) and "id: b2 ·" not in t2 and "gibt es schon" in t2,
       f"{wo}: Text nur für die neue Einheit (alle leeren Bausteine, {page.evaluate('km.zustand.texte.teile.length')} Teile)")
    kopieren(page, infobox=False)
    page.wait_for_selector("#schritt-5[data-stand=aktiv]")
    einfuegen(page, chat_zwei())
    ok("als weitere Einheit angehängt" in page.text_content("#eingabe-stand") and "teil: e2" in page.evaluate("km.zustand.kurs_md")
       and page.evaluate("km.zustand.pruefung.abschnitte.length") == 2 and page.evaluate("km.zustand.pruefung.ok"),
       f"{wo}: zweite Einheit als eigener Abschnitt mit teil: e2, ohne Fehler")
    page.click("#weiter-5")
    page.wait_for_selector("#schritt-bilder[data-stand=aktiv]")
    page.click("#weiter-bilder")
    page.click("#ohne-durchsicht")
    with page.expect_download(timeout=90000) as dl:
        page.click("#herunterladen")
    ok(dl.value.suggested_filename.endswith("_nachlieferung.mbz") and "Zusammenführen" in page.text_content("#wh-schritte")
       and "nur die neue Einheit" in page.text_content("#erstellen-stand"), f"{wo}: Nachlieferung ({dl.value.suggested_filename}), Ziel Zusammenführen")
    pfad_n = os.path.join(tmp, f"{name}{breite}_n.mbz")
    dl.value.save_as(pfad_n)
    from check import check_mbz
    err, info, _ = check_mbz(pfad_n)
    ok(not err, f"{wo}: Nachlieferung besteht check.py ({info})")

    # „×“: offene Einheit schließen, gesicherte Einheit verwerfen
    page.click("#schliessen")
    ok(page.is_visible("#verwerfen-frage") and "Pythagoras im Raum" in page.text_content("#verwerfen-text"), f"{wo}: „×“ fragt vor dem Schließen")
    page.click("#verwerfen-nein")
    ok(page.is_hidden("#verwerfen-frage") and page.evaluate("!!km.zustand.mappe"), f"{wo}: Nein lässt die Einheit offen")
    page.click("#neue-einheit")
    page.wait_for_selector("#weiter:not([hidden])", timeout=20000)
    page.click("#weiter-weg")
    ok("verwerfen?" in page.text_content("#verwerfen-text") and "nur in diesem Browser gesichert" in page.text_content("#verwerfen-text"),
       f"{wo}: „×“ neben „Weiter mit“ fragt nach ({page.text_content('#verwerfen-text')})")
    page.click("#verwerfen-ja")
    page.wait_for_selector("#weiter", state="hidden")
    ok(page.evaluate("km.autosaveLesen()") is None, f"{wo}: gesicherte Einheit verworfen")

    # Zweig „Mach du“ bis zur Datei, ohne „Mehr einstellen“; Bilder fehlen: Platzhalter
    page.fill("#f-thema", "Satz des Pythagoras")
    page.fill("#f-jahrgang", "9")
    page.click("#einheit-anlegen")
    page.click("#zweig-mach")
    page.wait_for_selector("#schritt-3[data-stand=aktiv]")
    ok(page.is_hidden("#karten") and page.is_hidden("#mehr"), f"{wo}: Mach du: keine Karten, kein „Mehr“ vor der Antwort")
    page.click("#weiter-3")
    chat_waehlen(page, "fobizz")
    ok(page.is_hidden("#text-art"), f"{wo}: Mach du: keine Auswahl der Textart")
    kopieren(page, infobox=False)
    page.wait_for_selector("#schritt-5[data-stand=aktiv]")
    ok(page.is_hidden("#modus"), f"{wo}: Mach du: keine Auswahl des Einsetzens")
    einfuegen(page, chat(bild=True))
    ok(page.locator("#karten.kompakt .karte").count() == 5 and page.locator("#karten .k-auftrag").count() == 0
       and page.locator("#karten .k-aktionen").count() == 0, f"{wo}: Mach du: Karten nach der Antwort als Liste mit Punkten")
    page.click("#weiter-5")
    page.wait_for_selector("#schritt-bilder[data-stand=aktiv]")
    ok("2 Bilder fehlen" in page.text_content("#bilder-stand"), f"{wo}: Platzhalter angekündigt ({page.text_content('#bilder-stand')})")
    page.click("#weiter-bilder")
    page.click("#durchsicht-ok")
    with page.expect_download(timeout=90000) as dl:
        page.click("#herunterladen")
    pfad_p = os.path.join(tmp, f"{name}{breite}_platzhalter.mbz")
    dl.value.save_as(pfad_p)
    err, info, _ = check_mbz(pfad_p)
    ok(page.is_visible("#wiederherstellen") and not page.evaluate("document.getElementById('mehr').open") and not err
       and "0 von 2 Bildern da" in page.text_content("#schritt-bilder .s-fazit"),
       f"{wo}: Mach du bis zur Datei, ohne Bild weiter mit Platzhalter ({info})")
    kein_scrollen(page, breite, f"{wo} Mach du")

    # Testkurs netzwerk9 als Kursdatei öffnen: Zahlen am Rand, Strukturbausteine, bearbeiten
    page.click("#neue-einheit")
    page.wait_for_selector("#start[data-stand=aktiv]")
    page.set_input_files("#datei-oeffnen", mappen.zip_datei("netzwerk9", tmp))
    warte(page, "document.body.dataset.bildschirm === 'ansicht' && km.zustand.kennzahlen && km.zustand.mappe.bausteine.length === 10")
    st = stand(page)
    ok(len(st) == 10 and all(k["status"] == "ok" for k in st) and page.evaluate("document.body.dataset.schritt") == "6"
       and page.evaluate("km.zustand.mappe.zweig") == "steuer", f"{wo}: Testkurs: 10 grüne Karten, Ich steuere, Schritt 6 (Fragen)")
    kz = page.evaluate("km.zustand.kennzahlen.minuten")
    ok(page.text_content("#kz-minuten") == f"{kz['ist']} von 25 geplant" and "Lesen → Üben → Sichern" in page.text_content("#kz-folge"),
       f"{wo}: Zahlen am Rand ({page.text_content('#kz-minuten')}, {page.text_content('#kz-folge')})")
    ok("Baustein 8: Üben für 2 Minuten statt 4" in page.evaluate("km.zustand.kennzahlen.hinweise.map(h => h.text).join('|')"),
       f"{wo}: Lücke der Minuten als Hinweis am Rand")
    aufklappen(page, 5)
    ok(page.locator("#karte-banner .k-phase, #karte-banner .k-soll, #karte-ueberblick .k-soll").count() == 0
       and page.locator("#karte-weg .k-soll").count() == 1, f"{wo}: Kursdatei vor b1: Zeit selbst eingestellt, Kursbanner und Überblick ohne Minuten")
    ok(page.evaluate("getComputedStyle(document.querySelector('.karten')).backgroundColor") == "rgb(255, 255, 255)", f"{wo}: Karten opak über dem Muster")
    page.click("#karte-weg .k-runter")
    warte(page, "km.zustand.mappe.bausteine[4].id === 'weg'", timeout=30000)
    st = stand(page)
    ok([k["id"] for k in st][3:5] == ["wer-bin-ich", "weg"] and st[4]["phase"] == "Lesen", f"{wo}: Baustein nach unten verschoben, Phase bleibt")
    page.click("#karte-fall-huber .k-loeschen")
    warte(page, "km.zustand.mappe.bausteine.length === 9", timeout=30000)
    page.wait_for_selector("#rueckgaengig:not([hidden])", timeout=30000)
    page.click("#rueckgaengig-knopf")
    page.wait_for_selector("#rueckgaengig", state="hidden", timeout=30000)
    warte(page, "km.zustand.mappe.bausteine.length === 10", timeout=30000)
    ok("id: fall-huber" in page.evaluate("km.zustand.kurs_md"), f"{wo}: löschen und rückgängig")
    page.fill("#karte-raeume .k-titel", "Welches Gerät in welchen Raum?")
    page.press("#karte-raeume .k-titel", "Enter")
    warte(page, "km.zustand.kurs_md.includes('### Zuordnen: Welches Gerät in welchen Raum?')", timeout=30000)
    r = next(k for k in stand(page) if k["id"] == "raeume")
    ok(r["auftrag"].startswith("Die Wohnung") and r["phase"] == "Üben", f"{wo}: Umbenennen behält Auftrag und Phase")
    begriffe(page, f"{wo} Testkurs")
    kein_scrollen(page, breite, f"{wo} Testkurs")
    ok(not seitenfehler, f"{wo}: keine Seitenfehler" + (f" ({seitenfehler[:2]})" if seitenfehler else ""))
    ctx.close()


def planung_lauf(browser, basis, breite, name):
    """Warnung vor dem Kopieren bei zu wenig Karten (Bylki-Lauf „Das Auge“: Erarbeitung und Übung gelöscht), Vorlage
    auffüllen setzt die fehlenden Phasen mit Typ automatisch ein."""
    wo = f"{name}/{breite} Plan"
    ctx = browser.new_context(viewport={"width": breite, "height": 900})
    page = ctx.new_page()
    page.goto(f"{basis}/index.html")
    page.fill("#f-thema", "Das Auge")
    page.fill("#f-jahrgang", "5")
    page.click("#einheit-anlegen")
    page.click("#zweig-steuer")
    warte(page, "km.zustand.geladen && km.zustand.kennzahlen && km.zustand.steckbrief_text")
    for i in ("b2", "b3", "b4"):
        page.click(f"#karte-{i} .k-loeschen")
        warte(page, f"!document.getElementById('karte-{i}')", timeout=20000)
    warte(page, "!document.getElementById('karten-warnung').hidden", timeout=20000)
    ok("Keine Erarbeitung mehr." in page.text_content("#karten-warnung") and "Keine Übung mehr." in page.text_content("#karten-warnung"),
       f"{wo}: Phasen ohne Karte an der Liste gewarnt ({page.text_content('#karten-warnung')})")
    page.click("#weiter-2")
    page.click("#weiter-3")
    chat_waehlen(page, "bylki")
    page.wait_for_selector("#kopier-warnung:not([hidden])", timeout=20000)
    wt = page.text_content("#kopier-warnung-text")
    ok(wt.startswith("2 Karten für 45 Minuten, Bausteine ergänzen?") and "Keine Übung mehr." in wt and page.is_enabled("#text-kopieren"),
       f"{wo}: Warnung vor dem Kopieren ({wt}), Kopieren bleibt möglich")
    kein_scrollen(page, breite, wo)
    page.click("#auffuellen")
    warte(page, "document.getElementById('kopier-warnung').hidden", timeout=20000)
    st = stand(page)
    an = [k for k in st if not k["aus"]]
    ok([k["phase"] for k in an] == ["Einstieg", "Erarbeitung", "Übung", "Übung", "Sicherung"] and [k["typ"] for k in an][1:4] == ["automatisch"] * 3,
       f"{wo}: Vorlage auffüllen: Phasen in Folge mit Typ automatisch ({[k['phase'] for k in an]})")
    warte(page, "document.getElementById('chat-text-feld').value.includes('Lesetext mit Fragen')", timeout=30000)
    ok(all(f"id: {k['id']} ·" in chat_text(page) for k in an), f"{wo}: Text nennt die neuen Karten")
    ctx.close()


def landing_lauf(browser, basis, breite, name):
    """Zurück zur Landingpage mit erhaltener Einheit; Vorbelegung über ?thema=…&jahrgang=…&minuten=…; Rückfrage, wenn
    schon eine Einheit gesichert ist."""
    wo = f"{name}/{breite} Landingpage"
    wurzel = basis.rsplit("/start", 1)[0] + "/"
    ctx = browser.new_context(viewport={"width": breite, "height": 900})
    page = ctx.new_page()
    page.goto(wurzel)
    page.click("#los")
    page.wait_for_selector("#f-thema")
    ok(page.get_attribute(".marke", "href") == "../" and page.evaluate("new URL(document.querySelector('.marke').href).pathname") == "/",
       f"{wo}: Logo und Wortmarke führen zur Landingpage")
    page.fill("#f-thema", "Licht und Schatten")
    page.click("#einheit-anlegen")
    page.wait_for_selector("#schritt-2[data-stand=aktiv]")
    warte(page, "document.getElementById('autosave-stand').textContent.includes('gesichert')", timeout=60000)
    page.go_back()
    page.wait_for_selector("#los")
    ok(page.url == wurzel and idb(page, "mappe", "aktuell") == {"titel": "Licht und Schatten"},
       f"{wo}: Zurück-Knopf führt zur Landingpage, die Einheit bleibt gesichert ({page.url})")
    page.go_forward()
    page.wait_for_selector("#weiter:not([hidden])", timeout=20000)
    ok("Licht und Schatten" in page.text_content("#weiter-knopf"), f"{wo}: wieder vorwärts: „Weiter mit …“")
    # Vorbelegung mit gesicherter Einheit: Rückfrage; Nein lässt sie stehen
    page.goto(wurzel)
    page.goto(f"{basis}/?thema=Optik&jahrgang=7&minuten=90")
    page.wait_for_selector("#verwerfen-frage:not([hidden])", timeout=30000)
    ok("„Licht und Schatten“ verwerfen?" in page.text_content("#verwerfen-text") and page.evaluate("location.search") == ""
       and page.input_value("#f-thema") == "Optik", f"{wo}: ?thema= mit gesicherter Einheit fragt zuerst, Parameter aus der Adresse entfernt")
    page.click("#verwerfen-nein")
    ok(page.evaluate("km.zustand.mappe") is None and idb(page, "mappe", "aktuell") == {"titel": "Licht und Schatten"},
       f"{wo}: Nein: keine neue Einheit, die gesicherte bleibt")
    page.goto(wurzel)
    page.goto(f"{basis}/?thema=Optik&jahrgang=7&minuten=90")
    page.wait_for_selector("#verwerfen-frage:not([hidden])", timeout=30000)
    page.click("#verwerfen-ja")
    page.wait_for_selector("#schritt-2[data-stand=aktiv]", timeout=30000)
    ok("Optik · Jahrgangsstufe 7 · 90 Minuten" in page.text_content("#start .s-fazit"), f"{wo}: Ja: Einheit aus den Parametern angelegt")
    page.go_back()
    page.wait_for_selector("#los")
    ok(page.url == wurzel, f"{wo}: Zurück führt nach der Vorbelegung zur Landingpage ({page.url})")
    # ohne gesicherte Einheit: sofort angelegt, Minuten ohne Angabe 45
    ctx.close()
    ctx = browser.new_context(viewport={"width": breite, "height": 900})
    page = ctx.new_page()
    page.goto(f"{basis}/index.html?thema=Hebelgesetz&jahrgang=8")
    page.wait_for_selector("#schritt-2[data-stand=aktiv]", timeout=30000)
    ok("Hebelgesetz · Jahrgangsstufe 8 · 45 Minuten" in page.text_content("#start .s-fazit") and page.evaluate("location.search") == "",
       f"{wo}: ohne gesicherte Einheit legt ?thema= die Einheit sofort an, Minuten 45")
    kein_scrollen(page, breite, wo)
    ctx.close()


def bis_schritt5(page, basis, antwort=None, zweig="steuer"):
    """Einheit Pythagoras (Einführung, Mathematik 9 Mittelschule) wie eine Lehrkraft anlegen, Text kopieren und
    (mit `antwort`, Text) die Antwort des Chats einfügen."""
    page.goto(f"{basis}/index.html")
    page.fill("#f-thema", "Satz des Pythagoras")
    page.fill("#f-jahrgang", "9")
    page.click("#einheit-anlegen")
    page.click("#zweig-steuer")
    warte(page, "km.zustand.geladen && km.zustand.kennzahlen && km.zustand.steckbrief_text")
    page.evaluate("document.getElementById('mehr').open = true")
    page.fill("#a-fach", "Mathematik")
    page.press("#a-fach", "Tab")
    page.select_option("#a-schulart", "Mittelschule")
    page.evaluate("document.getElementById('mehr').open = false")
    if zweig == "mach":
        page.click("#schritt-2 .s-zeile")
        page.click("#zweig-mach")
    else:
        page.click("#weiter-2")
    page.click("#weiter-3")
    chat_waehlen(page, "claude")
    kopieren(page, infobox=True)
    page.wait_for_selector("#schritt-5[data-stand=aktiv]")
    if antwort:
        einfuegen(page, antwort)


def screenshots(browser, basis, ordner):
    """AP13.1: Mühle bei Schritt 1 (mit Hinweis), Schritt 5 (rote Karte mit offener Korrekturschleife), Schritt Bilder
    (ein Bild da, eins fehlt) und Schritt 7 (Datei heruntergeladen) bei 1280 und 390 px:
    ap13.1-muehle-{1,5,bilder,7}-{1280,390}.png."""
    for w, h in ((1280, 900), (390, 844)):
        ctx = browser.new_context(viewport={"width": w, "height": h}, accept_downloads=True)
        page = ctx.new_page()
        page.goto(f"{basis}/index.html")
        page.wait_for_selector("#start .s-hinweis", timeout=20000)
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap13.1-muehle-1-{w}.png"), full_page=True)
        bis_schritt5(page, basis, chat(kaputt=True, bild=True))
        page.click("#karte-b3 .k-satz")
        page.wait_for_selector("#karte-b3 .k-schleife")
        page.add_style_tag(content=".spalte-rand { position: static !important; }")
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap13.1-muehle-5-{w}.png"), full_page=True)
        page.fill("#karte-b3 .k-schleife textarea", zuordnen(id_zeile=False))
        warte(page, "document.getElementById('karte-b3').classList.contains('status-ok')", timeout=30000)
        page.click("#weiter-5")
        page.wait_for_selector("#schritt-bilder[data-stand=aktiv]")
        import tempfile as _t
        with _t.TemporaryDirectory() as tmp:
            page.set_input_files("#bilder-liste input.bild-datei[data-datei='dreieck.png']", grosses_bild(tmp))
        warte(page, "!!km.zustand.assets['dreieck.png']", timeout=30000)
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap13.1-muehle-bilder-{w}.png"), full_page=True)
        page.click("#weiter-bilder")
        page.click("#durchsicht-ok")
        page.wait_for_selector("#schritt-7[data-stand=aktiv]", timeout=30000)
        with page.expect_download(timeout=90000):
            page.click("#herunterladen")
        page.wait_for_selector("#wiederherstellen:not([hidden])", timeout=60000)
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap13.1-muehle-7-{w}.png"), full_page=True)
        ctx.close()
    print(f"Screenshots in {ordner}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--browser", default="chromium", choices=["chromium", "webkit", "firefox"])
    ap.add_argument("--breite", default="1280,390")
    ap.add_argument("--screenshots")
    ap.add_argument("--nur-screenshots", action="store_true")
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright

    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "web_bundle.py")], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"web_bundle.py fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    with open(os.path.join(WEB, "katalog.json"), encoding="utf-8") as f:
        katalog = json.load(f)
    with open(os.path.join(WEB, "hinweise.json"), encoding="utf-8") as f:
        hinweise = json.load(f)
    # AP12a/AP13.1: das Wasserzeichen nutzt nur die Landingpage; web/ hat keine Kopie und verweist nicht darauf
    quelltext = "".join(open(os.path.join(WEB, n), encoding="utf-8").read() for n in ("index.html", "app.js", "ansicht.css"))
    ok(not os.path.exists(os.path.join(WEB, "wasserzeichen.svg")) and "wasserzeichen" not in quelltext,
       "web/ ohne wasserzeichen.svg und ohne Verweis darauf")
    ok(len(hinweise) == 8 and all(len(re.findall(r"[.?]( |$)", t)) <= 2 for t in hinweise.values())
       and not any(re.search(r"In diesem Schritt|\bSie\b|!", t) for t in hinweise.values()),
       "hinweise.json: ein Hinweis je Schritt, höchstens zwei Sätze, Du-Form, kein Meta-Text")
    srv, basis = server()
    with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
        opts = {}
        if args.browser == "chromium" and os.environ.get("CHROMIUM_PATH"):
            opts["executable_path"] = os.environ["CHROMIUM_PATH"]
        browser = getattr(p, args.browser).launch(**opts)
        if not args.nur_screenshots:
            for b in (int(x) for x in args.breite.split(",")):
                print(f"--- {args.browser}, {b} px")
                lauf(browser, basis, b, katalog, tmp, args.browser, hinweise)
                planung_lauf(browser, basis, b, args.browser)
                landing_lauf(browser, basis, b, args.browser)
        if args.screenshots:
            os.makedirs(args.screenshots, exist_ok=True)
            screenshots(browser, basis, args.screenshots)
        browser.close()
    srv.shutdown()
    if fehler:
        print(f"\n{len(fehler)} Fehler:\n- " + "\n- ".join(fehler))
        return 1
    print("\nalles gut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
