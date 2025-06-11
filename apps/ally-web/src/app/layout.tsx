import './global.css';
import { Inter, Fraunces } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const fraunces = Fraunces({ subsets: ['latin'] });

export const metadata = {
  title: 'Ally.ai - AI Copilot for Mental Health Professionals',
  description: 'Assisting humans, not competing with them.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${fraunces.className}`}>{children}</body>
    </html>
  );
}
