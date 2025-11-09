import { NavLink } from "@/components/NavLink";
import { Trophy, Menu, X, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const initials = useMemo(() => {
    if (!user?.name) {
      return "U";
    }
    return user.name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "U";
  }, [user?.name]);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/teams", label: "Teams" },
    { to: "/matches", label: "Matches" },
    { to: "/round-off", label: "Round Off" },
    { to: "/standings", label: "Standings" },
    { to: "/blog", label: "Blog" },
    { to: "/vlog", label: "Vlog" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">College League</span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                activeClassName="text-primary"
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <NavLink
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                activeClassName="text-primary"
              >
                Dashboard
              </NavLink>
            )}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-foreground focus:outline-none">
                    <Avatar className="h-9 w-9 border border-border">
                      {user.photoUrl ? (
                        <AvatarImage src={user.photoUrl} alt={user.name} />
                      ) : (
                        <AvatarFallback>{initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="hidden lg:inline text-sm font-medium text-muted-foreground">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => navigate("/profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1"
                  activeClassName="text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <NavLink
                  to="/dashboard"
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1"
                  activeClassName="text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </NavLink>
              )}
              
              <div className="border-t border-border pt-4 mt-2">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground px-2">
                      <Avatar className="h-10 w-10 border border-border">
                        {user.photoUrl ? (
                          <AvatarImage src={user.photoUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback>{initials}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="secondary" className="w-full" onClick={() => { navigate("/profile"); setIsMenuOpen(false); }}>
                        Profile
                      </Button>
                      <Button variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="default" className="w-full" onClick={() => { navigate("/auth"); setIsMenuOpen(false); }}>
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
