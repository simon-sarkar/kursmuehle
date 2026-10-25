/* Kursmühle – Kursseiten-Vorschau in Schritt 3 (AP13.5g b3): eine Kursseite im gewählten Format als zweite Karte
 * unter der Design-Vorschau. Reines HTML und CSS (Klassen fv-* in ansicht.css), kein Pyodide; Farben und Name der
 * Titelschrift aus web/familien.json, Akzent aus der Farbwahl. Inhalt nur Struktur: Thema aus Schritt 1 als
 * Kurstitel, Abschnitte „Einstieg“, „Erarbeitung“, „Übung“, Aktivitäten als Balken. */
"use strict";

(function () {
  if (!document.getElementById("format-vorschau")) return;
  var S = km.seite;
  var $ = S.$, Z = S.Z, el = S.el;
  var TITEL = ["Einstieg", "Erarbeitung", "Übung"];
  var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober",
    "November", "Dezember"];

  // „2. November – 8. November“ je Woche ab dem Kursbeginn (JJJJ-MM-TT), sonst „Woche 1“ …
  function wochen(start) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start || "");
    return [0, 1, 2].map(function (i) {
      if (!m) return "Woche " + (i + 1);
      var a = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 7 * i)), b = new Date(a.getTime() + 6 * 864e5);
      var tag = function (d) { return d.getUTCDate() + ". " + MONATE[d.getUTCMonth()]; };
      return tag(a) + " – " + tag(b);
    });
  }
  function aktivitaet(breite) {
    return el("div", { cls: "fv-akt" }, [el("span", { cls: "fv-symbol" }), el("span", { cls: "fv-balken",
      style: "width:" + breite + "%" })]);
  }
  function abschnitt(titel, offen, cls) {
    var kopf = el("div", { cls: "fv-abschnitt-titel" + (cls ? " " + cls : ""), text: titel });
    return el("div", { cls: "fv-abschnitt" }, offen === false ? [kopf] : [kopf, aktivitaet(62), aktivitaet(44)]);
  }

  function inhalt(format, start) {
    if (format === "kacheln") {
      return [el("div", { cls: "fv-kacheln" }, TITEL.concat(["Abschnitt 4", "Abschnitt 5", "Abschnitt 6"])
        .map(function (t) { return el("div", { cls: "fv-kachel" }, [el("span", { cls: "fv-kachel-bild" }),
          el("span", { cls: "fv-kachel-titel", text: t })]); }))];
    }
    if (format === "komprimiert") {           // Themen zum Aufklappen: drei Zeilen mit Pfeil, die erste offen
      return TITEL.map(function (t, i) { return abschnitt(t, i === 0, "fv-klapp" + (i === 0 ? " fv-auf" : "")); });
    }
    if (format === "einthemen") {             // Reiterleiste, der erste Reiter aktiv, darunter seine Seite
      return [el("div", { cls: "fv-reiter" }, TITEL.map(function (t, i) {
        return el("span", { cls: "fv-reiter-eintrag" + (i === 0 ? " fv-aktiv" : ""), text: t }); })),
        el("div", { cls: "fv-seite" }, [aktivitaet(62), aktivitaet(44), aktivitaet(54)])];
    }
    if (format === "wochen") {
      return wochen(start).map(function (t) { return abschnitt(t, true, "fv-datum"); });
    }
    return TITEL.map(function (t) { return abschnitt(t, true); });
  }

  var stand = "";
  function formatVorschau() {
    if (!S.familien || !Z.mappe) return;
    var name = S.angaben.familie || S.familien.standard;
    var f = S.familien.familien.filter(function (x) { return x.name === name; })[0] || S.familien.familien[0];
    var format = S.angaben.format || "themen", start = S.angaben.start || "", hue = S.akzent();
    var titel = ((Z.mappe.einheit && Z.mappe.einheit.thema) || Z.mappe.titel || "").trim() || "Kurs";
    var schluessel = [format, f.name, hue, start, titel].join("|");
    if (schluessel === stand) return;
    stand = schluessel;
    var fa = f.farben || {};
    var stil = ["--fv-ink:" + fa.ink, "--fv-muted:" + fa.muted, "--fv-line:" + fa.line, "--fv-flaeche:" + fa.flaeche,
      "--fv-alt:" + fa.flaeche_alt, "--fv-akzent:" + hue].join(";");
    // Titelschrift nur mit dem Namen: sie greift, wenn die Design-Vorschau sie per @font-face geladen hat
    var schrift = f.schrift ? '"' + f.schrift.replace(/["\\]/g, "") + '", ' : "";
    var seite = el("div", { cls: "fv", style: stil, "data-format": format }, [
      el("div", { cls: "fv-kurstitel", style: "font-family:" + schrift + "system-ui, sans-serif", text: titel })]
      .concat(inhalt(format, start)));
    var box = $("format-vorschau");
    box.innerHTML = "";
    box.appendChild(seite);
    box.setAttribute("inert", "");
  }
  Object.assign(S, { formatVorschau: formatVorschau });
})();
