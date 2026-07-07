#!/usr/bin/env node
/**
 * fb-palm question sourcing — READ-ONLY mining of the v1 `conversations` table.
 * Source for new ad hooks (the question axis). Used by the /fb-palm-hooks skill, stage 0.
 *
 * Usage (run from repo root; pg resolves via node_modules upward walk — no NODE_PATH needed):
 *   node fb-palm/ledger/mine-questions.cjs overview            # bucket + love sub-bucket distribution + conv%
 *   node fb-palm/ledger/mine-questions.cjs deep                # per-segment QUESTION patterns: freq + conv% + lift
 *   node fb-palm/ledger/mine-questions.cjs voc <bucket> <sub_bucket> [n]   # sample verbatim concerns (VOC)
 *
 * Reads DATABASE_URL from repo .env. Nothing is written. See docs/v1-question-mining-findings.md for method + caveats.
 */
const fs = require('fs');
const path = require('path');
const pg = require('pg');

const envPath = process.env.ENV_PATH || path.join(__dirname, '../../.env');
let url = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim();
if (url[0] === '"' || url[0] === "'") url = url.slice(1, -1);
const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 12000 });
const q = async (sql, p) => (await pool.query(sql, p)).rows;
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 140);
const pad = (s, n) => String(s).padStart(n);

