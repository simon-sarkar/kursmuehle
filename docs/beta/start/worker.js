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
 *             angaben_schreiben, geplant, planung, auffuellen, antwort, modus, einsetzen, anhaengen, herkunft_hinweis
 *             (Liste in PY_BRUECKE)
 *           | prompt {funktion, args}  gen.prompt: einheit, baustein, korrektur, fragen, fachcheck, vergleich, lehrplan
 *           | design_vorschau {familie, hebel}  gen.api.design_vorschau: Miniatur einer Familie als HTML; ohne familie
 *             alle Familien als {name: html} (AP13.5)
 *           | vorschlag {lehrplan, fach}  gen.api.lehrplan_vorschlag: Schwerpunkt, Übungen und Art der Einheit aus den
 *             Kompetenzerwartungen des gewählten Lehrplans (AP13.24); ohne Lernbereich null
 *           | material_lesen {name, daten}  gen.api.material_lesen: eigenes Material aus einer Datei (AP13.13); pypdf
 *             lädt erst beim ersten PDF
 *           | einheit_vorschau {kurs_md, steckbrief, assets}  gen.api.einheit_vorschau: HTML je Baustein für die Ansicht
 *             „Einheit ansehen und bearbeiten“ (AP13.11)
 * Bytes laufen als ArrayBuffer/Uint8Array (Assets: {name: Uint8Array}); die .mbz kommt als übertragener ArrayBuffer.
 * Klassischer Worker ohne ES-Module (läuft so auch aus einem Blob, Offline-Datei später).
 * Pyodide-Dateien und generator.zip kommen ab dem zweiten Aufruf aus der Cache API (AP13.12 b4). */
"use strict";

var BASIS = new URL("./", self.location.href).href;
var pyodide = null;
var bereit = false;
var ladeVersprechen = null;

importScripts(BASIS + "vendor/pyodide/pyodide.js");

// AP13.12 b4: Was Pyodide per fetch lädt (wasm, Standardbibliothek, Wheels, Lock-Datei) und generator.zip liegen in der
// Cache API; pyodide.js und pyodide.asm.js (importScripts) bleiben beim HTTP-Cache. Schlüssel: Pyodide-Version bzw.
// Inhalts-Hash des Generators aus dateien.json (die Beta trägt dieselbe Versionsnummer). In der Beta-Vorschau tragen
// die Schlüssel den Zusatz -beta: dieselbe Regel wie km.speicher() in kern.js (AP13.10), hier auf die Adresse des
// Workers angewandt. Ohne Cache API (Firefox privat) oder bei einem Fehler geht es übers Netz.
var PYODIDE_VERSION = "0.27.8";        // wie web/vendor/pyodide/pyodide-lock.json (test_web.py prüft das)
var PYPDF = "pypdf-6.21.2-py3-none-any.whl";   // Wheel unter vendor/pyodide/, nicht in der Lock-Datei (test_material.py)
var pypdfGeladen = false;
var ZUSATZ = /(^|\/)beta\//.test(self.location.pathname) ? "-beta" : "";
function speicher(name) { return name + ZUSATZ; }
var netz = self.fetch.bind(self);

async function aufraeumen(art, name) {
  try {
    var namen = await self.caches.keys();
    await Promise.all(namen.filter(function (n) {
      return n.indexOf("kursmuehle-" + art + "-") === 0 && /-beta$/.test(n) === !!ZUSATZ && n !== name;
    }).map(function (n) { return self.caches.delete(n); }));
  } catch (e) { /* ohne Cache API nichts zu tun */ }
}

async function ausCache(name, url, opts) {
  var cache = null;
  try { cache = await self.caches.open(name); } catch (e) { return netz(url, opts); }
  try { var da = await cache.match(url); if (da) return da; } catch (e) { /* weiter übers Netz */ }
  var r = await netz(url, opts);
  if (r.ok) { try { await cache.put(url, r.clone()); } catch (e) { /* voll oder gesperrt: nur nicht speichern */ } }
  return r;
}

self.fetch = function (eingabe, opts) {
  var url = new URL(eingabe instanceof Request ? eingabe.url : String(eingabe), BASIS).href;   // Pyodide gibt URL-Objekte
  if (url.indexOf(BASIS + "vendor/pyodide/") === 0 && !/\.js$/.test(url))
    return ausCache(speicher("kursmuehle-pyodide-" + PYODIDE_VERSION), url, opts);
  return netz(eingabe, opts);
};

