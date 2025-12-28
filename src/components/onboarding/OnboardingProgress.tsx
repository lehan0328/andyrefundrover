import { CheckCircle2, CreditCard, Mail, Shield, ShoppingCart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
}

const steps = [
  { id: 1, label: "Welcome", icon: Sparkles },
  { id: 2, label: "Connect Email", icon: Mail },
  { id: 3, label: "Suppliers", icon: Shield },
  { id: 4, label: "Connect Amazon", icon: ShoppingCart },
  { id: 5, label: "Billing", icon: CreditCard },
  { id: 6, label: "Done", icon: CheckCircle2 },
];

export const OnboardingProgress = ({ currentStep }: OnboardingProgressProps) => {
  return (
    <div className="w-full mb-8">
      {/* Desktop/Tablet Stepper */}
      <div className="hidden sm:flex justify-between items-center relative">
        {/* Connector Line Background */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
        
        {/* Active Connector Line */}
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-500 ease-in-out"
          style={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
          }} 
        />

        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isActive && "border-primary bg-primary text-primary-foreground scale-110 shadow-md",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "border-muted bg-background text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium absolute -bottom-6 transition-colors duration-300 w-32 text-center",
                  isActive && "text-primary font-bold",
                  isCompleted && "text-primary",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper (Simplified) */}
      <div className="sm:hidden flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Step {currentStep} of {steps.length}
          </span>
          <span className="font-bold text-lg text-primary">
            {steps[currentStep - 1].label}
          </span>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {(() => {
            const Icon = steps[currentStep - 1].icon;
            return <Icon className="w-6 h-6 text-primary" />;
          })()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgress;