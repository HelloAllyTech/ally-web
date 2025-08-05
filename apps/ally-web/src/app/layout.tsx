import "./global.css";
import { BottomTab } from "./components";
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
  title: "Ally.ai - AI Copilot for Mental Health Professionals",
  description: "Assisting humans, not competing with them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white font-sans">
        {children}
        <BottomTab />
      </body>
    </html>
  );
}
