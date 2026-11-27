(function(){
const {$,fmt,pct,esc,KEYS}=KS;
const C=window.CH;

/* ---------- state ---------- */
const EXAMPLE={cur:[11,11,10,9,9,9, 10,10,10,8,8,8, 9,9,9,7,7,7].map(l=>C.posOf(l,0)),g:2400,d:3100,m:'stats',tp:0,x:0};
let st,isExample=false;
/* your saved charms, or the example until you edit */
function loadSaved(){const s=C.loadSaved();st=s||C.clean(EXAMPLE);isExample=!s;}
loadSaved();
const save=()=>{if(!isExample)KS.write(KEYS.charms,st);};
let showAll=false,plan=null;

/* ---------- inputs ---------- */
const lvOpts=sel=>Array.from({length:C.MAXL+1},(_,l)=>`<option value="${l}"${l===sel?' selected':''}>Lv ${l}</option>`).join('');
/* one dropdown per charm: every purchase, "9 · 2/5" (level · stage) for levels bought in 5 stages */
const POS_OPTS=Array.from({length:C.PMAX+1},(_,p)=>{const {l,s}=C.lvAt(p);return `<option value="${p}">${l>=C.STEP_L&&l<C.MAXL?`${l} · ${s}/5`:`Lv ${l}`}</option>`;}).join('');
/* laid out like the game's Governor Gear screen: gear pieces on both sides (Hood, Cloak, Ring on the left;
   Charmstone, Breeches, Staff on the right), the picked piece's 3 charms on a ring in the middle, and the picked
   charm's stage bar, power, stat bonuses and next upgrade cost below */
const IMG_SLOT={Hood:1,Charmstone:2,Cloak:3,Breeches:4,Ring:5,Staff:6};
let selP=0,selC=0;
function pieceBtn(pi){const pc=C.PIECES[pi];
  return `<button type="button" class="cg-pc" data-p="${pi}" aria-label="${pc.n}, ${C.TROOP[pc.t]} charms"><img class="cg-gear" src="../assets/gear/${IMG_SLOT[pc.n]}005.png" alt="">
    <span class="cg-mini">${[0,1,2].map(k=>`<img data-mi="${pi*3+k}" alt="">`).join('')}</span><span class="cg-lvs" data-lvs="${pi}"></span></button>`;}
function buildPieces(){
  $('pieces').innerHTML=`<div class="cg"><div class="cg-side">${[0,2,4].map(pieceBtn).join('')}</div>
    <div class="cg-mid"><p class="cg-name" id="cg-name"></p><div class="cg-ring">${[0,1,2].map(k=>`<div class="cg-ch k${k}" data-k="${k}">
      <button type="button" class="cg-chb" data-k="${k}"><img alt=""></button><select class="pos" data-k="${k}">${POS_OPTS}</select></div>`).join('')}</div></div>
    <div class="cg-side">${[1,3,5].map(pieceBtn).join('')}</div></div>
    <div class="cg-det" id="cg-det"></div>`;
  $('all-l').innerHTML=lvOpts(10);}
function drawCharms(){
  document.querySelectorAll('.cg-pc').forEach(b=>{const pi=+b.dataset.p;b.classList.toggle('on',pi===selP);b.setAttribute('aria-pressed',pi===selP?'true':'false');
    b.querySelectorAll('[data-mi]').forEach(im=>{const i=+im.dataset.mi,{l}=C.lvAt(st.cur[i]);im.src=C.img(C.troopOf(i),l);im.classList.toggle('off',l===0);});
    b.querySelector('.cg-lvs').textContent=[0,1,2].map(k=>C.lvAt(st.cur[pi*3+k]).l).join(' ');});
  const pc=C.PIECES[selP];$('cg-name').innerHTML=`<b>${pc.n}</b> ${C.TROOP[pc.t]}`;
  document.querySelectorAll('.cg-ch').forEach(el=>{const k=+el.dataset.k,i=selP*3+k,{l}=C.lvAt(st.cur[i]);
    el.classList.toggle('on',k===selC);const im=el.querySelector('img');im.src=C.img(pc.t,l);im.classList.toggle('off',l===0);
    const so=el.querySelector('select');so.value=st.cur[i];so.setAttribute('aria-label',`${pc.n} charm ${k+1} level`);
    el.querySelector('button').setAttribute('aria-label',`Show ${pc.n} charm ${k+1}`);});
  const i=selP*3+selC,p=st.cur[i],{l,s}=C.lvAt(p),T=C.TROOP[pc.t],now=C.CUM[p];
  const staged=l>=C.STEP_L&&l<C.MAXL;
  const bar=staged?`<div class="cg-bar" role="group" aria-label="Stage toward Lv ${l+1}">${[1,2,3,4,5].map(j=>`<button type="button" data-s="${j-1}" class="${j<=s+1?'on':''}" aria-label="${j-1} of 5 done"></button>`).join('')}</div>
    <p class="cg-sub">Lv ${l} · ${s}/5 toward Lv ${l+1}: click the bar to set it</p>`:'';
  let rows;
  if(p>=C.PMAX)rows=`<p class="cg-sub">Max level. ${T} Lethality and Health +${now.stat.toFixed(2)}%</p>`;
  else{const b=C.buy(p+1),nx=(now.stat+b.stat).toFixed(2),ok=(h,n)=>h>=n?'':' short';
    rows=`<div class="cg-pw">Power <b>${fmt(now.pw)}</b> <span class="up">+${fmt(b.pw)}</span></div>
    <table class="cg-st"><tbody><tr><td>${T} Lethality</td><td>+${now.stat.toFixed(2)}%</td><td>→</td><td class="up">+${nx}%</td></tr>
      <tr><td>${T} Health</td><td>+${now.stat.toFixed(2)}%</td><td>→</td><td class="up">+${nx}%</td></tr></tbody></table>
    <div class="cg-cost"><span class="label">Upgrade cost</span><span class="${ok(st.g,b.g)}">Guides ${fmt(st.g)}/${fmt(b.g)}</span><span class="${ok(st.d,b.d)}">Designs ${fmt(st.d)}/${fmt(b.d)}</span></div>`;}
  $('cg-det').innerHTML=`<p class="cg-title">${pc.n} charm ${selC+1} · <b>Lv ${l}</b></p>${bar}${rows}`;}
function writeInputs(){
  $('r-g').value=st.g||'';$('r-d').value=st.d||'';$('r-x').value=st.x;$('r-tp').value=st.tp||'';
  document.querySelectorAll('#mode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===st.m?'true':'false'));
  $('tp-box').hidden=st.m!=='score';
  $('wt-box').classList.toggle('dim',st.m==='score');
  $('mode-foot').textContent=st.m==='score'?'Picks by Charm Score (70 KvK points each). It often pushes a few charms very high: good for points, not the best for your account. Formations are ignored.':'Picks the upgrades that add the most Lethality and Health for your materials.';
  $('w-prof').value=st.prof;$('w-for').value=st.for;$('w-mix').value=st.mix;
  ['I','C','A'].forEach(t=>{$('fa-'+t).value=st.att[t];$('fd-'+t).value=st.def[t];});
  $('mixf').hidden=st.for!=='mix';
  drawCharms();}

/* ---------- render ---------- */
function tile(i,from,to){
  const t=C.troopOf(i),b=C.lvAt(to),up=to>from;
  const lbl=p=>{const {l,s}=C.lvAt(p);return `Lv.${l}<small>${s?s+'/5':'&nbsp;'}</small>`;};
  return `<div class="ch-tile${up?' up':''}${b.l===0?' off':''}" title="${C.PIECES[Math.floor(i/3)].n} charm ${i%3+1}: ${C.lvName(from)}${up?' → '+C.lvName(to):''}">
    <img src="${C.img(t,b.l)}" alt="" loading="lazy"><span class="ch-lv">${lbl(to)}</span></div>`;}
/* ---------- shop packs ----------
   Charm Master's Collection: 5 levels bought in order ($5, $10, $20, $50, $100), one of 3 chests per level.
   Charm Design Pack and Charm Craftsman Pack: $5, $10, $20, $50, then $100 up to 20 times, bought in order.
   Every pack gives its price ÷ 5 times the $5 contents (same rules as Governor Gear).
   Packs you "Try" are added to your materials in the plan above (not saved). */
const MASTER=[5,10,20,50,100],REG=[5,10,20,50],CHEST={A:{g:30,d:30},B:{g:20,d:40},C:{g:40,d:20}};
const PACK={des:{n:'Charm Design Pack',g:0,d:16},cra:{n:'Charm Craftsman Pack',g:24,d:8}};
const defCart=()=>({m:[null,null,null,null,null],des:0,cra:0});
let cart=defCart(),shopTab='m',lastM=null,shopCache=new Map(),shopSig='',shopTmr=null;
const mLevels=()=>MASTER.map((p,k)=>({p,k})).filter(x=>!st.mc[x.k]);
const chestAdd=(id,p)=>({g:CHEST[id].g*p/5,d:CHEST[id].d*p/5});
const packAdd=(k,p)=>({g:PACK[k].g*p/5,d:PACK[k].d*p/5});
const plus=(a,b)=>({g:a.g+b.g,d:a.d+b.d});
const ZERO={g:0,d:0};
/* the packs still to buy, in order */
function regQueue(k){const b=st[k],q=[];REG.forEach((p,i)=>{if(!b[i])q.push({label:'$'+p,price:p});});
  for(let j=b[4]||0;j<20;j++)q.push({label:`$100 · ${j+1}/20`,price:100});return q;}
function cartParts(){
  const m={g:0,d:0,spent:0,desc:[]};
  for(const x of mLevels()){const c=cart.m[x.k];if(!c)break;const a=chestAdd(c,x.p);m.g+=a.g;m.d+=a.d;m.spent+=x.p;m.desc.push(`$${x.p} ${c}`);}
  const reg=k=>{const q=regQueue(k).slice(0,cart[k]),r={g:0,d:0,spent:0,n:q.length,last:q.length?q[q.length-1].label:''};
    q.forEach(pk=>{const a=packAdd(k,pk.price);r.g+=a.g;r.d+=a.d;r.spent+=pk.price;});return r;};
  const des=reg('des'),cra=reg('cra');
  return {m,des,cra,g:m.g+des.g+cra.g,d:m.d+des.d+cra.d,spent:m.spent+des.spent+cra.spent};}
/* one number to compare plans: KvK Charm Score, or Lethality/Health weighted by your formations */
function valOf(pl){if(st.m==='score')return pl.score;const W=C.weightsOf(st),ws=W.I+W.C+W.A||1;return ['I','C','A'].reduce((a,t)=>a+pl.stat[t]*W[t],0)/ws;}
/* plan with extra materials; cached until your charms, materials, goal or formations change */
function shopScore(add){
  const sig=JSON.stringify([st.cur,st.g,st.d,st.m,st.tp,st.x,st.prof,st.att,st.def,st.mix,st.for]);
  if(sig!==shopSig){shopSig=sig;shopCache=new Map();}
  const key=add.g+'|'+add.d;if(shopCache.has(key))return shopCache.get(key);
  const pl=C.planFor({...st,g:st.g+add.g,d:st.d+add.d}),v={val:valOf(pl),pl,add};shopCache.set(key,v);return v;}
/* the best chests for each budget: every combination (3, 9, 27, 81, 243 options), on top of the other packs you try */
function masterPaths(baseAdd){
  const lv=mLevels(),base=shopScore(baseAdd);
  const better=(s,b)=>!b||s.val>b.s.val+1e-9||(Math.abs(s.val-b.s.val)<=1e-9&&(s.pl.power>b.s.pl.power||(s.pl.power===b.s.pl.power&&s.add.d>b.s.add.d)));
  const rows=[];let spent=0,prev=base;
  for(let n=1;n<=lv.length;n++){spent+=lv[n-1].p;let best=null;
    for(let c=0;c<3**n;c++){let x=c,a=baseAdd;const ch=[];
      for(let j=0;j<n;j++){const id='ABC'[x%3];x=Math.floor(x/3);ch.push(id);a=plus(a,chestAdd(id,lv[j].p));}
      const s=shopScore(a);if(better(s,best))best={ch,s};}
    let s=best.s;if(s.val<prev.val)s=prev;
    rows.push({n,lv:lv.slice(0,n),spent,ch:best.ch,s,dv:s.val-base.val,marg:s.val-prev.val});prev=s;}
  return {rows,base,lv};}
/* a regular pack: each next one in the queue, on top of the other packs you try */
function regRows(k,baseAdd){
  const base=shopScore(baseAdd);let a=baseAdd,spent=0,prev=base;const rows=[];
  for(const pk of regQueue(k)){spent+=pk.price;const gets=packAdd(k,pk.price);a=plus(a,gets);
    let s=shopScore(a);if(s.val<prev.val)s=prev;
    rows.push({pk,spent,gets,s,dv:s.val-base.val,marg:s.val-prev.val});prev=s;}
  return {rows,base};}
/* what packs add on top of your own plan */
function diffTxt(s,b){
  const st3=['I','C','A'].map(t=>[t,s.pl.stat[t]-b.pl.stat[t]]).filter(([,v])=>Math.abs(v)>1e-9);   /* more materials can move upgrades between troops: show both ways */
  return {stat:st3.length?st3.map(([t,v])=>`${C.TROOP[t].slice(0,t==='A'?4:3)} ${v>0?'+':'−'}${pct(Math.abs(v))}%`).join(' · '):'—',
    pts:Math.round((s.pl.score-b.pl.score)*C.KVK_PTS),pw:s.pl.power-b.pl.power};}
const gainCells=(s,b)=>{const t=diffTxt(s,b);return `<td class="r">${t.stat}</td><td class="r">${t.pts?(t.pts>0?'+':'−')+fmt(Math.abs(t.pts)):'—'}</td><td class="r">${t.pw?(t.pw>0?'+':'−')+fmt(Math.abs(t.pw)):'—'}</td>`;};
const matTxt=a=>[a.g?`${fmt(a.g)} Guides`:'',a.d?`${fmt(a.d)} Designs`:''].filter(Boolean).join(' · ');
const chipsOf=ch=>ch.map(c=>`<span class="cchip c${c}">${c}</span>`).join('');
function verdict(rows,base,first){
  const v=first?[first]:[],useful=rows.filter(r=>r.marg>1e-9);
  if(!rows.length)return '<p>You bought everything here.</p>';
  if(!st.g&&!st.d&&st.cur.every(p=>!p))return '<p>Enter your charms and materials above to see which packs help you most.</p>';
  if(!useful.length)return '<p><b>Nothing here improves your plan right now.</b></p>';
  const f=useful[0],best=useful.reduce((a,b)=>b.dv/b.spent>a.dv/a.spent?b:a),last=useful[useful.length-1],bt=diffTxt(best.s,base);
  if(f!==rows[0])v.push(`<p><b>First payoff at $${fmt(f.spent)}:</b> buying less adds nothing yet.</p>`);
  v.push(`<p><b>Best value: stop at $${fmt(best.spent)}</b> for ${bt.stat} and +${fmt(bt.pts)} KvK points.</p>`);
  if(last!==rows[rows.length-1])v.push(`<p><b>Nothing more after $${fmt(last.spent)}:</b> the next packs add materials your plan can't use yet.</p>`);
  return v.join('');}
function renderCart(c){const el=$('cart');el.hidden=!c.spent;if(!c.spent)return;
  const bits=[];if(c.m.spent)bits.push(`Master's Collection ${c.m.desc.join(', ')}`);
  for(const k of ['des','cra'])if(c[k].n)bits.push(`${PACK[k].n} up to ${c[k].last}`);
  el.innerHTML=`<div><b>Trying packs worth $${fmt(c.spent)}:</b> ${bits.join(' · ')}<span class="unl">Adds ${matTxt(c)}. The plan below includes them.</span></div><button type="button" class="cart-clear">Clear selection</button>`;}
function renderShop(){
  const c=cartParts();
  MASTER.forEach((_,k)=>{$('m-'+k).checked=st.mc[k];});
  for(const k of ['des','cra']){REG.forEach((_,i)=>{$(k+'-'+i).checked=!!st[k][i];});if(document.activeElement!==$(k+'-4'))$(k+'-4').value=st[k][4];}
  document.querySelectorAll('#shop-tabs [role=tab]').forEach(b=>{const on=b.dataset.tab===shopTab;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});
  ['m','des','cra'].forEach(t=>{$('tp-'+t).hidden=t!==shopTab;});
  $('shop-unit').textContent=(st.m==='score'?'Gains on top of your plan, for your goal: Most KvK points.':'Gains on top of your plan, for your goal: Most stats (Lethality and Health, weighted by your formations).')+' Packs you try on the other tabs count as already bought here.';
  if(shopTab==='m'){
    const M=masterPaths(plus(c.des,c.cra));lastM=M;
    const sel=M.lv.map(x=>cart.m[x.k]);let selN=0;while(selN<sel.length&&sel[selN])selN++;
    $('m-table').querySelector('tbody').innerHTML=M.rows.length?M.rows.map(r=>{
      const on=selN===r.n&&r.ch.every((ch,j)=>sel[j]===ch);
      return `<tr class="${on?'sel':''} ${r.marg<=1e-9?'zero':''}"><td>${r.n===1?`$${r.lv[0].p} only`:`$${r.lv[0].p} to $${r.lv[r.n-1].p}`}</td>
        <td class="r">$${fmt(r.spent)}</td><td><span class="cchips">${chipsOf(r.ch)}</span></td>${gainCells(r.s,M.base)}
        <td class="r"><button type="button" class="selbtn" data-m="${r.n}" aria-pressed="${on}">${on?'Trying':'Try'}</button></td></tr>`;}).join('')
      :'<tr><td colspan="7">You opened every level.</td></tr>';
    $('m-pick').innerHTML=M.lv.map((x,j)=>`<div class="lvpick"><span class="label">$${x.p}</span><div class="seg" role="group" aria-label="Chest for the $${x.p} level">${['','A','B','C'].map(ch=>`<button type="button" data-k="${x.k}" data-j="${j}" data-c="${ch}" aria-pressed="${(sel[j]||'')===ch}">${ch||'None'}</button>`).join('')}</div></div>`).join('');
    let selTxt='Pick a chest for each level to see what your own choice gives.';
    if(selN){const s=shopScore(plus(M.base.add,c.m)),t=diffTxt(s,M.base),best=M.rows[selN-1],bt=diffTxt(best.s,M.base);
      selTxt=`<b>Your picks</b> ($${fmt(c.m.spent)}): ${s.val-M.base.val>1e-9?`${t.stat}, +${fmt(t.pts)} KvK points`:'no gain yet'}${best.s.val-s.val>1e-9?`. The best mix for this budget (${best.ch.join(' · ')}) gives ${bt.stat}, +${fmt(bt.pts)} points.`:'. That is the best mix for this budget.'}`;}
    $('m-selgain').innerHTML=selTxt;
    const full=M.rows[M.rows.length-1];
    $('m-verdict').innerHTML=verdict(M.rows,M.base,full&&`<p><b>Buying all ${M.lv.length} level${M.lv.length>1?'s':''} ($${fmt(full.spent)}):</b> ${full.ch.map((ch,j)=>`$${M.lv[j].p} Chest ${ch}`).join(', ')}.</p>`);
  } else {
    const k=shopTab,other=k==='des'?c.cra:c.des,{rows,base}=regRows(k,plus(c.m,other));
    $(k+'-table').querySelector('tbody').innerHTML=rows.length?rows.map((r,i)=>{const on=i<cart[k];
      return `<tr class="${on?'sel':''} ${r.marg<=1e-9?'zero':''}"><td>${r.pk.label}</td><td class="r">$${fmt(r.spent)}</td><td class="r">${matTxt(r.gets)}</td>${gainCells(r.s,base)}
        <td class="r"><button type="button" class="selbtn" data-kind="${k}" data-r="${i+1}" aria-pressed="${on}">${on?'Trying':'Try'}</button></td></tr>`;}).join('')
      :'<tr><td colspan="7">You bought every pack this week.</td></tr>';
    $(k+'-verdict').innerHTML=verdict(rows,base);}
}
/* the shop tests up to 363 plans: run it once you stop typing */
const queueShop=()=>{clearTimeout(shopTmr);shopTmr=setTimeout(renderShop,250);};

function render(){
  const cp=cartParts();
  plan=C.planFor({...st,g:st.g+cp.g,d:st.d+cp.d});
  renderCart(cp);queueShop();
  const sumF=f=>f.I+f.C+f.A;
  $('fs-att').textContent=sumF(st.att)===100?'':`Adds up to ${sumF(st.att)}%: read as shares`;
  $('fs-def').textContent=sumF(st.def)===100?'':`Adds up to ${sumF(st.def)}%: read as shares`;
  $('mix-o').textContent=`${st.mix}% attack · ${100-st.mix}% defense`;
  const W=C.weightsOf(st),ws=W.I+W.C+W.A;
  $('wout').innerHTML=ws>0?`Each % of charm bonus is worth: ${['I','C','A'].map(t=>`<b>${C.TROOP[t]} ${Math.round(W[t]/ws*100)}%</b>`).join(' · ')}`:'All your formations are 0%: add troops.';
  const pts=Math.round(plan.score*C.KVK_PTS),ug=st.g+cp.g-plan.left.g,ud=st.d+cp.d-plan.left.d;
  $('s-pw').textContent=plan.power?'+'+fmt(plan.power):'—';$('s-pw2').textContent=plan.steps.length?`${plan.steps.reduce((a,s)=>a+s.to-s.from,0)} upgrades`:'';
  $('s-kvk').textContent=pts?fmt(pts):'—';$('s-kvk2').textContent=plan.score?`Charm Score +${fmt(plan.score)}`:'';
  $('s-mat').innerHTML=plan.steps.length?`${fmt(ug)} <small>Guides</small><br>${fmt(ud)} <small>Designs</small>`:'—';
  $('s-mat2').textContent=`Left: ${fmt(plan.left.g)} · ${fmt(plan.left.d)}`;
  $('gains').innerHTML=['I','C','A'].map(t=>{const d=plan.stat[t];
    return `<div class="ch-gain${d>0?' up':''}"><span class="label">${C.TROOP[t]}</span>${d>0?`<b>Lethality +${pct(d)}%</b><b>Health +${pct(d)}%</b>`:'<b class="no">No change</b>'}</div>`;}).join('');
  $('tiles').innerHTML=C.PIECES.map((pc,pi)=>`<div class="ch-tp"><span class="label">${pc.n}</span><div>${[0,1,2].map(k=>tile(pi*3+k,st.cur[pi*3+k],plan.pos[pi*3+k])).join('')}</div></div>`).join('');
  /* one line per charm: every purchase on it, in the order the charm first comes up */
  const by=new Map();plan.steps.forEach(x=>{const m=by.get(x.i);if(m){m.to=Math.max(m.to,x.to);m.g+=x.g;m.d+=x.d;}else by.set(x.i,{...x});});
  const steps=[...by.values()],LIMIT=15,rows=showAll?steps:steps.slice(0,LIMIT);
  $('steps-h').hidden=!steps.length;
  $('steps').innerHTML=rows.map((s,k)=>{const pc=C.PIECES[Math.floor(s.i/3)],t=C.troopOf(s.i);
    return `<li><span class="num">${k+1}</span><div><div class="step-top"><b>${pc.n} charm ${s.i%3+1}</b><span class="move">${C.lvName(s.from)} → ${C.lvName(s.to)}</span><span class="chip">${C.TROOP[t]}</span></div>
      <div class="cost">${fmt(s.g)} Guides · ${fmt(s.d)} Designs</div></div></li>`;}).join('');
  $('more').hidden=steps.length<=LIMIT;$('more').textContent=showAll?'Show fewer steps':`Show all ${steps.length} charms`;
  const notes=[];
  if(!st.g&&!st.d)notes.push('<p>Enter your Charm Guides and Charm Designs in step 1 to get a plan.</p>');
  else if(!steps.length)notes.push("<p>Your materials don't cover the next purchase on any charm yet.</p>");
  else{
    const nx=[];for(let i=0;i<C.N;i++)if(plan.pos[i]<C.PMAX)nx.push(C.buy(plan.pos[i]+1));
    if(nx.length){const m=nx.reduce((a,b)=>b.d<a.d?b:a);
      const need=[];if(m.g>plan.left.g)need.push(`${fmt(m.g-plan.left.g)} Guides`);if(m.d>plan.left.d)need.push(`${fmt(m.d-plan.left.d)} Designs`);
      if(need.length)notes.push(`<p>Next cheapest purchase needs ${need.join(' and ')} more.</p>`);}
    if(plan.ex.gd||plan.ex.dg){const e=[];if(plan.ex.gd)e.push(`${fmt(plan.ex.gdCost)} Guides → ${fmt(plan.ex.gd)} Designs`);if(plan.ex.dg)e.push(`${fmt(plan.ex.dgCost)} Designs → ${fmt(plan.ex.dg)} Guides`);
      notes.push(`<p><b>Exchange first:</b> ${e.join(', ')}. Materials used above include it.</p>`);}
    if(st.m==='score'&&st.tp>0&&pts<st.tp)notes.push(`<p>Your materials reach ${fmt(pts)} of your ${fmt(st.tp)} points target.</p>`);
    notes.push(`<p>Do it on KvK day 1, 3 or 4: <b>${fmt(pts)} points</b>. Add the Charm Score to the <a href="../kvk/">KvK planner</a> (it reads this page by itself).</p>`);}
  $('notes').innerHTML=notes.join('');$('notes').hidden=!notes.length;
  if(document.activeElement!==$('code'))$('code').value=C.encode(st);
  save();}

/* ---------- events ---------- */
const say=KS.msg('msg');
const mine=()=>{if(isExample){isExample=false;}};
$('app-ch').addEventListener('change',e=>{
  const so=e.target.closest('.cg-ch select');
  if(so){const k=+so.dataset.k;selC=k;st.cur[selP*3+k]=+so.value;mine();drawCharms();render();return;}
  const mb=e.target.closest('.bought input');
  if(mb){const k=mb.closest('[data-shop]').dataset.shop;
    if(k==='m'){st.mc=MASTER.map((_,i)=>$('m-'+i).checked);cart.m=defCart().m;}
    else{st[k]=[...REG.map((_,i)=>$(k+'-'+i).checked),Math.max(0,Math.min(20,Math.floor(+$(k+'-4').value||0)))];cart[k]=0;}
    mine();render();}
});
$('shop-tabs').addEventListener('keydown',e=>{const o=['m','des','cra'];let i=o.indexOf(shopTab);
  if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else return;e.preventDefault();shopTab=o[i];renderShop();$('tab-'+o[i]).focus();});
$('app-ch').addEventListener('click',e=>{
  if(e.target.closest('.cart-clear')){cart=defCart();render();return;}
  const b=e.target.closest('.selbtn');
  if(b&&b.dataset.kind){const k=b.dataset.kind,n=+b.dataset.r;cart[k]=cart[k]===n?n-1:n;render();return;}
  if(b&&lastM){const n=+b.dataset.m,row=lastM.rows[n-1],was=b.getAttribute('aria-pressed')==='true';
    cart.m=defCart().m;if(!was)lastM.lv.slice(0,n).forEach((x,j)=>{cart.m[x.k]=row.ch[j];});render();return;}
  const tb=e.target.closest('#shop-tabs [role=tab]');
  if(tb){shopTab=tb.dataset.tab;renderShop();return;}
  const pk=e.target.closest('#m-pick [data-k]');
  if(pk&&lastM){const j=+pk.dataset.j,c=pk.dataset.c,lv=lastM.lv;
    if(!c)lv.slice(j).forEach(x=>{cart.m[x.k]=null;});
    else{lv.slice(0,j).forEach((x,i)=>{if(!cart.m[x.k])cart.m[x.k]=lastM.rows[j].ch[i];});cart.m[lv[j].k]=c;}
    render();}
});
$('pieces').addEventListener('click',e=>{
  const pb=e.target.closest('.cg-pc');if(pb){selP=+pb.dataset.p;selC=0;drawCharms();return;}
  const cb=e.target.closest('.cg-chb');if(cb){selC=+cb.dataset.k;drawCharms();return;}
  const sb=e.target.closest('.cg-bar button');if(sb){const i=selP*3+selC,{l,s}=C.lvAt(st.cur[i]),j=+sb.dataset.s;
    st.cur[i]=C.posOf(l,j);mine();drawCharms();render();}});
[['r-g','g'],['r-d','d'],['r-tp','tp']].forEach(([id,k])=>$(id).addEventListener('input',()=>{st[k]=Math.max(0,Math.floor(+$(id).value||0));mine();render();}));
$('r-x').addEventListener('change',()=>{st.x=+$('r-x').value;mine();render();});
$('mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.m=b.dataset.m;mine();writeInputs();render();});
$('w-prof').addEventListener('change',()=>{st.prof=$('w-prof').value;mine();render();});
$('w-for').addEventListener('change',()=>{st.for=$('w-for').value;mine();writeInputs();render();});
$('w-mix').addEventListener('input',()=>{st.mix=+$('w-mix').value;mine();render();});
document.querySelectorAll('[data-w]').forEach(el=>el.addEventListener('input',()=>{st[el.dataset.w][el.dataset.t]=Math.max(0,Math.min(100,+el.value||0));mine();render();}));
$('all-go').addEventListener('click',()=>{const l=+$('all-l').value;st.cur=st.cur.map(()=>C.posOf(l,0));mine();writeInputs();render();});
$('more').addEventListener('click',()=>{showAll=!showAll;render();});
function load(o,msg){st=o;cart=defCart();isExample=false;writeInputs();render();say(msg,'ok');}
$('btn-import').addEventListener('click',()=>{try{load(C.decode($('code').value),'Imported.');}catch(e){say(e.message,'err');}});
$('btn-example').addEventListener('click',()=>{st=C.clean(EXAMPLE);isExample=true;cart=defCart();writeInputs();render();say('Example loaded. Your own data is kept until you edit.','ok');});
const copy=(txt,ok)=>KS.copyCode(txt,ok,say);
$('btn-export').addEventListener('click',()=>copy(C.encode(st),'Code copied.'));
$('btn-link').addEventListener('click',()=>copy(location.href.split('#')[0]+'#'+C.encode(st),'Link copied. Opening it loads these charms.'));
function fromHash(){const h=decodeURIComponent(location.hash.slice(1));if(!/^KSC1:/i.test(h))return false;
  try{st=C.decode(h);isExample=false;history.replaceState(null,'',location.pathname);return true;}catch(e){say(e.message,'err');return false;}}
window.addEventListener('hashchange',()=>{if(fromHash()){writeInputs();render();}});

buildPieces();fromHash();writeInputs();render();
if(isExample)say('Showing an example. Enter your own charms and materials.','ok');
/* game account switch (assets/accounts.js): inputs are saved as you type, so only reload */
window.KSPage={reload(){loadSaved();cart=defCart();showAll=false;
  writeInputs();render();say(isExample?'Showing an example. Enter your own charms and materials.':'','ok');}};
})();
