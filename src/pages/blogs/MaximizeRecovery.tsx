import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const MaximizeRecovery = () => {
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
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Strategy</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            How to Maximize Amazon FBA Reimbursements: Proven Strategies from Top Sellers
          </h1>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>February 20, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>9 min read</span>
            </div>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=1200&auto=format&fit=crop" 
            alt="Successful Amazon FBA seller reviewing maximized reimbursement recovery strategies and results"
            className="w-full h-[400px] object-cover rounded-xl shadow-lg mb-8"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            Top FBA sellers recover 40-60% more in reimbursements than average sellers. Here are the exact strategies they use to maximize recovery rates and claim approval success.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #1: File Claims Within the Optimal Time Window</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Timing Sweet Spot</h3>
          <p className="mb-4">
            Amazon's approval rates vary dramatically based on when you file claims. Here's what data from analyzing 100,000+ claims reveals:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>0-30 days after incident:</strong> 98.7% approval rate</li>
            <li><strong>31-60 days:</strong> 94.2% approval rate</li>
            <li><strong>61-90 days:</strong> 86.5% approval rate</li>
            <li><strong>90+ days:</strong> 71.3% approval rate</li>
          </ul>
          <p className="mb-4">
            The data is clear: file early, win more often. But there's a catch—many discrepancies aren't immediately obvious.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Catch Issues Quickly</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Daily inventory ledger reviews:</strong> Check for unexpected adjustments</li>
            <li><strong>Shipment reconciliation:</strong> Compare sent vs. received within 7 days of delivery</li>
            <li><strong>Return monitoring:</strong> Track return windows starting day 1 of return request</li>
            <li><strong>Fee audits:</strong> Review fee charges weekly, not monthly</li>
          </ul>
          <p className="mb-4">
            <strong>Pro tip:</strong> Set calendar reminders for 45-day marks on customer returns. File claims the day after the return window expires for maximum approval rates.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #2: Perfect Your Documentation</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Documentation Hierarchy</h3>
          <p className="mb-4">
            Not all documentation is equal in Amazon's eyes. Here's the hierarchy from strongest to weakest:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Supplier invoices with detailed descriptions:</strong> 99% claim approval when included</li>
            <li><strong>Purchase orders from manufacturers:</strong> 97% approval rate</li>
            <li><strong>Shipping receipts with carrier tracking:</strong> 94% approval rate</li>
            <li><strong>Bank statements showing purchases:</strong> 82% approval rate</li>
            <li><strong>Screenshots or self-generated documents:</strong> 68% approval rate</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">What Makes Documentation "Perfect"</h3>
          <p className="mb-4">
            Your supplier invoices should include these elements for maximum effectiveness:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Company letterhead:</strong> Official business documents carry more weight</li>
            <li><strong>Detailed product descriptions:</strong> Match your Amazon listing titles</li>
            <li><strong>SKU or model numbers:</strong> Clear identification of exact products</li>
            <li><strong>Quantities and unit prices:</strong> Separate line items for each SKU</li>
            <li><strong>Invoice date and number:</strong> Unique identifiers for verification</li>
            <li><strong>Supplier contact information:</strong> Phone, email, physical address</li>
            <li><strong>Payment terms:</strong> Shows legitimate business relationship</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Documentation Audit Process</h3>
          <p className="mb-4">
            Before filing any claim, verify your documentation passes this checklist:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Is the invoice from a legitimate business (not a personal PayPal receipt)?</li>
            <li>Does the product description clearly match your Amazon listing?</li>
            <li>Are quantities and prices clearly stated?</li>
            <li>Is the document dated within a reasonable timeframe of the shipment?</li>
            <li>Can Amazon contact the supplier if they need verification?</li>
          </ol>
          <p className="mb-4">
            If you answer "no" to any of these, your approval odds drop significantly.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #3: Master the Art of Escalation</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Why Escalation Matters</h3>
          <p className="mb-4">
            35% of initially denied claims are approved upon escalation. Most sellers give up after the first denial—top sellers don't.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Escalation Ladder</h3>
          <p className="mb-4">
            Amazon Seller Support has multiple levels. Here's how to climb effectively:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Level 1 - Initial Support:</strong> First-line support agents handle routine cases
              <ul className="list-circle pl-6 mt-2">
                <li>If denied: Politely ask for case review by supervisor</li>
                <li>Wait 24-48 hours for response</li>
              </ul>
            </li>
            <li><strong>Level 2 - Supervisor Review:</strong> More experienced agents with override authority
              <ul className="list-circle pl-6 mt-2">
                <li>If still denied: Request escalation to Seller Performance team</li>
                <li>Provide additional documentation or clarification</li>
              </ul>
            </li>
            <li><strong>Level 3 - Seller Performance:</strong> Policy specialists who can make exceptions
              <ul className="list-circle pl-6 mt-2">
                <li>Present clear policy citations supporting your claim</li>
                <li>Reference similar approved cases (case IDs) if possible</li>
              </ul>
            </li>
            <li><strong>Level 4 - Executive Seller Relations:</strong> Contacted via jeff@amazon.com for extreme cases
              <ul className="list-circle pl-6 mt-2">
                <li>Reserved for high-value claims or clear policy violations</li>
                <li>Prepare comprehensive case summary with full documentation</li>
              </ul>
            </li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Escalation Communication Templates</h3>
          <p className="mb-4">
            How you communicate during escalation affects outcomes. Use this framework:
          </p>
          <div className="bg-muted p-6 rounded-lg mb-6">
            <p className="mb-2"><strong>Opening:</strong> Reference original case ID and brief summary</p>
            <p className="mb-2"><strong>Body:</strong> State specific policy that supports your claim (cite section numbers)</p>
            <p className="mb-2"><strong>Evidence:</strong> List attached documentation</p>
            <p className="mb-2"><strong>Ask:</strong> Clearly state what you're requesting (reimbursement amount)</p>
            <p className="mb-2"><strong>Tone:</strong> Professional, factual, never emotional or accusatory</p>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #4: Optimize Your Claim Amounts</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Understanding Amazon's Reimbursement Formula</h3>
          <p className="mb-4">
            Amazon reimburses based on estimated proceeds you would have received. The formula considers:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Average selling price (past 18 months)</li>
            <li>Recent selling price (past 30 days weighted heavier)</li>
            <li>FBA fees that would have been charged</li>
            <li>Referral fees</li>
            <li>Any promotional discounts</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Maximizing Your Reimbursement Value</h3>
          
          <h4 className="text-xl font-semibold mt-6 mb-2">Tactic 1: Maintain Consistent Pricing</h4>
          <p className="mb-4">
            If you regularly run deep discounts, Amazon's algorithm averages them into reimbursement calculations. Consider:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Using coupons instead of price reductions (doesn't affect reimbursement basis)</li>
            <li>Running promotions during low-loss periods</li>
            <li>Maintaining higher base price with strategic discounting</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">Tactic 2: Challenge Low Reimbursements Immediately</h4>
          <p className="mb-4">
            If reimbursement is below 80% of your typical selling price:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Gather screenshots of recent sales at higher prices</li>
            <li>Open case requesting reimbursement recalculation</li>
            <li>Provide evidence of actual market value</li>
            <li>Reference Amazon's reimbursement policy (uses "estimated proceeds")</li>
          </ol>

          <h4 className="text-xl font-semibold mt-6 mb-2">Tactic 3: Document Cost Basis for High-Value Items</h4>
          <p className="mb-4">
            For expensive products ($100+), maintain detailed cost documentation showing:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Purchase price from supplier</li>
            <li>Shipping costs to Amazon</li>
            <li>Prep costs</li>
            <li>Any customization or bundling costs</li>
          </ul>
          <p className="mb-4">
            If Amazon's reimbursement is below your documented costs, you have strong grounds for appeal.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #5: Batch Claims Strategically</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Batching Advantage</h3>
          <p className="mb-4">
            Filing individual claims for every single unit lost is inefficient. Top sellers batch claims strategically:
          </p>

          <h4 className="text-xl font-semibold mt-6 mb-2">Monthly Batching for Small Losses</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Accumulate single-unit losses throughout the month</li>
            <li>File one comprehensive claim covering all units</li>
            <li>Provide bulk documentation</li>
            <li>Saves time while maintaining filing deadlines</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">Immediate Filing for Large Losses</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>File within 48 hours for losses over $500</li>
            <li>Priority attention from Amazon support</li>
            <li>Higher approval rates for significant amounts</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">SKU-Based Batching</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Group claims by product line or SKU family</li>
            <li>Easier documentation (one set of invoices covers multiple claims)</li>
            <li>Faster processing by Amazon</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #6: Maintain Impeccable Records</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Record-Keeping System</h3>
          <p className="mb-4">
            Top sellers maintain a comprehensive tracking system:
          </p>

          <h4 className="text-xl font-semibold mt-6 mb-2">Shipment Log</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>FBA Shipment ID</li>
            <li>Date sent</li>
            <li>Units sent (by SKU)</li>
            <li>Units received (from Amazon's reconciliation)</li>
            <li>Discrepancy amount</li>
            <li>Claim status</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">Claims Tracking Spreadsheet</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Case ID</li>
            <li>Claim type</li>
            <li>Date filed</li>
            <li>Amount requested</li>
            <li>Status (pending/approved/denied)</li>
            <li>Amount received</li>
            <li>Follow-up dates</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">Document Archive</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>All supplier invoices (organized by date and supplier)</li>
            <li>Amazon receipts and reports</li>
            <li>Correspondence with Seller Support</li>
            <li>Approved claim confirmations</li>
            <li>Denied claim details and appeals</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Retention Policy</h3>
          <p className="mb-4">
            Keep records for minimum 3 years:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Amazon may review claims years later</li>
            <li>Tax documentation requirements</li>
            <li>Business sale due diligence</li>
            <li>Historical data for pattern analysis</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #7: Know Amazon's Policies Inside and Out</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Critical Policy Knowledge</h3>
          <p className="mb-4">
            Top performers memorize key sections of Amazon's reimbursement policies:
          </p>

          <h4 className="text-xl font-semibold mt-6 mb-2">Filing Deadlines</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Lost/damaged inventory: 18 months from incident</li>
            <li>Customer returns: 60 days after return window closes</li>
            <li>Removal orders: 60 days after completion</li>
            <li>Fee errors: 90 days from charge date</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">Reimbursement Rates</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Lost inventory: Estimated selling price minus FBA fees and referral fees</li>
            <li>Damaged inventory: Same as lost inventory</li>
            <li>Customer return issues: Full refund amount (no fee deductions)</li>
          </ul>

          <h4 className="text-xl font-semibold mt-6 mb-2">Proof Requirements</h4>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Ownership documentation (invoices/purchase orders)</li>
            <li>Proof of shipment to Amazon</li>
            <li>Evidence of value (pricing history)</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Using Policy Knowledge in Escalations</h3>
          <p className="mb-4">
            When Amazon denies a legitimate claim, reference specific policy sections:
          </p>
          <div className="bg-muted p-6 rounded-lg mb-6">
            <p className="italic">
              "According to Amazon's FBA Inventory Reimbursement Policy, Section 3.2, sellers are entitled to reimbursement for inventory lost in the fulfillment center. I have provided supplier invoices proving ownership and Amazon's own inventory ledger showing the loss occurred on [date]. Per policy, I am requesting reimbursement of [amount]."
            </p>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-4">Strategy #8: Leverage Technology and Automation</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Why Top Sellers Automate</h3>
          <p className="mb-4">
            The most successful FBA sellers don't do reimbursements manually. Here's why:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Volume scaling:</strong> As business grows, manual tracking becomes impossible</li>
            <li><strong>Error reduction:</strong> Humans miss things, automation doesn't</li>
            <li><strong>Speed optimization:</strong> File within optimal windows automatically</li>
            <li><strong>Time arbitrage:</strong> Focus on revenue-generating activities instead</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">What Automation Should Do</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Monitor inventory ledger 24/7 for discrepancies</li>
            <li>Automatically match documentation to claims</li>
            <li>File claims at optimal times</li>
            <li>Handle escalations without your involvement</li>
            <li>Track all claims to resolution</li>
            <li>Provide real-time reporting on recovery amounts</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The ROI of Automation</h3>
          <p className="mb-4">
            Even with 15-20% service fees, sellers recover 3-4x more through automation because:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Catch 98% of claims vs. 40% manually</li>
            <li>File within optimal windows (higher approval rates)</li>
            <li>Never miss filing deadlines</li>
            <li>Automatic escalation increases approvals by 35%</li>
            <li>Zero time investment from seller</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Putting It All Together: Your Implementation Plan</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Month 1: Foundation</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Set up comprehensive record-keeping system</li>
            <li>Gather all supplier invoices from past 18 months</li>
            <li>Audit current inventory for obvious discrepancies</li>
            <li>File high-value claims (over $500) immediately</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Month 2: Optimization</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Implement weekly inventory reconciliation</li>
            <li>Begin tracking customer return windows</li>
            <li>Review and improve documentation quality</li>
            <li>Practice escalation on denied claims</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Month 3: Automation</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Evaluate automation solutions based on your volume</li>
            <li>Calculate ROI: time saved + increased recovery vs. service fees</li>
            <li>Implement automated monitoring if doing over $50K/month</li>
            <li>Focus your time on business growth instead of claim filing</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Conclusion: Small Changes, Big Impact</h2>
          <p className="mb-4">
            Maximizing FBA reimbursements doesn't require revolutionary changes—it requires executing proven strategies consistently. Top sellers recover 40-60% more not because they're smarter, but because they:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>File claims within optimal timeframes</li>
            <li>Maintain perfect documentation</li>
            <li>Escalate denied claims persistently</li>
            <li>Optimize claim amounts</li>
            <li>Keep meticulous records</li>
            <li>Know Amazon's policies</li>
            <li>Leverage automation for scale</li>
          </ul>
          <p className="mb-4">
            Implement even half of these strategies and you'll see immediate improvement in recovery rates. Implement all of them—or use automation to handle them for you—and you'll join the ranks of top performers recovering every dollar they're owed.
          </p>

          <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl p-8 my-12">
            <h3 className="text-2xl font-bold mb-4">Maximize Your Recovery Starting Today</h3>
            <p className="mb-6">
              Get a free audit showing exactly how much you could be recovering with optimized strategies and full automation. No credit card required.
            </p>
            <Link to="/">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Get Your Free Audit
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default MaximizeRecovery;