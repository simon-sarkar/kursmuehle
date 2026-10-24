"""Kursmappe: die Datei, die der Lehrkraft gehört (Formatversion 2).

Ein ZIP mit `mappe.json` (Formatversion, Titel, je Baustein ID, Typ, Titel, Abschnitt, Auftrag, Phase, Soll-Minuten),
`kurs.md`, `steckbrief.yaml` und `assets/`. kurs.md und steckbrief.yaml bleiben das 1.x-Format; die Metadaten stehen nur
in mappe.json, geschlüsselt über die stabile Baustein-ID aus dem Parser. Ein 1.x-Kursordner (kurs.md, steckbrief.yaml,
assets/) wird mit `aus_dateien()` zur Mappe; die Baustein-Liste kommt dann aus `gen.api.pruefe`.
ZIP-Einträge tragen einen festen Zeitstempel, damit dieselbe Mappe dieselben Bytes ergibt (Autosave-Vergleich).

Seit 2.0.0-a2 (AP10): `einheit` (Thema, Jahrgangsstufe, Minuten, Vorlage) und geplante Bausteine (`geplant: true`, noch
ohne Inhalt in kurs.md, etwa aus einer Einheitsvorlage). Der Abgleich ordnet Bausteine über die ID zu (explizit mit
`id:` oder berechnet), sonst nach Position. Textoperationen auf kurs.md (verschieben, entfernen, umbenennen),
Kennzahlen für die Diagnosen am Rand und die Kursangaben der Oberfläche (Steckbrief nur hier, nie in JavaScript).

Seit 2.0.0-a3 (AP11): `chat`, `material`, `durchsicht` in mappe.json; Ist-Minuten aus dem Inhalt gerechnet
(`zeitbedarf`); Strukturbausteine (`minuten: false` im Katalog) zählen in den Kennzahlen nicht; Antwort des Chats nur
für einzelne Bausteine einsetzen (`einsetzen`, Abgleich über `id:`) oder als weitere Einheit anhängen (`anhaengen`),
Vorschlag des Modus aus dem Text (`modus`).
"""
import datetime
import io
import json
import os
import re
import zipfile

import yaml

from . import api
from . import kursdatei as K

FORMAT = 2
_ZEIT = (1980, 1, 1, 0, 0, 0)
# seit 2.0.0-a3 (AP11): gewählter Chat, Material der Lehrkraft, Fragen und Lösungen durchgesehen; seit 2.0.0-b1 (AP13)
# die Schrittfolge: erreichter Schritt, Zweig („mach“, „steuer“), Aussehen gewählt, Text kopiert, importierte Einheiten,
# Zahl der Einheiten und der Teil der Einheit, die gerade angehängt wird
ZUSATZ = ("chat", "material", "durchsicht", "zeitplanung", "schritt", "zweig", "aussehen", "kopiert", "importiert",
          "einheiten", "anhaengen", "zeit_selbst")
# Schlüssel je Baustein, die neben den Feldern des Parsers in der Mappe bleiben (AP13): Einheit der Nachlieferung,
# ausgeschaltete Karte (optionale Phase der Vorlage)
BLEIBT = ("einheit", "aus")
AUTO = "automatisch"


class MappenFehler(Exception):
    pass


def neu(titel=None, bausteine=None, einheit=None):
    m = {"format": FORMAT, "kursmuehle": api.VERSION, "titel": titel or "", "erzeugt": _heute(),
         "bausteine": [_eintrag(b) for b in (bausteine or [])]}
    if einheit:
        m["einheit"] = dict(einheit)
    return m


def _heute():
    return datetime.date.today().isoformat()


def _eintrag(b, alt=None):
    """Metadaten eines Bausteins aus dem Parser-AST; `alt` = bisheriger Eintrag mit Auftrag, Phase, Soll."""
    alt = alt or {}
    e = {"id": b["id"], "typ": b["typ"], "titel": b["titel"], "abschnitt": b.get("abschnitt"),
         "minuten": b.get("minuten"), "auftrag": alt.get("auftrag", ""), "phase": alt.get("phase", ""),
         "soll": alt.get("soll", b.get("minuten")), "geplant": False, "neu": bool(alt.get("neu", False))}
    if alt.get("schritt") and alt.get("typ") in (b["typ"], AUTO):   # Teilschritt gilt nur für den geplanten Typ
        e["schritt"] = alt["schritt"]
    for k in BLEIBT:
        if alt.get(k):
            e[k] = alt[k]
    if alt.get("herkunft") and alt.get("titel") == b["titel"]:  # Titel von der Lehrkraft, bis der Chat ihn ersetzt
        e["herkunft"] = dict(alt["herkunft"])
    return e


def geplant(id, typ, titel, phase="", soll=None, auftrag="", schritt=""):
    """Eintrag für einen Baustein ohne Inhalt (Einheitsvorlage, „Baustein hinzufügen“); `schritt` = Teilschritt aus der
    Vorlage (steht im Text für den Chat, nicht auf der Karte)."""
    e = {"id": id, "typ": typ, "titel": titel, "abschnitt": None, "minuten": None, "auftrag": auftrag,
         "phase": phase, "soll": soll, "geplant": True, "neu": False}
    if schritt:
        e["schritt"] = schritt
    return e


def abgleich(mappe, bausteine):
    """mappe.json nach einer neuen Prüfung aktualisieren. Zuordnung zuerst über die ID (explizit mit `id:` oder
    berechnet), dann nach Position als Rückfall (gleicher Platz und Typ, sonst der nächste freie Eintrag gleichen Typs):
    so behält ein umbenannter Baustein Auftrag, Phase und Soll. Neue Bausteine kommen dazu, verschwundene fallen weg;
    geplante Bausteine ohne Gegenstück bleiben an ihrem Platz stehen. Reihenfolge wie in der Kursdatei."""
    alt = list(mappe.get("bausteine", []))
    nach_id = {e["id"]: i for i, e in enumerate(alt)}
    paar, genutzt = {}, set()
    for j, b in enumerate(bausteine):
        i = nach_id.get(b["id"])
        if i is not None and i not in genutzt:
            paar[j] = i
            genutzt.add(i)
    letzter, abschnitt = -1, None
    for j, b in enumerate(bausteine):
        if j in paar:
            letzter, abschnitt = paar[j], b.get("abschnitt")
            continue
        # eine geplante Karte füllt nur ein Baustein aus demselben Abschnitt (angehängte Einheit nimmt sie nicht)
        frei = [i for i in range(letzter + 1, len(alt)) if i not in genutzt
                and (alt[i].get("typ") == b["typ"] or (alt[i].get("geplant") and alt[i].get("typ") == AUTO))
                and not (alt[i].get("geplant") and alt[i].get("aus"))   # ausgeschaltete Karte bleibt leer (AP13.1)
                and not (alt[i].get("geplant") and abschnitt is not None and b.get("abschnitt") != abschnitt)]
        kandidat = j if j in frei else (frei[0] if frei else None)
        if kandidat is not None:
            paar[j] = kandidat
            genutzt.add(kandidat)
            letzter, abschnitt = kandidat, b.get("abschnitt")
    neu_liste = [_eintrag(b, alt[paar[j]] if j in paar else None) for j, b in enumerate(bausteine)]
    platz = {paar[j]: neu_liste[j] for j in paar}          # alter Index -> Eintrag in der neuen Liste
    for i, e in enumerate(alt):
        if i in genutzt or not e.get("geplant"):
            continue
        vor = next((platz[k] for k in range(i - 1, -1, -1) if k in platz), None)
        pos = neu_liste.index(vor) + 1 if vor is not None else 0
        eintrag = dict(geplant(e["id"], e.get("typ", ""), e.get("titel", "")), **{k: e.get(k) for k in
                       ("auftrag", "phase", "soll", "schritt") + BLEIBT if e.get(k) is not None}, neu=bool(e.get("neu")))
        neu_liste.insert(pos, eintrag)
        platz[i] = eintrag
    mappe["bausteine"] = neu_liste
    mappe["format"] = FORMAT
    mappe["kursmuehle"] = api.VERSION
    return mappe


