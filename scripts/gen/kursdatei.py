"""Parser für die Kursdatei `kurs.md` (Drehbuch-Format) -> Generator-Objekte (gen.mbz, gen.h5p).

Format: references/kursdatei.md (vollständig), references/intake.md §5 (Kurzfassung).
Fehler nennen Zeile und Element; unbekannte Typen und Angaben brechen ab.
"""
import datetime
import os
import re
import sys
import zoneinfo

from . import h5p as H
from . import html as T
from .mbz import (Assign, Badge, Book, Choice, Feedback, Folder, Forum, Glossary, HvpItem, Label, MultiChoice, Page,
                  Quiz, Resource, Section, ShortAnswer, SubSection, TrueFalse, Url)


class KursdateiFehler(Exception):
    pass


def ts_sichtbar_ab(d):
    """'YYYY-MM-DD' -> Unix-Zeit 06:00 Europe/Berlin, sonst None."""
    if not d:
        return None
    tz = zoneinfo.ZoneInfo("Europe/Berlin")
    return int(datetime.datetime.strptime(str(d), "%Y-%m-%d").replace(hour=6, tzinfo=tz).timestamp())


def ts_faellig(d):
    """'YYYY-MM-DD' -> Unix-Zeit 23:59 Europe/Berlin (Abgabetermin), sonst 0."""
    if not d:
        return 0
    tz = zoneinfo.ZoneInfo("Europe/Berlin")
    return int(datetime.datetime.strptime(str(d), "%Y-%m-%d").replace(hour=23, minute=59, tzinfo=tz).timestamp())


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
    "abschnitt": {"teil", "farbe", "sichtbar ab", "prototyp"},
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
    s = re.sub(r"\s*\[Quelle:[^\]]*\]", "", s)
    s = re.sub(r"\s*\[KI(?::[^\]]*)?\]", "", s)
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


# ---------------------------------------------------------------- Zeilen
class Zeilen:
    def __init__(self, path):
        with open(path, encoding="utf-8") as f:
            raw = f.read().splitlines()
        self.lines = [(i + 1, "" if re.match(r"^(Zeit\b.*\d+\s*min|v\d+:|Angenommen:|Bildwunsch:)", s) else _clean(s)) for i, s in enumerate(raw)]
        self.pos = 0
        self.name = os.path.basename(path)

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


def parse_body(lines, zl, element, quiz=False):
    """lines: [(ln, text)] (ohne Überschriften). Ergebnis: Liste von Blöcken (dict, kind=...)."""
    blocks = []
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
            elif name in LIST_DIRS:
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
                           "indented": indented, "follow": follow, "list": lst})
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
    def __init__(self, zl, A, hue, element):
        self.zl, self.A, self.hue, self.element = zl, A, hue, element
        self.files = []     # (local_path, filename) – Bilder in Textfeld/Seite

    def fehler(self, ln, msg):
        self.zl.fehler(ln, self.element, msg)

    def image(self, ln, name):
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


