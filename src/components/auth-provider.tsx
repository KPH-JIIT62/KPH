"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Auth, User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase/client";
import { allowedEmailDomain, isAllowedEmail } from "@/lib/email-domain";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string;
  signIn: (forceRedirect?: boolean) => Promise<void>;
  logOut: () => Promise<void>;
};
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
    const auth = firebase.auth;
    if (!auth) return;

    // Check if user is returning from a redirect sign-in flow
    getRedirectResult(auth)
      .then((cred) => {
        if (cred && cred.user && !isAllowedEmail(cred.user.email)) {
          setError(`Please sign in with your @${allowedEmailDomain} Google account.`);
          void signOut(auth);
        }
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string })?.code;
        if (code && code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
          console.error("[auth-provider] Redirect sign-in error:", err);
          setError("Redirect sign-in couldn’t complete. Please try again.");
        }
      });

    return onAuthStateChanged(auth, (nextUser) => {
        if (nextUser && !isAllowedEmail(nextUser.email)) {
          // Not a college account: sign straight back out and say why. (The backend enforces this too.)
          setError(`Please sign in with your @${allowedEmailDomain} Google account.`);
          setUser(null);
          setLoading(false);
          void signOut(auth);
          return;
        }
        setUser(nextUser);
        setLoading(false);
      }, () => {
        setUser(null);
        setLoading(false);
        setError("We couldn’t verify your sign-in. Please try again.");
      });
  }, [firebase.auth]);

  async function signIn(forceRedirect = false) {
    setError("");
    try {
      if (!firebase.auth) throw new Error("Firebase is not configured");
      const provider = getGoogleProvider();

      if (forceRedirect) {
        setLoading(true);
        await signInWithRedirect(firebase.auth, provider);
        return;
      }

      try {
        await signInWithPopup(firebase.auth, provider);
      } catch (popupErr: unknown) {
        const code = (popupErr as { code?: string })?.code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          return;
        }
        // If the browser blocked the popup or cross-window communication failed, automatically fall back to redirect
        if (
          code === "auth/popup-blocked" ||
          code === "auth/internal-error" ||
          code === "auth/network-request-failed"
        ) {
          console.warn("[auth-provider] Popup failed with code:", code, "- falling back to signInWithRedirect");
          setLoading(true);
          await signInWithRedirect(firebase.auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (cause: unknown) {
      setLoading(false);
      console.error("[auth-provider] Sign-in error:", cause);
      const err = cause as { code?: string; message?: string };
      const code = err?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      if (code === "auth/popup-blocked")
        setError("Sign-in popup was blocked by your browser. Please allow popups or use Redirect sign-in.");
      else if (code === "auth/unauthorized-domain") {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "this host";
        setError(`This site domain (${hostname}) isn’t authorized for Firebase sign-in. Add '${hostname}' in Firebase Console → Authentication → Settings → Authorized domains.`);
      } else if (code === "auth/operation-not-allowed")
        setError("Google sign-in is disabled for this Firebase project. Enable Google under Firebase Console → Authentication → Sign-in method.");
      else if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid")
        setError("The Firebase API key is invalid. Check the Firebase values in .env.local and restart the dev server.");
      else if (code === "auth/network-request-failed")
        setError("Network error connecting to Google. Please check your internet connection or ad-blocker.");
      else if (!firebase.auth)
        setError("Firebase settings are missing. Copy .env.example to .env.local and restart the dev server.");
      else setError(err?.message || "Google sign-in couldn’t complete. If popups are blocked, please allow them or try Redirect sign-in.");
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
