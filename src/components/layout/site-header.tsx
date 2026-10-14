"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "@/components/theme-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const themeLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <header className="site-header">
      <Link
        className="site-nav-brand"
        href="/"
        aria-label="Knuth Programming Hub home"
      >
        <BrandLogo className="brand-logo-nav" />
      </Link>

      <nav className="site-nav-pill" aria-label="Main Navigation">
        <Link
          href="/"
          className={`site-nav-link ${pathname === "/" ? "active" : ""}`}
        >
          Home
        </Link>
        <Link
          href="/about"
          className={`site-nav-link ${pathname === "/about" ? "active" : ""}`}
        >
          About
        </Link>
        <Link
          href="/team"
          className={`site-nav-link ${pathname === "/team" ? "active" : ""}`}
        >
          Team
        </Link>
        <Link
          href="/contact"
          className={`site-nav-link ${pathname === "/contact" ? "active" : ""}`}
        >
          Contact
        </Link>

        <button
          type="button"
          className="site-theme-toggle"
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
      </nav>
    </header>
  );
}
