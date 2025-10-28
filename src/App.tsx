import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Claims from "./pages/Claims";
import Shipments from "./pages/Shipments";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerDetails from "./pages/CustomerDetails";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import HiddenCostAmazonFBA from "./pages/blogs/HiddenCostAmazonFBA";
import DocumentManagement from "./pages/blogs/DocumentManagement";
import FiveReimbursementTypes from "./pages/blogs/FiveReimbursementTypes";
import AutomationGuide from "./pages/blogs/AutomationGuide";
import MaximizeRecovery from "./pages/blogs/MaximizeRecovery";
import CommonMistakes from "./pages/blogs/CommonMistakes";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-background">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
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
              <Route path="/blog/hidden-cost-amazon-fba" element={<HiddenCostAmazonFBA />} />
              <Route path="/blog/document-management" element={<DocumentManagement />} />
              <Route path="/blog/five-reimbursement-types" element={<FiveReimbursementTypes />} />
              <Route path="/blog/automation-guide" element={<AutomationGuide />} />
              <Route path="/blog/maximize-recovery" element={<MaximizeRecovery />} />
              <Route path="/blog/common-mistakes" element={<CommonMistakes />} />
              <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
              <Route path="/claims" element={<ProtectedRoute><Layout><Claims /></Layout></ProtectedRoute>} />
              <Route path="/shipments" element={<ProtectedRoute><Layout><Shipments /></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
              <Route path="/customer/:customerId" element={<ProtectedRoute><Layout><CustomerDetails /></Layout></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SearchProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
