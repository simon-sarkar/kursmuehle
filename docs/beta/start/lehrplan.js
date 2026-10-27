/* Kursmühle – LehrplanPLUS (AP13.6): Haken „Lehrplanbezug“, Picker Schulart → Fach → Fassung → Lernbereiche am
 * Fach-Feld, Vorschlag aus dem Thema. AP13.12c: ein Ort in Schritt 2 unter den drei Kacheln, in jedem Weg derselbe,
 * zugeklappt unter „Lehrplanbezug (optional)“. Die Daten liegen unter lehrplan/ (web_bundle.py); der Kopf index.json
 * lädt erst mit dem Haken, wenn der Picker aufgeht, das Fach-Feld sucht oder der Vorschlag sucht; der Vorschlag lädt
 * dazu einen Suchteil (Schulart und Stufe, AP13.18), eine Fachdatei lädt erst bei der Fachwahl. Die Suchen
 * gibt es auch in Python (scripts/lehrplan.py, test_lehrplan.py vergleicht beide). Texte gehen wörtlich in kurs.lehrplan, nie in den Kurs.
 * AP13.5f: der Haken ist standardmäßig aus und folgt der letzten Wahl im Browser (localStorage kursmuehle-lehrplan);
 * an und ohne Lernbereich steht der Picker offen, darunter eine gelbe Zeile; Kürzel und Wortanfänge im Fach-Feld. */
"use strict";

