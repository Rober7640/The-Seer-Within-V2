"""Build the numerology-anchored Stage 1 Marcus workflow. No API calls."""

from pathlib import Path
import json
import uuid


HERE = Path(__file__).resolve().parent
OUT = HERE / "08-marcus-numerology-stage1.n8n.json"
CANON_PATH = HERE / "numerology-canon" / "marcus-numerology-canon-v1.json"
RECOGNITION_PATH = HERE / "numerology-canon" / "life-path-recognition.json"
OPENAI_CRED = {"id": "de6vaPn0hPs3icyh", "name": "OpenAi account"}
PDFSHIFT_CRED = {"id": "8TelHH6oJEzYzw2r", "name": "pdfshift-header-auth"}

CANON = json.loads(CANON_PATH.read_text(encoding="utf-8"))
if CANON.get("version") != "marcus-numerology-canon-v1" or len(CANON.get("entries", [])) != 33:
    raise SystemExit(f"Compile and validate the approved canon before building: {CANON_PATH}")
CANON_JSON = json.dumps(CANON, ensure_ascii=False, separators=(",", ":"))
RECOGNITION = json.loads(RECOGNITION_PATH.read_text(encoding="utf-8"))
if RECOGNITION.get("version") != "marcus-life-path-recognition-v1" or set(RECOGNITION.get("profiles", {})) != {"1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "22"}:
    raise SystemExit(f"Complete and validate the customer recognition profiles before building: {RECOGNITION_PATH}")
RECOGNITION_JSON = json.dumps(RECOGNITION, ensure_ascii=False, separators=(",", ":"))

nodes = []
connections = {}


def node(name, node_type, version, position, parameters, *, credentials=None, notes=""):
    value = {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"marcus08-numerology/{name}")),
        "name": name,
        "type": node_type,
        "typeVersion": version,
        "position": position,
        "parameters": parameters,
    }
    if credentials:
        value["credentials"] = credentials
    if notes:
        value["notes"] = notes
    nodes.append(value)
    return name


def code(name, position, js, notes=""):
    return node(name, "n8n-nodes-base.code", 2, position, {"jsCode": js}, notes=notes)


def edge(source, target, output=0):
    branches = connections.setdefault(source, {"main": []})["main"]
    while len(branches) <= output:
        branches.append([])
    branches[output].append({"node": target, "type": "main", "index": 0})


def openai(name, position, body_expression, note):
    return node(
        name,
        "n8n-nodes-base.httpRequest",
        4.2,
        position,
        {
            "method": "POST",
            "url": "https://api.openai.com/v1/chat/completions",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "openAiApi",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": body_expression,
            "options": {"timeout": 600000, "response": {"response": {"neverError": False}}},
        },
        credentials={"openAiApi": OPENAI_CRED},
        notes=note,
    )


node(
    "HOW TO TEST — NUMEROLOGY STAGE 1",
    "n8n-nodes-base.stickyNote",
    1,
    [-980, -500],
    {
        "content": "# STAGE 1 · CANON-BACKED NUMEROLOGY REPORT\n\n1. Edit **2 · TEST INPUTS — EDIT ME**. The saved edition supplies the hero, fixed cards, position labels, and email meanings.\n2. Click **Execute workflow**.\n3. The flow calculates the profile, selects exactly three reusable canon entries, creates and grades a cited synthesis, draws only the buyer cards, plans and writes every spread position, runs both report graders, and renders all images.\n4. If QA passes, download `data` from **26 · REPORT READY — DOWNLOAD PDF** → **Binary**. If the single rewrite still fails, inspect **QA HOLD · NO PDF**; the rejected report is never rendered.\n\nRaw birth name and date stay out of all OpenAI request bodies. This manual lane does not touch Supabase, payment, delivery, or audio."
    },
)

manual = node("1 · Manual test trigger", "n8n-nodes-base.manualTrigger", 1, [-900, 20], {})
inputs = node(
    "2 · TEST INPUTS — EDIT ME",
    "n8n-nodes-base.set",
    3.4,
    [-680, 20],
    {
        "assignments": {
            "assignments": [
                {"id": "question", "name": "question", "value": "What are my blind spots?", "type": "string"},
                {"id": "spreadType", "name": "spreadType", "value": "tree_of_life", "type": "string"},
                {"id": "displayFirstName", "name": "displayFirstName", "value": "Ye Ying", "type": "string"},
                {"id": "fullBirthName", "name": "fullBirthName", "value": "Hng Ye Ying", "type": "string"},
                {"id": "dateOfBirth", "name": "dateOfBirth", "value": "1986-03-16", "type": "string"},
                {"id": "editionId", "name": "editionId", "value": "marcus-08-blind-spots-2026-09-11", "type": "string"},
                {"id": "heroImageUrl", "name": "heroImageUrl", "value": "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/08-hero-what-are-my-blind-spots.jpg", "type": "string"},
                {"id": "positionsJson", "name": "positionsJson", "value": "[{\"number\":1,\"label\":\"how a blind spot affects you\",\"cardName\":\"The Moon\",\"emailMeaning\":\"The Moon draws attention toward distant possibilities while a small creature emerges at the bottom of the card. When uncertainty sends attention toward possible explanations, a first reaction, a contradiction between words and actions, or an unasked question may be easier to miss.\"},{\"number\":2,\"label\":\"what you already understand\",\"cardName\":\"Two of Swords\",\"emailMeaning\":\"The Two of Swords balances two blades by keeping both arms crossed. Understanding the case for two choices can make waiting feel controlled, but comparing the same two options again can keep the decision stuck and leave no hand free to reach for new information.\"},{\"number\":3,\"label\":\"what you have concluded\",\"cardName\":\"Three of Pentacles\",\"emailMeaning\":\"In the Three of Pentacles, the skilled craftsperson does the work while somebody else holds the architectural drawing. A sensible conclusion may still need to be challenged by a person with different information, an inconvenient fact, or honest feedback.\"},{\"number\":4,\"label\":\"what you keep excusing\"},{\"number\":5,\"label\":\"what you feel you are owed\"},{\"number\":6,\"label\":\"what's left of the love\"},{\"number\":7,\"label\":\"what you want to win\"},{\"number\":8,\"label\":\"what you show people\"},{\"number\":9,\"label\":\"what home feels like\"},{\"number\":10,\"label\":\"what it costs in money\"}]", "type": "string"},
            ]
        },
        "options": {},
    },
    notes="Current approved test: Hng Ye Ying, 16 March 1986. Use YYYY-MM-DD for dateOfBirth.",
)

