"""Text für den Chat (AP11): aus `references/katalog.yaml` und dem Stand der Kursmappe, für CLI und Browser derselbe Text.

    chats()                                        Chat-Auswahl aus dem Katalog
    einheit(mappe, steckbrief, chat, material, nur_leere)  -> {teile, groessen, ids, typen}: Text „Diese Einheit“ oder
                                                   „Alle leeren Bausteine“, gestückelt über 12 KB oder nach Chat
    baustein(mappe, ids, kurs_md, steckbrief, chat)  -> Text „Nur dieser Baustein“ (etwa 1 KB, bisheriger Inhalt als Kontext)
    korrektur(pruefung)                            -> Sätze an den Chat, einer je Fehler (eigener Satz, wenn die Prüfung
                                                   einen mitgibt: `bitte`, etwa bei einer Zeit-Annahme)
    fragen(pruefung)                               -> Ansicht „Fragen und Lösungen“ (Fragen, Optionen, Lösungen, ohne Rückmeldung)
    fachcheck(pruefung, steckbrief)                -> Text für einen neuen Chat: Aufgaben ohne Lösungen
    vergleich(pruefung, antwort)                   -> Abweichungen zwischen Antwort des neuen Chats und Kursdatei

Der Text richtet sich an das Modell, nicht an die Lehrkraft; die Sätze stehen im Katalog unter `prompt`.
"""
import re

from . import api
from . import mappe as M

GRENZE = 12 * 1024          # Ziel je Text in Bytes (Plan §4; 12 KB seit AP13.1 für sechs Typen zu „automatisch“, 68 KB
                            # liefen im Test in AIS-Chat und fobizz); darüber stückelt einheit() nach Abschnitten
_TEXTTYPEN = {"Textfeld", "Seite", "Lesebuch", "Buch", "Aufgabe", "Datei", "Geschichte"}
_FRAGETYPEN = {"Quiz", "Test", "Lesebuch"}


def _kat():
    return M.katalog()


def chats():
    return _kat()["chats"]


def chat(wert=None):
    """Eintrag der Chat-Auswahl; unbekannt oder leer = „anderer Chat“. Ein dict wird unverändert genommen (Tests)."""
    if isinstance(wert, dict):
        return wert
    liste = chats()
    return next((c for c in liste if c["wert"] == wert), next(c for c in liste if c["wert"] == "anderer"))


def _text_von(feld, wert):
    return next((w["text"] for w in _kat()["oberflaeche"][feld] if w["wert"] == wert), wert)


def _typ(typ):
    return next((e for e in _kat()["typen"] if e["typ"] == typ), None)


# ---------------------------------------------------------------- Teile des Textes
def _auftrag(mappe, angaben):
    e = mappe.get("einheit") or {}
    teile = []
    thema = e.get("thema") or angaben.get("thema") or mappe.get("titel")
    if thema:
        teile.append(f"Thema: {thema}")
    if angaben.get("fach"):
        teile.append(f"Fach: {angaben['fach']}")
    if angaben.get("schulart"):
        teile.append(f"Schulart: {angaben['schulart']}")
    jg = e.get("jahrgang") or angaben.get("jahrgang")
    if jg:
        teile.append(f"Jahrgangsstufe {jg}")
    minuten = e.get("minuten") or angaben.get("minuten")
    if minuten:
        teile.append(f"{minuten} Minuten")
    return " · ".join(teile), thema or "Einheit", minuten


def _angenommen(angaben):
    website = "auf der Kursseite (formative Übungen als Block im Textfeld, Kursdatei-Angabe `website: textfeld` am " \
              "Abschnitt)" if angaben.get("website") == "textfeld" else "als eigene Aktivitäten"
    return [f"Angenommen: Kursformat {_text_von('format', angaben.get('format', 'themen'))}",
            f"Angenommen: Designvorlage {_text_von('vorlage', angaben.get('vorlage', 'schlicht'))}",
            f"Angenommen: Übungen erscheinen {website}",
            f"Angenommen: {_text_von('abschluss', angaben.get('abschluss', 'keiner'))}",
            f"Angenommen: {_text_von('portionierung', angaben.get('portionierung', 'keine'))}"]


_LESETYPEN = {"Textfeld", "Seite", "Buch", "Lesebuch"}
_AUFGABENTYPEN = {"Quiz", "Test", "Lückentext"}


