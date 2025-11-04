import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ClientViewSidebar } from "@/components/layout/ClientViewSidebar";
import { Header } from "@/components/layout/Header";
import Landing from "./pages/Landing";
import CustomerDashboard from "./pages/CustomerDashboard";
import Claims from "./pages/Claims";
import AdminClaims from "./pages/AdminClaims";
import Shipments from "./pages/Shipments";
import Settings from "./pages/Settings";
import Invoices from "./pages/Invoices";
import ProofOfDelivery from "./pages/ProofOfDelivery";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import AdminInvoices from "./pages/AdminInvoices";
import AdminProofOfDelivery from "./pages/AdminProofOfDelivery";
import AdminNotifications from "./pages/AdminNotifications";
import ManageUsers from "./pages/ManageUsers";
import CustomerDetails from "./pages/CustomerDetails";
import ClientDashboardView from "./pages/ClientDashboardView";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AmazonCallback from "./pages/AmazonCallback";
import HiddenCostAmazonFBA from "./pages/blogs/HiddenCostAmazonFBA";
import DocumentManagement from "./pages/blogs/DocumentManagement";
import FiveReimbursementTypes from "./pages/blogs/FiveReimbursementTypes";
import AutomationGuide from "./pages/blogs/AutomationGuide";
import MaximizeRecovery from "./pages/blogs/MaximizeRecovery";
import CommonMistakes from "./pages/blogs/CommonMistakes";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const CustomerLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-background">
    <CustomerSidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  </div>
);

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-background">
    <AdminSidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  </div>
);

const ClientViewLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-background">
    <ClientViewSidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header isClientView />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SearchProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/amazon-callback" element={<AmazonCallback />} />
          <Route path="/blog/hidden-cost-amazon-fba" element={<HiddenCostAmazonFBA />} />
          <Route path="/blog/document-management" element={<DocumentManagement />} />
          <Route path="/blog/five-reimbursement-types" element={<FiveReimbursementTypes />} />
          <Route path="/blog/automation-guide" element={<AutomationGuide />} />
          <Route path="/blog/maximize-recovery" element={<MaximizeRecovery />} />
          <Route path="/blog/common-mistakes" element={<CommonMistakes />} />
          
          {/* Customer Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute requireCustomer>
              <CustomerLayout><CustomerDashboard /></CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/claims" element={
            <ProtectedRoute requireCustomer>
              <CustomerLayout><Claims /></CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/shipments" element={
            <ProtectedRoute requireCustomer>
              <CustomerLayout><Shipments /></CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requireCustomer>
              <CustomerLayout><Settings /></CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/invoices" element={
            <ProtectedRoute requireCustomer>
              <CustomerLayout><Invoices /></CustomerLayout>
            </ProtectedRoute>
          } />
          <Route path="/proof-of-delivery" element={
            <ProtectedRoute requireCustomer>
              <ProofOfDelivery />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute requireCustomer>
              <Notifications />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/claims" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout><AdminClaims /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/invoices" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout><AdminInvoices /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/proof-of-delivery" element={
            <ProtectedRoute requireAdmin>
              <AdminProofOfDelivery />
            </ProtectedRoute>
          } />
          <Route path="/admin/notifications" element={
            <ProtectedRoute requireAdmin>
              <AdminNotifications />
            </ProtectedRoute>
          } />
          <Route path="/admin/client-dashboard" element={
            <ProtectedRoute requireAdmin>
              <ClientViewLayout><ClientDashboardView /></ClientViewLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/client-claims" element={
            <ProtectedRoute requireAdmin>
              <ClientViewLayout><Claims /></ClientViewLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/client-shipments" element={
            <ProtectedRoute requireAdmin>
              <ClientViewLayout><Shipments /></ClientViewLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/client-proof-of-delivery" element={
            <ProtectedRoute requireAdmin>
              <ClientViewLayout><ProofOfDelivery /></ClientViewLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/client-settings" element={
            <ProtectedRoute requireAdmin>
              <ClientViewLayout><Settings /></ClientViewLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/client-notifications" element={
            <ProtectedRoute requireAdmin>
              <ClientViewLayout><Notifications /></ClientViewLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout><ManageUsers /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout><Settings /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/customer/:customerId" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout><CustomerDetails /></AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
          </SearchProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
