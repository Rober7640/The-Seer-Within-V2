import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { track as trackPH, identifyUser } from '@/lib/posthog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  preference: string;
  ageRange: string;
  ethnicity: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    img: '/soulmate/rubie.png',
    text: "I'm completely enchanted by my soulmate sketch. It feels like Evelyn reached into my soul and painted the image of my perfect match. The lines and details in the artwork as well as the accompanying description are so specific; it's uncanny. I'm thankful for Evelyn and how she opened me to things that I'm yet to experience.",
    name: 'Rubie C.',
  },
  {
    img: '/soulmate/aishwarya.png',
    text: "The moment I opened my soulmate sketch, I burst into tears. It was the most beautiful, heartwarming feeling to see this person who feels so familiar, even though we haven't met yet. It's like having her read my subconscious about who is my ideal partner.",
    name: 'Aishwarya D.',
  },
  {
    img: '/soulmate/mike.png',
    text: "As a man, I was a bit hesitant to try something like this. But Evelyn's soulmate sketch experience exceeded all my expectations. It opened my mind to the possibility of a love that transcends words. Now I'm optimistic, and hopefully, I will meet her soon. I'm so grateful for this unexpected journey.",
    name: 'Michael M.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How do I know this sketch will really represent my soulmate?',
    a: "The sketch is based on intuitive energy readings and your birth details, it captures the essence of your potential soulmate. Many clients find a strong resonance with the sketch, seeing qualities and features that align with their ideal partner. It's a unique blend of art and intuition designed to offer insight and inspiration.",
  },
  {
    q: "I've tried similar services before and was disappointed.",
    a: "I understand your concern. My service is unique because it combines psychic abilities with your specific birth details to create a highly personalized and intuitive sketch. Many clients have found this approach to be more accurate and meaningful. I am committed to providing a positive and uplifting experience.",
  },
  {
    q: 'How exactly does this process work?',
    a: "Great question! The process begins with you providing your birth date and name. I then use my psychic abilities to tune into the unique energies and vibrations associated with your birth details. This intuitive reading guides me in visualizing and sketching a representation of your potential soulmate. It's a blend of intuition, spiritual insight, and artistic expression, designed to give you a personalized and meaningful sketch.",
  },
  {
    q: "I'm worried about sharing my personal information, like my birth date.",
    a: "I understand your concern. Rest assured, your privacy is my top priority. The information you provide, such as your birth date and name, is used solely for the purpose of creating your personalized sketch. I handle all data with the utmost confidentiality and never share your details with anyone else.",
  },
  {
    q: 'How soon can I expect to receive my sketch?',
    a: 'You will receive your sketch via email within 24 hours. In rare cases of high demand, delivery may take up to 48 hours. If you need it sooner, we offer an expedited delivery option, ensuring you receive your sketch within 6 hours.',
  },
  {
    q: 'Will I recognize my soulmate from the sketch?',
    a: 'Many clients find that their sketch resembles someone they already know, such as a current significant other, someone they admire, or someone they have feelings for.',
  },
  {
    q: 'What can I expect from the service?',
    a: "You can expect a high-quality, personalized sketch created through my psychic connection to the universe's infinite energy. Each sketch reflects the visions received during this connection. Your satisfaction is guaranteed.",
  },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1));
const YEARS  = Array.from({ length: 51 }, (_, i) => String(2010 - i));

const ETHNICITIES = [
  { value: 'SA',          label: 'South Asian (e.g., Indian, Pakistani, Sri Lankan)' },
  { value: 'SEA',         label: 'Southeast Asian (e.g., Filipino, Singaporean, Indonesian, Thai)' },
  { value: 'AFR',         label: 'African/African-American' },
  { value: 'CAU',         label: 'Caucasian/White' },
  { value: 'WA',          label: 'West Asian (e.g, Turkish, Iranian)' },
  { value: 'LAT',         label: 'Hispanic/Latino' },
  { value: 'ME',          label: 'Middle Eastern (e.g., Saudi Arabian, Iranian, Iraqi)' },
  { value: 'NA',          label: 'Native American' },
  { value: 'EA',          label: 'East Asian (e.g, Chinese, Japanese, Korean)' },
  { value: 'notspecific', label: 'Prefer not to specify (Let the Universe decide)' },
];