def migriere(mappe):
    """Ältere oder unvollständige mappe.json auf Formatversion 2 heben."""
    if not isinstance(mappe, dict):
        raise MappenFehler("mappe.json: Mapping erwartet")
    f = mappe.get("format", 1)
    if not isinstance(f, int) or f > FORMAT:
        raise MappenFehler(f"mappe.json: Formatversion {f} ist neuer als diese Kursmühle ({FORMAT}); Seite aktualisieren")
    out = neu(mappe.get("titel"), einheit=mappe.get("einheit") if isinstance(mappe.get("einheit"), dict) else None)
    out["erzeugt"] = mappe.get("erzeugt", out["erzeugt"])
    for k in ZUSATZ:
        if mappe.get(k) not in (None, ""):
            out[k] = mappe[k]
    for e in mappe.get("bausteine", []) or []:
        if isinstance(e, dict) and e.get("id"):
            out["bausteine"].append({"id": e["id"], "typ": e.get("typ", ""), "titel": e.get("titel", ""),
                                     "abschnitt": e.get("abschnitt"), "minuten": e.get("minuten"),
                                     "auftrag": e.get("auftrag", ""), "phase": e.get("phase", ""), "soll": e.get("soll"),
                                     "geplant": bool(e.get("geplant", False)), "neu": bool(e.get("neu", False)),
                                     **({"schritt": e["schritt"]} if e.get("schritt") else {}),
                                     **({"herkunft": e["herkunft"]} if isinstance(e.get("herkunft"), dict) else {}),
                                     **{k: e[k] for k in BLEIBT if e.get(k)}})
    return out


def dateiname(mappe, datum=None):
    """<kurstitel>_<JJJJ-MM-TT>.kursmappe.zip"""
    titel = api._dateiname(mappe.get("titel") or "kurs")[:40]
    return f"{titel}_{datum or _heute()}.kursmappe.zip"


def schreiben(mappe, kurs_md, steckbrief, assets=None):
    """-> Bytes des ZIP. steckbrief: dict oder YAML-Text; assets: dict Name -> Bytes."""
    sb_text = steckbrief if isinstance(steckbrief, str) else api.steckbrief_schreiben(steckbrief or {})
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        def add(name, data):
            zi = zipfile.ZipInfo(name, date_time=_ZEIT)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, data if isinstance(data, bytes) else str(data).encode("utf-8"))
        add("mappe.json", json.dumps(mappe, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
        add("kurs.md", kurs_md or "")
        add("steckbrief.yaml", sb_text)
        for name in sorted(assets or {}):
            data = assets[name]
            add(f"assets/{os.path.basename(name)}", bytes(data.tobytes() if isinstance(data, memoryview) else data))
    return buf.getvalue()


def lesen(zip_bytes):
    """ZIP-Bytes -> dict(mappe, kurs_md, steckbrief (dict), steckbrief_text, assets {Name: Bytes})."""
    try:
        z = zipfile.ZipFile(io.BytesIO(bytes(zip_bytes)))
    except zipfile.BadZipFile:
        raise MappenFehler("Die Datei ist keine Kursmappe (kein ZIP)")
    namen = z.namelist()
    # auch Mappen akzeptieren, die in einem Unterordner gepackt wurden
    praefix = ""
    if "mappe.json" not in namen and "kurs.md" not in namen:
        for n in namen:
            if n.endswith("/kurs.md") or n.endswith("/mappe.json"):
                praefix = n.rsplit("/", 1)[0] + "/"
                break
    dateien = {n[len(praefix):]: z.read(n) for n in namen if n.startswith(praefix) and not n.endswith("/")}
    return aus_dateien(dateien)


def aus_dateien(dateien):
    """Dateien eines Ordners oder ZIPs (Pfad relativ -> Bytes): Kursmappe oder 1.x-Kursordner (kurs.md,
    steckbrief.yaml, assets/). Ohne mappe.json wird die Baustein-Liste aus der Kursdatei gelesen."""
    norm = {}
    for pfad, data in dateien.items():
        p = str(pfad).replace("\\", "/").lstrip("./")
        teile = p.split("/")
        # Ordnername davor (Import eines ganzen Ordners) abschneiden
        if len(teile) >= 2 and teile[-2] == "assets":
            p = "assets/" + teile[-1]
        elif teile[-1] in ("kurs.md", "steckbrief.yaml", "mappe.json"):
            p = teile[-1]
        else:
            continue
        norm[p] = bytes(data.tobytes() if isinstance(data, memoryview) else data)
    if "kurs.md" not in norm:
        raise MappenFehler("kurs.md fehlt (Kursmappe oder Kursordner mit kurs.md, steckbrief.yaml, assets/ erwartet)")
    kurs_md = norm["kurs.md"].decode("utf-8-sig")
    sb_text = norm.get("steckbrief.yaml", b"").decode("utf-8-sig")
    try:
        sb = api.steckbrief_lesen(sb_text)
    except Exception as e:     # yaml-Fehler als Mappenfehler melden
        raise MappenFehler(f"steckbrief.yaml: {e}")
    assets = {k[len("assets/"):]: v for k, v in norm.items() if k.startswith("assets/") and k != "assets/"}
    if "mappe.json" in norm:
        try:
            mappe = migriere(json.loads(norm["mappe.json"].decode("utf-8-sig")))
        except json.JSONDecodeError as e:
            raise MappenFehler(f"mappe.json: {e}")
    else:
        titel = (sb.get("kurs") or {}).get("titel")
        m = re.search(r"^# (?:Drehbuch\s*v?\d*\s*·\s*)?(.+?)(?:\s*·\s*\d+.*)?$", kurs_md, re.M)
        mappe = neu(titel or (m.group(1).strip() if m else ""))
        pr = api.pruefe(kurs_md, assets, sb)
        abgleich(mappe, pr["bausteine"])
    return {"mappe": mappe, "kurs_md": kurs_md, "steckbrief": sb, "steckbrief_text": sb_text, "assets": assets}


# ---------------------------------------------------------------- Katalog
_KATALOG = None


def katalog():
    """references/katalog.yaml (liegt neben scripts/, auch im generator.zip der Browser-Fassung)."""
    global _KATALOG
    if _KATALOG is None:
        pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "references", "katalog.yaml")
        with open(pfad, encoding="utf-8") as f:
            _KATALOG = yaml.safe_load(f)
    return _KATALOG


# ---------------------------------------------------------------- Textoperationen auf kurs.md
def _bereiche(kurs_md):
    pr = api.pruefe(kurs_md)
    return pr["kursdatei"].splitlines(), pr["bausteine"]


def _text(lines):
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines) + "\n" if lines else ""


