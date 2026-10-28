/* Kursmühle – eigenes Material aus Dateien (AP13.13): Datei lesen oder auf das Feld ziehen, Abschnitte wählen, ins
 * Materialfeld übernehmen. Gelesen wird im Worker (gen/material.py über gen/api.py); die Dateien verlassen den Rechner
 * nicht und werden nicht gespeichert. Die Liste ist kein zweiter Speicher: Nach „Ins Materialfeld übernehmen“ ist alles
 * Text in Z.mappe.material, beim Wechsel des Zweigs schließt sie. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, chatInfo = S.chatInfo, el = S.el, geaendert = S.geaendert, kb = S.kb;
  var MAX = 20 * 1024 * 1024;          // wie MAX_DATEI in gen/material.py; größere Dateien gehen nicht in den Worker
  var ZU_VIEL = "Kürze das Material oder wähle weniger Abschnitte.";
  var listen = { r: [], a: [] };       // je Feld: [{name, lesen, ergebnis, wahl: [bool]}]
  var kette = Promise.resolve();       // Dateien nacheinander: der Worker arbeitet eine Nachricht nach der anderen ab

  function bytes(t) { return new Blob([t]).size; }

  // Text fürs Materialfeld wie gen.material.zusammensetzen: `# Aus <Datei>`, darunter die gewählten Abschnitte
  function auswahlText(seite) {
    return listen[seite].map(function (d) {
      if (!d.ergebnis || !d.ergebnis.ok) return "";
      var teile = d.ergebnis.abschnitte.filter(function (a, i) { return d.wahl[i]; }).map(function (a) { return a.text; });
      return teile.length ? "# Aus " + d.name + "\n\n" + teile.join("\n\n") : "";
    }).filter(Boolean).join("\n\n");
  }

  // Grenze (Entscheidung 26.10.): ohne Chat oder ohne Messwert nur die Größe; rot erst, wenn ein Chat mit eingabe_kb
  // gewählt ist und Teil 1 heute plus die Auswahl darüber liegt (in Bytes)
  function grenze(neu) {
    var c = chatInfo(Z.mappe && Z.mappe.chat), auswahl = bytes(neu);
    if (!c || !c.eingabe_kb) return { text: "Gewählt: etwa " + kb(auswahl) + ".", zuViel: false };
    var gesamt = S.textGroesse() + auswahl + (Z.mappe.material ? 2 : 0);
    var zuViel = gesamt > c.eingabe_kb * 1024;
    return { zuViel: zuViel, text: "Gewählt: etwa " + kb(auswahl) + ". " + c.text + " nahm im Test " + c.eingabe_kb +
        " KB Text an; der Text für den Chat hätte damit etwa " + kb(gesamt) + "." + (zuViel ? " " + ZU_VIEL : "") };
  }

  function zeichneListe(seite) {
    var ort = $(seite + "-material-liste"), l = listen[seite];
    ort.hidden = !l.length;
    ort.textContent = "";
    if (!l.length) return;
    l.forEach(function (d, n) {
      var e = d.ergebnis, kinder = [el("legend", { text: d.name + (e && e.ok ? " (" + e.format + ")" : "") })];
      if (d.lesen) kinder.push(el("p", { cls: "stand", text: "Lese " + d.name + " …" }));
      else if (!e.ok) kinder.push(el("p", { cls: "stand fehler", text: e.hinweis }));
      else {
        kinder.push(el("div", { cls: "material-alle" }, [
          el("button", { type: "button", cls: "textlink", "data-datei": n, "data-alle": "ja", text: "Alle" }),
          el("button", { type: "button", cls: "textlink", "data-datei": n, "data-alle": "nein", text: "Keine" })]));
        kinder.push(el("ul", { cls: "material-abschnitte" }, e.abschnitte.map(function (a, i) {
          var box = el("input", { type: "checkbox", "data-datei": n, "data-abschnitt": i });
          box.checked = d.wahl[i];
          return el("li", {}, [el("label", {}, [box, " " + a.titel + " ",
            el("span", { cls: "feld-zeile", text: a.zeichen.toLocaleString("de-DE") + " Zeichen" })])]);
        })));
        if (e.hinweis) kinder.push(el("p", { cls: "stand", text: e.hinweis }));
      }
      ort.appendChild(el("fieldset", { cls: "material-datei-liste" }, kinder));
    });
    var neu = auswahlText(seite), g = grenze(neu), lesen = l.some(function (d) { return d.lesen; });
    ort.appendChild(el("p", { cls: "feld-zeile material-summe" + (g.zuViel ? " fehler" : ""), text: g.text }));
    ort.appendChild(el("p", { cls: "feld-zeile", text: "Nur Material, an dem du die Rechte hast." }));
    ort.appendChild(el("div", { cls: "material-knoepfe" }, [
      el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "uebernehmen", disabled: lesen || !neu,
        text: "Ins Materialfeld übernehmen" }),
      el("button", { type: "button", cls: "textlink", "data-aktion": "verwerfen", text: "Verwerfen" })]));
  }

  // Ein Weg ins Feld: setzt Z.mappe.material und beide Felder (.value löst kein input aus)
  function materialSetzen(text) {
    if (!Z.mappe) return;
    Z.mappe.material = text;
    $("r-material").value = text; $("a-material").value = text;
    if (/\S/.test(text)) { S.feldOk($("r-material")); S.feldOk($("a-material")); }   // AP13.19 §1: Pflichtsatz geht
    geaendert();
    S.felderFuellen();
  }

  function uebernehmen(seite) {
    var neu = auswahlText(seite); if (!neu) return;
    var alt = (Z.mappe.material || "").replace(/\s+$/, "");
    materialSetzen(alt ? alt + "\n\n" + neu : neu);
    schliessen(seite);
    var f = $(seite + "-material");
    f.focus(); f.setSelectionRange(f.value.length, f.value.length);
  }

  function schliessen(seite) { listen[seite] = []; zeichneListe(seite); }

  function lesen(seite, dateien) {
    if (!Z.mappe) return;
    Array.prototype.forEach.call(dateien, function (f) {
      var d = { name: f.name, lesen: true, ergebnis: null, wahl: [] };
      listen[seite].push(d);
      kette = kette.then(async function () {
        try {
          if (f.size > MAX) d.ergebnis = { ok: false, hinweis: f.name + " ist größer als 20 MB." };
          else {
            await km.bereit();
            var buf = await f.arrayBuffer();
            d.ergebnis = (await km.anfrage("material_lesen", { name: f.name, daten: buf }, [buf])).ergebnis;
          }
        } catch (e) { d.ergebnis = { ok: false, hinweis: f.name + " lässt sich nicht lesen." }; }
        d.lesen = false;
        d.wahl = (d.ergebnis.abschnitte || []).map(function () { return true; });
        if (listen[seite].indexOf(d) >= 0) zeichneListe(seite);
      });
    });
    zeichneListe(seite);
  }

  ["r", "a"].forEach(function (seite) {
    var eingabe = $(seite + "-material-dateien"), ort = $(seite + "-material-liste");
    ort.setAttribute("aria-live", "polite");
    eingabe.addEventListener("change", function () { lesen(seite, eingabe.files); eingabe.value = ""; });
    ort.addEventListener("change", function (ev) {
      var b = ev.target; if (!b.dataset || b.dataset.abschnitt === undefined) return;
      listen[seite][+b.dataset.datei].wahl[+b.dataset.abschnitt] = b.checked;
      var s = ort.querySelector(".material-summe"), g = grenze(auswahlText(seite));
      s.textContent = g.text; s.classList.toggle("fehler", g.zuViel);
      ort.querySelector("[data-aktion=uebernehmen]").disabled = !auswahlText(seite) ||
          listen[seite].some(function (d) { return d.lesen; });
    });
    ort.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.alle) {
        var d = listen[seite][+b.dataset.datei];
        d.wahl = d.wahl.map(function () { return b.dataset.alle === "ja"; });
        zeichneListe(seite);
        var z = ort.querySelector("[data-datei='" + b.dataset.datei + "'][data-alle='" + b.dataset.alle + "']");
        if (z) z.focus();
      } else if (b.dataset.aktion === "uebernehmen") uebernehmen(seite);
      else if (b.dataset.aktion === "verwerfen") { schliessen(seite); $(seite + "-material").focus(); }
    });
    // Ablegen auf Feld und Liste; Text ins Feld ziehen bleibt erlaubt (nur Dateien werden abgefangen)
    var flaeche = ort.closest(".material-ort");
    ["dragenter", "dragover"].forEach(function (art) {
      flaeche.addEventListener(art, function (ev) {
        if (!dateienDabei(ev)) return;
        ev.preventDefault(); flaeche.classList.add("ueber");
      });
    });
    flaeche.addEventListener("dragleave", function (ev) {
      if (!flaeche.contains(ev.relatedTarget)) flaeche.classList.remove("ueber"); });
    flaeche.addEventListener("drop", function (ev) {
      if (!dateienDabei(ev)) return;
      ev.preventDefault(); flaeche.classList.remove("ueber");
      lesen(seite, ev.dataTransfer.files);
    });
  });
  function dateienDabei(ev) {
    var t = ev.dataTransfer && ev.dataTransfer.types;
    return !!t && Array.prototype.indexOf.call(t, "Files") >= 0;
  }
  // Eine knapp daneben abgelegte Datei soll nicht im Browser aufgehen
  ["dragover", "drop"].forEach(function (art) {
    document.addEventListener(art, function (ev) { if (dateienDabei(ev)) ev.preventDefault(); });
  });
  // Beim Wechsel des Zweigs schließt die Liste (sie wird nicht gespeichert)
  document.querySelector(".zweige").addEventListener("click", function (ev) {
    if (ev.target.closest("[data-zweig]")) { schliessen("r"); schliessen("a"); }
  });

  Object.assign(S, { materialSetzen: materialSetzen });
})();
