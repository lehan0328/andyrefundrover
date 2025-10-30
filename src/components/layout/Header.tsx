import { Bell, Search, LogOut, User, LayoutDashboard, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSearch } from "@/contexts/SearchContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const Header = ({ isClientView = false }: { isClientView?: boolean }) => {
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCustomer, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      // Clear local session immediately to prevent redirects back to dashboards
      await supabase.auth.signOut({ scope: 'local' });
      // Best-effort server revoke (ignore errors like session_not_found)
      supabase.auth.signOut({ scope: 'global' }).catch(() => {});

      // Hard clear any persisted auth tokens just in case
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('sb-') || k.includes('auth')) localStorage.removeItem(k);
        });
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('sb-') || k.includes('auth')) sessionStorage.removeItem(k);
        });
      } catch {}

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.log("Logout error:", error);
    } finally {
      // Force full reload to ensure all app state is reset and go to front page
      window.location.replace('/');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-8">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item name, ASIN, shipment ID..."
            className="pl-10 bg-muted/50 border-0"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && isClientView && (
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Switch to Admin Dashboard</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
