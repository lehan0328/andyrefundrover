import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Upload, 
  Bot, 
  DollarSign, 
  Shield, 
  Zap,
  ArrowRight,
  Star,
  FileText,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const reimbursementCases = [
    {
      title: "Inbound Shipments",
      cases: ["Canceled Shipments", "Receiving discrepancy", "Inbound shipment damaged by carrier"]
    },
    {
      title: "Lost Items",
      cases: ["Lost in Transit", "Lost in the warehouse", "Unfair reimbursement"]
    },
    {
      title: "Damaged Items",
      cases: ["Damaged item in the warehouse", "Disposed by Amazon", "Unfair reimbursement"]
    },
    {
      title: "Customer Returns",
      cases: ["Refunded orders (not returned within 60 days)", "Customer refunded more than paid", "Wrong item returned", "Chargeback not refunded"]
    },
    {
      title: "Overages & Discrepancies",
      cases: ["Removal Orders", "Incorrect weights and dimensions", "Overcharged orders"]
    }
  ];

  const features = [
    {
      icon: Upload,
      title: "Upload & Forget",
      description: "Simply upload your invoices to our secure document storage. That's all you need to do."
    },
    {
      icon: Bot,
      title: "Fully Automated",
      description: "Our AI-powered system handles everything - from detection to claim submission and follow-ups."
    },
    {
      icon: DollarSign,
      title: "15% Fee (10% for Auren Members)",
      description: "Pay only 15% of what we recover, or just 10% with Auren membership. No recovery, no fee."
    },
    {
      icon: Shield,
      title: "Free Audit",
      description: "Start with a completely free audit to see how much you're owed. No credit card required."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Connect Your Store",
      description: "Securely link your Amazon seller account in minutes with read-only access."
    },
    {
      step: "2",
      title: "Upload Documents",
      description: "Store your invoices in our secure document storage system - that's the only thing you need to do."
    },
    {
      step: "3",
      title: "We Handle Everything",
      description: "Our AI scans for discrepancies, submits claims, follows up, and gets your money back automatically."
    },
    {
      step: "4",
      title: "Get Paid",
      description: "Watch your reimbursements roll in. We only charge 15% of what we successfully recover."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "FBA Seller",
      rating: 5,
      text: "I recovered over $12,000 in the first month alone. The automated system is incredible - I literally just uploaded my invoices and they handled everything else."
    },
    {
      name: "Michael Chen",
      role: "Amazon Merchant",
      rating: 5,
      text: "The partnership with Auren makes this a no-brainer. Between cash flow forecasting and automated reimbursements, I've saved countless hours and thousands of dollars."
    },
    {
      name: "Emily Rodriguez",
      role: "Multi-Channel Seller",
      rating: 5,
      text: "Best investment I've made for my business. The 15% fee is more than worth it when I'm getting back money I didn't even know I was owed. Plus, I'm saving even more with my Auren membership discount!"
    }
  ];

  const blogPosts = [
    {
      title: "The Hidden Cost of Amazon FBA: Why Most Sellers Leave Money on the Table",
      excerpt: "Discover how Amazon sellers are losing thousands in unreimbursed claims and how automation is changing the game.",
      date: "2024-03-15",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop",
      category: "Reimbursements",
      slug: "hidden-cost-amazon-fba"
    },
    {
      title: "Document Management for Amazon Sellers: Best Practices",
      excerpt: "Learn how proper invoice management can streamline your reimbursement process and maximize recovery rates.",
      date: "2024-03-10",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop",
      category: "Best Practices",
      slug: "document-management"
    },
    {
      title: "5 Types of Amazon Reimbursements You're Probably Missing",
      excerpt: "From lost inventory to weight discrepancies, here are the most commonly overlooked reimbursement opportunities.",
      date: "2024-03-05",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop",
      category: "Education",
      slug: "five-reimbursement-types"
    },
    {
      title: "Complete Automation Guide: Recover FBA Reimbursements Without Lifting a Finger",
      excerpt: "Stop wasting 20+ hours monthly. This guide shows how automation recovers 3-4x more money with zero effort.",
      date: "2024-02-28",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop",
      category: "Strategy",
      slug: "automation-guide"
    },
    {
      title: "How to Maximize Amazon FBA Reimbursements: Proven Strategies",
      excerpt: "Top FBA sellers recover 40-60% more in reimbursements. Learn the exact strategies they use for maximum success.",
      date: "2024-02-20",
      image: "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop",
      category: "Strategy",
      slug: "maximize-recovery"
    },
    {
      title: "10 Costly Mistakes Amazon Sellers Make With FBA Reimbursements",
      excerpt: "Even experienced sellers make critical mistakes that cost thousands annually. Here's how to avoid them.",
      date: "2024-02-15",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop",
      category: "Education",
      slug: "common-mistakes"
    }
  ];

  const faqs = [
    {
      question: "How much does it cost?",
      answer: "We charge only 15% of what we successfully recover. If we don't recover anything, you pay nothing. Plus, your first audit is completely free. Auren members (Growing, Professional, or Enterprise plans) get 5% off - paying only 10% instead of 15%."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-grade security, read-only access to your Amazon account, and are SOC 2 compliant. Your invoices are stored in encrypted document storage."
    },
    {
      question: "How long does it take to see results?",
      answer: "Most sellers see their first reimbursements within 2-4 weeks. Our automated system works 24/7 to process claims and follow up with Amazon."
    },
    {
      question: "What's the partnership with Auren?",
      answer: "We've partnered with Auren to offer the most comprehensive financial solution for Amazon sellers. Combine automated reimbursements with intelligent cash flow forecasting for complete financial visibility. Plus, all Auren members with Growing, Professional, or Enterprise plans receive an exclusive 5% discount on reimbursement fees (10% instead of 15%)."
    },
    {
      question: "Do I need to do anything after uploading invoices?",
      answer: "No! That's the beauty of our fully automated system. Once you upload your invoices, our AI handles everything - detection, claim submission, follow-ups, and recovery."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/src/assets/logo.png" alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl">Auren Reimbursement</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
            <a href="#blog" className="text-sm font-medium hover:text-primary transition-colors">Blog</a>
            <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Button size="sm" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90">
              Start Free Audit
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
        <div className="container mx-auto px-4 py-24 md:py-32 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-accent/20 text-accent-foreground border-accent/30">
                  <Zap className="w-3 h-3 mr-1" /> Fully Automated Reimbursements
                </Badge>
                <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">
                  🎉 Auren Members: Only 10% Fee (Save 5%)
                </Badge>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Amazon Reimbursements
                <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Upload your invoices, we handle the rest. Recover thousands in lost FBA reimbursements with our fully automated AI-powered service. Only 15% fee on what we recover.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg">
                  Start Your Free Audit <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline">
                  See How It Works
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-primary">$10M+</div>
                  <div className="text-sm text-muted-foreground">Recovered</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-3xl font-bold text-primary">98.5%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Sellers Trust Us</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl" />
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop" 
                alt="Dashboard Preview" 
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Badge with Special Offer */}
      <section className="py-12 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-y border-primary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 bg-background/80 backdrop-blur px-6 py-3 rounded-full border border-primary/30 shadow-lg">
              <span className="text-2xl">🎉</span>
              <div className="text-left">
                <div className="font-bold text-lg">Auren Members Save 5%!</div>
                <div className="text-sm text-muted-foreground">Only 10% fee with Growing, Professional, or Enterprise plans</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Powered by</span>
            <a href="https://aurenapp.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <img src="/src/assets/logo.png" alt="Auren" className="h-6 w-6" />
              <span className="font-semibold">Auren</span>
            </a>
            <span>•</span>
            <span>Bank-grade security • Read-only access • SOC 2 compliant</span>
          </div>
        </div>
      </section>

      {/* What We Cover */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              What Reimbursement Cases Do We Cover?
            </h2>
            <p className="text-xl text-muted-foreground">
              Here's what we cover to make sure you're getting back what's owed to you
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reimbursementCases.map((category, idx) => (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-4 text-primary">{category.title}</h3>
                <ul className="space-y-3">
                  {category.cases.map((case_item, caseIdx) => (
                    <li key={caseIdx} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm">{case_item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Why Choose Us
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Fully Automated. Fully Done-For-You.
            </h2>
            <p className="text-xl text-muted-foreground">
              The only thing you do is upload invoices. We handle everything else.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Four simple steps to start recovering your lost revenue
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            {howItWorks.map((step, idx) => (
              <div key={idx} className="relative">
                {idx < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary to-secondary" />
                )}
                <div className="relative bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              Simple Pricing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Only Pay When You Get Paid
            </h2>
            <p className="text-xl text-muted-foreground">
              No upfront costs. No monthly fees. Just results.
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-bl-full" />
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Free Forever</Badge>
              <h3 className="text-2xl font-bold mb-2">Free Audit</h3>
              <p className="text-muted-foreground mb-6">
                See exactly how much you're owed before committing to anything
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Complete account analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Identify all missed reimbursements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">No credit card required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Detailed recovery report</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline">Get Your Free Audit</Button>
            </Card>

            <Card className="p-8 relative overflow-hidden border-2 border-primary shadow-xl">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-1 text-sm font-semibold">
                Most Popular
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Success-Based</Badge>
              <h3 className="text-2xl font-bold mb-2">15% Commission</h3>
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-accent mb-1">🎉 Auren Member Discount</p>
                <p className="text-xs text-muted-foreground">
                  Only <span className="font-bold text-primary">10% fee</span> with Growing, Professional, or Enterprise membership
                </p>
              </div>
              <p className="text-muted-foreground mb-6">
                Pay only when we successfully recover your money
              </p>
              <div className="text-4xl font-bold mb-2">
                15%
                <span className="text-lg text-muted-foreground font-normal"> of recovered amount</span>
              </div>
              <div className="text-2xl font-bold text-accent mb-6">
                10%
                <span className="text-sm text-muted-foreground font-normal"> for Auren members</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Fully automated claim submission</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">24/7 monitoring & follow-ups</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Secure document storage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Real-time dashboard access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90">
                Start Recovering Now
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Trusted by Amazon Sellers
            </h2>
            <p className="text-xl text-muted-foreground">
              See what our customers have to say about their experience
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Latest Insights</h2>
            <p className="text-muted-foreground">Stay updated with tips and strategies for Amazon sellers</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-sm">
              <span className="text-lg">💡</span>
              <span className="font-semibold">Auren members save 5% on all reimbursements</span>
            </div>
          </div>
            <Button variant="outline">View All Posts <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, idx) => (
              <Link key={idx} to={`/blog/${post.slug}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">{post.category}</Badge>
                    <h3 className="text-lg font-bold mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about our service
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-secondary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Ready to Start Recovering Your Money?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join 500+ sellers who are already getting back what they're owed. Start with a free audit today. Auren members get 5% off (only 10% fee instead of 15%).
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-xl">
              Get Your Free Audit <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/src/assets/logo.png" alt="Logo" className="h-8 w-8" />
                <span className="font-bold">Auren Reimbursement</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Fully automated Amazon FBA reimbursement service powered by Auren.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a></li>
                <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#blog" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://aurenapp.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">About Auren</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2024 Auren Reimbursement Services. All rights reserved. Powered by <a href="https://aurenapp.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Auren</a>.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;