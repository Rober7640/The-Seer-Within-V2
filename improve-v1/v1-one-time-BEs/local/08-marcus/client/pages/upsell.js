/* pages/upsell.js — the ONE ADDITION sheet (audio Upsell 1).
   Route: /upsell?order=<id>. Needs S.order (loaded by boot).
   Owned by the upsell page agent. Built to design-reviews/03-audio-upsell.md under README ruling 2:
     · copy is docs/08-marcus/upsell-1-audio/COPY.md verbatim (tokens: first name, price, hours)
     · the running-order sleeve lists one row per position from S.order.editionSnapshot.positions
       (label text from the edition — the chapter count is never hard-coded), then a red-marked row
       for the personal-card pass that NEVER names her card, then the closing-advice row
     · two-row charge ledger (paid amount from the order, no total, no strike-through)
     · accept = red stamp #audio-yes · decline = full-width outlined #audio-no, same height
     · one motion moment: the sleeve settles once as it scrolls into view (timed fallback, reduced-motion = static)
   Keep the ids #audio-yes / #audio-no, `.offer-stack li` ×4, and the POST /api/orders/:id/audio call.
   The page must stay question-independent: no edition question or card name is ever rendered. */

/* Provisional audio price. The server's AUDIO_TEST_CENTS (1700) is not yet exposed on the order
   JSON; until it is, read any price the order carries and fall back to this one mirror of it. */
const AUDIO_TEST_CENTS_FALLBACK = 1700;
function audioCents(o) {
  return (o.audio && o.audio.amountCents) || o.audioPriceCents || AUDIO_TEST_CENTS_FALLBACK;
}
/* "$17" for whole dollars, "$47.77" otherwise — the letter says "$17", never "$17.00". */
function dollars(cents) {
  return cents % 100 === 0 ? '$' + (cents / 100) : money(cents);
}

