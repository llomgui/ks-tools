/* Alliance Map Planner (map/index.html).
   World: 1200×1200 tiles, X/Y 0..1199 like in the game, drawn as a diamond: (0,0) at the bottom, X grows
   to the right-up, Y to the left-up, King's Castle in the middle (597,597, 6×6).
   A building is stored by its lowest tile (x,y) and covers sz×sz tiles from there.
   Rules (kingshot.me's planner data, not checked in the game yet):
   - castle area 594..605: nothing is built there. Forbidden ring 586..613 and ruins 552..647: towns can stand
     there (players fill them during castle fights and KvK), alliance buildings can't. Territory covers none of them.
   - base terrain: fertile land 450..749, plain 300..899, badland outside. Plain HQ on plain only (not fertile
     land), Wilderness HQ on badland only.
   - HQ 3×3 claims 15×15 around it, flag 1×1 claims 7×7. A tile belongs to the first building (list order)
     that claims it. An HQ that owns a tile is active; a flag is active when its tiles touch (8 neighbours)
     its alliance's active territory, so flags chain from an HQ.
   - flag: footprint on own territory or its tiles touch it. Traps and Great buildings: fully on own territory.
     Alliance buildings can't stand on another alliance's territory.
   - one Plain HQ, one Wilderness HQ, one Trap 1, one Trap 2 and one Great building per alliance. */