// ─── Shared Select ────────────────────────────────────────────────────────────

function Sel({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[] | string[];
}) {
  const opts = (options as any[]).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ color: '#999', background: '#fff', borderRadius: 5, fontSize: 16, width: '100%', padding: '8px 10px', border: '1px solid #ccc' }}
    >
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.value} value={o.value} style={{ color: '#333' }}>{o.label}</option>)}
    </select>
  );
}

// ─── Popup Modal ──────────────────────────────────────────────────────────────

export function SoulmatePopup({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormData>({
    preference: '', ageRange: '', ethnicity: '',
    birthMonth: '', birthDay: '', birthYear: '',
    firstName: '', middleName: '', lastName: '', email: '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof FormData) => (v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    const required: (keyof FormData)[] = [
      'preference', 'ageRange', 'ethnicity',
      'birthMonth', 'birthDay', 'birthYear',
      'firstName', 'lastName', 'email',
    ];
    if (required.find(k => !form[k])) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    sessionStorage.setItem('soulmate_form', JSON.stringify(form));
    identifyUser(form.email, { funnel: 'soulmate', first_name: form.firstName });
    trackPH('lead_captured', {
      funnel: 'soulmate',
      step: 'landing_form',
      preference: form.preference,
      age_range: form.ageRange,
      ethnicity: form.ethnicity,
    });

    // AWeber: add to Soulmate Leads list (fire-and-forget — don't block nav)
    const urlParams = new URLSearchParams(window.location.search);
    fetch('/api/soulmate/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        preference: form.preference,
        ageRange: form.ageRange,
        ethnicity: form.ethnicity,
        birthMonth: form.birthMonth,
        birthDay: form.birthDay,
        birthYear: form.birthYear,
        landerPath: window.location.pathname,
        utmSource: urlParams.get('utm_source') || undefined,
        utmCampaign: urlParams.get('utm_campaign') || undefined,
        utmMedium: urlParams.get('utm_medium') || undefined,
      }),
    }).catch(() => { /* non-blocking */ });

    navigate('/soulmate/process');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10"
      style={{ background: 'rgba(53,53,53,0.59)', backdropFilter: 'blur(5px)' }}
    >
      <div style={{ width: '100%', maxWidth: 800 }} className="px-4">
        {/* Top bar — black, rounded top */}
        <div style={{ background: '#000', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '30px 20px 20px', position: 'relative' }}>
          <div style={{ textAlign: 'right', position: 'relative' }}>
            <button
              onClick={onClose}
              style={{ color: '#fff', background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}
              aria-label="Close"
            >×</button>
          </div>
          <h1 style={{ fontFamily: 'Merriweather, serif', fontSize: 36, textAlign: 'center', color: '#41a7ec', textShadow: '0 3px 3px rgba(0,0,0,0.2)', marginTop: -30, marginBottom: 0, lineHeight: 1.2 }}>
            <strong><em>Almost Complete...</em></strong>
          </h1>
          <h1 style={{ fontFamily: 'Merriweather, serif', fontSize: 20, textAlign: 'center', color: '#fff', marginTop: 10, marginBottom: 20, lineHeight: 1.3 }}>
            <em>Just answer a few simple questions so I can draw your Soulmate accurately...</em>
          </h1>
        </div>

        {/* Bottom — white, rounded bottom */}
        <div style={{ background: '#fff', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, boxShadow: '0 2px 7px rgba(0,0,0,0.2)' }}>
          <div style={{ background: '#faf5f0', padding: 30 }}>

            {/* Q1 */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: 'Merriweather, serif', fontSize: 22, fontWeight: 700, color: '#414040', marginBottom: 10, lineHeight: 1.3 }}>Who are you interested in?</div>
              <Sel value={form.preference} onChange={set('preference')} placeholder="Tap to select your interest"
                options={[{ value: 'men', label: 'I like men' }, { value: 'women', label: 'I like women' }, { value: 'both', label: 'I like both' }]} />
            </div>

            {/* Q2 */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: 'Merriweather, serif', fontSize: 22, fontWeight: 700, color: '#414040', marginBottom: 10, lineHeight: 1.3 }}>Please select your Age range</div>
              <Sel value={form.ageRange} onChange={set('ageRange')} placeholder="Tap to select your age range"
                options={[{ value: '18-34', label: 'Between 18 and 34' }, { value: '35-54', label: 'Between 35 and 54' }, { value: '55+', label: 'More than 55 years old' }]} />
            </div>

            {/* Q3 */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: 'Merriweather, serif', fontSize: 22, fontWeight: 700, color: '#414040', marginBottom: 10, lineHeight: 1.3 }}>Please choose your preferred ethnic background for your drawing:</div>
              <Sel value={form.ethnicity} onChange={set('ethnicity')} placeholder="Tap to select your preferred ethnic background" options={ETHNICITIES} />
            </div>

            {/* Q4 Birthdate */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: 'Merriweather, serif', fontSize: 22, fontWeight: 700, color: '#414040', marginBottom: 10, lineHeight: 1.3 }}>What is your birthdate?</div>
              <div className="grid grid-cols-3 gap-2">
                <Sel value={form.birthMonth} onChange={set('birthMonth')} placeholder="Month" options={MONTHS} />
                <Sel value={form.birthDay} onChange={set('birthDay')} placeholder="Date" options={DAYS} />
                <Sel value={form.birthYear} onChange={set('birthYear')} placeholder="Year" options={YEARS} />
              </div>
            </div>

            {/* Q5 Name */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: 'Merriweather, serif', fontSize: 22, fontWeight: 700, color: '#414040', marginBottom: 10, lineHeight: 1.3 }}>What is your full birth name</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'firstName',  ph: 'First Name' },
                  { key: 'middleName', ph: 'Middle Name (Optional)' },
                  { key: 'lastName',   ph: 'Last Name' },
                ].map(f => (
                  <input
                    key={f.key}
                    type="text"
                    placeholder={f.ph}
                    value={form[f.key as keyof FormData]}
                    onChange={e => set(f.key as keyof FormData)(e.target.value)}
                    style={{ color: '#414040', background: '#fff', borderRadius: 5, fontSize: 16, padding: '8px 10px', border: '1px solid #ccc', width: '100%' }}
                  />
                ))}
              </div>
            </div>

            {/* Q6 Email */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: 'Merriweather, serif', fontSize: 22, fontWeight: 700, color: '#414040', marginBottom: 10, lineHeight: 1.3 }}><strong>Where should I send your drawing to?</strong></div>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={e => set('email')(e.target.value)}
                style={{ color: '#414040', background: '#fff', borderRadius: 5, fontSize: 16, padding: '8px 10px', border: '1px solid #ccc', width: '100%' }}
              />
            </div>

            {error && <p style={{ color: '#df1414', marginBottom: 10, fontSize: 14 }}>{error}</p>}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={handleSubmit}
                className="lp-btn"
                style={{ display: 'inline-block', width: 'auto', padding: '20px 40px' }}
              >
                Begin to Draw my Soulmate
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10, fontFamily: 'Merriweather, serif', color: '#414040' }}>
              I will now tap into your energy
            </div>
            <div style={{ textAlign: 'center', marginTop: 10, fontFamily: 'Merriweather, serif', fontWeight: 700, color: '#414040' }}>
              🔒 Your info is Secure and I will never spam you
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Testimonial Slider ───────────────────────────────────────────────────────

