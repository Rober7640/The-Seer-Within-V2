import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { track as trackPH, getDistinctId } from '@/lib/posthog';

const PRICES = [
  { cents: 2800, label: '$28', sub: 'Pay what you can' },
  { cents: 4200, label: '$42', sub: '✓ Most popular' },
  { cents: 5500, label: '$55', sub: 'Give generously' },
];

function CTABtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <div className="text-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="w-full font-bold text-white disabled:opacity-60 transition-colors"
        style={{
          background: '#41a7ec',
          borderRadius: 5,
          padding: '18px 40px',
          fontFamily: 'Merriweather, serif',
          fontSize: 20,
          fontWeight: 700,
          textShadow: '0 2px 1px rgba(0,0,0,0.2)',
          cursor: loading ? 'not-allowed' : 'pointer',
          border: 'none',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2d96e0'; }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#41a7ec'; }}
      >
        {loading ? 'Redirecting...' : 'Send Me My Soulmate Sketch →'}
      </button>
      {/* Guarantee badge under CTA */}
      <p style={{ fontSize: 13, color: '#888', marginTop: 10 }}>
        🔒 60-Day Money-Back Guarantee — no questions asked
      </p>
    </div>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
      color: '#41a7ec', textTransform: 'uppercase', marginBottom: 10,
    }}>{text}</p>
  );
}

function PullQuote({ text }: { text: string }) {
  return (
    <blockquote style={{
      borderLeft: '4px solid #41a7ec',
      paddingLeft: 20,
      margin: '24px 0',
      fontFamily: 'Merriweather, serif',
      fontSize: 19,
      fontStyle: 'italic',
      color: '#41a7ec',
      lineHeight: 1.6,
    }}>
      {text}
    </blockquote>
  );
}

