import { useState, useEffect } from 'react';
import { useSearch, useLocation, Link } from 'wouter';
import { SoulmateShippingForm, type ShippingFormSubmission } from '../components/soulmate/SoulmateShippingForm';
import { track as trackPH, getDistinctId } from '@/lib/posthog';
import { trackPurchase, trackUpsellPurchase } from '@/lib/facebook';

const STEPS = [
  { img: '/soulmate/step1.png', title: 'Set Your Intention',                  body: "Take a moment to reflect on your deepest desire for love and connection. Write this wish or intention on the provided wish paper. Be clear and specific, as this will help focus the energy on manifesting your soulmate." },
  { img: '/soulmate/step2.png', title: 'Place the Wish Paper in the Capsule', body: "Once you've written your wish, carefully roll up the paper and place it inside the bracelet's capsule. This keeps your intention close to you, serving as a constant reminder of the love you are attracting." },
  { img: '/soulmate/step3.png', title: 'Wear the Bracelet Daily',              body: "Put on your Soulmate Attraction Bracelet and wear it daily. As you go about your day, allow the bracelet to serve as a talisman, continuously connecting you to the energy of your soulmate." },
  { img: '/soulmate/step5.png', title: 'Focus on Your Wish',                   body: "Throughout the day, whenever you notice the bracelet on your wrist, take a moment to focus on your wish. Visualize your soulmate coming into your life, and feel the love and connection growing stronger." },
  { img: '/soulmate/step4.png', title: 'Trust the Process',                    body: "Trust that the energy of the bracelet, combined with your focused intention, is drawing your soulmate closer. Have faith in the process and know that your soulmate will come to you in perfect divine timing." },
];

type State = 'offer' | 'collecting_shipping' | 'charging' | 'success' | 'declined';

// Matches original .h2 — Merriweather 30px #1b1b1e
const h2Style: React.CSSProperties = {
  fontFamily: 'Merriweather, serif',
  fontSize: 30,
  fontWeight: 700,
  color: '#1b1b1e',
  marginBottom: 20,
  lineHeight: 1.3,
  textAlign: 'center',
};

// Matches original .h2.small — blue 24px used for step titles
const h2SmallStyle: React.CSSProperties = {
  fontFamily: 'Merriweather, serif',
  fontSize: 24,
  fontWeight: 700,
  color: '#41a7ec',
  marginBottom: 8,
  lineHeight: 1.4,
};

// Matches original .p-text — 18px left-aligned line-height 1.4
const pStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 18,
  lineHeight: 1.4,
  marginBottom: 20,
  color: '#333',
};

