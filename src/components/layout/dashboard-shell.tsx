"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { navigation } from "@/config/navigation";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccount } from "@/components/account-provider";
import { MemberAvatar, ProfileProvider, useProfile } from "@/components/profile-provider";

function ProfileMenu() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { account } = useAccount();
  const { logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const displayName = account?.displayName || profile.displayName;
  const enrollmentNumber = account?.profile.enrollmentNo || "Enrollment not set";

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="header-profile"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
      >
        <MemberAvatar profile={profile} />
        <span>{displayName}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu" aria-label="Profile actions">
          <div className="dropdown-profile-summary">
            <strong>{displayName}</strong>
            <span>{enrollmentNumber}</span>
          </div>

          <div className="dropdown-separator" />

          <Link
            href="/dashboard/profile"
            className="dropdown-item"
            role="menuitem"
            aria-current={pathname === "/dashboard/profile" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <User size={15} aria-hidden="true" />
            Profile
          </Link>

          <button
            type="button"
            className="dropdown-item dropdown-item-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logOut();
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function TopNavigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const themeLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  const brandLogoSrc =
    theme === "dark" ? "/images/branding/knuth-logo-dark.png" : "/images/branding/knuth-logo-light.png";

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/dashboard" className="brand topbar-brand" aria-label="Knuth Programming Hub dashboard">
          <span className="brand-copy">
            <strong>
              knuth<span>.</span>
            </strong>
            <span>PROGRAMMING HUB</span>
          </span>
        </Link>

        <nav className="topbar-nav" aria-label="Main navigation">
          {navigation.map((group) =>
            group.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link top-nav-link${active ? " nav-link-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon size={16} strokeWidth={1.7} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            }),
          )}
        </nav>

        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle topbar-theme-toggle"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="workspace">
        <TopNavigation />

        <main id="main-content" tabIndex={-1} className="main-content">
          {children}
        </main>

        <footer className="workspace-footer">
          <span>Knuth Programming Hub</span>
        </footer>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <ShellContent>{children}</ShellContent>
    </ProfileProvider>
  );
}