def _finde(bausteine, id):
    b = next((b for b in bausteine if b["id"] == id), None)
    if b is None:
        raise MappenFehler(f"Baustein {id} steht nicht in der Kursdatei")
    return b


def entferne(kurs_md, id):
    """Baustein (samt Unterbausteinen eines Unterabschnitts) aus der Kursdatei nehmen."""
    lines, bs = _bereiche(kurs_md)
    b = _finde(bs, id)
    del lines[b["zeile"] - 1:b["zeile"] - 1 + b["zeilen"]]
    return _text(lines)


def verschiebe(kurs_md, id, richtung):
    """Baustein um einen Platz nach oben (richtung < 0) oder unten verschieben, unter Bausteinen derselben Ebene. Am Rand
    seines Abschnitts (oder Unterabschnitts) wechselt er in den Nachbarn: ans Ende des vorigen, an den Anfang des
    nächsten. Gibt die Kursdatei unverändert zurück, wenn es keinen Nachbarn gibt."""
    lines, bs = _bereiche(kurs_md)
    x = _finde(bs, id)
    gleich = [b for b in bs if b["ebene"] == x["ebene"]]
    k = gleich.index(x) + (-1 if richtung < 0 else 1)
    if not 0 <= k < len(gleich):
        return _text(lines)
    ziel = gleich[k]
    eltern = (ziel["abschnitt"], ziel["unterabschnitt"]) == (x["abschnitt"], x["unterabschnitt"])
    davor = eltern if richtung < 0 else not eltern
    a, e = x["zeile"] - 1, x["zeile"] - 1 + x["zeilen"]
    block = lines[a:e]
    if not x.get("id_explizit"):        # die berechnete ID hängt am Abschnitt: festschreiben, damit sie bleibt
        block.insert(1, f"id: {x['id']}")
    if block and block[-1].strip():
        block.append("")
    rest = lines[:a] + lines[e:]
    za = ziel["zeile"] - 1 - (x["zeilen"] if ziel["zeile"] > x["zeile"] else 0)
    ze = za + ziel["zeilen"]
    pos = za if davor else ze
    if not davor and ze > 0 and rest[ze - 1].strip():
        block.insert(0, "")
    return _text(rest[:pos] + block + rest[pos:])


def umbenennen(kurs_md, id, titel):
    """Titel in der Überschrift des Bausteins ersetzen; Minuten und Drehbuch-Marker bleiben stehen. Die bisherige ID
    wird als `id:` festgeschrieben, damit Auftrag, Phase und Soll am Baustein bleiben."""
    titel = " ".join(str(titel).split())
    if not titel:
        raise MappenFehler("Der Titel ist leer")
    lines, bs = _bereiche(kurs_md)
    b = _finde(bs, id)
    kopf = lines[b["zeile"] - 1]
    m = re.match(r"^(#{3,4}\s+[^:]+:\s*)(.*)$", kopf)
    if not m or b["titel"] not in m.group(2):
        raise MappenFehler(f"Überschrift von „{b['titel']}“ nicht gefunden")
    lines[b["zeile"] - 1] = m.group(1) + m.group(2).replace(b["titel"], titel, 1)
    if not b.get("id_explizit"):
        lines.insert(b["zeile"], f"id: {b['id']}")
    return _text(lines)


# ---------------------------------------------------------------- Kennzahlen für die Diagnosen am Rand
_RE_FRAGE = re.compile(r"^(?:\d+\.\s+)?(MC|RF|Einsetzen|Markieren|Lückentext|Kurzantwort|Schnellquiz|Aussagen)\b")
_RE_NUM_MC = re.compile(r"^\d+\.\s+.*\s·\s.*[✔✓]")
_FRAGE_TYPEN = {"Quiz", "Test", "Lesebuch"}
ROLLEN = ["einstieg", "lesen", "üben", "sichern"]


def fragen(b):
    """Fragen eines Bausteins zählen: (alle, Multiple Choice, Auswahlfragen MC/RF, davon mit Rückmeldung)."""
    if b.get("typ") not in _FRAGE_TYPEN:
        return 0, 0, 0, 0
    alle = mc = auswahl = mit = 0
    offen = None            # laufende MC-Frage in Listenform: hat sie schon eine Rückmeldung?
    gruppe = None           # Schnellquiz/Aussagen: jede Listenzeile eine Frage
    for s in (b.get("text") or "").splitlines()[1:]:
        t = s.strip()
        m = _RE_FRAGE.match(t)
        if m or _RE_NUM_MC.match(t):
            art = m.group(1) if m else "MC"
            offen, gruppe = None, None
            if art in ("Schnellquiz", "Aussagen"):
                gruppe = art
                continue
            alle += 1
            if art in ("MC", "RF"):
                auswahl += 1
                mc += art == "MC"
                if "→" in t:
                    mit += 1
                elif art == "MC" and " · " not in t:
                    offen = "wartet"
            continue
        if t.startswith("- ") and gruppe:
            alle += 1
            mc += 1
            auswahl += 1
            continue
        if t.startswith("- ") and offen == "wartet" and "→" in t:
            mit += 1
            offen = "fertig"
        elif t and not t.startswith("- "):
            offen, gruppe = None, None
    return alle, mc, auswahl, mit


