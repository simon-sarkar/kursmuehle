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
  function zeichneFragen() {
    var ol = $("fragen-liste"); ol.innerHTML = "";
    $("fragen-zeile").textContent = S.fragenListe.length
      ? S.fragenListe.length + " Fragen mit ihren Lösungen, ohne Rückmeldungen. Prüfe, ob jede Lösung stimmt." : "";
    var letzter = null;
    S.fragenListe.forEach(function (f) {
      var kopf = f.baustein !== letzter ? el("p", { cls: "f-baustein" }, [el("button", { type: "button",
          cls: "hinweis-link", "data-ziel": f.baustein, text: f.titel })]) : null;
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
      ol.appendChild(el("li", { cls: "frage" }, [kopf, el("p", { cls: "f-frage", text: (f.art === "rf" ?
          "Richtig oder falsch: " : "") + f.frage }), optionen, loesung]));
    });
    zeichneGegen();
  }
  $("fragen-liste").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) zuKarte(z.dataset.ziel);
      };
  function durchgesehen() {
    if (!Z.mappe) return;
    Z.mappe.durchsicht = true; delete Z.mappe.durchsicht_neu;
    geaendert(); gehe(7, "herunterladen");
  }
  // AP13.33 §1.4: aus dem Schritt Datei zurück zu den Fragen, die sich geändert haben
  $("zu-durchsicht").onclick = function () { if (Z.mappe) gehe(6, ersteWahl()); };
  // §2.3: der Schritt beginnt bei der Wahl des Wegs (der gewählten, sonst der ersten Kachel), nicht beim Hauptknopf
  function ersteWahl() {
    var w = $("durchsicht-wahl").querySelector("[aria-checked=true]:not([hidden])") ||
        $("durchsicht-wahl").querySelector("[data-weg]:not([hidden])");
    return w && S.fragenListe.length ? w.id : "durchsicht-ok";
  }
  $("durchsicht-ok").onclick = function () { if (!$("durchsicht-ok").disabled) durchgesehen(); };
  $("ohne-durchsicht").onclick = durchgesehen;
  function nachBildern() {
    if (S.fragenListe.length && !Z.mappe.durchsicht) gehe(6, ersteWahl()); else gehe(7, "herunterladen");
  }
  $("weiter-5").onclick = function () {
    if (!Z.mappe) return;
    // Schritt Bilder nur, wenn er sichtbar ist: Bildwünsche trotz „keine“ (Standard seit AP13.12 a2) führen weiter
    if (S.sichtbareSchritte().indexOf(5.5) >= 0) gehe(5.5); else nachBildern();
  };
  $("weiter-bilder").onclick = function () { if (Z.mappe) nachBildern(); };

  // Schritt 6 (AP13.5g): erst der Weg (meine KI, ein neuer Chat, ich selbst), dann nur dessen Teil. Beim Gegenprüfen
  // löst ein neues Gespräch die Aufgaben ohne Lösungen; je Abweichung drei Wege: korrigieren lassen (Bitte je Baustein in
  // das Gespräch der Einheit, Antwort in Schritt 5), „Meine Lösung gilt“, „Übergehen“. Die Entscheidungen stehen in der
  // Mappe (`durchsicht_entschieden`, Schlüssel „id|Nummer im Baustein“) mit dem Hash des Bausteins und fallen weg, sobald
  // sich der Baustein ändert.
  var korrigieren = {};             // Schlüssel -> true: Abweichungen, für die eine Bitte gesammelt wird (nicht in der Mappe)
  var gegenFuer = null;             // Prüfung, zu der Z.vergleich gehört
  function stil() {
    if ($("stil-durchsicht")) return;
    document.head.appendChild(el("style", { id: "stil-durchsicht", text: [
      ".durchsicht-wahl { margin: 6px 0 14px; }",
      ".durchsicht-wahl .aus-kachel { width: 220px; justify-content: flex-start; text-align: left; padding: 10px 12px; }",
      ".durchsicht-wahl .aus-kachel .aus-name { justify-content: flex-start; }",
      ".durchsicht-wahl .aus-zeile { font-size: 0.82rem; font-weight: 400; color: var(--leise); }",
      "@media (max-width: 520px) { .durchsicht-wahl .aus-kachel { width: 100%; } }",
      ".gegen-ergebnis li.abw { margin: 0 0 8px; padding: 10px 12px; border: 1px solid var(--linie); border-left-width: 4px;",
      "  border-left-color: var(--fehler); border-radius: 8px; background: var(--flaeche); }",
      ".gegen-ergebnis li.abw.gilt { border-left-color: var(--ok); }",
      ".gegen-ergebnis li.abw.uebergangen { border-left-color: var(--leer); background: var(--grund); }",
      ".gegen-ergebnis li.abw.korrigieren { border-left-color: var(--ocker); }",
      ".abw p { margin: 0 0 4px; }",
      ".abw-marke { font-weight: 600; }",
      ".abw.gilt .abw-marke { color: var(--ok); }",
      ".abw.uebergangen .abw-marke, .abw.uebergangen .abw-frage { color: var(--leise); }",
      ".abw-wege { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }",
      ".abw-wege [aria-pressed=true] { box-shadow: inset 0 0 0 2px var(--text); }",
      ".abw-luecke .klein-knopf { margin-left: 8px; }",
      ".gegen-gleich { margin-top: 10px; font-size: 0.93rem; }",
      ".gegen-gleich summary { cursor: pointer; color: var(--link); padding: 4px 0; }",
      ".gegen-gleich ul { margin: 4px 0 0; padding-left: 20px; }"
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
    return w === "ki" && !kiAktiv() ? "" : w || "";
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
  // „Lösungen stimmen, weiter“: bei KI und Chat erst mit Ergebnis und ohne offene Abweichung, sonst sofort
  function frei() {
    var w = weg(), o = offen();
    return !S.fragenListe.length || (w !== "ki" && w !== "chat") || (!!o && !o.length);
  }
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
      ul.appendChild(el("li", {}, [o.text, o.baustein ? el("span", { cls: "leise", text: " · " }) : null,
        o.baustein ? el("button", { type: "button", cls: "hinweis-link", "data-ziel": o.baustein, text: o.titel ||
            o.baustein }) : null]));
    });
    $("offen-kasten").hidden = !zeilen.length;
  }
  $("offen-liste").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) zuKarte(z.dataset.ziel); };
  function zeichneGegen() {
    if (!Z.mappe) return;
    stil();
    zeichneOffen();
    bereinigen();
    var n = S.fragenListe.length, w = weg(), ki = kiAktiv();
    $("durchsicht-satz").textContent = n ? (n === 1 ? "Eine Frage" : n + " Fragen") + " mit Lösungen. Wie prüfst du, " +
        "ob die Lösungen stimmen?" : "In dieser Einheit stehen noch keine Fragen.";
    $("durchsicht-wahl").hidden = !n;
    var neuSatz = S.durchsichtNeuText ? S.durchsichtNeuText() : "";
    $("durchsicht-neu").textContent = neuSatz; $("durchsicht-neu").hidden = !neuSatz;
    $("weg-ki").hidden = !ki;
    Array.prototype.forEach.call($("durchsicht-wahl").querySelectorAll("[data-weg]"), function (b) {
      b.setAttribute("aria-checked", String(b.dataset.weg === w));
    });
    $("weg-selbst-teil").hidden = !n || w !== "selbst";
    $("gegenpruefen").hidden = !n || (w !== "ki" && w !== "chat");
    $("gegen-ki").hidden = w !== "ki";
    $("gegen-chat").hidden = w !== "chat";
    $("gegen-senden").disabled = !$("gegen-text-feld").value || S.kiBesetzt();
    // neue Prüfung (Korrektur eingesetzt, Mappe neu geladen): die Antwort im Feld gegen die neuen Lösungen
    if (Z.pruefung && gegenFuer !== Z.pruefung && $("gegen-antwort").value.trim()) gegenpruefen();
    zeichneErgebnis();
    $("durchsicht-ok").disabled = !frei();
  }
  function zeichneErgebnis() {
    var ul = $("gegen-ergebnis"), v = vergleichJetzt(), e = entschieden(), ki = weg() === "ki";
    ul.innerHTML = "";
    $("gegen-gleich").hidden = !v || !v.gleich.length;
    if (!v) { $("gegen-korrektur-teil").hidden = true; if (!$("gegen-antwort").value.trim()) $("gegen-stand")
        .textContent = ""; return; }
    var n = v.abweichungen.length, o = offen().length;
    $("gegen-stand").textContent = (n ? n + (n === 1 ? " Abweichung" : " Abweichungen") + " bei " + v.geprueft +
        " Aufgaben" + (o ? "; entscheide je Abweichung, wie es weitergeht." : ", alle entschieden.")
      : "Keine Abweichung bei " + (v.geprueft - v.fehlend.length) + " Aufgaben.")
      + (v.fehlend.length ? " Ohne Antwort: " + v.fehlend.join(", ") + "." : "");
    $("gegen-stand").className = "stand " + (o ? "fehler" : "ok");
    v.abweichungen.forEach(function (a) {
      var k = schluessel(a), ent = (e[k] || {}).wert, korr = !ent && !!korrigieren[k];
      var knopf = function (aktion, text, an) {
        return el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": aktion, "data-key": k,
          "aria-pressed": String(an), text: text });
      };
      var marke = ent === "gilt" ? "Deine Lösung gilt" : ent === "uebergangen" ? "Übergangen" : korr ?
          "Wird korrigiert" : "";
      // AP13.5h a9: bei Lücken nur die abweichenden, mit allen erlaubten Lösungen; „Als weitere Lösung zulassen“
      // schreibt die Antwort in die Kursdatei, bei mehreren Lücken je Lücke
      var zulassen = function (nr) {
        return el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": "zulassen", "data-key": k,
          "data-luecke": nr, text: "Als weitere Lösung zulassen" });
      };
      var mehrere = !!(a.luecken && a.luecken.length > 1);
      var loesungen = a.luecken && a.luecken.length ? a.luecken.map(function (l) {
        return el("p", { cls: "abw-luecke" }, ["Lücke " + l.nr + ": ",
          el("span", { cls: "leise", text: "laut Kursdatei " }), l.kursdatei.join(" oder "), ", ",
          el("span", { cls: "leise", text: ki ? "deine KI " : "der Chat " }), l.chat,
          a.zulassen && mehrere ? zulassen(l.nr) : null]);
      }) : [el("p", {}, [el("span", { cls: "leise", text: "Lösung laut Kursdatei: " }), a.kursdatei]),
        el("p", {}, [el("span", { cls: "leise", text: (ki ? "Antwort deiner KI: " : "Antwort des Chats: ") }),
          a.chat_anzeige || a.chat])];
      ul.appendChild(el("li", { cls: "abw" + (ent ? " " + ent : korr ? " korrigieren" : ""), "data-key": k }, [
        el("p", {}, [el("button", { type: "button", cls: "hinweis-link", "data-ziel": a.baustein,
            text: "Aufgabe " + a.nr + " in „" + a.titel + "“" }), marke ? el("span", { cls: "abw-marke",
            text: " · " + marke }) : null]),
        el("p", { cls: "abw-frage", text: a.frage })].concat(loesungen, [
        el("div", { cls: "abw-wege" }, [knopf("korrigieren", "Aufgabe korrigieren lassen", korr),
          knopf("gilt", "Meine Lösung gilt", ent === "gilt"), knopf("uebergehen", "Übergehen", ent === "uebergangen"),
          a.zulassen && !mehrere ? zulassen(a.luecken && a.luecken.length ? a.luecken[0].nr : 1) : null])
      ])));
    });
    var gl = $("gegen-gleich-liste"); gl.innerHTML = "";
    $("gegen-gleich-titel").textContent = v.gleich.length === 1 ? "1 Aufgabe stimmt" : v.gleich.length +
        " Aufgaben stimmen";
    v.gleich.forEach(function (g) { gl.appendChild(el("li", { text: "Aufgabe " + g.nr + " in „" + g.titel + "“: " +
        g.kursdatei })); });
    var bitte = bitteText();
    $("gegen-korrektur-teil").hidden = !bitte;
    $("gegen-korrektur").textContent = kiAktiv() ? "Korrekturen an meine KI senden" : "Korrekturen kopieren";
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
  $("durchsicht-wahl").onclick = function (ev) {
    var b = ev.target.closest("[data-weg]");
    if (!b || !Z.mappe) return;
    Z.mappe.durchsicht_weg = b.dataset.weg;
    autosave();
    zeichneGegen();
    // AP13.33 §2.3: bei „Ich prüfe selbst“ auf die erste Frage (im Bild), sonst auf den Knopf des Wegs
    var erste = b.dataset.weg === "selbst" && $("fragen-liste").querySelector("li");
    if (erste) { erste.tabIndex = -1; erste.scrollIntoView({ block: "nearest" }); erste.focus({ preventScroll: true }); return; }
    var f = { ki: "gegen-senden", chat: "gegen-kopieren", selbst: "durchsicht-ok" }[b.dataset.weg];
    if ($(f) && !$(f).disabled) $(f).focus({ preventScroll: true });
  };
  $("gegen-kopieren").onclick = function () {
    kopieren($("gegen-text-feld").value, $("gegen-text-feld"), $("gegen-kopiert"),
        "Jetzt in einen neuen Chat einfügen, die Antwort hier unten einfügen.");
  };
  // Eigene KI verbunden: ein neues Gespräch löst die Aufgaben blind; die Antwort landet im Feld wie eingefügt
  $("gegen-senden").onclick = function () {
    var text = $("gegen-text-feld").value;
    if (!text) return;
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
    if (!text.trim() || !pr) { Z.vergleich = null; $("gegen-stand").textContent = ""; zeichneGegen(); return; }
    try {
      var v = await km.prompt("vergleich", [pr, text]);
      if (pr !== Z.pruefung) return;               // inzwischen neu geprüft; zeichneGegen vergleicht noch einmal
      Z.vergleich = v;
      zeichneGegen();
    } catch (e) { zeigeFehler(e); }
  }
  $("gegen-ergebnis").onclick = function (ev) {
    var z = ev.target.closest("[data-ziel]");
    if (z) { zuKarte(z.dataset.ziel); return; }
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
    var neu = $("gegen-ergebnis").querySelector("[data-key='" + CSS.escape(k) + "'][data-aktion='" +
        b.dataset.aktion + "']");
    if (neu) neu.focus({ preventScroll: true });
  };
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
        "Kopiert. Füge die Bitte in das Gespräch dieser Einheit ein und die Antwort in Schritt 5.", function () {
      korrigieren = {};
      gehe(5, "eingabe");
      S.standKarte($("eingabe-stand"), "Füge hier die Antwort des Chats auf die Korrekturen aus Schritt 6 ein.", "ok");
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

  function zeichneWiederherstellen() {
    var ol = $("wh-schritte"); ol.innerHTML = "";
    var delta = Z.bau && Z.bau.nachlieferung;
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
    $("importiert-stand")
        .textContent = "Vermerkt. Die nächste Einheit wird als Nachlieferung erstellt und mit „Den gesicherten Kurs " +
        "mit diesem Kurs verschmelzen“ eingespielt.";
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
    var imp = Z.mappe.importiert || [];
    einheitenImKurs().forEach(function (e) { if (imp.indexOf(e) < 0) imp.push(e); });
    Z.mappe.importiert = imp;
    zeichneWiederherstellen(); autosave();
    $("naechste-einheit").focus();
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
    return S.einheitAnhaengen(e, true);
  };
  $("speichern").onclick = async function () {
    try {
      var m = await km.mappeSchreiben();
      download(m.zip, m.dateiname, "application/zip");
      $("autosave-stand").textContent = "Einheit gespeichert um " + zeit(Date.now());
      S.gespeichert = true;
      autosave();
      // Speichern schließt den laufenden Schritt ab, wenn er fertig ist: die Liste klappt zu, der nächste erscheint
      var s = schritt();
      if (s === 2 && zweig()) gehe(nachZwei());
      else if (s === 3) { Z.mappe.aussehen = true; gehe(4); }
      else if (s === 4 && Z.mappe.kopiert) gehe(5);
      else { S.auf = {}; zeichneSchritte(); }
    } catch (e) { zeigeFehler(e); }
  };
  $("neue-einheit").onclick = async function () {
    clearTimeout(S.autosaveTimer);
    if (Z.geladen && Z.mappe) { try { await km.autosaveSchreiben(); } catch (e) {
        /* Hinweis steht schon unter der Kursdatei */ } }
    leeren();
    weiterAnzeigen();
  };
  function leeren() {
    Z.mappe = null; Z.kurs_md = ""; Z.steckbrief_text = ""; Z.assets = {}; Z.pruefung = null; Z.kennzahlen = null;
        Z.bau = null; Z.vergleich = null; korrigieren = {}; gegenFuer = null;
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
      "Ergebnis: " + (ERGEBNIS[rmErgebnis] || "–"), "Importiert: " + (Z.mappe && imp ? "ja" : "nein"),
      "Minuten bis zur Datei: " + (min === null ? "–" : min)]
      .concat(echt ? ["Korrekturrunden: " + runden(m)] : [], [
      "Chat: " + (c ? (m.chat === "eigene" && S.kiName ? S.kiName() : c.text) : "–"), "Fach: " + (S.angaben.fach || "–"),
      ohneLp && !jg ? "Lehrplanbezug: nein" : "Jahrgangsstufe: " + (jg || "–"),
      "Vorlage: " + (e.vorlage || "–") + (m.zweig ? " (" + ZWEIG_TEXT[m.zweig] + ")" : "")], echt ? [korrekturZeile(m)] : [],
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
  function zeichneErgebnisWahl() {
    Array.prototype.forEach.call($("ergebnis-wahl").querySelectorAll("[data-ergebnis]"), function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.ergebnis === rmErgebnis));
    });
    $("rm-felder").hidden = !rmErgebnis || rmErgebnis === "lief";
  }
  $("ergebnis-wahl").onclick = function (ev) {
    var b = ev.target.closest("[data-ergebnis]");
    if (!b) return;
    rmErgebnis = b.dataset.ergebnis;
    rmBearbeitet = false;
    zeichneErgebnisWahl();
    rueckmeldungOeffnen();
    if (rmErgebnis !== "lief") $("rm-passiert").focus({ preventScroll: true });
  };
  ["rm-passiert", "rm-meldung"].forEach(function (id) { $(id).addEventListener("input", rueckmeldungFuellen); });
  function rueckmeldungOeffnen() {
    $("rueckmeldung").dataset.offen = "1";
    rueckmeldungFuellen();
    zeichneSchritte();
    $("rueckmeldung").scrollIntoView({ block: "start" });
    $("rm-text-kopieren").focus({ preventScroll: true });
  }
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
