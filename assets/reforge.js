(function(){
const {TROOPS,SLOT_OF,PROFILES,IMB,statOf,optimize,chestMyth,weightsFor,BADGE,gearImg,enhTier,enh,cumXP}=window.HG;
const {$,fmt}=KS;
const KEY=KS.KEYS.reforge;
const TNAME={I:'Infantry',C:'Cavalry',A:'Archer'};

/* piece: {id, t:troop, s:slot 0-3, q:'M'|'R', L:model level (Red 101-200), M:mastery}
   each troop type has one main hero: the best piece of each troop and slot goes on it, every other upgraded piece is reforged */
const P=(t,s,q,n,M)=>({t,s,q,L:q==='R'?100+n:n,M});
/* a Backpack → Gear screenshot (2026-11-14): 32 Mythic pieces upgraded across many heroes, in screen order */
const EXAMPLE_PIECES=[
  P('C',2,'M',100,7),P('C',3,'M',91,3),P('I',2,'M',85,4),P('I',3,'M',81,4),
  P('C',3,'M',75,3),P('A',2,'M',72,3),P('A',0,'M',67,4),P('I',3,'M',71,3),
  P('I',1,'M',63,4),P('C',0,'M',67,3),P('A',1,'M',67,3),P('C',2,'M',65,3),
  P('C',1,'M',58,3),P('C',0,'M',56,3),P('I',3,'M',56,3),P('I',0,'M',51,4),
  P('C',1,'M',53,3),P('I',1,'M',51,3),P('C',2,'M',50,3),P('C',3,'M',50,3),
  P('A',3,'M',50,3),P('A',1,'M',46,4),P('A',3,'M',45,3),P('A',1,'M',44,3),
  P('I',0,'M',46,2),P('C',2,'M',41,3),P('A',2,'M',41,3),P('A',2,'M',37,4),
  P('I',2,'M',38,3),P('A',0,'M',34,3),P('C',0,'M',31,3),P('C',0,'M',29,3)];
const fresh=pieces=>({pieces:pieces.map((p,i)=>({...p,id:i+1})),nextId:pieces.length+1,skip:{},
  res:{fh:0,myth:0,mith:0,xp:0,ch:0},profile:'gen4',mode:'exp',form:defForm(),planFor:'att'});
function defForm(){return {att:[50,20,30],def:[60,40,0],mix:70};}
const PLANS={att:'Attack',def:'Garrison',mix:'Mix'};
/* fill in fields added after a state was saved */
function upgrade(x){
  /* skip[id]: 1 = don't reforge the XP, 2 = don't reforge the mastery (Forgehammers); older saves had keep[id] = keep both */
  x.skip=x.skip||{};if(x.keep){for(const id in x.keep)if(x.keep[id])x.skip[id]=3;delete x.keep;}x.res={fh:0,myth:0,mith:0,xp:0,ch:0,...(x.res||{})};
  if(!PROFILES[x.profile])x.profile='gen4';if(x.mode!=='conq')x.mode='exp';
  const f=x.form||{},ok=a=>Array.isArray(a)&&a.length===3;
  x.form={att:ok(f.att)?f.att:[50,20,30],def:ok(f.def)?f.def:[60,40,0],mix:Number.isFinite(f.mix)?f.mix:70};
  if(!PLANS[x.planFor])x.planFor='att';
  x.nextId=Math.max(x.nextId||0,...x.pieces.map(p=>p.id+1),1);
  return x;}

let st,sel=null;
function loadSaved(){
  st=KS.read(KEY);
  if(!st||!Array.isArray(st.pieces)) st=fresh(EXAMPLE_PIECES);
  st=upgrade(st);sel=null;}
loadSaved();
const save=()=>KS.write(KEY,st);

/* ---------- investment and refunds ---------- */
function invested(p){
  let fh=0,mythM=0,mythL=p.q==='R'?2:0,mith=0;
  for(let m=1;m<=p.M;m++){fh+=10*m;mythM+=Math.max(0,m-10);}
  if(p.q==='R') for(const k in IMB) if(p.L>=+k){mith+=IMB[k][0];mythL+=IMB[k][1];}
  return {xp:cumXP(p.L),fh,myth:mythM+mythL,mythM,mythL,mith};}
/* which parts of a piece get reforged: XP (enhancement) and/or mastery (Forgehammers), chosen separately */
const skipOf=p=>st.skip[p.id]||0;
const parts=p=>({xp:p.L>0&&!(skipOf(p)&1),fh:p.M>0&&!(skipOf(p)&2)});
const hasInvest=p=>p.L>0||p.M>0||p.q==='R';
const power=p=>statOf(p.q,p.L)*(1+0.1*p.M);
const pname=p=>`${TNAME[p.t]} ${SLOT_OF[p.s]}`;
const plabel=p=>`${p.q==='R'?'Red':'Mythic'} ${enh(p)}${p.M?` · Lv. ${p.M}`:''}`;

/* ---------- the plan ---------- */
function analyse(){
  const gear={},chosen=new Set(),swaps=[],missing=[];
  TROOPS.forEach(({k:t})=>{
    gear[t]=[];
    for(let s=0;s<4;s++){
      const own=st.pieces.filter(p=>p.t===t&&p.s===s);
      const best=own.reduce((a,b)=>!a||power(b)>power(a)+1e-9?b:a,null);
      gear[t][s]=best?[best.L,best.M,best.q]:[0,0,'M'];
      if(!best){missing.push(`${TNAME[t]} ${SLOT_OF[s]}`);continue;}
      chosen.add(best.id);
      if(own.some(p=>p!==best&&hasInvest(p))) swaps.push(best);
    }});
  const others=st.pieces.filter(p=>!chosen.has(p.id));
  const touched=others.filter(hasInvest);
  const reforge=touched.filter(p=>{const r=parts(p);return r.xp||r.fh;});
  const kept=touched.filter(p=>!reforge.includes(p));
  let actions=0;
  const empty=others.filter(p=>!hasInvest(p)).length;
  const back={xp:0,fh:0,lostFh:0,myth:0,mith:0};
  reforge.forEach(p=>{const i=invested(p),r=parts(p);
    if(r.xp){actions++;back.xp+=i.xp;back.myth+=i.mythL;back.mith+=i.mith;}
    if(r.fh){actions++;back.fh+=Math.floor(i.fh/2);back.lostFh+=i.fh-Math.floor(i.fh/2);back.myth+=i.mythM;}});
  const base={profile:st.profile,mode:st.mode,ms:true,W:weightsFor(st,st.planFor)};
  const stock={fh:st.res.fh,myth:st.res.myth,mith:st.res.mith,xp:st.res.xp,chests:st.res.ch||0};
  const now=optimize({...base,fh:0,myth:0,mith:0,xp:0,chests:0,gear}).after;
  const without=optimize({...base,...stock,gear});
  const withR=optimize({...base,...stock,fh:stock.fh+back.fh,xp:stock.xp+back.xp,gear});
  return {chosen,gear,swaps,touched,reforge,kept,actions,empty,back,missing,now,without,withR};}

/* ---------- inventory ---------- */
/* like the game: Red shows +N on a coloured pill, Mythic shows a plain white +N (no pill), +0 shows nothing */
const enhLabel=window.HG.enhLabel;
function tile(p,status,cls){
  const lvl=p.M?`<span class="gt-lbl">Lv.${p.M}</span>`:'';
  const pill=enhLabel(p);
  return `<div class="gcw ${cls||''}" tabindex="0" role="button" data-id="${p.id}" aria-label="Edit ${pname(p)}, ${plabel(p)}, ${status}">
    <div class="gc gt q${p.q}">${BADGE[p.t]}<img src="${gearImg(p.t,p.s)}" alt="" loading="lazy" decoding="async">${pill}${lvl}</div>
    <span class="gw">${status}</span></div>`;}

function renderInv(a){
  const role={};
  a.chosen.forEach(id=>role[id]=['Main hero','mh']);
  a.reforge.forEach(p=>{const r=parts(p);role[p.id]=[r.xp&&r.fh?'Reforge':r.xp?'Reforge XP':'Reforge hammers','rf'];});
  a.kept.forEach(p=>role[p.id]=['Keep','']);
  const html=st.pieces.map(p=>{const r=role[p.id]||['Not upgraded',''];
    return tile(p,r[0],`${r[1]}${sel===p.id?' sel':''}`);}).join('');
  $('inv').innerHTML=html+`<button type="button" class="rf-add" id="btn-add"><span aria-hidden="true">+</span>Add piece</button>`;
}

function renderEditor(){
  const p=st.pieces.find(x=>x.id===sel);
  $('editor').hidden=!p; if(!p) return;
  $('ed-title').textContent=`Edit ${pname(p)}`;
  $('ed-troop').value=p.t;$('ed-slot').value=String(p.s);$('ed-q').value=p.q;
  $('ed-enh').value=p.q==='R'?p.L-100:p.L;$('ed-enh').min=p.q==='R'?1:0;
  $('ed-m').value=p.M;$('ed-m').max=p.q==='R'?20:10;
  $('ed-hint').textContent=p.q==='R'?'Red: +1 to +100, mastery up to 20.':'Mythic: +0 to +100, mastery up to 10.';
}

/* ---------- results ---------- */
function costLine(c){const a=[];
  if(c.fh)a.push(fmt(c.fh)+' Forgehammers');if(c.myth)a.push(fmt(c.myth)+' Mythic');
  if(c.mith)a.push(fmt(c.mith)+' Mithril');const xp=c.xpR+c.xpL;if(xp)a.push(fmt(xp)+' XP');
  return a.join(' · ')||'free';}
/* steps in game terms: Mythic +0..+100, then ascend, then Red +1..+100 */
function levelPath(f,t){
  if(f.q==='M'&&t.q==='R') return [f.L<100?`Mythic +${f.L} → +100`:'',`ascend to Red`,t.L>101?`Red +1 → +${t.L-100}`:'Red +1'].filter(Boolean).join(', then ');
  if(f.L===t.L) return '';
  return f.q==='R'?`Red +${f.L-100} → +${t.L-100}`:`Mythic +${f.L} → +${t.L}`;}

function renderResults(a){
  const pct=v=>a.now>0?(v-a.now)/a.now*100:0;
  const extra=pct(a.withR.after)-pct(a.without.after);
  $('s-xp').textContent=a.back.xp?'+'+fmt(a.back.xp):'0';
  $('s-fh').textContent=a.back.fh?'+'+fmt(a.back.fh):'0';
  $('s-gain').textContent=(extra>0.05?'+':'')+extra.toFixed(1)+'%';

  const li=[];let n=0;
  const item=(top,sub)=>li.push(`<li><span class="num">${++n}</span><div><div class="step-top">${top}</div>${sub?`<div class="cost">${sub}</div>`:''}</div></li>`);
  if(a.swaps.length){
    const short=p=>`${SLOT_OF[p.s]} ${p.q==='R'?'Red ':''}${enh(p)}${p.M?` Lv.${p.M}`:''}`;
    const lines=TROOPS.map(({k:t,name})=>{const ps=a.swaps.filter(p=>p.t===t).sort((x,y)=>x.s-y.s);
      return ps.length?`<span class="rf-eq"><b>${name}</b> ${ps.map(short).join(' · ')}</span>`:'';}).join('');
    item(`<b>Equip your best pieces on your main heroes</b>`,
      `Before reforging, check your main hero of each troop wears these. Moving gear is free and keeps every level.${lines}`);}
  a.touched.forEach(p=>{const i=invested(p),fh=Math.floor(i.fh/2),r=parts(p);
    const box=(part,on,label)=>`<label class="rf-part${on?' on':''}"><input type="checkbox" data-part="${part}" data-id="${p.id}"${on?' checked':''}> ${label}</label>`;
    const opts=[p.L>0?box('xp',r.xp,`XP <b>+${fmt(i.xp)}</b>`):'',p.M>0?box('fh',r.fh,`Hammers <b>+${fmt(fh)}</b> <small>(${fmt(i.fh-fh)} lost)</small>`):''].filter(Boolean).join('');
    item(`<b>${r.xp||r.fh?'Reforge':'Keep'} ${pname(p)}</b><span class="move">${plabel(p)}</span>`,`<span class="rf-parts">${opts}</span>`);});
  if(!a.touched.length)
    item('<b>Nothing to reforge</b>',`You have one upgraded piece per slot, so all of it stays on your main heroes${a.empty?`. The other ${a.empty} piece${a.empty>1?'s have':' has'} nothing invested`:''}.`);
  const anyPlan=a.withR.steps.length;
  item(`<b>${anyPlan?'Follow the upgrade order below':'Nothing to upgrade yet'}</b>`,anyPlan?'Spend the refunds and your backpack from step 2 on your main heroes.':'Add what is in your backpack in step 2.');
  $('todo').innerHTML=li.join('');

  /* main heroes after the plan */
  const box=$('preview');box.innerHTML='';
  TROOPS.forEach(t=>{
    const cards=t.pieces.map((key,s)=>{
      const g=a.gear[t.k][s],from={q:g[2],L:g[0],M:g[1]};
      const to=a.withR.pieces.find(x=>x.troop===t.k&&x.key===key).s;
      const up=to.L!==from.L||to.M!==from.M||to.q!==from.q;
      const tip=`${t.name} ${SLOT_OF[s]} · ${to.q==='R'?'Red':'Mythic'} ${enh(to)} · Lv. ${to.M}`;
      return `<div class="gcw ${up?'up':'same'}"><div class="gc gt q${to.q}" role="img" aria-label="${tip}" title="${tip}">${BADGE[t.k]}<img src="${gearImg(t.k,s)}" alt="" loading="lazy" decoding="async">
        ${enhLabel(to)}${to.M?`<span class="gt-lbl">Lv.${to.M}</span>`:''}</div>
        <span class="gn">${SLOT_OF[s]}</span><span class="gw">${up?`was ${enh(from)} · Lv ${from.M}`:'&nbsp;'}</span></div>`;});
    const row=document.createElement('div');
    row.innerHTML=`<div class="pv-head"><strong>${t.name}</strong><span>Main ${t.name} hero</span></div><div class="pv-row">${cards.join('')}</div>`;
    box.appendChild(row);});
  box.classList.toggle('has-up',!!box.querySelector('.gcw.up'));

  /* upgrade order */
  const plan=$('plan');
  plan.innerHTML=a.withR.steps.length?a.withR.steps.map((s,k)=>{
    const what=[];
    if(s.from.q!==s.to.q) what.push('<span class="chip red">Ascend</span>');
    const asc=s.from.q!==s.to.q?' (2 Mythic Gear of it to ascend)':'';
    s.ms.forEach(m=>what.push(`<span class="chip ms">+${m[1]}% ${m[0].startsWith('Hero')?'':s.p.troopName+' '}${m[0]}</span>`));
    const lv=levelPath(s.from,s.to);
    const ms=s.from.M!==s.to.M?`Lv. ${s.from.M} → ${s.to.M}`:'';
    return `<li><span class="num">${k+1}</span><div><div class="step-top"><b>${s.p.troopName} ${SLOT_OF[TROOPS.find(t=>t.k===s.p.troop).pieces.indexOf(s.p.key)]}</b>
      <span class="move">${[lv,ms].filter(Boolean).join(' · ')}</span>${what.join('')}</div><div class="cost">${costLine(s.c)}${s.c.myth&&asc?asc:''}</div></div></li>`;}).join('')
    :`<li class="empty" style="display:block">${a.back.xp||a.back.fh||st.res.fh||st.res.xp||st.res.myth||st.res.mith||st.res.ch?'Nothing affordable: the next upgrades need resources you don\'t have yet.':'Nothing to spend yet. Add what is in your backpack in step 2.'}</li>`;

  /* notes */
  const notes=[];
  const p2=pct(a.without.after),p3=pct(a.withR.after);
  notes.push(`<p>Gear score of your main heroes: <b>+${p2.toFixed(1)}%</b> spending only your backpack, <b>+${p3.toFixed(1)}%</b> with the refunds too.</p>`);
  if(a.back.lostFh) notes.push(`<p>Reforging loses <b>${fmt(a.back.lostFh)} Forgehammers</b> (half of what those pieces used). Untick XP or Hammers on a piece to keep that part.</p>`);
  if(a.back.myth||a.back.mith) notes.push(`<p>Not counted as refunded: ${[a.back.myth?fmt(a.back.myth)+' Mythic Gear':'',a.back.mith?fmt(a.back.mith)+' Mithril':''].filter(Boolean).join(' and ')} spent on the reforged pieces. If the game's refund preview shows any of it coming back, add it in step 2.</p>`);
  if(a.actions>1) notes.push(`<p>${a.actions} reforges to do (XP and mastery are reforged separately). One reforge a day is free, and 100 gems skips the wait.</p>`);
  const gated=a.withR.pieces.filter(p=>p.s.q==='R'&&IMB[p.s.L+1]&&p.s.L<200);
  if(gated.length&&a.withR.left.mith<IMB[gated[0].s.L+1][0]){
    const g=gated[0],need=IMB[g.s.L+1];
    notes.push(`<p>${gated.length} Red piece${gated.length>1?'s stop':' stops'} at a Mithril gate (${gated.map(p=>`${p.troopName} ${SLOT_OF[TROOPS.find(t=>t.k===p.troop).pieces.indexOf(p.key)]} Red +${p.s.L-100}`).join(', ')}). The next level needs Mithril: for example Red +${g.s.L-99} costs ${need[0]} Mithril and ${need[1]} Mythic Gear.</p>`);}
  if(a.missing.length) notes.push(`<p>No piece listed for ${a.missing.join(', ')}. The plan treats ${a.missing.length>1?'them':'it'} as an unupgraded Mythic piece.</p>`);
  $('notes').innerHTML=notes.join('');
}

/* ---------- reforge code ---------- */
const CODE='KSR1:';
/* piece flag in the code: 0 = reforge XP and mastery, 1 = keep both, 2 = keep the mastery, 3 = keep the XP (maps both ways to skip bits) */
function exportCode(){
  const o={p:st.pieces.map(p=>[p.t,p.s,p.q,p.L,p.M,[0,3,2,1][skipOf(p)]]),r:[st.res.fh,st.res.myth,st.res.mith,st.res.xp,st.res.ch||0],
    pr:st.profile,m:st.mode,f:st.form,pf:st.planFor};
  return CODE+btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/,'');}
function importCode(txt){
  const raw=String(txt||'').trim().replace(/^.*#/,'');
  if(!raw.startsWith(CODE)) throw new Error('This is not a reforge code. It should start with '+CODE);
  let o;try{o=JSON.parse(decodeURIComponent(escape(atob(raw.slice(CODE.length).replace(/\s+/g,'')))));}catch(e){throw new Error('This code is damaged. Copy it again in full.');}
  if(!o||!Array.isArray(o.p)) throw new Error('This code is damaged. Copy it again in full.');
  const n=v=>Math.max(0,Math.floor(Number(v)||0));
  const x=fresh([]);
  o.p.forEach(a=>{if(!Array.isArray(a)||!TNAME[a[0]])return;
    const p={id:x.nextId++,t:a[0],s:Math.min(3,n(a[1])),q:a[2]==='R'?'R':'M',L:n(a[3]),M:n(a[4])};clampPiece(p);
    x.pieces.push(p);const k=[0,3,2,1][n(a[5])]||0;if(k)x.skip[p.id]=k;});
  const r=Array.isArray(o.r)?o.r:[];x.res={fh:n(r[0]),myth:n(r[1]),mith:n(r[2]),xp:n(r[3]),ch:n(r[4])};
  x.profile=o.pr;x.mode=o.m;x.planFor=o.pf;
  if(o.f&&typeof o.f==='object'){const t=a=>Array.isArray(a)&&a.length===3?a.map(v=>Math.min(100,n(v))):null;
    x.form={att:t(o.f.att),def:t(o.f.def),mix:Math.min(100,n(o.f.mix))};}
  return upgrade(x);}

/* ---------- state I/O ---------- */
function writeRes(){['fh','myth','mith','xp','ch'].forEach(k=>$('r-'+k).value=st.res[k]||0);$('profile').value=st.profile;$('mode').value=st.mode;
  const f=st.form;$('fa-i').value=f.att[0];$('fa-c').value=f.att[1];$('fa-a').value=f.att[2];
  $('fd-i').value=f.def[0];$('fd-c').value=f.def[1];$('fd-a').value=f.def[2];$('f-mix').value=f.mix;
  document.querySelectorAll('input[name=planfor]').forEach(r=>r.checked=r.value===st.planFor);}
function renderForm(){
  const f=st.form;
  $('mix-out').textContent=`${f.mix}% attack · ${100-f.mix}% garrison`;
  ['att','def'].forEach(k=>{const s=f[k].reduce((a,b)=>a+b,0);$('fs-'+k).textContent=s===100?'':`Adds up to ${s}%, treated as proportions`;});
  $('mix-field').hidden=st.planFor!=='mix';
  $('plan-for').textContent='· '+PLANS[st.planFor];}
function render(){
  const cm=chestMyth({chests:st.res.ch||0});$('ch-hint').textContent=st.res.ch?`≈ +${cm} Mythic Gear`:'';
  const a=analyse();
  renderInv(a);renderEditor();renderForm();renderResults(a);save();
  if(document.activeElement!==$('code')) $('code').value=exportCode();}

function clampPiece(p){
  const n=v=>Math.max(0,Math.floor(Number(v)||0));
  if(p.q==='R'){p.L=Math.min(200,Math.max(101,p.L));p.M=Math.min(20,n(p.M));}
  else{p.L=Math.min(100,n(p.L));p.M=Math.min(10,n(p.M));}}

/* ---------- events ---------- */
function pick(el){const w=el.closest('.gcw[data-id]');if(!w)return;sel=+w.dataset.id;render();
  $('editor').scrollIntoView({block:'nearest',behavior:'smooth'});}
$('inv').addEventListener('click',e=>{
  if(e.target.closest('#btn-add')){
    const last=st.pieces.find(x=>x.id===sel)||st.pieces[st.pieces.length-1];
    const p={id:st.nextId++,t:last?last.t:'I',s:0,q:'M',L:0,M:0};
    st.pieces.push(p);sel=p.id;render();$('ed-enh').focus();return;}
  pick(e.target);});
$('inv').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.gcw[data-id]')){e.preventDefault();pick(e.target);}});

function edit(){
  const p=st.pieces.find(x=>x.id===sel);if(!p)return;
  const before=JSON.stringify(p);
  const q=$('ed-q').value,N=Number($('ed-enh').value)||0;
  p.t=$('ed-troop').value;p.s=+$('ed-slot').value;
  if(q!==p.q){p.q=q;p.L=q==='R'?101:100;} else p.L=q==='R'?100+N:N;
  p.M=Number($('ed-m').value)||0;
  clampPiece(p);
  /* typing already re-rendered; skip the extra redraw on blur so a click on another tile or Add piece isn't lost */
  if(JSON.stringify(p)!==before) render();}
['ed-troop','ed-slot','ed-q','ed-enh','ed-m'].forEach(id=>$(id).addEventListener('change',edit));
['ed-enh','ed-m'].forEach(id=>$(id).addEventListener('input',()=>{if($(id).value!=='')edit();}));
$('ed-del').addEventListener('click',()=>{st.pieces=st.pieces.filter(x=>x.id!==sel);delete st.skip[sel];sel=null;render();});
$('ed-dup').addEventListener('click',()=>{const p=st.pieces.find(x=>x.id===sel);if(!p)return;
  const c={...p,id:st.nextId++};st.pieces.splice(st.pieces.indexOf(p)+1,0,c);sel=c.id;render();});

$('todo').addEventListener('change',e=>{const k=e.target.closest('input[data-part]');if(!k)return;
  const id=k.dataset.id,bit=k.dataset.part==='xp'?1:2,v=(st.skip[id]||0)&~bit|(k.checked?0:bit);
  if(v)st.skip[id]=v;else delete st.skip[id];render();});
['fh','myth','mith','xp','ch'].forEach(k=>$('r-'+k).addEventListener('input',()=>{st.res[k]=Math.max(0,Math.floor(Number($('r-'+k).value)||0));render();}));
$('profile').addEventListener('change',()=>{st.profile=PROFILES[$('profile').value]?$('profile').value:'gen4';render();});
$('mode').addEventListener('change',()=>{st.mode=$('mode').value==='conq'?'conq':'exp';render();});

const say=KS.msg('msg');
const load=(x,t)=>{st=x;sel=null;writeRes();render();say(t,'ok');};
const copy=(text,t)=>KS.copyCode(text,t,say);
$('btn-import').addEventListener('click',()=>{try{const x=importCode($('code').value);load(x,`Imported ${x.pieces.length} piece${x.pieces.length===1?'':'s'}.`);}catch(e){say(e.message,'err');}});
$('btn-export').addEventListener('click',()=>{$('code').value=exportCode();copy($('code').value,'Code copied. Paste it here later, or on another device, and press Import code.');});
$('btn-link').addEventListener('click',()=>copy(location.origin+location.pathname+'#'+exportCode(),'Link copied. Opening it loads this setup.'));
$('code').addEventListener('blur',()=>{if(!$('code').value.trim())$('code').value=exportCode();});
[['fa',0,'att'],['fd',0,'def']].forEach(([pre,,k])=>['i','c','a'].forEach((tr,i)=>$(`${pre}-${tr}`).addEventListener('input',()=>{
  st.form[k][i]=Math.min(100,Math.max(0,Math.floor(Number($(`${pre}-${tr}`).value)||0)));render();})));
$('f-mix').addEventListener('input',()=>{st.form.mix=+$('f-mix').value;render();});
document.querySelectorAll('input[name=planfor]').forEach(r=>r.addEventListener('change',()=>{if(r.checked){st.planFor=r.value;render();}}));
$('btn-example').addEventListener('click',()=>load(fresh(EXAMPLE_PIECES),'Loaded the example: 32 Mythic pieces upgraded across many heroes.'));
KS.confirmButton($('btn-blank'),()=>load(fresh([]),'Reset. Press Add piece to start.'));

/* a shared link carries the code after # */
function fromHash(){
  if(!location.hash.startsWith('#'+CODE)) return false;
  try{st=importCode(location.hash);sel=null;say('Loaded the setup from the link.','ok');}catch(e){say(e.message,'err');}
  try{history.replaceState(null,'',location.pathname);}catch(e){}
  return true;}
fromHash();
window.addEventListener('hashchange',()=>{if(fromHash()){writeRes();render();}});
writeRes();render();
/* game account switch (assets/accounts.js): inputs are saved as you edit, so only reload */
window.KSPage={reload(){loadSaved();writeRes();render();}};
})();
