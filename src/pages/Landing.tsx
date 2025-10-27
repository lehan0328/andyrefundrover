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
      title: "As Low As 10% Fee",
      description: "Fees as low as 15%, or just 10% with Auren membership. Pay only on what we recover. No recovery, no fee."
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
      text: "Best investment I've made for my business. The low fee is more than worth it when I'm getting back money I didn't even know I was owed. Plus, I'm saving even more with my Auren membership discount!"
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
      answer: "Fees as low as 15% of what we successfully recover (10% for Auren members with Growing, Professional, or Enterprise plans). If we don't recover anything, you pay nothing. Your first audit is completely free."
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
      <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <img src="/src/assets/logo.png" alt="Logo" className="h-6 w-6" />
              </div>
              <span className="font-semibold text-lg tracking-tight">Auren Reimbursement</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
              </Link>
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all">
                Start Free Audit
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 max-w-xl">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                  <Zap className="w-3 h-3 mr-1" /> Fully Automated
                </Badge>
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-medium animate-pulse">
                  💰 Auren Members: 10% Fee
                </Badge>
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                  <span className="block text-foreground">Amazon FBA</span>
                  <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Reimbursements
                  </span>
                  <span className="block text-foreground">On Autopilot</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Upload invoices. We handle everything else. Recover thousands with AI-powered automation. Fees as low as 15% on what we recover.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all font-semibold group">
                  Start Free Audit
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="font-semibold border-2">
                  See How It Works
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-8 pt-6 border-t border-border/50">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">$10M+</div>
                  <div className="text-sm text-muted-foreground mt-1">Recovered</div>
                </div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">98.5%</div>
                  <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">500+</div>
                  <div className="text-sm text-muted-foreground mt-1">Sellers</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl opacity-50" />
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-card/50 backdrop-blur">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop" 
                  alt="Dashboard Preview" 
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Badge with Special Offer */}
      <section className="py-16 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-y border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 bg-card/80 backdrop-blur-xl px-6 py-4 rounded-2xl border border-border/50 shadow-xl">
              <span className="text-3xl">🎉</span>
              <div className="text-left">
                <div className="font-bold text-lg">Auren Members Save 5%!</div>
                <div className="text-sm text-muted-foreground">As low as 10% fee with Growing, Professional, or Enterprise plans</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <a href="https://aurenapp.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors font-semibold">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <img src="/src/assets/logo.png" alt="Auren" className="h-4 w-4" />
                </div>
                <span>Auren</span>
              </a>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span>Bank-grade security</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>SOC 2 compliant</span>
          </div>
        </div>
      </section>

      {/* What We Cover */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              What Reimbursement Cases Do We Cover?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Comprehensive coverage to ensure you're getting back what's owed to you
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reimbursementCases.map((category, idx) => (
              <Card key={idx} className="p-6 border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur group">
                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{category.title}</h3>
                <ul className="space-y-3">
                  {category.cases.map((case_item, caseIdx) => (
                    <li key={caseIdx} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm leading-relaxed">{case_item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 font-medium">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Fully Automated.<br />Fully Done-For-You.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Upload invoices. That's it. We handle everything else.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="p-6 text-center border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur group">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Four simple steps to start recovering your lost revenue
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
            
            {howItWorks.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="relative bg-card border border-border/50 rounded-2xl p-6 text-center hover:shadow-xl hover:border-primary/50 transition-all duration-300 backdrop-blur">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground shadow-lg relative z-10">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent border-accent/20 font-medium">
              Simple Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Only Pay When You Get Paid
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              No upfront costs. No monthly fees. Just results.
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <Card className="p-8 relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-bl-full" />
              <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent border-accent/20 font-medium">Free Forever</Badge>
              <h3 className="text-2xl font-bold mb-2">Free Audit</h3>
              <p className="text-muted-foreground mb-6">
                See exactly how much you're owed before committing
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Complete account analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Identify all missed reimbursements</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">No credit card required</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm">Detailed recovery report</span>
                </li>
              </ul>
              <Button className="w-full font-semibold" variant="outline">Get Your Free Audit</Button>
            </Card>

            <Card className="p-8 relative overflow-hidden border-2 border-primary shadow-2xl bg-card/50 backdrop-blur">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-2 text-sm font-semibold rounded-bl-2xl shadow-lg">
                Most Popular
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full" />
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 font-medium">Success-Based</Badge>
              <h3 className="text-2xl font-bold mb-2">As Low As 15%</h3>
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-accent mb-1">🎉 Auren Member Discount</p>
                <p className="text-xs text-muted-foreground">
                  As low as <span className="font-bold text-primary">10% fee</span> with Growing, Professional, or Enterprise membership
                </p>
              </div>
              <p className="text-muted-foreground mb-6">
                Pay only when we successfully recover your money
              </p>
              <div className="space-y-2 mb-6">
                <div className="text-4xl font-bold">
                  15%
                  <span className="text-lg text-muted-foreground font-normal"> of recovered amount*</span>
                </div>
                <div className="text-2xl font-bold text-accent">
                  10%
                  <span className="text-sm text-muted-foreground font-normal"> for Auren members</span>
                </div>
                <p className="text-xs text-muted-foreground italic">*Fees as low as 15%, rates may vary</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Fully automated claim submission</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">24/7 monitoring & follow-ups</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Secure document storage</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Real-time dashboard access</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all font-semibold">
                Start Recovering Now
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Trusted by Amazon Sellers
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              See what our customers have to say about their experience
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="p-6 border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                    {testimonial.name.charAt(0)}
                  </div>
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
      <section id="blog" className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Latest Insights</h2>
              <p className="text-muted-foreground text-lg">Stay updated with tips and strategies for Amazon sellers</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-sm font-medium">
                <span className="text-lg">💡</span>
                <span>Auren members save 5% on all reimbursements</span>
              </div>
            </div>
            <Button variant="outline" className="font-semibold border-2">
              View All Posts <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {blogPosts.map((post, idx) => (
              <Link key={idx} to={`/blog/${post.slug}`}>
                <Card className="overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer h-full bg-card/50 backdrop-blur group">
                  <div className="relative overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-primary/20 font-medium">{post.category}</Badge>
                    <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{post.excerpt}</p>
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
      <section id="faq" className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Everything you need to know about our service
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="p-6 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur">
                <h3 className="text-lg font-bold mb-3">{faq.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Ready to Start Recovering Your Money?
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join 500+ sellers already getting back what they're owed. Start with a free audit. Auren members save 5% (fees as low as 10%).
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-2xl font-semibold text-lg px-8 py-6 group">
              Get Your Free Audit
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-semibold text-lg px-8 py-6">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <img src="/src/assets/logo.png" alt="Logo" className="h-6 w-6" />
                </div>
                <span className="font-semibold text-lg">Auren Reimbursement</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fully automated Amazon FBA reimbursement service powered by Auren.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#blog" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="https://aurenapp.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">About Auren</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Auren Reimbursement Services. All rights reserved. Powered by{' '}
              <a href="https://aurenapp.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                Auren
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;