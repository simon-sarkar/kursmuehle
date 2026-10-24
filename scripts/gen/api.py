"""Schnittstelle des Generators für CLI (build.py) und Browser (web/worker.js, Pyodide): aus Text und Bytes prüfen
und bauen, ohne Annahmen über Dateisystem, Prozess oder Konsole.

    pruefe(text, assets, steckbrief, mappe)   -> dict mit bausteine, diagnosen, adressen, bildwuensche (nachsichtig, je
                                                 ### erholt); mit `mappe` dazu die Prüfregeln der Mühle (einheit_pruefen)
    baue(kurs_md, steckbrief, assets)         -> (mbz_bytes | None, diagnosen)
    baue_voll(kurs_md, steckbrief, assets)    -> Ergebnis (Bytes, Dateiname, Glossar-XML, Vorschauen, Prüfbericht)
    steckbrief_lesen(text) / steckbrief_schreiben(dict)   YAML nur hier (JavaScript liest kein YAML)
    extrahiere_kursdatei(text)                -> (kursdatei, hinweise): ganze Chat-Antwort mit Vorrede und ``` annehmen

`assets` ist ein dict Dateiname -> Bytes (Browser) oder der Pfad eines Ordners (CLI). Jeder Lauf setzt den Modulzustand
zurück (Designvorlage, Emoji, Akzentfarbe, Zufall), arbeitet in einem eigenen Temp-Ordner und löscht ihn danach.
Mit `zeit` (Unix-Sekunden) und `seed` ist die Sicherung reproduzierbar: gleiche Eingabe, gleiche Bytes (CI vergleicht
Pyodide mit CPython). Bildgrößen kommen aus dem Dateikopf (gen.bildkopf), nicht aus Pillow.
"""
import datetime
import os
import re
import shutil
import tempfile
import time

import yaml

from . import h5p as H
from . import html as T
from . import kursdatei as K
from . import tzdaten
from .bildkopf import groesse, ist_bild
from .h5p import ImageRef
from .kursdatei import Diagnosen, KursdateiFehler
from .mbz import Course, Section, Writer, glossary_import_xml, moodle_format
from .website import vorschau_textfeld

VERSION = "2.0.0-b4"


class Ergebnis:
    def __init__(self):
        self.mbz = None             # Bytes der Sicherung oder None bei Fehlern
        self.diagnosen = Diagnosen()
        self.dateiname = None       # Name der .mbz (steht auch in moodle_backup.xml)
        self.titel = None
        self.glossare = []          # (Dateiname, XML) je Glossar mit Einträgen
        self.websites = []          # (Titel, HTML) je Website-Abschnitt
        self.textfeld_html = None   # Vorschau aller Textfeld-Blöcke
        self.pruefung = None        # (errors, info, warnings) aus check.py
        self.bausteine = []
        self.dauer_s = 0.0

    def ok(self):
        return self.mbz is not None and not self.diagnosen.hat_fehler()


