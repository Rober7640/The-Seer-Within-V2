/* pages/checkout-sim.js — a LOCAL STAND-IN for Stripe's hosted Checkout (plain style, no Stripe branding).
   Route: /checkout-sim?intake=<id>. Needs S.intake + S.edition (loaded by boot).
   Operator rule (2026-09-14, re-confirmed 2026-09-15): "Birth name and date only on the booking page.
   Never on Stripe." In production Stripe collects email, name on card and the card — nothing else.
   Here: Email · Name on card · Pay $X. Her first name, full birth name and date of birth were
   taken on the order form and sit on the intake; this page never asks for them again.
   The Pay button calls the existing simulated pay: POST /api/local-pay {intakeId, email}.
   No page agent owns this file. */

function checkoutTotalCents() { return S.intake && S.intake.sameDay ? 4777 : 3500; }

function coField(id, label, type, attrs) {
  return '<div class="field" id="field-' + id + '"><label for="' + id + '">' + label + '</label>' +
    '<span class="field-error" id="' + id + '-error" hidden></span>' +
    '<input id="' + id + '" name="' + id + '" type="' + type + '" ' + attrs + '></div>';
}
function coSetError(id, message) {
  const input = $(id), box = $(id + '-error');
  if (!input) return;
  if (message) { box.textContent = 'Error: ' + message; box.hidden = false; input.setAttribute('aria-invalid', 'true'); }
  else { box.hidden = true; box.textContent = ''; input.removeAttribute('aria-invalid'); }
}

PAGES.checkoutSim = function () {
  const total = checkoutTotalCents();
  const e = S.edition;
  shell(null); // hides the broadsheet chrome — this page imitates a hosted checkout
  app.innerHTML =
    '<div class="co-notice" role="note"><strong>Local stand-in for the hosted checkout.</strong> Nothing here is Stripe and no card is charged. In production this page is Stripe Checkout, which collects email, card and name on card only — her first name, birth name and date of birth were taken on the order form.</div>' +
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
          coField('name-on-card', 'Name on card', 'text', 'autocomplete="cc-name" autocapitalize="words" maxlength="100" required') +
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
    // Mark every bad field, focus the first (05 §4 error placement).
    const problems = [];
    coSetError('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'that email address is missing the part after the @.'); if ($('email').getAttribute('aria-invalid')) problems.push('email');
    coSetError('name-on-card', nameOnCard ? '' : 'please enter the name on the card.'); if (!nameOnCard) problems.push('name-on-card');
    if (problems.length) { const first = $(problems[0]); first.focus(); first.scrollIntoView({ block: 'center' }); return; }
    const button = $('pay'); button.disabled = true;
    try {
      // Name on card stays with the card processor (Stripe keeps it; we never store it).
      const r = await api('local-pay', { intakeId: S.intake.id, email });
      S.order = r.order;
      go('/bridge?order=' + enc(S.order.id), 'bridge');
    } catch (e) {
      error(e);
    } finally { if ($('pay')) $('pay').disabled = false; }
  });
};
