import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  variant?: "default" | "success" | "warning" | "error";
}

export const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) => {
  return (
    <Card className="p-6 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-sm font-medium",
                trend === "up" && "text-green-600",
                trend === "down" && "text-destructive"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-3",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "success" && "bg-green-100 text-green-600",
            variant === "warning" && "bg-amber-100 text-amber-600",
            variant === "error" && "bg-red-100 text-red-600"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};