prepare_js = r'''const input = $input.first().json;
const question = String(input.question || '').trim();
const spreadType = String(input.spreadType || '').trim().toLowerCase();
const displayFirstName = String(input.displayFirstName || '').trim();
const fullBirthName = String(input.fullBirthName || '').trim();
const dateOfBirth = String(input.dateOfBirth || '').trim();
const editionId = String(input.editionId || '').trim();
const heroImageUrl = String(input.heroImageUrl || '').trim();
const positionsJson = String(input.positionsJson || '').trim();
if (!question || !displayFirstName || !fullBirthName || !dateOfBirth || !editionId || !heroImageUrl || !positionsJson) throw new Error('All Stage 1 inputs are required.');
if (/[^\x00-\x7F]/.test(fullBirthName) || !/^[A-Za-z]+(?:[ '\-]+[A-Za-z]+)*$/.test(fullBirthName)) {
  throw new Error('Stage 1 currently follows the shared engine ASCII-name boundary.');
}
const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
if (!match) throw new Error('dateOfBirth must use YYYY-MM-DD.');
const [year, month, day] = match.slice(1).map(Number);
const parsedDate = new Date(`${dateOfBirth}T00:00:00Z`);
if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() + 1 !== month || parsedDate.getUTCDate() !== day || parsedDate > new Date()) {
  throw new Error('dateOfBirth is not a valid past date.');
}

const spreads = {
  three:{name:'The Three',free:1,total:3},
  six_questions:{name:'The Six Questions',free:2,total:6},
  adaptive_eight:{name:'The Eight-Part Reading',free:4,total:8},
  tree_of_life:{name:'The Tree of Life',free:3,total:10},
  twelve_houses:{name:'The Twelve Houses',free:4,total:12},
};
const spread = spreads[spreadType];
if (!spread) throw new Error(`Unsupported spreadType: ${spreadType}`);
let editionPositions;
try{editionPositions=JSON.parse(positionsJson);}catch(e){throw new Error(`positionsJson is invalid JSON: ${e.message}`);}
if(!Array.isArray(editionPositions)||editionPositions.length!==spread.total)throw new Error(`${spreadType} requires ${spread.total} saved edition positions.`);
editionPositions=editionPositions.map((p,index)=>{
  if(Number(p.number)!==index+1||!String(p.label||'').trim())throw new Error(`Edition position ${index+1} is invalid.`);
  if(index<spread.free&&(!String(p.cardName||'').trim()||!String(p.emailMeaning||'').trim()))throw new Error(`Fixed position ${index+1} requires cardName and emailMeaning.`);
  if(index>=spread.free&&p.cardName)throw new Error(`Hidden edition position ${index+1} must not arrive with a card.`);
  return {number:index+1,label:String(p.label).trim(),cardName:String(p.cardName||'').trim(),emailMeaning:String(p.emailMeaning||'').trim()};
});
if(!/^https:\/\//i.test(heroImageUrl))throw new Error('heroImageUrl must be HTTPS.');

function sumDigits(value){return String(Math.abs(value)).split('').reduce((sum,d)=>sum+Number(d),0);}
function reduceNumber(value){while(value>9 && ![11,22,33].includes(value)) value=sumDigits(value); return value;}
const letterValues={a:1,j:1,s:1,b:2,k:2,t:2,c:3,l:3,u:3,d:4,m:4,v:4,e:5,n:5,w:5,f:6,o:6,x:6,g:7,p:7,y:7,h:8,q:8,z:8,i:9,r:9};
const expressionRaw=[...fullBirthName.toLowerCase().replace(/[^a-z]/g,'')].reduce((sum,c)=>sum+letterValues[c],0);
const expressionNumber=reduceNumber(expressionRaw);
const lifePathNumber=reduceNumber(reduceNumber(month)+reduceNumber(day)+reduceNumber(sumDigits(year)));
const birthdayNumber=reduceNumber(day);
const letters=[...fullBirthName.toLowerCase().replace(/[^a-z]/g,'')];
const vowelSet=new Set(['a','e','i','o','u']);
const soulUrgeRaw=letters.filter(c=>vowelSet.has(c)).reduce((sum,c)=>sum+letterValues[c],0);
const personalityRaw=letters.filter(c=>!vowelSet.has(c)).reduce((sum,c)=>sum+letterValues[c],0);
const soulUrgeNumber=reduceNumber(soulUrgeRaw);
const personalityNumber=reduceNumber(personalityRaw);
const maturityNumber=reduceNumber(lifePathNumber+expressionNumber);
const personalCards={1:'The Magician',2:'The High Priestess',3:'The Empress',4:'The Emperor',5:'The Hierophant',6:'The Lovers',7:'The Chariot',8:'Strength',9:'The Hermit',11:'Justice',22:'The Fool'};
const personalCard=personalCards[expressionNumber];
if (!personalCard) throw new Error(`Expression number ${expressionNumber} has no approved personal-card mapping.`);

const deck=['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World','Ace of Wands','Two of Wands','Three of Wands','Four of Wands','Five of Wands','Six of Wands','Seven of Wands','Eight of Wands','Nine of Wands','Ten of Wands','Page of Wands','Knight of Wands','Queen of Wands','King of Wands','Ace of Cups','Two of Cups','Three of Cups','Four of Cups','Five of Cups','Six of Cups','Seven of Cups','Eight of Cups','Nine of Cups','Ten of Cups','Page of Cups','Knight of Cups','Queen of Cups','King of Cups','Ace of Swords','Two of Swords','Three of Swords','Four of Swords','Five of Swords','Six of Swords','Seven of Swords','Eight of Swords','Nine of Swords','Ten of Swords','Page of Swords','Knight of Swords','Queen of Swords','King of Swords','Ace of Pentacles','Two of Pentacles','Three of Pentacles','Four of Pentacles','Five of Pentacles','Six of Pentacles','Seven of Pentacles','Eight of Pentacles','Nine of Pentacles','Ten of Pentacles','Page of Pentacles','Knight of Pentacles','Queen of Pentacles','King of Pentacles'];
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function shuffled(values,seed){const out=[...values],random=rng(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const fixedCards=editionPositions.slice(0,spread.free).map(p=>p.cardName);
if(new Set(fixedCards).size!==fixedCards.length||fixedCards.some(card=>!deck.includes(card)))throw new Error('Edition fixed cards must be unique cards in the approved deck.');
const available=deck.filter(card=>!fixedCards.includes(card));
const testRunId=`${new Date().toISOString()}-${Math.random().toString(36).slice(2,10)}`;
const paidCards=shuffled(available,hash(`buyer|${question.toLowerCase()}|${spreadType}|${fullBirthName.toLowerCase()}|${dateOfBirth}|${testRunId}`)).slice(0,spread.total-spread.free);
const cardAssetBase='https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/';
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const authoritativePositions=editionPositions.map((editionPosition,index)=>({
  number:index+1,label:editionPosition.label,reversed:false,
  visibility:index<spread.free?'face_up_fixed':'face_down_buyer_draw',
  cardName:index<spread.free?fixedCards[index]:paidCards[index-spread.free],
  emailMeaning:index<spread.free?editionPosition.emailMeaning:'',
  cardImageUrl:`${cardAssetBase}${slug(index<spread.free?fixedCards[index]:paidCards[index-spread.free])}.jpg`,
}));
return [{json:{
  stage:1,testRunId,editionId,heroImageUrl,question,spreadType,spreadName:spread.name,displayFirstName,
  fullBirthName,dateOfBirth,
  numerology:{lifePathNumber,expressionNumber,birthdayNumber,birthdayCompound:day,soulUrgeNumber,personalityNumber,maturityNumber,personalCard,methodVersion:'pythagorean-profile-v2'},
  faceUpCount:spread.free,faceDownCount:spread.total-spread.free,
  positions:authoritativePositions,
  fixedFaceUp:authoritativePositions.filter(p=>p.visibility==='face_up_fixed'),
  buyerFaceDown:authoritativePositions.filter(p=>p.visibility==='face_down_buyer_draw'),
  drawMethod:'stage1-fixed-edition-plus-independent-buyer-draw-v2',
}}];'''

prepare = code(
    "3 · Validate, calculate, and draw",
    [-440, 20],
    prepare_js,
    "Test-only calculation mirrors server/lib/numerologyEngine.ts. OpenAI never calculates numbers or chooses cards.",
)

canon_select_js = "const c=$input.first().json;\nconst canon=" + CANON_JSON + ";\nconst recognition=" + RECOGNITION_JSON + ";\n" + r'''const requested=[
  {role:'lifePath',number:c.numerology.lifePathNumber,prefix:'LP'},
  {role:'expression',number:c.numerology.expressionNumber,prefix:'EX'},
  {role:'personality',number:c.numerology.personalityNumber,prefix:'PE'},
];
if(canon.version!=='marcus-numerology-canon-v1'||canon.status!=='editorial-review')throw new Error('Unexpected canon version or status.');
const entries=requested.map(spec=>{
  const entry=canon.entries.find(candidate=>candidate.role===spec.role&&candidate.number===spec.number);
  if(!entry)throw new Error(`${spec.role} ${spec.number} is unsupported by ${canon.version}.`);
  const ids=Object.keys(entry.sections||{});
  if(entry.key!==`${spec.prefix}${spec.number}`||entry.version!==canon.version||entry.wordCount<500||entry.wordCount>800||ids.length!==8||!String(entry.contentHash||'').match(/^[a-f0-9]{64}$/))throw new Error(`Canon entry ${entry.key} failed integrity checks.`);
  if(ids.some(id=>!id.startsWith(entry.key+'.')))throw new Error(`Canon entry ${entry.key} contains a foreign passage ID.`);
  return entry;
});
const passageIds=entries.flatMap(entry=>Object.keys(entry.sections));
if(new Set(passageIds).size!==24)throw new Error('The selected canon pack must contain 24 unique passages.');
const publicLifePathProfile=recognition.profiles[String(c.numerology.lifePathNumber)];
if(!publicLifePathProfile||!publicLifePathProfile.archetype||publicLifePathProfile.strengths?.length!==4||publicLifePathProfile.challenges?.length!==3)throw new Error(`Life Path ${c.numerology.lifePathNumber} has no complete customer recognition profile.`);
return [{json:{...c,publicLifePathProfile:{version:recognition.version,number:c.numerology.lifePathNumber,...publicLifePathProfile},canon:{version:canon.version,keys:entries.map(entry=>entry.key),entries,passageIds}}}];'''
canon_select = code(
    "CANON · Select three approved readings",
    [-180, -420],
    canon_select_js,
    "Deterministic lookup only. Unsupported values, including 33, fail before OpenAI.",
)

