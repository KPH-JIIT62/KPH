import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { defaultTheme, themeInitScript, themeStyles } from "@/config/theme";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dashboard · Knuth Programming Hub",
    template: "%s · Knuth Programming Hub",
  },
  description:
    "Your space to learn, practice, and grow with the Knuth Programming Hub community.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme={defaultTheme}
      suppressHydrationWarning
    >
      <head>
        <style id="app-theme">{themeStyles}</style>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