// Per-segment recurring QUESTION patterns (POSIX regex, case-insensitive). Non-exclusive.
const SEGMENTS = [
  { bk: 'love', sb: 'SEEKING_LOVE', pats: [
    ['Will I find / meet love?', 'find (true |real )?love|find someone|meet someone|find a (good )?(man|partner|guy)|meet the right'],
    ['When will I meet them?', 'when will i|when am i|how long (until|till|before)|how soon'],
    ['Who is my soulmate?', 'who (is|will be) my soul ?mate'],
    ['Have I already met them?', 'have i (already )?met|already met'],
    ['Will I be alone / I am lonely', '\\yalone\\y|lonel'],
    ['Tired of searching / given up', 'tired|given up|giving up|searching|been (so|too) long'],
    ['Will I love again (later in life)?', 'love again|find love again|too old|my age'],
    ['Will I ever find love?', 'will i ever'],
    ['Soulmate (generic)', '\\ysoul ?mate\\y'],
  ]},
  { bk: 'love', sb: 'RELATIONSHIP_TROUBLE', pats: [
    ['Should I stay or leave?', 'should i (leave|stay|end|go)|leave (him|her|my (husband|wife|marriage|relationship|partner))|end (the|this|my|it|things)|walk away|break up'],
    ['Where is this relationship going?', 'where (is|are) (this|we|my|the)|future (of|with|in)|going (any|some)?where|headed|long.?term'],
    ['Does he really love / want me?', 'does (he|she) (really )?(love|want|care)|love me'],
    ['Will he commit / propose / marry?', 'commit|propose|proposal|marry me|get married|engage'],
    ['Is he the right one / my soulmate?', 'right (one|person|man|guy)|wrong (person|man|one)|\\ysoul ?mate\\y|the one'],
    ['Why is he distant / pulling away?', 'distant|pull(ing)? away|cold|not show(ing)? up|withdraw|\\yspace\\y|ignor'],
    ['Will we make it / work out?', 'work out|make it|save (the|our|my|this)|fix (the|our|us|this|things)|survive|last'],
    ['Is he cheating / can I trust him?', 'cheat|trust|faithful|\\y(lie|lies|lying)\\y'],
  ]},
  { bk: 'love', sb: 'LOST_LOVE', pats: [
    ['Will he come back?', 'come back|comes? back|coming back|\\yreturn|get (him|her) back'],
    ['Will we get back together?', 'back together|reconcile|reunite|reunion|work things out|fix (it|us|things)'],
    ['Does he still love / think of me?', 'still (love|think|care|miss|have feelings|want)|do(es)? (he|she) still'],
    ['Should I move on / let go?', 'move on|let (go|him go|her go|them go)|get over'],
    ["I miss him / can't stop thinking", 'miss (him|her|them)|think(ing)? about (him|her|them)|can.?t stop|on my mind'],
    ['Was it real / what went wrong?', 'was it real|what (went|did) (wrong|happen)|why did (he|she|it|we)'],
    ['Why did he leave / ghost me?', 'ghost|disappear|stopped (talking|communicating|responding|texting)|cut (me )?off|left'],
    ['Is my ex my soulmate / the one?', '\\ysoul ?mate\\y|the one'],
    ['Will I find closure?', 'closure|move forward|heal'],
  ]},
  { bk: 'love', sb: 'BETRAYAL', pats: [
    ['Is he cheating / faithful?', 'cheat|faithful|loyal|affair|unfaithful|sleeping with'],
    ['Is he lying / telling the truth?', '\\y(lie|lies|lied|lying)\\y|truth|honest|tell(ing)? me everything'],
    ['Can I trust him?', 'trust'],
    ['Is there someone else?', 'someone else|another (woman|man|girl|guy)|third party|other (woman|man)|seeing someone'],
    ['Will he hurt / betray me again?', '(hurt|betray|cheat|leave|do (it|this)).{0,18}again|again'],
    ['Should I stay after this?', 'should i (stay|leave|forgive|trust)|stay (with|after)|leave (him|her)|forgive'],
    ['Is he hiding a secret?', 'secret|hiding|\\yhide\\y|sneak'],
  ]},
  { bk: 'someone', sb: 'THEIR_FEELINGS', pats: [
    ['How does he really feel about me?', 'how (does|do) (he|she|they) (really )?feel|(his|her|their) (true )?feelings|feel about me|feelings (for|toward|about) me'],
    ['Does he love / like me?', 'love me|like me|does (he|she) (love|like)|into me'],
    ['Does he still have feelings?', 'still (have )?feel|still (love|care|want)'],
    ['Is he serious / interested?', 'serious|interested|\\yintentions?\\y'],
    ['Does he think about me?', 'think(ing)? (about|of) me|miss(es)? me|on (his|her) mind'],
    ['Is he the one / meant for me?', 'meant (to be|for)|the one|\\ysoul ?mate\\y|twin flame'],
    ['What is our future?', 'future|where (is|are) (this|we)|going|end up'],
  ]},
  { bk: 'someone', sb: 'REUNION', pats: [
    ['Will we get back together?', 'back together|get (him|her|us)? ?back|reconcile|reunite'],
    ['Will he come back / return?', 'come back|comes? back|coming back|\\yreturn'],
    ['Does he want me back?', 'want(s)? me back|miss(es)? me|regret'],
    ['Is there still a chance for us?', 'chance|hope (for|of)? ?(us|reconcil)|still possible|any (hope|chance)'],
    ['When will we reunite?', 'when (will|are|do|can)'],
    ['Should I wait for him?', 'wait for|hold on|hold out'],
    ['Does he still love me?', 'still (love|think|care|have feelings|want)'],
    ['Should I move on instead?', 'move on|let go|give up'],
  ]},
  { bk: 'someone', sb: 'TRUST_TRUTH', pats: [
    ['Is he telling the truth / honest?', 'truth|honest|\\y(lie|lies|lied|lying)\\y'],
    ['Can I trust him / his intentions?', 'trust|\\yintentions?\\y'],
    ['Is he playing me / is this a game?', '\\ygame\\y|playing|player|using me|play(ing)? (me|games)|toy'],
    ['Is he hiding something?', 'secret|hiding|\\yhide\\y|sneak'],
    ['Is he a scammer / real person?', 'scam|catfish|real (person|man|guy)|who he (says|claims)|fake|fraud'],
    ['Is there someone else?', 'someone else|another (woman|man)|cheat|other (woman|man)'],
    ['Is he genuine / serious about me?', 'genuine|serious|real(ly)? (love|care|want|like)|commit'],
  ]},
];