synthesis_request_js = r'''const c=$input.first().json;
const system=`You create a private numerology synthesis for one exact customer question. The supplied Life Path, Expression, and Personality entries are the complete approved canon. Do not add numerology meanings from memory. Do not mention tarot or guess which cards may appear.

Return three to six narrow working claims. Every claim must cite one to three exact passage IDs from the supplied entries. Use one passage for a single-source claim and multiple passages only when their text jointly carries the claim. The workflow derives the confidence label from the citation pattern.

Each claim must be concrete enough to confirm or reject, directly relevant to the exact question, and accompanied by an observable condition that would make it a poor fit. Treat every claim as a hypothesis. Do not assert biography, occupations, relationships, diagnoses, past events, other people's motives, future events, spiritual rank, or exceptional ability. Do not turn the response into another general numerology reading.

The answerDirection should establish what the combination can responsibly help the later tarot reading distinguish. The answerLimits must state what the combination cannot establish. Return JSON only.`;
const allowedIds=c.canon.passageIds;
const claim={type:'object',additionalProperties:false,properties:{
  claimId:{type:'string',minLength:3,maxLength:20},
  claim:{type:'string',minLength:100},
  support:{type:'array',minItems:1,maxItems:3,items:{type:'string',enum:allowedIds}},
  questionRelevance:{type:'string',enum:['central','supporting']},
  disconfirmation:{type:'string',minLength:80},
},required:['claimId','claim','support','questionRelevance','disconfirmation']};
const maxClaims=Math.min(6,c.positions.length),minClaims=Math.min(3,maxClaims);
const schema={type:'object',additionalProperties:false,properties:{
  claims:{type:'array',minItems:minClaims,maxItems:maxClaims,items:claim},
  answerDirection:{type:'string',minLength:180},
  answerLimits:{type:'string',minLength:120},
  forbiddenInferences:{type:'array',minItems:2,maxItems:6,items:{type:'string',minLength:30}},
},required:['claims','answerDirection','answerLimits','forbiddenInferences']};
const safeFacts={question:c.question,canonVersion:c.canon.version,entries:c.canon.entries};
return [{json:{...c,synthesisBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(safeFacts)}],response_format:{type:'json_schema',json_schema:{name:'marcus_canon_synthesis',strict:true,schema}},max_completion_tokens:4500}}}];'''
synthesis_request = code("SYNTHESIS · Build cited request", [80, -420], synthesis_request_js)
synthesizer = openai(
    "SYNTHESIS · Combine the fixed canon",
    [340, -420],
    "={{ JSON.stringify($json.synthesisBody) }}",
    "Receives only the exact question and the three selected reusable readings.",
)

validate_synthesis_js = r'''const source=$('SYNTHESIS · Build cited request').first().json;
let raw=$json.choices?.[0]?.message?.content;if(Array.isArray(raw))raw=raw.map(x=>x.text||'').join('');
if(typeof raw!=='string'||!raw.trim())throw new Error('Canon synthesizer returned no content.');
raw=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
let synthesis;try{synthesis=JSON.parse(raw);}catch(e){throw new Error(`Synthesis JSON failed: ${e.message}`);}
if(!Array.isArray(synthesis.claims)||synthesis.claims.length<Math.min(3,source.positions.length)||synthesis.claims.length>Math.min(6,source.positions.length))throw new Error('Synthesis claim count is invalid.');
const allowed=new Set(source.canon.passageIds),claimIds=new Set();
for(const claim of synthesis.claims){
  if(!claim.claimId||claimIds.has(claim.claimId))throw new Error(`Duplicate or missing synthesis claimId: ${claim.claimId}`);
  claimIds.add(claim.claimId);
  if(!Array.isArray(claim.support)||claim.support.length<1||new Set(claim.support).size!==claim.support.length||claim.support.some(id=>!allowed.has(id)))throw new Error(`Claim ${claim.claimId} cites duplicate or unavailable canon passages.`);
  const roles=new Set(claim.support.map(id=>(/^(LP|EX|PE)/.exec(id)||[])[1]).filter(Boolean));
  claim.confidence=claim.support.length===1?'direct':roles.size===1?'reinforced':'pair-inference';
  if(!['central','supporting'].includes(claim.questionRelevance)||String(claim.disconfirmation||'').length<80)throw new Error(`Claim ${claim.claimId} is not testable enough.`);
}
if(!synthesis.claims.some(claim=>claim.questionRelevance==='central'))throw new Error('Synthesis has no central claim.');
if(typeof synthesis.answerDirection!=='string'||synthesis.answerDirection.length<180||typeof synthesis.answerLimits!=='string'||synthesis.answerLimits.length<120)throw new Error('Synthesis answer boundary is incomplete.');
return [{json:{...source,synthesis,synthesisQa:{passed:true,claims:synthesis.claims.length,citations:[...new Set(synthesis.claims.flatMap(claim=>claim.support))]}}}];'''
validate_synthesis = code("SYNTHESIS · Validate citations", [600, -420], validate_synthesis_js)

synthesis_grade_request_js = r'''const c=$input.first().json;
const system=`You are the evidence gate for a private numerology synthesis. Judge only whether each proposed claim is actually supported by its cited passages from the supplied fixed canon and whether it is responsibly connected to the exact question.

Score 0–10: citationAccuracy, questionSpecificity, roleDiscipline, falsifiability, and restraint. A citation is not valid merely because the passage ID exists; its prose must carry the claim. Reject biography, occupation guesses, diagnoses, future claims, spiritual rank, broad flattering language, misuse of Personality as inner motive, or Expression as guaranteed vocation. Reject a synthesis that simply paraphrases three entries without making a useful question-specific distinction.

passed may be true only when every score is at least 8 and unsupportedClaimIds, misusedRoles, genericClaims, and inventedInferences are empty. Return JSON only.`;
const scores={type:'object',additionalProperties:false,properties:{citationAccuracy:{type:'integer',minimum:0,maximum:10},questionSpecificity:{type:'integer',minimum:0,maximum:10},roleDiscipline:{type:'integer',minimum:0,maximum:10},falsifiability:{type:'integer',minimum:0,maximum:10},restraint:{type:'integer',minimum:0,maximum:10}},required:['citationAccuracy','questionSpecificity','roleDiscipline','falsifiability','restraint']};
const list={type:'array',items:{type:'string'}};
const schema={type:'object',additionalProperties:false,properties:{passed:{type:'boolean'},scores,unsupportedClaimIds:list,misusedRoles:list,genericClaims:list,inventedInferences:list,reason:{type:'string',minLength:60}},required:['passed','scores','unsupportedClaimIds','misusedRoles','genericClaims','inventedInferences','reason']};
const facts={question:c.question,canonVersion:c.canon.version,entries:c.canon.entries,synthesis:c.synthesis};
return [{json:{...c,synthesisGradeBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(facts)}],response_format:{type:'json_schema',json_schema:{name:'marcus_canon_synthesis_grade',strict:true,schema}},max_completion_tokens:3000}}}];'''
synthesis_grade_request = code("SYNTHESIS · Build evidence grade", [860, -420], synthesis_grade_request_js)
synthesis_grader = openai(
    "SYNTHESIS · Grade claim support",
    [1120, -420],
    "={{ JSON.stringify($json.synthesisGradeBody) }}",
    "Checks semantic support, not only whether cited IDs exist.",
)

enforce_synthesis_js = r'''const source=$('SYNTHESIS · Build evidence grade').first().json;
let raw=$json.choices?.[0]?.message?.content;if(Array.isArray(raw))raw=raw.map(x=>x.text||'').join('');
if(typeof raw!=='string'||!raw.trim())throw new Error('Synthesis grader returned no verdict.');
raw=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
let synthesisGrade;try{synthesisGrade=JSON.parse(raw);}catch(e){throw new Error(`Synthesis grade JSON failed: ${e.message}`);}
const scores=Object.values(synthesisGrade.scores||{});
const issues=['unsupportedClaimIds','misusedRoles','genericClaims','inventedInferences'].reduce((n,key)=>n+(synthesisGrade[key]?.length||0),0);
const approved=synthesisGrade.passed===true&&scores.length===5&&scores.every(score=>Number.isInteger(score)&&score>=8)&&issues===0;
if(!approved)throw new Error(`Canon synthesis failed evidence QA: ${synthesisGrade.reason}`);
return [{json:{...source,synthesisGrade,synthesisApproved:true}}];'''
enforce_synthesis = code("SYNTHESIS · Enforce evidence grade", [1380, -420], enforce_synthesis_js)

