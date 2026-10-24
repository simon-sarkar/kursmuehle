"""Text für den Chat (AP11, gen/prompt.py) und Einsetzen der Antwort (gen/mappe.py):
- Text „Diese Einheit“ für jede der vier Einheitsvorlagen unter 10 KB, nur die vorkommenden Typen, alle `id:`,
  Leitplanken mit Zählregel, Checkliste höchstens zehn Zeilen
- Chat-Varianten: Codeblock ja/nein, Stückelung („Teil 1 von 2“, jeder Teil unter 10 KB, alle IDs genau einmal),
  Satz zum Aufwand nur bei ChatGPT (steht in der Oberfläche, nicht im Text), Bild-Prompts nur bei Chats mit Bildern
- „Nur dieser Baustein“ unter 2 KB, mit bisherigem Inhalt als Kontext; „Alle leeren Bausteine“ nur die leeren
- Einsetzen über `id:` (ersetzen, an den Platz eines geplanten Bausteins, ohne id an die markierte Karte, Fehler mit
  Vorschlag), Anhängen als neuer Abschnitt, Vorschlag des Modus
- Korrekturbitte je Fehler mit Titel und id; Fragen und Lösungen; Fachcheck ohne Lösungen, Vergleich findet Abweichungen
- Ist-Minuten aus dem Inhalt, Strukturbausteine ohne Minuten
- AP13: Vorlagen mit höchstens sechs Karten, Teilschritte nur im Text, Typ „automatisch“ (Typ frei, Typen zur Wahl,
  zweiter Baustein mit -2), ausgeschaltete Karte nicht im Text, Schalter „Zeit je Phase selbst einstellen“ (aus: keine
  Soll-Minuten, Zeit verteilt das Modell nach Richtwerten), Herkunft des Titels bleibt bis zum neuen Titel des Chats

usage: python3 scripts/tests/test_prompt.py   (Exit 0 = alles gut)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import mappe as M  # noqa: E402
from gen import prompt as P  # noqa: E402

fehler = []


def ok(cond, was):
    print(("ok     " if cond else "FALSCH ") + was)
    if not cond:
        fehler.append(was)


def vorlage_karten(v, minuten=45):
    """Wie vorlageKarten() in web/app.js (vereinfacht: anteilig auf die Minuten)."""
    karten, n = [], 0
    for p in v["phasen"]:
        for k, b in enumerate(p["bausteine"]):
            kopf, _, schritt = b.partition(" | ")
            typ, _, titel = kopf.partition(":")
            n += 1
            karten.append(M.geplant(f"b{n}", typ.strip(), titel.strip() or p["phase"], p["phase"],
                                    max(1, round(p["anteil"] / 100 * minuten / len(p["bausteine"]))), schritt=schritt.strip()))
            if p.get("optional"):
                karten[-1]["aus"] = True          # wie in web/app.js: optionale Phase ist ausgeschaltet
    return karten


def typen_von(v, kat):
    """Typen im Text einer Vorlage: feste Typen der eingeschalteten Karten, für „automatisch“ die Typen zur Wahl."""
    out = set()
    for p in v["phasen"]:
        if p.get("optional"):
            continue
        for b in p["bausteine"]:
            t = b.split(":")[0].strip()
            out |= set(kat["automatisch"]["typen"]) if t == "automatisch" else {t}
    return out


def json_kopie(x):
    return json.loads(json.dumps(x))


def neue_mappe(titel, karten, einheit=None):
    m = M.neu(titel, einheit=einheit)
    m["bausteine"] = karten
    return m


def steckbrief(**a):
    return M.angaben_schreiben("", dict({"thema": "Satz des Pythagoras", "jahrgang": "9", "minuten": 45,
                                         "fach": "Mathematik", "schulart": "Mittelschule"}, **a))


def ordner(name):
    d = {}
    for f in ("kurs.md", "steckbrief.yaml", "mappe.json"):
        pfad = os.path.join(ROOT, "scripts", "tests", "fixtures", name, f)
        if os.path.exists(pfad):
            with open(pfad, "rb") as h:
                d[f] = h.read()
    return M.aus_dateien(d)


def main():
    kat = M.katalog()
    sb = steckbrief()
    alle_typen = {e["typ"] for e in kat["typen"]}

    # 1 Diese Einheit je Vorlage
    for v in kat["vorlagen"]:
        mappe = neue_mappe("Satz des Pythagoras", vorlage_karten(v), {"thema": "Satz des Pythagoras", "jahrgang": "9",
                                                                  "minuten": 45, "vorlage": v["name"]})
        e = P.einheit(mappe, sb, "ais")
        t = e["teile"][0]
        typen_v = typen_von(v, kat)
        im_text = set(re.findall(r"^### (\w+):", t, re.M))
        ok(len(e["teile"]) == 1 and e["groessen"][0] < 10 * 1024, f"{v['name']}: ein Text, {e['groessen'][0]} Bytes")
        ok(im_text == typen_v, f"{v['name']}: Beispiele nur für {sorted(typen_v)}" + ("" if im_text == typen_v else f" (im Text {sorted(im_text)})"))
        ok(not (alle_typen - typen_v - {"Badge"}) & set(re.findall(r"^### (\w+):", t, re.M)), f"{v['name']}: keine fremden Typen")
        ids = [k["id"] for k in mappe["bausteine"] if not k.get("aus")]
        aus = [k["id"] for k in mappe["bausteine"] if k.get("aus")]
        ok(all(f"id: {i} ·" in t for i in ids) and not any(f"id: {i} ·" in t for i in aus),
           f"{v['name']}: alle {len(ids)} id: in der Bausteinliste, ausgeschaltete ({aus}) nicht")
        ok(len(mappe["bausteine"]) <= 6, f"{v['name']}: {len(mappe['bausteine'])} Karten (höchstens sechs)")
        ok("Mathematik" in t and "Mittelschule" in t and "Jahrgangsstufe 9" in t and "45 Minuten" in t,
           f"{v['name']}: Auftrag mit Fach, Schulart, Jahrgang, Minuten")
        ok(t.count("Angenommen: ") >= 5, f"{v['name']}: Angenommen-Zeilen")
        check = t.split("Prüfe vor der Ausgabe:")[1].split("\n\n")[0].strip().splitlines()
        ok(0 < len(check) <= 10, f"{v['name']}: Checkliste mit {len(check)} Zeilen")
        ok("Zähle MC gegen alle Fragen" in t and "zähle Bilder und Alt-Texte" in t and "Rundungsanweisung" in t
           and "Fehlvorstellung" in t, f"{v['name']}: Leitplanken mit Zählregel")
        ok("```markdown" in t and "Codeblock" in t, f"{v['name']}: Ausgabe als Codeblock")

    # 2 Chat-Varianten
    v = kat["vorlagen"][0]
    mappe = neue_mappe("Satz des Pythagoras", vorlage_karten(v), {"thema": "Satz des Pythagoras", "jahrgang": "9", "minuten": 45})
    ohne = dict(P.chat("ais"), codeblock=False)
    t = P.einheit(mappe, sb, ohne)["teile"][0]
    ok("```markdown" not in t and "reiner Text" in t, "Chat ohne Codeblock: Ausgabe als reiner Text")
    mappe8 = neue_mappe("Satz des Pythagoras", vorlage_karten(v) + [M.geplant(f"s{i}", "Seite", f"Seite {i}", "Lesen", 3)
                                                                     for i in range(3)], {"thema": "Satz des Pythagoras", "jahrgang": "9", "minuten": 45})
    st = P.einheit(mappe8, sb, "bylki")
    ids = [i for teil in st["ids"] for i in teil]
    ok(len(st["teile"]) == 2 and "Teil 1 von 2" in st["teile"][0] and "Teil 2 von 2" in st["teile"][1],
       f"ByLKI: gestückelt in {len(st['teile'])} Teile")
    ok(ids == [k["id"] for k in mappe8["bausteine"] if not k.get("aus")] and all(g < 10 * 1024 for g in st["groessen"]),
       f"Stückelung: jede id genau einmal, Größen {st['groessen']}")
    ok(all(f"id: {i} ·" in st["teile"][n] for n, teil in enumerate(st["ids"]) for i in teil)
       and not any(f"id: {i} ·" in st["teile"][1] for i in st["ids"][0]), "Stückelung: jeder Teil nur seine Bausteine")
    ok(P.chat("chatgpt").get("aufwand", "").count("Extra High") == 1 and not P.chat("ais").get("aufwand"),
       "Satz zum Aufwand nur bei ChatGPT")
    ok("Bild-Prompt" in P.einheit(mappe, sb, "chatgpt")["teile"][0] and "Bild-Prompt" not in P.einheit(mappe, sb, "ais")["teile"][0],
       "Bild-Prompts nur für Chats mit Bildern")
    ok([c["gruppe"] for c in P.chats()][:4] == ["dienstlich"] * 4 and P.chats()[-1]["wert"] == "anderer",
       "Chat-Auswahl: dienstliche zuerst, anderer zuletzt")
    gross = neue_mappe("Groß", [M.geplant(f"x{i}", "Seite", f"Seite {i}", "Lesen", 5, "Ein langer Auftrag " * 20)
                           for i in range(40)])
    g = P.einheit(gross, sb, "ais")
    ok(len(g["teile"]) > 1 and all(x < 10 * 1024 for x in g["groessen"]), f"über 10 KB: gestückelt {g['groessen']}")
    mat = P.einheit(mappe, sb, "ais", material="Heftaufschrieb: a² + b² = c²")
    ok("Material der Lehrkraft" in mat["teile"][0] and "a² + b² = c²" in mat["teile"][0], "Material im Text Diese Einheit")

    # 3 nur Baustein, alle leeren
    t = P.baustein(mappe, "b5", "", sb, "ais")
    ok(len(t.encode()) < 2048 and "id: b5" in t and "### Seite" in t, f"nur Baustein: {len(t.encode())} Bytes")
    n9 = ordner("netzwerk9")
    t = P.baustein(n9["mappe"], "check-weg", n9["kurs_md"], n9["steckbrief_text"], "ais")
    ok("Bisheriger Inhalt" in t and "Telefonbuchse" in t and len(t.encode()) < 3000, f"nur Baustein mit Kontext: {len(t.encode())} Bytes")
    kaputt_md = n9["kurs_md"].replace("- Router → Flur", "- Router → Dachboden")
    t = P.baustein(n9["mappe"], "raeume", kaputt_md, n9["steckbrief_text"], "ais", pruefung=api.pruefe(kaputt_md))
    ok("Die Prüfung meldet" in t and "Dachboden" in t, "nur Baustein: Fehler der Prüfung im Text")
    halb = neue_mappe("Pythagoras", vorlage_karten(v), {"thema": "Satz des Pythagoras", "minuten": 45})
    for k in halb["bausteine"][:3]:
        k["geplant"] = False
    leer = P.einheit(halb, sb, "ais", nur_leere=True)
    ok(leer["ids"][0] == [k["id"] for k in halb["bausteine"][3:] if not k.get("aus")] and "gibt es schon" in leer["teile"][0],
       "Alle leeren Bausteine: nur die Karten ohne Inhalt")

    # 4 Einsetzen, Anhängen, Modus
    kurs = n9["kurs_md"]
    neu_check = "```markdown\n### Quiz: Der Weg der Daten · 3 min\nid: check-weg\n1. Was kommt nach der Buchse? · ✔Router · Switch\n```"
    r = M.einsetzen(n9["mappe"], kurs, neu_check)
    pr = api.pruefe(r["kurs_md"])
    ok(r["ersetzt"] == ["check-weg"] and not r["fehler"] and "Der Weg der Daten" in r["kurs_md"]
       and len(pr["bausteine"]) == 10 and pr["ok"], "einsetzen: ersetzt nur Baustein check-weg")
    ok(r["kurs_md"].index("Der Weg der Daten") < r["kurs_md"].index("id: fall-huber"), "einsetzen: am alten Platz")
    m2 = M.migriere(n9["mappe"])
    m2["bausteine"].insert(5, M.geplant("neu1", "Lückentext", "Lücken", "Üben", 3))
    r = M.einsetzen(m2, kurs, "### Lückentext: Lücken · 3 min\nid: neu1\naufgabe: Setze ein.\nDer *Router* verbindet.\n")
    ids = [b["id"] for b in api.pruefe(r["kurs_md"])["bausteine"]]
    ok(r["eingefuegt"] == ["neu1"] and ids.index("neu1") == ids.index("wer-bin-ich") + 1, f"einsetzen: geplanter Baustein an seinem Platz ({ids[4:8]})")
    m3 = M.migriere(n9["mappe"])
    next(k for k in m3["bausteine"] if k["id"] == "quiz")["neu"] = True
    r = M.einsetzen(m3, kurs, "### Quiz: Schlussquiz · 4 min\n1. Was verbindet ins Internet? · ✔Router · Switch\n")
    ok(r["ersetzt"] == ["quiz"] and "id: quiz" in r["kurs_md"] and "Schlussquiz" in r["kurs_md"], "einsetzen: ohne id an die markierte Karte")
    r = M.einsetzen(n9["mappe"], kurs, "### Quiz: Irgendwas · 4 min\nid: gibtsnicht\n1. A? · ✔a · b\n")
    ok(not r["ersetzt"] and not r["eingefuegt"] and r["fehler"] and "die es in dieser Einheit nicht gibt" in r["fehler"][0]
       and r["kurs_md"] == kurs, f"einsetzen: unbekannte id = Fehler, Kursdatei bleibt ({r['fehler'][:1]})")
    r = M.einsetzen(n9["mappe"], kurs, "### Quiz: Check: Der Weg · 4 min\n1. A? · ✔a · b\n")
    ok(r["fehler"] and "Meinst du „Check: Der Weg“" in r["fehler"][0] and "id: check-weg" in r["fehler"][0], "einsetzen: Vorschlag bei fehlender id")
    leer_m = neue_mappe("Pythagoras", vorlage_karten(v), {"thema": "Satz des Pythagoras", "minuten": 45})
    r = M.einsetzen(leer_m, "", "# Drehbuch v1 · P\n\n## Pythagoras · 45 min\n### Seite: Der Satz · 10 min\nid: b4\nEin Satz.\n")
    ok(r["eingefuegt"] == ["b4"] and api.pruefe(r["kurs_md"])["ok"] and "## Pythagoras" in r["kurs_md"], "einsetzen: in leere Kursdatei mit Abschnitt")
    zwei = "# Drehbuch v1 · B\n\n## Zweite Einheit · 20 min\n### Seite: Neu · 5 min\nid: weg\nText.\n### Quiz: Q · 3 min\n1. F? · ✔a · b\n"
    md = M.anhaengen(kurs, zwei)
    pr = api.pruefe(md)
    ok([a["titel"] for a in pr["abschnitte"]][-1] == "Zweite Einheit" and len(pr["bausteine"]) == 12 and pr["ok"]
       and "id: weg-2" in md, "anhängen: neuer Abschnitt, doppelte id umbenannt")
    m4 = M.abgleich(M.migriere(n9["mappe"]), pr["bausteine"])
    ok(len(m4["bausteine"]) == 12, "anhängen: Kursdatei hat danach 12 Karten")
    ok(M.modus(n9["mappe"], neu_check)["modus"] == "baustein", "Modus: ein Baustein = nur Baustein")
    voll = M.modus(n9["mappe"], kurs)["modus"]
    ok(voll == "ersetzen", f"Modus: ganze Einheit = ersetzen ({voll})")
    ok(M.modus(n9["mappe"], "Hallo")["modus"] == "keine", "Modus: ohne Bausteine = keine")

    # 5 Korrekturbitte, Fragen und Lösungen, Fachcheck
    kaputt = kurs.replace("- Router → Flur", "- Router → Dachboden")
    pr = api.pruefe(kaputt)
    sae = P.korrektur(pr)
    ok(sae and sae[0]["baustein"] == "raeume" and "„Was kommt in welchen Raum?“ (id: raeume)" in sae[0]["satz"]
       and "nur diesen Baustein" in sae[0]["satz"], f"Korrekturbitte: {sae[0]['satz'][:110] if sae else '-'}")
    pr = api.pruefe(kurs)
    fr = P.fragen(pr)
    ok(len(fr) == 14 and all(f["loesung"] for f in fr), f"Fragen und Lösungen: {len(fr)} Fragen mit Lösung")
    ok(not any("→" in f["frage"] or any("→" in o for o in f["optionen"]) for f in fr if f["art"] != "luecken"), "Fragen und Lösungen: ohne Rückmeldungen")
    fc = P.fachcheck(pr, n9["steckbrief_text"])
    ok(fc["fragen"] == 14 and "✔" not in fc["text"] and "Nenne nur Nummer und Lösung" in fc["text"], "Fachcheck: Aufgaben ohne Lösungen")
    antwort = []
    for f in fr:
        if f["art"] == "auswahl":
            antwort.append(f"{f['nr']}: " + ", ".join("ABCDEFGH"[f["optionen"].index(l[0])] for l in f["loesung"]))
        else:
            antwort.append(f"{f['nr']}: " + "; ".join(l[0] for l in f["loesung"]))
    v0 = P.vergleich(pr, "\n".join(antwort))
    ok(not v0["abweichungen"] and not v0["fehlend"], f"Vergleich: richtige Antworten ohne Abweichung ({v0['abweichungen'][:1]})")
    falsch = re.sub(r"^2: A$", "2: B", "\n".join(antwort).replace("11: falsch", "11: richtig"), flags=re.M)
    v1 = P.vergleich(pr, "Hier meine Lösungen:\n" + falsch)
    ok(sorted(a["nr"] for a in v1["abweichungen"]) == [2, 11], f"Vergleich findet abweichende Lösungen {[a['nr'] for a in v1['abweichungen']]}")
    v2 = P.vergleich(pr, "\n".join(antwort[:-1]))
    ok(v2["fehlend"] == [14], "Vergleich: fehlende Antwort gemeldet")

    # 6 Ist-Minuten, Strukturbausteine (die Rechnung je Rolle prüft test_zeitbedarf.py)
    kz = M.kennzahlen(n9["mappe"], pr, steckbrief=n9["steckbrief_text"])
    ok(kz["bausteine"] == 8 and "banner" not in kz["zeit"] and "ueberblick" not in kz["zeit"], "Kennzahlen ohne Kursbanner und Überblick")
    ok(kz["minuten"]["ist"] == sum(z["gerechnet"] for z in kz["zeit"].values()), f"Ist-Minuten gerechnet: {kz['minuten']}")
    ok(M.struktur() >= {"Banner", "Überblick", "Unterabschnitt", "Badge", "Datei", "Verzeichnis"}, "Strukturbausteine im Katalog")

    # 7 AP13: minimale Vorlage, Teilschritte nur im Text, Typ frei, Zeit je Phase; dazu die Werte aus AP12a
    v = kat["vorlagen"][0]
    karten = vorlage_karten(v)
    mappe = neue_mappe("Satz des Pythagoras", karten, {"thema": "Satz des Pythagoras", "jahrgang": "9", "minuten": 45})
    t = P.einheit(mappe, sb, "ais")["teile"][0]
    erarbeitung = [k for k in karten if k["phase"] == "Erarbeitung"]
    ok(len(erarbeitung) == 1 and erarbeitung[0]["typ"] == "automatisch" and erarbeitung[0].get("schritt"),
       "Einführung: Erarbeitung ist eine Karte, Typ automatisch, Teilschritt im Text")
    ok(f"Teilschritt: {erarbeitung[0]['schritt']}" in t
       and t.index("neue Begriffe einführen") < t.index("an Beispielen benennen") < t.index("Regel oder den Satz"),
       "Teilschritte in einer Zeile in der Reihenfolge Begriffe → benennen → Regel")
    ok([k["typ"] for k in karten if k["phase"] in ("Einstieg", "Sicherung")] == ["Textfeld", "Seite"],
       "feste Typen nur, wo die Phase sie vorgibt (Einstieg Text, Hefteintrag Seite)")
    ok("2. id: b2 · Typ frei · Arbeitstitel „Lesetext mit Fragen“" in t and "Bei „Typ frei“ wählst du den Typ" in t
       and all(f"- {typ}: " in t for typ in kat["automatisch"]["typen"]) and "aus b3 wird b3-2" in t,
       "Typ frei: Zeile in der Liste, Typen zur Wahl mit je einer Zeile, zweiter Baustein mit -2")
    zeile1 = next(z for z in t.splitlines() if z.startswith("1. id: b1"))
    ok(re.search(r"Fall mit einer Denkaufgabe im Kasten für 8 Minuten", zeile1) is not None, f"Wortziel aus Soll und Rolle ({zeile1[:120]})")
    ok("Hefteintrag zum Abschreiben für 6 Minuten, etwa 60 Wörter" in t, "Wortziel Hefteintrag")
    m15 = neue_mappe("P", [M.geplant("x", "Seite", "Erarbeitung", "Erarbeitung", 15)], {"thema": "P", "jahrgang": "9"})
    ok("Lesetext für 15 Minuten, etwa 900 Wörter" in P.einheit(m15, sb, "ais")["teile"][0], "Erarbeitung 15 Minuten: etwa 900 Wörter (Anker 60 je Minute)")
    mq = neue_mappe("P", [M.geplant("q", "Quiz", "Übung", "Übung", 7), M.geplant("z", "Textfeld", "Was geprüft wird", "Überblick", 2)],
                    {"thema": "P", "jahrgang": "9"})
    tq = P.einheit(mq, sb, "ais")["teile"][0]
    ok("3 Aufgaben für 7 Minuten" in tq and "ein bis drei Sätze" in tq, "Wortziel für Quiz und Zielangabe")
    # Zeit je Phase aus (Standard der Oberfläche): keine Soll-Minuten, keine Wortziele, Richtwerte für das Modell
    frei = dict(mappe, zeit_selbst=False)
    tf = P.einheit(frei, sb, "ais")["teile"][0]
    ok("Verteile die 45 Minuten selbst" in tf and "etwa 60 Wörter je Minute" in tf and "Hefteintrag zum Abschreiben etwa 10" in tf
       and "für 8 Minuten" not in tf and "für 6 Minuten" not in tf, "Zeit je Phase aus: Modell verteilt nach Richtwerten, keine Soll-Minuten")
    sb6 = steckbrief(jahrgang="6")
    tf6 = P.einheit(dict(frei, einheit={"thema": "Brüche", "jahrgang": "6", "minuten": 45}), sb6, "ais")["teile"][0]
    ok("etwa 45 Wörter je Minute" in tf6, "Richtwerte nach Jahrgangsstufe (6: Faktor 0,75)")
    ok("Verteile" not in t, "Zeit je Phase an (oder Kursdatei vor b1): Soll-Minuten wie bisher")
    ok("Keine Aufgabe verwendet etwas, das erst später in der Einheit eingeführt wird" in t, "Vorgriff-Regel im Text")
    ok("Bild Pflicht" in t and "zwei durchgerechnete Beispiele" in t, "Mathematik: Bild Pflicht bei Einstieg und Erarbeitung")
    sb_deutsch = M.angaben_schreiben("", {"thema": "Die Erörterung", "fach": "Deutsch", "jahrgang": "9", "minuten": 45})
    m_d = neue_mappe("Die Erörterung", vorlage_karten(v), {"thema": "Die Erörterung", "jahrgang": "9", "minuten": 45})
    ok("Bild Pflicht" not in P.einheit(m_d, sb_deutsch, "ais")["teile"][0], "Deutsch, Erörterung: keine Bild-Pflicht")
    sb_bio = M.angaben_schreiben("", {"thema": "Brüche im Alltag", "fach": "Alltagskompetenz", "jahrgang": "6"})
    ok(P.braucht_skizze(M.angaben_lesen(sb_bio), "Brüche im Alltag"), "Stichwort im Thema (Brüche) verlangt eine Skizze")
    ok(all(g < 10 * 1024 for vl in kat["vorlagen"] for zs in (True, False) for g in P.einheit(
        neue_mappe("P", vorlage_karten(vl), {"thema": "Satz des Pythagoras", "jahrgang": "9", "minuten": 45}) | {"zeit_selbst": zs},
        sb, "ais")["groessen"]), "alle Vorlagen unter 10 KB, mit und ohne Zeit je Phase")

    # Antwort auf Typ frei: Typ kommt vom Chat, Teilschritt bleibt; zweiter Baustein b2-2 landet hinter b2
    antwort = ("# Drehbuch v1 · P\n\n## Pythagoras · 45 min\n### Textfeld: Die Leiter · 8 min\nid: b1\nEin Fall.\n"
               "### Seite: Katheten und Hypotenuse · 15 min\nid: b2\nText.\n### Quiz: Fragen zum Text · 4 min\nid: b2-2\n"
               "1. Was ist die Hypotenuse? · ✔die längste Seite · eine Kathete\n")
    r = M.einsetzen(mappe, "", antwort)
    pr = api.pruefe(r["kurs_md"])
    ids = [b["id"] for b in pr["bausteine"]]
    ok(r["eingefuegt"] == ["b1", "b2", "b2-2"] and ids == ["b1", "b2", "b2-2"] and not r["fehler"], f"einsetzen: b2-2 hinter b2 ({ids}, {r['fehler'][:1]})")
    ab = M.abgleich(json_kopie(mappe), pr["bausteine"])
    e2 = next(e for e in ab["bausteine"] if e["id"] == "b2")
    ok(e2["typ"] == "Seite" and e2.get("schritt") and not e2["geplant"] and any(e["id"] == "b2-2" for e in ab["bausteine"])
       and any(e["id"] == "b6" and e.get("aus") and e["geplant"] for e in ab["bausteine"]),
       "abgleich: Typ vom Chat, Teilschritt bleibt, b2-2 neu, ausgeschaltete Karte bleibt aus")
    ohne = re.sub(r"^id: b\d.*\n", "", antwort, flags=re.M)
    ab2 = M.abgleich(json_kopie(mappe), api.pruefe(M.antwort(ohne)["kursdatei"])["bausteine"])
    ok([e["phase"] for e in ab2["bausteine"]][:2] == ["Einstieg", "Erarbeitung"], "abgleich ohne id: automatisch-Karte nimmt den Baustein nach Position")
    kz = M.kennzahlen(dict(ab, zeit_selbst=False), pr)
    kz_s = M.kennzahlen(ab, pr)
    ok(kz["zeit"]["b2"]["soll"] is None and kz_s["zeit"]["b2"]["soll"] == 16 and kz["minuten"]["soll"] == 45 and kz["inhalt"],
       f"Kennzahlen: ohne Zeit je Phase zählt die Angabe des Chats, nicht das Soll ({kz['zeit']['b2']})")
    # Herkunft: umbenannter Titel bleibt von der Lehrkraft, bis der Chat einen neuen Titel liefert
    e2 = next(e for e in ab["bausteine"] if e["id"] == "b2")
    e2["titel"], e2["herkunft"] = "Die Seiten im Dreieck", {"titel": "lehrkraft"}
    md = M.umbenennen(r["kurs_md"], "b2", "Die Seiten im Dreieck")
    ab3 = M.abgleich(json_kopie(ab), api.pruefe(md)["bausteine"])
    ok(next(e for e in ab3["bausteine"] if e["id"] == "b2").get("herkunft") == {"titel": "lehrkraft"}, "Herkunft: umbenannt = Lehrkraft")
    mi = M.migriere(json_kopie(ab3))
    ok(next(e for e in mi["bausteine"] if e["id"] == "b2").get("herkunft") and next(e for e in mi["bausteine"] if e["id"] == "b6").get("aus"),
       "migriere behält Herkunft und aus")
    ab4 = M.abgleich(json_kopie(ab3), api.pruefe(r["kurs_md"])["bausteine"])
    ok("herkunft" not in next(e for e in ab4["bausteine"] if e["id"] == "b2"), "Herkunft: neuer Titel vom Chat = Chat")

    if fehler:
        print(f"\n{len(fehler)} Fehler")
        return 1
    print("\nalles gut")
    return 0


if __name__ == "__main__":
    sys.exit(main())
