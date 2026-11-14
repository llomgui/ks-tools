(function(){
const D=window.TG_DATA,B={};D.forEach(b=>B[b.k]=b);
const KS=D.map(b=>b.k);
const $=id=>document.getElementById(id);
const KEY='ks-truegold-v1';
const fmt=n=>Math.round(n).toLocaleString('en-US');
const big=n=>n>=1e9?(n/1e9).toFixed(1).replace(/\.0$/,'')+'B':n>=1e6?(n/1e6).toFixed(n>=1e8?0:1).replace(/\.0$/,'')+'M':fmt(n);
const idxOf=(k,label)=>B[k].levels.indexOf(label);
const label=(k,i)=>{const l=B[k].levels[i];return l==='—'?'Not built':l;};
const days=s=>s/86400;
/* the whole TG level a step belongs to: 30 and 30.x -> 0, TG 3 and TG 3.x -> 3 */
const tierOf=(k,i)=>{const m=/^TG (\d+)/.exec(B[k].levels[i]);return m?+m[1]:0;};
const fmtD=d=>{if(!isFinite(d))return '—';const t=Math.round(d*24);const dd=Math.floor(t/24),h=t%24;return dd?`${dd}d${h?` ${h}h`:''}`:`${h}h`;};

/* ---------- Super Refinement ---------- */
const TIER_TG=[20,50,100,130,160],TIER_OUT=[1.45,2.15,3.18,3.44,3.71];
const tier=i=>Math.min(4,Math.floor((i-1)/20));
/* weekly cost of N refinements: one discounted refinement per day; with N > 7, a batch after the reset (its first one discounted)
   then one a day on the other 6 days, so the discount lands on the most expensive refinements */
function week(N){
  N=Math.max(0,Math.min(100,Math.floor(N)));let tg=0,out=0;
  for(let i=1;i<=N;i++){const disc=N<=7||i===1||i>N-6;tg+=TIER_TG[tier(i)]*(disc?0.5:1);out+=TIER_OUT[tier(i)];}
  return {n:N,tg,out};}
const PLAN_NS=[0,7,14,20,26,40,46,60,66,80,86,100];

/* ---------- state ---------- */
const EXAMPLE={cur:{TC:'TG 2',EM:'TG 2',CC:'TG 1',IN:'TG 1',BA:'TG 2',ST:'TG 2',RA:'TG 2',WA:'TG 1'},goal:{TC:'TG 5'},
  tg:600,ttg:0,inc:30,speed:60,bld:2,ref:20};
function fromLabels(o){
  const st={cur:{},goal:{},tg:+o.tg||0,ttg:+o.ttg||0,inc:+o.inc||0,speed:+o.speed||0,bld:Math.max(1,Math.min(4,+o.bld||1)),ref:PLAN_NS.includes(+o.ref)?+o.ref:20};
  KS.forEach(k=>{const c=idxOf(k,(o.cur||{})[k]);st.cur[k]=c<0?0:c;const g=idxOf(k,(o.goal||{})[k]);st.goal[k]=g<0?st.cur[k]:Math.max(g,st.cur[k]);});
  return st;}
function toLabels(st){const o={cur:{},goal:{},tg:st.tg,ttg:st.ttg,inc:st.inc,speed:st.speed,bld:st.bld,ref:st.ref};
  KS.forEach(k=>{o.cur[k]=B[k].levels[st.cur[k]];if(st.goal[k]>st.cur[k])o.goal[k]=B[k].levels[st.goal[k]];});return o;}
let st;
try{const o=JSON.parse(localStorage.getItem(KEY)||'null');st=o?fromLabels(o):null;}catch(e){st=null;}
if(!st) st=fromLabels(EXAMPLE);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(toLabels(st)));}catch(e){}};

/* ---------- what the goal needs ---------- */
function targets(){
  const tgt={},why={};KS.forEach(k=>{tgt[k]=Math.max(st.goal[k],st.cur[k]);});
  for(let changed=true,guard=0;changed&&guard++<100;){changed=false;
    KS.forEach(k=>{for(let i=st.cur[k];i<tgt[k];i++) for(const [k2,lv] of B[k].steps[i][4]){
      const need=idxOf(k2,lv);
      if(need>tgt[k2]){tgt[k2]=need;why[k2]=`${B[k].name} ${label(k,i+1)}`;changed=true;}}});}
  return {tgt,why};}

