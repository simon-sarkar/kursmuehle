"""Sicherung prüfen, bevor sie importiert wird.

usage: python3 scripts/check.py <datei.mbz> [weitere.mbz …]

Prüft eine .mbz gegen references/spec.md: Archiv (tar.gz, .ARCHIVE_INDEX), Pflichtdateien, XML wohlgeformt,
moodle_backup.xml gegen die Ordner, Abschnitts-/Modulnummern und IDs, files.xml (sha1, Größe, jede Datei
referenziert), inforef.xml (Dateien, Bewertungsposten), H5P (Bibliotheksversionen aus gen/libs.py, json_content,
Bilder in images/), Bilder in Textfeldern/Seiten, Badges, Verfügbarkeits-JSON.
Ausgabe: `OK <datei> …` oder Zeilen `FEHLER <wo> <was>`; Exit-Code 1 bei Fehlern.
`build.py` ruft die Prüfung nach jedem Bau selbst auf. Neue Modultypen brauchen hier einen Eintrag (Dateibereiche).
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
from gen.mbz import MODULE_VERSIONS  # noqa: E402

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
        self.entries = {}         # Archivpfad -> bytes
        self.xml = {}             # Archivpfad -> ElementTree-Root
        self.acts = []            # dicts: cmid, sectionid, modname, dir, instanceid, contextid, module, mod
        self.secs = {}            # sectionid -> dict: number, sequence, dir, root, component, itemid, parentcmid
        self.files = []           # dicts aus files.xml
        self.course_ctx = None
        self.grade_items = {}     # grade_item id -> activity dir (oder "gradebook.xml")

    def err(self, wo, was):
        self.errors.append((wo, was))

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
        if settings.get("filename") != _text(info, "name"):
            self.err("moodle_backup.xml", "Setting „filename“ ≠ <name>")

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
                   "instanceid": None, "contextid": None, "insub": insub == "1", "title": _text(a, "title", "")}
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
                   "modname": _text(s, "modname", ""), "component": None, "itemid": None}
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
            else:
                self.err(wo, f"unbekannte component „{comp}“")

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
            areas = {"intro"}
            self._pluginfiles(a, "intro", _text(inner, "intro", ""), wo)
            if a["modname"] == "page":
                areas.add("content")
                self._pluginfiles(a, "content", _text(inner, "content", ""), wo)
            if a["modname"] == "hvp":
                areas.add("content")
                self.hvp(a, inner, wo)
            for r in [r for r in self.files if r["contextid"] == a["contextid"] and r["filearea"] not in areas]:
                self.err(wo, f"Datei „{r['filename']}“ in unbekanntem Dateibereich {r['component']}/{r['filearea']}")

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
        self.ids_und_nummern()
        self.abschnitte()
        self.dateien()
        self.inforefs()
        self.inhalte()
        self.badges()
        self.verfuegbarkeit()
        return self.errors

    def kurzinfo(self):
        return f"{len(self.acts)} Aktivitäten, {len(self.secs)} Abschnitte, {len(self.files)} Dateien"


def check_mbz(path):
    """Gibt die Fehlerliste zurück (leer = OK) und eine Kurzinfo."""
    p = Pruefung(path)
    errors = p.run()
    return errors, p.kurzinfo()


def report(path, errors, info, out=sys.stdout):
    name = os.path.basename(path)
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
        errors, info = check_mbz(path)
        report(path, errors, info)
        if errors:
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
