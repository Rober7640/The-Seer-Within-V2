import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | The Seer Within';
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

        <h1 className="font-serif text-3xl font-bold mb-2" data-testid="heading-privacy">Privacy Policy</h1>
        <p className="text-purple-300 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-purple-100 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              Cosmo Numerology Pte Ltd ("we", "our", "us") is the data controller
              for personal data collected through The Seer Within platform. We are committed to protecting
              your personal data in accordance with the Personal Data Protection Act 2012 of Singapore
              (PDPA), as amended by the Personal Data Protection (Amendment) Act 2020.
            </p>
            <p className="mt-3">
              This Privacy Policy explains what personal data we collect, why we collect it, how we use
              and protect it, and your rights under Singapore law. Please read it carefully before using
              our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Data Controller</h2>
            <div className="bg-purple-900/50 rounded-lg p-4 border border-purple-700">
              <p className="font-semibold text-white">Cosmo Numerology Pte Ltd</p>
              <p>45B Temple St S058590</p>
              <p>Singapore</p>
              <p className="mt-2">
                Data Protection Enquiries:{' '}
                <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">
                  support@cosmonumerology.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Personal Data We Collect</h2>
            <p className="mb-3">We collect personal data in the following categories:</p>

            <h3 className="text-base font-semibold text-purple-200 mb-2">Account Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Name and email address (provided at registration)</li>
              <li>Password (stored as a one-way cryptographic hash — we never store your raw password)</li>
              <li>Account creation date and last login information</li>
            </ul>

            <h3 className="text-base font-semibold text-purple-200 mb-2">Session and Reading Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Messages you send during AI guide sessions, including personal information you choose to share</li>
              <li>Session timestamps, duration, and credit usage</li>
              <li>Memory summaries our system generates to personalise future sessions (you may request deletion of these)</li>
            </ul>

            <h3 className="text-base font-semibold text-purple-200 mb-2">Transaction Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Credit purchase history and amounts</li>
              <li>Payment status and Stripe transaction identifiers (we do not store full card numbers)</li>
              <li>Shipping address (for physical product purchases only)</li>
            </ul>

            <h3 className="text-base font-semibold text-purple-200 mb-2">Technical Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>IP address and approximate geographic location</li>
              <li>Browser type, operating system, and device identifiers</li>
              <li>Pages visited, session duration, and referral source</li>
              <li>Cookies and similar tracking technologies (see Section 11)</li>
            </ul>

            <h3 className="text-base font-semibold text-purple-200 mb-2">Marketing Data (where you have opted in)</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Email marketing preferences and subscription status</li>
              <li>Email open and click tracking data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. How We Use Your Personal Data</h2>
            <p className="mb-3">
              We collect and use your personal data only for the purposes for which it was collected
              (the PDPA's Purpose Limitation Obligation), including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Providing our services</strong> — registering your account, enabling AI guide sessions, and processing payments.</li>
              <li><strong>Personalising your experience</strong> — using session memory to provide contextually relevant readings in future sessions.</li>
              <li><strong>Processing transactions</strong> — managing Credits, purchases, and refunds.</li>
              <li><strong>Communications</strong> — sending transactional emails (receipts, credit expiry reminders, account notices) and, where you have consented, promotional emails.</li>
              <li><strong>Safety and security</strong> — detecting and preventing fraud, abuse, and unauthorised account access.</li>
              <li><strong>Service improvement</strong> — analysing aggregated usage patterns to improve our platform.</li>
              <li><strong>Legal compliance</strong> — complying with applicable Singapore laws and responding to lawful requests from authorities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Disclosure to Third Parties</h2>
            <p className="mb-3">
              We do not sell your personal data. We share it only with the following categories of
              service providers who process it strictly on our behalf and for the purposes described
              in this Policy:
            </p>
            <div className="space-y-3">
              <div className="bg-purple-900/40 rounded-lg p-3 border border-purple-800">
                <p className="font-semibold text-white">Anthropic PBC (San Francisco, USA)</p>
                <p className="text-sm mt-1">
                  Processes conversation messages to generate AI guide responses. Message content is
                  transmitted to Anthropic's API for this purpose. Anthropic's data use is governed
                  by its API usage policy.
                </p>
              </div>
              <div className="bg-purple-900/40 rounded-lg p-3 border border-purple-800">
                <p className="font-semibold text-white">Stripe, Inc. (USA / EU)</p>
                <p className="text-sm mt-1">
                  Processes payment card data for Credit purchases. We do not store your full card
                  details — these are handled exclusively by Stripe in compliance with PCI-DSS.
                </p>
              </div>
              <div className="bg-purple-900/40 rounded-lg p-3 border border-purple-800">
                <p className="font-semibold text-white">Supabase, Inc.</p>
                <p className="text-sm mt-1">
                  Provides our hosted PostgreSQL database. Your account, session, and transaction
                  data is stored on Supabase-managed infrastructure.
                </p>
              </div>
              <div className="bg-purple-900/40 rounded-lg p-3 border border-purple-800">
                <p className="font-semibold text-white">AWeber Communications (Chalfont, Pennsylvania, USA)</p>
                <p className="text-sm mt-1">
                  Manages our email marketing list. Your email address is shared with AWeber only
                  if you have opted in to marketing communications.
                </p>
              </div>
            </div>
            <p className="mt-4">
              We may also disclose your data where required by law, court order, or lawful direction
              from a competent Singapore authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Cross-Border Data Transfers</h2>
            <p className="mb-3">
              Some of our service providers are located outside Singapore (notably in the United States).
              Under Section 26 of the PDPA, we take steps to ensure that overseas recipients of your
              personal data provide a standard of protection at least comparable to that under the PDPA.
              These steps include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Entering into data processing agreements with overseas service providers;</li>
              <li>Selecting providers who maintain internationally recognised security certifications (such as SOC 2 and ISO 27001);</li>
              <li>Limiting data transfers to only what is necessary for the stated purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Security</h2>
            <p className="mb-3">
              We implement appropriate technical and organisational measures to protect your personal
              data against unauthorised access, loss, destruction, or alteration, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>TLS encryption for data in transit;</li>
              <li>Encrypted storage for sensitive data at rest;</li>
              <li>One-way password hashing (passwords are never stored in recoverable form);</li>
              <li>Access controls limiting staff access to personal data on a need-to-know basis;</li>
              <li>Regular security reviews of our systems.</li>
            </ul>
            <p className="mt-3">
              No method of internet transmission is completely secure. In the event of a data breach
              that is likely to result in significant harm to affected individuals, we will notify
              the Personal Data Protection Commission (PDPC) and affected users as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Data Retention</h2>
            <p className="mb-3">
              We retain your personal data only for as long as necessary to fulfil the purposes for
              which it was collected or as required by applicable law:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Active account data:</strong> Retained for the duration of your account.</li>
              <li><strong>Session and reading history:</strong> Retained for 24 months from the date of each session to support session memory features and dispute resolution.</li>
              <li><strong>Transaction records:</strong> Retained for 7 years from the date of transaction for accounting and tax compliance purposes.</li>
              <li><strong>Marketing preferences:</strong> Retained until you unsubscribe or withdraw consent.</li>
              <li><strong>Closed accounts:</strong> Account data is deleted or anonymised within 90 days of account closure, subject to the retention periods above for transaction records.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Your Rights Under the PDPA</h2>
            <p className="mb-3">
              Under the Personal Data Protection Act 2012 (as amended), you have the following rights
              in respect of your personal data:
            </p>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-white">Right of Access</p>
                <p>You may request a copy of the personal data we hold about you and information about how it has been used or disclosed in the past 12 months.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Right of Correction</p>
                <p>You may request that we correct any inaccurate or incomplete personal data we hold about you.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Right to Withdraw Consent</p>
                <p>You may withdraw consent for our collection, use, or disclosure of your personal data at any time. Withdrawing consent may mean we can no longer provide you with certain services.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Right to Data Portability</p>
                <p>You may request that we transmit your personal data (in a commonly used machine-readable format) to another organisation, where technically feasible, in accordance with the PDPA's data portability obligation.</p>
              </div>
              <div>
                <p className="font-semibold text-white">Right to Erasure</p>
                <p>You may request deletion of your personal data where we no longer have a legitimate basis to retain it, subject to our legal obligations (such as the 7-year transaction record retention).</p>
              </div>
            </div>
            <p className="mt-4">
              To exercise any of these rights, please email us at{' '}
              <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">
                support@cosmonumerology.com
              </a>
              . We will respond to verifiable requests within 30 days. We may need to verify your identity
              before processing your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Children's Privacy</h2>
            <p>
              Our services are intended for users who are 18 years of age or older. We do not knowingly
              collect personal data from individuals under 18. If we become aware that we have collected
              personal data from a person under 18 without appropriate consent, we will delete it promptly.
              If you believe we may have inadvertently collected data from a minor, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Cookies and Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies and similar technologies on our website. These include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Essential cookies:</strong> Required for core functionality such as session authentication. These cannot be disabled.</li>
              <li><strong>Analytics cookies:</strong> Used to understand how users interact with our platform in aggregate.</li>
              <li><strong>Marketing pixels:</strong> We use the Facebook Pixel and Facebook Conversions API to measure the effectiveness of our advertising. These track specific events (page views, purchases) and may transmit hashed email addresses to Facebook for matching purposes.</li>
            </ul>
            <p className="mt-3">
              You can control most non-essential cookies through your browser settings. Please note that
              disabling cookies may affect the functionality of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Marketing Communications</h2>
            <p>
              We will only send you marketing communications if you have opted in (for example, by
              providing your email during checkout or by signing up to our mailing list). You may
              unsubscribe at any time by clicking the "unsubscribe" link in any marketing email or
              by emailing us at{' '}
              <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">
                support@cosmonumerology.com
              </a>
              . Transactional emails (such as receipts and account notifications) are not subject
              to marketing opt-out.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices
              or applicable law. We will notify you of material changes by email (if you have an account)
              or by posting a prominent notice on our platform. The updated Policy will display a
              revised "Last updated" date. We encourage you to review this Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">14. Complaints</h2>
            <p className="mb-3">
              If you have concerns about how we handle your personal data and are not satisfied with
              our response, you may lodge a complaint with the Personal Data Protection Commission (PDPC):
            </p>
            <div className="bg-purple-900/50 rounded-lg p-4 border border-purple-700">
              <p className="font-semibold text-white">Personal Data Protection Commission</p>
              <p>10 Pasir Panjang Road, #03-01 Mapletree Business City, Singapore 117438</p>
              <p className="mt-1">
                Website:{' '}
                <span className="text-purple-300">www.pdpc.gov.sg</span>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">15. Contact Us</h2>
            <p className="mb-3">
              For any questions about this Privacy Policy or to exercise your data rights, please contact us:
            </p>
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
