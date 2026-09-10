import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createLocalServer } from './server';

test('local journey preserves context, prices, draws and replay behavior',async()=>{
 const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const call=async(path:string,data?:unknown)=>{const response=await fetch(root+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:response.status,data:await response.json() as any};};
 try{
  const list=await call('/api/editions');assert.ok(list.data.editions.some((e:any)=>e.id==='healing-v1'));assert.ok(list.data.editions.some((e:any)=>e.id==='commitment-v1'));
  const edition=await call('/api/editions/healing-v1');assert.equal(edition.data.cards.length,2);assert.ok(edition.data.edition.positions.filter((p:any)=>p.visibility==='paid').every((p:any)=>!p.fixedCard));
  assert.equal((await call('/api/editions/missing')).status,404);
  assert.equal((await call('/api/intake',{editionId:'healing-v1',firstName:' ',lastName:'Jones',sameDay:false})).status,400);
  assert.equal((await call('/api/local-pay',{intakeId:'missing',email:'test@example.test'})).status,404);
  const unicodeIntake=(await call('/api/intake',{editionId:'healing-v1',firstName:'Joël',lastName:'Chue',sameDay:false})).data.intake;
  assert.equal((await call('/api/local-pay',{intakeId:unicodeIntake.id,email:'test@example.test'})).status,400);
  const intake=(await call('/api/intake',{editionId:'healing-v1',firstName:' Joel ',lastName:"O'Connor",sameDay:true,priceCents:1})).data.intake;
  assert.equal(intake.firstName,'Joel');
  assert.equal((await call('/api/local-pay',{intakeId:intake.id,email:'bad'})).status,400);
  const order=(await call('/api/local-pay',{intakeId:intake.id,email:'test@example.test'})).data.order;
  assert.equal(order.totalCents,4777);assert.equal(order.writtenStatus,'queued');assert.equal(order.localOnly,true);assert.equal(order.draw.positions.length,6);
  const replay=(await call('/api/local-pay',{intakeId:intake.id,email:'test@example.test'})).data.order;
  assert.equal(replay.id,order.id);assert.deepEqual(replay.draw,order.draw);assert.equal(replay.fulfillment.writtenJobId,order.fulfillment.writtenJobId);
  const path=`/api/orders/${order.id}`;
  assert.equal((await call(path+'/audio',{accept:false})).data.order.totalCents,4777);
  assert.equal((await call(path+'/audio',{accept:true})).data.order.totalCents,6477);
  assert.equal((await call(path+'/audio',{accept:true})).data.order.totalCents,6477);
  assert.equal((await call(path+'/audio',{accept:false})).data.order.audioDecision,'accepted');
  const fulfilled=(await call(path+'/fulfill',{})).data;assert.equal(fulfilled.artifact.kind,'written-pdf-fixture');assert.equal(fulfilled.artifact.pdf.mediaType,'application/pdf');assert.ok(fulfilled.artifact.pdf.bytes>1000);assert.match(fulfilled.pdfUrl,/\/report\.pdf$/);
  const pdf=await fetch(root+fulfilled.pdfUrl);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,4).toString(),'%PDF');
  assert.deepEqual((await call(path+'/fulfill',{})).data,fulfilled);assert.deepEqual((await call(path)).data.order.draw,order.draw);
  const baseIntake=(await call('/api/intake',{editionId:'commitment-v1',firstName:'Jane',lastName:'Smith',sameDay:false})).data.intake;
  const base=(await call('/api/local-pay',{intakeId:baseIntake.id,email:'base@example.test'})).data.order;assert.equal(base.totalCents,3500);assert.notEqual(base.id,order.id);
  const basePath=`/api/orders/${base.id}`;const first=(await call(basePath+'/fulfill',{})).data;
  await call(basePath+'/audio',{accept:true});const late=(await call(basePath+'/fulfill',{})).data;assert.equal(late.artifact.reportHash,first.artifact.reportHash);assert.equal(late.artifact.pdf.sha256,first.artifact.pdf.sha256);assert.equal(late.order.totalCents,5200);assert.equal(late.order.audioStatus,'queued');
  const blocked=await fetch(root+'/api/intake',{method:'POST',headers:{Origin:'https://example.com'},body:'{}'});assert.equal(blocked.status,403);
  const asset=await fetch(root+'/api/assets/back');assert.equal(asset.status,200);assert.match(asset.headers.get('content-type')!,/^image\//);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from './store';

test('restart preserves intakes, paid draws, deadlines, audio and fixture artifacts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'marcus-server-'));const dataPath=join(dir,'fixtures.sqlite');
 const artifactRoot=join(dir,'artifacts');let server=createLocalServer({dataPath,artifactRoot,now:()=>new Date('2026-09-10T00:00:00Z')});let root='';
 const start=async()=>{await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));root=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;};
 const stop=async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));};
 const call=async(path:string,data?:unknown)=>{const r=await fetch(root+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,...await r.json() as any};};
 await start();
 try {
  const {intake}=await call('/api/intake',{editionId:'healing-v1',firstName:'Jane',lastName:'Smith',sameDay:true});
  const results=await Promise.all(Array.from({length:5},()=>call('/api/local-pay',{intakeId:intake.id,email:'fixture@example.test'})));
  const order=results[0].order;assert.ok(results.every(r=>r.order.id===order.id));assert.equal(results.filter(r=>r.status===201).length,1);
  assert.equal(order.paidAt,'2026-09-10T00:00:00.000Z');assert.equal(order.dueAt,'2026-09-10T12:00:00.000Z');assert.equal(order.deliveryHours,12);
  const path=`/api/orders/${order.id}`;
  await call(path+'/audio',{accept:true});const completed=await call(path+'/fulfill',{});
  const {intake:baseIntake}=await call('/api/intake',{editionId:'commitment-v1',firstName:'Joel',lastName:'Chue',sameDay:false});
  const base=await call('/api/local-pay',{intakeId:baseIntake.id,email:'fixture@example.test'});assert.equal(base.order.deliveryHours,24);assert.equal(base.order.dueAt,'2026-09-11T00:00:00.000Z');
  await stop();server=createLocalServer({dataPath,artifactRoot,now:()=>new Date('2026-10-10T00:00:00Z')});await start();
  const replay=await call('/api/local-pay',{intakeId:intake.id,email:'fixture@example.test'});assert.equal(replay.status,200);assert.deepEqual(replay.order,completed.order);
  assert.deepEqual((await call(path+'/audio',{accept:true})).order,completed.order);
  assert.deepEqual((await call(path+'/fulfill',{})).artifact,completed.artifact);
  assert.equal((await call('/api/local-pay',{intakeId:baseIntake.id,email:'fixture@example.test'})).order.dueAt,base.order.dueAt);
 } finally {await stop();rmSync(dir,{recursive:true,force:true});}
});

