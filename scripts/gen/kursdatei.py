"""Parser für die Kursdatei `kurs.md` (Drehbuch-Format) -> Generator-Objekte (gen.mbz, gen.h5p).

Format: references/kursdatei.md (vollständig), references/intake.md §5 (Kurzfassung).
Fehler nennen Zeile und Element; unbekannte Typen und Angaben brechen ab (streng, CLI) oder werden je Element als
Diagnose gesammelt (nachsichtig, `gen.api.pruefe`): ein fehlerhaftes `###` fällt aus, der Rest wird weiter gelesen.
Jede Zeile wird beim Einlesen bereinigt (HTML nur b, i, em, strong, br, sup, sub, mark; Adressen nur https).
Jedes Element bekommt eine stabile Baustein-ID aus Abschnitt, Typ und Titel; Diagnosen tragen Baustein und relative Zeile.
"""
import datetime
import hashlib
import os
import re
import struct
import tempfile
import zlib

from . import h5p as H
from . import html as T
from . import tzdaten
from .website import ART, BLOCK_TYPEN, WEB_TYPEN, Website
from .mbz import (Assign, Badge, Book, Choice, Feedback, Folder, Forum, Glossary, HvpItem, Label, MultiChoice, Page,
                  Quiz, Resource, Section, ShortAnswer, SubSection, TrueFalse, Url, moodle_format)


class KursdateiFehler(Exception):
    pass


def ts_sichtbar_ab(d):
    """'YYYY-MM-DD' -> Unix-Zeit 06:00 Europe/Berlin, sonst None."""
    if not d:
        return None
    return int(datetime.datetime.strptime(str(d), "%Y-%m-%d").replace(hour=6, tzinfo=tzdaten.berlin()).timestamp())


def ts_faellig(d):
    """'YYYY-MM-DD' -> Unix-Zeit 23:59 Europe/Berlin (Abgabetermin), sonst 0."""
    if not d:
        return 0
    return int(datetime.datetime.strptime(str(d), "%Y-%m-%d").replace(hour=23, minute=59,
                                                                     tzinfo=tzdaten.berlin()).timestamp())


# ---------------------------------------------------------------- Diagnosen
class Diagnosen(list):
    """Hinweise, Warnungen und Fehler des Parsers. Jede Diagnose ist ein dict: stufe (fehler, warnung, hinweis), art,
    text, zeile (in der Datei), baustein (ID oder None), titel (Bausteintitel), zeile_im_baustein (1 = Überschrift)."""

    def __init__(self, name="kurs.md"):
        super().__init__()
        self.name = name
        self.aktuell = None     # (id, titel, startzeile) des Elements, das gerade gelesen wird

    def add(self, stufe, art, text, zeile=None, element=None):
        d = {"stufe": stufe, "art": art, "text": text, "zeile": zeile, "element": element,
             "baustein": None, "titel": None, "zeile_im_baustein": None}
        if self.aktuell:
            bid, titel, start = self.aktuell
            d["baustein"], d["titel"] = bid, titel
            if zeile:
                d["zeile_im_baustein"] = zeile - start + 1
        self.append(d)
        return d

    def fehler(self, text, zeile=None, element=None, art="format"):
        return self.add("fehler", art, text, zeile, element)

    def warnung(self, text, zeile=None, element=None, art="bild"):
        return self.add("warnung", art, text, zeile, element)

    def hinweis(self, text, zeile=None, element=None, art="hinweis"):
        return self.add("hinweis", art, text, zeile, element)

    def hat_fehler(self):
        return any(d["stufe"] == "fehler" for d in self)

    def zuordnen(self, bausteine):
        """Diagnosen ohne Baustein (aus dem Einlesen) nach Zeile dem Baustein zuordnen."""
        for d in self:
            if d["baustein"] or not d["zeile"]:
                continue
            for b in bausteine:
                if b["zeile"] <= d["zeile"] < b["zeile"] + b["zeilen"]:
                    d["baustein"], d["titel"], d["zeile_im_baustein"] = b["id"], b["titel"], d["zeile"] - b["zeile"] + 1
                    break

    def satz(self, d):
        """Eine Diagnose als Satz wie die Meldungen der CLI: `<Datei> Zeile n (<Element>): <Text>`."""
        wo = self.name + (f" Zeile {d['zeile']}" if d["zeile"] else "")
        if d["element"]:
            wo += f" ({d['element']})"
        kopf = {"fehler": "FEHLER", "warnung": "WARNUNG", "hinweis": "Hinweis"}[d["stufe"]]
        return f"{kopf}: {wo}: {d['text']}"

    def text(self, stufen=("fehler", "warnung", "hinweis")):
        return "\n".join(self.satz(d) for d in self if d["stufe"] in stufen)


# ---------------------------------------------------------------- Bereinigung der Eingabe
ERLAUBTE_TAGS = {"b", "i", "em", "strong", "br", "sup", "sub", "mark"}
# Tag: Name direkt nach „<“ (oder „</“), danach „>“, Leerzeichen oder „/“
_RE_TAG = re.compile(r"<(/?)([A-Za-z][A-Za-z0-9]*)(?=[\s/>])([^<>]*)>")
_RE_KOMMENTAR = re.compile(r"<!--.*?-->")
_RE_SKRIPT = re.compile(r"<(script|style)\b[^<>]*>.*?</\1\s*>", re.I | re.S)
_RE_URL = re.compile(r"\bhttps?://[^\s<>\"'“”„)\]]+")
_RE_LT = re.compile(r"<(?=[A-Za-z/!?])")


def _ist_tag(rest):
    """Rest nach dem Tagnamen: leer, „/“ oder Attribute mit „=“ = Tag; sonst Text wie in `a <b und c> d`."""
    r = rest.strip()
    return r in ("", "/") or "=" in r


def bereinige(s):
    """HTML einer Zeile auf die Allowlist kürzen: erlaubte Tags ohne Attribute, alle anderen Tags entfernt (ihr Text
    bleibt), Kommentare entfernt. Was nur wie ein Tag aussieht (`<b und c>`, `x<y`), bleibt Text mit &lt;.
    Gibt (Zeile, [entfernte Tagnamen])."""
    if "<" not in s:
        return s, []
    entfernt = []
    s = _RE_KOMMENTAR.sub("", s)
    for m in _RE_SKRIPT.finditer(s):          # Skript und Stil samt Inhalt, nicht nur die Tags
        entfernt.append(m.group(1).lower())
    s = _RE_SKRIPT.sub("", s)
    out, pos = [], 0
    for m in _RE_TAG.finditer(s):
        if not _ist_tag(m.group(3)):
            continue                          # bleibt Text, „<“ wird unten maskiert
        out.append(_RE_LT.sub("&lt;", s[pos:m.start()]))
        name = m.group(2).lower()
        if name in ERLAUBTE_TAGS:
            out.append(f"<{m.group(1)}{name}>")
        elif name not in entfernt:
            entfernt.append(name)
        pos = m.end()
    out.append(_RE_LT.sub("&lt;", s[pos:]))
    return "".join(out), entfernt


def adressen(s):
    """Alle Adressen einer Zeile (http und https)."""
    return _RE_URL.findall(s)


def platzhalter_png(w=640, h=400):
    """Hellgraues PNG ohne Text (für fehlende Bilder im nachsichtigen Modus), ohne Pillow."""
    zeile = b"\x00" + bytes([0xE5, 0xE7, 0xEB]) * w
    raw = zeile * h

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


# ---------------------------------------------------------------- Konstanten
ELEMENTE = ["Banner", "Textfeld", "Seite", "Überblick", "Link", "Video", "Lesebuch", "Quiz", "Zuordnen", "Lernkarten",
            "Geschichte", "Lückentext", "Umfrage", "Badge", "Unterabschnitt",
            "Test", "Aufgabe", "Datei", "Verzeichnis", "Forum", "Buch", "Abstimmung", "Glossar"]
DIRECTIVES = ["Vorspann", "Überschrift", "Hervorhebung", "Merke", "Kasten", "Beispiel", "Hinweis", "Schritte", "Vergleich",
              "Bild", "Bildzeile", "Text", "Seite",
              "MC", "RF", "Einsetzen", "Markieren", "Lückentext", "Aussagen", "Schnellquiz", "Kurzantwort",
              "Szene", "Frage", "Ende", "Fahrplan", "Kacheln", "Themenfeld", "Kapitel", "Unterkapitel"]
FRAGEN = {"MC", "RF", "Einsetzen", "Markieren", "Lückentext", "Aussagen", "Schnellquiz"}
# Was eine Direktive an Folgezeilen aufnimmt: nichts, nur eingerückten Inhalt, nur eine Liste, oder Textzeilen
NO_FOLLOW = {"Seite", "Bild", "Bildzeile", "Vorspann", "Überschrift", "Hervorhebung", "Merke", "RF", "Kapitel", "Unterkapitel"}
BOX_DIRS = {"Kasten", "Beispiel", "Hinweis", "Text"}
LIST_DIRS = {"MC", "Schnellquiz", "Aussagen", "Frage", "Fahrplan", "Kacheln", "Themenfeld", "Vergleich", "Schritte", "Kurzantwort"}
TEXT_DIRS = {"Einsetzen", "Markieren", "Lückentext", "Szene", "Ende"}
QUIZ_FRAGEN = {"MC", "RF", "Einsetzen", "Markieren", "Lückentext"}
TEST_FRAGEN = {"MC", "RF", "Kurzantwort"}      # Moodle-Test (questions.xml): nur diese drei Typen
ATTRS = {
    "kurs": {"farbe", "kursbild"},
    "abschnitt": {"teil", "farbe", "kachelbild", "kachelicon", "website", "sichtbar ab", "prototyp"},
    "Unterabschnitt": {"teil", "sichtbar ab", "prototyp"},
    "Banner": {"bild", "untertitel", "name", "sichtbar ab", "prototyp"},
    "Textfeld": {"sichtbar ab", "prototyp"},
    "Seite": {"abschluss", "sichtbar ab", "prototyp"},
    "Überblick": {"name", "nummer", "untertitel", "dauer", "sichtbar ab", "prototyp"},
    "Link": {"anzeige", "abschluss", "sichtbar ab", "prototyp"},
    "Video": {"anzeige", "abschluss", "sichtbar ab", "prototyp"},
    "Lesebuch": {"farbe", "abschluss", "sichtbar ab", "prototyp"},
    "Quiz": {"bestehen", "einleitung", "abschluss", "sichtbar ab", "prototyp"},
    "Zuordnen": {"zonen", "spalten", "breite", "höhe", "hoehe", "titel", "hintergrund", "abschluss", "sichtbar ab", "prototyp"},
    "Lernkarten": {"titel", "beschreibung", "modus", "abschluss", "sichtbar ab", "prototyp"},
    "Geschichte": {"start", "bild", "abschluss", "sichtbar ab", "prototyp"},
    "Lückentext": {"aufgabe", "abschluss", "sichtbar ab", "prototyp"},
    "Umfrage": {"einleitung", "danach", "skala", "sichtbar ab", "prototyp"},
    "Badge": {"beschreibung", "bild", "voraussetzung"},
    "Test": {"bestehen", "einleitung", "versuche", "mischen", "rückmeldung", "rueckmeldung", "je seite", "abschluss",
             "sichtbar ab", "prototyp"},
    "Aufgabe": {"abgabe", "bewertung", "bestehen", "fällig", "faellig", "abschluss", "sichtbar ab", "prototyp"},
    "Datei": {"datei", "abschluss", "sichtbar ab", "prototyp"},
    "Verzeichnis": {"anzeige", "abschluss", "sichtbar ab", "prototyp"},
    "Forum": {"typ", "abschluss", "sichtbar ab", "prototyp"},
    "Buch": {"abschluss", "sichtbar ab", "prototyp"},
    "Abstimmung": {"mehrfach", "ergebnisse", "ändern", "aendern", "abschluss", "sichtbar ab", "prototyp"},
    "Glossar": {"anzeige", "abschluss", "sichtbar ab", "prototyp"},
}
for _t in WEB_TYPEN:
    ATTRS[_t] = ATTRS[_t] | {"website"}       # `website: nein` hält ein Element als Plattform-Aktivität
for _t in ELEMENTE:
    ATTRS[_t] = ATTRS[_t] | {"id"}            # Baustein-ID für die Kursmappe (2.0), ohne Wirkung im Kurs
_RE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$")
ABSCHLUSS = {"ansehen": "view", "bestehen": "pass", "keine": "none", "manuell": "manual", "abgabe": "submit",
             "beitrag": "post", "eintrag": "entry"}
# Welche Abschlussarten ein Typ kennt (sonst: ansehen, keine, manuell; H5P und Quiz zusätzlich bestehen)
ABSCHLUSS_TYP = {"Test": {"bestehen", "ansehen", "keine", "manuell"}, "Aufgabe": {"abgabe", "ansehen", "keine", "manuell"},
                 "Forum": {"beitrag", "ansehen", "keine", "manuell"}, "Abstimmung": {"abgabe", "ansehen", "keine", "manuell"},
                 "Glossar": {"eintrag", "ansehen", "keine", "manuell"}}
