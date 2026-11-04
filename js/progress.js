// Écran Progression : évolution des charges par mouvement et 1RM par cycle.
// Lecture seule : utilise les données existantes (state, LIFTS, LIFT_MAP).
var progLift = 0;        // index dans LIFTS
var progKind = "main";   // "main" (top set) | "sec" (secondaire)
var histTab = "cycles";  // onglet de l'écran Historique
var progTipText = "";

var PROG_COLORS = { cur: "#ff6b35", prev: "#8a8a96", grid: "#252530", axis: "#6b6b78", text: "#e8e6e3", bg: "#131318" };

function setHistTab(t) {
  histTab = t;
  document.getElementById("history-list").style.display = t === "cycles" ? "block" : "none";
  document.getElementById("progress-view").style.display = t === "progress" ? "block" : "none";
  document.querySelectorAll("#hist-tabs .seg-btn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-tab") === t);
  });
  if (t === "progress") renderProgress();
}
function setProgLift(i) { progLift = i; progTipText = ""; renderProgress(); }
function setProgKind(k) { progKind = k; progTipText = ""; renderProgress(); }

function progNum(v) {
  var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
  return n > 0 ? n : null;
}
function progFmt(n) { return (Math.round(n * 10) / 10).toString().replace(".", ","); }

// Charges S1–S6 d'un cycle pour le mouvement / type sélectionné
function progSeries(cycle) {
  var m = LIFT_MAP[LIFTS[progLift]], slot = progKind === "sec" ? m.sec : m.main, out = [];
  for (var w = 0; w < 6; w++) {
    var k = w + "-" + slot[0] + "-" + slot[1];
    out.push(progKind === "e1rm" ? e1rmFor(cycle, k) : progNum(cycle.weights[k]));
  }
  return out;
}

function progTip(label) { progTipText = label; document.getElementById("prog-tip").textContent = label; }

function renderProgress() {
  var el = document.getElementById("progress-view");
  if (!el) return;
  var lift = LIFTS[progLift];
  var shortName = function (l) { return l === "Soulevé de Terre" ? "Deadlift" : l; };
  var h = "";

  // Sélecteurs
  h += '<div class="week-tabs">';
  LIFTS.forEach(function (l, i) {
    h += '<button class="week-tab' + (i === progLift ? " active" : "") + '" onclick="setProgLift(' + i + ')">' + shortName(l) + "</button>";
  });
  h += "</div>";
  h += '<div class="seg seg-sm">' +
    '<button class="seg-btn' + (progKind === "main" ? " active" : "") + '" onclick="setProgKind(\'main\')">Top set</button>' +
    '<button class="seg-btn' + (progKind === "e1rm" ? " active" : "") + '" onclick="setProgKind(\'e1rm\')">1RM estimé</button>' +
    '<button class="seg-btn' + (progKind === "sec" ? " active" : "") + '" onclick="setProgKind(\'sec\')">Secondaire</button></div>';
  var isE = progKind === "e1rm";

  // Séries : dernier cycle + précédent
  var n = state.cycles.length;
  var series = [{ idx: n - 1, color: PROG_COLORS.cur, vals: progSeries(state.cycles[n - 1]) }];
  if (n > 1) series.unshift({ idx: n - 2, color: PROG_COLORS.prev, vals: progSeries(state.cycles[n - 2]) });
  var cur = series[series.length - 1];

  // Tuiles
  var curVals = cur.vals.filter(function (v) { return v; });
  var lastV = curVals.length ? curVals[curVals.length - 1] : null;
  // Progression du cycle : S1 → dernière semaine saisie hors deload (S1–S5)
  // (le 1RM estimé reste comparable en deload : on garde S6)
  var loadVals = cur.vals.slice(0, isE ? 6 : 5).filter(function (v) { return v; });
  var firstV = loadVals.length ? loadVals[0] : null;
  var progV = loadVals.length > 1 ? loadVals[loadVals.length - 1] - firstV : null;
  var rms = state.cycles.map(function (c) { return get1RMs(c)[lift] || null; });
  var bestRM = rms.reduce(function (a, b) { return b && (!a || b > a) ? b : a; }, null);
  h += '<div class="prog-tiles">' +
    tile(isE ? "Dernier 1RM estimé" : "Dernière charge", lastV ? progFmt(lastV) + " kg" : "—", "Cycle " + n) +
    tile("Progression cycle", progV !== null ? (progV >= 0 ? "+" : "") + progFmt(progV) + " kg" : "—", "depuis S1") +
    tile("Record 1RM", bestRM ? progFmt(bestRM) + " kg" : "—", "testé en S7") +
    "</div>";

  // Graphique
  h += '<div class="summary-card"><div class="summary-label">' + shortName(lift) + " — " +
    ({ main: "top set", e1rm: "1RM estimé", sec: "secondaire" })[progKind] + " par semaine</div>";
  var all = [];
  series.forEach(function (s) { s.vals.forEach(function (v) { if (v) all.push(v); }); });
  if (!all.length) {
    h += '<div class="acc-text">' + (isE
      ? "Saisis la charge, les reps et le RPE de ton top set pour voir ton 1RM estimé semaine après semaine."
      : "Pas encore de charge saisie pour ce mouvement. Elles apparaîtront ici au fil des séances.") + "</div>";
  } else {
    if (series.length > 1) {
      h += '<div class="prog-legend">';
      series.slice().reverse().forEach(function (s, i) {
        h += '<span><i style="background:' + s.color + '"></i>Cycle ' + (s.idx + 1) + (i === 0 ? " (actuel)" : "") + "</span>";
      });
      h += "</div>";
    }
    h += '<div class="prog-tip" id="prog-tip">' + (progTipText || "Touche un point pour voir la valeur") + "</div>";
    h += progChart(series, all);
    // Tableau des valeurs (lecture précise / accessibilité)
    h += '<table class="prog-table"><tr><th></th>';
    for (var w = 0; w < 6; w++) h += "<th>S" + (w + 1) + "</th>";
    h += "</tr>";
    series.slice().reverse().forEach(function (s) {
      h += '<tr><td><i style="background:' + s.color + '"></i>C' + (s.idx + 1) + "</td>";
      s.vals.forEach(function (v) { h += "<td>" + (v ? progFmt(v) : "—") + "</td>"; });
      h += "</tr>";
    });
    h += "</table>";
  }
  h += "</div>";

  // 1RM par cycle
  h += '<div class="summary-card"><div class="summary-label">1RM ' + shortName(lift) + " par cycle</div>";
  var anyRM = rms.some(function (r) { return r; });
  if (!anyRM) {
    h += '<div class="acc-text">Aucun 1RM enregistré. Saisis ta charge max en semaine 7 (Peak / Test).</div>';
  } else {
    var prevRM = null;
    rms.forEach(function (r, i) {
      var delta = r && prevRM ? r - prevRM : null;
      h += '<div class="summary-row"><span class="summary-lift">Cycle ' + (i + 1) + "</span><span>" +
        (delta !== null ? '<span class="prog-delta">' + (delta >= 0 ? "+" : "") + progFmt(delta) + " kg</span>" : "") +
        '<span class="summary-val">' + (r ? progFmt(r) + " kg" : "—") + "</span></span></div>";
      if (r) prevRM = r;
    });
  }
  h += "</div>";

  el.innerHTML = h;

  function tile(label, val, sub) {
    return '<div class="prog-tile"><div class="t-label">' + label + '</div><div class="t-val">' + val +
      '</div><div class="t-sub">' + sub + "</div></div>";
  }
}