def _rollen():
    kat = katalog()
    typ = {e["typ"]: e.get("rolle", "rahmen") for e in kat["typen"]}
    phase = {}
    for v in kat.get("vorlagen", []):
        for p in v["phasen"]:
            phase.setdefault(p["phase"], p.get("rolle", "rahmen"))
    return typ, phase


def struktur():
    """Typen ohne Zeitbedarf (`minuten: false` im Katalog): Kursbanner, Überblick, Unterabschnitt, Abzeichen, Datei …"""
    return {e["typ"] for e in katalog()["typen"] if e.get("minuten") is False}


# ---------------------------------------------------------------- Zeitbedarf aus dem Inhalt
_RE_WORT = re.compile(r"[0-9A-Za-zÄÖÜäöüßÀ-ÿ²³√π]+")
_RE_HTML = re.compile(r"<[^<>]*>")
_RE_LUECKE = re.compile(r"(?<!\*)\*(?!\*)[^*\n]+?(?<!\*)\*(?!\*)")
_RE_PRAEFIX = re.compile(r"^(?:\d+\.\s+|- |(?:Vorspann|Überschrift|Hervorhebung|Merke|Kasten|Beispiel|Hinweis|Schritte|Seite|"
                         r"Kapitel|Unterkapitel|Text|MC|RF|Einsetzen|Markieren|Lückentext|Kurzantwort|Aussagen|Schnellquiz|"
                         r"Szene|Frage|Ende)(?:\s*\([^)]*\))?:\s*)+")
_RE_ABSCHREIBEN = re.compile(r"\b(?:Übernimm|Übertrag\w*)\b[^.\n]*\bins Heft")
_RE_FRAGEZEILE = re.compile(r"^(?:\d+\.\s+)?(?:MC|RF|Einsetzen|Markieren|Lückentext|Kurzantwort)\b|^\d+\.\s+.*\s·\s")


def _jahrgang_faktor(jahrgang):
    tab = katalog()["zeitbedarf"]["jahrgang_faktor"]
    try:
        jg = int(re.match(r"\d+", str(jahrgang)).group(0))
    except (AttributeError, TypeError, ValueError):
        jg = 9
    stufen = sorted(int(k) for k in tab)
    return tab[max([k for k in stufen if jg >= k] or [stufen[0]])]


def rolle_von(e):
    """Rolle eines Mappen-Eintrags: Phase aus der Vorlage vor Rolle des Typs (einstieg, lesen, üben, sichern, rahmen)."""
    typ_rolle, phase_rolle = _rollen()
    return phase_rolle.get(e.get("phase")) or typ_rolle.get(e.get("typ"), "rahmen")


def zeitbedarf(b, jahrgang=None, rolle=None):
    """Minuten (Kommazahl), die ein Baustein braucht, aus dem Inhalt gerechnet (Werte in katalog.yaml `zeitbedarf`):
    Lesetext nach Rolle (Einstieg 120, Erarbeitung 60 Wörter je Minute für Jahrgangsstufe 9, Faktor je Stufe),
    Hefteintrag mit Abschreibtempo, jede Aufgabe 1,5 oder mit Rechenausdruck 3 Minuten (ihre Wörter zählen nicht noch
    einmal), dazu Sekunden je Lernkarte, Aussage, Szene und Bild. None für Strukturbausteine und Typen, deren Zeit der
    Inhalt nicht zeigt (Video, Link, Abgabe)."""
    z = katalog()["zeitbedarf"]
    typ = b.get("typ")
    if typ in struktur() or typ in z["ohne_rechnung"] or typ == "Unterabschnitt":
        return None
    sek, auf = z["sekunden"], z["aufgabe_minuten"]
    rechnen = re.compile(z["rechnen_muster"])
    rolle = rolle or _rollen()[0].get(typ, "rahmen")
    faktor = _jahrgang_faktor(jahrgang)
    kat = next((e for e in katalog()["typen"] if e["typ"] == typ), {})
    angaben = set(kat.get("angaben", [])) | set(katalog()["gemeinsam"]["angaben"])
    zeilen = (b.get("text") or "").splitlines()[1:]
    woerter, sekunden, kopf = 0, 0.0, True
    aufgaben = []                 # Text je Aufgabe (Frage und ihre Zeilen), für den Rechenaufwand
    in_aufgabe, gruppe, kasten = False, False, None
    for roh in zeilen:
        t = roh.strip()
        if not t:
            continue
        # Kasten mit einer Frage (Denkaufgabe, „Denk kurz nach“) zählt einmal als einfache Aufgabe
        if t.startswith("Kasten:"):
            kasten = "offen"
        elif kasten and roh.startswith("  "):
            if kasten == "offen" and "?" in t:
                aufgaben.append("Denkaufgabe")
                kasten = "gezaehlt"
        else:
            kasten = None
        if kopf:
            m = re.match(r"^([a-zäöüß ]+):\s", t)
            if m and m.group(1) in angaben:
                continue
            kopf = False
        if t.startswith(("Bild:", "Bildzeile:")):
            sekunden += sek["bild"]
            teile = t.split("|")
            if not (t.startswith("Bildzeile:") and len(teile) > 2):
                continue
            t = teile[2]
        if _RE_FRAGEZEILE.match(t):
            aufgaben.append(t)
            in_aufgabe, gruppe = True, False
            continue
        if re.match(r"^(?:\d+\.\s+)?(Schnellquiz|Aussagen)\b", t):
            in_aufgabe, gruppe = False, True
            continue
        if gruppe and t.startswith("- "):
            sekunden += sek["aussage"]
            continue
        if in_aufgabe and not re.match(r"^(Seite|Kapitel|Unterkapitel|Überschrift|Vorspann|Merke|Kasten|Beispiel|Hinweis|"
                                       r"Hervorhebung|Schritte|Text)\b", t):
            aufgaben[-1] += " " + t          # Optionen, Einsetzen- und Lückentext-Zeilen gehören zur Aufgabe
            continue
        in_aufgabe = gruppe = False
        if typ == "Zuordnen" and t.startswith("- "):
            sekunden += sek["zuordnung"]
            continue
        if typ == "Lernkarten" and t.startswith("- "):
            sekunden += sek["karte"]
            continue
        if typ == "Umfrage" and t.startswith("- "):
            sekunden += sek["umfrage"]
            continue
        if typ == "Geschichte" and re.match(r"^(Szene|Frage|Ende)\b", t):
            sekunden += sek["szene"]
        if typ == "Lückentext":
            sekunden += sek["luecke"] * len(_RE_LUECKE.findall(re.sub(r"\*\*[^*]+\*\*", " ", t)))
        t = t.split(" → ")[0]
        t = _RE_PRAEFIX.sub("", _RE_HTML.sub(" ", t))
        woerter += len(_RE_WORT.findall(t.replace("✔", " ").replace("✘", " ")))
    minuten = sum(auf["rechnen"] if rechnen.search(a) else auf["einfach"] for a in aufgaben)
    if typ in ("Zuordnen", "Lückentext") and not aufgaben:
        text = b.get("text") or ""
        minuten += auf["rechnen"] if rechnen.search(text) else auf["einfach"]
        sekunden = max(0.0, sekunden - auf["einfach"] * 60) if typ == "Zuordnen" else sekunden
    heft = "Hefteintrag" in (b.get("titel") or "") or bool(_RE_ABSCHREIBEN.search(b.get("text") or ""))
    wpm = (z["abschreiben"] if heft else z["woerter_je_minute"].get(rolle, z["woerter_je_minute"]["rahmen"])) * faktor
    return max(1.0, minuten + woerter / wpm + sekunden / 60)