# ---------------------------------------------------------------- Fragen (H5P-Unterinhalte)
def frage(b, k: Kontext):
    name, title, rest, ln = b["name"], b["title"], b["rest"], b["ln"]
    if name == "MC":
        if " · " in rest:
            q, *ans = _split(rest)
        else:
            q, ans = rest, [t for _, _, t in b["list"]]
        answers = [_answer(a) for a in ans]
        if len(answers) < 2:
            k.fehler(ln, "MC: mindestens zwei Antworten (` · `-getrennt oder als `- `-Liste)")
        n_ok = sum(1 for _, c, _ in answers if c)
        if n_ok == 0:
            k.fehler(ln, "MC: keine Antwort mit ✔ markiert")
        return H.multichoice(inl(q), answers, title=title or "Frage", single=n_ok == 1)
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
        return H.truefalse(inl(statement), correct, fb_ok, fb_nok, title=title or "Richtig oder falsch?")
    if name == "Einsetzen":
        text = "\n".join(t for _, t in b["follow"])
        if not text:
            k.fehler(ln, "Einsetzen: Text mit *Lücken* in den Zeilen darunter erwartet")
        return H.dragtext(inl(rest), text, title=title or "Wörter zuordnen")
    if name == "Markieren":
        text = " ".join(t for _, t in b["follow"])
        if not text:
            k.fehler(ln, "Markieren: Text mit *markierten* Wörtern in den Zeilen darunter erwartet")
        return H.markwords(inl(rest), text, title=title or "Wörter markieren")
    if name == "Lückentext":
        qs = [t for _, t in b["follow"]]
        if not qs:
            k.fehler(ln, "Lückentext: Text mit *Lücken* in den Zeilen darunter erwartet")
        return H.blanks(inl(rest), qs, title=title or "Lückentext")
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
        return H.summary(inl(rest), groups, title=title or "Zusammenfassung")
    if name == "Schnellquiz":
        qs = []
        for l2, _, t in b["list"]:
            q, *ans = _split(t)
            ans = [_answer(a) for a in ans]
            ok = [a for a in ans if a[1]] or ans[:1]
            if len(ans) < 2:
                k.fehler(l2, "Schnellquiz: `Frage? · ✔richtig · falsch · …` erwartet")
            qs.append((inl(q), [ok[0][0]] + [a[0] for a in ans if a is not ok[0]]))
        return H.singlechoiceset(qs, title=title or "Schnellquiz")
    k.fehler(ln, f"{name}: kein Fragetyp")


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
    def __init__(self, path, A, sb=None, proto=False):
        self.zl = Zeilen(path)
        self.A = A
        self.assets_dir = os.path.join(os.path.dirname(os.path.abspath(path)), "assets")
        self.sb = sb or {}
        self.proto = proto
        self.titel = None
        self.kurs_attr = {}
        self.sections = []
        self.parts = {}
        self.badges = []        # (ln, name, attrs)
        self.all_items = []
        self.banner = False     # Banner vorhanden -> Überblickskarten ohne Titel (Doppelung)

    # ----- Hilfen
    def fehler(self, ln, element, msg):
        self.zl.fehler(ln, element, msg)

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
            if key in allowed:
                attrs[key] = m.group(2).strip()
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
        if name not in self.A:
            self.fehler(ln, element, f"Bild „{name}“ nicht in assets/ (vorhanden: {', '.join(sorted(self.A)) or 'keine'})")
        return self.A[name]

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
        self.kurs_attr, rest = self._attrs(head, ATTRS["kurs"], "Kurs")
        for ln, s in rest:
            if s.strip() and not re.match(r"^(v\d+:|Zeit\b)", s.strip()):
                print(f"Hinweis: {self.zl.name} Zeile {ln} vor dem ersten Abschnitt wird ignoriert: {s.strip()[:60]}", file=sys.stderr)
        hue = self._hue(self.kurs_attr, T.HUE, 1, "Kurs")
        global _HUE
        _HUE = hue
        fmt = str((self.sb.get("kurs") or {}).get("format") or "").strip().lower()
        if fmt and fmt not in ("themen", "topics"):
            print(f"Hinweis: Kursformat „{fmt}“ im Steckbrief vorgemerkt; der Generator baut derzeit „Themen“. "
                  f"Nach dem Import unter Kurseinstellungen → Kursformat umstellen.", file=sys.stderr)
        # Abschnitte
        while i < len(lines):
            ln, s = lines[i]
            h = self._heading(s)
            if not h:
                if s.strip():
                    self.fehler(ln, None, "Text außerhalb eines Elements")
                i += 1
                continue
            if h[0] != 2:
                self.fehler(ln, None, "Abschnitt (`## Titel`) erwartet")
            j = i + 1
            while j < len(lines):
                h2 = self._heading(lines[j][1])
                if h2 and h2[0] <= 2:
                    break
                j += 1
            self._section(ln, h[1], lines[i + 1:j], hue)
            i = j
        if not self.sections:
            self.fehler(len(lines), None, "kein Abschnitt (`## Titel`) gefunden")
        if self.sections[0].name is not None:
            self.sections.insert(0, Section(None, items=[]))
        badges = [self._badge(ln, name, attrs) for ln, name, attrs in self.badges]
        img = self.kurs_attr.get("kursbild")
        image_path = self._image(img, 1, "Kurs")[0] if img else None
        return {"sections": self.sections, "parts": self.parts, "badges": badges, "image_path": image_path,
                "titel": self.titel}

    def _section(self, ln, title, lines, hue):
        element = f"Abschnitt „{title}“"
        attrs, lines = self._attrs(lines, ATTRS["abschnitt"], element)
        if self._skip(attrs):
            return
        hue = self._hue(attrs, hue, ln, element)
        allg = title.lower() in ("allgemeines", "allgemein", "0")
        if allg and self.sections:
            self.fehler(ln, element, "„Allgemeines“ (Abschnitt 0) muss der erste Abschnitt sein")
        sec = Section(None if allg else title, available_from=self._avail(attrs, ln, element))
        self._items(lines, sec, hue, level=3, section=sec)
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
                self.fehler(ln, None, f"Element ohne Typ – `{marker} Typ: Titel` (Typen: {', '.join(ELEMENTE)})")
            typ, title = m.group(1).strip(), m.group(2).strip()
            typ = next((t for t in ELEMENTE if t.lower() == typ.lower()), None)
            if not typ:
                self.fehler(ln, None, f"unbekannter Elementtyp „{m.group(1).strip()}“ (erlaubt: {', '.join(ELEMENTE)})")
            if typ == "Unterabschnitt":
                if level != 3:
                    self.fehler(ln, None, "Unterabschnitte nur direkt im Abschnitt (`### Unterabschnitt: Titel`)")
                sub_count += 1
                self._subsection(ln, title, body, hue, container, sub_count)
            elif typ == "Badge":
                attrs, rest = self._attrs(body, ATTRS["Badge"], f"Badge „{title}“")
                self.badges.append((ln, title, attrs))
            else:
                # Elemente nach dem Unterabschnitt-Block sind wieder Elemente des Abschnitts
                item = self._element(ln, typ, title, body, hue, container)
                if item is not None:
                    container.items.append(item)
                    self.all_items.append(item)
            i = j

    def _subsection(self, ln, title, body, hue, section, num):
        element = f"Unterabschnitt „{title}“"
        attrs, lines = self._attrs(body, ATTRS["Unterabschnitt"], element)
        if self._skip(attrs):
            return
        sub = SubSection(title, [])
        sub.available_from = self._avail(attrs, ln, element)
        sub.nummer = num
        self._items(lines, sub, hue, level=4, section=section)
        section.items.append(sub)
        self.all_items.append(sub)
        if attrs.get("teil"):
            self._part(attrs["teil"], sub, ln, element)
        self._sb_avail(attrs, sub)

    def _element(self, ln, typ, title, body, hue, container):
        element = f"{typ} „{title}“"
        attrs, lines = self._attrs(body, ATTRS[typ], element)
        if self._skip(attrs):
            return None
        k = Kontext(self.zl, self.A, hue, element)
        avail = self._avail(attrs, ln, element)
        quiz = typ in ("Quiz", "Test")
        blocks = parse_body(lines, self.zl, element, quiz=quiz) if typ not in ("Geschichte",) else None

        if typ == "Banner":
            img = attrs.get("bild")
            if img:
                k.files.append((self._image(img, ln, element)[0], img))
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
            if not url.startswith(("http://", "https://")):
                self.fehler(ln, element, "Adresse (https://…) in der Zeile unter der Überschrift erwartet")
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
                    txt, _, zone = t.partition(" → ")
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
            kc = Kontext(k.zl, k.A, k.hue, k.element)
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

    def _story(self, title, lines, attrs, ln, element):
        k = Kontext(self.zl, self.A, None, element)
        blocks = parse_body(lines, self.zl, element)
        ends, nodes = {}, []
        for b in blocks:
            if b["kind"] != "dir" or b["name"] not in ("Szene", "Frage", "Ende"):
                self.fehler(b["ln"], element, "Geschichte: nur `Szene (key): Titel → ziel`, `Frage (key): …`, `Ende (key): Titel`")
            key = b["title"].strip()
            if not key:
                self.fehler(b["ln"], element, f"{b['name']}: Schlüssel fehlt – `{b['name']} (key): …`")
            if b["name"] == "Ende":
                ends[key] = H.Branch.END(inl(b["rest"]), inl(" ".join(t for _, t in b["follow"])))
            else:
                nodes.append((key, b))
        if not nodes:
            self.fehler(ln, element, "Geschichte ohne Szenen")
        keys = {key for key, _ in nodes} | set(ends)

        def target(ref, l2):
            ref = ref.strip()
            if ref in ends:
                return ends[ref]
            if ref not in keys:
                self.fehler(l2, element, f"Ziel „{ref}“ unbekannt (Szenen, Fragen, Enden: {', '.join(sorted(keys))})")
            return ref

        br = H.Branch()
        for key, b in nodes:
            if b["name"] == "Szene":
                if " → " not in b["rest"]:
                    self.fehler(b["ln"], element, "Szene: `Szene (key): Titel → ziel` erwartet")
                t, nxt = b["rest"].rsplit(" → ", 1)
                html = "".join(f"<p>{inl(x)}</p>" for _, x in b["follow"])
                if not html:
                    self.fehler(b["ln"], element, "Szene ohne Text")
                br.add_text(key, inl(t), html, target(nxt, b["ln"]))
            else:
                alts = []
                for l2, _, t in b["list"]:
                    if " → " not in t:
                        self.fehler(l2, element, "Antwort: `- Text → ziel` erwartet")
                    txt, nxt = t.rsplit(" → ", 1)
                    alts.append((inl(txt.strip()), target(nxt, l2)))
                if not alts:
                    self.fehler(b["ln"], element, "Frage ohne Antworten")
                br.add_question(key, inl(b["rest"]), alts)
        start = _split(attrs.get("start", title), "|")
        img = self._image(attrs["bild"], ln, element) if attrs.get("bild") else None
        return H.branching_scenario(title, br, inl(start[0]), inl(start[1]) if len(start) > 1 else "",
                                    start_img=img[1] if img else None,
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
            if len(hits) != 1:
                self.fehler(ln, element, f"voraussetzung „{want}“: {len(hits)} Elemente mit diesem Titel")
            crit.append(hits[0])
        return Badge(name, inl(attrs.get("beschreibung", "")), self._image(attrs["bild"], ln, element)[0], crit)


def parse(path, A, sb=None, proto=False):
    return Parser(path, A, sb, proto).parse()
