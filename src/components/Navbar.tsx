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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-gradient-to-r from-background/95 via-background/70 to-background/60 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(59,130,246,0.55)]">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_60%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.28),_transparent_65%)]" />
        <div className="relative container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <NavLink
              to="/"
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/15 px-3 py-1.5 text-foreground transition-all duration-300 hover:border-primary/40 hover:shadow-[0_18px_35px_-28px_rgba(59,130,246,0.65)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_0_18px_rgba(59,130,246,0.5)]">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl tracking-wide">College League</span>
            </NavLink>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className="relative text-sm font-semibold text-muted-foreground transition-all duration-300 hover:text-primary after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r from-primary via-secondary to-accent after:transition-transform after:duration-300 hover:after:scale-x-100"
                  activeClassName="text-primary after:scale-x-100"
                >
                  <span className="relative z-10">{item.label}</span>
                </NavLink>
              ))}
              {user && (
                <NavLink
                  to="/dashboard"
                  className="relative text-sm font-semibold text-muted-foreground transition-all duration-300 hover:text-primary after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r from-primary via-secondary to-accent after:transition-transform after:duration-300 hover:after:scale-x-100"
                  activeClassName="text-primary after:scale-x-100"
                >
                  <span className="relative z-10">Dashboard</span>
                </NavLink>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="group flex items-center gap-2 rounded-2xl border border-border/40 bg-background/60 px-3 py-1.5 text-sm text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/10">
                      <Avatar className="h-9 w-9 border border-border/50">
                        {user.photoUrl ? (
                          <AvatarImage src={user.photoUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="hidden lg:inline text-sm font-medium text-foreground group-hover:text-primary">
                        {user.name}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-52 rounded-2xl border border-border/40 bg-background/90 shadow-[0_22px_45px_-30px_rgba(59,130,246,0.55)]"
                  >
                    <DropdownMenuItem onSelect={() => navigate("/profile")}>Profile</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="rounded-xl bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground shadow-[0_18px_35px_-20px_rgba(59,130,246,0.55)] transition-all duration-300 hover:opacity-90"
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 md:hidden">
              {user && (
                <button
                  className="rounded-xl border border-border/40 bg-background/70 p-1.5 text-foreground transition-colors duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  onClick={() => navigate("/profile")}
                  aria-label="Profile"
                >
                  <Avatar className="h-8 w-8 border border-border/50">
                    {user.photoUrl ? (
                      <AvatarImage src={user.photoUrl} alt={user.name} />
                    ) : (
                      <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
                    )}
                  </Avatar>
                </button>
              )}
              <button
                className="rounded-xl border border-border/40 bg-background/70 p-2 text-foreground transition-colors duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-border/40 bg-background/85 py-5 backdrop-blur-xl">
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-primary"
                    activeClassName="text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="rounded-lg bg-background/70 px-2 py-1.5 shadow-[0_12px_28px_-22px_rgba(59,130,246,0.55)]">
                      {item.label}
                    </span>
                  </NavLink>
                ))}
                {user && (
                  <NavLink
                    to="/dashboard"
                    className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-primary"
                    activeClassName="text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="rounded-lg bg-background/70 px-2 py-1.5 shadow-[0_12px_28px_-22px_rgba(236,72,153,0.45)]">
                      Dashboard
                    </span>
                  </NavLink>
                )}

                <div className="mt-2 rounded-2xl border border-border/40 bg-background/80 p-4 shadow-[0_18px_35px_-25px_rgba(99,102,241,0.45)]">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Avatar className="h-11 w-11 border border-border/50">
                          {user.photoUrl ? (
                            <AvatarImage src={user.photoUrl} alt={user.name} />
                          ) : (
                            <AvatarFallback>{initials}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          className="w-full rounded-xl border border-border/40 bg-background/70 hover:border-primary/40 hover:bg-primary/10"
                          onClick={() => {
                            navigate("/profile");
                            setIsMenuOpen(false);
                          }}
                        >
                          Profile
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border border-primary/40 text-primary hover:bg-primary/10"
                          onClick={handleLogout}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full rounded-xl bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground shadow-[0_18px_35px_-20px_rgba(59,130,246,0.55)] hover:opacity-90"
                      onClick={() => {
                        navigate("/auth");
                        setIsMenuOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