plan_request_js = r'''const c=$input.first().json;
const system=`You build the private tarot plan for a Marcus Stone report. The supplied synthesis has already passed an evidence review against a fixed numerology canon. Use only its claims. Do not introduce another numerology meaning, trait, biographical claim, occupation, or private motive.

The tarot cards were selected independently. The synthesis helps choose which defensible meaning of each card matters here; it never explains why a card was drawn. Treat lifePathProfile as the reader's primary recognition anchor and preserve its ordinary-language identity. The personal card describes how that foundation may be expressed through choices and commitments; it must not rename, dilute, or replace the Life Path archetype. For example, Life Path 4 remains the Builder: hardworking, practical, organized, loyal and dependable, with possible rigidity, overwork, control, perfectionism, or difficulty delegating. The Lovers may add questions of values, alignment, responsibility, and reciprocity, but it cannot turn the answer into a romance, caregiving, or generic relationship reading. Plan every saved spread position together. For a fixed face-up position, preserve its saved email meaning and add what becomes newly clear once the full spread is visible. For a buyer-drawn position, build the full interpretation. The personal card is a supporting lens and not a spread position.

Every position must name the exact synthesis claim it uses and reproduce that claim's canon support IDs. Each must name a concrete Rider-Waite image fact, the exact position job, the selected card meaning, one question-specific claim, a precise proposition the buyer can test against life, an explicit link that advances another named card, and a practical decision. Unknown biography must remain a test, distinction, or question. Avoid broad role lists and abstract labels such as structural stewardship, conscious custodian, humane structures, or calling-level themes. Say plainly what the person might build, organize, maintain, decide, or share. The final thesis must answer the exact question, rule out at least one plausible but poorly fitting direction, and give no more than two forms when concrete forms are useful.

Return finished internal planning content only. No placeholders, empty strings, or references to later sections.`;
const safeFacts={
  question:c.question,displayFirstName:c.displayFirstName,spreadName:c.spreadName,
  lifePathProfile:c.publicLifePathProfile,personalCard:c.numerology.personalCard,synthesis:c.synthesis,
  positions:c.positions,
};
const profile={type:'object',additionalProperties:false,properties:{
  centralConflict:{type:'string',minLength:140},answerDirection:{type:'string',minLength:160},
  answerLimits:{type:'string',minLength:100},questionConnection:{type:'string',minLength:140},
},required:['centralConflict','answerDirection','answerLimits','questionConnection']};
const cardPlan={type:'object',additionalProperties:false,properties:{
  cardFact:{type:'string',minLength:80},positionJob:{type:'string',minLength:80},
  synthesisClaimId:{type:'string',minLength:3},canonSupport:{type:'array',minItems:1,maxItems:3,items:{type:'string',enum:c.canon.passageIds}},
  selectedCardMeaning:{type:'string',minLength:150},questionSpecificClaim:{type:'string',minLength:160},
  testablePrompt:{type:'string',minLength:120},crossCardLink:{type:'string',minLength:120},
  practicalDecision:{type:'string',minLength:120},mustNotRepeat:{type:'string',minLength:60},
},required:['cardFact','positionJob','synthesisClaimId','canonSupport','selectedCardMeaning','questionSpecificClaim','testablePrompt','crossCardLink','practicalDecision','mustNotRepeat']};
return [{json:{...c,openAiBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:`Build the ordered canon-backed whole-spread plan from these exact facts. The cardPlans array must follow positions order and contain one entry for every position.\n\n${JSON.stringify(safeFacts,null,2)}`}],response_format:{type:'json_schema',json_schema:{name:'marcus_private_reading_plan',strict:true,schema:{type:'object',additionalProperties:false,properties:{privateProfile:profile,cardPlans:{type:'array',minItems:c.positions.length,maxItems:c.positions.length,items:cardPlan},directAnswer:{type:'string',minLength:280},ruledOutDirection:{type:'string',minLength:120},candidateForms:{type:'array',minItems:1,maxItems:2,items:{type:'string',minLength:60}}},required:['privateProfile','cardPlans','directAnswer','ruledOutDirection','candidateForms']}}},max_completion_tokens:8000}}}];'''
plan_request = code("4 · Build private planning request", [-180, 20], plan_request_js)
planner = openai(
    "5 · Plan profile and whole spread",
    [80, 20],
    "={{ JSON.stringify($json.openAiBody) }}",
    "Receives the approved synthesis and cards, never raw birth data or unselected canon entries.",
)

validate_plan_js = r'''const source=$('4 · Build private planning request').first().json;
let raw=$json.choices?.[0]?.message?.content;if(Array.isArray(raw))raw=raw.map(x=>x.text||'').join('');
if(typeof raw!=='string'||!raw.trim())throw new Error('Planner returned no content.');
raw=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
let plan;try{plan=JSON.parse(raw);}catch(e){throw new Error(`Planner JSON failed: ${e.message}`);}
if(!plan.privateProfile||!Array.isArray(plan.cardPlans)||plan.cardPlans.length!==source.positions.length||typeof plan.directAnswer!=='string'||plan.directAnswer.trim().length<280||!Array.isArray(plan.candidateForms)||plan.candidateForms.length<1||plan.candidateForms.length>2)throw new Error('Private plan is incomplete.');
const required=['cardFact','positionJob','synthesisClaimId','selectedCardMeaning','questionSpecificClaim','testablePrompt','crossCardLink','practicalDecision','mustNotRepeat'];
const claims=new Map(source.synthesis.claims.map(claim=>[claim.claimId,claim]));
plan.cardPlans=plan.cardPlans.map((item,index)=>{
  for(const field of required)if(typeof item[field]!=='string'||!item[field].trim())throw new Error(`Plan ${index+1} is missing ${field}.`);
  if(!Array.isArray(item.canonSupport)||!item.canonSupport.length)throw new Error(`Plan ${index+1} has no canon support.`);
  const sourceClaim=claims.get(item.synthesisClaimId);if(!sourceClaim)throw new Error(`Plan ${index+1} uses unknown synthesis claim ${item.synthesisClaimId}.`);
  const expected=[...sourceClaim.support].sort(),received=[...item.canonSupport].sort();
  if(JSON.stringify(expected)!==JSON.stringify(received))throw new Error(`Plan ${index+1} changed the evidence for ${item.synthesisClaimId}.`);
  const saved=source.positions[index];
  return {...item,positionNumber:saved.number,positionLabel:saved.label,cardName:saved.cardName,reversed:saved.reversed,visibility:saved.visibility,emailMeaning:saved.emailMeaning};
});
return [{json:{...source,plan,planQa:{passed:true,sections:plan.cardPlans.length,structureSource:'saved-n8n-draw'}}}];'''
validate_plan = code("6 · Validate and bind the plan", [340, 20], validate_plan_js)

writer_request_js = r'''const c=$input.first().json;
const system=`You are Marcus Stone writing a paid personal tarot reading with a visible Life Path recognition section. Write with warmth, observation, clarity, and concrete language. Avoid riddles, fortune-cookie lines, therapy jargon, melodrama, and vague encouragement.

The approved private synthesis guides the reading. The supplied lifePathProfile is customer-facing and is the primary identity anchor. Begin lifePathApplication with the exact form “Your Life Path is [number], [archetype].” Explain the supplied strengths and challenges in familiar words, then show how they affect this exact question and spread. For Life Path 4, keep the answer recognizably about The Builder: hardworking, practical, organized, loyal and dependable, with a risk of rigidity, overwork, control, perfectionism, or difficulty delegating. Do not replace these clear traits with an invented grand label. Never mention Expression Number, Birthday Number, Soul Urge, Personality Number, Maturity Number, canon passages, evidence IDs, or calculations. You may name the supplied personal tarot card because it is part of Marcus's visible method. Treat it as a secondary lens on how the Life Path is expressed through choices and commitments, never as a second identity or spread position. If the card is The Lovers, use it to ask what the Builder will consciously choose, commit to, or share with others. It must not turn a Builder reading into a romance, caregiving, or generic relationship reading.

Use ordinary language a paying reader can immediately picture. Never use “structural stewardship,” “conscious custodian,” “humane structures,” “calling-level themes,” “routinize warmth,” or “you are most yourself.” Prefer concrete verbs such as build, plan, organize, maintain, finish, choose, share, rest, and delegate. Examples of work or life domains must be labelled as examples, not predictions.

Create exactly one body section for every saved spread position, using the required position key and exact card shown in sectionRequirements. Positions marked face_up_fixed were already seen in the email: develop the idea in priorCardMeaningToDevelop, then add what becomes newly clear when that card is read against the completed spread. Treat that prior language as an interpretation to examine, not verified biography. Never call it a “saved message,” “email meaning,” “message for you,” or expose any other workflow label. Do not quote it verbatim. Positions marked face_down_buyer_draw receive the full new interpretation.

Follow the complete plan. Every section must describe an accurate Rider-Waite image, connect it to this exact position and question, and use the approved synthesis to select one defensible meaning of the card. Never turn a private hypothesis into an asserted personal fact. Do not claim the reader has already thought, said, seen, feared, wanted, delayed, or repeatedly done something unless the supplied customer question or email meaning states it. Phrase unknown biography as a precise possibility, distinction, test, or question the reader can confirm or reject. Build one continuous argument across the spread and name cards when they change one another's meaning.

Do not offer a menu broad enough to fit anyone. The conclusion must answer the question directly, state the central tension, rule out the supplied poor-fit direction, name no more than two concrete candidate forms, and give a bounded real-world test that can distinguish them.

Do not repeat one exercise, timeframe, or recommendation across sections, synthesis, and conclusion. Give each position its own job. The conclusion should answer and discriminate; it should refer back to the one decisive test rather than explain it again. Return only complete reader-facing JSON with no placeholders.`;
const sectionRequirements=Object.fromEntries(c.positions.map(p=>[`position_${p.number}`,`${p.cardName} — ${p.label} — ${p.visibility}`]));
const hidePrivateLabels=value=>JSON.parse(JSON.stringify(value),(key,item)=>typeof item==='string'?item
  .replace(/\b(?:life path|expression(?: number)?|birthday(?: number)?|soul urge|personality(?: number)?|maturity(?: number)?)\s*(?:number\s*)?\d+\b/gi,'one part of the private profile')
  .replace(/\b(?:LP|EX|PE)(?:[1-9]|11|22)\.[A-Z]+\b/g,'private evidence')
  .replace(/\b(?:direct|reinforced|pair-inference)\b/gi,'supported')
  .replace(/\b(?:numerology|life path|expression number|birthday number|soul urge|personality number|maturity number|canon(?:ical)?(?: passage)?)\b/gi,'private profile'):item);
const positions=c.positions.map(({emailMeaning,...position})=>position);
const cardPlans=hidePrivateLabels(c.plan.cardPlans).map(({emailMeaning,...plan})=>({...plan,...(emailMeaning?{priorCardMeaningToDevelop:emailMeaning}:{})}));
const facts={question:c.question,displayFirstName:c.displayFirstName,spreadName:c.spreadName,lifePathProfile:c.publicLifePathProfile,personalCard:c.numerology.personalCard,positions,sectionRequirements,privateProfile:hidePrivateLabels(c.plan.privateProfile),cardPlans,directAnswer:hidePrivateLabels(c.plan.directAnswer),ruledOutDirection:hidePrivateLabels(c.plan.ruledOutDirection),candidateForms:hidePrivateLabels(c.plan.candidateForms)};
const sectionSchema={type:'object',additionalProperties:false,properties:{heading:{type:'string',minLength:8},body:{type:'string',minLength:380},testThis:{type:'string',minLength:100},practicalMeaning:{type:'string',minLength:100}},required:['heading','body','testThis','practicalMeaning']};
const sectionKeys=c.positions.map(p=>`position_${p.number}`);
const sectionsByPosition={type:'object',additionalProperties:false,properties:Object.fromEntries(sectionKeys.map(key=>[key,sectionSchema])),required:sectionKeys};
const schema={type:'object',additionalProperties:false,properties:{title:{type:'string',minLength:8},theme:{type:'string',minLength:30},opening:{type:'string',minLength:180},lifePathApplication:{type:'string',minLength:260},personalCardHeading:{type:'string',minLength:8},personalCardReading:{type:'string',minLength:260},sectionsByPosition,synthesis:{type:'string',minLength:350},conclusion:{type:'string',minLength:350}},required:['title','theme','opening','lifePathApplication','personalCardHeading','personalCardReading','sectionsByPosition','synthesis','conclusion']};
const reportTokenBudget=Math.min(18000,7000+Math.max(0,c.positions.length-6)*1750);
return [{json:{...c,openAiBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:`Write the complete report from this approved plan and exact saved structure. Each required position key must interpret its exact paid card.\n\n${JSON.stringify(facts,null,2)}`}],response_format:{type:'json_schema',json_schema:{name:'marcus_numerology_anchored_report',strict:true,schema}},max_completion_tokens:reportTokenBudget}}}];'''
writer_request = code("7 · Build report request", [600, 20], writer_request_js)
writer = openai("8 · Write complete Marcus report", [860, 20], "={{ JSON.stringify($json.openAiBody) }}", "Writer receives the scrubbed plan; raw birth data, canon entries, and evidence IDs are absent.")


