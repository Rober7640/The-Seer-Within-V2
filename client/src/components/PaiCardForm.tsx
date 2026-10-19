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
  phone: string;
  smsConsent?: 'yes' | 'no';
  shipping?: ShippingAddress;
}

// FramePay is initialised once per page; a second initialize() is not supported.
let booted: Promise<void> | null = null;

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
        transactionData: { currency: 'USD', amount: amountCents / 100 },
        // Text inside FramePay's iframe. FramePay drops any key outside its style
        // schema (base/focus/valid/invalid), so a typo here fails quietly.
        style: CARD_TEXT_STYLE,
      });
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

const labelCls = 'mb-1 block text-sm font-medium text-white/85';

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
}) {
  const { config, amountCents, askPhone = false, askShipping = false } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<any>(null);
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
  const mountId = useRef(`pai-card-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && !fieldRef.current) props.onBootFailed?.(new Error('payment form timed out'));
    }, 15000);
    (async () => {
      try {
        await bootFramepay(config, amountCents);
        if (cancelled) return;
        fieldRef.current = window.Framepay.card.mount(`#${mountId}`);
        setReady(true);
      } catch (err) {
        if (!cancelled) props.onBootFailed?.(err);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      try {
        fieldRef.current?.destroy?.();
      } catch {
        /* already gone */
      }
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (props.busy || !ready) return;
    setLocalError(null);
    const fullName = name.trim();
    if (!fullName) return setLocalError('Please enter the name on your card.');
    const cleanPhone = phone.replace(/[\s\-().]/g, '');
    if (askPhone && !/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
      return setLocalError('Please enter your phone number with the country code, e.g. +1 555 555 0123');
    }
    if (askShipping && (!ship.name.trim() || !ship.line1.trim() || !ship.city.trim() || !ship.postal.trim())) {
      return setLocalError('Please enter your full shipping address.');
    }
    const parts = fullName.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
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
      const cardToken = token?.id ?? token?.token ?? token;
      if (!cardToken || typeof cardToken !== 'string') throw new Error('no token');
      props.onSubmit({
        cardToken,
        phone: cleanPhone,
        ...(sms ? { smsConsent: sms } : {}),
        ...(askShipping ? { shipping: { ...ship, line2: ship.line2 || undefined } } : {}),
      });
    } catch (err: any) {
      setLocalError(err?.message && typeof err.message === 'string'
        ? `Please check your card details. (${err.message})`
        : 'Please check your card details.');
    }
  }

  const error = localError ?? props.error;

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-3" data-testid="pai-card-form">
      <div>
        <label htmlFor={`${mountId}-name`} className={labelCls}>Name on card</label>
        <input
          id={`${mountId}-name`}
          className={inputCls}
          placeholder="Name on card"
          autoComplete="cc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="pai-card-name"
        />
      </div>
      <div>
        <div id={`${mountId}-label`} className={labelCls}>Card details</div>
        {/* Fixed height: FramePay mounts <div.rebilly-framepay><iframe height:100%>
            inside this div, and with no height on that wrapper the iframe falls back
            to the browser's 150px default (the old, mostly-empty tall box). FramePay
            puts its focus/invalid classes on that wrapper, hence has-[…]. */}
        <div
          id={mountId}
          role="group"
          aria-labelledby={`${mountId}-label`}
          className="h-[50px] overflow-hidden rounded-lg border-2 border-gray-400 bg-white px-3 has-[.rebilly-framepay-focus]:border-purple-500 has-[.rebilly-framepay-invalid]:border-red-500 [&>.rebilly-framepay]:h-full"
          data-testid="pai-card-field"
        />
        <p className="mt-1 text-xs leading-snug text-white/60">
          Your 16-digit card number, expiry date (MM/YY), and the 3-digit code on the back.
        </p>
      </div>
      {!ready && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading secure card form…
        </div>
      )}

      {askPhone && (
        <div>
          <label htmlFor={`${mountId}-phone`} className={labelCls}>Phone number (with country code)</label>
          <input
            id={`${mountId}-phone`}
            className={inputCls}
            placeholder="e.g. +1 555 555 0123"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
              onChange={(e) => setShip({ ...ship, name: e.target.value })} data-testid="pai-ship-name" />
          </div>
          <div>
            <label htmlFor={`${mountId}-ship-line1`} className={labelCls}>Address line 1</label>
            <input id={`${mountId}-ship-line1`} className={inputCls} placeholder="Street address" value={ship.line1}
              onChange={(e) => setShip({ ...ship, line1: e.target.value })} data-testid="pai-ship-line1" />
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
        disabled={!ready || props.busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3.5 font-semibold text-white shadow-lg transition disabled:opacity-60"
        data-testid="pai-pay"
      >
        {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {props.busy ? 'Processing…' : props.submitLabel}
      </button>
      <p className="text-center text-[11px] text-white/40">
        <Lock className="mr-1 inline h-3 w-3" />
        Secure payment — your card details are encrypted and never stored on our servers.
      </p>
    </form>
  );
}
