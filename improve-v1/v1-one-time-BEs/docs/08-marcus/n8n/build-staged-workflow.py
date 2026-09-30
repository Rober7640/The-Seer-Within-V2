"""Build the staged 08 Marcus n8n workflow.

Stage 1 is a manual, credential-backed PDF test. Stage 2 is visibly parked on the
canvas until its Supabase schema and payment event contract are approved.
This builder makes no API calls.
"""

from pathlib import Path
import json
import uuid


HERE = Path(__file__).resolve().parent
OUT = HERE / "08-marcus-staged.n8n.json"

OPENAI_CRED = {"id": "de6vaPn0hPs3icyh", "name": "OpenAi account"}
PDFSHIFT_CRED = {"id": "8TelHH6oJEzYzw2r", "name": "pdfshift-header-auth"}

nodes = []
connections = {}


def node(name, node_type, version, position, parameters, *, credentials=None, notes="", disabled=False):
    value = {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"marcus08-staged/{name}")),
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
    if disabled:
        value["disabled"] = True
    nodes.append(value)
    return name


def code(name, position, js, notes=""):
    return node(name, "n8n-nodes-base.code", 2, position, {"jsCode": js}, notes=notes)


def edge(source, target):
    connections.setdefault(source, {"main": [[]]})["main"][0].append(
        {"node": target, "type": "main", "index": 0}
    )


node(
    "HOW TO TEST — STAGE 1",
    "n8n-nodes-base.stickyNote",
    1,
    [-920, -420],
    {
        "content": "# STAGE 1 · MANUAL PDF TEST\n\n1. Open **2 · TEST INPUTS — EDIT ME**.\n2. Enter the question, spread type, first name and last name.\n3. Click **Execute workflow**.\n4. Open **9 · REPORT READY — DOWNLOAD PDF**, choose **Binary**, then download `data`.\n\nThe workflow stays inactive: the Manual Trigger still works in the editor. No Supabase record, payment, email or customer delivery is touched.\n\n**Spread types:** `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, `twelve_houses`."
    },
)

manual = node("1 · Manual test trigger", "n8n-nodes-base.manualTrigger", 1, [-820, 40], {})

inputs = node(
    "2 · TEST INPUTS — EDIT ME",
    "n8n-nodes-base.set",
    3.4,
    [-600, 40],
    {
        "assignments": {
            "assignments": [
                {"id": "question", "name": "question", "value": "What is my higher calling?", "type": "string"},
                {"id": "spreadType", "name": "spreadType", "value": "six_questions", "type": "string"},
                {"id": "firstName", "name": "firstName", "value": "Maya", "type": "string"},
                {"id": "lastName", "name": "lastName", "value": "Lewis", "type": "string"},
            ]
        },
        "options": {},
    },
    notes="Edit only these four values for a Stage 1 test. Supported spreadType values are listed in the nearby note.",
)

