/* Swordland Showdown planner (swordland/index.html).
   One legion: 40 players, like the game's Legion Combatants list: 30 Join and 10 Substitute. The game
   marks each player Join or Substitute (not by power), so every player has that switch (p.s = substitute).
   Substitutes only get in during the first 3 minutes if a Join player doesn't come.

   Tiers (user's rules, 2026-11-27):
   - A+ holds up to 3 buildings, A up to 2: they take a building and stay in it to defend it, swap to
     defense hero gear when a rally is coming, and keep their city next to their buildings.
   - B and C never hold a building. Their 5-6 marches garrison buildings, fill rallies and gather
     Undercellars.
   - a holder's buildings must be next to each other (NEAR), never across the map. Their city stays in the safe zone; they only teleport to loot, and a teleport brings
     every march home, so looters send their marches out again afterwards.
   Tier is chosen from power (share of the strongest Join player's power), the player can change it.

   A plan has steps (Opening, Swordshrine, Late game by default, editable). Per step:
   - b[building] = {o: order to take it, h: holder id, note}
   - p[player]   = {g: [buildings garrisoned], r: marches filling rallies, l: loots, u: Undercellars wave 1/2}
   Marches used = buildings held + g + r + loot + Undercellars. The map has one Undercellars marker (UC) that counts gatherers per wave. Players are kept by id ('p1'..), so sorting keeps their jobs.

   Rules used (kingshotwiki.com, kingshotalmanach.com, heaven-guardian.com, kingshotguide.org + the building card):
   - 60 min match, Swordshrine, Mercenary and Reformation locked for the first 15 min (b.lock).
   - capture = hold 3 min (Bell Tower halves it), then first-control bonus + points every minute.
   - half of a building's points pile up on it; when it flips they drop as loot.
   - Royal Stables halves the free teleport cooldown (10 -> 5 min), Reformation buffs troops,
     Mercenary sends mercenary attacks.
   - Undercellars (kingshot.net): 8 in phase 3, two waves of four about 15 and 20 min into the phase, at random
     spots (not on our map), 4,800 points each. User: 2 gatherers per Undercellar.
   - leaving the field heals all troops, 12 min before you can enter again.
   - map is the same turned 180° for the other side: Blue spawns left, Red right. */
