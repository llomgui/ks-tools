(function(){
const {TROOPS,SLOT_OF,PROFILES,XP,IMB,statOf,masteryCap,maxLevel,weight,value,MS_LEVELS,milestone,msValue,pathCost,raiseMastery,candidates,score,chestRate,chestMyth,optimizeOnce,optimize,TROOP_IMG,gearImg,BADGE,enhTier,enhLabel,enh,cumXP,setMode,getMode,BASE_SHARE,norm,formationWeights,weightsFor}=window.HG;
const EXAMPLE={chests:0,fh:2359,myth:99,mith:122,xp:5000000,profile:'gen4',mode:'exp',ms:true,bought:{p5:false,p10:false,p20:false,p50:false,n100:0},fbought:{p5:false,p10:false,p20:false,p50:false,n100:0},fassume:{fh:12},fcombo:0,hbought:{p5:false,p10:false,p20:false,p50:false,n100:0},hassume:{xp:8,ch:8,rate:1.5},combo:0,form:{att:[50,20,30],def:[60,40,0],mix:70},planFor:'att',gear:{
  I:[[179,18,'R'],[199,20,'R'],[199,20,'R'],[139,15,'R']],
  C:[[139,17,'R'],[139,13,'R'],[139,12,'R'],[199,19,'R']],
  A:[[139,17,'R'],[139,12,'R'],[139,13,'R'],[199,19,'R']]}};

/* ---------- UI ---------- */
const $=id=>document.getElementById(id);
const gearEl=$('gear');
TROOPS.forEach(t=>{
  const box=document.createElement('div');box.className='troop';
  box.innerHTML=`<div class="troop-head"><strong>${t.name}</strong><span class="label" id="w-${t.k}"></span></div>`;
  t.pieces.forEach((key,i)=>{
    const nm=key.split('_')[0], st=key.endsWith('_H')?'Health':'Lethality';
    const row=document.createElement('div');row.className='piece';row.id='row-'+t.k+i;
    row.innerHTML=`<div class="nm"><b>${nm}</b><span>${SLOT_OF[i]} · ${st}</span></div>
      <select id="q-${t.k}${i}" aria-label="${t.name} ${nm} quality"><option value="M">Mythic</option><option value="R">Red</option></select>
      <input id="l-${t.k}${i}" type="number" min="0" max="200" aria-label="${t.name} ${nm} level">
      <input id="m-${t.k}${i}" type="number" min="0" max="20" aria-label="${t.name} ${nm} mastery">`;
    box.appendChild(row);
  });
  gearEl.appendChild(box);
});

function readState(){
  const n=id=>Math.max(0,Math.floor(Number($(id).value)||0));
  const st={fh:n('r-fh'),myth:n('r-myth'),mith:n('r-mith'),xp:n('r-xp'),chests:n('r-ch'),profile:$('profile').value,mode:$('mode').value,ms:$('ms').checked,gear:{},
    bought:{p5:$('b-5').checked,p10:$('b-10').checked,p20:$('b-20').checked,p50:$('b-50').checked,n100:Math.min(20,n('b-100'))},
    fbought:{p5:$('fb-5').checked,p10:$('fb-10').checked,p20:$('fb-20').checked,p50:$('fb-50').checked,n100:Math.min(20,n('fb-100'))},
    fassume:{fh:Math.max(0,Number($('fa-fh').value)||0)},fcombo:n('fa-combo'),
    hbought:{p5:$('hb-5').checked,p10:$('hb-10').checked,p20:$('hb-20').checked,p50:$('hb-50').checked,n100:Math.min(20,n('hb-100'))},
    hassume:{xp:Math.max(0,Number($('ha-xp').value)||0),ch:Math.max(0,Number($('ha-ch').value)||0),rate:Math.max(0,Number($('ha-rate').value)||0)},
    combo:n('ha-combo'),
    form:{att:[n('fa-i'),n('fa-c'),n('fa-a')],def:[n('fd-i'),n('fd-c'),n('fd-a')],mix:Math.min(100,n('f-mix'))},
    planFor:(document.querySelector('input[name=planfor]:checked')||{}).value||window.__planFor||'att'};
  window.__planFor=st.planFor;
  TROOPS.forEach(t=>{st.gear[t.k]=t.pieces.map((_,i)=>{
    const q=$('q-'+t.k+i).value;let L=n('l-'+t.k+i),M=n('m-'+t.k+i);
    if(q==='R'){L=Math.min(200,Math.max(101,L));M=Math.min(20,M);} else {L=Math.min(100,L);M=Math.min(10,M);}
    return [L,M,q];});});
  return st;}
function writeState(st){
  hcart=st.hcart?{mith:+st.hcart.mith||0,fh:+st.hcart.fh||0,hero:+st.hcart.hero||0}:{mith:0,fh:0,hero:0};
  $('r-ch').value=st.chests||0;
  $('r-fh').value=st.fh;$('r-myth').value=st.myth;$('r-mith').value=st.mith;$('r-xp').value=st.xp;
  $('profile').value=st.profile||'gen4';$('mode').value=st.mode==='conq'?'conq':'exp';$('ms').checked=st.ms!==false;
  const f=st.form||{att:[50,20,30],def:[60,40,0],mix:70};
  $('fa-i').value=f.att[0];$('fa-c').value=f.att[1];$('fa-a').value=f.att[2];
  $('fd-i').value=f.def[0];$('fd-c').value=f.def[1];$('fd-a').value=f.def[2];$('f-mix').value=f.mix;
  window.__planFor=st.planFor||'att';
  const b=st.bought||{};$('b-5').checked=!!b.p5;$('b-10').checked=!!b.p10;$('b-20').checked=!!b.p20;$('b-50').checked=!!b.p50;$('b-100').value=b.n100||0;
  const fb=st.fbought||{};$('fb-5').checked=!!fb.p5;$('fb-10').checked=!!fb.p10;$('fb-20').checked=!!fb.p20;$('fb-50').checked=!!fb.p50;$('fb-100').value=fb.n100||0;
  $('fa-fh').value=(st.fassume&&st.fassume.fh!=null)?st.fassume.fh:12;
  {const fs=$('fa-combo');if(!fs.options.length)fs.innerHTML='<option value="0">No Mithril packs</option>';const v=String(st.fcombo||0);if(![...fs.options].some(o=>o.value===v))fs.add(new Option('',v));fs.value=v;}
  const hb=st.hbought||{};$('hb-5').checked=!!hb.p5;$('hb-10').checked=!!hb.p10;$('hb-20').checked=!!hb.p20;$('hb-50').checked=!!hb.p50;$('hb-100').value=hb.n100||0;
  const ha=st.hassume||{xp:8,ch:8,rate:1.5};$('ha-xp').value=ha.xp;$('ha-ch').value=ha.ch;$('ha-rate').value=ha.rate;
  const sel=$('ha-combo');if(!sel.options.length)sel.innerHTML='<option value="0">No Mithril packs</option>';
  const cv=String(st.combo||0);if(![...sel.options].some(o=>o.value===cv))sel.add(new Option('',cv));sel.value=cv;
  TROOPS.forEach(t=>t.pieces.forEach((_,i)=>{const g=st.gear[t.k][i];
    $('q-'+t.k+i).value=g[2]==='R'?'R':'M';$('l-'+t.k+i).value=g[0];$('m-'+t.k+i).value=g[1];}));}

const fmt=n=>n.toLocaleString('en-US');
const qn=q=>q==='R'?'R':'E';
function costLine(c){const a=[];
  if(c.fh)a.push(fmt(c.fh)+' Forgehammers');if(c.myth)a.push(fmt(c.myth)+' Mythic');
  if(c.mith)a.push(fmt(c.mith)+' Mithril');const xp=c.xpR+c.xpL;if(xp)a.push(fmt(xp)+' XP');
  return a.join(' · ')||'free';}

function render(){
  const st=readState();
  st.W=weightsFor(st,st.planFor);
  const W=st.W;const r2=v=>+v.toFixed(2);
  TROOPS.forEach(t=>{const [h,l]=W[t.k];$('w-'+t.k).textContent=`Health ×${r2(h)} · Lethality ×${r2(l)}`;});
  const cm=chestMyth(st);
  $('ch-hint').textContent=st.chests?`≈ +${cm} Mythic Gear`:'';
  const cp=hCartParts(st);
  const eff=withCart(st,cp,null);
  eff.bought=advance(st.bought,cp.mq,cp.n.mith);eff.fbought=advance(st.fbought,cp.fq,cp.n.fh);eff.hbought=advance(st.hbought,cp.hq,cp.n.hero);
  const r=renderFormations(eff);
  const plan=$('plan');plan.innerHTML='';
  if(!r.steps.length){const none=!st.fh&&!st.myth&&!st.mith&&!st.xp&&!st.chests;
    plan.innerHTML=`<li class="empty" style="display:block">${none?'Enter your resources in step 1 and your gear in step 2. Your upgrade order will appear here.':'No upgrade is affordable with these resources.'}</li>`;}
  r.steps.forEach((s,k)=>{
    const li=document.createElement('li');
    const what=[];
    if(s.from.q!==s.to.q) what.push('<span class="chip red">Ascend</span>');
    s.ms.forEach(m=>what.push(`<span class="chip ms">+${m[1]}% ${m[0].startsWith('Hero')?'':s.p.troopName+' '}${m[0]}</span>`));
    const lv=s.from.L!==s.to.L||s.from.q!==s.to.q?`${qn(s.from.q)}${s.from.L} → ${qn(s.to.q)}${s.to.L}`:'';
    const ms=s.from.M!==s.to.M?`M${s.from.M} → M${s.to.M}`:'';
    li.innerHTML=`<span class="num">${k+1}</span><div><div class="step-top"><b>${s.p.troopName} ${s.p.name}</b>
      <span class="move">${[lv,ms].filter(Boolean).join(' · ')}</span>${what.join('')}</div>
      <div class="cost">${costLine(s.c)}</div></div>`;
    plan.appendChild(li);
  });
  const pct=r.before>0?(r.after-r.before)/r.before*100:0;
  $('s-gain').textContent='+'+pct.toFixed(1)+'%';
  $('s-ms').textContent=r.msCount;$('s-steps').textContent=r.steps.length;

  const notes=[];
  notes.push(`<p><span class="label">Left over</span><br><span class="move">${fmt(r.left.fh)} Forgehammers · ${fmt(r.left.myth)} Mythic · ${fmt(r.left.mith)} Mithril · ${fmt(r.left.xp)} XP</span></p>`);
  const blocked=r.pieces.filter(p=>p.s.q==='R'&&IMB[p.s.L+1]&&p.s.L<200);
  const xpUsed=r.steps.reduce((a,s)=>a+s.c.xpR+s.c.xpL,0);
  if(r.left.xp>0&&blocked.length===12) notes.push(`<p>Every piece now sits just below an imbuement, so XP can't be spent until you add Mithril. Keep it in the bag.</p>`);
  else if(r.left.xp>0&&xpUsed===0&&st.xp>0) notes.push(`<p>No XP was spent: the remaining level-ups need Mithril or mastery you don't have yet.</p>`);
  const near=r.pieces.filter(p=>p.s.q==='R'&&p.s.L===199);
  if(getMode()==='exp'&&near.length&&r.left.mith<50){
    const bestNext=near.map(p=>{const m=milestone(p,200);return {p,v:msValue(p,m[0],m[1],W),m}}).sort((a,b)=>b.v-a.v)[0];
    notes.push(`<p>Next Mithril target: 50 Mithril takes <b>${bestNext.p.troopName} ${bestNext.p.name}</b> to R200 for +50% ${bestNext.p.troopName} ${bestNext.m[0]}.</p>`);}
  if(!st.ms) notes.push(`<p>Milestone bonuses are off, so imbuements are judged on raw stats only. Turn them on to weigh the +50% bonuses.</p>`);
  $('notes').innerHTML=notes.join('');
  renderPreview(st,r);
  renderWhy(eff,r);
  renderPoints(r);
  renderPacks(st,r,cp);
  renderHCart(st,cp);
  st.hcart={...hcart};
  st.isExample=isExample;st.shopTab=shopTab;
  if($('acct').textContent)setTimeout(showAcct,0);
  try{localStorage.setItem('hgp-state-v3',JSON.stringify(st))}catch(e){}
  if(document.activeElement!==$('code')) $('code').value=encode(st);   /* the box always shows the code for the current form */
  setPending(false);
}

/* ---------- Formations ---------- */
const FNAME={att:'Attack',def:'Defense',mix:'Mix'};

function renderFormations(st){
  const keys=['att','def','mix'];
  $('mix-out').textContent=`${st.form.mix}% attack · ${100-st.form.mix}% defense`;
  ['att','def'].forEach(k=>{const s=st.form[k].reduce((a,b)=>a+b,0);
    $('fs-'+k).textContent=s===100?'':`Adds up to ${s}%, treated as proportions`;});
  const Ws={};keys.forEach(k=>Ws[k]=weightsFor(st,k));
  const plans={};keys.forEach(k=>plans[k]=optimize({...st,W:Ws[k]}));
  setMode(st.mode);
  const start=optimizeOnce({...st,W:Ws.att,fh:0,myth:0,mith:0,xp:0,chests:0}).pieces;
  const gainIn=(r,sk)=>{const b0=score(start,Ws[sk],st.ms);return (score(r.pieces,Ws[sk],st.ms)-b0)/b0*100;};
  /* each formation keeps whichever candidate plan scores best with its own weights */
  const chosen={};keys.forEach(k=>{chosen[k]=keys.map(pk=>plans[pk]).reduce((a,b)=>gainIn(b,k)>gainIn(a,k)+1e-9?b:a);});
  const cell={};keys.forEach(pk=>{cell[pk]={};keys.forEach(sk=>cell[pk][sk]=gainIn(chosen[pk],sk));});
  const best={};keys.forEach(sk=>best[sk]=Math.max(...keys.map(pk=>cell[pk][sk])));
  const summary=r=>{const big=r.steps.filter(s=>s.c.mith>0).map(s=>`${s.p.troopName} ${s.p.name} → ${enh(s.to)}`);
    return big.length?big.join(' · '):'Mastery only';};
  $('form-table').querySelector('tbody').innerHTML=keys.map(pk=>`<tr class="${st.planFor===pk?'sel':''}">
    <td><label class="pick"><input type="radio" name="planfor" value="${pk}" ${st.planFor===pk?'checked':''}>
      <span><b>Best for ${FNAME[pk]}</b><small>${summary(chosen[pk])}</small></span></label></td>
    ${keys.map(sk=>`<td class="r ${Math.abs(cell[pk][sk]-best[sk])<1e-6?'top':''}">+${cell[pk][sk].toFixed(1)}%</td>`).join('')}</tr>`).join('');
  const r=chosen[st.planFor]||chosen.att;
  return {...r,before:score(start,st.W,st.ms),after:score(r.pieces,st.W,st.ms)};
}

/* ---------- Event points ---------- */
const EVENTS=[
  {name:'Kingdom of Power (KvK)',when:'Day 4 or Day 5',fh:4000,mith:40000},
  {name:'Strongest Governor',when:'Day 2, 4 or 5',fh:4000,mith:40000},
  {name:'Officer Project',when:'Forgehammer week',fh:6000,mith:60000}];
function renderPoints(r){
  const fh=r.steps.reduce((a,s)=>a+s.c.fh,0), mith=r.steps.reduce((a,s)=>a+s.c.mith,0);
  $('pts-table').querySelector('tbody').innerHTML=EVENTS.map(e=>`<tr><td>${e.name}</td><td>${e.when}</td>
    <td class="r"><b>${fmt(fh*e.fh+mith*e.mith)}</b><span class="unl" style="color:var(--muted)">${fmt(fh)} FH · ${fmt(mith)} Mithril</span></td></tr>`).join('');
}

/* ---------- Why this plan ---------- */
function renderWhy(st,r){
  const box=$('why');
  if(!r.steps.length){box.hidden=true;return;}
  box.hidden=false;
  const W=st.W,denom=r.before||1;
  /* 1. what limits you: add the same money of each resource and measure the gain */
  /* buy this week's remaining packs, in order, until the target amount is reached */
  const buyUntil=(queue,key,target)=>{let amt=0,cost=0,n=0;for(const pk of queue){amt+=pk[key];cost+=pk.price;n++;if(amt>=target)return {amt,cost,n};}return amt?{amt,cost,n,short:true}:null;};
  const mb=buyUntil(mithQueue(st.bought),'mith',50);
  const fb=buyUntil(fhQueue(st.fbought,st.fassume||{fh:12}),'fh',600);
  const packTxt=(b,shop)=>b?`$${fmt(b.cost)} in ${shop} packs${b.short?' (all that is left this week)':''}`:'sold out this week';
  /* Mythic Gear comes from Lucky Hero Gear Chests in the Hero gear packs; chests already in the backpack count toward the next drop */
  const ha=st.hassume||{xp:8,ch:8,rate:1.5};const hq=heroQueue(st.hbought||{},ha);
  const myb=(()=>{let ch=0,cost=0,got=0;for(const pk of hq){ch+=pk.chests;cost+=pk.price;
      got=Math.floor(((st.chests||0)+ch)*chestRate(st)/100)-chestMyth(st);if(got>=10)return {amt:got,cost,chests:ch};}
    return got>0?{amt:got,cost,chests:ch,short:true}:null;})();
  const xb=buyUntil(hq,'xp',250000);
  const tests=[
    {k:'mith',amt:mb?mb.amt:50,label:'Mithril',cost:packTxt(mb,'Mithril'),usd:mb?mb.cost:0},
    {k:'fh',amt:fb?fb.amt:600,label:'Forgehammers',cost:packTxt(fb,'Forgehammer'),usd:fb?fb.cost:0},
    {k:'myth',amt:myb?myb.amt:10,label:'Mythic Gear',cost:myb?`${packTxt(myb,'Hero gear')}, ${fmt(myb.chests)} chests`:`sold out this week (≈ ${fmt(Math.ceil(1000/(chestRate(st)||1.5)))} chests needed)`,usd:myb?myb.cost:0},
    {k:'xp',amt:xb?xb.amt:250000,label:'XP',cost:packTxt(xb,'Hero gear'),usd:xb?xb.cost:0}];
  const ref=optimize(st);
  tests.forEach(t=>{const x=optimize({...st,[t.k]:st[t.k]+t.amt});t.gain=Math.max(0,(x.after-ref.after)/denom*100);});
  const ranked=[...tests].sort((a,b)=>b.gain-a.gain);
  const top=ranked[0];
  /* 2. spare resources, each with its reason */
  const spare=[];
  if(r.left.fh>=110)spare.push(`${fmt(r.left.fh)} Forgehammers stay unused${r.left.myth<10?': every mastery level above 10 also costs Mythic Gear, and yours runs out first':''}.`);
  if(r.left.xp>=50000)spare.push(`${fmt(r.left.xp)} XP stays unused${r.left.mith<20?': the next levels sit behind imbuements that need Mithril':''}.`);
  if(r.left.myth>=10)spare.push(`${fmt(r.left.myth)} Mythic Gear stays unused.`);
  if(r.left.mith>=20)spare.push(`${fmt(r.left.mith)} Mithril stays unused.`);
  /* 3. best moves, by weighted gain */
  const moves=r.steps.map(s=>{let g=value(s.to,s.p,W)-value(s.from,s.p,W);
    if(st.ms)for(const m of s.ms)g+=msValue(s.p,m[0],m[1],W);return {s,g};}).sort((a,b)=>b.g-a.g).slice(0,3);
  const mv=moves.map(({s,g})=>{
    const per=s.c.mith?`${(g/s.c.mith).toFixed(1)} per Mithril`:s.c.myth?`${(g/s.c.myth).toFixed(1)} per Mythic Gear`:'';
    const ms=s.ms.length?` and unlocks ${s.ms.map(m=>`+${m[1]}% ${m[0].startsWith('Hero')?'':s.p.troopName+' '}${m[0]}`).join(', ')}`:'';
    return `<li><b>${s.p.troopName} ${s.p.name} → ${enh(s.to)}</b> gives +${g.toFixed(0)} weighted points${per?` (${per})`:''}${ms}.</li>`;}).join('');
  box.innerHTML=`<h3 class="sub">Why this plan</h3>
    <p><b>What limits you:</b> ${top.gain>0.005?`more <b>${top.label}</b> helps most (+${top.gain.toFixed(2)}% for +${fmt(top.amt)}).`:'nothing small: you would need several resources at once to go further.'}
    ${spare.join(' ')}</p>
    <div class="tbl"><table class="lim"><thead><tr><th>If you had</th><th>Costs</th><th class="r">Plan gain</th><th class="r">Per $100</th></tr></thead><tbody>
    ${ranked.map(t=>`<tr class="${t===top&&t.gain>0.005?'best':''}"><td>+${fmt(t.amt)} ${t.label}</td><td>${t.cost||'—'}</td><td class="r">${t.gain>0.005?'+'+t.gain.toFixed(2)+'%':'0%'}</td><td class="r">${t.usd?(t.gain/t.usd*100).toFixed(2)+'%':'—'}</td></tr>`).join('')}
    </tbody></table></div>
    <p><b>Biggest moves:</b></p><ul class="moves">${mv}</ul>
    <p class="foot">Pack costs follow what is still available this week, using the boxes you ticked in Shop packs. Each move was compared with every other upgrade your resources allow, and the planner keeps the combination that scores highest. The formation table shows how this plan holds up in other fights.</p>`;
}

/* ---------- Gear preview ---------- */
function renderPreview(st,r){
  const box=$('preview');box.innerHTML='';
  TROOPS.forEach(t=>{
    let dL=0,dH=0;const cards=[];
    t.pieces.forEach((key,i)=>{
      const g=st.gear[t.k][i];const from={q:g[2],L:g[0],M:g[1]};
      const p=r.pieces.find(x=>x.troop===t.k&&x.key===key);const to=p.s;
      const d=statOf(to.q,to.L)*(1+0.1*to.M)-statOf(from.q,from.L)*(1+0.1*from.M);
      if(p.stat==='L')dL+=d;else dH+=d;
      const up=to.L!==from.L||to.M!==from.M||to.q!==from.q;
      const tip=`${t.name} ${p.name} (${p.stat==='H'?'Health':'Lethality'}) · ${to.q==='R'?'Ascended':'Mythic'} ${enh(to)} · Forge ${to.M} · ${fmt(Math.round(cumXP(to.L)/100)*100)} XP`;
      cards.push(`<div class="gcw ${up?'up':'same'}" tabindex="0" role="button" data-row="${t.k}${i}" aria-label="Edit ${t.name} ${p.name}">
        <div class="gc gt q${to.q}" title="${tip}" role="img" aria-label="${tip}">
          ${BADGE[t.k]}<img src="${gearImg(t.k,i)}" alt="" loading="lazy" decoding="async">
          ${enhLabel(to)}<span class="gt-lbl">Lv. ${to.M}</span>
        </div>
        <span class="gn">${p.name}</span>
        ${up?`<span class="gw">was ${enh(from)} · Lv ${from.M}</span>`:'<span class="gw">&nbsp;</span>'}</div>`);
    });
    const fmtD=v=>v>0.005?`<b>+${v.toFixed(1)}</b>`:'—';
    const row=document.createElement('div');
    row.innerHTML=`<div class="pv-head"><strong>${t.name}</strong><span>Lethality ${fmtD(dL)} · Health ${fmtD(dH)}</span></div><div class="pv-row">${cards.join('')}</div>`;
    box.appendChild(row);
  });
  box.classList.toggle('has-up',!!box.querySelector('.gcw.up'));
}

/* ---------- Packs (Mithril and Hero gear) ---------- */
const TIERS=[['p5',5],['p10',10],['p20',20],['p50',50]];
function packQueue(b,make){
  const q=[];
  TIERS.forEach(([k,price])=>{if(!b[k])q.push(make(`$${price}`,price))});
  for(let k=(b.n100||0);k<20;k++)q.push(make(`$100 · ${k+1}/20`,100));
  return q;}
const mithQueue=b=>packQueue(b,(label,price)=>({label,price,mith:price/5}));
const fhQueue=(b,a)=>packQueue(b,(label,price)=>({label,price,fh:a.fh*price/5}));
const heroQueue=(b,a)=>packQueue(b,(label,price)=>({label,price,xp:a.xp*100*price/5,chests:a.ch*price/5}));

function reached(res){
  const set=new Set();
  res.pieces.forEach(p=>{if(p.s.q==='R')MS_LEVELS().forEach(L=>{if(p.s.L>=L)set.add(p.troopName+' '+p.name+'|'+L)})});
  return set;}

/* run the plan once per extra pack, cumulatively */
function analyze(st,ref,denom,queue,toRes){
  let spent=0,prevGain=0,prevSet=reached(ref),bestRes=ref;
  const acc={mith:0,xp:0,chests:0,fh:0};const rows=[];
  for(const pk of queue){
    spent+=pk.price;acc.mith+=pk.mith||0;acc.xp+=pk.xp||0;acc.chests+=pk.chests||0;acc.fh+=pk.fh||0;
    const add=toRes(acc);
    let res=optimize({...st,mith:st.mith+add.mith,xp:st.xp+add.xp,myth:st.myth+add.myth,fh:st.fh+(add.fh||0)});
    if(res.after<bestRes.after) res=bestRes; else bestRes=res;   /* monotonicity guard: extra resources can stay unspent */
    const gain=(res.after-ref.after)/denom*100;
    const set=reached(res);
    const unlocked=[...set].filter(x=>!prevSet.has(x)).map(x=>{const [n,L]=x.split('|');return n+' R'+L;});
    rows.push({pk,spent,add:{...add},gain,marg:gain-prevGain,unlocked,res});
    prevGain=gain;prevSet=set;
  }
  return rows;}

function whyStops(res){
  const l=res.left;
  const blocked=res.pieces.every(p=>p.s.q==='R'&&(p.s.L===200||IMB[p.s.L+1]));
  if(l.myth<10) return 'you run out of Mythic Gear (each R200 imbuement needs 10, each mastery level above 10 needs some too)';
  if(l.fh<110) return 'you run out of Forgehammers for the next mastery levels';
  if(blocked&&l.mith<20) return 'every piece is waiting at an imbuement and needs Mithril first';
  return 'no piece can turn more of this into stats yet';}

function renderSection(cfg){
  const {rows,tableId,verdictId,chartId,cells,emptyMsg,kind}=cfg;
  const tbody=$(tableId).querySelector('tbody');tbody.innerHTML='';
  const useful=rows.filter(r=>r.gain>0.005);
  const best=useful.length?useful.reduce((a,b)=>(b.gain/b.spent>a.gain/a.spent?b:a)):null;
  const lastUseful=[...rows].reverse().find(r=>r.marg>0.005);
  rows.forEach((r,i)=>{
    const tr=document.createElement('tr');const on=i<hcart[kind];
    tr.className=[r.marg<=0.005?'zero':'',on?'sel':''].join(' ').trim();
    tr.innerHTML=`<td>${r.pk.label}${best&&r===best?' <span class="chip ms">Best value</span>':''}${r.unlocked.length?`<span class="unl">Unlocks ${r.unlocked.join(', ')}</span>`:''}</td>
      <td class="r">$${fmt(r.spent)}</td>${cells(r)}
      <td class="r">${r.gain>0.005?'+'+r.gain.toFixed(2)+'%':'0%'}</td><td class="r">${r.marg>0.005?'+'+r.marg.toFixed(2)+'%':'0%'}</td>
      <td class="r">${r.gain>0.005?(r.gain/r.spent*100).toFixed(2)+'%':'—'}</td>
      <td class="r"><button type="button" class="selbtn" data-hk="${kind}" data-r="${i+1}" aria-pressed="${on}">${on?'Trying':'Try'}</button></td>`;
    tbody.appendChild(tr);
  });
  const cols=$(tableId).querySelectorAll('thead th').length;
  if(!rows.length) tbody.innerHTML=`<tr><td colspan="${cols}">You have bought every pack available this week.</td></tr>`;

  const v=[];
  if(rows.length&&!useful.length){
    v.push(`<p><b>No pack this week improves your plan.</b> With all of them, ${whyStops(rows[rows.length-1].res)}.</p>${emptyMsg||''}`);
  } else if(rows.length){
    const first=useful[0];
    v.push(`<p><b>First payoff at $${fmt(first.spent)}</b>: +${first.gain.toFixed(2)}%${first.unlocked.length?', unlocking '+first.unlocked.join(', '):''}.${first!==rows[0]?' Buying less than that adds nothing yet.':''}</p>`);
    v.push(`<p><b>Best value: stop at $${fmt(best.spent)}</b> for +${best.gain.toFixed(2)}% (${(best.gain/best.spent*100).toFixed(2)}% per $100). It's marked Best value in the table.</p>`);
    if(lastUseful&&lastUseful!==rows[rows.length-1])
      v.push(`<p><b>Nothing more after $${fmt(lastUseful.spent)}</b>: beyond that, ${whyStops(lastUseful.res)}.</p>`);
  }
  $(verdictId).innerHTML=v.join('');
  drawChart($(chartId),rows,cfg.aria);
}

/* ---------- packs you try ---------- */
let hcart={mith:0,fh:0,hero:0};
function advance(b,q,n){const o={...(b||{})};q.slice(0,n).forEach(pk=>{if(pk.price===100)o.n100=(o.n100||0)+1;else o['p'+pk.price]=true;});return o;}
function hCartParts(st){
  const mq=mithQueue(st.bought),fq=fhQueue(st.fbought,st.fassume||{fh:12}),hq=heroQueue(st.hbought||{},st.hassume||{xp:8,ch:8,rate:1.5});
  const n={mith:Math.min(hcart.mith,mq.length),fh:Math.min(hcart.fh,fq.length),hero:Math.min(hcart.hero,hq.length)};
  const sum=(q,k,key)=>q.slice(0,n[k]).reduce((a,pk)=>a+(pk[key]||0),0);
  const spent=(q,k)=>q.slice(0,n[k]).reduce((a,pk)=>a+pk.price,0);
  const last=(q,k)=>n[k]?q[n[k]-1].label:'';
  return {n,mq,fq,hq,mith:sum(mq,'mith','mith'),fh:sum(fq,'fh','fh'),xp:sum(hq,'hero','xp'),chests:sum(hq,'hero','chests'),
    spent:{mith:spent(mq,'mith'),fh:spent(fq,'fh'),hero:spent(hq,'hero')},last:{mith:last(mq,'mith'),fh:last(fq,'fh'),hero:last(hq,'hero')}};}
function withCart(st,cp,skip){const o={...st};
  if(skip!=='mith')o.mith=st.mith+cp.mith;
  if(skip!=='fh')o.fh=st.fh+cp.fh;
  if(skip!=='hero'){o.xp=st.xp+cp.xp;o.chests=(st.chests||0)+cp.chests;}
  return o;}
function renderHCart(st,cp){
  const tot=cp.spent.mith+cp.spent.fh+cp.spent.hero,bits=[],adds=[];
  if(cp.n.mith){bits.push(`Mithril up to ${cp.last.mith}`);adds.push(`${fmt(cp.mith)} Mithril`);}
  if(cp.n.fh){bits.push(`Forgehammers up to ${cp.last.fh}`);adds.push(`${fmt(cp.fh)} Forgehammers`);}
  if(cp.n.hero){bits.push(`Hero gear up to ${cp.last.hero}`);
    const my=Math.floor(((st.chests||0)+cp.chests)*chestRate(st)/100)-chestMyth(st);
    adds.push(`${fmt(cp.xp)} XP`,`${fmt(cp.chests)} Lucky Chests (≈ ${my} Mythic Gear)`);}
  for(const id of ['h-cart','h-cart2']){const el=$(id);el.hidden=!tot;
    if(tot)el.innerHTML=`<div><b>Trying packs worth $${fmt(tot)}:</b> ${bits.join(' · ')}<span class="unl">Adds ${adds.join(' · ')}${id==='h-cart'?'. The plan below includes them.':''}</span></div><button type="button" class="hcart-clear">Clear selection</button>`;}
}

function renderPacks(st,base,cp){
  const denom=base.before||1;
  /* each shop is measured on top of the packs you are trying in the other shops */
  const sM=withCart(st,cp,'mith'),sF=withCart(st,cp,'fh'),sH=withCart(st,cp,'hero');
  const mrows=analyze(sM,optimize(sM),denom,cp.mq,acc=>({mith:acc.mith,xp:0,myth:0}));
  renderSection({rows:mrows,kind:'mith',tableId:'pack-table',verdictId:'pack-verdict',chartId:'pack-chart',
    aria:'Plan gain by money spent on Mithril packs this week',
    cells:r=>`<td class="r">+${r.add.mith}</td>`});
  const frows=analyze(sF,optimize(sF),denom,cp.fq,acc=>({mith:0,xp:0,myth:0,fh:acc.fh}));
  renderSection({rows:frows,kind:'fh',tableId:'fpack-table',verdictId:'fpack-verdict',chartId:'fpack-chart',
    aria:'Plan gain by money spent on Forgehammer packs this week',
    cells:r=>`<td class="r">+${fmt(r.add.fh)}</td>`,
    emptyMsg:cp.n.mith?'':'<p>Try some packs in the Mithril tab: extra mastery often needs Mythic Gear or Mithril too.</p>'});
  const a=st.hassume;
  const hrows=analyze(sH,optimize(sH),denom,cp.hq,acc=>({mith:0,xp:acc.xp,myth:Math.floor(((sH.chests||0)+acc.chests)*a.rate/100)-chestMyth(sH)}));
  renderSection({rows:hrows,kind:'hero',tableId:'hpack-table',verdictId:'hpack-verdict',chartId:'hpack-chart',
    aria:'Plan gain by money spent on Hero gear packs this week',
    cells:r=>`<td class="r">+${fmt(r.add.xp)}</td><td class="r">+${r.add.myth}</td>`,
    emptyMsg:cp.n.mith?'':'<p>Try some packs in the Mithril tab: XP and Mythic Gear often only pay off once Mithril opens the next imbuement.</p>'});
}

function drawChart(box,rows,aria){
  if(!rows.length||!rows.some(r=>r.gain>0.005)){box.innerHTML='';return;}
  const W=640,H=220,m={l:52,r:16,t:14,b:34};
  const maxX=rows[rows.length-1].spent, maxY=Math.max(...rows.map(r=>r.gain));
  const steps=[0.1,0.2,0.25,0.5,1,2,2.5,5,10,20,25,50,100];
  const stepY=steps.find(x=>x>=maxY/4)||Math.ceil(maxY/4), topY=Math.ceil(maxY/stepY-1e-9)*stepY;
  const x=v=>m.l+(v/maxX)*(W-m.l-m.r), y=v=>H-m.b-(v/topY)*(H-m.t-m.b);
  let path=`M${x(0)},${y(0)}`;
  rows.forEach(r=>{path+=` H${x(r.spent).toFixed(1)} V${y(r.gain).toFixed(1)}`;});
  let g='';
  for(let v=0;v<=topY+1e-9;v+=stepY){g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${m.l-8}" y="${y(v)+4}" text-anchor="end">+${+v.toFixed(2)}%</text>`;}
  const xt=[0];const st=maxX>1200?500:maxX>400?200:maxX>100?50:25;for(let v=st;v<maxX-st*0.4;v+=st)xt.push(v);xt.push(maxX);
  xt.forEach(v=>{g+=`<text x="${x(v)}" y="${H-m.b+18}" text-anchor="middle">$${fmt(v)}</text>`;});
  const dots=rows.filter(r=>r.marg>0.005).map(r=>`<circle cx="${x(r.spent)}" cy="${y(r.gain)}" r="4" fill="var(--ember)" stroke="var(--panel)" stroke-width="1.5"><title>$${fmt(r.spent)}: +${r.gain.toFixed(2)}%</title></circle>`).join('');
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}" style="font-family:var(--mono);font-size:11px;fill:var(--muted)">
    ${g}<line x1="${m.l}" x2="${W-m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)"/>
    <path d="${path}" fill="none" stroke="var(--ember)" stroke-width="2.2" stroke-linejoin="round"/>${dots}
    <text x="${W-m.r}" y="${H-4}" text-anchor="end">spent this week</text></svg>`;
}

/* ---------- KGO codes ---------- */
function decode(code){
  const raw=code.trim().replace(/^KGO:/i,'');
  const json=JSON.parse(decodeURIComponent(atob(raw)));
  if(!json.g) throw new Error('no gear');
  const st=readState();
  TROOPS.forEach(t=>t.pieces.forEach((key,i)=>{
    const src=json.g[t.k]||{};let v=src[key];
    if(!v){const keys=Object.keys(src);if(keys[i])v=src[keys[i]];}
    if(v){const q=(v[2]==='R'||v[0]>100)?'R':'M';st.gear[t.k][i]=[Number(v[0])||0,Number(v[1])||0,q];}
  }));
  if(Array.isArray(json.r)){const r=json.r.map(x=>+x||0);st.fh=r[0];st.mith=r[1];st.xp=r[2]*10+r[3]*100;st.myth=r[8]||0;}
  return st;}
function encode(st){
  const g={};TROOPS.forEach(t=>{g[t.k]={};t.pieces.forEach((key,i)=>{g[t.k][key]=st.gear[t.k][i]})});
  const obj={n:'Shared Build',g,r:[st.fh,st.mith,Math.floor((st.xp%100)/10),Math.floor(st.xp/100),0,0,0,0,st.myth]};
  return 'KGO:'+btoa(encodeURIComponent(JSON.stringify(obj)));}
const say=(t,c)=>{const m=$('share-msg');m.textContent=t;m.className='msg '+c;};

$('btn-import').addEventListener('click',()=>{
  try{const st=decode($('code').value);isExample=false;writeState(st);render();showAcct();
    say('Imported. XP is read from the 10-XP and 100-XP parts in the code; add any XP from gear you plan to consume.','ok');}
  catch(e){say('That code could not be read. Paste the full text starting with KGO:','err');}
});
$('btn-export').addEventListener('click',()=>{
  const code=encode(readState());$('code').value=code;$('code').dataset.mine='1';
  const done=()=>say('Code copied. Send it to anyone with this planner and they can import it.','ok');
  const fallback=()=>{$('code').focus();$('code').select();say('Code is in the box above, selected. Copy it from there.','ok');};
  try{navigator.clipboard.writeText(code).then(done,fallback)}catch(e){fallback()}
});
$('btn-reset').addEventListener('click',()=>{isExample=true;writeState(EXAMPLE);render();showAcct();say('Loaded the example account.','ok');});
let isExample=true;
const BLANK=()=>({...EXAMPLE,chests:0,fh:0,myth:0,mith:0,xp:0,
  bought:{p5:false,p10:false,p20:false,p50:false,n100:0},hbought:{p5:false,p10:false,p20:false,p50:false,n100:0},fbought:{p5:false,p10:false,p20:false,p50:false,n100:0},combo:0,fcombo:0,
  gear:{I:[0,0,0,0].map(()=>[0,0,'M']),C:[0,0,0,0].map(()=>[0,0,'M']),A:[0,0,0,0].map(()=>[0,0,'M'])},isExample:false});
function showAcct(){const a=$('acct');
  const st=readState();const empty=!st.fh&&!st.myth&&!st.mith&&!st.xp&&!st.chests&&TROOPS.every(t=>st.gear[t.k].every(g=>!g[0]&&!g[1]));
  a.className='acct '+(isExample?'ex':empty?'empty':'mine');
  a.textContent=isExample?'Showing an example account':empty?'Empty: enter your numbers or import a code':'Your account';
  if(empty&&document.activeElement!==$('code'))$('code').value='';}
function jumpTo(key){const row=$('row-'+key);if(!row)return;
  row.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  row.classList.remove('flash');void row.offsetWidth;row.classList.add('flash');
  setTimeout(()=>{const inp=$('l-'+key);if(inp)inp.focus({preventScroll:true});},350);}
$('preview').addEventListener('click',e=>{const c=e.target.closest('.gcw');if(c)jumpTo(c.dataset.row);});
$('preview').addEventListener('keydown',e=>{const c=e.target.closest('.gcw');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();jumpTo(c.dataset.row);}});
let blankArmed=0;
$('btn-blank').addEventListener('click',()=>{
  const btn=$('btn-blank');
  if(!blankArmed){blankArmed=setTimeout(()=>{blankArmed=0;btn.textContent='Start from blank';btn.classList.remove('danger');},4000);
    btn.textContent='Click again to clear everything';btn.classList.add('danger');return;}
  clearTimeout(blankArmed);blankArmed=0;btn.textContent='Start from blank';btn.classList.remove('danger');
  isExample=false;writeState(BLANK());render();showAcct();
  say('Cleared. Enter your resources and gear, or paste a KGO code.','ok');
  $('h-res').scrollIntoView({block:'start'});$('r-fh').focus({preventScroll:true});
});
let shopTab='mith';
function showTab(k){shopTab=['mith','fh','hero'].includes(k)?k:'mith';
  document.querySelectorAll('.tabs [role=tab]').forEach(b=>{const on=b.dataset.tab===shopTab;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  ['mith','fh','hero'].forEach(t=>{$('tp-'+t).hidden=t!==shopTab;});}
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b){showTab(b.dataset.tab);saveTab();}});
document.querySelector('.tabs').addEventListener('keydown',e=>{
  const order=['mith','fh','hero'];let i=order.indexOf(shopTab);
  if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else return;
  e.preventDefault();showTab(order[i]);$('tab-'+order[i]).focus();saveTab();});
function saveTab(){try{const s=JSON.parse(localStorage.getItem('hgp-state-v3')||'null');if(s){s.shopTab=shopTab;localStorage.setItem('hgp-state-v3',JSON.stringify(s));}}catch(e){}}
/* The planner runs automatically when you finish an edit: right away when you leave a field, tick a box,
   pick an option or press Enter, or 800 ms after you stop typing. Not on every keystroke, which made typing lag.
   While a run is pending, a small "Updating plan…" label shows next to the results title. */
let pending=false;
function setPending(v){pending=v;document.body.classList.toggle('is-updating',v);}
let tmr;const schedule=ms=>{setPending(true);clearTimeout(tmr);tmr=setTimeout(()=>{tmr=null;render();},ms);};
const edited=(e,now)=>{if(e&&e.target.closest('#gear'))livePreview();schedule(now?30:800);};
/* editing your gear is cheap to show: redraw the cards from the form right away (no planning) */
function livePreview(){const st=readState(),pieces=[];
  TROOPS.forEach(t=>t.pieces.forEach((key,i)=>{const g=st.gear[t.k][i];
    pieces.push({troop:t.k,key,name:key.split('_')[0],stat:key.slice(-1),s:{q:g[2],L:g[0],M:g[1]}});}));
  renderPreview(st,{pieces});}
document.addEventListener('input',e=>{if(!e.target.closest('#app-hero'))return;if(e.target.closest('.panel')&&e.target.id!=='code'){if(e.target.closest('.res,#gear')&&isExample){isExample=false;showAcct();}edited(e);}});
document.addEventListener('change',e=>{if(!e.target.closest('#app-hero'))return;
  if(e.target.closest('#tp-mith .bought'))hcart.mith=0;
  if(e.target.closest('#tp-fh .bought'))hcart.fh=0;
  if(e.target.closest('#tp-hero .bought'))hcart.hero=0;
  if(e.target.id!=='code')edited(e,true)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&pending&&e.target.matches('#app-hero .panel input:not(#code)')){e.preventDefault();schedule(30);}});
$('app-hero').addEventListener('click',e=>{
  if(e.target.closest('.hcart-clear')){hcart={mith:0,fh:0,hero:0};render();return;}
  const b=e.target.closest('.selbtn[data-hk]');
  if(b){const k=b.dataset.hk,n=+b.dataset.r;hcart[k]=hcart[k]===n?n-1:n;render();}});

/* new visitors start blank; returning visitors get what they last entered */
let start=BLANK();
const sameGear=(a,b)=>TROOPS.every(t=>a[t.k]&&a[t.k].every((g,i)=>g[0]===b[t.k][i][0]&&g[1]===b[t.k][i][1]&&g[2]===b[t.k][i][2]));
try{
  let s=JSON.parse(localStorage.getItem('hgp-state-v3')||'null');
  if(!s){
    /* carry over values saved by earlier versions of this page */
    const old=JSON.parse(localStorage.getItem('hgp-state-v2')||'null');
    if(old&&old.gear){
      s=old;
      /* the old default was the example account: keep it labelled as an example, not as the visitor's own */
      const exRes=[[2359,99,122],[2172,85,134]];
      s.isExample=sameGear(old.gear,EXAMPLE.gear)&&exRes.some(r=>old.fh===r[0]&&old.myth===r[1]&&old.mith===r[2]);
    }
  }
  if(s&&s.gear)start=s;
}catch(e){}
isExample=!!start.isExample;
showTab(start.shopTab||'mith');
writeState(start);render();showAcct();
})();