prepare_js = r'''const input = $input.first().json;
const question = String(input.question || '').trim();
const spreadType = String(input.spreadType || '').trim().toLowerCase();
const firstName = String(input.firstName || '').trim();
const lastName = String(input.lastName || '').trim();

if (!question) throw new Error('question is required');
if (!firstName || !lastName) throw new Error('firstName and lastName are required');
for (const value of [firstName, lastName]) {
  if (/[^\x00-\x7F]/.test(value)) throw new Error('Stage 1 uses the current ASCII-only name policy.');
  if (!/^[A-Za-z]+(?:[ '\-]+[A-Za-z]+)*$/.test(value)) throw new Error('Names may use letters, spaces, apostrophes and hyphens.');
}

const spreads = {
  three: {
    name: 'The Three', free: 1,
    labels: ['what shaped this', 'where it stands now', 'where it can lead'],
  },
  six_questions: {
    name: 'The Six Questions', free: 2,
    labels: ['what is already visible', 'what complicates it', 'what you have not named', 'what you need now', 'what can change', 'where to begin'],
  },
  adaptive_eight: {
    name: 'The Eight-Part Reading', free: 4,
    labels: ['what brought you here', 'what is clear now', 'what keeps returning', 'what deserves attention', 'what you are carrying', 'what needs to change', 'what can help', 'where to begin'],
  },
  tree_of_life: {
    name: 'The Tree of Life', free: 3,
    labels: ['what is asking to be seen', 'what is driving it', 'what holds it in place', 'what you are protecting', 'what you are learning', 'what supports you', 'what drains you', 'what must be chosen', 'what can grow', 'where this leads'],
  },
  twelve_houses: {
    name: 'The Twelve Houses', free: 4,
    labels: ['what defines this moment', 'what you value', 'what needs saying', 'where you seek safety', 'what wants expression', 'what needs tending', 'what partnership shows you', 'what must change', 'what expands your view', 'what asks for commitment', 'what future you imagine', 'what remains hidden'],
  },
};
const spread = spreads[spreadType];
if (!spread) throw new Error(`Unsupported spreadType "${spreadType}". Use three, six_questions, adaptive_eight, tree_of_life, or twelve_houses.`);

const deck = [
  'The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World',
  'Ace of Wands','Two of Wands','Three of Wands','Four of Wands','Five of Wands','Six of Wands','Seven of Wands','Eight of Wands','Nine of Wands','Ten of Wands','Page of Wands','Knight of Wands','Queen of Wands','King of Wands',
  'Ace of Cups','Two of Cups','Three of Cups','Four of Cups','Five of Cups','Six of Cups','Seven of Cups','Eight of Cups','Nine of Cups','Ten of Cups','Page of Cups','Knight of Cups','Queen of Cups','King of Cups',
  'Ace of Swords','Two of Swords','Three of Swords','Four of Swords','Five of Swords','Six of Swords','Seven of Swords','Eight of Swords','Nine of Swords','Ten of Swords','Page of Swords','Knight of Swords','Queen of Swords','King of Swords',
  'Ace of Pentacles','Two of Pentacles','Three of Pentacles','Four of Pentacles','Five of Pentacles','Six of Pentacles','Seven of Pentacles','Eight of Pentacles','Nine of Pentacles','Ten of Pentacles','Page of Pentacles','Knight of Pentacles','Queen of Pentacles','King of Pentacles',
];

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let x = seed || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function shuffled(values, seed) {
  const out = [...values];
  const random = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The question + spread fixes the free cards, matching the daily-edition rule.
const fixedPool = shuffled(deck, hash(`edition|${question.toLowerCase()}|${spreadType}`));
const fixedCards = fixedPool.slice(0, spread.free);
const remaining = deck.filter(card => !fixedCards.includes(card));
// Name plus execution time creates a separate buyer test draw for the paid positions.
const testRunId = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 10)}`;
const paidCards = shuffled(remaining, hash(`buyer|${question.toLowerCase()}|${spreadType}|${firstName.toLowerCase()}|${lastName.toLowerCase()}|${testRunId}`))
  .slice(0, spread.labels.length - spread.free);

const letterValues = {a:1,j:1,s:1,b:2,k:2,t:2,c:3,l:3,u:3,d:4,m:4,v:4,e:5,n:5,w:5,f:6,o:6,x:6,g:7,p:7,y:7,h:8,q:8,z:8,i:9,r:9};
let expressionNumber = `${firstName} ${lastName}`.toLowerCase().replace(/[^a-z]/g, '').split('').reduce((sum, c) => sum + letterValues[c], 0);
while (expressionNumber > 9 && ![11,22,33].includes(expressionNumber)) expressionNumber = String(expressionNumber).split('').reduce((sum, d) => sum + Number(d), 0);
const personalCards = {1:'The Magician',2:'The High Priestess',3:'The Empress',4:'The Emperor',5:'The Hierophant',6:'The Lovers',7:'The Chariot',8:'Strength',9:'The Hermit',11:'Justice',22:'The Fool'};
const personalCard = personalCards[expressionNumber];
if (!personalCard) throw new Error(`Expression number ${expressionNumber} has no approved personal-card mapping. Use another test name; number 33 remains a product decision.`);

const positions = spread.labels.map((label, index) => ({
  number: index + 1,
  label,
  visibility: index < spread.free ? 'face_up_fixed' : 'face_down_buyer_draw',
  cardName: index < spread.free ? fixedCards[index] : paidCards[index - spread.free],
  reversed: false,
}));

return [{json:{
  stage: 1, testRunId, question, spreadType, spreadName: spread.name,
  firstName, lastName, expressionNumber, personalCard,
  faceUpCount: spread.free, faceDownCount: spread.labels.length - spread.free,
  positions,
  fixedFaceUp: positions.filter(p => p.visibility === 'face_up_fixed'),
  buyerFaceDown: positions.filter(p => p.visibility === 'face_down_buyer_draw'),
  drawMethod: 'stage1-fixed-edition-plus-buyer-test-v1',
  personalCardMethod: 'expression-existing-engine-v1',
}}];'''

prepare = code(
    "3 · Prepare cards and personal card",
    [-350, 40],
    prepare_js,
    "Free cards are deterministic from question + spread. Face-down cards are drawn separately for this test execution. The personal-card arithmetic mirrors server/lib/numerologyEngine.ts and fails explicitly for unsupported names/33.",
)