def wortziel(e, jahrgang=None):
    """Länge, die ein Baustein für seine Soll-Minuten braucht, aus denselben Werten wie die Rechnung (katalog.yaml
    `zeitbedarf`): Lesetext nach Rolle und Jahrgangsstufe in Wörtern, Hefteintrag im Abschreibtempo, Quiz und Test in
    Aufgaben (Mittel aus einfach und rechnen), Zuordnen und Lernkarten in Elementen. Leer ohne Soll."""
    soll, typ = e.get("soll"), e.get("typ")
    if not soll or typ in M.struktur():
        return ""
    k = _kat()
    z, p = k["zeitbedarf"], k["prompt"]
    faktor = M._jahrgang_faktor(jahrgang)
    rolle = M.rolle_von(e)
    minuten = f"{soll} Minute" + ("" if soll == 1 else "n")
    if typ in _LESETYPEN:
        if rolle == "rahmen":
            return p["wortziel_kurz"]
        heft = "Hefteintrag" in (e.get("titel") or "") or "Hefteintrag" in (e.get("schritt") or "")
        einstieg = rolle == "einstieg" and typ == "Textfeld"
        wpm = z["abschreiben"] if heft else z["woerter_je_minute"].get(rolle, z["woerter_je_minute"]["rahmen"])
        lesen = max(0.5, soll - z["aufgabe_minuten"]["einfach"]) if einstieg else soll   # Denkaufgabe abziehen
        woerter = max(20, int(round(lesen * wpm * faktor / 10.0)) * 10)
        if rolle == "einstieg":                      # Einstieg kurz (AP13.1), mit Abstand zur Grenze der Prüfung
            woerter = min(woerter, k["pruefregeln"]["einstieg_woerter"] - 20)
        if heft:                                     # Wortziel nie unter dem Mindestmaß des Hefteintrags
            woerter = max(woerter, next((t["mindest"]["zahl"] for t in k["typen"] if t["typ"] == typ and t.get("mindest")), 0))
        art = "wortziel_heft" if heft else "wortziel_einstieg" if einstieg else "wortziel_text"
        return p[art].format(min=minuten, woerter=woerter)
    if typ in _AUFGABENTYPEN:
        mittel = (z["aufgabe_minuten"]["einfach"] + z["aufgabe_minuten"]["rechnen"]) / 2
        n = max(1, round(soll / mittel))
        return p["wortziel_aufgaben"].format(n=f"{n} Aufgabe" + ("" if n == 1 else "n"), min=minuten)
    if typ in ("Zuordnen", "Lernkarten"):
        sek = z["sekunden"]["zuordnung" if typ == "Zuordnen" else "karte"]
        return p["wortziel_elemente"].format(n=max(3, min(12, round(soll * 60 / sek / 2))))
    return ""


AUTO = "automatisch"           # Typ einer Karte, deren Typ das Modell wählt (AP13)


def zeit_selbst(mappe):
    """Hat die Lehrkraft die Zeit je Phase selbst eingestellt? Schalter `zeit_selbst` der Mappe (AP13); ohne Schlüssel
    (Kursdateien vor 2.0.0-b1) gelten die Soll-Minuten wie bisher."""
    return mappe.get("zeit_selbst", True) is not False


def _zeile(e, nr, jahrgang=None, selbst=True):
    """Eine Zeile der Bausteinliste: id, Typ (oder „Typ frei“), Arbeitstitel, Phase, mit `selbst` die Soll-Minuten mit
    Wortziel, Teilschritt aus der Vorlage, Auftrag der Lehrkraft."""
    teile = [f"{nr}. id: {e['id']}", "Typ frei" if e.get("typ") == AUTO else e.get("typ", ""),
             f"Arbeitstitel „{e.get('titel', '')}“"]
    if e.get("typ") not in M.struktur():
        if e.get("phase"):
            teile.append(f"Phase {e['phase']}")
        ziel = wortziel(e, jahrgang) if selbst and e.get("typ") != AUTO else ""
        if ziel:
            teile.append(ziel)
        elif selbst and e.get("soll"):
            teile.append(f"{e['soll']} min")
    if (e.get("schritt") or "").strip():
        teile.append("Teilschritt: " + " ".join(e["schritt"].split()))
    if (e.get("auftrag") or "").strip():
        teile.append("Auftrag: " + " ".join(e["auftrag"].split()))
    return " · ".join(teile)


