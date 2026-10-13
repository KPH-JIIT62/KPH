"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Moon, Sun } from "lucide-react";
import { AppLoader } from "@/components/app-loader";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { allowedEmailDomain } from "@/lib/email-domain";
import "./landing.css";

export default function Home() {
  const { user, loading, error, signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <AppLoader />;
  }

  const themeLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <div className="landing-wrapper">
      {/* Ambient background decoration */}
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-glow-center" />
        <div className="landing-glow-top-beam" />
      </div>

      {/* Competitive Programming Syntax Backdrop (KPH Core & Contest Template) */}
      <div className="code-backdrop" aria-hidden="true">
        {/* Left CP Pane: Segment Tree & IO Optimization */}
        <div className="code-pane code-pane-left">
          <div className="code-line">
            <span className="code-num">01</span>
            <span><span className="token-comment">// Knuth Programming Hub — Core Algo Engine</span></span>
          </div>
          <div className="code-line">
            <span className="code-num">02</span>
            <span><span className="token-keyword">#include</span> <span className="token-type">&lt;bits/stdc++.h&gt;</span></span>
          </div>
          <div className="code-line">
            <span className="code-num">03</span>
            <span><span className="token-keyword">using namespace</span> <span className="token-type">std</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">04</span>
            <span><span className="token-keyword">#define</span> <span className="token-fn">fast_io</span> <span className="token-var">ios::sync_with_stdio(0); cin.tie(0);</span></span>
          </div>
          <div className="code-line">
            <span className="code-num">05</span>
            <span><span className="token-keyword">#define</span> <span className="token-type">ll</span> <span className="token-keyword">long long</span></span>
          </div>
          <div className="code-line">
            <span className="code-num">06</span>
            <span><span className="token-keyword">const</span> <span className="token-type">int</span> <span className="token-var">MOD</span> = <span className="token-var">1e9 + 7</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">07</span>
            <span></span>
          </div>
          <div className="code-line">
            <span className="code-num">08</span>
            <span><span className="token-keyword">template</span>&lt;<span className="token-keyword">typename</span> <span className="token-type">T</span>&gt;</span>
          </div>
          <div className="code-line">
            <span className="code-num">09</span>
            <span><span className="token-keyword">class</span> <span className="token-type">SegmentTree</span> &#123;</span>
          </div>
          <div className="code-line">
            <span className="code-num">10</span>
            <span>    <span className="token-type">vector</span>&lt;<span className="token-type">T</span>&gt; <span className="token-var">tree</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">11</span>
            <span><span className="token-keyword">public</span>:</span>
          </div>
          <div className="code-line">
            <span className="code-num">12</span>
            <span>    <span className="token-fn">SegmentTree</span>(<span className="token-type">int</span> <span className="token-var">n</span>) : <span className="token-var">tree(4 * n, 0)</span> &#123;&#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">13</span>
            <span>    <span className="token-type">void</span> <span className="token-fn">update</span>(<span className="token-type">int</span> <span className="token-var">node</span>, <span className="token-type">int</span> <span className="token-var">l</span>, <span className="token-type">int</span> <span className="token-var">r</span>, <span className="token-type">int</span> <span className="token-var">idx</span>, <span className="token-type">T</span> <span className="token-var">val</span>) &#123;</span>
          </div>
          <div className="code-line">
            <span className="code-num">14</span>
            <span>        <span className="token-keyword">if</span> (<span className="token-var">l == r</span>) &#123; <span className="token-var">tree[node] = val</span>; <span className="token-keyword">return</span>; &#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">15</span>
            <span>        <span className="token-type">int</span> <span className="token-var">mid</span> = (<span className="token-var">l + r</span>) / <span className="token-var">2</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">16</span>
            <span>        <span className="token-keyword">if</span> (<span className="token-var">idx &lt;= mid</span>) <span className="token-fn">update</span>(<span className="token-var">2*node, l, mid, idx, val</span>);</span>
          </div>
          <div className="code-line">
            <span className="code-num">17</span>
            <span>        <span className="token-keyword">else</span> <span className="token-fn">update</span>(<span className="token-var">2*node+1, mid+1, r, idx, val</span>);</span>
          </div>
          <div className="code-line">
            <span className="code-num">18</span>
            <span>        <span className="token-var">tree[node] = tree[2*node] + tree[2*node+1]</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">19</span>
            <span>    &#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">20</span>
            <span>&#125;;</span>
          </div>
        </div>

        {/* Right CP Pane: Binary Search & Solve Routine */}
        <div className="code-pane code-pane-right">
          <div className="code-line">
            <span className="code-num">21</span>
            <span><span className="token-comment">// KPH: Encode &amp; Execute Contest Problem C</span></span>
          </div>
          <div className="code-line">
            <span className="code-num">22</span>
            <span><span className="token-type">bool</span> <span className="token-fn">check</span>(<span className="token-type">ll</span> <span className="token-var">mid</span>, <span className="token-keyword">const</span> <span className="token-type">vector</span>&lt;<span className="token-type">ll</span>&gt;&amp; <span className="token-var">arr</span>, <span className="token-type">ll</span> <span className="token-var">k</span>) &#123;</span>
          </div>
          <div className="code-line">
            <span className="code-num">23</span>
            <span>    <span className="token-type">ll</span> <span className="token-var">ops</span> = <span className="token-var">0</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">24</span>
            <span>    <span className="token-keyword">for</span> (<span className="token-type">ll</span> <span className="token-var">x</span> : <span className="token-var">arr</span>) <span className="token-keyword">if</span> (<span className="token-var">x &lt; mid</span>) <span className="token-var">ops += (mid - x)</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">25</span>
            <span>    <span className="token-keyword">return</span> <span className="token-var">ops &lt;= k</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">26</span>
            <span>&#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">27</span>
            <span></span>
          </div>
          <div className="code-line">
            <span className="code-num">28</span>
            <span><span className="token-type">void</span> <span className="token-fn">solve</span>() &#123;</span>
          </div>
          <div className="code-line">
            <span className="code-num">29</span>
            <span>    <span className="token-type">int</span> <span className="token-var">n</span>; <span className="token-type">ll</span> <span className="token-var">k</span>; <span className="token-var">cin &gt;&gt; n &gt;&gt; k</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">30</span>
            <span>    <span className="token-type">vector</span>&lt;<span className="token-type">ll</span>&gt; <span className="token-var">arr(n)</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">31</span>
            <span>    <span className="token-keyword">for</span> (<span className="token-type">ll</span> &amp;<span className="token-var">x</span> : <span className="token-var">arr</span>) <span className="token-var">cin &gt;&gt; x</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">32</span>
            <span>    <span className="token-type">ll</span> <span className="token-var">low = 0, high = 1e18, ans = 0</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">33</span>
            <span>    <span className="token-keyword">while</span> (<span className="token-var">low &lt;= high</span>) &#123;</span>
          </div>
          <div className="code-line">
            <span className="code-num">34</span>
            <span>        <span className="token-type">ll</span> <span className="token-var">mid</span> = <span className="token-var">low + (high - low) / 2</span>;</span>
          </div>
          <div className="code-line">
            <span className="code-num">35</span>
            <span>        <span className="token-keyword">if</span> (<span className="token-fn">check</span>(<span className="token-var">mid, arr, k</span>)) &#123; <span className="token-var">ans = mid; low = mid + 1;</span> &#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">36</span>
            <span>        <span className="token-keyword">else</span> &#123; <span className="token-var">high = mid - 1;</span> &#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">37</span>
            <span>    &#125;</span>
          </div>
          <div className="code-line">
            <span className="code-num">38</span>
            <span>    <span className="token-var">cout &lt;&lt; ans &lt;&lt; </span><span className="token-string">"\n"</span>; <span className="token-ac">AC 0.02s</span></span>
          </div>
          <div className="code-line">
            <span className="code-num">39</span>
            <span>&#125;</span>
          </div>
        </div>
      </div>

      {/* Top utility bar */}
      <header className="landing-header">
        <Link
          className="landing-header-brand"
          href="/"
          aria-label="Knuth Programming Hub home"
        >
          <BrandLogo className="brand-logo-nav" />
        </Link>

        <div className="landing-header-pill">
          <Link href="/about" className="landing-nav-link">
            About
          </Link>
          <Link href="/team" className="landing-nav-link">
            Team
          </Link>
          <Link href="/contact" className="landing-nav-link">
            Contact
          </Link>

          <button
            type="button"
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {theme === "dark" ? (
              <Sun size={15} aria-hidden="true" />
            ) : (
              <Moon size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Main hero and authentication card */}
      <main className="landing-main">
        <div className="landing-card-wrapper">
          {/* Luminous Neon Green Aura */}
          <div className="landing-card-aura" aria-hidden="true" />

          {/* Obsidian Glass Card */}
          <section className="landing-card" aria-labelledby="login-title">
            {/* Cybernetic Accent Beam */}
            <div className="card-top-beam" aria-hidden="true" />

            <div className="card-brand-box">
              <div className="brand-halo">
                <Link
                  className="brand login-brand"
                  href="/"
                  aria-label="Knuth Programming Hub"
                >
                  <BrandLogo className="brand-logo-login" />
                </Link>
              </div>

              <h1 id="login-title" className="card-title">
                Code. Compete. <span className="neon-conquer">Conquer.</span>
              </h1>

              <p className="card-subtitle">
                The home for competitive programmers, contest research, and
                algorithmic training at Jaypee Institute of Information Technology.
              </p>
            </div>

            {/* Google Sign-in Action */}
            <button
              type="button"
              className="google-auth-btn"
              onClick={() => void signIn()}
              disabled={loading}
              aria-label="Sign in with Google"
            >
              <span className="google-icon-box">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 48"
                  width="20"
                  height="20"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.27 5.64c4.24-3.91 7.5-9.67 7.5-17.29Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.27-5.64c-2.02 1.36-4.6 2.17-8.63 2.17-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                  />
                </svg>
              </span>
              <span>{loading ? "Connecting..." : "Continue with Google"}</span>
            </button>

            {error && (
              <div className="auth-error-box" role="alert">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* College Security Note (Shield icon removed as requested) */}
            <div className="college-security-badge">
              <span>
                Exclusively for{" "}
                <span className="domain-pill">@{allowedEmailDomain}</span> accounts
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
