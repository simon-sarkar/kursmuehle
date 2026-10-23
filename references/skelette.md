# Anhang B – Skelette und leere Standarddateien (Stand 22.10.2026)

### `moodle_backup.xml` – Kopf (vor `<contents>`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<moodle_backup>
  <information>
    <name>kurs.mbz</name>
    <moodle_version>2026042004</moodle_version>
    <moodle_release>5.2.4 (Build: 20261005)</moodle_release>
    <backup_version>2026042000</backup_version>
    <backup_release>5.2</backup_release>
    <backup_date>1792683546</backup_date>
    <mnet_remoteusers>0</mnet_remoteusers>
    <include_files>1</include_files>
    <include_file_references_to_external_content>0</include_file_references_to_external_content>
    <original_wwwroot>https://lernplattform.bycs.de</original_wwwroot>
    <original_site_identifier_hash>6aa9a12f353641854c7eaa8a0fcd932f</original_site_identifier_hash>
    <original_course_id>1000000</original_course_id>
    <original_course_format>topics</original_course_format>
    <original_course_fullname>Kursname</original_course_fullname>
    <original_course_shortname>Kurzname</original_course_shortname>
    <original_course_startdate>1792683546</original_course_startdate>
    <original_course_enddate>0</original_course_enddate>
    <original_course_contextid>1000001</original_course_contextid>
    <original_system_contextid>1</original_system_contextid>
    <details>
      <detail backup_id="<md5-beliebig>">
        <type>course</type>
        <format>moodle2</format>
        <interactive>1</interactive>
        <mode>70</mode>
        <execution>2</execution>
        <executiontime>0</executiontime>
      </detail>
    </details>
```

### `moodle_backup.xml` – root-Settings (nach `</contents>`; danach die Abschnitts- und Aktivitäts-Settings)

```xml
<settings>
      <setting>
        <level>root</level>
        <name>filename</name>
        <value>alltagskompetenz_kurs_20261022-1739.mbz</value>
      </setting>
      <setting>
        <level>root</level>
        <name>users</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>anonymize</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>role_assignments</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>activities</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>blocks</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>files</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>filters</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>comments</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>badges</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>calendarevents</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>userscompletion</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>logs</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>grade_histories</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>groups</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>competencies</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>customfield</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>contentbankcontent</name>
        <value>1</value>
      </setting>
      <setting>
        <level>root</level>
        <name>xapistate</name>
        <value>0</value>
      </setting>
      <setting>
        <level>root</level>
        <name>legacyfiles</name>
        <value>1</value>
      </setting>
    </settings>
```

### `course/course.xml` – Skelett

```xml
<?xml version="1.0" encoding="UTF-8"?>
<course id="1000000" contextid="1000001">
  <shortname>Kurzname</shortname>
  <fullname>Kursname</fullname>
  <idnumber></idnumber>
  <summary>&lt;p&gt;Kursbeschreibung&lt;/p&gt;</summary>
  <summaryformat>1</summaryformat>
  <format>topics</format>
  <showgrades>1</showgrades>
  <newsitems>0</newsitems>
  <startdate>1792683546</startdate>
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
  <timecreated>1792683546</timecreated>
  <timemodified>1792683546</timemodified>
  <requested>0</requested>
  <showactivitydates>0</showactivitydates>
  <showcompletionconditions>1</showcompletionconditions>
  <pdfexportfont>$@NULL@$</pdfexportfont>
  <enablecompletion>1</enablecompletion>
  <completionnotify>0</completionnotify>
  <enableaitools>$@NULL@$</enableaitools>
  <plugin_local_mbslicenseinfo_course>
    <metainfos>
    </metainfos>
  </plugin_local_mbslicenseinfo_course>
  <category id="1">
    <name>Kategorie</name>
    <description></description>
  </category>
  <tags>
  </tags>
  <customfields>
    <customfield id="4142081">
      <shortname>schule</shortname>
      <type>text</type>
      <value></value>
      <valueformat>0</valueformat>
      <valuetrust></valuetrust>
    </customfield>
    <customfield id="4142084">
      <shortname>participants</shortname>
      <type>checkbox</type>
      <value>0</value>
      <valueformat>0</valueformat>
      <valuetrust></valuetrust>
    </customfield>
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
</course>
```

### `roles.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<roles_definition>
  <role id="5">
    <name>Schüler</name>
    <shortname>student</shortname>
    <nameincourse>$@NULL@$</nameincourse>
    <description>&lt;p&gt;Students generally have fewer privileges within a course.&lt;/p&gt;</description>
    <sortorder>11</sortorder>
    <archetype>student</archetype>
  </role>
</roles_definition>
```

### `scales.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<scales_definition>
</scales_definition>
```

### `outcomes.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<outcomes_definition>
</outcomes_definition>
```

### `questions.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<question_categories>
</question_categories>
```

### `groups.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<groups>
  <groupcustomfields>
  </groupcustomfields>
  <groupings>
    <groupingcustomfields>
    </groupingcustomfields>
  </groupings>
</groups>
```

### `grade_history.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<grade_history>
  <grade_grades>
  </grade_grades>
