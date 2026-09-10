/** One extractive editorial experiment. Never used as a generation prompt or production template. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/02'), source='n8n-02-reading-30656', dest='n8n-02-reading-30656-short';
const original=fs.readFileSync(`${dir}/${source}.md`,'utf8').split('\n---\n')[1].trim();
const parts=original.split(/(\[\d+ · [^\]]+\]|\[CLOSE\])/);
// Zero-based paragraph selections, made after reading the complete report.
const drops={OPEN:[1,3],1:[0,5,7],2:[2,7],3:[3,6],4:[5,6],5:[8],6:[4],7:[5],8:[4,7],9:[4,6],10:[4,6,8],11:[3,5],12:[7],CLOSE:[0,4]};
const cuts={
  2:[', and what arrives in a form that does not require suspicion'],
  5:['It chooses the arrival branch. ', 'The precision belongs to the nature of the event: an arrival or meeting has a day on which it occurs, even when the larger meaning continues unfolding afterward. '],
};
const manifest=[];
for(let i=0;i<parts.length;i+=2){
 const label=i===0?'OPEN':parts[i-1]==='[CLOSE]'?'CLOSE':Number(parts[i-1].match(/^\[(\d+)/)[1]);
 const before=parts[i].trim(), paragraphs=before.split(/\n\s*\n/), removed=[];
 const kept=paragraphs.filter((p,index)=>{if(drops[label].includes(index)){removed.push({index,text:p});return false;}return true;});
 let after=kept.join('\n\n');
 for(const cut of cuts[label]||[]){if(!after.includes(cut))throw Error(`Missing exact cut in ${label}`);after=after.replace(cut,'');}
 if(label==='OPEN')after=after.replace('Sarah,\n\n','Sarah,\n\n'+paragraphs[1].split('. ')[0]+'.\n\n');
 // Every surviving sentence is extracted from the original; no new claims or sample prose.
 parts[i]='\n'+after+'\n';
 manifest.push({section:label,before_words:before.split(/\s+/).length,after_words:after.split(/\s+/).length,removed_paragraphs:removed,removed_fragments:cuts[label]||[]});
}
const reading=parts.join('').trim(), words=reading.split(/\s+/).length;
if(words<6100||words>6500)throw Error(`Outside experiment band: ${words}`);
const draw=JSON.parse(fs.readFileSync(`${dir}/n8n-02-draw-30656.json`));
const order=JSON.parse(fs.readFileSync(`${dir}/n8n-02-audit-30656.json`)).order;
const wf=JSON.parse(fs.readFileSync(`${dir}/02-fulfilment.n8n.json`));
const render=new Function('$input','$',wf.nodes.find(n=>n.name.startsWith('10 ·')).parameters.jsCode);
const htmlFor=reading=>{const state={...order,draw,reading}; return render({first:()=>({json:state})},()=>({first:()=>({json:state})}))[0].json.html;};
const originalHtml=fs.readFileSync(`${dir}/${source}.html`,'utf8');
if(htmlFor(original)!==originalHtml)throw Error('Renderer/source drift: baseline HTML not reproduced exactly');
const html=htmlFor(reading);
for(const pattern of [/<blockquote class="waite">[\s\S]*?<\/blockquote>/g,/<p class="takeaway">[\s\S]*?<\/p>/g,/<img[^>]+>/g,/<style>[\s\S]*?<\/style>/g]){
 if(JSON.stringify(originalHtml.match(pattern))!==JSON.stringify(html.match(pattern)))throw Error('Protected printed material changed');
}
if(originalHtml.split('<div class="gift">')[1]!==html.split('<div class="gift">')[1])throw Error('Gift/ledger changed');
fs.writeFileSync(`${dir}/${dest}.md`,`# Shortened editorial test of execution 30656\n\nOrder: ${order.order_id}; arc v2. ${words} words. Extractive edit; not a new model generation.\n\n---\n\n${reading}`);
fs.writeFileSync(`${dir}/${dest}.html`,html);
fs.copyFileSync(`${dir}/n8n-02-draw-30656.json`,`${dir}/n8n-02-draw-30656-short.json`);
fs.writeFileSync(`${dir}/02-shortening-30656-manifest.json`,JSON.stringify({source,output:dest,order:order.order_id,before_words:original.split(/\s+/).length,after_words:words,sha256:crypto.createHash('sha256').update(reading).digest('hex'),changes:manifest},null,2));
console.log(JSON.stringify({before:original.split(/\s+/).length,after:words,sections:manifest.map(({section,before_words,after_words})=>({section,before_words,after_words})),protected:'Waite, takeaways, images, CSS, gift and ledger unchanged; baseline HTML reproduced byte-for-byte'},null,2));
