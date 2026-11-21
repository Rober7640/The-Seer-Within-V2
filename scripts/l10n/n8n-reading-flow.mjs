// The localized copies of the Energy Clearing reading flow (n8n), built from the live English flow.
//
//   node scripts/l10n/n8n-reading-flow.mjs <es-US|fr-FR> check|create > page.js
//
// page.js runs in the signed-in n8n tab (Claude in Chrome javascript_tool, on /home/workflows, never
// on an open editor). It reads the English flow UaLPiVVs7j5jzNyO, copies it in memory and applies
// every edit below; each edit must match an exact number of times or nothing happens.
//   check   build and verify the copy, save nothing, report each edit
//   create  the same, then POST it as a NEW workflow, inactive, no pinned data. Refuses if a flow
//           with this locale's name prefix already exists. The English flow is only read.
// The French copy gJ5ZPAQzJxk3OYyw (2026-11-19) was made by n8n's Duplicate plus the same edits
// in place; its table is kept here so a rebuild gives the same flow.
//
// Every /rest call sends the browser-id header: a call without it signs the operator out.
// After create: test with pinned data on the copy (feedback: prove on n8n), then clear the pins.
// Routing buyers to the copy is a Live Stripe Router line, which needs the operator's OK.
import process from "node:process";

const SRC = "UaLPiVVs7j5jzNyO";

const EXAMPLES_MAIN = '"The stopping. That sudden nothing…", "It released like smoke through an open window", "The shadow took. But it also gave.", "You are not damaged. You are deepened."';
const EXAMPLES_BUMP = '"When you told me you\'re always the one who gives more…", "It took. But it also built something.", "You are not broken around money. You were trained."';
const TAGS_MAIN = "<opening>, <what_i_saw>, <the_shadow>, <the_gift>, <what_i_cleared>, <whats_coming>, <signs_to_watch>, <sacred_instructions>, <closing>";
const TAGS_BUMP = "<opening>, <what_i_saw>, <the_shadow>, <the_gift>, <whats_coming>, <signs_to_watch>, <closing>";

// ── Spanish (Mexican Spanish for women living in the US; US market: Letter paper, US dates) ──
const ES = (tags, examples, signoff) => `

=== OUTPUT LANGUAGE: SPANISH (MEXICAN SPANISH, FOR A WOMAN LIVING IN THE US). THIS OVERRIDES THE LANGUAGE OF EVERYTHING ABOVE ===
Everything above is written in English for you. This client is a Mexican or Mexican-American woman living in the United States, and she reads Spanish. Write the entire reading in natural, warm, written Mexican Spanish, the way Evelyn would write it if Spanish were her own language.
- Keep every XML tag exactly as named above, in English: ${tags}. Only the text inside the tags is Spanish.
- Address her as "tú" everywhere (tu, tus, te, ti, contigo). Never "usted", never "vosotros". Adjectives and participles about her are feminine (lista, segura, cansada). Her ancestors stay neutral ("tus ancestros", "las personas de tu linaje").
- Write Spanish from the first word; never translate English phrasing. Where the prompt above quotes an English example line (${examples}), make the same move in your own Spanish words. Never translate the example line itself.
- When you quote her own words, quote them exactly as she wrote them, in double quotes.
- Names stay exactly as written: Evelyn, Evelyn Cross, The Seer Within, her first name, any name she gave.
- Capitalised labels and topic keys in the prompt (time frames, practice names, "love", "money", "purpose", "someone") tell you what to write about; never copy them into the reading in English. If you name a time frame or a practice, say it in Spanish ("En los próximos 7 días", "Anclaje de la mañana").
- Keep numbers as figures (7 días, 30 días, 3 meses, 111, 444, 777) and dates in Spanish form (20 de noviembre de 2026).
- Spanish punctuation: every question opens with ¿. "…" for a pause. No exclamation marks.
- Mexican Spanish, the way US Latinas read it every day: no Spain Spanish (vosotros, coger, vale, móvil, ordenador, enfadada), no Spanglish calques (hacer sentido, aplicar para), no sayings or proverbs.
- No English word anywhere in the reading. Where the English voice would say "dear", Spanish uses "querida", at most twice in the whole reading; never "mija", "mi reina", "corazón", "mi amor", "chula" or "linda".
- The phrases banned above are banned in Spanish too: "el universo tiene un plan", "confía en el camino", "confía en el proceso", "eres suficiente", "te mando amor", "te envío amor", "un viaje increíble".
- The word counts above apply to the Spanish text.
- ${signoff}
=== END OUTPUT LANGUAGE ===`;

