/** Durable LOCAL fulfillment adapters. No provider/network/env calls; outputs are QA fixtures. */
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LocalOrder } from './server';
import type { LocalStore } from './store';
import { deck } from './fixtures';
import { calculateNumerologyProfile } from '../../../../server/lib/numerologyEngine';

export const LOCAL_SERVICE_TOKEN = 'marcus08-local-fixture-only';
const hash = (v:unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clone = <T>(v:T):T => structuredClone(v);
export class FulfillmentError extends Error { constructor(public status:number,message:string){super(message);} }
export interface Envelope { [key:string]:any; orderId:string; eventId:string; jobId?:string; leaseToken?:string }
interface Job { id:string; orderId:string; kind:'main'|'audio'; state:'claimed'|'approved'|'ready'|'review'; token:string; expiresAt:number; report?:any; script?:any; attempts:number }
const BUNDLED_PDF_PYTHON='/Users/joel/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const DEFAULT_PDF_PYTHON=existsSync(BUNDLED_PDF_PYTHON)?BUNDLED_PDF_PYTHON:'python3';
const PDF_RENDERER=fileURLToPath(new URL('./render-report-pdf.py',import.meta.url));
const CANON=JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/08-marcus/n8n/numerology-canon/marcus-numerology-canon-v1.json',import.meta.url)),'utf8'));
const LIFE_PATH_RECOGNITION=JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/08-marcus/n8n/numerology-canon/life-path-recognition.json',import.meta.url)),'utf8'));
const SUPPORTED=new Set([1,2,3,4,5,6,7,8,9,11,22]);
/** Local audio assembly only (production = private object storage + its own assembler). Pacing comes from the versioned config. */
const AUDIO_CONFIG=JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/08-marcus/n8n/config/marcus-audio-v1.json',import.meta.url)),'utf8'));
const FFMPEG=process.env.MARCUS_LOCAL_FFMPEG||'/opt/homebrew/bin/ffmpeg';
const FFPROBE=FFMPEG.replace(/ffmpeg$/,'ffprobe');
const safeName=(v:string)=>v.replace(/[^a-zA-Z0-9_-]/g,'_');
const fileRecord=(path:string)=>{const b=readFileSync(path);return {path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
function probe(path:string){const p=spawnSync(FFPROBE,['-v','error','-show_entries','stream=sample_rate:format=duration','-of','json',path],{encoding:'utf8'});if(p.status!==0)throw new FulfillmentError(500,`ffprobe failed: ${(p.stderr||'').trim()}`);const d=JSON.parse(p.stdout);return {durationSeconds:Number(d.format?.duration),sampleRate:Number(d.streams?.[0]?.sample_rate)||24000};}

function numerologyAnchors(o:LocalOrder){
 if(!o.fullBirthName||!o.dateOfBirth)throw new FulfillmentError(409,'Full birth name and date of birth are required for numerology anchors.');
 const profile=calculateNumerologyProfile(o.dateOfBirth,o.fullBirthName);
 const values={lifePath:profile.lifePathNumber,expression:profile.expressionNumber,personality:profile.personalityNumber};
 for(const [role,number] of Object.entries(values))if(!SUPPORTED.has(number))throw new FulfillmentError(409,`Unsupported ${role} number ${number}.`);
 if(o.draw.personalLens.expressionNumber!==profile.expressionNumber)throw new FulfillmentError(409,'Saved personal card does not match the calculated Expression number.');
 const selected=[['lifePath',profile.lifePathNumber],['expression',profile.expressionNumber],['personality',profile.personalityNumber]].map(([role,number])=>{
  const entry=CANON.entries.find((candidate:any)=>candidate.role===role&&candidate.number===number);
  if(!entry)throw new FulfillmentError(409,`Missing approved canon entry for ${role} ${number}.`);
  return entry;
 });
 const recognition=LIFE_PATH_RECOGNITION.profiles[String(profile.lifePathNumber)];
 if(!recognition)throw new FulfillmentError(409,`Missing Life Path recognition profile ${profile.lifePathNumber}.`);
 return {
  methodVersion:'pythagorean-core-v1',canonVersion:CANON.version,recognitionVersion:LIFE_PATH_RECOGNITION.version,
  lifePath:{number:profile.lifePathNumber,...recognition},
  privateAnchors:{expressionNumber:profile.expressionNumber,personalityNumber:profile.personalityNumber,
   selectedCanon:selected.map((entry:any)=>({key:entry.key,role:entry.role,number:entry.number,version:entry.version,contentHash:entry.contentHash,sections:entry.sections}))}
 };
}

export class LocalFulfillment {
 constructor(private store:LocalStore, private now:()=>number=Date.now,
             private artifactRoot='/tmp/08-marcus-local/artifacts', private pdfPython=DEFAULT_PDF_PYTHON,
             private audioRoot='/tmp/08-marcus-local/audio'){}
 /** Concatenate stored segments in order, marcus-audio-v1 pacing: pitch-preserving atempo on speech, silence between sections (600 ms) and before the closing (900 ms). Paragraph pauses (300 ms) apply inside a segment only; fixture segments are single paragraphs. */
 private assembleAudio(orderId:string,rows:any[]){
  const pacing=AUDIO_CONFIG.pacing;const dir=join(this.audioRoot,safeName(orderId));mkdirSync(dir,{recursive:true});
  if(!existsSync(FFMPEG))throw new FulfillmentError(500,`ffmpeg not found at ${FFMPEG}.`);
  const probes=rows.map(r=>probe(r.file.path));const rate=probes[0].sampleRate;const fmt=`aformat=sample_fmts=s16:sample_rates=${rate}:channel_layouts=mono`;
  const pauseBefore=(i:number)=>i===0?0:(i===rows.length-1?pacing.closingPauseMs:pacing.cardSectionPauseMs)/1000;
  const filters:string[]=[],order:string[]=[];
  rows.forEach((_,i)=>{if(i>0){filters.push(`anullsrc=r=${rate}:cl=mono:d=${pauseBefore(i)},${fmt}[p${i}]`);order.push(`[p${i}]`);}
   filters.push(`[${i}:a]atempo=${pacing.timeStretchRatio},${fmt}[a${i}]`);order.push(`[a${i}]`);});
  filters.push(`${order.join('')}concat=n=${order.length}:v=0:a=1[out]`);
  const wav=join(dir,'marcus-reading.wav'),mp3=join(dir,'marcus-reading.mp3');
  const args=['-y','-v','error',...rows.flatMap(r=>['-i',r.file.path]),'-filter_complex',filters.join(';'),'-map','[out]',wav];
  const c=spawnSync(FFMPEG,args,{encoding:'utf8'});if(c.status!==0)throw new FulfillmentError(500,`ffmpeg concat failed: ${(c.stderr||'').trim()}`);
  const m=spawnSync(FFMPEG,['-y','-v','error','-i',wav,'-codec:a','libmp3lame','-q:a','3',mp3],{encoding:'utf8'});if(m.status!==0)throw new FulfillmentError(500,`ffmpeg mp3 encode failed: ${(m.stderr||'').trim()}`);
  const expected=probes.reduce((t,p)=>t+p.durationSeconds/pacing.timeStretchRatio,0)+rows.reduce((t,_,i)=>t+pauseBefore(i),0);
  const out=probe(mp3).durationSeconds;
  return {wav:{...fileRecord(wav),durationSeconds:probe(wav).durationSeconds},mp3:{...fileRecord(mp3),durationSeconds:out},expectedDurationSeconds:Number(expected.toFixed(3)),
   qa:Math.abs(out-expected)<=1?'passed':'failed',pacing:{configVersion:AUDIO_CONFIG.configVersion,...pacing,sampleRate:rate}};
 }
 private order(id:string):LocalOrder {
  const o=this.store.get<LocalOrder>('orders',id);
  if(!o || !o.paymentReference.startsWith('local_paid_'))throw new FulfillmentError(404,'Paid local fixture order not found.');
  return o;
 }
 private updateOrder(id:string,fn:(o:LocalOrder)=>LocalOrder){this.store.update<LocalOrder>('orders',id,fn);}
 private job(e:Envelope,kind?:string):Job {
  const j=this.store.get<Job>('jobs',String(e.jobId));
  if(!j || j.orderId!==e.orderId || j.token!==e.leaseToken || (kind&&j.kind!==kind)||j.expiresAt<=this.now())throw new FulfillmentError(409,'Job lease missing, expired or not owned.');
  return j;
 }
 private save(j:Job){this.store.put('jobs',j.id,j);}
 private env(e:Envelope,extra:Record<string,unknown>={}){return {...e,order:this.order(e.orderId),...extra};}
 private claim(e:Envelope,kind:'main'|'audio') {
  return this.store.transaction(()=>{
   const id=kind+':'+e.orderId;let j=this.store.get<Job>('jobs',id);
   if(j && (j.state==='ready'||j.state==='review'))return this.env(e,{jobState:j.state,audioStatus:j.state});
   if(j && j.expiresAt>this.now())return this.env(e,{jobState:'busy',audioStatus:'busy'});
   j={...j,id,orderId:e.orderId,kind,state:'claimed',token:randomUUID(),expiresAt:this.now()+120000,attempts:(j?.attempts||0)+1};this.save(j);
   return this.env(e,{jobId:id,leaseToken:j.token,jobState:'claimed',audioStatus:kind==='audio'?'claimed':undefined});
  });
 }
 private task(e:Envelope,kind:'written'|'audio',artifactId:string){
  const id=kind+':'+e.orderId;const o=this.order(e.orderId);
  if(!this.store.get('deliveries',id))this.store.put('deliveries',id,{id,orderId:e.orderId,kind,artifactId,dueAt:o.dueAt,status:'queued'});
  return id;
 }
 /** Every operation is local-only. HTTP authentication is enforced at its dedicated route. */
 run(operation:string,raw:any):any {
  if(!raw || typeof raw!=='object')throw new FulfillmentError(400,'Object body required.');
  const e:Envelope=raw.context?clone(raw.context):clone(raw);
  if(operation==='reconcile'){
   const event=raw.event??raw;const id=String(event.id??'');const orderId=String(event.orderId??'');
   if(!id || !['main.paid','audio.paid','delivery.due','recovery'].includes(event.type))throw new FulfillmentError(400,'Valid fixture event required.');
   const o=this.order(orderId);if(event.type==='audio.paid'&&!o.audio)throw new FulfillmentError(409,'No paid audio entitlement.');
   const prior=this.store.get<any>('events',id);if(prior&&prior.hash!==hash(event))throw new FulfillmentError(409,'Event ID reused with different content.');
   this.store.put('events',id,{hash:hash(event),event});
   return {eventId:id,orderId,order:o,deliveryTaskId:event.deliveryTaskId,action:({'main.paid':'main','audio.paid':'audio','delivery.due':'delivery','recovery':'recovery'} as any)[event.type]};
  }
  this.order(e.orderId);
  if(operation==='claim-main')return this.claim(e,'main');
  if(operation==='build-brief'){
   const j=this.job(e,'main'),o=this.order(e.orderId);
   const numerology=numerologyAnchors(o);
   const expand=(p:any)=>{const drawn=o.draw.positions.find(d=>d.positionId===p.id);return {...p,...drawn,cardName:deck.find(c=>c.id===drawn?.cardId)?.name};};
   const freePositions=o.editionSnapshot.positions.filter(p=>p.visibility==='free').map(expand);
   const paidPositions=o.editionSnapshot.positions.filter(p=>p.visibility==='paid').map(expand);
   const brief={kind:'local-brief',readerName:o.displayFirstName||`${o.firstName} ${o.lastName}`,question:o.editionSnapshot.question,
    theme:o.editionSnapshot.theme,spread:o.editionSnapshot.spread,editionId:o.editionSnapshot.id,
    editionVersion:o.editionSnapshot.version,draw:o.draw,numerology,personalCard:{...o.draw.personalLens,
     name:deck.find(c=>c.id===o.draw.personalLens.cardId)?.name??o.draw.personalLens.cardId},
    freePositions,paidPositions,freeEmailContext:o.editionSnapshot.freeEmailText,
    rules:[`State Life Path ${numerology.lifePath.number} — ${numerology.lifePath.archetype} plainly and use it as the primary recognition anchor.`,`Use ${numerology.privateAnchors.selectedCanon.map((entry:any)=>entry.key).join(', ')} to guide the question-specific synthesis before mapping it to cards. Do not expose Expression or Personality labels in customer prose.`,'Adapt to the edition theme and every ordered position; never assume six cards.','Interpret only paid positions; free positions are context.','Explain pictures before meanings and relate positions together.','Keep the personal card secondary to the Life Path foundation.','Do not promise outcomes or invent private facts.']};
   this.store.put('briefs',j.id,brief);return this.env(e,{brief});
  }
  if(operation==='write-report'){
   const j=this.job(e,'main');const b=this.store.get<any>('briefs',j.id);if(!b)throw new FulfillmentError(409,'Saved brief required.');
   // Honest fixture: structural evidence, not an AI-written tarot reading.
   j.report=j.report??{id:'report:'+e.orderId,version:1,kind:'local-layout-reading',readerName:b.readerName,
    question:b.question,theme:b.theme,spread:b.spread,personalCard:{...b.personalCard,
     text:`Your personal card, ${b.personalCard.name}, is a secondary lens on how you may approach choices. It qualifies the Life Path foundation rather than replacing it.`},
    numerologyFoundation:{...b.numerology.lifePath,
     application:b.numerology.lifePath.number===4
      ?'For this question, the Builder anchor asks how steady work, realistic steps, and durable structure can serve the calling without becoming rigidity, overwork, or control.'
      :`For this question, use the strengths and growth edges of ${b.numerology.lifePath.archetype} as the primary lens, and test them against the actual card positions rather than treating the profile as fate.`,
     privateEvidence:{canonVersion:b.numerology.canonVersion,keys:b.numerology.privateAnchors.selectedCanon.map((entry:any)=>entry.key),expressionNumber:b.numerology.privateAnchors.expressionNumber,personalityNumber:b.numerology.privateAnchors.personalityNumber}},
    opening:`Your Life Path ${b.numerology.lifePath.number} is ${b.numerology.lifePath.archetype}. That is the primary numerology anchor for this reading. This reading uses ${b.spread.name} to continue your question through the theme of ${b.theme.toLowerCase()}. The cards already shown in the daily letter remain the context; the sections below complete only the positions that were face down.`,
    sections:b.paidPositions.map((p:any)=>({positionId:p.id,number:p.number,cardId:p.cardId,cardName:p.cardName,
     reversed:p.reversed,title:p.label,text:`Here ${p.cardName} appears in the position “${p.label}.” Within the theme of ${b.theme.toLowerCase()}, this is one part of the pattern to examine rather than a fixed prediction. The production writer will replace this layout sample with a complete card-specific interpretation connected to the other positions.`})),
    closing:`The ${b.paidPositions.length} newly revealed cards belong to ${b.spread.name}. The final reading must connect them to the ${b.freePositions.length} cards already read, Life Path ${b.numerology.lifePath.number} — ${b.numerology.lifePath.archetype} as the primary anchor, and ${b.personalCard.name} as the secondary personal-card perspective. This local sample proves that structure; it is not a customer interpretation.`,
    notice:'LOCAL PIPELINE SAMPLE - NOT A CUSTOMER READING'};this.save(j);return this.env(e,{report:j.report});
  }
  if(operation==='grade-report'){
   const j=this.job(e,'main'),o=this.order(e.orderId),r=j.report,b=this.store.get<any>('briefs',j.id);
   const expected=o.editionSnapshot.positions.filter(p=>p.visibility==='paid');
   const valid=r&&r.theme===o.editionSnapshot.theme&&r.spread?.id===o.editionSnapshot.spread.id&&
    r.sections.length===expected.length&&r.sections.every((s:any,i:number)=>s.positionId===expected[i].id&&s.number===expected[i].number&&s.cardId===o.draw.positions.find(d=>d.positionId===s.positionId)?.cardId)&&
    r.personalCard.cardId===o.draw.personalLens.cardId&&r.numerologyFoundation?.number===b?.numerology?.lifePath?.number&&
    r.numerologyFoundation?.archetype===b?.numerology?.lifePath?.archetype&&
    r.numerologyFoundation?.privateEvidence?.expressionNumber===b?.numerology?.privateAnchors?.expressionNumber&&
    r.numerologyFoundation?.privateEvidence?.personalityNumber===b?.numerology?.privateAnchors?.personalityNumber&&
    ['lifePath','expression','personality'].every(role=>b?.numerology?.privateAnchors?.selectedCanon?.some((entry:any)=>entry.role===role));
   if(!valid){j.state='review';this.save(j);return this.env(e,{reportStatus:'review'});}
   j.state='approved';this.save(j);this.store.put('reports',r.id,{...r,hash:hash(r),approvedFor:'local-structure-test-only'});return this.env(e,{reportStatus:'approved',reportId:r.id});
  }
  if(operation==='render-written'){
   this.job(e,'main');const r=this.store.get<any>('reports','report:'+e.orderId);if(!r)throw new FulfillmentError(409,'Approved fixture report required.');
   const o=this.order(e.orderId),id='written:'+e.orderId;
   const positions=o.editionSnapshot.positions.map(p=>{const drawn=o.draw.positions.find(d=>d.positionId===p.id)!;return {...p,...drawn,cardName:deck.find(c=>c.id===drawn.cardId)?.name??drawn.cardId};});
   mkdirSync(this.artifactRoot,{recursive:true});const safe=e.orderId.replace(/[^a-zA-Z0-9_-]/g,'_');
   const pdfPath=join(this.artifactRoot,`marcus-reading-${safe}.pdf`);
   const process=spawnSync(this.pdfPython,[PDF_RENDERER,pdfPath],{input:JSON.stringify({...r,positions}),encoding:'utf8',maxBuffer:1024*1024*4});
   if(process.status!==0)throw new FulfillmentError(500,`PDF renderer failed: ${(process.stderr||'unknown error').trim()}`);
   let pdf;try{pdf=JSON.parse(process.stdout);}catch{throw new FulfillmentError(500,'PDF renderer returned invalid metadata.');}
   this.store.put('artifacts',id,{id,orderId:e.orderId,kind:'written-pdf-fixture',pdf,reportHash:r.hash,notice:r.notice});return this.env(e,{artifactId:id,pdf});
  }
  if(operation==='queue-written-delivery'){
   const j=this.job(e,'main');if(!this.store.get('artifacts','written:'+e.orderId))throw new FulfillmentError(409,'Written artifact missing.');
   const deliveryTaskId=this.task(e,'written','written:'+e.orderId);j.state='ready';this.save(j);this.updateOrder(e.orderId,o=>({...o,writtenStatus:'ready'}));return this.env(e,{deliveryTaskId});
  }
  if(operation==='claim-audio'){
   const o=this.order(e.orderId);if(!o.audio)return this.env(e,{audioStatus:'not-purchased'});
   if(!this.store.get('reports','report:'+e.orderId)){this.store.put('waiting-audio',e.orderId,{orderId:e.orderId});return this.env(e,{audioStatus:'waiting-report'});}
   return this.claim(e,'audio');
  }
  if(operation==='prepare-audio-script'){
   const j=this.job(e,'audio'),r=this.store.get<any>('reports','report:'+e.orderId);if(!r)throw new FulfillmentError(409,'Report missing.');
   j.script=j.script??{reportId:r.id,reportHash:r.hash,voiceVersion:'fixture-tone-v1',segments:r.sections.map((s:any,i:number)=>({index:i,text:s.text,hash:hash(s.text),seed:i+1})).concat([{index:r.sections.length,text:r.closing,hash:hash(r.closing),seed:r.sections.length+1}])};this.save(j);return this.env(e,{script:j.script});
  }
  if(operation==='next-audio-segment'){
   const j=this.job(e,'audio');if(!j.script)throw new FulfillmentError(409,'Saved script required.');
   for(const segment of j.script.segments){const id=j.id+':'+segment.index;const row=this.store.get<any>('segments',id);if(row?.status==='stored')continue;return this.env(e,{segmentState:'pending',segment,segmentId:id,predictionId:row?.predictionId,voice:{signedUrl:'http://127.0.0.1:5088/local-fixture-voice.wav',version:'fixture-tone-v1'}});}
   return this.env(e,{segmentState:'done'});
  }
  if(operation==='record-prediction'||operation==='record-prediction-status'){
   this.job(e,'audio');const p=raw.prediction;if(!p?.id)throw new FulfillmentError(400,'Prediction ID required.');
   const prior=this.store.get<any>('segments',e.segmentId);if(prior?.predictionId&&prior.predictionId!==p.id)throw new FulfillmentError(409,'Prediction conflict.');
   this.store.put('segments',e.segmentId,{...prior,orderId:e.orderId,index:e.segment.index,textHash:e.segment.hash,predictionId:p.id,status:p.status,output:p.output});return this.env(e,{predictionId:p.id,predictionStatus:p.status});
  }
  if(operation==='poll-budget'){
   const j=this.job(e,'audio');const row=this.store.get<any>('segments',e.segmentId);if(!row)throw new FulfillmentError(409,'Saved prediction required.');
   row.polls=(row.polls||0)+1;this.store.put('segments',e.segmentId,row);j.expiresAt=this.now()+120000;this.save(j);return this.env(e,{pollStatus:row.polls<=20?'allowed':'review'});
  }
  if(operation==='store-audio-segment'){
   this.job(e,'audio');const row=this.store.get<any>('segments',e.segmentId);if(row?.status!=='succeeded')throw new FulfillmentError(409,'Successful prediction required.');
   // Local adapter: an http(s) provider output is downloaded to the local audio store with size + SHA-256
   // (production copies to private object storage). Non-URL outputs (unit tests use fixture://) keep the identity-only record.
   const output=Array.isArray(row.output)?row.output[0]:row.output;
   if(typeof output==='string'&&/^https?:\/\//.test(output)){
    const dir=join(this.audioRoot,safeName(e.orderId));mkdirSync(dir,{recursive:true});const file=join(dir,`${safeName(String(e.segmentId))}.wav`);
    const dl=spawnSync('curl',['-fsSL','--max-time','120','-o',file,output],{encoding:'utf8'});
    if(dl.status!==0||!existsSync(file)||statSync(file).size===0)throw new FulfillmentError(502,`Segment download failed: ${(dl.stderr||'no bytes').trim()}`);
    row.file=fileRecord(file);row.fixtureOnly=false;
   }else row.fixtureOnly=true;
   row.status='stored';this.store.put('segments',e.segmentId,row);return this.env(e,{segmentFile:row.file});
  }
  if(operation==='assemble-audio'){
   const j=this.job(e,'audio');const rows=(j.script?.segments??[]).map((s:any)=>this.store.get<any>('segments',j.id+':'+s.index));
   if(!j.script||rows.length===0||rows.some(r=>r?.status!=='stored'))throw new FulfillmentError(409,'All ordered segments required.');
   if(rows.every(r=>r.fixtureOnly)){ // identity-only segments (unit tests): manifest, no playable audio
    this.store.put('artifacts','audio:'+e.orderId,{id:'audio:'+e.orderId,orderId:e.orderId,kind:'local-audio-manifest-fixture',reportHash:j.script.reportHash,script:j.script,notice:'Manifest only. No playable audio generated.'});return this.env(e,{audioQa:'passed',artifactId:'audio:'+e.orderId});
   }
   if(rows.some(r=>!r.file?.path||!existsSync(r.file.path)))throw new FulfillmentError(409,'Every stored segment needs its downloaded audio file before assembly.');
   const audio=this.assembleAudio(e.orderId,rows);
   this.store.put('artifacts','audio:'+e.orderId,{id:'audio:'+e.orderId,orderId:e.orderId,kind:'local-audio-assembled-fixture',reportHash:j.script.reportHash,script:j.script,segments:rows.map(r=>({index:r.index,predictionId:r.predictionId,file:r.file})),...audio,notice:'LOCAL ASSEMBLY — segments came from a local provider stand-in, not a real voice generation.'});
   return this.env(e,{audioQa:audio.qa,artifactId:'audio:'+e.orderId,audio:{mp3:audio.mp3,wav:audio.wav,expectedDurationSeconds:audio.expectedDurationSeconds}});
  }
  if(operation==='complete-audio'){
   const j=this.job(e,'audio');if(!this.store.get('artifacts','audio:'+e.orderId))throw new FulfillmentError(409,'Audio artifact required.');j.state='ready';this.save(j);this.updateOrder(e.orderId,o=>({...o,audioStatus:'ready'}));return this.env(e);
  }
  if(operation==='queue-audio-delivery'){
   this.job(e,'audio');return this.env(e,{deliveryTaskId:this.task(e,'audio','audio:'+e.orderId)});
  }
  if(operation==='claim-delivery'){
   return this.store.transaction(()=>{const d=this.store.get<any>('deliveries',e.deliveryTaskId);if(!d||d.orderId!==e.orderId)throw new FulfillmentError(404,'Delivery task missing.');if(d.status==='captured'||(d.leaseUntil>this.now()))return this.env(e,{deliveryStatus:'already-claimed-or-complete'});d.leaseToken=randomUUID();d.leaseUntil=this.now()+120000;d.status='claimed';this.store.put('deliveries',d.id,d);return this.env(e,{deliveryStatus:'due',deliveryLease:d.leaseToken});});
  }
  if(operation==='deliver'){
   const d=this.store.get<any>('deliveries',e.deliveryTaskId);if(!d||d.leaseToken!==e.deliveryLease||d.leaseUntil<=this.now())throw new FulfillmentError(409,'Delivery lease required.');
   const id='outbox:'+d.id;const row=this.store.get<any>('outbox',id)??{id,orderId:e.orderId,to:this.order(e.orderId).deliveryEmail,artifactId:d.artifactId,sent:false,capturedAt:new Date(this.now()).toISOString(),notice:'LOCAL CAPTURE ONLY — no provider send'};this.store.put('outbox',id,row);return this.env(e,{deliveryOutcome:'captured',outboxId:id});
  }
  if(operation==='record-delivery'){
   const d=this.store.get<any>('deliveries',e.deliveryTaskId);if(!d||d.leaseToken!==e.deliveryLease||!this.store.get('outbox','outbox:'+d.id))throw new FulfillmentError(409,'Captured delivery evidence required.');d.status='captured';this.store.put('deliveries',d.id,d);return this.env(e,{deliveryOutcome:'captured'});
  }
  if(operation==='fail-or-review'){
   const j=this.job(e);j.state='review';this.save(j);this.updateOrder(e.orderId,o=>({...o,...(j.kind==='main'?{writtenStatus:'review' as const}:{audioStatus:'failed' as const})}));return this.env(e,{review:true});
  }
  if(operation==='recover'){
   const order=this.order(e.orderId);const pending:string[]=[];
   for(const kind of ['main','audio']){const j=this.store.get<Job>('jobs',kind+':'+e.orderId);if(j&&['claimed','approved'].includes(j.state)&&j.expiresAt<=this.now())pending.push(kind);}
   if(order.audio&&this.store.get('reports','report:'+e.orderId)&&!this.store.get('jobs','audio:'+e.orderId))pending.push('audio');
   return this.env(e,{recoverableActions:pending});
  }
  throw new FulfillmentError(404,'Unknown local fulfillment operation.');
 }
}