function progChart(series, all) {
  var W = 320, H = 190, pL = 32, pR = 26, pT = 10, pB = 24;
  var min = Math.min.apply(null, all), max = Math.max.apply(null, all);
  var steps = [2.5, 5, 10, 20, 25, 50, 100], step = steps[steps.length - 1];
  for (var i = 0; i < steps.length; i++) { if ((max - min) / steps[i] <= 4) { step = steps[i]; break; } }
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  if (hi === lo) { lo -= step; hi += step; }
  var x = function (w) { return pL + w * (W - pL - pR) / 5; };
  var y = function (v) { return pT + (hi - v) / (hi - lo) * (H - pT - pB); };
  var C = PROG_COLORS, s = '<svg class="prog-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Charges par semaine">';

  // Grille + axe Y
  for (var g = lo; g <= hi + 1e-9; g += step) {
    s += '<line x1="' + pL + '" x2="' + (W - pR) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="' + C.grid + '" stroke-width="1"/>';
    s += '<text x="' + (pL - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="' + C.axis + '">' + progFmt(g) + "</text>";
  }
  // Axe X
  for (var w = 0; w < 6; w++) {
    s += '<text x="' + x(w) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="' + C.axis + '">S' + (w + 1) + "</text>";
  }
  // Séries (précédent dessous, actuel au-dessus)
  series.forEach(function (sr) {
    var v = sr.vals;
    for (var w = 0; w < 5; w++) {
      if (v[w] && v[w + 1]) {
        s += '<line x1="' + x(w) + '" y1="' + y(v[w]) + '" x2="' + x(w + 1) + '" y2="' + y(v[w + 1]) +
          '" stroke="' + sr.color + '" stroke-width="2" stroke-linecap="round"/>';
      }
    }
    var last = -1;
    v.forEach(function (val, w) {
      if (!val) return;
      last = w;
      s += '<circle cx="' + x(w) + '" cy="' + y(val) + '" r="4" fill="' + sr.color + '" stroke="' + C.bg + '" stroke-width="2"/>';
    });
    // Étiquette directe au dernier point
    if (last >= 0) {
      s += '<text x="' + (x(last) + 9) + '" y="' + (y(v[last]) + 4) + '" font-size="11" font-weight="700" fill="' +
        (sr === series[series.length - 1] ? C.text : C.axis) + '">C' + (sr.idx + 1) + "</text>";
    }
  });
  // Zones de touche (plus grandes que les points)
  series.forEach(function (sr) {
    sr.vals.forEach(function (val, w) {
      if (!val) return;
      var label = "S" + (w + 1) + " · Cycle " + (sr.idx + 1) + " : " + progFmt(val) + " kg";
      s += '<circle cx="' + x(w) + '" cy="' + y(val) + '" r="14" fill="transparent" style="cursor:pointer" onclick="progTip(\'' + label + '\')"><title>' + label + "</title></circle>";
    });
  });
  return s + "</svg>";
}
