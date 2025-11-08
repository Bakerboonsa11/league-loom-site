import { Link, Outlet } from "react-router-dom";
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
import { useNavigate } from "react-router-dom";

const DashboardLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const mainNav = [
    { to: "/", icon: <Home />, label: "Home" },
    { to: "/teams", icon: <Shield />, label: "Teams" },
    { to: "/matches", icon: <Gamepad2 />, label: "Matches" },
    { to: "/standings", icon: <BarChart3 />, label: "Standings" },
    { to: "/blog", icon: <FileText />, label: "Blog" },
    { to: "/vlog", icon: <Video />, label: "Vlog" },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">College League</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link to="/dashboard">
                <SidebarMenuButton>
                  <LayoutDashboard />
                  Dashboard
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarSeparator />
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link to={item.to}>
                  <SidebarMenuButton>
                    {item.icon}
                    {item.label}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>{/* Can add footer items here */}</SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger />
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleLogout}>
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
