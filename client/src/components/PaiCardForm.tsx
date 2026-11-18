/**
 * The Payments.AI card form — FramePay card field + name on card (+ phone and the
 * SMS question at the main checkout, + a shipping address on the upsell card page).
 *
 * Used by the live Stripe-vs-Payments.AI split in two places:
 *   - <PaiCheckoutPage/> — `<funnel>/checkout`, where the chat sends her instead of Stripe
 *   - <PaiPayPage/>      — an upsell whose 1-click charge was declined
 *
 * The card number never touches our page or server: FramePay draws it in its own
 * iframe and hands back a one-time token, which is all we send on.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { normalizePhone, PHONE_ERROR } from '@shared/phone';
import {
  trackCardCompleted,
  trackFieldStarted,
  trackPayClicked,
  type CheckoutStepContext,
} from '@/lib/checkoutSteps';

const FRAMEPAY_SRC = 'https://framepay.payments.ai/framepay.js';

declare global {
  interface Window {
    Framepay?: any;
  }
}

export interface PaiFormConfig {
  publishableKey: string;
  organizationId: string;
  websiteId?: string;
  sms: null | { label: string; yesLabel: string; noLabel: string; disclosure: string };
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

export interface PaiCardSubmit {
  cardToken: string;
  /** "Name on card" as she typed it — the server makes the PAI customer's name from it. */
  cardName: string;
  phone: string;
  smsConsent?: 'yes' | 'no';
  shipping?: ShippingAddress;
  /** Typed card, or Apple Pay / Google Pay. The charge itself is the same either way. */
  payMethod?: 'card' | 'wallet';
}

// FramePay is initialised once per page; a second initialize() is not supported.
let booted: Promise<void> | null = null;

/** What Apple Pay / Google Pay hand back alongside the one-time token. */
export interface WalletExtras {
  name?: string;
  phone?: string;
  emailAddress?: string;
}
type WalletHandler = (token: any, extras: WalletExtras | undefined) => void;
// One page-wide 'token-ready' listener (FramePay emits wallet tokens on its own
// bus); it forwards to whichever card form is currently on screen.
let walletHandler: WalletHandler | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Framepay) return resolve();
    const s = document.createElement('script');
    s.src = FRAMEPAY_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('payment form script did not load'));
    document.head.appendChild(s);
  });
}

function bootFramepay(cfg: PaiFormConfig, amountCents: number): Promise<void> {
  if (!booted) {
    booted = (async () => {
      await loadScript();
      await window.Framepay.initialize({
        publishableKey: cfg.publishableKey,
        organizationId: cfg.organizationId,
        ...(cfg.websiteId ? { websiteId: cfg.websiteId } : {}),
        // `label` is what Apple Pay / Google Pay show on their pay sheet. FramePay
        // only asks Payments.AI which wallets are switched on when a websiteId is
        // set — without one this stays card-only, exactly as before.
        transactionData: { currency: 'USD', amount: amountCents / 100, label: WALLET_LABEL },
        // Text inside FramePay's iframe. FramePay drops any key outside its style
        // schema (base/focus/valid/invalid), so a typo here fails quietly.
        style: CARD_TEXT_STYLE,
      });
      window.Framepay.on?.('token-ready', (token: any, extras?: WalletExtras) => walletHandler?.(token, extras));
      // 🔴 FramePay switches ITSELF off on ANY 'error' event (its own
      // setInitializedToFalseOnError listener) — and a wallet that isn't available
      // here (Apple Pay on Android/Windows, an insecure page, …) emits one. Without
      // this, the card form then fails every Pay with "FramePay hasn't been
      // initialized". Set-up is finished at this point, so drop that listener: a
      // wallet problem now only hides that wallet, the card keeps working.
      const fp = window.Framepay;
      if (typeof fp.setInitializedToFalseOnError === 'function') fp.off?.('error', fp.setInitializedToFalseOnError);
    })().catch((err) => {
      booted = null; // let a later attempt retry
      throw err;
    });
  }
  return booted;
}

