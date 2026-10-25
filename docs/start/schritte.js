/* Kursmühle – Schrittfolge der Seite: sieben Schritte untereinander, davor die erledigten als aufklappbare
 * Zeile; Zweig „Mach du“ setzt Vorlage und Bausteine still, „Ich steuere“ zeigt Vorlagen, Karten mit Aufträgen und
 * „Mehr einstellen“. Dazu Aussehen, Verwerfen, Kursangaben, hell und dunkel. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, AUS_FORMATE = S.AUS_FORMATE, FARBEN = S.FARBEN, SCHRITTE = S.SCHRITTE, STANDARD_FARBE = S.STANDARD_FARBE,
      Z = S.Z, ZWEIG_TEXT = S.ZWEIG_TEXT, auswertung = S.auswertung, autosave = S.autosave,
      bilderStandard = S.bilderStandard, bilderWert = S.bilderWert, bildwuensche = S.bildwuensche,
      chatInfo = S.chatInfo, datumZeit = S.datumZeit, einheitTag = S.einheitTag, el = S.el, erledigtBis = S.erledigtBis,
      fehlerText = S.fehlerText, fehlerZahl = S.fehlerZahl, felderFuellen = S.felderFuellen, geaendert = S.geaendert,
      hinweiseSichern = S.hinweiseSichern, hoehe = S.hoehe, inhalt = S.inhalt, neuPruefen = S.neuPruefen,
      oberText = S.oberText, schritt = S.schritt, sektion = S.sektion, sichtbareSchritte = S.sichtbareSchritte,
      status = S.status, teileOffen = S.teileOffen, texte = S.texte, zeichne = S.zeichne, zweig = S.zweig;
  function fazit(n) {
    var e = (Z.mappe && Z.mappe.einheit) || {};
    if (n === 1) return [e.thema, e.jahrgang ? "Jahrgangsstufe " + e.jahrgang : "", e.minuten ? e.minuten +
        " Minuten" : ""].filter(Boolean).join(" · ");
    if (n === 2) {
      var z = ZWEIG_TEXT[zweig()] || "";
      var n = Z.mappe.bausteine.filter(function (k) { return !k.aus; }).length;
      return [z, e.vorlage, zweig() === "steuer" ? n + " Bausteine" : ""].filter(Boolean).join(" · ");
    }
    if (n === 3) return [oberText("vorlage", S.angaben.vorlage), oberText("format", S.angaben.format), oberText("farbe",
        S.angaben.farbe || ""),
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
    var box = sec.querySelector(".s-hinweis"), text = S.hinweisTexte[String(n)];
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
    ["mach", "steuer"].forEach(function (w) { $("zweig-" + w).setAttribute("aria-pressed", String(z === w)); });
    $("steuer-teil").hidden = z !== "steuer";
    $("mach-teil").hidden = z !== "mach";
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
      format: o.format[0].wert, vorlage: o.vorlage[0].wert, farbe: o.farbe[0].wert, website: o.website[0].wert,
      abschluss: o.abschluss[0].wert, portionierung: o.portionierung[0].wert }]);
  }

  function einheitAnlegen(e, v) {
    e.vorlage = v.name;
    Z.mappe = km.neueMappe(e.thema, e, vorlageKarten(v, e.minuten));
    Z.mappe.schritt = 2;
    Z.mappe.zeit_selbst = false;                   // Standard: das Modell verteilt die Minuten
    Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null;
        Z.beispiel = null;
    S.angaben = { thema: e.thema, jahrgang: e.jahrgang, minuten: e.minuten, vorlage: "schlicht", format: "themen",
        farbe: "" };
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
    Z.mappe.zweig = b.dataset.zweig;
    if (b.dataset.zweig === "mach") {
      if (schritt() <= 2) { zeichne(); geaendert(); $("m-kontext").focus({ preventScroll: true }); }
      else { S.auf[2] = true; zeichne(); geaendert(); }
    } else {
      if (schritt() <= 2) { zeichne(); geaendert(); var k = $("vorlagen").querySelector("button"); if (k &&
          !inhalt()) k.focus({ preventScroll: true }); }
      else { S.auf[2] = true; zeichne(); geaendert(); }
    }
  });
  $("weiter-2").onclick = function () { gehe(nachZwei()); };

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
  function akzent() { return FARBEN[S.angaben.farbe] || STANDARD_FARBE; }
  // Miniaturen nach den Token der Designvorlagen in gen/html.py (Rundung, Kartenform), nur Formen, kein Text
  function miniVorlage(wert, hue) {
    var r = { schlicht: 3, kacheln: 6, magazin: 0 }[wert],
        s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false">'
      + '<rect width="120" height="76" fill="#fff"/>'
      + '<rect x="8" y="7" width="104" height="15" rx="' + r + '" fill="' + hue + '"/>'
      + '<rect x="8" y="27" width="56" height="4" rx="1" fill="#0B1220"/>';
    [8, 63].forEach(function (x) {
      if (wert === "schlicht") s += '<rect x="' + x +
          '" y="37" width="49" height="31" rx="3" fill="#fff" stroke="#D5DAE3"/>';
      else if (wert === "kacheln") s += '<rect x="' + x + '" y="37" width="49" height="31" rx="6" fill="' + mischen(hue,
          0.16) + '"/>';
      else s += '<rect x="' + x + '" y="37" width="49" height="1.6" fill="#17171A"/>';
      var ix = wert === "magazin" ? x : x + 5;
      s += '<rect x="' + ix + '" y="44" width="30" height="3" rx="1" fill="#5B6475"/><rect x="' + ix +
          '" y="51" width="38" height="3" rx="1" fill="#C3C8D2"/>'
        + '<rect x="' + ix + '" y="57" width="26" height="3" rx="1" fill="#C3C8D2"/>';
    });
    return s + "</svg>";
  }
  function miniFormat(wert, hue) {
    var s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><rect width="120" height="76" ' +
        'fill="#fff"/>';
    if (wert === "kacheln") {
      for (var i = 0; i < 6; i++) {
        var x = 8 + (i % 3) * 35, y = 8 + Math.floor(i / 3) * 31;
        s += '<rect x="' + x + '" y="' + y + '" width="32" height="28" rx="4" fill="' + mischen(hue, 0.18) + '"/>'
          + '<rect x="' + (x + 5) + '" y="' + (y + 19) + '" width="18" height="3" rx="1" fill="#0B1220"/>';
      }
    } else {
      [8, 30, 52].forEach(function (y, i) {
        s += '<rect x="8" y="' + y + '" width="104" height="17" rx="3" fill="' + (i ? "#F2F4F7" : mischen(hue, 0.18)) +
            '"/>'
          + '<rect x="14" y="' + (y + 7) + '" width="' + (46 - i * 8) + '" height="3" rx="1" fill="#0B1220"/>';
      });
    }
    return s + "</svg>";
  }
  function kachel(gruppe, wert, text, mini, gewaehlt, zeile) {
    var b = el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": String(gewaehlt),
        "data-feld": gruppe, "data-wert": wert });
    var m = el("span", { cls: "aus-mini" }); m.innerHTML = mini;      // eigenes SVG, keine Eingabe
    b.appendChild(m);
    b.appendChild(el("span", { cls: "aus-name", text: text }));
    if (zeile) b.appendChild(el("span", { cls: "aus-zeile", text: zeile }));
    return b;
  }
  // Kacheln werden einmal gebaut und danach nur umgeschaltet: ein Neubau zwischen mousedown und mouseup schluckt in
  // Firefox den Klick, der Steckbrief bliebe ohne die Wahl
  function kachelGruppe(box, gruppe, werte, mini, gewaehlt) {
    var alt = box.querySelectorAll(".aus-kachel");
    if (alt.length !== werte.length || werte.some(function (w, i) { return alt[i].dataset.wert !== w.wert; })) {
      box.innerHTML = "";
      werte.forEach(function (w) { box.appendChild(kachel(gruppe, w.wert, w.text, "", false, w.zeile)); });
    }
    Array.prototype.forEach.call(box.querySelectorAll(".aus-kachel"), function (b, i) {
      b.setAttribute("aria-checked", String(werte[i].wert === gewaehlt));
      var m = b.querySelector(".aus-mini"), svg = mini(werte[i].wert);
      if (m.dataset.svg !== svg) { m.innerHTML = svg; m.dataset.svg = svg; }      // eigenes SVG, keine Eingabe
    });
  }
  function zeichneAussehen() {
    if (!S.katalog) return;
    var o = S.katalog.oberflaeche, hue = akzent();
    kachelGruppe($("aus-vorlage"), "vorlage", o.vorlage, function (w) { return miniVorlage(w, hue); },
        S.angaben.vorlage || "schlicht");
    kachelGruppe($("aus-format"), "format", o.format.filter(function (w) { return AUS_FORMATE.indexOf(w.wert) >= 0; }),
      function (w) { return miniFormat(w, hue); }, S.angaben.format || "themen");
    kachelGruppe($("aus-farbe"), "farbe", o.farbe, function (w) {
      return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="16" fill="'
        + (FARBEN[w] || STANDARD_FARBE) + '"/>' + (w ? "" : '<circle cx="20" cy="20" r="7" fill="#fff"/>') + "</svg>";
    }, S.angaben.farbe || "");
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
    var b = ev.target.closest(".aus-kachel"); if (!b || !Z.mappe) return;
    var a = {}; a[b.dataset.feld] = b.dataset.wert;
    S.angaben[b.dataset.feld] = b.dataset.wert;
    zeichneAussehen(); felderFuellen();
    angabenSchreiben(a, true);
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
    "a-format": "format", "a-vorlage": "vorlage", "a-farbe": "farbe", "a-abschluss": "abschluss",
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
    if (["thema", "jahrgang", "minuten"].indexOf(feld) >= 0) {
      Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}); Z.mappe.einheit[feld] = wert;
      if (feld === "thema") Z.mappe.titel = wert;
    }
    S.angaben[feld] = wert;
    zeichne();
    var a = {}; a[feld] = wert;
    angabenSchreiben(a, feld === "farbe" || feld === "vorlage");
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
  Object.assign(S, { adresseLesen: adresseLesen, gehe: gehe, nachZwei: nachZwei, neuStart: neuStart,
    schemaZeigen: schemaZeigen, steckbriefSicher: steckbriefSicher, vorlageNach: vorlageNach,
    vorlagenZeigen: vorlagenZeigen, weiterAnzeigen: weiterAnzeigen, zeichneAussehen: zeichneAussehen,
    zeichneSchritte: zeichneSchritte, zeigeFehler: zeigeFehler });
})();
