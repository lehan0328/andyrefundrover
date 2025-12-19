import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Mail, Zap, FileText, CheckCircle, Shield } from "lucide-react";
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

            {/* Visual feature highlights */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
              <FeatureCard
                icon={<Mail className="h-6 w-6 text-primary" />}
                title="Email Connected"
                description="We scan your inbox for supplier invoices automatically"
              />
              <FeatureCard
                icon={<FileText className="h-6 w-6 text-accent" />}
                title="AI-Powered Matching"
                description="Invoices matched to shipments and claims instantly"
              />
              <FeatureCard
                icon={<Zap className="h-6 w-6 text-green-500" />}
                title="Cases Filed for You"
                description="Reimbursement cases opened without lifting a finger"
              />
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

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default NewLanding;
