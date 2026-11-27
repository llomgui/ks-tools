/* Governor Gear levels, shared by the Governor Gear and KvK pages.
   name | Satin | Gilded Threads | Artisan's Vision | stat % | set bonus % | event score
   Costs are per piece, to reach the level from the one before. From Mythic T3 0★ on, a level is bought in
   5 equal purchases. Event score (Governor Gear Score gained by the upgrade) from Kingshot Optimizer;
   KvK Power Boost day pays 36 points per score. */
window.GOV_RAW=`Uncommon 0★|1500|15|0|9.35|2|1125
Uncommon 1★|3800|40|0|12.75|2.5|1875
Rare 0★|7000|70|0|17.00|3|3000
Rare 1★|9700|95|0|21.25|3.5|4500
Rare 2★|1000|10|45|25.50|4|5100
Rare 3★|1000|10|50|29.75|4.5|5440
Epic 0★|1500|15|60|34.00|5|3230
Epic 1★|1500|15|70|36.89|5|3230
Epic 2★|6500|65|40|39.78|5|3225
Epic 3★|8000|80|50|42.67|5|3225
Epic T1 0★|10000|95|60|45.56|6|3440
Epic T1 1★|11000|110|70|48.45|6|3440
Epic T1 2★|13000|130|85|51.34|6|4085
Epic T1 3★|15000|160|100|54.23|6|4085
Mythic 0★|22000|220|40|56.78|7|6250
Mythic 1★|23000|230|40|59.33|7|6250
Mythic 2★|25000|250|45|61.88|7|6250
Mythic 3★|26000|260|45|64.43|7|6250
Mythic T1 0★|28000|280|45|66.98|8|6250
Mythic T1 1★|30000|300|55|69.53|8|6250
Mythic T1 2★|32000|320|55|72.08|8|6250
Mythic T1 3★|35000|340|55|74.63|8|6250
Mythic T2 0★|38000|360|55|77.18|9|6250
Mythic T2 1★|43000|430|75|79.73|9|6250
Mythic T2 2★|45000|460|80|82.28|9|6250
Mythic T2 3★|48000|500|85|84.83|9|6250
Mythic T3 0★|60000|600|120|87.38|10|9000
Mythic T3 1★|70000|700|140|89.93|10|9000
Mythic T3 2★|80000|800|160|92.48|10|9000
Mythic T3 3★|90000|900|180|95.00|10|9000
Legendary 0★|108000|1080|220|97.50|12|12000
Legendary 1★|114000|1140|230|100.00|12|12000
Legendary 2★|121000|1210|240|102.50|12|12000
Legendary 3★|128000|1280|250|105.00|12|12000
Legendary T1 0★|154000|1540|300|107.50|14|15000
Legendary T1 1★|163000|1630|320|110.00|14|15000
Legendary T1 2★|173000|1730|340|112.50|14|15000
Legendary T1 3★|183000|1830|360|115.00|14|15000
Legendary T2 0★|220000|2200|430|117.50|16.5|20000
Legendary T2 1★|233000|2330|460|120.00|16.5|20000
Legendary T2 2★|247000|2470|490|122.50|16.5|20000
Legendary T2 3★|262000|2620|520|125.00|16.5|20000
Legendary T3 0★|288000|2880|570|127.75|19.5|25000
Legendary T3 1★|302000|3020|600|130.50|19.5|25000
Legendary T3 2★|317000|3170|630|133.25|19.5|25000
Legendary T3 3★|333000|3330|660|136.00|19.5|25000
Legendary T4 0★|366000|3660|730|138.75|23|30000
Legendary T4 1★|384000|3840|770|141.50|23|30000
Legendary T4 2★|403000|4030|810|144.25|23|30000
Legendary T4 3★|423000|4230|850|147.00|23|30000
Legendary T5 0★|465000|4650|940|150.00|26.5|35000
Legendary T5 1★|479000|4790|970|153.00|26.5|35000
Legendary T5 2★|493000|4930|1000|156.00|26.5|35000
Legendary T5 3★|508000|5080|1030|159.00|26.5|35000
Legendary T6 0★|549000|5490|1110|162.00|30|40000
Legendary T6 1★|565000|5650|1140|165.00|30|40000
Legendary T6 2★|582000|5820|1170|168.00|30|40000
Legendary T6 3★|599000|5990|1210|171.00|30|40000`;

/* Governor Gear art and level names, shared by the Governor Gear and Charms pages (window.GOVART).
   A piece's progress is a "position": 0 = not owned, then one step per purchase; from Mythic T3 0★ (level 25)
   on, a level takes 5 purchases.
   Art: assets/gear/{slot}00{n}.png, slot 1 Hood (crown) 2 Charmstone 3 Cloak 4 Breeches 5 Ring 6 Staff.
   n changes with level (checked against the in-game cards): Uncommon 1, Rare 2, Epic/Epic T1 3, Mythic/Mythic T1 4,
   Mythic T2-T3 7, Legendary/T1-T2 5, Legendary T3-T4 6, Legendary T5-T6 8. Not owned: outline icon 0{slot}.png */
(function(){
const NAMES=window.GOV_RAW.split('\n').map(l=>l.split('|')[0]);
const STEP_LV=26;
const lvAt=p=>{if(p<=0)return {L:-1,s:0};if(p<=STEP_LV)return {L:p-1,s:0};const q=p-STEP_LV;return {L:STEP_LV-1+Math.floor(q/5),s:q%5};};
const IMG_SLOT={Hood:1,Charmstone:2,Cloak:3,Breeches:4,Ring:5,Staff:6};
const tierOf=L=>{const m=NAMES[L].match(/ T(\d)/);return m?'T'+m[1]:'';};
const starsOf=L=>+(NAMES[L].match(/(\d)★/)||[0,0])[1];
function artSrc(n,L){
  if(L<0)return `../assets/gear/0${IMG_SLOT[n]}.png`;
  const r=NAMES[L].split(' ')[0],t=+(tierOf(L).slice(1)||0);
  const k=r==='Legendary'?(t>=5?8:t>=3?6:5):r==='Mythic'?(t>=2?7:4):r==='Epic'?3:r==='Rare'?2:1;
  return `../assets/gear/${IMG_SLOT[n]}00${k}.png`;}
/* the player's saved Governor Gear (Governor Gear page), by piece name: {L, s, name}; null if none or the example */
const SAVED_ORDER=['Cloak','Breeches','Hood','Charmstone','Ring','Staff'];   /* order of pieces in the saved data */
function savedPieces(){
  const g=window.KS&&KS.read(KS.KEYS.gov);
  if(!g||g.isExample||!Array.isArray(g.pieces)||g.pieces.length!==6)return null;
  const out={};SAVED_ORDER.forEach((n,i)=>{const {L,s}=lvAt(+g.pieces[i].cur||0);out[n]={L,s,name:L<0?'Not owned':NAMES[L]+(s?` · ${s}/5`:'')};});
  return out;}
window.GOVART={NAMES,STEP_LV,lvAt,IMG_SLOT,tierOf,starsOf,artSrc,savedPieces};
})();
