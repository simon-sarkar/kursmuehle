/* Kursmühle – Messseite für den Autor: Ladezeit, Prüfzeit, Bauzeit, WASM-Heap auf dem
 * eigenen Gerät messen und als Text kopieren. Braucht kern.js (Kern `km`); keine Oberfläche für Lehrkräfte. */
"use strict";

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $("status"), diagEl = $("diagnosen"), bausteineEl = $("bausteine"), messEl = $("messung"), textEl = $("eingabe");
  var autosaveTimer = null, pruefTimer = null;

  function status(t, cls) { statusEl.textContent = t; statusEl.className = cls || ""; }
  km.setStatus(function (t) { status(t, "lauf"); });
  $("browser").textContent = navigator.userAgent;

  function zeigePruefung(p) {
    var fehler = p.diagnosen.filter(function (d) { return d.stufe === "fehler"; }).length;
    var warn = p.diagnosen.filter(function (d) { return d.stufe === "warnung"; }).length;
    $("pruefstand").textContent = (p.titel ? p.titel + " · " : "") + p.bausteine.length + " Bausteine · " + fehler + " Fehler · " + warn + " Warnungen · "
      + p.adressen.length + " externe Adressen · " + (p.dauer_s * 1000).toFixed(0) + " ms in Python";
    $("pruefstand").className = fehler ? "fehler" : (warn ? "warnung" : "ok");
    diagEl.innerHTML = "";
    p.diagnosen.forEach(function (d) {
      var li = document.createElement("li");
      li.className = d.stufe;
      li.textContent = d.stufe.toUpperCase() + " " + (d.titel ? "„" + d.titel + "“ Zeile " + d.zeile_im_baustein : (d.zeile ? "Zeile " + d.zeile : "")) + ": " + d.text;
      diagEl.appendChild(li);
    });
    p.adressen.forEach(function (a) {
      var li = document.createElement("li");
      li.className = a.https ? "hinweis" : "warnung";
      li.textContent = "ADRESSE Zeile " + a.zeile + ": " + a.adresse + (a.https ? "" : " (kein https)");
      diagEl.appendChild(li);
    });
    bausteineEl.innerHTML = "";
    p.bausteine.forEach(function (b) {
      var meta = (km.zustand.mappe ? km.zustand.mappe.bausteine : []).filter(function (e) { return e.id === b.id; })[0];
      var li = document.createElement("li");
      li.className = b.status;
      li.textContent = b.id + " · " + b.typ + ": " + b.titel + " · " + (b.abschnitt || "") + " · Zeile " + b.zeile + " (" + b.zeilen + ") · " + b.status
        + (b.minuten ? " · " + b.minuten + " min" : "") + (meta && meta.soll ? " · Soll " + meta.soll : "") + (meta && meta.phase ? " · " + meta.phase : "");
      bausteineEl.appendChild(li);
    });
    $("bauen").disabled = fehler > 0;
  }

  function zeigeMessung() {
    var zeilen = ["Browser: " + navigator.userAgent, "Pyodide: " + (km.zustand.ladeInfo ? km.zustand.ladeInfo.pyodide + " · Python " + km.zustand.ladeInfo.python + " · Kursmühle " + km.zustand.ladeInfo.version : "nicht geladen"), ""];
    zeilen.push("Aktion         Beispiel          Dauer ms   WASM-Heap MB   Details");
    km.messungen.forEach(function (m) {
      var det = [];
      if (m.pyodide_ms !== undefined) det.push("Pyodide " + m.pyodide_ms + " · Pakete " + m.pakete_ms + " · Generator " + m.generator_ms + " ms");
      if (m.bausteine !== undefined) det.push(m.bausteine + " Bausteine, " + m.fehler + " Fehler, " + m.zeichen + " Zeichen");
      if (m.bytes !== undefined) det.push(m.bytes + " Bytes" + (m.ok ? "" : " (FEHLER)"));
      if (m.js_heap_mb) det.push("JS-Heap " + m.js_heap_mb + " MB");
      zeilen.push((m.aktion + "              ").slice(0, 15) + (m.beispiel + "                 ").slice(0, 18) + ("        " + m.dauer_ms).slice(-8) + "   "
        + ("            " + (m.heap_mb === null || m.heap_mb === undefined ? "–" : m.heap_mb)).slice(-12) + "   " + det.join(" · "));
    });
    messEl.textContent = zeilen.join("\n");
  }

  function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      km.autosaveSchreiben().then(function (n) { if (n) $("autosave").textContent = "Autosave: " + n + " (" + new Date().toLocaleTimeString() + ")"; })
        .catch(function (e) { $("autosave").textContent = "Autosave nicht möglich: " + e.message; });
    }, 800);
  }

  async function pruefeJetzt(text) {
    if (!km.zustand.geladen) { status("Erst „Pyodide laden“ drücken", "warnung"); return; }
    status("Prüfe …", "lauf");
    try {
      var p = await km.pruefe(text);
      zeigePruefung(p); zeigeMessung();
      status(p.ok ? "Geprüft: baubar" : "Geprüft: Fehler, siehe Diagnosen", p.ok ? "ok" : "fehler");
      autosave();
    } catch (e) { status("Prüfung fehlgeschlagen: " + e.message, "fehler"); }
  }

  $("laden").onclick = async function () {
    $("laden").disabled = true;
    status("Lade …", "lauf");
    try {
      var info = await km.laden();
      status("Bauen möglich · Pyodide " + info.pyodide + " · Python " + info.python + " · " + info.gesamt_ms + " ms", "ok");
      $("pruefen").disabled = $("eingabe").disabled = false;
      zeigeMessung();
      if (textEl.value.trim()) pruefeJetzt(textEl.value);
    } catch (e) { status("Laden fehlgeschlagen: " + e.message, "fehler"); $("laden").disabled = false; }
  };

  $("pruefen").onclick = async function () {
    if (!textEl.value.trim()) { status("Erst eine Kursdatei öffnen oder eine Antwort einfügen", "warnung"); return; }
    await pruefeJetzt(textEl.value);
  };

  $("bauen").onclick = async function () {
    status("Baue …", "lauf");
    $("herunterladen").disabled = true;
    try {
      var e = await km.baue({ kurs_md: textEl.value });
      zeigeMessung();
      diagEl.innerHTML = "";
      e.diagnosen.forEach(function (d) { var li = document.createElement("li"); li.className = d.stufe; li.textContent = d.satz; diagEl.appendChild(li); });
      if (e.mbz) {
        var h = await km.sha256(e.mbz);
        status("Gebaut: " + e.dateiname + " · " + e.mbz.length + " Bytes · sha256 " + h.slice(0, 16) + " · " + (e.dauer_s * 1000).toFixed(0) + " ms in Python", "ok");
        $("herunterladen").disabled = false;
      } else status("Bau mit Fehlern, siehe Diagnosen", "fehler");
    } catch (err) { status("Bau fehlgeschlagen: " + err.message, "fehler"); }
  };

  function download(u8, name, typ) {
    var blob = new Blob([u8], { type: typ || "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }
  $("herunterladen").onclick = function () { var b = km.zustand.bau; if (b && b.mbz) download(b.mbz, b.dateiname, "application/vnd.moodle.backup"); };

  $("mappe-speichern").onclick = async function () {
    try { var m = await km.mappeSchreiben(); download(m.zip, m.dateiname, "application/zip"); status("Mappe gespeichert: " + m.dateiname, "ok"); }
    catch (e) { status("Mappe speichern fehlgeschlagen: " + e.message, "fehler"); }
  };

  async function dateienLesen(files) {
    var out = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      out[f.webkitRelativePath || f.name] = new Uint8Array(await f.arrayBuffer());
    }
    return out;
  }
  $("mappe-oeffnen").onchange = async function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    try {
      var m = await km.mappeAusBytes(await f.arrayBuffer(), null);
      textEl.value = m.kurs_md;
      $("mappenstand").textContent = "Mappe geöffnet: " + f.name + " · " + m.mappe.bausteine.length + " Bausteine";
      await pruefeJetzt(m.kurs_md);
    } catch (e) { status("Mappe öffnen fehlgeschlagen: " + e.message, "fehler"); }
    ev.target.value = "";
  };
  $("ordner-import").onchange = async function (ev) {
    try {
      var m = await km.mappeAusDateien(await dateienLesen(ev.target.files), null);
      textEl.value = m.kurs_md;
      $("mappenstand").textContent = "1.x-Ordner importiert: " + m.mappe.bausteine.length + " Bausteine · " + Object.keys(m.assets).length + " Dateien";
      await pruefeJetzt(m.kurs_md);
    } catch (e) { status("Import fehlgeschlagen: " + e.message, "fehler"); }
    ev.target.value = "";
  };

  // Einfügen: ganze Chat-Antwort annehmen und sofort prüfen (kurz entprellt für langsames Tippen)
  textEl.addEventListener("input", function () {
    clearTimeout(pruefTimer);
    pruefTimer = setTimeout(function () { if (textEl.value.trim()) pruefeJetzt(textEl.value); }, 400);
  });
  textEl.addEventListener("paste", function () {
    clearTimeout(pruefTimer);
    setTimeout(function () { pruefeJetzt(textEl.value); }, 50);
  });

  // Jede gewählte Kursdatei öffnen, prüfen und bauen
  $("messen-dateien").onchange = async function (ev) {
    var dateien = Array.prototype.slice.call(ev.target.files || []);
    ev.target.value = "";
    if (!dateien.length) return;
    try {
      if (!km.zustand.geladen) { $("laden").onclick(); await new Promise(function (r) { var t = setInterval(function () { if (km.zustand.geladen) { clearInterval(t); r(); } }, 200); }); }
      for (var i = 0; i < dateien.length; i++) {
        var name = dateien[i].name.replace(/\.kursmappe\.zip$|\.zip$/i, "");
        status("Messe " + name + " …", "lauf");
        var m = await km.mappeAusBytes(await dateien[i].arrayBuffer(), name);
        textEl.value = m.kurs_md;
        var p = await km.pruefe(m.kurs_md); zeigePruefung(p);
        await km.baue({});
        zeigeMessung();
      }
      var h = await km.heap(); km.messungen.push({ aktion: "heap", beispiel: "danach", dauer_ms: 0, heap_mb: h.heap_mb, js_heap_mb: h.js_heap_mb });
      zeigeMessung();
      status("Messung fertig: " + dateien.length + (dateien.length === 1 ? " Kursdatei" : " Kursdateien") + " geprüft und gebaut", "ok");
    } catch (e) { status("Messung abgebrochen: " + e.message, "fehler"); }
  };

  $("messung-kopieren").onclick = function () {
    var t = messEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { status("Messwerte kopiert", "ok"); }, function () { auswahl(); });
    else auswahl();
    function auswahl() { var r = document.createRange(); r.selectNodeContents(messEl); var s = getSelection(); s.removeAllRanges(); s.addRange(r); status("Messwerte markiert: jetzt kopieren", "ok"); }
  };
  $("worker-beenden").onclick = function () { km.beenden(); status("Worker beendet; „Pyodide laden“ startet neu", ""); $("laden").disabled = false; $("pruefen").disabled = true; $("bauen").disabled = true; };

  // Autosave wiederherstellen (nur anbieten, nicht ungefragt laden)
  km.autosaveLesen().then(function (r) {
    if (!r) return;
    $("autosave").textContent = "Autosave vom " + new Date(r.zeit).toLocaleString() + " vorhanden (" + r.dateiname + ")";
    var b = document.createElement("button"); b.textContent = "Autosave wiederherstellen";
    b.onclick = async function () {
      if (!km.zustand.geladen) { status("Erst „Pyodide laden“ drücken", "warnung"); return; }
      var m = await km.mappeAusBytes(r.zip, null); textEl.value = m.kurs_md; await pruefeJetzt(m.kurs_md);
    };
    var c = document.createElement("button"); c.textContent = "Autosave löschen";
    c.onclick = function () { km.autosaveLoeschen().then(function () { $("autosave").textContent = "Autosave gelöscht"; b.remove(); c.remove(); }); };
    $("autosave").appendChild(document.createTextNode(" ")); $("autosave").appendChild(b); $("autosave").appendChild(c);
  }).catch(function () { $("autosave").textContent = "Kein Autosave (IndexedDB nicht verfügbar)"; });
})();