// ── French (France; € market: A4 paper) — the text the French copy got on 2026-11-19 ──
const FR = (tags, examples, signoff) => `

=== OUTPUT LANGUAGE: FRENCH (FRANCE). THIS OVERRIDES THE LANGUAGE OF EVERYTHING ABOVE ===
Everything above is written in English for you. This client lives in France and reads French. Write the entire reading in natural, warm, written French, the way Evelyn would write it if French were her own language.
- Keep every XML tag exactly as named above, in English: ${tags}. Only the text inside the tags is French.
- Address her as "vous" everywhere. Never "tu". Prefer turns of phrase that need no gender agreement about her; where French forces one, use the feminine. Her ancestors stay neutral (« vos ancêtres », « les personnes de votre lignée »).
- Write French from the first word; never translate English phrasing. Where the prompt above quotes an English example line (${examples}), make the same move in your own French words. Never translate the example line itself.
- When you quote her own words, quote them exactly as she wrote them, in « ».
- Names stay exactly as written: Evelyn, Evelyn Cross, The Seer Within, her first name, any name she gave.
- Capitalised labels and topic keys in the prompt (time frames, practice names, "love", "money", "purpose", "someone") tell you what to write about; never copy them into the reading in English. If you name a time frame or a practice, say it in French (« Dans les 7 prochains jours », « Ancrage du matin »).
- Keep numbers as figures (7 jours, 30 jours, 3 mois, 111, 444, 777) and dates in French form (19 novembre 2026).
- French typography: « » for quotes, "…" for a pause. No exclamation marks.
- No English word anywhere in the reading. Where the English voice would say "dear", French uses « ma chère », at most twice in the whole reading; never « chérie » or « ma belle ».
- The phrases banned above are banned in French too: « l'univers a un plan », « faites confiance au chemin », « vous êtes assez », « je vous envoie de l'amour », « un voyage incroyable ».
- The word counts above apply to the French text.
- ${signoff}
=== END OUTPUT LANGUAGE ===`;

