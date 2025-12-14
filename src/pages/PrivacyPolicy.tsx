import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 13, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Auren Reimbursements ("Auren," "we," "us," or "our") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
              you use our invoice management and reimbursement recovery services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By using our services, you agree to the collection and use of information in accordance with 
              this policy. If you do not agree with the terms of this Privacy Policy, please do not access 
              or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium text-foreground mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (name, email address, company name)</li>
              <li>Business information related to Amazon FBA operations</li>
              <li>Supplier email addresses you explicitly provide to us</li>
              <li>Invoices and documents you upload directly to our platform</li>
              <li>Communication preferences and support inquiries</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device and browser information</li>
              <li>IP address and general location data</li>
              <li>Usage data and analytics</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Email Access and Invoice Retrieval</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">This section specifically addresses how we handle your email data.</strong>
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3">3.1 Limited Email Access</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you connect your Gmail or Outlook account to Auren, we request read-only access to your emails. 
              However, we implement strict limitations on how this access is used:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Supplier-Only Scanning:</strong> We ONLY scan emails from 
                supplier email addresses that you explicitly provide to us. We do not access or read any 
                emails from senders you have not authorized.
              </li>
              <li>
                <strong className="text-foreground">Invoice Attachments Only:</strong> We only download and 
                process PDF attachments that our AI identifies as invoices. We do not read, store, or 
                process the body text of your emails.
              </li>
              <li>
                <strong className="text-foreground">No Personal Email Access:</strong> We never access personal 
                emails, newsletters, promotional content, or any correspondence from non-supplier addresses.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">3.2 AI-Powered Invoice Processing</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our AI technology is used exclusively for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Identifying invoice documents from PDF attachments</li>
              <li>Extracting relevant data (invoice numbers, dates, line items, amounts)</li>
              <li>Matching invoices to shipment claims for reimbursement processing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do NOT use AI or any other technology to analyze, profile, or make inferences about 
              your personal communications, business relationships, or any information beyond what is 
              strictly necessary for invoice processing.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">3.3 Your Control</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You can add or remove supplier email addresses at any time in your Settings</li>
              <li>You can disconnect your Gmail or Outlook account at any time, immediately revoking our access</li>
              <li>You can request deletion of all invoice data we have collected from your emails</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide, operate, and maintain our services</li>
              <li>To process and manage your reimbursement claims</li>
              <li>To match invoices with shipment discrepancies</li>
              <li>To communicate with you about your account and services</li>
              <li>To improve and optimize our platform</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Information Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share 
              your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Service Providers:</strong> With trusted third-party 
                service providers who assist us in operating our platform (e.g., cloud hosting, payment 
                processing), subject to confidentiality obligations.
              </li>
              <li>
                <strong className="text-foreground">Legal Requirements:</strong> When required by law, 
                court order, or governmental authority.
              </li>
              <li>
                <strong className="text-foreground">Business Transfers:</strong> In connection with a 
                merger, acquisition, or sale of assets, with appropriate notice to you.
              </li>
              <li>
                <strong className="text-foreground">With Your Consent:</strong> When you explicitly 
                authorize us to share information.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and employee training</li>
              <li>Encrypted storage of API tokens and credentials</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              While we strive to protect your information, no method of transmission over the Internet 
              or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide 
              you services. We will retain and use your information as necessary to comply with legal 
              obligations, resolve disputes, and enforce our agreements. You may request deletion of 
              your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate data</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data</li>
              <li><strong className="text-foreground">Portability:</strong> Request transfer of your data</li>
              <li><strong className="text-foreground">Objection:</strong> Object to certain processing activities</li>
              <li><strong className="text-foreground">Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@aurenapp.com" className="text-primary hover:underline">
                privacy@aurenapp.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services integrate with third-party platforms including Amazon Seller Central, 
              Google Gmail, and Microsoft Outlook. Your use of these services is subject to their 
              respective privacy policies. We encourage you to review those policies to understand 
              how they handle your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for individuals under the age of 18. We do not knowingly 
              collect personal information from children. If we become aware that we have collected 
              personal information from a child, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date. 
              We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our privacy practices, please 
              contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground font-medium">Auren Reimbursements</p>
              <p className="text-muted-foreground">Email: <a href="mailto:privacy@aurenapp.com" className="text-primary hover:underline">privacy@aurenapp.com</a></p>
              <p className="text-muted-foreground">Support: <a href="mailto:support@aurenapp.com" className="text-primary hover:underline">support@aurenapp.com</a></p>
              <p className="text-muted-foreground">Location: Yonkers, NY</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;