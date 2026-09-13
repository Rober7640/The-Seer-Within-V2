/* pages/booking.js — the ORDER FORM sheet: page two of the same morning paper.
   Route: /booking?edition=<id>. Needs S.edition + S.cards (loaded by boot).
   Operator ruling 3 (2026-09-13): NO personal data is collected here.
   Shape: headline → the turned cards in one row → bridge → the table photograph →
          the face-down positions as a ruled ledger → price + delivery promise →
          signature → speed bump → live total → ONE button to secure payment.
   The button posts the intake {editionId, sameDay} and moves to /checkout-sim?intake=<id>.
   Spec: docs/08-marcus/design-reviews/01-booking.md §3.1–3.12 (form section moot),
         05-over-55-phone.md §1–§3 floors, 04-visual-identity.md §3–§4 tokens.
   Keep the ids #same-day, #booking-total, #to-checkout and the containers
   .up-cards / .down-cards with figure.up / figure.down inside them. */

const BOOKING_FALLBACK_COPY = {
  headline: 'Continue your personal reading.',
  intro: 'Continue your personal reading.',
  bridge: 'Let’s continue with the remaining cards.',
  offer: 'I’ll bring the remaining cards together around your question.',
  name: 'I’ll interpret your cards with your personal card’s strengths and habits in mind.',
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/* Hosted images for the page (the local /api/assets/ has no table photograph or signature).
   The hero is derived from the edition slug when the record carries no URL; a 404 hides the figure. */
const BOOKING_S3 = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/';
const BOOKING_PRICE = 3500, BOOKING_BUMP = 1277;
const BOOKING_PROMISE = h => 'A written reading, sent as a PDF link to your email within ' + h + ' hours of payment.';

/* $35 when the amount is whole, $47.77 when it is not — one way of writing a price (05 fix 11). */
function bookingMoney(cents) { return cents % 100 === 0 ? '$' + (cents / 100) : money(cents); }

/* Face-up cards get an ink frame and a FIG. numeral; face-down get a hairline frame and a word. */
function bookingFigures(free) {
  const e = S.edition;
  let fig = 0;
  return e.positions.filter(p => (p.visibility === 'free') === free).map(p => {
    const c = S.cards.find(c => c.id === (p.fixedCard && p.fixedCard.cardId));
    const name = free ? (c ? c.name : p.fixedCard.cardId) : '';
    const word = WORDS[p.number - 1] || String(p.number);
    const label = free
      ? '<span class="figno">Fig. ' + (ROMAN[fig++] || String(fig)) + ' · </span>Position ' + word
      : 'Position ' + word;
    const figure = '<figure class="' + (free ? 'up' : 'down') + '">' +
      '<span class="cut"><img class="tarot" src="' + art(free ? p.fixedCard.cardId : 'back') + '" width="350" height="600" alt="' + esc(free ? name : 'Card still face down') + '"></span>' +
      '<figcaption class="fig"><span class="position fig-no">' + label + '</span><div class="fig-pos">' + esc(p.label) + '</div>' +
      (free ? '<span class="card-name fig-name">' + esc(name) + '</span>' : '') + '</figcaption></figure>';
    return free ? figure : '<li>' + figure + '</li>';
  }).join('');
}

PAGES.booking = function () {
  const e = S.edition;
  const c = e.bookingCopy || Object.assign({ headline: e.question }, BOOKING_FALLBACK_COPY);
  const sameDay = !!(S.intake && S.intake.sameDay);
  const up = e.positions.filter(p => p.visibility === 'free').length;
  const down = e.positions.length - up;
  const heroUrl = e.heroUrl || e.hero || (BOOKING_S3 + '08-hero-' + e.slug + '.jpg');
  const total = cents => 'Continue to secure payment — ' + bookingMoney(cents);
  const note = on => 'Personal reading ' + bookingMoney(BOOKING_PRICE) + (on ? ' + 12-hour delivery ' + bookingMoney(BOOKING_BUMP) : '');
  shell('Order form');
  app.innerHTML =
    '<div class="intro"><h1>' + esc(c.headline) + '</h1><p class="lead">' + esc(c.intro) + '</p></div>' +
    '<div class="up-cards" style="--n:' + up + '" aria-label="The cards already turned">' + bookingFigures(true) + '</div>' +
    '<section class="remaining">' +
      '<h2>What we’ll look at next</h2>' +
      '<div class="bridge">' + esc(c.bridge) + '</div>' +
      '<figure class="table" id="table-photo" hidden>' +
        '<img id="table-img" src="' + esc(heroUrl) + '" width="1200" height="800" alt="The cards as they lie on the table">' +
        '<figcaption><span class="label ink"><span class="figno">Fig. ' + esc(ROMAN[up] || String(up + 1)) + ' · </span>The table</span> — as the cards lie this morning.</figcaption>' +
      '</figure>' +
      '<ol class="down-cards ledger-down" style="--rows:' + Math.ceil(down / 2) + '" aria-label="The positions still face down">' + bookingFigures(false) + '</ol>' +
    '</section>' +
    '<section class="offer">' +
      '<div class="price-row"><h2>Your personal reading</h2><span class="price num">' + bookingMoney(BOOKING_PRICE) + '</span></div>' +
      '<p class="delivery" id="delivery">' + BOOKING_PROMISE(sameDay ? 12 : 24) + '</p>' +
      '<p class="offer-copy">' + esc(c.offer) + '</p>' +
      '<p class="name-note">' + esc(c.name) + '</p>'  /* the ask is stated once, by the edition's own copy (cold-read gated per edition) */ +
      '<div class="sig-row"><img class="sig" id="sig" src="' + BOOKING_S3 + '08-signature.jpg" width="560" height="185" alt="Marcus Stone"></div>' +
      '<div class="booking-bump insert">' +
        '<span class="review-label">Optional speed upgrade</span>' +
        '<div class="price-row"><h3>Receive it within 12 hours</h3><span class="summary-price add num">+' + bookingMoney(BOOKING_BUMP) + '</span></div>' +
        '<p class="extra-desc">Your written reading normally arrives within 24 hours of payment. Add this to receive it within 12 hours.</p>' +
        '<label class="check" for="same-day"><input type="checkbox" id="same-day" ' + (sameDay ? 'checked' : '') + '><span>Yes, prepare my reading within 12 hours — add ' + bookingMoney(BOOKING_BUMP) + '</span></label>' +
      '</div>' +
      '<div class="total booking-total"><span>Total <small class="cur">USD</small></span><strong id="booking-total" class="num" aria-live="polite">' + bookingMoney(sameDay ? BOOKING_PRICE + BOOKING_BUMP : BOOKING_PRICE) + '</strong></div>' +
      '<p class="total-note" id="total-note">' + note(sameDay) + '</p>' +
      '<button id="to-checkout" class="primary submit">' + total(sameDay ? BOOKING_PRICE + BOOKING_BUMP : BOOKING_PRICE) + '</button>' +
      '<p class="under">Name, email and card details are taken on the secure payment page. Local test only — no charge.</p>' +
    '</section>';

  /* the table photograph: shown only once it has loaded; a 404 leaves no hole */
  const tableImg = $('table-img');
  const showTable = () => { if (tableImg.naturalWidth > 0) $('table-photo').hidden = false; };
  tableImg.addEventListener('load', showTable);
  tableImg.addEventListener('error', () => $('table-photo').remove());
  if (tableImg.complete) showTable();

  /* the signature: his name in italic display if the asset is missing */
  const sig = $('sig');
  const noSig = () => { sig.parentNode.innerHTML = '<span class="sig-name">' + esc(CHROME.name) + '</span>'; };
  sig.addEventListener('error', noSig);
  if (sig.complete && sig.naturalWidth === 0) noSig();

  $('same-day').addEventListener('change', () => {
    const on = $('same-day').checked;
    const cents = on ? BOOKING_PRICE + BOOKING_BUMP : BOOKING_PRICE;
    $('booking-total').textContent = bookingMoney(cents);
    $('to-checkout').textContent = total(cents);
    $('total-note').textContent = note(on);
    $('delivery').textContent = BOOKING_PROMISE(on ? 12 : 24);
  });
  bind('to-checkout', async () => {
    const r = await api('intake', { editionId: e.id, sameDay: $('same-day').checked });
    S.intake = r.intake;
    go('/checkout-sim?intake=' + enc(S.intake.id), 'checkoutSim');
  });
};
