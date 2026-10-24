/* Kursmühle – Web Worker: lädt Pyodide (gepinnt, selbst gehostet unter vendor/pyodide/) und den Generator
 * (generator.zip, aus scripts/web_bundle.py) und bietet gen.api als Nachrichten an.
 *
 * Nachricht an den Worker: {id, aktion, ...}; Antwort: {id, ok, ergebnis, dauer_ms, heap_mb} oder {id, ok:false, fehler}.
 * Aktionen: laden | pruefe {text, assets, steckbrief} | baue {kurs_md, steckbrief, assets, zeit, seed, optionen}
 *           | mappe_lesen {daten} | mappe_aus_dateien {dateien} | mappe_schreiben {mappe, kurs_md, steckbrief, assets}
 *           | steckbrief_lesen {text} | steckbrief_schreiben {sb} | heap
 *           | stand {text, assets, steckbrief, mappe}  prüfen (mit den Prüfregeln der Mühle), Mappe abgleichen,
 *             Kennzahlen in einem Lauf
 *           | mappe {funktion, args}  gen.mappe: verschiebe, entferne, umbenennen, kennzahlen, angaben_lesen,
 *             angaben_schreiben, geplant, planung, auffuellen, antwort, modus, einsetzen, anhaengen (Liste in PY_BRUECKE)
 *           | prompt {funktion, args}  gen.prompt: einheit, baustein, korrektur, fragen, fachcheck, vergleich (AP11)
 * Bytes laufen als ArrayBuffer/Uint8Array (Assets: {name: Uint8Array}); die .mbz kommt als übertragener ArrayBuffer.
 * Klassischer Worker ohne ES-Module (läuft so auch aus einem Blob, Offline-Datei später). */
"use strict";

var BASIS = new URL("./", self.location.href).href;
var pyodide = null;
var bereit = false;
var ladeVersprechen = null;

importScripts(BASIS + "vendor/pyodide/pyodide.js");

function heapMB() {
  try {
    var m = pyodide && pyodide._module;
    var n = m && ((m.HEAPU8 && m.HEAPU8.length) || (m.HEAP8 && m.HEAP8.buffer && m.HEAP8.buffer.byteLength));
    return n ? Math.round(n / 1048576 * 10) / 10 : null;
  } catch (e) { return null; }
}

function jsHeapMB() {
  try { return self.performance && performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null; }
  catch (e) { return null; }
}

function status(id, text, schritt) { self.postMessage({ id: id, status: text, schritt: schritt }); }