(function(){
const KS=window.KS,{$,esc}=KS;
const KEY=KS.KEYS.swordland;
const say=KS.msg('msg');
const SLOTS=40,ENTER=30,SUBS=10,MAXSTEPS=6,MARCH=5,MAXM=8;
const CAP={'A+':3,A:2,B:0,C:0};
const GEAR='swap to defense hero gear when a rally is coming';
/* x/y: place on the map picture (0..1). pts: [first control, per minute] alliance points. w: how much
   a building matters when spreading garrisons */
const B=[
  {id:'shrine',k:'swordshrine',n:'Swordshrine',x:.5,y:.5,pts:[9000,1800],fx:'Opens at 15 min. Mercenaries attack whoever holds it.',big:1,w:6,lock:1},
  {id:'sanW',k:'sanctum',n:'Sanctum',x:.25,y:.43,pts:[6000,1200],fx:'',w:5},
  {id:'sanE',k:'sanctum',n:'Sanctum',x:.75,y:.62,pts:[6000,1200],fx:'',w:5},
  {id:'abN',k:'abbey',n:'Abbey N',x:.64,y:.14,pts:[3000,600],fx:'',w:3},
  {id:'abE',k:'abbey',n:'Abbey E',x:.80,y:.45,pts:[3000,600],fx:'',w:3},
  {id:'abW',k:'abbey',n:'Abbey W',x:.20,y:.60,pts:[3000,600],fx:'',w:3},
  {id:'abS',k:'abbey',n:'Abbey S',x:.36,y:.88,pts:[3000,600],fx:'',w:3},
  {id:'bell',k:'belltower',n:'Bell Tower',x:.36,y:.14,pts:[1200,240],fx:'Capture time halved (3 → 1.5 min).',w:2},
  {id:'merc',k:'mercenary',n:'Mercenary',x:.50,y:.26,pts:[1200,240],fx:'Opens at 15 min. Lets you send mercenary attacks on buildings.',w:2,lock:1},
  {id:'reform',k:'reformation',n:'Reformation',x:.50,y:.76,pts:[1200,240],fx:'Opens at 15 min. Buff for all your troops.',w:2,lock:1},
  {id:'stables',k:'stables',n:'Stables',x:.64,y:.87,pts:[1200,240],fx:'Free teleport every 5 min instead of 10.',w:2},
  ];
/* buildings a holder can keep together: centres closer than NEAR on the map (y squeezed to the map's 600/520 shape) */
const NEAR=.33;
const dist=(a,b)=>Math.hypot(BY[a].x-BY[b].x,(BY[a].y-BY[b].y)*520/600);
const UC_WAVE=4,UC_EACH=2;   /* Undercellars: 2 waves of 4 at random spots, 2 gatherers each */
const BY=Object.fromEntries(B.map(b=>[b.id,b]));
const SIDES={blue:'Blue (left)',red:'Red (right)'};

/* ---------- state ---------- */
let st,sel='sanW',pick=null;
const stepBlank=(n,t)=>({n,t,b:{},p:{}});
const pBlank=(i)=>({id:'p'+(i+1),n:'',p:'',s:i>=ENTER,t:'',m:MARCH});
const blank=()=>({v:2,side:'blue',cur:0,players:Array.from({length:SLOTS},(_,i)=>pBlank(i)),
  steps:[stepBlank('Opening','0–15 min'),stepBlank('Swordshrine','15–40 min'),stepBlank('Late game','40–60 min')]});
const str=(v,m)=>String(v==null?'':v).replace(/[\u0000-\u001f]/g,' ').slice(0,m);
const intIn=(v,lo,hi,d)=>{v=Math.round(+v);return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):d;};
function clean(s){const b=blank();if(!s||typeof s!=='object')return b;
  const seen=new Set(),pl=[];
  (Array.isArray(s.players)?s.players:[]).forEach(p=>{if(p&&/^p\d{1,3}$/.test(p.id)&&!seen.has(p.id)&&pl.length<SLOTS){seen.add(p.id);
    pl.push({id:p.id,n:str(p.n,24),p:str(p.p,12),s:typeof p.s==='boolean'?p.s:pl.length>=ENTER,
      t:CAP[p.t]!=null?p.t:'',m:intIn(p.m,1,MAXM,MARCH)});}});
  for(let i=1;pl.length<SLOTS;i++)if(!seen.has('p'+i)){seen.add('p'+i);const q=pBlank(i-1);q.s=pl.length>=ENTER;pl.push(q);}
  const ok=id=>typeof id==='string'&&seen.has(id)?id:'';
  const steps=(Array.isArray(s.steps)?s.steps:[]).filter(x=>x&&typeof x==='object').slice(0,MAXSTEPS).map(x=>{const o={n:str(x.n,24),t:str(x.t,16),b:{},p:{}};
    const job=id=>{if(!o.p[id])o.p[id]={g:[],r:0,l:0,u:0};return o.p[id];};
    Object.entries(x.b&&typeof x.b==='object'?x.b:{}).forEach(([k,a])=>{if(!a||typeof a!=='object')return;
      /* the 4 Undercellar spots of earlier versions: their gatherers become wave 1 */
      if(/^uc/.test(k)){(Array.isArray(a.j)?a.j:[]).map(ok).filter(Boolean).forEach(id=>{job(id).u=1;});return;}
      if(!BY[k])return;
      /* version 1 had a rally leader (r), a garrison leader (g) and joiners (j): the leader becomes the holder,
         joiners garrison the building */
      const h=ok(a.h)||ok(a.r)||ok(a.g);
      const v={o:intIn(a.o,0,9,0),h,note:str(a.note,80)};
      if(v.o||v.h||v.note)o.b[k]=v;
      if(Array.isArray(a.j))a.j.map(ok).filter(id=>id&&id!==h).forEach(id=>{const q=job(id);if(!q.g.includes(k))q.g.push(k);});});
    Object.entries(x.p&&typeof x.p==='object'?x.p:{}).forEach(([id,q])=>{if(!ok(id)||!q||typeof q!=='object')return;const j=job(id);
      (Array.isArray(q.g)?q.g:[]).forEach(k=>{if(/^uc/.test(k))j.u=j.u||1;else if(BY[k]&&!j.g.includes(k))j.g.push(k);});
      j.r=intIn(q.r,0,MAXM,0);j.l=q.l?1:0;j.u=intIn(q.u,0,2,0)||j.u;});
    Object.keys(o.p).forEach(id=>{const q=o.p[id];if(!q.g.length&&!q.r&&!q.l&&!q.u)delete o.p[id];});
    return o;});
  const out={v:2,side:s.side==='red'?'red':'blue',players:pl,steps:steps.length?steps:b.steps,cur:0};
  out.cur=Math.min(out.steps.length-1,Math.max(0,Math.round(+s.cur)||0));return out;}
function loadSaved(){st=clean(KS.read(KEY));}
let saveT=0;
const save=()=>{clearTimeout(saveT);saveT=0;KS.write(KEY,st);};
const later=()=>{clearTimeout(saveT);saveT=setTimeout(save,400);};

/* ---------- helpers ---------- */
const step=()=>st.steps[st.cur];
const slotOf=id=>st.players.findIndex(p=>p.id===id);
const P=id=>st.players.find(p=>p.id===id);
const pname=id=>{const i=slotOf(id);if(i<0)return '';const p=st.players[i];return p.n||('Slot '+(i+1));};
const isSub=id=>{const p=P(id);return !!(p&&p.s);};
const joins=()=>st.players.filter(p=>!p.s&&p.n.trim());
function bname(id){const b=BY[id];if(b.k!=='sanctum')return b.n;
  const ours=(id==='sanW')===(st.side==='blue');return 'Sanctum ('+(ours?'ours':'enemy')+')';}
const ourSan=()=>st.side==='blue'?'sanW':'sanE';
const asg=(id,s)=>(s||step()).b[id];
function asgW(id){const s=step();if(!s.b[id])s.b[id]={o:0,h:'',note:''};return s.b[id];}
function tidy(id){const a=step().b[id];if(a&&!a.o&&!a.h&&!a.note)delete step().b[id];}
const job=(id,s)=>(s||step()).p[id]||{g:[],r:0,l:0,u:0};
function jobW(id){const s=step();if(!s.p[id])s.p[id]={g:[],r:0,l:0,u:0};return s.p[id];}
function tidyJob(id){const q=step().p[id];if(q&&!q.g.length&&!q.r&&!q.l&&!q.u)delete step().p[id];}
/* power text like 6,918, 85M, 1.2B -> number */
function powerNum(t){const m=String(t).replace(/[\s,]/g,'').match(/^(\d+(?:\.\d+)?)([kmb])?/i);if(!m)return -1;
  return +m[1]*({k:1e3,m:1e6,b:1e9}[(m[2]||'').toLowerCase()]||1);}
/* tier from power: A+ >= 75% of the strongest Join player, A >= 55%, B >= 30%, else C.
   Without any power typed: list order (2 A+, 4 A, 8 B, rest C). */
function autoTiers(){const js=joins(),top=Math.max(0,...js.map(p=>powerNum(p.p))),out={};
  if(top>0)st.players.forEach(p=>{const v=powerNum(p.p),r=v/top;out[p.id]=v<0?'C':r>=.75?'A+':r>=.55?'A':r>=.3?'B':'C';});
  else js.forEach((p,i)=>{out[p.id]=i<2?'A+':i<6?'A':i<14?'B':'C';});
  return out;}
let tierCache=null;
const tierOf=id=>{const p=P(id);if(!p)return 'C';if(p.t)return p.t;if(!tierCache)tierCache=autoTiers();return tierCache[id]||'C';};
const cap=id=>CAP[tierOf(id)];
const holds=(id,s)=>Object.entries((s||step()).b).filter(([,a])=>a.h===id).map(([k])=>k);
const used=(id,s)=>{const q=job(id,s);return holds(id,s).length+q.g.length+q.r+(q.l?1:0)+(q.u?1:0);};
/* a holder's buildings that are too far from each other */
function spread(id,s){const h=holds(id,s);return h.some(a=>h.some(b=>a<b&&dist(a,b)>NEAR));}
const nearAll=(id,bid,s)=>holds(id,s).every(k=>dist(k,bid)<=NEAR);
const fmtP=p=>p.p?' · '+esc(p.p):'';
/* garrison marches per building in a step */
function garrisons(bid,s){return Object.entries((s||step()).p).filter(([,q])=>q.g.includes(bid)).map(([id])=>id);}

/* problems in a step */
function problems(s){const out=[];
  st.players.forEach(p=>{if(!p.n.trim())return;const h=holds(p.id,s),q=job(p.id,s),u=used(p.id,s),t=tierOf(p.id);
    if(h.length&&p.s)out.push(p.n+' is a substitute and may not get in: pick a Join player to hold '+h.map(bname).join(', ')+'.');
    if(h.length&&!CAP[t])out.push(p.n+' is tier '+t+': B and C players garrison and fill rallies, they don\'t hold buildings.');
    else if(h.length>CAP[t])out.push(p.n+' holds '+h.length+' buildings, tier '+t+' can hold '+CAP[t]+'.');
    if(u>p.m)out.push(p.n+' needs '+u+' marches but has '+p.m+'.');
    if(h.length>1&&spread(p.id,s))out.push(p.n+'\'s buildings are too far apart ('+h.map(bname).join(', ')+'): a holder keeps buildings next to each other.');
});
  if(st.steps.indexOf(s)===0)Object.entries(s.b).forEach(([b,a])=>{if(BY[b].lock&&(a.o||a.h))out.push(bname(b)+' is locked for the first 15 minutes.');});
  return out;}

/* ---------- map ---------- */
function drawMap(){const s=step(),box=$('sw-map');
  box.innerHTML='<div class="sw-spawn sw-blue'+(st.side==='blue'?' ours':'')+'"><span>'+(st.side==='blue'?'Us':'Enemy')+'</span></div>'+
    '<div class="sw-spawn sw-red'+(st.side==='red'?' ours':'')+'"><span>'+(st.side==='red'?'Us':'Enemy')+'</span></div>'+
    B.map(b=>{const a=asg(b.id,s)||{},lock=b.lock&&st.cur===0,n=garrisons(b.id,s).length;
    const extra=b.uc?(n?n+' gathering':''):(n?'+'+n:'');
    return '<button type="button" class="sw-b'+(b.big?' big':'')+(b.uc?' uc':'')+(sel===b.id?' sel':'')+(a.o||a.h||n?' used':'')+(lock?' lock':'')+
      '" data-b="'+b.id+'" style="left:'+(b.x*100)+'%;top:'+(b.y*100)+'%" title="'+esc(bname(b.id))+'">'+
      (a.o?'<i class="sw-ord">'+a.o+'</i>':'')+
      '<img src="../assets/swordland/'+b.k+'.webp" alt="" draggable="false">'+
      '<span class="sw-lab">'+esc(b.uc?'Undercellars':bname(b.id))+'</span>'+
      (a.h?'<span class="sw-lead">'+esc(pname(a.h))+(extra?' <b>'+extra+'</b>':'')+'</span>':lock?'<span class="sw-lock">Opens 15:00</span>':extra?'<span class="sw-more">'+extra+'</span>':'')+
      '</button>';}).join('')+ucMarker(s);}
/* one Undercellars marker: they appear at random spots in phase 3, so it only counts the gatherers per wave */
const UC={x:.70,y:.31};
const ucCount=(w,s)=>joins().filter(p=>job(p.id,s).u===w).length;
function ucMarker(s){const a=ucCount(1,s),b=ucCount(2,s),lock=st.cur<2&&!a&&!b,full=UC_WAVE*UC_EACH;
  return '<button type="button" class="sw-b uc'+(sel==='uc'?' sel':'')+(a||b?' used':'')+(lock?' lock':'')+'" data-b="uc" style="left:'+(UC.x*100)+'%;top:'+(UC.y*100)+'%" title="Undercellars: random spots in phase 3">'+
    '<img src="../assets/swordland/undercellars.webp" alt="" draggable="false"><span class="sw-lab">Undercellars</span>'+
    (a||b?'<span class="sw-more">W1 '+a+'/'+full+' · W2 '+b+'/'+full+'</span>':lock?'<span class="sw-lock">Phase 3</span>':'')+'</button>';}

/* ---------- steps ---------- */
function drawSteps(){$('sw-steps').innerHTML=st.steps.map((s,i)=>'<button type="button" role="tab" aria-selected="'+(i===st.cur)+'" data-step="'+i+'"><b>'+
  esc(s.n||'Step '+(i+1))+'</b><small>'+esc(s.t)+'</small></button>').join('');
  $('step-n').value=step().n;$('step-t').value=step().t;
  $('btn-step-add').disabled=st.steps.length>=MAXSTEPS;$('btn-step-del').disabled=st.steps.length<2;$('btn-step-copy').disabled=st.cur===0;
  document.querySelectorAll('input[name=side]').forEach(r=>{r.checked=r.value===st.side;});}

/* ---------- selected building ---------- */
function holderOpts(cur){const named=st.players.filter(p=>p.n.trim()||p.id===cur);
  const opt=p=>'<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+esc(p.n||'(empty)')+fmtP(p)+
    ' · holds '+holds(p.id).length+'/'+cap(p.id)+(p.s?' · sub':'')+'</option>';
  const grp=(lab,l)=>l.length?'<optgroup label="'+lab+'">'+l.map(opt).join('')+'</optgroup>':'';
  return '<option value="">—</option>'+grp('Tier A+ (up to 3)',named.filter(p=>!p.s&&tierOf(p.id)==='A+'))+
    grp('Tier A (up to 2)',named.filter(p=>!p.s&&tierOf(p.id)==='A'))+
    grp('Not holders (B, C, substitutes)',named.filter(p=>p.s||!cap(p.id)));}
function addOpts(skip,lab){return '<option value="">'+lab+'</option>'+st.players.map(p=>{if(!p.n.trim()||skip.includes(p.id))return '';
  return '<option value="'+p.id+'">'+esc(p.n)+fmtP(p)+' · '+tierOf(p.id)+' · '+used(p.id)+'/'+p.m+' marches'+(p.s?' · sub':'')+'</option>';}).join('');}
function drawUcSel(){const el=$('sel'),s=step(),full=UC_WAVE*UC_EACH;
  el.innerHTML='<div class="sw-sel-head"><img src="../assets/swordland/undercellars.webp" alt=""><div><h3>Undercellars</h3>'+
    '<p>'+esc(s.n||'Step '+(st.cur+1))+(s.t?' · '+esc(s.t):'')+'</p></div></div>'+
    '<p class="sw-pts">8 appear in phase 3: two waves of 4, about 15 and 20 minutes into the phase. Each holds <b>4,800</b> points.</p>'+
    '<p class="sw-fx">Random spots: find them with the magnifying glass on the minimap. 2 gatherers on each, 1 march each.</p>'+
    [1,2].map(w=>{const l=joins().filter(p=>job(p.id).u===w);
      return '<div class="field"><span class="label">Wave '+w+' ('+l.length+'/'+full+')</span><div class="sw-chips">'+
        l.map(p=>'<span class="sw-chip">'+esc(p.n)+' <small>'+tierOf(p.id)+'</small><button type="button" data-unu="'+p.id+'" aria-label="Remove '+esc(p.n)+'">×</button></span>').join('')+
        '</div><select data-addu="'+w+'" aria-label="Add a gatherer to wave '+w+'"><option value="">Add a gatherer…</option>'+
        st.players.filter(p=>p.n.trim()&&!p.s&&job(p.id).u!==w).map(p=>'<option value="'+p.id+'">'+esc(p.n)+fmtP(p)+' · '+tierOf(p.id)+' · '+used(p.id)+'/'+p.m+' marches</option>').join('')+'</select></div>';}).join('');
  el.querySelectorAll('[data-unu]').forEach(x=>x.onclick=()=>{jobW(x.dataset.unu).u=0;tidyJob(x.dataset.unu);changed();});
  el.querySelectorAll('[data-addu]').forEach(x=>x.onchange=()=>{if(!x.value)return;jobW(x.value).u=+x.dataset.addu;changed();});}
function drawSel(){if(sel==='uc'){drawUcSel();return;}const b=BY[sel],a=asg(sel)||{o:0,h:'',note:''},el=$('sel'),g=garrisons(sel);
  const pts=b.pts?'<p class="sw-pts">First control <b>'+KS.fmt(b.pts[0])+'</b> · then <b>+'+KS.fmt(b.pts[1])+'</b>/min alliance points (personal: half).</p>':'';
  const nobody=!joins().length?'<p class="sw-hint">Type your players in the list below first.</p>':'';
  const hn=a.h?holds(a.h).length:0;
  el.innerHTML='<div class="sw-sel-head"><img src="../assets/swordland/'+b.k+'.webp" alt=""><div><h3>'+esc(bname(sel))+'</h3>'+
    '<p>'+esc(step().n||'Step '+(st.cur+1))+(step().t?' · '+esc(step().t):'')+'</p></div></div>'+pts+(b.fx?'<p class="sw-fx">'+esc(b.fx)+'</p>':'')+nobody+
    '<div class="sw-form">'+
    '<label class="field"><span class="label">Order</span><select id="f-o">'+['Any time','Take 1st','2nd','3rd','4th','5th','6th','7th','8th','9th'].map((t,i)=>'<option value="'+i+'"'+(a.o===i?' selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
    (b.uc?'':'<label class="field" title="Takes the building and stays in it to defend it"><span class="label">Holder</span><select id="f-h">'+holderOpts(a.h)+'</select></label>')+
    '</div>'+(hn>1?'<p class="sw-fx">'+esc(pname(a.h))+' holds '+hn+' buildings: '+GEAR+'.</p>':'')+
    '<div class="field"><span class="label">'+(b.uc?'Gathering':'Garrison marches')+' ('+g.length+')</span><div class="sw-chips">'+
    g.map(id=>'<span class="sw-chip'+(isSub(id)?' is-sub':'')+'">'+esc(pname(id))+' <small>'+tierOf(id)+'</small><button type="button" data-unj="'+id+'" aria-label="Remove '+esc(pname(id))+'">×</button></span>').join('')+
    '</div><select id="f-j" aria-label="Add a player">'+addOpts(g.concat(a.h?[a.h]:[]),b.uc?'Add a gatherer…':'Add a garrison march…')+'</select></div>'+
    '<label class="field"><span class="label">Note</span><input type="text" id="f-note" maxlength="80" value="'+esc(a.note)+'" placeholder="e.g. hold until the Swordshrine opens"></label>'+
    '<div class="btns" style="margin-top:10px"><button type="button" id="btn-b-clear">Clear this building</button></div>';
  $('f-o').onchange=e=>{asgW(sel).o=+e.target.value;tidy(sel);changed();};
  if(!b.uc)$('f-h').onchange=e=>{const v=e.target.value;asgW(sel).h=v;const q=step().p[v];if(q){q.g=q.g.filter(x=>x!==sel);tidyJob(v);}tidy(sel);changed();};
  $('f-j').onchange=e=>{const v=e.target.value;if(!v)return;const q=jobW(v);if(!q.g.includes(sel))q.g.push(sel);changed();};
  $('f-note').oninput=e=>{asgW(sel).note=e.target.value.slice(0,80);tidy(sel);later();drawPlan();};
  el.querySelectorAll('[data-unj]').forEach(x=>x.onclick=()=>{const q=jobW(x.dataset.unj);q.g=q.g.filter(k=>k!==sel);tidyJob(x.dataset.unj);changed();});
  $('btn-b-clear').onclick=()=>{delete step().b[sel];Object.keys(step().p).forEach(id=>{const q=step().p[id];q.g=q.g.filter(k=>k!==sel);tidyJob(id);});changed();};}

/* ---------- step summary ---------- */
function sortedBuildings(s){return B.filter(b=>s.b[b.id]||garrisons(b.id,s).length).sort((x,y)=>(((s.b[x.id]||{}).o||99)-((s.b[y.id]||{}).o||99))||B.indexOf(x)-B.indexOf(y));}
function drawPlan(){const s=step(),list=sortedBuildings(s),pr=problems(s);
  const js=joins(),ral=js.filter(p=>job(p.id,s).r),loot=js.filter(p=>job(p.id,s).l);
  const idle=js.filter(p=>!used(p.id,s));
  $('plan').innerHTML=(list.length?'<ol class="sw-plan">'+list.map(b=>{const a=s.b[b.id]||{},g=garrisons(b.id,s);
    return '<li><button type="button" data-b="'+b.id+'"><b>'+(a.o?'#'+a.o+' ':'')+esc(bname(b.id))+'</b>'+
      (a.h?' · <span>'+esc(pname(a.h))+'</span>':'')+
      (g.length?(b.uc?' · gather '+g.map(id=>esc(pname(id))).join(', '):' · +'+g.length+' garrison'+(g.length>1?'s':'')):'')+
      (a.note?'<em>'+esc(a.note)+'</em>':'')+'</button></li>';}).join('')+'</ol>'
    :'<p class="mp-empty">Nothing planned in this step yet. Click a building on the map, or press <i>Suggest plan</i>.</p>')+
    (ral.length?'<p class="sw-free"><b>Fill rallies:</b> '+ral.map(p=>esc(p.n)+' ('+job(p.id,s).r+')').join(', ')+'</p>':'')+
    (loot.length?'<p class="sw-free"><b>Loot (teleport, then send marches back out):</b> '+loot.map(p=>esc(p.n)).join(', ')+'</p>':'')+
    [1,2].map(w=>{const l=js.filter(p=>job(p.id,s).u===w);return l.length?'<p class="sw-free"><b>Undercellars wave '+w+' ('+l.length+'/'+UC_WAVE*UC_EACH+'):</b> '+l.map(p=>esc(p.n)).join(', ')+'</p>':'';}).join('')+
    (idle.length?'<p class="sw-free"><b>No job yet ('+idle.length+'):</b> '+idle.map(p=>esc(p.n)).join(', ')+'</p>':'')+
    (pr.length?'<ul class="sw-warn">'+pr.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'');drawWhy();}

/* ---------- why this plan: explains the step from what is in it (suggested or not) ---------- */
function drawWhy(){const s=step(),si=st.cur,out=[],H=k=>s.b[k]&&s.b[k].h,N=id=>'<b>'+esc(pname(id))+'</b>';
  const theirs=ourSan()==='sanW'?'sanE':'sanW',js=joins();
  if(!Object.keys(s.b).length&&!Object.keys(s.p).length){$('why').innerHTML='<p class="mp-empty">Nothing planned in this step yet: press <i>Suggest plan</i> to see a plan and why it looks like that.</p>';return;}
  if(si===0){
    if(H('stables')||H('bell'))out.push('<b>Buffs first.</b> Stables gives the whole legion a free teleport every 5 minutes instead of 10, and the Bell Tower halves every capture after it. Both are quick to take and make the rest of the match faster.');
    out.push('<b>Swordshrine, Mercenary and Reformation</b> open at 15:00, so nobody waits on them now.');}
  if(H('sanW')||H('sanE'))out.push('<b>Sanctums</b> pay 6,000 when taken, then 1,200 a minute: '+(si?'second only to the Swordshrine':'the best income on the map until the Swordshrine opens')+'. '+
    (H(theirs)?'The enemy Sanctum is the hardest to take and keep, so it goes to '+N(H(theirs))+(H(ourSan())?'; ours goes to '+N(H(ourSan())):'')+'.':''));
  const ab=['abN','abE','abW','abS'].filter(H).length;
  if(ab)out.push('<b>Abbeys</b> pay 3,000, then 600 a minute. '+ab+' of 4 are taken to collect first-control bonuses all over the map, so the enemy has to split up to steal them.');
  if(si>0){
    if(H('reform'))out.push('<b>Reformation</b>'+((s.b.reform.o===1)?' first at 15:00':'')+': its troop buff helps every fight that follows.');
    if(H('shrine'))out.push('<b>Swordshrine</b> pays 9,000, then 1,800 a minute, the most on the map. It goes to '+N(H('shrine'))+', the strongest player with room left, and gets the most garrison marches because mercenaries attack whoever holds it.');
    if(H('merc'))out.push('<b>Mercenary</b> lets us send mercenary attacks on enemy buildings.');
    const prev=st.steps[si-1];if(prev&&Object.keys(prev.b).some(k=>prev.b[k].h&&prev.b[k].h===H(k)))out.push('Holders keep the buildings they took in the step before: moving would hand them to the enemy.');}
  const hs=js.filter(p=>holds(p.id,s).length);
  if(hs.length)out.push('<b>Holders</b> are tier A+ and A only, and a holder\'s buildings are always next to each other so they can defend them all: '+
    hs.map(p=>N(p.id)+' ('+tierOf(p.id)+'): '+holds(p.id,s).map(bname).map(esc).join(', ')).join('; ')+'.'+
    (hs.some(p=>holds(p.id,s).length>1)?' Anyone holding 2 or more swaps to defense hero gear when a rally is coming.':''));
  const gar=js.filter(p=>job(p.id,s).g.length);
  if(gar.length){const top=sortedBuildings(s).map(b=>[b.id,garrisons(b.id,s).length]).filter(x=>x[1]).sort((x,y)=>y[1]-x[1]).slice(0,3);
    out.push('<b>Garrisons.</b> '+gar.length+' B and C players stay in the safe zone, where they can\'t be burnt, and send their marches out: one fills rallies, the rest reinforce buildings. '+
      'The buildings worth the most, and attacked the most, get the most marches: '+top.map(([k,n])=>esc(bname(k))+' +'+n).join(', ')+'.');}
  const loot=js.filter(p=>job(p.id,s).l);
  if(loot.length)out.push('<b>Looters</b> ('+loot.map(p=>N(p.id)).join(', ')+'): when a building changes side, half its points drop on the ground. They teleport to pick them up, then send their marches back out, since a teleport brings every march home. Lower-power players do it, because the buildings need the stronger garrisons more.');
  const uc=js.filter(p=>job(p.id,s).u);
  if(uc.length)out.push('<b>Undercellars</b>: '+uc.length+' of the weakest players gather, 2 on each of the 8 (4,800 points each). Gathering needs no power, so the strong players stay on the buildings.');
  $('why').innerHTML=out.length?'<ul class="sw-why">'+out.map(x=>'<li>'+x+'</li>').join('')+'</ul>':'<p class="mp-empty">Nothing planned in this step yet: press <i>Suggest plan</i> to see a plan and why it looks like that.</p>';}

/* ---------- roster ---------- */
function jobText(id){const h=holds(id),q=job(id),out=[];
  if(h.length)out.push('Holds '+h.map(bname).join(', ')+(h.length>1?' (defense gear)':''));
  const gs=q.g.filter(k=>!BY[k].uc),uc=q.g.filter(k=>BY[k].uc);
  if(gs.length)out.push('Garrison '+gs.map(bname).join(', '));if(uc.length)out.push('Gather '+uc.map(bname).join(', '));
  if(q.r)out.push('Rallies ×'+q.r);if(q.l)out.push('Loot');if(q.u)out.push('Undercellars wave '+q.u);
  return out.join(' · ');}
function drawRoster(){tierCache=null;const auto=autoTiers();
  $('roster').innerHTML=st.players.map((p,i)=>{const q=job(p.id),u=used(p.id),t=tierOf(p.id);
    return '<li class="sw-row'+(p.s?' is-sub':'')+(pick===p.id?' pick':'')+'" data-id="'+p.id+'">'+
    '<span class="sw-num" role="button" tabindex="0" draggable="true" data-pick="'+p.id+'" title="Drag onto a building, or click then click a building">'+(i+1)+'</span>'+
    '<input type="text" class="sw-n" data-f="n" maxlength="24" value="'+esc(p.n)+'" placeholder="Player" aria-label="Name, slot '+(i+1)+'">'+
    '<input type="text" class="sw-p" data-f="p" maxlength="12" value="'+esc(p.p)+'" placeholder="Power" aria-label="Power, slot '+(i+1)+'">'+
    '<button type="button" class="sw-st'+(p.s?' is-sub':'')+'" data-st="'+p.id+'" title="Join or Substitute, as in the game">'+(p.s?'Substitute':'Join')+'</button>'+
    '<span class="sw-ctl"><select class="sw-tier t-'+t.replace('+','p')+'" data-f="t" aria-label="Tier, slot '+(i+1)+'" title="A+ holds up to 3 buildings, A up to 2. B and C garrison, fill rallies and loot.">'+
      '<option value="">Auto: '+(auto[p.id]||'C')+'</option>'+['A+','A','B','C'].map(x=>'<option'+(p.t===x?' selected':'')+'>'+x+'</option>').join('')+'</select>'+
    '<label class="sw-in" title="Marches this player has"><input type="number" data-f="m" min="1" max="'+MAXM+'" value="'+p.m+'" aria-label="Marches, slot '+(i+1)+'"><span>marches</span></label>'+
    '<label class="sw-in" title="Marches filling rallies in this step"><select data-j="r" aria-label="Rally marches, slot '+(i+1)+'">'+
      Array.from({length:MAXM+1},(_,k)=>'<option value="'+k+'"'+(q.r===k?' selected':'')+'>'+k+'</option>').join('')+'</select><span>rallies</span></label>'+
    '<label class="sw-in sw-loot" title="Teleports to loot in this step"><input type="checkbox" data-j="l"'+(q.l?' checked':'')+'><span>loot</span></label>'+
    '<label class="sw-in" title="Gathers an Undercellar in this step (2 waves of 4, 2 gatherers each)"><select data-j="u" aria-label="Undercellars, slot '+(i+1)+'">'+
      ['—','wave 1','wave 2'].map((t,k)=>'<option value="'+k+'"'+(q.u===k?' selected':'')+'>'+t+'</option>').join('')+'</select><span>undercellars</span></label>'+
    '<span class="sw-use'+(u>p.m?' over':'')+'" title="Marches used in this step">'+u+'/'+p.m+' used</span></span>'+
    '<span class="sw-task">'+esc(jobText(p.id))+'</span>'+
    '<span class="sw-mv"><button type="button" data-mv="-1" aria-label="Move up"'+(i?'':' disabled')+'>▲</button><button type="button" data-mv="1" aria-label="Move down"'+(i<SLOTS-1?'':' disabled')+'>▼</button></span></li>';}).join('');
  drawCount();}
function drawCount(){const j=joins().length,sb=st.players.filter(p=>p.s&&p.n.trim()).length,c=$('count');
  c.innerHTML='<span'+(j>ENTER?' class="over"':'')+'>Join '+j+'/'+ENTER+'</span> · <span'+(sb>SUBS?' class="over"':'')+'>Substitute '+sb+'/'+SUBS+'</span>';}
function refreshRows(){tierCache=null;const auto=autoTiers();document.querySelectorAll('#roster .sw-row').forEach(r=>{const p=P(r.dataset.id),q=job(p.id),u=used(p.id);
  r.querySelector('.sw-task').textContent=jobText(p.id);const us=r.querySelector('.sw-use');us.textContent=u+'/'+p.m+' used';us.classList.toggle('over',u>p.m);
  r.querySelector('[data-j="r"]').value=q.r;r.querySelector('[data-j="l"]').checked=!!q.l;r.querySelector('[data-j="u"]').value=q.u||0;
  const ts=r.querySelector('.sw-tier');ts.className='sw-tier t-'+tierOf(p.id).replace('+','p');ts.options[0].textContent='Auto: '+(auto[p.id]||'C');});}

function drawAll(){tierCache=null;drawSteps();drawMap();drawSel();drawPlan();drawRoster();}
function changed(){tierCache=null;save();drawMap();drawSel();drawPlan();refreshRows();}

/* a player dropped/clicked onto a building: holder if it has none and the player can hold one, else a garrison march */
function assign(id,bid){if(bid==='uc'){const nm=pname(id);
    if(isSub(id)){say(nm+' is a substitute: pick a Join player to gather.','warn');return;}
    const q=jobW(id);
    if(q.u){say(nm+' already gathers in wave '+q.u+'.','warn');tidyJob(id);return;}
    q.u=ucCount(1)<UC_WAVE*UC_EACH?1:2;   /* wave 1 until it has its 8, then wave 2 */
    say(nm+' gathers Undercellars in wave '+q.u+'.','ok');sel='uc';changed();return;}
  const b=BY[bid],a=asgW(bid),nm=pname(id),q=step().p[id];
  if(a.h===id||(q&&q.g.includes(bid))){tidy(bid);say(nm+' is already at '+bname(bid)+'.','warn');return;}
  if(!b.uc&&!a.h&&cap(id)&&!isSub(id)){a.h=id;say(nm+' holds '+bname(bid)+'.','ok');}
  else{jobW(id).g.push(bid);tidy(bid);say(nm+(b.uc?' gathers at ':' sends a garrison march to ')+bname(bid)+'.','ok');}
  sel=bid;changed();}

/* ---------- suggest plan: fills only what is empty ----------
   Holders keep their buildings from the step before; the Swordshrine goes to the strongest with room.
   Other buildings by importance; each goes first to the strongest A+/A player who holds nothing yet,
   then to the least loaded for their tier among those whose buildings are all next to it (NEAR).
   Garrisons: every B/C Join player (and A player without a building) with no job in the step keeps 1 march for rallies and sends the rest
   to held buildings, spread by building weight (Sanctums and Swordshrine get the most).
   From the 2nd step the 3 weakest free players also loot; in Late game (phase 3) the weakest free players gather the Undercellars, 2 on each (16). */
function priority(si){const ours=ourSan(),theirs=ours==='sanW'?'sanE':'sanW';
  const far=st.side==='blue'?['abN','abE']:['abS','abW'],near=st.side==='blue'?['abW','abS']:['abE','abN'];
  return (si?['shrine']:[]).concat([theirs,ours],far,['stables','bell'],near,si?['reform','merc']:[]);}
const skipped=new Set();
function suggest(){tierCache=null;const js=joins().slice().sort((a,b)=>powerNum(b.p)-powerNum(a.p));
  if(js.length<4){say('Type your Join players with their power first.','warn');return 0;}
  const holders=js.filter(p=>cap(p.id));
  if(!holders.length){say('Nobody is tier A+ or A: type powers, or set a tier on your strongest players.','warn');return 0;}
  let filled=0;skipped.clear();
  st.steps.forEach((s,si)=>{
    /* holders stay on their buildings from the step before */
    if(si)Object.entries(st.steps[si-1].b).forEach(([k,a])=>{if(!a.h||(s.b[k]&&s.b[k].h)||holds(a.h,s).length>=cap(a.h)||!nearAll(a.h,k,s))return;
      if(!s.b[k])s.b[k]={o:0,h:'',note:''};s.b[k].h=a.h;filled++;});
    priority(si).forEach(bid=>{const a=s.b[bid];if(a&&a.h)return;
      /* room left, and every building they hold is next to this one */
      const room=holders.filter(p=>holds(p.id,s).length<cap(p.id)&&used(p.id,s)<p.m&&nearAll(p.id,bid,s));if(!room.length){skipped.add(bid);return;}
      /* the Swordshrine goes to the strongest player with room left */
      let pk=bid==='shrine'?room[0]:room.find(p=>!holds(p.id,s).length);
      /* next buildings: the least loaded for their tier (held / max), then power */
      if(!pk)pk=room.slice().sort((x,y)=>(holds(x.id,s).length/cap(x.id)-holds(y.id,s).length/cap(y.id))||(powerNum(y.p)-powerNum(x.p)))[0];
      if(!s.b[bid])s.b[bid]={o:0,h:'',note:''};s.b[bid].h=pk.id;filled++;});
    const ord=si===0?{stables:1,bell:2,sanW:3,sanE:3,abN:4,abE:4,abW:4,abS:4}:{reform:1,shrine:2,merc:3};
    Object.entries(ord).forEach(([k,o])=>{if(s.b[k]&&!s.b[k].o)s.b[k].o=o;});
    const held=Object.keys(s.b).filter(k=>s.b[k].h);
    const cnt={};held.forEach(k=>cnt[k]=garrisons(k,s).length);
    /* B/C players, and A players left without a building, get marches jobs */
    const free=js.filter(p=>!s.p[p.id]&&!holds(p.id,s).length),weakest=free.slice().reverse();
    /* Undercellars only in phase 3 (Late game): 2 gatherers on each of the 4 per wave */
    const taken=[1,2].map(w=>Object.values(s.p).filter(q=>q.u===w).length);
    const need=si>=2?[UC_WAVE*UC_EACH-taken[0],UC_WAVE*UC_EACH-taken[1]].map(n=>Math.max(0,n)):[0,0];
    const uc=weakest.slice(0,need[0]+need[1]),loot=si>=1?weakest.slice(uc.length,uc.length+3):[];
    free.forEach(p=>{const q={g:[],r:0,l:0,u:0};let m=p.m;
      const ui=uc.indexOf(p);if(ui>=0){q.u=ui<need[0]?1:2;m--;}
      if(loot.includes(p)&&m>0){q.l=1;m--;}
      if(m>0){q.r=1;m--;}
      for(;m>0;m--){const best=held.filter(k=>!q.g.includes(k)).sort((x,y)=>(cnt[x]+1)/BY[x].w-(cnt[y]+1)/BY[y].w)[0];if(!best)break;q.g.push(best);cnt[best]++;}
      if(q.g.length||q.r||q.l||q.u){s.p[p.id]=q;filled++;}});
  });
  return filled;}

/* ---------- chat text ---------- */
function chatText(){const out=['Swordland plan, we spawn '+SIDES[st.side],
  'Holders: keep your city next to your buildings. Everyone else: stay in the safe zone and teleport only to loot (a teleport brings every march home: send them back out after).'];
  st.steps.forEach((s,i)=>{out.push('','== '+(s.n||'Step '+(i+1))+(s.t?' ('+s.t+')':'')+' ==');
    const l=sortedBuildings(s);if(!l.length)out.push('(nothing planned)');
    /* buildings: holder and how many garrison marches; then one line per player so each finds their name */
    l.forEach(b=>{const a=s.b[b.id]||{},g=garrisons(b.id,s);
      out.push((a.o?a.o+'. ':'- ')+bname(b.id)+(a.h?': '+pname(a.h):'')+(g.length&&!b.uc?' (+'+g.length+' garrison)':'')+(a.note?' ('+a.note+')':''));});
    const js=joins(),multi=js.filter(p=>holds(p.id,s).length>1);
    if(multi.length)out.push('Defense gear ('+GEAR+'): '+multi.map(p=>p.n).join(', '));
    const lines=js.filter(p=>{const q=job(p.id,s);return q.g.length||q.r||q.l||q.u;}).map(p=>{const q=job(p.id,s),x=[];
      const gs=q.g.filter(k=>!BY[k].uc),uc=q.g.filter(k=>BY[k].uc);
      if(gs.length)x.push('garrison '+gs.map(bname).join(', '));if(uc.length)x.push('gather '+uc.map(bname).join(', '));
      if(q.r)x.push('rallies '+q.r);if(q.l)x.push('LOOT');if(q.u)x.push('Undercellars wave '+q.u);return '  '+p.n+': '+x.join(' · ');});
    if(js.some(p=>job(p.id,s).u))out.push('Undercellars: 2 waves of 4 at random spots, find them with the magnifying glass on the minimap, 2 of us on each.');
    if(lines.length)out.push('Marches:',...lines);});
  return out.join('\n');}

/* ---------- share code ---------- */
function pack(){const p={v:2,side:st.side,players:st.players,steps:st.steps};
  return 'KSW1:'+btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/=+$/,'');}
function unpack(code){const m=String(code).trim().match(/^KSW1:(.+)$/is);if(!m)throw new Error('Paste a code that starts with KSW1:');
  let b=m[1].replace(/\s/g,'');while(b.length%4)b+='=';return clean(JSON.parse(decodeURIComponent(escape(atob(b)))));}

/* ---------- events ---------- */
$('sw-steps').onclick=e=>{const b=e.target.closest('[data-step]');if(!b)return;st.cur=+b.dataset.step;save();drawAll();};
$('step-n').oninput=e=>{step().n=e.target.value.slice(0,24);later();drawSteps();drawSel();};
$('step-t').oninput=e=>{step().t=e.target.value.slice(0,16);later();drawSteps();drawSel();};
$('btn-step-add').onclick=()=>{if(st.steps.length>=MAXSTEPS)return;st.steps.splice(st.cur+1,0,stepBlank('Step '+(st.cur+2),''));st.cur++;save();drawAll();$('step-n').focus();};
$('btn-step-copy').onclick=()=>{if(!st.cur)return;const prev=st.steps[st.cur-1];step().b=JSON.parse(JSON.stringify(prev.b));step().p=JSON.parse(JSON.stringify(prev.p));save();drawAll();say('Copied every job from the step before.','ok');};
KS.confirmButton($('btn-step-del'),()=>{if(st.steps.length<2)return;st.steps.splice(st.cur,1);st.cur=Math.max(0,st.cur-1);save();drawAll();});
document.querySelectorAll('input[name=side]').forEach(r=>r.onchange=()=>{st.side=r.value;save();drawAll();});

const map=$('sw-map');
map.onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;
  if(pick){const id=pick;pick=null;assign(id,b.dataset.b);drawRoster();return;}
  sel=b.dataset.b;drawMap();drawSel();};
map.ondragover=e=>{const b=e.target.closest('[data-b]');if(!b)return;e.preventDefault();map.querySelectorAll('.drop').forEach(x=>x!==b&&x.classList.remove('drop'));b.classList.add('drop');};
map.ondragleave=e=>{const b=e.target.closest('[data-b]');if(b&&!b.contains(e.relatedTarget))b.classList.remove('drop');};
map.ondrop=e=>{const b=e.target.closest('[data-b]');if(!b)return;e.preventDefault();const id=e.dataTransfer.getData('text/x-ksw');
  map.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop'));if(P(id)){pick=null;assign(id,b.dataset.b);drawRoster();}};
$('plan').onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;sel=b.dataset.b;drawMap();drawSel();$('sel').scrollIntoView({block:'nearest',behavior:'smooth'});};

const ro=$('roster');
ro.addEventListener('input',e=>{const f=e.target.dataset.f;if(f!=='n'&&f!=='p')return;const p=P(e.target.closest('[data-id]').dataset.id);
  p[f]=e.target.value.slice(0,f==='n'?24:12);later();tierCache=null;drawMap();drawPlan();if(f==='n')drawCount();});
ro.addEventListener('change',e=>{const r=e.target.closest('[data-id]');if(!r)return;const p=P(r.dataset.id),f=e.target.dataset.f,j=e.target.dataset.j;
  if(f==='t')p.t=CAP[e.target.value]!=null?e.target.value:'';
  else if(f==='m'){p.m=intIn(e.target.value,1,MAXM,MARCH);e.target.value=p.m;}
  else if(j==='r'){jobW(p.id).r=intIn(e.target.value,0,MAXM,0);tidyJob(p.id);}
  else if(j==='l'){jobW(p.id).l=e.target.checked?1:0;tidyJob(p.id);}
  else if(j==='u'){jobW(p.id).u=intIn(e.target.value,0,2,0);tidyJob(p.id);}
  else if(f!=='n'&&f!=='p')return;
  changed();});
ro.addEventListener('click',e=>{const sw=e.target.closest('[data-st]');
  if(sw){const p=P(sw.dataset.st);p.s=!p.s;save();drawRoster();drawMap();drawSel();drawPlan();const b=ro.querySelector('[data-st="'+p.id+'"]');if(b)b.focus();return;}
  const pk=e.target.closest('[data-pick]');
  if(pk){const id=pk.dataset.pick;if(!P(id).n.trim()){say('Type a name in slot '+(slotOf(id)+1)+' first.','warn');return;}
    pick=pick===id?null:id;drawRoster();if(pick)say('Now click a building on the map for '+pname(id)+'.','ok');else say('','ok');return;}
  const mv=e.target.closest('[data-mv]');if(!mv)return;const i=slotOf(mv.closest('[data-id]').dataset.id),j=i+(+mv.dataset.mv);
  if(j<0||j>=SLOTS)return;[st.players[i],st.players[j]]=[st.players[j],st.players[i]];save();drawRoster();drawSel();drawPlan();
  const btn=ro.querySelector('[data-id="'+st.players[j].id+'"] [data-mv="'+mv.dataset.mv+'"]');if(btn&&!btn.disabled)btn.focus();});
/* the slot number is a span (Firefox won't drag a button): Enter/Space click it */
ro.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.sw-num')){e.preventDefault();e.target.click();}});
ro.addEventListener('dragstart',e=>{const pk=e.target.closest('[data-pick]');if(!pk)return;const id=pk.dataset.pick;
  if(!P(id).n.trim()){e.preventDefault();say('Type a name in slot '+(slotOf(id)+1)+' first.','warn');return;}
  e.dataTransfer.setData('text/x-ksw',id);e.dataTransfer.effectAllowed='copy';});

/* "Name power join|sub" lines into the list from slot 1 */
function fillLines(lines){lines.forEach((l,i)=>{const p=st.players[i];const w=l.match(/[\s,;\t]+(join|joins|substitute|sub)$/i);
    p.s=w?/^s/i.test(w[1]):i>=ENTER;if(w)l=l.slice(0,w.index).trim();const m=l.match(/^(.*?)[\s,;\t]+(\d[\d.,]*\s*[kmb]?)$/i);
    if(m){p.n=m[1].trim().slice(0,24);p.p=m[2].replace(/\s/g,'').slice(0,12);}else{p.n=l.slice(0,24);p.p='';}p.t='';p.m=MARCH;});}
$('btn-paste').onclick=()=>{const lines=$('paste').value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).slice(0,SLOTS);
  if(!lines.length){say('Paste one player per line first.','warn');return;}
  fillLines(lines);save();drawAll();say(lines.length+' players filled in from slot 1. Check Join / Substitute against the game.','ok');};
