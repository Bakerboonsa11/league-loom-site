import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  Trophy,
  Home,
  Shield,
  Gamepad2,
  BarChart3,
  FileText,
  Video,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const DashboardLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const mainNav = useMemo(() => {
    const baseNav = [
      { to: "/", icon: <Home />, label: "Home" },
      { to: "/teams", icon: <Shield />, label: "Teams" },
      { to: "/matches", icon: <Gamepad2 />, label: "Matches" },
      { to: "/standings", icon: <BarChart3 />, label: "Standings" },
      { to: "/blog", icon: <FileText />, label: "Blog" },
      { to: "/vlog", icon: <Video />, label: "Vlog" },
    ];

    if (user?.role === "admin") {
      return [
        ...baseNav,
        { to: "/admin/blog", icon: <FileText />, label: "Admin Blog" },
        { to: "/admin/vlog", icon: <Video />, label: "Admin Vlog" },
      ];
    }

    return baseNav;
  }, [user?.role]);

  const displayName = user?.displayName ?? user?.email ?? "Administrator";

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border/30 bg-gradient-to-b from-background/95 via-background/80 to-background/70 shadow-[0_28px_60px_-30px_rgba(59,130,246,0.35)] backdrop-blur-xl">
        <SidebarHeader className="p-6 pb-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/15 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(59,130,246,0.55)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.45)]">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">League Loom</span>
              <span className="font-semibold text-lg text-foreground">Admin Control</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-4 pb-6">
          <SidebarMenu className="gap-3">
            <SidebarMenuItem>
              <Link to="/dashboard">
                <SidebarMenuButton
                  isActive={location.pathname === "/dashboard"}
                  className="group relative overflow-hidden rounded-2xl border border-border/40 bg-background/70 p-3 shadow-[0_18px_30px_-25px_rgba(59,130,246,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <LayoutDashboard className="h-4 w-4 text-primary group-hover:text-primary" />
                    Dashboard
                  </span>
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at top, rgba(59,130,246,0.35), transparent 65%)" }} />
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarSeparator className="my-2 border-border/40" />
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link to={item.to}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.to}
                    className="group relative overflow-hidden rounded-2xl border border-border/40 bg-background/65 p-3 shadow-[0_18px_30px_-28px_rgba(99,102,241,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/15"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-gradient-to-br from-background/60 via-background/20 to-transparent text-muted-foreground transition-colors duration-300 group-hover:border-primary/50 group-hover:text-primary data-[active=true]:border-primary/60 data-[active=true]:text-primary">
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                    </span>
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at top, rgba(236,72,153,0.25), transparent 65%)" }} />
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto px-4 pb-6">
          <div className="rounded-2xl border border-border/40 bg-background/70 p-5 backdrop-blur-sm shadow-[0_18px_30px_-28px_rgba(79,70,229,0.45)]">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Signed In</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{displayName}</p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-xl border-primary/40 text-primary hover:bg-primary/10">
              <Link to="/profile">View Profile</Link>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/30 bg-gradient-to-r from-background/95 via-background/80 to-background/70 px-4 shadow-[0_12px_35px_-28px_rgba(59,130,246,0.55)] backdrop-blur-xl md:px-8">
            <SidebarTrigger className="rounded-xl border border-border/40 bg-background/70 p-2 text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:text-primary" />
            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-xl border border-primary/40 bg-primary/10 text-primary transition-all duration-300 hover:bg-primary/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
