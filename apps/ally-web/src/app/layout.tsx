import "./global.css";
import { IBM_Plex_Sans, Inter } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap", // Improves font loading performance
  fallback: ["Inter", "system-ui", "sans-serif"], // Fallback fonts
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
    <html lang="en" className={`${ibmPlexSans.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white font-sans">{children}</body>
    </html>
  );
}
