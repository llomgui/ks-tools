(function(){
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const pct=n=>(+n.toFixed(2)).toString();

/* ---------- data (per piece; cost to reach the level from the one before) ---------- */
const RAW=`Uncommon 0★|1500|15|0|9.35|2
Uncommon 1★|3800|40|0|12.75|2.5
Rare 0★|7000|70|0|17.00|3
Rare 1★|9700|95|0|21.25|3.5
Rare 2★|1000|10|45|25.50|4
Rare 3★|1000|10|50|29.75|4.5
Epic 0★|1500|15|60|34.00|5
Epic 1★|1500|15|70|36.89|5
Epic 2★|6500|65|40|39.78|5
Epic 3★|8000|80|50|42.67|5
Epic T1 0★|10000|95|60|45.56|6
Epic T1 1★|11000|110|70|48.45|6
Epic T1 2★|13000|130|85|51.34|6
Epic T1 3★|15000|160|100|54.23|6
Mythic 0★|22000|220|40|56.78|7
Mythic 1★|23000|230|40|59.33|7
Mythic 2★|25000|250|45|61.88|7
Mythic 3★|26000|260|45|64.43|7
Mythic T1 0★|28000|280|45|66.98|8
Mythic T1 1★|30000|300|55|69.53|8
Mythic T1 2★|32000|320|55|72.08|8
Mythic T1 3★|35000|340|55|74.63|8
Mythic T2 0★|38000|360|55|77.18|9
Mythic T2 1★|43000|430|75|79.73|9
Mythic T2 2★|45000|460|80|82.28|9
Mythic T2 3★|48000|500|85|84.83|9
Mythic T3 0★|60000|600|120|87.38|10
Mythic T3 1★|70000|700|140|89.93|10
Mythic T3 2★|80000|800|160|92.48|10
Mythic T3 3★|90000|900|180|95.00|10
Legendary 0★|108000|1080|220|97.50|12
Legendary 1★|114000|1140|230|100.00|12
Legendary 2★|121000|1210|240|102.50|12
Legendary 3★|128000|1280|250|105.00|12
Legendary T1 0★|154000|1540|300|107.50|14
Legendary T1 1★|163000|1630|320|110.00|14
Legendary T1 2★|173000|1730|340|112.50|14
Legendary T1 3★|183000|1830|360|115.00|14
Legendary T2 0★|220000|2200|430|117.50|16.5
Legendary T2 1★|233000|2330|460|120.00|16.5
Legendary T2 2★|247000|2470|490|122.50|16.5
Legendary T2 3★|262000|2620|520|125.00|16.5
Legendary T3 0★|288000|2880|570|127.75|19.5
Legendary T3 1★|302000|3020|600|130.50|19.5
Legendary T3 2★|317000|3170|630|133.25|19.5
Legendary T3 3★|333000|3330|660|136.00|19.5
Legendary T4 0★|366000|3660|730|138.75|23
Legendary T4 1★|384000|3840|770|141.50|23
Legendary T4 2★|403000|4030|810|144.25|23
Legendary T4 3★|423000|4230|850|147.00|23
Legendary T5 0★|465000|4650|940|150.00|26.5
Legendary T5 1★|479000|4790|970|153.00|26.5
Legendary T5 2★|493000|4930|1000|156.00|26.5
Legendary T5 3★|508000|5080|1030|159.00|26.5
Legendary T6 0★|549000|5490|1110|162.00|30
Legendary T6 1★|565000|5650|1140|165.00|30
Legendary T6 2★|582000|5820|1170|168.00|30
Legendary T6 3★|599000|5990|1210|171.00|30`;
const LV=RAW.split('\n').map(l=>{const [name,s,g,a,st,b]=l.split('|');
  return {name,satin:+s,gt:+g,av:+a,stat:+st,set:+b,rar:name.split(' ')[0]};});
const N=LV.length;                       /* 58 levels */
const STEP_LV=26;                        /* Mythic T3 0★: first level bought in 5 purchases */
const PMAX=STEP_LV+5*(N-STEP_LV);        /* 186 purchases from nothing to Legendary T6 3★ */
const CAP_START=30;                      /* Legendary 0★ */
const CAP_BIG=[34,38,42,46,50,54];       /* T1..T6 0★ */

/* a piece's progress is a "position": 0 = not owned, then one step per purchase */
const posOf=(L,s)=>L<0?0:(L<STEP_LV-1?L+1:STEP_LV+5*(L-(STEP_LV-1))+(L<N-1?s:0));
const lvAt=p=>{if(p<=0)return {L:-1,s:0};if(p<=STEP_LV)return {L:p-1,s:0};const q=p-STEP_LV;return {L:STEP_LV-1+Math.floor(q/5),s:q%5};};
const unitLevel=p=>p<=STEP_LV?p-1:STEP_LV-1+Math.ceil((p-STEP_LV)/5);
const CUM=[{satin:0,gt:0,av:0}],STAT=[0],CAP=[0];
for(let p=1;p<=PMAX;p++){
  const k=unitLevel(p),d=p<=STEP_LV?1:5,c=CUM[p-1];
  CUM.push({satin:c.satin+LV[k].satin/d,gt:c.gt+LV[k].gt/d,av:c.av+LV[k].av/d});
  const {L,s}=lvAt(p);STAT.push((L>=0?LV[L].stat:0)+(s?s*(LV[L+1].stat-LV[L].stat)/5:0));
  const done=s===0;let add=0;
  if(k===CAP_START)add=done?10:0;
  else if(k>CAP_START){if(CAP_BIG.includes(k))add=done?100:10;else if(k===N-3||k===N-2)add=15;else if(k===N-1)add=20;else add=10;}
  CAP.push(CAP[p-1]+add);
}
const costBetween=(a,b)=>b<=a?{satin:0,gt:0,av:0}:{satin:CUM[b].satin-CUM[a].satin,gt:CUM[b].gt-CUM[a].gt,av:CUM[b].av-CUM[a].av};
const lvName=p=>{const {L,s}=lvAt(p);return L<0?'Not owned':LV[L].name+(s?` · ${s}/5`:'');};

const PIECES=[{n:'Cloak',t:'I'},{n:'Breeches',t:'I'},{n:'Hood',t:'C'},{n:'Charmstone',t:'C'},{n:'Ring',t:'A'},{n:'Staff',t:'A'}];
const TROOP={I:'Infantry',C:'Cavalry',A:'Archer'};
const ICON={
  Cloak:'<path d="M9 3h6l1.2 3L19 20l-4-2-3 3-3-3-4 2L7.8 6z"/><path d="M9 3c0 2 1.4 3 3 3s3-1 3-3"/>',
  Breeches:'<path d="M6 3h12l1 18h-5l-2-11-2 11H5z"/><path d="M6 6.5h12"/>',
  Hood:'<path d="M12 3c-4.5 0-7 4-7 9v8h4v-6a3 3 0 0 1 6 0v6h4v-8c0-5-2.5-9-7-9z"/>',
  Charmstone:'<path d="M12 3l6 6-6 12-6-12z"/><path d="M6 9h12M12 3v18"/>',
  Ring:'<circle cx="12" cy="15" r="6"/><path d="M9.5 6.5 12 3l2.5 3.5L12 9z"/>',
  Staff:'<path d="M6 21 15.5 8"/><circle cx="17.5" cy="6" r="3"/><path d="M14.5 3.5 13 2M21.5 9.5 23 11"/>'};
const ORDER=[2,3,0,1,4,5];   /* game order: Cavalry, Infantry, Archer (saved data keeps its own order) */
const TORDER=['C','I','A'];
const RCLS={Uncommon:'rU',Rare:'rR',Epic:'rE',Mythic:'rM',Legendary:'rL'};

/* ---------- model ---------- */
function bonuses(ps){
  const L=ps.map(p=>lvAt(p).L).sort((a,b)=>b-a);
  return {b3:L[2]>=0?LV[L[2]].set:0,b6:L[5]>=0?LV[L[5]].set:0};}
function summary(ps){
  const t={I:0,C:0,A:0};ps.forEach((p,i)=>t[PIECES[i].t]+=STAT[p]);
  const b=bonuses(ps);
  return {...t,...b,power:ps.reduce((a,p)=>a+STAT[p]*24000,0),cap:ps.reduce((a,p)=>a+CAP[p],0)};}
function value(ps,w){
  const s=summary(ps);
  return 2*(w.I*s.I+w.C*s.C+w.A*s.A)+(w.I+w.C+w.A)*(s.b3+s.b6);}
function pay(rem,c,exch){
  const r={satin:rem.satin-c.satin,gt:rem.gt-c.gt,av:rem.av-c.av,trades:rem.trades||0};
  if(r.satin<0)return null;
  if(r.av<0){if(!exch)return null;const t=-r.av;r.gt-=5*t;r.av=0;r.trades+=t;}
  if(r.gt<0)return null;return r;}

function optimize(st){
  const w=st.w,inv=st.inv;
  let ps=st.pieces.map(x=>x.cur),rem={...inv,trades:0};
  const steps=[];
  const nextDone=p=>{for(let q=p+1;q<=PMAX;q++)if(lvAt(q).s===0)return q;return PMAX;};
  const mats=['satin','gt','av'];
  const scarce=(d,k,r)=>d>0&&r[k]>0?d*inv[k]/(r[k]*r[k]):0;
  for(let guard=0;guard<4000;guard++){
    const cands=[];
    ps.forEach((p,i)=>{if(p>=PMAX)return;const b=nextDone(p);
      [...new Set([p+1,b,nextDone(b)])].forEach(q=>{if(q>p&&q<=PMAX){const t=[...ps];t[i]=q;cands.push({t,kind:'piece',i});}});});
    const Ls=ps.map(p=>lvAt(p).L);
    const mn=Math.min(...Ls);
    if(mn+1<N){const T=posOf(mn+1,0);cands.push({t:ps.map((p,i)=>Ls[i]<mn+1?Math.max(p,T):p),kind:'set6'});}
    const L3=[...Ls].sort((a,b)=>b-a)[2];
    if(L3+1<N){const T=posOf(L3+1,0);
      const order=ps.map((p,i)=>{const c=costBetween(p,Math.max(p,T));return {i,c:Ls[i]>=L3+1?-1:mats.reduce((a,k)=>a+scarce(c[k],k,rem),0)};}).sort((a,b)=>a.c-b.c).slice(0,3);
      const t=[...ps];order.forEach(o=>{if(Ls[o.i]<L3+1)t[o.i]=Math.max(ps[o.i],T);});cands.push({t,kind:'set3'});}
    const v0=value(ps,w);let best=null;
    for(const c of cands){
      const cost={satin:0,gt:0,av:0};let units=0;
      c.t.forEach((q,i)=>{if(q>ps[i]){const x=costBetween(ps[i],q);mats.forEach(k=>cost[k]+=x[k]);units+=q-ps[i];}});
      if(!units)continue;
      const r=pay(rem,cost,st.exch);if(!r)continue;
      const g=value(c.t,w)-v0;if(g<=1e-9)continue;
      const m=mats.reduce((a,k)=>a+scarce(rem[k]-r[k],k,rem),0);
      const ratio=m>0?g/m:g*1e12;
      if(!best||ratio>best.ratio*(1+1e-9)||(Math.abs(ratio-best.ratio)<=best.ratio*1e-9&&units<best.units))best={...c,cost,r,ratio,units};
    }
    if(!best)break;
    const b0=bonuses(ps),b1=bonuses(best.t);
    const moved=best.t.map((q,i)=>({i,from:ps[i],to:q})).filter(x=>x.to>x.from);
    const last=steps[steps.length-1];
    if(last&&best.kind==='piece'&&last.kind==='piece'&&last.moved[0].i===moved[0].i){
      last.moved[0].to=moved[0].to;['satin','gt','av'].forEach(k=>last.cost[k]+=best.cost[k]);last.b1=b1;
    } else steps.push({kind:best.kind,moved,cost:{...best.cost},b0,b1});
    rem=best.r;ps=best.t;
  }
  return {ps,rem,steps};
}

/* ---------- UI: piece rows ---------- */
const lvOptions='<option value="-1">Not owned</option>'+LV.map((l,i)=>`<option value="${i}">${l.name}</option>`).join('');
const stOptions=[0,1,2,3,4].map(s=>`<option value="${s}">${s}/5</option>`).join('');
$('gv-pieces').innerHTML=ORDER.map(i=>[PIECES[i],i]).map(([pc,i])=>`<div class="gv-piece" id="gv-row-${i}">
  <div class="gv-pn"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[pc.n]}</svg><span><b>${pc.n}</b><small>${TROOP[pc.t]}</small></span></div>
  <div class="sel2">
    <select id="gv-cl-${i}" aria-label="${pc.n} level">${lvOptions}</select>
    <select id="gv-cs-${i}" class="st" aria-label="${pc.n} purchases toward next level">${stOptions}</select></div>
</div>`).join('');

const canStep=L=>L>=STEP_LV-1&&L<N-1;
function setPos(lvId,stId,p){const {L,s}=lvAt(p);$(lvId).value=String(L);$(stId).value=String(s);$(stId).disabled=!canStep(L);}
function getPos(lvId,stId){const L=+$(lvId).value;const ok=canStep(L);$(stId).disabled=!ok;if(!ok)$(stId).value='0';return posOf(L,ok?+$(stId).value:0);}

/* ---------- troop weights: same method as the Hero Gear tab ---------- */
/* each troop's Health + Lethality weight from the build profile, scaled by its share of the formation (profiles assume 50/20/30) */
const PROF={growth:{I:[1.5,0.7],C:[0.2,0.4],A:[0.7,1.4]},combat:{I:[1.5,0.7],C:[0.4,1.2],A:[0.6,1.3]},
  gen4:{I:[1.5,1.1],C:[0.4,1.2],A:[0.6,1.2]},flat:{I:[1,1],C:[1,1],A:[1,1]}};
const BASE={I:50,C:20,A:30};
function formW(prof,f){const P=PROF[prof]||PROF.gen4,sum=f.I+f.C+f.A,W={};
  for(const t of ['I','C','A'])W[t]=(P[t][0]+P[t][1])*(sum>0?f[t]*100/sum:BASE[t])/BASE[t];return W;}
function weightsOf(st){const a=formW(st.profile,st.att),d=formW(st.profile,st.def);
  if(st.for==='att')return a;if(st.for==='def')return d;
  const m=st.mix/100;return {I:a.I*m+d.I*(1-m),C:a.C*m+d.C*(1-m),A:a.A*m+d.A*(1-m)};}
/* start from the Hero Gear tab's settings, so both tabs agree */
function heroDefaults(){
  const d={profile:'gen4',att:{I:50,C:20,A:30},def:{I:60,C:40,A:0},mix:70,for:'att'};
  try{const h=JSON.parse(localStorage.getItem('hgp-state-v3')||'null');
    if(h){if(PROF[h.profile])d.profile=h.profile;
      if(h.form){const f=h.form;if(f.att)d.att={I:f.att[0],C:f.att[1],A:f.att[2]};if(f.def)d.def={I:f.def[0],C:f.def[1],A:f.def[2]};if(f.mix!=null)d.mix=f.mix;}
      if(['att','def','mix'].includes(h.planFor))d.for=h.planFor;}}catch(e){}
  return d;}

const BLANK=()=>({inv:{satin:0,gt:0,av:0},exch:false,pieces:PIECES.map(()=>({cur:0,tgt:0})),...heroDefaults(),isExample:false,packs:defPacks()});
const EXAMPLE=()=>({...BLANK(),inv:{satin:600000,gt:6000,av:1200},pieces:[23,22,21,20,22,21].map(L=>({cur:posOf(L,0),tgt:posOf(L,0)})),isExample:true});
let isExample=false,plan=null,showAll=false;

function readState(){
  const n=id=>Math.max(0,Math.floor(Number($(id).value)||0));
  const pieces=PIECES.map((_,i)=>{const cur=getPos('gv-cl-'+i,'gv-cs-'+i);return {cur,tgt:cur};});
  const f=k=>({I:n('gv-'+k+'-I'),C:n('gv-'+k+'-C'),A:n('gv-'+k+'-A')});
  const st={inv:{satin:n('gv-satin'),gt:n('gv-gt'),av:n('gv-av')},exch:$('gv-exch').checked,pieces,
    profile:$('gv-prof').value,for:$('gv-for').value,att:f('fa'),def:f('fd'),mix:Math.min(100,n('gv-mix')),isExample,packs:readPacks(),shopTab:gshop,cart:JSON.parse(JSON.stringify(cart))};
  st.w=weightsOf(st);return st;}
function writeState(st){
  $('gv-satin').value=st.inv.satin;$('gv-gt').value=st.inv.gt;$('gv-av').value=st.inv.av;$('gv-exch').checked=!!st.exch;
  st.pieces.forEach((x,i)=>setPos('gv-cl-'+i,'gv-cs-'+i,x.cur));
  $('gv-prof').value=PROF[st.profile]?st.profile:'gen4';$('gv-for').value=['att','def','mix'].includes(st.for)?st.for:'att';
  for(const [k,o] of [['fa',st.att],['fd',st.def]])for(const t of ['I','C','A'])$('gv-'+k+'-'+t).value=o[t];
  $('gv-mix').value=st.mix;isExample=!!st.isExample;writePacks(st.packs);
  cart=st.cart&&Array.isArray(st.cart.master)?{master:st.cart.master.slice(0,5),tool:+st.cart.tool||0,enh:+st.cart.enh||0}:defCart();}

/* ---------- render ---------- */
const costTxt=c=>{const a=[];if(c.satin)a.push(fmt(c.satin)+' Satin');if(c.gt)a.push(fmt(c.gt)+' GT');if(c.av)a.push(fmt(c.av)+' AV');return a.join(' · ')||'free';};
const signed=(v,d=2,u='%')=>Math.abs(v)<1e-9?'—':(v>0?'+':'−')+(u==='%'?pct(Math.abs(v)):fmt(Math.abs(v)))+u;

function renderWeights(st){
  const w=st.w;
  $('gv-mixf').hidden=st.for!=='mix';
  $('gv-mix-o').textContent=`${st.mix}% attack · ${100-st.mix}% defense`;
  for(const k of ['att','def']){const o=st[k],s=o.I+o.C+o.A;$('gv-fs-'+k).textContent=s===100?'':`Adds up to ${s}%, treated as proportions`;}
  $('gv-wout').innerHTML=`<span class="label">Weights used</span> `+TORDER.map(t=>`<span class="wchip">${TROOP[t]} <b>×${w[t].toFixed(2)}</b></span>`).join('');
}

/* "was" label: drop the rarity word when it did not change */
function shortLv(p0,p1){const a=lvAt(p0),b=lvAt(p1);if(a.L<0)return 'not owned';
  const n=LV[a.L].name,same=b.L>=0&&LV[b.L].rar===LV[a.L].rar;
  return (same?n.split(' ').slice(1).join(' '):n)+(a.s?` · ${a.s}/5`:'');}
function renderCards(st){
  const ps0=st.pieces.map(x=>x.cur),ps1=plan?plan.ps:ps0;
  const s0=summary(ps0),s1=summary(ps1);
  $('gv-cards').innerHTML=TORDER.map(t=>{
    const cards=PIECES.map((pc,i)=>({pc,i})).filter(x=>x.pc.t===t).map(({pc,i})=>{
      const p0=ps0[i],p1=ps1[i],{L,s}=lvAt(p1),up=p1!==p0;
      const cls=L<0?'r0':RCLS[LV[L].rar];
      const tip=`${TROOP[t]} ${pc.n} · ${lvName(p1)} · ${pct(STAT[p1])}%`;
      return `<div class="gcw ${up?'up':'same'}" tabindex="0" role="button" data-row="${i}" aria-label="Edit ${TROOP[t]} ${pc.n}">
        <div class="gc ${cls}" title="${tip}"><span class="ge">${L<0?'':LV[L].name.split(' ').slice(1).join(' ')}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[pc.n]}</svg>${s?`<span class="gf">${s}/5</span>`:''}</div>
        <span class="gn">${pc.n}</span>${L<0?'<span class="gw">Not owned</span>':''}
        ${up?`<span class="gw">was ${shortLv(p0,p1)}</span>`:''}</div>`;}).join('');
    const d=s1[t]-s0[t];
    return `<div class="gv-grp"><div class="gv-th"><strong>${TROOP[t]}</strong><span>${pct(s1[t])}%${d>1e-9?` <b>+${pct(d)}</b>`:''}</span></div><div class="gv-row2">${cards}</div></div>`;
  }).join('');
  const rows=[
    ['Cavalry (Hood + Charmstone)',s0.C,s1.C,'%'],['Infantry (Cloak + Breeches)',s0.I,s1.I,'%'],['Archer (Ring + Staff)',s0.A,s1.A,'%'],
    ['3-piece Defense bonus',s0.b3,s1.b3,'%'],['6-piece Attack bonus',s0.b6,s1.b6,'%'],
    ['Total gear power',s0.power,s1.power,''],['Troop deployment capacity',s0.cap,s1.cap,'']];
  $('gv-sum').querySelector('tbody').innerHTML=rows.map(([n,a,b,u])=>`<tr><td>${n}</td>
    <td class="r">${u==='%'?pct(a)+'%':fmt(a)}</td><td class="r">${u==='%'?pct(b)+'%':fmt(b)}</td>
    <td class="r ${b-a>1e-9?'gv-up':''}">${signed(b-a,2,u)}</td></tr>`).join('');
}

function renderMaterials(st,base,packs){
  const tb=$('gv-mat').querySelector('tbody'),inv=st.inv;
  const rem=plan?plan.rem:{...inv,trades:0};
  const trades=rem.trades||0;
  const used={satin:inv.satin-rem.satin,gt:inv.gt-rem.gt-5*trades,av:inv.av-rem.av+trades};
  const row=(n,o,cls='',sg='')=>`<tr class="${cls}"><td>${n}</td><td class="r">${sg}${fmt(o.satin)}</td><td class="r">${sg}${fmt(o.gt)}</td><td class="r">${sg}${fmt(o.av)}</td></tr>`;
  tb.innerHTML=row('You have',base)+(isZero(packs)?'':row('From packs you are trying',packs,'gv-cartrow','+'))
    +(trades?`<tr><td>Material Exchange</td><td class="r">—</td><td class="r">−${fmt(5*trades)}</td><td class="r">+${fmt(trades)}</td></tr>`:'')
    +row('The plan uses',used)+row('<b>Left after the plan</b>',rem,'gv-tot');
}

function renderPlan(st){
  const sum=$('gv-opt-sum'),list=$('gv-plan'),more=$('gv-more'),head=$('gv-steps-h');
  const inv=st.inv;plan=null;
  const stop=msg=>{sum.innerHTML=`<p>${msg}</p>`;list.innerHTML='';more.hidden=true;head.hidden=true;};
  if(!inv.satin&&!inv.gt&&!inv.av)return stop('Enter your materials in step 1 and your levels in step 2. The best way to spend them will appear here.');
  if(st.w.I+st.w.C+st.w.A<=0)return stop('Your formations give every troop type 0%. Add at least one troop in step 3.');
  const p=optimize(st);
  if(!p.steps.length)return stop("Your materials don't cover the next purchase on any piece yet.");
  plan=p;head.hidden=false;
  const ps0=st.pieces.map(x=>x.cur),s0=summary(ps0),s1=summary(plan.ps);
  const g=[];TORDER.forEach(t=>{const d=s1[t]-s0[t];if(d>1e-9)g.push(`${TROOP[t]} +${pct(d)}%`);});
  if(s1.b3>s0.b3)g.push(`3-piece Defense ${pct(s0.b3)}% → ${pct(s1.b3)}%`);
  if(s1.b6>s0.b6)g.push(`6-piece Attack ${pct(s0.b6)}% → ${pct(s1.b6)}%`);
  sum.innerHTML=`<p><b>Gains:</b> ${g.join(' · ')}. Power +${fmt(s1.power-s0.power)}${s1.cap>s0.cap?`, troop capacity +${fmt(s1.cap-s0.cap)}`:''}.</p>`;
  const LIMIT=12,rows=showAll?plan.steps:plan.steps.slice(0,LIMIT);
  list.innerHTML=rows.map((s,k)=>{
    const chips=[];
    if(s.b1.b3>s.b0.b3)chips.push(`<span class="chip ms">3-piece Defense ${pct(s.b1.b3)}%</span>`);
    if(s.b1.b6>s.b0.b6)chips.push(`<span class="chip ms">6-piece Attack ${pct(s.b1.b6)}%</span>`);
    const what=s.moved.length===1?`<b>${PIECES[s.moved[0].i].n}</b><span class="move">${lvName(s.moved[0].from)} → ${lvName(s.moved[0].to)}</span>`
      :`<b>Set bonus push</b><span class="move">${s.moved.map(m=>PIECES[m.i].n).join(', ')} → ${lvName(s.moved[0].to)}</span>`;
    return `<li><span class="num">${k+1}</span><div><div class="step-top">${what}${chips.join('')}</div><div class="cost">${costTxt(s.cost)}</div></div></li>`;}).join('');
  more.hidden=plan.steps.length<=LIMIT;more.textContent=showAll?'Show fewer steps':`Show all ${plan.steps.length} steps`;
}

/* ---------- why this plan ---------- */
function renderWhy(st){
  const box=$('gv-why');
  if(!plan||!plan.steps.length){box.hidden=true;return;}
  box.hidden=false;
  const inv=st.inv,w=st.w,ps=st.pieces.map(x=>x.cur);
  const MAT={satin:{n:'Satin',u:100000,ul:'100k Satin'},gt:{n:'Gilded Threads',u:1000,ul:'1,000 GT'},av:{n:"Artisan's Vision",u:100,ul:'100 AV'}};
  const used={satin:inv.satin-plan.rem.satin,gt:inv.gt-plan.rem.gt,av:inv.av-plan.rem.av};
  const share=k=>inv[k]>0?used[k]/inv[k]:0;
  const keys=['satin','gt','av'].filter(k=>inv[k]>0);
  const lim=keys.reduce((a,k)=>share(k)>share(a)?k:a,keys[0]);
  const P=k=>Math.round(share(k)*100)+'%';
  const tight=keys.filter(k=>share(k)>=share(lim)-0.05),loose=keys.filter(k=>!tight.includes(k));
  const p=[];
  if(tight.length===1)
    p.push(`<p><b>${MAT[lim].n} limits you:</b> the plan uses ${P(lim)} of it${loose.length?`, but only ${loose.map(k=>`${P(k)} of your ${MAT[k].n}`).join(' and ')}`:''}.${loose.length?` More ${loose.map(k=>MAT[k].n).join(' or ')} won't help until you have more ${MAT[lim].n}.`:''}</p>`);
  else
    p.push(`<p><b>${tight.map(k=>MAT[k].n).join(' and ')} both run out:</b> the plan uses ${tight.map(k=>`${P(k)} of your ${MAT[k].n}`).join(' and ')}${loose.length?`, but only ${loose.map(k=>`${P(k)} of your ${MAT[k].n}`).join(' and ')}`:''}. You need more of ${tight.length===2?'both':'all of them'} to go further.</p>`);
  /* next full level on each piece: what it costs and what it is worth */
  const nextDone=q=>{for(let r=q+1;r<=PMAX;r++)if(lvAt(r).s===0)return r;return PMAX;};
  const v0=value(ps,w);
  const rows=ORDER.filter(i=>ps[i]<PMAX).map(i=>{const q=nextDone(ps[i]);const c=costBetween(ps[i],q);const t=[...ps];t[i]=q;
    const g=value(t,w)-v0;const eff=c[lim]>0?g/c[lim]*MAT[lim].u:Infinity;return {i,q,c,g,d:STAT[q]-STAT[ps[i]],eff};});
  const first=plan.steps[0].moved.map(m=>m.i);
  const ranked=[...rows].sort((a,b)=>b.eff-a.eff);const top=ranked[0];
  const wt=i=>w[PIECES[i].t];
  if(top&&ranked[1]){const r2=ranked.find(r=>PIECES[r.i].t!==PIECES[top.i].t)||ranked[1];
    const gap=r2.eff>0&&isFinite(top.eff)?Math.round((top.eff/r2.eff-1)*100):0;
    p.push(`<p><b>Why ${TROOP[PIECES[top.i].t]} first:</b> ${PIECES[top.i].n} to ${lvName(top.q)} costs ${fmt(top.c[lim])} ${MAT[lim].n} for +${pct(top.d)}% (weight ×${wt(top.i).toFixed(1)}). ${PIECES[r2.i].n} to ${lvName(r2.q)} costs ${fmt(r2.c[lim])} for +${pct(r2.d)}% (×${wt(r2.i).toFixed(1)}).${gap>0?` So ${TROOP[PIECES[top.i].t]} gives about ${gap}% more per ${MAT[lim].n}.`:''}</p>`);}
  const tb=rows.map(r=>`<tr class="${first.includes(r.i)?'best':''}"><td><b>${PIECES[r.i].n}</b> <span class="unl" style="display:inline;color:var(--muted)">${TROOP[PIECES[r.i].t]}</span></td>
    <td>${lvName(r.q)}</td><td class="r">${fmt(r.c[lim])}</td><td class="r">+${pct(r.d)}%</td><td class="r">${isFinite(r.eff)?r.eff.toFixed(1):'—'}</td></tr>`).join('');
  /* set bonuses */
  const Ls=ps.map(q=>lvAt(q).L);
  const setStep=(need)=>{const sorted=[...Ls].sort((a,b)=>b-a);const curL=sorted[need-1];const cur=curL>=0?LV[curL].set:0;
    let T=-1;for(let k=Math.max(0,curL+1);k<N;k++)if(LV[k].set>cur){T=k;break;}
    if(T<0)return null;const P=posOf(T,0);
    const costs=ps.map((q,i)=>Ls[i]>=T?0:costBetween(q,P)[lim]).sort((a,b)=>a-b).slice(0,need);
    return {cur,next:LV[T].set,lv:LV[T].name,cost:costs.reduce((a,b)=>a+b,0)};};
  const sb=[];
  for(const [need,name] of [[3,'3-piece Defense'],[6,'6-piece Attack']]){const s=setStep(need);if(!s)continue;
    const reached=need===3?bonuses(plan.ps).b3>s.cur:bonuses(plan.ps).b6>s.cur;
    sb.push(reached?`${name} ${pct(s.cur)}% → ${pct(s.next)}% is part of this plan.`
      :`${name} ${pct(s.cur)}% → ${pct(s.next)}% needs ${need===3?'3 pieces':'all 6 pieces'} at ${s.lv}: ${fmt(s.cost)} ${MAT[lim].n}${s.cost>inv[lim]?`, more than your ${fmt(inv[lim])}`:''}.`);}
  if(sb.length)p.push(`<p><b>Set bonuses:</b> ${sb.join(' ')}</p>`);
  box.innerHTML=`<h3 class="sub">Why this plan</h3>${p.join('')}
    <div class="tbl"><table class="lim"><thead><tr><th>Next level on</th><th>Reaches</th><th class="r">${MAT[lim].n}</th><th class="r">Stat</th><th class="r">Value per ${MAT[lim].ul}</th></tr></thead><tbody>${tb}</tbody></table></div>
    <p class="foot">Value = weighted stat gain (a piece's % counts for Attack and Defense, times its troop weight) per ${MAT[lim].ul}. Highlighted: where the plan starts.</p>`;
}

/* ---------- shop packs ---------- */
const PER5={A:{satin:4800,gt:48,av:54},B:{satin:8000,gt:80,av:40},C:{satin:18000,gt:180,av:0},
  tool:{satin:5400,gt:54,av:0},enh:{satin:1800,gt:18,av:35}};
const MASTER=[5,10,20,50,100],REG=[5,10,20,50],ZERO={satin:0,gt:0,av:0};
const mul=(c,k)=>({satin:c.satin*k,gt:c.gt*k,av:c.av*k});
const addc=(a,b)=>({satin:a.satin+b.satin,gt:a.gt+b.gt,av:a.av+b.av});
const isZero=c=>!c.satin&&!c.gt&&!c.av;
const defPacks=()=>({master:[false,false,false,false,false],tool:{p5:false,p10:false,p20:false,p50:false,n100:0},enh:{p5:false,p10:false,p20:false,p50:false,n100:0}});
const defCart=()=>({master:[null,null,null,null,null],tool:0,enh:0});
let gshop='master',cart=defCart(),shopCache=new Map(),shopSig='',lastMaster=null;

function readPacks(){
  const n=id=>Math.max(0,Math.min(20,Math.floor(Number($(id).value)||0)));
  const reg=k=>({p5:$(k+'-5').checked,p10:$(k+'-10').checked,p20:$(k+'-20').checked,p50:$(k+'-50').checked,n100:n(k+'-100')});
  return {master:MASTER.map((_,i)=>$('gvm-'+i).checked),tool:reg('gvt'),enh:reg('gve')};}
function writePacks(p){
  p={...defPacks(),...(p||{})};
  MASTER.forEach((_,i)=>{$('gvm-'+i).checked=!!(p.master&&p.master[i]);});
  for(const [k,o] of [['gvt',p.tool],['gve',p.enh]]){REG.forEach(x=>{$(k+'-'+x).checked=!!o['p'+x];});$(k+'-100').value=o.n100||0;}}
function regQueue(b){const q=[];REG.forEach(p=>{if(!b['p'+p])q.push({label:'$'+p,price:p});});
  for(let k=b.n100||0;k<20;k++)q.push({label:`$100 · ${k+1}/20`,price:100});return q;}
const masterLevels=st=>MASTER.map((p,k)=>({p,k})).filter(x=>!st.packs.master[x.k]);

/* materials from the packs you selected to try */
function cartParts(st){
  let add={...ZERO},spent=0;const desc=[];
  for(const x of masterLevels(st)){const c=cart.master[x.k];if(!c)break;add=addc(add,mul(PER5[c],x.p/5));spent+=x.p;desc.push(`$${x.p} ${c}`);}
  const reg=k=>{const q=regQueue(st.packs[k]).slice(0,cart[k]);let a={...ZERO},s=0;q.forEach(pk=>{a=addc(a,mul(PER5[k],pk.price/5));s+=pk.price;});
    return {add:a,spent:s,n:q.length,last:q.length?q[q.length-1].label:''};};
  return {master:{add,spent,desc},tool:reg('tool'),enh:reg('enh')};}

/* plan value with extra materials; cached until your levels, materials or priorities change */
function getCache(st){const sig=JSON.stringify([st.inv,st.pieces.map(x=>x.cur),st.w,st.exch]);if(sig!==shopSig){shopSig=sig;shopCache=new Map();}return shopCache;}
function shopScore(st,add,cache){
  const inv=addc(st.inv,add),key=inv.satin+'|'+inv.gt+'|'+inv.av;
  if(cache.has(key))return cache.get(key);
  const r=optimize({...st,inv});const v={val:value(r.ps,st.w),power:summary(r.ps).power,ps:r.ps,rem:r.rem};
  cache.set(key,v);return v;}
function setsUp(a,b){const x=bonuses(a),y=bonuses(b),o=[];
  if(y.b3>x.b3)o.push(`3-piece Defense ${pct(y.b3)}%`);if(y.b6>x.b6)o.push(`6-piece Attack ${pct(y.b6)}%`);return o;}
function limitingOf(st,base){const k=['satin','gt','av'].filter(m=>st.inv[m]>0);
  if(!k.length)return 'satin';return k.reduce((a,m)=>(st.inv[m]-base.rem[m])/st.inv[m]>(st.inv[a]-base.rem[a])/st.inv[a]?m:a,k[0]);}

function regRows(st,kind,cache,baseAdd){
  const q=regQueue(st.packs[kind]),base=shopScore(st,baseAdd,cache);let acc={...baseAdd},spent=0,prev=base;const rows=[];
  for(const pk of q){spent+=pk.price;const gets=mul(PER5[kind],pk.price/5);acc=addc(acc,gets);
    let s=shopScore(st,acc,cache);if(s.val<prev.val)s=prev;
    rows.push({pk,spent,gets,dv:s.val-base.val,marg:s.val-prev.val,dp:s.power-base.power,up:setsUp(prev.ps,s.ps),s});prev=s;}
  return {rows,base};}

/* every chest combination for each budget (3, 9, 27, 81, 243 options) */
function masterPaths(st,cache,baseAdd){
  const lv=masterLevels(st),base=shopScore(st,baseAdd,cache),lim=limitingOf(st,base);
  const better=(s,a,b)=>!b||s.val>b.s.val+1e-9||(Math.abs(s.val-b.s.val)<=1e-9&&a[lim]>b.a[lim]);
  const rows=[];let spent=0,prev=base;
  for(let n=1;n<=lv.length;n++){spent+=lv[n-1].p;let best=null;
    for(let c=0;c<3**n;c++){let x=c,a={...baseAdd};const ch=[];
      for(let j=0;j<n;j++){const id='ABC'[x%3];x=Math.floor(x/3);ch.push(id);a=addc(a,mul(PER5[id],lv[j].p/5));}
      const s=shopScore(st,a,cache);if(better(s,a,best))best={ch,s,a};}
    let s=best.s;if(s.val<prev.val)s=prev;
    rows.push({n,lv:lv.slice(0,n),spent,ch:best.ch,dv:s.val-base.val,marg:s.val-prev.val,dp:s.power-base.power,up:setsUp(base.ps,s.ps),s});prev=s;}
  let acc={...baseAdd},pv=base;const greedy=[];
  for(const x of lv){let b=null;for(const c of ['A','B','C']){const a=addc(acc,mul(PER5[c],x.p/5)),s=shopScore(st,a,cache);if(better(s,a,b))b={c,a,s};}
    greedy.push(b.c);acc=b.a;pv=b.s;}
  return {rows,base,lv,greedy,greedyVal:pv.val};}

function shopVerdict(rows,denom,extra){
  const g=r=>denom>0?r.dv/denom*100:r.dp,gs=r=>denom>0?`+${g(r).toFixed(2)}%`:`+${fmt(g(r))} power`;
  const useful=rows.filter(r=>r.marg>1e-9);
  if(!rows.length)return '<p>You have bought everything in this shop.</p>';
  if(!useful.length)return `<p><b>No pack here improves your plan right now.</b> ${extra||''}</p>`;
  const first=useful[0],best=useful.reduce((a,b)=>g(b)/b.spent>g(a)/a.spent?b:a),last=useful[useful.length-1];
  const v=[`<p><b>First payoff at $${fmt(first.spent)}:</b> ${gs(first)}.${first!==rows[0]?' Buying less adds nothing yet.':''}</p>`,
    `<p><b>Best value: stop at $${fmt(best.spent)}</b> for ${gs(best)} (${denom>0?(g(best)/best.spent*100).toFixed(2)+'% per $100':fmt(g(best)/best.spent*100)+' power per $100'}).</p>`];
  if(last!==rows[rows.length-1])v.push(`<p><b>Nothing more after $${fmt(last.spent)}:</b> the next packs add materials your plan can't use yet.</p>`);
  return v.join('');}

const chipsOf=ch=>ch.map(c=>`<span class="cchip c${c}">${c}</span>`).join('');
function renderCart(parts){
  const total=parts.master.spent+parts.tool.spent+parts.enh.spent;
  const add=addc(addc(parts.master.add,parts.tool.add),parts.enh.add);
  const bits=[];
  if(parts.master.spent)bits.push(`Master's Collection ${parts.master.desc.join(', ')}`);
  if(parts.tool.n)bits.push(`Tool Pack up to ${parts.tool.last}`);
  if(parts.enh.n)bits.push(`Enhancement Pack up to ${parts.enh.last}`);
  for(const id of ['gv-cart','gv-cart2']){const el=$(id);el.hidden=!total;
    if(total)el.innerHTML=`<div><b>Trying packs worth $${fmt(total)}:</b> ${bits.join(' · ')}<span class="unl">Adds ${costTxt(add)}${id==='gv-cart'?'. The plan below includes them.':''}</span></div><button type="button" class="cart-clear">Clear selection</button>`;}
}

function renderShop(st,parts){
  const cache=getCache(st);
  const denom=value(st.pieces.map(x=>x.cur),st.w);
  const gtxt=r=>r.dv<=1e-9?'0%':(denom>0?`+${(r.dv/denom*100).toFixed(2)}%<span class="unl" style="color:var(--muted)">+${fmt(r.dp)} power</span>`:`+${fmt(r.dp)} power`);
  const mtxt=r=>r.marg>1e-9?(denom>0?`+${(r.marg/denom*100).toFixed(2)}%`:'+'):'0%';
  const per=r=>r.dv>1e-9?(denom>0?(r.dv/denom*100/r.spent*100).toFixed(2)+'%':fmt(r.dp/r.spent*100)):'—';
  const unl=r=>r.up.length?`<span class="unl">Unlocks ${r.up.join(', ')}</span>`:'';
  $('gv-shop-unit').textContent=(denom>0?'Gains are % of your weighted governor gear score, the same score the plan uses.':'Gains are shown as gear power, since you have no pieces yet.')+' Tap Try on any pack to add it to the plan.';
  if(gshop==='master'){
    const baseAdd=addc(parts.tool.add,parts.enh.add);
    const M=masterPaths(st,cache,baseAdd);lastMaster=M;
    const sel=M.lv.map(x=>cart.master[x.k]);let selN=0;while(selN<sel.length&&sel[selN])selN++;
    $('gvm-table').querySelector('tbody').innerHTML=M.rows.length?M.rows.map(r=>{
      const on=selN===r.n&&r.ch.every((c,j)=>sel[j]===c);
      return `<tr class="${on?'sel':''} ${r.marg<=1e-9?'zero':''}"><td>${r.n===1?`$${r.lv[0].p} only`:`$${r.lv[0].p} to $${r.lv[r.n-1].p}`}${unl(r)}</td>
        <td class="r">$${fmt(r.spent)}</td><td><span class="cchips">${chipsOf(r.ch)}</span></td><td class="r">${gtxt(r)}</td><td class="r">${per(r)}</td>
        <td class="r"><button type="button" class="selbtn" data-m="${r.n}" aria-pressed="${on}">${on?'Trying':'Try'}</button></td></tr>`;}).join('')
      :'<tr><td colspan="6">You have opened every level.</td></tr>';
    $('gvm-pick').innerHTML=M.lv.map((x,j)=>`<div class="lvpick"><span class="label">$${x.p}</span><div class="seg" role="group" aria-label="Chest for the $${x.p} level">${['','A','B','C'].map(c=>`<button type="button" data-k="${x.k}" data-j="${j}" data-c="${c}" aria-pressed="${(sel[j]||'')===c}">${c||'None'}</button>`).join('')}</div></div>`).join('');
    let selTxt='';
    if(selN){const s=shopScore(st,addc(baseAdd,parts.master.add),cache),b=shopScore(st,baseAdd,cache);const d=s.val-b.val;
      const bestRow=M.rows[selN-1];const gap=bestRow.s.val-s.val;
      selTxt=`<b>Your picks</b> ($${fmt(parts.master.spent)}): ${d>1e-9?(denom>0?'+'+(d/denom*100).toFixed(2)+'%':'+'+fmt(s.power-b.power)+' power'):'no gain yet'}${gap>1e-9?`. The best mix for this budget (${bestRow.ch.join(' · ')}) gives ${denom>0?'+'+((bestRow.s.val-b.val)/denom*100).toFixed(2)+'%':'more'}.`:'. That is the best mix for this budget.'}`;}
    $('gvm-selgain').innerHTML=selTxt||'Pick a chest for each level to see what your own choice gives.';
    let v='';
    if(M.rows.length){const full=M.rows[M.rows.length-1];
      v+=`<p><b>Buying all ${M.lv.length} level${M.lv.length>1?'s':''} ($${fmt(full.spent)}):</b> ${full.ch.map((c,j)=>`$${M.lv[j].p} Chest ${c}`).join(', ')}.</p>`;
      if(M.greedyVal<full.s.val-1e-9)v+=`<p>Choosing level by level (${M.greedy.join(' · ')}) would give ${denom>0?'+'+((M.greedyVal-M.base.val)/denom*100).toFixed(2)+'%':'less'} instead of ${denom>0?'+'+((full.s.val-M.base.val)/denom*100).toFixed(2)+'%':'this'}. Picking the chests together works better here.</p>`;}
    $('gvm-verdict').innerHTML=v+shopVerdict(M.rows,denom,"Your plan is held back by something these chests don't fix.");
  } else {
    const kind=gshop,other=kind==='tool'?parts.enh.add:parts.tool.add,baseAdd=addc(parts.master.add,other);
    const {rows}=regRows(st,kind,cache,baseAdd),id=kind==='tool'?'gvt':'gve';
    $(id+'-table').querySelector('tbody').innerHTML=rows.length?rows.map((r,i)=>{const on=i<cart[kind];
      return `<tr class="${on?'sel':''} ${r.marg<=1e-9?'zero':''}"><td>${r.pk.label}${unl(r)}</td>
      <td class="r">$${fmt(r.spent)}</td><td class="r">${costTxt(r.gets)}</td><td class="r">${gtxt(r)}</td><td class="r">${mtxt(r)}</td><td class="r">${per(r)}</td>
      <td class="r"><button type="button" class="selbtn" data-kind="${kind}" data-r="${i+1}" aria-pressed="${on}">${on?'Trying':'Try'}</button></td></tr>`;}).join('')
      :'<tr><td colspan="7">You have bought every pack this week.</td></tr>';
    $(id+'-verdict').innerHTML=shopVerdict(rows,denom,kind==='enh'?"Artisan's Vision is not what holds your plan back.":'Satin and Gilded Threads are not what hold your plan back.');
  }
}
function showShop(k,save){gshop=['master','tool','enh'].includes(k)?k:'master';
  document.querySelectorAll('.gvtabs [role=tab]').forEach(b=>{const on=b.dataset.tab===gshop;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  ['master','tool','enh'].forEach(t=>{$('gvtp-'+t).hidden=t!==gshop;});
  if(save)render();}

/* ---------- share codes ---------- */
function encodeGov(st){
  const g={};PIECES.forEach((pc,i)=>{const {L,s}=lvAt(st.pieces[i].cur);g[pc.n]=[L,s];});
  return 'GOV:'+btoa(encodeURIComponent(JSON.stringify({n:'Governor Build',g,r:[st.inv.satin,st.inv.gt,st.inv.av]})));}
function decodeGov(code){
  const j=JSON.parse(decodeURIComponent(atob(code.trim().replace(/^GOV:/i,''))));
  if(!j.g)throw new Error('no gear');
  return {pieces:PIECES.map(pc=>{const v=j.g[pc.n]||[-1,0];const L=Math.max(-1,Math.min(N-1,+v[0]||0));return {cur:posOf(L,canStep(L)?Math.max(0,Math.min(4,+v[1]||0)):0),tgt:0};}),
    inv:Array.isArray(j.r)?{satin:+j.r[0]||0,gt:+j.r[1]||0,av:+j.r[2]||0}:null};}

function showAcct(st){
  const a=$('gv-acct');const empty=!st.inv.satin&&!st.inv.gt&&!st.inv.av&&st.pieces.every(x=>!x.cur);
  a.className='acct '+(isExample?'ex':empty?'empty':'mine');
  a.textContent=isExample?'Showing an example account':empty?'Empty: enter your materials and levels':'Your gear';}

function render(){
  const st=readState();
  const parts=cartParts(st),packs=addc(addc(parts.master.add,parts.tool.add),parts.enh.add);
  const eff={...st,inv:addc(st.inv,packs)};
  renderWeights(st);renderPlan(eff);renderCards(eff);renderMaterials(eff,st.inv,packs);renderWhy(eff);renderCart(parts);renderShop(st,parts);showAcct(st);
  if(document.activeElement!==$('gv-code'))$('gv-code').value=encodeGov(st);
  try{localStorage.setItem('hgp-gov-v1',JSON.stringify(st))}catch(e){}
}

/* ---------- events ---------- */
const say=(t,c)=>{const m=$('gv-msg');m.textContent=t;m.className='msg '+c;};
let tmr;const soon=()=>{clearTimeout(tmr);tmr=setTimeout(render,80);};
const app=$('app-gov');
app.addEventListener('input',e=>{if(e.target.closest('.gv-all')||e.target.id==='gv-code')return;if(e.target.closest('.gv-inv,#gv-pieces')&&isExample)isExample=false;soon();});
app.addEventListener('change',e=>{if(e.target.closest('.gv-all')||e.target.id==='gv-code')return;
  if(e.target.closest('#gvtp-master .bought'))cart.master=[null,null,null,null,null];
  if(e.target.closest('#gvtp-tool .bought'))cart.tool=0;
  if(e.target.closest('#gvtp-enh .bought'))cart.enh=0;if(e.target.closest('.gv-inv,#gv-pieces')&&isExample)isExample=false;render();});
$('gv-more').addEventListener('click',()=>{showAll=!showAll;render();});
app.addEventListener('click',e=>{
  if(e.target.closest('.cart-clear')){cart=defCart();render();return;}
  const b=e.target.closest('.selbtn');
  if(b&&b.dataset.m&&lastMaster){const n=+b.dataset.m,row=lastMaster.rows[n-1];
    if(b.getAttribute('aria-pressed')==='true')cart.master=[null,null,null,null,null];
    else{cart.master=[null,null,null,null,null];lastMaster.lv.slice(0,n).forEach((x,j)=>{cart.master[x.k]=row.ch[j];});}
    render();return;}
  if(b&&b.dataset.kind){const k=b.dataset.kind,n=+b.dataset.r;cart[k]=cart[k]===n?n-1:n;render();return;}
  const pick=e.target.closest('#gvm-pick [data-k]');
  if(pick&&lastMaster){const j=+pick.dataset.j,c=pick.dataset.c,lv=lastMaster.lv;
    if(!c)lv.slice(j).forEach(x=>{cart.master[x.k]=null;});
    else{lv.slice(0,j).forEach((x,i)=>{if(!cart.master[x.k])cart.master[x.k]=lastMaster.rows[j].ch[i];});cart.master[lv[j].k]=c;}
    render();}
});
document.querySelector('.gvtabs').addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b)showShop(b.dataset.tab,true);});
document.querySelector('.gvtabs').addEventListener('keydown',e=>{const o=['master','tool','enh'];let i=o.indexOf(gshop);
  if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else return;e.preventDefault();showShop(o[i],true);$('gvtab-'+o[i]).focus();});
$('gv-import').addEventListener('click',()=>{
  try{const d=decodeGov($('gv-code').value);const st=readState();st.pieces=d.pieces;if(d.inv)st.inv=d.inv;st.isExample=false;
    writeState(st);$('gv-code').blur();render();say('Imported. Check your troop priorities in step 3; they are not part of the code.','ok');}
  catch(e){say('That code could not be read. Paste the full text starting with GOV:','err');}});
$('gv-export').addEventListener('click',()=>{const code=encodeGov(readState());$('gv-code').value=code;
  const done=()=>say('Code copied. Anyone with this planner can paste it and press Import code.','ok');
  const fallback=()=>{$('gv-code').focus();$('gv-code').select();say('Code is in the box above, selected. Copy it from there.','ok');};
  try{navigator.clipboard.writeText(code).then(done,fallback)}catch(e){fallback()}});
$('gv-all-l').innerHTML=lvOptions;$('gv-all-s').innerHTML=stOptions;
const allSync=()=>{const L=+$('gv-all-l').value,ok=canStep(L);$('gv-all-s').disabled=!ok;if(!ok)$('gv-all-s').value='0';};
$('gv-all-l').addEventListener('change',allSync);
const allPos=()=>{allSync();const L=+$('gv-all-l').value;return posOf(L,canStep(L)?+$('gv-all-s').value:0);};
$('gv-all-now').addEventListener('click',()=>{const q=allPos();
  PIECES.forEach((_,i)=>setPos('gv-cl-'+i,'gv-cs-'+i,q));
  isExample=false;render();say(`All 6 pieces set to ${lvName(q)}. Change any piece that differs.`,'ok');});
$('gv-example').addEventListener('click',()=>{writeState(EXAMPLE());render();say('Loaded the example account.','ok');});
let armed=0;
$('gv-blank').addEventListener('click',()=>{
  const b=$('gv-blank');
  if(!armed){armed=setTimeout(()=>{armed=0;b.textContent='Start from blank';b.classList.remove('danger');},4000);
    b.textContent='Click again to clear everything';b.classList.add('danger');return;}
  clearTimeout(armed);armed=0;b.textContent='Start from blank';b.classList.remove('danger');
  writeState(BLANK());render();say('Cleared. Enter your materials and levels.','ok');});
function jump(i){const row=$('gv-row-'+i);if(!row)return;
  row.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  row.classList.remove('flash');void row.offsetWidth;row.classList.add('flash');
  setTimeout(()=>$('gv-cl-'+i).focus({preventScroll:true}),350);}
$('gv-cards').addEventListener('click',e=>{const c=e.target.closest('.gcw');if(c)jump(c.dataset.row);});
$('gv-cards').addEventListener('keydown',e=>{const c=e.target.closest('.gcw');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();jump(c.dataset.row);}});

/* ---------- start ---------- */
let start=BLANK();
try{const s=JSON.parse(localStorage.getItem('hgp-gov-v1')||'null');
  if(s&&s.pieces&&s.pieces.length===6&&s.inv){
    /* older saves had goals and plain sliders: keep levels and materials, take troop settings from the Hero Gear tab */
    start={...start,inv:s.inv,exch:!!s.exch,pieces:s.pieces.map(x=>({cur:x.cur,tgt:x.cur})),isExample:!!s.isExample};
    if(s.profile)Object.assign(start,{profile:s.profile,for:s.for,att:s.att,def:s.def,mix:s.mix});
    if(s.packs)start.packs=s.packs;if(s.shopTab)start.shopTab=s.shopTab;if(s.cart)start.cart=s.cart;}}catch(e){}
showShop(start.shopTab||'master',false);
writeState(start);render();
})();
