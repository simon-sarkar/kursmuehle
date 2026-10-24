"""Test der Oberfläche (web/index.html; seit AP13 die Schrittfolge) in Chromium, WebKit oder Firefox bei 1280 und 390 px.

Ablauf je Breite, Zweig „Ich steuere“: zu Beginn nur Schritt 1 (drei Felder, Weiter), Zeile „Beta“ oder „Testfassung“,
Muster; jeder Schritt erscheint erst nach dem vorigen, erledigte als aufklappbare Zeile mit Fazit. Schritt 2: Vorlage
Einführung mit höchstens sechs Karten (Vertiefung ausgeschaltet), Typ „automatisch“ mit gruppierter Auswahl, „+“ fügt
an der Stelle ein, Schalter „Zeit je Phase selbst einstellen“ (aus: keine Minutenfelder). Schritt 3: Aussehen-Kacheln
schreiben den Steckbrief. Schritt 4: Chat wählen, Text unter 10 KB mit „Typ frei“, Kopieren mit Infobox. Rand vor der
Antwort nur „45 Minuten geplant“ und die Zahl der Bausteine. Schritt 5: Antwort mit kaputtem Baustein (genau dieser rot,
Korrekturbitte), dann mit fehlendem Bild (gelb), Zahlen geschätzt kursiv; Herkunftsfarben (Auftrag von dir, Inhalt vom
Chat, umbenannter Titel von dir); Zweigwechsel behält die Kursdatei; Bild hochladen; „nur Baustein“; unbekannte id.
Schritt 6: Fragen und Lösungen, Gegenprüfen. Schritt 7: Datei (Bytes wie der CPython-Bau der gespeicherten Kursdatei),
Wiederherstellen-Schritte, Rückmeldungstext ohne Inhalte. Neu laden: „Weiter mit …“; Kursdatei öffnen; nächste Einheit
anhängen (Teil e2, Nachlieferung, „Zusammenführen“); „×“ verwirft die gesicherte Einheit. Zweig „Mach du“ bis zur Datei
ohne „Mehr einstellen“, Karten erst nach der Antwort als Liste. Testkurs netzwerk9 öffnen: Zahlen am Rand,
Strukturbausteine ohne Minutenfelder, verschieben, löschen, rückgängig, umbenennen. Überall: kein horizontales
Scrollen, keine verbotenen Begriffe, keine Seitenfehler.

usage: python3 scripts/tests/test_ansicht.py [--browser chromium|webkit|firefox] [--breite 1280,390] [--screenshots DIR]
  --screenshots DIR  zusätzlich ap13-muehle-{1,5,7}-{1280,390}.png, ap12a-{desktop-1280,handy-390}.png (Einheit aus dem
                     Prompttest Lauf 4) und ap12a-muster-{dicht,locker}-1280.png
Exit 0 = alles gut. Braucht Playwright mit dem gewählten Browser (oder CHROMIUM_PATH). Ruft vorher web_bundle.py auf.
"""
import argparse
import datetime
import functools
import http.server
import json
import os
import re
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
VERBOTEN = [r"\bbauen\b", r"\.mbz\b", r"Steckbrief", r"\bDelta\b", r"\bH5P\b", r"\bPrompt", r"Codeblock", r"\bmebis\b"]
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


