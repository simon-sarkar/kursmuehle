"""Test für scripts/check.py: Beispiele melden OK, absichtlich eingebaute Fehler werden gefunden.

usage: python3 scripts/tests/test_check.py   (Exit 0 = alles gut)

Baut netzwerk9 (Vollkurs, Prototyp) und alltagskompetenz (Vollkurs, Delta) in ein Temp-Verzeichnis, prüft sie,
und erzeugt aus dem netzwerk9-Build je eine kaputte Kopie: fehlende Datei, falscher Hash, kaputtes json_content,
falsche Bibliotheksversion, fehlender Aktivitätsordner, Bild aus files.xml entfernt, fehlender fileref,
ungültiges Verfügbarkeits-JSON, doppelte Abschnittsnummer, nicht wohlgeformtes XML.
"""
import io
import os
import re
import subprocess
import sys
import tarfile
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from check import check_mbz  # noqa: E402

BUILD = os.path.join(ROOT, "scripts", "build.py")


def build(content, out, *flags):
    r = subprocess.run([sys.executable, BUILD, "--content", os.path.join(ROOT, "examples", content), "--out", out,
                        "--no-check", *flags], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"Build {content} {flags} fehlgeschlagen:\n{r.stdout}\n{r.stderr}")
    return out


def load(path):
    with tarfile.open(path, "r:gz") as tar:
        return {m.name: tar.extractfile(m).read() for m in tar.getmembers() if m.isfile()}


def save(entries, path):
    """Archiv neu schreiben, .ARCHIVE_INDEX passend zum Inhalt (damit nur der eingebaute Fehler sichtbar wird)."""
    paths = sorted(p for p in entries if p != ".ARCHIVE_INDEX")
    dirs = set()
    for p in paths:
        parts = p.split("/")[:-1]
        for i in range(1, len(parts) + 1):
            dirs.add("/".join(parts[:i]) + "/")
    index = [f"Moodle archive file index. Count: {len(paths) + len(dirs)}"]
    index += [f"{d}\td\t0\t?" for d in sorted(dirs)]
    index += [f"{p}\tf\t{len(entries[p])}\t1" for p in paths]
    entries[".ARCHIVE_INDEX"] = ("\n".join(index) + "\n").encode()
    with tarfile.open(path, "w:gz") as tar:
        for p in [".ARCHIVE_INDEX"] + paths:
            ti = tarfile.TarInfo(p)
            ti.size = len(entries[p])
            tar.addfile(ti, io.BytesIO(entries[p]))
    return path


def first(entries, pattern):
    return next(p for p in sorted(entries) if re.match(pattern, p))


def sub(entries, path, old, new, count=1):
    s = entries[path].decode("utf-8")
    assert old in s, f"{path}: „{old}“ nicht gefunden"
    entries[path] = s.replace(old, new, count).encode("utf-8")


# ---- Fehlerfälle: (Name, Mutation, erwarteter Teil der Fehlermeldung)
def f_fehlende_datei(e):
    del e[first(e, r"files/")]


def f_falscher_hash(e):
    p = first(e, r"files/")
    e[p] = e[p] + b"x"


def f_kaputtes_json(e):
    p = first(e, r"activities/hvp_\d+/hvp\.xml")
    s = e[p].decode()
    e[p] = re.sub(r"<json_content>.*</json_content>", "<json_content>{&quot;a&quot;:</json_content>", s, flags=re.S).encode()


def f_bibliothek(e):
    sub(e, first(e, r"activities/hvp_\d+/hvp\.xml"), "<minor_version>", "<minor_version>99")


def f_ordner_fehlt(e):
    d = first(e, r"activities/hvp_\d+/module\.xml").rsplit("/", 1)[0]
    for p in [p for p in e if p.startswith(d + "/")]:
        del e[p]


def f_bild_aus_files_xml(e):
    s = e["files.xml"].decode()
    m = re.search(r'  <file id="\d+">\n(?:(?!</file>).)*?<component>mod_hvp</component>.*?</file>\n', s, flags=re.S)
    assert m, "kein mod_hvp-Bild in files.xml"
    e["files.xml"] = (s[:m.start()] + s[m.end():]).encode()


