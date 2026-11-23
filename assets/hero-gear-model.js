/* Hero gear game data and optimizer, shared by the Hero Gear planner and the Reforge page. */
(function(){
const TROOPS=[{k:'I',name:'Infantry',pieces:['Helm_L','Gloves_H','Shroud_H','Greaves_L']},
              {k:'C',name:'Cavalry', pieces:['Armet_L','Gauntlet_H','Breastplate_H','Boots_L']},
              {k:'A',name:'Archer',  pieces:['Faceplate_L','Bracers_H','Leatherwear_H','Riders_L']}];
const SLOT_OF=['Helm','Gloves','Chest','Boots'];
const PROFILES={
  growth:{I:[1.5,0.7],C:[0.2,0.4],A:[0.7,1.4]},
  combat:{I:[1.5,0.7],C:[0.4,1.2],A:[0.6,1.3]},
  gen4:  {I:[1.5,1.1],C:[0.4,1.2],A:[0.6,1.2]},
  flat:  {I:[1,1],C:[1,1],A:[1,1]}};

/* ---------- XP table ---------- */
const XP=new Array(201).fill(0);
(function(){
  for(let L=1;L<=10;L++) XP[L]=10+5*(L-1);
  const cum={10:325,15:675,20:1150,25:1750,30:2480,35:3430,40:4640,45:6290,50:8440,55:11090,60:14250,65:18100,70:22710,75:28260,80:34820,85:42570,90:51570,95:61820,100:73320};
  const cost={10:55,15:80,20:105,25:130,30:160,35:210,40:270,45:370,50:470,55:570,60:680,65:830,70:990,75:1190,80:1400,85:1650,90:1900,95:2150,100:2400};
  for(let a=10;a<100;a+=5){const b=a+5;XP[b]=cost[b];
    const need=cum[b]-cum[a]-cost[b];let raw=[],s=0;
    for(let k=1;k<=4;k++){const v=cost[a]+k*(cost[b]-cost[a])/5;raw.push(v);s+=v}
    let acc=0;for(let k=1;k<=4;k++){let v=k<4?Math.round(raw[k-1]*need/s):need-acc;XP[a+k]=v;acc+=v}}
  for(let L=101;L<=200;L++){
    if([101,120,140,160,180,200].includes(L)) XP[L]=0;
    else if(L<=160) XP[L]=2400+50*(L-100);
    else XP[L]=5900+100*(L-165);}
})();
const IMB={120:[10,3],140:[20,5],160:[30,5],180:[40,10],200:[50,10]};

/* ---------- model ---------- */
const statOf=(q,L)=> q==='R' ? 50+0.5*(L-100) : 15+0.35*L;
const masteryCap=q=> q==='R'?20:10;
function maxLevel(q,M){ if(q!=='R') return 100;
  if(M>=15) return 200; if(M>=14) return 180; if(M>=13) return 160; if(M>=12) return 140; if(M>=11) return 120; return 101; }
function weight(p,W){const [h,l]=W[p.troop];return p.stat==='H'?h:l}
function value(s,p,W){return statOf(s.q,s.L)*(1+0.1*s.M)*weight(p,W)}
/* game mode: 'exp' values R120/R160/R200 troop bonuses, 'conq' values R140/R180 hero bonuses */
let MODE='exp';
const MS_LEVELS=()=>MODE==='conq'?[140,180]:[120,160,200];
function milestone(p,L){
  const hc=(p.slot==='Helm'||p.slot==='Chest');
  if(MODE==='conq'){
    if(L===140) return ['Hero Health',7.5];
    if(L===180) return [hc?'Hero Attack':'Hero Defense',15];
    return null;}
  if(L===120) return [hc?'Attack':'Defense',20];
  if(L===160) return [hc?'Defense':'Attack',30];
  if(L===200) return [hc?'Attack':'Defense',50];
  return null;}
/* troop bonuses use the matching troop weight; hero bonuses help every troop, so they get a neutral weight of 1 */
function msValue(p,kind,pct,W){if(kind.startsWith('Hero')) return pct;const [h,l]=W[p.troop];return pct*(kind==='Attack'?l:h)}

function pathCost(s,t){
  const c={fh:0,myth:0,mith:0,xpR:0,xpL:0};
  for(let m=s.M+1;m<=t.M;m++){c.fh+=10*m;c.myth+=Math.max(0,m-10)}
  if(t.M>masteryCap(t.q)) return null;
  if(t.L>maxLevel(t.q,t.M)) return null;
  let L=s.L;
  if(s.q!=='R'){
    for(let x=L+1;x<=Math.min(t.L,100);x++) c.xpR+=XP[x];
    if(t.q==='R'){ if(t.M<10) return null; c.myth+=2; L=101; } else L=t.L;
  }
  for(let x=Math.max(L,100)+1;x<=t.L;x++){ if(x===101) continue; c.xpL+=XP[x]; if(IMB[x]){c.mith+=IMB[x][0];c.myth+=IMB[x][1];} }
  return c;}
function raiseMastery(q,M,L){let m=M;while(maxLevel(q,m)<L&&m<20)m++;return m}

function candidates(s){
  const out=[];
  if(s.M<masteryCap(s.q)) out.push({q:s.q,L:s.L,M:s.M+1});
  if(s.q!=='R'){
    if(s.L<100){out.push({q:s.q,L:s.L+1,M:s.M}); out.push({q:s.q,L:Math.min(100,s.L+5),M:s.M});}
    for(const tgt of [101,119,120]){const M=Math.max(10,raiseMastery('R',Math.max(10,s.M),tgt));out.push({q:'R',L:tgt,M});}
  } else {
    if(s.L<200 && !IMB[s.L+1] && s.L+1<=maxLevel('R',s.M)) out.push({q:'R',L:s.L+1,M:s.M});
    const nxt=[120,140,160,180,200].filter(m=>m>s.L).slice(0,2);
    for(const ms of nxt){
      for(const tgt of [ms-1,ms]){
        if(tgt<=s.L) continue;
        if(tgt===ms && !MS_LEVELS().includes(ms) && ms!==200) continue;
        out.push({q:'R',L:tgt,M:raiseMastery('R',s.M,tgt)});
      }
    }
  }
  return out;}

function score(pieces,W,withMs){
  let s=0;
  for(const p of pieces){
    s+=value(p.s,p,W);
    if(withMs&&p.s.q==='R') for(const L of MS_LEVELS()) if(p.s.L>=L){const m=milestone(p,L);s+=msValue(p,m[0],m[1],W);}
  }
  return s;}

/* unopened Lucky Hero Gear Chests count as Mythic Gear at the average drop rate */
const chestRate=st=>(st.hassume&&st.hassume.rate!=null)?st.hassume.rate:1.5;
const chestMyth=st=>Math.floor((st.chests||0)*chestRate(st)/100);
function optimizeOnce(state){
  const W=state.W||PROFILES[state.profile];
  const pieces=[];
  TROOPS.forEach(t=>t.pieces.forEach((key,i)=>{
    const g=state.gear[t.k][i];
    pieces.push({troop:t.k,troopName:t.name,key,name:key.split('_')[0],stat:key.slice(-1),slot:SLOT_OF[i],
      s:{q:g[2],L:g[0],M:g[1]}});
  }));
  const budget={fh:state.fh,myth:state.myth+chestMyth(state),mith:state.mith,xp:state.xp};
  const left={...budget};
  const beforeScore=score(pieces,W,state.ms);
  const steps=[]; let msCount=0, guard=0;
  while(guard++<2000){
    let best=null;
    pieces.forEach((p,i)=>{
      for(const t of candidates(p.s)){
        const c=pathCost(p.s,t); if(!c) continue;
        if(c.fh>left.fh||c.myth>left.myth||c.mith>left.mith||c.xpR+c.xpL>left.xp) continue;
        let gain=value(t,p,W)-value(p.s,p,W); const ms=[];
        for(let L=Math.max(p.s.L,100)+1;L<=t.L;L++){const m=milestone(p,L); if(m && t.q==='R'){ms.push(m); if(state.ms) gain+=msValue(p,m[0],m[1],W);}}
        if(gain<=1e-9) continue;
        const norm=(budget.fh?c.fh/budget.fh*10:0)+(budget.myth?c.myth/budget.myth*10:0)+(budget.mith?c.mith/budget.mith*10:0)
          +(budget.xp?(c.xpR/budget.xp+c.xpL/budget.xp*10):0);
        if(norm<=0) continue;
        const eff=gain/norm;
        const tie=weight(p,W);
        if(!best||eff>best.eff+1e-9||(Math.abs(eff-best.eff)<=1e-9&&tie>best.tie)) best={eff,tie,i,t,c,gain,ms};
      }
    });
    if(!best) break;
    const p=pieces[best.i];
    left.fh-=best.c.fh;left.myth-=best.c.myth;left.mith-=best.c.mith;left.xp-=best.c.xpR+best.c.xpL;
    msCount+=best.ms.length;
    const last=steps.find(s=>s.i===best.i);
    if(last){
      last.to={...best.t};for(const k in best.c) last.c[k]+=best.c[k];last.ms.push(...best.ms);
    } else steps.push({i:best.i,p,from:{...p.s},to:{...best.t},c:{...best.c},ms:[...best.ms]});
    p.s={...best.t};
  }
  const after=score(pieces,W,state.ms);
  return {steps,left,before:beforeScore,after,msCount,pieces,budget};
}

/* two passes (milestones valued / not valued), keep whichever scores higher on the chosen metric */
function optimize(state){
  MODE=state.mode==='conq'?'conq':'exp';
  const W=state.W||PROFILES[state.profile];
  let best=null;
  for(const ms of [true,false]){
    const r=optimizeOnce({...state,ms});
    r.before=score(optimizeOnce({...state,fh:0,myth:0,mith:0,xp:0,chests:0}).pieces,W,state.ms);
    r.after=score(r.pieces,W,state.ms);
    if(!best||r.after>best.after+1e-9) best=r;
  }
  return best;}

/* art: assets/hero_gear/10{slot 1-4}{troop 1-3}501.png (quality-5 art; card background shows Mythic/Ascended) */
const TROOP_IMG={I:1,C:2,A:3};
const gearImg=(troop,i)=>`../assets/hero_gear/10${i+1}${TROOP_IMG[troop]}501.png`;
/* game-style troop badge (shield = Infantry, horse = Cavalry, bow = Archer) */
const BADGE_SHAPE='<path class="bs" d="M12 1.5 21.5 4.5V13c0 5.5-4.3 9.2-9.5 11.2C6.8 22.2 2.5 18.5 2.5 13V4.5z"/>';
const BADGE={
  I:'<path d="M12 7.2 16.6 8.8v3.6c0 2.8-2 4.6-4.6 5.6-2.6-1-4.6-2.8-4.6-5.6V8.8z" fill="none" stroke="#fff" stroke-width="1.9" stroke-linejoin="round"/>',
  C:'<path d="M16.9 18.4H8.8c0-2.5 1.1-4.1 2.7-5.3l-2.7.9c-.9.3-1.7-.6-1.3-1.5l.9-2c.6-1.4 1.6-2.5 2.9-3.2l.4-2 1.4 1.4c2.3.5 3.9 2.6 3.8 5-.1 2.3-.8 4.3 0 6.7z" fill="#fff"/><path d="M8.2 18.4h9.4v1.6H8.2z" fill="#fff"/><circle cx="12.2" cy="9.7" r=".9" fill="#2f5f9e"/><path d="M14.7 8.2c1.2 1.4 1.5 3.3.9 5.1" fill="none" stroke="#2f5f9e" stroke-width=".9" stroke-linecap="round"/>',
  A:'<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6.5c5.6-.6 10 3.8 10.5 10.5"/><path d="M7 6.5l10.5 10.5"/><path d="M8.5 15.5l7-7M15.5 8.5h-2.6M15.5 8.5v2.6"/></g>'};
Object.keys(BADGE).forEach(k=>BADGE[k]=`<svg class="hg-tb" viewBox="0 0 24 26" aria-hidden="true">${BADGE_SHAPE}${BADGE[k]}</svg>`);
/* pill colour follows enhancement: 0-19 grey, 20-39 green, 40-59 blue, 60-79 purple, 80-99 gold, 100 red */
const enhTier=s=>Math.min(5,Math.floor((s.L-100)/20));   /* Red only: the pill colour */
/* tile label: Red shows +N on a coloured pill, Mythic shows plain white +N (nothing at +0) */
const enhLabel=p=>p.q==='R'?`<span class="hg-pill e${enhTier(p)}">${enh(p)}</span>`:p.L>0?`<span class="hg-plain">${enh(p)}</span>`:'';
const enh=s=>'+'+(s.q==='R'?s.L-100:s.L);
const cumXP=L=>{let c=0;for(let x=1;x<=L;x++)c+=XP[x];return c;};
/* ---------- Formations ---------- */
/* Build profiles assume a 50/20/30 formation; scale each troop's weights by its share relative to that. */
const BASE_SHARE={I:50,C:20,A:30};
function norm(f){const s=f[0]+f[1]+f[2];return s>0?[f[0]*100/s,f[1]*100/s,f[2]*100/s]:[50,20,30];}
function formationWeights(profile,f){
  const P=PROFILES[profile],n=norm(f),k={I:n[0]/BASE_SHARE.I,C:n[1]/BASE_SHARE.C,A:n[2]/BASE_SHARE.A};
  const W={};for(const t of ['I','C','A'])W[t]=[P[t][0]*k[t],P[t][1]*k[t]];return W;}
function weightsFor(st,which){
  const a=formationWeights(st.profile,st.form.att),d=formationWeights(st.profile,st.form.def);
  if(which==='att')return a;if(which==='def')return d;
  const w=st.form.mix/100,W={};for(const t of ['I','C','A'])W[t]=[a[t][0]*w+d[t][0]*(1-w),a[t][1]*w+d[t][1]*(1-w)];return W;}

const setMode=m=>{MODE=m==='conq'?'conq':'exp';};
const getMode=()=>MODE;
window.HG={TROOPS,SLOT_OF,PROFILES,XP,IMB,statOf,masteryCap,maxLevel,weight,value,MS_LEVELS,milestone,msValue,pathCost,raiseMastery,candidates,score,chestRate,chestMyth,optimizeOnce,optimize,TROOP_IMG,gearImg,BADGE,enhTier,enhLabel,enh,cumXP,setMode,getMode,BASE_SHARE,norm,formationWeights,weightsFor};
})();
