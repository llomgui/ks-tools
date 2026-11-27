/* Game account switcher, shared by every page.
   Each page keeps its inputs in localStorage under its own key (KEYS below). Those keys always hold the
   ACTIVE game account. Other accounts are saved copies of the same keys in "ks-accounts-v1".
   Switching: copy the live keys into the active account, write the chosen account's copy back into the
   live keys, reload. The calculators themselves don't know about accounts. Later, a login can sync the
   same store across devices. */
(function(){
const KEYS=Object.values(KS.KEYS);   /* every page's storage key: common.js */
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
/* A page that sets window.KSPage = {flush(), reload()} switches in place: flush() saves an edit still waiting
   to be saved, reload() reads the page's inputs again from storage. Other pages reload. */
const page=()=>{const P=window.KSPage;return P&&typeof P.reload==='function'?P:null;};
function show(){
  KS.bumpGen();   /* answers still on their way belong to the account we just left: pages drop them */
  const P=page();
  if(P){try{P.reload();open(false);draw();return;}catch(e){}}
  freeze();location.reload();}
function swapTo(to){KEYS.forEach(k=>{if(to.data&&to.data[k]!=null)ls.setItem(k,to.data[k]);else ls.removeItem(k);});}
function activate(id){
  const to=S.list.find(a=>a.id===id);if(!to)return;
  const P=page();if(P&&P.flush){try{P.flush();}catch(e){}}
  cur().data=snapshot();swapTo(to);
  S.active=id;save(S);show();}
/* another tab switched account: follow it (its inputs are already in storage) */
window.addEventListener('storage',e=>{if(e.key!==STORE)return;const n=load();
  if(n.active!==S.active){S=n;show();}else{S=n;draw();}});

/* ---------- UI ---------- */
const esc=KS.esc;
const box=document.createElement('div');box.className='acsw';
box.innerHTML=`<button type="button" class="acsw-btn" aria-haspopup="true" aria-expanded="false" aria-controls="acsw-menu">
  <svg class="acsw-who" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="7" r="3.4"/><path d="M3.5 17c.9-3.3 3.4-5 6.5-5s5.6 1.7 6.5 5"/></svg><img class="acsw-av" alt="" hidden>
  <span class="acsw-name"></span><svg class="acsw-car" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4"/></svg></button>
  <div class="acsw-menu" id="acsw-menu" hidden><p class="acsw-h">Game accounts</p><div class="acsw-list" role="group" aria-label="Switch game account"></div>
  <div class="acsw-acts"><button type="button" data-act="new">+ New</button><button type="button" data-act="dup">Duplicate</button><button type="button" data-act="ren">Rename</button><button type="button" data-act="del">Delete</button></div>
  <form class="acsw-form" hidden><label class="acsw-lbl"></label><div class="acsw-row"><input type="text" maxlength="${MAXLEN}" autocomplete="off"><button type="submit" class="primary">Save</button><button type="button" data-act="cancel">Cancel</button></div></form>
  <div class="acsw-conf" hidden><p></p><div class="acsw-row"></div></div>
  <div class="acsw-jl" hidden><p class="acsw-h">Jeabslist</p><div class="acsw-jlbody"></div><p class="acsw-jlmsg" role="status"></p></div>
  <div class="acsw-bk"><p class="acsw-h">Backup</p><div class="acsw-acts"><button type="button" data-act="bk-save">Download</button><button type="button" data-act="bk-load">Restore</button></div>
    <input type="file" class="acsw-file" accept=".json,application/json" hidden><p class="acsw-bkmsg" role="status"></p></div>
  <p class="acsw-foot">One set of inputs per game account, for every page. Saved in this browser only: download a backup to keep them or move them to another device.</p></div>`;
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
  const id=S.active;   /* the account the player asked to link, even if they switch while we wait */
  jlMsg('Asking Jeabslist…');
  try{const p=await JL.player(fid,{fresh});S=load();const a=S.list.find(x=>x.id===id);if(!a)return;
    a.jl=p;if(DEFAULT_NAME.test(a.name)&&p.name)a.name=p.name.slice(0,MAXLEN);
    save(S);draw();
    if(S.active!==id)return;   /* linked the other account: nothing to show on this one */
    jlMsg(`Linked to ${p.name||'your governor'}.`);
    window.dispatchEvent(new CustomEvent('ks-account-linked',{detail:p}));}
  catch(e){if(S.active===id)jlMsg(e.message,true);}}
function draw(){
  $('.acsw-name').textContent=cur().name;
  {const jl=cur().jl,av=$('.acsw-av');av.hidden=!(jl&&jl.avatar);$('.acsw-who').style.display=av.hidden?'':'none';if(!av.hidden)av.src=jl.avatar;}
  drawJL();
  $('.acsw-list').innerHTML=S.list.map(a=>`<button type="button" class="acsw-it" data-id="${a.id}" aria-pressed="${a.id===S.active}">${esc(a.name)}${a.id===S.active?'<small>active</small>':''}</button>`).join('');
  $('[data-act="new"]').disabled=$('[data-act="dup"]').disabled=S.list.length>=MAXN;$('[data-act="del"]').disabled=S.list.length<2;}
function open(on){menu.hidden=!on;btn.setAttribute('aria-expanded',on);if(!on){form.hidden=true;conf.hidden=true;}}
/* the confirm area: a question and its buttons [[act,label,danger?],…]; Cancel is added */
function confirmIn(text,btns){form.hidden=true;conf.hidden=false;conf.querySelector('p').textContent=text;
  conf.querySelector('.acsw-row').innerHTML=btns.map(([a,l,d])=>`<button type="button" data-act="${a}"${d?' class="danger"':''}>${esc(l)}</button>`).join('')+'<button type="button" data-act="cancel">Cancel</button>';
  conf.querySelector('button').focus();}
const bkMsg=(t,bad)=>{const m=$('.acsw-bkmsg');m.textContent=t||'';m.classList.toggle('bad',!!bad);};
/* ---------- backup: every game account and its inputs on every page, as one file (no token, no cache) ---------- */
function saveNow(){const P=page();if(P&&P.flush){try{P.flush();}catch(e){}}cur().data=snapshot();save(S);}
function download(){
  saveNow();
  const o={app:'ks-tools',type:'accounts-backup',v:1,exported:new Date().toISOString(),active:S.list.findIndex(a=>a.id===S.active),
    list:S.list.map(a=>({name:a.name,data:a.data||{},...(a.jl?{jl:a.jl}:{})}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`ks-tools-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  bkMsg(`Downloaded ${S.list.length} game account${S.list.length>1?'s':''}.`);}
/* a backup file read back, keeping only what this site writes */
function parseBackup(txt){
  let o;try{o=JSON.parse(txt);}catch(e){o=null;}
  if(!o||o.app!=='ks-tools'||!Array.isArray(o.list)||!o.list.length)throw new Error("This isn't a KS Tools backup file.");
  const cleanJl=j=>j&&typeof j==='object'&&/^\d+$/.test(String(j.fid||''))?{fid:String(j.fid),name:String(j.name||'').slice(0,40),
    avatar:/^https:\/\//.test(j.avatar||'')?String(j.avatar):'',kingdom:+j.kingdom||0,alliance:String(j.alliance||'').slice(0,8),tc:+j.tc||0,power:+j.power||0,at:+j.at||0}:null;
  const list=o.list.slice(0,MAXN).map(a=>{const x={id:uid(),name:String(a&&a.name||'Account').slice(0,MAXLEN)||'Account',
    data:Object.fromEntries(Object.entries((a&&a.data)||{}).filter(([k,v])=>KEYS.includes(k)&&typeof v==='string'))};
    const j=cleanJl(a&&a.jl);if(j)x.jl=j;return x;});
  return {list,active:Math.max(0,Math.min(list.length-1,+o.active||0))};}
let pending=null;
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
  else if(act==='dup'){saveNow();const a=cur(),id=uid();
    S.list.push({id,name:(a.name+' copy').slice(0,MAXLEN),data:{...a.data},...(a.jl?{jl:{...a.jl}}:{})});activate(id);}
  else if(act==='bk-save')download();
  else if(act==='bk-load'){bkMsg('');const f=$('.acsw-file');f.value='';f.click();}
  else if(act==='bk-add'&&pending){saveNow();const room=MAXN-S.list.length,add=pending.list.slice(0,room);
    S.list.push(...add);save(S);pending=null;conf.hidden=true;draw();
    bkMsg(`Added ${add.length} game account${add.length>1?'s':''}${add.length<room?'':' (the list is full)'}. Pick one above.`);}
  else if(act==='bk-replace'&&pending){const P=page();if(P&&P.flush){try{P.flush();}catch(e){}}
    S={v:1,active:pending.list[pending.active].id,list:pending.list};pending=null;conf.hidden=true;
    swapTo(cur());save(S);show();bkMsg('Restored from the backup.');}
  else if(act==='cancel'){form.hidden=true;conf.hidden=true;}
  else if(act==='tok-edit'){JL.setToken('');drawJL();jlMsg('');const i=$('#acsw-tok');if(i)i.focus();}
  else if(act==='tok-del'){JL.setToken('');drawJL();jlMsg('Token removed from this browser.');}
  else if(act==='jl-refresh'){const jl=cur().jl;if(jl)link(jl.fid,true);}
  else if(act==='jl-unlink'){S=load();delete cur().jl;save(S);draw();jlMsg('');}
  else if(act==='del')confirmIn(`Delete "${cur().name}" and all its inputs on every page? This can't be undone.`,[['del-yes','Delete',1]]);
  else if(act==='del-yes'){const gone=S.active,next=S.list.find(a=>a.id!==gone);
    S.list=S.list.filter(a=>a.id!==gone);S.active=next.id;
    swapTo(next);save(S);show();}});
menu.addEventListener('submit',e=>{const f=e.target.closest('form[data-f]');if(!f)return;e.preventDefault();
  const v=f.querySelector('input').value.trim();
  if(f.dataset.f==='tok'){if(!v)return;JL.setToken(v);drawJL();jlMsg('Token saved in this browser.');const i=$('#acsw-fid');if(i)i.focus();}
  else link(v,true);});
$('.acsw-file').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;
  if(f.size>5e6){bkMsg('This file is too big for a KS Tools backup.',true);return;}
  f.text().then(txt=>{try{pending=parseBackup(txt);}catch(err){pending=null;bkMsg(err.message,true);return;}
    const n=pending.list.length,names=pending.list.map(a=>a.name).join(', ');
    confirmIn(`This backup has ${n} game account${n>1?'s':''}: ${names}. Add them to yours, or replace yours (${S.list.length}) with them?`,
      [['bk-add','Add to mine'],['bk-replace','Replace mine',1]]);});});
form.addEventListener('submit',e=>{e.preventDefault();const name=inp.value.trim().slice(0,MAXLEN);if(!name){inp.focus();return;}
  if(formMode==='ren'){cur().name=name;save(S);form.hidden=true;draw();return;}
  const id=uid();S.list.push({id,name,data:{}});activate(id);});
draw();
if(!ls.getItem(STORE))save(S);
window.KSAccounts={KEYS,STORE,list:()=>S.list.map(a=>({id:a.id,name:a.name})),active:()=>S.active,switchTo:activate,
  linked:()=>{const j=cur().jl;return j?{...j}:null;},open:()=>{setTimeout(()=>{draw();open(true);},0);}};   /* after the click that asked for it, which would close it */
})();
