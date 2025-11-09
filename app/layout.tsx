import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Chakra_Petch } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { BottomNavOverlay } from '@/components/BottomNavOverlay';

// Font configurations
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-chakra',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DiaryBeast - Write Daily. Grow Your Beast. Own Your Mind.',
  description:
    'Your private diary with a digital companion that evolves with you. Write. Reflect. Earn DIARY tokens on Base. Your entries are encrypted—only you can read them.',
  icons: {
    icon: '/diary-beast-favicon-black.svg',
  },
  openGraph: {
    title: 'DiaryBeast',
    description: 'Your private diary with a digital companion that evolves with you.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${chakraPetch.variable}`}
    >
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