(function(){
const KS=window.KS,{$,esc}=KS;
const KEY=KS.KEYS.map;
const say=KS.msg('msg');
const N=1200;
const ZONES=[['ruins',552,648],['forbid',586,614],['castle',594,606]];   /* [lo,hi) on both axes, last wins */
const CASTLE={x:597,y:597,sz:6};
const TURRETS=[[604,604],[594,604],[604,594],[594,594]];
const COLORS=['#2563eb','#dc2626','#059669','#7c3aed','#ea580c','#0891b2','#ca8a04','#db2777'];
const T={
  town:{n:'Town',sz:2,lab:'Town'},
  phq:{n:'Plain HQ',sz:3,range:15,terr:'plain',uniq:'phq',al:1,lab:'HQ'},
  whq:{n:'Wilderness HQ',sz:3,range:15,terr:'badland',uniq:'whq',al:1,lab:'HQ'},
  flag:{n:'Alliance Flag',sz:1,range:7,connect:1,al:1,lab:'⚑'},
  trap1:{n:'Hunting Trap 1',sz:3,full:1,uniq:'trap1',al:1,lab:'Trap 1'},
  trap2:{n:'Hunting Trap 2',sz:3,full:1,uniq:'trap2',al:1,lab:'Trap 2'},
  gbread:{n:'Great Mill',sz:3,full:1,uniq:'great',al:1,lab:'Mill'},
  gwood:{n:'Great Sawmill',sz:3,full:1,uniq:'great',al:1,lab:'Sawmill'},
  gstone:{n:'Great Quarry',sz:3,full:1,uniq:'great',al:1,lab:'Quarry'},
  giron:{n:'Great Iron Mine',sz:3,full:1,uniq:'great',al:1,lab:'Iron'},
  great:{n:'Great building',sz:3,full:1,uniq:'great',al:1,lab:'Great'}};   /* from Jeabslist, which doesn't say which kind */
const TOOLS=[['select','Select','1'],['town','Town','2'],['phq','Plain HQ','3'],['whq','Wilderness HQ','4'],
  ['flag','Flag','5'],['trap1','Trap 1','6'],['trap2','Trap 2','7']];
const GREAT=['gbread','gwood','gstone','giron'];

/* ---------- terrain ---------- */
function overlay(x,y){let r='';for(const [k,a,b] of ZONES)if(x>=a&&x<b&&y>=a&&y<b)r=k;return r;}
function base(x,y){const m=Math.min(x,y),M=Math.max(x,y);return m>=450&&M<750?'fertile':m>=300&&M<900?'plain':'badland';}
const TERR={fertile:'Fertile land',plain:'Plain',badland:'Badland',ruins:'Ruins',forbid:'Forbidden area',castle:'Castle area'};

/* ---------- state ---------- */
let st,sel=null,tool='select',undo=[],terr=null,bad=new Map();
const MAXO=1500;   /* buildings and towns on one plan */
const blank=()=>({v:1,kid:0,al:[{id:'a1',tag:'',name:'My alliance',color:COLORS[0]}],act:'a1',objs:[],view:{x:600,y:600,s:8},ignore:false});
const int=(v,lo,hi,d)=>{v=Math.round(+v);return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):d;};
function clean(s){const b=blank();if(!s||typeof s!=='object')return b;
  const al=(Array.isArray(s.al)?s.al:[]).filter(a=>a&&typeof a.id==='string').slice(0,20).map((a,i)=>({id:a.id,
    tag:String(a.tag||'').slice(0,4),name:String(a.name||'').slice(0,30),color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:COLORS[i%COLORS.length]}));
  const ids=new Set(al.map(a=>a.id)),seen=new Set();
  const objs=(Array.isArray(s.objs)?s.objs:[]).filter(o=>o&&T[o.t]&&typeof o.id==='string'&&!seen.has(o.id)&&seen.add(o.id)).slice(0,MAXO).map(o=>({id:o.id,t:o.t,
    x:int(o.x,0,N-T[o.t].sz,600),y:int(o.y,0,N-T[o.t].sz,600),a:ids.has(o.a)?o.a:'',n:String(o.n||'').slice(0,24),c:/^#[0-9a-f]{6}$/i.test(o.c)?o.c:'',...(o.t==='town'&&+o.p>0?{p:Math.min(1e12,Math.round(+o.p))}:{})}));
  const v=s.view||{};
  return {v:1,kid:int(s.kid,0,99999,0),al,act:ids.has(s.act)?s.act:(al[0]?al[0].id:''),objs,
    view:{x:int(v.x,0,N,600),y:int(v.y,0,N,600),s:Math.min(40,Math.max(.3,+v.s||8))},ignore:!!s.ignore};}
function loadSaved(){st=clean(KS.read(KEY));}
let saveT=0;
const save=()=>{clearTimeout(saveT);saveT=0;KS.write(KEY,st);};
const saveSoon=()=>{clearTimeout(saveT);saveT=setTimeout(save,400);};
let idn=0;
const newId=p=>{let id;do id=p+(++idn).toString(36);while(st.objs.some(o=>o.id===id)||st.al.some(a=>a.id===id));return id;};
const alOf=id=>st.al.find(a=>a.id===id);
const alName=a=>a?(a.tag&&!a.name?`[${a.tag}]`:(a.tag?`[${a.tag}] `:'')+(a.name||'Alliance')):'No alliance';
const objName=o=>o.n||T[o.t].n;
const pushUndo=()=>{undo.push(JSON.stringify({al:st.al,objs:st.objs,act:st.act}));if(undo.length>60)undo.shift();};

/* ---------- territory ---------- */
const ck=(x,y)=>x*2048+y;
function rangeRect(o){const d=T[o.t];if(!d.range)return null;const l=o.x+(d.sz>>1)-(d.range>>1);return [l,o.y+(d.sz>>1)-(d.range>>1),d.range];}
function cellsOf(o,f){const s=T[o.t].sz;for(let x=o.x;x<o.x+s;x++)for(let y=o.y;y<o.y+s;y++)f(x,y);}
/* list order = who claimed first */
function compute(list){const own=new Map(),mine=new Map(),byAl=new Map(),active=new Set(),claims=new Map();
  for(const o of list){const r=rangeRect(o);if(!r||!o.a)continue;const cells=[];
    for(let x=Math.max(0,r[0]);x<Math.min(N,r[0]+r[2]);x++)for(let y=Math.max(0,r[1]);y<Math.min(N,r[1]+r[2]);y++){
      const k=ck(x,y);if(own.has(k)||overlay(x,y))continue;own.set(k,{a:o.a,id:o.id});cells.push(k);}
    mine.set(o.id,cells);if(!byAl.has(o.a))byAl.set(o.a,[]);byAl.get(o.a).push(o);}
  /* flood fill from the HQs: a flag joins when one of its tiles is on or next to (8 neighbours) a claimed tile */
  byAl.forEach((objs,a)=>{const claim=new Set(),at=new Map(),todo=[];
    const join=o=>{active.add(o.id);mine.get(o.id).forEach(k=>{if(!claim.has(k)){claim.add(k);todo.push(k);}});};
    objs.forEach(o=>{const c=mine.get(o.id);if(!c.length)return;if(o.t==='phq'||o.t==='whq')join(o);
      else c.forEach(k=>{let l=at.get(k);if(!l)at.set(k,l=[]);l.push(o);});});
    while(todo.length){const k=todo.pop(),x=Math.floor(k/2048),y=k%2048;
      for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const n=ck(x+i,y+j),l=at.get(n);if(!l)continue;at.delete(n);l.forEach(o=>{if(!active.has(o.id))join(o);});}}
    claims.set(a,claim);});
  return {own,mine,active,claims};}

/* why candidate c can't go there ('' = fine). others = every other building, idx = c's place in the list.
   pre = compute() of others with c at idx, when the caller has it already (refresh: the plan itself) */
function why(c,others,idx,pre){const d=T[c.t],s=d.sz;
  if(c.x<0||c.y<0||c.x+s>N||c.y+s>N)return 'Outside the map.';
  let ov='';cellsOf(c,(x,y)=>{const z=overlay(x,y);if(z&&(d.al||z==='castle'))ov=ov||z;});
  if(ov)return d.al?"Alliance buildings can't stand in the castle area, the forbidden ring or the ruins.":"Towns can't stand in the castle area (X and Y 594 to 605).";
  const hit=others.find(o=>o.x<c.x+s&&c.x<o.x+T[o.t].sz&&o.y<c.y+s&&c.y<o.y+T[o.t].sz);
  if(hit)return `Overlaps ${objName(hit)} (X:${hit.x} Y:${hit.y}).`;
  if(d.terr){let okT=true;cellsOf(c,(x,y)=>{if(base(x,y)!==d.terr)okT=false;});
    if(!okT)return d.terr==='plain'?'A Plain HQ must stand on plain (X and Y 300 to 899, outside the fertile land 450 to 749).':'A Wilderness HQ must stand on badland (outside the plain: X or Y below 300 or above 899).';}
  if(!d.al)return '';
  if(!c.a)return 'Pick an alliance for this building first.';
  if(d.uniq&&others.some(o=>o.a===c.a&&T[o.t].uniq===d.uniq))return d.uniq==='great'?'Each alliance has only one Great building.':`This alliance already has a ${d.n}.`;
  let r=pre;if(!r){const list=others.slice();list.splice(idx==null?list.length:idx,0,c);r=compute(list);}
  const claim=r.claims.get(c.a)||new Set();
  let foreign=false,inside=true,onOwn=false;
  cellsOf(c,(x,y)=>{const k=ck(x,y),w=r.own.get(k);if(w&&w.a!==c.a)foreign=true;if(claim.has(k))onOwn=true;else inside=false;});
  if(foreign)return "It stands on another alliance's territory.";
  if(d.connect&&!r.active.has(c.id)&&!onOwn)return 'A flag must touch your territory: build an HQ first, or put the flag next to your territory.';
  if(d.full&&!inside)return `${d.n} must be fully inside your alliance territory.`;
  return '';}
function refresh(){terr=compute(st.objs);bad=new Map();
  st.objs.forEach((o,i)=>{const others=st.objs.filter(x=>x!==o),r=why(o,others,i,terr);if(r)bad.set(o.id,r);});}

/* ---------- view ---------- */
const cv=$('map'),ctx=cv.getContext('2d'),wrap=$('wrap');
let W=0,H=0,dpr=1;
const V=()=>st.view;
const org=()=>{const v=V();return [W/2-(v.x-v.y)*v.s,H/2+(v.x+v.y)*v.s];};
function P(wx,wy){const v=V(),[ox,oy]=org();return [ox+(wx-wy)*v.s,oy-(wx+wy)*v.s];}
function toWorld(sx,sy){const v=V(),[ox,oy]=org(),u=(sx-ox)/v.s,q=(oy-sy)/v.s;return [(u+q)/2,(q-u)/2];}
function resize(){const r=wrap.getBoundingClientRect();dpr=window.devicePixelRatio||1;W=Math.max(1,r.width);H=Math.max(1,r.height);
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';draw();}
const draw=()=>{if(draw.q)return;draw.q=requestAnimationFrame(()=>{draw.q=0;paint();});};
function zoomAt(sx,sy,f){const v=V(),a=toWorld(sx,sy);v.s=Math.min(40,Math.max(.3,v.s*f));const b=toWorld(sx,sy);
  v.x=Math.min(N,Math.max(0,v.x+a[0]-b[0]));v.y=Math.min(N,Math.max(0,v.y+a[1]-b[1]));saveSoon();draw();}
function centerOn(x,y,s){const v=V();v.x=x;v.y=y;if(s)v.s=Math.max(v.s,s);saveSoon();draw();}
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;};

function poly(x0,y0,x1,y1){const a=P(x0,y0),b=P(x1,y0),c=P(x1,y1),d=P(x0,y1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();}
function rect(x0,y0,x1,y1,fill,stroke,lw,dash){ctx.beginPath();poly(x0,y0,x1,y1);if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);}}
function label(txt,x,y,size,color,maxW){if(!txt)return;const [sx,sy]=P(x,y);ctx.font=`600 ${size}px "IBM Plex Sans",system-ui,sans-serif`;
  if(maxW&&ctx.measureText(txt).width>maxW){while(txt.length>1&&ctx.measureText(txt+'…').width>maxW)txt=txt.slice(0,-1);txt+='…';}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,size/4);ctx.strokeStyle='rgba(255,255,255,.9)';
  ctx.strokeText(txt,sx,sy);ctx.fillStyle=color||'#1b2027';ctx.fillText(txt,sx,sy);}
const hexA=(h,a)=>`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`;
function bbox(){const c=[toWorld(0,0),toWorld(W,0),toWorld(0,H),toWorld(W,H)];
  return [Math.max(0,Math.floor(Math.min(...c.map(p=>p[0])))),Math.max(0,Math.floor(Math.min(...c.map(p=>p[1])))),
    Math.min(N,Math.ceil(Math.max(...c.map(p=>p[0])))),Math.min(N,Math.ceil(Math.max(...c.map(p=>p[1]))))];}
let ghost=null;   /* {o, bad, moving} */
function colorOf(o){if(o.c)return o.c;const a=alOf(o.a);return a?a.color:'#8a8f98';}
function paint(){const s=V().s,dark=isDark();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--sunk').trim()||'#e2e6ea';ctx.fillRect(0,0,W,H);
  rect(0,0,N,N,'#93ad5f');rect(300,300,900,900,'#a9cf6b');rect(450,450,750,750,'#6dbb84');
  rect(552,552,648,648,'#bba98f');rect(586,586,614,614,'#97a3b6');rect(594,594,606,606,'#c99a62');
  if(dark){rect(0,0,N,N,'rgba(10,14,20,.28)');}
  const [bx0,by0,bx1,by1]=bbox();
  /* territory */
  terr.claims.forEach((claim,a)=>{const al=alOf(a);if(!al||!claim.size)return;ctx.beginPath();const edges=[],rows=new Map();
    claim.forEach(k=>{const x=Math.floor(k/2048),y=k%2048;if(x<bx0-1||x>bx1||y<by0-1||y>by1)return;
      let r=rows.get(y);if(!r)rows.set(y,r=[]);r.push(x);
      if(!claim.has(ck(x-1,y)))edges.push([x,y,x,y+1]);if(!claim.has(ck(x+1,y)))edges.push([x+1,y,x+1,y+1]);
      if(!claim.has(ck(x,y-1)))edges.push([x,y,x+1,y]);if(!claim.has(ck(x,y+1)))edges.push([x,y+1,x+1,y+1]);});
    /* one strip per run of tiles in a row: far fewer shapes than one per tile */
    rows.forEach((xs,y)=>{xs.sort((p,q)=>p-q);let x0=xs[0],x1=x0;for(let i=1;i<=xs.length;i++){if(xs[i]===x1+1){x1++;continue;}poly(x0,y,x1+1,y+1);x0=x1=xs[i];}});
    ctx.fillStyle=hexA(al.color,.3);ctx.fill();ctx.beginPath();edges.forEach(([x0,y0,x1,y1])=>{const p=P(x0,y0),q=P(x1,y1);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);});
    ctx.strokeStyle=al.color;ctx.lineWidth=Math.min(2.5,Math.max(1,s/4));ctx.stroke();});
  /* grid */
  const step=s>=5?1:s>=1.1?10:100;ctx.lineWidth=1;
  for(const major of [false,true]){ctx.beginPath();
    for(let x=Math.ceil(bx0/step)*step;x<=bx1;x+=step){const m=x%100===0||(step===1&&x%10===0);if(m!==major)continue;const p=P(x,by0),q=P(x,by1);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}
    for(let y=Math.ceil(by0/step)*step;y<=by1;y+=step){const m=y%100===0||(step===1&&y%10===0);if(m!==major)continue;const p=P(bx0,y),q=P(bx1,y);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}
    ctx.strokeStyle=major?'rgba(20,30,20,.28)':'rgba(20,30,20,.1)';ctx.stroke();}
  rect(0,0,N,N,null,'rgba(20,30,20,.5)',1.5);
  /* castle */
  rect(CASTLE.x,CASTLE.y,CASTLE.x+6,CASTLE.y+6,'#8b5a2b','#4a2d12',sel==='castle'?3:1.5);
  TURRETS.forEach(([x,y])=>rect(x,y,x+2,y+2,'#7a5c9e','#3d2a57',1));
  /* buildings, back to front */
  const vis=st.objs.filter(o=>o.x+T[o.t].sz>=bx0&&o.x<=bx1&&o.y+T[o.t].sz>=by0&&o.y<=by1).sort((a,b)=>(b.x+b.y)-(a.x+a.y));
  vis.forEach(o=>{const d=T[o.t],c=colorOf(o),moving=ghost&&ghost.moving&&ghost.o.id===o.id;
    rect(o.x,o.y,o.x+d.sz,o.y+d.sz,o.t==='town'?hexA(c,moving?.25:.75):(moving?hexA(c,.3):c),o.t==='town'?'#1b2027':'#111',o.t==='town'?1:1.5);
    if(o.t.startsWith('trap'))rect(o.x+.6,o.y+.6,o.x+2.4,o.y+2.4,'rgba(255,255,255,.35)');
    if(bad.has(o.id))rect(o.x-.15,o.y-.15,o.x+d.sz+.15,o.y+d.sz+.15,null,'#d01c1c',2,[4,3]);});
  if(jlArea)rect(jlArea[0],jlArea[1],jlArea[2]+1,jlArea[3]+1,null,'rgba(255,255,255,.85)',1.5,[8,6]);   /* last square loaded from Jeabslist */
  /* selection and ghost */
  const so=selObj();
  if(so){const r=rangeRect(so);if(r)rect(r[0],r[1],r[0]+r[2],r[1]+r[2],null,'#fff',1.5,[6,4]);
    rect(so.x-.1,so.y-.1,so.x+T[so.t].sz+.1,so.y+T[so.t].sz+.1,null,'#b8430f',3);}
  if(ghost){const o=ghost.o,d=T[o.t],r=rangeRect(o);
    if(r)rect(r[0],r[1],r[0]+r[2],r[1]+r[2],ghost.bad?'rgba(208,28,28,.08)':'rgba(255,255,255,.12)',ghost.bad?'#d01c1c':'#fff',1.5,[6,4]);
    rect(o.x,o.y,o.x+d.sz,o.y+d.sz,ghost.bad?'rgba(208,28,28,.55)':'rgba(31,160,90,.6)',ghost.bad?'#8c1010':'#0d5c33',2);}
  /* labels */
  if(s>=2.2){label('Castle',CASTLE.x+3,CASTLE.y+3,Math.min(16,Math.max(10,s*1.3)),'#4a2d12');}
  vis.forEach(o=>{const d=T[o.t];if(o.t==='town'?s<5:s<3)return;const fs=Math.min(13,Math.max(9,s*(o.t==='town'?.9:1)));
    let t=o.t==='town'?(o.n||''):(o.t==='flag'?'⚑':d.lab);if(o.t!=='town'&&o.t!=='flag'){const a=alOf(o.a);if(a&&a.tag&&s>=6)t=a.tag+' '+t;}
    label(t,o.x+d.sz/2,o.y+d.sz/2,fs,null,o.t==='town'?Math.max(18,s*3.4):null);});
  /* big alliance tag over its towns (10 or more), like players draw on their own map pictures */
  if(s<=16)st.al.forEach(a=>{const ts=st.objs.filter(o=>o.a===a.id&&o.t==='town');if(ts.length<10||!(a.tag||a.name))return;
    const cx=ts.reduce((t,o)=>t+o.x+1,0)/ts.length,cy=ts.reduce((t,o)=>t+o.y+1,0)/ts.length;
    const [px,py]=P(cx,cy);if(px<-200||px>W+200||py<-100||py>H+100)return;
    const fs=Math.min(44,Math.max(14,s*3.2));ctx.font=`700 ${fs}px "Cinzel",Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineJoin='round';ctx.lineWidth=fs/5;ctx.strokeStyle='rgba(255,255,255,.85)';const t=a.tag||a.name;ctx.strokeText(t,px,py);ctx.fillStyle='#111';ctx.fillText(t,px,py);});
  if(so&&s>=1.5){const z=T[so.t].sz,[,ty]=P(so.x+z,so.y+z),[,cy]=P(so.x+z/2,so.y+z/2),k=(cy-ty+12)/(2*s);   /* just above its top corner */
    label(`X:${so.x} Y:${so.y}`,so.x+z/2+k,so.y+z/2+k,12,'#b8430f');}}

/* ---------- selection & building ---------- */
const selObj=()=>sel&&sel!=='castle'?st.objs.find(o=>o.id===sel)||null:null;
function cellAt(e){const r=cv.getBoundingClientRect(),[wx,wy]=toWorld(e.clientX-r.left,e.clientY-r.top);return [Math.floor(wx),Math.floor(wy),wx,wy];}
function objAt(x,y){for(let i=st.objs.length-1;i>=0;i--){const o=st.objs[i],s=T[o.t].sz;if(x>=o.x&&x<o.x+s&&y>=o.y&&y<o.y+s)return o;}
  if(x>=594&&x<606&&y>=594&&y<606)return 'castle';return null;}
function candidate(t,x,y,a){const s=T[t].sz,o=(s-1)>>1;return {id:'__new',t,x:x-o,y:y-o,a:T[t].al||t==='town'?a:'',n:''};}
function place(t,x,y){if(st.objs.length>=MAXO){say(`${MAXO} buildings and towns at most on one plan.`,'err');return;}
  const c=candidate(t,x,y,st.act),r=why(c,st.objs);
  if(r&&!st.ignore){say(r,'err');return;}
  change(()=>{c.id=newId('o');st.objs.push(c);});
  if(t!=='town'&&t!=='flag'){sel=c.id;setTool('select');}
  say(r?`${T[t].n} placed against the rules: ${r}`:`${T[t].n} placed at X:${c.x} Y:${c.y}.`,r?'warn':'ok');}
function change(fn){pushUndo();fn();after();}
function after(){refresh();save();draw();drawSel();drawList();drawAls();}
function setTool(t){tool=t;ghost=null;document.querySelectorAll('#tools [data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t||(t.startsWith('g')&&b.dataset.tool==='great')?'true':'false'));
  const g=$('tool-great');if(g&&!GREAT.includes(t))g.value='';cv.style.cursor=t==='select'?'grab':'crosshair';draw();}
function select(id,center){sel=id;const o=selObj();if(center){if(o)centerOn(o.x+T[o.t].sz/2,o.y+T[o.t].sz/2,6);else if(id==='castle')centerOn(600,600,6);}
  drawSel();drawList();draw();}

/* ---------- pointer: pan, zoom, place, drag ---------- */
const pts=new Map();let drag=null,pinch=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
  if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1])};drag=null;ghost=null;return;}
  const [x,y]=cellAt(e),hit=tool==='select'?objAt(x,y):null;
  drag={sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false,obj:hit&&hit!=='castle'?hit:null,cell:[x,y]};});
cv.addEventListener('pointermove',e=>{const [x,y]=cellAt(e);hover(x,y);
  if(pts.has(e.pointerId))pts.set(e.pointerId,[e.clientX,e.clientY]);
  if(pinch&&pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),r=cv.getBoundingClientRect();
    if(pinch.d>0)zoomAt((a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top,d/pinch.d);pinch.d=d;return;}
  if(!drag){if(tool!=='select'&&e.pointerType!=='touch'){const c=candidate(tool,x,y,st.act);ghost={o:c,bad:!!why(c,st.objs)};draw();}return;}
  if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6)return;
  drag.moved=true;drag.last=[x,y];
  if(drag.obj){const o=drag.obj,sz=T[o.t].sz,c={...o,x:x-((sz-1)>>1),y:y-((sz-1)>>1)};
    ghost={o:c,moving:true,bad:!!why(c,st.objs.filter(q=>q!==o),st.objs.indexOf(o))};draw();return;}
  const v=V(),dx=e.clientX-drag.lx,dy=e.clientY-drag.ly,du=dx/v.s,dq=-dy/v.s;
  v.x=Math.min(N,Math.max(0,v.x-(du+dq)/2));v.y=Math.min(N,Math.max(0,v.y-(dq-du)/2));drag.lx=e.clientX;drag.ly=e.clientY;cv.style.cursor='grabbing';saveSoon();draw();});
function up(e){pts.delete(e.pointerId);if(pinch){if(pts.size<2)pinch=null;drag=null;return;}
  const d=drag;drag=null;if(!d)return;cv.style.cursor=tool==='select'?'grab':'crosshair';
  if(d.obj&&d.moved&&d.obj.t==='town'&&d.last){const o=d.obj;let h=objAt(d.last[0],d.last[1]);
    if((!h||h===o)&&ghost&&ghost.moving){const g=ghost.o,ov=st.objs.filter(q=>q!==o&&q.t==='town'&&q.x<g.x+2&&g.x<q.x+2&&q.y<g.y+2&&g.y<q.y+2);if(ov.length===1)h=ov[0];}
    if(h&&h!==o&&h!=='castle'&&h.t==='town'){ghost=null;change(()=>{const x=o.x,y=o.y;o.x=h.x;o.y=h.y;h.x=x;h.y=y;});sel=o.id;drawSel();
      say(`${o.n||'Town'} and ${h.n||'Town'} swapped places.`,'ok');return;}}
  if(d.obj&&d.moved&&ghost&&ghost.moving){const g=ghost;ghost=null;const o=d.obj,r=why(g.o,st.objs.filter(q=>q!==o),st.objs.indexOf(o));
    if(r&&!st.ignore){say(r,'err');draw();return;}
    change(()=>{o.x=g.o.x;o.y=g.o.y;});sel=o.id;drawSel();say(r?`Moved against the rules: ${r}`:`${objName(o)} moved to X:${o.x} Y:${o.y}.`,r?'warn':'ok');return;}
  if(d.moved)return;
  const [x,y]=d.cell;
  if(tool==='select'){const h=objAt(x,y);select(h?(h==='castle'?'castle':h.id):null);}
  else place(tool,x,y);}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);pinch=null;drag=null;ghost=null;draw();});
cv.addEventListener('pointerleave',()=>{if(!drag&&ghost&&!ghost.moving){ghost=null;draw();}});
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.15:1/1.15);},{passive:false});
function hover(x,y){const el=$('hover');if(x<0||y<0||x>=N||y>=N){el.textContent='Outside the kingdom.';return;}
  const ov=overlay(x,y),w=terr.own.get(ck(x,y)),a=w&&alOf(w.a),h=objAt(x,y);
  el.textContent=`X:${x} Y:${y} · ${TERR[ov||base(x,y)]}${ov?'':''}${a?' · '+alName(a)+' territory':''}${h?' · '+(h==='castle'?"King's Castle":objName(h)):''}`;}

/* ---------- toolbar ---------- */
$('tools').innerHTML=TOOLS.map(([t,n,k])=>`<button type="button" data-tool="${t}" title="${n} (${k})">${n}</button>`).join('')+
  `<select id="tool-great" data-tool="great" aria-label="Great building"><option value="">Great building…</option>${GREAT.map(t=>`<option value="${t}">${T[t].n}</option>`).join('')}</select>`;
$('tools').addEventListener('click',e=>{const b=e.target.closest('button[data-tool]');if(b)setTool(b.dataset.tool);});
$('tool-great').addEventListener('change',e=>{if(e.target.value)setTool(e.target.value);else setTool('select');});
$('active-al').addEventListener('change',e=>{st.act=e.target.value;save();});
$('ignore').addEventListener('change',e=>{st.ignore=e.target.checked;save();});
$('btn-undo').addEventListener('click',doUndo);
function doUndo(){const u=undo.pop();if(!u){say('Nothing to undo.','warn');return;}const r=JSON.parse(u);st.al=r.al;st.objs=r.objs;st.act=r.act;
  if(sel&&sel!=='castle'&&!selObj())sel=null;after();say('Undone.','ok');}
const ctr=()=>[W/2,H/2];
$('btn-zin').addEventListener('click',()=>zoomAt(...ctr(),1.4));
$('btn-zout').addEventListener('click',()=>zoomAt(...ctr(),1/1.4));
$('btn-castle').addEventListener('click',()=>centerOn(600,600,6));
$('btn-go').addEventListener('click',()=>{const x=int($('go-x').value,0,N-1,NaN),y=int($('go-y').value,0,N-1,NaN);
  if(!Number.isFinite(x)||!Number.isFinite(y)){say('Enter X and Y (0 to 1199).','err');return;}centerOn(x+.5,y+.5,6);});
const box=$('mp-box');
function full(on){box.classList.toggle('mp-full',on);document.body.classList.toggle('mp-lock',on);$('btn-full').textContent=on?'Exit full screen':'Full screen';resize();}
$('btn-full').addEventListener('click',()=>full(!box.classList.contains('mp-full')));
document.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.altKey||e.metaKey)return;
  if(e.ctrlKey){if(e.key==='z'){e.preventDefault();doUndo();}return;}
  const t=TOOLS.find(x=>x[2]===e.key);if(t){setTool(t[0]);return;}
  if(e.key==='Escape'){if(box.classList.contains('mp-full'))full(false);setTool('select');select(null);}
  else if((e.key==='Delete'||e.key==='Backspace')&&selObj()){e.preventDefault();del(selObj());}
  else if(e.key==='+'||e.key==='=')zoomAt(...ctr(),1.4);else if(e.key==='-')zoomAt(...ctr(),1/1.4);});
function del(o){change(()=>{st.objs=st.objs.filter(x=>x!==o);});sel=null;drawSel();say(`${objName(o)} deleted.`,'ok');}

/* ---------- selected panel ---------- */
const fmtPow=v=>v>=1e9?(v/1e9).toFixed(2)+'B':v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?Math.round(v/1e3)+'K':String(v);
const dist=(o)=>{const s=T[o.t].sz;return Math.hypot(o.x+s/2-600,o.y+s/2-600);};
function alOptions(cur,none){return (none?`<option value=""${cur?'':' selected'}>No alliance</option>`:'')+st.al.map(a=>`<option value="${a.id}"${a.id===cur?' selected':''}>${esc(alName(a))}</option>`).join('');}
function townsBlock(){return `<div class="mp-towns"><h3>Towns around it, in order</h3>
  <p class="mp-note">The first player gets the closest spot, then the square fills ring by ring. A player who already has a town on the map is moved, not copied.
  <i>Load the towns around it</i> lists the players already here, closest first: change the order and press <i>Arrange</i>.</p>
  <label class="field"><span class="label">Player names, one per line</span><textarea id="tw-names" rows="8" spellcheck="false" placeholder="Strongest first"></textarea></label>
  <div class="mp-row"><label class="field"><span class="label">or how many blank towns</span><input id="tw-n" type="number" min="1" max="200" value="10"></label>
  <label class="field"><span class="label">New towns' alliance</span><select id="tw-al">${alOptions(st.act,true)}</select></label>
  <label class="field"><span class="label">Gap between towns</span><select id="tw-gap"><option value="0">None</option><option value="1">1 tile</option></select></label></div>
  <div class="btns" style="margin-top:8px"><button id="tw-go" type="button" class="primary">Arrange</button><button id="tw-load" type="button">Load the towns around it</button>${st.objs.some(o=>o.p)?'<button id="tw-pow" type="button" title="Uses the power loaded from Jeabslist">Sort by power</button>':''}</div></div>`;}
/* rectangle of the building towns are arranged around (castle = its 6×6) */
const anchorOf=o=>o?{x:o.x,y:o.y,sz:T[o.t].sz,id:o.id}:{x:CASTLE.x,y:CASTLE.y,sz:CASTLE.sz,id:'castle'};
/* tiles between a sz×sz block at (x,y) and the anchor, counted in square rings (0 = touching) */
const gapTo=(b,x,y,sz)=>Math.max(0,b.x-(x+sz),x-(b.x+b.sz),b.y-(y+sz),y-(b.y+b.sz));
const ringKey=(b,x,y)=>{const cx=b.x+b.sz/2,cy=b.y+b.sz/2;return [gapTo(b,x,y,2),Math.hypot(x+1-cx,y+1-cy),Math.atan2(y+1-cy,x+1-cx)];};
const keyCmp=(p,q)=>p[0]-q[0]||p[1]-q[1]||p[2]-q[2];
/* towns whose closest trap / HQ / Great building / castle is this one, closest first */
function townsAround(b){const anchors=[anchorOf(null),...st.objs.filter(o=>o.t!=='town'&&o.t!=='flag').map(anchorOf)];
  return st.objs.filter(t=>t.t==='town').map(t=>{let best=null,bg=1e9;anchors.forEach(a=>{const g=gapTo(a,t.x,t.y,2);if(g<bg){bg=g;best=a;}});
    return best&&best.id===b.id&&bg<=(b.id==='castle'?80:20)?[ringKey(b,t.x,t.y),t]:null;}).filter(Boolean).sort((p,q)=>keyCmp(p[0],q[0])).map(p=>p[1]);}
function loadTowns(){const b=anchorOf(selObj()),list=townsAround(b);
  if(!list.length){say('No towns around it yet.','warn');return;}
  $('tw-names').value=list.map(t=>t.n||'').join('\n');
  say(`${list.length} towns listed, closest first.${list.some(t=>!t.n)?' Towns without a name show as empty lines and stay where they are.':''}`,'ok');}
/* names in the box, strongest first: power of the town with that name (loaded from Jeabslist); unknown ones keep their order at the end */
function sortByPower(){const lines=$('tw-names').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length){say('List the players first (or press Load the towns around it).','warn');return;}
  const pw=new Map();st.objs.forEach(o=>{if(o.t==='town'&&o.n&&o.p){const k=o.n.toLowerCase();pw.set(k,Math.max(pw.get(k)||0,o.p));}});
  const r=lines.map((n,i)=>[n,pw.get(n.toLowerCase())||0,i]).sort((a,b)=>b[1]-a[1]||a[2]-b[2]);
  $('tw-names').value=r.map(x=>x[0]).join('\n');const miss=r.filter(x=>!x[1]).length;
  say(`Sorted strongest first.${miss?` ${miss} player${miss>1?'s':''} without a known power stay${miss>1?'':'s'} at the end.`:''} Press Arrange to place them.`,miss?'warn':'ok');}
function placeTowns(){const b=anchorOf(selObj());
  const lines=$('tw-names').value.split('\n').map(s=>s.trim().slice(0,24)),names=lines.filter(Boolean);
  const n=names.length||int($('tw-n').value,1,200,10),a=$('tw-al').value,gap=+$('tw-gap').value;
  /* players who already have a town are moved: first town with that name (any case) */
  const used=new Set(),plan=[];
  for(let i=0;i<n;i++){const nm=names[i]||'',low=nm.toLowerCase();
    const t=nm?st.objs.find(o=>o.t==='town'&&!used.has(o)&&o.n.toLowerCase()===low):null;if(t)used.add(t);plan.push({nm,t});}
  const occ=new Set(),mark=(x0,y0,s,g)=>{for(let x=x0-g;x<x0+s+g;x++)for(let y=y0-g;y<y0+s+g;y++)occ.add(ck(x,y));};
  st.objs.forEach(q=>{if(!used.has(q))mark(q.x,q.y,T[q.t].sz,0);});
  const cand=[],R=b.id==='castle'?70:40;   /* the ruins reach 45 tiles from the castle */
  for(let x=Math.max(0,b.x-R-2);x<=Math.min(N-2,b.x+b.sz+R);x++)for(let y=Math.max(0,b.y-R-2);y<=Math.min(N-2,b.y+b.sz+R);y++)cand.push([...ringKey(b,x,y),x,y]);
  cand.sort(keyCmp);
  const spots=[];
  for(const c of cand){if(spots.length>=n)break;const x=c[3],y=c[4];let free=true;
    for(let i=0;i<2&&free;i++)for(let j=0;j<2&&free;j++)if(occ.has(ck(x+i,y+j))||overlay(x+i,y+j)==='castle')free=false;
    if(!free)continue;spots.push([x,y]);mark(x,y,2,gap);}
  if(!spots.length){say('No free tiles found nearby.','err');return;}
  let moved=0,added=0;
  change(()=>{spots.forEach(([x,y],i)=>{const p=plan[i];if(p.t){p.t.x=x;p.t.y=y;moved++;}
    else{st.objs.push({id:newId('o'),t:'town',x,y,a,n:p.nm,c:''});added++;}});});
  const left=n-spots.length;
  say(`${moved?moved+' moved':''}${moved&&added?', ':''}${added?added+' new':''}${left?` · ${left} didn't fit within ${R} tiles${plan.slice(spots.length).some(p=>p.t)?' (their towns stay where they were)':''}`:''}. Undo puts everything back.`,left?'warn':'ok');}
function drawSel(){const el=$('sel'),o=selObj();
  if(sel==='castle'){el.innerHTML=`<p class="mp-kv"><b>King's Castle</b> · X:597 Y:597 · 6×6</p>
    <p class="mp-note">Towns can stand right next to the castle area (X/Y 594 to 605). Alliance buildings stay out of the forbidden ring (586 to 613) and the ruins (552 to 647).</p>${townsBlock()}`;return;}
  if(!o){el.innerHTML='<p class="mp-empty">Click a building on the map (with <i>Select</i>) to edit it.</p>';return;}
  const d=T[o.t],r=bad.get(o.id),own=terr.mine.get(o.id),act=terr.active.has(o.id);
  el.innerHTML=`<p class="mp-kv"><b>${esc(d.n)}</b> · ${d.sz}×${d.sz}${d.range?` · claims ${d.range}×${d.range}`:''}</p>
  <div class="mp-row">
   <label class="field"><span class="label">${o.t==='town'?'Player':'Name'}</span><input id="s-n" type="text" data-f="n" maxlength="24" value="${esc(o.n)}" placeholder="${esc(d.n)}"></label>
   <label class="field"><span class="label">Alliance</span><select id="s-a">${alOptions(o.a,true)}</select></label></div>
  <div class="mp-row">
   <label class="field"><span class="label">X</span><input id="s-x" type="number" min="0" max="${N-d.sz}" value="${o.x}"></label>
   <label class="field"><span class="label">Y</span><input id="s-y" type="number" min="0" max="${N-d.sz}" value="${o.y}"></label></div>
  <div class="mp-row mp-colrow"><label class="mp-inl">Marker colour <input id="s-c" type="color" value="${o.c||colorOf(o)}"></label>${o.c?'<button id="s-c0" type="button">Use alliance colour</button>':''}</div>
  <p class="msg ${r?'err':'ok'}">${r?esc(r):'Placement OK.'}</p>
  <p class="mp-note">${o.p?`Power ${fmtPow(o.p)} (Jeabslist) · `:''}${Math.round(dist(o))} tiles from the castle${d.range&&own?` · ${act?`claims ${own.length} tiles`:'not connected: claims nothing'}`:''}</p>
  <div class="btns"><button id="s-center" type="button">Show on map</button><button id="s-del" type="button">Delete</button></div>
  ${o.t==='town'||o.t==='flag'?'':townsBlock()}`;}
$('sel').addEventListener('focusin',e=>{if(e.target.id==='s-n')pushUndo();});
$('sel').addEventListener('input',e=>{const o=selObj();if(o&&e.target.id==='s-n'){o.n=e.target.value.slice(0,24);saveSoon();draw();drawList();}});
$('sel').addEventListener('change',e=>{const o=selObj(),id=e.target.id;
  if(o&&id==='s-a'){change(()=>{o.a=e.target.value;});return;}
  if(o&&id==='s-c'){change(()=>{o.c=e.target.value;});return;}
  if(o&&(id==='s-x'||id==='s-y')){const sz=T[o.t].sz,c={...o,x:int($('s-x').value,0,N-sz,o.x),y:int($('s-y').value,0,N-sz,o.y)},
    r=why(c,st.objs.filter(q=>q!==o),st.objs.indexOf(o));
    if(r&&!st.ignore){say(r,'err');drawSel();return;}change(()=>{o.x=c.x;o.y=c.y;});centerOn(o.x+sz/2,o.y+sz/2);}});
$('sel').addEventListener('click',e=>{const o=selObj();
  if(e.target.id==='s-center'&&o)select(o.id,true);
  else if(e.target.id==='s-del'&&o)del(o);
  else if(e.target.id==='s-c0'&&o)change(()=>{o.c='';});
  else if(e.target.id==='tw-go')placeTowns();
  else if(e.target.id==='tw-load')loadTowns();
  else if(e.target.id==='tw-pow')sortByPower();});

/* ---------- alliances & list ---------- */
function drawAls(){const el=$('als');
  if(!document.activeElement||!el.contains(document.activeElement))
    el.innerHTML=st.al.length?st.al.map(a=>{const n=st.objs.filter(o=>o.a===a.id).length;
      return `<div class="mp-al" data-id="${a.id}"><input type="color" data-f="color" value="${a.color}" aria-label="Colour">
      <input type="text" data-f="tag" maxlength="4" value="${esc(a.tag)}" placeholder="TAG" aria-label="Tag" class="mp-tag">
      <input type="text" data-f="name" maxlength="30" value="${esc(a.name)}" placeholder="Alliance name" aria-label="Name">
      <span class="mp-cnt">${n} building${n===1?'':'s'}</span><button type="button" class="mp-del" data-del="${a.id}">Delete</button></div>`;}).join('')
      :'<p class="mp-empty">No alliance yet.</p>';
  el.querySelectorAll('[data-del]').forEach(b=>{if(b.dataset.wired)return;b.dataset.wired=1;
    KS.confirmButton(b,()=>{const id=b.dataset.del;change(()=>{st.objs=st.objs.filter(o=>o.a!==id||o.t==='town');st.objs.forEach(o=>{if(o.a===id)o.a='';});
      st.al=st.al.filter(a=>a.id!==id);if(st.act===id)st.act=st.al[0]?st.al[0].id:'';});if(sel&&sel!=='castle'&&!selObj())sel=null;drawSel();say('Alliance deleted with its buildings (its towns stay, without alliance).','ok');},'Delete it and its buildings?');});
  $('active-al').innerHTML=st.al.length?alOptions(st.act,false):'<option value="">No alliance</option>';}
$('als').addEventListener('focusin',e=>{if(e.target.dataset.f)pushUndo();});
$('als').addEventListener('input',e=>{const row=e.target.closest('.mp-al'),f=e.target.dataset.f;if(!row||!f)return;const a=alOf(row.dataset.id);if(!a)return;
  a[f]=f==='color'?e.target.value:e.target.value.slice(0,f==='tag'?4:30);saveSoon();draw();drawList();
  $('active-al').innerHTML=alOptions(st.act,false);});
$('als').addEventListener('focusout',e=>{setTimeout(()=>{if(!$('als').contains(document.activeElement)){save();drawAls();drawSel();}},0);});
$('btn-al-add').addEventListener('click',()=>{if(st.al.length>=20){say('20 alliances at most.','warn');return;}
  change(()=>{const id=newId('a');st.al.push({id,tag:'',name:'Alliance '+(st.al.length+1),color:COLORS[st.al.length%COLORS.length]});st.act=id;});});
function drawList(){const groups=[...st.al.map(a=>[a,st.objs.filter(o=>o.a===a.id)]),[null,st.objs.filter(o=>!o.a)]].filter(g=>g[1].length);
  $('list').innerHTML=groups.length?groups.map(([a,objs])=>{const towns=objs.filter(o=>o.t==='town'),blds=objs.filter(o=>o.t!=='town');
    const item=o=>`<li><button type="button" class="mp-item${o.id===sel?' on':''}" data-id="${o.id}">${bad.has(o.id)?'<span class="mp-bad" title="Breaks a rule">!</span>':''}${esc(o.t==='town'?(o.n||'Town'):objName(o))}<span>X:${o.x} Y:${o.y}</span></button></li>`;
    return `<div class="mp-grp"><h3><i style="background:${a?a.color:'#8a8f98'}"></i>${esc(alName(a))}</h3>
      ${blds.length?`<ul class="mp-items">${blds.map(item).join('')}</ul>`:''}
      ${towns.length?`<details><summary>${towns.length} town${towns.length>1?'s':''}</summary><ul class="mp-items">${towns.map(item).join('')}</ul></details>`:''}</div>`;}).join('')
    :'<p class="mp-empty">Nothing built yet.</p>';}
$('list').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)select(b.dataset.id,true);});

/* ---------- Jeabslist: the real kingdom map (Jeabs Plus+ Premium) ----------
   GET /kingdoms/{kid}/map: entities {type,x,y,footprint,alliance (tag),alliance_id,seen_at,unconfirmed?}; x,y = lowest tile
   like ours (castle 597,597). city = town (name, player_id, power), alliance_hall = HQ (Plain or Wilderness by where it
   stands), alliance_trap conf_id 4 = Trap 1, 19 = Trap 2 (checked on the OPS map), alliance_resource = Great building
   (kind not given). Mines, forts, towers and the castle aren't planner buildings.
   "My alliance" (alliance_id) is a stored read and replaces the plan; "the area in view" (square r 30 around the view
   centre) may start a live scan (player's quota) and replaces what the plan had in that square. */
const JL_R=30,TRAP_CONF={4:'trap1',19:'trap2'};
let jlArea=null,jlBusy=false;   /* last loaded square [x0,y0,x1,y1], drawn dashed */
function jlNote(html){$('jl-note').innerHTML=html;}
function jlState(){if(!window.JL)return;const acc=window.KSAccounts&&KSAccounts.linked(),tok=JL.hasToken();
  if(!st.kid&&acc&&acc.kingdom)st.kid=+acc.kingdom;
  if(document.activeElement!==$('jl-kid'))$('jl-kid').value=st.kid||'';
  $('jl-al').disabled=$('jl-area').disabled=jlBusy||!tok;
  jlNote(!tok?'Add your Jeabslist API token (Jeabs Plus+ Premium) in the account menu to load the real map. <button type="button" class="jl-lnk" data-jl-open>Open the account menu</button>'
    :!acc?'<i>My alliance</i> needs this game account linked to your Governor ID. <button type="button" class="jl-lnk" data-jl-open>Open the account menu</button>'
    :`Linked to ${esc(acc.name||'your governor')}${acc.alliance?` [${esc(acc.alliance)}]`:''}.`);}
const ago=iso=>{const t=Date.parse(iso);if(!t)return '';const m=Math.round((Date.now()-t)/6e4);
  return m<2?'just now':m<90?`${m} min ago`:m<48*60?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} days ago`;};
/* Jeabslist entities → plan objects; alliances matched by tag (any case) in al, new ones added */
function fromJeabs(ents,al){const objs=[],trapsOf=new Map();let other=0,noAl=0,unconf=0;
  const alFor=tag=>{tag=String(tag||'').trim().slice(0,4);if(!tag)return '';const low=tag.toLowerCase();
    let a=al.find(x=>x.tag.toLowerCase()===low);
    if(!a){if(al.length>=20){noAl++;return '';}const used=new Set(al.map(x=>x.color));
      a={id:'j'+(al.length+1)+Math.random().toString(36).slice(2,6),tag,name:'',color:COLORS.find(c=>!used.has(c))||COLORS[al.length%COLORS.length]};al.push(a);}
    return a.id;};
  const rank={alliance_hall:0,alliance_flag:1,alliance_trap:2,alliance_resource:3,city:4};   /* list order = who claims first */
  (Array.isArray(ents)?ents:[]).filter(e=>e&&e.type in rank&&Number.isFinite(+e.x)&&Number.isFinite(+e.y)).sort((a,b)=>rank[a.type]-rank[b.type]).forEach(e=>{
    const x=Math.round(+e.x),y=Math.round(+e.y),a=alFor(e.alliance);let t;
    if(e.type==='city')t='town';
    else if(e.type==='alliance_flag')t='flag';
    else if(e.type==='alliance_hall')t=base(x+1,y+1)==='badland'?'whq':'phq';
    else if(e.type==='alliance_resource')t='great';
    else{const have=trapsOf.get(a)||[];t=TRAP_CONF[e.conf_id]&&!have.includes(TRAP_CONF[e.conf_id])?TRAP_CONF[e.conf_id]:(have.includes('trap1')?'trap2':'trap1');have.push(t);trapsOf.set(a,have);}
    if(e.unconfirmed)unconf++;
    objs.push({id:'',t,x,y,a,n:t==='town'?String(e.name||'').trim().slice(0,24):'',c:'',p:t==='town'?+e.power||0:0});});
  other=(Array.isArray(ents)?ents.length:0)-objs.length;
  return {objs,other,noAl,unconf};}
async function jlLoad(kind){if(!window.JL||jlBusy)return;
  const kid=int($('jl-kid').value,1,99999,0);if(!kid){say('Enter the kingdom number first.','err');return;}
  st.kid=kid;save();
  const acc=window.KSAccounts&&KSAccounts.linked(),gen=KS.gen();let q,area=null;
  if(kind==='al'){if(!acc){say('Link this game account to your Governor ID first (account menu).','err');return;}}
  else{const v=V();q={x:Math.round(v.x),y:Math.round(v.y),r:JL_R,refresh:$('jl-fresh').checked};}
  jlBusy=true;jlState();
  try{
    if(kind==='al'){say('Asking Jeabslist for your alliance…','');const p=await JL.player(acc.fid);
      if(gen!==KS.gen())return;if(!p.allianceId){say('Jeabslist shows no alliance for this governor.','warn');return;}
      q={alliance:p.allianceId};}
    else say(`Loading the square X ${q.x-JL_R} to ${q.x+JL_R}, Y ${q.y-JL_R} to ${q.y+JL_R} of kingdom #${kid}…`,'');
    let d=await JL.kingdomMap(kid,q);if(gen!==KS.gen())return;
    if(d&&d.refresh==='queued'){const s=Math.min(60,Math.max(3,+d.retry_after_sec||10));
      say(`Jeabslist is scanning this area live: loading it again in ${s} seconds…`,'');
      await new Promise(r=>setTimeout(r,s*1e3));if(gen!==KS.gen())return;
      d=await JL.kingdomMap(kid,{...q,refresh:false,cached:true});if(gen!==KS.gen())return;}
    const ents=d&&Array.isArray(d.entities)?d.entities:[];
    if(kind==='al'){const al=[],r=fromJeabs(ents,al);if(!r.objs.length){say('Jeabslist has nothing stored for this alliance in this kingdom yet.','warn');return;}
      const mine=al.find(a=>acc.alliance&&a.tag.toLowerCase()===String(acc.alliance).toLowerCase());
      const objs=r.objs.slice(0,MAXO);objs.forEach((o,i)=>{o.id='o'+i.toString(36);});
      jlArea=null;
      load(clean({al,act:(mine||al[0]).id,objs,kid,view:st.view,ignore:st.ignore}),jlSummary(d,r,objs.length,'Your alliance loaded from the game')+' Undo brings back your previous map.');
      centerOnPlan();}
    else{const b=d&&d.region&&Array.isArray(d.region.bbox)?d.region.bbox:[q.x-JL_R,q.y-JL_R,q.x+JL_R,q.y+JL_R];area=b.map(Number);
      const al=st.al.map(a=>({...a})),r=fromJeabs(ents,al);
      change(()=>{st.al=al;const inA=o=>o.x>=area[0]&&o.x<=area[2]&&o.y>=area[1]&&o.y<=area[3];
        const add=r.objs,hit=o=>add.some(n=>o.x<n.x+T[n.t].sz&&n.x<o.x+T[o.t].sz&&o.y<n.y+T[n.t].sz&&n.y<o.y+T[o.t].sz);
        const keep=st.objs.filter(o=>!inA(o)&&!hit(o)),room=Math.max(0,MAXO-keep.length);
        add.slice(0,room).forEach(o=>{o.id=newId('o');});
        /* alliance buildings before towns so they claim first, like a fresh load */
        st.objs=[...keep.filter(o=>o.t!=='town'),...add.slice(0,room).filter(o=>o.t!=='town'),...keep.filter(o=>o.t==='town'),...add.slice(0,room).filter(o=>o.t==='town')];
        if(!alOf(st.act)&&st.al[0])st.act=st.al[0].id;
        r.cut=add.length-room;});
      jlArea=area;writeInputs();drawSel();
      say(jlSummary(d,r,r.objs.length-(r.cut>0?r.cut:0),'Area loaded from the game')+(r.cut>0?` ${r.cut} didn't fit (${MAXO} at most on one plan).`:'')+' It replaced what your plan had in that square; Undo puts it back.',r.cut>0?'warn':'ok');draw();}
  }catch(e){if(gen===KS.gen())say(e.message||"Couldn't load the map from Jeabslist.",'err');}
  finally{jlBusy=false;jlState();}}
function jlSummary(d,r,n,head){const c={};r.objs.slice(0,n).forEach(o=>{const k=o.t==='town'?'towns':o.t==='flag'?'flags':'buildings';c[k]=(c[k]||0)+1;});
  const parts=['towns','flags','buildings'].filter(k=>c[k]).map(k=>`${c[k]} ${c[k]===1?k.slice(0,-1):k}`);
  const seen=d&&(d.observed_at||(Array.isArray(d.entities)?d.entities.map(e=>e&&e.seen_at||'').sort().pop():''));
  const when=seen?` Last seen by Jeabslist ${ago(seen)}${d.stale?' (may be out of date)':''}.`:'';
  return `${head}: ${parts.join(', ')||'nothing'}.${when}${r.unconf?` ${r.unconf} not confirmed by the last scan.`:''}${r.noAl?` ${r.noAl} without alliance (20 alliances at most).`:''}`;}
if(window.JL){$('jl-box').hidden=false;
  $('jl-al').addEventListener('click',()=>jlLoad('al'));$('jl-area').addEventListener('click',()=>jlLoad('area'));
  $('jl-kid').addEventListener('change',()=>{st.kid=int($('jl-kid').value,0,99999,0);save();});
  $('jl-box').addEventListener('click',e=>{if(e.target.closest('[data-jl-open]')&&window.KSAccounts)KSAccounts.open();});
  window.addEventListener('ks-account-linked',jlState);window.addEventListener('storage',jlState);}

/* ---------- share code, picture, reset ---------- */
function pack(){const ai=new Map(st.al.map((a,i)=>[a.id,i]));
  const p={v:1,al:st.al.map(a=>[a.tag,a.name,a.color]),o:st.objs.map(o=>{const r=[o.t,o.x,o.y,ai.has(o.a)?ai.get(o.a):-1];if(o.n||o.c||o.p)r.push(o.n);if(o.c||o.p)r.push(o.c);if(o.p)r.push(o.p);return r;})};
  return 'KSM1:'+btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/=+$/,'');}
function unpack(code){const m=String(code).trim().match(/^KSM1:(.+)$/is);if(!m)throw new Error('Paste a code starting with KSM1:');
  let p;try{p=JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/\s+/g,'')))));}catch(e){throw new Error('This code is damaged: copy it again.');}
  if(!p||!Array.isArray(p.al)||!Array.isArray(p.o))throw new Error('This code is damaged: copy it again.');
  const al=p.al.map((a,i)=>({id:'a'+(i+1),tag:a[0],name:a[1],color:a[2]}));
  return clean({al,act:al[0]&&al[0].id,objs:p.o.map((o,i)=>({id:'o'+i.toString(36),t:o[0],x:o[1],y:o[2],a:o[3]>=0&&al[o[3]]?al[o[3]].id:'',n:o[4]||'',c:o[5]||'',p:o[6]||0})),kid:st.kid,view:st.view,ignore:st.ignore});}