def _luecke(e, genau, ziel):
    """Hinweis an der Karte, was fehlt: „Erarbeitung für 4 Minuten statt 15“ (`ziel` = Soll, sonst Angabe)."""
    name = re.sub(r"\s+\d+$", "", e.get("phase") or "") or next(
        (t["formularname"] for t in katalog()["typen"] if t["typ"] == e.get("typ")), e.get("typ", "Baustein"))
    n = round(genau)
    return f"{name} für {n} Minute{'' if n == 1 else 'n'} statt {ziel}"


# ---------------------------------------------------------------- Plan der Einheit: reichen die Karten? (AP13.1)
def _einheit_karten(mappe):
    """Eingeschaltete Karten der laufenden Einheit ohne Strukturbausteine: beim Anhängen nur die neue Einheit, sonst
    die Karten ohne `einheit`."""
    teil = mappe.get("anhaengen")
    return [e for e in mappe.get("bausteine", []) if not e.get("aus") and e.get("typ") not in struktur()
            and (e.get("einheit") == teil if teil else not e.get("einheit"))]


def _rolle_im_plan(e, uebung):
    """Rolle einer Karte für den Plan: Phase vor Typ; eine Karte mit Inhalt zählt nur als Übung, wenn ihr Typ eine Übung
    ist (ein Kasten mit Fragen im Lesetext ist keine Übung)."""
    r = rolle_von(e)
    if r == "üben" and not e.get("geplant") and e.get("typ") not in uebung:
        return _rollen()[0].get(e.get("typ"), "rahmen")
    return r


def _vorlage(mappe):
    name = (mappe.get("einheit") or {}).get("vorlage")
    return next((v for v in katalog().get("vorlagen", []) if v["name"] == name), None)


def planung(mappe):
    """Reicht der Plan für die Minuten? Summe der Richtwerte je Karte nach Rolle (`zeitbedarf.karte_minuten`) gegen die
    Minuten der Einheit, dazu die Rollen der Vorlage, die keine eingeschaltete Karte mehr trägt. Nur für Einheiten aus
    einer Vorlage. -> {karten, minuten, traegt, zu_wenig, fehlen: [Warnung], text}"""
    kat = katalog()
    v = _vorlage(mappe)
    karten = _einheit_karten(mappe)
    minuten = (mappe.get("einheit") or {}).get("minuten")
    richt = kat["zeitbedarf"]["karte_minuten"]
    regeln = kat["pruefregeln"]
    rollen = [_rolle_im_plan(e, regeln["uebung"]) for e in karten]
    traegt = sum(richt.get(r, richt["rahmen"]) for r in rollen)
    soll = [] if v is None else list(dict.fromkeys(p.get("rolle") for p in v["phasen"] if not p.get("optional")))
    fehlen = [regeln["fehlt"][r] for r in soll if r in regeln["fehlt"] and r not in rollen]
    zu_wenig = bool(v is not None and minuten and traegt < int(minuten))
    n = len(karten)
    text = f"{n} {'Karte' if n == 1 else 'Karten'} für {minuten} Minuten" if zu_wenig else ""
    return {"karten": n, "minuten": minuten, "traegt": traegt, "zu_wenig": zu_wenig, "fehlen": fehlen, "text": text}


def _vorlage_karte(b, phase, soll, id):
    """Karte aus einem Eintrag der Vorlage („Typ: Titel | Teilschritt“) mit Typ automatisch."""
    kopf, _, schritt = b.partition(" | ")
    titel = kopf.split(":", 1)[1].strip() if ":" in kopf else phase["phase"]
    return geplant(id, AUTO, titel, phase["phase"], soll, schritt=schritt.strip())


def auffuellen(mappe):
    """„Vorlage auffüllen“: fehlende Rollen der Vorlage als Karten mit Typ automatisch an ihren Platz in der Phasenfolge
    (nach der letzten Karte einer früheren oder gleichen Rolle); tragen die Karten die Minuten dann noch nicht, je eine
    weitere Karte in den dehnbaren Phasen, bis sie reichen (höchstens sechs neue Karten). Nur die laufende Einheit."""
    v = _vorlage(mappe)
    if v is None:
        return mappe
    liste = mappe.setdefault("bausteine", [])
    minuten = int((mappe.get("einheit") or {}).get("minuten") or 45)
    uebung = katalog()["pruefregeln"]["uebung"]
    reihe = {r: i for i, r in enumerate(ROLLEN)}
    teil = mappe.get("anhaengen")
    ids = {e["id"] for e in liste}

    def neue_id():
        n = 1
        while f"b{n}" in ids:
            n += 1
        ids.add(f"b{n}")
        return f"b{n}"

    def einsetzen_nach_rolle(karte, rolle):
        eigene = _einheit_karten(mappe)
        frueher = [e for e in eigene if reihe.get(_rolle_im_plan(e, uebung), -1) <= reihe.get(rolle, -1)]
        if frueher:
            pos = liste.index(frueher[-1]) + 1
        else:
            pos = liste.index(eigene[0]) if eigene else len(liste)
        if teil:
            karte["einheit"] = teil
        liste.insert(pos, karte)

    neu = 0
    vorhanden = {_rolle_im_plan(e, uebung) for e in _einheit_karten(mappe)}
    for p in v["phasen"]:
        if p.get("optional") or p.get("rolle") in vorhanden:
            continue
        vorhanden.add(p.get("rolle"))
        soll = max(1, round(p["anteil"] / 100 * minuten / len(p["bausteine"])))
        for b in p["bausteine"]:
            einsetzen_nach_rolle(_vorlage_karte(b, p, soll, neue_id()), p.get("rolle"))
            neu += 1
    dehnbar = [p for p in v["phasen"] if p.get("dehnbar") and not p.get("optional")]
    k = 0
    while dehnbar and planung(mappe)["zu_wenig"] and neu < 6:
        p = dehnbar[k % len(dehnbar)]
        k += 1
        karte = _vorlage_karte(p["bausteine"][0], p, max(1, round(p["anteil"] / 100 * minuten / 2)), neue_id())
        karte["titel"] = f"{karte['titel']} {k // len(dehnbar) + 2}"
        einsetzen_nach_rolle(karte, p.get("rolle"))
        neu += 1
    return mappe