const LOCALES = {
  "es-US": {
    prefix: "ES — ", label: "Spanish", varName: "ES_OUTPUT",
    path: "the-seer-within-v1-v2-stripe-es", date: "es-US", file: "lectura-", tag: "reading_ready_es", paperA4: false, lang: "es",
    main: ES(TAGS_MAIN, EXAMPLES_MAIN, 'Sign the closing "Con luz y amor ancestral, Evelyn". The 30-day integration period is "un periodo de integración de 30 días".'),
    bump: ES(TAGS_BUMP, EXAMPLES_BUMP, "Sign off as Evelyn, in Spanish."),
    pdfMain: [
      ["ENERGY CLEARING", "LIMPIEZA ENERGÉTICA", 2],
      ["A Personal Reading & Ancestral Healing", "Lectura personal y sanación ancestral"],
      ["Prepared for ${", "Preparada para ${"],
      ["<h2>Dear ${", "<h2>Querida ${"],
      ["<h2>What I Saw</h2>", "<h2>Lo que vi</h2>"],
      ["<h2>The Shadow</h2>", "<h2>La sombra</h2>"],
      ["<h2>The Gift Within the Wound</h2>", "<h2>El don dentro de la herida</h2>"],
      ["<h2>What I Cleared</h2>", "<h2>Lo que limpié</h2>"],
      ["<h2>What's Coming</h2>", "<h2>Lo que viene</h2>"],
      ["<h2>Signs to Watch For</h2>", "<h2>Fíjate en estas señales</h2>"],
      ["<h2>Sacred Instructions</h2>", "<h2>Instrucciones sagradas</h2>"],
      ["<h2>Final Words</h2>", "<h2>Palabras finales</h2>"],
      ["With light and ancestral love,<br>Evelyn", "Con luz y amor ancestral,<br>Evelyn"],
      ["This reading is sacred and personal.", "Esta lectura es sagrada y personal."],
    ],
    pdfBump: [
      ["THE SECOND THREAD", "EL SEGUNDO HILO", 2],
      ["A Second Reading, Followed Closely", "Una segunda lectura, siguiendo el hilo de cerca"],
      ["Prepared for ${", "Preparada para ${"],
      ["section(`Dear ${", "section(`Querida ${"],
      ["section('What I Saw'", "section('Lo que vi'"],
      ["section('The Shadow'", "section('La sombra'"],
      ["section('The Gift Within the Wound'", "section('El don dentro de la herida'"],
      ["section('Where It Still Costs You'", "section('Lo que todavía te cuesta'"],
      ["section(\"What's Coming\"", "section('Lo que viene'"],
      ["section('Signs to Watch For'", "section('Fíjate en estas señales'"],
      ["section('Your Work Now'", "section('Lo que te toca ahora'"],
      ["section('Final Words'", "section('Palabras finales'"],
      ["With light and ancestral love,<br>Evelyn", "Con luz y amor ancestral,<br>Evelyn"],
      ["This reading is sacred and personal.", "Esta lectura es sagrada y personal."],
    ],
  },
  "fr-FR": {
    prefix: "FR — ", label: "French", varName: "FR_OUTPUT",
    path: "the-seer-within-v1-v2-stripe-fr", date: "fr-FR", file: "etude-", tag: "reading_ready_fr", paperA4: true, lang: "fr",
    main: FR(TAGS_MAIN, EXAMPLES_MAIN, "Sign the closing « Avec lumière et amour ancestral, Evelyn ». The 30-day integration period is « une période d'intégration de 30 jours »."),
    bump: FR(TAGS_BUMP, EXAMPLES_BUMP, "Sign off as Evelyn, in French."),
    pdfMain: [
      ["ENERGY CLEARING", "NETTOYAGE ÉNERGÉTIQUE", 2],
      ["A Personal Reading & Ancestral Healing", "Étude personnalisée et guérison ancestrale"],
      ["Prepared for ${", "Préparée pour ${"],
      ["<h2>Dear ${", "<h2>Chère ${"],
      ["<h2>What I Saw</h2>", "<h2>Ce que j’ai vu</h2>"],
      ["<h2>The Shadow</h2>", "<h2>L’ombre</h2>"],
      ["<h2>The Gift Within the Wound</h2>", "<h2>Le don caché dans la blessure</h2>"],
      ["<h2>What I Cleared</h2>", "<h2>Ce que j’ai libéré</h2>"],
      ["<h2>What's Coming</h2>", "<h2>Ce qui vous attend</h2>"],
      ["<h2>Signs to Watch For</h2>", "<h2>Les signes à guetter</h2>"],
      ["<h2>Sacred Instructions</h2>", "<h2>Vos pratiques sacrées</h2>"],
      ["<h2>Final Words</h2>", "<h2>Derniers mots</h2>"],
      ["With light and ancestral love,<br>Evelyn", "Avec lumière et amour ancestral,<br>Evelyn"],
      ["This reading is sacred and personal.", "Cette étude est sacrée et personnelle."],
    ],
    pdfBump: [
      ["THE SECOND THREAD", "LE SECOND FIL", 2],
      ["A Second Reading, Followed Closely", "Une seconde étude, un fil suivi de près"],
      ["Prepared for ${", "Préparée pour ${"],
      ["section(`Dear ${", "section(`Chère ${"],
      ["section('What I Saw'", "section('Ce que j’ai vu'"],
      ["section('The Shadow'", "section('L’ombre'"],
      ["section('The Gift Within the Wound'", "section('Le don caché dans la blessure'"],
      ["section('Where It Still Costs You'", "section('Ce que ça vous coûte encore'"],
      ["section(\"What's Coming\"", "section('Ce qui vous attend'"],
      ["section('Signs to Watch For'", "section('Les signes à guetter'"],
      ["section('Your Work Now'", "section('Votre part, maintenant'"],
      ["section('Final Words'", "section('Derniers mots'"],
      ["With light and ancestral love,<br>Evelyn", "Avec lumière et amour ancestral,<br>Evelyn"],
      ["This reading is sacred and personal.", "Cette étude est sacrée et personnelle."],
    ],
  },
};

