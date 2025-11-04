import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";
import { AdminProofOfDeliveryPanel } from "@/components/dashboard/AdminProofOfDeliveryPanel";

const AdminProofOfDelivery = () => {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Proof of Delivery</h1>
              <p className="text-muted-foreground mt-2">
                View all client-uploaded proof of delivery files
              </p>
            </div>
            <AdminProofOfDeliveryPanel />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminProofOfDelivery;
