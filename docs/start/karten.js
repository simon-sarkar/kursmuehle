/* Kursmühle – Kartenliste mit Prüfstatus, Auswege aus der Schleife, Hinweise am Rand und der Korrekturblock. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, AUTO = S.AUTO, Z = S.Z, auswertung = S.auswertung, autosave = S.autosave, chatInfo = S.chatInfo,
      einheitTag = S.einheitTag, el = S.el, fehlerZahl = S.fehlerZahl, formularname = S.formularname,
      geaendert = S.geaendert, hoehe = S.hoehe, inhalt = S.inhalt, kopieren = S.kopieren, markiert = S.markiert,
      mitMinuten = S.mitMinuten, nrVon = S.nrVon, schritt = S.schritt, status = S.status, teileOffen = S.teileOffen,
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
  function neueId() {
    var ids = {}, n = 1;
    Z.mappe.bausteine.forEach(function (k) { ids[k.id] = 1; });
    while (ids["b" + n]) n += 1;
    return "b" + n;
  }

  function zeichneKarten() {
    var ol = $("karten"); ol.innerHTML = "";
    var liste = Z.mappe.bausteine, letzter = null, steuer = zweig() === "steuer";
    var abschnitte = liste.filter(function (k) { return k.abschnitt; }).map(function (k) { return k.abschnitt; });
    var mehrere = abschnitte.some(function (a) { return a !== abschnitte[0]; });
    var zeitplanung = zeitSelbst() && steuer;
    var zeitInfo = (Z.kennzahlen && Z.kennzahlen.zeit) || {};
    liste.forEach(function (k, i) {
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
      var typFeld = k.geplant && steuer ? typAuswahl(k.typ, "Typ von Baustein " + (i + 1))
        : !steuer ? el("button", { type: "button", cls: "k-typ k-typ-mach", "data-aktion": "steuern",
            title: "Ändern in „Ich steuere“", text: formularname(k.typ) })
        : el("span", { cls: "k-typ", text: formularname(k.typ) });
      var diag = el("ul", { cls: "k-diagnosen" });
      if (Z.pruefung && !k.geplant && !warten) {
        Z.pruefung.diagnosen.filter(function (d) { return d.baustein === k.id && d.stufe !== "hinweis"; })
            .forEach(function (d) {
          diag.appendChild(el("li", { cls: d.stufe, "data-regel": d.regel || "", text: (d.zeile_im_baustein ? "Zeile " +
              d.zeile_im_baustein + ": " : "") + d.text }));
        });
      }
      var sl = schleife()[k.id];
      if (sl && sl.gleich && st === "fehler") diag.appendChild(el("li", { cls: "warnung k-gleich",
          text: "Die Antwort für „" + k.titel + "“ ist dieselbe wie vorher (Runde " + sl.rot + ")." }));
      // Ist-Minuten aus dem Inhalt (Rolle und Jahrgang); Zeitfelder und die Lücke nur mit „Zeitplanung anzeigen“
      var z = zeitInfo[k.id], ist = null;
      if (minuten && z && z.gerechnet) {
        ist = el("span", { cls: "k-ist geschaetzt", text: "gerechnet " + z.gerechnet + " min" });
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
          el("span", { cls: "k-nr", text: String(i + 1) }), typFeld,
          el("span", { cls: "k-status", title: stText }, [el("span", { cls: "punkt", "aria-hidden": "true" }),
              stText])]),
        el("input", { cls: "k-titel von-" + herkunft, "data-herkunft": herkunft, type: "text", value: k.titel,
            readonly: !steuer,
          "aria-label": "Titel von Baustein " + (i + 1) + (herkunft === "chat" ? " (vom Chat)" : " (von dir)") }),
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
            text: "Auftrag für Baustein " + (i + 1) }),
          el("textarea", { cls: "k-auftrag von-lehrkraft", rows: "1",
              placeholder: "Was soll hinein? Ein Satz genügt (optional)" })]) : null,
        diag,
        korrektur.length && !warten ? el("p", { cls: "k-korrektur" }, [
          el("a", { href: "#korrektur", cls: "k-zur-korrektur", "data-aktion": "zur-korrektur",
              text: "Zur Korrektur unter dem Feld" })]) : null,
        st === "fehler" && ausweg(k.id) ? auswegBlock(k, b) : null,
        hochladen, inhaltEl,
        steuer ? el("div", { cls: "k-aktionen" }, [
          el("button", { type: "button", cls: "k-hoch klein", "data-aktion": "hoch", "aria-label": "Baustein " + (i +
              1) + " nach oben", disabled: i === 0, text: "↑" }),
          el("button", { type: "button", cls: "k-runter klein", "data-aktion": "runter", "aria-label": "Baustein " +
              (i + 1) + " nach unten", disabled: i === liste.length - 1, text: "↓" }),
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
    var pr = await km.mappeFn("antwort", [text]);
    var m = pr.diagnosen.filter(function (d) { return d.stufe !== "hinweis"; }).map(function (d) {
      return { stufe: d.stufe, text: (d.zeile_im_baustein ? "Zeile " + d.zeile_im_baustein + ": " : "") + d.text };
    });
    if (!pr.bausteine.length) m.unshift({ stufe: "fehler",
        text: "Kein Baustein: die erste Zeile ist die Überschrift `### Typ: Titel`." });
    if (!m.length) m = [{ stufe: "ok", text: "Geprüft, keine Fehler." }];
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
      await km.bereit();
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text, k.id, true]);
      if (!r.ersetzt.length && !r.eingefuegt.length) { selbst[k.id].meldungen = [{ stufe: "fehler",
          text: r.fehler.join(" ") || "Der Text ergibt keinen Baustein." }]; zeichneKarten(); return; }
      await km.stand(r.kurs_md);
      delete selbst[k.id]; delete schleife()[k.id];
      await auswertung();
      zeichne(); geaendert();
      status("Baustein übernommen", "ok");
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

  function zeichneDiagnosen() {
    var k = Z.kennzahlen;
    S.zeichnePlanung();
    var setze = function (id, wert, warn) { var e = $(id); e.textContent = wert; e.parentNode.classList.toggle("warn",
        !!warn); };
    if (!k) {
      ["kz-minuten", "kz-folge", "kz-mc", "kz-rueckmeldung", "kz-uebung"].forEach(function (id) { setze(id, "–"); $(id)
          .parentNode.hidden = false; });
      $("kz-zahl-z").hidden = true;
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
  async function korrekturText() {
    var neu = neuBeauftragt();
    if (!neu.length) return S.korrekturen.map(function (k) { return k.satz; }).join("\n");
    var ids = korrekturZiele();
    var t = await km.prompt("baustein", [Z.mappe, ids, Z.kurs_md, Z.steckbrief_text, null, 900, Z.pruefung]);
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
      ul.appendChild(el("li", { cls: "k-neu-zeile", text: "„" + k.titel +
          "“ neu schreiben, nach deinem Auftrag an der Karte." }));
    });
    var n = ziele.length;
    $("korrektur-titel").textContent = n > 1 ? n + " Bausteine brauchen eine Korrektur" : n === 1 ?
        "Ein Baustein braucht eine Korrektur"
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
    var liste = Z.mappe.korrekturen = Z.mappe.korrekturen || [], tag = einheitTag();
    var runde = 1 + liste.filter(function (x) { return (x.einheit || "") === tag; }).reduce(function (m, x) {
        return Math.max(m, x.runde || 0); }, 0);
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
  async function korrekturEinsetzen() {
    var text = $("korrektur-eingabe").value;
    if (!text.trim()) return;
    var eigen = S.eigenerText(text);
    if (eigen) { S.korrektur.stand = S.EIGEN[eigen]; S.korrektur.art = "fehler"; S.standKarte($("korrektur-ergebnis"),
        S.korrektur.stand, "fehler"); return; }
    try {
      await km.bereit();
      var saetzeVorher = S.korrekturen.map(function (k) { return k.satz; }).join("\n");
      var ziele = korrekturZiele(), ohne = S.korrekturen.some(function (k) { return !k.baustein; });
      var mo = await km.mappeFn("modus", [Z.mappe, text]);
      if (mo.modus === "keine") {
        S.korrektur.stand = ""; S.korrektur.art = "";
        S.standKarte($("korrektur-ergebnis"), "");
        S.diagnoseKarte($("korrektur-diagnose"), await km.prompt("diagnose", [text])); return;
      }
      S.diagnoseKarte($("korrektur-diagnose"), null);
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text, ziele.length === 1 ? ziele[0] : null, true]);
      var ids = r.ersetzt.concat(r.eingefuegt);
      if (!ids.length && ohne && mo.modus === "ersetzen") {
        await km.stand((await km.mappeFn("antwort", [text])).kursdatei);     // ganze Kursdatei ohne passende ids
        ids = Z.pruefung.bausteine.map(function (b) { return b.id; });
      } else if (!ids.length) {
        S.korrektur.stand = r.fehler.join(" ") || "Kein Baustein der Antwort passte zu einer Karte.";
            S.korrektur.art = "fehler";
        S.standKarte($("korrektur-ergebnis"), S.korrektur.stand, "fehler"); return;
      } else await km.stand(r.kurs_md);
      Z.mappe.bausteine.forEach(function (k) { if (ids.indexOf(k.id) >= 0) k.neu = false; });
      Z.mappe.durchsicht = false;
      if (schritt() !== 5) { Z.mappe.schritt = 5; S.auf = {}; }
      await auswertung();
      var gleich = schleifeMerken(ids, true);
      $("korrektur-eingabe").value = "";
      var rot = fehlerZahl(), satz = "Eingesetzt: " + ids.length + (ids.length === 1 ? " Baustein" : " Bausteine") +
          ".";
      if (!rot && !neuBeauftragt().length) {
        S.korrektur = { text: "", offen: false, stand: "", art: "" };
        S.standKarte($("eingabe-stand"), satz + " Alle Bausteine sind in Ordnung; sieh sie durch und geh dann weiter.",
            "ok");
        status("Korrektur eingesetzt", "ok");
      } else {
        // „neu“ nur, wenn sich die Sätze geändert haben; derselbe Text wie vorher wird beim Namen genannt
        var neuSaetze = S.korrekturen.map(function (k) { return k.satz; }).join("\n") !== saetzeVorher;
        var weg = ids.some(ausweg) ? " Unter der Karte stehen jetzt drei Wege, wie es weitergeht." : "";
        S.korrektur.stand = gleich.length
          ? "Die Antwort für „" + gleich[0] + "“ ist dieselbe wie vorher (Runde " +
              schleife()[ids.filter(function (id) { return schleife()[id] && schleife()[id].gleich; })[0]].rot + ")."
            + (weg || " Kopiere die Bitte noch einmal oder nimm einen anderen Chat.")
          : satz + " Noch " + (rot === 1 ? "ein Fehler" : rot + " Fehler") + (neuSaetze ?
              "; die Bitte oben ist neu, kopiere sie noch einmal." : "; die Bitte oben ist dieselbe wie vorher.") + weg;
        S.korrektur.stand += r.fehler.length ? " " + r.fehler.join(" ") : "";
        S.korrektur.art = "fehler"; S.korrektur.text = "";
        modellHinweisPruefen(ids);
      }
      zeichne(); geaendert(); korrekturSpaeter(0);
      var f = !$("korrektur").hidden ? $("korrektur-kopieren") : $("weiter-5");
      if (f && !f.hidden) f.focus({ preventScroll: true });
    } catch (e) { zeigeFehler(e); }
  }
  var korrekturEingabeTimer = null;
  $("korrektur-eingabe").addEventListener("input", function (ev) {
    clearTimeout(korrekturEingabeTimer);
    korrekturEingabeTimer = setTimeout(korrekturEinsetzen, ev.inputType === "insertFromPaste" ? 30 : 500);
  });
  $("korrektur-uebernehmen").onclick = function () { clearTimeout(korrekturEingabeTimer); korrekturEinsetzen(); };
  Object.assign(S, { knoepfe: knoepfe, korrekturSpaeter: korrekturSpaeter, neuBeauftragt: neuBeauftragt,
    schleifeMerken: schleifeMerken, typAuswahl: typAuswahl, zeichneDiagnosen: zeichneDiagnosen,
    zeichneKarten: zeichneKarten, zeichneKorrektur: zeichneKorrektur, zuKarte: zuKarte });
})();
