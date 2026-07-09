import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function TermsPage() {
  useEffect(() => {
    document.title = 'Terms of Service | The Seer Within';
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

        <h1 className="font-serif text-3xl font-bold mb-2" data-testid="heading-terms">Terms of Service</h1>
        <p className="text-purple-300 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-purple-100 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using The Seer Within website and services operated by Cosmo Numerology Pte Ltd
              ("Company", "we", "our", "us"), you agree to be bound by these Terms of Service
              and our Privacy Policy. If you do not agree to these terms, please do not use our services.
              These terms constitute a binding legal agreement between you and the Company under the laws of
              the Republic of Singapore.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Nature of Services</h2>
            <p className="mb-3">
              The Seer Within offers spiritual readings, numerological insights, and intuitive guidance
              for the purposes of entertainment, self-reflection, and personal inspiration. Our guides
              draw on spiritual and metaphysical traditions to offer perspectives that many people find
              thought-provoking, comforting, and meaningful.
            </p>
            <p className="mb-3">
              By using our services, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Readings are intended for entertainment and personal reflection. They are not a
                  substitute for professional medical, psychological, legal, or financial advice.</li>
              <li>Spiritual and intuitive readings are subjective by nature. Interpretations may
                  resonate differently with different people, and no specific outcome or future event
                  is guaranteed.</li>
              <li>The insights offered are one perspective among many. How you interpret and act upon
                  them is entirely your own choice, and you remain solely responsible for your decisions
                  and actions.</li>
              <li>Our services are not intended to diagnose, treat, cure, or prevent any physical or
                  mental health condition.</li>
            </ul>
            <p className="mb-3">
              We believe in the power of self-exploration and the wisdom that can emerge from
              reflection — and we take seriously our responsibility to offer that experience with
              care and integrity.
            </p>
            <p>
              If you are experiencing a personal crisis, mental health difficulty, or any situation
              requiring urgent professional support, we encourage you to reach out to a qualified
              professional or an emergency service in your country.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Eligibility</h2>
            <p className="mb-3">
              You must be at least 18 years of age to use our services. By using our services, you represent
              and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are at least 18 years old;</li>
              <li>You have the legal capacity to enter into a binding contract;</li>
              <li>Your use of the services does not violate any applicable law or regulation in your jurisdiction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. User Accounts</h2>
            <p className="mb-3">
              Certain features of our service require you to register for an account. When you register, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate, current, and complete information;</li>
              <li>Keep your password confidential and not share it with any third party;</li>
              <li>Notify us immediately of any unauthorised use of your account;</li>
              <li>Be responsible for all activity that occurs under your account.</li>
            </ul>
            <p className="mt-3">
              You may hold only one account. We reserve the right to suspend or terminate accounts that
              we reasonably believe are duplicates or created for abusive purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Reading Credits</h2>
            <p className="mb-3">
              Access to AI guide sessions is provided through a prepaid credit system denominated in reading
              minutes ("Credits"). Credits are consumed at a per-minute rate determined by the guide you
              select, as displayed at the time of purchase.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Credits must be purchased in advance through our payment gateway (Stripe).</li>
              <li>New registered users receive 3 complimentary welcome Credits upon account creation.
                  Welcome Credits are provided as a goodwill gesture and carry no cash value.</li>
              <li>Credits are personal, non-transferable, and may not be gifted, sold, or assigned to another account.</li>
              <li>The Company reserves the right to adjust Credit pricing at any time. Price changes apply
                  to future purchases only and do not affect Credits already purchased.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Credit Expiry</h2>
            <p className="mb-3">
              <strong>Purchased Credits expire six (6) months from the date of purchase.</strong> Each
              Credit purchase carries its own independent expiry date based on when that specific purchase
              was made.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Expired Credits are automatically forfeited and cannot be reactivated, extended, or refunded.</li>
              <li>Credits do not roll over upon expiry.</li>
              <li>We will endeavour (on a best-efforts basis) to send you a reminder notification approximately
                  14 days before your Credits expire. Failure to receive such a reminder does not affect the
                  expiry of your Credits.</li>
              <li>Complimentary welcome Credits expire 6 months after account creation.</li>
            </ul>
            <p className="mt-3">
              It is your responsibility to use Credits before their expiry date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Payments</h2>
            <p className="mb-3">
              All purchases are processed securely through Stripe, Inc. By making a purchase, you agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are authorised to use the payment method provided;</li>
              <li>All information you provide is accurate and complete;</li>
              <li>You will pay all charges at the prices in effect at the time of purchase.</li>
            </ul>
            <p className="mt-3">
              Prices are listed in United States Dollars (USD) unless otherwise stated. Applicable taxes or
              bank conversion fees based on your location are your sole responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Refunds</h2>
            <p>
              Our refund policy is set out in full in our{' '}
              <Link href="/refund">
                <span className="text-purple-300 hover:text-white underline cursor-pointer">Refund Policy</span>
              </Link>
              , which forms part of these Terms of Service. In summary, we offer goodwill refunds on
              unused purchased Credits within 30 days of purchase, subject to the conditions described
              in that policy. Credits consumed in sessions are non-refundable. Complimentary Credits
              carry no cash value and are not eligible for refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use our services for any unlawful purpose or in violation of any applicable law;</li>
              <li>Attempt to circumvent the Credit system or gain unauthorised access to sessions;</li>
              <li>Harass, abuse, or transmit threatening content through our platform;</li>
              <li>Attempt to gain unauthorised access to our systems, data, or other user accounts;</li>
              <li>Use automated bots or scripts to interact with our services without our written permission;</li>
              <li>Reproduce, scrape, or redistribute our content, prompts, or AI outputs without authorisation;</li>
              <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or permanently terminate access for any user who violates
              these conduct requirements, without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Physical Products</h2>
            <p>
              Physical products (such as protection stones and ritual items) will be shipped to the
              address you provide. Shipping times vary by location. The Company is not responsible for
              delays caused by shipping carriers, customs authorities, or events beyond our reasonable
              control. Risk in physical goods passes to you upon dispatch.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Intellectual Property</h2>
            <p>
              All content on our platform — including text, graphics, logos, AI persona designs,
              prompt architecture, and software — is the property of Cosmo Numerology Pte Ltd or its
              licensors and is protected under applicable intellectual property laws. You may not reproduce,
              distribute, modify, or create derivative works from any of our content without our prior
              written consent. AI-generated reading content produced during your session is provided for
              your personal use only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Service Availability</h2>
            <p>
              We aim to provide continuous access to our services but do not guarantee uninterrupted
              availability. We may suspend or discontinue the service (in whole or in part) for maintenance,
              updates, or other operational reasons. We will use reasonable endeavours to notify users in
              advance of planned downtime where practicable. The Company shall not be liable for any loss
              arising from service unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Disclaimer of Warranties</h2>
            <p>
              Our services are provided on an "as is" and "as available" basis without warranties of any
              kind, whether express or implied, including but not limited to warranties of merchantability,
              fitness for a particular purpose, or non-infringement. We do not warrant that our services
              will meet your specific expectations, be error-free, or produce any particular outcome.
              AI-generated content is inherently probabilistic and may be inaccurate, incomplete, or
              unsuitable for your circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">14. Limitation of Liability</h2>
            <p className="mb-3">
              To the fullest extent permitted by the laws of Singapore, Cosmo Numerology Pte Ltd, its
              directors, employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, exemplary, or punitive damages arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your use of or inability to use our services;</li>
              <li>Any decisions made in reliance on AI-generated readings;</li>
              <li>Unauthorised access to your account or data;</li>
              <li>Any service interruptions or technical failures.</li>
            </ul>
            <p className="mt-3">
              In any event, the Company's total aggregate liability to you shall not exceed the total
              amount you paid to us in the 3 months immediately preceding the event giving rise to the claim.
            </p>
            <p className="mt-3">
              Nothing in these Terms limits liability for death or personal injury caused by negligence,
              fraud, or any other liability that cannot be excluded under Singapore law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">15. Governing Law and Dispute Resolution</h2>
            <p className="mb-3">
              These Terms of Service are governed by and construed in accordance with the laws of the
              Republic of Singapore, without regard to its conflict of law provisions.
            </p>
            <p>
              Any dispute arising out of or in connection with these Terms, including any question
              regarding its existence, validity, or termination, shall be subject to the exclusive
              jurisdiction of the courts of Singapore. You agree to submit to the personal jurisdiction
              of the Singapore courts for this purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">16. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Where changes are
              material, we will notify registered users by email or via a prominent notice on the
              platform at least 14 days before the changes take effect. Your continued use of our
              services after the effective date of any changes constitutes your acceptance of the
              revised terms. If you do not agree to the revised terms, you must stop using our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">17. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid under applicable
              law, that provision will be limited or severed to the minimum extent necessary, and the
              remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">18. Contact Us</h2>
            <p className="mb-3">For questions about these Terms of Service, please contact us:</p>
            <div className="bg-purple-900/50 rounded-lg p-4 border border-purple-700">
              <p className="font-semibold text-white">Cosmo Numerology Pte Ltd</p>
              <p>45B Temple St S058590</p>
              <p>Singapore</p>
              <p className="mt-2">
                Email:{' '}
                <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
                  hi@theseerwithin.com
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
