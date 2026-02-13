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
        <Link href="/">
          <button className="flex items-center gap-2 text-purple-300 hover:text-white mb-8 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </Link>

        <h1 className="font-serif text-3xl font-bold mb-2" data-testid="heading-terms">Terms of Service</h1>
        <p className="text-purple-300 mb-8">Last updated: January 2026</p>

        <div className="space-y-6 text-purple-100 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using The Seer Within website and services operated by Cosmo Numerology Pte Ltd ("Company", "we", "our"), 
              you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Nature of Services</h2>
            <p className="mb-3">
              The Seer Within provides spiritual guidance, psychic readings, and related products for entertainment and personal reflection purposes. 
              Our services are intended to provide insight and perspective but should not be considered:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Professional medical, legal, or financial advice</li>
              <li>A substitute for professional counseling or therapy</li>
              <li>Guaranteed predictions of future events</li>
            </ul>
            <p className="mt-3">
              You acknowledge that readings are subjective interpretations and that you are responsible for your own decisions and actions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Eligibility</h2>
            <p>
              You must be at least 18 years of age to use our services. By using our services, you represent and warrant that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use our services for any unlawful purpose</li>
              <li>Harass, abuse, or harm our staff or other users</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated systems to access our services without permission</li>
              <li>Reproduce or redistribute our content without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Purchases and Payments</h2>
            <p className="mb-3">
              All purchases are processed securely through Stripe. By making a purchase, you agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are authorized to use the payment method provided</li>
              <li>All information you provide is accurate and complete</li>
              <li>You will pay all charges at the prices in effect when incurred</li>
            </ul>
            <p className="mt-3">
              Prices are listed in USD and may be subject to applicable taxes based on your location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Digital Products</h2>
            <p>
              Digital reading services are delivered immediately upon purchase. Due to the nature of digital content, 
              all sales of digital readings are final once the service has been accessed or delivered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Physical Products</h2>
            <p>
              Physical products (such as protection stones) will be shipped to the address provided. 
              Shipping times may vary based on location. We are not responsible for delays caused by shipping carriers or customs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Intellectual Property</h2>
            <p>
              All content on our website, including text, graphics, logos, and software, is the property of Cosmo Numerology Pte Ltd 
              and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Disclaimer of Warranties</h2>
            <p>
              Our services are provided "as is" without warranties of any kind, either express or implied. 
              We do not warrant that our services will meet your specific expectations or requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by Singapore law, Cosmo Numerology Pte Ltd shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of Singapore. 
              Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Singapore.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. 
              Your continued use of our services after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Contact Us</h2>
            <p className="mb-3">For questions about these Terms of Service, please contact us:</p>
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
