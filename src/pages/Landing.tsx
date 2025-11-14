import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Bot, 
  DollarSign, 
  Zap,
  ArrowRight,
  Star
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Landing = () => {
  const { user, loading, isAdmin, isCustomer } = useAuth();

  if (loading) {
    if (user) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
  }

  if (user) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (isCustomer) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const features = [
    {
      icon: Bot,
      title: "AI finds every claim",
      description: "Automatically detects lost, damaged, and overcharged inventory across all your shipments."
    },
    {
      icon: Zap,
      title: "Files & follows up",
      description: "Submits claims to Amazon and handles all communication until you're reimbursed."
    },
    {
      icon: DollarSign,
      title: "You get paid",
      description: "Track recoveries in real-time. Pay only 15% of what we recover. Zero upfront cost."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Connect",
      description: "Link your Amazon Seller Central account with secure, read-only access."
    },
    {
      step: "2",
      title: "Discover",
      description: "AI scans your shipments and identifies all eligible reimbursement cases."
    },
    {
      step: "3",
      title: "Recover",
      description: "We file claims, manage follow-ups, and get your money back on autopilot."
    }
  ];

  const testimonials = [
    {
      name: "Marcus Rivera",
      role: "7-figure FBA Seller",
      revenue: "$23,400 recovered",
      text: "I had no idea I was owed this much. The platform found claims going back 18 months that I would've never caught manually. Completely hands-off."
    },
    {
      name: "Jennifer Park",
      role: "Multi-channel Seller",
      revenue: "$8,900 recovered",
      text: "Setup took 5 minutes. Two weeks later, I had $8,900 in reimbursements I didn't even know existed. This pays for itself instantly."
    },
    {
      name: "David Thompson",
      role: "Amazon Brand Owner",
      revenue: "$41,200 recovered",
      text: "We were losing money to inventory discrepancies every month. Now it's automated. The ROI is massive—easily 20x what we pay in fees."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Auren Logo" className="h-8" />
              <span className="text-xl font-bold">Auren</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">AI-Powered FBA Reimbursements</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                Recover every dollar
                <br />
                Amazon owes you
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                AI finds and files all your FBA claims automatically. Stop leaving money on the table—recover lost, damaged, and overcharged inventory without lifting a finger.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/auth">
                  <Button size="lg" className="text-base font-semibold px-8 h-12 bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all">
                    Start Free Audit
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>No credit card required</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-12 border-t border-border/30 max-w-3xl mx-auto">
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">$2.5M+</div>
                  <div className="text-sm text-muted-foreground mt-1">Recovered</div>
                </div>
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">100%</div>
                  <div className="text-sm text-muted-foreground mt-1">Automated</div>
                </div>
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">15%</div>
                  <div className="text-sm text-muted-foreground mt-1">Success Fee</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Prop */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-2xl md:text-3xl font-medium leading-relaxed text-foreground/90">
              We recover an average of <span className="font-bold text-primary">$18,000</span> per seller in the first 90 days—money you've already earned but never received.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20 bg-muted/20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Three steps to more money
              </h2>
              <p className="text-muted-foreground text-lg">
                Start recovering in minutes
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              {howItWorks.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex flex-col space-y-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border border-primary/20">
                      {step.step}
                    </div>
                    <h3 className="text-2xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">{step.description}</p>
                  </div>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-20 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Real sellers. Real results.
              </h2>
              <p className="text-muted-foreground text-lg">
                Join hundreds of FBA sellers recovering money on autopilot
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-8 border-border/50 hover:border-primary/30 transition-colors bg-card">
                  <div className="space-y-4">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground/90 leading-relaxed">"{testimonial.text}"</p>
                    <div className="pt-4 border-t border-border/50">
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      <div className="text-sm font-semibold text-primary mt-1">{testimonial.revenue}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Simple, performance-based pricing
              </h2>
              <p className="text-muted-foreground text-xl">
                Only pay when you get paid
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="p-8 border-border/50">
                <div className="space-y-6">
                  <div>
                    <div className="text-lg font-semibold text-muted-foreground mb-2">Standard</div>
                    <div className="text-5xl font-bold mb-2">20%</div>
                    <div className="text-muted-foreground">per successful recovery</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">No upfront cost</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">No monthly subscription</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Full automation</span>
                    </li>
                  </ul>
                </div>
              </Card>
              <Card className="p-8 border-primary/50 bg-primary/5 relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Best Value</Badge>
                <div className="space-y-6">
                  <div>
                    <div className="text-lg font-semibold text-muted-foreground mb-2">With Auren Membership</div>
                    <div className="text-5xl font-bold mb-2 text-primary">15%</div>
                    <div className="text-muted-foreground">per successful recovery</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Lowest rate available</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Priority support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Advanced analytics</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <Card className="p-12 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold">
                  Stop losing money to Amazon
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Get a free audit and see exactly how much Amazon owes you. No credit card. No commitment. Just results.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link to="/auth">
                    <Button size="lg" className="text-base font-semibold px-8 h-12 bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all">
                      Start Free Audit
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  Join 500+ sellers recovering an average of $18,000 each
                </p>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Auren Logo" className="h-6" />
              <span className="font-semibold">Auren</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Auren. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