/* kingshot.me map planner: its "Export Map" file (or the JSON of a shared map) */
const KME={town:'town',plain_hq:'phq',wilderness_hq:'whq',alliance_flag:'flag',hunting_trap_1:'trap1',hunting_trap_2:'trap2',
  great_resource_bread:'gbread',great_resource_wood:'gwood',great_resource_stone:'gstone',great_resource_iron:'giron'};
const KME_DEFAULT=/^(Town|Plain HQ|Wilderness HQ|Alliance Flag|Hunting Trap [12]|Great (Mill|Sawmill|Quarry|Iron Mine))( \d+)?$/i;
function fromKingshotMe(text){let j;try{j=JSON.parse(text);}catch(e){throw new Error("This isn't a kingshot.me map file.");}
  const s=j&&j.state&&typeof j.state==='object'?j.state:j;
  if(!s||!Array.isArray(s.objects))throw new Error("This isn't a kingshot.me map file.");
  const als=(Array.isArray(s.alliances)?s.alliances:[]).slice(0,20),ids=new Map();
  const al=als.map((a,i)=>{const id='a'+(i+1),nm=String(a&&a.name||'');ids.set(a&&a.id,id);
    return {id,tag:nm.length<=4?nm:'',name:nm.length<=4?'':nm,color:a&&a.color};});
  const objs=[];let skipped=0;
  s.objects.forEach(o=>{const t=o&&KME[o.type];if(!t){skipped++;return;}const nm=String(o.name||'').trim();
    objs.push({id:'o'+objs.length.toString(36),t,x:o.x,y:o.y,a:ids.get(o.allianceId)||'',n:KME_DEFAULT.test(nm)?'':nm,c:o.customColor||''});});
  if(objs.length>MAXO)skipped+=objs.length-MAXO;
  return {s:clean({al,act:al[0]&&al[0].id,objs,kid:st.kid,view:st.view,ignore:st.ignore}),skipped};}
