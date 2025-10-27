import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const CommonMistakes = () => {
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
            10 Costly Mistakes Amazon Sellers Make With FBA Reimbursements (And How to Avoid Them)
          </h1>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>February 15, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>13 min read</span>
            </div>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop" 
            alt="Amazon FBA seller avoiding common reimbursement mistakes while reviewing claim documentation and strategies"
            className="w-full h-[400px] object-cover rounded-xl shadow-lg mb-8"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            Even experienced FBA sellers make critical reimbursement mistakes that cost thousands annually. Here are the top 10 mistakes—and exactly how to fix each one.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #1: Waiting for Amazon to Automatically Reimburse You</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Many sellers believe Amazon automatically reimburses for all lost or damaged inventory. While Amazon does issue some automatic reimbursements, they catch less than 30% of reimbursable situations.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            A seller doing $100K/month who relies solely on automatic reimbursements leaves an average of $2,100 monthly unclaimed. That's $25,200 annually—money that's rightfully theirs but goes unreimbursed because they never filed claims.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Assume nothing will be automatically reimbursed</li>
            <li>Actively monitor your inventory ledger for discrepancies</li>
            <li>Track all shipments, returns, and removals</li>
            <li>File claims proactively—don't wait for Amazon to notice</li>
            <li>Consider automation that monitors 24/7 and files claims automatically</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #2: Not Keeping Proper Invoice Documentation</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Sellers often discard invoices after paying suppliers, or they save invoices that lack critical information. When Amazon requests proof of ownership months later, they scramble (and often fail) to provide adequate documentation.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Claims without proper documentation have a 62% approval rate versus 98.5% with complete documentation. If you file 100 claims worth $10,000 total:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>With documentation: 98.5 approved = $9,850 recovered</li>
            <li>Without documentation: 62 approved = $6,200 recovered</li>
            <li><strong>Cost of missing documentation: $3,650</strong></li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Save every supplier invoice immediately upon receipt</li>
            <li>Verify invoices include all required elements before filing:
              <ul className="list-circle pl-6 mt-2">
                <li>Supplier business name and contact info</li>
                <li>Detailed product descriptions</li>
                <li>SKUs or model numbers</li>
                <li>Quantities and unit prices</li>
                <li>Invoice date and number</li>
              </ul>
            </li>
            <li>Store invoices in secure, searchable cloud storage</li>
            <li>Maintain invoices for minimum 3 years</li>
            <li>Create a system where invoices are immediately uploaded after purchase</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #3: Missing Filing Deadlines</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Amazon has specific deadlines for different claim types. Once deadlines pass, claims are automatically denied regardless of legitimacy. Sellers often discover discrepancies months after they occurred—too late to file.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Common Deadline Oversights</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Lost inventory:</strong> 18 months from date of loss (sellers often find issues after deadline)</li>
            <li><strong>Customer returns:</strong> 60 days after 45-day return window closes (tight 105-day total window)</li>
            <li><strong>Fee errors:</strong> 90 days from charge date (easy to miss when reviewing monthly)</li>
            <li><strong>Removal orders:</strong> 60 days after completion (sellers forget to track)</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Missing deadlines = 100% of potential recovery lost. If you discover $5,000 in lost inventory but the 18-month window has passed, you receive $0 regardless of how legitimate the claim is.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Set up automatic calendar reminders:
              <ul className="list-circle pl-6 mt-2">
                <li>45 days after customer return request: Check if item returned</li>
                <li>Weekly: Review new fee charges</li>
                <li>Monthly: Reconcile all FBA shipments from 30-45 days ago</li>
              </ul>
            </li>
            <li>Use a deadline tracking spreadsheet with alerts</li>
            <li>Review inventory ledger weekly to catch issues early</li>
            <li>Implement automation that monitors continuously and never misses deadlines</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #4: Accepting Amazon's First "No" as Final</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Amazon's first-line support agents deny many legitimate claims due to policy misunderstanding, inadequate review, or restrictive guidelines. Most sellers accept these denials and move on.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            35% of denied claims are ultimately approved through escalation. If you file $10,000 in claims and 30% are initially denied ($3,000), failing to escalate means losing $1,050 that should be yours.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Never accept first denial without review</li>
            <li>Analyze the denial reason:
              <ul className="list-circle pl-6 mt-2">
                <li>Missing documentation? Provide it and resubmit</li>
                <li>Policy misunderstanding? Reference correct policy section</li>
                <li>Vague denial? Request specific reason</li>
              </ul>
            </li>
            <li>Politely request supervisor review</li>
            <li>Escalate to Seller Performance if needed</li>
            <li>For high-value claims (over $1,000), escalate to Executive Seller Relations</li>
            <li>Use automation that handles escalations automatically through multiple levels</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #5: Not Tracking Customer Return Windows</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            When customers request returns, Amazon immediately refunds them. Sellers assume the item will be returned. However, 15-25% of return requests never result in actual returns. Sellers who don't track this lose significant money.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Example: You have 200 return requests monthly with an average item value of $30. If 20% never return the item:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>40 items never returned × $30 = $1,200 monthly lost</li>
            <li>Annual impact: $14,400</li>
          </ul>
          <p className="mb-4">
            Most sellers never recover this because they don't track return windows.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Download return reports weekly</li>
            <li>Create tracking system with these columns:
              <ul className="list-circle pl-6 mt-2">
                <li>Order ID</li>
                <li>Return request date</li>
                <li>45-day deadline date</li>
                <li>Item returned? (Yes/No)</li>
                <li>Claim filed? (Yes/No)</li>
                <li>Claim status</li>
              </ul>
            </li>
            <li>Set calendar reminder for day 46 of each return request</li>
            <li>File claims immediately after 45-day window expires</li>
            <li>Use automation that tracks every return request and files claims automatically on day 46</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #6: Ignoring Small-Value Claims</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Sellers often ignore claims under $20 because "it's not worth the time." They focus only on large discrepancies while letting dozens of small claims accumulate unclaimed.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Those "insignificant" $5-$15 losses add up dramatically:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>50 small claims monthly × $10 average = $500 monthly</li>
            <li>Annual loss: $6,000</li>
            <li>Over 5 years: $30,000 left on the table</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Change mindset: Every dollar matters</li>
            <li>Batch small claims monthly to reduce per-claim time investment</li>
            <li>Use templates for common small-value claim types</li>
            <li>Implement automation—it doesn't distinguish between $5 and $500 claims</li>
          </ul>
          <p className="mb-4">
            <strong>Pro tip:</strong> Automated systems file small claims just as efficiently as large ones, recovering money you'd never manually pursue.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #7: Not Reconciling FBA Shipments Within 7 Days</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Sellers send shipments to Amazon and assume everything was received correctly. They wait weeks or months to check receiving reports, by which time evidence (carrier tracking, photos, packing lists) may be lost or disputed.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Receiving discrepancies are among the highest-value claim types. A single large shipment with 5% shortage could mean $1,000-$5,000 in losses. Delayed reconciliation:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Makes disputes harder (carrier tracking expires after 30 days)</li>
            <li>Reduces claim approval rates</li>
            <li>Causes you to miss optimal filing windows</li>
            <li>Results in lost documentation</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Review shipment status within 7 days of delivery to Amazon</li>
            <li>Compare "Units Sent" vs. "Units Received" immediately</li>
            <li>If discrepancy exists:
              <ul className="list-circle pl-6 mt-2">
                <li>Screenshot carrier tracking showing delivery confirmation</li>
                <li>Locate packing list and weight/dimension proof</li>
                <li>File claim within 14 days of shipment delivery</li>
              </ul>
            </li>
            <li>Maintain shipment log with reconciliation dates</li>
            <li>Use automation that monitors shipment status and flags discrepancies instantly</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #8: Overlooking Weight and Dimension Fee Errors</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Amazon measures your products and charges FBA fees based on those measurements. Sellers rarely verify Amazon's dimensions match actual product specs. When measurements are wrong (which happens frequently), sellers are overcharged on every single unit sold.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            A dimensional error moving your product from "small standard" to "large standard" size tier increases fees by approximately $1.00-$1.50 per unit. If you sell 1,000 units monthly:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Monthly overcharge: $1,000-$1,500</li>
            <li>Annual overcharge: $12,000-$18,000</li>
            <li>This continues indefinitely until you correct it</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Download "Fee Preview Report" from Seller Central</li>
            <li>Compare Amazon's dimensions to your actual product dimensions</li>
            <li>For discrepancies:
              <ul className="list-circle pl-6 mt-2">
                <li>Take photos of product with ruler/measuring tape</li>
                <li>Photograph product on scale showing weight</li>
                <li>Open case requesting cubiscan verification</li>
                <li>Request fee reimbursement for past overcharges (up to 90 days)</li>
              </ul>
            </li>
            <li>Focus on high-volume SKUs first (biggest impact)</li>
            <li>Use automation that continuously monitors dimensions and flags errors</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #9: Filing Claims With Incomplete Information</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Sellers rush to file claims without gathering all required information. They provide vague descriptions, miss reference IDs, or forget critical documentation. Amazon denies these claims immediately.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Common Incomplete Claim Elements</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Missing FBA shipment IDs</li>
            <li>No transaction IDs or order numbers</li>
            <li>Vague descriptions ("I'm missing some inventory")</li>
            <li>Incomplete documentation</li>
            <li>No specific dates or quantities</li>
            <li>Missing SKU information</li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Incomplete claims have a 40-50% approval rate versus 98% for complete claims. You're essentially flipping a coin on whether you'll get paid, even for legitimate issues.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <p className="mb-4">
            Use this checklist before submitting any claim:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>✓ Specific claim type selected (lost, damaged, customer return, etc.)</li>
            <li>✓ All relevant IDs included (FBA shipment, order, transaction, removal order)</li>
            <li>✓ Exact SKU and FNSKU</li>
            <li>✓ Precise quantities</li>
            <li>✓ Specific dates (when shipped, when lost, when refunded)</li>
            <li>✓ Complete documentation attached</li>
            <li>✓ Clear description of issue</li>
            <li>✓ Specific reimbursement amount requested</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Mistake #10: Trying to Do Everything Manually</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">The Mistake</h3>
          <p className="mb-4">
            Even sellers who actively pursue reimbursements often try to handle everything manually. They spend 20-30 hours monthly downloading reports, cross-referencing data, tracking deadlines, and filing claims.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Why It's Costly</h3>
          <p className="mb-4">
            Manual reimbursement recovery has three hidden costs:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Opportunity cost:</strong> 25 hours monthly @ $50/hour value = $1,250 in time you could spend on revenue-generating activities</li>
            <li><strong>Missed claims:</strong> Human error and time constraints mean you catch only 40-50% of eligible claims</li>
            <li><strong>Lower approval rates:</strong> Manual filing leads to mistakes, missed deadlines, and inadequate escalation (65-75% approval vs. 98% automated)</li>
          </ol>
          <p className="mb-4">
            For a $100K/month seller:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Manual approach: 40% of $6,000 potential = $2,400 recovered, -$1,250 time cost = $1,150 net benefit</li>
            <li>Automated approach: 98% of $6,000 = $5,880 recovered, -$1,176 service fee (20%) = $4,704 net benefit</li>
            <li><strong>Cost of manual approach: $3,554 monthly or $42,648 annually</strong></li>
          </ul>

          <h3 className="text-2xl font-semibold mt-8 mb-3">The Fix</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Calculate your actual costs of manual approach (time + missed claims)</li>
            <li>Compare to automated solution ROI</li>
            <li>For sellers over $50K/month, automation typically delivers 3-4x ROI</li>
            <li>Choose automation that:
              <ul className="list-circle pl-6 mt-2">
                <li>Monitors 24/7 without your involvement</li>
                <li>Files claims automatically with complete documentation</li>
                <li>Handles escalations through multiple levels</li>
                <li>Charges success-based fees (you pay only when you get paid)</li>
              </ul>
            </li>
            <li>Redirect recovered time to business growth activities</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Compounding Effect of Multiple Mistakes</h2>
          <p className="mb-4">
            Here's the scary part: most sellers make several of these mistakes simultaneously. The financial impact compounds:
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Example: $100K/Month Seller Making 5 Common Mistakes</h3>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Waiting for automatic reimbursements: -$2,100/month</li>
            <li>Missing documentation: -$300/month in denied claims</li>
            <li>Missing deadlines: -$400/month</li>
            <li>Not tracking returns: -$1,200/month</li>
            <li>Ignoring small claims: -$500/month</li>
          </ul>
          <p className="mb-4">
            <strong>Total monthly loss: $4,500</strong><br/>
            <strong>Annual loss: $54,000</strong>
          </p>
          <p className="mb-4">
            That's $54,000 in profit literally disappearing because of preventable mistakes.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Your Action Plan: Fixing These Mistakes</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">Immediate Actions (This Week)</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Audit which mistakes you're currently making (be honest)</li>
            <li>Calculate the financial impact using formulas above</li>
            <li>Gather all supplier invoices from past 18 months</li>
            <li>Set up calendar reminders for return windows and filing deadlines</li>
            <li>Review Fee Preview Report for dimensional errors on top SKUs</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">This Month</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Implement proper documentation storage system</li>
            <li>Create shipment reconciliation workflow</li>
            <li>Begin tracking customer return windows</li>
            <li>File backlog of obvious claims with complete information</li>
            <li>Practice escalating one denied claim</li>
          </ol>

          <h3 className="text-2xl font-semibold mt-8 mb-3">Long-term Solution</h3>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li>Evaluate automation solutions for your volume level</li>
            <li>Calculate ROI: (increased recovery - service fees) vs. (time savings + missed claims)</li>
            <li>For sellers over $50K/month, implement full automation</li>
            <li>Use freed time to focus on sourcing, marketing, and business growth</li>
            <li>Monitor results and adjust strategy quarterly</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Conclusion: Small Mistakes, Massive Impact</h2>
          <p className="mb-4">
            None of these mistakes seem catastrophic individually. Missing a $15 claim doesn't feel significant. Accepting one denied claim without escalation seems reasonable. Waiting an extra week to reconcile a shipment appears harmless.
          </p>
          <p className="mb-4">
            But these "small" mistakes compound into five-figure annual losses. The good news? Every single mistake is completely preventable. You don't need to be smarter or work harder—you just need better systems.
          </p>
          <p className="mb-4">
            Top FBA sellers don't make fewer mistakes because they're more careful—they make fewer mistakes because they've implemented systems (usually automation) that eliminate human error entirely.
          </p>
          <p className="mb-4">
            Stop leaving money on the table. Fix these mistakes, and you'll immediately see thousands of additional dollars flowing back into your business—money you earned but weren't collecting.
          </p>

          <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl p-8 my-12">
            <h3 className="text-2xl font-bold mb-4">Eliminate These Mistakes Automatically</h3>
            <p className="mb-6">
              Our automated system prevents all 10 of these costly mistakes. Get a free audit showing exactly how much these mistakes are currently costing you.
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

export default CommonMistakes;