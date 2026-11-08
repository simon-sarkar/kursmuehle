/* Kursmühle – Bilder: Hochladen mit Verkleinern, Schritt Bilder mit Vorschau, Format aus dem Prompt, Zuschneiden und
 * „Passt“ (klappt die Karte zu, die nächste öffnet sich; AP13.5h a7: immer nur eine Karte offen). */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, auswertung = S.auswertung, bildGroesse = S.bildGroesse, bildwuensche = S.bildwuensche,
      el = S.el, geaendert = S.geaendert, inhalt = S.inhalt, kopieren = S.kopieren, zeichne = S.zeichne,
      zeigeFehler = S.zeigeFehler;
  // Dateinamen der Bilder, die ein Baustein nennt: `Bild:`, `Bildzeile:`, `bild:`, `· Bild:` (Lernkarten)
  function bildnamen(text) {
    var out = [], re = /(?:^|[·|]\s*|\s)(?:Bild|Bildzeile|bild|kachelbild):\s*([^\s|·]+\.(?:png|jpe?g))/gim, m;
    while ((m = re.exec(text || ""))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }

  // c7: Seitenverhältnis aus dem Bildprompt („16:9“), sonst frei; Maße aus dem Dateikopf (PNG IHDR, JPEG SOFn)
  function format(b) { var m = /(\d+)\s*:\s*(\d+)/.exec((b && b.prompt) || "");
    return m && +m[1] > 0 && +m[2] > 0 ? [+m[1], +m[2]] : null; }
  function formatText(f) { return "Format " + (f ? f[0] + ":" + f[1] : "frei"); }
  function masse(bytes) {
    if (!bytes || bytes.length < 24) return null;
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return [dv.getUint32(16), dv.getUint32(20)];
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;
    for (var i = 2; i + 9 < bytes.length;) {
      if (bytes[i] !== 0xFF) { i += 1; continue; }
      var t = bytes[i + 1];
      if (t >= 0xC0 && t <= 0xCF && t !== 0xC4 && t !== 0xC8 && t !== 0xCC) return [dv.getUint16(i + 7), dv.getUint16(i + 5)];
      if (t === 0xD8 || t === 0x01 || (t >= 0xD0 && t <= 0xD7)) { i += 2; continue; }
      i += 2 + dv.getUint16(i + 2);
    }
    return null;
  }
  var GAENGIG = [[1, 1], [4, 3], [3, 4], [3, 2], [2, 3], [16, 9], [9, 16], [5, 4], [4, 5], [21, 9]];
  function verhaeltnisText(w, h) {
    var nah = GAENGIG.filter(function (g) { return Math.abs(w / h / (g[0] / g[1]) - 1) <= 0.03; })[0];
    return nah ? nah[0] + ":" + nah[1] : (w >= h ? (w / h).toFixed(2).replace(".", ",") + ":1" :
        "1:" + (h / w).toFixed(2).replace(".", ","));
  }
  // weicht das Bild um mehr als 8 % vom Format ab, fragt die Karte (bis die Lehrkraft zuschneidet oder es lässt)
  function formatFrage(b) {
    var f = format(b), m = b.datei && Z.assets[b.datei] && masse(Z.assets[b.datei]);
    if (!f || !m || ((Z.mappe.bildformat || {})[b.datei])) return null;
    return Math.abs(m[0] / m[1] / (f[0] / f[1]) - 1) > 0.08 ? { f: f, ist: verhaeltnisText(m[0], m[1]) } : null;
  }

  // Bild für die Kursdatei: auf die lange Kante aus dem Katalog verkleinern, ohne Transparenz als JPEG, sonst als PNG
  // neu kodieren (dabei fallen Metadaten wie Ort und Gerät weg); der Name aus der Kursdatei bleibt, den Mimetyp liest
  // der Generator aus dem Dateikopf. Mit `f` ([16, 9]) vorher der mittige Ausschnitt in diesem Verhältnis (c7)
  async function bildVorbereiten(datei, f) {
    var o = S.katalog.oberflaeche.bild_hochladen, quelle;
    try { quelle = await createImageBitmap(datei); }
    catch (e) {
      quelle = new Image(); var url = URL.createObjectURL(datei); quelle.src = url;
      try { await quelle.decode(); }
      catch (e2) {                    // AP13.42 B1: keine rohe Browsermeldung; die Zeile zeigt einen deutschen Satz
        var f = new Error(String(e2 && e2.message || e2)); f.bildLesen = datei.name || ""; throw f;
      } finally { URL.revokeObjectURL(url); }
    }
    var w0 = quelle.width || quelle.naturalWidth, h0 = quelle.height || quelle.naturalHeight, sw = w0, sh = h0;
    if (f) { if (w0 / h0 > f[0] / f[1]) sw = Math.round(h0 * f[0] / f[1]); else sh = Math.round(w0 * f[1] / f[0]); }
    var k = Math.min(1, o.kante / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1,
        Math.round(sh * k));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(quelle, Math.round((w0 - sw) / 2), Math.round((h0 - sh) / 2), sw, sh, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data, durchsichtig = false;
    for (var i = 3; i < px.length && !durchsichtig; i += 4) durchsichtig = px[i] < 255;
    var blob = await new Promise(function (r) { c.toBlob(r, durchsichtig ? "image/png" : "image/jpeg",
        o.qualitaet / 100); });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), breite: w, hoehe: h, vorher: datei.size,
        nachher: blob.size };
  }

  // AP13.28: Die Zeile eines Bildes in der Liste (offen oder zu)
  function zeileVon(name) {
    return $("bilder-liste").querySelector(".bild-zeile[data-datei=\"" + CSS.escape(name) + "\"]");
  }
  // Nach einer Wahl oder einem Drop gilt die Zeile nicht mehr als geschützt: das Dateifeld (oder ein anderer Knopf der
  // Zeile) gibt den Fokus ab, sonst bliebe die Karte in ihrem alten Zustand stehen. -> war der Fokus in der Zeile?
  function fokusAb(name) {
    var li = zeileVon(name), a = document.activeElement;
    if (li) delete li.dataset.waehlt;
    if (li && a && a !== document.body && li.contains(a)) { a.blur(); return true; }
    return false;
  }
  // Immer nach dem Setzen, auch wenn ein Schritt davor geworfen hat: ein Bild in Z.assets ist in der Karte sichtbar.
  // `zeichne()` bleibt draußen, es kann selbst werfen. Der Fokus geht auf „Passt“ der neuen Karte, wenn er vorher in
  // der Zeile lag und inzwischen nirgends sonst ist.
  function bildGezeichnet(name, fokus) {
    try { zeichneBilder(); geaendert(); } catch (e) { zeigeFehler(e); }
    if (!fokus || (document.activeElement && document.activeElement !== document.body)) return;
    var li = zeileVon(name), k = li && li.querySelector(".bild-passt, .bild-zuschneiden");
    if (k) k.focus({ preventScroll: true });
  }

  async function bildSetzen(datei, name) {
    var fokus = false;
    try {
      var bild = await bildVorbereiten(datei);
      Z.assets[name] = bild.bytes;
      fokus = fokusAb(name);
      if (Z.mappe && Z.mappe.bildformat) delete Z.mappe.bildformat[name];      // neues Bild: Format und Prüfung neu
      if (Z.mappe && Z.mappe.bildpruefung) delete Z.mappe.bildpruefung[name];
      bildGroesse[name] = await km.mappeFn("bild_verkleinert", [bild.vorher, bild.nachher]);
      bildFehlerWeg(name);
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne();
    } catch (e) { bildFehler(e, name); }
    finally { bildGezeichnet(name, fokusAb(name) || fokus); }
  }
  // AP13.42 B1: Meldung an der Zeile (und im Kopf) für eine Datei, die kein Bild ist; der nächste Erfolg räumt beides ab
  var bildMeldung = S.bildMeldung = {};      // schritte.js neuStart leert sie beim Mappenwechsel
  function bildFehler(e, name) {
    if (!e || e.bildLesen === undefined) { zeigeFehler(e); return; }
    var satz = S.katalog.oberflaeche.bild_nicht_lesbar.replace("{name}", e.bildLesen || name);
    console.warn(e.message);
    bildMeldung[name] = satz;
    S.status(satz, "fehler");
  }
  function bildFehlerWeg(name) {
    var satz = bildMeldung[name]; delete bildMeldung[name];
    var k = $("kopf-status");
    if (satz && k && k.textContent === satz) S.status("Bereit", "ok");
  }

  // c7: mittiger Ausschnitt im Format des Prompts aus dem Bild im Speicher; die Wahl steht in der Mappe (`bildformat`)
  async function zuschneiden(name, f) {
    var fokus = false;
    try {
      var bild = await bildVorbereiten(new Blob([Z.assets[name]]), f);
      Z.assets[name] = bild.bytes;
      fokus = fokusAb(name);
      formatMerken(name, "zugeschnitten");
      bildGroesse[name] = "Auf " + f[0] + ":" + f[1] + " zugeschnitten, " + bild.breite + " × " + bild.hoehe + " px.";
      bildFehlerWeg(name);
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne();
    } catch (e) { bildFehler(e, name); }
    finally { bildGezeichnet(name, fokusAb(name) || fokus); }
  }
  function formatMerken(name, wahl) { (Z.mappe.bildformat = Z.mappe.bildformat || {})[name] = wahl; }

  // „Passt“ geklickt = true; Kursmappen von vor AP13.5f tragen je Bild eine Liste mit Haken
  function bildGeprueft(datei) {
    var p = (Z.mappe.bildpruefung || {})[datei];
    return p === true || (Array.isArray(p) && p.length > 0 && p.every(function (x) { return x === true; }));
  }
  // Vorschau aus den Bytes im Speicher; eine Adresse je Bilddatei, neu, wenn das Bild ersetzt wird
  var vorschauen = {};
  function vorschauUrl(datei) {
    var bytes = Z.assets[datei], v = vorschauen[datei];
    if (v && v.bytes === bytes) return v.url;
    if (v) URL.revokeObjectURL(v.url);
    var url = URL.createObjectURL(new Blob([bytes], { type: bytes[0] === 0x89 ? "image/png" : "image/jpeg" }));
    vorschauen[datei] = { bytes: bytes, url: url };
    return url;
  }
  function vorschau(datei) {
    var url = vorschauUrl(datei);
    return el("a", { cls: "bild-vorschau", href: url, target: "_blank", rel: "noopener",
        title: S.katalog.oberflaeche.bild_pruefung, "aria-label": "Bild „" + datei + "“ in voller Größe öffnen" },
      [el("img", { src: url, alt: "", style: "display: block; max-width: min(240px, 100%); max-height: 240px; " +
          "margin-top: 10px; border: 1px solid var(--linie); cursor: zoom-in;" })]);
  }
  // AP13.5h a7: genau eine Karte offen; `offenWahl` = Schlüssel der Karte, die die Lehrkraft geöffnet hat, sonst die
  // erste ohne geprüftes Bild
  var offenWahl = null;
  function stil() {
    if (document.getElementById("stil-bilder")) return;
    document.head.appendChild(el("style", { id: "stil-bilder", text: [
      ".bild-format { color: var(--leise); font-size: 0.9rem; }",
      ".bild-fehler { color: var(--fehler); font-size: 0.93rem; margin: 8px 0 0; }",
      ".bild-zeile.zu { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding-top: 8px;",
      "  padding-bottom: 8px; cursor: pointer; }",
      ".bild-zeile.zu:hover, .bild-zeile.zu.ueber { background: var(--grund); }",
      ".bild-zeile.zu.ueber { outline: 2px dashed var(--linie); outline-offset: -2px; }",
      ".bild-zeile.zu img { display: block; width: 48px; height: 48px; object-fit: cover; border-radius: 4px;",
      "  border: 1px solid var(--linie); }",
      ".bild-zeile.zu .bild-oeffnen { font-weight: 600; }",
      ".bild-zeile.zu .bild-baustein { color: var(--leise); font-size: 0.9rem; }",
      ".bild-zeile.zu .bild-status { margin-left: auto; }",
      ".bild-format-frage { margin-top: 10px; padding: 8px 12px; border-left: 3px solid var(--warn);",
      "  background: var(--warn-flaeche); font-size: 0.93rem; }",
      ".bild-format-frage p { margin: 0 0 6px; }",
      ".bild-format-frage .kopieren { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }",
      ".bilder-hinweis { margin: 8px 0; }"
    ].join("\n") }));
  }
  function schluesselListe(w) {
    var gesehen = {};
    return w.map(function (b, i) {
      var k = b.datei || "#" + i;
      if (gesehen[k]) k += "#" + i;
      gesehen[k] = 1;
      return k;
    });
  }
  function bildDa(b) { return !!(b.datei && Z.assets[b.datei]); }
  function offenSchluessel(w, keys) {
    if (offenWahl !== null && keys.indexOf(offenWahl) >= 0) return offenWahl;
    offenWahl = null;
    var i = w.findIndex(function (b) { return !(bildDa(b) && bildGeprueft(b.datei)); });
    return i >= 0 ? keys[i] : null;
  }
  // nach „Passt“: die nächste Karte ohne geprüftes Bild hinter dieser, sonst davor; keine = alle zu
  function naechsteOffen(key) {
    var w = bildwuensche(), keys = schluesselListe(w), i = keys.indexOf(key);
    var reihe = keys.slice(i + 1).concat(keys.slice(0, Math.max(i, 0)));
    var n = reihe.filter(function (k) { var b = w[keys.indexOf(k)]; return !(bildDa(b) && bildGeprueft(b.datei)); })[0];
    offenWahl = n === undefined ? null : n;
  }
  // Datei gewählt: direkt am Eingabefeld, damit eine Wahl auch dann ankommt, wenn die Zeile inzwischen ersetzt wurde
  function dateiGewaehlt(ev) {
    var inp = ev.target, f = inp.files && inp.files[0], li = inp.closest(".bild-zeile");
    if (li) delete li.dataset.waehlt;
    inp.value = "";
    if (f) bildSetzen(f, inp.dataset.datei);
  }
  // eine Zeile, deren Dateiwahl läuft oder deren Eingabefeld den Fokus hat, wird nicht ersetzt
  function geschuetzt(li) {
    var a = document.activeElement;
    return (a && a.classList && a.classList.contains("bild-datei") && li.contains(a)) ||
        (li.dataset.waehlt && Date.now() - +li.dataset.waehlt < 120000);
  }
  function statusText(da, geprueft) { return da ? (geprueft ? "da" : "da, ungeprüft") : "fehlt"; }
  function bausteinText(b, nr) {
    return nr ? "zu Baustein " + nr + " „" + b.titel + "“" : "kein Baustein nennt dieses Bild";
  }
  // Zustand und Bau je Zeile; der Neuaufbau tauscht nur Zeilen, deren Zustand sich geändert hat (AP13.5h a1)
  // MF3 (Konzept §3.6): „Bild hochladen“ steht an jeder Zeile, auch an der zugeklappten; das Dateifeld liegt im Knopf
  function hochKnopf(b, da, cls) {
    var eingabe = el("input", { type: "file", cls: "unsichtbar bild-datei",
        accept: "image/png,image/jpeg,image/gif,image/webp", "data-datei": b.datei });
    eingabe.addEventListener("change", dateiGewaehlt);
    eingabe.addEventListener("cancel", function () { var li = eingabe.closest(".bild-zeile"); if (li) delete li.dataset.waehlt; });
    eingabe.addEventListener("click", function () {
      var li = eingabe.closest(".bild-zeile"); if (li) li.dataset.waehlt = String(Date.now()); });
    return el("label", { cls: "knopf klein-knopf bild-hoch" + (cls ? " " + cls : "") }, [da ? "Bild ersetzen" : "Bild hochladen",
        eingabe]);
  }
  function zeileBeschreiben(b, i, key, offen) {
    var da = bildDa(b), geprueft = da && bildGeprueft(b.datei), f = format(b), url = da ? vorschauUrl(b.datei) : "";
    var nr = b.baustein ? Z.mappe.bausteine.findIndex(function (k) { return k.id === b.baustein; }) + 1 : 0;
    var auftrag = b.prompt || b.wunsch || "", frage = offen && da ? formatFrage(b) : null;
    var stand = (b.datei && bildGroesse[b.datei]) || "", meldung = (b.datei && bildMeldung[b.datei]) || "";
    var zustand = JSON.stringify([offen, i, b.datei || "", nr, b.titel || "", auftrag, da, geprueft, f, url,
      frage && frage.ist, stand, meldung]);
    var kl = "bild-zeile" + (da ? (geprueft ? " da" : " da ungeprueft") : "");
    function bau() {
      if (!offen) {
        return el("li", { cls: kl + " zu", "data-datei": b.datei || "", "data-key": key, "data-zustand": zustand }, [
          da ? el("img", { src: url, alt: "" }) : null,
          el("button", { type: "button", cls: "textlink bild-name bild-oeffnen", "aria-expanded": "false",
              "aria-label": "Bild „" + (b.datei || "ohne Dateinamen") + "“ öffnen", text: b.datei ||
              "Bild ohne Dateinamen" }),
          el("span", { cls: "bild-format", text: formatText(f) }),
          el("span", { cls: "bild-baustein", text: bausteinText(b, nr) }),
          el("span", { cls: "bild-status" }, [el("span", { cls: "punkt", "aria-hidden": "true" }),
            statusText(da, geprueft)]),
          b.datei ? hochKnopf(b, da, "bild-hoch-zu") : null]);
      }
      var infoId = "bild-info-" + i;
      return el("li", { cls: kl, "data-datei": b.datei || "", "data-key": key, "data-zustand": zustand }, [
        el("p", { cls: "bild-kopf" }, [
          el("span", { cls: "bild-name", text: b.datei || "Bild ohne Dateinamen" }),
          el("span", { cls: "bild-format", text: formatText(f) }),
          el("span", { cls: "bild-baustein", text: bausteinText(b, nr) }),
          el("span", { cls: "bild-status" }, [el("span", { cls: "punkt", "aria-hidden": "true" }),
            statusText(da, geprueft)])]),
        // MF3: zuerst der Weg für ein eigenes Bild (Knopf und Ablage), dann der Auftrag für einen Generator
        b.datei ? el("div", { cls: "bild-ablage", "data-datei": b.datei }, [hochKnopf(b, da),
          el("span", { cls: "bild-ablage-text", text: "oder hierher ziehen" })]) : null,
        // a6: nur der Auftrag für den Bildgenerator; ältere Antworten ohne Bildprompt zeigen hier den Bildwunsch.
        // MF3: die Hinweise zu Generatoren, Rechten und dem Bildguthaben des Chats hinter dem (i)
        auftrag ? el("div", { cls: "bild-text" }, [
          el("div", { cls: "bild-text-kopf" }, [el("span", { text: "Auftrag für einen Bildgenerator" }),
            el("button", { type: "button", cls: "klein bild-kopieren", "data-nr": i, "data-art": "prompt",
                text: "Auftrag kopieren" }),
            el("button", { type: "button", cls: "info-knopf", "aria-expanded": "false", "aria-controls": infoId,
                "aria-label": "Hinweise zu Bildern und Generatoren", "data-hinweis": "5.5-auftrag", text: "i" })]),
          el("p", { id: infoId, cls: "info-text", hidden: true }),
          el("p", { cls: "von-chat", text: auftrag })]) : null,
        da ? el("div", { cls: "kopieren bild-pruefung" }, [vorschau(b.datei),
          el("button", { type: "button", cls: "knopf klein-knopf bild-passt", "data-datei": b.datei,
              "aria-pressed": String(geprueft), text: "Passt" })]) : null,
        frage ? el("div", { cls: "bild-format-frage" }, [
          el("p", { text: "Das Bild ist " + frage.ist + ", der Auftrag sagt " + frage.f.join(":") + "." }),
          el("div", { cls: "kopieren" }, [
            el("button", { type: "button", cls: "knopf klein-knopf bild-zuschneiden", "data-datei": b.datei,
                text: "Auf " + frage.f.join(":") + " zuschneiden" }),
            el("button", { type: "button", cls: "textlink bild-lassen", "data-datei": b.datei, text: "So lassen" })])])
          : null,
        meldung ? el("p", { cls: "bild-fehler", role: "alert", text: meldung }) : null,
        el("p", { cls: "stand bild-stand", role: "status", text: stand })]);
    }
    return { key: key, zustand: zustand, bau: bau };
  }
  function zeichneBilder() {
    stil();
    var ol = $("bilder-liste"), w = bildwuensche(), keys = schluesselListe(w), offen = offenSchluessel(w, keys);
    // c8: der Hinweis des gewählten Chats zu seinem Bildgenerator (katalog.yaml chats.bilder_hinweis) steht seit MF3 im (i)
    // am Auftrag (schritte.js hinweisText „5.5-auftrag“)
    var alt = {};
    Array.prototype.forEach.call(ol.children, function (li) { alt[li.dataset.key] = li; });
    var vorher = null;
    w.forEach(function (b, i) {
      var d = zeileBeschreiben(b, i, keys[i], keys[i] === offen), li = alt[d.key];
      delete alt[d.key];
      if (!li) li = d.bau();
      else if (li.dataset.zustand !== d.zustand && !geschuetzt(li)) {
        var neu = d.bau(); li.replaceWith(neu); li = neu;
      }
      var soll = vorher ? vorher.nextSibling : ol.firstChild;
      if (soll !== li) ol.insertBefore(li, soll);
      vorher = li;
    });
    Object.keys(alt).forEach(function (k) { alt[k].remove(); });
    var fehlen = 0, mitDatei = 0, geprueftZahl = 0;
    w.forEach(function (b) {
      if (b.datei && !bildDa(b)) fehlen += 1;
      if (b.datei) mitDatei += 1;
      if (bildDa(b) && bildGeprueft(b.datei)) geprueftZahl += 1;
    });
    var bz = Z.kennzahlen && Z.kennzahlen.bilder;
    $("bilder-stufe").textContent = bz ? bz.stufe.charAt(0).toUpperCase() + bz.stufe.slice(1) + " gewählt, " + bz.zahl +
        " im Text" : "";
    // MF3 (Konzept §3.6): der Hauptknopf nennt immer den nächsten Schritt und geht immer (fehlende Bilder bleiben
    // Platzhalter); „Ohne Bilder weiter“ daneben nimmt die fehlenden Bilder aus der Einheit
    $("weiter-bilder").textContent = "Weiter: " + S.kurzName(S.fragenListe.length && !Z.mappe.durchsicht ? 6 : 7);
    $("bilder-weg").hidden = !fehlen;
    $("bilder-weg").textContent = fehlen === mitDatei ? "Ohne Bilder weiter" : "Ohne die fehlenden Bilder weiter";
    $("bilder-stand").textContent = !w.length ? "" : fehlen
      ? (fehlen === 1 ? "Ein Bild fehlt" : fehlen + " Bilder fehlen") +
          "; im Kurs steht dort ein grauer Platzhalter, bis du es nachlieferst."
      : geprueftZahl + " von " + mitDatei + " Bildern geprüft";
    $("bilder-stand").className = "stand " + (fehlen ? "" : "ok");
  }
  // MF3: „Ohne Bilder weiter“: die fehlenden Bilder (ohne Datei; sind es alle, jede Bildzeile und jeder Bildwunsch der
  // Einheit) gehen aus der Einheit (gen/mappe.py bilder_entfernen), im Kurs steht dort nichts; danach weiter wie „Weiter“
  $("bilder-weg").onclick = async function () {
    if (!Z.mappe) return;
    var w = bildwuensche(), namen = w.filter(function (b) { return b.datei && !bildDa(b); }).map(function (b) { return b.datei; });
    if (!namen.length) return;
    var alle = namen.length === w.length && !S.mehrereEinheiten();
    try {
      await km.bereit();
      var md = await km.mappeFn("bilder_entfernen", [Z.kurs_md, alle ? null : namen]);
      if (S.ausAntwort) S.ausAntwort(md);       // kein Grund, den Text für den Chat neu zu kopieren
      await km.stand(md);
      await auswertung();
      zeichne(); geaendert();
      $("weiter-bilder").onclick();
    } catch (e) { zeigeFehler(e); }
  };
  // Wechsel der offenen Karte: die Liste bleibt, wo sie im Fenster steht (kein Sprung durch das Zuklappen); steht die
  // neue Karte dann über dem Fensterrand, rückt sie an den oberen Rand. Wird die Liste kürzer, hält eine Mindesthöhe
  // die Seite so lang, dass der Browser nicht nach oben rutscht; sie schwindet, sobald unter dem Fenster Platz ist
  function reserveKuerzen() {
    var ol = $("bilder-liste"); if (!ol.style.minHeight) return;
    var natur = 2 + Array.prototype.reduce.call(ol.children, function (n, li) { return n + li.offsetHeight; }, 0);
    var jetzt = ol.offsetHeight, unten = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    var neu = jetzt - Math.min(Math.max(0, unten), Math.max(0, jetzt - natur));
    ol.style.minHeight = neu > natur ? neu + "px" : "";
  }
  window.addEventListener("scroll", reserveKuerzen, { passive: true });
  function wechseln(fn) {
    var ol = $("bilder-liste"), oben = ol.getBoundingClientRect().top;
    ol.style.minHeight = ol.offsetHeight + "px";
    fn();
    var d = ol.getBoundingClientRect().top - oben;
    if (Math.abs(d) >= 1) window.scrollBy(0, d);
    reserveKuerzen();
    var auf = ol.querySelector(".bild-zeile:not(.zu)");
    if (auf && auf.getBoundingClientRect().top < 0) auf.scrollIntoView({ block: "start" });
    return auf;
  }
  // erst „Auftrag kopieren“, dann „Passt“, dann das Dateifeld (die Ablage steht seit MF3 vor dem Auftrag)
  function erstesZiel(li) { return li.querySelector(".bild-kopieren") || li.querySelector(".bild-passt") ||
      li.querySelector(".bild-datei"); }
  function oeffnen(key) {
    var auf = wechseln(function () { offenWahl = key; zeichneBilder(); });
    var k = auf && erstesZiel(auf);
    if (k) k.focus({ preventScroll: true });
  }
  $("bilder-liste").addEventListener("click", function (ev) {
    var passt = ev.target.closest(".bild-passt");
    if (passt) {                         // „Passt“ prüft das Bild, klappt die Karte zu und öffnet die nächste
      var p = Z.mappe.bildpruefung = Z.mappe.bildpruefung || {}, d = passt.dataset.datei;
      p[d] = true;
      var auf = wechseln(function () { naechsteOffen(passt.closest(".bild-zeile").dataset.key); zeichneBilder(); });
      geaendert();
      var k = auf ? erstesZiel(auf) :
          $("bilder-liste").querySelector(".bild-oeffnen[aria-label*='" + CSS.escape(d) + "']");
      if (k) k.focus({ preventScroll: true });
      return;
    }
    var zu = ev.target.closest(".bild-zeile.zu");
    if (zu && ev.target.closest(".bild-hoch")) return;      // MF3: der Knopf öffnet die Dateiwahl, die Zeile bleibt
    if (zu) { oeffnen(zu.dataset.key); return; }
    var zs = ev.target.closest(".bild-zuschneiden, .bild-lassen");
    if (zs) {
      var dz = zs.dataset.datei, wz = bildwuensche().filter(function (x) { return x.datei === dz; })[0];
      if (zs.classList.contains("bild-lassen")) { formatMerken(dz, "belassen"); zeichneBilder(); geaendert(); }
      else if (wz && format(wz)) zuschneiden(dz, format(wz));
      return;
    }
    var b = ev.target.closest(".bild-kopieren"); if (!b) return;
    var w = bildwuensche()[parseInt(b.dataset.nr, 10)]; if (!w) return;
    var t = w.prompt || w.wunsch;
    $("bild-feld").value = t;
    kopieren(t, $("bild-feld"), b.closest(".bild-zeile").querySelector(".bild-stand"),
      "Kopiert. Füge den Auftrag in einen Bildgenerator ein.");
  });
  // Ablegen: auf die Fläche einer offenen Karte oder auf eine zugeklappte Zeile (öffnet sie)
  function ablage(ev) { return ev.target.closest(".bild-ablage, .bild-zeile.zu:not([data-datei=''])"); }
  ["dragenter", "dragover"].forEach(function (art) {
    $("bilder-liste").addEventListener(art, function (ev) {
      var z = ablage(ev); if (!z) return;
      ev.preventDefault(); z.classList.add("ueber");
    });
  });
  $("bilder-liste").addEventListener("dragleave", function (ev) { var z = ablage(ev);
      if (z && !z.contains(ev.relatedTarget)) z.classList.remove("ueber"); });
  $("bilder-liste").addEventListener("drop", function (ev) {
    var z = ablage(ev); if (!z) return;
    ev.preventDefault(); z.classList.remove("ueber");
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!f) return;                 // AP13.42 B1: jede Datei geht an bildSetzen; die deutsche Meldung kommt von dort
    if (z.classList.contains("zu")) oeffnen(z.dataset.key);
    bildSetzen(f, z.dataset.datei);
  });
  Object.assign(S, { bildSetzen: bildSetzen, bildnamen: bildnamen, zeichneBilder: zeichneBilder, bildMasse: masse,
    vorschauUrl: vorschauUrl });
})();
