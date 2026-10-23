"""Write a Moodle 5.2 course backup (.mbz) for lernplattform.bycs.de.

Templated from test exports of 2026-10-22 (Moodle 5.2.4, mod_hvp 2026062501).
Supported modules: label, page, hvp, subsection, feedback. Plus badges, files.
"""
import hashlib
import io
import json
import os
import tarfile
import time
from xml.sax.saxutils import escape

from .h5p import Hvp

NULL = "$@NULL@$"
MOODLE_VERSION = "2026042004"
MOODLE_RELEASE = "5.2.4 (Build: 20261005)"
BACKUP_VERSION = "2026042000"
BACKUP_RELEASE = "5.2"
WWWROOT = "https://lernplattform.bycs.de"
# Platzhalter für Herkunftsangaben der Sicherung. Beim Import in einen bestehenden Kurs sind die Werte ohne
# Bedeutung (belegt 2026-10-23: Import mit diesen Platzhaltern in einem fremden Account); sie werden nicht angepasst.
SITE_HASH = "6aa9a12f353641854c7eaa8a0fcd932f"
ORIGINAL_COURSE_ID = 1000000
ORIGINAL_COURSE_CONTEXTID = 1000001
CATEGORY_ID, CATEGORY_NAME = 1, "Kategorie"
# Kurs-Zusatzfelder der Plattform (spec §B.1): (id, shortname, type, value)
CUSTOMFIELDS = [(1, "schule", "text", ""), (2, "participants", "checkbox", "0")]
MODULE_VERSIONS = {"hvp": "2026062501", "subsection": "2026042000", "label": "2026042000",
                   "page": "2026042000", "feedback": "2026042000", "url": "2026042000"}


def x(v):
    """xml-escape text, NULL passthrough."""
    if v is None:
        return NULL
    if isinstance(v, bool):
        return "1" if v else "0"
    return escape(str(v))


# ---------------------------------------------------------------- model
class File:
    def __init__(self, local_path, component, filearea, itemid, filename, filepath="/", mimetype="image/png"):
        self.local_path = local_path
        with open(local_path, "rb") as f:
            self.data = f.read()
        self.hash = hashlib.sha1(self.data).hexdigest()
        self.component, self.filearea, self.itemid = component, filearea, itemid
        self.filename, self.filepath, self.mimetype = filename, filepath, mimetype
        self.id = None
        self.contextid = None


def availability_json(available_from=None):
    """Moodle availability tree: visible from a unix timestamp (date condition)."""
    if not available_from:
        return None
    return json.dumps({"op": "&", "c": [{"type": "date", "d": ">=", "t": int(available_from)}], "showc": [True]})


class Item:
    modname = None

    def __init__(self, name, intro="", files=None, completion="none", visible=True, available_from=None):
        self.name = name
        self.intro = intro
        self.files = files or []     # list of (local_path, filename) -> intro filearea
        self.completion = completion
        self.visible = visible
        self.available_from = available_from   # unix ts -> availabilityjson (date condition)
        self.cmid = self.instanceid = self.contextid = None
        self.grade_item_id = None


class Label(Item):
    modname = "label"

    def __init__(self, html, files=None, name=None):
        super().__init__(name or "Textfeld", intro=html, files=files)


class Page(Item):
    modname = "page"

    def __init__(self, name, content_html, intro="", files=None, completion="view"):
        super().__init__(name, intro=intro, completion=completion)
        self.content = content_html
        self.content_files = files or []


class SubSection(Item):
    modname = "subsection"

    def __init__(self, name, items):
        super().__init__(name)
        self.items = items
        self.sectionid = None


class Feedback(Item):
    modname = "feedback"

    def __init__(self, name, intro, questions, after_text="Danke. Deine Antworten sind gespeichert."):
        super().__init__(name, intro=intro, completion="submit")
        self.questions = questions   # list of (label, [options]) -> multichoice single
        self.after_text = after_text


class Url(Item):
    """Link/Video (mod_url). A YouTube/Vimeo link is embedded by the platform's multimedia filter when display=embed."""
    modname = "url"

    def __init__(self, name, externalurl, intro="", display="embed", completion="view"):
        super().__init__(name, intro=intro, completion=completion)
        self.externalurl = externalurl
        self.display = {"auto": 0, "embed": 1, "open": 5, "popup": 6}[display]


class HvpItem(Item):
    modname = "hvp"

    def __init__(self, hvp: Hvp):
        super().__init__(hvp.name, intro=hvp.intro, completion=hvp.completion)
        self.hvp = hvp


class Section:
    def __init__(self, name, summary="", items=None, visible=True, available_from=None):
        self.name = name
        self.summary = summary
        self.items = items or []
        self.visible = visible
        self.available_from = available_from   # unix ts -> section visible from that date
        self.id = self.number = None
        self.parentcmid = None   # for delegated sections