def zaehlregeln(liste, typen, uebung=True):
    """Zählregeln für den Inhalt (AP13.1): Mindestmaße der Typen dieser Einheit (`mindest` im Katalog; der Hefteintrag
    nur, wenn eine Karte so heißt oder diesen Teilschritt hat), Einstieg kurz (wenn eine Karte die Rolle Einstieg hat),
    mit `uebung` die Regel, dass Denkaufgaben keine Übung sind (nur im Text für die ganze Einheit)."""
    k = _kat()
    p, regeln = k["prompt"], k["pruefregeln"]
    teile = []
    for e in k["typen"]:
        m = e.get("mindest")
        if not m or e["typ"] not in typen or m.get("nur"):
            continue
        teile.append(p["mindest_typ"].format(typ=e["typ"], zahl=m["zahl"], einheit=m["einheit"]))
    heft = next((e["mindest"] for e in k["typen"] if (e.get("mindest") or {}).get("nur") == "Hefteintrag"), None)
    if heft and any("Hefteintrag" in f"{x.get('titel', '')} {x.get('schritt', '')}" for x in liste):
        teile.append(p["mindest_hefteintrag"].format(zahl=heft["zahl"]))
    out = [p["mindest"].format(liste="; ".join(teile))] if teile else []
    if any(M.rolle_von(x) == "einstieg" for x in liste):
        out.append(p["einstieg"].format(woerter=regeln["einstieg_woerter"]))
    if uebung:
        out.append(p["uebung"].format(typen=", ".join(regeln["uebung"][:-1]) + " oder " + regeln["uebung"][-1]))
    return out


def braucht_skizze(angaben, thema=""):
    """Fach aus `skizze_faecher` oder ein Stichwort aus `skizze_stichworte` im Thema (Geometrie, Brüche, Diagramme …)."""
    p = _kat()["prompt"]
    fach = (angaben.get("fach") or "").lower()
    text = f"{thema} {angaben.get('thema') or ''}".lower()
    return any(f.lower() in fach for f in p["skizze_faecher"]) or any(w.lower() in text for w in p["skizze_stichworte"])


def _format(typen, ch, kopf=True):
    k = _kat()
    zeilen = ["Format der Kursdatei"]
    if kopf:
        zeilen.append("- Erste Zeile `# Drehbuch v1 · Thema · N min`; darunter im Kopf nur Zeilen `Angenommen: …`, "
                      "`Bildwunsch: …`, `Bildprompt: …` und `Offen: …` (fachliche Zweifel für die Lehrkraft).")
        zeilen.append("- " + k["kopf"]["abschnitt"]["regeln"][0])
    zeilen += ["- " + r for r in k["gemeinsam"]["regeln"]]
    if set(typen) & _TEXTTYPEN:
        zeilen.append("- " + k["prompt"]["textbausteine"])
    if set(typen) & _FRAGETYPEN:
        zeilen.append("- " + k["prompt"]["fragen"])
    if "Test" in typen:
        zeilen.append("- " + k["prompt"]["fragen_test"])
    zeilen.append("- " + k["prompt"]["bilder_erzeugen" if ch.get("bilder") else "bilder"])
    zeilen.append("")
    zeilen.append("Beispiel und Regeln je Typ (nur die Typen dieser Einheit):")
    for e in k["typen"]:
        if e["typ"] not in typen:
            continue
        zeilen.append("```")
        zeilen += e["beispiel"].rstrip("\n").splitlines()
        zeilen.append("```")
        zeilen += ["- " + r for r in e.get("regeln", [])]
    return zeilen


def _ausgabe(ch):
    p = _kat()["prompt"]
    return [p["ausgabe_codeblock"] if ch.get("codeblock", True) else p["ausgabe_text"], p["ausgabe_ids"]]


def _gruppen(eintraege):
    """Bausteinliste nach Abschnitten: geplante Bausteine ohne Abschnitt gehören zum vorigen."""
    out, letzter = [], None
    for e in eintraege:
        a = e.get("abschnitt") or letzter
        if not out or a != out[-1][0]:
            out.append((a, []))
        out[-1][1].append(e)
        letzter = a
    return out


