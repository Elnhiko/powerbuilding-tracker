// État, rendu, timer, historique et gestion des cycles
// ═══ STATE ═══
var state={cycles:[{weights:{},done:{},week:0,day:0,started:Date.now()}],ci:0};
var timerInterval=null,timerSec=0,timerTarget=180,timerOn=false,audioCtx=null;

function loadState(){
  try{var d=localStorage.getItem("pb-v2");if(d){var p=JSON.parse(d);if(p.cycles&&p.cycles.length)state=p;}}catch(e){}
}
function saveState(){
  state.updatedAt=Date.now();
  try{localStorage.setItem("pb-v2",JSON.stringify(state));}catch(e){}
  if(window.PBSync)PBSync.onLocalChange(); // synchro cloud (js/sync.js)
}

function cyc(){return state.cycles[state.ci];}

// ═══ VIEWS ═══
function showView(id){
  document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active");});
  document.getElementById(id).classList.add("active");
  document.getElementById("timer-bar").style.display=id==="v-train"?"block":"none";
}
function showTrain(){showView("v-train");render();}
function showHistory(){showView("v-history");renderHistory();}

// ═══ RENDER ═══
function render(){
  var c=cyc(),w=WEEKS[c.week],days=buildDays(w),d=days[c.day];
  var isCurrent=state.ci===state.cycles.length-1;

  // Cycle bar
  document.getElementById("cycle-label").textContent="Cycle "+(state.ci+1);
  document.getElementById("badge-archive").style.display=isCurrent?"none":"inline";
  document.getElementById("btn-new-cycle").style.display=isCurrent?"inline-block":"none";

  // Phase
  document.getElementById("phase-title").innerHTML="S"+w.num+' <span style="color:'+w.color+'">'+w.phase+"</span>";
  var pill=document.getElementById("rpe-pill");
  pill.textContent="RPE "+w.rpe;
  pill.style.background=w.color+"22";pill.style.color=w.color;

  // Week tabs
  var wt="";
  WEEKS.forEach(function(wk,i){wt+='<button class="week-tab'+(i===c.week?" active":"")+'" onclick="setWeek('+i+')">S'+wk.num+"</button>";});
  document.getElementById("week-tabs").innerHTML=wt;

  // Day tabs
  var dt="";
  days.forEach(function(dy,i){dt+='<button class="day-tab'+(i===c.day?" active":"")+'" onclick="setDay('+i+')"><div class="label">'+dy.short+'</div><div class="sub">'+dy.tag+"</div></button>";});
  document.getElementById("day-tabs").innerHTML=dt;

  // Progress
  var doneN=0;d.exercises.forEach(function(_,i){if(c.done[c.week+"-"+c.day+"-"+i])doneN++;});
  document.getElementById("day-name").textContent=d.name;
  document.getElementById("progress-count").textContent=doneN+"/"+d.exercises.length;
  document.getElementById("progress-fill").style.width=(doneN/d.exercises.length*100)+"%";

  // Exercises
  var typeLabels={main:"PRINCIPAL",sec:"SECONDAIRE",hyp:"HYPERTROPHIE"};
  var html="";
  d.exercises.forEach(function(ex,i){
    var k=c.week+"-"+c.day+"-"+i;
    var isDone=!!c.done[k];
    var weight=c.weights[k]||"";
    var prev=getPrevHint(c.week,c.day,i);

    html+='<div class="ex-card'+(isDone?" done":"")+'">';
    html+='<div class="ex-top"><div class="ex-info">';
    html+='<div class="ex-name-row"><span class="ex-name">'+ex.name+'</span><span class="ex-type '+ex.type+'">'+typeLabels[ex.type]+"</span></div>";
    html+='<div class="ex-sets">'+ex.sets+"</div>";
    if(ex.backoff)html+='<div class="ex-backoff">'+ex.backoff+"</div>";
    html+="</div>";
    html+='<button class="check-btn'+(isDone?" checked":"")+'" onclick="toggleDone('+i+')">'+(isDone?"✓":"")+"</button>";
    html+="</div>";

    if(ex.track){
      html+='<div class="weight-row"><div class="weight-label">Charge :</div>';
      html+='<div class="weight-wrap"><input type="number" inputmode="decimal" class="weight-input" placeholder="—" value="'+weight+'" onchange="setWeight('+i+',this.value)" onblur="setWeight('+i+',this.value)"><span class="weight-unit">kg</span></div></div>';
      if(prev&&!weight)html+='<div class="prev-hint">↳ '+prev+"</div>";
    }
    html+="</div>";
  });
  document.getElementById("exercises").innerHTML=html;
}

