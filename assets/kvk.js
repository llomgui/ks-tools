(function(){
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const big=n=>n>=1e6?(+(n/1e6).toFixed(n>=1e7?1:2))+'M':n>=1e4?(+(n/1e3).toFixed(n>=1e5?0:1))+'K':fmt(n);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- KvK preparation days (Kingshot Optimizer, Kingdom of Power event guide) ---------- */
const DAYS=[null,
  {n:'City Construction',ms:[30000,100000,200000]},
  {n:'Basic Skills Up',ms:[40000,120000,270000]},
  {n:'Pet Training',ms:[80000,150000,300000]},
  {n:'Hero Development',ms:[80000,150000,300000]},
  {n:'Power Boost',ms:[40000,130000,250000]}];
const TROOP_PTS=[3,4,5,8,12,18,25,35,45,60,75];  /* train 1 troop, level 1..11, day 4 */
/* k, name, group, points per unit, days, input unit; mul converts the input to scoring units */
const T=[
  {k:'spc',n:'Construction speedups',g:'Speedups',p:30,d:[1,2,5],u:'days',mul:1440,step:0.1},
  {k:'spr',n:'Research speedups',g:'Speedups',p:30,d:[1,2,5],u:'days',mul:1440,step:0.1},
  {k:'spt',n:'Training speedups',g:'Speedups',p:30,d:[1,2,5],u:'days',mul:1440,step:0.1},
  {k:'gsu',n:'General speedups',g:'Speedups',p:30,d:[1,2,5],u:'days',mul:1440,step:0.1,h:'Score like the speedup they replace'},
  {k:'lsu',n:'Learning speedups',g:'Speedups',p:30,d:[1,2,5],u:'days',mul:1440,step:0.1,h:'Master skills, not gem speedups'},
  {k:'tg',n:'Truegold',g:'Truegold',p:2000,d:[1,2,5],h:'Only what you spend on buildings'},
  {k:'tgt',n:'Tempered Truegold',g:'Truegold',p:30000,d:[1,2,5]},
  {k:'tgd',n:'Truegold Dust',g:'Truegold',p:1000,d:[1,2,5],h:'Spent on research'},
  {k:'mhs',n:'Mythic general hero shards',g:'Heroes',p:3040,d:[2,3]},
  {k:'ehs',n:'Epic general hero shards',g:'Heroes',p:1220,d:[2,3]},
  {k:'rhs',n:'Rare general hero shards',g:'Heroes',p:350,d:[2,3]},
  {k:'rlt',n:'Hero Roulette spins',g:'Heroes',p:8000,d:[2,3]},
  {k:'mem',n:'Master Emblems',g:'Heroes',p:6000,d:[2,3],h:'Not General Emblems'},
  {k:'mma',n:"Master's Manuscripts",g:'Heroes',p:60,d:[2,3]},
  {k:'ham',n:'Forgehammers',g:'Hero gear',p:4000,d:[4,5]},
  {k:'mith',n:'Mithril',g:'Hero gear',p:40000,d:[4,5]},
  {k:'exc',n:'Exclusive gear widgets',g:'Hero gear',p:8000,d:[4,5]},
  {k:'peta',n:'Advanced Taming Marks',g:'Pets',p:15000,d:[3,5]},
  {k:'petc',n:'Common Taming Marks',g:'Pets',p:1150,d:[3,5]},
  {k:'pet',n:'Pet Advancement score',g:'Pets',p:50,d:[3,5],h:'Score gained by advancing pets'},
  {k:'ggc',n:'Charm Score',g:'Governor',p:70,d:[1,3,4],h:'From your Charms plan'},
  {k:'gg',n:'Governor Gear Score',g:'Governor',p:36,d:[5],h:'From your Governor Gear materials'},
  {k:'trn',n:'Troops to train',g:'Troops & missions',p:0,d:[4],h:'Count of troops trained on day 4'},
  {k:'intel',n:'Intel missions a day',g:'Troops & missions',p:6000,d:[1,3,5],h:'Count each of days 1, 3 and 5'}];
const TK={};T.forEach(t=>TK[t.k]=t);
const GROUPS=[...new Set(T.map(t=>t.g))];

/* ---------- state ---------- */
const KEY='ks-kvk-v1';
const blank=()=>({inv:Object.fromEntries(T.map(t=>[t.k,0])),tlv:10,start:'',src:{}});
function clean(o){const s=blank();o=o||{};const inv=o.inv||{};
  T.forEach(t=>{s.inv[t.k]=Math.max(0,+inv[t.k]||0);});
  s.tlv=Math.max(1,Math.min(11,Math.floor(+o.tlv||10)));
  s.start=/^\d{4}-\d{2}-\d{2}$/.test(o.start||'')?o.start:'';
  s.src=o.src&&typeof o.src==='object'?Object.fromEntries(Object.entries(o.src).filter(([k,v])=>TK[k]&&typeof v==='string').map(([k,v])=>[k,v.slice(0,40)])):{};
  return s;}
let st;try{st=clean(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(e){st=blank();}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};

/* ---------- Governor Gear score from levels + materials ---------- */
const GOV=(window.GOV_RAW||'').split('\n').filter(Boolean).map(l=>{const p=l.split('|');return {satin:+p[1],gt:+p[2],av:+p[3],ev:+p[6]||0};});
const GN=GOV.length,G_STEP=26,G_PMAX=G_STEP+5*(GN-G_STEP);
const gPos=(L,s)=>L<0?0:(L<G_STEP-1?L+1:G_STEP+5*(L-(G_STEP-1))+(L<GN-1?Math.max(0,Math.min(4,s|0)):0));
function gBuy(p){const k=p<=G_STEP?p-1:G_STEP-1+Math.ceil((p-G_STEP)/5),d=p<=G_STEP?1:5,r=GOV[k];return {satin:r.satin/d,gt:r.gt/d,av:r.av/d,ev:r.ev/d};}
function govScore(pos,inv){
  pos=pos.slice();const rem={satin:+inv.satin||0,gt:+inv.gt||0,av:+inv.av||0},s0={...rem};let score=0,n=0;
  const price=b=>['satin','gt','av'].reduce((a,k)=>a+(b[k]?(s0[k]>0?b[k]/s0[k]:1e9):0),0);
  for(let guard=0;guard<2000;guard++){let bi=-1,bv=-1,bb=null;
    pos.forEach((p,i)=>{if(p>=G_PMAX)return;const b=gBuy(p+1);if(b.satin>rem.satin+1e-9||b.gt>rem.gt+1e-9||b.av>rem.av+1e-9)return;
      const v=b.ev/Math.max(price(b),1e-12);if(v>bv*(1+1e-9)||(bi>=0&&v>=bv*(1-1e-9)&&p<pos[bi])){bv=v;bi=i;bb=b;}});
    if(bi<0)break;rem.satin-=bb.satin;rem.gt-=bb.gt;rem.av-=bb.av;score+=bb.ev;pos[bi]++;n++;}
  return {score:Math.round(score),n};}

/* ---------- imports ---------- */
const b64json=s=>JSON.parse(decodeURIComponent(atob(s.replace(/\s+/g,''))));
const b64jsonU=s=>JSON.parse(decodeURIComponent(escape(atob(s.replace(/\s+/g,'')))));
function fromHeroGear(fh,mith,src){const out={};if(fh>0)out.ham=fh;if(mith>0)out.mith=mith;return {vals:out,src};}
function fromGov(pieces,inv,src){
  if(!pieces||!inv)return null;const r=govScore(pieces,inv);
  return {vals:{gg:r.score},src,extra:r.n?`${r.n} purchases`:'materials buy no upgrade yet'};}
function fromCharms(o,src){const c=CH.clean(o);const p=CH.optimize(c.cur,c,CH.weightsFor(c.f));return {vals:{ggc:Math.round(p.score)},src};}
function fromTruegold(o,src){const out={};if(+o.tg>0)out.tg=+o.tg;if(+o.ttg>0)out.tgt=+o.ttg;return {vals:out,src};}
function readCode(txt){
  const raw=String(txt||'').trim().replace(/^.*#/,'');
  const m=raw.match(/^(KSK1|KGO|GOV|KSC1|KST1):/i);
  if(!m)throw new Error('Paste a code starting with KSK1:, KGO:, GOV:, KSC1: or KST1:');
  const body=raw.slice(m[0].length),kind=m[1].toUpperCase();
  try{
    if(kind==='KSK1')return {whole:clean(b64jsonU(body))};
    if(kind==='KGO'){const j=b64json(body);const r=Array.isArray(j.r)?j.r:[];return fromHeroGear(+r[0]||0,+r[1]||0,'Hero Gear code');}
    if(kind==='GOV'){const j=b64json(body);if(!j.g)throw 0;
      const pieces=Object.values(j.g).map(v=>gPos(+v[0],+v[1]));const r=Array.isArray(j.r)?j.r:[];
      return fromGov(pieces,{satin:+r[0]||0,gt:+r[1]||0,av:+r[2]||0},'Governor Gear code');}
    if(kind==='KSC1')return fromCharms(CH.decode(raw),'Charms code');
    if(kind==='KST1')return fromTruegold(b64jsonU(body),'Truegold code');
  }catch(e){throw new Error('This code is damaged. Copy it again in full.');}}
function fromPages(){
  const got=[],ls=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
  const h=ls('hgp-state-v3');if(h&&(h.fh||h.mith))got.push(fromHeroGear(+h.fh||0,+h.mith||0,'Hero Gear page'));
  const g=ls('hgp-gov-v1');if(g&&Array.isArray(g.pieces)&&g.inv)got.push(fromGov(g.pieces.map(x=>+x.cur||0),g.inv,'Governor Gear page'));
  const c=CH.loadSaved();if(c)got.push(fromCharms(c,'Charms page'));
  const t=ls('ks-truegold-v1');if(t)got.push(fromTruegold(t,'Truegold page'));
  return got.filter(Boolean);}
function apply(r){Object.entries(r.vals).forEach(([k,v])=>{st.inv[k]=v;st.src[k]=r.src;});}

/* ---------- plan ---------- */
function units(t){return t.k==='trn'?Math.floor(st.inv.trn):Math.round((st.inv[t.k]||0)*(t.mul||1));}
function ptsOf(t){return t.k==='trn'?TROOP_PTS[st.tlv-1]:t.p;}
function plan(){
  const pts=[0,0,0,0,0,0],use=[null,{},{},{},{},{}];
  const add=(d,k,n)=>{if(n<=0)return;const t=TK[k];use[d][k]=(use[d][k]||0)+n;pts[d]+=n*ptsOf(t);};
  const flex=[];
  T.forEach(t=>{const n=units(t);if(!n||!ptsOf(t))return;
    if(t.k==='intel'){t.d.forEach(d=>add(d,'intel',n));return;}
    if(t.d.length===1){add(t.d[0],t.k,n);return;}
    flex.push({t,left:n,u:ptsOf(t)});});
  /* reach milestone 1 on every day it can be reached, then 2, then 3 */
  for(let m=0;m<3;m++){
    const order=[1,2,3,4,5].sort((a,b)=>(DAYS[a].ms[m]-pts[a])-(DAYS[b].ms[m]-pts[b]));
    order.forEach(d=>{let gap=DAYS[d].ms[m]-pts[d];if(gap<=0)return;
      const cands=flex.filter(f=>f.left>0&&f.t.d.includes(d));
      if(cands.reduce((a,f)=>a+f.left*f.u,0)<gap)return;   /* can't make it: keep items for other days */
      cands.sort((a,b)=>a.t.d.length-b.t.d.length||b.u-a.u);
      /* big items first, then top up with the smallest one so little is wasted */
      for(const f of cands){if(gap<=0)break;const n=Math.min(f.left,Math.floor(gap/f.u));if(n>0){add(d,f.t.k,n);f.left-=n;gap-=n*f.u;}}
      if(gap>0){const f=cands.filter(f=>f.left>0).sort((a,b)=>a.u-b.u)[0];if(f){const n=Math.min(f.left,Math.ceil(gap/f.u));add(d,f.t.k,n);f.left-=n;gap-=n*f.u;}}});}
  /* what's left: to the day with the fewest points */
  flex.sort((a,b)=>b.left*b.u-a.left*a.u).forEach(f=>{if(f.left<=0)return;const d=f.t.d.slice().sort((a,b)=>pts[a]-pts[b])[0];add(d,f.t.k,f.left);f.left=0;});
  return {pts,use};}

/* ---------- render ---------- */
function buildInputs(){
  $('groups').innerHTML=GROUPS.map(g=>`<h3 class="sub">${g}</h3><div class="res">${T.filter(t=>t.g===g).map(t=>{
    const extra=t.k==='trn'?`<label class="field"><span class="label">Troop level</span><select id="i-tlv">${TROOP_PTS.map((p,i)=>`<option value="${i+1}">Level ${i+1} · ${p} pts</option>`).join('')}</select></label>`:'';
    return `<label class="field"><span class="label">${t.n}</span><input id="i-${t.k}" data-k="${t.k}" type="number" min="0" step="${t.step||1}">
      <span class="hint" id="h-${t.k}"></span></label>${extra}`;}).join('')}</div>`).join('');
  const tb=$('ptab').querySelector('tbody');
  tb.innerHTML=T.filter(t=>t.k!=='trn').map(t=>`<tr><td>${t.n}</td><td class="r">${fmt(t.p)}${t.u?' / min':''}</td><td>${t.d.join(', ')}</td></tr>`).join('')
    +`<tr><td>Train 1 troop, level 1 → 11</td><td class="r">${TROOP_PTS.join(' · ')}</td><td>4</td></tr>`;}
function writeInputs(){
  T.forEach(t=>{const el=$('i-'+t.k);el.value=st.inv[t.k]||'';
    const h=$('h-'+t.k);h.innerHTML=(st.src[t.k]?`<b class="kv-from">From ${esc(st.src[t.k])}</b> · `:'')+[t.u?'In days':'',t.h?esc(t.h):''].filter(Boolean).join(' · ');});
  $('i-tlv').value=st.tlv;$('r-start').value=st.start;}
const dayDate=d=>{if(!st.start)return '';const x=new Date(st.start+'T00:00:00');x.setDate(x.getDate()+d-1);
  return x.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});};
function qtyTxt(t,n){
  if(t.mul===1440){const dd=n/1440;return dd>=1?`${+dd.toFixed(1)} days`:n>=60?`${+(n/60).toFixed(1)} h`:`${n} min`;}
  if(t.k==='trn')return `${fmt(n)} level ${st.tlv} troops`;
  if(t.k==='intel')return `${fmt(n)} missions`;
  return fmt(n);}
function render(){
  const p=plan();let total=0,ms=0,best=1;
  const cards=[1,2,3,4,5].map(d=>{
    const D=DAYS[d],pt=p.pts[d];total+=pt;if(pt>p.pts[best])best=d;
    const hit=D.ms.filter(x=>pt>=x).length;ms+=hit;
    const top=D.ms[2]*1.08,bar=Math.min(100,pt/top*100);
    const rows=Object.entries(p.use[d]).map(([k,n])=>({t:TK[k],n,pts:n*ptsOf(TK[k])})).sort((a,b)=>b.pts-a.pts)
      .map(r=>`<li><span>${r.t.n}</span><span class="kv-q">${qtyTxt(r.t,r.n)}</span><span class="kv-p">${big(r.pts)}</span></li>`).join('');
    const next=D.ms.find(x=>pt<x);
    return `<article class="kv-day${hit===3?' done':''}">
      <div class="kv-dh"><span class="kv-dn">Day ${d}</span><b>${D.n}</b><span class="kv-dd">${dayDate(d)}</span><span class="kv-tot">${big(pt)}</span></div>
      <div class="kv-bar" role="img" aria-label="${fmt(pt)} points, ${hit} of 3 milestones"><i style="width:${bar.toFixed(1)}%"></i>
        ${D.ms.map((x,i)=>`<span class="kv-m${pt>=x?' on':''}" style="left:${(x/top*100).toFixed(1)}%" title="Milestone ${i+1}: ${fmt(x)}"><em>M${i+1}</em></span>`).join('')}</div>
      <p class="kv-ms">${hit===3?'All 3 milestones':`${hit} of 3 milestones`}${next?` · ${fmt(next-pt)} more for M${D.ms.indexOf(next)+1}`:''}</p>
      ${rows?`<ul class="kv-use">${rows}</ul>`:'<p class="kv-none">Nothing from your backpack scores today.</p>'}
    </article>`;});
  $('days').innerHTML=cards.join('');
  $('s-pts').textContent=total?big(total):'—';$('s-ms').textContent=total?ms:'—';
  $('s-best').textContent=total?'Day '+best:'—';$('s-best2').textContent=total?DAYS[best].n:'';
  const notes=[];
  if(!total)notes.push('<p>Fill in your backpack in step 1, or press <b>Use my KS Tools pages</b> to bring in your plans.</p>');
  else{
    if(!st.inv.ggc)notes.push('<p>No Charm Score yet: plan your charms on the <a href="../charms/">Charms page</a>, it scores on days 1, 3 and 4.</p>');
    if(!st.inv.gg)notes.push('<p>No Governor Gear Score yet: enter your gear and materials on the <a href="../governor-gear/">Governor Gear page</a>, it scores on day 5.</p>');
    if(st.inv.tg||st.inv.tgt)notes.push('<p>Truegold counts only when spent on building upgrades: start them on the day shown, with your speedups ready.</p>');
    if(st.inv.intel)notes.push('<p>Intel missions are counted on days 1, 3 and 5 at the number you entered for each day.</p>');}
  $('notes').innerHTML=notes.join('');$('notes').hidden=!notes.length;
  if(document.activeElement!==$('code'))$('code').value=exportCode();
  save();}

/* ---------- code ---------- */
const exportCode=()=>'KSK1:'+btoa(unescape(encodeURIComponent(JSON.stringify({inv:Object.fromEntries(Object.entries(st.inv).filter(([,v])=>v)),tlv:st.tlv,start:st.start,src:st.src})))).replace(/=+$/,'');

/* ---------- events ---------- */
const say=(t,c)=>{const m=$('msg');m.textContent=t;m.className='msg '+c;};
function showSrcs(list){$('srcs').innerHTML=list.map(r=>{const v=Object.entries(r.vals).map(([k,n])=>`${TK[k].n} ${fmt(n)}`).join(', ');
  return `<span class="chip">${esc(r.src)}</span> ${v||'nothing to add'}${r.extra?` <small>(${esc(r.extra)})</small>`:''}`;}).map(x=>`<p>${x}</p>`).join('');}
$('groups').addEventListener('input',e=>{const k=e.target.dataset.k;if(!k)return;st.inv[k]=Math.max(0,+e.target.value||0);delete st.src[k];
  const h=$('h-'+k),t=TK[k];h.innerHTML=[t.u?'In days':'',t.h?esc(t.h):''].filter(Boolean).join(' · ');render();});
$('groups').addEventListener('change',e=>{if(e.target.id==='i-tlv'){st.tlv=+e.target.value;render();}});
$('r-start').addEventListener('change',()=>{st.start=$('r-start').value;render();});
$('btn-pages').addEventListener('click',()=>{const got=fromPages();
  if(!got.length){say('Nothing found yet. Fill in the Hero Gear, Governor Gear, Charms or Truegold pages in this browser first.','err');return;}
  got.forEach(apply);writeInputs();render();showSrcs(got);say(`Brought in ${got.map(g=>g.src).join(', ')}.`,'ok');});
$('btn-import').addEventListener('click',()=>{try{const r=readCode($('code').value);
  if(r.whole){st=r.whole;$('srcs').innerHTML='';writeInputs();render();say('KvK code imported.','ok');return;}
  apply(r);writeInputs();render();showSrcs([r]);say(`Imported the ${r.src}.`,'ok');}catch(e){say(e.message,'err');}});
const copy=(txt,ok)=>{const sel=()=>{$('code').value=exportCode();$('code').focus();$('code').select();say('Copy the code from the box above.','ok');};
  if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>say(ok,'ok'),sel);else sel();};
$('btn-export').addEventListener('click',()=>copy(exportCode(),'Code copied.'));
$('btn-link').addEventListener('click',()=>copy(location.href.split('#')[0]+'#'+exportCode(),'Link copied. Opening it loads this backpack.'));
$('btn-clear').addEventListener('click',()=>{if(!confirm('Clear your KvK backpack?'))return;st=blank();$('srcs').innerHTML='';writeInputs();render();say('Cleared.','ok');});
function fromHash(){const h=decodeURIComponent(location.hash.slice(1));if(!/^KSK1:/i.test(h))return;
  try{const r=readCode(h);st=r.whole;history.replaceState(null,'',location.pathname);}catch(e){say(e.message,'err');}}
window.addEventListener('hashchange',()=>{fromHash();writeInputs();render();});

buildInputs();fromHash();writeInputs();render();
})();
