/* Kursmühle – Kern: Worker mit Pyodide, Kursmappe, Autosave; dazu der gemeinsame Zustand der Seite (km.seite).
 * Kein Framework, kein Bundler, keine ES-Module; die übrigen Skripte der Seite laden danach in fester Reihenfolge.
 * `window.km` ist die Schnittstelle für die Seite, die Messseite und die Tests. Python läuft nur im Worker
 * (gen/api.py, gen/mappe.py); YAML liest und schreibt nur Python, JavaScript hält mappe.json als Objekt. */
"use strict";

var km = (function () {
  var worker = null, naechsteId = 1, offen = {}, statusCb = null, ladeVersprechen = null;
  var zustand = {
    geladen: false, ladeInfo: null, ladeFehler: null,
    mappe: null, kurs_md: "", steckbrief_text: "", assets: {},   // assets: {name: Uint8Array}
    pruefung: null, kennzahlen: null, bau: null, beispiel: null, gespeichert: null,
  };
  var messungen = [];

  function startWorker() {
    if (worker) return;
    worker = new Worker("worker.js");
    worker.onmessage = function (ev) {
      var m = ev.data;
      if (m.status !== undefined) { if (statusCb) statusCb(m.status, m.schritt); return; }
      var p = offen[m.id];
      if (!p) return;
      delete offen[m.id];
      if (m.ok) p.resolve(m); else p.reject(new Error(m.fehler || "Fehler im Worker"));
    };
    worker.onerror = function (e) { if (statusCb) statusCb("Worker-Fehler: " + (e.message || e), "fehler"); };
  }

  function anfrage(aktion, daten, transfer) {
    startWorker();
    var id = naechsteId++;
    var nachricht = Object.assign({ id: id, aktion: aktion }, daten || {});
    return new Promise(function (resolve, reject) {
      offen[id] = { resolve: resolve, reject: reject };
      worker.postMessage(nachricht, transfer || []);
    });
  }

  function messen(aktion, beispiel, antwort, extra) {
    var eintrag = Object.assign({
      zeit: new Date().toISOString(), browser: navigator.userAgent, aktion: aktion, beispiel: beispiel || "",
      dauer_ms: antwort.dauer_ms, heap_mb: antwort.heap_mb, js_heap_mb: antwort.js_heap_mb,
    }, extra || {});
    messungen.push(eintrag);
    return eintrag;
  }

  function assetsKopie() {
    var o = {};
    Object.keys(zustand.assets).forEach(function (k) { o[k] = zustand.assets[k]; });
    return o;
  }

  async function laden() {
    var a = await anfrage("laden");
    zustand.geladen = true;
    zustand.ladeInfo = a.ergebnis;
    messen("laden", "", a, { pyodide_ms: a.ergebnis.pyodide_ms, pakete_ms: a.ergebnis.pakete_ms,
      generator_ms: a.ergebnis.generator_ms, gesamt_ms: a.ergebnis.gesamt_ms });
    return a.ergebnis;
  }

  // Einmal laden, beliebig oft warten (Oberfläche: Felder sind vorher bedienbar, Prüfen und Erstellen warten hierauf)
  function bereit() {
    if (!ladeVersprechen) {
      ladeVersprechen = laden().catch(function (e) { zustand.ladeFehler = e; ladeVersprechen = null; throw e; });
    }
    return ladeVersprechen;
  }

  async function pruefe(text, assets, steckbrief) {
    var a = await anfrage("pruefe", { text: text, assets: assets || assetsKopie(),
        steckbrief: steckbrief !== undefined ? steckbrief : zustand.steckbrief_text });
    zustand.pruefung = a.ergebnis;
    zustand.kurs_md = a.ergebnis.kursdatei;
    if (zustand.mappe) {
      var gesendet = zustand.mappe;
      var g = await anfrage("abgleich", { mappe: gesendet, bausteine: a.ergebnis.bausteine });
      mappeUebernehmen(gesendet, g.ergebnis);
    }
    messen("pruefe", zustand.beispiel, a, { bausteine: a.ergebnis.bausteine.length,
        fehler: a.ergebnis.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length,
      zeichen: (text || "").length });
    return a.ergebnis;
  }

  // AP13.31: Benennt die Antwort des Chats oder der Editor einen Abschnitt um, trägt die Kachel des Plans (`kacheln`) den
  // neuen Titel; „Was soll hier rein?“ gilt so weiter. Zuordnung über die Bausteine, deren `abschnitt` die Kachel war: alle
  // tragen danach denselben neuen Titel, keiner mehr den alten, und den neuen hat noch keine Kachel der Einheit.
  function kachelnNachziehen(mappe, neu) {
    var kacheln = mappe.kacheln || [];
    if (!kacheln.length) return;
    var nachId = {};
    (neu || []).forEach(function (b) { nachId[b.id] = b; });
    kacheln.forEach(function (ka) {
      var tag = ka.einheit || "";
      var vorher = (mappe.bausteine || []).filter(function (b) { return b.abschnitt === ka.titel && (b.einheit || "") === tag; });
      var titel = {};
      vorher.forEach(function (b) { var n = nachId[b.id]; if (n && n.abschnitt) titel[n.abschnitt] = 1; });
      var t = Object.keys(titel);
      if (t.length !== 1 || t[0] === ka.titel) return;
      var bleibt = (neu || []).some(function (b) { return b.abschnitt === ka.titel && (b.einheit || "") === tag; });
      var schon = kacheln.some(function (x) { return x !== ka && x.titel === t[0] && (x.einheit || "") === tag; });
      if (!bleibt && !schon) ka.titel = t[0];
    });
  }

  // Der Worker gleicht eine Kopie der Mappe ab und ändert dabei nur diese Schlüssel. Was die Seite während der Anfrage
  // an derselben Mappe gesetzt hat (Schritt, Durchsicht, Prüffragen), ginge sonst mit der Antwort verloren.
  function mappeUebernehmen(gesendet, antwort) {
    if (zustand.mappe !== gesendet) { zustand.mappe = antwort; return; }
    kachelnNachziehen(gesendet, antwort.bausteine);
    ["bausteine", "format", "kursmuehle"].forEach(function (k) { gesendet[k] = antwort[k]; });
    // AP13.11: Handänderungen ohne Baustein fallen weg (wie gen/mappe.py abgleich); was die Seite inzwischen gesetzt hat, bleibt
    if (gesendet.hand) {
      var da = {}, titel = {};
      var falte = function (t) { return String(t || "").replace(/\s*·\s*(?:ca\.\s*)?\d+\s*min\.?\s*$/, "")
          .replace(/\s+/g, " ").trim().toLowerCase(); };
      antwort.bausteine.forEach(function (b) { if (!b.geplant) { da[b.id] = 1; titel[falte(b.abschnitt)] = 1; } });
      Object.keys(gesendet.hand).forEach(function (id) {
        var v = gesendet.hand[id] || {};
        var abschnitt = id.indexOf("abschnitt:") === 0 && titel[falte(String(v.nachher || "").split("\n")[0]
            .replace(/^##\s*/, ""))];
        if (!da[id] && id !== "kopf" && !abschnitt) delete gesendet.hand[id];
      });
    }
  }

  // Prüfen, Mappe abgleichen und Kennzahlen in einem Lauf; leere Kursdatei = nur geplante Bausteine
  async function stand(text) {
    if (text === undefined) text = zustand.kurs_md;
    if (!zustand.mappe) zustand.mappe = neueMappe("", null, []);
    var gesendet = zustand.mappe;
    if (!String(text || "").trim()) {
      zustand.kurs_md = "";
      zustand.pruefung = { ok: true, bausteine: [], diagnosen: [], adressen: [], kursdatei: "" };
      var vorher = JSON.stringify(gesendet.bausteine);
      var g = await anfrage("abgleich", { mappe: gesendet, bausteine: [] });
      // AP13.31: hat die Seite die geplanten Karten inzwischen geändert (Plan in „Ich steuere“), gilt ihr Stand
      if (JSON.stringify(gesendet.bausteine) === vorher) mappeUebernehmen(gesendet, g.ergebnis);
      zustand.kennzahlen = await mappeFn("kennzahlen", [zustand.mappe, zustand.pruefung, null,
          zustand.steckbrief_text]);
      return zustand.pruefung;
    }
    var a = await anfrage("stand", { text: text, assets: assetsKopie(), steckbrief: zustand.steckbrief_text,
        mappe: gesendet });
    zustand.pruefung = a.ergebnis.pruefung;
    zustand.kurs_md = a.ergebnis.pruefung.kursdatei;
    mappeUebernehmen(gesendet, a.ergebnis.mappe);
    zustand.kennzahlen = a.ergebnis.kennzahlen;
    if (km.seite && km.seite.nachStand) km.seite.nachStand();     // AP13.35 §3.3 (chat.js)
    messen("pruefe", zustand.beispiel, a, { bausteine: zustand.pruefung.bausteine.length, zeichen: (text || "").length,
      fehler: zustand.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length });
    return zustand.pruefung;
  }

  async function mappeFn(funktion, args) {
    var a = await anfrage("mappe", { funktion: funktion, args: args || [] });
    return a.ergebnis;
  }

  // AP13.24: Schwerpunkt, Übungen und Art der Einheit aus dem gewählten Lehrplan (gen.api.lehrplan_vorschlag), null ohne Lernbereich
  async function lehrplanVorschlag(lehrplan, fach) {
    var a = await anfrage("vorschlag", { lehrplan: lehrplan || null, fach: fach || "" });
    return a.ergebnis;
  }

  // Vorschau der Designfamilien (AP13.5): mit familie das HTML dieser Familie, ohne alle Familien als {name: html}
  async function designVorschau(hebel, familie) {
    var a = await anfrage("design_vorschau", { hebel: hebel || {}, familie: familie || null });
    messen("design_vorschau", familie || "alle", a);
    return a.ergebnis;
  }

  // AP13.11: Vorschau der ganzen Einheit für die Ansicht „Einheit ansehen und bearbeiten“ (gen/api.einheit_vorschau)
  async function einheitVorschau() {
    var a = await anfrage("einheit_vorschau", { kurs_md: zustand.kurs_md, steckbrief: zustand.steckbrief_text,
        assets: assetsKopie() });
    messen("einheit_vorschau", zustand.beispiel, a, { bausteine: a.ergebnis.bausteine.length });
    return a.ergebnis;
  }

  async function prompt(funktion, args) {
    var a = await anfrage("prompt", { funktion: funktion, args: args || [] });
    return a.ergebnis;
  }

  async function baue(opt) {
    opt = opt || {};
    var a = await anfrage("baue", { kurs_md: opt.kurs_md !== undefined ? opt.kurs_md : zustand.kurs_md,
      steckbrief: opt.steckbrief !== undefined ? opt.steckbrief : zustand.steckbrief_text,
      assets: opt.assets || assetsKopie(), zeit: opt.zeit === undefined ? null : opt.zeit,
          seed: opt.seed === undefined ? null : opt.seed,
      optionen: opt.optionen || {} });
    var e = a.ergebnis;
    if (e.mbz) e.mbz = new Uint8Array(e.mbz);
    zustand.bau = e;
    messen("baue", zustand.beispiel, a, { bytes: e.mbz ? e.mbz.length : 0, ok: e.ok });
    return e;
  }

  async function mappeAusBytes(buf, name) {
    var a = await anfrage("mappe_lesen", { daten: buf });
    uebernehmeMappe(a.ergebnis, name || null);
    return a.ergebnis;
  }

  async function mappeAusDateien(dateien, name) {
    var a = await anfrage("mappe_aus_dateien", { dateien: dateien });
    uebernehmeMappe(a.ergebnis, name || null);
    return a.ergebnis;
  }

  function uebernehmeMappe(m, beispiel) {
    zustand.mappe = m.mappe; zustand.kurs_md = m.kurs_md; zustand.steckbrief_text = m.steckbrief_text;
    zustand.gespeichert = m.gespeichert || null;          // AP13.15: Version und Kanal aus der Datei, vor der Migration
    zustand.assets = {};
    Object.keys(m.assets || {}).forEach(function (k) { zustand.assets[k] = m.assets[k]; });
    zustand.beispiel = beispiel; zustand.pruefung = null; zustand.kennzahlen = null; zustand.bau = null;
  }

  function neueMappe(titel, einheit, bausteine) {
    var m = { format: zustand.ladeInfo && zustand.ladeInfo.format || 2,
      kursmuehle: zustand.ladeInfo ? zustand.ladeInfo.version : "", titel: titel || "",
      erzeugt: new Date().toISOString().slice(0, 10), bausteine: bausteine || [] };
    if (einheit) m.einheit = einheit;
    return m;
  }

  // AP13.15: unter /beta/ trägt die Mappe `kanal: beta`; der stabile Stand sagt beim Öffnen, dass sie aus der Testversion
  // kommt (mappe.herkunft_hinweis). Nur hier gesetzt, mappeUebernehmen übernimmt den Schlüssel nicht aus dem Worker.
  async function mappeSchreiben() {
    if (zustand.mappe) { if (ZUSATZ) zustand.mappe.kanal = "beta"; else delete zustand.mappe.kanal; }
    var a = await anfrage("mappe_schreiben", { mappe: zustand.mappe, kurs_md: zustand.kurs_md,
        steckbrief: zustand.steckbrief_text, assets: assetsKopie() });
    return { zip: new Uint8Array(a.ergebnis.zip), dateiname: a.ergebnis.dateiname };
  }

  async function heap() { var a = await anfrage("heap"); return a.ergebnis; }

  function beenden() {
    if (worker) { worker.terminate(); worker = null; }
    Object.keys(offen).forEach(function (k) { offen[k].reject(new Error("Worker beendet")); delete offen[k]; });
    zustand.geladen = false; ladeVersprechen = null;
  }

  function sha256(u8) {
    return crypto.subtle.digest("SHA-256", u8).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); })
          .join("");
    });
  }

  // Stabiler Stand und Beta-Vorschau (kursmuehle.de/beta/, AP13.10) teilen die Herkunft und damit den Speicher: unter
  // einem Pfadsegment beta/ tragen die Datenbank und die Schlüssel im localStorage den Zusatz -beta (dieselbe Regel im
  // Skript der Landingpage); das Farbschema bleibt gemeinsam.
  var ZUSATZ = /(^|\/)beta\//.test(location.pathname) ? "-beta" : "";
  function speicher(name) { return name + ZUSATZ; }

  // Autosave nur gegen den geschlossenen Tab: die Kursdatei gehört als Datei der Lehrkraft. Die Landingpage liest
  // `mappe`/`aktuell` mit; Hinweise und Infobox liegen im Speicher `einstellungen`.
  var DB = speicher("kursmuehle"), STORE = "mappe", EINST = "einstellungen";
  function db() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("IndexedDB fehlt"));
      var r = indexedDB.open(DB, 2);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
        if (!d.objectStoreNames.contains(EINST)) d.createObjectStore(EINST);
      };
      r.onsuccess = function () { r.result.onversionchange = function () { r.result.close(); }; resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }
  async function autosaveSchreiben() {
    if (!zustand.mappe) return null;
    var m = await mappeSchreiben();
    var d = await db();
    var titel = (zustand.mappe.einheit && zustand.mappe.einheit.thema) || zustand.mappe.titel || "";
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ zip: m.zip.buffer, dateiname: m.dateiname, titel: titel, zeit: Date.now() },
          "aktuell");
      tx.oncomplete = function () { resolve(m.dateiname); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  async function autosaveLesen() {
    var d = await db();
    return new Promise(function (resolve, reject) {
      var r = d.transaction(STORE, "readonly").objectStore(STORE).get("aktuell");
      r.onsuccess = function () { resolve(r.result || null); };
      r.onerror = function () { reject(r.error); };
    });
  }
  async function einstellung(name, wert) {
    var d = await db();
    function hole(store, key) {
      return new Promise(function (resolve, reject) {
        var r = d.transaction(store, "readonly").objectStore(store).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    }
    if (wert === undefined) return hole(EINST, name);
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(EINST, "readwrite");
      tx.objectStore(EINST).put(wert, name);
      tx.oncomplete = function () { resolve(wert); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  async function autosaveLoeschen() {
    var d = await db();
    return new Promise(function (resolve) { var tx = d.transaction(STORE, "readwrite"); tx.objectStore(STORE)
        .delete("aktuell"); tx.oncomplete = resolve; });
  }

  return { anfrage: anfrage, laden: laden, bereit: bereit, pruefe: pruefe, stand: stand, mappeFn: mappeFn,
      prompt: prompt, baue: baue, designVorschau: designVorschau, einheitVorschau: einheitVorschau, lehrplanVorschlag: lehrplanVorschlag,
    mappeAusBytes: mappeAusBytes, mappeAusDateien: mappeAusDateien, mappeSchreiben: mappeSchreiben,
    mappeUebernehmen: mappeUebernehmen,
    neueMappe: neueMappe, heap: heap, beenden: beenden, sha256: sha256, autosaveSchreiben: autosaveSchreiben,
    autosaveLesen: autosaveLesen, autosaveLoeschen: autosaveLoeschen, einstellung: einstellung, speicher: speicher,
    kanal: ZUSATZ ? "beta" : "", zustand: zustand,
        messungen: messungen,
    bauOptionen: null, setStatus: function (cb) { statusCb = cb; } };
})();
window.km = km;

// Seite (index.html): gemeinsamer Zustand in km.seite, kleine Helfer, Laden, Prüfen und Zeichnen
(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite = {};
  var $ = function (id) { return document.getElementById(id); };
  var Z = km.zustand;
  S.katalog = null;
  S.angaben = {};
  S.rueckgaengig = null;
  S.auf = {};
  S.designer = null;              // AP13.19 §3: {y} solange „Zum Designer“ offen ist (schritte.js)
  S.chatWahlOffen = false;
  S.autosaveTimer = null;
  S.kennzahlTimer = null;
  S.eingabeTimer = null;
  S.textTimer = null;
  S.hinweiseAlle = false;
  var texte = { teile: [], ids: [], art: "einheit", teil: 0, laeuft: 0, kopiert: {} };
  S.fragenListe = [];
  S.korrekturen = [];
  S.korrekturBitte = "";
  S.spracheGelb = [];             // AP13.14: ids mit „Sprache anpassen lassen“ (flüchtig, nicht in der Mappe)
  S.letzteAntwort = null;
  S.infoboxAus = false;
  S.schreibKette = Promise.resolve();
  S.angabenFuer = null;            // Mappe, deren Angaben aus dem Steckbrief gelesen sind (neuPruefen)
  S.schwerpunktFolge = null;       // AP13.24: Reihenfolge der Klicks auf die Schwerpunkt-Kacheln {mappe, liste}
  S.korrektur = { text: "", offen: false, stand: "", art: "" };
  S.korrekturTimer = null;
  S.hinweise = { an: true, gesehen: [] };
  S.hinweisTexte = {};
  S.hinweiseGeladen = false;
  S.bauLaeuft = false;
  var bildGroesse = {};                           // Datei -> „2,4 MB → 160 KB“ nach dem Hochladen
  var SCHRITTE = [1, 2, 3, 4, 5, 5.5, 6, 7];       // 5.5 = Bilder, nur mit Bildwünschen in der Antwort
  var KOPIERT = "Jetzt in deinen Chat einfügen, die Antwort dann in Schritt 5 einfügen.";
  var STANDARD_FARBE = "#1D5FD1";                 // Akzent der Familien ohne eigene Farbe (familien.yaml)
  var FARBEN = { blau: "#1D5FD1", "grün": "#15803D", rot: "#BE123C", orange: "#B45309", lila: "#6D28D9" };
  var ZWEIG_TEXT = { mach: "Mach du", richtung: "Ich gebe die Richtung", steuer: "Ich steuere" };
  var AUTO = "automatisch";                       // Typ, den das Modell aus Titel und Auftrag wählt
  S.gespeichert = false;
  Z.texte = texte;

  function el(tag, attr, kinder) {
    var e = document.createElement(tag);
    Object.keys(attr || {}).forEach(function (k) {
      if (k === "text") e.textContent = attr[k];
      else if (k === "cls") e.className = attr[k];
      else if (attr[k] !== null && attr[k] !== undefined && attr[k] !== false) e.setAttribute(k, attr[k] === true ?
          "" : attr[k]);
    });
    (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        });
    return e;
  }
  function status(text, art) { var s = $("kopf-status"); s.textContent = text; s.className = "status " + (art || ""); }
  function zeit(t) { return new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
  function datumZeit(t) {
    var d = new Date(t), heute = new Date();
    return d.toDateString() === heute.toDateString() ? "um " + zeit(t) : "am " + d.toLocaleDateString("de-DE") +
        " um " + zeit(t);
  }
  // AP13.11: Wortlaut der Ansicht „Einheit ansehen und bearbeiten“ aus katalog.yaml (oberflaeche.editor)
  function editorText(schluessel, werte) {
    var t = (S.katalog && S.katalog.oberflaeche.editor || {})[schluessel] || "";
    Object.keys(werte || {}).forEach(function (k) { t = t.split("{" + k + "}").join(werte[k]); });
    return t;
  }
  function typInfo(typ) { return S.katalog && S.katalog.typen.filter(function (x) { return x.typ === typ; })[0]; }
  function formularname(typ) { if (typ === AUTO) return "Typ automatisch"; var t = typInfo(typ); return t ?
      t.formularname : typ; }
  // wie gen/prompt.py zeit_selbst(): ohne Schlüssel gelten die Soll-Minuten
  function zeitSelbst() { return !!Z.mappe && Z.mappe.zeit_selbst !== false; }
  // AP13.35 §1.2: „Worum geht es?“ der laufenden Einheit (wie gen/prompt.py einheit_kontext): die erste im Steckbrief
  // (`kurs.kontext`, zugleich die Beschreibung des Kurses), eine angehängte in der Mappe (`einheit.kontext`)
  function kontextJetzt() {
    return einheitTag() ? String(((Z.mappe && Z.mappe.einheit) || {}).kontext || "") : String(S.angaben.kontext || "");
  }
  function mitMinuten(typ) { var t = typInfo(typ); return !t || t.minuten !== false; }
  function chatInfo(wert) { return S.katalog && S.katalog.chats.filter(function (c) { return c.wert === wert; })[0]; }
  function oberText(feld, wert) {
    if (feld === "familie" || feld === "dichte" || feld === "kasten") {
      var f = S.familien && (feld === "familie" ? S.familien.familien.map(function (x) { return { wert: x.name, text: x.text }; })
          : S.familien[feld]).filter(function (x) { return x.wert === wert; })[0];
      return f ? f.text : (wert || "");
    }
    if (feld === "farbe" && /^#[0-9A-Fa-f]{6}$/.test(wert || "")) return "Eigene Farbe " + wert.toUpperCase();
    var w = S.katalog && S.katalog.oberflaeche[feld].filter(function (x) { return x.wert === wert; })[0];
    return w ? w.text : (wert || "");
  }
  function download(u8, name, typ) {
    var blob = new Blob([u8], { type: typ || "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 30000);   // Safari braucht den Link länger
  }
  function heute() {
    var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }
  function fehlerText(e) { return (e && e.message) || String(e); }
  function hoehe(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
  function kb(n) { return n < 1024 ? n + " Bytes" : (Math.round(n / 102.4) / 10).toString().replace(".", ",") + " KB"; }
  // ein unbekannter Zweig (neuere Mühle) gilt als „Ich steuere“ (AP13.5b)
  function zweig() { var z = (Z.mappe && Z.mappe.zweig) || ""; return z && !ZWEIG_TEXT[z] ? "steuer" : z; }
  function schritt() { return Z.mappe ? (Z.mappe.schritt || 2) : 1; }
  function sektion(n) { return $(n === 1 ? "start" : n === 5.5 ? "schritt-bilder" : "schritt-" + n); }
  // laufende Einheit: „e2“ … beim Anhängen und danach, "" = die erste; Bilder, Rand und Text nur für sie
  function einheitTag() { return Z.mappe ? (Z.mappe.anhaengen || Z.mappe.laufend || "") : ""; }
  // AP13.35 §4.2: Einheiten der Mappe („e1“ = erste, Karten ohne `einheit`) mit Nummer und Thema; Listen gliedern danach,
  // sobald es mehr als eine gibt. Thema aus `themen` (seit AP13.35), sonst die laufende nach `einheit.thema`, die erste
  // nach dem Titel der Mappe
  function einheitVon(k) { return (k && k.einheit) || "e1"; }
  function mehrereEinheiten() { return !!Z.mappe && Z.mappe.bausteine.some(function (k) { return !!k.einheit; }); }
  function einheitName(tag) {
    var th = (Z.mappe && Z.mappe.themen) || {}, lauf = einheitTag() || "e1";
    var thema = th[tag] || (tag === lauf ? ((Z.mappe && Z.mappe.einheit) || {}).thema : "") ||
        (tag === "e1" ? (Z.mappe && Z.mappe.titel) || "" : "");
    var n = parseInt(String(tag).replace(/^e/, ""), 10) || 1;
    return editorText("einheit_name", { n: n }) + (thema ? ": " + thema : "");
  }
  function karteNach(id) { return Z.mappe ? Z.mappe.bausteine.filter(function (k) { return k.id === id; })[0] : null; }
  function inEinheit(id) { var k = karteNach(id); return !!k && (k.einheit || "") === einheitTag(); }
  function bildwuensche() {
    return ((Z.pruefung && Z.pruefung.bildwuensche) || []).filter(function (b) { return b.baustein ?
        inEinheit(b.baustein) : !einheitTag(); });
  }
  // Stückelung eingefroren und noch nicht ganz eingefügt: rote Karten und Korrektur warten, bis der letzte Teil da ist
  function teileOffen() {
    var st = Z.mappe && Z.mappe.stueckelung;
    return !!(st && st.ids && st.ids.length > 1 && (st.eingefuegt || []).length < st.ids.length);
  }
  function bilderStandard() { var w = S.katalog && S.katalog.oberflaeche.bilder.filter(function (x) { return x.standard;
      })[0]; return w ? w.wert : "0"; }
  function bilderWert() { return S.angaben.bilder || bilderStandard(); }
  function sichtbareSchritte() { return SCHRITTE.filter(function (n) { return n !== 5.5 || (bildwuensche().length > 0 &&
      bilderWert() !== "0"); }); }
  function nrVon(n) { return sichtbareSchritte().indexOf(n) + 1; }      // angezeigte Nummer (mit Bildern acht Schritte)
  function inhalt() { return !!(Z.kurs_md && Z.kurs_md.trim()); }
  function fehlerZahl() { return Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; })
      .length : 0; }
  // AP13.34 §3.3: gelbe Hinweise der Prüfung (die Karten zeigen sie als „Hinweis“)
  function gelbZahl() { return Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "warnung"; })
      .length : 0; }
  function markiert() { return Z.mappe ? Z.mappe.bausteine.filter(function (k) { return k.neu; }) : []; }

  // Kopieren nur in der Geste (Safari): der Text liegt fertig im Feld; ohne Zwischenablage markieren, execCommand
  function kopieren(text, feld, stand, satz, fertigCb) {
    function fertig(ok) {
      stand.textContent = ok ? satz : "Kopieren ging nicht. Öffne „Text ansehen“, markiere den Text und kopiere ihn.";
      stand.classList.remove("ok", "fehler"); stand.classList.add("stand", ok ? "ok" : "fehler");
      if (ok && fertigCb) fertigCb();
    }
    function rueckfall() {
      var ok = false;
      try {
        var d = feld.closest("details"); if (d) d.open = true;
        feld.focus(); feld.select(); feld.setSelectionRange(0, feld.value.length);
        ok = document.execCommand("copy");
      } catch (e) { ok = false; }
      fertig(ok);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () {
          fertig(true); }, rueckfall);
      else rueckfall();
    } catch (e) { rueckfall(); }
  }

  // AP13.33 N5: Kopieren eines Textes, der erst noch entsteht (`versprechen` -> Text). Mit ClipboardItem geht der Auftrag
  // an die Zwischenablage noch in der Geste (Safari und Chromium nehmen ein Versprechen als Inhalt); sonst nach dem
  // Warten wie kopieren() (writeText, Rückfall Markieren und execCommand; lehnt der Browser ab, steht dort, dass es
  // nicht ging, nie „Kopiert“)
  function kopierenSpaeter(versprechen, feld, stand, satz, fertigCb) {
    var mitItem = typeof window.ClipboardItem === "function" && navigator.clipboard && navigator.clipboard.write;
    if (!mitItem) {
      return versprechen.then(function (t) { if (t) { feld.value = t; kopieren(t, feld, stand, satz, fertigCb); } });
    }
    var text = versprechen.then(function (t) { if (!t) throw new Error("kein Text"); feld.value = t; return t; });
    var blob = text.then(function (t) { return new Blob([t], { type: "text/plain" }); });
    var geschrieben;
    try { geschrieben = navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]); }
    catch (e) { geschrieben = Promise.reject(e); }
    return geschrieben.then(function () {
      stand.textContent = satz; stand.classList.remove("fehler"); stand.classList.add("stand", "ok");
      if (fertigCb) fertigCb();
    }, function () { return text.then(function (t) { kopieren(t, feld, stand, satz, fertigCb); }, function () {}); });
  }

  // c5: kurze Meldung unter einem Knopf („Text kopiert“): Mühle ohne Drehung (S.muehleSymbol aus chat.js) und Text,
  // 1,5 s, dann ausgeblendet; die Statuszeile darunter bleibt. Hat das Kopieren den Schritt zugeklappt, steht sie an
  // dessen Kopfzeile
  km.kurzmeldung = function (knopf, text) {
    if (!knopf) return null;
    var id = knopf.id, sec = knopf.closest(".schritt");
    if (!knopf.offsetParent && sec) knopf = sec.querySelector(".s-zeile");
    if (!knopf || !knopf.offsetParent) return null;
    if (!document.getElementById("stil-kurzmeldung")) {
      document.head.appendChild(el("style", { id: "stil-kurzmeldung", text: [
        ".kurzmeldung { position: absolute; z-index: 5; display: inline-flex; align-items: center; gap: 6px;",
        "  padding: 4px 10px 4px 8px; border-radius: 999px; background: var(--flaeche); color: var(--text);",
        "  box-shadow: 0 0 0 1px var(--linie), 0 2px 8px rgba(0, 0, 0, 0.12); font-size: 0.85rem; white-space: nowrap;",
        "  pointer-events: none; transition: opacity 0.3s ease; }",
        ".kurzmeldung.weg { opacity: 0; }",
        "@media (prefers-reduced-motion: reduce) { .kurzmeldung { transition: none; } }"
      ].join("\n") }));
    }
    var alt = document.querySelector(".kurzmeldung[data-zu='" + id + "']");
    if (alt) alt.remove();
    var m = el("span", { cls: "kurzmeldung", role: "status", "aria-live": "polite", "data-zu": id });
    if (S.muehleSymbol) m.appendChild(S.muehleSymbol());
    m.appendChild(document.createTextNode(text));
    m.style.left = knopf.offsetLeft + "px";
    m.style.top = (knopf.offsetTop + knopf.offsetHeight + 6) + "px";
    knopf.offsetParent.appendChild(m);
    var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(function () { m.classList.add("weg"); setTimeout(function () { m.remove(); }, ruhig ? 0 : 300); }, 1500);
    return m;
  };

  // Statuszeile statt Ladebalken; läuft erst, wenn alle Skripte der Seite da sind (sonst fehlen ihre Funktionen)
  function ladenStarten() {
    km.setStatus(function () { if (!Z.geladen) status("Wird vorbereitet …", "lauf"); });
    status("Wird vorbereitet …", "lauf");
    km.bereit().then(function () {
      if (!S.bauLaeuft) status("Bereit", "ok");
      // Vorschau der gewählten Familie (AP13.5d §1): füllt sie, auch wenn Schritt 3 schon offen ist
      if (S.katalogDa) S.katalogDa.then(function () { if (S.vorschauLaden) S.vorschauLaden(); });
      S.knoepfe();
      if (Z.mappe) neuPruefen().catch(function (e) { S.zeigeFehler(e); });
    }).catch(function (e) {
      console.error("Laden", e);
      status("Kursmühle ließ sich nicht vollständig laden. Speichere deine Einheit und versuch es später oder in "
        + "einem anderen Netz noch einmal.", "fehler");
    });
    km.einstellung("infobox_aus").then(function (w) { S.infoboxAus = !!w; }).catch(function () {
        /* ohne IndexedDB */ });
    hinweiseLaden();
    S.katalogDa = Promise.all([fetch("katalog.json", { cache: "no-cache" }).then(function (r) { return r.json(); }),
        fetch("familien.json", { cache: "no-cache" }).then(function (r) { return r.json(); })])
        .then(function (kf) {
      var k = kf[0];
      S.katalog = k;
      S.familien = kf[1];
      testfassung(k.version);
      S.vorlagenZeigen();
      auswahlFuellen();
      zeichne();
    }).catch(function () { status("katalog.json oder familien.json fehlt; python3 scripts/web_bundle.py ausführen",
        "fehler"); });
  }
  // Hinweise an, bis die Lehrkraft sie ausschaltet; ein in einer anderen Einheit erledigter Schritt zeigt keinen mehr
  function hinweiseLaden() {
    Promise.all([
      km.einstellung("hinweise").then(function (w) {
        if (w && typeof w === "object") S.hinweise = { an: w.an !== false, gesehen: w.gesehen || [] };
      }).catch(function () { /* ohne IndexedDB: Hinweise bei jedem Besuch */ }),
      fetch("hinweise.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (h) {
          S.hinweisTexte = h; })
        .catch(function () { S.hinweisTexte = {}; })
    ]).then(function () { S.hinweiseGeladen = true; S.zeichneSchritte(); });
  }
  function hinweiseSichern() { km.einstellung("hinweise", { an: S.hinweise.an, gesehen: S.hinweise.gesehen })
      .catch(function () {}); }
  function erledigtBis(n) {            // Schritte vor n gelten als einmal abgeschlossen
    var neu = false;
    SCHRITTE.forEach(function (k) { if (k < n && S.hinweise.gesehen.indexOf(String(k)) < 0) {
        S.hinweise.gesehen.push(String(k)); neu = true; } });
    if (neu) hinweiseSichern();
  }
  $("hinweise-an").addEventListener("change", function () { S.hinweise.an = $("hinweise-an").checked; hinweiseSichern();
      S.zeichneSchritte(); });

  S.katalogDa = null;

  // Zeile über der Seite, solange die Version ein Suffix trägt: -b Beta, -a Testfassung
  function testfassung(version) {
    var p = $("testfassung");
    p.hidden = !(version && version.indexOf("-") > 0);
    if (p.hidden) return;
    p.innerHTML = "";
    p.appendChild(document.createTextNode((/-b/.test(version) ? "Beta " : "Testfassung ") + version +
        " · Rückmeldung an "));
    var b = el("button", { type: "button", cls: "textlink", text: "kursmuehle@pm.me" });
    b.onclick = S.rueckmeldungOeffnen;
    p.appendChild(b);
  }

  function auswahlFuellen() {
    var o = S.katalog.oberflaeche;
    [["a-format", o.format], ["a-familie", S.familien.familien.map(function (f) { return { wert: f.name, text: f.text };
        })], ["a-farbe", o.farbe.concat([{ wert: "eigen", text: "Eigene Farbe" }])],
     ["a-abschluss", o.abschluss], ["a-portionierung", o.portionierung], ["a-schulart",
         o.schulart]].forEach(function (p) {
      var s = $(p[0]); s.innerHTML = "";
      p[1].forEach(function (w) { s.appendChild(el("option", { value: w.wert, text: w.text })); });
    });
    // AP13.20: Schritt 1 bietet die Schularten ohne „Nicht angegeben“; die leere Option ist „noch keine“ (Pflicht beim Anlegen)
    var fs = $("f-schulart"); fs.innerHTML = "";
    fs.appendChild(el("option", { value: "", text: "Noch keine Schulart" }));
    o.schulart.forEach(function (w) { if (w.wert) fs.appendChild(el("option", { value: w.wert, text: w.text })); });
    if (!Z.mappe && S.schulartGemerkt) fs.value = S.schulartGemerkt();
    var gruppen = S.katalog.chat_gruppen;
    var chat = $("a-chat"); chat.innerHTML = "";
    chat.appendChild(el("option", { value: "", text: "Noch nicht gewählt" }));
    var knoepfe_ = $("chat-knoepfe"); knoepfe_.innerHTML = "";
    Object.keys(gruppen).forEach(function (g) {
      var liste = S.katalog.chats.filter(function (c) { return c.gruppe === g; });
      var og = el("optgroup", { label: gruppen[g] });
      var reihe = el("div", { cls: "chat-gruppe" }, [el("span", { cls: "chat-gruppe-name", text: gruppen[g] })]);
      liste.forEach(function (c) {
        og.appendChild(el("option", { value: c.wert, text: c.text }));
        reihe.appendChild(el("button", { type: "button", cls: "knopf chat-knopf", "data-chat": c.wert, text: c.text }));
      });
      chat.appendChild(og);
      knoepfe_.appendChild(reihe);
    });
    var neu = $("neu-typ"), auswahl = S.typAuswahl(AUTO, "");
    neu.innerHTML = auswahl.innerHTML;
    neu.value = AUTO;
    var phasen = $("phasen"), gesehen = {};
    phasen.innerHTML = "";
    S.katalog.vorlagen.forEach(function (v) { v.phasen.forEach(function (p) {
      if (!gesehen[p.phase]) { gesehen[p.phase] = 1; phasen.appendChild(el("option", { value: p.phase })); }
    }); });
  }

  async function neuPruefen() {
    if (!Z.geladen) { zeichne(); return; }
    await S.steckbriefSicher();
    await km.stand(Z.kurs_md);
    for (var kette = null; kette !== S.schreibKette;) { kette = S.schreibKette; await kette; }
    var gelesen = await km.mappeFn("angaben_lesen", [Z.steckbrief_text]);
    // sonst kam inzwischen ein Klick; dessen Werte gelten. angabenFuer: die Angaben dieser Mappe sind vollständig
    // gelesen (lehrplan.js belegt den Lehrplan erst danach vor, sonst überschriebe der Vorschlag eine gespeicherte Wahl)
    if (kette === S.schreibKette) { S.angaben = gelesen; S.angabenFuer = Z.mappe; }
    await auswertung();
    zeichne();
    autosave();
  }

  async function auswertung() {
    var pr = Z.pruefung || { bausteine: [], diagnosen: [] };
    S.fragenListe = await km.prompt("fragen", [pr]);
    // AP13.14: gelbe Sprach-Hinweise nur für Karten mit „Sprache anpassen lassen“ (ids nur noch, wenn die Karte gelb ist)
    // AP13.35 §2.3: dazu die Regel einer gelben Zeile der Einheit („Verlängern lassen“), solange sie gilt
    S.spracheGelb = S.spracheGelb.filter(function (id) { return pr.diagnosen.some(function (d) {
        return (d.baustein === id && d.regel === "sprache.lang") || (!d.baustein && d.regel === id); }); });
    // AP13.11 §8.9: gelbe Bitten nicht für von Hand geänderte Bausteine, rote Fehler bleiben
    // AP13.30 §4a: mit der Mappe auch die Bitte um geplante Bausteine, die nach der Antwort leer blieben
    S.korrekturen = await km.prompt("korrektur", [pr, S.spracheGelb, Z.mappe && Z.mappe.hand ? Object.keys(Z.mappe.hand) :
        [], Z.mappe || null]);
    // AP13.35 §3.1: die Bitte an den Chat mit genau einer Ausgabeanweisung (gen/prompt.py korrektur_bitte)
    S.korrekturBitte = await km.prompt("korrektur_bitte", [S.korrekturen]);
    // AP13.30 §4b: Thema der laufenden Einheit wie im Auftrag
    var fc = await km.prompt("fachcheck", [pr, Z.steckbrief_text, Z.mappe || {}]);
    $("gegen-text-feld").value = fc.text;
    Z.fragen = S.fragenListe; Z.korrekturen = S.korrekturen;
    S.korrektur.text = "";
    if (S.neuBeauftragt().length) S.korrekturSpaeter(0);
    S.textSpaeter(0);
  }

  function kennzahlenSpaeter() {
    clearTimeout(S.kennzahlTimer);
    S.kennzahlTimer = setTimeout(async function () {
      // ohne Prüfung (gerade geöffnete Kursdatei) rechnet neuPruefen die Kennzahlen selbst
      if (!Z.geladen || !Z.mappe || !Z.pruefung) return;
      var mappe = Z.mappe, pruefung = Z.pruefung;
      var k = await km.mappeFn("kennzahlen", [mappe, pruefung, null, Z.steckbrief_text]);
      if (mappe !== Z.mappe || pruefung !== Z.pruefung) return;     // inzwischen neu geprüft oder andere Kursdatei
      Z.kennzahlen = k;
      S.zeichneDiagnosen(); S.zeichneBilder();
    }, 300);
  }

  function autosave() {
    clearTimeout(S.autosaveTimer);
    S.autosaveTimer = setTimeout(function () {
      if (!Z.geladen || !Z.mappe) return;
      km.autosaveSchreiben().then(function () { $("autosave-stand").textContent = "Zuletzt gesichert um " +
          zeit(Date.now()); })
        .catch(function () { $("autosave-stand")
            .textContent = "Dieser Browser sichert nicht automatisch. Speichere die Einheit."; });
    }, 700);
  }

  function geaendert() { S.gespeichert = false; kennzahlenSpaeter(); autosave(); Z.bau = null; S.knoepfe();
      S.textSpaeter(); }

  function zeichne() {
    S.zeichneSchritte();
    if (!Z.mappe || !S.katalog) { S.knoepfe(); if (S.zeichneEditor) S.zeichneEditor(); return; }   // AP13.38: auch ohne Einheit blenden die Editor-Knöpfe sich aus
    felderFuellen();
    Array.prototype.forEach.call(document.querySelectorAll(".vorlage"), function (b) {
      b.setAttribute("aria-pressed", String(S.katalog.vorlagen[b.dataset.vorlage].name === (Z.mappe.einheit || {})
          .vorlage));
    });
    var v = (Z.mappe.einheit || {}).vorlage;
    // AP13.35 §4.3: mit eigenem Plan heißt der Aufbau so, nicht nach der Voreinstellung
    if (S.eigenerPlan && S.eigenerPlan()) v = editorText("eigener_plan");
    $("vorlage-zeile").textContent = inhalt() ? "Aufbau: " + (v || "eigener Aufbau") + "."
      : "Wähle den Aufbau; die Bausteine darunter folgen ihm.";
    S.zeichneAussehen();
    S.zeichneKarten();
    S.zeichneDiagnosen();
    S.zeichneChat();
    S.zeichneKorrektur();
    S.zeichneTeile();
    S.zeichneBilder();
    S.zeichneFragen();
    S.zeichneWiederherstellen();
    S.zeichneKursangaben();
    S.zeichneLehrplan();
    S.rueckmeldungFuellen();
    S.knoepfe();
    S.zeichneSchritte();
    if (S.zeichneEditor) S.zeichneEditor();
    if (S.zeichnePlan) S.zeichnePlan();
  }

  function felderFuellen() {
    var e = Z.mappe.einheit || {};
    // c2: Zahl ins Jahrgangsfeld, Text ohne Zahl ins Zielgruppenfeld
    var jgA = String(e.jahrgang || S.angaben.jahrgang || ""), jgF = String(e.jahrgang || "");
    var zgA = /\d/.test(jgA) ? "" : jgA.trim(), zgF = /\d/.test(jgF) ? "" : jgF.trim();
    var werte = { "a-thema": e.thema || S.angaben.thema || "", "a-jahrgang": zgA ? "" : jgA, "a-zielgruppe": zgA,
      "a-minuten": e.minuten || S.angaben.minuten || "", "a-schulart": zgA ? "" : S.angaben.schulart || "",
      "f-schulart": zgF ? "" : S.angaben.schulart || "",
      "fach": S.angaben.fach || "", "a-kontext": kontextJetzt(), "m-kontext": kontextJetzt(),
      "a-format": S.angaben.format, "a-familie": S.angaben.familie,
      "a-farbe": /^#/.test(S.angaben.farbe || "") ? "eigen" : S.angaben.farbe,
      "a-farbe-hex": /^#/.test(S.angaben.farbe || "") ? S.angaben.farbe : "",
      "a-abschluss": S.angaben.abschluss, "a-portionierung": S.angaben.portionierung, "a-chat": Z.mappe.chat || "",
      "a-material": Z.mappe.material || "", "f-thema": e.thema || "", "f-jahrgang": zgF ? "" : jgF,
          "f-zielgruppe": zgF, "f-minuten": e.minuten || 45 };
    if (Z.mappe.anhaengen && Z.mappe.laufend !== Z.mappe.anhaengen && !Z.mappe.bausteine.some(function (k) {
        return k.einheit === Z.mappe.anhaengen; })) {
      werte["f-thema"] = undefined; werte["f-minuten"] = undefined;    // nächste Einheit: Felder gehören der Lehrkraft
    }
    Object.keys(werte).forEach(function (id) {
      var f = $(id);
      if (document.activeElement === f || werte[id] === undefined) return;
      f.value = werte[id];
      if (f.tagName === "SELECT" && f.selectedIndex < 0) f.selectedIndex = 0;
    });
    if (S.zielgruppeSperre) { S.zielgruppeSperre("f", true); S.zielgruppeSperre("a", true); }
    // Grenzzeile an beiden Materialfeldern (AP13.13): ohne Chat oder ohne Messwert nur die Größe des Materials, rot
    // mit Satz, sobald Teil 1 den Messwert des Chats übersteigt
    var c = chatInfo(Z.mappe.chat), mat = Z.mappe.material || "", zuViel = false, zeile = "";
    if (c && c.eingabe_kb) {
      zuViel = S.textGroesse() > c.eingabe_kb * 1024;
      zeile = c.text + " nahm im Test " + c.eingabe_kb + " KB Text an; der Text für den Chat hat mit deinem Material etwa " +
          kb(S.textGroesse()) + "." + (zuViel ? " Kürze das Material oder wähle weniger Abschnitte." : "");
    } else if (mat.trim()) zeile = "Dein Material hat etwa " + kb(new Blob([mat]).size) + ".";
    ["material-grenze", "r-material-grenze"].forEach(function (id) {
      $(id).textContent = zeile; $(id).classList.toggle("fehler", zuViel); });
  }
  // AP13.33 §2.1: Fokus an die erste Stelle der Liste (Element oder id), die zu sehen und bedienbar ist. Für Knöpfe, die
  // sich beim Klick selbst ausblenden, sperren oder ersetzen: sonst fällt der Fokus auf body. -> Element oder null
  function fokus(liste, ruhig) {
    for (var i = 0; i < liste.length; i++) {
      var e = typeof liste[i] === "string" ? $(liste[i]) : liste[i];
      if (!e || !e.focus || !document.contains(e) || e.disabled || !e.getClientRects().length ||
          e.closest("[hidden], [inert]")) continue;
      e.focus({ preventScroll: !!ruhig });
      if (document.activeElement === e) return e;
    }
    return null;
  }
  // AP13.36: Bedienung mit dem Finger; dort öffnet ein Fokus im Textfeld die Bildschirmtastatur
  function beruehrung() { return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); }
  // nur, wenn der Fokus nirgends mehr ist (body) oder in einem Teil, der gerade verschwindet
  function fokusRetten(liste, teil) {
    var a = document.activeElement;
    if (a && a !== document.body && !(teil && teil.contains(a)) && a.getClientRects().length) return null;
    return fokus(liste);
  }

  // AP13.33 §2.5: Kachelgruppen (role=radiogroup mit Knöpfen role=radio) wie native Radioknöpfe: ein Tab-Halt je Gruppe
  // (die gewählte Kachel, sonst die erste), Pfeiltasten, Pos1 und Ende wechseln Fokus und Wahl (Klick auf die Kachel),
  // Leertaste wählt. Gilt für jede Gruppe der Seite, auch für später gebaute (Beobachter auf dem Dokument). Eine Kachel,
  // die ein label ist (Farbe „Eigene“ mit Farbwähler), bekommt statt des Klicks das Ereignis `km-pfeilwahl`: ein Klick
  // auf das label öffnete den Farbwähler, und der Fokus bliebe darin.
  function radios(gruppe) {
    return Array.prototype.filter.call(gruppe.querySelectorAll("[role=radio]"), function (r) {
      return r.tagName !== "INPUT" && r.closest("[role=radiogroup]") === gruppe;
    });
  }
  function bedienbar(r) { return !r.disabled && !r.hidden && !!r.getClientRects().length; }
  function radioTabs() {
    Array.prototype.forEach.call(document.querySelectorAll("[role=radiogroup]"), function (g) {
      var rs = radios(g); if (!rs.length) return;
      var halt = rs.filter(function (r) { return r.getAttribute("aria-checked") === "true" && bedienbar(r); })[0] ||
          rs.filter(bedienbar)[0] || rs[0];
      rs.forEach(function (r) { var soll = r === halt ? 0 : -1; if (r.tabIndex !== soll) r.tabIndex = soll; });
    });
  }
  var radioPlan = 0;
  function radioSpaeter() { if (!radioPlan) radioPlan = requestAnimationFrame(function () { radioPlan = 0; radioTabs(); }); }
  if (window.MutationObserver) new MutationObserver(radioSpaeter).observe(document.documentElement, { subtree: true,
      childList: true, attributes: true, attributeFilter: ["aria-checked", "hidden", "disabled", "open"] });
  document.addEventListener("keydown", function (ev) {
    var r = ev.target, schritt = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
    if (!r || !r.getAttribute || r.getAttribute("role") !== "radio" || r.tagName === "INPUT" || ev.altKey || ev.ctrlKey ||
        ev.metaKey) return;
    var g = r.closest("[role=radiogroup]"); if (!g) return;
    var rs = radios(g).filter(function (x) { return x === r || bedienbar(x); }), i = rs.indexOf(r);
    if (i < 0 || (!schritt && ev.key !== "Home" && ev.key !== "End")) return;
    ev.preventDefault();
    var ziel = ev.key === "Home" ? rs[0] : ev.key === "End" ? rs[rs.length - 1] : rs[(i + schritt + rs.length) % rs.length];
    if (ziel === r) return;
    var wert = ziel.dataset.wert, sel = wert !== undefined ? "[role=radio][data-wert='" + CSS.escape(wert) + "']" : null;
    ziel.focus();
    if (ziel.tagName === "LABEL") ziel.dispatchEvent(new CustomEvent("km-pfeilwahl", { bubbles: true }));
    else ziel.click();
    // die Wahl kann die Gruppe neu zeichnen oder den Fokus woandershin schicken; er bleibt auf der gewählten Kachel
    var zurueck = function () {
      var x = document.contains(ziel) ? ziel : sel && g.isConnected ? g.querySelector(sel) : null;
      if (x && document.activeElement !== x && bedienbar(x)) x.focus();
    };
    zurueck(); setTimeout(zurueck, 0);
  });

  Object.assign(S, { $: $, AUTO: AUTO, FARBEN: FARBEN, KOPIERT: KOPIERT, SCHRITTE: SCHRITTE, fokus: fokus,
    fokusRetten: fokusRetten, radioTabs: radioTabs, beruehrung: beruehrung,
    STANDARD_FARBE: STANDARD_FARBE, Z: Z, ZWEIG_TEXT: ZWEIG_TEXT, auswertung: auswertung, autosave: autosave,
    bildGroesse: bildGroesse, bilderStandard: bilderStandard, bilderWert: bilderWert, bildwuensche: bildwuensche,
    chatInfo: chatInfo, datumZeit: datumZeit, download: download, editorText: editorText, einheitTag: einheitTag, el: el,
    erledigtBis: erledigtBis, fehlerText: fehlerText, fehlerZahl: fehlerZahl, gelbZahl: gelbZahl, felderFuellen: felderFuellen,
    formularname: formularname, geaendert: geaendert, heute: heute, hinweiseSichern: hinweiseSichern, hoehe: hoehe,
    inhalt: inhalt, einheitName: einheitName, einheitVon: einheitVon, mehrereEinheiten: mehrereEinheiten, karteNach: karteNach, kb: kb, kontextJetzt: kontextJetzt, kopieren: kopieren, kopierenSpaeter: kopierenSpaeter, ladenStarten: ladenStarten, markiert: markiert,
    mitMinuten: mitMinuten, neuPruefen: neuPruefen, nrVon: nrVon, oberText: oberText, schritt: schritt,
    sektion: sektion, sichtbareSchritte: sichtbareSchritte, status: status, teileOffen: teileOffen, texte: texte,
    zeichne: zeichne, zeit: zeit, zeitSelbst: zeitSelbst, zweig: zweig });
})();
