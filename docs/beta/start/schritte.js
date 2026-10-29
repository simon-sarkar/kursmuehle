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
  // AP13.8: erste Zahl 1 bis 13 im Feld Jahrgangsstufe oder Zielgruppe (wie gen/mappe.py jahrgang_zahl)
  function jahrgangZahl(w) { var m = /(^|\D)(1[0-3]|[1-9])(?!\d)/.exec(String(w || "")); return m ? m[2] : ""; }
  function fazit(n) {
    var e = (Z.mappe && Z.mappe.einheit) || {};
    var ohneLp = S.angaben.lehrplanbezug === "nein";       // AP13.6: ohne Lehrplan heißt das Feld „Zielgruppe“
    var jg = ohneLp ? jahrgangZahl(e.jahrgang) : e.jahrgang;   // eine Zahl darin ist die Jahrgangsstufe
    if (n === 1) return [e.thema, zielgruppeAus(e.jahrgang) ? "Zielgruppe: " + zielgruppeAus(e.jahrgang) : jg ?
      "Jahrgangsstufe " + jg : e.jahrgang ? "Zielgruppe: " + e.jahrgang : "",
      e.minuten ? e.minuten + " Minuten" : ""].filter(Boolean).join(" · ");
    if (n === 2) {
      var z = ZWEIG_TEXT[zweig()] || "";
      var n = Z.mappe.bausteine.filter(function (k) { return !k.aus; }).length;
      return [z, e.vorlage, zweig() === "steuer" ? n + " Bausteine" : ""].concat(zweig() === "richtung" ?
          richtungText() : []).filter(Boolean).join(" · ");
    }
    if (n === 3) return [oberText("familie", S.angaben.familie || "sachlich"), feinheitenText(),
      oberText("format", S.angaben.format), bilderText(), oberText("website", S.angaben.website ||
          "textfeld")].filter(Boolean).join(" · ");
    if (n === 4) { var c = chatInfo(Z.mappe.chat); return c ? c.text + (!Z.mappe.kopiert ? "" : S.textGesendet &&
        S.textGesendet() ? " · Text gesendet" : " · Text kopiert") : ""; }
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

  // AP13.12: Ausklappteile. Geöffnet bleibt, was die Lehrkraft einmal geöffnet hat (je Teil ein Schlüssel
  // „kursmuehle-offen-<name>“ in localStorage, unter /beta/ mit dem Zusatz von km.speicher); öffnet die Seite einen
  // Teil selbst (Testcode, gewählte Kachel), merkt sie nichts
  function ausklapp(d, name) {
    if (!d || d.dataset.merkt) return d;
    d.dataset.merkt = name;
    var k = km.speicher("kursmuehle-offen-" + name);
    try { if (localStorage.getItem(k) === "ja") d.open = true; } catch (e) { /* ohne Speicher */ }
    d.querySelector("summary").addEventListener("click", function () {
      try { localStorage.setItem(k, d.open ? "nein" : "ja"); }   // schaltet erst nach dem Klick
      catch (e) { /* ohne Speicher gilt es nur bis zum Neuladen */ }
    });
    return d;
  }
  Array.prototype.forEach.call(document.querySelectorAll("details[data-merken]"), function (d) {
    ausklapp(d, d.dataset.merken); });

  // Hinweis unter der Überschrift des aktiven Schritts, höchstens zwei Sätze, nie blockierend
  function zeichneHinweis(sec, n, aktiv) {
    var schluessel = n === 2 && zweig() === "richtung" && S.hinweisTexte["2-richtung"] ? "2-richtung" : String(n);
    var box = sec.querySelector(".s-hinweis"), text = S.hinweisTexte[schluessel];
    // AP13.5h a3: mit Verbindung nennt der Hinweis zu Schritt 6 auch den Weg über die eigene KI
    if (n === 6 && text && S.anKiAktiv && S.anKiAktiv()) text = text.replace(", in einem neuen Chat",
        ", mit deiner KI, in einem neuen Chat");
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
    var s = schritt(), z = zweig(), d = !!S.designer;
    // Bildwünsche inzwischen weg oder Bilder „keine“: weiter mit den Fragen
    if (s === 5.5 && Z.pruefung && sichtbareSchritte().indexOf(5.5) < 0) s = 6;
    document.body.dataset.schritt = d ? "3" : String(s);
    document.body.dataset.zweig = z;
    document.body.dataset.bildschirm = Z.mappe ? "ansicht" : "start";
    var sichtbar = sichtbareSchritte();
    SCHRITTE.forEach(function (n) {
      var sec = sektion(n);
      var stand = sichtbar.indexOf(n) < 0 ? "zu" : n < s ? "erledigt" : n === s ? "aktiv" : "zu";
      // AP13.19 §3: im Designer ist Schritt 3 offen (mit Vorschau), alle übrigen sind zugeklappt
      if (d && n === 3) stand = "aktiv";
      else if (d && stand === "aktiv") stand = "erledigt";
      // Schritt 4 bleibt offen, solange ein gestückelter Text noch nicht ganz kopiert ist
      var teileKopieren = n === 4 && s === 5 && texte.teile.length > 1 && Object.keys(texte.kopiert)
          .length < texte.teile.length;
      var offen = stand === "aktiv" || (!d && stand === "erledigt" && (!!S.auf[n] || teileKopieren));
      sec.hidden = stand === "zu";
      sec.dataset.stand = stand;
      sec.classList.toggle("auf", offen);
      var b = sec.querySelector(".s-zeile");
      b.setAttribute("aria-expanded", String(offen));
      b.disabled = stand !== "erledigt" || d;
      sec.querySelector(".s-fazit").textContent = stand === "erledigt" && Z.mappe ? fazit(n) : "";
      sec.querySelector(".s-nr").textContent = String(sichtbar.indexOf(n) + 1);
      zeichneHinweis(sec, n, stand === "aktiv" && !d);
    });
    $("hinweise-an").checked = S.hinweise.an;
    ["mach", "richtung", "steuer"].forEach(function (w) { $("zweig-" + w).setAttribute("aria-pressed", String(z === w));
        });
    $("steuer-teil").hidden = z !== "steuer";
    $("mach-teil").hidden = z !== "mach" && z !== "richtung";
    $("richtung-teil").hidden = z !== "richtung";
    if (z === "richtung" || z === "steuer") zeichneRichtung();
    if (S.katalog) { vorlagenZeigen(); zeichneMachArt(); }
    materialOrt();
    $("vorlagen").hidden = inhalt();
    $("weiter-2").hidden = s > 2 || !z;
    zeichneGruppen(s);
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
    $("weiter-5").textContent = sichtbareSchritte().indexOf(5.5) >= 0 ? "Weiter zu den Bildern" : S.fragenListe.length ?
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
    if (n > schritt() && n > 2 && materialFehlt()) { materialZeigen(true); return; }
    if (n > schritt()) erledigtBis(n);
    Z.mappe.schritt = n;
    S.auf = {}; designerBeenden();
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
    var vor = q.has("thema") || q.has("jahrgang") || q.has("minuten"), jg = (q.get("jahrgang") || "").trim();
    if (weiter || vor) history.replaceState(history.state, "", location.pathname + (q === h ? "" : location.hash));
    if (weiter) {
      km.autosaveLesen().then(function (r) { if (r) oeffne(async function () { await km.mappeAusBytes(r.zip, null); });
          }).catch(function () {});
      return;
    }
    if (!vor) return;
    var min = parseInt(q.get("minuten"), 10);
    $("f-thema").value = thema;
    if (zielgruppeAus(jg)) {                             // Text ohne Zahl: die Zielgruppe (c2)
      $("f-zielgruppe").value = jg.slice(0, 40); $("erweitert").open = true; zielgruppeSperre("f");
    } else $("f-jahrgang").value = jg.slice(0, 12);
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

  // AP13.8 §7: Pflicht- und Bereichsfelder prüft die Mühle selbst (Formular `novalidate`, keine Blase des Browsers):
  // eine Zeile auf Deutsch unter dem Feld mit der Mühle aus logo.svg in der Fehlerfarbe, `aria-invalid` am Feld, Fokus
  // bleibt im Feld; die Zeile geht beim ersten Zeichen. Ein Satz je Fall.
  var MUEHLE_ROT = '<svg viewBox="20 -10 216 256" width="16" height="16" focusable="false"><g fill="currentColor">' +
      '<path d="M100,236 L156,236 L147,150 L109,150 Z"/>' + [45, 135, 225, 315].map(function (w) {
        return '<path transform="rotate(' + w + ' 128 98)" d="M121,58 L135,58 L143,2 Q128,-10 113,2 Z"/>'; }).join("") +
      '<circle cx="128" cy="98" r="44"/></g><circle cx="128" cy="98" r="12" style="fill: var(--flaeche)"/></svg>';
  function feldSatz(feld) {
    var w = feld.value.trim(), art = feld.id.slice(2);
    if (art === "thema" && !w) return "Gib ein Thema ein.";
    // AP13.20: Pflicht nur beim Anlegen oder Anhängen einer Einheit; mit Zielgruppe ist das Feld gesperrt und frei
    if (art === "schulart" && !w && !feld.disabled && neueEinheit()) return "Wähl die Schulart.";
    if (art === "minuten" && w && !(/^\d+$/.test(w) && +w >= 10 && +w <= 300))
      return "Die Minuten liegen zwischen 10 und 300.";
    if (art === "jahrgang" && w && !jahrgangZahl(w)) return "Die Jahrgangsstufe ist eine Zahl von 1 bis 13.";
    if (art === "zielgruppe" && /\d/.test(w)) return "Ohne Zahl; die Jahrgangsstufe gehört ins Feld oben.";
    return "";
  }
  function neueEinheit() {
    return !Z.mappe || !!(Z.mappe.anhaengen && !Z.mappe.bausteine.some(function (k) { return k.einheit === Z.mappe.anhaengen; }));
  }
  function feldMeldung(feld, satz) {
    if (!document.getElementById("stil-meldung")) {
      document.head.appendChild(el("style", { id: "stil-meldung", text: [
        ".feld-meldung { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin: 0;",
        "  font-size: 0.9rem; color: var(--fehler); }",
        ".feld-meldung svg { flex: none; display: block; }"
      ].join("\n") }));
    }
    var id = feld.id + "-meldung", p = $(id);
    if (!p) {
      p = el("p", { id: id, cls: "feld-meldung", "aria-live": "polite" });
      var knopf = feld.form && feld.form.querySelector("[type=submit]");
      if (knopf) knopf.before(p); else feld.closest("label").after(p);
    }
    p.innerHTML = MUEHLE_ROT;
    p.firstChild.setAttribute("aria-hidden", "true");
    p.append(satz);
    p.hidden = false;
    feld.setAttribute("aria-invalid", "true");
    feld.setAttribute("aria-describedby", id);
  }
  function feldOk(feld) {
    var p = $(feld.id + "-meldung");
    if (p) p.hidden = true;
    feld.removeAttribute("aria-invalid");
    feld.removeAttribute("aria-describedby");
  }
  // -> true, wenn alle Felder stimmen; sonst Meldung am ersten falschen und Fokus dorthin
  function felderPruefen(ids) {
    var erstes = null;
    ids.forEach(function (id) {
      var f = $(id), satz = feldSatz(f);
      if (satz) { feldMeldung(f, satz); erstes = erstes || f; } else feldOk(f);
    });
    if (erstes) erstes.focus({ preventScroll: false });
    return !erstes;
  }
  ["f-thema", "f-jahrgang", "f-minuten", "a-thema", "a-jahrgang", "a-minuten"].forEach(function (id) {
    $(id).addEventListener("input", function () { feldOk($(id)); });
  });
  $("f-schulart").addEventListener("change", function () { feldOk($("f-schulart")); });
  // c2: Zielgruppe statt Jahrgangsstufe. Ein Text ohne Zahl im Feld Jahrgangsstufe der Einheit ist die Zielgruppe; ist
  // sie gefüllt, ist das Jahrgangsfeld leer und gesperrt (letzter Wert in `einheit.jahrgang_zuletzt`), lehrplan.js
  // schaltet den Lehrplanbezug aus
  function zielgruppeAus(w) { w = String(w || "").trim(); return w && !/\d/.test(w) ? w : ""; }
  function zielgruppeSperre(o, nurAnzeige) {
    var zg = $(o + "-zielgruppe").value.trim(), j = $(o + "-jahrgang"), e = (Z.mappe && Z.mappe.einheit) || {};
    if (nurAnzeige) {                                   // felderFuellen hat die Werte schon gesetzt
      if (zg && zielgruppeAus(e.jahrgang)) j.dataset.zuletzt = e.jahrgang_zuletzt || "";
      else if (!zg && j.value.trim()) j.dataset.zuletzt = j.value.trim();
      if (o === "f" && zg) $("erweitert").open = true;
    } else if (zg && !j.disabled) {
      if (j.value.trim()) j.dataset.zuletzt = j.value.trim();
      j.value = ""; feldOk(j);
    } else if (!zg && j.disabled) j.value = j.dataset.zuletzt || e.jahrgang_zuletzt || "";
    if (zg && !j.disabled) { j.dataset.platz = j.placeholder; j.placeholder = ""; }
    else if (!zg && j.disabled) j.placeholder = j.dataset.platz || "";
    j.disabled = !!zg;
    $(o + "-jahrgang-zeile").hidden = !zg;
    // AP13.20: mit Zielgruppe ist auch die Schulart frei (gesperrt, letzter Wert in dataset.zuletzt)
    var sa = $(o + "-schulart");
    if (nurAnzeige) { if (!zg && sa.value) sa.dataset.zuletzt = sa.value; }
    else if (zg && !sa.disabled) { if (sa.value) sa.dataset.zuletzt = sa.value; sa.value = ""; feldOk(sa); }
    else if (!zg && sa.disabled) sa.value = sa.dataset.zuletzt || schulartGemerkt();
    if (sa.selectedIndex < 0) sa.selectedIndex = 0;
    sa.disabled = !!zg;
    $(o + "-schulart-zeile").hidden = !zg;
  }
  ["f", "a"].forEach(function (o) {
    $(o + "-zielgruppe").addEventListener("input", function () {
      var f = $(o + "-zielgruppe"), satz = feldSatz(f);
      if (satz) feldMeldung(f, satz); else feldOk(f);
      zielgruppeSperre(o);
    });
  });
  S.zielgruppeSperre = zielgruppeSperre;
  document.head.appendChild(el("style", { id: "stil-zielgruppe", text: [
    ".start-form { align-items: start; }",           /* die Zeile unter der Jahrgangsstufe schiebt nichts */
    ".erweitert { grid-column: 1 / -1; }",
    ".erweitert summary { cursor: pointer; color: var(--link); font-weight: 600; padding: 2px 0; width: max-content; }",
    ".erweitert .feld { max-width: 24rem; padding-top: 8px; }",
    ".feld input:disabled { opacity: 0.55; cursor: not-allowed; }"
  ].join("\n") }));

  $("start-form").onsubmit = function (ev) { ev.preventDefault(); startAbsenden(); };
  function startAbsenden() {
    var thema = $("f-thema").value.trim();
    if (!felderPruefen(["f-thema", "f-schulart", "f-jahrgang", "f-minuten", "f-zielgruppe"])) return;
    var zg = $("f-zielgruppe").value.trim(), schulart = zg ? "" : $("f-schulart").value;
    if (schulart) schulartMerken(schulart);
    var e = { thema: thema, jahrgang: zg || $("f-jahrgang").value.trim(), minuten: parseInt($("f-minuten").value, 10) || 45 };
    if (zg) e.jahrgang_zuletzt = $("f-jahrgang").dataset.zuletzt || ((Z.mappe && Z.mappe.einheit) || {}).jahrgang_zuletzt || "";
    if (!S.katalog) return;
    if (!Z.mappe) { einheitAnlegen(e, S.katalog.vorlagen[0], schulart); return; }
    if (neueEinheit()) {
      S.angaben.schulart = schulart; angabenSchreiben({ schulart: schulart });
      einheitAnhaengen(e); return;
    }
    // Schritt 1 nachträglich geändert: Angaben übernehmen; ohne Inhalt die Bausteine der Vorlage neu rechnen
    Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}, e);
    if (!Z.mappe.anhaengen) Z.mappe.titel = thema;
    var v = vorlageNach(Z.mappe.einheit.vorlage);
    if (v && !inhalt() && Z.mappe.bausteine.every(function (k) { return k.geplant; })) karteVorlage(v);
    S.angaben.thema = thema; S.angaben.jahrgang = e.jahrgang; S.angaben.minuten = e.minuten;
    // AP13.20 §3: eine ältere Mappe ohne Schulart bleibt ohne, solange die Lehrkraft keine wählt
    var sa = zg || schulart ? { schulart: schulart } : {};
    Object.assign(S.angaben, sa);
    Z.mappe.schritt = Math.max(schritt(), 2);
    S.auf = {};
    zeichne();
    angabenSchreiben(Object.assign(Z.mappe.anhaengen ? { jahrgang: e.jahrgang } : { thema: thema, jahrgang: e.jahrgang,
        minuten: e.minuten }, sa));
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
    if (S.angaben.differenzierung) zusatzKarte();     // AP13.14: neue Karten, Schalter an: Karte „Zusatz“ wieder dazu
  }
  async function zusatzKarte() {
    try {
      await km.bereit();
      var gesendet = Z.mappe, neu = await km.mappeFn("zusatzaufgabe", [gesendet, true]);
      if (Z.mappe !== gesendet) return;
      km.mappeUebernehmen(gesendet, neu);
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); }
  }

  // AP13.15: zuletzt gewählte Lizenz und Name für die Namensnennung (JSON {lizenz, name}); eine neue Einheit übernimmt
  // beides, den KI-Hinweis nicht (er ist eine Aussage über diese Einheit)
  var KURSANGABEN = km.speicher("kursmuehle-kursangaben");
  function kursangabenGemerkt() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(KURSANGABEN) || "null"); } catch (e) { /* ohne Speicher */ }
    var lizenz = v && typeof v.lizenz === "string" ? v.lizenz : "";
    if (!S.katalog || !S.katalog.oberflaeche.lizenz.some(function (w) { return w.wert === lizenz; })) lizenz = "";
    return { lizenz: lizenz, name: v && typeof v.name === "string" ? v.name : "" };
  }
  function kursangabenMerken(lizenz, name) {
    try { localStorage.setItem(KURSANGABEN, JSON.stringify({ lizenz: lizenz || "", name: name || "" })); }
    catch (e) { /* ohne Speicher gilt die Wahl nur für diese Einheit */ }
  }

  // AP13.20: zuletzt gewählte Schulart (Text aus katalog.yaml); eine neue Einheit und das Feld in Schritt 1 übernehmen sie
  var SCHULART = km.speicher("kursmuehle-schulart");
  function schulartGemerkt() {
    var v = "";
    try { v = localStorage.getItem(SCHULART) || ""; } catch (e) { /* ohne Speicher */ }
    return S.katalog && S.katalog.oberflaeche.schulart.some(function (w) { return w.wert && w.wert === v; }) ? v : "";
  }
  function schulartMerken(wert) {
    try { localStorage.setItem(SCHULART, wert); } catch (e) { /* ohne Speicher gilt die Wahl nur für diese Seite */ }
  }

  async function steckbriefAnlegen() {
    var o = S.katalog.oberflaeche, e = (Z.mappe && Z.mappe.einheit) || {}, g = kursangabenGemerkt();
    Z.steckbrief_text = await km.mappeFn("angaben_schreiben", ["", {
      thema: e.thema || "", jahrgang: e.jahrgang || "", minuten: e.minuten || "", fach: "",
      schulart: S.angaben.schulart || "", bilder: bilderStandard(),
      format: o.format[0].wert, familie: S.familien.standard, farbe: o.farbe[0].wert, website: o.website[0].wert,
      abschluss: o.abschluss[0].wert, portionierung: o.portionierung[0].wert, lizenz: g.lizenz,
      lizenz_name: g.lizenz ? g.name : "" }]);
  }

  function einheitAnlegen(e, v, schulart) {
    e.vorlage = v.name;
    Z.mappe = km.neueMappe(e.thema, e, vorlageKarten(v, e.minuten));
    Z.mappe.schritt = 2;
    Z.mappe.zeit_selbst = false;                   // Standard: das Modell verteilt die Minuten
    Z.mappe.zeit_start = new Date().toISOString();  // AP13.12 a11: Minuten bis zum Download für die Rückmeldung
    Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null; Z.bau = null;
        Z.beispiel = null;
    S.angaben = { thema: e.thema, jahrgang: e.jahrgang, minuten: e.minuten, schulart: schulart || "", familie: "sachlich", dichte: "normal",
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
    Z.mappe.zeit_start = new Date().toISOString(); delete Z.mappe.zeit_download;
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
        S.korrekturen = []; S.spracheGelb = []; S.letzteAntwort = null;
    S.korrektur = { text: "", offen: false, stand: "", art: "" };
    $("korrektur-eingabe").value = ""; $("eingabe-stand").hidden = true;
    S.chatWahlOffen = false; S.auf = {}; S.designer = null;
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
      Z.gespeichert = null;
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
      // AP13.15: Mappe aus einer neueren Mühle oder aus der Testversion: ein Satz statt „Bereit“, nichts gesperrt
      var satz = Z.gespeichert ? await km.mappeFn("herkunft_hinweis", [Z.gespeichert, km.kanal]) : "";
      if (satz) status(satz, "lauf"); else status("Bereit", "ok");
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
    designerBeenden();
    if (vorher !== b.dataset.zweig && S.lehrplanVorbelegen) S.lehrplanVorbelegen();   // AP13.24: Felder des neuen Wegs
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
    if (a.differenzierung) t.push("Hilfen und Zusatzaufgaben");
    return t;
  }
  function textKacheln(box, feld, werte, gewaehlt, mehrfach) {
    var da = Array.prototype.map.call(box.querySelectorAll(".aus-kachel"), function (b) { return b.dataset.wert; });
    if (da.join("|") !== werte.map(function (w) { return w.wert; }).join("|")) {
      box.innerHTML = "";
      werte.forEach(function (w) {
        var b = el("button", { type: "button", cls: "aus-kachel", role: mehrfach ? "checkbox" : "radio",
          "aria-checked": "false", "data-feld": feld, "data-wert": w.wert, "data-mehrfach": mehrfach ? "1" : null });
        b.appendChild(el("span", { cls: "aus-name", text: w.text }));
        if (w.zeile) b.appendChild(el("span", { cls: "aus-zeile", text: w.zeile }));
        box.appendChild(b);
      });
    }
    Array.prototype.forEach.call(box.querySelectorAll(".aus-kachel"), function (b, i) {
      b.setAttribute("aria-checked", String(mehrfach ? gewaehlt.indexOf(b.dataset.wert) >= 0 : b.dataset.wert === gewaehlt));
      var z = werte[i].zeile, ze = b.querySelector(".aus-zeile");        // AP13.24: die Zeile hängt am Fach
      if (z && !ze) b.appendChild(el("span", { cls: "aus-zeile", text: z }));
      else if (z && ze.textContent !== z) ze.textContent = z;
      else if (!z && ze) b.removeChild(ze);
    });
  }
  function zeichneRichtung() {
    if (!S.katalog || !Z.mappe) return;
    var o = S.katalog.oberflaeche, a = S.angaben, e = Z.mappe.einheit || {};
    var art = artKacheln();
    var typen = S.katalog.automatisch.filter(function (t) { return t !== "Textfeld" && t !== "Seite"; })
        .map(function (t) { return { wert: t, text: t }; });
    textKacheln($("r-art"), "art", art, e.vorlage || S.katalog.vorlagen[0].name, false);
    // AP13.24: Material und Gestalten tragen das Wort des Fachs in der Zeile unter der Kachel
    var fw = fachWoerter(), sp = o.schwerpunkt.map(function (w) { return w.wort ? { wert: w.wert, text: w.text,
        zeile: fw[w.wort] } : w; });
    ["r-schwerpunkt", "a-schwerpunkt"].forEach(function (id) { textKacheln($(id), "schwerpunkt", sp,
        a.schwerpunkt || [], true); });
    textKacheln($("r-uebungen"), "uebungstypen", typen, a.uebungstypen || [], true);
    ["r-sprache", "a-sprache"].forEach(function (id) { textKacheln($(id), "sprache", o.sprache, a.sprache || "normal", false);
        });
    ["r-differenzierung", "a-differenzierung"].forEach(function (id) { textKacheln($(id), "differenzierung",
        o.differenzierung, a.differenzierung ? "an" : "aus", false); });
    Array.prototype.forEach.call($("r-art").querySelectorAll(".aus-kachel"), function (b) { b.disabled = inhalt(); });
    if (document.activeElement !== $("r-material")) $("r-material").value = Z.mappe.material || "";
    vorschlagZeilen();
  }

  // ---------------------------------------------------------------- AP13.24: Fach, Wörter, Vorlagen je Fach, Vorschlag
  // Zwilling der Tabelle in gen/zielart.py (fachgruppe, fachwoerter); test_ansicht.py vergleicht beide an denselben Fächern.
  // Die Regeln für den Vorschlag selbst leben nur in Python.
  function fachPasst(fach, namen) {
    var f = String(fach || "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
    return namen.some(function (n) { var k = n.toLowerCase();
      return f.indexOf(k) === 0 || f.length >= 3 && n.indexOf("/") < 0 && k.indexOf(f) === 0; });
  }
  function fachJetzt() {
    var lp = S.angaben.lehrplan;
    return lp && lp.fach ? lp.fach : S.angaben.fach || "";
  }
  function lehrplanTitel() {
    var out = [], lp = S.angaben.lehrplan;
    ((lp && lp.lernbereiche) || []).forEach(function (lb) { out.push(lb.titel); (lb.teilbereiche || []).forEach(function (tb) {
      out.push(tb.titel); }); });
    return out.map(function (x) { return String(x || "").toLowerCase(); });
  }
  function fachgruppe(fach, titel) {
    var gruppen = S.katalog.zielarten.faecher;
    for (var i = 0; i < gruppen.length; i++) {
      var g = gruppen[i];
      if (!g.namen) return g;
      if (fachPasst(fach, g.namen) && (!g.lb || titel.some(function (x) { return new RegExp(g.lb).test(x); }))) return g;
    }
    return gruppen[gruppen.length - 1];
  }
  function fachWoerter() {
    var z = S.katalog.zielarten;
    return z.woerter[fachgruppe(fachJetzt(), lehrplanTitel()).wort];
  }
  // Kachel nur, wenn Fach oder Schulart passen (`wann`), die Vorlage schon gewählt ist oder es kein `wann` gibt
  function vorlageSichtbar(v) {
    var w = v.wann;
    if (!w || ((Z.mappe && Z.mappe.einheit) || {}).vorlage === v.name) return true;
    return !!(w.faecher && fachPasst(fachJetzt(), w.faecher)) || (w.schularten || []).indexOf(S.angaben.schulart || "") >= 0;
  }
  function artKacheln() {
    return S.katalog.vorlagen.filter(vorlageSichtbar).map(function (v) { return { wert: v.name, text: v.name, zeile: v.zeile }; });
  }
  function vorschlagZeilen() {
    var v = S.angaben.vorschlag || [], a = S.angaben;
    [["r-schwerpunkt-vz", "schwerpunkt"], ["a-schwerpunkt-vz", "schwerpunkt"], ["r-uebungen-vz", "uebungstypen"],
      ["r-art-vz", "vorlage"]].forEach(function (x) {
      $(x[0]).hidden = v.indexOf(x[1]) < 0 || (x[1] !== "vorlage" && !(a[x[1]] || []).length);
    });
  }
  // „Mach du“: die vorgeschlagene Art der Einheit mit „ändern“ (öffnet die Kacheln)
  function zeichneMachArt() {
    var e = (Z.mappe && Z.mappe.einheit) || {}, an = !!Z.mappe && zweig() === "mach" && (S.angaben.vorschlag || [])
        .indexOf("vorlage") >= 0 && !inhalt() && !!e.vorlage;
    $("m-vorlage").hidden = !an;
    if (!an) { $("m-art").hidden = true; $("m-vorlage-aendern").setAttribute("aria-expanded", "false"); return; }
    $("m-vorlage-text").textContent = "Art der Einheit: " + e.vorlage + " (Vorschlag aus dem Lehrplan)";
    textKacheln($("m-art"), "art", artKacheln(), e.vorlage, false);
  }
  $("m-vorlage-aendern").addEventListener("click", function () {
    var auf = $("m-art").hidden;
    $("m-art").hidden = !auf;
    $("m-vorlage-aendern").setAttribute("aria-expanded", String(auf));
  });
  function vorschlagWeg(feld) {
    var alt = S.angaben.vorschlag || [], neu = alt.filter(function (f) { return f !== feld; });
    if (neu.length === alt.length) return null;
    S.angaben.vorschlag = neu;
    return { vorschlag: neu };
  }
  // Vorschlag aus dem Lehrplan (gen/zielart.py) in die Felder schreiben, die die Lehrkraft nicht selbst gesetzt hat:
  // Schwerpunkt und Übungen in „Ich gebe die Richtung“, in „Ich steuere“ nur der Schwerpunkt (dort stehen die Übungen an den
  // Karten), in „Mach du“ bleiben die Felder der Richtung unberührt (AP13.5b §3); die Art der
  // Einheit in „Mach du“ und „Ich gebe die Richtung“, nur solange keine Karte Inhalt hat
  function vorschlagAnwenden(r) {
    if (!Z.mappe || !r || !S.katalog) return;
    var a = S.angaben, v = (a.vorschlag || []).slice(), neu = {}, z = zweig(), geaendert_ = false;
    var frei = function (f) { return v.indexOf(f) >= 0 || !(a[f] || []).length; };
    (z === "richtung" ? ["schwerpunkt", "uebungstypen"] : z === "steuer" ? ["schwerpunkt"] : []).forEach(function (f) {
      if (!frei(f)) return;
      var reihe = f === "schwerpunkt" ? S.katalog.oberflaeche.schwerpunkt.map(function (w) { return w.wert; }) :
          S.katalog.automatisch;                              // Reihenfolge wie die Kacheln, wie nach einem Klick
      neu[f] = reihe.filter(function (w) { return r[f].indexOf(w) >= 0; });
      if (v.indexOf(f) < 0) v.push(f);
    });
    var e = Z.mappe.einheit || (Z.mappe.einheit = {}), std = S.katalog.vorlagen[0].name;
    if (z !== "steuer" && !inhalt() && (v.indexOf("vorlage") >= 0 || e.vorlage === std && !e.vorlage_selbst)) {
      var vl = vorlageNach(r.vorlage || std);
      if (vl && vl.name !== e.vorlage) { karteVorlage(vl); geaendert_ = true; }
      if (r.vorlage) { if (v.indexOf("vorlage") < 0) v.push("vorlage"); }
      else v = v.filter(function (f) { return f !== "vorlage"; });
    }
    neu.vorschlag = v;
    Object.assign(a, neu);
    zeichne();
    if (geaendert_) geaendert();
    angabenSchreiben(neu);
    S.textSpaeter();
  }
  // Lehrplan gelöst: was er vorbelegt hat, geht mit ihm
  function vorschlagLoesen() {
    var a = S.angaben, v = a.vorschlag || [];
    if (!Z.mappe || !v.length) return;
    var neu = { vorschlag: [] };
    ["schwerpunkt", "uebungstypen"].forEach(function (f) { if (v.indexOf(f) >= 0) neu[f] = []; });
    var geaendert_ = false;
    if (v.indexOf("vorlage") >= 0 && !inhalt()) {
      var vl = S.katalog.vorlagen[0];
      if (((Z.mappe.einheit || {}).vorlage) !== vl.name) { karteVorlage(vl); geaendert_ = true; }
    }
    Object.assign(a, neu);
    zeichne();
    if (geaendert_) geaendert();
    angabenSchreiben(neu);
    S.textSpaeter();
  }
  // AP13.19 §1: „Einheit aus eigenem Material“ braucht Material (mindestens ein Zeichen außer Leerraum; übernommene
  // Dateiabschnitte stehen schon als Text im Feld). Das Feld steht dann in jedem Weg sichtbar: in „Ich gebe die
  // Richtung“ unter „Art der Einheit“, in „Mach du“ unter „Worum geht es genau?“, in „Ich steuere“ unter den Vorlagen;
  // sonst an seinem alten Ort. Die Pflicht lebt nur hier, nicht in prompt.py, und nur bis die erste Antwort da ist
  // (danach braucht der Text für den Chat kein Material mehr).
  function materialPflicht() { return !!Z.mappe && (Z.mappe.einheit || {}).vorlage === EIGENES && !inhalt(); }
  function materialFehlt() { return materialPflicht() && !/\S/.test(Z.mappe.material || ""); }
  function materialFeld() { return zweig() === "steuer" ? $("a-material") : $("r-material"); }
  function materialOrt() {
    var p = materialPflicht(), z = zweig(), r = $("r-material-feld"), a = $("a-material-feld");
    // nur verschieben, wenn es nicht schon dort steht: ein Verschieben nimmt dem Feld den Fokus
    var nach = function (feld, anker) { if (feld.previousElementSibling !== anker) anker.after(feld); };
    var zuletzt = function (feld, ort) { if (feld.parentNode !== ort || feld.nextElementSibling) ort.appendChild(feld); };
    if (p && z === "mach") nach(r, $("m-kontext").closest("label"));
    else if (p && z === "richtung") nach(r, $("r-art").closest(".aus-gruppe"));
    else zuletzt(r, $("richtung-teil"));
    if (p) nach(a, $("vorlagen")); else zuletzt(a, document.querySelector(".mehr-felder"));
    $("r-material-zeile").textContent = p ? "für diese Art nötig" : "freiwillig";
    $("a-material-zeile").hidden = !p;
    if (!p) { feldOk($("r-material")); feldOk($("a-material")); }
    if (Z.mappe && document.activeElement !== $("r-material")) $("r-material").value = Z.mappe.material || "";
  }
  // Feld in den Blick, Fokus hinein; mit meldung: Schritt 2 offen und der rote Satz unter dem Feld
  function materialZeigen(meldung) {
    if (meldung && schritt() > 2 && !S.auf[2]) { S.auf[2] = true; zeichneSchritte(); }
    var f = materialFeld();
    if (meldung) feldMeldung(f, "Füg dein Material ein oder lies eine Datei ein.");
    f.scrollIntoView({ block: "center" });
    f.focus({ preventScroll: true });
  }
  function richtungKlick(ev) {
    var b = ev.target.closest(".aus-kachel"); if (!b || !Z.mappe || b.disabled) return;
    var feld = b.dataset.feld, wert = b.dataset.wert, a = {};
    if (feld === "art") {
      var v = vorlageNach(wert);
      if (v && !inhalt()) {
        karteVorlage(v);
        Z.mappe.einheit.vorlage_selbst = true;               // AP13.24: die Wahl der Lehrkraft, kein Vorschlag mehr
        var vw = vorschlagWeg("vorlage");
        zeichne(); geaendert(); if (vw) angabenSchreiben(vw);
        if (wert === EIGENES) materialZeigen(false);
      }
      return;
    }
    if (b.dataset.mehrfach) {
      var liste = (S.angaben[feld] || []).slice(), i = liste.indexOf(wert);
      if (i >= 0) liste.splice(i, 1); else liste.push(wert);
      // AP13.24: höchstens zwei Schwerpunkte, ein dritter Klick löst den zuerst gewählten
      if (feld === "schwerpunkt") {
        var folge = S.schwerpunktFolge && S.schwerpunktFolge.mappe === Z.mappe ? S.schwerpunktFolge.liste : [];
        folge = folge.filter(function (w) { return w !== wert; });
        if (i < 0) folge.push(wert);
        S.schwerpunktFolge = { mappe: Z.mappe, liste: folge };
        var hoechstens = S.katalog.zielarten.hoechstens;
        while (liste.length > hoechstens) {
          var aelter = liste.filter(function (w) { return w !== wert; }).sort(function (x, y) {
            return folge.indexOf(x) - folge.indexOf(y); })[0];
          liste.splice(liste.indexOf(aelter), 1);
        }
      }
      // Reihenfolge wie die Kacheln (der erste bevorzugte Typ geht an die erste Übungskarte)
      var reihe = Array.prototype.map.call(b.parentNode.querySelectorAll(".aus-kachel"), function (k) { return k.dataset.wert; });
      wert = reihe.filter(function (w) { return liste.indexOf(w) >= 0; });
    }
    if (feld === "differenzierung") return differenzierung(wert === "an");
    S.angaben[feld] = wert; a[feld] = wert;
    var vf = vorschlagWeg(feld);                              // AP13.24: ein Klick macht aus dem Vorschlag die Wahl der Lehrkraft
    if (vf) Object.assign(a, vf);
    zeichneRichtung(); zeichneSchritte();
    angabenSchreiben(a);
    S.textSpaeter();
  }
  // AP13.14: Schalter „Hilfen und Zusatzaufgaben“ – Steckbrief und die Karte „Zusatz“ (gen/mappe.py zusatzaufgabe; aus:
  // eine leere Karte fällt weg, eine mit Inhalt bleibt)
  async function differenzierung(an) {
    if (!!S.angaben.differenzierung === an) return;
    S.angaben.differenzierung = an;
    zeichneRichtung(); zeichneSchritte();
    try {
      await km.bereit();
      var gesendet = Z.mappe, neu = await km.mappeFn("zusatzaufgabe", [gesendet, an]);
      if (Z.mappe === gesendet) km.mappeUebernehmen(gesendet, neu);
      await angabenSchreiben({ differenzierung: an });
      zeichne();
    } catch (e) { zeigeFehler(e); }
    S.textSpaeter();
  }
  ["richtung-teil", "a-schwerpunkt", "a-sprache", "a-differenzierung", "m-art"].forEach(function (id) {
    $(id).addEventListener("click", richtungKlick); });
  $("r-material").addEventListener("input", function () {
    feldOk($("r-material"));
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
    var box = $("vorlagen"), namen = S.katalog.vorlagen.filter(vorlageSichtbar).map(function (v) { return v.name; }).join("|");
    if (box.dataset.namen === namen) return;                  // AP13.24: nur neu zeichnen, wenn sich die Kacheln ändern
    box.dataset.namen = namen; box.innerHTML = "";
    S.katalog.vorlagen.forEach(function (v, i) {
      if (!vorlageSichtbar(v)) return;
      var b = el("button", { type: "button", cls: "vorlage", "data-vorlage": i, "aria-pressed": "false" }, [
        el("span", { cls: "vorlage-name", text: v.name }), el("span", { cls: "vorlage-zeile", text: v.zeile }),
        el("span", { cls: "vorlage-phasen", text: v.phasen.map(function (p) { return p.phase; }).join(" · ") })]);
      b.onclick = function () {
        if (!Z.mappe || inhalt()) return;
        karteVorlage(v);
        Z.mappe.einheit.vorlage_selbst = true;               // AP13.24: Wahl der Lehrkraft
        var vw = vorschlagWeg("vorlage");
        zeichne(); geaendert(); if (vw) angabenSchreiben(vw);
        if (v.name === EIGENES) materialZeigen(false);
      };
      box.appendChild(b);
    });
  }

  // AP13.24 §9: Infoknopf ⓘ am Materialfeld; der Text steht in katalog.yaml (oberflaeche.material_info) und kommt erst beim
  // Öffnen in die Seite. Das Feld sitzt in einem Label: ein Klick auf ⓘ soll weder das Feld fokussieren noch absenden.
  function infoUmschalten(k) {
    var t = k.closest("label").querySelector(".info-text"), auf = t.hidden;
    if (auf && S.katalog) t.textContent = S.katalog.oberflaeche[k.dataset.info] || "";
    t.hidden = !auf;
    k.setAttribute("aria-expanded", String(auf));
  }
  document.addEventListener("click", function (ev) {
    var k = ev.target.closest && ev.target.closest(".info-knopf"); if (!k) return;
    ev.preventDefault(); infoUmschalten(k);
  });
  document.addEventListener("keydown", function (ev) {
    var k = ev.target.classList && ev.target.classList.contains("info-knopf") ? ev.target : null;
    if (k && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); infoUmschalten(k); }
  });

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
  // AP13.12 a3: Kacheln mit Dreieck (`probe`) stehen nicht zwischen den geprüften, sondern im zugeklappten Teil
  // „Weitere, noch nicht auf der Plattform geprüft“ direkt nach dem Raster ihrer Gruppe; ist eine davon gewählt, ist er
  // offen. Welche das sind, sagt `probe` der Werte (familien.json, katalog.json), keine feste Liste.
  function weitereTeil(box, anlegen) {
    var d = box.nextElementSibling;
    if (d && d.classList.contains("ungeprueft")) return d;
    if (!anlegen) return null;
    var t = $(box.getAttribute("aria-labelledby"));
    d = el("details", { cls: "ungeprueft" }, [el("summary", { text: "Weitere, noch nicht auf der Plattform geprüft" }),
      el("div", { cls: box.className, role: "radiogroup", "aria-label": (t ? t.textContent + ": " : "") +
          "noch nicht geprüft" })]);
    box.after(d);
    return d;
  }
  function kachelnVon(box) {
    var d = weitereTeil(box, false), k = Array.prototype.slice.call(box.querySelectorAll(".aus-kachel"));
    return d ? k.concat(Array.prototype.slice.call(d.querySelectorAll(".aus-kachel"))) : k;
  }
  // Kacheln nur neu bauen, wenn sich Werte, Reihenfolge oder Teil geändert haben; -> Werte in der Reihenfolge der Kacheln
  function kachelnSetzen(box, werte, bauen, gewaehlt) {
    var reihe = werte.filter(function (w) { return !w.probe; }).concat(werte.filter(function (w) { return w.probe; }));
    var d = weitereTeil(box, reihe.some(function (w) { return w.probe; })), innen = d && d.querySelector(".kacheln-wahl");
    var alt = kachelnVon(box);
    if (alt.length !== reihe.length || reihe.some(function (w, i) { return alt[i].dataset.wert !== w.wert ||
        !w.probe !== !alt[i].closest(".ungeprueft"); })) {
      box.innerHTML = ""; if (innen) innen.innerHTML = "";
      reihe.forEach(function (w) { (w.probe ? innen : box).appendChild(bauen(w)); });
    }
    if (d) {
      d.hidden = !innen.children.length;
      if (reihe.some(function (w) { return w.probe && w.wert === gewaehlt; })) d.open = true;
    }
    return reihe;
  }
  // Kacheln der Familien (AP13.5d): Name und ein Satz, ohne Miniatur; die Vorschau steht rechts oder in der Leiste
  function zeichneFamilien() {
    var box = $("aus-familie"), gewaehlt = familieJetzt();
    kachelnSetzen(box, S.familien.familien.map(function (f) {
      return { wert: f.name, text: f.text, zeile: f.zeile, probe: f.probe.length ? "Importprobe steht aus" : "" };
    }), function (w) {
      var b = el("button", { type: "button", cls: "aus-kachel", role: "radio", "aria-checked": "false",
        "data-feld": "familie", "data-wert": w.wert });
      b.appendChild(el("span", { cls: "aus-name" }, [el("span", { text: w.text }), w.probe ? dreieck(w.probe) : null]));
      b.appendChild(el("span", { cls: "aus-zeile", text: w.zeile }));
      return b;
    }, gewaehlt);
    kachelnVon(box).forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.wert === gewaehlt)); });
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
      ruhig(innen);
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
  // AP13.5g b2: die Vorschau ist Anschauung; nichts darin bekommt den Fokus (dazu inert, aria-hidden im Markup und
  // pointer-events: none in ansicht.css)
  function ruhig(box) {
    box.setAttribute("inert", "");
    Array.prototype.forEach.call(box.querySelectorAll("a, button, input, select, textarea, summary, [tabindex]"),
        function (e) { e.setAttribute("tabindex", "-1"); });
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
  // Ränder: rund, eckig, Linie, wellig, sehr wellig; „familie“ zeichnet die Form der gewählten Familie (formen.kasten in familien.yaml)
  function miniKasten(wert) {
    var s = '<svg viewBox="0 0 120 40" aria-hidden="true" focusable="false"><rect width="120" height="40" fill="#fff"/>',
        text = '<rect x="26" y="15" width="56" height="3" rx="1" fill="#5B6475"/><rect x="26" y="22" width="40" ' +
        'height="3" rx="1" fill="#C3C8D2"/>';
    var box = function (r, fill, stroke, extra) {
      return '<rect x="14" y="7" width="92" height="26" rx="' + r + '" fill="' + fill + '"' +
          (stroke ? ' stroke="#5B6475"' : '') + (extra || "") + '/>';
    };
    if (wert === "linie") return s + '<rect x="14" y="7" width="4" height="26" fill="#5B6475"/>' + text + "</svg>";
    if (wert === "rund") return s + box(10, "#EEF1F6", true) + text + "</svg>";
    if (wert === "eckig") return s + '<rect x="15" y="8" width="90" height="24" fill="#fff" stroke="#5B6475" ' +
        'stroke-width="2"/>' + text + "</svg>";
    if (wert === "wellig") return s + '<path d="M15 8.6C40 7.2 76 9.6 105 7.9C106 16 104.6 25 105.4 32.1C76 33.2 ' +
        '40 31.4 14.8 32.4C14 25 15.6 16 15 8.6Z" fill="#fff" stroke="#5B6475" stroke-width="1.8" ' +
        'stroke-linejoin="round"/>' + text + "</svg>";
    if (wert === "sehr_wellig") return s + '<path d="M19 7C23.97 7 27.69 9.4 32.67 9.4S41.36 7 46.33 7S55.03 9.4 60 ' +
        '9.4S68.69 7 73.67 7S82.36 9.4 87.33 9.4S96.03 7 101 7C103.76 7 106 9.24 106 12C106 14.91 103.6 17.09 103.6 ' +
        '20S106 25.09 106 28C106 30.76 103.76 33 101 33C96.03 33 92.31 30.6 87.33 30.6S78.64 33 73.67 33S64.97 30.6 ' +
        '60 30.6S51.31 33 46.33 33S37.64 30.6 32.67 30.6S23.97 33 19 33C16.24 33 14 30.76 14 28C14 25.09 16.4 22.91 ' +
        '16.4 20S14 14.91 14 12C14 9.24 16.24 7 19 7Z" fill="#fff" stroke="#5B6475" stroke-width="1.8" ' +
        'stroke-linejoin="round"/>' + text + "</svg>";
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
  // Firefox den Klick, der Steckbrief bliebe ohne die Wahl. w.label setzt eine Beschriftung nur für Vorleseprogramme,
  // wenn die Kachel keinen Text hat; w.element ist eine fertige Kachel aus dem Markup (Farbe „Eigene“ mit Farbwähler)
  function kachelGruppe(box, gruppe, werte, mini, gewaehlt) {
    werte = kachelnSetzen(box, werte, function (w) { return w.element || kachel(gruppe, w.wert, w.text, "", false,
        w.zeile, w.probe); }, gewaehlt);
    kachelnVon(box).forEach(function (b, i) {
      b.setAttribute("aria-checked", String(werte[i].wert === gewaehlt));
      if (werte[i].label && !werte[i].text) b.setAttribute("aria-label", werte[i].label); else b.removeAttribute("aria-label");
      var t = b.querySelector(".aus-name-text");
      if (t && t.textContent !== werte[i].text) t.textContent = werte[i].text;
      var m = b.querySelector(".aus-mini"), svg = m && mini(werte[i].wert);
      if (m && m.dataset.svg !== svg) { m.innerHTML = svg; m.dataset.svg = svg; }  // eigenes SVG, keine Eingabe
    });
  }
  // AP13.19 §2: Gruppen nacheinander (wie AP13.5g b1, statt des Ausklappteils aus AP13.12 a1). Beim ersten Erreichen
  // Design und Bilder; jede Wahl blendet die Gruppe nach ihr ein. Wie weit, merkt sich die Mappe (`aussehen_bis`,
  // Stelle in FOLGE; fehlt = noch keine eigene Wahl). Weicht eine verborgene Gruppe vom Standard ab (geöffnete Einheit,
  // „Mehr einstellen“), sind alle Gruppen sichtbar; „Rest als Standard“ ändert darum nie eine Wahl.
  var FOLGE = ["familie", "farbe", "dichte", "kasten", "format", "website"];
  function standardWert(g) {
    var o = S.katalog.oberflaeche;
    return { familie: (S.familien && S.familien.standard) || "sachlich", farbe: o.farbe[0].wert, dichte: "normal",
      kasten: "familie", format: o.format[0].wert, website: o.website[0].wert }[g];
  }
  function abweichung(g) { var std = standardWert(g); return (S.angaben[g] || std) !== std; }
  function aussehenBis() {
    var bis = Z.mappe && typeof Z.mappe.aussehen_bis === "number" ? Z.mappe.aussehen_bis : 0;
    if (S.designer || !S.katalog || FOLGE.slice(bis + 1).some(abweichung)) return FOLGE.length - 1;
    var f = familieInfo(familieJetzt());
    return bis === 1 && f && f.akzent_fest ? 2 : bis;     // Farbe gesperrt: Dichte gleich mit, sonst ginge es nicht weiter
  }
  function aussehenGewaehlt(feld) {
    if (!Z.mappe) return;
    var i = feld === "bilder" || feld === "bildbeschriftung" ? 0 : FOLGE.indexOf(feld);
    if (i < 0) return;
    var bis = Math.max(aussehenBis(), i + 1), f = familieInfo(familieJetzt());
    if (bis === 1 && f && f.akzent_fest) bis = 2;          // bleibt, auch wenn danach ein anderes Design gilt
    Z.mappe.aussehen_bis = Math.min(FOLGE.length - 1, bis);
  }
  // AP13.28: Im Designer sind alle Gruppen zu sehen. Wer ihn verlässt („Fertig“, Wechsel des Zweigs, Weiter), hat sie
  // gesehen: Schritt 3 zeigt danach alle, nie weniger als vorher. Ohne das fiel „Ränder“ nach dem Designer wieder weg
  // (`aussehen_bis` stand noch auf der Stelle vor dem Designer), auch mit einer eigenen Wahl gleich dem Standard.
  function designerBeenden() {
    if (S.designer && Z.mappe) Z.mappe.aussehen_bis = FOLGE.length - 1;
    S.designer = null;
  }
  function gruppe(g) { return document.querySelector('#schritt-3 .aus-gruppe[data-gruppe="' + g + '"]'); }
  function zeichneGruppen(s) {
    var bis = aussehenBis(), alle = bis >= FOLGE.length - 1, d = !!S.designer;
    FOLGE.forEach(function (g, i) { gruppe(g).hidden = i > bis; });
    $("feinheiten").hidden = bis < 1;
    // der Knopf steht unter der letzten sichtbaren Gruppe (Farbe bis Ränder liegen in #feinheiten)
    var letzte = gruppe(FOLGE[bis]), k = $("standard-weiter");
    if (letzte.parentNode === $("feinheiten")) letzte = $("feinheiten");
    if (bis === 0) letzte = gruppe("bilder");
    if (letzte.nextElementSibling !== k) letzte.after(k);
    k.textContent = Z.mappe && typeof Z.mappe.aussehen_bis === "number" ? "Rest als Standard und weiter" :
        "Standard nehmen und weiter";
    k.hidden = s > 3 || alle || d;
    $("weiter-3").hidden = s > 3 || !alle || d;
    $("designer-fertig").hidden = !d;
  }
  // Bilder (AP13.5g b5): eine Zahl im Steckbrief gehört zur Kachel „Benutzerdefiniert“ (wert zahl)
  function bilderKachel() { var w = String(bilderWert()); return /^\d+$/.test(w) && w !== "0" ? "zahl" : w; }
  function bilderZahl() { var n = parseInt($("bilder-zahl").value, 10); return n >= 1 && n <= 30 ? n : 10; }
  function bilderText() {
    var w = String(bilderWert());
    return bilderKachel() !== "zahl" ? "Bilder: " + oberText("bilder", w) : w === "1" ? "1 Bild" : w + " Bilder";
  }
  function zeichneAussehen() {
    if (!S.katalog) return;
    var o = S.katalog.oberflaeche, hue = akzent(), fam = familieInfo(familieJetzt()) || {};
    if (S.familien) {
      zeichneFamilien();
      var fest = fam.akzent_fest, farbe = S.angaben.farbe || "";
      kachelGruppe($("aus-dichte"), "dichte", S.familien.dichte, miniDichte, S.angaben.dichte || "normal");
      kachelGruppe($("aus-kasten"), "kasten", S.familien.kasten.map(function (w) {
        return w.wert === "familie" ? { wert: w.wert, text: w.text, label: "Ränder wie " + (fam.text || "die Familie") }
          : w.probe ? { wert: w.wert, text: w.text, probe: "Importprobe steht aus" } : w;
      }), miniKasten, S.angaben.kasten || "familie");
      if (/^#[0-9A-Fa-f]{6}$/.test(farbe)) { $("farbe-eigen").value = farbe.toLowerCase(); EIGEN.dataset.gewaehlt = "1"; }
      EIGEN.querySelector(".eigen-mini").style.background = EIGEN.dataset.gewaehlt ? $("farbe-eigen").value : "";
      $("farbe-eigen").disabled = !!fest;
      $("farbe-fest").hidden = !fest;
      $("farbe-fest").textContent = fest ? oberText("familie", familieJetzt()) + " nutzt keine Akzentfarbe." : "";
      $("aus-farbe").classList.toggle("aus-gesperrt", !!fest);
    }
    var format = S.angaben.format || "themen";
    kachelGruppe($("aus-format"), "format", o.format.map(function (w) {
      return { wert: w.wert, text: w.text, zeile: w.wert === "wochen" ? "braucht einen Kursbeginn" : "",
        probe: w.probe };
    }), function (w) { return miniFormat(w, hue); }, format);
    $("start-l").hidden = format !== "wochen";
    if (document.activeElement !== $("a-start")) $("a-start").value = S.angaben.start || "";
    // Farbe (AP13.5d §3): erster Kreis = Farbe der Familie (Wert leer, „Standard“), dann fünf Namen, zuletzt
    // „Eigene“ mit dem Farbwähler auf der Kachel (AP13.5g b1)
    var famHue = fam.akzent || STANDARD_FARBE;
    kachelGruppe($("aus-farbe"), "farbe", o.farbe.map(function (w) {
      return w.wert ? w : { wert: "", text: w.text, label: "Farbe von " + (fam.text || "der Familie") };
    }).concat([{ wert: "eigen", text: "Eigene", element: EIGEN }]), function (w) {
      return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="16" fill="'
        + (FARBEN[w] || famHue) + '"/></svg>';
    }, /^#/.test(S.angaben.farbe || "") ? "eigen" : S.angaben.farbe || "");
    if (S.familien) Array.prototype.forEach.call($("aus-farbe").querySelectorAll(".aus-kachel"), function (b) {
      b.toggleAttribute("disabled", !!fam.akzent_fest); });
    kachelGruppe($("aus-bilder"), "bilder", o.bilder, miniBilder, bilderKachel());
    $("bilder-zahl-l").hidden = bilderKachel() !== "zahl";
    if (bilderKachel() === "zahl" && document.activeElement !== $("bilder-zahl")) $("bilder-zahl").value = bilderWert();
    $("bildbeschriftung-l").hidden = String(bilderWert()) === "0";
    kachelGruppe($("aus-bildbeschriftung"), "bildbeschriftung", o.bildbeschriftung, miniBeschriftung,
        S.angaben.bildbeschriftung || o.bildbeschriftung.filter(function (w) { return w.standard; })[0].wert);
    kachelGruppe($("aus-website"), "website", o.website, function (w) { return miniWebsite(w, hue); },
        S.angaben.website || "textfeld");
    $("format-karte").hidden = false;
    if (S.familien) $("vorschau-name").textContent = [(familieInfo(familieJetzt()) || {}).text,
      oberText("format", format)].filter(Boolean).join(" · ");
    S.formatVorschau();
  }
  function miniBilder(wert) {
    var n = { "0": 0, "2-3": 2, "4-7": 4, "8+": 8 }[wert] || 0,
        s = '<svg viewBox="0 0 120 76" aria-hidden="true" focusable="false"><rect width="120" height="76" ' +
        'fill="#fff"/>';
    if (wert === "zahl") return s + '<rect x="30" y="12" width="60" height="52" rx="4" fill="#D5DAE3"/><text x="60" ' +
        'y="47" text-anchor="middle" font-size="26" font-weight="700" fill="#0B1220" font-family="system-ui, sans-serif">' +
        (bilderKachel() === "zahl" ? bilderWert() : bilderZahl()) + "</text></svg>";      // nur Ziffern
    if (!n) s += '<rect x="20" y="20" width="80" height="36" rx="3" fill="none" stroke="#C3C8D2" ' +
        'stroke-dasharray="4 3"/>';
    for (var i = 0; i < n; i++) {
      var sp = n > 4 ? 4 : n, x = 8 + (i % sp) * (104 / sp), y = n > 4 ? 8 + Math.floor(i / 4) * 32 : 20;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (104 / sp - 6) + '" height="' + (n > 4 ? 28 : 36) +
          '" rx="3" fill="#D5DAE3"/>';
    }
    return s + "</svg>";
  }
  // Beschriftung im Bild (AP13.5h a8): kurze Wortbalken an den Teilen oder Ziffern an dünnen Pfeilen
  function miniBeschriftung(wert) {
    var s = '<svg viewBox="0 0 120 50" aria-hidden="true" focusable="false"><rect width="120" height="50" fill="#fff"/>' +
        '<rect x="40" y="10" width="40" height="30" rx="4" fill="#D5DAE3"/>';
    if (wert === "woerter") return s + '<line x1="40" y1="18" x2="30" y2="18" stroke="#0B1220"/><rect x="6" y="15" ' +
        'width="22" height="5" rx="1" fill="#0B1220"/><line x1="80" y1="32" x2="90" y2="32" stroke="#0B1220"/><rect ' +
        'x="92" y="29" width="22" height="5" rx="1" fill="#0B1220"/></svg>';
    return s + '<line x1="40" y1="18" x2="24" y2="18" stroke="#0B1220"/><line x1="80" y1="32" x2="96" y2="32" ' +
        'stroke="#0B1220"/><text x="18" y="22" text-anchor="middle" font-size="11" font-weight="700" fill="#0B1220" ' +
        'font-family="system-ui, sans-serif">1</text><text x="102" y="36" text-anchor="middle" font-size="11" ' +
        'font-weight="700" fill="#0B1220" font-family="system-ui, sans-serif">2</text></svg>';      // nur Ziffern
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
  // die Kachel „Eigene“ ist ein label: der Klick öffnet den Farbwähler (Klick auf das Feld, hier übergangen); eine
  // schon gewählte eigene Farbe gilt sofort. „Benutzerdefiniert“ bei Bilder schreibt die Zahl aus dem Feld darunter.
  var EIGEN = $("farbe-eigen-l");
  EIGEN.insertBefore(el("span", { cls: "eigen-mini", "aria-hidden": "true" }), EIGEN.firstChild);
  EIGEN.querySelector(".eigen-mini").appendChild($("farbe-eigen"));
  $("schritt-3").addEventListener("click", function (ev) {
    var b = ev.target.closest(".aus-kachel");
    if (!b || !Z.mappe || b.hasAttribute("disabled") || ev.target.id === "farbe-eigen") return;
    var a = {}, wert = b.dataset.wert;
    if (b.dataset.feld === "farbe" && wert === "eigen") {
      if (!EIGEN.dataset.gewaehlt) { zeichneAussehen(); return; }
      wert = $("farbe-eigen").value.toUpperCase();
    }
    if (b.dataset.feld === "bilder" && wert === "zahl") wert = String(bilderZahl());
    a[b.dataset.feld] = wert;
    S.angaben[b.dataset.feld] = wert;
    aussehenGewaehlt(b.dataset.feld);
    zeichneAussehen(); felderFuellen(); zeichneSchritte();
    angabenSchreiben(a, true);
    if (b.dataset.feld === "format" && wert === "wochen" && !S.angaben.start) $("a-start").focus();
    if (b.dataset.feld === "bilder" && b.dataset.wert === "zahl") $("bilder-zahl").focus();
  });
  // Zahl der Bilder (1 bis 30): schreibt kurs.bilder als Zahl, sobald sie gültig ist
  var bilderTimer = null;
  $("bilder-zahl").addEventListener("input", function () {
    var w = $("bilder-zahl").value.trim();
    if (!Z.mappe || !/^\d+$/.test(w) || +w < 1 || +w > 30) return;
    S.angaben.bilder = String(+w);
    clearTimeout(bilderTimer);
    bilderTimer = setTimeout(function () { angabenSchreiben({ bilder: String(+w) }, true); }, 300);
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
    EIGEN.dataset.gewaehlt = "1";
    S.angaben.farbe = w;
    aussehenGewaehlt("farbe");
    zeichneAussehen(); felderFuellen(); zeichneSchritte();
    angabenSchreiben({ farbe: w }, true);
  });
  // „Standard nehmen und weiter“: die verborgenen Gruppen tragen den Standard (sonst wären sie sichtbar, aussehenBis)
  $("weiter-3").onclick = $("standard-weiter").onclick = function () {
    if (Z.mappe) { Z.mappe.aussehen = true; gehe(4); } };

  // AP13.19 §3: Sprunglinks in „Mehr einstellen“. „Zum Designer“ zeigt Schritt 3 mit allen Gruppen und der Vorschau,
  // ohne den Fortschritt zu ändern (S.designer = {y}; kein gehe); „Fertig“ führt an die Stelle zurück.
  $("zum-designer").onclick = function () {
    if (!Z.mappe) return;
    S.designer = { y: window.scrollY };
    zeichne();
    $("schritt-3").scrollIntoView({ block: "start" });
    $("s3-titel").focus({ preventScroll: true });
    vorschauMassstab();
  };
  $("designer-fertig").onclick = function () {
    if (!S.designer) return;
    var y = S.designer.y;
    designerBeenden();
    if (schritt() > 2) S.auf[2] = true;
    $("mehr").open = true;
    zeichne();
    geaendert();
    window.scrollTo(0, y);
    $("zum-designer").focus({ preventScroll: true });
  };
  $("zum-material").onclick = function () {
    var f = $("a-material");
    f.scrollIntoView({ block: "center" });
    f.focus({ preventScroll: true });
  };
  $("zum-lehrplan").onclick = function () {
    var d = $("lehrplan-ausklapp");
    d.open = true;
    $("lehrplan-teil").scrollIntoView({ block: "start" });
    $("fach").focus({ preventScroll: true });
  };

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
      if (a.schulart) schulartMerken(a.schulart);
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

  var FELDER = { "a-thema": "thema", "a-jahrgang": "jahrgang", "a-zielgruppe": "jahrgang", "a-minuten": "minuten",
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
    if (/^a-(thema|jahrgang|minuten|zielgruppe)$/.test(ev.target.id) && !felderPruefen([ev.target.id])) return;
    var wert = ev.target.value;
    if (ev.target.id === "a-zielgruppe") wert = wert.trim() || $("a-jahrgang").value.trim();   // leer: Jahrgang gilt
    if (feld === "minuten") wert = parseInt(wert, 10) || "";
    if (ev.target.id === "a-farbe" && wert === "eigen") wert = ($("a-farbe-hex").value || $("farbe-eigen").value).toUpperCase();
    if (ev.target.id === "a-farbe-hex") {
      if (!/^#[0-9A-Fa-f]{6}$/.test(wert)) return;
      wert = wert.toUpperCase();
    }
    if (["thema", "jahrgang", "minuten"].indexOf(feld) >= 0) {
      Z.mappe.einheit = Object.assign({}, Z.mappe.einheit || {}); Z.mappe.einheit[feld] = wert;
      if (ev.target.id === "a-zielgruppe" && zielgruppeAus(wert))
        Z.mappe.einheit.jahrgang_zuletzt = $("a-jahrgang").dataset.zuletzt || Z.mappe.einheit.jahrgang_zuletzt || "";
      if (feld === "thema") Z.mappe.titel = wert;
    }
    S.angaben[feld] = wert;
    zeichne();
    var a = {}; a[feld] = wert;
    if (ev.target.id === "a-zielgruppe") {            // AP13.20: Zielgruppe macht die Schulart frei, ohne sie kommt sie zurück
      var sa = zielgruppeAus(wert) ? "" : $("a-schulart").value;
      if (sa !== (S.angaben.schulart || "")) { a.schulart = sa; S.angaben.schulart = sa; }
    }
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
  $("fach").addEventListener("input", function () {
    kontextSchreiben("fach", $("fach").value.trim());
    if (Z.mappe && S.katalog) { zeichneRichtung(); vorlagenZeigen(); zeichneMachArt(); }   // AP13.24: Wörter und Arten nach dem Fach
  });
  $("a-material").addEventListener("input", function () {
    feldOk($("a-material"));
    if (!Z.mappe) return;
    Z.mappe.material = $("a-material").value;
    geaendert();
  });

  // Kopfzeile unter 640 px (AP13.5g b7): der Menüknopf klappt die Textlinks als Liste auf; ein Klick darin, Escape
  // oder ein Klick außerhalb klappt zu
  function menue(auf) {
    $("kopf-menue").setAttribute("aria-expanded", String(auf));
    document.querySelector(".kopf").classList.toggle("menue-auf", auf);
  }
  $("kopf-menue").onclick = function () { menue($("kopf-menue").getAttribute("aria-expanded") !== "true"); };
  $("kopf-links").addEventListener("click", function (ev) {
    if (ev.target.closest(".kopf-link")) setTimeout(function () { menue(false); }, 0);   // erst nach der Dateiwahl
  });
  document.addEventListener("click", function (ev) {
    if (!ev.target.closest(".kopf") && $("kopf-menue").getAttribute("aria-expanded") === "true") menue(false);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape" || $("kopf-menue").getAttribute("aria-expanded") !== "true") return;
    menue(false); $("kopf-menue").focus();
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
  Object.assign(S, { schulartGemerkt: schulartGemerkt, adresseLesen: adresseLesen, angabenSchreiben: angabenSchreiben, ausklapp: ausklapp,
    kursangabenMerken: kursangabenMerken,
    felderPruefen: felderPruefen, feldOk: feldOk,
    akzent: akzent, gehe: gehe, jahrgangZahl: jahrgangZahl, nachZwei: nachZwei, neuStart: neuStart,
    schemaZeigen: schemaZeigen, steckbriefSicher: steckbriefSicher, vorlageNach: vorlageNach, vorschauLaden: vorschauLaden,
    vorlagenZeigen: vorlagenZeigen, vorschlagAnwenden: vorschlagAnwenden, vorschlagLoesen: vorschlagLoesen,
    fachWoerter: fachWoerter, fachJetzt: fachJetzt, weiterAnzeigen: weiterAnzeigen, zeichneAussehen: zeichneAussehen,
    zeichneSchritte: zeichneSchritte, zeigeFehler: zeigeFehler });
})();