PAGES.upsell = function () {
  const o = S.order;
  const name = o.displayFirstName || o.firstName;
  const hours = o.deliveryHours || 24;
  const price = dollars(audioCents(o));
  const positions = (o.editionSnapshot && o.editionSnapshot.positions) || [];
  shell('One addition');

  /* the running-order sleeve: N position rows + the personal-card pass + the closing advice */
  const rows = positions.map((p, i) =>
    '<li style="--i:' + i + '"><span class="n num">' + esc(p.number || i + 1) + '</span><span class="t">' + esc(p.label) + '</span></li>'
  ).join('') +
    '<li class="lens" style="--i:' + positions.length + '"><span class="n" aria-hidden="true">◆</span><span class="t">The cards read together through your personal card</span></li>' +
    '<li class="end" style="--i:' + (positions.length + 1) + '"><span class="n" aria-hidden="true">→</span><span class="t">The closing advice, and the reasoning behind it</span></li>';
  const segs = positions.map((_, i) => '<i class="seg" style="--i:' + i + '"></i>').join('') +
    '<i class="seg lens" style="--i:' + positions.length + '"></i>' +
    '<i class="seg end" style="--i:' + (positions.length + 1) + '"></i>';

  app.innerHTML =
    '<section class="review upsell">' +
      '<p class="step-label">A quick warning before you view your receipt.</p>' +
      '<h1>Don\'t skip to the answer. You could miss how to use it.</h1>' +
      '<div class="upsell-copy">' +
        '<p>' + esc(name) + ',</p>' +
        '<p>When your reading arrives, you may feel tempted to scroll straight to the final answer.</p>' +
        '<p>But the final paragraph can only tell you where the reading leads. It cannot make sense on its own.</p>' +
        '<p>Skip the explanation, and you may finish with advice you agree with—yet still have no idea why the cards point there, what to consider first, or how to use it in your situation.</p>' +
        '<p>Your reading is built in an order. Each card answers a different part of your question. Then I read those cards together through the strengths and habits represented by your personal card.</p>' +
        '<p><strong>The connections are what turn several card meanings into one answer meant for you.</strong></p>' +
        '<p>That is why I can also prepare your complete reading as an audio recording.</p>' +
      '</div>' +

      '<figure class="sleeve" id="sleeve" aria-label="Your audio reading, running order. Not yet recorded.">' +
        '<div class="sleeve-head">' +
          '<span class="kicker ink">Your audio reading · running order</span>' +
          '<span class="sleeve-state">Not yet recorded</span>' +
        '</div>' +
        '<div class="player" aria-hidden="true">' +
          '<span class="play"></span>' +
          '<span class="track" style="--segs:' + (positions.length + 2) + '">' + segs + '</span>' +
        '</div>' +
        '<ol class="chapters" id="chapters">' + rows + '</ol>' +
        '<figcaption class="sleeve-foot">Recorded after your written reading is prepared. Ready by the same ' + esc(hours) + '-hour deadline. Length shown once recorded.</figcaption>' +
      '</figure>' +

      '<div class="upsell-copy">' +
        '<p>Instead of scanning ahead, press play and hear each part lead naturally into the next. Pause when something lands. Replay the passages you need more time with. Return to the reasoning behind the closing advice whenever you need it.</p>' +
        '<p>Your written reading remains complete. The audio gives you the same personal reading in a form designed to be followed from beginning to end.</p>' +
      '</div>' +

      '<section class="offer-stack insert includes" aria-labelledby="includes-h">' +
        '<h2 id="includes-h" class="includes-h">Your audio reading includes</h2>' +
        '<ul>' +
          '<li>Your complete personal reading, narrated in order</li>' +
          '<li>The same saved spread and personal-card lens</li>' +
          '<li>A private recording you can pause and replay</li>' +
          '<li>Delivery by the same ' + esc(hours) + '-hour deadline as your written reading</li>' +
        '</ul>' +
      '</section>' +

      '<section class="summary offer-close" aria-labelledby="offer-h">' +
        '<div class="price-row"><h2 id="offer-h">Add your complete audio reading</h2><span class="price num">' + esc(price) + '</span></div>' +
        '<p class="offer-note">One additional payment. Your written order is already confirmed and will continue whether you add audio or not.</p>' +
        '<dl class="charge-ledger" aria-label="What is paid and what would be added">' +
          '<div class="paid"><dt>Your written reading <em class="tag">Paid</em></dt><dd class="num">' + esc(dollars(o.totalCents)) + '</dd></div>' +
          '<div class="add-row"><dt>Audio recording <em class="tag">Only if you add it</em></dt><dd class="num">' + esc(price) + '</dd></div>' +
        '</dl>' +
        '<div class="actions upsell-actions">' +
          '<button type="button" id="audio-yes" class="primary">Yes—add my audio reading for ' + esc(price) + '</button>' +
          '<button type="button" id="audio-no" class="upsell-decline">No thanks—I’ll read it on my own.</button>' +
        '</div>' +
      '</section>' +

      '<p class="sign">Marcus</p>' +
    '</section>';

  bind('audio-yes', () => finishAudio(true));
  bind('audio-no', () => finishAudio(false));
  settleSleeve($('sleeve'));
};

/* The page's one motion: the track fills and the rows settle once, when the sleeve scrolls into
   view. `.pending` is only ever added here, so anything that stops this script leaves the sleeve
   fully drawn. A 4 s timer settles it regardless; reduced-motion never adds the class at all. */
function settleSleeve(sleeve) {
  if (!sleeve) return;
  const motionOk = window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (!motionOk || !('IntersectionObserver' in window)) return;
  sleeve.classList.add('pending');
  let done = false;
  const settle = () => {
    if (done) return; done = true;
    sleeve.classList.remove('pending'); sleeve.classList.add('in');
    obs.disconnect(); clearTimeout(timer);
  };
  const obs = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) settle(); }, { threshold: 0.2 });
  obs.observe(sleeve);
  const timer = setTimeout(settle, 4000);
}

async function finishAudio(accept) {
  const r = await api('orders/' + enc(S.order.id) + '/audio', { accept });
  S.order = r.order;
  go('/thank-you?order=' + enc(S.order.id), 'thankYou');
}