function centerOnPlan(){const o=st.objs.find(q=>q.t.startsWith('trap'))||st.objs[0];if(o)centerOn(o.x+T[o.t].sz/2,o.y+T[o.t].sz/2,6);}
function importKme(text){try{const r=fromKingshotMe(text);load(r.s,`kingshot.me map imported: ${r.s.objs.length} buildings and towns${r.skipped?`, ${r.skipped} things skipped (not on this planner)`:''}. Undo brings back your previous map.`);centerOnPlan();}
  catch(e){say(e.message,'err');}}
$('btn-kme').addEventListener('click',()=>$('kme-file').click());
$('kme-file').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  if(f.size>5e6){say('This file is too big for a map plan.','err');return;}f.text().then(importKme,()=>say("Couldn't read this file.",'err'));});
/* examples (assets/map-examples.js) */
const EX=window.MAP_EXAMPLES||[];
$('ex').innerHTML='<option value="">Load an example…</option>'+EX.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');
$('ex').addEventListener('change',e=>{const ex=EX.find(x=>x.id===e.target.value);e.target.value='';if(!ex)return;
  const r=ex.state();r.objs.forEach((o,i)=>{o.id='o'+i.toString(36);});r.act=r.al[0]?r.al[0].id:'';r.kid=st.kid;r.view=st.view;r.ignore=st.ignore;
  load(clean(r),`Example loaded: ${ex.desc} Undo brings back your previous map.`);const [x,y]=ex.center;const v=V();v.x=x;v.y=y;v.s=8;saveSoon();draw();});   /* same zoom as a new map, so every plan shows squares at one size */