prompt_js = r'''const c = $input.first().json;
const system = `You are Marcus Stone, a warm, observant tarot reader writing a paid personal reading.

Write clearly. Avoid riddles, fortune-cookie language, melodrama, therapy jargon, and claims of certainty. Treat the cards as a way to understand patterns and choices. Never claim to know another person's private thoughts as fact. Use the Rider-Waite imagery accurately, but keep the prose human and easy to follow.

The face-up cards came from the daily reading and must remain fixed. The face-down cards were drawn separately for this buyer. The personal card is a lens: explain how its strengths and familiar habits change the interpretation of this question. It is not another spread position.

Give every paid position a complete answer. Each section should move from a concrete image in the card, to what it suggests here, to a practical implication for the buyer. Connect the paid cards to each other and to the fixed face-up cards. Do not repeat the same insight in several sections. End with a grounded conclusion that answers the question while leaving room for the buyer's judgment.

Every field must contain finished reader-facing copy. Never write a placeholder, "continued," "see above," "see below," or an empty string. The connections field must synthesize the fixed face-up cards with the buyer-specific cards. The conclusion must directly answer the buyer's question in two or three substantial paragraphs.

Return only JSON matching the supplied schema.`;

const facts = {
  question: c.question,
  buyer: {firstName: c.firstName, lastName: c.lastName},
  spread: {type: c.spreadType, name: c.spreadName, faceUpCount: c.faceUpCount, faceDownCount: c.faceDownCount},
  personalCard: {name: c.personalCard, expressionNumber: c.expressionNumber},
  fixedFaceUpCardsFromDaily: c.fixedFaceUp,
  buyerSpecificPaidCardsToInterpret: c.buyerFaceDown,
};

const sectionSchema = {
  type:'object', additionalProperties:false,
  properties:{
    heading:{type:'string',minLength:8}, body:{type:'string',minLength:350}, practicalMeaning:{type:'string',minLength:90},
  },
  required:['heading','body','practicalMeaning'],
};

return [{json:{...c, openAiBody:{
  model:'gpt-5.1',
  messages:[
    {role:'system',content:system},
    {role:'user',content:`Write the complete personalized reading from these exact facts. Do not change a position, card, name, or count.\n\n${JSON.stringify(facts, null, 2)}`},
  ],
  response_format:{type:'json_schema',json_schema:{name:'marcus_paid_reading',strict:true,schema:{
    type:'object', additionalProperties:false,
    properties:{
      title:{type:'string',minLength:8}, theme:{type:'string',minLength:20}, opening:{type:'string',minLength:150},
      personalCardHeading:{type:'string',minLength:8}, personalCardReading:{type:'string',minLength:220},
      sections:{type:'array',minItems:c.faceDownCount,maxItems:c.faceDownCount,items:sectionSchema},
      connections:{type:'string',minLength:260}, conclusion:{type:'string',minLength:260},
    },
    required:['title','theme','opening','personalCardHeading','personalCardReading','sections','connections','conclusion'],
  }}},
  max_completion_tokens:5000,
}}}];'''

prompt = code("4 · Build adaptive writing request", [-100, 40], prompt_js)

writer = node(
    "5 · OpenAI writes the reading",
    "n8n-nodes-base.httpRequest",
    4.2,
    [160, 40],
    {
        "method": "POST",
        "url": "https://api.openai.com/v1/chat/completions",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "openAiApi",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.openAiBody) }}",
        "options": {"timeout": 600000, "response": {"response": {"neverError": False}}},
    },
    credentials={"openAiApi": OPENAI_CRED},
    notes="Uses the same stored OpenAI credential already wired to the 02 inactive test drive. One report-generation call per manual execution.",
)