$('btn-sort').onclick=()=>{const idx=new Map(st.players.map((p,i)=>[p.id,i]));
  st.players.sort((a,b)=>{const ea=!a.n.trim(),eb=!b.n.trim();if(ea!==eb)return ea?1:-1;if(a.s!==b.s)return a.s?1:-1;return (powerNum(b.p)-powerNum(a.p))||(idx.get(a.id)-idx.get(b.id));});
  save();drawAll();say('Sorted: Join players first, strongest first, then substitutes.','ok');};

$('btn-suggest').onclick=()=>{say('','ok');const n=suggest();if(!n){if(!$('msg').textContent)say('Nothing left to fill: every building and player already has a job.','ok');return;}
  save();drawAll();say('Suggested '+n+' jobs from power, in every step. What you had set stays.'+
    (skipped.size?' No holder near enough with room for: '+[...skipped].map(bname).join(', ')+' (set one yourself, or make someone tier A).':''),skipped.size?'warn':'ok');};
/* example: a real Legion 1 list (the site owner's alliance, in the game's order), with the suggested plan */
const EXAMPLE=["GobZ 2,430 sub", "Drogon 8,723 join", "Pong 6,918 join", "Rhaegal 6,191 join", "llomgui 5,910 join", "Kristall 4,967 join", "Luli 1,809 join", "Viserion 3,043 sub", "Nicole 5,030 join", "Jacek 84 3,975 join", "Charlena 3,796 join", "Phoenixlord 3,593 join", "Face King Hugger 3,515 join", "~~Bong~~ 2,463 join", "ItsJustRaymond 2,434 join", "Sunnyy 2,427 sub", "Alibaba 2,403 join", "Afrin 2,382 join", "Bluezbell 2,357 join", "厶DREAM厶 2,311 join", "°ʚɞ°Angela°ʚɞ° 2,274 join", "gwiou 2,256 join", "TH² 2,168 join", "HealtyHapyWealty 2,168 join", "~`SlayeR`~ 2,131 join", "Vitez Voja 2,109 join", "JAVA_ 2,103 join", "亖 FRAUDGY 1,986 join", "》》》DMAX《《《 1,970 join", "Kizzor 1,964 join", "Flimpo 1,927 join", "BellaBunny 1,922 join", "Xxx Paradise xxX 1,870 sub", "Bellatrix 1,797 sub", "Mr Boombastic 1,743 sub", "ThePunisher 1,727 sub", "Snake 1,639 sub", "-.`ค dazzyy ค´.- 1,230 sub", "josjis 1,138 sub"];
KS.confirmButton($('btn-example'),()=>{st=blank();st.side='blue';fillLines(EXAMPLE);pick=null;sel='sanE';suggest();save();drawAll();
  say('Example loaded: a real Legion 1 with the suggested plan. Click any step, building or player to look around.','ok');},'Replaces your plan: click again');
