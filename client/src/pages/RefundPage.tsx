import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function RefundPage() {
  useEffect(() => {
    document.title = 'Refund Policy | The Seer Within';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/personas">
          <button className="flex items-center gap-2 text-purple-300 hover:text-white mb-8 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back to Guides
          </button>
        </Link>

        <h1 className="font-serif text-3xl font-bold mb-2" data-testid="heading-refund">Refund Policy</h1>
        <p className="text-purple-300 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-purple-100 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Our Commitment</h2>
            <p>
              At The Seer Within, operated by Cosmo Numerology Pte Ltd, we want you to feel confident
              in every purchase. While digital reading credits are consumed immediately upon use, we
              recognise that circumstances change — and we extend a goodwill refund on unused Credits
              under the conditions set out in this Policy.
            </p>
            <p className="mt-3">
              This Policy forms part of our{' '}
              <Link href="/terms">
                <span className="text-purple-300 hover:text-white underline cursor-pointer">Terms of Service</span>
              </Link>
              . Defined terms used here have the same meaning as in those Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Reading Credits — Goodwill Refund</h2>
            <div className="bg-purple-900/60 border border-purple-500 rounded-lg p-4 mb-4">
              <p className="font-semibold text-white mb-1">Summary: 30-day goodwill refund on unused purchased Credits.</p>
            </div>
            <p className="mb-3">We will consider a refund request for purchased reading Credits where:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>The request is made within <strong>30 calendar days</strong> of the original purchase date; and</li>
              <li>The Credits from that purchase have <strong>not been used</strong> in any guide session.</li>
            </ul>
            <p className="mb-3">
              Where a purchase has been partially used (i.e. some Credits from that purchase were
              consumed in sessions), only the unused portion is eligible for a goodwill refund.
              The refund amount will be calculated on a pro-rata basis against the original purchase price.
            </p>
            <p className="mb-3">The following Credits are <strong>not</strong> eligible for refund:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Credits that have been consumed (used) in any guide session, even partially;</li>
              <li>Complimentary welcome Credits (free Credits granted at registration have no cash value);</li>
              <li>Credits purchased more than 30 days before the refund request;</li>
              <li>Credits that have already expired.</li>
            </ul>
            <p className="mt-4 text-purple-200 text-sm">
              This goodwill refund is provided at our sole discretion. It does not affect, and is in
              addition to, any statutory rights you may have under Singapore law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Credit Expiry — No Refund After Expiry</h2>
            <p className="mb-3">
              As set out in our Terms of Service, purchased Credits expire <strong>6 months from the
              date of purchase</strong>. Credits that have expired are forfeited and are not eligible
              for any refund, extension, or reactivation.
            </p>
            <p>
              We will endeavour (on a best-efforts basis) to send you a reminder email approximately
              14 days before your Credits expire. However, it remains your responsibility to use
              Credits before they expire. A missed reminder notification does not entitle you to a
              refund or extension of expired Credits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Physical Products (Protection Stones &amp; Ritual Items)</h2>
            <p className="mb-3">For physical products ordered through our platform:</p>
            <ul className="list-disc list-inside space-y-3 ml-4">
              <li>
                <strong>Damaged or Defective Items:</strong> If your item arrives damaged or defective,
                contact us within 7 days of delivery with clear photographs of the damage. We will
                replace the item at no additional cost or, at our discretion, issue a full refund.
              </li>
              <li>
                <strong>Non-Delivery:</strong> If your order does not arrive within 30 days of the
                estimated delivery date, contact us. We will investigate with the carrier and either
                reship the order or provide a full refund.
              </li>
              <li>
                <strong>Change of Mind:</strong> Due to the personalised and energetically prepared
                nature of our ritual items, we do not offer refunds on the basis of change of mind.
                Each item is prepared specifically for you upon order.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. How to Request a Refund</h2>
            <p className="mb-3">To request a refund, please follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                Email us at{' '}
                <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">
                  support@cosmonumerology.com
                </a>{' '}
                with the subject line "Refund Request"
              </li>
              <li>Include the email address associated with your account</li>
              <li>Include the date of purchase and the amount paid</li>
              <li>Briefly describe the reason for your request</li>
              <li>For damaged physical items, attach clear photographs of the damage</li>
            </ol>
            <p className="mt-3">
              We aim to acknowledge all refund requests within 2 business days and to complete our
              review within 5 business days of receiving your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Refund Processing</h2>
            <p>
              Approved refunds will be credited to your original payment method. Processing times
              vary by provider:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li><strong>Credit/debit card refunds:</strong> typically 5–10 business days after approval, depending on your card issuer.</li>
              <li><strong>Other payment methods:</strong> timing will be communicated at the time of approval.</li>
            </ul>
            <p className="mt-3">
              We have no control over your bank or card issuer's posting timelines. If your refund
              does not appear after 15 business days, please contact your bank before reaching out
              to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Exceptions and Refusal of Refunds</h2>
            <p className="mb-3">We reserve the right to decline a refund request in cases of:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Suspected abuse of our refund policy (e.g. a pattern of purchasing and immediately requesting refunds);</li>
              <li>Fraudulent, deceptive, or bad-faith claims;</li>
              <li>Requests made outside the applicable timeframes set out in this Policy;</li>
              <li>Credits that have been used in sessions, regardless of satisfaction with the reading.</li>
            </ul>
            <p className="mt-3">
              If we decline your request, we will explain the reason. You may contact us to discuss
              the decision further.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Your Statutory Rights</h2>
            <p>
              This Refund Policy does not limit or affect your statutory rights as a consumer under
              the Consumer Protection (Fair Trading) Act (Cap. 52A) of Singapore or any other
              applicable Singapore consumer protection legislation. If you believe you have experienced
              an unfair trade practice, you may also seek assistance from the Consumers Association
              of Singapore (CASE) at{' '}
              <span className="text-purple-300">www.case.org.sg</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
            <p className="mb-3">For any questions about this Refund Policy:</p>
            <div className="bg-purple-900/50 rounded-lg p-4 border border-purple-700">
              <p className="font-semibold text-white">Cosmo Numerology Pte Ltd</p>
              <p>45B Temple St S058590</p>
              <p>Singapore</p>
              <p className="mt-2">
                Email:{' '}
                <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">
                  support@cosmonumerology.com
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-purple-700 text-center text-purple-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