FORUM_TYP = {"allgemein": "general", "frage-antwort": "qanda", "je person": "eachuser", "blog": "blog"}
ERGEBNISSE = {"nie": 0, "nach abgabe": 1, "nach ende": 2, "immer": 3}
GLOSSAR_ANZEIGE = {"wörterbuch": "dictionary", "woerterbuch": "dictionary", "fortlaufend": "continuous",
                   "lexikon": "encyclopedia", "faq": "faq", "liste": "entrylist"}
JA = ("ja", "yes", "true", "1")
ANZEIGE = {"eingebettet": "embed", "automatisch": "auto", "neues fenster": "open", "popup": "popup"}
NEIN = ("nein", "no", "false", "0", "aus")
# Website-Modus: eingebettet = im Plattform-Rahmen (iframe), vollbild = Datei füllt das Fenster (Moodle „Öffnen“),
# neues fenster = Pop-up (Moodle-Anzeige 3 ist im Plattformstandard nicht freigegeben); textfeld = jede Übung ein Block
# im Textfeld, ohne iframe (AP7b)
WEB_ANZEIGE = {"ja": "embed", "eingebettet": "embed", "vollbild": "open", "neues fenster": "popup", "popup": "popup",
               "textfeld": "textfeld"}
FARBEN = {"rot": "#BE123C", "grün": "#15803D", "gruen": "#15803D", "blau": "#1D5FD1", "orange": "#B45309", "lila": "#6D28D9"}
SKALA = ["1 trifft gar nicht zu", "2", "3", "4", "5 trifft voll zu"]
OK = "✔✓"
NOK = "✘✗✕"

_RE_DIRECTIVE = re.compile(r"^([A-Za-zÄÖÜäöü]+)(?:\s*\(([^)]*)\))?:\s*(.*)$")
_RE_ATTR = re.compile(r"^([a-zäöüß][a-zäöüß ]{1,24}):\s*(.*)$", re.I)
_RE_LIST = re.compile(r"^(\s*)(?:[-*•]|\d+\.)\s+(.*)$")
_RE_BULLET = re.compile(r"^(\s*)[-*•]\s+(.*)$")
_RE_NUM = re.compile(r"^\d+\.\s+")
_RE_TIME_END = re.compile(r"\s*(?:·\s*)?\(?(?:ca\.\s*)?\d+\s*min\.?\)?\s*$")


def _clean(s):
    """Quellen-, Zweck- und Bezugsmarker entfernen (nur Drehbuch, nie Kurs)."""
    s = re.sub(r"\s*\[(?:Quelle:|Zweck:|KI\b)[^\]]*\]", "", s)
    s = re.sub(r"\s*\(←[^)]*\)", "", s)
    return s.rstrip()


def _strip_time(s):
    return _RE_TIME_END.sub("", s).rstrip()


_HUE = T.HUE     # Akzentfarbe des Kurses für Inline-Markierungen, gesetzt in Parser.parse


def inl(s):
    """Inline-Markdown: **fett** -> <b>, *kursiv* -> <i>, ==markiert== -> Hervorhebung. HTML bleibt unverändert."""
    s = re.sub(r"\*\*(?=\S)(.+?)(?<=\S)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![\w*])", r"<i>\1</i>", s)
    s = re.sub(r"==(?=\S)(.+?)(?<=\S)==", lambda m: T.mark(m.group(1), _HUE), s)
    return s


def _split(s, sep=" · "):
    return [x.strip() for x in s.split(sep)]


def _is_emoji(tok):
    return bool(tok) and not any(c.isalnum() for c in tok)


def _emoji_split(text):
    parts = text.split(None, 1)
    if len(parts) == 2 and _is_emoji(parts[0]):
        return parts[0], parts[1]
    return "", text


def _answer(a):
    """'✔Text → Rückmeldung' -> (text, correct, feedback)."""
    a = a.strip()
    correct = bool(a) and a[0] in OK
    if correct:
        a = a[1:].strip()
    fb = ""
    if " → " in a:
        a, fb = a.split(" → ", 1)
    return inl(a.strip()), correct, inl(fb.strip())


# ---------------------------------------------------------------- LaTeX und Liefertexte
_RE_LIEFER = re.compile(r"^(?:(?:Hinweis|Notiz|Anmerkung|Tipp) (?:für|an) die Lehrkraft|Für die Lehrkraft)\s*:", re.I)
_RE_MATHE = re.compile(r"\$\$(.+?)\$\$|\\\((.+?)\\\)|\\\[(.+?)\\\]|(?<![\w$])\$(?=\S)([^$]+?)(?<=\S)\$(?![\w$])")
_HOCH = str.maketrans("0123456789+-−n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻ⁿ")
_TEX = {"cdot": "×", "times": "×", "approx": "≈", "neq": "≠", "ne": "≠", "leq": "≤", "le": "≤", "geq": "≥", "ge": "≥",
        "pm": "±", "pi": "π", "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ", "circ": "°",
        "degree": "°", "Rightarrow": "⇒", "rightarrow": "→", "to": "→", "cdots": "…", "ldots": "…", "dots": "…",
        "quad": " ", "qquad": " ", "left": "", "right": "", "displaystyle": "", ",": " ", ";": " ", "!": "", " ": " "}


def _hoch(e):
    e = e.strip()
    if e in ("\\circ", "°"):
        return "°"
    return e.translate(_HOCH) if all(c in "0123456789+-−n" for c in e) else f"<sup>{e}</sup>"


def _tex(t):
    """Einen LaTeX-Ausdruck in Klartext umsetzen; Rest-Befehle werden gemeldet."""
    t = t.strip()
    t = re.sub(r"\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}", r"\1", t)
    for _ in range(5):                                   # verschachtelte Wurzeln und Brüche von innen nach außen
        t2 = re.sub(r"\\sqrt\{([^{}]*)\}", lambda m: "√" + (m.group(1) if re.fullmatch(r"[\w²³,.]+", m.group(1))
                                                             else f"({m.group(1)})"), t)
        t2 = re.sub(r"\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}",
                    lambda m: "/".join(x if re.fullmatch(r"[\w,.²³√]+", x) else f"({x})" for x in m.groups()), t2)
        if t2 == t:
            break
        t = t2
    t = re.sub(r"\^\{\s*\\circ\s*\}|\^\\circ", "°", t)
    t = re.sub(r"\^\{([^{}]*)\}", lambda m: _hoch(m.group(1)), t)
    t = re.sub(r"\^([0-9n])", lambda m: _hoch(m.group(1)), t)
    t = t.replace("{,}", ",").replace("{.}", ".")
    t = re.sub(r"\\([A-Za-z]+|[,;! ])", lambda m: _TEX.get(m.group(1), m.group(0)), t)
    t = re.sub(r"(?<!\\)[{}]", "", t)
    t = re.sub(r"\s*([≈×≠≤≥])\s*", r" \1 ", t)
    return re.sub(r"\s{2,}", " ", t).strip()


def _latex(s):
    """LaTeX-Formeln einer Zeile in Klartext: ($$…$$, \\(…\\), \\[…\\], $…$). Gibt (Zeile, nicht umgesetzte Befehle)."""
    if "$" not in s and "\\(" not in s and "\\[" not in s:
        return s, []
    s = _RE_MATHE.sub(lambda m: _tex(next(g for g in m.groups() if g is not None)), s)
    return s, sorted(set(re.findall(r"\\[A-Za-z]+", s)))


def _zeilen(nums):
    return ", ".join(map(str, nums))


# ---------------------------------------------------------------- Zeilen
class Zeilen:
    def __init__(self, path=None, text=None, name=None, diag=None):
        if text is None:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        raw = text.splitlines()
        # Drehbuch-Zeilen für die Lehrkraft, nie im Kurs (Zeitcheck, Änderungsliste, Annahmen, Abweichungen, offene Fragen,
        # Bildwunsch und Bildprompt)
        meta = re.compile(r"^(Zeit\b.*\d+\s*min|v\d+:|Angenommen:|Abweichung:|Offen:|Bildwunsch:|Bildprompt:)")
        self.name = name or (os.path.basename(path) if path else "kurs.md")
        self.diag = diag if diag is not None else Diagnosen(self.name)
        self.adressen = []      # (Zeile, Adresse) aller http(s)-Adressen der Datei
        self.lines, liefer, latex, rest, html = [], [], [], [], {}
        for i, s in enumerate(raw):
            if meta.match(s):
                s = ""
            elif _RE_LIEFER.match(s):        # Liefertext aus SKILL.md, gehört in die Antwort, nicht in den Kurs
                liefer.append(i + 1)
                s = ""
            else:
                s, entfernt = bereinige(s)
                if entfernt:
                    html[i + 1] = entfernt
                self.adressen += [(i + 1, a) for a in adressen(s)]
                s2, offen = _latex(s)
                if s2 != s:
                    latex.append(i + 1)
                rest += [(i + 1, b) for b in offen]
                s = _clean(s2)
            self.lines.append((i + 1, s))
        if liefer:
            self.diag.hinweis("Hinweis für die Lehrkraft gehört in die Lieferung, nicht in die Kursdatei; ignoriert"
                              + (f" (Zeilen {_zeilen(liefer)})" if len(liefer) > 1 else ""), liefer[0], art="liefertext")
        if latex:
            self.diag.hinweis("LaTeX in Klartext umgesetzt (a² + b² = c², √, °); in der Kursdatei Formeln ohne LaTeX "
                              "schreiben" + (f" (Zeilen {_zeilen(latex)})" if len(latex) > 1 else ""), latex[0], art="latex")
        for ln, b in rest:
            self.diag.hinweis(f"LaTeX-Befehl {b} nicht umgesetzt, bitte als Text schreiben", ln, art="latex")
        for ln, tags in html.items():
            self.diag.hinweis(f"HTML bereinigt: <{'>, <'.join(sorted(set(tags)))}> entfernt (erlaubt sind "
                              f"{', '.join(sorted(ERLAUBTE_TAGS))})", ln, art="html")
        for ln, a in self.adressen:
            if a.startswith("http://"):
                self.diag.hinweis(f"Adresse ohne https: {a}", ln, art="adresse")
        self.pos = 0

    def fehler(self, ln, element, msg):
        where = f"{self.name} Zeile {ln}" + (f" ({element})" if element else "")
        raise KursdateiFehler(f"{where}: {msg}")


# ---------------------------------------------------------------- Textkörper -> Blöcke
def _directive(s):
    m = _RE_DIRECTIVE.match(s)
    if not m:
        return None
    name = m.group(1)
    for d in DIRECTIVES:
        if name.lower() == d.lower():
            return d, (m.group(2) or "").strip(), m.group(3).strip()
    return None


_RE_VOR_FRAGE = re.compile(r"^(\d+\.\s+)?(?!(?:MC|RF|Einsetzen|Markieren|Lückentext)\b)(.+?[.?!])\s+"
                           r"(MC|RF|Einsetzen|Markieren|Lückentext):\s*(.*)$")


def _situation_vor_frage(lines):
    """Quiz und Test (AP13.3): eine Frage darf mit einem Situationssatz beginnen. `1. Situation. Einsetzen: Aufgabe`
    und `1. Situation.` mit `Einsetzen: Aufgabe` in der nächsten Zeile werden zu `1. Einsetzen: Situation. Aufgabe`."""
    out = []
    for idx, (ln, s) in enumerate(lines):
        m = _RE_VOR_FRAGE.match(s.strip()) if not s.startswith(" ") else None
        if m and not _directive(_RE_NUM.sub("", s.strip())):
            out.append((ln, f"{m.group(1) or ''}{m.group(3)}: {m.group(2)} {m.group(4)}".rstrip()))
            continue
        prev = out[-1] if out else None
        st = _RE_NUM.sub("", s.strip())
        d = _directive(st)
        if (d and d[0] in QUIZ_FRAGEN and prev is not None and prev[1].strip() and not prev[1].startswith(" ")
                and (len(out) < 2 or not out[-2][1].strip()) and not _directive(_RE_NUM.sub("", prev[1].strip()))
                and not _RE_BULLET.match(prev[1]) and "*" not in prev[1] and not any(c in prev[1] for c in OK + NOK)
                and not prev[1].lstrip().startswith(("<", "|", "#")) and re.search(r"[.?!]$", prev[1].strip())
                and not re.match(r"^[a-zäöüß][a-zäöüß ]{1,24}:\s", prev[1].strip())):
            num = _RE_NUM.match(prev[1].strip())
            vor = _RE_NUM.sub("", prev[1].strip())
            out[-1] = (prev[0], f"{num.group(0) if num else ''}{d[0]}: {vor} {d[2]}".rstrip())
            continue
        out.append((ln, s))
    return out


_RE_ELEMENT_KOPF = re.compile(r"^#{3,4}\s+([A-Za-zÄÖÜäöüß]+)\s*:")


