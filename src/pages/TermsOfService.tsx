import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 13, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Auren Reimbursements ("Auren," "we," "us," or "our"). By accessing or using our 
              services, website, or applications, you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, you may not access or use our services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              These Terms constitute a legally binding agreement between you and Auren. Please read them 
              carefully before using our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Auren provides invoice management and Amazon FBA reimbursement recovery services, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Automated invoice retrieval from authorized email accounts</li>
              <li>AI-powered invoice analysis and data extraction</li>
              <li>Shipment discrepancy identification and tracking</li>
              <li>Reimbursement claim management and submission</li>
              <li>Document storage and organization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Account Registration</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">3.1 Eligibility</h3>
            <p className="text-muted-foreground leading-relaxed">
              To use our services, you must be at least 18 years old and have the legal capacity to 
              enter into a binding agreement. If you are using our services on behalf of a business, 
              you represent that you have the authority to bind that business to these Terms.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">3.2 Account Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account. You agree to notify us immediately of 
              any unauthorized use of your account.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">3.3 Accurate Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              You agree to provide accurate, current, and complete information during registration and 
              to update such information to keep it accurate, current, and complete.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Fees and Payment</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">4.1 Service Fees</h3>
            <p className="text-muted-foreground leading-relaxed">
              Auren charges a percentage-based fee on successfully recovered reimbursements. Our 
              standard fee is 20% of the recovered amount, with a reduced rate of 15% for Auren 
              members. You will only be charged when we successfully recover funds on your behalf.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">4.2 Billing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Invoices for our services will be provided on a monthly basis. Payment is due upon 
              receipt of invoice unless otherwise agreed in writing. We accept payment via bank 
              transfer and credit card.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">4.3 Refunds</h3>
            <p className="text-muted-foreground leading-relaxed">
              Since our fees are based on successful recoveries, refunds are generally not applicable. 
              If Amazon reverses a reimbursement that we previously recovered for you, we will credit 
              the corresponding fee to your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Integrations</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">5.1 Amazon Seller Central</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our services integrate with Amazon Seller Central. By connecting your Amazon account, 
              you authorize us to access your shipment and reimbursement data as necessary to provide 
              our services. You remain responsible for compliance with Amazon's terms of service.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">5.2 Email Integration (Gmail and Outlook)</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you connect your Gmail or Microsoft Outlook account, you authorize us to access emails 
              from supplier addresses you specify for the purpose of retrieving invoice attachments. 
              Our email access is strictly limited as described in our{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. 
              You may connect up to 3 email accounts (combined Gmail and Outlook) per user.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By using our services, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate supplier email addresses and business information</li>
              <li>Ensure you have the right to share invoices and documents with us</li>
              <li>Not use our services for any unlawful purpose</li>
              <li>Not attempt to circumvent security measures or access unauthorized data</li>
              <li>Not interfere with or disrupt the integrity of our services</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">7.1 Our Property</h3>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of our services, including but not limited to 
              software, algorithms, designs, text, graphics, and logos, are owned by Auren and are 
              protected by intellectual property laws.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">7.2 Your Content</h3>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all invoices, documents, and data you upload to our platform. 
              By using our services, you grant us a limited license to use, process, and store your 
              content solely for the purpose of providing our services to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Disclaimers</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">8.1 Service Availability</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our services are provided "as is" and "as available" without warranties of any kind, 
              either express or implied. We do not guarantee that our services will be uninterrupted, 
              error-free, or secure.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">8.2 Recovery Results</h3>
            <p className="text-muted-foreground leading-relaxed">
              While we strive to maximize your reimbursement recovery, we cannot guarantee specific 
              results. Recovery amounts depend on various factors including Amazon's policies, the 
              nature of discrepancies, and available documentation.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">8.3 AI Accuracy</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our AI-powered invoice analysis is designed to be accurate but may occasionally make 
              errors. We recommend reviewing extracted data for accuracy before relying on it for 
              business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Auren shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including but not limited to 
              loss of profits, data, business opportunities, or goodwill, arising out of or related 
              to your use of our services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our total liability for any claims arising from these Terms or your use of our services 
              shall not exceed the fees you have paid to us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless Auren, its officers, directors, employees, and 
              agents from any claims, damages, losses, liabilities, and expenses (including reasonable 
              attorneys' fees) arising out of or related to your use of our services, your violation 
              of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Termination</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">11.1 By You</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may terminate your account at any time by contacting us. Upon termination, you 
              remain responsible for any outstanding fees owed for services already rendered.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">11.2 By Us</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account if you violate these Terms, engage in 
              fraudulent activity, or for any other reason at our sole discretion with reasonable 
              notice.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">11.3 Effect of Termination</h3>
            <p className="text-muted-foreground leading-relaxed">
              Upon termination, your right to use our services will cease immediately. We will 
              retain your data for a reasonable period to allow you to retrieve it, after which 
              it may be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law and Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the 
              State of New York, without regard to its conflict of law provisions. Any disputes 
              arising from these Terms or your use of our services shall be resolved in the state 
              or federal courts located in New York.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of 
              material changes by posting the updated Terms on our website and updating the 
              "Last updated" date. Your continued use of our services after such changes 
              constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Miscellaneous</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">14.1 Entire Agreement</h3>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement 
              between you and Auren regarding your use of our services.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">14.2 Severability</h3>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining 
              provisions will continue in full force and effect.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">14.3 Waiver</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our failure to enforce any right or provision of these Terms shall not constitute 
              a waiver of such right or provision.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground font-medium">Auren Reimbursements</p>
              <p className="text-muted-foreground">Email: <a href="mailto:legal@aurenapp.com" className="text-primary hover:underline">legal@aurenapp.com</a></p>
              <p className="text-muted-foreground">Support: <a href="mailto:support@aurenapp.com" className="text-primary hover:underline">support@aurenapp.com</a></p>
              <p className="text-muted-foreground">Location: Yonkers, NY</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;