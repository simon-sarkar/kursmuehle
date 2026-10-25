/* Kursmühle – Bilder: Hochladen mit Verkleinern, Schritt Bilder mit Vorschau, Format aus dem Prompt, Zuschneiden und
 * „Passt“ (klappt die Karte zu). */
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
      await quelle.decode(); URL.revokeObjectURL(url);
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

  async function bildSetzen(datei, name) {
    try {
      var bild = await bildVorbereiten(datei);
      Z.assets[name] = bild.bytes;
      if (Z.mappe && Z.mappe.bildformat) delete Z.mappe.bildformat[name];      // neues Bild: Format und Prüfung neu
      if (Z.mappe && Z.mappe.bildpruefung) delete Z.mappe.bildpruefung[name];
      bildGroesse[name] = await km.mappeFn("bild_verkleinert", [bild.vorher, bild.nachher]);
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); }
  }

  // c7: mittiger Ausschnitt im Format des Prompts aus dem Bild im Speicher; die Wahl steht in der Mappe (`bildformat`)
  async function zuschneiden(name, f) {
    try {
      var bild = await bildVorbereiten(new Blob([Z.assets[name]]), f);
      Z.assets[name] = bild.bytes;
      formatMerken(name, "zugeschnitten");
      bildGroesse[name] = "Auf " + f[0] + ":" + f[1] + " zugeschnitten, " + bild.breite + " × " + bild.hoehe + " px.";
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); }
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
  var aufgeklappt = {};                             // „Ändern“ an einer geprüften Karte: offen bis „Passt“
  function stil() {
    if (document.getElementById("stil-bilder")) return;
    document.head.appendChild(el("style", { id: "stil-bilder", text: [
      ".bild-format { color: var(--leise); font-size: 0.9rem; }",
      ".bild-zeile.zu { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding-top: 8px;",
      "  padding-bottom: 8px; }",
      ".bild-zeile.zu img { display: block; width: 48px; height: 48px; object-fit: cover; border-radius: 4px;",
      "  border: 1px solid var(--linie); }",
      ".bild-zeile.zu .bild-status { margin-left: auto; }",
      ".bild-format-frage { margin-top: 10px; padding: 8px 12px; border-left: 3px solid var(--warn);",
      "  background: var(--warn-flaeche); font-size: 0.93rem; }",
      ".bild-format-frage p { margin: 0 0 6px; }",
      ".bild-format-frage .kopieren { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }",
      ".bilder-hinweis { margin: 8px 0; }"
    ].join("\n") }));
  }
  function zeichneBilder() {
    stil();
    var ol = $("bilder-liste"), w = bildwuensche();
    ol.innerHTML = "";
    // c8: Hinweis des gewählten Chats zu seinem Bildgenerator (katalog.yaml chats.bilder_hinweis)
    var hw = $("bilder-hinweis"), chat = S.chatInfo(Z.mappe.chat);
    if (!hw) { hw = el("p", { id: "bilder-hinweis", cls: "leise bilder-hinweis" }); $("bilder-stufe").before(hw); }
    hw.textContent = (chat && chat.bilder_hinweis) || "";
    hw.hidden = !hw.textContent;
    var fehlen = 0, mitDatei = 0, geprueftZahl = 0;
    w.forEach(function (b, i) {
      var da = !!(b.datei && Z.assets[b.datei]), geprueft = da && bildGeprueft(b.datei), f = format(b);
      if (b.datei && !da) fehlen += 1;
      if (b.datei) mitDatei += 1;
      if (geprueft) geprueftZahl += 1;
      if (geprueft && !aufgeklappt[b.datei]) {
        ol.appendChild(el("li", { cls: "bild-zeile da zu", "data-datei": b.datei }, [
          el("img", { src: vorschauUrl(b.datei), alt: "" }),
          el("span", { cls: "bild-name", text: b.datei }),
          el("span", { cls: "bild-format", text: formatText(f) }),
          el("span", { cls: "bild-status" }, [el("span", { cls: "punkt", "aria-hidden": "true" }), "da"]),
          el("button", { type: "button", cls: "textlink bild-aendern", "data-datei": b.datei,
              "aria-label": "Bild „" + b.datei + "“ ändern", text: "Ändern" })]));
        return;
      }
      var frage = da ? formatFrage(b) : null;
      var nr = b.baustein ? Z.mappe.bausteine.findIndex(function (k) { return k.id === b.baustein; }) + 1 : 0;
      var text = function (art, titel, inhalt, knopf) {
        return inhalt ? el("div", { cls: "bild-text" }, [
          el("div", { cls: "bild-text-kopf" }, [el("span", { text: titel }),
            el("button", { type: "button", cls: "klein bild-kopieren", "data-nr": i, "data-art": art, text: knopf })]),
          el("p", { cls: art === "wunsch" ? "" : "von-chat", text: inhalt })]) : null;
      };
      ol.appendChild(el("li", { cls: "bild-zeile" + (da ? (geprueft ? " da" : " da ungeprueft") : ""),
          "data-datei": b.datei || "" }, [
        el("p", { cls: "bild-kopf" }, [
          el("span", { cls: "bild-name", text: b.datei || "Bild ohne Dateinamen" }),
          el("span", { cls: "bild-format", text: formatText(f) }),
          el("span", { cls: "bild-baustein", text: nr ? "zu Baustein " + nr + " „" + b.titel +
              "“" : "kein Baustein nennt dieses Bild" }),
          el("span", { cls: "bild-status" }, [el("span", { cls: "punkt", "aria-hidden": "true" }),
            da ? (geprueft ? "da" : "da, ungeprüft") : "fehlt"])]),
        text("wunsch", "Was zu sehen ist", b.wunsch, "Beschreibung kopieren"),
        text("prompt", "Auftrag für einen Bildgenerator", b.prompt, "Auftrag kopieren"),
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
        b.datei ? el("div", { cls: "bild-ablage", "data-datei": b.datei }, [
          el("span", { text: "Bild hierher ziehen oder" }),
          el("label", { cls: "knopf klein-knopf" }, [da ? "Bild ersetzen" : "Bild hochladen",
            el("input", { type: "file", cls: "unsichtbar bild-datei", accept: "image/png,image/jpeg",
                "data-datei": b.datei })])]) : null,
        el("p", { cls: "stand bild-stand", role: "status", text: (b.datei && bildGroesse[b.datei]) || "" })]));
    });
    var bz = Z.kennzahlen && Z.kennzahlen.bilder;
    $("bilder-stufe").textContent = bz ? bz.stufe.charAt(0).toUpperCase() + bz.stufe.slice(1) + " gewählt, " + bz.zahl +
        " im Text" : "";
    $("weiter-bilder").textContent = fehlen ? "Ohne Bild weiter" : "Weiter";
    $("bilder-stand").textContent = !w.length ? "" : fehlen
      ? (fehlen === 1 ? "Ein Bild fehlt" : fehlen + " Bilder fehlen") +
          "; im Kurs steht dort ein grauer Platzhalter, bis du es nachlieferst."
      : geprueftZahl + " von " + mitDatei + " Bildern geprüft";
    $("bilder-stand").className = "stand " + (fehlen ? "" : "ok");
  }
  $("bilder-liste").addEventListener("click", function (ev) {
    var passt = ev.target.closest(".bild-passt");
    if (passt) {                                   // „Passt“ prüft das Bild und klappt die Karte zu
      var p = Z.mappe.bildpruefung = Z.mappe.bildpruefung || {}, d = passt.dataset.datei;
      p[d] = true; delete aufgeklappt[d];
      zeichneBilder(); geaendert();
      var neu = $("bilder-liste").querySelector(".bild-aendern[data-datei='" + CSS.escape(d) + "']");
      if (neu) neu.focus({ preventScroll: true });
      return;
    }
    var aendern = ev.target.closest(".bild-aendern");
    if (aendern) {
      aufgeklappt[aendern.dataset.datei] = true;
      zeichneBilder();
      var pk = $("bilder-liste").querySelector(".bild-passt[data-datei='" + CSS.escape(aendern.dataset.datei) + "']");
      if (pk) pk.focus({ preventScroll: true });
      return;
    }
    var zu = ev.target.closest(".bild-zuschneiden, .bild-lassen");
    if (zu) {
      var dz = zu.dataset.datei, wz = bildwuensche().filter(function (x) { return x.datei === dz; })[0];
      if (zu.classList.contains("bild-lassen")) { formatMerken(dz, "belassen"); zeichneBilder(); geaendert(); }
      else if (wz && format(wz)) zuschneiden(dz, format(wz));
      return;
    }
    var b = ev.target.closest(".bild-kopieren"); if (!b) return;
    var w = bildwuensche()[parseInt(b.dataset.nr, 10)]; if (!w) return;
    var t = b.dataset.art === "wunsch" ? w.wunsch : w.prompt;
    $("bild-feld").value = t;
    kopieren(t, $("bild-feld"), b.closest(".bild-zeile").querySelector(".bild-stand"),
      b.dataset.art === "wunsch" ?
          "Kopiert. Damit findest du ein freies Bild oder zeichnest " +
          "es." : "Kopiert. Füge den Auftrag in einen Bildgenerator ein.");
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
  $("bilder-liste").addEventListener("dragleave", function (ev) { var z = ev.target.closest(".bild-ablage");
      if (z) z.classList.remove("ueber"); });
  $("bilder-liste").addEventListener("drop", function (ev) {
    var z = ev.target.closest(".bild-ablage"); if (!z) return;
    ev.preventDefault(); z.classList.remove("ueber");
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f && /^image\/(png|jpeg)$/.test(f.type)) bildSetzen(f, z.dataset.datei);
  });
  Object.assign(S, { bildSetzen: bildSetzen, bildnamen: bildnamen, zeichneBilder: zeichneBilder, bildMasse: masse });
})();
