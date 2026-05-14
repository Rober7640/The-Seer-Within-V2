import { Link } from 'wouter';

export default function SoulmateThankYouPage() {
  const raw = sessionStorage.getItem('soulmate_form');
  const formData = raw ? JSON.parse(raw) : null;
  const firstName = formData?.firstName || 'Friend';

  return (
    <div style={{ background: '#f5f5f5', fontFamily: 'sans-serif' }} className="min-h-screen">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
        .cursive { font-family: 'Great Vibes', cursive; font-size: 50px; font-weight: 700; color: #41a7ec; text-shadow: 0 4px 2px rgba(0,0,0,0.1); }
        .merri   { font-family: 'Merriweather', Georgia, serif; }
      `}</style>

      {/* Logo bar */}
      <div style={{ background: '#1b1b1e' }} className="py-4 text-center">
        <div className="max-w-[800px] mx-auto px-4">
          <img src="/soulmate/evelyn-logo-white.png" alt="Evelyn Cross" className="h-12 mx-auto" />
        </div>
      </div>

      {/* Thank You Header */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-12 text-center">
          <p className="cursive" style={{ marginBottom: 8 }}>Thank You</p>
          <h1 className="merri text-[#1b1b1e] font-bold leading-snug mb-4" style={{ fontSize: 28 }}>
            Your Order is Confirmed, {firstName}!
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: '#444', maxWidth: 560, margin: '0 auto' }}>
            I'm so excited to begin channeling your energy and creating your personalized
            Soulmate Sketch. This is the start of something beautiful.
          </p>
        </div>
      </div>

      {/* What Happens Next */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10">
          <div className="text-center mb-8">
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              color: '#41a7ec', textTransform: 'uppercase', marginBottom: 10,
            }}>What happens next</p>
            <h2 className="merri text-[#1b1b1e] font-bold" style={{ fontSize: 26 }}>
              Your Sketch Will Be Delivered Within 24 Hours
            </h2>
          </div>

          <div className="space-y-5 max-w-[600px] mx-auto">
            {[
              {
                num: '1',
                title: 'I begin your reading now',
                text: 'Using your birth details and the energy you shared with me, I will enter a deep intuitive session to connect with your soulmate\'s essence.',
              },
              {
                num: '2',
                title: 'Your sketch is carefully crafted',
                text: 'Every detail is drawn with care and intention. This is not a rushed process — I dedicate 2-3 hours of focused work exclusively to your portrait.',
              },
              {
                num: '3',
                title: 'Delivered to your inbox within 24 hours',
                text: 'Your complete Soulmate Sketch, along with a detailed personality description, will arrive in your email.',
              },
            ].map((step) => (
              <div key={step.num} style={{
                background: '#fff',
                padding: '20px 24px',
                borderRadius: 8,
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#41a7ec', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Merriweather, serif', fontWeight: 700, fontSize: 18,
                  flexShrink: 0,
                }}>{step.num}</div>
                <div>
                  <p className="merri" style={{ fontWeight: 700, fontSize: 17, color: '#1b1b1e', marginBottom: 6 }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 16, lineHeight: 1.6, color: '#555' }}>
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Whitelist Email */}
      <div style={{ background: '#fff' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: '#41a7ec', textTransform: 'uppercase', marginBottom: 10,
          }}>Important step</p>
          <h2 className="merri text-[#1b1b1e] font-bold mb-3" style={{ fontSize: 26 }}>
            Make Sure You Receive Your Sketch
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: '#444', marginBottom: 24, maxWidth: 560, margin: '0 auto 24px' }}>
            To make sure your sketch arrives safely, please whitelist my email address.
            This only takes a moment:
          </p>

          {/* Email to whitelist */}
          <div style={{
            background: '#f0f9ff',
            border: '2px solid #41a7ec',
            borderRadius: 10,
            padding: '16px 24px',
            display: 'inline-block',
            marginBottom: 28,
          }}>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>Add this address to your contacts:</p>
            <p className="merri" style={{ fontSize: 22, fontWeight: 700, color: '#41a7ec' }}>
              hi@theseerwithin.com
            </p>
          </div>

          {/* Instructions per provider */}
          <div className="space-y-4 max-w-[540px] mx-auto text-left">
            {[
              {
                provider: 'Gmail',
                steps: 'Open Gmail, click the search bar, search for "hi@theseerwithin.com". If you find an email, open it, click the three dots (top right), and select "Add to Contacts". If not, simply compose a new email to hi@theseerwithin.com and send a quick hello — this tells Gmail we\'re friends.',
              },
              {
                provider: 'Outlook / Hotmail',
                steps: 'Open Outlook, go to People (Contacts), click "New Contact", and add hi@theseerwithin.com as the email address. Click Save.',
              },
              {
                provider: 'Yahoo Mail',
                steps: 'Open Yahoo Mail, click the Contacts icon (person silhouette), click "Add a new contact", type hi@theseerwithin.com and save.',
              },
              {
                provider: 'Apple Mail / iCloud',
                steps: 'Open the Contacts app on your device, tap "+", add hi@theseerwithin.com as the email, and tap Done.',
              },
            ].map((item) => (
              <div key={item.provider} style={{
                background: '#fdf8f0',
                padding: '16px 20px',
                borderRadius: 8,
              }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#1b1b1e', marginBottom: 4 }}>
                  {item.provider}
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#666' }}>
                  {item.steps}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            padding: '14px 20px',
            marginTop: 24,
            maxWidth: 540,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <p style={{ fontSize: 15, color: '#856404', lineHeight: 1.5 }}>
              <strong>Also check your Spam and Promotions folders</strong> — sometimes emails
              end up there by mistake. If you see my email in Spam, mark it as "Not Spam" so
              future messages arrive in your inbox.
            </p>
          </div>
        </div>
      </div>

      {/* Support / Questions */}
      <div style={{ background: '#fdf8f0' }}>
        <div className="max-w-[800px] mx-auto px-5 sm:px-10 py-10 text-center">
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: '#41a7ec', textTransform: 'uppercase', marginBottom: 10,
          }}>Need help?</p>
          <h2 className="merri text-[#1b1b1e] font-bold mb-4" style={{ fontSize: 24 }}>
            Questions? I'm Here For You
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#444', maxWidth: 500, margin: '0 auto 16px' }}>
            If you don't receive your sketch within 24 hours, or if you have any
            questions at all, simply send me an email:
          </p>
          <a
            href="mailto:hi@theseerwithin.com"
            className="merri"
            style={{
              fontSize: 20, fontWeight: 700, color: '#41a7ec',
              textDecoration: 'underline',
            }}
          >
            hi@theseerwithin.com
          </a>
          <p style={{ fontSize: 15, color: '#888', marginTop: 12 }}>
            I personally read every email and will get back to you as soon as possible.
          </p>
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
