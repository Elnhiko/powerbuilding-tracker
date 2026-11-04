// Données et logique du programme (semaines, jours, exercices, estimations)
var WEEKS=[
  {num:1,phase:"Accumulation",rpe:"7",ts:5,bs:3,br:6,secS:4,secR:6,secRPE:"7",color:"#2ec4b6"},
  {num:2,phase:"Accumulation",rpe:"7.5",ts:5,bs:4,br:5,secS:4,secR:5,secRPE:"7.5",color:"#2ec4b6"},
  {num:3,phase:"Accumulation",rpe:"8",ts:4,bs:4,br:5,secS:3,secR:5,secRPE:"8",color:"#2ec4b6"},
  {num:4,phase:"Intensification",rpe:"8.5",ts:3,bs:3,br:4,secS:3,secR:4,secRPE:"8.5",color:"#4ea8de"},
  {num:5,phase:"Intensification",rpe:"9",ts:2,bs:2,br:3,secS:2,secR:3,secRPE:"8.5",color:"#4ea8de"},
  {num:6,phase:"Deload",rpe:"6",ts:5,bs:2,br:5,secS:2,secR:5,secRPE:"6",color:"#b388ff"},
  {num:7,phase:"Peak / Test",rpe:"10",ts:1,bs:0,br:0,secS:0,secR:0,secRPE:"-",color:"#e63946"}
];
var LIFTS=["Squat","Bench Press","Soulevé de Terre"];
var LIFT_MAP={
  "Squat":{main:[0,0],sec:[2,1]},
  "Bench Press":{main:[1,0],sec:[0,1]},
  "Soulevé de Terre":{main:[2,0],sec:[1,1]}
};

function buildDays(w){
  var isPeak=w.num===7,isDl=w.num===6,isInt=w.num>=4&&w.num<=5;
  var mainL=isPeak?"Montée → 1RM":"Top set x"+w.ts+" @ RPE "+w.rpe;
  function bo(dl){
    if(isPeak) return null;
    var s=dl?Math.max(w.bs-1,2):w.bs;
    if(isDl) return s+"x"+w.br+" @ RPE 6";
    return s+"x"+w.br+" @ -"+(isInt?"10%":"10-12%");
  }
  var secL=isPeak?null:isDl?w.secS+"x"+w.secR+" @ RPE 6":w.secS+"x"+w.secR+" @ RPE "+w.secRPE;
  function a(ac,it,dl){return isPeak?null:isDl?dl:isInt?it:ac;}
  return [
    {name:"Jour 1 — Squat + Bench",short:"J1",tag:"Squat",exercises:[
      {name:"Squat",type:"main",sets:mainL,backoff:bo(false),track:true},
      {name:"Bench Press",type:"sec",sets:secL,track:true},
      {name:"Leg Extension",type:"hyp",sets:a("3x12-15","2x12-15","2x15")},
      {name:"Leg Curl",type:"hyp",sets:a("3x12-15","2x12-15","2x15")},
      {name:"Mollets",type:"hyp",sets:a("4x12-15","3x12-15","2x15")}
    ].filter(function(e){return e.sets})},
    {name:"Jour 2 — Bench + Deadlift",short:"J2",tag:"Bench",exercises:[
      {name:"Bench Press",type:"main",sets:mainL,backoff:bo(false),track:true},
      {name:"Soulevé de Terre",type:"sec",sets:secL,track:true},
      {name:"Dév. Haltères Incliné",type:"hyp",sets:a("3x10-12","2x10-12","2x12")},
      {name:"Élévations Latérales",type:"hyp",sets:a("3x15-20","2x15","2x15")},
      {name:"Triceps Poulie",type:"hyp",sets:a("3x12-15","2x12-15","2x15")}
    ].filter(function(e){return e.sets})},
    {name:"Jour 3 — Deadlift + Squat",short:"J3",tag:"Deadlift",exercises:[
      {name:"Soulevé de Terre",type:"main",sets:mainL,backoff:bo(true),track:true},
      {name:"Squat",type:"sec",sets:secL,track:true},
      {name:"Tirage Vertical",type:"hyp",sets:a("3x10-12","2x10-12","2x12")},
      {name:"Bûcheron",type:"hyp",sets:a("3x10-12","2x10-12","2x12")},
      {name:"Curl Barre",type:"hyp",sets:a("3x10-12","2x10-12","2x12")}
    ].filter(function(e){return e.sets})}
  ];
}

function round25(v){return Math.round(v/2.5)*2.5;}
function isLower(n){return n==="Squat"||n==="Soulevé de Terre";}

function estimateWeights(prev){
  var est={};
  LIFTS.forEach(function(lift){
    var m=LIFT_MAP[lift],rmK="6-"+m.main[0]+"-"+m.main[1];
    var rm=parseFloat(prev[rmK]),s1m=parseFloat(prev["0-"+m.main[0]+"-"+m.main[1]]);
    var s1s=parseFloat(prev["0-"+m.sec[0]+"-"+m.sec[1]]);
    var bump=isLower(lift)?5:2.5;
    var newM,newS;
    if(rm>0){newM=round25(rm*.75);newS=round25(rm*.70);}
    else if(s1m>0){newM=round25(s1m+bump);newS=s1s>0?round25(s1s+bump):null;}
    else return;
    var mP=[1,1.03,1.07,1.12,1.18,.85,null],sP=[1,1.03,1.07,1.12,1.15,.85,null];
    for(var i=0;i<7;i++){
      if(i===6)continue;
      if(newM&&mP[i])est[i+"-"+m.main[0]+"-"+m.main[1]]=String(round25(newM*mP[i]));
      if(newS&&sP[i])est[i+"-"+m.sec[0]+"-"+m.sec[1]]=String(round25(newS*sP[i]));
    }
  });
  return est;
}

function get1RMs(cyc){
  var r={};
  LIFTS.forEach(function(l){var m=LIFT_MAP[l],k="6-"+m.main[0]+"-"+m.main[1],v=parseFloat(cyc.weights[k]);if(v>0)r[l]=v;});
  return r;
}
