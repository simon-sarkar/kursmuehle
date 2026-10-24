"""Wiederkehrender Prompttest (AP13.3): Aufträge über Fächer und Jahrgangsstufen, Text für den Chat wie in der Mühle
(Vorlage Einführung, Typ automatisch, Zeit durch das Modell, Chat ByLKI), Antwort eines Modells der Sonnet-Klasse,
ausgewertet mit derselben Prüfung wie die Seite (`api.pruefe` mit Kursmappe, `kopiert`). Ergebnis: Korrekturbitten je
Regel (Kennungen aus `gen/api.py` REGELN) und je Auftrag ohne Verfahren, ob Rechnung, Maßstab oder Formel vorkommen.

usage:
  python3 scripts/tests/prompttest.py --texte DIR        Texte für den Chat schreiben (text-<name>-<teil>.txt)
  python3 scripts/tests/prompttest.py --antworten DIR    Antworten aus DIR auswerten (antwort-<name>.txt, Teile angehängt;
                                                         anderer Name mit --muster „antwort-ap13.3-{name}.txt“)
  python3 scripts/tests/prompttest.py --api              über die API (ANTHROPIC_API_KEY; fehlt er, Hinweis und Ende ohne Fehler)
  --nur ohr,eichhoernchen   nur diese Aufträge;   --protokoll DATEI   Tabelle an DATEI anhängen
Der Schlüssel steht nie im Repo und nie im Browser; die Antworten landen nur im Arbeitsordner des Laufs.
"""
import argparse
import collections
import datetime
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from gen import api  # noqa: E402
from gen import mappe as M  # noqa: E402
from gen import prompt as P  # noqa: E402

MODELL = "claude-sonnet-5-5"     # Sonnet-Klasse: der Skill muss mit einem günstigen Modell laufen (AGENTS.md)

# name, Thema, Fach, Jahrgangsstufe, Schulart, Verfahren (Rechnen gehört zum Thema), Aufträge je Phase
AUFTRAEGE = [
    ("pythagoras", "Satz des Pythagoras", "Mathematik", "9", "Mittelschule", True, {}),
    ("ohr", "Das Ohr", "Biologie", "7", "Realschule", False, {"Erarbeitung": "2-3 Bilder, Weg des Schalls"}),
    ("eichhoernchen", "Das Eichhörnchen", "HSU", "2", "Grundschule", False, {"Erarbeitung": "Körper, Nahrung, Kobel"}),
    ("brueche", "Brüche erweitern und kürzen", "Mathematik", "6", "Gymnasium", True, {}),
    ("photosynthese", "Photosynthese", "Biologie", "8", "Gymnasium", False, {}),
    ("roemer", "Leben im römischen Lager", "Geschichte", "6", "Realschule", False, {}),
    ("kommasetzung", "Komma bei Aufzählungen", "Deutsch", "5", "Mittelschule", False, {}),
    ("wasserkreislauf", "Der Wasserkreislauf", "HSU", "4", "Grundschule", False, {}),
    ("stromkreis", "Der einfache Stromkreis", "Physik", "8", "Mittelschule", True, {}),
    ("kaufvertrag", "Der Kaufvertrag", "Wirtschaft und Recht", "10", "Wirtschaftsschule", False, {}),
]
# im Kursinhalt (ohne Kopf): Rechnung, Maßstab, Formel
_RE_RECHNUNG = re.compile(r"\d\s*[+\-−·×*/=]\s*\d|\b[Bb]erechne|\b[Rr]echne|\b[Rr]unde (?:auf|ab)\b")
_RE_MASSSTAB = re.compile(r"\b[Mm]aßstab\b|\b\d+\s*:\s*\d+\b(?!\s*Uhr)")
_RE_FORMEL = re.compile(r"[²³√]|\b[a-z]\s*=\s*[a-z0-9]")


def mappe_fuer(auftrag):
    """Kursmappe wie die Mühle nach „Weiter“: Vorlage Einführung, Karten mit Typ automatisch, Zeit durch das Modell."""
    name, thema, fach, jg, schulart, _, auftraege = auftrag
    v = M.katalog()["vorlagen"][0]
    karten, n = [], 0
    for p in v["phasen"]:
        for b in p["bausteine"]:
            kopf, _, schritt = b.partition(" | ")
            typ, _, titel = kopf.partition(":")
            n += 1
            k = M.geplant(f"b{n}", typ.strip(), titel.strip() or p["phase"], p["phase"],
                          max(1, round(p["anteil"] / 100 * 45 / len(p["bausteine"]))), auftraege.get(p["phase"], ""),
                          schritt.strip())
            if p.get("optional"):
                k["aus"] = True
            karten.append(k)
    m = M.neu(thema, einheit={"thema": thema, "jahrgang": jg, "minuten": 45, "vorlage": v["name"]})
    m["bausteine"] = karten             # wie mappe.json der Mühle: geplante Karten, die optionale ausgeschaltet
    m.update(chat="bylki", zeit_selbst=False, zweig="steuer", kopiert=True)
    sb = M.angaben_schreiben("", {"thema": thema, "fach": fach, "jahrgang": jg, "minuten": 45, "schulart": schulart})
    return m, sb


def texte(auftrag):
    m, sb = mappe_fuer(auftrag)
    return P.einheit(m, sb)["teile"]


