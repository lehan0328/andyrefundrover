import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  FileText, 
  Zap,
  ArrowRight,
  Star,
  Clock,
  Sparkles,
  Shield,
  TrendingUp,
  Mail,
  Upload,
  Bot,
  DollarSign,
  ChevronRight
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import logo from "@/assets/auren-logo.png";
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

  const stats = [
    { label: "Processing Time", value: "Hours → 2 min", icon: Clock },
    { label: "Accuracy Rate", value: "99.9%", icon: TrendingUp },
    { label: "Documents Processed", value: "1M+", icon: FileText },
  ];

  const features = [
    {
      icon: Mail,
      title: "Gmail Integration",
      description: "Connect your Gmail and we automatically extract invoices from your emails. No manual downloads needed."
    },
    {
      icon: Bot,
      title: "AI-Powered Extraction",
      description: "Our AI reads every PDF, extracts line items, dates, amounts, and matches them to your shipments instantly."
    },
    {
      icon: Zap,
      title: "Instant Filing",
      description: "Documents are automatically organized and filed to the correct claims. Zero manual work required."
    },
    {
      icon: DollarSign,
      title: "Maximize Recovery",
      description: "With proper documentation always attached, your reimbursement claims have the highest success rate."
    }
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Connect Gmail",
      description: "Link your Gmail account with one click. We only read invoice attachments."
    },
    {
      step: "02",
      title: "AI Scans & Extracts",
      description: "Our AI automatically detects invoices, extracts data, and understands the content."
    },
    {
      step: "03",
      title: "Auto-Match & File",
      description: "Invoices are matched to shipments and filed to claims automatically."
    },
    {
      step: "04",
      title: "Claims Submitted",
      description: "Complete claims with proper documentation are submitted for maximum recovery."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "FBA Seller, $2M Revenue",
      rating: 5,
      text: "I used to spend 10+ hours a week manually uploading invoices. Now it's completely automated. Game changer."
    },
    {
      name: "Michael Chen",
      role: "Amazon Merchant",
      rating: 5,
      text: "The Gmail integration is brilliant. Invoices from my suppliers are automatically extracted and filed. I literally do nothing."
    },
    {
      name: "Emily Rodriguez",
      role: "Multi-Channel Seller",
      rating: 5,
      text: "Finally, a solution that understands the invoice filing nightmare. My claim success rate went from 60% to 95%."
    }
  ];

  const painPoints = [
    "Manually downloading invoices from emails",
    "Uploading PDFs one by one to each claim",
    "Missing deadlines because documents weren't attached",
    "Claims denied due to missing documentation",
    "Hours spent organizing invoice files"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Auren Reimbursements Logo" className="w-8 h-8" />
              <span className="font-semibold text-lg tracking-tight">Auren Reimbursements</span>
            </Link>
            <div className="hidden md:flex items-center gap-8 ml-auto mr-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="font-medium bg-primary hover:bg-primary/90">
                  Free Audit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-20 md:pt-10 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        {/* Floating stat cards */}
        <div className="absolute left-8 top-32 hidden lg:block animate-pulse">
          <Card className="px-4 py-3 shadow-lg border-border/50 bg-card/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Processing Time</div>
                <div className="font-semibold text-primary">Hours → 2 min</div>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="absolute right-8 top-48 hidden lg:block animate-pulse" style={{ animationDelay: '1s' }}>
          <Card className="px-4 py-3 shadow-lg border-border/50 bg-card/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Claim Success Rate</div>
                <div className="font-semibold text-accent">60% → 95%</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Extraction
              </Badge>
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 font-medium px-4 py-1.5">
                <Mail className="w-3.5 h-3.5 mr-1.5" /> Gmail Integration
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Your Reimbursements,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Fully Automated
              </span>
              {" "}— No More Manual Uploads
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              Stop manually uploading invoices to each claim. Connect your Gmail and our AI automatically extracts, matches, and files every invoice.
            </p>

            <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8">
              Never miss a reimbursement deadline due to missing documentation again.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto font-semibold px-8 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                  Free Audit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium px-8">
                View Demo
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Pay Only After Recovery</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>No Upfront Costs</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl opacity-30" />
              <Card className="relative overflow-hidden border-border/50 shadow-2xl bg-card">
                <div className="p-4 border-b border-border/50 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="p-8 bg-muted/30">
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-card border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Emails Scanned</div>
                          <div className="text-2xl font-bold">1,247</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Last 30 days</div>
                    </Card>
                    <Card className="p-6 bg-card border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Invoices Extracted</div>
                          <div className="text-2xl font-bold">892</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">Auto-filed to claims</div>
                    </Card>
                    <Card className="p-6 bg-card border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Recovered</div>
                          <div className="text-2xl font-bold text-green-500">$42,580</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">This month</div>
                    </Card>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Sound Familiar?
              </h2>
              <p className="text-lg text-muted-foreground">
                The invoice filing nightmare that every Amazon seller knows too well
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {painPoints.map((point, idx) => (
                <Card key={idx} className="p-4 border-destructive/20 bg-destructive/5 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                    <span className="text-destructive text-sm">✕</span>
                  </div>
                  <span className="text-sm">{point}</span>
                </Card>
              ))}
            </div>
            <div className="text-center mt-12">
              <p className="text-xl font-semibold text-foreground mb-2">There's a better way.</p>
              <p className="text-muted-foreground">Let AI handle the boring stuff.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              Signature Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fully Automated Invoice Processing
            </h2>
            <p className="text-lg text-muted-foreground">
              Connect once, never think about invoice filing again
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="p-6 border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 bg-accent/10 text-accent border-accent/20">
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Set Up Once, Run Forever
            </h2>
            <p className="text-lg text-muted-foreground">
              Four simple steps to never manually file an invoice again
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{step.step}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
                {idx < howItWorks.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-8 -right-4 w-8 h-8 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Amazon Sellers
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands who've eliminated the invoice filing nightmare
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="p-6 border-border/50 hover:shadow-lg transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Automate Your Invoice Filing?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start your free trial today. No credit card required.
            </p>
            <Link to="/auth">
              <Button size="lg" className="font-semibold px-8 bg-primary hover:bg-primary/90 shadow-lg">
                Free Audit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Auren Reimbursements" className="w-8 h-8" />
              <span className="font-semibold">Auren Reimbursements</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Auren Reimbursements. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
