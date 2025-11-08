import { NavLink } from "@/components/NavLink";
import { Trophy, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/teams", label: "Teams" },
    { to: "/matches", label: "Matches" },
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{user.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                      <User className="w-4 h-4" />
                      <span>{user.name}</span>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
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
