import { Link } from "wouter";

// Facebook compliance requirement #1 — a header with the basic parts
// (Home · About Us · Catalog · Contact).
//
// ⚠️ SCOPE: this is used ONLY by HomePage (/home) and ProductPage (/products/:slug).
// It must NEVER be added to LandingPage or any funnel lander (/fb-palm, /evelyn, /gdn,
// /chat, /welcome*). Those are conversion assets — a nav bar hands visitors exits.
//
// Palette matches the live root lander: navy starfield page, near-white cards, PURPLE
// primary action (#7C3AED), gold reserved for the wordmark.

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0F1729]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-5">
        <Link href="/home" className="flex items-center gap-2.5">
          <span className="text-lg text-purple-500 drop-shadow-[0_0_6px_rgba(147,51,234,0.6)]">✧</span>
          <span className="font-serif text-[22px] text-[#D4AF35]">The Seer Within</span>
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {[
              { label: "Home", href: "/home" },
              { label: "About Us", href: "/home#about" },
              { label: "Catalog", href: "/home#catalog" },
              { label: "Contact", href: "/home#contact" },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="group relative text-[13px] font-semibold uppercase tracking-[0.09em] text-slate-300 transition-colors hover:text-white"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-purple-500 transition-all duration-300 group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* The one link back into the funnel. */}
        <a
          href="/"
          className="rounded-full bg-gradient-to-br from-purple-600 to-violet-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_12px_30px_-12px_rgba(124,58,237,0.85)] transition-transform hover:-translate-y-0.5"
        >
          Begin a Reading
        </a>
      </div>
    </header>
  );
}
