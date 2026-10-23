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
function check(q) {
  var typ = q.getAttribute("data-typ"), ok = true;
  if (typ === "mc") {
    all(".km-opt", q).forEach(function (o) {
      var c = one("input", o).checked, want = o.getAttribute("data-ok") === "1";
      if (c !== want) ok = false;
      o.classList.toggle("is-bad", c && !want);
      o.classList.toggle("is-ok", c && want);
      var fb = one(".km-ofb", o); if (fb) fb.hidden = !c;
    });
  } else if (typ === "gaps") {
    all(".km-gap", q).forEach(function (el) {
      var g = gapOk(el); if (!g) ok = false;
      el.classList.toggle("is-ok", g); el.classList.toggle("is-bad", !g);
    });
  } else if (typ === "mark") {
    all(".km-word", q).forEach(function (w) {
      var sel = w.classList.contains("is-sel"), want = w.getAttribute("data-ok") === "1";
      if (sel !== want) ok = false;
      w.classList.toggle("is-ok", sel && want); w.classList.toggle("is-bad", sel && !want); w.classList.remove("is-miss");
    });
  }
  var fb = one(".km-qfb", q);
  fb.hidden = false;
  fb.className = "km-qfb " + (ok ? "ok" : "bad");
  fb.textContent = ok ? "Richtig." : "Noch nicht ganz. Ändere die rot markierten Stellen und prüfe noch einmal.";
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
  });
  if (typ === "gaps") all(".km-gap", q).forEach(function (el) {
    el.value = el.getAttribute("data-ok").split("|")[0].split("*").join("");
    el.classList.add("is-ok"); el.classList.remove("is-bad");
  });
  if (typ === "mark") all(".km-word", q).forEach(function (w) {
    var want = w.getAttribute("data-ok") === "1";
    w.classList.toggle("is-sel", want); w.classList.toggle("is-miss", want); w.classList.remove("is-ok", "is-bad");
  });
  var fb = one(".km-qfb", q); fb.className = "km-qfb"; fb.textContent = "Lösung eingeblendet.";
  one(".km-solve", q).hidden = true;
}
function score(quiz) {
  if (!quiz) return;
  var qs = all(".km-q", quiz);
  one(".km-n", quiz).textContent = qs.filter(function (q) { return q.getAttribute("data-done") === "1"; }).length;
  one(".km-of", quiz).textContent = qs.length;
}
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

// Geschichte: Szenen, Entscheidungen, Enden
all(".km-story").forEach(function (box) {
  var d = JSON.parse(one("script", box).textContent), view = one(".km-story-view", box);
  function btn(label, go) {
    var b = document.createElement("button"); b.type = "button"; b.className = "km-btn"; b.innerHTML = label;
    b.addEventListener("click", go); return b;
  }
  function render(key) {
    view.innerHTML = "";
    var alts = document.createElement("div"); alts.className = "km-story-alts";
    if (key === null) {
      if (d.bild && IMG[d.bild]) { var im = document.createElement("img"); im.src = IMG[d.bild]; im.alt = ""; view.appendChild(im); }
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
