/* Kursmühle – Fragen und Lösungen, Gegenprüfen, Datei herunterladen, nächste Einheit, Rückmeldung.
 * Startet die Seite, wenn alle Skripte geladen sind. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, ZWEIG_TEXT = S.ZWEIG_TEXT, adresseLesen = S.adresseLesen, autosave = S.autosave,
      chatInfo = S.chatInfo, download = S.download, el = S.el, geaendert = S.geaendert,
      gehe = S.gehe, heute = S.heute, knoepfe = S.knoepfe, kopieren = S.kopieren, ladenStarten = S.ladenStarten,
      nachZwei = S.nachZwei, neuStart = S.neuStart, oberText = S.oberText, schemaZeigen = S.schemaZeigen,
      schritt = S.schritt, status = S.status, weiterAnzeigen = S.weiterAnzeigen, zeichne = S.zeichne,
      zeichneSchritte = S.zeichneSchritte, zeigeFehler = S.zeigeFehler, zeit = S.zeit, zuKarte = S.zuKarte,
      zweig = S.zweig;
  var BUCHST = "ABCDEFGHIJ";
  // MF4: Wortlaut aus katalog.yaml oberflaeche.pruefseite; PK nimmt mit eigener KI die Fassung `_ki`
  function PT(k, w) {
    var t = ((S.katalog && S.katalog.oberflaeche.pruefseite) || {})[k];
    t = typeof t === "string" ? t : "";
    Object.keys(w || {}).forEach(function (x) { t = t.split("{" + x + "}").join(w[x]); });
    return t;
  }
  function PK(k, w) { return weg() === "ki" && PT(k + "_ki") ? PT(k + "_ki", w) : PT(k, w); }
  S.pruefText = PT;

  // MF4 (Konzept §3.7): die Liste der Fragen steht direkt da; je Frage „Ändern“ (Editor am Baustein) und, nach der
  // Prüfung im Chat, das Ergebnis an der Frage. AP13.35 §4.2: mit mehreren Einheiten die laufende offen, die früheren je
  // Einheit zugeklappt darunter
  function zeichneFragen() {
    if (!Z.mappe) return;
    stil();
    zeichneOffen();
    bereinigen();
    zeichneGegen();
  }
  var listeSig = "";
  function listeZeichnen() {
    var ol = $("fragen-liste");
    var mehr = S.mehrereEinheiten(), jetzt = S.einheitTag() || "e1", frueher = {}, reihe = [];
    // nur neu zeichnen, wenn sich Fragen oder Ergebnis geändert haben (Fokus auf „Ändern“ bleibt nach dem Editor)
    var sig = JSON.stringify([S.fragenListe, ergebnisJe(), entschieden(), korrigieren, weg(), mehr, jetzt,
        S.katalog ? 1 : 0]);
    if (sig === listeSig) return;
    listeSig = sig;
    ol.innerHTML = "";
    var eigene = S.fragenListe.filter(function (f) {
      var e = S.einheitVon(S.karteNach(f.baustein));
      if (!mehr || e === jetzt) return true;
      if (!frueher[e]) { frueher[e] = []; reihe.push(e); }
      frueher[e].push(f);
      return false;
    });
    var n = eigene.length;
    $("fragen-zeile").textContent = !S.fragenListe.length ? "In dieser Einheit stehen noch keine Fragen." : !n ? "" :
        n === 1 ? PT("fragen_zeile_eine") : PT("fragen_zeile", { n: n });
    ol.hidden = !S.fragenListe.length;
    if (mehr && n) ol.appendChild(el("li", { cls: "f-einheit" }, [el("h3", { cls: "f-einheit-t",
        text: S.einheitName(jetzt) })]));
    var je = ergebnisJe();
    fragenZeichnen(ol, eigene, je);
    reihe.forEach(function (e) {
      var unter = el("ol", { cls: "fragen-liste" });
      fragenZeichnen(unter, frueher[e], je);
      ol.appendChild(el("li", { cls: "f-einheit f-frueher" }, [el("details", {}, [el("summary", { cls: "f-einheit-t",
          text: S.editorText("fragen_frueher", { name: S.einheitName(e), zahl: frueher[e].length }) }), unter])]));
    });
  }
  // Ergebnis der Prüfung je Nummer: {art: "gleich"|"abw"|"fehlt", a: Abweichung}
  function ergebnisJe() {
    var v = vergleichJetzt(), je = {};
    if (!v) return je;
    v.gleich.forEach(function (g) { je[g.nr] = { art: "gleich" }; });
    v.abweichungen.forEach(function (a) { je[a.nr] = { art: "abw", a: a }; });
    v.fehlend.forEach(function (nr) { je[nr] = { art: "fehlt" }; });
    return je;
  }
  function fragenZeichnen(ol, liste, je) {
    var letzter = null;
    liste.forEach(function (f) {
      var kopf = f.baustein !== letzter ? el("p", { cls: "f-baustein", text: f.titel }) : null;
      letzter = f.baustein;
      var loes = f.loesung.map(function (l) { return l[0]; });
      var optionen = f.art === "auswahl" || f.art === "zuordnen" ? el("ul", { cls: "f-optionen" },
          f.optionen.map(function (o, i) {
        var richtig = loes.indexOf(o) >= 0;
        return el("li", { cls: richtig ? "richtig" : "" }, [(f.art === "auswahl" ? BUCHST[i] + ") " : "") + o, richtig ?
            el("span", { cls: "f-marke", text: " richtig" }) : null]);
      })) : null;
      var loesung = f.art === "auswahl" || f.art === "zuordnen" ? null
        : el("p", { cls: "f-loesung", text: "Lösung: " + f.loesung.map(function (l) { return l.join(" oder "); })
            .join("; ") });
      var r = je[f.nr], extra = null, cls = "frage", key = null;
      if (r && r.art === "gleich") extra = el("p", { cls: "f-chat f-gleich" }, [el("span", { cls: "f-haken",
          "aria-hidden": "true" }), PK("stimmt")]);
      else if (r && r.art === "fehlt") extra = el("p", { cls: "f-chat leise", text: PK("ohne_antwort") });
      else if (r && r.art === "abw") {
        key = schluessel(r.a);
        var ent = (entschieden()[key] || {}).wert;
        cls += " abw" + (ent ? " " + ent : korrigieren[key] && !ent ? " korrigieren" : "");
        extra = abwTeil(r.a, key, ent);
      }
      // MF5: die Nummer der Frage im Baustein; der Editor öffnet das Feld dieser Frage
      var imB = S.fragenListe.filter(function (x) { return x.baustein === f.baustein && x.nr <= f.nr; }).length;
      var aendern = el("button", { type: "button", cls: "textlink f-aendern", "data-ziel": f.baustein, "data-frage": String(imB),
        "aria-label": "Ändern: Frage " + f.nr + " in „" + f.titel + "“", text: "Ändern" });
      ol.appendChild(el("li", { cls: cls, "data-nr": f.nr, "data-key": key }, [kopf, el("div", { cls: "f-zeile" }, [
        el("p", { cls: "f-frage", text: (f.art === "rf" ? "Richtig oder falsch: " : "") + f.frage }), aendern]),
        optionen, loesung, extra]));
    });
  }
  // „Chat sieht es anders: …“ mit den Wegen: korrigieren lassen (Bitte in das Gespräch der Einheit), „Meine Lösung gilt“,
  // „Übergehen“, bei Lücken und Kurzantworten „Als weitere Lösung zulassen“ (AP13.5h a9, je Lücke); „Ändern“ steht an der
  // Frage
  function abwTeil(a, k, ent) {
    var korr = !ent && !!korrigieren[k];
    var knopf = function (aktion, text, an) {
      return el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": aktion, "data-key": k,
        "aria-pressed": String(an), text: text });
    };
    var zulassen = function (nr) {
      return el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "zulassen", "data-key": k,
        "data-luecke": nr, text: "Als weitere Lösung zulassen" });
    };
    var mehrere = !!(a.luecken && a.luecken.length > 1);
    var marke = ent === "gilt" ? "Deine Lösung gilt" : ent === "uebergangen" ? "Übergangen" : korr ? "Wird korrigiert" : "";
    var was = a.luecken && a.luecken.length ? a.luecken.map(function (l) {
      return el("p", { cls: "abw-luecke" }, ["Lücke " + l.nr + ": „" + l.chat + "“ statt „" + l.kursdatei.join(" oder ") +
        "“", a.zulassen && mehrere ? zulassen(l.nr) : null]);
    }) : [el("p", { cls: "abw-chat", text: a.chat_anzeige || a.chat })];
    return el("div", { cls: "f-abw" }, [el("p", { cls: "abw-kopf" }, [el("span", { cls: "abw-wort", text: PK("anders") }),
        marke ? el("span", { cls: "abw-marke", text: " · " + marke }) : null])].concat(was, [
      el("div", { cls: "abw-wege" }, [knopf("korrigieren", "Korrigieren lassen", korr),
        knopf("gilt", "Meine Lösung gilt", ent === "gilt"), knopf("uebergehen", "Übergehen", ent === "uebergangen"),
        a.zulassen && !mehrere ? zulassen(a.luecken && a.luecken.length ? a.luecken[0].nr : 1) : null])]));
  }
  $("fragen-liste").addEventListener("click", function (ev) {
    var z = ev.target.closest(".f-aendern"); if (z) { editorAm(z.dataset.ziel, z, parseInt(z.dataset.frage, 10)); return; }
    var b = ev.target.closest("[data-aktion]");
    if (!b || !Z.mappe) return;
    if (b.dataset.aktion === "zulassen") { zulassen(b.dataset.key, parseInt(b.dataset.luecke, 10)); return; }
    var k = b.dataset.key, e = entschieden(), wert = { gilt: "gilt", uebergehen: "uebergangen" }[b.dataset.aktion];
    if (!wert) { if (korrigieren[k]) delete korrigieren[k]; else { korrigieren[k] = true; delete e[k]; } }
    else {
      delete korrigieren[k];
      if (e[k] && e[k].wert === wert) delete e[k];
      else e[k] = { wert: wert, hash: hashVon(k.slice(0, k.lastIndexOf("|"))) };
    }
    autosave();
    zeichneGegen();
    zeichneSchritte();
    var neu = $("fragen-liste").querySelector("[data-key='" + CSS.escape(k) + "'][data-aktion='" + b.dataset.aktion + "']");
    if (neu) neu.focus({ preventScroll: true });
  });
  // „Ändern“ an einer Frage und „Im Editor ändern“ an einer Zeile `Offen:`: der Editor am Baustein (AP13.44 macht Quiz dort
  // bedienbar); ohne Editor (Seite noch ohne Prüfung) die Karte in Schritt 5
  function editorAm(id, von, frage) {
    if (!(S.editorBei && Z.pruefung && Z.pruefung.bausteine.length)) { zuKarte(id); return; }
    if (frage && S.editorStelle) S.editorStelle(id, { frage: frage }, von); else S.editorBei(id, von);
  }

  // MF4, offene Entscheidung 7: „Lösungen angesehen“, wenn das Ende der Liste eine Sekunde im Blick war, während der
  // Schritt offen ist (eine Näherung); eine Änderung an Fragen setzt es zurück (karten.js durchsichtNach)
  var ANGESEHEN_MS = 1000, angesehenUhr = null;
  function angesehen() { return !!(Z.mappe && Z.mappe.durchsicht === true); }
  S.loesungenAngesehen = angesehen;
  function endeImBlick(an) {
    clearTimeout(angesehenUhr);
    if (!an || !Z.mappe || angesehen() || !S.fragenListe.length || !$("schritt-6").classList.contains("auf")) return;
    angesehenUhr = setTimeout(function () {
      if (!Z.mappe || angesehen() || !$("schritt-6").classList.contains("auf")) return;
      Z.mappe.durchsicht = true; delete Z.mappe.durchsicht_neu;
      geaendert();
      $("durchsicht-neu").hidden = true;
      zeichneSchritte();
    }, ANGESEHEN_MS);
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (e) { endeImBlick(e[e.length - 1].isIntersecting); })
        .observe($("fragen-ende"));
  }
  function durchsichtOffen() { return !!(S.fragenListe.length && !angesehen()); }
  // Schritt Fragen: Fokus auf die Überschrift (nicht auf einen Knopf, der ohne Lesen weiterführt, AP13.33 §2.3)
  function zuFragen() { gehe(6, document.querySelector("#schritt-6 .s-kopf")); }
  function nachBildern() {
    if (durchsichtOffen()) zuFragen(); else gehe(7, "herunterladen");
  }
  // AP13.44 §3: nächster offener Schritt für die Leiste im Editor, erst wenn die Antwort ohne Rot eingesetzt ist: nach
  // Schritt 5 die Bilder (nur mit Bildwünschen), dann die Fragen (nicht angesehen, noch nicht weiter), dann die Datei. null vor
  // Schritt 5, mit Rot und wenn der offene Schritt der aktuelle ist
  S.naechsterOffen = function () {
    if (!Z.mappe || !S.inhalt() || S.fehlerZahl() || S.teileOffen()) return null;
    var s = S.schritt(), n = s === 5 && S.sichtbareSchritte().indexOf(5.5) >= 0 ? 5.5 : durchsichtOffen() && s < 7 ? 6 : 7;
    return s < 5 || n === s ? null : n;
  };
  S.weiterZu = function (n) {
    if (!Z.mappe) return;
    if (n === 6) zuFragen(); else if (n === 7) gehe(7, "herunterladen"); else gehe(n);
  };
  $("weiter-5").onclick = function () {
    if (!Z.mappe) return;
    // Schritt Bilder nur, wenn er sichtbar ist: Bildwünsche trotz „keine“ (Standard seit AP13.12 a2) führen weiter
    if (S.sichtbareSchritte().indexOf(5.5) >= 0) gehe(5.5); else nachBildern();
  };
  $("weiter-bilder").onclick = function () { if (Z.mappe) nachBildern(); };
  // MF4: neutral weiter; die Prüfseite nennt, ob die Lösungen angesehen sind (keine Bestätigung ohne Lesen, Befund 16)
  $("weiter-6").onclick = function () { if (Z.mappe) gehe(7, "herunterladen"); };

  // Prüfung im Chat (AP13.5g): ein neues Gespräch löst die Aufgaben ohne Lösungen; je Abweichung drei Wege. Die
  // Entscheidungen stehen in der Mappe (`durchsicht_entschieden`, Schlüssel „id|Nummer im Baustein“) mit dem Hash des
  // Bausteins und fallen weg, sobald sich der Baustein ändert. MF4: `durchsicht_weg` = „chat“ nach dem Kopieren, „ki“ nach
  // dem Senden; `durchsicht_antwort` = die eingefügte Antwort (nach dem Neuladen wird sie wieder verglichen)
  var korrigieren = {};             // Schlüssel -> true: Abweichungen, für die eine Bitte gesammelt wird (nicht in der Mappe)
  var gegenFuer = null;             // Prüfung, zu der Z.vergleich gehört
  var feldAuf = false;              // „Andere Antwort einfügen“: das Feld steht trotz Ergebnis offen
  function stil() {
    if ($("stil-durchsicht")) return;
    document.head.appendChild(el("style", { id: "stil-durchsicht", text: [
      // eine Abweichung ist ein Hinweis zum Nachsehen, kein Fehler: gelb wie die Hinweise, nicht rot (Konzept §4.3)
      ".frage.abw .f-abw { margin: 8px 0 0; padding: 8px 12px; border-left: 4px solid var(--warn); border-radius: 6px;",
      "  background: var(--warn-flaeche); }",
      ".frage.abw.gilt .f-abw { border-left-color: var(--ok); background: var(--grund); }",
      ".frage.abw.uebergangen .f-abw { border-left-color: var(--leer); background: var(--grund); }",
      ".frage.abw.korrigieren .f-abw { border-left-color: var(--text); }",
      ".f-abw p { margin: 0 0 4px; }",
      ".abw-wort { font-weight: 650; }",
      ".abw-marke { font-weight: 600; }",
      ".abw.gilt .abw-marke { color: var(--ok); }",
      ".abw.uebergangen .abw-marke { color: var(--leise); }",
      ".abw-wege { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }",
      ".abw-wege [aria-pressed=true] { box-shadow: inset 0 0 0 2px var(--text); }",
      ".abw-luecke .klein-knopf { margin-left: 8px; }"
    ].join("\n") }));
  }
  // Hash wie `schleife` (karten.js): ohne Leerraum, djb2 und Länge
  function textHash(t) {
    var s = String(t || "").replace(/\s+/g, ""), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + "." + s.length;
  }
  function kiAktiv() { return !!(S.anKiAktiv && S.anKiAktiv()); }
  function weg() {
    var w = Z.mappe && Z.mappe.durchsicht_weg;
    return w === "ki" && !kiAktiv() ? "" : w === "ki" || w === "chat" ? w : "";
  }
  function entschieden() { return Z.mappe ? (Z.mappe.durchsicht_entschieden = Z.mappe.durchsicht_entschieden || {}) : {}; }
  function schluessel(a) { return a.baustein + "|" + a.aufgabe; }
  function hashVon(id) {
    var b = Z.pruefung && Z.pruefung.bausteine.filter(function (x) { return x.id === id; })[0];
    return b ? textHash(b.text) : null;
  }
  // Entscheidungen zu Bausteinen, die fehlen oder sich geändert haben, fallen weg (auch nach „Einheit ersetzen“)
  function bereinigen() {
    var e = Z.mappe && Z.mappe.durchsicht_entschieden, weg = false;
    if (!e || !Z.pruefung) return;
    Object.keys(e).forEach(function (k) {
      if (!e[k] || e[k].hash !== hashVon(k.slice(0, k.lastIndexOf("|")))) { delete e[k]; weg = true; }
    });
    if (weg) autosave();
  }
  function vergleichJetzt() { return Z.vergleich && gegenFuer === Z.pruefung ? Z.vergleich : null; }
  function offen() {
    var v = vergleichJetzt(), e = entschieden();
    return v ? v.abweichungen.filter(function (a) { return !e[schluessel(a)]; }) : null;
  }
  // Stand der Prüfung für Zeile, Zusammenfassung und Prüfseite: „Im Chat geprüft: 2 Abweichungen“ (`offen` = noch nicht
  // entschieden), „… keine Abweichung“; "" ohne Ergebnis
  function pruefStand() {
    var v = vergleichJetzt();
    if (!v) return "";
    var n = v.abweichungen.length, o = offen().length;
    var zahl = n ? n + (n === 1 ? " Abweichung" : " Abweichungen") + (o && o < n ? ", " + o + " offen" : "") :
        "keine Abweichung";
    return PK("geprueft", { zahl: zahl });
  }
  S.pruefStand = pruefStand;
  // AP13.12 a10: Zeilen `Offen:` der Kursdatei (gen/api.offen) oben in Schritt 6, je Zeile mit ihrem Baustein; wie bei
  // den Bildwünschen nur die laufende Einheit (Zeilen im Kopf gehören zur ersten)
  function zeichneOffen() {
    var ul = $("offen-liste"), tag = S.einheitTag();
    var zeilen = ((Z.pruefung && Z.pruefung.offen) || []).filter(function (o) {
      var k = o.baustein && S.karteNach(o.baustein);
      return o.baustein ? !!k && (k.einheit || "") === tag : !tag;
    });
    ul.innerHTML = "";
    zeilen.forEach(function (o) {
      ul.appendChild(el("li", {}, [o.text, o.baustein ? el("span", { cls: "leise", text: " · " + (o.titel || "") + " " })
          : null, o.baustein ? el("button", { type: "button", cls: "textlink f-aendern", "data-ziel": o.baustein,
          "aria-label": "Im Editor ändern: " + (o.titel || ""), text: "Im Editor ändern" }) : null]));
    });
    $("offen-kasten").hidden = !zeilen.length;
  }
  $("offen-liste").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) editorAm(z.dataset.ziel, z); };
  // Zeile „Zweite Meinung“: a ohne Kopieren, b nach dem Kopieren mit dem Feld, c mit Ergebnis (das Feld nur nach „Andere
  // Antwort einfügen“)
  function zeichneGegen() {
    if (!Z.mappe) return;
    var n = S.fragenListe.length, w = weg(), ki = kiAktiv(), v = vergleichJetzt();
    // nach dem Neuladen: die gemerkte Antwort ins Feld und gegen die Lösungen vergleichen
    var gemerkt = Z.mappe.durchsicht_antwort || "";
    if (gemerkt && !$("gegen-antwort").value.trim() && !feldAuf) $("gegen-antwort").value = gemerkt;
    // neue Prüfung (Korrektur eingesetzt, Mappe neu geladen): die Antwort im Feld gegen die neuen Lösungen
    if (Z.pruefung && gegenFuer !== Z.pruefung && $("gegen-antwort").value.trim()) { gegenpruefen(); }
    var neuSatz = S.durchsichtNeuText ? S.durchsichtNeuText() : "";
    $("durchsicht-neu").textContent = neuSatz; $("durchsicht-neu").hidden = !neuSatz;
    $("zweite").hidden = !n;
    // das Feld: nach dem Kopieren bis zum Ergebnis, danach nur nach „Andere Antwort einfügen“; nie, solange die eigene KI prüft
    var stand = pruefStand(), mitFeld = w !== "ki" && (w === "chat" || feldAuf) && (!v || feldAuf);
    $("zweite-satz").textContent = stand || PT(ki ? "zweite_ki" : "zweite");
    $("zweite").classList.toggle("geprueft", !!stand);
    $("gegen-kopieren").hidden = ki || !!stand;
    $("gegen-senden").hidden = !ki || !!stand;
    $("gegen-senden").disabled = !$("gegen-text-feld").value || S.kiBesetzt();
    $("gegen-nochmal").hidden = !stand || mitFeld;
    $("gegen-nochmal").textContent = w === "ki" ? "Noch einmal prüfen" : "Andere Antwort einfügen";
    $("gegen-feld").hidden = !mitFeld;
    $("gegen-schritte").hidden = !mitFeld || !!v;
    $("gegen-1").textContent = PT("zweite_1");
    $("gegen-2").textContent = PT("zweite_2");
    if (!mitFeld || v) { $("gegen-kopiert").textContent = ""; $("gegen-text").hidden = true; }
    var fehlt = v && v.fehlend.length ? "Ohne Antwort: " + v.fehlend.length + (v.fehlend.length === 1 ? " Frage." :
        " Fragen.") : "";
    $("gegen-stand").textContent = v && !v.abweichungen.length && !v.gleich.length ?
        "In der Antwort steht zu keiner Frage eine Lösung. Füg die ganze Antwort des Chats ein." : fehlt;
    $("gegen-stand").className = "stand" + (v && !v.abweichungen.length && !v.gleich.length ? " fehler" : "");
    listeZeichnen();
    var bitte = bitteText();
    $("gegen-korrektur-teil").hidden = !bitte;
    var fr = Object.keys(korrigieren).filter(function (k) { return !entschieden()[k]; }).length;
    $("gegen-korrektur-satz").textContent = bitte ? PT("korrektur_satz", { fragen: fr === 1 ? "1 Frage" : fr + " Fragen" }) : "";
    $("gegen-korrektur").textContent = ki ? "Korrekturen an meine KI senden" : "Korrekturbitte kopieren";
    $("gegen-korrektur").disabled = S.kiBesetzt();
  }
  // Eine Bitte je Baustein: „Baustein „Titel“ (`id: b4`), Aufgabe 3: …; Aufgabe 5: …. Prüfe …“ (Sätze aus gen/prompt.py)
  function bitteText() {
    var v = vergleichJetzt(), je = {}, reihe = [];
    if (!v) return "";
    v.abweichungen.forEach(function (a) {
      if (!korrigieren[schluessel(a)] || entschieden()[schluessel(a)]) return;
      if (!je[a.baustein]) { je[a.baustein] = []; reihe.push(a.baustein); }
      je[a.baustein].push(a.satz);
    });
    return reihe.map(function (id) { return v.bitte[id].anfang + je[id].join("; ") + v.bitte[id].ende; }).join("\n\n");
  }
  $("gegen-kopieren").onclick = function () {
    if (!Z.mappe) return;
    var danach = function () {
      Z.mappe.durchsicht_weg = "chat"; feldAuf = !!vergleichJetzt();
      autosave(); zeichneGegen();
    };
    $("gegen-text").hidden = true;
    kopieren($("gegen-text-feld").value, $("gegen-text-feld"), $("gegen-kopiert"), "Prüfauftrag kopiert.", function () {
      danach(); $("gegen-antwort").focus({ preventScroll: true });
    }, function () {
      $("gegen-text-zeigen").value = $("gegen-text-feld").value;
      $("gegen-text").hidden = false; $("gegen-text").open = true; danach();
    });
  };
  $("gegen-nochmal").onclick = function () {
    if (!Z.mappe) return;
    if (weg() === "ki") { $("gegen-senden").onclick(); return; }
    feldAuf = true; $("gegen-antwort").value = "";
    zeichneGegen();
    $("gegen-antwort").focus({ preventScroll: true });
  };
  // Eigene KI verbunden: ein neues Gespräch löst die Aufgaben blind; die Antwort landet im Feld wie eingefügt
  $("gegen-senden").onclick = function () {
    var text = $("gegen-text-feld").value;
    if (!text || !Z.mappe) return;
    Z.mappe.durchsicht_weg = "ki"; autosave();
    S.anKi(text, { einheit: "gegen:" + S.einheitTag(), neu: true, ort: $("gegen-ki-stand"), feld: "gegen",
      stand: function (x, art) { S.standKarte($("gegen-ki-stand"), x, art); },
      fertig: function (antwort) { $("gegen-antwort").value = antwort; clearTimeout(gegenTimer); return gegenpruefen(); }
    });
  };
  var gegenTimer = null;
  $("gegen-antwort").addEventListener("input", function () {
    clearTimeout(gegenTimer);
    gegenTimer = setTimeout(gegenpruefen, 400);
  });
  async function gegenpruefen() {
    var text = $("gegen-antwort").value, pr = Z.pruefung;
    gegenFuer = pr;
    if (Z.mappe && (Z.mappe.durchsicht_antwort || "") !== text.trim()) {
      if (text.trim()) Z.mappe.durchsicht_antwort = text.trim(); else delete Z.mappe.durchsicht_antwort;
      autosave();
    }
    if (!text.trim() || !pr) { Z.vergleich = null; zeichneGegen(); zeichneSchritte(); return; }
    try {
      var v = await km.prompt("vergleich", [pr, text]);
      if (pr !== Z.pruefung) return;               // inzwischen neu geprüft; zeichneGegen vergleicht noch einmal
      Z.vergleich = v;
      if (v.abweichungen.length || v.gleich.length) feldAuf = false;
      zeichneGegen(); zeichneSchritte();
    } catch (e) { zeigeFehler(e); }
  }
  // AP13.5h a9: Antwort als weitere Lösung in die Kursdatei (gen/mappe.py loesung_zulassen); die neue Prüfung vergleicht
  // die Antwort im Feld noch einmal, die Abweichung ist dann weg
  async function zulassen(k, nr) {
    var v = vergleichJetzt(), a = v && v.abweichungen.filter(function (x) { return schluessel(x) === k; })[0];
    if (!a) return;
    var l = a.luecken && a.luecken.filter(function (x) { return x.nr === nr; })[0];
    try {
      await km.bereit();
      Z.kurs_md = await km.mappeFn("loesung_zulassen", [Z.kurs_md, a.baustein, a.aufgabe, nr, l ? l.chat : a.chat]);
      delete korrigieren[k];
      await km.stand(Z.kurs_md);
      await S.auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); }
  }
  // Korrekturen gehen in das Gespräch der Einheit (nicht in das Prüfgespräch); die Antwort setzt Schritt 5 ein wie eine
  // Korrekturrunde: ein Baustein mit `id:` ersetzt den Baustein
  $("gegen-korrektur").onclick = function () {
    var text = bitteText();
    if (!text || !Z.mappe) return;
    $("gegen-korrektur-feld").value = text;
    if (kiAktiv()) return S.anKi(text, { einheit: S.einheitTag(), neu: false, ort: $("gegen-korrektur-ki"),
      feld: "gegen-korrektur",
      stand: function (x, art) { S.standKarte($("gegen-korrektur-ki"), x, art); },
      fertig: async function (antwort) {
        korrigieren = {};
        gehe(5, "eingabe");
        $("eingabe").value = antwort;
        await S.eingabeUebernehmen(null);
      } });
    kopieren(text, $("gegen-korrektur-feld"), $("gegen-korrektur-stand"),
        "Kopiert. Füge die Bitte in das Gespräch dieser Einheit ein und die Antwort im Schritt „Antwort einfügen“.", function () {
      korrigieren = {};
      S.antwortFeldAuf();
      gehe(5, "eingabe");
      S.standKarte($("eingabe-stand"), "Füge hier die Antwort des Chats auf die Korrekturen aus „Fragen und Lösungen“ ein.", "ok");
    });
  };

  // Einheiten der Kursdatei: „e1“ = erste (ohne teil:), dazu die Teile e2, e3 … der angehängten Einheiten
  function einheitenImKurs() {
    var out = ["e1"], re = /^teil:\s*(e\d+)\s*$/gm, m;
    while ((m = re.exec(Z.kurs_md || ""))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }
  // Nachlieferung, wenn schon eine Einheit importiert ist und neue dazukamen; sonst der ganze Kurs als neuer Kurs
  function nachlieferung() {
    var imp = (Z.mappe && Z.mappe.importiert) || [];
    if (!imp.length) return [];
    return einheitenImKurs().filter(function (e) { return e !== "e1" && imp.indexOf(e) < 0; });
  }

  // AP13.42 B6: Prüfsumme der Bausteine einer Einheit; „Ja, die Einheit ist im Kurs“ merkt sie, Schritt 7 vergleicht
  function einheitStand(tag) {
    var s = ((Z.pruefung && Z.pruefung.bausteine) || []).filter(function (b) {
      var k = S.karteNach(b.id); return k && S.einheitVon(k) === tag; })
      .map(function (b) { return b.id + "\u0001" + (b.titel || "") + "\u0001" + (b.text || ""); }).join("\u0000"), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + "." + s.length;
  }
  function geaenderteImportierte() {
    var m = Z.mappe, st = (m && m.importiert_stand) || {};
    return ((m && m.importiert) || []).filter(function (t) { return st[t] && st[t] !== einheitStand(t); });
  }
  // Nachlieferung mit Änderungen an einer schon importierten Einheit: sie steckt nur in der ganzen Datei
  S.nachHinweis = function () {
    var p = $("nl-hinweis"), b = $("herunterladen-ganz"), o = S.katalog && S.katalog.oberflaeche;
    var neu = Z.mappe && o && !$("herunterladen").hidden && (!Z.bau || Z.bau.nachlieferung) ? nachlieferung() : [];
    var geaendert = neu.length ? geaenderteImportierte() : [];
    p.hidden = b.hidden = !geaendert.length;
    if (!geaendert.length) return;
    p.textContent = o.nachlieferung_geaendert.replace("{namen}", geaendert.map(function (t) { return S.einheitName(t); })
        .join(", "));
    b.textContent = o.nachlieferung_ganz;
  };
  $("herunterladen-ganz").onclick = async function () {
    S.bauLaeuft = true; knoepfe(); status("Datei wird erstellt …", "lauf");
    try {
      await km.baue(Object.assign({}, km.bauOptionen || {}));
      S.bauLaeuft = false;
      if (Z.bau && Z.bau.mbz) {
        Z.bau.nachlieferung = null;
        // die ganze Datei kommt als neuer Kurs: „Importiert?“ fragt wieder, und das Ja merkt den Stand aller Einheiten neu
        Z.mappe.importiert = []; Z.mappe.importiert_stand = {}; autosave();
        Z.bau.downloadName = (await km.mappeFn("dateiname", [Z.mappe, heute()])).replace(/\.kursmappe\.zip$/, ".mbz");
        herunterladen(); status("Bereit", "ok");
      } else status("Die Datei ließ sich nicht erstellen.", "fehler");
      zeichneWiederherstellen(); knoepfe(); zeichneSchritte();
      S.fokusRetten(["herunterladen-ganz"]);
    } catch (e) { S.bauLaeuft = false; zeigeFehler(e); knoepfe(); }
  };

  // MF4 (Konzept §2.5): Prüfseite, eine Zeile je Schritt mit Wert und „Ändern“ (Einheit: „Ansehen“ öffnet den Editor);
  // die Werte kommen aus den Zusammenfassungen der Schritte (schritte.js fazit)
  function pruefZeilen() {
    if (!Z.mappe) return [];
    var sichtbar = S.sichtbareSchritte(), z = [];
    z.push({ name: "Thema", wert: S.fazit(1), nr: 1 });
    z.push({ name: "Aufbau", wert: S.fazit(2), nr: 2 });
    z.push({ name: "Aussehen", wert: S.fazit(3), nr: 3 });
    var voll = Z.mappe.bausteine.filter(function (k) { return !k.geplant && !k.aus && (k.einheit || "") ===
        (S.einheitTag() || ""); }).length, f = S.fehlerZahl();
    var kurz = ((Z.pruefung && Z.pruefung.diagnosen) || []).filter(function (d) { return d.regel === "zeit.kurz" &&
        !d.baustein; }).map(function (d) { return /(\d+) von (\d+)/.exec(d.text || ""); }).filter(Boolean)[0];
    z.push({ name: "Einheit", wert: (voll === 1 ? "1 Baustein" : voll + " Bausteine") + (f ? ", " + f + " Fehler" :
        ", geprüft") + (kurz ? " · etwa " + kurz[1] + " von " + kurz[2] + " Minuten" : ""), editor: true });
    var w = S.bildwuensche().filter(function (b) { return b.datei; });
    if (sichtbar.indexOf(5.5) >= 0 && w.length) {
      var da = w.filter(function (b) { return Z.assets[b.datei]; }).length;
      z.push({ name: "Bilder", wert: da === w.length ? (da === 1 ? "1 Bild hochgeladen" : "alle " + da + " hochgeladen") :
          da + " von " + w.length + " hochgeladen, sonst steht dort ein Platzhalter", nr: 5.5 });
    }
    var n = S.fragenListe.length;
    if (n) {
      var neu = S.durchsichtNeuText ? S.durchsichtNeuText() : "";
      z.push({ name: "Fragen", wert: [n + (n === 1 ? " Frage" : " Fragen"), neu ? neu.replace(/\.$/, "") :
          PT(angesehen() ? "angesehen" : "nicht_angesehen"), pruefStand()].filter(Boolean).join(" · "), nr: 6,
      });
    }
    return z;
  }
  S.pruefZeilen = pruefZeilen;
  var prueflisteSig = "";
  function zeichnePruefliste() {
    var dl = $("pruef-liste"), ansehen = $("editor-auf-8"), zeilen = pruefZeilen();
    $("pruef-satz").textContent = PT("satz") || "Das kommt in deinen Kurs.";
    // nur neu zeichnen, wenn sich etwas geändert hat (der Knopf „Ansehen“ behielte sonst den Fokus nicht)
    var sig = JSON.stringify(zeilen);
    if (sig === prueflisteSig && dl.contains(ansehen) === zeilen.some(function (r) { return r.editor; })) return;
    prueflisteSig = sig;
    if (ansehen.parentNode !== document.querySelector("#schritt-7 .s-inhalt")) dl.after(ansehen);   // vor dem Neuzeichnen retten
    dl.innerHTML = "";
    zeilen.forEach(function (r) {
      var knopf = r.editor ? ansehen : el("button", { type: "button", cls: "textlink pruef-aendern", "data-schritt": r.nr,
        "aria-label": "Ändern: " + r.name, text: "Ändern" });
      dl.appendChild(el("div", { cls: "pruef-zeile" }, [el("dt", { text: r.name }),
        el("dd", { cls: "pruef-wert", text: r.wert || "–" }), el("dd", { cls: "pruef-knopf" }, [knopf])]));
    });
  }
  $("pruef-liste").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-schritt]");
    if (b && Z.mappe) S.oeffneSchritt(parseFloat(b.dataset.schritt));
  });
  function zeichneWiederherstellen() {
    zeichnePruefliste();
    var ol = $("wh-schritte"); ol.innerHTML = "";
    var delta = Z.bau && Z.bau.nachlieferung;
    // drei Zeilen in Alltagssprache (katalog.yaml oberflaeche.pruefseite); die genaue Anleitung klappt darunter auf
    var kurz = ((((S.katalog && S.katalog.oberflaeche.pruefseite) || {})[delta ? "wiederherstellen_nachlieferung" :
        "wiederherstellen"]) || []).slice();
    if (kurz.length && !delta && S.angaben.format && S.angaben.format !== "themen") kurz[kurz.length - 1] += " " + PT("schema");
    $("wh-kurz").innerHTML = "";
    kurz.forEach(function (t) { $("wh-kurz").appendChild(el("li", { text: t })); });
    var glossar = Z.pruefung && Z.pruefung.bausteine.some(function (b) { return b.typ === "Glossar"; });
    var badge = S.angaben.abschluss === "test und abzeichen" || (Z.pruefung && Z.pruefung.bausteine.some(function (b) {
        return b.typ === "Badge"; }));
    // AP13.12 a12: mit den Wörtern der Plattform, wie sie eine Lehrkraft sieht (kein „Als neuen Kurs wiederherstellen“)
    var schritte = [
      delta ? "Öffne auf der Plattform den Kurs, in dem die erste Einheit schon liegt."
        : "Leg auf der Plattform einen leeren Kurs an oder nimm einen leeren, den du schon hast. Nie einen Kurs mit " +
            "Klasse.",
      (delta ? "Im Kurs" : "Im leeren Kurs") + ": Mehr → Kurs wiederverwenden → Sicherung wiederherstellen. Datei " +
          "hochladen, Wiederherstellen, Weiter.",
      delta ? "Ziel: „In diesen Kurs wiederherstellen“ → „Den gesicherten Kurs mit diesem Kurs verschmelzen“; die neue " +
          "Einheit kommt hinten an."
        : "Ziel: „In diesen Kurs wiederherstellen“ → „Alle Inhalte dieses Kurses löschen und dann wiederherstellen“ " +
            "(nur im leeren Kurs; nur so kommen Kursformat und Kachelbilder mit).",
      delta ? "„Einstellungen“ und „Schema“: Weiter. Dann „Wiederherstellen“."
        : "„Einstellungen“: Weiter. „Schema“: „Kurseinstellungen überschreiben“ auf „Ja“, damit der Kurs das " +
            "Kursformat " + (oberText("format", S.angaben.format) || "") + " bekommt. Dann „Wiederherstellen“.",
      glossar ? "Glossar: Öffne das Glossar im Kurs, Mehr → Einträge importieren, und wähle die Datei mit den " +
          "Glossar-Einträgen (Knopf oben)."
        : "Sieh die Kursseite einmal so an, wie sie deine Klasse sieht (Rolle wechseln → Schüler/in).",
      badge ? "Abzeichen: Mehr → Badges, das Abzeichen öffnen und „Zugriff " +
          "aktivieren“." : "Prüfe Kursbild und Banner; fehlt ein Bild, steht dort ein Platzhalter."];
    schritte.forEach(function (s) { ol.appendChild(el("li", { text: s })); });
    whBilder();
    var imp = (Z.mappe && Z.mappe.importiert) || [];
    var alle = einheitenImKurs().every(function (e) { return imp.indexOf(e) >= 0; });
    $("importiert-frage").hidden = !!(Z.mappe && alle);
    $("importiert-stand").hidden = !(Z.mappe && alle);
    $("importiert-stand").textContent = PT("importiert");
    var fertig = !!(Z.bau && Z.bau.mbz);
    $("naechste-teil").hidden = !fertig;
    $("erweitert-7-mehr").hidden = !fertig || $("naechste-einheit").hidden;
    zeichneErgebnisWahl();
  }
  // Bildschirmfotos je Schritt aus katalog.yaml (oberflaeche.wiederherstellen_bilder, Dateien unter web/hilfe/); ohne
  // Einträge bleibt „Mit Bildern“ verborgen
  function whBilder() {
    var liste = (S.katalog && S.katalog.oberflaeche.wiederherstellen_bilder) || [], box = $("wh-bilder-liste");
    $("wh-bilder").hidden = !liste.length;
    if (!liste.length || box.childElementCount === liste.length) return;
    box.innerHTML = "";
    liste.forEach(function (b, i) {
      box.appendChild(el("figure", {}, [el("img", { src: "hilfe/" + b.datei, alt: b.text || "", loading: "lazy" }),
        el("figcaption", { cls: "leise", text: "Schritt " + (i + 1) })]));
    });
  }

  // AP13.15: Lizenz und KI-Hinweis im Kurs (Steckbrief kurs.lizenz, kurs.lizenz_name, kurs.ki_hinweis über
  // angaben_schreiben); jede Änderung macht den Bau ungültig, der nächste Klick auf „Herunterladen“ baut neu
  function zeichneKursangaben() {
    if (!S.katalog) return;
    var o = S.katalog.oberflaeche, a = S.angaben || {}, sel = $("k-lizenz");
    if (!sel.options.length) o.lizenz.forEach(function (w) { sel.appendChild(el("option", { value: w.wert,
        text: w.text })); });
    $("k-ki-text").textContent = "Hinweis im Kurs: „" + o.ki_hinweis + "“";
    var lizenz = a.lizenz || "", ki = a.ki_hinweis === "ja", teile = [];
    if (document.activeElement !== sel) sel.value = lizenz;
    $("k-ki").checked = ki;
    if (document.activeElement !== $("k-name")) $("k-name").value = a.lizenz_name || "";
    $("k-name-l").hidden = !lizenz;
    if (lizenz) teile.push(oberText("lizenz", lizenz));
    if (ki) teile.push("KI-Hinweis");
    $("kursangaben-stand").textContent = "Lizenz und KI-Hinweis im Kurs: " + (teile.join(", ") || "keine");
  }
  function kursangabe(a) {
    if (!Z.mappe) return;
    S.angabenSchreiben(a, false).then(function () {
      if (!("ki_hinweis" in a)) S.kursangabenMerken(S.angaben.lizenz, S.angaben.lizenz_name);
      zeichneKursangaben();
    });
  }
  $("k-ki").addEventListener("change", function () { kursangabe({ ki_hinweis: $("k-ki").checked ? "ja" : "nein" }); });
  $("k-lizenz").addEventListener("change", function () { kursangabe({ lizenz: $("k-lizenz").value }); });
  $("k-name").addEventListener("change", function () {
    kursangabe({ lizenz_name: $("k-name").value.replace(/\s+/g, " ").trim().slice(0, 80) }); });

  $("herunterladen").onclick = async function () {
    if (Z.bau && Z.bau.mbz) { herunterladen(); return; }
    S.bauLaeuft = true;
    knoepfe();
    status("Datei wird erstellt …", "lauf");
    try {
      var neu = nachlieferung(), opt = Object.assign({}, km.bauOptionen || {});
      if (neu.length) opt.optionen = Object.assign({}, opt.optionen || {}, { delta: neu.join(",") });
      await km.baue(opt);
      if (Z.bau) Z.bau.nachlieferung = neu.length ? neu : null;
      // Name beim Herunterladen wie die Kursdatei; in der Sicherung bleibt der Name des Generators
      if (Z.bau && Z.bau.mbz) Z.bau.downloadName = (await km.mappeFn("dateiname", [Z.mappe, heute()]))
          .replace(/\.kursmappe\.zip$/, neu.length ? "_nachlieferung.mbz" : ".mbz");
      S.bauLaeuft = false;
      if (Z.bau && Z.bau.mbz) {
        herunterladen(); status("Bereit", "ok");
        rueckmeldungBitteSpaeter();
        // AP13.12 a11: erster Download der Einheit, für die Minuten in der Rückmeldung
        if (Z.mappe && !Z.mappe.zeit_download) { Z.mappe.zeit_download = new Date().toISOString(); autosave(); }
      }
      else status("Die Datei ließ sich nicht erstellen.", "fehler");
      zeichneWiederherstellen(); knoepfe(); zeichneSchritte(); rueckmeldungFuellen();
      // AP13.33 §2.1: der Knopf war beim Bauen gesperrt (Fokus auf body); der Fokus kehrt zu ihm zurück
      S.fokusRetten(["herunterladen", "importiert-ja"]);
    } catch (e) { S.bauLaeuft = false; zeigeFehler(e); knoepfe(); S.fokusRetten(["herunterladen"]); }
  };
  function herunterladen() {
    var b = Z.bau; if (b && b.mbz) download(b.mbz, b.downloadName || b.dateiname, "application/vnd.moodle.backup");
  }
  $("glossar-laden").onclick = function () {
    var g = Z.bau && Z.bau.glossare;
    (g || []).forEach(function (x) { download(new TextEncoder().encode(x[1]), x[0], "application/xml"); });
  };
  $("importiert-ja").onclick = function () {
    if (!Z.mappe) return;
    var imp = Z.mappe.importiert || [], st = Z.mappe.importiert_stand = Z.mappe.importiert_stand || {};
    // nur neu importierte Einheiten bekommen ihren Stand; eine nach dem Import geänderte bleibt als geändert erkannt
    einheitenImKurs().forEach(function (e) { if (imp.indexOf(e) < 0) { imp.push(e); st[e] = einheitStand(e); } });
    Z.mappe.importiert = imp;
    // MF4: „Hat es geklappt? Ja“ zählt in der Rückmeldung als „Lief“
    rmErgebnis = "lief"; rmBearbeitet = false;
    zeichneWiederherstellen(); autosave(); rueckmeldungFuellen();
    S.fokus(["importiert-stand"], true);
  };
  // Nächste Einheit vorbereiten: Nummer, Teil „e<n>“, Bau ungültig, KI-Hinweis und Material gehören zur vorigen
  function naechsteEinheit() {
    var n = (Z.mappe.einheiten || einheitenImKurs().length) + 1;
    Z.mappe.einheiten = n;
    Z.mappe.anhaengen = "e" + n;
    Z.bau = null;
    if (S.angaben.ki_hinweis === "ja") kursangabe({ ki_hinweis: "nein" });   // AP13.15: je Einheit neu gesetzt
    delete Z.mappe.material;                      // AP13.19 §1: das Material gehört zur vorigen Einheit
  }
  $("naechste-einheit").onclick = function () {
    if (!Z.mappe) return;
    naechsteEinheit();
    $("f-thema").value = ""; $("f-minuten").value = (Z.mappe.einheit && Z.mappe.einheit.minuten) || 45;
    gehe(1, "f-thema");
    $("s1-titel").textContent = "Worum geht es in der nächsten Einheit?";
  };
  // AP13.30: „Weitere Einheit“ im Editor: derselbe Weg wie „Einheit hinzufügen“ und Schritt 1 (schritte.js
  // einheitAnhaengen), nur mit Thema und Dauer; Zielgruppe bzw. Jahrgangsstufe, Schulart, Aussehen, Lehrplan und Chat
  // bleiben die des Kurses. Die Schrittfolge springt nicht. -> Versprechen, erfüllt nach der Prüfung
  S.weitereEinheit = function (thema, minuten) {
    if (!Z.mappe) return Promise.resolve();
    var alt = Z.mappe.einheit || {};
    var e = { thema: thema, jahrgang: alt.jahrgang || "", minuten: minuten };
    if (alt.jahrgang_zuletzt) e.jahrgang_zuletzt = alt.jahrgang_zuletzt;
    naechsteEinheit();
    // AP13.35 §4.1: in „Ich steuere“ plant die Lehrkraft auch diese Einheit im Plan (derselbe Weg wie Schritt 2)
    return S.einheitAnhaengen(e, zweig() !== "steuer");
  };
  $("speichern").onclick = async function () {
    try {
      var m = await km.mappeSchreiben();
      download(m.zip, m.dateiname, "application/zip");
      $("autosave-stand").textContent = "Zwischenstand gespeichert " + zeit(Date.now());
      S.gespeichert = true;
      autosave();
      // Speichern schließt den laufenden Schritt ab, wenn er fertig ist: die Liste klappt zu, der nächste erscheint
      var s = schritt();
      if (s === 2 && zweig()) gehe(nachZwei());
      else if (s === 3) { Z.mappe.aussehen = true; gehe(4); }
      else if (s === 4 && Z.mappe.kopiert) gehe(5);
      else { S.aendern = null; zeichneSchritte(); }
    } catch (e) { zeigeFehler(e); }
  };
  $("neue-einheit").onclick = async function () {
    clearTimeout(S.autosaveTimer);
    if (Z.geladen && Z.mappe) { try { await km.autosaveSchreiben(); } catch (e) {
        /* Hinweis steht schon unter der Kursdatei */ } }
    leeren();
    weiterAnzeigen();
    // AP13.36 §1.1: der Knopf ist weg; der Fokus geht ins Feld „Thema“, am Handy auf die Überschrift (keine Tastatur)
    S.fokus(S.beruehrung() ? [document.querySelector("#start .s-kopf"), "f-thema"] : ["f-thema"], true);
  };
  function leeren() {
    delete $("rueckmeldung").dataset.offen; delete $("rueckmeldung").dataset.zu;
    Z.mappe = null; Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null;
        Z.bau = null; Z.vergleich = null; korrigieren = {}; gegenFuer = null; feldAuf = false;
    S.rueckgaengig = null; $("rueckgaengig").hidden = true; S.angaben = {};
    neuStart();
    $("f-thema").value = ""; $("f-jahrgang").value = ""; $("f-minuten").value = 45;
    $("f-schulart").value = S.schulartGemerkt();
    $("s1-titel").textContent = "Worum geht es?";
    S.gespeichert = false;
    zeichne();
    window.scrollTo(0, 0);
  }

  // Rückmeldung: Version, Chat, Fach, Jahrgangsstufe (ohne Lehrplanbezug die Zahl aus dem Feld, sonst nur „nein“),
  // Vorlage und Weg; seit AP13.12 a11 dazu Ergebnis (Knopf in Schritt 7), importiert, Minuten von Schritt 1 bis zum
  // Download (mappe.zeit_start, zeit_download) und Korrekturrunden der laufenden Einheit; keine Inhalte, kein Thema,
  // keine Namen. Was die Lehrkraft in „Was ist passiert?“ und „Fehlermeldung“ schreibt, steht darunter.
  var ERGEBNIS = { lief: "Lief", gehakt: "Hat gehakt", abgebrochen: "Abgebrochen" }, rmErgebnis = "";
  function minutenBisDatei(m) {
    var a = Date.parse(m.zeit_start || ""), b = Date.parse(m.zeit_download || "");
    return a && b && b >= a ? Math.round((b - a) / 60000) : null;
  }
  // AP13.34 §5: Ereignisse „neu.auftrag“ sind Aufträge für neue oder neu geschriebene Karten, keine Korrekturen einer
  // Antwort; ohne echte Korrektur stehen weder „Korrekturrunden“ noch „Korrekturen“ im Rückmeldungstext
  function echteKorrekturen(m) {
    return ((m && m.korrekturen) || []).filter(function (x) { return x.regel !== "neu.auftrag"; });
  }
  function runden(m) {
    var tag = S.einheitTag();
    return echteKorrekturen(m).filter(function (x) { return (x.einheit || "") === tag; })
      .reduce(function (n, x) { return Math.max(n, x.runde || 0); }, 0);
  }
  function rueckmeldungText() {
    var m = Z.mappe || {}, e = m.einheit || {}, c = chatInfo(m.chat), min = minutenBisDatei(m);
    var ohneLp = S.angaben.lehrplanbezug === "nein", jg = ohneLp ? S.jahrgangZahl(e.jahrgang || S.angaben.jahrgang) :
        e.jahrgang || S.angaben.jahrgang;
    var echt = echteKorrekturen(m).length > 0;
    var imp = einheitenImKurs().every(function (x) { return (m.importiert || []).indexOf(x) >= 0; });
    var frei = rmErgebnis && rmErgebnis !== "lief" ? ["Was ist passiert?", $("rm-passiert").value.trim(), "",
      "Fehlermeldung der Plattform:", $("rm-meldung").value.trim(), ""] : [];
    return ["Rückmeldung zu Kursmühle " + ((S.katalog && S.katalog.version) || ""), "",
      // AP13.35 §4.3: „ja“ erst, wenn die Lehrkraft es bestätigt hat; vorher weiß die Mühle es nicht
      "Ergebnis: " + (ERGEBNIS[rmErgebnis] || "–"), "Importiert: " + (Z.mappe && imp ? "ja" : "–"),
      "Minuten bis zur Datei: " + (min === null ? "–" : min)]
      .concat(echt ? ["Korrekturrunden: " + runden(m)] : [], [
      "Chat: " + (c ? (m.chat === "eigene" && S.kiName ? S.kiName() : c.text) : "–"), "Fach: " + (S.angaben.fach || "–"),
      ohneLp && !jg ? "Lehrplanbezug: nein" : "Jahrgangsstufe: " + (jg || "–"),
      // AP13.35 §4.3: die Vorlage nur, wenn eine gewählt wurde; ein eigener Plan heißt so
      "Vorlage: " + (S.eigenerPlan() ? S.editorText("eigener_plan") : S.vorlageGewaehlt() && e.vorlage || "–") +
          (m.zweig ? " (" + ZWEIG_TEXT[m.zweig] + ")" : "")], echt ? [korrekturZeile(m)] : [],
      [""], frei, ["Wo hat es gestockt?", "", "", "Was hättest du anders gewollt?", "", "",
          "Nimmst du es für deine nächste Einheit wieder? Wenn nicht, woran liegt es?", "", ""]).join("\n");
  }
  // „Korrekturen: 2 · mindest.quiz, zeit.annahme · Chat: ByLKI“ aus den Ereignissen der Kursmappe
  function korrekturZeile(m) {
    var k = echteKorrekturen(m);
    var regeln = k.map(function (x) { return x.regel; }).filter(function (r, i, a) { return r && a.indexOf(r) === i; });
    var chats = k.map(function (x) { return x.chat; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
    return "Korrekturen: " + k.length + (regeln.length ? " · " + regeln.join(", ") : "") + (chats.length ? " · Chat: " +
        chats.join(", ") : "");
  }
  var rmBearbeitet = false;
  function rueckmeldungFuellen() {
    if (!rmBearbeitet) $("rm-text").value = rueckmeldungText();
    mailAdresse();
  }
  $("rm-text").addEventListener("input", function () { rmBearbeitet = true; mailAdresse(); });
  // „Per Mail senden“: mailto mit Betreff und Text; Mailprogramme nehmen lange Adressen nicht, darüber wird der Text
  // gekürzt („Text kopieren“ bleibt vollständig)
  var MAIL_MAX = 1800;
  function mailAdresse() {
    var betreff = "Rückmeldung Kursmühle " + ((S.katalog && S.katalog.version) || "") + (rmErgebnis ? " · " +
        ERGEBNIS[rmErgebnis] : ""), text = $("rm-text").value, n = text.length;
    var adresse = function (t) { return "mailto:kursmuehle@pm.me?subject=" + encodeURIComponent(betreff) + "&body=" +
        encodeURIComponent(t); }, url = adresse(text);
    while (url.length > MAIL_MAX && n > 0) {
      n = Math.max(0, n - 100);
      url = adresse(text.slice(0, n) + "\n… (gekürzt; den ganzen Text kopierst du mit „Text kopieren“)");
    }
    $("rm-mail").href = url;
  }
  // Rückmeldung mit einem Klick (AP13.12 a11): drei Knöpfe nach „Importiert?“; „Hat gehakt“ und „Abgebrochen“ zeigen
  // die zwei Felder
  // MF4 (Konzept §3.8): „Hat es geklappt?“ mit „Ja“ (importiert-ja) und „Nein, es hakt“; „Nein“ öffnet die Rückmeldung
  // mit den Feldern für das, was passiert ist, und die Fehlermeldung der Plattform
  function zeichneErgebnisWahl() {
    $("geklappt-nein").setAttribute("aria-pressed", String(rmErgebnis === "gehakt"));
    $("rm-felder").hidden = !rmErgebnis || rmErgebnis === "lief";
  }
  $("geklappt-nein").onclick = function (ev) {
    var b = ev.target.closest("[data-ergebnis]");
    if (!b) return;
    rmErgebnis = b.dataset.ergebnis;
    rmBearbeitet = false;
    zeichneErgebnisWahl();
    rueckmeldungOeffnen();
    if (rmErgebnis !== "lief") $("rm-passiert").focus({ preventScroll: true });
  };
  ["rm-passiert", "rm-meldung"].forEach(function (id) { $(id).addEventListener("input", rueckmeldungFuellen); });
  // AP13.36 §1.4: der Bereich lässt sich schließen (Knopf „Schließen“ und Esc); der Fokus geht zurück an die Stelle, die
  // ihn geöffnet hat (`rmDavor`), sonst zu einem der Links
  var rmDavor = null;
  function rueckmeldungOeffnen() {
    var a = document.activeElement, sec = $("rueckmeldung");
    if (a && a !== document.body && !sec.contains(a) && !a.closest("dialog")) rmDavor = a;
    delete sec.dataset.zu;
    sec.dataset.offen = "1";
    rueckmeldungFuellen();
    zeichneSchritte();
    sec.scrollIntoView({ block: "start" });
    $("rm-text-kopieren").focus({ preventScroll: true });
  }
  function rueckmeldungSchliessen() {
    var sec = $("rueckmeldung"), davor = rmDavor;
    rmDavor = null;
    delete sec.dataset.offen; sec.dataset.zu = "1";
    zeichneSchritte();
    S.fokus([davor, "rueckmeldung-auf", "fuss-rueckmeldung"]);
  }
  $("rm-zu").onclick = rueckmeldungSchliessen;
  $("rueckmeldung").addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !ev.defaultPrevented) { ev.preventDefault(); rueckmeldungSchliessen(); }
  });
  $("rueckmeldung-auf").onclick = rueckmeldungOeffnen;
  $("fuss-rueckmeldung").onclick = rueckmeldungOeffnen;
  $("rm-mail").addEventListener("click", function () { bitteMerken({ nie: true }); });
  $("rm-text-kopieren").addEventListener("click", function () { bitteMerken({ nie: true }); });
  $("rm-text-kopieren").onclick = function () {
    kopieren($("rm-text").value, $("rm-text"), $("rm-stand"),
        "Kopiert. Füge den Text in eine Mail an kursmuehle@pm.me ein und ergänze die drei Antworten.");
  };
  $("rm-adresse-kopieren").onclick = function () {
    kopieren("kursmuehle@pm.me", $("rm-adresse-feld"), $("rm-stand"), "Adresse kopiert.");
  };

  // Bitte um Rückmeldung (AP13.23, Testphase): nach dem Download, höchstens einmal je Kalendertag, nur bis zum Datum
  // oberflaeche.rueckmeldung_bitte_bis und nie mehr nach „Text kopieren“, „Per Mail senden“ oder „Nicht mehr fragen“.
  // Gemerkt wird nur im Browser: { zuletzt: "JJJJ-MM-TT", nie: true }; die Bitte wird nirgends gezählt.
  var BITTE = km.speicher("kursmuehle-rueckmeldung-bitte");
  function bitteLesen() {
    try { return JSON.parse(localStorage.getItem(BITTE)) || {}; } catch (e) { return {}; }
  }
  function bitteMerken(neu) {
    try { localStorage.setItem(BITTE, JSON.stringify(Object.assign(bitteLesen(), neu))); } catch (e) { /* ohne Speicher */ }
  }
  function tagHeute() {
    var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }
  function bitteFrist() {
    var bis = S.katalog && S.katalog.oberflaeche.rueckmeldung_bitte_bis;
    return /^\d{4}-\d{2}-\d{2}$/.test(bis || "") ? bis : "";
  }
  var bitteDavor = null;
  function bitteSchliessen(zurueck) {
    var d = $("rm-bitte");
    if (d.open) d.close();
    if (zurueck && bitteDavor && document.contains(bitteDavor) && !bitteDavor.disabled && !bitteDavor.hidden) {
      bitteDavor.focus({ preventScroll: true });
    }
    bitteDavor = null;
  }
  function rueckmeldungBitteSpaeter() {
    setTimeout(function () {     // der Speichern-Dialog des Browsers soll zuerst kommen
      var d = $("rm-bitte"), bis = bitteFrist(), m = bitteLesen(), heute = tagHeute();
      if (!bis || heute > bis || m.nie || m.zuletzt === heute || d.open || $("hinweis-aufbau").open || typeof d.showModal !== "function") return;
      bitteMerken({ zuletzt: heute });
      // während des Bauens ist der Knopf gesperrt und verliert den Fokus; dann kehrt er zum Knopf zurück
      bitteDavor = document.activeElement && document.activeElement !== document.body ? document.activeElement : $("herunterladen");
      d.showModal();
      $("rm-bitte-geben").focus({ preventScroll: true });
    }, 1500);
  }
  $("rm-bitte-geben").onclick = function () { bitteSchliessen(false); rueckmeldungOeffnen(); };
  $("rm-bitte-spaeter").onclick = function () { bitteSchliessen(true); };
  $("rm-bitte-nie").onclick = function () { bitteMerken({ nie: true }); bitteSchliessen(true); };
  $("rm-bitte").addEventListener("click", function (ev) { if (ev.target === ev.currentTarget) bitteSchliessen(true); });
  $("rm-bitte").addEventListener("cancel", function () {   // Escape wirkt wie „Später“
    setTimeout(function () { bitteSchliessen(true); }, 0);
  });

  // Hinweis „noch im Aufbau“ (AP13.32): beim Laden von start/, sobald der Katalog da ist, außer der Browser hat „Nicht mehr
  // anzeigen“ gemerkt (Wert `aus`; unter beta/ mit dem Zusatz -beta). Ohne localStorage kommt er bei jedem Laden. Wartet,
  // wenn die Bitte um Rückmeldung offen ist; die Bitte kommt nicht, solange der Hinweis offen ist.
  var HINWEIS = km.speicher("kursmuehle-hinweis-aufbau");
  function hinweisAus() {
    try { return localStorage.getItem(HINWEIS) === "aus"; } catch (e) { return false; }
  }
  function hinweisSchliessen(zurueck) {
    var d = $("hinweis-aufbau");
    if ($("hinweis-aufbau-nie").checked) {
      try { localStorage.setItem(HINWEIS, "aus"); } catch (e) { /* ohne Speicher */ }
    }
    if (d.open) d.close();
    // AP13.33 §2.1: ohne Stelle davor (Seite gerade geladen) auf das erste Feld oder „Weiter mit …“
    if (zurueck) S.fokus([hinweisDavor, "weiter-knopf", "f-thema", "kopf-menue"], true);
    hinweisDavor = null;
  }
  var hinweisDavor = null;
  function hinweisZeigen() {
    var h = S.katalog && S.katalog.oberflaeche.hinweis_aufbau, d = $("hinweis-aufbau");
    if (!h || hinweisAus() || d.open || $("rm-bitte").open || typeof d.showModal !== "function") return;
    $("hinweis-aufbau-titel").textContent = h.titel;
    $("hinweis-aufbau-text").textContent = km.kanal === "beta" ? h.text_beta : h.text;
    $("hinweis-aufbau-geben").textContent = h.rueckmeldung;
    $("hinweis-aufbau-zu").textContent = h.schliessen;
    $("hinweis-aufbau-nie-text").textContent = h.nicht_mehr;
    $("hinweis-aufbau-nie").checked = false;
    hinweisDavor = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    d.showModal();
    $("hinweis-aufbau-geben").focus({ preventScroll: true });
  }
  $("hinweis-aufbau-geben").onclick = function () { hinweisSchliessen(false); rueckmeldungOeffnen(); };
  $("hinweis-aufbau-zu").onclick = function () { hinweisSchliessen(true); };
  $("hinweis-aufbau").addEventListener("click", function (ev) { if (ev.target === ev.currentTarget) hinweisSchliessen(true); });
  $("hinweis-aufbau").addEventListener("cancel", function () {   // Escape wirkt wie „Schließen“
    // „Nicht mehr anzeigen“ sofort merken: der Dialog ist zu, bevor die Aufgabe unten läuft
    if ($("hinweis-aufbau-nie").checked) { try { localStorage.setItem(HINWEIS, "aus"); } catch (e) { /* ohne Speicher */ } }
    setTimeout(function () { hinweisSchliessen(true); }, 0);
  });

  // Erst wenn alle Skripte der Seite geladen sind: Pyodide, Katalog und Hinweise laden, Adresse lesen, zeichnen
  function starten() {
    ladenStarten();
    weiterAnzeigen();
    adresseLesen();
    schemaZeigen();
    rueckmeldungFuellen();
    zeichne();
    if (S.katalogDa) S.katalogDa.then(hinweisZeigen);
  }
  Object.assign(S, { leeren: leeren, rueckmeldungFuellen: rueckmeldungFuellen, rueckmeldungOeffnen: rueckmeldungOeffnen,
    zeichneKursangaben: zeichneKursangaben, zeichneFragen: zeichneFragen, zeichneGegen: zeichneGegen,
    zeichneWiederherstellen: zeichneWiederherstellen });
  starten();
})();
