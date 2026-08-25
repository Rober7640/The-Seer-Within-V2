import { api, accountId, dailyListIds } from './aweber-lib.mjs';
const A=`https://api.aweber.com/1.0/accounts/${accountId}`;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const NAMES={6936953:'free',6963143:'palm',6970613:'tarot',6963139:'fb',6963141:'fb2',
 6936955:'paid',6969209:'money_ob_paid',6937139:'upsell_paid',6939683:'upsell2_paid',
 6956485:'soulmate_free',6956486:'soulmate_paid',6956488:'soulmate_up1',6956490:'soulmate_up2'};
let armed=0, people=0;
for(const id of dailyListIds){
  const m=await api('GET',`${A}/lists/${id}`); await pause(200);
  const subs=m.ok?(m.json.total_subscribers||0):0;
  const r=await api('GET',`${A}/lists/${id}/broadcasts?status=scheduled&ws.size=100`);
  let hit=null;
  for(const e of (r.json?.entries||[])){
    const bid=e.broadcast_id||(e.self_link||'').split('/').pop();
    const d=await api('GET',`${A}/lists/${id}/broadcasts/${bid}`); await pause(180);
    if((d.json?.scheduled_for||'').startsWith('2026-08-20')) hit={bid,st:d.json.status,when:d.json.scheduled_for};
  }
  if(hit&&hit.st==='scheduled'){armed++;people+=subs;}
  console.log(`${(NAMES[id]||id).padEnd(15)} subs=${String(subs).padStart(6)}  aug20=${hit?hit.st:'MISSING'}  id=${hit?hit.bid:'-'}`);
  await pause(250);
}
console.log(`\n${armed}/${dailyListIds.length} lists armed for 10:30 UTC. Gross deliveries ≈ ${people.toLocaleString()} (people counted once per list they are on).`);
