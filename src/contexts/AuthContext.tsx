import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const MOCK_USERS = [
  { id: "1", email: "admin@college.edu", password: "admin123", name: "Admin User" },
  { id: "2", email: "student@college.edu", password: "student123", name: "Student User" },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem("mockUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const foundUser = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!foundUser) {
      throw new Error("Invalid email or password");
    }

    const userData = { id: foundUser.id, email: foundUser.email, name: foundUser.name };
    setUser(userData);
    localStorage.setItem("mockUser", JSON.stringify(userData));
  };

  const signup = async (email: string, password: string, name: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if user already exists
    if (MOCK_USERS.find((u) => u.email === email)) {
      throw new Error("User already exists");
    }

    const newUser = {
      id: String(MOCK_USERS.length + 1),
      email,
      name,
    };

    setUser(newUser);
    localStorage.setItem("mockUser", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mockUser");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
