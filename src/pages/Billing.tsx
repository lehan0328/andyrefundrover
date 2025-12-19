import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface MonthlyBilling {
  month: string;
  monthKey: string;
  monthDate: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  chargedAt: string | null;
  discrepancies: any[];
}

interface PaymentMethodInfo {
  hasPaymentMethod: boolean;
  card: {
    last4: string;
    brand: string;
  } | null;
}

export default function Billing() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);

  useEffect(() => {
  const initData = async () => {
    if (user) {
      setLoading(true); // Start loading
      try {
        // Wait for BOTH to finish before turning off loading
        await Promise.all([
          loadBillingData(),
          loadPaymentMethod()
        ]);
      } finally {
        setLoading(false); // Stop loading only when everything is ready
      }
    }
  };

  initData();
}, [user]);

  const loadPaymentMethod = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-payment-method");
      if (error) throw error;
      setPaymentMethod(data);
    } catch (error) {
      console.error("Error loading payment method:", error);
    }
  };

  const loadBillingData = async () => {
    if (!user) return;

    try {
      // Fetch only approved claims that have been charged (bill_sent_at is set)
      const { data: chargedClaims, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Approved')
        .not('bill_sent_at', 'is', null)
        .order('last_updated', { ascending: false });

      if (claimsError) throw claimsError;

      // Fetch payment history to get charge dates
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("bill_month, created_at, status")
        .eq("user_id", user.id)
        .eq("status", "succeeded");

      if (paymentsError) throw paymentsError;

      // Create payment date map
      const paymentDateMap = new Map<string, string>();
      payments?.forEach((p) => {
        paymentDateMap.set(p.bill_month, p.created_at);
      });

      // Group by month
      const grouped: { [key: string]: MonthlyBilling } = {};

      chargedClaims?.forEach((claim: any) => {
        const updatedDate = new Date(claim.last_updated);
        const monthKey = format(startOfMonth(updatedDate), 'yyyy-MM');
        const monthDisplay = format(updatedDate, 'MMMM yyyy');

        const expectedValue = Number(claim.amount) || 0;
        const recoveredValue = Number(claim.actual_recovered) || 0;
        const billedAmount = recoveredValue * 0.15;

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            month: monthDisplay,
            monthKey: monthKey,
            monthDate: startOfMonth(updatedDate),
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
            chargedAt: paymentDateMap.get(monthKey) || claim.bill_sent_at,
            discrepancies: [],
          };
        }

        grouped[monthKey].discrepancies.push({
          ...claim,
          expectedValue,
          recoveredValue,
          billedAmount,
        });
        grouped[monthKey].totalExpected += expectedValue;
        grouped[monthKey].totalRecovered += recoveredValue;
        grouped[monthKey].totalBilled += billedAmount;
      });

      setMonthlyData(Object.values(grouped).sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime()));
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing data');
    }
  };

  const totalBilled = monthlyData.reduce((sum, m) => sum + m.totalBilled, 0);
  const totalExpected = monthlyData.reduce((sum, m) => sum + m.totalExpected, 0);
  const totalRecovered = monthlyData.reduce((sum, m) => sum + m.totalRecovered, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading billing data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Track your commission charges for recovered reimbursements
        </p>
      </div>

      {/* Payment Method Status */}
      {!paymentMethod?.hasPaymentMethod && (
        <Card className="p-4 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="font-medium text-amber-600">No payment method on file</p>
              <p className="text-sm text-muted-foreground">
                Add a card in Settings to enable automatic billing for recovered reimbursements.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Add Card</Link>
            </Button>
          </div>
        </Card>
      )}

      {paymentMethod?.hasPaymentMethod && (
        <Card className="p-4 border-green-500/50 bg-green-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="font-medium text-green-600">Auto-billing enabled</p>
              <p className="text-sm text-muted-foreground">
                Your card ending in {paymentMethod.card?.last4} will be charged automatically when claims are approved.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Manage Card</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Expected"
          value={`$${totalExpected.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Recovered"
          value={`$${totalRecovered.toFixed(2)}`}
          icon={CreditCard}
          trend="up"
        />
        <StatCard
          title="Total Charged (15%)"
          value={`$${totalBilled.toFixed(2)}`}
          icon={CheckCircle}
        />
      </div>

      {/* Monthly Billing Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Charge History</h2>
        {monthlyData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No charges yet. Charges will appear here when claims are approved and processed.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {monthlyData.map((monthData) => (
              <AccordionItem key={monthData.month} value={monthData.month}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="grid grid-cols-5 gap-4 w-full text-left items-center">
                      <div>
                        <p className="font-semibold">{monthData.month}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected</p>
                        <p className="font-semibold">${monthData.totalExpected.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Recovered</p>
                        <p className="font-semibold">${monthData.totalRecovered.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Charged (15%)</p>
                        <p className="font-semibold text-primary">${monthData.totalBilled.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Charged
                        </Badge>
                        {monthData.chargedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(monthData.chargedAt), "MMM dd")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Shipment ID</TableHead>
                        <TableHead>Expected Value</TableHead>
                        <TableHead>Recovered</TableHead>
                        <TableHead>Charged (15%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthData.discrepancies.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell>
                            {format(new Date(claim.last_updated), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {claim.shipment_id || 'N/A'}
                          </TableCell>
                          <TableCell>${claim.expectedValue.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">
                            ${claim.recoveredValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            ${claim.billedAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