// The English 'Prepare data' reads camelCase fields the DB row doesn't have, so 4 of her 6 chat
// answers never reach the prompt (found 2026-11-19, live executions). Fixed in every copy; the
// live English flow keeps the bug until the operator OKs the same fix there.
const PREPARE_DATA_FIX = [
  ["data.deeperResponse,", "data.deeper_response,"],
  ["data.emotionalResponse,", "data.emotional_response,"],
  ["data.blockSource,", "data.block_source,"],
  ["data.commitmentResponse", "data.commitment_response"],
  ["String(data.personName || '')", "String(data.person_name || '')"],
];

const [locale, mode] = process.argv.slice(2);
const L = LOCALES[locale];
if (!L || !["check", "create"].includes(mode)) {
  console.error("usage: node scripts/l10n/n8n-reading-flow.mjs <" + Object.keys(LOCALES).join("|") + "> check|create");
  process.exit(1);
}

const CFG = {
  src: SRC, prefix: L.prefix, name: `${L.prefix}The seer within V1 in V2 - Energy Clearing Reading - Cosmo (${L.label}, keep inactive until launch)`,
  path: L.path, varName: L.varName, main: L.main, bump: L.bump,
  code: [
    ...PREPARE_DATA_FIX.map(([a, b]) => ["Prepare data", a, b, 1]),
    ...["Prepare data", "Prepare Variables V3", "Prepare Variables V"].map((n) => [n, "toLocaleDateString('en-US'", `toLocaleDateString('${L.date}'`, 1]),
    // the bump PDF's date (double quotes here; missed on the first French and Spanish builds, 2026-11-20)
    ["Prepare data1", 'toLocaleDateString("en-US"', `toLocaleDateString("${L.date}"`, 1],
    ...["Prepare Variables V3", "Prepare Variables V"].map((n) => [n, "pdfFileName: `reading-", "pdfFileName: `" + L.file, 1]),
    ["Build Claude Prompt V3", "prompt: INTEGRITY_RULES + prompt", `prompt: INTEGRITY_RULES + prompt + ${L.varName}`, 1],
    ["Build Bump Prompt", "return { ...data, prompt: INTEGRITY_RULES + prompt };", `return { ...data, prompt: INTEGRITY_RULES + prompt + ${L.varName} };`, 1],
    ...[["Build PDF HTML V3", L.pdfMain], ["Build Bump PDF HTML", L.pdfBump]].flatMap(([n, rows]) => [
      ...(L.paperA4 ? [[n, "size: Letter;", "size: A4;", 1]] : []),
      [n, "<html>", `<html lang="${L.lang}">`, 1],
      ...rows.map(([a, b, t]) => [n, a, b, t ?? 1]),
    ]),
  ],
  params: [
    ...["Claude API V3", "Claude API V"].flatMap((n) => [
      [n, String.raw`max_tokens(\\?"\s*:\s*)8000`, "max_tokens$112000", 1],
      [n, String.raw`"timeout":120000`, '"timeout":180000', 1],
    ]),
    ...["Update Subscriber (PATCH)", "Update Subscriber (PATCH)1"].map((n) => [n, "reading_ready(?![_a-z])", L.tag, 1]),
  ],
};

