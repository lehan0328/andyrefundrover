import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, CreditCard, Clock, Banknote } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyBilling {
  month: string;
  monthDate: Date;
  totalExpected: number;
  totalRecovered: number;
  totalBilled: number;
  discrepancies: any[];
}

export default function Billing() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyBilling | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'bank' | 'card' | null>(null);

  useEffect(() => {
    loadBillingData();
  }, [user]);

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
            monthDate: startOfMonth(updatedDate),
            totalExpected: 0,
            totalRecovered: 0,
            totalBilled: 0,
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
    setSelectedPaymentMethod(null);
  };

  const handlePaymentMethodSelect = (method: 'bank' | 'card') => {
    setSelectedPaymentMethod(method);
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod || !selectedMonth) return;
    
    toast.success(`Payment initiated via ${selectedPaymentMethod === 'bank' ? 'Bank Transfer' : 'Credit Card'} for ${selectedMonth.month}`);
    setPaymentDialogOpen(false);
    setSelectedMonth(null);
    setSelectedPaymentMethod(null);
  };

  const totalBilled = monthlyData.reduce((sum, m) => sum + m.totalBilled, 0);
  const totalExpected = monthlyData.reduce((sum, m) => sum + m.totalExpected, 0);
  const totalRecovered = monthlyData.reduce((sum, m) => sum + m.totalRecovered, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Track your monthly commission billing
        </p>
      </div>

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
          title="Total Billed (15%)"
          value={`$${totalBilled.toFixed(2)}`}
          icon={Clock}
        />
      </div>

      {/* Monthly Billing Table */}
      <Card className="p-6">
        <Accordion type="single" collapsible className="w-full">
          {monthlyData.map((monthData) => (
            <AccordionItem key={monthData.month} value={monthData.month}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="grid grid-cols-5 gap-4 w-full text-left">
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
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayClick(monthData);
                        }}
                        className="w-full"
                      >
                        Pay
                      </Button>
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
          ))}
        </Accordion>
      </Card>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
            <DialogDescription>
              Choose how you'd like to pay ${selectedMonth?.totalBilled.toFixed(2)} for {selectedMonth?.month}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Button
              variant={selectedPaymentMethod === 'bank' ? 'default' : 'outline'}
              className="h-auto py-6 flex flex-col items-center gap-2"
              onClick={() => handlePaymentMethodSelect('bank')}
            >
              <Banknote className="h-8 w-8" />
              <div className="text-center">
                <p className="font-semibold">Bank Transfer</p>
                <p className="text-xs text-muted-foreground">Pay via bank account</p>
              </div>
            </Button>
            
            <Button
              variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
              className="h-auto py-6 flex flex-col items-center gap-2"
              onClick={() => handlePaymentMethodSelect('card')}
            >
              <CreditCard className="h-8 w-8" />
              <div className="text-center">
                <p className="font-semibold">Credit Card</p>
                <p className="text-xs text-muted-foreground">Pay with credit/debit card</p>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPayment}
              disabled={!selectedPaymentMethod}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
