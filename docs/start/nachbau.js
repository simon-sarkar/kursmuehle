/* Kursmühle – Fragen und Lösungen, Gegenprüfen, Datei herunterladen, nächste Einheit, Rückmeldung.
 * Startet die Seite, wenn alle Skripte geladen sind. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, ZWEIG_TEXT = S.ZWEIG_TEXT, adresseLesen = S.adresseLesen, autosave = S.autosave,
      bildwuensche = S.bildwuensche, chatInfo = S.chatInfo, download = S.download, el = S.el, geaendert = S.geaendert,
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
  function durchgesehen() { if (Z.mappe) { Z.mappe.durchsicht = true; geaendert(); gehe(7, "herunterladen"); } }
  $("durchsicht-ok").onclick = function () { if (!$("durchsicht-ok").disabled) durchgesehen(); };
  $("ohne-durchsicht").onclick = durchgesehen;
  function nachBildern() {
    if (S.fragenListe.length && !Z.mappe.durchsicht) gehe(6, "durchsicht-ok"); else gehe(7, "herunterladen");
  }
  $("weiter-5").onclick = function () {
    if (!Z.mappe) return;
    if (bildwuensche().length) gehe(5.5); else nachBildern();
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
  function zeichneGegen() {
    if (!Z.mappe) return;
    stil();
    bereinigen();
    var n = S.fragenListe.length, w = weg(), ki = kiAktiv();
    $("durchsicht-satz").textContent = n ? (n === 1 ? "Eine Frage" : n + " Fragen") + " mit Lösungen. Wie prüfst du, " +
        "ob die Lösungen stimmen?" : "In dieser Einheit stehen noch keine Fragen.";
    $("durchsicht-wahl").hidden = !n;
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
      ul.appendChild(el("li", { cls: "abw" + (ent ? " " + ent : korr ? " korrigieren" : ""), "data-key": k }, [
        el("p", {}, [el("button", { type: "button", cls: "hinweis-link", "data-ziel": a.baustein,
            text: "Aufgabe " + a.nr + " in „" + a.titel + "“" }), marke ? el("span", { cls: "abw-marke",
            text: " · " + marke }) : null]),
        el("p", { cls: "abw-frage", text: a.frage }),
        el("p", {}, [el("span", { cls: "leise", text: "Lösung laut Kursdatei: " }), a.kursdatei]),
        el("p", {}, [el("span", { cls: "leise", text: (ki ? "Antwort deiner KI: " : "Antwort des Chats: ") }),
          a.chat_anzeige || a.chat]),
        el("div", { cls: "abw-wege" }, [knopf("korrigieren", "Aufgabe korrigieren lassen", korr),
          knopf("gilt", "Meine Lösung gilt", ent === "gilt"), knopf("uebergehen", "Übergehen", ent === "uebergangen")])
      ]));
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
    var schritte = [
      "Öffne deinen Kurs auf der ByCS-Lernplattform: Mehr → Kurs wiederherstellen. Zieh die Datei in das Feld " +
          "„Datei“ und klicke „Wiederherstellen“, dann „Weiter“.",
      delta ? "Ziel: „In diesen Kurs wiederherstellen“ mit „Zusammenführen“. Die neue Einheit kommt hinten an; was " +
          "schon im Kurs ist, bleibt."
        : "Ziel: „Als neuen Kurs wiederherstellen“ und eine Kategorie wählen. Für einen leeren Kurs, den du schon " +
            "hast: „In diesen Kurs wiederherstellen“ mit „Zusammenführen“.",
      "„Einstellungen“: Weiter. „Schema“: Soll ein bestehender Kurs das Kursformat " + (oberText("format",
          S.angaben.format) || "") +
          " bekommen, stell „Kurseinstellungen überschreiben“ auf „Ja“. Dann „Wiederherstellen“.",
      glossar ? "Glossar: Öffne das Glossar im Kurs, Mehr → Einträge importieren, und wähle die Datei mit den " +
          "Glossar-Einträgen (Knopf oben)."
        : "Sieh die Kursseite einmal so an, wie sie deine Klasse sieht (Rolle wechseln → Schüler/in).",
      badge ? "Abzeichen: Mehr → Badges, das Abzeichen öffnen und „Zugriff " +
          "aktivieren“." : "Prüfe Kursbild und Banner; fehlt ein Bild, steht dort ein Platzhalter."];
    schritte.forEach(function (s) { ol.appendChild(el("li", { text: s })); });
    var imp = (Z.mappe && Z.mappe.importiert) || [];
    var alle = einheitenImKurs().every(function (e) { return imp.indexOf(e) >= 0; });
    $("importiert-frage").hidden = !!(Z.mappe && alle);
    $("importiert-stand").hidden = !(Z.mappe && alle);
    $("importiert-stand")
        .textContent = "Vermerkt. Die nächste Einheit wird als Nachlieferung erstellt und mit „Zusammenführen“ " +
        "eingespielt.";
  }

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
      if (Z.bau && Z.bau.mbz) { herunterladen(); status("Bereit", "ok"); }
      else status("Die Datei ließ sich nicht erstellen.", "fehler");
      zeichneWiederherstellen(); knoepfe(); zeichneSchritte(); rueckmeldungFuellen();
    } catch (e) { S.bauLaeuft = false; zeigeFehler(e); knoepfe(); }
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
  $("naechste-einheit").onclick = function () {
    if (!Z.mappe) return;
    var n = (Z.mappe.einheiten || einheitenImKurs().length) + 1;
    Z.mappe.einheiten = n;
    Z.mappe.anhaengen = "e" + n;
    Z.bau = null;
    $("f-thema").value = ""; $("f-minuten").value = (Z.mappe.einheit && Z.mappe.einheit.minuten) || 45;
    gehe(1, "f-thema");
    $("s1-titel").textContent = "Worum geht es in der nächsten Einheit?";
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
    $("s1-titel").textContent = "Worum geht es?";
    S.gespeichert = false;
    zeichne();
    window.scrollTo(0, 0);
  }

  // Rückmeldung: Version, Chat, Fach, Jahrgangsstufe (ohne Lehrplanbezug die Zahl aus dem Feld, sonst nur „nein“),
  // Vorlage und Weg; keine Inhalte, kein Thema, keine Namen
  function rueckmeldungText() {
    var m = Z.mappe || {}, e = m.einheit || {}, c = chatInfo(m.chat);
    var ohneLp = S.angaben.lehrplanbezug === "nein", jg = ohneLp ? S.jahrgangZahl(e.jahrgang || S.angaben.jahrgang) :
        e.jahrgang || S.angaben.jahrgang;
    return ["Rückmeldung zu Kursmühle " + ((S.katalog && S.katalog.version) || ""), "",
      "Chat: " + (c ? (m.chat === "eigene" && S.kiName ? S.kiName() : c.text) : "–"), "Fach: " + (S.angaben.fach || "–"),
      ohneLp && !jg ? "Lehrplanbezug: nein" : "Jahrgangsstufe: " + (jg || "–"),
      "Vorlage: " + (e.vorlage || "–") + (m.zweig ? " (" + ZWEIG_TEXT[m.zweig] + ")" : ""), korrekturZeile(m), "",
      "Wo hat es gestockt?", "", "", "Was hättest du anders gewollt?", "", "",
          "Nimmst du es für deine nächste Einheit wieder? Wenn nicht, woran liegt es?", "", ""].join("\n");
  }
  // „Korrekturen: 2 · mindest.quiz, zeit.annahme · Chat: ByLKI“ aus den Ereignissen der Kursmappe
  function korrekturZeile(m) {
    var k = (m && m.korrekturen) || [];
    var regeln = k.map(function (x) { return x.regel; }).filter(function (r, i, a) { return r && a.indexOf(r) === i; });
    var chats = k.map(function (x) { return x.chat; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
    return "Korrekturen: " + k.length + (regeln.length ? " · " + regeln.join(", ") : "") + (chats.length ? " · Chat: " +
        chats.join(", ") : "");
  }
  var rmBearbeitet = false;
  function rueckmeldungFuellen() { if (!rmBearbeitet) $("rm-text").value = rueckmeldungText(); }
  $("rm-text").addEventListener("input", function () { rmBearbeitet = true; });
  function rueckmeldungOeffnen() {
    $("rueckmeldung").dataset.offen = "1";
    rueckmeldungFuellen();
    zeichneSchritte();
    $("rueckmeldung").scrollIntoView({ block: "start" });
    $("rm-text-kopieren").focus({ preventScroll: true });
  }
  $("rueckmeldung-auf").onclick = rueckmeldungOeffnen;
  $("fuss-rueckmeldung").onclick = rueckmeldungOeffnen;
  $("rm-text-kopieren").onclick = function () {
    kopieren($("rm-text").value, $("rm-text"), $("rm-stand"),
        "Kopiert. Füge den Text in eine Mail an kursmuehle@pm.me ein und ergänze die drei Antworten.");
  };
  $("rm-adresse-kopieren").onclick = function () {
    kopieren("kursmuehle@pm.me", $("rm-adresse-feld"), $("rm-stand"), "Adresse kopiert.");
  };

  // Erst wenn alle Skripte der Seite geladen sind: Pyodide, Katalog und Hinweise laden, Adresse lesen, zeichnen
  function starten() {
    ladenStarten();
    weiterAnzeigen();
    adresseLesen();
    schemaZeigen();
    rueckmeldungFuellen();
    zeichne();
  }
  Object.assign(S, { leeren: leeren, rueckmeldungFuellen: rueckmeldungFuellen, rueckmeldungOeffnen: rueckmeldungOeffnen,
    zeichneFragen: zeichneFragen, zeichneGegen: zeichneGegen, zeichneWiederherstellen: zeichneWiederherstellen });
  starten();
})();
