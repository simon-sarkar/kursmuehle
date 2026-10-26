# Fremdbestandteile unter `web/vendor/`

| Datei | Herkunft | Lizenz |
|---|---|---|
| `pyodide/pyodide.js`, `pyodide.asm.js`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` | Pyodide 0.27.8 (Python 3.12.7), `pyodide-core-0.27.8.tar.bz2` von github.com/pyodide/pyodide/releases | Mozilla Public License 2.0; Python unter der PSF-Lizenz |
| `pyodide/pyyaml-6.0.2-cp312-cp312-pyodide_2024_0_wasm32.whl` | aus `pyodide-0.27.8.tar.bz2` (gleiche Veröffentlichung), Prüfsumme wie in `pyodide-lock.json` | MIT |
| `pyodide/tzdata-2024.1-py2.py3-none-any.whl` | aus `pyodide-0.27.8.tar.bz2` | Apache License 2.0; die Zeitzonendaten der IANA sind gemeinfrei |
| `pyodide/pypdf-6.21.2-py3-none-any.whl` | pypdf 6.21.2 von pypi.org (reines Python, ohne Abhängigkeiten), SHA-256 `1d44d1a3a200f25062adff0085b02040e4646431ac2ccac22e42679e91466084`; liest PDF für eigenes Material (AP13.13), der Worker lädt es erst beim ersten PDF, `gen/material.py` nimmt es auf der Kommandozeile über `sys.path` | BSD-3-Clause |
| `schriften/<name>.woff2`, `<name>.json`, `OFL-<name>.txt` | Titelschriften der Designs (AP13.5e): Lexend, Kalam, Outfit, Source Serif 4, Alegreya, Bebas Neue, Sora von Google Fonts, beschnitten auf Latin (`tools/schriften/hole.py`); die JSON-Datei hält die Zeichenbreiten für den Umbruch im Banner | SIL Open Font License 1.1, Namen ohne reservierten Namen (Lexend reserviert „RevReading Lexend“) |

Die Version ist gepinnt; ein Wechsel geschieht nur gemeinsam mit einem Lauf des CI-Vergleichs (Pyodide-Bau byteidentisch
zum CPython-Bau). Die Dateien werden von der eigenen Adresse geladen, nicht von einem CDN.