def validation_js(context_node):
    return rf'''const source=$('{context_node}').first().json;
let raw=$json.choices?.[0]?.message?.content;if(Array.isArray(raw))raw=raw.map(x=>x.text||'').join('');
if(typeof raw!=='string'||!raw.trim())throw new Error('Writer returned no report.');
raw=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
let report;try{{report=JSON.parse(raw);}}catch(e){{throw new Error(`Report JSON failed: ${{e.message}}`);}}
for(const field of ['title','theme','opening','lifePathApplication','personalCardHeading','personalCardReading','synthesis','conclusion']){{if(typeof report[field]!=='string'||!report[field].trim())throw new Error(`Report is missing ${{field}}.`);}}
if(/\b(?:expression number|birthday number|soul urge|personality number|maturity number|canon(?:ical)?(?: passage)?|(?:LP|EX|PE)(?:[1-9]|11|22)\.[A-Z]+)\b/i.test(JSON.stringify(report)))throw new Error('Customer report exposed private numerology machinery.');
if(!new RegExp(`^your life path is\\s*${{source.publicLifePathProfile.number}}\\s*,\\s*${{source.publicLifePathProfile.archetype.replace(/[.*+?^${{}}()|[\]\\]/g,'\\$&')}}`,'i').test(report.lifePathApplication.trim()))throw new Error('Life Path application did not begin with the required customer number and archetype.');
if(/\b(?:structural stewardship|conscious custodian|humane structures|calling-level themes|routinize warmth|you are most yourself)\b/i.test(JSON.stringify(report)))throw new Error('Customer report used an abstract or overreaching phrase forbidden by the plain-language contract.');
if(!report.sectionsByPosition||typeof report.sectionsByPosition!=='object'||Array.isArray(report.sectionsByPosition))throw new Error('Report is missing keyed spread sections.');
const expectedKeys=source.positions.map(saved=>`position_${{saved.number}}`);
const receivedKeys=Object.keys(report.sectionsByPosition).sort();
if(JSON.stringify(receivedKeys)!==JSON.stringify([...expectedKeys].sort()))throw new Error(`Report position keys do not match the saved spread: ${{receivedKeys.join(', ')}}.`);
report.sections=source.positions.map((saved,index)=>{{
  const section=report.sectionsByPosition[`position_${{saved.number}}`];
  if(!section)throw new Error(`Missing section for position ${{saved.number}}: ${{saved.cardName}}.`);
  for(const field of ['heading','body','testThis','practicalMeaning'])if(typeof section[field]!=='string'||!section[field].trim())throw new Error(`Section ${{index+1}} is missing ${{field}}.`);
  return {{...section,positionNumber:saved.number,positionLabel:saved.label,cardName:saved.cardName,reversed:saved.reversed,visibility:saved.visibility,cardImageUrl:saved.cardImageUrl}};
}});
delete report.sectionsByPosition;
const personalCardImageUrl=`https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/${{source.numerology.personalCard.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}}.jpg`;
return [{{json:{{...source,personalCardImageUrl,report,reportQa:{{passed:true,sections:report.sections.length,expectedSections:source.positions.length,structureSource:'saved-edition-and-buyer-draw'}}}}}}];'''


validate_report = code("9 · Validate written report", [1120, 20], validation_js("7 · Build report request"))

grader_request_js = r'''const c=$input.first().json;
const system=`You are the strict private-support editorial gate for a $35 personalized Marcus Stone tarot report. Compare the report with its exact question, every saved position and card, selected fixed canon entries, approved cited synthesis, and whole-spread plan. Life Path is the only numerology label intended for the customer. Expression and Personality must influence emphasis silently; never recommend revealing their labels, numbers, calculations, or roles.

Score eight dimensions from 0 to 10. questionSpecificity: could passages be pasted into another question? lifePathRecognition: does the customer-facing reading plainly name the supplied Life Path number and archetype, accurately surface its fixed strengths and challenges, and connect them to this exact question? birthProfileEffect: did distinct approved synthesis claims materially select different card meanings? claimSupport: are personal claims carried by the cards and cited synthesis, with unknown biography framed as testable propositions rather than facts? cardFidelity: are Rider-Waite images and meanings accurate? crossCardContinuity: does each section advance one coherent reading by naming other cards? practicalValue: does the conclusion narrow the answer, rule out a poor fit, name at most two candidate forms, and give a bounded test? marcusVoice: is it warm, lucid, and free of riddles, flattery, and generic inspiration?

List exact weak passages and actionable rewrite instructions. passed may be true only when every score is at least 8; genericPassages, unsupportedClaims, contradictions, and missingConnections are empty; every saved position has a full section; and the conclusion directly answers the question. Return only JSON.`;
const facts={question:c.question,displayFirstName:c.displayFirstName,lifePathProfile:c.publicLifePathProfile,personalCard:c.numerology.personalCard,positions:c.positions,canonVersion:c.canon.version,canonEntries:c.canon.entries,synthesis:c.synthesis,synthesisGrade:c.synthesisGrade,privateProfile:c.plan.privateProfile,cardPlans:c.plan.cardPlans,directAnswer:c.plan.directAnswer,ruledOutDirection:c.plan.ruledOutDirection,candidateForms:c.plan.candidateForms,report:c.report};
const scores={type:'object',additionalProperties:false,properties:{questionSpecificity:{type:'integer',minimum:0,maximum:10},lifePathRecognition:{type:'integer',minimum:0,maximum:10},birthProfileEffect:{type:'integer',minimum:0,maximum:10},claimSupport:{type:'integer',minimum:0,maximum:10},cardFidelity:{type:'integer',minimum:0,maximum:10},crossCardContinuity:{type:'integer',minimum:0,maximum:10},practicalValue:{type:'integer',minimum:0,maximum:10},marcusVoice:{type:'integer',minimum:0,maximum:10}},required:['questionSpecificity','lifePathRecognition','birthProfileEffect','claimSupport','cardFidelity','crossCardContinuity','practicalValue','marcusVoice']};
const list={type:'array',items:{type:'string'}};
const schema={type:'object',additionalProperties:false,properties:{passed:{type:'boolean'},scores,genericPassages:list,unsupportedClaims:list,contradictions:list,missingConnections:list,rewriteInstructions:list,reason:{type:'string',minLength:40}},required:['passed','scores','genericPassages','unsupportedClaims','contradictions','missingConnections','rewriteInstructions','reason']};
return [{json:{...c,graderBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(facts)}],response_format:{type:'json_schema',json_schema:{name:'marcus_report_grade',strict:true,schema}},max_completion_tokens:3500}}}];'''
grader_request = code("10 · Build report grader request", [1380, 20], grader_request_js)
grader = openai("11 · Grade specificity and value", [1640, 20], "={{ JSON.stringify($json.graderBody) }}", "Independent strict grader. Its claimed pass is recomputed in code.")