# ---------------------------------------------------------------- Steckbrief (YAML nur in Python)
def _json_sicher(v):
    if isinstance(v, dict):
        return {str(k): _json_sicher(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_json_sicher(x) for x in v]
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()[:10]
    return v


def steckbrief_lesen(text):
    """YAML-Text -> dict ohne Datums- und Zeitobjekte (Datum als 'JJJJ-MM-TT'). Leer -> {}."""
    if not text or not str(text).strip():
        return {}
    sb = yaml.safe_load(text)
    if sb is None:
        return {}
    if not isinstance(sb, dict):
        raise ValueError("Steckbrief: oberste Ebene muss ein Mapping sein (kurs:, teile:)")
    return _json_sicher(sb)


class _Steckbrief(yaml.SafeDumper):
    """Strings, die ein YAML-Leser als Zahl, Datum oder Wahrheitswert lesen könnte (09, 2026-11-01, no), in Anführungszeichen."""


_RE_ZWEIDEUTIG = re.compile(r"^[0-9][0-9_.,:\-eE+]*$|^[+-]?\.?[0-9]")
_WORTE = {"yes", "no", "on", "off", "true", "false", "null", "y", "n", "~"}


def _str(dumper, v):
    if _RE_ZWEIDEUTIG.match(v) or v.strip().lower() in _WORTE or v == "":
        return dumper.represent_scalar("tag:yaml.org,2002:str", v, style="'")
    return dumper.represent_scalar("tag:yaml.org,2002:str", v)


_Steckbrief.add_representer(str, _str)


def steckbrief_schreiben(sb):
    """dict -> YAML-Text, Reihenfolge der Schlüssel bleibt, Umlaute bleiben, Strings mit Zahlenform werden zitiert."""
    return yaml.dump(_json_sicher(sb or {}), Dumper=_Steckbrief, allow_unicode=True, sort_keys=False,
                     default_flow_style=False, width=100)


# ---------------------------------------------------------------- Chat-Antwort -> Kursdatei
_RE_FENCE = re.compile(r"^[ \t]*(`{3,}|~{3,})[^\n]*\n(.*?)^[ \t]*\1[ \t]*$", re.S | re.M)
_RE_KOPF = re.compile(r"^#{1,2} ", re.M)


def extrahiere_kursdatei(text):
    """Die ganze Antwort eines Chats annehmen: Codeblock-Zeichen und Vorrede entfernen, mehrere Codeblöcke
    zusammensetzen, gerenderten Text (ohne #-Überschriften) erkennen. Gibt (kursdatei, [hinweise])."""
    hinweise = []
    t = text.replace("\r\n", "\n").replace("\r", "\n").lstrip("﻿")
    bloecke = [m.group(2) for m in _RE_FENCE.finditer(t)]
    passend = [b for b in bloecke if _RE_KOPF.search(b)]
    if passend:
        t = "\n\n".join(b.rstrip("\n") for b in passend) + "\n"
        hinweise.append(f"Codeblock übernommen ({len(passend)} von {len(bloecke)}), Text davor und danach weggelassen"
                        if len(bloecke) > 1 else "Codeblock-Zeichen und Text davor und danach weggelassen")
    elif bloecke:
        t = "\n\n".join(b.rstrip("\n") for b in bloecke) + "\n"
        hinweise.append("Codeblock ohne Abschnittsüberschriften übernommen")
    else:
        m = _RE_KOPF.search(t)
        if m and m.start() > 0:
            vorrede = t[:m.start()].count("\n")
            if t[:m.start()].strip():
                hinweise.append(f"{vorrede} Zeile{'n' if vorrede != 1 else ''} Vorrede vor der Kursdatei weggelassen")
            t = t[m.start():]
        elif not m and re.search(rf"^({'|'.join(K.ELEMENTE)}): ", t, re.M):
            hinweise.append("Der Text sieht gerendert aus (keine Überschriften mit #). Kopiere die Antwort mit dem "
                            "Kopierknopf des Chats, nicht mit der Maus")
    if not t.endswith("\n"):
        t += "\n"
    return t, hinweise


# ---------------------------------------------------------------- Hilfen
def _dateiname(short):
    """Kurzname als Dateiname: ASCII, Kleinbuchstaben, Umlaute ausgeschrieben, Sonderzeichen zu „-“."""
    import unicodedata
    s = short.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "kurs"


def _zeitstempel(zeit):
    return datetime.datetime.fromtimestamp(zeit, tzdaten.berlin()).strftime("%Y%m%d-%H%M%S")


class _Arbeit:
    """Temp-Ordner für einen Lauf; Website-Dateien und Platzhalter landen darin (tempfile.tempdir) und verschwinden
    mit ihm."""

    def __enter__(self):
        self.dir = tempfile.mkdtemp(prefix="kursmuehle_")
        self.alt = tempfile.tempdir
        tempfile.tempdir = self.dir
        return self.dir

    def __exit__(self, *a):
        tempfile.tempdir = self.alt
        shutil.rmtree(self.dir, ignore_errors=True)


def _assets(assets, work, diag):
    """assets (dict Name -> Bytes oder Ordnerpfad) -> (A, assets_dir). A: Bildname -> (Pfad, ImageRef)."""
    if assets is None:
        assets = {}
    if isinstance(assets, str):
        assets_dir = assets
        namen = sorted(os.listdir(assets_dir)) if os.path.isdir(assets_dir) else []
        lesen = lambda n: open(os.path.join(assets_dir, n), "rb").read()  # noqa: E731
    else:
        assets_dir = os.path.join(work, "assets")
        os.makedirs(assets_dir, exist_ok=True)
        namen = []
        for name, data in assets.items():
            name = os.path.basename(str(name).replace("\\", "/"))
            if not name:
                continue
            if isinstance(data, memoryview):
                data = data.tobytes()
            with open(os.path.join(assets_dir, name), "wb") as f:
                f.write(bytes(data))
            namen.append(name)
        namen.sort()
        lesen = lambda n: open(os.path.join(assets_dir, n), "rb").read()  # noqa: E731
    A = {}
    for name in namen:
        if not ist_bild(name):
            continue
        path = os.path.join(assets_dir, name)
        try:
            w, h = groesse(lesen(name)[:65536] if name.lower().endswith(".png") else lesen(name))
        except ValueError as e:
            diag.warnung(f"Bild „{name}“ nicht lesbar ({e}); wird wie fehlend behandelt", art="bild")
            continue
        A[name] = (path, ImageRef(path, w, h))
    return A, assets_dir


def _zuruecksetzen(sb, vorlage, seed):
    design = (sb.get("kurs") or {}).get("design") or {}
    T.EMOJI = bool(design.get("emoji_marker", False))
    T.set_vorlage(vorlage or design.get("vorlage") or "schlicht")
    K._HUE = T.HUE
    H.setze_zufall(seed)


def _steckbrief(sb):
    if sb is None:
        return {}
    if isinstance(sb, str):
        return steckbrief_lesen(sb)
    return _json_sicher(dict(sb))


# ---------------------------------------------------------------- Regel-Kennungen (AP13.3)
# Stabile Kennung je Prüfregel, die Korrektursatz, Karte und das Ereignis in der Kursmappe (`korrekturen`) mitführen;
# `protokolle/korrekturen.md` nennt dieselben Kennungen. Die Prüfung setzt `regel` selbst, wo sie die Regel kennt
# (einheit_pruefen); sonst ordnet `regel()` die Meldung des Parsers über Art und Wortlaut zu.
REGELN = {
    "zeit.annahme": "Zeile `Angenommen:` nimmt Zeit außerhalb des Kurses an",
    "mindest.quiz": "Quiz unter dem Mindestmaß (Fragen)", "mindest.zuordnen": "Zuordnen unter dem Mindestmaß (Paare)",
    "mindest.lueckentext": "Lückentext unter dem Mindestmaß (Lücken)",
    "mindest.lernkarten": "Lernkarten unter dem Mindestmaß (Karten)", "mindest.test": "Test unter dem Mindestmaß",
    "mindest.hefteintrag": "Hefteintrag unter dem Mindestmaß (Wörter, Merksatz, fette Fachbegriffe)",
    "einstieg.lang": "Einstieg über der Wortgrenze", "phase.fehlt": "eine Phase der Vorlage hat keine Karte mehr",
    "vorgriff": "Aufgabe verwendet, was erst später eingeführt wird (nur im Protokoll, keine Prüfung)",
    "format.frage": "Frage nicht im Format", "typ.unbekannt": "unbekannter Typ in der Überschrift",
    "angabe.unbekannt": "unbekannte Angabe unter der Überschrift", "zone.unbekannt": "Zone nicht in `zonen`",
    "website.element": "`website:` am Element mit anderem Wert als im Abschnitt",
    "hinweis.leer": "Kasten, Beispiel oder Hinweis ohne Inhalt",
    "hinweis.einrueckung": "Inhalt von Kasten, Beispiel oder Hinweis nicht eingerückt (angenommen)",
    "bild.fehlt": "Bild nicht hochgeladen", "id.ungueltig": "`id:` ungültig oder doppelt",
    "format.abschnitt": "Abschnitt fehlt oder Text außerhalb eines Elements", "format.sonst": "übriges Format",
}
_REGEL_TEXT = [
    (re.compile(r"unbekannter Elementtyp"), "typ.unbekannt"),
    (re.compile(r"unbekannte Angabe"), "angabe.unbekannt"),
    (re.compile(r"^Zone „"), "zone.unbekannt"),
    (re.compile(r"website am Element"), "website.element"),
    (re.compile(r"ohne Inhalt – Inhalt um zwei"), "hinweis.leer"),
    (re.compile(r"^(?:MC|RF|Einsetzen|Markieren|Lückentext|Aussagen|Schnellquiz|Kurzantwort)\b|jede Frage beginnt mit"),
     "format.frage"),
    (re.compile(r"Abschnitt \(`## Titel`\)|außerhalb eines Elements|kein Abschnitt"), "format.abschnitt"),
]
_REGEL_ART = {"zeit": "zeit.annahme", "einstieg": "einstieg.lang", "einrueckung": "hinweis.einrueckung",
              "bild": "bild.fehlt", "id": "id.ungueltig", "phase": "phase.fehlt"}


def _ascii(t):
    return t.lower().replace("ü", "ue").replace("ä", "ae").replace("ö", "oe").replace("ß", "ss")


def regel(d):
    """Kennung der Regel einer Diagnose (siehe REGELN)."""
    if d.get("regel"):
        return d["regel"]
    for muster, kennung in _REGEL_TEXT:
        if muster.search(d.get("text") or ""):
            return kennung
    return _REGEL_ART.get(d.get("art"), "format.sonst" if d.get("art") == "format" else d.get("art") or "format.sonst")


def _diagnose_dicts(diag):
    return [dict(d, satz=diag.satz(d), regel=regel(d)) for d in diag]


# ---------------------------------------------------------------- Bildwünsche (AP13.1)
_RE_BILDZEILE = re.compile(r"^(Bildwunsch|Bildprompt):\s*(.*)$")
_RE_DATEI = re.compile(r"^([^\s|]+\.(?:png|jpe?g))\s*(?:\|\s*(.*))?$", re.I)
_RE_BILD_GENANNT = re.compile(r"(?:^|[·|]\s*|\s)(?:Bild|Bildzeile|bild|kachelbild):\s*([^\s|·]+\.(?:png|jpe?g))", re.I | re.M)


def bildwuensche(kursdatei, bausteine=()):
    """Zeilen `Bildwunsch:` (ein Satz, was zu sehen ist) und `Bildprompt:` (Auftrag für einen Bildgenerator) der
    Kursdatei, je Bild mit dem Baustein, dessen `Bild:` die Datei nennt. Ein `Bildprompt:` ohne Dateinamen gehört zum
    `Bildwunsch:` davor; ein Wunsch ohne Dateinamen bekommt die erste genannte Bilddatei ohne Wunsch.
    -> [{datei, wunsch, prompt, baustein, titel, zeile}]"""
    out = []
    for i, z in enumerate((kursdatei or "").splitlines(), 1):
        m = _RE_BILDZEILE.match(z)
        if not m:
            continue
        d = _RE_DATEI.match(m.group(2).strip())
        datei, text = (d.group(1), (d.group(2) or "").strip()) if d else (None, m.group(2).strip())
        if m.group(1) == "Bildwunsch":
            # ein neuer Wunsch zum gleichen Dateinamen ersetzt den alten (AP13.3)
            out = [w for w in out if not (datei and w["datei"] == datei)]
            out.append({"datei": datei, "wunsch": text, "prompt": "", "zeile": i})
            continue
        ziel = next((w for w in reversed(out) if datei and w["datei"] == datei), None) \
            or (out[-1] if out and not out[-1]["prompt"] and (not datei or not out[-1]["datei"]) else None)
        if ziel is None:
            out.append({"datei": datei, "wunsch": "", "prompt": text, "zeile": i})
        else:
            ziel["prompt"] = text
            ziel["datei"] = ziel["datei"] or datei
    genannt = []
    for b in bausteine:
        for name in _RE_BILD_GENANNT.findall(b.get("text") or ""):
            if all(n != name for n, _ in genannt):
                genannt.append((name, b))
    frei = [n for n, _ in genannt if n not in {w["datei"] for w in out}]
    for w in out:
        if not w["datei"] and frei:
            w["datei"] = frei.pop(0)
        b = next((b for n, b in genannt if n == w["datei"]), None)
        w["baustein"], w["titel"] = (b["id"], b["titel"]) if b else (None, None)
    return out


# ---------------------------------------------------------------- Prüfregeln der Mühle (AP13.1)
_RE_MINUTEN = re.compile(r"\b\d+\s*(?:Minuten|Min\.|min)\b")
_RE_ID_IM_TEXT = re.compile(r"\bb\d+(?:-\d+)*\b")
_RE_ANGABE = re.compile(r"^[a-zäöüß ]+:\s")
_EINZAHL = {"Fragen": "Frage", "Paare": "Paar", "Lücken": "Lücke", "Karten": "Karte", "Wörter": "Wort"}


def woerter(b):
    """Wörter eines Bausteins ohne Überschrift, Angaben (`schlüssel: wert`) und Bildzeilen; Präfixe wie `Vorspann:` und
    HTML zählen nicht."""
    from . import mappe as M
    n = 0
    for z in (b.get("text") or "").splitlines()[1:]:
        t = z.strip()
        if not t or _RE_ANGABE.match(t) or t.startswith(("Bild:", "Bildzeile:")):
            continue
        t = M._RE_PRAEFIX.sub("", M._RE_HTML.sub(" ", t.split(" → ")[0]))
        n += len(M._RE_WORT.findall(t.replace("✔", " ").replace("✘", " ")))
    return n


def _zaehle(b, einheit):
    from . import mappe as M
    text = b.get("text") or ""
    zeilen = [z.strip() for z in text.splitlines()[1:]]
    if einheit == "Fragen":
        return M.fragen(b)[0]
    if einheit == "Paare":
        return sum(1 for z in zeilen if z.startswith("- ") and " → " in z)
    if einheit == "Karten":
        return sum(1 for z in zeilen if z.startswith("- "))
    if einheit == "Lücken":
        return len(M._RE_LUECKE.findall(re.sub(r"\*\*[^*]+\*\*", " ", text)))
    return woerter(b)


def einheit_pruefen(ergebnis, mappe):
    """Prüfregeln der Mühle für eine Einheit, deren Text für den Chat kopiert wurde (`mappe.kopiert`; Kursdateien aus
    1.x und Testkurse bleiben unberührt): eine Zeile `Angenommen:`, die Minuten nennt, ist ein Fehler mit eigenem
    Korrektursatz (`bitte`); Mindestmaße je Typ (`mindest` im Katalog) als roter Baustein; ein Einstieg über
    `pruefregeln.einstieg_woerter` Wörtern als gelber Hinweis (Stufe warnung). Eine Annahme mit Minuten, die Bausteine
    der Antwort nennt (ergänzte Bausteine), zählt nicht als Zeit-Annahme. Ändert `ergebnis` und gibt es zurück."""
    from . import mappe as M
    if not mappe or not mappe.get("kopiert"):
        return ergebnis
    kat = M.katalog()
    regeln, prompt = kat["pruefregeln"], kat["prompt"]
    typen = {t["typ"]: t for t in kat["typen"]}
    plan = {e["id"]: e for e in mappe.get("bausteine", [])}
    minuten = (mappe.get("einheit") or {}).get("minuten")
    jahrgang = (mappe.get("einheit") or {}).get("jahrgang")
    diag = Diagnosen()
    ids = {b["id"] for b in ergebnis.get("bausteine", [])}
    for i, z in enumerate((ergebnis.get("kursdatei") or "").splitlines(), 1):
        # Minuten in einer Annahme sind Zeit außerhalb des Kurses; nennt die Zeile Bausteine der Antwort (ergänzte
        # Bausteine „zur Füllung der 45 Minuten“), ist es keine
        if z.startswith("Angenommen:") and _RE_MINUTEN.search(z) and not (set(_RE_ID_IM_TEXT.findall(z)) & ids):
            d = diag.fehler("Der Chat nimmt Zeit außerhalb des Kurses an (Zeile „Angenommen:“); die Minuten gehören "
                            "in die Bausteine", i, art="zeit")
            d["bitte"] = prompt["korrektur_zeit"].format(minuten=minuten or "geplanten")
            d["regel"] = "zeit.annahme"

    def melde(stufe, b, text, art, kennung):
        d = diag.add(stufe, art, text, b["zeile"], f"{b['typ']} „{b['titel']}“")
        d["baustein"], d["titel"], d["zeile_im_baustein"], d["regel"] = b["id"], b["titel"], 1, kennung

    for b in ergebnis.get("bausteine", []):
        if b.get("status") == "fehler":
            continue
        e = plan.get(b["id"]) or b
        mind = typen.get(b["typ"], {}).get("mindest")
        heft = "Hefteintrag" in " ".join(str(x or "") for x in (e.get("titel"), e.get("schritt"), b["titel"]))
        if mind and (not mind.get("nur") or heft):
            n, soll, ein = _zaehle(b, mind["einheit"]), M.mindestzahl(mind, jahrgang), mind["einheit"]
            kennung = "mindest.hefteintrag" if mind.get("nur") == "Hefteintrag" else "mindest." + _ascii(b["typ"])
            if n < soll:
                melde("fehler", b, f"Nur {n} {_EINZAHL.get(ein, ein) if n == 1 else ein}, nötig sind mindestens {soll}",
                      "mindest", kennung)
            if mind.get("nur") == "Hefteintrag":
                if not re.search(r"^\s*Merke:", b.get("text") or "", re.M):
                    melde("fehler", b, "Der Hefteintrag hat keinen Merksatz (Zeile „Merke:“)", "mindest", kennung)
                if not re.search(r"\*\*[^*]+\*\*|<(?:b|strong)>", b.get("text") or ""):
                    melde("fehler", b, "Der Hefteintrag hat keine fett gesetzten Fachbegriffe", "mindest", kennung)
        if M.rolle_von(e) == "einstieg" and b["typ"] in ("Textfeld", "Seite"):
            n, grenze = woerter(b), regeln["einstieg_woerter"]
            if n > grenze:
                melde("warnung", b, f"Der Einstieg hat {n} Wörter, vorgesehen sind höchstens {grenze}; das Neue gehört in "
                                    "die Erarbeitung",
                      "einstieg", "einstieg.lang")
    if not diag:
        return ergebnis
    status = {b["id"]: b for b in ergebnis.get("bausteine", [])}
    for d in diag:
        b = status.get(d["baustein"])
        if b is not None and d["stufe"] == "fehler":
            b["status"] = "fehler"
        elif b is not None and d["stufe"] == "warnung" and b["status"] == "ok":
            b["status"] = "warnung"
    ergebnis["diagnosen"] = ergebnis.get("diagnosen", []) + _diagnose_dicts(diag)
    ergebnis["ok"] = not any(d["stufe"] == "fehler" for d in ergebnis["diagnosen"])
    return ergebnis


# ---------------------------------------------------------------- prüfen
def pruefe(text, assets=None, steckbrief=None, mappe=None):
    """Kursdatei (oder ganze Chat-Antwort) nachsichtig lesen. Ergebnis: ok, titel, farbe, bausteine (id, typ, titel,
    abschnitt, zeile, zeilen, minuten, angaben, status, text), abschnitte, diagnosen (mit Bausteintitel und
    zeile_im_baustein), adressen (alle externen Adressen), bildwuensche, kursdatei (der übernommene Text). Mit `mappe`
    (Kursmappe der Mühle) zusätzlich die Prüfregeln aus `einheit_pruefen`."""
    t0 = time.time()
    kurs, hinweise = extrahiere_kursdatei(text or "")
    kurs = K.normalisiere(kurs)
    sb = _steckbrief(steckbrief)
    with _Arbeit() as work:
        diag = Diagnosen()
        try:
            _zuruecksetzen(sb, None, None)
        except ValueError as e:
            diag.fehler(str(e), art="steckbrief")
        A, assets_dir = _assets(assets, work, diag)
        try:
            k = K.parse_text(kurs, A, sb, nachsichtig=True, assets_dir=assets_dir)
        except KursdateiFehler as e:     # bleibt nur bei Fehlern außerhalb jedes Elements
            k = {"titel": None, "farbe": T.HUE, "bausteine": [], "abschnitte": [], "diagnosen": Diagnosen(), "adressen": []}
            k["diagnosen"].fehler(str(e))
    d = k["diagnosen"]
    for h in hinweise:
        d.hinweis(h, art="eingabe")
    d[:] = list(diag) + list(d)
    adressen = [{"zeile": ln, "adresse": a, "https": a.startswith("https://"),
                 "baustein": next((b["id"] for b in k["bausteine"] if b["zeile"] <= ln < b["zeile"] + b["zeilen"]), None)}
                for ln, a in k["adressen"]]
    ergebnis = {"ok": not d.hat_fehler(), "titel": k["titel"], "farbe": k["farbe"], "bausteine": k["bausteine"],
                "abschnitte": k["abschnitte"], "diagnosen": _diagnose_dicts(d), "adressen": adressen,
                "bildwuensche": bildwuensche(kurs, k["bausteine"]), "kursdatei": kurs,
                "dauer_s": round(time.time() - t0, 3), "version": VERSION}
    return einheit_pruefen(ergebnis, mappe) if mappe else ergebnis


# ---------------------------------------------------------------- bauen
def baue_voll(kurs_md, steckbrief=None, assets=None, zeit=None, seed=None, optionen=None):
    """Sicherung bauen. optionen: proto, delta ('pending' oder 'a,b'), vorlage, format, website, mit_nutzerdaten,
    dateiname, pruefen (check.py, Standard ja), nachsichtig (fehlende Bilder als Platzhalter, Standard ja).
    zeit: Unix-Sekunden für alle Zeitstempel (Standard jetzt); seed: für die H5P-IDs (Standard Zufall)."""
    t0 = time.time()
    o = dict(optionen or {})
    e = Ergebnis()
    diag = e.diagnosen
    zeit = int(zeit if zeit is not None else time.time())
    sb = _steckbrief(steckbrief)
    teile = sb.get("teile", {}) or {}
    if o.get("website"):
        sb["kurs"] = dict(sb.get("kurs") or {}, website=o["website"])
    if o.get("format"):
        sb["kurs"] = dict(sb.get("kurs") or {}, format=o["format"])
    try:
        _zuruecksetzen(sb, o.get("vorlage"), seed)
    except ValueError as ex:
        diag.fehler(str(ex), art="steckbrief")
        return e
    with _Arbeit() as work:
        A, assets_dir = _assets(assets, work, diag)
        try:
            k = K.parse_text(kurs_md, A, sb, proto=bool(o.get("proto")), nachsichtig=False, assets_dir=assets_dir,
                             platzhalter=o.get("nachsichtig", True))
        except KursdateiFehler as ex:
            diag.fehler(str(ex).split(": ", 1)[-1] if str(ex).startswith("kurs.md Zeile") else str(ex),
                        _zeile_aus(str(ex)))
            return e
        diag[:] = list(diag) + list(k["diagnosen"])
        e.bausteine = k["bausteine"]
        meta = sb.get("kurs", {}) or {}
        name = meta.get("titel") or k.get("titel") or "Kurs"
        short = meta.get("kurzname") or name[:20]
        summary = meta.get("beschreibung", "")
        try:
            fmt = moodle_format(o.get("format") or meta.get("format") or "themen")
        except ValueError as ex:
            diag.fehler(str(ex), art="steckbrief")
            return e
        fmt_opts = meta.get("formatoptionen") or {}
        if not isinstance(fmt_opts, dict):
            diag.fehler("Steckbrief: formatoptionen muss ein Mapping name: wert sein", art="steckbrief")
            return e
        if fmt == "tiles" and "basecolour" not in fmt_opts and (meta.get("farbe") or k.get("farbe")):
            fmt_opts["basecolour"] = meta.get("farbe") or k.get("farbe")
        try:
            startdate = K.ts_sichtbar_ab(meta.get("start")) if meta.get("start") else zeit
        except ValueError:
            diag.fehler(f"Steckbrief: start „{meta.get('start')}“: Datum als JJJJ-MM-TT", art="steckbrief")
            return e
        kurs = dict(format=fmt, format_options=fmt_opts, startdate=startdate,
                    glossar_nutzerdaten=bool(o.get("mit_nutzerdaten")))
        delta = o.get("delta")
        if delta:
            keys = [x for x, v in teile.items() if (v or {}).get("status") == "pending"] if delta == "pending" \
                else [x.strip() for x in str(delta).split(",")]
            if not keys:
                diag.fehler("--delta: keine Teile mit status: pending im Steckbrief", art="steckbrief")
                return e
            sections = [Section(None)]
            for key in keys:
                if key not in k["parts"]:
                    diag.fehler(f"--delta: Teil „{key}“ nicht in der Kursdatei (teil: {key} fehlt); "
                                f"vorhanden: {', '.join(k['parts']) or 'keine'}", art="steckbrief")
                    return e
                part = k["parts"][key]
                if isinstance(part, Section):
                    sections.append(part)
                else:
                    sections.append(Section(part.name, items=part.items, available_from=part.available_from))
            course = Course(name, short, summary=summary, sections=sections, badges=[], image_path=None, **kurs)
            fname = f"{_dateiname(short)}_delta_{'-'.join(keys)}_{_zeitstempel(zeit)}.mbz"
        else:
            fname = f"{_dateiname(short)}_{'prototyp' if o.get('proto') else 'kurs'}_{_zeitstempel(zeit)}.mbz"
            if o.get("proto"):
                name, short = f"{short} – Prototyp", f"{short}-Proto"
            course = Course(name, short, summary=summary, sections=k["sections"], badges=k.get("badges", []),
                            image_path=k.get("image_path"), **kurs)
        e.dateiname = o.get("dateiname") or fname
        e.titel = name
        try:
            w = Writer(course, None, now=zeit, dateiname=e.dateiname)
            w.build()
        except ValueError as ex:
            diag.fehler(str(ex), art="bau")
            return e
        e.mbz = w.bytes
        n = len(w.glossare)
        stamm = os.path.splitext(e.dateiname)[0]
        for i, g in enumerate(w.glossare, 1):
            e.glossare.append((f"{stamm}_glossar{i if n > 1 else ''}.xml", glossary_import_xml(g)))
            diag.hinweis(f"Glossar „{g.name}“: {len(g.entries)} Einträge, nach dem Import als XML einlesen "
                         "(Glossar → Mehr → Einträge importieren)", art="glossar")
        for titel, path in k.get("websites", []):
            with open(path, encoding="utf-8") as f:
                e.websites.append((titel, f.read()))
        if k.get("textfelder"):
            e.textfeld_html = vorschau_textfeld(k["textfelder"], name)
        if o.get("pruefen", True):
            from check import check_mbz
            pfad = os.path.join(work, e.dateiname)
            with open(pfad, "wb") as f:
                f.write(e.mbz)
            e.pruefung = check_mbz(pfad)
            errors, info, warnings = e.pruefung
            for wo, was in errors:
                diag.fehler(f"{wo} {was}", art="pruefung")
            for wo, was in warnings:
                diag.warnung(f"{wo} {was}", art="pruefung")
            if errors:
                e.mbz = None
    e.dauer_s = round(time.time() - t0, 3)
    return e


def _zeile_aus(msg):
    m = re.search(r"Zeile (\d+)", msg)
    return int(m.group(1)) if m else None


def baue(kurs_md, steckbrief=None, assets=None, zeit=None, seed=None, optionen=None):
    """(mbz_bytes | None, diagnosen als Liste von dicts)."""
    e = baue_voll(kurs_md, steckbrief, assets, zeit, seed, optionen)
    return e.mbz, _diagnose_dicts(e.diagnosen)