def auswerten(auftrag, antwort):
    """-> {regeln: Counter, fehler, bausteine, inhalt: [Treffer], minuten}"""
    m, sb = mappe_fuer(auftrag)
    pr = api.pruefe(antwort, {}, sb, m)
    regeln = collections.Counter(d["regel"] for d in pr["diagnosen"] if d["stufe"] == "fehler")
    kurs = pr["kursdatei"]
    inhalt = kurs[kurs.find("\n## "):] if "\n## " in kurs else kurs
    inhalt = "\n".join(z for z in inhalt.splitlines()             # ohne Überschriften und Angaben (id: b2-2, · 6 min)
                        if not z.startswith("#") and not re.match(r"^[a-zäöüß ]+:\s", z))
    treffer = []
    if not auftrag[5]:
        for wort, muster in (("Rechnung", _RE_RECHNUNG), ("Maßstab", _RE_MASSSTAB), ("Formel", _RE_FORMEL)):
            if muster.search(inhalt):
                treffer.append(wort)
    einstieg = next((b.get("minuten") for b in pr["bausteine"] if b["id"] == "b1"), None)
    return {"regeln": regeln, "fehler": sum(regeln.values()), "bausteine": len(pr["bausteine"]), "inhalt": treffer,
            "einstieg": einstieg}


def antwort_api(teile):
    """Alle Teile nacheinander in einem Gespräch; die Antworten aneinander (wie die Lehrkraft sie einfügt)."""
    import anthropic
    client = anthropic.Anthropic()
    nachrichten, antworten = [], []
    for t in teile:
        nachrichten.append({"role": "user", "content": t})
        with client.messages.stream(model=MODELL, max_tokens=64000, messages=nachrichten) as s:
            msg = s.get_final_message()
        if msg.stop_reason == "refusal":
            raise RuntimeError(f"abgelehnt ({getattr(msg.stop_details, 'category', None)})")
        text = "".join(b.text for b in msg.content if b.type == "text")
        nachrichten.append({"role": "assistant", "content": msg.content})
        antworten.append(text)
    return "\n\n".join(antworten)


def tabelle(ergebnisse, quelle):
    """Markdown-Abschnitt für protokolle/prompttest-verlauf.md."""
    alle = collections.Counter()
    for _, e in ergebnisse:
        if isinstance(e, dict):
            alle.update(e["regeln"])
    z = [f"## {datetime.date.today().isoformat()} · {quelle}", "",
         "| Auftrag | Bausteine | Korrekturen | Regeln | Einstieg (min) | Rechnung/Maßstab/Formel ohne Verfahren |",
         "|---|---|---|---|---|---|"]
    for name, e in ergebnisse:
        if not isinstance(e, dict):
            z.append(f"| {name} | – | – | {e} | – | – |")
            continue
        regeln = ", ".join(f"{r} {n}" for r, n in sorted(e["regeln"].items())) or "–"
        z.append(f"| {name} | {e['bausteine']} | {e['fehler']} | {regeln} | {e['einstieg'] or '–'} | "
                 f"{', '.join(e['inhalt']) or 'nein'} |")
    z += ["", "Korrekturen je Regel: " + (", ".join(f"{r} {n}" for r, n in alle.most_common()) or "keine"), ""]
    return "\n".join(z) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--texte")
    ap.add_argument("--antworten")
    ap.add_argument("--api", action="store_true")
    ap.add_argument("--nur")
    ap.add_argument("--protokoll")
    ap.add_argument("--muster", default="antwort-{name}.txt", help="Dateiname der Antwort in --antworten")
    a = ap.parse_args()
    liste = [x for x in AUFTRAEGE if not a.nur or x[0] in a.nur.split(",")]
    if a.texte:
        os.makedirs(a.texte, exist_ok=True)
        for x in liste:
            for i, t in enumerate(texte(x), 1):
                with open(os.path.join(a.texte, f"text-{x[0]}-{i}.txt"), "w", encoding="utf-8") as f:
                    f.write(t)
        print(f"{len(liste)} Aufträge, Texte in {a.texte}")
        return 0
    ergebnisse, quelle = [], ""
    if a.api:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            print("Hinweis: ANTHROPIC_API_KEY ist nicht gesetzt (Secret im Repo anlegen); der Prompttest läuft nicht.")
            return 0
        quelle = f"API, {MODELL}"
        for x in liste:
            try:
                ergebnisse.append((x[0], auswerten(x, antwort_api(texte(x)))))
            except Exception as e:      # ein Auftrag scheitert, die übrigen laufen weiter
                ergebnisse.append((x[0], f"Fehler: {type(e).__name__}"))
    elif a.antworten:
        quelle = f"Antworten aus {os.path.relpath(a.antworten, ROOT)}"
        for x in liste:
            pfad = os.path.join(a.antworten, a.muster.format(name=x[0]))
            if os.path.exists(pfad):
                with open(pfad, encoding="utf-8") as f:
                    ergebnisse.append((x[0], auswerten(x, f.read())))
    else:
        ap.print_help()
        return 2
    text = tabelle(ergebnisse, quelle)
    print(text)
    if a.protokoll:
        with open(a.protokoll, "a", encoding="utf-8") as f:
            f.write("\n" + text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
