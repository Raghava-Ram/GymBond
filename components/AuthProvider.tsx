import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { auth, db } from "../lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  hasProfile: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  markProfileCreated: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error(
        "[Auth] Firebase auth is not initialized. Check firebaseConfig in lib/firebase.ts."
      );
      setUser(null);
      setHasProfile(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (!firebaseUser) {
        setHasProfile(false);
        setLoading(false);
        return;
      }

      if (!db) {
        console.error(
          "[Auth] Firestore is not initialized. Profile checks are disabled."
        );
        setHasProfile(false);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        setHasProfile(snap.exists());
      } catch (error) {
        console.error("[Auth] Error checking profile document", error);
        setHasProfile(false);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    if (!auth) {
      return {
        error:
          "Firebase auth is not configured. Please check firebaseConfig in lib/firebase.ts.",
      };
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      return { error: e?.message ?? "Failed to sign in." };
    }
  };

  const signup: AuthContextValue["signup"] = async (email, password) => {
    if (!auth) {
      return {
        error:
          "Firebase auth is not configured. Please check firebaseConfig in lib/firebase.ts.",
      };
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      return { error: e?.message ?? "Failed to create account." };
    }
  };

  const logout = async () => {
    if (!auth) {
      console.warn(
        "[Auth] Firebase auth is not configured. Nothing to sign out from."
      );
      return;
    }

    try {
      await signOut(auth);
    } catch (e) {
      console.warn("[Auth] Error signing out", e);
    }
  };

  const markProfileCreated = () => {
    setHasProfile(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasProfile,
        login,
        signup,
        logout,
        markProfileCreated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

