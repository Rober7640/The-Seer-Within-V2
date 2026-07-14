import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBraceletBySlug, BUSINESS, FULFILMENT } from "@shared/braceletProducts";

// Facebook compliance requirement #5 — a product page with an ACTIVE buy button and the
// price shown. wishamiracle.com's own pages render "Sold out" here, which is precisely
// the violation that got the ad account blocked.
//
// Layout mirrors the product page Joel screenshotted as [Image #2]: image gallery with a
// thumbnail row on the LEFT; title, price, quantity and BUY on the RIGHT; Description /
// Shipping / Returns tabs beneath.
//
// 🔑 The BUY button posts ONLY { slug, quantity }. The price is looked up server-side from
// shared/braceletProducts.ts. If the client could send a price, anyone could buy a bracelet
// for one cent.

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
/** Whole dollars, no trailing .00 — "Save $100", not "Save $100.00". */
const wholeDollars = (cents: number) => `$${Math.round(cents / 100)}`;

type Tab = "description" | "shipping" | "returns";

export default function ProductPage() {
  const [, params] = useRoute("/products/:slug");
  const product = getBraceletBySlug(params?.slug);

  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>("description");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scoped title — the global one ("…Psychic Chat") reads oddly on a product page.
  useEffect(() => {
    document.title = product ? `${product.name} — The Seer Within` : "Product not found — The Seer Within";
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#0F1729] to-[#1B2A4A] font-sans">
        <SiteHeader />
        <div className="mx-auto max-w-[1120px] px-5 py-24 text-center">
          <h1 className="font-serif text-3xl text-white">Product not found</h1>
          <Link href="/home#catalog" className="mt-5 inline-block text-violet-300 hover:text-white">
            ← Back to the catalog
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  async function buy() {
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/products/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Slug + quantity ONLY. The server owns the price.
        body: JSON.stringify({ slug: product.slug, quantity }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Checkout could not be started.");
      window.location.href = data.url;
    } catch (err) {
      // Never leave the user on a dead button — the soulmate upsell shipped exactly that
      // bug (a catch that returned no url, trapping the buyer).
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "description", label: "Description" },
    { id: "shipping", label: "Shipping" },
    { id: "returns", label: "Returns" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#0F1729] to-[#1B2A4A] font-sans">
      <SiteHeader />

      <div className="mx-auto max-w-[1120px] px-5">
        <div className="py-5 text-[13px] text-slate-400">
          <Link href="/home" className="hover:text-white">Home</Link>
          {" / "}
          <a href="/home#catalog" className="hover:text-white">Catalog</a>
          {" / "}
          <span>{product.name}</span>
        </div>

        <div className="mb-14 rounded-3xl bg-slate-50 p-6 shadow-[0_24px_60px_-28px_rgba(2,6,23,0.55)] md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            {/* ---------- gallery (left) ---------- */}
            <div>
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img
                  src={product.images[imageIndex]}
                  alt={product.name}
                  data-testid="product-hero-image"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-[#0F1729]/80 px-2.5 py-1 text-xs font-semibold text-white">
                  {imageIndex + 1} / {product.images.length}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setImageIndex(i)}
                    aria-current={i === imageIndex}
                    aria-label={`View image ${i + 1}`}
                    className={`aspect-square overflow-hidden rounded-xl border-2 bg-white transition-all hover:-translate-y-0.5 ${
                      i === imageIndex ? "border-violet-600" : "border-slate-200"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* ---------- buy box (right) ---------- */}
            <div>
              <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.15em] text-violet-600">
                {product.tagline}
              </div>
              <h1 className="font-serif text-[28px] font-semibold leading-tight text-slate-900 md:text-[40px]">
                {product.name}
              </h1>

              {/* FB req #5 — the price, shown */}
              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <span data-testid="product-price" className="font-serif text-[40px] font-semibold text-slate-900">
                  {dollars(product.priceCents)}
                </span>
                <span className="text-[19px] text-slate-400 line-through">{dollars(product.compareAtCents)}</span>
                <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
                  Save {wholeDollars(product.compareAtCents - product.priceCents)}
                </span>
              </div>
              <div className="mt-1 text-[13px] text-slate-500">
                Taxes included. Shipping calculated at checkout.
              </div>

              <div className="my-6 flex flex-wrap items-center gap-3.5">
                <div className="flex items-center overflow-hidden rounded-xl border-[1.5px] border-slate-200 bg-white">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="h-[50px] w-11 text-lg text-slate-600 hover:text-violet-600"
                  >
                    −
                  </button>
                  <span data-testid="product-qty" className="w-12 text-center text-base font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="h-[50px] w-11 text-lg text-slate-600 hover:text-violet-600"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.16)]" />
                  In stock — ships within {FULFILMENT.shipsWithin}
                </div>
              </div>

              {/* FB req #5 — an ACTIVE buy button */}
              <button
                onClick={buy}
                disabled={busy}
                data-testid="product-buy"
                className="w-full rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 px-6 py-[19px] text-[16.5px] font-bold text-white shadow-[0_16px_40px_-16px_rgba(124,58,237,0.9)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {busy ? "Starting secure checkout…" : `Buy Now — ${dollars(product.priceCents * quantity)}`}
              </button>

              {error && (
                <div data-testid="product-buy-error" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-3 text-center text-[12.5px] text-slate-500">
                Secure checkout · {FULFILMENT.returnWindowDays}-day returns · Certificate of authenticity included
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                  { b: "Genuine stone", s: "8 mm beads" },
                  { b: `${FULFILMENT.returnWindowDays}-day returns`, s: "No questions" },
                  { b: "Tracked", s: "Emailed in 3–5 days" },
                ].map((t) => (
                  <div key={t.b} className="rounded-xl border border-slate-200 bg-white px-2.5 py-3.5 text-center">
                    <b className="block text-[13px] font-bold text-slate-900">{t.b}</b>
                    <span className="text-[11.5px] text-slate-500">{t.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------- tabs ---------- */}
          <div className="mt-11 border-t border-slate-200 pt-8">
            <div className="mb-7 flex gap-8 border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative pb-4 text-[12.5px] font-bold uppercase tracking-[0.13em] ${
                    tab === t.id ? "text-violet-600" : "text-slate-500"
                  }`}
                >
                  {t.label}
                  {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-violet-600" />}
                </button>
              ))}
            </div>

            <div className="max-w-[780px] text-slate-500">
              {tab === "description" && (
                <>
                  <p className="mb-3">{product.intro}</p>
                  <h3 className="mb-2 mt-6 font-serif text-xl font-semibold text-slate-900">Said to help with</h3>
                  <ul className="mb-4 ml-5 list-disc space-y-1.5">
                    {product.benefits.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                  <h3 className="mb-2 mt-6 font-serif text-xl font-semibold text-slate-900">Specifications</h3>
                  <dl className="grid grid-cols-[130px_1fr] gap-x-5 gap-y-2.5">
                    {product.specs.map((s) => (
                      <div key={s.label} className="contents">
                        <dt className="pt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-600">{s.label}</dt>
                        <dd className="text-slate-700">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {tab === "shipping" && (
                <>
                  <h3 className="mb-2 font-serif text-xl font-semibold text-slate-900">Shipping</h3>
                  <p className="mb-3">
                    Orders ship within <strong className="text-slate-900">{FULFILMENT.shipsWithin}</strong>. A tracking
                    email follows {FULFILMENT.trackingEmail}.
                  </p>
                  <ul className="mb-4 ml-5 list-disc space-y-1.5">
                    <li><strong className="text-slate-900">United States</strong> — {FULFILMENT.usDelivery}</li>
                    <li><strong className="text-slate-900">International</strong> — {FULFILMENT.intlDelivery}</li>
                  </ul>
                  <p>Shipping is calculated at checkout. We ship in recyclable packaging.</p>
                </>
              )}

              {tab === "returns" && (
                <>
                  <h3 className="mb-2 font-serif text-xl font-semibold text-slate-900">Returns</h3>
                  <p className="mb-3">
                    Returns accepted within <strong className="text-slate-900">{FULFILMENT.returnWindowDays} days</strong> of delivery.
                  </p>
                  <ul className="mb-4 ml-5 list-disc space-y-1.5">
                    <li>Refunds to PayPal: 1–2 business days</li>
                    <li>Refunds to credit card: 5–10 business days</li>
                  </ul>
                  <p>
                    To start a return, email{" "}
                    <a href={`mailto:${BUSINESS.email}`} className="text-violet-600 hover:underline">{BUSINESS.email}</a>{" "}
                    or call <a href={BUSINESS.phoneHref} className="text-violet-600 hover:underline">{BUSINESS.phone}</a>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