var PY_BRUECKE = [
  "import sys, json",
  "sys.path.insert(0, '/km/scripts')",
  "from gen import api, mappe as _M, prompt as _P",
  "",
  "def _bytes(d):",
  "    out = {}",
  "    for k, v in (d or {}).items():",
  "        out[str(k)] = bytes(v.tobytes() if isinstance(v, memoryview) else v)",
  "    return out",
  "",
  "def km_pruefe(e):",
  "    return api.pruefe(e.get('text') or '', _bytes(e.get('assets')), e.get('steckbrief'))",
  "",
  "def km_baue(e):",
  "    r = api.baue_voll(e.get('kurs_md') or '', e.get('steckbrief'), _bytes(e.get('assets')),",
  "                      zeit=e.get('zeit'), seed=e.get('seed'), optionen=e.get('optionen') or {})",
  "    return {'mbz': r.mbz, 'dateiname': r.dateiname, 'titel': r.titel, 'ok': r.ok(),",
  "            'diagnosen': [dict(d, satz=r.diagnosen.satz(d)) for d in r.diagnosen],",
  "            'glossare': r.glossare, 'websites': [t for t, _ in r.websites], 'bausteine': r.bausteine,",
  "            'dauer_s': r.dauer_s}",
  "",
  "def km_mappe_lesen(e):",
  "    return _M.lesen(bytes(e['daten'].tobytes() if isinstance(e['daten'], memoryview) else e['daten']))",
  "",
  "def km_mappe_aus_dateien(e):",
  "    return _M.aus_dateien(_bytes(e.get('dateien')))",
  "",
  "def km_mappe_schreiben(e):",
  "    m = e.get('mappe') or _M.neu()",
  "    return {'zip': _M.schreiben(m, e.get('kurs_md') or '', e.get('steckbrief') or {}, _bytes(e.get('assets'))),",
  "            'dateiname': _M.dateiname(m)}",
  "",
  "def km_abgleich(e):",
  "    return _M.abgleich(e.get('mappe') or _M.neu(), e.get('bausteine') or [])",
  "",
  "def km_steckbrief_lesen(e):",
  "    return api.steckbrief_lesen(e.get('text') or '')",
  "",
  "def km_steckbrief_schreiben(e):",
  "    return api.steckbrief_schreiben(e.get('sb') or {})",
  "",
  "def km_stand(e):",
  "    pr = api.pruefe(e.get('text') or '', _bytes(e.get('assets')), e.get('steckbrief'), e.get('mappe'))",
  "    m = _M.abgleich(e.get('mappe') or _M.neu(), pr['bausteine'])",
  "    return {'pruefung': pr, 'mappe': m, 'kennzahlen': _M.kennzahlen(m, pr, steckbrief=e.get('steckbrief'))}",
  "",
  "_MAPPE = {'verschiebe', 'entferne', 'umbenennen', 'kennzahlen', 'angaben_lesen', 'angaben_schreiben', 'geplant',",
  "          'planung', 'auffuellen',",
  "          'antwort', 'modus', 'einsetzen', 'anhaengen', 'dateiname'}",
  "_PROMPT = {'einheit', 'baustein', 'korrektur', 'diagnose', 'fragen', 'fachcheck', 'vergleich'}",
  "",
  "def km_mappe(e):",
  "    f = e.get('funktion')",
  "    if f not in _MAPPE:",
  "        raise ValueError('unbekannte Funktion ' + str(f))",
  "    return getattr(_M, f)(*(e.get('args') or []))",
  "",
  "def km_prompt(e):",
  "    f = e.get('funktion')",
  "    if f not in _PROMPT:",
  "        raise ValueError('unbekannte Funktion ' + str(f))",
  "    return getattr(_P, f)(*(e.get('args') or []))",
  "",
  "def km_info():",
  "    return {'python': sys.version.split()[0], 'version': api.VERSION}",
].join("\n");

async function laden(id) {
  var t0 = performance.now(), zeiten = {};
  status(id, "Pyodide wird geladen …", "pyodide");
  pyodide = await loadPyodide({ indexURL: BASIS + "vendor/pyodide/" });
  zeiten.pyodide_ms = Math.round(performance.now() - t0);
  status(id, "Pakete (PyYAML, tzdata) …", "pakete");
  var t1 = performance.now();
  await pyodide.loadPackage(["pyyaml", "tzdata"], { messageCallback: function () {} });
  zeiten.pakete_ms = Math.round(performance.now() - t1);
  status(id, "Generator wird geladen …", "generator");
  var t2 = performance.now();
  var r = await fetch(BASIS + "generator.zip", { cache: "no-cache" });
  if (!r.ok) throw new Error("generator.zip fehlt (" + r.status + "); python3 scripts/web_bundle.py ausführen");
  var buf = await r.arrayBuffer();
  pyodide.unpackArchive(buf, "zip", { extractDir: "/km" });
  pyodide.runPython(PY_BRUECKE);
  var info = pyodide.runPython("km_info()").toJs({ dict_converter: Object.fromEntries });
  zeiten.generator_ms = Math.round(performance.now() - t2);
  zeiten.gesamt_ms = Math.round(performance.now() - t0);
  bereit = true;
  return Object.assign({ python: info.python, version: info.version, pyodide: pyodide.version }, zeiten);
}

function nachPython(obj) {
  // JS-Objekt (mit Uint8Array/ArrayBuffer) -> Python dict; Typed Arrays werden memoryview, api wandelt in bytes
  var kopie = obj;
  if (obj && typeof obj === "object") {
    kopie = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v instanceof ArrayBuffer) v = new Uint8Array(v);
      if (v && typeof v === "object" && !(v instanceof Uint8Array) && !Array.isArray(v)) v = nachPython(v);
      kopie[k] = v;
    });
  }
  return pyodide.toPy(kopie);
}