def grade_decision_js(context_node, final=False):
    final_line = "if(!approved)throw new Error(`Final report failed editorial QA: ${grade.reason}`);" if final else ""
    return rf'''const source=$('{context_node}').first().json;
let raw=$json.choices?.[0]?.message?.content;if(Array.isArray(raw))raw=raw.map(x=>x.text||'').join('');
if(typeof raw!=='string'||!raw.trim())throw new Error('Grader returned no verdict.');
raw=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
let grade;try{{grade=JSON.parse(raw);}}catch(e){{throw new Error(`Grader JSON failed: ${{e.message}}`);}}
const scoreValues=Object.values(grade.scores||{{}});const issueCount=(grade.genericPassages?.length||0)+(grade.unsupportedClaims?.length||0)+(grade.contradictions?.length||0)+(grade.missingConnections?.length||0);
const approved=grade.passed===true&&scoreValues.length===8&&scoreValues.every(value=>Number.isInteger(value)&&value>=8)&&issueCount===0;
{final_line}
return [{{json:{{...source,grade,approved,gradeAttempt:{2 if final else 1}}}}}];'''


decision = code("12 · Enforce first grade", [1900, 20], grade_decision_js("10 · Build report grader request"))
approved_if = node(
    "13 · Report approved?",
    "n8n-nodes-base.if",
    2.2,
    [2160, 20],
    {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2}, "conditions": [{"id": "approved", "leftValue": "={{ $json.approved ? 'yes' : 'no' }}", "rightValue": "yes", "operator": {"type": "string", "operation": "equals"}}], "combinator": "and"}, "options": {}},
)

rewrite_request_js = r'''const c=$input.first().json;
const system=`You are Marcus Stone revising a paid tarot report after strict editorial review. Preserve the exact saved cards, complete position set, approved synthesis, visible Life Path profile, central plan, and clear voice. Fix every issue from both private and customer-view graders. The lifePathApplication must begin “Your Life Path is [number], [archetype],” preserve the profile's plain strengths and challenges, and explain how that primary pattern affects this exact question and spread. The personal card is secondary. If it is The Lovers, it may clarify choice, commitment, values, or shared responsibility; it may not replace The Builder with romance, caregiving, or a vague relational identity. Do not expose Expression, Personality, canon passages, evidence IDs, or calculations. Use only the supplied plan to choose a defensible meaning of every card. Do not assert private hypotheses as biography. Rewrite every quoted unsupported identity or life claim as a proposition carried by named cards and invite the buyer to confirm or reject it. Develop each fixed card's prior interpretation without quoting it or calling it a “saved message,” “email meaning,” “message for you,” or any other process label. Remove unsupported time spans such as “for years” unless the customer supplied them. Lead every personal hypothesis with the card and position that supports it. Use plain verbs and concrete examples. Never use “structural stewardship,” “conscious custodian,” “humane structures,” “calling-level themes,” “routinize warmth,” or “you are most yourself.” Do not repeat an exercise, timeframe, or recommendation: one section owns each action, and the conclusion refers back without restating it. Return the complete report JSON, not patches or commentary.`;
const sectionRequirements=Object.fromEntries(c.positions.map(p=>[`position_${p.number}`,`${p.cardName} — ${p.label} — ${p.visibility}`]));
const hidePrivateLabels=value=>JSON.parse(JSON.stringify(value),(key,item)=>typeof item==='string'?item
  .replace(/\b(?:life path|expression(?: number)?|birthday(?: number)?|soul urge|personality(?: number)?|maturity(?: number)?)\s*(?:number\s*)?\d+\b/gi,'one part of the private profile')
  .replace(/\b(?:LP|EX|PE)(?:[1-9]|11|22)\.[A-Z]+\b/g,'private evidence')
  .replace(/\b(?:direct|reinforced|pair-inference)\b/gi,'supported')
  .replace(/\b(?:numerology|life path|expression number|birthday number|soul urge|personality number|maturity number|canon(?:ical)?(?: passage)?)\b/gi,'private profile'):item);
const positions=c.positions.map(({emailMeaning,...position})=>position);
const cardPlans=hidePrivateLabels(c.plan.cardPlans).map(({emailMeaning,...plan})=>({...plan,...(emailMeaning?{priorCardMeaningToDevelop:emailMeaning}:{})}));
const facts={question:c.question,displayFirstName:c.displayFirstName,lifePathProfile:c.publicLifePathProfile,personalCard:c.numerology.personalCard,positions,sectionRequirements,privateProfile:hidePrivateLabels(c.plan.privateProfile),cardPlans,directAnswer:hidePrivateLabels(c.plan.directAnswer),ruledOutDirection:hidePrivateLabels(c.plan.ruledOutDirection),candidateForms:hidePrivateLabels(c.plan.candidateForms),previousReport:c.report,grade:c.grade};
const sectionSchema={type:'object',additionalProperties:false,properties:{heading:{type:'string',minLength:8},body:{type:'string',minLength:380},testThis:{type:'string',minLength:100},practicalMeaning:{type:'string',minLength:100}},required:['heading','body','testThis','practicalMeaning']};
const sectionKeys=c.positions.map(p=>`position_${p.number}`);
const sectionsByPosition={type:'object',additionalProperties:false,properties:Object.fromEntries(sectionKeys.map(key=>[key,sectionSchema])),required:sectionKeys};
const schema={type:'object',additionalProperties:false,properties:{title:{type:'string',minLength:8},theme:{type:'string',minLength:30},opening:{type:'string',minLength:180},lifePathApplication:{type:'string',minLength:260},personalCardHeading:{type:'string',minLength:8},personalCardReading:{type:'string',minLength:260},sectionsByPosition,synthesis:{type:'string',minLength:350},conclusion:{type:'string',minLength:350}},required:['title','theme','opening','lifePathApplication','personalCardHeading','personalCardReading','sectionsByPosition','synthesis','conclusion']};
const rewriteTokenBudget=Math.min(18000,7000+Math.max(0,c.positions.length-6)*1750);
return [{json:{...c,rewriteBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(facts)}],response_format:{type:'json_schema',json_schema:{name:'marcus_rewritten_report',strict:true,schema}},max_completion_tokens:rewriteTokenBudget}}}];'''
rewrite_request = code("14 · Build one bounded rewrite", [2160, 240], rewrite_request_js)
rewriter = openai("15 · Rewrite from grader notes", [2420, 240], "={{ JSON.stringify($json.rewriteBody) }}", "One rewrite only. Same numerology, cards, plan, and question.")
validate_rewrite = code("16 · Validate rewritten report", [2680, 240], validation_js("14 · Build one bounded rewrite"))
final_grader_request = code("17 · Build final grader request", [2940, 240], grader_request_js)
final_grader = openai("18 · Grade rewritten report", [3200, 240], "={{ JSON.stringify($json.graderBody) }}", "Final independent grade; failure stops before PDF.")
final_decision = code("19 · Enforce final grade", [3460, 240], grade_decision_js("17 · Build final grader request", final=True))

