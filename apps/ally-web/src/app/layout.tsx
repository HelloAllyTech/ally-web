import './global.css';
import { BottomTab } from './components';

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
      <body className="min-h-screen bg-white">
        {children}
        <BottomTab />
      </body> 
    </html>
  );
}