class Badge:
    def __init__(self, name, description, image_path, criteria_items, message_subject="Glückwunsch!",
                 message="<p>Du hast den Badge „%badgename%“ erhalten.</p>"):
        self.name, self.description, self.image_path = name, description, image_path
        self.criteria_items = criteria_items   # Items whose completion is required
        self.message_subject, self.message = message_subject, message


class Course:
    def __init__(self, fullname, shortname, summary="", sections=None, badges=None,
                 image_path=None, startdate=None):
        self.fullname, self.shortname, self.summary = fullname, shortname, summary
        self.sections = sections or []
        self.badges = badges or []
        self.image_path = image_path
        self.startdate = startdate or int(time.time())


# ---------------------------------------------------------------- writer
class Writer:
    def __init__(self, course: Course, out_path, now=None):
        self.c = course
        self.out = out_path
        self.now = now or int(time.time())
        self.entries = {}       # archive path -> bytes
        self.files = []         # File objects
        self._id = 900000
        self.course_id = ORIGINAL_COURSE_ID
        self.course_ctx = ORIGINAL_COURSE_CONTEXTID
        self.cat_id = 2884508
        self.all_items = []     # flat, in course order (with subsection items)
        self.all_sections = []  # regular + delegated

    def nid(self):
        self._id += 1
        return self._id

    # ----- ids & layout
    def assign(self):
        n = 0
        delegated = []
        for s in self.c.sections:
            s.id = self.nid()
            s.number = n
            n += 1
            self.all_sections.append(s)
            for it in s.items:
                self._assign_item(it, s)
                if isinstance(it, SubSection):
                    ds = Section(it.name, items=it.items, available_from=it.available_from)
                    ds.id = self.nid()
                    ds.parentcmid = it.cmid
                    ds.sub = it
                    it.sectionid = ds.id
                    delegated.append(ds)
                    for sub in it.items:
                        self._assign_item(sub, ds)
        for ds in delegated:
            ds.number = n
            n += 1
            self.all_sections.append(ds)

    def _assign_item(self, it, section):
        it.cmid = self.nid()
        it.instanceid = self.nid()
        it.contextid = self.nid()
        it.section = section
        self.all_items.append(it)

    # ----- files
    def add_file(self, local, component, filearea, itemid, contextid, filename, filepath="/"):
        f = File(local, component, filearea, itemid, filename, filepath)
        f.id = self.nid()
        f.contextid = contextid
        self.files.append(f)
        arc = f"files/{f.hash[:2]}/{f.hash}"
        self.entries[arc] = f.data
        return f

    def files_xml(self, subset=None):
        fs = subset if subset is not None else self.files
        out = ['<?xml version="1.0" encoding="UTF-8"?>', "<files>"]
        for f in fs:
            out.append(f"""  <file id="{f.id}">
    <contenthash>{f.hash}</contenthash>
    <contextid>{f.contextid}</contextid>
    <component>{f.component}</component>
    <filearea>{f.filearea}</filearea>
    <itemid>{f.itemid}</itemid>
    <filepath>{f.filepath}</filepath>
    <filename>{x(f.filename)}</filename>
    <userid>{NULL}</userid>
    <filesize>{len(f.data)}</filesize>
    <mimetype>{f.mimetype}</mimetype>
    <status>0</status>
    <timecreated>{self.now}</timecreated>
    <timemodified>{self.now}</timemodified>
    <source>{x(f.filename)}</source>
    <author>{NULL}</author>
    <license>unknown</license>
    <sortorder>0</sortorder>
    <repositorytype>{NULL}</repositorytype>
    <repositoryid>{NULL}</repositoryid>
    <reference>{NULL}</reference>
  </file>""")
        out.append("</files>")
        return "\n".join(out)

    # ----- module.xml
    def module_xml(self, it: Item):
        comp = {"none": (0, 0, NULL, 0), "manual": (1, 0, NULL, 0), "view": (2, 1, NULL, 0),
                "pass": (2, 0, 0, 1), "submit": (2, 0, NULL, 0)}[it.completion]
        completion, view, gin, passgrade = comp
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<module id="{it.cmid}" version="{MODULE_VERSIONS[it.modname]}">
  <modulename>{it.modname}</modulename>
  <sectionid>{it.section.id}</sectionid>
  <sectionnumber>{it.section.number}</sectionnumber>
  <idnumber></idnumber>
  <added>{self.now}</added>
  <score>0</score>
  <indent>0</indent>
  <visible>{x(it.visible)}</visible>
  <visibleoncoursepage>1</visibleoncoursepage>
  <visibleold>{x(it.visible)}</visibleold>
  <groupmode>0</groupmode>
  <groupingid>0</groupingid>
  <completion>{completion}</completion>
  <completiongradeitemnumber>{gin}</completiongradeitemnumber>
  <completionpassgrade>{passgrade}</completionpassgrade>
  <completionview>{view}</completionview>
  <completionexpected>0</completionexpected>
  <availability>{x(availability_json(it.available_from))}</availability>
  <showdescription>{1 if (it.intro and it.modname not in ('label',)) else 0}</showdescription>
  <downloadcontent>1</downloadcontent>
  <lang></lang>
  <enableaitools>{NULL}</enableaitools>
  <enabledaiactions>{NULL}</enabledaiactions>
  <tags>
  </tags>