validate_js = r'''const source = $('3 · Prepare cards and personal card').first().json;
let raw = $json.choices?.[0]?.message?.content;
if (Array.isArray(raw)) raw = raw.map(part => part.text || '').join('');
if (typeof raw !== 'string' || !raw.trim()) throw new Error('OpenAI returned no report text.');
raw = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
let report;
try { report = JSON.parse(raw); } catch (error) { throw new Error(`OpenAI report was not valid JSON: ${error.message}`); }
for (const field of ['title','theme','opening','personalCardHeading','personalCardReading','connections','conclusion']) {
  if (typeof report[field] !== 'string' || !report[field].trim()) throw new Error(`Report is missing ${field}.`);
}
for (const field of ['connections','conclusion']) {
  if (report[field].trim().length < 260 || /\b(?:continued|see above|see below|placeholder)\b/i.test(report[field])) {
    throw new Error(`Report ${field} is incomplete or contains a placeholder.`);
  }
}
if (!Array.isArray(report.sections) || report.sections.length !== source.faceDownCount) {
  throw new Error(`Expected ${source.faceDownCount} paid sections; received ${report.sections?.length ?? 0}.`);
}
const expected = source.buyerFaceDown;
for (let i = 0; i < expected.length; i++) {
  const got = report.sections[i];
  for (const field of ['heading','body','practicalMeaning']) {
    if (typeof got[field] !== 'string' || !got[field].trim()) throw new Error(`Section ${i + 1} is missing ${field}.`);
  }
  if (got.body.trim().length < 350 || got.practicalMeaning.trim().length < 90) {
    throw new Error(`Section ${i + 1} is too thin to be a complete paid interpretation.`);
  }
}
// Structural facts never come from the writer. Bind its ordered prose slots to the saved draw here.
report.sections = report.sections.map((section, index) => ({
  ...section,
  positionNumber: expected[index].number,
  positionLabel: expected[index].label,
  cardName: expected[index].cardName,
}));
return [{json:{...source, report, qa:{passed:true, paidSections:report.sections.length, exactDrawPreserved:true, structureSource:'saved-n8n-draw'}}}];'''

validate = code(
    "6 · Validate structure and exact draw",
    [420, 40],
    validate_js,
    "The model returns prose slots only. This node binds them to authoritative saved cards and positions, and fails on missing or extra sections.",
)

html_js = r'''const c = $input.first().json;
const r = c.report;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const paras = value => esc(value).split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
const fixed = c.fixedFaceUp.map(p => `<li><span>Position ${p.number} · ${esc(p.label)}</span><strong>${esc(p.cardName)}</strong></li>`).join('');
const sections = r.sections.map(s => `<section class="reading"><div class="ordinal">POSITION ${s.positionNumber}</div><h2>${esc(s.heading)}</h2><div class="cardline">${esc(s.cardName)} · ${esc(s.positionLabel)}</div>${paras(s.body)}<p class="practical"><strong>What this asks of you:</strong> ${esc(s.practicalMeaning)}</p></section>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#f4efe5;color:#29251f;font-family:Georgia,'Times New Roman',serif;line-height:1.62}.page{width:100%;padding:54px 60px 64px}.mast{font-family:Arial,sans-serif;letter-spacing:.22em;font-size:10px;color:#725b39;text-transform:uppercase;border-bottom:1px solid #cbbd9d;padding-bottom:13px}.eyebrow{font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#80653c;margin-top:34px}.hero h1{font-size:36px;line-height:1.12;font-weight:normal;margin:10px 0 12px}.theme{font-size:17px;font-style:italic;color:#655845;margin:0 0 28px}.meta{font:11px/1.5 Arial,sans-serif;color:#6f685e;background:#eee5d5;padding:12px 15px;margin:22px 0}.opening{font-size:17px}.cards{border:1px solid #cbbd9d;padding:18px 22px;margin:28px 0}.cards h3{font:11px Arial,sans-serif;letter-spacing:.15em;text-transform:uppercase;margin:0 0 12px;color:#725b39}.cards ul{list-style:none;margin:0;padding:0}.cards li{display:flex;justify-content:space-between;gap:20px;padding:8px 0;border-top:1px solid #ddd1b9;font-size:13px}.cards li span{color:#655845}.lens{background:#28251f;color:#f6efe2;padding:25px 28px;margin:30px 0}.lens .eyebrow{color:#d7bd83;margin:0}.lens h2{font-size:24px;font-weight:normal;margin:7px 0 10px}.lens p{margin:0;color:#eee4d2}.reading{page-break-inside:avoid;border-top:1px solid #b9aa89;padding:28px 0 18px}.ordinal{font:10px Arial,sans-serif;letter-spacing:.18em;color:#80653c}.reading h2{font-size:25px;line-height:1.2;font-weight:normal;margin:7px 0 3px}.cardline{font-size:13px;font-style:italic;color:#6d604f;margin-bottom:14px}.reading p{font-size:15px;margin:0 0 13px}.practical{background:#e9dfcc;padding:12px 15px}.closing{page-break-inside:avoid;background:#fffaf0;border-left:4px solid #92733f;padding:22px 25px;margin-top:24px}.closing h2{font-size:22px;font-weight:normal;margin:0 0 10px}.signature{font-size:20px;font-style:italic;margin-top:24px}.foot{font:9px Arial,sans-serif;color:#766f65;border-top:1px solid #cbbd9d;margin-top:35px;padding-top:12px}
</style></head><body><main class="page"><div class="mast">Marcus Stone · Personal Tarot Reading</div><header class="hero"><div class="eyebrow">Prepared for ${esc(c.firstName)} ${esc(c.lastName)}</div><h1>${esc(r.title)}</h1><p class="theme">${esc(r.theme)}</p><div class="meta">${esc(c.spreadName)} · ${c.faceUpCount} fixed face-up cards · ${c.faceDownCount} buyer-specific cards · Test ${esc(c.testRunId)}</div><div class="opening">${paras(r.opening)}</div></header><aside class="cards"><h3>The cards already face up</h3><ul>${fixed}</ul></aside><aside class="lens"><div class="eyebrow">Your personal card</div><h2>${esc(c.personalCard)} · ${esc(r.personalCardHeading)}</h2>${paras(r.personalCardReading)}</aside>${sections}<section class="closing"><h2>How the reading comes together</h2>${paras(r.connections)}${paras(r.conclusion)}<div class="signature">Marcus</div></section><div class="foot">STAGE 1 MANUAL TEST · No payment, customer record or delivery was created. Draw method ${esc(c.drawMethod)}; personal-card method ${esc(c.personalCardMethod)}.</div></main></body></html>`;
return [{json:{...c, html, fileName:`marcus-stage1-${c.firstName.toLowerCase()}-${c.lastName.toLowerCase()}-${c.spreadType}.pdf`}}];'''

