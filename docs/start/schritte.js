/* Kursmühle – Schrittfolge der Seite: sieben Schritte untereinander, davor die erledigten als aufklappbare
 * Zeile; Zweig „Mach du“ setzt Vorlage und Bausteine still, „Ich steuere“ zeigt Vorlagen, Karten mit Aufträgen und
 * „Mehr einstellen“. Dazu Aussehen, Verwerfen, Kursangaben, hell und dunkel. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, FARBEN = S.FARBEN, SCHRITTE = S.SCHRITTE, STANDARD_FARBE = S.STANDARD_FARBE,
      Z = S.Z, ZWEIG_TEXT = S.ZWEIG_TEXT, auswertung = S.auswertung, autosave = S.autosave,
      bilderStandard = S.bilderStandard, bilderWert = S.bilderWert, bildwuensche = S.bildwuensche,
      chatInfo = S.chatInfo, datumZeit = S.datumZeit, einheitTag = S.einheitTag, el = S.el, erledigtBis = S.erledigtBis,
      fehlerText = S.fehlerText, fehlerZahl = S.fehlerZahl, felderFuellen = S.felderFuellen, geaendert = S.geaendert,
      hinweiseSichern = S.hinweiseSichern, hoehe = S.hoehe, inhalt = S.inhalt, neuPruefen = S.neuPruefen,
      oberText = S.oberText, schritt = S.schritt, sektion = S.sektion, sichtbareSchritte = S.sichtbareSchritte,
      status = S.status, teileOffen = S.teileOffen, texte = S.texte, zeichne = S.zeichne, zweig = S.zweig;
  function fazit(n) {
    var e = (Z.mappe && Z.mappe.einheit) || {};
    var ohneLp = S.angaben.lehrplanbezug === "nein";       // AP13.6: ohne Lehrplan heißt das Feld „Zielgruppe“
    if (n === 1) return [e.thema, e.jahrgang ? (ohneLp ? "Zielgruppe: " : "Jahrgangsstufe ") + e.jahrgang : "", e.minuten ? e.minuten +
        " Minuten" : ""].filter(Boolean).join(" · ");
    if (n === 2) {
      var z = ZWEIG_TEXT[zweig()] || "";
      var n = Z.mappe.bausteine.filter(function (k) { return !k.aus; }).length;
      return [z, e.vorlage, zweig() === "steuer" ? n + " Bausteine" : ""].concat(zweig() === "richtung" ?
          richtungText() : []).filter(Boolean).join(" · ");
    }
    if (n === 3) return [oberText("familie", S.angaben.familie || "sachlich"), feinheitenText(),
      oberText("format", S.angaben.format),
      "Bilder: " + oberText("bilder", bilderWert()), oberText("website", S.angaben.website ||
          "textfeld")].filter(Boolean).join(" · ");
    if (n === 4) { var c = chatInfo(Z.mappe.chat); return c ? c.text + (Z.mappe.kopiert ? " · Text kopiert" : "") : "";
        }
    if (n === 5) {
      var voll = Z.mappe.bausteine.filter(function (k) { return !k.geplant && (k.einheit || "") === einheitTag(); })
          .length, f = fehlerZahl();
      return voll ? voll + " Bausteine" + (f ? ", " + f + " Fehler" : ", geprüft") : "";
    }
    if (n === 5.5) {
      var w = bildwuensche().filter(function (b) { return b.datei; }), da = w.filter(function (b) {
          return Z.assets[b.datei]; }).length;
      return !w.length ? "" : da === w.length ? (da === 1 ? "Bild da" : "alle " + da + " Bilder da") : da + " von " +
          w.length + " Bildern da, sonst Platzhalter";
    }
    if (n === 6) return S.fragenListe.length ? S.fragenListe.length + " Fragen" + (Z.mappe.durchsicht ?
        " durchgesehen" : "") : "keine Fragen";
    return "";
  }

  // Hinweis unter der Überschrift des aktiven Schritts, höchstens zwei Sätze, nie blockierend
  function zeichneHinweis(sec, n, aktiv) {
    var schluessel = n === 2 && zweig() === "richtung" && S.hinweisTexte["2-richtung"] ? "2-richtung" : String(n);
    var box = sec.querySelector(".s-hinweis"), text = S.hinweisTexte[schluessel];
    var zeigen = aktiv && S.hinweiseGeladen && S.hinweise.an && !!text && S.hinweise.gesehen.indexOf(String(n)) < 0;
    if (!zeigen) { if (box) box.remove(); return; }
    if (!box) {
      box = el("div", { cls: "s-hinweis", role: "note" }, [el("p"), el("button", { type: "button",
          cls: "textlink hinweis-aus", text: "Hinweise ausblenden" })]);
      sec.querySelector(".s-inhalt").insertBefore(box, sec.querySelector(".s-inhalt").firstChild);
    }
    box.querySelector("p").textContent = text;
  }
  document.querySelector(".spalte-haupt").addEventListener("click", function (ev) {
    if (!ev.target.closest(".hinweis-aus")) return;
    S.hinweise.an = false; hinweiseSichern(); zeichneSchritte();
  });

  function zeichneSchritte() {
    var s = schritt(), z = zweig();
    if (s === 5.5 && Z.pruefung && !bildwuensche().length) s = 6;   // Bildwünsche inzwischen weg: weiter mit den Fragen
    document.body.dataset.schritt = String(s);
    document.body.dataset.zweig = z;
    document.body.dataset.bildschirm = Z.mappe ? "ansicht" : "start";
    var sichtbar = sichtbareSchritte();
    SCHRITTE.forEach(function (n) {
      var sec = sektion(n);
      var stand = sichtbar.indexOf(n) < 0 ? "zu" : n < s ? "erledigt" : n === s ? "aktiv" : "zu";
      // Schritt 4 bleibt offen, solange ein gestückelter Text noch nicht ganz kopiert ist
      var teileKopieren = n === 4 && s === 5 && texte.teile.length > 1 && Object.keys(texte.kopiert)
          .length < texte.teile.length;
      var offen = stand === "aktiv" || (stand === "erledigt" && (!!S.auf[n] || teileKopieren));
      sec.hidden = stand === "zu";
      sec.dataset.stand = stand;
      sec.classList.toggle("auf", offen);
      var b = sec.querySelector(".s-zeile");
      b.setAttribute("aria-expanded", String(offen));
      b.disabled = stand !== "erledigt";
      sec.querySelector(".s-fazit").textContent = stand === "erledigt" && Z.mappe ? fazit(n) : "";
      sec.querySelector(".s-nr").textContent = String(sichtbar.indexOf(n) + 1);
      zeichneHinweis(sec, n, stand === "aktiv");
    });
    $("hinweise-an").checked = S.hinweise.an;
    ["mach", "richtung", "steuer"].forEach(function (w) { $("zweig-" + w).setAttribute("aria-pressed", String(z === w));
        });
    $("steuer-teil").hidden = z !== "steuer";
    $("mach-teil").hidden = z !== "mach" && z !== "richtung";
    $("richtung-teil").hidden = z !== "richtung";
    if (z === "richtung" || z === "steuer") zeichneRichtung();
    $("vorlagen").hidden = inhalt();
    $("weiter-2").hidden = s > 2 || !z;
    $("weiter-3").hidden = s > 3;
    // Karten: in „Ich steuere“ unter Schritt 2, bis die erste Antwort da ist; danach in beiden Zweigen unter Schritt 5
    var ort = inhalt() ? $("karten-ort-5") : $("karten-ort-2");
    if ($("tafel-bausteine").parentNode !== ort) ort.appendChild($("tafel-bausteine"));
    $("tafel-bausteine").hidden = !(inhalt() || z === "steuer");
    $("karten").classList.toggle("kompakt", z !== "steuer");
    $("hinzufuegen").hidden = z !== "steuer";
    $("text-art").hidden = z !== "steuer";
    $("modus").hidden = z !== "steuer";
    document.querySelector(".spalte-rand").hidden = s < 5;
    document.querySelector(".seite").classList.toggle("mit-rand", s >= 5);
    $("weiter").hidden = !!Z.mappe || !$("weiter").dataset.da;
    $("weiter-5").hidden = !(s === 5 && inhalt() && !fehlerZahl() && !teileOffen());
    $("weiter-5").textContent = bildwuensche().length ? "Weiter zu den Bildern" : S.fragenListe.length ?
        "Weiter zu den Fragen und Lösungen" : "Weiter zur Datei";
    $("rueckmeldung").hidden = !(s >= 7 && Z.bau && Z.bau.mbz) && !$("rueckmeldung").dataset.offen;
    $("speichern").hidden = !Z.mappe;
    $("neue-einheit").hidden = !Z.mappe;
    $("schliessen").hidden = !Z.mappe;
    if (!Z.mappe) $("autosave-stand").textContent = "";
  }

  document.querySelector(".spalte-haupt").addEventListener("click", function (ev) {
    var b = ev.target.closest(".s-zeile"); if (!b || b.disabled) return;
    var n = parseFloat(b.dataset.nr);
    S.auf[n] = !S.auf[n];
    zeichneSchritte();
    if (S.auf[n]) Array.prototype.forEach.call(document.querySelectorAll(".k-auftrag"), hoehe);
  });

  function gehe(n, fokus) {
    if (!Z.mappe) return;
    if (n > schritt()) erledigtBis(n);
    Z.mappe.schritt = n;
    S.auf = {};
    zeichne();
    autosave();
    var sec = sektion(n);
    if (sec && !sec.hidden) {
      sec.scrollIntoView({ block: "start" });
      var f = fokus ?
          $(fokus) : sec.querySelector(".s-inhalt button:not([hidden]):not(:disabled), .s-inhalt input, .s-inhalt " +
          "textarea");
      if (f) f.focus({ preventScroll: true });
    }
  }

  function weiterAnzeigen() {
    km.autosaveLesen().then(function (r) {
      $("weiter").dataset.da = r ? "1" : "";
      $("weiter").hidden = !r || !!Z.mappe;
      if (!r) return;
      $("weiter-knopf").textContent = "Weiter mit „" + (r.titel || r.dateiname) + "“";
      $("weiter-zeit").textContent = "Zuletzt gesichert " + datumZeit(r.zeit);
      $("weiter-knopf").onclick = function () {
        oeffne(async function () { await km.mappeAusBytes(r.zip, null); }, "Wird geöffnet …");
      };
    }).catch(function () { $("weiter").hidden = true; });
  }
  // Adresse von der Landingpage: `?weiter=1` öffnet die gesicherte Einheit; `#thema=…` (Fragment, bleibt im Browser;
  // `?thema=…` als Rückfall ohne Skript) füllt Schritt 1 vor und legt die Einheit an, ohne eine gesicherte still zu
  // ersetzen. replaceState legt keinen Eintrag an, der Zurück-Knopf führt weiter zur Landingpage.
  function adresseLesen() {
    var q = new URLSearchParams(location.search), h = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    if (h.has("thema") || h.has("jahrgang") || h.has("minuten")) q = h;
    var weiter = q.get("weiter") === "1", thema = (q.get("thema") || "").trim().slice(0, 120);
    var vor = q.has("thema") || q.has("jahrgang") || q.has("minuten");
    if (weiter || vor) history.replaceState(history.state, "", location.pathname + (q === h ? "" : location.hash));
    if (weiter) {
      km.autosaveLesen().then(function (r) { if (r) oeffne(async function () { await km.mappeAusBytes(r.zip, null); });
          }).catch(function () {});
      return;
    }
    if (!vor) return;
    var min = parseInt(q.get("minuten"), 10);
    $("f-thema").value = thema;
    $("f-jahrgang").value = (q.get("jahrgang") || "").trim().slice(0, 12);
    $("f-minuten").value = min >= 10 && min <= 300 ? min : 45;
    if (!thema) { $("f-thema").focus(); return; }
    S.katalogDa.then(function () { return km.autosaveLesen().catch(function () { return null; }); }).then(function (r) {
      if (!r) { startAbsenden(); return; }
      frage("Einheit „" + (r.titel || r.dateiname) +
          "“ verwerfen? Was du nicht mit „Einheit speichern“ gesichert hast, geht verloren.",
        async function () {
          await km.autosaveLoeschen();
          $("weiter").dataset.da = ""; $("weiter").hidden = true;
          startAbsenden();
        });
    });
  }

  $("start-form").onsubmit = function (ev) { ev.preventDefault(); startAbsenden(); };
  function startAbsenden() {
    var thema = $("f-thema").value.trim();
    if (!thema) { $("f-thema").focus(); return; }
    var e = { thema: thema, jahrgang: $("f-jahrgang").value.trim(), minuten: parseInt($("f-minuten").value, 10) || 45 };
    if (!S.katalog) return;
    if (!Z.mappe) { einheitAnlegen(e, S.katalog.vorlagen[0]); return; }
    if (Z.mappe.anhaengen && !Z.mappe.bausteine.some(function (k) { return k.einheit === Z.mappe.anhaengen; })) {
      einheitAnhaengen(e); return;
    }
    // Schritt 1 nachträglich geändert: Angaben übernehmen; ohne Inhalt die Bausteine der Vorlage neu rechnen
    Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}, e);
    if (!Z.mappe.anhaengen) Z.mappe.titel = thema;
    var v = vorlageNach(Z.mappe.einheit.vorlage);
    if (v && !inhalt() && Z.mappe.bausteine.every(function (k) { return k.geplant; })) karteVorlage(v);
    S.angaben.thema = thema; S.angaben.jahrgang = e.jahrgang; S.angaben.minuten = e.minuten;
    Z.mappe.schritt = Math.max(schritt(), 2);
    S.auf = {};
    zeichne();
    angabenSchreiben(Z.mappe.anhaengen ? { jahrgang: e.jahrgang } : { thema: thema, jahrgang: e.jahrgang,
        minuten: e.minuten });
  }

  function vorlageNach(name) { return S.katalog && S.katalog.vorlagen.filter(function (v) { return v.name === name;
      })[0]; }

  // Bausteinliste aus einer Einheitsvorlage: Phasen mit Typ-Vorschlag und Soll-Minuten. Bis 45 Minuten skaliert alles;
  // darüber wachsen nur die dehnbaren Phasen (Erarbeitung, Übung), Einstieg und Sicherung bleiben. `ab` = erste Nummer.
  function vorlageKarten(v, minuten, ab) {
    var faktor = Math.min(1, minuten / 45), dehnAnteil = 0, fest = 0;
    v.phasen.forEach(function (p) { if (p.dehnbar) dehnAnteil += p.anteil; else fest += p.anteil / 100 * 45 * faktor;
        });
    var rest = Math.max(0, minuten - fest), karten = [], n = (ab || 1) - 1;
    v.phasen.forEach(function (p) {
      var phMin = p.dehnbar ? rest * p.anteil / dehnAnteil : p.anteil / 100 * 45 * faktor;
      p.bausteine.forEach(function (b, k) {
        var schritt_ = b.indexOf(" | ") >= 0 ? b.slice(b.indexOf(" | ") + 3).trim() : "";   // Teilschritt für den Chat
        var kopf = schritt_ ? b.slice(0, b.indexOf(" | ")) : b;
        var teile = kopf.split(":"), typ = teile[0].trim();
        var titel = teile.length > 1 ? teile.slice(1).join(":").trim() : (p.bausteine.length > 1 ? p.phase + " " + (k +
            1) : p.phase);
        n += 1;
        var karte = { id: "b" + n, typ: typ, titel: titel, abschnitt: null, minuten: null, auftrag: "", phase: p.phase,
          soll: Math.max(1, Math.round(phMin / p.bausteine.length)), geplant: true, neu: false, _dehnbar: !!p.dehnbar };
        if (schritt_) karte.schritt = schritt_;
        if (p.optional) karte.aus = true;           // optionale Phase: Karte da, aber ausgeschaltet
        karten.push(karte);
      });
    });
    var summe = karten.reduce(function (s, k) { return s + k.soll; }, 0), diff = minuten - summe;
    var groesste = karten.filter(function (k) { return k._dehnbar; }).sort(function (a, b) { return b.soll - a.soll;
        })[0];
    if (groesste && groesste.soll + diff >= 1) groesste.soll += diff;
    karten.forEach(function (k) { delete k._dehnbar; });
    return karten;
  }

  function karteVorlage(v) {
    var e = Z.mappe.einheit, alt = {};
    Z.mappe.bausteine.forEach(function (k) { if (k.auftrag) alt[k.id] = k.auftrag; });
    Z.mappe.bausteine = vorlageKarten(v, e.minuten || 45);
    Z.mappe.bausteine.forEach(function (k) { if (alt[k.id]) k.auftrag = alt[k.id]; });
    e.vorlage = v.name;
  }

  async function steckbriefAnlegen() {
    var o = S.katalog.oberflaeche, e = (Z.mappe && Z.mappe.einheit) || {};
    Z.steckbrief_text = await km.mappeFn("angaben_schreiben", ["", {
      thema: e.thema || "", jahrgang: e.jahrgang || "", minuten: e.minuten || "", fach: "", bilder: bilderStandard(),
      format: o.format[0].wert, familie: S.familien.standard, farbe: o.farbe[0].wert, website: o.website[0].wert,
      abschluss: o.abschluss[0].wert, portionierung: o.portionierung[0].wert }]);
  }

  function einheitAnlegen(e, v) {
    e.vorlage = v.name;
    Z.mappe = km.neueMappe(e.thema, e, vorlageKarten(v, e.minuten));
    Z.mappe.schritt = 2;
    Z.mappe.zeit_selbst = false;                   // Standard: das Modell verteilt die Minuten
    Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null;
        Z.beispiel = null;
    S.angaben = { thema: e.thema, jahrgang: e.jahrgang, minuten: e.minuten, familie: "sachlich", dichte: "normal",
        kasten: "familie", format: "themen", farbe: "" };
    neuStart();
    gehe(2, "zweig-mach");
    if (Z.geladen) neuPruefen().catch(zeigeFehler);
  }

  // Nächste Einheit: geplante Karten hinten an, mit neuen Nummern und dem Teil „e<n>“ (Nachlieferung beim Bau)
  function einheitAnhaengen(e) {
    var ids = {}, n = 1;
    Z.mappe.bausteine.forEach(function (k) { ids[k.id] = 1; });
    while (ids["b" + n]) n += 1;
    var alteEinheit = Z.mappe.einheit || {};
    var v = vorlageNach(alteEinheit.vorlage) || S.katalog.vorlagen[0];
    e.vorlage = v.name;
    var karten = vorlageKarten(v, e.minuten, n);
    karten.forEach(function (k) { k.einheit = Z.mappe.anhaengen; });
    Z.mappe.bausteine = Z.mappe.bausteine.concat(karten);
    Z.mappe.einheit = e;
    Z.mappe.laufend = Z.mappe.anhaengen;           // Text, Bilder und Rand gehören jetzt zu dieser Einheit
    delete Z.mappe.stueckelung;
    Z.mappe.durchsicht = false; delete Z.mappe.kopiert;
    Z.bau = null;
    neuStart();
    document.querySelector("input[name=text-art][value=leer]").checked = true;
    texte.art = "leer";
    gehe(2, zweig() ? "weiter-2" : "zweig-mach");
    if (Z.geladen) neuPruefen().catch(zeigeFehler);
  }

  function neuStart() {
    clearTimeout(S.kennzahlTimer); clearTimeout(S.textTimer); clearTimeout(S.eingabeTimer);
    texte.teile = []; texte.ids = []; texte.teil = 0; texte.art = "einheit"; texte.kopiert = {}; S.fragenListe = [];
        S.korrekturen = []; S.letzteAntwort = null;
    S.korrektur = { text: "", offen: false, stand: "", art: "" };
    $("korrektur-eingabe").value = ""; $("eingabe-stand").hidden = true;
    S.chatWahlOffen = false; S.auf = {};
    $("chat-text-feld").value = ""; $("gegen-text-feld").value = ""; $("gegen-antwort").value = "";
    $("gegen-ergebnis").innerHTML = ""; $("gegen-stand").textContent = ""; $("kopiert").textContent = "";
    $("eingabe-stand").textContent = ""; $("infobox").hidden = true; $("importiert-stand").hidden = true;
    S.diagnoseKarte($("eingabe-diagnose"), null); S.diagnoseKarte($("korrektur-diagnose"), null);
    document.querySelector("input[name=text-art][value=einheit]").checked = true;
  }

  async function oeffne(laden, text) {
    status(text || "Wird geöffnet …", "lauf");
    try {
      await km.bereit();
      await laden();
      neuStart();
      await neuPruefen();
      // Kursdatei ohne Schrittangabe (Kursordner, ältere Mappe): Zweig „Ich steuere“, Schritt aus dem Stand
      if (!Z.mappe.zweig) Z.mappe.zweig = "steuer";
      if (!Z.mappe.schritt) {
        Z.mappe.schritt = !inhalt() ? (Z.mappe.chat ? 4 : 2) : fehlerZahl() ? 5
          : S.fragenListe.length && !Z.mappe.durchsicht ? 6 : 7;
      }
      zeichne();
      gehe(Z.mappe.schritt);
      status("Bereit", "ok");
    } catch (e) { zeigeFehler(e); }
  }
  function zeigeFehler(e) { status("Das hat nicht geklappt: " + fehlerText(e), "fehler"); }

  async function dateienLesen(files) {
    var out = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i], name = f.webkitRelativePath || f.name;
      // einzeln gewählte Bilder gehören nach assets/ (iPad, „Dateien wählen“)
      if (name.indexOf("/") < 0 && ["kurs.md", "steckbrief.yaml", "mappe.json"].indexOf(name) < 0) name = "assets/" +
          name;
      out[name] = new Uint8Array(await f.arrayBuffer());
    }
    return out;
  }
  function dateiWahl(ev) {
    var files = Array.prototype.slice.call(ev.target.files || []);
    ev.target.value = "";
    if (!files.length) return;
    if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
      oeffne(async function () { await km.mappeAusBytes(await files[0].arrayBuffer(), null); },
          "Einheit wird geöffnet …");
    } else {
      oeffne(async function () { await km.mappeAusDateien(await dateienLesen(files), null); },
          "Dateien werden geöffnet …");
    }
  }
  // Dateiwahl über Beschriftungen: auch mit der Tastatur erreichbar
  Array.prototype.forEach.call(document.querySelectorAll("label[for=datei-oeffnen], label[for=ordner-oeffnen]"),
      function (l) {
    l.tabIndex = 0; l.setAttribute("role", "button");
    l.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault();
        $(l.htmlFor).click(); } });
  });
  $("datei-oeffnen").onchange = dateiWahl;
  $("ordner-oeffnen").onchange = dateiWahl;

  // Nächste Einheit: Aussehen und Chat sind vorbelegt, nach Schritt 2 geht es direkt zum Text für den Chat
  function nachZwei() { return Z.mappe && Z.mappe.anhaengen && Z.mappe.aussehen && chatInfo(Z.mappe.chat) ? 4 : 3; }
  document.querySelector(".zweige").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-zweig]"); if (!b || !Z.mappe) return;
    var vorher = zweig();
    Z.mappe.zweig = b.dataset.zweig;
    if (vorher === "richtung" && b.dataset.zweig === "steuer") typenUebernehmen();
    if (b.dataset.zweig === "mach" || b.dataset.zweig === "richtung") {
      if (schritt() <= 2) { zeichne(); geaendert(); $("m-kontext").focus({ preventScroll: true }); }
      else { S.auf[2] = true; zeichne(); geaendert(); }
    } else {
      if (schritt() <= 2) { zeichne(); geaendert(); var k = $("vorlagen").querySelector("button"); if (k &&
          !inhalt()) k.focus({ preventScroll: true }); }
      else { S.auf[2] = true; zeichne(); geaendert(); }
    }
  });
  $("weiter-2").onclick = function () { gehe(nachZwei()); };

  // AP13.5b: „Ich gebe die Richtung“ – Eingabekarte (Art, Schwerpunkt, Übungen, Sprache, Material)
  var EIGENES = "Einheit aus eigenem Material";
  function richtungText() {
    var o = S.katalog.oberflaeche, a = S.angaben, t = [];
    var text = function (feld, w) { var x = o[feld].filter(function (y) { return y.wert === w; })[0]; return x ? x.text : w; };
    if ((a.schwerpunkt || []).length) t.push("Schwerpunkt: " + a.schwerpunkt.map(function (w) {
        return text("schwerpunkt", w); }).join(", "));
    if ((a.uebungstypen || []).length) t.push("Übungen: " + a.uebungstypen.join(", "));
    if (a.sprache && a.sprache !== "normal") t.push("Sprache: " + text("sprache", a.sprache));
    return t;
  }
  function textKacheln(box, feld, werte, gewaehlt, mehrfach) {
    if (box.querySelectorAll(".aus-kachel").length !== werte.length) {
      box.innerHTML = "";
      werte.forEach(function (w) {
        var b = el("button", { type: "button", cls: "aus-kachel", role: mehrfach ? "checkbox" : "radio",
          "aria-checked": "false", "data-feld": feld, "data-wert": w.wert, "data-mehrfach": mehrfach ? "1" : null });
        b.appendChild(el("span", { cls: "aus-name", text: w.text }));
        if (w.zeile) b.appendChild(el("span", { cls: "aus-zeile", text: w.zeile }));
        box.appendChild(b);
      });
    }
    Array.prototype.forEach.call(box.querySelectorAll(".aus-kachel"), function (b) {
      b.setAttribute("aria-checked", String(mehrfach ? gewaehlt.indexOf(b.dataset.wert) >= 0 : b.dataset.wert === gewaehlt));
    });
  }
  function zeichneRichtung() {
    if (!S.katalog || !Z.mappe) return;
    var o = S.katalog.oberflaeche, a = S.angaben, e = Z.mappe.einheit || {};
    var art = S.katalog.vorlagen.map(function (v) { return { wert: v.name, text: v.name, zeile: v.zeile }; });
    var typen = S.katalog.automatisch.filter(function (t) { return t !== "Textfeld" && t !== "Seite"; })
        .map(function (t) { return { wert: t, text: t }; });
    textKacheln($("r-art"), "art", art, e.vorlage || S.katalog.vorlagen[0].name, false);
    [["r-schwerpunkt", "a-schwerpunkt"]].forEach(function (ids) { ids.forEach(function (id) {
      textKacheln($(id), "schwerpunkt", o.schwerpunkt, a.schwerpunkt || [], true); }); });
    textKacheln($("r-uebungen"), "uebungstypen", typen, a.uebungstypen || [], true);
    ["r-sprache", "a-sprache"].forEach(function (id) { textKacheln($(id), "sprache", o.sprache, a.sprache || "normal", false);
        });
    Array.prototype.forEach.call($("r-art").querySelectorAll(".aus-kachel"), function (b) { b.disabled = inhalt(); });
    // Material: bei „Einheit aus eigenem Material“ als drittes Feld unter dem Fach, sonst zuletzt
    var teil = $("richtung-teil"), feld = $("r-material-feld");
    if ((e.vorlage === EIGENES) !== (teil.firstElementChild === feld)) {
      if (e.vorlage === EIGENES) teil.insertBefore(feld, teil.firstElementChild); else teil.appendChild(feld);
    }
    if (document.activeElement !== $("r-material")) $("r-material").value = Z.mappe.material || "";
  }
  function richtungKlick(ev) {
    var b = ev.target.closest(".aus-kachel"); if (!b || !Z.mappe || b.disabled) return;
    var feld = b.dataset.feld, wert = b.dataset.wert, a = {};
    if (feld === "art") {
      var v = vorlageNach(wert);
      if (v && !inhalt()) { karteVorlage(v); zeichne(); geaendert(); }
      return;
    }
    if (b.dataset.mehrfach) {
      var liste = (S.angaben[feld] || []).slice(), i = liste.indexOf(wert);
      if (i >= 0) liste.splice(i, 1); else liste.push(wert);
      // Reihenfolge wie die Kacheln (der erste bevorzugte Typ geht an die erste Übungskarte)
      var reihe = Array.prototype.map.call(b.parentNode.querySelectorAll(".aus-kachel"), function (k) { return k.dataset.wert; });
      wert = reihe.filter(function (w) { return liste.indexOf(w) >= 0; });
    }
    S.angaben[feld] = wert; a[feld] = wert;
    zeichneRichtung(); zeichneSchritte();
    angabenSchreiben(a);
    S.textSpaeter();
  }
  ["richtung-teil", "a-schwerpunkt", "a-sprache"].forEach(function (id) { $(id).addEventListener("click", richtungKlick); });
  $("r-material").addEventListener("input", function () {
    if (!Z.mappe) return;
    Z.mappe.material = $("r-material").value;
    if (document.activeElement !== $("a-material")) $("a-material").value = Z.mappe.material;
    geaendert();
  });
  // Wechsel „Ich gebe die Richtung“ → „Ich steuere“: die Übungskarten der Vorlage bekommen die bevorzugten Typen
  function typenUebernehmen() {
    var wunsch = S.angaben.uebungstypen || [], v = vorlageNach((Z.mappe.einheit || {}).vorlage);
    if (!wunsch.length || !v || inhalt()) return;
    var ueben = v.phasen.filter(function (p) { return p.rolle === "üben"; }).map(function (p) { return p.phase; });
    var n = 0;
    Z.mappe.bausteine.forEach(function (k) {
      if (n < wunsch.length && k.typ === S.AUTO && ueben.indexOf(k.phase) >= 0 && !k.aus) { k.typ = wunsch[n]; n += 1; }
    });
  }

  function vorlagenZeigen() {
    var box = $("vorlagen"); box.innerHTML = "";
    S.katalog.vorlagen.forEach(function (v, i) {
      var b = el("button", { type: "button", cls: "vorlage", "data-vorlage": i, "aria-pressed": "false" }, [
        el("span", { cls: "vorlage-name", text: v.name }), el("span", { cls: "vorlage-zeile", text: v.zeile }),
        el("span", { cls: "vorlage-phasen", text: v.phasen.map(function (p) { return p.phase; }).join(" · ") })]);
      b.onclick = function () {
        if (!Z.mappe || inhalt()) return;
        karteVorlage(v);
        zeichne(); geaendert();
      };
      box.appendChild(b);
    });
  }

  function mischen(hex, anteil) {      // Akzent auf Weiß getönt (wie gen/html.py tint)
    var h = hex.replace("#", ""), r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16),
        b = parseInt(h.slice(4, 6), 16);
    var m = function (c) { return Math.round(255 - (255 - c) * anteil); };
    return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
  }
  function familieInfo(name) {
    return S.familien && S.familien.familien.filter(function (f) { return f.name === name; })[0];
  }
  function familieJetzt() { return S.angaben.familie || (S.familien && S.familien.standard) || "sachlich"; }
  function akzent() {
    var f = familieInfo(familieJetzt()), w = S.angaben.farbe || "";
    if (f && f.akzent_fest) return f.akzent;
    return /^#[0-9A-Fa-f]{6}$/.test(w) ? w : FARBEN[w] || (f ? f.akzent : STANDARD_FARBE);
  }
  // „Grün · luftig“: nur die Feinheiten, die vom Standard der Familie abweichen (Fazit von Schritt 3)
  function feinheitenText() {
    var f = familieInfo(familieJetzt()), w = S.angaben.farbe || "";
    var klein = function (t) { return t.charAt(0).toLowerCase() + t.slice(1); };
    var dichte = S.angaben.dichte || "normal", kasten = S.angaben.kasten || "familie";
    return [f && f.akzent_fest || !w ? "" : /^#/.test(w) ? "eigene Farbe " + w.toUpperCase() : oberText("farbe", w),
      dichte === "normal" ? "" : klein(oberText("dichte", dichte)),
      kasten === "familie" ? "" : klein(oberText("kasten", kasten))].filter(Boolean).join(" · ");
  }
  function hebel() {
    return { akzent: S.angaben.farbe || "", dichte: S.angaben.dichte || "normal", kasten: S.angaben.kasten || "familie" };
  }
  // kleines Dreieck mit Tooltip: Importprobe der Familie oder Import des Formats steht aus
  var PROBE_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.5 15 14.5H1z" ' +
      'fill="#FDE68A" stroke="#713F12" stroke-width="1.3" stroke-linejoin="round"/><rect x="7.3" y="5.6" width="1.4" ' +
      'height="4.6" fill="#713F12"/><rect x="7.3" y="11.3" width="1.4" height="1.5" fill="#713F12"/></svg>';
  function dreieck(text) {
    var d = el("span", { cls: "aus-probe", role: "img", title: text, "aria-label": text });
    d.innerHTML = PROBE_SVG;                                          // eigenes SVG, keine Eingabe
    return d;
  }
  var FORMAT_PROBE = { einthemen: "Import auf der Plattform noch nicht geprüft",
    wochen: "Import auf der Plattform noch nicht geprüft" }; // Stand der Importproben, s. Entwicklungsdoku
  // Kacheln der Familien (AP13.5d): Name und ein Satz, ohne Miniatur; die Vorschau steht rechts oder in der Leiste
  function zeichneFamilien() {
    var box = $("aus-familie"), liste = S.familien.familien, gewaehlt = familieJetzt();
    if (box.querySelectorAll(".aus-kachel").length !== liste.length) {
      box.innerHTML = "";
      liste.forEach(function (f) {
        var b = el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": "false",
          "data-feld": "familie", "data-wert": f.name });
        b.appendChild(el("span", { cls: "aus-name" }, [el("span", { text: f.text }),
          f.probe.length ? dreieck("Importprobe steht aus") : null]));
        b.appendChild(el("span", { cls: "aus-zeile", text: f.zeile }));
        box.appendChild(b);
      });
    }
    Array.prototype.forEach.call(box.querySelectorAll(".aus-kachel"), function (b) {
      b.setAttribute("aria-checked", String(b.dataset.wert === gewaehlt));
    });
    $("vorschau-name").textContent = (familieInfo(gewaehlt) || {}).text || "";
    vorschauLaden();
  }
  // Vorschau der gewählten Familie (AP13.5d §1, §4): bei jedem Wechsel von Familie oder Feinheit ein Aufruf von
  // gen/api.design_vorschau; gefüllt wird immer aus dem letzten Ergebnis, auch wenn Schritt 3 erst danach erscheint
  var vorschauStand = "", vorschauFertig = "", vorschauHtml = "";
  function vorschauFuellen() {
    var innen = $("vorschau-gross").querySelector(".vs-innen");
    if (!vorschauFertig) {
      if (!innen.dataset.stand) innen.innerHTML = '<p class="leise vs-warte">Vorschau wird vorbereitet …</p>';
      return;
    }
    if (innen.dataset.stand !== vorschauFertig) {
      innen.innerHTML = vorschauHtml;                                 // HTML aus dem Generator
      innen.dataset.stand = vorschauFertig;
    }
    vorschauMassstab();
  }
  function vorschauLaden() {
    vorschauFuellen();
    if (!Z.geladen || !S.familien || !Z.mappe) return;
    var fam = familieJetzt(), h = hebel(), schluessel = fam + JSON.stringify(h);
    if (schluessel === vorschauStand) return;
    vorschauStand = schluessel;
    km.designVorschau(h, fam).then(function (html) {
      if (vorschauStand !== schluessel) return;                       // inzwischen neue Wahl
      vorschauHtml = html; vorschauFertig = schluessel;
      vorschauFuellen();
    }).catch(function (e) {
      vorschauStand = "";
      console.error("Vorschau der Familie", e);
    });
  }
  // die Mini-Einheit ist 500 px breit (plus Rand); verkleinert auf die Breite der Spalte oder Leiste
  function vorschauMassstab() {
    var box = $("vorschau-gross"), innen = box.querySelector(".vs-innen");
    if (!box.clientWidth || !innen.dataset.stand) return;
    var s = Math.min(1, box.clientWidth / innen.offsetWidth);
    innen.style.transform = s < 1 ? "scale(" + s.toFixed(4) + ")" : "";
    innen.style.marginBottom = s < 1 ? -Math.floor(innen.offsetHeight * (1 - s)) + "px" : "";   // kein Leerraum beim Scrollen
    box.style.setProperty("--vs-hoehe", Math.ceil(innen.offsetHeight * s) + "px");
  }
  // im nächsten Frame: der Maßstab ändert die Höhe der Box, sonst meldet WebKit eine ResizeObserver-Schleife als Seitenfehler
  if (window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(vorschauMassstab); }).observe($("vorschau-gross"));
  else window.addEventListener("resize", vorschauMassstab);
  // Leiste unter 1100 px: ein Tippen klappt auf, ein zweites zu
  $("vorschau-leiste").onclick = function () {
    var auf = !$("vorschau-spalte").classList.contains("offen");
    $("vorschau-spalte").classList.toggle("offen", auf);
    $("vorschau-leiste").setAttribute("aria-expanded", String(auf));
    vorschauMassstab();
  };
  function miniDichte(wert) {
    var a = { luftig: 14, normal: 10, kompakt: 7 }[wert], s = '<svg viewBox="0 0 120 40" aria-hidden="true" ' +
        'focusable="false"><rect width="120" height="40" fill="#fff"/>';
    for (var i = 0; i < 3; i++) s += '<rect x="10" y="' + (6 + i * a) + '" width="' + (90 - i * 14) +
        '" height="3" rx="1" fill="#5B6475"/>';
    return s + "</svg>";
  }
  // Kästen: rund, eckig, Linie; „familie“ zeichnet die Form der gewählten Familie (formen.kasten in familien.yaml)
  function miniKasten(wert) {
    var s = '<svg viewBox="0 0 120 40" aria-hidden="true" focusable="false"><rect width="120" height="40" fill="#fff"/>',
        text = '<rect x="26" y="15" width="56" height="3" rx="1" fill="#5B6475"/><rect x="26" y="22" width="40" ' +
        'height="3" rx="1" fill="#C3C8D2"/>';
    var box = function (r, fill, stroke, extra) {
      return '<rect x="14" y="7" width="92" height="26" rx="' + r + '" fill="' + fill + '"' +
          (stroke ? ' stroke="#5B6475"' : '') + (extra || "") + '/>';
    };
    if (wert === "linie") return s + '<rect x="14" y="7" width="3" height="26" fill="#5B6475"/>' + text + "</svg>";
    if (wert === "rund") return s + box(10, "#EEF1F6", true) + text + "</svg>";
    if (wert === "eckig") return s + box(0, "#EEF1F6", true) + text + "</svg>";
    var f = familieInfo(familieJetzt()) || {}, r = Math.min(f.kasten_r || 0, 12), form = f.kasten_form || "rahmen";
    var teil = {
      balken: box(r, "#EEF1F6") + '<rect x="14" y="7" width="4" height="26" fill="#5B6475"/>',
      flaeche: box(r, "#E6EBF5"), papier: box(r, "#F4EFE4"),
      linie_oben: box(r, "#fff") + '<rect x="14" y="7" width="92" height="2" fill="#5B6475"/>',
      gestrichelt: box(r, "#fff", true, ' stroke-dasharray="4 3"'),
      haarlinie: box(r, "#fff", true, ' stroke-width="0.6"'), rahmen: box(r, "#fff", true),
      rahmen_dick: box(r, "#fff", true, ' stroke-width="2.4"'),
      offen: '<rect x="14" y="31" width="92" height="1" fill="#C3C8D2"/>',
      einzug: '<rect x="20" y="9" width="1.4" height="22" fill="#5B6475"/>',
      links: '<rect x="14" y="7" width="3" height="26" fill="#5B6475"/>',
      zitat: '<rect x="14" y="7" width="2" height="26" fill="#5B6475"/><text x="20" y="18" font-size="12" ' +
          'fill="#5B6475">„</text>'
    }[form] || box(r, "#fff", true);
    return s + teil + text + "</svg>";
  }
  function miniFormat(wert, hue) {
    var s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><rect width="120" height="76" ' +
        'fill="#fff"/>', zeile = function (y, b) {
          return '<rect x="14" y="' + y + '" width="' + b + '" height="3" rx="1" fill="#0B1220"/>'; };
    if (wert === "kacheln") {
      for (var i = 0; i < 6; i++) {
        var x = 8 + (i % 3) * 35, y = 8 + Math.floor(i / 3) * 31;
        s += '<rect x="' + x + '" y="' + y + '" width="32" height="28" rx="4" fill="' + mischen(hue, 0.18) + '"/>'
          + '<rect x="' + (x + 5) + '" y="' + (y + 19) + '" width="18" height="3" rx="1" fill="#0B1220"/>';
      }
    } else if (wert === "komprimiert") {          // Themen zum Aufklappen: zugeklappte Zeilen mit Pfeil
      [8, 26, 44].forEach(function (y, i) {
        s += '<rect x="8" y="' + y + '" width="104" height="14" rx="3" fill="#F2F4F7"/>' + zeile(y + 5, 50 - i * 8)
          + '<path d="M100 ' + (y + 5) + 'l4 4 4-4" fill="none" stroke="' + hue + '" stroke-width="1.5"/>';
      });
      s += '<rect x="8" y="62" width="104" height="8" rx="2" fill="' + mischen(hue, 0.18) + '"/>';
    } else if (wert === "einthemen") {            // ein Thema je Reiter
      [8, 40, 72].forEach(function (x, i) {
        s += '<rect x="' + x + '" y="8" width="30" height="12" rx="2" fill="' + (i ? "#F2F4F7" : mischen(hue, 0.3)) +
            '"/>';
      });
      s += '<rect x="8" y="22" width="104" height="46" rx="3" fill="#fff" stroke="#E3E7EE"/>' + zeile(30, 56)
        + '<rect x="14" y="38" width="80" height="3" rx="1" fill="#C3C8D2"/><rect x="14" y="45" width="70" ' +
          'height="3" rx="1" fill="#C3C8D2"/>';
    } else if (wert === "wochen") {               // Abschnitte mit Datumsbereich
      [8, 30, 52].forEach(function (y, i) {
        s += '<rect x="8" y="' + y + '" width="104" height="17" rx="3" fill="#F2F4F7"/><rect x="12" y="' + (y + 4) +
            '" width="20" height="9" rx="2" fill="' + mischen(hue, 0.3) + '"/>' +
            '<rect x="38" y="' + (y + 7) + '" width="' + (46 - i * 8) + '" height="3" rx="1" fill="#0B1220"/>';
      });
    } else {
      [8, 30, 52].forEach(function (y, i) {
        s += '<rect x="8" y="' + y + '" width="104" height="17" rx="3" fill="' + (i ? "#F2F4F7" : mischen(hue, 0.18)) +
            '"/>' + zeile(y + 7, 46 - i * 8);
      });
    }
    return s + "</svg>";
  }
  function kachel(gruppe, wert, text, mini, gewaehlt, zeile, probe) {
    var b = el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": String(gewaehlt),
        "data-feld": gruppe, "data-wert": wert });
    var m = el("span", { cls: "aus-mini" }); m.innerHTML = mini;      // eigenes SVG, keine Eingabe
    b.appendChild(m);
    b.appendChild(el("span", { cls: "aus-name" }, [el("span", { cls: "aus-name-text", text: text }),
      probe ? dreieck(probe) : null]));
    if (zeile) b.appendChild(el("span", { cls: "aus-zeile", text: zeile }));
    return b;
  }
  // Kacheln werden einmal gebaut und danach nur umgeschaltet: ein Neubau zwischen mousedown und mouseup schluckt in
  // Firefox den Klick, der Steckbrief bliebe ohne die Wahl. w.label setzt eine Beschriftung nur für Vorleseprogramme
  // (erste Kachel bei Farbe und Kästen, ohne sichtbaren Text)
  function kachelGruppe(box, gruppe, werte, mini, gewaehlt) {
    var alt = box.querySelectorAll(".aus-kachel");
    if (alt.length !== werte.length || werte.some(function (w, i) { return alt[i].dataset.wert !== w.wert; })) {
      box.innerHTML = "";
      werte.forEach(function (w) { box.appendChild(kachel(gruppe, w.wert, w.text, "", false, w.zeile, w.probe)); });
    }
    Array.prototype.forEach.call(box.querySelectorAll(".aus-kachel"), function (b, i) {
      b.setAttribute("aria-checked", String(werte[i].wert === gewaehlt));
      if (werte[i].label) b.setAttribute("aria-label", werte[i].label); else b.removeAttribute("aria-label");
      var t = b.querySelector(".aus-name-text");
      if (t && t.textContent !== werte[i].text) t.textContent = werte[i].text;
      var m = b.querySelector(".aus-mini"), svg = mini(werte[i].wert);
      if (m.dataset.svg !== svg) { m.innerHTML = svg; m.dataset.svg = svg; }      // eigenes SVG, keine Eingabe
    });
  }
  function zeichneAussehen() {
    if (!S.katalog) return;
    var o = S.katalog.oberflaeche, hue = akzent(), fam = familieInfo(familieJetzt()) || {};
    if (S.familien) {
      zeichneFamilien();
      var fest = fam.akzent_fest, farbe = S.angaben.farbe || "";
      kachelGruppe($("aus-dichte"), "dichte", S.familien.dichte, miniDichte, S.angaben.dichte || "normal");
      kachelGruppe($("aus-kasten"), "kasten", S.familien.kasten.map(function (w) {
        return w.wert === "familie" ? { wert: w.wert, text: "", label: "Kästen wie " + (fam.text || "die Familie") } : w;
      }), miniKasten, S.angaben.kasten || "familie");
      $("farbe-eigen-l").hidden = !/^#/.test(farbe) || !!fest;
      if (/^#[0-9A-Fa-f]{6}$/.test(farbe)) $("farbe-eigen").value = farbe.toLowerCase();
      $("farbe-fest").hidden = !fest;
      $("farbe-fest").textContent = fest ? oberText("familie", familieJetzt()) + " nutzt keine Akzentfarbe." : "";
      $("aus-farbe").classList.toggle("aus-gesperrt", !!fest);
    }
    var format = S.angaben.format || "themen";
    kachelGruppe($("aus-format"), "format", o.format.map(function (w) {
      return { wert: w.wert, text: w.text, zeile: w.wert === "wochen" ? "braucht einen Kursbeginn" : "",
        probe: FORMAT_PROBE[w.wert] };
    }), function (w) { return miniFormat(w, hue); }, format);
    $("start-l").hidden = format !== "wochen";
    if (document.activeElement !== $("a-start")) $("a-start").value = S.angaben.start || "";
    // Farbe (AP13.5d §3): erster Kreis = Farbe der Familie (Wert leer), dann fünf Namen, zuletzt „Eigene“
    var famHue = fam.akzent || STANDARD_FARBE;
    kachelGruppe($("aus-farbe"), "farbe", o.farbe.map(function (w) {
      return w.wert ? w : { wert: "", text: "", label: "Farbe von " + (fam.text || "der Familie") };
    }).concat([{ wert: "eigen", text: "Eigene" }]), function (w) {
      if (w === "eigen") return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" ' +
          'r="15" fill="' + (/^#/.test(S.angaben.farbe || "") ? S.angaben.farbe : "#fff") + '" stroke="#5B6475" ' +
          'stroke-dasharray="3 3" stroke-width="2"/></svg>';
      return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="16" fill="'
        + (FARBEN[w] || famHue) + '"/></svg>';
    }, /^#/.test(S.angaben.farbe || "") ? "eigen" : S.angaben.farbe || "");
    if (S.familien) Array.prototype.forEach.call($("aus-farbe").querySelectorAll(".aus-kachel"), function (b) {
      b.disabled = !!fam.akzent_fest; });
    kachelGruppe($("aus-bilder"), "bilder", o.bilder, miniBilder, bilderWert());
    kachelGruppe($("aus-website"), "website", o.website, function (w) { return miniWebsite(w, hue); },
        S.angaben.website || "textfeld");
  }
  function miniBilder(wert) {
    var n = { "0": 0, "2-3": 2, "4-7": 4, "8+": 8 }[wert] || 0,
        s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><rect width="120" height="76" ' +
        'fill="#fff"/>';
    if (!n) s += '<rect x="20" y="20" width="80" height="36" rx="3" fill="none" stroke="#C3C8D2" ' +
        'stroke-dasharray="4 3"/>';
    for (var i = 0; i < n; i++) {
      var sp = n > 4 ? 4 : n, x = 8 + (i % sp) * (104 / sp), y = n > 4 ? 8 + Math.floor(i / 4) * 32 : 20;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (104 / sp - 6) + '" height="' + (n > 4 ? 28 : 36) +
          '" rx="3" fill="#D5DAE3"/>';
    }
    return s + "</svg>";
  }
  function miniWebsite(wert, hue) {
    var s = '<svg viewBox="0 0 120 50" aria-hidden="true" focusable="false"><rect width="120" height="50" fill="#fff"/>'
      + '<rect x="8" y="6" width="70" height="4" rx="1" fill="#0B1220"/>';
    if (wert === "textfeld") s += '<rect x="8" y="16" width="104" height="28" rx="4" fill="' + mischen(hue, 0.16) +
        '"/>'
      + '<rect x="14" y="23" width="40" height="3" rx="1" fill="#5B6475"/><rect x="14" y="31" width="60" height="3" ' +
          'rx="1" fill="#C3C8D2"/>';
    else [16, 31].forEach(function (y) { s += '<rect x="8" y="' + y +
        '" width="104" height="12" rx="3" fill="#F2F4F7"/><rect x="14" y="' + (y + 4) +
        '" width="9" height="4" rx="1" fill="' + hue + '"/><rect x="28" y="' + (y + 4) +
        '" width="40" height="3" rx="1" fill="#5B6475"/>'; });
    return s + "</svg>";
  }
  $("schritt-3").addEventListener("click", function (ev) {
    var b = ev.target.closest(".aus-kachel"); if (!b || !Z.mappe || b.disabled) return;
    var a = {}, wert = b.dataset.wert;
    if (b.dataset.feld === "farbe" && wert === "eigen") wert = $("farbe-eigen").value.toUpperCase();
    a[b.dataset.feld] = wert;
    S.angaben[b.dataset.feld] = wert;
    zeichneAussehen(); felderFuellen();
    angabenSchreiben(a, true);
    if (b.dataset.feld === "format" && wert === "wochen" && !S.angaben.start) $("a-start").focus();
  });
  // Kursbeginn (Format Wochen): schreibt kurs.start als JJJJ-MM-TT; leer = Tag des Baus
  $("a-start").addEventListener("change", function () {
    if (!Z.mappe) return;
    var w = $("a-start").value || "";
    if (w && !/^\d{4}-\d{2}-\d{2}$/.test(w)) return;
    S.angaben.start = w;
    angabenSchreiben({ start: w }, false);
  });
  // Farbfeld „Eigene“: schreibt farbe als #RRGGBB in den Steckbrief
  $("farbe-eigen").addEventListener("change", function () {
    if (!Z.mappe) return;
    var w = $("farbe-eigen").value.toUpperCase();
    S.angaben.farbe = w;
    zeichneAussehen(); felderFuellen();
    angabenSchreiben({ farbe: w }, true);
  });
  $("weiter-3").onclick = function () { if (Z.mappe) { Z.mappe.aussehen = true; gehe(4); } };

  // Schreiben nacheinander: schnelle Klicks auf mehrere Kacheln und das erste Anlegen dürfen sich den Steckbrief nicht
  // überschreiben; neuPruefen liest die Angaben erst, wenn die Kette leer ist
  function steckbriefSicher() {
    S.schreibKette = S.schreibKette.then(async function () { if (Z.mappe &&
        !Z.steckbrief_text) await steckbriefAnlegen(); })
      .catch(zeigeFehler);
    return S.schreibKette;
  }
  function angabenSchreiben(a, mitStand) {
    S.schreibKette = S.schreibKette.then(function () { return angabenSchreibenJetzt(a, mitStand); });
    return S.schreibKette;
  }
  async function angabenSchreibenJetzt(a, mitStand) {
    try {
      await km.bereit();
      if (!Z.steckbrief_text) await steckbriefAnlegen();
      Z.steckbrief_text = await km.mappeFn("angaben_schreiben", [Z.steckbrief_text, a]);
      Object.assign(S.angaben, a);
      // die Bilder-Stufe ändert die Prüfung
      if (mitStand) { await km.stand(Z.kurs_md); if (inhalt()) { await auswertung(); zeichne(); } }
      zeichneAussehen(); zeichneSchritte();
      geaendert();
    } catch (e) { zeigeFehler(e); }
  }

  var verwerfenAktion = null;
  function frage(text, aktion) {
    verwerfenAktion = aktion;
    $("verwerfen-text").textContent = text;
    $("verwerfen-frage").hidden = false;
    $("verwerfen-nein").focus();
  }
  $("verwerfen-nein").onclick = function () { $("verwerfen-frage").hidden = true; verwerfenAktion = null; };
  $("verwerfen-ja").onclick = async function () {
    $("verwerfen-frage").hidden = true;
    var a = verwerfenAktion; verwerfenAktion = null;
    if (a) { try { await a(); } catch (e) { zeigeFehler(e); } }
  };
  $("weiter-weg").onclick = function () {
    var titel = $("weiter-knopf").textContent.replace(/^Weiter mit /, "");
    frage("Einheit " + titel + " verwerfen? Sie ist nur in diesem Browser gesichert.", async function () {
      await km.autosaveLoeschen();
      $("weiter").dataset.da = ""; $("weiter").hidden = true;
      $("f-thema").focus();
    });
  };
  $("schliessen").onclick = function () {
    var titel = (Z.mappe && ((Z.mappe.einheit && Z.mappe.einheit.thema) || Z.mappe.titel)) || "";
    frage("Einheit „" + titel + "“ schließen? " + (S.gespeichert ?
        "Die Einheit hast du gespeichert; die Sicherung im Browser wird gelöscht."
      : "Was du nicht mit „Einheit speichern“ gesichert hast, geht verloren."), async function () {
      clearTimeout(S.autosaveTimer);
      await km.autosaveLoeschen();
      S.leeren();
      weiterAnzeigen();
    });
  };

  var FELDER = { "a-thema": "thema", "a-jahrgang": "jahrgang", "a-minuten": "minuten", "a-fach": "fach",
      "a-schulart": "schulart",
    "a-format": "format", "a-familie": "familie", "a-farbe": "farbe", "a-farbe-hex": "farbe", "a-abschluss": "abschluss",
    "a-portionierung": "portionierung", "a-kontext": "kontext" };
  $("mehr").addEventListener("change", async function (ev) {
    if (!Z.mappe) return;
    if (ev.target.id === "a-chat") {
      Z.mappe.chat = ev.target.value || null;
      if (!Z.mappe.chat) delete Z.mappe.chat;
      zeichne(); geaendert(); S.textSpaeter(0);
      return;
    }
    var feld = FELDER[ev.target.id]; if (!feld) return;
    var wert = ev.target.value;
    if (feld === "minuten") wert = parseInt(wert, 10) || "";
    if (ev.target.id === "a-farbe" && wert === "eigen") wert = ($("a-farbe-hex").value || $("farbe-eigen").value).toUpperCase();
    if (ev.target.id === "a-farbe-hex") {
      if (!/^#[0-9A-Fa-f]{6}$/.test(wert)) return;
      wert = wert.toUpperCase();
    }
    if (["thema", "jahrgang", "minuten"].indexOf(feld) >= 0) {
      Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}); Z.mappe.einheit[feld] = wert;
      if (feld === "thema") Z.mappe.titel = wert;
    }
    S.angaben[feld] = wert;
    zeichne();
    var a = {}; a[feld] = wert;
    angabenSchreiben(a, feld === "farbe" || feld === "familie");
  });
  var kontextTimer = null, kontextOffen = {};
  function kontextSchreiben(feld, wert) {
    if (!Z.mappe) return;
    S.angaben[feld] = wert; kontextOffen[feld] = wert;
    clearTimeout(kontextTimer);
    kontextTimer = setTimeout(function () { var a = kontextOffen; kontextOffen = {}; angabenSchreiben(a);
        S.textSpaeter(); }, 400);
  }
  $("m-kontext").addEventListener("input", function () { kontextSchreiben("kontext", $("m-kontext").value); });
  $("m-fach").addEventListener("input", function () { kontextSchreiben("fach", $("m-fach").value.trim()); });
  $("a-material").addEventListener("input", function () {
    if (!Z.mappe) return;
    Z.mappe.material = $("a-material").value;
    geaendert();
  });

  // hell und dunkel wie die Landingpage (Schlüssel kursmuehle-schema)
  function schemaZeigen() {
    var d = document.documentElement.dataset.theme === "dark";
    $("schema").textContent = d ? "Hell" : "Dunkel";        // die Beschriftung nennt, wohin der Klick führt
  }
  $("schema").onclick = function () {
    var d = document.documentElement.dataset.theme !== "dark";
    if (d) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("kursmuehle-schema", d ? "dunkel" : "hell"); } catch (e) {
        /* ohne Speicher: nur diese Seite */ }
    schemaZeigen();
  };
  Object.assign(S, { adresseLesen: adresseLesen, angabenSchreiben: angabenSchreiben, gehe: gehe, nachZwei: nachZwei, neuStart: neuStart,
    schemaZeigen: schemaZeigen, steckbriefSicher: steckbriefSicher, vorlageNach: vorlageNach, vorschauLaden: vorschauLaden,
    vorlagenZeigen: vorlagenZeigen, weiterAnzeigen: weiterAnzeigen, zeichneAussehen: zeichneAussehen,
    zeichneSchritte: zeichneSchritte, zeigeFehler: zeigeFehler });
})();
