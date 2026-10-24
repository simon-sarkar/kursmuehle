/* Kursmühle – Browser-Fassung: Kern (Worker, Kursmappe, Autosave) und Baustein-Ansicht (AP10) mit Text für den Chat
 * (AP11: Chat-Auswahl, Texte aus gen/prompt.py, Einfügen mit Modus, Korrekturbitte, Fragen und Lösungen, Gegenprüfen).
 * Kein Framework, kein Bundler, keine ES-Module. `window.km` ist die Schnittstelle für die Seite, die Messseite
 * (messung.html) und die Playwright-Tests. Python läuft nur im Worker (gen/api.py, gen/mappe.py); YAML liest und
 * schreibt nur Python, JavaScript hält mappe.json als Objekt. */
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
    var a = await anfrage("pruefe", { text: text, assets: assets || assetsKopie(), steckbrief: steckbrief !== undefined ? steckbrief : zustand.steckbrief_text });
    zustand.pruefung = a.ergebnis;
    zustand.kurs_md = a.ergebnis.kursdatei;
    if (zustand.mappe) {
      var g = await anfrage("abgleich", { mappe: zustand.mappe, bausteine: a.ergebnis.bausteine });
      zustand.mappe = g.ergebnis;
    }
    messen("pruefe", zustand.beispiel, a, { bausteine: a.ergebnis.bausteine.length, fehler: a.ergebnis.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length,
      zeichen: (text || "").length });
    return a.ergebnis;
  }

  // Prüfen, Mappe abgleichen und Kennzahlen in einem Lauf; leere Kursdatei = nur geplante Bausteine
  async function stand(text) {
    if (text === undefined) text = zustand.kurs_md;
    if (!zustand.mappe) zustand.mappe = neueMappe("", null, []);
    if (!String(text || "").trim()) {
      zustand.kurs_md = "";
      zustand.pruefung = { ok: true, bausteine: [], diagnosen: [], adressen: [], kursdatei: "" };
      var g = await anfrage("abgleich", { mappe: zustand.mappe, bausteine: [] });
      zustand.mappe = g.ergebnis;
      zustand.kennzahlen = await mappeFn("kennzahlen", [zustand.mappe, zustand.pruefung, null, zustand.steckbrief_text]);
      return zustand.pruefung;
    }
    var a = await anfrage("stand", { text: text, assets: assetsKopie(), steckbrief: zustand.steckbrief_text, mappe: zustand.mappe });
    zustand.pruefung = a.ergebnis.pruefung;
    zustand.kurs_md = a.ergebnis.pruefung.kursdatei;
    zustand.mappe = a.ergebnis.mappe;
    zustand.kennzahlen = a.ergebnis.kennzahlen;
    messen("pruefe", zustand.beispiel, a, { bausteine: zustand.pruefung.bausteine.length, zeichen: (text || "").length,
      fehler: zustand.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length });
    return zustand.pruefung;
  }

  async function mappeFn(funktion, args) {
    var a = await anfrage("mappe", { funktion: funktion, args: args || [] });
    return a.ergebnis;
  }

  // Text für den Chat, Fragen und Lösungen, Gegenprüfen (gen/prompt.py)
  async function prompt(funktion, args) {
    var a = await anfrage("prompt", { funktion: funktion, args: args || [] });
    return a.ergebnis;
  }

  async function baue(opt) {
    opt = opt || {};
    var a = await anfrage("baue", { kurs_md: opt.kurs_md !== undefined ? opt.kurs_md : zustand.kurs_md,
      steckbrief: opt.steckbrief !== undefined ? opt.steckbrief : zustand.steckbrief_text,
      assets: opt.assets || assetsKopie(), zeit: opt.zeit === undefined ? null : opt.zeit, seed: opt.seed === undefined ? null : opt.seed,
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
    var a = await anfrage("mappe_schreiben", { mappe: zustand.mappe, kurs_md: zustand.kurs_md, steckbrief: zustand.steckbrief_text, assets: assetsKopie() });
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
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  // ---- Autosave in IndexedDB (nur gegen den geschlossenen Tab; die Kursdatei gehört als Datei der Lehrkraft).
  // Version 2 (AP13.1): Speicher `einstellungen` für Hinweise und Infobox; die Landingpage liest nur `mappe`/`aktuell`.
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
      tx.objectStore(STORE).put({ zip: m.zip.buffer, dateiname: m.dateiname, titel: titel, zeit: Date.now() }, "aktuell");
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
  // kleine Einstellungen im Speicher `einstellungen` (Infobox „nicht mehr anzeigen“, Hinweise); vor 2.0.0-b2 lagen sie
  // als „einstellung:<name>“ im Speicher der Mappe und werden von dort noch gelesen
  async function einstellung(name, wert) {
    var d = await db();
    function hole(store, key) {
      return new Promise(function (resolve, reject) {
        var r = d.transaction(store, "readonly").objectStore(store).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    }
    if (wert === undefined) {
      var w = await hole(EINST, name);
      return w !== undefined ? w : hole(STORE, "einstellung:" + name);
    }
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(EINST, "readwrite");
      tx.objectStore(EINST).put(wert, name);
      tx.oncomplete = function () { resolve(wert); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  async function autosaveLoeschen() {
    var d = await db();
    return new Promise(function (resolve) { var tx = d.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete("aktuell"); tx.oncomplete = resolve; });
  }

  return { anfrage: anfrage, laden: laden, bereit: bereit, pruefe: pruefe, stand: stand, mappeFn: mappeFn, prompt: prompt, baue: baue,
    mappeAusBytes: mappeAusBytes, mappeAusDateien: mappeAusDateien, mappeSchreiben: mappeSchreiben,
    neueMappe: neueMappe, heap: heap, beenden: beenden, sha256: sha256, autosaveSchreiben: autosaveSchreiben,
    autosaveLesen: autosaveLesen, autosaveLoeschen: autosaveLoeschen, einstellung: einstellung, zustand: zustand, messungen: messungen,
    bauOptionen: null, setStatus: function (cb) { statusCb = cb; } };
})();
window.km = km;

// ---------------------------------------------------------------- Schrittfolge (index.html, AP13)
// Sieben Schritte untereinander; `mappe.schritt` ist der erreichte Schritt, davor stehen erledigte Schritte als eine
// aufklappbare Zeile. Zweig „mach“ setzt Vorlage und Bausteine still, Zweig „steuer“ zeigt Vorlagen, Karten mit
// Aufträgen und „Mehr einstellen“; beide arbeiten auf derselben Kursdatei. Herkunft je Feld: Lehrkraft oder Chat.
(function () {
  if (!document.getElementById("schritt-5")) return;
  var $ = function (id) { return document.getElementById(id); };
  var Z = km.zustand;
  var katalog = null, angaben = {}, rueckgaengig = null, auf = {}, chatWahlOffen = false;
  var autosaveTimer = null, kennzahlTimer = null, eingabeTimer = null, textTimer = null, hinweiseAlle = false;
  var texte = { teile: [], ids: [], art: "einheit", teil: 0, laeuft: 0, kopiert: {} }, fragenListe = [], korrekturen = [], letzteAntwort = null;
  var infoboxAus = false;
  var schreibKette = Promise.resolve();
  // AP13.3: ein Korrekturweg. Der Block unter dem Einfügefeld von Schritt 5 sammelt alle Sätze und die neu beauftragten
  // Karten; `korrektur` hält Text zum Kopieren, ob die Antwort-Zeile offen ist, und die letzte Meldung
  var korrektur = { text: "", offen: false, stand: "", art: "" }, korrekturTimer = null;
  var hinweise = { an: true, gesehen: [] }, hinweisTexte = {}, hinweiseGeladen = false;
  var bauLaeuft = false;
  var SCHRITTE = [1, 2, 3, 4, 5, 5.5, 6, 7];       // 5.5 = Bilder (AP13.1), nur mit Bildwünschen in der Antwort
  var MAX_KANTE = 1600;                           // Bilder werden beim Hochladen auf diese lange Kante verkleinert
  var KOPIERT = "Jetzt in deinen Chat einfügen, die Antwort dann in Schritt 5 einfügen.";
  var STANDARD_FARBE = "#1D5FD1";                 // Akzent der Designvorlagen ohne eigene Farbe (gen/html.py HUE)
  var FARBEN = { blau: "#1D5FD1", "grün": "#15803D", rot: "#BE123C", orange: "#B45309", lila: "#6D28D9" };   // gen/kursdatei.py
  var AUS_FORMATE = ["themen", "kacheln"];        // Kursformate im Schritt Aussehen; alle unter „Mehr einstellen“
  var ZWEIG_TEXT = { mach: "Mach du", steuer: "Ich steuere" };
  var AUTO = "automatisch";                       // Typ, den das Modell aus Titel und Auftrag wählt (AP13)
  var gespeichert = false;                        // Kursdatei seit der letzten Änderung gespeichert?
  Z.texte = texte;

  // ---- kleine Helfer
  function el(tag, attr, kinder) {
    var e = document.createElement(tag);
    Object.keys(attr || {}).forEach(function (k) {
      if (k === "text") e.textContent = attr[k];
      else if (k === "cls") e.className = attr[k];
      else if (attr[k] !== null && attr[k] !== undefined && attr[k] !== false) e.setAttribute(k, attr[k] === true ? "" : attr[k]);
    });
    (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function status(text, art) { var s = $("kopf-status"); s.textContent = text; s.className = "status " + (art || ""); }
  function zeit(t) { return new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); }
  function datumZeit(t) {
    var d = new Date(t), heute = new Date();
    return d.toDateString() === heute.toDateString() ? "um " + zeit(t) : "am " + d.toLocaleDateString("de-DE") + " um " + zeit(t);
  }
  function typInfo(typ) { return katalog && katalog.typen.filter(function (x) { return x.typ === typ; })[0]; }
  function formularname(typ) { if (typ === AUTO) return "Typ automatisch"; var t = typInfo(typ); return t ? t.formularname : typ; }
  // wie gen/prompt.py zeit_selbst(): ohne Schlüssel (Kursdatei vor 2.0.0-b1) gelten die Soll-Minuten
  function zeitSelbst() { return !!Z.mappe && Z.mappe.zeit_selbst !== false; }
  function mitMinuten(typ) { var t = typInfo(typ); return !t || t.minuten !== false; }
  function chatInfo(wert) { return katalog && katalog.chats.filter(function (c) { return c.wert === wert; })[0]; }
  function oberText(feld, wert) {
    var w = katalog && katalog.oberflaeche[feld].filter(function (x) { return x.wert === wert; })[0];
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
  function hoehe(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }   // Auftragsfeld wächst mit
  function kb(n) { return n < 1024 ? n + " Bytes" : (Math.round(n / 102.4) / 10).toString().replace(".", ",") + " KB"; }
  function zweig() { return (Z.mappe && Z.mappe.zweig) || ""; }
  function schritt() { return Z.mappe ? (Z.mappe.schritt || 2) : 1; }
  function sektion(n) { return $(n === 1 ? "start" : n === 5.5 ? "schritt-bilder" : "schritt-" + n); }
  // laufende Einheit (AP13.3): „e2“ … beim Anhängen und danach, "" = die erste; Bilder, Rand und Text nur für sie
  function einheitTag() { return Z.mappe ? (Z.mappe.anhaengen || Z.mappe.laufend || "") : ""; }
  function karteNach(id) { return Z.mappe ? Z.mappe.bausteine.filter(function (k) { return k.id === id; })[0] : null; }
  function inEinheit(id) { var k = karteNach(id); return !!k && (k.einheit || "") === einheitTag(); }
  function bildwuensche() {
    return ((Z.pruefung && Z.pruefung.bildwuensche) || []).filter(function (b) { return b.baustein ? inEinheit(b.baustein) : !einheitTag(); });
  }
  // Stückelung eingefroren und noch nicht ganz eingefügt: rote Karten und Korrektur warten, bis der letzte Teil da ist
  function teileOffen() {
    var st = Z.mappe && Z.mappe.stueckelung;
    return !!(st && st.ids && st.ids.length > 1 && (st.eingefuegt || []).length < st.ids.length);
  }
  // AP13.4: Bilder-Stufe aus Schritt 3 (Steckbrief kurs.bilder); bei „keine“ bleibt der Schritt Bilder aus
  function bilderStandard() { var w = katalog && katalog.oberflaeche.bilder.filter(function (x) { return x.standard; })[0]; return w ? w.wert : "2-3"; }
  function bilderWert() { return angaben.bilder || bilderStandard(); }
  function sichtbareSchritte() { return SCHRITTE.filter(function (n) { return n !== 5.5 || (bildwuensche().length > 0 && bilderWert() !== "0"); }); }
  function nrVon(n) { return sichtbareSchritte().indexOf(n) + 1; }      // angezeigte Nummer (mit Bildern acht Schritte)
  function inhalt() { return !!(Z.kurs_md && Z.kurs_md.trim()); }
  function fehlerZahl() { return Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length : 0; }
  function markiert() { return Z.mappe ? Z.mappe.bausteine.filter(function (k) { return k.neu; }) : []; }

  // Kopieren nur in der Geste (Safari): der Text liegt schon fertig im Feld; ohne Zwischenablage markieren und execCommand
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
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { fertig(true); }, rueckfall);
      else rueckfall();
    } catch (e) { rueckfall(); }
  }

  // ---- Laden im Hintergrund: Statuszeile statt Ladebalken
  km.setStatus(function () { if (!Z.geladen) status("Wird vorbereitet …", "lauf"); });
  status("Wird vorbereitet …", "lauf");
  km.bereit().then(function () {
    if (!bauLaeuft) status("Bereit", "ok");
    knoepfe();
    if (Z.mappe) neuPruefen().catch(zeigeFehler);
  }).catch(function () {
    status("Kursmühle ließ sich nicht vollständig laden. Speichere deine Einheit und versuch es später oder in einem anderen Netz noch einmal.", "fehler");
  });

  km.einstellung("infobox_aus").then(function (w) { infoboxAus = !!w; }).catch(function () { /* ohne IndexedDB: Box jedes Mal */ });
  // Hinweise beim ersten Durchlauf (AP13.1): an, bis die Lehrkraft sie ausschaltet; ein Schritt, den sie in einer früheren
  // Einheit schon abgeschlossen hat, zeigt keinen Hinweis mehr. Texte in hinweise.json, Zustand in der IndexedDB.
  Promise.all([
    km.einstellung("hinweise").then(function (w) { if (w && typeof w === "object") hinweise = { an: w.an !== false, gesehen: w.gesehen || [] }; })
      .catch(function () { /* ohne IndexedDB: Hinweise bei jedem Besuch */ }),
    fetch("hinweise.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (h) { hinweisTexte = h; })
      .catch(function () { hinweisTexte = {}; })
  ]).then(function () { hinweiseGeladen = true; zeichneSchritte(); });
  function hinweiseSichern() { km.einstellung("hinweise", { an: hinweise.an, gesehen: hinweise.gesehen }).catch(function () {}); }
  function erledigtBis(n) {            // Schritte vor n gelten als einmal abgeschlossen
    var neu = false;
    SCHRITTE.forEach(function (k) { if (k < n && hinweise.gesehen.indexOf(String(k)) < 0) { hinweise.gesehen.push(String(k)); neu = true; } });
    if (neu) hinweiseSichern();
  }
  $("hinweise-an").addEventListener("change", function () { hinweise.an = $("hinweise-an").checked; hinweiseSichern(); zeichneSchritte(); });

  var katalogDa = fetch("katalog.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (k) {
    katalog = k;
    testfassung(k.version);
    vorlagenZeigen();
    auswahlFuellen();
    zeichne();
  }).catch(function () { status("katalog.json fehlt; python3 scripts/web_bundle.py ausführen", "fehler"); });

  // Zeile über der Seite, solange die Version ein Suffix trägt (Version aus CHANGELOG.md beim Bündeln): -b Beta, -a Testfassung
  function testfassung(version) {
    var p = $("testfassung");
    p.hidden = !(version && version.indexOf("-") > 0);
    if (p.hidden) return;
    p.innerHTML = "";
    p.appendChild(document.createTextNode((/-b/.test(version) ? "Beta " : "Testfassung ") + version + " · Rückmeldung an "));
    var b = el("button", { type: "button", cls: "textlink", text: "kursmuehle@pm.me" });
    b.onclick = rueckmeldungOeffnen;
    p.appendChild(b);
  }

  function auswahlFuellen() {
    var o = katalog.oberflaeche;
    [["a-format", o.format], ["a-vorlage", o.vorlage], ["a-farbe", o.farbe],
     ["a-abschluss", o.abschluss], ["a-portionierung", o.portionierung], ["a-schulart", o.schulart]].forEach(function (p) {
      var s = $(p[0]); s.innerHTML = "";
      p[1].forEach(function (w) { s.appendChild(el("option", { value: w.wert, text: w.text })); });
    });
    // Chat: dienstliche Angebote zuerst, dann private Konten, dann „anderer“
    var gruppen = { dienstlich: "Dienstlich", privat: "Privates Konto", anderer: "Anderer" };
    var chat = $("a-chat"); chat.innerHTML = "";
    chat.appendChild(el("option", { value: "", text: "Noch nicht gewählt" }));
    var knoepfe_ = $("chat-knoepfe"); knoepfe_.innerHTML = "";
    Object.keys(gruppen).forEach(function (g) {
      var liste = katalog.chats.filter(function (c) { return c.gruppe === g; });
      var og = el("optgroup", { label: gruppen[g] });
      var reihe = el("div", { cls: "chat-gruppe" }, [el("span", { cls: "chat-gruppe-name", text: gruppen[g] })]);
      liste.forEach(function (c) {
        og.appendChild(el("option", { value: c.wert, text: c.text }));
        reihe.appendChild(el("button", { type: "button", cls: "knopf chat-knopf", "data-chat": c.wert, text: c.text }));
      });
      chat.appendChild(og);
      knoepfe_.appendChild(reihe);
    });
    var neu = $("neu-typ"), auswahl = typAuswahl(AUTO, "");
    neu.innerHTML = auswahl.innerHTML;
    neu.value = AUTO;
    var fl = $("faecher-liste"); fl.innerHTML = "";
    (o.faecher || []).forEach(function (f) { fl.appendChild(el("option", { value: f })); });
    var phasen = $("phasen"), gesehen = {};
    phasen.innerHTML = "";
    katalog.vorlagen.forEach(function (v) { v.phasen.forEach(function (p) {
      if (!gesehen[p.phase]) { gesehen[p.phase] = 1; phasen.appendChild(el("option", { value: p.phase })); }
    }); });
  }

  // ---------------------------------------------------------------- Schritte zeichnen
  function fazit(n) {
    var e = (Z.mappe && Z.mappe.einheit) || {};
    if (n === 1) return [e.thema, e.jahrgang ? "Jahrgangsstufe " + e.jahrgang : "", e.minuten ? e.minuten + " Minuten" : ""].filter(Boolean).join(" · ");
    if (n === 2) {
      var z = ZWEIG_TEXT[zweig()] || "";
      var n = Z.mappe.bausteine.filter(function (k) { return !k.aus; }).length;
      return [z, e.vorlage, zweig() === "steuer" ? n + " Bausteine" : ""].filter(Boolean).join(" · ");
    }
    if (n === 3) return [oberText("vorlage", angaben.vorlage), oberText("format", angaben.format), oberText("farbe", angaben.farbe || ""),
      "Bilder: " + oberText("bilder", bilderWert()), oberText("website", angaben.website || "textfeld")].filter(Boolean).join(" · ");
    if (n === 4) { var c = chatInfo(Z.mappe.chat); return c ? c.text + (Z.mappe.kopiert ? " · Text kopiert" : "") : ""; }
    if (n === 5) {
      var voll = Z.mappe.bausteine.filter(function (k) { return !k.geplant && (k.einheit || "") === einheitTag(); }).length, f = fehlerZahl();
      return voll ? voll + " Bausteine" + (f ? ", " + f + " Fehler" : ", geprüft") : "";
    }
    if (n === 5.5) {
      var w = bildwuensche().filter(function (b) { return b.datei; }), da = w.filter(function (b) { return Z.assets[b.datei]; }).length;
      return !w.length ? "" : da === w.length ? (da === 1 ? "Bild da" : "alle " + da + " Bilder da") : da + " von " + w.length + " Bildern da, sonst Platzhalter";
    }
    if (n === 6) return fragenListe.length ? fragenListe.length + " Fragen" + (Z.mappe.durchsicht ? " durchgesehen" : "") : "keine Fragen";
    return "";
  }

  // Hinweis unter der Überschrift des aktiven Schritts, höchstens zwei Sätze, nie blockierend
  function zeichneHinweis(sec, n, aktiv) {
    var box = sec.querySelector(".s-hinweis"), text = hinweisTexte[String(n)];
    var zeigen = aktiv && hinweiseGeladen && hinweise.an && !!text && hinweise.gesehen.indexOf(String(n)) < 0;
    if (!zeigen) { if (box) box.remove(); return; }
    if (!box) {
      box = el("div", { cls: "s-hinweis", role: "note" }, [el("p"), el("button", { type: "button", cls: "textlink hinweis-aus", text: "Hinweise ausblenden" })]);
      sec.querySelector(".s-inhalt").insertBefore(box, sec.querySelector(".s-inhalt").firstChild);
    }
    box.querySelector("p").textContent = text;
  }
  document.querySelector(".spalte-haupt").addEventListener("click", function (ev) {
    if (!ev.target.closest(".hinweis-aus")) return;
    hinweise.an = false; hinweiseSichern(); zeichneSchritte();
  });

  function zeichneSchritte() {
    var s = schritt(), z = zweig();
    if (s === 5.5 && Z.pruefung && !bildwuensche().length) s = 6;     // Bildwünsche inzwischen weg: weiter mit den Fragen
    document.body.dataset.schritt = String(s);
    document.body.dataset.zweig = z;
    document.body.dataset.bildschirm = Z.mappe ? "ansicht" : "start";
    var sichtbar = sichtbareSchritte();
    SCHRITTE.forEach(function (n) {
      var sec = sektion(n);
      var stand = sichtbar.indexOf(n) < 0 ? "zu" : n < s ? "erledigt" : n === s ? "aktiv" : "zu";
      // Schritt 4 bleibt offen, solange ein gestückelter Text noch nicht ganz kopiert ist
      var teileKopieren = n === 4 && s === 5 && texte.teile.length > 1 && Object.keys(texte.kopiert).length < texte.teile.length;
      var offen = stand === "aktiv" || (stand === "erledigt" && (!!auf[n] || teileKopieren));
      sec.hidden = stand === "zu";
      sec.dataset.stand = stand;
      sec.classList.toggle("auf", offen);
      var b = sec.querySelector(".s-zeile");
      b.setAttribute("aria-expanded", String(offen));
      b.disabled = stand !== "erledigt";
      sec.querySelector(".s-fazit").textContent = stand === "erledigt" && Z.mappe ? fazit(n) : "";
      sec.querySelector(".s-nr").textContent = String(sichtbar.indexOf(n) + 1);
      zeichneHinweis(sec, n, stand === "aktiv");
    });
    $("hinweise-an").checked = hinweise.an;
    // Zweig 2: Kacheln, darunter im Zweig „Ich steuere“ Vorlagen, Karten und „Mehr einstellen“
    ["mach", "steuer"].forEach(function (w) { $("zweig-" + w).setAttribute("aria-pressed", String(z === w)); });
    $("steuer-teil").hidden = z !== "steuer";
    $("mach-teil").hidden = z !== "mach";
    $("vorlagen").hidden = inhalt();
    $("weiter-2").hidden = s > 2 || !z;
    $("weiter-3").hidden = s > 3;
    // Karten: im Zweig „Ich steuere“ unter Schritt 2, bis die erste Antwort da ist; danach unter Schritt 5 (beide Zweige)
    var ort = inhalt() ? $("karten-ort-5") : $("karten-ort-2");
    if ($("tafel-bausteine").parentNode !== ort) ort.appendChild($("tafel-bausteine"));
    $("tafel-bausteine").hidden = !(inhalt() || z === "steuer");
    $("karten").classList.toggle("kompakt", z !== "steuer");
    $("hinzufuegen").hidden = z !== "steuer";
    $("text-art").hidden = z !== "steuer";
    $("modus").hidden = z !== "steuer";
    document.querySelector(".spalte-rand").hidden = s < 5;
    document.querySelector(".seite").classList.toggle("mit-rand", s >= 5);
    $("weiter").hidden = !!Z.mappe || !$("weiter").dataset.da;
    $("weiter-5").hidden = !(s === 5 && inhalt() && !fehlerZahl() && !teileOffen());
    $("weiter-5").textContent = bildwuensche().length ? "Weiter zu den Bildern" : fragenListe.length ? "Weiter zu den Fragen und Lösungen" : "Weiter zur Datei";
    $("rueckmeldung").hidden = !(s >= 7 && Z.bau && Z.bau.mbz) && !$("rueckmeldung").dataset.offen;
    $("speichern").hidden = !Z.mappe;
    $("neue-einheit").hidden = !Z.mappe;
    $("schliessen").hidden = !Z.mappe;
    if (!Z.mappe) $("autosave-stand").textContent = "";
  }

  // Erledigte Zeile auf- und zuklappen
  document.querySelector(".spalte-haupt").addEventListener("click", function (ev) {
    var b = ev.target.closest(".s-zeile"); if (!b || b.disabled) return;
    var n = parseFloat(b.dataset.nr);
    auf[n] = !auf[n];
    zeichneSchritte();
    if (auf[n]) Array.prototype.forEach.call(document.querySelectorAll(".k-auftrag"), hoehe);
  });

  function gehe(n, fokus) {
    if (!Z.mappe) return;
    if (n > schritt()) erledigtBis(n);
    Z.mappe.schritt = n;
    auf = {};
    zeichne();
    autosave();
    var sec = sektion(n);
    if (sec && !sec.hidden) {
      sec.scrollIntoView({ block: "start" });
      var f = fokus ? $(fokus) : sec.querySelector(".s-inhalt button:not([hidden]):not(:disabled), .s-inhalt input, .s-inhalt textarea");
      if (f) f.focus({ preventScroll: true });
    }
  }

  // ---------------------------------------------------------------- 1 Worum geht es?
  function weiterAnzeigen() {
    km.autosaveLesen().then(function (r) {
      $("weiter").dataset.da = r ? "1" : "";
      $("weiter").hidden = !r || !!Z.mappe;
      if (!r) return;
      $("weiter-knopf").textContent = "Weiter mit „" + (r.titel || r.dateiname) + "“";
      $("weiter-zeit").textContent = "Zuletzt gesichert " + datumZeit(r.zeit);
      $("weiter-knopf").onclick = function () {
        oeffne(async function () { await km.mappeAusBytes(r.zip, null); }, "Wird geöffnet …");
      };
    }).catch(function () { $("weiter").hidden = true; });
  }
  weiterAnzeigen();
  // Adresse von der Landingpage: `?weiter=1` öffnet die gesicherte Einheit; `#thema=…&jahrgang=…&minuten=…` (Fragment,
  // bleibt im Browser; `?thema=…` als Rückfall des Formulars ohne Skript) füllt
  // Schritt 1 vor und legt die Einheit an, wenn ein Thema dabei ist (eine gesicherte Einheit wird vorher nicht
  // stillschweigend ersetzt). Die Parameter verschwinden danach aus der Adresse; replaceState legt keinen Eintrag an,
  // der Zurück-Knopf führt weiter zur Landingpage.
  (function () {
    var q = new URLSearchParams(location.search), h = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    if (h.has("thema") || h.has("jahrgang") || h.has("minuten")) q = h;
    var weiter = q.get("weiter") === "1", thema = (q.get("thema") || "").trim().slice(0, 120);
    var vor = q.has("thema") || q.has("jahrgang") || q.has("minuten");
    if (weiter || vor) history.replaceState(history.state, "", location.pathname + (q === h ? "" : location.hash));
    if (weiter) {
      km.autosaveLesen().then(function (r) { if (r) oeffne(async function () { await km.mappeAusBytes(r.zip, null); }); }).catch(function () {});
      return;
    }
    if (!vor) return;
    var min = parseInt(q.get("minuten"), 10);
    $("f-thema").value = thema;
    $("f-jahrgang").value = (q.get("jahrgang") || "").trim().slice(0, 12);
    $("f-minuten").value = min >= 10 && min <= 300 ? min : 45;
    if (!thema) { $("f-thema").focus(); return; }
    katalogDa.then(function () { return km.autosaveLesen().catch(function () { return null; }); }).then(function (r) {
      if (!r) { startAbsenden(); return; }
      frage("Einheit „" + (r.titel || r.dateiname) + "“ verwerfen? Was du nicht mit „Einheit speichern“ gesichert hast, geht verloren.",
        async function () {
          await km.autosaveLoeschen();
          $("weiter").dataset.da = ""; $("weiter").hidden = true;
          startAbsenden();
        });
    });
  })();

  $("start-form").onsubmit = function (ev) { ev.preventDefault(); startAbsenden(); };
  function startAbsenden() {
    var thema = $("f-thema").value.trim();
    if (!thema) { $("f-thema").focus(); return; }
    var e = { thema: thema, jahrgang: $("f-jahrgang").value.trim(), minuten: parseInt($("f-minuten").value, 10) || 45 };
    if (!katalog) return;
    if (!Z.mappe) { einheitAnlegen(e, katalog.vorlagen[0]); return; }
    if (Z.mappe.anhaengen && !Z.mappe.bausteine.some(function (k) { return k.einheit === Z.mappe.anhaengen; })) {
      einheitAnhaengen(e); return;
    }
    // Schritt 1 nachträglich geändert: Angaben übernehmen; ohne Inhalt die Bausteine der Vorlage neu rechnen
    Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}, e);
    if (!Z.mappe.anhaengen) Z.mappe.titel = thema;
    var v = vorlageNach(Z.mappe.einheit.vorlage);
    if (v && !inhalt() && Z.mappe.bausteine.every(function (k) { return k.geplant; })) karteVorlage(v);
    angaben.thema = thema; angaben.jahrgang = e.jahrgang; angaben.minuten = e.minuten;
    Z.mappe.schritt = Math.max(schritt(), 2);
    auf = {};
    zeichne();
    angabenSchreiben(Z.mappe.anhaengen ? { jahrgang: e.jahrgang } : { thema: thema, jahrgang: e.jahrgang, minuten: e.minuten });
  }

  function vorlageNach(name) { return katalog && katalog.vorlagen.filter(function (v) { return v.name === name; })[0]; }

  // Bausteinliste aus einer Einheitsvorlage: Phasen mit Typ-Vorschlag und Soll-Minuten. Bis 45 Minuten skaliert alles;
  // darüber wachsen nur die dehnbaren Phasen (Erarbeitung, Übung), Einstieg und Sicherung bleiben. `ab` = erste Nummer.
  function vorlageKarten(v, minuten, ab) {
    var faktor = Math.min(1, minuten / 45), dehnAnteil = 0, fest = 0;
    v.phasen.forEach(function (p) { if (p.dehnbar) dehnAnteil += p.anteil; else fest += p.anteil / 100 * 45 * faktor; });
    var rest = Math.max(0, minuten - fest), karten = [], n = (ab || 1) - 1;
    v.phasen.forEach(function (p) {
      var phMin = p.dehnbar ? rest * p.anteil / dehnAnteil : p.anteil / 100 * 45 * faktor;
      p.bausteine.forEach(function (b, k) {
        var schritt_ = b.indexOf(" | ") >= 0 ? b.slice(b.indexOf(" | ") + 3).trim() : "";   // Teilschritt für den Chat
        var kopf = schritt_ ? b.slice(0, b.indexOf(" | ")) : b;
        var teile = kopf.split(":"), typ = teile[0].trim();
        var titel = teile.length > 1 ? teile.slice(1).join(":").trim() : (p.bausteine.length > 1 ? p.phase + " " + (k + 1) : p.phase);
        n += 1;
        var karte = { id: "b" + n, typ: typ, titel: titel, abschnitt: null, minuten: null, auftrag: "", phase: p.phase,
          soll: Math.max(1, Math.round(phMin / p.bausteine.length)), geplant: true, neu: false, _dehnbar: !!p.dehnbar };
        if (schritt_) karte.schritt = schritt_;
        if (p.optional) karte.aus = true;           // optionale Phase: Karte da, aber ausgeschaltet
        karten.push(karte);
      });
    });
    var summe = karten.reduce(function (s, k) { return s + k.soll; }, 0), diff = minuten - summe;
    var groesste = karten.filter(function (k) { return k._dehnbar; }).sort(function (a, b) { return b.soll - a.soll; })[0];
    if (groesste && groesste.soll + diff >= 1) groesste.soll += diff;
    karten.forEach(function (k) { delete k._dehnbar; });
    return karten;
  }

  // Karten der Vorlage setzen (nur ohne Inhalt); Aufträge bleiben an gleicher Nummer stehen
  function karteVorlage(v) {
    var e = Z.mappe.einheit, alt = {};
    Z.mappe.bausteine.forEach(function (k) { if (k.auftrag) alt[k.id] = k.auftrag; });
    Z.mappe.bausteine = vorlageKarten(v, e.minuten || 45);
    Z.mappe.bausteine.forEach(function (k) { if (alt[k.id]) k.auftrag = alt[k.id]; });
    e.vorlage = v.name;
  }

  async function steckbriefAnlegen() {
    var o = katalog.oberflaeche, e = (Z.mappe && Z.mappe.einheit) || {};
    Z.steckbrief_text = await km.mappeFn("angaben_schreiben", ["", {
      thema: e.thema || "", jahrgang: e.jahrgang || "", minuten: e.minuten || "", fach: "", bilder: bilderStandard(),
      format: o.format[0].wert, vorlage: o.vorlage[0].wert, farbe: o.farbe[0].wert, website: o.website[0].wert,
      abschluss: o.abschluss[0].wert, portionierung: o.portionierung[0].wert }]);
  }

  function einheitAnlegen(e, v) {
    e.vorlage = v.name;
    Z.mappe = km.neueMappe(e.thema, e, vorlageKarten(v, e.minuten));
    Z.mappe.schritt = 2;
    Z.mappe.zeit_selbst = false;                   // Standard: das Modell verteilt die Minuten
    Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null; Z.beispiel = null;
    angaben = { thema: e.thema, jahrgang: e.jahrgang, minuten: e.minuten, vorlage: "schlicht", format: "themen", farbe: "" };
    neuStart();
    gehe(2, "zweig-mach");
    if (Z.geladen) neuPruefen().catch(zeigeFehler);
  }

  // Nächste Einheit: geplante Karten hinten an, mit neuen Nummern und dem Teil „e<n>“ (Nachlieferung beim Bau)
  function einheitAnhaengen(e) {
    var ids = {}, n = 1;
    Z.mappe.bausteine.forEach(function (k) { ids[k.id] = 1; });
    while (ids["b" + n]) n += 1;
    var alteEinheit = Z.mappe.einheit || {};
    var v = vorlageNach(alteEinheit.vorlage) || katalog.vorlagen[0];
    e.vorlage = v.name;
    var karten = vorlageKarten(v, e.minuten, n);
    karten.forEach(function (k) { k.einheit = Z.mappe.anhaengen; });
    Z.mappe.bausteine = Z.mappe.bausteine.concat(karten);
    Z.mappe.einheit = e;
    Z.mappe.laufend = Z.mappe.anhaengen;           // AP13.3: Text, Bilder und Rand gehören jetzt zu dieser Einheit
    delete Z.mappe.stueckelung;
    Z.mappe.durchsicht = false; delete Z.mappe.kopiert;
    Z.bau = null;
    neuStart();
    document.querySelector("input[name=text-art][value=leer]").checked = true;
    texte.art = "leer";
    gehe(2, zweig() ? "weiter-2" : "zweig-mach");
    if (Z.geladen) neuPruefen().catch(zeigeFehler);
  }

  // Zustand der Ansicht beim Wechsel der Kursdatei oder Einheit zurücksetzen
  function neuStart() {
    clearTimeout(kennzahlTimer); clearTimeout(textTimer); clearTimeout(eingabeTimer);
    texte.teile = []; texte.ids = []; texte.teil = 0; texte.art = "einheit"; texte.kopiert = {}; fragenListe = []; korrekturen = []; letzteAntwort = null;
    korrektur = { text: "", offen: false, stand: "", art: "" };
    $("korrektur-eingabe").value = ""; $("eingabe-stand").hidden = true;
    chatWahlOffen = false; auf = {};
    $("chat-text-feld").value = ""; $("gegen-text-feld").value = ""; $("gegen-antwort").value = "";
    $("gegen-ergebnis").innerHTML = ""; $("gegen-stand").textContent = ""; $("kopiert").textContent = "";
    $("eingabe-stand").textContent = ""; $("infobox").hidden = true; $("importiert-stand").hidden = true;
    diagnoseKarte($("eingabe-diagnose"), null); diagnoseKarte($("korrektur-diagnose"), null);
    document.querySelector("input[name=text-art][value=einheit]").checked = true;
  }

  async function oeffne(laden, text) {
    status(text || "Wird geöffnet …", "lauf");
    try {
      await km.bereit();
      await laden();
      neuStart();
      await neuPruefen();
      // Kursdatei ohne Schrittangabe (1.x-Ordner, ältere Kursdatei): Zweig „Ich steuere“, Schritt aus dem Stand
      if (!Z.mappe.zweig) Z.mappe.zweig = "steuer";
      if (!Z.mappe.schritt) {
        Z.mappe.schritt = !inhalt() ? (Z.mappe.chat ? 4 : 2) : fehlerZahl() ? 5
          : fragenListe.length && !Z.mappe.durchsicht ? 6 : 7;
      }
      zeichne();
      gehe(Z.mappe.schritt);
      status("Bereit", "ok");
    } catch (e) { zeigeFehler(e); }
  }
  function zeigeFehler(e) { status("Das hat nicht geklappt: " + fehlerText(e), "fehler"); }

  async function dateienLesen(files) {
    var out = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i], name = f.webkitRelativePath || f.name;
      // einzeln gewählte Bilder gehören nach assets/ (iPad, „Dateien wählen“)
      if (name.indexOf("/") < 0 && ["kurs.md", "steckbrief.yaml", "mappe.json"].indexOf(name) < 0) name = "assets/" + name;
      out[name] = new Uint8Array(await f.arrayBuffer());
    }
    return out;
  }
  function dateiWahl(ev) {
    var files = Array.prototype.slice.call(ev.target.files || []);
    ev.target.value = "";
    if (!files.length) return;
    if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
      oeffne(async function () { await km.mappeAusBytes(await files[0].arrayBuffer(), null); }, "Einheit wird geöffnet …");
    } else {
      oeffne(async function () { await km.mappeAusDateien(await dateienLesen(files), null); }, "Dateien werden geöffnet …");
    }
  }
  // Dateiwahl über Beschriftungen: auch mit der Tastatur erreichbar
  Array.prototype.forEach.call(document.querySelectorAll("label[for=datei-oeffnen], label[for=ordner-oeffnen]"), function (l) {
    l.tabIndex = 0; l.setAttribute("role", "button");
    l.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); $(l.htmlFor).click(); } });
  });
  $("datei-oeffnen").onchange = dateiWahl;
  $("ordner-oeffnen").onchange = dateiWahl;

  // ---------------------------------------------------------------- 2 Mach du / Ich steuere
  // Nächste Einheit (AP13.1): Aussehen und Chat sind vorbelegt, nach Schritt 2 geht es direkt zum Text für den Chat;
  // Schritt 3 steht dann als erledigte Zeile darüber
  function nachZwei() { return Z.mappe && Z.mappe.anhaengen && Z.mappe.aussehen && chatInfo(Z.mappe.chat) ? 4 : 3; }
  document.querySelector(".zweige").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-zweig]"); if (!b || !Z.mappe) return;
    Z.mappe.zweig = b.dataset.zweig;
    if (b.dataset.zweig === "mach") {
      // AP13.4: unter der Wahl zwei freiwillige Felder (Worum geht es genau?, Fach), dann „Weiter“
      if (schritt() <= 2) { zeichne(); geaendert(); $("m-kontext").focus({ preventScroll: true }); }
      else { auf[2] = true; zeichne(); geaendert(); }
    } else {
      if (schritt() <= 2) { zeichne(); geaendert(); var k = $("vorlagen").querySelector("button"); if (k && !inhalt()) k.focus({ preventScroll: true }); }
      else { auf[2] = true; zeichne(); geaendert(); }
    }
  });
  $("weiter-2").onclick = function () { gehe(nachZwei()); };

  function vorlagenZeigen() {
    var box = $("vorlagen"); box.innerHTML = "";
    katalog.vorlagen.forEach(function (v, i) {
      var b = el("button", { type: "button", cls: "vorlage", "data-vorlage": i, "aria-pressed": "false" }, [
        el("span", { cls: "vorlage-name", text: v.name }), el("span", { cls: "vorlage-zeile", text: v.zeile }),
        el("span", { cls: "vorlage-phasen", text: v.phasen.map(function (p) { return p.phase; }).join(" · ") })]);
      b.onclick = function () {
        if (!Z.mappe || inhalt()) return;
        karteVorlage(v);
        zeichne(); geaendert();
      };
      box.appendChild(b);
    });
  }

  // ---------------------------------------------------------------- 3 Aussehen (Kacheln mit Miniatur)
  function mischen(hex, anteil) {      // Akzent auf Weiß getönt (wie gen/html.py tint)
    var h = hex.replace("#", ""), r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    var m = function (c) { return Math.round(255 - (255 - c) * anteil); };
    return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
  }
  function akzent() { return FARBEN[angaben.farbe] || STANDARD_FARBE; }
  // Miniaturen nach den Token der Designvorlagen in gen/html.py (Rundung, Kartenform), nur Formen, kein Text
  function miniVorlage(wert, hue) {
    var r = { schlicht: 3, kacheln: 6, magazin: 0 }[wert], s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false">'
      + '<rect width="120" height="76" fill="#fff"/>'
      + '<rect x="8" y="7" width="104" height="15" rx="' + r + '" fill="' + hue + '"/>'
      + '<rect x="8" y="27" width="56" height="4" rx="1" fill="#0B1220"/>';
    [8, 63].forEach(function (x) {
      if (wert === "schlicht") s += '<rect x="' + x + '" y="37" width="49" height="31" rx="3" fill="#fff" stroke="#D5DAE3"/>';
      else if (wert === "kacheln") s += '<rect x="' + x + '" y="37" width="49" height="31" rx="6" fill="' + mischen(hue, 0.16) + '"/>';
      else s += '<rect x="' + x + '" y="37" width="49" height="1.6" fill="#17171A"/>';
      var ix = wert === "magazin" ? x : x + 5;
      s += '<rect x="' + ix + '" y="44" width="30" height="3" rx="1" fill="#5B6475"/><rect x="' + ix + '" y="51" width="38" height="3" rx="1" fill="#C3C8D2"/>'
        + '<rect x="' + ix + '" y="57" width="26" height="3" rx="1" fill="#C3C8D2"/>';
    });
    return s + "</svg>";
  }
  function miniFormat(wert, hue) {
    var s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><rect width="120" height="76" fill="#fff"/>';
    if (wert === "kacheln") {
      for (var i = 0; i < 6; i++) {
        var x = 8 + (i % 3) * 35, y = 8 + Math.floor(i / 3) * 31;
        s += '<rect x="' + x + '" y="' + y + '" width="32" height="28" rx="4" fill="' + mischen(hue, 0.18) + '"/>'
          + '<rect x="' + (x + 5) + '" y="' + (y + 19) + '" width="18" height="3" rx="1" fill="#0B1220"/>';
      }
    } else {
      [8, 30, 52].forEach(function (y, i) {
        s += '<rect x="8" y="' + y + '" width="104" height="17" rx="3" fill="' + (i ? "#F2F4F7" : mischen(hue, 0.18)) + '"/>'
          + '<rect x="14" y="' + (y + 7) + '" width="' + (46 - i * 8) + '" height="3" rx="1" fill="#0B1220"/>';
      });
    }
    return s + "</svg>";
  }
  function kachel(gruppe, wert, text, mini, gewaehlt, zeile) {
    var b = el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": String(gewaehlt), "data-feld": gruppe, "data-wert": wert });
    var m = el("span", { cls: "aus-mini" }); m.innerHTML = mini;      // eigenes SVG, keine Eingabe
    b.appendChild(m);
    b.appendChild(el("span", { cls: "aus-name", text: text }));
    if (zeile) b.appendChild(el("span", { cls: "aus-zeile", text: zeile }));
    return b;
  }
  // Kacheln werden einmal gebaut und danach nur umgeschaltet (aria-checked, Miniatur bei neuer Farbe): ein Neubau zwischen
  // mousedown und mouseup schluckte in Firefox den Klick, der Steckbrief blieb ohne die Wahl (CI 24.10.2026, AP13.3)
  function kachelGruppe(box, gruppe, werte, mini, gewaehlt) {
    var alt = box.querySelectorAll(".aus-kachel");
    if (alt.length !== werte.length || werte.some(function (w, i) { return alt[i].dataset.wert !== w.wert; })) {
      box.innerHTML = "";
      werte.forEach(function (w) { box.appendChild(kachel(gruppe, w.wert, w.text, "", false, w.zeile)); });
    }
    Array.prototype.forEach.call(box.querySelectorAll(".aus-kachel"), function (b, i) {
      b.setAttribute("aria-checked", String(werte[i].wert === gewaehlt));
      var m = b.querySelector(".aus-mini"), svg = mini(werte[i].wert);
      if (m.dataset.svg !== svg) { m.innerHTML = svg; m.dataset.svg = svg; }      // eigenes SVG, keine Eingabe
    });
  }
  function zeichneAussehen() {
    if (!katalog) return;
    var o = katalog.oberflaeche, hue = akzent();
    kachelGruppe($("aus-vorlage"), "vorlage", o.vorlage, function (w) { return miniVorlage(w, hue); }, angaben.vorlage || "schlicht");
    kachelGruppe($("aus-format"), "format", o.format.filter(function (w) { return AUS_FORMATE.indexOf(w.wert) >= 0; }),
      function (w) { return miniFormat(w, hue); }, angaben.format || "themen");
    kachelGruppe($("aus-farbe"), "farbe", o.farbe, function (w) {
      return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="16" fill="'
        + (FARBEN[w] || STANDARD_FARBE) + '"/>' + (w ? "" : '<circle cx="20" cy="20" r="7" fill="#fff"/>') + "</svg>";
    }, angaben.farbe || "");
    kachelGruppe($("aus-bilder"), "bilder", o.bilder, miniBilder, bilderWert());
    kachelGruppe($("aus-website"), "website", o.website, function (w) { return miniWebsite(w, hue); }, angaben.website || "textfeld");
  }
  // AP13.4: Miniaturen für die Bilder-Stufe (Zahl der Bildflächen) und die Darstellung der Übungen
  function miniBilder(wert) {
    var n = { "0": 0, "2-3": 2, "4-7": 4, "8+": 8 }[wert] || 0, s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><rect width="120" height="76" fill="#fff"/>';
    if (!n) s += '<rect x="20" y="20" width="80" height="36" rx="3" fill="none" stroke="#C3C8D2" stroke-dasharray="4 3"/>';
    for (var i = 0; i < n; i++) {
      var sp = n > 4 ? 4 : n, x = 8 + (i % sp) * (104 / sp), y = n > 4 ? 8 + Math.floor(i / 4) * 32 : 20;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (104 / sp - 6) + '" height="' + (n > 4 ? 28 : 36) + '" rx="3" fill="#D5DAE3"/>';
    }
    return s + "</svg>";
  }
  function miniWebsite(wert, hue) {
    var s = '<svg viewBox="0 0 120 50" aria-hidden="true" focusable="false"><rect width="120" height="50" fill="#fff"/>'
      + '<rect x="8" y="6" width="70" height="4" rx="1" fill="#0B1220"/>';
    if (wert === "textfeld") s += '<rect x="8" y="16" width="104" height="28" rx="4" fill="' + mischen(hue, 0.16) + '"/>'
      + '<rect x="14" y="23" width="40" height="3" rx="1" fill="#5B6475"/><rect x="14" y="31" width="60" height="3" rx="1" fill="#C3C8D2"/>';
    else [16, 31].forEach(function (y) { s += '<rect x="8" y="' + y + '" width="104" height="12" rx="3" fill="#F2F4F7"/><rect x="14" y="' + (y + 4) + '" width="9" height="4" rx="1" fill="' + hue + '"/><rect x="28" y="' + (y + 4) + '" width="40" height="3" rx="1" fill="#5B6475"/>'; });
    return s + "</svg>";
  }
  $("schritt-3").addEventListener("click", function (ev) {
    var b = ev.target.closest(".aus-kachel"); if (!b || !Z.mappe) return;
    var a = {}; a[b.dataset.feld] = b.dataset.wert;
    angaben[b.dataset.feld] = b.dataset.wert;
    zeichneAussehen(); felderFuellen();
    angabenSchreiben(a, true);
  });
  $("weiter-3").onclick = function () { if (Z.mappe) { Z.mappe.aussehen = true; gehe(4); } };

  // Schreiben nacheinander: schnelle Klicks auf mehrere Kacheln und das erste Anlegen dürfen sich den Steckbrief nicht
  // überschreiben; neuPruefen liest die Angaben erst, wenn die Kette leer ist
  function steckbriefSicher() {
    schreibKette = schreibKette.then(async function () { if (Z.mappe && !Z.steckbrief_text) await steckbriefAnlegen(); })
      .catch(zeigeFehler);
    return schreibKette;
  }
  function angabenSchreiben(a, mitStand) {
    schreibKette = schreibKette.then(function () { return angabenSchreibenJetzt(a, mitStand); });
    return schreibKette;
  }
  async function angabenSchreibenJetzt(a, mitStand) {
    try {
      await km.bereit();
      if (!Z.steckbrief_text) await steckbriefAnlegen();
      Z.steckbrief_text = await km.mappeFn("angaben_schreiben", [Z.steckbrief_text, a]);
      Object.assign(angaben, a);
      if (mitStand) { await km.stand(Z.kurs_md); if (inhalt()) { await auswertung(); zeichne(); } }   // AP13.4: Bilder-Stufe ändert die Prüfung
      zeichneAussehen(); zeichneSchritte();
      geaendert();
    } catch (e) { zeigeFehler(e); }
  }

  // ---------------------------------------------------------------- Prüfen und Zeichnen
  async function neuPruefen() {
    if (!Z.geladen) { zeichne(); return; }
    await steckbriefSicher();
    await km.stand(Z.kurs_md);
    for (var kette = null; kette !== schreibKette;) { kette = schreibKette; await kette; }
    var gelesen = await km.mappeFn("angaben_lesen", [Z.steckbrief_text]);
    if (kette === schreibKette) angaben = gelesen;    // sonst kam inzwischen ein Klick; dessen Werte gelten
    await auswertung();
    zeichne();
    autosave();
  }

  // Fragen und Lösungen, Korrekturbitten und Gegenprüf-Text zum aktuellen Prüfstand (Python)
  async function auswertung() {
    var pr = Z.pruefung || { bausteine: [], diagnosen: [] };
    fragenListe = await km.prompt("fragen", [pr]);
    korrekturen = await km.prompt("korrektur", [pr]);
    var fc = await km.prompt("fachcheck", [pr, Z.steckbrief_text]);
    $("gegen-text-feld").value = fc.text;
    Z.fragen = fragenListe; Z.korrekturen = korrekturen;
    korrektur.text = "";
    if (neuBeauftragt().length) korrekturSpaeter(0);
    textSpaeter(0);
  }

  function kennzahlenSpaeter() {
    clearTimeout(kennzahlTimer);
    kennzahlTimer = setTimeout(async function () {
      // ohne Prüfung (gerade geöffnete Kursdatei) rechnet neuPruefen die Kennzahlen selbst
      if (!Z.geladen || !Z.mappe || !Z.pruefung) return;
      var mappe = Z.mappe, pruefung = Z.pruefung;
      var k = await km.mappeFn("kennzahlen", [mappe, pruefung, null, Z.steckbrief_text]);
      if (mappe !== Z.mappe || pruefung !== Z.pruefung) return;     // inzwischen neu geprüft oder andere Kursdatei
      Z.kennzahlen = k;
      zeichneDiagnosen(); zeichneBilder();
    }, 300);
  }

  function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      if (!Z.geladen || !Z.mappe) return;
      km.autosaveSchreiben().then(function () { $("autosave-stand").textContent = "Zuletzt gesichert um " + zeit(Date.now()); })
        .catch(function () { $("autosave-stand").textContent = "Dieser Browser sichert nicht automatisch. Speichere die Einheit."; });
    }, 700);
  }

  function geaendert() { gespeichert = false; kennzahlenSpaeter(); autosave(); Z.bau = null; knoepfe(); textSpaeter(); }

  function zeichne() {
    zeichneSchritte();
    if (!Z.mappe || !katalog) { knoepfe(); return; }
    felderFuellen();
    Array.prototype.forEach.call(document.querySelectorAll(".vorlage"), function (b) {
      b.setAttribute("aria-pressed", String(katalog.vorlagen[b.dataset.vorlage].name === (Z.mappe.einheit || {}).vorlage));
    });
    var v = (Z.mappe.einheit || {}).vorlage;
    $("vorlage-zeile").textContent = inhalt() ? "Aufbau: " + (v || "eigener Aufbau") + ". Du kannst ihn ändern, bis die erste Antwort eingefügt ist."
      : "Wähle den Aufbau; die Bausteine darunter folgen ihm.";
    zeichneAussehen();
    zeichneKarten();
    zeichneDiagnosen();
    zeichneChat();
    zeichneKorrektur();
    zeichneTeile();
    zeichneBilder();
    zeichneFragen();
    zeichneWiederherstellen();
    rueckmeldungFuellen();
    knoepfe();
    zeichneSchritte();
  }

  function felderFuellen() {
    var e = Z.mappe.einheit || {};
    var werte = { "a-thema": e.thema || angaben.thema || "", "a-jahrgang": e.jahrgang || angaben.jahrgang || "",
      "a-minuten": e.minuten || angaben.minuten || "", "a-fach": angaben.fach || "", "a-schulart": angaben.schulart || "",
      "m-fach": angaben.fach || "", "a-kontext": angaben.kontext || "", "m-kontext": angaben.kontext || "",
      "a-format": angaben.format, "a-vorlage": angaben.vorlage, "a-farbe": angaben.farbe,
      "a-abschluss": angaben.abschluss, "a-portionierung": angaben.portionierung, "a-chat": Z.mappe.chat || "",
      "a-material": Z.mappe.material || "", "f-thema": e.thema || "", "f-jahrgang": e.jahrgang || "", "f-minuten": e.minuten || 45 };
    if (Z.mappe.anhaengen && !Z.mappe.bausteine.some(function (k) { return k.einheit === Z.mappe.anhaengen; })) {
      werte["f-thema"] = undefined; werte["f-minuten"] = undefined;    // nächste Einheit: Felder gehören der Lehrkraft
    }
    Object.keys(werte).forEach(function (id) {
      var f = $(id);
      if (document.activeElement === f || werte[id] === undefined) return;
      f.value = werte[id];
      if (f.tagName === "SELECT" && f.selectedIndex < 0) f.selectedIndex = 0;
    });
    var c = chatInfo(Z.mappe.chat);
    $("material-grenze").textContent = !c ? "" : c.eingabe_kb
      ? c.text + " nahm im Test " + c.eingabe_kb + " KB Text an; der Text für den Chat hat mit deinem Material etwa " + kb(textGroesse()) + "."
      : "Wie viel Text " + c.text + " annimmt, ist nicht gemessen. Halte das Material kurz.";
  }
  function textGroesse() { return texte.teile.length ? new Blob([texte.teile[0]]).size : 0; }

  // Dateinamen der Bilder, die ein Baustein nennt: `Bild:`, `Bildzeile:`, `bild:` (Banner, Geschichte), `· Bild:` (Lernkarten)
  function bildnamen(text) {
    var out = [], re = /(?:^|[·|]\s*|\s)(?:Bild|Bildzeile|bild|kachelbild):\s*([^\s|·]+\.(?:png|jpe?g))/gim, m;
    while ((m = re.exec(text || ""))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }

  // Bild für die Kursdatei: auf höchstens 1600 px lange Kante verkleinern und im Format des Dateinamens neu kodieren
  // (dabei fallen Metadaten wie Ort und Gerät weg)
  async function bildVorbereiten(datei, name) {
    var typ = /\.jpe?g$/i.test(name) ? "image/jpeg" : "image/png", quelle;
    try { quelle = await createImageBitmap(datei); }
    catch (e) {
      quelle = new Image(); var url = URL.createObjectURL(datei); quelle.src = url;
      await quelle.decode(); URL.revokeObjectURL(url);
    }
    var w0 = quelle.width || quelle.naturalWidth, h0 = quelle.height || quelle.naturalHeight;
    var f = Math.min(1, MAX_KANTE / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * f)), h = Math.max(1, Math.round(h0 * f));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    if (typ === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(quelle, 0, 0, w, h);
    var blob = await new Promise(function (r) { c.toBlob(r, typ, 0.86); });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), breite: w, hoehe: h };
  }

  // Bild in die Kursdatei (assets/), von der Karte oder aus dem Schritt Bilder; danach neu prüfen
  async function bildSetzen(datei, name) {
    try {
      var bild = await bildVorbereiten(datei, name);
      Z.assets[name] = bild.bytes;
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); }
  }

  // ---------------------------------------------------------------- Bilder (AP13.1)
  // Eine Zeile je Bildwunsch: Datei, Baustein, Status, beide Texte mit Kopierknopf, Hochladen und Ablagefläche
  function zeichneBilder() {
    var ol = $("bilder-liste"), w = bildwuensche();
    ol.innerHTML = "";
    var fehlen = 0;
    w.forEach(function (b, i) {
      var da = !!(b.datei && Z.assets[b.datei]);
      if (b.datei && !da) fehlen += 1;
      var nr = b.baustein ? Z.mappe.bausteine.findIndex(function (k) { return k.id === b.baustein; }) + 1 : 0;
      var text = function (art, titel, inhalt, knopf) {
        return inhalt ? el("div", { cls: "bild-text" }, [
          el("div", { cls: "bild-text-kopf" }, [el("span", { text: titel }),
            el("button", { type: "button", cls: "klein bild-kopieren", "data-nr": i, "data-art": art, text: knopf })]),
          el("p", { cls: art === "wunsch" ? "" : "von-chat", text: inhalt })]) : null;
      };
      ol.appendChild(el("li", { cls: "bild-zeile" + (da ? " da" : ""), "data-datei": b.datei || "" }, [
        el("p", { cls: "bild-kopf" }, [
          el("span", { cls: "bild-name", text: b.datei || "Bild ohne Dateinamen" }),
          el("span", { cls: "bild-baustein", text: nr ? "zu Baustein " + nr + " „" + b.titel + "“" : "kein Baustein nennt dieses Bild" }),
          el("span", { cls: "bild-status" }, [el("span", { cls: "punkt", "aria-hidden": "true" }), da ? "da" : "fehlt"])]),
        text("wunsch", "Was zu sehen ist", b.wunsch, "Beschreibung kopieren"),
        text("prompt", "Auftrag für einen Bildgenerator", b.prompt, "Auftrag kopieren"),
        b.datei ? el("div", { cls: "bild-ablage", "data-datei": b.datei }, [
          el("span", { text: "Bild hierher ziehen oder" }),
          el("label", { cls: "knopf klein-knopf" }, [da ? "Bild ersetzen" : "Bild hochladen",
            el("input", { type: "file", cls: "unsichtbar bild-datei", accept: "image/png,image/jpeg", "data-datei": b.datei })])]) : null,
        el("p", { cls: "stand bild-stand", role: "status" })]));
    });
    var bz = Z.kennzahlen && Z.kennzahlen.bilder;
    $("bilder-stufe").textContent = bz ? bz.stufe.charAt(0).toUpperCase() + bz.stufe.slice(1) + " gewählt, " + bz.zahl + " im Text" : "";
    $("weiter-bilder").textContent = fehlen ? "Ohne Bild weiter" : "Weiter";
    $("bilder-stand").textContent = !w.length ? "" : fehlen
      ? (fehlen === 1 ? "Ein Bild fehlt" : fehlen + " Bilder fehlen") + "; im Kurs steht dort ein grauer Platzhalter, bis du es nachlieferst."
      : "Alle Bilder sind da.";
    $("bilder-stand").className = "stand " + (fehlen ? "" : "ok");
  }
  $("bilder-liste").addEventListener("click", function (ev) {
    var b = ev.target.closest(".bild-kopieren"); if (!b) return;
    var w = bildwuensche()[parseInt(b.dataset.nr, 10)]; if (!w) return;
    var t = b.dataset.art === "wunsch" ? w.wunsch : w.prompt;
    $("bild-feld").value = t;
    kopieren(t, $("bild-feld"), b.closest(".bild-zeile").querySelector(".bild-stand"),
      b.dataset.art === "wunsch" ? "Kopiert. Damit findest du ein freies Bild oder zeichnest es." : "Kopiert. Füge den Auftrag in einen Bildgenerator ein.");
  });
  $("bilder-liste").addEventListener("change", function (ev) {
    if (!ev.target.classList.contains("bild-datei")) return;
    var f = ev.target.files && ev.target.files[0], name = ev.target.dataset.datei;
    ev.target.value = "";
    if (f) bildSetzen(f, name);
  });
  ["dragenter", "dragover"].forEach(function (art) {
    $("bilder-liste").addEventListener(art, function (ev) {
      var z = ev.target.closest(".bild-ablage"); if (!z) return;
      ev.preventDefault(); z.classList.add("ueber");
    });
  });
  $("bilder-liste").addEventListener("dragleave", function (ev) { var z = ev.target.closest(".bild-ablage"); if (z) z.classList.remove("ueber"); });
  $("bilder-liste").addEventListener("drop", function (ev) {
    var z = ev.target.closest(".bild-ablage"); if (!z) return;
    ev.preventDefault(); z.classList.remove("ueber");
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f && /^image\/(png|jpeg)$/.test(f.type)) bildSetzen(f, z.dataset.datei);
  });

  function pruefBaustein(id) { return Z.pruefung ? Z.pruefung.bausteine.filter(function (b) { return b.id === id; })[0] : null; }
  // Herkunft des Titels: geplante Karten und umbenannte Titel von der Lehrkraft, sonst vom Chat
  function titelHerkunft(k) { return k.geplant || (k.herkunft && k.herkunft.titel === "lehrkraft") ? "lehrkraft" : "chat"; }

  // Auswahl des Typs: zuerst „automatisch“, dann Gruppen nach Rolle (katalog.yaml `typgruppen`), Rest unter „Weitere“
  function typAuswahl(wert, label) {
    var s = el("select", { cls: "k-typ", "aria-label": label });
    s.appendChild(el("option", { value: AUTO, text: "Automatisch (der Chat wählt)", selected: wert === AUTO }));
    var gesehen = {};
    (katalog.typgruppen || []).forEach(function (g) {
      var og = el("optgroup", { label: g.name });
      g.typen.forEach(function (t) { gesehen[t] = 1; og.appendChild(el("option", { value: t, text: formularname(t), selected: t === wert })); });
      s.appendChild(og);
    });
    var rest = katalog.typen.filter(function (t) { return !gesehen[t.typ] && ["Badge", "Unterabschnitt", "Banner"].indexOf(t.typ) < 0; });
    if (rest.length) {
      var og = el("optgroup", { label: "Weitere" });
      rest.forEach(function (t) { og.appendChild(el("option", { value: t.typ, text: t.formularname, selected: t.typ === wert })); });
      s.appendChild(og);
    }
    return s;
  }
  // „+“ zwischen den Karten: fügt an dieser Stelle eine Karte mit Typ „automatisch“ ein
  function plus(pos) {
    return el("li", { cls: "k-zwischen" }, [el("button", { type: "button", cls: "k-plus", "data-pos": pos,
      "aria-label": "Baustein an Stelle " + (pos + 1) + " einfügen", title: "Baustein hier einfügen", text: "+" })]);
  }
  function isOptional(k) {
    var v = vorlageNach((Z.mappe.einheit || {}).vorlage);
    return !!(v && v.phasen.some(function (p) { return p.optional && p.phase === k.phase; }));
  }
  function neueId() {
    var ids = {}, n = 1;
    Z.mappe.bausteine.forEach(function (k) { ids[k.id] = 1; });
    while (ids["b" + n]) n += 1;
    return "b" + n;
  }

  function zeichneKarten() {
    var ol = $("karten"); ol.innerHTML = "";
    var liste = Z.mappe.bausteine, letzter = null, steuer = zweig() === "steuer";
    var abschnitte = liste.filter(function (k) { return k.abschnitt; }).map(function (k) { return k.abschnitt; });
    var mehrere = abschnitte.some(function (a) { return a !== abschnitte[0]; });
    var zeitplanung = zeitSelbst() && steuer;
    var zeitInfo = (Z.kennzahlen && Z.kennzahlen.zeit) || {};
    liste.forEach(function (k, i) {
      var abschnitt = mehrere && k.abschnitt && k.abschnitt !== letzter ? el("p", { cls: "k-abschnitt", text: "Abschnitt " + k.abschnitt }) : null;
      if (k.abschnitt) letzter = k.abschnitt;
      var b = pruefBaustein(k.id);
      var st = k.weggelassen ? "weggelassen" : k.geplant ? "leer" : (b ? b.status : "leer");
      var warten = st === "fehler" && teileOffen();     // AP13.3: rot erst, wenn alle Teile eingefügt sind
      if (warten) st = "wartet";
      var stText = { ok: "Geprüft", warnung: "Hinweis", fehler: "Fehler", leer: "Noch ohne Inhalt", wartet: "Eingefügt", weggelassen: "Weggelassen" }[st];
      var minuten = mitMinuten(k.typ);
      // Typ: „Ich steuere“ native Auswahl nach Rolle, „Mach du“ eine Beschriftung (Klick wechselt den Zweig)
      var typFeld = k.geplant && steuer ? typAuswahl(k.typ, "Typ von Baustein " + (i + 1))
        : !steuer ? el("button", { type: "button", cls: "k-typ k-typ-mach", "data-aktion": "steuern", title: "Ändern in „Ich steuere“", text: formularname(k.typ) })
        : el("span", { cls: "k-typ", text: formularname(k.typ) });
      var diag = el("ul", { cls: "k-diagnosen" });
      if (Z.pruefung && !k.geplant && !warten) {
        Z.pruefung.diagnosen.filter(function (d) { return d.baustein === k.id && d.stufe !== "hinweis"; }).forEach(function (d) {
          diag.appendChild(el("li", { cls: d.stufe, "data-regel": d.regel || "", text: (d.zeile_im_baustein ? "Zeile " + d.zeile_im_baustein + ": " : "") + d.text }));
        });
      }
      // AP13.4: derselbe Text wie in der Runde davor
      var sl = schleife()[k.id];
      if (sl && sl.gleich && st === "fehler") diag.appendChild(el("li", { cls: "warnung k-gleich", text: "Die Antwort für „" + k.titel + "“ ist dieselbe wie vorher (Runde " + sl.rot + ")." }));
      // Ist-Minuten aus dem Inhalt (Rolle und Jahrgang); Zeitfelder und die Lücke nur mit „Zeitplanung anzeigen“
      var z = zeitInfo[k.id], ist = null;
      if (minuten && z && z.gerechnet) {
        ist = el("span", { cls: "k-ist geschaetzt", text: "gerechnet " + z.gerechnet + " min" });
        if (z.abweichung && zeitplanung) diag.appendChild(el("li", { cls: "hinweis k-luecke", text: z.text }));
      } else if (minuten && b && b.minuten) ist = el("span", { cls: "k-ist geschaetzt", text: "im Inhalt " + b.minuten + " min" });
      var korrektur = korrekturen.filter(function (x) { return x.baustein === k.id; });   // Satz steht im Block, die Karte verlinkt
      var inhaltEl = null;
      if (b && !k.geplant) {
        var pre = el("pre", { cls: "k-text von-chat" }); pre.textContent = b.text;    // nur Text, nie HTML aus der Chat-Antwort
        inhaltEl = el("details", { cls: "k-inhalt" }, [el("summary", { text: "Inhalt ansehen" }), pre]);
      }
      // Bild hochladen an jeder Karte, deren Inhalt ein Bild nennt; ohne Bild bleibt der Platzhalter mit Hinweis
      var namen = b && !k.geplant ? bildnamen(b.text) : [];
      var hochladen = namen.length ? el("div", { cls: "k-bilder" }, namen.map(function (name) {
        var da = !!Z.assets[name];
        return el("label", { cls: "knopf klein-knopf" + (da ? " da" : "") }, [(da ? "Bild „" + name + "“ ersetzen" : "Bild „" + name + "“ hochladen"),
          el("input", { type: "file", cls: "unsichtbar k-bild", accept: "image/png,image/jpeg", "data-datei": name })]);
      })) : null;
      var herkunft = titelHerkunft(k);
      if (k.aus && !steuer && !k.weggelassen) return;  // ausgeschaltete Karte: nur in „Ich steuere“ sichtbar
      if (steuer && k.geplant) ol.appendChild(plus(i));
      var li = el("li", { cls: "karte status-" + st + (k.neu ? " neu" : "") + (minuten ? "" : " struktur") + (k.aus ? " aus" : ""), "data-id": k.id, id: "karte-" + k.id }, [
        abschnitt,
        el("div", { cls: "k-kopf" }, [
          el("span", { cls: "k-nr", text: String(i + 1) }), typFeld,
          el("span", { cls: "k-status", title: stText }, [el("span", { cls: "punkt", "aria-hidden": "true" }), stText])]),
        el("input", { cls: "k-titel von-" + herkunft, "data-herkunft": herkunft, type: "text", value: k.titel, readonly: !steuer,
          "aria-label": "Titel von Baustein " + (i + 1) + (herkunft === "chat" ? " (vom Chat)" : " (von dir)") }),
        minuten && zeitplanung ? el("div", { cls: "k-felder" }, [
          el("label", { cls: "k-phase-l" }, ["Phase ", el("input", { cls: "k-phase", type: "text", list: "phasen", value: k.phase || "" })]),
          el("label", { cls: "k-soll-l" }, ["Soll ", el("input", { cls: "k-soll", type: "number", min: "0", max: "300", inputmode: "numeric",
            value: k.soll === null || k.soll === undefined ? "" : k.soll }), " min"]), ist]) : null,
        k.geplant && steuer && !k.weggelassen && (k.aus || isOptional(k)) ? el("label", { cls: "schalter k-an-l" }, [el("input", { type: "checkbox", cls: "k-an", checked: !k.aus }),
          k.aus ? "Freiwillig, ausgeschaltet: einschalten" : "Freiwillig: verwenden"]) : null,
        steuer && !k.aus ? el("label", { cls: "k-auftrag-l" }, [el("span", { cls: "unsichtbar", text: "Auftrag für Baustein " + (i + 1) }),
          el("textarea", { cls: "k-auftrag von-lehrkraft", rows: "1", placeholder: "Was soll hinein? Ein Satz genügt (optional)" })]) : null,
        diag,
        korrektur.length && !warten ? el("p", { cls: "k-korrektur" }, [
          el("a", { href: "#korrektur", cls: "k-zur-korrektur", "data-aktion": "zur-korrektur", text: "Zur Korrektur unter dem Feld" })]) : null,
        st === "fehler" && ausweg(k.id) ? auswegBlock(k, b) : null,
        hochladen, inhaltEl,
        steuer ? el("div", { cls: "k-aktionen" }, [
          el("button", { type: "button", cls: "k-hoch klein", "data-aktion": "hoch", "aria-label": "Baustein " + (i + 1) + " nach oben", disabled: i === 0, text: "↑" }),
          el("button", { type: "button", cls: "k-runter klein", "data-aktion": "runter", "aria-label": "Baustein " + (i + 1) + " nach unten", disabled: i === liste.length - 1, text: "↓" }),
          k.geplant ? null : el("button", { type: "button", cls: "k-neu klein", "data-aktion": "neu",
            "aria-pressed": k.neu ? "true" : "false", text: "Diesen Baustein neu beauftragen" }),
          el("button", { type: "button", cls: "k-loeschen klein", "data-aktion": "loeschen", text: "Löschen" })]) : null]);
      var auftrag = li.querySelector(".k-auftrag");
      if (auftrag) auftrag.value = k.auftrag || "";
      var eigenes = li.querySelector(".ausweg-text");
      if (eigenes) eigenes.value = selbst[k.id].text;
      ol.appendChild(li);
    });
    if (steuer && liste.length && liste[liste.length - 1].geplant) ol.appendChild(plus(liste.length));
    if (!$("tafel-bausteine").hidden) Array.prototype.forEach.call(ol.querySelectorAll(".k-auftrag"), hoehe);
    $("karten-leer").hidden = liste.length > 0;
    $("zeit-selbst").checked = zeitSelbst();
    $("zeit-schalter").hidden = !steuer;
  }

  // ---------------------------------------------------------------- Schleife und Auswege (AP13.4 §3)
  // Je id merkt sich die Mappe den Hash des zuletzt eingefügten Texts (ohne Leerraum) und zählt die Korrekturrunden, nach
  // denen der Baustein rot blieb (`rot`), davon mit demselben Text (`gleich`). Ab zwei roten Runden stehen unter der Karte
  // drei Wege: weglassen, selbst anpassen, anderer Chat.
  var selbst = {};                    // id -> {text, meldungen}: offenes Feld „Selbst anpassen“
  function schleife() { return Z.mappe ? (Z.mappe.schleife = Z.mappe.schleife || {}) : {}; }
  function ausweg(id) { var e = schleife()[id]; return !!e && e.rot >= 2; }
  function textHash(t) {
    var s = String(t || "").replace(/\s+/g, ""), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + "." + s.length;
  }
  // Nach dem Einsetzen: `runde` = Antwort auf eine Korrektur (zählt), sonst eine neue Antwort im Hauptfeld (setzt zurück,
  // außer der Text ist derselbe wie vorher). -> Titel der Bausteine, deren Text derselbe ist wie vorher
  function schleifeMerken(ids, runde) {
    var sl = schleife(), gleich = [];
    ids.forEach(function (id) {
      var b = pruefBaustein(id); if (!b) return;
      var h = textHash(b.text), e = sl[id];
      if (b.status !== "fehler") { delete sl[id]; return; }
      var same = !!e && e.hash === h;
      // eine neue Antwort im Hauptfeld fängt neu an, außer sie bringt denselben Text wie vorher
      if (!runde && !same) { sl[id] = { hash: h, gleich: 0, rot: 0 }; return; }
      if (!e) { sl[id] = { hash: h, gleich: 0, rot: 1 }; return; }
      sl[id] = { hash: h, gleich: (e.gleich || 0) + (same ? 1 : 0), rot: (e.rot || 0) + 1 };
      if (same) gleich.push(b.titel);
    });
    return gleich;
  }
  function auswegBlock(k, b) {
    var offen = selbst[k.id];
    var weg = function (aktion, titel, satz) {
      return el("div", { cls: "ausweg-weg" }, [el("p", {}, [el("strong", { text: titel + ". " }), satz]),
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": aktion, text: titel })]);
    };
    var kinder = [el("p", { cls: "ausweg-titel", text: "So geht es weiter" }),
      weg("weglassen", "Baustein weglassen", "Die Einheit kommt ohne ihn aus; die Minuten stehen als Hinweis am Rand."),
      weg("selbst", "Selbst anpassen", "Du änderst den Text hier und übernimmst ihn; die Mühle prüft beim Schreiben."),
      weg("anderer-chat", "Anderer Chat", "Der Text für diesen Baustein liegt im Korrekturblock bereit; füge ihn in einem anderen Chat ein.")];
    if (offen) {
      kinder.push(el("label", { cls: "feld ausweg-feld" }, ["Kursdatei-Ausschnitt dieses Bausteins",
        el("textarea", { cls: "ausweg-text", rows: "8", spellcheck: "false" })]));
      kinder.push(el("ul", { cls: "ausweg-pruefung" }, (offen.meldungen || []).map(function (m) { return el("li", { cls: m.stufe, text: m.text }); })));
      kinder.push(el("button", { type: "button", cls: "knopf", "data-aktion": "selbst-uebernehmen", text: "Übernehmen" }));
    }
    return el("div", { cls: "ausweg", role: "group", "aria-label": "So geht es weiter" }, kinder);
  }
  var selbstTimer = null;
  async function selbstPruefen(id, text) {
    var pr = await km.mappeFn("antwort", [text]);
    var m = pr.diagnosen.filter(function (d) { return d.stufe !== "hinweis"; }).map(function (d) {
      return { stufe: d.stufe, text: (d.zeile_im_baustein ? "Zeile " + d.zeile_im_baustein + ": " : "") + d.text };
    });
    if (!pr.bausteine.length) m.unshift({ stufe: "fehler", text: "Kein Baustein: die erste Zeile ist die Überschrift `### Typ: Titel`." });
    if (!m.length) m = [{ stufe: "ok", text: "Geprüft, keine Fehler." }];
    if (!selbst[id]) return;
    selbst[id].meldungen = m;
    var ul = document.querySelector("#karte-" + CSS.escape(id) + " .ausweg-pruefung");
    if (ul) { ul.innerHTML = ""; m.forEach(function (x) { ul.appendChild(el("li", { cls: x.stufe, text: x.text })); }); }
  }
  async function auswegAktion(a, k) {
    var b = pruefBaustein(k.id);
    if (a === "weglassen") {
      rueckgaengig = { mappe: JSON.parse(JSON.stringify(Z.mappe)), kurs_md: Z.kurs_md, titel: k.titel };
      var z = (Z.kennzahlen && Z.kennzahlen.zeit && Z.kennzahlen.zeit[k.id]) || {};
      var minuten = (zeitSelbst() ? k.soll || (b && b.minuten) : (b && b.minuten) || z.gerechnet) || k.soll || 0;
      await km.bereit();
      Z.kurs_md = await km.mappeFn("entferne", [Z.kurs_md, k.id]);
      k.geplant = true; k.aus = true; k.weggelassen = { minuten: minuten }; k.neu = false;
      delete schleife()[k.id]; delete selbst[k.id];
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne(); geaendert();
      $("rueckgaengig-text").textContent = "„" + k.titel + "“ weggelassen.";
      $("rueckgaengig").hidden = false;
      $("rueckgaengig-knopf").focus();
    } else if (a === "selbst") {
      if (selbst[k.id]) { delete selbst[k.id]; zeichneKarten(); return; }
      selbst[k.id] = { text: b ? b.text : "", meldungen: [] };
      zeichneKarten();
      var f = document.querySelector("#karte-" + CSS.escape(k.id) + " .ausweg-text");
      if (f) f.focus();
      selbstPruefen(k.id, selbst[k.id].text);
    } else if (a === "selbst-uebernehmen") {
      var text = (selbst[k.id] || {}).text || "";
      if (!text.trim()) return;
      await km.bereit();
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text, k.id, true]);
      if (!r.ersetzt.length && !r.eingefuegt.length) { selbst[k.id].meldungen = [{ stufe: "fehler", text: r.fehler.join(" ") || "Der Text ergibt keinen Baustein." }]; zeichneKarten(); return; }
      await km.stand(r.kurs_md);
      delete selbst[k.id]; delete schleife()[k.id];
      await auswertung();
      zeichne(); geaendert();
      status("Baustein übernommen", "ok");
    } else if (a === "anderer-chat") {
      k.neu = true; delete schleife()[k.id];
      korrektur.text = ""; korrektur.offen = false;
      korrektur.stand = "Der Text für „" + k.titel + "“ steht oben im Korrekturblock. Wähle einen anderen Chat, kopiere ihn dort hinein und füge die Antwort hier ein.";
      korrektur.art = "";
      zeichne(); geaendert(); korrekturSpaeter(0);
      $("chat-aendern").click();
    }
  }

  function zeichneDiagnosen() {
    var k = Z.kennzahlen;
    zeichnePlanung();
    var setze = function (id, wert, warn) { var e = $(id); e.textContent = wert; e.parentNode.classList.toggle("warn", !!warn); };
    if (!k) {
      ["kz-minuten", "kz-folge", "kz-mc", "kz-rueckmeldung", "kz-uebung"].forEach(function (id) { setze(id, "–"); $(id).parentNode.hidden = false; });
      $("kz-zahl-z").hidden = true;
      $("hinweise").innerHTML = ""; $("hinweise-mehr").hidden = true;
      return;
    }
    var m = k.minuten, vorher = !k.inhalt;
    // vor der ersten Antwort gibt es keine Ist-Minuten: nur „45 Minuten geplant“ und die Zahl der Bausteine
    $("kz-minuten-t").textContent = vorher ? "Geplant" : "Minuten";
    $("kz-zahl-z").hidden = !vorher;
    ["kz-folge", "kz-mc", "kz-rueckmeldung", "kz-uebung"].forEach(function (id) { $(id).parentNode.hidden = vorher; });
    $("kz-zahl").textContent = String(k.bausteine);
    if (vorher) {
      var e = $("kz-minuten"); e.innerHTML = ""; e.parentNode.classList.remove("warn");
      e.appendChild(document.createTextNode((m.soll || "–") + " Minuten"));
    } else {
      var d = $("kz-minuten"); d.innerHTML = ""; d.parentNode.classList.toggle("warn", !!(m.soll && (m.ist > m.soll * 1.1 || m.ist < m.soll * 0.9)));
      d.appendChild(el("span", { cls: "geschaetzt", text: String(m.ist) }));
      if (m.soll) d.appendChild(document.createTextNode(" von " + m.soll + " geplant"));
    }
    setze("kz-folge", (k.folge.length ? k.folge.join(" → ") : "–") + (k.folge_brueche ? " (" + k.folge_brueche + " Schritt" + (k.folge_brueche > 1 ? "e" : "") + " zurück)" : ""), k.folge_brueche > 0);
    var f = k.fragen;
    setze("kz-mc", f.fragen ? k.mc_anteil + " % von " + f.fragen + " Fragen" : "keine Fragen", f.fragen && k.mc_anteil > 50);
    setze("kz-rueckmeldung", f.auswahl ? f.rueckmeldung + " von " + f.auswahl + " Auswahlfragen" : "–", f.auswahl && f.rueckmeldung < f.auswahl / 2);
    var u = k.uebungstypen || { zahl: 0, von: 0 };       // AP13.4: verschiedene Übungstypen gegen die angebotenen
    setze("kz-uebung", u.von ? u.zahl + " von " + u.von : "–", u.warn);
    var ul = $("hinweise"); ul.innerHTML = "";
    var alleH = teileOffen() ? k.hinweise.filter(function (h) { return h.stufe !== "fehler"; }) : k.hinweise;   // rot erst nach dem letzten Teil
    var liste = hinweiseAlle ? alleH : alleH.slice(0, 3);
    liste.forEach(function (h) {
      var li = el("li", { cls: h.stufe }, [h.baustein
        ? el("button", { type: "button", cls: "hinweis-link", "data-ziel": h.baustein, text: h.text }) : h.text]);
      ul.appendChild(li);
    });
    $("hinweise-mehr").hidden = alleH.length <= 3;
    $("hinweise-mehr").textContent = hinweiseAlle ? "Weniger anzeigen" : "Weitere " + (alleH.length - 3) + " anzeigen";
  }
  $("hinweise-mehr").onclick = function () { hinweiseAlle = !hinweiseAlle; zeichneDiagnosen(); };
  $("hinweise").onclick = function (ev) {
    var z = ev.target.closest("[data-ziel]");
    if (!z) return;
    zuKarte(z.dataset.ziel);
  };
  function zuKarte(id) {
    var ort = $("tafel-bausteine").closest(".schritt");
    if (ort && ort.dataset.stand === "erledigt" && !ort.classList.contains("auf")) { auf[ort.dataset.nr] = true; zeichneSchritte(); }
    var karte = $("karte-" + id);
    if (karte) { karte.scrollIntoView({ behavior: "smooth", block: "center" }); karte.querySelector(".k-titel").focus({ preventScroll: true }); }
  }

  // Schritt 7 (AP13.1): EIN Knopf baut die Datei und lädt sie herunter; ohne fertige Antwort gibt es ihn nicht
  function knoepfe() {
    var fehler = fehlerZahl(), voll = inhalt();
    // Fragen und Lösungen einmal ansehen (oder bewusst überspringen), bevor die Datei entsteht (Plan §10)
    var durchsicht = !fragenListe.length || !!(Z.mappe && Z.mappe.durchsicht);
    var fertig = !!(Z.bau && Z.bau.mbz);
    $("herunterladen").hidden = !(voll && !fehler && durchsicht) && !fertig;
    $("herunterladen").disabled = bauLaeuft;
    $("glossar-laden").hidden = !(fertig && Z.bau.glossare && Z.bau.glossare.length);
    var t = "";
    if (bauLaeuft) t = "Datei wird erstellt …";
    else if (!voll) t = "";
    else if (fehler) t = "In der Antwort " + (fehler === 1 ? "steht 1 Fehler" : "stehen " + fehler + " Fehler") + "; behebe sie in Schritt " + nrVon(5) + ".";
    else if (!durchsicht) t = "Sieh vorher in Schritt " + nrVon(6) + " die " + fragenListe.length + " Fragen und ihre Lösungen durch.";
    else if (fertig) t = "Die Datei ist heruntergeladen (" + Math.round(Z.bau.mbz.length / 1024) + " KB)" + (Z.bau.nachlieferung ? " und enthält nur die neue Einheit." : ".");
    else if (Z.bau && !Z.bau.mbz) t = "Die Datei ließ sich nicht erstellen: " + ((Z.bau.diagnosen || []).filter(function (d) { return d.stufe === "fehler"; }).map(function (d) { return d.text; })[0] || "");
    else if (!Z.geladen) t = "Wird vorbereitet …";
    $("erstellen-stand").textContent = t;
    $("speichern").disabled = !Z.geladen || !Z.mappe;
    $("wiederherstellen").hidden = !(Z.bau && Z.bau.mbz);
    $("weiter-5").hidden = !(schritt() === 5 && voll && !fehler && !teileOffen());
  }

  // ---------------------------------------------------------------- 6 Fragen und Lösungen
  var BUCHST = "ABCDEFGHIJ";
  function zeichneFragen() {
    var ol = $("fragen-liste"); ol.innerHTML = "";
    $("fragen-zeile").textContent = fragenListe.length
      ? fragenListe.length + " Fragen mit ihren Lösungen, ohne Rückmeldungen. Prüfe, ob jede Lösung stimmt."
      : "In dieser Einheit stehen noch keine Fragen.";
    var letzter = null;
    fragenListe.forEach(function (f) {
      var kopf = f.baustein !== letzter ? el("p", { cls: "f-baustein" }, [el("button", { type: "button", cls: "hinweis-link", "data-ziel": f.baustein, text: f.titel })]) : null;
      letzter = f.baustein;
      var loes = f.loesung.map(function (l) { return l[0]; });
      var optionen = f.art === "auswahl" || f.art === "zuordnen" ? el("ul", { cls: "f-optionen" }, f.optionen.map(function (o, i) {
        var richtig = loes.indexOf(o) >= 0;
        return el("li", { cls: richtig ? "richtig" : "" }, [(f.art === "auswahl" ? BUCHST[i] + ") " : "") + o, richtig ? el("span", { cls: "f-marke", text: " richtig" }) : null]);
      })) : null;
      var loesung = f.art === "auswahl" || f.art === "zuordnen" ? null
        : el("p", { cls: "f-loesung", text: "Lösung: " + f.loesung.map(function (l) { return l.join(" oder "); }).join("; ") });
      ol.appendChild(el("li", { cls: "frage" }, [kopf, el("p", { cls: "f-frage", text: (f.art === "rf" ? "Richtig oder falsch: " : "") + f.frage }), optionen, loesung]));
    });
  }
  $("fragen-liste").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) zuKarte(z.dataset.ziel); };
  function durchgesehen() { if (Z.mappe) { Z.mappe.durchsicht = true; geaendert(); gehe(7, "herunterladen"); } }
  $("durchsicht-ok").onclick = durchgesehen;
  $("ohne-durchsicht").onclick = durchgesehen;
  function nachBildern() {
    if (fragenListe.length && !Z.mappe.durchsicht) gehe(6, "durchsicht-ok"); else gehe(7, "herunterladen");
  }
  $("weiter-5").onclick = function () {
    if (!Z.mappe) return;
    if (bildwuensche().length) gehe(5.5); else nachBildern();
  };
  $("weiter-bilder").onclick = function () { if (Z.mappe) nachBildern(); };

  // ---------------------------------------------------------------- 4 Text für den Chat
  function textArt() {
    if (zweig() !== "steuer") return Z.mappe && Z.mappe.anhaengen ? "leer" : "einheit";
    return (document.querySelector("input[name=text-art]:checked") || {}).value || "einheit";
  }

  function zeichneChat() {
    var gewaehlt = !!(Z.mappe && Z.mappe.chat && chatInfo(Z.mappe.chat));
    $("chat-wahl").hidden = gewaehlt && !chatWahlOffen;
    $("chat-text").hidden = !gewaehlt || chatWahlOffen;       // „Anderer Chat“: nur die Kacheln, der Text bleibt erhalten
    Array.prototype.forEach.call(document.querySelectorAll("#chat-knoepfe [data-chat]"), function (b) {
      b.setAttribute("aria-pressed", String(gewaehlt && b.dataset.chat === Z.mappe.chat));
    });
    zeichnePlanung();
    if (!gewaehlt) return;
    var c = chatInfo(Z.mappe.chat);
    var eigene = Z.mappe.bausteine.filter(function (k) { return (k.einheit || "") === einheitTag(); });
    var leer = eigene.filter(function (k) { return k.geplant; }).length;
    var voll = eigene.filter(function (k) { return !k.geplant; }).length;
    $("art-leer-l").hidden = !(leer && voll);
    var art = document.querySelector("input[name=text-art]:checked");
    if (art && art.closest("label").hidden) document.querySelector("input[name=text-art][value=einheit]").checked = true;
    $("chat-aufwand").hidden = !c.aufwand;
    $("chat-aufwand").textContent = c.aufwand || "";
    var tw = $("teil-wahl"); tw.innerHTML = "";
    tw.hidden = texte.teile.length < 2;
    texte.teile.forEach(function (_, i) {
      tw.appendChild(el("button", { type: "button", cls: "klein teil-knopf", "data-teil": i, "aria-pressed": i === texte.teil ? "true" : "false",
        text: "Teil " + (i + 1) + (texte.kopiert[i] ? " (kopiert)" : "") }));
    });
    var t = texte.teile[texte.teil] || "";
    $("chat-zeile").textContent = !t ? (Z.geladen ? "Der Text entsteht …" : "Der Text entsteht, sobald die Seite bereit ist.")
      : "Für " + c.text + (texte.teile.length > 1 ? ", Teil " + (texte.teil + 1) + " von " + texte.teile.length + ". Je Teil: in dasselbe Gespräch einfügen, die Antwort in Schritt " + nrVon(5) + " übernehmen, dann der nächste Teil." : "") + " · " + kb(new Blob([t]).size);
    if ($("chat-text-feld").value !== t) $("chat-text-feld").value = t;
    $("text-kopieren").disabled = !t;
    $("text-kopieren").textContent = texte.teile.length > 1 ? "Teil " + (texte.teil + 1) + " kopieren" : "Text kopieren";
  }

  // Plan der Einheit (AP13.1, gen/mappe.py planung): zu wenig Karten für die Minuten oder eine Phase ohne Karte; Warnung
  // vor dem Kopieren mit „Vorlage auffüllen“ und an der Kartenliste, keine Sperre
  function planungText() {
    var p = Z.kennzahlen && Z.kennzahlen.planung;
    if (!p || (!p.zu_wenig && !p.fehlen.length)) return "";
    return [p.zu_wenig ? p.text + ". Bausteine ergänzen?" : ""].concat(p.fehlen.map(function (f) { return f + "."; })).filter(Boolean).join(" ");
  }
  function zeichnePlanung() {
    var t = planungText();
    $("kopier-warnung").hidden = !t || !Z.mappe || !chatInfo(Z.mappe.chat);
    $("kopier-warnung-text").textContent = t;
    $("karten-warnung").hidden = !t || zweig() !== "steuer";
    $("karten-warnung").textContent = t;
  }
  $("auffuellen").onclick = async function () {
    if (!Z.mappe) return;
    try {
      await km.bereit();
      Z.mappe = await km.mappeFn("auffuellen", [Z.mappe]);
      Z.kennzahlen = await km.mappeFn("kennzahlen", [Z.mappe, Z.pruefung, null, Z.steckbrief_text]);
      zeichne(); geaendert(); textSpaeter(0);
      $("kopiert").textContent = "Bausteine ergänzt. Sie stehen jetzt im Text unten.";
      $("kopiert").className = "stand ok";
    } catch (e) { zeigeFehler(e); }
  };

  function textSpaeter(ms) {
    clearTimeout(textTimer);
    textTimer = setTimeout(texteErzeugen, ms === undefined ? 400 : ms);
  }
  async function texteErzeugen() {
    if (!Z.geladen || !Z.mappe || !Z.mappe.chat) { if (Z.mappe) zeichneChat(); return; }
    var nr = ++texte.laeuft;
    var art = textArt();
    try {
      // Teile aus gen/prompt.py: nur die laufende Einheit; nach dem ersten Kopieren gilt die eingefrorene Stückelung
      var e = await km.prompt("einheit", [Z.mappe, Z.steckbrief_text, null, null, art === "leer"]);
      var teile = e.teile;
      if (nr !== texte.laeuft) return;           // ein neuerer Lauf ist schon unterwegs
      if (art !== texte.art || teile.length !== texte.teile.length) { texte.teil = 0; texte.kopiert = {}; }
      texte.art = art; texte.teile = teile; texte.ids = e.ids || [];
      if (texte.teil >= teile.length) texte.teil = 0;
      zeichneChat();
      felderFuellen();
    } catch (e) { zeigeFehler(e); }
  }

  $("chat-knoepfe").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-chat]"); if (!b || !Z.mappe) return;
    Z.mappe.chat = b.dataset.chat;
    chatWahlOffen = false;
    zeichneChat(); geaendert(); textSpaeter(0); zeichneSchritte();
    setTimeout(function () { var k = $("text-kopieren"); if (k) k.focus({ preventScroll: true }); }, 0);
  });
  // „Anderer Chat“ (AP13.1): zurück zu den Kacheln von Schritt 4, auch wenn Schritt 4 schon erledigt ist
  $("chat-aendern").onclick = function () {
    chatWahlOffen = true;
    if (schritt() > 4) auf[4] = true;
    zeichneSchritte(); zeichneChat();
    sektion(4).scrollIntoView({ block: "start" });
    var k = $("chat-knoepfe").querySelector("[aria-pressed=true]") || $("chat-knoepfe").querySelector("button");
    if (k) k.focus({ preventScroll: true });
  };
  Array.prototype.forEach.call(document.querySelectorAll("input[name=text-art]"), function (r) {
    r.addEventListener("change", function () { $("kopiert").textContent = ""; textSpaeter(0); });
  });
  $("teil-wahl").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-teil]"); if (!b) return;
    texte.teil = parseInt(b.dataset.teil, 10); $("kopiert").textContent = ""; zeichneChat();
  });

  // Text kopiert: Schritt 5 erscheint; bei gestückeltem Text springt die Auswahl auf den nächsten Teil
  function textKopiert() {
    var kopierterTeil = texte.teil + 1;
    texte.kopiert[texte.teil] = true;
    if (!Z.mappe) return;
    Z.mappe.kopiert = true;
    // AP13.3: beim ersten Kopieren eines gestückelten Textes Teilzahl und Zuordnung der Karten einfrieren
    if (texte.teile.length > 1 && !Z.mappe.stueckelung) {
      Z.mappe.stueckelung = { einheit: einheitTag() || null, leer: texte.art === "leer", ids: texte.ids, eingefuegt: [] };
    }
    var naechster = texte.teile.length > 1 ? texte.teile.findIndex(function (_, i) { return !texte.kopiert[i]; }) : -1;
    if (schritt() < 5) { erledigtBis(5); Z.mappe.schritt = 5; auf = {}; }
    zeichne(); autosave();
    if (naechster >= 0) {
      texte.teil = naechster; zeichneChat();
      $("kopiert").textContent = "Teil " + kopierterTeil + " kopiert. Füge ihn " + (kopierterTeil === 1 ? "in ein neues Gespräch" : "in dasselbe Gespräch") + " ein und die Antwort in Schritt " + nrVon(5)
        + "; danach kommt Teil " + (naechster + 1) + " dran.";
    }
  }
  function textKopieren() { kopieren($("chat-text-feld").value, $("chat-text-feld"), $("kopiert"), KOPIERT, textKopiert); }
  // Vor dem ersten Kopieren einmal die Infobox (Rechte am Material, Nutzungsbedingungen des Chats)
  $("text-kopieren").onclick = function () {
    if (!infoboxAus) { $("infobox").hidden = false; $("infobox-ok").focus(); return; }
    textKopieren();
  };
  $("infobox-ok").onclick = function () {
    $("infobox").hidden = true;
    if ($("infobox-nie").checked) { infoboxAus = true; km.einstellung("infobox_aus", true).catch(function () {}); }
    else infoboxAus = true;                      // in dieser Sitzung nicht noch einmal
    textKopieren();
  };

  // ---------------------------------------------------------------- Karten bearbeiten
  function karteVon(t) { var li = t.closest(".karte"); return li ? Z.mappe.bausteine.filter(function (k) { return k.id === li.dataset.id; })[0] : null; }

  $("karten").addEventListener("input", function (ev) {
    var k = karteVon(ev.target); if (!k) return;
    var c = ev.target.classList;
    if (c.contains("ausweg-text")) {
      if (selbst[k.id]) selbst[k.id].text = ev.target.value;
      clearTimeout(selbstTimer);
      var id = k.id, t = ev.target.value;
      selbstTimer = setTimeout(function () { selbstPruefen(id, t).catch(zeigeFehler); }, 400);
      return;
    }
    if (c.contains("k-phase")) k.phase = ev.target.value;
    else if (c.contains("k-soll")) k.soll = ev.target.value === "" ? null : Math.max(0, parseInt(ev.target.value, 10) || 0);
    else if (c.contains("k-auftrag")) {
      k.auftrag = ev.target.value; hoehe(ev.target);
      if (k.neu) korrekturSpaeter();           // neu beauftragt: Text im Korrekturblock folgt dem Auftrag
    }
    else return;
    geaendert();
  });

  // Titel übernehmen: bei change (Fokus verlässt das Feld) und bei Enter; Safari löst bei Enter kein change aus
  var umbenennenLaeuft = {};
  async function titelUebernehmen(feld) {
    var k = karteVon(feld); if (!k || umbenennenLaeuft[k.id] || feld.readOnly) return;
    var titel = feld.value.replace(/\s+/g, " ").trim();
    if (!titel || titel === k.titel) { feld.value = k.titel; return; }
    if (k.geplant) { k.titel = titel; geaendert(); return; }
    umbenennenLaeuft[k.id] = true;
    try {
      await km.bereit();
      var md = await km.mappeFn("umbenennen", [Z.kurs_md, k.id, titel]);
      k.titel = titel; k.herkunft = { titel: "lehrkraft" };      // bleibt, bis der Chat den Titel ersetzt
      await km.stand(md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); feld.value = k.titel; }
    finally { delete umbenennenLaeuft[k.id]; }
  }

  $("karten").addEventListener("change", async function (ev) {
    var k = karteVon(ev.target); if (!k) return;
    if (ev.target.classList.contains("k-typ")) { k.typ = ev.target.value; zeichneKarten(); geaendert(); return; }
    if (ev.target.classList.contains("k-an")) { if (ev.target.checked) delete k.aus; else k.aus = true; zeichneKarten(); geaendert(); return; }
    if (ev.target.classList.contains("k-titel")) { titelUebernehmen(ev.target); return; }
    if (ev.target.classList.contains("k-bild")) {
      var f = ev.target.files && ev.target.files[0], name = ev.target.dataset.datei;
      ev.target.value = "";
      if (f) bildSetzen(f, name);
    }
  });
  $("karten").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.classList.contains("k-titel")) { ev.preventDefault(); titelUebernehmen(ev.target); }
  });

  $("karten").addEventListener("click", async function (ev) {
    var p = ev.target.closest(".k-plus");
    if (p) {
      var pos = parseInt(p.dataset.pos, 10), id = neueId();
      Z.mappe.bausteine.splice(pos, 0, { id: id, typ: AUTO, titel: "Neuer Baustein", abschnitt: null, minuten: null, auftrag: "",
        phase: (Z.mappe.bausteine[Math.max(0, pos - 1)] || {}).phase || "", soll: null, geplant: true, neu: false });
      zeichne(); geaendert();
      var a = document.querySelector("#karte-" + CSS.escape(id) + " .k-auftrag");
      if (a) a.focus();
      return;
    }
    var knopf = ev.target.closest("[data-aktion]"); if (!knopf) return;
    if (knopf.dataset.aktion === "steuern") { Z.mappe.zweig = "steuer"; auf[2] = schritt() > 2; zeichne(); geaendert(); return; }
    var k = karteVon(knopf); if (!k) return;
    var liste = Z.mappe.bausteine, i = liste.indexOf(k), a = knopf.dataset.aktion;
    try {
      if (a === "zur-korrektur") { ev.preventDefault(); zurKorrektur(); }
      else if (["weglassen", "selbst", "selbst-uebernehmen", "anderer-chat"].indexOf(a) >= 0) await auswegAktion(a, k);
      else if (a === "neu") {
        // „Diesen Baustein neu beauftragen“ (AP13.3): markiert die Karte; Text, Antwort und Einsetzen laufen über den
        // einen Korrekturblock, mehrere Karten zugleich
        if (k.neu) k.neu = false; else k.neu = true;
        korrektur.text = ""; zeichneKarten(); zeichneKorrektur(); geaendert(); korrekturSpaeter(0);
        var af = document.querySelector("#karte-" + CSS.escape(k.id) + " .k-auftrag");
        if (k.neu && af) af.focus({ preventScroll: true });
      } else if (a === "hoch" || a === "runter") {
        var j = a === "hoch" ? i - 1 : i + 1;
        if (j < 0 || j >= liste.length) return;
        if (k.geplant || liste[j].geplant) {
          liste[i] = liste[j]; liste[j] = k;          // ohne Inhalt: nur die Reihenfolge der Karten
        } else {
          await km.bereit();
          Z.kurs_md = await km.mappeFn("verschiebe", [Z.kurs_md, k.id, a === "hoch" ? -1 : 1]);
          await km.stand(Z.kurs_md);
        }
        zeichne(); geaendert();
        var neuKnopf = document.querySelector("#karte-" + CSS.escape(k.id) + " .k-" + a);
        if (neuKnopf && !neuKnopf.disabled) neuKnopf.focus();
      } else if (a === "loeschen") {
        rueckgaengig = { mappe: JSON.parse(JSON.stringify(Z.mappe)), kurs_md: Z.kurs_md, titel: k.titel };
        if (k.geplant) liste.splice(i, 1);
        else {
          await km.bereit();
          Z.kurs_md = await km.mappeFn("entferne", [Z.kurs_md, k.id]);
          await km.stand(Z.kurs_md);
          await auswertung();
        }
        zeichne(); geaendert();
        $("rueckgaengig-text").textContent = "„" + rueckgaengig.titel + "“ gelöscht.";
        $("rueckgaengig").hidden = false;
        $("rueckgaengig-knopf").focus();
      }
    } catch (e) { zeigeFehler(e); }
  });

  $("rueckgaengig-knopf").onclick = async function () {
    if (!rueckgaengig) return;
    Z.mappe = rueckgaengig.mappe; Z.kurs_md = rueckgaengig.kurs_md; rueckgaengig = null;
    try { if (Z.geladen) { await km.stand(Z.kurs_md); await auswertung(); } zeichne(); geaendert(); } catch (e) { zeigeFehler(e); }
    $("rueckgaengig").hidden = true;          // erst nach dem Neuzeichnen, dann ist die Liste wieder bedienbar
  };

  $("neu-hinzufuegen").onclick = function () {
    var typ = $("neu-typ").value, id = neueId();
    Z.mappe.bausteine.push({ id: id, typ: typ, titel: typ === AUTO ? "Neuer Baustein" : formularname(typ), abschnitt: null, minuten: null, auftrag: "",
      phase: "", soll: null, geplant: true, neu: false });
    zeichne(); geaendert();
    var neu = $("karte-" + id);
    if (neu) { neu.scrollIntoView({ block: "center" }); neu.querySelector(".k-titel").focus({ preventScroll: true }); }
  };

  $("zeit-selbst").addEventListener("change", function () {
    if (!Z.mappe) return;
    Z.mappe.zeit_selbst = $("zeit-selbst").checked;
    zeichneKarten(); geaendert();
  });

  // ---------------------------------------------------------------- Verwerfen: gesicherte Einheit, offene Einheit
  var verwerfenAktion = null;
  function frage(text, aktion) {
    verwerfenAktion = aktion;
    $("verwerfen-text").textContent = text;
    $("verwerfen-frage").hidden = false;
    $("verwerfen-nein").focus();
  }
  $("verwerfen-nein").onclick = function () { $("verwerfen-frage").hidden = true; verwerfenAktion = null; };
  $("verwerfen-ja").onclick = async function () {
    $("verwerfen-frage").hidden = true;
    var a = verwerfenAktion; verwerfenAktion = null;
    if (a) { try { await a(); } catch (e) { zeigeFehler(e); } }
  };
  $("weiter-weg").onclick = function () {
    var titel = $("weiter-knopf").textContent.replace(/^Weiter mit /, "");
    frage("Einheit " + titel + " verwerfen? Sie ist nur in diesem Browser gesichert.", async function () {
      await km.autosaveLoeschen();
      $("weiter").dataset.da = ""; $("weiter").hidden = true;
      $("f-thema").focus();
    });
  };
  $("schliessen").onclick = function () {
    var titel = (Z.mappe && ((Z.mappe.einheit && Z.mappe.einheit.thema) || Z.mappe.titel)) || "";
    frage("Einheit „" + titel + "“ schließen? " + (gespeichert ? "Die Einheit hast du gespeichert; die Sicherung im Browser wird gelöscht."
      : "Was du nicht mit „Einheit speichern“ gesichert hast, geht verloren."), async function () {
      clearTimeout(autosaveTimer);
      await km.autosaveLoeschen();
      leeren();
      weiterAnzeigen();
    });
  };

  // ---------------------------------------------------------------- Kursangaben („Mehr einstellen“)
  var FELDER = { "a-thema": "thema", "a-jahrgang": "jahrgang", "a-minuten": "minuten", "a-fach": "fach", "a-schulart": "schulart",
    "a-format": "format", "a-vorlage": "vorlage", "a-farbe": "farbe", "a-abschluss": "abschluss",
    "a-portionierung": "portionierung", "a-kontext": "kontext" };
  $("mehr").addEventListener("change", async function (ev) {
    if (!Z.mappe) return;
    if (ev.target.id === "a-chat") {
      Z.mappe.chat = ev.target.value || null;
      if (!Z.mappe.chat) delete Z.mappe.chat;
      zeichne(); geaendert(); textSpaeter(0);
      return;
    }
    var feld = FELDER[ev.target.id]; if (!feld) return;
    var wert = ev.target.value;
    if (feld === "minuten") wert = parseInt(wert, 10) || "";
    if (["thema", "jahrgang", "minuten"].indexOf(feld) >= 0) {
      Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}); Z.mappe.einheit[feld] = wert;
      if (feld === "thema") Z.mappe.titel = wert;
    }
    angaben[feld] = wert;
    zeichne();
    var a = {}; a[feld] = wert;
    angabenSchreiben(a, feld === "farbe" || feld === "vorlage");
  });
  // AP13.4: Kontext in „Mach du“ (Worum geht es genau?, Fach) schreibt dieselben Angaben wie „Mehr einstellen“
  var kontextTimer = null, kontextOffen = {};
  function kontextSchreiben(feld, wert) {
    if (!Z.mappe) return;
    angaben[feld] = wert; kontextOffen[feld] = wert;
    clearTimeout(kontextTimer);
    kontextTimer = setTimeout(function () { var a = kontextOffen; kontextOffen = {}; angabenSchreiben(a); textSpaeter(); }, 400);
  }
  $("m-kontext").addEventListener("input", function () { kontextSchreiben("kontext", $("m-kontext").value); });
  $("m-fach").addEventListener("input", function () { kontextSchreiben("fach", $("m-fach").value.trim()); });
  $("a-material").addEventListener("input", function () {
    if (!Z.mappe) return;
    Z.mappe.material = $("a-material").value;
    geaendert();
  });

  // ---------------------------------------------------------------- 5 Antwort des Chats
  function gewaehlterModus() { return (document.querySelector("input[name=modus]:checked") || {}).value || "ersetzen"; }
  function setzeModus(m) { var r = document.querySelector("input[name=modus][value=" + m + "]"); if (r) r.checked = true; }
  var MODUS_TEXT = { ersetzen: "Einheit ersetzt", baustein: "nur diese Bausteine ersetzt", anhaengen: "als weitere Einheit angehängt" };

  // Antwort mit einem Modus einsetzen; vorher den Stand sichern, damit ein anderer Modus von dort aus neu einsetzt
  async function einsetzen(text, modus, vorher) {
    Z.mappe = JSON.parse(JSON.stringify(vorher.mappe)); Z.kurs_md = vorher.kurs_md;
    var neu, meldung = "";
    if (modus === "baustein") {
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text]);
      if (!r.ersetzt.length && !r.eingefuegt.length) {
        await km.stand(Z.kurs_md);
        return { ok: false, text: r.fehler.join(" ") || "Kein Baustein passte zu einer Karte." };
      }
      var ids = r.ersetzt.concat(r.eingefuegt);
      neu = r.kurs_md;
      await km.stand(neu);
      Z.mappe.bausteine.forEach(function (k) { if (ids.indexOf(k.id) >= 0) k.neu = false; });
      if (r.fehler.length) meldung = " " + r.fehler.join(" ");
      return { ok: true, n: ids.length, ids: ids, text: meldung };
    }
    // nächste Einheit: hinten an, jeder Abschnitt mit `teil: e<n>` (Nachlieferung)
    if (modus === "anhaengen") neu = await km.mappeFn("anhaengen", [Z.kurs_md, text, Z.mappe.anhaengen || null]);
    else neu = (await km.mappeFn("antwort", [text])).kursdatei;
    var pr = await km.stand(neu);
    if (modus === "anhaengen" && Z.mappe.anhaengen) delete Z.mappe.anhaengen;
    return { ok: true, n: pr.bausteine.length, text: "" };
  }

  // Meldung unter einem Einfügefeld als Karte mit Rahmen (AP13.3, Fremdtest: eine Zeile wurde übersehen)
  function standKarte(e, text, art) {
    e.hidden = !text; e.textContent = text || "";
    e.className = "stand-karte" + (art ? " " + art : "");
  }
  // Antwort ohne Bausteine (AP13.4, gen/prompt.py diagnose): ohne Überschrift und Typzeile der bisherige Satz, sonst die
  // ersten drei Meldungen des Parsers mit Zeile und Zitat und derselbe Inhalt als Satz für den Chat zum Kopieren
  function mitCode(text) {
    var out = [];
    String(text || "").split("`").forEach(function (t, i) { if (t) out.push(i % 2 ? el("code", { text: t }) : t); });
    return out;
  }
  function diagnoseKarte(box, d) {
    box.innerHTML = "";
    box.hidden = !d;
    if (!d) return;
    if (d.leer) {
      box.appendChild(el("p", { text: "Im Text stehen keine Bausteine. " + (d.tipp ? d.tipp + "." : "Kopiere die ganze Antwort mit dem Kopierknopf des Chats.") }));
      return;
    }
    box.appendChild(el("p", { text: "Die Mühle findet in der Antwort keinen Baustein:" }));
    box.appendChild(el("ul", {}, d.meldungen.map(function (m) {
      return el("li", { cls: "diagnose-zeile" }, [m.zeile ? "Zeile " + m.zeile + ": " : "", m.zitat ? el("code", { text: m.zitat }) : null,
        m.zitat ? ", " : ""].concat(mitCode(m.text)));
    })));
    var feld = el("textarea", { cls: "unsichtbar", readonly: true, "aria-hidden": "true", tabindex: "-1" });
    feld.value = d.satz;
    var stand = el("p", { cls: "stand", role: "status" });
    var knopf = el("button", { type: "button", cls: "knopf diagnose-kopieren", text: "Satz für den Chat kopieren" });
    knopf.onclick = function () { kopieren(d.satz, feld, stand, "Kopiert. Füge ihn in deinen Chat ein und die Antwort hier ein."); };
    box.appendChild(el("div", { cls: "kopieren" }, [knopf]));
    box.appendChild(stand);
    box.appendChild(feld);
  }

  // Hat die Lehrkraft den eigenen Satz oder Text der Mühle eingefügt statt der Antwort des Chats?
  function eigenerText(text) {
    var t = String(text || "").trim();
    if (!t) return "";
    var gleich = function (x) { x = String(x || "").trim(); return !!x && (x === t || (t.length >= 40 && x.indexOf(t) >= 0) || (t.length >= 200 && t.indexOf(x.slice(0, 200)) >= 0)); };
    if (gleich(korrektur.text) || korrekturen.some(function (k) { return gleich(k.satz); })) return "satz";
    if (texte.teile.some(gleich)) return "text";
    return "";
  }
  var EIGEN = { satz: "Das ist der Satz für deinen Chat; füge ihn dort ein und kopiere seine Antwort hierher.",
    text: "Das ist der Text für deinen Chat; füge ihn dort ein und kopiere seine Antwort hierher." };

  // Gestückelter Text (AP13.3): welcher Teil kam? Der mit den meisten ids der Antwort (eine ergänzte id b7-2 zählt zu
  // b7), sonst der erste, der noch fehlt. Sind alle da, endet die Stückelung und die roten Karten erscheinen.
  function teilEingefuegt(ids) {
    var st = Z.mappe && Z.mappe.stueckelung;
    if (!st || !st.ids) return;
    st.eingefuegt = st.eingefuegt || [];
    var basis = function (x) { return String(x).replace(/-\d+$/, ""); };
    var best = -1, treffer = 0;
    st.ids.forEach(function (teil, i) {
      var n = (ids || []).filter(function (x) { return teil.indexOf(x) >= 0 || teil.indexOf(basis(x)) >= 0; }).length;
      if (n > treffer) { treffer = n; best = i; }
    });
    if (best < 0) best = st.ids.findIndex(function (_, i) { return st.eingefuegt.indexOf(i) < 0; });
    if (best >= 0 && st.eingefuegt.indexOf(best) < 0) st.eingefuegt.push(best);
    // schrieb der Chat mehrere Teile auf einmal, gilt jeder Teil als da, dessen Karten alle Inhalt haben
    st.ids.forEach(function (teil, i) {
      if (st.eingefuegt.indexOf(i) < 0 && teil.every(function (id) { var k = karteNach(id); return !k || !k.geplant; })) st.eingefuegt.push(i);
    });
    if (st.eingefuegt.length >= st.ids.length) delete Z.mappe.stueckelung;
  }
  function naechsterTeil() {
    var st = Z.mappe && Z.mappe.stueckelung;
    return st ? st.ids.findIndex(function (_, i) { return (st.eingefuegt || []).indexOf(i) < 0; }) : -1;
  }
  function zeichneTeile() {
    var offen = teileOffen() && inhalt();
    $("teil-stand").hidden = !offen;
    if (!offen) return;
    var st = Z.mappe.stueckelung, n = naechsterTeil(), da = (st.eingefuegt || []).length;
    $("teil-stand-text").textContent = (da === 1 ? "Teil " + (st.eingefuegt[0] + 1) : da + " Teile") + " von " + st.ids.length
      + " eingefügt, jetzt Teil " + (n + 1) + " kopieren.";
    var bereitText = texte.teile.length === st.ids.length && !!texte.teile[n];
    $("teil-weiter").textContent = "Teil " + (n + 1) + " kopieren";
    $("teil-weiter").disabled = !bereitText;
  }
  $("teil-weiter").onclick = function () {
    var n = naechsterTeil();
    if (n < 0 || !texte.teile[n]) return;
    texte.teil = n; zeichneChat();             // Feld „Text ansehen“ trägt jetzt diesen Teil (Rückfall ohne Zwischenablage)
    kopieren(texte.teile[n], $("chat-text-feld"), $("teil-kopiert"), "Kopiert. Füge Teil " + (n + 1)
      + " in dasselbe Gespräch ein und die Antwort des Chats oben ins Feld.", function () { textKopiert(); $("eingabe").focus({ preventScroll: true }); });
  };

  async function eingabeUebernehmen(modusErzwungen) {
    var text = modusErzwungen && letzteAntwort ? letzteAntwort.text : $("eingabe").value;
    if (!text.trim()) return;
    var eigen = !modusErzwungen && eigenerText(text);
    if (eigen) { diagnoseKarte($("eingabe-diagnose"), null); standKarte($("eingabe-stand"), EIGEN[eigen], "fehler"); return; }
    try {
      await km.bereit();
      var modus = modusErzwungen, mo = null;
      if (!modus) {
        mo = await km.mappeFn("modus", [Z.mappe, text]);
        if (mo.modus === "keine") {
          standKarte($("eingabe-stand"), "");
          diagnoseKarte($("eingabe-diagnose"), await km.prompt("diagnose", [text]));
          return;
        }
        // nächste Einheit, die noch ohne Inhalt ist: anhängen statt in die erste Einheit einsetzen
        var neueOffen = Z.mappe.anhaengen && Z.mappe.bausteine.some(function (k) { return k.einheit === Z.mappe.anhaengen && k.geplant; });
        modus = neueOffen ? "anhaengen" : mo.modus;
        setzeModus(modus);
        letzteAntwort = { text: text, vorher: { mappe: JSON.parse(JSON.stringify(Z.mappe)), kurs_md: Z.kurs_md } };
      }
      diagnoseKarte($("eingabe-diagnose"), null);
      var e = await einsetzen(text, modus, letzteAntwort.vorher);
      if (!e.ok) {
        standKarte($("eingabe-stand"), e.text, "fehler");
        zeichne();
        return;
      }
      if (mo) teilEingefuegt(e.ids || mo.ids);
      Z.mappe.durchsicht = false;
      if (schritt() > 5 || schritt() < 5) { Z.mappe.schritt = 5; auf = {}; }      // neuer Inhalt: ab Schritt 5 neu durchsehen
      await auswertung();
      // AP13.4: Hash je Baustein merken; einzelne Bausteine zählen als Runde, eine ganze Einheit fängt neu an
      var gleichE = schleifeMerken(e.ids || Z.pruefung.bausteine.map(function (b) { return b.id; }), false);
      zeichne(); geaendert();
      $("eingabe").value = "";
      var st = Z.mappe.stueckelung, mehr = "";
      if (teileOffen()) {
        standKarte($("eingabe-stand"), "Übernommen: " + e.n + (e.n === 1 ? " Baustein" : " Bausteine") + ". Kopiere jetzt Teil "
          + (naechsterTeil() + 1) + " von " + st.ids.length + "; die Prüfung zeigt Fehler erst, wenn alle Teile da sind.", "ok");
        $("teil-weiter").focus({ preventScroll: true });
        return;
      }
      // im Modus „nur Baustein“ zählen nur die eingesetzten Bausteine, sonst alle
      var rot = Z.pruefung.bausteine.filter(function (b) { return b.status === "fehler" && (!e.ids || e.ids.indexOf(b.id) >= 0); }).length;
      var aussen = Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler" && !d.baustein; }).length;
      if (rot || aussen) mehr = " Unter dem Feld steht die Korrektur: „Korrektur anfordern“ kopiert die Bitte für den Chat.";
      if (gleichE.length) mehr = " Die Antwort für „" + gleichE[0] + "“ ist dieselbe wie vorher." + mehr;
      standKarte($("eingabe-stand"), "Übernommen (" + MODUS_TEXT[modus] + "): " + e.n + (e.n === 1 ? " Baustein" : " Bausteine")
        + (rot ? ", davon " + rot + " mit Fehler (rot)." : aussen ? "." : ". Sieh sie durch und geh dann weiter.") + mehr + e.text,
        rot || aussen ? "fehler" : "ok");
    } catch (err) { zeigeFehler(err); }
  }
  $("eingabe").addEventListener("input", function () {
    clearTimeout(eingabeTimer);
    eingabeTimer = setTimeout(function () { eingabeUebernehmen(null); }, 500);
  });
  $("eingabe").addEventListener("paste", function () {
    clearTimeout(eingabeTimer);
    eingabeTimer = setTimeout(function () { eingabeUebernehmen(null); }, 30);
  });
  // Knopf zusätzlich zur Automatik (Fremdtest 24.10.: nach dem Einfügen fehlte etwas zum Klicken)
  $("eingabe-uebernehmen").onclick = function () { clearTimeout(eingabeTimer); eingabeUebernehmen(null); };
  // Anderen Modus gewählt: die letzte Antwort vom Stand davor aus neu einsetzen
  Array.prototype.forEach.call(document.querySelectorAll("input[name=modus]"), function (r) {
    r.addEventListener("change", function () { if (letzteAntwort && r.checked) eingabeUebernehmen(r.value); });
  });

  // ---------------------------------------------------------------- Korrektur (AP13.3: ein Weg)
  // Ein Block direkt unter dem Einfügefeld: alle Sätze der Prüfung (auch wenn es nur einer ist) und die Karten, die die
  // Lehrkraft neu beauftragt hat. „Korrektur anfordern“ kopiert alles in einem Text und öffnet das Feld für die Antwort;
  // die Seite setzt jeden Baustein der Antwort nach seiner `id:` ein, nur die, die darin stehen (kein Modus).
  function neuBeauftragt() { return markiert().filter(function (k) { return !k.geplant; }); }
  function korrekturZiele() {
    var ids = [];
    korrekturen.forEach(function (k) { if (k.baustein && ids.indexOf(k.baustein) < 0) ids.push(k.baustein); });
    neuBeauftragt().forEach(function (k) { if (ids.indexOf(k.id) < 0) ids.push(k.id); });
    return ids;
  }
  async function korrekturText() {
    var neu = neuBeauftragt();
    if (!neu.length) return korrekturen.map(function (k) { return k.satz; }).join("\n");
    // neu beauftragte und rote Karten in einem Text „Nur diese Bausteine“ (mit den Meldungen der Prüfung)
    var ids = korrekturZiele();
    var t = await km.prompt("baustein", [Z.mappe, ids, Z.kurs_md, Z.steckbrief_text, null, 900, Z.pruefung]);
    var ohne = korrekturen.filter(function (k) { return !k.baustein; }).map(function (k) { return k.satz; });
    return t + (ohne.length ? "\n" + ohne.join("\n") + "\n" : "");
  }
  function korrekturSpaeter(ms) {
    clearTimeout(korrekturTimer);
    korrekturTimer = setTimeout(async function () {
      if (!Z.geladen || !Z.mappe) return;
      try {
        var t = await korrekturText();
        korrektur.text = t;
        $("korrektur-feld").value = t;
        $("korrektur-kopieren").disabled = !t;
      } catch (e) { zeigeFehler(e); }
    }, ms === undefined ? 400 : ms);
  }
  function zeichneKorrektur() {
    var neu = neuBeauftragt(), ziele = korrekturZiele();
    var zeigen = !!Z.mappe && inhalt() && !teileOffen() && (korrekturen.length > 0 || neu.length > 0);
    $("korrektur").hidden = !zeigen;
    if (!zeigen) { korrektur.offen = false; }
    var ul = $("korrektur-liste"); ul.innerHTML = "";
    korrekturen.forEach(function (k) { ul.appendChild(el("li", { "data-regel": k.regel || "", text: k.satz })); });
    neu.forEach(function (k) {
      ul.appendChild(el("li", { cls: "k-neu-zeile", text: "„" + k.titel + "“ neu schreiben, nach deinem Auftrag an der Karte." }));
    });
    var n = ziele.length;
    $("korrektur-titel").textContent = n > 1 ? n + " Bausteine brauchen eine Korrektur" : n === 1 ? "Ein Baustein braucht eine Korrektur"
      : "Die Einheit braucht eine Korrektur";
    $("korrektur-zeile").textContent = "„Korrektur anfordern“ kopiert die Bitte für den Chat" + (korrekturen.length + neu.length > 1
      ? " (alle Punkte zusammen)" : "") + ". Füge sie in deinen Chat ein und die Antwort des Chats hier unten.";
    $("korrektur-antwort").hidden = !korrektur.offen;
    standKarte($("korrektur-ergebnis"), korrektur.stand, korrektur.art);
    if (!korrektur.text && !neu.length) korrektur.text = korrekturen.map(function (k) { return k.satz; }).join("\n");
    $("korrektur-feld").value = korrektur.text;
    $("korrektur-kopieren").disabled = !korrektur.text;
  }
  // Jede Korrekturbitte als Ereignis in der Kursmappe (keine Inhalte): Version, Chat, Typ, Regel, Runde je Einheit
  function korrekturVermerken() {
    var liste = Z.mappe.korrekturen = Z.mappe.korrekturen || [], tag = einheitTag();
    var runde = 1 + liste.filter(function (x) { return (x.einheit || "") === tag; }).reduce(function (m, x) { return Math.max(m, x.runde || 0); }, 0);
    var basis = { version: (katalog && katalog.version) || "", chat: (chatInfo(Z.mappe.chat) || {}).text || "", runde: runde };
    if (tag) basis.einheit = tag;
    korrekturen.forEach(function (k) {
      liste.push(Object.assign({ typ: (pruefBaustein(k.baustein) || {}).typ || "", regel: k.regel || "" }, basis));
    });
    neuBeauftragt().forEach(function (k) { liste.push(Object.assign({ typ: k.typ, regel: "neu.auftrag" }, basis)); });
    autosave(); rueckmeldungFuellen();
  }
  $("korrektur-kopieren").onclick = function () {
    if (!korrektur.text) return;
    korrektur.offen = true; korrektur.stand = ""; korrektur.art = "";
    $("korrektur-antwort").hidden = false; standKarte($("korrektur-ergebnis"), "");
    korrekturVermerken();
    kopieren(korrektur.text, $("korrektur-feld"), $("korrektur-stand"), "Kopiert. Füge sie in deinen Chat ein und die Antwort des Chats hier unten.",
      function () { $("korrektur-eingabe").focus({ preventScroll: true }); });
  };
  function zurKorrektur() {
    var b = $("korrektur");
    if (b.hidden) return;
    b.scrollIntoView({ behavior: "smooth", block: "start" });
    $("korrektur-kopieren").focus({ preventScroll: true });
  }
  async function korrekturEinsetzen() {
    var text = $("korrektur-eingabe").value;
    if (!text.trim()) return;
    var eigen = eigenerText(text);
    if (eigen) { korrektur.stand = EIGEN[eigen]; korrektur.art = "fehler"; standKarte($("korrektur-ergebnis"), korrektur.stand, "fehler"); return; }
    try {
      await km.bereit();
      var saetzeVorher = korrekturen.map(function (k) { return k.satz; }).join("\n");
      var ziele = korrekturZiele(), ohne = korrekturen.some(function (k) { return !k.baustein; });
      var mo = await km.mappeFn("modus", [Z.mappe, text]);
      if (mo.modus === "keine") {
        korrektur.stand = ""; korrektur.art = "";
        standKarte($("korrektur-ergebnis"), "");
        diagnoseKarte($("korrektur-diagnose"), await km.prompt("diagnose", [text])); return;
      }
      diagnoseKarte($("korrektur-diagnose"), null);
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text, ziele.length === 1 ? ziele[0] : null, true]);
      var ids = r.ersetzt.concat(r.eingefuegt);
      if (!ids.length && ohne && mo.modus === "ersetzen") {
        await km.stand((await km.mappeFn("antwort", [text])).kursdatei);     // ganze Kursdatei ohne passende ids
        ids = Z.pruefung.bausteine.map(function (b) { return b.id; });
      } else if (!ids.length) {
        korrektur.stand = r.fehler.join(" ") || "Kein Baustein der Antwort passte zu einer Karte."; korrektur.art = "fehler";
        standKarte($("korrektur-ergebnis"), korrektur.stand, "fehler"); return;
      } else await km.stand(r.kurs_md);
      Z.mappe.bausteine.forEach(function (k) { if (ids.indexOf(k.id) >= 0) k.neu = false; });
      Z.mappe.durchsicht = false;
      if (schritt() !== 5) { Z.mappe.schritt = 5; auf = {}; }
      await auswertung();
      var gleich = schleifeMerken(ids, true);
      $("korrektur-eingabe").value = "";
      var rot = fehlerZahl(), satz = "Eingesetzt: " + ids.length + (ids.length === 1 ? " Baustein" : " Bausteine") + ".";
      if (!rot && !neuBeauftragt().length) {
        korrektur = { text: "", offen: false, stand: "", art: "" };
        standKarte($("eingabe-stand"), satz + " Alle Bausteine sind in Ordnung; sieh sie durch und geh dann weiter.", "ok");
        status("Korrektur eingesetzt", "ok");
      } else {
        // AP13.4: „neu“ nur, wenn sich die Sätze geändert haben; derselbe Text wie vorher wird beim Namen genannt
        var neuSaetze = korrekturen.map(function (k) { return k.satz; }).join("\n") !== saetzeVorher;
        var weg = ids.some(ausweg) ? " Unter der Karte stehen jetzt drei Wege, wie es weitergeht." : "";
        korrektur.stand = gleich.length
          ? "Die Antwort für „" + gleich[0] + "“ ist dieselbe wie vorher (Runde " + schleife()[ids.filter(function (id) { return schleife()[id] && schleife()[id].gleich; })[0]].rot + ")."
            + (weg || " Kopiere die Bitte noch einmal oder nimm einen anderen Chat.")
          : satz + " Noch " + (rot === 1 ? "ein Fehler" : rot + " Fehler") + (neuSaetze ? "; die Bitte oben ist neu, kopiere sie noch einmal." : "; die Bitte oben ist dieselbe wie vorher.") + weg;
        korrektur.stand += r.fehler.length ? " " + r.fehler.join(" ") : "";
        korrektur.art = "fehler"; korrektur.text = "";
      }
      zeichne(); geaendert(); korrekturSpaeter(0);
      var f = !$("korrektur").hidden ? $("korrektur-kopieren") : $("weiter-5");
      if (f && !f.hidden) f.focus({ preventScroll: true });
    } catch (e) { zeigeFehler(e); }
  }
  var korrekturEingabeTimer = null;
  $("korrektur-eingabe").addEventListener("input", function (ev) {
    clearTimeout(korrekturEingabeTimer);
    korrekturEingabeTimer = setTimeout(korrekturEinsetzen, ev.inputType === "insertFromPaste" ? 30 : 500);
  });
  $("korrektur-uebernehmen").onclick = function () { clearTimeout(korrekturEingabeTimer); korrekturEinsetzen(); };

  // ---------------------------------------------------------------- Lösungen gegenprüfen (neuer Chat, Blindlösung)
  $("gegen-kopieren").onclick = function () {
    kopieren($("gegen-text-feld").value, $("gegen-text-feld"), $("gegen-kopiert"), "Jetzt in einen neuen Chat einfügen, die Antwort hier unten einfügen.");
  };
  var gegenTimer = null;
  $("gegen-antwort").addEventListener("input", function () {
    clearTimeout(gegenTimer);
    gegenTimer = setTimeout(gegenpruefen, 400);
  });
  async function gegenpruefen() {
    var text = $("gegen-antwort").value, ul = $("gegen-ergebnis");
    ul.innerHTML = "";
    if (!text.trim()) { $("gegen-stand").textContent = ""; return; }
    try {
      var v = await km.prompt("vergleich", [Z.pruefung, text]);
      Z.vergleich = v;
      var n = v.abweichungen.length;
      $("gegen-stand").textContent = (n ? n + (n === 1 ? " Abweichung" : " Abweichungen") + " von " + v.geprueft + " Aufgaben."
        : "Keine Abweichung bei " + (v.geprueft - v.fehlend.length) + " Aufgaben.")
        + (v.fehlend.length ? " Ohne Antwort: " + v.fehlend.join(", ") + "." : "");
      $("gegen-stand").className = "stand " + (n ? "fehler" : "ok");
      v.abweichungen.forEach(function (a) {
        ul.appendChild(el("li", {}, [el("button", { type: "button", cls: "hinweis-link", "data-ziel": a.baustein, text: "Aufgabe " + a.nr + " in „" + a.titel + "“" }),
          el("span", { text: ": der Chat sagt „" + a.chat + "“, deine Einheit „" + a.kursdatei + "“." })]));
      });
    } catch (e) { zeigeFehler(e); }
  }
  $("gegen-ergebnis").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) zuKarte(z.dataset.ziel); };

  // ---------------------------------------------------------------- 7 Datei, Wiederherstellen, nächste Einheit
  // Einheiten der Kursdatei: „e1“ = erste (ohne teil:), dazu die Teile e2, e3 … der angehängten Einheiten
  function einheitenImKurs() {
    var out = ["e1"], re = /^teil:\s*(e\d+)\s*$/gm, m;
    while ((m = re.exec(Z.kurs_md || ""))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }
  // Nachlieferung, wenn schon eine Einheit importiert ist und neue dazukamen; sonst der ganze Kurs als neuer Kurs
  function nachlieferung() {
    var imp = (Z.mappe && Z.mappe.importiert) || [];
    if (!imp.length) return [];
    return einheitenImKurs().filter(function (e) { return e !== "e1" && imp.indexOf(e) < 0; });
  }

  function zeichneWiederherstellen() {
    var ol = $("wh-schritte"); ol.innerHTML = "";
    var delta = Z.bau && Z.bau.nachlieferung;
    var glossar = Z.pruefung && Z.pruefung.bausteine.some(function (b) { return b.typ === "Glossar"; });
    var badge = angaben.abschluss === "test und abzeichen" || (Z.pruefung && Z.pruefung.bausteine.some(function (b) { return b.typ === "Badge"; }));
    var schritte = [
      "Öffne deinen Kurs auf der ByCS-Lernplattform: Mehr → Kurs wiederherstellen. Zieh die Datei in das Feld „Datei“ und klicke „Wiederherstellen“, dann „Weiter“.",
      delta ? "Ziel: „In diesen Kurs wiederherstellen“ mit „Zusammenführen“. Die neue Einheit kommt hinten an; was schon im Kurs ist, bleibt."
        : "Ziel: „Als neuen Kurs wiederherstellen“ und eine Kategorie wählen. Für einen leeren Kurs, den du schon hast: „In diesen Kurs wiederherstellen“ mit „Zusammenführen“.",
      "„Einstellungen“: Weiter. „Schema“: Soll ein bestehender Kurs das Kursformat " + (oberText("format", angaben.format) || "") + " bekommen, stell „Kurseinstellungen überschreiben“ auf „Ja“. Dann „Wiederherstellen“.",
      glossar ? "Glossar: Öffne das Glossar im Kurs, Mehr → Einträge importieren, und wähle die Datei mit den Glossar-Einträgen (Knopf oben)."
        : "Sieh die Kursseite einmal so an, wie sie deine Klasse sieht (Rolle wechseln → Schüler/in).",
      badge ? "Abzeichen: Mehr → Badges, das Abzeichen öffnen und „Zugriff aktivieren“." : "Prüfe Kursbild und Banner; fehlt ein Bild, steht dort ein Platzhalter."];
    schritte.forEach(function (s) { ol.appendChild(el("li", { text: s })); });
    var imp = (Z.mappe && Z.mappe.importiert) || [];
    var alle = einheitenImKurs().every(function (e) { return imp.indexOf(e) >= 0; });
    $("importiert-frage").hidden = !!(Z.mappe && alle);
    $("importiert-stand").hidden = !(Z.mappe && alle);
    $("importiert-stand").textContent = "Vermerkt. Die nächste Einheit wird als Nachlieferung erstellt und mit „Zusammenführen“ eingespielt.";
  }

  $("herunterladen").onclick = async function () {
    if (Z.bau && Z.bau.mbz) { herunterladen(); return; }
    bauLaeuft = true;
    knoepfe();
    status("Datei wird erstellt …", "lauf");
    try {
      var neu = nachlieferung(), opt = Object.assign({}, km.bauOptionen || {});
      if (neu.length) opt.optionen = Object.assign({}, opt.optionen || {}, { delta: neu.join(",") });
      await km.baue(opt);
      if (Z.bau) Z.bau.nachlieferung = neu.length ? neu : null;
      // Name beim Herunterladen: <Kurstitel>_<Datum>.mbz (wie die Kursdatei); in der Sicherung bleibt der Name des Generators
      if (Z.bau && Z.bau.mbz) Z.bau.downloadName = (await km.mappeFn("dateiname", [Z.mappe, heute()])).replace(/\.kursmappe\.zip$/, neu.length ? "_nachlieferung.mbz" : ".mbz");
      bauLaeuft = false;
      if (Z.bau && Z.bau.mbz) { herunterladen(); status("Bereit", "ok"); }
      else status("Die Datei ließ sich nicht erstellen.", "fehler");
      zeichneWiederherstellen(); knoepfe(); zeichneSchritte(); rueckmeldungFuellen();
    } catch (e) { bauLaeuft = false; zeigeFehler(e); knoepfe(); }
  };
  function herunterladen() {
    var b = Z.bau; if (b && b.mbz) download(b.mbz, b.downloadName || b.dateiname, "application/vnd.moodle.backup");
  }
  $("glossar-laden").onclick = function () {
    var g = Z.bau && Z.bau.glossare;
    (g || []).forEach(function (x) { download(new TextEncoder().encode(x[1]), x[0], "application/xml"); });
  };
  $("importiert-ja").onclick = function () {
    if (!Z.mappe) return;
    var imp = Z.mappe.importiert || [];
    einheitenImKurs().forEach(function (e) { if (imp.indexOf(e) < 0) imp.push(e); });
    Z.mappe.importiert = imp;
    zeichneWiederherstellen(); autosave();
    $("naechste-einheit").focus();
  };
  $("naechste-einheit").onclick = function () {
    if (!Z.mappe) return;
    var n = (Z.mappe.einheiten || einheitenImKurs().length) + 1;
    Z.mappe.einheiten = n;
    Z.mappe.anhaengen = "e" + n;
    Z.bau = null;
    $("f-thema").value = ""; $("f-minuten").value = (Z.mappe.einheit && Z.mappe.einheit.minuten) || 45;
    gehe(1, "f-thema");
    $("s1-titel").textContent = "Worum geht es in der nächsten Einheit?";
  };
  $("speichern").onclick = async function () {
    try {
      var m = await km.mappeSchreiben();
      download(m.zip, m.dateiname, "application/zip");
      $("autosave-stand").textContent = "Einheit gespeichert um " + zeit(Date.now());
      gespeichert = true;
      autosave();
      // Speichern schließt den laufenden Schritt ab, wenn er fertig ist (Befund des Autors): die Liste klappt zu,
      // der nächste Schritt erscheint
      var s = schritt();
      if (s === 2 && zweig()) gehe(nachZwei());
      else if (s === 3) { Z.mappe.aussehen = true; gehe(4); }
      else if (s === 4 && Z.mappe.kopiert) gehe(5);
      else { auf = {}; zeichneSchritte(); }
    } catch (e) { zeigeFehler(e); }
  };
  $("neue-einheit").onclick = async function () {
    clearTimeout(autosaveTimer);
    if (Z.geladen && Z.mappe) { try { await km.autosaveSchreiben(); } catch (e) { /* Hinweis steht schon unter der Kursdatei */ } }
    leeren();
    weiterAnzeigen();
  };
  function leeren() {
    Z.mappe = null; Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null;
    rueckgaengig = null; $("rueckgaengig").hidden = true; angaben = {};
    neuStart();
    $("f-thema").value = ""; $("f-jahrgang").value = ""; $("f-minuten").value = 45;
    $("s1-titel").textContent = "Worum geht es?";
    gespeichert = false;
    zeichne();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- Rückmeldung (Adresse und Text zum Kopieren)
  // Der Text nennt Version, Chat, Fach, Jahrgangsstufe, Vorlage und Weg; keine Inhalte der Einheit, kein Thema, keine Namen
  function rueckmeldungText() {
    var m = Z.mappe || {}, e = m.einheit || {}, c = chatInfo(m.chat);
    return ["Rückmeldung zu Kursmühle " + ((katalog && katalog.version) || ""), "",
      "Chat: " + (c ? c.text : "–"), "Fach: " + (angaben.fach || "–"), "Jahrgangsstufe: " + (e.jahrgang || angaben.jahrgang || "–"),
      "Vorlage: " + (e.vorlage || "–") + (m.zweig ? " (" + ZWEIG_TEXT[m.zweig] + ")" : ""), korrekturZeile(m), "",
      "Wo hat es gestockt?", "", "", "Was hättest du anders gewollt?", "", "", "Nimmst du es für deine nächste Einheit wieder? Wenn nicht, woran liegt es?", "", ""].join("\n");
  }
  // „Korrekturen: 2 · mindest.quiz, zeit.annahme · Chat: ByLKI“ (AP13.3, aus den Ereignissen der Kursmappe)
  function korrekturZeile(m) {
    var k = (m && m.korrekturen) || [];
    var regeln = k.map(function (x) { return x.regel; }).filter(function (r, i, a) { return r && a.indexOf(r) === i; });
    var chats = k.map(function (x) { return x.chat; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
    return "Korrekturen: " + k.length + (regeln.length ? " · " + regeln.join(", ") : "") + (chats.length ? " · Chat: " + chats.join(", ") : "");
  }
  var rmBearbeitet = false;
  function rueckmeldungFuellen() { if (!rmBearbeitet) $("rm-text").value = rueckmeldungText(); }
  $("rm-text").addEventListener("input", function () { rmBearbeitet = true; });
  function rueckmeldungOeffnen() {
    $("rueckmeldung").dataset.offen = "1";
    rueckmeldungFuellen();
    zeichneSchritte();
    $("rueckmeldung").scrollIntoView({ block: "start" });
    $("rm-text-kopieren").focus({ preventScroll: true });
  }
  $("rueckmeldung-auf").onclick = rueckmeldungOeffnen;
  $("fuss-rueckmeldung").onclick = rueckmeldungOeffnen;
  $("rm-text-kopieren").onclick = function () {
    kopieren($("rm-text").value, $("rm-text"), $("rm-stand"), "Kopiert. Füge den Text in eine Mail an kursmuehle@pm.me ein und ergänze die drei Antworten.");
  };
  $("rm-adresse-kopieren").onclick = function () {
    kopieren("kursmuehle@pm.me", $("rm-adresse-feld"), $("rm-stand"), "Adresse kopiert.");
  };

  // ---------------------------------------------------------------- Hell und dunkel (AP13.3, wie die Landingpage)
  function schemaZeigen() {
    var d = document.documentElement.dataset.theme === "dark";
    $("schema").textContent = d ? "Hell" : "Dunkel";        // die Beschriftung nennt, wohin der Klick führt
  }
  $("schema").onclick = function () {
    var d = document.documentElement.dataset.theme !== "dark";
    if (d) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("kursmuehle-schema", d ? "dunkel" : "hell"); } catch (e) { /* ohne Speicher: nur diese Seite */ }
    schemaZeigen();
  };
  schemaZeigen();

  rueckmeldungFuellen();
  zeichne();
})();
