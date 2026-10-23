"""Zwei .mbz inhaltlich vergleichen – ohne Zeitstempel, Zufalls-UUIDs und Dateinamen der Sicherung.

usage: python3 scripts/tests/mbz_diff.py a.mbz b.mbz [--ignore-h5p-titles]
Exit 0 = inhaltsgleich, 1 = Unterschiede (werden als Diff ausgegeben).
"""
import difflib
import re
import sys
import tarfile

TIME_TAGS = "timecreated|timemodified|added|backup_date|startdate|original_course_startdate"
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")


def load(path):
    out = {}
    with tarfile.open(path, "r:gz") as tar:
        for m in tar.getmembers():
            if m.isfile():
                out[m.name] = tar.extractfile(m).read()
    return out


def norm(name, data, ignore_titles):
    if name.startswith("files/"):
        return data
    s = data.decode("utf-8")
    if name == ".ARCHIVE_INDEX":
        s = re.sub(r"\t\d{9,}\n", "\tT\n", s + "\n")
        s = re.sub(r"moodle_backup\.xml\tf\t\d+", "moodle_backup.xml\tf\tS", s)   # enthält den Dateinamen
    s = re.sub(rf"<({TIME_TAGS})>\d+</\1>", r"<\1>T</\1>", s)
    s = re.sub(r"\.mbz", "X.mbz", s)
    s = re.sub(r'backup_id="[0-9a-f]{32}"', 'backup_id="X"', s)
    s = re.sub(r"<(name|value)>[^<]*X\.mbz</\1>", r"<\1>X.mbz</\1>", s)
    s = UUID.sub("UUID", s)
    if ignore_titles and name.endswith("hvp.xml"):
        s = re.sub(r'&quot;(title|extraTitle)&quot;:&quot;[^&]*&quot;', r'&quot;\1&quot;:&quot;T&quot;', s)
    return s


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ignore_titles = "--ignore-h5p-titles" in sys.argv
    a, b = load(args[0]), load(args[1])
    diff = 0
    for name in sorted(set(a) | set(b)):
        if name not in a or name not in b:
            print(f"NUR IN {'B' if name not in a else 'A'}: {name}")
            diff += 1
            continue
        na, nb = norm(name, a[name], ignore_titles), norm(name, b[name], ignore_titles)
        if na != nb:
            diff += 1
            print(f"UNTERSCHIED: {name}")
            if isinstance(na, str):
                for line in list(difflib.unified_diff(na.splitlines(), nb.splitlines(), "A", "B", lineterm="", n=0))[:40]:
                    print("   ", line[:400])
    print("gleich" if not diff else f"{diff} Datei(en) verschieden")
    sys.exit(1 if diff else 0)


if __name__ == "__main__":
    main()
