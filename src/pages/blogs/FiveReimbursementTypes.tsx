import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const FiveReimbursementTypes = () => {
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
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Education</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            5 Types of Amazon Reimbursements You're Probably Missing (And How to Claim Them)
          </h1>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>March 5, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>12 min read</span>
            </div>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop" 
            alt="Amazon seller analyzing reimbursement opportunities and claim types on computer dashboard"
            className="w-full h-[400px] object-cover rounded-xl shadow-lg mb-8"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            Most Amazon FBA sellers know about basic reimbursements for lost inventory, but there are at least five lesser-known reimbursement types that could be worth thousands annually. Here's everything you need to know.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">1. Customer Return Reimbursements: The Goldmine Everyone Overlooks</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">What It Is</h3>
          <p className="mb-4">
            When a customer requests a return, Amazon refunds them immediately—often before the item is actually returned. If the customer never sends the item back (or sends back the wrong item), you're entitled to reimbursement.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why Sellers Miss It</h3>
          <p className="mb-4">
            Most sellers assume Amazon automatically handles this. They don't. You need to actively monitor return windows and file claims when customers fail to return items.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How Much It's Worth</h3>
          <p className="mb-4">
            For sellers doing $100K/month, unreimbursed customer returns typically amount to $800-$1,500 monthly. That's $10,000-$18,000 annually left unclaimed.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Common Scenarios You Can Claim</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>45-day window expired:</strong> Customer got refunded but never returned the item within 45 days</li>
            <li><strong>Wrong item returned:</strong> Customer returned a different product than what they ordered</li>
            <li><strong>Significantly different condition:</strong> Item returned in materially worse condition than sent</li>
            <li><strong>Multiple refunds:</strong> Customer refunded more than they paid (rare but happens with pricing errors)</li>
            <li><strong>Empty package returns:</strong> Customer returned an empty box</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Claim It</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Monitor return reports in Seller Central</li>
            <li>Cross-reference return requests with actual returns received</li>
            <li>Wait for the 45-day window to close on pending returns</li>
            <li>Open a case with Amazon Seller Support</li>
            <li>Provide order ID, return request date, and refund date</li>
            <li>Request reimbursement for items not returned</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">2. Weight and Dimension Discrepancy Reimbursements</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">What It Is</h3>
          <p className="mb-4">
            Amazon measures your products and charges FBA fees based on those measurements. If Amazon's measurements are incorrect, you're overcharged on every single unit sold. These overpayments add up fast.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It Happens</h3>
          <p className="mb-4">
            Amazon's automated systems sometimes make measurement errors, especially during the initial receiving process. Packaging can add unexpected dimensions, or items might be measured incorrectly by warehouse staff.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Hidden Cost</h3>
          <p className="mb-4">
            A small dimensional error can change your fee tier significantly. For example:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Small standard size (under 12 oz): ~$3.00 per unit</li>
            <li>Large standard size: ~$4.00+ per unit</li>
          </ul>
          <p className="mb-4">
            If Amazon incorrectly classifies your item as large when it should be small, and you sell 1,000 units monthly, you're being overcharged $1,000+ per month or $12,000+ annually.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Identify It</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Download your "Fee Preview Report" from Seller Central</li>
            <li>Compare Amazon's dimensions with your actual product dimensions</li>
            <li>Calculate potential overcharges based on sales volume</li>
            <li>Focus on high-volume SKUs for maximum impact</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Fix It</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Open a case with Seller Support providing correct dimensions</li>
            <li>Include photos showing measurements with rulers/measuring tape</li>
            <li>Provide weight measurements with scale visible in photo</li>
            <li>Request cubiscan verification at Amazon warehouse</li>
            <li>Once corrected, request reimbursement for overcharges (up to 90 days back)</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">3. Removal Order Reimbursements</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">What It Is</h3>
          <p className="mb-4">
            When you create a removal order to get inventory back from Amazon or have it disposed of, Amazon is responsible for accurately fulfilling that order. If items go missing during removal, you're owed reimbursement.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Common Removal Order Issues</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Quantities don't match:</strong> You ordered 100 units removed, only 85 arrive</li>
            <li><strong>Items lost in transit:</strong> Removal shipment never arrives</li>
            <li><strong>Disposal not executed:</strong> Items marked as disposed but still showing in inventory</li>
            <li><strong>Wrong items removed:</strong> Different SKUs than what you requested</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why Sellers Miss It</h3>
          <p className="mb-4">
            Many sellers create removal orders and forget about them. They don't verify that the correct quantity was received or that disposal was properly executed.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Claim It</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Track all removal orders in a spreadsheet</li>
            <li>For returns to you: Count items when package arrives</li>
            <li>For disposals: Verify inventory levels decrease appropriately</li>
            <li>If quantities don't match, open case with removal order ID</li>
            <li>Provide expected vs. actual quantities</li>
            <li>Request reimbursement at full inventory value</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">4. Fee Refund Reimbursements</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">What It Is</h3>
          <p className="mb-4">
            When a customer returns an item within 30 days, you should receive a refund on the FBA fees for that order. Amazon sometimes fails to refund these fees automatically.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Types of Fees You Can Recover</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>FBA fulfillment fees</li>
            <li>Referral fees (for returns within 30 days)</li>
            <li>Storage fees (for items removed)</li>
            <li>Inbound shipping fees (for rejected shipments)</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How Much It's Worth</h3>
          <p className="mb-4">
            If you have a 10% return rate on $100K in monthly sales, that's $10K in returns. If the average FBA fee is $4 per item and average item price is $25, you're looking at:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>$10,000 in returns = 400 units</li>
            <li>400 units × $4 FBA fee = $1,600 in fees that should be refunded</li>
            <li>If Amazon fails to refund 30% automatically = $480 monthly in missed fee reimbursements</li>
            <li>Annual loss: $5,760</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Identify Missing Fee Refunds</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Download "Returns Report" from Seller Central</li>
            <li>Download "Fee Preview Report" for same period</li>
            <li>Cross-reference returned orders with fee charges</li>
            <li>Identify orders where fees weren't refunded</li>
            <li>Calculate total fees owed</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Claim It</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Compile list of order IDs with missing fee refunds</li>
            <li>Open case with Seller Support</li>
            <li>Provide order IDs and specific fees not refunded</li>
            <li>Include return dates (must be within 30 days for referral fees)</li>
            <li>Request fee reimbursements for all identified orders</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">5. Unfair Customer Reimbursement Claims</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">What It Is</h3>
          <p className="mb-4">
            When inventory is lost or damaged, Amazon automatically reimburses you. However, their reimbursement amount isn't always accurate. They might reimburse at manufacturing cost when they should reimburse at average selling price, or they might use outdated pricing.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How Amazon Calculates Reimbursements</h3>
          <p className="mb-4">
            Amazon's reimbursement formula considers:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Average selling price over the past 18 months</li>
            <li>Cost of goods (if you've provided it)</li>
            <li>FBA fees that would have been charged</li>
            <li>Referral fees</li>
          </ul>
          <p className="mb-4">
            The problem? Amazon's systems don't always use the correct average selling price, especially for:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>New products without 18 months of sales history</li>
            <li>Products with significant price changes</li>
            <li>Seasonal products with variable pricing</li>
            <li>Products sold in bundles vs. individually</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Real Example</h3>
          <p className="mb-4">
            You sell a product for $49.99. Amazon loses 10 units and reimburses you at $25 each (their calculated average from outdated data). You should receive $499.90 but only got $250—a $249.90 shortfall.
          </p>
          <p className="mb-4">
            If this happens across multiple SKUs and 50 units monthly, you're losing $1,200+ per month in unfair reimbursements.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Identify Unfair Reimbursements</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Download "Reimbursements Report" from Seller Central</li>
            <li>Compare reimbursement amounts to actual selling prices</li>
            <li>Flag any reimbursements below 70% of current selling price</li>
            <li>Calculate the shortfall (selling price minus reimbursement)</li>
            <li>Total all shortfalls to determine potential recovery</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">How to Challenge Unfair Reimbursements</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Gather evidence of actual selling price (screenshots, historical reports)</li>
            <li>Calculate fair reimbursement amount</li>
            <li>Open case with Seller Support referencing the reimbursement ID</li>
            <li>Provide evidence of selling price at time of loss</li>
            <li>Request additional reimbursement to match true value</li>
            <li>Escalate to Seller Performance team if initial claim is denied</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Why Manual Tracking of These Reimbursements Fails</h2>
          <p className="mb-4">
            By now, you're probably thinking: "This sounds like a full-time job." You're right. Tracking all five reimbursement types manually requires:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>20-30 hours monthly</strong> downloading and analyzing reports</li>
            <li><strong>Deep knowledge</strong> of Amazon's policies and reimbursement rules</li>
            <li><strong>Meticulous record-keeping</strong> to track claims and follow-ups</li>
            <li><strong>Constant monitoring</strong> to catch issues within filing windows</li>
            <li><strong>Persistence</strong> to follow up on denied claims</li>
          </ul>
          <p className="mb-4">
            Even sellers who try to do this manually typically miss 60-70% of eligible reimbursements simply because it's impossible to catch everything.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Automated Solution: How Technology Changes Everything</h2>
          <p className="mb-4">
            Modern reimbursement automation tools scan for all five reimbursement types (and more) continuously:
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Customer Return Automation</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Monitors all return requests in real-time</li>
            <li>Tracks 45-day return windows automatically</li>
            <li>Files claims immediately after window expires</li>
            <li>Identifies wrong items returned using image analysis</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Weight/Dimension Monitoring</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Compares Amazon's recorded dimensions to your product specs</li>
            <li>Calculates overcharge amounts for all affected SKUs</li>
            <li>Automatically requests cubiscan verification</li>
            <li>Files reimbursement claims for historical overcharges</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Removal Order Tracking</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Logs all removal orders automatically</li>
            <li>Monitors fulfillment status</li>
            <li>Alerts on quantity discrepancies</li>
            <li>Files claims for missing items</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Fee Refund Monitoring</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Cross-references returns with fee charges</li>
            <li>Identifies missing fee refunds within hours</li>
            <li>Files claims for all uncredited fees</li>
            <li>Tracks fee refund processing</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Reimbursement Amount Validation</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Compares reimbursement amounts to actual selling prices</li>
            <li>Flags underpayments automatically</li>
            <li>Gathers pricing evidence from historical data</li>
            <li>Files claims for additional reimbursement</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Your Action Plan: What to Do Right Now</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Immediate Actions (Today)</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Download your Returns Report from the past 90 days</li>
            <li>Check 5-10 customer returns to see if items were actually returned</li>
            <li>Review your Fee Preview Report for dimensional discrepancies</li>
            <li>Calculate potential monthly losses from these five categories</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">This Week</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>File claims for obvious customer return issues (items not returned after 45 days)</li>
            <li>Challenge at least one dimensional error for your top-selling SKU</li>
            <li>Review recent reimbursements to identify unfair amounts</li>
            <li>Set up a spreadsheet to track these five reimbursement types</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Long-term Strategy</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Evaluate whether manual tracking is sustainable for your volume</li>
            <li>Consider automation tools if you're doing over $50K/month</li>
            <li>Calculate ROI: Compare potential monthly recovery to time investment</li>
            <li>Choose solution that maximizes recovery while minimizing your time</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Real Numbers: What Sellers Are Recovering</h2>
          <p className="mb-4">
            Here's what sellers at different revenue levels typically recover when they start claiming all five reimbursement types:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>$25K-$50K/month revenue:</strong> $300-$800 monthly recovery</li>
            <li><strong>$50K-$100K/month revenue:</strong> $800-$2,000 monthly recovery</li>
            <li><strong>$100K-$250K/month revenue:</strong> $2,000-$5,000 monthly recovery</li>
            <li><strong>$250K+ monthly revenue:</strong> $5,000-$15,000+ monthly recovery</li>
          </ul>
          <p className="mb-4">
            These numbers represent money you're already owed—money that's sitting in Amazon's account instead of yours.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Conclusion: Stop Leaving Money on the Table</h2>
          <p className="mb-4">
            Most Amazon sellers focus exclusively on sales and marketing while leaving thousands in reimbursements unclaimed. The five reimbursement types covered in this guide represent the difference between a profitable business and a highly profitable business.
          </p>
          <p className="mb-4">
            You've already done the hard work of sourcing products, creating listings, and generating sales. Don't let Amazon keep money that rightfully belongs to you. Whether you tackle this manually or use automation, the key is to start claiming these reimbursements today.
          </p>

          <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl p-8 my-12">
            <h3 className="text-2xl font-bold mb-4">Discover All Your Missed Reimbursements</h3>
            <p className="mb-6">
              Get a free audit showing exactly how much you're owed across all reimbursement types. Our automated system finds and recovers money you didn't even know you were missing.
            </p>
            <Link to="/">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Get Your Free Audit Now
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default FiveReimbursementTypes;