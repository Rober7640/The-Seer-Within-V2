const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const workflow=JSON.parse(fs.readFileSync(path.join(__dirname,'08-marcus-fulfillment.n8n.json'),'utf8'));
const byName=name=>workflow.nodes.find(node=>node.name===name);
const next=name=>(workflow.connections[name]?.main?.[0]||[]).map(item=>item.node);

test('fulfillment draft fails closed unless all three numerology anchors are pinned',()=>{
 assert.equal(workflow.nodes.length,48);
 assert.match(workflow.name,/Numerology-Anchored/);
 const gate=byName('Require numerology anchors');
 assert.ok(gate,'explicit numerology gate is required');
 for(const term of ['lifePath','expression','personality','selectedCanon','contentHash','personalCard'])assert.match(gate.parameters.jsCode,new RegExp(term));
 assert.deepEqual(next('Build canon-backed numerology brief'),['Require numerology anchors']);
 assert.deepEqual(next('Require numerology anchors'),['Write paid positions and connections']);
});

test('fulfillment draft uses the proven Turbo schema and remains disabled',()=>{
 const guard=byName('Configuration and guard').parameters.jsCode;
 assert.match(guard,/enabled: false/);
 assert.match(guard,/resemble-ai\/chatterbox-turbo/);
 const validation=byName('Validate Chatterbox request').parameters.jsCode;
 assert.match(validation,/text:/);
 assert.match(validation,/reference_audio:/);
 assert.doesNotMatch(validation,/audio_prompt|exaggeration|cfg_weight/);
 assert.equal(byName('Chatterbox create prediction').parameters.url,'https://api.replicate.com/v1/models/resemble-ai/chatterbox-turbo/predictions');
});