(function () {
  // ---------------------------------------------------------------- Suche (Zwilling von scripts/lehrplan.py)
  var MIN_WORT = 5, ENDUNGEN = ["ern", "en", "er", "es", "e", "n", "s"];
  var SCHULARTEN = { grundschule: "Grundschule", mittelschule: "Mittelschule", realschule: "Realschule",
    gymnasium: "Gymnasium", foerderschule: "Förderschule" };
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
    return n === 1 || n === 2 ? "1/2" : n === 3 || n === 4 ? "3/4" : n >= 5 && n <= 13 ? String(n) : null;
  }
  function schulartAnnahme(schulart, jahrgang) {
    var s = klein(String(schulart || "")).trim();
    if (SCHULARTEN[s]) return [s, false];
    if (s) return [null, false];
    var jg = stufe(jahrgang);
    if (!jg) return [null, false];
    return [jg === "1/2" || jg === "3/4" ? "grundschule" : parseInt(jg, 10) >= 11 ? "gymnasium" : "mittelschule", true];
  }
  // Suchteil unter lehrplan/ für Schulart (gewählt oder angenommen) und Stufe aus Schritt 1, sonst null
  function teilPfad(schulart, jahrgang) {
    var s = schulartAnnahme(schulart, jahrgang)[0], jg = stufe(jahrgang);
    return s && jg ? s + "/suche-" + jg.replace("/", "-") + ".json" : null;
  }
  var schatzCache = null;
  function wortschatz(teil) {
    if (schatzCache && schatzCache.teil === teil) return schatzCache.w;
    var w = {};
    teil.faecher.forEach(function (f) {
      f.lernbereiche.forEach(function (lb) {
        woerter(lb.titel).forEach(function (x) { w[x] = 1; });
        lb.teilbereiche.forEach(function (t) { woerter(t).forEach(function (x) { w[x] = 1; }); });
        lb.stichwoerter.forEach(function (x) { w[x] = 1; });
      });
    });
    schatzCache = { teil: teil, w: w };
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
  function suche(teil, thema, jahrgang, schulart) {
    var a = schulartAnnahme(schulart, jahrgang), s = a[0], jg = stufe(jahrgang);
    var erg = { schulart: s, angenommen: a[1], treffer: [] };
    if (!s || !jg || !teil || teil.schulart !== s || teil.jahrgangsstufe !== jg) return erg;
    var tw = [];
    themenwoerter(thema, wortschatz(teil)).forEach(function (w) { var st = stamm(w); if (tw.indexOf(st) < 0) tw.push(st); });
    if (!tw.length) return erg;
    var menge = function (liste) { var o = {}; liste.forEach(function (w) { o[stamm(w)] = 1; }); return o; };
    var treffer = [];
    teil.faecher.forEach(function (f) {
      f.lernbereiche.forEach(function (lb) {
        var titel = menge(woerter(lb.titel)), teil = menge([].concat.apply([], lb.teilbereiche.map(woerter))),
            stich = menge(lb.stichwoerter), p = 0;
        tw.forEach(function (w) { p += 3 * (titel[w] ? 1 : 0) + 2 * (teil[w] ? 1 : 0) + (stich[w] ? 1 : 0); });
        if (p > 0) treffer.push({ schulart: s, fach: f.fach, zug: f.zug, variante: f.variante, zusatz: f.zusatz, datei: f.datei,
          pfad: lb.pfad, kuerzel: lb.kuerzel, titel: lb.titel, jahrgangsstufe: jg, punkte: p });
      });
    });
    treffer.sort(function (x, y) { return y.punkte - x.punkte; });     // stabil wie sorted() in Python
    erg.treffer = treffer.slice(0, 3);
    return erg;
  }
  // Fächer zur Eingabe im Fach-Feld: Kürzel aus index.aliase am Anfang, Fachname nur an Wortanfängen; Kürzel zuerst
  function fachSuche(kopf, text, schulart) {
    var q = klein(String(text || "").trim());
    if (!q) return [];
    var s = klein(String(schulart || "").trim());
    var quellen = kopf.schularten[s] ? [kopf.schularten[s]] : Object.keys(kopf.schularten).map(function (k) {
      return kopf.schularten[k]; });
    var namen = [];
    quellen.forEach(function (sa) { sa.faecher.forEach(function (f) { if (namen.indexOf(f.fach) < 0) namen.push(f.fach); }); });
    namen.sort(function (x, y) { x = klein(x); y = klein(y); return x < y ? -1 : x > y ? 1 : 0; });
    var aliase = kopf.aliase || {};
    var perAlias = namen.filter(function (n) { return (aliase[n] || []).some(function (a) {
      return klein(a).indexOf(q) === 0; }); });
    var perName = namen.filter(function (n) { return perAlias.indexOf(n) < 0 && (klein(n).match(/[a-z0-9]+/g) || [])
      .some(function (w) { return w.indexOf(q) === 0; }); });
    return perAlias.concat(perName);
  }
  km.lehrplan = { fachSuche: fachSuche, klein: klein, stamm: stamm, stufe: stufe, suche: suche, teilPfad: teilPfad,
    themenwoerter: themenwoerter, SCHULARTEN: SCHULARTEN };

  // ---------------------------------------------------------------- Oberfläche
  if (!document.getElementById("schritt-5") || !km.seite) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, el = S.el;
  // Beschriftung der Fassungszeile je Schulart (AP13.18); die Kacheln tragen eintrag.zusatz
  var FASSUNG = { mittelschule: "Zug", foerderschule: "Förderschwerpunkt" };
  var ZU_VIELE = "Das sind zu viele Ziele für einen Auftrag; hake weniger an.";
  var FEHLT = "Noch kein Lernbereich gewählt – der Text für den Chat enthält dann keine Kompetenzerwartungen";
  var NICHT_UEBERNOMMEN = "Noch nicht übernommen – klicke auf „Übernehmen“";
  var MERKEN = km.speicher("kursmuehle-lehrplan");   // letzte Wahl des Hakens: „ja“ oder „nein“ (fehlt = aus)
  function gemerkt() { try { return localStorage.getItem(MERKEN) === "ja"; } catch (e) { return false; } }
  function merken(an) { try { localStorage.setItem(MERKEN, an ? "ja" : "nein"); } catch (e) { /* nur diese Seite */ } }
  var indexVersprechen = null, dateien = {}, teile = {};
  function ladeIndex() {
    if (!indexVersprechen) indexVersprechen = fetch("lehrplan/index.json").then(function (r) {
      if (!r.ok) throw new Error("lehrplan/index.json: " + r.status); return r.json(); })
      .catch(function (e) { indexVersprechen = null; throw e; });
    return indexVersprechen;
  }
  // Suchteil für den Vorschlag (Promise je Pfad, bei Fehler verworfen wie die Fachdateien)
  function ladeTeil(pfad) {
    if (!teile[pfad]) teile[pfad] = fetch("lehrplan/" + pfad).then(function (r) {
      if (!r.ok) throw new Error("lehrplan/" + pfad + ": " + r.status); return r.json(); })
      .catch(function (e) { delete teile[pfad]; throw e; });
    return teile[pfad];
  }
  function ladeDatei(datei) {
    if (!dateien[datei]) dateien[datei] = fetch("lehrplan/" + datei).then(function (r) {
      if (!r.ok) throw new Error("lehrplan/" + datei + ": " + r.status); return r.json(); })
      .catch(function (e) { delete dateien[datei]; throw e; });
    return dateien[datei];
  }

  // lehrplanbezug aus angaben_lesen: „ja“, „nein“ oder „“ (Steckbrief ohne Zeile: von vor AP13.5f, gilt als an wie
  // bisher, ohne den offenen Picker); eine neue Einheit (Steckbrief noch leer) bekommt die letzte Wahl
  function bezug() { var b = S.angaben.lehrplanbezug;
    return b === "ja" || !!S.angaben.lehrplan || (b === "" && !!Z.steckbrief_text); }
  function ausdruecklich() { return S.angaben.lehrplanbezug === "ja"; }
  function gewaehlt() { var lp = S.angaben.lehrplan; return !!(lp && (lp.lernbereiche || []).length); }
  function offen() { return !Z.steckbrief_text && !S.angaben.lehrplanbezug && !S.angaben.lehrplan; }
  function jahrgangText() { var e = (Z.mappe && Z.mappe.einheit) || {}; return e.jahrgang || S.angaben.jahrgang || ""; }
  // c2: Text ohne Zahl im Feld Jahrgangsstufe der Einheit ist die Zielgruppe (schritte.js zielgruppeSperre)
  function zielgruppe() { var j = String(((Z.mappe && Z.mappe.einheit) || {}).jahrgang || "").trim();
    return j && !/\d/.test(j) ? j : ""; }
  function zeichenName(eintrag, mitStufe) {
    var t = [];
    if (mitStufe) t.push("Jahrgangsstufe " + (eintrag.spanne || eintrag.jahrgangsstufen.join(", ")));
    if (eintrag.zusatz) t.push(eintrag.zusatz);
    return t.join(" · ") || eintrag.fach;
  }

  // Bausteine des einen Orts (AP13.12c): im Kopf des Ausklappteils der Vermerk mit „×“ statt „Lehrplanbezug
  // (optional)“; darin Trefferzeile am Fach-Feld, Haken, Knopf, Zeile zur Zielgruppe, Vorschlag, Feld des Pickers,
  // Quelle; die gelbe Zeile steht unter dem Ausklappteil und bleibt zugeklappt sichtbar
  var P = null;                           // P: offener Picker {schulart, fach, datei, daten, wahl, auf}
  var teil = $("lehrplan-teil"), box = $("lehrplan"), aus = $("lehrplan-ausklapp");
  box.appendChild(el("div", { cls: "lp-kopf" }, [
    el("label", { cls: "schalter lp-haken" }, [el("input", { id: "lehrplanbezug", type: "checkbox",
      "data-lp": "bezug" }), " Lehrplanbezug (LehrplanPLUS Bayern)"]),
    el("button", { type: "button", id: "lehrplan-knopf", cls: "textlink lp-knopf", "data-lp": "oeffnen",
      text: "Aus dem Lehrplan" })]));
  box.appendChild(el("p", { id: "lehrplan-zg", cls: "feld-zeile lp-zg", hidden: "hidden",
    text: "Mit Zielgruppe ohne Lehrplanbezug" }));
  // Fächer zur Eingabe im Fach-Feld (Kürzel und Wortanfänge), nur mit Haken; ohne Haken die Liste des Browsers
  box.insertBefore(el("p", { id: "fach-treffer", cls: "lp-vorschlag lp-fach-treffer", hidden: "hidden" }), box.firstChild);
  var loesen = el("button", { type: "button", cls: "kopf-x lp-loesen", "aria-label": "Lehrplan lösen",
    title: "Lehrplan lösen", text: "×" });
  $("lehrplan-auf").appendChild(el("span", { id: "lehrplan-vermerk", cls: "lp-vermerk", hidden: "hidden" }, [el("span"),
    loesen]));
  // „×“ im Kopf: weder auf- oder zuklappen noch den gemerkten Ausklappzustand umschalten (S.ausklapp hört am Kopf)
  loesen.addEventListener("click", function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    if (Z.mappe) { vorschlag.auto = null; schreiben({ lehrplan: null }); }
  });
  box.appendChild(el("p", { id: "lehrplan-vorschlag", cls: "lp-vorschlag", hidden: "hidden" }));
  box.appendChild(el("div", { id: "lehrplan-feld", cls: "lp-feld", hidden: "hidden" }));
  teil.appendChild(el("p", { id: "lehrplan-fehlt", cls: "lp-warnung", role: "status", hidden: "hidden", text: FEHLT }));
  teil.addEventListener("click", klick);
  teil.addEventListener("change", aenderung);
  $("fach").addEventListener("input", fachTreffer);
  // Ausklappteil gemerkt über data-merken (S.ausklapp, AP13.12 a); zugeklappt mit Haken im offenen Picker gelten die
  // Haken (c3)
  aus.addEventListener("toggle", function () { if (!aus.open) zuMitWahl(); });

  function schreiben(a) {
    Object.assign(S.angaben, a);
    S.angabenSchreiben(a);
    S.textSpaeter();
    zeichneLehrplan();
  }

  // Trefferzeile unter dem Fach-Feld: Kürzel vor Namen, höchstens acht; steht das Fach schon genau da, keine Zeile
  var fachLauf = 0;
  function fachTreffer() {
    var p = $("fach-treffer"), text = $("fach").value, nr = ++fachLauf;
    if (!bezug() || !text.trim()) { p.hidden = true; return; }
    ladeIndex().then(function (index) {
      if (nr !== fachLauf) return;
      var s = P && P.schulart ? SCHULARTEN[P.schulart] : S.angaben.schulart || "";
      var liste = fachSuche(index, text, s).slice(0, 8);
      p.innerHTML = "";
      p.hidden = !liste.length || liste.indexOf(text.trim()) >= 0;
      liste.forEach(function (n) {
        p.appendChild(el("button", { type: "button", cls: "knopf lp-treffer", "data-lp": "fachwahl", "data-wert": n,
          text: n }));
      });
    }).catch(function () { p.hidden = true; });
  }
  function fachWaehlen(name) {
    var f = $("fach");
    f.value = name;
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
    $("fach-treffer").hidden = true;
    if (P && P.index && P.schulart && namenImPicker().indexOf(name) >= 0) fachSetzen(name);
    f.focus({ preventScroll: true });
  }
  function vermerkText(lp) {
    var lbs = lp.lernbereiche || [];
    return "Lehrplan" + (autoGilt() ? " (Vorschlag)" : "") + ": " + lbs[0].kuerzel + " " + lbs[0].titel + (lbs.length > 1 ? " und " + (lbs.length - 1) +
        (lbs.length === 2 ? " weiterer" : " weitere") : "");
  }

  // Lehrplan aus der Fachdatei und der Wahl: Lernbereich ganz oder gewählte Teilbereiche, Ziele wörtlich, Rest Rahmen;
  // Jahrgangsstufe aus Schritt 1, sonst die Spanne des Lehrplans („5-9“), sonst seine erste Stufe
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
      zug: eintrag.zug, variante: eintrag.variante, zusatz: eintrag.zusatz || "",
      jahrgangsstufe: jg || eintrag.spanne || eintrag.jahrgangsstufen[0], lernbereiche: lbs };
  }

  function eintraege(index, schulart, fach, jg) {
    return index.schularten[schulart].faecher.filter(function (f) {
      return (!fach || f.fach === fach) && (!jg || f.jahrgangsstufen.indexOf(jg) >= 0); });
  }
  function jgImPicker() {
    var jg = stufe(jahrgangText());
    return jg && P.index.schularten[P.schulart].jahrgangsstufen.indexOf(jg) >= 0 ? jg : null;
  }
  function namenImPicker() {
    var namen = [];
    eintraege(P.index, P.schulart, null, jgImPicker()).forEach(function (f) { if (namen.indexOf(f.fach) < 0)
      namen.push(f.fach); });
    return namen.sort(function (x, y) { return x.localeCompare(y, "de"); });
  }
  // Fach-, Fassungs- und Schulartwechsel bauen die Wahl neu auf (AP13.22: .lp-gewaehlt sagt es)
  function wahlLeeren() {
    if (gewaehlteZahl()) P.geleert = true;
    P.wahl = {}; P.auf = {};
  }
  function fachSetzen(name) {
    P.fach = name || null; P.datei = null; P.daten = null; wahlLeeren();
    var liste = P.fach ? eintraege(P.index, P.schulart, P.fach, jgImPicker()) : [];
    if (liste.length === 1) { P.datei = liste[0].datei; dateiLaden(); } else zeichnePicker();
  }

  // ---------------------------------------------------------------- Picker zeichnen
  function zeichnePicker() {
    var feld = $("lehrplan-feld");
    if (!P) { feld.hidden = true; feld.innerHTML = ""; return; }
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
    var gz = gewaehltZeile(); if (gz) feld.appendChild(gz);
    // 1 Schulart
    var reihe = el("div", { cls: "kacheln-wahl text-wahl lp-schulart", role: "radiogroup", "aria-label": "Schulart" });
    Object.keys(SCHULARTEN).forEach(function (s) {
      reihe.appendChild(el("button", { type: "button", cls: "aus-kachel", role: "radio", "data-lp": "schulart",
        "data-wert": s, "aria-checked": String(P.schulart === s) }, [el("span", { cls: "aus-name",
          text: SCHULARTEN[s] })]));
    });
    feld.appendChild(el("div", { cls: "lp-reihe" }, [el("span", { cls: "lp-nr", text: "Schulart" }), reihe]));
    // AP13.18: Lehrpläne nur für die Förderschwerpunkte Lernen und geistige Entwicklung
    if (P.schulart === "foerderschule") feld.appendChild(el("p", { cls: "feld-zeile lp-fsp", text: "Andere " +
        "Förderschwerpunkte: Lehrplan der Grund- oder Mittelschule wählen." }));
    if (P.schulart) {
      // 2 Fach: je Fach ein Eintrag, nach der Jahrgangsstufe aus Schritt 1 gefiltert
      var jgDa = jgImPicker(), namen = namenImPicker();
      var sel = el("select", { id: "lp-fach", "data-lp": "fach", "aria-label": "Fach aus dem Lehrplan" },
          [el("option", { value: "", text: "Fach wählen" })].concat(namen.map(function (n) {
            return el("option", { value: n, text: n }); })));
      if (P.fach && namen.indexOf(P.fach) < 0) sel.appendChild(el("option", { value: P.fach, text: P.fach }));
      sel.value = P.fach || "";
      var r2 = el("div", { cls: "lp-reihe" }, [el("span", { cls: "lp-nr", text: "Fach" }), sel]);
      if (!jgDa) r2.appendChild(el("span", { cls: "feld-zeile", text: "Trag oben die Jahrgangsstufe ein, dann passt die " +
          "Liste." }));
      feld.appendChild(r2);
      if (P.fach) {
        // 3 Fassung (Zug, Förderschwerpunkt) nur bei mehr als einem Eintrag
        var liste = eintraege(P.index, P.schulart, P.fach, jgDa), wort = FASSUNG[P.schulart] || "Fassung";
        if (liste.length === 1) P.datei = liste[0].datei;
        else if (liste.length > 1) {
          var r3 = el("div", { cls: "kacheln-wahl text-wahl lp-zug", role: "radiogroup", "aria-label": wort });
          liste.forEach(function (f) {
            r3.appendChild(el("button", { type: "button", cls: "aus-kachel", role: "radio", "data-lp": "datei",
              "data-wert": f.datei, "aria-checked": String(P.datei === f.datei) }, [el("span", { cls: "aus-name",
                text: zeichenName(f, !jgDa) })]));
          });
          feld.appendChild(el("div", { cls: "lp-reihe" }, [el("span", { cls: "lp-nr", text: wort }), r3]));
        }
        if (P.datei && P.daten) feld.appendChild(lernbereiche());
        else if (P.datei) feld.appendChild(el("p", { cls: "leise", text: "Lernbereiche werden geladen …" }));
      }
    }
    var fuss = el("div", { cls: "lp-fuss" }, [
      el("button", { type: "button", cls: "knopf haupt", "data-lp": "uebernehmen", text: "Übernehmen",
        disabled: gewaehlteZahl() ? null : "disabled" }),
      gewaehlt() ? el("button", { type: "button", cls: "textlink", "data-lp": "schliessen", text: "Abbrechen" }) : null]);
    feld.appendChild(el("p", { id: "lp-warnung", cls: "lp-warnung", role: "status", hidden: P.zuViele ? null : "hidden",
      text: ZU_VIELE }));
    feld.appendChild(fuss);
    feld.appendChild(quelle());
  }
  function quelle() {
    return el("p", { cls: "leise lp-quelle", text: "LehrplanPLUS, ISB" + (P && P.index ? " · Stand " + P.index.stand :
        "") });
  }
  // AP13.22: Zeile über der Schulart, je gewähltem Lernbereich ein Chip mit „×“; Stand von P.wahl, nicht des Gespeicherten
  function gewaehltZeile() {
    var n = gewaehlteZahl();
    if (!P || !P.daten && n || !n && !P.geleert) return null;
    var geaendert = n ? !gleich(aktuellerLehrplan(), S.angaben.lehrplan) : false;
    var vorschl = n && !geaendert && autoGilt();
    var z = el("div", { cls: "lp-gewaehlt" }, [el("span", { cls: "lp-nr", text: vorschl ? "Vorschlag aus dem Thema" :
        "Gewählt" })]);
    if (n) P.daten.lernbereiche.forEach(function (lb, i) {
      var w = P.wahl[i]; if (!w || !w.an) return;
      var ziele = 0;
      Object.keys(w.tb).forEach(function (t) { Object.keys(w.tb[t].ziele || {}).forEach(function (k) {
        if (w.tb[t].ziele[k]) ziele++; }); });
      z.appendChild(el("span", { cls: "lp-chip" }, [
        el("button", { type: "button", cls: "textlink lp-chip-text", "data-lp": "chipauf", "data-i": i,
          text: lb.kuerzel + " " + lb.titel + (ziele ? " · " + ziele + (ziele === 1 ? " Ziel" : " Ziele") : "") }),
        el("button", { type: "button", cls: "kopf-x lp-chip-x", "data-lp": "chipweg", "data-i": i,
          "aria-label": lb.kuerzel + " entfernen", text: "×" })]));
    });
    if (!n) z.appendChild(el("span", { cls: "leise lp-gewaehlt-satz", text: "Beim Wechsel von Fach oder Fassung wird " +
        "die Wahl neu aufgebaut." }));
    else if (geaendert) z.appendChild(el("span", { cls: "leise lp-gewaehlt-satz", text: "Nichts ist gespeichert, bis " +
        "du auf „Übernehmen“ klickst." }));
    return z;
  }
  function gewaehltAbgleichen() {
    var feld = $("lehrplan-feld"), alt = feld.querySelector(".lp-gewaehlt"), neu = gewaehltZeile();
    if (alt && neu) feld.replaceChild(neu, alt);
    else if (alt) feld.removeChild(alt);
    else if (neu) feld.insertBefore(neu, feld.firstChild);
  }
  function gleich(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(function (k) { return gleich(a[k], b[k]); });
  }
  function gewaehlteZahl() {
    return P && P.wahl ? Object.keys(P.wahl).filter(function (i) { return P.wahl[i].an; }).length : 0;
  }
  function lernbereiche() {
    var box = el("div", { cls: "lp-reihe lp-lbs-box" }, [el("span", { cls: "lp-nr", text: "Lernbereiche" }),
      el("p", { cls: "feld-zeile", text: "Ein Lernbereich ist für mehrere Einheiten angelegt. Klicke auf einen " +
          "Lernbereich, um seine Teilbereiche und Kompetenzerwartungen zu sehen. Hake an, was diese Einheit trägt." })]);
    var ul = el("ul", { cls: "lp-lbs" });
    P.daten.lernbereiche.forEach(function (lb, i) {
      var w = P.wahl[i] || { an: false, tb: {} }, auf = !!P.auf[i];
      var li = el("li", { cls: "lp-lb", "data-i": i }, [el("div", { cls: "lp-lb-kopf" }, [
        el("input", { type: "checkbox", cls: "lp-lb-haken", "data-lp": "lb", "data-i": i, id: "lp-lb-" + i,
          "aria-label": lb.kuerzel + " " + lb.titel, checked: w.an ? "checked" : null }),
        // AP13.12c: der ganze Titel ist der Knopf, davor ▸/▾ (CSS nach aria-expanded), dahinter die Zahl der Teilbereiche
        el("button", { type: "button", cls: "textlink lp-titel", "data-lp": "auf", "data-i": i,
          "aria-expanded": String(auf) }, [el("span", { cls: "lp-titel-text", text: lb.kuerzel + " " + lb.titel }),
          el("span", { cls: "lp-tb-zahl", text: lb.teilbereiche.length + (lb.teilbereiche.length === 1 ?
              " Teilbereich" : " Teilbereiche") })])])]);
      if (auf) {
        var tul = el("ul", { cls: "lp-tbs" });
        var eins = lb.teilbereiche.length === 1 && lb.teilbereiche[0].titel === lb.titel;
        if (eins) tul.className += " lp-tbs-eins";
        lb.teilbereiche.forEach(function (tb, t) {
          var wt = w.tb[t] || { an: false, ziele: {} };
          var eul = el("ul", { cls: "lp-erws" });
          tb.kompetenzerwartungen.forEach(function (k, z) {
            eul.appendChild(el("li", { cls: "lp-erw" }, [el("span", { cls: "lp-erw-text", text: k }),
              el("label", { cls: "lp-ziel" }, [el("input", { type: "checkbox", "data-lp": "ziel", "data-i": i,
                "data-t": t, "data-z": z, checked: (wt.ziele || {})[z] ? "checked" : null }), " Ziel dieser Einheit"])]));
          });
          if (eins) { tul.appendChild(el("li", { cls: "lp-tb" }, [eul])); return; }
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
  function oeffnen(auto) {
    var s = klein(S.angaben.schulart || "");
    var lp = S.angaben.lehrplan;
    P = { schulart: SCHULARTEN[s] ? s : !s && lp && SCHULARTEN[lp.schulart] ? lp.schulart : null, fach: null,
      datei: null, daten: null, wahl: {}, auf: {}, index: null, zuViele: false, auto: !!auto, geleert: false };
    var p = P;
    zeichnePicker();
    if (S.angaben.schulart && !SCHULARTEN[s]) return;
    ladeIndex().then(function (index) {
      if (P !== p) return;
      P.index = index;
      var e = P.schulart && lp && gewaehlt() && lp.schulart === P.schulart ? dateiZuLehrplan(index, lp) : null;
      if (!e) { zeichnePicker(); fokusSetzen(); return; }
      P.fach = e.fach; P.datei = e.datei;
      zeichnePicker();
      return ladeDatei(e.datei).then(function (d) {
        if (P !== p) return;
        P.daten = d;
        wahlAusLehrplan(lp);
        zeichnePicker();
        fokusSetzen();
      });
    }).catch(function (e) { S.zeigeFehler(e); });
  }
  // Fokus: Titel des ersten gewählten Lernbereichs (sichtbar scrollen), sonst das erste Element
  function fokusSetzen() {
    var feld = $("lehrplan-feld"), t = feld.querySelector(".lp-titel[aria-expanded=true]");
    if (t) { t.focus(); return; }
    var f = feld.querySelector("button, select");
    if (f) f.focus({ preventScroll: true });
  }
  // AP13.22: Fachdatei zum gespeicherten Lehrplan (Fach, Zug, Variante, Zusatz; Stufe bevorzugt), sonst null
  function dateiZuLehrplan(index, lp) {
    var norm = function (x) { return x || ""; };
    var passend = index.schularten[lp.schulart].faecher.filter(function (f) {
      return f.fach === lp.fach && norm(f.zug) === norm(lp.zug) && norm(f.variante) === norm(lp.variante) &&
        norm(f.zusatz) === norm(lp.zusatz); });
    var mitStufe = passend.filter(function (f) {
      return f.jahrgangsstufen.indexOf(lp.jahrgangsstufe) >= 0 || f.spanne === lp.jahrgangsstufe; });
    return mitStufe[0] || passend[0] || null;
  }
  // Rückrechnung von lehrplanBauen: Lernbereich über Kürzel und Titel, Teilbereich über Titel, Ziel über den Wortlaut
  function wahlAusLehrplan(lp) {
    P.wahl = {}; P.auf = {};
    P.daten.lernbereiche.forEach(function (lb, i) {
      var l = (lp.lernbereiche || []).filter(function (x) { return x.kuerzel === lb.kuerzel && x.titel === lb.titel; })[0];
      if (!l) return;
      var w = P.wahl[i] = { an: true, tb: {} }, alle = true;
      lb.teilbereiche.forEach(function (tb, t) {
        var x = (l.teilbereiche || []).filter(function (y) { return y.titel === tb.titel; })[0];
        if (!x) { alle = false; return; }
        var ziele = {}, n = 0;
        tb.kompetenzerwartungen.forEach(function (k, z) { if ((x.ziele || []).indexOf(k) >= 0) { ziele[z] = true; n++; } });
        w.tb[t] = { an: n > 0, ziele: ziele };
      });
      if (!alle) Object.keys(w.tb).forEach(function (t) { w.tb[t].an = true; });
      P.auf[i] = true;
    });
  }
  function dateiLaden() {
    var p = P, datei = P.datei;
    zeichnePicker();
    ladeDatei(datei).then(function (d) {
      if (P !== p || P.datei !== datei) return;
      P.daten = d;
      zeichnePicker();
    })
      .catch(function (e) { S.zeigeFehler(e); });
  }
  function klick(ev) {
    var b = ev.target.closest("[data-lp]"); if (!b || !Z.mappe || b.tagName === "INPUT" || b.tagName === "SELECT") return;
    var was = b.dataset.lp;
    if (was === "oeffnen") { if (P) { if (!zuMitWahl()) { P = null; zeichnePicker(); } } else oeffnen(); return; }
    if (was === "schliessen") { P = null; zeichnePicker(); $("lehrplan-knopf").focus(); return; }
    if (was === "vorschlag") { vorschlagNehmen(parseInt(b.dataset.nr, 10)); return; }
    if (was === "fachwahl") { fachWaehlen(b.dataset.wert); return; }
    if (!P) return;
    if (was === "schulart") { if (P.schulart !== b.dataset.wert) { P.schulart = b.dataset.wert; P.fach = null;
        P.datei = null; P.daten = null; wahlLeeren(); } zeichnePicker(); }
    else if (was === "datei") { P.datei = b.dataset.wert; P.daten = null; wahlLeeren(); dateiLaden(); }
    else if (was === "auf") { var i = b.dataset.i; P.auf[i] = !P.auf[i]; zeichnePicker();
        var t = $("lehrplan-feld").querySelector(".lp-titel[data-i='" + i + "']"); if (t) t.focus(); }
    else if (was === "chipauf") { var j = b.dataset.i; P.auf[j] = true; zeichnePicker();
        var tj = $("lehrplan-feld").querySelector(".lp-titel[data-i='" + j + "']");
        if (tj) { tj.scrollIntoView({ block: "nearest" }); tj.focus(); } }
    else if (was === "chipweg") { var k = b.dataset.i, wk = P.wahl[k]; if (wk) { wk.an = false; wk.tb = {}; }
        hakenAbgleichen(); zuVielePruefen();
        var nach = $("lehrplan-feld").querySelector(".lp-chip-text") || $("lehrplan-feld").querySelector("button");
        if (nach) nach.focus({ preventScroll: true }); }
    else if (was === "uebernehmen") uebernehmen();
  }
  function aenderung(ev) {
    var t = ev.target, was = t.dataset.lp; if (!was || !Z.mappe) return;
    if (was === "bezug") { hakenSetzen(t.checked); return; }
    if (!P) return;
    if (was === "fach") { fachSetzen(t.value); return; }
    var i = t.dataset.i, w = P.wahl[i] = P.wahl[i] || { an: false, tb: {} };
    if (was === "lb") {
      w.an = t.checked; if (!t.checked) w.tb = {};
      if (t.checked && !P.auf[i]) {                       // AP13.12c: angehakt klappt er auf, der Fokus bleibt am Haken
        P.auf[i] = true; zeichnePicker();
        var h = $("lp-lb-" + i); if (h) h.focus({ preventScroll: true });
      }
    }
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
    var feld = $("lehrplan-feld");
    Array.prototype.forEach.call(feld.querySelectorAll("input[data-lp]"), function (c) {
      var w = P.wahl[c.dataset.i] || { an: false, tb: {} }, wt = w.tb[c.dataset.t] || { an: false, ziele: {} };
      c.checked = c.dataset.lp === "lb" ? w.an : c.dataset.lp === "tb" ? wt.an : !!wt.ziele[c.dataset.z];
    });
    var u = feld.querySelector("[data-lp=uebernehmen]"); if (u) u.disabled = !gewaehlteZahl();
    gewaehltAbgleichen();
    zeichneFehlt();
  }
  // c3: dieselbe gelbe Zeile sagt bei offenem Picker mit Haken „Noch nicht übernommen“, sonst ohne Lernbereich FEHLT
  function zeichneFehlt() {
    var fehlt = ausdruecklich() && !gewaehlt(), wahl = !!P && gewaehlteZahl() > 0, p = $("lehrplan-fehlt");
    p.textContent = wahl ? NICHT_UEBERNOMMEN : FEHLT;
    p.hidden = !wahl && !fehlt;
  }
  // c3: Picker mit Haken, aber ohne „Übernehmen“ geschlossen (Knopf, Haken aus, Schritt verlassen): die Haken gelten
  function zuMitWahl() {
    if (!P || !P.daten || !gewaehlteZahl()) return false;
    uebernehmen(true);
    return true;
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
  function uebernehmen(still) {
    if (!P || !P.daten || !gewaehlteZahl()) return;
    var lp = aktuellerLehrplan();
    if (!still || !gleich(lp, S.angaben.lehrplan)) vorschlag.auto = null;   // eine Wahl der Lehrkraft, kein Vorschlag mehr
    P = null;
    zeichnePicker();
    schreiben({ fach: lp.fach, schulart: SCHULARTEN[lp.schulart], lehrplan: lp });
    S.felderFuellen();
    if (!still) $("lehrplan-knopf").focus({ preventScroll: true });
  }
  function hakenSetzen(an) {
    merken(an);
    if (!an) zuMitWahl();
    P = null; zeichnePicker();
    var a = { lehrplanbezug: an ? "ja" : "nein" };
    if (!an) { a.lehrplan = null; S.angaben.lehrplan = null; vorschlag.auto = null; }
    schreiben(a);                  // an und ohne Wahl öffnet zeichneLehrplan den Picker sofort
    S.zeichneSchritte();
  }

  // ---------------------------------------------------------------- Vorschlag aus dem Thema (AP13.12c: in jedem Weg)
  // auto: der Lehrplan ist ein Vorschlag aus dem Thema (nur im Speicher, nicht im Steckbrief)
  var vorschlag = { schluessel: "", treffer: [], erg: null, genommen: "", auto: null };
  function lpZeichen(lp) {
    return lp ? JSON.stringify([lp.fach, lp.zug, lp.variante, lp.zusatz || "", (lp.lernbereiche || []).map(function (l) {
      return l.kuerzel + " " + l.titel; })]) : "";
  }
  function autoGilt() {
    return !!vorschlag.auto && vorschlag.auto.mappe === Z.mappe && lpZeichen(vorschlag.auto.lp) === lpZeichen(S.angaben.lehrplan);
  }
  function vorschlagSuchen() {
    var e = (Z.mappe && Z.mappe.einheit) || {};
    var aus = !Z.mappe || !S.zweig() || !bezug() || S.angaben.lehrplan && !autoGilt() || !e.thema || !stufe(jahrgangText());
    var schluessel = aus ? "" : [e.thema, jahrgangText(), S.angaben.schulart || ""].join("|");
    if (schluessel === vorschlag.schluessel) { zeichneVorschlag(); return; }
    vorschlag.schluessel = schluessel; vorschlag.erg = null;
    zeichneVorschlag();
    if (!schluessel) return;
    var kopf = null, pfad = teilPfad(S.angaben.schulart || "", jahrgangText());
    ladeIndex().then(function (k) {
      kopf = k;
      var a = schulartAnnahme(S.angaben.schulart || "", jahrgangText());
      // AP13.18: der Suchteil nur, wenn der Kopf die Stufe für diese Schulart kennt (sonst kein Vorschlag)
      return pfad && k.schularten[a[0]] && k.schularten[a[0]].jahrgangsstufen.indexOf(stufe(jahrgangText())) >= 0 ?
        ladeTeil(pfad) : null;
    }).then(function (teil) {
      if (vorschlag.schluessel !== schluessel) return;
      vorschlag.index = kopf;
      vorschlag.erg = suche(teil, e.thema, jahrgangText(), S.angaben.schulart || "");
      zeichneVorschlag();
      // AP13.5f: mit Haken und ohne Wahl ist der beste Treffer vorbelegt (einmal je Thema; nach „×“ bleiben die Knöpfe)
      var einmal = e.thema + "|" + jahrgangText();        // ohne Schulart: die setzt der Vorschlag selbst
      // Vorbelegung erst, wenn die Angaben dieser Mappe aus dem Steckbrief gelesen sind (Neuladen, Einheit öffnen: der
      // Index kommt oft vor Python an; eine gespeicherte Wahl geht vor). Sonst beim nächsten Zeichnen neu versuchen
      if (S.angabenFuer !== Z.mappe) { vorschlag.schluessel = null; return; }
      if (vorschlag.erg.treffer.length && vorschlag.genommen !== einmal && !S.angaben.lehrplan) {
        vorschlag.genommen = einmal;
        vorschlagNehmen(0, true);
      }
    }).catch(function () { /* ohne Daten kein Vorschlag */ });
  }
  function zeichneVorschlag() {
    var p = $("lehrplan-vorschlag"), r = vorschlag.erg;
    p.innerHTML = "";
    p.hidden = !vorschlag.schluessel || !r || !r.treffer.length;
    if (p.hidden) return;
    p.appendChild(el("span", { cls: "lp-passt", text: "Passt dazu" + (r.angenommen ? " (" + SCHULARTEN[r.schulart] +
        " angenommen)" : "") + ":" }));
    var lp = autoGilt() ? S.angaben.lehrplan : null, lb0 = lp && lp.lernbereiche[0];
    r.treffer.forEach(function (t, i) {
      var da = !!lb0 && lp.fach === t.fach && (lp.zusatz || "") === (t.zusatz || "") && lb0.kuerzel === t.kuerzel &&
        lb0.titel === t.titel;
      p.appendChild(el("button", { type: "button", cls: "knopf lp-treffer" + (da ? " gewaehlt" : ""), "data-lp": "vorschlag",
        "data-nr": i, "aria-pressed": lp ? String(da) : null,
        text: t.fach + " " + t.jahrgangsstufe + (t.zusatz ? " " + t.zusatz : "") + ", " + t.kuerzel + " " + t.titel }));
    });
  }
  function vorschlagNehmen(nr, auto) {
    var t = vorschlag.erg && vorschlag.erg.treffer[nr], index = vorschlag.index; if (!t) return;
    var eintrag = index.schularten[t.schulart].faecher.filter(function (f) { return f.datei === t.datei; })[0];
    ladeDatei(t.datei).then(function (d) {
      if (auto && (S.angaben.lehrplan || S.angabenFuer !== Z.mappe)) return;   // nie über eine gespeicherte Wahl
      var wahl = {}; wahl[t.pfad] = { an: true, tb: {} };
      var alt = P; P = { schulart: t.schulart };
      var lp = lehrplanBauen(index, eintrag, d, wahl, t.jahrgangsstufe);
      P = alt;
      vorschlag.auto = { mappe: Z.mappe, lp: lp };
      if (P) { P = null; zeichnePicker(); }
      schreiben({ fach: lp.fach, schulart: SCHULARTEN[t.schulart], lehrplan: lp });
      S.felderFuellen();
      zeichneVorschlag();
    }).catch(function (e) { S.zeigeFehler(e); });
  }

  // ---------------------------------------------------------------- Zustand zeichnen (aus zeichne())
  function zeichneLehrplan() {
    if (!Z.mappe) { P = null; zeichnePicker(); return; }
    if (vorschlag.auto && vorschlag.auto.mappe !== Z.mappe) vorschlag.auto = null;
    if (P && S.schritt() !== 2) zuMitWahl();             // c3: Schritt verlassen
    // c2: mit Zielgruppe kein Lehrplanbezug (direkt in den Steckbrief, die gemerkte Wahl bleibt); wird sie geleert,
    // folgt der Haken wieder der gemerkten Wahl, ein vorher gewählter Lernbereich kommt nicht zurück
    var zg = zielgruppe();
    if (zg && (S.angaben.lehrplanbezug !== "nein" || S.angaben.lehrplan)) {
      P = null; zeichnePicker();
      var ohne = { lehrplanbezug: "nein", lehrplan: null };
      Object.assign(S.angaben, ohne); S.angabenSchreiben(ohne); S.textSpaeter();
    } else if (!zg && zgStand.zg && zgStand.mappe === Z.mappe) {
      var wie = { lehrplanbezug: gemerkt() ? "ja" : "nein" };
      Object.assign(S.angaben, wie); S.angabenSchreiben(wie); S.textSpaeter();
    }
    zgStand = { mappe: Z.mappe, zg: zg };
    if (offen()) {                                        // neue Einheit: die letzte Wahl, Standard aus
      var a = { lehrplanbezug: gemerkt() ? "ja" : "nein" };
      Object.assign(S.angaben, a);
      S.angabenSchreiben(a);
    }
    var an = bezug(), lp = an ? S.angaben.lehrplan : null, fehlt = ausdruecklich() && !gewaehlt();
    teil.hidden = !S.zweig();                             // sichtbar, sobald ein Weg gewählt ist
    $("lehrplanbezug").checked = an;
    $("lehrplanbezug").disabled = !!zg;
    $("lehrplan-zg").hidden = !zg;
    $("lehrplan-knopf").hidden = !an || fehlt;            // ohne Wahl steht der Picker ohnehin offen
    var v = $("lehrplan-vermerk");                        // statt „Lehrplanbezug (optional)“
    v.hidden = !lp || !(lp.lernbereiche || []).length;
    $("lehrplan-auf-text").hidden = !v.hidden;
    if (!v.hidden) v.firstChild.textContent = vermerkText(lp);
    if (!an) $("fach-treffer").hidden = true;
    if (!an && P) { P = null; zeichnePicker(); }
    // Haken an, kein Lernbereich: Picker offen; mit Wahl schließt ein so geöffneter Picker
    if (fehlt && !P) oeffnen(true);
    else if (!fehlt && P && P.auto) { P = null; zeichnePicker(); }
    zeichneFehlt();
    fazitErgaenzen();
    vorschlagSuchen();
  }
  var zgStand = { mappe: null, zg: "" };
  // c2: Einheit geschlossen oder neue Einheit: die Zielgruppe gehört zur alten Einheit
  function zielgruppeLeeren() {
    ["f", "a"].forEach(function (o) { $(o + "-zielgruppe").value = ""; $(o + "-jahrgang").dataset.zuletzt = "";
      S.zielgruppeSperre(o); });
    $("erweitert").open = false;
  }
  var leerenAlt = S.leeren;
  if (leerenAlt) S.leeren = function () { var r = leerenAlt.apply(this, arguments); zielgruppeLeeren(); return r; };
  $("neue-einheit").addEventListener("click", zielgruppeLeeren);

  // Fazit von Schritt 1 mit dem Lernbereich oder „ohne Lernbereich“ (nur mit Haken). schritte.js schreibt das Fazit bei
  // jedem Zeichnen neu; die Ergänzung hängt sich an diesen Text, ohne schritte.js zu berühren
  var fazit1 = document.querySelector("#start .s-fazit");
  function fazitZusatz() {
    if (!Z.mappe || !bezug()) return "";
    var lp = S.angaben.lehrplan;
    return gewaehlt() ? "Lernbereich " + lp.lernbereiche[0].kuerzel + " " + lp.lernbereiche[0].titel +
        (lp.lernbereiche.length > 1 ? " und " + (lp.lernbereiche.length - 1) + " weitere" : "") :
        ausdruecklich() ? "ohne Lernbereich" : "";
  }
  var fazitAlt = "";                                // zuletzt angehängter Zusatz (beim nächsten Mal erst ab)
  function fazitErgaenzen() {
    var t = fazit1.textContent, z = fazitZusatz(), alt = " · " + fazitAlt;
    if (fazitAlt && t.slice(-alt.length) === alt) t = t.slice(0, -alt.length);
    fazitAlt = t && z ? z : "";
    var neu = fazitAlt ? t + " · " + z : t;
    if (neu !== fazit1.textContent) fazit1.textContent = neu;
  }
  new MutationObserver(fazitErgaenzen).observe(fazit1, { childList: true, characterData: true, subtree: true });
  Object.assign(S, { zeichneLehrplan: zeichneLehrplan });
})();
