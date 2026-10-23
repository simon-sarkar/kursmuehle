"""Website-Modus (AP7): ein Abschnitt als eine HTML-Datei (mod_resource) mit Startseite, Kapitelnavigation,
Textbausteinen aus gen/html.py und kleinen JS-Übungen mit Rückmeldung, ohne Bewertung.

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

# Elementtypen, die im Website-Modus Kapitel werden; alle anderen bleiben Aktivitäten der Plattform.
WEB_TYPEN = {"Banner", "Textfeld", "Seite", "Überblick", "Link", "Video", "Lesebuch", "Quiz", "Zuordnen", "Lernkarten",
             "Geschichte", "Lückentext"}
ART = {"Textfeld": "Lesen", "Seite": "Lesen", "Lesebuch": "Lesen", "Quiz": "Üben", "Zuordnen": "Üben",
       "Lückentext": "Üben", "Lernkarten": "Wiederholen", "Geschichte": "Entscheiden", "Video": "Video", "Link": "Link",
       "Überblick": "Überblick"}
_RE_SRC = re.compile(r'src="@@PLUGINFILE@@/([^"]+)"')
_RE_GAP = re.compile(r"\*([^*]+)\*")


def esc(s):
    return _html.escape(str(s), quote=True)


class Website:
    def __init__(self, name, hue, anzeige="eingebettet"):
        self.name, self.hue, self.anzeige = name, hue, anzeige
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
        return f"{p}{self._n}"

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
        }
        for k, v in ids.items():
            tpl = tpl.replace(k, v)
        return tpl


def _strip_tags(s):
    return re.sub(r"<[^>]+>", "", s or "")