async function overview() {
  const t = (await q(`select count(*)::int n, to_char(min(created_at),'YYYY-MM-DD') mn, to_char(max(created_at),'YYYY-MM-DD') mx, sum(case when purchased then 1 else 0 end)::int b from conversations`))[0];
  console.log(`TOTAL ${t.n} conversations · ${t.mn}→${t.mx} · ${t.b} purchased (${(t.b/t.n*100).toFixed(1)}%)\n`);
  console.log('BY BUCKET (n / conv%):');
  for (const r of await q(`select coalesce(bucket,'(null)') k, count(*)::int n, sum(case when purchased then 1 else 0 end)::int b from conversations group by 1 order by 2 desc`))
    console.log(`  ${pad(r.n,7)}  ${pad((r.b/r.n*100).toFixed(1)+'%',7)}  ${r.k}`);
  console.log('\nLOVE sub-bucket (n / conv%):');
  for (const r of await q(`select coalesce(nullif(trim(sub_bucket),''),'(null)') k, count(*)::int n, sum(case when purchased then 1 else 0 end)::int b from conversations where bucket='love' group by 1 order by 2 desc limit 12`))
    console.log(`  ${pad(r.n,7)}  ${pad((r.b/r.n*100).toFixed(1)+'%',7)}  ${r.k}`);
}

async function deep() {
  for (const s of SEGMENTS) {
    const np = s.pats.length;
    const cols = s.pats.map((p,i)=>`count(*) filter (where concern ~* $${i+1}) n${i}, count(*) filter (where concern ~* $${i+1} and purchased) b${i}`).join(', ');
    const r = (await q(`select count(*) tot, count(*) filter (where purchased) totb, ${cols} from conversations where bucket=$${np+1} and sub_bucket=$${np+2} and concern is not null and length(trim(concern))>2`, [...s.pats.map(p=>p[1]), s.bk, s.sb]))[0];
    const tot=+r.tot, base=tot?(+r.totb/tot*100):0;
    const rows = s.pats.map((p,i)=>({q:p[0],n:+r['n'+i],b:+r['b'+i],cr:+r['n'+i]?(+r['b'+i]/+r['n'+i]*100):0})).sort((a,x)=>x.n-a.n);
    console.log(`\n## ${s.bk}/${s.sb} — ${tot} concerns · baseline ${base.toFixed(1)}%`);
    console.log('     n   conv%   lift   question');
    rows.forEach(x=>console.log(`  ${pad(x.n,5)}  ${pad(x.cr.toFixed(1)+'%',6)}  ${pad((base?x.cr/base:0).toFixed(2)+'x',5)}  ${x.q}${x.n<60?'  (thin)':''}`));
  }
}

async function momentum() {
  // Alt slice: is a bucket's demand-SHARE and conversion RISING over time? (catches emerging angles)
  const rows = await q(`
    select bucket||' / '||coalesce(nullif(trim(sub_bucket),''),'(null)') k,
      to_char(created_at,'YYYY-MM') ym, count(*)::int n, sum(case when purchased then 1 else 0 end)::int b
    from conversations
    where bucket in ('love','someone') and sub_bucket is not null and trim(sub_bucket) <> ''
    group by 1,2`);
  const months = [...new Set(rows.map(r => r.ym))].sort().filter(m => m >= '2026-02'); // drop Jan sliver
  const totMonth = {}; months.forEach(m => totMonth[m] = 0);
  const byB = {};
  for (const r of rows) { if (!months.includes(r.ym)) continue; totMonth[r.ym] += r.n; (byB[r.k] ||= {})[r.ym] = { n: r.n, b: r.b }; }
  const buckets = Object.entries(byB).map(([k, mm]) => ({ k, mm, tot: Object.values(mm).reduce((s, x) => s + x.n, 0) }))
    .filter(x => x.tot >= 400).sort((a, b) => b.tot - a.tot);
  const complete = months.slice(0, -1), partial = months[months.length - 1]; // current month is incomplete
  const early = complete.slice(0, 2), late = complete.slice(-2);
  const sum = (mm, ms) => ms.reduce((a, m) => ({ n: a.n + (mm[m]?.n || 0), b: a.b + (mm[m]?.b || 0) }), { n: 0, b: 0 });
  const totEarly = early.reduce((s, m) => s + totMonth[m], 0), totLate = late.reduce((s, m) => s + totMonth[m], 0);
  const L = (s) => String(s).padEnd(26), R = (s) => String(s).padStart(7);

  console.log('# Momentum — share of demand by month (%)  [' + months.join(' ') + ']\n');
  console.log(L('bucket') + months.map(m => R((m === partial ? '*' : '') + m.slice(5))).join(''));
  buckets.forEach(x => console.log(L(x.k) + months.map(m => R(((x.mm[m]?.n || 0) / (totMonth[m] || 1) * 100).toFixed(1))).join('')));

  console.log('\n# Conversion by month (%)\n');
  console.log(L('bucket') + months.map(m => R((m === partial ? '*' : '') + m.slice(5))).join(''));
  buckets.forEach(x => console.log(L(x.k) + months.map(m => { const c = x.mm[m]; return R(c && c.n ? (c.b / c.n * 100).toFixed(1) : '-'); }).join('')));

  console.log('\n# Momentum verdict (late 2mo vs early 2mo)\n');
  console.log(L('bucket') + R('Δshare') + '  ' + R('Δconv') + '   verdict');
  buckets.map(x => {
    const e = sum(x.mm, early), l = sum(x.mm, late);
    const dShare = (l.n / totLate - e.n / totEarly) * 100;
    const dConv = (l.n ? l.b / l.n * 100 : 0) - (e.n ? e.b / e.n * 100 : 0);
    return { k: x.k, dShare, dConv };
  }).sort((a, b) => (b.dShare + b.dConv) - (a.dShare + a.dConv)).forEach(s => {
    const v = (s.dShare > 0.5 && s.dConv > 0) ? '▲▲ rising (demand + conv)' : (s.dShare < -0.5 && s.dConv < 0) ? '▼ fading' :
      (s.dShare > 0.5) ? '▲ demand rising' : (s.dConv > 1) ? '▲ converting better' : '~ flat';
    console.log(L(s.k) + R((s.dShare >= 0 ? '+' : '') + s.dShare.toFixed(1) + 'pp') + '  ' + R((s.dConv >= 0 ? '+' : '') + s.dConv.toFixed(1) + 'pp') + '   ' + v);
  });
  console.log('\n* ' + partial + ' = current month — EXCLUDED from the verdict (incomplete: conversions are right-censored and sub_bucket classification lags, so it understates someone/* + conversion). Verdict computed on ' + early.join('+') + ' vs ' + late.join('+') + '.');
}

