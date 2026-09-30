"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ChevronRight,
  CodeXml,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { navigation } from "@/config/navigation";
import { useLocalPreference, useTablet } from "@/lib/local-preferences";
import { useTheme } from "@/components/theme-provider";
import { MemberAvatar, ProfileProvider, useProfile } from "@/components/profile-provider";

function NavTooltip({
  label,
  children,
  enabled,
}: {
  label: string;
  children: ReactNode;
  enabled: boolean;
}) {
  if (!enabled) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="right" sideOffset={12}>
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function Sidebar({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const themeLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <>
      <div className="sidebar-brand">
        <Link
          href="/dashboard"
          className="brand"
          aria-label="Knuth Programming Hub dashboard"
        >
          <span className="brand-symbol">
            <CodeXml size={23} strokeWidth={2.2} />
          </span>
          <span className="brand-copy">
            <strong>
              knuth<span>.</span>
            </strong>
            <span>PROGRAMMING HUB</span>
          </span>
        </Link>
      </div>

      <nav
        className="sidebar-nav"
        aria-label="Main navigation"
      >
        {navigation.map((group) => {
          const links = group.items.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const upcoming = "upcoming" in item && item.upcoming;
            return (
              <NavTooltip
                key={item.href}
                label={`${item.label}${upcoming ? " · Coming soon" : ""}`}
                enabled={collapsed}
              >
                <Link
                  href={item.href}
                  className={`nav-link${active ? " nav-link-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    collapsed
                      ? `${item.label}${upcoming ? ", coming soon" : ""}`
                      : undefined
                  }
                >
                  <item.icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <span className="nav-label">{item.label}</span>
                  {active && <span className="active-dot" aria-hidden="true" />}
                  {upcoming && !active && (
                    <span className="coming-dot" title="Coming soon">
                      <span className="sr-only"> — Coming soon</span>
                    </span>
                  )}
                </Link>
              </NavTooltip>
            );
          });

          // A single-item group needs no heading; show its link directly.
          if (group.items.length === 1 || collapsed) {
            return (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-links">{links}</div>
              </div>
            );
          }

          return (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-heading">{group.label}</p>
              <div className="nav-group-links nav-tree">{links}</div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <NavTooltip enabled={collapsed} label="Expand sidebar">
          <button
            className="collapse-button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span className="nav-label">Collapse sidebar</span>
          </button>
        </NavTooltip>
        <NavTooltip enabled={collapsed} label={themeLabel}>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={themeLabel}
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
            <span className="nav-label">
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </span>
          </button>
        </NavTooltip>
        <NavTooltip enabled={collapsed} label={profile.displayName}>
          <Link
            href="/dashboard/profile"
            className={`sidebar-profile${pathname === "/dashboard/profile" ? " profile-active" : ""}`}
            aria-label={`View ${profile.displayName}'s profile`}
            aria-current={
              pathname === "/dashboard/profile" ? "page" : undefined
            }
          >
            <MemberAvatar profile={profile} />
            <span className="profile-copy">
              <strong>{profile.displayName}</strong>
              <span>View profile</span>
            </span>
            <ChevronRight
              className="profile-chevron"
              size={16}
              aria-hidden="true"
            />
          </Link>
        </NavTooltip>
      </div>
    </>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useLocalPreference(
    "kph-sidebar-collapsed",
  );
  const tablet = useTablet();
  const collapsed = preference === null ? tablet : preference === "true";
  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="app-shell" data-collapsed={collapsed}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <aside className="desktop-sidebar" data-collapsed={collapsed}>
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setPreference(String(!collapsed))}
          />
        </aside>

        <div className="workspace">
          <main id="main-content" tabIndex={-1} className="main-content">
            {children}
          </main>
          <footer className="workspace-footer">
            <span>Made for curious minds.</span>
            <span>
              Knuth Programming Hub<span className="footer-dot">·</span>Learn.
              Build. Belong.
            </span>
          </footer>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <ShellContent>{children}</ShellContent>
    </ProfileProvider>
  );
}