def _einheit_text(mappe, angaben, ch, liste, alle, material, teil, von, nur_leere):
    k = _kat()
    p = k["prompt"]
    auftrag, thema, minuten = _auftrag(mappe, angaben)
    jahrgang = (mappe.get("einheit") or {}).get("jahrgang") or angaben.get("jahrgang")
    selbst = zeit_selbst(mappe)
    # Typen zur Wahl auch ohne Karte „automatisch“, sobald die Zeitregel zum Ergänzen auffordert (Prompttest AP13.1, Lauf C)
    typen, auto = [], any(e.get("typ") == AUTO for e in liste) or bool(minuten)
    for e in liste:
        if e.get("typ") and e["typ"] != AUTO and e["typ"] not in typen:
            typen.append(e["typ"])
    if auto:
        typen += [t for t in k["automatisch"]["typen"] if t not in typen]
    z = [p["einheit"], "", "Auftrag", auftrag, p["lernende"], ""]
    z.append("Vorgaben, schon entschieden (übernimm diese Zeilen unverändert in den Kopf):")
    z += _angenommen(angaben)
    z.append("")
    if nur_leere:
        fertig = [e for e in alle if not e.get("geplant") and e.get("typ") not in M.struktur()]
        if fertig:
            z.append("Diese Bausteine der Einheit gibt es schon, schreib sie nicht noch einmal: "
                     + "; ".join(f"„{e['titel']}“" for e in fertig) + ".")
    if von > 1:
        z.append(p["teil"].format(n=teil, von=von, weiter=p["teil_weiter"] if teil < von else p["teil_letzter"]))
    z.append("Bausteine (genau diese, in dieser Reihenfolge; Arbeitstitel ersetzt du durch einen Titel, der sagt, "
             "worum es geht):")
    nr = {e["id"]: i + 1 for i, e in enumerate(alle)}
    for abschnitt, gruppe in _gruppen(liste):
        z.append(f"Abschnitt „{abschnitt or thema}“" + (f" · {minuten} min" if minuten and len(_gruppen(alle)) == 1 else ""))
        z += [_zeile(e, nr[e["id"]], jahrgang, selbst) for e in gruppe]
    if auto:
        z += [p["automatisch"]] + [f"- {t}: {zeile}" for t, zeile in k["automatisch"]["typen"].items()] + [p["automatisch_zwei"]]
    if not selbst and minuten:
        zb, f = k["zeitbedarf"], M._jahrgang_faktor(jahrgang)
        wpm = zb["woerter_je_minute"]
        zahl = lambda x: f"{x:g}".replace(".", ",")
        z.append(p["zeit_frei"].format(minuten=minuten, lesen=int(round(wpm["lesen"] * f)), einstieg=int(round(wpm["einstieg"] * f)),
                                       heft=int(round(zb["abschreiben"] * f)), einfach=zahl(zb["aufgabe_minuten"]["einfach"]),
                                       rechnen=zahl(zb["aufgabe_minuten"]["rechnen"])))
    if minuten:
        z.append(p["zeit"].format(minuten=minuten))
    z.append("")
    if material and teil == 1:
        z += ["Material der Lehrkraft (nutze es als Grundlage; Tatsachen daraus haben Vorrang vor deinen):",
              material.strip(), ""]
    z += _format(typen, ch)
    z += ["", "Vorgaben für den Inhalt (zähle nach, bevor du ausgibst):"] + ["- " + r for r in p["leitplanken"]]
    z += ["- " + r for r in zaehlregeln(liste, typen)]
    if braucht_skizze(angaben, thema):
        z.append("- " + p["skizze"])
    z += ["", "Prüfe vor der Ausgabe:"] + ["- " + r for r in p["checkliste"]]
    z += [""] + _ausgabe(ch)
    return "\n".join(z) + "\n", typen


def _groesse(t):
    return len(t.encode("utf-8"))


