// Calculs pratiques à la salle : charge des séries de backoff et disques à mettre sur la barre.
// Barre olympique 20 kg, disques standards (par côté).
var BAR_KG = 20;
var PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

// Disques par côté pour une charge totale ; reste = ce qui ne peut pas être chargé exactement
function platesFor(total) {
  total = num(total);
  if (!total || total < BAR_KG) return null;
  var side = (total - BAR_KG) / 2, list = [];
  PLATES.forEach(function (p) { while (side >= p - 1e-9) { list.push(p); side -= p; } });
  return { list: list, rest: Math.round(side * 2 * 100) / 100 };
}

function platesText(total) {
  var r = platesFor(total);
  if (!r) return "";
  if (!r.list.length) return "barre seule";
  var f = function (p) { return String(p).replace(".", ","); }; // garde 1,25 (pas d'arrondi)
  return r.list.map(f).join(" · ") + (r.rest > 0.01 ? " (+" + f(r.rest) + " kg non chargeable)" : "");
}

// Charge des séries de backoff à partir du top set (même logique que le programme :
// accumulation -10 à -12 %, intensification -10 %, deload @ RPE 6 via le 1RM estimé)
function backoffRange(c, w, ei) {
  if (w.num >= 7) return null;
  var k = c.week + "-" + c.day + "-" + ei, top = num(c.weights[k]);
  if (w.num === 6) {
    var e = e1rmFor(c, k), p = rpePct(w.br, 6);
    if (!e || !p) return null;
    var v = round25(e * p / 100);
    return { lo: v, hi: v };
  }
  if (!top) return null;
  if (w.num >= 4) { var t = round25(top * 0.9); return { lo: t, hi: t }; }
  return { lo: round25(top * 0.88), hi: round25(top * 0.9) };
}

function calcHTML(c, w, ex, ei) {
  if (ex.type === "hyp") return "";
  var k = c.week + "-" + c.day + "-" + ei, h = "";
  var pt = platesText(c.weights[k]);
  if (pt) h += '<div class="calc-line"><span>Disques / côté</span><b>' + pt + "</b></div>";
  if (ex.type === "main" && ex.backoff) {
    var b = backoffRange(c, w, ei);
    if (b) {
      h += '<div class="calc-line"><span>Backoff</span><b>' +
        (b.lo === b.hi ? fmtKg(b.hi) : fmtKg(b.lo) + "–" + fmtKg(b.hi)) + " kg</b></div>";
      var bp = platesText(b.hi);
      if (bp) h += '<div class="calc-line"><span>Disques / côté' + (b.lo === b.hi ? "" : " (" + fmtKg(b.hi) + ")") + "</span><b>" + bp + "</b></div>";
    }
  }
  return h;
}

function calcBoxHTML(c, w, ex, ei) {
  if (ex.type === "hyp") return "";
  return '<div class="calc-box" id="calc-' + ei + '">' + calcHTML(c, w, ex, ei) + "</div>";
}

// Mise à jour sans tout ré-afficher (évite de fermer le clavier)
function updateCalc(ei) {
  var el = document.getElementById("calc-" + ei);
  if (!el) return;
  var c = cyc(), w = WEEKS[c.week], ex = buildDays(w)[c.day].exercises[ei];
  el.innerHTML = calcHTML(c, w, ex, ei);
}
