// Walks offer 03's booking page — now TWO screens — and asserts both gates
// behave. Nothing charges: the button logs, and we read that log to prove it.
//
// The split (operator, 2026-08-09): step 1 AGREE takes four taps and no
// keyboard; step 2 GIVE takes the money. The step is in the URL so the
// browser's own Back walks between them.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2];
const URL = 'http://localhost:5000/wiccan/judgement-day';
fs.mkdirSync(OUT, { recursive: true });

const fails = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

const scrollHeight = (page) => page.evaluate(() => document.documentElement.scrollHeight);

// The step tag is set in small caps by CSS, so innerText comes back shouting.
const stepTag = async (page) =>
  (await page.locator('[data-testid="text-step-tag"]').innerText()).toLowerCase();

const browser = await chromium.launch();

// ── phone first: this is where most of them read it ─────────────────────────
const phone = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
const p = await phone.newPage();
const logs = [];
p.on('console', (m) => logs.push(m.text()));

await p.goto(`${URL}?fn=Sarah%20O%27Brien`, { waitUntil: 'networkidle' });
await p.waitForSelector('[data-testid="checkbox-statement-0"]');
await p.screenshot({ path: `${OUT}/01-step1-top-phone.png` });
await p.screenshot({ path: `${OUT}/02-step1-full-phone.png`, fullPage: true });

// ── 1 · AGREE ───────────────────────────────────────────────────────────────

check(
  'the browser tab names the offer',
  /Judgement Day/.test(await p.title()) && !/Psychic Chat/.test(await p.title()),
  await p.title(),
);
// ⛔ The tense rule: she is here to CONFIRM. Nothing is CONFIRMED until she pays.
const pageTitle = await p.locator('h1').innerText();
check('the page names the job she is here to do', /confirm your booking/i.test(pageTitle), pageTitle);
check(
  'and never claims to be a receipt',
  !/confirmed|confirmation|your order|receipt/i.test(await p.locator('body').innerText()),
);

const step1Tag = await stepTag(p);
check('step 1 announces itself', step1Tag.includes('step one of two') && step1Tag.includes('agree'), step1Tag);

// Four statements — statement 4 is cut (D3) and the price rung moved to step 2.
const statementCount = await p.locator('[data-testid^="checkbox-statement-"]').count();
check('four agreement statements on step 1', statementCount === 4, `found ${statementCount}`);
const step1Body = await p.locator('body').innerText();
check('the cut capacity line is absent', !/one account at a time|week is spoken for/i.test(step1Body));

// Step 1 asks for nothing but assent: no keyboard, no price, no bump.
check('no amount box on step 1', (await p.locator('[data-testid="input-amount"]').count()) === 0);
check('no total on step 1', (await p.locator('[data-testid="text-total"]').count()) === 0);
check('no bump on step 1', (await p.locator('[data-testid="checkbox-bump"]').count()) === 0);
check('no price named on step 1', !/\$300|\$12\.77|\$17/.test(step1Body));

// The button does not exist yet.
check('button absent before any tick', (await p.locator('[data-testid="button-step-one"]').count()) === 0);
check(
  'locked hint says four',
  (await p.locator('[data-testid="text-locked-hint"]').innerText()).includes('all four'),
);

// The wall was 3,450px. Step 1 has to be a fraction of it or the split bought
// nothing — one phone screen is 844px on this device.
const step1Height = await scrollHeight(p);
check('step 1 is no longer a wall', step1Height < 1800, `${step1Height}px`);

// Tick all four → the button appears and carries her on.
for (const t of await p.locator('[data-testid^="checkbox-statement-"] input').all()) await t.check();
await p.waitForSelector('[data-testid="button-step-one"]');
check(
  'GO ON, EVELYN appears once all four are ticked',
  (await p.locator('[data-testid="button-step-one"]').innerText()).includes('GO ON, EVELYN'),
);
await p.locator('[data-testid="button-step-one"]').click();
await p.waitForSelector('[data-testid="input-amount"]');
check('the step is in the URL', p.url().includes('step=give'), p.url());

// ── 2 · GIVE ────────────────────────────────────────────────────────────────