function getPrevHint(wi,di,ei){
  if(state.ci===0)return null;
  var prev=state.cycles[state.ci-1];
  if(!prev)return null;
  var v=prev.weights[wi+"-"+di+"-"+ei];
  return v?v+" kg (cycle préc.)":null;
}

function setWeek(i){cyc().week=i;cyc().day=0;saveState();render();}
function setDay(i){cyc().day=i;saveState();render();}
function toggleDone(ei){var k=cyc().week+"-"+cyc().day+"-"+ei;cyc().done[k]=!cyc().done[k];saveState();render();}
function setWeight(ei,val){var k=cyc().week+"-"+cyc().day+"-"+ei;cyc().weights[k]=val;saveState();}

// ═══ TIMER ═══
function fmtTime(s){return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}

function startTimer(t){
  timerTarget=t;timerSec=0;timerOn=true;
  document.getElementById("timer-presets").style.display="none";
  document.getElementById("timer-running").style.display="flex";
  updateTimerDisplay();
  clearInterval(timerInterval);
  timerInterval=setInterval(function(){
    timerSec++;
    updateTimerDisplay();
    if(timerSec>=timerTarget){
      clearInterval(timerInterval);timerOn=false;
      try{
        if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
        [0,.18,.36].forEach(function(d){
          var o=audioCtx.createOscillator(),g=audioCtx.createGain();
          o.connect(g);g.connect(audioCtx.destination);
          o.frequency.value=880;g.gain.value=.3;
          o.start(audioCtx.currentTime+d);o.stop(audioCtx.currentTime+d+.1);
        });
      }catch(e){}
      if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);
    }
  },1000);
}

function stopTimer(){
  clearInterval(timerInterval);timerOn=false;timerSec=0;
  document.getElementById("timer-presets").style.display="flex";
  document.getElementById("timer-running").style.display="none";
}

function updateTimerDisplay(){
  var done=timerSec>=timerTarget;
  document.getElementById("timer-display").textContent=fmtTime(timerSec);
  document.getElementById("timer-display").style.color=done?"var(--a)":"var(--t)";
  document.getElementById("timer-target-display").textContent="/ "+fmtTime(timerTarget);
  var pct=Math.min(timerSec/timerTarget*100,100);
  var fill=document.getElementById("timer-fill");
  fill.style.width=pct+"%";
  fill.style.background=done?"var(--a)":"var(--g)";
}

// ═══ HISTORY ═══
function renderHistory(){
  var html="";
  state.cycles.forEach(function(c,idx){
    var rms=get1RMs(c);
    var isCur=idx===state.ci;
    var sd=c.started?new Date(c.started).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}):"—";
    var ed=c.ended?new Date(c.ended).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}):null;
    var dn=Object.values(c.done).filter(Boolean).length;

    html+='<div class="hist-card'+(isCur?" current":"")+'">';
    html+='<div class="hist-header"><div><span class="hist-title">Cycle '+(idx+1)+"</span>";
    if(isCur)html+='<span class="badge-en-cours">EN COURS</span>';
    html+='</div><div class="hist-date">'+sd+(ed?" → "+ed:"")+"</div></div>";
    html+='<div class="hist-rms">';
    LIFTS.forEach(function(l){
      var short=l==="Soulevé de Terre"?"Deadlift":l;
      html+='<div class="hist-rm"><div class="lift">'+short+'</div><div class="val" style="color:'+(rms[l]?"var(--a)":"var(--d)")+'">'+(rms[l]||"—")+"</div></div>";
    });
    html+="</div>";
    html+='<div class="hist-meta">'+dn+" exercices complétés</div>";
    var canDel=state.cycles.length>1;
    if(!isCur||canDel){
      html+='<div class="hist-actions">';
      if(!isCur)html+='<button class="btn-consult" onclick="consultCycle('+idx+')">Consulter</button>';
      if(canDel)html+='<button class="btn-consult btn-delete" onclick="deleteCycle('+idx+')">Supprimer</button>';
      html+="</div>";
    }
    html+="</div>";
  });
  document.getElementById("history-list").innerHTML=html;
}

