// DEV-ONLY design preview for the redesigned Problem-4 paywall surfaces.
// Mounted at /paywall-preview behind import.meta.env.DEV (see App.tsx) so it
// never ships to production. Pulls the REAL persona roster + per-persona pricing
// from the public endpoints (GET /api/personas, GET /api/personas/:slug) so the
// design can be reviewed with each persona's real portrait, name and prices.
// No auth, no payment side-effects.
//
//   /paywall-preview                       → all surfaces, with a persona picker
//   /paywall-preview?surface=modal|store|banner|payment   → one surface
//   /paywall-preview?slug=marcus-stone     → preselect a persona
//   /paywall-preview?variant=A             → today's copy, for comparison

import { useEffect, useMemo, useState } from "react";
import { CosmicBackground } from "@/components/CosmicBackground";
import PaywallCard from "@/components/paywall/PaywallCard";
import LowBalanceBanner from "@/components/paywall/LowBalanceBanner";
import CreditsStoreView from "@/components/paywall/CreditsStoreView";
import PaymentSheetView from "@/components/paywall/PaymentSheetView";
import {
  applyBVariantBadges,
  defaultTier,
  type PaywallVariant,
} from "@/components/paywall/paywallCopy";
import type { PricingTier } from "@shared/types";
import { DEFAULT_PRICING, COINS_PER_MINUTE } from "@shared/types";

interface PersonaListItem {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
}

interface LoadedPersona {
  displayName: string;
  avatarUrl: string | null;
  tiers: (PricingTier & { recommended?: boolean })[];
  coinsPerMinute: number;
}

// Visual stand-ins for the real PayPal SDK button + Stripe card form (preview only).
function MockPayPal() {
  return (
    <button className="h-[45px] w-full rounded-md bg-[#ffc439] text-[15px] font-bold text-[#003087]">
      <span className="italic">Pay</span>
      <span className="italic text-[#003087]">Pal</span>
      <span className="ml-1 not-italic font-semibold text-[#142c8e]">Checkout</span>
    </button>
  );
}
function MockCard({ priceLabel }: { priceLabel: string }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-400">Card number</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-400">MM / YY</div>
        <div className="rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-400">CVC</div>
      </div>
      <button className="h-[45px] w-full rounded-lg bg-[#635bff] text-[15px] font-semibold text-white">
        Pay {priceLabel}
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{children}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

// Fallback persona if the API is unreachable in the preview.
const FALLBACK: LoadedPersona = {
  displayName: "Evelyn Cross",
  avatarUrl: "/evelyn-avatar.png",
  tiers: applyBVariantBadges(DEFAULT_PRICING.tiers),
  coinsPerMinute: COINS_PER_MINUTE,
};

export default function PaywallPreviewPage() {
  const params = new URLSearchParams(window.location.search);
  const surface = params.get("surface") || "all";
  const variant = (params.get("variant") === "A" ? "A" : "B") as PaywallVariant;

  const [personas, setPersonas] = useState<PersonaListItem[]>([]);
  const [slug, setSlug] = useState<string>(params.get("slug") || "");
  const [persona, setPersona] = useState<LoadedPersona>(FALLBACK);
  const [selectedPackage, setSelectedPackage] = useState<string>("");

  // Load the persona roster (public endpoint, no auth).
  useEffect(() => {
    fetch("/api/personas?pricing=true")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const list: PersonaListItem[] = (Array.isArray(data) ? data : data.personas ?? []).map(
          (p: any) => ({ slug: p.slug, displayName: p.displayName, avatarUrl: p.avatarUrl }),
        );
        setPersonas(list);
        if (!slug && list.length) {
          setSlug(list.find((p) => p.slug === "evelyn-cross")?.slug ?? list[0].slug);
        }
      })
      .catch(() => {/* keep FALLBACK */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the selected persona's detail (name + avatar + resolved tiers).
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/personas/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((p: any) => {
        const rawTiers: PricingTier[] = p.pricing?.tiers ?? p.pricingTiers ?? DEFAULT_PRICING.tiers;
        setPersona({
          displayName: p.displayName ?? "Guide",
          avatarUrl: p.avatarUrl ?? "/evelyn-avatar.png",
          tiers: applyBVariantBadges(rawTiers),
          coinsPerMinute: p.coinsPerMinute ?? COINS_PER_MINUTE,
        });
      })
      .catch(() => setPersona(FALLBACK));
  }, [slug]);

  // Default-select the recommended tile whenever the persona's tiers change.
  useEffect(() => {
    setSelectedPackage(defaultTier(persona.tiers, variant)?.packageType ?? persona.tiers[0]?.packageType ?? "");
  }, [persona, variant]);

  const paymentTier = useMemo(
    () => persona.tiers.find((t) => t.recommended) ?? persona.tiers.find((t) => t.packageType === "premium") ?? persona.tiers[0],
    [persona],
  );
  const paymentPriceLabel = paymentTier ? `$${(paymentTier.priceUsd / 100).toFixed(2)}` : "$0.00";

  const show = (s: string) => surface === "all" || surface === s;

  return (
    <div className="relative min-h-screen">
      <CosmicBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        {/* Header + persona picker */}
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/60">Design preview · not live</p>
          <h1 className="mt-1 font-serif text-2xl text-white">
            Problem 4 — Paywall (variant {variant})
          </h1>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-[12px] text-white/50">Persona</span>
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="bg-transparent text-[13px] font-medium text-white outline-none [&>option]:text-black"
            >
              {personas.length === 0 && <option value="">{persona.displayName}</option>}
              {personas.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {show("banner") && (
          <section className="mb-12" data-surface="banner">
            {surface === "all" && <SectionLabel>A · Low-balance banner</SectionLabel>}
            <div className="space-y-3">
              <LowBalanceBanner personaName={persona.displayName} onAction={() => {}} onDismiss={() => {}} variant={variant} />
              <LowBalanceBanner personaName={persona.displayName} isFreeTrial onAction={() => {}} onDismiss={() => {}} variant={variant} />
            </div>
          </section>
        )}

        {show("modal") && (
          <section className="mb-12" data-surface="modal">
            {surface === "all" && <SectionLabel>B · In-chat paywall (hero)</SectionLabel>}
            <div className="mx-auto max-w-md">
              <PaywallCard
                personaName={persona.displayName}
                avatarUrl={persona.avatarUrl ?? undefined}
                tiers={persona.tiers}
                selectedPackage={selectedPackage}
                onSelect={setSelectedPackage}
                isOutOfCredits
                onCheckout={() => {}}
                onClose={() => {}}
                variant={variant}
                coinsPerMinute={persona.coinsPerMinute}
              />
            </div>
          </section>
        )}

        {show("store") && (
          <section className="mb-12" data-surface="store">
            {surface === "all" && <SectionLabel>C · Credits store page</SectionLabel>}
            <CreditsStoreView
              personaName={persona.displayName}
              avatarUrl={persona.avatarUrl ?? undefined}
              coinBalance={1080}
              tiers={persona.tiers}
              onSelectTier={() => {}}
              showRating
              variant={variant}
              coinsPerMinute={persona.coinsPerMinute}
            />
          </section>
        )}

        {show("payment") && paymentTier && (
          <section className="mb-12" data-surface="payment">
            {surface === "all" && <SectionLabel>D · Payment sheet</SectionLabel>}
            <div className="mx-auto max-w-sm">
              <PaymentSheetView
                tier={paymentTier}
                personaName={persona.displayName}
                paypalSlot={<MockPayPal />}
                cardSlot={<MockCard priceLabel={paymentPriceLabel} />}
                variant={variant}
                coinsPerMinute={persona.coinsPerMinute}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
