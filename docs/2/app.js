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

  // ---- Autosave in IndexedDB (nur gegen den geschlossenen Tab; die Kursdatei gehört als Datei der Lehrkraft)
  var DB = "kursmuehle", STORE = "mappe";
  function db() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("IndexedDB fehlt"));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
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
  // kleine Einstellungen im selben Speicher (Infobox „nicht mehr anzeigen“)
  async function einstellung(name, wert) {
    var d = await db();
    return new Promise(function (resolve, reject) {
      var tx = d.transaction(STORE, wert === undefined ? "readonly" : "readwrite"), st = tx.objectStore(STORE);
      var r = wert === undefined ? st.get("einstellung:" + name) : st.put(wert, "einstellung:" + name);
      r.onsuccess = function () { resolve(wert === undefined ? r.result : wert); };
      r.onerror = function () { reject(r.error); };
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

// ---------------------------------------------------------------- Baustein-Ansicht (index.html)
(function () {
  if (!document.getElementById("ansicht")) return;
  var $ = function (id) { return document.getElementById(id); };
  var Z = km.zustand;
  var katalog = null, angaben = {}, entwurf = null, rueckgaengig = null;
  var autosaveTimer = null, kennzahlTimer = null, eingabeTimer = null, textTimer = null, hinweiseAlle = false;
  var texte = { teile: [], art: "einheit", teil: 0, laeuft: 0 }, fragenListe = [], korrekturen = [], letzteAntwort = null;
  var infoboxAus = false;
  var KEIN_INHALT = "Noch kein Inhalt. Füge die Antwort des Chats ein.";
  var MAX_KANTE = 1600;                           // Bilder werden beim Hochladen auf diese lange Kante verkleinert
  var KOPIERT = "Jetzt in deinen Chat einfügen, die Antwort hier unten einfügen.";
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
  function formularname(typ) { var t = typInfo(typ); return t ? t.formularname : typ; }
  function mitMinuten(typ) { var t = typInfo(typ); return !t || t.minuten !== false; }
  function chatInfo(wert) { return katalog && katalog.chats.filter(function (c) { return c.wert === wert; })[0]; }
  function zeige(bildschirm) {
    ["start", "vorlage-wahl", "ansicht"].forEach(function (id) { $(id).hidden = id !== bildschirm; });
    document.body.dataset.bildschirm = bildschirm;
    window.scrollTo(0, 0);
    if (bildschirm === "ansicht") Array.prototype.forEach.call(document.querySelectorAll(".k-auftrag"), hoehe);
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

  // Kopieren nur in der Geste (Safari): der Text liegt schon fertig im Feld; ohne Zwischenablage markieren und execCommand
  function kopieren(text, feld, stand, satz) {
    function fertig(ok) {
      stand.textContent = ok ? satz : "Kopieren ging nicht. Öffne „Text ansehen“, markiere den Text und kopiere ihn.";
      stand.className = "stand " + (ok ? "ok" : "fehler");
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
    status("Bereit zum Erstellen", "ok");
    knoepfe();
    if (Z.mappe) neuPruefen().catch(zeigeFehler);
  }).catch(function () {
    status("Der Baukasten der Seite ließ sich nicht laden. Speichere später die Kursdatei und öffne die Seite in einem anderen Netz noch einmal.", "fehler");
  });

  km.einstellung("infobox_aus").then(function (w) { infoboxAus = !!w; }).catch(function () { /* ohne IndexedDB: Box jedes Mal */ });

  fetch("katalog.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (k) {
    katalog = k;
    testfassung(k.version);
    vorlagenZeigen();
    auswahlFuellen();
    if (Z.mappe) zeichne();
  }).catch(function () { status("katalog.json fehlt; python3 scripts/web_bundle.py ausführen", "fehler"); });

  // Zeile „Testfassung“ über der Seite, solange die Version ein Suffix trägt (Version aus CHANGELOG.md beim Bündeln)
  function testfassung(version) {
    var p = $("testfassung");
    p.hidden = !(version && version.indexOf("-") > 0);
    if (p.hidden) return;
    p.innerHTML = "";
    p.appendChild(document.createTextNode("Testfassung " + version + " · Rückmeldung an "));
    p.appendChild(el("a", { href: "mailto:kursmuehle@pm.me", text: "kursmuehle@pm.me" }));
  }

  function auswahlFuellen() {
    var o = katalog.oberflaeche;
    [["a-format", o.format], ["a-vorlage", o.vorlage], ["a-farbe", o.farbe], ["a-website", o.website],
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
    var neu = $("neu-typ"); neu.innerHTML = "";
    katalog.typen.filter(function (t) { return ["Badge", "Unterabschnitt", "Banner"].indexOf(t.typ) < 0; })
      .forEach(function (t) { neu.appendChild(el("option", { value: t.typ, text: t.formularname })); });
    var phasen = $("phasen"), gesehen = {};
    phasen.innerHTML = "";
    katalog.vorlagen.forEach(function (v) { v.phasen.forEach(function (p) {
      if (!gesehen[p.phase]) { gesehen[p.phase] = 1; phasen.appendChild(el("option", { value: p.phase })); }
    }); });
  }

  // ---------------------------------------------------------------- Start
  function weiterAnzeigen() {
    km.autosaveLesen().then(function (r) {
      $("weiter").hidden = !r;
      if (!r) return;
      $("weiter-knopf").textContent = "Weiter mit „" + (r.titel || r.dateiname) + "“";
      $("weiter-zeit").textContent = "Zuletzt gesichert " + datumZeit(r.zeit);
      $("weiter-knopf").onclick = function () {
        oeffne(async function () { await km.mappeAusBytes(r.zip, null); }, "Wird geöffnet …");
      };
    }).catch(function () { $("weiter").hidden = true; });
  }
  weiterAnzeigen();

  $("start-form").onsubmit = function (ev) {
    ev.preventDefault();
    var thema = $("f-thema").value.trim();
    if (!thema) { $("f-thema").focus(); return; }
    entwurf = { thema: thema, jahrgang: $("f-jahrgang").value.trim(), minuten: parseInt($("f-minuten").value, 10) || 45 };
    $("vorlage-thema").textContent = thema + " · Jahrgangsstufe " + (entwurf.jahrgang || "offen") + " · " + entwurf.minuten + " Minuten";
    zeige("vorlage-wahl");
  };
  $("vorlage-zurueck").onclick = function () { zeige("start"); };

  function vorlagenZeigen() {
    var box = $("vorlagen"); box.innerHTML = "";
    katalog.vorlagen.forEach(function (v, i) {
      var b = el("button", { type: "button", cls: "vorlage", "data-vorlage": i }, [
        el("span", { cls: "vorlage-name", text: v.name }), el("span", { cls: "vorlage-zeile", text: v.zeile }),
        el("span", { cls: "vorlage-phasen", text: v.phasen.map(function (p) { return p.phase; }).join(" · ") })]);
      b.onclick = function () { einheitAnlegen(v); };
      box.appendChild(b);
    });
  }

  // Bausteinliste aus einer Einheitsvorlage: Phasen mit Typ-Vorschlag und Soll-Minuten. Bis 45 Minuten skaliert alles;
  // darüber wachsen nur die dehnbaren Phasen (Erarbeitung, Übung), Einstieg und Sicherung bleiben.
  function vorlageKarten(v, minuten) {
    var faktor = Math.min(1, minuten / 45), dehnAnteil = 0, fest = 0;
    v.phasen.forEach(function (p) { if (p.dehnbar) dehnAnteil += p.anteil; else fest += p.anteil / 100 * 45 * faktor; });
    var rest = Math.max(0, minuten - fest), karten = [], n = 0;
    v.phasen.forEach(function (p) {
      var phMin = p.dehnbar ? rest * p.anteil / dehnAnteil : p.anteil / 100 * 45 * faktor;
      p.bausteine.forEach(function (b, k) {
        var schritt = b.indexOf(" | ") >= 0 ? b.slice(b.indexOf(" | ") + 3).trim() : "";   // Teilschritt für den Chat
        var kopf = schritt ? b.slice(0, b.indexOf(" | ")) : b;
        var teile = kopf.split(":"), typ = teile[0].trim();
        var titel = teile.length > 1 ? teile.slice(1).join(":").trim() : (p.bausteine.length > 1 ? p.phase + " " + (k + 1) : p.phase);
        n += 1;
        var karte = { id: "b" + n, typ: typ, titel: titel, abschnitt: null, minuten: null, auftrag: "", phase: p.phase,
          soll: Math.max(1, Math.round(phMin / p.bausteine.length)), geplant: true, neu: false, _dehnbar: !!p.dehnbar };
        if (schritt) karte.schritt = schritt;
        karten.push(karte);
      });
    });
    var summe = karten.reduce(function (s, k) { return s + k.soll; }, 0), diff = minuten - summe;
    var groesste = karten.filter(function (k) { return k._dehnbar; }).sort(function (a, b) { return b.soll - a.soll; })[0];
    if (groesste && groesste.soll + diff >= 1) groesste.soll += diff;
    karten.forEach(function (k) { delete k._dehnbar; });
    return karten;
  }

  async function steckbriefAnlegen() {
    var o = katalog.oberflaeche, e = (Z.mappe && Z.mappe.einheit) || entwurf || {};
    Z.steckbrief_text = await km.mappeFn("angaben_schreiben", ["", {
      thema: e.thema || "", jahrgang: e.jahrgang || "", minuten: e.minuten || "", fach: "",
      format: o.format[0].wert, vorlage: o.vorlage[0].wert, farbe: o.farbe[0].wert, website: o.website[0].wert,
      abschluss: o.abschluss[0].wert, portionierung: o.portionierung[0].wert }]);
  }

  function einheitAnlegen(v) {
    var e = { thema: entwurf.thema, jahrgang: entwurf.jahrgang, minuten: entwurf.minuten, vorlage: v.name };
    Z.mappe = km.neueMappe(entwurf.thema, e, vorlageKarten(v, entwurf.minuten));
    Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null; Z.beispiel = null;
    angaben = { thema: e.thema, jahrgang: e.jahrgang, minuten: e.minuten };
    neuStart();
    zeige("ansicht");
    zeichne();
    if (Z.geladen) steckbriefAnlegen().then(neuPruefen).catch(zeigeFehler);
  }

  // Zustand der Ansicht beim Wechsel der Kursdatei zurücksetzen
  function neuStart() {
    clearTimeout(kennzahlTimer); clearTimeout(textTimer); clearTimeout(eingabeTimer);
    texte.teile = []; texte.teil = 0; texte.art = "einheit"; fragenListe = []; korrekturen = []; letzteAntwort = null;
    $("chat-text-feld").value = ""; $("gegen-text-feld").value = ""; $("gegen-antwort").value = "";
    $("gegen-ergebnis").innerHTML = ""; $("gegen-stand").textContent = ""; $("kopiert").textContent = "";
    $("eingabe-stand").textContent = ""; $("infobox").hidden = true;
    document.querySelector("input[name=text-art][value=einheit]").checked = true;
    reiter("bausteine");
  }

  async function oeffne(laden, text) {
    status(text || "Wird geöffnet …", "lauf");
    try {
      await km.bereit();
      await laden();
      entwurf = null;
      neuStart();
      await neuPruefen();
      zeige("ansicht");
      status("Bereit zum Erstellen", "ok");
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
      oeffne(async function () { await km.mappeAusBytes(await files[0].arrayBuffer(), null); }, "Kursdatei wird geöffnet …");
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

  // ---------------------------------------------------------------- Prüfen und Zeichnen
  async function neuPruefen() {
    if (!Z.geladen) { zeichne(); return; }
    if (Z.mappe && !Z.steckbrief_text) await steckbriefAnlegen();
    await km.stand(Z.kurs_md);
    angaben = await km.mappeFn("angaben_lesen", [Z.steckbrief_text]);
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
      zeichneDiagnosen();
    }, 300);
  }

  function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      if (!Z.geladen || !Z.mappe) return;
      km.autosaveSchreiben().then(function () { $("autosave-stand").textContent = "Zuletzt gesichert um " + zeit(Date.now()); })
        .catch(function () { $("autosave-stand").textContent = "Dieser Browser sichert nicht automatisch. Speichere die Kursdatei."; });
    }, 700);
  }

  function geaendert() { kennzahlenSpaeter(); autosave(); Z.bau = null; knoepfe(); textSpaeter(); }

  function zeichne() {
    if (!Z.mappe) return;
    var e = Z.mappe.einheit || {};
    var thema = e.thema || angaben.thema || Z.mappe.titel || "Ohne Titel";
    $("titel").textContent = thema;
    var teile = [];
    var jg = e.jahrgang || angaben.jahrgang, min = e.minuten || angaben.minuten;
    if (jg) teile.push("Jahrgangsstufe " + jg);
    if (min) teile.push(min + " Minuten");
    if (e.vorlage) teile.push(e.vorlage);
    $("unterzeile").textContent = teile.join(" · ");
    felderFuellen();
    zeichneKarten();
    zeichneDiagnosen();
    zeichneChat();
    zeichneKorrektur();
    zeichneFragen();
    knoepfe();
  }

  function felderFuellen() {
    var e = Z.mappe.einheit || {};
    var werte = { "a-thema": e.thema || angaben.thema || "", "a-jahrgang": e.jahrgang || angaben.jahrgang || "",
      "a-minuten": e.minuten || angaben.minuten || "", "a-fach": angaben.fach || "", "a-schulart": angaben.schulart || "",
      "a-format": angaben.format, "a-vorlage": angaben.vorlage, "a-farbe": angaben.farbe, "a-website": angaben.website,
      "a-abschluss": angaben.abschluss, "a-portionierung": angaben.portionierung, "a-chat": Z.mappe.chat || "",
      "a-material": Z.mappe.material || "" };
    Object.keys(werte).forEach(function (id) {
      var f = $(id);
      if (document.activeElement === f || werte[id] === undefined) return;
      f.value = werte[id];
      if (f.tagName === "SELECT" && f.selectedIndex < 0) f.selectedIndex = 0;
    });
    $("a-zeitplanung").checked = !!Z.mappe.zeitplanung;
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

  function pruefBaustein(id) { return Z.pruefung ? Z.pruefung.bausteine.filter(function (b) { return b.id === id; })[0] : null; }

  function zeichneKarten() {
    var ol = $("karten"); ol.innerHTML = "";
    var liste = Z.mappe.bausteine, letzter = null;
    var abschnitte = liste.filter(function (k) { return k.abschnitt; }).map(function (k) { return k.abschnitt; });
    var mehrere = abschnitte.some(function (a) { return a !== abschnitte[0]; });
    var zeitplanung = !!Z.mappe.zeitplanung;
    var zeitInfo = (Z.kennzahlen && Z.kennzahlen.zeit) || {};
    liste.forEach(function (k, i) {
      var abschnitt = mehrere && k.abschnitt && k.abschnitt !== letzter ? el("p", { cls: "k-abschnitt", text: "Abschnitt " + k.abschnitt }) : null;
      if (k.abschnitt) letzter = k.abschnitt;
      var b = pruefBaustein(k.id);
      var st = k.geplant ? "leer" : (b ? b.status : "leer");
      var stText = { ok: "Geprüft", warnung: "Hinweis", fehler: "Fehler", leer: "Noch ohne Inhalt" }[st];
      var minuten = mitMinuten(k.typ);
      var typFeld = k.geplant
        ? el("select", { cls: "k-typ", "aria-label": "Typ von Baustein " + (i + 1) }, (katalog ? katalog.typen : []).filter(function (t) {
            return ["Badge", "Unterabschnitt"].indexOf(t.typ) < 0; }).map(function (t) {
            return el("option", { value: t.typ, text: t.formularname, selected: t.typ === k.typ }); }))
        : el("span", { cls: "k-typ", text: formularname(k.typ) });
      var diag = el("ul", { cls: "k-diagnosen" });
      if (Z.pruefung && !k.geplant) {
        Z.pruefung.diagnosen.filter(function (d) { return d.baustein === k.id && d.stufe !== "hinweis"; }).forEach(function (d) {
          diag.appendChild(el("li", { cls: d.stufe, text: (d.zeile_im_baustein ? "Zeile " + d.zeile_im_baustein + ": " : "") + d.text }));
        });
      }
      // Ist-Minuten aus dem Inhalt (Rolle und Jahrgang); Zeitfelder und die Lücke nur mit „Zeitplanung anzeigen“
      var z = zeitInfo[k.id], ist = null;
      if (minuten && z && z.gerechnet) {
        ist = el("span", { cls: "k-ist", text: "gerechnet " + z.gerechnet + " min" });
        if (z.abweichung && zeitplanung) diag.appendChild(el("li", { cls: "hinweis k-luecke", text: z.text }));
      } else if (minuten && b && b.minuten) ist = el("span", { cls: "k-ist", text: "im Inhalt " + b.minuten + " min" });
      var korrektur = korrekturen.filter(function (x) { return x.baustein === k.id; });
      var inhalt = null;
      if (b && !k.geplant) {
        var pre = el("pre", { cls: "k-text" }); pre.textContent = b.text;    // nur Text, nie HTML aus der Chat-Antwort
        inhalt = el("details", { cls: "k-inhalt" }, [el("summary", { text: "Inhalt ansehen" }), pre]);
      }
      // Bild hochladen an jeder Karte, deren Inhalt ein Bild nennt; ohne Bild bleibt der Platzhalter mit Hinweis
      var namen = b && !k.geplant ? bildnamen(b.text) : [];
      var hochladen = namen.length ? el("div", { cls: "k-bilder" }, namen.map(function (name) {
        var da = !!Z.assets[name];
        return el("label", { cls: "knopf klein-knopf" + (da ? " da" : "") }, [(da ? "Bild „" + name + "“ ersetzen" : "Bild „" + name + "“ hochladen"),
          el("input", { type: "file", cls: "unsichtbar k-bild", accept: "image/png,image/jpeg", "data-datei": name })]);
      })) : null;
      var li = el("li", { cls: "karte status-" + st + (k.neu ? " neu" : "") + (minuten ? "" : " struktur"), "data-id": k.id, id: "karte-" + k.id }, [
        abschnitt,
        el("div", { cls: "k-kopf" }, [
          el("span", { cls: "k-nr", text: String(i + 1) }), typFeld,
          el("span", { cls: "k-status", title: stText }, [el("span", { cls: "punkt", "aria-hidden": "true" }), stText])]),
        el("input", { cls: "k-titel", type: "text", value: k.titel, "aria-label": "Titel von Baustein " + (i + 1) }),
        minuten && zeitplanung ? el("div", { cls: "k-felder" }, [
          el("label", { cls: "k-phase-l" }, ["Phase ", el("input", { cls: "k-phase", type: "text", list: "phasen", value: k.phase || "" })]),
          el("label", { cls: "k-soll-l" }, ["Soll ", el("input", { cls: "k-soll", type: "number", min: "0", max: "300", inputmode: "numeric",
            value: k.soll === null || k.soll === undefined ? "" : k.soll }), " min"]), ist]) : null,
        el("label", { cls: "k-auftrag-l" }, [el("span", { cls: "unsichtbar", text: "Auftrag für Baustein " + (i + 1) }),
          el("textarea", { cls: "k-auftrag", rows: "1", placeholder: "Was soll hinein? Ein Satz genügt (optional)" })]),
        diag,
        korrektur.length ? el("div", { cls: "k-korrektur" }, [
          el("button", { type: "button", cls: "klein k-satz", "data-aktion": "satz", text: "Satz für den Chat kopieren" }),
          el("span", { cls: "k-satz-stand stand", role: "status" })]) : null,
        hochladen, inhalt,
        el("div", { cls: "k-aktionen" }, [
          el("button", { type: "button", cls: "k-hoch klein", "data-aktion": "hoch", "aria-label": "Baustein " + (i + 1) + " nach oben", disabled: i === 0, text: "↑" }),
          el("button", { type: "button", cls: "k-runter klein", "data-aktion": "runter", "aria-label": "Baustein " + (i + 1) + " nach unten", disabled: i === liste.length - 1, text: "↓" }),
          k.geplant ? null : el("button", { type: "button", cls: "k-neu klein", "data-aktion": "neu", "aria-pressed": k.neu ? "true" : "false",
            text: k.neu ? "Wird neu beauftragt" : "Diesen Baustein neu beauftragen" }),
          el("button", { type: "button", cls: "k-loeschen klein", "data-aktion": "loeschen", text: "Löschen" })])]);
      li.querySelector(".k-auftrag").value = k.auftrag || "";
      ol.appendChild(li);
    });
    if (!$("ansicht").hidden) Array.prototype.forEach.call(ol.querySelectorAll(".k-auftrag"), hoehe);
    $("karten-leer").hidden = liste.length > 0;
  }

  function zeichneDiagnosen() {
    var k = Z.kennzahlen;
    var setze = function (id, wert, warn) { var e = $(id); e.textContent = wert; e.parentNode.classList.toggle("warn", !!warn); };
    if (!k) {
      ["kz-minuten", "kz-folge", "kz-mc", "kz-rueckmeldung"].forEach(function (id) { setze(id, "–"); });
      $("hinweise").innerHTML = ""; $("hinweise-mehr").hidden = true;
      return;
    }
    var m = k.minuten;
    setze("kz-minuten", m.soll ? m.ist + " von " + m.soll : String(m.ist), m.soll && (m.ist > m.soll * 1.1 || m.ist < m.soll * 0.9));
    setze("kz-folge", (k.folge.length ? k.folge.join(" → ") : "–") + (k.folge_brueche ? " (" + k.folge_brueche + " Schritt" + (k.folge_brueche > 1 ? "e" : "") + " zurück)" : ""), k.folge_brueche > 0);
    var f = k.fragen;
    setze("kz-mc", f.fragen ? k.mc_anteil + " % von " + f.fragen + " Fragen" : "keine Fragen", f.fragen && k.mc_anteil > 50);
    setze("kz-rueckmeldung", f.auswahl ? f.rueckmeldung + " von " + f.auswahl + " Auswahlfragen" : "–", f.auswahl && f.rueckmeldung < f.auswahl / 2);
    var ul = $("hinweise"); ul.innerHTML = "";
    var liste = hinweiseAlle ? k.hinweise : k.hinweise.slice(0, 3);
    liste.forEach(function (h) {
      var li = el("li", { cls: h.stufe }, [h.baustein
        ? el("button", { type: "button", cls: "hinweis-link", "data-ziel": h.baustein, text: h.text }) : h.text]);
      ul.appendChild(li);
    });
    $("hinweise-mehr").hidden = k.hinweise.length <= 3;
    $("hinweise-mehr").textContent = hinweiseAlle ? "Weniger anzeigen" : "Weitere " + (k.hinweise.length - 3) + " anzeigen";
  }
  $("hinweise-mehr").onclick = function () { hinweiseAlle = !hinweiseAlle; zeichneDiagnosen(); };
  $("hinweise").onclick = function (ev) {
    var z = ev.target.closest("[data-ziel]");
    if (!z) return;
    zuKarte(z.dataset.ziel);
  };
  function zuKarte(id) {
    reiter("bausteine");
    var karte = $("karte-" + id);
    if (karte) { karte.scrollIntoView({ behavior: "smooth", block: "center" }); karte.querySelector(".k-titel").focus({ preventScroll: true }); }
  }

  function knoepfe() {
    var fehler = Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length : 0;
    var inhalt = !!(Z.kurs_md && Z.kurs_md.trim());
    // Fragen und Lösungen einmal ansehen (oder bewusst überspringen), bevor die Datei entsteht (Plan §10)
    var durchsicht = !fragenListe.length || !!(Z.mappe && Z.mappe.durchsicht);
    $("erstellen").disabled = !Z.geladen || !inhalt || fehler > 0 || !durchsicht;
    $("herunterladen").hidden = !(Z.bau && Z.bau.mbz);
    $("durchsicht").hidden = !(Z.geladen && inhalt && !fehler && !durchsicht);
    var t = "";
    if (!Z.geladen) t = "Wird vorbereitet …";
    else if (!inhalt) t = KEIN_INHALT;
    else if (fehler) t = fehler + " Fehler in den Bausteinen. Die rot markierten Karten zeigen, wo.";
    else if (!durchsicht) t = "Sieh vorher die " + fragenListe.length + " Fragen und ihre Lösungen durch.";
    else if (Z.bau && Z.bau.mbz) t = "Die Datei ist fertig (" + Math.round(Z.bau.mbz.length / 1024) + " KB).";
    else if (Z.bau && !Z.bau.mbz) t = "Das Erstellen ist an einem Fehler gescheitert: " + ((Z.bau.diagnosen || []).filter(function (d) { return d.stufe === "fehler"; }).map(function (d) { return d.text; })[0] || "");
    $("erstellen-stand").textContent = t;
    $("speichern").disabled = !Z.geladen || !Z.mappe;
    // Gegenprüfen nach dem ersten grünen Stand
    $("gegenpruefen").hidden = !(inhalt && !fehler && fragenListe.length);
  }

  // ---------------------------------------------------------------- Reiter: Bausteine, Fragen und Lösungen
  function reiter(name) {
    var fragen = name === "fragen";
    $("reiter-bausteine").setAttribute("aria-selected", String(!fragen));
    $("reiter-fragen").setAttribute("aria-selected", String(fragen));
    $("tafel-bausteine").hidden = fragen;
    $("tafel-fragen").hidden = !fragen;
    if (fragen && Z.mappe && fragenListe.length && !Z.mappe.durchsicht) { Z.mappe.durchsicht = true; geaendert(); }
  }
  $("reiter-bausteine").onclick = function () { reiter("bausteine"); };
  $("reiter-fragen").onclick = function () { reiter("fragen"); };
  $("durchsicht-oeffnen").onclick = function () { reiter("fragen"); $("reiter-fragen").focus(); window.scrollTo(0, $("reiter-fragen").offsetTop - 20); };
  $("ohne-durchsicht").onclick = function () { if (Z.mappe) { Z.mappe.durchsicht = true; geaendert(); $("erstellen").focus(); } };

  var BUCHST = "ABCDEFGHIJ";
  function zeichneFragen() {
    var ol = $("fragen-liste"); ol.innerHTML = "";
    $("fragen-zeile").textContent = fragenListe.length
      ? fragenListe.length + " Fragen mit den Lösungen aus der Kursdatei, ohne Rückmeldungen. Prüfe, ob jede Lösung stimmt."
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

  // ---------------------------------------------------------------- Text für den Chat
  function markiert() { return Z.mappe ? Z.mappe.bausteine.filter(function (k) { return k.neu; }) : []; }

  function zeichneChat() {
    var gewaehlt = !!(Z.mappe && Z.mappe.chat && chatInfo(Z.mappe.chat));
    $("chat-wahl").hidden = gewaehlt;
    $("chat-text").hidden = !gewaehlt;
    if (!gewaehlt) return;
    var c = chatInfo(Z.mappe.chat), m = markiert();
    var leer = Z.mappe.bausteine.filter(function (k) { return k.geplant; }).length;
    var voll = Z.mappe.bausteine.filter(function (k) { return !k.geplant; }).length;
    $("art-leer-l").hidden = !(leer && voll);
    $("art-baustein-l").hidden = !m.length;
    $("art-baustein-text").textContent = m.length === 1 ? "Nur Baustein „" + m[0].titel + "“" : "Nur die " + m.length + " markierten Bausteine";
    var art = document.querySelector("input[name=text-art]:checked");
    if (art && art.closest("label").hidden) document.querySelector("input[name=text-art][value=einheit]").checked = true;
    $("chat-aufwand").hidden = !c.aufwand;
    $("chat-aufwand").textContent = c.aufwand || "";
    var tw = $("teil-wahl"); tw.innerHTML = "";
    tw.hidden = texte.teile.length < 2;
    texte.teile.forEach(function (_, i) {
      tw.appendChild(el("button", { type: "button", cls: "klein teil-knopf", "data-teil": i, "aria-pressed": i === texte.teil ? "true" : "false", text: "Teil " + (i + 1) }));
    });
    var t = texte.teile[texte.teil] || "";
    $("chat-zeile").textContent = !t ? (Z.geladen ? "" : "Der Text entsteht, sobald die Seite bereit ist.")
      : "Für " + c.text + (texte.teile.length > 1 ? ", Teil " + (texte.teil + 1) + " von " + texte.teile.length : "") + " · " + kb(new Blob([t]).size);
    if ($("chat-text-feld").value !== t) $("chat-text-feld").value = t;
    $("text-kopieren").disabled = !t;
  }

  function textSpaeter(ms) {
    clearTimeout(textTimer);
    textTimer = setTimeout(texteErzeugen, ms === undefined ? 400 : ms);
  }
  async function texteErzeugen() {
    if (!Z.geladen || !Z.mappe || !Z.mappe.chat) { if (Z.mappe) zeichneChat(); return; }
    var nr = ++texte.laeuft;
    var art = (document.querySelector("input[name=text-art]:checked") || {}).value || "einheit";
    var m = markiert();
    if (art === "baustein" && !m.length) art = "einheit";
    try {
      var teile;
      if (art === "baustein") {
        teile = [await km.prompt("baustein", [Z.mappe, m.map(function (k) { return k.id; }), Z.kurs_md, Z.steckbrief_text, null, 900, Z.pruefung])];
      } else {
        teile = (await km.prompt("einheit", [Z.mappe, Z.steckbrief_text, null, null, art === "leer"])).teile;
      }
      if (nr !== texte.laeuft) return;           // ein neuerer Lauf ist schon unterwegs
      if (art !== texte.art || teile.length !== texte.teile.length) texte.teil = 0;
      texte.art = art; texte.teile = teile;
      if (texte.teil >= teile.length) texte.teil = 0;
      zeichneChat();
      felderFuellen();
    } catch (e) { zeigeFehler(e); }
  }

  $("chat-knoepfe").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-chat]"); if (!b || !Z.mappe) return;
    Z.mappe.chat = b.dataset.chat;
    zeichneChat(); zeichneKarten(); geaendert(); textSpaeter(0);
    setTimeout(function () { var k = $("text-kopieren"); if (k) k.focus({ preventScroll: true }); }, 0);
  });
  $("chat-aendern").onclick = function () {
    $("mehr").open = true;
    $("a-chat").focus();
  };
  Array.prototype.forEach.call(document.querySelectorAll("input[name=text-art]"), function (r) {
    r.addEventListener("change", function () { $("kopiert").textContent = ""; textSpaeter(0); });
  });
  $("teil-wahl").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-teil]"); if (!b) return;
    texte.teil = parseInt(b.dataset.teil, 10); $("kopiert").textContent = ""; zeichneChat();
  });

  // Vor dem ersten Kopieren einmal die Infobox (Rechte am Material, Nutzungsbedingungen des Chats)
  $("text-kopieren").onclick = function () {
    if (!infoboxAus) { $("infobox").hidden = false; $("infobox-ok").focus(); return; }
    kopieren($("chat-text-feld").value, $("chat-text-feld"), $("kopiert"), KOPIERT);
  };
  $("infobox-ok").onclick = function () {
    $("infobox").hidden = true;
    if ($("infobox-nie").checked) { infoboxAus = true; km.einstellung("infobox_aus", true).catch(function () {}); }
    else infoboxAus = true;                      // in dieser Sitzung nicht noch einmal
    kopieren($("chat-text-feld").value, $("chat-text-feld"), $("kopiert"), KOPIERT);
  };

  // ---------------------------------------------------------------- Karten bearbeiten
  function karteVon(t) { var li = t.closest(".karte"); return li ? Z.mappe.bausteine.filter(function (k) { return k.id === li.dataset.id; })[0] : null; }

  $("karten").addEventListener("input", function (ev) {
    var k = karteVon(ev.target); if (!k) return;
    var c = ev.target.classList;
    if (c.contains("k-phase")) k.phase = ev.target.value;
    else if (c.contains("k-soll")) k.soll = ev.target.value === "" ? null : Math.max(0, parseInt(ev.target.value, 10) || 0);
    else if (c.contains("k-auftrag")) { k.auftrag = ev.target.value; hoehe(ev.target); }
    else return;
    geaendert();
  });

  // Titel übernehmen: bei change (Fokus verlässt das Feld) und bei Enter; Safari löst bei Enter kein change aus
  var umbenennenLaeuft = {};
  async function titelUebernehmen(feld) {
    var k = karteVon(feld); if (!k || umbenennenLaeuft[k.id]) return;
    var titel = feld.value.replace(/\s+/g, " ").trim();
    if (!titel || titel === k.titel) { feld.value = k.titel; return; }
    if (k.geplant) { k.titel = titel; geaendert(); return; }
    umbenennenLaeuft[k.id] = true;
    try {
      await km.bereit();
      var md = await km.mappeFn("umbenennen", [Z.kurs_md, k.id, titel]);
      await km.stand(md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); feld.value = k.titel; }
    finally { delete umbenennenLaeuft[k.id]; }
  }

  $("karten").addEventListener("change", async function (ev) {
    var k = karteVon(ev.target); if (!k) return;
    if (ev.target.classList.contains("k-typ")) { k.typ = ev.target.value; zeichneKarten(); geaendert(); return; }
    if (ev.target.classList.contains("k-titel")) { titelUebernehmen(ev.target); return; }
    if (ev.target.classList.contains("k-bild")) {
      var f = ev.target.files && ev.target.files[0], name = ev.target.dataset.datei;
      ev.target.value = "";
      if (!f) return;
      try {
        var bild = await bildVorbereiten(f, name);
        Z.assets[name] = bild.bytes;
        await km.stand(Z.kurs_md);
        await auswertung();
        zeichne(); geaendert();
      } catch (e) { zeigeFehler(e); }
    }
  });
  $("karten").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.classList.contains("k-titel")) { ev.preventDefault(); titelUebernehmen(ev.target); }
  });

  $("karten").addEventListener("click", async function (ev) {
    var knopf = ev.target.closest("button[data-aktion]"); if (!knopf) return;
    var k = karteVon(knopf); if (!k) return;
    var liste = Z.mappe.bausteine, i = liste.indexOf(k), a = knopf.dataset.aktion;
    try {
      if (a === "satz") {
        var saetze = korrekturen.filter(function (x) { return x.baustein === k.id; }).map(function (x) { return x.satz; }).join("\n");
        var fld = $("korrektur-feld") || document.body.appendChild(el("textarea", { id: "korrektur-feld", cls: "unsichtbar", readonly: true, "aria-hidden": "true" }));
        fld.value = saetze;
        kopieren(saetze, fld, knopf.parentNode.querySelector(".k-satz-stand"), "Kopiert. Im selben Chat einfügen.");
      } else if (a === "neu") {
        k.neu = !k.neu;
        if (k.neu) document.querySelector("input[name=text-art][value=baustein]").checked = true;
        zeichneKarten(); zeichneChat(); geaendert(); textSpaeter(0);
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
    var typ = $("neu-typ").value, ids = {}, n = 1;
    Z.mappe.bausteine.forEach(function (k) { ids[k.id] = 1; });
    while (ids["b" + n]) n += 1;
    Z.mappe.bausteine.push({ id: "b" + n, typ: typ, titel: formularname(typ), abschnitt: null, minuten: null, auftrag: "",
      phase: "", soll: null, geplant: true, neu: false });
    zeichne(); geaendert();
    var neu = $("karte-b" + n);
    if (neu) { neu.scrollIntoView({ block: "center" }); neu.querySelector(".k-titel").focus({ preventScroll: true }); }
  };

  // ---------------------------------------------------------------- Kursangaben („Mehr einstellen“)
  var FELDER = { "a-thema": "thema", "a-jahrgang": "jahrgang", "a-minuten": "minuten", "a-fach": "fach", "a-schulart": "schulart",
    "a-format": "format", "a-vorlage": "vorlage", "a-farbe": "farbe", "a-website": "website", "a-abschluss": "abschluss",
    "a-portionierung": "portionierung" };
  $("mehr").addEventListener("change", async function (ev) {
    if (!Z.mappe) return;
    if (ev.target.id === "a-zeitplanung") {
      Z.mappe.zeitplanung = ev.target.checked;
      if (!Z.mappe.zeitplanung) delete Z.mappe.zeitplanung;
      zeichneKarten(); geaendert();
      return;
    }
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
    try {
      await km.bereit();
      var a = {}; a[feld] = wert;
      Z.steckbrief_text = await km.mappeFn("angaben_schreiben", [Z.steckbrief_text, a]);
      if (feld === "farbe" || feld === "vorlage") await km.stand(Z.kurs_md);
      geaendert();
    } catch (e) { zeigeFehler(e); }
  });
  $("a-material").addEventListener("input", function () {
    if (!Z.mappe) return;
    Z.mappe.material = $("a-material").value;
    geaendert();
  });

  // ---------------------------------------------------------------- Antwort des Chats
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
    if (modus === "anhaengen") neu = await km.mappeFn("anhaengen", [Z.kurs_md, text]);
    else neu = (await km.mappeFn("antwort", [text])).kursdatei;
    var pr = await km.stand(neu);
    return { ok: true, n: pr.bausteine.length, text: "" };
  }

  async function eingabeUebernehmen(modusErzwungen) {
    var text = modusErzwungen && letzteAntwort ? letzteAntwort.text : $("eingabe").value;
    if (!text.trim()) return;
    try {
      await km.bereit();
      var modus = modusErzwungen;
      if (!modus) {
        var mo = await km.mappeFn("modus", [Z.mappe, text]);
        if (mo.modus === "keine") {
          var p = await km.anfrage("pruefe", { text: text, assets: Z.assets, steckbrief: Z.steckbrief_text });
          var tipp = p.ergebnis.diagnosen.filter(function (d) { return d.art === "eingabe"; }).map(function (d) { return d.text; })[0];
          $("eingabe-stand").textContent = "Im Text stehen keine Bausteine. " + (tipp ? tipp + "." : "Kopiere die ganze Antwort mit dem Kopierknopf des Chats.");
          $("eingabe-stand").className = "stand fehler";
          return;
        }
        modus = mo.modus;
        setzeModus(modus);
        letzteAntwort = { text: text, vorher: { mappe: JSON.parse(JSON.stringify(Z.mappe)), kurs_md: Z.kurs_md } };
      }
      var e = await einsetzen(text, modus, letzteAntwort.vorher);
      if (!e.ok) {
        $("eingabe-stand").textContent = e.text;
        $("eingabe-stand").className = "stand fehler";
        zeichne();
        return;
      }
      Z.mappe.durchsicht = false;
      await auswertung();
      zeichne(); geaendert();
      // im Modus „nur Baustein“ zählen nur die eingesetzten Bausteine, sonst alle
      var rot = Z.pruefung.bausteine.filter(function (b) { return b.status === "fehler" && (!e.ids || e.ids.indexOf(b.id) >= 0); }).length;
      $("eingabe").value = "";
      $("eingabe-stand").textContent = "Übernommen (" + MODUS_TEXT[modus] + "): " + e.n + (e.n === 1 ? " Baustein" : " Bausteine")
        + (rot ? ", davon " + rot + " mit Fehler (rot markiert)." : ".") + e.text;
      $("eingabe-stand").className = "stand " + (rot ? "fehler" : "ok");
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
  // Anderen Modus gewählt: die letzte Antwort vom Stand davor aus neu einsetzen
  Array.prototype.forEach.call(document.querySelectorAll("input[name=modus]"), function (r) {
    r.addEventListener("change", function () { if (letzteAntwort && r.checked) eingabeUebernehmen(r.value); });
  });

  // ---------------------------------------------------------------- Korrekturbitte
  function zeichneKorrektur() {
    $("korrektur").hidden = !korrekturen.length;
    var ul = $("korrektur-liste"); ul.innerHTML = "";
    korrekturen.forEach(function (k) { ul.appendChild(el("li", { text: k.satz })); });
    if (!$("korrektur-feld")) document.body.appendChild(el("textarea", { id: "korrektur-feld", cls: "unsichtbar", readonly: true, "aria-hidden": "true" }));
    $("korrektur-feld").value = korrekturen.map(function (k) { return k.satz; }).join("\n");
    $("korrektur-stand").textContent = "";
  }
  $("korrektur-kopieren").onclick = function () {
    kopieren($("korrektur-feld").value, $("korrektur-feld"), $("korrektur-stand"), "Kopiert. Im selben Chat einfügen, die Antwort oben einfügen.");
  };

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
          el("span", { text: ": der Chat sagt „" + a.chat + "“, die Kursdatei „" + a.kursdatei + "“." })]));
      });
    } catch (e) { zeigeFehler(e); }
  }
  $("gegen-ergebnis").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) zuKarte(z.dataset.ziel); };

  // ---------------------------------------------------------------- Datei für die Lernplattform, Kursdatei
  $("erstellen").onclick = async function () {
    $("erstellen").disabled = true;
    $("erstellen-stand").textContent = "Wird erstellt …";
    try {
      await km.baue(km.bauOptionen || {});
      // Name beim Herunterladen: <Kurstitel>_<Datum>.mbz (wie die Kursdatei); in der Sicherung bleibt der Name des Generators
      if (Z.bau && Z.bau.mbz) Z.bau.downloadName = (await km.mappeFn("dateiname", [Z.mappe, heute()])).replace(/\.kursmappe\.zip$/, ".mbz");
      knoepfe();
      if (Z.bau && Z.bau.mbz) $("herunterladen").focus();
    } catch (e) { zeigeFehler(e); knoepfe(); }
  };
  $("herunterladen").onclick = function () {
    var b = Z.bau; if (b && b.mbz) download(b.mbz, b.downloadName || b.dateiname, "application/vnd.moodle.backup");
  };
  $("speichern").onclick = async function () {
    try {
      var m = await km.mappeSchreiben();
      download(m.zip, m.dateiname, "application/zip");
      $("autosave-stand").textContent = "Kursdatei gespeichert um " + zeit(Date.now());
      autosave();
    } catch (e) { zeigeFehler(e); }
  };
  $("neue-einheit").onclick = async function () {
    clearTimeout(autosaveTimer);
    if (Z.geladen && Z.mappe) { try { await km.autosaveSchreiben(); } catch (e) { /* Hinweis steht schon unter der Kursdatei */ } }
    Z.mappe = null; Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null;
    entwurf = null; rueckgaengig = null; $("rueckgaengig").hidden = true;
    neuStart();
    $("f-thema").value = "";
    zeige("start");
    weiterAnzeigen();
  };

  zeige("start");
})();