def kennzahlen(mappe, pruefung=None, minuten=None, steckbrief=None):
    """Zahlen für den Rand: Minuten (gerechnet) gegen Soll, Folge Lesen → Üben → Sichern, Anteil Multiple Choice,
    Rückmeldungen, und Hinweise je Baustein (Fehler, Bild fehlt, Rückmeldung fehlt, ohne Inhalt). `zeit` je Baustein:
    gerechnete Minuten, Angabe aus der Überschrift und ob sie um mehr als 20 % abweicht. Strukturbausteine (Kursbanner,
    Überblick, Abzeichen, Datei …) zählen nicht. Nummern = Platz in der Bausteinliste."""
    pruefung = pruefung or {}
    nach_id = {b["id"]: b for b in pruefung.get("bausteine", [])}
    typ_rolle, phase_rolle = _rollen()
    ohne = struktur()
    eintraege = [e for e in mappe.get("bausteine", []) if e.get("typ") not in ohne and not e.get("aus")]
    # Zeit je Phase selbst eingestellt (AP13)? Sonst verteilt das Modell, Soll der Karten zählt nicht
    selbst = mappe.get("zeit_selbst", True) is not False
    soll_von = (lambda e: e.get("soll")) if selbst else (lambda e: None)
    nummer = {e["id"]: i + 1 for i, e in enumerate(mappe.get("bausteine", []))}
    einheit = mappe.get("einheit") or {}
    jahrgang = einheit.get("jahrgang") or ((api._steckbrief(steckbrief).get("kurs") or {}).get("jahrgangsstufe")
                                           if steckbrief else None)
    soll = minuten or einheit.get("minuten") or sum(int(soll_von(e) or 0) for e in eintraege) or None
    grenze = katalog()["zeitbedarf"]["abweichung"] / 100
    ist = 0
    zeit = {}
    folge, zaehl = [], {"fragen": 0, "mc": 0, "auswahl": 0, "rueckmeldung": 0}
    hinweise = []
    for e in eintraege:
        b = nach_id.get(e["id"])
        if b is not None and not e.get("geplant"):
            genau = zeitbedarf(b, jahrgang, rolle_von(e))
            gerechnet = round(genau) if genau is not None else None
            angabe = b.get("minuten")
            ziel = soll_von(e) or angabe
            # mehr als 20 % und mindestens eine ganze Minute neben dem Soll (sonst der Angabe des Chats)
            ab = bool(genau and ziel and abs(ziel - genau) > max(grenze * genau, 1))
            zeit[e["id"]] = {"gerechnet": gerechnet, "angabe": angabe, "soll": soll_von(e), "abweichung": ab,
                             "text": _luecke(e, genau, ziel) if ab else ""}
            if ab:
                hinweise.append({"art": "zeit", "stufe": "hinweis", "baustein": e["id"], "nummer": nummer[e["id"]],
                                 "text": f"Baustein {nummer[e['id']]}: {zeit[e['id']]['text']}"})
            ist += gerechnet if gerechnet is not None else int(angabe or soll_von(e) or 0)
        else:
            ist += int(soll_von(e) or 0)
        rolle = phase_rolle.get(e.get("phase")) or typ_rolle.get(e.get("typ"), "rahmen")
        if rolle in ROLLEN[1:] and (not folge or folge[-1] != rolle):
            folge.append(rolle)
        if b is None:
            continue
        alle, mc, auswahl, mit = fragen(b)
        zaehl["fragen"] += alle
        zaehl["mc"] += mc
        zaehl["auswahl"] += auswahl
        zaehl["rueckmeldung"] += mit
        if auswahl > mit and b["typ"] in ("Quiz", "Lesebuch") and rolle != "sichern":
            hinweise.append({"art": "rueckmeldung", "stufe": "hinweis", "baustein": e["id"], "nummer": nummer[e["id"]],
                             "text": f"Rückmeldung fehlt bei {auswahl - mit} von {auswahl} Auswahlfragen in Baustein "
                                     f"{nummer[e['id']]}"})
    for d in pruefung.get("diagnosen", []):
        n = nummer.get(d.get("baustein"))
        if d["stufe"] == "fehler":
            hinweise.append({"art": "fehler", "stufe": "fehler", "baustein": d.get("baustein"), "nummer": n,
                             "text": (f"Baustein {n}: " if n else "") + d["text"]})
        elif d.get("art") == "bild" and n:
            hinweise.append({"art": "bild", "stufe": "warnung", "baustein": d["baustein"], "nummer": n,
                             "text": f"Bild fehlt in Baustein {n}"})
    plan = planung(mappe)
    for text in plan["fehlen"]:
        hinweise.append({"art": "phase", "stufe": "warnung", "baustein": None, "nummer": None, "text": text})
    leer = [e for e in mappe.get("bausteine", []) if e.get("geplant") and not e.get("aus")]
    if leer:
        hinweise.append({"art": "leer", "stufe": "hinweis", "baustein": leer[0]["id"], "nummer": nummer[leer[0]["id"]],
                         "text": f"{len(leer)} {'Baustein' if len(leer) == 1 else 'Bausteine'} noch ohne Inhalt"})
    rang = {"fehler": 0, "warnung": 1, "hinweis": 2}
    hinweise.sort(key=lambda h: (rang[h["stufe"]], h["nummer"] or 0))
    # Brüche der Folge: Schritte zurück nach dem Sichern und Übungen vor dem ersten Lesetext (Lesen nach Üben ist der
    # Normalfall bei mehreren Lesetexten und zählt nicht)
    rueck = sum(1 for a in folge[:-1] if a == "sichern")
    vor_lesen = len(folge) if "lesen" not in folge else folge.index("lesen")
    return {"minuten": {"ist": ist, "soll": soll}, "folge": [r.capitalize() for r in folge],
            "folge_brueche": rueck + vor_lesen, "fragen": zaehl,
            "mc_anteil": round(100 * zaehl["mc"] / zaehl["fragen"]) if zaehl["fragen"] else None,
            "bausteine": len(eintraege), "geplant": len(leer), "hinweise": hinweise, "zeit": zeit,
            "inhalt": any(not e.get("geplant") for e in eintraege), "zeit_selbst": selbst, "planung": plan}


