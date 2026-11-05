"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  User,
  X,
} from "lucide-react";
import { navigation } from "@/config/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccount } from "@/components/account-provider";
import { MemberAvatar, ProfileProvider, useProfile } from "@/components/profile-provider";
import { RoleChips } from "@/components/role-chips";
import { ExecuteMandatoryReminder } from "@/components/contests/execute-mandatory-reminder";

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
        aria-label={`Profile menu for ${displayName}`}
        title={displayName}
      >
        <MemberAvatar profile={profile} />
        <ChevronDown size={14} className="profile-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu" aria-label="Profile actions">
          <div className="dropdown-profile-summary">
            <strong>{displayName}</strong>
            <span>{enrollmentNumber}</span>
          </div>

          {account && (
            <div className="dropdown-roles">
              <RoleChips account={account} />
            </div>
          )}

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

          {account?.role === "ADMIN" && (
            <Link
              href="/dashboard/admin"
              className="dropdown-item"
              role="menuitem"
              aria-current={pathname.startsWith("/dashboard/admin") ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={15} aria-hidden="true" style={{ color: "var(--accent)" }} />
              Admin Center
            </Link>
          )}

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
  const { account } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themeLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/dashboard" className="brand topbar-brand" aria-label="Knuth Programming Hub dashboard">
          <BrandLogo className="brand-logo-nav" />
        </Link>

        {/* Desktop Navigation - Hidden on Mobile */}
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
          {account?.role === "ADMIN" && (
            <Link
              href="/dashboard/admin"
              className={`nav-link top-nav-link${pathname.startsWith("/dashboard/admin") ? " nav-link-active" : ""}`}
              aria-current={pathname.startsWith("/dashboard/admin") ? "page" : undefined}
            >
              <ShieldCheck size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>Admin</span>
            </Link>
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

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer - Only shown when toggled on phone */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-label="Mobile Navigation Menu">
          <nav className="mobile-nav-list" aria-label="Mobile menu navigation">
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
                    onClick={() => setMobileMenuOpen(false)}
                    className={`mobile-nav-link${active ? " mobile-nav-link-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              }),
            )}
            {account?.role === "ADMIN" && (
              <Link
                href="/dashboard/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`mobile-nav-link${pathname.startsWith("/dashboard/admin") ? " mobile-nav-link-active" : ""}`}
                aria-current={pathname.startsWith("/dashboard/admin") ? "page" : undefined}
              >
                <ShieldCheck size={18} strokeWidth={1.8} style={{ color: "var(--accent)" }} aria-hidden="true" />
                <span>Admin Center</span>
              </Link>
            )}
          </nav>
        </div>
      )}
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
      </div>
      <ExecuteMandatoryReminder />
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