export default function SoulmateUpsellPage() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get('session_id');

  const [state, setState] = useState<State>('offer');

  const raw = sessionStorage.getItem('soulmate_form');
  const formData = raw ? JSON.parse(raw) : null;
  const firstName = formData?.firstName || '';
  const email     = formData?.email     || '';

  // FB Purchase fire — user landed here ONLY because the sketch Stripe Checkout
  // succeeded (Stripe success URL = /soulmate/gift?session_id=...). Browser
  // Pixel uses deterministic event_id `purchase_<sessionId>` matching the
  // server-side webhook fire so the two dedup. skipServerRelay because the
  // Stripe webhook already fires CAPI Purchase. Auto-routes to soulmate pixel
  // via shared/fbPixelConfig.ts. Guard: sessionId required, sessionStorage
  // dedup prevents a duplicate fire on React StrictMode double-mount.
  useEffect(() => {
    if (!sessionId) return;
    const dedupKey = `soulmate_purchase_fired_${sessionId}`;
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, '1');
    const priceCents = Number(sessionStorage.getItem('soulmate_sketch_price_cents') || '0');
    trackPurchase(
      priceCents / 100,
      'USD',
      email,
      'Soulmate Sketch',
      sessionId,
      { skipServerRelay: true },
    );
  }, [sessionId, email]);

  const handleAddToCart = () => {
    trackPH('upsell_accepted', { funnel: 'soulmate', step: 'upsell1', product: 'soulmate_bracelet' });
    setState('collecting_shipping');
  };

  const handleShippingSubmit = async (payload: ShippingFormSubmission) => {
    setState('charging');
    trackPH('upsell_purchase_initiated', { funnel: 'soulmate', step: 'upsell1', product: 'soulmate_bracelet' });
    try {
      if (sessionId) {
        const res = await fetch('/api/soulmate/upsell/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, email, firstName, ...payload, posthogDistinctId: getDistinctId() }),
        });
        const data = await res.json();
        if (data.success) {
          // FB Upsell fire — soulmate_bracelet ($47). Uses 'sm' slot so the
          // event_id `upsell_sm_<sessionId>` matches the server-side webhook
          // fire. skipServerRelay because the Stripe webhook handles CAPI.
          trackUpsellPurchase(
            47,
            'USD',
            email,
            'Soulmate Bracelet',
            sessionId || undefined,
            'sm',
            { skipServerRelay: true },
          );
          // Mark shipping as collected in THIS sketch session so /gift2 knows
          // to take Path A (1-click reuse). Without this, /gift2 falls back to
          // querying the DB by email — which leaks shipping across sessions.
          if (sessionId) {
            sessionStorage.setItem('soulmate_upsell1_shipping_session', sessionId);
          }
          navigate('/soulmate/gift2' + (sessionId ? `?session_id=${sessionId}` : ''));
          return;
        }
        if (data.fallback && data.url) { window.location.href = data.url; return; }
      }
      setState('collecting_shipping');
    } catch {
      setState('collecting_shipping');
    }
  };

  const handleDecline = () => {
    trackPH('upsell_declined', { funnel: 'soulmate', step: 'upsell1', product: 'soulmate_bracelet' });
    // AWeber: tag for recovery drip (fire-and-forget)
    if (email) {
      fetch('/api/soulmate/upsell-declined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, product: 'soulmate_bracelet' }),
      }).catch(() => { /* non-blocking */ });
    }
    navigate('/soulmate/gift2' + (sessionId ? `?session_id=${sessionId}` : ''));
  };

  // ── Post-purchase success ──
  if (state === 'success') {
    return (
      <div style={{ background: '#fdf8f0', fontFamily: 'sans-serif' }} className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white max-w-md w-full mx-auto p-10 rounded shadow text-center">
          <h2 style={{ ...h2Style, fontSize: 22 }} className="mb-3">Thank You{firstName ? `, ${firstName}` : ''}!</h2>
          <p style={{ ...pStyle, textAlign: 'center' }}>
            Your Rose Quartz Soulmate Attraction Bracelet has been added to your order.
            Your Soulmate Sketch will arrive by email within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  // ── Declined ──
  if (state === 'declined') {
    return (
      <div style={{ background: '#fdf8f0', fontFamily: 'sans-serif' }} className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white max-w-md w-full mx-auto p-10 rounded shadow text-center">
          <h2 style={{ ...h2Style, fontSize: 22 }} className="mb-3">Your Sketch Is Being Prepared</h2>
          <p style={{ ...pStyle, textAlign: 'center' }}>
            Thank you{firstName ? `, ${firstName}` : ''}. Evelyn will send your Complete Soulmate Sketch within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', fontFamily: 'sans-serif' }} className="min-h-screen">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
        .merri   { font-family: 'Merriweather', Georgia, serif; }
        .cursive { font-family: 'Great Vibes', cursive; font-size: 50px; font-weight: 700; color: #41a7ec; text-shadow: 0 4px 2px rgba(0,0,0,0.1); }
        .upsell-btn {
          display: block;
          width: 100%;
          text-align: center;
          background-color: #41a7ec;
          border-top: 3px solid #63bcf5;
          border-bottom: 3px solid #2d8bc7;
          border-left: none; border-right: none;
          border-radius: 5px;
          padding: 20px 40px;
          font-family: Merriweather, serif;
          font-size: 26px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 1px rgba(0,0,0,0.3);
          cursor: pointer;
          margin-bottom: 20px;
        }
        .upsell-btn:hover { background-color: #2d96e0; }
        .upsell-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 480px) {
          .upsell-btn { font-size: 18px; padding: 16px 20px; }
        }
      `}</style>

      {/* Logo bar */}
      <div style={{ background: '#1b1b1e' }} className="py-4 text-center">
        <div className="max-w-[800px] mx-auto px-4">
          <img src="/soulmate/evelyn-logo-white.png" alt="Evelyn Cross" className="h-12 mx-auto" />
        </div>
      </div>

      {/* ── HEADER SECTION — white bg, matches .header_wrapper ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 20, paddingBottom: 40, textAlign: 'center' }}
             className="px-5 sm:px-10">

          {/* impt_container — 3px dotted red border, pink shadow, rounded */}
          <div style={{
            background: '#fff',
            border: '3px dotted #df1414',
            borderRadius: 20,
            marginTop: 10,
            marginBottom: 40,
            padding: '10px 20px 20px',
            boxShadow: '8px 8px 0px #ff6e6e57',
          }}>
            {/* Heading — centered */}
            <h1 style={{ ...h2Style, textAlign: 'center' }}>
              <span style={{ color: '#df1414' }}>IMPORTANT MESSAGE</span>{' '}FROM EVELYN CROSS
            </h1>

            {/* Portrait float-left + paragraphs — matches original clearfix layout */}
            <div className="clearfix">
              <img
                src="/soulmate/evelyn-portrait.png"
                alt="Evelyn Cross"
                className="sm:float-left sm:mr-5 mb-4 mx-auto block sm:inline"
                style={{
                  maxWidth: '35%',
                  width: 200,
                  height: 240,
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  borderRadius: 4,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                }}
              />
              <p style={pStyle}>
                Your personalized Soulmate Sketch is more than just a drawing—it's a powerful tool
                that <span style={{ textDecoration: 'underline' }}>unlocks the unique energy of your
                soulmate connection</span>. As you focus on this sketch, you amplify the vibrations
                and intentions that draw your soulmate closer to you.
              </p>
              <p style={pStyle}>
                <strong>To further enhance this energy</strong>, consider adding the Soulmate
                Attraction Bracelet, designed to resonate with the love frequencies captured in your
                sketch, creating a harmonious and powerful attraction force to manifest your soulmate.
              </p>
            </div>
          </div>

          {/* Intro heading — matches original .h2.height (line-height 42px) */}
          <h2 style={{ ...h2Style, lineHeight: '42px' }}>
            My dear, this is why I like to introduce you to my{' '}
            <span className="cursive">Soulmate Attraction Bracelet</span>
          </h2>

          {/* Bracelet image — matches .bracelet_img max-width 65% */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <img
              src="/soulmate/bracelet.jpg"
              alt="Rose Quartz Soulmate Attraction Bracelet"
              style={{ maxWidth: '65%', display: 'block', margin: '0 auto' }}
            />
            <p style={{ marginTop: 10, marginBottom: 10, fontStyle: 'italic', fontSize: 14, color: '#666' }}>
              Made from 100% Rose Quartz crystals
            </p>
          </div>

          <p style={pStyle}><strong>The Soulmate Attraction Bracelet </strong>is a beautifully crafted piece of jewelry designed to complement the energy revealed in your Soulmate Sketch.</p>
          <p style={pStyle}>This bracelet isn't just an accessory—it's a powerful talisman that helps you attract and manifest your soulmate.</p>
        </div>
      </div>

      {/* ── CONTENT SECTION — cream bg — "Why Wear" ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 40, textAlign: 'center' }}
             className="px-5 sm:px-10">
          <h2 style={h2Style}>
            Why Wear The <span className="cursive">Soulmate</span> Attraction <span className="cursive">Bracelet</span>?
          </h2>
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {[
              { label: 'Continuous Connection:', text: "Wearing the Soulmate Attraction Bracelet keeps you constantly connected to the energy of your soulmate, reinforcing your intentions and desires throughout the day." },
              { label: 'Amplify Your Attraction:', text: "Infused with love-attracting Rose Quartz crystals and designed to resonate with the vibrations of your soulmate's energy, this bracelet amplifies the magnetic pull between you and your destined partner." },
              { label: 'Manifest Your Wishes:', text: "The bracelet features a special capsule containing wish paper. You can write your deepest wish or intention for love on the paper and keep it close to your heart, symbolizing your commitment to manifesting your soulmate into your life." },
            ].map((item, i) => (
              <li key={i} style={{ textAlign: 'left', marginBottom: 20, fontSize: 18, lineHeight: 1.3, fontFamily: 'Arial, sans-serif', color: '#333' }}>
                <strong style={{ color: '#41a7ec' }}>{item.label}</strong> {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── DARK BANNER ── */}
      <div style={{ background: '#1b1b1e' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 20, textAlign: 'center' }}
             className="px-5 sm:px-10">
          <h2 style={{ ...h2Style, color: '#fff' }}>
            Your <span className="cursive">Soulmate Bracelet</span> is <em>no</em> ordinary bracelet...
            Here's How to Unlock the{' '}
            <span style={{ textDecoration: 'underline' }}>Full Powers</span> of Your Soulmate Attraction Bracelet
          </h2>
        </div>
      </div>

      {/* ── WHITE SECTION — steps + cert + CTA ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 50, textAlign: 'center' }}
             className="px-5 sm:px-10">

          {/* Ritual GIF — max-width 40% */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img
              src="/soulmate/bracelet-ritual.gif"
              alt="Bracelet ritual"
              style={{ maxWidth: '40%', display: 'block', margin: '0 auto' }}
              className="w-48 sm:w-auto"
            />
          </div>

          {/* 5 Steps */}
          <div style={{ marginBottom: 30 }}>
            {STEPS.map((step, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] gap-3 sm:gap-5 items-start mb-6">
                <img
                  src={step.img}
                  alt={step.title}
                  style={{
                    border: '5px solid #fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    width: 100,
                    objectFit: 'cover',
                  }}
                />
                <div style={{ textAlign: 'left' }}>
                  <h3 style={h2SmallStyle}>{step.title}</h3>
                  <p style={{ ...pStyle, marginBottom: 0 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Rose Quartz heading */}
          <h2 style={h2Style}>
            Your <span className="cursive">Soulmate Bracelet</span> is Made From{' '}
            <span>100% Rose Quartz Crystal</span> Stone…
          </h2>

          {/* Certificate image — max-width 70% */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img
              src="/soulmate/bracelet-cert.png"
              alt="Certificate of Authenticity"
              style={{ maxWidth: '70%', display: 'block', margin: '0 auto 20px' }}
            />
          </div>

          <p style={pStyle}>So you can experience the love frequency of Rose Quartz, as it opens your heart and aligns you with the energy of love. It's that powerful! It's that effective! All you have to do is carry it with you for just 21 days!</p>
          <p style={pStyle}><strong>Your purchase comes with the following:</strong></p>

          {/* Checklist — uses check-6.png as original */}
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 40 }}>
            {[
              'A Certificate of Authenticity to prove the genuineness of the stones',
              'An envelope with wish papers for your heartfelt intentions',
              "Care instructions to ensure your bracelet's longevity",
              'A beautiful eco-box for safekeeping',
              'Our 60-day money-back guarantee',
              'FREE shipping worldwide',
            ].map((item, i) => (
              <li key={i} style={{
                textAlign: 'left',
                backgroundImage: 'url(/soulmate/check-6.png)',
                backgroundPosition: '0 2px',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 25,
                paddingLeft: 34,
                paddingTop: 3,
                marginBottom: 12,
                fontSize: 18,
                lineHeight: 1.4,
                color: '#333',
              }}>
                {item}
              </li>
            ))}
          </ul>

          {/* Special Discount heading */}
          <h2 style={h2Style}>
            <span className="cursive">Special Discount</span> Just for You
          </h2>

          <p style={pStyle}>
            I understand that finances might be tight, but I believe everyone deserves the chance to
            attract their soulmate. That's why I'm offering you a{' '}
            <strong>special discount on the Soulmate Attraction Bracelet, available only since you
            ordered your sketch</strong>. This is your opportunity to carry the energy of love with
            you at a reduced price, making it more accessible than ever.
          </p>
          <p style={pStyle}>
            <strong>For a limited time, add the Soulmate Attraction Bracelet to your order for just
            $47 (regularly $59)</strong>, and wear the energy of love every day as you journey toward
            your true soulmate. Don't miss out on this exclusive offer—enhance your soulmate
            connection today!
          </p>

          {state === 'collecting_shipping' || state === 'charging' ? (
            <div style={{ background: '#fff', padding: 24, borderRadius: 10, boxShadow: '0 2px 7px rgba(0,0,0,0.08)', marginTop: 16 }}>
              <SoulmateShippingForm
                productLabel="bracelet"
                defaultName={firstName}
                submitLabel="Complete My Order — $47"
                submitting={state === 'charging'}
                onSubmit={handleShippingSubmit}
              />
            </div>
          ) : (
            <>
              {/* CTA Button */}
              <button
                className="upsell-btn"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>

              {/* Decline link — matches original text */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleDecline}
                  style={{ color: '#8f8f8f', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1.5 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  No, I've to decline your goodwill offer and pass this to the next deserving customer
                  of your community. I understand I'll forfeit this opportunity to buy this bracelet at
                  such a low price ever again.
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1b1b1e' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-8 text-center">
          <div className="text-white/50 text-xs mb-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
            <Link href="/privacy"><span className="hover:text-white/80 cursor-pointer">Privacy Policy</span></Link>
            <span>|</span>
            <Link href="/terms"><span className="hover:text-white/80 cursor-pointer">Terms of Service</span></Link>
            <span>|</span>
            <Link href="/refund"><span className="hover:text-white/80 cursor-pointer">Refund Policy</span></Link>
          </div>
          <p className="text-white/30 text-xs leading-relaxed italic">
            Disclaimer: By participating in my services you acknowledge that I am not a licensed
            psychologist, lawyer, or health care professional and my services do not replace the care
            of psychologists or other healthcare professionals. All my sketches and readings are
            intended for entertainment purposes only and may not be unique.
          </p>
          <p className="text-white/20 text-xs mt-3">
            &copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.
          </p>
        </div>
      </div>
    </div>
  );
}