function TestimonialSlider() {
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);
  const prev = () => setIdx(i => (i === 0 ? TESTIMONIALS.length - 1 : i - 1));
  const next = () => setIdx(i => (i + 1) % TESTIMONIALS.length);
  const t = TESTIMONIALS[idx];

  // Auto-advance every 4 seconds (matches original data-delay="4000"), pause on hover
  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused.current) setIdx(i => (i + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ position: 'relative', marginBottom: 30 }}>
      {/* .slider_testimonial — light blue bg, rounded, padding matches original */}
      <div
        style={{ background: '#f0f9ff', borderRadius: 20, padding: '20px 80px 30px' }}
        className="testimonial-slide"
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
      >

        {/* .testimonial_stack — grid .5fr 1fr (image left, text right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1fr', gap: 20, alignItems: 'center' }}
             className="testimonial-stack">

          {/* Left cell — image centered */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <img
              src={t.img}
              alt={t.name}
              style={{ border: '6px solid #fff', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', width: 130, height: 130, objectFit: 'cover' }}
            />
          </div>

          {/* Right cell — text left, name centered */}
          <div>
            <p style={{ textAlign: 'left', fontSize: 14, lineHeight: 1.5, color: '#555', fontStyle: 'italic', marginBottom: 0 }}>
              <em>{t.text}</em>
            </p>
            <p style={{ textAlign: 'center', fontFamily: 'Merriweather, serif', fontWeight: 700, marginTop: 20, fontSize: 14, color: '#333' }}>
              <em>{t.name}</em>
            </p>
          </div>
        </div>
      </div>

      {/* Arrows — far left/right, vertically centered */}
      <button onClick={prev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#41a7ec' }}>
        <ChevronLeft style={{ width: 28, height: 28 }} />
      </button>
      <button onClick={next} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#41a7ec' }}>
        <ChevronRight style={{ width: 28, height: 28 }} />
      </button>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            style={{ width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === idx ? '#1b1b1e' : '#ccc' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CTA Button ───────────────────────────────────────────────────────────────

function CTABtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="lp-btn">
      Yes, I want my Soulmate Drawing
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SoulmateLandingPage() {
  const [showPopup, setShowPopup] = useState(false);
  const open = () => setShowPopup(true);

  return (
    <div style={{ background: '#f5f5f5', fontFamily: 'sans-serif' }} className="min-h-screen">
      {showPopup && <SoulmatePopup onClose={() => setShowPopup(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Oswald:wght@400;700&display=swap');
        .merri   { font-family: 'Merriweather', Georgia, serif; }
        .cursive { font-family: 'Great Vibes', cursive; font-size: 50px; font-weight: 700; color: #41a7ec; text-shadow: 0 4px 2px rgba(0,0,0,0.1); line-height: 1.1; }
        .oswald  { font-family: 'Oswald', sans-serif; }
        .lp-btn {
          display: block; width: 100%; text-align: center;
          background-color: #41a7ec;
          border-top: 3px solid #63bcf5;
          border-bottom: 3px solid #2d8bc7;
          border-left: none; border-right: none;
          border-radius: 5px;
          padding: 20px 40px;
          font-family: Merriweather, serif;
          font-size: 26px; font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 1px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        .lp-btn:hover { background-color: #2d96e0; }
        @media (max-width: 767px) {
          .cursive { font-size: 44px; }
          .lp-h1   { font-size: 28px !important; line-height: 1.1 !important; }
        }
        @media (max-width: 479px) {
          .lp-btn  { font-size: 22px; padding-left: 20px; padding-right: 20px; line-height: 1.2; }
          .cursive { line-height: 1; }
        }
      `}</style>

      {/* ── Logo bar ── */}
      <div style={{ background: '#1b1b1e', display: 'flex', justifyContent: 'center', padding: 20 }}>
        <img src="/soulmate/evelyn-logo-white.png" alt="Evelyn Cross" style={{ maxWidth: 210, width: '100%' }} />
      </div>

      {/* ── SECTION 1 — Header white ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '20px 40px 40px', boxShadow: '0 2px 4px -5px rgba(0,0,0,0.2)' }}
             className="px-5 sm:px-10">

          {/* h1 */}
          <h1 className="merri lp-h1" style={{ color: '#1b1b1e', fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 0, textAlign: 'center' }}>
            I'll Use My Seer Gifts to Create a Sketch of Your{' '}
            <span className="cursive">Soulmate</span>
          </h1>

          {/* Header image — .header_img */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10, marginBottom: 12 }}>
            <img
              src="/soulmate/sketch-example.jpg"
              alt="Soulmate Sketch"
              style={{ border: '10px solid #fff', maxWidth: 480, width: '100%', boxShadow: '0 2px 8px 2px rgba(0,0,0,0.2)' }}
            />
          </div>

          {/* join_text */}
          <div style={{ marginBottom: 16, fontSize: 17 }}>
            Join the <strong>12,973</strong> people who have already discovered the face of their soulmate with my help!
          </div>

          {/* Testimonial slider */}
          <TestimonialSlider />

          <CTABtn onClick={open} />
        </div>
      </div>

      {/* ── SECTION 2 — Discover Your Soulmate Portrait (cream) ── */}
      <div style={{ background: '#fdf8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '30px 40px 40px' }}
             className="px-5 sm:px-10">

          {/* h2 */}
          <h2 className="merri" style={{ color: '#1b1b1e', fontSize: 30, fontWeight: 700, marginBottom: 20 }}>
            Discover Your <span className="cursive">Soulmate Portrait</span>
          </h2>

          {/* h3 */}
          <h3 style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.4, marginBottom: 20, color: '#555' }}>
            Test my skills today... as{' '}
            <span style={{ textDecoration: 'underline' }}>I tune into your energy, guided by your birth details</span>
            , to draw the person destined to be your perfect match.
          </h3>

          {/* sketch_comp_img */}
          <img
            src="/soulmate/evelyn-hero.png"
            alt="Evelyn Cross"
            className="w-full mb-1"
          />

          {/* Artist name + title */}
          <div style={{ textAlign: 'center', marginTop: 0, marginBottom: 4 }}>
            <div className="merri" style={{ color: '#41a7ec', fontSize: 26, fontWeight: 700 }}>Evelyn Cross</div>
            <div style={{ fontStyle: 'italic', fontSize: 16, color: '#666', marginTop: 4 }}>Seer Artist</div>
          </div>

          {/* Stats 3-col — .stack_main / .details_cell */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 10, marginTop: 16 }}>
            {/* Cell 1 — 30+ */}
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 10, padding: '20px 10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <div className="oswald" style={{ color: '#fdbf00', fontSize: 50, lineHeight: 1 }}>30+</div>
              <div className="oswald" style={{ color: '#1b1b1e', textTransform: 'uppercase', marginTop: 10, fontSize: 16, lineHeight: 1.3 }}>years experience</div>
            </div>
            {/* Cell 2 — 5-star */}
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 10, padding: '20px 10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <img src="/soulmate/five-stars.png" alt="5 stars" style={{ width: 60, height: 'auto', display: 'block', margin: '0 auto 10px' }} />
              <div className="oswald" style={{ color: '#1b1b1e', textTransform: 'uppercase', fontSize: 16, lineHeight: 1.3 }}>Over 1000 5-star reviews</div>
            </div>
            {/* Cell 3 — clients */}
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 10, padding: '20px 10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <img src="/soulmate/customer-review.png" alt="customers" style={{ width: 60, height: 'auto', display: 'block', margin: '0 auto 10px' }} />
              <div className="oswald" style={{ color: '#1b1b1e', textTransform: 'uppercase', fontSize: 16, lineHeight: 1.3 }}>Thousands of clients worldwide</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <CTABtn onClick={open} />
          </div>
        </div>
      </div>

      {/* ── SECTION 3 — Dark banner ── */}
      <div style={{ background: '#1b1b1e' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '30px 40px 20px' }}
             className="px-5 sm:px-10">
          <h2 className="merri" style={{ color: '#fff', fontSize: 30, fontWeight: 700, marginTop: 10, marginBottom: 20 }}>
            How <span className="cursive">Soulmate Sketch </span> Works?
          </h2>
        </div>
      </div>

      {/* ── SECTION 4 — How it works + FAQ (white) ── */}
      <div style={{ background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left', padding: '30px 40px 50px' }}
             className="px-5 sm:px-10">

          <p style={{ textAlign: 'left', fontSize: 18, lineHeight: 1.4, marginBottom: 20, color: '#333' }}>
            The sketches are created using intuitive energy readings,{' '}
            <strong style={{ textDecoration: 'underline' }}>guided by your birth details</strong>.
            Although I may not know you personally, I tap into the energies and vibrations connected
            to you at the time of your request. These energies help me visualize and sketch a
            representation of your potential soulmate.
          </p>
          <p style={{ textAlign: 'left', fontSize: 18, lineHeight: 1.4, marginBottom: 20, color: '#333' }}>
            <strong>This process combines intuition, spiritual insight, and artistic expression.</strong>{' '}
            Many people find these sketches to be a fascinating and enjoyable exploration of
            possibilities, while others experience a deeper resonance. Regardless, the aim is to
            provide you with a positive and uplifting experience.
          </p>
          <p style={{ textAlign: 'left', fontSize: 18, lineHeight: 1.4, marginBottom: 20, color: '#333' }}>
            There's no need for an in-person meeting to achieve an accurate sketch; the process{' '}
            <strong style={{ textDecoration: 'underline' }}>
              works effectively through the connection with your birth details and my psychic abilities.
            </strong>
          </p>

          {/* FAQ list — .list_item with question-mark icon */}
          <ul style={{ marginTop: 20, marginBottom: 30, paddingLeft: 0, listStyleType: 'none' }}>
            {FAQ_ITEMS.map((item, i) => (
              <li key={i} style={{
                backgroundImage: 'url(/soulmate/question-mark-lightblue.png)',
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 30,
                paddingLeft: 40,
                marginBottom: 4,
              }}>
                <div style={{ textAlign: 'left', fontSize: 20, lineHeight: 1.4, marginBottom: 10, color: '#41a7ec', fontWeight: 600 }}>{item.q}</div>
                <div style={{ textAlign: 'left', fontSize: 18, lineHeight: 1.3, marginBottom: 20, fontFamily: 'Arial, sans-serif', fontWeight: 400, color: '#555' }}>{item.a}</div>
              </li>
            ))}
          </ul>

          <CTABtn onClick={open} />
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: '#1b1b1e' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '30px 40px' }}
             className="px-5 sm:px-10">
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>
            <Link href="/privacy"><span style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Privacy Policy</span></Link>
            {' | '}
            <Link href="/terms"><span style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Terms of Service</span></Link>
            {' | '}
            <Link href="/refund"><span style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')} onMouseLeave={e => (e.currentTarget.style.color = '')}>Refund Policy</span></Link>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.3, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Disclaimer: By participating in my services you acknowledge that I am not a licensed
            psychologist, lawyer, or health care professional and my services do not replace the care
            of lawyers, psychologists, or other healthcare professionals. Tarot and numerology are
            in no way to be construed or substituted as psychological counseling or any other type of
            therapy or medical advice. I will at all times exercise my best professional efforts,
            skills, and care. However, I cannot guarantee the outcome of reading efforts and/or
            recommendations on my website and my comments about the outcome are expressions of
            opinion only. I cannot make any guarantees other than to deliver the services purchased
            as described. All my sketches and readings are intended for entertainment purposes only
            and may not be unique.
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 12 }}>
            &copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.
          </p>
        </div>
      </div>
    </div>
  );
}
