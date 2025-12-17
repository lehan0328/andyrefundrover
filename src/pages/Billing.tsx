import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface MonthlyBilling {
  month: string;
  monthKey: string;
  monthDate: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  isPaid: boolean;
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyBilling | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBillingData();
    loadPaymentMethod();
    loadPaymentHistory();
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

  const loadPaymentHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("bill_month, status")
        .eq("user_id", user.id)
        .eq("status", "succeeded");

      if (error) throw error;

      const paid = new Set<string>();
      data?.forEach((p) => paid.add(p.bill_month));
      setPaidMonths(paid);
    } catch (error) {
      console.error("Error loading payment history:", error);
    }
  };

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch only approved claims that have been sent to the client
      const { data: sentClaims, error } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Approved')
        .not('bill_sent_at', 'is', null)
        .order('last_updated', { ascending: false });

      if (error) throw error;

      // Group by month
      const grouped: { [key: string]: MonthlyBilling } = {};
      
      sentClaims?.forEach((claim: any) => {
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
            isPaid: false,
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
    } finally {
      setLoading(false);
    }
  };

  const handlePayClick = (monthData: MonthlyBilling) => {
    setSelectedMonth(monthData);
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMonth || !user) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("charge-saved-card", {
        body: {
          userId: user.id,
          amount: selectedMonth.totalBilled,
          billMonth: selectedMonth.monthKey,
          description: `Auren Reimbursements Fee - ${selectedMonth.month}`,
        },
      });

      if (error) throw new Error(error.message);

      if (data.success) {
        toast.success(`Payment of $${selectedMonth.totalBilled.toFixed(2)} processed successfully!`);
        setPaidMonths((prev) => new Set([...prev, selectedMonth.monthKey]));
        setPaymentDialogOpen(false);
        setSelectedMonth(null);
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      console.error("Payment error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "Amex",
      discover: "Discover",
    };
    return brands[brand.toLowerCase()] || brand;
  };

  const totalBilled = monthlyData.reduce((sum, m) => sum + m.totalBilled, 0);
  const totalExpected = monthlyData.reduce((sum, m) => sum + m.totalExpected, 0);
  const totalRecovered = monthlyData.reduce((sum, m) => sum + m.totalRecovered, 0);
  const totalPaid = monthlyData
    .filter((m) => paidMonths.has(m.monthKey))
    .reduce((sum, m) => sum + m.totalBilled, 0);

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
          Track your monthly commission billing
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
                Add a card in Settings to enable automatic billing.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Add Card</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          title="Total Billed (15%)"
          value={`$${totalBilled.toFixed(2)}`}
          icon={Clock}
        />
        <StatCard
          title="Total Paid"
          value={`$${totalPaid.toFixed(2)}`}
          icon={CheckCircle}
          trend="up"
        />
      </div>

      {/* Monthly Billing Table */}
      <Card className="p-6">
        {monthlyData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No billing data available yet.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {monthlyData.map((monthData) => {
              const isPaid = paidMonths.has(monthData.monthKey);
              return (
                <AccordionItem key={monthData.month} value={monthData.month}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="grid grid-cols-6 gap-4 w-full text-left items-center">
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
                          <p className="text-sm text-muted-foreground">Billed (15%)</p>
                          <p className="font-semibold text-primary">${monthData.totalBilled.toFixed(2)}</p>
                        </div>
                        <div>
                          {isPaid ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unpaid</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayClick(monthData);
                              }}
                              disabled={!paymentMethod?.hasPaymentMethod}
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Updated Date</TableHead>
                          <TableHead>Shipment ID</TableHead>
                          <TableHead>Expected Value</TableHead>
                          <TableHead>Actual Recovered</TableHead>
                          <TableHead>Billed (15%)</TableHead>
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
              );
            })}
          </Accordion>
        )}
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Pay ${selectedMonth?.totalBilled.toFixed(2)} for {selectedMonth?.month}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {paymentMethod?.card && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">
                    {formatCardBrand(paymentMethod.card.brand)} ending in {paymentMethod.card.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">Default payment method</p>
                </div>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              Your card will be charged ${selectedMonth?.totalBilled.toFixed(2)} for the {selectedMonth?.month} billing period.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${selectedMonth?.totalBilled.toFixed(2)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
