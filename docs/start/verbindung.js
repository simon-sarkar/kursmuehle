/* Kursmühle – Verbindung zur eigenen KI (AP14): die Seite gibt den Text an die Brücke (docs/bruecke.py) auf diesem
   Rechner und holt die Antwort dort ab. Port und Code liegen in localStorage; ohne Eintrag ruft die Seite 127.0.0.1 nie.
   Testphase (AP14b): ein Code, der mit `muehle-` beginnt, geht an die Kursmühle-KI (tools/worker/) statt an die Brücke;
   gespeichert wird dann {adresse, code}. Gesetzt im Feld „Code“ oder über `#code=muehle-…` in der Adresse. */
"use strict";

(function () {
  var SCHLUESSEL = "kursmuehle-verbindung", PORT = 48127;
  var TESTADRESSE = window.KM_TESTADRESSE || "https://ki.xn--kursmhle-b6a.de";   // = ki.kursmühle.de (Cloudflare-Worker); KM_TESTADRESSE nur in Tests
  var TESTCODE = /^muehle-[a-z0-9-]{4,40}$/;
  var TEXT = {
    netz: "Deine KI antwortet nicht; läuft das Programm noch?",
    code: "Der Code stimmt nicht; er steht dort, wo das Programm läuft.",
    testcode: "Der Testcode stimmt nicht.",
    gesperrt: "Fünfmal ein falscher Code; in einer Minute geht es wieder.",
    zeit: "Deine KI hat nach 10 Minuten nicht geantwortet; läuft das Programm noch?"
  };
  var V = km.verbindung = { takt: 2000, grenze: 10 * 60 * 1000, info: null, fehler: null };
  var gespraeche = {};                       // Einheit -> Gespräch bei der Brücke (nur im Speicher)

  function gespeichert() {
    try { var v = JSON.parse(localStorage.getItem(SCHLUESSEL) || "null"); return v && v.code ? v : null; }
    catch (e) { return null; }
  }
  function speichern(v) {
    try { if (v) localStorage.setItem(SCHLUESSEL, JSON.stringify(v)); else localStorage.removeItem(SCHLUESSEL); }
    catch (e) { /* ohne localStorage gilt die Verbindung nur bis zum Neuladen */ }
    V.gemerkt = v;
  }
  function fehler(art) {
    var t = art === "code" && V.istTest() ? TEXT.testcode : TEXT[art];
    var e = new Error(t || art); e.art = art; return e;
  }
  function warte(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function rufen(methode, pfad, daten) {
    var v = V.gemerkt || gespeichert();
    if (!v) throw fehler("code");
    var r, kopf = { authorization: "Bearer " + v.code };
    if (daten) kopf["content-type"] = "application/json";
    try {
      r = await fetch((v.adresse || "http://127.0.0.1:" + v.port) + pfad, { method: methode, cache: "no-store", headers: kopf,
          body: daten ? JSON.stringify(daten) : undefined });
    } catch (e) { throw fehler("netz"); }
    if (r.status === 401) throw fehler("code");
    if (r.status === 204) return null;
    var d = await r.json().catch(function () { return {}; });
    if (r.status === 429 && !d.kontingent) throw fehler("gesperrt");   // Kontingent der Testphase: Meldung wie Anbieter
    if (r.status === 404) throw fehler("weg");
    if (!r.ok) { var e = new Error(d.fehler || TEXT.netz); e.art = "anbieter"; throw e; }
    return d;
  }

  V.status = async function () {
    try { V.info = await rufen("GET", "/status"); V.fehler = null; }
    catch (e) { V.info = null; V.fehler = e.art; throw e; }
    finally { zeichne(); }
    return V.info;
  };
  V.istTest = function () { return !!(V.gemerkt && V.gemerkt.adresse); };
  V.verbinden = async function (code, port) {
    code = String(code).trim();
    speichern(TESTCODE.test(code) ? { adresse: TESTADRESSE, code: code } : { port: parseInt(port, 10) || PORT, code: code });
    gespraeche = {};
    try { return await V.status(); }
    catch (e) { if (e.art === "code") speichern(null); throw e; }
  };
  V.gespraech = async function (einheit, neu) {
    if (neu || !gespraeche[einheit]) gespraeche[einheit] = (await rufen("POST", "/gespraech", {})).gespraech;
    return gespraeche[einheit];
  };
  // Auftrag senden und alle 2 s nach der Antwort fragen, höchstens 10 min; Teil 2 und Korrekturen im selben Gespräch
  V.senden = async function (text, o) {
    o = o || {};
    var einheit = o.einheit || "", a;
    try { a = await rufen("POST", "/auftrag", { gespraech: await V.gespraech(einheit, o.neu), text: text }); }
    catch (e) {
      if (e.art !== "weg") throw e;          // Brücke neu gestartet: neues Gespräch
      a = await rufen("POST", "/auftrag", { gespraech: await V.gespraech(einheit, true), text: text });
    }
    for (var t0 = Date.now(); Date.now() - t0 < V.grenze;) {
      var d = await rufen("GET", "/antwort/" + a.auftrag);
      if (d && d.fehler) { var e = new Error(d.fehler); e.art = "anbieter"; throw e; }
      if (d) return d.text;
      await warte(V.takt);
    }
    throw fehler("zeit");
  };
  V.trennen = function () {
    var alt = gespraeche; gespraeche = {};
    Object.keys(alt).forEach(function (k) { rufen("DELETE", "/gespraech/" + alt[k]).catch(function () {}); });
    speichern(null); V.info = null; V.fehler = null;
    zeichne();
  };
  // AP13.8: ein Agent darf sich beim Abholen benennen (`/auftrag?name=…`, docs/bruecke.py prüft die Zeichen)
  function agentName() { return (V.info && V.info.name) || "Agent"; }
  V.name = function () {
    if (!V.info) return "Eigene KI";
    if (V.info.modus === "test") return "Kursmühle-KI (Test)";
    return "Eigene KI (" + (V.info.modus === "agent" ? agentName() : V.info.modell || "Schlüssel") + ")";
  };
  V.gemerkt = gespeichert();

  // ---------------------------------------------------------------- Seite
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite, $ = S.$, Z = S.Z, el = S.el;
  S.verbindenOffen = false;
  S.kiLaeuft = false;                        // während eines Auftrags: das Feld, in das die Antwort kommt
  S.kopierStatt = false;                     // „Stattdessen kopieren“: Knöpfe zurück auf Kopieren, Chat bleibt
  S.anKiAktiv = function () { return !!Z.mappe && Z.mappe.chat === "eigene" && !S.kopierStatt; };
  S.kiName = V.name;

  function zustandText() {
    if (V.info && V.info.modus === "test") return "verbunden · Kursmühle-KI (Testphase)";
    if (V.info) return "verbunden · " + (V.info.modus === "agent" ? agentName() + (V.info.bereit ? "" :
        " (holt gerade nichts ab)") : V.info.modell);
    if (V.fehler === "code") return "Code stimmt nicht";
    if (V.fehler && V.gemerkt) return "nicht erreichbar";
    return "nicht verbunden";
  }
  // Zustand neben der Kachel, Feld „So geht es“; die Kacheln baut kern.js neu, darum nach jedem Füllen ergänzen
  function kachelErgaenzen() {
    var k = document.querySelector("#chat-knoepfe [data-chat=eigene]");
    if (!k || $("ki-zustand")) return;
    var hilfe = el("button", { type: "button", cls: "textlink", id: "ki-hilfe", "aria-controls": "verbinden",
        text: "So geht es" });
    hilfe.onclick = function () { S.verbindenOffen = !S.verbindenOffen; zeichne();
      if (S.verbindenOffen) $("verbinden-code").focus({ preventScroll: true }); };
    // „Trennen“ sichtbar neben der Kachel, sobald eine Verbindung gemerkt ist (sonst nur im zugeklappten Feld)
    var trennen = el("button", { type: "button", cls: "textlink", id: "ki-trennen", text: "Trennen", hidden: "" });
    trennen.onclick = function () { V.trennen(); S.verbindenOffen = false; zeichne(); $("verbinden-stand").textContent = "Getrennt."; };
    k.after(el("span", { cls: "leise ki-zustand", id: "ki-zustand" }), hilfe, trennen);
    zeichne();
  }
  // Solange die eigene KI schreibt, verschwinden Einfügefeld und „Antwort übernehmen“ des betroffenen Schritts; sie
  // kommen mit der Antwort, der Fehlerzeile oder „Stattdessen kopieren“ zurück
  var FELDER = { eingabe: ["eingabe", "eingabe-knopf"], korrektur: ["korrektur-einfuegen"], gegen: ["gegen-einfuegen"] };
  function felder() {
    Object.keys(FELDER).forEach(function (k) {
      FELDER[k].forEach(function (id) { if ($(id)) $(id).hidden = S.kiLaeuft === k; });
    });
  }
  // (vor dem ersten zeichne(): kachelErgaenzen() läuft gleich, und in WebKit stehen die Kacheln dann schon)
  // „Eigene KI“ gewählt: mit gespeichertem Code nach dem Stand fragen, sonst „So geht es“ öffnen; jeder Wechsel
  // beschriftet Teil- und Korrekturknopf neu
  $("chat-knoepfe").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-chat]"); if (!b) return;
    if (b.dataset.chat === "eigene" && V.gemerkt) V.status().catch(function () {});
    else if (b.dataset.chat === "eigene") S.verbindenOffen = true;
    zeichne();
  });
  new MutationObserver(kachelErgaenzen).observe($("chat-knoepfe"), { childList: true });
  kachelErgaenzen();

  function zeichne() {
    if (!$("verbinden")) return;
    var z = $("ki-zustand");
    if (z) z.textContent = zustandText();
    if ($("ki-hilfe")) $("ki-hilfe").setAttribute("aria-expanded", String(S.verbindenOffen));
    $("verbinden").hidden = !S.verbindenOffen;
    $("verbinden-trennen").hidden = !V.gemerkt;
    if ($("ki-trennen")) $("ki-trennen").hidden = !V.gemerkt;
    if (V.gemerkt && V.gemerkt.port && !$("verbinden-port").value) $("verbinden-port").value = V.gemerkt.port;
    testHinweis();
    if (S.zeichneChat) S.zeichneChat();
    if (S.zeichneTeile) S.zeichneTeile();
    if (S.zeichneKorrektur) S.zeichneKorrektur();
    if (S.zeichneGegen) S.zeichneGegen();
    felder();
  }
  S.verbindungZeichnen = zeichne;
  // Mühle von der Brücke selbst ausgeliefert (http://127.0.0.1:48127/start/): ihr Port ist der Standard
  var eigenerPort = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && location.port ? location.port : PORT;
  $("verbinden-port").value = V.gemerkt && V.gemerkt.port ? V.gemerkt.port : eigenerPort;

  // Testphase: Zeile zum Datenschutz unter der Chat-Auswahl, nur verbunden mit Testcode; steht neben #chat-wahl, damit
  // sie auch nach der Wahl sichtbar bleibt
  function testHinweis() {
    var h = $("ki-test-hinweis"), zeigen = !!(V.info && V.info.modus === "test");
    if (!h && !zeigen) return;
    if (!h) {
      h = el("p", { cls: "leise", id: "ki-test-hinweis",
          text: "Testbetrieb: Aufträge laufen über Anthropic (USA); keine personenbezogenen Daten eingeben." });
      $("chat-wahl").after(h);
    }
    h.hidden = !zeigen;
  }
  // `#code=muehle-…`: Testcode still speichern, Fragment aus der Adresszeile nehmen, beim ersten Erreichen von Schritt 4
  // „Eigene KI“ wählen (auch wenn die Einheit schon einen anderen Chat hat; der Link sagt, was gemeint ist)
  var vorwahl = false;
  (function fragmentLesen() {
    var h = new URLSearchParams((location.hash || "").replace(/^#/, "")), code = (h.get("code") || "").trim().toLowerCase();
    if (!h.has("code")) return;
    h.delete("code");
    var rest = h.toString();
    history.replaceState(history.state, "", location.pathname + location.search + (rest ? "#" + rest : ""));
    if (!TESTCODE.test(code)) return;
    speichern({ adresse: TESTADRESSE, code: code });
    gespraeche = {};
    vorwahl = true;
  })();
  var zeichneChat = S.zeichneChat;
  S.zeichneChat = function () {
    if (vorwahl && Z.mappe && document.body.dataset.schritt === "4") {
      var b = document.querySelector("#chat-knoepfe [data-chat=eigene]");
      if (b) { vorwahl = false; setTimeout(function () { b.click(); }, 0); }
    }
    return zeichneChat.apply(this, arguments);
  };

  $("verbinden-satz-kopieren").onclick = function () {
    S.kopieren($("verbinden-satz").textContent, $("verbinden-satz-feld"), $("verbinden-stand"),
        "Kopiert. Gib den Satz deinem Programm; es nennt dir dann einen Code.");
  };
  $("verbinden-los").onclick = async function () {
    var roh = $("verbinden-code").value.trim().toLowerCase();
    var code = TESTCODE.test(roh) ? roh : roh.replace(/\D/g, "");
    var stand = $("verbinden-stand");
    stand.className = "stand";
    if (!TESTCODE.test(code) && code.length !== 6) { stand.textContent = "Der Code hat sechs Ziffern."; stand.classList.add("fehler"); return; }
    stand.textContent = "Verbinde …";
    try {
      await V.verbinden(code, $("verbinden-port").value);
      S.verbindenOffen = false; S.kopierStatt = false;
      $("verbinden-code").value = "";
      stand.textContent = "";
      fehlerWeg();
      zeichne();
      var k = $("text-kopieren"); if (k && !k.closest("[hidden]")) k.focus({ preventScroll: true });
    } catch (e) { stand.textContent = e.message; stand.classList.add("fehler"); }
  };
  $("verbinden-trennen").onclick = function () { V.trennen(); $("verbinden-stand").textContent = "Getrennt."; };
  $("verbinden-code").addEventListener("keydown", function (ev) { if (ev.key === "Enter") $("verbinden-los").click(); });

  // Fehlerzeile unter dem Feld, in das die Antwort gehört: „Erneut versuchen“ und „Stattdessen kopieren“
  function fehlerWeg() { var f = $("ki-fehler"); if (f) f.remove(); }
  function fehlerZeigen(ort, e, nochmal) {
    fehlerWeg();
    var knoepfe = [];
    if (e.art === "code" || e.art === "gesperrt") { S.verbindenOffen = true; zeichne(); }
    else {
      var n = el("button", { type: "button", cls: "knopf", id: "ki-nochmal", text: "Erneut versuchen" });
      n.onclick = function () { fehlerWeg(); nochmal(); };
      knoepfe.push(n);
    }
    var k = el("button", { type: "button", cls: "textlink", id: "ki-kopieren", text: "Stattdessen kopieren" });
    k.onclick = function () { S.kopierStatt = true; fehlerWeg(); S.zeichne(); zeichne(); };
    knoepfe.push(k);
    var box = el("div", { cls: "stand-karte fehler", id: "ki-fehler", role: "alert" },
        [el("p", { text: e.message || TEXT.netz }), el("div", { cls: "kopieren" }, knoepfe)]);
    ort.after(box);
    box.querySelector("button").focus({ preventScroll: true });
  }
  function dauer(ms) { var s = Math.round(ms / 1000); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }

  // Text an die eigene KI: „Deine KI schreibt …“ mit Dauer über o.stand (davor o.vor, etwa „Teil 2 von 3 · “), die
  // Antwort an o.fertig (dasselbe Einsetzen wie beim Einfügen von Hand); ohne Verbindung öffnet sich „So geht es“
  S.anKi = async function (text, o) {
    if (S.kiLaeuft) return false;            // ein Auftrag zur Zeit; ein zweiter Klick schickt nichts doppelt
    fehlerWeg();
    if (!V.gemerkt) {
      S.verbindenOffen = true; zeichne();
      o.stand("Verbinde zuerst deine KI: unter „So geht es“ in Schritt 4 steht, wie.", "fehler");
      $("verbinden-code").focus({ preventScroll: true });
      return false;
    }
    S.kiLaeuft = o.feld || "auftrag";
    if (o.vorher) o.vorher();
    zeichne();
    var t0 = Date.now();
    function tick() { o.stand((o.vor || "") + "Deine KI schreibt … " + dauer(Date.now() - t0), "laeuft"); }
    tick();
    var uhr = setInterval(tick, 1000);
    try {
      var antwort = await V.senden(text, { einheit: o.einheit, neu: o.neu });
      clearInterval(uhr); o.stand("", ""); S.kiLaeuft = false;
      zeichne();
      await o.fertig(antwort);
      return true;
    } catch (e) {
      clearInterval(uhr); o.stand("", ""); S.kiLaeuft = false;
      if (e.art !== "anbieter") V.fehler = e.art;
      zeichne();
      fehlerZeigen(o.ort, e, function () { S.anKi(text, o); });
      return false;
    }
  };

  // Gespeicherte Verbindung: einmal nach dem Stand fragen (sonst bleibt 127.0.0.1 unberührt)
  if (V.gemerkt) V.status().catch(function () {});
  zeichne();
})();
