/* Jeabslist API (https://jeabslist.com/api/v1), called from the player's browser with their own token
   (Jeabs Plus or Premium). The token stays in this browser (localStorage) and is only sent to jeabslist.com.
   Answers are kept in this browser (localStorage) for as long as that kind of data stays useful (TTLS), so
   repeat visits don't use the player's daily budget; "fresh" (Refresh buttons) asks again.
   Later a backend can make these calls instead; pages only use window.JL. */
(function(){
const BASE='https://jeabslist.com/api/v1',TOKEN_KEY='ks-jl-token',CACHE_KEY='ks-jl-cache',H=3600e3;
/* how long an answer stays useful, by path (first match wins) */
const TTLS=[[/\/kvk\/matchups/,1*H],[/\/kvk\/forecast$/,6*H],[/\/prep$/,12*H],[/\/hero-gear$/,6*H],[/^\/players\/\d+$/,24*H]];
const ttlOf=path=>{const p=path.split('?')[0];const m=TTLS.find(([re])=>re.test(p))||[0,H];return m[1];};
const MAXN=60;   /* answers kept; oldest dropped first */
const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{};}catch(e){return {};}};
function writeCache(c){const ks=Object.keys(c).sort((a,b)=>c[b].t-c[a].t);ks.slice(MAXN).forEach(k=>delete c[k]);
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(c));}catch(e){try{localStorage.removeItem(CACHE_KEY);}catch(e2){}}}
/* hero ids from Jeabslist's battle-sim catalog (2026-11-27) */
const HEROES={50000:'Forrest',50001:'Seth',50002:'Edwin',50003:'Olive',50004:'Howard',50005:'Gordon',50006:'Quinn',50007:'Chenko',50008:'Diana',50009:'Helga',50010:'Eric',50011:'Amadeus',50012:'Jabel',50013:'Hilde',50014:'Margot',50015:'Ava',50016:'Petra',50017:'Saul',50018:'Marlin',50019:'Triton',50020:'Jaeger',50021:'Zoe',50022:'Rosa',50023:'Alcar',50024:'Long Fei',50025:'Thrud',50026:'Vivian',50027:'Amane',50028:'Yeonwoo',50029:'Fahd',50030:'Sophia',50031:'Yang',50032:'Charles',50033:'Wee & Woo',50034:'Diego',50035:'Liz',50036:'Luna',50038:'Lotte',50039:'Bayar',50040:'Theia'};
const TROOP_OF={1:'I',2:'C',3:'A'};

const token=()=>{try{return localStorage.getItem(TOKEN_KEY)||'';}catch(e){return '';}};
function setToken(t){t=String(t||'').trim();try{if(t)localStorage.setItem(TOKEN_KEY,t);else localStorage.removeItem(TOKEN_KEY);}catch(e){}
  try{localStorage.removeItem(CACHE_KEY);}catch(e){}}
const fail=(code,msg)=>{const e=new Error(msg);e.code=code;return e;};

async function get(path,opt){
  opt=opt||{};const tok=token();
  if(!tok)throw fail('no_token','Add your Jeabslist API token first: account menu, top right.');
  if(!opt.fresh){const c=readCache()[path];if(c&&Date.now()-c.t<ttlOf(path))return c.d;}
  let r;
  try{r=await fetch(BASE+path,{headers:{Authorization:'Bearer '+tok,Accept:'application/json'}});}
  catch(e){throw fail('network',"Couldn't reach Jeabslist. Check your connection and try again.");}
  if(r.status===401)throw fail('token','Jeabslist refused this token. Check it in the account menu.');
  if(r.status===402){let pr=false;try{pr=(await r.json()).error==='premium_required';}catch(e){}
    throw fail('plan',pr?'This needs Jeabs Plus+ Premium.':'Your Jeabslist subscription has lapsed.');}
  if(r.status===404)throw fail('not_found',"Jeabslist doesn't know this Governor ID. Check the number on your in-game profile.");
  if(r.status===429){const s=+r.headers.get('Retry-After')||30;throw fail('rate',`Too many requests to Jeabslist. Try again in ${s} seconds.`);}
  if(!r.ok)throw fail('http',`Jeabslist answered with an error (HTTP ${r.status}). Try again later.`);
  const d=await r.json();
  const c=readCache();c[path]={t:Date.now(),d};writeCache(c);
  return d;}
/* when an answer was fetched (ms), or 0 */
const fetchedAt=path=>{const c=readCache()[path];return c?c.t:0;};

const cleanId=v=>String(v||'').replace(/\D/g,'');
/* a player's profile, kept to what the pages use */
async function player(fid,opt){
  fid=cleanId(fid);if(!fid)throw fail('bad_id','Enter your Governor ID: the digits on your in-game profile.');
  const d=await get('/players/'+fid,opt);
  return {fid:String(d.id||fid),name:d.name||'',avatar:d.avatar_url||'',kingdom:+d.kingdom||0,tc:+d.town_hall_level||0,
    power:+d.power||0,alliance:d.alliance?(d.alliance.abbr||''):'',at:Date.now()};}
/* hero gear (Premium). Gear ids read 10{slot 1-4}{troop 1-3}{quality}01: slot and troop match the Hero Gear page.
   slv is the enhancement level (0-100 Mythic, 101-200 Red), rlv the mastery (forge) level. */
async function heroGear(fid,opt){
  fid=cleanId(fid);const d=await get('/players/'+fid+'/hero-gear',opt);
  const heroes=(d.heroes||[]).map(h=>{
    const gear=[null,null,null,null];let troop=null,lowQ=0;
    (h.equipment||[]).forEach(e=>{const s=String(e.eid||'');const slot=+s[2],t=+s[3],q=+s[4];
      if(!(slot>=1&&slot<=4)||!TROOP_OF[t])return;troop=troop||TROOP_OF[t];
      if(q<5){lowQ++;return;}   /* below Mythic: the planner doesn't cover it */
      const L=Math.max(0,Math.min(200,Math.floor(+e.slv||0))),R=L>100;
      gear[slot-1]=[L,Math.max(0,Math.min(R?20:10,Math.floor(+e.rlv||0))),R?'R':'M'];});
    return {id:h.id,name:HEROES[h.id]||('Hero '+h.id),pos:+h.pos||0,troop,gear:gear.map(g=>g||[0,0,'M']),
      pieces:gear.filter(Boolean).length,lowQ};}).filter(h=>h.troop);
  return {heroes,fetchedAt:d.fetched_at||null,stale:!!d.stale};}

window.JL={token,setToken,hasToken:()=>!!token(),get,fetchedAt,player,heroGear,HEROES,cleanId};
})();
