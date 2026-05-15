import { useState, useEffect } from 'react';
import { useSearch, useLocation, Link } from 'wouter';
import { SoulmateShippingForm, type ShippingFormSubmission } from '../components/soulmate/SoulmateShippingForm';

type State = 'offer' | 'collecting_shipping' | 'charging' | 'success' | 'declined';

interface ExistingShipping {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone?: string;
}

const h2Style: React.CSSProperties = {
  fontFamily: 'Merriweather, serif',
  fontSize: 30,
  fontWeight: 700,
  color: '#1b1b1e',
  marginBottom: 20,
  lineHeight: 1.3,
  textAlign: 'center',
};

const pStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 18,
  lineHeight: 1.4,
  marginBottom: 20,
  color: '#333',
};

const h2SmallStyle: React.CSSProperties = {
  fontFamily: 'Merriweather, serif',
  fontSize: 24,
  fontWeight: 700,
  color: '#41a7ec',
  marginBottom: 8,
  lineHeight: 1.4,
};

export default function SoulmateUpsell2Page() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get('session_id');

  const [state, setState] = useState<State>('offer');
  const [existingShipping, setExistingShipping] = useState<ExistingShipping | null>(null);
  const [shippingLoaded, setShippingLoaded] = useState(false);

  const raw = sessionStorage.getItem('soulmate_form');
  const formData = raw ? JSON.parse(raw) : null;
  const firstName = formData?.firstName || '';
  const email     = formData?.email     || '';

  // Look up saved shipping from upsell 1 (Path A) — if present, skip the form.
  useEffect(() => {
    if (!email) { setShippingLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/soulmate/shipping?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (!cancelled && data?.shipping?.line1) {
          setExistingShipping(data.shipping);
        }
      } catch {
        // Ignore — user will go through Path B (collect form).
      } finally {
        if (!cancelled) setShippingLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  const chargeWithShipping = async (body: ShippingFormSubmission | Record<string, never>) => {
    setState('charging');
    try {
      if (sessionId) {
        const res = await fetch('/api/soulmate/upsell2/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, email, firstName, ...body }),
        });
        const data = await res.json();
        if (data.success) { navigate('/soulmate/thank-you'); return; }
        if (data.fallback && data.url) { window.location.href = data.url; return; }
      }
      setState('offer');
    } catch {
      setState('offer');
    }
  };

  const handleAddToCart = () => {
    // Path A: shipping already on file → charge immediately (server reuses it)
    if (existingShipping) {
      chargeWithShipping({});
      return;
    }
    // Path B: declined upsell 1 → collect shipping fresh
    setState('collecting_shipping');
  };

  const handleShippingSubmit = (payload: ShippingFormSubmission) => {
    chargeWithShipping(payload);
  };

  const handleDecline = () => navigate('/soulmate/thank-you');

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

      {/* ── HEADER — Important Message ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 20, paddingBottom: 40, textAlign: 'center' }}
             className="px-5 sm:px-10">

          <div style={{
            background: '#fff',
            border: '3px dotted #df1414',
            borderRadius: 20,
            marginTop: 10,
            marginBottom: 40,
            padding: '10px 20px 20px',
            boxShadow: '8px 8px 0px #ff6e6e57',
          }}>
            <h1 style={{ ...h2Style, textAlign: 'center' }}>
              <span style={{ color: '#df1414' }}>WAIT{firstName ? `, ${firstName}` : ''}</span> — BEFORE YOU GO...
            </h1>

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
                Please pay close attention to the power of the "528 Hertz Frequency of Love"
                soundwave on this page. You will only see this <strong>ONCE</strong> and this tip can
                actually help you... <strong><em>heal all your past wounds and open yourself up
                to love in just 5 minutes a day.</em></strong>
              </p>
              <p style={pStyle}>
                The 528 Frequency of Love Soundwave is known to restore inner harmony, fill you with
                love and heal your love wounds. Those who listen to this soundwave for just 5 minutes
                a day have reported unbelievable results.
              </p>
            </div>
          </div>

          {/* Main headline */}
          <h2 style={{ ...h2Style, lineHeight: '42px' }}>
            Listen To This{' '}
            <span className="cursive">528 Hertz Frequency of Love</span>{' '}
            Soundwave For 5 Minutes A Day...
          </h2>
          <h3 className="merri" style={{ fontSize: 22, fontWeight: 700, color: '#1b1b1e', marginBottom: 24, textAlign: 'center' }}>
            And Watch How Quickly It Heals You Of All Your Love Wounds!
          </h3>

          {/* Product hero video */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <video
              autoPlay
              loop
              muted
              playsInline
              style={{ maxWidth: '65%', display: 'block', margin: '0 auto', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              <source src="/soulmate/hero-loop.mp4" type="video/mp4" />
            </video>
            <p style={{ marginTop: 10, marginBottom: 10, fontStyle: 'italic', fontSize: 14, color: '#666' }}>
              The Frequency of Love Tuner Necklace — plays the 528 Hz "Love Frequency"
            </p>
          </div>
        </div>
      </div>

      {/* ── Reported Miracles ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 40, textAlign: 'center' }}
             className="px-5 sm:px-10">
          <h2 style={h2Style}>
            Those Who Listen To This Soundwave Have Reported{' '}
            <span className="cursive">Unbelievable</span> Results
          </h2>
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {[
              { label: 'Broken hearts healing instantly', text: '— emotional pain that lingered for years dissolving within minutes of their first listen.' },
              { label: 'Old lovers reuniting', text: '— past connections reigniting as if drawn together by an invisible force.' },
              { label: 'Emotional trauma disappearing practically overnight', text: '— years of built-up resentment and hurt releasing effortlessly.' },
              { label: 'Personalities transforming', text: '— going from cold and bitter to warm, open, and full of light.' },
              { label: 'Lifelong singles finding their soulmate within days', text: '— as if the frequency cleared the path for love to finally arrive.' },
            ].map((item, i) => (
              <li key={i} style={{ textAlign: 'left', marginBottom: 20, fontSize: 18, lineHeight: 1.3, fontFamily: 'Arial, sans-serif', color: '#333' }}>
                <strong style={{ color: '#41a7ec' }}>{item.label}</strong> {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Dark banner ── */}
      <div style={{ background: '#1b1b1e' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 20, textAlign: 'center' }}
             className="px-5 sm:px-10">
          <h2 style={{ ...h2Style, color: '#fff' }}>
            Science Has Confirmed The{' '}
            <span className="cursive">528 Hertz Frequency of Love</span>{' '}
            To Be Extremely Powerful
          </h2>
        </div>
      </div>

      {/* ── Science / Sound Healing section ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 40 }}
             className="px-5 sm:px-10">

          {/* Science callout box */}
          <div style={{ background: '#f0f9ff', padding: '20px 24px', borderLeft: '4px solid #41a7ec', marginBottom: 24 }}>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#444', margin: 0, fontStyle: 'italic' }}>
              528 Hz DNA repair: 528Hz is essential to the geometry of circles and spirals consistent
              with DNA structuring and hydrosonic restructuring. Evidence suggests that 528 Hz has
              the potential to positively affect cellular water clusters to assist in removing impurities
              and promote healing.
            </p>
          </div>

          <p style={pStyle}>
            After rigorous study of this ONE soundwave, researchers have concluded that it's{' '}
            <span style={{ textDecoration: 'underline' }}>a powerful healer and granter of love miracles</span>.
          </p>

          <h3 style={h2SmallStyle}>The Power of Sound Healing</h3>
          <p style={pStyle}>
            {firstName || 'My dear'}, sound healing uses high frequency soundwaves to heal
            and restore an individual's physical and emotional well being. Evidence of using sound
            to heal dates back thousands of years to ancient Egyptians and Australia's Aborigines,
            plus it's found in every religion including Christianity, Hinduism and Buddhism.
          </p>
          <p style={pStyle}>
            The frequency of the sounds you let into your consciousness determines how your body,
            mind and spirit vibrate and in return <em>feel</em>. When you listen to high frequency
            sounds, your body vibrates at a higher frequency and the better you feel.
          </p>

          <h3 style={h2SmallStyle}>Why 528 Hz Is Special</h3>
          <ul style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 30 }}>
            {[
              'One of the six frequencies on the Solfeggio scale used to promote healing and keep the body in perfect harmony',
              "Considered the 'Miracle' note — responsible for bringing remarkable changes and extraordinary healing into one's life",
              'Known to connect your heart, your spiritual essence, to all the love and joy in the universe',
              'Proven to invoke healing while opening you up to enjoying a life with more love',
              'Called the "Love Frequency" because it is found in the heart of everything',
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
        </div>
      </div>

      {/* ── Testimonials ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 40, textAlign: 'center' }}
             className="px-5 sm:px-10">
          <h2 style={h2Style}>
            The 528Hz Frequency Has Already{' '}
            <span style={{ textDecoration: 'underline' }}>Healed Thousands</span>
          </h2>

          <div className="space-y-5 text-left">
            {[
              {
                name: 'Susan M.',
                initials: 'SM',
                color: '#41a7ec',
                text: 'I had been in 3 failed relationships that all ended with me getting cheated on. My trust issues were destroying every new possibility for love. Fed up, I decided to give the 528Hz Frequency of Love a listen. Within minutes of my first listen, I instantly felt better. But after a couple weeks of daily listening, I felt a ball of stress travel throughout my body and suddenly vanish! And with it went all my worries, frustrations, and fears!',
              },
              {
                name: 'Laura S.',
                initials: 'LS',
                color: '#e67e4f',
                text: "I knew I had to rid myself of all the guilt and emotional wounds I was holding onto from my past. So I started listening to the 528 Hertz Frequency of Love soundwave and practically hit the 'reset' button on my life! I went from living in despair and hopeless to full of energy and renewed passion for life.",
              },
              {
                name: 'Saphia N.',
                initials: 'SN',
                color: '#7b68c8',
                text: "I went from spending a lifetime alone to using the power of the 528Hz Frequency of Love to heal all the parts of me that needed healing and open myself up to more love. Once I did, I naturally started attracting interest from all the men I had an eye on. And now I'm happily married with two beautiful children!",
              },
            ].map((t, i) => (
              <div key={i} style={{
                background: '#fff',
                padding: '20px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                borderRadius: 8,
              }}>
                <div style={{ color: '#f5a623', fontSize: 16, marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: '#444', fontStyle: 'italic', marginBottom: 16 }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: t.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Merriweather, serif', fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1b1e' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>Verified Client</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dark banner — Product Intro ── */}
      <div style={{ background: '#1b1b1e' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 20, textAlign: 'center' }}
             className="px-5 sm:px-10">
          <h2 style={{ ...h2Style, color: '#fff' }}>
            Introducing: The{' '}
            <span className="cursive">Frequency of Love</span> Tuner
          </h2>
        </div>
      </div>

      {/* ── Product details + CTA ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 30, paddingBottom: 50, textAlign: 'center' }}
             className="px-5 sm:px-10">

          {/* Product image */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img
              src="/soulmate/love-tuner.jpg"
              alt="Frequency of Love Tuner Necklace"
              style={{ maxWidth: '50%', display: 'block', margin: '0 auto' }}
            />
          </div>

          <p style={pStyle}>
            {firstName || 'My dear'}, the Frequency of Love Tuner is a mindfulness necklace which carries a
            beautiful silver tuner. But it is far more than just a necklace everyone will admire...
          </p>
          <p style={pStyle}>
            <strong>Attached to this gorgeous necklace is a single-note tuner that plays the 528 Hertz
            Frequency of Love!</strong> This is the same soundwave that thousands of people have used
            to heal themselves and experience love miracles.
          </p>
          <p style={pStyle}>
            Carry it with you everywhere you go, and whenever you're in need of healing, simply play
            this powerful tuner and instantly <strong>FEEL</strong> better as the beautiful 528Hz
            frequency heals you!
          </p>

          <h3 style={{ ...h2SmallStyle, textAlign: 'center', marginBottom: 20 }}>
            No More Living With...
          </h3>
          <ul style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 30 }}>
            {[
              'Heartache from past relationships',
              'Trust issues that keep you guarded',
              'Emotional wounds that hold you back',
              'Invisible scars from betrayal',
              'A heavy heart and endless worries',
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

          <p style={pStyle}>
            The Frequency of Love Tuner puts the power to heal yourself directly into your hands.
            Simply play the tuner for <strong>5 minutes daily</strong> and you'll welcome healing into
            your life while opening yourself up to love miracles!
          </p>

          {/* Your purchase includes */}
          <h2 style={h2Style}>
            Your Purchase Includes
          </h2>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/soulmate/love-tuner-set.jpg"
              alt="Frequency of Love Tuner — complete set"
              style={{ maxWidth: '70%', display: 'block', margin: '0 auto', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}
            />
          </div>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 40 }}>
            {[
              'The Frequency of Love Tuner Necklace — tuned to exactly 528 Hz',
              'A beautiful silver chain to wear it daily',
              'A guided "How to Use" card with your daily 5-minute healing ritual',
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

          {/* Special Discount */}
          <h2 style={h2Style}>
            <span className="cursive">Special Discount</span> Just for You
          </h2>

          <p style={pStyle}>
            I understand that finances might be tight, but I believe everyone deserves the chance to
            heal their love wounds. That's why I'm offering you a{' '}
            <strong>special discount on the Frequency of Love Tuner, available only since you
            ordered your sketch</strong>.
          </p>
          <p style={pStyle}>
            <strong>For a limited time, add the Frequency of Love Tuner to your order for just
            $79 (regularly $129)</strong> — and carry the healing power of the 528 Hz Love Frequency
            with you every single day!
          </p>

          {state === 'collecting_shipping' || (state === 'charging' && !existingShipping) ? (
            // Path B: collecting fresh shipping (or in-flight after form submit)
            <div style={{ background: '#fff', padding: 24, borderRadius: 10, boxShadow: '0 2px 7px rgba(0,0,0,0.08)', marginTop: 16 }}>
              <SoulmateShippingForm
                productLabel="Love Tuner"
                defaultName={firstName}
                submitLabel="Complete My Order — $79"
                submitting={state === 'charging'}
                onSubmit={handleShippingSubmit}
              />
            </div>
          ) : state === 'charging' && existingShipping ? (
            // Path A: charging using saved shipping — no form, just a spinner
            <div style={{ background: '#fff', padding: 30, borderRadius: 10, boxShadow: '0 2px 7px rgba(0,0,0,0.08)', marginTop: 16, textAlign: 'center', fontFamily: 'sans-serif', color: '#414040' }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Processing your order...</div>
              <div style={{ fontSize: 14, color: '#888' }}>Charging $79 for your Love Tuner</div>
            </div>
          ) : (
            <>
              {/* Reused shipping summary (Path A) */}
              {existingShipping && (
                <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#414040', fontFamily: 'sans-serif' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>📦 Shipping to:</div>
                  <div>{existingShipping.name}</div>
                  <div>{existingShipping.line1}{existingShipping.line2 ? `, ${existingShipping.line2}` : ''}</div>
                  <div>{existingShipping.city}, {existingShipping.state} {existingShipping.postal}, {existingShipping.country}</div>
                </div>
              )}

              {/* CTA */}
              <button
                className="upsell-btn"
                onClick={handleAddToCart}
                disabled={!shippingLoaded}
              >
                Yes! Add the Love Tuner to My Order — $79
              </button>

              <p style={{ fontSize: 13, color: '#888', marginTop: -10, marginBottom: 20, textAlign: 'center' }}>
                🔒 60-Day Money-Back Guarantee — no questions asked
              </p>

              {/* Decline link */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleDecline}
                  style={{ color: '#8f8f8f', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1.5 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  No thank you, I don't need healing right now. Please take me to my order confirmation.
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