</module>
"""

    def empties(self, d):
        self.entries[f"{d}/roles.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<roles>
  <role_overrides>
  </role_overrides>
  <role_assignments>
  </role_assignments>
</roles>"""
        self.entries[f"{d}/filters.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<filters>
  <filter_actives>
  </filter_actives>
  <filter_configs>
  </filter_configs>
</filters>"""
        self.entries[f"{d}/calendar.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<events>
</events>"""
        self.entries[f"{d}/grade_history.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<grade_history>
  <grade_grades>
  </grade_grades>
</grade_history>"""

    def grades_xml(self, it, grademax, gradepass, sortorder):
        if grademax is None:
            return """<?xml version="1.0" encoding="UTF-8"?>
<activity_gradebook>
  <grade_items>
  </grade_items>
  <grade_letters>
  </grade_letters>
</activity_gradebook>"""
        it.grade_item_id = self.nid()
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<activity_gradebook>
  <grade_items>
    <grade_item id="{it.grade_item_id}">
      <categoryid>{self.cat_id}</categoryid>
      <itemname>{x(it.name)}</itemname>
      <itemtype>mod</itemtype>
      <itemmodule>{it.modname}</itemmodule>
      <iteminstance>{it.instanceid}</iteminstance>
      <itemnumber>0</itemnumber>
      <iteminfo>{NULL}</iteminfo>
      <idnumber></idnumber>
      <calculation>{NULL}</calculation>
      <gradetype>1</gradetype>
      <grademax>{grademax:.5f}</grademax>
      <grademin>0.00000</grademin>
      <scaleid>{NULL}</scaleid>
      <outcomeid>{NULL}</outcomeid>
      <gradepass>{gradepass:.5f}</gradepass>
      <multfactor>1.00000</multfactor>
      <plusfactor>0.00000</plusfactor>
      <aggregationcoef>0.00000</aggregationcoef>
      <aggregationcoef2>0.00000</aggregationcoef2>
      <weightoverride>0</weightoverride>
      <sortorder>{sortorder}</sortorder>
      <display>0</display>
      <decimals>{NULL}</decimals>
      <hidden>0</hidden>
      <locked>0</locked>
      <locktime>0</locktime>
      <needsupdate>0</needsupdate>
      <timecreated>{self.now}</timecreated>
      <timemodified>{self.now}</timemodified>
      <grade_grades>
      </grade_grades>
    </grade_item>
  </grade_items>
  <grade_letters>
  </grade_letters>
</activity_gradebook>"""

    def inforef_xml(self, files, grade_item_id=None):
        out = ['<?xml version="1.0" encoding="UTF-8"?>', "<inforef>"]
        if grade_item_id:
            out += ["  <grade_itemref>", "    <grade_item>", f"      <id>{grade_item_id}</id>",
                    "    </grade_item>", "  </grade_itemref>"]
        if files:
            out.append("  <fileref>")
            for f in files:
                out += ["    <file>", f"      <id>{f.id}</id>", "    </file>"]
            out.append("  </fileref>")
        out.append("</inforef>")
        return "\n".join(out)

    # ----- activities
    def write_item(self, it: Item, sortorder):
        d = f"activities/{it.modname}_{it.cmid}"
        self.entries[f"{d}/module.xml"] = self.module_xml(it)
        self.empties(d)
        files = []
        for local, fname in it.files:
            files.append(self.add_file(local, f"mod_{it.modname}", "intro", 0, it.contextid, fname))
        grademax = gradepass = None
        if isinstance(it, Label):
            body = f"""<?xml version="1.0" encoding="UTF-8"?>
<activity id="{it.instanceid}" moduleid="{it.cmid}" modulename="label" contextid="{it.contextid}">
  <label id="{it.instanceid}">
    <name>{x(it.name)}</name>
    <intro>{x(it.intro)}</intro>
    <introformat>1</introformat>
    <timemodified>{self.now}</timemodified>
  </label>
</activity>"""
            self.entries[f"{d}/label.xml"] = body
        elif isinstance(it, Page):
            for local, fname in it.content_files:
                files.append(self.add_file(local, "mod_page", "content", 0, it.contextid, fname))
            body = f"""<?xml version="1.0" encoding="UTF-8"?>
<activity id="{it.instanceid}" moduleid="{it.cmid}" modulename="page" contextid="{it.contextid}">
  <page id="{it.instanceid}">
    <name>{x(it.name)}</name>
    <intro>{x(it.intro)}</intro>
    <introformat>1</introformat>
    <content>{x(it.content)}</content>
    <contentformat>1</contentformat>
    <legacyfiles>0</legacyfiles>
    <legacyfileslast>{NULL}</legacyfileslast>
    <display>5</display>
    <displayoptions>a:3:{{s:12:"printheading";s:1:"1";s:10:"printintro";s:1:"0";s:17:"printlastmodified";s:1:"0";}}</displayoptions>
    <revision>1</revision>
    <timemodified>{self.now}</timemodified>
  </page>
</activity>"""
            self.entries[f"{d}/page.xml"] = body
        elif isinstance(it, Url):
            body = f"""<?xml version="1.0" encoding="UTF-8"?>
<activity id="{it.instanceid}" moduleid="{it.cmid}" modulename="url" contextid="{it.contextid}">
  <url id="{it.instanceid}">
    <name>{x(it.name)}</name>
    <intro>{x(it.intro)}</intro>
    <introformat>1</introformat>
    <externalurl>{x(it.externalurl)}</externalurl>
    <display>{it.display}</display>
    <displayoptions>a:1:{{s:10:"printintro";i:1;}}</displayoptions>
    <parameters>a:0:{{}}</parameters>
    <timemodified>{self.now}</timemodified>
  </url>
</activity>"""
            self.entries[f"{d}/url.xml"] = body
        elif isinstance(it, SubSection):
            body = f"""<?xml version="1.0" encoding="UTF-8"?>
<activity id="{it.instanceid}" moduleid="{it.cmid}" modulename="subsection" contextid="{it.contextid}">
  <subsection id="{it.instanceid}">
    <name>{x(it.name)}</name>
    <timemodified>0</timemodified>
  </subsection>
</activity>"""
            self.entries[f"{d}/subsection.xml"] = body
        elif isinstance(it, Feedback):
            items_xml = []
            for pos, (label, options) in enumerate(it.questions, 1):
                pres = "r>>>>>" + "\n|".join(options)
                items_xml.append(f"""      <item id="{self.nid()}">
        <template>0</template>
        <name>{x(label)}</name>
        <label></label>
        <presentation>{x(pres)}</presentation>
        <typ>multichoice</typ>
        <hasvalue>1</hasvalue>
        <position>{pos}</position>
        <required>0</required>
        <dependitem>0</dependitem>
        <dependvalue></dependvalue>
        <options>h</options>
      </item>""")
            body = f"""<?xml version="1.0" encoding="UTF-8"?>
<activity id="{it.instanceid}" moduleid="{it.cmid}" modulename="feedback" contextid="{it.contextid}">
  <feedback id="{it.instanceid}">
    <name>{x(it.name)}</name>
    <intro>{x(it.intro)}</intro>
    <introformat>1</introformat>
    <anonymous>1</anonymous>
    <email_notification>0</email_notification>
    <multiple_submit>0</multiple_submit>
    <autonumbering>1</autonumbering>
    <site_after_submit></site_after_submit>
    <page_after_submit>{x(it.after_text)}</page_after_submit>
    <page_after_submitformat>1</page_after_submitformat>
    <publish_stats>0</publish_stats>
    <timeopen>0</timeopen>
    <timeclose>0</timeclose>
    <timemodified>{self.now}</timemodified>
    <completionsubmit>1</completionsubmit>
    <items>
{chr(10).join(items_xml)}
    </items>
    <completeds>
    </completeds>
  </feedback>
</activity>"""
            self.entries[f"{d}/feedback.xml"] = body
        elif isinstance(it, HvpItem):
            h = it.hvp
            for local, h5ppath in h.files:
                fp, fn = os.path.split(h5ppath)
                files.append(self.add_file(local, "mod_hvp", "content", it.instanceid, it.contextid,
                                           fn, "/" + fp + "/"))
            mn, ver = h.library.split(" ")
            major, minor = ver.split(".")
            grademax, gradepass = h.grademax, h.gradepass
            body = f"""<?xml version="1.0" encoding="UTF-8"?>
<activity id="{it.instanceid}" moduleid="{it.cmid}" modulename="hvp" contextid="{it.contextid}">
  <hvp id="{it.instanceid}">
    <name>{x(it.name)}</name>
    <machine_name>{mn}</machine_name>
    <major_version>{major}</major_version>
    <minor_version>{minor}</minor_version>
    <intro>{x(it.intro)}</intro>
    <introformat>1</introformat>
    <json_content>{x(h.json_content())}</json_content>
    <embed_type>div</embed_type>
    <disable>14</disable>
    <content_type>{NULL}</content_type>
    <source>{NULL}</source>
    <year_from>{NULL}</year_from>
    <year_to>{NULL}</year_to>
    <license_version>{NULL}</license_version>
    <changes>[]</changes>
    <license_extras>{NULL}</license_extras>
    <author_comments>{NULL}</author_comments>
    <slug></slug>
    <timecreated>{self.now}</timecreated>
    <timemodified>{self.now}</timemodified>
    <authors>[]</authors>
    <license>U</license>
    <completionpass>{1 if h.completion == 'pass' else 0}</completionpass>
    <content_user_data>
    </content_user_data>
  </hvp>
</activity>"""
            self.entries[f"{d}/hvp.xml"] = body
        self.entries[f"{d}/grades.xml"] = self.grades_xml(it, grademax, gradepass, sortorder)
        self.entries[f"{d}/inforef.xml"] = self.inforef_xml(files, it.grade_item_id)
        return d

    # ----- sections
    def write_section(self, s: Section):
        d = f"sections/section_{s.id}"
        seq = ",".join(str(it.cmid) for it in s.items)
        comp = "mod_subsection" if s.parentcmid else NULL
        itemid = s.sub.instanceid if s.parentcmid else NULL
        name = x(s.name) if s.name is not None else NULL
        self.entries[f"{d}/section.xml"] = f"""<?xml version="1.0" encoding="UTF-8"?>
<section id="{s.id}">
  <number>{s.number}</number>
  <name>{name}</name>
  <summary>{x(s.summary)}</summary>
  <summaryformat>1</summaryformat>
  <sequence>{seq}</sequence>
  <visible>{x(s.visible)}</visible>
  <availabilityjson>{x(availability_json(s.available_from))}</availabilityjson>
  <component>{comp}</component>
  <itemid>{itemid}</itemid>
  <timemodified>{self.now}</timemodified>
</section>"""
        self.entries[f"{d}/inforef.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<inforef>
</inforef>"""
        return d

    # ----- course
    def write_course(self, course_files):
        c = self.c
        self.entries["course/course.xml"] = f"""<?xml version="1.0" encoding="UTF-8"?>
<course id="{self.course_id}" contextid="{self.course_ctx}">
  <shortname>{x(c.shortname)}</shortname>
  <fullname>{x(c.fullname)}</fullname>
  <idnumber></idnumber>
  <summary>{x(c.summary)}</summary>
  <summaryformat>1</summaryformat>
  <format>topics</format>
  <showgrades>1</showgrades>
  <newsitems>0</newsitems>
  <startdate>{c.startdate}</startdate>
  <enddate>0</enddate>
  <marker>0</marker>
  <maxbytes>524288000</maxbytes>
  <legacyfiles>0</legacyfiles>
  <showreports>0</showreports>
  <visible>1</visible>
  <groupmode>0</groupmode>
  <groupmodeforce>0</groupmodeforce>
  <defaultgroupingid>0</defaultgroupingid>
  <lang></lang>
  <theme></theme>
  <timecreated>{self.now}</timecreated>
  <timemodified>{self.now}</timemodified>
  <requested>0</requested>
  <showactivitydates>0</showactivitydates>
  <showcompletionconditions>1</showcompletionconditions>
  <pdfexportfont>{NULL}</pdfexportfont>
  <enablecompletion>1</enablecompletion>
  <completionnotify>0</completionnotify>
  <enableaitools>{NULL}</enableaitools>
  <plugin_local_mbslicenseinfo_course>
    <metainfos>
    </metainfos>
  </plugin_local_mbslicenseinfo_course>
  <category id="{CATEGORY_ID}">
    <name>{x(CATEGORY_NAME)}</name>
    <description></description>
  </category>
  <tags>
  </tags>
  <customfields>
{self.customfields_xml()}
  </customfields>
  <courseformatoptions>
    <courseformatoption>
      <format>topics</format>
      <sectionid>0</sectionid>
      <name>coursedisplay</name>
      <value>0</value>
    </courseformatoption>
    <courseformatoption>
      <format>topics</format>
      <sectionid>0</sectionid>
      <name>hiddensections</name>
      <value>1</value>
    </courseformatoption>
  </courseformatoptions>
</course>"""
        self.entries["course/inforef.xml"] = self.inforef_xml(course_files).replace(
            "<inforef>", "<inforef>\n  <roleref>\n    <role>\n      <id>5</id>\n    </role>\n  </roleref>", 1)
        self.entries["course/roles.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<roles>
  <role_overrides>
  </role_overrides>
  <role_assignments>
  </role_assignments>
</roles>"""
        self.entries["course/completiondefaults.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<course_completion_defaults>
</course_completion_defaults>"""
        self.entries["course/filters.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<filters>
  <filter_actives>
  </filter_actives>
  <filter_configs>
  </filter_configs>
</filters>"""
        self.entries["course/contentbank.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<contents>
</contents>"""
        self.entries["course/calendar.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<events>
</events>"""
        self.entries["course/enrolments.xml"] = f"""<?xml version="1.0" encoding="UTF-8"?>
<enrolments>
  <enrols>
    <enrol id="{self.nid()}">
      <enrol>manual</enrol>
      <status>0</status>
      <name>{NULL}</name>
      <enrolperiod>0</enrolperiod>
      <enrolstartdate>0</enrolstartdate>
      <enrolenddate>0</enrolenddate>
      <expirynotify>0</expirynotify>
      <expirythreshold>86400</expirythreshold>
      <notifyall>0</notifyall>
      <password>{NULL}</password>
      <cost>{NULL}</cost>
      <currency>{NULL}</currency>
      <roleid>5</roleid>
      <customint1>0</customint1>
      <customint2>{NULL}</customint2>
      <customint3>{NULL}</customint3>
      <customint4>{NULL}</customint4>
      <customint5>{NULL}</customint5>
      <customint6>{NULL}</customint6>
      <customint7>{NULL}</customint7>
      <customint8>{NULL}</customint8>
      <customchar1>{NULL}</customchar1>
      <customchar2>{NULL}</customchar2>
      <customchar3>{NULL}</customchar3>
      <customdec1>{NULL}</customdec1>
      <customdec2>{NULL}</customdec2>
      <customtext1>{NULL}</customtext1>
      <customtext2>{NULL}</customtext2>
      <customtext3>{NULL}</customtext3>
      <customtext4>{NULL}</customtext4>
      <timecreated>{self.now}</timecreated>
      <timemodified>{self.now}</timemodified>
      <user_enrolments>
      </user_enrolments>
    </enrol>
  </enrols>
</enrolments>"""

    def customfields_xml(self):
        out = []
        for cid, shortname, ctype, value in CUSTOMFIELDS:
            out.append(f"""    <customfield id="{cid}">
      <shortname>{x(shortname)}</shortname>
      <type>{ctype}</type>
      <value>{x(value)}</value>
      <valueformat>0</valueformat>
      <valuetrust></valuetrust>
    </customfield>""")
        return "\n".join(out)

    def write_top(self):
        self.entries["roles.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<roles_definition>
  <role id="5">
    <name>Schüler</name>
    <shortname>student</shortname>
    <nameincourse>$@NULL@$</nameincourse>
    <description>&lt;p&gt;Students generally have fewer privileges within a course.&lt;/p&gt;</description>
    <sortorder>11</sortorder>
    <archetype>student</archetype>
  </role>
</roles_definition>"""
        self.entries["scales.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<scales_definition>\n</scales_definition>'
        self.entries["outcomes.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<outcomes_definition>\n</outcomes_definition>'
        self.entries["questions.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<question_categories>\n</question_categories>'
        self.entries["groups.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<groups>
  <groupcustomfields>
  </groupcustomfields>
  <groupings>
    <groupingcustomfields>
    </groupingcustomfields>
  </groupings>
</groups>"""
        self.entries["grade_history.xml"] = """<?xml version="1.0" encoding="UTF-8"?>
<grade_history>
  <grade_grades>
  </grade_grades>
</grade_history>"""
        self.entries["completion.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<course_completion>\n</course_completion>'
        self.entries["moodle_backup.log"] = ""
        self.entries["gradebook.xml"] = f"""<?xml version="1.0" encoding="UTF-8"?>
<gradebook>
  <attributes>
  </attributes>
  <grade_categories>
    <grade_category id="{self.cat_id}">
      <parent>{NULL}</parent>
      <depth>1</depth>
      <path>/{self.cat_id}/</path>
      <fullname>?</fullname>
      <aggregation>11</aggregation>
      <keephigh>0</keephigh>
      <droplow>0</droplow>
      <aggregateonlygraded>1</aggregateonlygraded>
      <aggregateoutcomes>0</aggregateoutcomes>
      <timecreated>{self.now}</timecreated>
      <timemodified>{self.now}</timemodified>
      <hidden>0</hidden>
    </grade_category>
  </grade_categories>
  <grade_items>
    <grade_item id="{self.nid()}">
      <categoryid>{NULL}</categoryid>
      <itemname>{NULL}</itemname>
      <itemtype>course</itemtype>
      <itemmodule>{NULL}</itemmodule>
      <iteminstance>{self.cat_id}</iteminstance>
      <itemnumber>{NULL}</itemnumber>
      <iteminfo>{NULL}</iteminfo>
      <idnumber>{NULL}</idnumber>
      <calculation>{NULL}</calculation>
      <gradetype>1</gradetype>
      <grademax>100.00000</grademax>
      <grademin>0.00000</grademin>
      <scaleid>{NULL}</scaleid>
      <outcomeid>{NULL}</outcomeid>
      <gradepass>0.00000</gradepass>
      <multfactor>1.00000</multfactor>
      <plusfactor>0.00000</plusfactor>
      <aggregationcoef>0.00000</aggregationcoef>
      <aggregationcoef2>0.00000</aggregationcoef2>
      <weightoverride>0</weightoverride>
      <sortorder>1</sortorder>
      <display>0</display>
      <decimals>{NULL}</decimals>
      <hidden>0</hidden>
      <locked>0</locked>
      <locktime>0</locktime>
      <needsupdate>0</needsupdate>
      <timecreated>{self.now}</timecreated>
      <timemodified>{self.now}</timemodified>
      <grade_grades>
      </grade_grades>
    </grade_item>
  </grade_items>
  <grade_letters>
  </grade_letters>
  <grade_settings>
    <grade_setting id="">
      <name>minmaxtouse</name>
      <value>1</value>
    </grade_setting>
  </grade_settings>
</gradebook>"""

    def write_badges(self):
        out = ['<?xml version="1.0" encoding="UTF-8"?>', "<badges>"]
        badge_files = []
        for b in self.c.badges:
            bid = self.nid()
            f = self.add_file(b.image_path, "badges", "badgeimage", bid, self.course_ctx, "f1.png")
            badge_files.append(f)
            crit = [f"""      <criterion id="{self.nid()}">
        <badgeid>{bid}</badgeid>
        <criteriatype>0</criteriatype>
        <method>1</method>
        <description></description>
        <descriptionformat>0</descriptionformat>
        <params>
        </params>
      </criterion>"""]
            params = "\n".join(f"""          <param id="{self.nid()}">
            <name>module_{it.cmid}</name>
            <value>{it.cmid}</value>
          </param>""" for it in b.criteria_items)
            crit.append(f"""      <criterion id="{self.nid()}">
        <badgeid>{bid}</badgeid>
        <criteriatype>1</criteriatype>
        <method>1</method>
        <description></description>
        <descriptionformat>0</descriptionformat>
        <params>
{params}
        </params>
      </criterion>""")
            out.append(f"""  <badge id="{bid}">
    <name>{x(b.name)}</name>
    <description>{x(b.description)}</description>
    <timecreated>{self.now}</timecreated>
    <timemodified>{self.now}</timemodified>
    <usercreated>{NULL}</usercreated>
    <usermodified>{NULL}</usermodified>
    <issuername>{x(self.c.fullname)}</issuername>
    <issuerurl>{WWWROOT}</issuerurl>
    <issuercontact>{NULL}</issuercontact>
    <expiredate>{NULL}</expiredate>
    <expireperiod>{NULL}</expireperiod>
    <type>2</type>
    <courseid>{self.course_id}</courseid>
    <message>{x(b.message)}</message>
    <messagesubject>{x(b.message_subject)}</messagesubject>
    <attachment>1</attachment>
    <notification>0</notification>
    <status>0</status>
    <nextcron>{NULL}</nextcron>
    <version></version>
    <language>de</language>
    <imageauthorname></imageauthorname>
    <imageauthoremail></imageauthoremail>
    <imageauthorurl></imageauthorurl>
    <imagecaption></imagecaption>
    <criteria>
{chr(10).join(crit)}
    </criteria>
    <endorsement>
    </endorsement>
    <alignments>
    </alignments>
    <relatedbadges>
    </relatedbadges>
    <manual_awards>
    </manual_awards>
    <issued>
    </issued>
    <tags>
    </tags>
  </badge>""")
        out.append("</badges>")
        self.entries["badges.xml"] = "\n".join(out)
        return badge_files

    def write_backup_xml(self, act_dirs, sec_dirs, filename):
        acts = []
        for it, d in act_dirs:
            insub = "1" if it.section.parentcmid else ""
            acts.append(f"""        <activity>
          <moduleid>{it.cmid}</moduleid>
          <sectionid>{it.section.id}</sectionid>
          <modulename>{it.modname}</modulename>
          <title>{x(it.name)}</title>
          <directory>{d}</directory>
          <insubsection>{insub}</insubsection>
        </activity>""")
        secs = []
        for s, d in sec_dirs:
            title = s.name if (s.parentcmid or (s.name and s.name != NULL)) else str(s.number)
            secs.append(f"""        <section>
          <sectionid>{s.id}</sectionid>
          <title>{x(title)}</title>
          <directory>{d}</directory>
          <parentcmid>{s.parentcmid or ''}</parentcmid>
          <modname>{'subsection' if s.parentcmid else ''}</modname>
        </section>""")
        root_settings = [("filename", filename), ("users", 0), ("anonymize", 0), ("role_assignments", 0),
                         ("activities", 1), ("blocks", 1), ("files", 1), ("filters", 1), ("comments", 0),
                         ("badges", 1), ("calendarevents", 1), ("userscompletion", 0), ("logs", 0),
                         ("grade_histories", 0), ("groups", 1), ("competencies", 0), ("customfield", 1),
                         ("contentbankcontent", 1), ("xapistate", 0), ("legacyfiles", 1)]
        settings = [f"""      <setting>
        <level>root</level>
        <name>{n}</name>
        <value>{x(v)}</value>
      </setting>""" for n, v in root_settings]
        for s, d in sec_dirs:
            sid = f"section_{s.id}"
            for suffix, val in (("included", 1), ("userinfo", 0)):
                settings.append(f"""      <setting>
        <level>section</level>
        <section>{sid}</section>
        <name>{sid}_{suffix}</name>
        <value>{val}</value>
      </setting>""")
            for it, ad in act_dirs:
                if it.section is s:
                    aid = f"{it.modname}_{it.cmid}"
                    for suffix, val in (("included", 1), ("userinfo", 0)):
                        settings.append(f"""      <setting>
        <level>activity</level>
        <activity>{aid}</activity>
        <name>{aid}_{suffix}</name>
        <value>{val}</value>
      </setting>""")
        self.entries["moodle_backup.xml"] = f"""<?xml version="1.0" encoding="UTF-8"?>
<moodle_backup>
  <information>
    <name>{x(filename)}</name>
    <moodle_version>{MOODLE_VERSION}</moodle_version>
    <moodle_release>{MOODLE_RELEASE}</moodle_release>
    <backup_version>{BACKUP_VERSION}</backup_version>
    <backup_release>{BACKUP_RELEASE}</backup_release>
    <backup_date>{self.now}</backup_date>
    <mnet_remoteusers>0</mnet_remoteusers>
    <include_files>1</include_files>
    <include_file_references_to_external_content>0</include_file_references_to_external_content>
    <original_wwwroot>{WWWROOT}</original_wwwroot>
    <original_site_identifier_hash>{SITE_HASH}</original_site_identifier_hash>
    <original_course_id>{self.course_id}</original_course_id>
    <original_course_format>topics</original_course_format>
    <original_course_fullname>{x(self.c.fullname)}</original_course_fullname>
    <original_course_shortname>{x(self.c.shortname)}</original_course_shortname>
    <original_course_startdate>{self.c.startdate}</original_course_startdate>
    <original_course_enddate>0</original_course_enddate>
    <original_course_contextid>{self.course_ctx}</original_course_contextid>
    <original_system_contextid>1</original_system_contextid>
    <details>
      <detail backup_id="{hashlib.md5(filename.encode()).hexdigest()}">
        <type>course</type>
        <format>moodle2</format>
        <interactive>1</interactive>
        <mode>70</mode>
        <execution>2</execution>
        <executiontime>0</executiontime>
      </detail>
    </details>
    <contents>
      <activities>
{chr(10).join(acts)}
      </activities>
      <sections>
{chr(10).join(secs)}
      </sections>
      <course>
        <courseid>{self.course_id}</courseid>
        <title>{x(self.c.shortname)}</title>
        <directory>course</directory>
      </course>
    </contents>
    <settings>
{chr(10).join(settings)}
    </settings>
  </information>
</moodle_backup>"""

    # ----- main
    def build(self):
        filename = os.path.basename(self.out)
        self.assign()
        act_dirs, sec_dirs = [], []
        sort = 2
        for it in self.all_items:
            act_dirs.append((it, self.write_item(it, sort)))
            sort += 1
        for s in self.all_sections:
            sec_dirs.append((s, self.write_section(s)))
        course_files = []
        if self.c.image_path:
            course_files.append(self.add_file(self.c.image_path, "course", "overviewfiles", 0,
                                              self.course_ctx, os.path.basename(self.c.image_path)))
        course_files += self.write_badges()
        self.write_course(course_files)
        self.write_top()
        self.entries["files.xml"] = self.files_xml()
        self.write_backup_xml(act_dirs, sec_dirs, filename)
        # archive index + tar.gz
        paths = sorted(self.entries)
        dirs = sorted({os.path.dirname(p) + "/" for p in paths if os.path.dirname(p)})
        # include parent dirs
        alld = set()
        for d in dirs:
            parts = d.strip("/").split("/")
            for i in range(1, len(parts) + 1):
                alld.add("/".join(parts[:i]) + "/")
        index = [f"Moodle archive file index. Count: {len(paths) + len(alld)}"]
        for d in sorted(alld):
            index.append(f"{d}\td\t0\t?")
        for p in paths:
            data = self.entries[p]
            size = len(data if isinstance(data, bytes) else data.encode("utf-8"))
            index.append(f"{p}\tf\t{size}\t{self.now}")
        self.entries[".ARCHIVE_INDEX"] = "\n".join(index) + "\n"
        with tarfile.open(self.out, "w:gz") as tar:
            for p in [".ARCHIVE_INDEX"] + paths:
                data = self.entries[p]
                if isinstance(data, str):
                    data = data.encode("utf-8")
                ti = tarfile.TarInfo(p)
                ti.size = len(data)
                ti.mtime = self.now
                ti.mode = 0o644
                tar.addfile(ti, io.BytesIO(data))
        return self.out