def server():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Stiller, directory=WEB))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def chat(kaputt=False, bild=False):
    """Antwort eines Chats auf die Vorlage „Einführung“ (b1 bis b5, b6 ausgeschaltet) mit Vorrede und Codeblock;
    `kaputt`: Zuordnen nennt eine Gruppe, die es nicht gibt; `bild`: der Lesetext nennt ein Bild, das fehlt."""
    zone = "Dachboden" if kaputt else "Hypotenuse"
    b = "Bild: dreieck.png | Rechtwinkliges Dreieck mit den Seiten a, b und c\n" if bild else ""
    return f"""Hier ist die Einheit:

```markdown
# Drehbuch v1 · Satz des Pythagoras · 45

## Satz des Pythagoras · 45 min
### Textfeld: Die Leiter am Fenster · 6 min
id: b1
Vorspann: Eine Leiter lehnt an der Hauswand, ihr Fuß steht 1 m von der Wand weg. Das Fenster ist 3 m hoch.
Kasten: Denk kurz nach
  Reicht eine Leiter mit 3 m Länge bis zum Fenster?
### Seite: Katheten und Hypotenuse · 15 min
id: b2
Überschrift: Die Seiten im rechtwinkligen Dreieck
Die beiden Seiten am rechten Winkel heißen Katheten. Die Seite gegenüber dem rechten Winkel heißt Hypotenuse.
{b}Merke: a² + b² = c²
### Zuordnen: Kathete oder Hypotenuse? · 7 min
id: b3
zonen: Kathete | Hypotenuse
- liegt am rechten Winkel → Kathete
- die längste Seite → {zone}
### Quiz: Seiten berechnen · 10 min
id: b4
1. MC: Ein Dreieck hat die Katheten 3 cm und 4 cm. Wie lang ist die Hypotenuse?
- ✔ 5 cm → Richtig.
- 7 cm → Du hast addiert, nicht quadriert.
2. RF: In jedem Dreieck gilt a² + b² = c². ✘ → richtig: Nur im rechtwinkligen Dreieck. → falsch: Nur im rechtwinkligen Dreieck.
### Seite: Hefteintrag · 6 min
id: b5
Im rechtwinkligen Dreieck gilt a² + b² = c². c ist die Hypotenuse.
```

Soll ich noch etwas ändern?"""


