"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodeXml } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { user, loading, error, signIn } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && user) router.replace("/dashboard"); }, [loading, user, router]);
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title">
    <Link className="brand login-brand" href="/" aria-label="Knuth Programming Hub"><span className="brand-symbol"><CodeXml size={23} /></span><span className="brand-copy"><strong>knuth<span>.</span></strong><span>PROGRAMMING HUB</span></span></Link>
    <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
    <h1 id="login-title">Make room for<br />what you’ll build.</h1>
    <p className="login-description">Sign in to join the Knuth Programming Hub community and continue learning, practicing, and growing.</p>
    <button className="google-signin" onClick={() => void signIn()} disabled={loading}>
      <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.27 5.64c4.24-3.91 7.5-9.67 7.5-17.29Z"/><path fill="#FBBC05" d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.27-5.64c-2.02 1.36-4.6 2.17-8.63 2.17-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
      Continue with Google
    </button>
    {error && <p className="login-error" role="alert">{error}</p>}
    <p className="login-footnote">Use your Google account to securely access your hub.</p>
  </section></main>;
}
