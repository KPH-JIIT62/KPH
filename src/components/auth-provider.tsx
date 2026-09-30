"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Auth, User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase/client";

type AuthContextValue = { user: User | null; loading: boolean; error: string; signIn: () => Promise<void>; logOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebase] = useState<{ auth: Auth | null; configError: string }>(() => {
    try { return { auth: getFirebaseAuth(), configError: "" }; }
    catch { return { auth: null, configError: "Sign-in is not configured yet. Check the Firebase settings." }; }
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(firebase.auth));
  const [error, setError] = useState(firebase.configError);

  useEffect(() => {
    if (!firebase.auth) return;
    return onAuthStateChanged(firebase.auth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      }, () => {
        setUser(null);
        setLoading(false);
        setError("We couldn’t verify your sign-in. Please try again.");
      });
  }, [firebase.auth]);

  async function signIn() {
    setError("");
    try {
      if (!firebase.auth) throw new Error("Firebase is not configured");
      await signInWithPopup(firebase.auth, getGoogleProvider());
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      if (code === "auth/unauthorized-domain")
        setError("This site isn’t authorized for Firebase sign-in. Add its hostname in Firebase Console → Authentication → Settings → Authorized domains.");
      else if (code === "auth/operation-not-allowed")
        setError("Google sign-in is disabled for this Firebase project. Enable Google under Firebase Console → Authentication → Sign-in method.");
      else if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid")
        setError("The Firebase API key is invalid. Check the Firebase values in .env.local and restart the dev server.");
      else if (!firebase.auth)
        setError("Firebase settings are missing. Copy .env.example to .env.local and restart the dev server.");
      else setError("Google sign-in couldn’t complete. Check that Google sign-in is enabled and this hostname is authorized in Firebase Console.");
    }
  }

  async function logOut() {
    if (firebase.auth) await signOut(firebase.auth);
  }

  return <AuthContext.Provider value={{ user, loading, error, signIn, logOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
