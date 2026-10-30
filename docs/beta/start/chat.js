/* Kursmühle – Text für den Chat (Auswahl, Stückelung, Kopieren) und Einfügen der Antwort mit Diagnose. */
"use strict";

(function () {
  if (!document.getElementById("schritt-5")) return;
  var S = km.seite;
  var $ = S.$, KOPIERT = S.KOPIERT, Z = S.Z, auswertung = S.auswertung, autosave = S.autosave, chatInfo = S.chatInfo,
      einheitTag = S.einheitTag, el = S.el, erledigtBis = S.erledigtBis, felderFuellen = S.felderFuellen,
      geaendert = S.geaendert, inhalt = S.inhalt, karteNach = S.karteNach, kb = S.kb, kopieren = S.kopieren,
      nrVon = S.nrVon, schleifeMerken = S.schleifeMerken, schritt = S.schritt, sektion = S.sektion,
      teileOffen = S.teileOffen, texte = S.texte, zeichne = S.zeichne, zeichneSchritte = S.zeichneSchritte,
      zeigeFehler = S.zeigeFehler, zweig = S.zweig;
  function ki() { return !!(S.anKiAktiv && S.anKiAktiv()); }     // „Eigene KI“ verbunden: senden statt kopieren
  function besetzt() { return ki() && !!S.kiLaeuft; }             // ein Auftrag an die eigene KI läuft: Knöpfe grau
  function textGroesse() { return texte.teile.length ? new Blob([texte.teile[0]]).size : 0; }

  function textArt() {
    if (zweig() !== "steuer") return Z.mappe && Z.mappe.anhaengen ? "leer" : "einheit";
    return (document.querySelector("input[name=text-art]:checked") || {}).value || "einheit";
  }

  function zeichneChat() {
    var gewaehlt = !!(Z.mappe && Z.mappe.chat && chatInfo(Z.mappe.chat));
    $("chat-wahl").hidden = gewaehlt && !S.chatWahlOffen;
    $("chat-text").hidden = !gewaehlt || S.chatWahlOffen;   // „Anderer Chat“: nur die Kacheln, der Text bleibt erhalten
    Array.prototype.forEach.call(document.querySelectorAll("#chat-knoepfe [data-chat]"), function (b) {
      b.setAttribute("aria-pressed", String(gewaehlt && b.dataset.chat === Z.mappe.chat));
    });
    zeichnePlanung();
    if (!gewaehlt) return;
    var c = chatInfo(Z.mappe.chat);
    var eigene = Z.mappe.bausteine.filter(function (k) { return (k.einheit || "") === einheitTag(); });
    var leer = eigene.filter(function (k) { return k.geplant; }).length;
    var voll = eigene.filter(function (k) { return !k.geplant; }).length;
    $("art-leer-l").hidden = !(leer && voll);
    // AP13.31: Plan mit mehr als einer Kachel („Ich steuere“, vor der ersten Antwort): ein Text je Kachel als Wahl
    $("art-kachel-l").hidden = !(S.planKachelZahl && S.planKachelZahl() > 1);
    $("art-kachel-t").textContent = S.editorText("plan_kachel_fuer_kachel");
    var art = document.querySelector("input[name=text-art]:checked");
    if (art && art.closest("label").hidden) {
      document.querySelector("input[name=text-art][value=einheit]").checked = true;
      if (texte.art !== "einheit") textSpaeter(0);
    }
    $("chat-aufwand").hidden = !c.aufwand;
    $("chat-aufwand").textContent = c.aufwand || "";
    var tw = $("teil-wahl"); tw.innerHTML = "";
    tw.hidden = texte.teile.length < 2;
    texte.teile.forEach(function (_, i) {
      tw.appendChild(el("button", { type: "button", cls: "klein teil-knopf", "data-teil": i,
          "aria-pressed": i === texte.teil ? "true" : "false",
        text: "Teil " + (i + 1) + (texte.kopiert[i] ? (ki() ? " (gesendet)" : " (kopiert)") : "") }));
    });
    var t = texte.teile[texte.teil] || "";
    $("chat-zeile").textContent = !t ? (Z.geladen ?
        "Der Text entsteht …" : "Der Text entsteht, sobald die Seite bereit ist.")
      : "Für " + c.text + (texte.teile.length > 1 ? ", Teil " + (texte.teil + 1) + " von " + texte.teile.length +
          (ki() ? ". Die Mühle sendet Teil für Teil und setzt jede Antwort ein." :
            ". Je Teil: in dasselbe Gespräch einfügen, die Antwort in Schritt " + nrVon(5) +
          " übernehmen, dann der nächste Teil.") : "") + " · " + kb(new Blob([t]).size);
    if ($("chat-text-feld").value !== t) $("chat-text-feld").value = t;
    $("text-kopieren").disabled = !t || besetzt();
    $("eingabe-satz").hidden = ki();
    $("text-kopieren").textContent = texte.teile.length > 1 ? "Teil " + (texte.teil + 1) +
        (ki() ? " an meine KI senden" : " kopieren") : ki() ? "An meine KI senden" : "Text kopieren";
    $("infobox-ok").textContent = ki() ? "Verstanden, Text senden" : "Verstanden, Text kopieren";
  }

  // Plan der Einheit (gen/mappe.py planung): Warnung vor dem Kopieren und an der Kartenliste, keine Sperre
  function planungText() {
    var p = Z.kennzahlen && Z.kennzahlen.planung;
    if (!p || (!p.zu_wenig && !p.fehlen.length)) return "";
    return [p.zu_wenig ? p.text + ". Bausteine ergänzen?" : ""].concat(p.fehlen.map(function (f) { return f + "."; }))
        .filter(Boolean).join(" ");
  }
  function zeichnePlanung() {
    var t = planungText();
    $("kopier-warnung").hidden = !t || !Z.mappe || !chatInfo(Z.mappe.chat);
    $("kopier-warnung-text").textContent = t;
    $("karten-warnung").hidden = !t || zweig() !== "steuer";
    $("karten-warnung").textContent = t;
    var pw = $("plan-warnung");                    // AP13.31: dieselbe Warnung im Plan („Ich steuere“)
    if (pw) { pw.hidden = !t || zweig() !== "steuer"; pw.textContent = t; }
  }
  $("auffuellen").onclick = async function () {
    if (!Z.mappe) return;
    try {
      await km.bereit();
      // wie km.stand: nur die Bausteine aus der Antwort; was die Seite inzwischen gesetzt hat (Schritt, Durchsicht,
      // Chat), bleibt; eine inzwischen geöffnete andere Mappe bleibt unberührt
      var gesendet = Z.mappe, neu = await km.mappeFn("auffuellen", [gesendet]);
      if (Z.mappe !== gesendet) return;
      km.mappeUebernehmen(gesendet, neu);
      Z.kennzahlen = await km.mappeFn("kennzahlen", [Z.mappe, Z.pruefung, null, Z.steckbrief_text]);
      zeichne(); geaendert(); textSpaeter(0);
      $("kopiert").textContent = "Bausteine ergänzt. Sie stehen jetzt im Text unten.";
      $("kopiert").className = "stand ok";
    } catch (e) { zeigeFehler(e); }
  };

  function textSpaeter(ms) {
    clearTimeout(S.textTimer);
    S.textTimer = setTimeout(texteErzeugen, ms === undefined ? 400 : ms);
  }
  // AP13.30: das Versprechen erfüllt sich erst mit dem Text des neuesten Laufs (der Editor wartet darauf)
  function texteErzeugen() { var p = texteLauf(); texte.lauf = p; return p; }
  async function texteLauf() {
    if (!Z.geladen || !Z.mappe || !Z.mappe.chat) { if (Z.mappe) zeichneChat(); return; }
    var nr = ++texte.laeuft;
    var art = textArt(), md0 = pruefsumme(Z.kurs_md), mappe0 = Z.mappe;
    try {
      // Teile aus gen/prompt.py: nur die laufende Einheit; nach dem ersten Kopieren gilt die eingefrorene Stückelung
      var e = await km.prompt("einheit", [Z.mappe, Z.steckbrief_text, null, null, art === "leer", null, true,
          art === "kachel"]);
      var teile = e.teile;
      basis(mappe0, md0, teile);                    // AP13.35 §3.3: auch ein überholter Lauf setzt den Stand
      if (nr !== texte.laeuft) return texte.lauf;   // ein neuerer Lauf ist schon unterwegs
      if (art !== texte.art || teile.length !== texte.teile.length) { texte.teil = 0; texte.kopiert = {}; }
      texte.art = art; texte.teile = teile; texte.ids = e.ids || [];
      veraltetPruefen();
      if (texte.teil >= teile.length) texte.teil = 0;
      zeichneChat();
      felderFuellen();
    } catch (e) { zeigeFehler(e); }
  }

  $("chat-knoepfe").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-chat]"); if (!b || !Z.mappe) return;
    Z.mappe.chat = b.dataset.chat;
    S.chatWahlOffen = false;
    zeichneChat(); geaendert(); zeichneSchritte();
    // AP13.33 §2.1: „Text kopieren“ ist gesperrt, bis der Text da ist; der Fokus geht danach dorthin
    clearTimeout(S.textTimer);
    var platz = S.fokus(["text-kopieren", "chat-aendern"], true);
    texteErzeugen().then(function () {
      var a = document.activeElement;
      if (a === platz || a === document.body || !a.getClientRects().length) S.fokus(["text-kopieren", "chat-aendern"], true);
    });
  });
  $("chat-aendern").onclick = function () {
    S.chatWahlOffen = true;
    if (schritt() > 4) S.auf[4] = true;
    zeichneSchritte(); zeichneChat();
    sektion(4).scrollIntoView({ block: "start" });
    var k = $("chat-knoepfe").querySelector("[aria-pressed=true]") || $("chat-knoepfe").querySelector("button");
    if (k) k.focus({ preventScroll: true });
  };
  Array.prototype.forEach.call(document.querySelectorAll("input[name=text-art]"), function (r) {
    r.addEventListener("change", function () { $("kopiert").textContent = ""; textSpaeter(0); });
  });
  $("teil-wahl").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-teil]"); if (!b) return;
    texte.teil = parseInt(b.dataset.teil, 10); $("kopiert").textContent = ""; zeichneChat();
  });

  // AP13.35 §3.3: beim Kopieren merkt die Mappe den Text (`kopiert` = {text, md}: Prüfsummen von Text und Kursdatei).
  // Ändert sich danach der Text, ohne dass eine Antwort oder Handänderung die Kursdatei geändert hat (anderer Weg,
  // Schwerpunkt, Plan), fällt „kopiert“ weg; Schritt 4 sagt „Text geändert, noch einmal kopieren“. Ändert sich die
  // Kursdatei, gilt der neue Text als Stand (er nennt die eingesetzten Bausteine). Ältere Mappen (`kopiert: true`) ohne.
  function pruefsumme(t) {
    var s = String(t || ""), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + "." + s.length;
  }
  function textStand(teile) { return pruefsumme((teile || texte.teile).join("\u0000")); }
  // Ein Lauf, der mit einer neuen Kursdatei begann, setzt den Stand: sein Text entstand aus denselben Angaben wie der
  // kopierte. km.stand stößt ihn nach jeder neuen Kursdatei sofort an (S.nachStand), damit eine Wahl danach nicht in den
  // Stand rutscht
  function basis(mappe, md, teile) {
    var k = mappe && mappe.kopiert;
    if (k && typeof k === "object" && k.md !== md && teile.length) { k.md = md; k.text = textStand(teile); }
  }
  S.nachStand = function () {
    var k = Z.mappe && Z.mappe.kopiert;
    if (k && typeof k === "object" && k.md !== pruefsumme(Z.kurs_md)) texteErzeugen();
  };
  function veraltetPruefen() {
    var k = Z.mappe && Z.mappe.kopiert;
    if (!k || typeof k !== "object" || !texte.teile.length || k.md !== pruefsumme(Z.kurs_md)) { texte.veraltet = false; return; }
    var alt = !!texte.veraltet;
    texte.veraltet = k.text !== textStand();
    if (texte.veraltet && !alt) { texte.kopiert = {}; $("kopiert").textContent = ""; }
    if (texte.veraltet !== alt) zeichneSchritte();
  }
  // AP13.5h a5: ging der Text an die eigene KI, sagt das Fazit von Schritt 4 „Text gesendet“; ohne Merker (neu
  // geladen) gilt der gewählte Chat
  var gesendetAn = new WeakMap();
  function textGesendet() {
    var m = Z.mappe;
    return !!m && (gesendetAn.has(m) ? gesendetAn.get(m) : m.chat === "eigene");
  }
  function textKopiert(gesendet) {
    var kopierterTeil = texte.teil + 1;
    eingabeZu(false);                              // neuer Text: das Einfügefeld gehört wieder dazu
    texte.kopiert[texte.teil] = true;
    if (!Z.mappe) return;
    Z.mappe.kopiert = { text: textStand(), md: pruefsumme(Z.kurs_md) };
    texte.veraltet = false;
    gesendetAn.set(Z.mappe, !!gesendet);
    // beim ersten Kopieren eines gestückelten Textes Teilzahl und Zuordnung der Karten einfrieren
    if (texte.teile.length > 1 && !Z.mappe.stueckelung) {
      Z.mappe.stueckelung = { einheit: einheitTag() || null, leer: texte.art === "leer", ids: texte.ids,
          eingefuegt: [] };
    }
    var naechster = texte.teile.length > 1 ? texte.teile.findIndex(function (_, i) { return !texte.kopiert[i]; }) : -1;
    if (schritt() < 5) { erledigtBis(5); Z.mappe.schritt = 5; S.auf = {}; }
    zeichne(); autosave();
    if (naechster >= 0) {
      texte.teil = naechster; zeichneChat();
      $("kopiert").textContent = gesendet ? "Teil " + kopierterTeil + " gesendet; die Antwort kommt in Schritt " +
          nrVon(5) + ", danach geht Teil " + (naechster + 1) + " an deine KI."
        : "Teil " + kopierterTeil + " kopiert. Füge ihn " + (kopierterTeil === 1 ?
          "in ein neues Gespräch" : "in dasselbe Gespräch") + " ein und die Antwort in Schritt " + nrVon(5)
        + "; danach kommt Teil " + (naechster + 1) + " dran.";
    } else if (gesendet) $("kopiert").textContent = "Gesendet; die Antwort kommt in Schritt " + nrVon(5) + ".";
  }
  // Teil n an die eigene KI: Teil 1 in ein neues Gespräch, jeder weitere in dasselbe; die Antwort läuft durch
  // eingabeUebernehmen wie eingefügt, danach geht der nächste Teil von selbst (AP13.8; rote Karten halten die Kette
  // nicht an). „Anhalten“ in der Zeile „Teil n von m · Deine KI schreibt“ stoppt nach dem laufenden Teil; danach geht
  // jeder Teil dieser Einheit mit einem Klick (#teil-weiter)
  S.angehalten = {};
  S.restSatz = ""; S.restZahl = 0;                // Zahl der fehlenden Karten nach der letzten Bitte um den Rest
  function kette() { return ki() && !S.angehalten[einheitTag() || ""]; }
  function eingefuegtZahl() { var st = Z.mappe && Z.mappe.stueckelung; return st ? (st.eingefuegt || []).length : -1; }
  function weiterSenden(vorher) {
    var st = Z.mappe && Z.mappe.stueckelung;
    if (kette() && st && teileOffen() && (st.eingefuegt || []).length > vorher && naechsterTeil() >= 0)
      textSenden(naechsterTeil());
  }
  function anhaltenKnopf(ort) {
    if (ort.querySelector("#teil-anhalten")) return;
    var b = el("button", { type: "button", cls: "textlink", id: "teil-anhalten", text: "Anhalten" });
    b.onclick = function () {
      S.angehalten[einheitTag() || ""] = true;
      b.replaceWith(el("span", { cls: "leise", id: "teil-angehalten", text: " Angehalten; der nächste Teil geht mit " +
          "einem Klick." }));
    };
    ort.append(" ", b);
  }
  function textSenden(n) {
    var i = n === undefined ? texte.teil : n, t = texte.teile[i];
    if (!t) return;
    texte.teil = i;
    var von = texte.teile.length, st = Z.mappe && Z.mappe.stueckelung;
    var danach = von > 1 && texte.teile.some(function (_, j) { return j !== i && !(st && (st.eingefuegt || [])
        .indexOf(j) >= 0); });
    S.anKi(t, { einheit: einheitTag(), neu: i === 0, ort: $("eingabe-stand"), feld: "eingabe",
      vor: von > 1 ? "Teil " + (i + 1) + " von " + von + " · " : "",
      vorher: function () { textKopiert(true); },
      stand: function (x, art) {
        standKarte($("eingabe-stand"), x, art);
        if (art === "laeuft" && x && danach && kette()) anhaltenKnopf($("eingabe-stand"));
      },
      fertig: async function (antwort) {
        var vorher = eingefuegtZahl();
        $("eingabe").value = antwort;
        await eingabeUebernehmen(null);
        weiterSenden(vorher);
      } });
  }

  // AP13.8: endet die Antwort mit „Fortsetzung folgt“, nimmt die Mühle die Bausteine an und bittet um die fehlenden
  // Bausteine (gen/prompt.py fortsetzung); verbunden geht die Bitte von selbst, solange jede Antwort Neues bringt
  function restZeigen(satz) {
    var box = $("rest-bitte");
    if (!box) { box = el("div", { id: "rest-bitte", cls: "kopieren" }); $("eingabe-stand").after(box); }
    box.innerHTML = ""; box.hidden = false;
    var feld = el("textarea", { cls: "unsichtbar", readonly: true, "aria-hidden": "true", tabindex: "-1" });
    feld.value = satz;
    var stand = el("p", { cls: "stand", role: "status" });
    var knopf = el("button", { type: "button", cls: "knopf", id: "rest-anfordern", text: ki() ?
        "Rest an meine KI senden" : "Rest anfordern", disabled: besetzt() });
    knopf.onclick = function () {
      if (ki()) return restSenden(satz);
      kopieren(satz, feld, stand, "Kopiert. Füge die Bitte in dasselbe Gespräch ein und die Antwort oben ins Feld.",
        function () { $("eingabe").focus({ preventScroll: true }); });
    };
    box.append(knopf, stand, feld);
  }
  function restWeg() { var b = $("rest-bitte"); if (b) b.hidden = true; }
  function restSenden(satz) {
    restWeg();
    S.anKi(satz, { einheit: einheitTag(), neu: false, ort: $("eingabe-stand"), feld: "eingabe", vor: "Rest · ",
      stand: function (x, art) { standKarte($("eingabe-stand"), x, art); },
      fertig: async function (antwort) {
        var vorher = eingefuegtZahl();
        $("eingabe").value = antwort;
        await eingabeUebernehmen(null);
        weiterSenden(vorher);
      } });
  }
  function textKopieren() {
    if (ki()) return textSenden();
    kopieren($("chat-text-feld").value, $("chat-text-feld"), $("kopiert"), KOPIERT, function () {
      textKopiert(); km.kurzmeldung($("text-kopieren"), "Text kopiert");
      // AP13.33 §2.1: Schritt 4 klappt zu oder die Infobox ist weg; weiter geht es im Antwortfeld
      S.fokusRetten(["eingabe", "text-kopieren"]);
    });
  }
  // Vor dem ersten Kopieren einmal die Infobox (Rechte am Material, Nutzungsbedingungen des Chats)
  $("text-kopieren").onclick = function () {
    if (!S.infoboxAus) { $("infobox").hidden = false; $("infobox-ok").focus(); return; }
    textKopieren();
  };
  $("infobox-ok").onclick = function () {
    $("infobox").hidden = true;
    if ($("infobox-nie").checked) { S.infoboxAus = true; km.einstellung("infobox_aus", true).catch(function () {}); }
    else S.infoboxAus = true;                      // in dieser Sitzung nicht noch einmal
    textKopieren();
  };
  // AP13.33 §2.2: Esc schließt die Infobox ohne zu kopieren, Fokus zurück auf „Text kopieren“
  $("infobox").addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    ev.preventDefault();
    $("infobox").hidden = true;
    S.fokus(["text-kopieren"]);
  });

  function setzeModus(m) { var r = document.querySelector("input[name=modus][value=" + m + "]");
      if (r) r.checked = true; }
  var MODUS_TEXT = { ersetzen: "Einheit ersetzt", baustein: "nur diese Bausteine ersetzt",
      anhaengen: "als weitere Einheit angehängt" };

  // Antwort mit einem Modus einsetzen; vorher den Stand sichern, damit ein anderer Modus von dort aus neu einsetzt.
  // AP13.11 §4: betrifft die Antwort von Hand geänderte Bausteine, fragt die Seite einmal je Antwort (`merk`)
  async function einsetzen(text, modus, vorher, merk) {
    Z.mappe = JSON.parse(JSON.stringify(vorher.mappe)); Z.kurs_md = vorher.kurs_md;
    var neu, meldung = "";
    var hv = await S.handVorEinsetzen(Z.mappe, Z.kurs_md, text, modus, null, merk);
    text = hv.text;
    if (hv.bausteine === 0) { await km.stand(Z.kurs_md); return { ok: false, art: "ok", text: S.editorText("hand_bleibt") }; }
    if (modus === "baustein") {
      var r = await km.mappeFn("einsetzen", [Z.mappe, Z.kurs_md, text]);
      if (!r.ersetzt.length && !r.eingefuegt.length) {
        await km.stand(Z.kurs_md);
        return { ok: false, text: r.fehler.join(" ") || "Kein Baustein passte zu einer Karte." };
      }
      var ids = r.ersetzt.concat(r.eingefuegt);
      neu = r.kurs_md;
      await km.stand(neu);
      S.handNachEinsetzen(ids, hv);
      Z.mappe.bausteine.forEach(function (k) { if (ids.indexOf(k.id) >= 0) k.neu = false; });
      if (r.fehler.length) meldung = " " + r.fehler.join(" ");
      return { ok: true, n: ids.length, ids: ids, text: meldung };
    }
    if (modus === "anhaengen") neu = await km.mappeFn("anhaengen", [Z.kurs_md, text, Z.mappe.anhaengen || null]);
    else neu = (await km.mappeFn("antwort", [text])).kursdatei;
    var tag = modus === "anhaengen" ? Z.mappe.anhaengen : null;
    var pr = await km.stand(neu);
    if (modus === "ersetzen") S.handNachEinsetzen([], hv);
    if (modus === "anhaengen" && Z.mappe.anhaengen) delete Z.mappe.anhaengen;
    // AP13.33 §1.9: angehängt zählt die Meldung die Bausteine der neuen Einheit (wie die Zusammenfassung), nicht die Liste
    var n = tag ? pr.bausteine.filter(function (b) { var k = karteNach(b.id); return k && k.einheit === tag; }).length
      : pr.bausteine.length;
    return { ok: true, n: n, text: "" };
  }

  // Meldung unter einem Einfügefeld als Karte mit Rahmen: eine Zeile wird übersehen. `laeuft`: die Mühle dreht sich
  // daneben, der Satz pulsiert; beim nächsten Tick bleibt das Wartezeichen stehen (sonst beginnt die Drehung neu)
  function standKarte(e, text, art) {
    e.hidden = !text;
    e.className = "stand-karte" + (art ? " " + art : "");
    var w = e.querySelector(".laeuft-text");
    if (art === "laeuft" && text && w) { w.textContent = text; return; }
    e.textContent = "";
    if (art === "laeuft" && text) { e.append(wartezeichen(), el("span", { cls: "laeuft-text", text: text })); return; }
    e.textContent = text || "";
  }
  // Wartezeichen (AP13.5d §5a): Flügel der Mühle aus logo.svg, einfarbig in --leise, eine Umdrehung in 6 s; die Regeln
  // stehen hier, weil nur diese Oberfläche sie braucht
  var MUEHLE = '<svg viewBox="20 -10 216 216" width="20" height="20" focusable="false"><g fill="currentColor">' +
      [45, 135, 225, 315].map(function (w) { return '<path transform="rotate(' + w + ' 128 98)" ' +
          'd="M121,58 L135,58 L143,2 Q128,-10 113,2 Z"/>'; }).join("") +
      '<circle cx="128" cy="98" r="44"/></g><circle cx="128" cy="98" r="12" style="fill: var(--flaeche)"/></svg>';
  function wartezeichen() {
    if (!document.getElementById("stil-warten")) {
      document.head.appendChild(el("style", { id: "stil-warten", text: [
        ".muehle-warten { display: inline-block; width: 20px; height: 20px; margin-right: 8px; vertical-align: -4px;",
        "  color: var(--leise); }",
        ".muehle-warten svg { display: block; animation: km-muehle 6s linear infinite; }",
        ".laeuft-text { animation: km-puls 2s ease-in-out infinite alternate; }",
        "@keyframes km-muehle { to { transform: rotate(360deg); } }",
        "@keyframes km-puls { from { opacity: 1; } to { opacity: 0.6; } }",
        "@media (prefers-reduced-motion: reduce) { .muehle-warten svg, .laeuft-text { animation: none; } }"
      ].join("\n") }));
    }
    var s = el("span", { cls: "muehle-warten", "aria-hidden": "true" });
    s.innerHTML = MUEHLE;
    return s;
  }
  // c5: dieselbe Mühle ohne Drehung, 16 px, für km.kurzmeldung
  function muehleSymbol() {
    var s = el("span", { cls: "muehle-symbol", "aria-hidden": "true" });
    s.innerHTML = MUEHLE.replace(/width="20" height="20"/, 'width="16" height="16"');
    s.firstChild.style.display = "block";
    s.style.color = "var(--leise)";
    return s;
  }
  // Antwort ohne Bausteine: die ersten drei Meldungen mit Zeile und Zitat, dazu als Satz für den Chat
  function mitCode(text) {
    var out = [];
    String(text || "").split("`").forEach(function (t, i) { if (t) out.push(i % 2 ? el("code", { text: t }) : t); });
    return out;
  }
  function diagnoseKarte(box, d) {
    box.innerHTML = "";
    box.hidden = !d;
    if (!d) return;
    if (d.leer) {
      box.appendChild(el("p", { text: "Im Text stehen keine Bausteine. " + (d.tipp ? d.tipp +
          "." : "Kopiere die ganze Antwort mit dem Kopierknopf des Chats.") }));
      return;
    }
    box.appendChild(el("p", { text: "Die Mühle findet in der Antwort keinen Baustein:" }));
    box.appendChild(el("ul", {}, d.meldungen.map(function (m) {
      return el("li", { cls: "diagnose-zeile" }, [m.zeile ? "Zeile " + m.zeile + ": " : "", m.zitat ? el("code", {
          text: m.zitat }) : null,
        m.zitat ? ", " : ""].concat(mitCode(m.text)));
    })));
    var feld = el("textarea", { cls: "unsichtbar", readonly: true, "aria-hidden": "true", tabindex: "-1" });
    feld.value = d.satz;
    var stand = el("p", { cls: "stand", role: "status" });
    var knopf = el("button", { type: "button", cls: "knopf diagnose-kopieren", text: ki() ? "Satz an meine KI senden" :
        "Satz für den Chat kopieren", disabled: besetzt() });
    knopf.onclick = function () {
      if (ki()) return S.anKi(d.satz, { einheit: einheitTag(), neu: false, ort: box, feld: "eingabe",
        stand: function (x, art) { standKarte($("eingabe-stand"), x, art); },
        fertig: function (antwort) { $("eingabe").value = antwort; return eingabeUebernehmen(null); } });
      kopieren(d.satz, feld, stand, "Kopiert. Füge ihn in deinen Chat ein und die Antwort hier ein."); };
    box.appendChild(el("div", { cls: "kopieren" }, [knopf]));
    box.appendChild(stand);
    box.appendChild(feld);
  }

  function eigenerText(text) {
    var t = String(text || "").trim();
    if (!t) return "";
    var gleich = function (x) { x = String(x || "").trim(); return !!x && (x === t || (t.length >= 40 &&
        x.indexOf(t) >= 0) || (t.length >= 200 && t.indexOf(x.slice(0, 200)) >= 0)); };
    if (gleich(S.korrektur.text) || gleich(S.restSatz) || S.korrekturen.some(function (k) { return gleich(k.satz); }))
      return "satz";
    if (texte.teile.some(gleich)) return "text";
    return "";
  }
  var EIGEN = { satz: "Das ist der Satz für deinen Chat; füge ihn dort ein und kopiere seine Antwort hierher.",
    text: "Das ist der Text für deinen Chat; füge ihn dort ein und kopiere seine Antwort hierher." };

  // Gestückelter Text: welcher Teil kam? Der mit den meisten ids der Antwort (b7-2 zählt zu b7), sonst der erste, der
  // noch fehlt. Sind alle da, endet die Stückelung und die roten Karten erscheinen. Mit `rest` (Antwort endet mit
  // „Fortsetzung folgt“) gilt der Teil erst als da, wenn alle seine Karten Inhalt haben.
  function teilEingefuegt(ids, rest) {
    var st = Z.mappe && Z.mappe.stueckelung;
    if (!st || !st.ids) return;
    st.eingefuegt = st.eingefuegt || [];
    var basis = function (x) { return String(x).replace(/-\d+$/, ""); };
    var best = -1, treffer = 0;
    st.ids.forEach(function (teil, i) {
      var n = (ids || []).filter(function (x) { return teil.indexOf(x) >= 0 || teil.indexOf(basis(x)) >= 0; }).length;
      if (n > treffer) { treffer = n; best = i; }
    });
    if (best < 0) best = st.ids.findIndex(function (_, i) { return st.eingefuegt.indexOf(i) < 0; });
    if (best >= 0 && st.eingefuegt.indexOf(best) < 0 && !rest) st.eingefuegt.push(best);
    // schrieb der Chat mehrere Teile auf einmal, gilt jeder Teil als da, dessen Karten alle Inhalt haben
    st.ids.forEach(function (teil, i) {
      if (st.eingefuegt.indexOf(i) < 0 && teil.every(function (id) { var k = karteNach(id); return !k || !k.geplant;
          })) st.eingefuegt.push(i);
    });
    if (st.eingefuegt.length >= st.ids.length) delete Z.mappe.stueckelung;
  }
  function naechsterTeil() {
    var st = Z.mappe && Z.mappe.stueckelung;
    return st ? st.ids.findIndex(function (_, i) { return (st.eingefuegt || []).indexOf(i) < 0; }) : -1;
  }
  function zeichneTeile() {
    var offen = teileOffen() && inhalt();
    $("teil-stand").hidden = !offen;
    if (!offen) return;
    var st = Z.mappe.stueckelung, n = naechsterTeil(), da = (st.eingefuegt || []).length;
    $("teil-stand-text").textContent = (da === 1 ? "Teil " + (st.eingefuegt[0] + 1) : da + " Teile") + " von " +
        st.ids.length
      + " eingefügt, jetzt Teil " + (n + 1) + (ki() ? " an deine KI." : " kopieren.");
    var bereitText = texte.teile.length === st.ids.length && !!texte.teile[n];
    $("teil-weiter").textContent = "Teil " + (n + 1) + (ki() ? " an meine KI senden" : " kopieren");
    $("teil-weiter").disabled = !bereitText || besetzt();
  }
  $("teil-weiter").onclick = function () {
    var n = naechsterTeil();
    if (n < 0 || !texte.teile[n]) return;
    if (ki()) return textSenden(n);
    texte.teil = n; zeichneChat();   // Feld „Text ansehen“ trägt jetzt diesen Teil (Rückfall ohne Zwischenablage)
    kopieren(texte.teile[n], $("chat-text-feld"), $("teil-kopiert"), "Kopiert. Füge Teil " + (n + 1)
      + " in dasselbe Gespräch ein und die Antwort des Chats oben ins Feld.", function () { textKopiert(); $("eingabe")
          .focus({ preventScroll: true }); });
  };

  // Antwort einsetzen (Schritt 5). AP13.30: `o` = {text, stand(satz, art), diagnose(d oder null), leeren()} für ein
  // anderes Einfügefeld mit eigenem Meldungsort (Editor, „Weitere Einheit“); sonst das Feld in Schritt 5.
  // -> true, wenn eingesetzt
  async function eingabeUebernehmen(modusErzwungen, o) {
    var feld = !o;
    var zeige = feld ? function (x, art) { standKarte($("eingabe-stand"), x, art); } : o.stand;
    var diagnose = feld ? function (d) { diagnoseKarte($("eingabe-diagnose"), d); } : o.diagnose;
    var text = modusErzwungen && S.letzteAntwort ? S.letzteAntwort.text : feld ? $("eingabe").value : o.text || "";
    if (!text.trim()) return false;
    var eigen = !modusErzwungen && eigenerText(text);
    if (eigen) { diagnose(null); zeige(EIGEN[eigen], "fehler"); return false; }
    restWeg();
    try {
      await km.bereit();
      var modus = modusErzwungen, mo = null, ergaenzt = [];
      if (!modus) {
        // AP13.30 §4a: Baustein ohne id: mit Typ und Titel eines geplanten bekommt dessen id
        var ie = await km.mappeFn("ids_ergaenzen", [Z.mappe, text]);
        text = ie.text; ergaenzt = ie.ids;
        mo = await km.mappeFn("modus", [Z.mappe, text]);
        if (mo.modus === "keine") {
          zeige("");
          diagnose(await km.prompt("diagnose", [text]));
          return false;
        }
        // nächste Einheit, die noch ohne Inhalt ist: anhängen statt in die erste Einheit einsetzen
        var neueOffen = Z.mappe.anhaengen && Z.mappe.bausteine.some(function (k) {
            return k.einheit === Z.mappe.anhaengen && k.geplant; });
        modus = neueOffen ? "anhaengen" : mo.modus;
        setzeModus(modus);
        S.letzteAntwort = { text: text, ergaenzt: ergaenzt, vorher: { mappe: JSON.parse(JSON.stringify(Z.mappe)),
            kurs_md: Z.kurs_md } };
      } else ergaenzt = S.letzteAntwort.ergaenzt || [];
      diagnose(null);
      var e = await einsetzen(text, modus, S.letzteAntwort.vorher, S.letzteAntwort);
      if (!e.ok) {
        zeige(e.text, e.art || "fehler");
        zeichne();
        return false;
      }
      if (mo) teilEingefuegt(e.ids || mo.ids, mo.fortsetzung);
      var leerRest = (mo && mo.rest_ids || []).filter(function (id) { var k = karteNach(id); return k && k.geplant; });
      await S.nachAntwortMarkieren(ergaenzt, teileOffen() || (leerRest.length && mo.rest));
      Z.mappe.durchsicht = false; delete Z.mappe.durchsicht_neu;
      // neuer Inhalt: ab Schritt 5 neu durchsehen
      if (schritt() > 5 || schritt() < 5) { Z.mappe.schritt = 5; S.auf = {}; }
      await auswertung();
      // Hash je Baustein merken; einzelne Bausteine zählen als Runde, eine ganze Einheit fängt neu an
      var gleichE = schleifeMerken(e.ids || Z.pruefung.bausteine.map(function (b) { return b.id; }), false);
      zeichne(); geaendert();
      if (feld) $("eingabe").value = ""; else o.leeren();
      var st = Z.mappe.stueckelung, mehr = "", baust = e.n + (e.n === 1 ? " Baustein" : " Bausteine");
      // „Fortsetzung folgt“: Karten, die noch fehlen, und die Bitte darum kommen aus gen/mappe.py modus
      var leer = leerRest;
      if (leer.length && mo.rest) {
        S.restSatz = mo.rest;
        var von = ki() && (!S.restZahl || leer.length < S.restZahl);   // von selbst nur, solange jede Antwort Neues bringt
        S.restZahl = leer.length;
        zeige("Übernommen: " + baust + "; die Antwort endet mit „Fortsetzung folgt“. " +
            (von ? "Die Mühle bittet deine KI um den Rest." : ki() ? "„Rest an meine KI senden“ bittet um die " +
              "fehlenden Bausteine." : "„Rest anfordern“ kopiert die Bitte um die fehlenden Bausteine für den Chat."),
            "ok");
        restZeigen(S.restSatz);
        if (von) restSenden(S.restSatz);
        else if (feld) $("rest-anfordern").focus({ preventScroll: true });
        return true;
      }
      S.restZahl = 0;
      if (teileOffen()) {
        zeige("Übernommen: " + baust + (kette() ? ". Jetzt geht Teil " : ki() ?
            ". „Teil " + (naechsterTeil() + 1) + " an meine KI senden“ schickt Teil " : ". Kopiere jetzt Teil ")
          + (naechsterTeil() + 1) + " von " + st.ids.length + (kette() ? " an deine KI" : "") +
              "; die Prüfung zeigt Fehler erst, wenn alle Teile da sind.", "ok");
        if (feld) $("teil-weiter").focus({ preventScroll: true });
        return true;
      }
      if (feld) eingabeZu(true);                    // c6: fertig eingefügt, das Feld klappt zu (auch mit eigener KI)
      var rot = Z.pruefung.bausteine.filter(function (b) { return b.status === "fehler" && (!e.ids ||
          e.ids.indexOf(b.id) >= 0); }).length;
      var aussen = Z.pruefung.diagnosen.filter(function (d) { return d.stufe === "fehler" && !d.baustein; }).length;
      if (rot || aussen) mehr = ki() ? " Unter dem Feld steht die Korrektur: „An meine KI senden“ schickt die Bitte." :
          " Unter dem Feld steht die Korrektur: „Korrektur anfordern“ kopiert die Bitte für den Chat.";
      if (gleichE.length) mehr = " Die Antwort für „" + gleichE[0] + "“ ist dieselbe wie vorher." + mehr;
      zeige("Übernommen (" + MODUS_TEXT[modus] + "): " + e.n + (e.n === 1 ?
          " Baustein" : " Bausteine")
        + (rot ? ", davon " + rot + " mit Fehler (rot)." : aussen ? "." : ". Sieh sie durch und geh dann weiter.") +
            mehr + e.text,
        rot || aussen ? "fehler" : "ok");
      // AP13.33 §2.1: stand der Fokus im Feld, geht er an die nächste Stelle. AP13.36 §1.2: nicht auf „Weiter“ (ein Enter
      // überginge die Durchsicht der Karten), sondern auf die erste rote Karte, sonst auf die Meldung über den Karten
      if (feld) {
        var rotId = (Z.pruefung.bausteine.filter(function (b) { return b.status === "fehler" && (!e.ids ||
            e.ids.indexOf(b.id) >= 0); })[0] || {}).id;
        var neuOrt = S.fokusRetten([rotId ? $("karte-" + rotId) : null, "eingabe-stand", "korrektur-kopieren", "weiter-5",
            "eingabe-nochmal"], $("eingabe-bereich"));
        if (neuOrt) neuOrt.scrollIntoView({ block: "nearest" });
      }
      return true;
    } catch (err) { zeigeFehler(err); return false; }
  }
  $("eingabe").addEventListener("input", function () {
    clearTimeout(S.eingabeTimer);
    S.eingabeTimer = setTimeout(function () { eingabeUebernehmen(null); }, 500);
  });
  $("eingabe").addEventListener("paste", function () {
    clearTimeout(S.eingabeTimer);
    S.eingabeTimer = setTimeout(function () { eingabeUebernehmen(null); }, 30);
  });
  // c6: nach dem Übernehmen klappt das Einfügefeld zu (Klasse `zu`, nicht `hidden`: verbindung.js setzt `hidden` auf
  // #eingabe); Meldung und Korrektur bleiben, „Noch einmal einfügen“ klappt es wieder auf
  function eingabeZu(zu) {
    if (!document.getElementById("stil-eingabe-zu")) {
      document.head.appendChild(el("style", { id: "stil-eingabe-zu", text: [
        "#eingabe-bereich.zu { display: none; }",
        "#eingabe-nochmal { display: block; margin-top: 6px; }"
      ].join("\n") }));
    }
    $("eingabe-bereich").classList.toggle("zu", zu);
    $("eingabe-nochmal").hidden = !zu;
  }
  // AP13.33 §1.5: die Meldung zur vorigen Antwort gilt für das leere Feld nicht mehr
  $("eingabe-nochmal").onclick = function () { eingabeZu(false); standKarte($("eingabe-stand"), ""); $("eingabe").focus(); };
  // Knopf zusätzlich zur Automatik: nach dem Einfügen fehlt sonst etwas zum Klicken
  $("eingabe-uebernehmen").onclick = function () { clearTimeout(S.eingabeTimer); eingabeUebernehmen(null); };
  // Anderen Modus gewählt: die letzte Antwort vom Stand davor aus neu einsetzen
  Array.prototype.forEach.call(document.querySelectorAll("input[name=modus]"), function (r) {
    r.addEventListener("change", function () { if (S.letzteAntwort && r.checked) eingabeUebernehmen(r.value); });
  });
  Object.assign(S, { EIGEN: EIGEN, kiBesetzt: besetzt, texteErzeugen: texteErzeugen, textKopiert: textKopiert, wartezeichen: wartezeichen, diagnoseKarte: diagnoseKarte, eigenerText: eigenerText,
    eingabeUebernehmen: eingabeUebernehmen, eingabeZu: eingabeZu, muehleSymbol: muehleSymbol, standKarte: standKarte,
    textGesendet: textGesendet, textGroesse: textGroesse, textSpaeter: textSpaeter, zeichneChat: zeichneChat,
    zeichnePlanung: zeichnePlanung, zeichneTeile: zeichneTeile });
})();