def einheit(mappe, steckbrief=None, chat_wert=None, material=None, nur_leere=False, grenze=GRENZE):
    """Text „Diese Einheit“ (oder mit nur_leere „Alle leeren Bausteine“). Sprengt der Text die Grenze oder hat er mehr
    Bausteine, als der Chat je Antwort schafft (`teil_bausteine`), stückelt die Seite nach Abschnitten, notfalls
    innerhalb eines Abschnitts; jeder Teil sagt „Teil n von m“. -> {teile: [Text], groessen: [Bytes], ids: [[id]], typen: [[Typ]]}"""
    ch = chat(chat_wert if chat_wert is not None else mappe.get("chat"))
    angaben = M.angaben_lesen(steckbrief or "")
    material = material if material is not None else mappe.get("material", "")
    alle = [e for e in mappe.get("bausteine", []) if e.get("typ") != "Badge" and not e.get("aus")]
    liste = [e for e in alle if e.get("geplant")] if nur_leere else alle
    if not liste:
        return {"teile": [], "groessen": [], "ids": [], "typen": []}
    n = ch.get("teil_bausteine") or len(liste)

    def text(stueck, teil=1, von=1):
        return _einheit_text(mappe, angaben, ch, stueck, alle, material, teil, von, nur_leere)

    ganz, typen = text(liste)
    if _groesse(ganz) <= grenze and len(liste) <= n:
        return {"teile": [ganz], "groessen": [_groesse(ganz)], "ids": [[e["id"] for e in liste]], "typen": [typen]}
    # Teile: ganze Abschnitte, solange sie passen; ein Abschnitt, der nicht passt, füllt den laufenden Teil Baustein für
    # Baustein auf (Grenze: Bytes und Bausteine je Teil)
    def passt(stueck):
        return len(stueck) <= n and _groesse(text(stueck, 2, 2)[0]) <= grenze

    teile = [[]]
    for _, gruppe in _gruppen(liste):
        if passt(teile[-1] + gruppe):
            teile[-1] += gruppe
            continue
        if teile[-1] and passt(gruppe):
            teile.append(list(gruppe))
            continue
        for e in gruppe:
            if teile[-1] and not passt(teile[-1] + [e]):
                teile.append([])
            teile[-1].append(e)
    von = len(teile)
    texte = [text(t, i + 1, von) for i, t in enumerate(teile)]
    return {"teile": [t for t, _ in texte], "groessen": [_groesse(t) for t, _ in texte],
            "ids": [[e["id"] for e in t] for t in teile], "typen": [ty for _, ty in texte]}


def baustein(mappe, ids, kurs_md="", steckbrief=None, chat_wert=None, kontext=900, pruefung=None):
    """Text „Nur dieser Baustein“ für eine oder mehrere markierte Karten: Auftrag, die Zeile der Bausteinliste, Format
    nur für diesen Typ, der bisherige Inhalt (gekürzt) als Kontext und, mit `pruefung`, die Fehler der Prüfung. Ziel
    etwa 1 KB je Baustein."""
    if isinstance(ids, str):
        ids = [ids]
    ch = chat(chat_wert if chat_wert is not None else mappe.get("chat"))
    p = _kat()["prompt"]
    angaben = M.angaben_lesen(steckbrief or "")
    alle = mappe.get("bausteine", [])
    nr = {e["id"]: i + 1 for i, e in enumerate(alle)}
    liste = [e for e in alle if e["id"] in ids]
    bisher = {}
    if (kurs_md or "").strip():
        bisher = {b["id"]: b["text"] for b in api.pruefe(kurs_md)["bausteine"]}
    auftrag, _, _ = _auftrag(mappe, angaben)
    z = [p["baustein"] if len(liste) == 1 else p["baustein"].replace("einen Baustein", "diese Bausteine")
         .replace("nur diesen Baustein", "nur diese Bausteine"), "", "Einheit: " + auftrag, p["lernende"], ""]
    typen = []
    jahrgang = (mappe.get("einheit") or {}).get("jahrgang") or angaben.get("jahrgang")
    for e in liste:
        z.append(_zeile(e, nr[e["id"]], jahrgang, zeit_selbst(mappe)))
        for t in (list(_kat()["automatisch"]["typen"]) if e["typ"] == AUTO else [e["typ"]]):
            if t not in typen:
                typen.append(t)
        alt = bisher.get(e["id"])
        if alt and not e.get("geplant"):
            alt = alt.strip()
            if len(alt) > kontext:
                alt = alt[:kontext].rsplit("\n", 1)[0] + "\n…"
            z += ["Bisheriger Inhalt (verbessern, nicht wiederholen):", "```", alt, "```"]
        meldungen = [d for d in (pruefung or {}).get("diagnosen", []) if d.get("baustein") == e["id"] and d["stufe"] == "fehler"]
        for d in meldungen:
            z.append("Die Prüfung meldet" + (f" in Zeile {d['zeile_im_baustein']}" if d.get("zeile_im_baustein") else "")
                     + f": {d['text'].rstrip('. ')}.")
    if any(e["typ"] == AUTO for e in liste):
        z += [p["automatisch"]] + [f"- {t}: {zeile}" for t, zeile in _kat()["automatisch"]["typen"].items()]
    z += ["- " + r for r in zaehlregeln(liste, typen, uebung=False)]
    z.append("")
    k = _kat()
    z.append("Format")
    z += ["- " + k["gemeinsam"]["regeln"][0], "- " + k["gemeinsam"]["regeln"][1]]
    if set(typen) & _TEXTTYPEN:
        z.append("- " + p["textbausteine"])
    if set(typen) & _FRAGETYPEN:
        z.append("- " + p["fragen"])
    if "Test" in typen:
        z.append("- " + p["fragen_test"])
    for e in k["typen"]:
        if e["typ"] in typen:
            z += ["```"] + e["beispiel"].rstrip("\n").splitlines() + ["```"] + ["- " + r for r in e.get("regeln", [])]
    z.append("")
    z.append(("Ausgabe: nur " + ("dieser Baustein" if len(liste) == 1 else "diese Bausteine")
              + (" als ein Codeblock" if ch.get("codeblock", True) else " als reiner Text")
              + ", ohne Text davor oder danach; in der Zeile unter der Überschrift `id:` genau wie oben."))
    return "\n".join(z) + "\n"