customer_grader_request_js = r'''const c=$input.first().json;
const system=`You are grading one paid tarot reading. You have read tarot professionally for over twenty years, mostly for paying clients, face to face and by post. You use the Rider-Waite-Smith deck and know its actual pictures in detail. You have no patience for fortune-telling theatre, sanitised therapy language, or padding.

You do not know how the reading was generated. Judge only the customer-facing report and its supplied customer-visible facts: the question, Life Path profile, personal card, spread positions, and card orientations. Treat those supplied facts as legitimate evidence. A cautious interpretation explicitly led by a named card or the Life Path profile is a supported reading proposition when the meaning is defensible. Do not list such a proposition as unsupported merely because it is interpretive. An unsupported claim asserts unknown biography, history, motive, event, occupation, relationship, or future outcome as fact without support from those visible facts.

Score every dimension 0–5 and support criticism with exact quotations.
1 spreadNotList: does one card read against another by name, so positions cannot be shuffled?
2 claimsCarried: are claims carried by the cards or the supplied Life Path profile actually present? Count sound, thin, and invented claims. Invented means the report states unknown personal biography or an indefensible card meaning as fact. A clearly framed tarot or Life Path proposition is not invented simply because the buyer still needs to test it.
3 picturesAccurate: are the described Rider-Waite pictures correct, and does every spread position receive a real image description?
4 reversalsReal: if reversals exist, do they modify the card rather than merely invert it? If none, mark reversalsApplicable false.
5 falsifiableClaims: count propositions the buyer can check against life inside a month. A reading that cannot be wrong cannot be right.
6 inventedSpecifics: count named possessions, events, dates, seasons, or other details no card supplies. A category the buyer fills in is not an invented specific.
7 timing: count dated claims and grade whether the timing is justified. No dated claims is acceptable.
8 dignity: does it read the buyer without flattering or accusing?
9 structureAndFinish: is there a whole-document argument whose ending adds up to more than the parts?
10 wouldSign: would you put your professional name on it and send it to a paying client?

Also identify the single best quoted passage, single worst quoted passage, whether the buyer feels read or processed, whether the buyer returns, every unsupported claim, and concrete rewrite instructions. Return JSON only.`;
const scores={type:'object',additionalProperties:false,properties:{spreadNotList:{type:'integer',minimum:0,maximum:5},claimsCarried:{type:'integer',minimum:0,maximum:5},picturesAccurate:{type:'integer',minimum:0,maximum:5},reversalsReal:{type:'integer',minimum:0,maximum:5},falsifiableClaims:{type:'integer',minimum:0,maximum:5},inventedSpecifics:{type:'integer',minimum:0,maximum:5},timing:{type:'integer',minimum:0,maximum:5},dignity:{type:'integer',minimum:0,maximum:5},structureAndFinish:{type:'integer',minimum:0,maximum:5},wouldSign:{type:'integer',minimum:0,maximum:5}},required:['spreadNotList','claimsCarried','picturesAccurate','reversalsReal','falsifiableClaims','inventedSpecifics','timing','dignity','structureAndFinish','wouldSign']};
const counts={type:'object',additionalProperties:false,properties:{soundClaims:{type:'integer',minimum:0},thinClaims:{type:'integer',minimum:0},inventedClaims:{type:'integer',minimum:0},falsifiableClaims:{type:'integer',minimum:0},inventedSpecifics:{type:'integer',minimum:0},datedClaims:{type:'integer',minimum:0}},required:['soundClaims','thinClaims','inventedClaims','falsifiableClaims','inventedSpecifics','datedClaims']};
const list={type:'array',items:{type:'string'}};
const schema={type:'object',additionalProperties:false,properties:{scores,counts,reversalsApplicable:{type:'boolean'},bestPassage:{type:'string',minLength:20},bestReason:{type:'string',minLength:40},worstPassage:{type:'string',minLength:20},worstReason:{type:'string',minLength:40},feelsReadOrProcessed:{type:'string',minLength:80},buyerReturns:{type:'string',minLength:80},unsupportedClaims:list,rewriteInstructions:list},required:['scores','counts','reversalsApplicable','bestPassage','bestReason','worstPassage','worstReason','feelsReadOrProcessed','buyerReturns','unsupportedClaims','rewriteInstructions']};
const customerReport={question:c.question,spreadName:c.spreadName,lifePathProfile:c.publicLifePathProfile,personalCard:c.numerology.personalCard,positions:c.positions.map(({number,label,cardName,reversed,visibility})=>({number,label,cardName,reversed,visibility})),report:c.report};
return [{json:{...c,customerGraderBody:{model:'gpt-5.1',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(customerReport)}],response_format:{type:'json_schema',json_schema:{name:'marcus_customer_view_grade',strict:true,schema}},max_completion_tokens:5000}}}];'''
customer_grader_request = code("20 · Build customer-view grade", [3720, 20], customer_grader_request_js)
customer_grader = openai("21 · Grade as a paying reader", [3980, 20], "={{ JSON.stringify($json.customerGraderBody) }}", "Faithful structured version of docs/02/n8n/docs/02/02-compare-grade-prompt.md. It sees no private profile.")

customer_grade_decision_js = r'''const c=$('20 · Build customer-view grade').first().json;
let raw=$json.choices?.[0]?.message?.content;if(Array.isArray(raw))raw=raw.map(x=>x.text||'').join('');
if(typeof raw!=='string'||!raw.trim())throw new Error('Customer-view grader returned no verdict.');
raw=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
let customerGrade;try{customerGrade=JSON.parse(raw);}catch(e){throw new Error(`Customer-view grader JSON failed: ${e.message}`);}
const s=customerGrade.scores||{},counts=customerGrade.counts||{};
const required=['spreadNotList','claimsCarried','picturesAccurate','falsifiableClaims','inventedSpecifics','timing','dignity','structureAndFinish','wouldSign'];
const scoresPass=required.every(key=>Number.isInteger(s[key])&&s[key]>=4);
const reversalsPass=customerGrade.reversalsApplicable===false||(Number.isInteger(s.reversalsReal)&&s.reversalsReal>=4);
const customerApproved=scoresPass&&reversalsPass&&counts.inventedClaims===0&&counts.inventedSpecifics===0&&(customerGrade.unsupportedClaims?.length||0)===0;
const customerRoute=customerApproved?'approved':c.gradeAttempt>=2?'review':'rewrite';
return [{json:{...c,privateGrade:c.grade,customerGrade,grade:{private:c.grade,customer:customerGrade},customerApproved,customerRoute}}];'''
customer_decision = code("22 · Enforce customer-view grade", [4240, 20], customer_grade_decision_js)
customer_approved_if = node(
    "23 · Customer view approved?",
    "n8n-nodes-base.if",
    2.2,
    [4500, 20],
    {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2}, "conditions": [{"id": "approved", "leftValue": "={{ $json.customerApproved ? 'yes' : 'no' }}", "rightValue": "yes", "operator": {"type": "string", "operation": "equals"}}], "combinator": "and"}, "options": {}},
)
rewrite_available_if = node(
    "QA · Rewrite still available?",
    "n8n-nodes-base.if",
    2.2,
    [4760, 300],
    {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2}, "conditions": [{"id": "rewrite", "leftValue": "={{ $json.customerRoute }}", "rightValue": "rewrite", "operator": {"type": "string", "operation": "equals"}}], "combinator": "and"}, "options": {}},
)
qa_hold_js = r'''const c=$input.first().json;return [{json:{status:'QA_REVIEW_REQUIRED',stage:1,testRunId:c.testRunId,editionId:c.editionId,question:c.question,displayFirstName:c.displayFirstName,lifePathProfile:c.publicLifePathProfile,canonVersion:c.canon.version,canonKeys:c.canon.keys,positions:c.positions,gradeAttempt:c.gradeAttempt,privateGrade:c.privateGrade,customerGrade:c.customerGrade,reason:c.customerGrade?.worstReason||'The final customer-view grade did not pass.',rewriteInstructions:c.customerGrade?.rewriteInstructions||[],pdfCreated:false,nextStep:'Revise the prompt or reading rules, then run again. No PDF was rendered.'}}];'''
qa_hold = code("QA HOLD · NO PDF", [5020, 300], qa_hold_js, "Terminal manual-test result after the one allowed rewrite fails. No PDF, delivery, or customer action occurs.")

