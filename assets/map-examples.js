/* Ready-made plans for the Alliance Map Planner (assets/map.js loads them from the Examples menu).
   Each example: {id, name, desc, center:[x,y], state()} (opens at the default zoom) where state() returns
   {al:[{id,tag,name,color}], objs:[{t,x,y,a,n,c}]} (ids are added by the planner).
   Towns around the castle sit on square rings: ring k covers X/Y (592-2k)..(607+2k), 2 tiles thick,
   ring 0 touches the castle area (594..605). */
(function(){
/* ring k: lowest tile of every town on it */
function ring(k){const lo=592-2*k,hi=606+2*k,out=[];
  for(let x=lo;x<=hi;x+=2){out.push([x,lo]);out.push([x,hi]);}
  for(let y=lo+2;y<hi;y+=2){out.push([lo,y]);out.push([hi,y]);}
  return out;}
/* screen angle of a town around the castle: 90 = top (north), 180 = left (west), 270 = bottom */
function angle(x,y){const dx=x+1-600,dy=y+1-600;return (Math.atan2(dx+dy,dx-dy)*180/Math.PI+360)%360;}

/* your alliance's hive (kingshot.me plan, alliance OPS): [type, x, y, name?, colour?] */
const OPS=[["trap2",618,740],["trap1",634,752],["town",635,750,"Kriss","#0433ff"],["town",637,750,"Pong","#0433ff"],["town",619,743,"Fruit Loops","#0433ff"],["town",641,752,"Bombastic","#0433ff"],["town",629,748,"Kentaru","#0433ff"],["town",617,735,"LilMissChief","#0433ff"],["town",623,735,"Mhsary","#ff40ff"],["town",633,746,"Pong2","#0433ff"],["town",639,758,"BShark","#0433ff"],["town",619,735,"Vitez","#0433ff"],["town",625,735,"Gremlin","#0433ff"],["town",631,750,"SK","#0433ff"],["town",625,743,"gwiou","#0433ff"],["town",613,737,"Slayer","#0433ff"],["town",621,739,"Siren","#0433ff"],["town",623,741,"Sword","#0433ff"],["town",623,737,"Neo","#0433ff"],["town",627,752,"Puto","#0433ff"],["town",621,745,"Lulina","#0433ff"],["town",619,747,"Phoenix","#0433ff"],["town",617,745,"Angie","#0433ff"],["town",621,735,"Judyy","#0433ff"],["town",611,739,"Knitti","#0433ff"],["town",615,737,"Ukash","#0433ff"],["town",611,741,"Humble","#919191"],["town",612,733,"GANO","#ff40ff"],["town",623,743,"Gobz","#0433ff"],["town",611,745,"Avacyn","#ff40ff"],["town",623,739,"Plopi","#0433ff"],["town",621,737,"Gui","#0433ff"],["town",637,756,"Bluezbell","#0433ff"],["town",625,741,"Park Hyung","#919191"],["town",615,739,"Face Hugger","#0433ff"],["town",615,733,"Anhillator","#919191"],["town",611,743,"leodagan","#0433ff"],["town",613,743,"Dire","#0433ff"],["town",629,758,"Gondolin","#0433ff"],["town",611,737,"LadyAsh","#0433ff"],["flag",630,743],["flag",613,749],["flag",609,733],["flag",619,751],["phq",622,756],["town",629,746,"Butcher","#0433ff"],["flag",637,733],["town",613,745,"Giada","#0433ff"],["flag",643,733],["flag",650,733],["flag",636,755],["flag",633,755],["flag",633,752],["town",633,750,"Ravan","#0433ff"],["town",639,754,"Tito","#0433ff"],["town",619,737,"Ness","#0433ff"],["town",635,758,"Fraudgy","#0433ff"],["town",641,759,"Paradise","#0433ff"],["town",623,745,"Bacon","#ff2600"],["town",637,748,"Pip","#0433ff"],["town",631,754,"姜月初","#0433ff"],["town",629,754,"Wealty","#0433ff"],["town",621,743,"Shadow","#0433ff"],["town",627,746,"Bellatrix","#0433ff"],["town",629,756,"Trion","#ff40ff"],["town",631,748,"Bong","#0433ff"],["town",633,748,"Alibaba","#0433ff"],["town",639,752,"Java","#0433ff"],["town",639,750,"Dazzy","#0433ff"],["town",615,735,"Sargent","#0433ff"],["town",643,754,"Lev","#0433ff"],["town",639,760,"Lorde","#ff40ff"],["town",641,756,"Rdizzle","#0433ff"],["town",627,743,"Pip2","#0433ff"],["town",637,754,"Nicole","#0433ff"],["town",631,760,"Potato","#0433ff"],["town",631,758,"DMAX","#0433ff"],["town",629,750,"Gohan","#0433ff"],["town",625,739,"Shadow2","#0433ff"],["town",625,748,"josjis","#0433ff"],["town",617,743,"PolishR","#0433ff"],["town",615,743,"Jacek","#0433ff"],["flag",626,750],["flag",632,745],["flag",639,745],["flag",641,749],["flag",648,754],["flag",643,756],["flag",641,761],["flag",634,762],["flag",627,762],["flag",624,766],["flag",617,765],["flag",614,765],["flag",610,772],["flag",609,768],["flag",607,761],["flag",614,762],["flag",614,755],["flag",606,747],["flag",607,754],["flag",650,740],["flag",653,747],["flag",646,747],["flag",643,740],["flag",648,761],["flag",655,761],["flag",655,754],["town",615,745,"VEGETA","#0433ff"],["town",617,737,"Ray","#0433ff"],["town",631,752,"Afrin","#0433ff"],["town",631,746,"Kriss2","#0433ff"],["flag",628,733],["town",613,739,"Viserion","#0433ff"],["town",625,746,"Lix","#0433ff"],["flag",609,726],["flag",614,726],["flag",621,724],["flag",628,726],["flag",635,726],["flag",642,726],["flag",649,726],["flag",656,726],["flag",653,719],["flag",660,719],["flag",653,712],["flag",653,705],["flag",646,705],["flag",646,712],["flag",646,719],["flag",639,719],["flag",634,719],["flag",627,719],["flag",620,719],["flag",613,719],["flag",606,719],["flag",618,712],["flag",625,712],["flag",632,712],["flag",639,712],["flag",639,705],["flag",639,698],["flag",625,745],["town",615,741,"Falkor","#0433ff"],["town",629,752,"Flimpo","#0433ff"],["town",633,760,"Snake","#0433ff"],["flag",640,763],["flag",617,742],["flag",617,739],["flag",620,739],["flag",630,740],["flag",623,734],["flag",616,732],["flag",610,746],["flag",610,739],["flag",623,747],["town",613,741,"CilBro","#0433ff"],["town",627,748,"Turbo Granny","#0433ff"],["town",619,745,"Eternal Raymond","#0433ff"],["flag",627,738],["town",611,735,"AnKeSz","#ff40ff"],["town",619,728,"BShark2"],["town",617,727,"BShark3"],["town",637,752,"Charlena","#0433ff"],["town",621,741,"Brad","#0433ff"],["town",635,756,"TH2","#0433ff"],["town",637,758,"Loop","#0433ff"],["town",637,760,"Barry","#0433ff"],["town",627,750,"KC","#0433ff"],["town",631,756,"Kizzor","#0433ff"],["flag",621,731],["flag",617,749],["town",635,748,"Sunny","#0433ff"],["town",637,762,"Katana","#0433ff"],["town",617,733,"Ray2","#0433ff"],["town",638,746,"Light","#919191"],["flag",637,740],["town",633,758,"BellaBunny","#0433ff"]];
function ops(){return {al:[{id:'a1',tag:'OPS',name:'',color:'#2563eb'}],
  objs:OPS.map(r=>({t:r[0],x:r[1],y:r[2],a:'a1',n:r[3]||'',c:r[4]||''}))};}

/* the 4 rings inside the forbidden area (586..613), 160 towns, one sector of 72° per alliance */
function castle5(){const al=[['404','#e81ec0',54],['WLF','#e5f20a',-18],['DOM','#22d61c',-90],['666','#1426e8',-162],['OPS','#f59e0b',126]]
  .map(([tag,color,from],i)=>({id:'a'+(i+1),tag,name:'',color,from:(from+360)%360}));
  const objs=[];let n=0;
  for(let k=0;k<4;k++)ring(k).sort((p,q)=>angle(...p)-angle(...q)).forEach(([x,y])=>{const t=angle(x,y);
    const a=al.find(a=>((t-a.from+360)%360)<72);objs.push({t:'town',x,y,a:a.id,n:String(++n)});});
  return {al:al.map(({from,...a})=>a),objs};}

/* KvK: our kingdom holds the left half (west), the other kingdom the right half */
function kvk(){const named=[['TED','#13e8f0'],['BRAD','#13e8f0'],['RACCOON','#a314f5'],['PONG','#a314f5'],['KRISS','#a314f5'],['CHRIS','#13e8f0'],['Bilal','#13e8f0'],
    ['Sic','#13e8f0'],['FREE?','#a314f5'],['Loop','#a314f5'],['GUI','#a314f5'],['Fishy','#13e8f0'],['SNAD','#13e8f0'],['LP','#13e8f0']];
  const tier=[null,['TG5','#f59e0b'],['TG5','#f59e0b'],['TG4','#ef1b1b'],['TG3 or <','#1630f0']];
  const ours=(x,y)=>y>x||(x===y&&x>600),objs=[];
  for(let k=0;k<5;k++){const pos=ring(k).sort((p,q)=>angle(...p)-angle(...q));
    pos.filter(p=>ours(...p)).forEach(([x,y],i)=>{const [n,c]=k?tier[k]:(named[i]||['','#13e8f0']);objs.push({t:'town',x,y,a:'',n,c});});
    if(!k)pos.filter(p=>!ours(...p)).forEach(([x,y])=>objs.push({t:'town',x,y,a:'',n:'1634',c:'#ff2fb4'}));}
  return {al:[],objs};}

window.MAP_EXAMPLES=[
  {id:'ops',name:'Alliance hive: OPS around 2 Hunting Traps',desc:'A real hive: HQ, flags, both traps and a square of towns around each trap.',center:[636,746],state:ops},
  {id:'castle5',name:'Castle split between 5 alliances',desc:'160 towns on the 4 rings around the castle area, one sector per alliance.',center:[600,600],state:castle5},
  {id:'kvk',name:'KvK castle placement',desc:'Our half of the castle: named players first, then TG5, TG4 and TG3 rings. 1634 holds the other half.',center:[598,602],state:kvk}];
})();
