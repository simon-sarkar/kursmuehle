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
  // MF5: Wortlaut des Felds für eine Stelle aus katalog.yaml oberflaeche.stelle
  function TS(k, w) {
    var t = ((S.katalog && S.katalog.oberflaeche.stelle) || {})[k] || "";
    Object.keys(w || {}).forEach(function (x) { t = t.split("{" + x + "}").join(w[x]); });
    return t;
  }
  var dlg = $("editor");
  var offenVon = null;          // Knopf, der die Ansicht geöffnet hat
  var knoten = {};              // id -> {el, kopf, koerper, werk, neu, sig}
  var abschnittKnoten = {};     // Schlüssel -> <h3>
  var bearbeiten = {};          // id -> {text, meldungen}: offenes Textfeld
  var erw = {};                 // MF5: id -> true: „Erweitert“ am Baustein offen (Text des ganzen Bausteins)
  var offen = null;             // MF5: offenes Feld einer Stelle {id, nr, panel, ziel, slot, s}
  var neuOffen = {};            // id -> true: Teil „Neu schreiben lassen“ offen
  var neuText = {};             // id -> Text für den Chat, vorbereitet (Kopieren in der Geste, Safari)
  var stand = null, standSig = "", lauf = 0, timer = null, pruefTimer = {}, wunschTimer = {}, bilderSig = "";
  var UE = "uebersicht", ueZiel = null;      // §9: Kursübersicht als erster Eintrag; offenes Formular („kopf“, „abschnitt:n“)
  var hilfe = {};               // typ -> [Zeile] (prompt.format_hilfe)
  var loeschLaeuft = false;     // AP13.30: „Löschen“ an einer leeren Kachel läuft
  var teilKnoten = {};          // AP13.30: id des unteren Bausteins -> {el, b, ka, offen}: „Hier neue Kachel beginnen“
  var BREIT = window.matchMedia ? matchMedia("(min-width: 1100px)") : { matches: true };
  // AP13.45 (Heuristik B14): unter 1000 px gibt es keinen schwebenden Knopf; „Einheit ansehen“ an der Karte und das Menü
  // führen in die Ansicht
  var SCHMAL = window.matchMedia ? matchMedia("(max-width: 999px)") : { matches: false };
  var ZEIGER = window.matchMedia ? matchMedia("(hover: hover)") : { matches: false };    // AP13.45: „Ändern“ beim Überfahren
  var ueAuf = false;            // AP13.45 (Heuristik B12): die Kursübersicht ist eingeklappt, die Bausteine stehen vorn
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
    // AP13.44 §1: Übungsblöcke sind bedienbar wie im Kurs (uebungen.js je Block, siehe uebungenAn)
    ".km-ed-inhalt .kmb { pointer-events: auto; }",
    ".km-vorschau-video { background: #eef0f3; color: #4b5563; padding: 28px 16px; text-align: center; border-radius: 6px; }",
    // MF5: Stellen zum Ändern (Absatz, Liste); das Feld steht an ihrem Platz (slot), die Stelle ist solange verborgen
    ".km-ed-inhalt .km-stelle { pointer-events: auto; cursor: pointer; border-radius: 4px; }",
    ".km-ed-inhalt .km-stelle:hover { outline: 2px dashed #8a6416; outline-offset: 3px; }",
    ".km-ed-inhalt .km-stelle-offen { display: none !important; }",
    // AP13.45 B4: je Stelle ein Knopf „Ändern“ hinter ihr; er erscheint, sobald er den Fokus hat, über dem Anfang dessen,
    // was folgt (ohne den Text zu verschieben, sonst ginge ein Klick daneben), die Stelle bekommt dann den Rahmen. Der
    // Inhalt selbst bleibt Absatz, Liste oder Überschrift
    ".km-ed-inhalt .km-aendern { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; " +
        "overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }",
    // AP13.45 (09.11.): mit der Maus erscheint er auch beim Überfahren der Stelle (Klasse km-zeigen, nur bei hover: hover)
    ".km-ed-inhalt .km-aendern:focus, .km-ed-inhalt .km-aendern.km-zeigen { z-index: 1; width: auto; height: auto; margin: 4px 0 0; padding: 5px 14px; " +
        "overflow: visible; clip: auto; border: 1px solid #8a6416; border-radius: 6px; background: #ffffff; color: #1d2125; " +
        "font: 600 14px/1.3 system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif; cursor: pointer; pointer-events: auto; " +
        "outline: 3px solid #8a6416; outline-offset: 2px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25); }",
    ".km-ed-inhalt .km-aendern.km-zeigen:not(:focus) { outline: none; }",
    ".km-ed-inhalt .km-stelle:has(+ .km-aendern:focus), .km-ed-inhalt .km-stelle:has(+ .km-aendern.km-zeigen) { " +
        "outline: 2px dashed #8a6416; outline-offset: 3px; }",
    "slot[name=km-stelle] { display: block; }"
  ].join("\n");

  function sichtbar() { return !!(Z.mappe && Z.pruefung && Z.pruefung.bausteine && Z.pruefung.bausteine.length); }
  function karte(id) { return S.karteNach(id); }
  function pruef(id) { return Z.pruefung ? Z.pruefung.bausteine.filter(function (b) { return b.id === id; })[0] : null; }
  function ki() { return !!(S.anKiAktiv && S.anKiAktiv()); }

  function knoepfeZeigen() {
    var da = sichtbar();
    ["editor-auf", "editor-auf-2", "editor-auf-5", "editor-auf-8"].forEach(function (id) {
      var b = $(id); b.hidden = !da;
      // MF4: an der Zeile „Einheit“ heißt er „Ansehen“; MF5: in Schritt 5 „Einheit ansehen“ (schritte.js weiterFuenf)
      if (S.katalog && id !== "editor-auf-8" && id !== "editor-auf-5") b.textContent = T("knopf");
    });
    // AP13.43 §5: in Schritt 5 erst, wenn nichts mehr rot ist (vorher steht dort die Korrektur)
    $("editor-auf-5").hidden = !da || S.fehlerZahl() > 0 || S.teileOffen();
    // MF3: in Schritt 5 ein Knopf: ohne Rot der neben „Weiter“, mit Rot (dort keiner) der unter den Karten in „Erweitert“
    if ($("karten-ort-5").contains($("editor-auf-2")) && !$("editor-auf-5").hidden) $("editor-auf-2").hidden = true;
    // AP13.38: der schwebende Knopf; AP13.44 §2: wie in Schritt 5 erst, wenn nichts rot ist. Das Wort darauf ist kürzer,
    // der Name für Vorlesegeräte nicht
    var sw = $("editor-schweb"), gruen = da && !S.fehlerZahl() && !S.teileOffen() && !SCHMAL.matches;
    sw.hidden = !gruen;
    document.body.classList.toggle("mit-editor-schweb", gruen);
    document.documentElement.classList.toggle("mit-editor-schweb", gruen);
    if (S.weiterFuenf) S.weiterFuenf();
    if (S.katalog) { $("editor-schweb-text").textContent = T("schweb"); sw.setAttribute("aria-label", T("schweb") + ": " + T("knopf")); }   // WCAG 2.5.3: Name beginnt mit dem sichtbaren Wort
    leisteZeigen();
  }

  // ---------------------------------------------------------------- Leiste unten (AP13.44 §3)
  // „Zurück zu den Schritten“ und „Weiter: <nächster offener Schritt>“ (nachbau.js S.naechsterOffen, S.weiterZu); ohne
  // nächsten Schritt (etwas rot, vor Schritt 5, offen ist der aktuelle) ist „Zurück“ der Hauptknopf
  function leisteZeigen() {
    if (!S.katalog) return;
    var n = S.naechsterOffen ? S.naechsterOffen() : null, sec = n ? S.sektion(n) : null;
    var titel = sec ? sec.dataset.kurz || sec.querySelector(".s-titel").textContent.trim() : "";   // MF1: Name wie „Weiter: Bilder“
    var w = $("editor-weiter"), z = $("editor-zurueck");
    z.textContent = T("zurueck_schritte");
    w.hidden = !titel;
    w.dataset.nr = titel ? String(n) : "";
    w.textContent = titel ? T("weiter_zu", { titel: titel }) : "";
    z.classList.toggle("haupt", !titel);
  }
  function zurueck() {
    var v = offenVon, s = S.schritt(), sec = S.sektion(s);
    fokusDanach = function () {
      // der Knopf, der den Editor geöffnet hat, wenn er im aktuellen Schritt steht; sonst die Überschrift des Schritts
      if (v && sec && sec.contains(v) && S.fokus([v])) { v.scrollIntoView({ block: "center" }); return; }
      if (!sec || sec.hidden) { S.fokus([v, "kopf-menue", "editor-auf-2"], true); return; }
      sec.scrollIntoView({ block: "start" });
      S.fokus([sec.querySelector(".s-kopf")], true);
    };
    schliessen();
  }
  function weiter() {
    var n = parseFloat($("editor-weiter").dataset.nr);
    if (!n) return;
    fokusDanach = function () { S.weiterZu(n); };
    schliessen();
  }
  $("editor-zurueck").onclick = zurueck;
  $("editor-weiter").onclick = weiter;

  // ---------------------------------------------------------------- Öffnen, Schließen, Esc
  function oeffnen(von) {
    if (!sichtbar()) return;
    offenVon = von || null;
    $("editor-titel").textContent = T("titel");
    $("editor-zu").setAttribute("aria-label", T("schliessen"));
    $("editor-zu").title = T("schliessen");
    $("editor-liste-titel").textContent = BREIT.matches ? T("liste") : T("liste_auf");
    $("editor-liste").open = BREIT.matches;
    meldungenWeg();
    leisteZeigen();
    S.einheitGesehen = true;       // MF5: Schritt 5 zeigt danach „Weiter: …“ als Hauptknopf
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    document.body.classList.add("editor-offen");
    return aktualisieren();
  }
  function schliessen() { stelleZu(false); if (dlg.open) dlg.close(); }
  // fokusDanach: wer die Ansicht schließt und den Fokus woandershin schickt (Firefox feuert `close` erst nach einem
  // setTimeout 0; sonst holte der Knopf, der die Ansicht geöffnet hat, den Fokus zurück)
  var fokusDanach = null;
  dlg.addEventListener("close", function () {
    document.body.classList.remove("editor-offen");
    stelleZu(false);
    if (S.weiterFuenf) S.weiterFuenf();
    var v = offenVon; offenVon = null;
    if (fokusDanach) { var f = fokusDanach; fokusDanach = null; setTimeout(f, 0); return; }
    // AP13.33 §2.1: über das Handymenü geöffnet, ist der Knopf jetzt zugeklappt; dann der Menüknopf
    S.fokus([v, "kopf-menue", "editor-auf-2"], true);
  });
  // Esc: zuerst ein offenes Formular, ein offenes Textfeld oder „Neu schreiben lassen“ (das mit dem Fokus, sonst das
  // zuletzt geöffnete), dann die Ansicht. AP13.33 §2.2: ein geändertes Textfeld fragt „Änderungen verwerfen?“ (Esc in der
  // Frage heißt weiter bearbeiten); Esc in „Neu schreiben lassen“ schließt nur dieses und nimmt die Vormerkung zurück
  // Chromium lässt ein abgefangenes `cancel` ohne Nutzeraktion dazwischen nur einmal zu (Esc zählt nicht); darum wirkt Esc
  // schon beim Tastendruck, `cancel` bleibt für andere Wege (Zurück-Geste)
  function escInnen() {
    if (offen) { stelleZu(true); return true; }
    if (ueZiel) { ueZu(); return true; }
    var teilOffen = Object.keys(teilKnoten).filter(function (id) { return teilKnoten[id].offen; })[0];
    if (teilOffen) { teilenZu(teilOffen, true); return true; }
    var a = document.activeElement, drin = a && a.closest && a.closest(".ed-b"), id = drin ? drin.dataset.id : null;
    var imNeu = !!(id && neuOffen[id] && a.closest(".ed-b-neu"));
    if (imNeu || (id && neuOffen[id] && !bearbeiten[id])) { neuZu(id, true, true); return true; }
    if (!(id && bearbeiten[id])) id = Object.keys(bearbeiten).pop() || null;
    if (!id) { id = Object.keys(neuOffen).pop() || null; if (id) { neuZu(id, true, true); return true; } return false; }
    abbrechenFragen(id);
    return true;
  }
  dlg.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !ev.defaultPrevented && escInnen()) { ev.preventDefault(); ev.stopPropagation(); }
  });
  dlg.addEventListener("cancel", function (ev) { if (escInnen()) ev.preventDefault(); });
  $("editor-zu").onclick = schliessen;
  ["editor-auf", "editor-auf-2", "editor-auf-5", "editor-auf-8", "editor-schweb"].forEach(function (id) {
    $(id).onclick = function () { oeffnen($(id)); }; });
  // AP13.45 (Heuristik B14): wird das Fenster schmal oder breit, kommt oder geht der schwebende Knopf
  if (SCHMAL.addEventListener) SCHMAL.addEventListener("change", function () { if (S.katalog) knoepfeZeigen(); });
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
  // AP13.45: wer auf aktualisieren() wartet, wartet auch auf einen Lauf, der inzwischen begonnen hat (sonst setzte er den
  // Fokus in die alte Fläche, die der neuere Lauf gleich ersetzt)
  var laufend = null;
  async function aktualisieren() {
    var p = laufend = aktualisierenLauf();
    await p;
    while (laufend !== p) { p = laufend; await p; }
  }
  async function aktualisierenLauf() {
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
  // AP13.33 §1.6: dieselbe Nummer wie an der Karte und am Rand (karten.js S.nummer, ausgeschaltete Karten zählen nicht)
  function nummer(id, i) { return S.nummer(id) || i + 1; }
  function handArt(id) { var h = Z.mappe && Z.mappe.hand && Z.mappe.hand[id]; return h ? (h.art === "neu" ? "neu" : "hand") : ""; }
  function handText(id) { return handArt(id) === "neu" ? T("neu_geschrieben") : T("hand"); }

  // AP13.33 §1.5: Meldung zur letzten Handlung am betroffenen Baustein (nicht im Kopf der Ansicht); die nächste Handlung
  // nimmt sie weg
  function meldung(id, text, art) {
    meldungenWeg();
    var k = knoten[id]; if (!k || !k.meldung) return;
    k.meldung.className = "ed-b-meldung" + (art ? " " + art : "");
    k.meldung.textContent = text || "";
  }
  function meldungenWeg() {
    Object.keys(knoten).forEach(function (id) { var m = knoten[id].meldung; if (m && m.textContent) m.textContent = ""; });
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
    var mehrE = S.mehrereEinheiten(), letzteE = null;          // AP13.35 §4.2: Überschrift je Einheit
    stand.bausteine.forEach(function (b, i) {
      if (b.typ === "Unterabschnitt") return;
      var e = karte(b.id) ? S.einheitVon(karte(b.id)) : letzteE || "e1";
      if (mehrE && e !== letzteE) {
        letzteE = e;
        ol.appendChild(el("li", { cls: "ed-l-einheit-li" }, [el("p", { cls: "ed-l-einheit", text: S.einheitName(e) })]));
      }
      var st = statusVon(b);
      ol.appendChild(el("li", {}, [el("button", { type: "button", cls: "ed-sprung", "data-ziel": b.id }, [
        el("span", { cls: "ed-nr", text: String(nummer(b.id, i)) }),
        el("span", { cls: "ed-l-text" }, [el("span", { cls: "ed-l-typ", text: S.formularname(b.typ) }),
          el("span", { cls: "ed-l-titel", text: b.titel })]),
        S.handGeaendert(b.id) ? el("span", { cls: "ed-l-hand", title: handText(b.id), "aria-label": handText(b.id),
            text: "✎" }) : null,
        el("span", { cls: "ed-punkt status-" + st, title: STATUS[st] || st }, [el("span", { cls: "unsichtbar",
            text: STATUS[st] || st })])])]));
    });
  }
  $("editor-liste-ol").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-ziel]"); if (!b) return;
    var k = knoten[b.dataset.ziel]; if (!k) return;
    if (b.dataset.ziel === UE && !ueAuf) { ueAuf = true; uebersichtEintrag(); }
    if (!BREIT.matches) $("editor-liste").open = false;
    zeigen(k.el);
    var t = k.kopf.querySelector(".ed-b-titel");
    if (t) t.focus({ preventScroll: true });
  });

  // Baustein oben in den Bildlauf der Ansicht holen (unter der Leiste „Bausteine anzeigen“); nur .ed-rumpf scrollt
  // AP13.45 B5: bei geringer Höhe scrollt die ganze Ansicht (Kopf und Leiste unten laufen mit)
  function zeigen(knoten_) {
    var rumpf = dlg.querySelector(".ed-rumpf"), sc = rumpf.scrollHeight > rumpf.clientHeight + 1 ? rumpf : dlg;
    var leiste = getComputedStyle($("editor-liste")).position === "sticky" && !BREIT.matches ? $("editor-liste").offsetHeight : 0;
    sc.scrollTop += knoten_.getBoundingClientRect().top - Math.max(0, sc.getBoundingClientRect().top) - leiste - 8;
  }
  // AP13.30: Kacheln (Abschnitte `## `) mit Nummer und den ids ihrer Bausteine, aus der Vorschau
  var ALLGEMEIN = ["allgemeines", "allgemein", "0"];
  function kacheln() {
    return (stand.abschnitte || []).map(function (a, i) {
      return { nr: i + 1, titel: a.titel, ids: a.bausteine, teil: a.teil || "", allgemein: ALLGEMEIN.indexOf(String(
          a.titel || "").toLowerCase()) >= 0 };
    });
  }
  function kachelVon(id) { return kacheln().filter(function (a) { return a.ids.indexOf(id) >= 0; })[0] || null; }
  var importHinweis = {};
  var hinweisEl = el("p", { cls: "ed-stelle-hinweis" });
  function zeichneVorschau() {
    var box = $("editor-vorschau"), soll = [], gesehen = {}, letzter = null, nAbschnitt = 0, vorige = null;
    if (!stand.bausteine.length) { box.textContent = T("leer"); return; }
    if (stand.uebersicht) { soll.push(uebersichtEintrag().el); gesehen[UE] = 1; }
    // MF5: ein Satz über den Bausteinen (nach der Kursübersicht, die ihren eigenen hat), wie man eine Stelle ändert
    hinweisEl.textContent = TS(S.beruehrung && S.beruehrung() ? "hinweis_touch" : "hinweis");
    soll.push(hinweisEl);
    var imp = (Z.mappe && Z.mappe.importiert) || [], letzteU = null;
    stand.bausteine.forEach(function (b, i) {
      // AP13.42 B6: vor der ersten Karte einer Einheit, die schon im Kurs liegt, steht der Hinweis
      var einh = karte(b.id) ? S.einheitVon(karte(b.id)) : letzteU || "e1";
      if (einh !== letzteU) {
        letzteU = einh;
        if (imp.indexOf(einh) >= 0) {
          var hn = importHinweis[einh] || (importHinweis[einh] = el("p", { cls: "ed-importiert", role: "note" }));
          hn.textContent = T("importiert_hinweis");
          soll.push(hn); gesehen["imp:" + einh] = 1;
        }
      }
      if (b.abschnitt !== letzter) {
        nAbschnitt += 1; letzter = b.abschnitt; vorige = null;
        var schl = nAbschnitt + "|" + (b.abschnitt || "");
        var h = abschnittKnoten[schl] || (abschnittKnoten[schl] = el("h3", { cls: "ed-abschnitt", text: b.abschnitt ||
            "" }));
        soll.push(h);
      }
      // §1: zwischen zwei Bausteinen derselben Kachel „Hier neue Kachel beginnen“ (nicht in „Allgemeines“)
      if (b.ebene === 3) {
        var ka = kachelVon(b.id);
        if (vorige && ka && !ka.allgemein) { soll.push(teilenEintrag(b, ka)); gesehen["teilen:" + b.id] = 1; }
        vorige = b;
      }
      var k = eintrag(b, i);
      gesehen[b.id] = 1;
      soll.push(k.el);
    });
    Object.keys(knoten).forEach(function (id) { if (!gesehen[id]) { delete knoten[id]; delete bearbeiten[id];
        delete neuOffen[id]; delete erw[id]; if (offen && offen.id === id) offen = null; } });
    Object.keys(teilKnoten).forEach(function (id) { if (!gesehen["teilen:" + id]) delete teilKnoten[id]; });
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
      k.meldung = el("p", { cls: "ed-b-meldung", role: "status" });
      k.koerper = el("div", { cls: "ed-b-koerper" });
      k.liste = el("div", { cls: "ed-stellen", hidden: true });   // MF5: Stellen, die die Vorschau nicht zeigt
      k.werk = el("div", { cls: "ed-b-werk", hidden: true });
      k.neu = el("div", { cls: "ed-b-neu", hidden: true });
      k.el.append(k.kopf, k.meldung, k.koerper, k.liste, k.werk, k.neu);
    }
    k.b = b;
    zeichneKopf(k, b, i);
    var s = JSON.stringify([b.html, b.platzhalter, bilderSig, b.stellen, frageVor(b.id)]);
    if (s !== k.sig) {
      k.sig = s;
      if (offen && offen.id === b.id) stelleZu(false);
      try { zeichneKoerper(k, b); } catch (e) {        // eine Fläche hält die übrigen nicht auf
        console.error("Vorschau", b.id, e);
        k.koerper.textContent = "";
        k.koerper.appendChild(el("div", { cls: "ed-platz ed-platz-fehler" }, [el("p", { text: T("platzhalter_fehler") })]));
      }
      try { stellenAn(k, b); } catch (e) { console.error("Stellen", b.id, e); }
    }
    k.koerper.hidden = !!bearbeiten[b.id];
    k.liste.hidden = !!bearbeiten[b.id] || !k.liste.childNodes.length;
    if (neuOffen[b.id] && !(karte(b.id) || {}).neu) neuZu(b.id);       // eingesetzt oder an der Karte zurückgenommen
    return k;
  }

  function zeichneKopf(k, b, i) {
    var st = statusVon(b), hand = S.handGeaendert(b.id), offen = !!bearbeiten[b.id], neu = !!neuOffen[b.id], roh = null;
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
      hand ? el("span", { cls: "ed-hand", text: handText(b.id) }) : null,
      st === "fehler" ? el("span", { cls: "ed-status fehler", text: STATUS.fehler }) : null]);
    var knoepfe = null;
    if (b.typ !== "Unterabschnitt") {
      // MF5 (Befund 14): der Text des ganzen Bausteins (`### Typ`, Drehbuch-Zeichen) liegt hinter „Erweitert“; der erste
      // Weg zum Ändern ist das Feld an der Stelle
      var eo = !!(erw[b.id] || offen);
      knoepfe = el("span", { cls: "ed-b-knoepfe" }, [
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "neu", "aria-expanded": String(neu),
            "aria-label": T("neu_schreiben") + ": " + b.titel, text: T("neu_schreiben") }),
        hand ? el("button", { type: "button", cls: "textlink ed-zurueck", "data-aktion": "zuruecknehmen",
            text: handArt(b.id) === "neu" ? T("neu_zuruecknehmen") : T("zuruecknehmen") }) : null, inKachel(b),
        el("button", { type: "button", cls: "textlink ed-erweitert", "data-aktion": "erweitert", "aria-expanded": String(eo),
            "aria-label": TS("erweitert") + ": " + b.titel, text: TS("erweitert") })]);
      var roh = eo ? el("div", { cls: "ed-b-erweitert" }, [
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "bearbeiten", "aria-expanded": String(offen),
            "aria-label": TS("als_text") + ": " + b.titel, text: TS("als_text") })]) : null;
    }
    k.kopf.append(titel, marken, knoepfe || "", roh || "");
    // rote Meldungen wie an der Karte (auch Regeln der Einheit, die erst der ganze Stand kennt)
    var dg = Z.pruefung ? Z.pruefung.diagnosen.filter(function (d) { return d.baustein === b.id && d.stufe === "fehler"; })
      : [];
    if (dg.length && !(b.platzhalter && b.platzhalter.art === "fehler")) k.kopf.appendChild(el("ul", { cls: "ed-meldungen" },
        dg.map(function (d) { return el("li", { cls: "fehler", text: (d.zeile_im_baustein ? "Zeile " +
            (d.zeile_editor || d.zeile_im_baustein) + " im Feld: " : "") + d.text }); })));
    if (fokus) {
      var f = fokus === "titel" ? titel : k.kopf.querySelector("[data-aktion='" + fokus + "']");
      if (f) f.focus({ preventScroll: true });
    }
  }

  // AP13.30 §1: Auswahl „In Kachel …“ mit den Kacheln der Einheit; die Wahl setzt den Baustein ans Ende der gewählten.
  // Nicht an Bausteinen in einem Unterabschnitt: dort hinaus wäre aus `####` ein `###` (der Baustein änderte sich)
  function inKachel(b) {
    if (b.ebene !== 3 || b.typ === "Unterabschnitt" || b.typ === "Banner") return null;
    // nur Kacheln derselben Einheit (`teil`); sonst liefert die Nachlieferung doppelt oder zu wenig
    var ka = kachelVon(b.id), ziele = kacheln().filter(function (a) { return !a.allgemein && ka && a.teil === ka.teil; });
    if (!ka || ziele.length < (ka.allgemein ? 1 : 2)) return null;
    var zahl = {};
    ziele.forEach(function (a) { zahl[a.titel] = (zahl[a.titel] || 0) + 1; });
    var sel = el("select", { cls: "ed-in-kachel", "data-aktion": "in-kachel", "aria-label": T("in_kachel") + ": " + b.titel });
    if (ka.allgemein) sel.appendChild(el("option", { value: "", text: ka.titel, disabled: true }));
    ziele.forEach(function (a) {
      sel.appendChild(el("option", { value: String(a.nr), text: a.titel + (zahl[a.titel] > 1 ? " (" + a.nr + ")" : "") }));
    });
    sel.value = ka.allgemein ? "" : String(ka.nr);
    return el("label", { cls: "ed-in-kachel-l" }, [el("span", { cls: "ed-in-kachel-t", "aria-hidden": "true",
        text: T("in_kachel") }), sel]);
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
    ebenen(innen, aktiv ? 4 : 5);
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
    uebungenAn(innen);
    if (aktiv) {
      // §9: Kurstitel, Abschnitte und Kacheln sind bedienbar (Tabulator, Enter, Leertaste); Pfeile verschieben
      // AP13.45 B4: der Kurstitel bleibt Überschrift (mit der Maus anklickbar); mit der Tastatur führt „Kurstitel ändern“
      // im Kopf der Kursübersicht dorthin
      Array.prototype.forEach.call(innen.querySelectorAll("[data-ziel]:not([data-ziel=kopf])"), function (x) {
        x.setAttribute("tabindex", "0");
        x.setAttribute("role", "button");
        x.setAttribute("aria-label", x.dataset.ziel === "weitere" ? T("weitere") : T("abschnitt_titel") + ": " +
            (x.dataset.titel || x.textContent));
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

  // AP13.45 B7: Überschriften der Fläche (wie auf der Kursseite h1 bis h3) bekommen ihre Ebene unter der Überschrift des
  // Bausteins (h4) bzw. der Kursübersicht (h3); die oberste Ebene der Fläche wird `oben`
  function ebenen(innen, oben) {
    var hs = innen.querySelectorAll("h1, h2, h3, h4, h5, h6"), min = 6;
    Array.prototype.forEach.call(hs, function (h) { min = Math.min(min, +h.tagName.charAt(1)); });
    Array.prototype.forEach.call(hs, function (h) {
      var n = +h.tagName.charAt(1), soll = Math.min(6, oben + n - min);
      if (soll !== n) h.setAttribute("aria-level", String(soll));
    });
  }

  // AP13.44 §1: je Übungsblock (`.kmb`) das Skript der Übungen aus dem Kurs (web/uebungen.js aus
  // scripts/templates/uebungen.js); nur das HTML des Generators, nichts aus der Antwort wird ausgeführt. Ein Block wird
  // einmal angebunden (`data-km-an` wie im Kurs); eine neu gezeichnete Fläche ist ein neuer Block. Die Bedienelemente
  // bekommen ihren Tab-Halt zurück (api.vorschau_sicher nimmt ihn allen). Bilder: Adresse aus den hochgeladenen Bildern,
  // sonst der graue Platzhalter
  function uebungenAn(innen) {
    if (!km.uebungenAn) return;
    Array.prototype.forEach.call(innen.querySelectorAll(".kmb"), function (R) {
      if (R.getAttribute("data-km-an")) return;
      R.setAttribute("data-km-an", "1");
      Array.prototype.forEach.call(R.querySelectorAll("button, input, select, textarea, summary"), function (x) {
        if (x.getAttribute("tabindex") === "-1") x.removeAttribute("tabindex"); });
      var IMG = {};
      Array.prototype.forEach.call(R.querySelectorAll("[data-km-img]"), function (x) {
        var n = x.getAttribute("data-km-img"); IMG[n] = Z.assets[n] ? S.vorschauUrl(n) : BILD_FEHLT; });
      try { km.uebungenAn(R, IMG); } catch (e) { console.error("Übung in der Vorschau", e); }
    });
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
      k.meldung = el("p", { cls: "ed-b-meldung", role: "status" });
      k.zeile = el("p", { cls: "ed-ue-zeile" });
      k.koerper = el("div", { cls: "ed-b-koerper" });
      k.werk = el("div", { cls: "ed-b-werk ed-ue-werk", hidden: true });
      k.el.append(k.kopf, k.meldung, k.zeile, k.koerper, k.werk);
    }
    k.b = { id: UE, titel: T("uebersicht") };
    zeichneUeKopf(k, u);
    k.zeile.textContent = T(S.beruehrung() ? "uebersicht_zeile_touch" : "uebersicht_zeile") + (u.format === "wochen" && !S.angaben.start ? " " + T("wochen_start") : "");
    var s = JSON.stringify([u.html, bilderSig]);
    if (s !== k.sig) {
      // AP13.33 §2.1: lag der Fokus in der alten Fläche (Kurstitel, Kachel, Pfeil), geht er an dieselbe Stelle der neuen
      var alt = k.koerper.firstChild, inAlt = alt && document.activeElement === alt && alt.shadowRoot &&
          alt.shadowRoot.activeElement, wo = inAlt ? (inAlt.dataset.ziel ? "[data-ziel='" + inAlt.dataset.ziel + "']" :
          inAlt.dataset.aktion ? "[data-aktion='" + inAlt.dataset.aktion + "'][data-nr='" + inAlt.dataset.nr + "']" : "") : "";
      k.sig = s; k.koerper.textContent = "";
      try { k.koerper.appendChild(flaeche(u.html, true)); } catch (e) { console.error("Vorschau", UE, e); }
      var neu = wo && k.koerper.firstChild && k.koerper.firstChild.shadowRoot &&
          k.koerper.firstChild.shadowRoot.querySelector(wo + ":not([disabled])");
      if (neu) neu.focus({ preventScroll: true });
    }
    if (ueZiel && !ueAbschnitt(ueZiel) && ueZiel !== "kopf" && ueZiel !== "weitere") ueZu(true);
    if (!ueAuf && ueZiel) ueZu(true);
    k.zeile.hidden = k.koerper.hidden = !ueAuf;
    k.el.classList.toggle("ed-ue-zu", !ueAuf);
    return k;
  }
  // AP13.45 (Heuristik B12): „Kursübersicht anzeigen“ klappt Darstellung, Kurstitel und Kacheln auf; der Fokus bleibt am Knopf
  function ueUmschalten() {
    ueAuf = !ueAuf;
    uebersichtEintrag();
    var k = knoten[UE], f = k && k.kopf.querySelector("[data-aktion=ue-auf]");
    if (f) f.focus({ preventScroll: true });
  }
  function zeichneUeKopf(k, u) {
    var a = document.activeElement, fokus = a && k.kopf.contains(a) ? (a.dataset.wert || a.dataset.aktion || a.className) : "";
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
    // AP13.45 B7: Kursübersicht auf der Ebene der Kacheln (h3), ihr Kurstitel darunter
    k.kopf.append(el("h3", { cls: "ed-b-titel", id: "ed-t-" + UE, tabindex: "-1" }, [el("span", { cls: "ed-titel-text",
        text: T("uebersicht") })]),
      el("span", { cls: "ed-marken" }, [ueHand() ? el("span", { cls: "ed-hand", text: T("hand") }) : null]),
      // AP13.33 §1.10: der Kurstitel ist auch ohne Klick in die Vorschau zu finden
      el("span", { cls: "ed-b-knoepfe" }, [
        ueAuf ? el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "kurstitel",
            "aria-expanded": String(ueZiel === "kopf"), text: T("kurstitel_aendern") }) : null,
        el("button", { type: "button", cls: "textlink ed-ue-auf", "data-aktion": "ue-auf", "aria-expanded": String(ueAuf),
            text: T(ueAuf ? "uebersicht_zu" : "uebersicht_auf") })]),
      ueAuf ? el("div", { cls: "ed-darstellung-l" }, [el("span", { cls: "ed-darstellung-t", text: T("darstellung") }), wahl]) : "");
    if (fokus) {
      var f = k.kopf.querySelector("[data-wert='" + fokus + "']") || k.kopf.querySelector("[data-aktion='" + fokus + "']") ||
          k.kopf.querySelector("." + String(fokus).split(" ")[0]);
      if (f) f.focus({ preventScroll: true });
    }
    if (S.radioTabs) S.radioTabs();
  }
  function ueAbschnitt(ziel) {
    var nr = parseInt(String(ziel).replace("abschnitt:", ""), 10);
    return (stand.uebersicht.abschnitte || []).filter(function (a) { return a.nr === nr && !a.allgemein; })[0] || null;
  }
  function ueKlick(ev) {
    var t = ev.target.closest && ev.target.closest("[data-aktion], [data-ziel]");
    if (!t) return;
    meldungenWeg();
    if (t.dataset.aktion === "hoch" || t.dataset.aktion === "runter") {
      ev.stopPropagation();
      if (!t.disabled) verschieben(parseInt(t.dataset.nr, 10), t.dataset.aktion === "hoch" ? -1 : 1).catch(S.zeigeFehler);
      return;
    }
    if (t.dataset.aktion === "kachel-loeschen") {
      ev.stopPropagation();
      if (loeschLaeuft) return;                       // Doppelklick: ein Aufruf
      loeschLaeuft = true; t.disabled = true;
      kachelLoeschen(parseInt(t.dataset.nr, 10)).catch(S.zeigeFehler).then(function () { loeschLaeuft = false;
          t.disabled = false; });
      return;
    }
    if (t.dataset.ziel === "weitere") weitereFormular();
    else if (t.dataset.ziel) ueFormular(t.dataset.ziel);
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
      var o = S.katalog.oberflaeche, kachel = u.format === "kacheln";
      if (kachel) {
        var bilder = Object.keys(Z.assets).filter(function (n) { return /\.(png|jpe?g)$/i.test(n); }).sort();
        teile.push(el("div", { cls: "ed-ue-reihe" }, [
          el("label", { cls: "feld ed-feld" }, [T("kachelbild"), auswahl("ed-ue-bild", [{ wert: "", text: T("kachelbild_keins") }]
              .concat(bilder.map(function (n) { return { wert: n, text: n }; })), a.angaben.kachelbild, T("kachelbild"))]),
          el("label", { cls: "knopf klein-knopf ed-ue-hochladen" }, [T("kachelbild_hochladen"), el("input", { type: "file",
              cls: "unsichtbar ed-ue-datei", accept: "image/png,image/jpeg" })])]));
        // AP13.33 §1.8: mit Kachelbild sind Symbol und Farbe auf der Kachel nicht zu sehen
        teile.push(el("p", { cls: "ed-ue-hinweis ed-ue-bild-hinweis", text: T("kachelbild_hinweis"), hidden: !a.angaben.kachelbild }));
        teile.push(el("label", { cls: "feld ed-feld" }, [T("kachelicon"), auswahl("ed-ue-icon",
            [{ wert: "", text: T("kachelicon_keins") }].concat(o.kachelicon), a.angaben.kachelicon, T("kachelicon"))]));
      }
      // AP13.33 §1.8: die Farbe gilt für den ganzen Abschnitt, auch für Kästen und Rahmen (gen/kursdatei.py, Abschnittsfarbe)
      teile.push(el("label", { cls: "feld ed-feld" }, [T("farbe"), auswahl("ed-ue-farbe",
          [{ wert: "", text: T("farbe_kurs") }].concat(o.farbe.filter(function (w) { return w.wert; })),
          a.angaben.farbe, T("farbe"))]));
      teile.push(el("p", { cls: "ed-ue-hinweis ed-ue-farbe-hinweis", text: T(kachel ? "farbe_hinweis_kachel" :
          "farbe_hinweis_abschnitt") }));
      // AP13.33 §1.8: am Rand (und bei nur einer Kachel) gesperrt wie die Pfeile in der Vorschau
      // AP13.37 §3: nur innerhalb der Einheit (wie „In Kachel …“)
      var reihe = (u.abschnitte || []).filter(function (x) { return !x.allgemein && (x.einheit || "") === (a.einheit || ""); }),
          stelle = reihe.indexOf(a);
      var quer = kachel || u.format === "einthemen";
      teile.push(el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "ue-hoch", disabled: stelle <= 0,
            text: quer ? T("links") : T("hoch") }),
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "ue-runter",
            disabled: stelle < 0 || stelle >= reihe.length - 1, text: quer ? T("rechts") : T("runter") })]));
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
    titel.focus({ preventScroll: true }); titel.select();
    // AP13.33 §1.8: das Formular steht unter der Vorschau; die Ansicht springt dorthin, „Übernehmen“ ist im Blick
    k.werk.scrollIntoView({ block: "nearest" });
    var kn = k.kopf.querySelector("[data-aktion=kurstitel]"); if (kn) kn.setAttribute("aria-expanded", String(ziel === "kopf"));
  }
  function bildHinweis() {
    var k = knoten[UE], sel = k && k.werk.querySelector(".ed-ue-bild"), p = k && k.werk.querySelector(".ed-ue-bild-hinweis");
    if (sel && p) p.hidden = !sel.value;
  }
  function ueZu(stumm) {
    var k = knoten[UE], ziel = ueZiel;
    ueZiel = null;
    if (!k) return;
    k.werk.hidden = true; k.werk.textContent = "";
    var kn = k.kopf.querySelector("[data-aktion=kurstitel]"); if (kn) kn.setAttribute("aria-expanded", "false");
    if (stumm) return;
    var f = null;
    try { f = ziel && k.koerper.firstChild && k.koerper.firstChild.shadowRoot &&
        k.koerper.firstChild.shadowRoot.querySelector("[data-ziel='" + ziel + "'][tabindex]"); } catch (e) { f = null; }
    (f || (ziel === "kopf" && k.kopf.querySelector("[data-aktion=kurstitel]")) || k.kopf.querySelector(".ed-b-titel"))
        .focus({ preventScroll: true });
  }
  async function ueUebernehmen() {
    var k = knoten[UE], ziel = ueZiel; if (!k || !ziel) return;
    // nur Felder, die die Lehrkraft geändert hat (sonst gingen Werte außerhalb der Listen verloren)
    var w = function (c) { var x = k.werk.querySelector("." + c); return x && x.value !== x.dataset.alt ? x.value : undefined; };
    var mfeld = k.werk.querySelector(".ed-ue-meldung"), titel = w("ed-ue-titel");
    await km.bereit();
    if (ziel === "kopf" && titel === undefined) { ueZu(); return; }
    if (ziel === "kopf") {
      var r = await km.mappeFn("kurstitel_setzen", [Z.kurs_md, Z.steckbrief_text, titel]);
      if (r.fehler) { mfeld.textContent = r.fehler; mfeld.className = "ed-meldungen ed-ue-meldung fehler"; return; }
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
      if (r2.fehler) { mfeld.textContent = r2.fehler; mfeld.className = "ed-meldungen ed-ue-meldung fehler"; return; }
      ueZu();
      // AP13.30: Abschnitte mit Handänderung nach diesem (neuer Titel = neuer Vorgänger) ziehen nach
      if (r2.vorher !== r2.nachher) await S.gliederungAendern(r2.kurs_md, [{ schluessel: r2.schluessel, vorher: r2.vorher,
          werte: { nachher: r2.nachher } }].concat(r2.hand || []), []);
    }
    await aktualisieren();
    meldung(UE, T("uebernommen"));
    ueFokus(ziel);
  }
  // Fokus auf die Stelle in der (neu gebauten) Übersicht, sonst auf ihre Überschrift
  function ueFokus(ziel) {
    var k = knoten[UE]; if (!k) return;
    var root = k.koerper.firstChild && k.koerper.firstChild.shadowRoot;
    var f = root && root.querySelector("[data-ziel='" + ziel + "'][tabindex]");
    (f || (ziel === "kopf" && k.kopf.querySelector("[data-aktion=kurstitel]")) || k.kopf.querySelector(".ed-b-titel"))
        .focus({ preventScroll: true });
  }
  async function verschieben(nr, richtung) {
    await km.bereit();
    var r = await km.mappeFn("abschnitt_verschieben", [Z.kurs_md, nr, richtung, Z.mappe.hand || {}]);
    if (r.nach === nr) return;
    if (ueZiel === "abschnitt:" + nr) ueZiel = "abschnitt:" + r.nach;
    // §8.7: Verschieben ist eine Handänderung des Abschnitts (Kopf und Vorgänger); Rückgängig und Moduswechsel gelten nicht mehr
    // AP13.30: auch die Nachbarkachel bekommt ihren neuen Vorgänger, falls sie eine Handänderung trägt
    await S.gliederungAendern(r.kurs_md, [{ schluessel: r.schluessel, vorher: r.vorher, werte: { nachher: r.nachher,
        nach: r.vorgaenger } }].concat(r.hand || []), []);
    await aktualisieren();
    var k = knoten[UE], root = k && k.koerper.firstChild && k.koerper.firstChild.shadowRoot;
    var f = root && (root.querySelector("[data-aktion=" + (richtung < 0 ? "hoch" : "runter") + "][data-nr='" + r.nach + "']:not([disabled])")
        || root.querySelector("[data-ziel='abschnitt:" + r.nach + "']"));
    if (f) f.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- Gliederung (AP13.30)
  // Kachel teilen, Baustein in eine andere Kachel, leere Kachel löschen: gen/mappe.py stellt die Zeilen der Kursdatei
  // um (die Bausteine bleiben Byte für Byte); karten.js gliederungAendern merkt es als Handänderung der Abschnitte.
  // -> Ergebnis von gen/mappe.py; mit `fehler` ist nichts geändert. Die Meldung steht an `ort` (Baustein oder Übersicht)
  async function gliederung(funktion, args, satz, ort) {
    await km.bereit();
    var r = await km.mappeFn(funktion, args.concat([Z.mappe.hand || {}]));
    if (r.fehler) { meldung(ort, r.fehler, "fehler"); return r; }
    if (r.kurs_md === Z.kurs_md) return r;
    await S.gliederungAendern(r.kurs_md, r.hand, r.weg);
    await aktualisieren();
    meldung(ort, satz);
    return r;
  }
  function teilenEintrag(b, ka) {
    var t = teilKnoten[b.id];
    if (!t) t = teilKnoten[b.id] = { el: el("div", { cls: "ed-teilen", "data-id": b.id }), offen: false };
    var neu = !t.b || t.b.titel !== b.titel || t.ka.titel !== ka.titel;
    t.b = b; t.ka = ka;
    if (neu && !t.offen) zeichneTeilen(t);
    return t.el;
  }
  function zeichneTeilen(t) {
    t.el.textContent = "";
    t.el.classList.toggle("offen", t.offen);
    if (!t.offen) {
      t.el.appendChild(el("button", { type: "button", cls: "ed-teilen-knopf", "data-aktion": "teilen",
          "aria-label": T("teilen") + ": " + t.b.titel, text: T("teilen") }));
      return;
    }
    var titel = el("input", { type: "text", cls: "ed-teilen-titel", maxlength: "120" });
    titel.value = T("teil_2", { titel: t.ka.titel });
    t.el.setAttribute("role", "group");
    t.el.setAttribute("aria-label", T("teilen") + ": " + t.b.titel);
    t.el.append(el("label", { cls: "feld ed-feld" }, [T("teilen_titel"), titel]),
      el("p", { cls: "ed-meldungen ed-teilen-meldung fehler", role: "status" }),
      el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf haupt", "data-aktion": "teilen-ok", text: T("uebernehmen") }),
        el("button", { type: "button", cls: "knopf", "data-aktion": "teilen-abbrechen", text: T("abbrechen") })]));
    titel.focus(); titel.select();
  }
  function teilenZu(id, fokus) {
    var t = teilKnoten[id]; if (!t) return;
    t.offen = false; t.el.removeAttribute("role"); t.el.removeAttribute("aria-label");
    zeichneTeilen(t);
    if (fokus) t.el.querySelector("button").focus();
  }
  async function kachelTeilen(id) {
    var t = teilKnoten[id]; if (!t) return;
    var titel = t.el.querySelector(".ed-teilen-titel").value;
    var r = await gliederung("kachel_teilen", [Z.kurs_md, id, titel], T("geteilt"), id);
    if (r.fehler) { meldungenWeg(); t.el.querySelector(".ed-teilen-meldung").textContent = r.fehler; return; }
    delete teilKnoten[id];
    var f = knoten[id] && knoten[id].kopf.querySelector(".ed-b-titel");
    if (f) { zeigen(knoten[id].el); f.focus({ preventScroll: true }); }
  }
  async function bausteinVerschieben(id, nr) {
    if (!nr) return;
    await gliederung("baustein_verschieben", [Z.kurs_md, id, nr], T("verschoben"), id);
    var k = knoten[id];
    if (k) { zeigen(k.el); var f = k.kopf.querySelector(".ed-in-kachel"); if (f) f.focus({ preventScroll: true }); }
  }
  async function kachelLoeschen(nr) {
    if ((await gliederung("kachel_loeschen", [Z.kurs_md, nr], T("geloescht"), UE)).fehler) return;
    var k = knoten[UE]; if (k) k.kopf.querySelector(".ed-b-titel").focus({ preventScroll: true });
  }

  // §2: „Weitere Einheit“ am Ende der Übersicht: Thema und Dauer, dann derselbe Weg wie „Einheit hinzufügen“
  // (nachbau.js S.weitereEinheit), Text aus chat.js (S.texteErzeugen), Einsetzen über S.eingabeUebernehmen (Modus
  // „anhaengen“, gen/mappe.py anhaengen); die Antwort steht danach als neue Kachel(n) am Ende
  function offeneEinheit() {
    return !!(Z.mappe && Z.mappe.anhaengen && Z.mappe.bausteine.some(function (k) {
      return k.einheit === Z.mappe.anhaengen && k.geplant; }));
  }
  function weitereFormular() {
    var k = knoten[UE]; if (!k) return;
    ueZiel = "weitere";
    k.werk.textContent = "";
    k.werk.setAttribute("role", "group");
    k.werk.setAttribute("aria-label", T("weitere"));
    k.werk.hidden = false;
    if (offeneEinheit()) {                 // schon angelegt, noch ohne Antwort: gleich der Text
      k.werk.appendChild(el("p", { cls: "ed-ue-zeile", text: T("weitere_laeuft") }));
      S.texteErzeugen().then(function () { if (ueZiel === "weitere") weitereText(); }).catch(S.zeigeFehler);
      return;
    }
    var thema = el("input", { type: "text", cls: "ed-w-thema", maxlength: "120", autocomplete: "off" });
    var minuten = el("input", { type: "number", cls: "ed-w-minuten", min: "10", max: "300", inputmode: "numeric" });
    minuten.value = String((Z.mappe.einheit && Z.mappe.einheit.minuten) || 45);
    k.werk.append(el("p", { cls: "ed-ue-zeile", text: T("weitere_zeile") }),
      el("div", { cls: "ed-ue-reihe" }, [el("label", { cls: "feld ed-feld ed-w-thema-l" }, [T("weitere_thema"), thema]),
        el("label", { cls: "feld ed-feld ed-w-minuten-l" }, [T("weitere_minuten"), minuten])]),
      el("p", { cls: "ed-meldungen ed-ue-meldung", role: "status" }),
      el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf haupt", "data-aktion": "weitere-erstellen",
            text: T(S.zweig() === "steuer" ? "weitere_planen" : "weitere_erstellen") }),
        el("button", { type: "button", cls: "knopf", "data-aktion": "ue-abbrechen", text: T("abbrechen") })]));
    thema.focus();
  }
  async function weitereErstellen(knopf) {
    var k = knoten[UE]; if (!k) return;
    var thema = k.werk.querySelector(".ed-w-thema").value.replace(/\s+/g, " ").trim();
    var minuten = k.werk.querySelector(".ed-w-minuten").value.trim(), m = k.werk.querySelector(".ed-ue-meldung");
    var fehler = !thema ? [T("weitere_thema_fehlt"), ".ed-w-thema"] : !/^\d+$/.test(minuten) || +minuten < 10 ||
        +minuten > 300 ? [T("weitere_minuten_falsch"), ".ed-w-minuten"] : null;
    if (fehler) { m.textContent = fehler[0]; m.className = "ed-meldungen ed-ue-meldung fehler"; k.werk.querySelector(fehler[1])
        .focus(); return; }
    knopf.disabled = true;
    m.textContent = T("weitere_laeuft"); m.className = "ed-meldungen ed-ue-meldung";
    try {
      await km.bereit();
      var plan = S.zweig() === "steuer";
      await S.weitereEinheit(thema, parseInt(minuten, 10));
      if (plan) {                 // AP13.35 §4.1: „Ich steuere“: weiter im Plan der neuen Einheit (Schritt 2)
        ueZu(true);
        var zumPlan = function () { S.fokus([document.querySelector("#plan [data-aktion=k-plus]"), "weiter-2"]); };
        if (dlg.open) { fokusDanach = zumPlan; schliessen(); } else setTimeout(zumPlan, 0);
        return;
      }
      await S.texteErzeugen();
      if (ueZiel === "weitere") weitereText();
    } finally { knopf.disabled = false; }
  }
  function weitereKnopfText() {
    var tx = S.texte, n = tx.teile.length;
    return n > 1 ? T(ki() ? "weitere_teil_ki" : "weitere_teil", { n: tx.teil + 1 }) : ki() ? T("an_ki") : T("text_kopieren");
  }
  function weitereText() {
    var k = knoten[UE]; if (!k) return;
    var e = (Z.mappe && Z.mappe.einheit) || {};
    var feld = el("textarea", { cls: "unsichtbar ed-w-feld", readonly: true, "aria-hidden": "true", tabindex: "-1" });
    feld.value = S.texte.teile[S.texte.teil] || "";
    k.werk.textContent = "";
    k.werk.append(el("p", { cls: "ed-ue-zeile", text: T("weitere") + ": " + (e.thema || "") + (e.minuten ? " · " +
        e.minuten + " min" : "") }),
      el("div", { cls: "kopieren" }, [el("button", { type: "button", cls: "knopf haupt", "data-aktion": "weitere-kopieren",
          disabled: !feld.value || (S.kiBesetzt && S.kiBesetzt()), text: weitereKnopfText() })]),
      el("p", { cls: "stand ed-w-kopiert", role: "status" }),
      feld,
      el("label", { cls: "feld ed-feld" }, [T("antwort"), el("textarea", { cls: "ed-antwort ed-w-antwort", rows: "4",
          spellcheck: "false" })]),
      el("div", { cls: "kopieren" }, [el("button", { type: "button", cls: "knopf", "data-aktion": "weitere-einsetzen",
          text: T("einsetzen") })]),
      el("p", { cls: "stand-karte ed-w-stand", role: "status", "aria-live": "polite", hidden: true }),
      el("div", { cls: "stand-karte fehler diagnose-karte ed-w-diagnose", role: "status", hidden: true }),
      el("div", { cls: "ed-knoepfe" }, [el("button", { type: "button", cls: "knopf", "data-aktion": "ue-abbrechen",
          text: T("schliessen") })]));
    k.werk.querySelector("[data-aktion=weitere-kopieren]").focus();
  }
  function weitereStand(x, art) { var p = knoten[UE] && knoten[UE].werk.querySelector(".ed-w-stand"); if (p) S.standKarte(p, x, art); }
  function weitereKopieren() {
    var k = knoten[UE], tx = S.texte, t = tx.teile[tx.teil]; if (!k || !t) return;
    var antwort = k.werk.querySelector(".ed-w-antwort"), knopf = k.werk.querySelector("[data-aktion=weitere-kopieren]");
    var n = tx.teil + 1, mehr = tx.teile.length > 1;
    var weiter = function () {
      knopf.textContent = weitereKnopfText();
      k.werk.querySelector(".ed-w-feld").value = tx.teile[tx.teil] || "";
    };
    if (ki()) {
      return S.anKi(t, { einheit: S.einheitTag(), neu: tx.teil === 0, ort: k.werk.querySelector(".ed-w-stand"),
        feld: "eingabe", vorher: function () { S.textKopiert(true); weiter(); }, stand: weitereStand,
        fertig: function (a) { antwort.value = a; return weitereEinsetzen(); } });
    }
    S.kopieren(t, k.werk.querySelector(".ed-w-feld"), k.werk.querySelector(".ed-w-kopiert"),
        mehr ? T("weitere_teil_kopiert", { n: n }) : T("weitere_kopiert"), function () {
      S.textKopiert(); weiter();
      km.kurzmeldung(knopf, T("text_kopieren"));
      antwort.focus({ preventScroll: true });
    });
  }
  async function weitereEinsetzen() {
    var k = knoten[UE]; if (!k || ueZiel !== "weitere") return;
    var antwort = k.werk.querySelector(".ed-w-antwort");
    var ok = await S.eingabeUebernehmen(null, { text: antwort.value, stand: weitereStand,
      diagnose: function (d) { var box = k.werk.querySelector(".ed-w-diagnose"); if (box) S.diagnoseKarte(box, d); },
      leeren: function () { antwort.value = ""; } });
    if (!ok) return;
    if (offeneEinheit() || (S.teileOffen && S.teileOffen())) {
      k.werk.querySelector("[data-aktion=weitere-kopieren]").textContent = weitereKnopfText();
      await aktualisieren();
      return;
    }
    ueZu(true);
    await aktualisieren();
    meldung(UE, T("weitere_eingesetzt"));
    var root = knoten[UE] && knoten[UE].koerper.firstChild && knoten[UE].koerper.firstChild.shadowRoot;
    var alle = root ? root.querySelectorAll("[data-ziel^='abschnitt:']") : [];
    var f = alle.length ? alle[alle.length - 1] : knoten[UE] && knoten[UE].kopf.querySelector(".ed-b-titel");
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
    stelleZu(false);
    erw[id] = true;
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
    k.liste.hidden = true;
    zeichneKopf(k, b, 0);
    // AP13.33 §2.6: Cursor und Ansicht am Textanfang (Überschrift und erster Satz im Blick)
    feld.focus({ preventScroll: true });
    feld.setSelectionRange(0, 0);
    feld.scrollTop = 0;
    k.werk.scrollIntoView({ block: "nearest" });
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
  // AP13.33 §2.2: Esc mit geändertem Text fragt „Änderungen verwerfen?“ unter dem Feld; Esc in der Frage oder „Weiter
  // bearbeiten“ führt zurück ins Feld, „Verwerfen“ schließt es ohne Änderung
  // AP13.36 §1.3: „Abbrechen“ und der Knopf „Bearbeiten“ fragen wie Esc (`esc`); ist die Frage schon da, wirken sie nicht
  // wie „Weiter bearbeiten“ (nur Esc), sondern führen zu ihr
  function abbrechenFragen(id, esc) {
    var e = bearbeiten[id], k = knoten[id]; if (!e || !k) return;
    var frage = k.werk.querySelector(".ed-verwerfen");
    if (frage) { if (esc === false) frage.querySelector("[data-aktion=verwerfen-nein]").focus(); else verwerfenZu(id); return; }
    if (String(e.text).trim() === String(k.b.text).trim()) { abbrechen(id); return; }
    frage = el("div", { cls: "ed-verwerfen", role: "group", "aria-label": T("verwerfen_frage") }, [
      el("p", { text: T("verwerfen_frage") }),
      el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf", "data-aktion": "verwerfen-ja", text: T("verwerfen_ja") }),
        el("button", { type: "button", cls: "knopf haupt", "data-aktion": "verwerfen-nein", text: T("weiter_bearbeiten") })])]);
    k.werk.querySelector(".ed-knoepfe").after(frage);
    frage.querySelector("[data-aktion=verwerfen-nein]").focus();
  }
  function verwerfenZu(id) {
    var k = knoten[id], frage = k && k.werk.querySelector(".ed-verwerfen"); if (!frage) return;
    frage.remove();
    var f = k.werk.querySelector(".ed-text"); if (f) f.focus();
  }
  function abbrechen(id) {
    var k = knoten[id];
    delete bearbeiten[id];
    if (!k) return;
    k.werk.hidden = true; k.werk.textContent = ""; k.koerper.hidden = false; k.liste.hidden = !k.liste.childNodes.length;
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
      if (k) { k.werk.hidden = true; k.werk.textContent = ""; k.koerper.hidden = false; k.liste.hidden = !k.liste.childNodes.length; }
      await aktualisieren();
      meldung(id, T("uebernommen"));
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
    // AP13.35 §3.5: das Feld beginnt leer (eigener Wunsch, `wunsch`); der Auftrag aus dem Plan steht darüber und geht
    // wie bisher in den Text
    wunsch.value = kt.wunsch || "";
    var auftrag = String(kt.auftrag || "").trim();
    var feld = el("textarea", { cls: "unsichtbar ed-neu-feld", readonly: true, "aria-hidden": "true", tabindex: "-1" });
    var antwort = el("textarea", { cls: "ed-antwort", rows: "4", spellcheck: "false" });
    k.neu.textContent = "";
    k.neu.setAttribute("role", "group");
    k.neu.setAttribute("aria-label", T("neu_schreiben") + ": " + k.b.titel);
    k.neu.append(
      auftrag ? el("p", { cls: "ed-plan-auftrag", text: T("auftrag_plan", { text: auftrag }) }) : "",
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
  // `fokus`: der Fokus geht auf „Neu schreiben lassen“ dieses Bausteins (Esc)
  function neuZu(id, abwaehlen, fokus) {
    var k = knoten[id], kt = karte(id);
    delete neuOffen[id]; delete neuText[id];
    if (abwaehlen && kt) delete kt.wunsch;
    if (abwaehlen && kt && kt.neu) { kt.neu = false; S.korrektur.text = ""; S.zeichneKarten(); S.zeichneKorrektur();
        S.geaendert(); S.korrekturSpaeter(0); }
    if (!k) return;
    k.neu.hidden = true; k.neu.textContent = "";
    zeichneKopf(k, k.b, 0);
    if (fokus) S.fokus([k.kopf.querySelector("[data-aktion=neu]")], true);
  }
  // AP13.33 §1.1: je offenes Feld der Text nur für diesen Baustein, mit dem Wunsch, der beim Bauen im Feld stand
  // (`wunsch`); „Text kopieren“ baut neu, wenn sich der Wunsch seitdem geändert hat
  function wunschJetzt(id) { var kt = karte(id); return (kt && kt.wunsch) || ""; }
  async function textVorbereiten(id) {
    var k = knoten[id]; if (!k || !neuOffen[id]) return null;
    var knopf = k.neu.querySelector("[data-aktion=neu-kopieren]"), wunsch = wunschJetzt(id), md = Z.kurs_md;
    try {
      var t = await S.korrekturText([id]);
      if (!neuOffen[id] || !knoten[id]) return null;
      if (wunschJetzt(id) !== wunsch || Z.kurs_md !== md) return textVorbereiten(id);   // inzwischen geändert
      neuText[id] = { text: t, wunsch: wunsch, md: md };
      k.neu.querySelector(".ed-neu-feld").value = t;
      knopf.disabled = !t || (S.kiBesetzt && S.kiBesetzt());
      knopf.textContent = ki() ? T("an_ki") : T("text_kopieren");
      return neuText[id];
    } catch (e) { S.zeigeFehler(e); return null; }
  }
  function neuStand(id, x, art) {
    var k = knoten[id]; if (!k) return;
    var p = k.neu.querySelector(".ed-neu-stand"); if (p) S.standKarte(p, x, art);
  }
  // AP13.33 N5: ist der Text älter als der Wunsch, entsteht er neu; das Kopieren beginnt trotzdem in der Geste
  // (S.kopierenSpaeter), damit Safari es nicht als Kopieren ohne Klick ablehnt
  function neuKopieren(id) {
    var k = knoten[id], v = neuText[id]; if (!k || !v) return;
    var antwort = k.neu.querySelector(".ed-antwort"), feld = k.neu.querySelector(".ed-neu-feld");
    // Nachprüfung 29.10.: auch nach „Bearbeiten“/„Übernehmen“ am Baustein neu bauen; alte Meldung „Kopiert“ weg
    var stand = k.neu.querySelector(".ed-neu-kopiert"), alt = v.wunsch !== wunschJetzt(id) || v.md !== Z.kurs_md;
    if (stand) stand.textContent = "";
    if (alt) clearTimeout(wunschTimer[id]);
    var text = alt ? textVorbereiten(id).then(function (x) { return x ? x.text : ""; }) : Promise.resolve(v.text);
    if (ki()) {
      return text.then(function (t) {
        if (!t) return;
        return S.anKi(t, { einheit: S.einheitTag(), neu: false, ort: k.neu.querySelector(".ed-neu-stand"),
          feld: "korrektur", vorher: S.korrekturVermerken, stand: function (x, art) { neuStand(id, x, art); },
          fertig: function (a) { antwort.value = a; return neuEinsetzen(id); } });
      });
    }
    var fertig = function () {
      km.kurzmeldung(k.neu.querySelector("[data-aktion=neu-kopieren]"), T("text_kopieren"));
      antwort.focus({ preventScroll: true });
    };
    S.korrekturVermerken();
    if (!alt) return S.kopieren(v.text, feld, stand, T("kopiert"), fertig);
    return S.kopierenSpaeter(text, feld, stand, T("kopiert"), fertig);
  }
  async function neuEinsetzen(id) {
    var k = knoten[id]; if (!k) return;
    var antwort = k.neu.querySelector(".ed-antwort");
    var ok = await S.korrekturEinsetzen({ text: antwort.value, sprung: false, fokus: false, nur: id,
      stand: function (x, art) { neuStand(id, x, art); },
      diagnose: function (d) { var box = k.neu.querySelector(".ed-neu-diagnose"); if (box) S.diagnoseKarte(box, d); },
      leeren: function () { antwort.value = ""; } });
    if (!ok) return;
    if (!(karte(id) || {}).neu) {
      neuZu(id);
      await aktualisieren();
      meldung(id, T("eingesetzt"));
      // AP13.33 §2.3: Fokus auf den eingesetzten Baustein, die Ansicht zeigt seinen Anfang
      var k2 = knoten[id], t = k2 && k2.kopf.querySelector(".ed-b-titel");
      if (t) { zeigen(k2.el); t.focus({ preventScroll: true }); }
    }
  }

  // ---------------------------------------------------------------- Feld für eine Stelle (MF5, Befund 14)
  // Die Stellen kommen aus gen/stelle.py (api.einheit_vorschau, `stellen`): Absatz, Liste, Frage (MC), Aussage (RF), Text mit
  // Lücken. Absätze und Listen sind in der Vorschau anklickbar (`data-km-z`, Zeile im Feld); die übrigen (Übungen als
  // Platzhalter oder als bedienbarer Block) stehen als Liste unter der Vorschau. Das Feld zeigt keinen Rohtext: Haken,
  // Malpunkte, Pfeile und Sterne setzt gen/stelle.py. „Übernehmen“ geht über denselben Parser (stelle_setzen, dann
  // karten.js handUebernehmen); ein Fehler kommt als Satz für die Seite zurück, übernommen wird dann nichts.
  var UEBUNG = { Quiz: 1, Test: 1, Lesebuch: 1, "Lückentext": 1 };
  function stellen(id) { return ((knoten[id] || {}).b || {}).stellen || []; }
  function stelleVon(id, nr) { return stellen(id).filter(function (s) { return s.nr === nr; })[0] || null; }
  // Nummer der ersten Frage des Bausteins in „Fragen und Lösungen“ (über die Einheit gezählt), 0 ohne Fragen
  function frageVor(id) {
    var f = (S.fragenListe || []).filter(function (x) { return x.baustein === id; })[0];
    return f ? f.nr - 1 : 0;
  }
  // Fragen heißen wie in „Fragen und Lösungen“ („Frage 3“, über die Einheit gezählt), die übrigen nach ihrer Art
  function stelleName(id, s) {
    var namen = (S.katalog && S.katalog.oberflaeche.stelle && S.katalog.oberflaeche.stelle.name) || {};
    return s.frage ? (namen.Frage || "Frage") + " " + (frageVor(id) + s.frage) : namen[s.name] || s.name;
  }
  function stelleKurz(s) {
    var w = s.werte, t = s.art === "liste" ? w.punkte.join(" · ") : s.art === "mc" ? w.frage : s.art === "rf" ? w.aussage :
        s.art === "luecken" ? (w.aufgabe || w.text) : w.text;
    t = String(t || "").replace(/\s+/g, " ").trim();
    return t.length > 60 ? t.slice(0, 59) + "…" : t;
  }
  function stelleLabel(id, s) { return TS("aendern") + ": " + stelleName(id, s) + " „" + stelleKurz(s) + "“"; }
  function stellenAn(k, b) {
    var st = b.stellen || [], host = k.koerper.querySelector(".ed-flaeche"), root = host && host.shadowRoot, da = {};
    if (root) {
      Array.prototype.forEach.call(root.querySelectorAll("[data-km-z]"), function (x) {
        if (x.closest(".kmb")) return;                          // bedienbare Übung: ihre Stellen stehen in der Liste
        var s = st.filter(function (y) { return String(y.z) === x.getAttribute("data-km-z") && !da[y.nr] &&
            (y.art === "absatz" || y.art === "liste"); })[0];
        if (!s) return;
        da[s.nr] = true;
        // AP13.45 B4: die Stelle bleibt, was sie ist (Absatz, Liste, Überschrift, voller Text im Lesemodus); mit der
        // Maus ist sie anklickbar, mit der Tastatur führt der Knopf „Ändern“ direkt dahinter zum Feld
        x.classList.add("km-stelle");
        x.setAttribute("data-km-nr", String(s.nr));
        x.after(el("button", { type: "button", cls: "km-aendern", "data-km-nr": String(s.nr), "aria-label": stelleLabel(b.id, s),
            text: TS("aendern") }));
      });
      // AP13.45 (09.11.): mit der Maus steht „Ändern“ auch, solange der Zeiger auf der Stelle oder dem Knopf ist; ein kurzer
      // Nachlauf trägt ihn über den Abstand zwischen beiden. Auf Touch-Geräten (hover: none) bleibt es beim Fokus
      var hoverAus = null;
      var hoverWeg = function () { Array.prototype.forEach.call(root.querySelectorAll(".km-zeigen"), function (y) {
        y.classList.remove("km-zeigen"); }); };
      var stelleVon = function (t) { return t && t.closest ? t.closest(".km-stelle, .km-aendern") : null; };
      root.addEventListener("mouseover", function (ev) {
        var x = stelleVon(ev.target); if (!x || !ZEIGER.matches) return;
        clearTimeout(hoverAus);
        var nr = x.getAttribute("data-km-nr"), k = root.querySelector(".km-aendern[data-km-nr='" + nr + "']");
        Array.prototype.forEach.call(root.querySelectorAll(".km-zeigen"), function (y) { if (y !== k) y.classList.remove("km-zeigen"); });
        if (k) k.classList.add("km-zeigen");
      });
      root.addEventListener("mouseout", function (ev) {
        var x = stelleVon(ev.target); if (!x) return;
        var nach = stelleVon(ev.relatedTarget);
        if (nach && nach.getAttribute("data-km-nr") === x.getAttribute("data-km-nr")) return;
        clearTimeout(hoverAus);
        hoverAus = setTimeout(hoverWeg, 600);
      });
      root.addEventListener("click", function (ev) {
        var x = ev.target.closest && ev.target.closest(".km-stelle, .km-aendern"); if (!x) return;
        ev.preventDefault();
        clearTimeout(hoverAus); hoverWeg();
        var nr = parseInt(x.getAttribute("data-km-nr"), 10);
        stelleAuf(b.id, nr, x.classList.contains("km-aendern") ? root.querySelector(".km-stelle[data-km-nr='" + nr + "']") : x);
      });
    }
    var rest = st.filter(function (s) { return !da[s.nr]; });
    k.liste.textContent = "";
    if (rest.length) {
      k.liste.append(el("p", { cls: "ed-stellen-titel", text: TS(UEBUNG[b.typ] ? "liste_uebung" : "liste_sonst") }),
        el("ul", { cls: "ed-stellen-ul" }, rest.map(function (s) {
          return el("li", { cls: "ed-stelle-zeile", "data-nr": String(s.nr) }, [
            el("span", { cls: "ed-stelle-name", text: stelleName(b.id, s) }),
            el("span", { cls: "ed-stelle-kurz", text: stelleKurz(s) }),
            el("button", { type: "button", cls: "knopf klein-knopf ed-stelle-auf", "data-aktion": "stelle-auf",
                "data-nr": String(s.nr), "aria-label": stelleLabel(b.id, s), text: TS("aendern") })]);
        })));
    }
    k.liste.hidden = !rest.length || !!bearbeiten[b.id];
  }
  // Ort der Stelle: das anklickbare Element in der Vorschau oder ihre Zeile in der Liste
  function stelleOrt(id, nr) {
    var k = knoten[id]; if (!k) return null;
    var host = k.koerper.querySelector(".ed-flaeche"), root = host && host.shadowRoot;
    return (root && root.querySelector(".km-stelle[data-km-nr='" + nr + "']")) ||
        k.liste.querySelector(".ed-stelle-zeile[data-nr='" + nr + "']");
  }

  // Fokus für eine Stelle: in der Vorschau ihr Knopf „Ändern“, in der Liste der Knopf ihrer Zeile
  function stelleKnopf(ort) {
    if (!ort) return null;
    if (ort.classList.contains("ed-stelle-zeile")) return ort.querySelector(".ed-stelle-auf");
    var n = ort.nextElementSibling;
    while (n && n.tagName === "SLOT") n = n.nextElementSibling;
    return n && n.classList.contains("km-aendern") ? n : ort;
  }
  function feld(label, eingabe, cls) { return el("label", { cls: "feld ed-feld " + (cls || "") }, [label, eingabe]); }
  function textfeld(cls, wert, zeilenzahl) {
    var t = el("textarea", { cls: cls, rows: String(zeilenzahl || Math.min(8, Math.max(2, Math.ceil(String(wert || "").length / 70)))),
        spellcheck: "true" });
    t.value = wert || "";
    return t;
  }
  function zeile(cls, wert, label) {
    var i = el("input", { type: "text", cls: cls, spellcheck: "true" });
    if (label) i.setAttribute("aria-label", label);
    i.value = wert || "";
    return i;
  }
  function antwortZeile(n, a) {
    var r = el("div", { cls: "ed-st-antwort" });
    var c = el("input", { type: "checkbox", cls: "ed-st-richtig" }); c.checked = !!a.richtig;
    r.append(el("label", { cls: "ed-st-richtig-l" }, [c, el("span", { text: TS("feld_richtig") })]),
        zeile("ed-st-antwort-text", a.text, TS("feld_antwort", { n: n })));
    var cb = r.querySelector(".ed-st-richtig");
    cb.setAttribute("aria-label", TS("feld_richtig") + ": " + TS("feld_antwort", { n: n }));
    return r;
  }
  function lueckeZeile(n, l) {
    var r = el("div", { cls: "ed-st-luecke" });
    r.append(feld(TS("feld_luecke", { n: n }), zeile("ed-st-loesung", l.loesung)),
        feld(TS("feld_auch"), zeile("ed-st-auch", (l.auch || []).join(", "))));
    if (l.tipp !== null && l.tipp !== undefined) r.appendChild(feld(TS("feld_tipp"), zeile("ed-st-tipp", l.tipp)));
    return r;
  }
  function lueckenNummern(box) {
    Array.prototype.forEach.call(box.querySelectorAll(".ed-st-luecke"), function (r, i) {
      var l = r.querySelector(".ed-feld"); if (l && l.firstChild && l.firstChild.nodeType === 3) l.firstChild.nodeValue = TS("feld_luecke", { n: i + 1 });
    });
  }
  // Zahl der ___ im Text und Zeilen der Lösungen gleich halten: neue ___ bekommen an ihrer Stelle eine leere Zeile, eine
  // gelöschte ___ nimmt ihre Zeile mit (Stelle über den gemeinsamen Anfang des alten und neuen Texts)
  function lueckenAbgleich(feldT) {
    var p = feldT.closest(".ed-stelle"), box = p && p.querySelector(".ed-st-luecken"); if (!box) return;
    var alt = feldT.dataset.alt || "", neu = feldT.value, re = /_{3,}/g;
    var zahl = function (t) { return (t.match(re) || []).length; };
    var d = zahl(neu) - box.querySelectorAll(".ed-st-luecke").length;
    if (d) {
      var gemein = 0;
      while (gemein < alt.length && gemein < neu.length && alt[gemein] === neu[gemein]) gemein += 1;
      while (gemein > 0 && alt[gemein - 1] === "_") gemein -= 1;        // mitten in ___ zählt die Lücke ab ihrem Anfang
      var vorher = zahl(neu.slice(0, gemein)), zeilen = box.querySelectorAll(".ed-st-luecke");
      if (d > 0) for (var i = 0; i < d; i++) {
        var z = lueckeZeile(0, { loesung: "", auch: [] }), nach = zeilen[vorher + i - 1];
        if (vorher + i === 0) box.insertBefore(z, box.firstChild); else if (nach) nach.after(z); else box.appendChild(z);
        zeilen = box.querySelectorAll(".ed-st-luecke");
      } else for (var j = 0; j < -d; j++) { var w = box.querySelectorAll(".ed-st-luecke")[vorher]; if (w) w.remove(); }
      lueckenNummern(box);
    }
    feldT.dataset.alt = neu;
  }
  function antwortDazu() {
    if (!offen) return;
    var box = offen.panel.querySelector(".ed-st-antworten"); if (!box) return;
    var r = antwortZeile(box.querySelectorAll(".ed-st-antwort").length + 1, { text: "", richtig: false });
    box.appendChild(r);
    r.querySelector(".ed-st-antwort-text").focus();
  }
  function stellePanel(id, s) {
    var w = s.werte, teile = [], titel = stelleName(id, s);
    // Absatz und Liste: der Name der Stelle ist die Beschriftung des Felds (keine Überschrift darüber)
    if (s.art === "absatz") teile.push(feld(titel, textfeld("ed-st-text", w.text)));
    else if (s.art === "liste") {
      teile.push(feld(titel + " · " + TS("feld_liste"), textfeld("ed-st-punkte", w.punkte.join("\n"), Math.min(10, w.punkte.length + 1))));
    } else if (s.art === "mc") {
      teile.push(feld(TS("feld_frage"), textfeld("ed-st-frage", w.frage, 2)));
      var box = el("div", { cls: "ed-st-antworten" });
      w.antworten.forEach(function (a, i) { box.appendChild(antwortZeile(i + 1, a)); });
      teile.push(el("fieldset", { cls: "ed-st-gruppe" }, [el("legend", { text: TS("feld_antworten") }),
        el("p", { cls: "ed-st-satz", text: TS("satz_richtig") }), box,
        el("button", { type: "button", cls: "textlink ed-st-dazu", "data-aktion": "stelle-dazu", text: TS("antwort_dazu") })]));
    } else if (s.art === "rf") {
      teile.push(feld(TS("feld_aussage"), textfeld("ed-st-aussage", w.aussage, 2)));
      var name = "ed-st-rf-" + id + "-" + s.nr;
      var radio = function (wert, text) {
        var r = el("input", { type: "radio", name: name, value: wert, cls: "ed-st-rf" }); r.checked = (wert === "ja") === !!w.richtig;
        return el("label", { cls: "ed-st-wahl" }, [r, el("span", { text: text })]);
      };
      teile.push(el("fieldset", { cls: "ed-st-gruppe" }, [el("legend", { text: TS("rf_gruppe") }), radio("ja", TS("rf_ja")),
        radio("nein", TS("rf_nein"))]));
    } else if (s.art === "luecken") {
      if (w.aufgabe !== null && w.aufgabe !== undefined) teile.push(feld(TS("feld_aufgabe"), zeile("ed-st-aufgabe", w.aufgabe)));
      var lt = textfeld("ed-st-luecken-text", w.text, Math.min(8, Math.max(3, Math.ceil(w.text.length / 70) + w.text.split("\n").length - 1)));
      lt.dataset.alt = w.text;
      teile.push(feld(TS("feld_luecken_text"), lt), el("p", { cls: "ed-st-satz", text: TS("satz_luecken") }));
      var lb = el("div", { cls: "ed-st-luecken" });
      w.luecken.forEach(function (l, i) { lb.appendChild(lueckeZeile(i + 1, l)); });
      teile.push(lb);
    }
    teile.push(el("div", { cls: "ed-stelle-meldung", role: "alert", hidden: true }),
      el("div", { cls: "ed-knoepfe" }, [
        el("button", { type: "button", cls: "knopf haupt", "data-aktion": "stelle-ok", text: T("uebernehmen") }),
        el("button", { type: "button", cls: "knopf", "data-aktion": "stelle-abbrechen", text: T("abbrechen") })]));
    return el("div", { cls: "ed-stelle", role: "group", "aria-label": TS("aendern") + ": " + titel },
      (s.art === "absatz" || s.art === "liste" ? [] : [el("p", { cls: "ed-stelle-titel", text: titel })]).concat(teile));
  }
  function stelleWerte(p, s) {
    var q = function (c) { var x = p.querySelector("." + c); return x ? x.value : ""; };
    if (s.art === "absatz") return { text: q("ed-st-text") };
    if (s.art === "liste") return { punkte: q("ed-st-punkte").split("\n") };
    if (s.art === "mc") return { frage: q("ed-st-frage"), antworten: Array.prototype.map.call(p.querySelectorAll(".ed-st-antwort"),
        function (r) { return { text: r.querySelector(".ed-st-antwort-text").value, richtig: r.querySelector(".ed-st-richtig").checked }; }) };
    if (s.art === "rf") { var r = p.querySelector(".ed-st-rf:checked"); return { aussage: q("ed-st-aussage"), richtig: !!r && r.value === "ja" }; }
    var w = { text: q("ed-st-luecken-text"), luecken: Array.prototype.map.call(p.querySelectorAll(".ed-st-luecke"), function (r) {
      var t = r.querySelector(".ed-st-tipp");
      return { loesung: r.querySelector(".ed-st-loesung").value, auch: r.querySelector(".ed-st-auch").value, tipp: t ? t.value : null };
    }) };
    if (s.werte.aufgabe !== null && s.werte.aufgabe !== undefined) w.aufgabe = q("ed-st-aufgabe");
    return w;
  }
  // Feld öffnen an der Stelle `ort` (Element in der Vorschau: das Feld steht an seinem Platz; Zeile der Liste: in ihr)
  function stelleAuf(id, nr, ort) {
    var k = knoten[id], s = stelleVon(id, nr); if (!k || !s) return false;
    if (offen && offen.id === id && offen.nr === nr) { fokusIn(offen.panel); return true; }
    stelleZu(false);
    if (bearbeiten[id]) return false;                      // der ganze Text ist offen: dort ändern
    meldungenWeg();
    ort = ort || stelleOrt(id, nr);
    var p = stellePanel(id, s), slot = null;
    if (ort && ort.getRootNode && ort.getRootNode() !== document && ort.getRootNode().host) {
      slot = document.createElement("slot");
      slot.name = "km-stelle";
      ort.after(slot);
      ort.classList.add("km-stelle-offen");
      if (stelleKnopf(ort) !== ort) stelleKnopf(ort).classList.add("km-stelle-offen");
      p.setAttribute("slot", "km-stelle");
      ort.getRootNode().host.appendChild(p);
    } else if (ort) {
      ort.classList.add("offen");
      ort.appendChild(p);
    } else k.liste.after(p);
    offen = { id: id, nr: nr, panel: p, ort: ort, slot: slot, s: s };
    zeichneKopf(k, k.b, 0);
    p.scrollIntoView({ block: "nearest" });
    fokusIn(p);
    return true;
  }
  function fokusIn(p) {
    var f = p.querySelector("textarea, input[type=text]");
    if (f) { f.focus({ preventScroll: true }); if (f.tagName === "TEXTAREA") { f.setSelectionRange(0, 0); f.scrollTop = 0; } }
  }
  // `fokus`: der Fokus geht zurück an die Stelle (Esc, Abbrechen)
  function stelleZu(fokus) {
    var o = offen; if (!o) return;
    offen = null;
    if (o.panel.parentNode) o.panel.remove();
    if (o.slot && o.slot.parentNode) o.slot.remove();
    if (o.ort) { o.ort.classList.remove("km-stelle-offen"); o.ort.classList.remove("offen"); }
    var kn = stelleKnopf(o.ort); if (kn) kn.classList.remove("km-stelle-offen");
    var k = knoten[o.id];
    if (k) zeichneKopf(k, k.b, 0);
    if (fokus) {
      var f = o.ort && o.ort.isConnected ? kn : k && k.kopf.querySelector(".ed-b-titel");
      if (f) f.focus({ preventScroll: true });
    }
  }
  function stelleMeldung(p, saetze) {
    var m = p.querySelector(".ed-stelle-meldung"); if (!m) return;
    m.textContent = "";
    m.append(el("p", { cls: "ed-stelle-meldung-kopf", text: TS("nicht_uebernommen") }));
    (saetze || []).forEach(function (x) { m.appendChild(el("p", { text: x })); });
    m.hidden = false;
  }
  async function stelleUebernehmen(knopf) {
    var o = offen; if (!o) return;
    var k = knoten[o.id]; if (!k) return;
    var w = stelleWerte(o.panel, o.s);
    knopf.disabled = true;
    try {
      await km.bereit();
      var r = await km.mappeFn("stelle_setzen", [Z.mappe, k.b.text, o.id, o.nr, w]);
      if (offen !== o) return;
      if (!r.ok) { stelleMeldung(o.panel, r.meldungen); return; }
      if (r.unveraendert) { stelleZu(true); return; }
      var e = await S.handUebernehmen(o.id, r.text, k.b.text, true);
      if (!e.ok) { stelleMeldung(o.panel, (e.meldungen || []).map(function (x) { return x.text; })); return; }
      stelleZu(false);
      await aktualisieren();
      meldung(o.id, T("uebernommen"));
      var neu = stelleOrt(o.id, o.nr), k2 = knoten[o.id];
      var f = neu ? stelleKnopf(neu) : k2 && k2.kopf.querySelector(".ed-b-titel");
      if (f) f.focus({ preventScroll: true });
    } catch (err) { S.zeigeFehler(err); }
    finally { knopf.disabled = false; }
  }
  // Sprung von außen (Fragen und Lösungen, rote Karte): die Stelle zur Frage `frage` (Nummer im Baustein) oder zur Zeile
  // `zeile` (im Feld) öffnen; ohne passende Stelle der Baustein mit offenem „Erweitert“ (ganzer Text)
  function stelleSuchen(id, wo) {
    var st = stellen(id), x = null;
    if (wo.frage) x = st.filter(function (s) { return s.frage === wo.frage; })[0];
    if (!x && wo.zeile) x = st.filter(function (s) { return s.zeilen.indexOf(wo.zeile) >= 0; })[0];
    if (!x && wo.art) x = st.filter(function (s) { return s.art === wo.art; })[0];
    return x || null;
  }
  S.editorStelle = function (id, wo, von) {
    return Promise.resolve(oeffnen(von)).then(function () {
      var k = knoten[id]; if (!k) return false;
      var s = stelleSuchen(id, wo || {});
      if (s && stelleAuf(id, s.nr)) { offen.panel.scrollIntoView({ block: "center" }); return true; }
      zeigen(k.el);
      if (wo && wo.erweitert) { erw[id] = true; zeichneKopf(k, k.b, 0); }
      var t = k.kopf.querySelector(wo && wo.erweitert ? "[data-aktion=bearbeiten]" : ".ed-b-titel");
      if (t) t.focus({ preventScroll: true });
      return false;
    });
  };

  // ---------------------------------------------------------------- Ereignisse in der Vorschau
  $("editor-vorschau").addEventListener("click", async function (ev) {
    var knopf = ev.target.closest("[data-aktion]"); if (!knopf) return;
    var teil = knopf.closest(".ed-teilen");
    if (teil) {
      meldungenWeg();
      var tid = teil.dataset.id, ta = knopf.dataset.aktion, t = teilKnoten[tid];
      try {
        if (ta === "teilen" && t) { t.offen = true; zeichneTeilen(t); }
        else if (ta === "teilen-abbrechen") teilenZu(tid, true);
        else if (ta === "teilen-ok") { knopf.disabled = true; await kachelTeilen(tid); }
      } catch (e) { S.zeigeFehler(e); }
      finally { knopf.disabled = false; }
      return;
    }
    var sec = knopf.closest(".ed-b"); if (!sec) return;
    var id = sec.dataset.id, a = knopf.dataset.aktion;
    meldungenWeg();
    try {
      if (a === "weitere-erstellen") return await weitereErstellen(knopf);
      if (a === "weitere-kopieren") return weitereKopieren();
      if (a === "weitere-einsetzen") return await weitereEinsetzen();
      if (a === "darstellung") {
        if (knopf.getAttribute("aria-checked") === "true") return;
        S.angaben.format = knopf.dataset.wert;
        await S.angabenSchreiben({ format: knopf.dataset.wert }, true);
        return;
      }
      if (a === "kurstitel") return ueZiel === "kopf" ? ueZu() : ueFormular("kopf");
      if (a === "ue-auf") return ueUmschalten();
      if (a === "ue-uebernehmen") return await ueUebernehmen();
      if (a === "ue-abbrechen") return ueZu();
      if (a === "ue-hoch" || a === "ue-runter") {
        var nr = parseInt(String(ueZiel).replace("abschnitt:", ""), 10);
        return await verschieben(nr, a === "ue-hoch" ? -1 : 1);
      }
      if (a === "erweitert") {
        erw[id] = !erw[id];
        if (!erw[id] && bearbeiten[id]) { erw[id] = true; abbrechenFragen(id, false); return; }
        zeichneKopf(knoten[id], knoten[id].b, 0);
        var ek = knoten[id].kopf.querySelector(erw[id] ? "[data-aktion=bearbeiten]" : "[data-aktion=erweitert]");
        if (ek) ek.focus();
        return;
      }
      if (a === "stelle-auf") return stelleAuf(id, parseInt(knopf.dataset.nr, 10), knopf.closest(".ed-stelle-zeile"));
      if (a === "stelle-ok") return await stelleUebernehmen(knopf);
      if (a === "stelle-abbrechen") return stelleZu(true);
      if (a === "stelle-dazu") return antwortDazu();
      if (a === "bearbeiten") { if (bearbeiten[id]) abbrechenFragen(id, false); else await bearbeitenAuf(id); }
      else if (a === "abbrechen") abbrechenFragen(id, false);
      else if (a === "verwerfen-ja") abbrechen(id);
      else if (a === "verwerfen-nein") verwerfenZu(id);
      else if (a === "uebernehmen") await uebernehmen(id, knopf);
      else if (a === "zuruecknehmen") {
        var war = handArt(id);
        if (await S.handZuruecknehmen(id)) {
          await aktualisieren();
          meldung(id, T(war === "neu" ? "neu_zurueckgenommen" : "zurueckgenommen"));
          var t = knoten[id] && knoten[id].kopf.querySelector("[data-aktion=bearbeiten]"); if (t) t.focus();
        }
      }
      else if (a === "neu") { if (neuOffen[id]) neuZu(id, true); else neuAuf(id); }
      else if (a === "neu-kopieren") neuKopieren(id);
      else if (a === "neu-einsetzen") await neuEinsetzen(id);
    } catch (e) { S.zeigeFehler(e); }
  });
  $("editor-vorschau").addEventListener("change", async function (ev) {
    if (ev.target.classList.contains("ed-ue-bild")) { bildHinweis(); return; }
    meldungenWeg();
    if (ev.target.classList.contains("ed-in-kachel")) {
      var b = ev.target.closest(".ed-b");
      if (b) bausteinVerschieben(b.dataset.id, parseInt(ev.target.value, 10)).catch(S.zeigeFehler);
      return;
    }
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
      bildHinweis();
    }
  });
  $("editor-vorschau").addEventListener("keydown", function (ev) {
    // MF5: Enter in einer Zeile des Felds übernimmt (in mehrzeiligen Feldern bleibt Enter ein Zeilenumbruch)
    if (ev.key === "Enter" && offen && ev.target.tagName === "INPUT" && ev.target.type === "text" && offen.panel.contains(ev.target)) {
      ev.preventDefault();
      var ok = offen.panel.querySelector("[data-aktion=stelle-ok]"); if (ok && !ok.disabled) stelleUebernehmen(ok).catch(S.zeigeFehler);
      return;
    }
    if (ev.key === "Enter" && ev.target.classList.contains("ed-ue-titel")) { ev.preventDefault(); ueUebernehmen()
        .catch(S.zeigeFehler); }
    if (ev.key === "Enter" && ev.target.classList.contains("ed-teilen-titel")) {
      ev.preventDefault(); kachelTeilen(ev.target.closest(".ed-teilen").dataset.id).catch(S.zeigeFehler); }
    if (ev.key === "Enter" && (ev.target.classList.contains("ed-w-thema") || ev.target.classList.contains("ed-w-minuten"))) {
      ev.preventDefault();
      var w = knoten[UE] && knoten[UE].werk.querySelector("[data-aktion=weitere-erstellen]");
      if (w && !w.disabled) weitereErstellen(w).catch(S.zeigeFehler);
    }
  });
  $("editor-vorschau").addEventListener("input", function (ev) {
    if (ev.target.classList.contains("ed-st-luecken-text")) { lueckenAbgleich(ev.target); return; }
    var sec = ev.target.closest(".ed-b"); if (!sec) return;
    var id = sec.dataset.id;
    if (ev.target.classList.contains("ed-w-antwort")) {
      if (ev.inputType === "insertFromPaste") setTimeout(function () { weitereEinsetzen().catch(S.zeigeFehler); }, 30);
      return;
    }
    if (ev.target.classList.contains("ed-text") && bearbeiten[id]) {
      bearbeiten[id].text = ev.target.value;
      clearTimeout(pruefTimer[id]);
      pruefTimer[id] = setTimeout(function () { pruefen(id).catch(S.zeigeFehler); }, 400);
    } else if (ev.target.classList.contains("ed-wunsch")) {
      var kt = karte(id); if (!kt) return;
      kt.wunsch = ev.target.value;                      // AP13.35 §3.5: neben dem Auftrag, nicht an seiner Stelle
      S.geaendert();
      clearTimeout(wunschTimer[id]);
      wunschTimer[id] = setTimeout(function () { textVorbereiten(id); S.korrekturSpaeter(0); }, 400);
    } else if (ev.target.classList.contains("ed-antwort") && ev.inputType === "insertFromPaste") {
      setTimeout(function () { neuEinsetzen(id); }, 30);
    }
  });

  S.zeichneEditor = zeichneEditor;
  S.editorOeffnen = oeffnen;
  S.editorZeigen = function (id) { if (knoten[id]) zeigen(knoten[id].el); };
  // AP13.43 §5: „Im Editor ansehen“ an der Karte öffnet die Ansicht an diesem Baustein
  S.editorBei = function (id, von) {
    var p = oeffnen(von);
    return Promise.resolve(p).then(function () { if (knoten[id]) zeigen(knoten[id].el); });
  };
})();
