import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Meet the Team", href: "/team" },
];

const socials = [
  {
    label: "GitHub",
    href: "https://github.com/Knuth-Programming-Hub",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
        <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.63 2.16 3.32 1.55.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.5 0-1.21.43-2.2 1.15-2.98-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.98 0 4.27-2.61 5.21-5.1 5.49.4.35.76 1.02.76 2.06v3.05c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/knuth_jiit/",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 fill-none stroke-current stroke-2"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/knuth-programming-hub-jiit62/",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24" />
      </svg>
    ),
  },
];

export default function Footer16() {
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <Link className="site-footer-brand" href="/" aria-label="Knuth Programming Hub home">
          <BrandLogo className="brand-logo-footer" />
        </Link>

        <nav className="site-footer-links" aria-label="Footer">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-socials" aria-label="Social media">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
