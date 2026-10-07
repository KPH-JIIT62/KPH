import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Meet the Team", href: "/team" },
];

const socials = [
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