async function revenue() {
  // Alt slice: rank buckets by EXPECTED VALUE per visitor (ROAS lens) = total $ (main + upsells) / visitors.
  const rows = await q(`
    select bucket, coalesce(nullif(trim(sub_bucket),''),'(unclassified)') sb,
      count(*)::int n, count(*) filter (where purchased)::int buyers,
      sum( coalesce(main_purchase_amount,0)
         + case when upsell_purchased  then coalesce(upsell_amount,0)  else 0 end
         + case when upsell2_purchased then coalesce(upsell2_amount,0) else 0 end )::bigint cents
    from conversations
    where bucket in ('love','someone')
    group by 1,2 having count(*) >= 150
    order by sum( coalesce(main_purchase_amount,0)
         + case when upsell_purchased  then coalesce(upsell_amount,0)  else 0 end
         + case when upsell2_purchased then coalesce(upsell2_amount,0) else 0 end )::numeric / nullif(count(*),0) desc`);
  console.log('# Alt slice — expected value per visitor (ROAS lens: $ per click, not conversion count)\n');
  console.log(' EV/visit    AOV   conv%      n   bucket / sub-bucket');
  rows.forEach(r => {
    const ev = r.cents/r.n/100, aov = r.buyers ? r.cents/r.buyers/100 : 0, conv = r.buyers/r.n*100;
    console.log(`  $${pad(ev.toFixed(2),6)}  $${pad(aov.toFixed(0),4)}  ${pad(conv.toFixed(1)+'%',6)}  ${pad(r.n,6)}  ${r.bucket} / ${r.sb}`);
  });
}

async function buckets() {
  // Level 1: the data's OWN categories (LLM sub_bucket), ranked by frequency x conversion (= buyers).
  const rows = await q(`
    select bucket, coalesce(nullif(trim(sub_bucket),''),'(unclassified)') sb,
      count(*)::int n, sum(case when purchased then 1 else 0 end)::int b
    from conversations
    where bucket in ('love','someone')
    group by 1,2 having count(*) >= 150
    order by sum(case when purchased then 1 else 0 end) desc`);
  console.log('# Level 1 — buckets ranked by frequency x conversion (= buyers)\n');
  console.log(' buyers      n   conv%   bucket / sub-bucket');
  rows.forEach(r => console.log(`${pad(r.b,6)}  ${pad(r.n,6)}  ${pad((r.b/r.n*100).toFixed(1)+'%',6)}  ${r.bucket} / ${r.sb}`));
}

