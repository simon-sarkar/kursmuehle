/* Kursmühle – Kartenliste mit Prüfstatus, Auswege aus der Schleife, Hinweise am Rand und der Korrekturblock. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, AUTO = S.AUTO, Z = S.Z, auswertung = S.auswertung, autosave = S.autosave, chatInfo = S.chatInfo,
      einheitTag = S.einheitTag, el = S.el, fehlerZahl = S.fehlerZahl, gelbZahl = S.gelbZahl, formularname = S.formularname,
      geaendert = S.geaendert, hoehe = S.hoehe, inhalt = S.inhalt, kopieren = S.kopieren, markiert = S.markiert,
      mitMinuten = S.mitMinuten, nrVon = S.nrVon, schritt = S.schritt, teileOffen = S.teileOffen,
      vorlageNach = S.vorlageNach, zeichne = S.zeichne, zeichneSchritte = S.zeichneSchritte,
      zeigeFehler = S.zeigeFehler, zeitSelbst = S.zeitSelbst, zweig = S.zweig;
  function pruefBaustein(id) { return Z.pruefung ? Z.pruefung.bausteine.filter(function (b) { return b.id === id;
      })[0] : null; }
  function titelHerkunft(k) { return k.geplant || (k.herkunft && k.herkunft.titel === "lehrkraft") ?
      "lehrkraft" : "chat"; }

  // Auswahl des Typs: zuerst „automatisch“, dann Gruppen nach Rolle (katalog.yaml `typgruppen`), Rest unter „Weitere“
  function typAuswahl(wert, label) {
    var s = el("select", { cls: "k-typ", "aria-label": label });
    s.appendChild(el("option", { value: AUTO, text: "Automatisch (der Chat wählt)", selected: wert === AUTO }));
    var gesehen = {};
    (S.katalog.typgruppen || []).forEach(function (g) {
      var og = el("optgroup", { label: g.name });
      g.typen.forEach(function (t) { gesehen[t] = 1; og.appendChild(el("option", { value: t, text: formularname(t),
          selected: t === wert })); });
      s.appendChild(og);
    });
    var rest = S.katalog.typen.filter(function (t) { return !gesehen[t.typ] && ["Badge", "Unterabschnitt",
        "Banner"].indexOf(t.typ) < 0; });
    if (rest.length) {
      var og = el("optgroup", { label: "Weitere" });
      rest.forEach(function (t) { og.appendChild(el("option", { value: t.typ, text: t.formularname,
          selected: t.typ === wert })); });
      s.appendChild(og);
    }
    return s;
  }
  function plus(pos) {
    return el("li", { cls: "k-zwischen" }, [el("button", { type: "button", cls: "k-plus", "data-pos": pos,
      "aria-label": "Baustein an Stelle " + (pos + 1) + " einfügen", title: "Baustein hier einfügen", text: "+" })]);
  }
  function isOptional(k) {
    var v = vorlageNach((Z.mappe.einheit || {}).vorlage);
    return !!(v && v.phasen.some(function (p) { return p.optional && p.phase === k.phase; }));
  }
  // AP13.30: neue Karten zählen hinter der höchsten Nummer weiter (b6-2 zählt als 6); eine frei gewordene Nummer kommt
  // nicht wieder, sonst träfe sie eine Karte mit demselben Namen in Kursdatei, Handänderungen oder einer Einheit davor
  function naechsteNummer() {
    var n = 0;
    Z.mappe.bausteine.forEach(function (k) { var m = /^b(\d+)(?:-\d+)?$/.exec(k.id); if (m) n = Math.max(n, +m[1]); });
    var re = /^id:\s*b(\d+)(?:-\d+)?\s*$/gm, m;
    while ((m = re.exec(Z.kurs_md || ""))) n = Math.max(n, +m[1]);
    return n + 1;
  }
  function neueId() { return "b" + naechsteNummer(); }

  // AP13.33 §1.6: Nummer wie am Rand und im Editor (gen/mappe.py nummern): ausgeschaltete Karten zählen nicht
  function nummer(id) {
    var liste = (Z.mappe && Z.mappe.bausteine) || [], n = 0;
    for (var j = 0; j < liste.length; j++) {
      if (!liste[j].aus) n += 1;
      if (liste[j].id === id) return liste[j].aus ? null : n;
    }
    return null;
  }
  function zeichneKarten() {
    var ol = $("karten"); ol.innerHTML = "";
    var liste = Z.mappe.bausteine, letzter = null, steuer = zweig() === "steuer";
    var abschnitte = liste.filter(function (k) { return k.abschnitt; }).map(function (k) { return k.abschnitt; });
    var mehrere = abschnitte.some(function (a) { return a !== abschnitte[0]; });
    var zeitplanung = zeitSelbst() && steuer;
    var zeitInfo = (Z.kennzahlen && Z.kennzahlen.zeit) || {};
    liste.forEach(function (k, i) {
      var nr = nummer(k.id), bez = nr ? "Baustein " + nr : "ausgeschalteter Baustein";
      var abschnitt = mehrere && k.abschnitt && k.abschnitt !== letzter ? el("p", { cls: "k-abschnitt",
          text: "Abschnitt " + k.abschnitt }) : null;
      if (k.abschnitt) letzter = k.abschnitt;
      var b = pruefBaustein(k.id);
      var st = k.weggelassen ? "weggelassen" : k.geplant ? "leer" : (b ? b.status : "leer");
      var warten = st === "fehler" && teileOffen();     // rot erst, wenn alle Teile eingefügt sind
      if (warten) st = "wartet";
      var stText = { ok: "Geprüft", warnung: "Hinweis", fehler: "Fehler", leer: "Noch ohne Inhalt", wartet: "Eingefügt",
          weggelassen: "Weggelassen" }[st];
      var minuten = mitMinuten(k.typ);
      // Typ: „Ich steuere“ native Auswahl nach Rolle, „Mach du“ eine Beschriftung (Klick wechselt den Zweig)
      var typFeld = k.geplant && steuer ? typAuswahl(k.typ, "Typ von " + bez)
        : !steuer ? el("button", { type: "button", cls: "k-typ k-typ-mach", "data-aktion": "steuern",
            title: "Ändern in „Ich steuere“", text: formularname(k.typ) })
        : el("span", { cls: "k-typ", text: formularname(k.typ) });
      var hand = handGeaendert(k.id) && !k.geplant;
      var diag = el("ul", { cls: "k-diagnosen" });
      if (Z.pruefung && !k.geplant && !warten) {
        Z.pruefung.diagnosen.filter(function (d) { return d.baustein === k.id && d.stufe !== "hinweis"; })
            .forEach(function (d) {
          var satz = (d.zeile_im_baustein ? "Zeile " + d.zeile_im_baustein + " im Baustein: " : "") + d.text;
          // AP13.14: Sprach-Hinweis gelb ohne Bitte; der Knopf nimmt den Satz für den Chat in die Korrekturbitte
          // AP13.11 §8.9: an einer Handfassung kein Knopf (gelbe Bitten gehen für sie nicht an den Chat)
          var an = d.regel === "sprache.lang" && !hand ? S.spracheGelb.indexOf(k.id) >= 0 : null;
          diag.appendChild(el("li", { cls: d.stufe, "data-regel": d.regel || "" }, an === null ? [satz] : [satz + " ",
            el("button", { type: "button", cls: "k-sprache klein", "data-aktion": "sprache",
                "aria-pressed": an ? "true" : "false", text: "Sprache anpassen lassen" })]));
        });
      }
      if (k.geplant && k.leer_antwort && !k.aus) diag.appendChild(el("li", { cls: "warnung", "data-regel": "leer.antwort",
          text: S.editorText("leer_antwort", { n: nr || "" }).replace(/^[^:]*:\s*/, "") }));
      var sl = schleife()[k.id];
      if (sl && sl.gleich && st === "fehler") diag.appendChild(el("li", { cls: "warnung k-gleich",
          text: "Die Antwort für „" + k.titel + "“ ist dieselbe wie vorher (Runde " + sl.rot + ")." }));
      // Ist-Minuten aus dem Inhalt (Rolle und Jahrgang); Zeitfelder und die Lücke nur mit „Zeitplanung anzeigen“
      var z = zeitInfo[k.id], ist = null;
      var sp = Z.kennzahlen && Z.kennzahlen.sprache && Z.kennzahlen.sprache.je[k.id];
      if (minuten && z && z.gerechnet) {
        ist = el("span", { cls: "k-ist geschaetzt", text: "gerechnet " + z.gerechnet + " min" + (sp ? " · Sätze im Mittel " +
            String(sp.satz_mittel).replace(".", ",") + " Wörter, LIX " + sp.lix : "") });
        if (z.abweichung && zeitplanung) diag.appendChild(el("li", { cls: "hinweis k-luecke", text: z.text }));
      } else if (minuten && b && b.minuten) ist = el("span", { cls: "k-ist geschaetzt", text: "im Inhalt " + b.minuten +
          " min" });
      var korrektur = S.korrekturen.filter(function (x) { return x.baustein === k.id; });
      var inhaltEl = null;
      if (b && !k.geplant) {
        // nur Text, nie HTML aus der Chat-Antwort
        var pre = el("pre", { cls: "k-text von-chat" }); pre.textContent = b.text;
        inhaltEl = el("details", { cls: "k-inhalt" }, [el("summary", { text: "Inhalt ansehen" }), pre]);
      }
      var namen = b && !k.geplant ? S.bildnamen(b.text) : [];
      var hochladen = namen.length ? el("div", { cls: "k-bilder" }, namen.map(function (name) {
        var da = !!Z.assets[name];
        return el("label", { cls: "knopf klein-knopf" + (da ? " da" : "") }, [(da ? "Bild „" + name +
            "“ ersetzen" : "Bild „" + name + "“ hochladen"),
          el("input", { type: "file", cls: "unsichtbar k-bild", accept: "image/png,image/jpeg", "data-datei": name })]);
      })) : null;
      var herkunft = titelHerkunft(k);
      if (k.aus && !steuer && !k.weggelassen) return;  // ausgeschaltete Karte: nur in „Ich steuere“ sichtbar
      if (steuer && k.geplant) ol.appendChild(plus(i));
      var li = el("li", { cls: "karte status-" + st + (k.neu ? " neu" : "") + (minuten ? "" : " struktur") + (k.aus ?
          " aus" : ""), "data-id": k.id, id: "karte-" + k.id }, [
        abschnitt,
        el("div", { cls: "k-kopf" }, [
          el("span", { cls: "k-nr", text: nr ? String(nr) : "–" }), typFeld,
          hand ? el("span", { cls: "k-hand", text: S.editorText(Z.mappe.hand[k.id].art === "neu" ? "neu_geschrieben" :
              "hand") }) : null,
          el("span", { cls: "k-status", title: stText }, [el("span", { cls: "punkt", "aria-hidden": "true" }),
              stText])]),
        el("input", { cls: "k-titel von-" + herkunft, "data-herkunft": herkunft, type: "text", value: k.titel,
            readonly: !steuer,
          "aria-label": "Titel von " + bez + (herkunft === "chat" ? " (vom Chat)" : " (von dir)") }),
        minuten && zeitplanung ? el("div", { cls: "k-felder" }, [
          el("label", { cls: "k-phase-l" }, ["Phase ", el("input", { cls: "k-phase", type: "text", list: "phasen",
              value: k.phase || "" })]),
          el("label", { cls: "k-soll-l" }, ["Soll ", el("input", { cls: "k-soll", type: "number", min: "0", max: "300",
              inputmode: "numeric",
            value: k.soll === null || k.soll === undefined ? "" : k.soll }), " min"]), ist]) : null,
        k.geplant && steuer && !k.weggelassen && (k.aus || isOptional(k)) ? el("label", { cls: "schalter k-an-l" },
            [el("input", { type: "checkbox", cls: "k-an", checked: !k.aus }),
          k.aus ? "Freiwillig, ausgeschaltet: einschalten" : "Freiwillig: verwenden"]) : null,
        steuer && !k.aus ? el("label", { cls: "k-auftrag-l" }, [el("span", { cls: "unsichtbar",
            text: "Auftrag für " + bez }),
          el("textarea", { cls: "k-auftrag von-lehrkraft", rows: "1",
              placeholder: "Was soll hinein? Ein Satz genügt (optional)" })]) : null,
        diag,
        korrektur.length && !warten ? el("p", { cls: "k-korrektur" }, [
          el("a", { href: "#korrektur", cls: "k-zur-korrektur", "data-aktion": "zur-korrektur",
              text: "Zur Korrektur unter dem Feld" })]) : null,
        st === "fehler" && ausweg(k.id) ? auswegBlock(k, b) : null,
        hochladen, inhaltEl,
        steuer ? el("div", { cls: "k-aktionen" }, [
          el("button", { type: "button", cls: "k-hoch klein", "data-aktion": "hoch", "aria-label": bez + " nach oben",
              disabled: i === 0, text: "↑" }),
          el("button", { type: "button", cls: "k-runter klein", "data-aktion": "runter", "aria-label": bez + " nach unten",
              disabled: i === liste.length - 1, text: "↓" }),
          k.geplant ? null : el("button", { type: "button", cls: "k-neu klein", "data-aktion": "neu",
            "aria-pressed": k.neu ? "true" : "false", text: "Diesen Baustein neu beauftragen" }),
          el("button", { type: "button", cls: "k-loeschen klein", "data-aktion": "loeschen",
              text: "Löschen" })]) : null]);
      var auftrag = li.querySelector(".k-auftrag");
      if (auftrag) auftrag.value = k.auftrag || "";
      var eigenes = li.querySelector(".ausweg-text");
      if (eigenes) eigenes.value = selbst[k.id].text;
      ol.appendChild(li);
    });
    if (steuer && liste.length && liste[liste.length - 1].geplant) ol.appendChild(plus(liste.length));
    if (!$("tafel-bausteine").hidden) Array.prototype.forEach.call(ol.querySelectorAll(".k-auftrag"), hoehe);
    $("karten-leer").hidden = liste.length > 0;
    $("zeit-selbst").checked = zeitSelbst();
    $("zeit-schalter").hidden = !steuer;
  }

  // Je id merkt sich die Mappe den Hash des zuletzt eingefügten Texts und zählt die Korrekturrunden, nach denen der
  // Baustein rot blieb (`rot`, davon `gleich` mit demselben Text). Ab zwei roten Runden stehen drei Wege darunter.
  var selbst = {};                    // id -> {text, meldungen}: offenes Feld „Selbst anpassen“
  function schleife() { return Z.mappe ? (Z.mappe.schleife = Z.mappe.schleife || {}) : {}; }
  function ausweg(id) { var e = schleife()[id]; return !!e && e.rot >= 2; }
  function textHash(t) {
    var s = String(t || "").replace(/\s+/g, ""), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + "." + s.length;
  }
  // `runde` = Antwort auf eine Korrektur (zählt), sonst eine neue Antwort (setzt zurück, außer bei gleichem Text)
  function schleifeMerken(ids, runde) {
    var sl = schleife(), gleich = [];
    ids.forEach(function (id) {
      var b = pruefBaustein(id); if (!b) return;
      var h = textHash(b.text), e = sl[id];
      if (b.status !== "fehler") { delete sl[id]; return; }
      var same = !!e && e.hash === h;
      if (!runde && !same) { sl[id] = { hash: h, gleich: 0, rot: 0 }; return; }
      if (!e) { sl[id] = { hash: h, gleich: 0, rot: 1 }; return; }
      sl[id] = { hash: h, gleich: (e.gleich || 0) + (same ? 1 : 0), rot: (e.rot || 0) + 1 };
      if (same) gleich.push(b.titel);
    });
    return gleich;
  }
  function auswegBlock(k, b) {
    var offen = selbst[k.id];
    var weg = function (aktion, titel, satz) {
      return el("div", { cls: "ausweg-weg" }, [el("p", {}, [el("strong", { text: titel + ". " }), satz]),
        el("button", { type: "button", cls: "knopf klein-knopf", "data-aktion": aktion, text: titel })]);
    };
    var kinder = [el("p", { cls: "ausweg-titel", text: "So geht es weiter" }),
      weg("weglassen", "Baustein weglassen", "Die Einheit kommt ohne ihn aus; die Minuten stehen als Hinweis am Rand."),
      weg("selbst", "Selbst anpassen", "Du änderst den Text hier und übernimmst ihn; die Mühle prüft beim Schreiben."),
      weg("anderer-chat", "Anderer Chat",
          "Der Text für diesen Baustein liegt im Korrekturblock bereit; füge ihn in einem anderen Chat ein.")];
    if (offen) {
      kinder.push(el("label", { cls: "feld ausweg-feld" }, ["Kursdatei-Ausschnitt dieses Bausteins",
        el("textarea", { cls: "ausweg-text", rows: "8", spellcheck: "false" })]));
      kinder.push(el("ul", { cls: "ausweg-pruefung" }, (offen.meldungen || []).map(function (m) { return el("li", {
          cls: m.stufe, text: m.text }); })));
      kinder.push(el("button", { type: "button", cls: "knopf", "data-aktion": "selbst-uebernehmen",
          text: "Übernehmen" }));
    }
    return el("div", { cls: "ausweg", role: "group", "aria-label": "So geht es weiter" }, kinder);
  }
  var selbstTimer = null;
  async function selbstPruefen(id, text) {
    var m = (await km.mappeFn("hand_pruefen", [Z.mappe, text, id])).meldungen;
    if (!selbst[id]) return;
    selbst[id].meldungen = m;
    var ul = document.querySelector("#karte-" + CSS.escape(id) + " .ausweg-pruefung");
    if (ul) { ul.innerHTML = ""; m.forEach(function (x) { ul.appendChild(el("li", { cls: x.stufe, text: x.text })); });
        }
  }
  async function auswegAktion(a, k) {
    var b = pruefBaustein(k.id);
    if (a === "weglassen") {
      S.rueckgaengig = { mappe: JSON.parse(JSON.stringify(Z.mappe)), kurs_md: Z.kurs_md, titel: k.titel };
      var z = (Z.kennzahlen && Z.kennzahlen.zeit && Z.kennzahlen.zeit[k.id]) || {};
      var minuten = (zeitSelbst() ? k.soll || (b && b.minuten) : (b && b.minuten) || z.gerechnet) || k.soll || 0;
      await km.bereit();
      Z.kurs_md = await km.mappeFn("entferne", [Z.kurs_md, k.id]);
      k.geplant = true; k.aus = true; k.weggelassen = { minuten: minuten }; k.neu = false;
      delete schleife()[k.id]; delete selbst[k.id];
      await km.stand(Z.kurs_md);
      await auswertung();
      zeichne(); geaendert();
      $("rueckgaengig-text").textContent = "„" + k.titel + "“ weggelassen.";
      $("rueckgaengig").hidden = false;
      $("rueckgaengig-knopf").focus();
    } else if (a === "selbst") {
      if (selbst[k.id]) { delete selbst[k.id]; zeichneKarten(); return; }
      selbst[k.id] = { text: b ? b.text : "", meldungen: [] };
      zeichneKarten();
      var f = document.querySelector("#karte-" + CSS.escape(k.id) + " .ausweg-text");
      if (f) f.focus();
      selbstPruefen(k.id, selbst[k.id].text);
    } else if (a === "selbst-uebernehmen") {
      var text = (selbst[k.id] || {}).text || "";
      if (!text.trim()) return;
      var e = await handUebernehmen(k.id, text, b ? b.text : null);
      if (!e.ok) { if (selbst[k.id]) selbst[k.id].meldungen = e.meldungen; zeichneKarten(); return; }
      delete selbst[k.id];
      zeichne();
    } else if (a === "anderer-chat") {
      k.neu = true; delete schleife()[k.id];
      S.korrektur.text = ""; S.korrektur.offen = false;
      S.korrektur.stand = "Der Text für „" + k.titel +
          "“ steht oben im Korrekturblock. Wähle einen anderen Chat, kopiere ihn dort hinein und füge die Antwort " +
          "hier ein.";
      S.korrektur.art = "";
      zeichne(); geaendert(); korrekturSpaeter(0);
      $("chat-aendern").click();
    }
  }

  // AP13.11: Handänderung (Editor „Bearbeiten“ und „Selbst anpassen“ an der roten Karte), ein Weg. Prüft den Text
  // (gen/mappe.py hand_pruefen); ein Fehler des Parsers setzt nicht ein. Sonst Einsetzen an diese Karte (einsetzen mit
  // nur = id, kopf), Markierung „von Hand geändert“ mit dem Stand davor (`hand`), neu prüfen; Fehler aus den Regeln der
  // Einheit färben die Karte danach rot. Das einstufige Rückgängig und die letzte Antwort (Moduswechsel) gelten danach
  // nicht mehr. -> {ok, meldungen}
  function handGeaendert(id) { return !!(Z.mappe && Z.mappe.hand && Z.mappe.hand[id]); }
  function handIds() { return Z.mappe && Z.mappe.hand ? Object.keys(Z.mappe.hand) : []; }
  // AP13.33 §1.4: die Durchsicht der Fragen gilt weiter, solange sich keine Frage und keine Lösung der geänderten
  // Bausteine ändert. fragenStand(ids) vorher merken, durchsichtNach danach; geändert: Durchsicht zurück, die Bausteine
  // stehen in `durchsicht_neu` (Satz und Knopf in den Schritten Fragen und Datei)
  function fragenVon(id) {
    return JSON.stringify(S.fragenListe.filter(function (f) { return f.baustein === id; }).map(function (f) {
      return [f.art, f.frage, f.optionen, f.loesung]; }));
  }
  function fragenStand(ids) { var o = {}; ids.forEach(function (id) { o[id] = fragenVon(id); }); return o; }
  function durchsichtNach(vorher) {
    if (!Z.mappe) return;
    var anders = Object.keys(vorher).filter(function (id) { return fragenVon(id) !== vorher[id]; });
    if (!anders.length) return;
    var neu = Z.mappe.durchsicht_neu || [];
    if (Z.mappe.durchsicht || neu.length) {
      anders.forEach(function (id) { if (neu.indexOf(id) < 0) neu.push(id); });
      Z.mappe.durchsicht_neu = neu;
    }
    Z.mappe.durchsicht = false;
  }
  function nachHandAenderung(id) {
    delete schleife()[id]; delete selbst[id];
    S.spracheGelb = S.spracheGelb.filter(function (x) { return x !== id; });
    S.rueckgaengig = null; $("rueckgaengig").hidden = true;
    S.letzteAntwort = null;
  }
  // `angezeigt` = Text, den das Feld anfangs zeigte: unverändert übernommen, passiert nichts (keine Markierung)
  async function handUebernehmen(id, text, angezeigt) {
    if (angezeigt !== undefined && angezeigt !== null && String(text).trim() === String(angezeigt).trim())
      return { ok: true, unveraendert: true, meldungen: [] };
    await km.bereit();
    var pr = await km.mappeFn("hand_pruefen", [Z.mappe, text, id]);
    if (!pr.ok) return pr;
    var b = pruefBaustein(id), vorher = b ? b.text : "";
    var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text, id, true, true]);
    if (!r.ersetzt.length && !r.eingefuegt.length) return { ok: false, meldungen: [{ stufe: "fehler",
        text: r.fehler.join(" ") || S.editorText("kein_baustein") }] };
    var hand = Z.mappe.hand = Z.mappe.hand || {}, fr = fragenStand([id]);
    if (!hand[id]) hand[id] = { vorher: vorher, zeit: Date.now() }; else hand[id].zeit = Date.now();
    delete hand[id].art;                     // ein neu geschriebener Baustein ist jetzt von Hand geändert
    await km.stand(r.kurs_md);
    nachHandAenderung(id);
    await auswertung();
    durchsichtNach(fr);
    zeichne(); geaendert();
    return pr;
  }
  // „Handänderung zurücknehmen“: der Stand vor der ersten Handänderung kommt zurück, die Markierung entfällt
  async function handZuruecknehmen(id) {
    var h = Z.mappe && Z.mappe.hand && Z.mappe.hand[id];
    if (!h) return false;
    await km.bereit();
    var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, h.vorher, id, false, true]);
    if (!r.ersetzt.length && !r.eingefuegt.length) return false;
    var fr = fragenStand([id]);
    delete Z.mappe.hand[id];
    await km.stand(r.kurs_md);
    nachHandAenderung(id);
    await auswertung();
    durchsichtNach(fr);
    zeichne(); geaendert();
    return true;
  }
  // §9: Änderung an der Kursübersicht (Kurstitel, Abschnittskopf) als Handänderung `kopf` bzw. `abschnitt:n`; der
  // neue Text der Kursdatei kommt aus gen/mappe.py (kurstitel_setzen, abschnitt_setzen)
  function uebersichtAendern(md, schluessel, vorher, werte) {
    return gliederungAendern(md, [{ schluessel: schluessel, vorher: vorher, werte: werte }], []);
  }
  // AP13.30: Gliederung (Kachel teilen, Baustein in eine andere Kachel, leere Kachel löschen) auf demselben Weg: je
  // betroffenem Abschnitt eine Handänderung `abschnitt:…` mit Kopf, Vorgänger und den ids seiner Bausteine (gen/mappe.py
  // kachel_teilen, baustein_verschieben, kachel_loeschen); `weg` = Einträge, deren Abschnitt es nicht mehr gibt. Danach
  // gelten Rückgängig und die letzte Antwort (Moduswechsel) nicht mehr; eine neue Antwort fragt „Erhalten/Verwerfen“.
  async function gliederungAendern(md, eintraege, weg) {
    var hand = Z.mappe.hand = Z.mappe.hand || {};
    (weg || []).forEach(function (k) { delete hand[k]; });
    (eintraege || []).forEach(function (e) {
      if (!hand[e.schluessel]) hand[e.schluessel] = { vorher: e.vorher, zeit: Date.now() };
      Object.assign(hand[e.schluessel], e.werte, { zeit: Date.now() });
    });
    await km.stand(md);
    S.rueckgaengig = null; $("rueckgaengig").hidden = true; S.letzteAntwort = null;
    await auswertung();
    zeichne(); geaendert();
  }
  // AP13.30 §4a: nach dem Einsetzen einer Antwort die Karten markieren, die noch leer sind (gen/mappe.py
  // leer_nach_antwort; Rand und Korrekturbitte nennen sie mit ihrer id), und die Karten, deren ID über Typ und Titel
  // ergänzt wurde (`ergaenzt`, aus ids_ergaenzen; grauer Hinweis bis zur nächsten Antwort). `ohne`: ein Teil oder der
  // Rest steht noch aus, dann keine Markierung „leer“.
  async function nachAntwortMarkieren(ergaenzt, ohne) {
    var leer = ohne ? [] : await km.mappeFn("leer_nach_antwort", [Z.mappe]);
    var vorher = JSON.stringify(Z.mappe.bausteine);
    Z.mappe.bausteine.forEach(function (k) {
      if (leer.indexOf(k.id) >= 0) k.leer_antwort = true; else delete k.leer_antwort;
      if ((ergaenzt || []).indexOf(k.id) >= 0 && !k.geplant) k.id_ergaenzt = true; else delete k.id_ergaenzt;
    });
    if (JSON.stringify(Z.mappe.bausteine) !== vorher)
      Z.kennzahlen = await km.mappeFn("kennzahlen", [Z.mappe, Z.pruefung, null, Z.steckbrief_text]);
  }
  function handTitel(id) {
    if (id.indexOf("abschnitt:") === 0) {
      var n = ((Z.mappe.hand || {})[id] || {}).nachher || "";
      return S.editorText("abschnitt") + " „" + n.split("\n")[0].replace(/^##\s*/, "").replace(/\s*·\s*\d+\s*min.*$/,
          "") + "“";
    }
    if (id === "kopf") return S.editorText("kurstitel");
    var k = (Z.mappe.bausteine || []).filter(function (x) { return x.id === id; })[0];
    // AP13.33 §1.2: neu geschriebene Bausteine stehen in derselben Frage, mit dem Zusatz „neu geschrieben“
    var neu = ((Z.mappe.hand || {})[id] || {}).art === "neu";
    return "„" + (k ? k.titel : id) + "“" + (neu ? " (" + S.editorText("neu_geschrieben") + ")" : "");
  }
  // Frage vor dem Einsetzen einer Antwort, die von Hand geänderte Bausteine betrifft (§4); ein <dialog> über allem,
  // auch über der Ansicht „Einheit ansehen und bearbeiten“. Esc gilt als „Erhalten“ (nichts geht verloren).
  function handFrage(ids) {
    var d = $("hand-frage");
    $("hand-frage-text").textContent = S.editorText("frage");
    $("hand-erhalten").textContent = S.editorText("erhalten");
    $("hand-verwerfen").textContent = S.editorText("verwerfen");
    var ul = $("hand-frage-liste"); ul.innerHTML = "";
    ids.forEach(function (id) { ul.appendChild(el("li", { text: handTitel(id) })); });
    var vorher = document.activeElement;
    return new Promise(function (fertig) {
      function ende(wahl) {
        d.removeEventListener("cancel", abbruch);
        $("hand-erhalten").onclick = $("hand-verwerfen").onclick = null;
        if (d.open) d.close();
        S.fokus([vorher], true);            // AP13.33 §2.1: nur, wenn die Stelle davor noch zu sehen ist
        fertig(wahl);
      }
      function abbruch(ev) { ev.preventDefault(); ende("erhalten"); }
      d.addEventListener("cancel", abbruch);
      $("hand-erhalten").onclick = function () { ende("erhalten"); };
      $("hand-verwerfen").onclick = function () { ende("verwerfen"); };
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      $("hand-erhalten").focus();
    });
  }
  // Vor dem Einsetzen: betroffene Handfassungen und die Wahl (einmal je Antwort, `merk` hält sie); „Erhalten“ gibt den
  // Text zurück, der statt der Antwort eingesetzt wird. -> {ids, wahl, text, bausteine}
  async function handVorEinsetzen(mappe, kurs_md, text, modus, nur, merk) {
    var ids = await km.mappeFn("hand_betroffen", [mappe, kurs_md, text, modus, nur]);
    if (!ids.length) return { ids: [], wahl: null, text: text, bausteine: -1 };
    var wahl = merk && merk.hand ? merk.hand : await handFrage(ids);
    if (merk) merk.hand = wahl;
    if (wahl !== "erhalten") return { ids: ids, wahl: wahl, text: text, bausteine: -1 };
    var e = await km.mappeFn("hand_erhalten", [mappe, kurs_md, text, modus, nur, ids]);
    return { ids: ids, wahl: wahl, text: e.text, bausteine: e.bausteine, vorher: e.vorher || {} };
  }
  // Nach dem Einsetzen: eingesetzte Bausteine kommen aus dem Chat, „Verwerfen“ nimmt die Markierung der betroffenen.
  // AP13.33 §1.3: „Erhalten“: der Stand davor ist die Fassung dieser Antwort (der Block, den die Handfassung verdrängt)
  function handNachEinsetzen(eingesetzt, hv) {
    if (!Z.mappe.hand) return;
    eingesetzt.forEach(function (id) { delete Z.mappe.hand[id]; });
    if (hv && hv.wahl === "verwerfen") hv.ids.forEach(function (id) { delete Z.mappe.hand[id]; });
    if (hv && hv.wahl === "erhalten") Object.keys(hv.vorher || {}).forEach(function (id) {
      if (Z.mappe.hand[id]) Z.mappe.hand[id].vorher = hv.vorher[id]; });
  }

  function zeichneDiagnosen() {
    var k = Z.kennzahlen;
    S.zeichnePlanung();
    var setze = function (id, wert, warn) { var e = $(id); e.textContent = wert; e.parentNode.classList.toggle("warn",
        !!warn); };
    if (!k) {
      ["kz-minuten", "kz-folge", "kz-mc", "kz-rueckmeldung", "kz-uebung"].forEach(function (id) { setze(id, "–"); $(id)
          .parentNode.hidden = false; });
      $("kz-zahl-z").hidden = true;
      $("kz-saetze-z").hidden = true;
      $("hinweise").innerHTML = ""; $("hinweise-mehr").hidden = true;
      return;
    }
    var m = k.minuten, vorher = !k.inhalt;
    // vor der ersten Antwort gibt es keine Ist-Minuten: nur „45 Minuten geplant“ und die Zahl der Bausteine
    $("kz-minuten-t").textContent = vorher ? "Geplant" : "Minuten";
    $("kz-zahl-z").hidden = !vorher;
    ["kz-folge", "kz-mc", "kz-rueckmeldung", "kz-uebung"].forEach(function (id) { $(id).parentNode.hidden = vorher; });
    $("kz-zahl").textContent = String(k.bausteine);
    if (vorher) {
      var e = $("kz-minuten"); e.innerHTML = ""; e.parentNode.classList.remove("warn");
      e.appendChild(document.createTextNode((m.soll || "–") + " Minuten"));
    } else {
      var d = $("kz-minuten"); d.innerHTML = ""; d.parentNode.classList.toggle("warn", !!(m.soll &&
          (m.ist > m.soll * 1.1 || m.ist < m.soll * 0.9)));
      d.appendChild(el("span", { cls: "geschaetzt", text: String(m.ist) }));
      if (m.soll) d.appendChild(document.createTextNode(" von " + m.soll + " geplant"));
    }
    // AP13.14: Zusatzaufgaben zählen nicht mit, die Zeile nennt sie getrennt
    if (m.zusatz) $("kz-minuten").appendChild(document.createTextNode(", plus " + m.zusatz + " Minuten Zusatz"));
    // AP13.14: höchster Mittelwert der Satzlänge und Zahl der Lesetexte über dem Richtwert
    var sp = k.sprache;
    $("kz-saetze-z").hidden = vorher || !sp;
    if (sp) setze("kz-saetze", "im Mittel bis " + String(sp.mittel_max).replace(".", ",") + " Wörter" + (sp.ueber ?
        ", " + sp.ueber + " von " + sp.lesetexte + (sp.lesetexte === 1 ? " Lesetext" : " Lesetexten") +
        " über dem Richtwert" : ""), sp.ueber > 0);
    setze("kz-folge", (k.folge.length ? k.folge.join(" → ") : "–") + (k.folge_brueche ? " (" + k.folge_brueche +
        " Schritt" + (k.folge_brueche > 1 ? "e" : "") + " zurück)" : ""), k.folge_brueche > 0);
    var f = k.fragen;
    setze("kz-mc", f.fragen ? k.mc_anteil + " % von " + f.fragen + " Fragen" : "keine Fragen", f.fragen &&
        k.mc_anteil > 50);
    setze("kz-rueckmeldung", f.auswahl ? f.rueckmeldung + " von " + f.auswahl + " Auswahlfragen" : "–", f.auswahl &&
        f.rueckmeldung < f.auswahl / 2);
    var u = k.uebungstypen || { zahl: 0, von: 0 };       // verschiedene Übungstypen gegen die angebotenen
    setze("kz-uebung", u.von ? u.zahl + " von " + u.von : "–", u.warn);
    var ul = $("hinweise"); ul.innerHTML = "";
    // rot erst nach dem letzten Teil
    var alleH = teileOffen() ? k.hinweise.filter(function (h) { return h.stufe !== "fehler"; }) : k.hinweise;
    var liste = S.hinweiseAlle ? alleH : alleH.slice(0, 3);
    liste.forEach(function (h) {
      var li = el("li", { cls: h.stufe }, [h.baustein
        ? el("button", { type: "button", cls: "hinweis-link", "data-ziel": h.baustein, text: h.text }) : h.text]);
      ul.appendChild(li);
    });
    $("hinweise-mehr").hidden = alleH.length <= 3;
    $("hinweise-mehr").textContent = S.hinweiseAlle ? "Weniger anzeigen" : "Weitere " + (alleH.length - 3) +
        " anzeigen";
  }
  $("hinweise-mehr").onclick = function () { S.hinweiseAlle = !S.hinweiseAlle; zeichneDiagnosen(); };
  $("hinweise").onclick = function (ev) {
    var z = ev.target.closest("[data-ziel]");
    if (!z) return;
    zuKarte(z.dataset.ziel);
  };
  function zuKarte(id) {
    var ort = $("tafel-bausteine").closest(".schritt");
    if (ort && ort.dataset.stand === "erledigt" && !ort.classList.contains("auf")) { S.auf[ort.dataset.nr] = true;
        zeichneSchritte(); }
    var karte = $("karte-" + id);
    if (karte) { karte.scrollIntoView({ behavior: "smooth", block: "center" }); karte.querySelector(".k-titel").focus({
        preventScroll: true }); }
  }

  // AP13.33 §1.4: „Neu durchzusehen: die Fragen in „A“ und „B“.“, solange die Durchsicht nach einer Änderung aussteht
  function durchsichtNeuText() {
    var ids = (Z.mappe && !Z.mappe.durchsicht && Z.mappe.durchsicht_neu) || [];
    var titel = ids.map(function (id) { var b = pruefBaustein(id) || S.karteNach(id); return b ? "„" + b.titel + "“" : null; })
        .filter(Boolean);
    if (!titel.length) return "";
    var liste = titel.length === 1 ? titel[0] : titel.slice(0, -1).join(", ") + " und " + titel[titel.length - 1];
    return S.editorText("durchsicht_neu", { titel: liste });
  }
  function knoepfe() {
    var fehler = fehlerZahl(), voll = inhalt();
    // Fragen und Lösungen einmal ansehen (oder bewusst überspringen), bevor die Datei entsteht
    var durchsicht = !S.fragenListe.length || !!(Z.mappe && Z.mappe.durchsicht);
    var fertig = !!(Z.bau && Z.bau.mbz);
    $("herunterladen").hidden = !(voll && !fehler && durchsicht) && !fertig;
    $("herunterladen").disabled = S.bauLaeuft;
    $("glossar-laden").hidden = !(fertig && Z.bau.glossare && Z.bau.glossare.length);
    var t = "";
    if (S.bauLaeuft) t = "Datei wird erstellt …";
    else if (!voll) t = "";
    else if (fehler) t = "In der Antwort " + (fehler === 1 ? "steht 1 Fehler" : "stehen " + fehler + " Fehler") +
        "; behebe sie in Schritt " + nrVon(5) + ".";
    else if (!durchsicht && durchsichtNeuText()) t = durchsichtNeuText();
    else if (!durchsicht) t = "Sieh vorher in Schritt " + nrVon(6) + " die " + S.fragenListe.length +
        " Fragen und ihre Lösungen durch.";
    else if (fertig) t = "Die Datei ist heruntergeladen (" + Math.round(Z.bau.mbz.length / 1024) + " KB)" +
        (Z.bau.nachlieferung ? " und enthält nur die neue Einheit." : ".");
    else if (Z.bau && !Z.bau.mbz) t = "Die Datei ließ sich nicht erstellen: " + ((Z.bau.diagnosen || [])
        .filter(function (d) { return d.stufe === "fehler"; }).map(function (d) { return d.text; })[0] || "");
    else if (!Z.geladen) t = "Wird vorbereitet …";
    // beim Bauen dreht sich die Mühle neben dem Satz (wie bei „Deine KI schreibt …“)
    var es = $("erstellen-stand");
    if (S.bauLaeuft && es.querySelector(".muehle-warten")) es.querySelector(".laeuft-text").textContent = t;
    else if (S.bauLaeuft) { es.textContent = ""; es.append(S.wartezeichen(), el("span", { cls: "laeuft-text", text: t })); }
    else es.textContent = t;
    // AP13.33 §1.4: nach einer Änderung an Fragen ein Knopf zum Schritt Fragen (dort steht, was neu durchzusehen ist)
    $("zu-durchsicht").hidden = !(voll && !fehler && !durchsicht && !S.bauLaeuft && schritt() >= 7);
    $("zu-durchsicht").textContent = S.editorText("durchsicht_neu_knopf");
    $("speichern").disabled = !Z.geladen || !Z.mappe;
    $("wiederherstellen").hidden = !(Z.bau && Z.bau.mbz);
    $("weiter-5").hidden = !(schritt() === 5 && voll && !fehler && !teileOffen());
  }

  function karteVon(t) { var li = t.closest(".karte"); return li ? Z.mappe.bausteine.filter(function (k) {
      return k.id === li.dataset.id; })[0] : null; }

  $("karten").addEventListener("input", function (ev) {
    var k = karteVon(ev.target); if (!k) return;
    var c = ev.target.classList;
    if (c.contains("ausweg-text")) {
      if (selbst[k.id]) selbst[k.id].text = ev.target.value;
      clearTimeout(selbstTimer);
      var id = k.id, t = ev.target.value;
      selbstTimer = setTimeout(function () { selbstPruefen(id, t).catch(zeigeFehler); }, 400);
      return;
    }
    if (c.contains("k-phase")) k.phase = ev.target.value;
    else if (c.contains("k-soll")) k.soll = ev.target.value === "" ? null : Math.max(0, parseInt(ev.target.value, 10) ||
        0);
    else if (c.contains("k-auftrag")) {
      k.auftrag = ev.target.value; hoehe(ev.target);
      if (k.neu) korrekturSpaeter();           // neu beauftragt: Text im Korrekturblock folgt dem Auftrag
    }
    else return;
    geaendert();
  });

  // Titel übernehmen: bei change (Fokus verlässt das Feld) und bei Enter; Safari löst bei Enter kein change aus
  var umbenennenLaeuft = {};
  async function titelUebernehmen(feld) {
    var k = karteVon(feld); if (!k || umbenennenLaeuft[k.id] || feld.readOnly) return;
    var titel = feld.value.replace(/\s+/g, " ").trim();
    if (!titel || titel === k.titel) { feld.value = k.titel; return; }
    if (k.geplant) { k.titel = titel; geaendert(); return; }
    umbenennenLaeuft[k.id] = true;
    try {
      await km.bereit();
      var md = await km.mappeFn("umbenennen", [Z.kurs_md, k.id, titel]);
      k.titel = titel; k.herkunft = { titel: "lehrkraft" };      // bleibt, bis der Chat den Titel ersetzt
      await km.stand(md);
      await auswertung();
      zeichne(); geaendert();
    } catch (e) { zeigeFehler(e); feld.value = k.titel; }
    finally { delete umbenennenLaeuft[k.id]; }
  }

  $("karten").addEventListener("change", async function (ev) {
    var k = karteVon(ev.target); if (!k) return;
    if (ev.target.classList.contains("k-typ")) { k.typ = ev.target.value; zeichneKarten(); geaendert(); return; }
    if (ev.target.classList.contains("k-an")) { if (ev.target.checked) delete k.aus; else k.aus = true; zeichneKarten();
        geaendert(); return; }
    if (ev.target.classList.contains("k-titel")) { titelUebernehmen(ev.target); return; }
    if (ev.target.classList.contains("k-bild")) {
      var f = ev.target.files && ev.target.files[0], name = ev.target.dataset.datei;
      ev.target.value = "";
      if (f) S.bildSetzen(f, name);
    }
  });
  $("karten").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.classList.contains("k-titel")) { ev.preventDefault();
        titelUebernehmen(ev.target); }
  });

  $("karten").addEventListener("click", async function (ev) {
    var p = ev.target.closest(".k-plus");
    if (p) {
      var pos = parseInt(p.dataset.pos, 10), id = neueId();
      Z.mappe.bausteine.splice(pos, 0, { id: id, typ: AUTO, titel: "Neuer Baustein", abschnitt: null, minuten: null,
          auftrag: "",
        phase: (Z.mappe.bausteine[Math.max(0, pos - 1)] || {}).phase || "", soll: null, geplant: true, neu: false });
      zeichne(); geaendert();
      var a = document.querySelector("#karte-" + CSS.escape(id) + " .k-auftrag");
      if (a) a.focus();
      return;
    }
    var knopf = ev.target.closest("[data-aktion]"); if (!knopf) return;
    if (knopf.dataset.aktion === "steuern") { Z.mappe.zweig = "steuer"; S.auf[2] = schritt() > 2; zeichne();
        geaendert(); return; }
    var k = karteVon(knopf); if (!k) return;
    var liste = Z.mappe.bausteine, i = liste.indexOf(k), a = knopf.dataset.aktion;
    try {
      if (a === "zur-korrektur") { ev.preventDefault(); zurKorrektur(); }
      else if (a === "sprache") {
        var pos = S.spracheGelb.indexOf(k.id);
        if (pos >= 0) S.spracheGelb.splice(pos, 1); else S.spracheGelb.push(k.id);
        await auswertung();
        S.korrektur.text = ""; zeichneKarten(); zeichneKorrektur(); korrekturSpaeter(0);
        var sk = document.querySelector("#karte-" + CSS.escape(k.id) + " .k-sprache");
        if (sk) sk.focus({ preventScroll: true });
      }
      else if (["weglassen", "selbst", "selbst-uebernehmen", "anderer-chat"].indexOf(a) >= 0) await auswegAktion(a, k);
      else if (a === "neu") {
        // „Diesen Baustein neu beauftragen“ markiert die Karte; Text, Antwort und Einsetzen laufen über den einen
        // Korrekturblock, mehrere Karten zugleich
        if (k.neu) k.neu = false; else k.neu = true;
        S.korrektur.text = ""; zeichneKarten(); zeichneKorrektur(); geaendert(); korrekturSpaeter(0);
        var af = document.querySelector("#karte-" + CSS.escape(k.id) + " .k-auftrag");
        if (k.neu && af) af.focus({ preventScroll: true });
      } else if (a === "hoch" || a === "runter") {
        var j = a === "hoch" ? i - 1 : i + 1;
        if (j < 0 || j >= liste.length) return;
        if (k.geplant || liste[j].geplant) {
          liste[i] = liste[j]; liste[j] = k;          // ohne Inhalt: nur die Reihenfolge der Karten
        } else {
          await km.bereit();
          Z.kurs_md = await km.mappeFn("verschiebe", [Z.kurs_md, k.id, a === "hoch" ? -1 : 1]);
          await km.stand(Z.kurs_md);
        }
        zeichne(); geaendert();
        var neuKnopf = document.querySelector("#karte-" + CSS.escape(k.id) + " .k-" + a);
        if (neuKnopf && !neuKnopf.disabled) neuKnopf.focus();
      } else if (a === "loeschen") {
        S.rueckgaengig = { mappe: JSON.parse(JSON.stringify(Z.mappe)), kurs_md: Z.kurs_md, titel: k.titel };
        if (k.geplant) liste.splice(i, 1);
        else {
          await km.bereit();
          Z.kurs_md = await km.mappeFn("entferne", [Z.kurs_md, k.id]);
          await km.stand(Z.kurs_md);
          await auswertung();
        }
        zeichne(); geaendert();
        $("rueckgaengig-text").textContent = "„" + S.rueckgaengig.titel + "“ gelöscht.";
        $("rueckgaengig").hidden = false;
        $("rueckgaengig-knopf").focus();
      }
    } catch (e) { zeigeFehler(e); }
  });

  $("rueckgaengig-knopf").onclick = async function () {
    if (!S.rueckgaengig) return;
    Z.mappe = S.rueckgaengig.mappe; Z.kurs_md = S.rueckgaengig.kurs_md; S.rueckgaengig = null;
    try { if (Z.geladen) { await km.stand(Z.kurs_md); await auswertung(); } zeichne(); geaendert(); } catch (e) {
        zeigeFehler(e); }
    $("rueckgaengig").hidden = true;          // erst nach dem Neuzeichnen, dann ist die Liste wieder bedienbar
  };

  $("neu-hinzufuegen").onclick = function () {
    var typ = $("neu-typ").value, id = neueId();
    Z.mappe.bausteine.push({ id: id, typ: typ, titel: typ === AUTO ? "Neuer Baustein" : formularname(typ),
        abschnitt: null, minuten: null, auftrag: "",
      phase: "", soll: null, geplant: true, neu: false });
    zeichne(); geaendert();
    var neu = $("karte-" + id);
    if (neu) { neu.scrollIntoView({ block: "center" }); neu.querySelector(".k-titel").focus({ preventScroll: true }); }
  };

  $("zeit-selbst").addEventListener("change", function () {
    if (!Z.mappe) return;
    Z.mappe.zeit_selbst = $("zeit-selbst").checked;
    zeichneKarten(); geaendert();
  });

  // Korrekturblock unter dem Einfügefeld: alle Sätze der Prüfung und die neu beauftragten Karten; die Antwort setzt
  // jeden Baustein nach seiner `id:` ein (kein Modus)
  function neuBeauftragt() { return markiert().filter(function (k) { return !k.geplant; }); }
  function korrekturZiele() {
    var ids = [];
    S.korrekturen.forEach(function (k) { if (k.baustein && ids.indexOf(k.baustein) < 0) ids.push(k.baustein); });
    neuBeauftragt().forEach(function (k) { if (ids.indexOf(k.id) < 0) ids.push(k.id); });
    return ids;
  }
  // `nur` (AP13.33 §1.1, Editor „Neu schreiben lassen“): der Text nur für diese Bausteine, ohne die übrigen Korrekturen
  async function korrekturText(nur) {
    var neu = neuBeauftragt();
    if (!neu.length && !nur) return S.korrekturen.map(function (k) { return k.satz; }).join("\n");
    var ids = nur || korrekturZiele();
    // AP13.11 §8.4: von Hand geänderte Bausteine gehen ungekürzt als „Bisheriger Inhalt“ mit
    var kontext = { _: 900 };
    handIds().forEach(function (id) { kontext[id] = null; });
    var t = await km.prompt("baustein", [Z.mappe, ids, Z.kurs_md, Z.steckbrief_text, null, kontext, Z.pruefung]);
    if (nur) return t;
    var ohne = S.korrekturen.filter(function (k) { return !k.baustein; }).map(function (k) { return k.satz; });
    return t + (ohne.length ? "\n" + ohne.join("\n") + "\n" : "");
  }
  function korrekturSpaeter(ms) {
    clearTimeout(S.korrekturTimer);
    S.korrekturTimer = setTimeout(async function () {
      if (!Z.geladen || !Z.mappe) return;
      try {
        var t = await korrekturText();
        S.korrektur.text = t;
        $("korrektur-feld").value = t;
        $("korrektur-kopieren").disabled = !t || S.kiBesetzt();
      } catch (e) { zeigeFehler(e); }
    }, ms === undefined ? 400 : ms);
  }
  function zeichneKorrektur() {
    var neu = neuBeauftragt(), ziele = korrekturZiele();
    var zeigen = !!Z.mappe && inhalt() && !teileOffen() && (S.korrekturen.length > 0 || neu.length > 0);
    $("korrektur").hidden = !zeigen;
    if (!zeigen) { S.korrektur.offen = false; }
    var ul = $("korrektur-liste"); ul.innerHTML = "";
    S.korrekturen.forEach(function (k) { ul.appendChild(el("li", { "data-regel": k.regel || "", text: k.satz })); });
    neu.forEach(function (k) {
      ul.appendChild(el("li", { cls: "k-neu-zeile", text: "„" + k.titel + "“ neu schreiben" + (k.auftrag && k.auftrag.trim()
          ? ", nach deinem Auftrag." : ".") }));
    });
    var n = ziele.length;
    var nurGelb = !neu.length && S.korrekturen.length > 0 && S.korrekturen.every(function (k) {
        return k.regel === "sprache.lang"; });
    $("korrektur-titel").textContent = nurGelb ? (n === 1 ? "Ein Lesetext bekommt kürzere Sätze" : n +
        " Lesetexte bekommen kürzere Sätze")
      : n > 1 ? n + " Bausteine brauchen eine Korrektur" : n === 1 ? "Ein Baustein braucht eine Korrektur"
      : "Die Einheit braucht eine Korrektur";
    var ki = !!(S.anKiAktiv && S.anKiAktiv());
    $("korrektur-zeile").textContent = (ki ? "„An meine KI senden“ schickt die Bitte an deine KI" :
        "„Korrektur anfordern“ kopiert die Bitte für den Chat") + (S.korrekturen.length + neu.length > 1
      ? " (alle Punkte zusammen)" : "") + (ki ? "; ihre Antwort setzt die Mühle ein." :
        ". Füge sie in deinen Chat ein und die Antwort des Chats hier unten.");
    $("korrektur-kopieren").textContent = ki ? "An meine KI senden" : "Korrektur anfordern";
    modellHinweisZeigen(zeigen);
    $("korrektur-antwort").hidden = !S.korrektur.offen;
    S.standKarte($("korrektur-ergebnis"), S.korrektur.stand, S.korrektur.art);
    if (!S.korrektur.text && !neu.length) S.korrektur.text = S.korrekturen.map(function (k) { return k.satz; })
        .join("\n");
    $("korrektur-feld").value = S.korrektur.text;
    $("korrektur-kopieren").disabled = !S.korrektur.text || S.kiBesetzt();
  }
  // AP13.8: nach der zweiten roten Runde (Zähler `schleife`) einmal je Einheit eine Zeile unter der Korrekturbitte zum
  // Modell, nur im Kopierweg (mit verbundener KI, Testphase, Schlüssel oder Agent, ist das Modell gesetzt). Gemerkt in
  // `modellhinweis`.
  var MODELL_HINWEIS = "Bietet dein Chat mehrere Modelle an, wähle das größte; kleine Modelle liefern die Kursdatei " +
      "öfter in dieser Form.";
  function verbunden() { return !!(S.anKiAktiv && S.anKiAktiv()); }
  S.modellHinweis = null;
  function modellHinweisPruefen(ids) {
    var tag = einheitTag() || "", liste = Z.mappe.modellhinweis = Z.mappe.modellhinweis || [];
    if (verbunden() || liste.indexOf(tag) >= 0 || !ids.some(ausweg)) return;
    liste.push(tag); S.modellHinweis = tag;
  }
  function modellHinweisZeigen(zeigen) {
    var p = $("korrektur-modell");
    if (!p) { p = el("p", { id: "korrektur-modell", cls: "leise", text: MODELL_HINWEIS }); $("korrektur-zeile").after(p); }
    p.hidden = !zeigen || S.modellHinweis !== (einheitTag() || "") || verbunden();
  }
  // Jede Korrekturbitte als Ereignis in der Kursmappe (keine Inhalte): Version, Chat, Typ, Regel, Runde je Einheit
  function korrekturVermerken() {
    if (!Z.mappe) return;
    var liste = Z.mappe.korrekturen = Z.mappe.korrekturen || [], tag = einheitTag();
    // AP13.34 N6: Aufträge für neue Karten („neu.auftrag“) sind keine Korrekturrunde und verbrauchen keine Nummer
    var runde = 1 + liste.filter(function (x) { return (x.einheit || "") === tag && x.regel !== "neu.auftrag"; })
      .reduce(function (m, x) { return Math.max(m, x.runde || 0); }, 0);
    var basis = { version: (S.katalog && S.katalog.version) || "", chat: (chatInfo(Z.mappe.chat) || {}).text || "",
        runde: runde };
    if (tag) basis.einheit = tag;
    S.korrekturen.forEach(function (k) {
      liste.push(Object.assign({ typ: (pruefBaustein(k.baustein) || {}).typ || "", regel: k.regel || "" }, basis));
    });
    neuBeauftragt().forEach(function (k) { liste.push(Object.assign({ typ: k.typ, regel: "neu.auftrag" }, basis)); });
    autosave(); S.rueckmeldungFuellen();
  }
  $("korrektur-kopieren").onclick = function () {
    if (!S.korrektur.text) return;
    S.modellHinweis = null;                        // der Hinweis stand bei dieser Bitte; danach nicht wieder
    S.korrektur.offen = true; S.korrektur.stand = ""; S.korrektur.art = "";
    $("korrektur-antwort").hidden = false; S.standKarte($("korrektur-ergebnis"), "");
    // eigene KI: dieselbe Bitte ins Gespräch der Einheit, die Antwort durch korrekturEinsetzen wie eingefügt
    if (S.anKiAktiv && S.anKiAktiv()) return S.anKi(S.korrektur.text, { einheit: einheitTag(), neu: false,
      ort: $("korrektur-ergebnis"), feld: "korrektur", vorher: korrekturVermerken,
      stand: function (x, art) { S.korrektur.stand = x; S.korrektur.art = art; S.standKarte($("korrektur-ergebnis"), x,
          art); },
      fertig: function (antwort) { $("korrektur-eingabe").value = antwort; return korrekturEinsetzen(); } });
    korrekturVermerken();
    kopieren(S.korrektur.text, $("korrektur-feld"), $("korrektur-stand"),
        "Kopiert. Füge sie in deinen Chat ein und die Antwort des Chats hier unten.",
      function () { km.kurzmeldung($("korrektur-kopieren"), "Text kopiert");
        $("korrektur-eingabe").focus({ preventScroll: true }); });
  };
  function zurKorrektur() {
    var b = $("korrektur");
    if (b.hidden) return;
    b.scrollIntoView({ behavior: "smooth", block: "start" });
    $("korrektur-kopieren").focus({ preventScroll: true });
  }
  // Antwort auf die Korrekturbitte einsetzen, nach `id:` (kein Modus). AP13.11 §8.3: Text, Meldungsort und Feld sind
  // Parameter, damit der Korrekturblock und der Editor („Neu schreiben lassen“) dieselbe Funktion rufen. o: {text,
  // stand(satz, art), diagnose(d oder null), leeren(), sprung (zurück nach Schritt 5, nur der Korrekturblock), fokus,
  // nur (AP13.33: Baustein, an den ein Block ohne passende id geht; der Editor setzt je Feld seinen)}
  // -> true, wenn eingesetzt
  function korrekturBlock() {
    return { text: $("korrektur-eingabe").value, sprung: true, fokus: true,
      stand: function (x, art) { S.korrektur.stand = x; S.korrektur.art = art || ""; S.standKarte($("korrektur-ergebnis"),
          x, art); },
      diagnose: function (d) { S.diagnoseKarte($("korrektur-diagnose"), d); },
      leeren: function () { $("korrektur-eingabe").value = ""; } };
  }
  async function korrekturEinsetzen(o) {
    o = o || korrekturBlock();
    var text = o.text || "";
    if (!text.trim()) return false;
    var eigen = S.eigenerText(text);
    if (eigen) { o.stand(S.EIGEN[eigen], "fehler"); return false; }
    try {
      await km.bereit();
      var saetzeVorher = S.korrekturen.map(function (k) { return k.satz; }).join("\n");
      var ziele = korrekturZiele(), ohne = S.korrekturen.some(function (k) { return !k.baustein; });
      var ie = await km.mappeFn("ids_ergaenzen", [Z.mappe, text]);     // AP13.30 §4a: id aus Typ und Titel
      text = ie.text;
      var mo = await km.mappeFn("modus", [Z.mappe, text]);
      if (mo.modus === "keine") {
        o.stand("", "");
        o.diagnose(await km.prompt("diagnose", [text])); return false;
      }
      o.diagnose(null);
      var nur = o.nur || (ziele.length === 1 ? ziele[0] : null);
      // AP13.33 §1.2: neu beauftragte Bausteine gelten nach dem Einsetzen als „neu geschrieben“ (wie eine Handänderung;
      // Stand davor = Fassung der letzten Antwort)
      // Ein neu geschriebener Baustein, für den diese Bitte eine Korrektur verlangt (rot nach der Neufassung), fragt nicht:
      // die Antwort ist die erbetene Korrektur der Neufassung, er bleibt „neu geschrieben“
      var hand0 = Z.mappe.hand || {}, korrNeu = ziele.filter(function (id) { return hand0[id] && hand0[id].art === "neu"; });
      var neuIds = neuBeauftragt().map(function (k) { return k.id; }).concat(korrNeu), neuVorher = {};
      neuIds.forEach(function (id) {
        var h = hand0[id], b = pruefBaustein(id);
        neuVorher[id] = h ? h.vorher : b ? b.text : null;
      });
      // §4: betrifft die Antwort von Hand geänderte Bausteine, fragt die Seite vorher (neu beauftragte zählen nicht)
      var frageMappe = Z.mappe;
      if (korrNeu.length) {
        var ohneKorr = {};
        Object.keys(hand0).forEach(function (id) { if (korrNeu.indexOf(id) < 0) ohneKorr[id] = hand0[id]; });
        frageMappe = Object.assign({}, Z.mappe, { hand: ohneKorr });
      }
      var hv = await handVorEinsetzen(frageMappe, Z.kurs_md, text, "baustein", nur, null);
      if (hv.bausteine === 0) { o.leeren(); o.stand(S.editorText("hand_bleibt"), "ok"); return false; }
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, hv.text, nur, true]);
      var ids = r.ersetzt.concat(r.eingefuegt);
      if (!ids.length && ohne && mo.modus === "ersetzen") {
        // ganze Kursdatei ohne passende ids: ersetzt die Einheit, also fragt die Seite für alle Handfassungen
        hv = await handVorEinsetzen(Z.mappe, Z.kurs_md, text, "ersetzen", null, null);
        await km.stand((await km.mappeFn("antwort", [hv.text])).kursdatei);
        ids = Z.pruefung.bausteine.map(function (b) { return b.id; }).filter(function (id) {
          return hv.wahl !== "erhalten" || hv.ids.indexOf(id) < 0; });
      } else if (!ids.length) {
        o.stand(r.fehler.join(" ") || "Kein Baustein der Antwort passte zu einer Karte.", "fehler");
        return false;
      } else await km.stand(r.kurs_md);
      var fr = fragenStand(ids);
      handNachEinsetzen(ids, hv);
      r.ersetzt.forEach(function (id) {             // nicht bei „Einheit ersetzen“ (ganze Kursdatei ohne passende ids)
        if (neuIds.indexOf(id) < 0 || neuVorher[id] === null || neuVorher[id] === undefined) return;
        var hand = Z.mappe.hand = Z.mappe.hand || {};
        hand[id] = { vorher: neuVorher[id], zeit: Date.now(), art: "neu" };
      });
      Z.mappe.bausteine.forEach(function (k) { if (ids.indexOf(k.id) >= 0) k.neu = false; });
      S.spracheGelb = S.spracheGelb.filter(function (id) { return ids.indexOf(id) < 0; });
      await nachAntwortMarkieren(ie.ids, teileOffen());
      if (o.sprung && schritt() !== 5) { Z.mappe.schritt = 5; S.auf = {}; }
      await auswertung();
      durchsichtNach(fr);
      var gleich = schleifeMerken(ids, true);
      o.leeren();
      var rot = fehlerZahl(), satz = "Eingesetzt: " + ids.length + (ids.length === 1 ? " Baustein" : " Bausteine") +
          ".";
      if (!rot && !neuBeauftragt().length) {
        S.korrektur = { text: "", offen: false, stand: "", art: "" };
        var gelb = gelbZahl();       // AP13.34 §3.3: mit gelben Hinweisen nicht „alles in Ordnung“
        if (o.sprung) S.standKarte($("eingabe-stand"), satz + (gelb ? " Keine Fehler. " + gelb + (gelb === 1 ? " Hinweis"
            : " Hinweise") + "; sieh sie durch und geh dann weiter." : " Alle Bausteine sind in Ordnung; sieh sie durch und geh dann weiter."), "ok");
        else o.stand(satz, "ok");
      } else {
        // „neu“ nur, wenn sich die Sätze geändert haben; derselbe Text wie vorher wird beim Namen genannt
        var neuSaetze = S.korrekturen.map(function (k) { return k.satz; }).join("\n") !== saetzeVorher;
        var weg = ids.some(ausweg) ? " Unter der Karte stehen jetzt drei Wege, wie es weitergeht." : "";
        var x = gleich.length
          ? "Die Antwort für „" + gleich[0] + "“ ist dieselbe wie vorher (Runde " +
              schleife()[ids.filter(function (id) { return schleife()[id] && schleife()[id].gleich; })[0]].rot + ")."
            + (weg || " Kopiere die Bitte noch einmal oder nimm einen anderen Chat.")
          : satz + " Noch " + (rot === 1 ? "ein Fehler" : rot + " Fehler") + (neuSaetze ?
              "; die Bitte oben ist neu, kopiere sie noch einmal." : "; die Bitte oben ist dieselbe wie vorher.") + weg;
        x += r.fehler.length ? " " + r.fehler.join(" ") : "";
        o.stand(x, "fehler");
        if (o.sprung) { S.korrektur.stand = x; S.korrektur.art = "fehler"; }
        S.korrektur.text = "";
        modellHinweisPruefen(ids);
      }
      zeichne(); geaendert(); korrekturSpaeter(0);
      if (o.fokus) {
        var f = !$("korrektur").hidden ? $("korrektur-kopieren") : $("weiter-5");
        if (f && !f.hidden) f.focus({ preventScroll: true });
      }
      return true;
    } catch (e) { zeigeFehler(e); return false; }
  }
  var korrekturEingabeTimer = null;
  $("korrektur-eingabe").addEventListener("input", function (ev) {
    clearTimeout(korrekturEingabeTimer);
    korrekturEingabeTimer = setTimeout(function () { korrekturEinsetzen(); }, ev.inputType === "insertFromPaste" ? 30 : 500);
  });
  $("korrektur-uebernehmen").onclick = function () { clearTimeout(korrekturEingabeTimer); korrekturEinsetzen(); };
  Object.assign(S, { uebersichtAendern: uebersichtAendern, gliederungAendern: gliederungAendern,
    nachAntwortMarkieren: nachAntwortMarkieren, naechsteNummer: naechsteNummer,
    handFrage: handFrage, handGeaendert: handGeaendert, handIds: handIds, nummer: nummer, durchsichtNeuText: durchsichtNeuText,
    handNachEinsetzen: handNachEinsetzen, handUebernehmen: handUebernehmen, handVorEinsetzen: handVorEinsetzen,
    handZuruecknehmen: handZuruecknehmen, korrekturEinsetzen: korrekturEinsetzen, korrekturText: korrekturText,
    korrekturVermerken: korrekturVermerken, knoepfe: knoepfe, korrekturSpaeter: korrekturSpaeter, neuBeauftragt: neuBeauftragt,
    schleifeMerken: schleifeMerken, typAuswahl: typAuswahl, zeichneDiagnosen: zeichneDiagnosen,
    zeichneKarten: zeichneKarten, zeichneKorrektur: zeichneKorrektur, zuKarte: zuKarte });
})();
