/* pages/bridge.js — the ORDER CONFIRMED sheet (post-purchase bridge).
   Route: /bridge?order=<id>. Needs S.order (loaded by boot; boot shows the fail-closed message
   and never calls this page when the order fetch fails).
   Owned by the bridge page agent. Layout = design review 02 (label-over-value order facts, the
   letter's own rules instead of a grey box, the reassurance line directly under the action).
   Operator ruling 1 (2026-09-13): the bridge is a REDIRECT page — it moves to /upsell by itself
   after BRIDGE_SECONDS, with one plain "continue now" link (#to-upsell) for anyone who does not
   want to wait. The browser test clicks #to-upsell; keep that id on the link.
   Rules: redirect only once the order is loaded as paid; never write (no fulfillment, no charge);
   refresh restarts only the countdown; the timer is stopped on click, on back/forward and when the
   page is no longer /bridge, so it can never push a second /upsell entry. */
const BRIDGE_SECONDS = 7;
let bridgeTimer = null;

function stopBridgeTimer() {
  if (bridgeTimer) { clearInterval(bridgeTimer); bridgeTimer = null; }
}

PAGES.bridge = function () {
  stopBridgeTimer();
  const o = S.order;
  shell('Order confirmed');

  // Fail closed: no paid order, no page and no redirect (boot already covers a failed fetch).
  if (!o || !o.id || !o.paidAt || !o.paymentReference) {
    app.innerHTML =
      '<section class="review bridge-page">' +
        '<h1>Let’s find your reading.</h1>' +
        '<p class="bridge">This order could not be confirmed. <a href="/" class="text-link">Choose a reading</a>.</p>' +
      '</section>';
    return;
  }

  const next = '/upsell?order=' + enc(o.id);
  app.innerHTML =
    '<section class="review bridge-page">' +
      '<div class="bridge-head">' +
        '<p class="eyebrow ink">Order confirmed</p>' +
        '<h1>Your personal reading <span class="nowrap">is now being prepared.</span></h1>' +
      '</div>' +
      '<p class="bridge thanks">Thank you, ' + esc(o.displayFirstName || o.firstName) + '. I have your question, your saved cards, and the personal card connected to your name.</p>' +
      '<div class="facts" id="delivery-facts">' +
        '<div class="rule-double" aria-hidden="true"></div>' +
        '<p><strong>Your written reading is secured.</strong> It will be prepared for <strong class="email" id="delivery-email">' + esc(o.deliveryEmail) + '</strong> and delivered within ' + esc(o.deliveryHours) + ' hours of payment.</p>' +
        /* label-over-value display lines (02 B2) — desktop only; on a phone they cost the first screen */
        '<dl>' +
          '<div><dt class="label">Delivery email</dt><dd>' + esc(o.deliveryEmail) + '</dd></div>' +
          '<div><dt class="label">Arrives</dt><dd id="delivery-window">Within ' + esc(o.deliveryHours) + ' hours <small>of payment</small></dd></div>' +
        '</dl>' +
        '<div class="hair" aria-hidden="true"></div>' +
      '</div>' +
      '<p class="next">Before you view your receipt, I want to show you one optional way to receive the same reading.</p>' +
      '<div class="action">' +
        '<p class="count-line" id="countdown-line" aria-live="off">The next page opens in <span class="num" id="countdown">' + BRIDGE_SECONDS + '</span> <span id="countdown-unit">seconds</span>.</p>' +
        '<div class="count-rule" aria-hidden="true"><i id="count-fill"></i></div>' +
        '<a class="text-button" id="to-upsell" href="' + next + '">continue now</a>' +
      '</div>' +
      '<p class="under">Nothing on the next page changes or delays that order.</p>' +
    '</section>';

  const stillHere = () => location.pathname === '/bridge' && S.order && S.order.id === o.id && !!$('countdown-line');
  const leave = () => {
    stopBridgeTimer();
    if (stillHere()) go(next, 'upsell');
  };
  bind('to-upsell', leave);

  // The countdown: body type, one number changing once a second; no spinner, no red.
  let left = BRIDGE_SECONDS;
  bridgeTimer = setInterval(() => {
    if (!stillHere()) { stopBridgeTimer(); return; }
    left -= 1;
    if (left <= 0) {
      $('countdown-line').textContent = 'Opening the next page now.';
      leave();
      return;
    }
    $('countdown').textContent = String(left);
    $('countdown-unit').textContent = left === 1 ? 'second' : 'seconds';
  }, 1000);

  // The thin rule that fills over the same seconds (CSS transition; hidden under reduced motion).
  const fill = $('count-fill');
  fill.style.transitionDuration = BRIDGE_SECONDS + 's';
  requestAnimationFrame(() => requestAnimationFrame(() => { if (stillHere()) fill.classList.add('run'); }));
};
