(function(){
const $=id=>document.getElementById(id);
const C=window.CH;
const fmt=n=>Math.round(n).toLocaleString('en-US');
const big=n=>n>=1e4?(+(n/1e3).toFixed(n>=1e5?0:1))+'K':fmt(n);
const pct=n=>(+n.toFixed(2)).toString();

/* ---------- state ---------- */
const EXAMPLE={cur:[11,11,10,9,9,9, 10,10,10,8,8,8, 9,9,9,7,7,7].map(l=>C.posOf(l,0)),g:2400,d:3100,m:'stats',tp:0,x:0};
let st=C.loadSaved(),isExample=false;
if(!st){st=C.clean(EXAMPLE);isExample=true;}
const save=()=>{if(isExample)return;try{localStorage.setItem(C.KEY,JSON.stringify(st))}catch(e){}};
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
  const bar=staged?`<div class="cg-bar" role="group" aria-label="Stage toward Lv ${l+1}">${[1,2,3,4,5].map(j=>`<button type="button" data-s="${j}" class="${j<=s?'on':''}" ${j===5?'disabled':''} aria-label="${j} of 5"></button>`).join('')}</div>
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
function render(){
  plan=C.planFor(st);
  const sumF=f=>f.I+f.C+f.A;
  $('fs-att').textContent=sumF(st.att)===100?'':`Adds up to ${sumF(st.att)}%: read as shares`;
  $('fs-def').textContent=sumF(st.def)===100?'':`Adds up to ${sumF(st.def)}%: read as shares`;
  $('mix-o').textContent=`${st.mix}% attack · ${100-st.mix}% defense`;
  const W=C.weightsOf(st),ws=W.I+W.C+W.A;
  $('wout').innerHTML=ws>0?`Each % of charm bonus is worth: ${['I','C','A'].map(t=>`<b>${C.TROOP[t]} ${Math.round(W[t]/ws*100)}%</b>`).join(' · ')}`:'All your formations are 0%: add troops.';
  const pts=Math.round(plan.score*C.KVK_PTS),ug=st.g-plan.left.g,ud=st.d-plan.left.d;
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
const say=(t,c)=>{const m=$('msg');m.textContent=t;m.className='msg '+c;};
const mine=()=>{if(isExample){isExample=false;}};
$('app-ch').addEventListener('change',e=>{
  const so=e.target.closest('.cg-ch select');
  if(so){const k=+so.dataset.k;selC=k;st.cur[selP*3+k]=+so.value;mine();drawCharms();render();}
});
$('pieces').addEventListener('click',e=>{
  const pb=e.target.closest('.cg-pc');if(pb){selP=+pb.dataset.p;selC=0;drawCharms();return;}
  const cb=e.target.closest('.cg-chb');if(cb){selC=+cb.dataset.k;drawCharms();return;}
  const sb=e.target.closest('.cg-bar button');if(sb){const i=selP*3+selC,{l,s}=C.lvAt(st.cur[i]),j=+sb.dataset.s;
    st.cur[i]=C.posOf(l,j===s?j-1:j);mine();drawCharms();render();}});
[['r-g','g'],['r-d','d'],['r-tp','tp']].forEach(([id,k])=>$(id).addEventListener('input',()=>{st[k]=Math.max(0,Math.floor(+$(id).value||0));mine();render();}));
$('r-x').addEventListener('change',()=>{st.x=+$('r-x').value;mine();render();});
$('mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.m=b.dataset.m;mine();writeInputs();render();});
$('w-prof').addEventListener('change',()=>{st.prof=$('w-prof').value;mine();render();});
$('w-for').addEventListener('change',()=>{st.for=$('w-for').value;mine();writeInputs();render();});
$('w-mix').addEventListener('input',()=>{st.mix=+$('w-mix').value;mine();render();});
document.querySelectorAll('[data-w]').forEach(el=>el.addEventListener('input',()=>{st[el.dataset.w][el.dataset.t]=Math.max(0,Math.min(100,+el.value||0));mine();render();}));
$('all-go').addEventListener('click',()=>{const l=+$('all-l').value;st.cur=st.cur.map(()=>C.posOf(l,0));mine();writeInputs();render();});
$('more').addEventListener('click',()=>{showAll=!showAll;render();});
function load(o,msg){st=o;isExample=false;writeInputs();render();say(msg,'ok');}
$('btn-import').addEventListener('click',()=>{try{load(C.decode($('code').value),'Imported.');}catch(e){say(e.message,'err');}});
$('btn-example').addEventListener('click',()=>{st=C.clean(EXAMPLE);isExample=true;writeInputs();render();say('Example loaded. Your own data is kept until you edit.','ok');});
const copy=(txt,ok)=>{const done=()=>say(ok,'ok');
  if(navigator.clipboard)navigator.clipboard.writeText(txt).then(done,()=>{$('code').focus();$('code').select();say('Copy the code from the box above.','ok');});
  else{$('code').focus();$('code').select();say('Copy the code from the box above.','ok');}};
$('btn-export').addEventListener('click',()=>copy(C.encode(st),'Code copied.'));
$('btn-link').addEventListener('click',()=>copy(location.href.split('#')[0]+'#'+C.encode(st),'Link copied. Opening it loads these charms.'));
function fromHash(){const h=decodeURIComponent(location.hash.slice(1));if(!/^KSC1:/i.test(h))return false;
  try{st=C.decode(h);isExample=false;history.replaceState(null,'',location.pathname);return true;}catch(e){say(e.message,'err');return false;}}
window.addEventListener('hashchange',()=>{if(fromHash()){writeInputs();render();}});

buildPieces();fromHash();writeInputs();render();
if(isExample)say('Showing an example. Enter your own charms and materials.','ok');
})();
