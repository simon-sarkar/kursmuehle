"""Sicherung prüfen, bevor sie importiert wird.

usage: python3 scripts/check.py <datei.mbz> [weitere.mbz …]

Prüft eine .mbz gegen references/spec.md: Archiv (tar.gz, .ARCHIVE_INDEX), Pflichtdateien, XML wohlgeformt,
moodle_backup.xml gegen die Ordner, Abschnitts-/Modulnummern und IDs, files.xml (sha1, Größe, jede Datei
referenziert), inforef.xml (Dateien, Bewertungsposten, Fragenkategorien), H5P (Bibliotheksversionen aus gen/libs.py,
json_content, Bilder in images/), Bilder in Textfeldern/Seiten/Buchkapiteln, Datei/Verzeichnis (Dateibereich content),
Test (Fragenverweise gegen questions.xml, Kategorie im Modulkontext, sumgrades, Bewertungsposten, Fragetypen),
Aufgabe (Bewertungsposten), Abstimmung (Optionen), Glossar (Einträge, Nutzerdaten-Settings), Badges, Verfügbarkeits-JSON,
Kursformat (course.xml, Formatoptionen, Kachelbilder je Abschnitt, Einzelaktivität), users/userinfo-Settings.
Ausgabe: `OK <datei> …` oder Zeilen `FEHLER <wo> <was>`; Exit-Code 1 bei Fehlern. Zeilen `WARNUNG <wo> <was>` (Exit 0):
die Sicherung ist gültig, aber beim Import geht voraussichtlich etwas verloren (z. B. Glossareinträge ohne userinfo=1).
`build.py` ruft die Prüfung nach jedem Bau selbst auf. Neue Modultypen brauchen hier einen Eintrag (Dateibereiche, inhalte()).
"""
import hashlib
import json
import os
import re
import sys
import tarfile
import xml.etree.ElementTree as ET
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen.libs import LIBS  # noqa: E402
from gen.mbz import FORMAT_OPTIONEN, MODULE_VERSIONS, QTYPES  # noqa: E402

NULL = "$@NULL@$"
PFLICHT_TOP = ["moodle_backup.xml", "files.xml", "moodle_backup.log", "roles.xml", "scales.xml", "outcomes.xml",
               "questions.xml", "groups.xml", "grade_history.xml", "completion.xml", "gradebook.xml", "badges.xml"]
PFLICHT_COURSE = ["course", "inforef", "roles", "filters", "calendar", "contentbank", "completiondefaults", "enrolments"]
PFLICHT_ACT = ["module", "grades", "inforef", "roles", "filters", "calendar", "grade_history"]
LIBSTR = re.compile(r"^H5P\.\w+ \d+\.\d+$")
PLUGINFILE = re.compile(r"@@PLUGINFILE@@/([^\"'\s<>)]+)")
AVAIL_OPS = {"&", "|", "!&", "!|"}


def _text(el, tag, default=None):
    c = el.find(tag)
    return default if c is None else (c.text or "")