async function generatorLaden() {
  var hash = null;
  try {
    var d = await netz(BASIS + "dateien.json", { cache: "no-cache" });
    if (d.ok) hash = (await d.json()).generator || null;
  } catch (e) { /* ohne Liste ohne Cache */ }
  if (!hash) return netz(BASIS + "generator.zip", { cache: "no-cache" });
  var name = speicher("kursmuehle-generator-" + hash);
  aufraeumen("generator", name);
  return ausCache(name, BASIS + "generator.zip", { cache: "no-cache" });
}

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
  "          'planung', 'auffuellen', 'loesung_zulassen', 'zusatzaufgabe',",
  "          'antwort', 'modus', 'einsetzen', 'anhaengen', 'dateiname', 'bild_verkleinert', 'herkunft_hinweis',",
  "          'hand_pruefen', 'hand_betroffen', 'hand_erhalten', 'abschnitt_setzen', 'abschnitt_verschieben',",
  "          'kurstitel_setzen', 'kachel_teilen', 'baustein_verschieben', 'kachel_loeschen', 'ids_ergaenzen',",
  "          'leer_nach_antwort'}",
  "_PROMPT = {'einheit', 'baustein', 'korrektur', 'korrektur_bitte', 'diagnose', 'fragen', 'fachcheck', 'vergleich',",
  "           'lehrplan', 'format_hilfe'}",
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
  "def km_material_lesen(e):",
  "    d = e.get('daten')",
  "    return api.material_lesen(e.get('name') or '', bytes(d.tobytes() if isinstance(d, memoryview) else d or b''))",
  "",
  "def km_vorschlag(e):",
  "    return api.lehrplan_vorschlag(e.get('lehrplan'), e.get('fach') or '')",
  "",
  "def km_design_vorschau(e):",
  "    if e.get('familie'):",
  "        return api.design_vorschau(e.get('familie'), e.get('hebel'))",
  "    return api.design_vorschauen(e.get('hebel'))",
  "",
  "def km_einheit_vorschau(e):",
  "    return api.einheit_vorschau(e.get('kurs_md') or '', e.get('steckbrief'), _bytes(e.get('assets')))",
  "",
  "def km_info():",
  "    return {'python': sys.version.split()[0], 'version': api.VERSION, 'format': _M.FORMAT}",
].join("\n");

async function laden(id) {
  var t0 = performance.now(), zeiten = {};
  status(id, "Pyodide wird geladen …", "pyodide");
  aufraeumen("pyodide", speicher("kursmuehle-pyodide-" + PYODIDE_VERSION));
  pyodide = await loadPyodide({ indexURL: BASIS + "vendor/pyodide/" });
  zeiten.pyodide_ms = Math.round(performance.now() - t0);
  status(id, "Pakete (PyYAML, tzdata) …", "pakete");
  var t1 = performance.now();
  await pyodide.loadPackage(["pyyaml", "tzdata"], { messageCallback: function () {} });
  zeiten.pakete_ms = Math.round(performance.now() - t1);
  status(id, "Generator wird geladen …", "generator");
  var t2 = performance.now();
  var r = await generatorLaden();
  if (!r.ok) throw new Error("generator.zip fehlt (" + r.status + "); python3 scripts/web_bundle.py ausführen");
  var buf = await r.arrayBuffer();
  pyodide.unpackArchive(buf, "zip", { extractDir: "/km" });
  pyodide.runPython(PY_BRUECKE);
  var info = pyodide.runPython("km_info()").toJs({ dict_converter: Object.fromEntries });
  zeiten.generator_ms = Math.round(performance.now() - t2);
  zeiten.gesamt_ms = Math.round(performance.now() - t0);
  bereit = true;
  return Object.assign({ python: info.python, version: info.version, format: info.format, pyodide: pyodide.version },
      zeiten);
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
      else if (m.aktion === "vorschlag") ergebnis = aufruf("km_vorschlag", { lehrplan: m.lehrplan, fach: m.fach });
      else if (m.aktion === "einheit_vorschau") ergebnis = aufruf("km_einheit_vorschau", { kurs_md: m.kurs_md, steckbrief: m.steckbrief, assets: m.assets });
      else if (m.aktion === "design_vorschau") ergebnis = aufruf("km_design_vorschau", { familie: m.familie, hebel: m.hebel });
      else if (m.aktion === "material_lesen") {
        if (!pypdfGeladen && /\.pdf$/i.test(m.name || "")) {
          await pyodide.loadPackage(BASIS + "vendor/pyodide/" + PYPDF, { messageCallback: function () {} });
          pypdfGeladen = true;
        }
        ergebnis = aufruf("km_material_lesen", { name: m.name, daten: new Uint8Array(m.daten) });
      }
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
