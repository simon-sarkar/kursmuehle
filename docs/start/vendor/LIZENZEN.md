# Fremdbestandteile unter `web/vendor/`

| Datei | Herkunft | Lizenz |
|---|---|---|
| `pyodide/pyodide.js`, `pyodide.asm.js`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` | Pyodide 0.27.8 (Python 3.12.7), `pyodide-core-0.27.8.tar.bz2` von github.com/pyodide/pyodide/releases | Mozilla Public License 2.0; Python unter der PSF-Lizenz |
| `pyodide/pyyaml-6.0.2-cp312-cp312-pyodide_2024_0_wasm32.whl` | aus `pyodide-0.27.8.tar.bz2` (gleiche Veröffentlichung), Prüfsumme wie in `pyodide-lock.json` | MIT |
| `pyodide/tzdata-2024.1-py2.py3-none-any.whl` | aus `pyodide-0.27.8.tar.bz2` | Apache License 2.0; die Zeitzonendaten der IANA sind gemeinfrei |

Die Version ist gepinnt; ein Wechsel geschieht nur gemeinsam mit einem Lauf des CI-Vergleichs (Pyodide-Bau byteidentisch
zum CPython-Bau). Die Dateien werden von der eigenen Adresse geladen, nicht von einem CDN.
