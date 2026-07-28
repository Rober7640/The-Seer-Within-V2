import { Link } from 'wouter';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="border border-purple-700 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-purple-900/40 hover:bg-purple-900/70 transition-colors"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              aria-expanded={isOpen}
            >
              <span className="font-medium text-white pr-4">{item.question}</span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-purple-300 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-purple-300 flex-shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="px-4 py-3 bg-purple-950/40 text-purple-100 leading-relaxed text-sm space-y-2">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const faqSections: FAQSection[] = [
  {
    title: 'Reading Minutes',
    items: [
      {
        question: 'What are reading minutes?',
        answer: (
          <p>
            Reading minutes are prepaid time you use to access AI guide sessions on The Seer Within.
            Each spiritual guide charges a per-minute rate (shown on the guide's profile before you start a session).
            Minutes are deducted in real time as you chat.
          </p>
        ),
      },
      {
        question: 'How do I get minutes?',
        answer: (
          <>
            <p>You can get minutes in two ways:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li><strong>Free welcome minutes:</strong> Every new account receives 3 free minutes automatically when you register.</li>
              <li><strong>Purchase minutes:</strong> You can buy additional minute packages at any time from the Minutes page after logging in.</li>
            </ul>
          </>
        ),
      },
      {
        question: 'When do my minutes expire?',
        answer: (
          <p>
            Purchased minutes expire <strong>6 months from the date of each purchase</strong>. Each
            purchase has its own independent expiry date. Free welcome minutes expire 6 months after
            your account is created. We will do our best to send you a reminder email about 14 days
            before expiry, but it is your responsibility to use minutes before they lapse.
          </p>
        ),
      },
      {
        question: 'My minutes expired — can I get a refund?',
        answer: (
          <p>
            Unfortunately, expired minutes are forfeited and are not eligible for a refund or
            reactivation. Our goodwill refund window is 30 days from the date of purchase, which
            is well before the 6-month expiry. If your minutes are approaching expiry, use them
            or request a refund on unused minutes within the 30-day window. See our{' '}
            <Link href="/refund">
              <span className="text-purple-300 hover:text-white underline cursor-pointer">Refund Policy</span>
            </Link>{' '}
            for full details.
          </p>
        ),
      },
      {
        question: 'Can I share or transfer my minutes to another account?',
        answer: (
          <p>
            No. Minutes are personal and non-transferable. They are linked to your account and
            cannot be gifted, sold, or moved to another user's account.
          </p>
        ),
      },
      {
        question: 'Do minutes roll over when I buy more?',
        answer: (
          <p>
            Yes — your existing unused minutes remain in your balance when you purchase additional
            minutes. Each purchase creates its own 6-month expiry window, so minutes from older
            purchases will expire first.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Billing & Refunds',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: (
          <p>
            We accept all major credit and debit cards (Visa, Mastercard, American Express) through
            Stripe, our payment processor. Payment details are entered directly on Stripe's secure
            page — we never store your card number.
          </p>
        ),
      },
      {
        question: 'Will I receive a receipt for my purchase?',
        answer: (
          <p>
            Yes. Stripe sends an automatic payment receipt to the email address on your account
            immediately after a successful purchase. If you did not receive one, check your spam
            folder or contact us at{' '}
            <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
              hi@theseerwithin.com
            </a>
            .
          </p>
        ),
      },
      {
        question: 'I was charged but my minutes haven\'t appeared. What do I do?',
        answer: (
          <>
            <p>This is rare but can happen if there is a brief delay between payment confirmation and our
            system updating your balance. Please:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
              <li>Wait 5 minutes and refresh the page.</li>
              <li>Log out and log back in to refresh your session.</li>
              <li>If minutes still haven't appeared after 30 minutes, email us at{' '}
                <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
                  hi@theseerwithin.com
                </a>{' '}
                with your purchase receipt and we will investigate promptly.</li>
            </ol>
          </>
        ),
      },
      {
        question: 'Can I get a refund on unused minutes?',
        answer: (
          <>
            <p>
              Yes — we offer a goodwill refund on unused purchased minutes, subject to these conditions:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>The request must be made within <strong>30 days</strong> of the purchase date.</li>
              <li>Only minutes that have <strong>not been used</strong> in any session are eligible.</li>
              <li>If some minutes were used, only the unused portion may be refunded on a pro-rata basis.</li>
            </ul>
            <p className="mt-2">
              Free welcome minutes have no cash value and are not refundable. Full details are in our{' '}
              <Link href="/refund">
                <span className="text-purple-300 hover:text-white underline cursor-pointer">Refund Policy</span>
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        question: 'How long does a refund take?',
        answer: (
          <p>
            Once we approve your refund, it is processed immediately on our end. Your bank or card
            issuer typically takes 5–10 business days to post the credit to your account. If you
            haven't seen it after 15 business days, please check with your bank first, then
            contact us.
          </p>
        ),
      },
      {
        question: 'I think I was charged incorrectly or multiple times. What should I do?',
        answer: (
          <p>
            Email us straight away at{' '}
            <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
              hi@theseerwithin.com
            </a>{' '}
            with your account email and the transaction details from your bank statement. We will
            investigate with Stripe and resolve any billing errors promptly.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Your Account & Data',
    items: [
      {
        question: 'How do I delete my account?',
        answer: (
          <p>
            To request account deletion, email us at{' '}
            <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
              hi@theseerwithin.com
            </a>{' '}
            from the email address associated with your account. We will process your request
            and delete or anonymise your account data within 90 days, subject to retaining
            transaction records for 7 years as required by Singapore accounting laws. Any
            remaining unused minutes will be forfeited upon deletion and are not eligible for
            a cash refund unless a valid refund request is submitted before deletion.
          </p>
        ),
      },
      {
        question: 'What personal data does The Seer Within hold about me?',
        answer: (
          <>
            <p>We hold the following data about you:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Account data: name, email address, and a hashed password.</li>
              <li>Session data: your chat messages and session history.</li>
              <li>Memory summaries: brief notes our system generates to personalise future sessions.</li>
              <li>Transaction records: minute purchase history and amounts.</li>
              <li>Technical data: IP address, browser type, and device information.</li>
            </ul>
            <p className="mt-2">See our <Link href="/privacy"><span className="text-purple-300 hover:text-white underline cursor-pointer">Privacy Policy</span></Link> for the full picture.</p>
          </>
        ),
      },
      {
        question: 'How do I request a copy of my personal data?',
        answer: (
          <p>
            Under the Personal Data Protection Act 2012 (Singapore), you have the right to access
            the personal data we hold about you. Email your request to{' '}
            <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
              hi@theseerwithin.com
            </a>
            . We will verify your identity and respond within 30 days.
          </p>
        ),
      },
      {
        question: 'How do I correct inaccurate data you hold about me?',
        answer: (
          <p>
            You can update your name and email address from your account settings once logged in.
            For any other corrections, email us at{' '}
            <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
              hi@theseerwithin.com
            </a>{' '}
            and we will make the correction as soon as practicable.
          </p>
        ),
      },
      {
        question: 'How do I unsubscribe from marketing emails?',
        answer: (
          <p>
            Click the "Unsubscribe" link at the bottom of any marketing email from us. You can also
            email{' '}
            <a href="mailto:hi@theseerwithin.com" className="text-purple-300 hover:text-white underline">
              hi@theseerwithin.com
            </a>{' '}
            to be removed from our list. Note: unsubscribing from marketing emails does not stop
            transactional emails such as purchase receipts and minutes expiry notices.
          </p>
        ),
      },
      {
        question: 'Is my data shared with third parties?',
        answer: (
          <>
            <p>
              We share data only with service providers who help us operate the platform, including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li><strong>Anthropic</strong> (processes your messages to generate AI responses)</li>
              <li><strong>Stripe</strong> (payment processing)</li>
              <li><strong>Supabase</strong> (database hosting)</li>
              <li><strong>AWeber</strong> (email marketing, only if you've opted in)</li>
            </ul>
            <p className="mt-2">
              We do not sell your personal data. See our{' '}
              <Link href="/privacy">
                <span className="text-purple-300 hover:text-white underline cursor-pointer">Privacy Policy</span>
              </Link>{' '}
              for full details including cross-border transfer safeguards.
            </p>
          </>
        ),
      },
      {
        question: 'What happens to my session memory if I close my account?',
        answer: (
          <p>
            Session memory summaries (notes our system uses to personalise your readings) are
            deleted when your account is closed, within the same 90-day window as your other
            account data. If you want to delete only your session memory without closing your
            account, contact us and we can arrange that separately.
          </p>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  useEffect(() => {
    document.title = 'FAQ | The Seer Within';
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

        <h1 className="font-serif text-3xl font-bold mb-2" data-testid="heading-faq">
          Frequently Asked Questions
        </h1>
        <p className="text-purple-300 mb-8">
          Can't find what you're looking for? Email us at{' '}
          <a href="mailto:hi@theseerwithin.com" className="hover:text-white underline">
            hi@theseerwithin.com
          </a>
        </p>

        <div className="space-y-10">
          {faqSections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-white mb-4">{section.title}</h2>
              <FAQAccordion items={section.items} />
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-purple-700 space-y-2 text-center text-purple-400 text-sm">
          <p>
            <Link href="/terms"><span className="hover:text-white underline cursor-pointer">Terms of Service</span></Link>
            {' · '}
            <Link href="/privacy"><span className="hover:text-white underline cursor-pointer">Privacy Policy</span></Link>
            {' · '}
            <Link href="/refund"><span className="hover:text-white underline cursor-pointer">Refund Policy</span></Link>
          </p>
          <p>&copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
