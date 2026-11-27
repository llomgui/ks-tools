/* Game account switcher, shared by every page.
   Each page keeps its inputs in localStorage under its own key (KEYS below). Those keys always hold the
   ACTIVE game account. Other accounts are saved copies of the same keys in "ks-accounts-v1".
   Switching: copy the live keys into the active account, write the chosen account's copy back into the
   live keys, reload. The calculators themselves don't know about accounts. Later, a login can sync the
   same store across devices. */
(function(){
const KEYS=['hgp-state-v3','hgp-state-v2','hgp-gov-v1','ks-charms-v1','ks-kvk-v1','ks-reforge-v1','ks-truegold-v1'];
const STORE='ks-accounts-v1',MAXN=20,MAXLEN=24;
let ls;try{ls=window.localStorage;ls.getItem(STORE);}catch(e){return;}   /* storage blocked: no switcher */
const nav=document.querySelector('.sitenav');if(!nav)return;

const uid=()=>'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function load(){
  let s=null;try{s=JSON.parse(ls.getItem(STORE)||'null');}catch(e){}
  if(!s||!Array.isArray(s.list)||!s.list.length){const id=uid();s={v:1,active:id,list:[{id,name:'Main',data:{}}]};}
  s.list=s.list.filter(a=>a&&a.id).slice(0,MAXN);
  if(!s.list.some(a=>a.id===s.active))s.active=s.list[0].id;
  return s;}
const save=s=>{try{ls.setItem(STORE,JSON.stringify(s));}catch(e){}};
const snapshot=()=>{const d={};KEYS.forEach(k=>{const v=ls.getItem(k);if(v!=null)d[k]=v;});return d;};
let S=load();const cur=()=>S.list.find(a=>a.id===S.active);

/* after switching, stop this page from writing its (old account's) inputs before the reload finishes */
function freeze(){const set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(this===ls&&KEYS.includes(k))return;return set.call(this,k,v);};}
function activate(id){
  const to=S.list.find(a=>a.id===id);if(!to)return;
  cur().data=snapshot();
  KEYS.forEach(k=>{if(to.data&&to.data[k]!=null)ls.setItem(k,to.data[k]);else ls.removeItem(k);});
  S.active=id;save(S);freeze();location.reload();}
/* another tab switched account: follow it */
window.addEventListener('storage',e=>{if(e.key!==STORE)return;const n=load();if(n.active!==S.active){freeze();location.reload();}else S=n;});

/* ---------- UI ---------- */
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const box=document.createElement('div');box.className='acsw';
box.innerHTML=`<button type="button" class="acsw-btn" aria-haspopup="true" aria-expanded="false" aria-controls="acsw-menu">
  <svg class="acsw-who" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="7" r="3.4"/><path d="M3.5 17c.9-3.3 3.4-5 6.5-5s5.6 1.7 6.5 5"/></svg><img class="acsw-av" alt="" hidden>
  <span class="acsw-name"></span><svg class="acsw-car" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4"/></svg></button>
  <div class="acsw-menu" id="acsw-menu" hidden><p class="acsw-h">Game accounts</p><div class="acsw-list" role="group" aria-label="Switch game account"></div>
  <div class="acsw-acts"><button type="button" data-act="new">+ New</button><button type="button" data-act="ren">Rename</button><button type="button" data-act="del">Delete</button></div>
  <form class="acsw-form" hidden><label class="acsw-lbl"></label><div class="acsw-row"><input type="text" maxlength="${MAXLEN}" autocomplete="off"><button type="submit" class="primary">Save</button><button type="button" data-act="cancel">Cancel</button></div></form>
  <div class="acsw-conf" hidden><p></p><div class="acsw-row"><button type="button" data-act="del-yes" class="danger">Delete</button><button type="button" data-act="cancel">Cancel</button></div></div>
  <div class="acsw-jl" hidden><p class="acsw-h">Jeabslist</p><div class="acsw-jlbody"></div><p class="acsw-jlmsg" role="status"></p></div>
  <p class="acsw-foot">One set of inputs per game account, for every page. Saved in this browser only.</p></div>`;