# ---------------------------------------------------------------- Antwort des Chats einsetzen
def antwort(text):
    """Antwort des Chats lesen; einzelne Bausteine ohne Abschnitt (`## `) bekommen einen, damit der Parser sie annimmt.
    -> Ergebnis von gen.api.pruefe"""
    md, _ = api.extrahiere_kursdatei(text or "")
    if not re.search(r"^## ", md, re.M) and re.search(r"^#{3,4} ", md, re.M):
        kopf, rest = [], []
        for z in md.splitlines():
            (rest if rest or re.match(r"^#{3,4} ", z) else kopf).append(z)
        kopf = [z for z in kopf if not z.startswith("```")]
        if not kopf or not kopf[0].startswith("# "):
            kopf.insert(0, "# Drehbuch v1 · Antwort")
        rest = ["###" + z.lstrip("#") if z.startswith("####") and not any(r.startswith("### Unterabschnitt") for r in rest)
                else z for z in rest if not z.startswith("```")]
        md = "\n".join(kopf + ["", "## Antwort"] + rest) + "\n"
    return api.pruefe(md)


def _bloecke(kursdatei, bausteine):
    """Oberste Bausteine einer Antwort mit ihren Zeilen (Unterbausteine eines Unterabschnitts gehören zum Block)."""
    lines = kursdatei.splitlines()
    out, ende = [], 0
    for b in bausteine:
        if b["zeile"] <= ende:
            continue
        block = lines[b["zeile"] - 1:b["zeile"] - 1 + b["zeilen"]]
        while block and not block[-1].strip():
            block.pop()
        out.append((b, block))
        ende = b["zeile"] + b["zeilen"] - 1
    return out


def _kopfzeilen(kursdatei):
    """Zeilen `Bildwunsch:`, `Bildprompt:`, `Angenommen:`, `Offen:`, `Abweichung:` vor dem ersten Abschnitt."""
    out = []
    for z in kursdatei.splitlines():
        if z.startswith("## "):
            break
        if re.match(r"^(Bildwunsch|Bildprompt|Angenommen|Offen|Abweichung):", z):
            out.append(z)
    return out


def _ebene(block, ebene):
    if block and re.match(r"^#{3,4}\s", block[0]):
        block = ["#" * ebene + block[0].lstrip("#")] + block[1:]
    return block


def _mit_id(block, id):
    if any(re.match(rf"^id:\s*{re.escape(id)}\s*$", z) for z in block[1:6]):
        return block
    rest = [z for z in block[1:] if not re.match(r"^id:\s", z)]
    return [block[0], f"id: {id}"] + rest


def _skelett(mappe, antwort_md):
    e = mappe.get("einheit") or {}
    titel = e.get("thema") or mappe.get("titel") or "Einheit"
    m = re.search(r"^## .+$", antwort_md, re.M)
    kopf = m.group(0) if m and "Allgemeines" not in m.group(0) else f"## {titel}" + (f" · {e['minuten']} min" if e.get("minuten") else "")
    return f"# Drehbuch v1 · {titel}\n\n{kopf}\n"


def modus(mappe, text):
    """Vorschlag, wie die Antwort des Chats eingesetzt wird: `baustein`, wenn ein einzelner Baustein kam oder alle
    Bausteine eine `id:` tragen, die es in der Einheit gibt, und es weniger sind als die Einheit hat; sonst `ersetzen`;
    `keine`, wenn der Text keine Bausteine enthält. Anhängen wählt die Lehrkraft selbst."""
    pa = antwort(text)
    bl = _bloecke(pa["kursdatei"], pa["bausteine"])
    bekannt = {e["id"] for e in mappe.get("bausteine", [])}
    n = len(bl)
    treffer = [b["id"] for b, _ in bl if b.get("id_explizit") and b["id"] in bekannt]
    gesamt = len([e for e in mappe.get("bausteine", []) if e.get("typ") not in struktur() and not e.get("aus")]) or len(bekannt)
    if not n:
        art = "keine"
    elif n == 1 or (len(treffer) == n and n < gesamt):
        art = "baustein"
    else:
        art = "ersetzen"
    return {"modus": art, "bausteine": n, "treffer": len(treffer), "ids": [b["id"] for b, _ in bl]}


def einsetzen(mappe, kurs_md, text, nur=None):
    """Nur die Bausteine der Antwort in die Kursdatei setzen, Abgleich über `id:`: steht die ID in der Kursdatei, ersetzt
    der Block den alten (Ebene wie dort); ist sie ein geplanter Baustein der Mappe, kommt der Block an seinen Platz in der
    Reihenfolge der Mappe. Ein einzelner Baustein ohne `id:` geht an die markierte Karte (`neu`), wenn genau eine
    markiert ist. Sonst eine Fehlermeldung mit Vorschlag; die Kursdatei bleibt dann für diesen Baustein unverändert.
    `nur` (AP13.1, Korrekturschleife an der Karte): ein einzelner Baustein der Antwort geht an diese Karte, mit oder
    ohne `id:`. -> {kurs_md, ersetzt, eingefuegt, fehler}"""
    pa = antwort(text)
    antwort_md = pa["kursdatei"]
    bl = _bloecke(antwort_md, pa["bausteine"])
    plan = mappe.get("bausteine", [])
    nach_id = {e["id"]: e for e in plan}
    markiert = [e for e in plan if e.get("neu")]
    md = kurs_md if (kurs_md or "").strip() else ""
    ersetzt, eingefuegt, fehler_ = [], [], []
    for b, block in bl:
        id = b["id"] if b.get("id_explizit") else None
        if nur and len(bl) == 1:
            id = nur
        elif id is None and len(bl) == 1 and len(markiert) == 1:
            id = markiert[0]["id"]
        basis = re.match(r"^(.+)-\d+$", id or "")
        zweiter = id is not None and id not in nach_id and basis is not None and basis.group(1) in nach_id
        if id is None or (id not in nach_id and not zweiter):
            gleich = [e for e in plan if e.get("titel") == b["titel"] or (e.get("neu") and e.get("typ") == b["typ"])]
            vorschlag = (f" Meinst du „{gleich[0]['titel']}“? Bitte den Chat, den Baustein mit der Zeile `id: "
                         f"{gleich[0]['id']}` noch einmal auszugeben.") if gleich else \
                " Markiere die Karte, die er ersetzen soll, mit „Diesen Baustein neu beauftragen“, oder wähle „Einheit ersetzen“."
            fehler_.append((f"„{b['titel']}“ hat keine id:." if id is None else
                            f"„{b['titel']}“ trägt id: {id}, die es in dieser Einheit nicht gibt.") + vorschlag)
            continue
        if not md:
            md = _skelett(mappe, antwort_md)
        lines, bs = _bereiche(md)
        alt = next((x for x in bs if x["id"] == id), None)
        if alt is not None:
            neu_block = _mit_id(_ebene(block, alt["ebene"]), id)
            lines[alt["zeile"] - 1:alt["zeile"] - 1 + alt["zeilen"]] = neu_block + [""]
            ersetzt.append(id)
        else:
            reihe = [e["id"] for e in plan]
            if id not in reihe:                       # zweiter Baustein zu einer Karte: direkt dahinter
                reihe.insert(reihe.index(basis.group(1)) + 1, id)
            i = reihe.index(id)
            vorher = next((x for k in range(i - 1, -1, -1) for x in bs if x["id"] == reihe[k]), None)
            nachher = next((x for k in range(i + 1, len(reihe)) for x in bs if x["id"] == reihe[k]), None)
            if vorher is not None:
                # nach dem vorigen Baustein (samt Unterbausteinen) einfügen, auf seiner Ebene
                ende = max(x["zeile"] + x["zeilen"] - 1 for x in bs if x is vorher or
                           (vorher["typ"] == "Unterabschnitt" and x.get("unterabschnitt") == vorher["titel"]
                            and x["abschnitt"] == vorher["abschnitt"]))
                pos, ebene = ende, vorher["ebene"]
            elif nachher is not None:
                pos, ebene = nachher["zeile"] - 1, nachher["ebene"]
            else:
                pos, ebene = len(lines), 3
            neu_block = _mit_id(_ebene(block, ebene), id)
            if pos > 0 and lines[pos - 1].strip():
                neu_block = [""] + neu_block
            lines[pos:pos] = neu_block + [""]
            eingefuegt.append(id)
        md = _text(lines)
    if ersetzt or eingefuegt:
        kopf = [z for z in _kopfzeilen(antwort_md) if z not in md]
        if kopf:
            lines = md.splitlines()
            pos = 1 if lines and lines[0].startswith("# ") else 0
            lines[pos:pos] = kopf
            md = _text(lines)
    return {"kurs_md": md if (ersetzt or eingefuegt) else kurs_md, "ersetzt": ersetzt, "eingefuegt": eingefuegt,
            "fehler": fehler_}