# ---------------------------------------------------------------- Korrekturbitte
def korrektur(pruefung):
    """Je Fehler ein Satz an den Chat, mit Bausteintitel und id; Fehler außerhalb eines Bausteins bitten um die ganze
    Kursdatei. -> [{baustein, titel, satz}]"""
    vorlage = _kat()["prompt"]["korrektur"]
    titel = {b["id"]: b["titel"] for b in (pruefung or {}).get("bausteine", [])}
    out = []
    for d in (pruefung or {}).get("diagnosen", []):
        if d.get("stufe") != "fehler":
            continue
        text = d["text"].rstrip(". ")
        if d.get("bitte"):
            satz = d["bitte"]
        elif d.get("baustein"):
            zeile = f" in Zeile {d['zeile_im_baustein']}" if d.get("zeile_im_baustein") else ""
            satz = vorlage.format(titel=d.get("titel") or titel.get(d["baustein"], ""), id=d["baustein"], zeile=zeile,
                                  text=text)
        else:
            satz = f"Die Prüfung meldet{' in Zeile ' + str(d['zeile']) if d.get('zeile') else ''}: {text}. Gib die " \
                   f"Kursdatei im selben Format noch einmal aus."
        out.append({"baustein": d.get("baustein"), "titel": d.get("titel"), "satz": satz})
    return out


# ---------------------------------------------------------------- Fragen und Lösungen, Fachcheck
_RE_ART = re.compile(r"^(?:\d+\.\s+)?(MC|RF|Kurzantwort|Einsetzen|Markieren|Lückentext|Schnellquiz|Aussagen)"
                     r"(?:\s*\([^)]*\))?:\s*(.*)$")
_RE_NUM = re.compile(r"^\d+\.\s+(.*)$")
_RE_STERN = re.compile(r"(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)")


def _sauber(t):
    t = re.sub(r"<br\s*/?>", " ", t)
    t = re.sub(r"<[^<>]*>", "", t)
    t = t.replace("**", "").replace("==", "")
    return " ".join(t.split())


def _option(o):
    o = o.split(" → ")[0].strip()
    richtig = o.startswith("✔")
    return richtig, _sauber(o.lstrip("✔").strip())


def _luecken(zeilen):
    """Text mit *Lücken*: (Text mit ___, Lösungen je Lücke als Liste der Alternativen)."""
    loes, text = [], []
    for z in zeilen:
        z = re.sub(r"\*\*([^*]+)\*\*", r"\1", z)

        def ersetze(m):
            teile = m.group(1).split(":")[0].split("/")
            loes.append([t.strip() for t in teile if t.strip()])
            return "___"
        text.append(_RE_STERN.sub(ersetze, z))
    return _sauber(" ".join(text)), loes


