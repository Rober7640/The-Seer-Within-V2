const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '08-marcus-numerology-stage1.n8n.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const codeFor = (name) => workflow.nodes.find((node) => node.name === name)?.parameters?.jsCode;

test('every generated Code node contains valid JavaScript', () => {
  for (const node of workflow.nodes.filter((item) => item.type === 'n8n-nodes-base.code')) {
    assert.doesNotThrow(() => new Function('$input', '$', '$json', node.parameters.jsCode), node.name);
  }
});

function runCode(name, input, context = {}) {
  const js = codeFor(name);
  assert.ok(js, `Missing Code node: ${name}`);
  const inputApi = { first: () => ({ json: input }) };
  const nodeApi = (nodeName) => ({ first: () => ({ json: context[nodeName] }) });
  return new Function('$input', '$', '$json', js)(inputApi, nodeApi, input)[0].json;
}

function openAiResponse(value) {
  return { choices: [{ message: { content: JSON.stringify(value) }, finish_reason: 'stop' }] };
}

const testInput = {
  question: 'What is my higher calling?',
  spreadType: 'six_questions',
  displayFirstName: 'Yan Wei',
  fullBirthName: 'Chue Yan Wei',
  dateOfBirth: '1985-04-13',
  editionId: 'marcus-08-higher-calling-2026-09-09',
  heroImageUrl: 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/08-hero-what-is-my-higher-calling.jpg',
  positionsJson: JSON.stringify([
    { number: 1, label: 'what you keep coming back to', cardName: 'The Star', emailMeaning: 'The Star shows one foot in water and one knee on land. The interest keeps returning without becoming fully lived.' },
    { number: 2, label: 'what you have been calling it instead', cardName: 'Seven of Pentacles', emailMeaning: 'The figure pauses over what has grown. Waiting has been described as patience, but that is not the complete explanation.' },
    { number: 3, label: 'what this has already cost you' },
    { number: 4, label: 'what you would have to put down' },
    { number: 5, label: 'who you would have to stop being' },
    { number: 6, label: 'where it starts' },
  ]),
};

function buildThroughSelection() {
  const prepared = runCode('3 · Validate, calculate, and draw', testInput);
  const selected = runCode('CANON · Select three approved readings', prepared);
  const synthesisRequest = runCode('SYNTHESIS · Build cited request', selected);
  return { prepared, selected, synthesisRequest };
}

function validSynthesis() {
  return {
    claims: [
      {
        claimId: 'C1',
        claim: 'A durable contribution may matter more than a dramatic change, while maintaining other people’s structures may consume the capacity needed to build something personally directed.',
        support: ['LP4.DIRECTION', 'EX6.PRESSURE', 'PE1.STYLE'],
        confidence: 'pair-inference',
        questionRelevance: 'central',
        disconfirmation: 'This weakens if responsibilities are already limited and shared and protected capacity for self-directed work already exists.',
      },
      {
        claimId: 'C2',
        claim: 'A promising contribution may turn an intention into a dependable process that makes a shared service, environment, or standard work better for people.',
        support: ['LP4.CONTRIBUTION', 'EX6.CONTRIBUTION'],
        confidence: 'reinforced',
        questionRelevance: 'central',
        disconfirmation: 'This is a poor fit if the actual question and evidence point toward a private pursuit with no implementation or service component.',
      },
      {
        claimId: 'C3',
        claim: 'One obstacle worth testing is whether competence has become a reason to accept too much ownership and leave too little capacity for a self-created path.',
        support: ['LP4.PRESSURE', 'EX6.PRESSURE', 'PE1.PROTECTION'],
        confidence: 'pair-inference',
        questionRelevance: 'central',
        disconfirmation: 'Discard this if work is delegated, help is used comfortably, and the binding limits come from resources or authority outside the person’s control.',
      },
    ],
    answerDirection: 'The combination can help distinguish a calling built through dependable, useful construction from continued responsibility for structures whose purpose and ownership belong mainly to other people.',
    answerLimits: 'It cannot name an occupation, prove a private history, guarantee an outcome, or establish that any current commitment should be abandoned.',
    forbiddenInferences: ['Do not assign an occupation from these numbers.', 'Do not treat outward decisiveness as proof of inner certainty.'],
  };
}

