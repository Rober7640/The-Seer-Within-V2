/** Export a real three-house n8n screen, preserving responses and anonymous pairs. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envText=fs.readFileSync(path.join(root,'../../../../../.env'),'utf8');
const env=k=>envText.match(new RegExp(`^\\s*${k}\\s*=\\s*(.+)$`,'m'))?.[1]?.trim().replace(/^['"]|['"]$/g,'');
const id=process.argv[2]; if(!/^\d+$/.test(id||'')) throw Error('execution ID required');
const option=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const prefix=option('--prefix','02-gpt-screen');
if(!/^02-[a-z0-9-]+$/.test(prefix)) throw Error('Invalid output prefix');
const res=await fetch(`${env('N8N_BASE_URL').replace(/\/$/,'')}/api/v1/executions/${id}?includeData=true`,{headers:{'X-N8N-API-KEY':env('N8N_API_KEY')}});
if(!res.ok) throw Error(`n8n ${res.status}`);
const ex=await res.json(), rd=ex.data?.resultData?.runData||{};
const dir=path.join(root,'docs/02');
fs.writeFileSync(path.join(dir,`${prefix}-execution-${id}.json`),JSON.stringify(ex,null,2));
if(ex.status!=='success') throw Error(ex.data?.resultData?.error?.message||ex.status);
const inputs=JSON.parse(fs.readFileSync(path.join(dir,'02-gpt-screen-input.json')));
const baselineData=JSON.parse(fs.readFileSync(path.join(dir,option('--baseline','02-gpt-screen-claude-baseline.json'))));
const baseline=Array.isArray(baselineData)?baselineData:baselineData.results;
if(baseline.length!==3 || baseline.some(x=>x.validationError)) throw Error('Baseline incomplete or invalid');
const actualInputs=rd['S1 · Frozen writer inputs'][0].data.main[0].map(x=>x.json);
if(JSON.stringify(inputs)!==JSON.stringify(actualInputs)) throw Error('Frozen prompt drift');
const responses=rd['4b · Write the house'].flatMap(r=>r.data.main[0]);
if(responses.length!==3) throw Error(`expected 3 responses, got ${responses.length}`);
const wf=JSON.parse(fs.readFileSync(path.join(dir,'02-fulfilment.n8n.json')));
const parser=new Function('$input','$',wf.nodes.find(n=>n.name.startsWith('4c ·')).parameters.jsCode);
const spec=JSON.parse(fs.readFileSync(path.join(root,'scripts/02-houses.json')));
const results=[], key=[], lines=['# Anonymous paired writing excerpts','', 'Read both candidates in each house. Candidate labels do not identify a consistent writer across houses.',''];
for(let i=0;i<3;i++) {
 const response=responses[i].json, input=inputs[i], house=input.position.house;
 const paired=responses[i].pairedItem;
 if(paired && !Array.isArray(paired) && paired.item!==undefined && paired.item!==i) throw Error('Response order differs from frozen inputs');
 const raw=response.choices?.[0]?.message?.content;
 if(!raw || response.choices[0].finish_reason!=='stop') throw Error(`house ${house}: incomplete response`);
 let kept, validationError=null;
 try { kept=parser({first:()=>({json:response})},()=>({first:()=>({json:input})}))[0].json; }
 catch(e) {
  validationError=e.message;
  kept={keynote:raw.match(/^KEYNOTE:\s*(.+)$/mi)?.[1]||'',takeaway:raw.match(/^TAKEAWAY:\s*(.+)$/mi)?.[1]||'',
   prose:raw.replace(/^KEYNOTE:.*$/gmi,'').replace(/^TAKEAWAY:.*$/gmi,'').trim()};
 }
 const gpt={house,model:response.model,prose:kept.prose,keynote:kept.keynote,takeaway:kept.takeaway,
  words:kept.prose.split(/\s+/).filter(Boolean).length,validationError,usage:response.usage};
 results.push(gpt);
 const claude=baseline.find(x=>x.house===house);
 const gptFirst=crypto.createHash('sha256').update(`${input.order_id}|screen|${house}`).digest()[0]%2===0;
 const candidates=gptFirst?[gpt,claude]:[claude,gpt];
 key.push({house,A:candidates[0].model,B:candidates[1].model});
 lines.push(`## House ${house}: ${input.position.house_name} — ${input.position.card_name}`,'','### Shared printed source','',spec.card_lore[input.position.card].waite,'');
 for(let c=0;c<2;c++) {
  const d=candidates[c];lines.push(`### Candidate ${c?'B':'A'}`,'',d.keynote?`**${d.keynote}**`:'',d.prose,'');
  if(d.takeaway) lines.push(`**${d.takeaway}**`,'');
 }
}
fs.writeFileSync(path.join(dir,`${prefix}-results.json`),JSON.stringify({execution:id,startedAt:ex.startedAt,stoppedAt:ex.stoppedAt,results},null,2));
fs.writeFileSync(path.join(dir,`${prefix}-pair-key.json`),JSON.stringify(key,null,2));
fs.writeFileSync(path.join(dir,`${prefix}-anonymous-pairs.md`),lines.join('\n'));
console.log(JSON.stringify({execution:id,elapsed_seconds:(Date.parse(ex.stoppedAt)-Date.parse(ex.startedAt))/1000,results:results.map(({house,model,words,validationError})=>({house,model,words,validationError}))},null,2));
