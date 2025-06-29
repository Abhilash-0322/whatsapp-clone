import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp Clone',
  description: 'A real-time messaging application with calling features',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