class Pruefung:
    def __init__(self, path):
        self.path = path
        self.errors = []          # (wo, was)
        self.warnings = []        # (wo, was): gültig, aber beim Import geht voraussichtlich etwas verloren
        self.settings = {}        # moodle_backup.xml Settings name -> value
        self.format = None        # Kursformat aus course.xml
        self.entries = {}         # Archivpfad -> bytes
        self.xml = {}             # Archivpfad -> ElementTree-Root
        self.acts = []            # dicts: cmid, sectionid, modname, dir, instanceid, contextid, module, mod
        self.secs = {}            # sectionid -> dict: number, sequence, dir, root, component, itemid, parentcmid
        self.files = []           # dicts aus files.xml
        self.course_ctx = None
        self.grade_items = {}     # grade_item id -> activity dir (oder "gradebook.xml")
        self.qcats_used = set()   # Fragenkategorien, die ein Test per inforef referenziert

    def err(self, wo, was):
        self.errors.append((wo, was))

    def warn(self, wo, was):
        self.warnings.append((wo, was))

    # ---------------------------------------------------------------- Archiv
    def lade(self):
        try:
            with tarfile.open(self.path, "r:gz") as tar:
                members = tar.getmembers()
                for i, m in enumerate(members):
                    if m.isdir():
                        continue
                    if not m.isfile():
                        self.err(m.name, "kein regulärer Eintrag")
                        continue
                    self.entries[m.name] = tar.extractfile(m).read()
                names = [m.name for m in members if not m.isdir()]
        except (tarfile.TarError, OSError, EOFError) as e:
            self.err(os.path.basename(self.path), f"Archiv nicht lesbar (erwartet tar.gz): {e}")
            return False
        if not names or names[0] != ".ARCHIVE_INDEX":
            self.err(".ARCHIVE_INDEX", "fehlt oder ist nicht der erste Eintrag des Archivs")
        if "moodle_backup.xml" not in self.entries:
            self.err("moodle_backup.xml", "fehlt im Archiv")
            return False
        return True

    def index(self):
        data = self.entries.get(".ARCHIVE_INDEX")
        if data is None:
            return
        lines = data.decode("utf-8", "replace").splitlines()
        m = re.match(r"Moodle archive file index\. Count: (\d+)$", lines[0] if lines else "")
        if not m:
            self.err(".ARCHIVE_INDEX", "Kopfzeile „Moodle archive file index. Count: N“ fehlt")
            return
        if int(m.group(1)) != len(lines) - 1:
            self.err(".ARCHIVE_INDEX", f"Count {m.group(1)} passt nicht zu {len(lines) - 1} Zeilen")
        listed = set()
        for ln in lines[1:]:
            parts = ln.split("\t")
            if len(parts) != 4:
                self.err(".ARCHIVE_INDEX", f"Zeile nicht im Format pfad<TAB>d|f<TAB>bytes<TAB>mtime: „{ln[:80]}“")
                continue
            p, kind, size, _ = parts
            if kind == "d":
                continue
            listed.add(p)
            if p not in self.entries:
                self.err(".ARCHIVE_INDEX", f"listet „{p}“, die Datei fehlt im Archiv")
            elif size != str(len(self.entries[p])):
                self.err(".ARCHIVE_INDEX", f"„{p}“: Größe {size} im Index, {len(self.entries[p])} im Archiv")
        for p in self.entries:
            if p != ".ARCHIVE_INDEX" and p not in listed:
                self.err(".ARCHIVE_INDEX", f"„{p}“ liegt im Archiv, fehlt aber im Index")

    def xml_wohlgeformt(self):
        for p, data in self.entries.items():
            if not p.endswith(".xml"):
                continue
            try:
                self.xml[p] = ET.fromstring(data)
            except ET.ParseError as e:
                self.err(p, f"XML nicht wohlgeformt: {e}")

    def pflichtdateien(self):
        for p in PFLICHT_TOP:
            if p not in self.entries:
                self.err(p, "Pflichtdatei fehlt")
        for n in PFLICHT_COURSE:
            if f"course/{n}.xml" not in self.entries:
                self.err(f"course/{n}.xml", "Pflichtdatei fehlt")

    # ---------------------------------------------------------------- Struktur
    def backup_xml(self):
        root = self.xml.get("moodle_backup.xml")
        if root is None:
            return
        info = root.find("information")
        if info is None:
            self.err("moodle_backup.xml", "<information> fehlt")
            return
        course = self.xml.get("course/course.xml")
        if course is not None:
            self.course_ctx = course.get("contextid")
            cid = course.get("id")
            if _text(info, "original_course_id") != cid:
                self.err("moodle_backup.xml", f"original_course_id {_text(info, 'original_course_id')} ≠ course.xml id {cid}")
            if _text(info, "original_course_contextid") != self.course_ctx:
                self.err("moodle_backup.xml", "original_course_contextid ≠ course.xml contextid")
        settings = {_text(s, "name"): _text(s, "value") for s in info.findall("settings/setting")}
        self.settings = settings
        if settings.get("filename") != _text(info, "name"):
            self.err("moodle_backup.xml", "Setting „filename“ ≠ <name>")
        if course is not None:
            self.format = _text(course, "format", "")
            if self.format not in FORMAT_OPTIONEN:
                self.err("course/course.xml", f"Kursformat „{self.format}“ nicht umgesetzt (erlaubt: {', '.join(FORMAT_OPTIONEN)})")
            if _text(info, "original_course_format") != self.format:
                self.err("moodle_backup.xml", f"original_course_format {_text(info, 'original_course_format')} ≠ course.xml format {self.format}")
            for o in course.findall("courseformatoptions/courseformatoption"):
                if _text(o, "format") != self.format or _text(o, "sectionid") != "0":
                    self.err("course/course.xml", f"courseformatoption „{_text(o, 'name')}“: format {_text(o, 'format')}, "
                                                  f"sectionid {_text(o, 'sectionid')}; erwartet {self.format}, 0")
        if settings.get("users") == "1":
            if "users.xml" not in self.entries:
                self.err("users.xml", "fehlt, obwohl Setting users=1 (die Restore-Vorprüfung lädt die Datei)")
            elif self.xml.get("users.xml") is not None and self.xml["users.xml"].tag != "users":
                self.err("users.xml", "Wurzelelement <users> erwartet")

        seen_dirs = set()
        for a in info.findall("contents/activities/activity"):
            cmid, sid, mod, d = (_text(a, "moduleid"), _text(a, "sectionid"), _text(a, "modulename"),
                                 _text(a, "directory"))
            insub = _text(a, "insubsection", "")
            wo = f"moodle_backup.xml Aktivität {mod}_{cmid}"
            if d != f"activities/{mod}_{cmid}":
                self.err(wo, f"directory „{d}“ erwartet „activities/{mod}_{cmid}“")
            seen_dirs.add(d)
            missing = [f for f in PFLICHT_ACT + [mod] if f"{d}/{f}.xml" not in self.entries]
            if missing:
                self.err(d, f"fehlt: {', '.join(f + '.xml' for f in missing)}")
            for suffix in ("included", "userinfo"):
                if f"{mod}_{cmid}_{suffix}" not in settings:
                    self.err("moodle_backup.xml", f"Setting {mod}_{cmid}_{suffix} fehlt")
            module = self.xml.get(f"{d}/module.xml")
            modx = self.xml.get(f"{d}/{mod}.xml")
            act = {"cmid": cmid, "sectionid": sid, "modname": mod, "dir": d, "module": module, "mod": modx,
                   "instanceid": None, "contextid": None, "insub": insub == "1", "title": _text(a, "title", ""),
                   "userinfo": settings.get(f"{mod}_{cmid}_userinfo", "0")}
            if module is not None:
                if module.get("id") != cmid:
                    self.err(f"{d}/module.xml", f"id {module.get('id')} ≠ moduleid {cmid}")
                if _text(module, "modulename") != mod:
                    self.err(f"{d}/module.xml", f"modulename „{_text(module, 'modulename')}“ ≠ {mod}")
                if _text(module, "sectionid") != sid:
                    self.err(f"{d}/module.xml", f"sectionid {_text(module, 'sectionid')} ≠ {sid} in moodle_backup.xml")
                ver = module.get("version")
                if mod in MODULE_VERSIONS and ver != MODULE_VERSIONS[mod]:
                    self.err(f"{d}/module.xml", f"version {ver}, erwartet {MODULE_VERSIONS[mod]} (spec §B.1)")
            if modx is not None:
                act["instanceid"], act["contextid"] = modx.get("id"), modx.get("contextid")
                if modx.get("moduleid") != cmid or modx.get("modulename") != mod:
                    self.err(f"{d}/{mod}.xml", f"moduleid/modulename passen nicht zu {mod}_{cmid}")
                inner = modx.find(mod)
                if inner is None:
                    self.err(f"{d}/{mod}.xml", f"<{mod}> fehlt")
                elif inner.get("id") != act["instanceid"]:
                    self.err(f"{d}/{mod}.xml", f"<{mod} id> {inner.get('id')} ≠ activity id {act['instanceid']}")
            self.acts.append(act)

        for s in info.findall("contents/sections/section"):
            sid, d = _text(s, "sectionid"), _text(s, "directory")
            if d != f"sections/section_{sid}":
                self.err(f"moodle_backup.xml Abschnitt {sid}", f"directory „{d}“ erwartet „sections/section_{sid}“")
            seen_dirs.add(d)
            for f in ("section", "inforef"):
                if f"{d}/{f}.xml" not in self.entries:
                    self.err(d, f"{f}.xml fehlt")
            for suffix in ("included", "userinfo"):
                if f"section_{sid}_{suffix}" not in settings:
                    self.err("moodle_backup.xml", f"Setting section_{sid}_{suffix} fehlt")
            root_s = self.xml.get(f"{d}/section.xml")
            sec = {"id": sid, "dir": d, "root": root_s, "number": None, "sequence": [], "parentcmid": _text(s, "parentcmid", ""),
                   "modname": _text(s, "modname", ""), "component": None, "itemid": None,
                   "userinfo": settings.get(f"section_{sid}_userinfo", "0"), "tilephoto": None, "tileicon": None}
            if root_s is not None:
                if root_s.get("id") != sid:
                    self.err(f"{d}/section.xml", f"id {root_s.get('id')} ≠ sectionid {sid}")
                num = _text(root_s, "number", "")
                if not num.isdigit():
                    self.err(f"{d}/section.xml", f"number „{num}“ ist keine Zahl")
                else:
                    sec["number"] = int(num)
                seq = _text(root_s, "sequence", "")
                sec["sequence"] = [c for c in seq.split(",") if c]
                sec["component"], sec["itemid"] = _text(root_s, "component", NULL), _text(root_s, "itemid", NULL)
                self.kacheln(sec)
            if sid in self.secs:
                self.err("moodle_backup.xml", f"Abschnitt {sid} doppelt gelistet")
            self.secs[sid] = sec

        for p in self.entries:
            top = p.split("/")
            if top[0] in ("activities", "sections") and len(top) >= 2:
                d = f"{top[0]}/{top[1]}"
                if d not in seen_dirs:
                    self.err(d, "liegt im Archiv, ist aber in moodle_backup.xml nicht gelistet")
                    seen_dirs.add(d)

    def kacheln(self, sec):
        """Kachelbild/-icon eines Abschnitts (section.xml): nur im Kachelformat, Werte konsistent, Datei folgt in inforefs()."""
        root_s, wo = sec["root"], f"{sec['dir']}/section.xml"
        opts = {_text(o, "name", ""): _text(o, "value", "") for o in root_s.findall("course_format_options")}
        plugin = root_s.find("plugin_format_tiles_section")
        if not opts and plugin is None:
            return
        if self.format != "tiles":
            self.err(wo, f"Kacheloptionen ({', '.join(opts) or 'plugin_format_tiles_section'}), aber Kursformat {self.format}")
        if sec["parentcmid"]:
            self.err(wo, "Kacheloptionen an einem Unterabschnitt (nur reguläre Abschnitte sind Kacheln)")
        for o in root_s.findall("course_format_options"):
            if _text(o, "format", "") != "tiles" or _text(o, "name", "") not in ("tilephoto", "tileicon"):
                self.err(wo, f"course_format_options „{_text(o, 'name', '')}“ (format {_text(o, 'format', '')}): erwartet tiles/tilephoto oder tileicon")
        sec["tilephoto"], sec["tileicon"] = opts.get("tilephoto"), opts.get("tileicon")
        if plugin is not None:
            if plugin.get("sectionid") != sec["id"] or _text(plugin, "optiontype", "") != "1":
                self.err(wo, f"plugin_format_tiles_section braucht sectionid {sec['id']} und optiontype 1 (Foto)")
            if _text(plugin, "optionvalue", "") != sec["tilephoto"]:
                self.err(wo, f"Kachelbild „{_text(plugin, 'optionvalue', '')}“ (Plugin) ≠ „{sec['tilephoto']}“ (course_format_options tilephoto)")
        elif sec["tilephoto"]:
            self.err(wo, "tilephoto ohne plugin_format_tiles_section (export-schemata/kachelformat)")

    def nutzerdaten(self):
        """users/userinfo-Settings: userinfo=1 nur mit users=1 und entlang der Kette Abschnitt → Unterabschnitt-Modul."""
        users = self.settings.get("users") == "1"
        by_cmid = {a["cmid"]: a for a in self.acts}
        on = [a for a in self.acts if a["userinfo"] == "1"] + [s for s in self.secs.values() if s["userinfo"] == "1"]
        if on and not users:
            self.err("moodle_backup.xml", "userinfo=1 gesetzt, aber root-Setting users=0 (Moodle sperrt userinfo dann auf 0)")
        for a in [a for a in self.acts if a["userinfo"] == "1"]:
            s, seen = self.secs.get(a["sectionid"]), set()
            while s is not None and s["id"] not in seen:
                seen.add(s["id"])
                if s["userinfo"] != "1":
                    self.err("moodle_backup.xml", f"{a['modname']}_{a['cmid']}_userinfo=1, aber section_{s['id']}_userinfo=0 "
                                                  "(Moodle sperrt das Modul-Setting)")
                sub = by_cmid.get(s["parentcmid"]) if s["parentcmid"] else None
                if sub is not None and sub["userinfo"] != "1":
                    self.err("moodle_backup.xml", f"{a['modname']}_{a['cmid']}_userinfo=1 im Unterabschnitt, aber "
                                                  f"subsection_{sub['cmid']}_userinfo=0")
                s = self.secs.get(sub["sectionid"]) if sub is not None else None
        if users and self.xml.get("badges.xml") is not None and self.xml["badges.xml"].findall("badge"):
            self.warn("moodle_backup.xml", "users=1 (Glossareinträge) und Badges: sperrt die Plattform „Nutzer einbeziehen“ "
                                           "beim Wiederherstellen, fallen Einträge und Badges weg (build.py --ohne-nutzerdaten, "
                                           "Einträge per XML-Import)")

    def kursformat(self):
        """Einzelaktivität: genau eine Aktivität in Abschnitt 0, activitytype passend."""
        if self.format != "singleactivity":
            return
        course = self.xml.get("course/course.xml")
        opts = {_text(o, "name", ""): _text(o, "value", "") for o in course.findall("courseformatoptions/courseformatoption")}
        if len(self.acts) != 1:
            self.err("course/course.xml", f"Einzelaktivität mit {len(self.acts)} Aktivitäten (genau eine erwartet)")
            return
        a = self.acts[0]
        s = self.secs.get(a["sectionid"])
        if s is None or s["number"] != 0:
            self.err("course/course.xml", "Einzelaktivität: die Aktivität muss in Abschnitt 0 liegen")
        if opts.get("activitytype") != a["modname"]:
            self.err("course/course.xml", f"activitytype „{opts.get('activitytype')}“ ≠ Modul {a['modname']}")

    def ids_und_nummern(self):
        def dupes(items):
            seen, out = set(), []
            for i in items:
                if i in seen:
                    out.append(i)
                seen.add(i)
            return sorted(set(out))

        d = dupes([a["cmid"] for a in self.acts])
        if d:
            self.err("moodle_backup.xml", f"doppelte Modul-IDs (cmid): {', '.join(d)}")
        d = dupes([a["contextid"] for a in self.acts if a["contextid"]] + ([self.course_ctx] if self.course_ctx else []))
        if d:
            self.err("activities", f"doppelte contextid: {', '.join(d)}")
        for mod in sorted({a["modname"] for a in self.acts}):
            d = dupes([a["instanceid"] for a in self.acts if a["modname"] == mod and a["instanceid"]])
            if d:
                self.err(f"activities/{mod}_*", f"doppelte Instanz-IDs: {', '.join(d)}")
        nums = sorted(s["number"] for s in self.secs.values() if s["number"] is not None)
        if nums != list(range(len(nums))):
            self.err("sections", f"Abschnittsnummern nicht fortlaufend 0..{len(nums) - 1}: {nums}")
        # Bewertungsposten
        gb = self.xml.get("gradebook.xml")
        cats = set()
        if gb is not None:
            cats = {c.get("id") for c in gb.findall("grade_categories/grade_category")}
            for gi in gb.findall("grade_items/grade_item"):
                self.grade_items[gi.get("id")] = "gradebook.xml"
        for a in self.acts:
            g = self.xml.get(f"{a['dir']}/grades.xml")
            if g is None:
                continue
            for gi in g.findall("grade_items/grade_item"):
                gid = gi.get("id")
                if gid in self.grade_items:
                    self.err(f"{a['dir']}/grades.xml", f"grade_item {gid} doppelt (auch in {self.grade_items[gid]})")
                self.grade_items[gid] = a["dir"]
                if _text(gi, "iteminstance") != a["instanceid"] or _text(gi, "itemmodule") != a["modname"]:
                    self.err(f"{a['dir']}/grades.xml", f"grade_item {gid}: iteminstance/itemmodule passen nicht zur Aktivität")
                if cats and _text(gi, "categoryid") not in cats:
                    self.err(f"{a['dir']}/grades.xml", f"grade_item {gid}: categoryid {_text(gi, 'categoryid')} nicht in gradebook.xml")

    def abschnitte(self):
        by_cmid = {a["cmid"]: a for a in self.acts}
        subs = {a["cmid"]: a for a in self.acts if a["modname"] == "subsection"}
        for sid, s in self.secs.items():
            wo = f"{s['dir']}/section.xml"
            for cmid in s["sequence"]:
                a = by_cmid.get(cmid)
                if a is None:
                    self.err(wo, f"sequence nennt cmid {cmid}, keine solche Aktivität")
                elif a["sectionid"] != sid:
                    self.err(wo, f"sequence nennt cmid {cmid}, dessen module.xml zeigt auf Abschnitt {a['sectionid']}")
            if s["parentcmid"]:
                if s["modname"] != "subsection":
                    self.err(wo, "parentcmid gesetzt, aber modname ≠ subsection")
                parent = subs.get(s["parentcmid"])
                if parent is None:
                    self.err(wo, f"parentcmid {s['parentcmid']} ist kein subsection-Modul")
                elif s["component"] != "mod_subsection" or s["itemid"] != parent["instanceid"]:
                    self.err(wo, f"Unterabschnitt braucht component mod_subsection und itemid {parent['instanceid']}")
            elif s["component"] not in (NULL, None) or s["itemid"] not in (NULL, None):
                self.err(wo, f"regulärer Abschnitt mit component/itemid {s['component']}/{s['itemid']}")
        for a in self.acts:
            s = self.secs.get(a["sectionid"])
            if s is None:
                self.err(f"{a['dir']}/module.xml", f"sectionid {a['sectionid']} existiert nicht")
                continue
            if a["cmid"] not in s["sequence"]:
                self.err(f"{s['dir']}/section.xml", f"sequence enthält cmid {a['cmid']} ({a['modname']}) nicht")
            if a["module"] is not None and s["number"] is not None and _text(a["module"], "sectionnumber") != str(s["number"]):
                self.err(f"{a['dir']}/module.xml", f"sectionnumber {_text(a['module'], 'sectionnumber')} ≠ number {s['number']}")
            if a["insub"] != bool(s["parentcmid"]):
                self.err("moodle_backup.xml", f"Aktivität {a['modname']}_{a['cmid']}: insubsection passt nicht zum Abschnitt")
        for cmid, a in subs.items():
            if not any(s["parentcmid"] == cmid for s in self.secs.values()):
                self.err(f"{a['dir']}/subsection.xml", "kein Unterabschnitt (section mit parentcmid) für dieses Modul")

    # ---------------------------------------------------------------- Dateien
    def dateien(self):
        root = self.xml.get("files.xml")
        if root is None:
            return
        ids = set()
        for f in root.findall("file"):
            rec = {k: _text(f, k, "") for k in ("contenthash", "contextid", "component", "filearea", "itemid",
                                                 "filepath", "filename", "filesize")}
            rec["id"] = f.get("id")
            rec["refs"] = 0
            wo = f"files.xml Datei {rec['id']} ({rec['filename']})"
            if rec["id"] in ids:
                self.err(wo, "doppelte Datei-ID")
            ids.add(rec["id"])
            h = rec["contenthash"]
            arc = f"files/{h[:2]}/{h}"
            data = self.entries.get(arc)
            if data is None:
                self.err(wo, f"fehlt im Archiv unter {arc}")
            else:
                real = hashlib.sha1(data).hexdigest()
                if real != h:
                    self.err(wo, f"Hash stimmt nicht: contenthash {h}, Inhalt {real}")
                if rec["filesize"] != str(len(data)):
                    self.err(wo, f"filesize {rec['filesize']} ≠ {len(data)} Bytes im Archiv")
            if not (rec["filepath"].startswith("/") and rec["filepath"].endswith("/")):
                self.err(wo, f"filepath „{rec['filepath']}“ muss mit / beginnen und enden")
            self.files.append(rec)
        hashes = {r["contenthash"] for r in self.files}
        for p in self.entries:
            if p.startswith("files/"):
                h = p.split("/")[-1]
                if h not in hashes:
                    self.err(p, "liegt im Archiv, steht aber in keiner files.xml-Zeile")
                elif p != f"files/{h[:2]}/{h}":
                    self.err(p, "liegt nicht unter files/<hash[:2]>/<hash>")

    def inforefs(self):
        by_id = {r["id"]: r for r in self.files}
        by_ctx = {a["contextid"]: a for a in self.acts if a["contextid"]}

        def check_inforef(path, ctx, grade_dir=None):
            root = self.xml.get(path)
            if root is None:
                return
            for fid in [_text(f, "id", "") for f in root.findall("fileref/file")]:
                rec = by_id.get(fid)
                if rec is None:
                    self.err(path, f"fileref {fid} steht nicht in files.xml")
                    continue
                rec["refs"] += 1
                if rec["contextid"] != ctx:
                    self.err(path, f"fileref {fid} ({rec['filename']}) gehört zu contextid {rec['contextid']}, nicht {ctx}")
            for gid in [_text(g, "id", "") for g in root.findall("grade_itemref/grade_item")]:
                if self.grade_items.get(gid) != grade_dir:
                    self.err(path, f"grade_itemref {gid} nicht in {grade_dir}/grades.xml")

        for a in self.acts:
            check_inforef(f"{a['dir']}/inforef.xml", a["contextid"], a["dir"])
            g = self.xml.get(f"{a['dir']}/grades.xml")
            ir = self.xml.get(f"{a['dir']}/inforef.xml")
            if g is not None and ir is not None:
                have = {_text(x, "id") for x in ir.findall("grade_itemref/grade_item")}
                for gi in g.findall("grade_items/grade_item"):
                    if gi.get("id") not in have:
                        self.err(f"{a['dir']}/inforef.xml", f"grade_itemref {gi.get('id')} fehlt (grades.xml hat den Posten)")
        check_inforef("course/inforef.xml", self.course_ctx)
        sec_refs = {}   # Datei-ID -> Abschnitt, der sie referenziert
        for s in self.secs.values():
            check_inforef(f"{s['dir']}/inforef.xml", self.course_ctx)
            ir = self.xml.get(f"{s['dir']}/inforef.xml")
            for fid in [_text(f, "id", "") for f in ir.findall("fileref/file")] if ir is not None else []:
                sec_refs[fid] = s

        for rec in self.files:
            wo = f"files.xml Datei {rec['id']} ({rec['filename']})"
            if rec["refs"] == 0:
                self.err(wo, "wird von keiner inforef.xml referenziert")
            comp = rec["component"]
            if comp.startswith("mod_"):
                a = by_ctx.get(rec["contextid"])
                if a is None:
                    self.err(wo, f"contextid {rec['contextid']} gehört zu keiner Aktivität")
                elif f"mod_{a['modname']}" != comp:
                    self.err(wo, f"component {comp}, Aktivität im Kontext ist aber {a['modname']}")
            elif comp in ("course", "badges"):
                if rec["contextid"] != self.course_ctx:
                    self.err(wo, f"component {comp} braucht den Kurs-Kontext {self.course_ctx}")
            elif comp == "format_tiles":
                s = self.secs.get(rec["itemid"])
                if rec["contextid"] != self.course_ctx or rec["filearea"] != "tilephoto" or rec["filepath"] != "/tilephoto/":
                    self.err(wo, "Kachelbild braucht Kurs-Kontext, filearea tilephoto und filepath /tilephoto/")
                if s is None or s["tilephoto"] != rec["filename"]:
                    self.err(wo, f"itemid {rec['itemid']} ist kein Abschnitt mit tilephoto „{rec['filename']}“")
                elif sec_refs.get(rec["id"]) is not s:
                    self.err(wo, f"muss aus {s['dir']}/inforef.xml referenziert werden")
            else:
                self.err(wo, f"unbekannte component „{comp}“")
        for s in self.secs.values():
            if s["tilephoto"] and not any(r["component"] == "format_tiles" and r["itemid"] == s["id"]
                                          and r["filename"] == s["tilephoto"] for r in self.files):
                self.err(f"{s['dir']}/section.xml", f"Kachelbild „{s['tilephoto']}“ steht nicht in files.xml (format_tiles/tilephoto, itemid = Abschnitts-ID)")

    # ---------------------------------------------------------------- Inhalte
    def _files_for(self, act, filearea):
        return [r for r in self.files if r["contextid"] == act["contextid"] and r["component"] == f"mod_{act['modname']}"
                and r["filearea"] == filearea]

    def _pluginfiles(self, act, filearea, html, wo):
        """@@PLUGINFILE@@-Verweise in HTML gegen files.xml (beide Richtungen)."""
        refs = {unquote(m) for m in PLUGINFILE.findall(html or "")}
        have = {(r["filepath"] + r["filename"]).lstrip("/"): r for r in self._files_for(act, filearea)}
        for name in sorted(refs - set(have)):
            self.err(wo, f"Bild „{name}“ im HTML, aber nicht in files.xml (mod_{act['modname']}/{filearea})")
        for name in sorted(set(have) - refs):
            self.err(wo, f"Datei „{name}“ (files.xml {have[name]['id']}, {filearea}) wird im HTML nicht verwendet")

    def inhalte(self):
        for a in self.acts:
            modx = a["mod"]
            if modx is None:
                continue
            inner = modx.find(a["modname"])
            if inner is None:
                continue
            wo = f"{a['dir']}/{a['modname']}.xml"
            mod = a["modname"]
            areas = {"intro"}
            self._pluginfiles(a, "intro", _text(inner, "intro", ""), wo)
            if mod == "page":
                areas.add("content")
                self._pluginfiles(a, "content", _text(inner, "content", ""), wo)
            elif mod == "hvp":
                areas.add("content")
                self.hvp(a, inner, wo)
            elif mod == "resource":
                areas.add("content")
                n = len(self._files_for(a, "content"))
                if n != 1:
                    self.err(wo, f"Datei braucht genau eine Datei in mod_resource/content, {n} gefunden")
            elif mod == "folder":
                areas.add("content")
                if not self._files_for(a, "content"):
                    self.err(wo, "Verzeichnis ohne Dateien (mod_folder/content)")
            elif mod == "book":
                areas.add("chapter")
                self.book(a, inner, wo)
            elif mod == "quiz":
                self.quiz(a, inner, wo)
            elif mod == "assign":
                areas |= {"introattachment", "activityattachment"}
                self.bewertung(a, wo, float(_text(inner, "grade", "0") or 0))
            elif mod == "choice":
                if len(inner.findall("options/option")) < 2:
                    self.err(wo, "Abstimmung mit weniger als zwei Optionen")
            elif mod == "glossary":
                areas |= {"entry", "attachment"}
                entries = inner.findall("entries/entry")
                for e in entries:
                    if _text(e, "approved", "1") != "1" or _text(e, "teacherentry", "1") != "1":
                        self.err(wo, f"Eintrag „{_text(e, 'concept', '')}“: approved und teacherentry müssen 1 sein "
                                     "(ohne Nutzerdaten nur Einträge der Lehrkraft)")
                if entries and (a["userinfo"] != "1" or self.settings.get("users") != "1"):
                    self.warn(wo, f"{len(entries)} Einträge, aber userinfo=0: Moodle stellt Glossareinträge nur mit "
                                  "Nutzerdaten wieder her (restore_glossary_stepslib), sie gehen beim Import verloren; "
                                  "Ausweg: XML-Datei neben der .mbz über Glossar → Einträge importieren")
            for r in [r for r in self.files if r["contextid"] == a["contextid"] and r["filearea"] not in areas]:
                self.err(wo, f"Datei „{r['filename']}“ in unbekanntem Dateibereich {r['component']}/{r['filearea']}")

    def bewertung(self, a, wo, grademax):
        """Bewertungsposten passt zur Maximalbewertung des Moduls (0 = kein Posten)."""
        g = self.xml.get(f"{a['dir']}/grades.xml")
        items = g.findall("grade_items/grade_item") if g is not None else []
        if grademax <= 0:
            if items:
                self.err(f"{a['dir']}/grades.xml", "Bewertungsposten, obwohl das Modul nicht bewertet wird (grade 0)")
            return
        if not items:
            self.err(f"{a['dir']}/grades.xml", f"kein Bewertungsposten (grade {grademax:g})")
            return
        gm = float(_text(items[0], "grademax", "0") or 0)
        if abs(gm - grademax) > 0.001:
            self.err(f"{a['dir']}/grades.xml", f"grademax {gm:g} ≠ Bewertung des Moduls {grademax:g}")
        if a["module"] is not None and _text(a["module"], "completionpassgrade", "0") == "1":
            if float(_text(items[0], "gradepass", "0") or 0) <= 0:
                self.err(f"{a['dir']}/grades.xml", "Abschluss „bestehen“ (completionpassgrade 1), aber gradepass 0")

    def book(self, a, inner, wo):
        chapters = inner.findall("chapters/chapter")
        if not chapters:
            self.err(wo, "Buch ohne Kapitel")
        nums = [_text(c, "pagenum", "") for c in chapters]
        if nums != [str(i) for i in range(1, len(nums) + 1)]:
            self.err(wo, f"pagenum nicht fortlaufend 1..{len(nums)}: {nums}")
        if chapters and _text(chapters[0], "subchapter", "0") == "1":
            self.err(wo, "erstes Kapitel darf kein Unterkapitel sein")
        ids = {c.get("id") for c in chapters}
        for r in self._files_for(a, "chapter"):
            if r["itemid"] not in ids:
                self.err(wo, f"Datei „{r['filename']}“: itemid {r['itemid']} ist kein Kapitel (mod_book/chapter, itemid = Kapitel-ID)")
        for c in chapters:
            refs = {unquote(m) for m in PLUGINFILE.findall(_text(c, "content", ""))}
            have = {(r["filepath"] + r["filename"]).lstrip("/") for r in self._files_for(a, "chapter") if r["itemid"] == c.get("id")}
            for name in sorted(refs - have):
                self.err(wo, f"Kapitel „{_text(c, 'title', '')}“: Bild „{name}“ im HTML, aber nicht in files.xml (mod_book/chapter)")
            for name in sorted(have - refs):
                self.err(wo, f"Kapitel „{_text(c, 'title', '')}“: Datei „{name}“ wird im HTML nicht verwendet")

    def quiz(self, a, inner, wo):
        """Test: Fragenverweise gegen questions.xml, Kategorie im Modulkontext, Summen, Bewertungsposten."""
        qroot = self.xml.get("questions.xml")
        cats = {c.get("id"): c for c in qroot.findall("question_category")} if qroot is not None else {}
        entry_cat = {}
        for cid, c in cats.items():
            for e in c.findall("question_bank_entries/question_bank_entry"):
                entry_cat[e.get("id")] = cid
        ir = self.xml.get(f"{a['dir']}/inforef.xml")
        refcats = {_text(q, "id", "") for q in ir.findall("question_categoryref/question_category")} if ir is not None else set()
        for cid in sorted(refcats - set(cats)):
            self.err(f"{a['dir']}/inforef.xml", f"question_categoryref {cid} steht nicht in questions.xml")
        for cid in sorted(refcats & set(cats)):
            c = cats[cid]
            if _text(c, "contextlevel", "") != "70" or _text(c, "contextinstanceid", "") != a["cmid"]:
                self.err("questions.xml", f"Kategorie {cid}: contextlevel 70 und contextinstanceid {a['cmid']} (cmid des Tests) erwartet")
            if _text(c, "contextid", "") != a["contextid"]:
                self.err("questions.xml", f"Kategorie {cid}: contextid {_text(c, 'contextid', '')} ≠ Kontext des Tests {a['contextid']}")
            parent = _text(c, "parent", "0")
            if parent != "0" and parent not in refcats:
                self.err(f"{a['dir']}/inforef.xml", f"Kategorie {cid}: Elternkategorie {parent} nicht in question_categoryref")
        self.qcats_used |= refcats
        total = 0.0
        slots = []
        for qi in inner.findall("question_instances/question_instance"):
            slots.append(_text(qi, "slot", ""))
            total += float(_text(qi, "maxmark", "0") or 0)
            ref = qi.find("question_reference")
            if ref is None:
                self.err(wo, f"Slot {_text(qi, 'slot', '')}: question_reference fehlt")
                continue
            eid = _text(ref, "questionbankentryid", "")
            if eid not in entry_cat:
                self.err(wo, f"Slot {_text(qi, 'slot', '')}: questionbankentryid {eid} steht nicht in questions.xml")
            elif entry_cat[eid] not in refcats:
                self.err(wo, f"Slot {_text(qi, 'slot', '')}: Kategorie {entry_cat[eid]} der Frage fehlt in inforef question_categoryref")
            if _text(ref, "usingcontextid", "") != a["contextid"] or _text(ref, "component", "") != "mod_quiz":
                self.err(wo, f"Slot {_text(qi, 'slot', '')}: question_reference braucht usingcontextid {a['contextid']} und component mod_quiz")
        if not slots:
            self.err(wo, "Test ohne Fragen (question_instances leer)")
        if slots != [str(i) for i in range(1, len(slots) + 1)]:
            self.err(wo, f"Slots nicht fortlaufend 1..{len(slots)}: {slots}")
        sg = float(_text(inner, "sumgrades", "0") or 0)
        if abs(sg - total) > 0.001:
            self.err(wo, f"sumgrades {sg:g} ≠ Summe der maxmark {total:g}")
        self.bewertung(a, wo, float(_text(inner, "grade", "0") or 0))

    def fragen(self):
        """questions.xml: jede Kategorie gehört zu einem Test, jede Frage hat einen bekannten Typ mit Antworten."""
        qroot = self.xml.get("questions.xml")
        if qroot is None:
            return
        for c in qroot.findall("question_category"):
            cid = c.get("id")
            if cid not in self.qcats_used:
                self.err("questions.xml", f"Kategorie {cid} („{_text(c, 'name', '')}“) wird von keinem Test referenziert")
            for q in c.findall(".//question"):
                wo = f"questions.xml Frage {q.get('id')} („{_text(q, 'name', '')}“)"
                qt = _text(q, "qtype", "")
                if qt not in QTYPES:
                    self.err(wo, f"qtype „{qt}“ nicht umgesetzt (erlaubt: {', '.join(QTYPES)})")
                    continue
                plugin = q.find(f"plugin_qtype_{qt}_question")
                if plugin is None:
                    self.err(wo, f"plugin_qtype_{qt}_question fehlt")
                    continue
                answers = plugin.findall("answers/answer")
                ids = {an.get("id") for an in answers}
                fracs = [float(_text(an, "fraction", "0") or 0) for an in answers]
                if not answers or not any(f > 0 for f in fracs):
                    self.err(wo, "keine Antwort mit positiver Bewertung")
                if qt == "multichoice":
                    mc = plugin.find("multichoice")
                    if mc is None:
                        self.err(wo, "<multichoice> fehlt")
                    elif _text(mc, "single", "1") == "1" and sum(1 for f in fracs if f > 0) != 1:
                        self.err(wo, "Einfachauswahl braucht genau eine richtige Antwort")
                if qt == "truefalse":
                    tf = plugin.find("truefalse")
                    if tf is None or _text(tf, "trueanswer", "") not in ids or _text(tf, "falseanswer", "") not in ids:
                        self.err(wo, "trueanswer/falseanswer verweisen nicht auf die beiden Antworten")
                if qt == "shortanswer" and plugin.find("shortanswer") is None:
                    self.err(wo, "<shortanswer> fehlt")

    def hvp(self, a, inner, wo):
        mn, major, minor = _text(inner, "machine_name", ""), _text(inner, "major_version", ""), _text(inner, "minor_version", "")
        libstr = f"{mn} {major}.{minor}"
        known = set(LIBS.values())
        if libstr not in known:
            self.err(wo, f"Bibliothek „{libstr}“ ist auf der Plattform nicht installiert (gen/libs.py, spec §B.2)")
        raw = _text(inner, "json_content", "")
        try:
            params = json.loads(raw)
        except json.JSONDecodeError as e:
            self.err(wo, f"json_content ist kein gültiges JSON: {e}")
            return
        libs_used, sub_ids, paths = [], [], []

        def walk(o):
            if isinstance(o, dict):
                lib = o.get("library")
                if isinstance(lib, str) and LIBSTR.match(lib):
                    libs_used.append(lib)
                sid = o.get("subContentId")
                if isinstance(sid, str):
                    sub_ids.append(sid)
                p = o.get("path")
                if isinstance(p, str) and "mime" in o:
                    paths.append(p)
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(params)
        for lib in sorted(set(libs_used) - known):
            self.err(wo, f"json_content nutzt „{lib}“, nicht in gen/libs.py (spec §B.2)")
        seen = set()
        for sid in sub_ids:
            if sid in seen:
                self.err(wo, f"subContentId {sid} doppelt")
            seen.add(sid)
        have = {(r["filepath"] + r["filename"]).lstrip("/"): r for r in self._files_for(a, "content")}
        for r in have.values():
            if r["itemid"] != a["instanceid"]:
                self.err(wo, f"Datei „{r['filename']}“: itemid {r['itemid']} ≠ hvp-Instanz {a['instanceid']} (spec §H)")
        refs = set(paths)
        for p in sorted(refs):
            if p.startswith(("http://", "https://")):
                continue
            if p not in have:
                self.err(wo, f"Bild „{p}“ in json_content, aber nicht in files.xml (mod_hvp/content, itemid {a['instanceid']})")
        for p in sorted(set(have) - refs):
            self.err(wo, f"Datei „{p}“ (files.xml {have[p]['id']}) wird in json_content nicht verwendet")

    def badges(self):
        root = self.xml.get("badges.xml")
        if root is None:
            return
        cmids = {a["cmid"] for a in self.acts}
        course = self.xml.get("course/course.xml")
        cid = course.get("id") if course is not None else None
        badge_ids = set()
        for b in root.findall("badge"):
            bid = b.get("id")
            wo = f"badges.xml Badge {bid}"
            if bid in badge_ids:
                self.err(wo, "doppelte Badge-ID")
            badge_ids.add(bid)
            if cid and _text(b, "courseid") != cid:
                self.err(wo, f"courseid {_text(b, 'courseid')} ≠ course.xml id {cid}")
            imgs = [r for r in self.files if r["component"] == "badges" and r["filearea"] == "badgeimage" and r["itemid"] == bid]
            if not imgs:
                self.err(wo, "kein Bild in files.xml (badges/badgeimage, itemid = Badge-ID)")
            for p in b.findall("criteria/criterion/params/param"):
                name, value = _text(p, "name", ""), _text(p, "value", "")
                if name != f"module_{value}":
                    self.err(wo, f"Kriterium „{name}“ passt nicht zu value {value}")
                if value not in cmids:
                    self.err(wo, f"Kriterium verweist auf cmid {value}, keine solche Aktivität")
        for r in self.files:
            if r["component"] == "badges" and r["itemid"] not in badge_ids:
                self.err(f"files.xml Datei {r['id']} ({r['filename']})", f"badges/badgeimage itemid {r['itemid']} ist kein Badge")

    def verfuegbarkeit(self):
        def pruefe(wo, raw):
            if raw in (NULL, "", None):
                return
            try:
                av = json.loads(raw)
            except json.JSONDecodeError as e:
                self.err(wo, f"Verfügbarkeits-JSON ungültig: {e}")
                return
            ok = (isinstance(av, dict) and av.get("op") in AVAIL_OPS and isinstance(av.get("c"), list)
                  and all(isinstance(c, dict) and "type" in c for c in av["c"]))
            if ok and av["op"] in ("&", "!&"):
                ok = isinstance(av.get("showc"), list) and len(av["showc"]) == len(av["c"])
            if ok and av["op"] in ("|", "!|"):
                ok = isinstance(av.get("show"), bool)
            if not ok:
                self.err(wo, f"Verfügbarkeits-JSON hat nicht die Form op/c/showc (spec §O): {raw[:80]}")
            for c in av.get("c", []) if ok else []:
                if c.get("type") == "date" and not (c.get("d") in (">=", "<") and isinstance(c.get("t"), int)):
                    self.err(wo, f"Datumsbedingung braucht d (>= oder <) und t (Unix-Sekunden): {c}")

        for a in self.acts:
            if a["module"] is not None:
                pruefe(f"{a['dir']}/module.xml", _text(a["module"], "availability", NULL))
        for s in self.secs.values():
            if s["root"] is not None:
                pruefe(f"{s['dir']}/section.xml", _text(s["root"], "availabilityjson", NULL))

    # ---------------------------------------------------------------- Lauf
    def run(self):
        if not self.lade():
            return self.errors
        self.index()
        self.xml_wohlgeformt()
        self.pflichtdateien()
        self.backup_xml()
        self.nutzerdaten()
        self.kursformat()
        self.ids_und_nummern()
        self.abschnitte()
        self.dateien()
        self.inforefs()
        self.inhalte()
        self.fragen()
        self.badges()
        self.verfuegbarkeit()
        return self.errors

    def kurzinfo(self):
        fmt = f", Format {self.format}" if self.format else ""
        return f"{len(self.acts)} Aktivitäten, {len(self.secs)} Abschnitte, {len(self.files)} Dateien{fmt}"


def check_mbz(path):
    """Gibt (Fehlerliste, Kurzinfo, Warnungen) zurück; leere Fehlerliste = OK."""
    p = Pruefung(path)
    errors = p.run()
    return errors, p.kurzinfo(), p.warnings


def report(path, errors, info, warnings=(), out=sys.stdout):
    name = os.path.basename(path)
    for wo, was in warnings:
        print(f"WARNUNG {wo}: {was}", file=out)
    if errors:
        for wo, was in errors:
            print(f"FEHLER {wo}: {was}", file=out)
        print(f"{len(errors)} Fehler in {name}", file=out)
    else:
        print(f"OK {name} ({info})", file=out)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv or any(a in ("-h", "--help") for a in argv):
        print(__doc__.strip())
        return 2
    rc = 0
    for path in argv:
        if not os.path.exists(path):
            print(f"FEHLER {path}: Datei nicht gefunden")
            rc = 1
            continue
        errors, info, warnings = check_mbz(path)
        report(path, errors, info, warnings)
        if errors:
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