$('btn-import').onclick=()=>{try{const s=unpack($('code').value);st=s;save();pick=null;drawAll();say('Plan loaded.','ok');}catch(err){say(err.message||'This code could not be read.','err');}};
$('btn-export').onclick=()=>{save();KS.copyCode(pack(),'Plan code copied: paste it in alliance chat.',say);};
$('btn-link').onclick=()=>{save();const u=location.href.split('#')[0]+'#'+pack();KS.copyCode(u,'Link copied.',say);};
$('btn-chat').onclick=()=>{const t=chatText();$('chat').value=t;$('chat-box').open=true;KS.copyCode(t,'Plan text copied: paste it in alliance chat.',say,'chat');};
KS.confirmButton($('btn-clear-jobs'),()=>{st.steps.forEach(s=>{s.b={};s.p={};});save();drawAll();say('Every job cleared, players kept.','ok');});
KS.confirmButton($('btn-clear'),()=>{st=blank();pick=null;sel='sanW';save();drawAll();say('Plan reset.','ok');});

function fromHash(){const h=decodeURIComponent(location.hash.slice(1));if(!/^KSW1:/i.test(h))return;
  try{st=unpack(h);save();say('Plan loaded from the link.','ok');}catch(e){say('The link has a plan that could not be read.','err');}
  history.replaceState(null,'',location.pathname+location.search);}

loadSaved();fromHash();drawAll();
window.addEventListener('hashchange',()=>{fromHash();drawAll();});
window.KSPage={flush(){if(saveT)save();},reload(){loadSaved();pick=null;drawAll();say('','ok');}};
})();
