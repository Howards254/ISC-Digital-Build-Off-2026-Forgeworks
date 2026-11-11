import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

import { TopBar } from "@/components/top-bar";

import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Vulcan · Library ledger",
    template: "%s · Vulcan",
  },
  description:
    "A library check-in system for school students and staff. Sign in, log your laptop, and sign out.",
  applicationName: "Vulcan",
  openGraph: {
    title: "Vulcan · Library ledger",
    description:
      "The school library, from the door. Sign the ledger, log your laptop, and sign out.",
    siteName: "Vulcan",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4EFE4" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1512" },
  ],
};

const themeScript = `(() => {
  let stored = null;
  try {
    stored = localStorage.getItem("vulcan-theme");
  } catch {}
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "light" || stored === "dark"
    ? stored
    : systemDark
      ? "dark"
      : "light";
  document.documentElement.dataset.theme = theme;
})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only z-50 min-h-11 rounded-sm bg-surface px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <TopBar />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
