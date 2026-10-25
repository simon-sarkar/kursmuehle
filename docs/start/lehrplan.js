/* Kursmühle – LehrplanPLUS (AP13.6): Haken „Lehrplanbezug“, Picker Schulart → Fach → Zug/Variante → Lernbereiche am
 * Fach-Feld („Mach du“, „Ich gebe die Richtung“, „Mehr einstellen“), Vorschlag in „Mach du“. Die Daten liegen unter
 * lehrplan/ (web_bundle.py); index.json lädt erst mit dem Haken, wenn der Picker aufgeht oder „Mach du“ einen Vorschlag
 * sucht, eine Fachdatei erst bei der Fachwahl. Die Suche gibt es auch in Python (scripts/lehrplan.py, test_lehrplan.py
 * vergleicht beide). Texte gehen wörtlich in kurs.lehrplan, nie in den Kurs. */
"use strict";

(function () {
  // ---------------------------------------------------------------- Suche (Zwilling von scripts/lehrplan.py)
  var MIN_WORT = 5, ENDUNGEN = ["ern", "en", "er", "es", "e", "n", "s"];
  var SCHULARTEN = { grundschule: "Grundschule", mittelschule: "Mittelschule" };
  var WORT = /[A-Za-zÄÖÜäöüß]+/g, TEIL = /[A-ZÄÖÜ]?[a-zäöüß]+|[A-ZÄÖÜ]+(?![a-zäöüß])/g;
  function klein(w) { return w.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
      .replace(/ß/g, "ss"); }
  function stamm(w) {
    for (var i = 0; i < ENDUNGEN.length; i++) {
      var e = ENDUNGEN[i];
      if (w.slice(-e.length) === e && w.length - e.length >= MIN_WORT) return w.slice(0, -e.length);
    }
    return w;
  }
  function woerter(text) {
    var out = [];
    (String(text || "").match(WORT) || []).forEach(function (w) {
      if (w.length >= MIN_WORT) { var k = klein(w); if (out.indexOf(k) < 0) out.push(k); }
    });
    return out;
  }
  function stufe(text) {
    var m = String(text || "").match(/\d+/);
    if (!m) return null;
    var n = parseInt(m[0], 10);
    return n === 1 || n === 2 ? "1/2" : n === 3 || n === 4 ? "3/4" : n >= 5 && n <= 10 ? String(n) : null;
  }
  function schulartAnnahme(schulart, jahrgang) {
    var s = klein(String(schulart || "")).trim();
    if (SCHULARTEN[s]) return [s, false];
    if (s) return [null, false];
    var jg = stufe(jahrgang);
    if (!jg) return [null, false];
    return [jg === "1/2" || jg === "3/4" ? "grundschule" : "mittelschule", true];
  }
  var schatzCache = null;
  function wortschatz(index) {
    if (schatzCache && schatzCache.index === index) return schatzCache.w;
    var w = {};
    Object.keys(index.schularten).forEach(function (s) { index.schularten[s].faecher.forEach(function (f) {
      f.lernbereiche.forEach(function (lb) {
        woerter(lb.titel).forEach(function (x) { w[x] = 1; });
        lb.teilbereiche.forEach(function (t) { woerter(t).forEach(function (x) { w[x] = 1; }); });
        lb.stichwoerter.forEach(function (x) { w[x] = 1; });
      });
    }); });
    schatzCache = { index: index, w: w };
    return w;
  }
  function themenwoerter(thema, schatz) {
    var out = [];
    function dazu(w) { if (w.length >= MIN_WORT && out.indexOf(w) < 0) out.push(w); }
    (String(thema || "").match(WORT) || []).forEach(function (roh) {
      var teile = roh.match(TEIL) || [];
      [klein(roh)].concat(teile.length > 1 ? teile.map(klein) : []).forEach(function (w) {
        if (w.length < MIN_WORT) return;
        dazu(w);
        for (var i = MIN_WORT; i <= w.length - MIN_WORT; i++) {
          var vorn = w.slice(0, i), hinten = w.slice(i);
          if (schatz[vorn]) dazu(vorn);
          if (schatz[hinten]) dazu(hinten);
          if (vorn.slice(-1) === "s" && schatz[vorn.slice(0, -1)]) dazu(vorn.slice(0, -1));
        }
      });
    });
    return out;
  }
  function suche(index, thema, jahrgang, schulart) {
    var a = schulartAnnahme(schulart, jahrgang), s = a[0], jg = stufe(jahrgang);
    var erg = { schulart: s, angenommen: a[1], treffer: [] };
    if (!s || !jg) return erg;
    var tw = [];
    themenwoerter(thema, wortschatz(index)).forEach(function (w) { var st = stamm(w); if (tw.indexOf(st) < 0) tw.push(st); });
    if (!tw.length) return erg;
    var menge = function (liste) { var o = {}; liste.forEach(function (w) { o[stamm(w)] = 1; }); return o; };
    var treffer = [];
    index.schularten[s].faecher.forEach(function (f) {
      if (f.jahrgangsstufen.indexOf(jg) < 0) return;
      f.lernbereiche.forEach(function (lb) {
        var titel = menge(woerter(lb.titel)), teil = menge([].concat.apply([], lb.teilbereiche.map(woerter))),
            stich = menge(lb.stichwoerter), p = 0;
        tw.forEach(function (w) { p += 3 * (titel[w] ? 1 : 0) + 2 * (teil[w] ? 1 : 0) + (stich[w] ? 1 : 0); });
        if (p > 0) treffer.push({ schulart: s, fach: f.fach, zug: f.zug, variante: f.variante, datei: f.datei,
          pfad: lb.pfad, kuerzel: lb.kuerzel, titel: lb.titel, jahrgangsstufe: jg, punkte: p });
      });
    });
    treffer.sort(function (x, y) { return y.punkte - x.punkte; });     // stabil wie sorted() in Python
    erg.treffer = treffer.slice(0, 3);
    return erg;
  }
  km.lehrplan = { klein: klein, stamm: stamm, stufe: stufe, suche: suche, themenwoerter: themenwoerter };

  // ---------------------------------------------------------------- Oberfläche
  if (!document.getElementById("schritt-5") || !km.seite) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, el = S.el;
  var ZUG = { R: "Regelklasse", M: "Mittlere-Reife-Klasse" };
  var VARIANTE = { einstuendig: "einstündig", zweistuendig: "zweistündig", basis_sport: "Basissport",
    diff_sport: "Differenzierter Sport" };
  var ZU_VIELE = "Das sind zu viele Ziele für einen Auftrag; hake weniger an.";
  var indexVersprechen = null, dateien = {};
  function ladeIndex() {
    if (!indexVersprechen) indexVersprechen = fetch("lehrplan/index.json").then(function (r) {
      if (!r.ok) throw new Error("lehrplan/index.json: " + r.status); return r.json(); })
      .catch(function (e) { indexVersprechen = null; throw e; });
    return indexVersprechen;
  }
  function ladeDatei(datei) {
    if (!dateien[datei]) dateien[datei] = fetch("lehrplan/" + datei).then(function (r) {
      if (!r.ok) throw new Error("lehrplan/" + datei + ": " + r.status); return r.json(); })
      .catch(function (e) { delete dateien[datei]; throw e; });
    return dateien[datei];
  }

  function bezug() { return (S.angaben.lehrplanbezug || "ja") !== "nein"; }
  function jahrgangText() { var e = (Z.mappe && Z.mappe.einheit) || {}; return e.jahrgang || S.angaben.jahrgang || ""; }
  function zeichenName(eintrag, mitStufe) {
    var t = [];
    if (mitStufe) t.push("Jahrgangsstufe " + eintrag.jahrgangsstufen.join(", "));
    if (eintrag.zug) t.push(ZUG[eintrag.zug]);
    if (eintrag.variante) t.push(VARIANTE[eintrag.variante] || eintrag.variante);
    return t.join(" · ") || eintrag.fach;
  }

  // Bausteine je Ort: Haken, Zeile, Knopf, Vermerk, Feld des Pickers, Vorschlag (nur „Mach du“), Quelle
  var ORTE = ["m", "a"], P = null;        // P: offener Picker {ort, schulart, fach, datei, daten, wahl, auf}
  ORTE.forEach(function (o) {
    var box = $(o + "-lehrplan");
    box.appendChild(el("div", { cls: "lp-kopf" }, [
      el("label", { cls: "schalter lp-haken" }, [el("input", { id: o + "-lehrplanbezug", type: "checkbox",
        "data-lp": "bezug" }), " Lehrplanbezug"]),
      el("button", { type: "button", id: o + "-lehrplan-knopf", cls: "textlink lp-knopf", "data-lp": "oeffnen",
        text: "Aus dem Lehrplan" })]));
    box.appendChild(el("span", { cls: "feld-zeile lp-zeile", text: "Aus für Fortbildung, Projekt, anderes Thema." }));
    box.appendChild(el("p", { id: o + "-lehrplan-vermerk", cls: "lp-vermerk", hidden: "hidden" }, [el("span"),
      el("button", { type: "button", cls: "kopf-x lp-loesen", "data-lp": "loesen", "aria-label": "Lehrplan lösen",
        title: "Lehrplan lösen", text: "×" })]));
    if (o === "m") box.appendChild(el("p", { id: "m-lehrplan-vorschlag", cls: "lp-vorschlag", hidden: "hidden" }));
    box.appendChild(el("div", { id: o + "-lehrplan-feld", cls: "lp-feld", hidden: "hidden" }));
    box.addEventListener("click", klick);
    box.addEventListener("change", aenderung);
  });

  function schreiben(a) {
    Object.assign(S.angaben, a);
    S.angabenSchreiben(a);
    S.textSpaeter();
    zeichneLehrplan();
  }

  function vermerkText(lp) {
    var lbs = lp.lernbereiche || [];
    return "Lehrplan: " + lbs[0].kuerzel + " " + lbs[0].titel + (lbs.length > 1 ? " und " + (lbs.length - 1) +
        (lbs.length === 2 ? " weiterer" : " weitere") : "");
  }

  // Lehrplan aus der Fachdatei und der Wahl: Lernbereich ganz oder gewählte Teilbereiche, Ziele wörtlich, Rest Rahmen
  function lehrplanBauen(index, eintrag, daten, wahl, jg) {
    var lbs = [];
    daten.lernbereiche.forEach(function (lb, i) {
      var w = wahl[i]; if (!w || !w.an) return;
      var gewaehlt = Object.keys(w.tb).filter(function (t) { return w.tb[t].an; }).map(Number);
      var tbs = lb.teilbereiche.map(function (tb, t) { return [tb, t]; }).filter(function (x) {
        return !gewaehlt.length || gewaehlt.indexOf(x[1]) >= 0; });
      lbs.push({ kuerzel: lb.kuerzel, titel: lb.titel, teilbereiche: tbs.map(function (x) {
        var z = (w.tb[x[1]] || {}).ziele || {};
        return { titel: x[0].titel,
          ziele: x[0].kompetenzerwartungen.filter(function (_, k) { return z[k]; }),
          rahmen: x[0].kompetenzerwartungen.filter(function (_, k) { return !z[k]; }) };
      }) });
    });
    return { quelle: daten.quelle || "", stand: index.stand, schulart: P ? P.schulart : "", fach: eintrag.fach,
      zug: eintrag.zug, variante: eintrag.variante, jahrgangsstufe: jg || eintrag.jahrgangsstufen[0],
      lernbereiche: lbs };
  }

  function eintraege(index, schulart, fach, jg) {
    return index.schularten[schulart].faecher.filter(function (f) {
      return (!fach || f.fach === fach) && (!jg || f.jahrgangsstufen.indexOf(jg) >= 0); });
  }

  // ---------------------------------------------------------------- Picker zeichnen
  function zeichnePicker() {
    ORTE.forEach(function (o) { if (!P || P.ort !== o) { $(o + "-lehrplan-feld").hidden = true;
        $(o + "-lehrplan-feld").innerHTML = ""; } });
    if (!P) return;
    var feld = $(P.ort + "-lehrplan-feld");
    feld.hidden = false;
    feld.innerHTML = "";
    var jg = stufe(jahrgangText());
    var andere = S.angaben.schulart && !SCHULARTEN[klein(S.angaben.schulart)];
    if (andere && !P.schulart) {
      feld.appendChild(el("p", { cls: "lp-hinweis", text: "Für deine Schulart liegt der Lehrplan hier noch nicht vor; " +
          "schreib das Fach ins Feld." }));
      feld.appendChild(quelle());
      return;
    }
    if (!P.index) { feld.appendChild(el("p", { cls: "leise", text: "Lehrplan wird geladen …" })); return; }
    // 1 Schulart
    var reihe = el("div", { cls: "kacheln-wahl text-wahl lp-schulart", role: "radiogroup", "aria-label": "Schulart" });
    Object.keys(SCHULARTEN).forEach(function (s) {
      reihe.appendChild(el("button", { type: "button", cls: "aus-kachel", role: "radio", "data-lp": "schulart",
        "data-wert": s, "aria-checked": String(P.schulart === s) }, [el("span", { cls: "aus-name",
          text: SCHULARTEN[s] })]));
    });
    feld.appendChild(el("div", { cls: "lp-reihe" }, [el("span", { cls: "lp-nr", text: "Schulart" }), reihe]));
    if (P.schulart) {
      // 2 Fach: je Fach ein Eintrag, nach der Jahrgangsstufe aus Schritt 1 gefiltert
      var jgDa = jg && P.index.schularten[P.schulart].jahrgangsstufen.indexOf(jg) >= 0 ? jg : null;
      var namen = [];
      eintraege(P.index, P.schulart, null, jgDa).forEach(function (f) { if (namen.indexOf(f.fach) < 0) namen.push(f.fach); });
      namen.sort(function (x, y) { return x.localeCompare(y, "de"); });
      var sel = el("select", { id: "lp-fach", "data-lp": "fach", "aria-label": "Fach aus dem Lehrplan" },
          [el("option", { value: "", text: "Fach wählen" })].concat(namen.map(function (n) {
            return el("option", { value: n, text: n }); })));
      sel.value = P.fach || "";
      var r2 = el("div", { cls: "lp-reihe" }, [el("span", { cls: "lp-nr", text: "Fach" }), sel]);
      if (!jgDa) r2.appendChild(el("span", { cls: "feld-zeile", text: "Trag oben die Jahrgangsstufe ein, dann passt die " +
          "Liste." }));
      feld.appendChild(r2);
      if (P.fach) {
        // 3 Zug und Variante nur bei mehr als einem Eintrag
        var liste = eintraege(P.index, P.schulart, P.fach, jgDa);
        if (liste.length === 1) P.datei = liste[0].datei;
        else if (liste.length > 1) {
          var r3 = el("div", { cls: "kacheln-wahl text-wahl lp-zug", role: "radiogroup", "aria-label": "Zug oder Variante" });
          liste.forEach(function (f) {
            r3.appendChild(el("button", { type: "button", cls: "aus-kachel", role: "radio", "data-lp": "datei",
              "data-wert": f.datei, "aria-checked": String(P.datei === f.datei) }, [el("span", { cls: "aus-name",
                text: zeichenName(f, !jgDa) })]));
          });
          feld.appendChild(el("div", { cls: "lp-reihe" }, [el("span", { cls: "lp-nr", text: "Zug" }), r3]));
        }
        if (P.datei && P.daten) feld.appendChild(lernbereiche());
        else if (P.datei) feld.appendChild(el("p", { cls: "leise", text: "Lernbereiche werden geladen …" }));
      }
    }
    var fuss = el("div", { cls: "lp-fuss" }, [
      el("button", { type: "button", cls: "knopf haupt", "data-lp": "uebernehmen", text: "Übernehmen",
        disabled: gewaehlteZahl() ? null : "disabled" }),
      el("button", { type: "button", cls: "textlink", "data-lp": "schliessen", text: "Abbrechen" })]);
    feld.appendChild(el("p", { id: "lp-warnung", cls: "lp-warnung", role: "status", hidden: P.zuViele ? null : "hidden",
      text: ZU_VIELE }));
    feld.appendChild(fuss);
    feld.appendChild(quelle());
  }
  function quelle() {
    return el("p", { cls: "leise lp-quelle", text: "LehrplanPLUS, ISB" + (P && P.index ? " · Stand " + P.index.stand :
        "") });
  }
  function gewaehlteZahl() {
    return P && P.wahl ? Object.keys(P.wahl).filter(function (i) { return P.wahl[i].an; }).length : 0;
  }
  function lernbereiche() {
    var box = el("div", { cls: "lp-reihe lp-lbs-box" }, [el("span", { cls: "lp-nr", text: "Lernbereiche" }),
      el("p", { cls: "feld-zeile", text: "Ein Lernbereich ist für mehrere Einheiten angelegt. Hake die Erwartungen an, " +
          "die diese Einheit trägt; der Rest bleibt Rahmen." })]);
    var ul = el("ul", { cls: "lp-lbs" });
    P.daten.lernbereiche.forEach(function (lb, i) {
      var w = P.wahl[i] || { an: false, tb: {} }, auf = !!P.auf[i];
      var li = el("li", { cls: "lp-lb", "data-i": i }, [el("div", { cls: "lp-lb-kopf" }, [
        el("input", { type: "checkbox", cls: "lp-lb-haken", "data-lp": "lb", "data-i": i, id: "lp-lb-" + i,
          "aria-label": lb.kuerzel + " " + lb.titel, checked: w.an ? "checked" : null }),
        el("button", { type: "button", cls: "textlink lp-titel", "data-lp": "auf", "data-i": i,
          "aria-expanded": String(auf), text: lb.kuerzel + " " + lb.titel })])]);
      if (auf) {
        var tul = el("ul", { cls: "lp-tbs" });
        lb.teilbereiche.forEach(function (tb, t) {
          var wt = w.tb[t] || { an: false, ziele: {} };
          var eul = el("ul", { cls: "lp-erws" });
          tb.kompetenzerwartungen.forEach(function (k, z) {
            eul.appendChild(el("li", { cls: "lp-erw" }, [el("span", { cls: "lp-erw-text", text: k }),
              el("label", { cls: "lp-ziel" }, [el("input", { type: "checkbox", "data-lp": "ziel", "data-i": i,
                "data-t": t, "data-z": z, checked: (wt.ziele || {})[z] ? "checked" : null }), " Ziel dieser Einheit"])]));
          });
          tul.appendChild(el("li", { cls: "lp-tb" }, [el("label", { cls: "lp-tb-kopf" }, [el("input", { type: "checkbox",
            "data-lp": "tb", "data-i": i, "data-t": t, checked: wt.an ? "checked" : null }), " " + (tb.kuerzel ?
              tb.kuerzel + " " : "") + tb.titel]), eul]));
        });
        li.appendChild(tul);
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  // ---------------------------------------------------------------- Ereignisse
  function oeffnen(ort) {
    var s = klein(S.angaben.schulart || "");
    var lp = S.angaben.lehrplan;
    P = { ort: ort, schulart: SCHULARTEN[s] ? s : !s && lp && SCHULARTEN[lp.schulart] ? lp.schulart : null, fach: null,
      datei: null, daten: null, wahl: {}, auf: {}, index: null, zuViele: false };
    zeichnePicker();
    if (S.angaben.schulart && !SCHULARTEN[s]) return;
    ladeIndex().then(function (index) {
      if (!P || P.ort !== ort) return;
      P.index = index;
      zeichnePicker();
      var f = $(ort + "-lehrplan-feld").querySelector("button, select");
      if (f) f.focus({ preventScroll: true });
    }).catch(function (e) { S.zeigeFehler(e); });
  }
  function dateiLaden() {
    var p = P, datei = P.datei;
    zeichnePicker();
    ladeDatei(datei).then(function (d) { if (P !== p || P.datei !== datei) return; P.daten = d; zeichnePicker(); })
      .catch(function (e) { S.zeigeFehler(e); });
  }
  function klick(ev) {
    var b = ev.target.closest("[data-lp]"); if (!b || !Z.mappe || b.tagName === "INPUT" || b.tagName === "SELECT") return;
    var ort = b.closest(".lehrplan-ort").id.charAt(0), was = b.dataset.lp;
    if (was === "oeffnen") { if (P && P.ort === ort) { P = null; zeichnePicker(); } else oeffnen(ort); return; }
    if (was === "schliessen") { P = null; zeichnePicker(); $(ort + "-lehrplan-knopf").focus(); return; }
    if (was === "loesen") { schreiben({ lehrplan: null }); return; }
    if (was === "vorschlag") { vorschlagNehmen(parseInt(b.dataset.nr, 10)); return; }
    if (!P) return;
    if (was === "schulart") { if (P.schulart !== b.dataset.wert) { P.schulart = b.dataset.wert; P.fach = null;
        P.datei = null; P.daten = null; P.wahl = {}; } zeichnePicker(); }
    else if (was === "datei") { P.datei = b.dataset.wert; P.daten = null; P.wahl = {}; dateiLaden(); }
    else if (was === "auf") { var i = b.dataset.i; P.auf[i] = !P.auf[i]; zeichnePicker();
        var t = $(P.ort + "-lehrplan-feld").querySelector(".lp-titel[data-i='" + i + "']"); if (t) t.focus(); }
    else if (was === "uebernehmen") uebernehmen();
  }
  function aenderung(ev) {
    var t = ev.target, was = t.dataset.lp; if (!was || !Z.mappe) return;
    if (was === "bezug") { hakenSetzen(t.checked); return; }
    if (!P) return;
    if (was === "fach") {
      P.fach = t.value || null; P.datei = null; P.daten = null; P.wahl = {};
      var jg = stufe(jahrgangText()), liste = P.fach ? eintraege(P.index, P.schulart, P.fach,
          jg && P.index.schularten[P.schulart].jahrgangsstufen.indexOf(jg) >= 0 ? jg : null) : [];
      if (liste.length === 1) { P.datei = liste[0].datei; dateiLaden(); } else zeichnePicker();
      return;
    }
    var i = t.dataset.i, w = P.wahl[i] = P.wahl[i] || { an: false, tb: {} };
    if (was === "lb") { w.an = t.checked; if (!t.checked) w.tb = {}; }
    else {
      var tn = t.dataset.t, wt = w.tb[tn] = w.tb[tn] || { an: false, ziele: {} };
      if (was === "tb") { wt.an = t.checked; if (!t.checked) wt.ziele = {}; else w.an = true; }
      if (was === "ziel") { wt.ziele[t.dataset.z] = t.checked; if (t.checked) { wt.an = true; w.an = true; } }
    }
    hakenAbgleichen();
    zuVielePruefen();
  }
  // Kästchen nachziehen statt neu zeichnen (der Fokus bleibt am Kästchen)
  function hakenAbgleichen() {
    var feld = $(P.ort + "-lehrplan-feld");
    Array.prototype.forEach.call(feld.querySelectorAll("input[data-lp]"), function (c) {
      var w = P.wahl[c.dataset.i] || { an: false, tb: {} }, wt = w.tb[c.dataset.t] || { an: false, ziele: {} };
      c.checked = c.dataset.lp === "lb" ? w.an : c.dataset.lp === "tb" ? wt.an : !!wt.ziele[c.dataset.z];
    });
    var u = feld.querySelector("[data-lp=uebernehmen]"); if (u) u.disabled = !gewaehlteZahl();
  }
  function zuVielePruefen() {
    if (!Z.geladen || !P || !P.daten) return;
    var p = P, lp = aktuellerLehrplan();
    km.prompt("lehrplan", [{ lehrplanbezug: "ja", lehrplan: lp }, (Z.mappe.einheit || {}).minuten]).then(function (r) {
      if (P !== p) return;
      P.zuViele = !!r.gekuerzt && !r.ohne_ziele;
      var w = $("lp-warnung"); if (w) w.hidden = !P.zuViele;
    }).catch(function () {});
  }
  function aktuellerLehrplan() {
    var eintrag = P.index.schularten[P.schulart].faecher.filter(function (f) { return f.datei === P.datei; })[0];
    var jg = stufe(jahrgangText());
    return lehrplanBauen(P.index, eintrag, P.daten, P.wahl, eintrag.jahrgangsstufen.indexOf(jg) >= 0 ? jg : null);
  }
  function uebernehmen() {
    if (!P || !P.daten || !gewaehlteZahl()) return;
    var lp = aktuellerLehrplan(), ort = P.ort;
    P = null;
    zeichnePicker();
    schreiben({ fach: lp.fach, schulart: SCHULARTEN[lp.schulart], lehrplan: lp });
    S.felderFuellen();
    $(ort + "-lehrplan-knopf").focus({ preventScroll: true });
  }
  function hakenSetzen(an) {
    if (!an) { P = null; zeichnePicker(); }
    var a = { lehrplanbezug: an ? "ja" : "nein" };
    if (!an) { a.lehrplan = null; S.angaben.lehrplan = null; }
    schreiben(a);
    S.zeichneSchritte();
  }

  // ---------------------------------------------------------------- Vorschlag in „Mach du“
  var vorschlag = { schluessel: "", treffer: [], erg: null };
  function vorschlagSuchen() {
    var e = (Z.mappe && Z.mappe.einheit) || {};
    var aus = !Z.mappe || S.zweig() !== "mach" || !bezug() || S.angaben.lehrplan || !e.thema || !stufe(jahrgangText());
    var schluessel = aus ? "" : [e.thema, jahrgangText(), S.angaben.schulart || ""].join("|");
    if (schluessel === vorschlag.schluessel) return;
    vorschlag.schluessel = schluessel; vorschlag.erg = null;
    zeichneVorschlag();
    if (!schluessel) return;
    ladeIndex().then(function (index) {
      if (vorschlag.schluessel !== schluessel) return;
      vorschlag.index = index;
      vorschlag.erg = suche(index, e.thema, jahrgangText(), S.angaben.schulart || "");
      zeichneVorschlag();
    }).catch(function () { /* ohne Daten kein Vorschlag */ });
  }
  function zeichneVorschlag() {
    var p = $("m-lehrplan-vorschlag"), r = vorschlag.erg;
    p.innerHTML = "";
    p.hidden = !vorschlag.schluessel || !r || !r.treffer.length;
    if (p.hidden) return;
    p.appendChild(el("span", { cls: "lp-passt", text: "Passt dazu" + (r.angenommen ? " (" + SCHULARTEN[r.schulart] +
        " angenommen)" : "") + ":" }));
    r.treffer.forEach(function (t, i) {
      p.appendChild(el("button", { type: "button", cls: "knopf lp-treffer", "data-lp": "vorschlag", "data-nr": i,
        text: t.fach + " " + t.jahrgangsstufe + (t.zug ? " " + ZUG[t.zug] : "") + (t.variante ? " " +
            (VARIANTE[t.variante] || t.variante) : "") + ", " + t.kuerzel + " " + t.titel }));
    });
  }
  function vorschlagNehmen(nr) {
    var t = vorschlag.erg && vorschlag.erg.treffer[nr], index = vorschlag.index; if (!t) return;
    var eintrag = index.schularten[t.schulart].faecher.filter(function (f) { return f.datei === t.datei; })[0];
    ladeDatei(t.datei).then(function (d) {
      var wahl = {}; wahl[t.pfad] = { an: true, tb: {} };
      var alt = P; P = { schulart: t.schulart };
      var lp = lehrplanBauen(index, eintrag, d, wahl, t.jahrgangsstufe);
      P = alt;
      schreiben({ fach: lp.fach, schulart: SCHULARTEN[t.schulart], lehrplan: lp });
      S.felderFuellen();
    }).catch(function (e) { S.zeigeFehler(e); });
  }

  // ---------------------------------------------------------------- Zustand zeichnen (aus zeichne())
  function zeichneLehrplan() {
    if (!Z.mappe) { P = null; zeichnePicker(); return; }
    var an = bezug(), lp = an ? S.angaben.lehrplan : null;
    ORTE.forEach(function (o) {
      $(o + "-lehrplanbezug").checked = an;
      $(o + "-lehrplan-knopf").hidden = !an;
      var v = $(o + "-lehrplan-vermerk");
      v.hidden = !lp || !(lp.lernbereiche || []).length;
      if (!v.hidden) v.firstChild.textContent = vermerkText(lp);
    });
    if (!an && P) { P = null; zeichnePicker(); }
    // ohne Haken heißt das Feld in Schritt 1 „Zielgruppe (optional)“ (dasselbe Feld, längerer Text erlaubt)
    [["f-jahrgang", "f-jahrgang-t"], ["a-jahrgang", "a-jahrgang-t"]].forEach(function (x) {
      $(x[1]).textContent = an ? "Jahrgangsstufe" : "Zielgruppe (optional)";
      $(x[0]).placeholder = an ? ($(x[0]).dataset.platz || $(x[0]).placeholder) : "z. B. Kollegium, Eltern, Jahrgangsstufe 7";
      $(x[0]).maxLength = an ? 12 : 40;
      $(x[0]).inputMode = an ? "numeric" : "text";
    });
    vorschlagSuchen();
  }
  ["f-jahrgang", "a-jahrgang"].forEach(function (id) { $(id).dataset.platz = $(id).placeholder; });
  Object.assign(S, { zeichneLehrplan: zeichneLehrplan });
})();