</grade_history>
```

### `completion.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<course_completion>
</course_completion>
```

### `course/roles.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<roles>
  <role_overrides>
  </role_overrides>
  <role_assignments>
  </role_assignments>
</roles>
```

### `course/filters.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<filters>
  <filter_actives>
  </filter_actives>
  <filter_configs>
  </filter_configs>
</filters>
```

### `course/calendar.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<events>
</events>
```

### `course/contentbank.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<contents>
</contents>
```

### `course/completiondefaults.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<course_completion_defaults>
</course_completion_defaults>
```

### `course/enrolments.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<enrolments>
  <enrols>
    <enrol id="900159">
      <enrol>manual</enrol>
      <status>0</status>
      <name>$@NULL@$</name>
      <enrolperiod>0</enrolperiod>
      <enrolstartdate>0</enrolstartdate>
      <enrolenddate>0</enrolenddate>
      <expirynotify>0</expirynotify>
      <expirythreshold>86400</expirythreshold>
      <notifyall>0</notifyall>
      <password>$@NULL@$</password>
      <cost>$@NULL@$</cost>
      <currency>$@NULL@$</currency>
      <roleid>5</roleid>
      <customint1>0</customint1>
      <customint2>$@NULL@$</customint2>
      <customint3>$@NULL@$</customint3>
      <customint4>$@NULL@$</customint4>
      <customint5>$@NULL@$</customint5>
      <customint6>$@NULL@$</customint6>
      <customint7>$@NULL@$</customint7>
      <customint8>$@NULL@$</customint8>
      <customchar1>$@NULL@$</customchar1>
      <customchar2>$@NULL@$</customchar2>
      <customchar3>$@NULL@$</customchar3>
      <customdec1>$@NULL@$</customdec1>
      <customdec2>$@NULL@$</customdec2>
      <customtext1>$@NULL@$</customtext1>
      <customtext2>$@NULL@$</customtext2>
      <customtext3>$@NULL@$</customtext3>
      <customtext4>$@NULL@$</customtext4>
      <timecreated>1792683546</timecreated>
      <timemodified>1792683546</timemodified>
      <user_enrolments>
      </user_enrolments>
    </enrol>
  </enrols>
</enrolments>
```

### `course/inforef.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<inforef>
  <roleref>
    <role>
      <id>5</id>
    </role>
  </roleref>
  <fileref>
    <file>
      <id>900153</id>
    </file>
    <file>
      <id>900155</id>
    </file>
  </fileref>
</inforef>
```

### `gradebook.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gradebook>
  <attributes>
  </attributes>
  <grade_categories>
    <grade_category id="2884508">
      <parent>$@NULL@$</parent>
      <depth>1</depth>
      <path>/2884508/</path>
      <fullname>?</fullname>
      <aggregation>11</aggregation>
      <keephigh>0</keephigh>
      <droplow>0</droplow>
      <aggregateonlygraded>1</aggregateonlygraded>
      <aggregateoutcomes>0</aggregateoutcomes>
      <timecreated>1792683546</timecreated>
      <timemodified>1792683546</timemodified>
      <hidden>0</hidden>
    </grade_category>
  </grade_categories>
  <grade_items>
    <grade_item id="900160">
      <categoryid>$@NULL@$</categoryid>
      <itemname>$@NULL@$</itemname>
      <itemtype>course</itemtype>
      <itemmodule>$@NULL@$</itemmodule>
      <iteminstance>2884508</iteminstance>
      <itemnumber>$@NULL@$</itemnumber>
      <iteminfo>$@NULL@$</iteminfo>
      <idnumber>$@NULL@$</idnumber>
      <calculation>$@NULL@$</calculation>
      <gradetype>1</gradetype>
      <grademax>100.00000</grademax>
      <grademin>0.00000</grademin>
      <scaleid>$@NULL@$</scaleid>
      <outcomeid>$@NULL@$</outcomeid>
      <gradepass>0.00000</gradepass>
      <multfactor>1.00000</multfactor>
      <plusfactor>0.00000</plusfactor>
      <aggregationcoef>0.00000</aggregationcoef>
      <aggregationcoef2>0.00000</aggregationcoef2>
      <weightoverride>0</weightoverride>
      <sortorder>1</sortorder>
      <display>0</display>
      <decimals>$@NULL@$</decimals>
      <hidden>0</hidden>
      <locked>0</locked>
      <locktime>0</locktime>
      <needsupdate>0</needsupdate>
      <timecreated>1792683546</timecreated>
      <timemodified>1792683546</timemodified>
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
</gradebook>
```

### Je Aktivität: `roles.xml`, `filters.xml`, `calendar.xml`, `grade_history.xml`

Identisch mit den gleichnamigen Dateien oben (`roles` = leere `role_overrides`/`role_assignments`, `calendar` = `<events>`, `grade_history` = leere `grade_grades`). `grades.xml` ohne Bewertung:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<activity_gradebook>
  <grade_items>
  </grade_items>
  <grade_letters>
  </grade_letters>
</activity_gradebook>
```

`gradebook.xml` oben enthält die Kurs-Bewertungskategorie (ID 2884508 im Beispiel) – diese ID ist die `categoryid` in den `grades.xml` bewerteter Aktivitäten.
