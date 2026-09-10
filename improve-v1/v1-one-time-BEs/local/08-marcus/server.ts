/** Isolated local simulation. No environment loading or production service imports. */
import { createServer, type IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { MAIN_CENTS, SAME_DAY_CENTS, type Intake, type PaidOrder } from './contracts';
import { personalLens, drawForOrder, validateEdition } from './draw';
import { deck, editions } from './fixtures';
import { LocalStore } from './store';
import { LocalFulfillment, FulfillmentError, LOCAL_SERVICE_TOKEN } from './fulfillment';
export const AUDIO_TEST_CENTS = 1700;
const notice = 'Local simulation only. No payment taken, reading generated, audio recorded or email sent. Fixture state is saved locally when launched from the CLI.';
interface Artifact {
  id:string; orderId:string; kind:'written-pdf-fixture'; notice:string; reportHash:string;
  pdf:{path:string;mediaType:'application/pdf';bytes:number;sha256:string};
}
export interface LocalOrder extends PaidOrder {
  firstName:string; lastName:string; totalCents:number; localOnly:true; simulationNotice:string;
  audioPriceProvisional:true; audioDecision:'pending'|'declined'|'accepted';
  fulfillment:{writtenJobId:string;audioJobId?:string;artifact?:Artifact};
}
class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
const fail=(status:number,message:string):never=>{throw new ApiError(status,message);};
const name=(value:unknown):string=> typeof value==='string' && value.trim().length>0 && value.trim().length<=100 ? value.trim() : fail(400,'Enter a first and last name, each no more than 100 characters.');
async function body(req:IncomingMessage,limit=16000):Promise<Record<string,unknown>> {
  let source=''; for await(const chunk of req){source+=chunk; if(source.length>limit)fail(413,'Request is too large.');}
  let data:unknown;try{data=JSON.parse(source);}catch{fail(400,'Send valid JSON.');}
  if(!data || typeof data!=='object' || Array.isArray(data))fail(400,'Send a JSON object.');
  return data as Record<string,unknown>;
}
/** Tests default to memory. CLI explicitly opts into /tmp fake-data persistence. */
export function createLocalServer(options: {dataPath?: string; store?: LocalStore; now?: () => Date; artifactRoot?:string; pdfPython?:string} = {}) {
  editions.forEach(e=>validateEdition(e,deck));
  const store=options.store ?? new LocalStore(options.dataPath);
  const now=options.now ?? (()=>new Date());
  const fulfillment=new LocalFulfillment(store,()=>now().getTime(),options.artifactRoot,options.pdfPython);
  let assets:Record<string,string>|undefined;
  const server=createServer(async(req,res)=>{
    const json=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const host=req.headers.host??'';
      if(!/^127\.0\.0\.1:\d+$/.test(host))fail(403,'Use the loopback address shown by the local launcher.');
      const origin=req.headers.origin;
      if(origin && origin!==`http://${host}`)fail(403,'Cross-origin requests are not allowed.');
      const path=new URL(req.url??'/',`http://${host}`).pathname; const method=req.method;
      if(method==='POST' && path.startsWith('/internal/marcus08/')){
        if(req.headers.authorization!==`Bearer ${LOCAL_SERVICE_TOKEN}`)fail(401,'Local fixture service token required.');
        json(200,fulfillment.run(path.slice('/internal/marcus08/'.length),await body(req,262144)));return;
      }
      if(method==='GET' && ['/','/email','/booking','/bridge','/upsell','/thank-you'].includes(path)){
        const html=await readFile(new URL('./index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
      }
      if(method==='GET' && path.startsWith('/api/assets/')){
        if(!assets){const html=await readFile(new URL('../../docs/08-marcus/booking-page/mockup.html',import.meta.url),'utf8');const match=html.match(/const ASSETS=(\{.*?\});/);if(!match)fail(500,'Local assets unavailable.');assets=JSON.parse(match![1]);}
        const assetId=path.slice('/api/assets/'.length);
        const extra:Record<string,string>={'four-of-cups':'four-of-cups','three-of-swords':'three-of-swords','eight-of-swords':'eight-of-swords','star':'the-star','seven-of-pentacles':'seven-of-pentacles'};
        if(extra[assetId]){const bytes=await readFile(new URL(`../../assets/email/cards/${extra[assetId]}.jpg`,import.meta.url));res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(bytes);return;}
        const data=assets![assetId];if(!data)fail(404,'Asset not found.');
        const match=data.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);if(!match)fail(500,'Invalid local asset.');res.writeHead(200,{'Content-Type':match![1],'Cache-Control':'public, max-age=3600'});res.end(Buffer.from(match![2],'base64'));return;
      }
      const reportMatch=path.match(/^\/api\/orders\/([^/]+)\/report\.pdf$/);
      if(method==='GET' && reportMatch){
        const artifact=store.get<Artifact>('artifacts','written:'+reportMatch[1]);if(!artifact)fail(404,'Written PDF fixture not found.');
        const pdf=await readFile(artifact!.pdf.path);res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="marcus-personal-reading.pdf"','Content-Length':String(pdf.length),'Cache-Control':'no-store'});res.end(pdf);return;
      }
      if(method==='GET' && path==='/api/editions'){json(200,{editions});return;}
      if(method==='GET' && path.startsWith('/api/editions/')){const edition=editions.find(e=>e.id===path.slice('/api/editions/'.length));if(!edition)fail(404,'Edition not found.');json(200,{edition,cards:deck.filter(c=>edition!.positions.some(p=>p.fixedCard?.cardId===c.id))});return;}
      if(method==='POST' && path==='/api/intake'){
        const data=await body(req);const edition=editions.find(e=>e.id===data.editionId);if(!edition)fail(400,'Choose a valid edition.');
        if(typeof data.sameDay!=='boolean')fail(400,'Choose whether to add same-day delivery.');
        const intake:Intake={id:randomUUID(),editionId:edition!.id,editionVersion:edition!.version,firstName:name(data.firstName),lastName:name(data.lastName),sameDay:data.sameDay as boolean};store.insert('intakes',intake.id,intake);json(201,{intake});return;
      }
      if(method==='POST' && path==='/api/local-pay'){
        const data=await body(req);const intake=store.get<Intake>('intakes',String(data.intakeId));if(!intake)fail(404,'Intake not found.');
        
        if(typeof data.email!=='string' || data.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))fail(400,'Enter a valid test email address.');
        const result=store.transaction(()=>{
        const prior=store.get<string>('paidByIntake',intake!.id);if(prior)return {status:200,order:store.get<LocalOrder>('orders',prior)!};
        const edition=editions.find(e=>e.id===intake!.editionId)!;const id=randomUUID();
        const paidAt=now().toISOString();const deliveryHours=intake!.sameDay?12:24;const dueAt=new Date(Date.parse(paidAt)+deliveryHours*3600000).toISOString();
        let lens;try{lens=personalLens(intake!.firstName,intake!.lastName);}catch{fail(400,'This name needs a supported personal-card method. Try a test name using Latin letters.');}
        const order:LocalOrder={id,intakeId:intake!.id,editionSnapshot:structuredClone(edition),draw:drawForOrder(id,edition,lens!,deck),deliveryEmail:(data.email as string).trim(),baseCents:MAIN_CENTS,bumpCents:intake!.sameDay?SAME_DAY_CENTS:0,currency:'usd',paymentReference:`local_paid_${id}`,paidAt,dueAt,deliveryHours,writtenStatus:'queued',firstName:intake!.firstName,lastName:intake!.lastName,totalCents:MAIN_CENTS+(intake!.sameDay?SAME_DAY_CENTS:0),localOnly:true,simulationNotice:notice,audioPriceProvisional:true,audioDecision:'pending',fulfillment:{writtenJobId:`written_${id}`}};
        store.insert('orders',id,order);store.insert('paidByIntake',intake!.id,id);return {status:201,order};});json(result.status,{order:result.order});return;
      }
      const orderMatch=path.match(/^\/api\/orders\/([^/]+)(?:\/(audio|fulfill))?$/);
      if(orderMatch){let order=store.get<LocalOrder>('orders',orderMatch[1]);if(!order)fail(404,'Order not found.');
        if(method==='GET' && !orderMatch[2]){json(200,{order});return;}
        if(method==='POST' && orderMatch[2]==='audio'){
          const data=await body(req);if(typeof data.accept!=='boolean')fail(400,'Choose accept or decline.');
          order=store.update<LocalOrder>('orders',order!.id,(order)=>{
          if(data.accept && !order!.audio){order!.audio={purchased:true,amountCents:AUDIO_TEST_CENTS,paymentReference:`local_audio_${order!.id}`};order!.audioStatus='queued';order!.audioDecision='accepted';order!.fulfillment.audioJobId=`audio_${order!.id}`;order!.totalCents+=AUDIO_TEST_CENTS;}
          else if(!data.accept && !order!.audio)order!.audioDecision='declined';
          return order;});
          json(200,{order});return;
        }
        if(method==='POST' && orderMatch[2]==='fulfill'){
          let context=fulfillment.run('reconcile',{id:`local-main-paid:${order!.id}`,orderId:order!.id,type:'main.paid'});
          context=fulfillment.run('claim-main',context);
          if(context.jobState==='claimed')for(const stage of ['build-brief','write-report','grade-report','render-written','queue-written-delivery'])context=fulfillment.run(stage,context);
          order=store.get<LocalOrder>('orders',order!.id)!;const artifact=store.get<Artifact>('artifacts','written:'+order.id);
          if(!artifact)fail(409,'Written PDF fixture is not ready.');
          order=store.update<LocalOrder>('orders',order.id,current=>({...current,fulfillment:{...current.fulfillment,artifact:artifact!}}));
          json(200,{order,artifact,pdfUrl:`/api/orders/${encodeURIComponent(order.id)}/report.pdf`});return;
        }
      }
      fail(404,'Local route not found.');
    }catch(error){json((error instanceof ApiError || error instanceof FulfillmentError)?error.status:500,{error:(error instanceof ApiError || error instanceof FulfillmentError)?error.message:'Local simulation could not complete this request.'});}
  });
  if(!options.store)server.on('close',()=>store.close());
  return server;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  createLocalServer({dataPath:'/tmp/08-marcus-local/state.sqlite'}).listen(5088,'127.0.0.1',()=>console.log('Marcus local simulation: http://127.0.0.1:5088 — no external services; fake fixture state saved in /tmp/08-marcus-local/state.sqlite.'));
}