test('4/6/1 selects the exact fixed canon and excludes birth data from the model request', () => {
  const { prepared, selected, synthesisRequest } = buildThroughSelection();
  assert.deepEqual(
    [prepared.numerology.lifePathNumber, prepared.numerology.expressionNumber, prepared.numerology.personalityNumber],
    [4, 6, 1],
  );
  assert.deepEqual(selected.canon.keys, ['LP4', 'EX6', 'PE1']);
  assert.equal(selected.publicLifePathProfile.number, 4);
  assert.equal(selected.publicLifePathProfile.archetype, 'The Builder');
  assert.deepEqual(selected.publicLifePathProfile.strengths, ['Hardworking', 'Practical', 'Organized', 'Loyal and dependable']);
  assert.deepEqual(selected.publicLifePathProfile.challenges, ['Rigidity', 'Overworking', 'Control, perfectionism, or difficulty delegating']);
  assert.equal(selected.canon.passageIds.length, 24);
  assert.deepEqual(selected.canon.entries.map((entry) => entry.wordCount), [591, 601, 531]);
  const sent = JSON.stringify(synthesisRequest.synthesisBody);
  assert.equal(sent.includes(testInput.fullBirthName), false);
  assert.equal(sent.includes(testInput.dateOfBirth), false);
});

test('unsupported preserved number 33 fails before an OpenAI request', () => {
  const { prepared } = buildThroughSelection();
  assert.throws(
    () => runCode('CANON · Select three approved readings', {
      ...prepared,
      numerology: { ...prepared.numerology, expressionNumber: 33 },
    }),
    /unsupported/,
  );
});

test('citation validation rejects evidence outside the selected canon pack', () => {
  const { synthesisRequest } = buildThroughSelection();
  const invalid = validSynthesis();
  invalid.claims[0].support = ['LP7.DIRECTION'];
  assert.throws(
    () => runCode('SYNTHESIS · Validate citations', openAiResponse(invalid), {
      'SYNTHESIS · Build cited request': synthesisRequest,
    }),
    /unavailable canon passage/,
  );
});

test('citation validation derives confidence instead of failing on a model label', () => {
  const { synthesisRequest } = buildThroughSelection();
  const synthesis = validSynthesis();
  synthesis.claims[0].confidence = 'direct';
  const validated = runCode('SYNTHESIS · Validate citations', openAiResponse(synthesis), {
    'SYNTHESIS · Build cited request': synthesisRequest,
  });
  assert.equal(validated.synthesis.claims[0].confidence, 'pair-inference');
});

test('accepted synthesis reaches the tarot planner and writer without canon machinery', () => {
  const { synthesisRequest } = buildThroughSelection();
  const synthesis = validSynthesis();
  const validated = runCode('SYNTHESIS · Validate citations', openAiResponse(synthesis), {
    'SYNTHESIS · Build cited request': synthesisRequest,
  });
  const gradeRequest = runCode('SYNTHESIS · Build evidence grade', validated);
  const grade = {
    passed: true,
    scores: { citationAccuracy: 9, questionSpecificity: 9, roleDiscipline: 9, falsifiability: 9, restraint: 9 },
    unsupportedClaimIds: [], misusedRoles: [], genericClaims: [], inventedInferences: [],
    reason: 'Every proposed claim is carried by its cited role-specific passages and remains testable.',
  };
  const accepted = runCode('SYNTHESIS · Enforce evidence grade', openAiResponse(grade), {
    'SYNTHESIS · Build evidence grade': gradeRequest,
  });
  const planRequest = runCode('4 · Build private planning request', accepted);
  const planBody = JSON.stringify(planRequest.openAiBody);
  assert.equal(planBody.includes(testInput.fullBirthName), false);
  assert.equal(planBody.includes(testInput.dateOfBirth), false);

  const plan = {
    privateProfile: {
      centralConflict: synthesis.claims[0].claim,
      answerDirection: synthesis.answerDirection,
      answerLimits: synthesis.answerLimits,
      questionConnection: 'The question asks which responsibility belongs to a personally directed contribution and which merely preserves an inherited arrangement.',
    },
    cardPlans: planRequest.positions.map((position, index) => {
      const claim = synthesis.claims[index % synthesis.claims.length];
      return {
        cardFact: `A concrete Rider-Waite image fact for ${position.cardName} that is long enough for the production schema.`,
        positionJob: `Use ${position.label} to advance a distinct part of the exact higher-calling question without repeating another position.`,
        synthesisClaimId: claim.claimId,
        canonSupport: claim.support,
        selectedCardMeaning: `A defensible interpretation of ${position.cardName} selected for this position and constrained by the approved private claim.`,
        questionSpecificClaim: `A precise claim about the distinction this position adds to the higher-calling question, presented as something the buyer can test.`,
        testablePrompt: 'A question with a possible no answer that lets the buyer compare the interpretation with an observable part of life.',
        crossCardLink: 'An explicit connection to another named spread card that changes the meaning rather than merely listing both cards.',
        practicalDecision: 'A bounded and proportionate decision that can provide information without assuming a career, event, or guaranteed result.',
        mustNotRepeat: 'The action and distinction assigned to the previous position.',
      };
    }),
    directAnswer: synthesis.answerDirection.repeat(2),
    ruledOutDirection: 'Continuing to maintain a structure mainly because prior effort has already been invested is a poor fit when its purpose no longer holds.',
    candidateForms: ['A bounded project that converts a useful intention into a dependable process with clear ownership.'],
  };
  const validatedPlan = runCode('6 · Validate and bind the plan', openAiResponse(plan), {
    '4 · Build private planning request': planRequest,
  });
  const writerRequest = runCode('7 · Build report request', validatedPlan);
  assert.equal(writerRequest.openAiBody.max_completion_tokens, 7000);
  const extraPositions = Array.from({ length: 4 }, (_, index) => ({
    ...validatedPlan.positions[index],
    number: index + 7,
    label: `additional position ${index + 7}`,
  }));
  const extraPlans = Array.from({ length: 4 }, (_, index) => ({
    ...validatedPlan.plan.cardPlans[index],
    positionNumber: index + 7,
    positionLabel: `additional position ${index + 7}`,
  }));
  const tenCardRequest = runCode('7 · Build report request', {
    ...validatedPlan,
    positions: [...validatedPlan.positions, ...extraPositions],
    plan: { ...validatedPlan.plan, cardPlans: [...validatedPlan.plan.cardPlans, ...extraPlans] },
  });
  assert.equal(tenCardRequest.openAiBody.max_completion_tokens, 14000);
  const customerFacingInput = writerRequest.openAiBody.messages[1].content;
  assert.equal(customerFacingInput.includes(testInput.fullBirthName), false);
  assert.equal(customerFacingInput.includes(testInput.dateOfBirth), false);
  assert.equal(/\b(?:LP|EX|PE)(?:[1-9]|11|22)\.[A-Z]+\b/.test(customerFacingInput), false);
  assert.equal(customerFacingInput.includes('pair-inference'), false);
  assert.equal(customerFacingInput.includes('"emailMeaning"'), false);
  assert.equal(customerFacingInput.includes('priorCardMeaningToDevelop'), true);
  assert.equal(customerFacingInput.includes('"archetype": "The Builder"'), true);
});

