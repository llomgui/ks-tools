/* Governor Charms model, shared by the Charms and KvK pages (window.CH).
   Data from Kingshot Optimizer's Governor Charms reference: per charm, cost to reach each level from the one
   before, the Lethality and Health bonus that level adds (same % to both), the Power it adds and the Governor
   Charm Score it adds (KvK pays 70 points per score). From Lv 5 → 6 up to Lv 21 → 22, a level is bought in
   5 equal purchases (stages). */
(function(){
// level: [Charm Guides, Charm Designs, stat %, event score, power]
const L=[null,
  [5,5,9,625,205700],[40,15,3,1250,82300],[60,40,4,3125,82000],[80,100,3,8750,82000],[100,200,6,11250,124000],
  [120,300,5,12500,124000],[140,400,5,12500,124000],[200,400,5,13000,124000],[300,400,5,14000,124000],[420,420,5,15000,124000],[560,420,5,16000,124000],
  [580,600,4,18000,96000],[610,780,4,21000,96000],[645,960,4,24000,96000],[685,1140,4,27000,96000],[730,1320,4,30000,96000],[780,1500,4,33000,96000],
  [835,1680,4,36000,96000],[895,1860,4,39000,96000],[960,2040,4,42000,96000],[1030,2220,4,45000,96000],[1105,2400,4,48000,96000]];
const MAXL=22,STEP_L=5;                       /* levels after 5 are bought in 5 stages */
const PMAX=STEP_L+5*(MAXL-STEP_L);            /* 90 purchases from Lv 0 to Lv 22 */
const KVK_PTS=70;
/* a charm's progress is a "position": one step per purchase */
const posOf=(l,s)=>l<=STEP_L?Math.max(0,l):STEP_L+5*(l-STEP_L)+(l<MAXL?Math.max(0,Math.min(4,s|0)):0);
const lvAt=p=>p<=STEP_L?{l:p,s:0}:{l:STEP_L+Math.floor((p-STEP_L)/5),s:(p-STEP_L)%5};
const lvName=p=>{const {l,s}=lvAt(p);return l===0?'Lv 0':`Lv ${l}${s?` · ${s}/5`:''}`;};
/* the purchase that moves a charm from position p-1 to p */
function buy(p){
  if(p<=STEP_L){const r=L[p];return {g:r[0],d:r[1],stat:r[2],ev:r[3],pw:r[4]};}
  const r=L[STEP_L+Math.ceil((p-STEP_L)/5)];return {g:r[0]/5,d:r[1]/5,stat:r[2]/5,ev:r[3]/5,pw:r[4]/5};}
const CUM=[{g:0,d:0,stat:0,ev:0,pw:0}];
for(let p=1;p<=PMAX;p++){const b=buy(p),c=CUM[p-1];CUM.push({g:c.g+b.g,d:c.d+b.d,stat:c.stat+b.stat,ev:c.ev+b.ev,pw:c.pw+b.pw});}

/* 6 Governor Gear pieces, 3 charms each; the piece decides the troop type (same as the game) */
const PIECES=[{n:'Hood',t:'C'},{n:'Charmstone',t:'C'},{n:'Cloak',t:'I'},{n:'Breeches',t:'I'},{n:'Ring',t:'A'},{n:'Staff',t:'A'}];
const TROOP={I:'Infantry',C:'Cavalry',A:'Archer'};
const TNUM={I:1,C:2,A:3};
const N=PIECES.length*3;
const troopOf=i=>PIECES[Math.floor(i/3)].t;
const img=(t,l)=>`../assets/charms/${TNUM[t]}${String(Math.max(1,Math.min(MAXL,l))).padStart(2,'0')}.png`;

/* Exchanges (Charm Guides ↔ Charm Designs, each direction, per week):
   1:1 up to 10 received; 2:1 up to 500 received (only with x=2). A shortfall on one material is covered with
   the other, cheapest rate first. Returns the new remaining materials and caps, or null if it can't be paid. */
function pay(rem,b,x){
  const r={...rem};r.g-=b.g;r.d-=b.d;
  const cover=(need,have,c1,c2)=>{
    const k1=Math.min(need,x>=1?r[c1]:0);need-=k1;const k2=Math.min(need,x>=2?r[c2]:0);need-=k2;
    if(need>1e-9)return false;r[c1]-=k1;r[c2]-=k2;r[have]-=k1+2*k2;r.tr+=k1+k2;return true;};
  if(r.d<-1e-9){const need=-r.d;r.d=0;if(!cover(need,'g','gd1','gd2'))return null;}
  if(r.g<-1e-9){const need=-r.g;r.g=0;if(!cover(need,'d','dg1','dg2'))return null;}
  if(r.g<-1e-9||r.d<-1e-9)return null;
  return r;}

/* Greedy plan, one purchase at a time: the next stage with the most value per material, where each material
   is priced by how scarce it is right now (cost / remaining², like Kingshot Optimizer).
   mode 'stats': value = stat % × troop weight. mode 'score': value = Charm Score, stop once the goal score is reached. */
function optimize(cur,inv,opt){
  opt=opt||{};const w=opt.w||{I:1,C:1,A:1},mode=opt.mode||'stats',x=opt.x||0,goal=opt.goal||0;
  const pos=cur.slice();
  let rem={g:+inv.g||0,d:+inv.d||0,gd1:10,dg1:10,gd2:500,dg2:500,tr:0};
  const start={g:rem.g,d:rem.d};
  const steps=[];let score=0;
  const price=b=>{const sg=Math.max(rem.g,1),sd=Math.max(rem.d,1);return b.g/(sg*sg)+b.d/(sd*sd);};
  for(let guard=0;guard<N*PMAX+5;guard++){
    if(mode==='score'&&goal>0&&score>=goal)break;
    let best=-1,bv=-1,bb=null,br=null;
    for(let i=0;i<N;i++){
      if(pos[i]>=PMAX)continue;const b=buy(pos[i]+1);
      const r=pay(rem,b,x);if(!r)continue;
      const gain=mode==='score'?b.ev:b.stat*(w[troopOf(i)]||0);if(gain<=0)continue;
      const v=gain/Math.max(price(b),1e-18)/(1+(r.tr-rem.tr)/Math.max(b.g+b.d,1));   /* exchanged material costs extra */
      if(v>bv*(1+1e-9)||(best>=0&&v>=bv*(1-1e-9)&&pos[i]<pos[best])){bv=v;best=i;bb=b;br=r;}}
    if(best<0)break;
    rem=br;pos[best]++;score+=bb.ev;
    const last=steps[steps.length-1];
    if(last&&last.i===best){last.to=pos[best];last.g+=bb.g;last.d+=bb.d;}
    else steps.push({i:best,from:pos[best]-1,to:pos[best],g:bb.g,d:bb.d});
  }
  const ex={gd:(10-rem.gd1)+(500-rem.gd2),dg:(10-rem.dg1)+(500-rem.dg2)};
  ex.gdCost=(10-rem.gd1)+2*(500-rem.gd2);ex.dgCost=(10-rem.dg1)+2*(500-rem.dg2);
  return {pos,steps,left:{g:rem.g,d:rem.d},ex,...gains(cur,pos)};}
function gains(a,b){
  const stat={I:0,C:0,A:0};let ev=0,pw=0;
  for(let i=0;i<N;i++){stat[troopOf(i)]+=CUM[b[i]].stat-CUM[a[i]].stat;ev+=CUM[b[i]].ev-CUM[a[i]].ev;pw+=CUM[b[i]].pw-CUM[a[i]].pw;}
  return {stat,score:ev,power:pw};}

/* troop priority: the focused troop counts 1.4× (Kingshot Optimizer keeps priorities within about 1.4×,
   so cheap upgrades on the other troops still get picked) */
const weightsFor=f=>f==='all'?{I:1,C:1,A:1}:{I:f==='I'?1.4:1,C:f==='C'?1.4:1,A:f==='A'?1.4:1};
/* the plan for a saved or edited state */
const planFor=st=>optimize(st.cur,st,{w:weightsFor(st.f),mode:st.m,x:st.x,goal:st.m==='score'&&st.tp>0?st.tp/KVK_PTS:0});

/* KSC1 codes: charm positions, materials, focus, goal, points target, exchanges */
function encode(st){return 'KSC1:'+btoa(JSON.stringify({c:st.cur,g:st.g,d:st.d,f:st.f,m:st.m,tp:st.tp,x:st.x})).replace(/=+$/,'');}
function decode(txt){
  const raw=String(txt||'').trim().replace(/^.*#/,'');
  if(!/^KSC1:/i.test(raw))throw new Error('This is not a Charms code. It should start with KSC1:');
  let o;try{o=JSON.parse(atob(raw.slice(5).replace(/\s+/g,'')));}catch(e){throw new Error('This code is damaged. Copy it again in full.');}
  return clean(o);}
function clean(o){
  o=o||{};const c=Array.isArray(o.c)?o.c:Array.isArray(o.cur)?o.cur:[];
  return {cur:Array.from({length:N},(_,i)=>Math.max(0,Math.min(PMAX,Math.floor(+c[i]||0)))),
    g:Math.max(0,Math.floor(+o.g||0)),d:Math.max(0,Math.floor(+o.d||0)),f:['all','I','C','A'].includes(o.f)?o.f:'all',
    m:o.m==='score'?'score':'stats',tp:Math.max(0,Math.floor(+o.tp||0)),x:[0,1,2].includes(+o.x)?+o.x:0};}
const KEY='ks-charms-v1';
function loadSaved(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');return o?clean(o):null;}catch(e){return null;}}

window.CH={L,MAXL,STEP_L,PMAX,KVK_PTS,posOf,lvAt,lvName,buy,CUM,PIECES,TROOP,N,troopOf,img,optimize,planFor,gains,weightsFor,encode,decode,clean,KEY,loadSaved};
})();