/** Just enough markdown for the SMS disclosure: **bold** and [links](url). */
function Disclosure({ md }: { md: string }) {
  const parts = md.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        const bold = p.match(/^\*\*(.+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        const link = p.match(/^\[(.+)\]\((.+)\)$/);
        if (link)
          return (
            <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="underline text-purple-300">
              {link[1]}
            </a>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

const COUNTRIES: Array<[string, string]> = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['SG', 'Singapore'],
];

// Bigger, darker text in the card box — older buyers couldn't read the default
// small grey text (16 Oct).
const CARD_TEXT_STYLE = {
  base: {
    fontSize: '17px',
    color: '#111827',
    '::placeholder': { color: '#6b7280' },
  },
  invalid: { color: '#b91c1c' },
};

const WALLET_LABEL = 'The Seer Within';

/** Card-form rules for the phone box, shared by the card and wallet paths — and with
 *  the server (shared/phone.ts): a plain US number gets its +1, so it is accepted. */
const cleanPhoneOf = (raw: string) => normalizePhone(raw) ?? raw.replace(/[\s\-().]/g, '');
const isFullPhone = (p: string) => normalizePhone(p) !== null;

/** The one-time token id, whatever shape FramePay hands it back in. */
function tokenIdOf(token: any): string | null {
  const id = token?.id ?? token?.token ?? token;
  return typeof id === 'string' && id ? id : null;
}

/** Name for the Payments.AI customer: the wallet's billing name, else what she typed. */
function walletNameOf(token: any, extras: WalletExtras | undefined, typed: string): string {
  const b = token?.billingAddress;
  const fromBilling = [b?.firstName, b?.lastName].filter(Boolean).join(' ').trim();
  return fromBilling || (extras?.name ?? '').trim() || typed.trim();
}

/** A phone the wallet passed along (Apple Pay asks for one; Google Pay usually doesn't). */
function walletPhoneOf(token: any, extras: WalletExtras | undefined): string {
  const fromBilling = token?.billingAddress?.phoneNumbers?.[0]?.value;
  return cleanPhoneOf(String(extras?.phone ?? fromBilling ?? ''));
}

const labelCls = 'mb-1 block text-sm font-medium text-white/85';

// The three FramePay card boxes. Fixed height: FramePay mounts
// <div.rebilly-framepay><iframe height:100%> inside each, and with no height on
// that wrapper the iframe falls back to the browser's 150px default (the old,
// mostly-empty tall box). FramePay puts its focus/invalid classes on that
// wrapper, hence has-[…].
const cardBoxCls =
  'h-[50px] overflow-hidden rounded-lg border-2 border-gray-400 bg-white px-3 has-[.rebilly-framepay-focus]:border-purple-500 has-[.rebilly-framepay-invalid]:border-red-500 [&>.rebilly-framepay]:h-full';

// Wallet buttons: same 150px-iframe trap as the card boxes, so size FramePay's
// wrapper (only when it is actually showing — a hidden one stays zero height,
// which is how we know not to draw the "or pay by card" line).
const walletBoxCls =
  '[&>.rebilly-framepay]:h-12 [&>.rebilly-framepay]:overflow-hidden [&>.rebilly-framepay]:rounded-lg [&_iframe]:!h-full';

const inputCls =
  'w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white placeholder-white/35 focus:border-purple-400 focus:outline-none';

export function PaiCardForm(props: {
  config: PaiFormConfig;
  amountCents: number;
  submitLabel: string;
  /** Main checkout: phone is compulsory, as on every Stripe V1 checkout. */
  askPhone?: boolean;
  askShipping?: boolean;
  defaultName?: string;
  busy: boolean;
  error?: string | null;
  onSubmit: (s: PaiCardSubmit) => void;
  onBootFailed?: (err: unknown) => void;
  /** Step tracking (lib/checkoutSteps.ts): which checkout this form is on. */
  track?: CheckoutStepContext;
}) {
  const { config, amountCents, askPhone = false, askShipping = false } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<any[] | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(props.defaultName ?? '');
  const [phone, setPhone] = useState('');
  const [sms, setSms] = useState<'' | 'yes' | 'no'>('');
  const [ship, setShip] = useState<ShippingAddress>({
    name: props.defaultName ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal: '',
    country: 'US',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  /** At least one wallet button actually drew on this device. */
  const [walletShown, setWalletShown] = useState(false);
  /** A wallet token waiting for a detail she still has to type (phone / address). */
  const [heldWallet, setHeldWallet] = useState<{ token: string; name: string; wallet: string } | null>(null);
  /**
   * Pay was pressed and the card is being secured by Payments.AI (createToken) —
   * 1-3 s on a phone, BEFORE the page's own `busy` starts. Without this the button
   * looked dead for that time and buyers pressed again (Lewis, 18 Nov). The ref
   * blocks a second press in the same instant; the state drives what she sees.
   */
  const [securing, setSecuring] = useState(false);
  const securingRef = useRef(false);
  const working = props.busy || securing;
  const mountId = useRef(`pai-card-${Math.random().toString(36).slice(2, 8)}`).current;

  // ── Step tracking: "first field filled in" and "card details completed", each
  // once per page. Card-box state comes from FramePay's own change events.
  const startedRef = useRef(false);
  const cardDoneRef = useRef(false);
  const cardPartsRef = useRef<Record<string, boolean>>({});
  function fieldStarted(field: string) {
    if (startedRef.current || !props.track) return;
    startedRef.current = true;
    trackFieldStarted(props.track, field);
  }
  // FramePay's change event (proven in the sandbox, 18 Nov): it fires on every
  // keystroke as {valid, source, completed}. `valid` is TRUE FROM THE FIRST DIGIT
  // (it only means "nothing wrong so far"); `completed` turns true once the box is
  // fully filled. So: any change = she started; completed && valid = that box is done.
  function cardPartChanged(part: string, ev: any) {
    fieldStarted(part);
    cardPartsRef.current[part] = ev?.completed === true && ev?.valid !== false;
    const parts = cardPartsRef.current;
    if (!cardDoneRef.current && props.track && parts.cardNumber && parts.cardExpiry && parts.cardCvv) {
      cardDoneRef.current = true;
      trackCardCompleted(props.track);
    }
  }

  /** What she still has to fill in besides the card itself, or null when nothing. */
  function missingDetail(phoneNow: string): string | null {
    if (askPhone && !isFullPhone(phoneNow)) return PHONE_ERROR;
    if (askShipping && (!ship.name.trim() || !ship.line1.trim() || !ship.city.trim() || !ship.postal.trim())) {
      return 'Please enter your full shipping address.';
    }
    return null;
  }

  function send(token: string, cardName: string, phoneNow: string, payMethod: 'card' | 'wallet') {
    props.onSubmit({
      cardToken: token,
      cardName,
      phone: phoneNow,
      payMethod,
      ...(sms ? { smsConsent: sms } : {}),
      ...(askShipping ? { shipping: { ...ship, line2: ship.line2 || undefined } } : {}),
    });
  }

  // Apple Pay / Google Pay finished: pay straight away if we have everything,
  // otherwise hold the token and ask only for what's missing (Google Pay gives
  // no phone, and the SMS list needs one).
  function onWalletToken(token: any, extras: WalletExtras | undefined) {
    if (props.busy || securingRef.current) return;
    const id = tokenIdOf(token);
    if (!id) return setLocalError('That payment did not go through. Please try again or pay by card.');
    const kind = String(token?.method ?? token?.paymentInstrument?.method ?? '').toLowerCase();
    const wallet = kind.includes('apple') ? 'apple_pay' : kind.includes('google') ? 'google_pay' : undefined;
    if (props.track) trackPayClicked(props.track, 'wallet', wallet);
    const cardName = walletNameOf(token, extras, name) || 'Friend';
    let phoneNow = cleanPhoneOf(phone);
    if (askPhone && !isFullPhone(phoneNow)) {
      const fromWallet = walletPhoneOf(token, extras);
      if (isFullPhone(fromWallet)) {
        phoneNow = fromWallet;
        setPhone(fromWallet);
      }
    }
    const missing = missingDetail(phoneNow);
    if (missing) {
      // Hold the token and show ONLY what's still needed (phone / address): the card
      // boxes hide while she finishes, and a calm note — not a red error — says what
      // to do (Lewis + PH tester, 18 Nov: the old red box over a full card form
      // confused people).
      setHeldWallet({
        token: id,
        name: cardName,
        wallet: wallet === 'apple_pay' ? 'Apple Pay' : wallet === 'google_pay' ? 'Google Pay' : 'Your wallet',
      });
      return setLocalError(null);
    }
    setLocalError(null);
    send(id, cardName, phoneNow, 'wallet');
  }

  // A wallet token is single-use: once the server answered with an error (declined
  // etc.), drop it so the next press starts fresh instead of re-sending a dead token.
  useEffect(() => {
    if (props.error) setHeldWallet(null);
  }, [props.error]);

  // Always point the page-wide wallet listener at this render's state.
  useEffect(() => {
    walletHandler = onWalletToken;
  });
  useEffect(() => () => {
    walletHandler = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && !fieldRef.current) props.onBootFailed?.(new Error('payment form timed out'));
    }, 15000);
    // Show the "or pay by card" divider only once a wallet button really drew —
    // FramePay quietly draws nothing when a wallet isn't available here.
    let observer: MutationObserver | null = null;
    const watchWallets = () => {
      const boxes = [`${mountId}-apple`, `${mountId}-google`]
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => !!el);
      // Height, not "has children": FramePay may add a hidden wrapper for an
      // unavailable wallet.
      const check = () => {
        if (!cancelled && boxes.some((b) => b.offsetHeight > 10)) {
          setWalletShown(true);
          observer?.disconnect();
        }
      };
      observer = new MutationObserver(check);
      for (const b of boxes) observer.observe(b, { childList: true, subtree: true, attributes: true });
      check();
    };
    (async () => {
      try {
        await bootFramepay(config, amountCents);
        if (cancelled) return;
        // Three separate boxes (number / expiry / code) instead of FramePay's
        // one-line combined field, which hid the code box until the number was typed.
        fieldRef.current = [
          window.Framepay.card.mount(`#${mountId}`, 'cardNumber'),
          window.Framepay.card.mount(`#${mountId}-exp`, 'cardExpiry'),
          window.Framepay.card.mount(`#${mountId}-cvv`, 'cardCvv'),
        ];
        // Step tracking only — a failure here must never touch the card form.
        (['cardNumber', 'cardExpiry', 'cardCvv'] as const).forEach((part, i) => {
          try {
            fieldRef.current?.[i]?.on?.('change', (ev: any) => cardPartChanged(part, ev));
          } catch {
            /* no change events on this FramePay build — steps 2-3 just won't fire */
          }
        });
        setReady(true);
        // Wallet buttons. Each draws only if Payments.AI has it switched on for
        // this site AND the device supports it (Apple Pay: Safari / iPhone). Any
        // failure here leaves the card form exactly as it was.
        for (const [wallet, el] of [
          ['applePay', `#${mountId}-apple`],
          ['googlePay', `#${mountId}-google`],
        ] as const) {
          try {
            const field = window.Framepay[wallet]?.mount(el);
            if (field) fieldRef.current.push(field);
          } catch (err) {
            console.info(`[pai] ${wallet} not shown`, err);
          }
        }
        watchWallets();
      } catch (err) {
        if (!cancelled) props.onBootFailed?.(err);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer?.disconnect();
      for (const field of fieldRef.current ?? []) {
        try {
          field?.destroy?.();
        } catch {
          /* already gone */
        }
      }
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (props.busy || !ready || securingRef.current) return;
    setLocalError(null);
    if (!heldWallet && props.track) trackPayClicked(props.track, 'card');
    const cleanPhone = cleanPhoneOf(phone);
    // Finishing a wallet payment that was waiting on her phone / address.
    if (heldWallet) {
      const missing = missingDetail(cleanPhone);
      if (missing) return setLocalError(missing);
      return send(heldWallet.token, heldWallet.name, cleanPhone, 'wallet');
    }
    const fullName = name.trim();
    if (!fullName) return setLocalError('Please enter the name on your card.');
    const missing = missingDetail(cleanPhone);
    if (missing) return setLocalError(missing);
    const parts = fullName.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    // From here until the page takes over (its `busy`), the button shows Processing.
    securingRef.current = true;
    setSecuring(true);
    try {
      // Payments.AI's shape (support, 9 Oct): phoneNumbers is an ARRAY on the token.
      const token = await window.Framepay.createToken(formRef.current, {
        method: 'payment-card',
        billingAddress: {
          firstName,
          lastName,
          ...(askPhone ? { phoneNumbers: [{ label: 'main', value: cleanPhone }] } : {}),
        },
      });
      const cardToken = tokenIdOf(token);
      if (!cardToken) throw new Error('no token');
      send(cardToken, fullName, cleanPhone, 'card');
    } catch (err: any) {
      setLocalError(err?.message && typeof err.message === 'string'
        ? `Please check your card details. (${err.message})`
        : 'Please check your card details.');
    } finally {
      // send() → the page's pay() sets `busy` in this same tick, so the button goes
      // straight from "securing" to "busy" with no flicker; on a card error it unlocks.
      securingRef.current = false;
      setSecuring(false);
    }
  }

  // While a NEW wallet payment is being finished, an older server error (e.g. the
  // previous attempt's decline) is stale — hide it under the green note. A decline of
  // THIS attempt clears heldWallet (effect above), so it still shows.
  const error = localError ?? (heldWallet ? null : props.error);

  /** Back to the full form (wallet buttons + card boxes), dropping the held wallet token. */
  function switchToCard() {
    setHeldWallet(null);
    setLocalError(null);
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3" data-testid="pai-card-form">
      {heldWallet && (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100" data-testid="pai-wallet-held">
          <div className="font-semibold">✓ {heldWallet.wallet} approved</div>
          <div className="mt-1 text-emerald-100/85">
            Just {askPhone && askShipping ? 'add your phone number and shipping address' : askShipping ? 'add your shipping address' : 'add your phone number'} below, then press <strong>Finish payment</strong>.
          </div>
          <button type="button" onClick={switchToCard} className="mt-2 text-xs text-white/60 underline" data-testid="pai-wallet-change">
            Use a different card instead
          </button>
        </div>
      )}
      {/* Wallet buttons + card boxes. While a wallet payment is being finished they are
          HIDDEN (CSS only — the card iframes stay mounted, so "Use a different card"
          brings them straight back). A normal card payment never sets heldWallet, so
          for card buyers this block is exactly as before. */}
      <div className={heldWallet ? 'hidden' : 'space-y-3'} data-testid="pai-card-section">
      {/* Apple Pay / Google Pay. Empty (zero height) when not available here. */}
      <div className="space-y-2" data-testid="pai-wallets">
        <div id={`${mountId}-apple`} className={walletBoxCls} data-testid="pai-apple-pay" />
        <div id={`${mountId}-google`} className={walletBoxCls} data-testid="pai-google-pay" />
      </div>
      {walletShown && (
        <div className="flex items-center gap-3 text-xs text-white/55" data-testid="pai-wallet-divider">
          <span className="h-px flex-1 bg-white/15" />
          or pay by card
          <span className="h-px flex-1 bg-white/15" />
        </div>
      )}
      <div>
        <label htmlFor={`${mountId}-name`} className={labelCls}>Name on card</label>
        <input
          id={`${mountId}-name`}
          className={inputCls}
          placeholder="Name on card"
          autoComplete="cc-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            fieldStarted('name');
          }}
          data-testid="pai-card-name"
        />
      </div>
      <div>
        <div id={`${mountId}-label`} className={labelCls}>Card number</div>
        <div
          id={mountId}
          role="group"
          aria-labelledby={`${mountId}-label`}
          className={cardBoxCls}
          data-testid="pai-card-field"
        />
        <p className="mt-1 text-xs leading-snug text-white/60">The long number on the front of your card.</p>
      </div>
      <div>
        <div id={`${mountId}-exp-label`} className={labelCls}>Expiry date</div>
        <div
          id={`${mountId}-exp`}
          role="group"
          aria-labelledby={`${mountId}-exp-label`}
          className={cardBoxCls}
          data-testid="pai-card-exp"
        />
        <p className="mt-1 text-xs leading-snug text-white/60">Month and year, as shown on your card (MM / YY).</p>
      </div>
      <div>
        <div id={`${mountId}-cvv-label`} className={labelCls}>CVV</div>
        <div
          id={`${mountId}-cvv`}
          role="group"
          aria-labelledby={`${mountId}-cvv-label`}
          className={cardBoxCls}
          data-testid="pai-card-cvv"
        />
        <p className="mt-1 text-xs leading-snug text-white/60">The 3 digits on the back of your card (Amex: 4 digits on the front).</p>
      </div>
      {!ready && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading secure card form…
        </div>
      )}
      </div>

      {askPhone && (
        <div>
          <label htmlFor={`${mountId}-phone`} className={labelCls}>Phone number</label>
          <input
            id={`${mountId}-phone`}
            className={inputCls}
            placeholder="e.g. 555 555 0123 (outside the US: +country code)"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              fieldStarted('phone');
            }}
            data-testid="pai-phone"
          />
        </div>
      )}

      {askPhone && config.sms && (
        <div className="space-y-1">
          <label className="block text-sm text-white/80">{config.sms.label}</label>
          <select
            className={inputCls}
            value={sms}
            onChange={(e) => setSms(e.target.value as '' | 'yes' | 'no')}
            data-testid="pai-sms"
          >
            <option value="">Choose…</option>
            <option value="yes">{config.sms.yesLabel}</option>
            <option value="no">{config.sms.noLabel}</option>
          </select>
          <p className="text-[11px] leading-snug text-white/45">
            <Disclosure md={config.sms.disclosure} />
          </p>
        </div>
      )}

      {askShipping && (
        <div className="space-y-2 pt-1">
          <div className="text-base font-semibold text-white">Shipping address</div>
          <div>
            <label htmlFor={`${mountId}-ship-name`} className={labelCls}>Full name</label>
            <input id={`${mountId}-ship-name`} className={inputCls} placeholder="Full name" value={ship.name}
              onChange={(e) => { setShip({ ...ship, name: e.target.value }); fieldStarted('shipping'); }} data-testid="pai-ship-name" />
          </div>
          <div>
            <label htmlFor={`${mountId}-ship-line1`} className={labelCls}>Address line 1</label>
            <input id={`${mountId}-ship-line1`} className={inputCls} placeholder="Street address" value={ship.line1}
              onChange={(e) => { setShip({ ...ship, line1: e.target.value }); fieldStarted('shipping'); }} data-testid="pai-ship-line1" />
          </div>
          <div>
            <label htmlFor={`${mountId}-ship-line2`} className={labelCls}>Address line 2 (optional)</label>
            <input id={`${mountId}-ship-line2`} className={inputCls} placeholder="Apartment, suite, etc." value={ship.line2}
              onChange={(e) => setShip({ ...ship, line2: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${mountId}-ship-city`} className={labelCls}>City</label>
              <input id={`${mountId}-ship-city`} className={inputCls} placeholder="City" value={ship.city}
                onChange={(e) => setShip({ ...ship, city: e.target.value })} data-testid="pai-ship-city" />
            </div>
            <div>
              <label htmlFor={`${mountId}-ship-state`} className={labelCls}>State / County</label>
              <input id={`${mountId}-ship-state`} className={inputCls} placeholder="State / County" value={ship.state}
                onChange={(e) => setShip({ ...ship, state: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${mountId}-ship-postal`} className={labelCls}>ZIP / Postcode</label>
              <input id={`${mountId}-ship-postal`} className={inputCls} placeholder="ZIP / Postcode" value={ship.postal}
                onChange={(e) => setShip({ ...ship, postal: e.target.value })} data-testid="pai-ship-postal" />
            </div>
            <div>
              <label htmlFor={`${mountId}-ship-country`} className={labelCls}>Country</label>
              <select id={`${mountId}-ship-country`} className={inputCls} value={ship.country}
                onChange={(e) => setShip({ ...ship, country: e.target.value })}>
                {COUNTRIES.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" data-testid="pai-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!ready || working}
        aria-busy={working}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3.5 font-semibold text-white shadow-lg transition disabled:opacity-60"
        data-testid="pai-pay"
      >
        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {working ? 'Processing…' : heldWallet ? 'Finish payment' : props.submitLabel}
      </button>
      <p className="text-center text-[11px] text-white/40">
        <Lock className="mr-1 inline h-3 w-3" />
        Secure payment — your card details are encrypted and never stored on our servers.
      </p>
    </form>
  );
}