test('customer QA routes one failure to rewrite and a second failure to an explicit no-PDF hold', () => {
  const grade = {
    scores: {
      spreadNotList: 5, claimsCarried: 5, picturesAccurate: 5, reversalsReal: 0,
      falsifiableClaims: 4, inventedSpecifics: 5, timing: 5, dignity: 5,
      structureAndFinish: 5, wouldSign: 5,
    },
    counts: { soundClaims: 20, thinClaims: 2, inventedClaims: 0, falsifiableClaims: 4, inventedSpecifics: 0, datedClaims: 0 },
    reversalsApplicable: false,
    bestPassage: 'A sufficiently specific best passage from the completed report.',
    bestReason: 'This passage is supported by the cards and advances the question-specific argument.',
    worstPassage: 'The saved message says you have done this for years.',
    worstReason: 'This exposes an internal process label and states an unsupported biography as fact.',
    feelsReadOrProcessed: 'The reading mostly feels specific, but this unsupported statement interrupts that effect.',
    buyerReturns: 'The buyer may return after the unsupported claim and internal label are removed.',
    unsupportedClaims: ['The saved message says you have done this for years.'],
    rewriteInstructions: ['Lead with the card and turn the statement into a testable possibility.'],
  };
  const base = {
    testRunId: 'qa-route-test', editionId: 'edition-test', question: 'What is my higher calling?',
    displayFirstName: 'Test', canon: { version: 'marcus-numerology-canon-v1', keys: ['LP4', 'EX6', 'PE1'] },
    positions: [{ number: 1, cardName: 'The Star' }], grade: { passed: true },
  };
  const first = runCode('22 · Enforce customer-view grade', openAiResponse(grade), {
    '20 · Build customer-view grade': { ...base, gradeAttempt: 1 },
  });
  assert.equal(first.customerApproved, false);
  assert.equal(first.customerRoute, 'rewrite');

  const second = runCode('22 · Enforce customer-view grade', openAiResponse(grade), {
    '20 · Build customer-view grade': { ...base, gradeAttempt: 2 },
  });
  assert.equal(second.customerApproved, false);
  assert.equal(second.customerRoute, 'review');
  const hold = runCode('QA HOLD · NO PDF', second);
  assert.equal(hold.status, 'QA_REVIEW_REQUIRED');
  assert.equal(hold.pdfCreated, false);
  assert.match(hold.nextStep, /No PDF was rendered/);
});
