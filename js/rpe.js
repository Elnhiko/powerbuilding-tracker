// Reps / RPE réels du top set et 1RM estimé.
// Table RPE classique (Tuchscherer / RTS) : 1 point de RPE = 1 répétition en réserve,
// d'où une seule suite de % indexée par « reps + (10 - RPE) », par pas de 0,5.
var RPE_PCT = [100, 97.8, 95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6,
  77.4, 76.2, 75.1, 73.9, 72.3, 70.7, 69.4, 68.0, 66.7, 65.3, 64.0, 62.6, 61.3, 59.9, 58.6, 57.4];
var RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

// % du 1RM pour `reps` répétitions à un RPE donné (1–12 reps, RPE 6–10), sinon null
function rpePct(reps, rpe) {
  reps = parseInt(reps, 10); rpe = parseFloat(rpe);
  if (!(reps >= 1 && reps <= 12) || !(rpe >= 6 && rpe <= 10)) return null;
  var idx = Math.round((reps + (10 - rpe) - 1) * 2);
  return RPE_PCT[idx] || null;
}

function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return n > 0 ? n : null; }
function fmtKg(n) { return (Math.round(n * 10) / 10).toString().replace(".", ","); }

// 1RM estimé d'un exercice (clé "semaine-jour-exercice") d'un cycle
function e1rmFor(c, k) {
  var w = num(c.weights[k]), p = rpePct(c.reps && c.reps[k], c.rpe && c.rpe[k]);
  return w && p ? Math.round(w / p * 100 * 2) / 2 : null;
}

// Bloc « Fait : reps @ RPE » + 1RM estimé, sous la charge du top set (S1–S6)
function topSetHTML(c, w, ei) {
  if (w.num >= 7) return "";
  var k = c.week + "-" + c.day + "-" + ei;
  var reps = (c.reps && c.reps[k]) || "", rpe = (c.rpe && c.rpe[k]) || "";
  var h = '<div class="weight-row"><div class="weight-label">Fait :</div>' +
    '<div class="weight-wrap"><input type="number" inputmode="numeric" class="weight-input" placeholder="' + w.ts + '" value="' + reps +
    '" onchange="setTopSet(' + ei + ',\'reps\',this.value)" onblur="setTopSet(' + ei + ',\'reps\',this.value)"><span class="weight-unit">reps</span></div>' +
    '<div class="weight-label">@</div>' +
    '<div class="weight-wrap"><select class="weight-input rpe-select" onchange="setTopSet(' + ei + ',\'rpe\',this.value)">' +
    '<option value="">RPE</option>';
  RPE_VALUES.forEach(function (r) {
    h += '<option value="' + r + '"' + (String(r) === String(rpe) ? " selected" : "") + ">RPE " + String(r).replace(".", ",") + "</option>";
  });
  h += "</select></div></div>";
  h += '<div class="est-box" id="est-' + ei + '">' + estHTML(c, w, ei) + "</div>";
  return h;
}

function estHTML(c, w, ei) {
  var k = c.week + "-" + c.day + "-" + ei;
  var e = e1rmFor(c, k);
  if (!e) return "";
  var h = '<div class="est-line">1RM estimé : <b>' + fmtKg(e) + " kg</b></div>";

  var target = parseFloat(w.rpe), done = parseFloat(c.rpe[k]);
  if (target && Math.abs(done - target) >= 1) {
    h += '<div class="est-sub">' + (done > target ? "Plus dur que prévu" : "Plus facile que prévu") +
      " (RPE " + String(done).replace(".", ",") + " au lieu de " + w.rpe.replace(".", ",") + ")</div>";
  }
  // Conseil pour la semaine suivante (pas après le deload : S7 = test 1RM)
  var next = WEEKS[c.week + 1];
  if (next && next.num <= 6) {
    var p = rpePct(next.ts, next.rpe);
    if (p) h += '<div class="est-sub">S' + next.num + " conseillé : x" + next.ts + " @ RPE " + next.rpe.replace(".", ",") +
      " ≈ <b>" + fmtKg(round25(e * p / 100)) + " kg</b></div>";
  } else if (next && next.num === 7) {
    h += '<div class="est-sub">Objectif test S7 ≈ <b>' + fmtKg(round25(e)) + " kg</b></div>";
  }
  return h;
}

function setTopSet(ei, field, val) {
  var c = cyc(), k = c.week + "-" + c.day + "-" + ei;
  c[field] = c[field] || {};
  if ((c[field][k] || "") === val) return;
  if (val === "") delete c[field][k]; else c[field][k] = val;
  saveState();
  updateEst(ei);
  updateCalc(ei); // le backoff du deload dépend du 1RM estimé
}

// Met à jour le 1RM estimé sans tout ré-afficher (évite de fermer le clavier)
function updateEst(ei) {
  var el = document.getElementById("est-" + ei);
  if (el) el.innerHTML = estHTML(cyc(), WEEKS[cyc().week], ei);
}
