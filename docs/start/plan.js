/* Kursmühle – Plan der Einheit in „Ich steuere“ (AP13.31): den Kurs beschreiben, die Darstellung wählen, Kacheln anlegen
 * und jeder Kachel Elemente geben, bis die erste Antwort der Einheit eingesetzt ist. Danach geht es im Editor weiter.
 *
 * Keine eigenen Daten neben der Mappe: ein Element ist eine geplante Karte (`Z.mappe.bausteine[]` mit `geplant`, Typ,
 * Titel, Auftrag, Soll-Minuten), ihre Kachel steht in `abschnitt`. Die Kacheln selbst (Reihenfolge, Titel, „Was soll hier
 * rein?“, auch leere) stehen in `Z.mappe.kacheln` ({titel, text, einheit}). Der Text für den Chat entsteht wie bisher
 * (gen/prompt.py einheit, Abschnitt je Kachel; „Kachel für Kachel“ über die Teile der Stückelung). Freitext ist Daten:
 * alles geht über textContent und value. Wortlaut aus katalog.yaml oberflaeche.editor (S.editorText).
 * AP13.39: Der leere Plan hat zwei Anfänge: „Nach Phasen beginnen“ (Phasenfolge der gewählten Art als Elemente mit Phase,
 * eine Kachel mit dem Thema) und „Leer beginnen“ (eine leere Kachel). Jedes Element hat das Feld „Phase“ wie früher die
 * Karten (`phase`, Liste #phasen und Freitext). Ist der Plan nach Phasen begonnen (Kachel mit `aufbau`), gelten die
 * Warnungen der Art über alle Kacheln (gen/mappe.py planung), mit „Fehlende Phase ergänzen“ (gen/mappe.py auffuellen, wie
 * „Vorlage auffüllen“); leer begonnen ist eine Phase nur ein Etikett. */
"use strict";

