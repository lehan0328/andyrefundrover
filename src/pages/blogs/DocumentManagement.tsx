import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const DocumentManagement = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/src/assets/logo.png" alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl">Auren Reimbursement</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Best Practices</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Document Management for Amazon Sellers: Best Practices for Maximum Reimbursement Success
          </h1>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>March 10, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>10 min read</span>
            </div>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&auto=format&fit=crop" 
            alt="Organized document management system for Amazon FBA sellers with invoices and receipts"
            className="w-full h-[400px] object-cover rounded-xl shadow-lg mb-8"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            Proper document management can be the difference between a 60% and 98% reimbursement approval rate. Learn how to organize, store, and leverage your invoices for maximum recovery success.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Why Documentation Matters for FBA Reimbursements</h2>
          <p className="mb-4">
            When you file a reimbursement claim with Amazon, you're essentially asking them to pay you for lost or damaged inventory. Amazon's first response is often: "Prove it." Without proper documentation, even legitimate claims get denied.
          </p>
          <p className="mb-4">
            According to data from over 1,000 FBA sellers, claims backed by proper documentation have a 98.5% approval rate, while claims without documentation see only a 62% approval rate. That's a 36.5% difference that directly impacts your bottom line.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Essential Documents Every Amazon Seller Needs</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">1. Supplier Invoices</h3>
          <p className="mb-4">
            Your supplier invoices are the gold standard for proving ownership and value. These documents should include:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Supplier name and contact information</li>
            <li>Invoice date and invoice number</li>
            <li>Detailed product descriptions matching your Amazon listings</li>
            <li>SKU or product codes</li>
            <li>Quantities purchased</li>
            <li>Unit prices and total costs</li>
            <li>Payment terms and methods</li>
          </ul>
          <p className="mb-4">
            <strong>Pro tip:</strong> Keep both PDF and original format copies. Some suppliers provide invoices in accounting software formats that may be needed for verification.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">2. Shipment Records</h3>
          <p className="mb-4">
            Every shipment to Amazon FBA should have accompanying documentation:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>FBA shipment IDs and labels</li>
            <li>Packing lists with item quantities</li>
            <li>Carrier tracking numbers</li>
            <li>Proof of delivery confirmations</li>
            <li>Bill of lading for freight shipments</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">3. Amazon Purchase Orders (For Wholesale/Private Label)</h3>
          <p className="mb-4">
            If you're purchasing inventory specifically for Amazon FBA, maintain records that clearly connect your supplier purchases to your Amazon inventory.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">4. Product Authenticity Documents</h3>
          <p className="mb-4">
            For brand-name products, keep certificates of authenticity, authorization letters from manufacturers, and any brand relationship documentation.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Document Organization System That Works</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Step 1: Centralized Digital Storage</h3>
          <p className="mb-4">
            Gone are the days of filing cabinets and scattered email attachments. Successful Amazon sellers use centralized digital storage systems with these characteristics:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Cloud-based:</strong> Accessible from anywhere, with automatic backups</li>
            <li><strong>Encrypted:</strong> Protect sensitive business information with bank-grade security</li>
            <li><strong>Searchable:</strong> Find any document in seconds using keywords or dates</li>
            <li><strong>Version-controlled:</strong> Track changes and maintain document history</li>
            <li><strong>Integration-ready:</strong> Connect with reimbursement automation tools</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Step 2: Consistent Naming Convention</h3>
          <p className="mb-4">
            Create a standardized naming system for all documents. Here's a proven format:
          </p>
          <p className="mb-4 font-mono bg-muted p-4 rounded-lg">
            [Document Type]_[Supplier Name]_[Date]_[Invoice/PO Number]_[Product SKU]
          </p>
          <p className="mb-4">
            Example: <code className="bg-muted px-2 py-1 rounded">INVOICE_AcmeSupplies_2024-03-10_INV12345_PROD-001.pdf</code>
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Step 3: Folder Structure</h3>
          <p className="mb-4">
            Organize documents in a logical hierarchy:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>By Year:</strong> 2024/
              <ul className="list-circle pl-6 mt-2 space-y-1">
                <li><strong>By Quarter:</strong> Q1/
                  <ul className="list-square pl-6 mt-2 space-y-1">
                    <li><strong>By Supplier:</strong> Acme_Supplies/
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Invoices/</li>
                        <li>Shipment_Records/</li>
                        <li>Correspondence/</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Common Documentation Mistakes That Cost You Money</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Mistake #1: Incomplete Invoices</h3>
          <p className="mb-4">
            Many sellers save invoices that are missing critical information. Amazon may reject these for reimbursement claims. Always verify your invoices include:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Complete supplier business information (not just a first name)</li>
            <li>Detailed product descriptions (not generic descriptions like "merchandise")</li>
            <li>Quantities that match your FBA shipments</li>
            <li>Prices that align with your declared inventory values</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Mistake #2: Waiting Until You Need Documents</h3>
          <p className="mb-4">
            The worst time to start organizing documents is when Amazon asks for proof. By then, you might have deleted emails, lost access to supplier portals, or missed claim deadlines.
          </p>
          <p className="mb-4">
            <strong>Solution:</strong> Upload and organize documents immediately upon receipt—within 24 hours of receiving any invoice or shipment confirmation.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Mistake #3: Not Matching Documents to Shipments</h3>
          <p className="mb-4">
            Having invoices isn't enough. You need to connect each invoice to specific FBA shipments. Without this connection, Amazon may claim your documentation doesn't prove the lost items came from that particular shipment.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Mistake #4: Deleting Old Documents</h3>
          <p className="mb-4">
            Some reimbursement cases surface months or even years after the original transaction. Sellers who delete "old" documents often lose out on legitimate claims.
          </p>
          <p className="mb-4">
            <strong>Best practice:</strong> Maintain documents for at least 3 years, which aligns with both Amazon's policies and most tax requirements.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Automation: The Game-Changer for Document Management</h2>
          <p className="mb-4">
            Manual document management is time-consuming and error-prone. Modern automation tools transform the process:
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Automatic Document Capture</h3>
          <p className="mb-4">
            Advanced systems can automatically capture documents from:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Email attachments (invoices forwarded to a specific address)</li>
            <li>Supplier portal integrations</li>
            <li>Accounting software connections (QuickBooks, Xero, etc.)</li>
            <li>File upload interfaces with drag-and-drop functionality</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Intelligent Document Matching</h3>
          <p className="mb-4">
            AI-powered systems can automatically:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Extract key information from invoices (dates, amounts, SKUs)</li>
            <li>Match invoices to corresponding FBA shipments</li>
            <li>Link documentation to specific reimbursement claims</li>
            <li>Flag incomplete or problematic documents for review</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">On-Demand Retrieval</h3>
          <p className="mb-4">
            When Amazon requests documentation for a claim, automated systems instantly provide the exact documents needed—no manual searching required. This speed dramatically improves approval rates since claims with delayed documentation often get denied.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Building Your Document Management Workflow</h2>
          <p className="mb-4">
            Here's a step-by-step workflow you can implement today:
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Daily Tasks (5-10 minutes)</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Check email for new invoices from suppliers</li>
            <li>Download and save invoices with proper naming convention</li>
            <li>Upload to centralized storage system</li>
            <li>Verify document completeness</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Weekly Tasks (15-20 minutes)</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Match new invoices to recent FBA shipments</li>
            <li>Create cross-reference spreadsheet linking invoices to shipment IDs</li>
            <li>Backup all documents to secondary location</li>
            <li>Review any flagged or incomplete documents</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Monthly Tasks (30 minutes)</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Audit document completeness for the month</li>
            <li>Reconcile inventory purchases with Amazon received quantities</li>
            <li>Archive documents older than 3 months to long-term storage</li>
            <li>Update documentation procedures based on lessons learned</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">The ROI of Proper Document Management</h2>
          <p className="mb-4">
            Implementing a solid document management system requires an upfront time investment, but the returns are substantial:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Higher approval rates:</strong> 98% vs. 62% without documentation</li>
            <li><strong>Faster claim resolution:</strong> 12-15 days vs. 30-45 days</li>
            <li><strong>Larger recovery amounts:</strong> Full value recovery vs. partial reimbursements</li>
            <li><strong>Time savings:</strong> 20+ hours monthly saved by not scrambling for documents</li>
            <li><strong>Tax benefits:</strong> Organized records make tax preparation painless</li>
            <li><strong>Business insights:</strong> Clear view of supplier performance and costs</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Taking It to the Next Level: Fully Automated Solutions</h2>
          <p className="mb-4">
            While manual document management is better than nothing, fully automated solutions offer the ultimate efficiency:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Zero ongoing time investment:</strong> Upload invoices once, automation handles everything else</li>
            <li><strong>Automatic claim matching:</strong> System connects documents to claims without your involvement</li>
            <li><strong>Instant submission:</strong> When Amazon needs proof, documents are provided in seconds</li>
            <li><strong>Compliance assurance:</strong> Never worry about missing documentation or formatting issues</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Action Items: Start Today</h2>
          <p className="mb-4">
            Ready to transform your document management? Here's your immediate action plan:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Audit current state:</strong> Spend 30 minutes assessing your current document situation</li>
            <li><strong>Gather existing documents:</strong> Collect all invoices, shipment records, and receipts from the past 18 months</li>
            <li><strong>Choose a storage solution:</strong> Select a cloud storage system (or use an automated reimbursement service with built-in storage)</li>
            <li><strong>Implement naming convention:</strong> Rename your existing documents using the format provided above</li>
            <li><strong>Create folder structure:</strong> Set up the organizational hierarchy for easy navigation</li>
            <li><strong>Establish daily workflow:</strong> Block 10 minutes daily for document management</li>
            <li><strong>Consider automation:</strong> Evaluate whether a fully automated solution makes sense for your volume</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Conclusion: Documentation as Competitive Advantage</h2>
          <p className="mb-4">
            In the competitive world of Amazon FBA, every dollar matters. Proper document management isn't just about staying organized—it's about protecting your profits and ensuring you receive every penny you're owed.
          </p>
          <p className="mb-4">
            The sellers who treat documentation as a strategic priority consistently outperform those who don't. With recovery rates of 98%+ and thousands of additional dollars recovered annually, proper document management might be the highest-ROI activity in your entire business.
          </p>

          <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl p-8 my-12">
            <h3 className="text-2xl font-bold mb-4">Simplify Your Document Management</h3>
            <p className="mb-6">
              Our automated system handles all document organization and matching for you. Just upload your invoices—we take care of the rest.
            </p>
            <Link to="/">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Start Your Free Audit
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default DocumentManagement;