def _fragen_baustein(b):
    typ, out = b.get("typ"), []
    zeilen = (b.get("text") or "").splitlines()[1:]
    def angabe(name):
        m = next((re.match(rf"^{name}:\s*(.+)$", z) for z in zeilen if z.startswith(name + ":")), None)
        return m.group(1).strip() if m else ""
    if typ == "Zuordnen":
        zonen = [z.strip() for z in angabe("zonen").split("|") if z.strip()]
        for z in zeilen:
            if z.startswith("- "):
                teil = z[2:].split(" → ")
                out.append({"art": "zuordnen", "frage": _sauber(teil[0]), "optionen": zonen + ["keine"],
                            "loesung": [[_sauber(teil[1]) if len(teil) > 1 else "keine"]]})
        return out
    if typ == "Lückentext":
        aufgabe = angabe("aufgabe")
        text = [z for z in zeilen if z.strip() and not re.match(r"^[a-zäöüß ]+:\s", z)]
        t, loes = _luecken(text)
        if loes:
            out.append({"art": "luecken", "frage": (aufgabe + " " if aufgabe else "") + t, "optionen": [], "loesung": loes})
        return out
    if typ not in _FRAGETYPEN:
        return out
    aktuell, gruppe = None, None

    def abschliessen():
        if aktuell and aktuell["art"] == "luecken":
            t, loes = _luecken(aktuell.pop("_text"))
            if loes:
                aktuell["frage"] = (aktuell["frage"] + " " + t).strip()
                aktuell["loesung"] = loes
                out.append(aktuell)
        elif aktuell and aktuell["art"] == "auswahl" and aktuell["optionen"]:
            out.append(aktuell)

    for roh in zeilen:
        z = roh.strip()
        m = _RE_ART.match(z)
        num = _RE_NUM.match(z)
        if m or (num and " · " in z and "✔" in z) or z.startswith(("Seite:", "Kapitel:")):
            abschliessen()
            aktuell, gruppe = None, None
            if not m and num:
                m = re.match(r"^()(.*)$", num.group(1))
                art = "MC"
            elif m:
                art = m.group(1)
            else:
                continue
            rest = m.group(2).strip()
            if art == "MC":
                if " · " in rest:
                    teile = rest.split(" · ")
                    opts = [_option(o) for o in teile[1:]]
                    out.append({"art": "auswahl", "frage": _sauber(teile[0]), "optionen": [o for _, o in opts],
                                "loesung": [[o] for r, o in opts if r], "mehrfach": sum(r for r, _ in opts) > 1})
                else:
                    aktuell = {"art": "auswahl", "frage": _sauber(rest), "optionen": [], "loesung": []}
            elif art == "RF":
                vor = re.split(r"[✔✘]", rest)[0]
                wert = "richtig" if "✔" in rest.split("→")[0] else "falsch"
                out.append({"art": "rf", "frage": _sauber(vor), "optionen": ["richtig", "falsch"], "loesung": [[wert]]})
            elif art == "Kurzantwort":
                teile = rest.split(" · ")
                out.append({"art": "kurz", "frage": _sauber(teile[0]), "optionen": [],
                            "loesung": [[_sauber(t) for t in teile[1:]]]})
            elif art in ("Einsetzen", "Markieren", "Lückentext"):
                aktuell = {"art": "luecken", "frage": _sauber(rest), "optionen": [], "loesung": [], "_text": []}
            else:
                gruppe = (art, _sauber(rest))
            continue
        if z.startswith("- ") and gruppe:
            teile = z[2:].split(" · ")
            if gruppe[0] == "Schnellquiz":
                opts = [_option(o) for o in teile[1:]]
                frage = _sauber(teile[0])
            else:
                opts = [_option(o) for o in teile]
                frage = gruppe[1] or "Welche Aussage stimmt?"
            out.append({"art": "auswahl", "frage": frage, "optionen": [o for _, o in opts],
                        "loesung": [[o] for r, o in opts if r], "mehrfach": False})
            continue
        if aktuell and aktuell["art"] == "auswahl" and z.startswith("- "):
            r, o = _option(z[2:])
            aktuell["optionen"].append(o)
            if r:
                aktuell["loesung"].append([o])
            aktuell["mehrfach"] = len(aktuell["loesung"]) > 1
            continue
        if aktuell and aktuell["art"] == "luecken" and z:
            aktuell["_text"].append(z)
            continue
        if z and aktuell and aktuell["art"] == "auswahl" and not aktuell["optionen"]:
            continue
        if z:
            abschliessen()
            aktuell = None
    abschliessen()
    return out


def fragen(pruefung):
    """Ansicht „Fragen und Lösungen“: je Frage Baustein, Art, Frage, Optionen und Lösung (Liste je Lücke mit
    Alternativen), ohne Rückmeldungen; nummeriert über die Einheit."""
    out = []
    for b in (pruefung or {}).get("bausteine", []):
        for f in _fragen_baustein(b):
            f.pop("_text", None)
            f.setdefault("mehrfach", False)
            out.append(dict(f, nr=len(out) + 1, baustein=b["id"], titel=b["titel"]))
    return out


_BUCHST = "ABCDEFGHIJ"