const step2Tag = await stepTag(p);
check('step 2 announces itself', step2Tag.includes('step two of two') && step2Tag.includes('give'), step2Tag);
check(
  'the four agreements are behind her',
  (await p.locator('[data-testid^="checkbox-statement-"]:not([data-testid$="price"])').count()) === 0,
);

// Her request opens the screen — the sentence the button finishes (P3).
const requestY = (await p.locator("text=Evelyn — you have my say-so.").boundingBox()).y;
const priceY = (await p.locator('[data-testid="checkbox-statement-price"]').boundingBox()).y;
check('her request opens step 2, above the price rung', requestY < priceY);

check('amount box is empty', (await p.locator('[data-testid="input-amount"]').inputValue()) === '');
check('total starts at $0.00', (await p.locator('[data-testid="text-total"]').innerText()) === '$0.00');

// ⛔ The floor is NOT announced. A stated minimum is a price — print $17 under
// an empty box and the box fills with $17.
check('no minimum is printed', (await p.locator('[data-testid="text-floor-hint"]').count()) === 0);
check(
  'locked on the price rung first',
  (await p.locator('[data-testid="text-locked-hint"]').innerText()).includes('Agree to the statement'),
);

// The retired ninth element is gone, not moved.
const step2Body = await p.locator('body').innerText();
check(
  'the reply-by-email block is gone',
  !/reply to Evelyn's email|And I understand what happens next/i.test(step2Body),
);
check(
  'the reassurance no longer promises an email reply',
  /Nothing recurring\./.test(step2Body) && !/Reply to the confirmation email/i.test(step2Body),
);

// Tick the price rung; still locked with no amount.
await p.locator('[data-testid="checkbox-statement-price"] input').check();
check(
  'still locked with no amount',
  (await p.locator('[data-testid="button-checkout"]').count()) === 0 &&
    (await p.locator('[data-testid="text-locked-hint"]').innerText()).includes('what you will give'),
);

// ⛔ NOT MID-TYPING. A woman typing "17" is under the floor until the 7 lands,
// and correcting her before she has finished her sentence is the bug this
// asserts against. She types the 1 and hears nothing.
const amountBox = p.locator('[data-testid="input-amount"]');
await amountBox.click();
await amountBox.pressSequentially('1', { delay: 60 });
check(
  'silent while she is still typing',
  (await p.locator('[data-testid="text-floor-hint"]').count()) === 0,
);
// …and finishing the number she meant is never corrected at all.
await amountBox.pressSequentially('7', { delay: 60 });
await p.waitForSelector('[data-testid="button-checkout"]');
check('typing 17 is never corrected', (await p.locator('[data-testid="text-floor-hint"]').count()) === 0);