def normalisiere(text):
    """Kursdatei in die Schreibweise bringen, die alle Leser erwarten (AP13.3, `gen.api.pruefe`): `phase: …` direkt unter
    einer Elementüberschrift fällt weg, Fragen mit Situationssatz in Quiz und Test werden zu `1. Einsetzen: Situation.
    Aufgabe` (wie `_situation_vor_frage`). Sonst bleibt jede Zeile, wie sie ist."""
    zeilen = text.split("\n")
    out, typ, kopf, block = [], None, False, []

    def fertig():
        if block:
            out.extend(s for _, s in _situation_vor_frage(block))
            block.clear()
    for z in zeilen:
        m = _RE_ELEMENT_KOPF.match(z)
        if m or z.startswith("#"):
            fertig()
            typ, kopf = (m.group(1) if m else None), bool(m)
            out.append(z)
            continue
        if kopf and z.strip() and re.match(r"^phase:\s", z, re.I):
            continue
        if kopf and z.strip() and not _RE_ATTR.match(z):
            kopf = False
        if typ in ("Quiz", "Test"):
            block.append((0, z))
        else:
            out.append(z)
    fertig()
    return "\n".join(out)


def parse_body(lines, zl, element, quiz=False):
    """lines: [(ln, text)] (ohne Überschriften). Ergebnis: Liste von Blöcken (dict, kind=...)."""
    blocks = []
    if quiz:
        lines = _situation_vor_frage(lines)
    i, n = 0, len(lines)
    lst_re = _RE_BULLET if quiz else _RE_LIST

    def classify(s):
        if quiz:
            s = _RE_NUM.sub("", s)
        return s

    while i < n:
        ln, s = lines[i]
        if not s.strip():
            i += 1
            continue
        if s.startswith("#"):
            zl.fehler(ln, element, "Überschrift an dieser Stelle nicht erlaubt (#### nur in einem Unterabschnitt)")
        st = classify(s).strip() if not s.startswith(" ") else s.strip()
        d = _directive(st)
        if d is None and quiz and (OK[0] in st or OK[1] in st) and not lst_re.match(s):
            d = ("MC", "", st)
        if d:
            name, title, rest = d
            indented, follow, lst = [], [], []
            j = i + 1
            lose = False
            if name in BOX_DIRS:
                while j < n:
                    ln2, s2 = lines[j]
                    if s2.startswith("  "):
                        indented.append((ln2, s2[2:]))
                        j += 1
                    elif not s2.strip() and j + 1 < n and lines[j + 1][1].startswith("  ") and indented:
                        indented.append((ln2, ""))
                        j += 1
                    else:
                        break
                # AP13.3: Inhalt nicht eingerückt – die folgenden Zeilen bis zur Leerzeile oder Überschrift gehören dazu
                if not indented and name in ("Kasten", "Beispiel", "Hinweis"):
                    while j < n and lines[j][1].strip() and not lines[j][1].startswith("#"):
                        indented.append((lines[j][0], lines[j][1].strip()))
                        j += 1
                    lose = bool(indented)
            elif name in LIST_DIRS:
                k2 = j                                   # Leerzeilen zwischen `Schritte: …` und der Liste überspringen
                while k2 < n and not lines[k2][1].strip():
                    k2 += 1
                if k2 > j and k2 < n and " · " not in rest and lst_re.match(lines[k2][1]) \
                        and not _directive(classify(lines[k2][1]).strip()):
                    j = k2
                while j < n:
                    m = lst_re.match(lines[j][1])
                    if not m or _directive(classify(lines[j][1]).strip()):
                        break
                    lst.append((lines[j][0], len(m.group(1)), m.group(2).strip()))
                    j += 1
            elif name in TEXT_DIRS:
                while j < n:
                    ln2, s2 = lines[j]
                    if not s2.strip() or s2.startswith("#") or _directive(classify(s2).strip()):
                        break
                    if quiz and (OK[0] in s2 or OK[1] in s2) and not lst_re.match(s2):
                        break
                    follow.append((ln2, s2.strip()))
                    j += 1
            blocks.append({"kind": "dir", "name": name, "title": title, "rest": rest, "ln": ln,
                           "indented": indented, "follow": follow, "list": lst, "lose": lose})
            i = j
            continue
        if s.lstrip().startswith("<"):
            parts = []
            while i < n and lines[i][1].lstrip().startswith("<"):
                parts.append(lines[i][1].strip())
                i += 1
            blocks.append({"kind": "raw", "html": "".join(parts), "ln": ln})
            continue
        m = _RE_LIST.match(s)
        if m and not quiz:
            items = []
            base = len(m.group(1))
            ordered = bool(re.match(r"^\s*\d+\.", s))
            while i < n:
                m2 = _RE_LIST.match(lines[i][1])
                if not m2:
                    break
                ind, txt = len(m2.group(1)), m2.group(2).strip()
                if ind > base and items:
                    items[-1][1].append(txt)
                elif ind == base:
                    items.append([txt, []])
                else:
                    break
                i += 1
            blocks.append({"kind": "list", "ordered": ordered, "items": items, "ln": ln})
            continue
        if s.lstrip().startswith("|"):
            rows, header = [], False
            while i < n and lines[i][1].lstrip().startswith("|"):
                row = lines[i][1].strip().strip("|")
                if re.match(r"^[\s|:-]+$", row):
                    header = header or len(rows) == 1      # `|---|---|` nach der ersten Zeile = Kopfzeile
                else:
                    rows.append([c.strip() for c in row.split("|")])
                i += 1
            blocks.append({"kind": "table", "rows": rows, "header": header, "ln": ln})
            continue
        # Absatz (mindestens die aktuelle Zeile, damit die Schleife immer voranschreitet)
        para = [s.strip()]
        i += 1
        while i < n:
            s2 = lines[i][1]
            if (not s2.strip() or s2.lstrip().startswith(("<", "|", "#")) or lst_re.match(s2)
                    or (quiz and (OK[0] in s2 or OK[1] in s2)) or _directive(classify(s2).strip())):
                break
            para.append(s2.strip())
            i += 1
        blocks.append({"kind": "para", "text": " ".join(para), "ln": ln})
    return blocks


# ---------------------------------------------------------------- Blöcke -> HTML (Textfeld, Seite, Buchtext)
class Kontext:
    def __init__(self, zl, A, hue, element, kacheln=False, parser=None):
        self.zl, self.A, self.hue, self.element = zl, A, hue, element
        self.kacheln = kacheln  # Kurs im Kachelformat: Baustein `Kacheln:` entfällt (doppelt die Kacheln)
        self.parser = parser    # liefert Platzhalter für fehlende Bilder (nachsichtig)
        self.files = []     # (local_path, filename) – Bilder in Textfeld/Seite

    def fehler(self, ln, msg):
        self.zl.fehler(ln, self.element, msg)

    def image(self, ln, name):
        if self.parser is not None:
            return self.parser._image(name, ln, self.element)
        if name not in self.A:
            self.fehler(ln, f"Bild „{name}“ nicht in assets/ (vorhanden: {', '.join(sorted(self.A)) or 'keine'})")
        return self.A[name]


def _list_html(items, ordered):
    out = []
    for txt, sub in items:
        h = inl(txt)
        if sub:
            h += T.bullets([inl(x) for x in sub])
        out.append(h)
    return T.steps(out) if ordered else T.bullets(out)


def _para_join(b):
    return inl(b["rest"].strip())


def block_html(b, k: Kontext):
    """Ein Block -> HTML-String, oder None wenn der Block kein HTML ist (Frage, Bild im Buch …)."""
    kind = b["kind"]
    if kind == "para":
        return T.p(inl(b["text"]))
    if kind == "raw":
        return b["html"]
    if kind == "list":
        return _list_html(b["items"], b["ordered"])
    if kind == "table":
        rows = [[inl(c) for c in r] for r in b["rows"]]
        widths = {len(r) for r in rows}
        if len(widths) != 1:
            k.fehler(b["ln"], f"Tabelle: alle Zeilen brauchen gleich viele Spalten ({', '.join(map(str, sorted(widths)))} gefunden)")
        if b.get("header"):
            return T.table(rows[0], rows[1:], k.hue)
        if widths != {2}:
            k.fehler(b["ln"], "Tabelle: ohne Kopfzeile zwei Spalten (Begriff | Erklärung); "
                              "mehr Spalten brauchen eine Kopfzeile mit `|---|---|` darunter (Vergleichstabelle)")
        return T.kv([tuple(r) for r in rows], k.hue)
    name, ln = b["name"], b["ln"]
    if name == "Vorspann":
        return T.lead(_para_join(b))
    if name == "Überschrift":
        return T.h2(_para_join(b), k.hue)
    if name == "Hervorhebung":
        return T.highlight(_para_join(b), k.hue)
    if name == "Merke":
        return T.merk(_para_join(b), k.hue)
    if name == "Schritte":
        items = [inl(t) for _, _, t in b["list"]]
        if not items:
            k.fehler(ln, "Schritte: Liste `1. Schritt` in den Zeilen darunter erwartet")
        return T.schritte(items, k.hue, inl(b["rest"]))
    if name in ("Kasten", "Beispiel", "Hinweis"):
        if not b["indented"]:
            k.fehler(ln, f"{name} ohne Inhalt – Inhalt um zwei Leerzeichen einrücken")
        if b.get("lose"):
            k.zl.diag.warnung(f"{name}: Inhalt nicht eingerückt, die Zeilen bis zur Leerzeile als Inhalt genommen", ln,
                              k.element, art="einrueckung")
        inner = body_html(parse_body(b["indented"], k.zl, k.element), k)
        title = inl(b["rest"])
        if name == "Beispiel":
            return T.box(title, inner, "#0F766E")
        if name == "Hinweis":
            return T.box(title, inner, "#B45309")
        return T.box(title, inner, k.hue)
    if name == "Vergleich":
        items = b["list"]
        if b["indented"]:
            items = [(l, ind, t) for l, ind, t in _list_from_indented(b["indented"])]
        cols = _nested(items)
        if len(cols) != 2 or not all(sub for _, sub in cols):
            k.fehler(ln, "Vergleich braucht genau zwei Listenpunkte mit je einer eingerückten Unterliste")
        hues = ["#BE123C", "#15803D"]
        titles = []
        for idx, (t, _) in enumerate(cols):
            t = t.rstrip(":").strip()
            m = re.match(r"^(.*?)\s*\((rot|grün|gruen|blau|orange|lila)\)\s*$", t)
            if m:
                t, hues[idx] = m.group(1), FARBEN[m.group(2)]
            titles.append(inl(t))
        return T.two_col(titles[0], T.bullets([inl(x) for x in cols[0][1]]),
                         titles[1], T.bullets([inl(x) for x in cols[1][1]]), hues[0], hues[1])
    if name == "Bild":
        parts = _split(b["rest"], "|")
        img = k.image(ln, parts[0])
        k.files.append((img[0], parts[0]))
        return T.img(parts[0], inl(parts[1]) if len(parts) > 1 else "", inl(parts[2]) if len(parts) > 2 else None)
    if name == "Bildzeile":
        parts = _split(b["rest"], "|")
        if len(parts) < 3:
            k.fehler(ln, "Bildzeile: `Bildzeile: datei.png | Alt-Text | Text` erwartet")
        img = k.image(ln, parts[0])
        k.files.append((img[0], parts[0]))
        return T.img_row(parts[0], inl(parts[1]), inl(" | ".join(parts[2:])))
    if name == "Text":
        parts = [T.p(_para_join(b))] if b["rest"] else []
        if b["indented"]:
            parts.append(body_html(parse_body(b["indented"], k.zl, k.element), k))
        return "".join(parts)
    if name == "Fahrplan":
        items = []
        for num, (_, _, t) in enumerate(b["list"], 1):
            icon, t = _emoji_split(t)
            parts = _split(t)
            items.append((num, inl(parts[0]), inl(parts[1]) if len(parts) > 1 else "", icon))
        return T.fahrplan(items, k.hue, b["rest"] or "Dein Weg durch das Themenfeld")
    if name == "Kacheln":
        if k.kacheln:
            k.zl.diag.hinweis(f"Kachelformat – Baustein „Kacheln:“ in {k.element} weggelassen (doppelt die Kacheln)", ln,
                              art="kachel")
            return ""
        tiles = []
        for num, (l2, _, t) in enumerate(b["list"], 1):
            icon, t = _emoji_split(t)
            parts = _split(t)
            hue = next((x for x in parts[1:] if x.startswith("#")), k.hue)
            full = "ausgearbeitet" in parts[1:]
            tiles.append((num, inl(parts[0]), hue, full, icon))
        return T.tf_strip(tiles, b["rest"] or "Die acht Themenfelder")
    if name == "Themenfeld":
        parts = _split(b["rest"], "|")
        les = [inl(t) for _, _, t in b["list"]]
        return T.tf_info(inl(parts[0]), les, inl(parts[1]) if len(parts) > 1 else "", k.hue)
    if name in FRAGEN:
        k.fehler(ln, f"{name} ist nur in Lesebuch oder Quiz erlaubt")
    if name == "Kurzantwort":
        k.fehler(ln, "Kurzantwort ist nur im Test erlaubt")
    if name == "Seite":
        k.fehler(ln, "„Seite:“ ist nur im Lesebuch erlaubt (Seitenwechsel)")
    if name in ("Kapitel", "Unterkapitel"):
        k.fehler(ln, f"„{name}:“ ist nur im Buch erlaubt")
    k.fehler(ln, f"{name} ist hier nicht erlaubt")


