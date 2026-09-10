import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LocalStore} from './store';
import {LocalFulfillment} from './fulfillment';
import {editions,deck} from './fixtures';
import {drawForOrder,personalLens} from './draw';
import type {Edition} from './contracts';
function setup(){
 const store=new LocalStore();let time=Date.parse('2026-09-10T00:00:00Z');
 const artifactRoot=mkdtempSync(join(tmpdir(),'marcus-pdf-'));
 const edition=editions[0];const order={id:'test',paymentReference:'local_paid_test',editionSnapshot:edition,draw:drawForOrder('test',edition,personalLens('Jane','Smith'),deck),deliveryEmail:'fixture@example.test',paidAt:new Date(time).toISOString(),dueAt:new Date(time+12*3600000).toISOString(),deliveryHours:12,bumpCents:1277,writtenStatus:'queued',firstName:'Jane',lastName:'Smith',audio:{purchased:true}};
 store.put('orders','test',order);return {store,order,f:new LocalFulfillment(store,()=>time,artifactRoot),advance:()=>time+=120001,close:()=>{store.close();rmSync(artifactRoot,{recursive:true,force:true});}};
}
function written(f:LocalFulfillment){let e=f.run('reconcile',{id:'main-event',orderId:'test',type:'main.paid'});for(const stage of ['claim-main','build-brief','write-report','grade-report','render-written','queue-written-delivery'])e=f.run(stage,e);return e;}
test('saved paid cards, independent written delivery, duplicate capture and audio parity',()=>{
 const {store,order,f,close}=setup();try{
 let e=f.run('reconcile',{id:'audio-event',orderId:'test',type:'audio.paid'});assert.equal(f.run('claim-audio',e).audioStatus,'waiting-report');
 e=written(f);assert.equal(e.order.writtenStatus,'ready');assert.deepEqual(e.order.draw,order.draw);
 const report=store.get<any>('reports','report:test');assert.equal(report.sections.length,4);assert.equal(report.approvedFor,'local-structure-test-only');
 const writtenArtifact=store.get<any>('artifacts','written:test');assert.equal(writtenArtifact.kind,'written-pdf-fixture');assert.ok(existsSync(writtenArtifact.pdf.path));assert.equal(readFileSync(writtenArtifact.pdf.path).subarray(0,4).toString(),'%PDF');
 let d=f.run('claim-delivery',e);d=f.run('deliver',d);d=f.run('record-delivery',d);assert.equal(d.deliveryOutcome,'captured');assert.equal(store.get<any>('outbox','outbox:written:test').sent,false);assert.equal(f.run('claim-delivery',e).deliveryStatus,'already-claimed-or-complete');
 assert.equal(f.run('claim-main',e).jobState,'ready');
 e=f.run('claim-audio',e);e=f.run('prepare-audio-script',e);assert.equal(e.script.reportHash,report.hash);
 for(let i=0;i<e.script.segments.length;i++){
  e=f.run('next-audio-segment',e);e=f.run('record-prediction',{context:e,prediction:{id:'prediction-'+i,status:'processing'}});
  assert.throws(()=>f.run('record-prediction',{context:e,prediction:{id:'wrong',status:'processing'}}),/conflict/);
  e=f.run('record-prediction-status',{context:e,prediction:{id:'prediction-'+i,status:'succeeded',output:'fixture://segment'}});e=f.run('store-audio-segment',e);
 }
 assert.equal(f.run('next-audio-segment',e).segmentState,'done');e=f.run('assemble-audio',e);e=f.run('complete-audio',e);e=f.run('queue-audio-delivery',e);assert.equal(e.order.dueAt,order.dueAt);assert.equal(e.order.audioStatus,'ready');assert.equal(store.get<any>('artifacts','audio:test').kind,'local-audio-manifest-fixture');
 }finally{close();}
});
test('leases prevent concurrent work and expiry permits retry without redraw',()=>{
 const {f,order,advance,close}=setup();try{
 const event={id:'main-event',orderId:'test',type:'main.paid'};const e=f.run('reconcile',event);const first=f.run('claim-main',e);assert.equal(f.run('claim-main',e).jobState,'busy');
 assert.throws(()=>f.run('reconcile',{...event,type:'audio.paid'}),/reused/);
 advance();assert.throws(()=>f.run('build-brief',first),/expired/);assert.deepEqual(f.run('recover',e).recoverableActions,['main']);
 const next=f.run('claim-main',e);assert.notEqual(next.leaseToken,first.leaseToken);assert.deepEqual(next.order.draw,order.draw);
 }finally{close();}
});

test('eight-card edition adapts its theme, 4/4 split, report sections and PDF without six-card assumptions',()=>{
 const artifactRoot=mkdtempSync(join(tmpdir(),'marcus-eight-pdf-'));const store=new LocalStore();
 const edition:Edition={id:'adaptive-eight-v1',version:1,slug:'adaptive-eight',
  question:'What needs my attention as I decide what comes next?',
  theme:'Moving from uncertainty toward a grounded choice',status:'published',freeEmailText:'A complete local email context '.repeat(20),
  spread:{id:'eight-paths',name:'The Eight Paths',version:1},positions:[
   {id:'p1',number:1,label:'What brought you here',visibility:'free',fixedCard:{cardId:'star',reversed:false}},
   {id:'p2',number:2,label:'What you already know',visibility:'free',fixedCard:{cardId:'strength',reversed:false}},
   {id:'p3',number:3,label:'What is asking for attention',visibility:'free',fixedCard:{cardId:'hermit',reversed:false}},
   {id:'p4',number:4,label:'What can guide the choice',visibility:'free',fixedCard:{cardId:'sun',reversed:false}},
   {id:'p5',number:5,label:'What uncertainty is protecting',visibility:'paid'},
   {id:'p6',number:6,label:'What becomes possible',visibility:'paid'},
   {id:'p7',number:7,label:'What to carry forward',visibility:'paid'},
   {id:'p8',number:8,label:'The grounded next step',visibility:'paid'},
  ]};
 const lens=personalLens('Jane','Smith');const order:any={id:'eight',paymentReference:'local_paid_eight',editionSnapshot:edition,
  draw:drawForOrder('eight',edition,lens,deck,()=>0),deliveryEmail:'eight@example.test',paidAt:'2026-09-10T00:00:00Z',
  dueAt:'2026-09-11T00:00:00Z',deliveryHours:24,bumpCents:0,writtenStatus:'queued',firstName:'Jane',lastName:'Smith'};
 store.put('orders','eight',order);
 const fulfillment=new LocalFulfillment(store,()=>Date.parse('2026-09-10T00:00:00Z'),artifactRoot);
 try{
  let e=fulfillment.run('reconcile',{id:'eight-main',orderId:'eight',type:'main.paid'});
  e=fulfillment.run('claim-main',e);e=fulfillment.run('build-brief',e);
  assert.equal(e.brief.theme,edition.theme);assert.equal(e.brief.freePositions.length,4);assert.equal(e.brief.paidPositions.length,4);
  for(const stage of ['write-report','grade-report','render-written','queue-written-delivery'])e=fulfillment.run(stage,e);
  const report=store.get<any>('reports','report:eight');assert.equal(report.sections.length,4);assert.equal(report.theme,edition.theme);
  const artifact=store.get<any>('artifacts','written:eight');assert.equal(artifact.kind,'written-pdf-fixture');assert.ok(artifact.pdf.bytes>1000);assert.equal(readFileSync(artifact.pdf.path).subarray(0,4).toString(),'%PDF');
 }finally{store.close();rmSync(artifactRoot,{recursive:true,force:true});}
});