function consultCycle(idx){state.ci=idx;saveState();showTrain();}

function deleteCycle(idx){
  if(state.cycles.length<=1)return;
  if(!confirm("Supprimer le Cycle "+(idx+1)+" ?\n\nToutes ses charges seront perdues. Cette action est irréversible."))return;
  var wasLast=idx===state.cycles.length-1;
  state.cycles.splice(idx,1);
  // Si on supprime le cycle en cours, le précédent redevient le cycle en cours
  if(wasLast)delete state.cycles[state.cycles.length-1].ended;
  if(state.ci>idx||state.ci>=state.cycles.length)state.ci--;
  else if(state.ci===idx)state.ci=state.cycles.length-1;
  saveState();
  renderHistory();
}

// ═══ NEW CYCLE ═══
var pendingEstimates=null;

function prepareNewCycle(){
  var c=cyc();
  pendingEstimates=estimateWeights(c.weights);
  var rms=get1RMs(c);
  var hasEst=Object.keys(pendingEstimates).length>0;
  var hasRMs=Object.keys(rms).length>0;

  document.getElementById("nc-title").innerHTML='Lancer le <span style="color:var(--a)">Cycle '+(state.cycles.length+1)+"</span> ?";

  // Summary
  var sh='<div class="summary-card"><div class="summary-label">Résumé Cycle '+(state.ci+1)+"</div>";
  if(hasRMs){
    LIFTS.forEach(function(l){
      sh+='<div class="summary-row"><span class="summary-lift">'+l+'</span><span class="summary-val" style="color:'+(rms[l]?"var(--a)":"var(--d)")+'">'+(rms[l]?rms[l]+" kg":"Non testé")+"</span></div>";
    });
  }else{
    sh+='<div style="font-size:13px;color:var(--d);">Aucun 1RM enregistré en S7. Estimations basées sur tes charges S1 + 2.5/5 kg.</div>';
  }
  sh+="</div>";
  document.getElementById("nc-summary").innerHTML=sh;

  // Estimates
  var eh="";
  if(hasEst){
    eh+='<div class="summary-card"><div class="summary-label" style="color:var(--g)">Charges estimées S1 (nouveau cycle)</div>';
    LIFTS.forEach(function(l){
      var m=LIFT_MAP[l],mk="0-"+m.main[0]+"-"+m.main[1],sk="0-"+m.sec[0]+"-"+m.sec[1];
      var mw=pendingEstimates[mk],sw=pendingEstimates[sk];
      eh+='<div class="est-row"><div class="est-lift">'+l+"</div>";
      eh+='<div class="est-detail"><span>Principal: <span style="color:var(--a)">'+(mw||"—")+' kg</span></span>';
      eh+='<span>Secondaire: <span style="color:var(--bl)">'+(sw||"—")+" kg</span></span></div></div>";
    });
    eh+='<div class="est-note">Les semaines suivantes sont aussi pré-remplies avec une progression estimée. Tu peux modifier manuellement.</div>';
    eh+="</div>";
  }
  document.getElementById("nc-estimates").innerHTML=eh;

  // Buttons
  var bh="";
  if(hasEst)bh+='<button class="btn-primary" onclick="confirmNewCycle(true)">Lancer avec charges estimées</button>';
  bh+='<button class="btn-secondary" onclick="confirmNewCycle(false)">Lancer vierge</button>';
  bh+='<button class="btn-ghost" onclick="showTrain()">Annuler</button>';
  document.getElementById("nc-buttons").innerHTML=bh;

  showView("v-newcycle");
}

function confirmNewCycle(useEst){
  var nc={weights:useEst&&pendingEstimates?Object.assign({},pendingEstimates):{},done:{},week:0,day:0,started:Date.now()};
  state.cycles[state.ci].ended=Date.now();
  state.cycles.push(nc);
  state.ci=state.cycles.length-1;
  pendingEstimates=null;
  saveState();
  showTrain();
}

// ═══ INIT ═══
loadState();
render();
