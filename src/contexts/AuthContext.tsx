import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  college: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapFirebaseUserToUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  const profileRef = doc(db, "users", firebaseUser.uid);
  const profileSnap = await getDoc(profileRef);
  const data = profileSnap.data();

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? "",
    name: data?.name ?? firebaseUser.displayName ?? "",
    role: data?.role ?? "student",
    college: data?.college ?? "",
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const mappedUser = await mapFirebaseUserToUser(firebaseUser);
        setUser(mappedUser);
      } catch (error) {
        console.error("Failed to load user profile", error);
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          name: firebaseUser.displayName ?? "",
          role: "student",
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    const mappedUser = await mapFirebaseUserToUser(credentials.user);
    setUser(mappedUser);
  };

  const signup = async (email: string, password: string, name: string, role: string) => {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      await updateProfile(credentials.user, { displayName: name }).catch(() => undefined);
    }

    await setDoc(
      doc(db, "users", credentials.user.uid),
      {
        email,
        name,
        role,
        college: "",
      },
      { merge: true },
    );

    setUser({
      id: credentials.user.uid,
      email,
      name,
      role,
      college: "",
    });
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
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