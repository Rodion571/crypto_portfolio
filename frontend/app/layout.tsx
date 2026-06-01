import './globals.css';

export const metadata = {
  title: 'Crypto Tracker',
  description: 'Crypto Portfolio Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ua">
      <body>{children}</body>
    </html>
  );
}