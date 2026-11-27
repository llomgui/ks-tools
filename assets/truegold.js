(function(){
const D=window.TG_DATA,B={};D.forEach(b=>B[b.k]=b);
const KS=D.map(b=>b.k);
const {$,fmt}=window.KS;   /* shared helpers (common.js); KS below is this page's list of buildings */
const KEY=window.KS.KEYS.truegold;
const big=n=>n>=1e9?(n/1e9).toFixed(1).replace(/\.0$/,'')+'B':n>=1e6?(n/1e6).toFixed(n>=1e8?0:1).replace(/\.0$/,'')+'M':fmt(n);
const idxOf=(k,label)=>B[k].levels.indexOf(label);
const label=(k,i)=>{const l=B[k].levels[i];return l==='—'?'Not built':l;};
const days=s=>s/86400;
const ico=k=>`<img class="bico" src="../assets/buildings/${B[k].slug}.webp" alt="" width="96" height="96" loading="lazy">`;
/* time = base / (1 + all speed %) and x0.8 with Double Time; returned as a divisor */
const speedPct=()=>Math.max(0,st.speed)+st.wolf+st.min+st.gw+st.kvk;
const speedFactor=()=>(1+speedPct()/100)/(st.dt?0.8:1);
/* the whole TG level a step belongs to: 30 and 30.x -> 0, TG 3 and TG 3.x -> 3 */
const tierOf=(k,i)=>{const m=/^TG (\d+)/.exec(B[k].levels[i]);return m?+m[1]:0;};
const fmtD=d=>{if(!isFinite(d))return '—';const t=Math.round(d*24);const dd=Math.floor(t/24),h=t%24;return dd?`${dd}d${h?` ${h}h`:''}`:`${h}h`;};

/* ---------- dates: day offsets from today; the weekly Super Refinement reset is taken as Monday ---------- */
const today0=(()=>{const d=new Date();d.setHours(0,0,0,0);return d;})();
const isISO=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const dayOff=iso=>{const [y,m,d]=iso.split('-').map(Number);return Math.round((new Date(y,m-1,d)-today0)/864e5);};
const dateOf=off=>new Date(today0.getFullYear(),today0.getMonth(),today0.getDate()+Math.floor(off));
const fmtDate=off=>dateOf(off).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
const fmtDay=off=>dateOf(off).toLocaleDateString(undefined,{day:'numeric',month:'short'});
const nextReset=off=>{const f=Math.floor(off),dow=dateOf(f).getDay();return f+(((8-dow)%7)||7);};
const openOff=()=>isISO(st.open)?Math.max(0,dayOff(st.open)):0;
const byOff=()=>isISO(st.by)?dayOff(st.by):null;
/* weekly resets from the week that holds day `from` up to day `to` */
function resets(from,to){if(to<from)return 0;let n=1;for(let w=nextReset(from);w<=to;w=nextReset(w))n++;return n;}

/* ---------- Super Refinement ---------- */
const TIER_TG=[20,50,100,130,160],TIER_OUT=[1.45,2.15,3.18,3.44,3.71],REF_MAX=100;
const tier=i=>Math.min(4,Math.floor((i-1)/20));
/* weekly cost of N refinements: one discounted refinement per day; with N > 7, a batch after the reset (its first one discounted)
   then one a day on the other 6 days, so the discount lands on the most expensive refinements */
function week(N){
  N=Math.max(0,Math.min(REF_MAX,Math.floor(N)));let tg=0,out=0;
  for(let i=1;i<=N;i++){const disc=N<=7||i===1||i>N-6;tg+=TIER_TG[tier(i)]*(disc?0.5:1);out+=TIER_OUT[tier(i)];}
  return {n:N,tg,out};}
/* most Tempered that W weeks of refining give for a Truegold budget (same number each week, give or take one) */
function maxTTG(W,budget){if(W<=0||budget<=0)return 0;let best=0;
  for(let n=0;n<REF_MAX;n++){const a=week(n),b=week(n+1);for(let k=0;k<=W;k++){const tg=b.tg*k+a.tg*(W-k);if(tg<=budget)best=Math.max(best,b.out*k+a.out*(W-k));}}
  return best;}

/* ---------- state ---------- */
const EXAMPLE={cur:{TC:'TG 2',EM:'TG 2',CC:'TG 1',IN:'TG 1',BA:'TG 2',ST:'TG 2',RA:'TG 2',WA:'TG 1'},goal:{TC:'TG 5'},
  tg:600,ttg:0,inc:30,speed:60,bld:2,spd:0,wolf:0,min:0,gw:0,dt:0,kvk:0,open:'',by:'',qlvl:'TG 5'};
function fromLabels(o){
  const st={cur:{},goal:{},tg:+o.tg||0,ttg:+o.ttg||0,inc:+o.inc||0,speed:+o.speed||0,bld:Math.max(1,Math.min(2,+o.bld||1)),spd:Math.max(0,+o.spd||0),
    wolf:[0,5,7,9,12,15].includes(+o.wolf)?+o.wolf:0,min:[0,10,15].includes(+o.min)?+o.min:0,gw:+o.gw===10?10:0,dt:+o.dt?1:0,kvk:+o.kvk===5?5:0,
    open:isISO(o.open)?o.open:'',by:isISO(o.by)?o.by:'',qlvl:/^TG [1-8]$/.test(o.qlvl)?o.qlvl:'TG 8'};
  if(st.min===15)st.kvk=0;
  KS.forEach(k=>{const c=idxOf(k,(o.cur||{})[k]);st.cur[k]=c<0?0:c;const g=idxOf(k,(o.goal||{})[k]);st.goal[k]=g<0?st.cur[k]:Math.max(g,st.cur[k]);});
  return st;}
function toLabels(st){const o={cur:{},goal:{},tg:st.tg,ttg:st.ttg,inc:st.inc,speed:st.speed,bld:st.bld,spd:st.spd,wolf:st.wolf,min:st.min,gw:st.gw,dt:st.dt,kvk:st.kvk,
  open:st.open,by:st.by,qlvl:st.qlvl};
  KS.forEach(k=>{o.cur[k]=B[k].levels[st.cur[k]];if(st.goal[k]>st.cur[k])o.goal[k]=B[k].levels[st.goal[k]];});return o;}
let st;
function loadSaved(){
  try{const o=window.KS.read(KEY);st=o?fromLabels(o):null;}catch(e){st=null;}
  if(!st) st=fromLabels(EXAMPLE);}
loadSaved();
const save=()=>window.KS.write(KEY,toLabels(st));

/* ---------- what a goal needs ---------- */
function targets(goal=st.goal){
  const tgt={},why={};KS.forEach(k=>{tgt[k]=Math.max(goal[k],st.cur[k]);});
  for(let changed=true,guard=0;changed&&guard++<100;){changed=false;
    KS.forEach(k=>{for(let i=st.cur[k];i<tgt[k];i++) for(const [k2,lv] of B[k].steps[i][4]){
      const need=idxOf(k2,lv);
      if(need>tgt[k2]){tgt[k2]=need;why[k2]=`${B[k].name} ${label(k,i+1)}`;changed=true;}}});}
  return {tgt,why};}
function cost(goal){const {tgt,why}=targets(goal);let TG=0,TTG=0,T=0;
  KS.forEach(k=>{for(let i=st.cur[k];i<tgt[k];i++){const s=B[k].steps[i];TG+=s[0];TTG+=s[1];T+=s[2];}});
  return {tgt,why,TG,TTG,days:days(T)/speedFactor()};}
/* resources only: can a goal be paid by the "ready by" date? */
function byCheck(TG,TTG){const by=byOff();if(by==null)return null;
  const have=st.tg+Math.max(0,st.inc)*Math.max(0,by),budget=have-TG,W=resets(openOff(),by);
  const need=Math.max(0,TTG-st.ttg),got=need?maxTTG(W,budget):0;
  if(budget<0)return {ok:false,txt:`${fmt(-budget)} Truegold short`,W,got,need};
  if(got+1e-9<need)return {ok:false,txt:`≈ ${fmt(need-got)} Tempered short`,W,got,need};
  return {ok:true,txt:need?`≈ ${fmt(got-need)} Tempered spare`:'',W,got,need};}

/* ---------- schedule ---------- */
/* speedups: when they cover the whole build time every upgrade is instant; otherwise every build is shortened by the same share */
function simulate(c){
  const tgt=c.tgt,speed=speedFactor(),inc=Math.max(0,st.inc),by=byOff();
  const shrink=c.days<=0?1:st.spd>=c.days?0:1-st.spd/c.days;
  const lvl={...st.cur},next={...st.cur},busy={};
  let t=0,tg=st.tg,ttg=st.ttg,refTG=0,refOut=0,refWeeks=0,refFirst=null,nextWeek=openOff();const refs=[];
  const free=new Array(st.bld).fill(0),runs=[],lastRun={};
  const tc5=idxOf('TC','TG 5');
  const left=()=>KS.some(k=>lvl[k]<tgt[k]);
  const ttgLeft=()=>KS.reduce((a,k)=>{for(let i=next[k];i<tgt[k];i++)a+=B[k].steps[i][1];return a;},0);
  const ready=(k)=>next[k]<tgt[k]&&!busy[k]&&B[k].steps[next[k]][4].every(([k2,lv])=>lvl[k2]>=idxOf(k2,lv));
  /* Town Center first, then whatever the Town Center's next step waits for, then the longest remaining chain */
  function prio(k){
    if(k==='TC') return 3;
    const tcs=B.TC.steps[next.TC];
    if(next.TC<tgt.TC&&tcs&&tcs[4].some(([k2])=>k2===k)) return 2;
    let rem=0;for(let i=next[k];i<tgt[k];i++)rem+=B[k].steps[i][2];return 1+rem/1e9;}
  const LIMIT=3650,out=stuck=>({stuck,t,runs,refs,refTG,refOut,refWeeks,refFirst,tg,ttg,instant:shrink===0});
  for(let guard=0;guard<20000&&left();guard++){
    Object.keys(busy).forEach(k=>{if(busy[k].end<=t+1e-9){lvl[k]++;delete busy[k];}});
    if(!left()) break;
    /* weekly Super Refinement: only what the goal still needs, spread evenly over the weeks left before "ready by" */
    while(nextWeek<=t+1e-9){
      if(lvl.TC>=tc5){const need=ttgLeft()-ttg;
        if(need>0){const W=by!=null&&by>=nextWeek?resets(nextWeek,by):1;
          let n=0;for(;n<REF_MAX&&week(n).out*W<need;n++);
          let w=week(n);while(n>0&&w.tg>tg){n--;w=week(n);}
          if(n>0){tg-=w.tg;ttg+=w.out;refTG+=w.tg;refOut+=w.out;refWeeks++;refs.push({day:nextWeek,n,tg:w.tg,out:w.out});if(refFirst==null)refFirst=nextWeek;}}}
      nextWeek=nextReset(nextWeek);}
    let blocked=null;
    for(;;){
      const b=free.findIndex(f=>f<=t+1e-9);if(b<0)break;
      const cand=KS.filter(ready).sort((x,y)=>prio(y)-prio(x));
      if(!cand.length)break;
      const k=cand[0],s=B[k].steps[next[k]];
      if(s[0]>tg+1e-9||s[1]>ttg+1e-9){blocked={k,s,at:next[k]};break;}
      tg-=s[0];ttg-=s[1];
      const end=t+days(s[2])/speed*shrink;
      busy[k]={end};free[b]=end;
      /* one row per building and TG level (TG 3 → TG 4) */
      const last=lastRun[k];
      if(last&&tierOf(k,last.from)===tierOf(k,next[k])){last.to=next[k]+1;last.end=end;last.tg+=s[0];last.ttg+=s[1];}
      else{const r={k,from:next[k],to:next[k]+1,start:t,end,tg:s[0],ttg:s[1]};runs.push(r);lastRun[k]=r;}
      next[k]++;}
    /* instant builds: finish them now and look again */
    if(Object.values(busy).some(x=>x.end<=t+1e-9)) continue;
    const ev=[];
    Object.values(busy).forEach(x=>ev.push(x.end));
    if(blocked){
      if(blocked.s[0]>tg&&inc>0) ev.push(t+(blocked.s[0]-tg)/inc);
      if(blocked.s[1]>ttg&&tg>=week(1).tg) ev.push(nextWeek);}
    if(ttgLeft()>ttg&&(Object.keys(busy).length||blocked)&&!(blocked&&blocked.s[1]<=ttg&&blocked.s[0]>tg&&inc<=0)) ev.push(nextWeek);
    const nt=Math.min(...ev.filter(x=>x>t+1e-9));
    if(!isFinite(nt)||nt>LIMIT) return out(blocked||{k:KS.find(k=>lvl[k]<tgt[k]),s:[0,0],at:0});
    tg+=inc*(nt-t);t=nt;}
  const lk=KS.find(k=>lvl[k]<tgt[k]);
  if(lk) return out({k:lk,s:B[lk].steps[next[lk]]||[0,0],at:next[lk]});
  const end=Math.max(t,...Object.values(busy).map(x=>x.end),0);
  tg+=inc*(end-t);t=end;
  return out(null);}
/* the "ready by" verdict: the schedule decides, the resource check says how short */
function verdict(sim,c){const by=byOff();if(by==null||(!c.TG&&!c.TTG))return null;
  const chk=byCheck(c.TG,c.TTG);
  if(!sim.stuck&&Math.floor(sim.t)<=by) return {ok:true,txt:chk&&chk.ok&&chk.txt?`Ready · ${chk.txt}`:'Ready'};
  if(chk&&!chk.ok) return {ok:false,txt:chk.txt};
  if(sim.stuck) return {ok:false,txt:'Not enough by then'};
  return {ok:false,txt:`Build time runs ${Math.ceil(sim.t-by)} days late`};}

/* ---------- goal cards: 1, 2 or 3 troop buildings, or every building, at one TG level ---------- */
const TROOPS=['BA','ST','RA'];
let QG=[];
function quickGoals(){const lv=st.qlvl;
  const order=TROOPS.slice().sort((a,b)=>st.cur[b]-st.cur[a]);
  const make=keys=>{const g={};KS.forEach(k=>{g[k]=keys.includes(k)?Math.max(st.cur[k],nearest(k,lv)):st.cur[k];});return g;};
  const nm=keys=>keys.map(k=>B[k].name).join(', ');
  return [[1,'1 troop building'],[2,'2 troop buildings'],[3,'All 3 troop buildings']].map(([n,t])=>({t,d:nm(order.slice(0,n)),g:make(order.slice(0,n)),keys:order.slice(0,n)}))
    .concat([{t:'All buildings',d:'Every building',g:make(KS),keys:KS}]);}
const matchIdx=()=>QG.findIndex(q=>KS.some(k=>q.g[k]>st.cur[k])&&KS.every(k=>Math.max(st.goal[k],st.cur[k])===q.g[k]));
function renderGoals(){
  QG=quickGoals();const on=matchIdx();
  $('q-cards').innerHTML=QG.map((q,i)=>{const c=cost(q.g),none=!KS.some(k=>c.tgt[k]>st.cur[k]);
    let line='';
    if(none) line='Already there';
    else{const sim=simulate(c),v=verdict(sim,c);
      line=v?`<span class="${v.ok?'tg-ok':'tg-bad'}">${v.txt}</span>`:sim.stuck?'<span class="tg-bad">Not enough resources</span>':`Ready ${fmtDate(Math.floor(sim.t))}`;}
    const extra=KS.filter(k=>c.tgt[k]>q.g[k]).map(k=>`${B[k].name} ${label(k,c.tgt[k])}`);
    return `<button type="button" class="tg-goal${i===on?' on':''}" data-q="${i}" aria-pressed="${i===on}"${none?' disabled':''}>
      <span class="tg-qicons">${q.keys.map(ico).join('')}</span><b>${q.t}</b>
      <span class="tg-qd">${q.d}${extra.length?` · also ${extra.join(', ')}`:''}</span>
      ${none?'':`<span class="tg-gc">${fmt(c.TG)} Truegold · ${fmt(c.TTG)} Tempered</span>`}
      <span class="tg-gv">${line}</span></button>`;}).join('');
  const any=KS.some(k=>st.goal[k]>st.cur[k]);
  $('q-custom').textContent=on>=0?'':any?'Your own goal: set in the building list below.':'No goal yet: pick a card, or set a goal for a building below.';}

/* the refining summary in step 3: one line per weekly reset, split at the "ready by" date */
function refText(sim,need,by){
  const wk=r=>`<li><b>${fmtDay(r.day)}</b>: ${r.n} refinements, ${fmt(r.tg)} Truegold → about ${fmt(r.out)} Tempered</li>`;
  const sum=a=>a.reduce((x,r)=>x+r.out,0);
  const before=by==null?sim.refs:sim.refs.filter(r=>r.day<=by),after=by==null?[]:sim.refs.filter(r=>r.day>by);
  let h=`Your goal needs <b>${fmt(need)} Tempered</b>. Refining plan:<ul class="tg-refs">${before.map(wk).join('')}</ul>`;
  if(by!=null){const got=sum(before);
    h+=got+1e-9>=need?`<p>Enough by ${fmtDay(by)}.</p>`:
      `<p>By ${fmtDay(by)}: about ${fmt(got)} Tempered, <b>${fmt(need-got)} short</b>.${after.length?` The rest comes after your date:</p><ul class="tg-refs">${after.map(wk).join('')}</ul>`:'</p>'}`;}
  return h;}

/* ---------- render ---------- */
function opts(k,sel,min){return B[k].levels.map((l,i)=>i<min?'':`<option value="${i}"${i===sel?' selected':''}>${l==='—'?'Not built':l}</option>`).join('');}
function renderInputs(tgt,why){
  $('blds').innerHTML=D.map(b=>{const k=b.k,auto=tgt[k]>st.goal[k];
    return `<div class="tg-brow"><span class="tg-bn">${ico(k)}<span>${b.name}${auto?`<small>needs ${label(k,tgt[k])} for ${why[k]}</small>`:''}</span></span>
      <select data-cur="${k}" aria-label="${b.name} now">${opts(k,st.cur[k],0)}</select>
      <select data-goal="${k}" aria-label="${b.name} goal">${opts(k,Math.max(st.goal[k],st.cur[k]),st.cur[k])}</select></div>`;}).join('');}
function writeRes(){$('b-wolf').value=st.wolf;$('b-min').value=st.min;$('b-gw').value=st.gw;$('b-dt').value=st.dt;$('b-kvk').value=st.kvk;$('r-tg').value=st.tg;$('r-ttg').value=st.ttg;
  $('r-inc').value=st.inc;$('r-speed').value=st.speed;$('r-bld').value=st.bld;$('r-spd').value=st.spd;$('r-open').value=st.open;$('r-by').value=st.by;$('q-lvl').value=st.qlvl;}

function render(){
  const c=cost(st.goal),{tgt,why}=c;
  renderInputs(tgt,why);renderGoals();
  $('speed-sum').innerHTML=`Total construction speed <b>+${speedPct()}%</b>${st.dt?' and Double Time':''}: a 10-day build takes <b>${fmtD(10/speedFactor())}</b>.`;
  $('kvk-hint').textContent=st.min===15?'Not with High King':'';$('b-kvk').disabled=st.min===15;
  const speed=speedFactor(),res=[0,0,0,0],per=[];
  D.forEach(b=>{const k=b.k;let tg=0,ttg=0,t=0;
    for(let i=st.cur[k];i<tgt[k];i++){const s=b.steps[i];tg+=s[0];ttg+=s[1];t+=s[2];s[3].forEach((v,j)=>res[j]+=v);}
    if(tgt[k]>st.cur[k]) per.push(`<tr><td><span class="tg-pn">${ico(k)}${b.name}</span></td><td>${label(k,st.cur[k])} → ${label(k,tgt[k])}${tgt[k]>st.goal[k]?' <span class="chip">required</span>':''}</td>
      <td class="r">${fmt(tg)}</td><td class="r">${ttg?fmt(ttg):'—'}</td><td class="r">${fmtD(days(t)/speed)}</td></tr>`);});
  const tb=$('per').querySelector('tbody');
  tb.innerHTML=per.join('')||'<tr class="zero"><td colspan="5">Pick a goal in step 1.</td></tr>';
  if(per.length>1) tb.innerHTML+=`<tr class="best"><td><b>Total</b></td><td></td><td class="r"><b>${fmt(c.TG)}</b></td><td class="r"><b>${c.TTG?fmt(c.TTG):'—'}</b></td><td class="r"><b>${fmtD(c.days)}</b></td></tr>`;

  const sim=simulate(c),v=per.length?verdict(sim,c):null,by=byOff();
  /* summary */
  $('s-tg').textContent=fmt(c.TG+sim.refTG);
  $('s-tg2').textContent=`${fmt(c.TG)} buildings${sim.refTG?` + ${fmt(sim.refTG)} refining`:''}`;
  $('s-ttg').textContent=c.TTG?fmt(c.TTG):'0';
  $('s-ttg2').textContent=c.TTG?`you have ${fmt(st.ttg)}`:'none needed';
  const sd=$('s-days');sd.classList.toggle('up',!sim.stuck);
  if(!per.length){sd.textContent='—';$('s-date').textContent='';}
  else if(sim.stuck){sd.textContent='Stuck';$('s-date').textContent=sim.stuck.s[1]>sim.ttg?'needs Tempered':'needs Truegold';}
  else{sd.textContent=sim.t<0.5?'Today':fmtDay(Math.floor(sim.t));$('s-date').textContent=sim.instant?'speedups cover the build time':`in ${Math.ceil(sim.t)} days`;}
  const vb=$('verdict');
  if(v){vb.hidden=false;vb.className='tg-verdict '+(v.ok?'ok':'bad');
    vb.innerHTML=v.ok?`Ready by <b>${fmtDate(by)}</b>${v.txt!=='Ready'?` · ${v.txt.replace(/^Ready · /,'')}`:''}`:`Not ready by <b>${fmtDate(by)}</b>: ${v.txt}`;}
  else vb.hidden=true;

  /* step 3 summary */
  const need=Math.max(0,c.TTG-st.ttg);
  $('ref-sum').innerHTML=!per.length?'':!need?'Your goal needs no more Tempered Truegold.':
    sim.refWeeks?refText(sim,need,by):
    'No refining possible yet: you need Town Center TG 5 and some Truegold left after the buildings.';

  /* order */
  const rows=sim.runs.map((r,n)=>{const b=B[r.k];
    const when=sim.instant?(r.start<0.5?'Today':fmtDay(Math.floor(r.start))):`${fmtDay(Math.floor(r.start))} → ${fmtDay(Math.ceil(r.end))}`;
    return `<li><span class="num">${n+1}</span><div><div class="step-top"><b class="tg-pn">${ico(r.k)}${b.name}</b><span class="move">${label(r.k,r.from)} → ${label(r.k,r.to)}</span></div>
      <div class="cost">${when} · ${fmt(r.tg)} Truegold${r.ttg?` · ${fmt(r.ttg)} Tempered`:''}</div></div></li>`;});
  if(sim.stuck){const k=sim.stuck.k;rows.push(`<li><span class="num">!</span><div><div class="step-top"><b class="tg-pn">${ico(k)}${B[k].name}</b><span class="move">${label(k,sim.stuck.at)} → ${label(k,sim.stuck.at+1)}</span></div>
    <div class="cost">Stops here: ${sim.stuck.s[1]>sim.ttg?'not enough Tempered Truegold. Check the dates in step 3.':'not enough Truegold. Add your daily Truegold in step 2.'}</div></div></li>`);}
  $('order').innerHTML=rows.join('')||'<li class="empty" style="display:block">Nothing to upgrade yet. Pick a goal in step 1.</li>';
  $('order-note').textContent=sim.instant?'Do the upgrades in this order. Each shows the first day you have the Truegold and Tempered for it; your speedups finish the build.':
    'Each upgrade starts on a free builder as soon as its requirements, Truegold and Tempered are ready.';

  const notes=[];
  const autos=KS.filter(k=>tgt[k]>st.goal[k]);
  if(autos.length) notes.push(`<p>Added because your goal needs them: ${autos.map(k=>`<b>${B[k].name} ${label(k,tgt[k])}</b>`).join(', ')}.</p>`);
  if(per.length) notes.push(`<p>Build time with your boosts: <b>${fmtD(c.days)}</b>${st.bld>1?' in total over all builders':''}. ${st.spd?(sim.instant?`Your ${fmt(st.spd)} days of speedups cover it.`:`Your ${fmt(st.spd)} days of speedups cover ${Math.round(st.spd/c.days*100)}% of it.`):'Add your speedups in step 2 if you will use them.'}</p>`);
  const short=c.TG+sim.refTG-st.tg;
  if(per.length&&short>0) notes.push(`<p>You need <b>${fmt(short)} more Truegold</b> than you have${st.inc>0?`: about ${Math.ceil(short/st.inc)} days of income at ${fmt(st.inc)} a day`:''}.</p>`);
  if(per.length) notes.push(`<p>Also needed: ${big(res[0])} Bread, ${big(res[1])} Wood, ${big(res[2])} Stone, ${big(res[3])} Iron.</p>`);
  $('notes').innerHTML=notes.join('');
  save();
  if(document.activeElement!==$('code')) $('code').value=exportCode();}

/* ---------- code ---------- */
const CODE='KST1:';
const exportCode=()=>CODE+btoa(unescape(encodeURIComponent(JSON.stringify(toLabels(st))))).replace(/=+$/,'');
function importCode(txt){
  const raw=String(txt||'').trim().replace(/^.*#/,'');
  if(!raw.startsWith(CODE)) throw new Error('This is not a Truegold code. It should start with '+CODE);
  let o;try{o=JSON.parse(decodeURIComponent(escape(atob(raw.slice(CODE.length).replace(/\s+/g,'')))));}catch(e){throw new Error('This code is damaged. Copy it again in full.');}
  if(!o||typeof o!=='object'||!o.cur) throw new Error('This code is damaged. Copy it again in full.');
  return fromLabels(o);}

/* ---------- events ---------- */
const say=window.KS.msg('msg');
const load=(x,t)=>{st=x;writeRes();render();say(t,'ok');};
const copy=(text,t)=>window.KS.copyCode(text,t,say);
$('blds').addEventListener('change',e=>{const s=e.target;
  if(s.dataset.cur){const k=s.dataset.cur,on=matchIdx();st.cur[k]=+s.value;if(st.goal[k]<st.cur[k])st.goal[k]=st.cur[k];
    /* keep the picked card's goal when a current level changes */
    if(on>=0){QG=quickGoals();KS.forEach(k2=>st.goal[k2]=QG[on].g[k2]);}}
  else if(s.dataset.goal){st.goal[s.dataset.goal]=+s.value;}
  render();});
[['r-tg','tg'],['r-ttg','ttg'],['r-inc','inc'],['r-speed','speed'],['r-bld','bld'],['r-spd','spd']].forEach(([id,k])=>$(id).addEventListener(id==='r-bld'?'change':'input',()=>{
  let v=Math.max(0,Number($(id).value)||0);if(k==='bld')v=Math.max(1,Math.min(2,Math.floor(v)));if(k!=='inc'&&k!=='spd')v=Math.floor(v);st[k]=v;render();}));
[['b-wolf','wolf'],['b-min','min'],['b-gw','gw'],['b-dt','dt'],['b-kvk','kvk']].forEach(([id,k])=>$(id).addEventListener('change',()=>{
  st[k]=+$(id).value;if(k==='min'&&st.min===15){st.kvk=0;$('b-kvk').value=0;}render();}));
[['r-open','open'],['r-by','by']].forEach(([id,k])=>$(id).addEventListener('change',()=>{st[k]=isISO($(id).value)?$(id).value:'';render();}));
/* buildings that start later (War Academy) use their nearest level */
function nearest(k,lbl){const L=B[k].levels;let i=L.indexOf(lbl);if(i>=0)return i;
  const ref=B.TC.levels,ri=ref.indexOf(lbl);for(let j=ri;j>=0;j--){i=L.indexOf(ref[j]);if(i>=0)return i;}return 0;}
$('q-lvl').innerHTML=[1,2,3,4,5,6,7,8].map(n=>`<option>TG ${n}</option>`).join('');
$('q-lvl').addEventListener('change',()=>{const on=matchIdx();st.qlvl=$('q-lvl').value;
  if(on>=0){QG=quickGoals();KS.forEach(k=>st.goal[k]=QG[on].g[k]);}render();});
$('q-cards').addEventListener('click',e=>{const b=e.target.closest('button[data-q]');if(!b)return;const q=QG[+b.dataset.q];
  KS.forEach(k=>st.goal[k]=q.g[k]);render();});
$('all-cur').innerHTML=B.TC.levels.map(l=>`<option>${l}</option>`).join('');
$('all-cur').value='TG 5';
$('all-cur-go').addEventListener('click',()=>{const l=$('all-cur').value,on=matchIdx();
  KS.forEach(k=>{st.cur[k]=nearest(k,l);if(st.goal[k]<st.cur[k])st.goal[k]=st.cur[k];});
  if(on>=0){QG=quickGoals();KS.forEach(k=>st.goal[k]=QG[on].g[k]);}
  render();say(`All buildings set to ${l} now.`,'ok');});
$('goal-clear').addEventListener('click',()=>{KS.forEach(k=>st.goal[k]=st.cur[k]);render();});
$('tiers').innerHTML=TIER_TG.map((c,i)=>`<tr><td>${i*20+1}–${i*20+20}</td><td class="r">${c}</td><td class="r">${TIER_OUT[i]}</td><td class="r">${(c/TIER_OUT[i]).toFixed(1)}</td></tr>`).join('');
$('btn-import').addEventListener('click',()=>{try{load(importCode($('code').value),'Imported.');}catch(e){say(e.message,'err');}});
$('btn-export').addEventListener('click',()=>{$('code').value=exportCode();copy($('code').value,'Code copied. Paste it here later and press Import code.');});
$('btn-link').addEventListener('click',()=>copy(location.origin+location.pathname+'#'+exportCode(),'Link copied. Opening it loads this setup.'));
window.KS.confirmButton($('btn-blank'),()=>load(fromLabels({}),'Reset. Set your buildings\' levels and your goal.'));
$('btn-example').addEventListener('click',()=>load(fromLabels(EXAMPLE),'Loaded the example: Town Center TG 2 → TG 5.'));
$('code').addEventListener('blur',()=>{if(!$('code').value.trim())$('code').value=exportCode();});
function fromHash(){if(!location.hash.startsWith('#'+CODE))return false;
  try{st=importCode(location.hash);say('Loaded the setup from the link.','ok');}catch(e){say(e.message,'err');}
  try{history.replaceState(null,'',location.pathname);}catch(e){}return true;}
fromHash();
window.addEventListener('hashchange',()=>{if(fromHash()){writeRes();render();}});
writeRes();render();
/* game account switch (assets/accounts.js): inputs are saved as you edit, so only reload */
window.KSPage={reload(){loadSaved();writeRes();render();}};
})();
