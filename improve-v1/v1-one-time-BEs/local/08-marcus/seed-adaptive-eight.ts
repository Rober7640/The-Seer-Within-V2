/** Seed one explicit 8-card local order for isolated n8n execution. No network or production access. */
import { LocalStore } from './store';
import { deck } from './fixtures';
import { drawForOrder, personalLens, validateEdition } from './draw';
import { MAIN_CENTS, type Edition } from './contracts';
import type { LocalOrder } from './server';

const orderId=process.argv[2]??'n8n-eight-20260910-v1';
const dataPath=process.argv[3]??'/tmp/08-marcus-local/state.sqlite';
const paidAt='2026-09-10T00:00:00.000Z';
const edition:Edition={
 id:'adaptive-eight-v1',version:1,slug:'adaptive-eight',status:'published',
 question:'What needs my attention as I decide what comes next?',
 theme:'Moving from uncertainty toward a grounded choice',
 spread:{id:'eight-paths',name:'The Eight Paths',version:1},
 freeEmailText:'Local continuity fixture: the four face-up cards established hope, patience, reflection and clarity.',
 positions:[
  {id:'p1',number:1,label:'What brought you here',visibility:'free',fixedCard:{cardId:'star',reversed:false}},
  {id:'p2',number:2,label:'What you already know',visibility:'free',fixedCard:{cardId:'strength',reversed:false}},
  {id:'p3',number:3,label:'What is asking for attention',visibility:'free',fixedCard:{cardId:'hermit',reversed:false}},
  {id:'p4',number:4,label:'What can guide the choice',visibility:'free',fixedCard:{cardId:'sun',reversed:false}},
  {id:'p5',number:5,label:'What uncertainty is protecting',visibility:'paid'},
  {id:'p6',number:6,label:'What becomes possible',visibility:'paid'},
  {id:'p7',number:7,label:'What to carry forward',visibility:'paid'},
  {id:'p8',number:8,label:'The grounded next step',visibility:'paid'},
 ]
};
validateEdition(edition,deck);
const firstName='Nadia',lastName='Rivera';
const order:LocalOrder={
 id:orderId,intakeId:'local-n8n-adaptive-intake',editionSnapshot:edition,
 draw:drawForOrder(orderId,edition,personalLens(firstName,lastName),deck,()=>0),
 deliveryEmail:'adaptive-eight@example.test',baseCents:MAIN_CENTS,bumpCents:0,currency:'usd',
 paymentReference:`local_paid_${orderId}`,paidAt,dueAt:'2026-09-11T00:00:00.000Z',deliveryHours:24,
 writtenStatus:'queued',firstName,lastName,totalCents:MAIN_CENTS,localOnly:true,
 simulationNotice:'Local adaptive n8n execution fixture. No payment or delivery.',
 audioPriceProvisional:true,audioDecision:'declined',fulfillment:{writtenJobId:`written_${orderId}`}
};
const store=new LocalStore(dataPath);
try{store.put('orders',orderId,order);}
finally{store.close();}
console.log(JSON.stringify({orderId,editionId:edition.id,theme:edition.theme,totalCards:8,freeCards:4,paidCards:4,dataPath}));
