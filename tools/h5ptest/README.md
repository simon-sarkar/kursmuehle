# H5P-Render-Test

Prüft die H5P-Inhalte einer erzeugten `.mbz` außerhalb der Plattform: jede `hvp`-Aktivität wird mit
[h5p-standalone](https://github.com/tunapanda/h5p-standalone) in Chromium gerendert, Konsolenfehler, Überlappungen
und fehlende Bilder landen in einem Report, Screenshots je Aktivität daneben. So fallen falsche Parameter,
fehlende Bibliotheken oder abgeschnittene Drag-and-Drop-Beschriftungen auf, bevor die Lehrkraft importiert.

Voraussetzungen: Python 3.11+, Playwright (`pip install playwright && playwright install chromium`), Node/npm, git.
Arbeitsverzeichnis ist `tools/h5ptest/work/` (oder `H5PTEST=/pfad`).

```bash
cd tools/h5ptest && npm install                      # h5p-standalone
mkdir -p work && tar -xzf ../../out/kurs.mbz -C work/mbz   # .mbz ist tar.gz
python3 extract.py work/mbz work/content             # json_content + Bilder je Aktivität, meta.json mit Bibliotheken
python3 fetchlibs.py "H5P.QuestionSet 1.21" "H5P.InteractiveBook 1.15"   # Bibliotheken von GitHub, exakte major.minor (siehe scripts/gen/libs.py)
python3 buildpages.py                                # h5p.json + index.html je Aktivität nach work/web
python3 -m http.server 8765 -d work/web &            # statischer Server
python3 render.py                                    # Screenshots nach work/shots, Report work/report.json
```

`render.py` interagiert mit den Inhalten (Antworten anklicken, Branching-Pfad über `BS_PATH=1,0,2`), misst
Überlappungen von Drag-and-Drop-Elementen und bricht bei JavaScript-Fehlern mit Report ab. Umgebungsvariablen
`CONTENT`, `WEB`, `SHOTS`, `REPORT`, `PORT` überschreiben die Pfade.

Bibliotheken, deren Build fehlt (`npm run build` im Bibliotheksordner), baut `fetchlibs.py` selbst; Versionen ohne
passendes Tag oder Branch meldet es als `MISSING` – dann die Version in `scripts/gen/libs.py` prüfen.
