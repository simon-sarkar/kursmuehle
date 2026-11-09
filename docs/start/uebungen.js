/* Kursmühle – Übungen in der Editor-Vorschau (AP13.44): scripts/templates/uebungen.js unverändert, erzeugt
 * von scripts/web_bundle.py. Läuft wie im Kurs je Block mit R (Wurzel des Blocks) und IMG (Bildname ->
 * Adresse); editor.js ruft es für jeden .kmb der Vorschau einmal auf. */
"use strict";

(function () {
  if (!window.km) return;
  km.uebungenAn = function (R, IMG) {
// Übungen (Kursmühle): gemeinsam für Website-Modus und Textfeld-Modus. Läuft innerhalb einer Funktion, die R (Wurzel:
// document bzw. der Block) und IMG (Bildname -> Adresse) setzt; legt keine globalen Namen an. Für Textfelder ohne
// Zeichenfolgen, die Moodle-Filter umschreiben (zwei Dollarzeichen, Backslash-Klammer, Emoticons wie (y) oder (n)).
var one = function (s, r) { return (r || R).querySelector(s); };
var all = function (s, r) { return Array.prototype.slice.call((r || R).querySelectorAll(s)); };
all("[data-km-img]").forEach(function (el) { if (IMG[el.getAttribute("data-km-img")]) el.src = IMG[el.getAttribute("data-km-img")]; });
all(".km-nojs").forEach(function (el) { el.hidden = true; });

// Prüfen, Rückmeldung, Lösung zeigen
function norm(s) { return (s || "").trim().replace(/\s+/g, " ").toLowerCase(); }
function glob(muster, v) {
  var t = muster.split("*");
  if (t.length === 1) return muster === v;
  var a = t[0], z = t[t.length - 1], pos = a.length, ende = v.length - z.length;
  if (ende < pos || v.indexOf(a) !== 0 || v.slice(ende) !== z) return false;
  for (var i = 1; i < t.length - 1; i++) {
    var j = v.indexOf(t[i], pos);
    if (j < 0 || j + t[i].length > ende) return false;
    pos = j + t[i].length;
  }
  return true;
}
function gapOk(el) {
  var v = norm(el.value);
  return el.getAttribute("data-ok").split("|").some(function (a) { return glob(norm(a), v); });
}
// Zeichen hinter einer markierten Stelle, damit richtig und falsch nicht nur an der Farbe hängen; st: ok, bad oder leer
function zeichen(el, st) {
  var z = el.nextElementSibling;
  if (!z || !z.classList.contains("km-z")) {
    if (!st) return;
    z = document.createElement("span");
    z.setAttribute("role", "img");
    el.insertAdjacentElement("afterend", z);
  }
  z.className = "km-z" + (st ? " " + st : "");
  z.hidden = !st;
  z.textContent = st === "ok" ? "\u2713" : st === "bad" ? "\u2717" : "";
  z.setAttribute("aria-label", st === "ok" ? "richtig" : "falsch");
}
function check(q) {
  var typ = q.getAttribute("data-typ"), ok = true;
  if (typ === "mc") {
    all(".km-opt", q).forEach(function (o) {
      var c = one("input", o).checked, want = o.getAttribute("data-ok") === "1";
      if (c !== want) ok = false;
      o.classList.toggle("is-bad", c && !want);
      o.classList.toggle("is-ok", c && want);
      zeichen(one("span", o), c ? (want ? "ok" : "bad") : "");
      var fb = one(".km-ofb", o); if (fb) fb.hidden = !c;
    });
  } else if (typ === "gaps") {
    all(".km-gap", q).forEach(function (el) {
      var g = gapOk(el); if (!g) ok = false;
      el.classList.toggle("is-ok", g); el.classList.toggle("is-bad", !g);
      zeichen(el, g ? "ok" : "bad");
    });
  } else if (typ === "mark") {
    all(".km-word", q).forEach(function (w) {
      var sel = w.classList.contains("is-sel"), want = w.getAttribute("data-ok") === "1";
      if (sel !== want) ok = false;
      w.classList.toggle("is-ok", sel && want); w.classList.toggle("is-bad", sel && !want); w.classList.remove("is-miss");
      zeichen(w, sel ? (want ? "ok" : "bad") : "");
    });
  }
  var fb = one(".km-qfb", q);
  fb.className = "km-qfb " + (ok ? "ok" : "bad");
  fb.textContent = ok ? "Richtig." : "Noch nicht ganz. Ändere die markierten Stellen und prüfe noch einmal.";
  var a = one(".km-fb-ok", q), b = one(".km-fb-bad", q);
  if (a) a.hidden = !ok; if (b) b.hidden = ok;
  one(".km-solve", q).hidden = ok;
  q.setAttribute("data-done", ok ? "1" : "0");
  score(q.closest(".km-quiz"));
}
function solve(q) {
  var typ = q.getAttribute("data-typ");
  if (typ === "mc") all(".km-opt", q).forEach(function (o) {
    one("input", o).checked = o.getAttribute("data-ok") === "1";
    o.classList.toggle("is-ok", o.getAttribute("data-ok") === "1"); o.classList.remove("is-bad");
    zeichen(one("span", o), o.getAttribute("data-ok") === "1" ? "ok" : "");
  });
  if (typ === "gaps") all(".km-gap", q).forEach(function (el) {
    el.value = el.getAttribute("data-ok").split("|")[0].split("*").join("");
    el.classList.add("is-ok"); el.classList.remove("is-bad");
    zeichen(el, "ok");
  });
  if (typ === "mark") all(".km-word", q).forEach(function (w) {
    var want = w.getAttribute("data-ok") === "1";
    w.classList.toggle("is-sel", want); w.classList.toggle("is-miss", want); w.classList.remove("is-ok", "is-bad");
    zeichen(w, want ? "ok" : "");
  });
  var fb = one(".km-qfb", q); fb.className = "km-qfb"; fb.textContent = "Lösung eingeblendet.";
  one(".km-solve", q).hidden = true;
}
function score(quiz) {
  if (!quiz) return;
  var qs = all(".km-q", quiz);
  one(".km-n", quiz).textContent = qs.filter(function (q) { return q.getAttribute("data-done") === "1"; }).length;
  one(".km-of", quiz).textContent = qs.length;
  var fb = one(".km-quiz-fb", quiz);
  if (fb) fb.hidden = qs.some(function (q) { return !q.hasAttribute("data-done"); });
}
// Start (AP13.16): Ohne Skript steht jede Aufgabe mit Lösung im <details class="km-loes">. Hier entsteht daraus die
// Oberfläche: Knöpfe und Rückmeldung (Live-Bereich, Screenreader lesen sie vor) an die Stelle der Lösung, Rückmeldungen
// versteckt dahinter bzw. in ihre Antwort, Wörter und Lernkarten als Knöpfe, Zähler im Quiz.
function knopf(el, cls) {
  var b = document.createElement("button");
  b.type = "button"; b.className = cls;
  while (el.firstChild) b.appendChild(el.firstChild);
  return b;
}
all(".km-q").forEach(function (q) {
  var lo = one(".km-loes", q);
  if (!lo) return;
  lo.insertAdjacentHTML("beforebegin", '<div class="km-act"><button type="button" class="km-btn km-check">Prüfen</button>'
    + '<button type="button" class="km-btn km-ghost km-solve" hidden>Lösung zeigen</button></div>'
    + '<div class="km-qfb" role="status" aria-live="polite"></div>');
  all(".km-fb-ok, .km-fb-bad", lo).forEach(function (fb) {
    if (fb.classList.contains("km-fb-ok") && fb.classList.contains("km-fb-bad")) {
      var ja = fb.cloneNode(true);
      ja.className = "km-fb-ok"; fb.className = "km-fb-bad";
      ja.hidden = true; lo.insertAdjacentElement("beforebegin", ja);
    }
    fb.hidden = true; lo.insertAdjacentElement("beforebegin", fb);
  });
  var opts = all(".km-opt", q);
  all(".km-ofb", lo).forEach(function (fb) {
    var o = opts[parseInt(fb.getAttribute("data-i"), 10)];
    fb.removeAttribute("data-i"); fb.hidden = true; o.appendChild(fb);
  });
  lo.parentNode.removeChild(lo);
  all("span.km-word", q).forEach(function (w) {
    var b = knopf(w, "km-word");
    b.setAttribute("data-ok", w.getAttribute("data-ok"));
    w.parentNode.replaceChild(b, w);
  });
});
all(".km-cards > details").forEach(function (d) {
  var s = one("summary", d), b = knopf(s, "km-card");
  b.setAttribute("aria-pressed", "false");
  d.removeChild(s);
  while (d.firstChild) b.appendChild(d.firstChild);
  d.parentNode.replaceChild(b, d);
});
all(".km-quiz").forEach(function (quiz) {
  var lead = one(".km-lead", quiz), lo = one(".km-loes", quiz);
  var z = '<p class="km-score" aria-live="polite"><span class="km-n">0</span> von <span class="km-of">0</span> richtig</p>';
  if (lead) lead.insertAdjacentHTML("afterend", z); else quiz.insertAdjacentHTML("afterbegin", z);
  if (lo) {
    var fb = one(".km-quiz-fb", lo);
    fb.hidden = true; lo.parentNode.replaceChild(fb, lo);
  }
});
all(".km-quiz").forEach(score);
R.addEventListener("click", function (e) {
  var t = e.target.closest("button");
  if (!t) return;
  if (t.classList.contains("km-check")) check(t.closest(".km-q"));
  else if (t.classList.contains("km-solve")) solve(t.closest(".km-q"));
  else if (t.classList.contains("km-word")) t.classList.toggle("is-sel");
  else if (t.classList.contains("km-card")) {
    t.setAttribute("aria-pressed", t.classList.toggle("is-flipped") ? "true" : "false");
  }
});

// Geschichte: Szenen, Entscheidungen, Enden. Ohne Skript stehen alle Knoten mit Verweisen untereinander (.km-sz, id über
// den Index); hier wird daraus die Geschichte d gelesen und die Ansicht gebaut.
all(".km-story").forEach(function (box) {
  var daten = one(".km-story-daten", box), d = { knoten: {}, enden: {} };
  all(".km-sz", daten).forEach(function (sz, i) {
    var art = sz.getAttribute("data-art"), h = one("h3", sz).innerHTML, t = one(".km-sz-text", sz);
    var ziele = all("a[data-ziel]", sz).map(function (a) { return [a.innerHTML, a.getAttribute("data-ziel")]; });
    if (art === "start") {
      var bild = one("img", sz);
      d.titel = h; d.sub = t ? t.innerHTML : ""; d.start = ziele[0][1]; d.bild = bild ? bild.getAttribute("src") : null;
    } else if (art === "ende") d.enden[i] = { titel: h, text: t ? t.innerHTML : "" };
    else if (art === "szene") d.knoten[i] = { typ: "szene", titel: h, html: t.innerHTML, ziel: ziele[0][1] };
    else d.knoten[i] = { typ: "frage", frage: h, antworten: ziele };
  });
  box.removeChild(daten);
  var view = document.createElement("div");
  view.className = "km-story-view"; box.appendChild(view);
  function btn(label, go) {
    var b = document.createElement("button"); b.type = "button"; b.className = "km-btn"; b.innerHTML = label;
    b.addEventListener("click", go); return b;
  }
  function render(key) {
    view.innerHTML = "";
    var alts = document.createElement("div"); alts.className = "km-story-alts";
    if (key === null) {
      if (d.bild) { var im = document.createElement("img"); im.src = d.bild; im.alt = ""; view.appendChild(im); }
      view.insertAdjacentHTML("beforeend", "<h3>" + d.titel + "</h3>" + (d.sub ? "<p>" + d.sub + "</p>" : ""));
      alts.appendChild(btn("Los geht’s", function () { render(d.start); }));
    } else if (d.enden[key]) {
      var en = d.enden[key];
      view.insertAdjacentHTML("beforeend", '<div class="km-kicker">Ende</div><h3>' + en.titel + "</h3>" + (en.text ? "<p>" + en.text + "</p>" : ""));
      alts.appendChild(btn("Noch einmal von vorn", function () { render(d.start); }));
    } else {
      var kn = d.knoten[key];
      if (kn.typ === "szene") {
        view.insertAdjacentHTML("beforeend", "<h3>" + kn.titel + "</h3>" + kn.html);
        alts.appendChild(btn("Weiter", function () { render(kn.ziel); }));
      } else {
        view.insertAdjacentHTML("beforeend", "<h3>" + kn.frage + "</h3>");
        kn.antworten.forEach(function (a) { alts.appendChild(btn(a[0], function () { render(a[1]); })); });
      }
    }
    view.appendChild(alts);
  }
  render(null);
});

  };
})();
