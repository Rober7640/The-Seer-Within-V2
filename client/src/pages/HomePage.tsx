import { useEffect } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
        {/* ---------- hero: a white card on the starfield, exactly like the lander ---------- */}
        <div className="mx-auto max-w-[1120px] px-5 pt-16 pb-5">
          <div className="mx-auto max-w-[820px] rounded-3xl bg-slate-50 px-6 py-12 text-center shadow-[0_24px_60px_-28px_rgba(2,6,23,0.55)] md:px-11 md:py-14">
            <div className="mb-5 flex items-center justify-center gap-3.5 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              <span className="h-px w-10 bg-slate-200" />
              Readings &amp; Ritual Objects
              <span className="h-px w-10 bg-slate-200" />
            </div>

            <h1 className="font-serif text-[34px] font-semibold leading-[1.1] text-slate-900 md:text-[52px]">
              Guidance for the questions
              <br />
              you <em className="italic text-violet-600">can&apos;t stop asking</em>
            </h1>

            <p className="mx-auto mt-5 max-w-[560px] text-[17px] text-slate-500">
              Personal spiritual readings, and hand-assembled wish bracelets made with genuine
              stone — each sent with a certificate of authenticity and a wish paper of your own.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/"
                className="rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 px-8 py-4 text-[15px] font-bold text-white shadow-[0_12px_30px_-12px_rgba(124,58,237,0.85)] transition-transform hover:-translate-y-0.5"
              >
                Begin a Reading
              </a>
              <a
                href="#catalog"
                className="rounded-xl border-[1.5px] border-slate-200 bg-white px-8 py-4 text-[15px] font-semibold text-slate-700 transition-colors hover:border-violet-600 hover:text-violet-600"
              >
                Browse the Catalog
              </a>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-7 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <span>🔒 100% Private &amp; Confidential</span>
              <span>✧ Trusted by 2,400+ Clients</span>
            </div>
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
                      Save {dollars(p.compareAtCents - p.priceCents)}
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