def chat_zwei():
    """Antwort auf „Alle leeren Bausteine“ der zweiten Einheit (Karten b7 bis b11)."""
    return """```markdown
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
1. Wie lang ist die Diagonale eines Rechtecks mit 12 cm und 5 cm? · ✔13 cm · 17 cm
### Quiz: Raum · 8 min
id: b10
1. Ist die Raumdiagonale länger als die Flächendiagonale? · ✔ja · nein
### Seite: Hefteintrag Raum · 5 min
id: b11
Erst die Flächendiagonale, dann die Raumdiagonale.
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


def lauf(browser, basis, breite, katalog, tmp, name):
    wo = f"{name}/{breite}"
    ctx = browser.new_context(viewport={"width": breite, "height": 900}, accept_downloads=True)
    if name == "chromium":
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    page = ctx.new_page()
    seitenfehler = []
    page.on("pageerror", lambda e: seitenfehler.append(str(e)))
    page.goto(f"{basis}/index.html")
    v = katalog["vorlagen"][0]

    # 1 Start: nur Schritt 1 mit drei Feldern und Weiter; Zeile Beta/Testfassung; Muster
    ok(page.is_visible("#f-thema") and page.is_visible("#f-jahrgang") and page.is_visible("#f-minuten") and page.is_visible("#einheit-anlegen")
       and schritte(page) == {"1": "aktiv"} and page.text_content("#einheit-anlegen") == "Weiter", f"{wo}: zu Beginn nur Schritt 1 mit drei Feldern")
    ok(page.is_hidden(".spalte-rand") and page.is_hidden("#karten") and page.is_hidden("#mehr"), f"{wo}: kein Rand, keine Karten, kein „Mehr“")
    warte(page, "!document.getElementById('testfassung').hidden", timeout=20000)
    stufe = "Beta" if "-b" in katalog["version"] else "Testfassung"
    ok(page.text_content("#testfassung") == f"{stufe} {katalog['version']} · Rückmeldung an kursmuehle@pm.me", f"{wo}: Zeile „{stufe} {katalog['version']}“")
    ok("muster-locker.svg" in page.evaluate("getComputedStyle(document.body).backgroundImage")
       and page.evaluate("getComputedStyle(document.body).backgroundSize") == "260px 260px", f"{wo}: Muster (locker, 260 px) als Hintergrund")
    kein_scrollen(page, breite, f"{wo} Schritt 1")
    page.fill("#f-thema", "Satz des Pythagoras")
    page.fill("#f-jahrgang", "9")
    page.fill("#f-minuten", "45")
    page.click("#einheit-anlegen")
    page.wait_for_selector("#schritt-2:not([hidden])")
    ok(schritte(page) == {"1": "erledigt zu", "2": "aktiv"} and "Satz des Pythagoras · Jahrgangsstufe 9 · 45 Minuten" in page.text_content("#start .s-fazit"),
       f"{wo}: Schritt 1 klappt zu einer Zeile mit Fazit, Schritt 2 erscheint ({schritte(page)})")
    page.click("#start .s-zeile")
    ok(page.is_visible("#f-thema") and page.input_value("#f-thema") == "Satz des Pythagoras", f"{wo}: erledigte Zeile klappt auf")
    page.click("#start .s-zeile")
    ok(page.is_hidden("#f-thema"), f"{wo}: und wieder zu")
    ok(page.is_hidden("#steuer-teil") and page.is_visible("#zweig-mach") and page.is_visible("#zweig-steuer"), f"{wo}: Schritt 2 zeigt zwei Kacheln")

    # 2 Ich steuere: Vorlage, Karten, Typ automatisch, +, Zeit je Phase
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

    # 3 Aussehen: Kacheln schreiben den Steckbrief
    warte(page, "km.zustand.geladen && km.zustand.steckbrief_text")
    ok(page.locator("#aus-vorlage .aus-kachel svg").count() == 3 and page.locator("#aus-format .aus-kachel").count() == 2
       and page.locator("#aus-farbe .aus-kachel").count() == 6, f"{wo}: Aussehen: drei Vorlagen, zwei Formate, sechs Farben, mit Miniatur")
    for feld, wert in (("vorlage", "kacheln"), ("format", "kacheln"), ("farbe", "grün")):
        page.click(f".aus-kachel[data-feld={feld}][data-wert='{wert}']")
    warte(page, "km.zustand.steckbrief_text.includes('#15803D') && km.zustand.steckbrief_text.includes('format: kacheln')", timeout=20000)
    sb = api.steckbrief_lesen(page.evaluate("km.zustand.steckbrief_text"))
    ok(sb["kurs"]["design"]["vorlage"] == "kacheln" and sb["kurs"]["format"] == "kacheln" and sb["kurs"]["farbe"] == "#15803D"
       and page.get_attribute(".aus-kachel[data-feld=farbe][data-wert='grün']", "aria-checked") == "true",
       f"{wo}: Aussehen schreibt Vorlage, Format, Farbe ({sb['kurs'].get('design')}, {sb['kurs'].get('format')}, {sb['kurs'].get('farbe')}, "
       f"{page.get_attribute('.aus-kachel[data-feld=farbe][data-wert=grün]', 'aria-checked')})")
    kein_scrollen(page, breite, f"{wo} Schritt 3")
    page.click("#weiter-3")
    page.wait_for_selector("#schritt-4:not([hidden])")
    ok("Getönte Flächen · Kacheln · Grün" in page.text_content("#schritt-3 .s-fazit"), f"{wo}: Fazit Aussehen ({page.text_content('#schritt-3 .s-fazit')})")

    # 4 Chat wählen, Text mit Typ frei, kopieren mit Infobox; dann erscheint Schritt 5
    ok([b.text_content() for b in page.query_selector_all("#chat-knoepfe [data-chat]")][:4] == ["ByLKI", "AIS-Chat", "fobizz", "MUCGPT"]
       and "Über private Konten entscheidet deine Schule." in page.text_content("#chat-wahl"), f"{wo}: Chat-Auswahl, dienstliche zuerst")
    chat_waehlen(page, "chatgpt")
    ok("Extra High" in page.text_content("#chat-aufwand"), f"{wo}: ChatGPT zeigt den Satz zum Aufwand")
    page.click("#chat-aendern")
    chat_waehlen(page, "ais")
    t = chat_text(page)
    ids = [k["id"] for k in st if not k["aus"]]
    ok(len(t.encode()) < 10 * 1024 and all(f"id: {i} ·" in t for i in ids) and "id: b6 ·" not in t and "Typ frei" in t
       and "Ein Fall aus dem Alltag" in t and "Verteile die 45 Minuten selbst" in t,
       f"{wo}: Text ({len(t.encode())} Bytes): alle eingeschalteten id:, Typ frei, Auftrag, Zeit verteilt das Modell")
    ok(page.is_hidden("#schritt-5"), f"{wo}: Schritt 5 erst nach dem Kopieren")
    kopieren(page, infobox=True)
    ok(page.text_content("#kopiert") == KOPIERT, f"{wo}: kopiert ({page.text_content('#kopiert')})")
    if name == "chromium":
        ok(page.evaluate("navigator.clipboard.readText()") == chat_text(page), f"{wo}: Zwischenablage enthält den Text")
    page.wait_for_selector("#schritt-5:not([hidden])")
    ok(schritte(page) == {"1": "erledigt zu", "2": "erledigt zu", "3": "erledigt zu", "4": "erledigt zu", "5": "aktiv"},
       f"{wo}: Schritte 1 bis 4 zugeklappt, Schritt 5 aktiv")
    warte(page, "document.getElementById('kz-zahl').textContent === '5'", timeout=20000)
    ok(page.is_visible(".spalte-rand") and page.text_content("#kz-minuten") == "45 Minuten" and page.text_content("#kz-minuten-t") == "Geplant"
       and page.is_hidden("#kz-folge") and page.text_content("#kz-zahl") == "5", f"{wo}: Rand vor der Antwort: 45 Minuten geplant, 5 Bausteine")
    ok(page.locator("#karten-ort-5 .karte").count() == 0, f"{wo}: vor der Antwort keine Karten unter Schritt 5")

    # 5 Antwort mit kaputtem Baustein, dann mit fehlendem Bild
    einfuegen(page, chat(kaputt=True))
    st = stand(page)
    rot = [k["id"] for k in st if k["status"] == "fehler"]
    ok(rot == ["b3"] and len([k for k in st if k["status"] == "ok"]) == 4, f"{wo}: kaputter Baustein b3 rot, vier grün ({rot})")
    k1 = st[0]
    ok(k1["auftrag"] == "Ein Fall aus dem Alltag" and k1["phase"] == "Einstieg" and k1["titel"] == "Die Leiter am Fenster",
       f"{wo}: id: ordnet zu, Auftrag und Phase bleiben")
    kor = page.text_content("#korrektur-liste") if page.is_visible("#korrektur") else ""
    ok("„Kathete oder Hypotenuse?“ (id: b3)" in kor and page.is_visible("#karte-b3 .k-satz") and page.is_hidden("#weiter-5"),
       f"{wo}: Korrekturbitte nennt Titel und id, kein Weiter bei Fehler")
    einfuegen(page, chat(bild=True))
    st = stand(page)
    ok([k["id"] for k in st if k["status"] == "warnung"] == ["b2"] and not [k for k in st if k["status"] == "fehler"],
       f"{wo}: fehlendes Bild = Hinweis auf Karte b2, keine Fehler")
    ok([k["typ"] for k in st[:5]] == ["Textfeld", "Seite", "Zuordnen", "Quiz", "Seite"] and st[5]["aus"] and st[5]["geplant"],
       f"{wo}: Karten tragen den Typ, den der Chat gewählt hat; Vertiefung bleibt aus")
    ok(page.locator("#karten-ort-5 .karte").count() == 6 and page.is_visible("#weiter-5"), f"{wo}: Karten jetzt unter Schritt 5, Weiter sichtbar")
    ok(page.get_attribute("#karte-b2 .k-titel", "data-herkunft") == "chat" and "von-chat" in page.get_attribute("#karte-b2 .k-text", "class")
       and page.is_visible("#legende"), f"{wo}: Titel und Inhalt vom Chat in der Farbe des Chats, Legende am Rand")
    ok(page.evaluate("document.querySelector('#kz-minuten .geschaetzt') !== null")
       and page.evaluate("getComputedStyle(document.querySelector('#kz-minuten .geschaetzt')).fontStyle") == "italic"
       and " von 45 geplant" in page.text_content("#kz-minuten"), f"{wo}: Ist-Minuten kursiv, geplante aufrecht ({page.text_content('#kz-minuten')})")
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
    # Bild hochladen
    page.set_input_files("#karte-b2 input.k-bild[data-datei='dreieck.png']", grosses_bild(tmp))
    warte(page, "!!km.zustand.assets['dreieck.png'] && document.getElementById('karte-b2').classList.contains('status-ok')", timeout=30000)
    masse = page.evaluate("""() => { const u = km.zustand.assets['dreieck.png'], v = new DataView(u.buffer, u.byteOffset);
        return [v.getUint32(16), v.getUint32(20)]; }""")
    ok(masse == [1600, 800] and "Bild fehlt" not in page.text_content("#hinweise"), f"{wo}: Bild verkleinert auf {masse}, Warnung weg")
    # Umbenennen: Titel von der Lehrkraft
    page.fill("#karte-b4 .k-titel", "Seiten im Dreieck berechnen")
    page.press("#karte-b4 .k-titel", "Enter")
    warte(page, "km.zustand.kurs_md.includes('### Quiz: Seiten im Dreieck berechnen')", timeout=30000)
    warte(page, "document.querySelector('#karte-b4 .k-titel').value === 'Seiten im Dreieck berechnen'", timeout=30000)
    ok(page.get_attribute("#karte-b4 .k-titel", "data-herkunft") == "lehrkraft", f"{wo}: umbenannter Titel in der Farbe der Lehrkraft")
    # nur Baustein, unbekannte id
    page.click("#karte-b5 .k-neu")
    aufklappen(page, 4)
    warte(page, "document.querySelector('input[name=text-art][value=baustein]').checked "
                "&& document.getElementById('chat-text-feld').value.includes('id: b5')", timeout=30000)
    ok(len(chat_text(page).encode()) < 2048, f"{wo}: Text nur Baustein ({len(chat_text(page).encode())} Bytes)")
    einfuegen(page, "```markdown\n### Seite: Hefteintrag Pythagoras · 6 min\nid: b5\nIm rechtwinkligen Dreieck gilt a² + b² = c².\n```")
    st = stand(page)
    ok(page.is_checked("input[name=modus][value=baustein]") and st[4]["titel"] == "Hefteintrag Pythagoras"
       and st[3]["titel"] == "Seiten im Dreieck berechnen", f"{wo}: nur Baustein b5 ersetzt, Modus vorgeschlagen")
    einfuegen(page, "### Quiz: Irgendwas · 2 min\nid: x99\n1. A? · ✔a · b\n")
    ok("die es in dieser Einheit nicht gibt" in page.text_content("#eingabe-stand"), f"{wo}: unbekannte id: Fehlermeldung")
    begriffe(page, f"{wo} Schritt 5")
    kein_scrollen(page, breite, f"{wo} Schritt 5")

    # 6 Fragen und Lösungen, Gegenprüfen
    page.click("#weiter-5")
    page.wait_for_selector("#schritt-6:not([hidden])")
    ok(page.locator("#fragen-liste .frage").count() == page.evaluate("km.zustand.fragen.length") > 0 and schritte(page)["5"] == "erledigt zu",
       f"{wo}: Schritt 6 mit {page.locator('#fragen-liste .frage').count()} Fragen, Schritt 5 zugeklappt")
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

    # 7 Datei, Wiederherstellen, Rückmeldung
    page.evaluate(f"km.bauOptionen = {{zeit: {ZEIT}, seed: {SEED}}}")
    ok(page.is_hidden("#wiederherstellen"), f"{wo}: Wiederherstellen erst nach dem Erstellen")
    page.click("#erstellen")
    page.wait_for_selector("#herunterladen:not([hidden])", timeout=60000)
    with page.expect_download() as dl:
        page.click("#herunterladen")
    heute = datetime.date.today().isoformat()
    ok(dl.value.suggested_filename == f"satz-des-pythagoras_{heute}.mbz", f"{wo}: Download-Name {dl.value.suggested_filename}")
    pfad_mbz = os.path.join(tmp, f"{name}{breite}.mbz")
    dl.value.save_as(pfad_mbz)
    wh = page.text_content("#wh-schritte")
    ok(page.is_visible("#wiederherstellen") and page.locator("#wh-schritte li").count() == 5 and "Als neuen Kurs wiederherstellen" in wh
       and "Mehr → Kurs wiederherstellen" in wh and "Kurseinstellungen überschreiben" in wh, f"{wo}: fünf Schritte zum Wiederherstellen, neuer Kurs")
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
    with open(pfad_mappe, "rb") as f:
        gelesen = M.lesen(f.read())
    with open(pfad_mbz, "rb") as f:
        mbz = f.read()
    cp, _ = api.baue(gelesen["kurs_md"], gelesen["steckbrief_text"], gelesen["assets"], zeit=ZEIT, seed=SEED)
    ok(mbz and cp == mbz, f"{wo}: Datei byteidentisch zum CPython-Bau der Kursdatei ({len(mbz)} Bytes)")
    gm = gelesen["mappe"]
    ok(gm["einheit"]["thema"] == "Satz des Pythagoras" and gm["bausteine"][0]["auftrag"] == "Ein Fall aus dem Alltag" and gm.get("zweig") == "steuer"
       and gm.get("schritt") == 7 and gm.get("zeit_selbst") is False and gm["bausteine"][3].get("herkunft") == {"titel": "lehrkraft"}
       and gm["bausteine"][5].get("aus") and "dreieck.png" in gelesen["assets"] and gm.get("chat") == "ais",
       f"{wo}: Kursdatei trägt Schritt, Zweig, Zeit-Schalter, Herkunft, ausgeschaltete Karte, Bild")
    begriffe(page, f"{wo} Schritt 7")
    kein_scrollen(page, breite, f"{wo} Schritt 7")
    vorher = stand(page)
    warte(page, "document.getElementById('autosave-stand').textContent.includes('gesichert')", timeout=20000)

    # Neu laden: „Weiter mit …“ stellt Stand und Schritt wieder her; Infobox kommt nicht wieder
    page.wait_for_timeout(1200)
    page.reload()
    page.wait_for_selector("#weiter:not([hidden])", timeout=20000)
    ok("Satz des Pythagoras" in page.text_content("#weiter-knopf") and page.is_visible("#weiter-weg"), f"{wo}: „Weiter mit …“ und „×“ nach dem Neuladen")
    page.click("#weiter-knopf")
    warte(page, "document.body.dataset.bildschirm === 'ansicht' && km.zustand.kennzahlen && document.body.dataset.schritt === '7'")
    ok(stand(page) == vorher, f"{wo}: Autosave stellt den Stand wieder her, Schritt 7")
    aufklappen(page, 4)
    warte(page, "!document.getElementById('text-kopieren').disabled", timeout=30000)
    kopieren(page, infobox=False)
    ok(page.is_hidden("#infobox"), f"{wo}: Infobox nach „nicht mehr anzeigen“ nicht wieder")

    # Kursdatei öffnen liefert denselben Stand
    page.click("#neue-einheit")
    page.wait_for_selector("#start[data-stand=aktiv]")
    page.set_input_files("#datei-oeffnen", pfad_mappe)
    warte(page, "document.body.dataset.bildschirm === 'ansicht' && km.zustand.kennzahlen && document.body.dataset.schritt === '7'")
    ok(stand(page) == vorher, f"{wo}: Kursdatei öffnen liefert denselben Stand")

    # Nächste Einheit anhängen: Teil e2, Nachlieferung, Zusammenführen
    page.click("#erstellen")
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
    page.click("#weiter-3")
    warte(page, "document.getElementById('chat-text-feld').value.includes('id: b7 ·')", timeout=30000)
    t2 = chat_text(page)
    ok(all(f"id: b{i} ·" in t2 for i in (7, 8, 9, 10, 11)) and "id: b2 ·" not in t2 and "gibt es schon" in t2,
       f"{wo}: Text nur für die neue Einheit (alle leeren Bausteine)")
    kopieren(page, infobox=False)
    page.wait_for_selector("#schritt-5[data-stand=aktiv]")
    einfuegen(page, chat_zwei())
    ok("als weitere Einheit angehängt" in page.text_content("#eingabe-stand") and "teil: e2" in page.evaluate("km.zustand.kurs_md")
       and page.evaluate("km.zustand.pruefung.abschnitte.length") == 2, f"{wo}: zweite Einheit als eigener Abschnitt mit teil: e2")
    page.click("#weiter-5")
    page.click("#ohne-durchsicht")
    page.click("#erstellen")
    page.wait_for_selector("#herunterladen:not([hidden])", timeout=60000)
    with page.expect_download() as dl:
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
    ok("verwerfen?" in page.text_content("#verwerfen-text") and "nicht als Kursdatei gespeichert" in page.text_content("#verwerfen-text"),
       f"{wo}: „×“ neben „Weiter mit“ fragt nach ({page.text_content('#verwerfen-text')})")
    page.click("#verwerfen-ja")
    page.wait_for_selector("#weiter", state="hidden")
    ok(page.evaluate("km.autosaveLesen()") is None, f"{wo}: gesicherte Einheit verworfen")

    # Zweig „Mach du“ bis zur Datei, ohne „Mehr einstellen“
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
    einfuegen(page, chat())
    ok(page.locator("#karten.kompakt .karte").count() == 5 and page.locator("#karten .k-auftrag").count() == 0
       and page.locator("#karten .k-aktionen").count() == 0, f"{wo}: Mach du: Karten nach der Antwort als Liste mit Punkten")
    page.click("#weiter-5")
    page.click("#durchsicht-ok")
    page.click("#erstellen")
    page.wait_for_selector("#herunterladen:not([hidden])", timeout=60000)
    ok(page.is_visible("#wiederherstellen") and not page.evaluate("document.getElementById('mehr').open"),
       f"{wo}: Mach du bis zur Datei ohne „Mehr einstellen“")
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


ANTWORT_SCREENSHOT = os.path.join(ROOT, "docs", "entwicklung", "protokolle", "ap11-prompttest", "antwort-lauf4.txt")


def bis_schritt5(page, basis, antwort=None, zweig="steuer"):
    """Einheit Pythagoras (Einführung, Mathematik 9 Mittelschule) wie eine Lehrkraft anlegen, Text kopieren und
    (mit `antwort`) die Antwort des Chats einfügen."""
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
        with open(antwort, encoding="utf-8") as f:
            einfuegen(page, f.read())


def screenshots(browser, basis, ordner):
    """AP13: Mühle bei Schritt 1, 5 (mit einer Antwort, die zur Vorlage passt) und 7 (Datei erstellt) bei 1280 und 390 px.
    AP12a: Ganzseitenbild Schritt 5 mit der Antwort aus Lauf 4 (ap12a-desktop-1280, ap12a-handy-390; elf Bausteine auf
    der alten Vorlage, deshalb neue Karten dazu) und die zwei Musterdichten."""
    antwort = os.path.join(ordner, "_antwort.txt")
    with open(antwort, "w", encoding="utf-8") as f:
        f.write(chat(bild=True))
    for w, h in ((1280, 900), (390, 844)):
        ctx = browser.new_context(viewport={"width": w, "height": h}, accept_downloads=True)
        page = ctx.new_page()
        page.goto(f"{basis}/index.html")
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(ordner, f"ap13-muehle-1-{w}.png"), full_page=True)
        bis_schritt5(page, basis, antwort)
        page.add_style_tag(content=".spalte-rand { position: static !important; }")
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap13-muehle-5-{w}.png"), full_page=True)
        page.click("#weiter-5")
        page.click("#durchsicht-ok")
        page.wait_for_selector("#schritt-7[data-stand=aktiv]", timeout=30000)
        page.click("#erstellen")
        page.wait_for_selector("#herunterladen:not([hidden])", timeout=60000)
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap13-muehle-7-{w}.png"), full_page=True)
        ctx.close()
        ctx = browser.new_context(viewport={"width": w, "height": h})
        page = ctx.new_page()
        bis_schritt5(page, basis, ANTWORT_SCREENSHOT)
        page.add_style_tag(content=".spalte-rand { position: static !important; }")
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, "ap12a-desktop-1280.png" if w == 1280 else "ap12a-handy-390.png"), full_page=True)
        ctx.close()
    os.remove(antwort)
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    bis_schritt5(page, basis, ANTWORT_SCREENSHOT)
    page.evaluate("window.scrollTo(0, document.getElementById('karten-ort-5').offsetTop - 120)")
    for dichte in ("dicht", "locker"):
        page.evaluate(f"document.body.dataset.muster = '{dichte}'")
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ordner, f"ap12a-muster-{dichte}-1280.png"))
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
    srv, basis = server()
    with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
        opts = {}
        if args.browser == "chromium" and os.environ.get("CHROMIUM_PATH"):
            opts["executable_path"] = os.environ["CHROMIUM_PATH"]
        browser = getattr(p, args.browser).launch(**opts)
        if not args.nur_screenshots:
            for b in (int(x) for x in args.breite.split(",")):
                print(f"--- {args.browser}, {b} px")
                lauf(browser, basis, b, katalog, tmp, args.browser)
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