def _list_from_indented(indented):
    out = []
    for ln, s in indented:
        m = _RE_LIST.match(s)
        if m:
            out.append((ln, len(m.group(1)), m.group(2).strip()))
    return out


def _nested(items):
    """[(ln, indent, text)] -> [(text, [subtexts])]."""
    out = []
    base = items[0][1] if items else 0
    for _, ind, t in items:
        if ind > base and out:
            out[-1][1].append(t)
        else:
            out.append((t, []))
    return out


def body_html(blocks, k: Kontext):
    return "".join(block_html(b, k) for b in blocks)


# ---------------------------------------------------------------- Fragen (H5P-Unterinhalte und Website)
def frage_daten(b, k: Kontext):
    """Frage aus Lesebuch oder Quiz -> (typ, titel, daten); H5P (frage) und Website (gen.website) bauen daraus.
    MC: (frage, [(text, richtig, rückmeldung)]); RF: (aussage, richtig, rm_richtig, rm_falsch); Einsetzen, Markieren:
    (aufgabe, text mit *Lücken*); Lückentext: (aufgabe, [absätze]); Aussagen: (einleitung, [[richtig, falsch …]]);
    Schnellquiz: [(frage, [richtig, falsch …])]."""
    name, title, rest, ln = b["name"], b["title"], b["rest"], b["ln"]
    if name == "MC":
        if " · " in rest:
            q, *ans = _split(rest)
        else:
            q, ans = rest, [t for _, _, t in b["list"]]
        answers = [_answer(a) for a in ans]
        if len(answers) < 2:
            k.fehler(ln, "MC: mindestens zwei Antworten (` · `-getrennt oder als `- `-Liste)")
        if not any(c for _, c, _ in answers):
            k.fehler(ln, "MC: keine Antwort mit ✔ markiert")
        return name, title or "Frage", (inl(q), answers)
    if name == "RF":
        m = re.search(f"[{OK}{NOK}]", rest)
        if not m:
            k.fehler(ln, "RF: Aussage mit ✔ (wahr) oder ✘ (falsch) markieren")
        statement, correct, tail = rest[:m.start()].strip(), rest[m.start()] in OK, rest[m.end():]
        fb_ok = fb_nok = ""
        for seg in tail.split("→")[1:]:
            seg = seg.strip()
            low = seg.lower()
            if low.startswith("richtig:"):
                fb_ok = inl(seg[8:].strip())
            elif low.startswith("falsch:"):
                fb_nok = inl(seg[7:].strip())
            else:
                k.fehler(ln, "RF: Rückmeldung als `→ richtig: …` und `→ falsch: …` angeben")
        return name, title or "Richtig oder falsch?", (inl(statement), correct, fb_ok, fb_nok)
    if name == "Einsetzen":
        text = "\n".join(t for _, t in b["follow"])
        if not text:
            k.fehler(ln, "Einsetzen: Text mit *Lücken* in den Zeilen darunter erwartet")
        return name, title or "Wörter zuordnen", (inl(rest), text)
    if name == "Markieren":
        text = " ".join(t for _, t in b["follow"])
        if not text:
            k.fehler(ln, "Markieren: Text mit *markierten* Wörtern in den Zeilen darunter erwartet")
        return name, title or "Wörter markieren", (inl(rest), text)
    if name == "Lückentext":
        qs = [t for _, t in b["follow"]]
        if not qs:
            k.fehler(ln, "Lückentext: Text mit *Lücken* in den Zeilen darunter erwartet")
        return name, title or "Lückentext", (inl(rest), qs)
    if name == "Aussagen":
        groups = []
        for l2, _, t in b["list"]:
            stmts = [_answer(a) for a in _split(t)]
            if len(stmts) < 2:
                k.fehler(l2, "Aussagen: je Gruppe mindestens zwei Aussagen, ` · `-getrennt")
            ok = [s for s in stmts if s[1]] or stmts[:1]
            groups.append([ok[0][0]] + [s[0] for s in stmts if s is not ok[0]])
        if not groups:
            k.fehler(ln, "Aussagen: Gruppen als `- `-Liste darunter erwartet")
        return name, title or "Zusammenfassung", (inl(rest), groups)
    if name == "Schnellquiz":
        qs = []
        for l2, _, t in b["list"]:
            q, *ans = _split(t)
            ans = [_answer(a) for a in ans]
            ok = [a for a in ans if a[1]] or ans[:1]
            if len(ans) < 2:
                k.fehler(l2, "Schnellquiz: `Frage? · ✔richtig · falsch · …` erwartet")
            qs.append((inl(q), [ok[0][0]] + [a[0] for a in ans if a is not ok[0]]))
        return name, title or "Schnellquiz", qs
    k.fehler(ln, f"{name}: kein Fragetyp")


def frage(b, k: Kontext):
    name, title, d = frage_daten(b, k)
    if name == "MC":
        q, answers = d
        return H.multichoice(q, answers, title=title, single=sum(1 for _, c, _ in answers if c) == 1)
    if name == "RF":
        return H.truefalse(*d, title=title)
    if name == "Einsetzen":
        return H.dragtext(*d, title=title)
    if name == "Markieren":
        return H.markwords(*d, title=title)
    if name == "Lückentext":
        return H.blanks(*d, title=title)
    if name == "Aussagen":
        return H.summary(*d, title=title)
    return H.singlechoiceset(d, title=title)


def test_frage(b, k: Kontext):
    """Frage eines Moodle-Tests (questions.xml): MC, RF, Kurzantwort -> gen.mbz.Frage."""
    name, title, rest, ln = b["name"], b["title"], b["rest"], b["ln"]
    if name == "MC":
        if " · " in rest:
            q, *ans = _split(rest)
        else:
            q, ans = rest, [t for _, _, t in b["list"]]
        answers = [_answer(a) for a in ans]
        if len(answers) < 2:
            k.fehler(ln, "MC: mindestens zwei Antworten (` · `-getrennt oder als `- `-Liste)")
        if not any(c for _, c, _ in answers):
            k.fehler(ln, "MC: keine Antwort mit ✔ markiert")
        return MultiChoice(f"<p>{inl(q)}</p>", answers, name=title or "Frage")
    if name == "RF":
        m = re.search(f"[{OK}{NOK}]", rest)
        if not m:
            k.fehler(ln, "RF: Aussage mit ✔ (wahr) oder ✘ (falsch) markieren")
        statement, correct, tail = rest[:m.start()].strip(), rest[m.start()] in OK, rest[m.end():]
        fb_ok = fb_nok = ""
        for seg in tail.split("→")[1:]:
            seg = seg.strip()
            low = seg.lower()
            if low.startswith("richtig:"):
                fb_ok = inl(seg[8:].strip())
            elif low.startswith("falsch:"):
                fb_nok = inl(seg[7:].strip())
            else:
                k.fehler(ln, "RF: Rückmeldung als `→ richtig: …` und `→ falsch: …` angeben")
        # Rückmeldung „richtig:“ gehört zur richtigen Antwort, „falsch:“ zur falschen
        fb_true, fb_false = (fb_ok, fb_nok) if correct else (fb_nok, fb_ok)
        return TrueFalse(f"<p>{inl(statement)}</p>", correct, fb_true, fb_false, name=title or "Richtig oder falsch?")
    if name == "Kurzantwort":
        if " · " in rest:
            q, *ans = _split(rest)
        else:
            q, ans = rest, [t for _, _, t in b["list"]]
        ans = [a.strip().lstrip("".join(OK)).strip() for a in ans if a.strip()]
        if not ans:
            k.fehler(ln, "Kurzantwort: `Frage? · Antwort · Alternative` (oder Antworten als `- `-Liste) erwartet")
        return ShortAnswer(f"<p>{inl(q)}</p>", ans, name=title or "Kurzantwort")
    k.fehler(ln, f"{name}: im Test nur {', '.join(sorted(TEST_FRAGEN))}")