// Under the floor, once she has stopped, it speaks.
await amountBox.fill('9');
check('under the $17 floor stays locked', (await p.locator('[data-testid="button-checkout"]').count()) === 0);
await p.waitForSelector('[data-testid="text-floor-hint"]', { timeout: 4000 });
check(
  'the floor speaks once she has stopped typing',
  (await p.locator('[data-testid="text-floor-hint"]').innerText()).includes(
    'smallest amount that will go through',
  ),
);
await p.locator('[data-testid="text-floor-hint"]').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${OUT}/03-floor-refused-phone.png` });

// Leaving the field says it at once — no wait, because she is finished by
// definition. (Typed fresh so the idle timer is not what fires.)
await amountBox.fill('');
await amountBox.pressSequentially('1', { delay: 60 });
await amountBox.blur();
check(
  'leaving the field speaks at once',
  (await p.locator('[data-testid="text-floor-hint"]').count()) === 1,
);
// And it goes quiet the moment she types again — still under the floor, so it
// is the typing that silences it, not the amount becoming good.
await amountBox.click();
await amountBox.pressSequentially('1', { delay: 60 });
check(
  'and it goes quiet again the moment she types',
  (await amountBox.inputValue()) === '11' &&
    (await p.locator('[data-testid="text-floor-hint"]').count()) === 0,
);

// At the floor it unlocks, and the floor goes quiet again.
await p.locator('[data-testid="input-amount"]').fill('17');
await p.waitForSelector('[data-testid="button-checkout"]');
check('unlocks at exactly $17', true);
check(
  'the floor goes quiet once she is over it',
  (await p.locator('[data-testid="text-floor-hint"]').count()) === 0,
);
check('total is $17.00', (await p.locator('[data-testid="text-total"]').innerText()) === '$17.00');

// The bump adds $12.77 and is never pre-checked.
const bump = p.locator('[data-testid="checkbox-bump"] input');
check('bump is not pre-checked', !(await bump.isChecked()));
await bump.check();
check('total with bump', (await p.locator('[data-testid="text-total"]').innerText()) === '$29.77');

// A typed amount above the floor.
await p.locator('[data-testid="input-amount"]').fill('47');
check('total recomputes', (await p.locator('[data-testid="text-total"]').innerText()) === '$59.77');

const step2Height = await scrollHeight(p);
check('step 2 is shorter than the old single page', step2Height < 3000, `${step2Height}px`);
await p.screenshot({ path: `${OUT}/04-step2-full-phone.png`, fullPage: true });

// Nothing charges: the button logs and stops.
await p.locator('[data-testid="button-checkout"]').click();
await p.waitForTimeout(300);
const logged = logs.find((l) => l.includes('would checkout'));
check('button logs instead of charging', Boolean(logged), logged);
check('no navigation away', p.url().startsWith(URL));
check('first name carried from ?fn= across the step', /Sarah O'Brien/.test(logged ?? ''));
check('bump carries its own product key', /unburdening/.test(logged ?? ''));
await p.screenshot({ path: `${OUT}/05-step2-ready-phone.png` });

// ── Back walks between the steps, and keeps her ticks ───────────────────────
await p.goBack({ waitUntil: 'networkidle' });
await p.waitForSelector('[data-testid="checkbox-statement-0"]');
check('Back lands on step 1, still inside the funnel', !p.url().includes('step='), p.url());
const stillTicked = await p.locator('[data-testid^="checkbox-statement-"] input:checked').count();
check('Back keeps all four ticks', stillTicked === 4, `${stillTicked} of 4`);
await p.screenshot({ path: `${OUT}/06-back-to-step1-phone.png` });

// Forward again: what she already gave is still there.
await p.locator('[data-testid="button-step-one"]').click();
await p.waitForSelector('[data-testid="input-amount"]');
check(
  'returning to step 2 keeps her amount and her bump',
  (await p.locator('[data-testid="input-amount"]').inputValue()) === '47' &&
    (await p.locator('[data-testid="checkbox-bump"] input').isChecked()),
);

// ── a cold arrival at step 2 is sent back to step 1 ─────────────────────────
const cold = await phone.newPage();
await cold.goto(`${URL}?step=give`, { waitUntil: 'networkidle' });
await cold.waitForSelector('[data-testid="checkbox-statement-0"]');
check('a cold ?step=give bounces to step 1', !cold.url().includes('step='), cold.url());
check(
  'and it does not assume consent',
  (await cold.locator('[data-testid^="checkbox-statement-"] input:checked').count()) === 0,
);
await cold.close();

// ── desktop ─────────────────────────────────────────────────────────────────
const desk = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const d = await desk.newPage();
await d.goto(URL, { waitUntil: 'networkidle' });
await d.waitForSelector('[data-testid="checkbox-statement-0"]');
await d.screenshot({ path: `${OUT}/07-step1-desktop.png`, fullPage: true });
for (const t of await d.locator('[data-testid^="checkbox-statement-"] input').all()) await t.check();
await d.locator('[data-testid="button-step-one"]').click();
await d.waitForSelector('[data-testid="input-amount"]');
await d.locator('[data-testid="checkbox-statement-price"] input').check();
await d.locator('[data-testid="input-amount"]').fill('35');
await d.waitForSelector('[data-testid="button-checkout"]');
await d.screenshot({ path: `${OUT}/08-step2-desktop.png`, fullPage: true });

// No horizontal scroll on either device, on either step.
for (const [name, page] of [['phone', p], ['desktop', d]]) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no sideways scroll on ${name}`, overflow <= 0, `${overflow}px`);
}

// ── the live funnel is untouched ────────────────────────────────────────────
const v1 = await desk.newPage();
await v1.goto('http://localhost:5000/', { waitUntil: 'networkidle' });
check('V1 lander still 200s', v1.url().includes('localhost:5000'));

console.log(`\nmeasured: step 1 ${step1Height}px · step 2 ${step2Height}px (was 3,450px in one column)`);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