def f_fileref_fehlt(e):
    for p in sorted(e):
        if re.match(r"activities/hvp_\d+/inforef\.xml", p) and b"<fileref>" in e[p]:
            s = e[p].decode()
            e[p] = re.sub(r"  <fileref>.*?</fileref>\n", "", s, flags=re.S).encode()
            return
    raise AssertionError("keine hvp-inforef mit fileref")


def f_verfuegbarkeit(e):
    p = first(e, r"activities/\w+_\d+/module\.xml")
    sub(e, p, "<availability>$@NULL@$</availability>", '<availability>{"op":"&amp;","c":[</availability>')


def f_doppelte_nummer(e):
    p = sorted(p for p in e if re.match(r"sections/section_\d+/section\.xml", p))[-1]
    sub(e, p, "<number>1</number>", "<number>0</number>")


def f_xml_kaputt(e):
    sub(e, "course/course.xml", "</course>", "</kurs>")


FAELLE = [
    ("fehlende Datei", f_fehlende_datei, "fehlt im Archiv unter files/"),
    ("falscher Hash", f_falscher_hash, "Hash stimmt nicht"),
    ("kaputtes json_content", f_kaputtes_json, "json_content ist kein gültiges JSON"),
    ("falsche Bibliotheksversion", f_bibliothek, "ist auf der Plattform nicht installiert"),
    ("Aktivitätsordner fehlt", f_ordner_fehlt, "fehlt: module.xml"),
    ("Bild aus files.xml entfernt", f_bild_aus_files_xml, "in json_content, aber nicht in files.xml"),
    ("fileref fehlt", f_fileref_fehlt, "wird von keiner inforef.xml referenziert"),
    ("Verfügbarkeits-JSON ungültig", f_verfuegbarkeit, "Verfügbarkeits-JSON ungültig"),
    ("doppelte Abschnittsnummer", f_doppelte_nummer, "Abschnittsnummern nicht fortlaufend"),
    ("XML nicht wohlgeformt", f_xml_kaputt, "XML nicht wohlgeformt"),
]


def main():
    bad = 0
    with tempfile.TemporaryDirectory() as d:
        gut = [build("netzwerk9", os.path.join(d, "n9.mbz")),
               build("netzwerk9", os.path.join(d, "n9_proto.mbz"), "--proto"),
               build("alltagskompetenz", os.path.join(d, "ak.mbz")),
               build("alltagskompetenz", os.path.join(d, "ak_delta.mbz"), "--delta", "le2,le3")]
        for path in gut:
            errors, info = check_mbz(path)
            if errors:
                bad += 1
                print(f"FALSCH {os.path.basename(path)}: {len(errors)} Fehler, erwartet OK")
                for wo, was in errors[:10]:
                    print(f"       {wo}: {was}")
            else:
                print(f"ok     {os.path.basename(path)}: {info}")
        base = load(gut[0])
        for name, mut, want in FAELLE:
            e = dict(base)
            mut(e)
            path = save(e, os.path.join(d, "kaputt.mbz"))
            errors, _ = check_mbz(path)
            msgs = [f"{wo}: {was}" for wo, was in errors]
            if not any(want in m for m in msgs):
                bad += 1
                print(f"FEHLT  {name}: erwartet „{want}“, gemeldet: {msgs[:5] or 'nichts'}")
            else:
                print(f"ok     {name}: {len(errors)} Fehler gemeldet, darunter „{want}“")
        # Datei, die kein Archiv ist
        kein = os.path.join(d, "kein.mbz")
        with open(kein, "wb") as f:
            f.write(b"PK\x03\x04 kein tar")
        errors, _ = check_mbz(kein)
        if not errors or "Archiv nicht lesbar" not in errors[0][1]:
            bad += 1
            print(f"FEHLT  kein Archiv: {errors}")
        else:
            print("ok     kein Archiv: gemeldet")
    print("alles gut" if not bad else f"{bad} Problem(e)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
