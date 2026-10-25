/* Kursmühle – Bilder: Hochladen mit Verkleinern, Schritt Bilder mit Prüffragen. */
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

  // Bild für die Kursdatei: auf die lange Kante aus dem Katalog verkleinern, ohne Transparenz als JPEG, sonst als PNG
  // neu kodieren (dabei fallen Metadaten wie Ort und Gerät weg); der Name aus der Kursdatei bleibt, den Mimetyp liest
  // der Generator aus dem Dateikopf
  async function bildVorbereiten(datei) {
    var o = S.katalog.oberflaeche.bild_hochladen, quelle;
    try { quelle = await createImageBitmap(datei); }
    catch (e) {
      quelle = new Image(); var url = URL.createObjectURL(datei); quelle.src = url;
      await quelle.decode(); URL.revokeObjectURL(url);
    }
    var w0 = quelle.width || quelle.naturalWidth, h0 = quelle.height || quelle.naturalHeight;
    var f = Math.min(1, o.kante / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * f)), h = Math.max(1,
        Math.round(h0 * f));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(quelle, 0, 0, w, h);
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
      bildGroesse[name] = await km.mappeFn("bild_verkleinert", [bild.vorher, bild.nachher]);
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); }
  }

  function bildGeprueft(datei) {
    var p = (Z.mappe.bildpruefung || {})[datei] || [];
    return S.katalog.oberflaeche.bild_pruefung.every(function (_, j) { return p[j] === true; });
  }
  function zeichneBilder() {
    var ol = $("bilder-liste"), w = bildwuensche(), fragen = S.katalog.oberflaeche.bild_pruefung;
    ol.innerHTML = "";
    var fehlen = 0;
    w.forEach(function (b, i) {
      var da = !!(b.datei && Z.assets[b.datei]), geprueft = da && bildGeprueft(b.datei);
      var haken = (Z.mappe.bildpruefung || {})[b.datei] || [];
      if (b.datei && !da) fehlen += 1;
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
          el("span", { cls: "bild-baustein", text: nr ? "zu Baustein " + nr + " „" + b.titel +
              "“" : "kein Baustein nennt dieses Bild" }),
          el("span", { cls: "bild-status" }, [el("span", { cls: "punkt", "aria-hidden": "true" }),
            da ? (geprueft ? "da" : "da, ungeprüft") : "fehlt"])]),
        text("wunsch", "Was zu sehen ist", b.wunsch, "Beschreibung kopieren"),
        text("prompt", "Auftrag für einen Bildgenerator", b.prompt, "Auftrag kopieren"),
        b.datei ? el("fieldset", { cls: "bild-pruefung" }, [el("legend", { text: "Vor dem Hochladen ansehen" })].concat(
          fragen.map(function (f, j) {
            return el("label", { cls: "bild-frage" }, [el("input", { type: "checkbox", cls: "bild-haken",
                "data-datei": b.datei,
              "data-nr": j, checked: haken[j] === true }), f]);
          }))) : null,
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
      : "Alle Bilder sind da.";
    $("bilder-stand").className = "stand " + (fehlen ? "" : "ok");
  }
  $("bilder-liste").addEventListener("click", function (ev) {
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
    if (ev.target.classList.contains("bild-haken")) {
      var p = Z.mappe.bildpruefung = Z.mappe.bildpruefung || {}, d = ev.target.dataset.datei;
      p[d] = S.katalog.oberflaeche.bild_pruefung.map(function (_, j) { return (p[d] || [])[j] === true; });
      p[d][parseInt(ev.target.dataset.nr, 10)] = ev.target.checked;
      zeichneBilder(); geaendert();
      return;
    }
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
  Object.assign(S, { bildSetzen: bildSetzen, bildnamen: bildnamen, zeichneBilder: zeichneBilder });
})();
