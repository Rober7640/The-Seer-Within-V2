"""Build only the NEW 08 Marcus inactive workflow. No API calls or existing-flow edits."""
from pathlib import Path
import json,uuid
HERE=Path(__file__).resolve().parent
nodes=[];links={}
def node(name,typ,params,x,y,version=1,notes=''):
 nodes.append(dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL,'marcus08/'+name)),name=name,type='n8n-nodes-base.'+typ,typeVersion=version,position=[x,y],parameters=params,notes=notes))
 return name
def edge(a,b,out=0):
 arr=links.setdefault(a,{'main':[]})['main']
 while len(arr)<=out:arr.append([])
 arr[out].append({'node':b,'type':'main','index':0})
def code(name,js,x,y,notes=''):return node(name,'code',{'jsCode':js},x,y,2,notes)
def cond(name,expr,value,x,y):return node(name,'if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[{'id':'condition','leftValue':expr,'rightValue':value,'operator':{'type':'string','operation':'equals'}}],'combinator':'and'},'options':{}},x,y,2.2)
def service(name,stage,x,y,body='={{ JSON.stringify($json) }}'):
 return node(name,'httpRequest',{'method':'POST','url':"={{ $('Configuration and guard').first().json.config.backendBaseUrl + '/internal/marcus08/'+ '"+stage+"' }}",'authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth','sendBody':True,'specifyBody':'json','jsonBody':body,'options':{'timeout':60000}},x,y,4.2,'UNBUILT authenticated 08 backend operation. See README.md. Must persist state, enforce lease/idempotency and return the stage envelope. Assign the dedicated backend header credential before enabling.')
node('Implementation notice','stickyNote',{'content':'# NEW 08 MARCUS — INACTIVE BUILD DRAFT\n24h standard / +$12.77 = 12h. Audio uses the same order deadline.\n\nGuard is OFF. Production backend adapters + credentials + Marcus voice + private PDF storage remain unwired. No existing workflow was modified.\n\nEach edition supplies its theme and ordered free/paid positions. No stage assumes six cards.\n\nMain PDF report → queue written delivery → audio chain. Late audio event resumes that chain. Delivery jobs run separately in this SAME workflow.','height':360,'width':640},-700,-420,1)
manual=node('Manual entry','manualTrigger',{},-900,0)
webhook=node('New Marcus event','webhook',{'httpMethod':'POST','path':'marcus-08-fulfillment-v1','responseMode':'responseNode','options':{}},-900,160,2,'NEW unique path. Configure service authentication and backend verification before activation. Never point existing product webhooks here.')
guard=code('Configuration and guard',"""const config = { enabled: false, backendBaseUrl: '', standardHours: 24, expeditedHours: 12, bumpCents: 1277, replicateModel: 'resemble-ai/chatterbox', voiceReferenceUrl: '', voiceVersion: '', audioSharesOrderDeadline: true };
if (!config.enabled || !config.backendBaseUrl) throw new Error('08 DRAFT DISABLED: wire and test the documented backend operations and credentials before enabling.');
const event = $json.body ?? $json;
return [{json:{config,event}}];""",-650,60)
reconcile=service('Verify event and reconcile order','reconcile',-400,60)
ack=node('Acknowledge durable event','respondToWebhook',{'respondWith':'json','responseBody':'={{ JSON.stringify({accepted:true,eventId:$json.eventId}) }}'},-150,60,1.4,'Run after backend has durably accepted the event. Does not wait for generation. Manual tests may begin after this node.')
main=cond('Main job?','={{ $json.action }}','main',80,60)
draw=service('Claim order and saved buyer draw','claim-main',330,-100)
claimed=cond('Main lease acquired?','={{ $json.jobState }}','claimed',460,-230)
deadline=code('Set 24h or 12h deadline',"""const c=$('Configuration and guard').first().json.config;
const paidAt=Date.parse($json.order.paidAt);
if (!Number.isFinite(paidAt) || ![0,c.bumpCents].includes($json.order.bumpCents)) throw new Error('Missing trusted payment time or bump entitlement');
const hours=$json.order.bumpCents===c.bumpCents?c.expeditedHours:c.standardHours;
return [{json:{...$json,deliveryHours:hours,dueAt:new Date(paidAt+hours*3600000).toISOString()}}];""",560,-100,'Backend must pin dueAt once. Duration-based SLA, no calendar-day cutoff. Audio inherits this order deadline; overdue late purchases go to review, never silent new promises.')
brief=service('Build adaptive themed reading brief','build-brief',790,-100)
write=service('Write paid positions and connections','write-report',1020,-100)
grade=service('Grade report and save verdict','grade-report',1250,-100)
passed=cond('Report approved?','={{ $json.reportStatus }}','approved',1480,-100)
render=service('Render and store written report','render-written',1720,-180)
queue=service('Queue written delivery independently','queue-written-delivery',1950,-180,)
audioload=service('Reconcile and claim audio job','claim-audio',2200,60)
elig=cond('Audio eligible now?','={{ $json.audioStatus }}','claimed',2440,60)
script=service('Prepare narration and check parity','prepare-audio-script',2680,-60)
nextseg=service('Next saved audio segment','next-audio-segment',2910,-60)
has=cond('Segment remaining?','={{ $json.segmentState }}','pending',3150,-60)
known=cond('Provider request already saved?','={{ $json.predictionId ? "yes" : "no" }}','yes',3390,-180)
voice=code('Validate Chatterbox request',"""if (!$json.segment?.text || !$json.voice?.signedUrl || !$json.voice?.version) throw new Error('Missing approved script segment or supplied Marcus voice');
return [{json:{...$json,replicateInput:{prompt:$json.segment.text,audio_prompt:$json.voice.signedUrl,exaggeration:0.5,cfg_weight:0.5,temperature:0.8,seed:$json.segment.seed||0}}}];""",3620,-280)
tts=node('Chatterbox create prediction','httpRequest',{'method':'POST','url':'https://api.replicate.com/v1/models/resemble-ai/chatterbox/predictions','authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth','sendBody':True,'specifyBody':'json','jsonBody':'={{ JSON.stringify({input:$json.replicateInput}) }}','options':{'timeout':30000}},3860,-280,4.2,'Assign Replicate Authorization: Bearer credential. No auto-retry on ambiguous POST timeout: reconcile provider job or review before resubmitting. User-supplied Marcus voice via audio_prompt. Copy results immediately to durable storage.')
saved=service('Save prediction ID immediately','record-prediction',4090,-280,"={{ JSON.stringify({context:$('Validate Chatterbox request').item.json,prediction:$json}) }}")
wait=node('Wait before provider poll','wait',{'amount':10,'unit':'seconds'},4320,-180,1.1)
pollbudget=service('Check poll budget and renew lease','poll-budget',4550,-180)
pollok=cond('Continue polling?','={{ $json.pollStatus }}','allowed',4780,-180)
poll=node('Get Chatterbox prediction','httpRequest',{'method':'GET','url':"={{ 'https://api.replicate.com/v1/predictions/' + encodeURIComponent($json.predictionId) }}",'authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth','options':{'timeout':30000}},5010,-280,4.2,'Authenticate with same Replicate credential. Backend poll-budget operation validates prediction belongs to this saved segment.')
record=service('Persist provider result','record-prediction-status',5240,-280,"={{ JSON.stringify({context:$('Check poll budget and renew lease').item.json,prediction:$json}) }}")
success=cond('Prediction succeeded?','={{ $json.predictionStatus }}','succeeded',5470,-280)
copy=service('Copy audio segment to private storage','store-audio-segment',5700,-400)
progress=cond('Prediction still running?','={{ ["starting","processing"].includes($json.predictionStatus) ? "yes" : "no" }}','yes',5700,-100)
assemble=service('Assemble and QA recording','assemble-audio',3390,170)
audioapproved=cond('Recording passed QA?','={{ $json.audioQa }}','passed',3620,170)
store=service('Publish private audio artifact','complete-audio',3860,100)
qAudio=service('Queue audio listening-link delivery','queue-audio-delivery',4090,100)
routeAudio=cond('Audio resume event?','={{ $json.action }}','audio',330,240)
routeDelivery=cond('Delivery job?','={{ $json.action }}','delivery',560,390)
claimD=service('Claim due delivery task','claim-delivery',800,390)
readyD=cond('Delivery can send now?','={{ $json.deliveryStatus }}','due',1030,390)
send=service('Send approved artifact link','deliver',1260,390)
recordD=service('Record provider delivery outcome','record-delivery',1490,390)
recovery=cond('Recovery request?','={{ $json.action }}','recovery',800,610)
sweep=service('Recover missed events and expired leases','recover',1030,610,'={{ JSON.stringify($json) }}')
end=code('Waiting or complete — no new work','return [{json:{...$json,workflowResult:"persisted; no further work in this execution"}}];',2200,650)
review=service('Save review or retry state','fail-or-review',1950,450)
for a,b in [(manual,guard),(webhook,guard),(guard,reconcile),(reconcile,ack),(ack,main),(main,draw),(draw,claimed),(claimed,deadline),(deadline,brief),(brief,write),(write,grade),(grade,passed),(passed,render),(render,queue),(queue,audioload),(audioload,elig),(elig,script),(script,nextseg),(nextseg,has),(has,known),(known,wait),(voice,tts),(tts,saved),(saved,wait),(wait,pollbudget),(pollbudget,pollok),(pollok,poll),(poll,record),(record,success),(success,copy),(copy,nextseg),(progress,wait),(assemble,audioapproved),(audioapproved,store),(store,qAudio),(qAudio,end),(routeAudio,audioload),(routeDelivery,claimD),(claimD,readyD),(readyD,send),(send,recordD),(recordD,end),(recovery,sweep),(sweep,end),(review,end)]:edge(a,b)
for a,b in [(claimed,end),(main,routeAudio),(passed,review),(elig,end),(has,assemble),(known,voice),(pollok,review),(success,progress),(progress,review),(audioapproved,review),(routeAudio,routeDelivery),(routeDelivery,recovery),(readyD,end),(recovery,end)]:edge(a,b,1)
# Normalize coordinates (n8n expects numbers).
for n in nodes:n['position']=[int(x) for x in n['position']]
w={'name':'08 Marcus — Written + Audio Fulfillment — INACTIVE DRAFT','nodes':nodes,'connections':links,'active':False,'settings':{'executionOrder':'v1','saveManualExecutions':True,'saveDataErrorExecution':'all','saveDataSuccessExecution':'none'}}
(HERE/'08-marcus-fulfillment.n8n.json').write_text(json.dumps(w,indent=2,ensure_ascii=False)+'\n')
print('Built new inactive workflow:',len(nodes),'nodes; configuration guard disabled.')
