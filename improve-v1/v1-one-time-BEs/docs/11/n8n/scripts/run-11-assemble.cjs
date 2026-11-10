// Run the code nodes of a built 11 assembly flow locally, with no n8n. Free.
//   node run-11-assemble.cjs <flow.json> --out <result.json> [--html <dir>]
//       runs T1 → 1 → 2 → 3 for the flow's test buyers; writes [{first, numbers, keys, words, sections}]
//   node run-11-assemble.cjs <flow.json> --fill <cases.json> --out <result.json>
//       runs only node 2 once per case (a case is node 1's output for one buyer); a HOLD becomes {hold}
const fs = require('fs');
const path = require('path');
const [flowPath, ...rest] = process.argv.slice(2);
const arg = (k) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : null);
const wf = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
const code = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.code');
const run = (fn, items) => fn({ first: () => items[0], all: () => items });

if (arg('--fill')) {
  const node2 = code.find((n) => n.name.startsWith('2 '));
  const fn = new Function('$input', node2.parameters.jsCode);
  const cases = JSON.parse(fs.readFileSync(arg('--fill'), 'utf8'));
  const out = cases.map((c) => {
    try { return { sections: run(fn, [{ json: c }])[0].json.sections }; }
    catch (e) { return { hold: e.message }; }
  });
  fs.writeFileSync(arg('--out'), JSON.stringify(out));
  console.log(`  node 2 ran ${cases.length} cases, ${out.filter((o) => o.hold).length} held`);
} else {
  let items = [];
  for (const n of code) {
    try { items = run(new Function('$input', n.parameters.jsCode), items); }
    catch (e) { console.log(`  ${n.name}: ${e.message}`); process.exit(1); }
    console.log(`  ok ${n.name} (${items.length} item${items.length === 1 ? '' : 's'})`);
  }
  const out = items.map(({ json: j }) => ({ first: j.first_name, numbers: j.numbers, keys: j.keys,
                                            words: j.words, sections: j.sections }));
  for (const o of out) console.log(`  ${o.first}: ${JSON.stringify(o.numbers)} ${JSON.stringify(o.keys)} ${o.words} words`);
  if (arg('--html')) for (const { json: j } of items)
    fs.writeFileSync(path.join(arg('--html'), `${j.first_name}.html`), j.html);
  fs.writeFileSync(arg('--out'), JSON.stringify(out));
}
