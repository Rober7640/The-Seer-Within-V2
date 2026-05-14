import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';

export default function SoulmateProcessPage() {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState([false, false, false]);

  useEffect(() => {
    // Reveal process messages one by one
    const t1 = setTimeout(() => setVisible(v => [true,  false, false]), 800);
    const t2 = setTimeout(() => setVisible(v => [true,  true,  false]), 2800);
    const t3 = setTimeout(() => setVisible(v => [true,  true,  true ]), 4800);

    // Redirect to sales page
    const redirect = setTimeout(() => {
      const raw = sessionStorage.getItem('soulmate_form');
      if (!raw) { navigate('/soulmate'); return; }
      navigate('/soulmate/reading');
    }, 7000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(redirect); };
  }, [navigate]);

  return (
    <div style={{ background: '#f5f5f5', fontFamily: 'sans-serif' }} className="min-h-screen flex flex-col">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&display=swap');
        .merri { font-family: 'Merriweather', Georgia, serif; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeInUp 0.6s ease forwards; }
      `}</style>

      {/* Logo bar */}
      <div style={{ background: '#1b1b1e' }} className="py-4 text-center">
        <div className="max-w-[800px] mx-auto px-4">
          <img src="/soulmate/evelyn-logo-white.png" alt="Evelyn Cross" className="h-12 mx-auto" />
        </div>
      </div>

      {/* Content — cream bg, large top/bottom padding matching wireframe */}
      <div style={{ background: '#fdf8f0' }} className="flex-1">
        <div
          className="max-w-[800px] mx-auto px-10 text-center"
          style={{ paddingTop: 100, paddingBottom: 140 }}
        >
          <img
            src="/soulmate/loading.gif"
            alt="Loading..."
            className="mx-auto mb-6 w-20 h-20 object-contain"
          />

          <h2 className="merri text-[#1b1b1e] text-2xl font-bold mb-8">
            <strong>Processing your name and other details...</strong>
          </h2>

          <div className="space-y-4">
            {[
              "✨ Your soulmate's energy is merging with your reading.",
              '✨ A glimpse of your destiny is being drawn.',
              '✨ Prepare to be amazed.',
            ].map((msg, i) => (
              <div
                key={i}
                className={`text-gray-700 text-base transition-opacity duration-500 ${
                  visible[i] ? 'opacity-100 fade-in' : 'opacity-0'
                }`}
              >
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1b1b1e' }}>
        <div className="max-w-[800px] mx-auto px-10 py-8 text-center">
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
        </div>
      </div>
    </div>
  );
}