/* ---------- schedule ---------- */
function simulate(tgt){
  const speed=1+Math.max(0,st.speed)/100,inc=Math.max(0,st.inc);
  const lvl={...st.cur},next={...st.cur},busy={};
  let t=0,tg=st.tg,ttg=st.ttg,refTG=0,refOut=0,refWeeks=0,nextWeek=0,waitTG=0;
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
  const LIMIT=3650;
  for(let guard=0;guard<20000&&left();guard++){
    /* finish builds */
    Object.keys(busy).forEach(k=>{if(busy[k].end<=t+1e-9){lvl[k]++;delete busy[k];}});
    /* weekly Super Refinement */
    while(nextWeek<=t+1e-9){
      if(st.ref>0&&lvl.TC>=tc5){const need=ttgLeft()-ttg;
        if(need>0){let n=0;for(;n<st.ref&&week(n).out<need;n++);
          let w=week(n);while(n>0&&w.tg>tg){n--;w=week(n);}
          if(n>0){tg-=w.tg;ttg+=w.out;refTG+=w.tg;refOut+=w.out;refWeeks++;}}}
      nextWeek+=7;}
    /* start builds on free builders */
    let blocked=null;
    for(;;){
      const b=free.findIndex(f=>f<=t+1e-9);if(b<0)break;
      const cand=KS.filter(ready).sort((x,y)=>prio(y)-prio(x));
      if(!cand.length)break;
      const k=cand[0],s=B[k].steps[next[k]];
      if(s[0]>tg+1e-9||s[1]>ttg+1e-9){blocked={k,s,at:next[k]};break;}
      tg-=s[0];ttg-=s[1];
      const dur=days(s[2])/speed,end=t+dur;
      busy[k]={end};free[b]=end;
      /* one row per building and TG level (TG 3 → TG 4), counting the days its steps wait in between */
      const last=lastRun[k];
      if(last&&tierOf(k,last.from)===tierOf(k,next[k])){last.wait+=Math.max(0,t-last.end);last.to=next[k]+1;last.end=end;last.tg+=s[0];last.ttg+=s[1];}
      else{const r={k,from:next[k],to:next[k]+1,start:t,end,tg:s[0],ttg:s[1],wait:0};runs.push(r);lastRun[k]=r;}
      next[k]++;}
    /* jump to the next event */
    const ev=[];
    Object.values(busy).forEach(x=>ev.push(x.end));
    if(blocked){
      if(blocked.s[0]>tg&&inc>0) ev.push(t+(blocked.s[0]-tg)/inc);
      if(blocked.s[1]>ttg&&st.ref>0&&tg>=week(1).tg) ev.push(nextWeek);
      else if(blocked.s[0]<=tg) ev.push(t);}
    if(st.ref>0&&ttgLeft()>ttg&&(Object.keys(busy).length||blocked)&&!(blocked&&blocked.s[1]<=ttg&&blocked.s[0]>tg&&inc<=0)) ev.push(nextWeek);
    const nt=Math.min(...ev.filter(x=>x>t+1e-9));
    if(!isFinite(nt)||nt>LIMIT) return {stuck:blocked,t,runs,refTG,refOut,refWeeks,tg,ttg,waitTG};
    if(blocked&&!Object.keys(busy).length) waitTG+=nt-t;
    tg+=inc*(nt-t);t=nt;}
  const lk=KS.find(k=>lvl[k]<tgt[k]);
  if(lk) return {stuck:{k:lk,s:B[lk].steps[next[lk]]||[0,0],at:next[lk]},t,runs,refTG,refOut,refWeeks,tg,ttg,waitTG};
  const end=Math.max(t,...Object.values(busy).map(x=>x.end),0);
  Object.keys(busy).forEach(k=>{lvl[k]++;});
  return {stuck:null,t:end,runs,refTG,refOut,refWeeks,tg:tg+inc*(end-t),ttg,waitTG};}

/* ---------- render ---------- */
function opts(k,sel,min){return B[k].levels.map((l,i)=>i<min?'':`<option value="${i}"${i===sel?' selected':''}>${l==='—'?'Not built':l}</option>`).join('');}
function renderInputs(tgt,why){
  $('blds').innerHTML=D.map(b=>{const k=b.k,auto=tgt[k]>st.goal[k];
    return `<div class="tg-brow"><span class="tg-bn">${b.name}${auto?`<small>needs ${label(k,tgt[k])} for ${why[k]}</small>`:''}</span>
      <select data-cur="${k}" aria-label="${b.name} now">${opts(k,st.cur[k],0)}</select>
      <select data-goal="${k}" aria-label="${b.name} goal">${opts(k,Math.max(st.goal[k],st.cur[k]),st.cur[k])}</select></div>`;}).join('');}
function writeRes(){$('r-tg').value=st.tg;$('r-ttg').value=st.ttg;$('r-inc').value=st.inc;$('r-speed').value=st.speed;$('r-bld').value=st.bld;}

