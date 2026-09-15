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
export const AUDIO_TEST_CENTS = 1700; // approved audio price $17 (Joel, 2026-09-13); no longer provisional
const notice = 'Local simulation only. No payment taken, reading generated, audio recorded or email sent. Fixture state is saved locally when launched from the CLI.';
interface Artifact {
  id:string; orderId:string; kind:'written-pdf-fixture'; notice:string; reportHash:string;
  pdf:{path:string;mediaType:'application/pdf';bytes:number;sha256:string};
}
export interface LocalOrder extends PaidOrder {
  /** Birth-name split (first / rest-before-last-space / last) kept for the fulfillment brief and lens. */
  firstName:string; lastName:string; totalCents:number; localOnly:true; simulationNotice:string;
  audioPriceProvisional:true; audioDecision:'pending'|'declined'|'accepted';
  fulfillment:{writtenJobId:string;audioJobId?:string;artifact?:Artifact};
}
class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
const fail=(status:number,message:string):never=>{throw new ApiError(status,message);};
const text=(value:unknown,what:string,max=100):string=> typeof value==='string' && value.trim().length>0 && value.trim().length<=max ? value.trim() : fail(400,`Enter ${what}, no more than ${max} characters.`);
/** Split a birth name on its LAST space: "Mary Anne Smith" -> first "Mary Anne", last "Smith". */
function splitBirthName(full:string):{first:string;last:string}{
  const at=full.lastIndexOf(' ');
  if(at<1)fail(400,'Enter your full name at birth — a first name and a last name.');
  return {first:full.slice(0,at).trim(),last:full.slice(at+1).trim()};
}
/**
 * Date of birth arrives from the BOOKING PAGE as `YYYY-MM-DD` (three boxes, combined client-side) and is
 * validated here at intake time — before any money moves. Operator rule (2026-09-14, re-confirmed
 * 2026-09-15): "Birth name and date only on the booking page. Never on Stripe." Production does the same
 * in POST /api/backend/checkout (a bad date is refused before Stripe; never in a URL or on Stripe metadata).
 * Never log the value.
 */
function dateOfBirth(value:unknown,now:Date):string{
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))fail(400,'Enter your date of birth as month, day and a four-digit year.');
  const [y,m,d]=value.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y || date.getUTCMonth()!==m-1 || date.getUTCDate()!==d)fail(400,'That date of birth is not a real calendar date. Check the month and day.');
  let age=now.getUTCFullYear()-y; const before=now.getUTCMonth()+1<m || (now.getUTCMonth()+1===m && now.getUTCDate()<d); if(before)age--;
  if(age<16 || age>110)fail(400,'Check the year of your date of birth — it should have four digits, for example 1961.');
  return value;
}
/**
 * The three personal values, validated the same way whether they arrive from the booking page (POST /api/intake)
 * or are re-read off a saved intake at pay time. Reuses `text`, `splitBirthName` and `dateOfBirth`; the
 * existing ASCII guard (`personalLens`) runs here too so a name the lens cannot read is refused on the order
 * form, not after payment. Nothing in here is logged.
 */
