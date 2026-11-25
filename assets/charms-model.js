/* Governor Charms model, shared by the Charms and KvK pages (window.CH).
   Data from Kingshot Optimizer's Governor Charms reference: per charm, cost to reach each level from the one
   before, the Lethality and Health bonus that level adds, and the Governor Charm Score it adds (KvK pays 70
   points per score). From Lv 5 → 6 up to Lv 21 → 22, a level is bought in 5 equal purchases (stages). */
(function(){
// level: [Charm Guides, Charm Designs, stat %, event score]
const L=[null,
  [5,5,9,625],[40,15,3,1250],[60,40,4,3125],[80,100,3,8750],[100,200,6,11250],
  [120,300,5,12500],[140,400,5,12500],[200,400,5,13000],[300,400,5,14000],[420,420,5,15000],[560,420,5,16000],
  [580,600,4,18000],[610,780,4,21000],[645,960,4,24000],[685,1140,4,27000],[730,1320,4,30000],[780,1500,4,33000],
  [835,1680,4,36000],[895,1860,4,39000],[960,2040,4,42000],[1030,2220,4,45000],[1105,2400,4,48000]];
const MAXL=22,STEP_L=5;                       /* levels after 5 are bought in 5 stages */
const PMAX=STEP_L+5*(MAXL-STEP_L);            /* 90 purchases from Lv 0 to Lv 22 */
/* a charm's progress is a "position": one step per purchase */
const posOf=(l,s)=>l<=STEP_L?Math.max(0,l):STEP_L+5*(l-STEP_L)+(l<MAXL?Math.max(0,Math.min(4,s|0)):0);
const lvAt=p=>p<=STEP_L?{l:p,s:0}:{l:STEP_L+Math.floor((p-STEP_L)/5),s:(p-STEP_L)%5};
const lvName=p=>{const {l,s}=lvAt(p);return l===0?'Lv 0':`Lv ${l}${s?` · ${s}/5`:''}`;};
/* the purchase that moves a charm from position p-1 to p */
function buy(p){
  if(p<=STEP_L){const r=L[p];return {g:r[0],d:r[1],stat:r[2],ev:r[3]};}
  const r=L[STEP_L+Math.ceil((p-STEP_L)/5)];return {g:r[0]/5,d:r[1]/5,stat:r[2]/5,ev:r[3]/5};}
const CUM=[{g:0,d:0,stat:0,ev:0}];
for(let p=1;p<=PMAX;p++){const b=buy(p),c=CUM[p-1];CUM.push({g:c.g+b.g,d:c.d+b.d,stat:c.stat+b.stat,ev:c.ev+b.ev});}

/* 6 Governor Gear pieces, 3 charms each; the piece decides the troop type (same as the game) */
const PIECES=[{n:'Hood',t:'C'},{n:'Charmstone',t:'C'},{n:'Cloak',t:'I'},{n:'Breeches',t:'I'},{n:'Ring',t:'A'},{n:'Staff',t:'A'}];
const TROOP={I:'Infantry',C:'Cavalry',A:'Archer'};
const TNUM={I:1,C:2,A:3};
const N=PIECES.length*3;
const troopOf=i=>PIECES[Math.floor(i/3)].t;
const img=(t,l)=>`../assets/charms/${TNUM[t]}${String(Math.max(1,Math.min(MAXL,l))).padStart(2,'0')}.png`;

/* Greedy plan: buy, one purchase at a time, the next stage with the most weighted stat per material,
   where each material is priced by how scarce it is for you. mode 'score' maximizes KvK charm score instead. */
function optimize(cur,inv,w,mode){
  w=w||{I:1,C:1,A:1};
  const pos=cur.slice(),rem={g:+inv.g||0,d:+inv.d||0},start={...rem};
  const steps=[];
  const price=b=>(start.g>0?b.g/start.g:b.g?1e9:0)+(start.d>0?b.d/start.d:b.d?1e9:0);
  for(let guard=0;guard<N*PMAX+5;guard++){
    let best=-1,bv=-1,bb=null;
    for(let i=0;i<N;i++){
      if(pos[i]>=PMAX)continue;const b=buy(pos[i]+1);
      if(b.g>rem.g+1e-9||b.d>rem.d+1e-9)continue;
      const gain=mode==='score'?b.ev:b.stat*(w[troopOf(i)]||0);if(gain<=0)continue;
      const v=gain/Math.max(price(b),1e-12);
      if(v>bv*(1+1e-9)||(best>=0&&v>=bv*(1-1e-9)&&pos[i]<pos[best])){bv=v;best=i;bb=b;}}
    if(best<0)break;
    rem.g-=bb.g;rem.d-=bb.d;pos[best]++;
    const last=steps[steps.length-1];
    if(last&&last.i===best){last.to=pos[best];last.g+=bb.g;last.d+=bb.d;}
    else steps.push({i:best,from:pos[best]-1,to:pos[best],g:bb.g,d:bb.d});
  }
  return {pos,steps,used:{g:start.g-rem.g,d:start.d-rem.d},left:rem,...gains(cur,pos)};}
function gains(a,b){
  const stat={I:0,C:0,A:0};let ev=0;
  for(let i=0;i<N;i++){stat[troopOf(i)]+=CUM[b[i]].stat-CUM[a[i]].stat;ev+=CUM[b[i]].ev-CUM[a[i]].ev;}
  return {stat,score:ev};}
function totals(pos){const s={I:0,C:0,A:0};pos.forEach((p,i)=>s[troopOf(i)]+=CUM[p].stat);return s;}

/* KSC1 codes: charm positions, materials, focus */
function encode(st){return 'KSC1:'+btoa(JSON.stringify({c:st.cur,g:st.g,d:st.d,f:st.f})).replace(/=+$/,'');}
function decode(txt){
  const raw=String(txt||'').trim().replace(/^.*#/,'');
  if(!/^KSC1:/i.test(raw))throw new Error('This is not a Charms code. It should start with KSC1:');
  let o;try{o=JSON.parse(atob(raw.slice(5).replace(/\s+/g,'')));}catch(e){throw new Error('This code is damaged. Copy it again in full.');}
  return clean(o);}
function clean(o){
  o=o||{};const c=Array.isArray(o.c)?o.c:Array.isArray(o.cur)?o.cur:[];
  return {cur:Array.from({length:N},(_,i)=>Math.max(0,Math.min(PMAX,Math.floor(+c[i]||0)))),
    g:Math.max(0,Math.floor(+o.g||0)),d:Math.max(0,Math.floor(+o.d||0)),f:['all','I','C','A'].includes(o.f)?o.f:'all'};}
const weightsFor=f=>f==='all'?{I:1,C:1,A:1}:{I:f==='I'?3:1,C:f==='C'?3:1,A:f==='A'?3:1};
const KEY='ks-charms-v1';
function loadSaved(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');return o?clean(o):null;}catch(e){return null;}}

window.CH={L,MAXL,STEP_L,PMAX,posOf,lvAt,lvName,buy,CUM,PIECES,TROOP,N,troopOf,img,optimize,gains,totals,encode,decode,clean,weightsFor,KEY,loadSaved};
})();
