// Walks offer 03's booking CHAT treatment and asserts the gate behaves.
// Nothing charges — the buttons log. We read that log to prove it.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2];
const URL = 'http://localhost:5000/wiccan/judgement-day/chat';
fs.mkdirSync(OUT, { recursive: true });

const fails = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

const browser = await chromium.launch();
const phone = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
const p = await phone.newPage();
const logs = [];
p.on('console', (m) => logs.push(m.text()));

await p.goto(`${URL}?fn=Sarah%20O%27Brien`, { waitUntil: 'networkidle' });

// 0. The thread says which offer this is, and what she is here to do.
// ⛔ THE TENSE IS THE RULE: "confirm" (a job) yes, "confirmed" (a state) never —
// nothing is confirmed until she has paid.
const threadTitle = await p.locator('[data-testid="text-thread-title"]').innerText();
check('the thread names the offer', /judgement day/i.test(threadTitle) && /booking/i.test(threadTitle));
check('and names the job she is here to do', /confirm your booking/i.test(threadTitle));
check(
  'but never claims to be a receipt',
  !/confirmed|confirmation|your order|receipt/i.test(threadTitle),
  threadTitle,
);
check(
  'the browser tab names it too',
  /Judgement Day/.test(await p.title()) && !/Psychic Chat/.test(await p.title()),
  await p.title(),
);

// 1. Evelyn greets ONE SENTENCE AT A TIME, then the gate arrives on its own.
// ⛔ Her lines must not land as a block — that is a transcript being pasted in,
// not somebody talking.
//
// ⚠ Watched on its OWN page, opened with `commit` so we are looking before
// React mounts. The page above waits for networkidle, by which time the whole
// 1.3-second run has already played and there is nothing left to observe.
const reveal = await phone.newPage();
await reveal.goto(URL, { waitUntil: 'commit' });
// She is writing when the chat opens — not sitting on a wall of text that was
// always there, and not on a blank screen either.
await reveal.waitForSelector('[data-testid="indicator-typing"]', { timeout: 4000 });
check('the chat opens on her already writing', true);
check(
  'and nothing has been said yet',
  (await reveal.locator('[data-testid="message-evelyn"]').count()) === 0,
);
await reveal.screenshot({ path: `${OUT}/C0-typing.png` });
await reveal.waitForSelector('[data-testid="message-evelyn"]');
const linesAtFirst = await reveal.locator('[data-testid="message-evelyn"]').count();
check('her first line lands alone', linesAtFirst === 1, `${linesAtFirst} on screen`);
check(
  'and the card is not there yet',
  (await reveal.locator('[data-testid="commitment-gate"]').count()) === 0,
);
await reveal.waitForSelector('[data-testid="indicator-typing"]', { timeout: 3000 });
check('she is typing the next one', true);
await reveal.screenshot({ path: `${OUT}/C0b-second-line-coming.png` });

// ⛔ The pace is not a flat delay. A long sentence must take longer to type than
// a short one, or every line arrives at the same speed and the reader knows it
// is a machine before she can say why.
const t0 = Date.now();
await reveal.waitForSelector('[data-testid="commitment-gate"]', { timeout: 9000 });
const longLineMs = Date.now() - t0;
check(
  'the long sentence takes longer than the short one',
  longLineMs > 1200,
  `${longLineMs}ms for the second line and the card`,
);
await reveal.close();
await p.screenshot({ path: `${OUT}/C1-greeting.png` });
await p.waitForSelector('[data-testid="commitment-gate"]', { timeout: 9000 });
check('gate arrives without her doing anything', true);
const linesAtGate = await p.locator('[data-testid="message-evelyn"]').count();
check('both her sentences arrived before the card', linesAtGate === 2, `${linesAtGate}`);
check('and she has stopped typing', (await p.locator('[data-testid="indicator-typing"]').count()) === 0);
await p.screenshot({ path: `${OUT}/C2-gate.png` });

// 2. Four statements, and the fourth is the intake agreement (P1).
const count = await p.locator('[data-testid^="checkbox-statement-"]').count();
check('four statements in the gate', count === 4, `found ${count}`);
const fourth = await p.locator('[data-testid="checkbox-statement-3"]').innerText();
check('the fourth is the Entry agreement', /reply to your email/i.test(fourth) && /Entry/.test(fourth));

// 3. The floor is NOT announced on arrival.
const gateText = await p.locator('[data-testid="commitment-gate"]').innerText();
check('no minimum printed on arrival', !/\$17|minimum/i.test(gateText));
check('button absent before anything is ticked', (await p.locator('[data-testid="button-checkout"]').count()) === 0);
check('locked hint says four', (await p.locator('[data-testid="text-locked-hint"]').innerText()).includes('all four'));

// 4. Tick everything — still locked, now asking for the amount.
for (const t of await p.locator('[data-testid^="checkbox-statement-"] input').all()) await t.check();
check(
  'ticked but no amount stays locked',
  (await p.locator('[data-testid="button-checkout"]').count()) === 0 &&
    (await p.locator('[data-testid="text-locked-hint"]').innerText()).includes('what you will give'),
);
await p.screenshot({ path: `${OUT}/C3-ticked.png` });

// 5. ⛔ Never mid-typing: "17" is under the floor until the 7 lands, and
// correcting her before she has finished her sentence is the bug this guards.
const chatAmount = p.locator('[data-testid="input-amount"]');
await chatAmount.click();
await chatAmount.pressSequentially('1', { delay: 60 });
check('silent while she is still typing', (await p.locator('[data-testid="text-floor-hint"]').count()) === 0);
await chatAmount.pressSequentially('7', { delay: 60 });
await p.waitForSelector('[data-testid="button-checkout"]');
check('typing 17 is never corrected', (await p.locator('[data-testid="text-floor-hint"]').count()) === 0);

