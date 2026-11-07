/* Kursmühle – Sequenz (AP13.40): mehrere Stunden aus einem Anfang.
 *
 * Schritt 1 schaltet zwischen „Stunde“ (Standard, alles wie bisher) und „Sequenz“ (Zahl der Stunden, Minuten je Stunde).
 * Die Mappe trägt dann `sequenz` = {stunden: [{thema, ziel}], plan}. Keine zweite Mechanik: Stunde n ist die Einheit
 * „e<n>“ (Stunde 1 die erste), angehängt über schritte.js einheitAnhaengen und den Modus „anhaengen“ in chat.js
 * (AP13.37: die übrigen Einheiten bleiben byte-gleich). Solange der Plan fehlt (sequenzOffen, wie gen/mappe.py
 * sequenz_offen), holt der Text für den Chat den Sequenzplan (gen/prompt.py sequenzplan) und die Antwort geht durch
 * gen/mappe.py sequenzplan_einsetzen: Prüfung, dann je Stunde geplante Karten mit `einheit`. Danach Stunde für Stunde.
 * Freitext ist Daten: alles über textContent und value. Wortlaut aus katalog.yaml oberflaeche.sequenz. */
"use strict";

(function () {
  if (!document.getElementById("sequenz-box")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, el = S.el;
  function T(k, w) {
    var t = String(((S.katalog && S.katalog.oberflaeche.sequenz) || {})[k] || "");
    Object.keys(w || {}).forEach(function (x) { t = t.split("{" + x + "}").join(w[x]); });
    return t;
  }
  // Korrekturrunde: die Zahl der Stunden ist nicht vorbelegt; sie bestimmt die Zahl der Anfragen an den Chat und den
  // ganzen Plan, eine stille Vorbelegung wurde in der Abnahme unverändert übernommen
  var MIN = 2, MAX = 20, MAX_OHNE_FRAGE = 8;
  var art = "stunde";                 // Wahl in Schritt 1 (für eine Mappe ohne Inhalt bis zum Abschicken)
  S.planStunde = null;                // im Plan („Ich steuere“) gezeigte Stunde; null = die laufende
  S.sequenzHalt = false;
  var hinweise = [], hinweiseFuer = null;     // gelbe Hinweise zum zuletzt eingesetzten Plan (Punkt 14)
  var kiBestaetigt = null;                    // Mappe, für die der lange Lauf schon bestätigt ist (Punkt 4)

  // ---------------------------------------------------------------- Daten
  function seq() { var s = Z.mappe && Z.mappe.sequenz; return s && s.stunden && s.stunden.length ? s : null; }
  function stundeTag(n) { return n <= 1 ? "" : "e" + n; }
  function stundeNr(tag) { return /^e\d+$/.test(tag || "") ? parseInt(tag.slice(1), 10) : 1; }
  function stundeJetzt() { return stundeNr(S.einheitTag()); }
  function karten(n) {
    var t = stundeTag(n);
    return Z.mappe.bausteine.filter(function (k) { return (k.einheit || "") === t && !k.aus; });
  }
  function fertig(n) { return karten(n).some(function (k) { return !k.geplant; }); }
  // Thema oder Elemente: Planungsarbeit, die eine Rückfrage braucht, bevor sie wegfällt
  function belegt(n) {
    var s = seq(), t = stundeTag(n);
    return !!(s && s.stunden[n - 1] && String(s.stunden[n - 1].thema || "").trim()) || karten(n).length > 0 ||
        ((Z.mappe.kacheln || []).some(function (k) { return (k.einheit || "") === t && n > 1; }));
  }
  // wie gen/mappe.py sequenz_offen: der Plan fehlt noch (in „Ich steuere“ reicht ein Element in jeder Stunde)
  function offen() {
    var s = seq();
    if (!s || s.plan) return false;
    if (S.zweig() === "steuer") {
      var alle = s.stunden.every(function (_, i) { return karten(i + 1).length > 0; });
      if (alle) return false;
    }
    return true;
  }
  function themaVon(n) {
    var s = seq(), st = s && s.stunden[n - 1];
    return String((st && st.thema) || "").trim();
  }
  // Punkt 18: ein neues Thema benennt die Kachel der Stunde (und den Abschnitt ihrer geplanten Karten) mit, solange die
  // Lehrkraft den Kacheltitel nicht selbst gesetzt hat und die Stunde noch keinen Inhalt hat
  function themaSetzen(n, wert) {
    var s = seq(); if (!s || !s.stunden[n - 1]) return;
    var alt = String(s.stunden[n - 1].thema || "").trim(), neu = wert.replace(/\s+/g, " ").trim(), tag = stundeTag(n);
    s.stunden[n - 1].thema = wert;
    var th = Z.mappe.themen = Z.mappe.themen || {};
    if (neu) th["e" + n] = neu; else delete th["e" + n];
    if (n === stundeJetzt() && n > 1 && Z.mappe.einheit) Z.mappe.einheit.thema = neu;
    if (!neu || fertig(n)) return;
    var kacheln = (Z.mappe.kacheln || []).filter(function (k) { return (k.einheit || "") === tag; });
    var ka = kacheln.filter(function (k) { return !k.titel_selbst && (k.titel === alt || (kacheln.length === 1 && !alt)); })[0];
    if (!ka || kacheln.some(function (k) { return k !== ka && k.titel === neu; })) return;
    Z.mappe.bausteine.forEach(function (k) { if ((k.einheit || "") === tag && k.geplant && k.abschnitt === ka.titel) k.abschnitt = neu; });
    ka.titel = neu;
  }
  function neueStunden(n, alt) {
    var out = (alt || []).slice(0, n);
    while (out.length < n) out.push({ thema: "", ziel: "" });
    return out;
  }
  function ki() { return !!(S.anKiAktiv && S.anKiAktiv()); }
  // Stunde k und alle danach ohne Inhalt? Dann darf sie weg (die übrigen rücken in der Mappe nach, die Kursdatei bleibt)
  function entfernbar(k) {
    var s = seq(); if (!s || s.stunden.length <= MIN) return false;
    for (var j = k; j <= s.stunden.length; j++) if (fertig(j)) return false;
    return k > stundeJetzt() || (!S.inhalt() && !Z.mappe.anhaengen && !Z.mappe.laufend);
  }
  // Stunde k aus der Mappe: ihre Karten und Kacheln, die Einheiten danach rücken um eins vor (`einheit`, `themen`)
  function stundeEntfernen(k) {
    var s = seq(), weg = stundeTag(k);
    Z.mappe.bausteine = Z.mappe.bausteine.filter(function (x) { return (x.einheit || "") !== weg; });
    Z.mappe.kacheln = (Z.mappe.kacheln || []).filter(function (x) { return (x.einheit || "") !== weg; });
    var ruecken = function (x) {
      var n = stundeNr(x.einheit);
      if (x.einheit && n > k) { var t = stundeTag(n - 1); if (t) x.einheit = t; else delete x.einheit; }
    };
    Z.mappe.bausteine.forEach(ruecken); Z.mappe.kacheln.forEach(ruecken);
    s.stunden.splice(k - 1, 1);
    var th = Z.mappe.themen = {};
    s.stunden.forEach(function (st, i) { if (String(st.thema || "").trim()) th["e" + (i + 1)] = String(st.thema).trim(); });
    if (Z.mappe.einheiten && Z.mappe.einheiten > s.stunden.length) Z.mappe.einheiten = s.stunden.length;
  }

  // ---------------------------------------------------------------- Schritt 1
  // Umschalter als Radiogruppe (role=radio, Pfeiltasten aus kern.js), dazu bei „Sequenz“ die Zahl der Stunden mit ⓘ
  // (ein echter Knopf; das Feld hat sein eigenes label, das ⓘ liegt daneben)
  function zeile1() {
    var box = $("f-art-zeile");
    if (box.firstChild || !S.katalog) return;
    var gruppe = el("div", { id: "f-art", cls: "kacheln-wahl text-wahl seq-art", role: "radiogroup", "aria-label": T("art") },
        ["stunde", "sequenz"].map(function (w) {
      return el("button", { type: "button", cls: "aus-kachel", role: "radio", "data-wert": w, id: "f-art-" + w,
          "aria-checked": String(w === "stunde"), text: T(w) });
    }));
    var zahl = el("input", { id: "f-stunden", type: "number", min: String(MIN), max: String(MAX), step: "1",
        inputmode: "numeric", placeholder: T("stunden_platz") });
    var info = el("button", { type: "button", cls: "info-knopf", "aria-expanded": "false", "aria-label": T("info_label"),
        "data-info": "sequenz_info", text: "ⓘ" });
    var l = el("div", { id: "f-stunden-l", cls: "feld seq-stunden-l info-ort", hidden: true }, [
      el("label", { "for": "f-stunden", cls: "feld-kopf", text: T("stunden") }), info, zahl,
      el("span", { cls: "info-text feld-zeile", "data-info-text": "sequenz_info", hidden: true })]);
    box.append(gruppe, l);
    gruppe.addEventListener("click", function (ev) {
      var b = ev.target.closest("[role=radio]"); if (!b || b.disabled) return;
      art = b.dataset.wert;
      zeichne1();
    });
    zahl.addEventListener("input", function () { S.feldOk(zahl); zahl.dataset.getippt = "1"; });
    zeichne1();
  }
  // änderbar, solange die Einheit neu ist (keine Mappe) oder die erste Einheit noch ohne Inhalt; nicht beim Anhängen
  function aenderbar() {
    if (!Z.mappe) return true;
    return !Z.mappe.anhaengen && !Z.mappe.laufend && !S.inhalt() && !(seq() && seq().plan);
  }
  var artFuer;                        // Mappe, zu der `art` gehört; eine andere Mappe setzt die Wahl auf ihren Stand
  function zeichne1() {
    var box = $("f-art-zeile"); if (!box.firstChild) return;
    var zahl = $("f-stunden");
    if (artFuer !== Z.mappe) {          // andere Mappe (geöffnet, neu, „Neue Einheit“): Wahl und Zahl aus ihr
      art = Z.mappe && seq() ? "sequenz" : "stunde"; artFuer = Z.mappe;
      delete zahl.dataset.getippt;
      if (!Z.mappe) zahl.value = "";
    }
    // Punkt 6: die Zahl in Schritt 1 ist immer die der Mappe, solange die Lehrkraft dort nicht gerade eine andere tippt
    if (seq() && !zahl.dataset.getippt && document.activeElement !== zahl) zahl.value = String(seq().stunden.length);
    var frei = aenderbar();
    box.hidden = !frei && !seq();
    Array.prototype.forEach.call(box.querySelectorAll("[role=radio]"), function (b) {
      b.setAttribute("aria-checked", String(b.dataset.wert === art));
      b.disabled = !frei && b.dataset.wert !== art;
    });
    var sq = art === "sequenz";
    $("f-stunden-l").hidden = !sq;
    zahl.disabled = !frei;
    $("f-minuten-t").textContent = sq ? T("minuten_je") : T("minuten");
    $("start-form").classList.toggle("mit-sequenz", sq);
    $("zeit-vorab").hidden = sq;      // Punkt 12: die Zeitangabe gilt für eine Stunde
  }
  // Schritt 1 abgeschickt: Zahl der Stunden oder 0 („Stunde“); null, wenn die Zahl nicht stimmt (Meldung am Feld)
  function sequenzWahl() {
    var box = $("f-art-zeile");
    if (!box.firstChild || box.hidden || !aenderbar()) return 0;
    if (art !== "sequenz") return 0;
    var w = $("f-stunden").value.trim();
    if (!(/^\d+$/.test(w) && +w >= MIN && +w <= MAX)) {
      S.feldMeldung($("f-stunden"), T("stunden_fehler"));
      $("f-stunden").focus();
      return null;
    }
    return +w;
  }
  // Punkt 3 und 6: fallen beim Abschicken Stunden mit Themen oder Elementen weg (zur Einzelstunde, weniger Stunden),
  // fragt die Mühle vorher. -> null (keine Frage nötig) oder Versprechen auf true/false
  function sequenzFrage(n) {
    var s = seq(); if (!s || !aenderbar() || (n && n >= s.stunden.length)) return null;
    if (!n) {
      var zahl = s.stunden.filter(function (_, i) { return belegt(i + 1); }).length;
      if (!zahl || (zahl === 1 && !belegtSpaeter(1))) return null;
      return S.frage(T("zur_stunde_frage", { zahl: zahl }), [], T("zur_stunde_ja"), T("abbrechen"), "riskant")
          .then(function (w) { return w === "sicher"; });
    }
    var weg = [];
    for (var k = n + 1; k <= s.stunden.length; k++) if (belegt(k)) weg.push(k);
    if (!weg.length) return null;
    return S.frage(T("weniger_frage", { liste: weg.join(", "), n: n }), [], T("weniger_ja", { n: n }), T("abbrechen"),
        "riskant").then(function (w) { return w === "sicher"; });
  }
  function belegtSpaeter(k) { var s = seq(); for (var j = k + 1; j <= s.stunden.length; j++) if (belegt(j)) return true; return false; }
  // Mappe angelegt oder Schritt 1 nachträglich geändert: Sequenz setzen, anpassen oder entfernen; was wegfällt, geht
  // ganz (keine unsichtbaren Karten oder Kacheln anderer Stunden)
  function sequenzSetzen(n) {
    if (!Z.mappe || !aenderbar()) return;
    delete $("f-stunden").dataset.getippt;
    var s = seq();
    if (!n) {
      if (s) {
        Z.mappe.bausteine = Z.mappe.bausteine.filter(function (x) { return !x.einheit; });
        Z.mappe.kacheln = (Z.mappe.kacheln || []).filter(function (x) { return !x.einheit; });
        delete Z.mappe.themen; S.planStunde = null;
      }
      delete Z.mappe.sequenz;
      return;
    }
    if (s) while (s.stunden.length > n) stundeEntfernen(s.stunden.length);
    s = Z.mappe.sequenz = Z.mappe.sequenz || { stunden: [], plan: false };
    s.stunden = neueStunden(n, s.stunden);
  }

  // ---------------------------------------------------------------- Schritt 2: Themen je Stunde („Ich gebe die Richtung“)
  function zeichneRichtung() {
    var box = $("r-stunden"), s = seq();
    var an = !!s && S.zweig() === "richtung" && offen();
    box.hidden = !an;
    if (!an) return;
    var n = s.stunden.length;
    if (box.querySelectorAll("input").length !== n) {
      var a = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.n : null;
      box.textContent = "";
      var liste = el("div", { cls: "r-stunden-liste" });
      for (var i = 1; i <= n; i++) {
        var f = el("input", { type: "text", maxlength: "120", "data-n": String(i), cls: "von-lehrkraft", autocomplete: "off",
            "aria-label": T("stunde_thema", { n: i }) });
        liste.appendChild(el("label", { cls: "r-stunde" }, [el("span", { cls: "r-stunde-nr", text: T("stunde_n", { n: i }) }), f]));
      }
      box.append(el("h3", { cls: "unterkopf", id: "r-stunden-t", text: T("themen") }),
          el("p", { cls: "feld-zeile", text: T("themen_zeile") }), liste);
      if (a) { var g = box.querySelector("input[data-n='" + a + "']"); if (g) g.focus(); }
    }
    Array.prototype.forEach.call(box.querySelectorAll("input"), function (f) {
      if (document.activeElement !== f) f.value = themaVon(+f.dataset.n);
    });
  }
  $("r-stunden").addEventListener("input", function (ev) {
    var f = ev.target; if (!f.dataset.n) return;
    themaSetzen(+f.dataset.n, f.value);
    S.geaendert();
  });

  // ---------------------------------------------------------------- Plan („Ich steuere“): Stunden als Reiter
  // plan.js fragt S.planStundeTag (welche Einheit der Plan zeigt) und S.planStundeThema (Titel einer neuen Kachel).
  // Gezeigt wird S.planStunde, solange die Lehrkraft eine andere als die laufende gewählt hat (zurückgesetzt, sobald
  // Schritt 2 zu ist), sonst die laufende
  function planStunde() {
    var s = seq(); if (!s) return null;
    return Math.max(1, Math.min(S.planStunde || stundeJetzt(), s.stunden.length));
  }
  S.planStundeTag = function () { return S.planStunde && seq() ? stundeTag(planStunde()) : null; };
  S.planStundeThema = function () { return seq() ? themaVon(planStunde()) : ""; };
  function kopf() {
    var s = seq();
    return T("kopf", { thema: Z.mappe.titel || "", von: s.stunden.length, minuten: (Z.mappe.einheit || {}).minuten || 45 });
  }
  S.sequenzLeiste = function () {
    var s = seq(), n = planStunde();
    if (!s || n === null) return null;
    var reiter = el("div", { cls: "kacheln-wahl text-wahl seq-reiter", role: "radiogroup", "aria-label": T("sequenz") },
        s.stunden.map(function (st, i) {
      var t = String(st.thema || "").trim(), z = karten(i + 1).length;
      return el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": String(i + 1 === n),
          "data-wert": String(i + 1), "data-fokus": "sq:" + (i + 1), "data-seq": "stunde",
          title: t || T("stunde_n", { n: i + 1 }) }, [el("span", { text: T("stunde_n", { n: i + 1 }) }),
          el("span", { cls: "seq-reiter-zahl", text: z ? "· " + z : "" })]);
    }));
    var kinder = [reiter];
    if (S.zweig() === "steuer" && s.stunden.length < MAX) {
      kinder.push(el("button", { type: "button", cls: "knopf klein-knopf seq-plus", "data-seq": "plus", "data-fokus": "sq-plus",
          text: T("plus") }));
    }
    var feld = el("input", { type: "text", maxlength: "120", cls: "von-lehrkraft seq-thema", "data-seq": "thema",
        "data-n": String(n), "data-fokus": "sq-thema", autocomplete: "off", id: "seq-thema" });
    feld.value = themaVon(n);
    var ziel = String((s.stunden[n - 1] || {}).ziel || "").trim();
    var weg = entfernbar(n) ? el("button", { type: "button", cls: "textlink seq-weg", "data-seq": "weg", "data-fokus": "sq-weg",
        "data-n": String(n), text: T("entfernen", { n: n }) }) : null;
    return el("div", { cls: "seq-leiste" }, [
      el("h3", { cls: "unterkopf", text: kopf() }),
      el("div", { cls: "seq-reiter-zeile" }, kinder),
      el("div", { cls: "seq-thema-zeile" }, [el("label", { cls: "feld seq-thema-l", "for": "seq-thema",
          text: T("stunde_thema", { n: n }) }), feld, weg]),
      ziel ? el("p", { cls: "leise seq-ziel", text: T("ziel", { ziel: ziel }) }) : null]);
  };
  $("plan").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-seq]"); if (!b || !seq()) return;
    var s = seq();
    if (b.dataset.seq === "stunde") {
      S.planStunde = parseInt(b.dataset.wert, 10);
      S.zeichnePlan();
      var f = $("plan").querySelector("[data-fokus='sq:" + S.planStunde + "']"); if (f) f.focus();
    } else if (b.dataset.seq === "plus") {
      if (s.stunden.length >= MAX) return;
      s.stunden.push({ thema: "", ziel: "" });
      S.planStunde = s.stunden.length;
      S.geaendert(); S.zeichne();
      var t = $("plan").querySelector("[data-fokus='sq-thema']"); if (t) t.focus();
    } else if (b.dataset.seq === "weg") {
      var k = parseInt(b.dataset.n, 10);
      if (!entfernbar(k)) return;
      var weiter = function () {
        stundeEntfernen(k);
        S.planStunde = Math.min(k, seq().stunden.length);
        S.geaendert(); S.zeichne();
        S.fokus([$("plan").querySelector("[data-fokus='sq:" + S.planStunde + "']")], true);
      };
      if (!belegt(k)) { weiter(); return; }
      S.frage(T("entfernen_frage", { n: k }), [], T("entfernen", { n: k }), T("abbrechen"), "riskant")
        .then(function (w) { if (w === "sicher") weiter(); });
    }
  });
  $("plan").addEventListener("input", function (ev) {
    var f = ev.target; if (f.dataset.seq !== "thema") return;
    themaSetzen(+f.dataset.n, f.value);
    var r = $("plan").querySelector("[data-fokus='sq:" + f.dataset.n + "']");
    if (r) r.title = f.value.trim() || T("stunde_n", { n: f.dataset.n });
    // die Kachel der Stunde trägt das Thema mit (Punkt 18); ihr Titelfeld zieht nach, ohne den Fokus zu nehmen
    var tag = stundeTag(+f.dataset.n), alle = (Z.mappe.kacheln || []).filter(function (k) { return (k.einheit || "") === tag; });
    Array.prototype.forEach.call($("plan").querySelectorAll(".plan-k-titel"), function (t) {
      var ka = alle[parseInt(t.dataset.nr, 10)]; if (ka && t.value !== ka.titel) t.value = ka.titel;
    });
    S.geaendert();
  });
  // Ein Titel, den die Lehrkraft in der Kachel selbst setzt, folgt dem Thema nicht mehr
  $("plan").addEventListener("change", function (ev) {
    if (!seq() || !ev.target.classList.contains("plan-k-titel")) return;
    var tag = stundeTag(planStunde()), alle = (Z.mappe.kacheln || []).filter(function (k) { return (k.einheit || "") === tag; });
    var ka = alle[parseInt(ev.target.dataset.nr, 10)];
    if (ka && ka.titel !== themaVon(planStunde())) ka.titel_selbst = true;
  });

  // ---------------------------------------------------------------- Übersicht, Fortschritt und Knöpfe
  // Kasten in Schritt 4 mit Kopf, Stand und dem Plan aller Stunden; die Knöpfe („Plan ändern“, Sicherung) stehen in einer
  // Zeile, die mit dem laufenden Schritt wandert (Schritt 4, 5 oder 7): es gibt jeden Knopf genau einmal
  function zeichneBox() {
    var box = $("sequenz-box"), s = seq();
    box.hidden = !s;
    if (!s) return;
    var n = stundeJetzt(), von = s.stunden.length, plan = !offen();
    var aktionen = $("sequenz-aktionen");
    if (aktionen && box.contains(aktionen)) aktionen.remove();
    box.textContent = "";
    box.appendChild(el("p", { cls: "seq-kopf", text: kopf() }));
    box.appendChild(el("p", { cls: "seq-stand", id: "sequenz-stand", role: "status",
        text: !plan ? T("plan_offen") : n > von ? "" : T("stunde_von", { n: n, von: von }) }));
    if (hinweiseFuer !== Z.mappe) hinweise = [];
    hinweise.forEach(function (h) {
      box.appendChild(el("p", { cls: "warnung-box seq-hinweis", text: T("hinweis", { zeile: h.zeile, zitat: h.zitat, text: h.text }) }));
    });
    if (ki()) {
      var zahl = plan ? von - n + (fertig(n) ? 0 : 1) : von + 1;
      if (zahl > 0) box.appendChild(el("p", { cls: "leise seq-ki", id: "sequenz-ki", text: T("ki_anfragen", { zahl: zahl,
          plan: plan ? "" : T("ki_plan") }) }));
    }
    if (plan) {
      var ol = el("ol", { cls: "seq-liste" });
      s.stunden.forEach(function (st, i) {
        var k = i + 1, stand = fertig(k) ? T("fertig") : k === n ? T("jetzt") : T("offen");
        var teile = karten(k).map(function (x) {
          return (x.phase ? x.phase + ": " : "") + S.formularname(x.typ) + (x.titel && x.titel !== x.phase ? " „" + x.titel + "“" : "");
        });
        ol.appendChild(el("li", { cls: "seq-stunde" + (k === n ? " jetzt" : "") + (fertig(k) ? " fertig" : "") }, [
          el("span", { cls: "seq-st-kopf" }, [el("strong", { text: T("stunde_n", { n: k }) + ": " }),
            document.createTextNode(String(st.thema || "").trim() || "–"), el("span", { cls: "seq-st-stand", text: " · " + stand })]),
          st.ziel ? el("span", { cls: "seq-st-ziel leise", text: T("ziel", { ziel: st.ziel }) }) : null,
          teile.length ? el("span", { cls: "seq-st-teile leise", text: teile.join(" · ") }) : null]));
      });
      box.appendChild(el("details", { cls: "seq-details" }, [el("summary", { text: T("plan_text") }), ol]));
    }
  }
  function zeichneAktionen() {
    var s = seq(), a = $("sequenz-aktionen");
    if (!s) { if (a) a.remove(); return; }
    if (!a) {
      a = el("div", { id: "sequenz-aktionen", cls: "kopieren seq-knoepfe" }, [
        el("button", { type: "button", cls: "textlink", id: "sequenz-aendern" }),
        el("button", { type: "button", cls: "knopf klein-knopf", id: "sequenz-sicherung", text: T("sicherung") })]);
      a.addEventListener("click", function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        if (b.id === "sequenz-aendern") planAendern();
        if (b.id === "sequenz-sicherung") sicherung();
      });
    }
    var schr = S.schritt(), ort = schr >= 5 ? $("sequenz-weiter") : $("sequenz-box");
    if (a.parentNode !== ort) ort.appendChild(a);
    else if (ort.lastChild !== a) ort.appendChild(a);
    var offenK = s.stunden.some(function (_, i) { return !fertig(i + 1); });
    $("sequenz-aendern").hidden = offen() || !offenK;
    $("sequenz-aendern").textContent = S.zweig() === "steuer" ? T("plan_aendern") : T("plan_aendern_steuer");
    $("sequenz-sicherung").hidden = !S.inhalt();
    a.hidden = $("sequenz-aendern").hidden && $("sequenz-sicherung").hidden;
  }
  // „Plan ändern“: der Plan in Schritt 2 mit der Bedienung von „Ich steuere“ (ein Weg-Wechsel wie in Schritt 2), gezeigt
  // die nächste Stunde ohne Inhalt
  function planAendern() {
    var vorher = S.zweig(), s = seq();
    if (vorher !== "steuer") {
      Z.mappe.zweig = "steuer";
      if (S.planZweig) S.planZweig(vorher, "steuer");
    }
    var n = stundeJetzt();
    while (n < s.stunden.length && fertig(n)) n += 1;
    S.planStunde = n;
    S.auf[2] = true;
    S.zeichne(); S.geaendert();
    S.sektion(2).scrollIntoView({ block: "start" });
    S.fokus([$("plan").querySelector("[data-fokus='sq:" + S.planStunde + "']"), "plan-beschreibung"], true);
  }
  // Sicherung mit den fertigen Stunden: derselbe Bau wie „Herunterladen“ in Schritt 7
  function sicherung() { if (S.inhalt() && $("herunterladen").onclick) $("herunterladen").onclick(); }

  // Schritt 5 (in Schritt 7 über „Nächste Einheit anhängen“): weiter mit der nächsten Stunde; dann Hauptknopf (Punkt 11)
  function zeichneWeiter() {
    var box = $("sequenz-weiter"), s = seq();
    var n = s ? stundeJetzt() : 0, an = !!s && !offen() && fertig(n) && S.schritt() >= 5;
    var ort = S.schritt() >= 7 ? document.querySelector("#schritt-7 .danach") : $("weiter-5");
    if (S.schritt() >= 7 ? box.nextElementSibling !== ort : box.previousElementSibling !== ort) {
      if (S.schritt() >= 7) ort.before(box); else ort.after(box);
    }
    $("naechste-einheit").hidden = !!s && n < s.stunden.length;
    var von = s ? s.stunden.length : 0;
    $("weiter-5").classList.toggle("haupt", !(an && n < von));
    box.hidden = !s || S.schritt() < 5 || (!an && !(S.inhalt() && !offen()));
    if (box.hidden) return;
    var rot = S.fehlerZahl() > 0 || S.teileOffen();
    var satz = !an ? "" : n >= von ? T("alle_fertig", { von: von }) : rot ? T("rot_halt", { n: n, weiter: n + 1 }) :
        T("stunde_von", { n: n, von: von }) + ".";
    var p = box.querySelector("p.seq-weiter-satz");
    if (!p) { p = el("p", { cls: "seq-weiter-satz" }); box.insertBefore(p, box.firstChild); }
    if (p.textContent !== satz) p.textContent = satz;
    p.hidden = !satz;
    var k = box.querySelector("#sequenz-naechste");
    if (an && n < von) {
      if (!k) { k = el("button", { type: "button", cls: "knopf haupt", id: "sequenz-naechste" }); p.after(k); }
      k.textContent = T("weiter", { n: n + 1 });
      k.disabled = !!(S.kiBesetzt && S.kiBesetzt());
    } else if (k) k.remove();
  }
  $("sequenz-weiter").addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    if (b.id === "sequenz-naechste") { S.sequenzHalt = false; naechste(true); }     // mit eigener KI geht der Text gleich los
  });
  // Stunde n beginnen: Einheit „e<n>“ über den vorhandenen Weg (schritte.js einheitAnhaengen); ihre Karten stehen schon
  // in der Mappe (Sequenzplan), sonst kommen sie aus dem Aufbau. Das Material gilt für die ganze Reihe und bleibt.
  function stundeStarten(n) {
    var s = seq(), alt = Z.mappe.einheit || {};
    var e = { thema: themaVon(n) || T("stunde_n", { n: n }), jahrgang: alt.jahrgang || "", minuten: alt.minuten || 45 };
    if (alt.jahrgang_zuletzt) e.jahrgang_zuletzt = alt.jahrgang_zuletzt;
    Z.mappe.einheiten = Math.max(n, Z.mappe.einheiten || 0);
    Z.mappe.anhaengen = stundeTag(n);
    Z.bau = null;
    S.planStunde = null;
    if (!s.stunden[n - 1]) return Promise.resolve();
    return S.einheitAnhaengen(e, true);
  }
  async function naechste(auto) {
    var s = seq(); if (!s) return;
    var n = stundeJetzt() + 1; if (n > s.stunden.length) return;
    try {
      await stundeStarten(n);
      await S.texteErzeugen();
      S.zeichne();
      var sec = S.sektion(4);
      if (sec && !sec.hidden) sec.scrollIntoView({ block: "start" });
      if (auto && ki()) S.textSenden(0);
      else S.fokus(["text-kopieren", "chat-aendern"], true);
    } catch (e) { S.zeigeFehler(e); }
  }
  // chat.js nach einer ganz eingesetzten Antwort der laufenden Stunde: mit eigener KI weiter ohne Klick, Halt bei Rot
  S.nachStunde = function (rot) {
    var s = seq(); if (!s) return;
    var halt = S.sequenzHalt || !!(S.angehalten && S.angehalten[S.einheitTag() || ""]);   // „Anhalten“ (chat.js)
    if (ki() && !halt && !rot && !S.teileOffen() && stundeJetzt() < s.stunden.length) naechste(true);
    else S.zeichne();
  };

  // ---------------------------------------------------------------- eigene KI (Punkt 4)
  // chat.js textSenden: kommt nach diesem Text noch eine Stunde? Dann trägt die Zeile „Deine KI schreibt“ „Anhalten“
  S.sequenzDanach = function () { var s = seq(); return !!s && (offen() || stundeJetzt() < s.stunden.length); };
  // … und sagt vorn, was gerade läuft („Sequenzplan · “, „Stunde 2 von 6 · “)
  S.sequenzVor = function () {
    var s = seq(); if (!s) return "";
    return (offen() ? T("plan_text") : T("stunde_von", { n: stundeJetzt(), von: s.stunden.length })) + " · ";
  };
  // vor dem ersten Senden: bei mehr als acht Anfragen einmal bestätigen. -> Versprechen auf true/false
  S.sequenzStart = function () {
    var s = seq();
    if (!s || !ki() || kiBestaetigt === Z.mappe) return Promise.resolve(true);
    var n = stundeJetzt(), zahl = offen() ? s.stunden.length + 1 : s.stunden.length - n + (fertig(n) ? 0 : 1);
    if (zahl <= MAX_OHNE_FRAGE) return Promise.resolve(true);
    return S.frage(T("ki_frage", { zahl: zahl }), [], T("ki_ja"), T("abbrechen"), "riskant").then(function (w) {
      if (w === "sicher") kiBestaetigt = Z.mappe;
      return w === "sicher";
    });
  };

  // ---------------------------------------------------------------- Antwort einer anderen Stunde (Punkt 2, 17)
  // chat.js vor dem Anhängen der laufenden Stunde: trägt die Antwort ids anderer Stunden oder keine id dieser Stunde,
  // fragt die Mühle. -> Versprechen auf true (einsetzen) oder false
  S.sequenzFremd = function (text, mo) {
    var s = seq(); if (!s) return Promise.resolve(true);
    var tag = S.einheitTag() || "", n = stundeJetzt(), nachId = {};
    Z.mappe.bausteine.forEach(function (k) { nachId[k.id] = k; });
    var basis = function (x) { return String(x).replace(/-\d+$/, ""); };
    var ids = (mo.ids || []).filter(function (x) { return !/^b-[0-9a-f]+$/.test(x); });     // berechnete ids zählen nicht
    var fremd = [], eigen = false;
    ids.forEach(function (x) {
      var k = nachId[x] || nachId[basis(x)]; if (!k) return;
      if ((k.einheit || "") === tag) eigen = true;
      else { var m = stundeNr(k.einheit); if (fremd.indexOf(m) < 0) fremd.push(m); }
    });
    if (!ids.length || (eigen && !fremd.length)) return Promise.resolve(true);
    fremd.sort(function (a, b) { return a - b; });
    var frage = fremd.length ? T("fremd_frage", { n: n, stunden: fremd.map(function (m) { return T("stunde_n", { n: m }); })
        .join(", ") }) : T("fremd_ohne", { n: n });
    // „Abbrechen“ ist hier der vorgewählte Knopf (auch Esc); einsetzen nur auf ausdrücklichen Klick
    return S.frage(frage, [], T("abbrechen"), T("fremd_ja", { n: n }), "sicher").then(function (w) { return w === "riskant"; });
  };
  // chat.js Meldung nach dem Einsetzen: „Stunde 2 eingesetzt“ statt „Übernommen (als weitere Einheit angehängt)“
  S.sequenzEingesetzt = function () { return seq() ? T("eingesetzt", { n: stundeJetzt() }) : ""; };

  // ---------------------------------------------------------------- Sequenzplan einsetzen (chat.js eingabeUebernehmen)
  // -> true, wenn eingesetzt. Fehler: Karte mit Zeilen und Korrekturbitte (chat.js diagnoseKarte), nichts geändert
  S.sequenzplanEinsetzen = async function (text, zeige, diagnose, feld, o) {
    var gesendet = Z.mappe;
    var r = await km.mappeFn("sequenzplan_einsetzen", [gesendet, text]);
    if (Z.mappe !== gesendet) return false;
    if (!r.ok) {
      zeige("");
      diagnose({ kopf: T("nicht_lesbar"), meldungen: r.meldungen, satz: r.satz });
      return false;
    }
    ["bausteine", "kacheln", "sequenz", "themen"].forEach(function (k) { gesendet[k] = r.mappe[k]; });
    hinweise = r.hinweise || []; hinweiseFuer = gesendet;
    diagnose(null); zeige("");
    if (feld) $("eingabe").value = ""; else if (o && o.leeren) o.leeren();
    delete Z.mappe.kopiert;
    S.texte.kopiert = {}; S.texte.teil = 0;
    Z.mappe.schritt = 4; S.auf = {}; S.planStunde = null;
    await S.neuPruefen();
    await S.texteErzeugen();
    S.zeichne();
    var st = $("sequenz-stand"); if (st) st.textContent = T("uebernommen", { von: r.stunden });
    var sec = S.sektion(4); if (sec) sec.scrollIntoView({ block: "start" });
    if (ki() && !S.sequenzHalt && !(S.angehalten && S.angehalten[""])) S.textSenden(0);
    else S.fokus(["text-kopieren", "chat-aendern"], true);
    return true;
  };

  // ---------------------------------------------------------------- Zeichnen (kern.js zeichne)
  S.zeichneSequenz = function () {
    if (!S.katalog) return;
    if (S.planStunde && Z.mappe && S.schritt() > 2 && !S.auf[2]) S.planStunde = null;
    // eine Einheit hinter der letzten Stunde („Nächste Einheit anhängen“) ist die nächste Stunde der Sequenz (N2)
    var s = seq();
    if (s && stundeJetzt() > s.stunden.length && Z.mappe.laufend === S.einheitTag()) {   // erst, wenn sie angelegt ist
      while (s.stunden.length < stundeJetzt()) s.stunden.push({ thema: s.stunden.length + 1 === stundeJetzt() ?
          String((Z.mappe.einheit || {}).thema || "") : "", ziel: "" });
    }
    zeile1(); zeichne1();
    zeichneRichtung();
    zeichneBox();
    zeichneWeiter();
    zeichneAktionen();
    $("s4-titel").textContent = !s ? "Text für den Chat" : offen() ? T("titel_plan") :
        T("titel_stunde", { n: stundeJetzt(), von: s.stunden.length });
    var ma = $("modus-anhaengen-text");
    if (ma) ma.textContent = s ? T("modus_anhaengen", { n: stundeJetzt() }) : "Als weitere Einheit anhängen";
  };
  if (S.katalogDa) S.katalogDa.then(function () { zeile1(); });
  // der Satz zur eigenen KI hängt am gewählten Chat; dessen Wahl zeichnet nur Schritt 4 neu
  $("chat-knoepfe").addEventListener("click", function () { setTimeout(function () { if (Z.mappe) zeichneBox(); }, 0); });

  Object.assign(S, { sequenzOffen: function () { return !!Z.mappe && offen(); }, sequenzWahl: sequenzWahl,
    sequenzSetzen: sequenzSetzen, sequenzFrage: sequenzFrage, sequenzArt: function () { return art; },
    sequenzKopf: function () { var s = seq(); return s ? T("fazit", { von: s.stunden.length }) : ""; },
    sequenzName: function () {
      var s = seq(); return s ? T("autosave", { thema: Z.mappe.titel || "", n: stundeJetzt(), von: s.stunden.length }) : "";
    } });
})();
