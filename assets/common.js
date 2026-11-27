/* Shared by every page (window.KS). Load it first: before the data, model and page scripts.

   Storage: every page saves its inputs in localStorage under one key, listed in KEYS. The game account
   switcher (accounts.js) swaps exactly these keys, and pages that read another page's inputs go through
   KS.read(KEYS.x). A new page adds its key here.

   Page contract with the account switcher: a page sets
     window.KSPage = { reload(), flush() }   (flush is optional)
   flush() saves an edit still waiting to be saved (debounced pages); reload() reads the page's inputs again
   from storage and redraws. Pages without KSPage are reloaded.

   Late answers: anything async (Jeabslist calls) remembers KS.gen() before awaiting and drops the answer if
   KS.gen() changed meanwhile, i.e. the player switched game account. */
(function(){
const KEYS={hero:'hgp-state-v3',heroOld:'hgp-state-v2',gov:'hgp-gov-v1',charms:'ks-charms-v1',kvk:'ks-kvk-v1',
  reforge:'ks-reforge-v1',truegold:'ks-truegold-v1'};
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(e){return null;}}
function write(key,v){try{localStorage.setItem(key,JSON.stringify(v));return true;}catch(e){return false;}}
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const pct=n=>(+n.toFixed(2)).toString();
/* for any text that isn't ours (API answers, names) put into innerHTML */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* a status line: KS.msg('msg')('Saved.','ok') */
const msg=id=>(t,c)=>{const m=$(id);if(!m)return;m.textContent=t;m.className='msg'+(c?' '+c:'');};
/* copy to the clipboard; resolves false when the browser refuses, so the page can show the text instead */
function copyText(t){try{return navigator.clipboard?navigator.clipboard.writeText(t).then(()=>true,()=>false):Promise.resolve(false);}
  catch(e){return Promise.resolve(false);}}
/* copy a share code; when the browser refuses, select it in the code box so the player can press Ctrl+C */
function copyCode(text,ok,say,boxId){copyText(text).then(y=>{if(y){say(ok,'ok');return;}
  const box=$(boxId||'code');if(box){box.value=text;box.focus();box.select();}say('Copy failed. The code is selected in the box: press Ctrl+C.','warn');});}
/* a button that asks first: the first click turns it red with "Are you sure? Click again", a second click
   within 4 seconds runs it, otherwise it goes back to normal */
function confirmButton(btn,run,ask){if(!btn)return;let t=0;const label=btn.textContent;
  const reset=()=>{clearTimeout(t);t=0;btn.textContent=label;btn.classList.remove('danger');};
  btn.addEventListener('click',()=>{if(!t){t=setTimeout(reset,4000);btn.textContent=ask||'Are you sure? Click again';btn.classList.add('danger');return;}
    reset();run();});}
let gen=0;
window.KS={KEYS,read,write,$,fmt,pct,esc,msg,copyText,copyCode,confirmButton,gen:()=>gen,bumpGen:()=>++gen};
})();
