/**
 * DEV-ONLY Payments.AI dummy funnel — the browser half of `/fb-tarot/pai`.
 *
 * Mirrors the live tarot money path (main + order bump -> upsell 1 -> upsell 2)
 * onto Payments.AI so we can see whether their written answers hold up inside our
 * actual funnel. It is deliberately a TEST HARNESS, not a lander: the creative is
 * already proven and is not what is in question here. What is in question is the
 * payment rail, so this page surfaces what a lander would hide — the transaction
 * ids, which metadata keys survived, whether the MIT guard fired, what the gateway
 * reported.
 *
 * The live lander (TarotBridge at /fb-tarot/c) is untouched by this file.
 *
 * The server half 404s everything unless NODE_ENV!=production AND PAI_DEV_FUNNEL=1
 * AND the API base is staging, so this page is inert in production even if routed.
 */
import { useEffect, useRef, useState } from 'react';

const FRAMEPAY_SRC = 'https://framepay.payments.ai/framepay.js';

type Stage = 'boot' | 'ready' | 'charging' | 'main-done' | 'error' | 'disabled';

interface MetadataAudit {
  kept: string[];
  dropped: string[];
  unexpectedlyDropped: string[];
  expectedDropped: string[];
}

interface ChargeResult {
  ok: boolean;
  transactionId?: string;
  result?: string;
  status?: string;
  amountReturned?: number;
  amountSentCents?: number;
  instrumentId?: string | null;
  customerId?: string;
  email?: string;
  gateway?: { name?: string; slug?: string };
  metadataAudit?: MetadataAudit;
  parentTransactionId?: string | null;
  blockedByGuard?: boolean;
  reason?: string;
  note?: string;
  error?: string;
  detail?: string;
}

declare global {
  interface Window {
    Framepay?: any;
  }
}