test('failed payment persistence rolls back order and intake index together',async()=>{
 const store=new LocalStore();const insert=store.insert.bind(store);
 store.insert=(namespace,key,value)=>{if(namespace==='paidByIntake')throw new Error('disk failure fixture');insert(namespace,key,value);};
 const server=createLocalServer({store});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const post=async(path:string,data:unknown)=>{const r=await fetch(root+path,{method:'POST',body:JSON.stringify(data)});return {status:r.status,...await r.json() as any};};
 let capturedOrderId='';store.insert=(namespace,key,value)=>{if(namespace==='orders')capturedOrderId=key;if(namespace==='paidByIntake')throw new Error('disk failure fixture');insert(namespace,key,value);};
 try{
  const {intake}=await post('/api/intake',{editionId:'healing-v1',firstName:'Jane',lastName:'Smith',sameDay:false});
  assert.equal((await post('/api/local-pay',{intakeId:intake.id,email:'test@example.test'})).status,500);
  assert.equal(store.get('orders',capturedOrderId),undefined);assert.equal(store.get('paidByIntake',intake.id),undefined);
  store.insert=insert;assert.equal((await post('/api/local-pay',{intakeId:intake.id,email:'test@example.test'})).status,201);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();}
});

test('internal fixture operations require service token and accept a full saved edition envelope',async()=>{
 const server=createLocalServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const root=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const post=async(path:string,data:unknown,token?:string)=>{const r=await fetch(root+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});return {status:r.status,data:await r.json() as any};};
 try{
  const {data:{intake}}=await post('/api/intake',{editionId:'quiet-v1',firstName:'Jane',lastName:'Smith',sameDay:false});
  const {data:{order}}=await post('/api/local-pay',{intakeId:intake.id,email:'qa@example.test'});
  const event={id:'internal-test',orderId:order.id,type:'main.paid'};const prefix='/internal/marcus08/';
  assert.equal((await post(prefix+'reconcile',event)).status,401);
  const token='marcus08-local-fixture-only';let result=await post(prefix+'reconcile',event,token);
  for(const stage of ['claim-main','build-brief','write-report','grade-report','render-written','queue-written-delivery']){result=await post(prefix+stage,result.data,token);assert.equal(result.status,200,JSON.stringify(result.data));}
  assert.equal(result.data.order.writtenStatus,'ready');assert.deepEqual(result.data.order.draw,order.draw);
  for(const id of ['four-of-cups','three-of-swords','eight-of-swords','star','seven-of-pentacles'])assert.equal((await fetch(root+'/api/assets/'+id)).status,200);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
