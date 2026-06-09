import "./global.css";
import { IBM_Plex_Serif, Inter } from "next/font/google";

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
      <body className="min-h-screen bg-white font-sans">{children}</body>
    </html>
  );
}
