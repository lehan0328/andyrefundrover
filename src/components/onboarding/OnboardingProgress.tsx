import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

const defaultLabels = [
  "Welcome",
  "Connect Email",
  "Suppliers",
  "Amazon",
  "Billing",
  "Done"
];

export const OnboardingProgress = ({ 
  currentStep, 
  totalSteps = 6, 
  stepLabels = defaultLabels 
}: OnboardingProgressProps) => {
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full mb-8 px-2">
      {/* Desktop/Tablet View */}
      <div className="hidden sm:block relative">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 rounded-full -z-10" />
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out -z-10"
          style={{ width: `${progressPercentage}%` }}
        />

        <div className="flex justify-between items-start w-full">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            const label = stepLabels[index];

            return (
              <div key={index} className="flex flex-col items-center group relative">
                {/* Step Circle */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background transition-all duration-300 z-10",
                    isActive && "border-primary ring-4 ring-primary/10 scale-110",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 animate-in zoom-in" />
                  ) : (
                    <span className={cn("text-xs font-semibold", isActive && "text-primary")}>
                      {stepNumber}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "absolute top-10 text-xs font-medium whitespace-nowrap transition-colors duration-300",
                    isActive ? "text-foreground font-semibold" : "text-muted-foreground",
                    // Shift first/last labels to stay within bounds if needed, or stick to center
                    index === 0 ? "left-0 translate-x-0" : 
                    index === totalSteps - 1 ? "right-0 translate-x-0" : 
                    "left-1/2 -translate-x-1/2 text-center"
                  )}
                  style={index === 0 ? { alignItems: 'flex-start' } : index === totalSteps - 1 ? { alignItems: 'flex-end' } : {}}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile View (Compact) */}
      <div className="sm:hidden space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-primary">Step {currentStep} of {totalSteps}</span>
          <span className="text-muted-foreground">{stepLabels[currentStep - 1]}</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-in-out" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgress;