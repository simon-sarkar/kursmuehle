"""Website-Modus (AP7): ein Abschnitt als eine HTML-Datei (mod_resource) mit Startseite, Kapitelnavigation,
Textbausteinen aus gen/html.py und kleinen JS-Übungen mit Rückmeldung, ohne Bewertung.
Textfeld-Modus (AP7b): eine Übung als Block in einem Textfeld (mod_label), ohne iframe. CSS und Skript der Übungen
(templates/uebungen.css, uebungen.js) teilen sich beide Modi; im Block gilt jede CSS-Regel nur unter der id des Blocks,
das Skript läuft in einer eigenen Funktion ohne globale Namen, Bilder liegen als Dateien im Textfeld (@@PLUGINFILE@@).

Der Parser (gen/kursdatei.py) liefert je Element die Daten, die er auch für H5P nutzt (frage_daten, _story_daten);
hier wird daraus HTML. Seite und Skript stehen in templates/website.html, ohne externe Quellen (läuft auch offline,
als Vorschau neben der .mbz). Bilder liegen einmal als data-URI im Bilderverzeichnis der Seite und werden über
data-km-img gesetzt, auch wenn dasselbe Bild mehrfach vorkommt.
"""
import base64
import html as _html
import json
import os
import random
import re

from . import html as T

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "..", "templates", "website.html")
UEB_CSS = os.path.join(HERE, "..", "templates", "uebungen.css")
UEB_JS = os.path.join(HERE, "..", "templates", "uebungen.js")

# Elementtypen, die im Website-Modus Kapitel werden; alle anderen bleiben Aktivitäten der Plattform.
WEB_TYPEN = {"Banner", "Textfeld", "Seite", "Überblick", "Link", "Video", "Lesebuch", "Quiz", "Zuordnen", "Lernkarten",
             "Geschichte", "Lückentext"}
ART = {"Textfeld": "Lesen", "Seite": "Lesen", "Lesebuch": "Lesen", "Quiz": "Üben", "Zuordnen": "Üben",
       "Lückentext": "Üben", "Lernkarten": "Wiederholen", "Geschichte": "Entscheiden", "Video": "Video", "Link": "Link",
       "Überblick": "Überblick"}
# Textfeld-Modus: nur Übungen werden Blöcke; Lesetexte, Lesebuch, Banner, Überblick, Video bleiben, wie sie sind.
BLOCK_TYPEN = {"Quiz", "Zuordnen", "Lernkarten", "Lückentext", "Geschichte"}
# Nur im Block: Rahmen, Abstände, Farben (Website: Seiten-CSS in website.html)
BLOCK_CSS = """
{margin:16px 0;padding:16px 18px 18px;border:1px solid var(--line);border-top:4px solid var(--hue);border-radius:var(--r);background:#fff;color:var(--ink);font-size:16px;line-height:1.55;--ok:#15803D;--okbg:#ECFDF3;--bad:#B42318;--badbg:#FEF3F2}
*{box-sizing:border-box}
img{max-width:100%;height:auto}
.km-bt{font-size:1.2em;line-height:1.25;margin:2px 0 8px;color:var(--ink)}
.km-kicker{margin:0}
.km-q{border:0;border-top:1px solid var(--line);border-radius:0;padding:14px 0 0;margin:14px 0 0;background:none}
.km-nojs{padding:8px 12px;border-radius:8px;background:var(--tint);font-size:14px}
"""
_RE_SRC = re.compile(r'src="@@PLUGINFILE@@/([^"]+)"')
_RE_GAP = re.compile(r"\*([^*]+)\*")
_RE_IMG = re.compile(r'data-km-img="([^"]+)"')


def esc(s):
    return _html.escape(str(s), quote=True)


def _lies(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def css_block(css, bid):
    """Jede Regel (eine je Zeile) nur unter #bid; Zeilen von @media und Kommentare bleiben bzw. fallen weg."""
    out = []
    for line in re.sub(r"/\*.*?\*/", "", css, flags=re.S).splitlines():
        s = line.strip()
        if not s:
            continue
        m = re.match(r"^([^@{}]*)\{(.*)\}$", s)
        if m:
            sel = ",".join(f"#{bid} {x.strip()}".rstrip() for x in m.group(1).split(",")) if m.group(1).strip() \
                else f"#{bid}"
            out.append(sel + "{" + m.group(2) + "}")
        else:
            out.append(s)
    return "\n".join(out)


def js_kompakt(js):
    """Einrückung und ganze Kommentarzeilen weg (Textfeld wird kleiner, Inhalt gleich)."""
    return "\n".join(z.strip() for z in js.splitlines() if z.strip() and not z.strip().startswith("//"))


class Website:
    def __init__(self, name, hue, anzeige="eingebettet", prefix=""):
        self.name, self.hue, self.anzeige = name, hue, anzeige
        self.prefix = prefix    # vor jedem name/id einer Übung: Blöcke auf einer Kursseite dürfen sich nicht berühren
        self.kapitel = []       # dict(titel, gruppe, html, minuten, art)
        self.kopf = None        # (titel, untertitel, bildname | None)
        self.start = []         # HTML-Teile der Startseite unter dem Kopf (Überblick)
        self.bilder = {}        # dateiname -> lokaler Pfad
        self.gruppe = None      # aktueller Unterabschnitt (Gruppe in der Navigation)
        self.pos = None         # Stelle der Website unter den Elementen des Abschnitts
        self.titel = set()      # Elementtitel, die in der Website aufgehen (Badge-Prüfung)
        self._n = 0

    # ----- Sammeln
    def dateien(self, files):
        for path, name in files:
            self.bilder[name] = path

    def bild(self, ref):
        """ImageRef (gen.h5p) -> Dateiname, registriert."""
        self.bilder[ref.name] = ref.local_path
        return ref.name

    def kapitel_neu(self, titel, html, art, minuten=None):
        self.kapitel.append(dict(titel=titel, gruppe=self.gruppe, html=html, minuten=minuten, art=art))

    def uid(self, p="q"):
        self._n += 1
        return f"{self.prefix}{p}{self._n}"

    # ----- Übungen (Markup; Prüfen und Rückmeldung im Skript der Vorlage)
    def _frage(self, typ, inner, titel=None, fb_ok="", fb_bad=""):
        head = f'<div class="km-qt">{titel}</div>' if titel else ""
        extra = (f'<div class="km-fb-ok" hidden>{fb_ok}</div>' if fb_ok else "") + \
                (f'<div class="km-fb-bad" hidden>{fb_bad}</div>' if fb_bad else "")
        return (f'<div class="km-q" data-typ="{typ}">{head}{inner}'
                f'<div class="km-act"><button type="button" class="km-btn km-check">Prüfen</button>'
                f'<button type="button" class="km-btn km-ghost km-solve" hidden>Lösung zeigen</button></div>'
                f'<div class="km-qfb" hidden role="status"></div>{extra}</div>')

    def mc(self, frage, antworten, titel=None, mischen=False):
        """antworten: [(html, richtig, rückmeldung)]."""
        multi = sum(1 for _, c, _ in antworten if c) != 1
        name, kind = self.uid(), "checkbox" if multi else "radio"
        if mischen:
            antworten = list(antworten)
            random.Random(frage).shuffle(antworten)
        opts = "".join(
            f'<label class="km-opt" data-ok="{1 if c else 0}"><input type="{kind}" name="{name}"><span>{a}</span>'
            + (f'<span class="km-ofb" hidden>{fb}</span>' if fb else "") + '</label>'
            for a, c, fb in antworten)
        hint = '<div class="km-hint">Mehrere Antworten sind richtig.</div>' if multi else ""
        return self._frage("mc", f'<div class="km-qq">{frage}</div>{hint}<div class="km-opts">{opts}</div>', titel)

    def rf(self, aussage, richtig, fb_ok="", fb_bad="", titel=None):
        name = self.uid()
        opts = "".join(f'<label class="km-opt" data-ok="{1 if v == richtig else 0}"><input type="radio" name="{name}">'
                       f'<span>{t}</span></label>' for t, v in (("Richtig", True), ("Falsch", False)))
        return self._frage("mc", f'<div class="km-qq">{aussage}</div><div class="km-opts km-row">{opts}</div>', titel,
                           fb_ok, fb_bad)

    def einsetzen(self, aufgabe, text, titel=None):
        """Drag the Words als Auswahllisten: jede *Lücke* wählt aus allen Wörtern der Aufgabe."""
        woerter = [g.split(":", 1)[0].strip() for g in _RE_GAP.findall(text)]
        auswahl = sorted(set(woerter), key=lambda w: random.Random(aufgabe + w).random())
        opts = '<option value="">…</option>' + "".join(f'<option>{esc(w)}</option>' for w in auswahl)

        def sel(m):
            w = m.group(1).split(":", 1)[0].strip()
            return f'<select class="km-gap" data-ok="{esc(w)}" aria-label="Lücke">{opts}</select>'
        zeilen = "<br>".join(_RE_GAP.sub(sel, z) for z in text.split("\n"))
        return self._frage("gaps", f'<div class="km-qq">{aufgabe}</div><p class="km-text">{zeilen}</p>', titel)

    def lueckentext(self, aufgabe, absaetze, titel=None):
        def inp(m):
            ans, _, tipp = m.group(1).partition(":")
            alts = [a.strip() for a in ans.split("/") if a.strip()]
            w = max(4, max(len(a) for a in alts) + 1)
            tip = f' title="{esc(tipp.strip())}" placeholder="{esc(tipp.strip())}"' if tipp.strip() else ""
            return (f'<input class="km-gap" type="text" data-ok="{esc("|".join(alts))}" size="{w}" autocomplete="off" '
                    f'spellcheck="false" aria-label="Lücke"{tip}>')
        text = "".join(f'<p class="km-text">{_RE_GAP.sub(inp, a)}</p>' for a in absaetze)
        return self._frage("gaps", f'<div class="km-qq">{aufgabe}</div>{text}', titel)

    def markieren(self, aufgabe, text, titel=None):
        teile = re.split(r"(\*[^*]+\*|\s+)", text)
        out = []
        for t in teile:
            if not t:
                continue
            if t.isspace():
                out.append(" ")
            elif t.startswith("*") and t.endswith("*"):
                out.append(f'<button type="button" class="km-word" data-ok="1">{t[1:-1]}</button>')
            else:
                m = re.match(r"^(\W*)(.+?)(\W*)$", t)
                pre, w, post = m.groups() if m else ("", t, "")
                out.append(f'{pre}<button type="button" class="km-word" data-ok="0">{w}</button>{post}' if w else t)
        return self._frage("mark", f'<div class="km-qq">{aufgabe}</div><p class="km-text">{"".join(out)}</p>', titel)

    def aussagen(self, einleitung, gruppen, titel=None):
        parts = [f'<p>{einleitung}</p>'] if einleitung else []
        for g in gruppen:
            parts.append(self.mc("Welche Aussage stimmt?", [(g[0], True, "")] + [(x, False, "") for x in g[1:]],
                                 mischen=True))
        return "".join(parts)

    def schnellquiz(self, fragen):
        return "".join(self.mc(q, [(a[0], True, "")] + [(x, False, "") for x in a[1:]], mischen=True) for q, a in fragen)

    def frage(self, typ, titel, d):
        """Frage aus kursdatei.frage_daten -> Markup."""
        t = None if titel in ("Frage", "Richtig oder falsch?") else titel
        if typ == "MC":
            return self.mc(d[0], d[1], t, mischen=True)     # wie randomAnswers in H5P und shuffle im Test
        if typ == "RF":
            return self.rf(*d, titel=t)
        if typ == "Einsetzen":
            return self.einsetzen(*d, titel=t)
        if typ == "Markieren":
            return self.markieren(*d, titel=t)
        if typ == "Lückentext":
            return self.lueckentext(*d, titel=t)
        if typ == "Aussagen":
            return self.aussagen(*d, titel=t)
        return self.schnellquiz(d)

    def quiz(self, fragen_html, einleitung=""):
        intro = f'<p class="km-lead">{einleitung}</p>' if einleitung else ""
        return (f'<div class="km-quiz">{intro}<p class="km-score" aria-live="polite">'
                f'<span class="km-n">0</span> von <span class="km-of">0</span> richtig</p>{"".join(fragen_html)}</div>')

    def zuordnen(self, zonen, elemente, aufgabe=""):
        """elemente: [(html, zonen-index | None)]; None = Ablenker („passt nirgends“)."""
        ablenker = any(z is None for _, z in elemente)
        opts = '<option value="">Bitte wählen …</option>' + "".join(f'<option>{esc(_strip_tags(z))}</option>' for z in zonen)
        if ablenker:
            opts += '<option value="–">passt nirgends</option>'
        rows = "".join(
            f'<div class="km-pair"><span>{t}</span><select class="km-gap" aria-label="Zuordnung" '
            f'data-ok="{esc(_strip_tags(zonen[z]) if z is not None else "–")}">{opts}</select></div>'
            for t, z in elemente)
        head = f'<div class="km-qq">{aufgabe or "Ordne jedes Element zu."}</div>'
        return self._frage("gaps", head + f'<div class="km-pairs">{rows}</div>')

    def lernkarten(self, karten, beschreibung=""):
        """karten: [(vorne, hinten, tipp, ImageRef | None)]."""
        out = []
        for vorne, hinten, tipp, img in karten:
            pic = f'<img data-km-img="{esc(self.bild(img))}" alt="">' if img else ""
            tip = f'<span class="km-tip">{tipp}</span>' if tipp else ""
            out.append(f'<button type="button" class="km-card" aria-pressed="false">'
                       f'<span class="km-front">{pic}<span>{vorne}</span></span>'
                       f'<span class="km-back"><span>{hinten}</span>{tip}</span></button>')
        intro = f'<p>{beschreibung}</p>' if beschreibung else ""
        return intro + '<p class="km-hint">Tippe auf eine Karte, um sie umzudrehen.</p>' + \
            f'<div class="km-cards">{"".join(out)}</div>'

    def geschichte(self, start_titel, start_sub, img, knoten, enden):
        data = {"start": knoten[0][0], "titel": start_titel, "sub": start_sub,
                "bild": self.bild(img[1]) if img else None, "knoten": {}, "enden": {}}
        for k in knoten:
            if k[1] == "szene":
                data["knoten"][k[0]] = {"typ": "szene", "titel": k[2], "html": k[3], "ziel": k[4]}
            else:
                data["knoten"][k[0]] = {"typ": "frage", "frage": k[2], "antworten": [[t, z] for t, z in k[3]]}
        for key, (t, sub) in enden.items():
            data["enden"][key] = {"titel": t, "text": sub}
        js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
        return f'<div class="km-story"><script type="application/json">{js}</script><div class="km-story-view"></div></div>'

    def video(self, url):
        m = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([\w-]{6,})", url)
        if m:
            src = f"https://www.youtube-nocookie.com/embed/{m.group(1)}"
        else:
            m = re.search(r"vimeo\.com/(?:video/)?(\d+)", url)
            src = f"https://player.vimeo.com/video/{m.group(1)}" if m else None
        if not src:
            return self.link(url)
        return (f'<div class="km-video"><iframe src="{esc(src)}" title="Video" loading="lazy" allowfullscreen '
                f'allow="encrypted-media; picture-in-picture"></iframe></div>'
                f'<p class="km-hint"><a href="{esc(url)}" target="_blank" rel="noopener">Video in neuem Fenster öffnen</a></p>')

    def link(self, url):
        return (f'<p><a class="km-btn" href="{esc(url)}" target="_blank" rel="noopener">Seite öffnen</a></p>'
                f'<p class="km-hint">{esc(url)}</p>')

    # ----- Ausgabe
    def block(self, bid, art):
        """Textfeld-Modus: Kapitel als ein Block für ein Textfeld -> (html, [(pfad, dateiname)])."""
        inhalt = "".join(k["html"] for k in self.kapitel)
        inhalt = _RE_IMG.sub(lambda m: f'src="@@PLUGINFILE@@/{m.group(1)}"', inhalt)
        img = {n: f"@@PLUGINFILE@@/{n}" for n in self.bilder if json.dumps(n) in inhalt}   # Geschichte: Bild im JSON
        namen = set(_RE_SRC.findall(inhalt)) | set(img)
        files = [(self.bilder[n], n) for n in sorted(namen) if n in self.bilder]
        stil = (f"--hue:{self.hue};--tint:{T._tint(self.hue)};--ink:{T.D['ink']};--muted:{T.D['muted']};"
                f"--line:{T.D['line']};--r:{T.D['r']}px")
        css = css_block(_lies(UEB_CSS) + BLOCK_CSS, bid)
        js = (f'(function () {{\n"use strict";\nvar R = document.getElementById("{bid}");\n'
              f'if (!R || R.getAttribute("data-km-an")) return;\nR.setAttribute("data-km-an", "1");\n'
              f'var IMG = {json.dumps(img)};\n{js_kompakt(_lies(UEB_JS))}\n}})();')
        html = (f'<div class="kmb" id="{bid}" style="{stil}"><style>\n{css}\n</style>'
                f'<div class="km-kicker">{esc(art)}</div><h3 class="km-bt">{self.name}</h3>'
                '<p class="km-nojs">Diese Übung braucht JavaScript. Läuft sie hier nicht, die Kursseite im Browser '
                f'öffnen.</p>{inhalt}<script>\n{js}\n</script></div>')
        return html, files

    def _bilder_setzen(self, html):
        return _RE_SRC.sub(lambda m: f'data-km-img="{esc(m.group(1))}"', html)

    def render(self):
        hue = self.hue
        kopf_t, kopf_u, kopf_b = self.kopf or (self.name, "", None)
        pic = f'<img class="km-hero-img" data-km-img="{esc(kopf_b)}" alt="">' if kopf_b else ""
        hero = (f'<div class="km-hero{" km-hero-pic" if kopf_b else ""}">{pic}<div class="km-hero-text">'
                f'<h1>{kopf_t}</h1>' + (f'<p>{kopf_u}</p>' if kopf_u else "") + '</div></div>')
        nav, karten, secs = [], [], []
        gruppe = None
        for i, k in enumerate(self.kapitel, 1):
            if k["gruppe"] != gruppe:
                gruppe = k["gruppe"]
                if gruppe:
                    nav.append(f'<div class="km-grp">{gruppe}</div>')
                    karten.append(f'<h2 class="km-grp-h">{gruppe}</h2>')
            meta = " · ".join(x for x in (k["art"], f'{k["minuten"]} min' if k["minuten"] else "") if x)
            nav.append(f'<a href="#k{i}" data-k="k{i}"><span class="km-dot"></span><span>{k["titel"]}</span></a>')
            karten.append(f'<a class="km-tile" href="#k{i}" data-k="k{i}"><span class="km-num">{i}</span>'
                          f'<span class="km-tile-t">{k["titel"]}<small>{meta}</small></span><span class="km-dot"></span></a>')
            prev = f'<a class="km-btn km-ghost" href="#k{i - 1}">Zurück</a>' if i > 1 else \
                '<a class="km-btn km-ghost" href="#start">Start</a>'
            nxt = (f'<a class="km-btn" href="#k{i + 1}">Weiter: {_strip_tags(self.kapitel[i]["titel"])}</a>'
                   if i < len(self.kapitel) else '<a class="km-btn" href="#start">Fertig: zur Übersicht</a>')
            kick = " · ".join(x for x in (_strip_tags(k["gruppe"] or ""), meta) if x)
            secs.append(f'<section class="km-ch" id="k{i}" hidden><div class="km-kicker">{kick}</div>'
                        f'<h1>{k["titel"]}</h1>{k["html"]}<nav class="km-pager">{prev}{nxt}</nav></section>')
        start = (f'<section class="km-ch" id="start">{hero}{"".join(self.start)}'
                 f'<h2 class="km-grp-h">Kapitel</h2><div class="km-tiles">{"".join(karten)}</div>'
                 f'<nav class="km-pager"><span></span><a class="km-btn" href="#k1">Los geht’s</a></nav></section>')
        main = self._bilder_setzen(start + "".join(secs))
        bilder = {}
        for name, path in self.bilder.items():
            if f'data-km-img="{esc(name)}"' in main or json.dumps(name) in main:   # Geschichte: Bild im JSON
                with open(path, "rb") as f:
                    mime = "image/png" if name.lower().endswith(".png") else "image/jpeg"
                    bilder[name] = f"data:{mime};base64," + base64.b64encode(f.read()).decode()
        with open(TEMPLATE, encoding="utf-8") as f:
            tpl = f.read()
        ids = {
            "{{TITEL}}": esc(_strip_tags(self.name)),
            "{{HUE}}": hue, "{{TINT}}": T._tint(hue), "{{INK}}": T.D["ink"], "{{MUTED}}": T.D["muted"],
            "{{LINE}}": T.D["line"], "{{R}}": f'{T.D["r"]}px',
            "{{NAV}}": '<a href="#start" data-k="start"><span class="km-dot"></span><span>Start</span></a>' + "".join(nav),
            "{{NAME}}": esc(_strip_tags(self.name)),
            "{{MAIN}}": main,
            "{{SCHLUESSEL}}": esc("km:" + re.sub(r"\W+", "-", _strip_tags(self.name).lower())[:60]),
            "{{BILDER}}": json.dumps(bilder).replace("</", "<\\/"),
            "{{UEBUNGEN_CSS}}": _lies(UEB_CSS).strip(),
            "{{UEBUNGEN_JS}}": _lies(UEB_JS).strip(),
        }
        for k, v in ids.items():
            tpl = tpl.replace(k, v)
        return tpl


def vorschau_textfeld(bloecke, titel):
    """Vorschau aller Textfeld-Blöcke eines Kurses als eine HTML-Seite (Bilder als data-URI), wie auf der Kursseite
    untereinander. bloecke: [(titel, html, [(pfad, dateiname)])]."""
    teile = []
    for _, html, files in bloecke:
        for path, name in files:
            with open(path, "rb") as f:
                mime = "image/png" if name.lower().endswith(".png") else "image/jpeg"
                html = html.replace(f"@@PLUGINFILE@@/{name}", f"data:{mime};base64," + base64.b64encode(f.read()).decode())
        teile.append(f'<div class="activity">{html}</div>')
    return ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<title>{esc(_strip_tags(titel))} – Übungen im Textfeld</title>\n'
            '<style>body{margin:0;background:#F6F7F9;font:16px/1.5 system-ui,sans-serif;color:#1F2937}'
            'main{max-width:820px;margin:0 auto;padding:16px}</style>\n</head>\n<body>\n<main>\n'
            + "\n".join(teile) + '\n</main>\n</body>\n</html>\n')


def _strip_tags(s):
    return re.sub(r"<[^>]+>", "", s or "")
