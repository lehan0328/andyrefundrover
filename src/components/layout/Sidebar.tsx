import { LayoutDashboard, FileText, Settings, Shield, User, File, FolderOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const navigation = [
  { name: "Client Overview", href: "/clientdashboard", icon: User },
  { name: "Client Claims", href: "/clientclaims", icon: File },
  { name: "Client Documents", href: "/clientdocuments", icon: FolderOpen },
  { name: "Client Settings", href: "/clientsettings", icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <img src={logo} alt="Auren Logo" className="h-8 w-8" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Auren</h1>
          <p className="text-xs text-muted-foreground">Reimbursement</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const isAdmin = item.href === "/admin";
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? isAdmin 
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow"
                    : "bg-primary text-primary-foreground shadow-glow"
                  : isAdmin
                    ? "text-muted-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 hover:text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
