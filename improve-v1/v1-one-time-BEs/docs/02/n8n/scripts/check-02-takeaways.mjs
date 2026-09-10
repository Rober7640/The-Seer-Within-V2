/** Execute the built house parser against the production failure and claim controls. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const wf = JSON.parse(fs.readFileSync(new URL('../docs/02/02-fulfilment.n8n.json', import.meta.url)));
const parse = new Function('$input', '$', wf.nodes.find(n => n.name.startsWith('4c ·')).parameters.jsCode);
const brief = {position: {house: 6, architecture: {emphasis_position: 'middle'}}};
function run(takeaway) {
  return parse({first: () => ({json: {stop_reason: 'end_turn', content: [{type: 'text',
    text: `KEYNOTE: a card of proportion\n\nOrdinary test prose.\n\nTAKEAWAY: ${takeaway}`} ]}})},
    () => ({first: () => ({json: brief})}))[0].json;
}
const reflection = 'Judge the week by its mixture and residue, not its felt intensity.';
assert.equal(run(reflection).takeaway, reflection.slice(0, -1));
for (const forbidden of [
  'Next week brings the recognition that resolves this uncertainty for you.',
  'Within a month the pattern settles into a clear and lasting answer.',
  'The answer arrives by the end of the week ahead.',
  'After five days the person returns with the answer you need.',
  'Tomorrow brings a clear answer to the question in this room.',
  'Your windfall restores the freedom to choose the life you want.',
  'He will return and make his intentions entirely clear to you.',
]) assert.throws(() => run(forbidden), /prohibited claim/);
assert.throws(() => run('A short line.'), /expected 8-15/);
console.log('PASS: production weekly-reflection regression, seven claim/date controls, length guard');
