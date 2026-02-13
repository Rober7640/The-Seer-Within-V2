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
        <Link href="/">
          <button className="flex items-center gap-2 text-purple-300 hover:text-white mb-8 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </Link>

        <h1 className="font-serif text-3xl font-bold mb-2" data-testid="heading-refund">Refund Policy</h1>
        <p className="text-purple-300 mb-8">Last updated: January 2026</p>

        <div className="space-y-6 text-purple-100 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Our Commitment</h2>
            <p>
              At The Seer Within, operated by Cosmo Numerology Pte Ltd, we are committed to your satisfaction. 
              We understand that spiritual services are personal, and we want you to feel confident in your purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Digital Reading Services</h2>
            <p className="mb-3">
              Due to the immediate nature of digital reading services:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Once a reading has been delivered or accessed, it is considered consumed and is non-refundable.</li>
              <li>If you experience technical issues preventing access to your reading, please contact us within 48 hours for assistance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Physical Products (Protection Stones)</h2>
            <p className="mb-3">For physical products such as our Protection Ritual stones:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Damaged or Defective Items:</strong> If your item arrives damaged or defective, contact us within 7 days of delivery with photos. We will replace the item at no additional cost.</li>
              <li><strong>Non-Delivery:</strong> If your order does not arrive within 30 days of the estimated delivery date, contact us and we will either reship or provide a full refund.</li>
              <li><strong>Change of Mind:</strong> Due to the personalized and charged nature of our ritual items, we do not offer refunds for change of mind. Each stone is prepared specifically for you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. How to Request a Refund</h2>
            <p className="mb-3">To request a refund or report an issue:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Email us at <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">support@cosmonumerology.com</a></li>
              <li>Include your order number and the email used for purchase</li>
              <li>Describe the issue you experienced</li>
              <li>For damaged items, include clear photos of the damage</li>
            </ol>
            <p className="mt-3">
              We aim to respond to all refund requests within 2 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Refund Processing</h2>
            <p>
              Approved refunds will be processed to your original payment method within 5-10 business days. 
              Please note that your bank or credit card company may take additional time to post the refund to your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Cancellations</h2>
            <p>
              If you wish to cancel an order for a physical product, please contact us immediately. 
              If the order has not yet shipped, we can cancel it and provide a full refund. 
              Once an order has shipped, our standard refund policy applies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Exceptions</h2>
            <p className="mb-3">We reserve the right to refuse refunds in cases of:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Abuse of our refund policy</li>
              <li>Fraudulent claims</li>
              <li>Requests made outside the specified timeframes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Consumer Rights</h2>
            <p>
              This refund policy does not affect your statutory rights under the Consumer Protection (Fair Trading) Act of Singapore. 
              If you believe you have been treated unfairly, you may also contact the Consumers Association of Singapore (CASE).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
            <p className="mb-3">For any questions about our refund policy:</p>
            <div className="bg-purple-900/50 rounded-lg p-4 border border-purple-700">
              <p className="font-semibold text-white">Cosmo Numerology Pte Ltd</p>
              <p>45B Temple St S058590</p>
              <p>Singapore</p>
              <p className="mt-2">
                Email: <a href="mailto:support@cosmonumerology.com" className="text-purple-300 hover:text-white underline">support@cosmonumerology.com</a>
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