function personalDetails(source:Record<string,unknown>,now:Date):{displayFirstName:string;fullBirthName:string;dateOfBirth:string;birth:{first:string;last:string}}{
  const displayFirstName=text(source.displayFirstName,'your first name',60);
  const fullBirthName=text(source.fullBirthName,'your full name at birth',200);
  const birth=splitBirthName(fullBirthName);
  const dob=dateOfBirth(source.dateOfBirth,now);
  try{personalLens(birth.first,birth.last);}catch{fail(400,'This name needs a supported personal-card method. Try a test name using Latin letters.');}
  return {displayFirstName,fullBirthName,dateOfBirth:dob,birth};
}
async function body(req:IncomingMessage,limit=16000):Promise<Record<string,unknown>> {
  let source=''; for await(const chunk of req){source+=chunk; if(source.length>limit)fail(413,'Request is too large.');}
  let data:unknown;try{data=JSON.parse(source);}catch{fail(400,'Send valid JSON.');}
  if(!data || typeof data!=='object' || Array.isArray(data))fail(400,'Send a JSON object.');
  return data as Record<string,unknown>;
}
/** The split client: one shell, one stylesheet, one shared script, one script per page. No bundler. */
const CLIENT_FILES:Record<string,string>={
  '/client/styles.css':'text/css; charset=utf-8',
  '/client/shared.js':'text/javascript; charset=utf-8',
  '/client/pages/email.js':'text/javascript; charset=utf-8',
  '/client/pages/booking.js':'text/javascript; charset=utf-8',
  '/client/pages/checkout-sim.js':'text/javascript; charset=utf-8',
  '/client/pages/bridge.js':'text/javascript; charset=utf-8',
  '/client/pages/upsell.js':'text/javascript; charset=utf-8',
  '/client/pages/thank-you.js':'text/javascript; charset=utf-8',
  '/client/pages/booking.css':'text/css; charset=utf-8',
  '/client/pages/bridge.css':'text/css; charset=utf-8',
  '/client/pages/upsell.css':'text/css; charset=utf-8',
  '/client/pages/thank-you.css':'text/css; charset=utf-8',
};
const PAGE_ROUTES=['/','/email','/booking','/checkout-sim','/bridge','/upsell','/thank-you'];
/** Mockup images live as plain files in ./assets; exported edition faces in ../../assets/email/cards. */
const LOCAL_ASSETS:Record<string,string>={
  'portrait':'./assets/portrait.jpg','back':'./assets/back.jpg','five-of-cups':'./assets/five-of-cups.png',
  'strength':'./assets/strength.png','knight-of-cups':'./assets/knight-of-cups.png','two-of-wands':'./assets/two-of-wands.png',
  'four-of-cups':'../../assets/email/cards/four-of-cups.jpg','three-of-swords':'../../assets/email/cards/three-of-swords.jpg',
  'eight-of-swords':'../../assets/email/cards/eight-of-swords.jpg','star':'../../assets/email/cards/the-star.jpg',
  'seven-of-pentacles':'../../assets/email/cards/seven-of-pentacles.jpg','moon':'../../assets/email/cards/the-moon.jpg',
  'two-of-swords':'../../assets/email/cards/two-of-swords.jpg','three-of-pentacles':'../../assets/email/cards/three-of-pentacles.jpg',
  'ten-of-wands':'../../assets/email/cards/ten-of-wands.jpg','six-of-pentacles':'../../assets/email/cards/six-of-pentacles.jpg',
  'seven-of-cups':'../../assets/email/cards/seven-of-cups.jpg','queen-of-swords':'../../assets/email/cards/queen-of-swords.jpg',
  'eight-of-pentacles':'../../assets/email/cards/eight-of-pentacles.jpg','eight-of-cups':'../../assets/email/cards/eight-of-cups.jpg',
  'four-of-pentacles':'../../assets/email/cards/four-of-pentacles.jpg','ace-of-pentacles':'../../assets/email/cards/ace-of-pentacles.jpg',
  'two-of-pentacles':'../../assets/email/cards/two-of-pentacles.jpg','four-of-swords':'../../assets/email/cards/four-of-swords.jpg',
  'magician':'../../assets/email/cards/the-magician.jpg','queen-of-pentacles':'../../assets/email/cards/queen-of-pentacles.jpg',
  'death':'../../assets/email/cards/death.jpg','six-of-swords':'../../assets/email/cards/six-of-swords.jpg',
};
/** Tests default to memory. CLI explicitly opts into /tmp fake-data persistence. */
export function createLocalServer(options: {dataPath?: string; store?: LocalStore; now?: () => Date; artifactRoot?:string; pdfPython?:string} = {}) {
  editions.forEach(e=>validateEdition(e,deck));
  const store=options.store ?? new LocalStore(options.dataPath);
  const now=options.now ?? (()=>new Date());
  const fulfillment=new LocalFulfillment(store,()=>now().getTime(),options.artifactRoot,options.pdfPython);
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
      if(method==='GET' && PAGE_ROUTES.includes(path)){
        const html=await readFile(new URL('./client/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
      }
      if(method==='GET' && CLIENT_FILES[path]){
        const file=await readFile(new URL('.'+path,import.meta.url));res.writeHead(200,{'Content-Type':CLIENT_FILES[path],'Cache-Control':'no-store'});res.end(file);return;
      }
      if(method==='GET' && path.startsWith('/api/assets/')){
        const assetId=path.slice('/api/assets/'.length);const file=LOCAL_ASSETS[assetId];if(!file)fail(404,'Asset not found.');
        const bytes=await readFile(new URL(file!,import.meta.url));
        res.writeHead(200,{'Content-Type':file!.endsWith('.png')?'image/png':'image/jpeg','Cache-Control':'public, max-age=3600'});res.end(bytes);return;
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
        // Her first name, birth name and date of birth are taken HERE (the order form), never on the checkout.
        const {displayFirstName,fullBirthName,dateOfBirth:dob}=personalDetails(data,now());
        const intake:Intake={id:randomUUID(),editionId:edition!.id,editionVersion:edition!.version,sameDay:data.sameDay as boolean,displayFirstName,fullBirthName,dateOfBirth:dob};store.insert('intakes',intake.id,intake);json(201,{intake});return;
      }
      if(method==='GET' && path.startsWith('/api/intake/')){
        const intake=store.get<Intake>('intakes',path.slice('/api/intake/'.length));if(!intake)fail(404,'Intake not found.');json(200,{intake});return;
      }
      if(method==='POST' && path==='/api/local-pay'){
        const data=await body(req);const intake=store.get<Intake>('intakes',String(data.intakeId));if(!intake)fail(404,'Intake not found.');
        if(typeof data.email!=='string' || data.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))fail(400,'Enter a valid test email address.');
        // The personal details come from the INTAKE (the order form), never from this body. Any
        // displayFirstName / fullBirthName / dateOfBirth a stale client still posts here is ignored.
        // Re-validating the saved values also refuses an intake written before the fields moved.
        const {displayFirstName,fullBirthName,dateOfBirth:dob,birth}=personalDetails(intake as unknown as Record<string,unknown>,now());
        const result=store.transaction(()=>{
        const prior=store.get<string>('paidByIntake',intake!.id);if(prior)return {status:200,order:store.get<LocalOrder>('orders',prior)!};
        const edition=editions.find(e=>e.id===intake!.editionId)!;const id=randomUUID();
        const paidAt=now().toISOString();const deliveryHours=intake!.sameDay?12:24;const dueAt=new Date(Date.parse(paidAt)+deliveryHours*3600000).toISOString();
        const lens=personalLens(birth.first,birth.last); // already proven readable by personalDetails()
        const order:LocalOrder={id,intakeId:intake!.id,editionSnapshot:structuredClone(edition),draw:drawForOrder(id,edition,lens,deck),deliveryEmail:(data.email as string).trim(),displayFirstName,fullBirthName,dateOfBirth:dob,baseCents:MAIN_CENTS,bumpCents:intake!.sameDay?SAME_DAY_CENTS:0,currency:'usd',paymentReference:`local_paid_${id}`,paidAt,dueAt,deliveryHours,writtenStatus:'queued',firstName:birth.first,lastName:birth.last,totalCents:MAIN_CENTS+(intake!.sameDay?SAME_DAY_CENTS:0),localOnly:true,simulationNotice:notice,audioPriceProvisional:true,audioDecision:'pending',fulfillment:{writtenJobId:`written_${id}`}};
        store.insert('orders',id,order);store.insert('paidByIntake',intake!.id,id);return {status:201,order};});json(result.status,{order:result.order});return;
      }
      const orderMatch=path.match(/^\/api\/orders\/([^/]+)(?:\/(audio|fulfill))?$/);
      if(orderMatch){let order=store.get<LocalOrder>('orders',orderMatch[1]);if(!order)fail(404,'Order not found.');
        if(method==='GET' && !orderMatch[2]){json(200,{order:{...order,audioPriceCents:AUDIO_TEST_CENTS,audioPriceProvisional:false}});return;}
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