// Under the floor, once she has stopped: refused, and only NOW does it speak.
await chatAmount.fill('9');
check('under the floor stays locked', (await p.locator('[data-testid="button-checkout"]').count()) === 0);
await p.waitForSelector('[data-testid="text-floor-hint"]', { timeout: 4000 });
check(
  'the floor explains itself only when broken',
  (await p.locator('[data-testid="text-floor-hint"]').innerText()).includes('$17'),
);
await p.screenshot({ path: `${OUT}/C4-floor-spoken.png` });

// 6. A real amount unlocks it, and the floor line goes quiet again.
await p.locator('[data-testid="input-amount"]').fill('47');
await p.waitForSelector('[data-testid="button-checkout"]');
check('unlocks with a real amount', true);
check('floor line is gone again', (await p.locator('[data-testid="text-floor-hint"]').count()) === 0);
check('total is her figure', (await p.locator('[data-testid="text-total"]').innerText()) === '$47.00');
await p.screenshot({ path: `${OUT}/C5-ready.png` });

// 7. Confirm → Evelyn resumes → the bump is its own turn.
await p.locator('[data-testid="button-checkout"]').click();
await p.waitForSelector('[data-testid="order-bump"]', { timeout: 9000 });
check('gate stays on screen as her record', (await p.locator('[data-testid="commitment-gate"]').count()) === 1);
check(
  'bump total is her amount plus $12.77',
  (await p.locator('[data-testid="text-bump-total"]').innerText()).includes('$59.77'),
);
await p.screenshot({ path: `${OUT}/C6-bump.png` });
await p.screenshot({ path: `${OUT}/C7-full.png`, fullPage: true });

// 8. Nothing charges, on either action.
await p.locator('[data-testid="button-bump-accept"]').click();
await p.waitForTimeout(200);
const accepted = logs.find((l) => l.includes('would checkout'));
check('accept logs instead of charging', Boolean(accepted), accepted);
check('accept carries her amount + the bump', /5977/.test(accepted ?? ''));
check('bump has its own product key', /unburdening/.test(accepted ?? ''));
check('first name carried from ?fn=', /Sarah O'Brien/.test(accepted ?? ''));
await p.locator('[data-testid="button-bump-decline"]').click();
await p.waitForTimeout(200);
const declined = logs.filter((l) => l.includes('would checkout')).pop();
check('decline charges her amount only', /totalCents: 4700/.test(declined ?? ''), declined);
check('no navigation away', p.url().startsWith(URL));

// 9. Resume: the gate comes back, consent and the amount do NOT.
await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('[data-testid="commitment-gate"]');
const resumeText = await p.locator('body').innerText();
check('resumes at the gate, greeting not replayed', /Still here/.test(resumeText) && !/You came\./.test(resumeText));
// ⛔ A refresh is not a return. She never left, so Evelyn must not greet her
// for coming back — that line belongs to the Stripe round-trip alone.
check('a refresh is not treated as a return', !/came back/i.test(resumeText));
check('and it says what is true of her page', /nothing is written on it yet/i.test(resumeText));
const anyTicked = await p.locator('[data-testid^="checkbox-statement-"] input:checked').count();
check('consent is NOT restored', anyTicked === 0);
check('the amount is NOT restored', (await p.locator('[data-testid="input-amount"]').inputValue()) === '');
check('no live bump on a resumed session', (await p.locator('[data-testid="order-bump"]').count()) === 0);
// The stream auto-scrolls to the gate, so bring what she is greeted with back
// into frame — the lines are the point of this shot.
await p.locator('[data-testid="message-evelyn"]').first().scrollIntoViewIfNeeded();
await p.screenshot({ path: `${OUT}/C8-resumed.png` });

// 9b. The OTHER door: back from Stripe without paying. ⚠ Here she really did
// leave and come back, which is the only place that line is true — and her live
// question is whether she has been charged, so it is answered unasked.
const returned = await phone.newPage();
await returned.goto(`${URL}?cancelled=1`, { waitUntil: 'networkidle' });
await returned.waitForSelector('[data-testid="commitment-gate"]');
const cancelledText = await returned.locator('body').innerText();
check('a real return is greeted as one', /You came back/.test(cancelledText));
check('and it says no money moved', /nothing has been taken/i.test(cancelledText));
check(
  'the cancelled path still gives back no consent',
  (await returned.locator('[data-testid^="checkbox-statement-"] input:checked').count()) === 0 &&
    (await returned.locator('[data-testid="input-amount"]').inputValue()) === '',
);
await returned.locator('[data-testid="message-evelyn"]').first().scrollIntoViewIfNeeded();
await returned.screenshot({ path: `${OUT}/C8b-cancelled.png` });
await returned.close();

// 9c. The narrowest phone still in the wild. ⚠ The thread strip must hold ONE
// line — wrapped, it stops reading as a label and starts reading as a message.
const narrow = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const n = await narrow.newPage();
await n.goto(URL, { waitUntil: 'networkidle' });
const stripHeight = (await n.locator('[data-testid="text-thread-title"]').boundingBox()).height;
check('the thread title holds one line at 320px', stripHeight < 40, `${stripHeight}px`);
await n.screenshot({ path: `${OUT}/C10-narrow-320.png` });
await narrow.close();

// 10. Desktop.
const desk = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const d = await desk.newPage();
await d.goto(URL, { waitUntil: 'networkidle' });
await d.waitForSelector('[data-testid="commitment-gate"]', { timeout: 9000 });
await d.screenshot({ path: `${OUT}/C9-desktop.png` });

for (const [name, page] of [['phone', p], ['desktop', d]]) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no sideways scroll on ${name}`, overflow <= 0, `${overflow}px`);
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
