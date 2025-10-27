import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const HiddenCostAmazonFBA = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
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

      {/* Article Header */}
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Reimbursements</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            The Hidden Cost of Amazon FBA: Why Most Sellers Leave Money on the Table
          </h1>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>March 15, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>8 min read</span>
            </div>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop" 
            alt="Amazon FBA warehouse operations showing inventory management and fulfillment processes"
            className="w-full h-[400px] object-cover rounded-xl shadow-lg mb-8"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-muted-foreground leading-relaxed mb-6">
            Amazon FBA sellers are losing an average of $3,200 annually in unreimbursed claims, according to recent industry data. Yet, 73% of sellers never file a single reimbursement claim. Here's what you need to know about recovering your lost revenue.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Shocking Reality of FBA Losses</h2>
          <p className="mb-4">
            Every day, thousands of Amazon FBA sellers unknowingly lose money due to inventory discrepancies, damaged goods, and lost shipments. While Amazon's fulfillment network is incredibly efficient, it's not perfect. Items get lost, damaged, or miscounted—and when they do, you're entitled to reimbursement.
          </p>
          <p className="mb-4">
            The problem? Most sellers don't have the time, resources, or knowledge to identify these discrepancies and file claims. Amazon doesn't automatically reimburse you for every loss. You need to actively monitor your inventory and submit claims when issues occur.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Common Types of FBA Reimbursements Most Sellers Miss</h2>
          
          <h3 className="text-2xl font-semibold mt-8 mb-3">1. Receiving Discrepancies</h3>
          <p className="mb-4">
            When you ship inventory to Amazon's fulfillment centers, they're supposed to receive and count every item. However, discrepancies occur more often than you'd think. Items get miscounted, lost during the receiving process, or damaged by carriers before Amazon even checks them in.
          </p>
          <p className="mb-4">
            <strong>Average recovery per claim:</strong> $450-$2,300 depending on product value and quantity.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">2. Lost Warehouse Inventory</h3>
          <p className="mb-4">
            Once your inventory is in Amazon's warehouse, it should be safe, right? Unfortunately, items can be lost, misplaced, or stolen within Amazon's fulfillment centers. These losses often go unnoticed unless you're actively reconciling your inventory reports.
          </p>
          <p className="mb-4">
            <strong>Recovery rate:</strong> 95% success rate with proper documentation and timely filing.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">3. Customer Return Issues</h3>
          <p className="mb-4">
            Customer returns are a goldmine for reimbursements that sellers overlook. Common scenarios include: customers getting refunded without returning the item (after 45 days), customers returning the wrong item, or customers receiving a refund for more than they paid.
          </p>

          <h3 className="text-2xl font-semibold mt-8 mb-3">4. Damaged Inventory</h3>
          <p className="mb-4">
            Amazon's warehouse operations involve heavy machinery and constant movement. Your products can get damaged during storage, picking, packing, or shipping. While some damage is visible and results in automatic reimbursement, many cases slip through the cracks.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">Why Manual Reimbursement Recovery Doesn't Work</h2>
          <p className="mb-4">
            Many sellers attempt to manually track and file reimbursement claims. Here's why this approach fails:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Time-intensive:</strong> Reviewing thousands of transactions monthly takes 15-20 hours minimum</li>
            <li><strong>Complex reports:</strong> Amazon's reports are scattered across multiple dashboards with inconsistent data</li>
            <li><strong>Tight deadlines:</strong> Many claims must be filed within 60-90 days, and tracking these windows manually is nearly impossible</li>
            <li><strong>Technical knowledge required:</strong> Understanding Amazon's reimbursement policies requires expertise most sellers don't have</li>
            <li><strong>High error rate:</strong> Manual processes miss 40-60% of eligible claims according to industry studies</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Cost of Doing Nothing</h2>
          <p className="mb-4">
            Let's break down what inaction costs the average FBA seller:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Small sellers (under $50K/month): Losing $200-$800 monthly in unreimbursed claims</li>
            <li>Medium sellers ($50K-$250K/month): Losing $800-$3,500 monthly</li>
            <li>Large sellers (over $250K/month): Losing $3,500-$15,000+ monthly</li>
          </ul>
          <p className="mb-4">
            Over a year, these losses compound significantly. A seller doing $100K/month could be leaving $24,000 on the table annually—money that's rightfully theirs.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-4">How Automation Changes the Game</h2>
          <p className="mb-4">
            Modern reimbursement services use AI and automation to continuously monitor your account for discrepancies. Here's how the automated approach works:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Continuous monitoring:</strong> Software scans your account 24/7 for reimbursable cases</li>
            <li><strong>Automatic detection:</strong> AI identifies discrepancies across all claim types instantly</li>
            <li><strong>Document matching:</strong> Your uploaded invoices are automatically matched to claims for proof</li>
            <li><strong>Claim submission:</strong> Cases are filed automatically with proper documentation</li>
            <li><strong>Follow-up management:</strong> Automated systems track claim status and follow up until resolution</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">Real Results from Automated Recovery</h2>
          <p className="mb-4">
            Sellers who switch to automated reimbursement recovery typically see:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>98.5% success rate on filed claims (vs. 65-75% manual filing success rate)</li>
            <li>3-4x more claims identified and filed compared to manual processes</li>
            <li>Claims filed within optimal windows for maximum approval rates</li>
            <li>Average recovery of $3,200-$8,500 in the first 90 days alone</li>
            <li>Zero time investment from the seller after initial setup</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Document Storage Advantage</h2>
          <p className="mb-4">
            One critical component of successful reimbursement claims is documentation. Amazon often requires proof of purchase, supplier invoices, and shipment records to approve claims. Without these documents readily available, your claims get denied.
          </p>
          <p className="mb-4">
            Modern automated systems include secure document storage that:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Stores all your invoices in one centralized location</li>
            <li>Automatically matches invoices to specific claims</li>
            <li>Provides instant access to documentation when Amazon requests it</li>
            <li>Keeps records organized for tax purposes and audits</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">What to Look for in a Reimbursement Service</h2>
          <p className="mb-4">
            Not all reimbursement services are created equal. Here's what separates the best from the rest:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Success-based pricing:</strong> Pay only when you get reimbursed (15-25% is standard)</li>
            <li><strong>No upfront costs:</strong> Free audits and no monthly fees mean zero risk</li>
            <li><strong>Full automation:</strong> You should only need to upload invoices—nothing else</li>
            <li><strong>Comprehensive coverage:</strong> All claim types should be monitored, not just easy ones</li>
            <li><strong>Transparent reporting:</strong> Real-time dashboard showing claims in progress and recovered amounts</li>
            <li><strong>High success rate:</strong> Look for services with 95%+ approval rates on filed claims</li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-4">Taking Action: Your Next Steps</h2>
          <p className="mb-4">
            If you're leaving reimbursements on the table, here's what you should do immediately:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Get a free audit:</strong> Find out exactly how much you're owed with a no-obligation analysis</li>
            <li><strong>Organize your invoices:</strong> Gather supplier invoices and proof of purchase documents</li>
            <li><strong>Choose an automated solution:</strong> Select a service with success-based pricing and full automation</li>
            <li><strong>Upload and forget:</strong> Once set up, let automation handle everything while you focus on growing your business</li>
          </ol>

          <h2 className="text-3xl font-bold mt-12 mb-4">The Bottom Line</h2>
          <p className="mb-4">
            Amazon FBA reimbursements aren't a "nice to have"—they're money you've already earned that Amazon owes you. With automation handling the heavy lifting, there's no reason to leave thousands of dollars unclaimed.
          </p>
          <p className="mb-4">
            The best time to start recovering your lost revenue was yesterday. The second best time is today.
          </p>

          <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl p-8 my-12">
            <h3 className="text-2xl font-bold mb-4">Ready to Stop Leaving Money on the Table?</h3>
            <p className="mb-6">
              Get a free audit and discover exactly how much Amazon owes you. No credit card required.
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

export default HiddenCostAmazonFBA;