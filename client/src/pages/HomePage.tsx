import { useEffect } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
// The hero reuses the ROOT LANDER's own components, not lookalikes — so the Evelyn card on
// the storefront and the card on "/" can never drift apart. This is what Joel's own mockup
// did (image (11).png, 2026-07-14): he embedded the real lander card into the homepage.
// CTAButton is disabled for 3s until the status reads "Online", then links to funnelPath('/chat').
// On /home that resolves to plain "/chat" (no funnel prefix matches), i.e. the root funnel.
import { StatusIndicator } from "@/components/StatusIndicator";
import { CTAButton } from "@/components/CTAButton";
import { TrustBadges } from "@/components/TrustBadges";
import { BRACELET_PRODUCTS, BUSINESS } from "@shared/braceletProducts";

// The Facebook-compliance homepage. Served at /home — a NEW, SEPARATE route.
//
// ⚠️ It deliberately does NOT replace the root lander at "/". LandingPage is the top of
// the V1 conversion funnel and is untouched (Lewis, 2026-07-14: "design a separate new
// home page and separate url for it and dont modify our existing lander").
//
// ⚠️ OPEN QUESTION: Facebook most likely reviews the ROOT domain. If it does, a compliant
// page at /home will not unblock the ad account on its own — the reviewer would still land
// on the funnel lander. This page is fully self-contained precisely so that promoting it to
// "/" later is a one-line route change in App.tsx. Confirm the target URL with Joel/Facebook.
//
// Palette is lifted from the live root lander: navy starfield page, near-white card
// surfaces, PURPLE primary buttons, gold wordmark only.

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
/** Whole dollars, no trailing .00 — "Save $100", not "Save $100.00". */
const wholeDollars = (cents: number) => `$${Math.round(cents / 100)}`;