(function () {
  if (!document.getElementById("plan")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, el = S.el, AUTO = S.AUTO;
  function T(k, w) { return S.editorText(k, w); }
  var box = $("plan");
  var offen = null;             // id des offenen Elements
  // letztes Löschen, einstufig: {art: "element", karte, nach (id der Karte davor), index, titel, kachel} oder
  // {art: "kachel", kachel, index, titel}; die nächste andere Änderung nimmt es weg
  var rueck = null;

  // ---------------------------------------------------------------- Daten
  // AP13.40: in einer Sequenz zeigt der Plan die Stunde, die die Lehrkraft gewählt hat (sequenz.js), sonst die laufende
  function tag() { var t = S.planStundeTag ? S.planStundeTag() : null; return t !== null ? t : S.einheitTag() || ""; }
  function vonEinheit(x) { return (x.einheit || "") === tag(); }
  // Plan: „Ich steuere“, und die laufende Einheit hat noch keinen Baustein mit Inhalt
  function planPhase() {
    return !!(Z.mappe && S.zweig() === "steuer" && !Z.mappe.bausteine.some(function (k) { return !k.geplant && vonEinheit(k); }));
  }
  function kacheln() { return (Z.mappe.kacheln || []).filter(vonEinheit); }
  function elemente() { return Z.mappe.bausteine.filter(function (k) { return k.geplant && vonEinheit(k); }); }
  function elementeVon(titel) { return elemente().filter(function (k) { return k.abschnitt === titel; }); }
  function kachelVon(titel) { return kacheln().filter(function (k) { return k.titel === titel; })[0] || null; }
  function themaTitel() {
    if (S.planStundeThema && S.planStundeThema()) return S.planStundeThema();    // AP13.40: Thema der Stunde
    return String((Z.mappe.einheit && Z.mappe.einheit.thema) || Z.mappe.titel || "").trim() || T("plan_kachel_neu", { n: 1 });
  }
  function freierTitel(wunsch, ausser) {
    var t = wunsch, n = 2;
    while (kacheln().some(function (k) { return k !== ausser && k.titel === t; })) { t = wunsch + " " + n; n += 1; }
    return t;
  }
  // `aufbau`: die Kachel trägt Karten eines Aufbaus (Vorlage, ältere Mappe); dann warnt der Plan wie bisher, wenn eine
  // Phase der Vorlage fehlt (gen/mappe.py planung)
  function neueKachel(titel, nach, aufbau) {
    var k = { titel: freierTitel(titel), text: "" };
    if (aufbau) k.aufbau = true;
    if (tag()) k.einheit = tag();
    var alle = Z.mappe.kacheln = Z.mappe.kacheln || [];
    var i = nach ? alle.indexOf(nach) + 1 : alle.length;
    alle.splice(i, 0, k);
    return k;
  }
  // Elemente der Einheit nach der Reihenfolge der Kacheln (der Text für den Chat gruppiert nach Folge); die übrigen
  // Karten bleiben an ihrem Platz
  function ordnen() {
    var liste = Z.mappe.bausteine, plaetze = [], eigene = [];
    liste.forEach(function (k, i) { if (k.geplant && vonEinheit(k)) { plaetze.push(i); eigene.push(k); } });
    var folge = [];
    kacheln().forEach(function (ka) { eigene.forEach(function (k) { if (k.abschnitt === ka.titel) folge.push(k); }); });
    eigene.forEach(function (k) { if (folge.indexOf(k) < 0) folge.push(k); });
    plaetze.forEach(function (p, j) { liste[p] = folge[j]; });
  }
  // §2: Karten ohne passende Kachel (ältere Mappe, Aufbau, „Bausteine ergänzen“) bekommen eine; ohne Abschnitt gehört
  // eine Karte zur Kachel der Karte davor (wie die Abschnitte im Text für den Chat), am Anfang zur Kachel mit dem Thema
  // (nie in eine leere Kachel der Lehrkraft).
  // -> true, wenn sich etwas geändert hat
  function sichern() {
    var geaendert_ = false, vorige = null;
    elemente().forEach(function (k) {
      var ka = k.abschnitt ? kachelVon(k.abschnitt) : null;
      if (!ka && k.abschnitt) { ka = neueKachel(k.abschnitt, vorige, true); geaendert_ = true; }
      if (!ka) {
        ka = vorige || kachelVon(themaTitel()) || neueKachel(themaTitel(), null, true);   // leere Kacheln bleiben leer
        k.abschnitt = ka.titel; geaendert_ = true;
      }
      vorige = ka;
    });
    if (geaendert_) ordnen();
    return geaendert_;
  }
  // Zweig gewechselt (schritte.js): nach „Ich steuere“ beginnt ein unberührter Aufbau als leerer Plan; zurück nach
  // „Mach du“ oder „Ich gebe die Richtung“ kommt der Aufbau wieder, wenn der Plan leer ist
  function planZweig(vorher, nachher) {
    if (!Z.mappe || vorher === nachher || Z.mappe.bausteine.some(function (k) { return !k.geplant && vonEinheit(k); })) return;
    var eigene = Z.mappe.bausteine.filter(function (k) { return vonEinheit(k); });
    if (nachher === "steuer") {
      var unberuehrt = !kacheln().length && eigene.every(function (k) { return k.geplant && !String(k.auftrag || "").trim() &&
          !k.herkunft; });
      if (unberuehrt) Z.mappe.bausteine = Z.mappe.bausteine.filter(function (k) { return !vonEinheit(k); });
      else sichern();
    } else if (vorher === "steuer" && !eigene.length) aufbauHolen();
  }
  // Karten des Aufbaus der Einheit (Vorlage aus Schritt 2 bzw. „Art der Einheit“), für die erste Einheit wie beim
  // Anlegen, für eine angehängte hinter der höchsten Nummer
  function aufbauHolen() {
    var e = Z.mappe.einheit || {}, v = S.vorlageNach(e.vorlage) || S.katalog.vorlagen[0];
    if (!tag()) { S.karteVorlage(v, true); return; }
    var karten = S.vorlageKarten(v, e.minuten || 45, S.naechsteNummer());
    karten.forEach(function (k) { k.einheit = tag(); });
    Z.mappe.bausteine = Z.mappe.bausteine.concat(karten);
  }
  // Hat die Lehrkraft im Plan etwas angelegt? Eine eigene Kachel, eine Beschreibung oder eine Änderung an einer Kachel
  // aus dem Aufbau (`bearbeitet`). Dann ersetzt keine Vorlage den Plan (schritte.js karteVorlage).
  function planBelegt() {
    return !!Z.mappe && kacheln().some(function (k) { return !k.aufbau || k.bearbeitet || String(k.text || "").trim(); });
  }
  function bearbeitet(ka) { if (ka) ka.bearbeitet = true; }
  function kachelVonKarte(k) { return k ? kachelVon(k.abschnitt) : null; }
  // jede andere Änderung nimmt „Rückgängig“ weg
  function aendern() {
    if (!rueck) return;
    rueck = null;
    Array.prototype.forEach.call(box.querySelectorAll(".plan-rueck"), function (x) { x.remove(); });
  }
  function rueckZeile() {
    return el("p", { cls: "plan-rueck", role: "status" }, [T("plan_geloescht", { titel: rueck.titel }) + " ",
      el("button", { type: "button", cls: "textlink", "data-aktion": "rueck", "data-fokus": "rueck", text: T("plan_rueckgaengig") })]);
  }

  function kachelZahl() {
    if (!planPhase()) return 0;
    var titel = [];
    elemente().forEach(function (k) { if (!k.aus && titel.indexOf(k.abschnitt) < 0) titel.push(k.abschnitt); });
    return titel.length;
  }

  // ---------------------------------------------------------------- Zeichnen
  function istAuto(typ) { return !typ || typ === AUTO; }
  function typName(typ) { return istAuto(typ) ? T("plan_auto") : S.formularname(typ); }
  function standardTitel(t) {
    return !t || t === T("plan_neues_element") || t === "Neuer Baustein" || S.katalog.typen.some(function (x) {
      return x.formularname === t; });
  }
  function typAuswahl(wert, label) {
    var s = el("select", { cls: "plan-el-typ", "aria-label": label });
    s.appendChild(el("option", { value: AUTO, text: T("plan_auto"), selected: istAuto(wert) }));
    var gesehen = {};
    (S.katalog.typgruppen || []).forEach(function (g) {
      var og = el("optgroup", { label: g.name });
      g.typen.forEach(function (t) { gesehen[t] = 1; og.appendChild(el("option", { value: t, text: S.formularname(t),
          selected: t === wert })); });
      s.appendChild(og);
    });
    var rest = S.katalog.typen.filter(function (t) { return !gesehen[t.typ] && ["Badge", "Unterabschnitt", "Banner"]
        .indexOf(t.typ) < 0; });
    if (rest.length) {
      var og = el("optgroup", { label: "Weitere" });
      rest.forEach(function (t) { og.appendChild(el("option", { value: t.typ, text: t.formularname, selected: t.typ === wert })); });
      s.appendChild(og);
    }
    if (!istAuto(wert) && !s.querySelector("option[value='" + CSS.escape(wert) + "']"))
      s.appendChild(el("option", { value: wert, text: S.formularname(wert), selected: true }));
    return s;
  }
  function optional(k) {
    var v = S.vorlageNach((Z.mappe.einheit || {}).vorlage);
    return !!(v && k.phase && v.phasen.some(function (p) { return p.optional && p.phase === k.phase; }));
  }

  // Fokus über ein Neuzeichnen hinweg: jedes bedienbare Element trägt `data-fokus`
  function fokusMerken() {
    var a = document.activeElement;
    if (!a || !box.contains(a) || !a.dataset.fokus) return null;
    var m = { schl: a.dataset.fokus };
    try { if (typeof a.selectionStart === "number") { m.a = a.selectionStart; m.b = a.selectionEnd; } } catch (e) { /* select */ }
    return m;
  }
  function fokusSetzen(schl, m) {
    var f = box.querySelector("[data-fokus='" + CSS.escape(schl) + "']");
    if (!f || !S.fokus([f], true)) return false;           // AP13.33: nur sichtbare, bedienbare Stellen
    if (m && typeof m.a === "number") { try { f.setSelectionRange(m.a, m.b); } catch (e) { /* kein Textfeld */ } }
    if (f.getBoundingClientRect) {
      var r = f.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight - 20) f.scrollIntoView({ block: "center" });
    }
    return true;
  }

  // Die Darstellung ist eine Radiogruppe (role=radiogroup, Knöpfe role=radio mit data-wert): Tab-Halt und Pfeiltasten
  // kommen aus kern.js (AP13.33, S.radioTabs), ein Pfeil klickt die nächste Kachel
  // AP13.35 §1.1: ein Feld des Plans hat den Fokus (Tippen, Tab zum nächsten Feld)? Dann ersetzt kein Neuzeichnen von
  // außen (Prüfung, Autosave, Text für den Chat) die Felder; was getippt ist, steht schon in der Mappe
  function tippt() {
    var a = document.activeElement;
    return !!(a && box.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && a.type !== "checkbox")));
  }
  function zeichnePlan(fokus) {
    var an = planPhase();
    box.hidden = !an;
    if (!an) { if ($("weiter-2")) $("weiter-2").disabled = false; return; }
    if (!S.katalog) return;
    if (sichern()) { S.autosave(); }
    var m = fokusMerken();
    box.textContent = "";
    box.append(beschreiben());
    var leiste = S.sequenzLeiste ? S.sequenzLeiste() : null;      // AP13.40: Stunden der Sequenz
    if (leiste) box.append(leiste);
    box.append(uebersicht());
    S.radioTabs();
    if (S.zeichnePlanung) S.zeichnePlanung();
    var aktiv = elemente().filter(function (k) { return !k.aus; }).length;
    $("weiter-2").disabled = !aktiv && !(S.sequenzOffen && S.sequenzOffen());   // AP13.40: den Plan macht der Chat
    summeZeigen();
    hinweiseSpaeter();
    if (fokus) fokusSetzen(fokus);
    else if (m) fokusSetzen(m.schl, m);
  }
  // AP13.35 §2.1: mit „Zeit selbst einteilen“ die Summe der Elemente neben der Dauer der Einheit. Haben alle Elemente
  // Minuten, gilt ihre Summe im Text für den Chat (gen/prompt.py einheit_zeit): gelb über 10 % neben der Dauer. Sonst
  // verteilt die Mühle den Rest (neutral); gelb nur, wenn die vergebenen Minuten die Dauer schon überschreiten
  function summeZeigen() {
    var p = box.querySelector("#plan-summe"); if (!p) return;
    var soll = parseInt((Z.mappe.einheit || {}).minuten, 10) || 0, summe = 0, offen = 0;
    var zaehlen = elemente().filter(function (k) { return !k.aus && S.mitMinuten(k.typ); });
    zaehlen.forEach(function (k) { var m = parseInt(k.soll, 10) || 0; summe += m; if (!m) offen += 1; });
    p.hidden = !zaehlen.length;                    // ohne Element gibt es nichts zu zählen
    // AP13.41 §3.2: über der Dauer immer gelb, mit dem Satz, dass Schritt 5 mit der Dauer rechnet
    var ueber = !!soll && summe > soll;
    p.textContent = offen ? T("plan_summe_rest", { summe: summe }) : ueber ? T("plan_summe_ueber", { summe: summe, minuten: soll })
        : T("plan_summe", { summe: summe, minuten: soll });
    p.classList.toggle("warn", ueber || (!!soll && !offen && Math.abs(summe - soll) > soll * 0.1));
  }

  function beschreiben() {
    var feld = el("textarea", { id: "plan-beschreibung", cls: "von-lehrkraft", rows: "3", maxlength: "600", spellcheck: "true",
        "data-fokus": "beschreibung" });
    // AP13.35 §1.2: je Einheit (S.kontextJetzt). AP13.37 §2.1: das Feld beginnt leer; das Thema steht nur als Platzhalter
    // darin (getippter Text hing sonst ohne Leerzeichen an das Thema)
    feld.value = S.kontextJetzt() || "";
    var th = String((Z.mappe.einheit && Z.mappe.einheit.thema) || "").trim();
    if (th) feld.placeholder = th;
    var hue = S.akzent ? S.akzent() : "#1D5FD1", format = S.angaben.format || "themen";
    var wahl = el("div", { cls: "ed-darstellung", role: "radiogroup", "aria-labelledby": "plan-darstellung-t" },
        S.katalog.oberflaeche.format.map(function (w) {
      var b = el("button", { type: "button", cls: "ed-format-wahl", role: "radio", "aria-checked": String(w.wert === format),
          "data-aktion": "darstellung", "data-wert": w.wert, "data-fokus": "format:" + w.wert });
      var mini = el("span", { cls: "ed-format-mini", "aria-hidden": "true" });
      mini.innerHTML = S.miniFormat(w.wert, hue);                    // eigenes SVG (schritte.js), keine Eingabe
      b.append(mini, el("span", { text: w.text }));
      return b;
    }));
    return el("div", { cls: "plan-beschreiben" }, [
      tag() && S.kursZeile ? S.kursZeile() : null,            // AP13.35 M1: ab Einheit 2 die Kursbeschreibung
      el("label", { cls: "feld feld-breit" }, [T("plan_beschreiben"),
        el("span", { cls: "feld-zeile", text: T("plan_beschreiben_zeile") }), feld]),
      el("div", { cls: "ed-darstellung-l plan-darstellung" }, [el("span", { cls: "ed-darstellung-t", id: "plan-darstellung-t",
          text: T("darstellung") }), wahl])]);
  }

  function uebersicht() {
    var format = S.angaben.format || "themen", quer = format === "kacheln" || format === "einthemen";
    var liste = kacheln(), nr = 0;
    var raster = el("div", { cls: "plan-kacheln plan-f-" + format });
    liste.forEach(function (ka, i) {
      var els = elementeVon(ka.titel);
      raster.appendChild(kachel(ka, i, liste.length, els, quer, format, function () { return ++nr; }));
    });
    var leer = !liste.length && !elemente().length;
    if (!leer) {                // AP13.39: im leeren Plan steht „Leer beginnen“ statt „+ Kachel“ (dieselbe Aktion)
      raster.appendChild(el("button", { type: "button", cls: "plan-k-plus", "data-aktion": "k-plus", "data-fokus": "k-plus" }, [
        el("span", { cls: "plan-plus", "aria-hidden": "true", text: "+" }), el("span", { text: T("plan_kachel_plus").replace(/^\+\s*/, "") })]));
      raster.lastChild.setAttribute("aria-label", T("plan_kachel_plus").replace(/^\+\s*/, ""));
    }
    var zeit = el("input", { type: "checkbox", id: "plan-zeit", "data-fokus": "zeit", checked: S.zeitSelbst() });
    var teile = [el("h3", { cls: "unterkopf", text: T("uebersicht") }),
      el("p", { cls: "leise plan-zeile", text: T("plan_zeile") }),
      el("label", { cls: "schalter plan-zeit" }, [zeit, T("plan_zeit"), el("span", { cls: "feld-zeile", text: T("plan_zeit_zeile") })])];
    if (S.zeitSelbst()) teile.push(el("p", { id: "plan-summe", cls: "plan-summe", role: "status" }));
    if (leer) teile.push(anfang());
    // AP13.39: Warnung der Planung über dem Plan (Text: chat.js zeichnePlanung), mit „Fehlende Phase ergänzen“; ohne
    // role=status (sie wird bei jedem Neuzeichnen neu gebaut), angesagt wird sie über #plan-status (index.html)
    teile.push(el("div", { id: "plan-warnung", cls: "karten-warnung plan-warnung", hidden: true }, [
      el("span", { id: "plan-warnung-text" }),
      el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "auffuellen", "data-fokus": "auffuellen",
          text: T("plan_phase_ergaenzen") })]));
    if (rueck && (rueck.art === "kachel" || !kachelVon(rueck.kachel))) teile.push(rueckZeile());
    teile.push(raster);
    if (!elemente().filter(function (k) { return !k.aus; }).length)
      teile.push(el("p", { cls: "leise plan-hinweis", role: "status", text: T("plan_ohne_element") }));
    return el("div", { cls: "plan-uebersicht" }, teile);
  }

  // AP13.39: Art der Einheit (Radiogruppe wie die Darstellung, Phasenfolge als Zeile) und die zwei Anfänge
  function anfang() {
    var gewaehlt = (S.vorlageNach((Z.mappe.einheit || {}).vorlage) || S.katalog.vorlagen[0]).name;
    var wahl = el("div", { cls: "kacheln-wahl breit plan-arten", role: "radiogroup", "aria-labelledby": "plan-art-t" },
        S.katalog.vorlagen.filter(S.vorlageSichtbar).map(function (v) {
      return el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": String(v.name === gewaehlt),
          "data-aktion": "art", "data-wert": v.name, "data-fokus": "art:" + v.name }, [
        el("span", { cls: "aus-name", text: v.name }),
        el("span", { cls: "aus-zeile", text: v.phasen.map(function (p) { return p.phase; }).join(" · ") })]);
    }));
    return el("div", { cls: "plan-anfang" }, [
      el("p", { cls: "plan-leer", text: T("plan_leer") }),
      el("span", { cls: "ed-darstellung-t", id: "plan-art-t", text: T("plan_art") }), wahl,
      el("div", { cls: "plan-anfang-knoepfe" }, [
        el("button", { type: "button", cls: "knopf haupt", "data-aktion": "vorschlag", "data-fokus": "vorschlag",
            text: T("plan_nach_phasen") }),
        el("button", { type: "button", cls: "knopf", "data-aktion": "k-plus", "data-fokus": "leer", text: T("plan_leer_beginnen") })])]);
  }

  function kachel(ka, i, n, els, quer, format, zaehle) {
    var titel = el("input", { type: "text", cls: "plan-k-titel", maxlength: "120", "data-nr": String(i), "data-fokus": "kt:" + i,
        "aria-label": T("plan_kachel_titel"), placeholder: T("plan_kachel_titel"), autocomplete: "off" });
    titel.value = ka.titel;
    var text = el("textarea", { cls: "plan-k-text von-lehrkraft", rows: "2", maxlength: "600", "data-fokus": "kx:" + i,
        placeholder: T("plan_kachel_text_platzhalter") });
    text.value = ka.text || "";
    var ol = el("ol", { cls: "plan-elemente" });
    els.forEach(function (k, j) { ol.appendChild(element(k, j, els.length, zaehle)); });
    var kopf = el("div", { cls: "plan-k-kopf" }, [
      format === "wochen" ? el("span", { cls: "plan-k-woche", text: "Woche " + (i + 1) }) : null,
      titel]);
    // AP13.35 §1.1: die Pfeile stehen hinter „Was soll hier rein?“ und den Elementen. Zwischen Titel und Text fing ein Tab
    // den Pfeil, und die Leertaste im getippten Satz schob die Kachel nach oben (Erkundung e4, Befund 1)
    var pfeile = el("span", { cls: "plan-k-pfeile" }, [
        el("button", { type: "button", cls: "klein", "data-aktion": "k-hoch", "data-fokus": "kh:" + i, disabled: i === 0,
            "aria-label": (quer ? T("links") : T("hoch")) + ": " + ka.titel, title: quer ? T("links") : T("hoch"), text: quer ? "←" : "↑" }),
        el("button", { type: "button", cls: "klein", "data-aktion": "k-runter", "data-fokus": "kr:" + i, disabled: i === n - 1,
            "aria-label": (quer ? T("rechts") : T("runter")) + ": " + ka.titel, title: quer ? T("rechts") : T("runter"),
            text: quer ? "→" : "↓" })]);
    var kinder = [kopf,
      el("label", { cls: "feld plan-k-text-l" }, [T("plan_kachel_text"), text]),
      els.length ? ol : el("p", { cls: "plan-k-leer leise" }, [T("plan_kachel_leer") + " ",
        el("button", { type: "button", cls: "textlink", "data-aktion": "k-loeschen", "data-fokus": "kl:" + i,
            "aria-label": T("plan_loeschen") + ": " + ka.titel, text: T("plan_loeschen") })])];
    if (rueck && rueck.art === "element" && rueck.kachel === ka.titel) kinder.push(rueckZeile());
    kinder.push(el("div", { cls: "plan-k-fuss" }, [el("button", { type: "button", cls: "knopf klein-knopf plan-el-plus",
        "data-aktion": "el-plus", "data-fokus": "ep:" + i, "aria-label": T("plan_element_plus").replace(/^\+\s*/, "") + ": " +
        ka.titel, text: T("plan_element_plus") }), pfeile]));
    return el("section", { cls: "plan-kachel", "data-nr": String(i), role: "group", "aria-label": T("plan_kachel") + ": " + ka.titel },
        kinder);
  }

  function element(k, j, n, zaehle) {
    var auf = offen === k.id, nr = k.aus ? "–" : String(zaehle());
    var minuten = S.zeitSelbst() && S.mitMinuten(k.typ) && k.soll ? k.soll + " min" : "";
    var zeile = el("button", { type: "button", cls: "plan-el-zeile", "data-aktion": "el-auf", "data-fokus": "el:" + k.id,
        "aria-expanded": String(auf) }, [
      el("span", { cls: "plan-el-nr", text: nr }),
      el("span", { cls: "plan-el-text" }, [
        el("span", { cls: "plan-el-kopf" }, [phaseZeile(k), el("span", { cls: "plan-el-typ-t", text: typName(k.typ) }),
          el("span", { cls: "plan-el-titel-t", text: standardTitel(k.titel) ? "" : k.titel }), minuten ? el("span", { cls: "plan-el-min-t", text: minuten }) : null]),
        k.auftrag && String(k.auftrag).trim() ? el("span", { cls: "plan-el-satz-t", text: k.auftrag }) : null])]);
    var li = el("li", { cls: "plan-el" + (auf ? " offen" : "") + (k.aus ? " aus" : ""), "data-id": k.id }, [zeile]);
    var oz = ohneZeit(k);
    if (oz) li.appendChild(el("p", { cls: "plan-el-ohne-zeit leise", text: oz }));
    if (hinweise[k.id]) li.appendChild(el("p", { cls: "plan-el-hinweis", text: hinweise[k.id] }));
    if (auf) li.appendChild(formular(k, j, n));
    return li;
  }
  // AP13.41 §3.1: Typen ohne Zeit (Glossar, Forum …) sagen das am Element; Minuten von vorher bleiben gespeichert und
  // zählen sichtbar nicht (Summe, Text für den Chat), bis ein Typ mit Zeit gewählt ist
  function ohneZeit(k) {
    if (S.mitMinuten(k.typ) || k.aus) return "";
    return S.zeitSelbst() && parseInt(k.soll, 10) > 0 ? T("plan_ohne_zeit_min", { n: parseInt(k.soll, 10) }) : T("plan_ohne_zeit");
  }
  // AP13.41 §2.1: nennt der Auftrag weniger als das Mindestmaß des Typs, gelb am Element (gen/prompt.py plan_hinweise;
  // Text und Prüfung nehmen die Zahl des Auftrags). Nachgezogen nach jeder Änderung, ohne Neuzeichnen
  var hinweise = {}, hinweisTimer = null;
  function hinweiseSpaeter() {
    clearTimeout(hinweisTimer);
    hinweisTimer = setTimeout(async function () {
      if (!Z.mappe || !planPhase()) return;
      var m = Z.mappe, h;
      try { h = await km.prompt("plan_hinweise", [m]); } catch (e) { return; }
      if (m !== Z.mappe) return;
      hinweise = h || {};
      Array.prototype.forEach.call(box.querySelectorAll(".plan-el"), function (li) {
        var p = li.querySelector(".plan-el-hinweis"), t = hinweise[li.dataset.id] || "";
        if (!t) { if (p) p.remove(); return; }
        if (!p) { p = el("p", { cls: "plan-el-hinweis" }); li.insertBefore(p, li.querySelector(".plan-el-form")); }
        if (p.textContent !== t) p.textContent = t;
      });
    }, 300);
  }

  function phaseZeile(k) {
    var ph = String(k.phase || "").trim();
    return ph ? el("span", { cls: "plan-el-phase-t", text: ph }) : null;
  }

  function formular(k, j, n) {
    var id = k.id, name = k.titel || typName(k.typ);
    var titel = el("input", { type: "text", cls: "plan-el-titel von-lehrkraft", "data-herkunft": "lehrkraft", maxlength: "120",
        "data-fokus": "et:" + id, autocomplete: "off", placeholder: T("plan_titel_platzhalter") });
    titel.value = k.titel === T("plan_neues_element") ? "" : k.titel || "";     // AP13.41 §2.3: alte Mappen
    var satz = el("textarea", { cls: "plan-el-satz von-lehrkraft", rows: "2", maxlength: "600", "data-fokus": "es:" + id,
        placeholder: T("plan_satz_platzhalter") });
    satz.value = k.auftrag || "";
    var typ = typAuswahl(k.typ, T("plan_typ") + ": " + name);
    typ.dataset.fokus = "ey:" + id;
    var phase = el("input", { type: "text", cls: "plan-el-phase", list: "phasen", maxlength: "60", "data-fokus": "eph:" + id,
        autocomplete: "off", placeholder: T("plan_auto") });
    phase.value = k.phase || "";
    var teile = [el("div", { cls: "plan-el-reihe" }, [
        el("label", { cls: "feld" }, [T("plan_typ"), typ]),
        el("label", { cls: "feld plan-el-titel-l" }, [T("plan_titel"), titel]),
        el("label", { cls: "feld plan-el-phase-l" }, [T("plan_phase"), phase])]),
      el("label", { cls: "feld" }, [T("plan_satz"), satz])];
    if (S.zeitSelbst() && S.mitMinuten(k.typ)) {
      var min = el("input", { type: "number", cls: "plan-el-min", min: "0", max: "300", inputmode: "numeric", "data-fokus": "em:" + id });
      min.value = k.soll === null || k.soll === undefined ? "" : String(k.soll);
      teile.push(el("label", { cls: "feld plan-el-min-l" }, [T("plan_minuten"), min]));
    }
    if (k.aus || optional(k)) teile.push(el("label", { cls: "schalter plan-el-an-l" }, [el("input", { type: "checkbox",
        cls: "plan-el-an", "data-fokus": "ea:" + id, checked: !k.aus }), T("plan_freiwillig")]));
    var alle = kacheln();
    if (alle.length > 1) {
      var sel = el("select", { cls: "plan-el-kachel", "data-fokus": "ek:" + id, "aria-label": T("in_kachel") + ": " + name });
      var zahl = {};
      alle.forEach(function (a) { zahl[a.titel] = (zahl[a.titel] || 0) + 1; });
      alle.forEach(function (a, i) { sel.appendChild(el("option", { value: String(i), text: a.titel, selected: a.titel === k.abschnitt })); });
      teile.push(el("label", { cls: "ed-in-kachel-l plan-el-kachel-l" }, [el("span", { "aria-hidden": "true", text: T("in_kachel") }), sel]));
    }
    teile.push(el("div", { cls: "ed-knoepfe plan-el-knoepfe" }, [
      el("button", { type: "button", cls: "klein", "data-aktion": "el-hoch", "data-fokus": "eh:" + id, disabled: j === 0,
          "aria-label": T("plan_element_hoch") + ": " + name, title: T("plan_element_hoch"), text: "↑" }),
      el("button", { type: "button", cls: "klein", "data-aktion": "el-runter", "data-fokus": "er:" + id, disabled: j === n - 1,
          "aria-label": T("plan_element_runter") + ": " + name, title: T("plan_element_runter"), text: "↓" }),
      el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "el-loeschen", "data-fokus": "el-weg:" + id,
          "aria-label": T("plan_loeschen") + ": " + name, text: T("plan_loeschen") }),
      el("button", { type: "button", cls: "knopf klein-knopf haupt", "data-aktion": "el-zu", "data-fokus": "ez:" + id,
          text: T("plan_fertig") })]));
    return el("div", { cls: "plan-el-form", role: "group", "aria-label": T("plan_element") + ": " + name }, teile);
  }

  // ---------------------------------------------------------------- Bedienung
  function karteVon(t) { var li = t.closest(".plan-el"); return li ? S.karteNach(li.dataset.id) : null; }
  function kachelNr(t) { var s = t.closest(".plan-kachel"); return s ? parseInt(s.dataset.nr, 10) : -1; }
  function fertig(fokus) { zeichnePlan(fokus); S.geaendert(); }
  function zuMappe() { return S.zeichne(); }

  function vertauschen(liste, a, b) { var x = liste[a]; liste[a] = liste[b]; liste[b] = x; }
  function neuesElement(ka) {
    var k = { id: "b" + S.naechsteNummer(), typ: AUTO, titel: "", abschnitt: ka.titel, minuten: null,       // AP13.41 §2.3
      auftrag: "", phase: "", soll: null, geplant: true, neu: false };
    if (tag()) k.einheit = tag();
    var els = elementeVon(ka.titel), liste = Z.mappe.bausteine;
    var nach = els.length ? liste.indexOf(els[els.length - 1]) + 1 : -1;
    if (nach < 0) {           // erste in dieser Kachel: hinter die Elemente der Kacheln davor
      var davor = [];
      kacheln().some(function (x) { if (x === ka) return true; davor = davor.concat(elementeVon(x.titel)); return false; });
      nach = davor.length ? liste.indexOf(davor[davor.length - 1]) + 1 : (function () {
        var erste = liste.findIndex(function (x) { return x.geplant && vonEinheit(x); });
        return erste >= 0 ? erste : liste.length; })();
    }
    liste.splice(nach, 0, k);
    ordnen();
    return k;
  }
  // AP13.35 §1.1: der Titel geht beim Tippen in die Mappe (leer oder doppelt: der letzte gültige bzw. „Titel 2“); kein
  // Neuzeichnen, das das Feld mit dem Fokus oder das nächste Feld ersetzt. Beim Verlassen und mit Enter zeigt das Feld
  // den Titel, der gilt; Beschriftungen und die Auswahl „In Kachel“ ziehen ohne Neuzeichnen nach
  function kachelUmbenennen(feld, fertig) {
    var i = parseInt(feld.dataset.nr, 10), ka = kacheln()[i]; if (!ka) return;
    var t = feld.value.replace(/\s+/g, " ").trim();
    if (t && t !== ka.titel) {
      t = freierTitel(t, ka);
      if (t !== ka.titel) {
        elementeVon(ka.titel).forEach(function (k) { k.abschnitt = t; });
        ka.titel = t;
        bearbeitet(ka);
        titelZeigen();
        S.geaendert();
      }
    }
    if (fertig && feld.value !== ka.titel) feld.value = ka.titel;
  }
  function titelZeigen() {
    var alle = kacheln();
    Array.prototype.forEach.call(box.querySelectorAll(".plan-kachel"), function (sec) {
      var ka = alle[parseInt(sec.dataset.nr, 10)]; if (!ka) return;
      sec.setAttribute("aria-label", T("plan_kachel") + ": " + ka.titel);
      [["[data-aktion=el-plus]", T("plan_element_plus").replace(/^\+\s*/, "")], ["[data-aktion=k-loeschen]", T("plan_loeschen")],
       ["[data-aktion=k-hoch]", null], ["[data-aktion=k-runter]", null]].forEach(function (x) {
        var b = sec.querySelector(x[0]); if (!b) return;
        b.setAttribute("aria-label", (x[1] || b.getAttribute("title")) + ": " + ka.titel);
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll(".plan-el-kachel option"), function (o) {
      var ka = alle[parseInt(o.value, 10)]; if (ka && o.textContent !== ka.titel) o.textContent = ka.titel;
    });
  }

  box.addEventListener("input", function (ev) {
    var t = ev.target, c = t.classList;
    aendern();
    if (t.id === "plan-beschreibung") {
      S.kontextSetzen(t.value);
      return;
    }
    if (c.contains("plan-k-titel")) { kachelUmbenennen(t, false); return; }
    if (c.contains("plan-k-text")) { var ka = kacheln()[kachelNr(t)]; if (ka) { ka.text = t.value; bearbeitet(ka); S.geaendert(); }
      return; }
    var k = karteVon(t); if (!k) return;
    bearbeitet(kachelVonKarte(k));
    if (c.contains("plan-el-titel")) {
      k.titel = t.value.replace(/\s+/g, " ").trim();          // AP13.41 §2.3: leer = der Chat wählt den Titel
      k.herkunft = { titel: "lehrkraft" };                  // wie ein Titel der Lehrkraft an der Karte
    }
    else if (c.contains("plan-el-satz")) k.auftrag = t.value;
    else if (c.contains("plan-el-min")) k.soll = t.value === "" ? null : Math.max(0, Math.min(300, parseInt(t.value, 10) || 0));
    else if (c.contains("plan-el-phase")) k.phase = t.value;
    else return;
    S.geaendert();
    if (c.contains("plan-el-satz")) hinweiseSpaeter();
    // die Zeile des Elements zeigt Titel und Satz mit (ohne Neuzeichnen, der Fokus bleibt im Feld)
    var li = t.closest(".plan-el");
    var tt = li.querySelector(".plan-el-titel-t"); if (tt) tt.textContent = standardTitel(k.titel) ? "" : k.titel;
    var st = li.querySelector(".plan-el-satz-t");
    if (String(k.auftrag || "").trim()) {
      if (!st) { st = el("span", { cls: "plan-el-satz-t" }); li.querySelector(".plan-el-text").appendChild(st); }
      st.textContent = k.auftrag;
    } else if (st) st.remove();
    if (c.contains("plan-el-phase")) {          // AP13.39: die Phase klein vor dem Typ zieht mit
      var pt = li.querySelector(".plan-el-phase-t"), neuP = phaseZeile(k);
      if (pt && neuP) pt.textContent = neuP.textContent;
      else if (pt) pt.remove();
      else if (neuP) li.querySelector(".plan-el-kopf").prepend(neuP);
    }
    var mt = li.querySelector(".plan-el-min-t");
    if (c.contains("plan-el-min")) {
      if (k.soll && !mt) { mt = el("span", { cls: "plan-el-min-t" }); li.querySelector(".plan-el-kopf").appendChild(mt); }
      if (mt) { if (k.soll) mt.textContent = k.soll + " min"; else mt.remove(); }
      summeZeigen();
    }
  });

  box.addEventListener("change", function (ev) {
    var t = ev.target, c = t.classList;
    aendern();
    if (t.id === "plan-zeit") { Z.mappe.zeit_selbst = t.checked; fertig("zeit"); return; }
    if (c.contains("plan-k-titel")) { kachelUmbenennen(t, true); return; }
    var k = karteVon(t); if (!k) return;
    bearbeitet(kachelVonKarte(k));
    if (c.contains("plan-el-typ")) {
      var alt = k.typ;
      k.typ = t.value;
      // AP13.41 §2.3: ein Titel, den die Mühle gesetzt hat, fällt weg (der Chat wählt ihn); den der Lehrkraft behält sie
      if (standardTitel(k.titel) || k.titel === S.formularname(alt)) k.titel = "";
      fertig("ey:" + k.id);
    } else if (c.contains("plan-el-phase")) {
      var ph = t.value.replace(/\s+/g, " ").trim();
      if (ph !== k.phase) { k.phase = ph; S.geaendert(); }
      if (t.value !== ph) t.value = ph;
    } else if (c.contains("plan-el-an")) {
      if (t.checked) delete k.aus; else k.aus = true;
      fertig("ea:" + k.id);
    } else if (c.contains("plan-el-kachel")) {
      var ziel = kacheln()[parseInt(t.value, 10)]; if (!ziel || ziel.titel === k.abschnitt) return;
      // ans Ende der gewählten Kachel (wie „In Kachel …“ im Editor)
      var liste = Z.mappe.bausteine;
      liste.splice(liste.indexOf(k), 1);
      k.abschnitt = ziel.titel;
      bearbeitet(ziel);
      liste.push(k);
      ordnen();
      fertig("ek:" + k.id);
    }
  });

  box.addEventListener("keydown", function (ev) {
    var t = ev.target;
    if (ev.key === "Enter" && t.classList.contains("plan-k-titel")) { ev.preventDefault(); kachelUmbenennen(t, true); return; }
    if (ev.key === "Escape") {
      var li = t.closest && t.closest(".plan-el.offen");
      if (li) { ev.preventDefault(); ev.stopPropagation(); offen = null; zeichnePlan("el:" + li.dataset.id); }
      return;
    }
  });

  box.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-aktion]"); if (!b || b.disabled) return;
    var a = b.dataset.aktion, liste = Z.mappe.bausteine;
    if (["el-auf", "el-zu", "rueck"].indexOf(a) < 0) aendern();
    if (a === "darstellung") {
      var w = b.dataset.wert;
      if (S.angaben.format !== w) { S.angaben.format = w; S.angabenSchreiben({ format: w }); }
      zeichnePlan("format:" + w);
      return;
    }
    if (a === "art") {             // AP13.39: Art der Einheit im leeren Plan; Elemente entstehen erst mit „Nach Phasen beginnen“
      var va = S.vorlageNach(b.dataset.wert), ea = Z.mappe.einheit = Z.mappe.einheit || {};
      if (!va) return;
      if (ea.vorlage !== va.name) {
        ea.vorlage = va.name;
        ea.vorlage_selbst = true;                          // wie die Wahl in „Ich gebe die Richtung“ (AP13.24)
        var vw = S.vorschlagWeg && S.vorschlagWeg("vorlage");
        zuMappe(); S.geaendert(); if (vw) S.angabenSchreiben(vw);
      }
      // Korrektur AP13.39: der Fokus bleibt in der Radiogruppe (Pfeile, Pos1, Ende); fehlt Material, springt erst
      // „Nach Phasen beginnen“ ins Materialfeld
      fokusSetzen("art:" + va.name);
      return;
    }
    if (a === "auffuellen") {      // AP13.39: derselbe Weg wie „Vorlage auffüllen“ (chat.js, gen/mappe.py auffuellen)
      var da = {};
      Z.mappe.bausteine.forEach(function (x) { da[x.id] = 1; });
      Promise.resolve(S.auffuellen && S.auffuellen()).then(function () {
        var neuE = elemente().filter(function (x) { return !da[x.id]; })[0];
        if (neuE) fokusSetzen("el:" + neuE.id);
      });
      return;
    }
    if (a === "vorschlag") {
      aufbauHolen(); S.typenUebernehmen(); sichern();
      var erste = elemente()[0];
      zuMappe(); S.geaendert();
      // „Einheit aus eigenem Material“ ohne Material: weiter im Feld dafür (wie früher die Wahl dieser Vorlage)
      if (S.materialFehlt()) S.materialZeigen(false);
      else if (erste) fokusSetzen("el:" + erste.id);
      return;
    }
    if (a === "k-plus") {
      var ka = neueKachel(T("plan_kachel_neu", { n: kacheln().length + 1 }), null);
      fertig("kt:" + kacheln().indexOf(ka));
      var f = box.querySelector("[data-fokus='kt:" + kacheln().indexOf(ka) + "']"); if (f) f.select();
      return;
    }
    if (a === "rueck") {
      // nur das Gelöschte kommt an seine Stelle zurück; was danach geändert wurde, bleibt
      var r = rueck; if (!r) return;
      rueck = null;
      if (r.art === "kachel") {
        var gl = Z.mappe.kacheln = Z.mappe.kacheln || [];
        r.kachel.titel = freierTitel(r.kachel.titel);
        gl.splice(Math.min(r.index, gl.length), 0, r.kachel);
        ordnen();
        fertig("kt:" + kacheln().indexOf(r.kachel));
        return;
      }
      var nach = r.nach ? liste.findIndex(function (x) { return x.id === r.nach; }) : -1;
      liste.splice(nach >= 0 ? nach + 1 : Math.min(r.index, liste.length), 0, r.karte);
      ordnen();
      bearbeitet(kachelVonKarte(r.karte));
      fertig("el:" + r.karte.id);
      return;
    }
    var i = kachelNr(b), alle = kacheln(), kaB = alle[i];
    if (a === "k-hoch" || a === "k-runter") {
      var j = a === "k-hoch" ? i - 1 : i + 1; if (!kaB || j < 0 || j >= alle.length) return;
      var gl = Z.mappe.kacheln;
      vertauschen(gl, gl.indexOf(alle[i]), gl.indexOf(alle[j]));
      bearbeitet(alle[i]); bearbeitet(alle[j]);
      ordnen();
      zeichnePlan();
      S.geaendert();
      if (!fokusSetzen((a === "k-hoch" ? "kh:" : "kr:") + j)) fokusSetzen("kt:" + j);
      return;
    }
    if (a === "k-loeschen") {
      if (!kaB || elementeVon(kaB.titel).length) return;
      rueck = { art: "kachel", kachel: kaB, index: Z.mappe.kacheln.indexOf(kaB), titel: kaB.titel };
      Z.mappe.kacheln.splice(Z.mappe.kacheln.indexOf(kaB), 1);
      fertig("rueck");
      return;
    }
    if (a === "el-plus") {
      if (!kaB) return;
      bearbeitet(kaB);
      var neu = neuesElement(kaB);
      offen = neu.id;
      fertig("ey:" + neu.id);
      return;
    }
    var k = karteVon(b); if (!k) return;
    if (a === "el-auf") { offen = offen === k.id ? null : k.id; zeichnePlan(offen ? "ey:" + k.id : "el:" + k.id); return; }
    if (a === "el-zu") { offen = null; zeichnePlan("el:" + k.id); return; }
    if (a === "el-hoch" || a === "el-runter") {
      var els = elementeVon(k.abschnitt), p = els.indexOf(k), q = a === "el-hoch" ? p - 1 : p + 1;
      if (q < 0 || q >= els.length) return;
      vertauschen(liste, liste.indexOf(k), liste.indexOf(els[q]));
      bearbeitet(kachelVonKarte(k));
      zeichnePlan();
      S.geaendert();
      if (!fokusSetzen((a === "el-hoch" ? "eh:" : "er:") + k.id)) fokusSetzen("ey:" + k.id);
      return;
    }
    if (a === "el-loeschen") {
      var pos = liste.indexOf(k);
      rueck = { art: "element", karte: k, nach: pos > 0 ? liste[pos - 1].id : null, index: pos,
        titel: standardTitel(k.titel) ? typName(k.typ) : k.titel, kachel: k.abschnitt };
      bearbeitet(kachelVonKarte(k));
      liste.splice(pos, 1);
      if (offen === k.id) offen = null;
      fertig("rueck");
    }
  });

  S.planPhase = planPhase;
  S.planBelegt = planBelegt;
  S.planZweig = planZweig;
  S.planKachelZahl = kachelZahl;
  S.zeichnePlan = function () {
    if (planPhase() && tippt()) { box.hidden = false; summeZeigen(); return; }    // AP13.35 §1.1
    zeichnePlan();
  };
})();