export default function SoulmateSalesPage() {
  const [selectedPrice, setSelectedPrice] = useState(4200);
  const [loading, setLoading] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);
  const firstCTARef = useRef<HTMLDivElement>(null);

  const raw = sessionStorage.getItem('soulmate_form');
  const formData = raw ? JSON.parse(raw) : null;
  const firstName = formData?.firstName || 'Dear';
  const email     = formData?.email     || '';

  const scrollToPricing = () =>
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleCheckout = async () => {
    setLoading(true);
    trackPH('checkout_initiated', {
      funnel: 'soulmate',
      product: 'soulmate_sketch',
      price_cents: selectedPrice,
    });
    try {
      const res = await fetch('/api/soulmate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          priceCents: selectedPrice,
          posthogDistinctId: getDistinctId(),
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  // Show sticky bar after user scrolls past first CTA
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (firstCTARef.current) observer.observe(firstCTARef.current);
    return () => observer.disconnect();
  }, []);

  const p = (text: string | React.ReactNode) => (
    <p style={{ fontSize: 18, lineHeight: 1.5, color: '#444', marginBottom: 16 }}>{text}</p>
  );

  return (
    <div style={{ background: '#f5f5f5', fontFamily: 'sans-serif' }} className="min-h-screen">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
        .cursive { font-family: 'Great Vibes', cursive; font-size: 50px; font-weight: 700; color: #41a7ec; text-shadow: 0 4px 2px rgba(0,0,0,0.1); }
        .merri   { font-family: 'Merriweather', Georgia, serif; }
        @media (max-width: 480px) {
          h2.merri { font-size: 20px !important; }
          h3.merri { font-size: 18px !important; }
        }
      `}</style>

      {/* ── Sticky CTA bar ── */}
      {showSticky && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#1b1b1e', borderTop: '3px solid #41a7ec',
          padding: '10px 16px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        }} className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          {/* Mini price selector */}
          <div className="flex gap-2">
            {PRICES.map(({ cents, label }) => (
              <button
                key={cents}
                onClick={() => setSelectedPrice(cents)}
                style={{
                  padding: '7px 14px',
                  fontFamily: 'Merriweather, serif',
                  fontWeight: 700,
                  fontSize: 14,
                  borderRadius: 4,
                  border: '2px solid',
                  borderColor: selectedPrice === cents ? '#41a7ec' : '#555',
                  background:  selectedPrice === cents ? '#41a7ec' : 'transparent',
                  color:       selectedPrice === cents ? '#fff'    : '#aaa',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full sm:w-auto"
            style={{
              background: '#41a7ec', color: '#fff', border: 'none',
              borderRadius: 5, padding: '11px 24px',
              fontFamily: 'Merriweather, serif', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2d96e0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#41a7ec')}
          >
            {loading ? 'Redirecting...' : 'Send Me My Sketch →'}
          </button>
        </div>
      )}

      {/* Logo bar */}
      <div style={{ background: '#1b1b1e' }} className="py-4 text-center">
        <div className="max-w-[800px] mx-auto px-4">
          <img src="/soulmate/evelyn-logo-white.png" alt="Evelyn Cross" className="h-12 mx-auto" />
        </div>
      </div>

      {/* ── SECTION 1 — Opening headline ── */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Your reading is ready" />
          <h2 className="merri text-[#1b1b1e] font-bold leading-snug mb-5" style={{ fontSize: 28 }}>
            Very Soon You'll Receive The Most Complete, Detailed Soulmate Sketch
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: '#444' }}>
            Rest assured that any information that you've given me is for my eyes only and will be{' '}
            <strong>confidential</strong>. Please think of me not only as your guide but as your
            friend which the Universe has sent to you to help discover your Soulmate.
          </p>
        </div>
      </div>

      {/* ── SECTION 2 — Real Sketch Examples ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto py-10 text-center">
          <Eyebrow text="Real results" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-8 px-5 sm:px-10" style={{ fontSize: 28 }}>Real Sketch Examples</h2>
          <div className="grid grid-cols-3 gap-3">
            {['/soulmate/real-sketch-1.jpg', '/soulmate/real-sketch-2.jpg', '/soulmate/real-sketch-3.jpg'].map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Sketch example ${i + 1}`}
                className="w-full block"
                style={{
                  aspectRatio: '3 / 4',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  border: '6px solid #fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 3 — Value copy + early CTA ── */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="What your sketch reveals" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-6 leading-snug" style={{ fontSize: 26 }}>
            Your Soulmate Sketch will clearly show what your lovelife SHOULD be...
          </h2>
          <div className="text-left mb-4">
            {p("Your sketch reveals more than just your ideal soulmate, it will help you face important dates and relationship decisions in the future. This will reveal the innate desires that's apparent in your potential partner – making you uncover your true self and make the right decisions.")}
            {p("Keep in mind that your unique sketch is equivalent to your experience. Each text, dates, small decisions, and intentions reveal your personality, relationships, life lessons, and of course your future possibilities for love.")}
          </div>
          <PullQuote text="The love you were meant to experience has been waiting for you to notice it." />
          <div ref={firstCTARef} className="mb-2">
            <CTABtn onClick={scrollToPricing} />
          </div>
        </div>
      </div>

      {/* ── SECTION 4 — Happy Client Stories ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Client stories" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-8" style={{ fontSize: 28 }}>Happy Client Stories</h2>
          <div className="space-y-5 text-left">
            {[
              { quote: "Evelyn's soulmate sketch and description absolutely blew me away! Her artwork is stunning, I'm impressed by the subtle details and closeness to my dream partner. I'm even more amazed by how her description captured the essence of the person I'm meant to be with. It feels like a roadmap to my one true love, and I'm beyond excited to follow it. Thank you, Evelyn!", name: 'Paulin S.', initials: 'PS', color: '#41a7ec' },
              { quote: "I'll be honest, I was a bit of a skeptic at first. But Evelyn's soulmate sketch and reading truly made me believe. She described things about my life and my future partner that no one could have known. My hidden desires in my future partner were revealed, it's as if she tapped into a deeper truth, giving me the clarity to embrace my love. This is an unexpected gift.", name: 'Rio M.', initials: 'RM', color: '#e67e4f' },
              { quote: "Her soulmate sketch is like a love letter from the universe. Her sketch made me realize what I've been missing, a feeling of hope, excitement, and deep-rooted knowing that the love I've been dreaming of is out there. I can't wait to see how this plays out in my life! Thank you, Evelyn!", name: 'Mae S.', initials: 'MS', color: '#7b68c8' },
            ].map((t, i) => (
              <div key={i} style={{
                background: '#fff',
                padding: '20px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                borderRadius: 8,
              }}>
                <div style={{ color: '#f5a623', fontSize: 16, marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: '#444', fontStyle: 'italic', marginBottom: 16 }}>
                  "{t.quote}"
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

      {/* ── SECTION 5 — Absolute Attention ── */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10">
          <div className="text-center mb-6">
            <Eyebrow text="My personal commitment" />
            <h2 className="merri text-[#1b1b1e] font-bold leading-snug" style={{ fontSize: 26 }}>
              Your Soulmate Sketch Will Receive My ABSOLUTE, Undivided and Immediate Attention
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-7 items-start">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <img
                src="/soulmate/evelyn-sketching.png"
                alt="Evelyn Cross sketching"
                style={{ width: 200, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
              />
            </div>
            <div>
              <p style={{ fontSize: 18, lineHeight: 1.5, color: '#444', fontStyle: 'italic', fontWeight: 700, marginBottom: 16 }}>
                Dear {firstName}, here's what I'll do for you:
              </p>
              {p("The moment I receive your request, within 24 hours, I'll send you your Complete Soulmate Sketch so that the next few weeks become one of the most exciting endeavors in your lovelife.")}
              {p("You will receive a document that is more complete and more detailed than anything any other expert may have done for you before.")}
              {p("All I can say is that even though you may have unsolved personal love problems right at this moment, your immediate future shows that it will probably no longer be a problem for you.")}
            </div>
          </div>
          <PullQuote text="Your sketch will be ready within 24 hours — and it will be unlike anything you've received before." />
        </div>
      </div>

      {/* ── SECTION 6 — Complete Package ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="What you receive" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-6 leading-snug" style={{ fontSize: 26 }}>
            You'll Receive a Complete Soulmate Love Sketch Package
          </h2>
          <div className="flex justify-center mb-6">
            <img
              src="/soulmate/ev-draw-soulmate.gif"
              alt="Soulmate sketch being drawn"
              style={{ maxWidth: 640, width: '100%', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
            />
          </div>
          <div className="text-left">
            <p style={{ fontSize: 18, lineHeight: 1.5, color: '#444' }}>
              <strong>Your Soulmate Sketch:</strong> This is a glimpse into your romantic destiny.
              Crafted through intuitive guidance and artistic skill, it reveals the face and essence
              of your potential true love. This unique portrait is more than just a beautiful image;
              it's a tool for recognition, a beacon to guide you toward your ultimate love story.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 7 — More Testimonials ── */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="More real stories" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-8" style={{ fontSize: 28 }}>
            More testimonials from clients:
          </h2>
          <div className="space-y-6 text-left">
            {[
              { quote: "I've been on the dating app scene for years, and it honestly felt like a never-ending cycle of swiping and disappointment. Evelyn's Soulmate Sketch gave me a much-needed breath of fresh air. The sketch wasn't a picture-perfect match of anyone I'd met, but the energy and essence were strikingly familiar. It helped me realize I was often drawn to the wrong type of person. With this new clarity, I finally narrowed down what I truly wanted in a partner, and within a few months, I met someone incredible who aligned perfectly with the sketch's energy. It was a game-changer", name: 'Emily R.', initials: 'ER', color: '#41a7ec' },
              { quote: "After a painful breakup, I felt completely discouraged and lost faith in love. Eva's sketch arrived at the perfect time. It wasn't so much about the physical resemblance, but the warmth and kindness radiating from the drawing filled me with a sense of hope I hadn't felt in a long time. It reminded me that there are still good people out there and that love is worth pursuing. The sketch became a daily reminder to keep my heart open, and it wasn't long before I met someone who truly cherished me.", name: 'John S.', initials: 'JS', color: '#e67e4f' },
              { quote: "I've always struggled with insecurity and never felt worthy of love. When I saw my Soulmate Sketch, it was like looking in a mirror – but a more compassionate, loving version of myself. The drawing highlighted my best qualities and made me feel seen and appreciated for who I truly am. It was a powerful reminder that I deserve love and happiness. With this newfound self-acceptance, I started attracting healthier relationships and finally found someone who loves me unconditionally.", name: 'Sarah G.', initials: 'SG', color: '#7b68c8' },
            ].map((t, i) => (
              <div key={i} style={{
                background: '#fff',
                padding: '20px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                borderRadius: 8,
              }}>
                <div style={{ color: '#f5a623', fontSize: 16, marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: '#444', fontStyle: 'italic', marginBottom: 16 }}>
                  "{t.quote}"
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

      {/* ── SECTION 8 — WAIT / Bonus ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Exclusive bonus" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-6 leading-snug" style={{ fontSize: 26 }}>
            WAIT {firstName}, there's so much more I can do for you...
          </h2>
          <div className="text-left mb-8">
            {p("I can see that you are more than curious to see your ideal partner; you are determined to not just discover the love that you deserve, but also open to future possibilities.")}
            {p(<>You want your love to be poured and cultivated to someone who treats you well and loves you. If you accept this reading today held out to guide you, you'll also get{' '}<strong>ONE bonus gift, free of any charge.</strong></>)}
            {p("They will be sent to you through the magic of the Internet so you can receive them immediately and without any charge for shipping.")}
          </div>
          <h3 className="merri text-[#41a7ec] font-bold mb-5" style={{ fontSize: 22 }}>
            On this Page Only, I'm Giving You a Bonus Gift
          </h3>
          <div style={{ background: '#fff', padding: 24, borderLeft: '4px solid #41a7ec', textAlign: 'left' }}>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#444', marginBottom: 12 }}>
              <strong>Manifest Your Soulmate Meditation Guide:</strong> This powerful audiobook will
              guide you through proven techniques to manifest your ideal soulmate. Learn how to align
              your energy, raise your vibration, and create a magnetic field of love that draws your
              perfect partner to you.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#444', marginBottom: 12 }}>
              Filled with affirmations, visualizations, and practical exercises, this audiobook will
              empower you to create the love story of your dreams.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#444' }}>
              This bonus aims to give you all the tools you need to prosper your love...as well as
              provide you with a more complete and more detailed analysis than anything any other
              psychic may have done for you before...
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 9 — Send Your Request copy (condensed) ── */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Make your decision" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-6 leading-snug" style={{ fontSize: 26 }}>
            Send Your Request Now
          </h2>
          <div style={{
            border: '3px solid #1b1b1e',
            background: '#1b1b1e',
            padding: '20px 24px',
            marginBottom: 24,
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'Merriweather, serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em', marginBottom: 6, color: '#fff' }}>
              VERY SOON YOU CAN RECEIVE
            </p>
            <p style={{ fontFamily: 'Merriweather, serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em', marginBottom: 6, color: '#fff' }}>
              THE MOST COMPLETE, DETAILED AND PRECISE
            </p>
            <p style={{ fontFamily: 'Merriweather, serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.05em', color: '#fff' }}>
              SOULMATE SKETCH OF YOUR ENTIRE LIFE
            </p>
          </div>
          <div className="text-left">
            {p("Once you say yes, I will have your complete Soulmate Sketch ready within 24 hours. Your future is now in your hands — and I can't wait to help you take this step.")}
          </div>
        </div>
      </div>

      {/* ── SECTION 10 — Product Summary ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Everything included" />
          <h3 className="merri text-[#1b1b1e] font-bold mb-1" style={{ fontSize: 22 }}>
            Psychic Soulmate Love Sketch &amp; Reading
          </h3>
          <p style={{ fontSize: 15, color: '#888', marginBottom: 20 }}>
            Includes Full Reading with Description + 24 Hour Delivery
          </p>
          <ul className="text-left mb-5" style={{ paddingLeft: 0, listStyle: 'none' }}>
            {[
              <><strong>A beautifully detailed psychic sketch of your soulmate</strong>, tailored specifically for you.</>,
              <>A <strong><u>detailed characteristic description including Personality Traits</u></strong></>,
              <>One Bonus Gift: "Manifest Your Soulmate Meditation Guide"</>,
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 17, lineHeight: 1.6, color: '#444', marginBottom: 12, paddingLeft: 20, borderLeft: '3px solid #41a7ec' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── SECTION 12 — Flexible Pricing ── */}
      <div ref={pricingRef} style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Pricing" />
          <h2 className="merri font-bold mb-6" style={{ fontSize: 28, color: '#41a7ec' }}>
            Flexible Pricing for Everyone
          </h2>
          <div className="text-left mb-6">
            {p("Like I said...I've helped and guided thousands of people navigate their love life and potential possibilities in their lives.")}
            {p("I'm confident in saying that this reading will let you discover your potential soulmate and yourself...")}
            {p("It's no accident you are here right now. The universe laid out the perfect point in your life to take advantage of the situation.")}
            <p style={{ fontSize: 18, lineHeight: 1.5, color: '#444', marginBottom: 16 }}>
              <em>And I don't want you to miss this opportunity.</em>
            </p>
            {p("As your dear friend, I never want money to stand in the way of you getting the guidance you need to change your life.")}
            <p style={{ fontSize: 18, lineHeight: 1.5, color: '#444', fontWeight: 700, marginBottom: 16 }}>
              That's why I offer a unique, pay-what-you-can pricing model.
            </p>
            {p("Now, you should know — each sketch takes me 2–3 hours of focused work. I use premium materials: professional-grade pencils, sketch paper, and ink pens reserved exclusively for your portrait. On top of that, I spend time in deep intuitive preparation, channeling your energy using your birth details before a single line is drawn.")}
            {p(<>For all of that, a fair price would be <strong>$42</strong>. But I understand that life comes with different seasons, and not everyone is in the same place financially. So I leave the choice to you — pay what you can, and I will pour the same love and attention into your sketch regardless.</>)}
          </div>

          <h3 className="merri font-bold mb-2" style={{ fontSize: 22, color: '#1b1b1e' }}>
            Choose What You Can Pay:
          </h3>

          {/* Social proof line */}
          <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
            Join <strong style={{ color: '#1b1b1e' }}>12,973 people</strong> who've already received their sketch
          </p>

          <div className="grid grid-cols-3 gap-4 mb-2 max-w-sm mx-auto">
            {PRICES.map(({ cents, label, sub }) => (
              <div key={cents} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setSelectedPrice(cents)}
                  className="font-bold border-2 rounded transition-all w-full"
                  style={{
                    padding: '20px 0',
                    fontSize: 26,
                    fontFamily: 'Merriweather, serif',
                    fontWeight: 700,
                    borderColor:    selectedPrice === cents ? '#41a7ec' : '#ddd',
                    background:     selectedPrice === cents ? '#41a7ec' : '#fff',
                    color:          selectedPrice === cents ? '#fff'    : '#1b1b1e',
                    transform:      selectedPrice === cents ? 'scale(1.07)' : 'scale(1)',
                    boxShadow:      selectedPrice === cents ? '0 4px 12px rgba(65,167,236,0.4)' : '0 1px 4px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                  color: selectedPrice === cents ? '#41a7ec' : '#aaa',
                }}>
                  {sub.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: '#888', fontWeight: 600, marginBottom: 20 }}>
            Please choose the amount you are comfortable with
          </p>
          <CTABtn onClick={handleCheckout} loading={loading} />
        </div>
      </div>

      {/* ── SECTION 13 — 60-Day Guarantee ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <Eyebrow text="Our promise to you" />
          <h2 className="merri font-bold mb-4" style={{ fontSize: 28, color: '#41a7ec' }}>
            60-Day Money-Back Guarantee
          </h2>
          <div className="flex justify-center mb-5">
            <img src="/soulmate/evelyn-logo.png" alt="Evelyn Cross" style={{ height: 64 }} />
          </div>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#444', marginBottom: 28, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            I am so confident in the quality and accuracy of my Soulmate Sketches that I offer a
            60-day money-back guarantee. If for any reason you are not satisfied with your sketch,
            simply contact me within 60 days of your purchase, and I will provide a full refund, no
            questions asked.
          </p>
          <CTABtn onClick={scrollToPricing} />
        </div>
      </div>

      {/* ── More Sketch Examples + final CTA ── */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto py-10 text-center">
          <Eyebrow text="More real results" />
          <h2 className="merri text-[#1b1b1e] font-bold mb-2 px-5 sm:px-10" style={{ fontSize: 28 }}>
            More Sketches From Real Clients
          </h2>
          <p style={{ fontSize: 16, color: '#888', marginBottom: 28 }} className="px-5 sm:px-10">
            Every sketch is unique — crafted individually, with love and precision.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[4, 5, 6, 7, 8, 9].map(n => (
              <img
                key={n}
                src={`/soulmate/real-sketch-${n}.jpg`}
                alt={`Sketch example ${n}`}
                className="w-full block"
                style={{
                  aspectRatio: '3 / 4',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  border: '6px solid #fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                }}
              />
            ))}
          </div>
          <div className="px-5 sm:px-10">
            <CTABtn onClick={scrollToPricing} />
          </div>
        </div>
      </div>

      {/* Footer — extra bottom padding when sticky bar is visible */}
      <div style={{ background: '#1b1b1e', paddingBottom: showSticky ? 80 : 0 }}>
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