# ---------------------------------------------------------------- Elemente
class Parser:
    def __init__(self, path=None, A=None, sb=None, proto=False, text=None, nachsichtig=False, name=None, assets_dir=None,
                 platzhalter=None):
        self.diag = Diagnosen(name or (os.path.basename(path) if path else "kurs.md"))
        self.zl = Zeilen(path, text, name, self.diag)
        self.A = A if A is not None else {}
        self.assets_dir = assets_dir or (os.path.join(os.path.dirname(os.path.abspath(path)), "assets") if path
                                         else os.path.join(os.getcwd(), "assets"))
        self.sb = sb or {}
        self.proto = proto
        self.nachsichtig = nachsichtig      # Fehler je Element sammeln statt abbrechen
        self.platzhalter = nachsichtig if platzhalter is None else platzhalter   # fehlende Bilder: Warnung + Platzhalter
        self.bausteine = []     # AST für die Oberfläche: ein dict je Element (id, typ, titel, abschnitt, zeile, status …)
        self.abschnitte = []    # (titel, zeile, angaben, [baustein-ids])
        self._ids = {}          # (abschnitt, typ, titel) -> Anzahl, für stabile IDs bei gleichen Titeln
        self._explizit = set()  # vergebene `id:`-Angaben
        self._platzhalter = None    # Ordner mit Platzhalterbildern (nachsichtig)
        self.abschnitt = None       # Titel des aktuellen Abschnitts (für Baustein-IDs)
        self.unterabschnitt = None  # Titel des aktuellen Unterabschnitts
        self.titel = None
        self.kurs_attr = {}
        self.sections = []
        self.parts = {}
        self.badges = []        # (ln, name, attrs)
        self.all_items = []
        self.banner = False     # Banner vorhanden -> Überblickskarten ohne Titel (Doppelung)
        self.banner_bild = None  # Bild des Banners; Kursbild, wenn `kursbild:` fehlt (beide textfrei)
        self.web = None         # Website des aktuellen Abschnitts (Website-Modus, gen/website.py)
        self.web_titel = set()  # Titel der Elemente, die in einer Website aufgegangen sind
        self.websites = []      # (Abschnittstitel, Pfad der HTML-Datei)
        self.textfeld = False   # Textfeld-Modus im aktuellen Abschnitt: Übungen als Block im Textfeld (AP7b)
        self._abschnitt_web = ""   # Wert von `website:` im aktuellen Abschnitt (AP13.3: am Element geduldet)
        self.textfelder = []    # (Titel, HTML, Dateien) aller Blöcke, für die Vorschau
        try:
            self.kacheln = moodle_format((self.sb.get("kurs") or {}).get("format")) == "tiles"
        except ValueError:
            self.kacheln = False    # build.py meldet das unbekannte Format
        self.allg = False       # aktueller Abschnitt ist Allgemeines (Abschnitt 0)
        self.badge_titel = self._badge_voraussetzungen()   # bleiben im Website-Modus Aktivitäten (Abschluss zählt)
        wk = (self.sb.get("kurs") or {}).get("website")
        self.web_standard = self._web_anzeige(wk, 0, "Steckbrief kurs.website") if wk not in (None, False) else None

    # ----- Hilfen
    def fehler(self, ln, element, msg):
        self.zl.fehler(ln, element, msg)

    def _badge_voraussetzungen(self):
        """Titel aus `voraussetzung:` aller Badges (Vorlauf, weil Badges erst am Ende aufgelöst werden)."""
        out, im_badge = set(), False
        for _, s in self.zl.lines:
            h = re.match(r"^#{1,4}\s+(\w+):", s)
            if h:
                im_badge = h.group(1).lower() == "badge"
            elif im_badge and s.lower().startswith("voraussetzung:"):
                out |= {_strip_time(t) for t in _split(s.split(":", 1)[1], "|")}
        return out

    def _web_anzeige(self, v, ln, element):
        """website: ja | eingebettet | vollbild | neues fenster | popup | nein -> Moodle-Anzeige oder None."""
        v = "ja" if v is True else str(v).strip().lower()
        if v in NEIN:
            return None
        if v not in WEB_ANZEIGE:
            self.fehler(ln, element, f"website „{v}“: erlaubt sind ja, {', '.join(list(WEB_ANZEIGE)[1:])}, nein")
        return WEB_ANZEIGE[v]

    def _heading(self, s):
        m = re.match(r"^(#{1,4})\s+(.*)$", s)
        return (len(m.group(1)), _strip_time(m.group(2).strip())) if m else None

    def _attrs(self, lines, allowed, element):
        """Angaben `schlüssel: wert` direkt nach der Überschrift. Gibt (attrs, restliche Zeilen)."""
        attrs = {}
        i = 0
        while i < len(lines):
            ln, s = lines[i]
            if not s.strip():
                i += 1
                continue
            m = _RE_ATTR.match(s)
            if not m or s.startswith(" ") or m.group(2).startswith("//"):
                break
            key = m.group(1).strip().lower()
            # AP13.3: `phase: …` (die Liste im Text nennt die Phase) und `website:` mit dem Wert des Abschnitts am
            # Element werden still übergangen
            if (key == "phase" and allowed is not ATTRS["kurs"]) or (
                    key == "website" and allowed is not ATTRS["abschnitt"] and self._abschnitt_web
                    and m.group(2).strip().lower() == self._abschnitt_web):
                i += 1
                continue
            if key in allowed:
                attrs[key] = m.group(2).strip()
                # `versuche: 2 · rückmeldung: sofort · einleitung: …` in einer Zeile: weitere Angaben abtrennen
                teile = attrs[key].split(" · ")
                if len(teile) > 1 and any((m2 := _RE_ATTR.match(t)) and m2.group(1).strip().lower() in allowed
                                          for t in teile[1:]):
                    attrs[key] = teile[0].strip()
                    k = key
                    for t in teile[1:]:
                        m2 = _RE_ATTR.match(t)
                        if m2 and m2.group(1).strip().lower() in allowed:
                            k = m2.group(1).strip().lower()
                            attrs[k] = m2.group(2).strip()
                        else:
                            attrs[k] += " · " + t
                i += 1
                continue
            if _directive(s.strip()) or key[0].isupper() or s[0].isupper():
                break
            self.fehler(ln, element, f"unbekannte Angabe „{key}“ (erlaubt: {', '.join(sorted(allowed))})")
        for uml, ascii_ in (("höhe", "hoehe"), ("fällig", "faellig"), ("rückmeldung", "rueckmeldung"), ("ändern", "aendern")):
            if uml in attrs:
                attrs[ascii_] = attrs.pop(uml)
        return attrs, lines[i:]

    def _skip(self, attrs):
        return self.proto and attrs.get("prototyp", "").lower() in ("nein", "no", "false", "0")

    def _hue(self, attrs, inherit, ln=1, element=None):
        f = attrs.get("farbe", "").strip().strip('"\'')
        if not f:
            return inherit
        if f.lower() in FARBEN:
            return FARBEN[f.lower()]
        if not re.match(r"^#[0-9A-Fa-f]{6}$", f):
            self.fehler(ln, element, f"farbe „{f}“: #RRGGBB oder {', '.join(FARBEN)} erwartet")
        return f

    def _completion(self, attrs, ln, element, default, typ=None):
        v = attrs.get("abschluss")
        if not v:
            return default
        allowed = ABSCHLUSS_TYP.get(typ, {"ansehen", "bestehen", "keine", "manuell"})
        if v.lower() not in allowed:
            self.fehler(ln, element, f"abschluss „{v}“: erlaubt sind {', '.join(sorted(allowed))}")
        return ABSCHLUSS[v.lower()]

    def _file(self, name, ln, element):
        """Beliebige Datei aus assets/ (PDF, Bilder, Office): (Pfad, Dateiname)."""
        name = name.strip()
        if name in self.A:
            return self.A[name][0], name
        path = os.path.join(self.assets_dir, name)
        if "/" in name or "\\" in name or not os.path.isfile(path):
            have = sorted(os.listdir(self.assets_dir)) if os.path.isdir(self.assets_dir) else []
            self.fehler(ln, element, f"Datei „{name}“ nicht in assets/ (vorhanden: {', '.join(have) or 'keine'})")
        return path, name

    def _ja(self, attrs, key, default=False):
        v = attrs.get(key)
        return default if v is None else v.strip().lower() in JA

    def _avail(self, attrs, ln, element):
        v = attrs.get("sichtbar ab")
        if not v:
            return None
        try:
            return ts_sichtbar_ab(v)
        except ValueError:
            self.fehler(ln, element, f"sichtbar ab „{v}“: Datum als JJJJ-MM-TT")

    def _image(self, name, ln, element):
        name = (name or "").strip()
        if name in self.A:
            return self.A[name]
        if "://" in name:
            msg = f"Bild „{name}“: externe Bilder sind nicht erlaubt, Bilddatei in assets/ legen"
        else:
            msg = f"Bild „{name}“ nicht in assets/ (vorhanden: {', '.join(sorted(self.A)) or 'keine'})"
        if not self.platzhalter:
            self.fehler(ln, element, msg)
        self.diag.warnung(msg + "; Platzhalter eingesetzt", ln, element, art="bild")
        return self._platzhalter_bild(name)

    def _platzhalter_bild(self, name):
        """Hellgraues Bild unter dem fehlenden Namen (Pfad in einem Temp-Ordner, den gen.api aufräumt)."""
        if self._platzhalter is None:
            self._platzhalter = tempfile.mkdtemp(prefix="kursmuehle_platzhalter_")
        safe = re.sub(r"[^\w.-]+", "_", name) or "bild.png"
        if not safe.lower().endswith((".png", ".jpg", ".jpeg")):
            safe += ".png"
        path = os.path.join(self._platzhalter, safe)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(platzhalter_png())
        ref = (path, H.ImageRef(path, 640, 400, name=safe))
        self.A[name] = ref
        return ref

    def _baustein_id(self, abschnitt, typ, titel):
        """Stabile ID aus Abschnitt, Typ, Titel und laufender Nummer bei gleichem Titel: bleibt beim Verschieben
        anderer Elemente und bei Textänderungen im Element gleich (Rückfall, wenn `id:` fehlt)."""
        key = (abschnitt or "", typ, titel)
        self._ids[key] = self._ids.get(key, 0) + 1
        return "b-" + hashlib.sha1(f"{abschnitt or ''}|{typ}|{titel}|{self._ids[key]}".encode()).hexdigest()[:8]

    def _id_angabe(self, lines, element):
        """`id: …` unter den Angaben direkt nach der Überschrift (lines[0] ist die Überschrift). Gibt (id, Zeile) oder
        (None, None); ungültige oder doppelte Angaben werden Warnung, der Baustein bekommt dann die berechnete ID."""
        for ln, s in lines[1:]:
            if not s.strip():
                continue
            m = _RE_ATTR.match(s)
            if m and not s.startswith(" ") and m.group(1).strip().lower() == "phase":
                continue                         # AP13.3: `Phase: …` vor `id:` wird übergangen
            if not m or s.startswith(" ") or s[0].isupper():
                break
            if m.group(1).strip().lower() != "id":
                continue
            v = m.group(2).strip()
            if not _RE_ID.match(v):
                self.diag.warnung(f"id „{v}“: nur Buchstaben, Ziffern, - und _ (höchstens 40 Zeichen); "
                                  "Baustein wird nach Position zugeordnet", ln, element, art="id")
                return None, None
            if v in self._explizit:
                self.diag.warnung(f"id „{v}“ ist doppelt; dieser Baustein wird nach Position zugeordnet", ln, element,
                                  art="id")
                return None, None
            self._explizit.add(v)
            return v, ln
        return None, None

    # ----- Dokument
    def parse(self):
        lines = self.zl.lines
        # Kopf bis zur ersten Abschnittsüberschrift
        i = 0
        head = []
        while i < len(lines):
            h = self._heading(lines[i][1])
            if h and h[0] == 2:
                break
            if h and h[0] == 1:
                self.titel = re.sub(r"^Drehbuch\s*v?\d*\s*·\s*", "", h[1]).strip()
            elif h:
                self.fehler(lines[i][0], None, "Vor dem ersten Abschnitt (`## `) sind nur `# Titel` und Angaben erlaubt")
            else:
                head.append(lines[i])
            i += 1
        # Kurs-Angaben zeilenweise: eine fremde Zeile davor schluckt sonst farbe: und kursbild:
        self.kurs_attr, rest = {}, []
        for line in head:
            a, r = self._attrs([line], ATTRS["kurs"], "Kurs")
            self.kurs_attr.update(a)
            rest += r
        for ln, s in rest:
            if s.strip() and not re.match(r"^(v\d+:|Zeit\b)", s.strip()):
                self.diag.hinweis(f"vor dem ersten Abschnitt wird ignoriert: {s.strip()[:60]}", ln, art="ignoriert")
        # Akzentfarbe: `farbe:` im Kopf der Kursdatei, sonst Steckbrief kurs.farbe (Kursangaben der Oberfläche), sonst Vorlage
        sb_farbe = str((self.sb.get("kurs") or {}).get("farbe") or "")
        hue = self._hue(self.kurs_attr, sb_farbe if re.match(r"^#[0-9A-Fa-f]{6}$", sb_farbe) else T.HUE, 1, "Kurs")
        global _HUE
        _HUE = hue
        # Abschnitte
        while i < len(lines):
            ln, s = lines[i]
            h = self._heading(s)
            if not h:
                if s.strip():
                    self._fehler_oder_diagnose(ln, None, "Text außerhalb eines Elements")
                i += 1
                continue
            j = i + 1
            while j < len(lines):
                h2 = self._heading(lines[j][1])
                if h2 and h2[0] <= 2:
                    break
                j += 1
            if h[0] != 2:
                self._fehler_oder_diagnose(ln, None, "Abschnitt (`## Titel`) erwartet")
                i = j
                continue
            if self.nachsichtig:
                try:
                    self._section(ln, h[1], lines[i + 1:j], hue)
                except KursdateiFehler as e:
                    self.diag.fehler(str(e).split(": ", 1)[-1], ln, f"Abschnitt „{h[1]}“")
            else:
                self._section(ln, h[1], lines[i + 1:j], hue)
            i = j
        if not self.sections:
            self._fehler_oder_diagnose(len(lines), None, "kein Abschnitt (`## Titel`) gefunden")
        if not self.sections or self.sections[0].name is not None:
            self.sections.insert(0, Section(None, items=[]))
        badges = []
        for ln, name, attrs in self.badges:
            if self.nachsichtig:
                try:
                    badges.append(self._badge(ln, name, attrs))
                except KursdateiFehler as e:
                    self._baustein_fehler(ln, f"Badge „{name}“", e)
            else:
                badges.append(self._badge(ln, name, attrs))
        img = self.kurs_attr.get("kursbild")
        image_path = self._image(img, 1, "Kurs")[0] if img else self.banner_bild
        self.diag.zuordnen(self.bausteine)
        for b in self.bausteine:
            if b["status"] == "ok" and any(d["baustein"] == b["id"] and d["stufe"] == "warnung" for d in self.diag):
                b["status"] = "warnung"
        return {"sections": self.sections, "parts": self.parts, "badges": badges, "image_path": image_path,
                "titel": self.titel, "farbe": hue, "websites": self.websites, "textfelder": self.textfelder,
                "bausteine": self.bausteine, "abschnitte": self.abschnitte, "diagnosen": self.diag,
                "adressen": self.zl.adressen}

    def _fehler_oder_diagnose(self, ln, element, msg):
        if self.nachsichtig:
            self.diag.fehler(msg, ln, element)
        else:
            self.fehler(ln, element, msg)

    def _baustein_fehler(self, ln, element, e):
        """Fehler eines Elements als Diagnose; der Baustein (falls angelegt) bekommt Status fehler."""
        msg = str(e)
        m = re.match(rf"^{re.escape(self.zl.name)} Zeile (\d+)(?: \([^)]*\))?: (.*)$", msg, re.S)
        zeile = int(m.group(1)) if m else ln
        self.diag.fehler(m.group(2) if m else msg, zeile, element)
        for b in self.bausteine:
            if b["zeile"] == ln:
                b["status"] = "fehler"

    def _section(self, ln, title, lines, hue):
        element = f"Abschnitt „{title}“"
        attrs, lines = self._attrs(lines, ATTRS["abschnitt"], element)
        self.abschnitt = title
        self.abschnitte.append({"titel": title, "zeile": ln, "angaben": dict(attrs), "bausteine": []})
        if self._skip(attrs):
            return
        hue = self._hue(attrs, hue, ln, element)
        allg = title.lower() in ("allgemeines", "allgemein", "0")
        if allg and self.sections:
            self.fehler(ln, element, "„Allgemeines“ (Abschnitt 0) muss der erste Abschnitt sein")
        sec = Section(None if allg else title, available_from=self._avail(attrs, ln, element))
        # Kachelbild/-icon (nur im Kachelformat wirksam): Angabe im Abschnitt oder im Steckbrief unter teile.<teil>
        sb_teil = (self.sb.get("teile") or {}).get(attrs.get("teil", ""), {}) or {}
        bild = attrs.get("kachelbild") or sb_teil.get("kachelbild")
        if bild:
            sec.tile_photo = self._image(bild.strip(), ln, element)[0], bild.strip()
        icon = attrs.get("kachelicon") or sb_teil.get("kachelicon")
        if icon:
            icon = str(icon).strip()
            if not re.match(r"^[a-z0-9-]+$", icon):
                self.fehler(ln, element, f"kachelicon „{icon}“: FontAwesome-Name wie book, lightbulb-o, flask, globe, laptop")
            sec.tile_icon = icon
        # Website-Modus: Angabe im Abschnitt, sonst Steckbrief kurs.website (nicht für Allgemeines)
        anzeige = self._web_anzeige(attrs["website"], ln, element) if "website" in attrs else \
            (None if allg else self.web_standard)
        wk = (self.sb.get("kurs") or {}).get("website")
        self._abschnitt_web = str(attrs["website"]).strip().lower() if "website" in attrs else \
            ("" if allg or wk in (None, False) or not self.web_standard else str(wk).strip().lower())
        self.textfeld = anzeige == "textfeld"
        self.web = Website(title or "Allgemeines", hue, anzeige) if anzeige and not self.textfeld else None
        self.allg = allg
        self._items(lines, sec, hue, level=3, section=sec)
        if self.web:
            self._web_fertig(sec)
        self.sections.append(sec)
        if attrs.get("teil"):
            self._part(attrs["teil"], sec, ln, element)
        self._sb_avail(attrs, sec)

    def _part(self, key, obj, ln, element):
        if key in self.parts:
            self.fehler(ln, element, f"teil „{key}“ ist schon vergeben")
        self.parts[key] = obj

    def _sb_avail(self, attrs, obj):
        key = attrs.get("teil")
        if key and obj.available_from is None:
            obj.available_from = ts_sichtbar_ab(self.sb.get("teile", {}).get(key, {}).get("sichtbar_ab"))

    def _items(self, lines, container, hue, level, section):
        """Elemente der Ebene `level` (### oder ####) in container.items."""
        i = 0
        marker = "#" * level
        sub_count = 0
        while i < len(lines):
            ln, s = lines[i]
            h = self._heading(s)
            if not h:
                if s.strip():
                    self.fehler(ln, None, f"Text außerhalb eines Elements (Element beginnt mit `{marker} Typ: Titel`)")
                i += 1
                continue
            if h[0] != level:
                self.fehler(ln, None, f"Überschrift der Ebene {level} (`{marker} Typ: Titel`) erwartet")
            j = i + 1
            while j < len(lines):
                h2 = self._heading(lines[j][1])
                if h2 and h2[0] <= level:
                    break
                j += 1
            body = lines[i + 1:j]
            m = re.match(r"^([^:]+):\s*(.*)$", h[1])
            if not m:
                self._fehler_oder_diagnose(ln, None, f"Element ohne Typ – `{marker} Typ: Titel` (Typen: {', '.join(ELEMENTE)})")
                i = j
                continue
            typ, title = m.group(1).strip(), m.group(2).strip()
            typ = next((t for t in ELEMENTE if t.lower() == typ.lower()), None)
            if not typ:
                self._fehler_oder_diagnose(ln, None, f"unbekannter Elementtyp „{m.group(1).strip()}“ (erlaubt: {', '.join(ELEMENTE)})")
                self._baustein(ln, m.group(1).strip(), title, level, lines[i:j], None, "fehler")
                i = j
                continue
            mins = re.search(r"·\s*(?:ca\.\s*)?(\d+)\s*min\.?\s*$", s)
            b = self._baustein(ln, typ, title, level, lines[i:j], int(mins.group(1)) if mins else None)
            self.diag.aktuell = (b["id"], title, ln)
            try:
                if typ == "Unterabschnitt":
                    if level != 3:
                        self.fehler(ln, None, "Unterabschnitte nur direkt im Abschnitt (`### Unterabschnitt: Titel`)")
                    sub_count += 1
                    self.diag.aktuell = None
                    self._subsection(ln, title, body, hue, container, sub_count)
                elif typ == "Badge":
                    attrs, rest = self._attrs(body, ATTRS["Badge"], f"Badge „{title}“")
                    b["angaben"] = dict(attrs)
                    self.badges.append((ln, title, attrs))
                else:
                    # Elemente nach dem Unterabschnitt-Block sind wieder Elemente des Abschnitts
                    item = self._element(ln, typ, title, body, hue, container, b["minuten"], b)
                    if item is not None:
                        container.items.append(item)
                        self.all_items.append(item)
            except KursdateiFehler as e:
                if not self.nachsichtig:
                    raise
                self._baustein_fehler(ln, f"{typ} „{title}“", e)
            finally:
                self.diag.aktuell = None
            i = j

    def _baustein(self, ln, typ, title, level, lines, minuten, status="ok"):
        """Baustein (AST-Eintrag) für ein Element anlegen und im Abschnitt eintragen."""
        abschnitt = getattr(self, "abschnitt", None)
        explizit, _ = self._id_angabe(lines, f"{typ} „{title}“")
        b = {"id": explizit or self._baustein_id(abschnitt, typ, title), "id_explizit": bool(explizit), "typ": typ,
             "titel": title, "abschnitt": abschnitt,
             "unterabschnitt": getattr(self, "unterabschnitt", None) if level == 4 else None, "ebene": level,
             "zeile": ln, "zeilen": len(lines), "minuten": minuten, "angaben": {}, "status": status,
             "text": "\n".join(s for _, s in lines).rstrip() + "\n"}
        self.bausteine.append(b)
        if self.abschnitte:
            self.abschnitte[-1]["bausteine"].append(b["id"])
        return b

    def _subsection(self, ln, title, body, hue, section, num):
        element = f"Unterabschnitt „{title}“"
        attrs, lines = self._attrs(body, ATTRS["Unterabschnitt"], element)
        self.bausteine[-1]["angaben"] = dict(attrs)
        self.unterabschnitt = title
        if self._skip(attrs):
            return
        if self.web:
            # Website-Modus: Unterabschnitt = Kapitelgruppe; Elemente ohne Web-Form landen im Abschnitt
            self.web.gruppe = inl(title)
            try:
                self._items(lines, section, hue, level=4, section=section)
            finally:
                self.web.gruppe = None
                self.unterabschnitt = None
            return
        sub = SubSection(title, [])
        sub.available_from = self._avail(attrs, ln, element)
        sub.nummer = num
        try:
            self._items(lines, sub, hue, level=4, section=section)
        finally:
            self.unterabschnitt = None
        section.items.append(sub)
        self.all_items.append(sub)
        if attrs.get("teil"):
            self._part(attrs["teil"], sub, ln, element)
        self._sb_avail(attrs, sub)

    def _element(self, ln, typ, title, body, hue, container, minuten=None, baustein=None):
        element = f"{typ} „{title}“"
        attrs, lines = self._attrs(body, ATTRS[typ], element)
        if baustein is not None:
            baustein["angaben"] = dict(attrs)
        if self._skip(attrs):
            return None
        if typ == "Überblick" and self.allg and self.kacheln:
            self.diag.hinweis(f"Kachelformat – Überblick „{title}“ in Allgemeines weggelassen (doppelt die Kacheln)", ln,
                              element, art="kachel")
            return None
        web = self.web and typ in WEB_TYPEN
        # Textfeld-Modus: nur formative Übungen; was für den Abschluss zählt (bestehen, beim Quiz Standard), bleibt Aktivität
        block = self.textfeld and typ in BLOCK_TYPEN and \
            self._completion(attrs, ln, element, "pass" if typ == "Quiz" else "view", typ) != "pass"
        if (self.web or self.textfeld) and "website" in attrs and str(attrs["website"]).strip().lower() not in NEIN:
            self.fehler(ln, element, "website am Element: nur `website: nein` (bleibt Plattform-Aktivität)")
        if (web or block) and title not in self.badge_titel:
            if "website" not in attrs and block:
                return self._block(ln, typ, title, lines, attrs, hue, element, minuten)
            if "website" not in attrs:
                if self.web.pos is None:
                    self.web.pos = len(container.items)
                self._web_element(ln, typ, title, lines, attrs, hue, element, minuten)
                return None
        k = Kontext(self.zl, self.A, hue, element, self.kacheln, self)
        avail = self._avail(attrs, ln, element)
        quiz = typ in ("Quiz", "Test")
        blocks = parse_body(lines, self.zl, element, quiz=quiz) if typ not in ("Geschichte",) else None

        if typ == "Banner":
            img = attrs.get("bild")
            if img:
                k.files.append((self._image(img, ln, element)[0], img))
                self.banner_bild = self.banner_bild or self._image(img, ln, element)[0]
            html = T.banner(inl(title), inl(attrs.get("untertitel", "")), img, hue=hue) + body_html(blocks, k)
            item = Label(html, files=k.files, name=attrs.get("name") or title)
            self.banner = True
        elif typ == "Textfeld":
            item = Label(body_html(blocks, k), files=k.files, name=title)
        elif typ == "Seite":
            item = Page(title, body_html(blocks, k), files=k.files,
                        completion=self._completion(attrs, ln, element, "view"))
        elif typ == "Überblick":
            steps_ = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Überblick: nur eine Liste `- Schritt: Erklärung`")
                for t, _ in b["items"]:
                    icon, t = _emoji_split(t)
                    lab, _, det = t.partition(":")
                    steps_.append((inl(lab.strip()), inl(det.strip()), icon))
            num = attrs.get("nummer") or (getattr(container, "nummer", None) or 1)
            # Mit Banner trägt die Karte keinen Titel mehr (Banner und Karte zeigten beide Titel und Untertitel)
            html = T.le_card(num, None if self.banner else inl(title), inl(attrs.get("untertitel", "")),
                             attrs.get("dauer", ""), steps_, hue)
            item = Label(html, name=attrs.get("name") or "Überblick")
        elif typ in ("Link", "Video"):
            url = next((b["text"] for b in blocks if b["kind"] == "para"), "")
            if not url.startswith("https://"):
                self.fehler(ln, element, "Adresse (https://…) in der Zeile unter der Überschrift erwartet"
                            + ("; nur https, nicht http" if url.startswith("http://") else ""))
            disp = attrs.get("anzeige", "eingebettet").lower()
            if disp not in ANZEIGE:
                self.fehler(ln, element, f"anzeige „{disp}“: erlaubt sind {', '.join(ANZEIGE)}")
            item = Url(title, url, display=ANZEIGE[disp], completion=self._completion(attrs, ln, element, "view"))
        elif typ == "Lesebuch":
            hv = self._book(title, blocks, k, self._hue(attrs, hue, ln, element))
            hv.completion = self._completion(attrs, ln, element, "view")
            item = HvpItem(hv)
        elif typ == "Quiz":
            qs = []
            for b in blocks:
                if b["kind"] != "dir" or b["name"] not in QUIZ_FRAGEN:
                    if b["kind"] == "para" and " · " in b["text"]:
                        self.fehler(b["ln"], element, "MC ohne ✔ – richtige Antwort mit ✔ markieren")
                    self.fehler(b["ln"], element, f"Quiz: jede Frage beginnt mit {', '.join(sorted(QUIZ_FRAGEN))}"
                                                  " (oder `1. Frage? · ✔A · B`)")
                qs.append(frage(b, k))
            if not qs:
                self.fehler(ln, element, "Quiz ohne Fragen")
            pct = self._pct(attrs.get("bestehen"), len(qs), ln, element)
            item = HvpItem(H.question_set(title, qs, pass_pct=pct, intro_text=attrs.get("einleitung") or None,
                                          completion=self._completion(attrs, ln, element, "pass")))
        elif typ == "Zuordnen":
            if "zonen" not in attrs:
                self.fehler(ln, element, "Zuordnen: `zonen: A | B | C` fehlt")
            zones = _split(attrs["zonen"], "|")
            elements = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Zuordnen: nur eine Liste `- Element → Zone`")
                for t, _ in b["items"]:
                    txt, _, zone = t.rpartition(" → ") if " → " in t else (t, "", "")   # letzter Pfeil trennt die Zone (AP13.3)
                    zone = zone.strip()
                    if zone in ("", "–", "-"):
                        elements.append((inl(txt.strip()), None))
                    elif zone not in zones:
                        self.fehler(b["ln"], element, f"Zone „{zone}“ nicht in zonen ({', '.join(zones)})")
                    else:
                        elements.append((inl(txt.strip()), zones.index(zone)))
            if not elements:
                self.fehler(ln, element, "Zuordnen ohne Elemente")
            bg = self._image(attrs["hintergrund"], ln, element)[1] if attrs.get("hintergrund") else None
            hv = H.drag_question(title, zones=[inl(z) for z in zones], elements=elements,
                                 width=int(attrs.get("breite", 760)), height=int(attrs.get("hoehe", 480)),
                                 cols=int(attrs.get("spalten", 2)), title=attrs.get("titel", ""), background=bg)
            hv.completion = self._completion(attrs, ln, element, "view")
            item = HvpItem(hv)
        elif typ == "Lernkarten":
            cards = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Lernkarten: nur eine Liste `- Vorderseite → Rückseite`")
                for t, _ in b["items"]:
                    if " → " not in t:
                        self.fehler(b["ln"], element, "Lernkarte: `Vorderseite → Rückseite` erwartet")
                    front, back = t.split(" → ", 1)
                    parts = _split(back)
                    tip, img = "", None
                    for extra in parts[1:]:
                        if extra.lower().startswith("bild:"):
                            img = self._image(extra[5:].strip(), b["ln"], element)[1]
                        elif extra.lower().startswith("tipp:"):
                            tip = inl(extra[5:].strip())
                        else:
                            self.fehler(b["ln"], element, f"Lernkarte: Zusatz „{extra}“ unbekannt (Bild: …, Tipp: …)")
                    cards.append((inl(front.strip()), inl(parts[0]), tip, img))
            if not cards:
                self.fehler(ln, element, "Lernkarten ohne Karten")
            hv = H.dialog_cards(title, cards, title=attrs.get("titel", title), description=attrs.get("beschreibung", ""),
                                mode=attrs.get("modus", "normal"))
            hv.completion = self._completion(attrs, ln, element, "view")
            item = HvpItem(hv)
        elif typ == "Geschichte":
            hv = self._story(title, lines, attrs, ln, element)
            hv.completion = self._completion(attrs, ln, element, "view")
            item = HvpItem(hv)
        elif typ == "Lückentext":
            if "aufgabe" not in attrs:
                self.fehler(ln, element, "Lückentext: `aufgabe: …` fehlt")
            qs = [b["text"] for b in blocks if b["kind"] == "para"]
            if not qs:
                self.fehler(ln, element, "Lückentext: Text mit *Lücken* erwartet")
            hv = H.blanks_activity(title, inl(attrs["aufgabe"]), qs)
            hv.completion = self._completion(attrs, ln, element, "view")
            item = HvpItem(hv)
        elif typ == "Umfrage":
            skala = _split(attrs["skala"], "|") if attrs.get("skala") else SKALA
            qs = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Umfrage: nur eine Liste `- Aussage` (optional `- Frage → a | b | c`)")
                for t, _ in b["items"]:
                    if " → " in t:
                        q, opts = t.split(" → ", 1)
                        qs.append((inl(q.strip()), _split(opts, "|")))
                    else:
                        qs.append((inl(t), skala))
            if not qs:
                self.fehler(ln, element, "Umfrage ohne Fragen")
            intro = f"<p>{inl(attrs['einleitung'])}</p>" if attrs.get("einleitung") else ""
            after = f"<p>{inl(attrs['danach'])}</p>" if attrs.get("danach") else "<p>Danke. Deine Antworten sind gespeichert.</p>"
            item = Feedback(title, intro, qs, after_text=after)
        elif typ == "Test":
            qs = []
            for b in blocks:
                if b["kind"] != "dir" or b["name"] not in TEST_FRAGEN:
                    if b["kind"] == "para" and " · " in b["text"]:
                        self.fehler(b["ln"], element, "MC ohne ✔ – richtige Antwort mit ✔ markieren")
                    self.fehler(b["ln"], element, f"Test: jede Frage beginnt mit {', '.join(sorted(TEST_FRAGEN))}"
                                                  " (oder `1. Frage? · ✔A · B`)")
                qs.append(test_frage(b, k))
            if not qs:
                self.fehler(ln, element, "Test ohne Fragen")
            pct = self._pct(attrs.get("bestehen"), len(qs), ln, element)
            rm = attrs.get("rueckmeldung", "am ende").strip().lower()
            if rm not in ("am ende", "sofort"):
                self.fehler(ln, element, f"rückmeldung „{rm}“: `am ende` (Standard) oder `sofort`")
            intro = f"<p>{inl(attrs['einleitung'])}</p>" if attrs.get("einleitung") else ""
            item = Quiz(title, intro, qs, pass_pct=pct, attempts=self._int(attrs, "versuche", 0, ln, element),
                        shuffle=self._ja(attrs, "mischen", True),
                        per_page=self._int(attrs, "je seite", 1, ln, element),
                        behaviour="immediatefeedback" if rm == "sofort" else "deferredfeedback",
                        completion=self._completion(attrs, ln, element, "pass", typ))
        elif typ == "Aufgabe":
            arten = {"text": "onlinetext", "datei": "file"}
            sub = set()
            for a in re.split(r"[,|·]", attrs.get("abgabe", "text")):
                a = a.strip().lower()
                if a not in arten:
                    self.fehler(ln, element, f"abgabe „{a}“: `text`, `datei` oder `text, datei`")
                sub.add(arten[a])
            bew = attrs.get("bewertung", "100").strip().lower()
            grade = 0 if bew in ("keine", "0") else self._int(attrs, "bewertung", 100, ln, element)
            pct = 0
            if attrs.get("bestehen"):
                m = re.match(r"^(\d+)\s*%$", attrs["bestehen"].strip())
                if not m:
                    self.fehler(ln, element, f"bestehen „{attrs['bestehen']}“: Prozent erwartet, z. B. `60 %`")
                pct = int(m.group(1))
            try:
                due = ts_faellig(attrs.get("faellig"))
            except ValueError:
                self.fehler(ln, element, f"fällig „{attrs.get('faellig')}“: Datum als JJJJ-MM-TT")
            item = Assign(title, body_html(blocks, k), submission=sub, grade=grade, pass_pct=pct, duedate=due,
                          completion=self._completion(attrs, ln, element, "submit", typ), files=k.files)
        elif typ == "Datei":
            if "datei" not in attrs:
                self.fehler(ln, element, "Datei: `datei: name.pdf` fehlt (Datei liegt in assets/)")
            path, fname = self._file(attrs["datei"], ln, element)
            item = Resource(title, path, fname, intro=body_html(blocks, k),
                            completion=self._completion(attrs, ln, element, "view"), files=k.files)
        elif typ == "Verzeichnis":
            entries, rest_blocks = [], []
            for b in blocks:
                if b["kind"] == "list":
                    for t, _ in b["items"]:
                        entries.append(self._file(t, b["ln"], element))
                else:
                    rest_blocks.append(b)
            if not entries:
                self.fehler(ln, element, "Verzeichnis ohne Dateien (Liste `- name.pdf`, Dateien in assets/)")
            disp = attrs.get("anzeige", "seite").strip().lower()
            if disp not in ("seite", "eingebettet"):
                self.fehler(ln, element, f"anzeige „{disp}“: `seite` (Standard) oder `eingebettet`")
            item = Folder(title, entries, intro=body_html(rest_blocks, k), inline=disp == "eingebettet",
                          completion=self._completion(attrs, ln, element, "view"), files=k.files)
        elif typ == "Forum":
            ft = attrs.get("typ", "allgemein").strip().lower()
            if ft not in FORUM_TYP:
                self.fehler(ln, element, f"typ „{ft}“: erlaubt sind {', '.join(FORUM_TYP)}")
            item = Forum(title, body_html(blocks, k), type=FORUM_TYP[ft],
                         completion=self._completion(attrs, ln, element, "none", typ), files=k.files)
        elif typ == "Buch":
            item = Book(title, self._buch(blocks, k, element), completion=self._completion(attrs, ln, element, "view"))
        elif typ == "Abstimmung":
            options, rest_blocks = [], []
            for b in blocks:
                if b["kind"] == "list":
                    options += [inl(t) for t, _ in b["items"]]
                else:
                    rest_blocks.append(b)
            if len(options) < 2:
                self.fehler(ln, element, "Abstimmung: mindestens zwei Optionen als Liste `- Option`")
            erg = attrs.get("ergebnisse", "nach abgabe").strip().lower()
            if erg not in ERGEBNISSE:
                self.fehler(ln, element, f"ergebnisse „{erg}“: erlaubt sind {', '.join(ERGEBNISSE)}")
            item = Choice(title, body_html(rest_blocks, k), options, multiple=self._ja(attrs, "mehrfach"),
                          showresults=ERGEBNISSE[erg], allowupdate=self._ja(attrs, "aendern"),
                          completion=self._completion(attrs, ln, element, "submit", typ), files=k.files)
        elif typ == "Glossar":
            entries, rest_blocks = [], []
            for b in blocks:
                if b["kind"] == "table":
                    for r in b["rows"]:
                        if len(r) < 2:
                            self.fehler(b["ln"], element, "Glossar-Tabelle: `| Begriff | Erklärung |` erwartet")
                        entries.append((inl(r[0]), f"<p>{inl(r[1])}</p>", [a.strip() for a in r[2:] if a.strip()]))
                elif b["kind"] == "list":
                    for t, _ in b["items"]:
                        if " → " not in t:
                            self.fehler(b["ln"], element, "Glossar-Eintrag: `- Begriff → Erklärung` erwartet")
                        c, d = t.split(" → ", 1)
                        entries.append((inl(c.strip()), f"<p>{inl(d.strip())}</p>", []))
                else:
                    rest_blocks.append(b)
            if not entries:
                self.fehler(ln, element, "Glossar ohne Einträge (`| Begriff | Erklärung |` oder `- Begriff → Erklärung`)")
            anz = attrs.get("anzeige", "wörterbuch").strip().lower()
            if anz not in GLOSSAR_ANZEIGE:
                self.fehler(ln, element, f"anzeige „{anz}“: erlaubt sind {', '.join(GLOSSAR_ANZEIGE)}")
            item = Glossary(title, body_html(rest_blocks, k), entries, displayformat=GLOSSAR_ANZEIGE[anz],
                            completion=self._completion(attrs, ln, element, "none", typ), files=k.files)
        else:
            self.fehler(ln, element, f"Typ {typ} nicht umgesetzt")
        item.available_from = avail
        return item

    # ----- Website-Modus (AP7)
    def _web_element(self, ln, typ, title, lines, attrs, hue, element, minuten):
        """Element als Kapitel (oder Startseiten-Teil) der Website des Abschnitts."""
        W, k = self.web, Kontext(self.zl, self.A, hue, element, self.kacheln, self)
        blocks = parse_body(lines, self.zl, element, quiz=typ == "Quiz") if typ != "Geschichte" else None
        self.web_titel.add(title)
        if typ == "Banner":
            img = attrs.get("bild")
            if img:
                W.dateien([(self._image(img, ln, element)[0], img)])
                self.banner_bild = self.banner_bild or self._image(img, ln, element)[0]
            W.kopf = (inl(title), inl(attrs.get("untertitel", "")), img)
            rest = body_html(blocks, k)
            if rest:
                W.start.append(rest)
            W.dateien(k.files)
            self.banner = True
            return
        if typ == "Überblick":
            steps_ = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Überblick: nur eine Liste `- Schritt: Erklärung`")
                for t, _ in b["items"]:
                    icon, t = _emoji_split(t)
                    lab, _, det = t.partition(":")
                    steps_.append((inl(lab.strip()), inl(det.strip()), icon))
            if W.gruppe is None:
                # Startseite: Untertitel in den Kopf, Karte ohne Titel darunter
                if W.kopf is None:
                    W.kopf = (inl(W.name), inl(attrs.get("untertitel", "")), None)
                W.start.append(T.le_card(1, None, "", attrs.get("dauer", ""), steps_, hue))
            else:
                html = T.le_card(attrs.get("nummer") or "", inl(title), inl(attrs.get("untertitel", "")),
                                 attrs.get("dauer", ""), steps_, hue)
                W.kapitel_neu(attrs.get("name") or "Überblick", html, ART[typ], minuten)
            return
        if typ in ("Textfeld", "Seite"):
            html = body_html(blocks, k)
        elif typ in ("Link", "Video"):
            url = next((b["text"] for b in blocks if b["kind"] == "para"), "")
            if not url.startswith("https://"):
                self.fehler(ln, element, "Adresse (https://…) in der Zeile unter der Überschrift erwartet"
                            + ("; nur https, nicht http" if url.startswith("http://") else ""))
            html = W.video(url) if typ == "Video" else W.link(url)
        elif typ == "Lesebuch":
            seiten = self._web_lesebuch(blocks, k, element)
            for i, (st, html) in enumerate(seiten):
                W.kapitel_neu(st, (f'<p class="km-hint">{inl(title)} · Seite {i + 1} von {len(seiten)}</p>'
                                   if len(seiten) > 1 else "") + html, ART[typ], minuten if i == 0 else None)
            W.dateien(k.files)
            return
        elif typ == "Quiz":
            qs = []
            for b in blocks:
                if b["kind"] != "dir" or b["name"] not in QUIZ_FRAGEN:
                    if b["kind"] == "para" and " · " in b["text"]:
                        self.fehler(b["ln"], element, "MC ohne ✔ – richtige Antwort mit ✔ markieren")
                    self.fehler(b["ln"], element, f"Quiz: jede Frage beginnt mit {', '.join(sorted(QUIZ_FRAGEN))}"
                                                  " (oder `1. Frage? · ✔A · B`)")
                qs.append(W.frage(*frage_daten(b, k)))
            if not qs:
                self.fehler(ln, element, "Quiz ohne Fragen")
            html = W.quiz(qs, inl(attrs.get("einleitung", "")))
        elif typ == "Zuordnen":
            if "zonen" not in attrs:
                self.fehler(ln, element, "Zuordnen: `zonen: A | B | C` fehlt")
            zones = _split(attrs["zonen"], "|")
            elemente = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Zuordnen: nur eine Liste `- Element → Zone`")
                for t, _ in b["items"]:
                    txt, _, zone = t.rpartition(" → ") if " → " in t else (t, "", "")   # letzter Pfeil trennt die Zone (AP13.3)
                    zone = zone.strip()
                    if zone in ("", "–", "-"):
                        elemente.append((inl(txt.strip()), None))
                    elif zone not in zones:
                        self.fehler(b["ln"], element, f"Zone „{zone}“ nicht in zonen ({', '.join(zones)})")
                    else:
                        elemente.append((inl(txt.strip()), zones.index(zone)))
            if not elemente:
                self.fehler(ln, element, "Zuordnen ohne Elemente")
            html = W.zuordnen([inl(z) for z in zones], elemente, inl(attrs.get("titel", "")))
        elif typ == "Lernkarten":
            karten = []
            for b in blocks:
                if b["kind"] != "list":
                    self.fehler(b["ln"], element, "Lernkarten: nur eine Liste `- Vorderseite → Rückseite`")
                for t, _ in b["items"]:
                    if " → " not in t:
                        self.fehler(b["ln"], element, "Lernkarte: `Vorderseite → Rückseite` erwartet")
                    front, back = t.split(" → ", 1)
                    parts = _split(back)
                    tip, img = "", None
                    for extra in parts[1:]:
                        if extra.lower().startswith("bild:"):
                            img = self._image(extra[5:].strip(), b["ln"], element)[1]
                        elif extra.lower().startswith("tipp:"):
                            tip = inl(extra[5:].strip())
                        else:
                            self.fehler(b["ln"], element, f"Lernkarte: Zusatz „{extra}“ unbekannt (Bild: …, Tipp: …)")
                    karten.append((inl(front.strip()), inl(parts[0]), tip, img))
            if not karten:
                self.fehler(ln, element, "Lernkarten ohne Karten")
            html = W.lernkarten(karten, inl(attrs.get("beschreibung", "")))
        elif typ == "Geschichte":
            html = W.geschichte(*self._story_daten(title, lines, attrs, ln, element))
        elif typ == "Lückentext":
            if "aufgabe" not in attrs:
                self.fehler(ln, element, "Lückentext: `aufgabe: …` fehlt")
            qs = [b["text"] for b in blocks if b["kind"] == "para"]
            if not qs:
                self.fehler(ln, element, "Lückentext: Text mit *Lücken* erwartet")
            html = W.lueckentext(inl(attrs["aufgabe"]), qs)
        W.dateien(k.files)
        W.kapitel_neu(inl(title), html, ART[typ], minuten)

    def _block(self, ln, typ, title, lines, attrs, hue, element, minuten):
        """Textfeld-Modus: Übung als Block in einem Textfeld (gleiche Umsetzung wie im Website-Modus, ohne iframe)."""
        n = len(self.textfelder) + 1
        bid = "kmb-" + hashlib.sha1(f"{self.titel}|{n}|{title}".encode()).hexdigest()[:8]
        alt, self.web = self.web, Website(inl(title), hue, "textfeld", prefix=bid + "-")
        try:
            self._web_element(ln, typ, title, lines, attrs, hue, element, minuten)
            html, files = self.web.block(bid, ART[typ])
        finally:
            self.web = alt
        self.textfelder.append((title, html, files))
        item = Label(html, files=files, name=title)
        item.available_from = self._avail(attrs, ln, element)
        return item

    def _web_lesebuch(self, blocks, k, element):
        """Lesebuch -> [(seitentitel, html)]: Textbausteine, Bilder und Fragen je Seite."""
        W, seiten, cur = self.web, [], None
        for b in blocks:
            if b["kind"] == "dir" and b["name"] == "Seite":
                cur = [inl(_strip_time(b["rest"])), []]
                seiten.append(cur)
                continue
            if cur is None:
                k.fehler(b["ln"], "Lesebuch: erste Zeile muss `Seite: Titel` sein")
            if b["kind"] == "dir" and b["name"] in FRAGEN:
                cur[1].append(W.frage(*frage_daten(b, k)))
            else:
                cur[1].append(block_html(b, k))
        if not seiten:
            k.fehler(0, "Lesebuch ohne Seiten (`Seite: Titel`)")
        for st, parts in seiten:
            if not "".join(parts):
                k.fehler(0, f"Seite „{st}“ ist leer")
        return [(st, "".join(parts)) for st, parts in seiten]

    def _web_fertig(self, sec):
        """Website des Abschnitts schreiben und als Datei-Aktivität an die Stelle des ersten Kapitels setzen."""
        W, self.web = self.web, None
        if not W.kapitel:
            return
        if self.banner_bild and (W.kopf is None or W.kopf[2] is None):
            # Kopf der Startseite: Bild des Kursbanners (textfrei), Titel und Satz als HTML darunter
            name = os.path.basename(self.banner_bild)
            W.dateien([(self.banner_bild, name)])
            W.kopf = ((W.kopf or (inl(W.name), ""))[0], (W.kopf or (inl(W.name), ""))[1], name)
        d = tempfile.mkdtemp(prefix="kursmuehle_web_")
        path = os.path.join(d, "index.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(W.render())
        item = Resource(W.name, path, "index.html", completion="view", display=W.anzeige, website=True)
        sec.items.insert(W.pos or 0, item)
        self.all_items.append(item)
        self.websites.append((W.name, path))

    def _int(self, attrs, key, default, ln, element):
        v = attrs.get(key)
        if v is None or v.strip() == "":
            return default
        if not re.match(r"^\d+$", v.strip()):
            self.fehler(ln, element, f"{key} „{v}“: ganze Zahl erwartet")
        return int(v.strip())

    def _buch(self, blocks, k: Kontext, element):
        """Buch: `Kapitel: Titel` / `Unterkapitel: Titel`, darunter Textbausteine. Ergebnis: [(titel, html, files, sub)]."""
        chapters = []
        cur = None   # [titel, blocks, sub]
        for b in blocks:
            if b["kind"] == "dir" and b["name"] in ("Kapitel", "Unterkapitel"):
                if b["name"] == "Unterkapitel" and not chapters and cur is None:
                    self.fehler(b["ln"], element, "Unterkapitel vor dem ersten Kapitel")
                if cur:
                    chapters.append(cur)
                cur = [inl(_strip_time(b["rest"])), [], b["name"] == "Unterkapitel"]
                if not cur[0]:
                    self.fehler(b["ln"], element, f"{b['name']} ohne Titel")
                continue
            if cur is None:
                self.fehler(b["ln"], element, "Buch: erste Zeile muss `Kapitel: Titel` sein")
            cur[1].append(b)
        if cur:
            chapters.append(cur)
        out = []
        for title, cblocks, sub in chapters:
            kc = Kontext(k.zl, k.A, k.hue, k.element, k.kacheln, k.parser)
            html = body_html(cblocks, kc)
            if not html:
                self.fehler(0, element, f"Kapitel „{title}“ ist leer")
            out.append((title, html, kc.files, sub))
        if not out:
            self.fehler(0, element, "Buch ohne Kapitel (`Kapitel: Titel`)")
        return out

    def _pct(self, v, n, ln, element):
        if not v:
            return 70
        m = re.match(r"^(\d+)\s*%$", v)
        if m:
            return int(m.group(1))
        m = re.match(r"^(\d+)\s*von\s*(\d+)$", v)
        if m:
            k, total = int(m.group(1)), int(m.group(2))
            if total != n:
                self.fehler(ln, element, f"bestehen „{v}“: das Quiz hat {n} Fragen")
            return int(k * 100 / total)
        self.fehler(ln, element, f"bestehen „{v}“: `80 %` oder `5 von 6` erwartet")

    def _book(self, title, blocks, k: Kontext, base):
        chapters = []
        cur_title, cur = None, []
        text_title, text = None, []

        def flush_text():
            nonlocal text_title, text
            if text:
                cur.append(H.text("".join(text), text_title or cur_title or title))
            text_title, text = None, []

        def flush_page():
            nonlocal cur_title, cur
            flush_text()
            if cur_title is not None:
                if not cur:
                    k.fehler(0, f"Seite „{cur_title}“ ist leer")
                chapters.append((cur_title, cur))
            cur_title, cur = None, []

        for b in blocks:
            if b["kind"] == "dir" and b["name"] == "Seite":
                flush_page()
                cur_title = inl(_strip_time(b["rest"]))
                continue
            if cur_title is None:
                k.fehler(b["ln"], "Lesebuch: erste Zeile muss `Seite: Titel` sein")
            if b["kind"] == "dir" and b["name"] in FRAGEN:
                flush_text()
                cur.append(frage(b, k))
            elif b["kind"] == "dir" and b["name"] == "Bild":
                flush_text()
                parts = _split(b["rest"], "|")
                img = k.image(b["ln"], parts[0])[1]
                cur.append(H.image(img, inl(parts[1]) if len(parts) > 1 else ""))
            elif b["kind"] == "dir" and b["name"] == "Text":
                flush_text()
                text_title = inl(b["title"]) or None
                h = block_html(b, k)
                if h:
                    text.append(h)
            else:
                text.append(block_html(b, k))
        flush_page()
        if not chapters:
            k.fehler(0, "Lesebuch ohne Seiten (`Seite: Titel`)")
        return H.interactive_book(title, chapters, base_color=base)

    def _story_daten(self, title, lines, attrs, ln, element):
        """Geschichte -> (start_titel, start_untertitel, bild (path, ImageRef) | None, knoten, enden).
        knoten: [(key, "szene", titel, html, ziel) | (key, "frage", frage, [(antwort, ziel)])], Ziele als Schlüssel;
        enden: {key: (titel, text)}. H5P (_story) und Website bauen daraus."""
        blocks = parse_body(lines, self.zl, element)
        ends, raw = {}, []
        for b in blocks:
            if b["kind"] != "dir" or b["name"] not in ("Szene", "Frage", "Ende"):
                self.fehler(b["ln"], element, "Geschichte: nur `Szene (key): Titel → ziel`, `Frage (key): …`, `Ende (key): Titel`")
            key = b["title"].strip()
            if not key:
                self.fehler(b["ln"], element, f"{b['name']}: Schlüssel fehlt – `{b['name']} (key): …`")
            if b["name"] == "Ende":
                ends[key] = (inl(b["rest"]), inl(" ".join(t for _, t in b["follow"])))
            else:
                raw.append((key, b))
        if not raw:
            self.fehler(ln, element, "Geschichte ohne Szenen")
        keys = {key for key, _ in raw} | set(ends)

        def target(ref, l2):
            ref = ref.strip()
            if ref not in keys:
                self.fehler(l2, element, f"Ziel „{ref}“ unbekannt (Szenen, Fragen, Enden: {', '.join(sorted(keys))})")
            return ref

        nodes = []
        for key, b in raw:
            if b["name"] == "Szene":
                if " → " not in b["rest"]:
                    self.fehler(b["ln"], element, "Szene: `Szene (key): Titel → ziel` erwartet")
                t, nxt = b["rest"].rsplit(" → ", 1)
                html = "".join(f"<p>{inl(x)}</p>" for _, x in b["follow"])
                if not html:
                    self.fehler(b["ln"], element, "Szene ohne Text")
                nodes.append((key, "szene", inl(t), html, target(nxt, b["ln"])))
            else:
                alts = []
                for l2, _, t in b["list"]:
                    if " → " not in t:
                        self.fehler(l2, element, "Antwort: `- Text → ziel` erwartet")
                    txt, nxt = t.rsplit(" → ", 1)
                    alts.append((inl(txt.strip()), target(nxt, l2)))
                if not alts:
                    self.fehler(b["ln"], element, "Frage ohne Antworten")
                nodes.append((key, "frage", inl(b["rest"]), alts))
        start = _split(attrs.get("start", title), "|")
        img = self._image(attrs["bild"], ln, element) if attrs.get("bild") else None
        return inl(start[0]), inl(start[1]) if len(start) > 1 else "", img, nodes, ends

    def _story(self, title, lines, attrs, ln, element):
        st, su, img, nodes, ends = self._story_daten(title, lines, attrs, ln, element)
        end_obj = {key: H.Branch.END(t, sub) for key, (t, sub) in ends.items()}
        br = H.Branch()
        for node in nodes:
            if node[1] == "szene":
                key, _, t, html, nxt = node
                br.add_text(key, t, html, end_obj.get(nxt, nxt))
            else:
                key, _, q, alts = node
                br.add_question(key, q, [(txt, end_obj.get(nxt, nxt)) for txt, nxt in alts])
        return H.branching_scenario(title, br, st, su, start_img=img[1] if img else None,
                                    files=[(img[0], img[1].h5p_path)] if img else [])

    def _badge(self, ln, name, attrs):
        element = f"Badge „{name}“"
        if "bild" not in attrs:
            self.fehler(ln, element, "`bild: datei.png` fehlt")
        if "voraussetzung" not in attrs:
            self.fehler(ln, element, "`voraussetzung: <Elementtitel>` fehlt")
        crit = []
        for want in _split(attrs["voraussetzung"], "|"):
            hits = [it for it in self.all_items if it.name == want and not isinstance(it, SubSection)]
            if not hits and want in self.web_titel:
                self.fehler(ln, element, f"voraussetzung „{want}“ ist im Website-Modus Teil der Website (ohne Abschluss); "
                                         "am Element `website: nein` setzen oder einen `Test` nehmen")
            if len(hits) != 1:
                self.fehler(ln, element, f"voraussetzung „{want}“: {len(hits)} Elemente mit diesem Titel")
            crit.append(hits[0])
        return Badge(name, inl(attrs.get("beschreibung", "")), self._image(attrs["bild"], ln, element)[0], crit)


def parse(path, A, sb=None, proto=False):
    """Streng (CLI): KursdateiFehler beim ersten Fehler. Diagnosen (Hinweise) stehen im Ergebnis unter `diagnosen`."""
    return Parser(path, A, sb, proto).parse()


def parse_text(text, A, sb=None, proto=False, nachsichtig=True, name="kurs.md", assets_dir=None, platzhalter=None):
    """Kursdatei aus einem String; nachsichtig = Fehler je Element sammeln (gen.api.pruefe); platzhalter = fehlende
    Bilder als Warnung mit Platzhalterbild statt Fehler (Standard wie nachsichtig)."""
    return Parser(None, A, sb, proto, text=text, nachsichtig=nachsichtig, name=name, assets_dir=assets_dir,
                  platzhalter=platzhalter).parse()