function load(s,txt){pushUndo();const view=st.view;st=s;st.view=view;sel=null;writeInputs();after();say(txt,'ok');}
$('btn-import').addEventListener('click',()=>{const v=$('code').value.trim();if(v.startsWith('{')){importKme(v);return;}
  try{load(unpack(v),'Map imported. Undo brings back your previous map.');centerOnPlan();}catch(e){say(e.message,'err');}});
$('btn-export').addEventListener('click',()=>KS.copyCode(pack(),'Map code copied.',say));
$('btn-link').addEventListener('click',()=>KS.copyCode(location.href.split('#')[0]+'#'+pack(),'Link copied. Opening it loads this map.',say));
$('btn-png').addEventListener('click',()=>{const was=sel;sel=null;ghost=null;paint();cv.toBlob(b=>{sel=was;draw();if(!b){say('Your browser refused to make the picture.','err');return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`ks-map-${new Date().toISOString().slice(0,10)}.png`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);say('Picture of the current view downloaded.','ok');},'image/png');});
KS.confirmButton($('btn-clear'),()=>{pushUndo();const view=st.view,kid=st.kid;st=blank();st.view=view;st.kid=kid;sel=null;writeInputs();after();say('Map reset. Undo brings it back.','ok');});
function fromHash(){const h=decodeURIComponent(location.hash.slice(1));if(!/^KSM1:/i.test(h))return;
  try{load(unpack(h),'Map loaded from the link. Undo brings back your previous map.');history.replaceState(null,'',location.pathname);}catch(e){say(e.message,'err');}}
window.addEventListener('hashchange',fromHash);
function writeInputs(){$('ignore').checked=st.ignore;}

/* ---------- boot ---------- */
loadSaved();writeInputs();refresh();setTool('select');drawSel();drawList();drawAls();jlState();
new ResizeObserver(resize).observe(wrap);resize();fromHash();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',draw);
/* game account switch (assets/accounts.js) */
window.KSPage={flush(){if(saveT)save();},reload(){loadSaved();undo=[];sel=null;ghost=null;jlArea=null;writeInputs();jlState();refresh();drawSel();drawList();drawAls();draw();say('','ok');}};
})();
