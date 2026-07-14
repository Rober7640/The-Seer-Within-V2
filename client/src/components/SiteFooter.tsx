import { Link } from "wouter";
import { BRACELET_PRODUCTS, BUSINESS } from "@shared/braceletProducts";

// Facebook compliance requirements #2 and #3 — a footer carrying the FULL business
// information (website, email, full postal address, telephone) and a real
// xxxx@domain email address displayed as text.
//
// The address and telephone are REAL (Lewis, 2026-07-14). Do not replace them with
// placeholders: the boss's own draft shipped `+65 0000 0000`, which would have failed
// the exact Facebook review this page exists to pass.
//
// ⚠️ SCOPE: used ONLY by HomePage (/home) and ProductPage (/products/:slug).
// Never add it to LandingPage or any funnel lander.

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-9 border-t border-white/[0.08] pt-14 pb-8">
      <div className="mx-auto max-w-[1120px] px-5">
        <div className="grid gap-9 md:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.4fr]">
          {/* brand */}
          <div>
            <Link href="/home" className="flex items-center gap-2.5">
              <span className="text-lg text-purple-500">✧</span>
              <span className="font-serif text-[22px] text-[#D4AF35]">The Seer Within</span>
            </Link>
            <p className="mt-3 max-w-[290px] text-sm text-slate-400">
              Spiritual readings and hand-assembled wish bracelets.
              For guidance and entertainment purposes only.
            </p>
          </div>

          {/* shop — every product is one click from the footer */}
          <div>
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4AF35]">Shop</h4>
            <ul className="space-y-2.5">
              {BRACELET_PRODUCTS.map((p) => (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`} className="text-sm text-slate-400 transition-colors hover:text-white">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* company */}
          <div>
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4AF35]">Company</h4>
            <ul className="space-y-2.5">
              <li><a href="/home#about" className="text-sm text-slate-400 hover:text-white">About Us</a></li>
              <li><a href="/home#contact" className="text-sm text-slate-400 hover:text-white">Contact</a></li>
              <li><Link href="/privacy" className="text-sm text-slate-400 hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-slate-400 hover:text-white">Terms of Service</Link></li>
              <li><Link href="/refund" className="text-sm text-slate-400 hover:text-white">Refund Policy</Link></li>
            </ul>
          </div>

          {/* FB req #2: website + email + FULL address + telephone */}
          <div>
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#D4AF35]">Get in touch</h4>
            <address className="text-sm not-italic leading-[1.85] text-slate-400">
              <strong className="font-semibold text-slate-200">{BUSINESS.legalName}</strong><br />
              {BUSINESS.addressLines.map((line) => (
                <span key={line}>{line}<br /></span>
              ))}
              <br />
              <a href={`mailto:${BUSINESS.email}`} className="text-violet-300 hover:text-white">{BUSINESS.email}</a><br />
              <a href={BUSINESS.phoneHref} className="text-violet-300 hover:text-white">{BUSINESS.phone}</a><br />
              <a href={`https://${BUSINESS.website}`} className="text-violet-300 hover:text-white">{BUSINESS.website}</a>
            </address>
          </div>
        </div>

        <div className="mt-11 flex flex-wrap justify-between gap-4 border-t border-white/[0.08] pt-6 text-[13px] text-slate-400">
          <span>© {new Date().getFullYear()} {BUSINESS.legalName}. · For Entertainment Purposes Only.</span>
          <span className="space-x-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/refund" className="hover:text-white">Refunds</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