def fachcheck(pruefung, steckbrief=None):
    """Text für einen NEUEN Chat: alle Aufgaben der Einheit ohne Lösungen und ohne Rückmeldungen."""
    liste = fragen(pruefung)
    if not liste:
        return {"text": "", "fragen": 0}
    a = M.angaben_lesen(steckbrief or "")
    z = [_kat()["prompt"]["fachcheck"]]
    kopf = " · ".join(x for x in (a.get("fach"), a.get("schulart"),
                                  f"Jahrgangsstufe {a['jahrgang']}" if a.get("jahrgang") else "", a.get("thema")) if x)
    if kopf:
        z.append(kopf)
    z.append("")
    for f in liste:
        if f["art"] == "auswahl":
            z.append(f"{f['nr']}. {f['frage']}" + (" (mehrere richtig)" if f["mehrfach"] else ""))
            z += [f"   {_BUCHST[i]}) {o}" for i, o in enumerate(f["optionen"][:len(_BUCHST)])]
        elif f["art"] == "rf":
            z.append(f"{f['nr']}. Richtig oder falsch: {f['frage']}")
        elif f["art"] == "luecken":
            z.append(f"{f['nr']}. Lücken ({len(f['loesung'])}): {f['frage']}")
        elif f["art"] == "zuordnen":
            z.append(f"{f['nr']}. Ordne zu (Gruppen: {', '.join(f['optionen'])}): {f['frage']}")
        else:
            z.append(f"{f['nr']}. {f['frage']}")
    return {"text": "\n".join(z) + "\n", "fragen": len(liste)}


def _norm(t):
    t = str(t).lower().replace("^2", "²").replace("^3", "³").replace(",", ".")
    t = re.sub(r"[\s]+", " ", t).strip().strip(".;:")
    return t.replace(" ", "")


def _anzeige(f):
    if f["art"] == "auswahl":
        return ", ".join(_BUCHST[f["optionen"].index(l[0])] + ") " + l[0] for l in f["loesung"] if l[0] in f["optionen"])
    return "; ".join(l[0] if l else "" for l in f["loesung"])


def vergleich(pruefung, antwort):
    """Antwort des neuen Chats („3: B“) mechanisch mit den Lösungen der Kursdatei vergleichen; nur Abweichungen und
    fehlende Nummern zurück. -> {geprueft, abweichungen: [{nr, titel, baustein, frage, chat, kursdatei}], fehlend}"""
    liste = {f["nr"]: f for f in fragen(pruefung)}
    gesehen, abw = set(), []
    for z in (antwort or "").replace("\r", "").splitlines():
        m = re.match(r"^\s*[*#>\-\s]*(?:Aufgabe\s*)?(\d+)\s*[:.)\-–]\s*(.+?)\s*$", z)
        if not m or int(m.group(1)) not in liste:
            continue
        nr, wert = int(m.group(1)), m.group(2).replace("**", "").strip()
        f = liste[nr]
        gesehen.add(nr)
        if f["art"] == "auswahl":
            mb = re.match(r"^([A-J](?:\s*(?:,|;|und|&|\s)\s*[A-J])*)(?![A-Za-zäöü])", wert.strip().upper())
            chat_l = set(re.findall(r"[A-J]", mb.group(1))) if mb else set()
            soll = {_BUCHST[f["optionen"].index(l[0])] for l in f["loesung"] if l[0] in f["optionen"]}
            gleich = chat_l == soll
        elif f["art"] == "rf":
            w = wert.lower()
            chat_w = "falsch" if re.search(r"falsch|unwahr|false", w) else ("richtig" if re.search(r"richtig|wahr|true|stimmt", w) else "")
            gleich = chat_w == f["loesung"][0][0]
        elif f["art"] == "luecken":
            teile = [t for t in re.split(r"\s*;\s*", wert)]
            gleich = len(teile) == len(f["loesung"]) and all(_norm(t) in {_norm(x) for x in alt}
                                                              for t, alt in zip(teile, f["loesung"]))
        else:
            gleich = _norm(wert) in {_norm(x) for x in f["loesung"][0]}
        if not gleich:
            abw.append({"nr": nr, "titel": f["titel"], "baustein": f["baustein"], "frage": f["frage"], "chat": wert,
                        "kursdatei": _anzeige(f)})
    return {"geprueft": len(liste), "abweichungen": abw, "fehlend": sorted(set(liste) - gesehen)}