nav.appendChild(box);
const $=s=>box.querySelector(s),btn=$('.acsw-btn'),menu=$('.acsw-menu'),form=$('.acsw-form'),inp=form.querySelector('input'),conf=$('.acsw-conf');
let formMode=null;
/* Jeabslist: the player's own API token (this browser) and a Governor ID per game account */
const DEFAULT_NAME=/^(Main|Account \d+)$/;
function jlMsg(t,bad){const m=$('.acsw-jlmsg');m.textContent=t||'';m.classList.toggle('bad',!!bad);}
function drawJL(){
  const box=$('.acsw-jl');box.hidden=!window.JL;if(!window.JL)return;
  const a=cur(),jl=a.jl,tok=JL.hasToken();
  const tokHtml=tok?`<p class="acsw-tok">API token saved in this browser <span><button type="button" class="acsw-lnk" data-act="tok-edit">Change</button> <button type="button" class="acsw-lnk" data-act="tok-del">Remove</button></span></p>`
    :`<form data-f="tok"><label class="acsw-lbl" for="acsw-tok">Your API token (Jeabs Plus or Premium). It stays in this browser and only goes to jeabslist.com.</label>
      <div class="acsw-row"><input id="acsw-tok" type="password" autocomplete="off" spellcheck="false"><button type="submit" class="primary">Save</button></div></form>`;
  const linkHtml=jl?`<div class="acsw-gov">${jl.avatar?`<img src="${esc(jl.avatar)}" alt="">`:''}<div><b>${esc(jl.name||'Governor')}</b><small>ID ${esc(jl.fid)}${jl.kingdom?` · #${jl.kingdom}`:''}${jl.alliance?` · [${esc(jl.alliance)}]`:''}</small></div></div>
      <div class="acsw-row"><button type="button" data-act="jl-refresh"${tok?'':' disabled'}>Refresh</button><button type="button" data-act="jl-unlink">Unlink</button></div>`
    :`<form data-f="link"><label class="acsw-lbl" for="acsw-fid">Governor ID for "${esc(a.name)}"</label>
      <div class="acsw-row"><input id="acsw-fid" inputmode="numeric" autocomplete="off" placeholder="e.g. 123456789"><button type="submit" class="primary"${tok?'':' disabled'}>Link</button></div></form>`;
  $('.acsw-jlbody').innerHTML=linkHtml+tokHtml;}
async function link(fid,fresh){
  jlMsg('Asking Jeabslist…');
  try{const p=await JL.player(fid,{fresh});S=load();const a=cur();a.jl=p;if(DEFAULT_NAME.test(a.name)&&p.name)a.name=p.name.slice(0,MAXLEN);
    save(S);draw();jlMsg(`Linked to ${p.name||'your governor'}.`);
    window.dispatchEvent(new CustomEvent('ks-account-linked',{detail:p}));}
  catch(e){jlMsg(e.message,true);}}
function draw(){
  $('.acsw-name').textContent=cur().name;
  {const jl=cur().jl,av=$('.acsw-av');av.hidden=!(jl&&jl.avatar);$('.acsw-who').style.display=av.hidden?'':'none';if(!av.hidden)av.src=jl.avatar;}
  drawJL();
  $('.acsw-list').innerHTML=S.list.map(a=>`<button type="button" class="acsw-it" data-id="${a.id}" aria-pressed="${a.id===S.active}">${esc(a.name)}${a.id===S.active?'<small>active</small>':''}</button>`).join('');
  $('[data-act="new"]').disabled=S.list.length>=MAXN;$('[data-act="del"]').disabled=S.list.length<2;}
function open(on){menu.hidden=!on;btn.setAttribute('aria-expanded',on);if(!on){form.hidden=true;conf.hidden=true;}}
function ask(mode){formMode=mode;conf.hidden=true;form.hidden=false;
  form.querySelector('.acsw-lbl').textContent=mode==='new'?'Name of the new account (it starts empty)':'New name';
  inp.value=mode==='new'?`Account ${S.list.length+1}`:cur().name;inp.focus();inp.select();}
btn.addEventListener('click',()=>{draw();open(menu.hidden);});
document.addEventListener('click',e=>{if(!menu.hidden&&!box.contains(e.target))open(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){open(false);btn.focus();}});
menu.addEventListener('click',e=>{
  const it=e.target.closest('.acsw-it');if(it){if(it.dataset.id!==S.active)activate(it.dataset.id);else open(false);return;}
  const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;
  if(act==='new'||act==='ren')ask(act);
  else if(act==='cancel'){form.hidden=true;conf.hidden=true;}
  else if(act==='tok-edit'){JL.setToken('');drawJL();jlMsg('');const i=$('#acsw-tok');if(i)i.focus();}
  else if(act==='tok-del'){JL.setToken('');drawJL();jlMsg('Token removed from this browser.');}
  else if(act==='jl-refresh'){const jl=cur().jl;if(jl)link(jl.fid,true);}
  else if(act==='jl-unlink'){S=load();delete cur().jl;save(S);draw();jlMsg('');}
  else if(act==='del'){form.hidden=true;conf.hidden=false;conf.querySelector('p').textContent=`Delete "${cur().name}" and all its inputs on every page? This can't be undone.`;conf.querySelector('.danger').focus();}
  else if(act==='del-yes'){const gone=S.active,next=S.list.find(a=>a.id!==gone);
    S.list=S.list.filter(a=>a.id!==gone);S.active=next.id;
    KEYS.forEach(k=>{if(next.data&&next.data[k]!=null)ls.setItem(k,next.data[k]);else ls.removeItem(k);});
    save(S);freeze();location.reload();}});
menu.addEventListener('submit',e=>{const f=e.target.closest('form[data-f]');if(!f)return;e.preventDefault();
  const v=f.querySelector('input').value.trim();
  if(f.dataset.f==='tok'){if(!v)return;JL.setToken(v);drawJL();jlMsg('Token saved in this browser.');const i=$('#acsw-fid');if(i)i.focus();}
  else link(v,true);});
form.addEventListener('submit',e=>{e.preventDefault();const name=inp.value.trim().slice(0,MAXLEN);if(!name){inp.focus();return;}
  if(formMode==='ren'){cur().name=name;save(S);form.hidden=true;draw();return;}
  const id=uid();S.list.push({id,name,data:{}});activate(id);});
draw();
if(!ls.getItem(STORE))save(S);
window.KSAccounts={KEYS,STORE,list:()=>S.list.map(a=>({id:a.id,name:a.name})),active:()=>S.active,switchTo:activate,
  linked:()=>{const j=cur().jl;return j?{...j}:null;},open:()=>{setTimeout(()=>{draw();open(true);},0);}};   /* after the click that asked for it, which would close it */
})();
