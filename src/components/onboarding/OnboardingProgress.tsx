import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
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
  return (
    <div className="w-full mb-10 px-4">
      {/* Desktop/Tablet View */}
      <div className="hidden sm:flex items-center justify-between w-full">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const label = stepLabels[index];

          return (
            <React.Fragment key={index}>
              {/* Step Item */}
              <div className="relative flex flex-col items-center group">
                {/* Circle Indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 z-10",
                    isActive 
                      ? "border-primary bg-background ring-4 ring-primary/10 scale-110" 
                      : isCompleted 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-muted bg-muted/20 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 animate-in zoom-in duration-300" strokeWidth={3} />
                  ) : (
                    <span className={cn("text-sm font-semibold transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                      {stepNumber}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div 
                  className={cn(
                    "absolute top-14 whitespace-nowrap transition-all duration-300",
                    // Align first label left and last label right to prevent overflow
                    index === 0 ? "left-0 origin-left" : 
                    index === totalSteps - 1 ? "right-0 origin-right" : 
                    "left-1/2 -translate-x-1/2 origin-center",
                    isActive ? "text-primary font-bold scale-105" : "text-muted-foreground font-medium",
                    isCompleted && "text-foreground"
                  )}
                >
                  {label}
                </div>
              </div>

              {/* Connector Line Segment */}
              {index < totalSteps - 1 && (
                <div className="flex-1 h-[3px] mx-4 rounded-full bg-muted overflow-hidden relative">
                  <div 
                    className={cn(
                      "absolute inset-0 bg-primary transition-all duration-500 ease-out origin-left",
                      stepNumber < currentStep ? "w-full" : "w-0"
                    )} 
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile View (Compact) */}
      <div className="sm:hidden space-y-3">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-baseline gap-1">
            <span className="text-primary text-lg font-bold">Step {currentStep}</span>
            <span className="text-muted-foreground">/ {totalSteps}</span>
          </div>
          <span className="font-medium text-foreground">{stepLabels[currentStep - 1]}</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full" 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgress;