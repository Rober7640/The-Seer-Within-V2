/* ═══════════════════════════════════════════════════════════════════════════
   08 Marcus local client · shared.js
   Loaded FIRST. Owns: the API helper, routing, the masthead/footer chrome, page
   state, and boot(). Each page file registers itself on PAGES and never touches
   another page's file. No bundler, no framework — plain globals.

   Page contract (pages/*.js):
     PAGES.<name> = function(){ shell('Dateline'); app.innerHTML = ...; bind(...) }
     - read/write state on S (S.edition, S.cards, S.intake, S.order)
     - move to another page with go('/path?query', 'pageName')
     - report an error with error(e); clear it with clearError()
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── state ─────────────────────────────────────────────────────────────── */
const S = { edition: null, cards: [], intake: null, order: null };
const PAGES = {};

/* ── DOM helpers ───────────────────────────────────────────────────────── */
const app = document.getElementById('app');
const err = document.getElementById('error');
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + (n / 100).toFixed(2);
const enc = v => encodeURIComponent(v);

/* ── API ───────────────────────────────────────────────────────────────── */
async function api(path, body) {
  const r = await fetch('/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const v = await r.json();
  if (!r.ok) throw Error(v.error || 'Please try again.');
  return v;
}
async function loadEdition(id) {
  const r = await api('editions/' + enc(id));
  S.edition = r.edition; S.cards = r.cards;
}

/* ── errors ────────────────────────────────────────────────────────────── */
function error(e) { err.textContent = e && e.message ? e.message : String(e); err.hidden = false; }
function clearError() { err.hidden = true; err.textContent = ''; }

/* ── chrome: masthead (nameplate + SCOTCH rule + dateline) and footer (FOLIO rule + dateline) ── */
const CHROME = { name: 'Marcus Stone', role: 'Daily Tarot Reader', brand: 'The Seer Within' };
function renderMasthead(dateline) {
  const el = $('masthead');
  if (!el) return;
  el.innerHTML =
    '<img class="portrait" id="portrait" src="' + art('portrait') + '" alt="' + esc(CHROME.name) + '" width="64" height="64">' +
    '<div class="mast-name">' + esc(CHROME.name) + '</div>' +
    '<div class="mast-role">' + esc(CHROME.role) + '</div>' +
    '<div class="rule-scotch" aria-hidden="true"></div>' +
    '<div class="dateline label"><span id="dateline">' + esc(dateline) + '</span><span>' + esc(CHROME.brand) + '</span></div>';
}
function renderFooter(dateline) {
  const el = $('footer');
  if (!el) return;
  el.innerHTML =
    '<div class="rule-folio" aria-hidden="true"></div>' +
    '<div class="dateline label"><span>' + esc(CHROME.name + ' · ' + CHROME.brand) + '</span><span>' + esc(dateline) + '</span></div>';
}
/**
 * shell(dateline) — clear the page, scroll to top, and (re)render the chrome.
 * Datelines by page: 'Order form' · 'Order confirmed' · 'One addition' · 'Receipt'.
 * shell(null) hides the broadsheet chrome (the checkout stand-in uses this).
 */
function shell(dateline) {
  clearError();
  app.innerHTML = '';
  window.scrollTo(0, 0);
  document.body.classList.toggle('checkout', dateline === null);
  renderMasthead(dateline || '');
  renderFooter(dateline || 'Local review build');
}
/* legacy alias used by older page code */
function clear() { shell(''); }

/* ── routing ───────────────────────────────────────────────────────────── */
function route(path) { history.pushState({}, '', path); }
function go(path, page) { route(path); PAGES[page](); }
function art(id) { return '/api/assets/' + enc(id); }

/**
 * bind(id, fn) — click handler with the button disabled while fn runs and
 * any thrown error shown in #error.
 */
function bind(id, fn) {
  $(id).addEventListener('click', async e => {
    e.preventDefault(); clearError();
    const b = e.currentTarget; b.disabled = true;
    try { await fn(); } catch (e) { error(e); } finally { b.disabled = false; }
  });
}

/* ── the test entry page (harness index; not a customer page) ──────────── */
PAGES.start = async function () {
  shell('Test entry');
  const { editions } = await api('editions');
  app.innerHTML =
    '<p class="step-label">Daily email · test entry</p>' +
    '<h1>Choose a reading.</h1>' +
    '<p class="bridge">Start with the daily letter, then follow its link through booking, the checkout stand-in and your order.</p>' +
    '<div class="daily-links">' + editions.map(e => '<a class="text-link" href="/email?edition=' + enc(e.id) + '">' + esc(e.question) + '</a>').join('') + '</div>';
};

/* ── boot: pick the page from the URL ──────────────────────────────────── */
async function boot() {
  try {
    const q = new URLSearchParams(location.search);
    const p = location.pathname;
    if (q.has('order')) {
      S.order = (await api('orders/' + enc(q.get('order')))).order;
      (p === '/bridge' ? PAGES.bridge : p === '/upsell' ? PAGES.upsell : PAGES.thankYou)();
    } else if (p === '/checkout-sim' && q.has('intake')) {
      S.intake = (await api('intake/' + enc(q.get('intake')))).intake;
      await loadEdition(S.intake.editionId);
      PAGES.checkoutSim();
    } else if (q.has('edition')) {
      await loadEdition(q.get('edition'));
      (p === '/email' ? PAGES.email : PAGES.booking)();
    } else {
      await PAGES.start();
    }
  } catch (e) {
    shell('');
    app.innerHTML = '<h1>Let’s find your reading.</h1><p class="bridge">This test link could not be loaded. <a href="/" class="text-link">Choose a reading</a>.</p>';
    error(e);
  }
}