html_js = r'''const c=$input.first().json,r=c.report;
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const paras=v=>esc(v).split(/\n\s*\n/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
const spread=c.positions.map(p=>`<figure><img src="${esc(p.cardImageUrl)}" alt="${esc(p.cardName)}"><figcaption><b>${p.number}</b> ${esc(p.cardName)}<small>${esc(p.label)}</small></figcaption></figure>`).join('');
const sections=r.sections.map(s=>`<section class="reading"><div class="ordinal">POSITION ${s.positionNumber}${s.visibility==='face_up_fixed'?' · FIRST SEEN IN YOUR EMAIL':''}</div><h2>${esc(s.heading)}</h2><div class="cardline">${esc(s.cardName)} · ${esc(s.positionLabel)}</div><figure class="card"><img src="${esc(s.cardImageUrl)}" alt="${esc(s.cardName)}"><figcaption>${esc(s.cardName)}</figcaption></figure><div class="prose">${paras(s.body)}<p class="test"><strong>Check this against your life:</strong> ${esc(s.testThis)}</p><p class="practical"><strong>What this asks of you:</strong> ${esc(s.practicalMeaning)}</p></div></section>`).join('');
const lp=c.publicLifePathProfile;
const lpStrengths=lp.strengths.map(item=>`<li>${esc(item)}</li>`).join('');
const lpChallenges=lp.challenges.map(item=>`<li>${esc(item)}</li>`).join('');
const fileSlug=String(c.displayFirstName||'reading').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const html=`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:Letter;margin:.62in .68in}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#f4efe5;color:#29251f;font-family:Georgia,'Times New Roman',serif;line-height:1.58}.mast{font-family:Arial,sans-serif;letter-spacing:.22em;font-size:9px;color:#725b39;text-transform:uppercase;border-bottom:1px solid #cbbd9d;padding-bottom:11px}.eyebrow{font-family:Arial,sans-serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#80653c;margin-top:25px}h1{font-size:34px;line-height:1.12;font-weight:normal;margin:9px 0 10px}.theme{font-size:16px;font-style:italic;color:#655845}.hero{display:block;width:100%;max-height:3.85in;object-fit:cover;margin:21px 0 18px;border:1px solid #cbbd9d}.meta{font:10px Arial,sans-serif;color:#6f685e;background:#eee5d5;padding:11px 14px;margin:18px 0}.opening{font-size:15px}.life-path{background:#3b3023;margin:22px 0}.life-path h2{margin-bottom:8px}.life-path .life-traits{display:flex;gap:28px;margin:14px 0}.life-path .life-traits>div{flex:1}.life-path ul{margin:6px 0 0;padding-left:19px}.life-path li{font-size:12.5px;margin:2px 0}.spread{page-break-inside:avoid;border:1px solid #cbbd9d;padding:17px;margin:25px 0}.spread h2{font:10px Arial,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:#725b39;margin:0 0 14px}.spread-grid{display:flex;align-items:flex-start;justify-content:center;gap:10px;flex-wrap:wrap}.spread figure{width:76px;margin:0;text-align:center}.spread img{display:block;width:62px;height:106px;object-fit:cover;margin:0 auto;border:1px solid #b9aa89}.spread figcaption{font:8px Arial,sans-serif;line-height:1.25;margin-top:5px}.spread figcaption b{color:#80653c;margin-right:2px}.spread small{display:block;color:#766f65;margin-top:3px}.lens{page-break-inside:avoid;background:#28251f;color:#f6efe2;padding:23px 25px;margin:28px 0;overflow:hidden}.lens .eyebrow{color:#d7bd83;margin:0}.lens h2{font-size:23px;font-weight:normal;margin:6px 0 12px}.lens img{float:left;width:1.35in;margin:2px 18px 9px 0;border:1px solid #8a785c}.lens p{font-size:13.5px}.reading{page-break-inside:avoid;border-top:1px solid #b9aa89;padding:25px 0 16px;overflow:hidden}.ordinal{font:9px Arial,sans-serif;letter-spacing:.16em;color:#80653c}.reading h2{font-size:23px;line-height:1.2;font-weight:normal;margin:6px 0 2px}.cardline{font-size:12px;font-style:italic;color:#6d604f;margin-bottom:13px}.card{float:left;width:1.45in;margin:3px 19px 9px 0}.card img{display:block;width:100%;border:1px solid #b9aa89}.card figcaption{font:7px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;text-align:center;color:#766f65;margin-top:4px}.reading p{font-size:13.5px}.test,.practical{clear:both;padding:10px 13px;margin-top:11px}.test{border:1px solid #d6c8ac;background:#faf6ed}.practical{background:#e9dfcc}.closing{page-break-inside:avoid;background:#fffaf0;border-left:4px solid #92733f;padding:20px 23px;margin-top:22px}.closing h2{font-size:21px;font-weight:normal}.closing p{font-size:13.5px}.signature{font-size:19px;font-style:italic}.foot{font:8px Arial,sans-serif;color:#766f65;border-top:1px solid #cbbd9d;margin-top:30px;padding-top:10px}</style></head><body><main><div class="mast">Marcus Stone · Personal Tarot Reading</div><div class="eyebrow">Prepared for ${esc(c.displayFirstName)}</div><h1>${esc(r.title)}</h1><p class="theme">${esc(r.theme)}</p><img class="hero" src="${esc(c.heroImageUrl)}" alt="The spread first shown in the daily email"><div class="meta">${esc(c.spreadName)} · ${c.faceUpCount} cards first seen in the email · ${c.faceDownCount} cards drawn for this reading</div><div class="opening">${paras(r.opening)}</div><aside class="lens life-path"><div class="eyebrow">Your numerology foundation</div><h2>Life Path ${esc(lp.number)} · ${esc(lp.archetype)}</h2><p>${esc(lp.core)}</p><div class="life-traits"><div><strong>Strengths</strong><ul>${lpStrengths}</ul></div><div><strong>Growth edges</strong><ul>${lpChallenges}</ul></div></div><p><strong>How it shapes this reading:</strong> ${esc(r.lifePathApplication)}</p></aside><aside class="spread"><h2>Your complete spread</h2><div class="spread-grid">${spread}</div></aside><aside class="lens"><div class="eyebrow">Your personal card</div><h2>${esc(c.numerology.personalCard)} · ${esc(r.personalCardHeading)}</h2><img src="${esc(c.personalCardImageUrl)}" alt="${esc(c.numerology.personalCard)}">${paras(r.personalCardReading)}</aside>${sections}<section class="closing"><h2>How the reading comes together</h2>${paras(r.synthesis)}${paras(r.conclusion)}<div class="signature">Marcus</div></section><div class="foot">STAGE 1 MANUAL TEST · Edition ${esc(c.editionId)} · No payment, customer record, delivery, or audio was created. Test ${esc(c.testRunId)}.</div></main></body></html>`;
return [{json:{...c,html,fileName:`marcus-stage1-${fileSlug}-numerology-${c.spreadType}.pdf`}}];'''
render = code("24 · Render accepted report HTML", [4760, 20], html_js)
pdf = node(
    "25 · PDFShift creates the PDF",
    "n8n-nodes-base.httpRequest",
    4.2,
    [5020, 20],
    {
        "method": "POST", "url": "https://api.pdfshift.io/v3/convert/pdf",
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json",
        "jsonBody": "={\n  \"source\": {{ JSON.stringify($json.html) }},\n  \"format\": \"Letter\",\n  \"margin\": \"0\",\n  \"use_print\": true,\n  \"sandbox\": false\n}",
        "options": {"response": {"response": {"responseFormat": "file"}}, "timeout": 120000},
    },
    credentials={"httpHeaderAuth": PDFSHIFT_CRED},
)
done_js = r'''const pdf=$input.first(),c=$('24 · Render accepted report HTML').first().json;if(!pdf.binary?.data)throw new Error('PDFShift returned no PDF.');pdf.binary.data.fileName=c.fileName;pdf.binary.data.mimeType='application/pdf';return [{json:{status:'REPORT_READY',stage:1,testRunId:c.testRunId,editionId:c.editionId,question:c.question,spreadType:c.spreadType,displayFirstName:c.displayFirstName,numerology:c.numerology,lifePathProfile:c.publicLifePathProfile,canonVersion:c.canon.version,canonKeys:c.canon.keys,synthesisQa:c.synthesisQa,synthesisGrade:c.synthesisGrade,positions:c.positions,planQa:c.planQa,reportQa:c.reportQa,privateGrade:c.privateGrade||c.grade,customerGrade:c.customerGrade,gradeAttempt:c.gradeAttempt,fileName:c.fileName,download:'Open Binary and download data.'},binary:pdf.binary}];'''
done = code("26 · REPORT READY — DOWNLOAD PDF", [5280, 20], done_js)

for source, target in [
    (manual, inputs), (inputs, prepare),
    (prepare, canon_select), (canon_select, synthesis_request), (synthesis_request, synthesizer),
    (synthesizer, validate_synthesis), (validate_synthesis, synthesis_grade_request),
    (synthesis_grade_request, synthesis_grader), (synthesis_grader, enforce_synthesis),
    (enforce_synthesis, plan_request), (plan_request, planner),
    (planner, validate_plan), (validate_plan, writer_request), (writer_request, writer),
    (writer, validate_report), (validate_report, grader_request), (grader_request, grader),
    (grader, decision), (decision, approved_if),
]:
    edge(source, target)
edge(approved_if, customer_grader_request, 0)
edge(approved_if, rewrite_request, 1)
for source, target in [
    (rewrite_request, rewriter), (rewriter, validate_rewrite), (validate_rewrite, final_grader_request),
    (final_grader_request, final_grader), (final_grader, final_decision),
    (customer_grader_request, customer_grader), (customer_grader, customer_decision),
    (customer_decision, customer_approved_if),
    (render, pdf), (pdf, done),
]:
    edge(source, target)
edge(final_decision, customer_grader_request)
edge(customer_approved_if, render, 0)
edge(customer_approved_if, rewrite_available_if, 1)
edge(rewrite_available_if, rewrite_request, 0)
edge(rewrite_available_if, qa_hold, 1)

main_lane = [
    manual, inputs, prepare, canon_select, synthesis_request, synthesizer, validate_synthesis,
    synthesis_grade_request, synthesis_grader, enforce_synthesis, plan_request, planner,
    validate_plan, writer_request, writer, validate_report, grader_request, grader, decision,
    approved_if, customer_grader_request, customer_grader, customer_decision,
    customer_approved_if, render, pdf, done,
]
rewrite_lane = [rewrite_request, rewriter, validate_rewrite, final_grader_request, final_grader, final_decision]
by_name = {item["name"]: item for item in nodes}
for index, name in enumerate(main_lane):
    by_name[name]["position"] = [-900 + index * 250, 20]
rewrite_start = -900 + (main_lane.index(approved_if) + 1) * 250
for index, name in enumerate(rewrite_lane):
    by_name[name]["position"] = [rewrite_start + index * 250, 300]

node(
    "STAGE 2 — PRODUCTION REMAINS PARKED",
    "n8n-nodes-base.stickyNote",
    1,
    [-400, 500],
    {"content": "# STAGE 2 · SUPABASE + VERIFIED PAYMENT\n\nAfter editorial approval: verified paid event → trusted edition/order → shared numerology engine → immutable canon selection → cited synthesis → atomic saved draw → same planning/writing/grading core → private PDF storage → 24h/12h delivery → optional audio chain.\n\nProduction should save the canon version, keys, hashes, and accepted synthesis. Raw birth name and date of birth never enter model request bodies."},
)

workflow = {
    "name": "08 Marcus — Numerology-Anchored Stage 1 / Stage 2 Parked",
    "nodes": nodes,
    "connections": connections,
    "active": False,
    "settings": {"executionOrder": "v1", "saveManualExecutions": True, "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
}
OUT.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n")
print(f"Built {OUT.name}: {len(nodes)} nodes; inactive.")