function nachJS(proxy) {
  if (proxy === null || proxy === undefined || typeof proxy !== "object" || !proxy.toJs) return proxy;
  var out = proxy.toJs({ dict_converter: Object.fromEntries, create_proxies: false });
  proxy.destroy();
  return kopiereBytes(out);
}

function kopiereBytes(v) {
  // Uint8Array aus Python zeigt in den WASM-Speicher: kopieren, sonst zerfällt es beim nächsten Lauf
  if (v instanceof Uint8Array) return new Uint8Array(v);
  if (Array.isArray(v)) return v.map(kopiereBytes);
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    var o = {};
    Object.keys(v).forEach(function (k) { o[k] = kopiereBytes(v[k]); });
    return o;
  }
  return v;
}

function aufruf(funktion, eingabe) {
  var e = nachPython(eingabe || {});
  try {
    var f = pyodide.globals.get(funktion);
    var r = f(e);
    f.destroy();
    return nachJS(r);
  } finally {
    if (e && e.destroy) e.destroy();
  }
}

self.onmessage = async function (ev) {
  var m = ev.data || {}, id = m.id, t0 = performance.now();
  try {
    var ergebnis, transfer = [];
    if (m.aktion === "laden") {
      if (!ladeVersprechen) ladeVersprechen = laden(id);
      ergebnis = await ladeVersprechen;
    } else if (m.aktion === "heap") {
      ergebnis = { heap_mb: heapMB(), js_heap_mb: jsHeapMB() };
    } else {
      if (!bereit) throw new Error("Pyodide ist noch nicht geladen");
      if (m.aktion === "pruefe") ergebnis = aufruf("km_pruefe", { text: m.text, assets: m.assets, steckbrief: m.steckbrief });
      else if (m.aktion === "baue") {
        ergebnis = aufruf("km_baue", { kurs_md: m.kurs_md, steckbrief: m.steckbrief, assets: m.assets, zeit: m.zeit, seed: m.seed, optionen: m.optionen });
        if (ergebnis.mbz) { ergebnis.mbz = ergebnis.mbz.buffer; transfer.push(ergebnis.mbz); }
      } else if (m.aktion === "mappe_lesen") ergebnis = aufruf("km_mappe_lesen", { daten: new Uint8Array(m.daten) });
      else if (m.aktion === "mappe_aus_dateien") ergebnis = aufruf("km_mappe_aus_dateien", { dateien: m.dateien });
      else if (m.aktion === "mappe_schreiben") {
        ergebnis = aufruf("km_mappe_schreiben", { mappe: m.mappe, kurs_md: m.kurs_md, steckbrief: m.steckbrief, assets: m.assets });
        ergebnis.zip = ergebnis.zip.buffer; transfer.push(ergebnis.zip);
      } else if (m.aktion === "abgleich") ergebnis = aufruf("km_abgleich", { mappe: m.mappe, bausteine: m.bausteine });
      else if (m.aktion === "stand") ergebnis = aufruf("km_stand", { text: m.text, assets: m.assets, steckbrief: m.steckbrief, mappe: m.mappe });
      else if (m.aktion === "mappe") ergebnis = aufruf("km_mappe", { funktion: m.funktion, args: m.args });
      else if (m.aktion === "prompt") ergebnis = aufruf("km_prompt", { funktion: m.funktion, args: m.args });
      else if (m.aktion === "steckbrief_lesen") ergebnis = aufruf("km_steckbrief_lesen", { text: m.text });
      else if (m.aktion === "steckbrief_schreiben") ergebnis = aufruf("km_steckbrief_schreiben", { sb: m.sb });
      else throw new Error("unbekannte Aktion " + m.aktion);
    }
    self.postMessage({ id: id, ok: true, ergebnis: ergebnis, dauer_ms: Math.round(performance.now() - t0),
      heap_mb: heapMB(), js_heap_mb: jsHeapMB() }, transfer);
  } catch (err) {
    var text = (err && err.message) || String(err);
    // Python-Traceback kürzen: letzte Zeile reicht der Oberfläche, der Rest steht in der Konsole
    if (err && err.type === "PythonError") { console.error(text); text = text.trim().split("\n").pop(); }
    self.postMessage({ id: id, ok: false, fehler: text, dauer_ms: Math.round(performance.now() - t0), heap_mb: heapMB() });
  }
};
