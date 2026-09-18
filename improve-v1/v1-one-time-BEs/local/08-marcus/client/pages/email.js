/* pages/email.js — the AWeber handoff fixture (local continuity check, not a customer page).
   Route: /email?edition=<id>. Needs S.edition (loaded by boot). Hands into /booking. */
PAGES.email = function () {
  const e = S.edition;
  shell('Daily letter');
  app.innerHTML =
    '<p class="step-label">AWeber handoff · local continuity fixture</p>' +
    '<p class="note">AWeber sends the designed daily HTML with its hero image. This local screen only checks that the same edition reaches booking.</p>' +
    '<h1>' + esc(e.question) + '</h1>' +
    '<div class="email-copy">' + esc(e.freeEmailText) + '</div>' +
    '<button id="to-booking" class="primary">' + esc((e.bookingCopy && e.bookingCopy.headline) || 'Continue my reading') + '</button>';
  bind('to-booking', () => go('/booking?edition=' + enc(e.id), 'booking'));
};
