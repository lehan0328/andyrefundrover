import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", approved: 12, pending: 5, denied: 2 },
  { month: "Feb", approved: 18, pending: 8, denied: 3 },
  { month: "Mar", approved: 15, pending: 12, denied: 1 },
  { month: "Apr", approved: 22, pending: 6, denied: 4 },
  { month: "May", approved: 28, pending: 10, denied: 2 },
  { month: "Jun", approved: 25, pending: 15, denied: 5 },
];

export const ClaimsChart = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Claims by Month</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Bar dataKey="approved" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="pending" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="denied" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
