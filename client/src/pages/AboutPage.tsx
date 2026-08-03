import { Link } from "wouter";
import { ArrowLeft, Sparkles } from "lucide-react";
import { SiteFooter } from "../components/SiteFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/">
          <span className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors cursor-pointer mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-8 h-8 text-purple-300" />
          <h1 className="font-serif text-3xl md:text-4xl">About The Seer Within</h1>
        </div>

        <div className="space-y-6 text-purple-100/90 leading-relaxed">
          <p>
            The Seer Within is a spiritual guidance platform operated by Cosmo
            Numerology Pte Ltd, a company registered in the Republic of
            Singapore. We connect seekers with personalized spiritual readings
            and a curated collection of intention-setting jewelry.
          </p>
          <p>
            Our readings explore love, purpose, and abundance through an
            interactive experience with our resident guides, led by Evelyn
            Cross. Alongside readings, our catalog offers wishing and
            manifestation bracelets crafted from genuine crystals — each one
            paired with a certificate of authenticity and designed to anchor a
            daily intention practice.
          </p>
          <p>
            Everything we offer is intended to inspire reflection and positive
            action. Our services and products are provided for entertainment
            and personal-growth purposes and are not a substitute for
            professional advice of any kind.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-8">
            <h2 className="font-serif text-xl mb-3">Contact Us</h2>
            <p className="text-sm space-y-1">
              Cosmo Numerology Pte Ltd
              <br />
              45B Temple Street, Singapore 058590
              <br />
              Email:{" "}
              <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
                hi@theseerwithin.com
              </a>
              <br />
              Website:{" "}
              <a href="https://theseerwithin.com" className="text-purple-300 hover:text-white underline">
                theseerwithin.com
              </a>
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
