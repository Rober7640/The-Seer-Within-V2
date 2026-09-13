/* pages/checkout-sim.js — a LOCAL STAND-IN for Stripe's hosted Checkout (plain style, no Stripe branding).
   Route: /checkout-sim?intake=<id>. Needs S.intake + S.edition (loaded by boot).
   In production Stripe collects email, name on card and the card; full birth name and date of
   birth ride along as Checkout custom fields (three allowed). Here: Email · Name on card
   (display first name = first word) · Full name at birth · Date of birth as three numeric boxes
   Month · Day · Year (review 05 §4, GOV.UK memorable-date pattern) combined to YYYY-MM-DD · Pay $X.
   The Pay button calls the existing simulated pay: POST /api/local-pay. No page agent owns this file. */

function checkoutTotalCents() { return S.intake && S.intake.sameDay ? 4777 : 3500; }

function coField(id, label, type, attrs, hint) {
  return '<div class="field" id="field-' + id + '"><label for="' + id + '">' + label + '</label>' +
    (hint ? '<span class="hint">' + hint + '</span>' : '') +
    '<span class="field-error" id="' + id + '-error" hidden></span>' +
    '<input id="' + id + '" name="' + id + '" type="' + type + '" ' + attrs + '></div>';
}
function coSetError(id, message) {
  const input = $(id), box = $(id + '-error');
  if (!input) return;
  if (message) { box.textContent = 'Error: ' + message; box.hidden = false; input.setAttribute('aria-invalid', 'true'); }
  else { box.hidden = true; box.textContent = ''; input.removeAttribute('aria-invalid'); }
}
/* Combine the three boxes; return {value} or {error}. Validate on submit only (05 §4). */
function coDateOfBirth() {
  const m = $('dob-month').value.trim(), d = $('dob-day').value.trim(), y = $('dob-year').value.trim();
  if (!/^\d{1,2}$/.test(m) || +m < 1 || +m > 12) return { error: 'enter the month as a number from 1 to 12.' };
  if (!/^\d{1,2}$/.test(d) || +d < 1 || +d > 31) return { error: 'enter the day as a number from 1 to 31.' };
  if (!/^\d{4}$/.test(y)) return { error: 'the year should have four numbers, for example 1961.' };
  return { value: y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0') };
}

PAGES.checkoutSim = function () {
  const total = checkoutTotalCents();
  const e = S.edition;
  shell(null); // hides the broadsheet chrome — this page imitates a hosted checkout
  app.innerHTML =
    '<div class="co-notice" role="note"><strong>Local stand-in for the hosted checkout.</strong> Nothing here is Stripe and no card is charged. In production this page is Stripe Checkout; the two extra fields are its custom fields.</div>' +
    '<div class="co">' +
      '<section class="co-summary" aria-label="Order summary">' +
        '<div class="co-merchant">The Seer Within · Marcus Stone</div>' +
        '<div class="co-amount num" id="co-amount">' + money(total) + '</div>' +
        '<div class="co-items">' +
          '<div class="co-item"><span>Personal reading — ' + esc(e ? e.question : '') + '</span><span class="num">$35.00</span></div>' +
          (S.intake.sameDay ? '<div class="co-item"><span>12-hour delivery</span><span class="num">$12.77</span></div>' : '') +
          '<div class="co-item total"><span>Total due</span><span class="num">' + money(total) + '</span></div>' +
        '</div>' +
        '<a class="co-back" id="co-back" href="/booking?edition=' + enc(S.intake.editionId) + '">‹ Back to the order form</a>' +
      '</section>' +
      '<form class="co-form" id="checkout-form" novalidate>' +
        '<h2>Pay with card</h2>' +
        coField('email', 'Email', 'email', 'autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required value="reader@example.test"') +
        '<div class="section"><h2>Card information</h2>' +
          '<div class="co-fake-card"><div class="disabled">Card number — not collected in the local stand-in</div><div class="disabled">MM / YY · CVC — not collected</div></div>' +
          coField('name-on-card', 'Name on card', 'text', 'autocomplete="cc-name" autocapitalize="words" maxlength="100" required', 'I’ll use your first name when I write to you.') +
        '</div>' +
        '<div class="section"><h2>Additional information</h2>' +
          coField('birth-name', 'Your full name as it was given at birth', 'text', 'name="birth-name" autocomplete="off" autocapitalize="words" maxlength="200" required', 'The name on your birth certificate, before any marriage. This is how I find your personal card.') +
          '<div class="field" id="field-dob"><label for="dob-month">Your date of birth</label>' +
            '<span class="hint">For example, 3 14 1961</span>' +
            '<span class="field-error" id="dob-month-error" hidden></span>' +
            '<div class="dob">' +
              '<div><label for="dob-month">Month</label><input id="dob-month" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="bday-month"></div>' +
              '<div><label for="dob-day">Day</label><input id="dob-day" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="bday-day"></div>' +
              '<div class="year"><label for="dob-year">Year</label><input id="dob-year" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="bday-year"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button id="pay" class="co-pay" type="submit">Pay ' + money(total) + '</button>' +
        '<p class="hint" style="margin-top:10px">Simulated payment. No charge is made and no email is sent.</p>' +
      '</form>' +
    '</div>';

  $('co-back').addEventListener('click', ev => { ev.preventDefault(); go('/booking?edition=' + enc(S.intake.editionId), 'booking'); });
  $('checkout-form').addEventListener('input', clearError);
  $('checkout-form').addEventListener('submit', async ev => {
    ev.preventDefault(); clearError();
    const email = $('email').value.trim();
    const nameOnCard = $('name-on-card').value.trim();
    const displayFirstName = nameOnCard.split(/\s+/)[0] || '';
    const fullBirthName = $('birth-name').value.trim();
    const dob = coDateOfBirth();
    // Mark every bad field, focus the first (05 §4 error placement).
    const problems = [];
    coSetError('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'that email address is missing the part after the @.'); if ($('email').getAttribute('aria-invalid')) problems.push('email');
    coSetError('name-on-card', nameOnCard ? '' : 'please enter the name on the card.'); if (!nameOnCard) problems.push('name-on-card');
    coSetError('birth-name', /\S\s+\S/.test(fullBirthName) ? '' : 'please enter your full name at birth — first and last.'); if (!/\S\s+\S/.test(fullBirthName)) problems.push('birth-name');
    coSetError('dob-month', dob.error || ''); if (dob.error) { ['dob-day', 'dob-year'].forEach(id => $(id).setAttribute('aria-invalid', 'true')); problems.push('dob-month'); }
    else ['dob-day', 'dob-year'].forEach(id => $(id).removeAttribute('aria-invalid'));
    if (problems.length) { const first = $(problems[0]); first.focus(); first.scrollIntoView({ block: 'center' }); return; }
    const button = $('pay'); button.disabled = true;
    try {
      const r = await api('local-pay', { intakeId: S.intake.id, email, displayFirstName, fullBirthName, dateOfBirth: dob.value });
      S.order = r.order;
      go('/bridge?order=' + enc(S.order.id), 'bridge');
    } catch (e) {
      error(e);
    } finally { if ($('pay')) $('pay').disabled = false; }
  });
};
