/* pages/thank-you.js — the RECEIPT sheet.
   Route: /thank-you?order=<id>. Needs S.order (loaded by boot).
   Owned by the thank-you page agent. Layout = design review 02 §3b/§4 + README ruling #7:
     1. her name + the question she bought
     2. STATUS ROWS first — one row per bought piece, written always first, audio only if bought;
        each row = glyph + state word + one plain line (+ optional action). Rows never share a
        sentence. Raw statuses are mapped to plain words; no system words reach the page.
     3. the delivery email as a display line
     4. the total LAST and quiet — an itemised ledger, total at body weight, one line saying
        what it covers
     5. the local-only fixture control, marked as a test control, outside the receipt
   Motion (04 §4): the receipt "prints" — rows rise once on first load; a re-render after
   #fulfill does not replay it. All keyframes live in ../styles.css behind
   prefers-reduced-motion: no-preference.
   Keep the ids #written-deadline, #audio-status, #fulfill, #artifact, #pdf-link — the browser
   test and the local PDF fixture flow depend on them. This page never writes to the order
   (scope: a visit never starts fulfillment or repeats a charge); #fulfill is the test-only
   exception and is labelled as such. */

/* ── the deadline as a human date: weekday first, no year (02 T7) ───────── */
function deadline(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'a time we could not read for this older test order';
}

/* ── raw status → one of five plain states ───────────────────────────────
   written: queued | generating | review | ready | delivered | failed
   audio:   (absent) | queued | generating | ready | delivered | failed
   `review` is an internal hold on the written job; for her it is still being written. */
function plainState(raw) {
  switch (raw) {
    case 'generating': case 'review': return 'processing';
    case 'ready': return 'ready';
    case 'delivered': return 'delivered';
    case 'failed': return 'failed';
    default: return 'paid';
  }
}
const GLYPH = { paid: '●', processing: '◐', ready: '◐', delivered: '✓', failed: '!' };
const STATE_WORD = { paid: 'Paid', processing: 'Being prepared', ready: 'Finished', delivered: 'Sent', failed: 'Delayed' };

/* one status row: glyph + piece name + state word + one plain line (+ optional deadline line) */
function statusRow(opts) {
  return (
    '<div class="status-row state-' + opts.state + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      '<span class="glyph" aria-hidden="true">' + GLYPH[opts.state] + '</span>' +
      '<div class="status-body">' +
        '<p class="status-head"><span class="piece">' + esc(opts.piece) + '</span> <span class="state-word">' + esc(STATE_WORD[opts.state]) + '</span></p>' +
        '<p class="status-line">' + opts.line + '</p>' +
        (opts.extra || '') +
      '</div>' +
    '</div>'
  );
}

let receiptPrinted = false; // first render animates; re-renders (after #fulfill) stay still