export default function PaiFunnelPage() {
  const [stage, setStage] = useState<Stage>('boot');
  const [log, setLog] = useState<string[]>([]);
  const [bumpApplied, setBumpApplied] = useState(true);
  const [main, setMain] = useState<ChargeResult | null>(null);
  const [u1, setU1] = useState<ChargeResult | null>(null);
  const [u2, setU2] = useState<ChargeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const say = (m: string) =>
    setLog((l) => [...l, `${new Date().toISOString().slice(11, 19)}  ${m}`]);

  // ── boot FramePay ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfgRes = await fetch('/api/pai/config');
        if (cfgRes.status === 404) {
          setStage('disabled');
          say('server route is 404 — PAI_DEV_FUNNEL is not enabled here');
          return;
        }
        const cfg = await cfgRes.json();
        if (!cfg.publishableKey) {
          setStage('error');
          say('no publishable key from /api/pai/config');
          return;
        }
        say(`config ok — org ${String(cfg.organizationId).slice(0, 8)}…, website ${cfg.websiteId ?? '(none)'}`);

        await new Promise<void>((resolve, reject) => {
          if (window.Framepay) return resolve();
          const s = document.createElement('script');
          s.src = FRAMEPAY_SRC;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`could not load ${FRAMEPAY_SRC}`));
          document.head.appendChild(s);
        });
        if (cancelled) return;
        say('framepay.js loaded');

        await window.Framepay.initialize({
          publishableKey: cfg.publishableKey,
          organizationId: cfg.organizationId,
          // Not enforced by their API and not bound to this page's origin —
          // both proven in scripts/audit/pai-r20-framepay-origin.mjs.
          ...(cfg.websiteId ? { websiteId: cfg.websiteId } : {}),
          transactionData: { currency: 'USD', amount: 35.0 },
        });
        if (cancelled) return;
        say('initialize() resolved');

        window.Framepay.on('ready', () => {
          try {
            window.Framepay.card.mount('#pai-card');
            say('card field mounted');
            setStage('ready');
          } catch (e) {
            say(`mount failed: ${String(e)}`);
            setStage('error');
          }
        });

        // Some builds fire `ready` before the handler attaches; mount defensively.
        setTimeout(() => {
          if (!cancelled && stage === 'boot') {
            try {
              window.Framepay.card.mount('#pai-card');
              say('card field mounted (fallback path)');
              setStage('ready');
            } catch {
              /* the ready handler will have done it */
            }
          }
        }, 2500);
      } catch (err) {
        if (!cancelled) {
          setStage('error');
          say(`boot failed: ${String(err)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── main + bump (customer-initiated) ────────────────────────────────────────
  async function payMain(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStage('charging');
    try {
      say('createToken()…');
      const token = await window.Framepay.createToken(formRef.current, {
        billingAddress: { firstName: 'PaiTest', lastName: 'PaiDev' },
      });
      const tokenId = token?.id ?? token?.token ?? token;
      say(`token: ${String(tokenId).slice(0, 24)}…`);

      const res = await fetch('/api/pai/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenId,
          firstName: 'PaiTest',
          email: 'lewis@theseerwithin.com', // server forces the +pai tag
          bucket: 'love',
          mainCents: 3500,
          bumpApplied,
          bumpCents: 977,
          bumpBucket: 'money',
          priceVariant: '35',
          posthogDistinctId: 'pai-dev-distinct',
          trackdeskClickId: 'pai-dev-td',
          gclid: 'pai-dev-gclid',
        }),
      });
      const data: ChargeResult = await res.json();
      setMain(data);
      say(`main -> ${data.result ?? data.error ?? 'no result'}`);
      setStage(data.ok ? 'main-done' : 'error');
    } catch (err) {
      say(`main charge failed: ${String(err)}`);
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  // ── upsells (merchant-initiated, behind the guard) ──────────────────────────
  async function payUpsell(which: 1 | 2) {
    if (busy || !main?.ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/pai/${which === 1 ? 'upsell' : 'upsell2'}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: main.customerId,
          instrumentId: main.instrumentId,
          mainTransactionId: main.transactionId,
          amountCents: 4700,
          firstName: 'PaiTest',
          email: main.email,
        }),
      });
      const data: ChargeResult = await res.json();
      (which === 1 ? setU1 : setU2)(data);
      say(
        data.blockedByGuard
          ? `upsell ${which} BLOCKED by MIT guard — ${data.reason}`
          : `upsell ${which} -> ${data.result ?? data.error ?? 'no result'}`,
      );
    } catch (err) {
      say(`upsell ${which} failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const box: React.CSSProperties = {
    border: '1px solid #333',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    background: '#12121a',
  };

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: 20,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#e6e6ee',
        background: '#0b0b12',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Payments.AI dev funnel</h1>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: 0 }}>
        Mirrors <code>/fb-tarot/c?hook=cards-after-marriage</code> (soulmate-ageband,
        bucket love) onto Payments.AI. Sandbox only — no real money. The live Stripe
        funnel is untouched.
      </p>

      {stage === 'disabled' && (
        <div style={{ ...box, borderColor: '#a33' }}>
          <strong>Disabled here.</strong> The server returns 404 unless
          <code> PAI_DEV_FUNNEL=1</code>, <code>NODE_ENV != production</code> and the
          Payments.AI base is staging.
        </div>
      )}

      {/* ── 1. main + bump ─────────────────────────────────────────────── */}
      <div style={box}>
        <strong>1 · Main + order bump (customer-initiated)</strong>
        <form ref={formRef} onSubmit={payMain} style={{ marginTop: 10 }}>
          <div
            id="pai-card"
            style={{
              background: '#fff',
              borderRadius: 6,
              padding: 10,
              minHeight: 44,
              marginBottom: 10,
            }}
          />
          <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={bumpApplied}
              onChange={(e) => setBumpApplied(e.target.checked)}
            />{' '}
            add the $9.77 order bump (charged as ONE transaction, as Stripe does)
          </label>
          <button
            type="submit"
            disabled={stage !== 'ready' || busy}
            style={{
              padding: '9px 16px',
              borderRadius: 6,
              border: 0,
              background: stage === 'ready' && !busy ? '#4f7cff' : '#333',
              color: '#fff',
              cursor: stage === 'ready' && !busy ? 'pointer' : 'default',
            }}
          >
            {busy ? 'charging…' : `Pay $${bumpApplied ? '44.77' : '35.00'}`}
          </button>
        </form>
        {main && <ResultBlock label="main" r={main} />}
      </div>

      {/* ── 2 + 3. upsells ─────────────────────────────────────────────── */}
      <div style={{ ...box, opacity: main?.ok ? 1 : 0.45 }}>
        <strong>2 · Upsell 1 — $47, one click (merchant-initiated)</strong>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Refuses unless the originating transaction reads <code>approved</code>. Their
          platform does not enforce this; MasterCard does from 23 October.
        </p>
        <button onClick={() => payUpsell(1)} disabled={!main?.ok || busy} style={btn(!!main?.ok && !busy)}>
          Charge upsell 1
        </button>
        {u1 && <ResultBlock label="upsell1" r={u1} />}
      </div>

      <div style={{ ...box, opacity: main?.ok ? 1 : 0.45 }}>
        <strong>3 · Upsell 2 — $47, one click (merchant-initiated)</strong>
        <button onClick={() => payUpsell(2)} disabled={!main?.ok || busy} style={btn(!!main?.ok && !busy)}>
          Charge upsell 2
        </button>
        {u2 && <ResultBlock label="upsell2" r={u2} />}
      </div>

      <div style={box}>
        <strong>Log</strong>
        <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '8px 0 0', opacity: 0.85 }}>
          {log.join('\n') || '…'}
        </pre>
      </div>
    </div>
  );
}

function btn(on: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 6,
    border: 0,
    background: on ? '#4f7cff' : '#333',
    color: '#fff',
    cursor: on ? 'pointer' : 'default',
  };
}

function ResultBlock({ label, r }: { label: string; r: ChargeResult }) {
  const a = r.metadataAudit;
  const good = r.ok;
  return (
    <div
      style={{
        marginTop: 10,
        borderLeft: `3px solid ${r.blockedByGuard ? '#e0a800' : good ? '#2e9e5b' : '#c14'}`,
        paddingLeft: 10,
        fontSize: 12.5,
      }}
    >
      <div>
        <strong>{label}</strong>{' '}
        {r.blockedByGuard ? 'BLOCKED BY GUARD' : good ? 'approved' : `failed — ${r.error ?? r.result ?? ''}`}
      </div>
      {r.reason && <div style={{ opacity: 0.8 }}>reason: {r.reason}</div>}
      {r.note && <div style={{ opacity: 0.7 }}>{r.note}</div>}
      {r.transactionId && <div>txn: {r.transactionId}</div>}
      {r.instrumentId && <div>instrument: {r.instrumentId}</div>}
      {typeof r.amountReturned !== 'undefined' && (
        <div>
          amount sent {r.amountSentCents}¢ · returned{' '}
          <strong>{String(r.amountReturned)}</strong>{' '}
          <span style={{ opacity: 0.65 }}>
            ({r.amountReturned === (r.amountSentCents ?? 0) / 100
              ? 'decimal dollars'
              : r.amountReturned === r.amountSentCents
                ? 'minor units'
                : 'UNRECOGNISED SCALE'}
            )
          </span>
        </div>
      )}
      {r.gateway?.name && (
        <div>
          gateway: {r.gateway.name} / {r.gateway.slug ?? '—'}
        </div>
      )}
      {'parentTransactionId' in r && (
        <div>parentTransactionId: {String(r.parentTransactionId)}</div>
      )}
      {a && (
        <div style={{ marginTop: 6 }}>
          <div>
            metadata kept {a.kept.length}/{a.kept.length + a.dropped.length}
          </div>
          {a.expectedDropped.length > 0 && (
            <div style={{ color: '#e0a800' }}>
              expected-dropped (registered 22 Sep): {a.expectedDropped.join(', ')}
            </div>
          )}
          {a.unexpectedlyDropped.length > 0 && (
            <div style={{ color: '#ff6b6b' }}>
              UNEXPECTEDLY DROPPED: {a.unexpectedlyDropped.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
