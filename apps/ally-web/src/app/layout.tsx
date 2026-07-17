import "./global.css";
// Centralised IBM Carbon serif design system (single source for all apps).
// Tailwind (global.css) loads first, Carbon second — Carbon's reset is disabled
// in the lib scss so the two don't fight.
import "@ally-ui-mono/ui-shared/styles/carbon-serif.scss";
import { IBM_Plex_Serif, Inter } from "next/font/google";

import { Providers } from "./providers";

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-serif",
  display: "swap", // Improves font loading performance
  fallback: ["Inter", "system-ui", "serif"], // Fallback fonts
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Ally.ai - Mental Health Resource Library",
  description:
    "Search through comprehensive mental health resources, guidelines, and professional documents. Find evidence-based information to support your practice.",
  keywords:
    "mental health, resources, documents, guidelines, professional, therapy, counseling, psychology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSerif.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