PAGES.thankYou = function () {
  const o = S.order;
  shell('Receipt');

  const name = esc(o.displayFirstName || o.firstName);
  const email = '<strong class="email">' + esc(o.deliveryEmail) + '</strong>';
  const hours = esc(o.deliveryHours || 24);
  const due = '<strong class="due">' + esc(deadline(o.dueAt)) + '</strong>';
  const audioBought = !!(o.audio && o.audio.purchased);

  /* — written row — */
  const w = plainState(o.writtenStatus);
  const writtenLines = {
    paid: 'Marcus has your question and your cards.',
    processing: 'Marcus is writing it now.',
    ready: 'It is on its way to ' + email + '.',
    delivered: 'It was sent to ' + email + '. Look for an email from Marcus Stone.',
    failed: 'We hit a problem preparing it. Your payment is safe and the deadline still stands. We will email you when it is fixed.',
  };
  const deadlineLine =
    '<p class="status-line" id="written-deadline">' +
      (w === 'delivered'
        ? 'It was due within ' + hours + ' hours of payment, by ' + due + ', your time.'
        : 'It arrives within ' + hours + ' hours of payment, so by ' + due + ', your time.') +
    '</p>';
  const writtenRow = statusRow({ piece: 'Written reading', state: w, line: writtenLines[w], extra: deadlineLine });

  /* — audio row (only if bought; never shares a sentence with the written row) — */
  let audioRow = '';
  if (audioBought) {
    let a = plainState(o.audioStatus);
    let line;
    if (w === 'failed' && a !== 'delivered') {
      a = 'processing';
      line = 'It waits for the written reading. Your written reading is not affected.';
    } else {
      line = {
        paid: 'It is recorded after the written reading is finished, and delivered separately, by the same deadline.',
        processing: 'Marcus is recording it now. It is delivered separately, by the same deadline.',
        ready: 'It is on its way to ' + email + ', separately from the written reading.',
        delivered: 'It was sent to ' + email + ', separately from the written reading.',
        failed: 'We hit a problem recording it. Your payment is safe and your written reading is not affected. We will email you when it is fixed.',
      }[a];
    }
    audioRow = statusRow({ id: 'audio-status', piece: 'Audio version', state: a, line: line });
  }

  /* — the ledger, last and quiet — */
  const bump = !!o.bumpCents;
  const covers = ['your written reading'].concat(bump ? ['its 12-hour delivery'] : []).concat(audioBought ? ['the audio version'] : []);
  const coversText = covers.length === 1 ? covers[0] : covers.slice(0, -1).join(', ') + ' and ' + covers[covers.length - 1];
  const ledger =
    '<section class="ledger-block" aria-labelledby="ledger-title">' +
      '<p class="label" id="ledger-title">What you paid</p>' +
      '<div class="ledger-rows">' +
        '<div class="ledger-row"><span>Personal reading</span><span class="num">$35.00</span></div>' +
        (bump ? '<div class="ledger-row"><span>12-hour delivery</span><span class="num">+ $12.77</span></div>' : '') +
        (audioBought ? '<div class="ledger-row"><span>Audio version</span><span class="num">+ ' + money(o.audio.amountCents) + '</span></div>' : '') +
        '<div class="ledger-total" id="order-total"><span>Total</span><span class="num">' + money(o.totalCents) + '</span></div>' +
      '</div>' +
      '<p class="ledger-note">This covers ' + coversText + '.</p>' +
      (audioBought ? '<p class="ledger-note">It was paid as two separate payments, the reading first and then the audio, so your card statement may show two lines.</p>' : '') +
    '</section>';

  app.innerHTML =
    '<section class="review thanks' + (receiptPrinted ? ' still' : '') + '">' +
      '<h1>Thank you, ' + name + '.</h1>' +
      '<blockquote class="question">' + esc(o.editionSnapshot.question) + '</blockquote>' +

      '<section class="status" aria-labelledby="status-title">' +
        '<p class="label" id="status-title">Where things stand</p>' +
        writtenRow + audioRow +
      '</section>' +

      '<dl class="facts"><div><dt class="label">Delivery email</dt><dd id="delivery-email">' + esc(o.deliveryEmail) + '</dd></div></dl>' +

      ledger +

      '<aside class="test-control" aria-label="Local test control">' +
        '<p class="test-tag">Local test control · not part of the receipt</p>' +
        '<p>Builds the adaptive report structure and a reviewable PDF from the saved draw, locally. It does not send a customer reading or create audio.</p>' +
        '<button class="text-button" id="fulfill">Generate local PDF fixture</button>' +
        '<div id="artifact"></div>' +
      '</aside>' +
    '</section>';
  receiptPrinted = true;

  bind('fulfill', async () => {
    const r = await api('orders/' + enc(o.id) + '/fulfill', {});
    S.order = r.order;
    PAGES.thankYou();
    $('artifact').innerHTML =
      '<h2>Generated test PDF</h2>' +
      '<p><a class="text-link" id="pdf-link" target="_blank" href="' + esc(r.pdfUrl) + '">Open the generated PDF fixture</a></p>' +
      '<pre class="local-artifact">' + esc(typeof r.artifact === 'string' ? r.artifact : JSON.stringify(r.artifact, null, 2)) + '</pre>';
  });
};