const PAGE = String.raw`await (async () => {
  const MODE = __MODE__;
  const CFG = __CFG__;
  const bid = localStorage.getItem("n8n-browserId");
  if (!bid) throw new Error("no browser id: STOP, do not fetch");
  if (/\/workflow\//.test(location.pathname)) throw new Error("run this on /home/workflows, not in an editor");
  const api = async (p, o = {}) => {
    const r = await fetch(p, { ...o, headers: { "browser-id": bid, "content-type": "application/json" } });
    if (r.status === 401) throw new Error("401 STOP");
    if (!(r.headers.get("content-type") || "").includes("json")) throw new Error("non-json " + r.status);
    const j = await r.json();
    if (!r.ok) throw new Error("HTTP " + r.status + " " + JSON.stringify(j).slice(0, 300));
    return j;
  };
  const src = (await api("/rest/workflows/" + CFG.src)).data;
  if (src.id !== CFG.src || /^[A-Z]{2} — /.test(src.name)) throw new Error("source is not the English flow");
  const wf = structuredClone(src);
  const node = (n) => { const x = wf.nodes.find((y) => y.name === n); if (!x) throw new Error("missing node " + n); return x; };
  const report = [];
  for (const [n, from, to, times] of CFG.code) {
    const x = node(n);
    const parts = x.parameters.jsCode.split(from);
    if (parts.length - 1 !== times) throw new Error(n + ': "' + from.slice(0, 40) + '" found ' + (parts.length - 1) + ", expected " + times);
    x.parameters.jsCode = parts.join(to);
    report.push(n.slice(0, 18) + " · " + from.slice(0, 26));
  }
  for (const [n, re, to, times] of CFG.params) {
    const x = node(n);
    const s = JSON.stringify(x.parameters);
    const m = s.match(new RegExp(re, "g")) || [];
    if (m.length !== times) throw new Error(n + ": /" + re + "/ found " + m.length + ", expected " + times);
    x.parameters = JSON.parse(s.replace(new RegExp(re, "g"), to));
    report.push(n.slice(0, 18) + " · /" + re.slice(0, 22) + "/");
  }
  for (const [n, text] of [["Build Claude Prompt V3", CFG.main], ["Build Bump Prompt", CFG.bump]]) {
    node(n).parameters.jsCode = "const " + CFG.varName + " = " + JSON.stringify(text) + ";\n" + node(n).parameters.jsCode;
    report.push(n.slice(0, 18) + " · + " + CFG.varName);
  }
  node("Webhook - Production").parameters.path = CFG.path;
  let ids = 0;
  for (const x of wf.nodes) if (x.webhookId) { x.webhookId = crypto.randomUUID(); ids++; }
  const AF = Object.getPrototypeOf(async function () {}).constructor;
  let syntax = "checked";
  for (const x of wf.nodes) if (x.parameters && typeof x.parameters.jsCode === "string") {
    try { new AF("$input", "$", x.parameters.jsCode); } catch (e) {
      if (e instanceof EvalError) { syntax = "unavailable (page blocks eval)"; break; }
      throw new Error("syntax " + x.name + ": " + e.message);
    }
  }
  const list = await api("/rest/workflows?filter=" + encodeURIComponent(JSON.stringify({ name: CFG.prefix.trim() })) + "&take=50");
  const clash = (list.data || []).filter((w) => w.name.startsWith(CFG.prefix)).map((w) => w.id + " " + (w.active ? "ACTIVE" : "inactive"));
  const summary = { mode: MODE, source: { name: src.name, updatedAt: src.updatedAt, nodes: src.nodes.length }, edits: report.length, newWebhookIds: ids, syntax, path: CFG.path, existing: clash };
  if (MODE !== "create") return JSON.stringify(summary); // every edit throws on a miss, so the count is the proof
  if (clash.length) throw new Error("a " + CFG.prefix + "copy already exists: " + clash.join(", "));
  const made = (await api("/rest/workflows", { method: "POST", body: JSON.stringify({ name: CFG.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, active: false, pinData: {} }) })).data;
  const back = (await api("/rest/workflows/" + made.id)).data;
  const after = (await api("/rest/workflows/" + CFG.src)).data;
  return JSON.stringify({ ...summary, created: { id: back.id, name: back.name, active: back.active, nodes: back.nodes.length, pins: Object.keys(back.pinData || {}).length, path: back.nodes.find((x) => x.name === "Webhook - Production").parameters.path }, englishUntouched: after.updatedAt === src.updatedAt && after.active === src.active });
})()`;

process.stdout.write(PAGE.replace("__MODE__", JSON.stringify(mode)).replace("__CFG__", () => JSON.stringify(CFG)) + "\n");
