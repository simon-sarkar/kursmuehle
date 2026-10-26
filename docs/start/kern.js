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
    pruefung: null, kennzahlen: null, bau: null, beispiel: null,
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

  // Der Worker gleicht eine Kopie der Mappe ab und ändert dabei nur diese Schlüssel. Was die Seite während der Anfrage
  // an derselben Mappe gesetzt hat (Schritt, Durchsicht, Prüffragen), ginge sonst mit der Antwort verloren.
  function mappeUebernehmen(gesendet, antwort) {
    if (zustand.mappe !== gesendet) { zustand.mappe = antwort; return; }
    ["bausteine", "format", "kursmuehle"].forEach(function (k) { gesendet[k] = antwort[k]; });
  }

  // Prüfen, Mappe abgleichen und Kennzahlen in einem Lauf; leere Kursdatei = nur geplante Bausteine
  async function stand(text) {
    if (text === undefined) text = zustand.kurs_md;
    if (!zustand.mappe) zustand.mappe = neueMappe("", null, []);
    var gesendet = zustand.mappe;
    if (!String(text || "").trim()) {
      zustand.kurs_md = "";
      zustand.pruefung = { ok: true, bausteine: [], diagnosen: [], adressen: [], kursdatei: "" };
      var g = await anfrage("abgleich", { mappe: gesendet, bausteine: [] });
      mappeUebernehmen(gesendet, g.ergebnis);
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
    messen("pruefe", zustand.beispiel, a, { bausteine: zustand.pruefung.bausteine.length, zeichen: (text || "").length,
      fehler: zustand.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length });
    return zustand.pruefung;
  }

  async function mappeFn(funktion, args) {
    var a = await anfrage("mappe", { funktion: funktion, args: args || [] });
    return a.ergebnis;
  }

  // Vorschau der Designfamilien (AP13.5): mit familie das HTML dieser Familie, ohne alle Familien als {name: html}
  async function designVorschau(hebel, familie) {
    var a = await anfrage("design_vorschau", { hebel: hebel || {}, familie: familie || null });
    messen("design_vorschau", familie || "alle", a);
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
    zustand.assets = {};
    Object.keys(m.assets || {}).forEach(function (k) { zustand.assets[k] = m.assets[k]; });
    zustand.beispiel = beispiel; zustand.pruefung = null; zustand.kennzahlen = null; zustand.bau = null;
  }

  function neueMappe(titel, einheit, bausteine) {
    var m = { format: 2, kursmuehle: zustand.ladeInfo ? zustand.ladeInfo.version : "", titel: titel || "",
      erzeugt: new Date().toISOString().slice(0, 10), bausteine: bausteine || [] };
    if (einheit) m.einheit = einheit;
    return m;
  }

  async function mappeSchreiben() {
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

  // Autosave nur gegen den geschlossenen Tab: die Kursdatei gehört als Datei der Lehrkraft. Die Landingpage liest
  // `mappe`/`aktuell` mit; Hinweise und Infobox liegen im Speicher `einstellungen`.
  var DB = "kursmuehle", STORE = "mappe", EINST = "einstellungen";
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
      prompt: prompt, baue: baue, designVorschau: designVorschau,
    mappeAusBytes: mappeAusBytes, mappeAusDateien: mappeAusDateien, mappeSchreiben: mappeSchreiben,
    mappeUebernehmen: mappeUebernehmen,
    neueMappe: neueMappe, heap: heap, beenden: beenden, sha256: sha256, autosaveSchreiben: autosaveSchreiben,
    autosaveLesen: autosaveLesen, autosaveLoeschen: autosaveLoeschen, einstellung: einstellung, zustand: zustand,
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
  S.chatWahlOffen = false;
  S.autosaveTimer = null;
  S.kennzahlTimer = null;
  S.eingabeTimer = null;
  S.textTimer = null;
  S.hinweiseAlle = false;
  var texte = { teile: [], ids: [], art: "einheit", teil: 0, laeuft: 0, kopiert: {} };
  S.fragenListe = [];
  S.korrekturen = [];
  S.letzteAntwort = null;
  S.infoboxAus = false;
  S.schreibKette = Promise.resolve();
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
  function typInfo(typ) { return S.katalog && S.katalog.typen.filter(function (x) { return x.typ === typ; })[0]; }
  function formularname(typ) { if (typ === AUTO) return "Typ automatisch"; var t = typInfo(typ); return t ?
      t.formularname : typ; }
  // wie gen/prompt.py zeit_selbst(): ohne Schlüssel gelten die Soll-Minuten
  function zeitSelbst() { return !!Z.mappe && Z.mappe.zeit_selbst !== false; }
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
      })[0]; return w ? w.wert : "2-3"; }
  function bilderWert() { return S.angaben.bilder || bilderStandard(); }
  function sichtbareSchritte() { return SCHRITTE.filter(function (n) { return n !== 5.5 || (bildwuensche().length > 0 &&
      bilderWert() !== "0"); }); }
  function nrVon(n) { return sichtbareSchritte().indexOf(n) + 1; }      // angezeigte Nummer (mit Bildern acht Schritte)
  function inhalt() { return !!(Z.kurs_md && Z.kurs_md.trim()); }
  function fehlerZahl() { return Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; })
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
    if (kette === S.schreibKette) S.angaben = gelesen;    // sonst kam inzwischen ein Klick; dessen Werte gelten
    await auswertung();
    zeichne();
    autosave();
  }

  async function auswertung() {
    var pr = Z.pruefung || { bausteine: [], diagnosen: [] };
    S.fragenListe = await km.prompt("fragen", [pr]);
    S.korrekturen = await km.prompt("korrektur", [pr]);
    var fc = await km.prompt("fachcheck", [pr, Z.steckbrief_text]);
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
    if (!Z.mappe || !S.katalog) { S.knoepfe(); return; }
    felderFuellen();
    Array.prototype.forEach.call(document.querySelectorAll(".vorlage"), function (b) {
      b.setAttribute("aria-pressed", String(S.katalog.vorlagen[b.dataset.vorlage].name === (Z.mappe.einheit || {})
          .vorlage));
    });
    var v = (Z.mappe.einheit || {}).vorlage;
    $("vorlage-zeile").textContent = inhalt() ? "Aufbau: " + (v || "eigener Aufbau") +
        ". Du kannst ihn ändern, bis die erste Antwort eingefügt ist."
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
    S.zeichneLehrplan();
    S.rueckmeldungFuellen();
    S.knoepfe();
    S.zeichneSchritte();
  }

  function felderFuellen() {
    var e = Z.mappe.einheit || {};
    // c2: Zahl ins Jahrgangsfeld, Text ohne Zahl ins Zielgruppenfeld
    var jgA = String(e.jahrgang || S.angaben.jahrgang || ""), jgF = String(e.jahrgang || "");
    var zgA = /\d/.test(jgA) ? "" : jgA.trim(), zgF = /\d/.test(jgF) ? "" : jgF.trim();
    var werte = { "a-thema": e.thema || S.angaben.thema || "", "a-jahrgang": zgA ? "" : jgA, "a-zielgruppe": zgA,
      "a-minuten": e.minuten || S.angaben.minuten || "", "a-fach": S.angaben.fach || "",
          "a-schulart": S.angaben.schulart || "",
      "m-fach": S.angaben.fach || "", "a-kontext": S.angaben.kontext || "", "m-kontext": S.angaben.kontext || "",
      "a-format": S.angaben.format, "a-familie": S.angaben.familie,
      "a-farbe": /^#/.test(S.angaben.farbe || "") ? "eigen" : S.angaben.farbe,
      "a-farbe-hex": /^#/.test(S.angaben.farbe || "") ? S.angaben.farbe : "",
      "a-abschluss": S.angaben.abschluss, "a-portionierung": S.angaben.portionierung, "a-chat": Z.mappe.chat || "",
      "a-material": Z.mappe.material || "", "f-thema": e.thema || "", "f-jahrgang": zgF ? "" : jgF,
          "f-zielgruppe": zgF, "f-minuten": e.minuten || 45 };
    if (Z.mappe.anhaengen && !Z.mappe.bausteine.some(function (k) { return k.einheit === Z.mappe.anhaengen; })) {
      werte["f-thema"] = undefined; werte["f-minuten"] = undefined;    // nächste Einheit: Felder gehören der Lehrkraft
    }
    Object.keys(werte).forEach(function (id) {
      var f = $(id);
      if (document.activeElement === f || werte[id] === undefined) return;
      f.value = werte[id];
      if (f.tagName === "SELECT" && f.selectedIndex < 0) f.selectedIndex = 0;
    });
    if (S.zielgruppeSperre) { S.zielgruppeSperre("f", true); S.zielgruppeSperre("a", true); }
    var c = chatInfo(Z.mappe.chat);
    $("material-grenze").textContent = !c ? "" : c.eingabe_kb
      ? c.text + " nahm im Test " + c.eingabe_kb + " KB Text an; der Text für den Chat hat mit deinem Material etwa " +
          kb(S.textGroesse()) + "."
      : "Wie viel Text " + c.text + " annimmt, ist nicht gemessen. Halte das Material kurz.";
  }
  Object.assign(S, { $: $, AUTO: AUTO, FARBEN: FARBEN, KOPIERT: KOPIERT, SCHRITTE: SCHRITTE,
    STANDARD_FARBE: STANDARD_FARBE, Z: Z, ZWEIG_TEXT: ZWEIG_TEXT, auswertung: auswertung, autosave: autosave,
    bildGroesse: bildGroesse, bilderStandard: bilderStandard, bilderWert: bilderWert, bildwuensche: bildwuensche,
    chatInfo: chatInfo, datumZeit: datumZeit, download: download, einheitTag: einheitTag, el: el,
    erledigtBis: erledigtBis, fehlerText: fehlerText, fehlerZahl: fehlerZahl, felderFuellen: felderFuellen,
    formularname: formularname, geaendert: geaendert, heute: heute, hinweiseSichern: hinweiseSichern, hoehe: hoehe,
    inhalt: inhalt, karteNach: karteNach, kb: kb, kopieren: kopieren, ladenStarten: ladenStarten, markiert: markiert,
    mitMinuten: mitMinuten, neuPruefen: neuPruefen, nrVon: nrVon, oberText: oberText, schritt: schritt,
    sektion: sektion, sichtbareSchritte: sichtbareSchritte, status: status, teileOffen: teileOffen, texte: texte,
    zeichne: zeichne, zeit: zeit, zeitSelbst: zeitSelbst, zweig: zweig });
})();