def anhaengen(kurs_md, text, teil=None):
    """Antwort als weitere Einheit hinten an die Kursdatei hängen: ihre Abschnitte ab dem ersten `## ` (ein zweites
    „Allgemeines“ fällt weg, wenn die Kursdatei schon eins hat), Kopfzeilen nach vorn, doppelte `id:` mit Endung -2.
    `teil` (AP13, etwa „e2“): jeder angehängte Abschnitt bekommt die Zeile `teil: e2`, damit die Seite nur diese Einheit
    als Nachlieferung bauen kann (Bau mit `delta`, Wiederherstellen mit „zusammenführen“)."""
    pa = antwort(text)
    antwort_md = pa["kursdatei"]
    if not (kurs_md or "").strip():
        return antwort_md
    vorhanden = {b["id"] for b in api.pruefe(kurs_md)["bausteine"]}
    lines = antwort_md.splitlines()
    start = next((i for i, z in enumerate(lines) if z.startswith("## ")), len(lines))
    teil_name, teile, weg = teil, [], False
    hat_allgemein = re.search(r"^## Allgemeines\s*$", kurs_md, re.M) is not None
    for z in lines[start:]:
        if z.startswith("## "):
            weg = hat_allgemein and z.strip() == "## Allgemeines"
        if weg:
            continue
        m = re.match(r"^id:\s*(\S+)\s*$", z)
        if m and m.group(1) in vorhanden:
            n = 2
            while f"{m.group(1)}-{n}" in vorhanden:
                n += 1
            z = f"id: {m.group(1)}-{n}"
            vorhanden.add(z[4:])
        if teil_name and re.match(r"^teil:\s*", z) and teile and teile[-1] == f"teil: {teil_name}":
            continue                                  # eigene teil:-Zeile des Chats weicht der Einheit
        teile.append(z)
        if teil_name and z.startswith("## ") and z.strip() != "## Allgemeines":
            teile.append(f"teil: {teil_name}")
    md = kurs_md.rstrip("\n").splitlines()
    kopf = [z for z in _kopfzeilen(antwort_md) if z not in kurs_md]
    if kopf:
        pos = 1 if md and md[0].startswith("# ") else 0
        md[pos:pos] = kopf
    return _text(md + [""] + teile)


# ---------------------------------------------------------------- Kursangaben der Oberfläche
def angaben_lesen(steckbrief):
    """Steckbrief (YAML-Text oder dict) -> Werte der Formularfelder."""
    sb = api._steckbrief(steckbrief)
    k = sb.get("kurs") or {}
    design = k.get("design") or {}
    farbe = str(k.get("farbe") or "")
    name = next((n for n, h in K.FARBEN.items() if h.lower() == farbe.lower() and "ue" not in n), "")
    website = str(k.get("website", "nein")).lower()
    return {"thema": k.get("titel", ""), "jahrgang": str(k.get("jahrgangsstufe") or ""),
            "minuten": k.get("umfang_min"), "fach": k.get("fach", ""), "schulart": k.get("schulart", ""),
            "format": k.get("format", "themen"),
            "vorlage": design.get("vorlage", "schlicht"), "farbe": name,
            "website": "nein" if website in K.NEIN else "textfeld",
            "abschluss": k.get("abschluss", "keiner"), "portionierung": k.get("portionierung", "keine")}


def angaben_schreiben(steckbrief, angaben):
    """Formularwerte in den Steckbrief schreiben (andere Schlüssel bleiben). Gibt den YAML-Text zurück."""
    sb = api._steckbrief(steckbrief)
    k = dict(sb.get("kurs") or {})
    a = angaben or {}
    if "thema" in a:
        k["titel"] = str(a["thema"]).strip()
    if "jahrgang" in a:
        k["jahrgangsstufe"] = str(a["jahrgang"]).strip()
    if a.get("minuten") not in (None, ""):
        k["umfang_min"] = int(a["minuten"])
    for feld in ("fach", "schulart", "format", "abschluss", "portionierung"):
        if feld in a:
            k[feld] = str(a[feld]).strip()
    if "vorlage" in a:
        k["design"] = dict(k.get("design") or {}, vorlage=str(a["vorlage"]))
    if "farbe" in a:
        if a["farbe"]:
            k["farbe"] = K.FARBEN[str(a["farbe"]).lower()]
        else:
            k.pop("farbe", None)
    if "website" in a:
        k["website"] = "textfeld" if a["website"] == "textfeld" else "nein"
    if not k.get("kurzname") and k.get("titel"):
        k["kurzname"] = k["titel"][:20].strip()
    sb["kurs"] = k
    return api.steckbrief_schreiben(sb)
