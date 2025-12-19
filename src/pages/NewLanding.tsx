import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, Mail, Zap, FileText, CheckCircle, Shield, Sparkles, DollarSign, ChevronDown } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import logo from "@/assets/auren-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const NewLanding = () => {
  const { user, loading, isAdmin, isCustomer } = useAuth();

  if (loading && user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isCustomer) return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Auren Logo" className="w-8 h-8" />
              <span className="font-semibold text-lg tracking-tight">Auren</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-medium">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="font-medium bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_50%)]" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <Badge 
                variant="secondary" 
                className="mb-8 bg-primary/10 text-primary border-primary/20 font-medium px-4 py-2 text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                100% Hands-Free
              </Badge>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
                Fully Automated{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Amazon Reimbursements
                </span>
              </h1>

              {/* Subhead */}
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
                No more organizing shipments or uploading invoices.
                <br className="hidden sm:block" />
                Auren connects to your email, pulls invoices automatically, and files inbound reimbursement cases for you.
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto font-semibold px-10 py-6 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    Get $100 Credit Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>No upfront costs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Pay only after recovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-accent" />
                  <span>Gmail + Outlook supported</span>
                </div>
              </div>
            </div>

            {/* Process Flow - Your Only Job */}
            <div className="mt-20 max-w-5xl mx-auto w-full">
              <Card className="overflow-hidden border-border/50 shadow-xl bg-card">
                <div className="p-8 bg-muted/30">
                  <div className="text-center mb-8">
                    <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-primary/20">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Fully Automated Process
                    </Badge>
                    <h3 className="text-2xl font-bold mb-2">Zero Manual Work Required</h3>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Your only job:</span> Connect your email once. We handle everything else.
                    </p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
                    {/* Step 1 - USER ACTION */}
                    <div className="flex flex-col items-center text-center p-4 max-w-[180px] relative">
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                        Your only step
                      </div>
                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3 ring-4 ring-primary/30">
                        <Mail className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-sm font-semibold">Connect Email</div>
                      <div className="text-xs text-muted-foreground mt-1">One-click secure connection</div>
                    </div>
                    
                    <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
                    <ChevronDown className="w-6 h-6 text-muted-foreground md:hidden" />
                    
                    {/* Step 2 - AUTOMATED */}
                    <div className="flex flex-col items-center text-center p-4 max-w-[180px] opacity-80">
                      <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3 ring-2 ring-accent/20">
                        <Sparkles className="w-7 h-7 text-accent" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">AI Scans Emails</div>
                      <div className="text-xs text-muted-foreground mt-1">Finds & extracts invoices automatically</div>
                    </div>
                    
                    <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
                    <ChevronDown className="w-6 h-6 text-muted-foreground md:hidden" />
                    
                    {/* Step 3 - AUTOMATED */}
                    <div className="flex flex-col items-center text-center p-4 max-w-[180px] opacity-80">
                      <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-3 ring-2 ring-green-500/20">
                        <FileText className="w-7 h-7 text-green-500" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Auto-Filed to Claims</div>
                      <div className="text-xs text-muted-foreground mt-1">Matched & organized instantly</div>
                    </div>
                    
                    <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
                    <ChevronDown className="w-6 h-6 text-muted-foreground md:hidden" />
                    
                    {/* Step 4 - AUTOMATED */}
                    <div className="flex flex-col items-center text-center p-4 max-w-[180px] opacity-80">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 ring-2 ring-primary/20">
                        <DollarSign className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Get Reimbursed</div>
                      <div className="text-xs text-muted-foreground mt-1">We handle everything</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 inline mr-1 text-green-500" />
                      After connecting, your responsibility ends. We do the rest.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Auren" className="w-5 h-5" />
              <span>© 2024 Auren. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewLanding;
