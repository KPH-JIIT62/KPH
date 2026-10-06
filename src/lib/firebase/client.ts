"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

// Firebase is initialized only when authentication is used.
export function getFirebaseAuth() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value))
    throw new Error(
      "Firebase Authentication is not configured. See .env.example.",
    );
  return getAuth(getApps().length ? getApp() : initializeApp(config));
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser, so people with several Google accounts can pick their college one.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