export default function HomePage() {
  // The global index.html title is "…Psychic Chat", which reads oddly on a storefront a
  // Facebook reviewer is going to open. Scoped to this page; nothing else is affected.
  useEffect(() => {
    document.title = "The Seer Within — Spiritual Readings & Wish Bracelets";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#0F1729] to-[#1B2A4A] font-sans">
      <SiteHeader />

      <main>
        {/* ---------- hero: the REAL Evelyn lander card, embedded (matches Joel's mockup) ---------- */}
        <div className="flex flex-col items-center px-5 pt-14 pb-6">
          {/* Big centred wordmark above the card, as on the root lander */}
          <div className="mb-16 flex items-center gap-3">
            <span className="text-3xl text-purple-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.7)]">✧</span>
            <h1 className="font-serif text-3xl text-[#D4AF35] drop-shadow-md md:text-4xl">
              The Seer Within
            </h1>
          </div>

          {/* Card markup deliberately mirrors LandingPage.tsx line-for-line. */}
          <div className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-sm md:p-8">
            {/* Evelyn — the avatar overlaps the top edge of the card */}
            <div className="-mt-16 mb-6 flex justify-center">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-purple-100 shadow-xl">
                <img
                  src="/evelyn-avatar.png"
                  alt="Evelyn Cross"
                  className="h-full w-full object-cover"
                  data-testid="img-avatar-home"
                />
              </div>
            </div>

            {/* "Evelyn Cross is ● Online" */}
            <div className="mx-auto mb-6 inline-block w-full rounded-full border border-gray-100 bg-gray-50 px-4 py-2 text-center shadow-inner">
              <StatusIndicator />
            </div>

            <div className="mx-auto my-6 h-0.5 w-16 bg-gray-200" />

            <h2 className="mb-4 text-center font-serif text-2xl leading-tight text-gray-900 md:text-3xl">
              Something Is Holding You Back — I Can See It
            </h2>

            <p className="mb-8 text-center text-sm leading-relaxed text-gray-600 md:text-base">
              Evelyn has detected a disturbance in your energy field. A free reading will reveal
              what&apos;s standing in your way.
            </p>

            {/* Goes straight into the reading — funnelPath('/chat') resolves to /chat here. */}
            <CTAButton label="Yes Evelyn, Show Me What's Blocking My Path!" />

            <p className="mt-4 text-center text-xs italic text-gray-400">
              Evelyn can only hold a limited number of connections each day. Your spot is open now.
            </p>

            <TrustBadges label="Trusted By 2,400+ Clients" />
          </div>
        </div>

        {/* ---------- FB req #4: 3 products, clickable, each opening its own page ---------- */}
        <section id="catalog" className="scroll-mt-24 py-16">
          <div className="mx-auto max-w-[1120px] px-5">
            <div className="mb-11 text-center">
              <h2 className="font-serif text-[28px] font-semibold text-white md:text-[38px]">
                The Wish Bracelet Collection
              </h2>
              <p className="mt-2.5 text-slate-400">
                Genuine stone. 8&nbsp;mm beads. Sent with a certificate of authenticity.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {BRACELET_PRODUCTS.map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  data-testid={`product-card-${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_-28px_rgba(2,6,23,0.55)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_34px_70px_-26px_rgba(2,6,23,0.7)]"
                >
                  <div className="relative aspect-square overflow-hidden bg-white">
                    <span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-violet-600 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
                      Save {wholeDollars(p.compareAtCents - p.priceCents)}
                    </span>
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-5 pb-6">
                    <h3 className="font-serif text-[21px] font-semibold text-slate-900">{p.name}</h3>
                    <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-violet-600">
                      {p.tagline}
                    </div>
                    <p className="mt-3 flex-1 text-sm text-slate-500">{p.blurb}</p>

                    <div className="mt-4 flex items-baseline gap-2.5">
                      <span className="font-serif text-[26px] font-semibold text-slate-900">{dollars(p.priceCents)}</span>
                      <span className="text-[15px] text-slate-400 line-through">{dollars(p.compareAtCents)}</span>
                    </div>
                    <div className="mt-3.5 text-[13px] font-bold text-violet-600">
                      View product <span className="inline-block transition-all group-hover:ml-1.5">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- about + contact ---------- */}
        <section id="about" className="scroll-mt-24 pb-16">
          <div className="mx-auto max-w-[1120px] px-5">
            <div className="grid gap-10 rounded-3xl bg-slate-50 px-6 py-12 shadow-[0_24px_60px_-28px_rgba(2,6,23,0.55)] md:grid-cols-2 md:gap-14 md:px-11">
              <div>
                <h2 className="mb-4 font-serif text-[31px] font-semibold text-slate-900">About Us</h2>
                <p className="mb-3 text-slate-500">
                  The Seer Within is an online spiritual reading service and small-batch jewellery
                  studio, operated by {BUSINESS.legalName} in Singapore.
                </p>
                <p className="mb-3 text-slate-500">
                  We pair one-to-one intuitive readings with ritual objects made from genuine stone —
                  assembled by hand, never mass-produced. Every bracelet ships with a certificate of
                  authenticity, a wish paper and care instructions, in recyclable packaging.
                </p>
                <p className="text-slate-500">
                  Readings are for guidance and entertainment. We make no medical, legal or
                  financial claims.
                </p>
              </div>

              <div id="contact" className="scroll-mt-24">
                <h2 className="mb-4 font-serif text-[31px] font-semibold text-slate-900">Contact</h2>
                <ul>
                  {[
                    { k: "Email", v: <a href={`mailto:${BUSINESS.email}`} className="border-b border-slate-200 text-slate-900 hover:border-violet-600 hover:text-violet-600">{BUSINESS.email}</a> },
                    { k: "Phone", v: <a href={BUSINESS.phoneHref} className="border-b border-slate-200 text-slate-900 hover:border-violet-600 hover:text-violet-600">{BUSINESS.phone}</a> },
                    { k: "Address", v: <span className="text-slate-900">{BUSINESS.legalName}<br />{BUSINESS.addressLines.join(", ")}</span> },
                    { k: "Website", v: <a href={`https://${BUSINESS.website}`} className="border-b border-slate-200 text-slate-900 hover:border-violet-600 hover:text-violet-600">{BUSINESS.website}</a> },
                    { k: "Hours", v: <span className="text-slate-900">Support answered within 24 hours, 7 days a week</span> },
                  ].map((row) => (
                    <li key={row.k} className="flex gap-4 border-b border-slate-200 py-3.5 text-[15px] last:border-b-0">
                      <span className="min-w-[82px] pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-600">
                        {row.k}
                      </span>
                      {row.v}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
