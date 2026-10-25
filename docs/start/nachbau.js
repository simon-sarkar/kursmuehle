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
      ? S.fragenListe.length + " Fragen mit ihren Lösungen, ohne Rückmeldungen. Prüfe, ob jede Lösung stimmt."
      : "In dieser Einheit stehen noch keine Fragen.";
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
  }
  $("fragen-liste").onclick = function (ev) { var z = ev.target.closest("[data-ziel]"); if (z) zuKarte(z.dataset.ziel);
      };
  function durchgesehen() { if (Z.mappe) { Z.mappe.durchsicht = true; geaendert(); gehe(7, "herunterladen"); } }
  $("durchsicht-ok").onclick = durchgesehen;
  $("ohne-durchsicht").onclick = durchgesehen;
  function nachBildern() {
    if (S.fragenListe.length && !Z.mappe.durchsicht) gehe(6, "durchsicht-ok"); else gehe(7, "herunterladen");
  }
  $("weiter-5").onclick = function () {
    if (!Z.mappe) return;
    if (bildwuensche().length) gehe(5.5); else nachBildern();
  };
  $("weiter-bilder").onclick = function () { if (Z.mappe) nachBildern(); };

  // Lösungen gegenprüfen: ein neuer Chat löst die Aufgaben ohne Lösungen
  $("gegen-kopieren").onclick = function () {
    kopieren($("gegen-text-feld").value, $("gegen-text-feld"), $("gegen-kopiert"),
        "Jetzt in einen neuen Chat einfügen, die Antwort hier unten einfügen.");
  };
  var gegenTimer = null;
  $("gegen-antwort").addEventListener("input", function () {
    clearTimeout(gegenTimer);
    gegenTimer = setTimeout(gegenpruefen, 400);
  });
  async function gegenpruefen() {
    var text = $("gegen-antwort").value, ul = $("gegen-ergebnis");
    ul.innerHTML = "";
    if (!text.trim()) { $("gegen-stand").textContent = ""; return; }
    try {
      var v = await km.prompt("vergleich", [Z.pruefung, text]);
      Z.vergleich = v;
      var n = v.abweichungen.length;
      $("gegen-stand").textContent = (n ? n + (n === 1 ? " Abweichung" : " Abweichungen") + " von " + v.geprueft +
          " Aufgaben."
        : "Keine Abweichung bei " + (v.geprueft - v.fehlend.length) + " Aufgaben.")
        + (v.fehlend.length ? " Ohne Antwort: " + v.fehlend.join(", ") + "." : "");
      $("gegen-stand").className = "stand " + (n ? "fehler" : "ok");
      v.abweichungen.forEach(function (a) {
        ul.appendChild(el("li", {}, [el("button", { type: "button", cls: "hinweis-link", "data-ziel": a.baustein,
            text: "Aufgabe " + a.nr + " in „" + a.titel + "“" }),
          el("span", { text: ": der Chat sagt „" + a.chat + "“, deine Einheit „" + a.kursdatei + "“." })]));
      });
    } catch (e) { zeigeFehler(e); }
  }
  $("gegen-ergebnis").onclick = function (ev) { var z = ev.target.closest("[data-ziel]");
      if (z) zuKarte(z.dataset.ziel); };

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
        Z.bau = null;
    S.rueckgaengig = null; $("rueckgaengig").hidden = true; S.angaben = {};
    neuStart();
    $("f-thema").value = ""; $("f-jahrgang").value = ""; $("f-minuten").value = 45;
    $("s1-titel").textContent = "Worum geht es?";
    S.gespeichert = false;
    zeichne();
    window.scrollTo(0, 0);
  }

  // Rückmeldung: Version, Chat, Fach, Jahrgangsstufe (ohne Lehrplanbezug nur „nein“), Vorlage und Weg; keine Inhalte,
  // kein Thema, keine Namen
  function rueckmeldungText() {
    var m = Z.mappe || {}, e = m.einheit || {}, c = chatInfo(m.chat);
    return ["Rückmeldung zu Kursmühle " + ((S.katalog && S.katalog.version) || ""), "",
      "Chat: " + (c ? (m.chat === "eigene" && S.kiName ? S.kiName() : c.text) : "–"), "Fach: " + (S.angaben.fach || "–"),
      S.angaben.lehrplanbezug === "nein" ? "Lehrplanbezug: nein" : "Jahrgangsstufe: " + (e.jahrgang ||
          S.angaben.jahrgang || "–"),
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
    zeichneFragen: zeichneFragen, zeichneWiederherstellen: zeichneWiederherstellen });
  starten();
})();