html = code("7 · Render print HTML", [680, 40], html_js)

pdf = node(
    "8 · PDFShift creates the PDF",
    "n8n-nodes-base.httpRequest",
    4.2,
    [940, 40],
    {
        "method": "POST",
        "url": "https://api.pdfshift.io/v3/convert/pdf",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True,
        "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={\n  \"source\": {{ JSON.stringify($json.html) }},\n  \"format\": \"Letter\",\n  \"margin\": \"0\",\n  \"use_print\": true,\n  \"sandbox\": false\n}",
        "options": {"response": {"response": {"responseFormat": "file"}}, "timeout": 120000},
    },
    credentials={"httpHeaderAuth": PDFSHIFT_CRED},
    notes="Uses the stored PDFShift header credential. The output binary property is data.",
)

done_js = r'''const pdf = $input.first();
const c = $('7 · Render print HTML').first().json;
if (!pdf.binary?.data) throw new Error('PDFShift returned no binary data.');
pdf.binary.data.fileName = c.fileName;
pdf.binary.data.mimeType = 'application/pdf';
return [{
  json:{
    status:'REPORT_READY', stage:1, testRunId:c.testRunId,
    question:c.question, spreadType:c.spreadType, spreadName:c.spreadName,
    firstName:c.firstName, lastName:c.lastName, personalCard:c.personalCard,
    faceUpCount:c.faceUpCount, faceDownCount:c.faceDownCount,
    fixedFaceUp:c.fixedFaceUp, buyerFaceDown:c.buyerFaceDown,
    qa:c.qa, fileName:c.fileName,
    download:'Open this node output, select Binary, and download data.',
  },
  binary:pdf.binary,
}];'''

done = code(
    "9 · REPORT READY — DOWNLOAD PDF",
    [1200, 40],
    done_js,
    "Successful final node. Open its Binary output and download the data property.",
)

for source, target in [
    (manual, inputs), (inputs, prepare), (prepare, prompt), (prompt, writer),
    (writer, validate), (validate, html), (html, pdf), (pdf, done),
]:
    edge(source, target)

node(
    "STAGE 2 — PRODUCTION LANE (PARKED)",
    "n8n-nodes-base.stickyNote",
    1,
    [-600, 390],
    {
        "content": "# STAGE 2 · SUPABASE + REAL ORDERS\n\nBuild after Stage 1 output is approved. This lane will:\n\n1. accept a server-verified paid-order event;\n2. load the immutable edition and fixed face-up cards from Supabase;\n3. load or atomically save one buyer-specific face-down draw;\n4. calculate and persist the personal card from first + last name;\n5. generate, grade, render and store the private PDF;\n6. queue written delivery for 24h or 12h with the +$12.77 speed bump;\n7. chain the optional audio job from the accepted written report.\n\nThe database tables and payment event contract have not been approved, so this lane is intentionally not wired. Stage 1 does not write to Supabase."
    },
)

workflow = {
    "name": "08 Marcus — Stage 1 Manual PDF Test / Stage 2 Parked",
    "nodes": nodes,
    "connections": connections,
    "active": False,
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": True,
        "saveDataErrorExecution": "all",
        "saveDataSuccessExecution": "all",
    },
}

OUT.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n")
print(f"Built {OUT.name}: {len(nodes)} nodes; Stage 1 runnable; Stage 2 parked; inactive.")