function render(){
  const {tgt,why}=targets();
  renderInputs(tgt,why);
  const speed=1+Math.max(0,st.speed)/100;
  let TG=0,TTG=0,T=0;const res=[0,0,0,0];const per=[];
  D.forEach(b=>{const k=b.k;let tg=0,ttg=0,t=0;
    for(let i=st.cur[k];i<tgt[k];i++){const s=b.steps[i];tg+=s[0];ttg+=s[1];t+=s[2];s[3].forEach((v,j)=>res[j]+=v);}
    TG+=tg;TTG+=ttg;T+=t;
    if(tgt[k]>st.cur[k]) per.push(`<tr><td>${b.name}</td><td>${label(k,st.cur[k])} → ${label(k,tgt[k])}${tgt[k]>st.goal[k]?' <span class="chip">required</span>':''}</td>
      <td class="r">${fmt(tg)}</td><td class="r">${ttg?fmt(ttg):'—'}</td><td class="r">${fmtD(days(t)/speed)}</td></tr>`);});
  $('per').querySelector('tbody').innerHTML=per.join('')||'<tr class="zero"><td colspan="5">Pick a goal above the current level for at least one building.</td></tr>';
  if(per.length>1) $('per').querySelector('tbody').innerHTML+=`<tr class="best"><td><b>Total</b></td><td></td><td class="r"><b>${fmt(TG)}</b></td><td class="r"><b>${TTG?fmt(TTG):'—'}</b></td><td class="r"><b>${fmtD(days(T)/speed)}</b></td></tr>`;

  /* Tempered planner */
  const ttgNeed=Math.max(0,TTG-st.ttg);
  $('ttg-need').textContent=ttgNeed?`· your goal needs ${fmt(ttgNeed)} more Tempered`:TTG?'· you already have enough':'· your goal needs none';
  $('tiers').innerHTML=TIER_TG.map((c,i)=>`<tr><td>${i*20+1}–${i*20+20}</td><td class="r">${c}</td><td class="r">${TIER_OUT[i]}</td><td class="r">${(c/TIER_OUT[i]).toFixed(1)}</td></tr>`).join('');
  $('plans').querySelector('tbody').innerHTML=PLAN_NS.map(n=>{const w=week(n),wk=n&&ttgNeed?Math.ceil(ttgNeed/w.out):0;
    return `<tr class="${n===st.ref?'best':''}" data-ref="${n}" tabindex="0" role="button" aria-pressed="${n===st.ref}"><td>${n?n:'None'}</td><td class="r">${n?fmt(w.tg):'—'}</td><td class="r">${n?w.out.toFixed(1):'—'}</td>
      <td class="r">${n?(w.tg/w.out).toFixed(1):'—'}</td><td class="r">${n&&ttgNeed?wk:'—'}</td><td class="r">${n&&ttgNeed?fmt(wk*w.tg):'—'}</td></tr>`;}).join('');

  /* schedule */
  const sim=simulate(tgt);
  const refTG=sim.refTG;
  $('s-tg').textContent=fmt(TG+refTG);
  $('s-tg2').textContent=`${fmt(TG)} buildings${refTG?` + ${fmt(refTG)} refining`:''}`;
  $('s-ttg').textContent=TTG?fmt(TTG):'0';
  $('s-ttg2').textContent=TTG?`you have ${fmt(st.ttg)}`:'none needed';
  if(!per.length){$('s-days').textContent='—';$('s-date').textContent='';}
  else if(sim.stuck){$('s-days').textContent='Stuck';$('s-date').textContent=sim.stuck.s[1]>sim.ttg?'needs Tempered':'needs Truegold';}
  else{$('s-days').textContent=`${Math.ceil(sim.t)} days`;const d=new Date(Date.now()+sim.t*864e5);
    $('s-date').textContent=`≈ ${d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`;}

  const rows=sim.runs.map((r,n)=>{const b=B[r.k];
    return `<li><span class="num">${n+1}</span><div><div class="step-top"><b>${b.name}</b><span class="move">${label(r.k,r.from)} → ${label(r.k,r.to)}</span></div>
      <div class="cost">Day ${Math.floor(r.start)} → ${Math.ceil(r.end)} · ${fmt(r.tg)} Truegold${r.ttg?` · ${fmt(r.ttg)} Tempered`:''}${r.wait>=1?` · waits ${Math.round(r.wait)} days between steps`:''}</div></div></li>`;});
  if(sim.stuck){const k=sim.stuck.k;rows.push(`<li><span class="num">!</span><div><div class="step-top"><b>${B[k].name}</b><span class="move">${label(k,sim.stuck.at)} → ${label(k,sim.stuck.at+1)}</span></div>
    <div class="cost">Stops on day ${Math.floor(sim.t)}: ${sim.stuck.s[1]>sim.ttg?'not enough Tempered Truegold. Pick a Super Refinement plan in step 3.':'not enough Truegold. Add your daily Truegold in step 2.'}</div></div></li>`);}
  $('order').innerHTML=rows.join('')||'<li class="empty" style="display:block">Nothing to upgrade yet. Set a goal in step 1.</li>';

  const notes=[];
  const autos=KS.filter(k=>tgt[k]>st.goal[k]);
  if(autos.length) notes.push(`<p>Added because your goal needs them: ${autos.map(k=>`<b>${B[k].name} ${label(k,tgt[k])}</b>`).join(', ')}.</p>`);
  const short=TG+refTG-st.tg;
  if(per.length&&short>0) notes.push(`<p>You need <b>${fmt(short)} more Truegold</b> than you have${st.inc>0?`: about ${Math.ceil(short/st.inc)} days of income at ${fmt(st.inc)} a day`:''}.${sim.waitTG>0.5?` Builders sit idle about <b>${Math.round(sim.waitTG)} days</b> waiting for it.`:''}</p>`);
  if(sim.refWeeks) notes.push(`<p>Super Refinement: ${sim.refWeeks} week${sim.refWeeks>1?'s':''} of up to ${st.ref} refinements, ${fmt(sim.refTG)} Truegold for about ${fmt(sim.refOut)} Tempered.</p>`);
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
const say=(t,c)=>{$('msg').textContent=t;$('msg').className='msg'+(c?' '+c:'');};
const load=(x,t)=>{st=x;writeRes();render();say(t,'ok');};
const copy=async(text,t)=>{try{await navigator.clipboard.writeText(text);say(t,'ok');}catch(e){$('code').focus();$('code').select();say('Copy failed. The code is selected in the box: press Ctrl+C.','warn');}};
$('blds').addEventListener('change',e=>{const s=e.target;
  if(s.dataset.cur){const k=s.dataset.cur;st.cur[k]=+s.value;if(st.goal[k]<st.cur[k])st.goal[k]=st.cur[k];}
  else if(s.dataset.goal){st.goal[s.dataset.goal]=+s.value;}
  render();});
[['r-tg','tg'],['r-ttg','ttg'],['r-inc','inc'],['r-speed','speed'],['r-bld','bld']].forEach(([id,k])=>$(id).addEventListener('input',()=>{
  let v=Math.max(0,Number($(id).value)||0);if(k==='bld')v=Math.max(1,Math.min(4,Math.floor(v)));if(k!=='inc')v=Math.floor(v);st[k]=v;render();}));
const pickPlan=e=>{const r=e.target.closest('tr[data-ref]');if(!r)return;st.ref=+r.dataset.ref;render();};
$('plans').addEventListener('click',pickPlan);
$('plans').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickPlan(e);}});
$('goal-tc').addEventListener('click',()=>{const c=st.cur.TC,L=B.TC.levels;let g=c+1;while(g<L.length-1&&!/^TG \d+$/.test(L[g]))g++;st.goal.TC=Math.min(g,L.length-1);render();});
$('goal-all').addEventListener('click',()=>{const tcL=B.TC.levels[Math.max(st.goal.TC,st.cur.TC)];
  KS.forEach(k=>{if(k==='TC')return;const i=idxOf(k,tcL);if(i>=0)st.goal[k]=Math.max(st.cur[k],i);});render();});
$('goal-reset').addEventListener('click',()=>{KS.forEach(k=>st.goal[k]=st.cur[k]);render();});
$('btn-import').addEventListener('click',()=>{try{load(importCode($('code').value),'Imported.');}catch(e){say(e.message,'err');}});
$('btn-export').addEventListener('click',()=>{$('code').value=exportCode();copy($('code').value,'Code copied. Paste it here later and press Import code.');});
$('btn-link').addEventListener('click',()=>copy(location.origin+location.pathname+'#'+exportCode(),'Link copied. Opening it loads this setup.'));
$('btn-example').addEventListener('click',()=>load(fromLabels(EXAMPLE),'Loaded the example: Town Center TG 2 → TG 5.'));
$('code').addEventListener('blur',()=>{if(!$('code').value.trim())$('code').value=exportCode();});
function fromHash(){if(!location.hash.startsWith('#'+CODE))return false;
  try{st=importCode(location.hash);say('Loaded the setup from the link.','ok');}catch(e){say(e.message,'err');}
  try{history.replaceState(null,'',location.pathname);}catch(e){}return true;}
fromHash();
window.addEventListener('hashchange',()=>{if(fromHash()){writeRes();render();}});
writeRes();render();
})();