async function phrases() {
  // Level 2: recurring language that SURFACES from a bucket (data-driven n-grams, not pre-defined patterns).
  const bk = process.argv[3], sb = process.argv[4];
  if (!bk || !sb) { console.error('usage: phrases <bucket> <sub_bucket>'); process.exit(1); }
  const STOP = new Set('i a an the is are was were to of and or but if in on at for with that this be been am do does did so as my your it will would can could should have has had me you we they been there what when how about not no got going get really just feel feeling want need know like'.split(/\s+/));
  const rows = await q(`select concern, purchased from conversations where bucket=$1 and sub_bucket=$2 and concern is not null and length(trim(concern))>4`, [bk, sb]);
  const bi = new Map(), tri = new Map(), bibuy = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const r of rows) {
    const t = r.concern.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    for (let i = 0; i < t.length; i++) {
      if (i + 1 < t.length && !(STOP.has(t[i]) && STOP.has(t[i+1]))) {
        const k = t[i] + ' ' + t[i+1]; bump(bi, k); if (r.purchased) bump(bibuy, k);
      }
      if (i + 2 < t.length && !STOP.has(t[i]) && !STOP.has(t[i+2])) bump(tri, t[i] + ' ' + t[i+1] + ' ' + t[i+2]);
    }
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  console.log(`# Level 2 — recurring phrases surfacing in ${bk}/${sb}  (${rows.length} concerns)\n`);
  console.log('top 2-word phrases (count / of-which-bought):');
  top(bi, 22).forEach(([k, v]) => console.log(`  ${pad(v,5)}  ${pad((bibuy.get(k)||0)+'b',5)}  ${k}`));
  console.log('\ntop 3-word phrases:');
  top(tri, 16).forEach(([k, v]) => console.log(`  ${pad(v,5)}  ${k}`));
}

async function roadmap() {
  const all = [];
  for (const s of SEGMENTS) {
    const np = s.pats.length;
    const cols = s.pats.map((p,i)=>`count(*) filter (where concern ~* $${i+1}) n${i}, count(*) filter (where concern ~* $${i+1} and purchased) b${i}`).join(', ');
    const r = (await q(`select count(*) tot, count(*) filter (where purchased) totb, ${cols} from conversations where bucket=$${np+1} and sub_bucket=$${np+2} and concern is not null and length(trim(concern))>2`, [...s.pats.map(p=>p[1]), s.bk, s.sb]))[0];
    const base = +r.tot ? (+r.totb/+r.tot*100) : 0;
    s.pats.forEach((p,i)=>{ const n=+r['n'+i], b=+r['b'+i]; if (n>0) all.push({ seg:`${s.bk}/${s.sb}`, q:p[0], n, b, conv:b/n*100, lift:base?(b/n*100)/base:0 }); });
  }
  all.sort((a,b)=>b.b-a.b); // buyers = frequency x conversion
  console.log('# Headline-test roadmap — ranked by frequency x conversion (score = est. buyers = n x conv)\n');
  console.log('rank  buyers      n   conv%   lift   segment / question');
  all.forEach((x,i)=>console.log(`${pad(i+1,3)}  ${pad(x.b,6)}  ${pad(x.n,6)}  ${pad(x.conv.toFixed(1)+'%',6)}  ${pad(x.lift.toFixed(2)+'x',5)}  ${x.seg} — ${x.q}${x.n<60?'  (thin)':''}`));
}

async function voc() {
  const bk = process.argv[3], sb = process.argv[4], n = +(process.argv[5] || 20);
  if (!bk || !sb) { console.error('usage: voc <bucket> <sub_bucket> [n]'); process.exit(1); }
  console.log(`# ${n} sample concerns — ${bk}/${sb} (purchased)`);
  for (const r of await q(`select concern from conversations where bucket=$1 and sub_bucket=$2 and purchased=true and concern is not null and length(trim(concern))>8 order by random() limit $3`, [bk, sb, n]))
    console.log('• ' + clean(r.concern));
}

(async () => {
  try { await ({ overview, deep, roadmap, buckets, phrases, revenue, momentum, voc }[process.argv[2] || 'overview'])(); }
  catch (e) { console.error('ERR:', e.message); }
  finally { await pool.end(); }
})();
