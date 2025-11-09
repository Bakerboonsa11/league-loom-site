import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, getFirestore, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  college: string;
  department: string;
  userId: string;
  photoUrl: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: string,
    userId: string,
    college?: string,
    department?: string,
  ) => Promise<void>;
  updateProfileData: (updates: { name?: string; college?: string; department?: string; photoUrl?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
    department: data?.department ?? "",
    userId: data?.userId ?? firebaseUser.uid,
    photoUrl: data?.photoUrl ?? firebaseUser.photoURL ?? "",
  } satisfies User;
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
          college: "",
          department: "",
          userId: firebaseUser.uid,
          photoUrl: firebaseUser.photoURL ?? "",
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

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: string,
    userId: string,
    college?: string,
    department?: string,
  ) => {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      await updateProfile(credentials.user, { displayName: name }).catch(() => undefined);
    }

    const trimmedUserId = userId.trim();
    const normalizedUserId = trimmedUserId;
    const safeUserIdKey = encodeURIComponent(normalizedUserId);
    const userDocRef = doc(db, "users", credentials.user.uid);
    const userIdDocRef = doc(db, "userIds", safeUserIdKey);

    try {
      await runTransaction(db, async (transaction) => {
        const existingIdDoc = await transaction.get(userIdDocRef);
        if (existingIdDoc.exists()) {
          throw new Error("USER_ID_TAKEN");
        }

        transaction.set(userIdDocRef, {
          ownerUid: credentials.user.uid,
          value: normalizedUserId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(
          userDocRef,
          {
            email,
            name,
            role,
            college: college ?? "",
            department: department ?? "",
            userId: normalizedUserId,
            photoUrl: "",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
    } catch (error) {
      await deleteUser(credentials.user).catch(() => undefined);
      if (error instanceof Error && error.message === "USER_ID_TAKEN") {
        const userIdError = new Error("Student ID already in use.");
        (userIdError as Error & { code?: string }).code = "auth/user-id-already-in-use";
        throw userIdError;
      }

      throw error;
    }

    setUser({
      id: credentials.user.uid,
      email,
      name,
      role,
      college: college ?? "",
      department: department ?? "",
      userId: normalizedUserId,
      photoUrl: "",
    });
  };

  const updateProfileData = async (updates: { name?: string; college?: string; department?: string; photoUrl?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof updates.name === "string") {
      payload.name = updates.name;
    }
    if (typeof updates.college === "string") {
      payload.college = updates.college;
    }
    if (typeof updates.department === "string") {
      payload.department = updates.department;
    }
    if (typeof updates.photoUrl === "string") {
      payload.photoUrl = updates.photoUrl;
    }

    await setDoc(userDocRef, payload, { merge: true });

    if (updates.name !== undefined || updates.photoUrl !== undefined) {
      await updateProfile(currentUser, {
        displayName: updates.name ?? currentUser.displayName ?? undefined,
        photoURL: updates.photoUrl ?? currentUser.photoURL ?? undefined,
      }).catch(() => undefined);
    }

    setUser((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        name: updates.name ?? prev.name,
        college: updates.college ?? prev.college,
        department: updates.department ?? prev.department,
        photoUrl: updates.photoUrl ?? prev.photoUrl,
      };
    });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("No authenticated user");
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, updateProfileData, changePassword, logout, isLoading }}>
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