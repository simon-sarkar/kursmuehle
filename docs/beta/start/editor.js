/* Kursmühle – Ansicht „Einheit ansehen und bearbeiten“ (AP13.11, Editor Stufe A).
 *
 * Eine Fläche über der Schrittfolge (<dialog> mit showModal: Fokusfalle, Esc, Fokus kehrt zurück). Die Vorschau kommt
 * aus dem Generator (gen/api.einheit_vorschau, ein Pyodide-Aufruf für alle Bausteine); die Seite tauscht nur Knoten, deren
 * HTML sich geändert hat. Jeder Baustein steht in einem Shadow Root auf weißer Fläche, Seiten-CSS und Dunkelschema
 * bleiben draußen; Bilder bekommen ihre Adresse aus S.vorschauUrl (bilder.js). Bearbeiten und „Neu schreiben lassen“
 * laufen über die Wege der Karten (karten.js: handUebernehmen, korrekturText, korrekturEinsetzen); hier steht nur die
 * Oberfläche. Wortlaut aus katalog.yaml oberflaeche.editor (S.editorText). */
"use strict";

(function () {
  if (!document.getElementById("editor")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, el = S.el;
  function T(k, w) { return S.editorText(k, w); }
  var dlg = $("editor");
  var offenVon = null;          // Knopf, der die Ansicht geöffnet hat
  var knoten = {};              // id -> {el, kopf, koerper, werk, neu, sig}
  var abschnittKnoten = {};     // Schlüssel -> <h3>
  var bearbeiten = {};          // id -> {text, meldungen}: offenes Textfeld
  var neuOffen = {};            // id -> true: Teil „Neu schreiben lassen“ offen
  var neuText = {};             // id -> Text für den Chat, vorbereitet (Kopieren in der Geste, Safari)
  var stand = null, standSig = "", lauf = 0, timer = null, pruefTimer = {}, wunschTimer = null, bilderSig = "";
  var UE = "uebersicht", ueZiel = null;      // §9: Kursübersicht als erster Eintrag; offenes Formular („kopf“, „abschnitt:n“)
  var hilfe = {};               // typ -> [Zeile] (prompt.format_hilfe)
  var BREIT = window.matchMedia ? matchMedia("(min-width: 1100px)") : { matches: true };
  // Platzhalter für ein Bild, das noch nicht hochgeladen ist (hellgrau wie in der Sicherung)
  var BILD_FEHLT = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" ' +
      'height="400"><rect width="640" height="400" fill="#e5e7eb"/></svg>');
  // Grundstil im Shadow Root: Schrift und Fläche wie auf der Kursseite der Plattform; nichts ist anklickbar
  var SCHATTEN_CSS = [
    ":host { display: block; }",
    ".km-ed-inhalt { background: #ffffff; color: #1d2125; font: 15px/1.5 system-ui, -apple-system, \"Segoe UI\", Roboto, " +
        "sans-serif; padding: 14px 18px; border-radius: 8px; overflow-wrap: anywhere; pointer-events: none; " +
        "color-scheme: light; }",
    ".km-ed-inhalt img { max-width: 100%; height: auto; }",
    ".km-ed-inhalt table { max-width: 100%; }",
    ".km-ed-inhalt .km-nojs { display: none; }",
    ".km-ed-inhalt [data-ziel], .km-ed-inhalt [data-aktion] { pointer-events: auto; }",
    ".km-vorschau-video { background: #eef0f3; color: #4b5563; padding: 28px 16px; text-align: center; border-radius: 6px; }"
  ].join("\n");

  function sichtbar() { return !!(Z.mappe && Z.pruefung && Z.pruefung.bausteine && Z.pruefung.bausteine.length); }
  function karte(id) { return S.karteNach(id); }
  function pruef(id) { return Z.pruefung ? Z.pruefung.bausteine.filter(function (b) { return b.id === id; })[0] : null; }
  function ki() { return !!(S.anKiAktiv && S.anKiAktiv()); }

  function knoepfeZeigen() {
    var da = sichtbar();
    ["editor-auf", "editor-auf-2"].forEach(function (id) {
      var b = $(id); b.hidden = !da;
      if (S.katalog) b.textContent = T("knopf");
    });
  }

  // ---------------------------------------------------------------- Öffnen, Schließen, Esc
  function oeffnen(von) {
    if (!sichtbar()) return;
    offenVon = von || null;
    $("editor-titel").textContent = T("titel");
    $("editor-zu").setAttribute("aria-label", T("schliessen"));
    $("editor-zu").title = T("schliessen");
    $("editor-liste-titel").textContent = BREIT.matches ? T("liste") : T("liste_auf");
    $("editor-liste").open = BREIT.matches;
    $("editor-stand").textContent = "";
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    document.body.classList.add("editor-offen");
    aktualisieren();
  }
  function schliessen() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", function () {
    document.body.classList.remove("editor-offen");
    var v = offenVon; offenVon = null;
    if (v && document.contains(v) && !v.hidden) v.focus({ preventScroll: true });
  });
  // Esc: zuerst ein offenes Textfeld (Fokus auf seinen Knopf „Bearbeiten“), dann die Ansicht
  dlg.addEventListener("cancel", function (ev) {
    var ids = Object.keys(bearbeiten);
    if (ueZiel) { ev.preventDefault(); ueZu(); return; }
    if (!ids.length) return;
    ev.preventDefault();
    var drin = document.activeElement && document.activeElement.closest && document.activeElement.closest(".ed-b");
    var id = drin && bearbeiten[drin.dataset.id] ? drin.dataset.id : ids[ids.length - 1];
    abbrechen(id);
  });
  $("editor-zu").onclick = schliessen;
  ["editor-auf", "editor-auf-2"].forEach(function (id) { $(id).onclick = function () { oeffnen($(id)); }; });
  if (BREIT.addEventListener) BREIT.addEventListener("change", function () {
    $("editor-liste").open = BREIT.matches;
    if (S.katalog) $("editor-liste-titel").textContent = BREIT.matches ? T("liste") : T("liste_auf");
  });

  // ---------------------------------------------------------------- Vorschau holen und zeichnen
  function sig() {
    return [Z.kurs_md, Z.steckbrief_text, Object.keys(Z.assets).sort().map(function (n) {
      return n + ":" + (Z.assets[n] ? Z.assets[n].length : 0); }).join(",")].join("\u0000");
  }
  function zeichneEditor() {
    knoepfeZeigen();
    if (!dlg.open) return;
    if (!sichtbar()) { schliessen(); return; }
    clearTimeout(timer);
    timer = setTimeout(aktualisieren, 30);
  }
  async function aktualisieren() {
    var s = sig(), nr = ++lauf;
    if (s !== standSig || !stand) {
      if (!stand) $("editor-vorschau").textContent = T("laedt");
      try {
        await km.bereit();
        var v = await km.einheitVorschau();
        if (nr !== lauf) return;
        stand = v; standSig = s;
      } catch (e) { S.zeigeFehler(e); return; }
    }
    bilderSig = Object.keys(Z.assets).sort().map(function (n) { return n + ":" + (Z.assets[n] ? Z.assets[n].length : 0);
        }).join(",");
    schriftSetzen(stand.schrift_css);
    zeichneListe();
    zeichneVorschau();
  }
  function schriftSetzen(css) {
    var st = $("editor-schrift");
    if (!st) { st = el("style", { id: "editor-schrift" }); document.head.appendChild(st); }
    if (st.textContent !== (css || "")) st.textContent = css || "";      // @font-face greift im Shadow Root nicht
  }
  function nummer(id, i) {
    var liste = Z.mappe ? Z.mappe.bausteine : [];
    for (var j = 0; j < liste.length; j++) if (liste[j].id === id) return j + 1;
    return i + 1;
  }
  function statusVon(b) {
    var p = pruef(b.id);
    return (p && p.status) || b.status || "ok";
  }
  var STATUS = { ok: "Geprüft", warnung: "Hinweis", fehler: "Fehler" };

  function zeichneListe() {
    var ol = $("editor-liste-ol"); ol.textContent = "";
    if (stand.uebersicht) ol.appendChild(el("li", {}, [el("button", { type: "button", cls: "ed-sprung", "data-ziel": UE }, [
      el("span", { cls: "ed-l-text" }, [el("span", { cls: "ed-l-titel", text: T("uebersicht") })]),
      ueHand() ? el("span", { cls: "ed-l-hand", title: T("hand"), "aria-label": T("hand"), text: "✎" }) : null])]));
    stand.bausteine.forEach(function (b, i) {
      if (b.typ === "Unterabschnitt") return;
      var st = statusVon(b);
      ol.appendChild(el("li", {}, [el("button", { type: "button", cls: "ed-sprung", "data-ziel": b.id }, [
        el("span", { cls: "ed-nr", text: String(nummer(b.id, i)) }),
        el("span", { cls: "ed-l-text" }, [el("span", { cls: "ed-l-typ", text: S.formularname(b.typ) }),
          el("span", { cls: "ed-l-titel", text: b.titel })]),
        S.handGeaendert(b.id) ? el("span", { cls: "ed-l-hand", title: T("hand"), "aria-label": T("hand"), text: "✎" }) : null,
        el("span", { cls: "ed-punkt status-" + st, title: STATUS[st] || st }, [el("span", { cls: "unsichtbar",
            text: STATUS[st] || st })])])]));
    });
  }
  $("editor-liste-ol").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-ziel]"); if (!b) return;
    var k = knoten[b.dataset.ziel]; if (!k) return;
    if (!BREIT.matches) $("editor-liste").open = false;
    zeigen(k.el);
    var t = k.kopf.querySelector(".ed-b-titel");
    if (t) t.focus({ preventScroll: true });
  });

  // Baustein oben in den Bildlauf der Ansicht holen (unter der Leiste „Bausteine anzeigen“); nur .ed-rumpf scrollt
  function zeigen(knoten_) {
    var rumpf = dlg.querySelector(".ed-rumpf"), leiste = BREIT.matches ? 0 : $("editor-liste").offsetHeight;
    rumpf.scrollTop += knoten_.getBoundingClientRect().top - rumpf.getBoundingClientRect().top - leiste - 8;
  }
  function zeichneVorschau() {
    var box = $("editor-vorschau"), soll = [], gesehen = {}, letzter = null, nAbschnitt = 0;
    if (!stand.bausteine.length) { box.textContent = T("leer"); return; }
    if (stand.uebersicht) { soll.push(uebersichtEintrag().el); gesehen[UE] = 1; }
    stand.bausteine.forEach(function (b, i) {
      if (b.abschnitt !== letzter) {
        nAbschnitt += 1; letzter = b.abschnitt;
        var schl = nAbschnitt + "|" + (b.abschnitt || "");
        var h = abschnittKnoten[schl] || (abschnittKnoten[schl] = el("h3", { cls: "ed-abschnitt", text: b.abschnitt ||
            "" }));
        soll.push(h);
      }
      var k = eintrag(b, i);
      gesehen[b.id] = 1;
      soll.push(k.el);
    });
    Object.keys(knoten).forEach(function (id) { if (!gesehen[id]) { delete knoten[id]; delete bearbeiten[id];
        delete neuOffen[id]; } });
    var ist = Array.prototype.slice.call(box.children);
    var gleich = ist.length === soll.length && ist.every(function (x, i) { return x === soll[i]; });
    if (!gleich) box.replaceChildren.apply(box, soll);     // nur bei neuer Reihenfolge; sonst bleibt der Fokus
  }

  function eintrag(b, i) {
    var k = knoten[b.id];
    if (!k) {
      k = knoten[b.id] = { el: el("section", { cls: "ed-b", "data-id": b.id, id: "ed-" + b.id,
          "aria-labelledby": "ed-t-" + b.id }), sig: null };
      k.kopf = el("div", { cls: "ed-b-kopf" });
      k.koerper = el("div", { cls: "ed-b-koerper" });
      k.werk = el("div", { cls: "ed-b-werk", hidden: true });
      k.neu = el("div", { cls: "ed-b-neu", hidden: true });
      k.el.append(k.kopf, k.koerper, k.werk, k.neu);
    }
    k.b = b;
    zeichneKopf(k, b, i);
    var s = JSON.stringify([b.html, b.platzhalter, bilderSig]);
    if (s !== k.sig) {
      k.sig = s;
      try { zeichneKoerper(k, b); } catch (e) {        // eine Fläche hält die übrigen nicht auf
        console.error("Vorschau", b.id, e);
        k.koerper.textContent = "";
        k.koerper.appendChild(el("div", { cls: "ed-platz ed-platz-fehler" }, [el("p", { text: T("platzhalter_fehler") })]));
      }
    }
    k.koerper.hidden = !!bearbeiten[b.id];
    if (neuOffen[b.id] && !(karte(b.id) || {}).neu) neuZu(b.id);       // eingesetzt oder an der Karte zurückgenommen
    return k;
  }

  function zeichneKopf(k, b, i) {
    var st = statusVon(b), hand = S.handGeaendert(b.id), offen = !!bearbeiten[b.id], neu = !!neuOffen[b.id];
    var fokus = document.activeElement && k.kopf.contains(document.activeElement) ? document.activeElement.dataset.aktion ||
        (document.activeElement.classList.contains("ed-b-titel") ? "titel" : "") : "";
    k.kopf.textContent = "";
    k.el.classList.toggle("ed-unter", b.typ === "Unterabschnitt");
    k.el.classList.toggle("status-" + st, true);
    ["ok", "warnung", "fehler"].forEach(function (x) { if (x !== st) k.el.classList.remove("status-" + x); });
    var titel = el("h4", { cls: "ed-b-titel", id: "ed-t-" + b.id, tabindex: "-1" }, [
      b.typ === "Unterabschnitt" ? null : el("span", { cls: "ed-nr", text: String(nummer(b.id, i)) }),
      el("span", { cls: "ed-typ", text: b.typ === "Unterabschnitt" ? T("unterabschnitt") : S.formularname(b.typ) }),
      el("span", { cls: "ed-titel-text", text: b.titel })]);
    var marken = el("span", { cls: "ed-marken" }, [
      hand ? el("span", { cls: "ed-hand", text: T("hand") }) : null,
      st === "fehler" ? el("span", { cls: "ed-status fehler", text: STATUS.fehler }) : null]);
    var knoepfe = null;
    if (b.typ !== "Unterabschnitt") {
      knoepfe = el("span", { cls: "ed-b-knoepfe" }, [
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "bearbeiten", "aria-expanded": String(offen),
            "aria-label": T("bearbeiten") + ": " + b.titel, text: T("bearbeiten") }),
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "neu", "aria-expanded": String(neu),
            "aria-label": T("neu_schreiben") + ": " + b.titel, text: T("neu_schreiben") }),
        hand ? el("button", { type: "button", cls: "textlink ed-zurueck", "data-aktion": "zuruecknehmen",
            text: T("zuruecknehmen") }) : null]);
    }
    k.kopf.append(titel, marken, knoepfe || "");
    // rote Meldungen wie an der Karte (auch Regeln der Einheit, die erst der ganze Stand kennt)
    var dg = Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.baustein === b.id && d.stufe === "fehler"; })
      : [];
    if (dg.length && !(b.platzhalter && b.platzhalter.art === "fehler")) k.kopf.appendChild(el("ul", { cls: "ed-meldungen" },
        dg.map(function (d) { return el("li", { cls: "fehler", text: (d.zeile_im_baustein ? "Zeile " + d.zeile_im_baustein +
            ": " : "") + d.text }); })));
    if (fokus) {
      var f = fokus === "titel" ? titel : k.kopf.querySelector("[data-aktion='" + fokus + "']");
      if (f) f.focus({ preventScroll: true });
    }
  }

  function zeichneKoerper(k, b) {
    k.koerper.textContent = "";
    var p = b.platzhalter;
    if (b.html !== null && b.html !== undefined) k.koerper.appendChild(flaeche(b.html));
    if (p && p.art !== "unterabschnitt") {
      var kasten = el("div", { cls: "ed-platz ed-platz-" + p.art }, [el("p", { text: p.text })]);
      if (p.meldungen && p.meldungen.length) kasten.appendChild(el("ul", { cls: "ed-meldungen" }, p.meldungen.map(
          function (m) { return el("li", { cls: "fehler", text: m }); })));
      if (b.html) k.koerper.insertBefore(kasten, k.koerper.firstChild); else k.koerper.appendChild(kasten);
    }
  }

  function flaeche(html, aktiv) {
    var host = el("div", { cls: "ed-flaeche" });
    var innen = document.createElement("div");
    innen.className = "km-ed-inhalt";
    // HTML aus dem Generator (gen/api.einheit_vorschau): KI-Text ist dort escaped; Skripte, iframes, Adressen und
    // Ereignis-Attribute sind entfernt. Nur in einem Shadow Root, ohne Zugriff auf die Seite.
    innen.innerHTML = html;
    Array.prototype.forEach.call(innen.querySelectorAll("img"), function (img) {
      var src = img.getAttribute("src") || "";
      if (src.indexOf("@@PLUGINFILE@@/") !== 0) return;
      var name = src.slice(15);
      try { name = decodeURIComponent(name); } catch (e) { /* „100%.png“: der Name steht roh in der Kursdatei */ }
      img.setAttribute("src", Z.assets[name] ? S.vorschauUrl(name) : BILD_FEHLT);
    });
    var stil = document.createElement("style");
    stil.textContent = SCHATTEN_CSS;
    var root = host;
    if (host.attachShadow) { root = host.attachShadow({ mode: "open" }); root.append(stil, innen); }
    else host.append(stil, innen);
    if (aktiv) {
      // §9: Kurstitel, Abschnitte und Kacheln sind bedienbar (Tabulator, Enter, Leertaste); Pfeile verschieben
      Array.prototype.forEach.call(innen.querySelectorAll("[data-ziel]"), function (x) {
        x.setAttribute("tabindex", "0");
        x.setAttribute("role", "button");
        x.setAttribute("aria-label", x.dataset.ziel === "kopf" ? T("kurstitel") + ": " + x.textContent :
            T("abschnitt_titel") + ": " + (x.dataset.titel || x.textContent));
      });
      Array.prototype.forEach.call(innen.querySelectorAll("button[data-aktion]"), function (x) {
        x.setAttribute("tabindex", "0"); });
      root.addEventListener("click", ueKlick);
      root.addEventListener("keydown", function (ev) {
        var z = ev.target.closest && ev.target.closest("[data-ziel]");
        if (z && z === ev.target && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); ueKlick(ev); }
      });
    }
    return host;
  }

  // ---------------------------------------------------------------- Kursübersicht (§9)
  // Erster Eintrag der Ansicht: die Kursseite im gewählten Format (gen/uebersicht.py, im selben Aufruf wie die
  // Bausteine). Ein Klick auf Kurstitel, Abschnitt oder Kachel öffnet ein Formular darunter; geschrieben wird über
  // gen/mappe.py (kurstitel_setzen, abschnitt_setzen, abschnitt_verschieben), danach baut die Vorschau neu. Änderungen
  // gelten als Handänderung `kopf` bzw. `abschnitt:n` (karten.js uebersichtAendern).
  function ueHand() {
    var h = (Z.mappe && Z.mappe.hand) || {};
    return Object.keys(h).some(function (k) { return k === "kopf" || k.indexOf("abschnitt:") === 0; });
  }
  function uebersichtEintrag() {
    var u = stand.uebersicht, k = knoten[UE];
    if (!k) {
      k = knoten[UE] = { el: el("section", { cls: "ed-b ed-ue", "data-id": UE, id: "ed-" + UE, "aria-labelledby": "ed-t-" + UE }),
          sig: null };
      k.kopf = el("div", { cls: "ed-b-kopf" });
      k.zeile = el("p", { cls: "ed-ue-zeile" });
      k.koerper = el("div", { cls: "ed-b-koerper" });
      k.werk = el("div", { cls: "ed-b-werk ed-ue-werk", hidden: true });
      k.el.append(k.kopf, k.zeile, k.koerper, k.werk);
    }
    k.b = { id: UE, titel: T("uebersicht") };
    zeichneUeKopf(k, u);
    k.zeile.textContent = T("uebersicht_zeile") + (u.format === "wochen" && !S.angaben.start ? " " + T("wochen_start") : "");
    var s = JSON.stringify([u.html, bilderSig]);
    if (s !== k.sig) {
      k.sig = s; k.koerper.textContent = "";
      try { k.koerper.appendChild(flaeche(u.html, true)); } catch (e) { console.error("Vorschau", UE, e); }
    }
    if (ueZiel && !ueAbschnitt(ueZiel) && ueZiel !== "kopf") ueZu(true);
    return k;
  }
  function zeichneUeKopf(k, u) {
    var a = document.activeElement, fokus = a && k.kopf.contains(a) ? (a.dataset.wert || a.className) : "";
    k.kopf.textContent = "";
    var hue = S.akzent ? S.akzent() : "#1D5FD1";
    var wahl = el("div", { cls: "ed-darstellung", role: "radiogroup", "aria-label": T("darstellung") },
        S.katalog.oberflaeche.format.map(function (w) {
      var b = el("button", { type: "button", cls: "ed-format-wahl", role: "radio", "aria-checked": String(w.wert === u.format),
          "data-aktion": "darstellung", "data-wert": w.wert });
      var m = el("span", { cls: "ed-format-mini", "aria-hidden": "true" });
      m.innerHTML = S.miniFormat(w.wert, hue);                       // eigenes SVG (schritte.js), keine Eingabe
      b.append(m, el("span", { text: w.text }));
      return b;
    }));
    k.kopf.append(el("h4", { cls: "ed-b-titel", id: "ed-t-" + UE, tabindex: "-1" }, [el("span", { cls: "ed-titel-text",
        text: T("uebersicht") })]),
      el("span", { cls: "ed-marken" }, [ueHand() ? el("span", { cls: "ed-hand", text: T("hand") }) : null]),
      el("div", { cls: "ed-darstellung-l" }, [el("span", { cls: "ed-darstellung-t", text: T("darstellung") }), wahl]));
    if (fokus) {
      var f = k.kopf.querySelector("[data-wert='" + fokus + "']") || k.kopf.querySelector("." + String(fokus).split(" ")[0]);
      if (f) f.focus({ preventScroll: true });
    }
  }
  function ueAbschnitt(ziel) {
    var nr = parseInt(String(ziel).replace("abschnitt:", ""), 10);
    return (stand.uebersicht.abschnitte || []).filter(function (a) { return a.nr === nr && !a.allgemein; })[0] || null;
  }
  function ueKlick(ev) {
    var t = ev.target.closest && ev.target.closest("[data-aktion], [data-ziel]");
    if (!t) return;
    if (t.dataset.aktion === "hoch" || t.dataset.aktion === "runter") {
      ev.stopPropagation();
      if (!t.disabled) verschieben(parseInt(t.dataset.nr, 10), t.dataset.aktion === "hoch" ? -1 : 1).catch(S.zeigeFehler);
      return;
    }
    if (t.dataset.ziel) ueFormular(t.dataset.ziel);
  }
  // Auswahl mit dem bisherigen Wert: steht er nicht in der Liste (Symbol, Farbe als #RRGGBB, Bild nicht hochgeladen),
  // kommt er als eigene Option dazu und ist vorgewählt; `data-alt` hält ihn, gesendet wird nur, was sich ändert
  function auswahl(cls, werte, wert, label) {
    var s = el("select", { cls: cls, "aria-label": label, "data-alt": wert || "" });
    var liste = werte.slice();
    if (wert && !liste.some(function (w) { return w.wert === wert; })) liste.push({ wert: wert, text: wert });
    liste.forEach(function (w) { s.appendChild(el("option", { value: w.wert, text: w.text, selected: w.wert === (wert || "") }));
        });
    s.value = wert || "";
    return s;
  }
  function ueFormular(ziel) {
    var k = knoten[UE], u = stand.uebersicht; if (!k) return;
    var a = ziel === "kopf" ? null : ueAbschnitt(ziel);
    if (ziel !== "kopf" && !a) return;
    ueZiel = ziel;
    var titel = el("input", { type: "text", cls: "ed-ue-titel", maxlength: "120", value: a ? a.titel : u.titel,
        "data-alt": a ? a.titel : u.titel });
    var teile = [el("label", { cls: "feld ed-feld" }, [a ? T("abschnitt_titel") : T("kurstitel"), titel])];
    if (a) {
      var o = S.katalog.oberflaeche;
      if (u.format === "kacheln") {
        var bilder = Object.keys(Z.assets).filter(function (n) { return /\.(png|jpe?g)$/i.test(n); }).sort();
        teile.push(el("div", { cls: "ed-ue-reihe" }, [
          el("label", { cls: "feld ed-feld" }, [T("kachelbild"), auswahl("ed-ue-bild", [{ wert: "", text: T("kachelbild_keins") }]
              .concat(bilder.map(function (n) { return { wert: n, text: n }; })), a.angaben.kachelbild, T("kachelbild"))]),
          el("label", { cls: "knopf klein-knopf ed-ue-hochladen" }, [T("kachelbild_hochladen"), el("input", { type: "file",
              cls: "unsichtbar ed-ue-datei", accept: "image/png,image/jpeg" })])]));
        teile.push(el("label", { cls: "feld ed-feld" }, [T("kachelicon"), auswahl("ed-ue-icon",
            [{ wert: "", text: T("kachelicon_keins") }].concat(o.kachelicon), a.angaben.kachelicon, T("kachelicon"))]));
      }
      teile.push(el("label", { cls: "feld ed-feld" }, [T("farbe"), auswahl("ed-ue-farbe",
          [{ wert: "", text: T("farbe_kurs") }].concat(o.farbe.filter(function (w) { return w.wert; })),
          a.angaben.farbe, T("farbe"))]));
      var quer = u.format === "kacheln" || u.format === "einthemen";
      teile.push(el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "ue-hoch", text: quer ? T("links") : T("hoch") }),
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "ue-runter",
            text: quer ? T("rechts") : T("runter") })]));
    }
    teile.push(el("p", { cls: "ed-meldungen ed-ue-meldung", role: "status" }));
    teile.push(el("div", { cls: "ed-knoepfe" }, [
      el("button", { type: "button", cls: "knopf haupt", "data-aktion": "ue-uebernehmen", text: T("uebernehmen") }),
      el("button", { type: "button", cls: "knopf", "data-aktion": "ue-abbrechen", text: T("abbrechen") })]));
    k.werk.textContent = "";
    k.werk.setAttribute("role", "group");
    k.werk.setAttribute("aria-label", a ? T("abschnitt_titel") + ": " + a.titel : T("kurstitel"));
    k.werk.append.apply(k.werk, teile);
    k.werk.hidden = false;
    titel.focus(); titel.select();
  }
  function ueZu(stumm) {
    var k = knoten[UE], ziel = ueZiel;
    ueZiel = null;
    if (!k) return;
    k.werk.hidden = true; k.werk.textContent = "";
    if (stumm) return;
    var f = null;
    try { f = ziel && k.koerper.firstChild && k.koerper.firstChild.shadowRoot &&
        k.koerper.firstChild.shadowRoot.querySelector("[data-ziel='" + ziel + "']"); } catch (e) { f = null; }
    (f || k.kopf.querySelector(".ed-b-titel")).focus({ preventScroll: true });
  }
  async function ueUebernehmen() {
    var k = knoten[UE], ziel = ueZiel; if (!k || !ziel) return;
    // nur Felder, die die Lehrkraft geändert hat (sonst gingen Werte außerhalb der Listen verloren)
    var w = function (c) { var x = k.werk.querySelector("." + c); return x && x.value !== x.dataset.alt ? x.value : undefined; };
    var meldung = k.werk.querySelector(".ed-ue-meldung"), titel = w("ed-ue-titel");
    await km.bereit();
    if (ziel === "kopf" && titel === undefined) { ueZu(); return; }
    if (ziel === "kopf") {
      var r = await km.mappeFn("kurstitel_setzen", [Z.kurs_md, Z.steckbrief_text, titel]);
      if (r.fehler) { meldung.textContent = r.fehler; meldung.className = "ed-meldungen ed-ue-meldung fehler"; return; }
      Z.steckbrief_text = r.steckbrief; S.angaben.thema = titel.trim(); Z.mappe.titel = titel.trim();
      ueZu();
      await S.uebersichtAendern(r.kurs_md, "kopf", r.vorher, { titel: titel.trim() });
    } else {
      var nr = parseInt(ziel.replace("abschnitt:", ""), 10), angaben = {};
      if (titel !== undefined) angaben.titel = titel;
      ["bild", "icon", "farbe"].forEach(function (x, i) {
        var v = w("ed-ue-" + x); if (v !== undefined) angaben[["kachelbild", "kachelicon", "farbe"][i]] = v; });
      if (!Object.keys(angaben).length) { ueZu(); return; }
      var r2 = await km.mappeFn("abschnitt_setzen", [Z.kurs_md, nr, angaben, Z.mappe.hand || {}]);
      if (r2.fehler) { meldung.textContent = r2.fehler; meldung.className = "ed-meldungen ed-ue-meldung fehler"; return; }
      ueZu();
      if (r2.vorher !== r2.nachher) await S.uebersichtAendern(r2.kurs_md, r2.schluessel, r2.vorher, { nachher: r2.nachher });
    }
    $("editor-stand").textContent = T("uebernommen");
    await aktualisieren();
    ueFokus(ziel);
  }
  // Fokus auf die Stelle in der (neu gebauten) Übersicht, sonst auf ihre Überschrift
  function ueFokus(ziel) {
    var k = knoten[UE]; if (!k) return;
    var root = k.koerper.firstChild && k.koerper.firstChild.shadowRoot;
    var f = root && root.querySelector("[data-ziel='" + ziel + "']");
    (f || k.kopf.querySelector(".ed-b-titel")).focus({ preventScroll: true });
  }
  async function verschieben(nr, richtung) {
    await km.bereit();
    var r = await km.mappeFn("abschnitt_verschieben", [Z.kurs_md, nr, richtung, Z.mappe.hand || {}]);
    if (r.nach === nr) return;
    if (ueZiel === "abschnitt:" + nr) ueZiel = "abschnitt:" + r.nach;
    // §8.7: Verschieben ist eine Handänderung des Abschnitts (Kopf und Vorgänger); Rückgängig und Moduswechsel gelten nicht mehr
    await S.uebersichtAendern(r.kurs_md, r.schluessel, r.vorher, { nachher: r.nachher, nach: r.vorgaenger });
    await aktualisieren();
    var k = knoten[UE], root = k && k.koerper.firstChild && k.koerper.firstChild.shadowRoot;
    var f = root && (root.querySelector("[data-aktion=" + (richtung < 0 ? "hoch" : "runter") + "][data-nr='" + r.nach + "']:not([disabled])")
        || root.querySelector("[data-ziel='abschnitt:" + r.nach + "']"));
    if (f) f.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- Bearbeiten
  async function formatZeilen(typ) {
    if (!hilfe[typ]) hilfe[typ] = await km.prompt("format_hilfe", [typ]);
    return hilfe[typ];
  }
  function mitCode(text) {
    var out = [];
    String(text || "").split("`").forEach(function (t, i) { if (t) out.push(i % 2 ? el("code", { text: t }) : t); });
    return out;
  }
  function zeilen(t) { return Math.min(24, Math.max(6, String(t || "").split("\n").length + 1)); }

  async function bearbeitenAuf(id) {
    var k = knoten[id]; if (!k) return;
    var b = k.b;
    bearbeiten[id] = { text: b.text, meldungen: [] };
    var feld = el("textarea", { cls: "ed-text", rows: String(zeilen(b.text)), spellcheck: "true" });
    feld.value = b.text;
    var format = el("div", { cls: "ed-format" }, [el("p", { cls: "ed-format-titel", text: T("format") })]);
    k.werk.textContent = "";
    k.werk.setAttribute("role", "group");
    k.werk.setAttribute("aria-label", T("bearbeiten") + ": " + b.titel);
    k.werk.append(
      el("label", { cls: "feld ed-feld" }, [T("feld"), feld]),
      el("ul", { cls: "ed-meldungen ed-pruefung", "aria-live": "polite" }),
      el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf haupt", "data-aktion": "uebernehmen", text: T("uebernehmen") }),
        el("button", { type: "button", cls: "knopf", "data-aktion": "abbrechen", text: T("abbrechen") })]),
      format);
    k.werk.hidden = false;
    k.koerper.hidden = true;
    zeichneKopf(k, b, 0);
    feld.focus();
    try {
      (await formatZeilen(b.typ)).forEach(function (z) { format.appendChild(el("p", {}, mitCode(z))); });
    } catch (e) { /* ohne Formatzeile geht das Bearbeiten trotzdem */ }
  }
  function meldungenZeigen(id, m) {
    var k = knoten[id]; if (!k) return;
    var ul = k.werk.querySelector(".ed-pruefung"); if (!ul) return;
    ul.textContent = "";
    (m || []).forEach(function (x) { ul.appendChild(el("li", { cls: x.stufe }, mitCode(x.text))); });
  }
  async function pruefen(id) {
    var e = bearbeiten[id]; if (!e) return;
    var r = await km.mappeFn("hand_pruefen", [Z.mappe, e.text, id]);
    if (bearbeiten[id] !== e) return;
    e.meldungen = r.meldungen; meldungenZeigen(id, r.meldungen);
  }
  function abbrechen(id) {
    var k = knoten[id];
    delete bearbeiten[id];
    if (!k) return;
    k.werk.hidden = true; k.werk.textContent = ""; k.koerper.hidden = false;
    zeichneKopf(k, k.b, 0);
    var f = k.kopf.querySelector("[data-aktion=bearbeiten]"); if (f) f.focus();
  }
  async function uebernehmen(id, knopf) {
    var e = bearbeiten[id]; if (!e || !e.text.trim()) return;
    knopf.disabled = true;
    try {
      var r = await S.handUebernehmen(id, e.text, (knoten[id] || {}).b ? knoten[id].b.text : null);
      if (r.unveraendert) { abbrechen(id); return; }
      if (!r.ok) { e.meldungen = r.meldungen; meldungenZeigen(id, r.meldungen); var f = knoten[id] &&
          knoten[id].werk.querySelector(".ed-text"); if (f) f.focus(); return; }
      delete bearbeiten[id];
      var k = knoten[id];
      if (k) { k.werk.hidden = true; k.werk.textContent = ""; k.koerper.hidden = false; }
      $("editor-stand").textContent = T("uebernommen");
      await aktualisieren();
      k = knoten[id];
      var b = k && k.kopf.querySelector("[data-aktion=bearbeiten]");
      if (b) b.focus({ preventScroll: true });
    } catch (err) { S.zeigeFehler(err); }
    finally { knopf.disabled = false; }
  }

  // ---------------------------------------------------------------- Neu schreiben lassen (§7)
  function neuAuf(id) {
    var k = knoten[id], kt = karte(id); if (!k || !kt) return;
    neuOffen[id] = true;
    if (!kt.neu) { kt.neu = true; S.korrektur.text = ""; }
    var wunsch = el("textarea", { cls: "ed-wunsch von-lehrkraft", rows: "2", placeholder: T("wunsch_platzhalter") });
    wunsch.value = kt.auftrag || "";
    var feld = el("textarea", { cls: "unsichtbar ed-neu-feld", readonly: true, "aria-hidden": "true", tabindex: "-1" });
    var antwort = el("textarea", { cls: "ed-antwort", rows: "4", spellcheck: "false" });
    k.neu.textContent = "";
    k.neu.setAttribute("role", "group");
    k.neu.setAttribute("aria-label", T("neu_schreiben") + ": " + k.b.titel);
    k.neu.append(
      el("label", { cls: "feld ed-feld" }, [T("wunsch"), wunsch]),
      el("div", { cls: "kopieren" }, [el("button", { type: "button", cls: "knopf haupt", "data-aktion": "neu-kopieren",
          disabled: true, text: ki() ? T("an_ki") : T("text_kopieren") })]),
      el("p", { cls: "stand ed-neu-kopiert", role: "status" }),
      feld,
      el("label", { cls: "feld ed-feld" }, [T("antwort"), antwort]),
      el("div", { cls: "kopieren" }, [el("button", { type: "button", cls: "knopf", "data-aktion": "neu-einsetzen",
          text: T("einsetzen") })]),
      el("p", { cls: "stand-karte ed-neu-stand", role: "status", "aria-live": "polite", hidden: true }),
      el("div", { cls: "stand-karte fehler diagnose-karte ed-neu-diagnose", role: "status", hidden: true }));
    k.neu.hidden = false;
    S.zeichneKarten(); S.zeichneKorrektur(); S.geaendert(); S.korrekturSpaeter(0);
    zeichneKopf(k, k.b, 0);
    wunsch.focus();
    textVorbereiten(id);
  }
  function neuZu(id, abwaehlen) {
    var k = knoten[id], kt = karte(id);
    delete neuOffen[id]; delete neuText[id];
    if (abwaehlen && kt && kt.neu) { kt.neu = false; S.korrektur.text = ""; S.zeichneKarten(); S.zeichneKorrektur();
        S.geaendert(); S.korrekturSpaeter(0); }
    if (!k) return;
    k.neu.hidden = true; k.neu.textContent = "";
    zeichneKopf(k, k.b, 0);
  }
  async function textVorbereiten(id) {
    var k = knoten[id]; if (!k || !neuOffen[id]) return;
    var knopf = k.neu.querySelector("[data-aktion=neu-kopieren]");
    try {
      var t = await S.korrekturText();
      if (!neuOffen[id]) return;
      neuText[id] = t;
      k.neu.querySelector(".ed-neu-feld").value = t;
      knopf.disabled = !t || (S.kiBesetzt && S.kiBesetzt());
      knopf.textContent = ki() ? T("an_ki") : T("text_kopieren");
    } catch (e) { S.zeigeFehler(e); }
  }
  function neuStand(id, x, art) {
    var k = knoten[id]; if (!k) return;
    var p = k.neu.querySelector(".ed-neu-stand"); if (p) S.standKarte(p, x, art);
  }
  function neuKopieren(id) {
    var k = knoten[id], t = neuText[id]; if (!k || !t) return;
    var antwort = k.neu.querySelector(".ed-antwort");
    if (ki()) {
      return S.anKi(t, { einheit: S.einheitTag(), neu: false, ort: k.neu.querySelector(".ed-neu-stand"), feld: "korrektur",
        vorher: S.korrekturVermerken, stand: function (x, art) { neuStand(id, x, art); },
        fertig: function (a) { antwort.value = a; return neuEinsetzen(id); } });
    }
    S.korrekturVermerken();
    S.kopieren(t, k.neu.querySelector(".ed-neu-feld"), k.neu.querySelector(".ed-neu-kopiert"), T("kopiert"), function () {
      km.kurzmeldung(k.neu.querySelector("[data-aktion=neu-kopieren]"), T("text_kopieren"));
      antwort.focus({ preventScroll: true });
    });
  }
  async function neuEinsetzen(id) {
    var k = knoten[id]; if (!k) return;
    var antwort = k.neu.querySelector(".ed-antwort");
    var ok = await S.korrekturEinsetzen({ text: antwort.value, sprung: false, fokus: false,
      stand: function (x, art) { neuStand(id, x, art); },
      diagnose: function (d) { var box = k.neu.querySelector(".ed-neu-diagnose"); if (box) S.diagnoseKarte(box, d); },
      leeren: function () { antwort.value = ""; } });
    if (!ok) return;
    if (!(karte(id) || {}).neu) {
      neuZu(id);
      $("editor-stand").textContent = T("eingesetzt");
      await aktualisieren();
      var b = knoten[id] && knoten[id].kopf.querySelector("[data-aktion=neu]");
      if (b) b.focus({ preventScroll: true });
    }
  }

  // ---------------------------------------------------------------- Ereignisse in der Vorschau
  $("editor-vorschau").addEventListener("click", async function (ev) {
    var knopf = ev.target.closest("[data-aktion]"); if (!knopf) return;
    var sec = knopf.closest(".ed-b"); if (!sec) return;
    var id = sec.dataset.id, a = knopf.dataset.aktion;
    try {
      if (a === "darstellung") {
        if (knopf.getAttribute("aria-checked") === "true") return;
        S.angaben.format = knopf.dataset.wert;
        await S.angabenSchreiben({ format: knopf.dataset.wert }, true);
        return;
      }
      if (a === "ue-uebernehmen") return await ueUebernehmen();
      if (a === "ue-abbrechen") return ueZu();
      if (a === "ue-hoch" || a === "ue-runter") {
        var nr = parseInt(String(ueZiel).replace("abschnitt:", ""), 10);
        return await verschieben(nr, a === "ue-hoch" ? -1 : 1);
      }
      if (a === "bearbeiten") { if (bearbeiten[id]) abbrechen(id); else await bearbeitenAuf(id); }
      else if (a === "abbrechen") abbrechen(id);
      else if (a === "uebernehmen") await uebernehmen(id, knopf);
      else if (a === "zuruecknehmen") {
        if (await S.handZuruecknehmen(id)) {
          $("editor-stand").textContent = T("zurueckgenommen");
          await aktualisieren();
          var t = knoten[id] && knoten[id].kopf.querySelector("[data-aktion=bearbeiten]"); if (t) t.focus();
        }
      }
      else if (a === "neu") { if (neuOffen[id]) neuZu(id, true); else neuAuf(id); }
      else if (a === "neu-kopieren") neuKopieren(id);
      else if (a === "neu-einsetzen") await neuEinsetzen(id);
    } catch (e) { S.zeigeFehler(e); }
  });
  $("editor-vorschau").addEventListener("change", async function (ev) {
    if (!ev.target.classList.contains("ed-ue-datei")) return;
    var f = ev.target.files && ev.target.files[0], nr = String(ueZiel || "").replace("abschnitt:", "");
    ev.target.value = "";
    if (!f || !nr) return;
    // eindeutiger Name aus den Bilddaten (nach dem Verschieben trüge eine Nummer den falschen Abschnitt)
    var name = "kachel-" + (await km.sha256(new Uint8Array(await f.arrayBuffer()))).slice(0, 8) + ".jpg";
    var sel = knoten[UE] && knoten[UE].werk.querySelector(".ed-ue-bild");
    await S.bildSetzen(f, name);
    if (sel && Z.assets[name]) {
      if (!sel.querySelector("option[value='" + name + "']")) sel.appendChild(el("option", { value: name, text: name }));
      sel.value = name;
    }
  });
  $("editor-vorschau").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.classList.contains("ed-ue-titel")) { ev.preventDefault(); ueUebernehmen()
        .catch(S.zeigeFehler); }
  });
  $("editor-vorschau").addEventListener("input", function (ev) {
    var sec = ev.target.closest(".ed-b"); if (!sec) return;
    var id = sec.dataset.id;
    if (ev.target.classList.contains("ed-text") && bearbeiten[id]) {
      bearbeiten[id].text = ev.target.value;
      clearTimeout(pruefTimer[id]);
      pruefTimer[id] = setTimeout(function () { pruefen(id).catch(S.zeigeFehler); }, 400);
    } else if (ev.target.classList.contains("ed-wunsch")) {
      var kt = karte(id); if (!kt) return;
      kt.auftrag = ev.target.value;                     // derselbe Auftrag wie im Feld an der Karte („Ich steuere“)
      var an = document.querySelector("#karte-" + CSS.escape(id) + " .k-auftrag");
      if (an) an.value = kt.auftrag;
      S.geaendert();
      clearTimeout(wunschTimer);
      wunschTimer = setTimeout(function () { textVorbereiten(id); S.korrekturSpaeter(0); }, 400);
    } else if (ev.target.classList.contains("ed-antwort") && ev.inputType === "insertFromPaste") {
      setTimeout(function () { neuEinsetzen(id); }, 30);
    }
  });

  S.zeichneEditor = zeichneEditor;
  S.editorOeffnen = oeffnen;
  S.editorZeigen = function (id) { if (knoten[id]) zeigen(knoten[id].el); };
})();
