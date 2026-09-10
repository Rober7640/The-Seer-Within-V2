/**
 * Prove node 3 builds a complete, varied, replay-safe prose architecture before paid calls.
 *
 *   node scripts/check-02-architecture.mjs                 # 1000 order ids per arc
 *   node scripts/check-02-architecture.mjs --seeds 3000    # broader sweep
 *
 * This executes the built workflow's own node 3 through a local n8n shim. It has no API key,
 * network request, model call, upload, or production integration path.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workflowPath = path.join(ROOT, 'docs/02/02-fulfilment.n8n.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/02-houses.json'), 'utf8'));
const node3 = workflow.nodes.find((node) => node.name.startsWith('3 ·'));
if (!node3?.parameters?.jsCode) throw new Error('built workflow has no node 3 Code body');

const seedFlag = process.argv.indexOf('--seeds');
const N = seedFlag < 0 ? 1000 : Number(process.argv[seedFlag + 1]);
if (!Number.isInteger(N) || N < 1000) {
  throw new Error('--seeds must be an integer of at least 1000 per arc');
}

const executeNode3 = new Function('$input', '$', '$runIndex', '$json', node3.parameters.jsCode);
const runNode3 = (input) => {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  return executeNode3($input, () => ({}), 0, input).map((item) => item.json);
};
const session = (orderId, c) => ({ body: {
  type: 'checkout.session.completed',
  data: { object: {
    id: orderId,
    payment_status: 'paid',
    created: 1789162800,
    customer_details: { email: 'architecture-check@theseerwithin.com', name: 'Architecture Check' },
    metadata: {
      app: 'the-seer-within', product: 'be_twin_flame', offer: 'twin-flame',
      bump: '1', firstName: 'Architecture', c,
    },
  } },
} });

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const countBy = (values) => values.reduce((counts, value) => {
  const key = typeof value === 'string' ? value : canonical(value);
  counts.set(key, (counts.get(key) || 0) + 1);
  return counts;
}, new Map());
const orderFrom = (item) => {
  const excluded = new Set([
    'attempt', 'position', 'index', 'total', 'draw', 'architecture_plan',
    'target_words', 'position_words',
  ]);
  return Object.fromEntries(Object.entries(item).filter(([key]) => !excluded.has(key)));
};
const invariant = (condition, arc, orderId, message) => {
  if (!condition) throw new Error(`${arc} ${orderId}: ${message}`);
};
const exactCounts = (values, distinct, repetitions, arc, orderId, label) => {
  const counts = countBy(values);
  invariant(counts.size === distinct, arc, orderId,
    `${label} has ${counts.size} distinct values; expected ${distinct}`);
  for (const [value, count] of counts) {
    invariant(count === repetitions, arc, orderId,
      `${label} allocation ${value} occurs ${count} times; expected ${repetitions}`);
  }
};
const inBlock = (houses, start, end) => houses.filter((house) => house >= start && house <= end).length;

function checkLedger(ledger, owes, arc, orderId, house) {
  invariant(ledger && typeof ledger === 'object', arc, orderId,
    `house ${house} has no claim ledger`);
  invariant(Array.isArray(ledger.permitted_sources) && ledger.permitted_sources.length >= 4,
    arc, orderId, `house ${house} has no permitted source classes`);
  invariant(typeof ledger.forecast_scope === 'string' && ledger.forecast_scope.length > 20,
    arc, orderId, `house ${house} has no forecast scope`);
  invariant(Array.isArray(ledger.unsupported_private_fields)
    && ledger.unsupported_private_fields.length >= 8,
  arc, orderId, `house ${house} has an incomplete unsupported-private-fields ledger`);
  for (const field of ['illustration_rule', 'history_rule', 'action_scope']) {
    invariant(typeof ledger[field] === 'string' && ledger[field].length > 20,
      arc, orderId, `house ${house} has no ${field}`);
  }
  invariant(owes ? typeof ledger.obligation === 'string' : ledger.obligation === null,
    arc, orderId, `house ${house} ledger obligation disagrees with promise status`);
}

function validate(items, arc, orderId) {
  invariant(items.length === 12, arc, orderId, `node 3 returned ${items.length} items`);
  invariant(items.every((item) => item.arc === arc), arc, orderId, 'arc routing changed');
  const plan = items[0].architecture_plan;
  invariant(Array.isArray(plan) && plan.length === 12, arc, orderId,
    `architecture plan has ${Array.isArray(plan) ? plan.length : 'no'} rows`);
  invariant(items.every((item) => canonical(item.architecture_plan) === canonical(plan)),
    arc, orderId, 'items do not carry the same architecture plan');

  const houses = plan.map((row) => Number(row.house));
  invariant(new Set(houses).size === 12 && houses.every((house) => house >= 1 && house <= 12),
    arc, orderId, 'architecture houses are not exactly 1..12');

  const architectures = plan.map((row) => row.architecture);
  invariant(architectures.every((value) => value && typeof value === 'object'),
    arc, orderId, 'an architecture row is missing its allocation');
  const tupleHouses = new Map();
  architectures.forEach((architecture, index) => {
    const tuple = canonical(architecture);
    if (!tupleHouses.has(tuple)) tupleHouses.set(tuple, []);
    tupleHouses.get(tuple).push(plan[index].house);
  });
  const repeatedTuples = [...tupleHouses.values()].filter((housesWithTuple) => housesWithTuple.length > 1);
  invariant(repeatedTuples.length === 0, arc, orderId,
    `full architecture tuple repeats in houses ${repeatedTuples.map((h) => h.join('/')).join(', ')}`);

  exactCounts(architectures.map((a) => a.entry), 6, 2, arc, orderId, 'entry');
  exactCounts(architectures.map((a) => a.ending), 6, 2, arc, orderId, 'ending');
  exactCounts(architectures.map((a) => a.customer_entry), 3, 4, arc, orderId,
    'customer-entry position');

  for (const row of plan) {
    const item = items[row.house - 1];
    invariant(item?.position?.house === row.house, arc, orderId,
      `house ${row.house} is not in its stable position`);
    checkLedger(row.claim_ledger, item.position.owes, arc, orderId, row.house);
  }

  const address = plan.filter((row) => row.architecture.may_use_address).map((row) => row.house);
  invariant(address.length === 3, arc, orderId,
    `address is permitted in ${address.length} rooms; expected 3`);
  for (const [start, end] of [[1, 4], [5, 8], [9, 12]]) {
    invariant(inBlock(address, start, end) === 1, arc, orderId,
      `address allocation is not one room in houses ${start}-${end}`);
  }

  const waite = plan.filter((row) => row.architecture.may_name_waite).map((row) => row.house);
  invariant(waite.length === 4, arc, orderId,
    `Waite naming is permitted in ${waite.length} rooms; expected 4`);
  for (const [start, end] of [[1, 3], [4, 6], [7, 9], [10, 12]]) {
    invariant(inBlock(waite, start, end) === 1, arc, orderId,
      `Waite-name allocation is not one room in houses ${start}-${end}`);
  }

  const optionalCross = plan.filter((row) => !row.claim_ledger.obligation
    && row.architecture.cross_room === 'permitted only if it changes the interpretation');
  invariant(optionalCross.length === 2, arc, orderId,
    `optional non-promise cross-room allocation is ${optionalCross.length}; expected 2`);

  const emphasized = plan.filter((row) => row.architecture.emphasis_position !== 'none');
  invariant(emphasized.length === 8, arc, orderId,
    `takeaway emphasis is allocated to ${emphasized.length} rooms; expected 8`);
  invariant(emphasized.every((row) => !row.claim_ledger.obligation), arc, orderId,
    'a promise room received takeaway emphasis');
  const emphasisCounts = countBy(emphasized.map((row) => row.architecture.emphasis_position));
  invariant(emphasisCounts.get('early') === 3 && emphasisCounts.get('middle') === 3
    && emphasisCounts.get('late') === 2, arc, orderId,
  `takeaway placement is not early=3, middle=3, late=2: ${canonical(Object.fromEntries(emphasisCounts))}`);

  const targets = architectures.map((a) => a.target_words);
  for (const row of plan) {
    const budget = spec.word_budget.extended.houses.includes(row.house) ? spec.word_budget.extended
      : row.claim_ledger.obligation ? spec.word_budget.promise : spec.word_budget.ordinary;
    const a = row.architecture;
    invariant(a.min_words === budget.min && a.max_words === budget.max
      && Number.isInteger(a.target_words) && a.target_words >= budget.min && a.target_words <= budget.max,
      arc, orderId, `house ${row.house} budget disagrees with spec`);
  }
  const targetTotal = targets.reduce((sum, target) => sum + target, 0);
  invariant(targetTotal === 5860, arc, orderId,
    `balanced house target total ${targetTotal} differs from approved 5860 words`);

  for (const row of plan) {
    const item = items[row.house - 1];
    invariant(item.position.house === row.house, arc, orderId,
      `house ${row.house} is not in its stable position`);
    invariant(canonical(item.position.architecture) === canonical(row.architecture), arc, orderId,
      `house ${row.house} item and plan architecture differ`);
    invariant(canonical(item.position.claim_ledger) === canonical(row.claim_ledger), arc, orderId,
      `house ${row.house} item and plan claim ledger differ`);
  }
  return plan;
}

for (const [arc, c] of [['v1', '3'], ['v2', '23']]) {
  let minTargetTotal = Infinity;
  let maxTargetTotal = -Infinity;
  for (let n = 0; n < N; n++) {
    const orderId = `cs_architecture_${arc}_${String(n).padStart(4, '0')}`;
    const first = runNode3(session(orderId, c));
    const plan = validate(first, arc, orderId);
    const total = plan.reduce((sum, row) => sum + row.architecture.target_words, 0);
    minTargetTotal = Math.min(minTargetTotal, total);
    maxTargetTotal = Math.max(maxTargetTotal, total);

    const fresh = runNode3(session(orderId, c));
    invariant(canonical(fresh[0].architecture_plan) === canonical(plan), arc, orderId,
      'a fresh run of the same explicit order id changed the architecture');
    invariant(canonical(fresh[0].draw) === canonical(first[0].draw), arc, orderId,
      'a fresh run of the same explicit order id changed the draw');

    const replay = runNode3({
      order: orderFrom(first[0]), draw: first[0].draw, attempt: first[0].attempt,
    });
    invariant(canonical(replay[0].architecture_plan) === canonical(plan), arc, orderId,
      'the replay branch changed the architecture');
    invariant(canonical(replay[0].draw) === canonical(first[0].draw), arc, orderId,
      'the replay branch changed the draw');
  }
  console.log(`  ✅ ${arc}: ${N} explicit order ids · deterministic fresh + replay · `
    + `target totals ${minTargetTotal}-${maxTargetTotal}`);
}

console.log(`\n  ✅ architecture holds across ${N * 2} explicit orders; no paid calls\n`);
